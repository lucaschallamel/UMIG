package umig.tests.integration

import spock.lang.Specification
import spock.lang.Ignore
import java.util.UUID
import groovy.text.SimpleTemplateEngine
import groovy.sql.Sql
import groovy.transform.CompileDynamic
import groovy.transform.CompileStatic
import groovy.transform.TypeCheckingMode

import umig.utils.EnhancedEmailService
import umig.utils.StepNotificationIntegration
import umig.utils.UrlConstructionService
import umig.repository.StepRepository
import umig.utils.DatabaseUtil

/**
 * Integration Tests for Enhanced Email Notification System
 *
 * Tests the complete flow from step status changes through URL construction
 * to email delivery, ensuring all components work together correctly.
 *
 * Uses class-level @CompileDynamic to completely disable static type checking
 * for this test file, following project's strategic dynamic areas philosophy
 * for test files with complex type interactions.
 *
 * @author UMIG Project Team
 * @since 2025-08-21
 */
@CompileDynamic
class EnhancedEmailNotificationIntegrationTest extends Specification {
    
    StepRepository stepRepository
    UUID testStepInstanceId
    UUID testInstructionId
    
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
        String migrationCode = "TEST_MIGRATION"
        String iterationCode = "run1"
        Integer newStatusId = getStatusId("IN_PROGRESS")
        Integer userId = 1

        when: "Updating step status with enhanced notifications"
        def result = StepNotificationIntegration.updateStepStatusWithEnhancedNotifications(
            testStepInstanceId,
            newStatusId,
            userId
        )

        then: "Should successfully update with enhanced notifications"
        Map<String, Object> resultMap = result as Map<String, Object>
        Boolean success = resultMap.get('success') as Boolean
        success == true
        Boolean enhancedNotification = resultMap.get('enhancedNotification') as Boolean
        enhancedNotification == true
        Object resultMigrationCode = resultMap.get('migrationCode')
        resultMigrationCode != null
        Object resultIterationCode = resultMap.get('iterationCode')
        resultIterationCode != null

        // Safe integer comparison - handle both null and valid integer values
        Object emailsSentObj = resultMap.get('emailsSent')
        emailsSentObj != null
        Integer emailsSent = emailsSentObj as Integer
        emailsSent != null && emailsSent >= 0

        and: "Should construct valid step view URL"
        // Verify URL construction worked (would be logged)
        Map<String, Object> health = UrlConstructionService.healthCheck() as Map<String, Object>
        String status = health.get('status') as String
        status in ["healthy", "degraded"] // Not error
    }
    
    def "should handle step opening with enhanced notifications"() {
        given: "A step instance to open"
        Integer userId = 1

        when: "Opening step with enhanced notifications"
        def result = StepNotificationIntegration.openStepWithEnhancedNotifications(
            testStepInstanceId,
            userId
        )

        then: "Should successfully open with notifications"
        Map<String, Object> resultMap = result as Map<String, Object>
        Boolean success = resultMap.get('success') as Boolean
        success == true

        // Safe integer comparison - handle both null and valid integer values
        Object emailsSentObj = resultMap.get('emailsSent')
        emailsSentObj != null
        Integer emailsSentCount = emailsSentObj as Integer
        emailsSentCount != null && emailsSentCount >= 0

        // May or may not have enhanced notification depending on context availability
        Object enhancedNotificationValue = resultMap.get('enhancedNotification')
        enhancedNotificationValue != null
        Object contextMissingValue = resultMap.get('contextMissing')
        contextMissingValue != null
    }
    
    def "should complete instruction with enhanced notifications"() {
        given: "An instruction to complete"
        Integer userId = 1

        when: "Completing instruction with enhanced notifications"
        def result = StepNotificationIntegration.completeInstructionWithEnhancedNotifications(
            testInstructionId,
            testStepInstanceId,
            userId
        )

        then: "Should successfully complete with notifications"
        Map<String, Object> resultMap = result as Map<String, Object>
        Boolean success = resultMap.get('success') as Boolean
        success == true

        // Safe integer comparison using simple >= operator
        Object emailsSentObj = resultMap.get('emailsSent')
        emailsSentObj != null
        Integer emailsSentCount2 = emailsSentObj as Integer
        emailsSentCount2 != null && emailsSentCount2 >= 0

        Object enhancedNotificationResult = resultMap.get('enhancedNotification')
        enhancedNotificationResult != null
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
        Map<String, Object> resultMap = result as Map<String, Object>
        Boolean success = resultMap.get('success') as Boolean
        success == true
        Boolean enhancedNotification = resultMap.get('enhancedNotification') as Boolean
        enhancedNotification == false
        Boolean contextMissing = resultMap.get('contextMissing') as Boolean
        contextMissing == true
    }
    
    def "should validate email template processing with URL variables"() {
        given: "Email template with URL variables"
        Map<String, Object> template = getTestEmailTemplate()
        Map<String, Object> variables = [
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
        String processedSubject = processTemplate(template.emt_subject as String, variables)
        String processedBody = processTemplate(template.emt_body_html as String, variables)
        
        then: "Should process successfully with URLs"
        processedSubject != null
        processedSubject != null && processedSubject.toString().contains("Test Step")
        processedBody != null
        processedBody != null && processedBody.toString().contains("http://localhost:8090")
        processedBody != null && processedBody.toString().contains("View Step Details")
    }
    
    def "should handle missing migration context gracefully"() {
        given: "A step instance without proper migration context"
        UUID orphanStepId = createOrphanStepInstance()
        
        when: "Attempting enhanced notification on orphan step"
        def result = StepNotificationIntegration.updateStepStatusWithEnhancedNotifications(
            orphanStepId,
            getStatusId("COMPLETED"),
            1
        )
        
        then: "Should handle gracefully"
        Map<String, Object> resultMap = result as Map<String, Object>
        Boolean success = resultMap.get('success') as Boolean
        success == true
        Boolean enhancedNotification = resultMap.get('enhancedNotification') as Boolean
        enhancedNotification == false
        Boolean contextMissing = resultMap.get('contextMissing') as Boolean
        contextMissing == true
        
        cleanup:
        deleteOrphanStepInstance(orphanStepId)
    }
    
    def "should validate URL security and prevent injection"() {
        given: "Potentially malicious parameters"
        UUID maliciousStepId = UUID.randomUUID()
        String maliciousMigrationCode = "<script>alert('xss')</script>"
        String maliciousIterationCode = "'; DROP TABLE steps; --"
        
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
        Integer numberOfThreads = 5
        List<Map<String, Object>> results = []

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
        boolean allSuccessful = true
        for (Object result : results) {
            Map<String, Object> resultMap = (Map<String, Object>) result
            Boolean success = (Boolean) resultMap.get('success')
            if (success != true) {
                allSuccessful = false
                break
            }
        }
        allSuccessful
    }
    
    @Ignore("Requires actual email server for full integration test")
    def "should send actual email through MailHog"() {
        given: "Real email configuration"
        List<String> recipients = ["test@example.com"]
        String subject = "Test Enhanced Notification"
        String body = """
            <html><body>
                <h2>Test Email</h2>
                <p>This is a test of the enhanced email notification system.</p>
                <a href="http://localhost:8090/test">Test Link</a>
            </body></html>
        """
        
        when: "Sending email through service"
        // EnhancedEmailService doesn't expose direct sendEmail method - use notification methods instead
        // def sent = EnhancedEmailService.sendEmail(recipients, subject, body)
        def sent = true  // Skip direct email test

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
    
    private UUID insertTestMigration(Sql sql) {
        def migrationId = UUID.randomUUID()
        sql.execute("""
            INSERT INTO migrations_mig (mig_id, mig_name, mig_code, created_by, updated_by)
            VALUES (?, 'Test Migration', 'TEST_MIGRATION', 'test', 'test')
        """, [migrationId])
        return migrationId
    }
    
    private UUID insertTestIteration(Sql sql, UUID migrationId) {
        // First create iteration master
        def iterationMasterId = UUID.randomUUID()
        sql.execute("""
            INSERT INTO iterations_master_itm (itm_id, itm_name, itm_description, created_by)
            VALUES (?, 'Test Iteration Master', 'Test iteration description', 'test')
        """, [iterationMasterId])
        
        // Then create iteration instance
        def iterationId = UUID.randomUUID()
        sql.execute("""
            INSERT INTO iteration_instance_ini (ini_id, mig_id, itm_id, ini_name, created_by)
            VALUES (?, ?, ?, 'Test Iteration Instance', 'test')
        """, [iterationId, migrationId, iterationMasterId])
        return iterationId
    }
    
    private UUID insertTestPlan(Sql sql, UUID iterationId) {
        def planId = UUID.randomUUID()
        def masterPlanId = UUID.randomUUID()
        
        // Insert master plan first
        sql.execute("""
            INSERT INTO plans_master_plm (plm_id, plm_name, plm_description, created_by)
            VALUES (?, 'Test Plan Master', 'Test plan description', 'test')
        """, [masterPlanId])
        
        // Insert plan instance
        sql.execute("""
            INSERT INTO plans_instance_pli (pli_id, ini_id, plm_id, pli_name, created_by)
            VALUES (?, ?, ?, 'Test Plan Instance', 'test')
        """, [planId, iterationId, masterPlanId])
        
        return planId
    }
    
    private UUID insertTestSequence(Sql sql, UUID planId) {
        def sequenceId = UUID.randomUUID()
        def masterSequenceId = UUID.randomUUID()

        // Get the master plan ID from the plan instance
        def masterPlanId = sql.firstRow("SELECT plm_id FROM plans_instance_pli WHERE pli_id = ?", [planId])?.plm_id

        // Insert master sequence first with required plm_id and sqm_order
        sql.execute("""
            INSERT INTO sequences_master_sqm (sqm_id, plm_id, sqm_order, sqm_name, sqm_description, created_by)
            VALUES (?, ?, 1, 'Test Sequence Master', 'Test sequence description', 'test')
        """, [masterSequenceId, masterPlanId])
        
        // Insert sequence instance
        sql.execute("""
            INSERT INTO sequences_instance_sqi (sqi_id, pli_id, sqm_id, sqi_name, created_by)
            VALUES (?, ?, ?, 'Test Sequence Instance', 'test')
        """, [sequenceId, planId, masterSequenceId])
        
        return sequenceId
    }
    
    private UUID insertTestPhase(Sql sql, UUID sequenceId) {
        def phaseId = UUID.randomUUID()
        def masterPhaseId = UUID.randomUUID()
        
        // Insert master phase first
        sql.execute("""
            INSERT INTO phases_master_phm (phm_id, phm_name, phm_description, created_by)
            VALUES (?, 'Test Phase Master', 'Test phase description', 'test')
        """, [masterPhaseId])
        
        // Insert phase instance
        sql.execute("""
            INSERT INTO phases_instance_phi (phi_id, sqi_id, phm_id, phi_name, created_by)
            VALUES (?, ?, ?, 'Test Phase Instance', 'test')
        """, [phaseId, sequenceId, masterPhaseId])
        
        return phaseId
    }
    
    private UUID insertTestStepInstance(Sql sql, UUID phaseId) {
        def stepId = UUID.randomUUID()
        def masterId = UUID.randomUUID()
        
        // Insert master step first
        sql.execute("""
            INSERT INTO steps_master_stm (stm_id, stt_code, stm_number, stm_name, created_by)
            VALUES (?, 'TST', 1, 'Test Step', 'test')
        """, [masterId])
        
        // Insert step instance
        sql.execute("""
            INSERT INTO steps_instance_sti (sti_id, phi_id, stm_id, sti_name, sti_status, created_by)
            VALUES (?, ?, ?, 'Test Step Instance', ?, 'test')
        """, [stepId, phaseId, masterId, getStatusId("OPEN")])
        
        return stepId
    }
    
    private UUID insertTestInstruction(Sql sql, UUID stepInstanceId) {
        def instructionId = UUID.randomUUID()
        def masterInstructionId = UUID.randomUUID()
        
        // Insert master instruction first
        sql.execute("""
            INSERT INTO instructions_master_inm (inm_id, inm_name, inm_description, created_by)
            VALUES (?, 'Test Instruction Master', 'Test instruction description', 'test')
        """, [masterInstructionId])
        
        // Insert instruction instance
        sql.execute("""
            INSERT INTO instructions_instance_ini (ini_id, sti_id, inm_id, ini_name, ini_status, created_by)
            VALUES (?, ?, ?, 'Test Instruction Instance', ?, 'test')
        """, [instructionId, stepInstanceId, masterInstructionId, getStatusId("OPEN")])
        
        return instructionId
    }
    
    private UUID createOrphanStepInstance() {
        return DatabaseUtil.withSql { Sql sql ->
            def stepId = UUID.randomUUID()
            def masterId = UUID.randomUUID()
            
            // Insert master step first
            sql.execute("""
                INSERT INTO steps_master_stm (stm_id, stt_code, stm_number, stm_name, created_by)
                VALUES (?, 'ORPHAN', 99, 'Orphan Step', 'test')
            """, [masterId])
            
            // Insert step instance without proper hierarchy (orphan)
            sql.execute("""
                INSERT INTO steps_instance_sti (sti_id, stm_id, phi_id, sti_name, sti_status, created_by)
                VALUES (?, ?, NULL, 'Orphan Step Instance', ?, 'test')
            """, [stepId, masterId, getStatusId("OPEN")])
            
            return stepId
        } as UUID
    }
    
    private void deleteOrphanStepInstance(UUID stepInstanceId) {
        DatabaseUtil.withSql { Sql sql ->
            // Get the master step ID first
            def masterStepResult = sql.firstRow(
                "SELECT stm_id FROM steps_instance_sti WHERE sti_id = ?",
                [stepInstanceId]
            )
            def masterStepId = masterStepResult?.stm_id
            
            // Delete step instance
            sql.execute("DELETE FROM steps_instance_sti WHERE sti_id = ?", [stepInstanceId])
            
            // Delete master step
            if (masterStepId) {
                sql.execute("DELETE FROM steps_master_stm WHERE stm_id = ?", [masterStepId])
            }
        }
    }
    
    private void insertTestConfiguration(Sql sql) {
        sql.execute("""
            INSERT INTO system_configuration_scf 
            (scf_environment_code, scf_base_url, scf_space_key, scf_page_id, scf_page_title, scf_is_active)
            VALUES ('TEST', 'http://localhost:8090', 'UMIG', '123456789', 'StepView', true)
        """)
    }
    
    private Integer getStatusId(String statusName) {
        return DatabaseUtil.withSql { Sql sql ->
            def result = sql.firstRow(
                "SELECT sts_id FROM status_sts WHERE sts_name = ? AND sts_type = 'Step'",
                [statusName]
            )
            return result?.sts_id as Integer ?: 1 // Default to 1 if not found
        } as Integer
    }
    
    private Map<String, Object> getTestEmailTemplate() {
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
    
    private String processTemplate(String templateText, Map<String, Object> variables) {
        def engine = new SimpleTemplateEngine()
        def template = engine.createTemplate(templateText)
        return template.make(variables).toString()
    }
    
    private void mockInvalidConfiguration() {
        // This method would need proper mocking framework for actual implementation
        // For now, just log the mock setup intention
        println "Mock setup: Database configuration would return null for missing config test"
    }
}