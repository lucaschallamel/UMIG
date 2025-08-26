package umig.utils

import groovy.json.JsonBuilder
import groovy.json.JsonOutput
import groovy.text.SimpleTemplateEngine
import groovy.sql.Sql
import groovy.text.Template
import java.util.Date
import java.util.UUID
import java.util.List
import java.util.Map
import java.util.HashMap
import java.util.ArrayList

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
import umig.utils.StepContentFormatter

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
 * @author UMIG Project Team
 * @since 2025-08-21
 */
class EnhancedEmailService {
    
    // Default from address for UMIG notifications
    private static final String DEFAULT_FROM_ADDRESS = 'umig-system@company.com'
    
    /**
     * Send notification when a USER changes step-level status with dynamic URL construction
     * Recipients: Assigned TEAM + IMPACTED TEAMS + IT CUTOVER TEAM
     */
    static void sendStepStatusChangedNotificationWithUrl(Map<String, Object> stepInstance, List<Map<String, Object>> teams, 
                                                        Map<String, Object> cutoverTeam, String oldStatus, String newStatus, 
                                                        Integer userId = null, String migrationCode = null, String iterationCode = null) {
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Debug logging
                println "EnhancedEmailService.sendStepStatusChangedNotificationWithUrl called:"
                println "  - Step: ${stepInstance?.get('sti_name')}"
                println "  - Old Status: ${oldStatus}"
                println "  - New Status: ${newStatus}"
                println "  - Teams count: ${teams?.size()}"
                println "  - Migration Code: ${migrationCode}"
                println "  - Iteration Code: ${iterationCode}"
                
                // Include cutover team in recipients
                List<Map<String, Object>> allTeams = new ArrayList<Map<String, Object>>(teams)
                if (cutoverTeam) {
                    allTeams.add(cutoverTeam)
                }
                List<String> recipients = extractTeamEmails(allTeams)
                
                println "  - Recipients extracted: ${recipients}"
                
                if (!recipients || recipients.isEmpty()) {
                    println "EnhancedEmailService: No recipients found for step status change ${stepInstance.get('sti_name')}"
                    return
                }
                
                // Get email template
                Map<String, Object> template = EmailTemplateRepository.findActiveByType(sql, 'STEP_STATUS_CHANGED')
                if (!template) {
                    println "EnhancedEmailService: No active template found for STEP_STATUS_CHANGED"
                    return
                }
                
                // Construct step view URL if migration and iteration codes are provided
                String stepViewUrl = null
                if (migrationCode && iterationCode && stepInstance.get('sti_id')) {
                    try {
                        Object stepIdValue = stepInstance.get('sti_id')
                        UUID stepInstanceUuid = stepIdValue instanceof UUID ? 
                            (UUID) stepIdValue : 
                            UUID.fromString(stepIdValue.toString())
                        
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
                
                // Enhanced content formatting for mobile (US-039 Phase 1)
                Map<String, Object> contentDetails = StepContentFormatter.formatStepContentForEmail(stepInstance, stepViewUrl)
                Map<String, Object> stepMetadata = StepContentFormatter.formatStepMetadata(stepInstance)
                
                // Prepare enhanced template variables with rich content and mobile support
                Map<String, Object> variables = new HashMap<String, Object>()
                variables.put('stepInstance', stepInstance)
                variables.put('oldStatus', oldStatus)
                variables.put('newStatus', newStatus)
                variables.put('statusColor', getStatusColor(newStatus))
                variables.put('changedAt', new Date().format('yyyy-MM-dd HH:mm:ss'))
                variables.put('changedBy', getUsernameById(sql, userId))
                variables.put('stepViewUrl', stepViewUrl)
                variables.put('hasStepViewUrl', stepViewUrl != null)
                variables.put('migrationCode', migrationCode)
                variables.put('iterationCode', iterationCode)
                // US-039 Phase 1: Rich content support
                variables.put('stepDescription', contentDetails.get('stepDescription'))
                variables.put('instructionsHtml', contentDetails.get('instructionsHtml'))
                variables.put('instructionsCount', contentDetails.get('instructionsCount'))
                variables.put('instructionsDisplayed', contentDetails.get('instructionsDisplayed'))
                variables.put('contentTruncated', contentDetails.get('contentTruncated'))
                variables.put('estimatedDuration', contentDetails.get('estimatedDuration'))
                variables.put('stepMetadata', stepMetadata)
                // Mobile template indicators
                variables.put('isMobileTemplate', true)
                variables.put('notificationType', 'STEP_STATUS_CHANGED')
                
                // Process template
                Object subjectValue = template.get('emt_subject')
                String subjectText = subjectValue != null ? subjectValue.toString() : ''
                Object bodyValue = template.get('emt_body_html')
                String bodyText = bodyValue != null ? bodyValue.toString() : ''
                
                String processedSubject = processTemplate(subjectText, variables)
                String processedBody = processTemplate(bodyText, variables)
                
                // Send email
                println "  - About to send email with subject: ${processedSubject}"
                boolean emailSent = sendEmail(recipients, processedSubject, processedBody)
                println "  - Email sent result: ${emailSent}"
                
                // Log the notification
                if (emailSent) {
                    Object stepIdForLogging = stepInstance.get('sti_id')
                    UUID stepIdUuid = stepIdForLogging instanceof UUID ? 
                        (UUID) stepIdForLogging : 
                        UUID.fromString(stepIdForLogging.toString())
                        
                    Object templateIdValue = template.get('emt_id')
                    UUID templateIdUuid = templateIdValue instanceof UUID ? 
                        (UUID) templateIdValue : 
                        UUID.fromString(templateIdValue.toString())
                        
                    Map<String, Object> auditData = new HashMap<String, Object>()
                    auditData.put('notification_type', 'STEP_STATUS_CHANGED_WITH_URL')
                    auditData.put('step_name', stepInstance.get('sti_name'))
                    auditData.put('old_status', oldStatus)
                    auditData.put('new_status', newStatus)
                    auditData.put('step_view_url', stepViewUrl)
                    auditData.put('migration_code', migrationCode)
                    auditData.put('iteration_code', iterationCode)
                    
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        stepIdUuid,
                        recipients,
                        processedSubject,
                        templateIdUuid,
                        auditData
                    )
                    
                    // Also log the status change itself
                    AuditLogRepository.logStepStatusChange(
                        sql,
                        userId,
                        stepIdUuid,
                        oldStatus,
                        newStatus
                    )
                }
                
            } catch (Exception e) {
                Map<String, Object> errorContext = new HashMap<String, Object>()
                errorContext.put('stepId', stepInstance.get('sti_id'))
                errorContext.put('oldStatus', oldStatus)
                errorContext.put('newStatus', newStatus)
                errorContext.put('migrationCode', migrationCode)
                errorContext.put('iterationCode', iterationCode)
                logError('sendStepStatusChangedNotificationWithUrl', e, errorContext)
                
                // Log the failure
                DatabaseUtil.withSql { Sql errorSql ->
                    // Rebuild allTeams list for error logging
                    List<Map<String, Object>> errorTeams = new ArrayList<Map<String, Object>>(teams)
                    if (cutoverTeam) {
                        errorTeams.add(cutoverTeam)
                    }
                    
                    Object stepIdForError = stepInstance.get('sti_id')
                    UUID stepIdErrorUuid = stepIdForError instanceof UUID ? 
                        (UUID) stepIdForError : 
                        UUID.fromString(stepIdForError.toString())
                        
                    AuditLogRepository.logEmailFailed(
                        errorSql,
                        userId,
                        stepIdErrorUuid,
                        extractTeamEmails(errorTeams),
                        "[UMIG] Step Status Changed: ${stepInstance.get('sti_name')}",
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
    static void sendStepOpenedNotificationWithUrl(Map<String, Object> stepInstance, List<Map<String, Object>> teams, 
                                                 Integer userId = null, String migrationCode = null, String iterationCode = null) {
        DatabaseUtil.withSql { Sql sql ->
            try {
                List<String> recipients = extractTeamEmails(teams)
                
                if (!recipients || recipients.isEmpty()) {
                    println "EnhancedEmailService: No recipients found for step ${stepInstance.get('sti_name')}"
                    return
                }
                
                // Get email template
                Map<String, Object> template = EmailTemplateRepository.findActiveByType(sql, 'STEP_OPENED')
                if (!template) {
                    println "EnhancedEmailService: No active template found for STEP_OPENED"
                    return
                }
                
                // Construct step view URL if migration and iteration codes are provided
                String stepViewUrl = null
                if (migrationCode && iterationCode && stepInstance.get('sti_id')) {
                    try {
                        Object stepIdValue = stepInstance.get('sti_id')
                        UUID stepInstanceUuid = stepIdValue instanceof UUID ? 
                            (UUID) stepIdValue : 
                            UUID.fromString(stepIdValue.toString())
                        
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
                
                // Enhanced content formatting for mobile (US-039 Phase 1)
                Map<String, Object> contentDetails = StepContentFormatter.formatStepContentForEmail(stepInstance, stepViewUrl)
                Map<String, Object> stepMetadata = StepContentFormatter.formatStepMetadata(stepInstance)
                
                // Prepare enhanced template variables with rich content
                Map<String, Object> variables = new HashMap<String, Object>()
                variables.put('stepInstance', stepInstance)
                variables.put('stepViewUrl', stepViewUrl)
                variables.put('hasStepViewUrl', stepViewUrl != null)
                variables.put('openedAt', new Date().format('yyyy-MM-dd HH:mm:ss'))
                variables.put('openedBy', getUsernameById(sql, userId))
                variables.put('migrationCode', migrationCode)
                variables.put('iterationCode', iterationCode)
                // US-039 Phase 1: Rich content support
                variables.put('stepDescription', contentDetails.get('stepDescription'))
                variables.put('instructionsHtml', contentDetails.get('instructionsHtml'))
                variables.put('instructionsCount', contentDetails.get('instructionsCount'))
                variables.put('instructionsDisplayed', contentDetails.get('instructionsDisplayed'))
                variables.put('contentTruncated', contentDetails.get('contentTruncated'))
                variables.put('estimatedDuration', contentDetails.get('estimatedDuration'))
                variables.put('stepMetadata', stepMetadata)
                // Mobile template indicators
                variables.put('isMobileTemplate', true)
                variables.put('notificationType', 'STEP_OPENED')
                
                // Process template
                Object subjectValue = template.get('emt_subject')
                String subjectText = subjectValue != null ? subjectValue.toString() : ''
                Object bodyValue = template.get('emt_body_html')
                String bodyText = bodyValue != null ? bodyValue.toString() : ''
                
                String processedSubject = processTemplate(subjectText, variables)
                String processedBody = processTemplate(bodyText, variables)
                
                // Send email
                boolean emailSent = sendEmail(recipients, processedSubject, processedBody)
                
                // Log the notification
                if (emailSent) {
                    Object stepIdForLogging = stepInstance.get('sti_id')
                    UUID stepIdUuid = stepIdForLogging instanceof UUID ? 
                        (UUID) stepIdForLogging : 
                        UUID.fromString(stepIdForLogging.toString())
                        
                    Object templateIdValue2 = template.get('emt_id')
                    UUID templateIdUuid2 = templateIdValue2 instanceof UUID ? 
                        (UUID) templateIdValue2 : 
                        UUID.fromString(templateIdValue2.toString())
                        
                    Map<String, Object> auditData2 = new HashMap<String, Object>()
                    auditData2.put('notification_type', 'STEP_OPENED_WITH_URL')
                    auditData2.put('step_name', stepInstance.get('sti_name'))
                    auditData2.put('migration_name', stepInstance.get('migration_name'))
                    auditData2.put('step_view_url', stepViewUrl)
                    auditData2.put('migration_code', migrationCode)
                    auditData2.put('iteration_code', iterationCode)
                        
                    AuditLogRepository.logEmailSent(
                        sql, 
                        userId, 
                        stepIdUuid,
                        recipients,
                        processedSubject,
                        templateIdUuid2,
                        auditData2
                    )
                }
                
            } catch (Exception e) {
                Map<String, Object> errorContext2 = new HashMap<String, Object>()
                errorContext2.put('stepId', stepInstance.get('sti_id'))
                logError('sendStepOpenedNotificationWithUrl', e, errorContext2)
                
                // Log the failure
                DatabaseUtil.withSql { Sql errorSql ->
                    Object stepIdForError = stepInstance.get('sti_id')
                    UUID stepIdErrorUuid = stepIdForError instanceof UUID ? 
                        (UUID) stepIdForError : 
                        UUID.fromString(stepIdForError.toString())
                        
                    AuditLogRepository.logEmailFailed(
                        errorSql,
                        userId,
                        stepIdErrorUuid,
                        extractTeamEmails(teams),
                        "[UMIG] Step Ready: ${stepInstance.get('sti_name')}",
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
    static void sendInstructionCompletedNotificationWithUrl(Map<String, Object> instruction, Map<String, Object> stepInstance, 
                                                           List<Map<String, Object>> teams, Integer userId = null, 
                                                           String migrationCode = null, String iterationCode = null) {
        DatabaseUtil.withSql { Sql sql ->
            try {
                List<String> recipients = extractTeamEmails(teams)
                
                if (!recipients || recipients.isEmpty()) {
                    println "EnhancedEmailService: No recipients found for instruction ${instruction.get('ini_name')}"
                    return
                }
                
                // Get email template
                Map<String, Object> template = EmailTemplateRepository.findActiveByType(sql, 'INSTRUCTION_COMPLETED')
                if (!template) {
                    println "EnhancedEmailService: No active template found for INSTRUCTION_COMPLETED"
                    return
                }
                
                // Construct step view URL if migration and iteration codes are provided
                String stepViewUrl = null
                if (migrationCode && iterationCode && stepInstance.get('sti_id')) {
                    try {
                        Object stepIdValue = stepInstance.get('sti_id')
                        UUID stepInstanceUuid = stepIdValue instanceof UUID ? 
                            (UUID) stepIdValue : 
                            UUID.fromString(stepIdValue.toString())
                        
                        stepViewUrl = UrlConstructionService.buildStepViewUrl(
                            stepInstanceUuid, 
                            migrationCode, 
                            iterationCode
                        )
                    } catch (Exception urlException) {
                        println "EnhancedEmailService: Error constructing step view URL: ${urlException.message}"
                    }
                }
                
                // Enhanced content formatting for mobile (US-039 Phase 1)
                Map<String, Object> contentDetails = StepContentFormatter.formatStepContentForEmail(stepInstance, stepViewUrl)
                Map<String, Object> stepMetadata = StepContentFormatter.formatStepMetadata(stepInstance)
                
                // Prepare enhanced template variables with rich content
                Map<String, Object> variables = new HashMap<String, Object>()
                variables.put('instruction', instruction)
                variables.put('stepInstance', stepInstance)
                variables.put('completedAt', new Date().format('yyyy-MM-dd HH:mm:ss'))
                variables.put('completedBy', getUsernameById(sql, userId))
                variables.put('stepViewUrl', stepViewUrl)
                variables.put('hasStepViewUrl', stepViewUrl != null)
                variables.put('migrationCode', migrationCode)
                variables.put('iterationCode', iterationCode)
                // US-039 Phase 1: Rich content support
                variables.put('stepDescription', contentDetails.get('stepDescription'))
                variables.put('instructionsHtml', contentDetails.get('instructionsHtml'))
                variables.put('instructionsCount', contentDetails.get('instructionsCount'))
                variables.put('instructionsDisplayed', contentDetails.get('instructionsDisplayed'))
                variables.put('contentTruncated', contentDetails.get('contentTruncated'))
                variables.put('estimatedDuration', contentDetails.get('estimatedDuration'))
                variables.put('stepMetadata', stepMetadata)
                // Mobile template indicators
                variables.put('isMobileTemplate', true)
                variables.put('notificationType', 'INSTRUCTION_COMPLETED')
                
                // Process template
                Object subjectValue = template.get('emt_subject')
                String subjectText = subjectValue != null ? subjectValue.toString() : ''
                Object bodyValue = template.get('emt_body_html')
                String bodyText = bodyValue != null ? bodyValue.toString() : ''
                
                String processedSubject = processTemplate(subjectText, variables)
                String processedBody = processTemplate(bodyText, variables)
                
                // Send email
                boolean emailSent = sendEmail(recipients, processedSubject, processedBody)
                
                // Log the notification
                if (emailSent) {
                    Object instructionIdValue = instruction.get('ini_id')
                    UUID instructionIdUuid = instructionIdValue instanceof UUID ? 
                        (UUID) instructionIdValue : 
                        UUID.fromString(instructionIdValue.toString())
                        
                    Object templateIdValue3 = template.get('emt_id')
                    UUID templateIdUuid3 = templateIdValue3 instanceof UUID ? 
                        (UUID) templateIdValue3 : 
                        UUID.fromString(templateIdValue3.toString())
                        
                    Map<String, Object> auditData3 = new HashMap<String, Object>()
                    auditData3.put('notification_type', 'INSTRUCTION_COMPLETED_WITH_URL')
                    auditData3.put('instruction_name', instruction.get('ini_name'))
                    auditData3.put('step_name', stepInstance.get('sti_name'))
                    auditData3.put('step_view_url', stepViewUrl)
                    auditData3.put('migration_code', migrationCode)
                    auditData3.put('iteration_code', iterationCode)
                        
                    AuditLogRepository.logEmailSent(
                        sql,
                        userId,
                        instructionIdUuid,
                        recipients,
                        processedSubject,
                        templateIdUuid3,
                        auditData3
                    )
                }
                
            } catch (Exception e) {
                Map<String, Object> errorContext3 = new HashMap<String, Object>()
                errorContext3.put('instructionId', instruction.get('ini_id'))
                errorContext3.put('stepId', stepInstance.get('sti_id'))
                logError('sendInstructionCompletedNotificationWithUrl', e, errorContext3)
                
                // Log the failure
                DatabaseUtil.withSql { Sql errorSql ->
                    Object instructionIdForError = instruction.get('ini_id')
                    UUID instructionIdErrorUuid = instructionIdForError instanceof UUID ? 
                        (UUID) instructionIdForError : 
                        UUID.fromString(instructionIdForError.toString())
                        
                    AuditLogRepository.logEmailFailed(
                        errorSql,
                        userId,
                        instructionIdErrorUuid,
                        extractTeamEmails(teams),
                        "[UMIG] Instruction Completed: ${instruction.get('ini_name')}",
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
     * Core email sending method using Confluence's native mail API
     * Delegates to EmailService for consistency
     */
    private static boolean sendEmail(List<String> recipients, String subject, String body) {
        return EmailService.sendEmail(recipients, subject, body)
    }
    
    /**
     * Process template with Groovy's SimpleTemplateEngine
     * Enhanced to handle URL construction variables
     */
    private static String processTemplate(String templateText, Map<String, Object> variables) {
        try {
            SimpleTemplateEngine engine = new SimpleTemplateEngine()
            Template template = engine.createTemplate(templateText)
            return template.make(variables).toString()
        } catch (Exception e) {
            println "EnhancedEmailService: Template processing error - ${e.message}"
            throw new RuntimeException("Failed to process email template", e)
        }
    }
    
    /**
     * Extract email addresses from team objects
     */
    private static List<String> extractTeamEmails(List<Map<String, Object>> teams) {
        if (!teams) {
            return new ArrayList<String>()
        }
        
        List<String> emails = new ArrayList<String>()
        for (Map<String, Object> team : teams) {
            Object emailValue = team.get('tms_email')
            if (emailValue != null) {
                String email = emailValue.toString()
                if (email && email.trim()) {
                    emails.add(email)
                }
            }
        }
        return emails
    }
    
    /**
     * Get username by user ID
     */
    private static String getUsernameById(Sql sql, Integer userId) {
        if (!userId) {
            return "System"
        }
        
        try {
            Map<String, Object> user = sql.firstRow('SELECT usr_username FROM users_usr WHERE usr_id = ?', [userId])
            if (user && user.get('usr_username')) {
                return user.get('usr_username').toString()
            } else {
                return "User ${userId}"
            }
        } catch (Exception e) {
            return "User ${userId}"
        }
    }
    
    /**
     * Get color for status display
     */
    private static String getStatusColor(String status) {
        if (!status) {
            return '#6c757d'
        }
        
        String upperStatus = status.toUpperCase()
        switch (upperStatus) {
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
     * Format date for display (ADR-031 type safety)
     */
    private static String formatDate(Date date) {
        if (!date) {
            return 'Not specified'
        }
        try {
            return date.format('yyyy-MM-dd HH:mm')
        } catch (Exception e) {
            return 'Invalid date'
        }
    }
    
    /**
     * Log errors for debugging and monitoring
     */
    private static void logError(String method, Exception error, Map<String, Object> context = new HashMap<String, Object>()) {
        println "EnhancedEmailService ERROR in ${method}: ${error.message}"
        println "EnhancedEmailService ERROR context: ${context}"
        error.printStackTrace()
    }
    
    /**
     * Check if mobile template enhancements are available (US-039 Phase 1)
     */
    static boolean isMobileTemplateEnhancementAvailable() {
        try {
            // Test if StepContentFormatter is available and functional
            Map<String, Object> healthCheck = StepContentFormatter.healthCheck()
            Object statusValue = healthCheck.get('status')
            return statusValue != null && statusValue.toString() == 'healthy'
        } catch (Exception e) {
            println "EnhancedEmailService: Mobile template enhancement not available: ${e.message}"
            return false
        }
    }
    
    /**
     * Health check for monitoring URL construction capabilities and mobile enhancements
     */
    static Map<String, Object> healthCheck() {
        try {
            Map<String, Object> urlServiceHealth = UrlConstructionService.healthCheck()
            Object statusValue = urlServiceHealth.get('status')
            boolean configHealth = statusValue != null && statusValue.toString() == 'healthy'
            
            Map<String, Object> capabilities = new HashMap<String, Object>()
            capabilities.put('dynamicUrls', configHealth)
            capabilities.put('emailTemplates', true)
            capabilities.put('auditLogging', true)
            capabilities.put('mobileTemplateEnhancements', isMobileTemplateEnhancementAvailable())
            capabilities.put('richContentFormatting', isMobileTemplateEnhancementAvailable())
            capabilities.put('htmlSanitization', isMobileTemplateEnhancementAvailable())
            
            Map<String, Object> result = new HashMap<String, Object>()
            result.put('service', 'EnhancedEmailService')
            result.put('status', configHealth ? 'healthy' : 'degraded')
            result.put('urlConstruction', urlServiceHealth)
            result.put('capabilities', capabilities)
            result.put('timestamp', new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"))
            
            return result
        } catch (Exception e) {
            Map<String, Object> errorResult = new HashMap<String, Object>()
            errorResult.put('service', 'EnhancedEmailService')
            errorResult.put('status', 'error')
            errorResult.put('error', e.message)
            errorResult.put('timestamp', new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"))
            
            return errorResult
        }
    }
    
    /**
     * Send step email with explicit TO, CC, BCC recipients
     * Used for manual email sending from StepView with proper recipient configuration
     * 
     * @param stepInstance The step instance data
     * @param toRecipients List of email addresses for TO field (assigned team)
     * @param ccRecipients List of email addresses for CC field (impacted teams)
     * @param bccRecipients List of email addresses for BCC field (IT_CUTOVER team)
     * @param userId Optional user ID for audit logging
     * @param migrationCode Migration code for URL construction
     * @param iterationCode Iteration code for URL construction
     * @return Map with sending result
     */
    static Map<String, Object> sendStepEmailWithRecipients(Map<String, Object> stepInstance, List<String> toRecipients, 
                                          List<String> ccRecipients, List<String> bccRecipients,
                                          Integer userId = null, String migrationCode = null, 
                                          String iterationCode = null) {
        return DatabaseUtil.withSql { Sql sql ->
            try {
                // Validate recipients
                if ((!toRecipients || toRecipients.isEmpty()) && 
                    (!ccRecipients || ccRecipients.isEmpty()) && 
                    (!bccRecipients || bccRecipients.isEmpty())) {
                    Map<String, Object> errorResult = new HashMap<String, Object>()
                    errorResult.put('success', false)
                    errorResult.put('error', "No recipients specified")
                    return errorResult
                }
                
                // Get enhanced mobile email template
                Map<String, Object> template = EmailTemplateRepository.findActiveByType(sql, 'STEP_OPENED')
                if (!template) {
                    println "EnhancedEmailService: No active template found for STEP_OPENED"
                    Map<String, Object> errorResult = new HashMap<String, Object>()
                    errorResult.put('success', false)
                    errorResult.put('error', "No active email template found")
                    return errorResult
                }
                
                // Construct step view URL if migration and iteration codes are provided
                String stepViewUrl = null
                if (migrationCode && iterationCode && stepInstance.get('sti_id')) {
                    try {
                        Object stepIdValue = stepInstance.get('sti_id')
                        UUID stepInstanceUuid = stepIdValue instanceof UUID ? 
                            (UUID) stepIdValue : 
                            UUID.fromString(stepIdValue.toString())
                        
                        stepViewUrl = UrlConstructionService.buildStepViewUrl(
                            stepInstanceUuid, 
                            migrationCode, 
                            iterationCode
                        )
                    } catch (Exception urlException) {
                        println "EnhancedEmailService: Error constructing step view URL: ${urlException.message}"
                    }
                }
                
                // Format step content using StepContentFormatter
                Map<String, Object> contentDetails = StepContentFormatter.formatStepContentForEmail(stepInstance, stepViewUrl)
                
                // Build mobile-responsive HTML using enhanced template
                SimpleTemplateEngine templateEngine = new SimpleTemplateEngine()
                Object templateTextValue = template.get('emt_body_html')
                String templateText = templateTextValue != null ? templateTextValue.toString() : ''
                Template templateObject = templateEngine.createTemplate(templateText)
                
                Map<String, Object> binding = new HashMap<String, Object>()
                binding.put('stepName', stepInstance.get('sti_name') ?: 'Step')
                binding.put('stepNumber', stepInstance.get('stm_number') ?: '')
                binding.put('stepId', stepInstance.get('sti_id'))
                binding.put('stepDescription', stepInstance.get('sti_description') ?: '')
                
                // Safe date handling
                Object startDateValue = stepInstance.get('sti_start_date')
                binding.put('stepStartDate', formatDate(startDateValue instanceof Date ? (Date) startDateValue : null))
                Object endDateValue = stepInstance.get('sti_end_date')
                binding.put('stepEndDate', formatDate(endDateValue instanceof Date ? (Date) endDateValue : null))
                
                binding.put('stepDuration', stepInstance.get('sti_duration_hour') ?: 0)
                binding.put('stepStatus', stepInstance.get('status_name') ?: 'PENDING')
                binding.put('stepStatusColor', getStatusColor(stepInstance.get('status_name') as String))
                binding.put('assignedTeam', stepInstance.get('owner_team_name') ?: 'Unassigned')
                binding.put('stepUrl', stepViewUrl ?: '#')
                binding.put('stepContent', contentDetails.get('instructionsHtml') as String)
                binding.put('migrationName', stepInstance.get('migration_name') ?: 'Migration')
                binding.put('iterationName', stepInstance.get('iteration_name') ?: 'Iteration')
                binding.put('phaseName', stepInstance.get('phase_name') ?: '')
                binding.put('sequenceName', stepInstance.get('sequence_name') ?: '')
                binding.put('planName', stepInstance.get('plan_name') ?: '')
                binding.put('year', new Date().format('yyyy'))
                
                String htmlContent = templateObject.make(binding).toString()
                
                // Send email with proper recipient configuration
                String stepNumberStr = stepInstance.get('stm_number') ? stepInstance.get('stm_number').toString() : ''
                String stepNameStr = stepInstance.get('sti_name') ? stepInstance.get('sti_name').toString() : 'Update'
                String subject = "Step ${stepNumberStr}: ${stepNameStr}"
                
                // Configure email with TO, CC, BCC
                boolean emailSent = EmailService.sendEmailWithCCAndBCC(
                    toRecipients.join(','),
                    ccRecipients && !ccRecipients.isEmpty() ? ccRecipients.join(',') : null,
                    bccRecipients && !bccRecipients.isEmpty() ? bccRecipients.join(',') : null,
                    subject,
                    htmlContent,
                    true // isHtml
                )
                
                if (emailSent) {
                    println "EnhancedEmailService: Email sent successfully to TO: ${toRecipients}, CC: ${ccRecipients}, BCC: ${bccRecipients}"
                    
                    Map<String, Object> recipientsInfo = new HashMap<String, Object>()
                    recipientsInfo.put('to', toRecipients)
                    recipientsInfo.put('cc', ccRecipients)
                    recipientsInfo.put('bcc', bccRecipients)
                    
                    int totalRecipients = (toRecipients ? toRecipients.size() : 0) + 
                                          (ccRecipients ? ccRecipients.size() : 0) + 
                                          (bccRecipients ? bccRecipients.size() : 0)
                    
                    Map<String, Object> successResult = new HashMap<String, Object>()
                    successResult.put('success', true)
                    successResult.put('recipients', recipientsInfo)
                    successResult.put('total', totalRecipients)
                    
                    return successResult
                } else {
                    Map<String, Object> errorResult = new HashMap<String, Object>()
                    errorResult.put('success', false)
                    errorResult.put('error', "Failed to send email")
                    return errorResult
                }
                
            } catch (Exception e) {
                Map<String, Object> errorContext4 = new HashMap<String, Object>()
                errorContext4.put('stepId', stepInstance.get('sti_id'))
                logError('sendStepEmailWithRecipients', e, errorContext4)
                Map<String, Object> errorResult = new HashMap<String, Object>()
                errorResult.put('success', false)
                errorResult.put('error', e.message)
                return errorResult
            }
        }
    }
}