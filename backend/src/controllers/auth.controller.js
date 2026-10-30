/**
 * Authentication Controller. Handles login, logout, current user info, password change,
 * organisation registration, OTP verification, and availability checks.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');
const env = require('../config/env');
const sessionEvents = require('../services/sessionEvents');
const { generateOTP, sendOTPEmail, sendWelcomeEmail, sendPasswordResetEmail } = require('../services/email.service');

const isProduction = env.nodeEnv === 'production' || process.env.RENDER === 'true';

const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
};

const tempCookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: isProduction ? 'none' : 'lax',
  maxAge: 15 * 60 * 1000,
  path: '/'
};

/**
 * POST /api/auth/login
 * Validates credentials and issues a JWT in an httpOnly cookie. */
const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    // Fetch user by username
    const { data: user, error } = await supabase
      .from('app_users')
      .select('id, username, email, password_hash, role, is_suspended, requires_password_change, org_id')
      .eq('username', username)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    if (user.is_suspended) {
      return res.status(403).json({ error: 'Account suspended. Contact your administrator.' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Check if user must change password first
    if (user.requires_password_change) {
      const tempToken = jwt.sign(
        { id: user.id, purpose: 'password_change' },
        env.jwt.secret,
        { expiresIn: '15m' }
      );

      res.cookie('temp_token', tempToken, tempCookieOptions);

      return res.status(200).json({
        requiresPasswordChange: true,
        message: 'Password change required before accessing the platform.'
      });
    }

    // Generate JWT — now includes orgId
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
      orgId: user.org_id,
    };

    const token = jwt.sign(payload, env.jwt.secret, {
      expiresIn: env.jwt.expiresIn,
    });

    // Set httpOnly cookie — never return token in response body
    res.cookie('token', token, cookieOptions);

    // Track active session
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const { data: sessionData, error: sessionError } = await supabase
      .from('active_sessions')
      .insert({
        user_id: user.id,
        username: user.username,
        role: user.role,
        ip_address: ipAddress
      })
      .select('id')
      .single();

    if (!sessionError && sessionData) {
      res.cookie('session_id', sessionData.id, cookieOptions);
      sessionEvents.emit('change');
    }

    res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        orgId: user.org_id,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/logout
 * Clears the JWT cookie. */
const logout = async (req, res, next) => {
  try {
    const sessionId = req.cookies?.session_id;

    if (sessionId) {
      await supabase.from('active_sessions').delete().eq('id', sessionId);
      sessionEvents.emit('change');
    }

    res.clearCookie('token', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
    
    res.clearCookie('session_id', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });

    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the current user's info including org details. */
const me = async (req, res, next) => {
  try {
    const { data: user } = await supabase
      .from('app_users')
      .select('id, username, email, full_name, role, org_id, row_limit, is_suspended, organisations(id, name, slug, allowed_domain)')
      .eq('id', req.user.id)
      .single();

    if (!user || user.is_suspended) {
      return res.status(401).json({ message: 'Unauthorized.' });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        orgId: user.org_id,
        orgName: user.organisations?.name,
        row_limit: user.row_limit,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/change-password
 * Handles forced password reset on first login.
 */
const changePassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body;

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Both password fields are required.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    if (newPassword === 'password123') {
      return res.status(400).json({ message: 'You cannot reuse the default password.' });
    }

    const tempToken = req.cookies?.temp_token;
    if (!tempToken) {
      return res.status(403).json({ message: 'Session expired. Please login again.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(tempToken, env.jwt.secret);
    } catch (e) {
      return res.status(403).json({ message: 'Session expired. Please login again.' });
    }

    if (decoded.purpose !== 'password_change') {
      return res.status(403).json({ message: 'Invalid token purpose.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    const { error } = await supabase
      .from('app_users')
      .update({
        password_hash: newHash,
        requires_password_change: false
      })
      .eq('id', decoded.id);

    if (error) {
      return res.status(500).json({ message: 'Failed to update password.' });
    }

    res.clearCookie('temp_token', {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
      path: '/'
    });

    const { data: user } = await supabase
      .from('app_users')
      .select('id, username, role, row_limit, is_suspended, org_id')
      .eq('id', decoded.id)
      .single();

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, orgId: user.org_id },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn }
    );

    res.cookie('token', token, cookieOptions);

    // Track active session
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const { data: sessionData, error: sessionError } = await supabase
      .from('active_sessions')
      .insert({
        user_id: user.id,
        username: user.username,
        role: user.role,
        ip_address: ipAddress
      })
      .select('id')
      .single();

    if (!sessionError && sessionData) {
      res.cookie('session_id', sessionData.id, cookieOptions);
      sessionEvents.emit('change');
    }

    return res.status(200).json({
      success: true,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (err) {
    next(err);
  }
};

// ── Registration & OTP Functions ─────────────────────────────────────

/**
 * GET /api/auth/check-domain
 * Check domain availability — called on 1s debounce from frontend. */
const checkDomain = async (req, res, next) => {
  try {
    const { domain } = req.query;
    if (!domain) return res.status(400).json({ message: 'Domain is required.' });

    const cleanDomain = domain.toLowerCase().trim().replace(/^@/, '');

    if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(cleanDomain)) {
      return res.status(200).json({ available: false, message: 'Invalid domain format.' });
    }

    const { data } = await supabase
      .from('organisations')
      .select('id')
      .eq('allowed_domain', cleanDomain)
      .single();

    return res.status(200).json({
      available: !data,
      message: data ? 'Domain already registered.' : 'Domain is available.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/check-org-name
 * Check org name/slug availability. */
const checkOrgName = async (req, res, next) => {
  try {
    const { name } = req.query;
    if (!name) return res.status(400).json({ message: 'Name is required.' });

    const slug = name.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const { data } = await supabase
      .from('organisations')
      .select('id')
      .eq('slug', slug)
      .single();

    return res.status(200).json({
      available: !data,
      slug,
      message: data ? 'Organisation name already taken.' : 'Name is available.'
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/register
 * Validate fields, hash password, send OTP email via Brevo. */
const register = async (req, res, next) => {
  try {
    const { fullName, email, password, confirmPassword, orgName, allowedDomain } = req.body;

    // Validate all fields
    if (!fullName || !email || !password || !confirmPassword || !orgName || !allowedDomain) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const cleanDomain = allowedDomain.toLowerCase().trim().replace(/^@/, '');
    const emailDomain = email.split('@')[1]?.toLowerCase();

    // Email must match org domain
    if (emailDomain !== cleanDomain) {
      return res.status(400).json({
        message: `Your email must use the @${cleanDomain} domain.`
      });
    }

    // Check email not already registered
    const { data: existingUser } = await supabase
      .from('app_users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    // Check domain not already taken
    const { data: existingOrg } = await supabase
      .from('organisations')
      .select('id')
      .eq('allowed_domain', cleanDomain)
      .single();

    if (existingOrg) {
      return res.status(409).json({ message: 'Organisation domain already registered.' });
    }

    const slug = orgName.toLowerCase().trim()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');

    // Check slug not taken
    const { data: existingSlug } = await supabase
      .from('organisations')
      .select('id')
      .eq('slug', slug)
      .single();

    if (existingSlug) {
      return res.status(409).json({ message: 'Organisation name already taken.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate OTP
    const otp = generateOTP();
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // Delete any previous pending registration for this email
    await supabase
      .from('pending_registrations')
      .delete()
      .eq('email', email);

    // Store pending registration
    const { error: insertError } = await supabase
      .from('pending_registrations')
      .insert({
        full_name: fullName,
        email,
        org_name: orgName,
        org_slug: slug,
        allowed_domain: cleanDomain,
        password_hash: passwordHash,
        otp,
        otp_expires_at: otpExpiresAt
      });

    if (insertError) {
      return res.status(500).json({ message: 'Registration failed. Please try again.' });
    }

    // Send OTP email via Brevo
    await sendOTPEmail(email, fullName, otp, orgName);

    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${email}`,
      email
    });

  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/verify-otp
 * Verify OTP — create org + user + issue JWT. */
const verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required.' });
    }

    // Find pending registration
    const { data: pending } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('email', email)
      .single();

    if (!pending) {
      return res.status(404).json({ message: 'No pending registration found. Please register again.' });
    }

    // Check attempts
    if (pending.attempts >= 5) {
      await supabase.from('pending_registrations').delete().eq('email', email);
      return res.status(429).json({ message: 'Too many attempts. Please register again.' });
    }

    // Check expiry
    if (new Date() > new Date(pending.otp_expires_at)) {
      await supabase.from('pending_registrations').delete().eq('email', email);
      return res.status(400).json({ message: 'Code expired. Please register again.' });
    }

    // Check OTP
    if (pending.otp !== otp.trim()) {
      await supabase
        .from('pending_registrations')
        .update({ attempts: pending.attempts + 1 })
        .eq('email', email);

      const remaining = 4 - pending.attempts;
      return res.status(400).json({
        message: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
      });
    }

    // OTP correct — create organisation
    const { data: org, error: orgError } = await supabase
      .from('organisations')
      .insert({
        name: pending.org_name,
        slug: pending.org_slug,
        allowed_domain: pending.allowed_domain
      })
      .select('id, name, slug')
      .single();

    if (orgError) {
      return res.status(500).json({ message: 'Failed to create organisation.' });
    }

    // Create admin user
    const { data: newUser, error: userError } = await supabase
      .from('app_users')
      .insert({
        full_name: pending.full_name,
        username: pending.email.split('@')[0],
        email: pending.email,
        password_hash: pending.password_hash,
        role: 'admin',
        org_id: org.id,
        requires_password_change: false,
        row_limit: 1000
      })
      .select('id, username, email, role, org_id, full_name')
      .single();

    if (userError) {
      await supabase.from('organisations').delete().eq('id', org.id);
      return res.status(500).json({ message: 'Failed to create user account.' });
    }

    // Update org created_by
    await supabase
      .from('organisations')
      .update({ created_by: newUser.id })
      .eq('id', org.id);

    // Delete pending registration
    await supabase.from('pending_registrations').delete().eq('email', email);

    // Send welcome email (fire and forget)
    sendWelcomeEmail(pending.email, pending.full_name, pending.org_name, 'admin')
      .catch(err => console.error('Welcome email failed:', err));

    // Issue JWT
    const token = jwt.sign(
      {
        id: newUser.id,
        username: newUser.username,
        role: newUser.role,
        orgId: org.id
      },
      env.jwt.secret,
      { expiresIn: env.jwt.expiresIn || '7d' }
    );

    res.cookie('token', token, cookieOptions);

    return res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        fullName: newUser.full_name,
        role: newUser.role,
        orgId: org.id,
        orgName: org.name
      }
    });

  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/resend-otp
 * Resend OTP — rate limited to once per 60s. */
const resendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required.' });

    const { data: pending } = await supabase
      .from('pending_registrations')
      .select('*')
      .eq('email', email)
      .single();

    if (!pending) {
      return res.status(404).json({ message: 'No pending registration. Please register again.' });
    }

    // Rate limit: only allow resend if created > 60s ago
    const createdAt = new Date(pending.created_at);
    const secondsElapsed = (Date.now() - createdAt.getTime()) / 1000;
    if (secondsElapsed < 60) {
      return res.status(429).json({
        message: `Please wait ${Math.ceil(60 - secondsElapsed)} seconds before resending.`
      });
    }

    const newOTP = generateOTP();
    const newExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    await supabase
      .from('pending_registrations')
      .update({
        otp: newOTP,
        otp_expires_at: newExpiry,
        attempts: 0,
        created_at: new Date().toISOString()
      })
      .eq('email', email);

    await sendOTPEmail(email, pending.full_name, newOTP, pending.org_name);

    return res.status(200).json({ success: true, message: 'New code sent.' });

  } catch (err) {
    next(err);
  }
};

// ── Forgot Password Flow ─────────────────────────────────────────────

// Step 1: Request password reset — send OTP
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body
    if (!email) return res.status(400).json({ message: 'Email is required.' })

    // Find user by email
    const { data: user } = await supabase
      .from('app_users')
      .select('id, email, full_name, username, is_suspended')
      .eq('email', email.toLowerCase().trim())
      .single()

    // Always return success — never reveal if email exists
    if (!user || user.is_suspended) {
      return res.status(200).json({
        success: true,
        message: 'If that email exists, a reset code has been sent.'
      })
    }

    // Delete any existing reset tokens for this user
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', user.id)

    const otp = generateOTP()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

    // Store reset token
    const { error } = await supabase
      .from('password_reset_tokens')
      .insert({
        user_id: user.id,
        email: user.email,
        otp,
        otp_expires_at: expiresAt
      })

    if (error) {
      return res.status(500).json({ message: 'Failed to create reset token.' })
    }

    // Send email
    await sendPasswordResetEmail(user.email, user.full_name || user.username, otp)

    return res.status(200).json({
      success: true,
      message: 'If that email exists, a reset code has been sent.'
    })

  } catch (err) {
    next(err)
  }
}

// Step 2: Verify reset OTP
const verifyResetOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body
    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and code are required.' })
    }

    const { data: token } = await supabase
      .from('password_reset_tokens')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .eq('used', false)
      .single()

    if (!token) {
      return res.status(404).json({ message: 'No reset request found. Please request again.' })
    }

    // Check attempts
    if (token.attempts >= 5) {
      await supabase.from('password_reset_tokens').delete().eq('id', token.id)
      return res.status(429).json({ message: 'Too many attempts. Please request a new code.' })
    }

    // Check expiry
    if (new Date() > new Date(token.otp_expires_at)) {
      await supabase.from('password_reset_tokens').delete().eq('id', token.id)
      return res.status(400).json({ message: 'Code expired. Please request a new one.' })
    }

    // Check OTP
    if (token.otp !== otp.trim()) {
      await supabase
        .from('password_reset_tokens')
        .update({ attempts: token.attempts + 1 })
        .eq('id', token.id)

      const remaining = 4 - token.attempts
      return res.status(400).json({
        message: `Incorrect code. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.`
      })
    }

    // Mark as verified but not yet used
    await supabase
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('id', token.id)

    // Issue a short-lived reset token
    const resetToken = jwt.sign(
      { userId: token.user_id, purpose: 'password_reset' },
      env.jwt.secret,
      { expiresIn: '15m' }
    )

    res.cookie('reset_token', resetToken, {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
      maxAge: 15 * 60 * 1000
    })

    return res.status(200).json({ success: true })

  } catch (err) {
    next(err)
  }
}

// Step 3: Set new password
const resetPassword = async (req, res, next) => {
  try {
    const { newPassword, confirmPassword } = req.body

    if (!newPassword || !confirmPassword) {
      return res.status(400).json({ message: 'Both fields are required.' })
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ message: 'Passwords do not match.' })
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' })
    }

    // Verify reset token from cookie
    const resetToken = req.cookies?.reset_token
    if (!resetToken) {
      return res.status(401).json({ message: 'Session expired. Please start again.' })
    }

    let decoded
    try {
      decoded = jwt.verify(resetToken, env.jwt.secret)
    } catch (e) {
      return res.status(401).json({ message: 'Session expired. Please start again.' })
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(403).json({ message: 'Invalid token.' })
    }

    // Fetch user to check they're not reusing old password
    const { data: user } = await supabase
      .from('app_users')
      .select('id, password_hash')
      .eq('id', decoded.userId)
      .single()

    if (!user) {
      return res.status(404).json({ message: 'User not found.' })
    }

    // Check not reusing current password
    const isSamePassword = await bcrypt.compare(newPassword, user.password_hash)
    if (isSamePassword) {
      return res.status(400).json({ message: 'New password must be different from current password.' })
    }

    const newHash = await bcrypt.hash(newPassword, 10)

    // Update password
    const { error } = await supabase
      .from('app_users')
      .update({
        password_hash: newHash,
        requires_password_change: false
      })
      .eq('id', decoded.userId)

    if (error) {
      return res.status(500).json({ message: 'Failed to update password.' })
    }

    // Clear reset token cookie
    res.clearCookie('reset_token', {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax'
    })

    // Clean up reset tokens
    await supabase
      .from('password_reset_tokens')
      .delete()
      .eq('user_id', decoded.userId)

    return res.status(200).json({
      success: true,
      message: 'Password reset successfully. You can now log in.'
    })

  } catch (err) {
    next(err)
  }
}

// Export
module.exports = {
  login, logout, me, changePassword,
  checkDomain, checkOrgName, register, verifyOTP, resendOTP,
  forgotPassword, verifyResetOTP, resetPassword
};
