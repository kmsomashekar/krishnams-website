CREATE TABLE IF NOT EXISTS star_interview_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  opportunity_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  question_count INTEGER NOT NULL CHECK (question_count IN (10, 15, 20)),
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
CREATE INDEX IF NOT EXISTS idx_star_interview_sessions_opportunity
  ON star_interview_sessions(opportunity_id, user_id, updated_at);
