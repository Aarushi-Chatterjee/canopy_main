-- 002_build_calls.sql: Problem Marketplace Build Calls
CREATE TABLE IF NOT EXISTS build_calls (
    id VARCHAR(64) PRIMARY KEY,
    creator_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    org_name VARCHAR(128) NOT NULL,
    problem_statement TEXT NOT NULL,
    domain VARCHAR(64) NOT NULL CHECK (domain IN ('climate', 'health', 'education', 'civic', 'hardware', 'ai')),
    target_deliverable TEXT NOT NULL,
    pilot_budget VARCHAR(64),
    dataset_access_url VARCHAR(512),
    needed_skills TEXT[] DEFAULT '{}',
    status VARCHAR(32) NOT NULL DEFAULT 'open' CHECK (status IN ('draft', 'open', 'in_sprint', 'archived')),
    moderation_status VARCHAR(32) NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    is_illustrative BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_build_calls_domain ON build_calls(domain);
CREATE INDEX IF NOT EXISTS idx_build_calls_status ON build_calls(status);
CREATE INDEX IF NOT EXISTS idx_build_calls_creator ON build_calls(creator_id);
