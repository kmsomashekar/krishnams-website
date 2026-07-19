-- Migration: Add Cover Letters Table
-- Target: Cloudflare D1 / SQLite

CREATE TABLE IF NOT EXISTS cover_letters (
    id TEXT PRIMARY KEY NOT NULL,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'DRAFT',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,

    CONSTRAINT fk_cover_letters_company
        FOREIGN KEY (company_id)
        REFERENCES companies(id)
        ON DELETE CASCADE,

    CONSTRAINT chk_cover_letters_status
        CHECK (status IN ('DRAFT', 'FINAL')),

    CONSTRAINT uq_cover_letters_user_company
        UNIQUE (user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_cover_letters_company_id
ON cover_letters(company_id);