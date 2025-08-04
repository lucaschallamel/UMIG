--liquibase formatted sql

--changeset lucas.challamel:016_standardize_audit_fields_comprehensive context:all splitStatements:false
--comment: Comprehensive audit field standardization for all tables and associations per US-002b and US-002d

-- =====================================================
-- PART 1: CREATE HELPER FUNCTION FOR USER CODE LOOKUP
-- =====================================================
-- This function will be used to convert user emails to user codes (trigrams)
-- for audit field population in APIs and procedures

CREATE OR REPLACE FUNCTION get_user_code(email_input VARCHAR) 
RETURNS VARCHAR AS $$
DECLARE
    user_code VARCHAR(3);
BEGIN
    SELECT usr_code INTO user_code 
    FROM users_usr 
    WHERE usr_email = email_input
    LIMIT 1;
    
    RETURN COALESCE(user_code, 'system');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_user_code(VARCHAR) IS 'Returns user trigram (usr_code) for given email, or ''system'' if not found';

-- =====================================================
-- PART 2: ADD AUDIT FIELDS TO MASTER TABLES
-- =====================================================

-- sequences_master_sqm
ALTER TABLE sequences_master_sqm
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Update existing records if needed
UPDATE sequences_master_sqm 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- phases_master_phm
ALTER TABLE phases_master_phm
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE phases_master_phm 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- steps_master_stm
ALTER TABLE steps_master_stm
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE steps_master_stm 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- instructions_master_inm
ALTER TABLE instructions_master_inm
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE instructions_master_inm 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- controls_master_ctm
ALTER TABLE controls_master_ctm
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE controls_master_ctm 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- =====================================================
-- PART 3: ADD AUDIT FIELDS TO INSTANCE TABLES
-- =====================================================

-- sequences_instance_sqi
ALTER TABLE sequences_instance_sqi
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE sequences_instance_sqi 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- phases_instance_phi
ALTER TABLE phases_instance_phi
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE phases_instance_phi 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- steps_instance_sti
ALTER TABLE steps_instance_sti
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE steps_instance_sti 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- instructions_instance_ini
ALTER TABLE instructions_instance_ini
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE instructions_instance_ini 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- controls_instance_cti
ALTER TABLE controls_instance_cti
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE controls_instance_cti 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- =====================================================
-- PART 4: ADD AUDIT FIELDS TO ENTITY TABLES
-- =====================================================

-- teams_tms
ALTER TABLE teams_tms
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE teams_tms 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- users_usr
ALTER TABLE users_usr
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE users_usr 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- applications_app
ALTER TABLE applications_app
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE applications_app 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- environments_env
ALTER TABLE environments_env
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE environments_env 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- environment_roles_enr
ALTER TABLE environment_roles_enr
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE environment_roles_enr 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- =====================================================
-- PART 5: ADD AUDIT FIELDS TO LABELS (FIX INTEGER ISSUE)
-- =====================================================

-- Fix labels_lbl created_by field (was INTEGER, needs to be VARCHAR)
ALTER TABLE labels_lbl
DROP COLUMN IF EXISTS created_by;

ALTER TABLE labels_lbl
ADD COLUMN created_by VARCHAR(255) DEFAULT 'system';

-- Add other audit fields if missing
ALTER TABLE labels_lbl
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE labels_lbl 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- =====================================================
-- PART 6: ADD AUDIT FIELDS TO REFERENCE TABLES
-- =====================================================

-- roles_rls
ALTER TABLE roles_rls
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE roles_rls 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- status_sts
ALTER TABLE status_sts
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE status_sts 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- step_types_stt
ALTER TABLE step_types_stt
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE step_types_stt 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- iteration_types_itt
ALTER TABLE iteration_types_itt
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE iteration_types_itt 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- email_templates_emt
ALTER TABLE email_templates_emt
ADD COLUMN IF NOT EXISTS created_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_by VARCHAR(255) DEFAULT 'system',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE email_templates_emt 
SET created_by = COALESCE(created_by, 'migration'),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_by = COALESCE(updated_by, 'migration'),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE created_by IS NULL OR created_at IS NULL;

-- =====================================================
-- PART 7: STANDARDIZE ASSOCIATION TABLES (TIERED APPROACH)
-- =====================================================

-- TIER 1: Critical Associations (Full audit tracking)
-- teams_tms_x_users_usr - Convert INTEGER created_by to VARCHAR
ALTER TABLE teams_tms_x_users_usr
DROP COLUMN IF EXISTS created_by;

ALTER TABLE teams_tms_x_users_usr
ADD COLUMN created_by VARCHAR(255) DEFAULT 'system';

-- Ensure created_at exists
ALTER TABLE teams_tms_x_users_usr
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- TIER 2: Standard Associations (Minimal audit - created_at only or with created_by for legacy)
-- teams_tms_x_applications_app
ALTER TABLE teams_tms_x_applications_app
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- labels_lbl_x_steps_master_stm - Fix INTEGER created_by
ALTER TABLE labels_lbl_x_steps_master_stm
DROP COLUMN IF EXISTS created_by;

ALTER TABLE labels_lbl_x_steps_master_stm
ADD COLUMN created_by VARCHAR(255) DEFAULT 'system';

ALTER TABLE labels_lbl_x_steps_master_stm
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- labels_lbl_x_applications_app - Fix INTEGER created_by
ALTER TABLE labels_lbl_x_applications_app
DROP COLUMN IF EXISTS created_by;

ALTER TABLE labels_lbl_x_applications_app
ADD COLUMN created_by VARCHAR(255) DEFAULT 'system';

ALTER TABLE labels_lbl_x_applications_app
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- labels_lbl_x_controls_master_ctm - Fix INTEGER created_by (from migration 018)
ALTER TABLE labels_lbl_x_controls_master_ctm
DROP COLUMN IF EXISTS created_by;

ALTER TABLE labels_lbl_x_controls_master_ctm
ADD COLUMN created_by VARCHAR(255) DEFAULT 'system';

ALTER TABLE labels_lbl_x_controls_master_ctm
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- =====================================================
-- PART 8: CREATE UPDATE TRIGGERS
-- =====================================================

-- Create update trigger function (only if not exists from migration 012)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for all tables with audit fields
-- Entity tables
DROP TRIGGER IF EXISTS update_teams_updated_at ON teams_tms;
CREATE TRIGGER update_teams_updated_at
    BEFORE UPDATE ON teams_tms
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_users_updated_at ON users_usr;
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users_usr
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_applications_updated_at ON applications_app;
CREATE TRIGGER update_applications_updated_at
    BEFORE UPDATE ON applications_app
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_environments_updated_at ON environments_env;
CREATE TRIGGER update_environments_updated_at
    BEFORE UPDATE ON environments_env
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_labels_updated_at ON labels_lbl;
CREATE TRIGGER update_labels_updated_at
    BEFORE UPDATE ON labels_lbl
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Master tables
DROP TRIGGER IF EXISTS update_sequences_master_updated_at ON sequences_master_sqm;
CREATE TRIGGER update_sequences_master_updated_at
    BEFORE UPDATE ON sequences_master_sqm
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_phases_master_updated_at ON phases_master_phm;
CREATE TRIGGER update_phases_master_updated_at
    BEFORE UPDATE ON phases_master_phm
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_steps_master_updated_at ON steps_master_stm;
CREATE TRIGGER update_steps_master_updated_at
    BEFORE UPDATE ON steps_master_stm
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_instructions_master_updated_at ON instructions_master_inm;
CREATE TRIGGER update_instructions_master_updated_at
    BEFORE UPDATE ON instructions_master_inm
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_controls_master_updated_at ON controls_master_ctm;
CREATE TRIGGER update_controls_master_updated_at
    BEFORE UPDATE ON controls_master_ctm
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Instance tables
DROP TRIGGER IF EXISTS update_sequences_instance_updated_at ON sequences_instance_sqi;
CREATE TRIGGER update_sequences_instance_updated_at
    BEFORE UPDATE ON sequences_instance_sqi
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_phases_instance_updated_at ON phases_instance_phi;
CREATE TRIGGER update_phases_instance_updated_at
    BEFORE UPDATE ON phases_instance_phi
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_steps_instance_updated_at ON steps_instance_sti;
CREATE TRIGGER update_steps_instance_updated_at
    BEFORE UPDATE ON steps_instance_sti
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_instructions_instance_updated_at ON instructions_instance_ini;
CREATE TRIGGER update_instructions_instance_updated_at
    BEFORE UPDATE ON instructions_instance_ini
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_controls_instance_updated_at ON controls_instance_cti;
CREATE TRIGGER update_controls_instance_updated_at
    BEFORE UPDATE ON controls_instance_cti
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- PART 9: ADD INDEXES FOR PERFORMANCE
-- =====================================================

-- Add indexes on audit fields for common queries
CREATE INDEX IF NOT EXISTS idx_tms_audit ON teams_tms(created_at);
CREATE INDEX IF NOT EXISTS idx_usr_audit ON users_usr(created_at);
CREATE INDEX IF NOT EXISTS idx_app_audit ON applications_app(created_at);
CREATE INDEX IF NOT EXISTS idx_env_audit ON environments_env(created_at);
CREATE INDEX IF NOT EXISTS idx_lbl_audit ON labels_lbl(created_at);

-- Master tables
CREATE INDEX IF NOT EXISTS idx_sqm_audit ON sequences_master_sqm(created_at);
CREATE INDEX IF NOT EXISTS idx_phm_audit ON phases_master_phm(created_at);
CREATE INDEX IF NOT EXISTS idx_stm_audit ON steps_master_stm(created_at);
CREATE INDEX IF NOT EXISTS idx_inm_audit ON instructions_master_inm(created_at);
CREATE INDEX IF NOT EXISTS idx_ctm_audit ON controls_master_ctm(created_at);

-- Instance tables
CREATE INDEX IF NOT EXISTS idx_sqi_audit ON sequences_instance_sqi(created_at);
CREATE INDEX IF NOT EXISTS idx_phi_audit ON phases_instance_phi(created_at);
CREATE INDEX IF NOT EXISTS idx_sti_audit ON steps_instance_sti(created_at);
CREATE INDEX IF NOT EXISTS idx_ini_audit ON instructions_instance_ini(created_at);
CREATE INDEX IF NOT EXISTS idx_cti_audit ON controls_instance_cti(created_at);

-- =====================================================
-- PART 10: ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

-- Document all audit fields
COMMENT ON COLUMN teams_tms.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';
COMMENT ON COLUMN teams_tms.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN teams_tms.updated_by IS 'User trigram (usr_code) who last updated the record';
COMMENT ON COLUMN teams_tms.updated_at IS 'Timestamp when record was last updated';

COMMENT ON COLUMN users_usr.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';
COMMENT ON COLUMN users_usr.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN users_usr.updated_by IS 'User trigram (usr_code) who last updated the record';
COMMENT ON COLUMN users_usr.updated_at IS 'Timestamp when record was last updated';

COMMENT ON COLUMN labels_lbl.created_by IS 'User trigram (usr_code) or system/generator/migration identifier';
COMMENT ON COLUMN labels_lbl.created_at IS 'Timestamp when record was created';
COMMENT ON COLUMN labels_lbl.updated_by IS 'User trigram (usr_code) who last updated the record';
COMMENT ON COLUMN labels_lbl.updated_at IS 'Timestamp when record was last updated';

-- Document association tables by tier
COMMENT ON TABLE teams_tms_x_users_usr IS 'TIER 1 ASSOCIATION: User-Team assignments with critical audit tracking';
COMMENT ON TABLE teams_tms_x_applications_app IS 'TIER 2 ASSOCIATION: Team-Application links with minimal audit (created_at only)';
COMMENT ON TABLE labels_lbl_x_steps_master_stm IS 'TIER 2 ASSOCIATION: Label-Step associations with minimal audit (created_at, created_by for legacy support)';
COMMENT ON TABLE labels_lbl_x_applications_app IS 'TIER 2 ASSOCIATION: Label-Application associations with minimal audit';
COMMENT ON TABLE labels_lbl_x_controls_master_ctm IS 'TIER 2 ASSOCIATION: Label-Control associations with minimal audit';

-- =====================================================
-- ROLLBACK STATEMENTS
-- =====================================================

--rollback DROP FUNCTION IF EXISTS get_user_code(VARCHAR);
--rollback DROP FUNCTION IF EXISTS update_updated_at();

--rollback DROP TRIGGER IF EXISTS update_teams_updated_at ON teams_tms;
--rollback DROP TRIGGER IF EXISTS update_users_updated_at ON users_usr;
--rollback DROP TRIGGER IF EXISTS update_applications_updated_at ON applications_app;
--rollback DROP TRIGGER IF EXISTS update_environments_updated_at ON environments_env;
--rollback DROP TRIGGER IF EXISTS update_labels_updated_at ON labels_lbl;
--rollback DROP TRIGGER IF EXISTS update_sequences_master_updated_at ON sequences_master_sqm;
--rollback DROP TRIGGER IF EXISTS update_phases_master_updated_at ON phases_master_phm;
--rollback DROP TRIGGER IF EXISTS update_steps_master_updated_at ON steps_master_stm;
--rollback DROP TRIGGER IF EXISTS update_instructions_master_updated_at ON instructions_master_inm;
--rollback DROP TRIGGER IF EXISTS update_controls_master_updated_at ON controls_master_ctm;
--rollback DROP TRIGGER IF EXISTS update_sequences_instance_updated_at ON sequences_instance_sqi;
--rollback DROP TRIGGER IF EXISTS update_phases_instance_updated_at ON phases_instance_phi;
--rollback DROP TRIGGER IF EXISTS update_steps_instance_updated_at ON steps_instance_sti;
--rollback DROP TRIGGER IF EXISTS update_instructions_instance_updated_at ON instructions_instance_ini;
--rollback DROP TRIGGER IF EXISTS update_controls_instance_updated_at ON controls_instance_cti;

--rollback ALTER TABLE sequences_master_sqm DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE phases_master_phm DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE steps_master_stm DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE instructions_master_inm DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE controls_master_ctm DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE sequences_instance_sqi DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE phases_instance_phi DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE steps_instance_sti DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE instructions_instance_ini DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE controls_instance_cti DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE teams_tms DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE users_usr DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE applications_app DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE environments_env DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE environment_roles_enr DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE labels_lbl DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE roles_rls DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE status_sts DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE step_types_stt DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE iteration_types_itt DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;
--rollback ALTER TABLE email_templates_emt DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at, DROP COLUMN IF EXISTS updated_by, DROP COLUMN IF EXISTS updated_at;

--rollback ALTER TABLE teams_tms_x_users_usr DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at;
--rollback ALTER TABLE teams_tms_x_users_usr ADD COLUMN created_by INTEGER, ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
--rollback ALTER TABLE teams_tms_x_applications_app DROP COLUMN IF EXISTS created_at;
--rollback ALTER TABLE labels_lbl_x_steps_master_stm DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at;
--rollback ALTER TABLE labels_lbl_x_steps_master_stm ADD COLUMN created_by INTEGER, ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
--rollback ALTER TABLE labels_lbl_x_applications_app DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at;
--rollback ALTER TABLE labels_lbl_x_applications_app ADD COLUMN created_by INTEGER, ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
--rollback ALTER TABLE labels_lbl_x_controls_master_ctm DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS created_at;
--rollback ALTER TABLE labels_lbl_x_controls_master_ctm ADD COLUMN created_by INTEGER, ADD COLUMN created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

--rollback DROP INDEX IF EXISTS idx_tms_audit;
--rollback DROP INDEX IF EXISTS idx_usr_audit;
--rollback DROP INDEX IF EXISTS idx_app_audit;
--rollback DROP INDEX IF EXISTS idx_env_audit;
--rollback DROP INDEX IF EXISTS idx_lbl_audit;
--rollback DROP INDEX IF EXISTS idx_sqm_audit;
--rollback DROP INDEX IF EXISTS idx_phm_audit;
--rollback DROP INDEX IF EXISTS idx_stm_audit;
--rollback DROP INDEX IF EXISTS idx_inm_audit;
--rollback DROP INDEX IF EXISTS idx_ctm_audit;
--rollback DROP INDEX IF EXISTS idx_sqi_audit;
--rollback DROP INDEX IF EXISTS idx_phi_audit;
--rollback DROP INDEX IF EXISTS idx_sti_audit;
--rollback DROP INDEX IF EXISTS idx_ini_audit;
--rollback DROP INDEX IF EXISTS idx_cti_audit;