// Quick debug script to test EmailService email sending
// Run this in ScriptRunner Console
//
// NOTE: After US-058 Phase 2, functionality moved from EnhancedEmailService to EmailService
// Location: /local-dev-setup/scripts/maintenance/debug-email-notification.groovy

import umig.utils.EmailService
import umig.utils.DatabaseUtil

println "=== DEBUG: Testing EmailService Email Notification ==="
println "Started at: ${new Date()}"

try {
    // Test 1: Direct method call with test data
    def stepInstance = [
        sti_id: UUID.randomUUID(),
        sti_name: 'DEBUG-TEST-STEP',
        recentComments: [],
        impacted_teams: 'Test Team'
    ]

    def teams = [
        [tms_email: 'test1@example.com', tms_name: 'Test Team 1'],
        [tms_email: 'test2@example.com', tms_name: 'Test Team 2']
    ]

    def cutoverTeam = [tms_email: 'cutover@example.com', tms_name: 'Cutover Team']

    println "Calling EmailService.sendStepStatusChangedNotificationWithUrl..."

    EmailService.sendStepStatusChangedNotificationWithUrl(
        stepInstance,
        teams,
        cutoverTeam,
        'PENDING',           // oldStatus
        'IN_PROGRESS',      // newStatus
        1,                  // userId
        'DEBUG-MIG',        // migrationCode
        'DEBUG-ITE'         // iterationCode
    )

    println "✅ Method call completed without exceptions"

} catch (Exception e) {
    println "❌ ERROR: ${e.message}"
    e.printStackTrace()
}

println "\n🔍 Check MailHog at: http://localhost:8025"
println "=== END DEBUG ==="