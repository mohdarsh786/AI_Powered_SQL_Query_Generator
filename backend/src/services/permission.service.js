/**
 * Permission Service. Fetches and manages user permissions from DB. Provides structured permissions for query validator and Groq prompt.
 */

const supabase = require('../config/db');

/**
 * Fetches a user's permissions and returns a structured object. @returns {Promise<object>} Permissions object for Groq prompt and validation
 */
async function getUserPermissions(userId, userRole) {
  // DBA has unrestricted access
  if (userRole === 'dba') {
    return {
      role: 'dba',
      allowedTables: ['*'],
      allowedOps: ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 'DROP'],
    };
  }

  // Admin cannot execute queries
  if (userRole === 'admin') {
    return {
      role: 'admin',
      allowedTables: [],
      allowedOps: [],
    };
  }

  // For 'user' role, fetch specific permissions from DB
  const { data: permissions, error } = await supabase
    .from('user_permissions')
    .select('table_name, can_select, can_insert, can_update, can_delete')
    .eq('user_id', userId);

  if (error) {
    throw new Error(`Failed to fetch permissions: ${error.message}`);
  }

  if (!permissions || permissions.length === 0) {
    return {
      role: 'user',
      allowedTables: [],
      allowedOps: [],
    };
  }

  const allowedTables = permissions.map((p) => p.table_name);

  // Collect distinct allowed operations across all tables
  const opsSet = new Set();
  for (const perm of permissions) {
    if (perm.can_select) opsSet.add('SELECT');
    if (perm.can_insert) opsSet.add('INSERT');
    if (perm.can_update) opsSet.add('UPDATE');
    if (perm.can_delete) opsSet.add('DELETE');
  }

  return {
    role: 'user',
    allowedTables,
    allowedOps: Array.from(opsSet),
    tablePermissions: permissions,
  };
}

/**
 * Grants or updates permissions for a user on a specific table. @returns {Promise<object>} The created/updated permission record
 */
async function grantPermission(params) {
  const {
    userId,
    tableName,
    canSelect = false,
    canInsert = false,
    canUpdate = false,
    canDelete = false,
    canExport = false,
    grantedBy,
  } = params;

  // Verify target user exists and is a 'user' role (not admin/dba)
  const { data: targetUser, error: userError } = await supabase
    .from('app_users')
    .select('id, role')
    .eq('id', userId)
    .single();

  if (userError || !targetUser) {
    throw Object.assign(new Error('Target user not found.'), { statusCode: 404 });
  }

  if (targetUser.role !== 'user') {
    throw Object.assign(
      new Error('Permissions can only be granted to users with "user" role.'),
      { statusCode: 400 }
    );
  }

  // Upsert permission (insert or update on conflict)
  const { data, error } = await supabase
    .from('user_permissions')
    .upsert(
      {
        user_id: userId,
        table_name: tableName.toLowerCase(),
        can_select: canSelect,
        can_insert: canInsert,
        can_update: canUpdate,
        can_delete: canDelete,
        can_export: canExport,
        granted_by: grantedBy,
        granted_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,table_name' }
    )
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to grant permission: ${error.message}`);
  }

  return data;
}

/**
 * Revokes all permissions for a user on a specific table.
 */
async function revokePermission(userId, tableName) {
  const { error } = await supabase
    .from('user_permissions')
    .delete()
    .eq('user_id', userId)
    .eq('table_name', tableName.toLowerCase());

  if (error) {
    throw new Error(`Failed to revoke permission: ${error.message}`);
  }
}

module.exports = { getUserPermissions, grantPermission, revokePermission };
