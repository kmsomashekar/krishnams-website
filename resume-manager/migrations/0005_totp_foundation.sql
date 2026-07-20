-- =============================================================================
-- Migration: 0005_totp_foundation.sql
-- Target Platform: Cloudflare D1 (SQLite)
-- Purpose: Introduce totp_secrets storage table with strict verification bounds.
-- =============================================================================

CREATE TABLE IF NOT EXISTS totp_secrets (
    user_id TEXT PRIMARY KEY NOT NULL,
    encrypted_secret TEXT NOT NULL,
    is_verified INTEGER NOT NULL DEFAULT 0 CHECK(is_verified IN (0, 1)),
    created_at TEXT NOT NULL,
    verified_at TEXT,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);