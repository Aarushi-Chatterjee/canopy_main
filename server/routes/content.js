const express = require('express');
const router = express.Router();
const { contentItems: contentRepo } = require('../repositories');

// GET /api/content/:page — Public published content by page context
router.get('/:page', async (req, res) => {
  try {
    const page = req.params.page.toLowerCase();
    const prefix = `${page}.`;
    const items = await contentRepo.findPublished(prefix);

    // Transform into a structured key-value dictionary and list
    const dictionary = {};
    items.forEach(item => {
      dictionary[item.contentKey] = item.body || item.title;
    });

    res.json({
      page,
      items,
      dictionary,
      total: items.length
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to retrieve page content.' });
  }
});

// GET /api/content — List all published public content items
router.get('/', async (req, res) => {
  try {
    const items = await contentRepo.findPublished();
    res.json({
      items,
      total: items.length
    });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to list content items.' });
  }
});

module.exports = router;
