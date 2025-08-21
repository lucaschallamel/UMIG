--liquibase formatted sql

--changeset lucas.challamel:022_create_system_configuration_table_simple context:all
--comment: Create system_configuration_scf table for Confluence macro locations and runtime configuration management (simplified version)

--
-- DROP EXISTING TABLE IF IT EXISTS
--
DROP TABLE IF EXISTS system_configuration_scf CASCADE;

--
-- CORE CONFIGURATION TABLE
--
CREATE TABLE system_configuration_scf (
    scf_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    env_id INTEGER NOT NULL,
    scf_key VARCHAR(255) NOT NULL,
    scf_category VARCHAR(100) NOT NULL, -- e.g., MACRO_LOCATION, API_CONFIG, SYSTEM_SETTING
    scf_value TEXT NOT NULL,
    scf_description TEXT,
    scf_is_active BOOLEAN DEFAULT TRUE,
    scf_is_system_managed BOOLEAN DEFAULT FALSE, -- TRUE for system-generated configs
    scf_data_type VARCHAR(50) DEFAULT 'STRING', -- STRING, INTEGER, BOOLEAN, JSON, URL
    scf_validation_pattern VARCHAR(500), -- Regex pattern for validation
    created_by VARCHAR(255) DEFAULT 'system',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(255) DEFAULT 'system',
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_scf_env_id FOREIGN KEY (env_id) REFERENCES environments_env(env_id),
    CONSTRAINT unique_scf_key_per_env UNIQUE (env_id, scf_key)
);

--
-- INDEXES FOR PERFORMANCE
--
CREATE INDEX idx_scf_env_category ON system_configuration_scf(env_id, scf_category);
CREATE INDEX idx_scf_key_active ON system_configuration_scf(scf_key, scf_is_active);
CREATE INDEX idx_scf_category_active ON system_configuration_scf(scf_category, scf_is_active);
CREATE INDEX idx_scf_audit ON system_configuration_scf(created_at);

--
-- DEFAULT CONFLUENCE MACRO CONFIGURATION DATA
--
INSERT INTO system_configuration_scf (env_id, scf_key, scf_category, scf_value, scf_description, scf_is_system_managed, scf_data_type) 
SELECT 
    e.env_id,
    'stepview.confluence.space.key',
    'MACRO_LOCATION',
    CASE 
        WHEN e.env_code = 'DEV' THEN 'UMIG'
        WHEN e.env_code = 'TST' THEN 'UMIG-TEST'
        WHEN e.env_code = 'PRD' THEN 'UMIG-PROD'
        ELSE 'UMIG-' || e.env_code
    END,
    'Confluence space key where stepView macro is deployed for ' || e.env_name,
    TRUE,
    'STRING'
FROM environments_env e;

INSERT INTO system_configuration_scf (env_id, scf_key, scf_category, scf_value, scf_description, scf_is_system_managed, scf_data_type, scf_validation_pattern) 
SELECT 
    e.env_id,
    'stepview.confluence.page.id',
    'MACRO_LOCATION',
    CASE 
        WHEN e.env_code = 'DEV' THEN '1114120'
        WHEN e.env_code = 'TST' THEN '1114121'
        WHEN e.env_code = 'PRD' THEN '1114122'
        ELSE '1114123'
    END,
    'Confluence page ID containing stepView macro for ' || e.env_name,
    TRUE,
    'STRING',
    '^[0-9]+$'
FROM environments_env e;

INSERT INTO system_configuration_scf (env_id, scf_key, scf_category, scf_value, scf_description, scf_is_system_managed, scf_data_type) 
SELECT 
    e.env_id,
    'stepview.confluence.page.title',
    'MACRO_LOCATION',
    'UMIG - Step View',
    'Confluence page title containing stepView macro for ' || e.env_name,
    TRUE,
    'STRING'
FROM environments_env e;

INSERT INTO system_configuration_scf (env_id, scf_key, scf_category, scf_value, scf_description, scf_is_system_managed, scf_data_type) 
SELECT 
    e.env_id,
    'stepview.confluence.base.url',
    'MACRO_LOCATION',
    CASE 
        WHEN e.env_code = 'DEV' THEN 'http://localhost:8090'
        WHEN e.env_code = 'TST' THEN 'https://confluence-test.company.com'
        WHEN e.env_code = 'PRD' THEN 'https://confluence.company.com'
        ELSE 'https://confluence-' || LOWER(e.env_code) || '.company.com'
    END,
    'Base URL for Confluence instance serving ' || e.env_name || ' environment',
    TRUE,
    'URL'
FROM environments_env e;

--
-- TABLE COMMENTS
--
COMMENT ON TABLE system_configuration_scf IS 'Central configuration table for runtime system settings, Confluence macro locations, and environment-specific parameters';
COMMENT ON COLUMN system_configuration_scf.scf_key IS 'Unique configuration key within environment (e.g., stepview.confluence.space.key)';
COMMENT ON COLUMN system_configuration_scf.scf_category IS 'Configuration category for organization (MACRO_LOCATION, API_CONFIG, SYSTEM_SETTING)';
COMMENT ON COLUMN system_configuration_scf.scf_value IS 'Configuration value as text (supports all data types)';
COMMENT ON COLUMN system_configuration_scf.scf_is_system_managed IS 'TRUE for configurations managed by system migrations/generators';
COMMENT ON COLUMN system_configuration_scf.scf_data_type IS 'Expected data type for validation (STRING, INTEGER, BOOLEAN, JSON, URL)';
COMMENT ON COLUMN system_configuration_scf.scf_validation_pattern IS 'Regex pattern for value validation';

--
-- ROLLBACK STATEMENTS
--
--rollback DROP TABLE IF EXISTS system_configuration_scf CASCADE;