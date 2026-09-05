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

const { validateCsrf } = require('./middleware/auth');
const { isConfigured, supabase } = require('./config/supabase');

const app = express();
const PORT = process.env.PORT || 3001;

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'https://canopy.earth',
  'https://www.canopy.earth'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (curl, server-to-server, tests) or authorized origins
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.canopy.earth')) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy does not allow access from origin: ' + origin), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Canopy-Client']
}));

// Limit request payload to prevent Denial of Service via large memory buffers
app.use(express.json({ limit: '100kb' }));

// Enterprise Security & Content Security Policy Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:3001 http://127.0.0.1:3001 https://*.supabase.co https://*.canopy.earth;"
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
app.use('/api/admin', adminRouter);

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
