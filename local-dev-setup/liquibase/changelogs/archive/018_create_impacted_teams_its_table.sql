-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_impacted_teams_its_table
-- comment: Create impacted_teams_its join table for steps and teams
CREATE TABLE IF NOT EXISTS impacted_teams_its (
    id SERIAL PRIMARY KEY,
    stp_id INTEGER NOT NULL,
    tms_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
