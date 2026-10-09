const express = require('express');
const router = express.Router();
const { notebook: notebookRepo, users: usersRepo, profiles: profilesRepo, sprints: sprintsRepo } = require('../repositories');
const { requireAuth } = require('../middleware/auth');

// Robust Input Sanitization to prevent XSS, script injection, and event handler exploits
function sanitizeText(str) {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '')
    .replace(/javascript:[^"'\s]*/gi, '')
    .replace(/<(?!\/?(b|i|em|strong|p|br|code|pre)\b)[^>]+>/gi, '')
    .trim();
}

function estimateReadingTime(text) {
  if (!text || typeof text !== 'string') return 3;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 180));
}

// GET /api/notebook
router.get('/', async (req, res) => {
  try {
    const { domain, type, featured, founder, search, limit } = req.query;
    let entries = await notebookRepo.find();

    // Default to published entries
    entries = entries.filter(e => e.status !== 'draft');

    if (domain && domain !== 'all') {
      entries = entries.filter(e => e.domain?.toLowerCase() === domain.toLowerCase());
    }

    if (type && type !== 'all') {
      const targetType = type.toLowerCase();
      entries = entries.filter(e => {
        const et = (e.entryType || '').toLowerCase();
        if (targetType === 'article') {
          return et === 'article' || et === 'essay' || et === 'founder-essay' || et === 'deep-dive';
        }
        return et === targetType;
      });
    }

    if (featured === 'true' || featured === '1') {
      entries = entries.filter(e => Boolean(e.isFeatured));
    }

    if (founder === 'true' || founder === '1') {
      entries = entries.filter(e => Boolean(e.isFounderPost));
    }

    if (search && typeof search === 'string') {
      const q = search.trim().toLowerCase();
      entries = entries.filter(e => {
        return (
          (e.title || '').toLowerCase().includes(q) ||
          (e.summarySnippet || '').toLowerCase().includes(q) ||
          (e.bodyMarkdown || '').toLowerCase().includes(q) ||
          (e.authorName || '').toLowerCase().includes(q) ||
          (Array.isArray(e.tags) && e.tags.some(t => String(t).toLowerCase().includes(q)))
        );
      });
    }

    // Sort by createdAt descending
    entries.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    if (limit && !isNaN(Number(limit))) {
      entries = entries.slice(0, Number(limit));
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

    // Increment view count non-blockingly
    const newCount = (Number(entry.viewCount) || 0) + 1;
    notebookRepo.update(
      e => e.id === entry.id,
      { viewCount: newCount },
      { eq: { id: entry.id } }
    ).catch(() => {});
    entry.viewCount = newCount;

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
      tags = [],
      coverImageUrl = null,
      readingTimeMinutes,
      isFeatured = false,
      isFounderPost = false,
      status = 'published'
    } = req.body;

    const cleanTitle = sanitizeText(title);
    const cleanSnippet = sanitizeText(summarySnippet || content);
    const rawContent = bodyMarkdown || content || cleanSnippet;
    const cleanContent = sanitizeText(rawContent);

    if (!cleanTitle || !cleanSnippet) {
      return res.status(400).json({ error: 'Title and summary snippet are required.' });
    }

    const authorId = req.user.id;
    const authorName = req.user.displayName || req.user.email;
    const computedReadingTime = readingTimeMinutes ? Number(readingTimeMinutes) : estimateReadingTime(cleanContent);

    const entryId = 'entry_' + Date.now();
    const newEntry = {
      id: entryId,
      userId: authorId,
      authorId,
      authorName,
      sprintId: sprintId || null,
      grownFromLabel: sanitizeText(grownFromLabel) || 'Independent Field Note',
      title: cleanTitle,
      content: cleanContent,
      domain: domain.toLowerCase(),
      entryType: entryType.toLowerCase(),
      summarySnippet: cleanSnippet,
      teaser: sanitizeText(teaser),
      bodyMarkdown: cleanContent,
      tags: Array.isArray(tags) ? tags.map(sanitizeText) : [sanitizeText(tags)],
      coverImageUrl: coverImageUrl ? sanitizeText(coverImageUrl) : null,
      readingTimeMinutes: computedReadingTime,
      viewCount: 0,
      isFeatured: Boolean(isFeatured),
      isFounderPost: Boolean(isFounderPost),
      status: status || 'published',
      isPublic: status !== 'draft',
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
