-- =============================================================================
-- Migration: 0001_init_job_search_core.sql
-- Approved Phase: Stage 1 — Task 1.4 (July 31 Job Search Release Core)
-- Target Platform: Cloudflare D1 (SQLite)
-- Constraints: STRICT Foreign Keys & Value Range Domain Checks Enabled
-- Fix: Resolved duplicate INDEX keyword syntax anomaly
-- =============================================================================

-- 1. Create resumes Core Table
CREATE TABLE resumes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

-- 2. Create resume_versions Table
CREATE TABLE resume_versions (
    id TEXT PRIMARY KEY,
    resume_id TEXT NOT NULL,
    version_label TEXT NOT NULL,
    target_role TEXT,
    r2_object_key TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    FOREIGN KEY (resume_id) REFERENCES resumes (id) ON DELETE CASCADE
);

-- 3. Create companies Core Table
CREATE TABLE companies (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    website TEXT,
    location TEXT,
    notes TEXT,
    created_at TEXT NOT NULL
);

-- 4. Create opportunities Central Backbone Table (Hardened Priority Bounds)
CREATE TABLE opportunities (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    company_id TEXT NOT NULL,
    resume_version_id TEXT,
    job_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CONSIDERING',
    priority INTEGER NOT NULL DEFAULT 3 CHECK(priority >= 1 AND priority <= 5),
    application_url TEXT,
    date_identified TEXT,
    date_applied TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
    FOREIGN KEY (resume_version_id) REFERENCES resume_versions (id) ON DELETE SET NULL
);

-- 5. Create job_descriptions 1:1 Unique Table
CREATE TABLE job_descriptions (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL UNIQUE,
    raw_text TEXT NOT NULL,
    extracted_skills TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE
);

-- 6. Create ats_analysis Historical Sequence Table (Hardened Score Bounds)
CREATE TABLE ats_analysis (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL,
    resume_version_id TEXT NOT NULL,
    match_score INTEGER NOT NULL CHECK(match_score >= 0 AND match_score <= 100),
    missing_keywords TEXT,
    skill_gaps TEXT,
    improvement_suggestions TEXT,
    analyzed_at TEXT NOT NULL,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE,
    FOREIGN KEY (resume_version_id) REFERENCES resume_versions (id) ON DELETE CASCADE
);

-- 7. Create interviews Operational Table
CREATE TABLE interviews (
    id TEXT PRIMARY KEY,
    opportunity_id TEXT NOT NULL,
    round_number INTEGER NOT NULL,
    round_title TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    interview_date TEXT NOT NULL,
    interviewer_names TEXT,
    preparation_notes TEXT,
    questions_asked TEXT,
    feedback_notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (opportunity_id) REFERENCES opportunities (id) ON DELETE CASCADE
);

-- =============================================================================
-- PERFORMANCE SUITE INDEX GENERATION
-- =============================================================================

-- Scoped data isolation visibility optimization indexes
CREATE INDEX idx_resumes_user ON resumes(user_id);
CREATE INDEX idx_companies_user ON companies(user_id);
CREATE INDEX idx_opportunities_user ON opportunities(user_id);

-- Operational filtering pipelines and metrics grouping indexes
CREATE INDEX idx_opportunities_status ON opportunities(status);
CREATE INDEX idx_opportunities_company ON opportunities(company_id);
CREATE INDEX idx_opportunities_date_applied ON opportunities(date_applied);

-- Structural entity lookup scanning indexes
CREATE INDEX idx_resume_versions_parent ON resume_versions(resume_id);
CREATE INDEX idx_interviews_opportunity ON interviews(opportunity_id);
CREATE INDEX idx_interviews_date ON interviews(interview_date);
CREATE INDEX idx_ats_analysis_lookup ON ats_analysis(opportunity_id, resume_version_id);