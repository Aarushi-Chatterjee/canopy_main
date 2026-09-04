const express = require('express');
const router = express.Router();
const { store } = require('../data/store');

// GET /api/matches/sandbox
router.get('/sandbox', (req, res) => {
  const { role, domain } = req.query;

  let profiles = store.getCollection('profiles');
  let calls = store.getCollection('build_calls');

  if (role) {
    const matchingUsers = store.getCollection('users').filter(u => u.role === role).map(u => u.id);
    profiles = profiles.filter(p => matchingUsers.includes(p.userId));
  }

  if (domain) {
    profiles = profiles.filter(p => p.primaryDomain.toLowerCase() === domain.toLowerCase());
    calls = calls.filter(c => c.domain.toLowerCase() === domain.toLowerCase());
  }

  res.json({
    profiles,
    calls,
    totalProfiles: profiles.length,
    totalCalls: calls.length
  });
});

// GET /api/matches/connections
router.get('/connections', (req, res) => {
  const matches = store.getCollection('matches').filter(m => m.status === 'connected');

  // Enrich with user profile details
  const connections = matches.map(match => {
    const requester = store.getItem('users', u => u.id === match.requesterId);
    const recipient = store.getItem('users', u => u.id === match.recipientId);
    const requesterProf = store.getItem('profiles', p => p.userId === match.requesterId);
    const recipientProf = store.getItem('profiles', p => p.userId === match.recipientId);

    return {
      matchId: match.id,
      requester: {
        id: requester?.id,
        name: requesterProf?.displayName || requester?.displayName,
        role: requester?.role,
        domain: requesterProf?.primaryDomain,
        avatar: requesterProf?.avatarUrl
      },
      recipient: {
        id: recipient?.id,
        name: recipientProf?.displayName || recipient?.displayName,
        role: recipient?.role,
        domain: recipientProf?.primaryDomain,
        avatar: recipientProf?.avatarUrl
      },
      intentNote: match.intentNote,
      proposedRole: match.proposedRole,
      status: match.status,
      revealedContact: match.revealedContact,
      createdAt: match.createdAt
    };
  });

  res.json({
    connections,
    count: connections.length
  });
});

// POST /api/matches/handshake
router.post('/handshake', (req, res) => {
  const { requesterId = 'usr_elena', recipientId, buildCallId, intentNote, proposedRole } = req.body;

  if (!recipientId || !intentNote) {
    return res.status(400).json({ error: 'Recipient ID and written intent note are required.' });
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
    intentNote,
    proposedRole: proposedRole || 'Collaborator',
    status: 'pending',
    revealedContact: null,
    createdAt: new Date().toISOString()
  };

  store.addItem('matches', newMatch);

  res.status(201).json({
    match: newMatch,
    message: 'High-context handshake sent. Contact details will unlock once accepted.'
  });
});

// PATCH /api/matches/:id/accept
router.patch('/:id/accept', (req, res) => {
  const match = store.getItem('matches', m => m.id === req.params.id);
  if (!match) {
    return res.status(404).json({ error: 'Match record not found.' });
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
    message: 'Handshake accepted! Peer channel is now verified and active.'
  });
});

// PATCH /api/matches/:id/decline
router.patch('/:id/decline', (req, res) => {
  const match = store.getItem('matches', m => m.id === req.params.id);
  if (!match) {
    return res.status(404).json({ error: 'Match record not found.' });
  }

  const updated = store.updateItem('matches', m => m.id === req.params.id, {
    status: 'declined'
  });

  res.json({ match: updated, message: 'Handshake declined.' });
});

module.exports = router;
