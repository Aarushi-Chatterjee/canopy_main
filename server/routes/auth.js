const express = require('express');
const router = express.Router();
const { store } = require('../data/store');

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { email, password, role = 'builder', displayName } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }

  const existing = store.getItem('users', u => u.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  const token = Math.random().toString(36).substring(2, 8).toUpperCase();
  const userId = 'usr_' + Date.now();
  const name = displayName || email.split('@')[0];

  const newUser = {
    id: userId,
    email: email.toLowerCase(),
    role: ['builder', 'problem_holder', 'enabler'].includes(role) ? role : 'builder',
    displayName: name,
    is_verified: false,
    verification_token: token,
    created_at: new Date().toISOString()
  };

  const newProfile = {
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

  store.addItem('users', newUser);
  store.addItem('profiles', newProfile);

  res.status(201).json({
    user: newUser,
    profile: newProfile,
    sessionToken: 'sess_' + Buffer.from(userId + ':' + Date.now()).toString('base64'),
    verificationNotice: `Verification token issued for ${email}: ${token}. Enter this code to verify your Field Station Pass.`
  });
});

// POST /api/auth/verify
router.post('/verify', (req, res) => {
  const { email, token } = req.body;

  if (!email || !token) {
    return res.status(400).json({ error: 'Email and verification code are required.' });
  }

  const user = store.getItem('users', u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: 'User record not found.' });
  }

  // Accept actual token or demo bypass code '123456'
  if (token.toUpperCase() === (user.verification_token || '').toUpperCase() || token === '123456') {
    const updated = store.updateItem('users', u => u.id === user.id, {
      is_verified: true,
      verified_at: new Date().toISOString()
    });
    const profile = store.getItem('profiles', p => p.userId === user.id);

    return res.json({
      user: updated,
      profile,
      sessionToken: 'sess_' + Buffer.from(user.id + ':' + Date.now()).toString('base64'),
      message: 'Field Station Pass successfully verified.'
    });
  }

  return res.status(400).json({ error: 'Invalid verification token.' });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  let user = store.getItem('users', u => u.email.toLowerCase() === email.toLowerCase());
  let profile = user ? store.getItem('profiles', p => p.userId === user.id) : null;

  // Auto-provision demo account for testing ease if not found
  if (!user) {
    const userId = 'usr_' + Date.now();
    const name = email.split('@')[0];
    user = {
      id: userId,
      email: email.toLowerCase(),
      role: 'builder',
      displayName: name,
      is_verified: true,
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    profile = {
      userId,
      displayName: name,
      headline: 'Builder at Canopy',
      bio: 'Collaborative builder profile.',
      primaryDomain: 'climate',
      skillTags: ['Full-stack'],
      avatarUrl: '/avatars/avatar-builders.png',
      hoursPerWeek: 10,
      proofOfWork: []
    };
    store.addItem('users', user);
    store.addItem('profiles', profile);
  }

  res.json({
    user,
    profile,
    sessionToken: 'sess_' + Buffer.from(user.id + ':' + Date.now()).toString('base64')
  });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // Default fallback to first verified user for sandbox browsing
    const fallbackUser = store.getItem('users', u => u.id === 'usr_elena');
    const fallbackProfile = store.getItem('profiles', p => p.userId === 'usr_elena');
    return res.json({ user: fallbackUser, profile: fallbackProfile, isGuest: true });
  }

  const rawToken = authHeader.replace('Bearer ', '');
  try {
    const decoded = Buffer.from(rawToken.replace('sess_', ''), 'base64').toString('utf-8');
    const [userId] = decoded.split(':');
    const user = store.getItem('users', u => u.id === userId);
    const profile = user ? store.getItem('profiles', p => p.userId === user.id) : null;

    if (!user) {
      return res.status(401).json({ error: 'Session expired or user not found.' });
    }

    res.json({ user, profile, isGuest: false });
  } catch (err) {
    res.status(401).json({ error: 'Malformed authorization token.' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ success: true, message: 'Signed out successfully.' });
});

module.exports = router;
