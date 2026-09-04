const express = require('express');
const router = express.Router();
const { store } = require('../data/store');

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

// POST /api/notebook
router.post('/', (req, res) => {
  const {
    authorId = 'usr_elena',
    authorName = 'Elena R.',
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

  if (!title || !summarySnippet) {
    return res.status(400).json({ error: 'Title and summary snippet are required.' });
  }

  const entryId = 'entry_' + Date.now();
  const newEntry = {
    id: entryId,
    authorId,
    authorName,
    sprintId: sprintId || null,
    grownFromLabel: grownFromLabel || 'Independent Field Note',
    title,
    domain: domain.toLowerCase(),
    entryType: entryType.toLowerCase(),
    summarySnippet,
    teaser: teaser || '',
    bodyMarkdown: bodyMarkdown || summarySnippet,
    tags: Array.isArray(tags) ? tags : [tags],
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
router.post('/:id/grow', (req, res) => {
  const {
    authorId = 'usr_elena',
    authorName = 'Elena R.',
    title,
    summarySnippet,
    teaser,
    bodyMarkdown
  } = req.body;

  const parent = store.getItem('notebook_entries', e => e.id === req.params.id);
  if (!parent) {
    return res.status(404).json({ error: 'Parent notebook entry not found.' });
  }

  if (!title || !summarySnippet) {
    return res.status(400).json({ error: 'Title and note snippet are required to grow this entry.' });
  }

  const branchId = 'branch_' + Date.now();
  const newBranch = {
    id: branchId,
    parentEntryId: parent.id,
    authorId,
    authorName,
    title,
    summarySnippet,
    teaser: teaser || '',
    bodyMarkdown: bodyMarkdown || summarySnippet,
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
