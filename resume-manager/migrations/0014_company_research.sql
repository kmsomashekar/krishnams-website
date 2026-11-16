CREATE TABLE IF NOT EXISTS company_research (
  id TEXT PRIMARY KEY NOT NULL,
  opportunity_id TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  report_json TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_company_research_user ON company_research(user_id);
