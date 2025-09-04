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
                    // Template-specific variables (must be top-level for template access)
                    // US-056B Phase 2: Enhanced CommentDTO processing for template compatibility
                    recentComments: EmailService.processCommentsForTemplate(stepInstance?.recentComments),
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
                    // Template-specific variables (must be top-level for template access)
                    // US-056B Phase 2: Enhanced CommentDTO processing for template compatibility
                    recentComments: EmailService.processCommentsForTemplate(stepInstance?.recentComments),
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
                    // Template-specific variables (must be top-level for template access)
                    // US-056B Phase 2: Enhanced CommentDTO processing for template compatibility
                    recentComments: EmailService.processCommentsForTemplate(stepInstance?.recentComments),
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
    private static String processTemplate(String templateText, Map variables) {
        try {
            def engine = new SimpleTemplateEngine()
            def template = engine.createTemplate(templateText)
            return template.make(variables).toString()
        } catch (Exception e) {
            println "EnhancedEmailService: Template processing error - ${e.message}"
            throw new RuntimeException("Failed to process email template", e)
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
}