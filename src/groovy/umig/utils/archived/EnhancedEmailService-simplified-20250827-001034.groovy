package umig.utils

import java.util.Date

/**
 * EnhancedEmailService - Simplified email notifications
 * 
 * Drastically simplified version that implements email functionality with
 * minimal dependencies and maximum ScriptRunner compatibility.
 * 
 * This version uses reflection-based delegation to avoid static type checking issues.
 */
class EnhancedEmailService {

    /**
     * Send step status change notification - simplified
     */
    static void sendStepStatusChangedNotificationWithUrl(Map<String, Object> stepInstance, List<Map> teams,
                                                        Map<String, Object> cutoverTeam, String oldStatus, String newStatus,
                                                        Integer userId = null, String migrationCode = null, String iterationCode = null) {
        try {
            List<Map> allTeams = []
            if (teams) allTeams.addAll(teams)
            if (cutoverTeam) allTeams.add(cutoverTeam)
            
            List<String> recipients = extractTeamEmails(allTeams)
            if (!recipients) return

            String subject = "[UMIG] Step Status Changed: ${stepInstance?.sti_name ?: 'Unknown Step'}"
            String body = buildSimpleStatusChangeBody(stepInstance, oldStatus, newStatus)
            
            // Use reflection to avoid static type checking issues
            def emailServiceClass = Class.forName('umig.utils.EmailService')
            def sendEmailMethod = emailServiceClass.getMethod('sendEmail', List.class, String.class, String.class)
            sendEmailMethod.invoke(null, recipients, subject, body)
        } catch (Exception e) {
            println "EnhancedEmailService error: ${e.message}"
        }
    }

    /**
     * Send step opened notification - simplified
     */
    static void sendStepOpenedNotificationWithUrl(Map<String, Object> stepInstance, List<Map> teams,
                                                 Integer userId = null, String migrationCode = null, String iterationCode = null) {
        try {
            List<String> recipients = extractTeamEmails(teams)
            if (!recipients) return

            String subject = "[UMIG] Step Ready: ${stepInstance?.sti_name ?: 'Unknown Step'}"
            String body = buildSimpleStepOpenedBody(stepInstance)
            
            // Use reflection to avoid static type checking issues
            def emailServiceClass = Class.forName('umig.utils.EmailService')
            def sendEmailMethod = emailServiceClass.getMethod('sendEmail', List.class, String.class, String.class)
            sendEmailMethod.invoke(null, recipients, subject, body)
        } catch (Exception e) {
            println "EnhancedEmailService error: ${e.message}"
        }
    }

    /**
     * Send instruction completed notification - simplified
     */
    static void sendInstructionCompletedNotificationWithUrl(Map<String, Object> instruction, Map<String, Object> stepInstance,
                                                           List<Map> teams, Integer userId = null,
                                                           String migrationCode = null, String iterationCode = null) {
        try {
            List<String> recipients = extractTeamEmails(teams)
            if (!recipients) return

            String subject = "[UMIG] Instruction Completed: ${instruction?.ini_name ?: 'Unknown Instruction'}"
            String body = buildSimpleInstructionCompletedBody(instruction, stepInstance)
            
            // Use reflection to avoid static type checking issues
            def emailServiceClass = Class.forName('umig.utils.EmailService')
            def sendEmailMethod = emailServiceClass.getMethod('sendEmail', List.class, String.class, String.class)
            sendEmailMethod.invoke(null, recipients, subject, body)
        } catch (Exception e) {
            println "EnhancedEmailService error: ${e.message}"
        }
    }

    /**
     * Send step email with recipients - simplified
     */
    static Map<String, Object> sendStepEmailWithRecipients(Map<String, Object> stepInstance, List<String> toRecipients,
                                          List<String> ccRecipients, List<String> bccRecipients,
                                          Integer userId = null, String migrationCode = null,
                                          String iterationCode = null) {
        try {
            if (!toRecipients && !ccRecipients && !bccRecipients) {
                return [success: false, error: 'No recipients specified']
            }

            String subject = "Step ${stepInstance?.stm_number ?: ''}: ${stepInstance?.sti_name ?: 'Update'}"
            String body = buildSimpleStepEmailBody(stepInstance)
            
            // Use reflection to avoid static type checking issues
            def emailServiceClass = Class.forName('umig.utils.EmailService')
            def sendEmailWithCCAndBCCMethod = emailServiceClass.getMethod('sendEmailWithCCAndBCC', 
                String.class, String.class, String.class, String.class, String.class, boolean.class)
            boolean sent = sendEmailWithCCAndBCCMethod.invoke(null,
                toRecipients ? toRecipients.join(',') : null,
                ccRecipients ? ccRecipients.join(',') : null,
                bccRecipients ? bccRecipients.join(',') : null,
                subject,
                body,
                true
            ) as boolean
            
            return [success: sent, error: sent ? null : 'Failed to send email']
        } catch (Exception e) {
            return [success: false, error: e.message]
        }
    }

    /**
     * Health check - simplified
     */
    static Map<String, Object> healthCheck() {
        return [
            service: 'EnhancedEmailService',
            status: 'healthy',
            timestamp: new Date()
        ]
    }

    // Simple helper methods
    private static List<String> extractTeamEmails(List<Map> teams) {
        if (!teams) return []
        
        List<String> emails = []
        teams.each { team ->
            def email = team?.tms_email
            if (email && email.toString().trim()) {
                emails.add(email.toString().trim())
            }
        }
        return emails
    }
    
    private static String buildSimpleStatusChangeBody(Map<String, Object> stepInstance, String oldStatus, String newStatus) {
        return """
<html>
<body>
<h2>Step Status Changed</h2>
<p><strong>Step:</strong> ${stepInstance?.sti_name ?: 'Unknown'}</p>
<p><strong>Status changed from:</strong> ${oldStatus ?: 'Unknown'} <strong>to:</strong> ${newStatus ?: 'Unknown'}</p>
<p><strong>Time:</strong> ${new Date()}</p>
</body>
</html>
"""
    }
    
    private static String buildSimpleStepOpenedBody(Map<String, Object> stepInstance) {
        return """
<html>
<body>
<h2>Step Ready</h2>
<p><strong>Step:</strong> ${stepInstance?.sti_name ?: 'Unknown'}</p>
<p><strong>Description:</strong> ${stepInstance?.sti_description ?: 'No description'}</p>
<p><strong>Time:</strong> ${new Date()}</p>
</body>
</html>
"""
    }
    
    private static String buildSimpleInstructionCompletedBody(Map<String, Object> instruction, Map<String, Object> stepInstance) {
        return """
<html>
<body>
<h2>Instruction Completed</h2>
<p><strong>Instruction:</strong> ${instruction?.ini_name ?: 'Unknown'}</p>
<p><strong>Step:</strong> ${stepInstance?.sti_name ?: 'Unknown'}</p>
<p><strong>Time:</strong> ${new Date()}</p>
</body>
</html>
"""
    }
    
    private static String buildSimpleStepEmailBody(Map<String, Object> stepInstance) {
        return """
<html>
<body>
<h2>Step Update</h2>
<p><strong>Step:</strong> ${stepInstance?.sti_name ?: 'Unknown'}</p>
<p><strong>Number:</strong> ${stepInstance?.stm_number ?: 'N/A'}</p>
<p><strong>Status:</strong> ${stepInstance?.status_name ?: 'Unknown'}</p>
<p><strong>Description:</strong> ${stepInstance?.sti_description ?: 'No description'}</p>
<p><strong>Time:</strong> ${new Date()}</p>
</body>
</html>
"""
    }
}
