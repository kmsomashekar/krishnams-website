-- =============================================================================
-- Migration: 0009_outreach_logs.sql
-- Target Platform: Cloudflare D1 (SQLite)
-- Purpose: Create outreach_logs table for manual networking/outreach tracking.
-- =============================================================================

CREATE TABLE IF NOT EXISTS outreach_logs (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    contact_date TEXT NOT NULL,
    person_name TEXT NOT NULL,
    company TEXT,
    email TEXT,
    channel TEXT NOT NULL CHECK(channel IN ('LINKEDIN', 'WHATSAPP', 'EMAIL', 'PHONE', 'REFERRAL', 'OTHER')),
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_outreach_logs_user_date
    ON outreach_logs(user_id, contact_date DESC);