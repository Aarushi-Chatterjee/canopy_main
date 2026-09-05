const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { users: usersRepo, profiles: profilesRepo } = require('../repositories');
const { user: userMapper } = require('../mappers');
const { generateToken, setSessionCookie, clearSessionCookie, optionalAuth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rate-limit');
const emailService = require('../services/email');

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
      verificationToken: token,
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

    await usersRepo.create(newUser);
    await profilesRepo.create(newProfile);

    // Dispatch verification code via Email Service (no token leak in response payload)
    await emailService.sendVerificationCode(newUser.email, token);

    const sessionToken = generateToken(newUser);
    setSessionCookie(res, sessionToken);

    res.status(201).json({
      user: userMapper.toSafeUser(newUser),
      profile: newProfile,
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
    if (!user.verificationToken || submittedToken !== String(user.verificationToken).trim()) {
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
        verificationToken: newToken,
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

    const profile = await profilesRepo.findByUserId(user.id);
    const sessionToken = generateToken(user);
    setSessionCookie(res, sessionToken);

    res.json({
      user: userMapper.toSafeUser(user),
      profile
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Login failed.' });
  }
});

// POST /api/auth/reset-password-request (Account-enumeration resistant)
router.post('/reset-password-request', authLimiter, async (req, res) => {
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
          resetToken,
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
router.post('/reset-password-confirm', authLimiter, async (req, res) => {
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

    if (String(user.resetToken).trim() !== String(token).trim()) {
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
      const access = {
        status: user?.isVerified ? 'access_approved' : 'email_pending',
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

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  res.json({ success: true, message: 'Signed out successfully.' });
});

module.exports = router;
