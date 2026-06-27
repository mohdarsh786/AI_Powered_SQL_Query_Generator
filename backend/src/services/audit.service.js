/**
 * Audit Logging Service. Writes to audit_logs via fire-and-forget pattern. Audit writes are non-blocking and never fail the calling request.
 */

const supabase = require('../config/db');

/**
 * Logs a query execution to audit_logs using fire-and-forget pattern.
 * @param {object} logEntry - Contains userId, username, queryType, queryText, etc. */
function logQuery(logEntry) {
  // Fire and forget — do not await, do not let failures propagate
  const record = {
    user_id: logEntry.userId,
    username: logEntry.username,
    role: logEntry.role,
    query_type: logEntry.queryType,
    tables_used: logEntry.tablesUsed || [],
    query_text: logEntry.queryText,
    rows_affected: logEntry.rowsAffected || null,
    execution_time_ms: logEntry.executionTimeMs || null,
    ip_address: logEntry.ipAddress || null,
    reason: logEntry.reason || null,
  };

  supabase
    .from('audit_logs')
    .insert(record)
    .then(({ error }) => {
      if (error) {
        console.error('⚠️ Audit log write failed (non-blocking):', error.message);
      }
    })
    .catch((err) => {
      console.error('⚠️ Audit log write exception (non-blocking):', err.message);
    });
}

/**
 * Fetches paginated audit logs with optional filters. Admin only.
 * @returns {Promise<{ data: object[], total: number, page: number, limit: number }>} */
async function getAuditLogs(filters = {}) {
  const {
    page = 1,
    limit = 50,
    userId,
    queryType,
    fromDate,
    toDate,
  } = filters;

  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;

  let query = supabase
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + safeLimit - 1);

  if (userId) {
    query = query.eq('user_id', parseInt(userId, 10));
  }

  if (queryType) {
    query = query.eq('query_type', queryType.toUpperCase());
  }

  if (fromDate) {
    query = query.gte('created_at', fromDate);
  }

  if (toDate) {
    query = query.lte('created_at', toDate);
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  return {
    data: data || [],
    total: count || 0,
    page: safePage,
    limit: safeLimit,
  };
}

module.exports = { logQuery, getAuditLogs };
