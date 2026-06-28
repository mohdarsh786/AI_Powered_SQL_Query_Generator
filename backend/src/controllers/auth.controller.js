/**
 * Authentication Controller. Handles login, logout, and current user info.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../config/db');
const env = require('../config/env');
const sessionEvents = require('../services/sessionEvents');

const cookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
};

const tempCookieOptions = {
  httpOnly: true,
  secure: env.nodeEnv === 'production',
  sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
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
      .select('id, username, email, password_hash, role, is_suspended, requires_password_change')
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

    // Generate JWT
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role,
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
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
      path: '/',
    });
    
    res.clearCookie('session_id', {
      httpOnly: true,
      secure: env.nodeEnv === 'production',
      sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
      path: '/',
    });

    res.json({ message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Returns the current user's info from the JWT. */
const me = async (req, res, next) => {
  try {
    res.json({
      user: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
        role: req.user.role,
        row_limit: req.user.row_limit,
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
      .select('id, username, role, row_limit, is_suspended')
      .eq('id', decoded.id)
      .single();

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
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

module.exports = { login, logout, me, changePassword };
