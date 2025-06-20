-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_step_type_stt_table
-- comment: Create step_type_stt table for categorizing steps
CREATE TABLE IF NOT EXISTS step_type_stt (
    id SERIAL PRIMARY KEY,
    stt_code VARCHAR(50),
    stt_name TEXT,
    stt_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
