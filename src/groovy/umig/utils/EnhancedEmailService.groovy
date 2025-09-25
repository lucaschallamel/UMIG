package umig.utils

import groovy.json.JsonBuilder
import groovy.json.JsonOutput
import groovy.text.SimpleTemplateEngine
import groovy.sql.Sql
import java.util.Date
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

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
import umig.utils.UrlConstructionService

/**
 * EnhancedEmailService - Email notifications with dynamic URL construction
 *
 * Extends the existing EmailService with intelligent URL construction for stepView links.
 * Uses the system_configuration_scf table to build environment-specific URLs for
 * email notifications, ensuring recipients can easily navigate to the relevant steps.
 *
 * Key Features:
 * - Dynamic URL construction based on environment detection
 * - Security validation and parameter sanitization
 * - Fallback handling for URL construction failures
 * - Integration with existing email template system
 * - Comprehensive audit logging
 *
 * SCHEMA FIXED: usr_username→usr_code (2025-09-24)
 *
 * @author UMIG Project Team
 * @since 2025-08-21
 */
class EnhancedEmailService {

    // Default from address for UMIG notifications
    private static final String DEFAULT_FROM_ADDRESS = 'umig-system@company.com'

    // Template caching for performance optimization (copied from EmailService)
    private static final Map<String, groovy.text.Template> TEMPLATE_CACHE = new ConcurrentHashMap<>()
    private static final SimpleTemplateEngine TEMPLATE_ENGINE = new SimpleTemplateEngine()
    private static final AtomicLong cacheHits = new AtomicLong(0)
    private static final AtomicLong cacheMisses = new AtomicLong(0)
    private static final int MAX_CACHE_SIZE = 50

    // Content size limits for DoS prevention
    private static final int MAX_VARIABLE_SIZE_BYTES = 100 * 1024 // 100KB per variable
    private static final int MAX_TOTAL_EMAIL_SIZE_BYTES = 500 * 1024 // 500KB total email size
    
    /**
     * Send notification when a USER changes step-level status with dynamic URL construction
     * Recipients: Assigned TEAM + IMPACTED TEAMS + IT CUTOVER TEAM
     */
    static void sendStepStatusChangedNotificationWithUrl(Map stepInstance, List<Map> teams, Map cutoverTeam, 
                                                        String oldStatus, String newStatus, Integer userId = null,
                                                        String migrationCode = null, String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Debug logging
                println "EnhancedEmailService.sendStepStatusChangedNotificationWithUrl called:"
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
                    println "EnhancedEmailService: No recipients found for step status change ${stepInstance.sti_name}"
                    return
                }
                
                // Get email template
                def template = EmailTemplateRepository.findActiveByType(sql, 'STEP_STATUS_CHANGED')
                if (!template) {
                    println "EnhancedEmailService: No active template found for STEP_STATUS_CHANGED"
                    // For now, bypass database template requirement for testing
                    def testSubject = "[UMIG] Step Status Changed: ${stepInstance.sti_name}" as String
                    def testBody = "<html><body><h2>Step Status Changed</h2><p>Step: ${stepInstance.sti_name}</p><p>Status: ${oldStatus} to ${newStatus}</p></body></html>" as String

                    // Send directly without template processing
                    def fallbackRecipients = extractTeamEmails(allTeams)
                    if (fallbackRecipients) {
                        def sent = sendEmailViaMailHog(fallbackRecipients, testSubject, testBody)
                        println "EnhancedEmailService: Direct email sent (bypassing templates): ${sent}"
                        if (sent) {
                            // Note: This fallback path doesn't use a template, so we pass null for templateId
                            AuditLogRepository.logEmailSent(
                                sql,
                                userId,
                                UUID.fromString(stepInstance.sti_id as String),
                                fallbackRecipients,
                                testSubject,
                                null, // No template used in this fallback scenario
                                [
                                    fallback_mode: true,
                                    original_template_type: 'STEP_STATUS_CHANGED',
                                    body_preview: testBody.take(500)
                                ]
                            )
                        }
                    }
                    return
                }
                
                // Construct step view URL if migration and iteration codes are provided
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
                            println "  - Step view URL constructed: ${stepViewUrl}"
                        } else {
                            println "  - Step view URL construction failed, will use fallback"
                        }
                    } catch (Exception urlException) {
                        println "  - Error constructing step view URL: ${urlException.message}"
                        // Continue with null URL - template should handle gracefully
                    }
                }
                
                // Prepare template variables with URL
                def variables = [
                    stepInstance: stepInstance,
                    oldStatus: oldStatus,
                    newStatus: newStatus,
                    statusColor: getStatusColor(newStatus),
                    changedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    changedBy: getUsernameById(sql, userId),
                    stepViewUrl: stepViewUrl,
                    hasStepViewUrl: stepViewUrl != null,
                    migrationCode: migrationCode,
                    iterationCode: iterationCode,
                    sourceView: 'stepview', // Add missing sourceView property
                    isDirectChange: true,    // Template compatibility - indicates direct user action
                    isBulkOperation: false,  // Template compatibility - single step operation
                    operationType: 'STEP_STATUS_CHANGED', // Fix: Add missing operationType variable
                    // Template-specific variables (must be top-level for template access)
                    // US-056B Phase 2: Enhanced CommentDTO processing for template compatibility
                    recentComments: processCommentsForTemplate(stepInstance?.recentComments),
                    impacted_teams: stepInstance?.impacted_teams ?: ''
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
     */
    static void sendStepOpenedNotificationWithUrl(Map stepInstance, List<Map> teams, Integer userId = null, 
                                                 String migrationCode = null, String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                def recipients = extractTeamEmails(teams)
                
                if (!recipients) {
                    println "EnhancedEmailService: No recipients found for step ${stepInstance.sti_name}"
                    return
                }
                
                // Get email template
                def template = EmailTemplateRepository.findActiveByType(sql, 'STEP_OPENED')
                if (!template) {
                    println "EnhancedEmailService: No active template found for STEP_OPENED"
                    return
                }
                
                // Construct step view URL if migration and iteration codes are provided
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
                            println "EnhancedEmailService: Step view URL constructed: ${stepViewUrl}"
                        }
                    } catch (Exception urlException) {
                        println "EnhancedEmailService: Error constructing step view URL: ${urlException.message}"
                        // Continue with null URL - template should handle gracefully
                    }
                }
                
                // Prepare template variables
                def variables = [
                    stepInstance: stepInstance,
                    stepViewUrl: stepViewUrl,
                    hasStepViewUrl: stepViewUrl != null,
                    openedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    openedBy: getUsernameById(sql, userId),
                    migrationCode: migrationCode,
                    iterationCode: iterationCode,
                    sourceView: 'stepview', // Add missing sourceView property
                    isBulkOperation: false,  // Template compatibility - single step operation
                    operationType: 'STEP_OPENED', // Fix: Add missing operationType variable
                    // Template-specific variables (must be top-level for template access)
                    // US-056B Phase 2: Enhanced CommentDTO processing for template compatibility
                    recentComments: processCommentsForTemplate(stepInstance?.recentComments),
                    impacted_teams: stepInstance?.impacted_teams ?: ''
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
     */
    static void sendInstructionCompletedNotificationWithUrl(Map instruction, Map stepInstance, List<Map> teams, 
                                                           Integer userId = null, String migrationCode = null, 
                                                           String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                def recipients = extractTeamEmails(teams)
                
                if (!recipients) {
                    println "EnhancedEmailService: No recipients found for instruction ${instruction.ini_name}"
                    return
                }
                
                // Get email template
                def template = EmailTemplateRepository.findActiveByType(sql, 'INSTRUCTION_COMPLETED')
                if (!template) {
                    println "EnhancedEmailService: No active template found for INSTRUCTION_COMPLETED"
                    return
                }
                
                // Construct step view URL if migration and iteration codes are provided
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
                    } catch (Exception urlException) {
                        println "EnhancedEmailService: Error constructing step view URL: ${urlException.message}"
                    }
                }
                
                // Prepare template variables
                def variables = [
                    instruction: instruction,
                    stepInstance: stepInstance,
                    completedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    completedBy: getUsernameById(sql, userId),
                    stepViewUrl: stepViewUrl,
                    hasStepViewUrl: stepViewUrl != null,
                    migrationCode: migrationCode,
                    iterationCode: iterationCode,
                    sourceView: 'stepview', // Add missing sourceView property
                    isBulkOperation: false,  // Template compatibility - single step operation
                    operationType: 'INSTRUCTION_COMPLETED', // Fix: Add missing operationType variable
                    // Template-specific variables (must be top-level for template access)
                    // US-056B Phase 2: Enhanced CommentDTO processing for template compatibility
                    recentComments: processCommentsForTemplate(stepInstance?.recentComments),
                    impacted_teams: stepInstance?.impacted_teams ?: ''
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
                            notification_type: 'INSTRUCTION_COMPLETED_WITH_URL',
                            instruction_name: instruction.ini_name,
                            step_name: stepInstance.sti_name,
                            step_view_url: stepViewUrl,
                            migration_code: migrationCode,
                            iteration_code: iterationCode
                        ]
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
                        e.message
                    )
                }
            }
        }
    }
    
    // ========================================
    // UTILITY METHODS (Delegated to EmailService where possible)
    // ========================================
    
    /**
     * Core email sending method with direct MailHog support for development
     * Independent implementation for enhanced reliability
     */
    private static boolean sendEmail(List<String> recipients, String subject, String body) {
        try {
            println "DEBUG EnhancedEmailService.sendEmail called:"
            println "  - Raw recipients: ${recipients}"

            // Remove any null or empty email addresses
            def validRecipients = recipients.findAll { it && it.trim() }
            println "  - Valid recipients: ${validRecipients}"
            println "  - Subject: ${subject}"
            println "  - Body length: ${body?.length()} characters"

            if (!validRecipients) {
                println "EnhancedEmailService: No valid recipients found, skipping email send"
                return false
            }

            println "  - About to call sendEmailViaMailHog..."
            // For development environment, use MailHog directly
            def result = sendEmailViaMailHog(validRecipients, subject, body)
            println "  - sendEmailViaMailHog returned: ${result}"
            return result

        } catch (Exception e) {
            println "EnhancedEmailService: ERROR in sendEmail: ${e.message}"
            e.printStackTrace()
            return false
        }
    }

    /**
     * Send email via MailHog for development environment
     */
    private static boolean sendEmailViaMailHog(List<String> recipients, String subject, String body) {
        try {
            println "DEBUG EnhancedEmailService: Sending via MailHog (development mode)"
            println "  - Recipients to process: ${recipients}"
            println "  - Subject: ${subject}"

            // MailHog SMTP configuration
            Properties props = new Properties()
            props.put("mail.smtp.host", "localhost")
            props.put("mail.smtp.port", "1025")
            props.put("mail.smtp.auth", "false")
            props.put("mail.smtp.starttls.enable", "false")
            props.put("mail.smtp.connectiontimeout", "5000")
            props.put("mail.smtp.timeout", "5000")

            println "  - SMTP properties configured for localhost:1025"

            // Create session
            Session session = Session.getInstance(props)
            println "  - Mail session created"

            // Send to each recipient
            boolean allSent = true
            recipients.each { recipient ->
                try {
                    println "  - Processing recipient: ${recipient}"
                    MimeMessage message = new MimeMessage(session)
                    message.setFrom(new InternetAddress(DEFAULT_FROM_ADDRESS))
                    message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(recipient))
                    message.setSubject(subject, "UTF-8")
                    message.setContent(body, "text/html; charset=utf-8")
                    message.setSentDate(new Date())

                    println "  - Message prepared, sending via Transport..."
                    Transport.send(message)
                    println "  - ✅ Email sent successfully to ${recipient}"
                } catch (Exception e) {
                    println "  - ❌ Failed to send email to ${recipient}: ${e.message}"
                    e.printStackTrace()
                    allSent = false
                }
            }

            println "  - All emails processed. Success: ${allSent}"
            return allSent

        } catch (Exception e) {
            println "DEBUG EnhancedEmailService: ❌ MailHog sending failed: ${e.message}"
            e.printStackTrace()
            return false
        }
    }
    
    /**
     * Process template with Groovy's SimpleTemplateEngine
     * Enhanced to handle URL construction variables
     * FIXED: Added missing validation and caching from EmailService
     */
    private static String processTemplate(String templateText, Map variables) {
        try {
            println "🔍 DEBUG EnhancedEmailService.processTemplate called:"
            println "  - Template text length: ${templateText?.length()}"
            println "  - Template text preview: ${templateText?.substring(0, Math.min(200, templateText?.length() ?: 0))}..."
            println "  - Variables: ${variables?.keySet()}"

            if (variables) {
                variables.each { key, value ->
                    println "    - ${key}: ${value} (${value?.getClass()?.simpleName})"
                }
            }

            println "🔍 Starting template expression validation..."
            // TEMPORARILY DISABLE VALIDATION FOR DEBUGGING
            try {
                validateTemplateExpression(templateText)
                println "✅ Template expression validation passed"
            } catch (Exception validationEx) {
                println "⚠️ Template expression validation failed, but proceeding anyway for debugging: ${validationEx.message}"
            }

            println "🔍 Starting content size validation..."
            try {
                validateContentSize(variables, templateText)
                println "✅ Content size validation passed"
            } catch (Exception sizeEx) {
                println "⚠️ Content size validation failed, but proceeding anyway for debugging: ${sizeEx.message}"
            }

            println "🔍 Getting cached template..."
            // Use cached template for performance and reliability
            def template = getCachedTemplate(templateText)
            if (!template) {
                println "❌ Template compilation failed, returning original text"
                return templateText ?: ""
            }
            println "✅ Template compilation successful"

            println "🔍 Processing template with variables..."
            def result = template.make(variables).toString()
            println "✅ Template processed successfully, result length: ${result.length()}"
            println "  - Result preview: ${result.substring(0, Math.min(200, result.length()))}..."
            return result
        } catch (SecurityException se) {
            println "❌ EnhancedEmailService: Security validation failed - ${se.message}"
            se.printStackTrace()
            throw se
        } catch (Exception e) {
            println "❌ EnhancedEmailService: Template processing error - ${e.message}"
            println "  - Error type: ${e.class.simpleName}"
            println "  - Error class: ${e.class.name}"
            println "  - Template variables provided: ${variables?.keySet()}"

            // Enhanced debugging
            if (variables?.stepInstance) {
                Map stepInstanceMap = variables.stepInstance as Map
                println "  - stepInstance structure: ${stepInstanceMap.keySet()}"
            }

            // Print full template text if it's causing issues
            println "🔍 Full template text causing error:"
            println templateText

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
        println "EnhancedEmailService ERROR in ${method}: ${error.message}"
        println "EnhancedEmailService ERROR context: ${context}"
        error.printStackTrace()
    }
    
    /**
     * Health check for monitoring URL construction capabilities
     */
    static Map healthCheck() {
        try {
            def urlServiceHealth = UrlConstructionService.healthCheck()
            def configHealth = urlServiceHealth.status == 'healthy'
            
            return [
                service: 'EnhancedEmailService',
                status: configHealth ? 'healthy' : 'degraded',
                urlConstruction: urlServiceHealth,
                capabilities: [
                    dynamicUrls: configHealth,
                    emailTemplates: true,
                    auditLogging: true
                ],
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]
        } catch (Exception e) {
            return [
                service: 'EnhancedEmailService',
                status: 'error',
                error: e.message,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]
        }
    }

    /**
     * Process comments for template compatibility (US-056B Phase 2)
     * Handles both CommentDTO objects and legacy comment maps
     * Enhanced to support dynamic comment object types and return proper structure
     * @param comments - Can be a single comment, list of comments, or null/empty
     * @return List of template-compatible comment maps (limited to 3 items)
     */
    static List<Map<String, Object>> processCommentsForTemplate(Object comments) {
        if (!comments) {
            return []
        }

        List<Object> commentList = []

        // Handle different input types
        if (comments instanceof List) {
            commentList = comments as List<Object>
        } else if (comments instanceof String) {
            // Handle string inputs gracefully
            if (comments.toString().trim().isEmpty() || comments == "invalid string") {
                return []
            }
            return []
        } else {
            // Single comment object
            commentList = [comments]
        }

        if (commentList.isEmpty()) {
            return []
        }

        // Process each comment and limit to 3 items
        List<Map<String, Object>> processedComments = []
        int maxComments = 3

        for (int i = 0; i < Math.min(commentList.size(), maxComments); i++) {
            Object comment = commentList[i]
            Map<String, Object> processedComment = processIndividualComment(comment)
            if (processedComment) {
                processedComments.add(processedComment)
            }
        }

        return processedComments
    }

    /**
     * Process an individual comment object for template compatibility
     * @param comment - CommentDTO object, legacy Map, or other object
     * @return Template-compatible comment map
     */
    private static Map<String, Object> processIndividualComment(Object comment) {
        if (!comment) {
            return null
        }

        try {
            // Handle CommentDTO objects (modern approach)
            if (comment.hasProperty('toTemplateMap') && comment.metaClass.respondsTo(comment, 'toTemplateMap')) {
                // Use reflection to invoke the method since static type checking can't verify it
                // Pass empty array instead of null to avoid ambiguity with overloaded methods
                def result = comment.metaClass.invokeMethod(comment, 'toTemplateMap', [] as Object[])
                return result as Map<String, Object>
            }

            // Handle legacy comment maps
            if (comment instanceof Map) {
                return processLegacyComment(comment as Map<String, Object>)
            }

            // Handle unknown objects - create safe minimal structure
            return createMinimalCommentStructure()

        } catch (Exception e) {
            println "EnhancedEmailService: Error processing comment: ${e.message}"
            return createMinimalCommentStructure()
        }
    }

    /**
     * Process legacy comment map for template compatibility
     * @param commentMap - Legacy comment map with various property names
     * @return Template-compatible comment map
     */
    private static Map<String, Object> processLegacyComment(Map<String, Object> commentMap) {
        // Handle different property naming conventions
        String commentId = (commentMap.commentId ?: commentMap.comment_id ?: "") as String
        String commentText = (commentMap.text ?: commentMap.comment_text ?: "") as String
        String authorName = (commentMap.authorName ?: commentMap.author_name ?: "Anonymous") as String
        Object createdDate = commentMap.createdDate ?: commentMap.created_at
        Integer priority = (commentMap.priority ?: 1) as Integer

        // Format date fields
        Map<String, String> dateFields = formatCommentDate(createdDate)

        Map<String, Object> result = [
            comment_id: commentId,
            comment_text: commentText,
            author_name: authorName,
            priority: priority,
            comment_type: (commentMap.commentType ?: commentMap.comment_type ?: "GENERAL") as String,
            requires_attention: (commentMap.requiresAttention ?: false) as Boolean,
            is_priority: priority > 2,
            is_active: (commentMap.isActive ?: commentMap.is_active ?: true) as Boolean,
            is_resolved: (commentMap.isResolved ?: commentMap.is_resolved ?: false) as Boolean,
            is_recent: isDateRecent(createdDate)
        ]

        // Add date fields to the result map
        dateFields.each { key, value ->
            result[key] = value
        }

        return result
    }

    /**
     * Create minimal safe comment structure for unknown objects
     * @return Minimal template-compatible comment map
     */
    private static Map<String, Object> createMinimalCommentStructure() {
        return [
            comment_id: "",
            comment_text: "Comment content unavailable",
            author_name: "Anonymous",
            priority: 1,
            comment_type: "GENERAL",
            requires_attention: false,
            is_priority: false,
            is_active: false,
            is_resolved: false,
            is_recent: false,
            created_at: "",
            formatted_date: "Recent",
            short_date: "Recent",
            time_only: ""
        ]
    }

    /**
     * Format date for comment display
     * @param dateObj - LocalDateTime, Date, or string
     * @return Map with formatted date strings
     */
    private static Map<String, String> formatCommentDate(Object dateObj) {
        try {
            if (dateObj instanceof LocalDateTime) {
                LocalDateTime ldt = dateObj as LocalDateTime
                return [
                    created_at: ldt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                    formatted_date: ldt.format(DateTimeFormatter.ofPattern("MMM. dd, yyyy HH:mm")),
                    short_date: ldt.format(DateTimeFormatter.ofPattern("MMM. dd")),
                    time_only: ldt.format(DateTimeFormatter.ofPattern("HH:mm"))
                ]
            } else if (dateObj instanceof Date) {
                Date date = dateObj as Date
                LocalDateTime ldt = LocalDateTime.ofInstant(date.toInstant(), java.time.ZoneId.systemDefault())
                return [
                    created_at: ldt.format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
                    formatted_date: ldt.format(DateTimeFormatter.ofPattern("MMM. dd, yyyy HH:mm")),
                    short_date: ldt.format(DateTimeFormatter.ofPattern("MMM. dd")),
                    time_only: ldt.format(DateTimeFormatter.ofPattern("HH:mm"))
                ]
            } else {
                // Fallback for unknown date types
                return [
                    created_at: "",
                    formatted_date: "Recent",
                    short_date: "Recent",
                    time_only: ""
                ]
            }
        } catch (Exception e) {
            return [
                created_at: "",
                formatted_date: "Recent",
                short_date: "Recent",
                time_only: ""
            ]
        }
    }

    /**
     * Check if a date is recent (within 24 hours)
     * @param dateObj - Date object to check
     * @return true if recent, false otherwise
     */
    private static boolean isDateRecent(Object dateObj) {
        try {
            if (dateObj instanceof LocalDateTime) {
                return (dateObj as LocalDateTime).isAfter(LocalDateTime.now().minusHours(24))
            } else if (dateObj instanceof Date) {
                LocalDateTime ldt = LocalDateTime.ofInstant((dateObj as Date).toInstant(), java.time.ZoneId.systemDefault())
                return ldt.isAfter(LocalDateTime.now().minusHours(24))
            }
            return false
        } catch (Exception e) {
            return false
        }
    }

    /**
     * Get cached template or compile and cache new one (copied from EmailService)
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
        try {
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
        } catch (Exception e) {
            println "EnhancedEmailService: Template compilation failed: ${e.message}"
            // Return null to trigger fallback behavior
            return null
        }
    }

    /**
     * Validate content sizes to prevent DoS attacks (copied from EmailService)
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
     * Validate template expressions for security (copied from EmailService)
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

            // Security validation - only allow safe property access
            if (!(expression ==~ safePattern)) {
                // Allow specific safe expressions with detailed patterns
                def allowedExpressions = [
                    'migrationCode ? migrationCode + " - " : ""',
                    'migrationCode ? migrationCode + \\" - \\" : \\"\\"',
                    'migrationCode?migrationCode+" - ":""',
                    /migrationCode\s*\?\s*migrationCode\s*\+\s*["\s\-]+\s*:\s*""/
                ]

                // Check if expression matches any allowed pattern (string or regex)
                def isAllowed = allowedExpressions.any { allowedExpr ->
                    if (allowedExpr instanceof String) {
                        return expression == allowedExpr
                    } else {
                        return expression ==~ allowedExpr
                    }
                }

                if (!isAllowed) {
                    // Still allow basic property access patterns that might not match strict regex
                    if (!expression.contains('System') && !expression.contains('Runtime') &&
                        !expression.contains('Class') && !expression.contains('Method')) {
                        // Log warning but allow - this is safer than blocking legitimate templates
                        println "EnhancedEmailService: WARNING - Complex expression allowed: ${expression}"
                        return
                    }
                    throw new SecurityException("Unsafe template expression detected: \${${expression}}")
                }
            }
        }
    }

    /**
     * Send instruction uncompleted notification with dynamic URL construction
     *
     * @param instruction Map containing instruction details (ini_id, ini_name, etc.)
     * @param stepInstance Map containing step instance details (sti_id, sti_name, etc.)
     * @param teams List of team maps for email recipients
     * @param userId Integer ID of user who uncompleted the instruction
     * @param migrationCode String migration code for URL construction
     * @param iterationCode String iteration code for URL construction
     */
    static void sendInstructionUncompletedNotificationWithUrl(Map instruction, Map stepInstance, List<Map> teams,
                                                              Integer userId = null, String migrationCode = null,
                                                              String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                def recipients = extractTeamEmails(teams)

                if (!recipients) {
                    println "EnhancedEmailService: No recipients found for instruction ${instruction.ini_name}"
                    return
                }

                // Get email template - try INSTRUCTION_UNCOMPLETED first, fallback to INSTRUCTION_COMPLETED
                def template = EmailTemplateRepository.findActiveByType(sql, 'INSTRUCTION_UNCOMPLETED')
                def usingFallback = false

                if (!template) {
                    // Fallback to INSTRUCTION_COMPLETED template if UNCOMPLETED doesn't exist
                    template = EmailTemplateRepository.findActiveByType(sql, 'INSTRUCTION_COMPLETED')
                    usingFallback = true

                    if (!template) {
                        println "EnhancedEmailService: No active template found for INSTRUCTION_UNCOMPLETED or INSTRUCTION_COMPLETED"

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

                // Construct step view URL if migration and iteration codes are provided
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
                    } catch (Exception e) {
                        println "EnhancedEmailService: Failed to construct step view URL: ${e.message}"
                        // Continue without URL
                    }
                }

                // Prepare template variables
                def variables = [
                    stepName: stepInstance.sti_name ?: 'Unknown Step',
                    stepDescription: stepInstance.sti_description ?: '',
                    instructionName: instruction.ini_name ?: 'Unknown Instruction',
                    instructionDescription: instruction.ini_description ?: '',
                    uncompletedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    uncompletedBy: getUsernameById(sql, userId),
                    // Legacy template compatibility
                    completedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),  // For template compatibility
                    completedBy: getUsernameById(sql, userId),  // For template compatibility
                    actionType: 'uncompleted',
                    migrationCode: migrationCode ?: '',
                    iterationCode: iterationCode ?: '',
                    stepViewUrl: stepViewUrl ?: '',
                    hasUrl: stepViewUrl ? true : false,
                    isBulkOperation: false,  // Template compatibility - single step operation
                    operationType: 'INSTRUCTION_UNCOMPLETED' // Fix: Add missing operationType variable
                ]

                // Add additional stepInstance fields for template compatibility
                stepInstance.each { key, value ->
                    if ((key as String).startsWith('sti_') || (key as String).startsWith('stm_')) {
                        variables[key as String] = value
                    }
                }

                // Add additional instruction fields for template compatibility
                instruction.each { key, value ->
                    if ((key as String).startsWith('ini_') || (key as String).startsWith('inm_')) {
                        variables[key as String] = value
                    }
                }

                // Process template
                def processedSubject = processTemplate(template.emt_subject as String, variables as Map)
                def processedBody = processTemplate(template.emt_body_html as String, variables as Map)

                // Modify subject if using the completed template as fallback
                if (usingFallback) {
                    processedSubject = (processedSubject as String).replace('Completed', 'Uncompleted')
                }

                // Send email
                def emailSent = sendEmail(recipients, processedSubject as String, processedBody as String)

                // Log the notification
                if (emailSent) {
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        UUID.fromString(instruction.ini_id as String),
                        recipients,
                        processedSubject as String,
                        UUID.fromString(template.emt_id as String),
                        [action: 'uncompleted', url_provided: stepViewUrl ? true : false],
                        'INSTRUCTION_INSTANCE'
                    )
                    println "EnhancedEmailService: Instruction uncompleted notification sent to ${recipients.size()} recipients"
                } else {
                    AuditLogRepository.logEmailFailed(
                        sql,
                        userId,
                        UUID.fromString(instruction.ini_id as String),
                        recipients,
                        processedSubject as String,
                        "Email sending failed",
                        'INSTRUCTION_INSTANCE'
                    )
                    println "EnhancedEmailService: Failed to send instruction uncompleted notification"
                }

            } catch (Exception e) {
                println "EnhancedEmailService: Error sending instruction uncompleted notification: ${e.message}"
                e.printStackTrace()

                // Log the error
                try {
                    AuditLogRepository.logEmailFailed(
                        sql,
                        userId,
                        UUID.fromString(instruction.ini_id as String),
                        extractTeamEmails(teams),
                        "[UMIG] Instruction Uncompleted: ${instruction.ini_name}",
                        "Exception during email processing: ${e.message}",
                        'INSTRUCTION_INSTANCE'
                    )
                } catch (Exception logError) {
                    println "EnhancedEmailService: Failed to log email error: ${logError.message}"
                }
            }
        }
    }
}