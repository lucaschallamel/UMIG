--liquibase formatted sql

--changeset lucas.challamel:035_us098_phase4_batch1_revised splitStatements:true endDelimiter:;
--comment: US-098 Phase 4 Batch 1 REVISED - Non-Credential Infrastructure Configurations
--comment: Architecture Pivot: Exclude ALL credentials (database, SMTP passwords, API tokens)
--comment: Focus: Infrastructure settings, performance configs, feature flags WITHOUT secrets
--comment: Date: 2025-10-02
--comment: Risk Assessment: Plain text storage accepted for this phase (no encryption)
--comment: FIX: Table name typo (environment_env → environments_env) + PROD environment creation

-- ============================================================================
-- PREREQUISITE: ENSURE DEV, UAT, AND PROD ENVIRONMENTS EXIST
-- ============================================================================
-- Migration 022 only created DEV environment, so we ensure UAT and PROD exist too
-- Using ON CONFLICT to make this idempotent and safe for reruns
--
-- Environment Detection (via ConfigurationService.getCurrentEnvironment()):
-- DEV  (env_id=1): http://localhost:8090
-- UAT  (env_id=3): https://confluence-evx.corp.ubp.ch
-- PROD (env_id=2): https://confluence.corp.ubp.ch

INSERT INTO environments_env (env_id, env_code, env_name, env_description, created_by, created_at, updated_by, updated_at)
VALUES
    (1, 'DEV', 'Development', 'Local development environment', 'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP),
    (2, 'PROD', 'Production', 'Production environment', 'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP),
    (3, 'UAT', 'User Acceptance Testing', 'UAT environment - confluence-evx.corp.ubp.ch', 'system', CURRENT_TIMESTAMP, 'system', CURRENT_TIMESTAMP)
ON CONFLICT (env_id) DO NOTHING;

-- ============================================================================
-- BATCH 1 REVISED: NON-CREDENTIAL CONFIGURATIONS (30 configs)
-- ============================================================================
-- Architecture: Confluence MailServerManager API manages SMTP infrastructure (host/port)
-- Excluded: Database credentials (ScriptRunner), SMTP infrastructure (Confluence)
-- Included: Application behavior configs, API URLs, timeouts, batch sizes, feature flags, web filesystem paths, stepview macro location

-- ============================================================================
-- CATEGORY 1: SMTP APPLICATION BEHAVIOR (4 configs)
-- ============================================================================
-- NOTE: SMTP infrastructure (host/port) managed by Confluence MailServerManager
-- These configs provide application-level overrides for SMTP behavior

-- 1.1 SMTP Authentication Enabled
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- DEV: No auth for MailHog
(
    (SELECT env_id FROM environments_env WHERE env_code = 'DEV' LIMIT 1),
    'email.smtp.auth.enabled',
    'general',
    'false',
    'Enable SMTP authentication (DEV: false for MailHog, UAT/PROD: true)',
    true,
    true,
    'BOOLEAN',
    'US-098-migration',
    'US-098-migration'
),
-- UAT: Auth required for production-like testing
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'email.smtp.auth.enabled',
    'general',
    'true',
    'Enable SMTP authentication (UAT: true for production-like testing)',
    true,
    true,
    'BOOLEAN',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: Auth required
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'email.smtp.auth.enabled',
    'general',
    'true',
    'Enable SMTP authentication (required for production SMTP servers)',
    true,
    true,
    'BOOLEAN',
    'US-098-migration',
    'US-098-migration'
);

-- 1.2 SMTP STARTTLS Enabled
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- DEV: No TLS for MailHog
(
    (SELECT env_id FROM environments_env WHERE env_code = 'DEV' LIMIT 1),
    'email.smtp.starttls.enabled',
    'general',
    'false',
    'Enable STARTTLS encryption (DEV: false for MailHog, UAT/PROD: true for security)',
    true,
    true,
    'BOOLEAN',
    'US-098-migration',
    'US-098-migration'
),
-- UAT: TLS required for production-like testing
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'email.smtp.starttls.enabled',
    'general',
    'true',
    'Enable STARTTLS encryption (UAT: true for production-like security)',
    true,
    true,
    'BOOLEAN',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: TLS required for security
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'email.smtp.starttls.enabled',
    'general',
    'true',
    'Enable STARTTLS encryption (required for production email security)',
    true,
    true,
    'BOOLEAN',
    'US-098-migration',
    'US-098-migration'
);

-- ============================================================================
-- CATEGORY 2: API URLS (2 configs)
-- ============================================================================

-- 2.1 Confluence Base URL
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- DEV: Local Confluence
(
    (SELECT env_id FROM environments_env WHERE env_code = 'DEV' LIMIT 1),
    'confluence.base.url',
    'infrastructure',
    'http://localhost:8090',
    'Confluence base URL for API calls (DEV: local container)',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
),
-- UAT: UAT Confluence
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'confluence.base.url',
    'infrastructure',
    'https://confluence-evx.corp.ubp.ch',
    'Confluence base URL for API calls (UAT: evx subdomain)',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: Production Confluence
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'confluence.base.url',
    'infrastructure',
    'https://confluence.corp.ubp.ch',
    'Confluence base URL for API calls (PROD: production domain)',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
);

-- ============================================================================
-- CATEGORY 3: TIMEOUTS (4 configs)
-- ============================================================================

-- 3.1 SMTP Connection Timeout
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- DEV: Short timeout for fast feedback
(
    (SELECT env_id FROM environments_env WHERE env_code = 'DEV' LIMIT 1),
    'email.smtp.connection.timeout.ms',
    'performance',
    '5000',
    'SMTP connection timeout in milliseconds (DEV: 5s, UAT/PROD: 15s for slower networks)',
    true,
    true,
    'INTEGER',
    'US-098-migration',
    'US-098-migration'
),
-- UAT: Production-like timeout
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'email.smtp.connection.timeout.ms',
    'performance',
    '15000',
    'SMTP connection timeout in milliseconds (UAT: 15s for production-like reliability)',
    true,
    true,
    'INTEGER',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: Longer timeout for reliability
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'email.smtp.connection.timeout.ms',
    'performance',
    '15000',
    'SMTP connection timeout in milliseconds (15s for production reliability)',
    true,
    true,
    'INTEGER',
    'US-098-migration',
    'US-098-migration'
);

-- 3.2 SMTP Operation Timeout
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- DEV: Short operation timeout
(
    (SELECT env_id FROM environments_env WHERE env_code = 'DEV' LIMIT 1),
    'email.smtp.timeout.ms',
    'performance',
    '5000',
    'SMTP operation timeout in milliseconds (DEV: 5s, UAT/PROD: 30s for large emails)',
    true,
    true,
    'INTEGER',
    'US-098-migration',
    'US-098-migration'
),
-- UAT: Production-like timeout for large emails
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'email.smtp.timeout.ms',
    'performance',
    '30000',
    'SMTP operation timeout in milliseconds (UAT: 30s for large email attachments)',
    true,
    true,
    'INTEGER',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: Longer timeout for large emails
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'email.smtp.timeout.ms',
    'performance',
    '30000',
    'SMTP operation timeout in milliseconds (30s for large email attachments)',
    true,
    true,
    'INTEGER',
    'US-098-migration',
    'US-098-migration'
);

-- ============================================================================
-- CATEGORY 4: BATCH SIZES (4 configs)
-- ============================================================================

-- 4.1 Import Maximum Batch Size
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- DEV: Conservative batch size
(
    (SELECT env_id FROM environments_env WHERE env_code = 'DEV' LIMIT 1),
    'import.batch.max.size',
    'performance',
    '1000',
    'Maximum import batch size (DEV: 1000, UAT/PROD: 5000 with more resources)',
    true,
    true,
    'INTEGER',
    'US-098-migration',
    'US-098-migration'
),
-- UAT: Production-like batch size
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'import.batch.max.size',
    'performance',
    '5000',
    'Maximum import batch size (UAT: 5000 for production-like performance)',
    true,
    true,
    'INTEGER',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: Larger batch size for performance
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'import.batch.max.size',
    'performance',
    '5000',
    'Maximum import batch size (5000 for production with sufficient memory)',
    true,
    true,
    'INTEGER',
    'US-098-migration',
    'US-098-migration'
);

-- 4.2 API Pagination Default Size
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- DEV: Small page size for testing
(
    (SELECT env_id FROM environments_env WHERE env_code = 'DEV' LIMIT 1),
    'api.pagination.default.size',
    'performance',
    '50',
    'Default pagination size for API responses (DEV: 50, UAT/PROD: 100)',
    true,
    true,
    'INTEGER',
    'US-098-migration',
    'US-098-migration'
),
-- UAT: Production-like page size
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'api.pagination.default.size',
    'performance',
    '100',
    'Default pagination size for API responses (UAT: 100 for production-like efficiency)',
    true,
    true,
    'INTEGER',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: Larger page size for efficiency
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'api.pagination.default.size',
    'performance',
    '100',
    'Default pagination size for API responses (100 for production efficiency)',
    true,
    true,
    'INTEGER',
    'US-098-migration',
    'US-098-migration'
);

-- ============================================================================
-- CATEGORY 5: FEATURE FLAGS (4 configs)
-- ============================================================================

-- 5.1 Import Email Notifications Enabled
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- DEV: Disabled to avoid spam
(
    (SELECT env_id FROM environments_env WHERE env_code = 'DEV' LIMIT 1),
    'import.email.notifications.enabled',
    'general',
    'false',
    'Enable email notifications for import events (DEV: false to avoid spam)',
    true,
    true,
    'BOOLEAN',
    'US-098-migration',
    'US-098-migration'
),
-- UAT: Enabled for production-like testing
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'import.email.notifications.enabled',
    'general',
    'true',
    'Enable email notifications for import events (UAT: true for stakeholder testing)',
    true,
    true,
    'BOOLEAN',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: Enabled for stakeholders
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'import.email.notifications.enabled',
    'general',
    'true',
    'Enable email notifications for import events (PROD: true for stakeholder awareness)',
    true,
    true,
    'BOOLEAN',
    'US-098-migration',
    'US-098-migration'
);

-- 5.2 Import Performance Monitoring Enabled
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- DEV: Always monitor in development
(
    (SELECT env_id FROM environments_env WHERE env_code = 'DEV' LIMIT 1),
    'import.monitoring.performance.enabled',
    'general',
    'true',
    'Enable performance monitoring for import operations (DEV: always enabled)',
    true,
    true,
    'BOOLEAN',
    'US-098-migration',
    'US-098-migration'
),
-- UAT: Enabled for production-like monitoring
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'import.monitoring.performance.enabled',
    'general',
    'true',
    'Enable performance monitoring for import operations (UAT: enabled for testing)',
    true,
    true,
    'BOOLEAN',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: Enabled but can be toggled if overhead concerns
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'import.monitoring.performance.enabled',
    'general',
    'true',
    'Enable performance monitoring for import operations (PROD: can disable if overhead issues)',
    true,
    true,
    'BOOLEAN',
    'US-098-migration',
    'US-098-migration'
);

-- ============================================================================
-- CATEGORY 6: WEB RESOURCES INFRASTRUCTURE (6 configs)
-- ============================================================================
-- NOTE: Two-tier web path configuration (US-098 Phase 5E):
-- 1. umig.web.root: URL path for macro/client access (all environments)
-- 2. umig.web.filesystem.root: Filesystem path for WebApi file serving (all environments)
-- DEV uses .env file (Tier 3 fallback), UAT/PROD use database (Tier 1)

-- 6.1 UMIG Web Root Path
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- DEV: ScriptRunner custom endpoint (US-098 Phase 5E: Changed to URL path for macro consistency)
(
    (SELECT env_id FROM environments_env WHERE env_code = 'DEV' LIMIT 1),
    'umig.web.root',
    'infrastructure',
    '/rest/scriptrunner/latest/custom/web',
    'Root path for UMIG web resources - DEV uses URL path for macro consistency',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
),
-- UAT: ScriptRunner custom endpoint
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'umig.web.root',
    'infrastructure',
    '/rest/scriptrunner/latest/custom/web',
    'Root path for UMIG web resources - UAT uses ScriptRunner endpoint',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: ScriptRunner custom endpoint
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'umig.web.root',
    'infrastructure',
    '/rest/scriptrunner/latest/custom/web',
    'Root path for UMIG web resources - PROD uses ScriptRunner endpoint',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
);

-- 6.2 UMIG Web Filesystem Root Path (US-098 Phase 5E)
-- NOTE: Separation of filesystem path from URL path for WebApi file serving
-- URL path (umig.web.root) is for macro and client access
-- Filesystem path (umig.web.filesystem.root) is for WebApi to locate actual files
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- DEV: Local container filesystem path
(
    (SELECT env_id FROM environments_env WHERE env_code = 'DEV' LIMIT 1),
    'umig.web.filesystem.root',
    'infrastructure',
    '/var/atlassian/application-data/confluence/scripts/umig/web',
    'File system path for WebApi to serve static files - DEV container path',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
),
-- UAT: Production UAT filesystem path
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'umig.web.filesystem.root',
    'infrastructure',
    '/appli/confluence/application-data/scripts/umig/web',
    'File system path for WebApi to serve static files - UAT production path',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: Production filesystem path
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'umig.web.filesystem.root',
    'infrastructure',
    '/appli/confluence/application-data/scripts/umig/web',
    'File system path for WebApi to serve static files - PROD production path',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
);

-- ============================================================================
-- CATEGORY 7: STEPVIEW MACRO LOCATION (6 configs - DEV from migration 022)
-- ============================================================================
-- NOTE: These configurations define the Confluence page where the stepView macro
-- is embedded for each environment. The macro provides a web-based interface for
-- viewing and managing step execution status.
-- DEV configurations already exist from migration 022, only adding UAT and PROD here.

-- 6.1 StepView Confluence Base URL
-- NOTE: DEV configuration already exists from migration 022, only adding UAT and PROD
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- UAT: UAT Confluence
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'stepview.confluence.base.url',
    'MACRO_LOCATION',
    'https://confluence-evx.corp.ubp.ch',
    'Base URL for Confluence instance serving UAT environment',
    true,
    true,
    'URL',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: Production Confluence
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'stepview.confluence.base.url',
    'MACRO_LOCATION',
    'https://confluence.corp.ubp.ch',
    'Base URL for Confluence instance serving Production environment',
    true,
    true,
    'URL',
    'US-098-migration',
    'US-098-migration'
);

-- 6.2 StepView Confluence Page ID
-- NOTE: DEV configuration already exists from migration 022, only adding UAT and PROD
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    scf_validation_pattern,
    created_by, updated_by
) VALUES
-- UAT: UAT page ID (to be configured)
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'stepview.confluence.page.id',
    'MACRO_LOCATION',
    'TBD',
    'Confluence page ID containing stepView macro for UAT (to be configured)',
    true,
    true,
    'STRING',
    '^[0-9]+$',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: Production page ID (to be configured)
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'stepview.confluence.page.id',
    'MACRO_LOCATION',
    'TBD',
    'Confluence page ID containing stepView macro for Production (to be configured)',
    true,
    true,
    'STRING',
    '^[0-9]+$',
    'US-098-migration',
    'US-098-migration'
);

-- 6.3 StepView Confluence Page Title
-- NOTE: DEV configuration already exists from migration 022, only adding UAT and PROD
INSERT INTO system_configuration_scf (
    env_id, scf_key, scf_category, scf_value, scf_description,
    scf_is_active, scf_is_system_managed, scf_data_type,
    created_by, updated_by
) VALUES
-- UAT: UAT page title
(
    (SELECT env_id FROM environments_env WHERE env_code = 'UAT' LIMIT 1),
    'stepview.confluence.page.title',
    'MACRO_LOCATION',
    'UMIG - Step View (UAT)',
    'Confluence page title containing stepView macro for UAT',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
),
-- PROD: Production page title
(
    (SELECT env_id FROM environments_env WHERE env_code = 'PROD' LIMIT 1),
    'stepview.confluence.page.title',
    'MACRO_LOCATION',
    'UMIG - Step View (Production)',
    'Confluence page title containing stepView macro for Production',
    true,
    true,
    'STRING',
    'US-098-migration',
    'US-098-migration'
);

-- ============================================================================
-- VERIFICATION QUERIES (Execute after migration to verify data integrity)
-- ============================================================================

-- Verification Query 1: Count by category
-- Expected: infrastructure=6, performance=12, general=6, MACRO_LOCATION=6, Total=30
SELECT
    scf_category,
    COUNT(*) AS config_count,
    COUNT(DISTINCT scf_key) AS unique_keys
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
GROUP BY scf_category
ORDER BY scf_category;

-- Verification Query 2: Count by environment
-- Expected: DEV=8, UAT=11, PROD=11, Total=30
SELECT
    e.env_name,
    COUNT(*) AS config_count
FROM system_configuration_scf scf
JOIN environments_env e ON scf.env_id = e.env_id
WHERE scf.created_by = 'US-098-migration'
GROUP BY e.env_name
ORDER BY e.env_name;

-- Verification Query 3: Security check - NO credentials should be present
-- Expected: 0 rows (all configs should have category != 'security')
SELECT
    scf_key,
    scf_category,
    '❌ UNEXPECTED CREDENTIAL CONFIG' AS issue
FROM system_configuration_scf
WHERE created_by = 'US-098-migration'
  AND scf_category = 'security';

-- Verification Query 4: Overall health check
-- Expected: total_configs=30, infrastructure_count=6, performance_count=12, general_count=6, macro_location_count=6
SELECT
    COUNT(*) AS total_configs,
    SUM(CASE WHEN scf_category = 'infrastructure' THEN 1 ELSE 0 END) AS infrastructure_count,
    SUM(CASE WHEN scf_category = 'performance' THEN 1 ELSE 0 END) AS performance_count,
    SUM(CASE WHEN scf_category = 'general' THEN 1 ELSE 0 END) AS general_count,
    SUM(CASE WHEN scf_category = 'MACRO_LOCATION' THEN 1 ELSE 0 END) AS macro_location_count,
    CASE
        WHEN COUNT(*) = 30
         AND SUM(CASE WHEN scf_category = 'infrastructure' THEN 1 ELSE 0 END) = 6
         AND SUM(CASE WHEN scf_category = 'performance' THEN 1 ELSE 0 END) = 12
         AND SUM(CASE WHEN scf_category = 'general' THEN 1 ELSE 0 END) = 6
         AND SUM(CASE WHEN scf_category = 'MACRO_LOCATION' THEN 1 ELSE 0 END) = 6
        THEN '✅ ALL CHECKS PASSED'
        ELSE '❌ VERIFICATION FAILED'
    END AS overall_status
FROM system_configuration_scf
WHERE created_by = 'US-098-migration';

-- Verification Query 5: List all migrated configs
-- Expected: 30 rows showing all configurations
SELECT
    e.env_name,
    scf.scf_key,
    scf.scf_category,
    scf.scf_value,
    scf.scf_data_type
FROM system_configuration_scf scf
JOIN environments_env e ON scf.env_id = e.env_id
WHERE scf.created_by = 'US-098-migration'
ORDER BY scf.scf_category, scf.scf_key, e.env_name;

-- ============================================================================
-- ROLLBACK PROCEDURE (If needed)
-- ============================================================================
-- To rollback this migration:
-- DELETE FROM system_configuration_scf WHERE created_by = 'US-098-migration';
--
-- Then verify:
-- SELECT COUNT(*) FROM system_configuration_scf WHERE created_by = 'US-098-migration';
-- Expected: 0 rows
-- ============================================================================

--rollback DELETE FROM system_configuration_scf WHERE created_by = 'US-098-migration';
