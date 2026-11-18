-- Preserve the exact JD analysis and source resume context for each
-- resume customisation session. The session remains linked to its opportunity.
ALTER TABLE resume_customisation_sessions
  ADD COLUMN source_resume_id TEXT;

ALTER TABLE resume_customisation_sessions
  ADD COLUMN source_resume_version_id TEXT;

ALTER TABLE resume_customisation_sessions
  ADD COLUMN ats_analysis_id TEXT;

ALTER TABLE resume_customisation_sessions
  ADD COLUMN jd_text_snapshot TEXT;

ALTER TABLE resume_customisation_sessions
  ADD COLUMN analysis_snapshot_json TEXT;

CREATE INDEX IF NOT EXISTS idx_resume_customisation_source_version
  ON resume_customisation_sessions(user_id, source_resume_version_id);

CREATE INDEX IF NOT EXISTS idx_resume_customisation_ats_analysis
  ON resume_customisation_sessions(user_id, ats_analysis_id);
