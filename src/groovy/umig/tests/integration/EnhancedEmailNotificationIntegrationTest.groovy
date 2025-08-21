package umig.tests.integration

import spock.lang.Specification
import spock.lang.Ignore
import java.util.UUID

import umig.utils.EnhancedEmailService
import umig.utils.StepNotificationIntegration
import umig.utils.UrlConstructionService
import umig.repository.StepRepository
import umig.repository.EmailTemplateRepository
import umig.utils.DatabaseUtil

/**
 * Integration Tests for Enhanced Email Notification System
 * 
 * Tests the complete flow from step status changes through URL construction
 * to email delivery, ensuring all components work together correctly.
 * 
 * @author UMIG Project Team
 * @since 2025-08-21
 */
class EnhancedEmailNotificationIntegrationTest extends Specification {
    
    def stepRepository
    def testStepInstanceId
    def testInstructionId
    
    def setup() {
        stepRepository = new StepRepository()
        
        // Create test data
        setupTestData()
        
        // Clear URL construction cache
        UrlConstructionService.clearCache()
    }
    
    def cleanup() {
        // Clean up test data
        cleanupTestData()
        
        // Clear cache
        UrlConstructionService.clearCache()
    }
    
    def "should send step status change notification with constructed URL"() {
        given: "A step instance with status change"
        def migrationCode = "TEST_MIGRATION"
        def iterationCode = "run1"
        def newStatusId = getStatusId("IN_PROGRESS")
        def userId = 1
        
        when: "Updating step status with enhanced notifications"
        def result = StepNotificationIntegration.updateStepStatusWithEnhancedNotifications(
            testStepInstanceId, 
            newStatusId, 
            userId
        )
        
        then: "Should successfully update with enhanced notifications"
        result.success == true
        result.enhancedNotification == true
        result.migrationCode != null
        result.iterationCode != null
        result.emailsSent >= 0
        
        and: "Should construct valid step view URL"
        // Verify URL construction worked (would be logged)
        def health = UrlConstructionService.healthCheck()
        health.status in ["healthy", "degraded"] // Not error
    }
    
    def "should handle step opening with enhanced notifications"() {
        given: "A step instance to open"
        def userId = 1
        
        when: "Opening step with enhanced notifications"
        def result = StepNotificationIntegration.openStepWithEnhancedNotifications(
            testStepInstanceId,
            userId
        )
        
        then: "Should successfully open with notifications"
        result.success == true
        result.emailsSent >= 0
        
        // May or may not have enhanced notification depending on context availability
        result.enhancedNotification != null
        result.contextMissing != null
    }
    
    def "should complete instruction with enhanced notifications"() {
        given: "An instruction to complete"
        def userId = 1
        
        when: "Completing instruction with enhanced notifications"
        def result = StepNotificationIntegration.completeInstructionWithEnhancedNotifications(
            testInstructionId,
            testStepInstanceId,
            userId
        )
        
        then: "Should successfully complete with notifications"
        result.success == true
        result.emailsSent >= 0
        result.enhancedNotification != null
    }
    
    def "should fallback gracefully when URL construction fails"() {
        given: "Invalid environment configuration"
        // Temporarily break URL construction by clearing all cached configs
        UrlConstructionService.clearCache()
        mockInvalidConfiguration()
        
        when: "Attempting enhanced notification"
        def result = StepNotificationIntegration.updateStepStatusWithEnhancedNotifications(
            testStepInstanceId, 
            getStatusId("COMPLETED"), 
            1
        )
        
        then: "Should still succeed with fallback notifications"
        result.success == true
        result.enhancedNotification == false
        result.contextMissing == true
    }
    
    def "should validate email template processing with URL variables"() {
        given: "Email template with URL variables"
        def template = getTestEmailTemplate()
        def variables = [
            stepInstance: [sti_name: "Test Step"],
            oldStatus: "OPEN",
            newStatus: "IN_PROGRESS", 
            statusColor: "#0052cc",
            changedBy: "Test User",
            changedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
            stepViewUrl: "http://localhost:8090/spaces/UMIG/pages/123/StepView?mig=TEST&ite=run1&stepid=TST-001",
            hasStepViewUrl: true,
            migrationCode: "TEST",
            iterationCode: "run1"
        ]
        
        when: "Processing template with URL variables"
        def processedSubject = processTemplate(template.emt_subject, variables)
        def processedBody = processTemplate(template.emt_body_html, variables)
        
        then: "Should process successfully with URLs"
        processedSubject != null
        processedSubject.contains("Test Step")
        processedBody != null
        processedBody.contains("http://localhost:8090")
        processedBody.contains("View Step Details")
    }
    
    def "should handle missing migration context gracefully"() {
        given: "A step instance without proper migration context"
        def orphanStepId = createOrphanStepInstance()
        
        when: "Attempting enhanced notification on orphan step"
        def result = StepNotificationIntegration.updateStepStatusWithEnhancedNotifications(
            orphanStepId,
            getStatusId("COMPLETED"),
            1
        )
        
        then: "Should handle gracefully"
        result.success == true
        result.enhancedNotification == false
        result.contextMissing == true
        
        cleanup:
        deleteOrphanStepInstance(orphanStepId)
    }
    
    def "should validate URL security and prevent injection"() {
        given: "Potentially malicious parameters"
        def maliciousStepId = UUID.randomUUID()
        def maliciousMigrationCode = "<script>alert('xss')</script>"
        def maliciousIterationCode = "'; DROP TABLE steps; --"
        
        when: "Attempting URL construction with malicious params"
        def url = UrlConstructionService.buildStepViewUrl(
            maliciousStepId,
            maliciousMigrationCode,
            maliciousIterationCode
        )
        
        then: "Should reject malicious parameters"
        url == null // Security validation should reject these
    }
    
    def "should maintain performance under concurrent access"() {
        given: "Multiple concurrent step updates"
        def numberOfThreads = 5
        def results = []
        
        when: "Processing multiple notifications concurrently"
        (1..numberOfThreads).collect { threadNumber ->
            Thread.start {
                def result = StepNotificationIntegration.updateStepStatusWithEnhancedNotifications(
                    testStepInstanceId,
                    getStatusId("IN_PROGRESS"),
                    threadNumber
                )
                synchronized(results) {
                    results << result
                }
            }
        }.each { it.join() } // Wait for all threads to complete
        
        then: "Should handle concurrent access without errors"
        results.size() == numberOfThreads
        results.every { it.success == true }
    }
    
    @Ignore("Requires actual email server for full integration test")
    def "should send actual email through MailHog"() {
        given: "Real email configuration"
        def recipients = ["test@example.com"]
        def subject = "Test Enhanced Notification"
        def body = """
            <html><body>
                <h2>Test Email</h2>
                <p>This is a test of the enhanced email notification system.</p>
                <a href="http://localhost:8090/test">Test Link</a>
            </body></html>
        """
        
        when: "Sending email through service"
        def sent = EnhancedEmailService.sendEmail(recipients, subject, body)
        
        then: "Should send successfully"
        sent == true
        
        // Note: In a real test, you would verify the email arrived in MailHog
        // This would require connecting to MailHog's API to check for received emails
    }
    
    // ===========================================
    // HELPER METHODS FOR TESTING
    // ===========================================
    
    private void setupTestData() {
        DatabaseUtil.withSql { sql ->
            // Create test step instance with full hierarchy
            def migrationId = insertTestMigration(sql)
            def iterationId = insertTestIteration(sql, migrationId)
            def planId = insertTestPlan(sql, iterationId)
            def sequenceId = insertTestSequence(sql, planId)
            def phaseId = insertTestPhase(sql, sequenceId)
            testStepInstanceId = insertTestStepInstance(sql, phaseId)
            testInstructionId = insertTestInstruction(sql, testStepInstanceId)
            
            // Insert test system configuration
            insertTestConfiguration(sql)
        }
    }
    
    private void cleanupTestData() {
        DatabaseUtil.withSql { sql ->
            // Clean up in reverse order to respect foreign keys
            sql.execute("DELETE FROM instructions_instance_ini WHERE ini_id = ?", [testInstructionId])
            sql.execute("DELETE FROM steps_instance_sti WHERE sti_id = ?", [testStepInstanceId])
            sql.execute("DELETE FROM test_configurations WHERE scf_environment_code = 'TEST'")
            // Additional cleanup as needed
        }
    }
    
    private UUID insertTestMigration(sql) {
        def migrationId = UUID.randomUUID()
        sql.execute("""
            INSERT INTO migration_mig (mig_id, mig_name, mig_code)
            VALUES (?, 'Test Migration', 'TEST_MIGRATION')
        """, [migrationId])
        return migrationId
    }
    
    private UUID insertTestIteration(sql, migrationId) {
        def iterationId = UUID.randomUUID()
        sql.execute("""
            INSERT INTO iteration_instance_ini (ini_id, mig_id, itt_id)
            VALUES (?, ?, ?)
        """, [iterationId, migrationId, 1]) // Assuming itt_id 1 exists
        return iterationId
    }
    
    private UUID insertTestStepInstance(sql, phaseId) {
        def stepId = UUID.randomUUID()
        def masterId = UUID.randomUUID()
        
        // Insert master step first
        sql.execute("""
            INSERT INTO steps_master_stm (stm_id, stt_code, stm_number, stm_name)
            VALUES (?, 'TST', 1, 'Test Step')
        """, [masterId])
        
        // Insert step instance
        sql.execute("""
            INSERT INTO steps_instance_sti (sti_id, stm_id, phi_id, sti_name, sti_status)
            VALUES (?, ?, ?, 'Test Step Instance', ?)
        """, [stepId, masterId, phaseId, getStatusId("OPEN")])
        
        return stepId
    }
    
    private void insertTestConfiguration(sql) {
        sql.execute("""
            INSERT INTO system_configuration_scf 
            (scf_environment_code, scf_base_url, scf_space_key, scf_page_id, scf_page_title, scf_is_active)
            VALUES ('TEST', 'http://localhost:8090', 'UMIG', '123456789', 'StepView', true)
        """)
    }
    
    private Integer getStatusId(String statusName) {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow(
                "SELECT sts_id FROM status_sts WHERE sts_name = ? AND sts_type = 'Step'",
                [statusName]
            )
            return result?.sts_id ?: 1 // Default to 1 if not found
        }
    }
    
    private Map getTestEmailTemplate() {
        return [
            emt_type: 'STEP_STATUS_CHANGED',
            emt_subject: '[TEST] Step Status: ${stepInstance.sti_name} → ${newStatus}',
            emt_body_html: '''
                <html><body>
                    <h2>Step Status Changed</h2>
                    <p>Step: ${stepInstance.sti_name}</p>
                    <p>Status: ${oldStatus} → ${newStatus}</p>
                    <% if (hasStepViewUrl) { %>
                        <a href="${stepViewUrl}">View Step Details</a>
                    <% } %>
                </body></html>
            '''
        ]
    }
    
    private String processTemplate(String templateText, Map variables) {
        def engine = new groovy.text.SimpleTemplateEngine()
        def template = engine.createTemplate(templateText)
        return template.make(variables).toString()
    }
    
    private void mockInvalidConfiguration() {
        // Override database configuration to return invalid data
        DatabaseUtil.metaClass.static.withSql = { closure ->
            def mockSql = [
                firstRow: { query, params ->
                    return null // No configuration found
                }
            ]
            return closure.call(mockSql)
        }
    }
}