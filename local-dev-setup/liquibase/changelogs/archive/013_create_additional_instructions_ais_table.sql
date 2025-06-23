-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_additional_instructions_ais_table
-- comment: Create additional_instructions_ais table
CREATE TABLE IF NOT EXISTS additional_instructions_ais (
    id INTEGER PRIMARY KEY,
    stp_id INTEGER NOT NULL,
    instructions TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
