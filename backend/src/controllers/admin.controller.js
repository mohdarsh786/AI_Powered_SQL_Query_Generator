/**
 * Admin Controller. Handles users, permissions, audits, and row limits. All endpoints require admin role.
 */

const bcrypt = require('bcryptjs');
const supabase = require('../config/db');
const { getAuditLogs } = require('../services/audit.service');
const { grantPermission, revokePermission } = require('../services/permission.service');

/**
 * GET /api/admin/users
 * Lists all users with their roles and suspension status. */
const listUsers = async (req, res, next) => {
  try {
    const { data: users, error } = await supabase
      .from('app_users')
      .select('id, username, email, role, is_suspended, row_limit, created_at')
      .order('created_at', { ascending: true });

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
 * Creates a new user. Password is hashed with bcryptjs. */
const createUser = async (req, res, next) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password || !role) {
      return res.status(400).json({
        error: 'Username, email, password, and role are required.',
      });
    }

    if (!['admin', 'dba', 'user'].includes(role)) {
      return res.status(400).json({
        error: 'Role must be one of: admin, dba, user.',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters long.',
      });
    }

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

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(password, salt);

    const { data: newUser, error } = await supabase
      .from('app_users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        role,
        is_suspended: false,
        row_limit: 500,
      })
      .select('id, username, email, role, is_suspended, row_limit, created_at')
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'Username or email already exists.' });
      }
      return res.status(500).json({ error: 'Failed to create user.' });
    }

    res.status(201).json({ message: 'User created successfully.', user: newUser });
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
      .select('id, is_suspended')
      .eq('id', userId)
      .single();

    if (fetchError || !user) {
      return res.status(404).json({ error: 'User not found.' });
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

module.exports = { listUsers, createUser, toggleSuspend, managePermissions, getAudit, setRowLimit };
