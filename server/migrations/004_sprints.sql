-- 004_sprints.sql: Sprints, Squad Rosters, and Cycles
CREATE TABLE IF NOT EXISTS sprints (
    id VARCHAR(64) PRIMARY KEY,
    build_call_id VARCHAR(64) REFERENCES build_calls(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    domain VARCHAR(64) NOT NULL CHECK (domain IN ('climate', 'health', 'education', 'civic', 'hardware', 'ai')),
    stage VARCHAR(32) NOT NULL DEFAULT 'forming' CHECK (stage IN ('forming', 'building', 'shipped')),
    team_capacity INT NOT NULL DEFAULT 3,
    members JSONB DEFAULT '[]',
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

CREATE INDEX IF NOT EXISTS idx_sprints_stage ON sprints(stage);
CREATE INDEX IF NOT EXISTS idx_sprints_domain ON sprints(domain);
