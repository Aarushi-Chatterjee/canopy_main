-- 012_content_items.sql
-- Content Studio records: announcements, cards, hero statements, illustrative examples

CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  content_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL CHECK (
    content_type IN ('statement', 'announcement', 'card', 'example_notice', 'metadata', 'hero')
  ),
  title TEXT,
  summary TEXT,
  body TEXT,
  image_url TEXT,
  alt_text TEXT,
  link_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (
    status IN ('draft', 'pending_review', 'approved', 'published', 'scheduled', 'archived')
  ),
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (
    visibility IN ('public', 'private_beta', 'members_only')
  ),
  is_illustrative BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT DEFAULT 0,
  version INT DEFAULT 1,
  published_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by TEXT,
  updated_by TEXT,
  approved_by TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_items_key ON content_items(content_key);
CREATE INDEX IF NOT EXISTS idx_content_items_status ON content_items(status);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON content_items(content_type);
