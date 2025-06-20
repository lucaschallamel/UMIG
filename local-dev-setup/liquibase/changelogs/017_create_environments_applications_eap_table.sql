-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_environments_applications_eap_table
-- comment: Create environments_applications_eap join table
CREATE TABLE IF NOT EXISTS environments_applications_eap (
    id SERIAL PRIMARY KEY,
    env_id INTEGER NOT NULL,
    app_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
