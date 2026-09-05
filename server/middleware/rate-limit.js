// Lightweight in-memory rate limiter for auth and intake routes
const rateLimitMap = new Map();

// Periodic cleanup of stale records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

function rateLimit({ windowMs = 60 * 1000, max = 15, message = 'Too many requests. Please slow down and try again shortly.' } = {}) {
  return (req, res, next) => {
    // Determine client IP or identifier
    const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown-ip';
    const key = `${req.baseUrl || ''}${req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitMap.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitMap.set(key, record);
    } else {
      record.count++;
    }

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      return res.status(429).json({
        error: message,
        retryAfterSec: Math.ceil((record.resetTime - now) / 1000)
      });
    }

    next();
  };
}

module.exports = { rateLimit };
