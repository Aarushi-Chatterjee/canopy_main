-- 013_manual_matching_fields.sql
-- Extension fields for founder-facilitated manual matching, fit notes, and consent-gated contact release

ALTER TABLE matches ADD COLUMN IF NOT EXISTS assigned_curator_id TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS curator_notes TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS internal_fit_score INT DEFAULT 85;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS recipient_consent_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS requester_consent_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS contact_released_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS contact_released_by TEXT;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS introduction_sent_at TIMESTAMPTZ;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;
