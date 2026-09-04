require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

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
    console.log('⚡ Connected to live Supabase / PostgreSQL:', SUPABASE_URL);
  } catch (err) {
    console.warn('⚠️ Supabase connection failed, using local resilient file-store adapter:', err.message);
  }
} else {
  console.log('📦 No live Supabase credentials detected in .env; running in resilient local data mode.');
}

module.exports = {
  supabase: supabaseClient,
  isConfigured: () => isConfigured
};
