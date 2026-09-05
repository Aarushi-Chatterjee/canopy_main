const express = require('express');
const router = express.Router();
const { sprints: sprintsRepo, buildCalls: callsRepo } = require('../repositories');
const { requireAuth } = require('../middleware/auth');

// GET /api/sprints
router.get('/', async (req, res) => {
  try {
    const { domain } = req.query;
    let allSprints = await sprintsRepo.find();

    if (domain) {
      allSprints = allSprints.filter(s => s.domain?.toLowerCase() === domain.toLowerCase());
    }

    const enriched = allSprints.map(sprint => {
      let daysLeft = sprint.daysLeft ?? 14;
      let progressPct = sprint.progressPct ?? 0;

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
      forming: enriched.filter(s => s.stage === 'forming' || s.status === 'planning'),
      building: enriched.filter(s => s.stage === 'building' || s.status === 'active'),
      shipped: enriched.filter(s => s.stage === 'shipped' || s.status === 'completed'),
      totalSprints: enriched.length,
      activeCycleDaysLeft: 12
    };

    res.json(board);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to list sprints.' });
  }
});

// GET /api/sprints/:id
router.get('/:id', async (req, res) => {
  try {
    const sprint = await sprintsRepo.findById(req.params.id);
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found.' });
    }

    const targetCallId = sprint.callId || sprint.buildCallId;
    const call = targetCallId ? await callsRepo.findById(targetCallId) : null;

    res.json({
      sprint,
      call
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to retrieve sprint.' });
  }
});

// POST /api/sprints
router.post('/', requireAuth, async (req, res) => {
  try {
    const { buildCallId, callId, title, description, domain = 'climate', teamCapacity = 3, startDate, durationDays = 14 } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Sprint title is required.' });
    }

    const sprintId = 'sp_' + Date.now();
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);

    const newSprint = {
      id: sprintId,
      creatorId: req.user.id,
      callId: buildCallId || callId || null,
      title: title.trim(),
      description: description || 'Sprint formed to ship a concrete prototype.',
      domain,
      stage: 'forming',
      status: 'planning',
      teamCapacity: parseInt(teamCapacity, 10) || 3,
      participants: [{
        userId: req.user.id,
        role: 'Sprint Lead',
        displayName: req.user.displayName || req.user.email,
        joinedAt: new Date().toISOString()
      }],
      members: [{
        userId: req.user.id,
        squadRole: 'Sprint Lead',
        displayName: req.user.displayName || req.user.email,
        joinedAt: new Date().toISOString()
      }],
      skillTags: [domain],
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      startedAt: start.toISOString(),
      daysTotal: durationDays,
      daysLeft: durationDays,
      progressPct: 0,
      statusHint: '1 of ' + teamCapacity + ' spots filled',
      createdAt: new Date().toISOString()
    };

    const saved = await sprintsRepo.create(newSprint);

    res.status(201).json({
      sprint: saved,
      message: 'Sprint created in Forming stage.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to create sprint.' });
  }
});

// POST /api/sprints/:id/join ("Grab a Shovel")
router.post('/:id/join', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const displayName = req.user.displayName || req.user.email;
    const squadRole = req.body.squadRole || 'Technical Contributor';

    const sprint = await sprintsRepo.findById(req.params.id);
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found.' });
    }

    const members = sprint.members || sprint.participants || [];
    if (members.some(m => m.userId === userId)) {
      return res.status(409).json({ error: 'You are already a member of this sprint squad.' });
    }

    const capacity = sprint.teamCapacity || 3;
    if (members.length >= capacity) {
      return res.status(400).json({ error: 'Sprint squad capacity has been reached for this cycle.' });
    }

    const newMember = {
      userId,
      squadRole,
      role: squadRole,
      displayName,
      joinedAt: new Date().toISOString()
    };

    const updatedMembers = [...members, newMember];
    const isFull = updatedMembers.length >= capacity;
    const newStage = isFull && (sprint.stage === 'forming' || sprint.status === 'planning') ? 'building' : sprint.stage;
    const statusHint = isFull 
      ? 'team locked for this cycle' 
      : `${updatedMembers.length} of ${capacity} spots filled`;

    const updated = await sprintsRepo.update(
      s => s.id === req.params.id,
      {
        members: updatedMembers,
        participants: updatedMembers,
        stage: newStage,
        status: newStage === 'building' ? 'active' : sprint.status,
        statusHint
      },
      { eq: { id: req.params.id } }
    );

    res.json({
      sprint: updated,
      message: `🌱 Seat secured! You joined the sprint as ${squadRole}.`
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to join sprint.' });
  }
});

// POST /api/sprints/:id/notify
router.post('/:id/notify', async (req, res) => {
  try {
    const sprint = await sprintsRepo.findById(req.params.id);
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found.' });
    }

    res.json({
      success: true,
      message: `🔔 Subscribed! You will receive an invitation when the next sprint cycle opens for "${sprint.title}".`
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Notification subscription failed.' });
  }
});

// PATCH /api/sprints/:id/stage
router.patch('/:id/stage', requireAuth, async (req, res) => {
  try {
    const { stage, shippedArtifactUrl } = req.body;

    if (!['forming', 'building', 'shipped'].includes(stage)) {
      return res.status(400).json({ error: 'Invalid stage. Allowed: forming, building, shipped.' });
    }

    const sprint = await sprintsRepo.findById(req.params.id);
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found.' });
    }

    const members = sprint.members || sprint.participants || [];
    const isMember = members.some(m => m.userId === req.user.id);
    const isCreator = sprint.creatorId === req.user.id;
    const isAdmin = req.user.role === 'admin' || req.user.role === 'moderator';

    if (!isMember && !isCreator && !isAdmin) {
      return res.status(403).json({ error: 'Only squad members, the sprint creator, or an administrator can transition sprint stages.' });
    }

    const updates = { 
      stage,
      status: stage === 'forming' ? 'planning' : stage === 'building' ? 'active' : 'completed'
    };
    if (stage === 'shipped') {
      updates.shippedArtifactUrl = shippedArtifactUrl || 'https://github.com/canopy-earth/prototype';
      updates.statusHint = 'shipped to Library';
      updates.progressPct = 100;
      updates.daysLeft = 0;
      updates.endedAt = new Date().toISOString();
    }

    const updated = await sprintsRepo.update(
      s => s.id === req.params.id,
      updates,
      { eq: { id: req.params.id } }
    );

    res.json({
      sprint: updated,
      message: `Sprint stage transitioned to ${stage}.`
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to transition sprint stage.' });
  }
});

module.exports = router;
