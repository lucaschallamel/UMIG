#!/usr/bin/env groovy

/**
 * Test Environment Detection Bugfix
 *
 * Purpose: Verify multi-tier fallback strategy for ComponentLocator failure
 * Context: ComponentLocator.getComponent(SettingsManager) fails in ScriptRunner context
 * Solution: 3-tier fallback: ComponentLocator → System Property → Hardcoded Localhost
 *
 * Run this in ScriptRunner Console to verify the fix works
 */

import umig.service.ConfigurationService
import umig.utils.UrlConstructionService
import umig.utils.DatabaseUtil
import groovy.sql.Sql
import java.util.UUID

println "=" * 80
println "ENVIRONMENT DETECTION BUGFIX TEST"
println "=" * 80
println ""

// Test 1: Direct ConfigurationService.getCurrentEnvironment() call
println "📊 TEST 1: ConfigurationService.getCurrentEnvironment()"
println "-" * 80
try {
    String currentEnv = ConfigurationService.getCurrentEnvironment()
    println "✅ SUCCESS: Detected environment = ${currentEnv}"

    // Validate it's reasonable
    def validEnvs = ['DEV', 'TEST', 'UAT', 'PROD', 'EV1', 'EV2']
    if (currentEnv in validEnvs) {
        println "✅ VALIDATION: Environment code is valid"
    } else {
        println "⚠️  WARNING: Unexpected environment code: ${currentEnv}"
    }
} catch (Exception e) {
    println "❌ FAILED: ${e.message}"
    e.printStackTrace()
}
println ""

// Test 2: Check which tier succeeded
println "📊 TEST 2: Identify Which Detection Tier Succeeded"
println "-" * 80

// Check Tier 1: System Property
String sysProp = System.getProperty('umig.environment')
if (sysProp) {
    println "✅ Tier 1 (System Property): umig.environment = ${sysProp}"
} else {
    println "⚪ Tier 1 (System Property): NOT SET"
}

// Check Tier 2: Environment Variable
String envVar = System.getenv('UMIG_ENVIRONMENT')
if (envVar) {
    println "✅ Tier 2 (Environment Variable): UMIG_ENVIRONMENT = ${envVar}"
} else {
    println "⚪ Tier 2 (Environment Variable): NOT SET"
}

// Check Tier 3: URL-based detection
println "⚪ Tier 3 (URL Detection): Attempting ComponentLocator + fallbacks..."
try {
    // This will use the new multi-tier getConfluenceBaseUrl()
    String baseUrl = ConfigurationService.class.getDeclaredMethod('getConfluenceBaseUrl').with {
        it.accessible = true
        it.invoke(null)
    }
    println "   Retrieved base URL: ${baseUrl}"

    if (baseUrl?.contains('localhost')) {
        println "   ✅ Detected localhost → DEV environment"
    } else if (baseUrl?.contains('confluence-evx')) {
        println "   ✅ Detected confluence-evx → UAT environment"
    } else if (baseUrl?.contains('confluence.corp.ubp.ch')) {
        println "   ✅ Detected confluence.corp.ubp.ch → PROD environment"
    } else {
        println "   ⚠️  Unexpected URL pattern: ${baseUrl}"
    }
} catch (Exception e) {
    println "   ❌ URL detection failed: ${e.message}"
}
println ""

// Test 3: URL Construction (end-to-end test)
println "📊 TEST 3: UrlConstructionService.buildStepViewUrl() [END-TO-END]"
println "-" * 80
try {
    // Get a real step instance ID from database for testing
    // Using MANDATORY DatabaseUtil.withSql pattern (ADR-031, ADR-043)
    def testStepId = umig.utils.DatabaseUtil.withSql { sql ->
        def row = sql.firstRow("""
            SELECT stp_instance_id
            FROM steps_instance_stp
            WHERE stp_migration_code = 'MIG001'
              AND stp_iteration_code = 'ITER001'
            LIMIT 1
        """)
        return row?.stp_instance_id
    }

    if (testStepId) {
        String url = UrlConstructionService.buildStepViewUrl(
            testStepId as UUID,
            'MIG001',
            'ITER001'
        )

        if (url) {
            println "✅ SUCCESS: Generated URL"
            println "   ${url}"

            // Validate URL structure
            if (url.contains('http') && url.contains('stepview')) {
                println "✅ VALIDATION: URL structure looks correct"
            } else {
                println "⚠️  WARNING: URL structure seems incorrect"
            }
        } else {
            println "❌ FAILED: buildStepViewUrl() returned null"
        }
    } else {
        println "⚠️  SKIPPED: No test step instance found in database"
        println "   Run data generator first: npm run generate-data"
    }
} catch (Exception e) {
    println "❌ FAILED: ${e.message}"
    e.printStackTrace()
}
println ""

// Test 4: System Property Override Test
println "📊 TEST 4: System Property Override Capability"
println "-" * 80
println "To test manual override, run this in ScriptRunner Console:"
println ""
println "  System.setProperty('umig.environment', 'UAT')"
println "  def env = umig.service.ConfigurationService.getCurrentEnvironment()"
println "  println \"Override test: \${env}\" // Should print 'UAT'"
println ""
println "NOTE: This override only affects current session, not persistent"
println ""

// Test 5: ComponentLocator Direct Test
println "📊 TEST 5: ComponentLocator Direct Test (Diagnostic)"
println "-" * 80
try {
    def settingsManager = com.atlassian.sal.api.component.ComponentLocator.getComponent(
        com.atlassian.confluence.setup.settings.SettingsManager.class
    )

    if (settingsManager) {
        String baseUrl = settingsManager?.globalSettings?.baseUrl
        println "✅ ComponentLocator SUCCESS: SettingsManager available"
        println "   Base URL: ${baseUrl}"
        println "   (This means we're running in Confluence context, not pure ScriptRunner)"
    } else {
        println "⚠️  ComponentLocator returned null (expected in ScriptRunner console)"
    }
} catch (Exception e) {
    println "❌ ComponentLocator FAILED (expected in ScriptRunner console):"
    println "   ${e.class.simpleName}: ${e.message}"
    println "   This is NORMAL and why we need the fallback logic!"
}
println ""

// Summary
println "=" * 80
println "SUMMARY"
println "=" * 80
println "✅ If all tests passed, the bugfix is working correctly"
println "✅ The system should detect DEV environment via localhost fallback"
println "✅ URL construction should work even when ComponentLocator fails"
println ""
println "Expected Behavior in DEV:"
println "  - Tier 1/2: Not set (unless manually configured)"
println "  - Tier 3: Falls back to http://localhost:8090"
println "  - Result: DEV environment detected"
println "  - URLs: http://localhost:8090/display/UMIG/stepview?..."
println ""
println "=" * 80
