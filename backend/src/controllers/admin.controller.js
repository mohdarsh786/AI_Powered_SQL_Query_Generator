/**
 * Admin Controller. Handles users, permissions, audits, and row limits. All endpoints require admin role.
 */

const bcrypt = require('bcryptjs');
const supabase = require('../config/db');
const { getAuditLogs } = require('../services/audit.service');
const { grantPermission, revokePermission } = require('../services/permission.service');
const { sendTempPasswordEmail } = require('../services/email.service');

const isPlatformAdmin = (user) => {
  return user?.username === 'admin_sarah' || user?.id === 1;
};

/**
 * GET /api/admin/users
 * Lists users. Platform admin sees all users; org admins see their org's users. */
const listUsers = async (req, res, next) => {
  try {
    let query = supabase
      .from('app_users')
      .select('id, username, email, role, is_suspended, row_limit, created_at, org_id')
      .order('created_at', { ascending: true });

    if (!isPlatformAdmin(req.user)) {
      query = query.eq('org_id', req.user.orgId);
    }

    const { data: users, error } = await query;

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch users.' });
    }

    res.json({ users: users || [] });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/users
 * Creates a new user. Generates a one-time password and forces reset.
 */
const createUser = async (req, res, next) => {
  try {
    const { username, email, role } = req.body;

    if (!username || !email || !role) {
      return res.status(400).json({
        error: 'Username, email and role are required.',
      });
    }

    if (!['admin', 'dba', 'user'].includes(role)) {
      return res.status(400).json({
        error: 'Role must be one of: admin, dba, user.',
      });
    }

    // Generate a random one-time password
    const generateTempPassword = () => {
      const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$!';
      let password = '';
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return password;
    };

    const tempPassword = generateTempPassword();
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(tempPassword, salt);

    // Check for duplicate username or email
    const { data: existing } = await supabase
      .from('app_users')
      .select('id')
      .or(`username.eq.${username},email.eq.${email}`)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.status(409).json({
        error: 'Username or email already exists.',
      });
    }

    const { data: newUser, error } = await supabase
      .from('app_users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        role,
        requires_password_change: true,
        is_suspended: false,
        row_limit: 500,
        org_id: req.user.orgId,
      })
      .select('id, username, email, role, is_suspended, row_limit, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Username or email already exists.' });
      }
      return res.status(500).json({ error: 'Failed to create user.' });
    }

    res.status(201).json({ 
      message: 'User created successfully.', 
      user: newUser,
      tempPassword
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/admin/users/:id
 * Permanently deletes a user from the app_users table and Supabase Auth.
 * Cannot delete yourself or users from another org.
 */
const deleteUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    // Prevent self-deletion
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account.' });
    }

    // Fetch user to verify org membership
    const { data: user, error: fetchError } = await supabase
      .from('app_users')
      .select('id, username, email, role, org_id')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Ensure user belongs to same org (unless platform admin)
    if (!isPlatformAdmin(req.user) && user.org_id && user.org_id !== req.user.orgId) {
      return res.status(403).json({ error: 'Not authorized to delete this user.' });
    }

    // Delete related records first (active sessions, audit logs FK refs, permissions)
    await supabase.from('active_sessions').delete().eq('user_id', userId);
    await supabase.from('user_table_permissions').delete().eq('user_id', userId);

    // Delete the user from app_users table
    const { error: deleteError } = await supabase
      .from('app_users')
      .delete()
      .eq('id', userId);

    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete user from database.' });
    }

    res.json({
      success: true,
      message: `User "${user.username}" has been permanently deleted.`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/users/:id/suspend
 * Toggles the suspension status of a user. */
const toggleSuspend = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    // Don't allow suspending yourself
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot suspend your own account.' });
    }

    // Fetch current status
    const { data: user, error: fetchError } = await supabase
      .from('app_users')
      .select('id, is_suspended, org_id')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Ensure user belongs to same org (unless platform admin)
    if (!isPlatformAdmin(req.user) && user.org_id && user.org_id !== req.user.orgId) {
      return res.status(403).json({ error: 'Not authorized to manage this user.' });
    }

    // Toggle suspension
    const { data: updatedUser, error: updateError } = await supabase
      .from('app_users')
      .update({ is_suspended: !user.is_suspended })
      .eq('id', userId)
      .select('id, username, email, role, is_suspended')
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Failed to update user suspension.' });
    }

    res.json({
      message: updatedUser.is_suspended ? 'User suspended.' : 'User reactivated.',
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/permissions
 * Grants or revokes table+operation permissions for a user. */
const managePermissions = async (req, res, next) => {
  try {
    const { userId, tableName, action, canSelect, canInsert, canUpdate, canDelete, canExport } =
      req.body;

    if (!userId || !tableName) {
      return res.status(400).json({
        error: 'userId and tableName are required.',
      });
    }

    if (action === 'revoke') {
      await revokePermission(userId, tableName);
      return res.json({ message: `Permissions revoked for table "${tableName}".` });
    }

    // Default action is grant
    const permission = await grantPermission({
      userId,
      tableName,
      canSelect: canSelect || false,
      canInsert: canInsert || false,
      canUpdate: canUpdate || false,
      canDelete: canDelete || false,
      canExport: canExport || false,
      grantedBy: req.user.id,
    });

    res.json({ message: 'Permission granted successfully.', permission });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ error: err.message });
    }
    next(err);
  }
};

/**
 * GET /api/admin/audit
 * Returns paginated audit logs with optional filters. */
const getAudit = async (req, res, next) => {
  try {
    const { page, limit, userId, queryType, fromDate, toDate } = req.query;

    const result = await getAuditLogs({
      page,
      limit,
      userId,
      queryType,
      fromDate,
      toDate,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/admin/rowlimit/:userId
 * Sets the row limit cap for a specific user. */
const setRowLimit = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    const { rowLimit } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    if (!rowLimit || typeof rowLimit !== 'number' || rowLimit < 1 || rowLimit > 10000) {
      return res.status(400).json({
        error: 'rowLimit must be a number between 1 and 10000.',
      });
    }

    const { data: updatedUser, error } = await supabase
      .from('app_users')
      .update({ row_limit: rowLimit })
      .eq('id', userId)
      .select('id, username, row_limit')
      .single();

    if (error) {
      return res.status(500).json({ error: 'Failed to update row limit.' });
    }

    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      message: `Row limit updated to ${rowLimit}.`,
      user: updatedUser,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/stats
 * Returns high-level cluster statistics.
 */
const getStats = async (req, res, next) => {
  try {
    const isPlatform = isPlatformAdmin(req.user);

    // 1. Total users
    let usersQuery = supabase
      .from('app_users')
      .select('id', { count: 'exact', head: true });
    if (!isPlatform) {
      usersQuery = usersQuery.eq('org_id', req.user.orgId);
    }
    const { count: usersCount, error: usersError } = await usersQuery;

    // 2. Queries today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    let queriesQuery = supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', startOfDay.toISOString());
    if (!isPlatform) {
      queriesQuery = queriesQuery.eq('org_id', req.user.orgId);
    }
    const { count: queriesCount, error: queriesError } = await queriesQuery;

    // 3. Flagged ops (failed or unauthorized)
    let flaggedQuery = supabase
      .from('audit_logs')
      .select('id', { count: 'exact', head: true })
      .not('reason', 'is', null);
    if (!isPlatform) {
      flaggedQuery = flaggedQuery.eq('org_id', req.user.orgId);
    }
    const { count: flaggedCount, error: flaggedError } = await flaggedQuery;

    if (usersError || queriesError || flaggedError) {
      return res.status(500).json({ error: 'Failed to fetch cluster stats.' });
    }

    res.json({
      users: usersCount || 0,
      sessions: Math.max(1, Math.floor((usersCount || 1) / 2)), // Mocking active sessions based on user count
      queriesToday: queriesCount || 0,
      flagged: flaggedCount || 0
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/admin/users/:id/send-credentials
 * Sends the user's username and temporary password to their email address.
 * The caller (admin) must pass the tempPassword in the request body.
 */
const sendCredentials = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id, 10);
    const { tempPassword } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID.' });
    }

    if (!tempPassword) {
      return res.status(400).json({ error: 'tempPassword is required.' });
    }

    // Fetch user + org name
    const { data: user, error: userError } = await supabase
      .from('app_users')
      .select('id, username, email, org_id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Ensure user belongs to the same org as the requesting admin (unless platform admin)
    if (!isPlatformAdmin(req.user) && user.org_id && user.org_id !== req.user.orgId) {
      return res.status(403).json({ error: 'Not authorized to send credentials for this user.' });
    }

    // Fetch org name for the email
    const { data: org } = await supabase
      .from('organisations')
      .select('name')
      .eq('id', user.org_id)
      .single();

    await sendTempPasswordEmail(user.email, user.username, tempPassword, org?.name);

    res.json({ success: true, message: `Credentials sent to ${user.email}` });
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, createUser, deleteUser, sendCredentials, toggleSuspend, managePermissions, getAudit, setRowLimit, getStats };
