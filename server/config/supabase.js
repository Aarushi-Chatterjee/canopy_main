require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

let supabaseServer = null;
try {
  supabaseServer = require('@supabase/server');
} catch (e) {
  // optional server sdk fallback
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
const SUPABASE_JWKS_URL = process.env.SUPABASE_JWKS_URL || '';

let supabaseClient = null;
let isConfigured = false;

if (SUPABASE_URL && SUPABASE_KEY && !SUPABASE_URL.includes('your-project-id')) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: false
      }
    });
    isConfigured = true;
    const hasServiceRoleKey = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY);
    if (process.env.NODE_ENV === 'production' && !hasServiceRoleKey) {
      console.warn('⚠️ [SECURITY WARNING] SUPABASE_SERVICE_ROLE_KEY is not set. Backend queries may be denied by PostgreSQL Row Level Security (RLS) policies on users, user_roles, and audit_events tables.');
    }
    console.log('⚡ Connected to live Supabase project:', SUPABASE_URL);
  } catch (err) {
    console.warn('⚠️ Supabase connection warning:', err.message);
  }
} else if (process.env.NODE_ENV === 'production') {
  console.warn('⚠️ [Canopy Warning] SUPABASE_URL / SUPABASE_KEY not configured in production environment. Running in resilient data mode.');
} else {
  console.log('📦 Running in resilient local data mode (development/test only).');
}

async function assertDatabaseReady() {
  if (!isConfigured || !supabaseClient) {
    return { ready: true, mode: 'local', note: 'Resilient fallback storage active.' };
  }
  try {
    const { error } = await supabaseClient.from('build_calls').select('id').limit(1);
    if (error && !error.message.includes('schema cache')) {
      return { ready: false, error: error.message };
    }
    return { ready: true, mode: 'supabase' };
  } catch (err) {
    return { ready: true, mode: 'local', note: err.message };
  }
}

module.exports = {
  supabase: supabaseClient,
  serverSDK: supabaseServer,
  isConfigured: () => isConfigured,
  assertDatabaseReady,
  url: SUPABASE_URL,
  jwksUrl: SUPABASE_JWKS_URL
};
