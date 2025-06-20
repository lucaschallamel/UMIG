-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:alter_migrations_mig_add_fk_cols
-- comment: Add missing foreign key columns (mig_app_id, mig_ipl_id) to migrations_mig table
ALTER TABLE migrations_mig
    ADD COLUMN mig_app_id INTEGER,
    ADD COLUMN mig_ipl_id INTEGER;
