-- Mark source/master resumes and protect their metadata, versions and files.
ALTER TABLE resumes ADD COLUMN is_master INTEGER NOT NULL DEFAULT 0
  CHECK (is_master IN (0, 1));

CREATE INDEX IF NOT EXISTS idx_resumes_user_master
  ON resumes(user_id, is_master);

-- Enforce one record per approved master resume name for each user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_resumes_user_master_name
  ON resumes(user_id, name)
  WHERE is_master = 1;
