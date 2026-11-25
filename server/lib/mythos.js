const fs = require('fs');
const path = require('path');
const { createMythos, MythosError } = require('@mythos-work/sdk');
const { platformSettings } = require('../repositories');

const LOCAL_IDS_FILE = path.join(__dirname, '../../.mythos-listing-ids.json');
const SETTINGS_KEY = 'mythos_listing_ids';

async function getListingIds() {
  const ids = new Set();

  if (process.env.MYTHOS_LISTING_ID) {
    ids.add(process.env.MYTHOS_LISTING_ID.trim());
  }
  if (process.env.MYTHOS_LISTING_IDS) {
    process.env.MYTHOS_LISTING_IDS.split(',').map(s => s.trim()).filter(Boolean).forEach(id => ids.add(id));
  }

  // Shared DB storage (works across Vercel serverless instances)
  try {
    const setting = await platformSettings.findByKey(SETTINGS_KEY);
    if (Array.isArray(setting?.value)) {
      setting.value.forEach(id => ids.add(String(id)));
    }
  } catch (_) {
    // Fallback to local file if DB unavailable
  }

  // Local file fallback
  try {
    if (fs.existsSync(LOCAL_IDS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(LOCAL_IDS_FILE, 'utf8'));
      if (Array.isArray(parsed)) {
        parsed.forEach(id => ids.add(String(id)));
      }
    }
  } catch (_) {}

  return Array.from(ids);
}

async function addListingId(listingId) {
  if (!listingId) return;
  const cleanId = String(listingId).trim();
  if (!cleanId) return;

  const existing = await getListingIds();
  if (existing.includes(cleanId)) return; // idempotent

  const updated = [...existing, cleanId];

  try {
    await platformSettings.upsertSetting(
      SETTINGS_KEY,
      updated,
      'Registered Mythos marketplace listing IDs',
      'mythos_sdk'
    );
  } catch (_) {}

  try {
    fs.writeFileSync(LOCAL_IDS_FILE, JSON.stringify(updated, null, 2), 'utf8');
  } catch (_) {}
}

const mythos = createMythos({
  resolveListingIds: getListingIds,
  onListingRegistered: addListingId
});

module.exports = {
  mythos,
  MythosError,
  getListingIds,
  addListingId
};

