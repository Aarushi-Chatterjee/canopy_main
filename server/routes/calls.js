const express = require('express');
const router = express.Router();
const { buildCalls: callsRepo, users: usersRepo, profiles: profilesRepo, moderationQueue: modRepo, auditEvents: auditRepo } = require('../repositories');
const { requireAuth } = require('../middleware/auth');

// GET /api/calls — List active Build Calls
router.get('/', async (req, res) => {
  try {
    const { domain, status = 'open' } = req.query;
    const calls = await callsRepo.find(c => {
      if (domain && c.domain?.toLowerCase() !== domain.toLowerCase()) return false;
      if (status && status !== 'all' && c.status !== status) return false;
      return true;
    });

    res.json({
      calls,
      total: calls.length
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to list build calls.' });
  }
});

// GET /api/calls/:id — Single Build Call details
router.get('/:id', async (req, res) => {
  try {
    const call = await callsRepo.findById(req.params.id);
    if (!call) {
      return res.status(404).json({ error: 'Build Call not found.' });
    }

    const creator = call.createdBy ? await usersRepo.findById(call.createdBy) : null;
    const profile = creator ? await profilesRepo.findByUserId(creator.id) : null;

    res.json({
      call,
      creator: {
        id: creator?.id,
        name: profile?.displayName || creator?.displayName || call.organization || 'Field Contributor',
        role: creator?.role,
        avatar: profile?.avatarUrl
      }
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to retrieve build call.' });
  }
});

// POST /api/calls — Submit a new Build Call (Strictly Authenticated)
router.post('/', requireAuth, async (req, res) => {
  try {
    const creatorId = req.user.id;
    const {
      title,
      organization = 'Open Lab Contributor',
      orgName,
      problemStatement,
      domain = 'climate',
      targetDeliverable = 'Functional prototype code and field evaluation report',
      targetOutcomes,
      timeline = '6 weeks',
      rewardPool = 'Community Grant',
      pilotBudget,
      contactChannel = '',
      datasetAccessUrl = '',
      neededSkills = []
    } = req.body;

    const finalTitle = (title || '').trim();
    const finalProblem = (problemStatement || '').trim();

    if (!finalTitle || !finalProblem) {
      return res.status(400).json({ error: 'Title and problem statement are required.' });
    }

    const callId = 'call_' + Date.now();
    const newCall = {
      id: callId,
      createdBy: creatorId,
      title: finalTitle,
      organization: (orgName || organization).trim(),
      problemStatement: finalProblem,
      domain: domain.toLowerCase(),
      targetOutcomes: Array.isArray(targetOutcomes) ? targetOutcomes : [targetDeliverable.trim()],
      timeline: timeline.trim(),
      rewardPool: (pilotBudget || rewardPool).trim(),
      contactChannel: (contactChannel || datasetAccessUrl).trim(),
      status: 'pending_review', // Strictly queued for review, not immediately public
      createdAt: new Date().toISOString()
    };

    const savedCall = await callsRepo.create(newCall);

    // Enqueue in moderation queue
    await modRepo.create({
      id: 'mod_' + Date.now(),
      entityType: 'build_call',
      entityId: callId,
      status: 'pending',
      flaggedReason: 'new_submission',
      submittedBy: creatorId,
      createdAt: new Date().toISOString()
    });

    // Log audit event
    await auditRepo.logEvent({
      actorId: creatorId,
      actorRole: req.user.role,
      action: 'build_call.submitted',
      targetType: 'build_call',
      targetId: callId,
      payload: { title: finalTitle, domain }
    });

    res.status(201).json({
      call: savedCall,
      message: '🌱 Build Call submitted successfully. It is queued in pending review for curator approval before public broadcast.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to create build call.' });
  }
});

module.exports = router;
