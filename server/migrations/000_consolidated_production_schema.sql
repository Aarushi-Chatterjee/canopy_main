-- ============================================================================
-- CANOPY EARTH: CONSOLIDATED PRODUCTION DATABASE SCHEMA
-- Version: 2.5.0
-- Idempotent: Can be safely executed in Supabase SQL Editor multiple times
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(32) NOT NULL DEFAULT 'builder',
    display_name VARCHAR(128) NOT NULL,
    oauth_provider VARCHAR(64),
    verification_token VARCHAR(32),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verification_expires_at TIMESTAMPTZ,
    verification_attempts INT DEFAULT 0,
    last_verification_sent_at TIMESTAMPTZ,
    reset_token VARCHAR(32),
    reset_expires_at TIMESTAMPTZ,
    reset_attempts INT DEFAULT 0,
    revoked_after TIMESTAMPTZ,
    is_suspended BOOLEAN DEFAULT FALSE,
    suspended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure incremental columns exist on any pre-existing table
ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_verification_sent_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_attempts INT DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS revoked_after TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- 2. PROFILES TABLE
CREATE TABLE IF NOT EXISTS profiles (
    id VARCHAR(64),
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(128) NOT NULL,
    headline VARCHAR(255),
    bio TEXT,
    avatar_url VARCHAR(255),
    primary_domain VARCHAR(64) NOT NULL DEFAULT 'climate',
    skill_tags TEXT[] DEFAULT '{}',
    proof_of_work JSONB DEFAULT '[]',
    hours_per_week INT DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_profiles_domain ON profiles(primary_domain);

-- 3. BUILD CALLS TABLE
CREATE TABLE IF NOT EXISTS build_calls (
    id VARCHAR(64) PRIMARY KEY,
    creator_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    org_name VARCHAR(128) NOT NULL DEFAULT 'Open Lab',
    organization VARCHAR(128),
    problem_statement TEXT NOT NULL,
    domain VARCHAR(64) NOT NULL DEFAULT 'climate',
    target_deliverable TEXT NOT NULL DEFAULT 'Functional prototype code and field evaluation report',
    target_outcomes TEXT[] DEFAULT '{}',
    pilot_budget VARCHAR(64),
    reward_pool VARCHAR(64),
    timeline VARCHAR(64) DEFAULT '6 weeks',
    dataset_access_url VARCHAR(512),
    contact_channel VARCHAR(512),
    needed_skills TEXT[] DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'open',
    moderation_status VARCHAR(32) NOT NULL DEFAULT 'approved',
    is_illustrative BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE build_calls ADD COLUMN IF NOT EXISTS organization VARCHAR(128);
ALTER TABLE build_calls ADD COLUMN IF NOT EXISTS reward_pool VARCHAR(64);
ALTER TABLE build_calls ADD COLUMN IF NOT EXISTS timeline VARCHAR(64) DEFAULT '6 weeks';
ALTER TABLE build_calls ADD COLUMN IF NOT EXISTS contact_channel VARCHAR(512);
ALTER TABLE build_calls ADD COLUMN IF NOT EXISTS target_outcomes TEXT[] DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_build_calls_domain ON build_calls(domain);
CREATE INDEX IF NOT EXISTS idx_build_calls_status ON build_calls(status);
CREATE INDEX IF NOT EXISTS idx_build_calls_creator ON build_calls(creator_id);

-- 4. MATCHES TABLE
CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(64) PRIMARY KEY,
    requester_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    build_call_id VARCHAR(64) REFERENCES build_calls(id) ON DELETE SET NULL,
    intent_note TEXT NOT NULL DEFAULT '',
    proposed_role VARCHAR(64) DEFAULT 'Collaborator',
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    stage VARCHAR(32) DEFAULT 'proposed',
    assigned_curator_id VARCHAR(64),
    curator_notes TEXT,
    internal_fit_score INT DEFAULT 85,
    mutual_consent BOOLEAN DEFAULT FALSE,
    recipient_consent_at TIMESTAMPTZ,
    requester_consent_at TIMESTAMPTZ,
    contact_released_at TIMESTAMPTZ,
    contact_released_by VARCHAR(64),
    introduction_sent_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    revealed_contact JSONB,
    match_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE matches ADD COLUMN IF NOT EXISTS stage VARCHAR(32) DEFAULT 'proposed';
ALTER TABLE matches ADD COLUMN IF NOT EXISTS assigned_curator_id VARCHAR(64);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS curator_notes TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS internal_fit_score INT DEFAULT 85;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS mutual_consent BOOLEAN DEFAULT FALSE;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS recipient_consent_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS requester_consent_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS contact_released_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS contact_released_by VARCHAR(64);
ALTER TABLE matches ADD COLUMN IF NOT EXISTS introduction_sent_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS match_metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_matches_requester ON matches(requester_id);
CREATE INDEX IF NOT EXISTS idx_matches_recipient ON matches(recipient_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- 5. SPRINTS TABLE
CREATE TABLE IF NOT EXISTS sprints (
    id VARCHAR(64) PRIMARY KEY,
    build_call_id VARCHAR(64) REFERENCES build_calls(id) ON DELETE SET NULL,
    creator_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    domain VARCHAR(64) NOT NULL DEFAULT 'climate',
    stage VARCHAR(32) NOT NULL DEFAULT 'forming',
    status VARCHAR(32) DEFAULT 'planning',
    team_capacity INT NOT NULL DEFAULT 3,
    members JSONB DEFAULT '[]',
    participants JSONB DEFAULT '[]',
    skill_tags TEXT[] DEFAULT '{}',
    start_date DATE,
    end_date DATE,
    days_total INT DEFAULT 14,
    days_left INT DEFAULT 14,
    progress_pct INT DEFAULT 0,
    status_hint VARCHAR(128),
    shipped_artifact_url VARCHAR(512),
    is_illustrative BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE sprints ADD COLUMN IF NOT EXISTS creator_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS status VARCHAR(32) DEFAULT 'planning';
ALTER TABLE sprints ADD COLUMN IF NOT EXISTS participants JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_sprints_stage ON sprints(stage);
CREATE INDEX IF NOT EXISTS idx_sprints_domain ON sprints(domain);

-- 6. NOTEBOOK ENTRIES TABLE
CREATE TABLE IF NOT EXISTS notebook_entries (
    id VARCHAR(64) PRIMARY KEY,
    author_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(128) NOT NULL DEFAULT 'Field Contributor',
    sprint_id VARCHAR(64) REFERENCES sprints(id) ON DELETE SET NULL,
    parent_entry_id VARCHAR(64) REFERENCES notebook_entries(id) ON DELETE SET NULL,
    grown_from_label VARCHAR(255) DEFAULT 'Independent Field Note',
    title VARCHAR(255) NOT NULL,
    domain VARCHAR(64) NOT NULL DEFAULT 'climate',
    entry_type VARCHAR(64) NOT NULL DEFAULT 'field-report',
    summary_snippet TEXT NOT NULL DEFAULT '',
    body_markdown TEXT NOT NULL DEFAULT '',
    teaser VARCHAR(255),
    tags TEXT[] DEFAULT '{}',
    branches JSONB DEFAULT '[]',
    moderation_status VARCHAR(32) NOT NULL DEFAULT 'approved',
    is_illustrative BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notebook_author ON notebook_entries(author_id);
CREATE INDEX IF NOT EXISTS idx_notebook_domain ON notebook_entries(domain);
CREATE INDEX IF NOT EXISTS idx_notebook_parent ON notebook_entries(parent_entry_id);

-- 7. APPLICATIONS TABLE
CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL DEFAULT 'builder',
    domain VARCHAR(64) NOT NULL DEFAULT 'climate',
    proof_of_work_link VARCHAR(512),
    motivation_note TEXT,
    cover_note TEXT,
    call_id VARCHAR(64) REFERENCES build_calls(id) ON DELETE SET NULL,
    builder_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_review',
    reviewer_notes TEXT,
    reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    applied_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE applications ADD COLUMN IF NOT EXISTS cover_note TEXT;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS call_id VARCHAR(64) REFERENCES build_calls(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS builder_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS applied_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);

-- 8. MODERATION QUEUE TABLE
CREATE TABLE IF NOT EXISTS moderation_queue (
    id VARCHAR(64) PRIMARY KEY,
    entity_type VARCHAR(64) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending',
    flagged_reason VARCHAR(255),
    submitted_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_status ON moderation_queue(status);

-- 9. AUDIT EVENTS TABLE (IMMUTABLE LEDGER)
CREATE TABLE IF NOT EXISTS audit_events (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64) NOT NULL,
    actor_role VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    target_type VARCHAR(64) NOT NULL,
    target_id VARCHAR(64) NOT NULL,
    payload JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_events(created_at DESC);

-- 10. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- 11. USER ROLES TABLE
CREATE TABLE IF NOT EXISTS user_roles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(64) NOT NULL,
    granted_by VARCHAR(64) NOT NULL,
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    revoked_at TIMESTAMPTZ,
    revoked_by VARCHAR(64),
    internal_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- 12. CONTENT ITEMS TABLE (CONTENT STUDIO)
CREATE TABLE IF NOT EXISTS content_items (
    id VARCHAR(64) PRIMARY KEY,
    content_key VARCHAR(128) NOT NULL,
    content_type VARCHAR(64) NOT NULL,
    page VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    body TEXT,
    metadata JSONB DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'draft',
    version INT DEFAULT 1,
    is_illustrative BOOLEAN DEFAULT FALSE,
    created_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    published_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_key ON content_items(content_key);
CREATE INDEX IF NOT EXISTS idx_content_page ON content_items(page);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE build_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE moderation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;

-- Note: The Canopy Backend API connects using the SUPABASE_SERVICE_ROLE_KEY which
-- safely bypasses RLS for server-side business logic and permission enforcement.
-- The policies below govern direct client access with SUPABASE_ANON_KEY.

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Approved build calls are viewable by everyone" ON build_calls;
CREATE POLICY "Approved build calls are viewable by everyone" ON build_calls FOR SELECT USING (moderation_status = 'approved');

DROP POLICY IF EXISTS "Sprints are viewable by everyone" ON sprints;
CREATE POLICY "Sprints are viewable by everyone" ON sprints FOR SELECT USING (true);

DROP POLICY IF EXISTS "Approved notebook entries are viewable by everyone" ON notebook_entries;
CREATE POLICY "Approved notebook entries are viewable by everyone" ON notebook_entries FOR SELECT USING (moderation_status = 'approved');

DROP POLICY IF EXISTS "Published content is viewable by everyone" ON content_items;
CREATE POLICY "Published content is viewable by everyone" ON content_items FOR SELECT USING (status = 'published');

DROP POLICY IF EXISTS "Anyone can submit an intake application" ON applications;
CREATE POLICY "Anyone can submit an intake application" ON applications FOR INSERT WITH CHECK (true);
