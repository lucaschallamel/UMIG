-- ===============================================================================
-- US-098 Phase 4: Configuration Data Seeding - Verification SQL Queries
-- ===============================================================================
--
-- Purpose: Verify that Liquibase changeset successfully seeded configuration data
--
-- Author: claude-code
-- Date: 2025-10-02
-- Branch: feature/sprint8-us-098-configuration-management-system
--
-- Usage:
--   Run these queries after applying Liquibase migration to verify:
--   1. All expected configurations are present
--   2. Security classifications are correct
--   3. Environment-specific values are properly set
--   4. Audit metadata is captured
--
-- ===============================================================================

-- ===============================================================================
-- QUERY 1: Count Configurations Per Batch
-- ===============================================================================
-- Expected Results:
--   Batch 1 (Critical Security): 12 rows

SELECT
    'Batch 1: Critical Security' AS batch_name,
    COUNT(*) AS configuration_count,
    12 AS expected_count,
    CASE
        WHEN COUNT(*) = 12 THEN '✅ PASS'
        ELSE '❌ FAIL'
    END AS status
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
  AND scf_key IN (
    'database.password.env.var',
    'test.database.password.env.var',
    'database.url',
    'database.username',
    'test.database.url',
    'test.database.username'
);

-- ===============================================================================
-- QUERY 2: Count Configurations Per Environment
-- ===============================================================================
-- Expected Results:
--   DEV:  6 configurations
--   UAT:  3 configurations
--   PROD: 3 configurations
--   Total: 12 configurations

SELECT
    scf_environment,
    COUNT(*) AS configuration_count,
    CASE scf_environment
        WHEN 'DEV'  THEN 6
        WHEN 'UAT'  THEN 3
        WHEN 'PROD' THEN 3
        ELSE 0
    END AS expected_count,
    CASE
        WHEN (scf_environment = 'DEV' AND COUNT(*) = 6)
          OR (scf_environment = 'UAT' AND COUNT(*) = 3)
          OR (scf_environment = 'PROD' AND COUNT(*) = 3)
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END AS status
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
GROUP BY scf_environment
ORDER BY scf_environment;

-- ===============================================================================
-- QUERY 3: Verify Security Classifications
-- ===============================================================================
-- Expected Results:
--   CONFIDENTIAL: 4 configurations (password env var references only)
--   INTERNAL:     8 configurations (URLs and usernames)

SELECT
    scf_security_classification,
    COUNT(*) AS configuration_count,
    CASE scf_security_classification
        WHEN 'CONFIDENTIAL' THEN 4
        WHEN 'INTERNAL'     THEN 8
        ELSE 0
    END AS expected_count,
    CASE
        WHEN (scf_security_classification = 'CONFIDENTIAL' AND COUNT(*) = 4)
          OR (scf_security_classification = 'INTERNAL' AND COUNT(*) = 8)
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END AS status
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
GROUP BY scf_security_classification
ORDER BY scf_security_classification;

-- ===============================================================================
-- QUERY 4: Verify All Expected Configuration Keys Present
-- ===============================================================================
-- Expected Results: All 6 keys present with correct environment distribution

SELECT
    scf_key,
    COUNT(*) AS total_environments,
    STRING_AGG(scf_environment, ', ' ORDER BY scf_environment) AS environments,
    CASE scf_key
        WHEN 'database.password.env.var'      THEN 'DEV, UAT, PROD (3)'
        WHEN 'database.url'                   THEN 'DEV, UAT, PROD (3)'
        WHEN 'database.username'              THEN 'DEV, UAT, PROD (3)'
        WHEN 'test.database.password.env.var' THEN 'DEV (1)'
        WHEN 'test.database.url'              THEN 'DEV (1)'
        WHEN 'test.database.username'         THEN 'DEV (1)'
        ELSE 'Unknown'
    END AS expected_distribution,
    CASE
        WHEN (scf_key = 'database.password.env.var' AND COUNT(*) = 3)
          OR (scf_key = 'database.url' AND COUNT(*) = 3)
          OR (scf_key = 'database.username' AND COUNT(*) = 3)
          OR (scf_key = 'test.database.password.env.var' AND COUNT(*) = 1)
          OR (scf_key = 'test.database.url' AND COUNT(*) = 1)
          OR (scf_key = 'test.database.username' AND COUNT(*) = 1)
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END AS status
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
GROUP BY scf_key
ORDER BY scf_key;

-- ===============================================================================
-- QUERY 5: Verify No Actual Passwords in Database (CRITICAL SECURITY CHECK)
-- ===============================================================================
-- Expected Result: 0 rows (no passwords like '123456' or actual credentials)

SELECT
    scf_key,
    scf_value,
    scf_environment,
    scf_security_classification,
    '❌ CRITICAL SECURITY VIOLATION' AS issue
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
  AND scf_security_classification = 'CONFIDENTIAL'
  AND (
    scf_value ~ '^[0-9]{6,}$'                    -- Looks like password (digits only)
    OR scf_value ILIKE '%password%'              -- Contains "password"
    OR LENGTH(scf_value) > 50                    -- Too long to be env var name
    OR scf_value NOT LIKE 'UMIG_%'               -- Doesn't match env var pattern
);

-- Expected: 0 rows. If any rows returned, CRITICAL SECURITY ISSUE exists.

-- ===============================================================================
-- QUERY 6: Verify Environment Variable Names Follow Convention
-- ===============================================================================
-- Expected Result: All CONFIDENTIAL configs should be env var names starting with 'UMIG_'

SELECT
    scf_key,
    scf_value,
    scf_environment,
    CASE
        WHEN scf_value LIKE 'UMIG_%' THEN '✅ Valid env var pattern'
        ELSE '❌ Invalid pattern'
    END AS validation_status
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
  AND scf_security_classification = 'CONFIDENTIAL'
ORDER BY scf_key, scf_environment;

-- ===============================================================================
-- QUERY 7: Verify Audit Metadata Captured
-- ===============================================================================
-- Expected Result: All 12 configurations have proper audit fields populated

SELECT
    scf_key,
    scf_environment,
    created_by,
    updated_by,
    created_at,
    updated_at,
    CASE
        WHEN created_by = 'US-098-migration'
         AND updated_by = 'US-098-migration'
         AND created_at IS NOT NULL
         AND updated_at IS NOT NULL
        THEN '✅ PASS'
        ELSE '❌ FAIL'
    END AS audit_status
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
ORDER BY scf_key, scf_environment;

-- ===============================================================================
-- QUERY 8: Verify Configuration Values Are Environment-Appropriate
-- ===============================================================================
-- Expected Results:
--   DEV:  Uses localhost, umig_app_db, UMIG_DB_PASSWORD
--   UAT:  Uses uat-db.example.com, umig_uat_db, UMIG_UAT_DB_PASSWORD
--   PROD: Uses prod-db.example.com, umig_prod_db, UMIG_PROD_DB_PASSWORD

SELECT
    scf_key,
    scf_environment,
    scf_value,
    CASE
        -- DEV environment checks
        WHEN scf_environment = 'DEV' AND scf_key = 'database.url'
            AND scf_value = 'jdbc:postgresql://localhost:5432/umig_app_db'
            THEN '✅ PASS'
        WHEN scf_environment = 'DEV' AND scf_key = 'database.username'
            AND scf_value = 'umig_app_user'
            THEN '✅ PASS'
        WHEN scf_environment = 'DEV' AND scf_key = 'database.password.env.var'
            AND scf_value = 'UMIG_DB_PASSWORD'
            THEN '✅ PASS'

        -- UAT environment checks
        WHEN scf_environment = 'UAT' AND scf_key = 'database.url'
            AND scf_value = 'jdbc:postgresql://uat-db.example.com:5432/umig_uat_db'
            THEN '✅ PASS'
        WHEN scf_environment = 'UAT' AND scf_key = 'database.username'
            AND scf_value = 'umig_uat_user'
            THEN '✅ PASS'
        WHEN scf_environment = 'UAT' AND scf_key = 'database.password.env.var'
            AND scf_value = 'UMIG_UAT_DB_PASSWORD'
            THEN '✅ PASS'

        -- PROD environment checks
        WHEN scf_environment = 'PROD' AND scf_key = 'database.url'
            AND scf_value = 'jdbc:postgresql://prod-db.example.com:5432/umig_prod_db'
            THEN '✅ PASS'
        WHEN scf_environment = 'PROD' AND scf_key = 'database.username'
            AND scf_value = 'umig_prod_user'
            THEN '✅ PASS'
        WHEN scf_environment = 'PROD' AND scf_key = 'database.password.env.var'
            AND scf_value = 'UMIG_PROD_DB_PASSWORD'
            THEN '✅ PASS'

        -- Test database configs (DEV only)
        WHEN scf_key LIKE 'test.database%'
            AND scf_environment = 'DEV'
            THEN '✅ PASS'

        ELSE '❌ FAIL - Unexpected value for environment'
    END AS value_validation
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
ORDER BY scf_key, scf_environment;

-- ===============================================================================
-- QUERY 9: Verify No Missing Configurations
-- ===============================================================================
-- Expected Result: 0 rows (all expected configs present)

WITH expected_configs AS (
    SELECT key, env FROM (VALUES
        ('database.password.env.var', 'DEV'),
        ('database.password.env.var', 'UAT'),
        ('database.password.env.var', 'PROD'),
        ('database.url', 'DEV'),
        ('database.url', 'UAT'),
        ('database.url', 'PROD'),
        ('database.username', 'DEV'),
        ('database.username', 'UAT'),
        ('database.username', 'PROD'),
        ('test.database.password.env.var', 'DEV'),
        ('test.database.url', 'DEV'),
        ('test.database.username', 'DEV')
    ) AS t(key, env)
)
SELECT
    ec.key AS missing_key,
    ec.env AS missing_environment,
    '❌ Configuration missing from database' AS issue
FROM expected_configs ec
LEFT JOIN system_configuration_scf scf
    ON scf.scf_key = ec.key
   AND scf.scf_environment = ec.env
   AND scf.created_by = 'US-098-migration'
WHERE scf.scf_key IS NULL;

-- Expected: 0 rows. If any rows returned, configuration is missing.

-- ===============================================================================
-- QUERY 10: Complete Configuration Summary
-- ===============================================================================
-- Comprehensive overview of all Batch 1 configurations

SELECT
    scf_key AS "Configuration Key",
    scf_environment AS "Environment",
    CASE scf_security_classification
        WHEN 'CONFIDENTIAL' THEN '🔒 CONFIDENTIAL'
        WHEN 'INTERNAL'     THEN '🔐 INTERNAL'
        WHEN 'PUBLIC'       THEN '🔓 PUBLIC'
        ELSE scf_security_classification
    END AS "Security",
    LEFT(scf_value, 50) AS "Value (truncated)",
    LEFT(scf_description, 80) AS "Description (truncated)",
    created_at AS "Created"
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
ORDER BY
    scf_key,
    CASE scf_environment
        WHEN 'DEV'  THEN 1
        WHEN 'UAT'  THEN 2
        WHEN 'PROD' THEN 3
        ELSE 4
    END;

-- ===============================================================================
-- QUERY 11: Verify Rollback Capability
-- ===============================================================================
-- This query shows what would be deleted if rollback is executed
-- DO NOT RUN THE DELETE - this is for verification only

SELECT
    scf_key,
    scf_environment,
    COUNT(*) OVER (PARTITION BY scf_key) AS instances_of_key,
    'Would be deleted by rollback' AS rollback_status
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
ORDER BY scf_key, scf_environment;

-- ===============================================================================
-- QUERY 12: Quick Health Check (Single Query for CI/CD)
-- ===============================================================================
-- Returns single row with PASS/FAIL status
-- Use this in automated deployment validation

SELECT
    COUNT(*) AS total_configs,
    SUM(CASE WHEN scf_security_classification = 'CONFIDENTIAL' THEN 1 ELSE 0 END) AS confidential_count,
    SUM(CASE WHEN scf_security_classification = 'INTERNAL' THEN 1 ELSE 0 END) AS internal_count,
    SUM(CASE WHEN scf_environment = 'DEV' THEN 1 ELSE 0 END) AS dev_count,
    SUM(CASE WHEN scf_environment = 'UAT' THEN 1 ELSE 0 END) AS uat_count,
    SUM(CASE WHEN scf_environment = 'PROD' THEN 1 ELSE 0 END) AS prod_count,
    CASE
        WHEN COUNT(*) = 12
         AND SUM(CASE WHEN scf_security_classification = 'CONFIDENTIAL' THEN 1 ELSE 0 END) = 4
         AND SUM(CASE WHEN scf_security_classification = 'INTERNAL' THEN 1 ELSE 0 END) = 8
         AND SUM(CASE WHEN scf_environment = 'DEV' THEN 1 ELSE 0 END) = 6
         AND SUM(CASE WHEN scf_environment = 'UAT' THEN 1 ELSE 0 END) = 3
         AND SUM(CASE WHEN scf_environment = 'PROD' THEN 1 ELSE 0 END) = 3
        THEN '✅ ALL CHECKS PASSED'
        ELSE '❌ VERIFICATION FAILED'
    END AS overall_status
FROM system_configuration_scf
WHERE created_by = 'US-098-migration';

-- ===============================================================================
-- END OF VERIFICATION QUERIES
-- ===============================================================================

-- Expected Results Summary:
-- -------------------------
-- Total Configurations:     12
-- CONFIDENTIAL:             4  (password env var references)
-- INTERNAL:                 8  (URLs and usernames)
-- DEV Environment:          6  (all 6 config keys)
-- UAT Environment:          3  (3 production config keys)
-- PROD Environment:         3  (3 production config keys)
-- Security Violations:      0  (CRITICAL: no actual passwords stored)
-- Missing Configurations:   0  (all expected configs present)
--
-- If all queries return expected results, Batch 1 migration is SUCCESSFUL.
-- ===============================================================================
