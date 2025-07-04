--liquibase formatted sql
--changeset lucas.challamel:010-replicate-sequence-phases-steps-instructions-master-fields-in-instance
--description: 
--1. Replicate fields sqm_name, sqm_description, sqm_order, and predecessor_sqm_id from sequences_master_sqm into sequences_instance_sqi for override capability.
--2. Replicate fields phi_order, phi_name, phi_description, and predecessor_phi_id from phases_master_phm into phases_instance_phi for override capability.
--3. Replicate fields sti_id_predecessor, enr_id_target, sti_name, sti_description, and sti_duration_minutes from steps_master_stm into steps_instance_sti for override capability.
--4. Replicate fields ini_order, ini_body, ini_duration_minutes from instructions_master_inm into instructions_instance_ini for override capability.

ALTER TABLE sequences_instance_sqi
    ADD COLUMN sqi_name VARCHAR(255),
    ADD COLUMN sqi_description TEXT,
    ADD COLUMN sqi_order INTEGER,
    ADD COLUMN predecessor_sqi_id UUID;

-- Optionally, add comments for clarity
COMMENT ON COLUMN sequences_instance_sqi.sqi_name IS 'Override name for the sequence instance (copied from master by default)';
COMMENT ON COLUMN sequences_instance_sqi.sqi_description IS 'Override description for the sequence instance (copied from master by default)';
COMMENT ON COLUMN sequences_instance_sqi.sqi_order IS 'Override order for the sequence instance (copied from master by default)';
COMMENT ON COLUMN sequences_instance_sqi.predecessor_sqi_id IS 'Override predecessor sequence master ID for the instance (copied from master by default)';

-- PHASES: Replicate fields from phases_master_phm into phases_instance_phi for override capability
ALTER TABLE phases_instance_phi
    ADD COLUMN phi_order INTEGER,
    ADD COLUMN phi_name VARCHAR(255),
    ADD COLUMN phi_description TEXT,
    ADD COLUMN predecessor_phi_id UUID;

COMMENT ON COLUMN phases_instance_phi.phi_order IS 'Override order for the phase instance (copied from master by default)';
COMMENT ON COLUMN phases_instance_phi.phi_name IS 'Override name for the phase instance (copied from master by default)';
COMMENT ON COLUMN phases_instance_phi.phi_description IS 'Override description for the phase instance (copied from master by default)';
COMMENT ON COLUMN phases_instance_phi.predecessor_phi_id IS 'Override predecessor phase master ID for the instance (copied from master by default)';

-- STEPS: Replicate fields from steps_master_stm into steps_instance_sti for override capability
ALTER TABLE steps_instance_sti
    ADD COLUMN sti_id_predecessor UUID,
    ADD COLUMN enr_id_target UUID,
    ADD COLUMN sti_name VARCHAR(255),
    ADD COLUMN sti_description TEXT,
    ADD COLUMN sti_duration_minutes INTEGER;

COMMENT ON COLUMN steps_instance_sti.sti_id_predecessor IS 'Override predecessor step master ID for the instance (copied from master by default)';
COMMENT ON COLUMN steps_instance_sti.enr_id_target IS 'Override target entity reference for the step instance (copied from master by default)';
COMMENT ON COLUMN steps_instance_sti.sti_name IS 'Override name for the step instance (copied from master by default)';
COMMENT ON COLUMN steps_instance_sti.sti_description IS 'Override description for the step instance (copied from master by default)';
COMMENT ON COLUMN steps_instance_sti.sti_duration_minutes IS 'Override duration for the step instance (copied from master by default)';

-- INSTRUCTIONS: Replicate fields from instructions_master_inm into instructions_instance_ini for override capability
ALTER TABLE instructions_instance_ini
    ADD COLUMN tms_id INTEGER,
    ADD COLUMN cti_id UUID,
    ADD COLUMN ini_order INTEGER,
    ADD COLUMN ini_body TEXT,
    ADD COLUMN ini_duration_minutes INTEGER;

COMMENT ON COLUMN instructions_instance_ini.tms_id IS 'Override template step ID for the instruction instance (copied from master by default)';
COMMENT ON COLUMN instructions_instance_ini.cti_id IS 'Override custom template ID for the instruction instance (copied from master by default)';
COMMENT ON COLUMN instructions_instance_ini.ini_order IS 'Override order for the instruction instance (copied from master by default)';
COMMENT ON COLUMN instructions_instance_ini.ini_body IS 'Override body for the instruction instance (copied from master by default)';
COMMENT ON COLUMN instructions_instance_ini.ini_duration_minutes IS 'Override duration for the instruction instance (copied from master by default)';

-- CONTROLS: Replicate fields from controls_master_ctm into controls_instance_cti for override capability
ALTER TABLE controls_instance_cti
    ADD COLUMN cti_order INTEGER,
    ADD COLUMN cti_name VARCHAR(255),
    ADD COLUMN cti_description TEXT,
    ADD COLUMN cti_type VARCHAR(64),
    ADD COLUMN cti_is_critical BOOLEAN,
    ADD COLUMN cti_code TEXT;

COMMENT ON COLUMN controls_instance_cti.cti_order IS 'Override order for the control instance (copied from master by default)';
COMMENT ON COLUMN controls_instance_cti.cti_name IS 'Override name for the control instance (copied from master by default)';
COMMENT ON COLUMN controls_instance_cti.cti_description IS 'Override description for the control instance (copied from master by default)';
COMMENT ON COLUMN controls_instance_cti.cti_type IS 'Override type for the control instance (copied from master by default)';
COMMENT ON COLUMN controls_instance_cti.cti_is_critical IS 'Override criticality for the control instance (copied from master by default)';
COMMENT ON COLUMN controls_instance_cti.cti_code IS 'Override code for the control instance (copied from master by default)';