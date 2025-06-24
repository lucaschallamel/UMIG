--liquibase formatted sql


--changeset lucas.challamel:1 context:all
--comment: This is the initial baseline schema for the UMIG application,
--         migrated from the original SQL Server data model. It includes all
--         tables, columns, primary keys, and foreign key constraints.

--
-- Table structure for table 'additional_instructions_ais'
--
CREATE TABLE IF NOT EXISTS additional_instructions_ais (
    id SERIAL PRIMARY KEY,
    stp_id INTEGER NOT NULL,
    instructions TEXT,
    usr_id INTEGER NOT NULL,
    ite_id INTEGER
);

--
-- Table structure for table 'applications_app'
--
CREATE TABLE IF NOT EXISTS applications_app (
    id SERIAL PRIMARY KEY,
    app_code VARCHAR(50) NOT NULL,
    app_name VARCHAR(10),
    app_description TEXT
);
-- Add unique constraint for app_code
ALTER TABLE applications_app ADD CONSTRAINT uq_applications_app_code UNIQUE (app_code);

--
-- Table structure for table 'chapter_cha'
--
CREATE TABLE IF NOT EXISTS chapter_cha (
    id SERIAL PRIMARY KEY,
    cha_code VARCHAR(10),
    cha_name VARCHAR(10),
    sqc_id INTEGER,
    cha_previous INTEGER,
    cha_start_date TIMESTAMP,
    cha_end_date TIMESTAMP,
    cha_effective_start_date TIMESTAMP,
    cha_effective_end_date TIMESTAMP
);

--
-- Table structure for table 'controls_ctl'
--
CREATE TABLE IF NOT EXISTS controls_ctl (
    id SERIAL PRIMARY KEY,
    ctl_code VARCHAR(10) NOT NULL,
    ctl_name TEXT,
    ctl_producer INTEGER,
    ctl_it_validator INTEGER,
    ctl_it_comments TEXT,
    ctl_biz_comments TEXT,
    ctl_biz_validator INTEGER
);
-- Add unique constraint for ctl_code
ALTER TABLE controls_ctl ADD CONSTRAINT uq_controls_ctl_code UNIQUE (ctl_code);

--
-- Table structure for table 'environments_env'
--
CREATE TABLE IF NOT EXISTS environments_env (
    id SERIAL PRIMARY KEY,
    env_code VARCHAR(10) UNIQUE,
    env_name VARCHAR(64),
    env_description TEXT
);

--
-- Table structure for table 'environments_applications_eap'
--
CREATE TABLE IF NOT EXISTS environments_applications_eap (
    id SERIAL PRIMARY KEY,
    env_id INTEGER NOT NULL,
    app_id INTEGER NOT NULL,
    comments TEXT
);

--
-- Table structure for table 'environments_iterations_eit'
--
CREATE TABLE IF NOT EXISTS environments_iterations_eit (
    id SERIAL PRIMARY KEY,
    env_id INTEGER NOT NULL,
    ite_id INTEGER NOT NULL,
    eit_role VARCHAR(10)
);

-- Table structure for table 'instructions_ins'
--
CREATE TABLE IF NOT EXISTS instructions_ins (
    id SERIAL PRIMARY KEY,
    ins_code VARCHAR(10),
    ins_description TEXT,
    stp_id INTEGER NOT NULL,
    tms_id INTEGER,
    ctl_id INTEGER
);

--
-- Table structure for table 'iterations_ite'
--
CREATE TABLE IF NOT EXISTS iterations_ite (
    id SERIAL PRIMARY KEY,
    ite_code VARCHAR(10) NOT NULL,
    ite_name VARCHAR(64),
    mig_id INTEGER NOT NULL,
    ite_type VARCHAR(16),
    ite_start_date TIMESTAMP,
    ite_end_date TIMESTAMP,
    description TEXT
);
-- Add unique constraint for (ite_code, mig_id)
ALTER TABLE iterations_ite ADD CONSTRAINT uq_iterations_ite_code_mig UNIQUE (ite_code, mig_id);

--
-- Table structure for table 'iterations_tracking_itt'
--
CREATE TABLE IF NOT EXISTS iterations_tracking_itt (
    id VARCHAR(10) PRIMARY KEY,
    mig_code VARCHAR(10),
    ite_code VARCHAR(10),
    entity_type VARCHAR(10),
    entity_id VARCHAR(10),
    entity_status VARCHAR(10),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    comments TEXT
);

--
-- Table structure for table 'migrations_mig'
--
CREATE TYPE migration_type_enum AS ENUM ('EXTERNAL', 'INTERNAL');

CREATE TABLE IF NOT EXISTS migrations_mig (
    id SERIAL PRIMARY KEY,
    mig_code VARCHAR(50) NOT NULL,
    mig_name VARCHAR(128),
    mig_description TEXT,
    mig_planned_start_date TIMESTAMP,
    mig_planned_end_date TIMESTAMP,
    mty_type migration_type_enum
);
-- Add unique constraint for mig_code
ALTER TABLE migrations_mig ADD CONSTRAINT uq_migrations_mig_code UNIQUE (mig_code);

--
-- Table structure for table 'release_notes_rnt'
--
CREATE TABLE IF NOT EXISTS release_notes_rnt (
    id SERIAL PRIMARY KEY,
    rnt_code VARCHAR(10),
    rnt_name VARCHAR(64),
    rnt_description TEXT,
    rnt_date TIMESTAMP
);

--
-- Table structure for table 'roles_rls'
--
CREATE TABLE IF NOT EXISTS roles_rls (
    id SERIAL PRIMARY KEY,
    rle_code VARCHAR(10),
    rle_name VARCHAR(64),
    rle_description TEXT
);

--
-- Table structure for table 'sequences_sqc'
--
CREATE TABLE IF NOT EXISTS sequences_sqc (
    id SERIAL PRIMARY KEY,
    mig_id INTEGER NOT NULL,
    ite_id INTEGER NOT NULL,
    sqc_order INTEGER NOT NULL,
    sqc_name VARCHAR(255),
    start_date TIMESTAMP,
    end_date TIMESTAMP,
    sqc_previous INTEGER
);
-- Add unique constraint for (mig_id, ite_id, sqc_order)
ALTER TABLE sequences_sqc ADD CONSTRAINT uq_sequences_sqc_mig_ite_order UNIQUE (mig_id, ite_id, sqc_order);

ALTER TABLE sequences_sqc ADD CONSTRAINT fk_sqc_ite FOREIGN KEY (ite_id) REFERENCES iterations_ite(id);

--
-- Table structure for table 'status_sts'
--
CREATE TABLE IF NOT EXISTS status_sts (
    id SERIAL PRIMARY KEY,
    sts_code VARCHAR(32),
    sts_name VARCHAR(32),
    sts_description TEXT
);

--
-- Table structure for table 'steps_stp'
--
CREATE TABLE IF NOT EXISTS steps_stp (
    id SERIAL PRIMARY KEY,
    stp_code VARCHAR(10),
    stp_name VARCHAR(64),
    cha_id INTEGER,
    tms_id INTEGER,
    stt_type INTEGER,
    stp_previous INTEGER,
    stp_description TEXT,
    sts_id INTEGER,
    owner_id INTEGER,
    target_env INTEGER
);

--
-- Table structure for table 'step_type_stt'
--
CREATE TABLE IF NOT EXISTS step_type_stt (
    id SERIAL PRIMARY KEY,
    stt_code VARCHAR(10),
    stt_name VARCHAR(64),
    stt_description TEXT
);
-- Add unique constraint for stt_code
ALTER TABLE step_type_stt ADD CONSTRAINT uq_step_type_stt_code UNIQUE (stt_code);

--
-- Table structure for table 'teams_tms'
--
CREATE TABLE IF NOT EXISTS teams_tms (
    id SERIAL PRIMARY KEY,
    tms_code VARCHAR(10) NOT NULL,
    tms_name VARCHAR(64),
    tms_description TEXT,
    tms_email VARCHAR(255)
);
-- Add unique constraint for tms_code
ALTER TABLE teams_tms ADD CONSTRAINT uq_teams_tms_code UNIQUE (tms_code);

--
-- Table structure for table 'teams_applications_tap'
--
CREATE TABLE IF NOT EXISTS teams_applications_tap (
    id SERIAL PRIMARY KEY,
    tms_id INTEGER NOT NULL,
    app_id INTEGER NOT NULL
);

--
-- Table structure for table 'users_usr'
--
CREATE TABLE IF NOT EXISTS users_usr (
    id SERIAL PRIMARY KEY,
    usr_first_name VARCHAR(64),
    usr_last_name VARCHAR(64),
    usr_trigram VARCHAR(3) NOT NULL,
    usr_email VARCHAR(128),
    rle_id INTEGER,
    tms_id INTEGER
);
-- Add unique constraint for usr_trigram
ALTER TABLE users_usr ADD CONSTRAINT uq_users_usr_trigram UNIQUE (usr_trigram);

--
-- Foreign key constraints
--
ALTER TABLE additional_instructions_ais ADD CONSTRAINT fk_ais_stp FOREIGN KEY (stp_id) REFERENCES steps_stp(id);
ALTER TABLE additional_instructions_ais ADD CONSTRAINT fk_ais_usr FOREIGN KEY (usr_id) REFERENCES users_usr(id);
ALTER TABLE additional_instructions_ais ADD CONSTRAINT fk_ais_ite FOREIGN KEY (ite_id) REFERENCES iterations_ite(id);
ALTER TABLE chapter_cha ADD CONSTRAINT fk_cha_sqc FOREIGN KEY (sqc_id) REFERENCES sequences_sqc(id);
ALTER TABLE chapter_cha ADD CONSTRAINT fk_cha_previous FOREIGN KEY (cha_previous) REFERENCES chapter_cha(id);
ALTER TABLE environments_applications_eap ADD CONSTRAINT fk_eap_env FOREIGN KEY (env_id) REFERENCES environments_env(id);
ALTER TABLE environments_applications_eap ADD CONSTRAINT fk_eap_app FOREIGN KEY (app_id) REFERENCES applications_app(id);
ALTER TABLE environments_iterations_eit ADD CONSTRAINT fk_eit_env FOREIGN KEY (env_id) REFERENCES environments_env(id);
ALTER TABLE environments_iterations_eit ADD CONSTRAINT fk_eit_ite FOREIGN KEY (ite_id) REFERENCES iterations_ite(id);
ALTER TABLE instructions_ins ADD CONSTRAINT fk_ins_stp FOREIGN KEY (stp_id) REFERENCES steps_stp(id);
ALTER TABLE instructions_ins ADD CONSTRAINT fk_ins_tms FOREIGN KEY (tms_id) REFERENCES teams_tms(id);
ALTER TABLE instructions_ins ADD CONSTRAINT fk_ins_ctl FOREIGN KEY (ctl_id) REFERENCES controls_ctl(id);
ALTER TABLE iterations_ite ADD CONSTRAINT fk_ite_mig FOREIGN KEY (mig_id) REFERENCES migrations_mig(id);

ALTER TABLE sequences_sqc ADD CONSTRAINT fk_sqc_mig FOREIGN KEY (mig_id) REFERENCES migrations_mig(id);
ALTER TABLE steps_stp ADD CONSTRAINT fk_stp_cha FOREIGN KEY (cha_id) REFERENCES chapter_cha(id);
ALTER TABLE steps_stp ADD CONSTRAINT fk_stp_tms FOREIGN KEY (tms_id) REFERENCES teams_tms(id);
ALTER TABLE steps_stp ADD CONSTRAINT fk_stp_stt FOREIGN KEY (stt_type) REFERENCES step_type_stt(id);
ALTER TABLE steps_stp ADD CONSTRAINT fk_stp_sts FOREIGN KEY (sts_id) REFERENCES status_sts(id);
ALTER TABLE steps_stp ADD CONSTRAINT fk_stp_owner FOREIGN KEY (owner_id) REFERENCES users_usr(id);
ALTER TABLE steps_stp ADD CONSTRAINT fk_stp_target_env FOREIGN KEY (target_env) REFERENCES environments_env(id);
ALTER TABLE teams_applications_tap ADD CONSTRAINT fk_tap_tms FOREIGN KEY (tms_id) REFERENCES teams_tms(id);
ALTER TABLE teams_applications_tap ADD CONSTRAINT fk_tap_app FOREIGN KEY (app_id) REFERENCES applications_app(id);
ALTER TABLE users_usr ADD CONSTRAINT fk_usr_rle FOREIGN KEY (rle_id) REFERENCES roles_rls(id);
ALTER TABLE users_usr ADD CONSTRAINT fk_usr_tms FOREIGN KEY (tms_id) REFERENCES teams_tms(id);