-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:create_chapter_cha_table
-- comment: Create chapter_cha table
CREATE TABLE IF NOT EXISTS chapter_cha (
    id SERIAL PRIMARY KEY,
    phs_id INTEGER NOT NULL,
    cha_name TEXT,
    cha_order INTEGER,
    cha_planned_start_date TIMESTAMP WITHOUT TIME ZONE,
    cha_planned_end_date TIMESTAMP WITHOUT TIME ZONE,
    cha_effective_start_date TIMESTAMP WITHOUT TIME ZONE,
    cha_effective_end_date TIMESTAMP WITHOUT TIME ZONE,
    sts_id INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
