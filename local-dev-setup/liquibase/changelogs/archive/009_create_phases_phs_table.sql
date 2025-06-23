-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_phases_phs_table
-- comment: Create phases_phs table
CREATE TABLE IF NOT EXISTS phases_phs (
    id SERIAL PRIMARY KEY,
    mig_id INTEGER NOT NULL,
    phs_name TEXT,
    phs_order INTEGER,
    phs_planned_start_date TIMESTAMP WITHOUT TIME ZONE,
    phs_planned_end_date TIMESTAMP WITHOUT TIME ZONE,
    phs_effective_start_date TIMESTAMP WITHOUT TIME ZONE,
    phs_effective_end_date TIMESTAMP WITHOUT TIME ZONE,
    sts_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
