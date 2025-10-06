package umig.tests.integration

import umig.utils.EnhancedEmailService
import com.atlassian.confluence.mail.ConfluenceMailServerManager
import com.atlassian.mail.server.SMTPMailServer
import com.atlassian.sal.api.component.ComponentLocator

/**
 * EnhancedEmailService Phase 5 Integration Tests (ScriptRunner-Safe)
 *
 * Tests EnhancedEmailService functionality with REAL Confluence SMTP configuration.
 * Unlike unit tests, this does NOT use mocking and is safe for ScriptRunner execution.
 *
 * PREREQUISITES:
 * - Confluence SMTP must be configured (Admin > General > Email Settings)
 * - In DEV environment, MailHog is expected at localhost:1025
 * - In UAT/PROD, real SMTP server should be configured
 *
 * EXECUTION:
 * - ScriptRunner: Execute in ScriptRunner console (SAFE - NO MOCKING)
 * - Local: groovy src/groovy/umig/tests/integration/EnhancedEmailServicePhase5IntegrationTest.groovy
 * - npm: npm run test:groovy:integration
 *
 * COVERAGE:
 * - SMTP health check with real configuration
 * - Enhanced health check structure validation
 * - MailServerManager integration verification
 * - ConfigurationService integration (if applicable)
 * - Graceful degradation when SMTP not configured
 *
 * US-098 PHASE 5 REQUIREMENTS:
 * - Validates ConfluenceMailServerManager API integration
 * - Tests checkSMTPHealth() method with real configuration
 * - Validates healthCheck() includes SMTP status
 * - Ensures graceful handling of missing SMTP configuration
 * - Verifies service status transitions (healthy/degraded)
 *
 * @author UMIG Project Team
 * @since Sprint 8 - US-098 Phase 5B
 * @see EnhancedEmailService
 * @see EnhancedEmailServiceMailHogTest (pattern reference)
 * @see EnhancedEmailServicePhase5Test (unit test reference)
 */

println "=" * 80
println "EnhancedEmailService Phase 5 Integration Tests (ScriptRunner-Safe)"
println "=" * 80
println "US-098 Phase 5B: MailServerManager Integration Validation"
println "Started at: ${new Date()}"
println ""
println "🔍 Test Environment:"
println "  - Execution Mode: ScriptRunner/Integration (NO MOCKING)"
println "  - SMTP Source: Real Confluence configuration"
println "  - Expected Config: MailHog (DEV) or Production SMTP"
println ""

// Test counters and results
@groovy.transform.Field int testsPassed = 0
@groovy.transform.Field int testsTotal = 0
@groovy.transform.Field List<Map<String, String>> errors = []

// Total test count for progress display (declared as @Field for script-level access)
@groovy.transform.Field int TOTAL_TESTS = 5

/**
 * Self-contained test execution helper
 * Pattern from EnhancedEmailServiceMailHogTest
 */
def runTest(String testName, Closure testLogic) {
    testsTotal++
    println "\n[TEST ${testsTotal}/${TOTAL_TESTS}] ${testName}"
    println "=" * 80

    try {
        testLogic()
        testsPassed++
        println "✅ PASSED - ${testName}"
    } catch (AssertionError e) {
        errors << ([test: testName, error: e.message] as Map<String, String>)
        println "❌ FAILED - ${testName}"
        println "   Assertion Error: ${e.message}"
        if (e.metaClass.respondsTo(e, 'printStackTrace')) {
            e.printStackTrace()
        }
    } catch (Exception e) {
        errors << ([test: testName, error: e.message] as Map<String, String>)
        println "❌ FAILED - ${testName}"
        println "   Exception: ${e.message}"
        if (e.metaClass.respondsTo(e, 'printStackTrace')) {
            e.printStackTrace()
        }
    }
}

// ================================================================
// TEST 1: MailServerManager Availability and Integration
// ================================================================

runTest("MailServerManager Integration and Availability") {
    println "Testing real Confluence MailServerManager integration..."

    // Attempt to get MailServerManager directly (same as service does)
    ConfluenceMailServerManager manager = null
    try {
        manager = ComponentLocator.getComponent(ConfluenceMailServerManager.class) as ConfluenceMailServerManager
        assert manager != null, "MailServerManager should be available via ComponentLocator"
        println "✓ MailServerManager successfully retrieved from ComponentLocator"
    } catch (Exception e) {
        println "⚠️  MailServerManager not available: ${e.message}"
        println "   This is expected if not running in Confluence/ScriptRunner environment"
        throw new AssertionError("MailServerManager not available - test requires Confluence environment")
    }

    // Verify MailServerManager is accessible
    assert manager.metaClass.respondsTo(manager, 'getDefaultSMTPMailServer'),
        "MailServerManager should have getDefaultSMTPMailServer() method"
    println "✓ MailServerManager API methods are accessible"

    // Try to get SMTP configuration
    SMTPMailServer smtpServer = manager.getDefaultSMTPMailServer()
    if (smtpServer) {
        println "✓ SMTP server configuration found:"
        println "  - Hostname: ${smtpServer.getHostname()}"
        println "  - Port: ${smtpServer.getPort()}"
        println "  - From: ${smtpServer.getDefaultFrom() ?: 'not set'}"
        println "  - Auth: ${smtpServer.getUsername() ? 'enabled' : 'disabled'}"
    } else {
        println "⚠️  No SMTP server configured in Confluence"
        println "   Tests will validate graceful degradation"
    }
}

// ================================================================
// TEST 2: SMTP Health Check with Real Configuration
// ================================================================

runTest("SMTP Health Check with Real Confluence Configuration") {
    println "Testing checkSMTPHealth() with real SMTP configuration..."

    // Execute health check
    boolean isHealthy = EnhancedEmailService.checkSMTPHealth()

    // Validate return type
    assert isHealthy instanceof Boolean, "checkSMTPHealth() should return boolean"
    println "✓ checkSMTPHealth() returned: ${isHealthy}"

    // Get actual SMTP configuration to validate result
    try {
        ConfluenceMailServerManager manager = ComponentLocator.getComponent(ConfluenceMailServerManager.class) as ConfluenceMailServerManager
        SMTPMailServer smtpServer = manager?.getDefaultSMTPMailServer()

        if (smtpServer) {
            assert isHealthy == true, "checkSMTPHealth() should return true when SMTP configured"
            println "✓ Health check correctly reports healthy status (SMTP configured)"
        } else {
            assert isHealthy == false, "checkSMTPHealth() should return false when SMTP not configured"
            println "✓ Health check correctly reports unhealthy status (SMTP not configured)"
        }
    } catch (Exception e) {
        println "⚠️  Could not verify SMTP configuration: ${e.message}"
        println "   Health check result: ${isHealthy}"
    }
}

// ================================================================
// TEST 3: Enhanced Health Check Structure
// ================================================================

runTest("Enhanced Health Check Returns Complete Structure") {
    println "Testing healthCheck() returns proper structure..."

    // Execute enhanced health check
    Map<String, Object> health = EnhancedEmailService.healthCheck()

    // Validate required top-level keys
    assert health.containsKey('service'), "Health check should include 'service' key"
    assert health.containsKey('status'), "Health check should include 'status' key"
    assert health.containsKey('smtp'), "Health check should include 'smtp' section"
    assert health.containsKey('timestamp'), "Health check should include 'timestamp' key"

    println "✓ Health check includes all required keys"

    // Validate service name
    assert health['service'] == 'EnhancedEmailService', "Service should be 'EnhancedEmailService'"
    println "✓ Service name correct: ${health['service']}"

    // Validate status values
    String status = health['status'] as String
    assert status in ['healthy', 'degraded'], "Status should be 'healthy' or 'degraded'"
    println "✓ Service status: ${status}"

    // Validate SMTP section structure
    Map<String, Object> smtp = health['smtp'] as Map<String, Object>
    assert smtp.containsKey('configured'), "SMTP section should include 'configured' key"
    assert smtp.containsKey('mailServerManager'), "SMTP section should include 'mailServerManager' key"

    Boolean smtpConfigured = smtp['configured'] as Boolean
    String managerStatus = smtp['mailServerManager'] as String

    println "✓ SMTP section structure:"
    println "  - configured: ${smtpConfigured}"
    println "  - mailServerManager: ${managerStatus}"

    // Validate consistency between status and SMTP configuration
    if (smtpConfigured) {
        assert managerStatus == 'initialized', "MailServerManager should be 'initialized' when SMTP configured"
        println "✓ MailServerManager properly initialized"
    } else {
        println "⚠️  SMTP not configured - testing degraded state handling"
    }

    // Display full health check for verification
    println "\n📊 Complete Health Check Response:"
    health.each { key, value ->
        if (value instanceof Map) {
            println "  ${key}:"
            (value as Map).each { subKey, subValue ->
                println "    - ${subKey}: ${subValue}"
            }
        } else {
            println "  ${key}: ${value}"
        }
    }
}

// ================================================================
// TEST 4: Service Status Transitions (healthy/degraded)
// ================================================================

runTest("Service Status Transitions Based on SMTP Configuration") {
    println "Testing service status reflects SMTP configuration state..."

    // Get current health status
    Map<String, Object> health = EnhancedEmailService.healthCheck()
    String status = health['status'] as String
    Map<String, Object> smtp = health['smtp'] as Map<String, Object>
    Boolean smtpConfigured = smtp['configured'] as Boolean

    println "Current service state:"
    println "  - Status: ${status}"
    println "  - SMTP Configured: ${smtpConfigured}"

    // Check if urlConstruction affects status
    if (health.containsKey('urlConstruction')) {
        Map<String, Object> urlHealth = health['urlConstruction'] as Map<String, Object>
        String urlStatus = urlHealth['status'] as String
        println "  - URL Construction: ${urlStatus}"

        // Status should be healthy only if both SMTP and URL construction are healthy
        if (smtpConfigured && urlStatus == 'healthy') {
            assert status == 'healthy', "Service should be 'healthy' when both SMTP and URL construction are healthy"
            println "✓ Service correctly reports 'healthy' status"
        } else {
            assert status == 'degraded', "Service should be 'degraded' when SMTP or URL construction has issues"
            println "✓ Service correctly reports 'degraded' status"
        }
    } else {
        // If no URL construction info, status depends only on SMTP
        if (smtpConfigured) {
            println "✓ Service status reflects SMTP availability"
        } else {
            assert status == 'degraded', "Service should be 'degraded' when SMTP not configured"
            println "✓ Service correctly degrades when SMTP unavailable"
        }
    }

    // Validate capabilities section if present
    if (health.containsKey('capabilities')) {
        Map<String, Object> capabilities = health['capabilities'] as Map<String, Object>

        if (capabilities.containsKey('smtpIntegration')) {
            Boolean smtpIntegration = capabilities['smtpIntegration'] as Boolean
            assert smtpIntegration == smtpConfigured,
                "smtpIntegration capability should match SMTP configured state"
            println "✓ SMTP integration capability correctly reflects configuration: ${smtpIntegration}"
        }
    }
}

// ================================================================
// TEST 5: Graceful Degradation and Error Handling
// ================================================================

runTest("Graceful Degradation When SMTP Not Configured") {
    println "Testing service handles missing SMTP configuration gracefully..."

    // This test validates the service doesn't crash when SMTP is unavailable
    boolean testPassed = false

    try {
        // Call health check - should never throw exception
        Map<String, Object> health = EnhancedEmailService.healthCheck()
        assert health != null, "Health check should return a map even if SMTP unavailable"
        println "✓ Health check executes without exceptions"

        // Call SMTP health check - should return boolean, never throw
        boolean smtpHealthy = EnhancedEmailService.checkSMTPHealth()
        assert smtpHealthy instanceof Boolean, "checkSMTPHealth() should return boolean"
        println "✓ SMTP health check returns boolean: ${smtpHealthy}"

        // Verify status reporting
        String status = health['status'] as String
        Map<String, Object> smtp = health['smtp'] as Map<String, Object>
        String managerStatus = smtp['mailServerManager'] as String

        println "✓ Service reports status transparently:"
        println "  - Overall status: ${status}"
        println "  - MailServerManager: ${managerStatus}"

        // If SMTP not configured, verify degraded state is properly communicated
        if (managerStatus != 'initialized') {
            assert status == 'degraded', "Service should report degraded when MailServerManager unavailable"
            println "✓ Degraded status correctly reported for unavailable SMTP"
        }

        testPassed = true

    } catch (Exception e) {
        println "❌ Service threw exception instead of degrading gracefully: ${e.message}"
        throw new AssertionError("Service should handle missing SMTP gracefully, not throw exceptions")
    }

    assert testPassed, "Graceful degradation test should complete successfully"
    println "✓ Service demonstrates graceful degradation"
}

// ================================================================
// Print Summary
// ================================================================

println "\n" + "=" * 80
println "TEST SUMMARY"
println "=" * 80

println "Total Tests: ${testsTotal}"
println "Passed: ${testsPassed}"
println "Failed: ${testsTotal - testsPassed}"

if (testsTotal > 0) {
    double successRate = ((double) testsPassed / (double) testsTotal) * 100.0
    println "Success Rate: ${String.format('%.2f', successRate)}%"
}

println "=" * 80

if (errors.size() > 0) {
    println "\n❌ Failed Tests:"
    errors.each { Map<String, String> error ->
        println "  - ${error.get('test')}"
        println "    Error: ${error.get('error')}"
    }
    println ""
}

if (testsPassed == testsTotal) {
    println "\n🎉 ALL TESTS PASSED!"
    println "\n🎯 Phase 5 Integration Validation Complete:"
    println "  ✓ MailServerManager integration working correctly"
    println "  ✓ SMTP health checks functional with real configuration"
    println "  ✓ Health endpoint includes complete SMTP status"
    println "  ✓ Service status transitions properly (healthy/degraded)"
    println "  ✓ Graceful degradation when SMTP not configured"
    println "\n🚀 READY FOR PRODUCTION USE"
} else {
    println "\n⚠️  SOME TESTS FAILED"
    println "Review errors above and verify:"
    println "  - Confluence SMTP is configured (Admin > Email Settings)"
    println "  - MailHog is running (DEV): localhost:1025"
    println "  - Test is running in Confluence/ScriptRunner environment"
    println "  - ConfluenceMailServerManager is accessible"
}

println "\nTest completed at: ${new Date()}"
println "=" * 80

// Return results for programmatic access
return [
    testsTotal: testsTotal,
    testsPassed: testsPassed,
    testsFailed: testsTotal - testsPassed,
    successRate: testsTotal > 0 ? ((double) testsPassed / (double) testsTotal) * 100.0 : 0.0,
    errors: errors,
    summary: "EnhancedEmailService Phase 5 integration test completed with ${testsPassed}/${testsTotal} tests passing"
]
