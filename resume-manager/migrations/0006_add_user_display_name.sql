-- =============================================================================
-- Migration: 0006_add_user_display_name.sql
-- Target Platform: Cloudflare D1 (SQLite)
-- Purpose: Add display_name column to users and backfill existing Owner profile.
-- =============================================================================

ALTER TABLE users ADD COLUMN display_name TEXT;

UPDATE users
SET display_name = 'Krishna M S'
WHERE id = 'dev-user-default-123';