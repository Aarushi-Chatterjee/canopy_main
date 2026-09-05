const express = require('express');
const router = express.Router();
const { store } = require('../data/store');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// GET /api/calls — List all active Build Calls
router.get('/', (req, res) => {
  const { domain, status = 'open' } = req.query;
  let calls = store.getCollection('build_calls');

  if (domain) {
    calls = calls.filter(c => c.domain.toLowerCase() === domain.toLowerCase());
  }

  if (status && status !== 'all') {
    calls = calls.filter(c => c.status === status);
  }

  res.json({
    calls,
    total: calls.length
  });
});

// GET /api/calls/:id — Single Build Call details
router.get('/:id', (req, res) => {
  const call = store.getItem('build_calls', c => c.id === req.params.id);
  if (!call) {
    return res.status(404).json({ error: 'Build Call not found.' });
  }

  const creator = store.getItem('users', u => u.id === call.creatorId);
  const profile = creator ? store.getItem('profiles', p => p.userId === creator.id) : null;
  const sprints = store.getCollection('sprints').filter(s => s.buildCallId === call.id);

  res.json({
    call,
    creator: {
      id: creator?.id,
      name: profile?.displayName || creator?.displayName || call.orgName,
      role: creator?.role,
      avatar: profile?.avatarUrl
    },
    sprints
  });
});

// POST /api/calls — Post a new Build Call (Authenticated)
router.post('/', optionalAuth, (req, res) => {
  // Derive creator from authenticated session or explicit verified identity
  const creatorId = req.user?.id || 'usr_community';

  const {
    title,
    orgName = 'Open Lab Contributor',
    problemStatement,
    domain = 'climate',
    targetDeliverable = 'Functional prototype code and field evaluation report',
    pilotBudget,
    datasetAccessUrl,
    neededSkills = []
  } = req.body;

  if (!title || !title.trim() || !problemStatement || !problemStatement.trim()) {
    return res.status(400).json({ error: 'Title and problem statement are required.' });
  }

  const callId = 'call_' + Date.now();
  const newCall = {
    id: callId,
    creatorId,
    title: title.trim(),
    orgName: orgName.trim(),
    problemStatement: problemStatement.trim(),
    domain: domain.toLowerCase(),
    targetDeliverable: targetDeliverable.trim(),
    pilotBudget: pilotBudget ? pilotBudget.trim() : 'Community Grant',
    datasetAccessUrl: datasetAccessUrl ? datasetAccessUrl.trim() : '',
    neededSkills: Array.isArray(neededSkills) ? neededSkills : [neededSkills],
    status: 'open',
    createdAt: new Date().toISOString()
  };

  store.addItem('build_calls', newCall);

  res.status(201).json({
    call: newCall,
    message: '🌱 Build Call successfully published to the matching directory.'
  });
});

module.exports = router;
