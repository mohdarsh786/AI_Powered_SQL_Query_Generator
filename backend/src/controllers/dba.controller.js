/**
 * DBA Controller. Handles DBA-specific operations: permissions, viewing sessions.
 */

const supabase = require('../config/db');
const { grantPermission } = require('../services/permission.service');

/**
 * POST /api/dba/permissions
 * DBA grants user-level permissions on specific tables (only to 'user' role). */
const grantUserPermission = async (req, res, next) => {
  try {
    const { userId, tableName, canSelect, canInsert, canUpdate, canDelete, canExport } = req.body;

    if (!userId || !tableName) {
      return res.status(400).json({
        error: 'userId and tableName are required.',
      });
    }

    // DBA can only grant to users with 'user' role
    const { data: targetUser, error: userError } = await supabase
      .from('app_users')
      .select('id, role')
      .eq('id', userId)
      .single();

    if (userError || !targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    if (targetUser.role !== 'user') {
      return res.status(400).json({
        error: 'DBA can only grant permissions to accounts with "user" role.',
      });
    }

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
 * GET /api/dba/sessions
 * Returns active sessions (approximated via recent audit log activity). */
const getActiveSessions = async (req, res, next) => {
  try {
    // Get distinct users who have had activity in the last 30 minutes
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();

    const { data: recentActivity, error } = await supabase
      .from('audit_logs')
      .select('user_id, username, role, ip_address, created_at')
      .gte('created_at', thirtyMinutesAgo)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch session data.' });
    }

    // Deduplicate by user_id, keeping the most recent entry
    const sessionMap = new Map();
    for (const entry of recentActivity || []) {
      if (!sessionMap.has(entry.user_id)) {
        sessionMap.set(entry.user_id, {
          userId: entry.user_id,
          username: entry.username,
          role: entry.role,
          ipAddress: entry.ip_address,
          lastActivity: entry.created_at,
        });
      }
    }

    const sessions = Array.from(sessionMap.values());

    res.json({ sessions, activeCount: sessions.length });
  } catch (err) {
    next(err);
  }
};

module.exports = { grantUserPermission, getActiveSessions };
