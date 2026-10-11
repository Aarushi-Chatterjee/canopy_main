const express = require('express');
const router = express.Router();
const { sprints: sprintsRepo, buildCalls: callsRepo } = require('../repositories');
const { requireAuth, optionalAuth } = require('../middleware/auth');

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

// GET /api/sprints/my/applications - Outbound & Inbound Sprint Applications
router.get('/my/applications', optionalAuth, async (req, res) => {
  try {
    const currentUserId = req.user?.id || 'usr_current_user';
    const allSprints = await sprintsRepo.find();

    const sent = [];
    const received = [];

    allSprints.forEach(sprint => {
      const apps = Array.isArray(sprint.applications) ? sprint.applications : [];
      apps.forEach(app => {
        const appEnriched = {
          ...app,
          sprintTitle: sprint.title,
          domain: sprint.domain,
          targetDeliverable: sprint.targetDeliverable,
          creatorId: sprint.creatorId,
          leadAuthor: sprint.leadAuthor || sprint.members?.[0]?.displayName || 'Sprint Lead'
        };

        if (app.applicantId === currentUserId || (!req.user && app.isLocalGuest)) {
          sent.push(appEnriched);
        }

        if (sprint.creatorId === currentUserId || (!req.user && sprint.isIllustrative)) {
          received.push(appEnriched);
        }
      });
    });

    res.json({
      sent,
      received,
      total: sent.length + received.length
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to query sprint applications.' });
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

// POST /api/sprints - Post What You're Working On (Rich Collection Points)
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      buildCallId,
      callId,
      title,
      description,
      problemStatement,
      targetDeliverable,
      milestoneMetric,
      leadAuthor,
      contactChannel,
      domain = 'climate',
      teamCapacity = 3,
      startDate,
      durationDays,
      cycleDuration = 21,
      neededRoles,
      referenceUrl
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Problem / Project Title is required.' });
    }

    const duration = parseInt(durationDays || cycleDuration, 10) || 21;
    const capacity = parseInt(teamCapacity, 10) || 3;
    const creatorId = req.user?.id || 'usr_lead_' + Date.now().toString(36);
    const creatorName = leadAuthor || req.user?.displayName || req.user?.email || 'Sprint Lead';
    const sprintId = 'sp_' + Date.now();
    const start = startDate ? new Date(startDate) : new Date();
    const end = new Date(start.getTime() + duration * 24 * 60 * 60 * 1000);

    const rolesList = Array.isArray(neededRoles)
      ? neededRoles
      : (typeof neededRoles === 'string' && neededRoles.trim()
          ? neededRoles.split(',').map(r => r.trim()).filter(Boolean)
          : ['Technical Contributor']);

    const newSprint = {
      id: sprintId,
      creatorId,
      callId: buildCallId || callId || null,
      title: title.trim(),
      description: (problemStatement || description || 'Sprint formed to ship a concrete prototype.').trim(),
      problemStatement: (problemStatement || description || '').trim(),
      targetDeliverable: (targetDeliverable || 'Working Prototype and Documentation').trim(),
      milestoneMetric: (milestoneMetric || '').trim(),
      leadAuthor: creatorName,
      contactChannel: (contactChannel || '').trim(),
      domain: domain.toLowerCase(),
      stage: 'forming',
      status: 'planning',
      teamCapacity: capacity,
      cycleDuration: duration,
      referenceUrl: (referenceUrl || '').trim(),
      participants: [{
        userId: creatorId,
        role: 'Sprint Lead',
        displayName: creatorName,
        joinedAt: new Date().toISOString()
      }],
      members: [{
        userId: creatorId,
        squadRole: 'Sprint Lead',
        displayName: creatorName,
        joinedAt: new Date().toISOString()
      }],
      applications: [],
      neededRoles: rolesList.length ? rolesList : ['Technical Contributor'],
      skillTags: Array.isArray(req.body.skillTags) ? req.body.skillTags : rolesList,
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
      startedAt: start.toISOString(),
      daysTotal: duration,
      daysLeft: duration,
      progressPct: 0,
      statusHint: `1 of ${capacity} spots filled`,
      createdAt: new Date().toISOString()
    };

    const saved = await sprintsRepo.create(newSprint);

    res.status(201).json({
      sprint: saved,
      message: '🌱 Working squad launched in Forming stage.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to create sprint.' });
  }
});

// POST /api/sprints/:id/join - Plant this note (Apply to Squad)
router.post('/:id/join', optionalAuth, async (req, res) => {
  try {
    const userId = req.user?.id || 'usr_builder_' + Date.now().toString(36);
    const displayName = req.user?.displayName || req.body.applicantName || req.user?.email || 'Anonymous Builder';
    const squadRole = req.body.squadRole || req.body.role || 'Technical Contributor';
    const note = (req.body.note || req.body.pitch || '').trim();
    const skills = Array.isArray(req.body.skills) ? req.body.skills : [squadRole];
    const availability = req.body.availability || 'Full sprint (2–4 weeks)';
    const portfolioUrl = (req.body.portfolioUrl || req.body.link || '').trim();

    const sprint = await sprintsRepo.findById(req.params.id);
    if (!sprint) {
      return res.status(404).json({ error: 'Sprint not found.' });
    }

    const members = sprint.members || sprint.participants || [];
    if (members.some(m => m.userId === userId)) {
      return res.status(409).json({ error: 'You are already an active member of this sprint squad.' });
    }

    const capacity = sprint.teamCapacity || 3;
    const existingApps = Array.isArray(sprint.applications) ? sprint.applications : [];

    const appId = 'app_sp_' + Date.now();
    const newApplication = {
      id: appId,
      sprintId: sprint.id,
      sprintTitle: sprint.title,
      applicantId: userId,
      applicantName: displayName,
      applicantEmail: req.user?.email || req.body.email || 'collaborator@canopy.earth',
      role: squadRole,
      note,
      skills,
      availability,
      portfolioUrl,
      status: 'pending_review',
      isLocalGuest: !req.user,
      createdAt: new Date().toISOString()
    };

    const updatedApps = [...existingApps, newApplication];

    const updated = await sprintsRepo.update(
      s => s.id === req.params.id,
      { applications: updatedApps },
      { eq: { id: req.params.id } }
    );

    res.status(201).json({
      application: newApplication,
      sprint: updated,
      message: `🌱 Note planted! Awaiting squad lead review for "${sprint.title}".`
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to plant note.' });
  }
});

// PATCH /api/sprints/applications/:appId/accept - Accept Note / Squad Request
router.patch('/applications/:appId/accept', optionalAuth, async (req, res) => {
  try {
    const { appId } = req.params;
    const allSprints = await sprintsRepo.find();

    let targetSprint = null;
    let targetApp = null;

    for (const sprint of allSprints) {
      const apps = Array.isArray(sprint.applications) ? sprint.applications : [];
      const found = apps.find(a => a.id === appId);
      if (found) {
        targetSprint = sprint;
        targetApp = found;
        break;
      }
    }

    if (!targetSprint || !targetApp) {
      return res.status(404).json({ error: 'Application record not found.' });
    }

    // Update application status
    const updatedApps = targetSprint.applications.map(a => 
      a.id === appId ? { ...a, status: 'accepted', acceptedAt: new Date().toISOString() } : a
    );

    // Add applicant to members if not already member
    const members = targetSprint.members || targetSprint.participants || [];
    const capacity = targetSprint.teamCapacity || 3;
    let updatedMembers = [...members];

    if (!members.some(m => m.userId === targetApp.applicantId)) {
      updatedMembers.push({
        userId: targetApp.applicantId,
        squadRole: targetApp.role,
        role: targetApp.role,
        displayName: targetApp.applicantName,
        joinedAt: new Date().toISOString()
      });
    }

    const isFull = updatedMembers.length >= capacity;
    const newStage = isFull && (targetSprint.stage === 'forming' || targetSprint.status === 'planning') ? 'building' : targetSprint.stage;
    const statusHint = isFull 
      ? 'team locked for this cycle' 
      : `${updatedMembers.length} of ${capacity} spots filled`;

    const updatedSprint = await sprintsRepo.update(
      s => s.id === targetSprint.id,
      {
        applications: updatedApps,
        members: updatedMembers,
        participants: updatedMembers,
        stage: newStage,
        status: newStage === 'building' ? 'active' : targetSprint.status,
        statusHint
      },
      { eq: { id: targetSprint.id } }
    );

    res.json({
      application: { ...targetApp, status: 'accepted' },
      sprint: updatedSprint,
      revealedContact: targetSprint.contactChannel || 'squad-chat@canopy.internal',
      message: `✓ Collaborator accepted! Added ${targetApp.applicantName} (${targetApp.role}) to squad.`
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to accept application.' });
  }
});

// PATCH /api/sprints/applications/:appId/decline - Decline Squad Request
router.patch('/applications/:appId/decline', optionalAuth, async (req, res) => {
  try {
    const { appId } = req.params;
    const allSprints = await sprintsRepo.find();

    let targetSprint = null;
    let targetApp = null;

    for (const sprint of allSprints) {
      const apps = Array.isArray(sprint.applications) ? sprint.applications : [];
      const found = apps.find(a => a.id === appId);
      if (found) {
        targetSprint = sprint;
        targetApp = found;
        break;
      }
    }

    if (!targetSprint || !targetApp) {
      return res.status(404).json({ error: 'Application record not found.' });
    }

    const updatedApps = targetSprint.applications.map(a => 
      a.id === appId ? { ...a, status: 'declined', declinedAt: new Date().toISOString() } : a
    );

    await sprintsRepo.update(
      s => s.id === targetSprint.id,
      { applications: updatedApps },
      { eq: { id: targetSprint.id } }
    );

    res.json({
      application: { ...targetApp, status: 'declined' },
      message: 'Application declined.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to decline application.' });
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
    const isAdmin = (req.user.roles || []).some(r => ['admin', 'owner', 'moderator'].includes(r)) || req.user.role === 'admin' || req.user.role === 'moderator';

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
