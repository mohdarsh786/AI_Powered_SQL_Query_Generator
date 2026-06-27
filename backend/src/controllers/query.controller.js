/**
 * Query Controller. Handles NL→SQL, execution, analysis, and history. Implements dual authorization via Groq (Layer 1) and queryValidator (Layer 2).
 */

const supabase = require('../config/db');
const { generateQuery, analyzeQuery } = require('../services/groq.service');
const { getUserPermissions } = require('../services/permission.service');
const { logQuery } = require('../services/audit.service');
const { parseQuery } = require('../middleware/queryValidator');

/**
 * POST /api/query/generate
 * Converts natural language to SQL via Groq (Layer 1 authorization). */
const generate = async (req, res, next) => {
  try {
    const { naturalLanguage, schema } = req.body;
    const { user } = req;

    if (!naturalLanguage || typeof naturalLanguage !== 'string') {
      return res.status(400).json({ error: 'Natural language query is required.' });
    }

    if (!schema || typeof schema !== 'string') {
      return res.status(400).json({ error: 'Database schema is required.' });
    }

    // Admin cannot execute queries
    if (user.role === 'admin') {
      return res.status(403).json({
        error: 'Admin role cannot generate or execute queries.',
      });
    }

    // Fetch user permissions for Layer 1 (Groq prompt authorization)
    const permissions = await getUserPermissions(user.id, user.role);

    // Call Groq with user permissions embedded in the prompt
    const result = await generateQuery(naturalLanguage, schema, permissions, 'postgresql');

    console.log('Groq response:', JSON.stringify(result, null, 2))

    if (result.error) {
      logQuery({
        userId: user.id,
        username: user.username,
        role: user.role,
        queryType: 'AI_GENERATION',
        tablesUsed: [],
        queryText: naturalLanguage,
        rowsAffected: 0,
        executionTimeMs: 0,
        ipAddress: req.ip,
        reason: `Unauthorized Generation Attempt: ${result.error}`,
      });
      return res.status(403).json({ error: result.error })
    }

    // Save to query history
    await supabase.from('query_history').insert({
      user_id: user.id,
      natural_language: naturalLanguage,
      generated_query: result.optimizedQuery,
      executed: false
    });

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/query/execute
 * Executes a validated SQL query against Supabase (after Layer 2 queryValidator). */
const execute = async (req, res, next) => {
  try {
    const { query } = req.body;
    const { user } = req;

    let finalQuery = query.trim();
    const parsed = req.parsedQuery || parseQuery(finalQuery);

    // Row limit injection for 'user' role on SELECT queries
    if (user.role === 'user' && parsed.operation === 'select') {
      const rowLimit = user.row_limit || 500;
      const upperQuery = finalQuery.toUpperCase();

      // Only append LIMIT if not already present
      if (!upperQuery.includes('LIMIT')) {
        // Remove trailing semicolon if present before appending LIMIT
        if (finalQuery.endsWith(';')) {
          finalQuery = finalQuery.slice(0, -1).trim();
        }
        finalQuery += ` LIMIT ${rowLimit}`;
      }
    }

    // Execute the query via Supabase's raw SQL execution
    const startTime = Date.now();

    const { data, error } = await supabase.rpc('execute_raw_sql', {
      query_text: finalQuery,
    });

    const executionTime = Date.now() - startTime;

    if (error) {
      // Log the failed query attempt
      logQuery({
        userId: user.id,
        username: user.username,
        role: user.role,
        queryType: parsed.operation?.toUpperCase() || 'UNKNOWN',
        tablesUsed: parsed.tables || [],
        queryText: finalQuery,
        rowsAffected: 0,
        executionTimeMs: executionTime,
        ipAddress: req.ip,
        reason: `Error: ${error.message}`,
      });

      return res.status(400).json({
        error: 'Query execution failed.',
        details: error.message,
      });
    }

    const rowCount = Array.isArray(data) ? data.length : 0;

    // Audit log (fire and forget)
    logQuery({
      userId: user.id,
      username: user.username,
      role: user.role,
      queryType: parsed.operation?.toUpperCase() || 'UNKNOWN',
      tablesUsed: parsed.tables || [],
      queryText: finalQuery,
      rowsAffected: rowCount,
      executionTimeMs: executionTime,
      ipAddress: req.ip,
    });

    // Update query history to mark as executed
    supabase
      .from('query_history')
      .update({ executed: true })
      .eq('user_id', user.id)
      .eq('generated_query', query.trim())
      .order('created_at', { ascending: false })
      .limit(1)
      .then(() => {})
      .catch(() => {});

    res.json({
      data: data || [],
      rowCount,
      executionTimeMs: executionTime,
      query: finalQuery,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/query/analyze
 * Analyzes and optimizes an existing SQL query via Groq. */
const analyze = async (req, res, next) => {
  try {
    const { query, schema } = req.body;
    const { user } = req;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'SQL query is required.' });
    }

    if (!schema || typeof schema !== 'string') {
      return res.status(400).json({ error: 'Database schema is required.' });
    }

    if (user.role === 'admin') {
      return res.status(403).json({
        error: 'Admin role cannot analyze queries.',
      });
    }

    const result = await analyzeQuery(query, schema, 'postgresql');

    return res.json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/query/history
 * Returns the current user's query history, paginated. */
const history = async (req, res, next) => {
  try {
    const { user } = req;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from('query_history')
      .select('*', { count: 'exact' })
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch query history.' });
    }

    res.json({
      data: data || [],
      total: count || 0,
      page,
      limit,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { generate, execute, analyze, history };
