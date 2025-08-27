// Complete Inline Test for EnhancedEmailService
// Copy-paste this entire script into ScriptRunner console at http://localhost:8090/plugins/servlet/scriptconsole

import groovy.sql.Sql
import groovy.json.JsonBuilder
import java.sql.SQLException
import java.util.Properties
import javax.mail.*
import javax.mail.internet.*
import java.util.Date

// Import UMIG classes
import umig.utils.EnhancedEmailService
import umig.utils.DatabaseUtil

println "=== Enhanced Email Service Test Script ==="
println "Starting comprehensive email testing..."
println "Timestamp: ${new Date()}"
println ""

// Test results collector
def testResults = [:]
def emailsSent = []

try {
    // =========== 1. DIRECT SMTP TEST TO MAILHOG ===========
    println "1. Testing direct SMTP connection to MailHog..."
    
    try {
        Properties props = new Properties()
        props.put("mail.smtp.host", "localhost")
        props.put("mail.smtp.port", "1025")
        props.put("mail.smtp.auth", "false")
        props.put("mail.transport.protocol", "smtp")
        props.put("mail.debug", "true")
        
        Session session = Session.getInstance(props)
        
        MimeMessage message = new MimeMessage(session)
        message.setFrom(new InternetAddress("test@umig-system.local"))
        message.addRecipient(Message.RecipientType.TO, new InternetAddress("admin@example.com"))
        message.setSubject("Direct SMTP Test - ${new Date()}")
        message.setText("This is a direct SMTP test to verify MailHog connectivity.")
        
        Transport.send(message)
        
        testResults["directSMTP"] = "SUCCESS"
        emailsSent << "Direct SMTP test email"
        println "✅ Direct SMTP test: SUCCESS - Email sent to MailHog"
        
    } catch (Exception e) {
        testResults["directSMTP"] = "FAILED: ${e.message}"
        println "❌ Direct SMTP test: FAILED - ${e.message}"
        e.printStackTrace()
    }
    
    println ""
    
    // =========== 2. DATABASE SETUP AND MOCK DATA ===========
    println "2. Setting up mock test data..."
    
    def mockStepData = [
        step_id: UUID.randomUUID(),
        step_name: "Test Migration Step",
        step_description: "Test step for email notifications",
        current_status: "IN_PROGRESS",
        assigned_team_id: 1,
        step_instance_id: UUID.randomUUID()
    ]
    
    def mockTeamData = [
        team_id: 1,
        team_name: "Test Team",
        team_email: "test-team@example.com",
        team_lead_email: "team-lead@example.com"
    ]
    
    def mockInstructionData = [
        instruction_id: UUID.randomUUID(),
        instruction_title: "Test Instruction",
        instruction_description: "Test instruction for completion notification",
        step_instance_id: mockStepData.step_instance_id,
        completed_by: "test-user@example.com"
    ]
    
    println "✅ Mock data created:"
    println "   - Step ID: ${mockStepData.step_id}"
    println "   - Team: ${mockTeamData.team_name} (${mockTeamData.team_email})"
    println "   - Instruction ID: ${mockInstructionData.instruction_id}"
    println ""
    
    // =========== 3. TEST ENHANCED EMAIL SERVICE METHODS ===========
    println "3. Testing EnhancedEmailService methods..."
    
    def emailService = new EnhancedEmailService()
    
    // Test 3a: Step Status Changed Notification
    println "3a. Testing sendStepStatusChangedNotificationWithUrl..."
    try {
        def result = emailService.sendStepStatusChangedNotificationWithUrl(
            mockStepData.step_id.toString(),
            "COMPLETED", 
            "IN_PROGRESS",
            "System Test"
        )
        
        testResults["stepStatusChanged"] = result ? "SUCCESS" : "FAILED"
        if (result) {
            emailsSent << "Step Status Changed notification"
            println "✅ Step status notification: SUCCESS"
        } else {
            println "❌ Step status notification: FAILED - Method returned false"
        }
        
    } catch (Exception e) {
        testResults["stepStatusChanged"] = "FAILED: ${e.message}"
        println "❌ Step status notification: FAILED - ${e.message}"
        
        // Check if it's the known UrlConstructionService error
        if (e.message?.contains("scf_environment_code")) {
            println "   ⚠️  Known issue: UrlConstructionService looking for non-existent column 'scf_environment_code'"
            println "   💡 Expected columns in system_configuration_scf: env_id, scf_key, scf_value"
        }
    }
    
    // Test 3b: Step Opened Notification
    println "\n3b. Testing sendStepOpenedNotificationWithUrl..."
    try {
        def result = emailService.sendStepOpenedNotificationWithUrl(
            mockStepData.step_id.toString(),
            "System Test"
        )
        
        testResults["stepOpened"] = result ? "SUCCESS" : "FAILED"
        if (result) {
            emailsSent << "Step Opened notification"
            println "✅ Step opened notification: SUCCESS"
        } else {
            println "❌ Step opened notification: FAILED - Method returned false"
        }
        
    } catch (Exception e) {
        testResults["stepOpened"] = "FAILED: ${e.message}"
        println "❌ Step opened notification: FAILED - ${e.message}"
        
        if (e.message?.contains("scf_environment_code")) {
            println "   ⚠️  Known issue: UrlConstructionService column error"
        }
    }
    
    // Test 3c: Instruction Completed Notification
    println "\n3c. Testing sendInstructionCompletedNotificationWithUrl..."
    try {
        def result = emailService.sendInstructionCompletedNotificationWithUrl(
            mockInstructionData.instruction_id.toString(),
            mockInstructionData.completed_by,
            "System Test"
        )
        
        testResults["instructionCompleted"] = result ? "SUCCESS" : "FAILED"
        if (result) {
            emailsSent << "Instruction Completed notification"
            println "✅ Instruction completed notification: SUCCESS"
        } else {
            println "❌ Instruction completed notification: FAILED - Method returned false"
        }
        
    } catch (Exception e) {
        testResults["instructionCompleted"] = "FAILED: ${e.message}"
        println "❌ Instruction completed notification: FAILED - ${e.message}"
        
        if (e.message?.contains("scf_environment_code")) {
            println "   ⚠️  Known issue: UrlConstructionService column error"
        }
    }
    
    println ""
    
    // =========== 4. DATABASE INVESTIGATION ===========
    println "4. Investigating database schema issues..."
    
    try {
        DatabaseUtil.withSql { sql ->
            // Check if system_configuration_scf table exists and what columns it has
            def tables = sql.rows("""
                SELECT table_name, column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = 'system_configuration_scf'
                ORDER BY ordinal_position
            """)
            
            if (tables) {
                println "✅ system_configuration_scf table structure:"
                tables.each { row ->
                    println "   - ${row.column_name}: ${row.data_type}"
                }
                
                // Check for any environment-related data
                def envData = sql.rows("SELECT * FROM system_configuration_scf WHERE scf_key LIKE '%env%' OR scf_key LIKE '%url%' LIMIT 5")
                if (envData) {
                    println "\n📋 Sample environment-related configuration:"
                    envData.each { row ->
                        println "   - ${row.scf_key} = ${row.scf_value}"
                    }
                }
                
            } else {
                println "❌ system_configuration_scf table not found or no columns visible"
            }
            
            testResults["databaseCheck"] = "SUCCESS"
        }
        
    } catch (Exception e) {
        testResults["databaseCheck"] = "FAILED: ${e.message}"
        println "❌ Database investigation failed: ${e.message}"
    }
    
    println ""
    
    // =========== 5. EMAIL CONFIGURATION CHECK ===========
    println "5. Checking email configuration..."
    
    try {
        // Try to access Confluence email settings via reflection or available APIs
        def confluenceClass = Class.forName("com.atlassian.confluence.setup.settings.SettingsManager")
        println "✅ Confluence SettingsManager class found"
        testResults["emailConfig"] = "ACCESSIBLE"
        
    } catch (ClassNotFoundException e) {
        println "❌ Could not access Confluence email configuration"
        testResults["emailConfig"] = "NOT_ACCESSIBLE"
    }
    
    println ""
    
} catch (Exception e) {
    println "❌ Critical error in test execution: ${e.message}"
    e.printStackTrace()
    testResults["criticalError"] = e.message
}

// =========== 6. FINAL RESULTS SUMMARY ===========
println "=== TEST RESULTS SUMMARY ==="
println "Timestamp: ${new Date()}"
println ""

println "📊 Test Results:"
testResults.each { test, result ->
    def status = result.startsWith("SUCCESS") ? "✅" : result.startsWith("FAILED") ? "❌" : "⚠️"
    println "   ${status} ${test}: ${result}"
}

println ""
println "📧 Emails Sent (${emailsSent.size()}):"
if (emailsSent.isEmpty()) {
    println "   ❌ No emails were successfully sent"
} else {
    emailsSent.each { email ->
        println "   ✅ ${email}"
    }
}

println ""
println "🔧 Troubleshooting Recommendations:"

if (testResults["directSMTP"]?.startsWith("SUCCESS")) {
    println "   ✅ MailHog connectivity is working"
} else {
    println "   ❌ Fix MailHog connectivity first:"
    println "      - Verify MailHog is running: docker ps or podman ps"
    println "      - Check port 1025 is available: netstat -an | grep 1025"
    println "      - Restart MailHog container if needed"
}

if (testResults.any { k, v -> v.contains("scf_environment_code") }) {
    println "   ⚠️  Database schema issue detected:"
    println "      - UrlConstructionService expects 'scf_environment_code' column"
    println "      - Actual table has: env_id, scf_key, scf_value"
    println "      - Consider updating UrlConstructionService or database migration"
}

if (testResults["emailConfig"] != "ACCESSIBLE") {
    println "   ⚠️  Email configuration not accessible:"
    println "      - Check Confluence email settings in admin panel"
    println "      - Verify SMTP settings point to localhost:1025"
}

println ""
println "🌐 Next Steps:"
println "   1. Check MailHog web UI at http://localhost:8025 for captured emails"
println "   2. Review Confluence email settings at http://localhost:8090/admin/mail/editEmailSettings.action"
println "   3. Fix UrlConstructionService database column issue if needed"
println "   4. Re-run this test after fixes"

println ""
println "=== Test Complete ==="

// Return summary for ScriptRunner console
return [
    testResults: testResults,
    emailsSent: emailsSent,
    timestamp: new Date().toString(),
    mailHogUrl: "http://localhost:8025",
    confluenceEmailSettings: "http://localhost:8090/admin/mail/editEmailSettings.action"
]