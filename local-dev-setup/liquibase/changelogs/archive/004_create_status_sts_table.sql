-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_status_sts_table
-- comment: Create status_sts table for various status codes
CREATE TABLE IF NOT EXISTS status_sts (
    id SERIAL PRIMARY KEY,
    sts_code VARCHAR(50),
    sts_name TEXT,
    sts_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
