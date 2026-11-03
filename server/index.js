/**
 * ============================================================================
 * CANOPY // BACKEND API GATEWAY & ENTERPRISE RUNTIME
 * ============================================================================
 * Primary API Gateway server providing:
 * - Cookie-authenticated enterprise sessions with zero external cookie-parser overhead
 * - Timing-safe Founder Station & Admin Console protection
 * - CSRF defense on state-mutating requests
 * - Strict database readiness gating (fail-honest 503 on unconfigured/unreachable DB in production)
 * - Domain-driven modular routing (Auth, Matches, Sprints, Calls, Notebook, Admin)
 * 
 * TABLE OF CONTENTS:
 * ----------------------------------------------------------------------------
 * 1. DEPENDENCY IMPORTS & CORE MODULES ............. Line ~28
 * 2. APP INITIALIZATION & CORS POLICIES ............ Line ~48
 * 3. SECURITY HEADERS & COOKIE MIDDLEWARE .......... Line ~85
 * 4. CSRF & PRODUCTION DATABASE READINESS GATES ... Line ~130
 * 5. FOUNDER CONSOLE AUTHENTICATION GATE (SEC-02) .. Line ~145
 * 6. HEALTH CHECK & OPERATIONAL TELEMETRY ......... Line ~250
 * 7. DOMAIN ROUTER MOUNTING & 404/500 HANDLERS ..... Line ~280
 * 8. SERVER BOOTSTRAP ............................. Line ~310
 * ============================================================================
 */

/* ============================================================================
   SECTION 1: DEPENDENCY IMPORTS & CORE MODULES
   ============================================================================ */
// Express does not load .env automatically; load it before any config is read.
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');

const authRouter = require('./routes/auth');
const matchesRouter = require('./routes/matches');
const sprintsRouter = require('./routes/sprints');
const callsRouter = require('./routes/calls');
const notebookRouter = require('./routes/notebook');
const applicationsRouter = require('./routes/applications');
const moderationRouter = require('./routes/moderation');
const contentRouter = require('./routes/content');
const settingsRouter = require('./routes/settings');
const adminRouter = require('./routes/admin');

const { validateCsrf, optionalAuth } = require('./middleware/auth');
const { isConfigured, supabase } = require('./config/supabase');
const { requireDatabaseReady } = require('./middleware/readiness');

/* ============================================================================
   SECTION 2: APP INITIALIZATION & CORS POLICIES
   ============================================================================ */
const app = express();
// Enable trust proxy for accurate client IP extraction behind reverse proxies (Vercel, Cloudflare)
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

const configuredOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);
const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  ...configuredOrigins
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, tests) or authorized origins
    const isCanopyVercel = origin === 'https://canopy-ten-lake.vercel.app' || /^https:\/\/canopy-[a-z0-9-]+\.vercel\.app$/.test(origin);
    if (!origin || ALLOWED_ORIGINS.includes(origin) || isCanopyVercel) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy does not allow access from origin: ' + origin), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Canopy-Client', 'X-Founder-Key']
}));

// Limit request payload to prevent Denial of Service via large memory buffers
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: false, limit: '100kb' }));

// Native zero-dependency cookie parser (SEC-04)
app.use((req, res, next) => {
  req.cookies = {};
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    cookieHeader.split(';').forEach(part => {
      const eqIdx = part.indexOf('=');
      if (eqIdx !== -1) {
        const key = part.slice(0, eqIdx).trim();
        const val = part.slice(eqIdx + 1).trim();
        try {
          req.cookies[key] = decodeURIComponent(val);
        } catch (_) {
          req.cookies[key] = val;
        }
      }
    });
  }
  next();
});

// Enterprise Security & Content Security Policy Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:3001 http://127.0.0.1:3001 https://*.supabase.co https://*.vercel.app https://accounts.google.com https://*.googleapis.com; frame-src 'self' https://accounts.google.com;"
  );
  next();
});

// Request logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[Canopy API] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});



// CSRF validation for cookie-authenticated mutating requests
app.use(['/api', '/auth', '/matches', '/sprints', '/calls', '/notebook', '/applications', '/moderation', '/content', '/admin', '/settings'], validateCsrf);

// Production database readiness gate (P0-1)
app.use(['/api', '/auth', '/matches', '/sprints', '/calls', '/notebook', '/applications', '/moderation', '/content', '/api/admin', '/settings'], requireDatabaseReady);

const { timingSafeMatch: timingSafeKeyMatch } = require('./utils/crypto');

// Helper to render genuine 404 page for unauthorized visitors (Stealth Mode)
function renderNotFoundPage(res) {
  const fs = require('fs');
  const path = require('path');
  const possiblePaths = [
    path.join(__dirname, '../dist/404.html'),
    path.join(__dirname, '../client/404.html'),
    path.join(__dirname, '../404.html')
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      return res.status(404).sendFile(p);
    }
  }

  return res.status(404).send(`
    <!doctype html>
    <html lang="en">
    <head><meta charset="UTF-8"><title>Page not found - Canopy</title></head>
    <body style="font-family:sans-serif;background:#F5F2EB;color:#1B2E20;padding:40px;text-align:center;">
      <h1>Nothing is growing at this address.</h1>
      <p>The page you are looking for does not exist.</p>
      <a href="/" style="color:#2C5F2D;font-weight:bold;">Back to Canopy</a>
    </body>
    </html>
  `);
}

// Unified Stealth Founder Console & API Security Gate (SEC-02, SEC-04, SEC-05)
function founderGate(req, res, next) {
  const staffRoles = ['owner', 'admin', 'moderator', 'match_curator', 'content_editor'];
  const hasStaffRole = req.user && req.user.roles && req.user.roles.some(r => staffRoles.includes(r));
  const isOwner = req.user && req.user.roles && req.user.roles.includes('owner');
  const requiredFounderKey = process.env.FOUNDER_CONSOLE_KEY;
  const isProd = process.env.NODE_ENV === 'production';
  const founderCookieName = isProd ? '__Host-canopy_founder_key' : 'canopy_founder_key';
  const providedKey = req.headers['x-founder-key'] || req.cookies?.[founderCookieName] || req.cookies?.canopy_founder_key;

  // 1. If valid secondary founder key is explicitly provided via header or cookie, allow access
  if (requiredFounderKey && timingSafeKeyMatch(providedKey, requiredFounderKey)) {
    if (providedKey && !(req.cookies?.[founderCookieName] || req.cookies?.canopy_founder_key)) {
      res.cookie(founderCookieName, providedKey, {
        httpOnly: true,
        sameSite: 'Strict',
        secure: isProd,
        path: '/',
        maxAge: 8 * 3600 * 1000
      });
    }
    return next();
  }

  // 2. Verified Owner / Founder authenticated session
  if (isOwner) {
    return next();
  }

  // 3. Operational staff role (permits API access for matching, moderation, content)
  if (hasStaffRole) {
    return next();
  }

  // 4. STEALTH DEFENSE: For any outside visitor, showcase that NO SUCH PAGE EXISTS.
  // API endpoints return the standard API 404 JSON
  const urlPath = req.originalUrl || req.path || '';
  if (urlPath.startsWith('/api/') || req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found on Canopy API' });
  }

  // Web page endpoints (/admin, /admin.html) return genuine 404 Not Found page
  return renderNotFoundPage(res);
}

// Secure POST unlock endpoint for founder console (SEC-02)
app.post('/admin/unlock', (req, res) => {
  const requiredFounderKey = process.env.FOUNDER_CONSOLE_KEY;
  const candidateKey = req.body?.key;

  if (requiredFounderKey && timingSafeKeyMatch(candidateKey, requiredFounderKey)) {
    const isProd = process.env.NODE_ENV === 'production';
    const founderCookieName = isProd ? '__Host-canopy_founder_key' : 'canopy_founder_key';
    res.cookie(founderCookieName, candidateKey, {
      httpOnly: true,
      sameSite: 'Strict',
      secure: isProd,
      path: '/',
      maxAge: 8 * 3600 * 1000 // 8 hours
    });
    return res.redirect('/admin');
  }

  // Stealth: Return genuine 404 on invalid key attempts
  return renderNotFoundPage(res);
});

app.get('/admin/unlock', (req, res) => {
  return renderNotFoundPage(res);
});

app.post('/admin/lock', (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.clearCookie(isProd ? '__Host-canopy_founder_key' : 'canopy_founder_key', { path: '/' });
  res.clearCookie('canopy_founder_key', { path: '/' });
  res.redirect('/login.html');
});

// Server-Side Protected Founder Console Route
app.get(['/admin', '/admin.html'], optionalAuth, founderGate, (req, res) => {
  const fs = require('fs');
  const clientPath = path.join(__dirname, '../client/admin.html');
  const rootPath = path.join(__dirname, '../admin.html');
  const adminHtmlPath = fs.existsSync(clientPath) ? clientPath : rootPath;
  res.sendFile(adminHtmlPath);
});


// Health check with honest DB status verification
app.get(['/api/health', '/health'], async (req, res) => {
  const isProd = process.env.NODE_ENV === 'production';
  let dbStatus = 'local_resilient';

  if (isConfigured() && supabase) {
    try {
      const { error } = await supabase.from('build_calls').select('id').limit(1);
      dbStatus = error ? 'unhealthy' : 'connected';
    } catch (e) {
      dbStatus = 'unreachable';
    }
  } else if (isProd) {
    dbStatus = 'unconfigured';
  }

  const isHealthy = !isProd || dbStatus === 'connected';
  const statusCode = isHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: isHealthy ? 'healthy' : 'degraded',
    database: dbStatus,
    environment: process.env.NODE_ENV || 'development',
    service: 'Canopy Backend API Gateway',
    timestamp: new Date().toISOString(),
    version: '2.4.0'
  });
});

// Mount modular API domain routers (supporting both /api/prefix and direct serverless paths)
app.use(['/api/auth', '/auth'], authRouter);
app.use(['/api/matches', '/matches'], matchesRouter);
app.use(['/api/sprints', '/sprints'], sprintsRouter);
app.use(['/api/calls', '/calls'], callsRouter);
app.use(['/api/notebook', '/notebook'], notebookRouter);
app.use(['/api/applications', '/applications'], applicationsRouter);
app.use(['/api/moderation', '/moderation'], moderationRouter);
app.use(['/api/content', '/content'], contentRouter);
app.use(['/api/settings', '/settings'], settingsRouter);
app.use(['/api/admin', '/admin'], optionalAuth, founderGate, adminRouter);

// Public announcements / notifications sync endpoint
const { announcements: publicAnnouncementsRepo } = require('./repositories');
app.get(['/api/announcements', '/announcements'], async (req, res) => {
  try {
    const list = await publicAnnouncementsRepo.getActive();
    res.json({ announcements: list });
  } catch (err) {
    res.json({ announcements: [] });
  }
});

// 404 handler for API routes
app.use(['/api', '/auth', '/matches', '/sprints', '/calls', '/notebook', '/applications', '/moderation', '/content', '/admin', '/settings'], (req, res) => {
  res.status(404).json({ error: 'Endpoint not found on Canopy API' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Canopy API Error]', err);
  const status = err.statusCode || err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
});

// Start server
let server = null;
if (require.main === module) {
  server = app.listen(PORT, () => {
    console.log(`🌱 Canopy Backend API running at http://localhost:${PORT}`);
    console.log(`   Health Check: http://localhost:${PORT}/api/health`);
    console.log(`   Sandbox Matches: http://localhost:${PORT}/api/matches/sandbox`);
    console.log(`   Sprint Board: http://localhost:${PORT}/api/sprints`);
    console.log(`   Build Calls: http://localhost:${PORT}/api/calls`);
    console.log(`   Lab Notebook: http://localhost:${PORT}/api/notebook`);
    console.log(`   Moderation: http://localhost:${PORT}/api/moderation/queue`);
  });
}

module.exports = { app, server };
