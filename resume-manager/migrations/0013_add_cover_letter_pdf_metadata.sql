ALTER TABLE cover_letters ADD COLUMN pdf_generated_at TEXT;

ALTER TABLE cover_letters ADD COLUMN pdf_filename TEXT;

ALTER TABLE cover_letters ADD COLUMN pdf_download_count INTEGER DEFAULT 0;