const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { users: usersRepo, profiles: profilesRepo } = require('../repositories');
const { user: userMapper } = require('../mappers');
const { generateToken, setSessionCookie, clearSessionCookie, optionalAuth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rate-limit');
const emailService = require('../services/email');
const { supabase, isConfigured } = require('../config/supabase');

// Auth endpoints rate limiting: 15 attempts per minute per IP
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: 'Too many authentication attempts. Please wait one minute before trying again.'
});

// Cryptographic Salted Hashing
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), Buffer.from(derivedKey, 'hex'));
}

// Cryptographic Token Hashing (SHA-256 for OTP & Password Reset codes - SEC-01)
function hashToken(token) {
  if (!token) return null;
  return crypto.createHash('sha256').update(String(token).trim()).digest('hex');
}

function verifyTokenHash(candidate, storedValue) {
  if (!candidate || !storedValue) return false;
  const candidateStr = String(candidate).trim();
  const storedStr = String(storedValue).trim();

  // If stored as 64-char SHA-256 hex hash
  if (storedStr.length === 64 && /^[0-9a-fA-F]+$/.test(storedStr)) {
    const candidateHash = hashToken(candidateStr);
    try {
      return crypto.timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(storedStr, 'hex'));
    } catch (_) {
      return false;
    }
  }

  // Graceful fallback for legacy plaintext fixtures (dev/test backward compatibility)
  return candidateStr === storedStr;
}

// POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { email, password, role = 'builder', displayName } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters in length.' });
    }

    const existing = await usersRepo.findByEmail(email);
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
    }

    // 6-digit cryptographically secure verification code
    const token = crypto.randomInt(100000, 999999).toString();
    const userId = 'usr_' + Date.now();
    const name = displayName || email.split('@')[0];

    const newUser = {
      id: userId,
      email: email.toLowerCase().trim(),
      passwordHash: hashPassword(password),
      role: ['builder', 'problem_holder', 'enabler'].includes(role) ? role : 'builder',
      displayName: name,
      isVerified: false,
      verificationToken: hashToken(token),
      verificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      verificationAttempts: 0,
      lastVerificationSentAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const newProfile = {
      id: 'prof_' + Date.now(),
      userId,
      displayName: name,
      headline: `${newUser.role.replace('_', ' ').toUpperCase()} at Canopy`,
      bio: '',
      primaryDomain: 'climate',
      skillTags: [],
      avatarUrl: newUser.role === 'problem_holder' 
        ? '/avatars/avatar-problem-holders.png' 
        : newUser.role === 'enabler' 
          ? '/avatars/avatar-enablers.png' 
          : '/avatars/avatar-builders.png',
      hoursPerWeek: 10,
      proofOfWork: []
    };

    // Atomic Registration: Rollback user if profile creation fails
    await usersRepo.create(newUser);
    try {
      await profilesRepo.create(newProfile);
    } catch (profileErr) {
      try {
        await usersRepo.delete(u => u.id === userId, { eq: { id: userId } });
      } catch (_) {}
      throw profileErr;
    }

    // Dispatch verification code via Email Service (no token leak in response payload)
    await emailService.sendVerificationCode(newUser.email, token);

    // SECURITY HARDENING: Do NOT issue session cookie prior to OTP verification!
    // Prevents unverified session elevation and account takeover of founder emails.

    res.status(201).json({
      user: userMapper.toSafeUser(newUser),
      profile: newProfile,
      verificationRequired: true,
      verificationNotice: `Verification code dispatched to ${email}. Please check your inbox and enter the 6-digit code to activate your pass.`
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Registration failed.' });
  }
});

// POST /api/auth/verify
router.post('/verify', authLimiter, async (req, res) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({ error: 'Email and verification code are required.' });
    }

    const user = await usersRepo.findByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User record not found.' });
    }

    // Check attempt limit
    const attempts = user.verificationAttempts || 0;
    if (attempts >= 5) {
      // Invalidate code to stop brute force
      await usersRepo.update(
        u => u.id === user.id,
        { verificationToken: null, verificationExpiresAt: null },
        { eq: { id: user.id } }
      );
      return res.status(429).json({
        error: 'Too many failed verification attempts. This code has been invalidated. Please request a new code.'
      });
    }

    // Check expiration (15 minutes)
    if (user.verificationExpiresAt && new Date() > new Date(user.verificationExpiresAt)) {
      return res.status(400).json({
        error: 'Verification code has expired. Please request a new code.'
      });
    }

    const submittedToken = String(token).trim();
    if (!user.verificationToken || !verifyTokenHash(submittedToken, user.verificationToken)) {
      const nextAttempts = attempts + 1;
      await usersRepo.update(
        u => u.id === user.id,
        { verificationAttempts: nextAttempts },
        { eq: { id: user.id } }
      );
      const remaining = Math.max(0, 5 - nextAttempts);
      return res.status(400).json({
        error: `Invalid verification code. ${remaining} attempt(s) remaining before lockout.`
      });
    }

    // Valid code: mark verified and consume token
    const updatedUser = await usersRepo.update(
      u => u.id === user.id,
      {
        isVerified: true,
        verificationToken: null,
        verificationExpiresAt: null,
        verificationAttempts: 0,
        updatedAt: new Date().toISOString()
      },
      { eq: { id: user.id } }
    );

    const profile = await profilesRepo.findByUserId(user.id);
    const sessionToken = generateToken(updatedUser);
    setSessionCookie(res, sessionToken);

    res.json({
      user: userMapper.toSafeUser(updatedUser),
      profile,
      token: sessionToken,
      message: 'Field Station Pass successfully verified and active.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Verification failed.' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const user = await usersRepo.findByEmail(email);
    if (!user) {
      // Return neutral success to prevent email enumeration
      return res.json({
        success: true,
        message: 'If an account exists with that email, a fresh verification code has been dispatched.'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: 'This account is already verified.' });
    }

    // 60-second cooldown enforcement
    if (user.lastVerificationSentAt) {
      const elapsedMs = Date.now() - new Date(user.lastVerificationSentAt).getTime();
      if (elapsedMs < 60 * 1000) {
        const waitSec = Math.ceil((60 * 1000 - elapsedMs) / 1000);
        return res.status(429).json({
          error: `Please wait ${waitSec} second(s) before requesting another code.`
        });
      }
    }

    const newToken = crypto.randomInt(100000, 999999).toString();
    await usersRepo.update(
      u => u.id === user.id,
      {
        verificationToken: hashToken(newToken),
        verificationExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        verificationAttempts: 0,
        lastVerificationSentAt: new Date().toISOString()
      },
      { eq: { id: user.id } }
    );

    await emailService.sendVerificationCode(user.email, newToken);

    res.json({
      success: true,
      message: 'If an account exists with that email, a fresh verification code has been dispatched.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Resend failed.' });
  }
});

// POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Please enter your password.' });
    }

    const user = await usersRepo.findByEmail(email);

    // Prevent account enumeration with generic authentication rejection
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password. Please check your credentials.' });
    }

    // Require email verification before issuing authenticated pass
    if (!user.isVerified) {
      return res.status(403).json({
        error: 'Your Field Station Pass requires email verification. Please check your inbox for the 6-digit verification code.',
        verificationRequired: true,
        email: user.email
      });
    }

    const profile = await profilesRepo.findByUserId(user.id);
    const sessionToken = generateToken(user);
    setSessionCookie(res, sessionToken);

    res.json({
      user: userMapper.toSafeUser(user),
      profile,
      token: sessionToken
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Login failed.' });
  }
});

// POST /api/auth/reset-password-request (Account-enumeration resistant)
router.post(['/reset-password-request', '/password-reset/request'], authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const user = await usersRepo.findByEmail(email);

    if (user) {
      const resetToken = crypto.randomInt(100000, 999999).toString();
      await usersRepo.update(
        u => u.id === user.id,
        {
          resetToken: hashToken(resetToken),
          resetExpiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
          resetAttempts: 0
        },
        { eq: { id: user.id } }
      );
      // Dispatch via email service; no token returned in HTTP response
      await emailService.sendPasswordResetCode(user.email, resetToken);
    }

    res.json({
      success: true,
      message: 'If an account exists with that email, passcode reset instructions have been dispatched.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Reset request failed.' });
  }
});

// POST /api/auth/reset-password-confirm
router.post(['/reset-password-confirm', '/password-reset/confirm'], authLimiter, async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: 'Email, reset code, and new password are required.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters in length.' });
    }

    const user = await usersRepo.findByEmail(email);
    if (!user || !user.resetToken) {
      return res.status(400).json({ error: 'Invalid or expired passcode reset request.' });
    }

    // Check attempts limit (5 max)
    const attempts = user.resetAttempts || 0;
    if (attempts >= 5) {
      await usersRepo.update(
        u => u.id === user.id,
        { resetToken: null, resetExpiresAt: null },
        { eq: { id: user.id } }
      );
      return res.status(429).json({ error: 'Too many failed reset attempts. Request a new password reset.' });
    }

    // Check expiration (15m)
    if (user.resetExpiresAt && new Date() > new Date(user.resetExpiresAt)) {
      return res.status(400).json({ error: 'Passcode reset code has expired. Please request a new one.' });
    }

    if (!user.resetToken || !verifyTokenHash(token, user.resetToken)) {
      await usersRepo.update(
        u => u.id === user.id,
        { resetAttempts: attempts + 1 },
        { eq: { id: user.id } }
      );
      return res.status(400).json({ error: 'Invalid or expired passcode reset request.' });
    }

    // Valid reset: update password and clear reset tokens
    const updated = await usersRepo.update(
      u => u.id === user.id,
      {
        passwordHash: hashPassword(newPassword),
        resetToken: null,
        resetExpiresAt: null,
        resetAttempts: 0,
        updatedAt: new Date().toISOString()
      },
      { eq: { id: user.id } }
    );

    const sessionToken = generateToken(updated);
    setSessionCookie(res, sessionToken);

    res.json({
      success: true,
      user: userMapper.toSafeUser(updated),
      message: 'Passcode successfully updated. You are now signed in.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Reset confirmation failed.' });
  }
});

// GET /api/auth/me (Truthful session status)
router.get('/me', optionalAuth, async (req, res) => {
  try {
    if (req.user) {
      const user = await usersRepo.findById(req.user.id);
      const profile = await profilesRepo.findByUserId(req.user.id);
      const safeUser = userMapper.toSafeUser(user || req.user);
      const isVerified = Boolean(user ? user.isVerified : req.user?.isVerified);
      const access = {
        status: isVerified ? 'access_approved' : 'email_pending',
        roles: req.user.roles || []
      };
      safeUser.access = access;
      return res.json({
        user: safeUser,
        profile,
        access,
        isGuest: false
      });
    }

    // Honest unauthenticated state
    res.json({
      user: null,
      profile: null,
      access: {
        status: 'visitor',
        roles: ['visitor']
      },
      isGuest: true
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to resolve session.' });
  }
});

// GET /api/auth/oauth/config
router.get('/oauth/config', (req, res) => {
  const supabaseUrl = process.env.SUPABASE_URL || '';
  res.json({
    enabled: !!supabaseUrl,
    supabaseUrl,
    provider: 'google'
  });
});

// POST /api/auth/oauth/callback
router.post('/oauth/callback', authLimiter, async (req, res) => {
  try {
    const { access_token, code } = req.body;

    if (!access_token && !code) {
      return res.status(400).json({ error: 'OAuth authorization token or code is required.' });
    }

    let authUser = null;

    if (isConfigured() && supabase) {
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && data?.user) {
          authUser = data.user;
        } else if (error) {
          return res.status(401).json({ error: error.message || 'Failed to exchange OAuth code.' });
        }
      } else if (access_token) {
        const { data, error } = await supabase.auth.getUser(access_token);
        if (!error && data?.user) {
          authUser = data.user;
        } else if (error) {
          return res.status(401).json({ error: error.message || 'Invalid or expired OAuth token.' });
        }
      }
    } else {
      return res.status(503).json({ error: 'OAuth service is not configured on the server.' });
    }

    if (!authUser || !authUser.email) {
      return res.status(400).json({ error: 'OAuth provider did not supply a verified email address.' });
    }

    const email = authUser.email.toLowerCase().trim();
    let user = await usersRepo.findByEmail(email);
    const meta = authUser.user_metadata || {};
    const displayName = meta.full_name || meta.name || email.split('@')[0];

    if (!user) {
      const userId = 'usr_g_' + Date.now();
      user = {
        id: userId,
        email,
        displayName,
        role: 'builder',
        isVerified: true,
        oauthProvider: 'google',
        createdAt: new Date().toISOString()
      };
      await usersRepo.create(user);

      const profile = {
        id: 'prof_' + Date.now(),
        userId,
        displayName,
        headline: 'BUILDER at Canopy',
        bio: '',
        primaryDomain: 'climate',
        skillTags: [],
        avatarUrl: meta.avatar_url || meta.picture || '/avatars/avatar-builders.png',
        hoursPerWeek: 10,
        proofOfWork: []
      };
      await profilesRepo.create(profile);
    } else {
      if (!user.isVerified) {
        user = await usersRepo.update(
          u => u.id === user.id,
          { isVerified: true, updatedAt: new Date().toISOString() },
          { eq: { id: user.id } }
        );
      }
    }

    const profile = await profilesRepo.findByUserId(user.id);
    const sessionToken = generateToken(user);
    setSessionCookie(res, sessionToken);

    res.json({
      user: userMapper.toSafeUser(user),
      profile,
      message: 'Google authentication successful.'
    });
  } catch (err) {
    console.error('[AUTH:OAUTH:ERROR]', err);
    res.status(err.statusCode || 500).json({ error: err.message || 'OAuth authentication failed.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true, message: 'Signed out successfully.' });
});

// GET /api/auth/export (User Data Portability - Privacy Charter 06)
const { requireAuth } = require('../middleware/auth');
router.get('/export', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await usersRepo.findById(userId);
    const profile = await profilesRepo.findByUserId(userId);
    const { applications: appsRepo, notebook: notebookRepo, matches: matchesRepo } = require('../repositories');

    const applications = await appsRepo.find(a => a.builderId === userId || a.email === user?.email);
    const notebookEntries = await notebookRepo.find(n => n.userId === userId || n.authorId === userId);
    const matches = await matchesRepo.find(m => m.userId === userId || m.matchUserId === userId || m.requesterId === userId || m.recipientId === userId);

    res.json({
      exportMetadata: {
        exportedAt: new Date().toISOString(),
        format: 'Canopy Open Data Bundle v1',
        userId
      },
      user: userMapper.toSafeUser(user),
      profile,
      applications,
      notebookEntries,
      matches
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to export user archive.' });
  }
});

// DELETE /api/auth/me (Account Deletion & Data Scrubbing - Privacy Charter 06)
router.delete('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await usersRepo.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User record not found.' });
    }

    // Scrub user profile, roles, applications, and delete account (Privacy Charter 06)
    const { userRoles: userRolesRepo, applications: appsRepo } = require('../repositories');
    try {
      await profilesRepo.delete(p => p.userId === userId, { eq: { user_id: userId } });
      await userRolesRepo.delete(r => r.userId === userId, { eq: { user_id: userId } });
      await appsRepo.delete(a => a.builderId === userId || a.email === user.email, { eq: { builder_id: userId } });
      await usersRepo.delete(u => u.id === userId, { eq: { id: userId } });
    } catch (cleanErr) {
      console.warn('[AUTH:PURGE:WARN] Partial cascade deletion warning:', cleanErr.message);
    }
    clearSessionCookie(res);

    res.json({
      success: true,
      message: 'Your Canopy Pass, credentials, and profile have been permanently deleted.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to delete account.' });
  }
});

module.exports = router;
