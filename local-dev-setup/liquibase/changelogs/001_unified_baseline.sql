--liquibase formatted sql

--changeset lucas.challamel:001_unified_baseline context:all
--comment: This is the unified baseline schema for the UMIG application, consolidating all tables into a single file for simplicity. It now includes DROP statements to ensure a clean build.

--
-- DROP EXISTING TABLES TO ENSURE A CLEAN BUILD
--
DROP TABLE IF EXISTS audit_log_aud CASCADE;
DROP TABLE IF EXISTS controls_instance_cti CASCADE;
DROP TABLE IF EXISTS instructions_instance_ini CASCADE;
DROP TABLE IF EXISTS steps_instance_sti CASCADE;
DROP TABLE IF EXISTS chapters_instance_chi CASCADE;
DROP TABLE IF EXISTS sequences_instance_sqi CASCADE;
DROP TABLE IF EXISTS migration_iterations_mic CASCADE;
DROP TABLE IF EXISTS controls_master_ctl CASCADE;
DROP TABLE IF EXISTS instructions_master_inm CASCADE;
DROP TABLE IF EXISTS steps_master_stm CASCADE;
DROP TABLE IF EXISTS chapters_master_chm CASCADE;
DROP TABLE IF EXISTS sequences_master_sqm CASCADE;
DROP TABLE IF EXISTS implementation_plans_canonical_ipc CASCADE;
DROP TABLE IF EXISTS teams_applications_tap CASCADE;
DROP TABLE IF EXISTS environments_applications_eap CASCADE;
DROP TABLE IF EXISTS users_usr CASCADE;
DROP TABLE IF EXISTS teams_tms CASCADE;
DROP TABLE IF EXISTS status_sts CASCADE;
DROP TABLE IF EXISTS roles_rls CASCADE;
DROP TABLE IF EXISTS environments_env CASCADE;
DROP TABLE IF EXISTS applications_app CASCADE;

--
-- CORE TABLES
--

-- Table structure for table 'applications_app'
CREATE TABLE IF NOT EXISTS applications_app (
    id SERIAL PRIMARY KEY,
    app_code VARCHAR(50) NOT NULL,
    app_name VARCHAR(64),
    app_description TEXT
);
ALTER TABLE applications_app ADD CONSTRAINT uq_applications_app_code UNIQUE (app_code);

-- Table structure for table 'environments_env'
CREATE TABLE IF NOT EXISTS environments_env (
    id SERIAL PRIMARY KEY,
    env_code VARCHAR(10) UNIQUE,
    env_name VARCHAR(64),
    env_description TEXT
);

-- Table structure for table 'roles_rls'
CREATE TABLE IF NOT EXISTS roles_rls (
    id SERIAL PRIMARY KEY,
    rle_code VARCHAR(10) UNIQUE,
    rle_name VARCHAR(64)
);

-- Table structure for table 'status_sts'
CREATE TABLE IF NOT EXISTS status_sts (
    id SERIAL PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL,
    sts_name VARCHAR(64) NOT NULL,
    sts_description TEXT
);

-- Table structure for table 'teams_tms'
CREATE TABLE IF NOT EXISTS teams_tms (
    id SERIAL PRIMARY KEY,
    tms_name VARCHAR(64) UNIQUE,
    tms_email VARCHAR(64) UNIQUE,
    tms_description TEXT
);

-- Table structure for table 'users_usr'
CREATE TABLE IF NOT EXISTS users_usr (
    id SERIAL PRIMARY KEY,
    usr_name VARCHAR(64),
    usr_email VARCHAR(64) UNIQUE,
    usr_confluence_id VARCHAR(64) UNIQUE,
    rle_id INTEGER,
    tms_id INTEGER
);

--
-- CORE JOIN TABLES
--

-- Table structure for table 'environments_applications_eap'
CREATE TABLE IF NOT EXISTS environments_applications_eap (
    id SERIAL PRIMARY KEY,
    env_id INTEGER,
    app_id INTEGER
);

-- Table structure for table 'teams_applications_tap'
CREATE TABLE IF NOT EXISTS teams_applications_tap (
    id SERIAL PRIMARY KEY,
    tms_id INTEGER,
    app_id INTEGER
);

--
-- CORE FOREIGN KEYS
--

ALTER TABLE users_usr ADD CONSTRAINT fk_usr_rle FOREIGN KEY (rle_id) REFERENCES roles_rls(id);
ALTER TABLE users_usr ADD CONSTRAINT fk_usr_tms FOREIGN KEY (tms_id) REFERENCES teams_tms(id);
ALTER TABLE environments_applications_eap ADD CONSTRAINT fk_eap_env FOREIGN KEY (env_id) REFERENCES environments_env(id);
ALTER TABLE environments_applications_eap ADD CONSTRAINT fk_eap_app FOREIGN KEY (app_id) REFERENCES applications_app(id);
ALTER TABLE teams_applications_tap ADD CONSTRAINT fk_tap_tms FOREIGN KEY (tms_id) REFERENCES teams_tms(id);
ALTER TABLE teams_applications_tap ADD CONSTRAINT fk_tap_app FOREIGN KEY (app_id) REFERENCES applications_app(id);


--
-- CANONICAL (MASTER) TABLES
--

-- Table: implementation_plans_canonical_ipc
CREATE TABLE implementation_plans_canonical_ipc (
    ipc_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipc_name VARCHAR(255) NOT NULL,
    ipc_description TEXT,
    ipc_version INTEGER NOT NULL DEFAULT 1,
    ipc_status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    author_usr_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT fk_ipc_author FOREIGN KEY (author_usr_id) REFERENCES users_usr(id)
);

-- Table: sequences_master_sqm
CREATE TABLE sequences_master_sqm (
    sqm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipc_id UUID NOT NULL,
    predecessor_sqm_id UUID,
    sqm_name VARCHAR(255) NOT NULL,
    sqm_description TEXT,
    sqm_duration_minutes INTEGER,
    CONSTRAINT fk_sqm_ipc FOREIGN KEY (ipc_id) REFERENCES implementation_plans_canonical_ipc(ipc_id),
    CONSTRAINT fk_sqm_predecessor FOREIGN KEY (predecessor_sqm_id) REFERENCES sequences_master_sqm(sqm_id)
);

-- Table: chapters_master_chm
CREATE TABLE chapters_master_chm (
    chm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sqm_id UUID NOT NULL,
    predecessor_chm_id UUID,
    chm_name VARCHAR(255) NOT NULL,
    chm_description TEXT,
    chm_duration_minutes INTEGER,
    CONSTRAINT fk_chm_sqm FOREIGN KEY (sqm_id) REFERENCES sequences_master_sqm(sqm_id),
    CONSTRAINT fk_chm_predecessor FOREIGN KEY (predecessor_chm_id) REFERENCES chapters_master_chm(chm_id)
);

-- Table: steps_master_stm
CREATE TABLE steps_master_stm (
    stm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chm_id UUID NOT NULL,
    predecessor_stm_id UUID,
    stm_name VARCHAR(255) NOT NULL,
    stm_description TEXT,
    stm_type VARCHAR(50),
    stm_duration_minutes INTEGER,
    tms_id INTEGER,
    env_type VARCHAR(50),
    CONSTRAINT fk_stm_chm FOREIGN KEY (chm_id) REFERENCES chapters_master_chm(chm_id),
    CONSTRAINT fk_stm_predecessor FOREIGN KEY (predecessor_stm_id) REFERENCES steps_master_stm(stm_id),
    CONSTRAINT fk_stm_tms FOREIGN KEY (tms_id) REFERENCES teams_tms(id)
);

-- Table: instructions_master_inm
CREATE TABLE instructions_master_inm (
    inm_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stm_id UUID NOT NULL,
    inm_name VARCHAR(255) NOT NULL,
    inm_description TEXT,
    inm_type VARCHAR(50),
    inm_content JSONB,
    tms_id INTEGER,
    CONSTRAINT fk_inm_stm FOREIGN KEY (stm_id) REFERENCES steps_master_stm(stm_id),
    CONSTRAINT fk_inm_tms FOREIGN KEY (tms_id) REFERENCES teams_tms(id)
);

-- Table: controls_master_ctl
CREATE TABLE controls_master_ctl (
    ctl_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stm_id UUID NOT NULL,
    ctl_name VARCHAR(255) NOT NULL,
    ctl_description TEXT,
    ctl_type VARCHAR(50),
    ctl_query TEXT,
    ctl_expected_result TEXT,
    tms_id INTEGER,
    CONSTRAINT fk_ctl_stm FOREIGN KEY (stm_id) REFERENCES steps_master_stm(stm_id),
    CONSTRAINT fk_ctl_tms FOREIGN KEY (tms_id) REFERENCES teams_tms(id)
);


--
-- INSTANCE & AUDIT TABLES
--

-- Table: migration_iterations_mic
CREATE TABLE migration_iterations_mic (
    mic_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ipc_id UUID NOT NULL,
    mic_name VARCHAR(255) NOT NULL,
    mic_description TEXT,
    mic_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    mic_start_date TIMESTAMP,
    mic_end_date TIMESTAMP,
    CONSTRAINT fk_mic_ipc FOREIGN KEY (ipc_id) REFERENCES implementation_plans_canonical_ipc(ipc_id)
);

-- Table: sequences_instance_sqi
CREATE TABLE sequences_instance_sqi (
    sqi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mic_id UUID NOT NULL,
    sqm_id UUID NOT NULL,
    sqi_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    sqi_start_date TIMESTAMP,
    sqi_end_date TIMESTAMP,
    CONSTRAINT fk_sqi_mic FOREIGN KEY (mic_id) REFERENCES migration_iterations_mic(mic_id),
    CONSTRAINT fk_sqi_sqm FOREIGN KEY (sqm_id) REFERENCES sequences_master_sqm(sqm_id)
);

-- Table: chapters_instance_chi
CREATE TABLE chapters_instance_chi (
    chi_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sqi_id UUID NOT NULL,
    chm_id UUID NOT NULL,
    chi_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    chi_start_date TIMESTAMP,
    chi_end_date TIMESTAMP,
    CONSTRAINT fk_chi_sqi FOREIGN KEY (sqi_id) REFERENCES sequences_instance_sqi(sqi_id),
    CONSTRAINT fk_chi_chm FOREIGN KEY (chm_id) REFERENCES chapters_master_chm(chm_id)
);

-- Table: steps_instance_sti
CREATE TABLE steps_instance_sti (
    sti_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chi_id UUID NOT NULL,
    stm_id UUID NOT NULL,
    sti_status VARCHAR(50) NOT NULL DEFAULT 'NOT_STARTED',
    assignee_usr_id INTEGER,
    sti_start_date TIMESTAMP,
    sti_end_date TIMESTAMP,
    CONSTRAINT fk_sti_chi FOREIGN KEY (chi_id) REFERENCES chapters_instance_chi(chi_id),
    CONSTRAINT fk_sti_stm FOREIGN KEY (stm_id) REFERENCES steps_master_stm(stm_id),
    CONSTRAINT fk_sti_assignee FOREIGN KEY (assignee_usr_id) REFERENCES users_usr(id)
);

-- Table: instructions_instance_ini
CREATE TABLE instructions_instance_ini (
    ini_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sti_id UUID NOT NULL,
    inm_id UUID NOT NULL,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    completed_at TIMESTAMP,
    completed_by_usr_id INTEGER,
    CONSTRAINT fk_ini_sti FOREIGN KEY (sti_id) REFERENCES steps_instance_sti(sti_id),
    CONSTRAINT fk_ini_inm FOREIGN KEY (inm_id) REFERENCES instructions_master_inm(inm_id),
    CONSTRAINT fk_ini_usr FOREIGN KEY (completed_by_usr_id) REFERENCES users_usr(id)
);

-- Table: controls_instance_cti
CREATE TABLE controls_instance_cti (
    cti_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sti_id UUID NOT NULL,
    ctl_id UUID NOT NULL,
    validation_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    it_validator_comment TEXT,
    biz_validator_comment TEXT,
    validated_at TIMESTAMP,
    it_validator_usr_id INTEGER,
    biz_validator_usr_id INTEGER,
    CONSTRAINT fk_cti_sti FOREIGN KEY (sti_id) REFERENCES steps_instance_sti(sti_id),
    CONSTRAINT fk_cti_ctl FOREIGN KEY (ctl_id) REFERENCES controls_master_ctl(ctl_id),
    CONSTRAINT fk_cti_it_usr FOREIGN KEY (it_validator_usr_id) REFERENCES users_usr(id),
    CONSTRAINT fk_cti_biz_usr FOREIGN KEY (biz_validator_usr_id) REFERENCES users_usr(id)
);

-- Table: audit_log_aud
CREATE TABLE audit_log_aud (
    aud_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    usr_id INTEGER,
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    details JSONB,
    CONSTRAINT fk_aud_usr FOREIGN KEY (usr_id) REFERENCES users_usr(id)
);

COMMENT ON TABLE audit_log_aud IS 'Logs all major events like status changes, assignments, and comments for full traceability.';
COMMENT ON COLUMN audit_log_aud.details IS 'Stores JSON data capturing the state change, e.g., { "from_status": "PENDING", "to_status": "IN_PROGRESS" }.';

--
-- DATA FOR status_sts
--
INSERT INTO status_sts (entity_type, sts_name, sts_description) VALUES
  ('MIGRATION', 'NEW', ''),
  ('MIGRATION', 'IN PROGRESS', ''),
  ('MIGRATION', 'DONE', ''),
  ('MIGRATION', 'CANCELLED', ''),
  ('ITERATION', 'NEW', ''),
  ('ITERATION', 'IN PROGRESS', ''),
  ('ITERATION', 'DONE', ''),
  ('ITERATION', 'CANCELLED', ''),
  ('SEQUENCE', 'NEW', ''),
  ('SEQUENCE', 'IN PROGRESS', ''),
  ('SEQUENCE', 'DONE', ''),
  ('CHAPTER', 'NEW', ''),
  ('CHAPTER', 'IN PROGRESS', ''),
  ('CHAPTER', 'DONE', ''),
  ('STEP', 'NEW', ''),
  ('STEP', 'IN PROGRESS', ''),
  ('STEP', 'DONE', ''),
  ('STEP', 'CANCELLED', ''),
  ('STEP', 'DEFERRED', ''),
  ('INSTRUCTION', 'NEW', ''),
  ('INSTRUCTION', 'IN PROGRESS', ''),
  ('INSTRUCTION', 'DONE', ''),
  ('INSTRUCTION', 'CANCELLED', ''),
  ('CONTROL', 'NEW', ''),
  ('CONTROL', 'PRODUCED', ''),
  ('CONTROL', 'IT VALIDATED', ''),
  ('CONTROL', 'BIZ VALIDATED', ''),
  ('CONTROL', 'PASSED', ''),
  ('CONTROL', 'FAILED', ''),
  ('CONTROL', 'CANCELLED', '');
