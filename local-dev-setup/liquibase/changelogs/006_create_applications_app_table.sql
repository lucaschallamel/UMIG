-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_applications_app_table
-- comment: Create applications_app table
CREATE TABLE IF NOT EXISTS applications_app (
    id SERIAL PRIMARY KEY,
    app_code VARCHAR(50) NOT NULL,
    app_name VARCHAR(10),
    app_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
