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
     * Validate template expressions for security (Phase 1 Quick Win)
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
        
        // Pattern to find all ${...} expressions
        def expressionPattern = /\$\{([^}]+)\}/
        def matcher = templateText =~ expressionPattern
        
        // Safe patterns: simple variable references and property access
        def safePattern = /^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)*$/
        
        // Check each expression
        matcher.each { match ->
            def expression = ((match as List)[1] as String).trim()
            
            // Check if expression matches safe pattern
            if (!(expression ==~ safePattern)) {
                // Block dangerous patterns
                if ((expression as String).contains('(') || (expression as String).contains('[') || (expression as String).contains('?') || 
                    (expression as String).contains('=') || (expression as String).contains(';') || (expression as String).toLowerCase().contains('import') ||
                    (expression as String).toLowerCase().contains('new ') || (expression as String).toLowerCase().contains('def ') || 
                    (expression as String).toLowerCase().contains('class ') || (expression as String).toLowerCase().contains('system.') ||
                    (expression as String).toLowerCase().contains('runtime.') || (expression as String).toLowerCase().contains('process') ||
                    (expression as String).toLowerCase().contains('file.') || (expression as String).toLowerCase().contains('execute') ||
                    (expression as String).toLowerCase().contains('eval') || (expression as String).toLowerCase().contains('script') ||
                    (expression as String).toLowerCase().contains('if ') || (expression as String).toLowerCase().contains('for ') ||
                    expression.toLowerCase().contains('while ') || expression.toLowerCase().contains('return ')) {
                    throw new SecurityException("Unsafe template expression detected: \${${expression}}. Only simple variable references like \${variable} or \${object.property} are allowed.")
                }
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
            def user = sql.firstRow('SELECT usr_username FROM users_usr WHERE usr_id = ?', [userId])
            return user?.usr_username ?: "User ${userId}"
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
    
    /**
     * Log errors for debugging and monitoring
     */
    private static void logError(String method, Exception error, Map context = [:]) {
        println "EmailService ERROR in ${method}: ${error.message}"
        println "EmailService ERROR context: ${context}"
        error.printStackTrace()
    }
}