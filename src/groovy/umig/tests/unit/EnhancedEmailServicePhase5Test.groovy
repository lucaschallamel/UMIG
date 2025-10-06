package umig.tests.unit

import umig.utils.EnhancedEmailService
import umig.tests.helpers.MailServerManagerMockHelper

/**
 * EnhancedEmailService Phase 5 Unit Tests (Local Execution Only)
 *
 * Tests EnhancedEmailService functionality using MOCKED MailServerManager.
 *
 * ⚠️ EXECUTION RESTRICTION:
 * - ✅ Local: groovy src/groovy/umig/tests/unit/EnhancedEmailServicePhase5Test.groovy (WORKS)
 * - ❌ ScriptRunner: DO NOT RUN - Will crash Confluence stack
 *
 * For ScriptRunner-safe testing, use:
 * @see EnhancedEmailServiceMailHogTest (no mocking, real SMTP)
 *
 * COVERAGE:
 * - SMTP health check with various mock configurations
 * - Enhanced health check structure
 * - Mock injection and cleanup
 * - Error handling with different SMTP states
 *
 * US-098 Phase 5B: Validates MailServerManager API integration and ConfigurationService overrides
 *
 * Tests:
 * 1. MailServerManager mock injection
 * 2. SMTP health check with configured server
 * 3. SMTP health check without configured server
 * 4. Health check includes SMTP status
 * 5. ConfigurationService integration (verified via health check)
 *
 * @author UMIG Project Team
 * @since Sprint 8 - US-098 Phase 5B
 * @see MailServerManagerMockHelper (mock injection helper)
 */
class EnhancedEmailServicePhase5Tests {

    static int testsPassed = 0
    static int testsTotal = 0
    static List<String> errors = []

    static void runTest(String testName, Closure testClosure) {
        testsTotal++
        println "\nTEST ${testsTotal}: ${testName}"
        println "=" * 70

        try {
            testClosure()
            testsPassed++
            println "✅ PASSED: ${testName}"
        } catch (AssertionError e) {
            errors << "${testName}: ${e.message}".toString()
            println "❌ FAILED: ${testName}"
            println "   Error: ${e.message}"
            e.printStackTrace()
        } catch (Exception e) {
            errors << "${testName}: ${e.message}".toString()
            println "❌ FAILED: ${testName}"
            println "   Error: ${e.message}"
            e.printStackTrace()
        }
    }

    // ================================================================
    // TEST 1: checkSMTPHealth with configured server
    // ================================================================

    static void test1_SMTPHealthCheckWithConfiguredServer() {
        runTest("checkSMTPHealth with configured MailHog server") {
            // Setup: Mock MailServerManager with MailHog configuration
            def mockHelper = new MailServerManagerMockHelper()
            mockHelper.setupDefaultMailHogMock()
            mockHelper.injectIntoService()

            try {
                // Execute: Check SMTP health
                boolean isHealthy = EnhancedEmailService.checkSMTPHealth()

                // Verify: Health check returns true for configured server
                assert isHealthy == true, "SMTP health check should return true when server configured"
                println "✓ SMTP health check passed with configured server"

            } finally {
                // Cleanup
                mockHelper.cleanup()
            }
        }
    }

    // ================================================================
    // TEST 2: checkSMTPHealth without configured server
    // ================================================================

    static void test2_SMTPHealthCheckWithoutConfiguredServer() {
        runTest("checkSMTPHealth without configured server") {
            // Setup: Mock MailServerManager returning null
            def mockHelper = new MailServerManagerMockHelper()
            mockHelper.setupNullSmtpMock()
            mockHelper.injectIntoService()

            try {
                // Execute: Check SMTP health
                boolean isHealthy = EnhancedEmailService.checkSMTPHealth()

                // Verify: Health check returns false when no server configured
                assert isHealthy == false, "SMTP health check should return false when no server configured"
                println "✓ SMTP health check correctly reports unhealthy state"

            } finally {
                // Cleanup
                mockHelper.cleanup()
            }
        }
    }

    // ================================================================
    // TEST 3: healthCheck includes SMTP status (configured)
    // ================================================================

    static void test3_HealthCheckIncludesSMTPStatusConfigured() {
        runTest("healthCheck includes SMTP status when configured") {
            // Setup: Mock MailServerManager with MailHog configuration
            def mockHelper = new MailServerManagerMockHelper()
            mockHelper.setupDefaultMailHogMock()
            mockHelper.injectIntoService()

            try {
                // Execute: Get service health check
                Map health = EnhancedEmailService.healthCheck()

                // Verify: Health check includes SMTP information
                assert health['service'] == 'EnhancedEmailService', "Service name should be EnhancedEmailService"
                assert health['smtp'] != null, "Health check should include smtp section"
                assert health['smtp']['configured'] == true, "SMTP should be reported as configured"
                assert health['smtp']['mailServerManager'] == 'initialized', "MailServerManager should be initialized"
                assert health['capabilities']['smtpIntegration'] == true, "SMTP integration capability should be true"

                println "✓ Health check includes complete SMTP status:"
                println "  - configured: ${health['smtp']['configured']}"
                println "  - mailServerManager: ${health['smtp']['mailServerManager']}"
                println "  - smtpIntegration: ${health['capabilities']['smtpIntegration']}"

            } finally {
                // Cleanup
                mockHelper.cleanup()
            }
        }
    }

    // ================================================================
    // TEST 4: healthCheck includes SMTP status (not configured)
    // ================================================================

    static void test4_HealthCheckIncludesSMTPStatusNotConfigured() {
        runTest("healthCheck includes SMTP status when not configured") {
            // Setup: Mock MailServerManager returning null
            def mockHelper = new MailServerManagerMockHelper()
            mockHelper.setupNullSmtpMock()
            mockHelper.injectIntoService()

            try {
                // Execute: Get service health check
                Map health = EnhancedEmailService.healthCheck()

                // Verify: Health check reports degraded status when SMTP not configured
                assert health['status'] == 'degraded', "Service status should be degraded when SMTP not configured"
                assert health['smtp']['configured'] == false, "SMTP should be reported as not configured"
                assert health['capabilities']['smtpIntegration'] == false, "SMTP integration capability should be false"

                println "✓ Health check correctly reports degraded status:"
                println "  - status: ${health['status']}"
                println "  - smtp.configured: ${health['smtp']['configured']}"
                println "  - smtpIntegration: ${health['capabilities']['smtpIntegration']}"

            } finally {
                // Cleanup
                mockHelper.cleanup()
            }
        }
    }

    // ================================================================
    // TEST 5: MailServerManager mock helper validation
    // ================================================================

    static void test5_MailServerManagerMockHelperValidation() {
        runTest("MailServerManager mock helper creates valid mocks") {
            // Setup & Execute
            def mockHelper = new MailServerManagerMockHelper()
            mockHelper.setupDefaultMailHogMock()

            try {
                // Verify: Mock objects are created correctly
                assert mockHelper.mailServerManager != null, "MailServerManager mock should be created"
                assert mockHelper.smtpMailServer != null, "SMTPMailServer mock should be created"

                // Verify: Mock returns expected values
                def smtpServer = mockHelper.mailServerManager.getDefaultSMTPMailServer()
                assert smtpServer != null, "Mock should return SMTP server"
                assert smtpServer.getHostname() == 'localhost', "Hostname should be localhost"
                assert smtpServer.getPort() == 1025, "Port should be 1025"
                assert smtpServer.getUsername() == null, "Username should be null (no auth)"
                assert smtpServer.getDefaultFrom() == 'test@umig.local', "Default from should be test@umig.local"

                println "✓ Mock helper creates valid MailServerManager mock:"
                println "  - hostname: ${smtpServer.getHostname()}"
                println "  - port: ${smtpServer.getPort()}"
                println "  - auth: ${smtpServer.getUsername() ? 'enabled' : 'disabled'}"

            } finally {
                // Cleanup
                mockHelper.cleanup()
            }
        }
    }

    // ================================================================
    // TEST 6: Authenticated SMTP mock configuration
    // ================================================================

    static void test6_AuthenticatedSMTPMockConfiguration() {
        runTest("Authenticated SMTP mock configuration") {
            // Setup & Execute
            def mockHelper = new MailServerManagerMockHelper()
            mockHelper.setupAuthenticatedSmtpMock('smtp.company.com', 587, 'noreply', 'secretPassword123')

            try {
                // Verify: Mock returns authenticated configuration
                def smtpServer = mockHelper.mailServerManager.getDefaultSMTPMailServer()
                assert smtpServer.getHostname() == 'smtp.company.com', "Hostname should be smtp.company.com"
                assert smtpServer.getPort() == 587, "Port should be 587"
                assert smtpServer.getUsername() == 'noreply', "Username should be noreply"
                assert smtpServer.getPassword() == 'secretPassword123', "Password should be set"

                println "✓ Authenticated SMTP mock configured correctly:"
                println "  - hostname: ${smtpServer.getHostname()}"
                println "  - port: ${smtpServer.getPort()}"
                println "  - username: ${smtpServer.getUsername()}"
                println "  - auth: enabled"

            } finally {
                // Cleanup
                mockHelper.cleanup()
            }
        }
    }

    // ================================================================
    // Main Test Execution
    // ================================================================

    static void main(String[] args) {
        println "\n" + "=" * 70
        println "🧪 EnhancedEmailService Phase 5 Tests - MailServerManager Integration"
        println "=" * 70
        println "US-098 Phase 5B: Validates Confluence SMTP API integration\n"

        // Execute all tests
        test1_SMTPHealthCheckWithConfiguredServer()
        test2_SMTPHealthCheckWithoutConfiguredServer()
        test3_HealthCheckIncludesSMTPStatusConfigured()
        test4_HealthCheckIncludesSMTPStatusNotConfigured()
        test5_MailServerManagerMockHelperValidation()
        test6_AuthenticatedSMTPMockConfiguration()

        // Summary
        println "\n" + "=" * 70
        println "📊 TEST SUMMARY"
        println "=" * 70

        if (testsPassed == testsTotal) {
            println "✅ ALL TESTS PASSED (${testsPassed}/${testsTotal})"
            println "\n🎯 Phase 5 Validation Complete:"
            println "  ✓ MailServerManager integration validated"
            println "  ✓ SMTP health checks working"
            println "  ✓ Health endpoint includes SMTP status"
            println "  ✓ Mock helper functions correctly"
            println "\n🚀 READY FOR INTEGRATION TESTING"
        } else {
            println "❌ SOME TESTS FAILED (${testsPassed}/${testsTotal})"
            println "\nFailed tests:"
            errors.each { error ->
                println "  - ${error}"
            }
            System.exit(1)
        }
    }
}

// Auto-execute when run directly
EnhancedEmailServicePhase5Tests.main([] as String[])
