/**
 * Supabase client config using service role key for full backend access.
 */

const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

const supabase = createClient(env.supabase.url, env.supabase.serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

module.exports = supabase;
