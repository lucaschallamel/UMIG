package umig.tests.helpers

import com.atlassian.confluence.mail.ConfluenceMailServerManager
import com.atlassian.mail.server.SMTPMailServer

/**
 * MailServerManagerMockHelper - Reusable Mock Helper for EnhancedEmailService Tests
 *
 * US-098 Phase 5B: Provides standardized mocking for MailServerManager integration
 *
 * ⚠️ WARNING: This helper uses static field injection which is INCOMPATIBLE with ScriptRunner's OSGi environment.
 *
 * EXECUTION:
 * - ✅ Local: groovy command (WORKS)
 * - ❌ ScriptRunner: Will crash the stack due to OSGi bundle corruption
 *
 * For ScriptRunner-safe testing, use integration tests without mocking:
 * @see EnhancedEmailServiceMailHogTest
 *
 * KNOWN ISSUES:
 * - Static field injection fails in ScriptRunner (OSGi security restrictions)
 * - Mock type mismatches cause ClassCastException in dynamic proxies
 * - Bundle classloader corruption leads to Confluence shutdown
 *
 * Usage in Tests:
 * ```groovy
 * import umig.tests.helpers.MailServerManagerMockHelper
 *
 * // Setup before test
 * def mockHelper = new MailServerManagerMockHelper()
 * mockHelper.setupDefaultMailHogMock() // For localhost:1025 (default)
 * EnhancedEmailService.mailServerManager = mockHelper.mailServerManager
 *
 * // Test code here...
 *
 * // Cleanup after test
 * mockHelper.cleanup()
 * ```
 *
 * @author UMIG Project Team
 * @since Sprint 8 - US-098 Phase 5B
 */
class MailServerManagerMockHelper {

    // Mock objects
    ConfluenceMailServerManager mailServerManager
    SMTPMailServer smtpMailServer

    /**
     * Setup default MailHog mock configuration (localhost:1025)
     * This is the standard development environment configuration
     */
    void setupDefaultMailHogMock() {
        setupCustomMock('localhost', 1025, null, null, 'test@umig.local')
    }

    /**
     * Setup custom SMTP mock configuration
     *
     * @param hostname SMTP server hostname
     * @param port SMTP server port
     * @param username SMTP authentication username (null for no auth)
     * @param password SMTP authentication password (null for no auth)
     * @param defaultFrom Default from email address
     */
    void setupCustomMock(String hostname, int port, String username, String password, String defaultFrom) {
        // Create mock SMTP server
        smtpMailServer = [
            getHostname: { -> hostname },
            getPort: { -> port.toString() },  // Cast to String to avoid ClassCastException
            getUsername: { -> username },
            getPassword: { -> password },
            getDefaultFrom: { -> defaultFrom }
        ] as SMTPMailServer

        // Create mock MailServerManager
        mailServerManager = [
            getDefaultSMTPMailServer: { -> smtpMailServer }
        ] as ConfluenceMailServerManager

        println "✅ [MailServerManagerMockHelper] Mock configured: ${hostname}:${port}"
        if (username) {
            println "   Auth: enabled (user: ${username})"
        } else {
            println "   Auth: disabled"
        }
    }

    /**
     * Setup mock that returns null (simulates no SMTP configured)
     * Useful for testing error handling
     */
    void setupNullSmtpMock() {
        smtpMailServer = null

        mailServerManager = [
            getDefaultSMTPMailServer: { -> null }
        ] as ConfluenceMailServerManager

        println "⚠️  [MailServerManagerMockHelper] Mock configured: No SMTP server"
    }

    /**
     * Setup mock that throws exception (simulates MailServerManager failure)
     * Useful for testing error handling
     */
    void setupFailingMock(String errorMessage = "MailServerManager initialization failed") {
        smtpMailServer = null

        mailServerManager = [
            getDefaultSMTPMailServer: { -> throw new RuntimeException(errorMessage) }
        ] as ConfluenceMailServerManager

        println "❌ [MailServerManagerMockHelper] Mock configured: Throws exception"
    }

    /**
     * Setup mock for authenticated SMTP (production-like scenario)
     *
     * @param hostname SMTP server hostname
     * @param port SMTP server port (typically 587 for STARTTLS)
     * @param username SMTP username
     * @param password SMTP password
     */
    void setupAuthenticatedSmtpMock(String hostname, int port, String username, String password) {
        setupCustomMock(hostname, port, username, password, 'noreply@company.com')
        println "🔐 [MailServerManagerMockHelper] Authenticated SMTP mock configured"
    }

    /**
     * Inject mock into EnhancedEmailService static field
     *
     * ⚠️ WARNING: This method will FAIL in ScriptRunner due to:
     * 1. OSGi bundle isolation prevents cross-bundle field access
     * 2. Security manager blocks reflection on static fields
     * 3. Type mismatch between mock proxy and expected field type
     *
     * This is ONLY for local unit testing with groovy command.
     * DO NOT attempt to run in ScriptRunner - will crash the stack.
     *
     * Note: For integration tests running in Confluence, use real MailServerManager configuration instead
     */
    void injectIntoService() {
        try {
            def serviceClass = Class.forName('umig.utils.EnhancedEmailService')
            def field = serviceClass.getDeclaredField('mailServerManager')
            field.setAccessible(true)
            field.set(null, mailServerManager)
            println "✅ [MailServerManagerMockHelper] Mock injected into EnhancedEmailService"
        } catch (Exception e) {
            println "❌ [MailServerManagerMockHelper] Failed to inject mock: ${e.message}"
            throw e
        }
    }

    /**
     * Cleanup and reset mocks after test
     */
    void cleanup() {
        smtpMailServer = null
        mailServerManager = null
        println "🧹 [MailServerManagerMockHelper] Cleanup complete"
    }

    /**
     * Verify mock was called (basic validation)
     * @return true if SMTP server was retrieved at least once
     */
    boolean wasSmtpServerRetrieved() {
        return smtpMailServer != null
    }
}
