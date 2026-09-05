-- 005_notebook_entries.sql: Lab Notebook Entries, Teardowns, and Discussion Branches
CREATE TABLE IF NOT EXISTS notebook_entries (
    id VARCHAR(64) PRIMARY KEY,
    author_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(128) NOT NULL,
    sprint_id VARCHAR(64) REFERENCES sprints(id) ON DELETE SET NULL,
    parent_entry_id VARCHAR(64) REFERENCES notebook_entries(id) ON DELETE SET NULL,
    grown_from_label VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    domain VARCHAR(64) NOT NULL CHECK (domain IN ('climate', 'health', 'education', 'civic', 'hardware', 'ai')),
    entry_type VARCHAR(64) NOT NULL DEFAULT 'field-report',
    summary_snippet TEXT NOT NULL,
    body_markdown TEXT NOT NULL,
    teaser VARCHAR(255),
    tags TEXT[] DEFAULT '{}',
    branches JSONB DEFAULT '[]',
    moderation_status VARCHAR(32) NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'flagged', 'hidden')),
    is_illustrative BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notebook_author ON notebook_entries(author_id);
CREATE INDEX IF NOT EXISTS idx_notebook_domain ON notebook_entries(domain);
CREATE INDEX IF NOT EXISTS idx_notebook_parent ON notebook_entries(parent_entry_id);
