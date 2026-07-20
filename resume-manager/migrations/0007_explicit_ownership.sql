-- =============================================================================
-- Migration: 0007_explicit_ownership.sql
-- Target Platform: Cloudflare D1 (SQLite)
-- Purpose: Add explicit is_owner column to users table and establish canonical owner.
-- =============================================================================

ALTER TABLE users ADD COLUMN is_owner INTEGER NOT NULL DEFAULT 0 CHECK(is_owner IN (0, 1));

UPDATE users
SET is_owner = 1, updated_at = CURRENT_TIMESTAMP
WHERE id = 'dev-user-default-123';

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_single_owner
ON users(is_owner)
WHERE is_owner = 1;