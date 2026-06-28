/**
 * DBA Controller. Handles DBA-specific operations: permissions, viewing sessions.
 */

const supabase = require('../config/db');


/**
 * POST /api/dba/permissions
 * DBA grants user-level permissions on specific tables (only to 'user' role). */
const grantPermission = async (req, res, next) => {
  try {
    const { userId, tableName, permissions } = req.body

    if (!userId || !tableName || !permissions) {
      return res.status(400).json({ message: 'userId, tableName and permissions are required.' })
    }

    // Verify target user exists and is 'user' role only
    const { data: targetUser } = await supabase
      .from('app_users')
      .select('id, role')
      .eq('id', userId)
      .single()

    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' })
    }

    if (targetUser.role !== 'user') {
      return res.status(403).json({ message: 'DBA can only grant permissions to User role accounts.' })
    }

    // Upsert permission
    const { error } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: userId,
        table_name: tableName,
        can_select: permissions.can_select || false,
        can_insert: permissions.can_insert || false,
        can_update: permissions.can_update || false,
        can_delete: permissions.can_delete || false,
        can_export: permissions.can_export || false,
        granted_by: req.user.id
      }, {
        onConflict: 'user_id,table_name'
      })

    if (error) {
      return res.status(500).json({ message: 'Failed to grant permission.' })
    }

    return res.status(200).json({ success: true, message: `Permissions updated for ${tableName}` })

  } catch (err) {
    next(err)
  }
}

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

module.exports = { grantPermission, getActiveSessions };
