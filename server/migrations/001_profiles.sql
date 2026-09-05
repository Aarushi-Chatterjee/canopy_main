-- 001_profiles.sql: Users and Profiles Schema with Timestamps and Constraints
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(32) NOT NULL DEFAULT 'builder' CHECK (role IN ('builder', 'problem_holder', 'enabler', 'admin')),
    display_name VARCHAR(128) NOT NULL,
    verification_token VARCHAR(32),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    reset_token VARCHAR(32),
    reset_expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS profiles (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(128) NOT NULL,
    headline VARCHAR(255),
    bio TEXT,
    avatar_url VARCHAR(255),
    primary_domain VARCHAR(64) NOT NULL CHECK (primary_domain IN ('climate', 'health', 'education', 'civic', 'hardware', 'ai')),
    skill_tags TEXT[] DEFAULT '{}',
    proof_of_work JSONB DEFAULT '[]',
    hours_per_week INT DEFAULT 10,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_profiles_domain ON profiles(primary_domain);
