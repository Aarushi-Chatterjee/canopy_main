-- 007_moderation_queue.sql: Content Moderation and Safety Review
CREATE TABLE IF NOT EXISTS moderation_queue (
    id VARCHAR(64) PRIMARY KEY,
    entity_type VARCHAR(64) NOT NULL CHECK (entity_type IN ('build_call', 'notebook_entry', 'profile', 'match_note')),
    entity_id VARCHAR(64) NOT NULL,
    flagged_reason VARCHAR(128) NOT NULL,
    flagged_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    resolution_note TEXT,
    resolved_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moderation_status ON moderation_queue(status);
CREATE INDEX IF NOT EXISTS idx_moderation_entity ON moderation_queue(entity_type, entity_id);
