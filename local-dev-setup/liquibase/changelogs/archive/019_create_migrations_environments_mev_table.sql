-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_migrations_environments_mev_table
-- comment: Create migrations_environments_mev join table
CREATE TABLE IF NOT EXISTS migrations_environments_mev (
    id SERIAL PRIMARY KEY,
    mig_id INTEGER NOT NULL,
    env_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
