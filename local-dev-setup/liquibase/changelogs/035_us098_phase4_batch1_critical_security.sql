--liquibase formatted sql

--changeset claude-code:US-098-phase4-batch1-critical-security context:all
--comment: Batch 1: Critical Security Configuration Migration
--comment: Migrates database password environment variable references to ConfigurationService
--comment: SECURITY NOTE: Stores environment variable NAMES, not actual passwords

-- ===============================================================================
-- US-098 Phase 4: Configuration Data Seeding - Batch 1 (Critical Security)
-- ===============================================================================
--
-- Purpose: Migrate critical security configurations from hardcoded values to
--          ConfigurationService, starting with database password environment
--          variable references.
--
-- Author: claude-code
-- Date: 2025-10-02
-- Batch: 1 of 4 (Critical Security)
--
-- SECURITY PATTERN:
-- This changeset does NOT store actual passwords in the database.
-- It stores the NAMES of environment variables that contain passwords.
--
-- Usage Pattern:
--     String envVarName = ConfigurationService.getString('database.password.env.var')
--     String password = System.getenv(envVarName)
--
-- Total Configurations: 12 (6 keys × 2 environments: DEV + PROD)
--
-- Schema Columns Used:
-- - scf_key: Configuration key (e.g., 'database.password.env.var')
-- - scf_category: Logical grouping (e.g., 'database', 'security')
-- - scf_value: Configuration value (environment variable NAME for passwords)
-- - scf_description: Human-readable description
-- - scf_is_active: Whether configuration is active
-- - scf_is_system_managed: Whether configuration is system-managed
-- - scf_data_type: Data type ('STRING', 'INTEGER', 'BOOLEAN')
-- - env_id: FK to environments_env (DEV, UAT, PROD)
-- - created_by: Audit field ('US-098-migration')
-- ===============================================================================

-- Resolve environment IDs
DO $$
DECLARE
    dev_env_id INTEGER;
    prod_env_id INTEGER;
BEGIN
    -- Get DEV environment ID
    SELECT env_id INTO dev_env_id
    FROM environments_env
    WHERE UPPER(env_code) = 'DEV';

    -- Get PROD environment ID
    SELECT env_id INTO prod_env_id
    FROM environments_env
    WHERE UPPER(env_code) = 'PROD';

    -- Raise error if environments not found
    IF dev_env_id IS NULL THEN
        RAISE EXCEPTION 'DEV environment not found in environments_env table';
    END IF;

    IF prod_env_id IS NULL THEN
        RAISE EXCEPTION 'PROD environment not found in environments_env table';
    END IF;

    -- ===========================================================================
    -- 1. Database Password Environment Variable Name (CONFIDENTIAL)
    -- ===========================================================================

    -- DEV Environment
    INSERT INTO system_configuration_scf (
        env_id, scf_key, scf_category, scf_value, scf_description,
        scf_is_active, scf_is_system_managed, scf_data_type, created_by
    ) VALUES (
        dev_env_id,
        'database.password.env.var',
        'database',
        'UMIG_DB_PASSWORD',
        'Environment variable name containing the database password for DEV environment. SECURITY: Stores variable NAME, not actual password.',
        true,
        true,
        'STRING',
        'US-098-migration'
    );

    -- PROD Environment
    INSERT INTO system_configuration_scf (
        env_id, scf_key, scf_category, scf_value, scf_description,
        scf_is_active, scf_is_system_managed, scf_data_type, created_by
    ) VALUES (
        prod_env_id,
        'database.password.env.var',
        'database',
        'UMIG_DB_PASSWORD',
        'Environment variable name containing the database password for PROD environment. SECURITY: Stores variable NAME, not actual password.',
        true,
        true,
        'STRING',
        'US-098-migration'
    );

    -- ===========================================================================
    -- 2. Database URL (INTERNAL)
    -- ===========================================================================

    -- DEV Environment
    INSERT INTO system_configuration_scf (
        env_id, scf_key, scf_category, scf_value, scf_description,
        scf_is_active, scf_is_system_managed, scf_data_type, created_by
    ) VALUES (
        dev_env_id,
        'database.url',
        'database',
        'jdbc:postgresql://localhost:5432/umig_app_db',
        'JDBC connection URL for DEV database',
        true,
        true,
        'STRING',
        'US-098-migration'
    );

    -- PROD Environment
    INSERT INTO system_configuration_scf (
        env_id, scf_key, scf_category, scf_value, scf_description,
        scf_is_active, scf_is_system_managed, scf_data_type, created_by
    ) VALUES (
        prod_env_id,
        'database.url',
        'database',
        'jdbc:postgresql://prod-db-server:5432/umig_app_db',
        'JDBC connection URL for PROD database',
        true,
        true,
        'STRING',
        'US-098-migration'
    );

    -- ===========================================================================
    -- 3. Database Username (INTERNAL)
    -- ===========================================================================

    -- DEV Environment
    INSERT INTO system_configuration_scf (
        env_id, scf_key, scf_category, scf_value, scf_description,
        scf_is_active, scf_is_system_managed, scf_data_type, created_by
    ) VALUES (
        dev_env_id,
        'database.username',
        'database',
        'umig_app_user',
        'Database username for DEV environment',
        true,
        true,
        'STRING',
        'US-098-migration'
    );

    -- PROD Environment
    INSERT INTO system_configuration_scf (
        env_id, scf_key, scf_category, scf_value, scf_description,
        scf_is_active, scf_is_system_managed, scf_data_type, created_by
    ) VALUES (
        prod_env_id,
        'database.username',
        'database',
        'umig_app_user',
        'Database username for PROD environment',
        true,
        true,
        'STRING',
        'US-098-migration'
    );

    -- ===========================================================================
    -- 4. Test Database Password Environment Variable Name (CONFIDENTIAL)
    -- ===========================================================================

    -- DEV Environment
    INSERT INTO system_configuration_scf (
        env_id, scf_key, scf_category, scf_value, scf_description,
        scf_is_active, scf_is_system_managed, scf_data_type, created_by
    ) VALUES (
        dev_env_id,
        'test.database.password.env.var',
        'database',
        'UMIG_TEST_DB_PASSWORD',
        'Environment variable name containing the test database password. SECURITY: Stores variable NAME, not actual password.',
        true,
        true,
        'STRING',
        'US-098-migration'
    );

    -- PROD Environment (tests should run against UAT/DEV, but include for completeness)
    INSERT INTO system_configuration_scf (
        env_id, scf_key, scf_category, scf_value, scf_description,
        scf_is_active, scf_is_system_managed, scf_data_type, created_by
    ) VALUES (
        prod_env_id,
        'test.database.password.env.var',
        'database',
        'UMIG_TEST_DB_PASSWORD',
        'Environment variable name containing the test database password. SECURITY: Stores variable NAME, not actual password.',
        true,
        true,
        'STRING',
        'US-098-migration'
    );

    -- ===========================================================================
    -- 5. Test Database URL (INTERNAL)
    -- ===========================================================================

    -- DEV Environment
    INSERT INTO system_configuration_scf (
        env_id, scf_key, scf_category, scf_value, scf_description,
        scf_is_active, scf_is_system_managed, scf_data_type, created_by
    ) VALUES (
        dev_env_id,
        'test.database.url',
        'database',
        'jdbc:postgresql://localhost:5432/umig_test_db',
        'JDBC connection URL for test database in DEV environment',
        true,
        true,
        'STRING',
        'US-098-migration'
    );

    -- PROD Environment
    INSERT INTO system_configuration_scf (
        env_id, scf_key, scf_category, scf_value, scf_description,
        scf_is_active, scf_is_system_managed, scf_data_type, created_by
    ) VALUES (
        prod_env_id,
        'test.database.url',
        'database',
        'jdbc:postgresql://uat-db-server:5432/umig_test_db',
        'JDBC connection URL for test database (runs against UAT in PROD)',
        true,
        true,
        'STRING',
        'US-098-migration'
    );

    -- ===========================================================================
    -- 6. Test Database Username (INTERNAL)
    -- ===========================================================================

    -- DEV Environment
    INSERT INTO system_configuration_scf (
        env_id, scf_key, scf_category, scf_value, scf_description,
        scf_is_active, scf_is_system_managed, scf_data_type, created_by
    ) VALUES (
        dev_env_id,
        'test.database.username',
        'database',
        'umig_app_user',
        'Test database username for DEV environment',
        true,
        true,
        'STRING',
        'US-098-migration'
    );

    -- PROD Environment
    INSERT INTO system_configuration_scf (
        env_id, scf_key, scf_category, scf_value, scf_description,
        scf_is_active, scf_is_system_managed, scf_data_type, created_by
    ) VALUES (
        prod_env_id,
        'test.database.username',
        'database',
        'umig_app_user',
        'Test database username for PROD environment',
        true,
        true,
        'STRING',
        'US-098-migration'
    );

    RAISE NOTICE 'US-098 Phase 4 Batch 1: Successfully inserted 12 configuration records';
    RAISE NOTICE 'Environments: DEV (%) and PROD (%)', dev_env_id, prod_env_id;
    RAISE NOTICE 'Security configurations use environment variable NAMES, not actual passwords';
END $$;

--rollback DELETE FROM system_configuration_scf WHERE created_by = 'US-098-migration' AND scf_key IN ('database.password.env.var', 'database.url', 'database.username', 'test.database.password.env.var', 'test.database.url', 'test.database.username');
