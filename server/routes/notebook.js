const express = require('express');
const router = express.Router();
const { notebook: notebookRepo, users: usersRepo, profiles: profilesRepo, sprints: sprintsRepo } = require('../repositories');
const { requireAuth } = require('../middleware/auth');

// Input Sanitization to prevent XSS and malicious payloads
function sanitizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:[^"'\s]*/gi, '')
    .trim();
}

// GET /api/notebook
router.get('/', async (req, res) => {
  try {
    const { domain, type } = req.query;
    let entries = await notebookRepo.find();

    if (domain) {
      entries = entries.filter(e => e.domain?.toLowerCase() === domain.toLowerCase());
    }

    if (type) {
      entries = entries.filter(e => (e.entryType || '').toLowerCase() === type.toLowerCase());
    }

    res.json({
      entries,
      total: entries.length
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to list notebook entries.' });
  }
});

// GET /api/notebook/:id
router.get('/:id', async (req, res) => {
  try {
    const entry = await notebookRepo.findById(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: 'Notebook entry not found.' });
    }

    const author = entry.userId ? await usersRepo.findById(entry.userId) : (entry.authorId ? await usersRepo.findById(entry.authorId) : null);
    const profile = author ? await profilesRepo.findByUserId(author.id) : null;
    const sprint = entry.sprintId ? await sprintsRepo.findById(entry.sprintId) : null;

    res.json({
      entry,
      author: {
        name: profile?.displayName || author?.displayName || entry.authorName || 'Field Researcher',
        avatar: profile?.avatarUrl
      },
      sprint
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to retrieve notebook entry.' });
  }
});

// POST /api/notebook
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      sprintId,
      grownFromLabel,
      title,
      domain = 'climate',
      entryType = 'post-mortem',
      summarySnippet,
      teaser,
      bodyMarkdown,
      content,
      tags = []
    } = req.body;

    const cleanTitle = sanitizeText(title);
    const cleanSnippet = sanitizeText(summarySnippet || content);

    if (!cleanTitle || !cleanSnippet) {
      return res.status(400).json({ error: 'Title and summary snippet are required.' });
    }

    const authorId = req.user.id;
    const authorName = req.user.displayName || req.user.email;

    const entryId = 'entry_' + Date.now();
    const newEntry = {
      id: entryId,
      userId: authorId,
      authorId,
      authorName,
      sprintId: sprintId || null,
      grownFromLabel: sanitizeText(grownFromLabel) || 'Independent Field Note',
      title: cleanTitle,
      content: sanitizeText(bodyMarkdown) || cleanSnippet,
      domain: domain.toLowerCase(),
      entryType: entryType.toLowerCase(),
      summarySnippet: cleanSnippet,
      teaser: sanitizeText(teaser),
      bodyMarkdown: sanitizeText(bodyMarkdown) || cleanSnippet,
      tags: Array.isArray(tags) ? tags.map(sanitizeText) : [sanitizeText(tags)],
      isPublic: true,
      branches: [],
      createdAt: new Date().toISOString()
    };

    const saved = await notebookRepo.create(newEntry);

    res.status(201).json({
      entry: saved,
      message: '🌿 Field note planted in the Lab Notebook.'
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to save notebook entry.' });
  }
});

// POST /api/notebook/:id/grow ("Grow Entry")
router.post('/:id/grow', requireAuth, async (req, res) => {
  try {
    const {
      title,
      summarySnippet,
      teaser,
      bodyMarkdown
    } = req.body;

    const parent = await notebookRepo.findById(req.params.id);
    if (!parent) {
      return res.status(404).json({ error: 'Parent notebook entry not found.' });
    }

    const cleanTitle = sanitizeText(title);
    const cleanSnippet = sanitizeText(summarySnippet);

    if (!cleanTitle || !cleanSnippet) {
      return res.status(400).json({ error: 'Title and note snippet are required to grow this entry.' });
    }

    const authorId = req.user.id;
    const authorName = req.user.displayName || req.user.email;

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
    const updated = await notebookRepo.update(
      e => e.id === parent.id,
      { branches: updatedBranches },
      { eq: { id: parent.id } }
    );

    res.status(201).json({
      branch: newBranch,
      parent: updated,
      message: `🌱 Entry branched successfully! Added reflection to "${parent.title}".`
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to grow notebook entry.' });
  }
});

module.exports = router;
