-- 011_user_roles.sql
-- Discrete multi-tier role assignments for Canopy operations and access governance

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role TEXT NOT NULL CHECK (
    role IN (
      'visitor',
      'registered_user',
      'approved_builder',
      'approved_problem_holder',
      'approved_enabler',
      'content_editor',
      'match_curator',
      'moderator',
      'admin',
      'owner'
    )
  ),
  granted_by UUID,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked_at TIMESTAMPTZ,
  internal_note TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
