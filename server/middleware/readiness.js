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

  // Exempt health and status endpoints from blocking check
  const path = req.path || req.originalUrl || '';
  if (path === '/api/health' || path === '/health') {
    return next();
  }

  // Page navigations (/admin, /admin.html) must NEVER be blocked with JSON 503 errors.
  // They must proceed to founderGate for authentication checks and redirects.
  if (path === '/admin' || path === '/admin.html' || path === '/login' || path === '/login.html') {
    return next();
  }

  // Only fail-fast with 503 if SUPABASE_STRICT_PROD === 'true'; otherwise operate in resilient data mode
  if (process.env.SUPABASE_STRICT_PROD !== 'true') {
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
