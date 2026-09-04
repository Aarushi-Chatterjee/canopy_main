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

// Middleware
app.use(cors());
app.use(express.json());

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
const server = app.listen(PORT, () => {
  console.log(`🌱 Canopy Backend API running at http://localhost:${PORT}`);
  console.log(`   Health Check: http://localhost:${PORT}/api/health`);
  console.log(`   Sandbox Matches: http://localhost:${PORT}/api/matches/sandbox`);
  console.log(`   Sprint Board: http://localhost:${PORT}/api/sprints`);
  console.log(`   Build Calls: http://localhost:${PORT}/api/calls`);
  console.log(`   Lab Notebook: http://localhost:${PORT}/api/notebook`);
});

module.exports = { app, server };
