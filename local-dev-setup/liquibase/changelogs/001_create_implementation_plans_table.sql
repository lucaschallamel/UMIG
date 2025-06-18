-- liquibase formatted sql

-- changeset lucas.challamel:2
-- comment: Create implementation_plans table
CREATE TABLE implementation_plans (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    data_migration_code VARCHAR(255),
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
