-- Expand supported STAR Interview session lengths to include quick 5-question practice.
-- Rebuild the table to update its SQLite CHECK constraint while preserving existing sessions.
CREATE TABLE star_interview_sessions_new (
  id TEXT PRIMARY KEY NOT NULL,
  opportunity_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  question_count INTEGER NOT NULL CHECK (question_count IN (5, 10, 15, 20)),
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Medium', 'High')),
  questions_json TEXT NOT NULL,
  answers_json TEXT NOT NULL,
  current_index INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS', 'REVIEW', 'COMPLETED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

INSERT INTO star_interview_sessions_new (
  id, opportunity_id, user_id, question_count, difficulty, questions_json,
  answers_json, current_index, status, created_at, updated_at
)
SELECT
  id, opportunity_id, user_id, question_count, difficulty, questions_json,
  answers_json, current_index, status, created_at, updated_at
FROM star_interview_sessions;

DROP TABLE star_interview_sessions;
ALTER TABLE star_interview_sessions_new RENAME TO star_interview_sessions;

CREATE INDEX idx_star_interview_sessions_opportunity
  ON star_interview_sessions(opportunity_id, user_id, updated_at);
