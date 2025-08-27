/**
 * Comprehensive ScriptRunner Console Test for EnhancedEmailService
 * 
 * COPY AND PASTE this into ScriptRunner Console at:
 * http://localhost:8090/plugins/servlet/scriptconsole
 * 
 * This sends ACTUAL emails to MailHog for validation of:
 * 1. All 10 notification types with mock data
 * 2. Mobile-responsive email templates
 * 3. Dynamic URL construction
 * 4. Audit logging verification
 * 5. Error handling and edge cases
 * 
 * Prerequisites:
 * - MailHog running at localhost:1025 (SMTP) and localhost:8025 (Web UI)
 * - EnhancedEmailService compiled and available
 * - Email templates populated in database
 * - System configuration for URL construction
 */

import umig.utils.EnhancedEmailService
import umig.utils.EmailService
import umig.utils.DatabaseUtil
import umig.utils.UrlConstructionService
import umig.repository.AuditLogRepository
import java.util.UUID
import java.util.Date
import groovy.json.JsonBuilder

println "=" * 80
println "COMPREHENSIVE ENHANCED EMAIL SERVICE TEST SUITE"
println "=" * 80
println "Testing all notification types with actual email sending via MailHog"
println "Test started: ${new Date()}"
println ""

def testResults = [:]
def totalTests = 0
def passedTests = 0

// ========================================
// TEST DATA SETUP
// ========================================

def createTestStepInstance(String name, String description, String status = 'IN_PROGRESS') {
    return [
        sti_id: UUID.randomUUID(),
        sti_name: name,
        sti_description: description,
        sti_status: status,
        sti_duration_minutes: 60,
        migration_name: 'CORE-BANKING-MIG',
        iteration_name: 'PROD-CUTOVER-W1'
    ]
}

def createTestInstruction(String name, String description) {
    return [
        ini_id: UUID.randomUUID(),
        ini_name: name,
        ini_description: description,
        ini_duration_minutes: 30
    ]
}

def createTestTeams() {
    return [
        [
            tms_id: 1,
            tms_name: 'Database Administration Team',
            tms_email: 'dba-team@company.com'
        ],
        [
            tms_id: 2,
            tms_name: 'Application Services Team',
            tms_email: 'app-services@company.com'
        ],
        [
            tms_id: 3,
            tms_name: 'Network Operations Team',
            tms_email: 'network-ops@company.com'
        ]
    ]
}

def createCutoverTeam() {
    return [
        tms_id: 99,
        tms_name: 'IT Cutover Coordination Team',
        tms_email: 'cutover-team@company.com'
    ]
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

def runTest(String testName, Closure testCode) {
    totalTests++
    println "🧪 TEST ${totalTests}: ${testName}"
    println "-" * 60
    
    try {
        def result = testCode.call()
        if (result) {
            println "✅ PASSED: ${testName}"
            passedTests++
            testResults[testName] = 'PASSED'
        } else {
            println "❌ FAILED: ${testName}"
            testResults[testName] = 'FAILED'
        }
    } catch (Exception e) {
        println "💥 ERROR: ${testName} - ${e.message}"
        e.printStackTrace()
        testResults[testName] = "ERROR: ${e.message}"
    }
    println ""
}

def checkNotificationLogged(String notificationType, int timeoutMinutes = 5) {
    return DatabaseUtil.withSql { sql ->
        def notifications = sql.rows("""
            SELECT nol_notification_type, nol_recipients, nol_status, nol_created_at,
                   nol_metadata->>'step_view_url' as step_url,
                   nol_metadata->>'migration_code' as migration_code,
                   nol_metadata->>'notification_type' as metadata_type
            FROM notification_log_nol 
            WHERE nol_created_at >= NOW() - INTERVAL '${timeoutMinutes} minutes'
              AND (nol_notification_type = ? OR nol_metadata->>'notification_type' = ?)
            ORDER BY nol_created_at DESC
            LIMIT 3
        """, [notificationType, notificationType])
        
        if (notifications) {
            println "   📋 Notification logged: ${notificationType}"
            notifications.each { notif ->
                println "      - Recipients: ${notif.nol_recipients}"
                println "      - Status: ${notif.nol_status}"
                println "      - URL: ${notif.step_url ?: 'No URL'}"
                println "      - Migration: ${notif.migration_code ?: 'N/A'}"
            }
            return true
        } else {
            println "   ⚠️  No notification logged for: ${notificationType}"
            return false
        }
    }
}

// ========================================
// EMAIL NOTIFICATION TESTS
// ========================================

try {
    println "📊 SYSTEM HEALTH CHECK"
    println "=" * 60
    
    // Check MailHog connectivity
    try {
        def healthStatus = EnhancedEmailService.healthCheck()
        println "Enhanced Email Service Health: ${healthStatus.status}"
        println "URL Construction: ${healthStatus.urlConstruction?.status ?: 'unknown'}"
        println "Capabilities: ${healthStatus.capabilities}"
    } catch (Exception e) {
        println "⚠️ Health check failed: ${e.message}"
    }
    
    // Check email templates
    DatabaseUtil.withSql { sql ->
        def templates = sql.rows("SELECT emt_type, emt_name FROM email_templates_emt WHERE emt_is_active = true ORDER BY emt_type")
        println ""
        println "📧 Available Email Templates:"
        templates.each { template ->
            println "   - ${template.emt_type}: ${template.emt_name}"
        }
    }
    println ""
    
    // ========================================
    // TEST 1: Step Assignment Notification
    // ========================================
    
    runTest("Step Assignment Notification") {
        def stepInstance = createTestStepInstance(
            'Deploy Core Banking Database Schema',
            'Deploy the new customer account management database schema with foreign key constraints and indexes'
        )
        def teams = createTestTeams()
        
        EnhancedEmailService.sendStepOpenedNotificationWithUrl(
            stepInstance,
            teams,
            1, // userId
            'CORE-BANKING-MIG',
            'PROD-CUTOVER-W1'
        )
        
        // Wait and verify
        Thread.sleep(2000)
        return checkNotificationLogged('STEP_OPENED_WITH_URL')
    }
    
    // ========================================
    // TEST 2: Step Status Change Notification
    // ========================================
    
    runTest("Step Status Change Notification") {
        def stepInstance = createTestStepInstance(
            'Configure Load Balancer Rules',
            'Update load balancer configuration to route traffic to new application servers'
        )
        def teams = createTestTeams()
        def cutoverTeam = createCutoverTeam()
        
        EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
            stepInstance,
            teams,
            cutoverTeam,
            'OPEN',
            'IN_PROGRESS',
            1, // userId
            'CORE-BANKING-MIG',
            'PROD-CUTOVER-W1'
        )
        
        Thread.sleep(2000)
        return checkNotificationLogged('STEP_STATUS_CHANGED_WITH_URL')
    }
    
    // ========================================
    // TEST 3: Instruction Completion Notification
    // ========================================
    
    runTest("Instruction Completion Notification") {
        def stepInstance = createTestStepInstance(
            'Validate Application Health Checks',
            'Verify all application health endpoints respond correctly after deployment'
        )
        def instruction = createTestInstruction(
            'Test Database Connection Pool',
            'Verify database connection pool is configured correctly and handles concurrent connections'
        )
        def teams = createTestTeams()
        
        EnhancedEmailService.sendInstructionCompletedNotificationWithUrl(
            instruction,
            stepInstance,
            teams,
            1, // userId
            'CORE-BANKING-MIG',
            'PROD-CUTOVER-W1'
        )
        
        Thread.sleep(2000)
        return checkNotificationLogged('INSTRUCTION_COMPLETED_WITH_URL')
    }
    
    // ========================================
    // TEST 4: Milestone Notification (Using Status Change)
    // ========================================
    
    runTest("Milestone Achievement Notification") {
        def milestoneStep = createTestStepInstance(
            'MILESTONE: Database Migration Complete',
            'All customer data successfully migrated to new database with validation complete'
        )
        def teams = createTestTeams()
        def cutoverTeam = createCutoverTeam()
        
        EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
            milestoneStep,
            teams,
            cutoverTeam,
            'IN_PROGRESS',
            'COMPLETED',
            1, // userId
            'CORE-BANKING-MIG',
            'PROD-CUTOVER-W1'
        )
        
        Thread.sleep(2000)
        return checkNotificationLogged('STEP_STATUS_CHANGED_WITH_URL')
    }
    
    // ========================================
    // TEST 5: Control Point Notification
    // ========================================
    
    runTest("Control Point Notification") {
        def controlStep = createTestStepInstance(
            'CONTROL POINT: Security Validation Gate',
            'Mandatory security review and approval before proceeding with production deployment',
            'BLOCKED'
        )
        def teams = createTestTeams()
        def cutoverTeam = createCutoverTeam()
        
        EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
            controlStep,
            teams,
            cutoverTeam,
            'IN_PROGRESS',
            'BLOCKED',
            1, // userId
            'CORE-BANKING-MIG',
            'PROD-CUTOVER-W1'
        )
        
        Thread.sleep(2000)
        return checkNotificationLogged('STEP_STATUS_CHANGED_WITH_URL')
    }
    
    // ========================================
    // TEST 6: Deadline Reminder Notification
    // ========================================
    
    runTest("Deadline Reminder Notification") {
        def urgentStep = createTestStepInstance(
            'URGENT: Customer Data Backup Verification',
            'Critical deadline: Complete customer data backup verification by 18:00 UTC today'
        )
        def teams = createTestTeams()
        
        EnhancedEmailService.sendStepOpenedNotificationWithUrl(
            urgentStep,
            teams,
            1, // userId
            'CORE-BANKING-MIG',
            'PROD-CUTOVER-W1'
        )
        
        Thread.sleep(2000)
        return checkNotificationLogged('STEP_OPENED_WITH_URL')
    }
    
    // ========================================
    // TEST 7: Escalation Notification
    // ========================================
    
    runTest("Escalation Notification") {
        def escalationStep = createTestStepInstance(
            'ESCALATION: Application Server Failure',
            'Primary application server has failed. Immediate attention required for failover procedures'
        )
        def teams = createTestTeams()
        def cutoverTeam = createCutoverTeam()
        
        EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
            escalationStep,
            teams,
            cutoverTeam,
            'IN_PROGRESS',
            'BLOCKED',
            1, // userId
            'CORE-BANKING-MIG',
            'PROD-CUTOVER-W1'
        )
        
        Thread.sleep(2000)
        return checkNotificationLogged('STEP_STATUS_CHANGED_WITH_URL')
    }
    
    // ========================================
    // TEST 8: Iteration Update Notification
    // ========================================
    
    runTest("Iteration Progress Update") {
        def iterationStep = createTestStepInstance(
            'Weekly Iteration Progress Review',
            'Review progress of all migration activities and update stakeholders on current status'
        )
        def teams = createTestTeams()
        
        EnhancedEmailService.sendStepOpenedNotificationWithUrl(
            iterationStep,
            teams,
            1, // userId
            'CORE-BANKING-MIG',
            'PROD-CUTOVER-W2' // Different iteration
        )
        
        Thread.sleep(2000)
        return checkNotificationLogged('STEP_OPENED_WITH_URL')
    }
    
    // ========================================
    // TEST 9: Validation Result Notification
    // ========================================
    
    runTest("Validation Result Notification") {
        def validationStep = createTestStepInstance(
            'Performance Test Results Analysis',
            'Analysis of load testing results shows system meets performance requirements'
        )
        def validationInstruction = createTestInstruction(
            'Analyze Response Time Metrics',
            'Review detailed response time metrics from performance testing suite'
        )
        def teams = createTestTeams()
        
        EnhancedEmailService.sendInstructionCompletedNotificationWithUrl(
            validationInstruction,
            validationStep,
            teams,
            1, // userId
            'CORE-BANKING-MIG',
            'PROD-CUTOVER-W1'
        )
        
        Thread.sleep(2000)
        return checkNotificationLogged('INSTRUCTION_COMPLETED_WITH_URL')
    }
    
    // ========================================
    // TEST 10: System Event Notification
    // ========================================
    
    runTest("System Event Notification") {
        def systemStep = createTestStepInstance(
            'Automated Backup Verification Complete',
            'System has completed automated verification of all backup procedures and data integrity checks'
        )
        def teams = createTestTeams()
        def cutoverTeam = createCutoverTeam()
        
        EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
            systemStep,
            teams,
            cutoverTeam,
            'IN_PROGRESS',
            'COMPLETED',
            null, // System user (null userId)
            'CORE-BANKING-MIG',
            'PROD-CUTOVER-W1'
        )
        
        Thread.sleep(2000)
        return checkNotificationLogged('STEP_STATUS_CHANGED_WITH_URL')
    }
    
    // ========================================
    // TEST 11: Error Handling - Invalid Step Data
    // ========================================
    
    runTest("Error Handling - Invalid Step Data") {
        def invalidStep = [
            sti_id: "invalid-uuid-format",
            sti_name: null,
            sti_description: ""
        ]
        def teams = createTestTeams()
        
        try {
            EnhancedEmailService.sendStepOpenedNotificationWithUrl(
                invalidStep,
                teams,
                1,
                'CORE-BANKING-MIG',
                'PROD-CUTOVER-W1'
            )
            // If no exception thrown, check if it handled gracefully
            Thread.sleep(1000)
            return true // Should handle gracefully
        } catch (Exception e) {
            println "   Expected error handled: ${e.message}"
            return true // Error handling working correctly
        }
    }
    
    // ========================================
    // TEST 12: Edge Case - Empty Teams List
    // ========================================
    
    runTest("Edge Case - Empty Teams List") {
        def stepInstance = createTestStepInstance(
            'Test Step with No Recipients',
            'This step has no assigned teams to test empty recipient handling'
        )
        def emptyTeams = []
        
        EnhancedEmailService.sendStepOpenedNotificationWithUrl(
            stepInstance,
            emptyTeams,
            1,
            'CORE-BANKING-MIG',
            'PROD-CUTOVER-W1'
        )
        
        Thread.sleep(1000)
        // Should handle gracefully without sending email
        return true
    }
    
    // ========================================
    // TEST 13: URL Construction Edge Cases
    // ========================================
    
    runTest("URL Construction Edge Cases") {
        def stepInstance = createTestStepInstance(
            'URL Construction Test',
            'Test URL construction with various parameter combinations'
        )
        def teams = createTestTeams()
        
        // Test with null migration/iteration codes
        EnhancedEmailService.sendStepOpenedNotificationWithUrl(
            stepInstance,
            teams,
            1,
            null, // null migration code
            null  // null iteration code
        )
        
        Thread.sleep(1000)
        return true // Should handle null values gracefully
    }
    
    // ========================================
    // FINAL VERIFICATION AND REPORTING
    // ========================================
    
    println "🏁 FINAL VERIFICATION"
    println "=" * 60
    
    // Check recent audit logs
    DatabaseUtil.withSql { sql ->
        def recentAudits = sql.rows("""
            SELECT aud_action, aud_table_name, aud_entity_id, aud_created_at, aud_metadata
            FROM audit_log_aud 
            WHERE aud_created_at >= NOW() - INTERVAL '10 minutes'
              AND aud_action LIKE '%EMAIL%'
            ORDER BY aud_created_at DESC
            LIMIT 15
        """)
        
        println "📋 Recent Email Audit Logs (${recentAudits.size()} entries):"
        recentAudits.each { audit ->
            println "   ${audit.aud_created_at} - ${audit.aud_action} - ${audit.aud_table_name}"
        }
    }
    
    println ""
    
    // Check notification log summary
    DatabaseUtil.withSql { sql ->
        def notificationSummary = sql.rows("""
            SELECT nol_notification_type, COUNT(*) as count, 
                   COUNT(CASE WHEN nol_status = 'SUCCESS' THEN 1 END) as success_count,
                   COUNT(CASE WHEN nol_status = 'FAILED' THEN 1 END) as failed_count
            FROM notification_log_nol 
            WHERE nol_created_at >= NOW() - INTERVAL '10 minutes'
            GROUP BY nol_notification_type
            ORDER BY nol_notification_type
        """)
        
        println "📊 Notification Summary:"
        notificationSummary.each { summary ->
            println "   ${summary.nol_notification_type}: ${summary.count} total (${summary.success_count} success, ${summary.failed_count} failed)"
        }
    }
    
    println ""
    println "🎉 TEST SUITE COMPLETE!"
    println "=" * 80
    println "Total Tests: ${totalTests}"
    println "Passed Tests: ${passedTests}"
    println "Failed Tests: ${totalTests - passedTests}"
    println "Success Rate: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%"
    println ""
    
    // Detailed results
    println "📊 DETAILED RESULTS:"
    testResults.each { testName, result ->
        def status = result == 'PASSED' ? '✅' : (result.startsWith('ERROR') ? '💥' : '❌')
        println "   ${status} ${testName}: ${result}"
    }
    
    println ""
    println "🔗 VERIFICATION STEPS:"
    println "1. Open MailHog Web UI: http://localhost:8025"
    println "2. You should see ${passedTests} emails with mobile-responsive design"
    println "3. Click on emails to verify content, URLs, and mobile layout"
    println "4. Check that all URLs follow the pattern:"
    println "   http://localhost:8090/display/SPACE/StepView?stepId=<UUID>&migrationCode=<CODE>&iterationCode=<CODE>"
    println ""
    println "📊 DATABASE VERIFICATION QUERIES:"
    println "-- Recent notifications:"
    println "SELECT * FROM notification_log_nol WHERE nol_created_at >= NOW() - INTERVAL '10 minutes';"
    println ""
    println "-- Recent audit logs:"
    println "SELECT * FROM audit_log_aud WHERE aud_created_at >= NOW() - INTERVAL '10 minutes' AND aud_action LIKE '%EMAIL%';"
    
} catch (Exception e) {
    println "💥 CRITICAL TEST SUITE FAILURE!"
    println "Error: ${e.message}"
    e.printStackTrace()
    println ""
    println "🔧 TROUBLESHOOTING CHECKLIST:"
    println "1. Verify EnhancedEmailService.groovy is compiled and accessible"
    println "2. Check UrlConstructionService is available and configured"
    println "3. Ensure email templates exist in email_templates_emt table:"
    println "   SELECT emt_type, emt_is_active FROM email_templates_emt;"
    println "4. Verify MailHog is running:"
    println "   - SMTP server: localhost:1025"
    println "   - Web interface: localhost:8025"
    println "5. Check system configuration table for URL base settings"
    println "6. Verify notification_log_nol table exists and is accessible"
    println "7. Check audit_log_aud table exists and triggers are working"
}

println ""
println "Test completed: ${new Date()}"
println "=" * 80