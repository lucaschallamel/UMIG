--liquibase formatted sql

--changeset lucas.challamel:036_us098_phase4_batch2_credentials_plaintext splitStatements:true endDelimiter:;
--comment: US-098 Phase 4 Batch 2 - Credential Configurations (PLAIN TEXT - ACCEPTED RISK)
--comment: ⚠️  SECURITY WARNING: This migration stores credentials in PLAIN TEXT
--comment: ⚠️  Risk Assessment: See claudedocs/US-098-Phase4-Security-Risk-Assessment.md
--comment: ⚠️  Mitigation: Database-level permissions, audit logging, future encryption enhancement
--comment: Date: 2025-10-02
--comment: Security Classification: ALL configs in this batch are 'security' category

-- ============================================================================
-- ⚠️  SECURITY NOTICE ⚠️
-- ============================================================================
-- This migration stores the following credentials in PLAIN TEXT:
-- 1. SMTP authentication passwords (2 configs)
-- 2. API authentication tokens (future - not in this batch)
--
-- ACCEPTED RISKS:
-- - Credentials visible to anyone with SELECT access to system_configuration_scf table
-- - Credentials visible in audit logs (sanitized to ***REDACTED*** but still in DB)
-- - No encryption at rest
-- - Backup files contain plain text credentials
--
-- MITIGATIONS IN PLACE:
-- - Database access restricted to umig_app_user only (RLS policies)
-- - Audit logging tracks all configuration access
-- - Security classification = 'security' enables future encryption upgrade path
-- - Environment variables still available as primary mechanism (fallback to ConfigService)
--
-- FUTURE ENHANCEMENT:
-- - Sprint 9+: Add pgcrypto extension and encrypted columns
-- - Migrate from scf_value to scf_encrypted_value
-- - Implement key rotation mechanism
-- ============================================================================

-- ============================================================================
-- BATCH 2: CREDENTIAL CONFIGURATIONS (10 configs)
-- ============================================================================
-- Scope: SMTP passwords, API tokens (when needed)
-- Storage: Plain text in scf_value column
-- Category: 'security' for audit trail and future encryption upgrade

-- ============================================================================
-- CATEGORY: SMTP AUTHENTICATION CREDENTIALS (2 configs)
-- ============================================================================

-- ⚠️  PLACEHOLDER CREDENTIALS - MUST BE REPLACED BEFORE PRODUCTION DEPLOYMENT
-- These are EXAMPLE values only. Real credentials must be set via:
-- 1. UPDATE system_configuration_scf SET scf_value = 'REAL_PASSWORD' WHERE scf_key = 'email.smtp.password';
-- 2. OR use environment variables as primary mechanism (ConfigurationService as fallback)

-- 1.1 SMTP Password (DEV Environment)
-- NOTE: DEV uses MailHog which doesn't require authentication
-- Including this config for consistency and testing ConfigurationService
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
(
    (SELECT env_id FROM environment_env WHERE env_name = 'DEV' LIMIT 1),
    'email.smtp.password',
    'security',
    'not-required-mailhog',
    '⚠️  SMTP password for email authentication (DEV: MailHog does not require password)',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
);

-- 1.2 SMTP Password (PROD Environment)
-- ⚠️  CRITICAL: This is a PLACEHOLDER - MUST be replaced with real SMTP password before deployment
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
(
    (SELECT env_id FROM environment_env WHERE env_name = 'PROD' LIMIT 1),
    'email.smtp.password',
    'security',
    'REPLACE_WITH_REAL_SMTP_PASSWORD',
    '⚠️  SMTP password for email authentication (PROD: REPLACE before deployment - stored in PLAIN TEXT)',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
);

-- ============================================================================
-- CATEGORY: SMTP USERNAME (2 configs)
-- ============================================================================
-- While not as sensitive as passwords, including usernames in 'security' category
-- for consistency and complete credential management

-- 2.1 SMTP Username (DEV Environment)
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
(
    (SELECT env_id FROM environment_env WHERE env_name = 'DEV' LIMIT 1),
    'email.smtp.username',
    'security',
    'not-required-mailhog',
    'SMTP username for email authentication (DEV: MailHog does not require username)',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
);

-- 2.2 SMTP Username (PROD Environment)
-- ⚠️  REPLACE with real SMTP username before production deployment
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
(
    (SELECT env_id FROM environment_env WHERE env_name = 'PROD' LIMIT 1),
    'email.smtp.username',
    'security',
    'smtp-user@example.com',
    'SMTP username for email authentication (PROD: REPLACE with real username before deployment)',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
);

-- ============================================================================
-- FUTURE CONFIGURATIONS (Not included in this batch - examples for reference)
-- ============================================================================
-- These are PLACEHOLDERS for future credential configurations
-- DO NOT UNCOMMENT until actual values are available

-- Example: API Authentication Tokens
-- INSERT INTO system_configuration_scf (env_id, scf_key, scf_category, scf_value, ...)
-- VALUES ((SELECT env_id FROM environment_env WHERE env_name = 'PROD'), 'api.auth.token', 'security', 'REPLACE_WITH_TOKEN', ...);

-- Example: External Service API Keys
-- INSERT INTO system_configuration_scf (env_id, scf_key, scf_category, scf_value, ...)
-- VALUES ((SELECT env_id FROM environment_env WHERE env_name = 'PROD'), 'external.service.api.key', 'security', 'REPLACE_WITH_KEY', ...);

-- Example: Webhook Signing Secrets
-- INSERT INTO system_configuration_scf (env_id, scf_key, scf_category, scf_value, ...)
-- VALUES ((SELECT env_id FROM environment_env WHERE env_name = 'PROD'), 'webhook.signing.secret', 'security', 'REPLACE_WITH_SECRET', ...);

-- ============================================================================
-- VERIFICATION QUERIES (Execute after migration to verify data integrity)
-- ============================================================================

-- Verification Query 1: Count by category (should all be 'security')
-- Expected: security=4, Total=4
SELECT
    scf_category,
    COUNT(*) AS config_count,
    COUNT(DISTINCT scf_key) AS unique_keys
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
  AND scf_key IN ('email.smtp.password', 'email.smtp.username')
GROUP BY scf_category
ORDER BY scf_category;

-- Verification Query 2: Count by environment
-- Expected: DEV=2, PROD=2, Total=4
SELECT
    e.env_name,
    COUNT(*) AS config_count
FROM system_configuration_scf scf
JOIN environment_env e ON scf.env_id = e.env_id
WHERE scf.created_by = 'US-098-migration'
  AND scf.scf_key IN ('email.smtp.password', 'email.smtp.username')
GROUP BY e.env_name
ORDER BY e.env_name;

-- Verification Query 3: Security check - Identify placeholder credentials
-- Expected: 2 rows for PROD environment (must be replaced before deployment)
SELECT
    e.env_name,
    scf.scf_key,
    scf.scf_value,
    CASE
        WHEN scf.scf_value LIKE '%REPLACE%' THEN '⚠️  PLACEHOLDER - MUST REPLACE'
        WHEN scf.scf_value LIKE '%not-required%' THEN '✅ DEV - No action needed'
        ELSE '✅ REAL VALUE'
    END AS credential_status
FROM system_configuration_scf scf
JOIN environment_env e ON scf.env_id = e.env_id
WHERE scf.created_by = 'US-098-migration'
  AND scf.scf_key IN ('email.smtp.password', 'email.smtp.username')
ORDER BY e.env_name, scf.scf_key;

-- Verification Query 4: Audit log sanitization test
-- This query simulates what would appear in audit logs (passwords should show as ***REDACTED***)
SELECT
    e.env_name,
    scf.scf_key,
    scf.scf_category,
    CASE
        WHEN scf.scf_category = 'security' AND scf.scf_key LIKE '%password%'
            THEN '***REDACTED***'
        WHEN scf.scf_category = 'security'
            THEN CONCAT(LEFT(scf.scf_value, 3), REPEAT('*', LENGTH(scf.scf_value) - 6), RIGHT(scf.scf_value, 3))
        ELSE scf.scf_value
    END AS sanitized_value
FROM system_configuration_scf scf
JOIN environment_env e ON scf.env_id = e.env_id
WHERE scf.created_by = 'US-098-migration'
  AND scf.scf_key IN ('email.smtp.password', 'email.smtp.username')
ORDER BY e.env_name, scf.scf_key;

-- Verification Query 5: Overall health check
-- Expected: total_configs=4, security_category_count=4, dev_count=2, prod_count=2
SELECT
    COUNT(*) AS total_configs,
    SUM(CASE WHEN scf_category = 'security' THEN 1 ELSE 0 END) AS security_category_count,
    SUM(CASE WHEN e.env_name = 'DEV' THEN 1 ELSE 0 END) AS dev_count,
    SUM(CASE WHEN e.env_name = 'PROD' THEN 1 ELSE 0 END) AS prod_count,
    SUM(CASE WHEN scf.scf_value LIKE '%REPLACE%' THEN 1 ELSE 0 END) AS placeholder_count,
    CASE
        WHEN COUNT(*) = 4
         AND SUM(CASE WHEN scf_category = 'security' THEN 1 ELSE 0 END) = 4
         AND SUM(CASE WHEN e.env_name = 'DEV' THEN 1 ELSE 0 END) = 2
         AND SUM(CASE WHEN e.env_name = 'PROD' THEN 1 ELSE 0 END) = 2
        THEN '✅ STRUCTURE CHECKS PASSED'
        ELSE '❌ VERIFICATION FAILED'
    END AS structure_status,
    CASE
        WHEN SUM(CASE WHEN scf.scf_value LIKE '%REPLACE%' THEN 1 ELSE 0 END) > 0
        THEN '⚠️  PLACEHOLDER CREDENTIALS - REPLACE BEFORE PROD DEPLOYMENT'
        ELSE '✅ ALL CREDENTIALS SET'
    END AS credential_status
FROM system_configuration_scf scf
JOIN environment_env e ON scf.env_id = e.env_id
WHERE scf.created_by = 'US-098-migration'
  AND scf.scf_key IN ('email.smtp.password', 'email.smtp.username');

-- ============================================================================
-- PRE-DEPLOYMENT CHECKLIST (MANDATORY for PROD)
-- ============================================================================
-- Before deploying to PRODUCTION, execute these steps:
--
-- 1. REPLACE PLACEHOLDER CREDENTIALS:
--    UPDATE system_configuration_scf
--    SET scf_value = 'REAL_SMTP_PASSWORD',
--        updated_by = 'deployment-script',
--        updated_at = CURRENT_TIMESTAMP
--    WHERE scf_key = 'email.smtp.password'
--      AND env_id = (SELECT env_id FROM environment_env WHERE env_name = 'PROD')
--      AND scf_value = 'REPLACE_WITH_REAL_SMTP_PASSWORD';
--
--    UPDATE system_configuration_scf
--    SET scf_value = 'real-smtp-user@company.com',
--        updated_by = 'deployment-script',
--        updated_at = CURRENT_TIMESTAMP
--    WHERE scf_key = 'email.smtp.username'
--      AND env_id = (SELECT env_id FROM environment_env WHERE env_name = 'PROD')
--      AND scf_value = 'smtp-user@example.com';
--
-- 2. VERIFY NO PLACEHOLDERS REMAIN:
--    SELECT scf_key, scf_value
--    FROM system_configuration_scf
--    WHERE created_by = 'US-098-migration'
--      AND scf_value LIKE '%REPLACE%';
--    -- Expected: 0 rows
--
-- 3. TEST EMAIL FUNCTIONALITY:
--    -- Send test email via EnhancedEmailService
--    -- Verify email received at destination
--
-- 4. REVIEW AUDIT LOGS:
--    -- Confirm password values show as ***REDACTED***
--    -- Verify audit trail captures configuration access
--
-- ============================================================================

-- ============================================================================
-- ROLLBACK PROCEDURE (If needed)
-- ============================================================================
-- To rollback this migration (removes Batch 2 credentials only):
-- DELETE FROM system_configuration_scf
-- WHERE created_by = 'US-098-migration'
--   AND scf_key IN ('email.smtp.password', 'email.smtp.username');
--
-- Then verify:
-- SELECT COUNT(*) FROM system_configuration_scf
-- WHERE created_by = 'US-098-migration'
--   AND scf_key IN ('email.smtp.password', 'email.smtp.username');
-- Expected: 0 rows
-- ============================================================================

--rollback DELETE FROM system_configuration_scf WHERE created_by = 'US-098-migration' AND scf_key IN ('email.smtp.password', 'email.smtp.username');
