-- TD-015 Phase 2: Database Validation SQL Queries
-- Database: umig_app_db (confluence_db)
-- Schema: public.email_templates_emt
-- Sprint 8 - Email Template Consistency Finalization
-- Execution Date: September 30, 2025

-- ========================================
-- Task 1: Schema Validation (2 hours)
-- ========================================

-- Query 1.1: Complete table structure with all columns, types, and constraints
\d email_templates_emt

-- Query 1.2: CHECK constraint validation on emt_type column
SELECT
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'email_templates_emt'::regclass
  AND contype = 'c'
ORDER BY conname;

-- Query 1.3: Foreign key relationships validation
SELECT
    conname AS fk_name,
    pg_get_constraintdef(oid) AS fk_definition,
    confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE conrelid = 'email_templates_emt'::regclass
  AND contype = 'f'
ORDER BY conname;

-- Query 1.4: Active template count and basic statistics
SELECT
    COUNT(*) AS total_templates,
    SUM(CASE WHEN emt_is_active = true THEN 1 ELSE 0 END) AS active_templates,
    SUM(CASE WHEN emt_is_active = false THEN 1 ELSE 0 END) AS inactive_templates,
    ROUND(AVG(LENGTH(emt_body_html)), 0) AS avg_html_length,
    MIN(LENGTH(emt_body_html)) AS min_html_length,
    MAX(LENGTH(emt_body_html)) AS max_html_length
FROM email_templates_emt;

-- Query 1.5: Column data types and nullability validation
SELECT
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'email_templates_emt'
ORDER BY ordinal_position;

-- Query 1.6: Index validation
SELECT
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'email_templates_emt'
ORDER BY indexname;

-- Query 1.7: Table size and row count
SELECT
    pg_size_pretty(pg_total_relation_size('email_templates_emt')) AS total_size,
    pg_size_pretty(pg_relation_size('email_templates_emt')) AS table_size,
    pg_size_pretty(pg_total_relation_size('email_templates_emt') - pg_relation_size('email_templates_emt')) AS indexes_size,
    COUNT(*) AS row_count
FROM email_templates_emt;

-- ========================================
-- Task 2: Template Type Enumeration (2 hours)
-- ========================================

-- Query 2.1: All template types with comprehensive metadata
SELECT
    emt_id,
    emt_type,
    emt_name,
    emt_subject,
    emt_is_active,
    LENGTH(emt_body_html) AS html_length_bytes,
    ROUND(LENGTH(emt_body_html) / 1024.0, 2) AS html_length_kb,
    created_at,
    updated_at,
    EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600 AS hours_since_creation
FROM email_templates_emt
ORDER BY emt_type, emt_is_active DESC, created_at;

-- Query 2.2: Template type usage statistics
SELECT
    emt_type,
    COUNT(*) AS template_count,
    SUM(CASE WHEN emt_is_active THEN 1 ELSE 0 END) AS active_count,
    SUM(CASE WHEN NOT emt_is_active THEN 1 ELSE 0 END) AS inactive_count,
    ROUND(AVG(LENGTH(emt_body_html)), 0) AS avg_html_length,
    MIN(LENGTH(emt_body_html)) AS min_html_length,
    MAX(LENGTH(emt_body_html)) AS max_html_length,
    STRING_AGG(emt_name, ', ' ORDER BY emt_name) AS template_names
FROM email_templates_emt
GROUP BY emt_type
ORDER BY template_count DESC, emt_type;

-- Query 2.3: WITH_URL variants validation
SELECT
    emt_id,
    emt_type,
    emt_name,
    emt_subject,
    emt_is_active,
    LENGTH(emt_body_html) AS html_length,
    CASE
        WHEN emt_body_html LIKE '%${stepViewUrl}%' THEN 'Contains stepViewUrl'
        WHEN emt_body_html LIKE '%${hasStepViewUrl}%' THEN 'Contains hasStepViewUrl'
        ELSE 'No URL variables'
    END AS url_variable_status,
    created_at,
    updated_at
FROM email_templates_emt
WHERE emt_type LIKE '%WITH_URL%'
ORDER BY emt_type, emt_is_active DESC;

-- Query 2.4: Template types without WITH_URL equivalents
SELECT DISTINCT
    base_type,
    CASE
        WHEN url_variant_exists THEN 'Has WITH_URL variant'
        ELSE 'Missing WITH_URL variant'
    END AS variant_status
FROM (
    SELECT
        REPLACE(emt_type, '_WITH_URL', '') AS base_type,
        EXISTS(
            SELECT 1
            FROM email_templates_emt e2
            WHERE e2.emt_type = REPLACE(email_templates_emt.emt_type, '_WITH_URL', '') || '_WITH_URL'
        ) AS url_variant_exists
    FROM email_templates_emt
    WHERE emt_type NOT LIKE '%WITH_URL%'
) AS variant_check
ORDER BY base_type;

-- Query 2.5: Active vs inactive template breakdown by type
SELECT
    emt_type,
    emt_is_active,
    COUNT(*) AS count,
    STRING_AGG(emt_name, ', ') AS template_names,
    ROUND(AVG(LENGTH(emt_body_html)), 0) AS avg_html_length
FROM email_templates_emt
GROUP BY emt_type, emt_is_active
ORDER BY emt_type, emt_is_active DESC;

-- Query 2.6: Expected template types validation (from Phase 1 analysis)
WITH expected_types AS (
    SELECT unnest(ARRAY[
        'STEP_STATUS_CHANGED',
        'STEP_OPENED',
        'INSTRUCTION_COMPLETED',
        'INSTRUCTION_UNCOMPLETED',
        'STEP_NOTIFICATION_MOBILE',
        'STEP_STATUS_CHANGED_WITH_URL',
        'STEP_OPENED_WITH_URL',
        'INSTRUCTION_COMPLETED_WITH_URL',
        'CUSTOM'
    ]) AS expected_type
)
SELECT
    et.expected_type,
    CASE
        WHEN EXISTS(SELECT 1 FROM email_templates_emt emt WHERE emt.emt_type = et.expected_type)
        THEN '✅ Present'
        ELSE '❌ Missing'
    END AS status,
    COALESCE(
        (SELECT COUNT(*) FROM email_templates_emt emt WHERE emt.emt_type = et.expected_type),
        0
    ) AS template_count,
    COALESCE(
        (SELECT STRING_AGG(emt_name, ', ') FROM email_templates_emt emt WHERE emt.emt_type = et.expected_type AND emt_is_active),
        'N/A'
    ) AS active_template_names
FROM expected_types et
ORDER BY et.expected_type;

-- Query 2.7: Orphaned or deprecated template types (not in expected list)
SELECT
    emt_type,
    COUNT(*) AS count,
    STRING_AGG(emt_name, ', ') AS template_names,
    CASE
        WHEN emt_type IN (
            'STEP_STATUS_CHANGED',
            'STEP_OPENED',
            'INSTRUCTION_COMPLETED',
            'INSTRUCTION_UNCOMPLETED',
            'STEP_NOTIFICATION_MOBILE',
            'STEP_STATUS_CHANGED_WITH_URL',
            'STEP_OPENED_WITH_URL',
            'INSTRUCTION_COMPLETED_WITH_URL',
            'CUSTOM'
        ) THEN 'Expected'
        ELSE 'Orphaned/Deprecated'
    END AS type_status
FROM email_templates_emt
GROUP BY emt_type
HAVING emt_type NOT IN (
    'STEP_STATUS_CHANGED',
    'STEP_OPENED',
    'INSTRUCTION_COMPLETED',
    'INSTRUCTION_UNCOMPLETED',
    'STEP_NOTIFICATION_MOBILE',
    'STEP_STATUS_CHANGED_WITH_URL',
    'STEP_OPENED_WITH_URL',
    'INSTRUCTION_COMPLETED_WITH_URL',
    'CUSTOM'
)
ORDER BY count DESC, emt_type;

-- ========================================
-- Task 3: Content Comparison (2 hours)
-- ========================================

-- Query 3.1: Extract active template HTML for canonical comparison
SELECT
    emt_id,
    emt_type,
    emt_name,
    emt_subject,
    emt_body_html,
    LENGTH(emt_body_html) AS html_length_bytes,
    ROUND(LENGTH(emt_body_html) / 1024.0, 2) AS html_length_kb,
    updated_at,
    created_at
FROM email_templates_emt
WHERE emt_is_active = true
  AND emt_type IN ('STEP_STATUS_CHANGED', 'STEP_OPENED', 'INSTRUCTION_COMPLETED')
ORDER BY emt_type;

-- Query 3.2: Variable usage detection in database templates (35 variables from Phase 1)
SELECT
    emt_id,
    emt_type,
    emt_name,
    -- Core Step Variables (5)
    emt_body_html LIKE '%${stepInstance.sti_code}%' AS has_sti_code,
    emt_body_html LIKE '%${stepInstance.sti_name}%' AS has_sti_name,
    emt_body_html LIKE '%${stepInstance.sti_status}%' AS has_sti_status,
    emt_body_html LIKE '%${stepInstance.sti_description}%' AS has_sti_description,
    emt_body_html LIKE '%${stepInstance.sti_duration_minutes}%' AS has_sti_duration,
    -- Hierarchy Variables (5)
    emt_body_html LIKE '%${stepInstance.migration_name}%' AS has_migration_name,
    emt_body_html LIKE '%${stepInstance.iteration_name}%' AS has_iteration_name,
    emt_body_html LIKE '%${stepInstance.plan_name}%' AS has_plan_name,
    emt_body_html LIKE '%${stepInstance.sequence_name}%' AS has_sequence_name,
    emt_body_html LIKE '%${stepInstance.phase_name}%' AS has_phase_name,
    -- Metadata Variables (5)
    emt_body_html LIKE '%${stepInstance.team_name}%' AS has_team_name,
    emt_body_html LIKE '%${stepInstance.environment_name}%' AS has_environment_name,
    emt_body_html LIKE '%${stepInstance.predecessor_code}%' AS has_predecessor_code,
    emt_body_html LIKE '%${stepInstance.predecessor_name}%' AS has_predecessor_name,
    emt_body_html LIKE '%${stepInstance.impacted_teams}%' AS has_impacted_teams,
    -- Short Code Variables (2)
    emt_body_html LIKE '%${migrationCode}%' AS has_migrationCode,
    emt_body_html LIKE '%${iterationCode}%' AS has_iterationCode,
    -- Status Change Variables (4)
    emt_body_html LIKE '%${oldStatus}%' AS has_oldStatus,
    emt_body_html LIKE '%${newStatus}%' AS has_newStatus,
    emt_body_html LIKE '%${changedBy}%' AS has_changedBy,
    emt_body_html LIKE '%${changedAt}%' AS has_changedAt,
    -- URL Variables (3)
    emt_body_html LIKE '%${stepViewUrl}%' AS has_stepViewUrl,
    emt_body_html LIKE '%${hasStepViewUrl}%' AS has_hasStepViewUrl_flag,
    emt_body_html LIKE '%${documentationUrl}%' OR emt_body_html LIKE '%${supportUrl}%' AS has_footer_urls,
    -- Instructions Variables (6)
    emt_body_html LIKE '%${stepInstance.instructions}%' AS has_instructions_collection,
    emt_body_html LIKE '%${instruction.ini_name}%' AS has_instruction_name,
    emt_body_html LIKE '%${instruction.ini_duration_minutes}%' AS has_instruction_duration,
    emt_body_html LIKE '%${instruction.team_name}%' AS has_instruction_team,
    emt_body_html LIKE '%${instruction.control_code}%' AS has_instruction_control,
    emt_body_html LIKE '%${instruction.completed}%' AS has_instruction_completed,
    -- Comments Variables (4)
    emt_body_html LIKE '%${stepInstance.recentComments}%' OR emt_body_html LIKE '%${recentComments}%' AS has_comments_collection,
    emt_body_html LIKE '%${comment.author_name}%' AS has_comment_author,
    emt_body_html LIKE '%${comment.created_at}%' AS has_comment_timestamp,
    emt_body_html LIKE '%${comment.comment_text}%' AS has_comment_text
FROM email_templates_emt
WHERE emt_is_active = true
ORDER BY emt_type;

-- Query 3.3: Variable count summary by template type
SELECT
    emt_type,
    emt_name,
    -- Core Step Variables Count
    (CASE WHEN emt_body_html LIKE '%${stepInstance.sti_code}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${stepInstance.sti_name}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${stepInstance.sti_status}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${stepInstance.sti_description}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${stepInstance.sti_duration_minutes}%' THEN 1 ELSE 0 END) AS core_step_vars_count,
    -- Hierarchy Variables Count
    (CASE WHEN emt_body_html LIKE '%${stepInstance.migration_name}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${stepInstance.iteration_name}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${stepInstance.plan_name}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${stepInstance.sequence_name}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${stepInstance.phase_name}%' THEN 1 ELSE 0 END) AS hierarchy_vars_count,
    -- Status Variables Count
    (CASE WHEN emt_body_html LIKE '%${oldStatus}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${newStatus}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${changedBy}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${changedAt}%' THEN 1 ELSE 0 END) AS status_vars_count,
    -- URL Variables Count
    (CASE WHEN emt_body_html LIKE '%${stepViewUrl}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${hasStepViewUrl}%' THEN 1 ELSE 0 END) AS url_vars_count,
    -- Comments/Instructions Count
    (CASE WHEN emt_body_html LIKE '%recentComments%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%instructions%' THEN 1 ELSE 0 END) AS collections_count,
    -- Total Variable Count Estimate
    (CASE WHEN emt_body_html LIKE '%${stepInstance.sti_code}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${stepInstance.sti_name}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${stepInstance.sti_status}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${oldStatus}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${newStatus}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${stepViewUrl}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${hasStepViewUrl}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${migrationCode}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%${iterationCode}%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%recentComments%' THEN 1 ELSE 0 END +
     CASE WHEN emt_body_html LIKE '%instructions%' THEN 1 ELSE 0 END) AS total_estimated_vars
FROM email_templates_emt
WHERE emt_is_active = true
ORDER BY total_estimated_vars DESC, emt_type;

-- Query 3.4: CSS feature detection in database templates
SELECT
    emt_id,
    emt_type,
    emt_name,
    -- Mobile Responsive CSS
    emt_body_html LIKE '%@media%only%screen%max-width%600px%' OR
    emt_body_html LIKE '%@media%only%screen%max-width: 600px%' AS has_mobile_breakpoint_600px,
    emt_body_html LIKE '%@media%only%screen%max-width%768px%' OR
    emt_body_html LIKE '%@media%only%screen%max-width: 768px%' AS has_tablet_breakpoint_768px,
    emt_body_html LIKE '%@media%only%screen%max-width%1000px%' OR
    emt_body_html LIKE '%@media%only%screen%max-width: 1000px%' AS has_desktop_breakpoint_1000px,
    -- Dark Mode Support
    emt_body_html LIKE '%@media%prefers-color-scheme%dark%' OR
    emt_body_html LIKE '%@media (prefers-color-scheme: dark)%' AS has_dark_mode,
    -- Print Styles
    emt_body_html LIKE '%@media%print%' OR
    emt_body_html LIKE '%@media print%' AS has_print_styles,
    -- Outlook MSO Support
    emt_body_html LIKE '%<!--[if mso]>%' OR
    emt_body_html LIKE '%xmlns:v="urn:schemas-microsoft-com:vml"%' AS has_outlook_mso,
    -- Gradient Header
    emt_body_html LIKE '%linear-gradient%' OR
    emt_body_html LIKE '%background: #%#%' AS has_gradient_header,
    -- Touch-Friendly CTA (44px minimum)
    emt_body_html LIKE '%height: 44px%' OR
    emt_body_html LIKE '%min-height: 44px%' OR
    emt_body_html LIKE '%padding: 16px%' AS has_touch_friendly_cta,
    -- Comments Section
    emt_body_html LIKE '%recentComments%' OR
    emt_body_html LIKE '%comment-card%' AS has_comments_section,
    -- Instructions Table
    emt_body_html LIKE '%instructions-table%' OR
    emt_body_html LIKE '%<table%instructions%' AS has_instructions_table
FROM email_templates_emt
WHERE emt_is_active = true
ORDER BY emt_type;

-- Query 3.5: HTML structure analysis
SELECT
    emt_type,
    emt_name,
    LENGTH(emt_body_html) AS total_length,
    (LENGTH(emt_body_html) - LENGTH(REPLACE(emt_body_html, '<table', ''))) / LENGTH('<table') AS table_count,
    (LENGTH(emt_body_html) - LENGTH(REPLACE(emt_body_html, '<div', ''))) / LENGTH('<div') AS div_count,
    (LENGTH(emt_body_html) - LENGTH(REPLACE(emt_body_html, '@media', ''))) / LENGTH('@media') AS media_query_count,
    (LENGTH(emt_body_html) - LENGTH(REPLACE(emt_body_html, '${', ''))) / LENGTH('${') AS gsp_variable_count,
    (LENGTH(emt_body_html) - LENGTH(REPLACE(emt_body_html, '!important', ''))) / LENGTH('!important') AS important_flag_count
FROM email_templates_emt
WHERE emt_is_active = true
ORDER BY emt_type;

-- ========================================
-- Task 4: Migration Consistency Check (2 hours)
-- ========================================

-- Query 4.1: Liquibase changelog verification for migrations 024 and 027
SELECT
    id,
    author,
    filename,
    dateexecuted,
    orderexecuted,
    exectype,
    md5sum,
    description,
    comments,
    tag,
    liquibase
FROM databasechangelog
WHERE filename LIKE '%024_enhance_mobile_email_templates%'
   OR filename LIKE '%027_email_templates_with_urls%'
ORDER BY orderexecuted;

-- Query 4.2: Verify migration 024 templates exist (STEP_NOTIFICATION_MOBILE)
SELECT
    COUNT(*) AS migration_024_templates,
    STRING_AGG(emt_name, ', ') AS template_names,
    STRING_AGG(emt_type, ', ') AS template_types
FROM email_templates_emt
WHERE emt_type = 'STEP_NOTIFICATION_MOBILE';

-- Query 4.3: Verify migration 027 templates exist (WITH_URL variants)
SELECT
    COUNT(*) AS migration_027_templates,
    STRING_AGG(emt_name, ', ') AS template_names,
    STRING_AGG(emt_type, ', ') AS template_types
FROM email_templates_emt
WHERE emt_type LIKE '%WITH_URL%';

-- Query 4.4: Check for migration conflicts (duplicate templates)
SELECT
    emt_type,
    emt_name,
    emt_subject,
    COUNT(*) AS duplicate_count,
    STRING_AGG(emt_id::TEXT, ', ') AS duplicate_ids,
    STRING_AGG(emt_is_active::TEXT, ', ') AS active_status,
    STRING_AGG(TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS'), ', ') AS creation_dates
FROM email_templates_emt
GROUP BY emt_type, emt_name, emt_subject
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, emt_type;

-- Query 4.5: Migration application timeline
SELECT
    filename,
    dateexecuted,
    exectype,
    description,
    orderexecuted,
    EXTRACT(EPOCH FROM (dateexecuted - LAG(dateexecuted) OVER (ORDER BY orderexecuted))) / 3600 AS hours_since_previous_migration
FROM databasechangelog
WHERE filename LIKE '%email%template%'
   OR filename LIKE '%024%'
   OR filename LIKE '%027%'
ORDER BY orderexecuted;

-- Query 4.6: Template creation dates vs migration execution dates
SELECT
    emt.emt_type,
    emt.emt_name,
    emt.created_at AS template_created,
    dcl.dateexecuted AS migration_executed,
    dcl.filename AS migration_file,
    CASE
        WHEN emt.created_at > dcl.dateexecuted THEN 'Created after migration'
        WHEN emt.created_at < dcl.dateexecuted THEN 'Created before migration'
        ELSE 'Created during migration'
    END AS creation_timing
FROM email_templates_emt emt
CROSS JOIN (
    SELECT filename, dateexecuted
    FROM databasechangelog
    WHERE filename LIKE '%024_enhance_mobile_email_templates%'
       OR filename LIKE '%027_email_templates_with_urls%'
) dcl
WHERE emt.emt_type IN ('STEP_NOTIFICATION_MOBILE', 'STEP_STATUS_CHANGED_WITH_URL', 'STEP_OPENED_WITH_URL', 'INSTRUCTION_COMPLETED_WITH_URL')
ORDER BY emt.created_at, dcl.dateexecuted;

-- Query 4.7: Rollback capability assessment
SELECT
    filename,
    md5sum,
    exectype,
    CASE
        WHEN exectype IN ('EXECUTED', 'RERAN') THEN 'Rollback possible'
        WHEN exectype = 'FAILED' THEN 'Failed - manual intervention needed'
        ELSE 'Unknown rollback status'
    END AS rollback_status,
    description
FROM databasechangelog
WHERE filename LIKE '%024_enhance_mobile_email_templates%'
   OR filename LIKE '%027_email_templates_with_urls%'
ORDER BY orderexecuted DESC;

-- ========================================
-- Summary Statistics and Validation
-- ========================================

-- Query 5.1: Overall database template health check
SELECT
    'Total Templates' AS metric,
    COUNT(*)::TEXT AS value
FROM email_templates_emt
UNION ALL
SELECT
    'Active Templates',
    COUNT(*)::TEXT
FROM email_templates_emt
WHERE emt_is_active = true
UNION ALL
SELECT
    'Inactive Templates',
    COUNT(*)::TEXT
FROM email_templates_emt
WHERE emt_is_active = false
UNION ALL
SELECT
    'Distinct Template Types',
    COUNT(DISTINCT emt_type)::TEXT
FROM email_templates_emt
UNION ALL
SELECT
    'Templates with URLs',
    COUNT(*)::TEXT
FROM email_templates_emt
WHERE emt_body_html LIKE '%${stepViewUrl}%'
UNION ALL
SELECT
    'Templates with Comments',
    COUNT(*)::TEXT
FROM email_templates_emt
WHERE emt_body_html LIKE '%recentComments%'
UNION ALL
SELECT
    'Templates with Instructions',
    COUNT(*)::TEXT
FROM email_templates_emt
WHERE emt_body_html LIKE '%instructions%'
UNION ALL
SELECT
    'Average Template Size (KB)',
    ROUND(AVG(LENGTH(emt_body_html)) / 1024.0, 2)::TEXT
FROM email_templates_emt
UNION ALL
SELECT
    'Migrations Applied',
    COUNT(*)::TEXT
FROM databasechangelog
WHERE filename LIKE '%024%' OR filename LIKE '%027%';

-- Query 5.2: Canonical template comparison readiness
SELECT
    emt_type,
    emt_name,
    emt_is_active,
    LENGTH(emt_body_html) AS db_html_length,
    44200 AS canonical_file_length_bytes, -- Template 3: enhanced-mobile-email-template.html
    ROUND((LENGTH(emt_body_html)::NUMERIC / 44200) * 100, 2) AS similarity_percentage_estimate,
    CASE
        WHEN LENGTH(emt_body_html) BETWEEN 40000 AND 48000 THEN 'Similar size to canonical'
        WHEN LENGTH(emt_body_html) < 40000 THEN 'Smaller than canonical - missing features'
        WHEN LENGTH(emt_body_html) > 48000 THEN 'Larger than canonical - extra content'
        ELSE 'Unknown'
    END AS size_comparison
FROM email_templates_emt
WHERE emt_is_active = true
  AND emt_type IN ('STEP_STATUS_CHANGED', 'STEP_OPENED', 'INSTRUCTION_COMPLETED')
ORDER BY emt_type;

-- End of TD-015 Phase 2 Validation Queries