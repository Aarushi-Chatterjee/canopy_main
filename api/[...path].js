/**
 * Canopy Vercel Serverless Catch-All Entry Point
 * Routes all /api/* requests through the Canopy Express API Gateway.
 */
const { app } = require('../server/index');

module.exports = (req, res) => {
  let targetUrl = req.headers['x-matched-path'] || req.headers['x-forwarded-uri'] || req.url;
  if (targetUrl && targetUrl !== '/api/index.js') {
    const qIdx = req.url.indexOf('?');
    if (qIdx !== -1 && !targetUrl.includes('?')) {
      targetUrl += req.url.slice(qIdx);
    }
    req.url = targetUrl;
  }
  return app(req, res);
};
