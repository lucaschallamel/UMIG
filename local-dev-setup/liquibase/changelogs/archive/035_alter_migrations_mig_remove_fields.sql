-- liquibase formatted sql

-- changeset UMIG_MODEL_EXPANSION:remove_fields_from_migrations_mig
-- comment: Remove audit and unused fields from migrations_mig
ALTER TABLE migrations_mig
DROP COLUMN IF EXISTS mig_effective_start_date,
DROP COLUMN IF EXISTS mig_effective_end_date,
DROP COLUMN IF EXISTS usr_id_created_by,
DROP COLUMN IF EXISTS created_on,
DROP COLUMN IF EXISTS modified_on,
DROP COLUMN IF EXISTS created_at,
DROP COLUMN IF EXISTS updated_at,
DROP COLUMN IF EXISTS modified_by;
