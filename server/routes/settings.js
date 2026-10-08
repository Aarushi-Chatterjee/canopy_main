const express = require('express');
const router = express.Router();
const { platformSettings: settingsRepo } = require('../repositories');

// GET /api/settings - Public retrieval of active platform settings and limits
router.get('/', async (req, res) => {
  try {
    const data = await settingsRepo.getAllSettings();
    res.json(data);
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to retrieve platform settings.' });
  }
});

// GET /api/settings/:key - Single setting lookup
router.get('/:key', async (req, res) => {
  try {
    const value = await settingsRepo.getSetting(req.params.key);
    if (value === null) {
      return res.status(404).json({ error: 'Setting not found.' });
    }
    res.json({ key: req.params.key, value });
  } catch (err) {
    res.status(err.statusCode || 500).json({ error: err.message || 'Failed to retrieve setting.' });
  }
});

module.exports = router;
