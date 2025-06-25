--liquibase formatted sql

--changeset lucas.challamel:001_unified_baseline_v3 context:all
--comment: This is the unified baseline schema for the UMIG application, fully refactored to align with ADR-014 naming conventions and restore the Migration -> Iteration hierarchy.

--
-- DROP EXISTING TABLES TO ENSURE A CLEAN BUILD
--
DROP TABLE IF EXISTS audit_log_aud CASCADE;
DROP TABLE IF EXISTS controls_instance_cti CASCADE;
DROP TABLE IF EXISTS instructions_instance_ini CASCADE;
DROP TABLE IF EXISTS steps_instance_sti CASCADE;
DROP TABLE IF EXISTS phases_instance_phi CASCADE;
DROP TABLE IF EXISTS sequences_instance_sqi CASCADE;
DROP TABLE IF EXISTS plans_instance_pli CASCADE;
DROP TABLE IF EXISTS iterations_ite CASCADE;
DROP TABLE IF EXISTS migrations_mig CASCADE;
DROP TABLE IF EXISTS controls_master_ctm CASCADE;
DROP TABLE IF EXISTS instructions_master_inm CASCADE;
DROP TABLE IF EXISTS steps_master_stm CASCADE;
DROP TABLE IF EXISTS phases_master_phm CASCADE;
DROP TABLE IF EXISTS sequences_master_sqm CASCADE;
DROP TABLE IF EXISTS plans_master_plm CASCADE;
DROP TABLE IF EXISTS environments_env_x_iterations_ite CASCADE;
DROP TABLE IF EXISTS environments_env_x_applications_app CASCADE;
DROP TABLE IF EXISTS teams_tms_x_applications_app CASCADE;
DROP TABLE IF EXISTS users_usr CASCADE;
DROP TABLE IF EXISTS teams_tms CASCADE;
DROP TABLE IF EXISTS environment_roles_enr CASCADE;
DROP TABLE IF EXISTS step_types_stt CASCADE;
DROP TABLE IF EXISTS iteration_types_itt CASCADE;
DROP TABLE IF EXISTS steps_master_stm_x_iteration_types_itt CASCADE;
DROP TABLE IF EXISTS steps_master_stm_x_teams_tms_impacted CASCADE;
DROP TABLE IF EXISTS roles_rls CASCADE;
DROP TABLE IF EXISTS environments_env CASCADE;
DROP TABLE IF EXISTS applications_app CASCADE;

--
-- CORE TABLES
--

CREATE TABLE applications_app (
    app_id SERIAL PRIMARY KEY,
    app_code VARCHAR(50) NOT NULL UNIQUE,
    app_name VARCHAR(64),
    app_description TEXT
);

CREATE TABLE environments_env (
    env_id SERIAL PRIMARY KEY,
    env_code VARCHAR(10) UNIQUE,
    env_name VARCHAR(64),
    env_description TEXT
);

CREATE TABLE roles_rls (
    rls_id SERIAL PRIMARY KEY,
    rls_code VARCHAR(10) UNIQUE,
    rls_description TEXT
);

CREATE TABLE teams_tms (
    tms_id SERIAL PRIMARY KEY,
    tms_name VARCHAR(64) NOT NULL,
    tms_email VARCHAR(255) UNIQUE,
    tms_description TEXT
);

CREATE TABLE users_usr (
    usr_id SERIAL PRIMARY KEY,
    usr_code VARCHAR(3) NOT NULL UNIQUE,
    usr_first_name VARCHAR(50) NOT NULL,
    usr_last_name VARCHAR(50) NOT NULL,
    usr_email VARCHAR(255) NOT NULL UNIQUE,
    usr_is_admin BOOLEAN DEFAULT FALSE,
    tms_id INTEGER,
    rls_id INTEGER,
    CONSTRAINT fk_usr_tms_tms_id FOREIGN KEY (tms_id) REFERENCES teams_tms(tms_id),
    CONSTRAINT fk_usr_rls_rls_id FOREIGN KEY (rls_id) REFERENCES roles_rls(rls_id)
);

CREATE TABLE migrations_mig (
    mig_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usr_id_owner INTEGER NOT NULL,
    mig_name VARCHAR(255) NOT NULL,
    mig_description TEXT,
    mig_status VARCHAR(50) NOT NULL, -- e.g., PLANNING, IN_PROGRESS, COMPLETED
    mig_type VARCHAR(50) NOT NULL, -- e.g., MIGRATION, DR_TEST
    mig_start_date DATE,
    mig_end_date DATE,
    mig_business_cutover_date DATE,
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) DEFAULT 'system',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mig_usr_usr_id_owner FOREIGN KEY (usr_id_owner) REFERENCES users_usr(usr_id)
);

-- Table for Iteration Types
CREATE TABLE iteration_types_itt (
    itt_code VARCHAR(10) PRIMARY KEY,
    itt_name VARCHAR(100) NOT NULL
);

-- Insert default iteration types
INSERT INTO iteration_types_itt (itt_code, itt_name) VALUES
('RUN', 'Run'),
('DR', 'Dress Rehearsal'),
('CUTOVER', 'Cutover');

CREATE TABLE iterations_ite (
    ite_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mig_id UUID NOT NULL,
    itt_code VARCHAR(10) NOT NULL,
    ite_name VARCHAR(255) NOT NULL,
    ite_description TEXT,
    ite_status VARCHAR(50) NOT NULL, -- e.g., PENDING, IN_PROGRESS, COMPLETED
    ite_static_cutover_date TIMESTAMPTZ,
    ite_dynamic_cutover_date TIMESTAMPTZ,
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) DEFAULT 'system',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ite_mig_mig_id FOREIGN KEY (mig_id) REFERENCES migrations_mig(mig_id),
    CONSTRAINT fk_ite_itt_code FOREIGN KEY (itt_code) REFERENCES iteration_types_itt(itt_code)
);

CREATE TABLE plans_master_plm (
    plm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tms_id INTEGER NOT NULL,
    plm_name VARCHAR(255) NOT NULL,
    plm_description TEXT,
    plm_status VARCHAR(50) NOT NULL, -- e.g., DRAFT, ACTIVE, ARCHIVED
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) DEFAULT 'system',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_plm_tms_tms_id FOREIGN KEY (tms_id) REFERENCES teams_tms(tms_id)
);

CREATE TABLE sequences_master_sqm (
    sqm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plm_id UUID NOT NULL,
    sqm_order INTEGER NOT NULL,
    sqm_name VARCHAR(255) NOT NULL,
    sqm_description TEXT,
    predecessor_sqm_id UUID, -- Self-referencing FK for dependency
    CONSTRAINT fk_sqm_plm_plm_id FOREIGN KEY (plm_id) REFERENCES plans_master_plm(plm_id),
    CONSTRAINT fk_sqm_sqm_predecessor FOREIGN KEY (predecessor_sqm_id) REFERENCES sequences_master_sqm(sqm_id)
);

CREATE TABLE phases_master_phm (
    phm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sqm_id UUID NOT NULL,
    phm_order INTEGER NOT NULL,
    phm_name VARCHAR(255) NOT NULL,
    phm_description TEXT,
    predecessor_phm_id UUID, -- Self-referencing FK for dependency
    CONSTRAINT fk_phm_sqm_sqm_id FOREIGN KEY (sqm_id) REFERENCES sequences_master_sqm(sqm_id),
    CONSTRAINT fk_phm_phm_predecessor FOREIGN KEY (predecessor_phm_id) REFERENCES phases_master_phm(phm_id)
);

CREATE TABLE environment_roles_enr (
    enr_id SERIAL PRIMARY KEY,
    enr_name VARCHAR(50) NOT NULL UNIQUE,
    enr_description TEXT
);

INSERT INTO environment_roles_enr (enr_name, enr_description) VALUES
('PROD', 'Production environment'),
('TEST', 'Testing environment'),
('BACKUP', 'Backup environment');

-- Table for Step Types
CREATE TABLE step_types_stt (
    stt_code VARCHAR(3) PRIMARY KEY,
    stt_name VARCHAR(100) NOT NULL,
    stt_color VARCHAR(7) NOT NULL -- Hex color code e.g. #RRGGBB
);

-- Insert default step types
INSERT INTO step_types_stt (stt_code, stt_name, stt_color) VALUES
('MAN', 'Manual', '#3498DB'),
('AUT', 'Automated', '#2ECC71'),
('VAL', 'Validation', '#F1C40F'),
('DEC', 'Decision', '#E74C3C');

CREATE TABLE steps_master_stm (
    stm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phm_id UUID NOT NULL,
    tms_id_owner INTEGER NOT NULL, -- FK to teams_tms
    stt_code VARCHAR(3) NOT NULL, -- FK to step_types_stt
    stm_number INTEGER NOT NULL,
    stm_id_predecessor UUID, -- Self-referencing FK for dependency
    enr_id_target INTEGER NOT NULL, -- FK to environment role
    stm_name VARCHAR(255) NOT NULL,
    stm_description TEXT,
    stm_duration_minutes INTEGER,
    CONSTRAINT fk_stm_phm_phm_id FOREIGN KEY (phm_id) REFERENCES phases_master_phm(phm_id),
    CONSTRAINT fk_stm_tms_owner FOREIGN KEY (tms_id_owner) REFERENCES teams_tms(tms_id),
    CONSTRAINT fk_stm_stt_code FOREIGN KEY (stt_code) REFERENCES step_types_stt(stt_code),
    CONSTRAINT fk_stm_stm_predecessor FOREIGN KEY (stm_id_predecessor) REFERENCES steps_master_stm(stm_id),
    CONSTRAINT fk_stm_enr_target FOREIGN KEY (enr_id_target) REFERENCES environment_roles_enr(enr_id),
    UNIQUE (phm_id, stt_code, stm_number)
);

-- Association table for Steps and Iteration Types (many-to-many)
CREATE TABLE steps_master_stm_x_iteration_types_itt (
    stm_id UUID NOT NULL,
    itt_code VARCHAR(10) NOT NULL,
    CONSTRAINT pk_stm_itt PRIMARY KEY (stm_id, itt_code),
    CONSTRAINT fk_stm_itt_stm_id FOREIGN KEY (stm_id) REFERENCES steps_master_stm(stm_id) ON DELETE CASCADE,
    CONSTRAINT fk_stm_itt_itt_code FOREIGN KEY (itt_code) REFERENCES iteration_types_itt(itt_code) ON DELETE CASCADE
);

CREATE TABLE controls_master_ctm (
    ctm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phm_id UUID NOT NULL, -- Link to a phase instead of a step
    ctm_order INTEGER NOT NULL,
    ctm_name VARCHAR(255) NOT NULL,
    ctm_description TEXT,
    ctm_type VARCHAR(50) NOT NULL, -- e.g., QUALITY, COMPLETENESS, SECURITY
    ctm_is_critical BOOLEAN DEFAULT FALSE,
    CONSTRAINT fk_ctm_phm_phm_id FOREIGN KEY (phm_id) REFERENCES phases_master_phm(phm_id)
);

CREATE TABLE instructions_master_inm (
    inm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stm_id UUID NOT NULL,
    tms_id INTEGER, -- Owning team for this specific instruction
    ctm_id UUID, -- Associated control for this instruction
    inm_order INTEGER NOT NULL,
    inm_body TEXT,
    inm_duration_minutes INTEGER,
    CONSTRAINT fk_inm_stm_stm_id FOREIGN KEY (stm_id) REFERENCES steps_master_stm(stm_id),
    CONSTRAINT fk_inm_tms_tms_id FOREIGN KEY (tms_id) REFERENCES teams_tms(tms_id),
    CONSTRAINT fk_inm_ctm_ctm_id FOREIGN KEY (ctm_id) REFERENCES controls_master_ctm(ctm_id)
);

--
-- INSTANCE TABLES
--

CREATE TABLE plans_instance_pli (
    pli_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plm_id UUID NOT NULL,
    ite_id UUID NOT NULL,
    pli_name VARCHAR(255) NOT NULL,
    pli_description TEXT,
    pli_status VARCHAR(50) NOT NULL, -- e.g., NOT_STARTED, IN_PROGRESS, COMPLETED
    usr_id_owner INTEGER NOT NULL,
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) DEFAULT 'system',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pli_plm_plm_id FOREIGN KEY (plm_id) REFERENCES plans_master_plm(plm_id),
    CONSTRAINT fk_pli_ite_ite_id FOREIGN KEY (ite_id) REFERENCES iterations_ite(ite_id),
    CONSTRAINT fk_pli_usr_usr_id_owner FOREIGN KEY (usr_id_owner) REFERENCES users_usr(usr_id)
);

CREATE TABLE sequences_instance_sqi (
    sqi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pli_id UUID NOT NULL,
    sqm_id UUID NOT NULL,
    sqi_status VARCHAR(50) NOT NULL, -- e.g., NOT_STARTED, IN_PROGRESS, COMPLETED
    sqi_start_time TIMESTAMPTZ,
    sqi_end_time TIMESTAMPTZ,
    CONSTRAINT fk_sqi_pli_pli_id FOREIGN KEY (pli_id) REFERENCES plans_instance_pli(pli_id),
    CONSTRAINT fk_sqi_sqm_sqm_id FOREIGN KEY (sqm_id) REFERENCES sequences_master_sqm(sqm_id)
);

CREATE TABLE phases_instance_phi (
    phi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sqi_id UUID NOT NULL,
    phm_id UUID NOT NULL,
    phi_status VARCHAR(50) NOT NULL, -- e.g., NOT_STARTED, IN_PROGRESS, COMPLETED
    phi_start_time TIMESTAMPTZ,
    phi_end_time TIMESTAMPTZ,
    CONSTRAINT fk_phi_sqi_sqi_id FOREIGN KEY (sqi_id) REFERENCES sequences_instance_sqi(sqi_id),
    CONSTRAINT fk_phi_phm_phm_id FOREIGN KEY (phm_id) REFERENCES phases_master_phm(phm_id)
);

CREATE TABLE steps_instance_sti (
    sti_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phi_id UUID NOT NULL,
    stm_id UUID NOT NULL,
    sti_status VARCHAR(50) NOT NULL, -- e.g., NOT_STARTED, IN_PROGRESS, COMPLETED, SKIPPED
    sti_start_time TIMESTAMPTZ,
    sti_end_time TIMESTAMPTZ,
    usr_id_owner INTEGER,
    usr_id_assignee INTEGER,
    CONSTRAINT fk_sti_phi_phi_id FOREIGN KEY (phi_id) REFERENCES phases_instance_phi(phi_id),
    CONSTRAINT fk_sti_stm_stm_id FOREIGN KEY (stm_id) REFERENCES steps_master_stm(stm_id),
    CONSTRAINT fk_sti_usr_usr_id_owner FOREIGN KEY (usr_id_owner) REFERENCES users_usr(usr_id),
    CONSTRAINT fk_sti_usr_usr_id_assignee FOREIGN KEY (usr_id_assignee) REFERENCES users_usr(usr_id)
);

CREATE TABLE instructions_instance_ini (
    ini_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sti_id UUID NOT NULL,
    inm_id UUID NOT NULL,
    ini_is_completed BOOLEAN DEFAULT FALSE,
    ini_completed_at TIMESTAMPTZ,
    usr_id_completed_by INTEGER,
    CONSTRAINT fk_ini_sti_sti_id FOREIGN KEY (sti_id) REFERENCES steps_instance_sti(sti_id),
    CONSTRAINT fk_ini_inm_inm_id FOREIGN KEY (inm_id) REFERENCES instructions_master_inm(inm_id),
    CONSTRAINT fk_ini_usr_usr_id_completed_by FOREIGN KEY (usr_id_completed_by) REFERENCES users_usr(usr_id)
);

CREATE TABLE controls_instance_cti (
    cti_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sti_id UUID NOT NULL,
    ctm_id UUID NOT NULL,
    cti_status VARCHAR(50) NOT NULL, -- e.g., PENDING, PASSED, FAILED
    cti_validated_at TIMESTAMPTZ,
    usr_id_it_validator INTEGER,
    usr_id_biz_validator INTEGER,
    CONSTRAINT fk_cti_sti_sti_id FOREIGN KEY (sti_id) REFERENCES steps_instance_sti(sti_id),
    CONSTRAINT fk_cti_ctm_ctm_id FOREIGN KEY (ctm_id) REFERENCES controls_master_ctm(ctm_id),
    CONSTRAINT fk_cti_usr_it_validator FOREIGN KEY (usr_id_it_validator) REFERENCES users_usr(usr_id),
    CONSTRAINT fk_cti_usr_biz_validator FOREIGN KEY (usr_id_biz_validator) REFERENCES users_usr(usr_id)
);

--
-- JOIN TABLES
--

CREATE TABLE teams_tms_x_applications_app (
    tms_id INTEGER NOT NULL,
    app_id INTEGER NOT NULL,
    PRIMARY KEY (tms_id, app_id),
    CONSTRAINT fk_txa_tms_tms_id FOREIGN KEY (tms_id) REFERENCES teams_tms(tms_id),
    CONSTRAINT fk_txa_app_app_id FOREIGN KEY (app_id) REFERENCES applications_app(app_id)
);

CREATE TABLE environments_env_x_applications_app (
    env_id INTEGER NOT NULL,
    app_id INTEGER NOT NULL,
    PRIMARY KEY (env_id, app_id),
    CONSTRAINT fk_exa_env_env_id FOREIGN KEY (env_id) REFERENCES environments_env(env_id),
    CONSTRAINT fk_exa_app_app_id FOREIGN KEY (app_id) REFERENCES applications_app(app_id)
);

CREATE TABLE environments_env_x_iterations_ite (
    env_id INTEGER NOT NULL,
    ite_id UUID NOT NULL,
    enr_id INTEGER NOT NULL,
    PRIMARY KEY (env_id, ite_id),
    CONSTRAINT fk_exi_env_env_id FOREIGN KEY (env_id) REFERENCES environments_env(env_id),
    CONSTRAINT fk_exi_ite_ite_id FOREIGN KEY (ite_id) REFERENCES iterations_ite(ite_id),
    CONSTRAINT fk_exi_enr_enr_id FOREIGN KEY (enr_id) REFERENCES environment_roles_enr(enr_id)
);

-- Association table for Steps and Impacted Teams (many-to-many)
CREATE TABLE steps_master_stm_x_teams_tms_impacted (
    stm_id UUID NOT NULL,
    tms_id INTEGER NOT NULL,
    CONSTRAINT pk_stm_tms_impacted PRIMARY KEY (stm_id, tms_id),
    CONSTRAINT fk_stm_tms_impacted_stm FOREIGN KEY (stm_id) REFERENCES steps_master_stm(stm_id) ON DELETE CASCADE,
    CONSTRAINT fk_stm_tms_impacted_tms FOREIGN KEY (tms_id) REFERENCES teams_tms(tms_id) ON DELETE CASCADE
);

--
-- AUDITING
--

CREATE TABLE audit_log_aud (
    aud_id BIGSERIAL PRIMARY KEY,
    aud_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    usr_id INTEGER,
    aud_action VARCHAR(255) NOT NULL,
    aud_entity_type VARCHAR(50) NOT NULL,
    aud_entity_id UUID NOT NULL,
    aud_details JSONB,
    CONSTRAINT fk_aud_usr_usr_id FOREIGN KEY (usr_id) REFERENCES users_usr(usr_id)
);

COMMENT ON TABLE audit_log_aud IS 'Logs all major events like status changes, assignments, and comments for full traceability.';
COMMENT ON COLUMN audit_log_aud.aud_details IS 'Stores JSON data capturing the state change, e.g., { "from_status": "PENDING", "to_status": "IN_PROGRESS" }.';
