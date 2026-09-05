const express = require('express');
const router = express.Router();
const { store } = require('../data/store');
const { requireAdmin, optionalAuth } = require('../middleware/auth');

// POST /api/applications — Public intake form
router.post('/', optionalAuth, (req, res) => {
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
    fullName: fullName.trim(),
    email: email.toLowerCase().trim(),
    role,
    domain,
    proofOfWorkLink: proofOfWorkLink ? proofOfWorkLink.trim() : '',
    motivationNote: motivationNote ? motivationNote.trim() : '',
    status: 'pending_review',
    submittedAt: new Date().toISOString()
  };

  store.addItem('applications', newApp);

  // Return truthful confirmation without fake automatic verification
  res.status(201).json({
    application: {
      id: newApp.id,
      status: newApp.status,
      submittedAt: newApp.submittedAt
    },
    message: '🌱 Application received! Our team reviews submissions on a rolling basis.'
  });
});

// GET /api/applications — Protected Admin Intake Queue (PII Protection)
router.get('/', requireAdmin, (req, res) => {
  const applications = store.getCollection('applications');
  res.json({
    applications,
    total: applications.length
  });
});

module.exports = router;
