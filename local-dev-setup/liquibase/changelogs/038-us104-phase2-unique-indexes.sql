--liquibase formatted sql

--changeset lucas.challamel:038-us104-phase2-unique-indexes
--comment: US-104 Phase 2: Add unique indexes for idempotent Excel imports
--preconditions onFail:MARK_RAN
--precondition-sql-check expectedResult:0 SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'idx_teams_tms_name_unique'

-- ============================================================================
-- US-104 Phase 2: Unique Indexes for Idempotent Imports
-- ============================================================================
-- Purpose: Enable ON CONFLICT clauses in Excel import for idempotent upserts
-- Strategy: Add unique constraints on business keys used for deduplication
--
-- Background:
--   - Phase 2 Excel import uses ON CONFLICT DO UPDATE for idempotency
--   - PostgreSQL requires UNIQUE index/constraint for ON CONFLICT target
--   - Teams lookup by tms_name (primary business key)
--   - TD-103 already created performance indexes, now adding uniqueness
-- ============================================================================

-- Add unique constraint to teams.tms_name
-- Rationale: Teams are identified by name in Phase 3 hierarchy imports
CREATE UNIQUE INDEX idx_teams_tms_name_unique ON teams_tms(tms_name);

COMMENT ON INDEX idx_teams_tms_name_unique IS 'US-104 Phase 2: Unique index for idempotent team imports via ON CONFLICT(tms_name)';

-- Verification query
-- Expected: Should return team names with count=1 (no duplicates)
-- SELECT tms_name, COUNT(*) as cnt
-- FROM teams_tms
-- GROUP BY tms_name
-- HAVING COUNT(*) > 1;

--rollback DROP INDEX IF EXISTS idx_teams_tms_name_unique;
