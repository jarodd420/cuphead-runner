-- Fam app: scalable schema for PostgreSQL
-- Run this once on your Postgres instance (e.g. Supabase SQL editor, or psql)

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  cover_url TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  body TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_moments_user_id ON moments(user_id);
CREATE INDEX IF NOT EXISTS idx_moments_created_at ON moments(created_at DESC);

-- Fams: groups (families). Users can be in many fams; timeline shows moments from fam members only.
CREATE TABLE IF NOT EXISTS fams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL DEFAULT 'My Fam',
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fams_created_by ON fams(created_by);

CREATE TABLE IF NOT EXISTS fam_members (
  fam_id INTEGER NOT NULL REFERENCES fams(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  invited_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (fam_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_fam_members_fam_id ON fam_members(fam_id);
CREATE INDEX IF NOT EXISTS idx_fam_members_user_id ON fam_members(user_id);

-- Pending invites by email (for users not yet signed up). Cleared when they join.
CREATE TABLE IF NOT EXISTS fam_invites (
  id SERIAL PRIMARY KEY,
  fam_id INTEGER NOT NULL REFERENCES fams(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fam_id, email)
);
CREATE INDEX IF NOT EXISTS idx_fam_invites_email ON fam_invites(LOWER(email));

CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  moment_id INTEGER NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_moment_id ON comments(moment_id);

CREATE TABLE IF NOT EXISTS reactions (
  id SERIAL PRIMARY KEY,
  moment_id INTEGER NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(moment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reactions_moment_id ON reactions(moment_id);

-- Session store for connect-pg-simple (optional, for multi-instance scaling)
CREATE TABLE IF NOT EXISTS session (
  sid VARCHAR(36) PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);
