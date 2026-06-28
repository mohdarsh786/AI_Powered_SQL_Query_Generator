/**
 * DBA Controller. Handles DBA-specific operations: permissions, viewing sessions.
 */

const supabase = require('../config/db');
const sessionEvents = require('../services/sessionEvents');


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
 * Returns actual active sessions from the active_sessions table. */
const getActiveSessions = async (req, res, next) => {
  try {
    const { data: sessions, error } = await supabase
      .from('active_sessions')
      .select('id, user_id, username, role, ip_address, created_at, last_seen')
      .order('last_seen', { ascending: false });

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch session data.' });
    }

    res.json({ sessions, activeCount: sessions.length });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/dba/sessions/live
 * SSE endpoint for live active sessions count.
 */
const streamActiveSessions = async (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders(); // flush the headers to establish SSE connection

  const sendCount = async () => {
    try {
      const { count, error } = await supabase
        .from('active_sessions')
        .select('*', { count: 'exact', head: true });
        
      if (!error) {
        res.write(`data: ${JSON.stringify({ count })}\n\n`);
      }
    } catch (err) {
      console.error('[SSE] Error fetching active sessions count:', err);
    }
  };

  // Send initial count immediately
  await sendCount();

  // Listen for changes from login/logout/cleanup
  sessionEvents.on('change', sendCount);

  // Cleanup on connection close
  req.on('close', () => {
    sessionEvents.off('change', sendCount);
    res.end();
  });
};

module.exports = { grantPermission, getActiveSessions, streamActiveSessions };
