const express = require('express');
const cors = require('cors');
const path = require('path');

const authRouter = require('./routes/auth');
const matchesRouter = require('./routes/matches');
const sprintsRouter = require('./routes/sprints');
const callsRouter = require('./routes/calls');
const notebookRouter = require('./routes/notebook');
const applicationsRouter = require('./routes/applications');
const moderationRouter = require('./routes/moderation');
const contentRouter = require('./routes/content');
const adminRouter = require('./routes/admin');

const { validateCsrf, optionalAuth } = require('./middleware/auth');
const { isConfigured, supabase } = require('./config/supabase');
const { requireDatabaseReady } = require('./middleware/readiness');

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
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.vercel.app')) {
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
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:3001 http://127.0.0.1:3001 https://*.supabase.co https://*.vercel.app;"
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
app.use('/api', validateCsrf);

// Production database readiness gate (P0-1)
app.use('/api', requireDatabaseReady);

// Unified Founder Console & API Security Gate (SEC-04, SEC-05)
function founderGate(req, res, next) {
  const staffRoles = ['owner', 'admin', 'moderator', 'match_curator', 'content_editor'];
  const hasStaffRole = req.user && req.user.roles && req.user.roles.some(r => staffRoles.includes(r));
  const isOwner = req.user && req.user.roles && req.user.roles.includes('owner');
  const requiredFounderKey = process.env.FOUNDER_CONSOLE_KEY;
  const providedKey = req.query?.key || req.headers['x-founder-key'] || req.cookies?.canopy_founder_key;

  // 1. If a valid secondary founder console key is explicitly provided, allow access and set cookie
  if (requiredFounderKey && providedKey === requiredFounderKey) {
    res.cookie('canopy_founder_key', providedKey, {
      httpOnly: true,
      sameSite: 'Lax',
      secure: process.env.NODE_ENV === 'production'
    });
    return next();
  }

  // 2. If user is authenticated as verified Owner (platform founder), grant direct access
  if (isOwner) {
    return next();
  }

  // 3. If user has operational staff roles, permit API access
  if (hasStaffRole) {
    if (req.originalUrl.startsWith('/api/admin')) {
      return next();
    }
  }

  // 4. If requesting API without owner/staff/founder key -> 403 Forbidden
  if (req.originalUrl.startsWith('/api/admin')) {
    return res.status(403).json({ error: 'Forbidden. Founder or Platform Administrator credentials required.' });
  }

  // 5. For /admin UI: If secondary key is configured, prompt for it; otherwise redirect to login
  if (requiredFounderKey) {
    return res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head><title>Canopy // Console Authentication Gate</title><style>body{background:#090e09;color:#e2e8f0;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;}form{background:#0f1710;padding:32px;border-radius:8px;border:1px solid #1c2e1f;max-width:360px;width:100%;}input{width:100%;padding:10px;margin:12px 0 16px;background:#090e09;border:1px solid #2d4a32;border-radius:4px;color:#fff;box-sizing:border-box;}button{width:100%;padding:10px;background:#4ade80;border:none;border-radius:4px;color:#090e09;font-weight:bold;cursor:pointer;}</style></head>
      <body>
        <form method="GET" action="/admin">
          <h3 style="margin-top:0;color:#4ade80;">Founder Station Gate</h3>
          <p style="font-size:13px;color:#94a3b8;">Enter your secondary founder key to unlock operations:</p>
          <input type="password" name="key" placeholder="Founder Access Key" required autofocus />
          <button type="submit">Unlock Console →</button>
        </form>
      </body>
      </html>
    `);
  }

  return res.redirect('/login.html?redirect=/admin');
}

// Server-Side Protected Founder Console Route
app.get(['/admin', '/admin.html'], optionalAuth, founderGate, (req, res) => {
  const adminHtmlPath = path.join(__dirname, '../admin.html');
  res.sendFile(adminHtmlPath);
});

// Health check with honest DB status verification
app.get('/api/health', async (req, res) => {
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

// Mount modular API domain routers
app.use('/api/auth', authRouter);
app.use('/api/matches', matchesRouter);
app.use('/api/sprints', sprintsRouter);
app.use('/api/calls', callsRouter);
app.use('/api/notebook', notebookRouter);
app.use('/api/applications', applicationsRouter);
app.use('/api/moderation', moderationRouter);
app.use('/api/content', contentRouter);
app.use('/api/admin', optionalAuth, founderGate, adminRouter);

// 404 handler for API routes
app.use('/api', (req, res) => {
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
