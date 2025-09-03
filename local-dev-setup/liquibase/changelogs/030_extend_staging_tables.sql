-- liquibase formatted sql

-- changeset LucasChallamel:030_extend_staging_tables author:UMIG Development Team
-- comment: Extend staging tables for JSON import functionality (US-034)

-- Step 1: Convert ENUM to VARCHAR(3) for flexible step type codes
-- First, we need to drop the foreign key constraint temporarily
ALTER TABLE stg_step_instructions DROP CONSTRAINT IF EXISTS fk_stg_step;

-- Convert step_type from ENUM to VARCHAR(3)
ALTER TABLE stg_steps 
ALTER COLUMN step_type TYPE VARCHAR(3) 
USING step_type::text;

-- Add check constraint to ensure step_type is exactly 3 characters
ALTER TABLE stg_steps
ADD CONSTRAINT chk_stg_steps_step_type_length 
CHECK (LENGTH(step_type) = 3);

-- Add comment about step type format
COMMENT ON COLUMN stg_steps.step_type IS 'Three-character step type code (e.g., IGO, CHK, DUM, TRT, BGO, BUS, GON, PRE, SYS)';

-- Step 2: Add import batch tracking
ALTER TABLE stg_steps
ADD COLUMN import_batch_id UUID,
ADD COLUMN import_source VARCHAR(255),
ADD COLUMN imported_by VARCHAR(255),
ADD COLUMN imported_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Add index for batch querying
CREATE INDEX idx_stg_steps_import_batch ON stg_steps(import_batch_id);

-- Step 3: Extend stg_step_instructions table
ALTER TABLE stg_step_instructions
ADD COLUMN nominated_user VARCHAR(255),
ADD COLUMN instruction_assigned_team VARCHAR(255),
ADD COLUMN associated_controls TEXT,
ADD COLUMN duration_minutes INTEGER,
ADD COLUMN instruction_order INTEGER;

-- Add comments for new instruction fields
COMMENT ON COLUMN stg_step_instructions.nominated_user IS 'User nominated for this instruction';
COMMENT ON COLUMN stg_step_instructions.instruction_assigned_team IS 'Team assigned to this instruction';
COMMENT ON COLUMN stg_step_instructions.associated_controls IS 'Control references associated with this instruction';
COMMENT ON COLUMN stg_step_instructions.duration_minutes IS 'Estimated duration in minutes';
COMMENT ON COLUMN stg_step_instructions.instruction_order IS 'Order of instruction within the step';

-- Add unique constraint for ON CONFLICT clause
ALTER TABLE stg_step_instructions
ADD CONSTRAINT uk_stg_step_instructions_step_instruction UNIQUE (step_id, instruction_id);

-- Step 4: Re-add foreign key constraint
ALTER TABLE stg_step_instructions
ADD CONSTRAINT fk_stg_step_instructions_stg_steps_step_id
    FOREIGN KEY(step_id)
    REFERENCES stg_steps(id)
    ON DELETE CASCADE;

-- Step 5: Create import_batches table for tracking imports
CREATE TABLE IF NOT EXISTS import_batches_imb (
    imb_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    imb_source VARCHAR(255) NOT NULL,
    imb_type VARCHAR(50) DEFAULT 'JSON_IMPORT',
    imb_status VARCHAR(50) DEFAULT 'IN_PROGRESS',
    imb_user_id VARCHAR(255),
    imb_start_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    imb_end_time TIMESTAMPTZ,
    imb_statistics JSONB,
    imb_error_message TEXT,
    imb_created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    imb_last_modified_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    imb_is_active BOOLEAN DEFAULT true
);

-- Add indexes for import_batches
CREATE INDEX idx_imb_status ON import_batches_imb(imb_status);
CREATE INDEX idx_imb_user ON import_batches_imb(imb_user_id);
CREATE INDEX idx_imb_created ON import_batches_imb(imb_created_date DESC);

-- Add comments for import_batches table
COMMENT ON TABLE import_batches_imb IS 'Tracks import operations for audit trail and rollback capability';
COMMENT ON COLUMN import_batches_imb.imb_id IS 'Unique identifier for the import batch';
COMMENT ON COLUMN import_batches_imb.imb_source IS 'Source of the import (filename, API, etc.)';
COMMENT ON COLUMN import_batches_imb.imb_type IS 'Type of import (JSON_IMPORT, CSV_IMPORT, etc.)';
COMMENT ON COLUMN import_batches_imb.imb_status IS 'Status: IN_PROGRESS, COMPLETED, FAILED, ROLLED_BACK';
COMMENT ON COLUMN import_batches_imb.imb_statistics IS 'JSON statistics about the import (counts, etc.)';

-- Step 6: Create staging validation view for easier querying
CREATE OR REPLACE VIEW v_staging_validation AS
SELECT 
    s.id as step_id,
    s.step_type,
    s.step_number,
    s.step_title,
    s.step_assigned_team as primary_team,
    s.step_impacted_teams as impacted_teams,
    s.import_batch_id,
    s.import_source,
    COUNT(i.id) as instruction_count,
    COUNT(DISTINCT i.instruction_assigned_team) as unique_teams,
    COUNT(i.nominated_user) as nominated_users_count,
    COUNT(i.associated_controls) as controls_count
FROM stg_steps s
LEFT JOIN stg_step_instructions i ON s.id = i.step_id
GROUP BY 
    s.id, s.step_type, s.step_number, s.step_title, 
    s.step_assigned_team, s.step_impacted_teams,
    s.import_batch_id, s.import_source;

COMMENT ON VIEW v_staging_validation IS 'Validation view for staging data before promotion to master tables';

-- Step 7: Drop the old ENUM type (cleanup)
DROP TYPE IF EXISTS stg_step_type;

--rollback ALTER TABLE stg_step_instructions DROP CONSTRAINT IF EXISTS fk_stg_step_instructions_stg_steps_step_id;
--rollback ALTER TABLE stg_steps ALTER COLUMN step_type TYPE stg_step_type USING step_type::stg_step_type;
--rollback ALTER TABLE stg_steps DROP CONSTRAINT IF EXISTS chk_stg_steps_step_type_length;
--rollback ALTER TABLE stg_steps DROP COLUMN IF EXISTS import_batch_id;
--rollback ALTER TABLE stg_steps DROP COLUMN IF EXISTS import_source;
--rollback ALTER TABLE stg_steps DROP COLUMN IF EXISTS imported_by;
--rollback ALTER TABLE stg_steps DROP COLUMN IF EXISTS imported_at;
--rollback DROP INDEX IF EXISTS idx_stg_steps_import_batch;
--rollback ALTER TABLE stg_step_instructions DROP COLUMN IF EXISTS nominated_user;
--rollback ALTER TABLE stg_step_instructions DROP COLUMN IF EXISTS instruction_assigned_team;
--rollback ALTER TABLE stg_step_instructions DROP COLUMN IF EXISTS associated_controls;
--rollback ALTER TABLE stg_step_instructions DROP COLUMN IF EXISTS duration_minutes;
--rollback ALTER TABLE stg_step_instructions DROP COLUMN IF EXISTS instruction_order;
--rollback ALTER TABLE stg_step_instructions DROP CONSTRAINT IF EXISTS uk_stg_step_instructions_step_instruction;
--rollback ALTER TABLE stg_step_instructions ADD CONSTRAINT fk_stg_step FOREIGN KEY(step_id) REFERENCES stg_steps(id) ON DELETE CASCADE;
-- Step 8: Import Orchestration Schema - Tracks complete import workflows
CREATE TABLE IF NOT EXISTS stg_import_orchestrations_ior (
    ior_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ior_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    ior_started TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ior_completed TIMESTAMPTZ NULL,
    ior_user_id VARCHAR(100) NOT NULL,
    ior_phase_count INTEGER DEFAULT 5,
    ior_success_count INTEGER DEFAULT 0,
    ior_error_count INTEGER DEFAULT 0,
    ior_phase_details JSONB NULL, -- JSON containing phase progress
    ior_configuration JSONB NULL, -- JSON containing orchestration configuration
    ior_statistics JSONB NULL, -- JSON containing orchestration statistics
    ior_error_details JSONB NULL, -- JSON containing errors and warnings
    ior_rollback_reason VARCHAR(500) NULL,
    ior_last_update TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ior_created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ior_is_active BOOLEAN DEFAULT true
);

-- Index for orchestration performance
CREATE INDEX IF NOT EXISTS idx_ior_user_started 
ON stg_import_orchestrations_ior (ior_user_id, ior_started DESC);

CREATE INDEX IF NOT EXISTS idx_ior_status_started 
ON stg_import_orchestrations_ior (ior_status, ior_started DESC);

-- Step 9: Import Progress Tracking Table - Real-time progress updates
CREATE TABLE IF NOT EXISTS stg_import_progress_tracking_ipt (
    ipt_id SERIAL PRIMARY KEY,
    ior_id UUID NOT NULL REFERENCES stg_import_orchestrations_ior(ior_id) ON DELETE CASCADE,
    ipt_phase_name VARCHAR(50) NOT NULL,
    ipt_step_name VARCHAR(100) NULL,
    ipt_progress_percentage INTEGER DEFAULT 0 CHECK (ipt_progress_percentage >= 0 AND ipt_progress_percentage <= 100),
    ipt_items_processed INTEGER DEFAULT 0,
    ipt_items_total INTEGER DEFAULT 0,
    ipt_status VARCHAR(20) DEFAULT 'PENDING',
    ipt_message VARCHAR(500) NULL,
    ipt_started TIMESTAMPTZ NULL,
    ipt_completed TIMESTAMPTZ NULL,
    ipt_last_update TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ipt_created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ipt_is_active BOOLEAN DEFAULT true
);

-- Index for real-time progress queries
CREATE INDEX IF NOT EXISTS idx_ipt_ior_phase 
ON stg_import_progress_tracking_ipt (ior_id, ipt_phase_name);

-- Step 10: Import Rollback Actions Table - Track rollback operations
CREATE TABLE IF NOT EXISTS stg_import_rollback_actions_ira (
    ira_id SERIAL PRIMARY KEY,
    ior_id UUID NOT NULL REFERENCES stg_import_orchestrations_ior(ior_id) ON DELETE CASCADE,
    imb_id UUID NULL REFERENCES import_batches_imb(imb_id) ON DELETE SET NULL, -- If rolling back specific batch
    ira_action_type VARCHAR(50) NOT NULL, -- ORCHESTRATION_ROLLBACK, BATCH_ROLLBACK, PHASE_ROLLBACK
    ira_target_phase VARCHAR(50) NULL,
    ira_rollback_reason VARCHAR(500) NOT NULL,
    ira_rollback_details JSONB NULL, -- JSON containing rollback details
    ira_executed_by VARCHAR(100) NOT NULL,
    ira_executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ira_success BOOLEAN DEFAULT false,
    ira_error_message VARCHAR(1000) NULL,
    ira_recovery_data JSONB NULL, -- JSON containing data needed for recovery
    ira_created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ira_is_active BOOLEAN DEFAULT true
);

-- Index for rollback history
CREATE INDEX IF NOT EXISTS idx_ira_ior_executed 
ON stg_import_rollback_actions_ira (ior_id, ira_executed_at DESC);

-- Step 11: Import Entity Dependencies Table - Track entity import order and dependencies  
CREATE TABLE IF NOT EXISTS stg_import_entity_dependencies_ied (
    ied_id SERIAL PRIMARY KEY,
    ied_entity_type VARCHAR(50) NOT NULL,
    ied_depends_on VARCHAR(50) NULL,
    ied_import_order INTEGER NOT NULL,
    ied_is_required BOOLEAN DEFAULT true,
    ied_validation_query TEXT NULL, -- SQL query to validate entity import
    ied_rollback_query TEXT NULL, -- SQL query to rollback entity import
    ied_created_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    ied_is_active BOOLEAN DEFAULT true,
    UNIQUE(ied_entity_type)
);

-- Pre-populate entity dependencies
INSERT INTO stg_import_entity_dependencies_ied (ied_entity_type, ied_depends_on, ied_import_order, ied_is_required, ied_validation_query) VALUES
('teams', NULL, 1, true, 'SELECT COUNT(*) FROM teams_tms WHERE tms_created_date > ?'),
('users', NULL, 2, true, 'SELECT COUNT(*) FROM users_usr WHERE usr_created_date > ?'),
('applications', NULL, 3, true, 'SELECT COUNT(*) FROM applications_app WHERE app_created_date > ?'),
('environments', NULL, 4, true, 'SELECT COUNT(*) FROM environments_env WHERE env_created_date > ?'),
('json_steps', 'teams,users,applications,environments', 5, true, 'SELECT COUNT(*) FROM stg_steps WHERE created_at > ?')
ON CONFLICT (ied_entity_type) DO NOTHING;

-- Step 12: Enhanced import_batches table with orchestration linking
ALTER TABLE import_batches_imb 
ADD COLUMN IF NOT EXISTS ior_id UUID NULL REFERENCES stg_import_orchestrations_ior(ior_id) ON DELETE SET NULL;

ALTER TABLE import_batches_imb
ADD COLUMN IF NOT EXISTS imb_entity_type VARCHAR(50) NULL;

-- Index for orchestration batch tracking
CREATE INDEX IF NOT EXISTS idx_imb_ior_start 
ON import_batches_imb (ior_id, imb_start_time DESC);

-- Step 13: Add documentation comments for orchestration tables
COMMENT ON TABLE stg_import_orchestrations_ior IS 'US-034: Tracks complete import orchestration workflows with phase management and progress tracking';
COMMENT ON TABLE stg_import_progress_tracking_ipt IS 'US-034: Real-time progress tracking for import orchestrations with granular step monitoring';
COMMENT ON TABLE stg_import_rollback_actions_ira IS 'US-034: Audit trail for all rollback operations with recovery data preservation';
COMMENT ON TABLE stg_import_entity_dependencies_ied IS 'US-034: Manages entity import dependencies and validation for proper sequencing';

--rollback DROP TABLE IF EXISTS stg_import_rollback_actions_ira CASCADE;
--rollback DROP TABLE IF EXISTS stg_import_progress_tracking_ipt CASCADE;  
--rollback DROP TABLE IF EXISTS stg_import_orchestrations_ior CASCADE;
--rollback DROP TABLE IF EXISTS stg_import_entity_dependencies_ied CASCADE;
--rollback ALTER TABLE import_batches_imb DROP COLUMN IF EXISTS ior_id;
--rollback ALTER TABLE import_batches_imb DROP COLUMN IF EXISTS imb_entity_type;
--rollback DROP TABLE IF EXISTS import_batches_imb;
--rollback DROP VIEW IF EXISTS v_staging_validation;
--rollback CREATE TYPE stg_step_type AS ENUM ('IGO', 'CHK', 'DUM', 'TRT');