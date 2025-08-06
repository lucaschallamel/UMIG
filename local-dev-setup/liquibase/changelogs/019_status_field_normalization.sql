--liquibase formatted sql

--changeset lucas.challamel:019_status_field_normalization context:all
--comment: US-006 - Status Field Normalization Implementation: Convert all VARCHAR(50) status fields to INTEGER foreign keys referencing status_sts table

-- =============================================================================
-- US-006: STATUS FIELD NORMALIZATION IMPLEMENTATION
-- =============================================================================
-- This migration implements the comprehensive status field normalization across
-- all 8 entity tables, converting VARCHAR(50) status fields to INTEGER FK
-- relationships with the centralized status_sts table.
--
-- STRATEGY: 4-Phase Zero-Downtime Migration
-- Phase 1: Add new INTEGER status columns (preserve existing VARCHAR)
-- Phase 2: Populate new columns with status_sts lookups
-- Phase 3: Add constraints and indexes
-- Phase 4: Drop old columns and rename new ones
--
-- AFFECTED TABLES (8):
-- - migrations_mig: mig_status VARCHAR(50) → INTEGER FK
-- - iterations_ite: ite_status VARCHAR(50) → INTEGER FK  
-- - plans_master_plm: plm_status VARCHAR(50) → INTEGER FK
-- - plans_instance_pli: pli_status VARCHAR(50) → INTEGER FK
-- - sequences_instance_sqi: sqi_status VARCHAR(50) → INTEGER FK
-- - phases_instance_phi: phi_status VARCHAR(50) → INTEGER FK
-- - steps_instance_sti: sti_status VARCHAR(50) → INTEGER FK
-- - controls_instance_cti: cti_status VARCHAR(50) → INTEGER FK
-- =============================================================================

-- Pre-migration validation queries
-- Verify status_sts table exists and contains expected data
-- Note: Simplified validation for Liquibase compatibility
SELECT COUNT(*) AS status_count FROM status_sts;

-- =============================================================================
-- PHASE 1: ADD NEW INTEGER STATUS COLUMNS
-- =============================================================================
-- Add new status_id columns to all 8 entity tables while preserving existing
-- VARCHAR status columns for rollback safety.

-- 1.1 migrations_mig table
ALTER TABLE migrations_mig ADD COLUMN mig_status_id INTEGER;
COMMENT ON COLUMN migrations_mig.mig_status_id IS 'Foreign key to status_sts table for normalized status management';

-- 1.2 iterations_ite table
ALTER TABLE iterations_ite ADD COLUMN ite_status_id INTEGER;
COMMENT ON COLUMN iterations_ite.ite_status_id IS 'Foreign key to status_sts table for normalized status management';

-- 1.3 plans_master_plm table
ALTER TABLE plans_master_plm ADD COLUMN plm_status_id INTEGER;
COMMENT ON COLUMN plans_master_plm.plm_status_id IS 'Foreign key to status_sts table for normalized status management';

-- 1.4 plans_instance_pli table
ALTER TABLE plans_instance_pli ADD COLUMN pli_status_id INTEGER;
COMMENT ON COLUMN plans_instance_pli.pli_status_id IS 'Foreign key to status_sts table for normalized status management';

-- 1.5 sequences_instance_sqi table
ALTER TABLE sequences_instance_sqi ADD COLUMN sqi_status_id INTEGER;
COMMENT ON COLUMN sequences_instance_sqi.sqi_status_id IS 'Foreign key to status_sts table for normalized status management';

-- 1.6 phases_instance_phi table
ALTER TABLE phases_instance_phi ADD COLUMN phi_status_id INTEGER;
COMMENT ON COLUMN phases_instance_phi.phi_status_id IS 'Foreign key to status_sts table for normalized status management';

-- 1.7 steps_instance_sti table
ALTER TABLE steps_instance_sti ADD COLUMN sti_status_id INTEGER;
COMMENT ON COLUMN steps_instance_sti.sti_status_id IS 'Foreign key to status_sts table for normalized status management';

-- 1.8 controls_instance_cti table
ALTER TABLE controls_instance_cti ADD COLUMN cti_status_id INTEGER;
COMMENT ON COLUMN controls_instance_cti.cti_status_id IS 'Foreign key to status_sts table for normalized status management';

-- =============================================================================
-- PHASE 2: DATA MIGRATION AND MAPPING
-- =============================================================================
-- Populate new INTEGER columns with status_sts lookups based on existing
-- VARCHAR values. Handle unmapped values with appropriate defaults.

-- 2.1 migrations_mig data migration
UPDATE migrations_mig 
SET mig_status_id = s.sts_id
FROM status_sts s
WHERE UPPER(s.sts_name) = UPPER(migrations_mig.mig_status)
  AND s.sts_type = 'Migration';

-- Handle unmapped migration status values with PLANNING default
UPDATE migrations_mig
SET mig_status_id = (
    SELECT sts_id FROM status_sts 
    WHERE sts_name = 'PLANNING' AND sts_type = 'Migration'
    LIMIT 1
)
WHERE mig_status_id IS NULL;

-- 2.2 iterations_ite data migration
UPDATE iterations_ite 
SET ite_status_id = s.sts_id
FROM status_sts s
WHERE UPPER(s.sts_name) = UPPER(iterations_ite.ite_status)
  AND s.sts_type = 'Iteration';

-- Handle unmapped iteration status values with PLANNING default
UPDATE iterations_ite
SET ite_status_id = (
    SELECT sts_id FROM status_sts 
    WHERE sts_name = 'PLANNING' AND sts_type = 'Iteration'
    LIMIT 1
)
WHERE ite_status_id IS NULL;

-- 2.3 plans_master_plm data migration
UPDATE plans_master_plm 
SET plm_status_id = s.sts_id
FROM status_sts s
WHERE UPPER(s.sts_name) = UPPER(plans_master_plm.plm_status)
  AND s.sts_type = 'Plan';

-- Handle unmapped plan master status values with PLANNING default
UPDATE plans_master_plm
SET plm_status_id = (
    SELECT sts_id FROM status_sts 
    WHERE sts_name = 'PLANNING' AND sts_type = 'Plan'
    LIMIT 1
)
WHERE plm_status_id IS NULL;

-- 2.4 plans_instance_pli data migration
UPDATE plans_instance_pli 
SET pli_status_id = s.sts_id
FROM status_sts s
WHERE UPPER(s.sts_name) = UPPER(plans_instance_pli.pli_status)
  AND s.sts_type = 'Plan';

-- Handle unmapped plan instance status values with PLANNING default
UPDATE plans_instance_pli
SET pli_status_id = (
    SELECT sts_id FROM status_sts 
    WHERE sts_name = 'PLANNING' AND sts_type = 'Plan'
    LIMIT 1
)
WHERE pli_status_id IS NULL;

-- 2.5 sequences_instance_sqi data migration
UPDATE sequences_instance_sqi 
SET sqi_status_id = s.sts_id
FROM status_sts s
WHERE UPPER(s.sts_name) = UPPER(sequences_instance_sqi.sqi_status)
  AND s.sts_type = 'Sequence';

-- Handle unmapped sequence status values with PLANNING default
UPDATE sequences_instance_sqi
SET sqi_status_id = (
    SELECT sts_id FROM status_sts 
    WHERE sts_name = 'PLANNING' AND sts_type = 'Sequence'
    LIMIT 1
)
WHERE sqi_status_id IS NULL;

-- 2.6 phases_instance_phi data migration
UPDATE phases_instance_phi 
SET phi_status_id = s.sts_id
FROM status_sts s
WHERE UPPER(s.sts_name) = UPPER(phases_instance_phi.phi_status)
  AND s.sts_type = 'Phase';

-- Handle unmapped phase status values with PLANNING default
UPDATE phases_instance_phi
SET phi_status_id = (
    SELECT sts_id FROM status_sts 
    WHERE sts_name = 'PLANNING' AND sts_type = 'Phase'
    LIMIT 1
)
WHERE phi_status_id IS NULL;

-- 2.7 steps_instance_sti data migration  
UPDATE steps_instance_sti 
SET sti_status_id = s.sts_id
FROM status_sts s
WHERE UPPER(s.sts_name) = UPPER(steps_instance_sti.sti_status)
  AND s.sts_type = 'Step';

-- Handle unmapped step status values with PENDING default
UPDATE steps_instance_sti
SET sti_status_id = (
    SELECT sts_id FROM status_sts 
    WHERE sts_name = 'PENDING' AND sts_type = 'Step'
    LIMIT 1
)
WHERE sti_status_id IS NULL;

-- 2.8 controls_instance_cti data migration
UPDATE controls_instance_cti 
SET cti_status_id = s.sts_id
FROM status_sts s
WHERE UPPER(s.sts_name) = UPPER(controls_instance_cti.cti_status)
  AND s.sts_type = 'Control';

-- Handle unmapped control status values with TODO default
UPDATE controls_instance_cti
SET cti_status_id = (
    SELECT sts_id FROM status_sts 
    WHERE sts_name = 'TODO' AND sts_type = 'Control'
    LIMIT 1
)
WHERE cti_status_id IS NULL;

-- =============================================================================
-- PHASE 3: ADD CONSTRAINTS AND INDEXES
-- =============================================================================
-- Add NOT NULL constraints, foreign key constraints, and performance indexes
-- to all new status ID columns.

-- 3.1 migrations_mig constraints and indexes
ALTER TABLE migrations_mig ALTER COLUMN mig_status_id SET NOT NULL;
ALTER TABLE migrations_mig ADD CONSTRAINT fk_migrations_mig_status 
    FOREIGN KEY (mig_status_id) REFERENCES status_sts(sts_id);
CREATE INDEX idx_migrations_mig_status_id ON migrations_mig(mig_status_id);

-- 3.2 iterations_ite constraints and indexes
ALTER TABLE iterations_ite ALTER COLUMN ite_status_id SET NOT NULL;
ALTER TABLE iterations_ite ADD CONSTRAINT fk_iterations_ite_status 
    FOREIGN KEY (ite_status_id) REFERENCES status_sts(sts_id);
CREATE INDEX idx_iterations_ite_status_id ON iterations_ite(ite_status_id);

-- 3.3 plans_master_plm constraints and indexes
ALTER TABLE plans_master_plm ALTER COLUMN plm_status_id SET NOT NULL;
ALTER TABLE plans_master_plm ADD CONSTRAINT fk_plans_master_plm_status 
    FOREIGN KEY (plm_status_id) REFERENCES status_sts(sts_id);
CREATE INDEX idx_plans_master_plm_status_id ON plans_master_plm(plm_status_id);

-- 3.4 plans_instance_pli constraints and indexes
ALTER TABLE plans_instance_pli ALTER COLUMN pli_status_id SET NOT NULL;
ALTER TABLE plans_instance_pli ADD CONSTRAINT fk_plans_instance_pli_status 
    FOREIGN KEY (pli_status_id) REFERENCES status_sts(sts_id);
CREATE INDEX idx_plans_instance_pli_status_id ON plans_instance_pli(pli_status_id);

-- 3.5 sequences_instance_sqi constraints and indexes
ALTER TABLE sequences_instance_sqi ALTER COLUMN sqi_status_id SET NOT NULL;
ALTER TABLE sequences_instance_sqi ADD CONSTRAINT fk_sequences_instance_sqi_status 
    FOREIGN KEY (sqi_status_id) REFERENCES status_sts(sts_id);
CREATE INDEX idx_sequences_instance_sqi_status_id ON sequences_instance_sqi(sqi_status_id);

-- 3.6 phases_instance_phi constraints and indexes
ALTER TABLE phases_instance_phi ALTER COLUMN phi_status_id SET NOT NULL;
ALTER TABLE phases_instance_phi ADD CONSTRAINT fk_phases_instance_phi_status 
    FOREIGN KEY (phi_status_id) REFERENCES status_sts(sts_id);
CREATE INDEX idx_phases_instance_phi_status_id ON phases_instance_phi(phi_status_id);

-- 3.7 steps_instance_sti constraints and indexes
ALTER TABLE steps_instance_sti ALTER COLUMN sti_status_id SET NOT NULL;
ALTER TABLE steps_instance_sti ADD CONSTRAINT fk_steps_instance_sti_status 
    FOREIGN KEY (sti_status_id) REFERENCES status_sts(sts_id);
CREATE INDEX idx_steps_instance_sti_status_id ON steps_instance_sti(sti_status_id);

-- 3.8 controls_instance_cti constraints and indexes
ALTER TABLE controls_instance_cti ALTER COLUMN cti_status_id SET NOT NULL;
ALTER TABLE controls_instance_cti ADD CONSTRAINT fk_controls_instance_cti_status 
    FOREIGN KEY (cti_status_id) REFERENCES status_sts(sts_id);
CREATE INDEX idx_controls_instance_cti_status_id ON controls_instance_cti(cti_status_id);

-- =============================================================================
-- PHASE 4: COLUMN REPLACEMENT
-- =============================================================================
-- Drop old VARCHAR status columns and rename new INTEGER columns to take their
-- place, completing the normalization process.

-- 4.1 migrations_mig column replacement
ALTER TABLE migrations_mig DROP COLUMN mig_status;
ALTER TABLE migrations_mig RENAME COLUMN mig_status_id TO mig_status;

-- 4.2 iterations_ite column replacement
ALTER TABLE iterations_ite DROP COLUMN ite_status;
ALTER TABLE iterations_ite RENAME COLUMN ite_status_id TO ite_status;

-- 4.3 plans_master_plm column replacement
ALTER TABLE plans_master_plm DROP COLUMN plm_status;
ALTER TABLE plans_master_plm RENAME COLUMN plm_status_id TO plm_status;

-- 4.4 plans_instance_pli column replacement
ALTER TABLE plans_instance_pli DROP COLUMN pli_status;
ALTER TABLE plans_instance_pli RENAME COLUMN pli_status_id TO pli_status;

-- 4.5 sequences_instance_sqi column replacement
ALTER TABLE sequences_instance_sqi DROP COLUMN sqi_status;
ALTER TABLE sequences_instance_sqi RENAME COLUMN sqi_status_id TO sqi_status;

-- 4.6 phases_instance_phi column replacement
ALTER TABLE phases_instance_phi DROP COLUMN phi_status;
ALTER TABLE phases_instance_phi RENAME COLUMN phi_status_id TO phi_status;

-- 4.7 steps_instance_sti column replacement
ALTER TABLE steps_instance_sti DROP COLUMN sti_status;
ALTER TABLE steps_instance_sti RENAME COLUMN sti_status_id TO sti_status;

-- 4.8 controls_instance_cti column replacement
ALTER TABLE controls_instance_cti DROP COLUMN cti_status;
ALTER TABLE controls_instance_cti RENAME COLUMN cti_status_id TO cti_status;

-- =============================================================================
-- POST-MIGRATION VALIDATION
-- =============================================================================
-- Validate the completed migration with integrity checks.

-- Verify all status fields are properly populated (should return 0 for all)
SELECT 'migrations_mig' as table_name, COUNT(*) as null_count FROM migrations_mig WHERE mig_status IS NULL
UNION ALL
SELECT 'iterations_ite', COUNT(*) FROM iterations_ite WHERE ite_status IS NULL
UNION ALL
SELECT 'plans_master_plm', COUNT(*) FROM plans_master_plm WHERE plm_status IS NULL
UNION ALL
SELECT 'plans_instance_pli', COUNT(*) FROM plans_instance_pli WHERE pli_status IS NULL
UNION ALL
SELECT 'sequences_instance_sqi', COUNT(*) FROM sequences_instance_sqi WHERE sqi_status IS NULL
UNION ALL
SELECT 'phases_instance_phi', COUNT(*) FROM phases_instance_phi WHERE phi_status IS NULL
UNION ALL
SELECT 'steps_instance_sti', COUNT(*) FROM steps_instance_sti WHERE sti_status IS NULL
UNION ALL
SELECT 'controls_instance_cti', COUNT(*) FROM controls_instance_cti WHERE cti_status IS NULL;

-- Update table comments to document the normalization
COMMENT ON COLUMN migrations_mig.mig_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';
COMMENT ON COLUMN iterations_ite.ite_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';
COMMENT ON COLUMN plans_master_plm.plm_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';
COMMENT ON COLUMN plans_instance_pli.pli_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';
COMMENT ON COLUMN sequences_instance_sqi.sqi_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';
COMMENT ON COLUMN phases_instance_phi.phi_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';
COMMENT ON COLUMN steps_instance_sti.sti_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';
COMMENT ON COLUMN controls_instance_cti.cti_status IS 'Status ID referencing status_sts table (normalized from VARCHAR)';

-- =============================================================================
-- ROLLBACK PROCEDURES (COMPLETE)
-- =============================================================================
-- Complete rollback scripts for emergency recovery if needed.

--rollback -- Phase 4 Rollback: Restore original column names and add VARCHAR columns
--rollback ALTER TABLE migrations_mig RENAME COLUMN mig_status TO mig_status_id;
--rollback ALTER TABLE migrations_mig ADD COLUMN mig_status VARCHAR(50);
--rollback UPDATE migrations_mig SET mig_status = s.sts_name FROM status_sts s WHERE s.sts_id = migrations_mig.mig_status_id;
--rollback ALTER TABLE migrations_mig ALTER COLUMN mig_status SET NOT NULL;

--rollback ALTER TABLE iterations_ite RENAME COLUMN ite_status TO ite_status_id;
--rollback ALTER TABLE iterations_ite ADD COLUMN ite_status VARCHAR(50);
--rollback UPDATE iterations_ite SET ite_status = s.sts_name FROM status_sts s WHERE s.sts_id = iterations_ite.ite_status_id;
--rollback ALTER TABLE iterations_ite ALTER COLUMN ite_status SET NOT NULL;

--rollback ALTER TABLE plans_master_plm RENAME COLUMN plm_status TO plm_status_id;
--rollback ALTER TABLE plans_master_plm ADD COLUMN plm_status VARCHAR(50);
--rollback UPDATE plans_master_plm SET plm_status = s.sts_name FROM status_sts s WHERE s.sts_id = plans_master_plm.plm_status_id;
--rollback ALTER TABLE plans_master_plm ALTER COLUMN plm_status SET NOT NULL;

--rollback ALTER TABLE plans_instance_pli RENAME COLUMN pli_status TO pli_status_id;
--rollback ALTER TABLE plans_instance_pli ADD COLUMN pli_status VARCHAR(50);
--rollback UPDATE plans_instance_pli SET pli_status = s.sts_name FROM status_sts s WHERE s.sts_id = plans_instance_pli.pli_status_id;
--rollback ALTER TABLE plans_instance_pli ALTER COLUMN pli_status SET NOT NULL;

--rollback ALTER TABLE sequences_instance_sqi RENAME COLUMN sqi_status TO sqi_status_id;
--rollback ALTER TABLE sequences_instance_sqi ADD COLUMN sqi_status VARCHAR(50);
--rollback UPDATE sequences_instance_sqi SET sqi_status = s.sts_name FROM status_sts s WHERE s.sts_id = sequences_instance_sqi.sqi_status_id;
--rollback ALTER TABLE sequences_instance_sqi ALTER COLUMN sqi_status SET NOT NULL;

--rollback ALTER TABLE phases_instance_phi RENAME COLUMN phi_status TO phi_status_id;
--rollback ALTER TABLE phases_instance_phi ADD COLUMN phi_status VARCHAR(50);
--rollback UPDATE phases_instance_phi SET phi_status = s.sts_name FROM status_sts s WHERE s.sts_id = phases_instance_phi.phi_status_id;
--rollback ALTER TABLE phases_instance_phi ALTER COLUMN phi_status SET NOT NULL;

--rollback ALTER TABLE steps_instance_sti RENAME COLUMN sti_status TO sti_status_id;
--rollback ALTER TABLE steps_instance_sti ADD COLUMN sti_status VARCHAR(50);
--rollback UPDATE steps_instance_sti SET sti_status = s.sts_name FROM status_sts s WHERE s.sts_id = steps_instance_sti.sti_status_id;
--rollback ALTER TABLE steps_instance_sti ALTER COLUMN sti_status SET NOT NULL;

--rollback ALTER TABLE controls_instance_cti RENAME COLUMN cti_status TO cti_status_id;
--rollback ALTER TABLE controls_instance_cti ADD COLUMN cti_status VARCHAR(50);
--rollback UPDATE controls_instance_cti SET cti_status = s.sts_name FROM status_sts s WHERE s.sts_id = controls_instance_cti.cti_status_id;
--rollback ALTER TABLE controls_instance_cti ALTER COLUMN cti_status SET NOT NULL;

--rollback -- Phase 3 Rollback: Drop constraints and indexes
--rollback DROP INDEX IF EXISTS idx_controls_instance_cti_status_id;
--rollback ALTER TABLE controls_instance_cti DROP CONSTRAINT IF EXISTS fk_controls_instance_cti_status;

--rollback DROP INDEX IF EXISTS idx_steps_instance_sti_status_id;
--rollback ALTER TABLE steps_instance_sti DROP CONSTRAINT IF EXISTS fk_steps_instance_sti_status;

--rollback DROP INDEX IF EXISTS idx_phases_instance_phi_status_id;
--rollback ALTER TABLE phases_instance_phi DROP CONSTRAINT IF EXISTS fk_phases_instance_phi_status;

--rollback DROP INDEX IF EXISTS idx_sequences_instance_sqi_status_id;
--rollback ALTER TABLE sequences_instance_sqi DROP CONSTRAINT IF EXISTS fk_sequences_instance_sqi_status;

--rollback DROP INDEX IF EXISTS idx_plans_instance_pli_status_id;
--rollback ALTER TABLE plans_instance_pli DROP CONSTRAINT IF EXISTS fk_plans_instance_pli_status;

--rollback DROP INDEX IF EXISTS idx_plans_master_plm_status_id;
--rollback ALTER TABLE plans_master_plm DROP CONSTRAINT IF EXISTS fk_plans_master_plm_status;

--rollback DROP INDEX IF EXISTS idx_iterations_ite_status_id;
--rollback ALTER TABLE iterations_ite DROP CONSTRAINT IF EXISTS fk_iterations_ite_status;

--rollback DROP INDEX IF EXISTS idx_migrations_mig_status_id;
--rollback ALTER TABLE migrations_mig DROP CONSTRAINT IF EXISTS fk_migrations_mig_status;

--rollback -- Phase 1 Rollback: Drop new status ID columns
--rollback ALTER TABLE controls_instance_cti DROP COLUMN IF EXISTS cti_status_id;
--rollback ALTER TABLE steps_instance_sti DROP COLUMN IF EXISTS sti_status_id;
--rollback ALTER TABLE phases_instance_phi DROP COLUMN IF EXISTS phi_status_id;
--rollback ALTER TABLE sequences_instance_sqi DROP COLUMN IF EXISTS sqi_status_id;
--rollback ALTER TABLE plans_instance_pli DROP COLUMN IF EXISTS pli_status_id;
--rollback ALTER TABLE plans_master_plm DROP COLUMN IF EXISTS plm_status_id;
--rollback ALTER TABLE iterations_ite DROP COLUMN IF EXISTS ite_status_id;
--rollback ALTER TABLE migrations_mig DROP COLUMN IF EXISTS mig_status_id;

-- Reset column comments
--rollback COMMENT ON COLUMN migrations_mig.mig_status IS 'Migration status (e.g., PLANNING, IN_PROGRESS, COMPLETED)';
--rollback COMMENT ON COLUMN iterations_ite.ite_status IS 'Iteration status (e.g., PENDING, IN_PROGRESS, COMPLETED)';
--rollback COMMENT ON COLUMN plans_master_plm.plm_status IS 'Plan master status (e.g., DRAFT, ACTIVE, ARCHIVED)';
--rollback COMMENT ON COLUMN plans_instance_pli.pli_status IS 'Plan instance status (e.g., NOT_STARTED, IN_PROGRESS, COMPLETED)';
--rollback COMMENT ON COLUMN sequences_instance_sqi.sqi_status IS 'Sequence instance status (e.g., NOT_STARTED, IN_PROGRESS, COMPLETED)';
--rollback COMMENT ON COLUMN phases_instance_phi.phi_status IS 'Phase instance status (e.g., NOT_STARTED, IN_PROGRESS, COMPLETED)';
--rollback COMMENT ON COLUMN steps_instance_sti.sti_status IS 'Step instance status (e.g., NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED)';
--rollback COMMENT ON COLUMN controls_instance_cti.cti_status IS 'Control instance status (e.g., PENDING, PASSED, FAILED)';