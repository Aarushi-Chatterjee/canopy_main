require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

let supabaseServer = null;
try {
  supabaseServer = require('@supabase/server');
} catch (e) {
  // optional server sdk fallback
}

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
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
    console.log('⚡ Connected to live Supabase project:', SUPABASE_URL);
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[FATAL] Failed to initialize Supabase client in production: ${err.message}`);
    }
    console.warn('⚠️ Supabase connection warning:', err.message);
  }
} else if (process.env.NODE_ENV === 'production') {
  throw new Error('[FATAL] Production deployment requires valid SUPABASE_URL and SUPABASE_KEY. Ephemeral local JSON storage is disabled in production.');
} else {
  console.log('📦 Running in resilient local data mode (development/test only).');
}

async function assertDatabaseReady() {
  if (process.env.NODE_ENV !== 'production') {
    return { ready: true, mode: isConfigured ? 'supabase' : 'local' };
  }
  if (!isConfigured || !supabaseClient) {
    return { ready: false, error: 'Database client unconfigured in production environment.' };
  }
  try {
    const { error } = await supabaseClient.from('build_calls').select('id').limit(1);
    if (error && !error.message.includes('schema cache')) {
      return { ready: false, error: error.message };
    }
    return { ready: true, mode: 'supabase' };
  } catch (err) {
    return { ready: false, error: err.message };
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
