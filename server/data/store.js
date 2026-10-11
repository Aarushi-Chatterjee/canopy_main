const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'canopy-db.json');

const INITIAL_DATA = {
  users: [],
  profiles: [],
  build_calls: [
    {
      id: 'call_groundwater',
      creatorId: 'usr_canopy_illustrative',
      title: 'Groundwater contamination sensor optical probe',
      orgName: 'Community Hydrology Initiative (Illustrative)',
      problemStatement: 'Illustrative Example: Build an optical sensor that flags chemical contamination in real time. This is a reference demonstration of a Canopy Build Call.',
      domain: 'climate',
      targetDeliverable: 'Open-source spectrophotometric probe schematic and telemetry firmware.',
      pilotBudget: 'Sample deployment budget (demonstration only)',
      datasetAccessUrl: 'https://data.canopy.internal/sets/gw-sensor-sample',
      neededSkills: ['Hardware', 'Embedded C', 'Spectroscopy'],
      status: 'illustrative_sample',
      isIllustrative: true,
      createdAt: '2026-08-20T10:00:00Z'
    }
  ],
  matches: [],
  sprints: [
    {
      id: 'sp_groundwater_sample',
      buildCallId: 'call_groundwater',
      title: 'Groundwater optical probe calibration squad',
      description: 'Illustrative Demonstration: Assembling optical probe enclosure, testing ADC response curves, and validating telemetry.',
      domain: 'climate',
      stage: 'forming',
      teamCapacity: 3,
      members: [
        { userId: 'usr_illustrative_1', squadRole: 'Hardware Lead', displayName: 'Field Engineer (Sample)', avatarSeed: 'gw-1' }
      ],
      skillTags: ['Climate', 'Hardware'],
      startDate: '2026-08-25',
      endDate: '2026-09-08',
      daysTotal: 14,
      daysLeft: 9,
      progressPct: 33,
      isIllustrative: true,
      statusHint: 'Illustrative demonstration cycle'
    }
  ],
  notebook_entries: [
    {
      id: 'entry_groundwater_sample',
      authorId: 'usr_illustrative_1',
      authorName: 'Canopy Research Note (Sample)',
      sprintId: 'sp_groundwater_sample',
      grownFromLabel: 'grown from Sprint: Groundwater Sensor (Sample)',
      title: 'Field calibration benchmarks under high turbidity (Illustrative)',
      domain: 'climate',
      entryType: 'post-mortem',
      summarySnippet: 'Illustrative Sample: Baseline drift analysis during high sediment conditions with median window filtering.',
      teaser: 'cal_curve.py → median_filter(raw_adc, window=5)',
      bodyMarkdown: '### Illustrative Demonstration Note\nThis note illustrates how Canopy teams publish candid teardowns and post-mortems after sprint cycles.\n\n### Finding\nSediment scattering produced analog drift; resolved with physical baffles and software filtering.',
      tags: ['Climate', 'illustrative-sample'],
      isIllustrative: true,
      createdAt: '2026-09-02T10:00:00Z',
      branches: []
    }
  ],
  applications: [],
  moderation_queue: [],
  audit_events: [],
  user_roles: [],
  content_items: [
    {
      id: 'cnt_hero_headline',
      contentKey: 'home.hero.headline',
      contentType: 'statement',
      title: 'Home Hero Headline',
      body: 'Where Capable People Build What Matters.',
      summary: 'Main landing page bold mission headline',
      status: 'published',
      visibility: 'public',
      isIllustrative: false,
      sortOrder: 1,
      version: 1,
      publishedAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z'
    },
    {
      id: 'cnt_hero_subheadline',
      contentKey: 'home.hero.subheadline',
      contentType: 'statement',
      title: 'Home Hero Subheadline',
      body: 'Canopy connects engineers, researchers, and field specialists to scope, staff, and ship open climate & civic hardware and software.',
      summary: 'Landing page secondary explanation copy',
      status: 'published',
      visibility: 'public',
      isIllustrative: false,
      sortOrder: 2,
      version: 1,
      publishedAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z'
    },
    {
      id: 'cnt_beta_announcement',
      contentKey: 'home.private_beta_banner',
      contentType: 'announcement',
      title: 'Private Beta Announcement Banner',
      body: '🌱 Private Beta Open: Cohort 1 submissions are being reviewed on a rolling basis.',
      summary: 'Banner appearing across all marketing headers',
      status: 'published',
      visibility: 'public',
      isIllustrative: false,
      sortOrder: 3,
      version: 1,
      publishedAt: '2026-08-15T00:00:00Z',
      createdAt: '2026-08-15T00:00:00Z'
    },
    {
      id: 'cnt_founder_quote',
      contentKey: 'home.founder_quote',
      contentType: 'statement',
      title: 'Founder Perspective Quote',
      body: 'The talent is there. The problems are there. What is missing is the scaffold that turns good intentions into shipped reality.',
      summary: 'Quote attributed to founder Aarushi Chatterjee',
      status: 'published',
      visibility: 'public',
      isIllustrative: false,
      sortOrder: 4,
      version: 1,
      publishedAt: '2026-08-01T00:00:00Z',
      createdAt: '2026-08-01T00:00:00Z'
    },
    {
      id: 'cnt_gw_notice',
      contentKey: 'match.illustrative_example',
      contentType: 'example_notice',
      title: 'Illustrative Example Notice',
      body: 'Illustrative Example — This workspace demonstrates how Canopy works. It is not a live opportunity and is not accepting applications.',
      summary: 'Disclaimer badge on illustrative product loop demo',
      status: 'published',
      visibility: 'public',
      isIllustrative: true,
      sortOrder: 5,
      version: 1,
      publishedAt: '2026-08-20T00:00:00Z',
      createdAt: '2026-08-20T00:00:00Z'
    }
  ],
  platform_settings: [
    {
      key: 'listing_limits',
      value: { calls: 20, sprints: 20, notebook: 30 },
      description: 'Default card pagination and listing limits for public directories',
      updatedBy: 'system_bootstrap',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z'
    },
    {
      key: 'feature_flags',
      value: {
        allowPublicNotebookPublishing: true,
        showIllustrativeItems: true,
        requireModerationForCalls: true
      },
      description: 'Platform operational feature flags and moderation controls',
      updatedBy: 'system_bootstrap',
      createdAt: '2026-08-01T00:00:00Z',
      updatedAt: '2026-08-01T00:00:00Z'
    }
  ]
};

const os = require('os');

const TMP_DB_FILE = path.join(os.tmpdir(), 'canopy-db.json');
const STORAGE_BUCKET = 'canopy_store';
const STORAGE_FILE = 'canopy-db.json';

let inMemoryDb = null;
let lastRemoteSync = 0;
const SYNC_THROTTLE_MS = 2500;

function isIsolated() {
  return process.env.CANOPY_ISOLATE_STORE === 'true' || process.env.NODE_ENV === 'test';
}

function readDb() {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  // 1. In serverless / test mode, check tmp file first if fresher
  if (fs.existsSync(TMP_DB_FILE)) {
    try {
      const raw = fs.readFileSync(TMP_DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(raw);
      for (const [col, defaultVal] of Object.entries(INITIAL_DATA)) {
        if (!Array.isArray(inMemoryDb[col])) {
          inMemoryDb[col] = JSON.parse(JSON.stringify(defaultVal));
        }
      }
      return inMemoryDb;
    } catch (_) {}
  }

  // 2. Read from repo DB_FILE
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf-8');
      inMemoryDb = JSON.parse(raw);
      for (const [col, defaultVal] of Object.entries(INITIAL_DATA)) {
        if (!Array.isArray(inMemoryDb[col])) {
          inMemoryDb[col] = JSON.parse(JSON.stringify(defaultVal));
        }
      }
      return inMemoryDb;
    }
  } catch (err) {
    console.error('[Canopy Store] DB_FILE read error:', err.message);
  }

  // 3. Fallback to INITIAL_DATA
  inMemoryDb = JSON.parse(JSON.stringify(INITIAL_DATA));
  return inMemoryDb;
}

function writeDb(data) {
  inMemoryDb = data;
  const jsonStr = JSON.stringify(data, null, 2);

  // Write to primary DB_FILE if writable
  try {
    fs.writeFileSync(DB_FILE, jsonStr, 'utf-8');
  } catch (_) {
    // Expected on read-only serverless filesystems (e.g. AWS Lambda / Vercel)
  }

  // Always write to OS tmpdir for local container durability
  try {
    fs.writeFileSync(TMP_DB_FILE, jsonStr, 'utf-8');
  } catch (_) {}

  // Asynchronously sync to Supabase Storage if configured
  try {
    const { supabase, isConfigured } = require('../config/supabase');
    if (isConfigured() && supabase) {
      supabase.storage
        .from(STORAGE_BUCKET)
        .upload(STORAGE_FILE, jsonStr, { contentType: 'application/json', upsert: true })
        .then(() => {
          lastRemoteSync = Date.now();
        })
        .catch(err => {
          console.warn('[Canopy Store:AsyncUpload:Warn]', err.message);
        });
    }
  } catch (_) {}

  return true;
}

const store = {
  resetTestDb() {
    inMemoryDb = JSON.parse(JSON.stringify(INITIAL_DATA));
  },

  async ensureSynced(force = false) {
    if (isIsolated()) {
      return inMemoryDb || readDb();
    }
    const now = Date.now();
    if (!force && lastRemoteSync && (now - lastRemoteSync) < SYNC_THROTTLE_MS) {
      return inMemoryDb || readDb();
    }
    try {
      const { supabase, isConfigured } = require('../config/supabase');
      if (isConfigured() && supabase) {
        const { data, error } = await supabase.storage.from(STORAGE_BUCKET).download(STORAGE_FILE);
        if (!error && data) {
          const text = await data.text();
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') {
            // MERGE: Preserve any local in-memory users and profiles that are newer or not yet synced
            if (inMemoryDb && Array.isArray(inMemoryDb.users)) {
              if (!Array.isArray(parsed.users)) parsed.users = [];
              for (const localUser of inMemoryDb.users) {
                const remoteIdx = parsed.users.findIndex(u => 
                  u.id === localUser.id || 
                  (u.email && localUser.email && u.email.toLowerCase() === localUser.email.toLowerCase())
                );
                if (remoteIdx === -1) {
                  parsed.users.unshift(localUser);
                } else if (localUser.isVerified && !parsed.users[remoteIdx].isVerified) {
                  parsed.users[remoteIdx] = localUser;
                }
              }
            }
            if (inMemoryDb && Array.isArray(inMemoryDb.profiles)) {
              if (!Array.isArray(parsed.profiles)) parsed.profiles = [];
              for (const localProf of inMemoryDb.profiles) {
                if (!parsed.profiles.some(p => p.id === localProf.id || p.userId === localProf.userId)) {
                  parsed.profiles.unshift(localProf);
                }
              }
            }
            for (const [col, defaultVal] of Object.entries(INITIAL_DATA)) {
              if (!Array.isArray(parsed[col])) {
                parsed[col] = inMemoryDb && Array.isArray(inMemoryDb[col]) 
                  ? inMemoryDb[col] 
                  : JSON.parse(JSON.stringify(defaultVal));
              }
            }

            inMemoryDb = parsed;
            lastRemoteSync = now;
            try {
              fs.writeFileSync(TMP_DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
            } catch (_) {}
            try {
              fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
            } catch (_) {}
            return inMemoryDb;
          }
        }
      }
    } catch (err) {
      // Remote download graceful fallback
    }
    lastRemoteSync = now;
    return inMemoryDb || readDb();
  },

  async persistRemote() {
    const db = inMemoryDb || readDb();
    try {
      const { supabase, isConfigured } = require('../config/supabase');
      if (isConfigured() && supabase) {
        const payload = JSON.stringify(db, null, 2);
        const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(STORAGE_FILE, payload, {
          contentType: 'application/json',
          upsert: true
        });
        if (error) {
          console.warn('[Canopy Store] Remote upload warning:', error.message);
        } else {
          lastRemoteSync = Date.now();
        }
      }
    } catch (err) {
      console.warn('[Canopy Store] Remote upload warning:', err.message);
    }
    return db;
  },

  getCollection(name) {
    const db = readDb();
    if (!Array.isArray(db[name])) {
      db[name] = INITIAL_DATA[name] ? JSON.parse(JSON.stringify(INITIAL_DATA[name])) : [];
    }
    return db[name];
  },

  getItem(name, predicate) {
    const coll = this.getCollection(name);
    return coll.find(predicate) || null;
  },

  addItem(name, item) {
    const db = readDb();
    if (!db[name]) db[name] = [];
    db[name].unshift(item);
    writeDb(db);
    return item;
  },

  updateItem(name, predicate, updates) {
    const db = readDb();
    if (!db[name]) return null;
    const index = db[name].findIndex(predicate);
    if (index === -1) return null;
    db[name][index] = { ...db[name][index], ...updates, updatedAt: new Date().toISOString() };
    writeDb(db);
    return db[name][index];
  },

  deleteItem(name, predicate) {
    const db = readDb();
    if (!db[name]) return false;
    const initialLen = db[name].length;
    db[name] = db[name].filter(item => !predicate(item));
    writeDb(db);
    return db[name].length < initialLen;
  },

  // Supabase Live Client & Query Helpers
  supabase: require('../config/supabase').supabase,
  isLiveDb: () => require('../config/supabase').isConfigured(),

  async fromSupabase(table) {
    const { supabase, isConfigured } = require('../config/supabase');
    if (!isConfigured() || !supabase) {
      return null;
    }
    return supabase.from(table);
  }
};

module.exports = { store };
