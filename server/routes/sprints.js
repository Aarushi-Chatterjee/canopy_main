const express = require('express');
const router = express.Router();
const { store } = require('../data/store');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// GET /api/sprints
router.get('/', (req, res) => {
  const { domain } = req.query;
  let allSprints = store.getCollection('sprints');

  if (domain) {
    allSprints = allSprints.filter(s => s.domain.toLowerCase() === domain.toLowerCase());
  }

  // Calculate remaining days and progress percentage dynamically
  const enriched = allSprints.map(sprint => {
    let daysLeft = sprint.daysLeft;
    let progressPct = sprint.progressPct;

    if (sprint.endDate && sprint.stage === 'building') {
      const end = new Date(sprint.endDate).getTime();
      const start = new Date(sprint.startDate || sprint.createdAt).getTime();
      const now = Date.now();
      const totalDays = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)));
      const remainingDays = Math.max(0, Math.round((end - now) / (1000 * 60 * 60 * 24)));
      daysLeft = remainingDays;
      progressPct = Math.min(100, Math.max(0, Math.round(((totalDays - remainingDays) / totalDays) * 100)));
    }

    return {
      ...sprint,
      daysLeft,
      progressPct
    };
  });

  const board = {
    forming: enriched.filter(s => s.stage === 'forming'),
    building: enriched.filter(s => s.stage === 'building'),
    shipped: enriched.filter(s => s.stage === 'shipped'),
    totalSprints: enriched.length,
    activeCycleDaysLeft: 12
  };

  res.json(board);
});

// GET /api/sprints/:id
router.get('/:id', (req, res) => {
  const sprint = store.getItem('sprints', s => s.id === req.params.id);
  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found.' });
  }

  const call = sprint.buildCallId ? store.getItem('build_calls', c => c.id === sprint.buildCallId) : null;

  res.json({
    sprint,
    call
  });
});

// POST /api/sprints
router.post('/', requireAuth, (req, res) => {
  const { buildCallId, title, description, domain, teamCapacity = 3, startDate, durationDays = 14 } = req.body;

  if (!title || !domain) {
    return res.status(400).json({ error: 'Sprint title and domain are required.' });
  }

  const sprintId = 'sp_' + Date.now();
  const start = startDate ? new Date(startDate) : new Date();
  const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);

  const newSprint = {
    id: sprintId,
    creatorId: req.user.id,
    buildCallId: buildCallId || null,
    title,
    description: description || 'Sprint formed to ship a concrete prototype.',
    domain,
    stage: 'forming',
    teamCapacity: parseInt(teamCapacity, 10) || 3,
    members: [{
      userId: req.user.id,
      squadRole: 'Sprint Lead',
      displayName: req.user.name || req.user.email,
      joinedAt: new Date().toISOString()
    }],
    skillTags: [domain],
    startDate: start.toISOString().split('T')[0],
    endDate: end.toISOString().split('T')[0],
    daysTotal: durationDays,
    daysLeft: durationDays,
    progressPct: 0,
    statusHint: '1 of ' + teamCapacity + ' spots filled',
    createdAt: new Date().toISOString()
  };

  store.addItem('sprints', newSprint);

  res.status(201).json({
    sprint: newSprint,
    message: 'Sprint created in Forming stage.'
  });
});

// POST /api/sprints/:id/join ("Grab a Shovel")
router.post('/:id/join', requireAuth, (req, res) => {
  const userId = req.user.id;
  const displayName = req.user.name || req.user.email;
  const squadRole = req.body.squadRole || 'Technical Contributor';

  const sprint = store.getItem('sprints', s => s.id === req.params.id);
  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found.' });
  }

  if (sprint.members && sprint.members.some(m => m.userId === userId)) {
    return res.status(409).json({ error: 'You are already a member of this sprint squad.' });
  }

  if (sprint.members && sprint.members.length >= sprint.teamCapacity) {
    return res.status(400).json({ error: 'Sprint squad capacity has been reached for this cycle.' });
  }

  const updatedMembers = [...(sprint.members || []), {
    userId,
    squadRole,
    displayName,
    joinedAt: new Date().toISOString()
  }];

  const isFull = updatedMembers.length >= sprint.teamCapacity;
  const newStage = isFull && sprint.stage === 'forming' ? 'building' : sprint.stage;
  const statusHint = isFull 
    ? 'team locked for this cycle' 
    : `${updatedMembers.length} of ${sprint.teamCapacity} spots filled`;

  const updated = store.updateItem('sprints', s => s.id === req.params.id, {
    members: updatedMembers,
    stage: newStage,
    statusHint
  });

  res.json({
    sprint: updated,
    message: `🌱 Seat secured! You joined the sprint as ${squadRole}.`
  });
});

// POST /api/sprints/:id/notify
router.post('/:id/notify', (req, res) => {
  const { email = 'collaborator@canopy.earth' } = req.body;
  const sprint = store.getItem('sprints', s => s.id === req.params.id);
  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found.' });
  }

  res.json({
    success: true,
    message: `🔔 Subscribed! You will receive an invitation when the next sprint cycle opens for "${sprint.title}".`
  });
});

// PATCH /api/sprints/:id/stage
router.patch('/:id/stage', requireAuth, (req, res) => {
  const { stage, shippedArtifactUrl } = req.body;

  if (!['forming', 'building', 'shipped'].includes(stage)) {
    return res.status(400).json({ error: 'Invalid stage. Allowed: forming, building, shipped.' });
  }

  const sprint = store.getItem('sprints', s => s.id === req.params.id);
  if (!sprint) {
    return res.status(404).json({ error: 'Sprint not found.' });
  }

  const isMember = sprint.members && sprint.members.some(m => m.userId === req.user.id);
  const isCreator = sprint.creatorId === req.user.id;
  const isAdmin = req.user.role === 'admin';

  if (!isMember && !isCreator && !isAdmin) {
    return res.status(403).json({ error: 'Only squad members, the sprint creator, or an administrator can transition sprint stages.' });
  }

  const updates = { stage };
  if (stage === 'shipped') {
    updates.shippedArtifactUrl = shippedArtifactUrl || 'https://github.com/canopy-earth/prototype';
    updates.statusHint = 'shipped to Library';
    updates.progressPct = 100;
    updates.daysLeft = 0;
  }

  const updated = store.updateItem('sprints', s => s.id === req.params.id, updates);

  res.json({
    sprint: updated,
    message: `Sprint stage transitioned to ${stage}.`
  });
});

module.exports = router;
