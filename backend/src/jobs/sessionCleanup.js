const supabase = require('../config/db');
const sessionEvents = require('../services/sessionEvents');

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function startSessionCleanupJob() {
  setInterval(async () => {
    try {
      // 30 minutes ago
      const staleThreshold = new Date(Date.now() - 30 * 60 * 1000).toISOString();

      // Delete sessions where last_seen is older than 30 minutes
      const { data: deletedRows, error } = await supabase
        .from('active_sessions')
        .delete()
        .lt('last_seen', staleThreshold)
        .select('id');

      if (error) {
        console.error('[Cleanup Job] Error cleaning up stale sessions:', error.message);
        return;
      }

      // If any sessions were actually deleted, emit a change event to update live dashboards
      if (deletedRows && deletedRows.length > 0) {
        console.log(`[Cleanup Job] Removed ${deletedRows.length} stale session(s).`);
        sessionEvents.emit('change');
      }
    } catch (err) {
      console.error('[Cleanup Job] Unexpected error:', err);
    }
  }, CLEANUP_INTERVAL_MS);
}

module.exports = { startSessionCleanupJob };
