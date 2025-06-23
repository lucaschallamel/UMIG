-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_migrations_mig_table
-- comment: Create migrations_mig table for detailed migration plans
CREATE TABLE IF NOT EXISTS migrations_mig (
    id SERIAL PRIMARY KEY,
    mig_name TEXT,
    mig_description TEXT,
    mig_planned_start_date TIMESTAMP WITHOUT TIME ZONE,
    mig_planned_end_date TIMESTAMP WITHOUT TIME ZONE,
    mig_effective_start_date TIMESTAMP WITHOUT TIME ZONE,
    mig_effective_end_date TIMESTAMP WITHOUT TIME ZONE,
    sts_id INTEGER,
    usr_id_responsible INTEGER,
    usr_id_created_by INTEGER,
    created_on TIMESTAMP WITHOUT TIME ZONE,
    modified_on TIMESTAMP WITHOUT TIME ZONE,
    modified_by INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
