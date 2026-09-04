-- ============================================================
-- CANOPY POSTGRESQL / SUPABASE DATABASE SCHEMA & SEED SCRIPT
-- Run this in your Supabase SQL Editor to initialize all tables
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users & Accounts
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    role VARCHAR(32) NOT NULL DEFAULT 'builder' CHECK (role IN ('builder', 'problem_holder', 'enabler')),
    display_name VARCHAR(128) NOT NULL,
    verification_token VARCHAR(32),
    is_verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Profiles
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

-- 3. Build Calls
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Matches & Verified Handshakes
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

-- 5. Sprints & Squads
CREATE TABLE IF NOT EXISTS sprints (
    id VARCHAR(64) PRIMARY KEY,
    build_call_id VARCHAR(64) REFERENCES build_calls(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    domain VARCHAR(64) NOT NULL,
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Lab Notebook Entries & Discussion Branches
CREATE TABLE IF NOT EXISTS notebook_entries (
    id VARCHAR(64) PRIMARY KEY,
    author_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name VARCHAR(128) NOT NULL,
    sprint_id VARCHAR(64) REFERENCES sprints(id) ON DELETE SET NULL,
    parent_entry_id VARCHAR(64) REFERENCES notebook_entries(id) ON DELETE SET NULL,
    grown_from_label VARCHAR(255),
    title VARCHAR(255) NOT NULL,
    domain VARCHAR(64) NOT NULL CHECK (domain IN ('climate', 'health', 'education', 'civic', 'hardware', 'ai')),
    entry_type VARCHAR(64) NOT NULL,
    summary_snippet TEXT NOT NULL,
    body_markdown TEXT NOT NULL,
    teaser VARCHAR(255),
    tags TEXT[] DEFAULT '{}',
    branches JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Applications Intake
CREATE TABLE IF NOT EXISTS applications (
    id VARCHAR(64) PRIMARY KEY,
    full_name VARCHAR(128) NOT NULL,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(32) NOT NULL,
    domain VARCHAR(64) NOT NULL,
    proof_of_work_link VARCHAR(512),
    motivation_note TEXT,
    status VARCHAR(32) NOT NULL DEFAULT 'verified',
    submitted_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- INITIAL SEED DATA
-- ============================================================

-- Users
INSERT INTO users (id, email, role, display_name, is_verified, verified_at, created_at)
VALUES 
    ('usr_elena', 'elena.r@example.org', 'builder', 'Elena R.', true, '2026-08-15T10:00:00Z', '2026-08-01T09:00:00Z'),
    ('usr_water_ngo', 'team@ruralwateralliance.org', 'problem_holder', 'Rural Water Alliance', true, '2026-08-10T12:00:00Z', '2026-07-25T14:30:00Z'),
    ('usr_maya', 'maya.l@catalystfund.org', 'enabler', 'Maya L.', true, '2026-08-18T16:00:00Z', '2026-08-05T11:00:00Z'),
    ('usr_aarushi', 'aarushi@canopy.earth', 'builder', 'Aarushi Chatterjee', true, '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z')
ON CONFLICT (id) DO NOTHING;

-- Profiles
INSERT INTO profiles (user_id, display_name, headline, bio, primary_domain, skill_tags, avatar_url, hours_per_week)
VALUES
    ('usr_elena', 'Elena R.', 'Hardware & Embedded Systems Engineer', 'Designing low-power LoRa telemetry boards for remote soil and water sensing in drought-stressed basins.', 'hardware', ARRAY['Hardware', 'Embedded C', 'LoRaWAN', 'PCB Design'], '/avatars/avatar-builders.png', 15),
    ('usr_water_ngo', 'Rural Water Alliance', 'Community Watershed Stewardship', 'Monitoring municipal and agrarian aquifers across 14 rural districts facing seasonal arsenic intrusion.', 'climate', ARRAY['Hydrology', 'Field Research', 'Civic Action', 'Open Data'], '/avatars/avatar-problem-holders.png', 20),
    ('usr_maya', 'Maya L.', 'Catalytic Climate Grant Steward', 'Deploying non-dilutive prototype micro-grants and open hardware stipends to grassroots climate execution squads.', 'climate', ARRAY['Grant Catalysis', 'Ecosystem Scaffolding', 'Hardware Stipends'], '/avatars/avatar-enablers.png', 8)
ON CONFLICT (user_id) DO NOTHING;

-- Build Calls
INSERT INTO build_calls (id, creator_id, title, org_name, problem_statement, domain, target_deliverable, pilot_budget, dataset_access_url, needed_skills, status)
VALUES
    ('call_groundwater', 'usr_water_ngo', 'Groundwater contamination sensor', 'Rural Water Alliance', 'Build a low-cost optical sensor that flags chemical contamination in real time. Pilot budget and an open dataset are already secured.', 'climate', 'Working optical sensing probe schematic and real-time telemetry firmware.', '$8,500 deployment grant', 'https://data.canopy.earth/sets/gw-sensor-2026', ARRAY['Hardware', 'Embedded C', 'Chemistry', 'LoRa'], 'open'),
    ('call_budget', 'usr_aarushi', 'A plain-language city budget explorer', 'Civic Open Data Collective', 'Municipal budget PDFs are technically public but unreadable to everyday citizens. We need an interactive reconciliation explorer.', 'civic', 'Interactive line-item difference engine and visual allocation treemap.', '$5,000 micro-grant', 'https://data.canopy.earth/sets/city-budget-csv', ARRAY['Data Viz', 'Full-stack', 'Civic Policy'], 'open'),
    ('call_tutor', 'usr_aarushi', 'Adaptive reading tutor for grade 3–5', 'Rural Literacy Foundation', 'Low-latency phonics recognition capable of running fully offline on low-spec donated classroom Android tablets.', 'education', 'Offline WebAssembly phonics scoring engine with touch-first accessibility.', '$6,000 pilot support', 'https://data.canopy.earth/sets/phonics-audio-sample', ARRAY['Full-stack', 'WebAssembly', 'Audio DSP'], 'open'),
    ('call_deforestation', 'usr_maya', 'Deforestation tracker from satellite feeds', 'Canopy Forest Watch', 'Automated weekly Sentinel-2 change detection pipeline flagging unauthorized road-building canopy incisions within 48 hours.', 'ai', 'PyTorch/ONNX inference worker emitting geoJSON bounding alerts.', '$10,000 compute credits', 'https://data.canopy.earth/sets/sentinel-slices', ARRAY['Computer Vision', 'PyTorch', 'GIS', 'Python'], 'open'),
    ('call_solar', 'usr_elena', 'Fault detection for village solar microgrids', 'SunShare Energy Access', 'Current inverter fault logs are siloed and unmonitored. We need a plug-and-play current sensing clip that alerts local technicians before battery banks drain.', 'hardware', 'ESP32 current-loop clamp sensor and alert daemon.', '$7,200 hardware stipend', 'https://data.canopy.earth/sets/inverter-telemetry', ARRAY['Hardware', 'Firmware', 'Power Electronics'], 'open'),
    ('call_triage', 'usr_aarushi', 'Offline sync architecture for clinic triage', 'Frontier Health Labs', 'Rural clinics operate with intermittent 2G coverage. Patient intake records collide and overwrite when reconnecting to central servers.', 'health', 'Conflict-free replicated data types (CRDT) sync client in TypeScript.', '$9,000 deployment pilot', 'https://data.canopy.earth/sets/clinic-records-anon', ARRAY['CRDTs', 'TypeScript', 'Offline First', 'Security'], 'open')
ON CONFLICT (id) DO NOTHING;

-- Sprints
INSERT INTO sprints (id, build_call_id, title, description, domain, stage, team_capacity, members, skill_tags, start_date, end_date, days_total, days_left, progress_pct, status_hint)
VALUES
    ('sp_1', 'call_budget', 'A plain-language city budget explorer', 'Municipal budget data is public but unreadable: the team is still coming together before the clock starts.', 'civic', 'forming', 3, '[{"userId":"usr_aarushi","squadRole":"Data Cleaning","displayName":"Aarushi C.","avatarSeed":"civic-budget-1"}]'::jsonb, ARRAY['Data Viz', 'Design'], '2026-09-10', '2026-09-24', 14, 14, 0, '1 of 3 spots filled'),
    ('sp_2', 'call_tutor', 'Adaptive reading tutor for grade 3–5', 'The idea is vivid. What is missing is a technical co-builder to bring it to life on offline classroom tablets.', 'education', 'forming', 2, '[{"userId":"usr_aarushi","squadRole":"Curriculum & Pedagogy","displayName":"Marcus W.","avatarSeed":"reading-tutor-1"}]'::jsonb, ARRAY['Full-stack'], '2026-09-12', '2026-09-26', 14, 14, 0, 'solo so far'),
    ('sp_3', 'call_groundwater', 'Groundwater contamination sensor', 'Assembling optical probe, writing ADC driver, and calibrating spectrophotometric absorption curves.', 'climate', 'building', 3, '[{"userId":"usr_elena","squadRole":"Hardware Lead","displayName":"Elena R.","avatarSeed":"gw-1"},{"userId":"usr_water_ngo","squadRole":"Field Hydrologist","displayName":"Kareem P.","avatarSeed":"gw-2"},{"userId":"usr_aarushi","squadRole":"Firmware Engineer","displayName":"Devon S.","avatarSeed":"gw-3"}]'::jsonb, ARRAY['Climate', 'Hardware'], '2026-08-25', '2026-09-08', 14, 9, 64, 'team locked for this cycle')
ON CONFLICT (id) DO NOTHING;
