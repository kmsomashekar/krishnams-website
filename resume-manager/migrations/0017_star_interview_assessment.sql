-- Add persistent STAR Interview assessment state while preserving all existing sessions.
ALTER TABLE star_interview_sessions ADD COLUMN assessment_snapshot_json TEXT;
ALTER TABLE star_interview_sessions ADD COLUMN assessment_json TEXT;
ALTER TABLE star_interview_sessions ADD COLUMN assessment_status TEXT NOT NULL DEFAULT 'NOT_STARTED'
  CHECK (assessment_status IN ('NOT_STARTED', 'RUNNING', 'COMPLETED', 'FAILED'));
ALTER TABLE star_interview_sessions ADD COLUMN assessment_score REAL;
ALTER TABLE star_interview_sessions ADD COLUMN assessment_rating TEXT;
ALTER TABLE star_interview_sessions ADD COLUMN assessed_at TEXT;

CREATE INDEX IF NOT EXISTS idx_star_interview_assessment_status
  ON star_interview_sessions(opportunity_id, user_id, assessment_status, updated_at);
