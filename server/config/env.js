require('dotenv').config();

/**
 * Canopy Centralized Environment Configuration
 * Provides typed, validated environment parameters with safe fallbacks.
 */

const env = {
  // Server runtime
  NODE_ENV: process.env.NODE_ENV || 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  PORT: parseInt(process.env.PORT || '3001', 10),

  // Security & Authentication
  JWT_SECRET: process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : 'canopy_dev_ephemeral_jwt_secret_32chars!'),
  FOUNDER_EMAILS: (process.env.FOUNDER_EMAILS || 'aarushichatterjee27@gmail.com,achatterjee_be24@thapar.edu,canopy.connect.collaborate@gmail.com')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean),
  FOUNDER_CONSOLE_KEY: process.env.FOUNDER_CONSOLE_KEY || '',

  // Supabase
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
  SUPABASE_PUBLISHABLE_KEY: process.env.SUPABASE_PUBLISHABLE_KEY || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
  SUPABASE_JWKS_URL: process.env.SUPABASE_JWKS_URL || '',

  // CORS & Network
  ALLOWED_ORIGINS: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    ...(process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean)
  ],

  // Email Transport
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'smtp',
  SMTP_HOST: process.env.SMTP_HOST || 'smtp.gmail.com',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
  SMTP_SECURE: process.env.SMTP_SECURE === 'true' || process.env.SMTP_PORT === '465',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  MAIL_FROM: process.env.MAIL_FROM || 'Canopy Dispatch <canopy.connect.collaborate@gmail.com>',
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || 'canopy.connect.collaborate@gmail.com',
  PRIVACY_EMAIL: process.env.PRIVACY_EMAIL || 'canopy.connect.collaborate@gmail.com'
};

module.exports = env;
