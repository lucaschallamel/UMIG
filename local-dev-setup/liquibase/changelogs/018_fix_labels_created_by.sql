--liquibase formatted sql

--changeset lucas.challamel:018_fix_labels_created_by context:all
--comment: Fix labels_lbl and labels_lbl_x_controls_master_ctm created_by fields to be VARCHAR instead of INTEGER for consistency with audit field standards

-- Convert INTEGER created_by to VARCHAR in labels_lbl table
-- This was missed in migration 016 and needs to be fixed for data generators to work
ALTER TABLE labels_lbl
DROP COLUMN IF EXISTS created_by;

ALTER TABLE labels_lbl
ADD COLUMN created_by VARCHAR(255) DEFAULT 'system';

-- Update any existing records to use 'migration' as the created_by value
UPDATE labels_lbl 
SET created_by = 'migration'
WHERE created_by IS NULL;

-- Also fix labels_lbl_x_controls_master_ctm which was missed in migration 017
ALTER TABLE labels_lbl_x_controls_master_ctm
DROP COLUMN IF EXISTS created_by;

ALTER TABLE labels_lbl_x_controls_master_ctm
ADD COLUMN created_by VARCHAR(255) DEFAULT 'system';

UPDATE labels_lbl_x_controls_master_ctm 
SET created_by = 'migration'
WHERE created_by IS NULL;

-- Add comments to document the fields
COMMENT ON COLUMN labels_lbl.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';
COMMENT ON COLUMN labels_lbl_x_controls_master_ctm.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';

-- =====================================================
-- ROLLBACK STATEMENTS
-- =====================================================

--rollback ALTER TABLE labels_lbl DROP COLUMN IF EXISTS created_by;
--rollback ALTER TABLE labels_lbl ADD COLUMN created_by INTEGER;
--rollback ALTER TABLE labels_lbl_x_controls_master_ctm DROP COLUMN IF EXISTS created_by;
--rollback ALTER TABLE labels_lbl_x_controls_master_ctm ADD COLUMN created_by INTEGER;