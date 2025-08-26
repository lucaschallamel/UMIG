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
                
                // Enhanced content formatting for mobile (US-039 Phase 1)
                def contentDetails = StepContentFormatter.formatStepContentForEmail(stepInstance, stepViewUrl)
                def stepMetadata = StepContentFormatter.formatStepMetadata(stepInstance)
                
                // Prepare enhanced template variables with rich content and mobile support
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
                    // US-039 Phase 1: Rich content support
                    stepDescription: contentDetails.stepDescription,
                    instructionsHtml: contentDetails.instructionsHtml,
                    instructionsCount: contentDetails.instructionsCount,
                    instructionsDisplayed: contentDetails.instructionsDisplayed,
                    contentTruncated: contentDetails.contentTruncated,
                    estimatedDuration: contentDetails.estimatedDuration,
                    stepMetadata: stepMetadata,
                    // Mobile template indicators
                    isMobileTemplate: true,
                    notificationType: 'STEP_STATUS_CHANGED'
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
                
                // Enhanced content formatting for mobile (US-039 Phase 1)
                def contentDetails = StepContentFormatter.formatStepContentForEmail(stepInstance, stepViewUrl)
                def stepMetadata = StepContentFormatter.formatStepMetadata(stepInstance)
                
                // Prepare enhanced template variables with rich content
                def variables = [
                    stepInstance: stepInstance,
                    stepViewUrl: stepViewUrl,
                    hasStepViewUrl: stepViewUrl != null,
                    openedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    openedBy: getUsernameById(sql, userId),
                    migrationCode: migrationCode,
                    iterationCode: iterationCode,
                    // US-039 Phase 1: Rich content support
                    stepDescription: contentDetails.stepDescription,
                    instructionsHtml: contentDetails.instructionsHtml,
                    instructionsCount: contentDetails.instructionsCount,
                    instructionsDisplayed: contentDetails.instructionsDisplayed,
                    contentTruncated: contentDetails.contentTruncated,
                    estimatedDuration: contentDetails.estimatedDuration,
                    stepMetadata: stepMetadata,
                    // Mobile template indicators
                    isMobileTemplate: true,
                    notificationType: 'STEP_OPENED'
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
                
                // Enhanced content formatting for mobile (US-039 Phase 1)
                def contentDetails = StepContentFormatter.formatStepContentForEmail(stepInstance, stepViewUrl)
                def stepMetadata = StepContentFormatter.formatStepMetadata(stepInstance)
                
                // Prepare enhanced template variables with rich content
                def variables = [
                    instruction: instruction,
                    stepInstance: stepInstance,
                    completedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    completedBy: getUsernameById(sql, userId),
                    stepViewUrl: stepViewUrl,
                    hasStepViewUrl: stepViewUrl != null,
                    migrationCode: migrationCode,
                    iterationCode: iterationCode,
                    // US-039 Phase 1: Rich content support
                    stepDescription: contentDetails.stepDescription,
                    instructionsHtml: contentDetails.instructionsHtml,
                    instructionsCount: contentDetails.instructionsCount,
                    instructionsDisplayed: contentDetails.instructionsDisplayed,
                    contentTruncated: contentDetails.contentTruncated,
                    estimatedDuration: contentDetails.estimatedDuration,
                    stepMetadata: stepMetadata,
                    // Mobile template indicators
                    isMobileTemplate: true,
                    notificationType: 'INSTRUCTION_COMPLETED'
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
    private static void logError(String method, Exception error, Map context = [:]) {
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
            def healthCheck = StepContentFormatter.healthCheck()
            return healthCheck.status == 'healthy'
        } catch (Exception e) {
            println "EnhancedEmailService: Mobile template enhancement not available: ${e.message}"
            return false
        }
    }
    
    /**
     * Health check for monitoring URL construction capabilities and mobile enhancements
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
                    auditLogging: true,
                    mobileTemplateEnhancements: isMobileTemplateEnhancementAvailable(),
                    richContentFormatting: isMobileTemplateEnhancementAvailable(),
                    htmlSanitization: isMobileTemplateEnhancementAvailable()
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
    static Map sendStepEmailWithRecipients(Map stepInstance, List<String> toRecipients, 
                                          List<String> ccRecipients, List<String> bccRecipients,
                                          Integer userId = null, String migrationCode = null, 
                                          String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Validate recipients
                if (!toRecipients && !ccRecipients && !bccRecipients) {
                    return [
                        success: false,
                        error: "No recipients specified"
                    ]
                }
                
                // Get enhanced mobile email template
                def template = EmailTemplateRepository.findActiveByType(sql, 'STEP_OPENED')
                if (!template) {
                    println "EnhancedEmailService: No active template found for STEP_OPENED"
                    return [
                        success: false,
                        error: "No active email template found"
                    ]
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
                
                // Format step content using StepContentFormatter - Fix method signature
                def contentDetails = StepContentFormatter.formatStepContentForEmail(stepInstance, stepViewUrl)
                
                // Build mobile-responsive HTML using enhanced template - Fix type casting
                def templateEngine = new SimpleTemplateEngine()
                def templateText = template.emt_body_html as String
                def templateObject = templateEngine.createTemplate(templateText)
                
                def binding = [
                    stepName: stepInstance.sti_name ?: 'Step',
                    stepNumber: stepInstance.stm_number ?: '',
                    stepId: stepInstance.sti_id,
                    stepDescription: stepInstance.sti_description ?: '',
                    stepStartDate: formatDate(stepInstance.sti_start_date as Date),
                    stepEndDate: formatDate(stepInstance.sti_end_date as Date),
                    stepDuration: stepInstance.sti_duration_hour ?: 0,
                    stepStatus: stepInstance.status_name ?: 'PENDING',
                    stepStatusColor: getStatusColor(stepInstance.status_name as String),
                    assignedTeam: stepInstance.owner_team_name ?: 'Unassigned',
                    stepUrl: stepViewUrl ?: '#',
                    stepContent: contentDetails.instructionsHtml as String,
                    migrationName: stepInstance.migration_name ?: 'Migration',
                    iterationName: stepInstance.iteration_name ?: 'Iteration',
                    phaseName: stepInstance.phase_name ?: '',
                    sequenceName: stepInstance.sequence_name ?: '',
                    planName: stepInstance.plan_name ?: '',
                    year: new Date().format('yyyy')
                ] as Map<String, Object>
                
                def htmlContent = templateObject.make(binding).toString()
                
                // Send email with proper recipient configuration
                def subject = "Step ${stepInstance.stm_number ?: ''}: ${stepInstance.sti_name ?: 'Update'}"
                
                // Configure email with TO, CC, BCC
                def emailSent = EmailService.sendEmailWithCCAndBCC(
                    toRecipients.join(','),
                    ccRecipients ? ccRecipients.join(',') : null,
                    bccRecipients ? bccRecipients.join(',') : null,
                    subject,
                    htmlContent,
                    true // isHtml
                )
                
                if (emailSent) {
                    println "EnhancedEmailService: Email sent successfully to TO: ${toRecipients}, CC: ${ccRecipients}, BCC: ${bccRecipients}"
                    return [
                        success: true,
                        recipients: [
                            to: toRecipients,
                            cc: ccRecipients,
                            bcc: bccRecipients
                        ],
                        total: toRecipients.size() + ccRecipients.size() + bccRecipients.size()
                    ]
                } else {
                    return [
                        success: false,
                        error: "Failed to send email"
                    ]
                }
                
            } catch (Exception e) {
                logError('sendStepEmailWithRecipients', e, [stepId: stepInstance.sti_id])
                return [
                    success: false,
                    error: e.message
                ]
            }
        }
    }
}