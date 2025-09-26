package umig.tests

import umig.utils.EnhancedEmailService
import umig.utils.DatabaseUtil
import groovy.json.JsonSlurper

/**
 * EnhancedEmailServiceTest - Test script for EnhancedEmailService functionality
 *
 * This script tests all email notification methods with sample data
 * to ensure proper functionality before integration with APIs.
 *
 * Run this script in ScriptRunner console to test email notifications.
 */

println "=== UMIG EnhancedEmailService Test Suite ==="
println "Starting EnhancedEmailService tests with sample data..."
println ""

try {
    // Test 1: Step Opened Notification
    println "TEST 1: Step Opened Notification"
    println "=" * 50
    
    Map<String, Object> sampleStepInstance = [
        sti_id: 'test-step-001',
        sti_name: 'Deploy Application Components',
        sti_description: 'Deploy the new application components to the production environment following the deployment checklist.',
        sti_status: 'OPEN',
        sti_duration_minutes: 45,
        migration_name: 'Q4 2025 Core Banking Migration',
        iteration_name: 'Production Cutover - Wave 1',
        sequence_name: 'Application Deployment',
        phase_name: 'Core Systems Deployment'
    ]
    
    List<Map<String, Object>> sampleTeams = [
        [
            tms_id: 1,
            tms_name: 'Infrastructure Team',
            tms_email: 'infrastructure@company.com'
        ] as Map<String, Object>,
        [
            tms_id: 2,
            tms_name: 'Application Team',
            tms_email: 'applications@company.com'
        ] as Map<String, Object>,
        [
            tms_id: 3,
            tms_name: 'Database Team',
            tms_email: 'database@company.com'
        ] as Map<String, Object>
    ] as List<Map<String, Object>>
    
    EnhancedEmailService.sendStepOpenedNotificationWithUrl(sampleStepInstance, sampleTeams)
    println "✅ Step Opened notification sent successfully"
    println ""
    
    // Test 2: Instruction Completed Notification
    println "TEST 2: Instruction Completed Notification"
    println "=" * 50
    
    Map<String, Object> sampleInstruction = [
        ini_id: 'test-instruction-001',
        ini_name: 'Verify Database Connectivity',
        ini_description: 'Test all database connections and verify response times are within acceptable limits.'
    ]
    
    Map<String, Object> sampleStepForInstruction = [
        sti_id: 'test-step-001',
        sti_name: 'Deploy Application Components',
        sti_status: 'IN_PROGRESS'
    ]
    
    EnhancedEmailService.sendInstructionCompletedNotificationWithUrl(sampleInstruction, sampleStepForInstruction, sampleTeams)
    println "✅ Instruction Completed notification sent successfully"
    println ""
    
    // Test 3: Step Status Changed Notification
    println "TEST 3: Step Status Changed Notification"
    println "=" * 50
    
    Map<String, Object> sampleCutoverTeam = [
        tms_id: 99,
        tms_name: 'IT Cutover Coordination Team',
        tms_email: 'cutover-team@company.com'
    ]
    
    Map<String, Object> updatedStepInstance = [
        sti_id: 'test-step-001',
        sti_name: 'Deploy Application Components',
        sti_status: 'COMPLETED',
        migration_name: 'Q4 2025 Core Banking Migration'
    ]
    
    EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
        updatedStepInstance,
        sampleTeams,
        sampleCutoverTeam,
        'IN_PROGRESS',
        'COMPLETED'
    )
    println "✅ Step Status Changed notification sent successfully"
    println ""
    
    // Test 4: Error Handling - Invalid Data
    println "TEST 4: Error Handling with Invalid Data"
    println "=" * 50
    
    Map<String, Object> invalidStepInstance = [
        sti_id: null,  // Invalid ID
        sti_name: null // Invalid name
    ]
    
    List<Map<String, Object>> emptyTeams = []  // No teams
    
    EnhancedEmailService.sendStepOpenedNotificationWithUrl(invalidStepInstance, emptyTeams)
    println "✅ Error handling test completed (should have logged errors gracefully)"
    println ""
    
    // Test 5: Team Email Extraction
    println "TEST 5: Team Email Extraction"
    println "=" * 50
    
    List<Map<String, Object>> mixedTeams = [
        [tms_id: 1, tms_name: 'Team A', tms_email: 'team-a@company.com'] as Map<String, Object>,
        [tms_id: 2, tms_name: 'Team B', tms_email: ''] as Map<String, Object>,  // Empty email
        [tms_id: 3, tms_name: 'Team C', tms_email: null] as Map<String, Object>, // Null email
        [tms_id: 4, tms_name: 'Team D', tms_email: 'team-d@company.com'] as Map<String, Object>
    ] as List<Map<String, Object>>
    
    EnhancedEmailService.sendStepOpenedNotificationWithUrl(sampleStepInstance, mixedTeams)
    println "✅ Mixed team email test completed (should filter out invalid emails)"
    println ""
    
    // Test 6: Check Event Log Entries
    println "TEST 6: Verify Event Log Entries"
    println "=" * 50
    
    DatabaseUtil.withSql { sql ->
        def recentEvents = sql.rows("""
            SELECT evt_type, evt_entity_type, evt_entity_id, evt_details, evt_timestamp
            FROM event_log 
            WHERE evt_type IN ('STEP_OPENED', 'INSTRUCTION_COMPLETED', 'STEP_STATUS_CHANGED', 'EMAIL_ERROR')
            AND evt_timestamp >= NOW() - INTERVAL '5 minutes'
            ORDER BY evt_timestamp DESC
            LIMIT 10
        """)
        
        println "Found ${recentEvents.size()} recent email-related events in event_log:"
        recentEvents.each { event ->
            println "  - ${event.evt_type} | ${event.evt_entity_id} | ${event.evt_timestamp}"
            
            // Parse and display event details
            if (event.evt_details) {
                try {
                    Map<String, Object> details = new JsonSlurper().parseText(event.evt_details.toString()) as Map<String, Object>
                    if (details.get('recipients')) {
                        List<String> recipients = details.get('recipients') as List<String>
                        println "    Recipients: ${recipients.join(', ')}"
                    }
                    if (details.get('recipient_count')) {
                        println "    Recipient Count: ${details.get('recipient_count')}"
                    }
                } catch (Exception e) {
                    println "    Details: ${event.evt_details}"
                }
            }
            println ""
        }
    }
    
    println "✅ Event log verification completed"
    println ""
    
    // Test Summary
    println "=" * 60
    println "🎉 ENHANCED EMAIL SERVICE TEST SUITE COMPLETED SUCCESSFULLY!"
    println "=" * 60
    println ""
    println "Next Steps:"
    println "1. Check MailHog web interface at http://localhost:8025"
    println "2. Verify email content and formatting"
    println "3. Check event_log table for audit entries"
    println "4. Review console output for any error messages"
    println ""
    println "If all tests passed, the EnhancedEmailService is ready for API integration!"
    
} catch (Exception e) {
    println "❌ ENHANCED EMAIL SERVICE TEST FAILED!"
    println "Error: ${e.message}"
    e.printStackTrace()
    println ""
    println "Please check:"
    println "1. Database connection is working"
    println "2. EnhancedEmailService.groovy is properly compiled"
    println "3. All required dependencies are available"
}