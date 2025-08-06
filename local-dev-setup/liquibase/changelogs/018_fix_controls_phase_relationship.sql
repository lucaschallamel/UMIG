--liquibase formatted sql

--changeset lucas.challamel:018_fix_controls_phase_relationship context:all
--comment: Fix controls_instance_cti to reference phi_id (phases) instead of sti_id (steps) per ADR-016

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