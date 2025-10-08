--liquibase formatted sql

--changeset lucas:040-us104-phase2-unique-sequence-names-001
--comment: US-104 Phase 2 - Add unique constraint on (plm_id, sqm_name) for idempotent sequence imports

-- Add unique constraint to ensure sequence names are unique within each plan
-- This enables idempotent upserts using ON CONFLICT for sequence imports
ALTER TABLE sequences_master_sqm
ADD CONSTRAINT uq_sqm_plm_name UNIQUE (plm_id, sqm_name);

--rollback ALTER TABLE sequences_master_sqm DROP CONSTRAINT uq_sqm_plm_name;
