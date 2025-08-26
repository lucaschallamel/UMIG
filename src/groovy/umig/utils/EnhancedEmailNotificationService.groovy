package umig.utils

import groovy.sql.Sql
import groovy.text.SimpleTemplateEngine
import umig.utils.DatabaseUtil
import umig.utils.EmailService
import umig.utils.UrlConstructionService
import umig.utils.StepContentFormatter
import umig.repository.EmailTemplateRepository
import umig.repository.AuditLogRepository
import java.util.UUID

/**
 * EnhancedEmailNotificationService - Automated email triggers with mobile templates
 * 
 * US-039 Phase 1 Implementation: Complete automated email notification system
 * with mobile-responsive templates, rich content formatting, and proper
 * TO/CC/BCC recipient routing.
 * 
 * This service completes the automated triggers for:
 * - Step status changes
 * - Step opening by PILOT users
 * - Instruction completion by assigned teams
 * 
 * All notifications use the enhanced mobile template for optimal viewing
 * on mobile email clients (Gmail, Outlook, Apple Mail, etc.)
 * 
 * @author UMIG Project Team
 * @since 2025-08-26
 */
class EnhancedEmailNotificationService {
    
    private static final boolean DEBUG_MODE = true
    
    /**
     * Send automated notification for step status changes
     * Uses mobile template with rich content formatting
     * 
     * Recipients:
     * - TO: Assigned team
     * - CC: Impacted teams
     * - BCC: IT Cutover team
     */
    static void sendAutomatedStatusChangeNotification(Map stepInstance, List<Map> teams, Map cutoverTeam,
                                                     String oldStatus, String newStatus, Integer userId = null,
                                                     String migrationCode = null, String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Extract team emails by role
                def assignedTeamEmails = teams.findAll { it.role_type == 'ASSIGNED' }
                    .collect { it.tms_email as String }
                def impactedTeamEmails = teams.findAll { it.role_type == 'IMPACTED' }
                    .collect { it.tms_email as String }
                def cutoverTeamEmail = cutoverTeam ? [cutoverTeam.tms_email as String] : []
                
                if (!assignedTeamEmails && !impactedTeamEmails) {
                    println "EnhancedEmailNotificationService: No recipients for status change"
                    return
                }
                
                // Build step URL if context available
                def stepViewUrl = null
                if (migrationCode && iterationCode && stepInstance.sti_id) {
                    try {
                        def stepInstanceUuid = stepInstance.sti_id instanceof UUID ?
                            stepInstance.sti_id : UUID.fromString(stepInstance.sti_id.toString())
                        stepViewUrl = UrlConstructionService.buildStepViewUrl(
                            stepInstanceUuid, migrationCode, iterationCode
                        )
                    } catch (Exception e) {
                        println "Error building step URL: ${e.message}"
                    }
                }
                
                // Format content for mobile email
                def contentDetails = StepContentFormatter.formatStepContentForEmail(stepInstance, stepViewUrl)
                
                // Get mobile email template
                def template = getMobileEmailTemplate(sql)
                if (!template) {
                    println "Mobile template not found - cannot send notification"
                    return
                }
                
                // Prepare template binding with rich content
                def binding = [
                    // Core step information
                    stepName: stepInstance.sti_name ?: 'Step',
                    stepNumber: stepInstance.stm_number ?: '',
                    stepStatus: newStatus,
                    stepStatusColor: getStatusColor(newStatus),
                    oldStatus: oldStatus,
                    statusChangeType: getStatusChangeType(oldStatus, newStatus),
                    
                    // Step content and instructions
                    stepDescription: contentDetails.stepDescription ?: '',
                    instructionsHtml: contentDetails.instructionsHtml ?: '<p>No instructions available</p>',
                    instructionsCount: contentDetails.instructionsCount ?: 0,
                    instructionsDisplayed: contentDetails.instructionsDisplayed ?: 0,
                    contentTruncated: contentDetails.contentTruncated ?: false,
                    estimatedDuration: contentDetails.estimatedDuration ?: 'N/A',
                    
                    // Team assignments
                    assignedTeam: teams.find { it.role_type == 'ASSIGNED' }?.tms_name ?: 'Unassigned',
                    impactedTeams: teams.findAll { it.role_type == 'IMPACTED' }*.tms_name?.join(', ') ?: 'None',
                    
                    // URL and navigation
                    stepUrl: stepViewUrl ?: '#',
                    hasUrl: stepViewUrl != null,
                    
                    // Context information
                    migrationName: stepInstance.migration_name ?: 'Migration',
                    iterationName: stepInstance.iteration_name ?: 'Iteration',
                    phaseName: stepInstance.phase_name ?: '',
                    sequenceName: stepInstance.sequence_name ?: '',
                    
                    // Metadata
                    changedAt: new Date().format('MMM d, yyyy h:mm a'),
                    changedBy: getUsernameById(sql, userId) ?: 'System',
                    notificationType: 'STATUS_CHANGE',
                    year: new Date().format('yyyy')
                ] as Map<String, Object>
                
                // Process mobile template
                def templateEngine = new SimpleTemplateEngine()
                def templateObject = templateEngine.createTemplate(template.emt_body_html as String)
                def htmlContent = templateObject.make(binding).toString()
                
                // Create subject line with status transition
                def subject = "UMIG Step Status: ${stepInstance.sti_name} → ${newStatus}"
                if (newStatus == 'COMPLETED') {
                    subject = "✅ ${subject}"
                } else if (newStatus == 'READY') {
                    subject = "🔵 ${subject}"
                } else if (newStatus == 'IN_PROGRESS') {
                    subject = "🟡 ${subject}"
                }
                
                // Send email with proper routing
                def emailSent = EmailService.sendEmailWithCCAndBCC(
                    assignedTeamEmails.join(','),
                    impactedTeamEmails ? impactedTeamEmails.join(',') : null,
                    cutoverTeamEmail ? cutoverTeamEmail.join(',') : null,
                    subject,
                    htmlContent,
                    true // isHtml
                )
                
                if (emailSent) {
                    println "Status change notification sent successfully"
                    logEmailAudit(sql, userId, stepInstance.sti_id, 
                        'STATUS_CHANGE', subject, 
                        assignedTeamEmails.size() + impactedTeamEmails.size() + cutoverTeamEmail.size())
                }
                
            } catch (Exception e) {
                println "Error sending status change notification: ${e.message}"
                e.printStackTrace()
            }
        }
    }
    
    /**
     * Send automated notification when step is opened by PILOT
     * Uses mobile template with action-oriented formatting
     */
    static void sendAutomatedStepOpenedNotification(Map stepInstance, List<Map> teams, Integer userId = null,
                                                   String migrationCode = null, String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Extract team emails
                def assignedTeamEmails = teams.findAll { it.role_type == 'ASSIGNED' }
                    .collect { it.tms_email as String }
                def impactedTeamEmails = teams.findAll { it.role_type == 'IMPACTED' }
                    .collect { it.tms_email as String }
                
                if (!assignedTeamEmails) {
                    println "No assigned team for step opened notification"
                    return
                }
                
                // Build step URL
                def stepViewUrl = buildStepUrl(stepInstance.sti_id, migrationCode, iterationCode)
                
                // Format content
                def contentDetails = StepContentFormatter.formatStepContentForEmail(stepInstance, stepViewUrl)
                
                // Get mobile template
                def template = getMobileEmailTemplate(sql)
                if (!template) {
                    return
                }
                
                // Template binding
                def binding = [
                    stepName: stepInstance.sti_name ?: 'Step',
                    stepNumber: stepInstance.stm_number ?: '',
                    stepStatus: 'READY',
                    stepStatusColor: '#4CAF50',
                    stepDescription: contentDetails.stepDescription ?: '',
                    instructionsHtml: contentDetails.instructionsHtml ?: '',
                    instructionsCount: contentDetails.instructionsCount ?: 0,
                    estimatedDuration: contentDetails.estimatedDuration ?: 'N/A',
                    assignedTeam: teams.find { it.role_type == 'ASSIGNED' }?.tms_name ?: 'Unassigned',
                    stepUrl: stepViewUrl ?: '#',
                    hasUrl: stepViewUrl != null,
                    openedBy: getUsernameById(sql, userId) ?: 'PILOT User',
                    openedAt: new Date().format('MMM d, yyyy h:mm a'),
                    migrationName: stepInstance.migration_name ?: '',
                    iterationName: stepInstance.iteration_name ?: '',
                    notificationType: 'STEP_OPENED',
                    actionRequired: true,
                    year: new Date().format('yyyy')
                ] as Map<String, Object>
                
                // Process template
                def templateEngine = new SimpleTemplateEngine()
                def htmlContent = templateEngine.createTemplate(template.emt_body_html as String)
                    .make(binding).toString()
                
                // Subject with action indicator
                def subject = "🔵 UMIG Step Ready: ${stepInstance.sti_name} - Action Required"
                
                // Send to assigned team, CC impacted teams
                def emailSent = EmailService.sendEmailWithCCAndBCC(
                    assignedTeamEmails.join(','),
                    impactedTeamEmails ? impactedTeamEmails.join(',') : null,
                    null, // No BCC for step opened
                    subject,
                    htmlContent,
                    true
                )
                
                if (emailSent) {
                    println "Step opened notification sent successfully"
                    logEmailAudit(sql, userId, stepInstance.sti_id, 'STEP_OPENED', 
                        subject, assignedTeamEmails.size() + impactedTeamEmails.size())
                }
                
            } catch (Exception e) {
                println "Error sending step opened notification: ${e.message}"
                e.printStackTrace()
            }
        }
    }
    
    /**
     * Send automated notification when instruction is completed
     * Uses mobile template with progress tracking
     */
    static void sendAutomatedInstructionCompletedNotification(Map instruction, Map stepInstance, List<Map> teams,
                                                             Integer userId = null, String migrationCode = null,
                                                             String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // Get all teams
                def assignedTeamEmails = teams.findAll { it.role_type == 'ASSIGNED' }
                    .collect { it.tms_email as String }
                def impactedTeamEmails = teams.findAll { it.role_type == 'IMPACTED' }
                    .collect { it.tms_email as String }
                
                // Build URL
                def stepViewUrl = buildStepUrl(stepInstance.sti_id, migrationCode, iterationCode)
                
                // Get instruction progress
                def progress = getInstructionProgress(sql, stepInstance.sti_id)
                
                // Get mobile template
                def template = getMobileEmailTemplate(sql)
                if (!template) {
                    return
                }
                
                // Template binding with progress information
                def binding = [
                    stepName: stepInstance.sti_name ?: 'Step',
                    stepNumber: stepInstance.stm_number ?: '',
                    instructionName: instruction.ini_name ?: 'Instruction',
                    instructionNumber: instruction.ini_number ?: '',
                    instructionDescription: instruction.ini_description ?: '',
                    completedBy: getUsernameById(sql, userId) ?: 'Team Member',
                    completedAt: new Date().format('MMM d, yyyy h:mm a'),
                    progressPercentage: progress.percentage ?: 0,
                    completedCount: progress.completed ?: 0,
                    totalCount: progress.total ?: 0,
                    remainingCount: progress.remaining ?: 0,
                    stepUrl: stepViewUrl ?: '#',
                    hasUrl: stepViewUrl != null,
                    migrationName: stepInstance.migration_name ?: '',
                    iterationName: stepInstance.iteration_name ?: '',
                    notificationType: 'INSTRUCTION_COMPLETED',
                    year: new Date().format('yyyy')
                ] as Map<String, Object>
                
                // Process template
                def templateEngine = new SimpleTemplateEngine()
                def htmlContent = templateEngine.createTemplate(template.emt_body_html as String)
                    .make(binding).toString()
                
                // Subject with progress
                def subject = "UMIG Progress: ${instruction.ini_name} completed (${progress.percentage}% done)"
                if (progress.percentage == 100) {
                    subject = "✅ All instructions completed for ${stepInstance.sti_name}"
                }
                
                // Send notification
                def emailSent = EmailService.sendEmailWithCCAndBCC(
                    assignedTeamEmails.join(','),
                    impactedTeamEmails ? impactedTeamEmails.join(',') : null,
                    null,
                    subject,
                    htmlContent,
                    true
                )
                
                if (emailSent) {
                    println "Instruction completed notification sent"
                    logEmailAudit(sql, userId, stepInstance.sti_id, 'INSTRUCTION_COMPLETED',
                        subject, assignedTeamEmails.size() + impactedTeamEmails.size())
                }
                
            } catch (Exception e) {
                println "Error sending instruction completed notification: ${e.message}"
                e.printStackTrace()
            }
        }
    }
    
    // Helper methods
    
    private static Map getMobileEmailTemplate(Sql sql) {
        try {
            def template = sql.firstRow("""
                SELECT emt_id, emt_type, emt_name, emt_subject, emt_body_html, emt_body_text
                FROM email_templates_emt
                WHERE emt_type = 'ENHANCED_MOBILE_STEP'
                AND emt_is_active = true
                ORDER BY emt_version DESC
                LIMIT 1
            """)
            return template
        } catch (Exception e) {
            println "Error retrieving mobile template: ${e.message}"
            return null
        }
    }
    
    private static String getStatusColor(String status) {
        switch(status?.toUpperCase()) {
            case 'COMPLETED': return '#4CAF50'
            case 'IN_PROGRESS': return '#FF9800'
            case 'READY': return '#2196F3'
            case 'BLOCKED': return '#F44336'
            case 'NOT_STARTED': return '#9E9E9E'
            default: return '#757575'
        }
    }
    
    private static String getStatusChangeType(String oldStatus, String newStatus) {
        if (oldStatus == 'NOT_STARTED' && newStatus == 'READY') {
            return 'activation'
        } else if (oldStatus == 'READY' && newStatus == 'IN_PROGRESS') {
            return 'started'
        } else if (newStatus == 'COMPLETED') {
            return 'completion'
        } else if (newStatus == 'BLOCKED') {
            return 'blockage'
        } else {
            return 'update'
        }
    }
    
    private static String buildStepUrl(stepId, String migrationCode, String iterationCode) {
        if (!migrationCode || !iterationCode || !stepId) {
            return null
        }
        try {
            def stepUuid = stepId instanceof UUID ? stepId : UUID.fromString(stepId.toString())
            return UrlConstructionService.buildStepViewUrl(stepUuid, migrationCode, iterationCode)
        } catch (Exception e) {
            println "Error building step URL: ${e.message}"
            return null
        }
    }
    
    private static String getUsernameById(Sql sql, Integer userId) {
        if (!userId) return 'System'
        try {
            def user = sql.firstRow("SELECT usr_username FROM users_usr WHERE usr_id = ?", [userId])
            return user?.usr_username ?: 'Unknown User'
        } catch (Exception e) {
            return 'Unknown User'
        }
    }
    
    private static Map getInstructionProgress(Sql sql, stepId) {
        try {
            def stepUuid = stepId instanceof UUID ? stepId : UUID.fromString(stepId.toString())
            def result = sql.firstRow("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN ini_status = 'COMPLETED' THEN 1 END) as completed
                FROM instructions_instance_ini
                WHERE sti_id = ?
            """, [stepUuid])
            
            def total = result?.total ?: 0
            def completed = result?.completed ?: 0
            def remaining = total - completed
            def percentage = total > 0 ? Math.round((completed / total) * 100) : 0
            
            return [
                total: total,
                completed: completed,
                remaining: remaining,
                percentage: percentage
            ]
        } catch (Exception e) {
            println "Error getting instruction progress: ${e.message}"
            return [total: 0, completed: 0, remaining: 0, percentage: 0]
        }
    }
    
    private static void logEmailAudit(Sql sql, Integer userId, stepId, String notificationType, 
                                     String subject, Integer recipientCount) {
        try {
            def stepUuid = stepId instanceof UUID ? stepId : UUID.fromString(stepId.toString())
            def auditData = [
                table_name: 'email_notifications',
                entity_id: stepUuid,
                action: 'SENT',
                details: [
                    type: notificationType,
                    subject: subject,
                    recipients: recipientCount,
                    timestamp: new Date()
                ]
            ]
            
            AuditLogRepository.createAuditLog(sql, 'EMAIL_SENT', auditData, userId)
        } catch (Exception e) {
            println "Error logging email audit: ${e.message}"
        }
    }
}