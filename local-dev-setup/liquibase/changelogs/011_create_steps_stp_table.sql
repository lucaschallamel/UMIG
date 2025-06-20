-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_steps_stp_table
-- comment: Create steps_stp table
CREATE TABLE IF NOT EXISTS steps_stp (
    id SERIAL PRIMARY KEY,
    cha_id INTEGER NOT NULL,
    stp_name TEXT,
    stp_order INTEGER,
    stp_planned_start_date TIMESTAMP WITHOUT TIME ZONE,
    stp_planned_end_date TIMESTAMP WITHOUT TIME ZONE,
    stp_effective_start_date TIMESTAMP WITHOUT TIME ZONE,
    stp_effective_end_date TIMESTAMP WITHOUT TIME ZONE,
    stp_estimated_duration_minutes INTEGER,
    stp_responsible_usr_id INTEGER,
    stp_responsible_tms_id INTEGER,
    stt_id INTEGER,
    sts_id INTEGER,
    stp_validation_needed BOOLEAN,
    stp_blocker BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
