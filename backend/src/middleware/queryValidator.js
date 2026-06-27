/**
 * Layer 2 authorization middleware. Parses SQL with node-sql-parser, extracts operation type and tables, verifies against user permissions. Blocks unauthorized queries before execution.
 */

const { Parser } = require('node-sql-parser');
const supabase = require('../config/db');

const parser = new Parser();

// Operations that are never allowed for 'user' role
const DDL_OPERATIONS = ['CREATE', 'ALTER', 'DROP', 'TRUNCATE'];
const TCL_OPERATIONS = ['COMMIT', 'ROLLBACK', 'SAVEPOINT'];

// Map AST types to our permission column names
const OP_TO_PERMISSION = {
  select: 'can_select',
  insert: 'can_insert',
  update: 'can_update',
  delete: 'can_delete',
};

/** Extracts operation and tables from SQL. Returns {operation, tables, isDDL, isTCL}. */
function parseQuery(sql) {
  // Check for DDL/TCL operations via keyword detection first,
  // since node-sql-parser may not parse all DDL dialects cleanly
  const upperSql = sql.trim().toUpperCase();

  for (const op of DDL_OPERATIONS) {
    if (upperSql.startsWith(op)) {
      return { operation: op.toLowerCase(), tables: [], isDDL: true };
    }
  }

  for (const op of TCL_OPERATIONS) {
    if (upperSql.startsWith(op)) {
      return { operation: op.toLowerCase(), tables: [], isTCL: true };
    }
  }

  // Parse with node-sql-parser for DML statements
  try {
    const ast = parser.astify(sql, { database: 'postgresql' });

    // Handle multiple statements (should be blocked)
    const statements = Array.isArray(ast) ? ast : [ast];

    if (statements.length > 1) {
      return { operation: 'multi', tables: [], isMultiStatement: true };
    }

    const stmt = statements[0];
    const operation = (stmt.type || '').toLowerCase();
    const tables = extractTables(stmt);

    return { operation, tables, isDDL: false, isTCL: false };
  } catch (parseError) {
    // If parser fails, reject the query for safety
    return { operation: 'unknown', tables: [], parseError: parseError.message };
  }
}

/** Recursively extracts table names from an AST node. */
function extractTables(ast) {
  const tables = new Set();

  if (!ast) return [];

  // FROM clause tables
  if (ast.from) {
    for (const fromItem of (Array.isArray(ast.from) ? ast.from : [ast.from])) {
      if (fromItem.table) {
        tables.add(fromItem.table.toLowerCase());
      }
      // Handle subqueries in FROM
      if (fromItem.expr && fromItem.expr.ast) {
        extractTables(fromItem.expr.ast).forEach((t) => tables.add(t));
      }
    }
  }

  // Table for INSERT/UPDATE/DELETE
  if (ast.table) {
    const tableList = Array.isArray(ast.table) ? ast.table : [ast.table];
    for (const t of tableList) {
      if (typeof t === 'string') {
        tables.add(t.toLowerCase());
      } else if (t && t.table) {
        tables.add(t.table.toLowerCase());
      }
    }
  }

  // JOIN tables
  if (ast.join) {
    for (const joinItem of (Array.isArray(ast.join) ? ast.join : [])) {
      if (joinItem.table) {
        tables.add(joinItem.table.toLowerCase());
      }
    }
  }

  // Subqueries in WHERE
  if (ast.where) {
    const subTables = extractTablesFromExpression(ast.where);
    subTables.forEach((t) => tables.add(t));
  }

  return Array.from(tables);
}

/**
 * Extracts tables from WHERE clause expressions (handles subqueries).
 */
function extractTablesFromExpression(expr) {
  const tables = [];
  if (!expr) return tables;

  if (expr.ast) {
    tables.push(...extractTables(expr.ast));
  }
  if (expr.left) {
    tables.push(...extractTablesFromExpression(expr.left));
  }
  if (expr.right) {
    tables.push(...extractTablesFromExpression(expr.right));
  }
  if (expr.value && typeof expr.value === 'object' && expr.value.ast) {
    tables.push(...extractTables(expr.value.ast));
  }

  return tables;
}

/** Validates queries against user permissions. Expects req.body.query and req.user. */
const queryValidator = async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({ error: 'Query is required.' });
    }

    const trimmedQuery = query.trim();
    const { user } = req;

    // Admin cannot execute queries at all
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    // Parse the query
    const parsed = parseQuery(trimmedQuery);

    // Block unparseable queries
    if (parsed.parseError) {
      return res.status(400).json({ error: 'Invalid SQL syntax.' });
    }

    // Block multi-statement queries
    if (parsed.isMultiStatement) {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    // DBA role: allow everything including DDL/TCL
    if (user.role === 'dba') {
      req.parsedQuery = parsed;
      return next();
    }

    // === User role checks below ===

    // Users cannot run DDL operations
    if (parsed.isDDL) {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    // Users cannot run TCL operations
    if (parsed.isTCL) {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    // Check if operation type is supported
    const permissionColumn = OP_TO_PERMISSION[parsed.operation];
    if (!permissionColumn) {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    // Fetch user permissions from database
    const { data: permissions, error } = await supabase
      .from('user_permissions')
      .select('table_name, can_select, can_insert, can_update, can_delete')
      .eq('user_id', user.id);

    if (error) {
      return res.status(500).json({ error: 'Failed to verify permissions.' });
    }

    if (!permissions || permissions.length === 0) {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    // Build a map of user's permitted tables and operations
    const permMap = {};
    for (const perm of permissions) {
      permMap[perm.table_name.toLowerCase()] = perm;
    }

    // Check each table in the query against user permissions
    if (parsed.tables.length === 0 && parsed.operation !== 'select') {
      // Non-SELECT without identifiable tables — block for safety
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    // For SELECT without tables (e.g., SELECT 1, SELECT NOW()), allow if user has any select permission
    if (parsed.tables.length === 0 && parsed.operation === 'select') {
      const hasAnySelect = permissions.some((p) => p.can_select);
      if (!hasAnySelect) {
        return res.status(403).json({ error: 'Unauthorized operation.' });
      }
      req.parsedQuery = parsed;
      return next();
    }

    // Verify permission for every table used in the query
    for (const table of parsed.tables) {
      const tablePerm = permMap[table];

      // No permission record for this table
      if (!tablePerm) {
        return res.status(403).json({ error: 'Unauthorized operation.' });
      }

      // Check the specific operation permission
      if (!tablePerm[permissionColumn]) {
        return res.status(403).json({ error: 'Unauthorized operation.' });
      }
    }

    // Block access to audit_logs for DELETE (extra protection)
    if (parsed.operation === 'delete' && parsed.tables.includes('audit_logs')) {
      return res.status(403).json({ error: 'Unauthorized operation.' });
    }

    req.parsedQuery = parsed;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { queryValidator, parseQuery };
