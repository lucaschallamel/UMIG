/*
 * Email Notification Test
 * 
 * Run this in ScriptRunner Console to test email notifications
 */

import umig.utils.DatabaseUtil
import umig.repository.StepRepository

println "=== Email Notification Test ==="
println ""

try {
    DatabaseUtil.withSql { sql ->
        
        // 1. Check email templates exist
        println "1. Checking email templates..."
        def templates = sql.rows('SELECT emt_type, emt_name FROM email_templates_emt WHERE emt_is_active = true')
        
        if (templates.isEmpty()) {
            println "   ERROR: No email templates found!"
            return
        }
        
        templates.each { t ->
            println "   ✓ ${t.emt_type}: ${t.emt_name}"
        }
        
        // 2. Find a testable step
        println "\n2. Finding a testable step..."
        
        def testStep = sql.firstRow('''
            SELECT 
                sti.sti_id,
                sti.sti_name,
                sti.sti_status
            FROM steps_instance_sti sti
            WHERE sti.sti_status = 'NOT_STARTED'
            LIMIT 1
        ''')
        
        if (!testStep) {
            println "   No NOT_STARTED steps found!"
            return
        }
        
        println "   Step: ${testStep.sti_name}"
        println "   Status: ${testStep.sti_status}"
        
        // 3. Test opening the step
        println "\n3. Testing step opening with email notification..."
        
        def stepRepo = new StepRepository()
        def result = stepRepo.openStepInstanceWithNotification(testStep.sti_id as UUID, 1)
        
        if (result.success) {
            println "   ✓ SUCCESS: Step opened!"
            println "   Emails sent: ${result.emailsSent}"
        } else {
            println "   ✗ FAILED: ${result.error}"
            return
        }
        
        // 4. Test status update
        println "\n4. Testing status update with email notification..."
        
        def statusResult = stepRepo.updateStepInstanceStatusWithNotification(testStep.sti_id as UUID, 'IN_PROGRESS', 1)
        
        if (statusResult.success) {
            println "   ✓ SUCCESS: Status updated!"
            println "   Emails sent: ${statusResult.emailsSent}"
        } else {
            println "   ✗ FAILED: ${statusResult.error}"
        }
        
    }
    
    println "\n=== Test Complete ==="
    println "✓ Check MailHog at: http://localhost:8025"
    println "✓ You should see actual emails with HTML content"
    
} catch (Exception e) {
    println "ERROR: ${e.message}"
    e.printStackTrace()
}