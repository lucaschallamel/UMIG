package umig.utils

import groovy.json.JsonBuilder
import groovy.json.JsonOutput
import groovy.text.SimpleTemplateEngine
import groovy.sql.Sql
import java.util.Date
import java.util.UUID

// Confluence mail imports
import com.atlassian.confluence.mail.ConfluenceMailServerManager
import com.atlassian.mail.Email
import com.atlassian.mail.server.SMTPMailServer
import com.atlassian.sal.api.component.ComponentLocator

// JavaMail imports for MailHog
import javax.mail.*
import javax.mail.internet.*
import java.util.Properties

// Repository imports
import umig.repository.AuditLogRepository
import umig.repository.EmailTemplateRepository
import umig.utils.DatabaseUtil

/**
 * EmailService - Centralized email notification service for UMIG
 * 
 * Handles all email notifications for step status changes, instruction completions,
 * and other workflow events. Uses Confluence's native mail API as per ADR-032
 * and logs all notifications to the audit_log_aud table for audit purposes.
 * 
 * @author UMIG Project Team
 * @since 2025-01-16
 */
class EmailService {
    
    // Default from address for UMIG notifications
    private static final String DEFAULT_FROM_ADDRESS = 'umig-system@company.com'
    
    // Base URL for UMIG application links
    private static final String BASE_URL = System.getProperty('umig.base.url', 'http://localhost:8090')
    
    /**
     * Send notification when a PILOT opens a step
     * Recipients: Assigned TEAM + IMPACTED TEAMS
     */
    static void sendStepOpenedNotification(Map stepInstance, List<Map> teams, Integer userId = null, String baseUrl = BASE_URL) {
        DatabaseUtil.withSql { sql ->
            try {
                def recipients = extractTeamEmails(teams)
                
                if (!recipients) {
                    println "EmailService: No recipients found for step ${stepInstance.sti_name}"
                    return
                }
                
                // Get email template
                def template = EmailTemplateRepository.findActiveByType(sql, 'STEP_OPENED')
                if (!template) {
                    println "EmailService: No active template found for STEP_OPENED"
                    return
                }
                
                // Prepare template variables - Include all variables that the template might expect
                def variables = [
                    stepInstance: stepInstance,
                    stepUrl: "${baseUrl}/display/SPACE/IterationView?stepId=${stepInstance.sti_id}",
                    // Additional variables that templates might expect
                    openedBy: getUsernameById(sql, userId ?: 0),
                    openedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    migrationCode: stepInstance?.migration_name ?: '',
                    iterationCode: stepInstance?.iteration_name ?: '',
                    hasStepViewUrl: true,  // This one has a URL
                    stepViewUrl: "${baseUrl}/display/SPACE/IterationView?stepId=${stepInstance.sti_id}"
                ]
                
                // Process template
                def processedSubject = processTemplate(template.emt_subject as String, variables)
                def processedBody = processTemplate(template.emt_body_html as String, variables)
                
                // Send email
                def emailSent = sendEmail(recipients, processedSubject, processedBody)
                
                // Log the notification
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql, 
                        userId, 
                        UUID.fromString(stepInstance.sti_id as String),
                        recipients,
                        processedSubject,
                        template.emt_id as UUID,
                        [
                            notification_type: 'STEP_OPENED',
                            step_name: stepInstance.sti_name,
                            migration_name: stepInstance.migration_name
                        ]
                    )
                }
                
            } catch (Exception e) {
                logError('sendStepOpenedNotification', e, [stepId: stepInstance.sti_id])
                
                // Log the failure
                DatabaseUtil.withSql { errorSql ->
                    AuditLogRepository.logEmailFailed(
                        errorSql,
                        userId,
                        UUID.fromString(stepInstance.sti_id as String),
                        extractTeamEmails(teams),
                        "[UMIG] Step Ready: ${stepInstance.sti_name}",
                        e.message
                    )
                }
            }
        }
    }
    
    /**
     * Send notification when a USER completes an instruction
     * Recipients: Assigned TEAM + IMPACTED TEAMS
     */
    static void sendInstructionCompletedNotification(Map instruction, Map stepInstance, List<Map> teams, Integer userId = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Debug logging
                println "EmailService.sendInstructionCompletedNotification called:"
                println "  - Instruction: ${instruction?.ini_name}"
                println "  - Step: ${stepInstance?.sti_name}"
                println "  - Teams count: ${teams?.size()}"
                println "  - UserId: ${userId}"
                
                def recipients = extractTeamEmails(teams)
                
                println "  - Recipients extracted: ${recipients}"
                
                if (!recipients) {
                    println "EmailService: No recipients found for instruction ${instruction.ini_name}"
                    return
                }
                
                // Get email template
                def template = EmailTemplateRepository.findActiveByType(sql, 'INSTRUCTION_COMPLETED')
                if (!template) {
                    println "EmailService: No active template found for INSTRUCTION_COMPLETED"
                    return
                }
                
                // Prepare template variables - Include all variables that the template might expect
                def variables = [
                    instruction: instruction,
                    stepInstance: stepInstance,
                    completedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    completedBy: getUsernameById(sql, userId),
                    // Additional variables that templates might expect
                    migrationCode: stepInstance?.migration_name ?: '',
                    iterationCode: stepInstance?.iteration_name ?: '',
                    hasStepViewUrl: false,  // For now, disable URL until we implement proper URL generation
                    stepViewUrl: ''  // Empty for now
                ]
                
                // Process template
                def processedSubject = processTemplate(template.emt_subject as String, variables)
                def processedBody = processTemplate(template.emt_body_html as String, variables)
                
                // Send email
                def emailSent = sendEmail(recipients, processedSubject, processedBody)
                
                // Log the notification
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        UUID.fromString(instruction.ini_id as String),
                        recipients,
                        processedSubject,
                        template.emt_id as UUID,
                        [
                            notification_type: 'INSTRUCTION_COMPLETED',
                            instruction_name: instruction.ini_name,
                            step_name: stepInstance.sti_name
                        ],
                        'INSTRUCTION_INSTANCE'  // Specify entity type for instruction actions
                    )
                }
                
            } catch (Exception e) {
                logError('sendInstructionCompletedNotification', e, [
                    instructionId: instruction.ini_id,
                    stepId: stepInstance.sti_id
                ])
                
                // Log the failure
                DatabaseUtil.withSql { errorSql ->
                    AuditLogRepository.logEmailFailed(
                        errorSql,
                        userId,
                        UUID.fromString(instruction.ini_id as String),
                        extractTeamEmails(teams),
                        "[UMIG] Instruction Completed: ${instruction.ini_name}",
                        e.message,
                        'INSTRUCTION_INSTANCE'  // Specify entity type for instruction actions
                    )
                }
            }
        }
    }
    
    /**
     * Send notification when a USER uncompletes an instruction
     * Recipients: Assigned TEAM + IMPACTED TEAMS + INSTRUCTION TEAM (if different)
     */
    static void sendInstructionUncompletedNotification(Map instruction, Map stepInstance, List<Map> teams, Integer userId = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Debug logging
                println "EmailService.sendInstructionUncompletedNotification called:"
                println "  - Instruction: ${instruction?.ini_name}"
                println "  - Step: ${stepInstance?.sti_name}"
                println "  - Teams count: ${teams?.size()}"
                println "  - UserId: ${userId}"
                println "  - StepInstance keys: ${stepInstance?.keySet()}"
                
                def recipients = extractTeamEmails(teams)
                
                println "  - Recipients extracted: ${recipients}"
                
                if (!recipients) {
                    println "EmailService: No recipients found for instruction ${instruction.ini_name}"
                    return
                }
                
                // Get email template
                def template = EmailTemplateRepository.findActiveByType(sql, 'INSTRUCTION_UNCOMPLETED')
                println "  - INSTRUCTION_UNCOMPLETED template found: ${template != null}"
                if (!template) {
                    // Fallback to INSTRUCTION_COMPLETED template if UNCOMPLETED doesn't exist
                    template = EmailTemplateRepository.findActiveByType(sql, 'INSTRUCTION_COMPLETED')
                    println "  - Fallback to INSTRUCTION_COMPLETED template found: ${template != null}"
                    if (!template) {
                        println "EmailService: No active template found for INSTRUCTION_UNCOMPLETED or INSTRUCTION_COMPLETED"
                        return
                    }
                }
                println "  - Using template type: ${template.emt_type}"
                
                // Prepare template variables - Include all variables that the template might expect
                def variables = [
                    instruction: instruction,
                    stepInstance: stepInstance,
                    completedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),  // Use completedAt for template compatibility
                    completedBy: getUsernameById(sql, userId),  // Use completedBy for template compatibility
                    actionType: 'uncompleted', // To differentiate in template
                    // Additional variables that templates might expect
                    migrationCode: stepInstance?.migration_name ?: '',
                    iterationCode: stepInstance?.iteration_name ?: '',
                    hasStepViewUrl: false,  // For now, disable URL until we implement proper URL generation
                    stepViewUrl: ''  // Empty for now
                ]
                
                // Process template
                println "  - Processing template with variables: ${variables.keySet()}"
                println "  - Template subject: ${template.emt_subject}"
                
                def processedSubject = processTemplate(template.emt_subject as String, variables)
                println "  - Subject processed successfully"
                
                def processedBody = processTemplate(template.emt_body_html as String, variables)
                println "  - Body processed successfully"
                
                // Modify subject if using the completed template as fallback
                if (template.emt_type == 'INSTRUCTION_COMPLETED') {
                    processedSubject = processedSubject.replace('Completed', 'Uncompleted')
                }
                
                // Send email
                println "  - About to send email with subject: ${processedSubject}"
                def emailSent = sendEmail(recipients, processedSubject, processedBody)
                println "  - Email sent result: ${emailSent}"
                
                // Log the notification
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        UUID.fromString(instruction.ini_id as String),
                        recipients,
                        processedSubject,
                        template.emt_id as UUID,
                        [
                            notification_type: 'INSTRUCTION_UNCOMPLETED',
                            instruction_name: instruction.ini_name,
                            step_name: stepInstance.sti_name
                        ],
                        'INSTRUCTION_INSTANCE'  // Specify entity type for instruction actions
                    )
                }
                
            } catch (Exception e) {
                logError('sendInstructionUncompletedNotification', e, [
                    instructionId: instruction.ini_id,
                    stepId: stepInstance.sti_id
                ])
                
                // Log the failure
                DatabaseUtil.withSql { errorSql ->
                    AuditLogRepository.logEmailFailed(
                        errorSql,
                        userId,
                        UUID.fromString(instruction.ini_id as String),
                        extractTeamEmails(teams),
                        "[UMIG] Instruction Uncompleted: ${instruction.ini_name}",
                        e.message,
                        'INSTRUCTION_INSTANCE'  // Specify entity type for instruction actions
                    )
                }
            }
        }
    }
    
    /**
     * Send notification when a USER changes step-level status
     * Recipients: Assigned TEAM + IMPACTED TEAMS + IT CUTOVER TEAM
     */
    static void sendStepStatusChangedNotification(Map stepInstance, List<Map> teams, Map cutoverTeam, 
                                                 String oldStatus, String newStatus, Integer userId = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Debug logging
                println "EmailService.sendStepStatusChangedNotification called:"
                println "  - Step: ${stepInstance?.sti_name}"
                println "  - Old Status: ${oldStatus}"
                println "  - New Status: ${newStatus}"
                println "  - Teams count: ${teams?.size()}"
                println "  - UserId: ${userId}"
                println "  - Teams details: ${teams}"
                
                // Include cutover team in recipients
                def allTeams = new ArrayList(teams)
                if (cutoverTeam) {
                    allTeams.add(cutoverTeam)
                }
                def recipients = extractTeamEmails(allTeams)
                
                println "  - Recipients extracted: ${recipients}"
                
                if (!recipients) {
                    println "EmailService: No recipients found for step status change ${stepInstance.sti_name}"
                    return
                }
                
                // Get email template
                def template = EmailTemplateRepository.findActiveByType(sql, 'STEP_STATUS_CHANGED')
                if (!template) {
                    println "EmailService: No active template found for STEP_STATUS_CHANGED"
                    return
                }
                
                // Prepare template variables - Include all variables that the template might expect
                def variables = [
                    stepInstance: stepInstance,
                    oldStatus: oldStatus,
                    newStatus: newStatus,
                    statusColor: getStatusColor(newStatus),
                    changedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    changedBy: getUsernameById(sql, userId),
                    // Additional variables that templates might expect
                    migrationCode: stepInstance?.migration_name ?: '',
                    iterationCode: stepInstance?.iteration_name ?: '',
                    hasStepViewUrl: false,  // For now, disable URL until we implement proper URL generation
                    stepViewUrl: ''  // Empty for now
                ]
                
                // Process template
                def processedSubject = processTemplate(template.emt_subject as String, variables)
                def processedBody = processTemplate(template.emt_body_html as String, variables)
                
                // Send email
                println "  - About to send email with subject: ${processedSubject}"
                def emailSent = sendEmail(recipients, processedSubject, processedBody)
                println "  - Email sent result: ${emailSent}"
                
                // Log the notification
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        UUID.fromString(stepInstance.sti_id as String),
                        recipients,
                        processedSubject,
                        template.emt_id as UUID,
                        [
                            notification_type: 'STEP_STATUS_CHANGED',
                            step_name: stepInstance.sti_name,
                            old_status: oldStatus,
                            new_status: newStatus
                        ]
                    )
                    
                    // Also log the status change itself
                    AuditLogRepository.logStepStatusChange(
                        sql,
                        userId,
                        UUID.fromString(stepInstance.sti_id as String),
                        oldStatus,
                        newStatus
                    )
                }
                
            } catch (Exception e) {
                logError('sendStepStatusChangedNotification', e, [
                    stepId: stepInstance.sti_id,
                    oldStatus: oldStatus,
                    newStatus: newStatus
                ])
                
                // Log the failure
                DatabaseUtil.withSql { errorSql ->
                    // Rebuild allTeams list for error logging
                    def errorTeams = new ArrayList(teams)
                    if (cutoverTeam) {
                        errorTeams.add(cutoverTeam)
                    }
                    AuditLogRepository.logEmailFailed(
                        errorSql,
                        userId,
                        UUID.fromString(stepInstance.sti_id as String),
                        extractTeamEmails(errorTeams),
                        "[UMIG] Step Status Changed: ${stepInstance.sti_name}",
                        e.message
                    )
                }
            }
        }
    }
    
    /**
     * Core email sending method using Confluence's native mail API
     * 
     * @param recipients List of email addresses
     * @param subject Email subject
     * @param body HTML email body
     * @return True if email was sent successfully
     */
    static boolean sendEmail(List<String> recipients, String subject, String body) {
        try {
            // Remove any null or empty email addresses
            def validRecipients = recipients.findAll { it && it.trim() }
            
            if (!validRecipients) {
                println "EmailService: No valid recipients found, skipping email send"
                return false
            }
            
            // Get Confluence mail server
            def mailServerManager = ComponentLocator.getComponent(ConfluenceMailServerManager)
            def mailServer = mailServerManager.getDefaultSMTPMailServer()
            
            if (!mailServer) {
                println "EmailService: No mail server configured in Confluence"
                
                // For local development, check if we're in dev mode
                if (isLocalDevelopment()) {
                    return sendEmailViaMailHog(validRecipients, subject, body)
                }
                
                throw new RuntimeException("No mail server configured")
            }
            
            // Send email to each recipient
            // Note: Confluence Email class doesn't support multiple recipients in one call
            def allSent = true
            validRecipients.each { recipient ->
                try {
                    def email = new Email(recipient)
                    email.setSubject(subject)
                    email.setBody(body)
                    email.setMimeType("text/html")
                    email.setFrom(DEFAULT_FROM_ADDRESS)
                    
                    mailServer.send(email)
                    println "EmailService: Email sent successfully to ${recipient}"
                    
                } catch (Exception e) {
                    println "EmailService: Failed to send email to ${recipient} - ${e.message}"
                    allSent = false
                }
            }
            
            return allSent
            
        } catch (Exception e) {
            println "EmailService: Failed to send email - ${e.message}"
            e.printStackTrace()
            return false
        }
    }
    
    /**
     * Send email via MailHog for local development
     * This method uses direct SMTP connection to MailHog
     */
    private static boolean sendEmailViaMailHog(List<String> recipients, String subject, String body) {
        try {
            println "EmailService: Sending via MailHog (local development mode)"
            
            // MailHog SMTP configuration
            Properties props = new Properties()
            props.put("mail.smtp.host", "localhost")
            props.put("mail.smtp.port", "1025")
            props.put("mail.smtp.auth", "false")
            props.put("mail.smtp.starttls.enable", "false")
            
            // Create session
            Session session = Session.getInstance(props)
            
            // Send to each recipient
            boolean allSent = true
            recipients.each { recipient ->
                try {
                    // Create message
                    MimeMessage message = new MimeMessage(session)
                    message.setFrom(new InternetAddress(DEFAULT_FROM_ADDRESS))
                    message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(recipient))
                    message.setSubject(subject)
                    message.setContent(body, "text/html; charset=utf-8")
                    
                    // Send message
                    Transport.send(message)
                    println "EmailService: [MAILHOG] Email sent to ${recipient}"
                    
                } catch (Exception e) {
                    println "EmailService: [MAILHOG] Failed to send to ${recipient}: ${e.message}"
                    allSent = false
                }
            }
            
            return allSent
            
        } catch (Exception e) {
            println "EmailService: Failed to send via MailHog - ${e.message}"
            e.printStackTrace()
            return false
        }
    }
    
    /**
     * Check if we're in local development mode
     */
    private static boolean isLocalDevelopment() {
        def env = System.getProperty('umig.environment', 'production')
        return env.toLowerCase() in ['local', 'development', 'dev'] || true  // Force local dev mode for testing
    }
    
    /**
     * Process a template string with Groovy's SimpleTemplateEngine
     * 
     * @param templateText The template text with ${variable} placeholders
     * @param variables Map of variables to substitute
     * @return Processed template string
     */
    private static String processTemplate(String templateText, Map variables) {
        try {
            def engine = new SimpleTemplateEngine()
            def template = engine.createTemplate(templateText)
            return template.make(variables).toString()
        } catch (Exception e) {
            println "EmailService: Template processing error - ${e.message}"
            println "EmailService: Template variables provided: ${variables.keySet()}"
            println "EmailService: Template text length: ${templateText?.length() ?: 0}"
            if (templateText && templateText.length() > 100) {
                println "EmailService: Template preview: ${templateText.substring(0, 100)}..."
            } else {
                println "EmailService: Full template: ${templateText}"
            }
            e.printStackTrace()
            throw new RuntimeException("Failed to process email template: ${e.message}", e)
        }
    }
    
    /**
     * Extract email addresses from team objects
     */
    private static List<String> extractTeamEmails(List<Map> teams) {
        return teams?.collect { team ->
            team.tms_email as String
        }?.findAll { it && it.trim() } ?: []
    }
    
    /**
     * Get username by user ID
     * 
     * @param sql Database connection
     * @param userId User ID
     * @return Username or "System" if not found
     */
    private static String getUsernameById(Sql sql, Integer userId) {
        if (!userId) {
            return "System"
        }
        
        try {
            def user = sql.firstRow('SELECT usr_username FROM users_usr WHERE usr_id = ?', [userId])
            return user?.usr_username ?: "User ${userId}"
        } catch (Exception e) {
            return "User ${userId}"
        }
    }
    
    /**
     * Get color for status display
     */
    private static String getStatusColor(String status) {
        switch (status?.toUpperCase()) {
            case 'OPEN':
            case 'IN_PROGRESS':
                return '#0052cc'
            case 'COMPLETED':
            case 'DONE':
                return '#28a745'
            case 'BLOCKED':
            case 'FAILED':
                return '#dc3545'
            default:
                return '#6c757d'
        }
    }
    
    /**
     * Log errors for debugging and monitoring
     */
    private static void logError(String method, Exception error, Map context = [:]) {
        println "EmailService ERROR in ${method}: ${error.message}"
        println "EmailService ERROR context: ${context}"
        error.printStackTrace()
    }
}