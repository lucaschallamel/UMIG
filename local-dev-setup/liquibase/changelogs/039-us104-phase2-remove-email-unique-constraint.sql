--liquibase formatted sql

--changeset lucas.challamel:039-us104-phase2-remove-email-unique-constraint
--comment: US-104 Phase 2: Remove unique constraint on tms_email to allow duplicate team emails
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:1 SELECT COUNT(*) FROM pg_constraint WHERE conname = 'teams_tms_tms_email_key'

-- ============================================================================
-- US-104 Phase 2: Remove Email Unique Constraint
-- ============================================================================
-- Purpose: Allow multiple teams to share the same email address
-- Rationale: Business requirement - teams may legitimately share email addresses
--            (e.g., multiple teams managed by same distribution list)
-- Impact: Enables natural data representation without artificial email generation
-- ============================================================================

-- Drop unique constraint on teams_tms.tms_email
ALTER TABLE teams_tms DROP CONSTRAINT IF EXISTS teams_tms_tms_email_key;

COMMENT ON COLUMN teams_tms.tms_email IS 'Team contact email (non-unique, multiple teams may share same email)';

-- Verification query
-- Expected: Should show teams sharing emails if data contains duplicates
-- SELECT tms_email, COUNT(*) as team_count, STRING_AGG(tms_name, ', ') as teams
-- FROM teams_tms
-- WHERE tms_email IS NOT NULL
-- GROUP BY tms_email
-- HAVING COUNT(*) > 1;

--rollback ALTER TABLE teams_tms ADD CONSTRAINT teams_tms_tms_email_key UNIQUE (tms_email);
