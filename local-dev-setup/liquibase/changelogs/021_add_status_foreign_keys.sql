--liquibase formatted sql

--changeset lucas.challamel:021_add_status_foreign_keys
--comment: REDUNDANT MIGRATION - Status field constraints already created in migration 019

-- =============================================================================
-- MIGRATION STATUS: REDUNDANT
-- =============================================================================
-- This migration was originally intended to add foreign key constraints for 
-- status fields in Controls tables, but these constraints were already created
-- in migration 019_status_field_normalization.sql as part of US-006.
--
-- ANALYSIS:
-- - controls_master_ctm table does NOT have a status field (ctm_status)
-- - controls_instance_cti.cti_status FK constraint already exists as:
--   fk_controls_instance_cti_status (created in migration 019)
-- - No additional constraints are needed
--
-- This migration is kept for historical tracking but performs no operations.
-- =============================================================================

-- Pre-validation: Verify existing constraints from migration 019
-- This query confirms the FK constraint already exists
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name = 'controls_instance_cti'
AND tc.constraint_name = 'fk_controls_instance_cti_status';

-- No operations needed - constraints already exist from migration 019

-- Post-validation: Confirm status field integrity
-- Verify all controls_instance_cti records have valid status references
SELECT 'controls_instance_cti' as table_name, 
       COUNT(*) as total_records,
       COUNT(CASE WHEN cti_status IS NULL THEN 1 END) as null_status_count,
       COUNT(CASE WHEN cti_status NOT IN (SELECT sts_id FROM status_sts) THEN 1 END) as invalid_status_count
FROM controls_instance_cti;

--rollback -- No rollback needed - no operations performed