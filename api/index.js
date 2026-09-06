/**
 * Canopy Vercel Serverless Entry Point
 * Routes all /api/* requests through the Canopy Express API Gateway.
 */
const { app } = require('../server/index');

module.exports = app;
