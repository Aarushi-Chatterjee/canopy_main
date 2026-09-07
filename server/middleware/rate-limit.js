// Lightweight in-memory rate limiter for auth and intake routes
const rateLimitMap = new Map();

// Periodic cleanup of stale records every 5 minutes (unref so test runners can exit)
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);
if (cleanupInterval.unref) cleanupInterval.unref();

function rateLimit({ 
  windowMs = 60 * 1000, 
  max = 15, 
  message = 'Too many requests. Please slow down and try again shortly.' 
} = {}) {
  return (req, res, next) => {
    // Determine client IP safely across edge proxies (Cloudflare, Vercel, AWS ALB)
    let ip = req.headers['cf-connecting-ip'] || 
             req.headers['x-real-ip'] || 
             (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) || 
             req.ip || 
             req.socket?.remoteAddress || 
             '127.0.0.1';

    const key = `${req.baseUrl || ''}${req.path}:${ip}`;
    const now = Date.now();

    let record = rateLimitMap.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      rateLimitMap.set(key, record);
    } else {
      record.count++;
    }

    const retryAfterSec = Math.max(1, Math.ceil((record.resetTime - now) / 1000));
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader('Retry-After', retryAfterSec);
      return res.status(429).json({
        error: message,
        retryAfterSec
      });
    }

    next();
  };
}

module.exports = { rateLimit };
