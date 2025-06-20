-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_iteration_ite_table
-- comment: Create iteration_ite table
CREATE TABLE IF NOT EXISTS iteration_ite (
    id SERIAL PRIMARY KEY,
    mig_id INTEGER NOT NULL,
    ite_name VARCHAR(255),
    ite_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
