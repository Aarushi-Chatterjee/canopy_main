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
    console.warn('⚠️ Supabase connection warning:', err.message);
  }
} else {
  console.log('📦 Running in resilient local data mode.');
}

module.exports = {
  supabase: supabaseClient,
  serverSDK: supabaseServer,
  isConfigured: () => isConfigured,
  url: SUPABASE_URL,
  jwksUrl: SUPABASE_JWKS_URL
};
