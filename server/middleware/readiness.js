const { assertDatabaseReady } = require('../config/supabase');

/**
 * Production Readiness & Database Liveness Gate
 * Returns 503 Service Unavailable if production database is degraded or disconnected.
 */
async function requireDatabaseReady(req, res, next) {
  // Only enforce strict fail-fast gate in production environment
  if (process.env.NODE_ENV !== 'production') {
    return next();
  }

  // Exempt health endpoint from blocking check
  if (req.path === '/api/health') {
    return next();
  }

  const check = await assertDatabaseReady();
  if (!check.ready) {
    return res.status(503).json({
      error: 'Service Temporarily Unavailable',
      message: 'Canopy database is currently disconnected or recovering. Please retry shortly.',
      timestamp: new Date().toISOString()
    });
  }

  next();
}

module.exports = { requireDatabaseReady };
