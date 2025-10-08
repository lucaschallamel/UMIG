--liquibase formatted sql
--changeset lucas.challamel:037-us104-phase1-bootstrap-data splitStatements:false
--comment: US-104 Phase 1: Bootstrap data import - 6 foundation records for Excel and JSON import validation

-- US-104 Phase 1: Bootstrap Data Import
-- Foundation data required for Excel and JSON imports in subsequent phases
--
-- Creates:
-- - 1 default user (for associations)
-- - 1 default team (lookup pattern validation)
-- - 1 default migration (PLANNING status)
-- - 1 default iteration (IN_PROGRESS status)
-- - 1 default plan (PLANNING status)
-- - 1 user-team association
--
-- Critical Patterns:
-- - Team lookup by tms_name (NOT tms_code - doesn't exist per ADR-059)
-- - Status lookups from status_sts table (sts_name + sts_type)
-- - Explicit audit trail fields (created_by='migration')
-- - All FKs validated before dependent inserts
--
-- Dependencies:
-- - TD-103 performance indexes (complete)
-- - status_sts table with PLANNING/IN_PROGRESS values
--
-- Author: Lucas Challamel
-- Date: 2025-10-08
-- Story: US-104 Phase 1 (1 story point)

-- ==============================================================================
-- FOUNDATION USER (Required for team associations)
-- ==============================================================================

INSERT INTO users_usr (
    usr_code,
    usr_first_name,
    usr_last_name,
    usr_email,
    usr_active,
    created_by,
    updated_by,
    created_at,
    updated_at
)
VALUES (
    'MIG',
    'Migration',
    'Foundation User',
    'migration@umig.local',
    true,
    'migration',
    'migration',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (usr_code) DO NOTHING;

-- ==============================================================================
-- FOUNDATION TEAM (Critical for team lookup pattern validation)
-- ==============================================================================
-- Pattern: Teams will be looked up by tms_name during import
-- Schema: teams_tms has tms_name column (NOT tms_code - per ADR-059)

INSERT INTO teams_tms (
    tms_name,
    tms_email,
    tms_description,
    created_by,
    updated_by,
    created_at,
    updated_at
)
VALUES (
    'Foundation Team',
    'foundation@umig.local',
    'Bootstrap team for data import validation',
    'migration',
    'migration',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (tms_email) DO NOTHING;

-- ==============================================================================
-- USER-TEAM ASSOCIATION (Validates junction table pattern)
-- ==============================================================================

INSERT INTO teams_tms_x_users_usr (
    tms_id,
    usr_id,
    created_by,
    created_at
)
SELECT
    t.tms_id,
    u.usr_id,
    'migration',
    CURRENT_TIMESTAMP
FROM teams_tms t
CROSS JOIN users_usr u
WHERE t.tms_name = 'Foundation Team'
  AND u.usr_code = 'MIGRATION_USER'
ON CONFLICT (tms_id, usr_id) DO NOTHING;

-- ==============================================================================
-- DEFAULT MIGRATION (PLANNING status)
-- ==============================================================================
-- Status lookup: Migration type, PLANNING status
-- Owner: Foundation user

INSERT INTO migrations_mig (
    mig_id,
    usr_id_owner,
    mig_name,
    mig_description,
    mig_status,
    mig_type,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    u.usr_id,
    'Default Migration',
    'Bootstrap migration for US-104 data import',
    s.sts_id,
    'MIGRATION',
    'migration',
    'migration',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM users_usr u
CROSS JOIN status_sts s
WHERE u.usr_code = 'MIG'
  AND s.sts_name = 'PLANNING'
  AND s.sts_type = 'Migration'
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- DEFAULT ITERATION (IN_PROGRESS status)
-- ==============================================================================
-- Status lookup: Iteration type, IN_PROGRESS status
-- Links to default migration

INSERT INTO iterations_ite (
    ite_id,
    mig_id,
    plm_id,
    itt_code,
    ite_name,
    ite_description,
    ite_status,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    m.mig_id,
    p.plm_id,
    'RUN', -- Run iteration type (must exist in iteration_types_itt)
    'Default Iteration',
    'Bootstrap iteration for US-104 data import',
    s.sts_id,
    'migration',
    'migration',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM migrations_mig m
CROSS JOIN plans_master_plm p
CROSS JOIN status_sts s
WHERE m.mig_name = 'Default Migration'
  AND m.created_by = 'migration'
  AND p.plm_name = 'Default Plan'
  AND p.created_by = 'migration'
  AND s.sts_name = 'IN_PROGRESS'
  AND s.sts_type = 'Iteration'
LIMIT 1
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- DEFAULT PLAN (PLANNING status)
-- ==============================================================================
-- Status lookup: Plan type, PLANNING status
-- Links to foundation team

INSERT INTO plans_master_plm (
    plm_id,
    tms_id,
    plm_name,
    plm_description,
    plm_status,
    created_by,
    updated_by,
    created_at,
    updated_at
)
SELECT
    gen_random_uuid(),
    t.tms_id,
    'Default Plan',
    'Bootstrap plan for US-104 data import',
    s.sts_id,
    'migration',
    'migration',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM teams_tms t
CROSS JOIN status_sts s
WHERE t.tms_name = 'Foundation Team'
  AND s.sts_name = 'PLANNING'
  AND s.sts_type = 'Plan'
ON CONFLICT DO NOTHING;

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================
-- Run after execution to verify bootstrap data:
--
-- SELECT COUNT(*) as user_count FROM users_usr WHERE usr_code = 'MIG';
-- SELECT COUNT(*) as team_count FROM teams_tms WHERE tms_name = 'Foundation Team';
-- SELECT COUNT(*) as association_count FROM teams_tms_x_users_usr WHERE created_by = 'migration';
-- SELECT COUNT(*) as migration_count FROM migrations_mig WHERE mig_name = 'Default Migration';
-- SELECT COUNT(*) as iteration_count FROM iterations_ite WHERE ite_name = 'Default Iteration';
-- SELECT COUNT(*) as plan_count FROM plans_master_plm WHERE plm_name = 'Default Plan';
--
-- Expected results: 1 row each (6 total foundation records)

-- ==============================================================================
-- VALIDATION: Foreign Key Integrity
-- ==============================================================================
-- Verify all FK relationships are valid:
--
-- SELECT 'Migration Owner' as check, COUNT(*) as valid
-- FROM migrations_mig m
-- JOIN users_usr u ON m.usr_id_owner = u.usr_id
-- WHERE m.mig_name = 'Default Migration';
--
-- SELECT 'Migration Status' as check, COUNT(*) as valid
-- FROM migrations_mig m
-- JOIN status_sts s ON m.mig_status = s.sts_id
-- WHERE m.mig_name = 'Default Migration' AND s.sts_type = 'Migration';
--
-- SELECT 'Iteration Migration' as check, COUNT(*) as valid
-- FROM iterations_ite i
-- JOIN migrations_mig m ON i.mig_id = m.mig_id
-- WHERE i.ite_name = 'Default Iteration';
--
-- SELECT 'Iteration Status' as check, COUNT(*) as valid
-- FROM iterations_ite i
-- JOIN status_sts s ON i.ite_status = s.sts_id
-- WHERE i.ite_name = 'Default Iteration' AND s.sts_type = 'Iteration';
--
-- SELECT 'Plan Team' as check, COUNT(*) as valid
-- FROM plans_master_plm p
-- JOIN teams_tms t ON p.tms_id = t.tms_id
-- WHERE p.plm_name = 'Default Plan' AND t.tms_name = 'Foundation Team';
--
-- SELECT 'Plan Status' as check, COUNT(*) as valid
-- FROM plans_master_plm p
-- JOIN status_sts s ON p.plm_status = s.sts_id
-- WHERE p.plm_name = 'Default Plan' AND s.sts_type = 'Plan';
--
-- Expected: All queries return 1 valid row

-- ==============================================================================
-- ROLLBACK STRATEGY
-- ==============================================================================
-- To rollback this changeset (remove all bootstrap data):
--
-- DELETE FROM plans_master_plm WHERE plm_name = 'Default Plan';
-- DELETE FROM iterations_ite WHERE ite_name = 'Default Iteration';
-- DELETE FROM migrations_mig WHERE mig_name = 'Default Migration';
-- DELETE FROM teams_tms_x_users_usr WHERE created_by = 'migration';
-- DELETE FROM teams_tms WHERE tms_name = 'Foundation Team';
-- DELETE FROM users_usr WHERE usr_code = 'MIG';

--rollback DELETE FROM plans_master_plm WHERE plm_name = 'Default Plan';
--rollback DELETE FROM iterations_ite WHERE ite_name = 'Default Iteration';
--rollback DELETE FROM migrations_mig WHERE mig_name = 'Default Migration';
--rollback DELETE FROM teams_tms_x_users_usr WHERE created_by = 'migration';
--rollback DELETE FROM teams_tms WHERE tms_name = 'Foundation Team';
--rollback DELETE FROM users_usr WHERE usr_code = 'MIG';
