-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_instructions_ins_table
-- comment: Create instructions_ins table
CREATE TABLE IF NOT EXISTS instructions_ins (
    id SERIAL PRIMARY KEY,
    ins_name TEXT,
    ins_description TEXT,
    ins_command TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
