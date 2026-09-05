const express = require('express');
const router = express.Router();
const { store } = require('../data/store');
const { requireAuth } = require('../middleware/auth');

// GET /api/notebook
router.get('/', (req, res) => {
  const { domain, type } = req.query;
  let entries = store.getCollection('notebook_entries');

  if (domain) {
    entries = entries.filter(e => e.domain.toLowerCase() === domain.toLowerCase());
  }

  if (type) {
    entries = entries.filter(e => e.entryType.toLowerCase() === type.toLowerCase());
  }

  res.json({
    entries,
    total: entries.length
  });
});

// GET /api/notebook/:id
router.get('/:id', (req, res) => {
  const entry = store.getItem('notebook_entries', e => e.id === req.params.id);
  if (!entry) {
    return res.status(404).json({ error: 'Notebook entry not found.' });
  }

  const author = store.getItem('users', u => u.id === entry.authorId);
  const profile = author ? store.getItem('profiles', p => p.userId === author.id) : null;
  const sprint = entry.sprintId ? store.getItem('sprints', s => s.id === entry.sprintId) : null;

  res.json({
    entry,
    author: {
      name: profile?.displayName || entry.authorName,
      avatar: profile?.avatarUrl
    },
    sprint
  });
});

// Input Sanitization to prevent XSS and malicious payloads
function sanitizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:[^"'\s]*/gi, '')
    .trim();
}

// POST /api/notebook
router.post('/', requireAuth, (req, res) => {
  const {
    sprintId,
    grownFromLabel,
    title,
    domain = 'climate',
    entryType = 'post-mortem',
    summarySnippet,
    teaser,
    bodyMarkdown,
    tags = []
  } = req.body;

  const cleanTitle = sanitizeText(title);
  const cleanSnippet = sanitizeText(summarySnippet);

  if (!cleanTitle || !cleanSnippet) {
    return res.status(400).json({ error: 'Title and summary snippet are required.' });
  }

  const authorId = req.user.id;
  const authorName = req.user.name || req.user.email;

  const entryId = 'entry_' + Date.now();
  const newEntry = {
    id: entryId,
    authorId,
    authorName,
    sprintId: sprintId || null,
    grownFromLabel: sanitizeText(grownFromLabel) || 'Independent Field Note',
    title: cleanTitle,
    domain: domain.toLowerCase(),
    entryType: entryType.toLowerCase(),
    summarySnippet: cleanSnippet,
    teaser: sanitizeText(teaser),
    bodyMarkdown: sanitizeText(bodyMarkdown) || cleanSnippet,
    tags: Array.isArray(tags) ? tags.map(sanitizeText) : [sanitizeText(tags)],
    branches: [],
    createdAt: new Date().toISOString()
  };

  store.addItem('notebook_entries', newEntry);

  res.status(201).json({
    entry: newEntry,
    message: '🌿 Field note planted in the Lab Notebook.'
  });
});

// POST /api/notebook/:id/grow ("Grow Entry")
router.post('/:id/grow', requireAuth, (req, res) => {
  const {
    title,
    summarySnippet,
    teaser,
    bodyMarkdown
  } = req.body;

  const parent = store.getItem('notebook_entries', e => e.id === req.params.id);
  if (!parent) {
    return res.status(404).json({ error: 'Parent notebook entry not found.' });
  }

  const cleanTitle = sanitizeText(title);
  const cleanSnippet = sanitizeText(summarySnippet);

  if (!cleanTitle || !cleanSnippet) {
    return res.status(400).json({ error: 'Title and note snippet are required to grow this entry.' });
  }

  const authorId = req.user.id;
  const authorName = req.user.name || req.user.email;

  const branchId = 'branch_' + Date.now();
  const newBranch = {
    id: branchId,
    parentEntryId: parent.id,
    authorId,
    authorName,
    title: cleanTitle,
    summarySnippet: cleanSnippet,
    teaser: sanitizeText(teaser),
    bodyMarkdown: sanitizeText(bodyMarkdown) || cleanSnippet,
    createdAt: new Date().toISOString()
  };

  const updatedBranches = [...(parent.branches || []), newBranch];
  const updated = store.updateItem('notebook_entries', e => e.id === parent.id, {
    branches: updatedBranches
  });

  res.status(201).json({
    branch: newBranch,
    parent: updated,
    message: `🌱 Entry branched successfully! Added reflection to "${parent.title}".`
  });
});

module.exports = router;
