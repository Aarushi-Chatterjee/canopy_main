const express = require('express');
const router = express.Router();
const { store } = require('../data/store');

// GET /api/calls
router.get('/', (req, res) => {
  const { domain, status } = req.query;
  let calls = store.getCollection('build_calls');

  if (domain) {
    calls = calls.filter(c => c.domain.toLowerCase() === domain.toLowerCase());
  }

  if (status) {
    calls = calls.filter(c => c.status === status);
  }

  res.json({
    calls,
    total: calls.length
  });
});

// GET /api/calls/:id
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
      name: profile?.displayName || creator?.displayName || call.orgName,
      role: creator?.role,
      avatar: profile?.avatarUrl
    },
    sprints
  });
});

// POST /api/calls
router.post('/', (req, res) => {
  const {
    creatorId = 'usr_elena',
    title,
    orgName = 'Independent Builder',
    problemStatement,
    domain = 'climate',
    targetDeliverable = 'Functional prototype code and field evaluation report',
    pilotBudget,
    datasetAccessUrl,
    neededSkills = []
  } = req.body;

  if (!title || !problemStatement) {
    return res.status(400).json({ error: 'Title and problem statement are required.' });
  }

  const callId = 'call_' + Date.now();
  const newCall = {
    id: callId,
    creatorId,
    title,
    orgName,
    problemStatement,
    domain: domain.toLowerCase(),
    targetDeliverable,
    pilotBudget: pilotBudget || 'Community Supported',
    datasetAccessUrl: datasetAccessUrl || '',
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
