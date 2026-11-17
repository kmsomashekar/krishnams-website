-- Structured, source-traceable career evidence for JD-based resume customisation.
CREATE TABLE IF NOT EXISTS resume_evidence (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  evidence_type TEXT NOT NULL CHECK (evidence_type IN ('EXPERIENCE','PROJECT','ACHIEVEMENT')),
  title TEXT NOT NULL,
  organisation TEXT,
  role TEXT,
  description TEXT,
  responsibilities TEXT,
  actions_taken TEXT,
  outcomes TEXT,
  technologies_json TEXT NOT NULL DEFAULT '[]',
  skills_json TEXT NOT NULL DEFAULT '[]',
  classification TEXT NOT NULL DEFAULT 'DIRECT'
    CHECK (classification IN ('DIRECT','TEAM','ADVISORY','INDEPENDENT','TRANSFERABLE')),
  start_date TEXT,
  end_date TEXT,
  verification_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (verification_status IN ('PENDING','VERIFIED')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resume_evidence_user_type
  ON resume_evidence(user_id, evidence_type, updated_at);

CREATE INDEX IF NOT EXISTS idx_resume_evidence_user_org
  ON resume_evidence(user_id, organisation);

CREATE TABLE IF NOT EXISTS resume_evidence_sources (
  id TEXT PRIMARY KEY,
  evidence_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  resume_id TEXT,
  resume_version_id TEXT,
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'MASTER_RESUME',
  source_excerpt TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (evidence_id) REFERENCES resume_evidence(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_resume_evidence_sources_evidence
  ON resume_evidence_sources(evidence_id, user_id);

CREATE TABLE IF NOT EXISTS resume_customisation_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  opportunity_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  evidence_snapshot_json TEXT,
  proposal_json TEXT,
  approved_at TEXT,
  generated_resume_version_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_resume_customisation_user_opportunity
  ON resume_customisation_sessions(user_id, opportunity_id, updated_at);
