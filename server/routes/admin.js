const express = require('express');
const router = express.Router();
const { 
  applications: appsRepo,
  users: usersRepo,
  profiles: profilesRepo,
  matches: matchesRepo,
  buildCalls: callsRepo,
  sprints: sprintsRepo,
  notebook: notebookRepo,
  moderationQueue: modRepo,
  auditEvents: auditRepo,
  contentItems: contentRepo,
  userRoles: userRolesRepo
} = require('../repositories');
const { requireRole, requireAnyRole } = require('../middleware/auth');
const emailService = require('../services/email');
const storageService = require('../services/storage');
const { store } = require('../data/store');

// Base gate: Operational staff credentials required
router.use(requireAnyRole(['content_editor', 'match_curator', 'moderator', 'admin', 'owner']));

// -------------------------------------------------------------
// 1. Overview Dashboard Metrics
// -------------------------------------------------------------
router.get('/overview', requireAnyRole(['admin', 'owner', 'moderator']), async (req, res) => {
  try {
    const apps = await appsRepo.find();
    const matches = await matchesRepo.find();
    const calls = await callsRepo.find();
    const sprints = await sprintsRepo.find();
    const users = await usersRepo.find();
    const audits = await auditRepo.find();
    const content = await contentRepo.find();

    const metrics = {
      totalUsers: users.length,
      pendingApplications: apps.filter(a => a.status === 'pending_review' || a.status === 'in_review').length,
      activeMatches: matches.filter(m => m.status === 'pending' || m.status === 'connected' || m.status === 'introduced').length,
      openBuildCalls: calls.filter(c => c.status === 'open').length,
      pendingBuildCalls: calls.filter(c => c.status === 'pending_review').length,
      activeSprints: sprints.filter(s => s.status === 'active' || s.stage === 'building').length,
      publishedContentItems: content.filter(c => c.status === 'published').length,
      totalAuditEvents: audits.length
    };

    res.json({
      metrics,
      ...metrics,
      staffUser: {
        id: req.user.id,
        email: req.user.email,
        roles: req.user.roles
      }
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to generate overview metrics.' });
  }
});

// -------------------------------------------------------------
// 2. Applications Review Panel
// -------------------------------------------------------------
router.get('/applications', requireAnyRole(['moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const { status, role, domain } = req.query;
    let apps = await appsRepo.find();

    if (status && status !== 'all') {
      apps = apps.filter(a => a.status === status);
    }
    if (role && role !== 'all') {
      apps = apps.filter(a => a.role?.toLowerCase() === role.toLowerCase());
    }
    if (domain && domain !== 'all') {
      apps = apps.filter(a => a.domain?.toLowerCase() === domain.toLowerCase());
    }

    res.json({ applications: apps, total: apps.length });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to list applications.' });
  }
});

router.patch('/applications/:id/status', requireAnyRole(['moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const { status, note = '' } = req.body;
    const allowed = ['pending_review', 'in_review', 'needs_information', 'approved', 'waitlisted', 'declined'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Allowed: ${allowed.join(', ')}` });
    }

    const app = await appsRepo.findOne(a => a.id === req.params.id);
    if (!app) {
      return res.status(404).json({ error: 'Application record not found.' });
    }

    const updated = await appsRepo.update(
      a => a.id === req.params.id,
      {
        status,
        reviewerNotes: note,
        reviewedBy: req.user.id,
        reviewedAt: new Date().toISOString()
      },
      { eq: { id: req.params.id } }
    );

    // If approved, elevate user's role if they have an existing user account
    if (status === 'approved' && app.email) {
      const user = await usersRepo.findByEmail(app.email);
      if (user) {
        const approvedRole = app.role === 'problem_holder' ? 'approved_problem_holder' 
          : app.role === 'enabler' ? 'approved_enabler' 
          : 'approved_builder';

        store.addItem('user_roles', {
          id: 'rol_' + Date.now(),
          userId: user.id,
          role: approvedRole,
          grantedBy: req.user.id,
          grantedAt: new Date().toISOString(),
          internalNote: `Elevated upon application ${app.id} approval.`
        });
      }
    }

    // Dispatch branded decision email
    if (app.email) {
      emailService.sendApplicationDecision({
        email: app.email,
        applicantName: app.fullName,
        role: app.role || 'Collaborator',
        status,
        note
      }).catch(e => console.error('[EMAIL:ERROR]', e.message));
    }

    // Record audit event
    await auditRepo.logEvent({
      actorId: req.user.id,
      actorRole: req.user.roles[0],
      action: `application.${status}`,
      targetType: 'application',
      targetId: req.params.id,
      payload: { status, note, applicantEmail: app.email }
    });

    res.json({ application: updated, message: `Application updated to ${status}.` });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to update application status.' });
  }
});

// -------------------------------------------------------------
// 3. User Access & Role Management
// -------------------------------------------------------------
router.get('/users', requireAnyRole(['admin', 'owner']), async (req, res) => {
  try {
    const allUsers = await usersRepo.find();
    const allProfiles = await profilesRepo.find();
    const allRoles = store.getCollection('user_roles');

    const enriched = allUsers.map(u => {
      const profile = allProfiles.find(p => p.userId === u.id);
      const userRoles = allRoles.filter(r => r.userId === u.id && !r.revokedAt).map(r => r.role);
      if (userRoles.length === 0) userRoles.push('registered_user');

      return {
        id: u.id,
        email: u.email,
        displayName: profile?.displayName || u.displayName || u.email,
        isVerified: u.isVerified,
        roles: userRoles,
        createdAt: u.createdAt
      };
    });

    res.json({ users: enriched, total: enriched.length });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to list users.' });
  }
});

router.patch('/users/:id/role', requireAnyRole(['admin', 'owner']), async (req, res) => {
  try {
    const { role, action = 'grant' } = req.body;
    const validRoles = [
      'approved_builder',
      'approved_problem_holder',
      'approved_enabler',
      'content_editor',
      'match_curator',
      'moderator',
      'admin',
      'owner'
    ];

    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role: ${role}. Valid: ${validRoles.join(', ')}` });
    }

    // Only Owner can grant or revoke the 'owner' role
    if (role === 'owner' && !req.user.roles.includes('owner')) {
      return res.status(403).json({ error: 'Only a platform Owner can assign or revoke the Owner role.' });
    }

    const targetUser = await usersRepo.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ error: 'User record not found.' });
    }

    if (action === 'grant') {
      await userRolesRepo.grantRole(targetUser.id, role, req.user.id);
    } else {
      await userRolesRepo.revokeRole(targetUser.id, role, req.user.id);
      // Invalidate existing sessions for security on role revocation (P1-3)
      await usersRepo.update(
        u => u.id === targetUser.id,
        { revokedAfter: new Date().toISOString(), updatedAt: new Date().toISOString() },
        { eq: { id: targetUser.id } }
      );
    }

    // Log audit event
    await auditRepo.logEvent({
      actorId: req.user.id,
      actorRole: req.user.roles[0],
      action: `role.${action}`,
      targetType: 'user',
      targetId: targetUser.id,
      payload: { role, targetEmail: targetUser.email }
    });

    res.json({
      success: true,
      message: `Role "${role}" successfully ${action === 'grant' ? 'assigned to' : 'revoked from'} ${targetUser.email}.`
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to update user role.' });
  }
});

// -------------------------------------------------------------
// 4. Manual Matching Console
// -------------------------------------------------------------
router.get('/matches', requireAnyRole(['match_curator', 'moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const allMatches = await matchesRepo.find();
    const enriched = await Promise.all(
      allMatches.map(async m => {
        const requester = await usersRepo.findById(m.userId || m.requesterId);
        const recipient = await usersRepo.findById(m.matchUserId || m.recipientId);
        const reqProfile = requester ? await profilesRepo.findByUserId(requester.id) : null;
        const recProfile = recipient ? await profilesRepo.findByUserId(recipient.id) : null;
        const call = m.callId ? await callsRepo.findById(m.callId) : null;

        return {
          ...m,
          requester: {
            id: requester?.id,
            email: requester?.email,
            displayName: reqProfile?.displayName || requester?.displayName || 'Collaborator',
            headline: reqProfile?.headline,
            primaryDomain: reqProfile?.primaryDomain
          },
          recipient: {
            id: recipient?.id,
            email: recipient?.email,
            displayName: recProfile?.displayName || recipient?.displayName || 'Peer',
            headline: recProfile?.headline,
            primaryDomain: recProfile?.primaryDomain
          },
          buildCall: call ? { id: call.id, title: call.title, domain: call.domain } : null
        };
      })
    );

    res.json({ matches: enriched, total: enriched.length });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to list match requests.' });
  }
});

router.post('/matches/:id/introduce', requireAnyRole(['match_curator', 'moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const { contextNotes = '' } = req.body;
    const match = await matchesRepo.findOne(m => m.id === req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match record not found.' });
    }

    const requester = await usersRepo.findById(match.userId || match.requesterId);
    const recipient = await usersRepo.findById(match.matchUserId || match.recipientId);
    const call = match.callId ? await callsRepo.findById(match.callId) : null;

    if (!requester || !recipient) {
      return res.status(400).json({ error: 'Participants could not be fully resolved for introduction.' });
    }

    // Send manual curator introduction email
    await emailService.sendCuratorIntroduction({
      requesterName: requester.displayName || requester.email,
      requesterEmail: requester.email,
      recipientName: recipient.displayName || recipient.email,
      recipientEmail: recipient.email,
      sprintTopic: call?.title || 'Shared Challenge Exploration',
      contextNotes
    });

    const updated = await matchesRepo.update(
      m => m.id === req.params.id,
      {
        status: 'introduced',
        assignedCuratorId: req.user.id,
        curatorNotes: contextNotes,
        introductionSentAt: new Date().toISOString()
      },
      { eq: { id: req.params.id } }
    );

    await auditRepo.logEvent({
      actorId: req.user.id,
      actorRole: req.user.roles[0],
      action: 'match.curator_introduction',
      targetType: 'match',
      targetId: req.params.id,
      payload: { requesterEmail: requester.email, recipientEmail: recipient.email }
    });

    res.json({ match: updated, message: 'Manual introduction dispatched to both collaborators.' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to dispatch introduction.' });
  }
});

router.post('/matches/manual', requireAnyRole(['match_curator', 'moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const { initiatorId, recipientId, buildCallId, curatorNotes = '', dispatchIntroEmail = false } = req.body;
    if (!initiatorId || !recipientId) {
      return res.status(400).json({ error: 'initiatorId and recipientId are required.' });
    }

    const initiator = (await usersRepo.findById(initiatorId)) || {
      displayName: req.user?.displayName || 'Canopy Founder',
      email: req.user?.email || 'founder@canopy.earth'
    };
    const recipient = (await usersRepo.findById(recipientId)) || {
      displayName: 'Collaborator Partner',
      email: recipientId.includes('@') ? recipientId : 'partner@field.net'
    };

    const matchRecord = {
      id: 'mat_man_' + Date.now(),
      userId: initiatorId,
      matchUserId: recipientId,
      callId: buildCallId || null,
      status: 'connected',
      stage: 'introduced',
      assignedCuratorId: req.user.id,
      curatorNotes,
      mutualConsent: true,
      introductionSentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await matchesRepo.create(matchRecord);

    if (dispatchIntroEmail && initiator && recipient) {
      await emailService.sendCuratorIntroduction({
        requesterName: initiator.displayName || initiator.email,
        requesterEmail: initiator.email,
        recipientName: recipient.displayName || recipient.email,
        recipientEmail: recipient.email,
        sprintTopic: 'Canopy Collaboration',
        contextNotes: curatorNotes
      });
    }

    await auditRepo.logEvent({
      actorId: req.user.id,
      actorRole: req.user.roles[0],
      action: 'match.manual_curated',
      targetType: 'match',
      targetId: saved.id,
      payload: { initiatorId, recipientId }
    });

    res.status(201).json({ match: saved, message: 'Manual match curated and introduction dispatched.' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to curate manual match.' });
  }
});

// -------------------------------------------------------------
// 5. Content Studio
// -------------------------------------------------------------
router.get('/content', requireAnyRole(['content_editor', 'moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const items = await contentRepo.find();
    res.json({ contentItems: items, items, total: items.length });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to list content items.' });
  }
});

router.post('/content', requireAnyRole(['content_editor', 'moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const {
      contentKey, key,
      contentType, type,
      title, body,
      summary,
      isIllustrative = false,
      page = 'index',
      section = 'main',
      mediaUrl = null,
      displayOrder = 0
    } = req.body;

    const resolvedKey = (contentKey || key || '').trim().toLowerCase();
    if (!resolvedKey || !title || !body) {
      return res.status(400).json({ error: 'contentKey (or key), title, and body are required.' });
    }

    const newItem = {
      id: 'cnt_' + Date.now(),
      contentKey: resolvedKey,
      key: resolvedKey,
      contentType: contentType || type || 'statement',
      title: title.trim(),
      body: body.trim(),
      summary: (summary || '').trim(),
      status: 'draft',
      visibility: 'public',
      isIllustrative: Boolean(isIllustrative),
      page: (page || 'index').trim().toLowerCase(),
      section: (section || 'main').trim().toLowerCase(),
      mediaUrl,
      displayOrder: Number(displayOrder) || 0,
      version: 1,
      createdBy: req.user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const saved = await contentRepo.create(newItem);

    await auditRepo.logEvent({
      actorId: req.user.id,
      actorRole: req.user.roles[0],
      action: 'content.draft_created',
      targetType: 'content_item',
      targetId: saved.id,
      payload: { contentKey: resolvedKey }
    });

    res.status(201).json({ item: saved, contentItem: saved, message: 'Content draft created successfully.' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to create content item.' });
  }
});

router.patch('/content/:id', requireAnyRole(['content_editor', 'moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const existing = await contentRepo.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Content item not found.' });
    }

    const updates = {
      ...req.body,
      updatedBy: req.user.id,
      updatedAt: new Date().toISOString()
    };

    const updated = await contentRepo.update(c => c.id === req.params.id, updates, { eq: { id: req.params.id } });

    res.json({ contentItem: updated, message: 'Content updated.' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to update content.' });
  }
});

router.post('/content/:id/publish', requireAnyRole(['moderator', 'admin', 'owner']), async (req, res) => {
  try {
    const existing = await contentRepo.findById(req.params.id);
    if (!existing) {
      return res.status(404).json({ error: 'Content item not found.' });
    }

    const now = new Date().toISOString();
    const updated = await contentRepo.update(
      c => c.id === req.params.id,
      {
        status: 'published',
        approvedBy: req.user.id,
        approvedAt: now,
        publishedAt: now,
        version: (existing.version || 1) + 1,
        updatedAt: now
      },
      { eq: { id: req.params.id } }
    );

    await auditRepo.logEvent({
      actorId: req.user.id,
      actorRole: req.user.roles[0],
      action: 'content.published',
      targetType: 'content_item',
      targetId: req.params.id,
      payload: { contentKey: existing.contentKey, version: updated.version }
    });

    res.json({ item: updated, contentItem: updated, message: `Content item "${existing.contentKey}" is now published and live.` });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to publish content item.' });
  }
});

// Upload media asset for content cards (gated to PNG, JPEG, WebP, SVG, max 5MB, deep magic-byte verified)
router.post('/content/upload', requireAnyRole(['content_editor', 'moderator', 'admin', 'owner']), async (req, res) => {
  try {
    let { fileName, filename, mimeType, base64Data, dataUri } = req.body;
    fileName = fileName || filename || 'asset.png';

    if (dataUri && typeof dataUri === 'string' && dataUri.startsWith('data:')) {
      const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);
      if (matches) {
        mimeType = matches[1];
        base64Data = matches[2];
      } else {
        return res.status(400).json({ error: 'Malformed data URI provided.' });
      }
    }

    if (!fileName || !mimeType || !base64Data) {
      return res.status(400).json({ error: 'fileName, mimeType, and base64Data (or dataUri) are required.' });
    }

    const result = await storageService.uploadMedia({
      fileName,
      mimeType,
      base64Data,
      userId: req.user.id
    });

    await auditRepo.logEvent({
      actorId: req.user.id,
      actorRole: req.user.roles[0],
      action: 'content.media_uploaded',
      targetType: 'media',
      targetId: result.storageKey,
      payload: { mimeType: result.mimeType, sizeBytes: result.sizeBytes, provider: result.storageProvider }
    });

    res.json({
      success: true,
      url: result.url,
      storageKey: result.storageKey,
      mimeType: result.mimeType,
      sizeBytes: result.sizeBytes,
      message: 'Asset validated via magic bytes and persisted to durable storage.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'File upload failed.' });
  }
});

// -------------------------------------------------------------
// 6. Audit Logs
// -------------------------------------------------------------
router.get('/audit', requireAnyRole(['admin', 'owner']), async (req, res) => {
  try {
    const logs = await auditRepo.find();
    res.json({ auditEvents: logs.slice(0, 100), events: logs.slice(0, 100), total: logs.length });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to retrieve audit events.' });
  }
});

module.exports = router;
