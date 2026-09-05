-- 003_matches.sql: Match Sandboxes and Reciprocal Handshakes
CREATE TABLE IF NOT EXISTS matches (
    id VARCHAR(64) PRIMARY KEY,
    requester_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    build_call_id VARCHAR(64) REFERENCES build_calls(id) ON DELETE SET NULL,
    intent_note TEXT NOT NULL,
    proposed_role VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'connected', 'declined', 'archived')),
    revealed_contact JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_requester ON matches(requester_id);
CREATE INDEX IF NOT EXISTS idx_matches_recipient ON matches(recipient_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
