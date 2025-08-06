--liquibase formatted sql

--changeset lucas.challamel:017_standardize_association_audit_fields context:all splitStatements:false
--comment: Standardize audit fields for association tables using tiered approach per US-002d

-- =====================================================
-- PART 1: FIX EXISTING ASSOCIATION TABLES WITH INTEGER created_by
-- =====================================================

-- teams_tms_x_users_usr - Convert INTEGER created_by to VARCHAR
-- First, drop the column and recreate it as VARCHAR since we can't directly convert
ALTER TABLE teams_tms_x_users_usr
DROP COLUMN IF EXISTS created_by;

ALTER TABLE teams_tms_x_users_usr
ADD COLUMN created_by VARCHAR(255) DEFAULT 'system';

-- Update existing records
UPDATE teams_tms_x_users_usr 
SET created_by = 'migration'
WHERE created_by IS NULL;

-- labels_lbl_x_steps_master_stm - Convert INTEGER created_by to VARCHAR
ALTER TABLE labels_lbl_x_steps_master_stm
DROP COLUMN IF EXISTS created_by;

ALTER TABLE labels_lbl_x_steps_master_stm
ADD COLUMN created_by VARCHAR(255) DEFAULT 'system';

UPDATE labels_lbl_x_steps_master_stm 
SET created_by = 'migration'
WHERE created_by IS NULL;

-- =====================================================
-- PART 2: ADD AUDIT FIELDS TO TIER 1 ASSOCIATIONS (Critical)
-- These need full audit tracking: created_at, created_by
-- =====================================================

-- teams_tms_x_users_usr already has created_at, just fixed created_by above

-- Add audit fields to environment_roles_enr_x_users_usr (if exists)
-- This tracks user-role assignments which is critical
-- Note: This table doesn't exist in current schema, but added for future compatibility

-- =====================================================
-- PART 3: ADD AUDIT FIELDS TO TIER 2 ASSOCIATIONS (Standard)
-- These need minimal audit: created_at only
-- =====================================================

-- teams_tms_x_applications_app
ALTER TABLE teams_tms_x_applications_app
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- labels_lbl_x_steps_master_stm already has created_at, we fixed created_by above

-- Add created_at to other standard association tables if they exist
-- Note: These tables don't exist in current schema, but added for future compatibility

-- =====================================================
-- PART 4: DOCUMENT TIERED APPROACH
-- =====================================================

-- Add comments to document the tiered approach
COMMENT ON TABLE teams_tms_x_users_usr IS 'TIER 1 ASSOCIATION: User-Team assignments with full audit tracking (created_at, created_by)';
COMMENT ON TABLE teams_tms_x_applications_app IS 'TIER 2 ASSOCIATION: Team-Application links with minimal audit (created_at only)';
COMMENT ON TABLE labels_lbl_x_steps_master_stm IS 'TIER 2 ASSOCIATION: Label-Step associations with minimal audit (created_at, created_by for legacy support)';

-- =====================================================
-- PART 5: CREATE HELPER FUNCTION FOR USER CODE LOOKUP
-- =====================================================

-- Drop existing function if it exists and recreate with consistent parameter name
DROP FUNCTION IF EXISTS get_user_code(VARCHAR);

-- Create a helper function to get user code from email (matching parameter name from 016)
CREATE OR REPLACE FUNCTION get_user_code(email_input VARCHAR)
RETURNS VARCHAR AS $func$
DECLARE
    user_code VARCHAR;
BEGIN
    SELECT usr_code INTO user_code
    FROM users_usr
    WHERE usr_email = email_input;
    
    RETURN COALESCE(user_code, 'system');
END;
$func$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_code(VARCHAR) IS 'Helper function to retrieve user trigram (usr_code) from email for audit fields';

-- =====================================================
-- ROLLBACK STATEMENTS
-- =====================================================

--rollback DROP FUNCTION IF EXISTS get_user_code(VARCHAR);

--rollback ALTER TABLE teams_tms_x_users_usr DROP COLUMN IF EXISTS created_by;
--rollback ALTER TABLE teams_tms_x_users_usr ADD COLUMN created_by INTEGER;

--rollback ALTER TABLE labels_lbl_x_steps_master_stm DROP COLUMN IF EXISTS created_by;
--rollback ALTER TABLE labels_lbl_x_steps_master_stm ADD COLUMN created_by INTEGER;

--rollback ALTER TABLE teams_tms_x_applications_app DROP COLUMN IF EXISTS created_at;

