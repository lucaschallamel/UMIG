package umig.tests.integration

import umig.utils.DatabaseUtil

/**
 * Email Template Database Validation Tests
 *
 * Automated regression tests converted from TD-015-Phase2-Validation-Queries.sql
 * Ensures email template database integrity and content validation.
 *
 * COVERAGE:
 * - Template type enumeration (10 expected types)
 * - Variable presence validation (22 required variables)
 * - Mobile-responsive CSS feature detection
 * - Email template health checks
 *
 * SOURCE: TD-015-Phase2-Validation-Queries.sql (Tasks 2, 3, 5)
 * MIGRATION: SQL Queries → Automated Tests (October 2025)
 * RELATED: TD-015-Email-Template-Fix.md (Phase 6)
 */
class EmailTemplateDatabaseValidationTest {

    /**
     * Test 1: Template Type Enumeration
     *
     * SOURCE: Query 2.6 (lines 155-184)
     * VALIDATES: All 10 expected email template types are present in database
     * REGRESSION RISK: Medium - New templates might be added or accidentally deleted
     */
    static void testAllExpectedTemplateTypesPresent() {
        println "🧪 Test 1: Validating expected email template types..."

        DatabaseUtil.withSql { sql ->
            def expectedTypes = [
                'STEP_STATUS_CHANGED',
                'STEP_OPENED',
                'INSTRUCTION_COMPLETED',
                'INSTRUCTION_UNCOMPLETED',
                'STEP_NOTIFICATION_MOBILE',
                'STEP_STATUS_CHANGED_WITH_URL',
                'STEP_OPENED_WITH_URL',
                'INSTRUCTION_COMPLETED_WITH_URL',
                'BULK_STEP_STATUS_CHANGED',
                'ITERATION_EVENT'
            ]

            def actualTypes = sql.rows("""
                SELECT DISTINCT emt_type
                FROM email_templates_emt
                WHERE emt_is_active = true
                ORDER BY emt_type
            """).collect { it.emt_type }

            // Validate all expected types are present
            def missingTypes = expectedTypes.findAll { !actualTypes.contains(it) }
            def unexpectedTypes = actualTypes.findAll { !expectedTypes.contains(it) }

            assert missingTypes.isEmpty(),
                "❌ Missing expected template types: ${missingTypes}"

            if (!unexpectedTypes.isEmpty()) {
                println "⚠️  WARNING: Unexpected template types found: ${unexpectedTypes}"
            }

            assert actualTypes.size() >= expectedTypes.size(),
                "❌ Template type count mismatch: expected ${expectedTypes.size()}, got ${actualTypes.size()}"

            println "✅ Test 1 PASSED: All ${expectedTypes.size()} expected template types present"
        }
    }

    /**
     * Test 2: Variable Presence Validation (STEP_STATUS_CHANGED)
     *
     * SOURCE: Query 3.2 (lines 240-289)
     * VALIDATES: Critical template contains all 22 required variables
     * REGRESSION RISK: High - Template modifications could break email functionality
     */
    static void testStepStatusChangedTemplateVariables() {
        println "🧪 Test 2: Validating STEP_STATUS_CHANGED template variables..."

        DatabaseUtil.withSql { sql ->
            def template = sql.firstRow("""
                SELECT emt_body_html
                FROM email_templates_emt
                WHERE emt_type = 'STEP_STATUS_CHANGED'
                  AND emt_is_active = true
            """)

            assert template != null,
                "❌ STEP_STATUS_CHANGED template not found"

            def html = template.emt_body_html as String

            // Core Step Variables (5) - from Phase 3 pre-processed variables
            def coreVars = [
                '${stepInstance.sti_code}',
                '${stepInstance.sti_name}',
                '${breadcrumb}',
                '${statusBadgeHtml}',
                '${durationAndEnvironment}'
            ]

            // Hierarchy & Metadata Variables (5)
            def hierarchyVars = [
                '${migrationCode}',
                '${teamRowHtml}',
                '${impactedTeamsRowHtml}',
                '${predecessorRowHtml}',
                '${environmentRowHtml}'
            ]

            // Status Change Variables (4)
            def statusVars = [
                '${newStatus}',
                '${changedAt}',
                '${changeContext}'
            ]

            // URL Variables (1)
            def urlVars = [
                '${stepViewLinkHtml}'
            ]

            // Instructions & Comments Variables (2)
            def contentVars = [
                '${instructionsHtml}',
                '${commentsHtml}'
            ]

            // Metadata Variables (5)
            def metadataVars = [
                '${documentationLinkHtml}',
                '${supportLinkHtml}',
                '${companyName}',
                '${currentYear}',
                '${emailFooterText}'
            ]

            def allVariables = coreVars + hierarchyVars + statusVars + urlVars + contentVars + metadataVars
            def missingVars = []

            allVariables.each { variable ->
                if (!html.contains(variable)) {
                    missingVars << variable
                }
            }

            assert missingVars.isEmpty(),
                "❌ Missing required variables in STEP_STATUS_CHANGED template: ${missingVars}"

            println "✅ Test 2 PASSED: All ${allVariables.size()} required variables present in template"
        }
    }

    /**
     * Test 3: Mobile-Responsive CSS Features
     *
     * SOURCE: Query 3.4 (lines 334-370)
     * VALIDATES: Templates contain mobile breakpoints and responsive features
     * REGRESSION RISK: High - CSS changes could break mobile email rendering
     */
    static void testMobileResponsiveCSSFeatures() {
        println "🧪 Test 3: Validating mobile-responsive CSS features..."

        DatabaseUtil.withSql { sql ->
            def templates = sql.rows("""
                SELECT emt_type, emt_body_html
                FROM email_templates_emt
                WHERE emt_is_active = true
                  AND emt_type IN ('STEP_STATUS_CHANGED', 'STEP_OPENED', 'INSTRUCTION_COMPLETED')
            """)

            assert !templates.isEmpty(),
                "❌ No active templates found for CSS validation"

            def cssIssues = []

            templates.each { template ->
                def html = template.emt_body_html as String
                def type = template.emt_type as String

                // Check for essential responsive features
                def hasMediaQueries = html.contains('@media')
                def hasMaxWidth = html.contains('max-width')
                def hasMobileBreakpoint = html.contains('320px') || html.contains('600px') || html.contains('768px')
                def hasOutlookSupport = html.contains('<!--[if mso]>') || html.contains('xmlns:v="urn:schemas-microsoft-com:vml"')
                def hasResponsiveContainer = html.contains('min-width: 320px') && html.contains('max-width: 1000px')

                if (!hasMediaQueries) {
                    cssIssues << "${type}: Missing @media queries"
                }
                if (!hasMobileBreakpoint) {
                    cssIssues << "${type}: Missing mobile breakpoints"
                }
                if (!hasOutlookSupport) {
                    cssIssues << "${type}: Missing Outlook MSO support"
                }
                if (!hasResponsiveContainer) {
                    cssIssues << "${type}: Missing responsive container (320px-1000px)"
                }
            }

            assert cssIssues.isEmpty(),
                "❌ Mobile-responsive CSS issues found:\n${cssIssues.join('\n')}"

            println "✅ Test 3 PASSED: All ${templates.size()} templates have mobile-responsive CSS features"
        }
    }

    /**
     * Test 4: Email Template Health Check
     *
     * SOURCE: Query 5.1 (lines 494-544)
     * VALIDATES: System health indicators (template counts, sizes, basic integrity)
     * REGRESSION RISK: Medium - Quick smoke test catches major issues
     */
    static void testEmailTemplateHealthCheck() {
        println "🧪 Test 4: Running email template health check..."

        DatabaseUtil.withSql { sql ->
            def metrics = sql.firstRow("""
                SELECT
                    COUNT(*) as total_templates,
                    COUNT(CASE WHEN emt_is_active THEN 1 END) as active_templates,
                    COUNT(CASE WHEN NOT emt_is_active THEN 1 END) as inactive_templates,
                    COUNT(DISTINCT emt_type) as distinct_types,
                    ROUND(AVG(LENGTH(emt_body_html)), 0) as avg_html_length,
                    MIN(LENGTH(emt_body_html)) as min_html_length,
                    MAX(LENGTH(emt_body_html)) as max_html_length
                FROM email_templates_emt
            """)

            // Health check assertions
            assert (metrics.total_templates as Long) >= 10L,
                "❌ Total template count too low: ${metrics.total_templates} (expected ≥10)"

            assert (metrics.active_templates as Long) >= 10L,
                "❌ Active template count too low: ${metrics.active_templates} (expected ≥10)"

            assert (metrics.distinct_types as Long) >= 9L,
                "❌ Template type count too low: ${metrics.distinct_types} (expected ≥9)"

            // TD-015 Phase 3 result: templates should be ~7,650 bytes (83% reduction from 45,243)
            assert (metrics.avg_html_length as Long) >= 5000L && (metrics.avg_html_length as Long) <= 10000L,
                "❌ Average template size out of expected range: ${metrics.avg_html_length} bytes (expected 5,000-10,000)"

            assert (metrics.min_html_length as Integer) >= 1000,
                "❌ Minimum template size suspiciously small: ${metrics.min_html_length} bytes"

            assert (metrics.max_html_length as Integer) <= 50000,
                "❌ Maximum template size too large: ${metrics.max_html_length} bytes (expected ≤50,000)"

            println """✅ Test 4 PASSED: Email template health check
   Total Templates: ${metrics.total_templates}
   Active Templates: ${metrics.active_templates}
   Inactive Templates: ${metrics.inactive_templates}
   Distinct Types: ${metrics.distinct_types}
   Avg Size: ${metrics.avg_html_length} bytes
   Size Range: ${metrics.min_html_length} - ${metrics.max_html_length} bytes"""
        }
    }

    /**
     * Main test runner
     */
    static void main(String[] args) {
        println "="*80
        println "EMAIL TEMPLATE DATABASE VALIDATION TEST SUITE"
        println "Converted from: TD-015-Phase2-Validation-Queries.sql"
        println "Test Count: 4"
        println "="*80
        println ""

        def startTime = System.currentTimeMillis()

        try {
            // Run all tests
            testAllExpectedTemplateTypesPresent()
            testStepStatusChangedTemplateVariables()
            testMobileResponsiveCSSFeatures()
            testEmailTemplateHealthCheck()

            def duration = System.currentTimeMillis() - startTime

            println ""
            println "="*80
            println "✅ ALL TESTS PASSED (4/4)"
            println "Duration: ${duration}ms"
            println "="*80
        } catch (AssertionError e) {
            def duration = System.currentTimeMillis() - startTime

            println ""
            println "="*80
            println "❌ TEST SUITE FAILED"
            println "Error: ${e.message}"
            println "Duration: ${duration}ms"
            println "="*80

            System.exit(1)
        }
    }
}
