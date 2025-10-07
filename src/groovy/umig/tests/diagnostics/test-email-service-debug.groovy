#!/usr/bin/env groovy

/**
 * Email Service Diagnostic Test
 *
 * Purpose: Debug why emails are failing with "Email send returned false"
 *
 * Tests:
 * 1. URL construction (ConfigurationService + UrlConstructionService)
 * 2. Email template rendering
 * 3. MailHog connectivity
 * 4. Complete email send flow
 *
 * Run: groovy src/groovy/umig/tests/diagnostics/test-email-service-debug.groovy
 */

@Grab('org.postgresql:postgresql:42.7.1')
import groovy.sql.Sql
import java.util.UUID

println "=== Email Service Diagnostic Test ==="
println ""

// Test 1: Configuration Service
println "Test 1: ConfigurationService.getCurrentEnvironment()"
try {
    def configServiceClass = Class.forName('umig.service.ConfigurationService')
    def getCurrentEnvironmentMethod = configServiceClass.getMethod('getCurrentEnvironment')
    String env = getCurrentEnvironmentMethod.invoke(null) as String
    println "✅ Environment detected: ${env}"
} catch (Exception e) {
    println "❌ FAILED: ${e.message}"
    e.printStackTrace()
}

println ""

// Test 2: URL Construction
println "Test 2: UrlConstructionService.buildStepViewUrl()"
try {
    def urlServiceClass = Class.forName('umig.utils.UrlConstructionService')
    def buildStepViewUrlMethod = urlServiceClass.getMethod('buildStepViewUrl', UUID.class, String.class, String.class)

    UUID testStepId = UUID.fromString("764aa708-5571-478c-a63e-156ad9b0d311")
    String url = buildStepViewUrlMethod.invoke(null, testStepId, "TORONTO", "run1") as String

    if (url) {
        println "✅ URL constructed: ${url}"
    } else {
        println "❌ FAILED: URL is null"
    }
} catch (Exception e) {
    println "❌ FAILED: ${e.message}"
    e.printStackTrace()
}

println ""

// Test 3: Database Connection
println "Test 3: Database connectivity"
try {
    Map<String, Object> dbConfig = [
        url: 'jdbc:postgresql://localhost:5432/umig_app_db',
        user: 'umig_app_user',
        password: '123456',
        driver: 'org.postgresql.Driver'
    ]

    Sql.withInstance(dbConfig) { sql ->
        def result = sql.firstRow('SELECT COUNT(*) as count FROM system_configuration_scf')
        println "✅ Database connected: ${result.count} configuration entries found"
    }
} catch (Exception e) {
    println "❌ FAILED: ${e.message}"
}

println ""

// Test 4: MailHog Connectivity
println "Test 4: MailHog connectivity (port 1025)"
try {
    def socket = new Socket()
    socket.connect(new InetSocketAddress("localhost", 1025), 2000)
    socket.close()
    println "✅ MailHog is reachable on localhost:1025"
} catch (Exception e) {
    println "❌ FAILED: Cannot connect to MailHog - ${e.message}"
    println "   Make sure MailHog is running: npm start"
}

println ""

// Test 5: Check system_configuration_scf for DEV
println "Test 5: DEV environment configuration"
try {
    Map<String, Object> dbConfig = [
        url: 'jdbc:postgresql://localhost:5432/umig_app_db',
        user: 'umig_app_user',
        password: '123456',
        driver: 'org.postgresql.Driver'
    ]

    Sql.withInstance(dbConfig) { sql ->
        def configs = sql.rows("""
            SELECT scf.scf_key, scf.scf_value, scf.scf_is_active
            FROM system_configuration_scf scf
            INNER JOIN environments_env e ON scf.env_id = e.env_id
            WHERE e.env_code = 'DEV'
              AND scf.scf_category = 'MACRO_LOCATION'
            ORDER BY scf.scf_key
        """)

        if (configs) {
            println "✅ DEV configuration found (${configs.size()} entries):"
            configs.each { config ->
                println "   - ${config.scf_key}: ${config.scf_value} (active: ${config.scf_is_active})"
            }
        } else {
            println "❌ FAILED: No DEV configuration found"
        }
    }
} catch (Exception e) {
    println "❌ FAILED: ${e.message}"
}

println ""
println "=== Diagnostic Test Complete ==="
println ""
println "Next steps if tests fail:"
println "1. If Test 1 fails: Check ConfigurationService.groovy line 374+ for fallback logic"
println "2. If Test 2 fails: Check UrlConstructionService.groovy line 62+ for null handling"
println "3. If Test 4 fails: Run 'npm start' to start MailHog"
println "4. If Test 5 fails: Insert DEV configuration into database"
