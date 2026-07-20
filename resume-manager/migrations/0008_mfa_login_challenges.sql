-- =============================================================================
-- Migration: 0008_mfa_login_challenges.sql
-- Target Platform: Cloudflare D1 (SQLite)
-- Purpose: Store short-lived pre-authentication challenges for TOTP MFA login.
-- =============================================================================

CREATE TABLE IF NOT EXISTS mfa_login_challenges (
    challenge_hash TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0 CHECK(attempt_count >= 0),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_mfa_login_challenges_user
    ON mfa_login_challenges(user_id);

CREATE INDEX IF NOT EXISTS idx_mfa_login_challenges_expiry
    ON mfa_login_challenges(expires_at);