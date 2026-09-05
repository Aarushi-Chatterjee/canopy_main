const express = require('express');
const router = express.Router();
const { matches: matchesRepo, profiles: profilesRepo, buildCalls: callsRepo, users: usersRepo } = require('../repositories');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const emailService = require('../services/email');

// GET /api/matches/sandbox — Public Sandbox Explorer
router.get('/sandbox', async (req, res) => {
  try {
    const { domain, role } = req.query;

    let profiles = await profilesRepo.find();
    let calls = await callsRepo.find(c => c.status === 'open');

    if (domain && domain !== 'all') {
      profiles = profiles.filter(p => p.primaryDomain?.toLowerCase() === domain.toLowerCase());
      calls = calls.filter(c => c.domain?.toLowerCase() === domain.toLowerCase());
    }

    if (role && role !== 'all') {
      const roleSlug = role.toLowerCase().replace(' ', '_');
      const allUsers = await usersRepo.find(u => u.role === roleSlug);
      const userIds = allUsers.map(u => u.id);
      profiles = profiles.filter(p => userIds.includes(p.userId));
    }

    res.json({
      profiles,
      calls,
      totalProfiles: profiles.length,
      totalCalls: calls.length
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to query match sandbox.' });
  }
});

// GET /api/matches/connections — Verified Peer Network (Protected PII Exposure)
router.get('/connections', optionalAuth, async (req, res) => {
  try {
    const allMatches = await matchesRepo.find(m => m.status === 'connected');
    const currentUserId = req.user?.id;

    const connections = await Promise.all(
      allMatches.map(async match => {
        const requester = await usersRepo.findById(match.userId || match.requesterId);
        const recipient = await usersRepo.findById(match.matchUserId || match.recipientId);
        const reqProfile = requester ? await profilesRepo.findByUserId(requester.id) : null;
        const recProfile = recipient ? await profilesRepo.findByUserId(recipient.id) : null;

        const isParticipant = currentUserId && (currentUserId === requester?.id || currentUserId === recipient?.id);
        const safeContact = isParticipant ? (match.matchMetadata?.revealedContact || match.revealedContact) : null;

        return {
          id: match.id,
          requester: {
            id: requester?.id,
            displayName: reqProfile?.displayName || requester?.displayName || 'Collaborator',
            headline: reqProfile?.headline,
            avatarUrl: reqProfile?.avatarUrl
          },
          recipient: {
            id: recipient?.id,
            displayName: recProfile?.displayName || recipient?.displayName || 'Peer',
            headline: recProfile?.headline,
            avatarUrl: recProfile?.avatarUrl
          },
          status: match.status,
          revealedContact: safeContact,
          createdAt: match.createdAt
        };
      })
    );

    res.json({
      connections,
      count: connections.length
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to list connections.' });
  }
});

// POST /api/matches/handshake or /api/matches/request — Send Match Handshake (Authenticated)
const sendHandshake = async (req, res) => {
  try {
    const requesterId = req.user.id;
    const { recipientId, matchUserId, buildCallId, callId, intentNote, proposedRole } = req.body;
    const targetUserId = recipientId || matchUserId;
    const targetCallId = buildCallId || callId;

    if (!targetUserId || !intentNote || !intentNote.trim()) {
      return res.status(400).json({ error: 'Recipient ID and written intent note are required.' });
    }

    if (targetUserId === requesterId) {
      return res.status(400).json({ error: 'You cannot initiate a collaboration handshake with yourself.' });
    }

    const existing = await matchesRepo.findOne(m => 
      (m.userId === requesterId || m.requesterId === requesterId) && 
      (m.matchUserId === targetUserId || m.recipientId === targetUserId) &&
      (m.callId === targetCallId || m.buildCallId === targetCallId)
    );

    if (existing) {
      return res.status(409).json({ error: 'A handshake invitation is already pending for this collaborator.' });
    }

    const matchId = 'mtc_' + Date.now();
    const newMatch = {
      id: matchId,
      userId: requesterId,
      matchUserId: targetUserId,
      callId: targetCallId || null,
      status: 'pending',
      score: 85,
      matchMetadata: {
        intentNote: intentNote.trim(),
        proposedRole: proposedRole || 'Collaborator',
        revealedContact: null
      },
      createdAt: new Date().toISOString()
    };

    const saved = await matchesRepo.create(newMatch);

    // Notify recipient via email if possible
    const recipientUser = await usersRepo.findById(targetUserId);
    if (recipientUser && recipientUser.email) {
      const senderProfile = await profilesRepo.findByUserId(requesterId);
      const senderName = senderProfile?.displayName || req.user.displayName || 'A fellow builder';
      emailService.sendMatchRequest(recipientUser.email, senderName, intentNote.trim()).catch(() => {});
    }

    res.status(201).json({
      match: saved,
      message: 'High-context handshake sent. Contact details will unlock once accepted by recipient.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to send handshake.' });
  }
};

router.post('/handshake', requireAuth, sendHandshake);
router.post('/request', requireAuth, sendHandshake);

// PATCH /api/matches/:id/accept — Accept Handshake (Recipient Only)
router.patch('/:id/accept', requireAuth, async (req, res) => {
  try {
    const match = await matchesRepo.findOne(m => m.id === req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match record not found.' });
    }

    const recipientId = match.matchUserId || match.recipientId;
    const requesterId = match.userId || match.requesterId;

    if (recipientId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Only the recipient may accept this handshake.' });
    }

    const requester = await usersRepo.findById(requesterId);
    const recipient = await usersRepo.findById(recipientId);

    const updated = await matchesRepo.update(
      m => m.id === req.params.id,
      {
        status: 'connected',
        matchMetadata: {
          ...(match.matchMetadata || {}),
          revealedContact: {
            requesterEmail: requester?.email,
            recipientEmail: recipient?.email,
            matrixChannel: `#sprint-${match.id}:canopy.earth`
          }
        }
      },
      { eq: { id: req.params.id } }
    );

    res.json({
      match: updated,
      message: 'Handshake accepted! Peer communication channel is now verified and active.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to accept handshake.' });
  }
});

// PATCH /api/matches/:id/decline — Decline Handshake (Recipient Only)
router.patch('/:id/decline', requireAuth, async (req, res) => {
  try {
    const match = await matchesRepo.findOne(m => m.id === req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match record not found.' });
    }

    const recipientId = match.matchUserId || match.recipientId;
    if (recipientId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Only the recipient may decline this handshake.' });
    }

    const updated = await matchesRepo.update(
      m => m.id === req.params.id,
      { status: 'declined' },
      { eq: { id: req.params.id } }
    );

    res.json({ match: updated, message: 'Handshake declined.' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to decline handshake.' });
  }
});

module.exports = router;
