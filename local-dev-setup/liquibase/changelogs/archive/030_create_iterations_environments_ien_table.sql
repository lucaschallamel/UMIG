-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_iterations_environments_ien_table
-- comment: Create join table for associating environments with iterations and roles (PROD, TEST, BACKUP)
CREATE TABLE IF NOT EXISTS iterations_environments_ien (
    ite_id INTEGER NOT NULL REFERENCES iterations_ite(id) ON DELETE CASCADE,
    env_id INTEGER NOT NULL REFERENCES environments_env(id) ON DELETE CASCADE,
    env_role VARCHAR(16) NOT NULL CHECK (env_role IN ('PROD', 'TEST', 'BACKUP')),
    PRIMARY KEY (ite_id, env_id, env_role)
);
