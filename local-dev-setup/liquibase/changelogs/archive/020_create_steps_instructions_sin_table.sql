-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_steps_instructions_sin_table
-- comment: Create steps_instructions_sin join table
CREATE TABLE IF NOT EXISTS steps_instructions_sin (
    id SERIAL PRIMARY KEY,
    stp_id INTEGER NOT NULL,
    ins_id INTEGER NOT NULL,
    sin_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
