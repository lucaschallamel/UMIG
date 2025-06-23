-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:remove_more_fields_from_migrations_mig
-- comment: Remove user_id_responsible, sts_id, mig_app_id, mig_ipl_id from migrations_mig
ALTER TABLE migrations_mig
    DROP COLUMN IF EXISTS user_id_responsible,
    DROP COLUMN IF EXISTS sts_id,
    DROP COLUMN IF EXISTS mig_app_id,
    DROP COLUMN IF EXISTS mig_ipl_id;
