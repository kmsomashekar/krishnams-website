-- Task 1.21: Preserve the complete JD Analyzer result with ATS analysis.
-- match_score remains a dedicated column for dashboard aggregation/reporting.
-- analysis_json stores the full structured AI analysis for Opportunity Detail.

ALTER TABLE ats_analysis
ADD COLUMN analysis_json TEXT;