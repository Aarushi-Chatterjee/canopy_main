const crypto = require('crypto');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('[FATAL] JWT_SECRET environment variable must be defined in production.');
    }
    if (!global.__CANOPY_DEV_JWT_SECRET) {
      global.__CANOPY_DEV_JWT_SECRET = crypto.randomBytes(32).toString('hex');
      console.warn('[AUTH] Warning: No JWT_SECRET set. Using ephemeral random secret for development/test.');
    }
    return global.__CANOPY_DEV_JWT_SECRET;
  }
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('[FATAL] JWT_SECRET must be at least 32 characters in production.');
  }
  return secret;
}

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) str += '=';
  return Buffer.from(str, 'base64').toString('utf8');
}

// Generate signed cryptographic JWT
function generateToken(user, expiresInSec = 7 * 24 * 3600) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.id,
    email: user.email,
    role: user.role || 'builder',
    displayName: user.displayName || user.display_name,
    iat: now,
    exp: now + expiresInSec
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', getJwtSecret())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Verify signed cryptographic JWT
function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;

  // Gracefully handle "Bearer " prefix if included
  if (token.startsWith('Bearer ')) token = token.substring(7);

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, signature] = parts;
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const expectedSig = crypto
    .createHmac('sha256', getJwtSecret())
    .update(dataToSign)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  try {
    const isSigValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
    if (!isSigValid) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null; // Expired token
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      displayName: payload.displayName,
      iat: payload.iat
    };
  } catch (err) {
    return null;
  }
}

// Parse Cookie header safely without external dependencies
function parseCookies(cookieHeader) {
  const cookies = {};
  if (!cookieHeader || typeof cookieHeader !== 'string') return cookies;
  const parts = cookieHeader.split(';');
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i].trim();
    const eqIdx = part.indexOf('=');
    if (eqIdx !== -1) {
      const key = part.slice(0, eqIdx).trim();
      const val = part.slice(eqIdx + 1).trim();
      cookies[key] = decodeURIComponent(val);
    }
  }
  return cookies;
}

// Extract session token from cookie first, then Authorization header
function extractToken(req) {
  // 1. Check req.cookies or raw Cookie header for canopy_session
  if (req.cookies && req.cookies.canopy_session) {
    return req.cookies.canopy_session;
  }
  if (req.headers.cookie) {
    const parsed = parseCookies(req.headers.cookie);
    if (parsed.canopy_session) return parsed.canopy_session;
  }
  // 2. Fallback to Authorization: Bearer <token>
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '').trim();
  }
  return null;
}

// Set HttpOnly, Secure session cookie on response
function setSessionCookie(res, token, maxAgeSec = 7 * 24 * 3600) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieParts = [
    `canopy_session=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${maxAgeSec}`
  ];
  if (isProd) {
    cookieParts.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

// Clear session cookie on logout
function clearSessionCookie(res) {
  const isProd = process.env.NODE_ENV === 'production';
  const cookieParts = [
    'canopy_session=',
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    'Max-Age=0'
  ];
  if (isProd) {
    cookieParts.push('Secure');
  }
  res.setHeader('Set-Cookie', cookieParts.join('; '));
}

// Middleware: CSRF protection for cookie-authenticated mutating requests
function validateCsrf(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  // If the request uses a session cookie, require custom client header
  const cookieHeader = req.headers.cookie;
  const hasSessionCookie = (req.cookies && req.cookies.canopy_session) || (cookieHeader && cookieHeader.includes('canopy_session='));
  
  if (hasSessionCookie) {
    const customHeader = req.headers['x-canopy-client'] || req.headers['x-requested-with'];
    if (!customHeader) {
      return res.status(403).json({
        error: 'CSRF validation failed. Missing X-Canopy-Client or X-Requested-With header.'
      });
    }
  }
  next();
}

// Helper: Resolve active roles for user including server-side founder allowlist bootstrap
async function getUserRoles(userId, email, baseRole = null) {
  const { userRoles: userRolesRepo, auditEvents: auditRepo } = require('../repositories');
  const roles = new Set();

  // 0. Base role from verified cryptographic token or user record if provided
  if (baseRole) {
    roles.add(baseRole);
  }

  // 1. Query database for assigned persistent roles (P0-2)
  try {
    const assignedRoles = await userRolesRepo.findActiveRolesByUserId(userId);
    assignedRoles.forEach(r => roles.add(r));
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      throw err;
    }
  }

  // 2. Server-side Founder Bootstrap (via FOUNDER_EMAILS env variable only)
  const founderEnv = process.env.FOUNDER_EMAILS || '';
  if (email && founderEnv) {
    const founderEmails = founderEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    if (founderEmails.includes(email.toLowerCase())) {
      roles.add('owner');
      roles.add('admin');

      // Ensure persistent role record exists in database
      try {
        const assignedRoles = await userRolesRepo.findActiveRolesByUserId(userId);
        if (!assignedRoles.includes('owner')) {
          await userRolesRepo.grantRole(userId, 'owner', 'system_founder_bootstrap');
          await auditRepo.logEvent({
            actorId: userId,
            actorRole: 'owner',
            action: 'founder.bootstrap_granted',
            targetType: 'user_roles',
            targetId: userId,
            payload: { role: 'owner', email }
          });
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'production') {
          console.error('[AUTH:BOOTSTRAP:ERROR] Failed to persist founder role to database:', err.message);
        }
      }
    }
  }

  // Fallback basic roles if none explicitly assigned
  if (roles.size === 0) {
    roles.add('registered_user');
  }

  return Array.from(roles);
}

// Middleware: Enforce authentic user, session revocation validation, and database roles
async function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please sign in to your Field Station Pass.' });
  }

  const user = verifyToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Session invalid or expired. Please sign in again.' });
  }

  // Session Revocation & Suspension Check (P1-3)
  const { users: usersRepo } = require('../repositories');
  try {
    const dbUser = await usersRepo.findById(user.id);
    if (dbUser) {
      if (dbUser.isSuspended || dbUser.suspendedAt) {
        return res.status(403).json({ error: 'Your Canopy access pass has been suspended. Please contact support@canopy.earth.' });
      }
      if (dbUser.revokedAfter && user.iat) {
        const revokedTime = Math.floor(new Date(dbUser.revokedAfter).getTime() / 1000);
        if (user.iat < revokedTime) {
          return res.status(401).json({ error: 'Session was revoked following a security update. Please sign in again.' });
        }
      }
    }

    req.user = user;
    req.user.roles = await getUserRoles(user.id, user.email, dbUser?.role || user.role);
    next();
  } catch (err) {
    if (process.env.NODE_ENV === 'production' && err.statusCode === 503) {
      return res.status(503).json({ error: 'Canopy authentication service is currently unavailable.' });
    }
    next(err);
  }
}

// Middleware: Attach user and roles if present, validate session revocation
async function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    const user = verifyToken(token);
    if (user) {
      const { users: usersRepo } = require('../repositories');
      try {
        const dbUser = await usersRepo.findById(user.id);
        if (dbUser) {
          if (dbUser.isSuspended || dbUser.suspendedAt) {
            return next();
          }
          if (dbUser.revokedAfter && user.iat) {
            const revokedTime = Math.floor(new Date(dbUser.revokedAfter).getTime() / 1000);
            if (user.iat < revokedTime) {
              return next();
            }
          }
        }
        req.user = user;
        req.user.roles = await getUserRoles(user.id, user.email, dbUser?.role || user.role);
      } catch (err) {
        // Continue unauthenticated on transient failure in optionalAuth
      }
    }
  }
  next();
}

// Middleware factory: Enforce specific single role (Owner always inherits full access)
function requireRole(role) {
  return async (req, res, next) => {
    await requireAuth(req, res, () => {
      const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
      if (roles.includes('owner') || roles.includes(role)) {
        return next();
      }
      return res.status(403).json({ error: `Forbidden. Requires ${role} role permissions.` });
    });
  };
}

// Middleware factory: Enforce any of the specified roles (Owner always inherits full access)
function requireAnyRole(allowedRoles = []) {
  return async (req, res, next) => {
    await requireAuth(req, res, () => {
      const roles = req.user?.roles || (req.user?.role ? [req.user.role] : []);
      if (roles.includes('owner') || allowedRoles.some(r => roles.includes(r))) {
        return next();
      }
      return res.status(403).json({ error: 'Forbidden. Insufficient operational staff privileges.' });
    });
  };
}

// Middleware: Enforce administrator, moderator, or founder role
function requireAdmin(req, res, next) {
  requireAnyRole(['admin', 'moderator', 'owner'])(req, res, next);
}

module.exports = {
  getJwtSecret,
  getUserRoles,
  generateToken,
  verifyToken,
  parseCookies,
  extractToken,
  setSessionCookie,
  clearSessionCookie,
  validateCsrf,
  requireAuth,
  optionalAuth,
  requireRole,
  requireAnyRole,
  requireAdmin
};

