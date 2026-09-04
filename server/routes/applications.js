const express = require('express');
const router = express.Router();
const { store } = require('../data/store');

// POST /api/applications
router.post('/', (req, res) => {
  const {
    fullName,
    email,
    role = 'Builder',
    domain = 'Climate',
    proofOfWorkLink,
    motivationNote
  } = req.body;

  if (!fullName || !email || !email.includes('@')) {
    return res.status(400).json({ error: 'Full name and valid email are required.' });
  }

  const appId = 'app_' + Date.now();
  const newApp = {
    id: appId,
    fullName,
    email: email.toLowerCase(),
    role,
    domain,
    proofOfWorkLink: proofOfWorkLink || '',
    motivationNote: motivationNote || '',
    status: 'verified', // Verified automatically in sandbox
    submittedAt: new Date().toISOString()
  };

  store.addItem('applications', newApp);

  // Sync with user profile if not exists
  let user = store.getItem('users', u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    const userId = 'usr_' + Date.now();
    user = {
      id: userId,
      email: email.toLowerCase(),
      role: role.toLowerCase().replace(' ', '_'),
      displayName: fullName,
      is_verified: true,
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString()
    };
    store.addItem('users', user);

    const profile = {
      userId,
      displayName: fullName,
      headline: `${role} at Canopy`,
      bio: motivationNote,
      primaryDomain: domain.toLowerCase(),
      skillTags: [domain, role],
      avatarUrl: role.toLowerCase().includes('problem') 
        ? '/avatars/avatar-problem-holders.png' 
        : role.toLowerCase().includes('enabler') 
          ? '/avatars/avatar-enablers.png' 
          : '/avatars/avatar-builders.png',
      hoursPerWeek: 10,
      proofOfWork: proofOfWorkLink ? [{ title: 'Portfolio', url: proofOfWorkLink }] : []
    };
    store.addItem('profiles', profile);
  }

  res.status(201).json({
    application: newApp,
    message: '🌱 Application planted! Verified profile generated for Match Sandbox.'
  });
});

// GET /api/applications
router.get('/', (req, res) => {
  const applications = store.getCollection('applications');
  res.json({
    applications,
    total: applications.length
  });
});

module.exports = router;
