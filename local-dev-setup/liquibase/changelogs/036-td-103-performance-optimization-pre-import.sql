--liquibase formatted sql
--changeset lucas.challamel:036-td-103-performance-optimization-pre-import splitStatements:false
--comment: TD-103: Performance optimization - 11 indexes for US-104 data import (5-10× faster lookups)

-- TD-103: Performance Optimization Prerequisites for US-104 Production Data Import
-- CRITICAL: These 11 indexes MUST exist before running US-104 data import
--
-- Context:
-- - US-104 will import 15,282+ records with cascading lookups across 15 tables
-- - Without these indexes, lookup performance degrades exponentially
-- - Estimated 5-10× slower import without optimization
--
-- Index Categories:
-- 1. Lookup Performance Indexes (6) - Enable fast name-based entity lookups
-- 2. Partial Indexes for Nullable FKs (2) - Optimize optional relationship queries
-- 3. Junction Table Indexes (3) - Enable efficient many-to-many relationship queries
--
-- Impact Analysis:
-- - Sequences: ~500 lookups by (plm_id, sqm_name)
-- - Phases: ~2,000 lookups by (sqm_id, phm_name)
-- - Controls: ~500 lookups by (phm_id, ctm_code)
-- - Steps: ~1,443 phase-level queries by phm_id
-- - Instructions: ~3,000+ step-level queries by stm_id
-- - Teams: ~880 lookups by tms_name (CRITICAL - no tms_code exists!)
--
-- Related:
-- - ADR-059: Schema as Authority (fix code to match schema)
-- - US-104: Production Data Import (15,282+ records)
-- - Sprint 8: Phase 2B Prerequisites
--
-- Author: Lucas Challamel
-- Date: 2025-10-08
-- Story: TD-103 (2 story points)

-- ==============================================================================
-- CATEGORY 1: LOOKUP PERFORMANCE INDEXES (6 indexes)
-- ==============================================================================
-- Purpose: Enable fast name-based entity lookups during import operations
-- Pattern: Import logic looks up entities by name within parent context
-- Impact: Without these, lookups become O(n) table scans

-- Index 1: Sequence lookup by name within plan
-- Usage: SELECT sqm_id FROM sequences_master_sqm WHERE plm_id = ? AND sqm_name = ?
-- Frequency: ~500 sequence lookups during JSON import
CREATE INDEX IF NOT EXISTS idx_sqm_name_plm
ON sequences_master_sqm(plm_id, sqm_name);

-- Index 2: Phase lookup by name within sequence
-- Usage: SELECT phm_id FROM phases_master_phm WHERE sqm_id = ? AND phm_name = ?
-- Frequency: ~2,000 phase lookups during JSON import
CREATE INDEX IF NOT EXISTS idx_phm_name_sqm
ON phases_master_phm(sqm_id, phm_name);

-- Index 3: Control lookup by code within phase
-- Usage: SELECT ctm_id FROM controls_master_ctm WHERE phm_id = ? AND ctm_code = ?
-- Frequency: ~500 control lookups during JSON import
CREATE INDEX IF NOT EXISTS idx_ctm_code_phm
ON controls_master_ctm(phm_id, ctm_code);

-- Index 4: Team lookup by name
-- Usage: SELECT tms_id FROM teams_tms WHERE tms_name = ?
-- Frequency: ~880 team lookups during Excel + JSON import
-- CRITICAL: Schema has tms_name, NOT tms_code (per ADR-059)
CREATE INDEX IF NOT EXISTS idx_tms_name
ON teams_tms(tms_name);

-- Index 5: Steps by phase
-- Usage: SELECT stm_id FROM steps_master_stm WHERE phm_id = ?
-- Frequency: ~2,000 phase-level step queries
CREATE INDEX IF NOT EXISTS idx_stm_phm
ON steps_master_stm(phm_id);

-- Index 6: Instructions by step
-- Usage: SELECT inm_id FROM instructions_master_inm WHERE stm_id = ?
-- Frequency: ~3,000 step-level instruction queries
CREATE INDEX IF NOT EXISTS idx_inm_stm
ON instructions_master_inm(stm_id);

-- ==============================================================================
-- CATEGORY 2: PARTIAL INDEXES FOR NULLABLE FOREIGN KEYS (2 indexes)
-- ==============================================================================
-- Purpose: Optimize queries filtering on nullable FK relationships
-- Pattern: Partial indexes for WHERE ctm_id IS NOT NULL / tms_id IS NOT NULL
-- Impact: Reduces index size and improves query performance for filtered queries

-- Index 7: Instructions with control assignment (nullable FK)
-- Usage: SELECT * FROM instructions_master_inm WHERE ctm_id IS NOT NULL
-- Frequency: Control-specific instruction queries during validation
-- Benefit: ~40% smaller index (only rows with control assignment)
CREATE INDEX IF NOT EXISTS idx_inm_ctm_not_null
ON instructions_master_inm(ctm_id)
WHERE ctm_id IS NOT NULL;

-- Index 8: Instructions with team assignment (nullable FK)
-- Usage: SELECT * FROM instructions_master_inm WHERE tms_id IS NOT NULL
-- Frequency: Team-specific instruction queries during validation
-- Benefit: ~30% smaller index (only rows with team assignment)
CREATE INDEX IF NOT EXISTS idx_inm_tms_not_null
ON instructions_master_inm(tms_id)
WHERE tms_id IS NOT NULL;

-- ==============================================================================
-- CATEGORY 3: JUNCTION TABLE INDEXES (3 indexes)
-- ==============================================================================
-- Purpose: Enable efficient many-to-many relationship queries
-- Pattern: Reverse lookups from junction tables (FK → PK direction)
-- Impact: Without these, junction table queries become O(n) table scans

-- Index 9: Team-to-Users junction (team side)
-- Usage: SELECT usr_id FROM teams_tms_x_users_usr WHERE tms_id = ?
-- Frequency: Team membership validation during import
-- Note: Primary key already covers (tms_id, usr_id), but reverse lookup needs optimization
CREATE INDEX IF NOT EXISTS idx_tms_x_usr_tms
ON teams_tms_x_users_usr(tms_id);

-- Index 10: Team-to-Users junction (user side)
-- Usage: SELECT tms_id FROM teams_tms_x_users_usr WHERE usr_id = ?
-- Frequency: User team membership queries
CREATE INDEX IF NOT EXISTS idx_tms_x_usr_usr
ON teams_tms_x_users_usr(usr_id);

-- Index 11: Step-to-Teams junction (step side)
-- Usage: SELECT tms_id FROM steps_master_stm_x_teams_tms_impacted WHERE stm_id = ?
-- Frequency: Step impact analysis during validation
-- Note: Primary key covers (stm_id, tms_id), but FK constraint needs separate index
CREATE INDEX IF NOT EXISTS idx_stm_x_tms_stm
ON steps_master_stm_x_teams_tms_impacted(stm_id);

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================
-- Verify all 11 indexes were created successfully:
--
-- SELECT
--     schemaname,
--     tablename,
--     indexname,
--     indexdef
-- FROM pg_indexes
-- WHERE indexname IN (
--     'idx_sqm_name_plm',      -- 1
--     'idx_phm_name_sqm',      -- 2
--     'idx_ctm_code_phm',      -- 3
--     'idx_tms_name',          -- 4
--     'idx_stm_phm',           -- 5
--     'idx_inm_stm',           -- 6
--     'idx_inm_ctm_not_null',  -- 7
--     'idx_inm_tms_not_null',  -- 8
--     'idx_tms_x_usr_tms',     -- 9
--     'idx_tms_x_usr_usr',     -- 10
--     'idx_stm_x_tms_stm'      -- 11
-- )
-- ORDER BY indexname;
--
-- Expected result: 11 rows returned

-- ==============================================================================
-- ROLLBACK STRATEGY
-- ==============================================================================
-- To rollback this changeset (remove all 11 indexes):
--
-- DROP INDEX IF EXISTS idx_sqm_name_plm;
-- DROP INDEX IF EXISTS idx_phm_name_sqm;
-- DROP INDEX IF EXISTS idx_ctm_code_phm;
-- DROP INDEX IF EXISTS idx_tms_name;
-- DROP INDEX IF EXISTS idx_stm_phm;
-- DROP INDEX IF EXISTS idx_inm_stm;
-- DROP INDEX IF EXISTS idx_inm_ctm_not_null;
-- DROP INDEX IF EXISTS idx_inm_tms_not_null;
-- DROP INDEX IF EXISTS idx_tms_x_usr_tms;
-- DROP INDEX IF EXISTS idx_tms_x_usr_usr;
-- DROP INDEX IF EXISTS idx_stm_x_tms_stm;

--rollback DROP INDEX IF EXISTS idx_sqm_name_plm;
--rollback DROP INDEX IF EXISTS idx_phm_name_sqm;
--rollback DROP INDEX IF EXISTS idx_ctm_code_phm;
--rollback DROP INDEX IF EXISTS idx_tms_name;
--rollback DROP INDEX IF EXISTS idx_stm_phm;
--rollback DROP INDEX IF EXISTS idx_inm_stm;
--rollback DROP INDEX IF EXISTS idx_inm_ctm_not_null;
--rollback DROP INDEX IF EXISTS idx_inm_tms_not_null;
--rollback DROP INDEX IF EXISTS idx_tms_x_usr_tms;
--rollback DROP INDEX IF EXISTS idx_tms_x_usr_usr;
--rollback DROP INDEX IF EXISTS idx_stm_x_tms_stm;
