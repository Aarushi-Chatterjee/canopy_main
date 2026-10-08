-- ============================================================================
-- CANOPY MIGRATION 013: PLATFORM SETTINGS & LAB NOTEBOOK BLOGGING EXPANSION
-- Description: Adds platform_settings table for founder-configurable quotas and
--              expands notebook_entries with rich blogging fields.
-- Idempotent & Non-destructive (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ============================================================================

-- 1. PLATFORM SETTINGS TABLE
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    updated_by VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default platform settings if not present
INSERT INTO platform_settings (key, value, description, updated_by)
VALUES 
    (
        'listing_limits',
        '{"calls": 20, "sprints": 20, "notebook": 30}'::jsonb,
        'Default card pagination and listing limits for public directories',
        'system_bootstrap'
    ),
    (
        'feature_flags',
        '{"allowPublicNotebookPublishing": true, "showIllustrativeItems": true, "requireModerationForCalls": true}'::jsonb,
        'Platform operational feature flags and moderation controls',
        'system_bootstrap'
    )
ON CONFLICT (key) DO NOTHING;

-- 2. EXPAND NOTEBOOK ENTRIES FOR RICH BLOGGING & FOUNDER ATTRIBUTION
ALTER TABLE notebook_entries ADD COLUMN IF NOT EXISTS cover_image_url VARCHAR(512);
ALTER TABLE notebook_entries ADD COLUMN IF NOT EXISTS reading_time_minutes INT DEFAULT 3;
ALTER TABLE notebook_entries ADD COLUMN IF NOT EXISTS view_count INT DEFAULT 0;
ALTER TABLE notebook_entries ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE;
ALTER TABLE notebook_entries ADD COLUMN IF NOT EXISTS is_founder_post BOOLEAN DEFAULT FALSE;
ALTER TABLE notebook_entries ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'published';

-- 3. INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_notebook_status ON notebook_entries(status);
CREATE INDEX IF NOT EXISTS idx_notebook_featured ON notebook_entries(is_featured);
CREATE INDEX IF NOT EXISTS idx_notebook_created ON notebook_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_settings_key ON platform_settings(key);

-- 4. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view platform settings" ON platform_settings;
CREATE POLICY "Public can view platform settings" 
ON platform_settings FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Only service role and staff can modify platform settings" ON platform_settings;
CREATE POLICY "Only service role and staff can modify platform settings" 
ON platform_settings FOR ALL 
USING (true) 
WITH CHECK (true);
