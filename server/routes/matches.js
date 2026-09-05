const express = require('express');
const router = express.Router();
const { store } = require('../data/store');
const { requireAuth, optionalAuth } = require('../middleware/auth');

// GET /api/matches/sandbox — Public Sandbox Explorer
router.get('/sandbox', (req, res) => {
  const { domain, role } = req.query;

  let profiles = store.getCollection('profiles');
  let calls = store.getCollection('build_calls').filter(c => c.status === 'open');

  if (domain && domain !== 'all') {
    profiles = profiles.filter(p => p.primaryDomain.toLowerCase() === domain.toLowerCase());
    calls = calls.filter(c => c.domain.toLowerCase() === domain.toLowerCase());
  }

  if (role && role !== 'all') {
    const roleSlug = role.toLowerCase().replace(' ', '_');
    const usersInRole = store.getCollection('users').filter(u => u.role === roleSlug).map(u => u.id);
    profiles = profiles.filter(p => usersInRole.includes(p.userId));
  }

  res.json({
    profiles,
    calls,
    totalProfiles: profiles.length,
    totalCalls: calls.length
  });
});

// GET /api/matches/connections — Verified Peer Network (Protected PII Exposure)
router.get('/connections', optionalAuth, (req, res) => {
  const allMatches = store.getCollection('matches').filter(m => m.status === 'connected');
  const currentUserId = req.user?.id;

  const connections = allMatches.map(match => {
    const requester = store.getItem('users', u => u.id === match.requesterId);
    const recipient = store.getItem('users', u => u.id === match.recipientId);
    const reqProfile = store.getItem('profiles', p => p.userId === match.requesterId);
    const recProfile = store.getItem('profiles', p => p.userId === match.recipientId);

    // Strict PII Gate: Only the two matched participants can inspect contact details
    const isParticipant = currentUserId && (currentUserId === match.requesterId || currentUserId === match.recipientId);
    const safeContact = isParticipant ? match.revealedContact : null;

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
  });

  res.json({
    connections,
    count: connections.length
  });
});

// POST /api/matches/handshake or /api/matches/request — Send Match Handshake (Authenticated)
const sendHandshake = (req, res) => {
  const requesterId = req.user.id;
  const { recipientId, buildCallId, intentNote, proposedRole } = req.body;

  if (!recipientId || !intentNote || !intentNote.trim()) {
    return res.status(400).json({ error: 'Recipient ID and written intent note are required.' });
  }

  if (recipientId === requesterId) {
    return res.status(400).json({ error: 'You cannot initiate a collaboration handshake with yourself.' });
  }

  const existing = store.getItem('matches', m => 
    m.requesterId === requesterId && m.recipientId === recipientId && m.buildCallId === buildCallId
  );

  if (existing) {
    return res.status(409).json({ error: 'A handshake invitation is already pending for this collaborator.' });
  }

  const matchId = 'mtc_' + Date.now();
  const newMatch = {
    id: matchId,
    requesterId,
    recipientId,
    buildCallId: buildCallId || null,
    intentNote: intentNote.trim(),
    proposedRole: proposedRole || 'Collaborator',
    status: 'pending',
    revealedContact: null,
    createdAt: new Date().toISOString()
  };

  store.addItem('matches', newMatch);

  res.status(201).json({
    match: newMatch,
    message: 'High-context handshake sent. Contact details will unlock once accepted by recipient.'
  });
};

router.post('/handshake', requireAuth, sendHandshake);
router.post('/request', requireAuth, sendHandshake);

// PATCH /api/matches/:id/accept — Accept Handshake (Recipient Only)
router.patch('/:id/accept', requireAuth, (req, res) => {
  const match = store.getItem('matches', m => m.id === req.params.id);
  if (!match) {
    return res.status(404).json({ error: 'Match record not found.' });
  }

  // Authorization: Only the designated recipient can accept
  if (match.recipientId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Only the recipient may accept this handshake.' });
  }

  const requester = store.getItem('users', u => u.id === match.requesterId);
  const recipient = store.getItem('users', u => u.id === match.recipientId);

  const updated = store.updateItem('matches', m => m.id === req.params.id, {
    status: 'connected',
    revealedContact: {
      requesterEmail: requester?.email,
      recipientEmail: recipient?.email,
      matrixChannel: `#sprint-${match.id}:canopy.earth`
    }
  });

  res.json({
    match: updated,
    message: 'Handshake accepted! Peer communication channel is now verified and active.'
  });
});

// PATCH /api/matches/:id/decline — Decline Handshake (Recipient Only)
router.patch('/:id/decline', requireAuth, (req, res) => {
  const match = store.getItem('matches', m => m.id === req.params.id);
  if (!match) {
    return res.status(404).json({ error: 'Match record not found.' });
  }

  // Authorization: Only the recipient can decline
  if (match.recipientId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Only the recipient may decline this handshake.' });
  }

  const updated = store.updateItem('matches', m => m.id === req.params.id, {
    status: 'declined'
  });

  res.json({ match: updated, message: 'Handshake declined.' });
});

module.exports = router;
