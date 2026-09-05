const express = require('express');
const cors = require('cors');
const path = require('path');

const authRouter = require('./routes/auth');
const matchesRouter = require('./routes/matches');
const sprintsRouter = require('./routes/sprints');
const callsRouter = require('./routes/calls');
const notebookRouter = require('./routes/notebook');
const applicationsRouter = require('./routes/applications');

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
    // Allow non-browser requests (curl, Postman, test suites) or allowed origins
    if (!origin || ALLOWED_ORIGINS.includes(origin) || origin.endsWith('.canopy.earth')) {
      return callback(null, true);
    }
    return callback(new Error('CORS policy does not allow access from origin: ' + origin), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use(express.json());

// Enterprise Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
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

// 404 handler for API routes
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found on Canopy API' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('[Canopy API Error]', err);
  res.status(err.status || 500).json({
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
  });
}

module.exports = { app, server };
