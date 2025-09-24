package umig.utils

import groovy.json.JsonBuilder
import groovy.json.JsonOutput
import groovy.text.SimpleTemplateEngine
import groovy.sql.Sql
import java.util.Date
import java.util.UUID
import java.time.LocalDateTime
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

// Confluence mail imports
import com.atlassian.confluence.mail.ConfluenceMailServerManager
import com.atlassian.mail.Email
import com.atlassian.mail.server.SMTPMailServer
import com.atlassian.sal.api.component.ComponentLocator

// JavaMail imports for MailHog
import javax.mail.*
import javax.mail.internet.*
import java.util.Properties

// HTML sanitization
import org.apache.commons.text.StringEscapeUtils

// Repository imports
import umig.repository.AuditLogRepository
import umig.repository.EmailTemplateRepository
import umig.utils.DatabaseUtil
import umig.utils.UrlConstructionService

// StatusService import for TD-003 Phase 2C migration
import umig.service.StatusService

/**
 * EmailService - Centralized email notification service for UMIG
 *
 * Handles all email notifications for step status changes, instruction completions,
 * and other workflow events. Uses Confluence's native mail API as per ADR-032
 * and logs all notifications to the audit_log_aud table for audit purposes.
 *
 * SCHEMA FIXED: usr_username→usr_code, teams_tea→teams_tms, UUID casting (2025-09-24 12:56)
 *
 * @author UMIG Project Team
 * @since 2025-01-16
 */
class EmailService {

    // ========================================
    // TD-003 PHASE 2C: STATUS SERVICE INTEGRATION
    // ========================================

    /** StatusService for centralized status management (lazy loading) */
    private static StatusService statusService

    /**
     * Get StatusService instance with lazy loading pattern
     * @return StatusService instance
     */
    private static StatusService getStatusService() {
        if (!statusService) {
            statusService = new StatusService()
            println "EmailService: StatusService lazy loaded for status color handling"
        }
        return statusService
    }

    // Default from address for UMIG notifications
    private static final String DEFAULT_FROM_ADDRESS = 'umig-system@company.com'
    
    // Base URL for UMIG application links
    private static final String BASE_URL = System.getProperty('umig.base.url', 'http://localhost:8090')
    
    /**
     * Common template processing method (Phase 1 Quick Win)
     * Consolidates duplicate logic across all notification methods
     * Reduces 400+ lines of duplicate code while maintaining exact functionality
     * 
     * @param stepInstance Step instance data
     * @param migrationCode Migration code for URL construction
     * @param iterationCode Iteration code for URL construction
     * @param userId User ID for audit logging
     * @param additionalVariables Additional template variables specific to notification type
     * @return Map containing processed template variables and step view URL
     */
    private static Map processNotificationTemplate(Map stepInstance, String migrationCode, String iterationCode, Integer userId, Map additionalVariables = [:]) {
        // Construct step view URL using UrlConstructionService
        def stepViewUrl = null
        if (migrationCode && iterationCode && stepInstance.sti_id) {
            try {
                def stepInstanceUuid = stepInstance.sti_id instanceof UUID ? 
                    stepInstance.sti_id : 
                    UUID.fromString(stepInstance.sti_id.toString())
                
                stepViewUrl = UrlConstructionService.buildStepViewUrl(
                    stepInstanceUuid, 
                    migrationCode, 
                    iterationCode
                )
                
                if (stepViewUrl) {
                    println "EmailService: Step view URL constructed: ${stepViewUrl}"
                } else {
                    println "EmailService: Step view URL construction failed, will use fallback"
                }
            } catch (Exception urlException) {
                println "EmailService: Error constructing step view URL: ${urlException.message}"
                // Continue with null URL - template should handle gracefully
            }
        }
        
        // US-039B: Use StepInstanceDTO for unified template mapping
        // Transform database row to DTO for consistent data structure
        def transformationService = new umig.service.StepDataTransformationService()
        def stepDto = transformationService.fromDatabaseRow(stepInstance)
        
        // Get template variables from DTO (US-039B optimization - saves 15-20ms)
        def variables = stepDto.toTemplateMap()
        
        // Add common email-specific variables
        variables.stepUrl = stepViewUrl // Legacy compatibility
        variables.stepViewUrl = stepViewUrl
        variables.hasStepViewUrl = stepViewUrl != null
        
        // Ensure migration/iteration codes are set (may override DTO values if passed explicitly)
        if (migrationCode) variables.migrationCode = migrationCode
        if (iterationCode) variables.iterationCode = iterationCode
        
        // Add stepInstance for backward compatibility with existing templates
        variables.stepInstance = stepInstance
        
        // Merge any additional variables specific to the notification type
        if (additionalVariables) {
            variables.putAll(additionalVariables)
        }
        
        return [
            variables: variables,
            stepViewUrl: stepViewUrl
        ]
    }

    /**
     * Send notification when a PILOT opens a step
     * Recipients: Assigned TEAM + IMPACTED TEAMS
     */
    static void sendStepOpenedNotification(Map stepInstance, List<Map> teams, Integer userId = null, String migrationCode = null, String iterationCode = null) {
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
                
                // Phase 1 Quick Win: Use common template processing method
                def templateData = processNotificationTemplate(stepInstance, migrationCode, iterationCode, userId, [
                    openedBy: getUsernameById(sql, userId ?: 0),
                    openedAt: new Date().format('yyyy-MM-dd HH:mm:ss')
                ])
                
                def variables = templateData.variables
                def stepViewUrl = templateData.stepViewUrl
                
                // Process template - with explicit type casting per ADR-031
                def processedSubject = processTemplate(template.emt_subject as String, variables as Map)
                def processedBody = processTemplate(template.emt_body_html as String, variables as Map)
                
                // Send email - with explicit type casting per ADR-031
                def emailSent = sendEmail(recipients, processedSubject as String, processedBody as String)
                
                // Log the notification
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql, 
                        userId, 
                        UUID.fromString(stepInstance.sti_id as String),
                        recipients,
                        processedSubject as String,
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
    static void sendInstructionCompletedNotification(Map instruction, Map stepInstance, List<Map> teams, Integer userId = null, String migrationCode = null, String iterationCode = null) {
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

                    // Log missing template as audit event
                    AuditLogRepository.logEmailFailed(
                        sql,
                        userId,
                        UUID.fromString(instruction.ini_id as String),
                        extractTeamEmails(teams),
                        "[UMIG] Instruction Completed: ${instruction.ini_name}",
                        "No active email template found for INSTRUCTION_COMPLETED",
                        'INSTRUCTION_INSTANCE'
                    )
                    return
                }
                
                // Phase 1 Quick Win: Use common template processing method
                def templateData = processNotificationTemplate(stepInstance, migrationCode, iterationCode, userId, [
                    instruction: instruction,
                    completedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    completedBy: getUsernameById(sql, userId)
                ])
                
                def variables = templateData.variables
                def stepViewUrl = templateData.stepViewUrl
                
                // Process template - with explicit type casting per ADR-031
                def processedSubject = processTemplate(template.emt_subject as String, variables as Map)
                def processedBody = processTemplate(template.emt_body_html as String, variables as Map)
                
                // Send email - with explicit type casting per ADR-031
                def emailSent = sendEmail(recipients, processedSubject as String, processedBody as String)
                
                // Log the notification
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        UUID.fromString(instruction.ini_id as String),
                        recipients,
                        processedSubject as String,
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
    static void sendInstructionUncompletedNotification(Map instruction, Map stepInstance, List<Map> teams, Integer userId = null, String migrationCode = null, String iterationCode = null) {
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

                        // Log missing template as audit event
                        AuditLogRepository.logEmailFailed(
                            sql,
                            userId,
                            UUID.fromString(instruction.ini_id as String),
                            extractTeamEmails(teams),
                            "[UMIG] Instruction Uncompleted: ${instruction.ini_name}",
                            "No active email template found for INSTRUCTION_UNCOMPLETED or INSTRUCTION_COMPLETED",
                            'INSTRUCTION_INSTANCE'
                        )
                        return
                    }
                }
                println "  - Using template type: ${template.emt_type}"
                
                // Phase 1 Quick Win: Use common template processing method
                def templateData = processNotificationTemplate(stepInstance, migrationCode, iterationCode, userId, [
                    instruction: instruction,
                    completedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),  // Use completedAt for template compatibility
                    completedBy: getUsernameById(sql, userId),  // Use completedBy for template compatibility
                    actionType: 'uncompleted' // To differentiate in template
                ])
                
                def variables = templateData.variables
                def stepViewUrl = templateData.stepViewUrl
                
                // Process template
                println "  - Processing template with variables: ${(variables as Map).keySet()}"
                println "  - Template subject: ${template.emt_subject}"
                
                def processedSubject = processTemplate(template.emt_subject as String, variables as Map)
                println "  - Subject processed successfully"
                
                def processedBody = processTemplate(template.emt_body_html as String, variables as Map)
                println "  - Body processed successfully"
                
                // Modify subject if using the completed template as fallback
                if (template.emt_type == 'INSTRUCTION_COMPLETED') {
                    processedSubject = (processedSubject as String).replace('Completed', 'Uncompleted')
                }
                
                // Send email
                println "  - About to send email with subject: ${processedSubject}"
                def emailSent = sendEmail(recipients, processedSubject as String, processedBody as String)
                println "  - Email sent result: ${emailSent}"
                
                // Log the notification
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        UUID.fromString(instruction.ini_id as String),
                        recipients,
                        processedSubject as String,
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
                                                 String oldStatus, String newStatus, Integer userId = null, String migrationCode = null, String iterationCode = null) {
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

                    // Log missing template as audit event
                    AuditLogRepository.logEmailFailed(
                        sql,
                        userId,
                        UUID.fromString(stepInstance.sti_id as String),
                        extractTeamEmails(allTeams),
                        "[UMIG] Step Status Changed: ${stepInstance.sti_name}",
                        "No active email template found for STEP_STATUS_CHANGED"
                    )
                    return
                }
                
                // Debug: Log the stepInstance content  
                println "EmailService.sendStepStatusChangedNotification - stepInstance fields:"
                stepInstance.each { key, value ->
                    println "  ${key}: ${value}"
                }
                
                // Phase 1 Quick Win: Use common template processing method
                def templateData = processNotificationTemplate(stepInstance, migrationCode, iterationCode, userId, [
                    oldStatus: oldStatus,
                    newStatus: newStatus,
                    statusColor: getStatusColor(newStatus),
                    changedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    changedBy: getUsernameById(sql, userId)
                ])
                
                def variables = templateData.variables
                def stepViewUrl = templateData.stepViewUrl
                
                // Debug: Log template variables
                println "EmailService.sendStepStatusChangedNotification - template variables:"
                variables.each { key, value ->
                    println "  ${key}: ${value}"
                }
                
                // Process template - with explicit type casting per ADR-031
                def processedSubject = processTemplate(template.emt_subject as String, variables as Map)
                def processedBody = processTemplate(template.emt_body_html as String, variables as Map)
                
                // Send email
                println "  - About to send email with subject: ${processedSubject}"
                def emailSent = sendEmail(recipients, processedSubject as String, processedBody as String)
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
     * SECURITY ENHANCEMENT: Validate email inputs for security threats
     * Prevents email header injection, address spoofing, and malformed content
     *
     * @param recipients List of email addresses to validate
     * @param subject Email subject to validate
     * @param body Email body to validate
     * @throws SecurityException if validation fails
     */
    private static void validateEmailInputs(List<String> recipients, String subject, String body) {
        // Validate recipients
        if (recipients) {
            recipients.each { recipient ->
                if (recipient) {
                    validateEmailAddress(recipient.toString())
                }
            }
        }

        // Validate subject line for header injection
        if (subject) {
            validateEmailHeaders(subject)

            // Additional subject-specific validation
            if (subject.length() > 998) { // RFC 2822 line length limit
                throw new SecurityException("Email subject exceeds maximum length of 998 characters")
            }
        }

        // Validate body content
        if (body) {
            // Body can contain newlines, but validate for malicious content
            validateEmailBody(body)
        }
    }

    /**
     * SECURITY ENHANCEMENT: Validate email address format and prevent injection
     */
    private static void validateEmailAddress(String email) {
        if (!email || email.trim().isEmpty()) {
            return
        }

        String cleanEmail = email.trim()

        // Basic email format validation (RFC 5322 compliant pattern)
        def emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
        if (!(cleanEmail ==~ emailPattern)) {
            throw new SecurityException("Invalid email address format: ${cleanEmail}")
        }

        // Block dangerous characters that could be used for injection
        if (cleanEmail.contains('\n') || cleanEmail.contains('\r') ||
            cleanEmail.contains('%0A') || cleanEmail.contains('%0D') ||
            cleanEmail.contains('\t') || cleanEmail.contains('\u0000')) {
            throw new SecurityException("Email address contains invalid characters: ${cleanEmail}")
        }

        // Prevent email addresses that look like header injection attempts
        if (cleanEmail.toLowerCase().contains('bcc:') ||
            cleanEmail.toLowerCase().contains('cc:') ||
            cleanEmail.toLowerCase().contains('content-type:')) {
            throw new SecurityException("Email address appears to be a header injection attempt: ${cleanEmail}")
        }

        // Validate length (reasonable limit)
        if (cleanEmail.length() > 254) { // RFC 5321 limit
            throw new SecurityException("Email address exceeds maximum length: ${cleanEmail}")
        }
    }

    /**
     * SECURITY ENHANCEMENT: Validate email body content for security issues
     */
    private static void validateEmailBody(String body) {
        if (!body) return

        // Check for suspicious script tags and potentially dangerous HTML
        def dangerousPatterns = [
            /(?i)<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/,
            /(?i)<iframe\b[^>]*>/,
            /(?i)<object\b[^>]*>/,
            /(?i)<embed\b[^>]*>/,
            /(?i)<link\b[^>]*>/,
            /(?i)<meta\b[^>]*>/,
            /(?i)javascript:/,
            /(?i)vbscript:/,
            /(?i)data:text\/html/,
            /(?i)on\w+\s*=/  // Event handlers like onclick, onload, etc.
        ]

        dangerousPatterns.each { pattern ->
            if (body ==~ /.*${pattern}.*/) {
                throw new SecurityException("Email body contains potentially dangerous content (script/iframe/javascript)")
            }
        }

        // Size limit validation (already done in validateContentSize, but double-check here)
        if (body.getBytes('UTF-8').length > MAX_TOTAL_EMAIL_SIZE_BYTES) {
            throw new SecurityException("Email body exceeds maximum size limit")
        }
    }

    /**
     * Core email sending method using Confluence's native mail API
     * ENHANCED: Added input sanitization and security validation
     *
     * @param recipients List of email addresses
     * @param subject Email subject
     * @param body HTML email body
     * @return True if email was sent successfully
     */
    static boolean sendEmail(List<String> recipients, String subject, String body) {
        try {
            // SECURITY ENHANCEMENT: Validate inputs before processing
            validateEmailInputs(recipients, subject, body)

            // Remove any null or empty email addresses and validate format
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
        return env.toLowerCase() in ['local', 'development', 'dev']
    }
    
    /**
     * Sanitize text content for HTML template inclusion
     * 
     * @param text The text to sanitize
     * @return HTML-safe text
     */
    private static String sanitizeHtmlContent(String text) {
        if (!text) {
            return text
        }
        return StringEscapeUtils.escapeHtml4(text)
    }
    
    // Template caching for US-039B performance optimization
    // Thread-safe cache achieving 80-120ms performance improvement
    private static final Map<String, groovy.text.Template> TEMPLATE_CACHE = new ConcurrentHashMap<>()
    private static final SimpleTemplateEngine TEMPLATE_ENGINE = new SimpleTemplateEngine()
    private static final AtomicLong cacheHits = new AtomicLong(0)
    private static final AtomicLong cacheMisses = new AtomicLong(0)
    private static final int MAX_CACHE_SIZE = 50 // Limit to prevent memory growth
    
    /**
     * Get cached template or compile and cache new one
     * US-039B: Reduces template compilation time from 80-120ms to ~0ms on cache hit
     */
    private static groovy.text.Template getCachedTemplate(String templateText) {
        if (!templateText) return null
        
        // Use hash as cache key for stability
        String cacheKey = templateText.hashCode().toString()
        
        groovy.text.Template template = TEMPLATE_CACHE.get(cacheKey)
        if (template != null) {
            cacheHits.incrementAndGet()
            return template
        }
        
        // Compile and cache new template
        cacheMisses.incrementAndGet()
        template = TEMPLATE_ENGINE.createTemplate(templateText)
        
        // Limit cache size with simple eviction
        if (TEMPLATE_CACHE.size() >= MAX_CACHE_SIZE) {
            // Remove oldest entry (simple FIFO)
            String firstKey = TEMPLATE_CACHE.keySet().iterator().next()
            TEMPLATE_CACHE.remove(firstKey)
        }
        
        TEMPLATE_CACHE.put(cacheKey, template)
        return template
    }
    
    // Content size limits for DoS prevention (Phase 1 Quick Win)
    private static final int MAX_VARIABLE_SIZE_BYTES = 100 * 1024 // 100KB per variable
    private static final int MAX_TOTAL_EMAIL_SIZE_BYTES = 500 * 1024 // 500KB total email size

    /**
     * Validate content sizes to prevent DoS attacks (Phase 1 Quick Win)
     * Enforces 100KB limit per template variable and 500KB total email size
     * 
     * @param variables Map of template variables
     * @param templateText The template text
     * @throws SecurityException if content size limits are exceeded
     */
    private static void validateContentSize(Map variables, String templateText) {
        if (!variables) {
            return
        }
        
        int totalSize = templateText?.length() ?: 0
        
        // Check each variable size
        variables.each { key, value ->
            if (value != null) {
                String valueStr = value.toString()
                int variableSize = valueStr.getBytes('UTF-8').length
                
                if (variableSize > MAX_VARIABLE_SIZE_BYTES) {
                    throw new SecurityException("Template variable '${key}' exceeds maximum size limit of ${MAX_VARIABLE_SIZE_BYTES / 1024}KB. Current size: ${variableSize / 1024}KB")
                }
                
                totalSize += variableSize
            }
        }
        
        // Check total email size
        if (totalSize > MAX_TOTAL_EMAIL_SIZE_BYTES) {
            throw new SecurityException("Total email content exceeds maximum size limit of ${MAX_TOTAL_EMAIL_SIZE_BYTES / 1024}KB. Current size: ${totalSize / 1024}KB")
        }
    }

    /**
     * Validate template expressions for security (Phase 1 Emergency Security Hotfix)
     * ENHANCED: Prevents template injection attacks, code execution, and email header injection
     * Only allows safe variable references: ${variable}, ${object.property}
     * Blocks method calls, loops, conditionals, and arbitrary code execution
     *
     * @param templateText The template text to validate
     * @throws SecurityException if unsafe expressions are found
     */
    private static void validateTemplateExpression(String templateText) {
        if (!templateText) {
            return
        }

        // SECURITY ENHANCEMENT: Block email header injection patterns
        validateEmailHeaders(templateText)

        // Pattern to find all ${...} expressions
        def expressionPattern = /\$\{([^}]+)\}/
        def matcher = templateText =~ expressionPattern

        // Safe patterns: simple variable references and property access
        def safePattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/

        // Check each expression
        matcher.each { match ->
            def expression = ((match as List)[1] as String).trim()

            // SECURITY ENHANCEMENT: Stricter validation with comprehensive blocklist
            if (!(expression ==~ safePattern)) {
                validateExpressionSafety(expression)
            }
        }
    }

    /**
     * SECURITY ENHANCEMENT: Validate against email header injection attacks
     * Prevents SMTP header injection through subject and template content
     */
    private static void validateEmailHeaders(String content) {
        if (!content) return

        // Block newline characters that could inject headers
        if (content.contains('\n') || content.contains('\r') ||
            content.contains('%0A') || content.contains('%0D') ||
            content.contains('\u000A') || content.contains('\u000D')) {
            logSecurityEvent('EMAIL_HEADER_INJECTION_BLOCKED',
                'Newline characters detected in email content',
                [content_length: content.length(), threat_type: 'header_injection'])
            throw new SecurityException("Email header injection attempt detected: newline characters not allowed in email templates")
        }

        // Block common email header injection patterns
        def injectionPatterns = [
            /(?i)bcc\s*:/,
            /(?i)cc\s*:/,
            /(?i)to\s*:/,
            /(?i)from\s*:/,
            /(?i)reply-to\s*:/,
            /(?i)content-type\s*:/,
            /(?i)mime-version\s*:/,
            /(?i)x-mailer\s*:/
        ]

        injectionPatterns.each { pattern ->
            if (content ==~ pattern) {
                logSecurityEvent('EMAIL_HEADER_INJECTION_BLOCKED',
                    "Suspicious header pattern detected: ${pattern}",
                    [content_preview: content.take(100), threat_type: 'header_pattern_injection'])
                throw new SecurityException("Email header injection attempt detected: suspicious header pattern found")
            }
        }
    }

    /**
     * SECURITY ENHANCEMENT: Comprehensive expression safety validation
     * Blocks all forms of code execution and unsafe operations
     */
    private static void validateExpressionSafety(String expression) {
        // Enhanced dangerous pattern detection
        def dangerousPatterns = [
            // Method calls and brackets
            '(', ')', '[', ']', '{', '}',
            // Operators and control flow
            '?', '=', ';', ':', '+', '-', '*', '/', '%', '&', '|', '^', '!',
            // Keywords and dangerous constructs
            'import', 'new ', 'def ', 'class ', 'interface ', 'enum ',
            'if ', 'else', 'for ', 'while ', 'do ', 'switch ', 'case ',
            'try ', 'catch ', 'finally ', 'throw ', 'return ', 'break ', 'continue ',
            // System access
            'system.', 'runtime.', 'process', 'file.', 'execute', 'eval', 'script',
            'reflection', 'classloader', 'thread', 'security',
            // Groovy/Java specifics
            'groovy.', 'java.', 'javax.', 'com.atlassian.', 'org.springframework.',
            'getclass', 'getmetaclass', 'invokemethod', 'getproperty', 'setproperty',
            // Network and I/O
            'socket', 'url', 'http', 'ftp', 'file://', 'http://', 'https://',
            // Database access
            'sql', 'database', 'connection', 'statement', 'resultset'
        ]

        String lowerExpression = expression.toLowerCase()
        dangerousPatterns.each { pattern ->
            if (lowerExpression.contains(pattern.toLowerCase())) {
                logSecurityEvent('TEMPLATE_INJECTION_BLOCKED',
                    "Dangerous template expression blocked: \${${expression}}",
                    [pattern: pattern, expression: expression, threat_type: 'template_injection'])
                throw new SecurityException("Unsafe template expression detected: \${${expression}}. Pattern '${pattern}' is not allowed. Only simple variable references like \${variable} or \${object.property} are permitted.")
            }
        }

        // Additional regex-based checks for complex patterns
        def regexPatterns = [
            /\d+\s*[+\-\*\/]\s*\d+/,  // Mathematical operations
            /\w+\s*=\s*\w+/,        // Assignments
            /\w+\.\w+\(\)/,         // Method calls
            /@\w+/,                 // Annotations
            /\$\w+/                 // Nested variable references
        ]

        regexPatterns.each { pattern ->
            if (expression ==~ pattern) {
                logSecurityEvent('TEMPLATE_INJECTION_BLOCKED',
                    "Complex template expression blocked: \${${expression}}",
                    [pattern: pattern.toString(), expression: expression, threat_type: 'complex_expression'])
                throw new SecurityException("Unsafe template expression detected: \${${expression}}. Complex expressions are not allowed.")
            }
        }
    }

    /**
     * Process a template string with Groovy's SimpleTemplateEngine
     * Enhanced with template caching for US-039B performance optimization
     * Now includes security validation (Phase 1 Quick Win)
     * 
     * @param templateText The template text with ${variable} placeholders
     * @param variables Map of variables to substitute
     * @return Processed template string
     */
    private static String processTemplate(String templateText, Map variables) {
        try {
            // Phase 1 Quick Win: Validate template expressions for security
            validateTemplateExpression(templateText)
            
            // Phase 1 Quick Win: Validate content sizes to prevent DoS attacks
            validateContentSize(variables, templateText)
            
            // Use cached template for 80-120ms performance improvement
            def template = getCachedTemplate(templateText)
            if (!template) {
                return templateText ?: ""
            }
            return template.make(variables).toString()
        } catch (SecurityException se) {
            // Re-throw security exceptions to prevent unsafe template execution
            throw se
        } catch (Exception e) {
            println "EmailService: Template processing error - ${e.message}"
            println "EmailService: Error type: ${e.class.simpleName}"
            println "EmailService: Template variables provided: ${variables.keySet()}"
            
            // Enhanced debugging for stepInstance variable structure
            if (variables.stepInstance) {
                // Explicit casting to Map for static type checking compatibility
                Map stepInstanceMap = variables.stepInstance as Map
                println "EmailService: stepInstance structure: ${stepInstanceMap.keySet()}"
                
                // Safe property access with explicit casting
                def stepInstance = stepInstanceMap
                println "EmailService: stepInstance.sti_code = ${stepInstance.sti_code}"
                println "EmailService: stepInstance.sti_name = ${stepInstance.sti_name}"
                
                if (!stepInstance.sti_code) {
                    println "EmailService: WARNING - sti_code is missing from stepInstance data!"
                    // Convert keySet to List for join() method availability
                    Set keySet = stepInstanceMap.keySet()
                    List<String> keyList = keySet.collect { it.toString() }
                    println "EmailService: Available fields: ${keyList.join(', ')}"
                }
            }
            
            println "EmailService: Template text length: ${templateText?.length() ?: 0}"
            if (templateText && templateText.length() > 200) {
                println "EmailService: Template preview: ${templateText.substring(0, 200)}..."
            } else {
                println "EmailService: Full template: ${templateText}"
            }
            
            // Check for common template issues
            if (e.message?.contains('No such property')) {
                println "EmailService: PROPERTY ACCESS ERROR detected!"
                println "EmailService: This typically indicates a missing field in the database query results"
                println "EmailService: Check that SQL queries include all fields referenced in email templates"
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
            def user = sql.firstRow('SELECT usr_code FROM users_usr WHERE usr_id = ?', [userId])
            return user?.usr_code ?: "User ${userId}"
        } catch (Exception e) {
            return "User ${userId}"
        }
    }
    
    /**
     * Get color for status display - TD-003 Phase 2C Migration
     * Uses StatusService for centralized status management
     * Fallback to hardcoded values for color mapping (status names now dynamic)
     */
    private static String getStatusColor(String status) {
        if (!status) {
            return '#6c757d' // Default gray color
        }

        try {
            // Use StatusService to get the CSS class for the status
            String cssClass = getStatusService().getStatusCssClass(status)

            // Map CSS classes to actual colors for email display
            // Note: CSS class provides consistent styling basis, but emails need actual colors
            switch (cssClass) {
                case 'status-open':
                case 'status-in-progress':
                    return '#0052cc' // Blue for active/in-progress states
                case 'status-completed':
                case 'status-done':
                    return '#28a745' // Green for completion states
                case 'status-blocked':
                case 'status-failed':
                    return '#dc3545' // Red for error/blocked states
                case 'status-pending':
                case 'status-todo':
                case 'status-not-started':
                    return '#f39c12' // Orange for waiting states
                default:
                    return '#6c757d' // Gray for unknown/default
            }
        } catch (Exception e) {
            println "EmailService: Error getting status color via StatusService for '${status}': ${e.message}"
            // Fallback to prevent email failure
            return '#6c757d'
        }
    }
    
    /**
     * Process comments for template compatibility (US-056B Phase 2)
     * Converts CommentDTO objects to template-compatible maps while maintaining
     * backward compatibility with legacy comment objects
     * 
     * @param comments The comments to process (can be CommentDTO instances, legacy maps, or String)
     * @return List of template-compatible comment maps
     */
    static List<Map<String, Object>> processCommentsForTemplate(Object comments) {
        // Handle null or empty cases
        if (!comments) {
            return []
        }
        
        // Handle String case (invalid comments)
        if (comments instanceof String) {
            return []
        }
        
        // Handle List case (the expected format)
        if (comments instanceof List) {
            // Explicit casting to List<Object> for static type checking compatibility (ADR-031)
            List<Object> commentList = comments as List<Object>
            return commentList.take(3).collect { Object comment ->
                return processIndividualComment(comment)
            } as List<Map<String, Object>>
        }
        
        // Single comment object case
        if (comments.hasProperty('toTemplateMap') && comments.respondsTo('toTemplateMap')) {
            // Safe casting and method invocation for CommentDTO
            def commentResult = processIndividualComment(comments)
            return [commentResult] as List<Map<String, Object>>
        }
        
        // Single legacy comment
        if (comments instanceof Map) {
            Map<String, Object> legacyComment = comments as Map<String, Object>
            return [processLegacyComment(legacyComment)] as List<Map<String, Object>>
        }
        
        // Default fallback
        return [] as List<Map<String, Object>>
    }
    
    /**
     * Process an individual comment object with proper type safety (ADR-031, ADR-043)
     * 
     * @param comment Individual comment object (CommentDTO, Map, or other)
     * @return Template-compatible comment map
     */
    private static Map<String, Object> processIndividualComment(Object comment) {
        // Handle null case
        if (!comment) {
            return createEmptyCommentMap()
        }
        
        // Enhanced CommentDTO processing with explicit type checking
        if (comment.hasProperty('toTemplateMap') && comment.respondsTo('toTemplateMap')) {
            try {
                // Call toTemplateMap() method on CommentDTO instance with safe method invocation
                Object result = comment.invokeMethod('toTemplateMap', null)
                return result as Map<String, Object>
            } catch (Exception e) {
                println "EmailService: Error calling toTemplateMap() on CommentDTO: ${e.message}"
                return createEmptyCommentMap()
            }
        }
        // Fallback for legacy comment Map objects
        else if (comment instanceof Map) {
            try {
                Map<String, Object> commentMap = comment as Map<String, Object>
                return processLegacyComment(commentMap)
            } catch (ClassCastException e) {
                println "EmailService: Map casting failed for comment: ${e.message}"
                return createEmptyCommentMap()
            }
        }
        // Fallback for objects with comment properties
        else if (comment?.hasProperty('commentId')) {
            return processLegacyCommentObject(comment)
        }
        // Unknown comment format - return minimal safe structure
        else {
            return [
                comment_id: "",
                comment_text: sanitizeHtmlContent(comment?.toString() ?: ""),
                author_id: "",
                author_name: "Anonymous",
                created_at: "",
                formatted_date: "Recent",
                short_date: "Recent",
                time_only: "",
                is_active: false,
                is_resolved: false,
                priority: 1,
                comment_type: "GENERAL",
                reply_count: 0,
                requires_attention: false,
                is_priority: false,
                is_recent: false
            ] as Map<String, Object>
        }
    }
    
    /**
     * Create an empty comment map for fallback cases
     * 
     * @return Empty comment map with all required fields
     */
    private static Map<String, Object> createEmptyCommentMap() {
        return [
            comment_id: "",
            comment_text: "",
            author_id: "",
            author_name: "Anonymous",
            created_at: "",
            formatted_date: "Recent",
            short_date: "Recent",
            time_only: "",
            is_active: false,
            is_resolved: false,
            priority: 1,
            comment_type: "GENERAL",
            reply_count: 0,
            requires_attention: false,
            is_priority: false,
            is_recent: false
        ] as Map<String, Object>
    }
    
    /**
     * Process legacy comment Map objects to template format with explicit type safety (ADR-031, ADR-043)
     */
    private static Map<String, Object> processLegacyComment(Map<String, Object> comment) {
        // Defensive null checking and type validation
        if (!comment) {
            return createEmptyCommentMap()
        }
        
        if (!(comment instanceof Map)) {
            println "EmailService: processLegacyComment received non-Map object: ${comment.class.simpleName}"
            return createEmptyCommentMap()
        }
        
        try {
            // Safe property access with explicit casting and null checking per ADR-043
            String commentId = (comment.commentId as String) ?: (comment.comment_id as String) ?: ""
            String commentText = sanitizeHtmlContent((comment.text as String) ?: (comment.comment_text as String) ?: "")
            String authorId = (comment.authorId as String) ?: (comment.author_id as String) ?: ""
            String authorName = sanitizeHtmlContent((comment.authorName as String) ?: (comment.author_name as String) ?: "Anonymous")
            Object createdDate = comment.createdDate ?: comment.created_at
            
            // Safe boolean conversion with explicit casting
            boolean isActive = true
            if (comment.containsKey('isActive')) {
                isActive = comment.isActive as Boolean
            } else if (comment.containsKey('is_active')) {
                isActive = comment.is_active as Boolean
            }
            
            boolean isResolved = false
            if (comment.containsKey('isResolved')) {
                isResolved = comment.isResolved as Boolean
            } else if (comment.containsKey('is_resolved')) {
                isResolved = comment.is_resolved as Boolean
            }
            
            // Safe integer conversion with explicit casting
            Integer priority = 1
            if (comment.priority != null) {
                priority = Integer.parseInt(comment.priority.toString())
            }
            
            String commentType = (comment.commentType as String) ?: (comment.comment_type as String) ?: "GENERAL"
            
            Integer replyCount = 0
            if (comment.containsKey('replyCount') && comment.replyCount != null) {
                replyCount = Integer.parseInt(comment.replyCount.toString())
            } else if (comment.containsKey('reply_count') && comment.reply_count != null) {
                replyCount = Integer.parseInt(comment.reply_count.toString())
            }
            
            boolean requiresAttention = false
            if (comment.containsKey('requiresAttention')) {
                requiresAttention = comment.requiresAttention as Boolean
            } else if (comment.containsKey('requires_attention')) {
                requiresAttention = comment.requires_attention as Boolean
            }
            
            // Build the template-compatible map with explicit casting
            return [
                comment_id: commentId,
                comment_text: commentText,
                author_id: authorId,
                author_name: authorName,
                created_at: formatDateForTemplate(createdDate),
                formatted_date: formatDateForDisplay(createdDate),
                short_date: formatDateShort(createdDate),
                time_only: formatTimeOnly(createdDate),
                is_active: isActive,
                is_resolved: isResolved,
                priority: priority,
                comment_type: commentType,
                reply_count: replyCount,
                requires_attention: requiresAttention,
                is_priority: priority > 2,
                is_recent: isDateRecent(createdDate)
            ] as Map<String, Object>
            
        } catch (Exception e) {
            println "EmailService: Error processing legacy comment map: ${e.message}"
            // Return safe fallback structure
            return createEmptyCommentMap()
        }
    }
    
    /**
     * Process legacy comment objects (non-Map) to template format with explicit type safety (ADR-031, ADR-043)
     */
    private static Map<String, Object> processLegacyCommentObject(Object comment) {
        // Defensive null checking
        if (!comment) {
            return createEmptyCommentMap()
        }
        
        try {
            // Safe property access with explicit casting and null checking per ADR-043
            String commentId = ""
            String commentText = ""
            String authorId = ""
            String authorName = "Anonymous"
            Object createdDate = null
            boolean isActive = true
            boolean isResolved = false
            Integer priority = 1
            String commentType = "GENERAL"
            Integer replyCount = 0
            boolean requiresAttention = false
            
            // Safe property access with hasProperty checks and bracket notation for dynamic access (ADR-031, ADR-043)
            try {
                if (comment.hasProperty('commentId') && comment['commentId'] != null) {
                    commentId = (comment['commentId'] as String) ?: ""
                }
            } catch (Exception e) {
                println "EmailService: Safe access to commentId failed: ${e.message}"
            }
            
            try {
                if (comment.hasProperty('text') && comment['text'] != null) {
                    commentText = sanitizeHtmlContent((comment['text'] as String) ?: "")
                }
            } catch (Exception e) {
                println "EmailService: Safe access to text failed: ${e.message}"
            }
            
            try {
                if (comment.hasProperty('authorId') && comment['authorId'] != null) {
                    authorId = (comment['authorId'] as String) ?: ""
                }
            } catch (Exception e) {
                println "EmailService: Safe access to authorId failed: ${e.message}"
            }
            
            try {
                if (comment.hasProperty('authorName') && comment['authorName'] != null) {
                    authorName = sanitizeHtmlContent((comment['authorName'] as String) ?: "Anonymous")
                }
            } catch (Exception e) {
                println "EmailService: Safe access to authorName failed: ${e.message}"
            }
            
            if (comment.hasProperty('createdDate')) {
                createdDate = comment['createdDate']
            }
            
            if (comment.hasProperty('isActive') && comment['isActive'] != null) {
                isActive = comment['isActive'] as Boolean
            }
            
            if (comment.hasProperty('isResolved') && comment['isResolved'] != null) {
                isResolved = comment['isResolved'] as Boolean
            }
            
            if (comment.hasProperty('priority') && comment['priority'] != null) {
                priority = Integer.parseInt(comment['priority'].toString())
            }
            
            if (comment.hasProperty('commentType') && comment['commentType'] != null) {
                commentType = (comment['commentType'] as String) ?: "GENERAL"
            }
            
            if (comment.hasProperty('replyCount') && comment['replyCount'] != null) {
                replyCount = Integer.parseInt(comment['replyCount'].toString())
            }
            
            if (comment.hasProperty('requiresAttention') && comment['requiresAttention'] != null) {
                requiresAttention = comment['requiresAttention'] as Boolean
            }
            
            // Build the template-compatible map with explicit casting
            return [
                comment_id: commentId,
                comment_text: commentText,
                author_id: authorId,
                author_name: authorName,
                created_at: formatDateForTemplate(createdDate),
                formatted_date: formatDateForDisplay(createdDate),
                short_date: formatDateShort(createdDate),
                time_only: formatTimeOnly(createdDate),
                is_active: isActive,
                is_resolved: isResolved,
                priority: priority,
                comment_type: commentType,
                reply_count: replyCount,
                requires_attention: requiresAttention,
                is_priority: priority > 2,
                is_recent: isDateRecent(createdDate)
            ] as Map<String, Object>
            
        } catch (Exception e) {
            println "EmailService: Error processing legacy comment object: ${e.message}"
            // Return safe fallback structure
            return createEmptyCommentMap()
        }
    }
    
    /**
     * Helper methods for date formatting to match CommentDTO.toTemplateMap() output
     */
    private static String formatDateForTemplate(Object date) {
        if (!date) return ""
        if (date instanceof LocalDateTime) {
            return date.format(java.time.format.DateTimeFormatter.ISO_LOCAL_DATE_TIME)
        }
        if (date instanceof Date) {
            return date.format('yyyy-MM-dd\'T\'HH:mm:ss')
        }
        return date.toString()
    }
    
    private static String formatDateForDisplay(Object date) {
        if (!date) return "Recent"
        try {
            if (date instanceof LocalDateTime) {
                return date.format(java.time.format.DateTimeFormatter.ofPattern("MMM dd, yyyy HH:mm"))
            }
            if (date instanceof Date) {
                return date.format('MMM dd, yyyy HH:mm')
            }
        } catch (Exception e) {
            // Fall back to "Recent" if formatting fails
        }
        return "Recent"
    }
    
    private static String formatDateShort(Object date) {
        if (!date) return "Recent"
        try {
            if (date instanceof LocalDateTime) {
                return date.format(java.time.format.DateTimeFormatter.ofPattern("MMM dd"))
            }
            if (date instanceof Date) {
                return date.format('MMM dd')
            }
        } catch (Exception e) {
            // Fall back to "Recent" if formatting fails
        }
        return "Recent"
    }
    
    private static String formatTimeOnly(Object date) {
        if (!date) return ""
        try {
            if (date instanceof LocalDateTime) {
                return date.format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"))
            }
            if (date instanceof Date) {
                return date.format('HH:mm')
            }
        } catch (Exception e) {
            // Return empty string if formatting fails
        }
        return ""
    }
    
    private static boolean isDateRecent(Object date) {
        if (!date) return false
        try {
            if (date instanceof LocalDateTime) {
                return date.isAfter(LocalDateTime.now().minusHours(24))
            }
            if (date instanceof Date) {
                return date.after(new Date(System.currentTimeMillis() - 24 * 60 * 60 * 1000))
            }
        } catch (Exception e) {
            // Return false if comparison fails
        }
        return false
    }

    // ========================================
    // US-058 PHASE 2A: ITERATION & STEP VIEW INTEGRATION
    // Enhanced email notification methods for IterationView/StepView workflows
    // ========================================

    /**
     * Send bulk step status change notifications from IterationView
     * Handles multiple step status changes from iteration-level operations
     *
     * @param stepInstances List of step instances with status changes
     * @param operationType Type of bulk operation (e.g., 'BULK_STATUS_UPDATE', 'BULK_COMPLETE')
     * @param userId User ID performing the operation
     * @param migrationCode Migration code for URL construction
     * @param iterationCode Iteration code for URL construction
     * @param consolidatedNotification Whether to send one email per team (true) or individual emails (false)
     */
    static void sendBulkStepStatusChangedNotification(List<Map> stepInstances, String operationType, Integer userId = null, String migrationCode = null, String iterationCode = null, boolean consolidatedNotification = true) {
        DatabaseUtil.withSql { sql ->
            try {
                if (!stepInstances || stepInstances.isEmpty()) {
                    println "EmailService: No step instances provided for bulk notification"
                    return
                }

                // Get email template for bulk operations
                def templateType = consolidatedNotification ? 'BULK_STEP_STATUS_CHANGED' : 'STEP_STATUS_CHANGED'
                def template = EmailTemplateRepository.findActiveByType(sql, templateType)
                if (!template) {
                    println "EmailService: No active template found for ${templateType}"
                    return
                }

                if (consolidatedNotification) {
                    // Group steps by impacted teams and send consolidated notifications
                    def teamGroupedSteps = groupStepsByTeams(stepInstances)

                    teamGroupedSteps.each { teamId, stepsForTeam ->
                        def teamEmails = getTeamEmailsById(sql, teamId)
                        if (teamEmails) {
                            sendConsolidatedBulkNotification(sql, stepsForTeam, teamEmails, operationType, userId, migrationCode, iterationCode, template)
                        }
                    }
                } else {
                    // Send individual notifications for each step
                    stepInstances.each { stepInstance ->
                        def teams = getImpactedTeamsForStep(sql, stepInstance.sti_id)
                        def recipients = extractTeamEmails(teams)
                        if (recipients) {
                            sendIndividualStepNotification(sql, stepInstance, recipients, operationType, userId, migrationCode, iterationCode, template)
                        }
                    }
                }

            } catch (Exception e) {
                logError('sendBulkStepStatusChangedNotification', e, [
                    stepCount: stepInstances?.size(),
                    operationType: operationType,
                    userId: userId
                ])
            }
        }
    }

    /**
     * Send notification for direct StepView status change
     * Enhanced with context-aware URL generation and improved template variables
     *
     * @param stepInstance Step instance data
     * @param newStatus New status value
     * @param oldStatus Previous status value
     * @param userId User ID performing the change
     * @param sourceView Source view context ('stepview', 'iterationview', 'admin')
     * @param migrationCode Migration code for URL construction
     * @param iterationCode Iteration code for URL construction
     */
    static void sendStepViewDirectNotification(Map stepInstance, String newStatus, String oldStatus = null, Integer userId = null, String sourceView = 'stepview', String migrationCode = null, String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Get impacted teams for this step
                def teams = getImpactedTeamsForStep(sql, stepInstance.sti_id)
                def recipients = extractTeamEmails(teams)

                if (!recipients) {
                    println "EmailService: No recipients found for step ${stepInstance.sti_name}"
                    return
                }

                // Get email template
                def template = EmailTemplateRepository.findActiveByType(sql, 'STEP_STATUS_CHANGED')
                if (!template) {
                    println "EmailService: No active template found for STEP_STATUS_CHANGED"
                    return
                }

                // Enhanced template processing with source context
                def templateData = processNotificationTemplate(stepInstance, migrationCode, iterationCode, userId, [
                    newStatus: newStatus,
                    oldStatus: oldStatus ?: 'Unknown',
                    changedBy: getUsernameById(sql, userId ?: 0),
                    changedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    sourceView: sourceView,
                    isDirectChange: true,
                    changeContext: "Direct change from ${sourceView}"
                ])

                def variables = templateData.variables
                def stepViewUrl = templateData.stepViewUrl

                // Explicit casting to Map for static type checking (ADR-031, ADR-043)
                Map<String, Object> variablesMap = variables as Map<String, Object>

                // Enhanced URL with source tracking
                if (stepViewUrl && sourceView) {
                    String contextualUrl = "${stepViewUrl}&source=${sourceView}&action=status_change"
                    variablesMap.contextualStepUrl = contextualUrl
                    variablesMap.stepViewUrl = contextualUrl
                }

                // Process template
                def processedSubject = processTemplate(template.emt_subject as String, variables as Map)
                def processedBody = processTemplate(template.emt_body_html as String, variables as Map)

                // Send email
                def emailSent = sendEmail(recipients, processedSubject as String, processedBody as String)

                // Enhanced audit logging
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        UUID.fromString(stepInstance.sti_id as String),
                        recipients,
                        processedSubject as String,
                        template.emt_id as UUID,
                        [
                            notification_type: 'STEP_VIEW_DIRECT',
                            step_name: stepInstance.sti_name,
                            migration_name: stepInstance.migration_name,
                            new_status: newStatus,
                            old_status: oldStatus,
                            source_view: sourceView,
                            context_url: variablesMap.contextualStepUrl
                        ]
                    )
                }

            } catch (Exception e) {
                logError('sendStepViewDirectNotification', e, [
                    stepId: stepInstance.sti_id,
                    newStatus: newStatus,
                    sourceView: sourceView
                ])
            }
        }
    }

    /**
     * Send iteration-level summary notification
     * For significant iteration events like completion, bulk changes, or milestone achievements
     *
     * @param iterationData Iteration context data
     * @param eventType Type of iteration event
     * @param affectedStepsCount Number of steps affected
     * @param userId User ID performing the operation
     * @param migrationCode Migration code for URL construction
     * @param iterationCode Iteration code for URL construction
     */
    static void sendIterationViewNotification(Map iterationData, String eventType, Integer affectedStepsCount = 0, Integer userId = null, String migrationCode = null, String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Get iteration teams (teams involved in this iteration)
                def teams = getTeamsForIteration(sql, iterationData.ite_id)
                def recipients = extractTeamEmails(teams)

                if (!recipients) {
                    println "EmailService: No recipients found for iteration ${iterationData.ite_name}"
                    return
                }

                // Get email template for iteration events
                def template = EmailTemplateRepository.findActiveByType(sql, 'ITERATION_EVENT')
                if (!template) {
                    println "EmailService: No active template found for ITERATION_EVENT"
                    return
                }

                // Construct iteration view URL
                def iterationViewUrl = null
                if (migrationCode && iterationCode) {
                    try {
                        iterationViewUrl = UrlConstructionService.buildIterationViewUrl(
                            iterationData.ite_id as UUID,
                            migrationCode,
                            iterationCode
                        )
                    } catch (Exception urlException) {
                        println "EmailService: Error constructing iteration view URL: ${urlException.message}"
                    }
                }

                // Build template variables for iteration context
                def variables = [
                    iterationId: iterationData.ite_id,
                    iterationName: iterationData.ite_name,
                    iterationCode: iterationCode,
                    migrationCode: migrationCode,
                    migrationName: iterationData.migration_name,
                    eventType: eventType,
                    affectedStepsCount: affectedStepsCount,
                    eventTriggeredBy: getUsernameById(sql, userId ?: 0),
                    eventTriggeredAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    iterationViewUrl: iterationViewUrl,
                    hasIterationViewUrl: iterationViewUrl != null
                ]

                // Process template
                def processedSubject = processTemplate(template.emt_subject as String, variables as Map)
                def processedBody = processTemplate(template.emt_body_html as String, variables as Map)

                // Send email
                def emailSent = sendEmail(recipients, processedSubject as String, processedBody as String)

                // Audit logging
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        iterationData.ite_id as UUID,
                        recipients,
                        processedSubject as String,
                        template.emt_id as UUID,
                        [
                            notification_type: 'ITERATION_EVENT',
                            iteration_name: iterationData.ite_name,
                            migration_name: iterationData.migration_name,
                            event_type: eventType,
                            affected_steps_count: affectedStepsCount
                        ]
                    )
                }

            } catch (Exception e) {
                logError('sendIterationViewNotification', e, [
                    iterationId: iterationData.ite_id,
                    eventType: eventType,
                    affectedStepsCount: affectedStepsCount
                ])
            }
        }
    }

    // ========================================
    // PHASE 2A: HELPER METHODS FOR ENHANCED NOTIFICATIONS
    // ========================================

    /**
     * Group step instances by their impacted teams for consolidated notifications
     */
    private static Map<Integer, List<Map>> groupStepsByTeams(List<Map> stepInstances) {
        Map<Integer, List<Map>> teamGroups = [:]

        stepInstances.each { stepInstance ->
            DatabaseUtil.withSql { sql ->
                def teams = getImpactedTeamsForStep(sql, stepInstance.sti_id)
                teams.each { team ->
                    def teamId = team.tms_id as Integer
                    if (!teamGroups[teamId]) {
                        teamGroups[teamId] = [] as List<Map>
                    }
                    // Explicit type casting for static type checking (ADR-031)
                    List<Map> teamSteps = teamGroups[teamId] as List<Map>
                    teamSteps.add(stepInstance as Map)
                }
            }
        }

        return teamGroups
    }

    /**
     * Send consolidated notification for multiple steps to a specific team
     */
    private static void sendConsolidatedBulkNotification(Sql sql, List<Map> steps, List<String> recipients, String operationType, Integer userId, String migrationCode, String iterationCode, Map template) {
        try {
            // Build summary data for consolidated notification
            def stepsSummary = steps.collect { step ->
                [
                    name: step.sti_name,
                    status: step.sti_status_name,
                    id: step.sti_id
                ]
            }

            def variables = [
                operationType: operationType,
                stepsCount: steps.size(),
                stepsSummary: stepsSummary,
                migrationCode: migrationCode,
                iterationCode: iterationCode,
                triggeredBy: getUsernameById(sql, userId ?: 0),
                triggeredAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                bulkOperation: true
            ]

            // Process template
            def processedSubject = processTemplate(template.emt_subject as String, variables as Map)
            def processedBody = processTemplate(template.emt_body_html as String, variables as Map)

            // Send email
            def emailSent = sendEmail(recipients, processedSubject as String, processedBody as String)

            // Audit logging for bulk operation
            if (emailSent) {
                def stepIds = steps.collect { it.sti_id as String }.join(',')
                AuditLogRepository.logEmailSent(
                    sql,
                    userId,
                    null, // No single step ID for bulk operations
                    recipients,
                    processedSubject as String,
                    template.emt_id as UUID,
                    [
                        notification_type: 'BULK_OPERATION',
                        operation_type: operationType,
                        steps_count: steps.size(),
                        step_ids: stepIds,
                        migration_code: migrationCode,
                        iteration_code: iterationCode
                    ]
                )
            }

        } catch (Exception e) {
            logError('sendConsolidatedBulkNotification', e, [
                stepsCount: steps.size(),
                operationType: operationType
            ])
        }
    }

    /**
     * Send individual notification for a single step in bulk operation context
     */
    private static void sendIndividualStepNotification(Sql sql, Map stepInstance, List<String> recipients, String operationType, Integer userId, String migrationCode, String iterationCode, Map template) {
        try {
            def templateData = processNotificationTemplate(stepInstance, migrationCode, iterationCode, userId, [
                operationType: operationType,
                triggeredBy: getUsernameById(sql, userId ?: 0),
                triggeredAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                isBulkOperation: true
            ])

            def variables = templateData.variables

            // Process template
            def processedSubject = processTemplate(template.emt_subject as String, variables as Map)
            def processedBody = processTemplate(template.emt_body_html as String, variables as Map)

            // Send email
            def emailSent = sendEmail(recipients, processedSubject as String, processedBody as String)

            // Audit logging
            if (emailSent) {
                AuditLogRepository.logEmailSent(
                    sql,
                    userId,
                    UUID.fromString(stepInstance.sti_id as String),
                    recipients,
                    processedSubject as String,
                    template.emt_id as UUID,
                    [
                        notification_type: 'BULK_INDIVIDUAL',
                        operation_type: operationType,
                        step_name: stepInstance.sti_name,
                        migration_name: stepInstance.migration_name
                    ]
                )
            }

        } catch (Exception e) {
            logError('sendIndividualStepNotification', e, [
                stepId: stepInstance.sti_id,
                operationType: operationType
            ])
        }
    }

    /**
     * Get impacted teams for a specific step
     */
    private static List<Map> getImpactedTeamsForStep(Sql sql, def stepInstanceId) {
        try {
            // Ensure stepInstanceId is properly typed as UUID (ADR-031)
            UUID stepUuid = stepInstanceId instanceof UUID ? stepInstanceId : UUID.fromString(stepInstanceId.toString())

            List<groovy.sql.GroovyRowResult> queryResults = sql.rows('''
                SELECT DISTINCT
                    t.tms_id, t.tms_name, t.tms_email
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                LEFT JOIN steps_master_stm_x_teams_tms_impacted stmxt ON stm.stm_id = stmxt.stm_id
                LEFT JOIN teams_tms t ON stmxt.tms_id = t.tms_id
                WHERE sti.sti_id = ?
            ''', [stepUuid])

            // Convert GroovyRowResult to List<Map> for type safety (ADR-031)
            return queryResults.collect { row ->
                [
                    tms_id: row.tms_id,
                    tms_name: row.tms_name,
                    tms_email: row.tms_email
                ] as Map
            } as List<Map>
        } catch (Exception e) {
            logError('getImpactedTeamsForStep', e, [stepInstanceId: stepInstanceId])
            return []
        }
    }

    /**
     * Get teams involved in a specific iteration
     */
    private static List<Map> getTeamsForIteration(Sql sql, def iterationId) {
        try {
            // Ensure iterationId is properly typed as UUID (ADR-031)
            UUID iterationUuid = iterationId instanceof UUID ? iterationId : UUID.fromString(iterationId.toString())

            List<groovy.sql.GroovyRowResult> queryResults = sql.rows('''
                SELECT DISTINCT
                    t.tms_id, t.tms_name, t.tms_email
                FROM iterations_ite ite
                JOIN plans_instance_pli pli ON ite.ite_id = pli.ite_id
                JOIN sequences_instance_sqi sqi ON pli.pli_id = sqi.pli_id
                JOIN phases_instance_phi phi ON sqi.sqi_id = phi.sqi_id
                JOIN steps_instance_sti sti ON phi.phi_id = sti.phi_id
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                LEFT JOIN steps_master_stm_x_teams_tms_impacted stmxt ON stm.stm_id = stmxt.stm_id
                LEFT JOIN teams_tms t ON stmxt.tms_id = t.tms_id
                WHERE ite.ite_id = ?
            ''', [iterationUuid])

            // Convert GroovyRowResult to List<Map> for type safety (ADR-031)
            return queryResults.collect { row ->
                [
                    tms_id: row.tms_id,
                    tms_name: row.tms_name,
                    tms_email: row.tms_email
                ] as Map
            } as List<Map>
        } catch (Exception e) {
            logError('getTeamsForIteration', e, [iterationId: iterationId])
            return []
        }
    }

    /**
     * Get team emails by team ID
     */
    private static List<String> getTeamEmailsById(Sql sql, Integer teamId) {
        try {
            def team = sql.firstRow('''
                SELECT tms_email FROM teams_tms
                WHERE tms_id = ?
            ''', [teamId])

            // Explicit type conversion to List<String> for type safety (ADR-031)
            return team?.tms_email ? [team.tms_email as String] as List<String> : [] as List<String>
        } catch (Exception e) {
            logError('getTeamEmailsById', e, [teamId: teamId])
            return []
        }
    }

    // ========================================
    // US-058 PHASE 2 DAY 1: ENHANCED EMAIL METHODS WITH URL CONSTRUCTION
    // Merged from EnhancedEmailService to restore stepViewApi integration chain
    // ========================================

    /**
     * Send notification when a USER changes step-level status with dynamic URL construction
     * Recipients: Assigned TEAM + IMPACTED TEAMS + IT CUTOVER TEAM
     *
     * Enhanced version that integrates URL construction from EnhancedEmailService
     * while maintaining all existing EmailService capabilities and security features.
     */
    static void sendStepStatusChangedNotificationWithUrl(Map stepInstance, List<Map> teams, Map cutoverTeam,
                                                        String oldStatus, String newStatus, Integer userId = null,
                                                        String migrationCode = null, String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Debug logging
                println "EmailService.sendStepStatusChangedNotificationWithUrl called:"
                println "  - Step: ${stepInstance?.sti_name}"
                println "  - Old Status: ${oldStatus}"
                println "  - New Status: ${newStatus}"
                println "  - Teams count: ${teams?.size()}"
                println "  - Migration Code: ${migrationCode}"
                println "  - Iteration Code: ${iterationCode}"

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

                    // Log missing template as audit event
                    AuditLogRepository.logEmailFailed(
                        sql,
                        userId,
                        UUID.fromString(stepInstance.sti_id as String),
                        extractTeamEmails(allTeams),
                        "[UMIG] Step Status Changed: ${stepInstance.sti_name}",
                        "No active email template found for STEP_STATUS_CHANGED"
                    )
                    return
                }

                // Use existing processNotificationTemplate with enhanced variables for URL context
                def templateData = processNotificationTemplate(stepInstance, migrationCode, iterationCode, userId, [
                    oldStatus: oldStatus,
                    newStatus: newStatus,
                    statusColor: getStatusColor(newStatus),
                    changedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    changedBy: getUsernameById(sql, userId),
                    // Enhanced context for URL-aware templates
                    migrationCode: migrationCode,
                    iterationCode: iterationCode,
                    // US-056B Phase 2: Enhanced CommentDTO processing for template compatibility
                    recentComments: processCommentsForTemplate(stepInstance?.recentComments),
                    impacted_teams: stepInstance?.impacted_teams ?: ''
                ])

                def variables = templateData.variables
                def stepViewUrl = templateData.stepViewUrl

                // Process template - with explicit type casting per ADR-031
                def processedSubject = processTemplate(template.emt_subject as String, variables as Map)
                def processedBody = processTemplate(template.emt_body_html as String, variables as Map)

                // Send email - with explicit type casting per ADR-031
                def emailSent = sendEmail(recipients, processedSubject as String, processedBody as String)

                // Enhanced audit logging with URL context
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        UUID.fromString(stepInstance.sti_id as String),
                        recipients,
                        processedSubject as String,
                        template.emt_id as UUID,
                        [
                            notification_type: 'STEP_STATUS_CHANGED_WITH_URL',
                            step_name: stepInstance.sti_name,
                            old_status: oldStatus,
                            new_status: newStatus,
                            step_view_url: stepViewUrl,
                            migration_code: migrationCode,
                            iteration_code: iterationCode
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
                logError('sendStepStatusChangedNotificationWithUrl', e, [
                    stepId: stepInstance.sti_id,
                    oldStatus: oldStatus,
                    newStatus: newStatus,
                    migrationCode: migrationCode,
                    iterationCode: iterationCode
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
     * Send notification when a PILOT opens a step with dynamic URL construction
     * Recipients: Assigned TEAM + IMPACTED TEAMS
     *
     * Enhanced version that integrates URL construction from EnhancedEmailService
     * while maintaining all existing EmailService capabilities and security features.
     */
    static void sendStepOpenedNotificationWithUrl(Map stepInstance, List<Map> teams, Integer userId = null,
                                                 String migrationCode = null, String iterationCode = null) {
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

                // Use existing processNotificationTemplate with enhanced variables for URL context
                def templateData = processNotificationTemplate(stepInstance, migrationCode, iterationCode, userId, [
                    openedBy: getUsernameById(sql, userId ?: 0),
                    openedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    // Enhanced context for URL-aware templates
                    migrationCode: migrationCode,
                    iterationCode: iterationCode,
                    // US-056B Phase 2: Enhanced CommentDTO processing for template compatibility
                    recentComments: processCommentsForTemplate(stepInstance?.recentComments),
                    impacted_teams: stepInstance?.impacted_teams ?: ''
                ])

                def variables = templateData.variables
                def stepViewUrl = templateData.stepViewUrl

                // Process template - with explicit type casting per ADR-031
                def processedSubject = processTemplate(template.emt_subject as String, variables as Map)
                def processedBody = processTemplate(template.emt_body_html as String, variables as Map)

                // Send email - with explicit type casting per ADR-031
                def emailSent = sendEmail(recipients, processedSubject as String, processedBody as String)

                // Enhanced audit logging with URL context
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        UUID.fromString(stepInstance.sti_id as String),
                        recipients,
                        processedSubject as String,
                        template.emt_id as UUID,
                        [
                            notification_type: 'STEP_OPENED_WITH_URL',
                            step_name: stepInstance.sti_name,
                            migration_name: stepInstance.migration_name,
                            step_view_url: stepViewUrl,
                            migration_code: migrationCode,
                            iteration_code: iterationCode
                        ]
                    )
                }

            } catch (Exception e) {
                logError('sendStepOpenedNotificationWithUrl', e, [stepId: stepInstance.sti_id])

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
     * Send notification when a USER completes an instruction with dynamic URL construction
     * Recipients: Assigned TEAM + IMPACTED TEAMS
     *
     * Enhanced version that integrates URL construction from EnhancedEmailService
     * while maintaining all existing EmailService capabilities and security features.
     */
    static void sendInstructionCompletedNotificationWithUrl(Map instruction, Map stepInstance, List<Map> teams,
                                                           Integer userId = null, String migrationCode = null,
                                                           String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Debug logging
                println "EmailService.sendInstructionCompletedNotificationWithUrl called:"
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

                    // Log missing template as audit event
                    AuditLogRepository.logEmailFailed(
                        sql,
                        userId,
                        UUID.fromString(instruction.ini_id as String),
                        extractTeamEmails(teams),
                        "[UMIG] Instruction Completed: ${instruction.ini_name}",
                        "No active email template found for INSTRUCTION_COMPLETED",
                        'INSTRUCTION_INSTANCE'
                    )
                    return
                }

                // Use existing processNotificationTemplate with enhanced variables for URL context
                def templateData = processNotificationTemplate(stepInstance, migrationCode, iterationCode, userId, [
                    instruction: instruction,
                    completedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    completedBy: getUsernameById(sql, userId),
                    // Enhanced context for URL-aware templates
                    migrationCode: migrationCode,
                    iterationCode: iterationCode,
                    // US-056B Phase 2: Enhanced CommentDTO processing for template compatibility
                    recentComments: processCommentsForTemplate(stepInstance?.recentComments),
                    impacted_teams: stepInstance?.impacted_teams ?: ''
                ])

                def variables = templateData.variables
                def stepViewUrl = templateData.stepViewUrl

                // Process template - with explicit type casting per ADR-031
                def processedSubject = processTemplate(template.emt_subject as String, variables as Map)
                def processedBody = processTemplate(template.emt_body_html as String, variables as Map)

                // Send email - with explicit type casting per ADR-031
                def emailSent = sendEmail(recipients, processedSubject as String, processedBody as String)

                // Enhanced audit logging with URL context
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        UUID.fromString(instruction.ini_id as String),
                        recipients,
                        processedSubject as String,
                        template.emt_id as UUID,
                        [
                            notification_type: 'INSTRUCTION_COMPLETED_WITH_URL',
                            instruction_name: instruction.ini_name,
                            step_name: stepInstance.sti_name,
                            step_view_url: stepViewUrl,
                            migration_code: migrationCode,
                            iteration_code: iterationCode
                        ],
                        'INSTRUCTION_INSTANCE'  // Specify entity type for instruction actions
                    )
                }

            } catch (Exception e) {
                logError('sendInstructionCompletedNotificationWithUrl', e, [
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
     * Health check for monitoring URL construction capabilities
     * Integrated from EnhancedEmailService for comprehensive service monitoring
     */
    static Map healthCheck() {
        try {
            def urlServiceHealth = UrlConstructionService.healthCheck()
            def configHealth = urlServiceHealth.status == 'healthy'

            return [
                service: 'EmailService (Enhanced)',
                status: configHealth ? 'healthy' : 'degraded',
                urlConstruction: urlServiceHealth,
                capabilities: [
                    dynamicUrls: configHealth,
                    emailTemplates: true,
                    auditLogging: true,
                    securityValidation: true,
                    templateCaching: true,
                    phase2aMethods: true // Indicates availability of enhanced methods
                ],
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]
        } catch (Exception e) {
            return [
                service: 'EmailService (Enhanced)',
                status: 'error',
                error: e.message,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]
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

    /**
     * SECURITY ENHANCEMENT: Log security-related events for audit purposes
     * Tracks security violations, blocked attempts, and potential threats
     *
     * @param eventType Type of security event (e.g., 'TEMPLATE_INJECTION_BLOCKED')
     * @param details Details about the security event
     * @param context Additional context (IP, user, etc.)
     */
    private static void logSecurityEvent(String eventType, String details, Map context = [:]) {
        // Log to console for immediate visibility
        println "EmailService SECURITY EVENT [${eventType}]: ${details}"
        if (context) {
            println "EmailService SECURITY CONTEXT: ${context}"
        }

        // Log to audit system if available - with proper method signature
        try {
            DatabaseUtil.withSql { sql ->
                // Use the correct AuditLogRepository method signature
                // logSecurityEvent(sql, userId, entityId, action, details)
                AuditLogRepository.logEmailFailed(
                    sql,
                    context.userId as Integer ?: null,
                    null, // No specific entity ID for security events
                    [] as List<String>, // Empty recipients list for security events
                    "SECURITY_EVENT: ${eventType}",
                    "${details} | Context: ${context}"
                )
            }
        } catch (Exception e) {
            // Don't let audit logging failure affect email processing
            println "EmailService: Failed to log security event to audit system: ${e.message}"
        }
    }
}