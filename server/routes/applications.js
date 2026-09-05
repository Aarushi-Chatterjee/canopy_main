const express = require('express');
const router = express.Router();
const { applications: appsRepo, moderationQueue: modRepo, auditEvents: auditRepo } = require('../repositories');
const { requireAdmin, optionalAuth } = require('../middleware/auth');
const emailService = require('../services/email');

// POST /api/applications — Public intake form
router.post('/', optionalAuth, async (req, res) => {
  try {
    const {
      fullName,
      email,
      role = 'Builder',
      domain = 'Climate',
      proofOfWorkLink,
      motivationNote,
      callId
    } = req.body;

    if (!fullName || !email || !email.includes('@')) {
      return res.status(400).json({ error: 'Full name and valid email are required.' });
    }

    const appId = 'app_' + Date.now();
    const newApp = {
      id: appId,
      callId: callId || null,
      builderId: req.user?.id || null,
      fullName: fullName.trim(),
      email: email.toLowerCase().trim(),
      role,
      domain,
      proofOfWorkLink: proofOfWorkLink ? proofOfWorkLink.trim() : '',
      motivationNote: motivationNote ? motivationNote.trim() : '',
      coverNote: motivationNote ? motivationNote.trim() : '',
      status: 'pending_review',
      appliedAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    const saved = await appsRepo.create(newApp);

    // Enqueue in moderation queue
    await modRepo.create({
      id: 'mod_' + Date.now(),
      entityType: 'application',
      entityId: appId,
      status: 'pending',
      flaggedReason: 'application_intake',
      submittedBy: req.user?.id || null,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({
      application: {
        id: saved.id,
        status: saved.status,
        appliedAt: saved.appliedAt
      },
      message: '🌱 Application received! Our team reviews submissions on a rolling basis.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to submit application.' });
  }
});

// GET /api/applications — Protected Admin Intake Queue (PII Protection)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const applications = await appsRepo.find();
    res.json({
      applications,
      total: applications.length
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to query applications.' });
  }
});

// PATCH /api/applications/:id/status — Admin application status update
router.patch('/:id/status', requireAdmin, async (req, res) => {
  try {
    const { status, note } = req.body;
    if (!['pending_review', 'accepted', 'rejected', 'in_review'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const app = await appsRepo.findOne(a => a.id === req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'Application not found.' });
    }

    const updated = await appsRepo.update(
      a => a.id === req.params.id,
      {
        status,
        reviewedAt: new Date().toISOString()
      },
      { eq: { id: req.params.id } }
    );

    await auditRepo.logEvent({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: `application.${status}`,
      targetType: 'application',
      targetId: req.params.id,
      payload: { note, status }
    });

    // Dispatch status email
    if (app.email) {
      emailService.sendApplicationStatus(app.email, status, app.role || 'Canopy Fellowship').catch(() => {});
    }

    res.json({
      application: updated,
      message: `Application status updated to ${status}.`
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to update application.' });
  }
});

module.exports = router;
