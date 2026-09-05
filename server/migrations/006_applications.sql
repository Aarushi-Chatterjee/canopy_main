-- 006_applications.sql: Member Intake and Curator Review Pipeline
CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL CHECK (role IN ('builder', 'problem_holder', 'enabler')),
    domain VARCHAR(64) NOT NULL CHECK (domain IN ('climate', 'health', 'education', 'civic', 'hardware', 'ai')),
    proof_of_work_link VARCHAR(512),
    motivation_note TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'in_review', 'accepted', 'waitlisted', 'declined')),
    reviewer_notes TEXT,
    reviewed_by VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_email ON applications(email);
