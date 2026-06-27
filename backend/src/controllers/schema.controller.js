/**
 * Schema Controller. Fetches database schema (DDL only) scoped by user role.
 */

const supabase = require('../config/db');
const { getUserPermissions } = require('../services/permission.service');

// Tables that belong to the application itself (not business data)
const APP_TABLES = ['app_users', 'user_permissions', 'audit_logs', 'query_history'];

/**
 * GET /api/schema/fetch
 * Returns CREATE TABLE DDL strings for tables the user has access to (role-based). */
const fetchSchema = async (req, res, next) => {
  try {
    const { user } = req;

    // Fetch user permissions to determine accessible tables
    const permissions = await getUserPermissions(user.id, user.role);

    // Get all tables from information_schema
    const { data: tables, error: tablesError } = await supabase.rpc('get_schema_tables');

    // Fallback: query information_schema directly if RPC not available
    let tableList;
    if (tablesError || !tables) {
      const { data: rawTables, error: rawError } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_type', 'BASE TABLE');

      if (rawError) {
        // Use a raw SQL query as last resort
        const { data: sqlResult, error: sqlError } = await supabase.rpc('execute_raw_sql', {
          query_text: `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE' ORDER BY table_name`,
        });

        if (sqlError) {
          // Hardcode known tables as absolute fallback
          tableList = [
            'app_users', 'user_permissions', 'audit_logs', 'query_history',
            'departments', 'employees', 'salaries', 'students', 'projects', 'project_assignments',
          ];
        } else {
          tableList = (sqlResult || []).map((r) => r.table_name);
        }
      } else {
        tableList = (rawTables || []).map((r) => r.table_name);
      }
    } else {
      tableList = (tables || []).map((r) => r.table_name);
    }

    // Filter tables by role
    let allowedTables;
    if (user.role === 'dba') {
      allowedTables = tableList;
    } else if (user.role === 'admin') {
      // Admin can see all tables for management context
      allowedTables = tableList;
    } else {
      // User role: only permitted tables
      allowedTables = tableList.filter((t) => permissions.allowedTables.includes(t));
    }

    // Fetch columns for each allowed table
    const schemaOutput = [];

    for (const tableName of allowedTables) {
      const { data: columns, error: colError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable, column_default, character_maximum_length')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position', { ascending: true });

      if (colError || !columns) {
        // Try raw SQL fallback for columns
        const { data: colResult } = await supabase.rpc('execute_raw_sql', {
          query_text: `SELECT column_name, data_type, is_nullable, column_default, character_maximum_length 
                       FROM information_schema.columns 
                       WHERE table_schema = 'public' AND table_name = '${tableName}' 
                       ORDER BY ordinal_position`,
        });

        if (colResult) {
          const ddl = buildCreateTableDDL(tableName, colResult);
          schemaOutput.push(ddl);
        }
        continue;
      }

      const ddl = buildCreateTableDDL(tableName, columns);
      schemaOutput.push(ddl);
    }

    res.json({
      tables: allowedTables,
      schema: schemaOutput.join('\n\n'),
      tableCount: allowedTables.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Builds a CREATE TABLE DDL string from column information.
 * @returns {string} DDL string */
function buildCreateTableDDL(tableName, columns) {
  const colDefs = columns.map((col) => {
    let def = `  ${col.column_name} ${col.data_type.toUpperCase()}`;

    if (col.character_maximum_length) {
      def += `(${col.character_maximum_length})`;
    }

    if (col.is_nullable === 'NO') {
      def += ' NOT NULL';
    }

    if (col.column_default) {
      def += ` DEFAULT ${col.column_default}`;
    }

    return def;
  });

  return `CREATE TABLE ${tableName} (\n${colDefs.join(',\n')}\n);`;
}

module.exports = { fetchSchema };
