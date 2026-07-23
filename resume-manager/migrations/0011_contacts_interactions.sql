-- =============================================================================
-- Migration: 0010_contacts_interactions.sql
-- Description: Introduces normalized contacts and interactions tables for 
-- professional networking relationship management (Contact -> Many Interactions).
-- =============================================================================

CREATE TABLE IF NOT EXISTS contacts (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  person_name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS interactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  contact_id TEXT NOT NULL,
  interaction_date TEXT NOT NULL,
  channel TEXT NOT NULL,
  direction TEXT NOT NULL,
  interaction_type TEXT NOT NULL,
  message_or_notes TEXT,
  template_used TEXT,
  follow_up_date TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
);

-- Useful Indexes for performance and scoping
CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_user_id ON interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_interactions_contact_date ON interactions(contact_id, interaction_date DESC);