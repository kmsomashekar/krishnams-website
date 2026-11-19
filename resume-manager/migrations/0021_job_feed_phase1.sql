-- Job Feed Phase 1: saved search profiles and manually discovered jobs
CREATE TABLE IF NOT EXISTS job_search_profiles (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Job Search',
  titles_json TEXT NOT NULL DEFAULT '[]',
  locations_json TEXT NOT NULL DEFAULT '[]',
  employment_types_json TEXT NOT NULL DEFAULT '[]',
  keywords_json TEXT NOT NULL DEFAULT '[]',
  min_match_score INTEGER NOT NULL DEFAULT 80 CHECK(min_match_score BETWEEN 0 AND 100),
  max_applicants INTEGER,
  immediate_joiner_priority INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_job_search_profiles_user ON job_search_profiles(user_id);

CREATE TABLE IF NOT EXISTS job_feed_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  profile_id TEXT,
  title TEXT NOT NULL,
  company_name TEXT NOT NULL,
  location TEXT,
  employment_type TEXT,
  source TEXT NOT NULL DEFAULT 'MANUAL',
  source_url TEXT,
  description TEXT NOT NULL,
  posted_date TEXT,
  applicant_count INTEGER,
  salary_text TEXT,
  match_score INTEGER CHECK(match_score IS NULL OR match_score BETWEEN 0 AND 100),
  match_details_json TEXT,
  status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW','SAVED','REVIEWED','SKIPPED','ADDED_TO_OPPORTUNITIES')),
  opportunity_id TEXT,
  duplicate_key TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(profile_id) REFERENCES job_search_profiles(id) ON DELETE SET NULL,
  FOREIGN KEY(opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_feed_duplicate_user
  ON job_feed_jobs(user_id, duplicate_key);
CREATE INDEX IF NOT EXISTS idx_job_feed_user_status
  ON job_feed_jobs(user_id, status);
CREATE INDEX IF NOT EXISTS idx_job_feed_user_score
  ON job_feed_jobs(user_id, match_score);
