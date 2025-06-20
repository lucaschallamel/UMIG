-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_roles_rls_table
-- comment: Create roles_rls table to store user roles
CREATE TABLE IF NOT EXISTS roles_rls (
    id SERIAL PRIMARY KEY,
    rle_code VARCHAR(50),
    rle_name TEXT,
    rle_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
