-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_logs_log_table
-- comment: Create logs_log table for audit and operational logging
CREATE TABLE IF NOT EXISTS logs_log (
    id SERIAL PRIMARY KEY,
    log_timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    log_level VARCHAR(50),
    log_message TEXT,
    usr_id INTEGER,
    stp_id INTEGER,
    cha_id INTEGER,
    phs_id INTEGER,
    mig_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
