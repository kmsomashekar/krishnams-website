-- Migration: Add AI Context to Resume Versions
-- Target: Cloudflare D1 / SQLite
-- Purpose: Store an AI-readable text representation of a specific Resume Version.

ALTER TABLE resume_versions
ADD COLUMN ai_context TEXT;