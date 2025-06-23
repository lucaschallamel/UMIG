-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_environments_env_table
-- comment: Create environments_env table
CREATE TABLE IF NOT EXISTS environments_env (
    id SERIAL PRIMARY KEY,
    env_code VARCHAR(50),
    env_name TEXT,
    env_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
