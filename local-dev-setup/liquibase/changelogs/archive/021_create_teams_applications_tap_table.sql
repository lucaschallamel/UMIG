-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_teams_applications_tap_table
-- comment: Create teams_applications_tap join table
CREATE TABLE IF NOT EXISTS teams_applications_tap (
    id SERIAL PRIMARY KEY,
    tms_id INTEGER NOT NULL,
    app_id INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
