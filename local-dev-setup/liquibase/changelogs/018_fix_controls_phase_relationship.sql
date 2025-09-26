--liquibase formatted sql

--changeset lucas.challamel:018_fix_controls_phase_relationship_v1 context:all
--comment: Fix controls_instance_cti to reference phi_id (phases) instead of sti_id (steps) per ADR-016

-- =====================================================
-- Fix controls_instance_cti phase relationships
-- =====================================================

-- Step 1: Drop existing constraints and columns
ALTER TABLE controls_instance_cti DROP CONSTRAINT IF EXISTS fk_cti_sti_sti_id;

-- Step 2: Rename the column from sti_id to phi_id
ALTER TABLE controls_instance_cti RENAME COLUMN sti_id TO phi_id;

-- Step 3: Add new foreign key constraint to phases_instance_phi
ALTER TABLE controls_instance_cti
    ADD CONSTRAINT fk_cti_phi_phi_id
    FOREIGN KEY (phi_id)
    REFERENCES phases_instance_phi(phi_id);

-- Step 4: Add comment to document the change
COMMENT ON TABLE controls_instance_cti IS 'Control instances linked to phase instances per ADR-016 - controls are phase-level quality gates';
COMMENT ON COLUMN controls_instance_cti.phi_id IS 'Reference to the phase instance this control point belongs to';

--rollback ALTER TABLE controls_instance_cti DROP CONSTRAINT IF EXISTS fk_cti_phi_phi_id;
--rollback ALTER TABLE controls_instance_cti RENAME COLUMN phi_id TO sti_id;
--rollback ALTER TABLE controls_instance_cti ADD CONSTRAINT fk_cti_sti_sti_id FOREIGN KEY (sti_id) REFERENCES steps_instance_sti(sti_id);
--rollback COMMENT ON TABLE controls_instance_cti IS NULL;
--rollback COMMENT ON COLUMN controls_instance_cti.sti_id IS NULL;

--changeset lucas.challamel:018_fix_labels_created_by_v1 context:all
--comment: Fix labels_lbl and labels_lbl_x_controls_master_ctm created_by fields to be VARCHAR for consistency with audit field standards

-- =====================================================
-- Fix labels created_by fields to VARCHAR
-- =====================================================

-- Convert INTEGER created_by to VARCHAR in labels_lbl table
-- This was missed in migration 016 and needs to be fixed for data generators to work
ALTER TABLE labels_lbl
DROP COLUMN IF EXISTS created_by;

ALTER TABLE labels_lbl
ADD COLUMN created_by VARCHAR(255) DEFAULT 'system';

-- Update any existing records to use 'migration' as the created_by value
UPDATE labels_lbl
SET created_by = 'migration'
WHERE created_by IS NULL;

-- Also fix labels_lbl_x_controls_master_ctm which was missed in migration 017
ALTER TABLE labels_lbl_x_controls_master_ctm
DROP COLUMN IF EXISTS created_by;

ALTER TABLE labels_lbl_x_controls_master_ctm
ADD COLUMN created_by VARCHAR(255) DEFAULT 'system';

UPDATE labels_lbl_x_controls_master_ctm
SET created_by = 'migration'
WHERE created_by IS NULL;

-- Add comments to document the fields
COMMENT ON COLUMN labels_lbl.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';
COMMENT ON COLUMN labels_lbl_x_controls_master_ctm.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';

--rollback ALTER TABLE labels_lbl DROP COLUMN IF EXISTS created_by;
--rollback ALTER TABLE labels_lbl ADD COLUMN created_by INTEGER;
--rollback ALTER TABLE labels_lbl_x_controls_master_ctm DROP COLUMN IF EXISTS created_by;
--rollback ALTER TABLE labels_lbl_x_controls_master_ctm ADD COLUMN created_by INTEGER;