const express = require('express');
const router = express.Router();
const { 
  moderationQueue: modRepo, 
  buildCalls: callsRepo, 
  applications: appsRepo, 
  auditEvents: auditRepo,
  users: usersRepo
} = require('../repositories');
const { requireAdmin } = require('../middleware/auth');
const emailService = require('../services/email');

// All moderation endpoints strictly require Administrator or Moderator credentials
router.use(requireAdmin);

// GET /api/moderation/queue — List items in moderation queue
router.get('/queue', async (req, res) => {
  try {
    const { status = 'pending' } = req.query;
    const items = await modRepo.find(item => !status || status === 'all' || item.status === status);

    // Enrich items with entity context
    const enriched = await Promise.all(
      items.map(async item => {
        let entityData = null;
        if (item.entityType === 'build_call') {
          entityData = await callsRepo.findById(item.entityId);
        } else if (item.entityType === 'application') {
          entityData = await appsRepo.findOne(a => a.id === item.entityId);
        }

        const submitter = item.submittedBy ? await usersRepo.findById(item.submittedBy) : null;

        return {
          ...item,
          entityData,
          submitter: submitter ? { id: submitter.id, email: submitter.email, role: submitter.role } : null
        };
      })
    );

    res.json({
      queue: enriched,
      total: enriched.length
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to list moderation queue.' });
  }
});

// POST /api/moderation/review — Approve or reject an item
router.post('/review', async (req, res) => {
  try {
    const { entityType, entityId, action, note = '' } = req.body;

    if (!entityType || !entityId || !action) {
      return res.status(400).json({ error: 'entityType, entityId, and action (approve/reject) are required.' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action. Must be "approve" or "reject".' });
    }

    const reviewerId = req.user.id;
    const isApprove = action === 'approve';
    const now = new Date().toISOString();

    // 1. Process entity-specific status update
    if (entityType === 'build_call') {
      const call = await callsRepo.findById(entityId);
      if (!call) {
        return res.status(404).json({ error: 'Target Build Call not found.' });
      }

      await callsRepo.update(
        c => c.id === entityId,
        {
          status: isApprove ? 'open' : 'rejected',
          updatedAt: now
        },
        { eq: { id: entityId } }
      );
    } else if (entityType === 'application') {
      const app = await appsRepo.findOne(a => a.id === entityId);
      if (!app) {
        return res.status(404).json({ error: 'Target Application not found.' });
      }

      await appsRepo.update(
        a => a.id === entityId,
        {
          status: isApprove ? 'accepted' : 'rejected',
          reviewedAt: now
        },
        { eq: { id: entityId } }
      );

      if (app.email) {
        emailService.sendApplicationStatus(app.email, isApprove ? 'accepted' : 'rejected', app.role || 'Canopy Fellowship').catch(() => {});
      }
    }

    // 2. Update moderation queue record
    await modRepo.update(
      item => (item.entityType === entityType && item.entityId === entityId) || item.id === entityId,
      {
        status: isApprove ? 'approved' : 'rejected',
        reviewedBy: reviewerId,
        reviewedAt: now,
        decisionNote: note
      },
      { eq: { entity_type: entityType, entity_id: entityId } }
    );

    // 3. Record audit event
    await auditRepo.logEvent({
      actorId: reviewerId,
      actorRole: req.user.role,
      action: `moderation.${action}`,
      targetType: entityType,
      targetId: entityId,
      payload: { note, action },
      ip: req.ip || req.connection?.remoteAddress
    });

    res.json({
      success: true,
      message: `Entity ${entityId} successfully ${isApprove ? 'approved and published' : 'rejected'}.`,
      action,
      reviewedAt: now
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Moderation action failed.' });
  }
});

// GET /api/moderation/audit-logs — Protected review of system audit events
router.get('/audit-logs', async (req, res) => {
  try {
    const logs = await auditRepo.find();
    res.json({
      auditEvents: logs,
      total: logs.length
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to retrieve audit events.' });
  }
});

module.exports = router;
