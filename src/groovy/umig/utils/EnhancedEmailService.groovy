package umig.utils

import groovy.json.JsonBuilder
import groovy.json.JsonOutput
import groovy.text.GStringTemplateEngine
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
    private static final GStringTemplateEngine TEMPLATE_ENGINE = new GStringTemplateEngine()
    private static final AtomicLong cacheHits = new AtomicLong(0)
    private static final AtomicLong cacheMisses = new AtomicLong(0)
    private static final int MAX_CACHE_SIZE = 50

    // Content size limits for DoS prevention
    private static final int MAX_VARIABLE_SIZE_BYTES = 100 * 1024 // 100KB per variable
    private static final int MAX_TOTAL_EMAIL_SIZE_BYTES = 500 * 1024 // 500KB total email size
    
    /**
     * Send notification when a USER changes step-level status with dynamic URL construction
     * Recipients: Assigned TEAM + IMPACTED TEAMS + IT CUTOVER TEAM
     * @return Map with success status and email count
     */
    static Map sendStepStatusChangedNotificationWithUrl(Map stepInstance, List<Map> teams, Map cutoverTeam,
                                                        String oldStatus, String newStatus, Integer userId = null,
                                                        String migrationCode = null, String iterationCode = null) {
        println "🔧 [EnhancedEmailService] ================== START sendStepStatusChangedNotificationWithUrl =================="
        
        // PHASE 2: Enrich stepInstance with complete data from new repository method
        println "🔧 [EnhancedEmailService] ENRICHMENT: Using existing StepRepository.findByInstanceIdAsDTO"
        try {
            // Explicit type casting per ADR-031 for type safety
            UUID stepInstanceId = stepInstance.sti_id instanceof UUID ?
                stepInstance.sti_id as UUID :
                UUID.fromString(stepInstance.sti_id.toString())

            // Use EXISTING DTO method that already has comprehensive query with ALL data
            println "🔧 [EnhancedEmailService] 🔍 Calling StepRepository.findByInstanceIdAsDTO with UUID: ${stepInstanceId}"
            def stepRepository = new umig.repository.StepRepository()
            // Explicit type casting per ADR-031 for static type checking
            umig.dto.StepInstanceDTO enrichedDTO = stepRepository.findByInstanceIdAsDTO(stepInstanceId) as umig.dto.StepInstanceDTO
            
            if (enrichedDTO) {
                println "🔧 [EnhancedEmailService] ✅ StepInstanceDTO retrieved successfully"
                println "🔧 [EnhancedEmailService]   🔍 stepType: '${enrichedDTO.stepType}'"
                println "🔧 [EnhancedEmailService]   🔍 stepNumber: ${enrichedDTO.stepNumber}"
                
                // Use DTO's computed stepCode property (format: BUS-031)
                String stepCode = enrichedDTO.stepCode ?: ''
                println "🔧 [EnhancedEmailService]   🔍 DTO stepCode: '${stepCode}'"
                
                // Build enriched data map with DTO properties
                Map enrichedData = [
                    step_code: stepCode,
                    step_title: enrichedDTO.stepName,
                    step_description: enrichedDTO.stepDescription,
                    team_name: enrichedDTO.assignedTeamName,
                    migration_code: enrichedDTO.migrationCode,
                    iteration_code: enrichedDTO.iterationCode,
                    sequence_name: enrichedDTO.sequenceName,
                    phase_name: enrichedDTO.phaseName,
                    instruction_count: enrichedDTO.instructionCount ?: 0,
                    comment_count: enrichedDTO.comments?.size() ?: 0,
                    step_status: enrichedDTO.stepStatus,
                    // Duration field for Step Summary section (actualDuration with fallback to estimatedDuration)
                    sti_duration_minutes: enrichedDTO.actualDuration ?: enrichedDTO.estimatedDuration ?: 0,
                    // Environment and impacted teams for Step Summary section
                    environment_name: enrichedDTO.environmentName ?: '',
                    impacted_teams: enrichedDTO.impactedTeams ?: '',
                    // Predecessor information for Step Summary section
                    predecessor_code: enrichedDTO.predecessorCode ?: '',
                    predecessor_name: enrichedDTO.predecessorName ?: ''
                ]

                println "🔧 [EnhancedEmailService]   🔍 step_title: '${enrichedData.step_title}'"
                println "🔧 [EnhancedEmailService]   🔍 team_name: '${enrichedData.team_name}'"
                println "🔧 [EnhancedEmailService]   🔍 sti_duration_minutes: ${enrichedData.sti_duration_minutes}"
                println "🔧 [EnhancedEmailService]   🔍 environment_name: '${enrichedData.environment_name}'"
                println "🔧 [EnhancedEmailService]   🔍 impacted_teams: '${enrichedData.impacted_teams}'"
                println "🔧 [EnhancedEmailService]   🔍 predecessor_code: '${enrichedData.predecessor_code}'"
                println "🔧 [EnhancedEmailService]   🔍 instruction_count: ${enrichedData.instruction_count}"
                println "🔧 [EnhancedEmailService]   🔍 comment_count: ${enrichedData.comment_count}"
                
                // Merge enriched data into stepInstance (enriched data takes precedence)
                stepInstance = enrichedData + (stepInstance as Map)
                println "🔧 [EnhancedEmailService] ✅ Step instance enriched - step_code: '${stepInstance.step_code}'"
            } else {
                println "🔧 [EnhancedEmailService] ⚠️ WARNING: StepInstanceDTO not found for ID: ${stepInstanceId}"
            }
        } catch (Exception enrichmentError) {
            println "🔧 [EnhancedEmailService] ⚠️ WARNING: DTO enrichment failed: ${enrichmentError.message}"
            println "🔧 [EnhancedEmailService] Stack trace:"
            enrichmentError.printStackTrace()
        }
        
        println "🔧 [EnhancedEmailService] ================== START sendStepStatusChangedNotificationWithUrl =================="
        println "🔧 [EnhancedEmailService] Input parameters:"
        println "🔧 [EnhancedEmailService]   stepInstance: ${stepInstance ? 'present' : 'null'}"
        println "🔧 [EnhancedEmailService]   stepInstance.sti_name: ${stepInstance?.sti_name}"
        println "🔧 [EnhancedEmailService]   teams: ${teams?.size() ?: 0} teams"
        println "🔧 [EnhancedEmailService]   cutoverTeam: ${cutoverTeam ? cutoverTeam.tms_name : 'null'}"
        println "🔧 [EnhancedEmailService]   oldStatus: ${oldStatus}"
        println "🔧 [EnhancedEmailService]   newStatus: ${newStatus}"
        println "🔧 [EnhancedEmailService]   migrationCode: ${migrationCode}"
        println "🔧 [EnhancedEmailService]   iterationCode: ${iterationCode}"

        // CRITICAL FIX: Return the result from DatabaseUtil.withSql
        return DatabaseUtil.withSql { sql ->
            try {
                // Debug logging - now enhanced
                println "🔧 [EnhancedEmailService] STEP 1: Processing teams and recipients"
                println "🔧 [EnhancedEmailService]   Input teams: ${teams?.size() ?: 0}"
                println "🔧 [EnhancedEmailService]   Input cutover team: ${cutoverTeam ? 'present' : 'null'}"
                
                // Include cutover team in recipients
                println "🔧 [EnhancedEmailService] STEP 1A: Building complete team list"
                def allTeams = new ArrayList(teams)
                if (cutoverTeam) {
                    allTeams.add(cutoverTeam)
                    println "🔧 [EnhancedEmailService] Added cutover team: ${cutoverTeam.tms_name}"
                }
                println "🔧 [EnhancedEmailService] Total teams: ${allTeams.size()}"

                println "🔧 [EnhancedEmailService] STEP 1B: Extracting email addresses"
                def recipients = extractTeamEmails(allTeams)

                println "🔧 [EnhancedEmailService] Recipients extracted: ${recipients}"
                println "🔧 [EnhancedEmailService] Recipient count: ${recipients?.size() ?: 0}"
                
                if (!recipients) {
                    println "🔧 [EnhancedEmailService] ❌ ERROR: No recipients found for step status change ${stepInstance.sti_name}"
                    println "🔧 [EnhancedEmailService] ❌ Returning failure result"
                    return [success: false, emailsSent: 0, message: "No recipients found"]
                }
                
                // Get email template
                println "🔧 [EnhancedEmailService] STEP 2: Getting email template"
                def template = EmailTemplateRepository.findActiveByType(sql, 'STEP_STATUS_CHANGED')
                if (!template) {
                    println "🔧 [EnhancedEmailService] ⚠️ WARNING: No active template found for STEP_STATUS_CHANGED - using fallback"
                    // For now, bypass database template requirement for testing
                    def testSubject = "[UMIG] Step Status Changed: ${stepInstance.sti_name}" as String
                    def testBody = "<html><body><h2>Step Status Changed</h2><p>Step: ${stepInstance.sti_name}</p><p>Status: ${oldStatus} to ${newStatus}</p></body></html>" as String

                    // Send directly without template processing
                    println "🔧 [EnhancedEmailService] STEP 2A: Using fallback template - sending directly"
                    def fallbackRecipients = extractTeamEmails(allTeams)
                    if (fallbackRecipients) {
                        println "🔧 [EnhancedEmailService] Fallback recipients: ${fallbackRecipients}"
                        def sent = sendEmailViaMailHog(fallbackRecipients, testSubject, testBody)
                        println "🔧 [EnhancedEmailService] Direct email sent (bypassing templates): ${sent}"
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
                            return [success: true, emailsSent: fallbackRecipients.size(), message: "Email sent using fallback (no template)"]
                        } else {
                            return [success: false, emailsSent: 0, message: "Email sending failed (fallback mode)"]
                        }
                    }
                    return [success: false, emailsSent: 0, message: "No template found and no fallback recipients"]
                }

                println "🔧 [EnhancedEmailService] STEP 3: Template found - processing with URL construction"
                // Construct step view URL if migration and iteration codes are provided
                def stepViewUrl = null
                if (migrationCode && iterationCode && stepInstance.sti_id) {
                    println "🔧 [EnhancedEmailService] STEP 3A: Constructing step view URL"
                    println "🔧 [EnhancedEmailService]   migrationCode: ${migrationCode}"
                    println "🔧 [EnhancedEmailService]   iterationCode: ${iterationCode}"
                    println "🔧 [EnhancedEmailService]   stepInstance.sti_id: ${stepInstance.sti_id}"
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
                
                // Prepare template variables with URL and enriched data
                // PHASE 3 & 4: Expose all enriched fields for email template
                def variables = [
                    // Core step data with enriched fields
                    stepInstance: stepInstance,
                    step_code: stepInstance.step_code ?: stepInstance.stt_code ? "${stepInstance.stt_code}-${String.format('%03d', stepInstance.stm_number ?: 0)}" : '',
                    step_title: stepInstance.stm_name ?: stepInstance.sti_name ?: '',
                    step_description: stepInstance.stm_description ?: stepInstance.sti_description ?: '',
                    
                    // Status change information
                    oldStatus: oldStatus,
                    newStatus: newStatus,
                    statusColor: getStatusColor(newStatus),
                    changedAt: new Date().format('yyyy-MM-dd HH:mm:ss'),
                    changedBy: getUsernameById(sql, userId),
                    
                    // URL construction
                    stepViewUrl: stepViewUrl,
                    contextualStepUrl: stepViewUrl,
                    hasStepViewUrl: stepViewUrl != null,
                    migrationCode: migrationCode,
                    iterationCode: iterationCode,
                    
                    // Environment information (enriched)
                    environment_name: stepInstance.environment_name ?: '',
                    environment_type: stepInstance.environment_type ?: '',
                    environment_role_name: stepInstance.environment_role_name ?: '',
                    target_environment: stepInstance.environment_name ? 
                        "${stepInstance.environment_role_name ?: ''} (${stepInstance.environment_name})" : 
                        (stepInstance.environment_role_name ?: 'Not specified'),
                    
                    // Team information (enriched)
                    team_name: stepInstance.team_name ?: 'Unassigned',
                    team_email: stepInstance.team_email ?: '',
                    
                    // Step metadata (enriched)
                    step_scope: stepInstance.stm_scope ?: '',
                    step_location: stepInstance.stm_location ?: '',
                    step_duration: stepInstance.sti_duration_minutes ?: stepInstance.stm_duration_minutes ?: 0,
                    
                    // Predecessor information (enriched)
                    predecessor_code: stepInstance.predecessor_code ?: '',
                    predecessor_name: stepInstance.predecessor_name ?: '',
                    
                    // Instructions (enriched - now populated from database)
                    instructions: stepInstance.instructions ?: [],
                    instruction_count: (stepInstance.instructions as List)?.size() ?: 0,
                    has_instructions: ((stepInstance.instructions as List)?.size() ?: 0) > 0,
                    
                    // Comments (enriched - now populated from database)
                    comments: stepInstance.comments ?: [],
                    comment_count: (stepInstance.comments as List)?.size() ?: 0,
                    has_comments: ((stepInstance.comments as List)?.size() ?: 0) > 0,

                    // Impacted teams (enriched - now proper list from JSON aggregation)
                    impacted_teams: stepInstance.impacted_teams ?: [],
                    impacted_teams_count: (stepInstance.impacted_teams as List)?.size() ?: 0,
                    has_impacted_teams: ((stepInstance.impacted_teams as List)?.size() ?: 0) > 0,
                    impacted_teams_list: (stepInstance.impacted_teams as List ?: []).collect { (it as Map).tms_name }.join(', '),
                    
                    // Hierarchy context (already available, now explicit)
                    migration_name: stepInstance.migration_name ?: '',
                    iteration_name: stepInstance.iteration_name ?: '',
                    plan_name: stepInstance.plan_name ?: '',
                    sequence_name: stepInstance.sequence_name ?: '',
                    phase_name: stepInstance.phase_name ?: '',
                    
                    // Operation context

                    sourceView: 'stepview', // Add missing sourceView property
                    isDirectChange: true,    // Template compatibility - indicates direct user action
                    isBulkOperation: false,  // Template compatibility - single step operation
                    operationType: 'STEP_STATUS_CHANGED', // Fix: Add missing operationType variable
                    changeContext: "Status changed from ${oldStatus} to ${newStatus} by ${getUsernameById(sql, userId)}", // Add missing changeContext variable
                    // Template-specific variables (must be top-level for template access)
                    // US-056B Phase 2: Enhanced CommentDTO processing for template compatibility
                    recentComments: processCommentsForTemplate(stepInstance?.comments),
                    
                    // TD-015 Phase 3: Pre-processed variables for simplified templates (now using enriched data)
                    breadcrumb: buildBreadcrumb(migrationCode, iterationCode, stepInstance),
                    instructionsHtml: buildInstructionsHtml((stepInstance?.instructions ?: []) as List),
                    commentsHtml: buildCommentsHtml((stepInstance?.comments ?: []) as List),
                    durationAndEnvironment: buildDurationAndEnvironment(stepInstance),
                    stepViewLinkHtml: buildStepViewLinkHtml(stepViewUrl, stepViewUrl != null),
                    statusBadgeHtml: buildStatusBadge(newStatus),
                    teamRowHtml: buildOptionalField('Team', stepInstance?.team_name as String),
                    impactedTeamsRowHtml: buildOptionalField('Impacted Teams',
                        (stepInstance?.impacted_teams as List ?: []).collect { (it as Map).tms_name }.join(', ')),
                    predecessorRowHtml: buildOptionalField('Predecessor',
                        stepInstance?.predecessor_code ? "${stepInstance.predecessor_code} ${stepInstance.predecessor_name ?: ''}".trim() : null),
                    environmentRowHtml: buildOptionalField('Environment',
                        (stepInstance?.environment_name ?
                            "${stepInstance.environment_role_name ?: ''} (${stepInstance.environment_name})".toString() :
                            (stepInstance.environment_role_name ?: '')) as String)
                ]

                println "🔧 [EnhancedEmailService] STEP 4: Processing email template"
                println "🔧 [EnhancedEmailService] Template variables prepared: ${variables.keySet()}"
                println "🔧 [EnhancedEmailService] Has stepViewUrl: ${variables.hasStepViewUrl}"

                // Process template
                def processedSubject = processTemplate(template.emt_subject as String, variables)
                def processedBody = processTemplate(template.emt_body_html as String, variables)

                println "🔧 [EnhancedEmailService] Template processing completed"
                println "🔧 [EnhancedEmailService] Processed subject: ${processedSubject}"

                // Send email
                println "🔧 [EnhancedEmailService] STEP 5: Sending email"
                println "🔧 [EnhancedEmailService] Subject: ${processedSubject}"
                println "🔧 [EnhancedEmailService] Recipients: ${recipients}"
                println "🔧 [EnhancedEmailService] Body length: ${processedBody?.length()} characters"
                def emailSent = sendEmail(recipients, processedSubject, processedBody)

                println "🔧 [EnhancedEmailService] ✅ Email sent result: ${emailSent}"

                // Log the notification
                println "🔧 [EnhancedEmailService] STEP 6: Processing results and audit logging"
                if (emailSent) {
                    println "🔧 [EnhancedEmailService] ✅ Email sent successfully - logging audit trail"
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

                    // Status change already logged by StepRepository - no need to duplicate here

                    return [success: true, emailsSent: recipients.size(), message: "Step status change notification sent successfully"]
                } else {
                    return [success: false, emailsSent: 0, message: "Email sending failed"]
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

                return [success: false, emailsSent: 0, message: "Exception during email processing: ${e.message}"]
            }
        } // End of DatabaseUtil.withSql - result will be returned from this block
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
                    contextualStepUrl: stepViewUrl, // Fix: Add missing contextualStepUrl for template compatibility
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
                    impacted_teams: stepInstance?.impacted_teams ?: '',

                    // TD-015 Phase 3: Pre-processed variables for simplified templates
                    breadcrumb: buildBreadcrumb(migrationCode, iterationCode, stepInstance),
                    instructionsHtml: buildInstructionsHtml((stepInstance?.instructions ?: []) as List),
                    commentsHtml: buildCommentsHtml(processCommentsForTemplate(stepInstance?.recentComments)),
                    durationAndEnvironment: buildDurationAndEnvironment(stepInstance),
                    stepViewLinkHtml: buildStepViewLinkHtml(stepViewUrl, stepViewUrl != null),
                    statusBadgeHtml: buildStatusBadge('OPEN'), // Step status is OPEN
                    newStatus: 'OPEN', // Add status for template compatibility
                    teamRowHtml: buildOptionalField('Team', stepInstance?.team_name as String),
                    impactedTeamsRowHtml: buildOptionalField('Impacted Teams', stepInstance?.impacted_teams as String),
                    predecessorRowHtml: buildOptionalField('Predecessor',
                        stepInstance?.predecessor_code ? "${stepInstance.predecessor_code} ${stepInstance.predecessor_name ?: ''}".trim() : null),
                    environmentRowHtml: buildOptionalField('Environment', stepInstance?.environment_name as String)
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
     * @return Map with success status and email count
     */
    static Map sendInstructionCompletedNotificationWithUrl(Map instruction, Map stepInstance, List<Map> teams,
                                                           Integer userId = null, String migrationCode = null,
                                                           String iterationCode = null) {
        DatabaseUtil.withSql { sql ->
            try {
                def recipients = extractTeamEmails(teams)

                if (!recipients) {
                    println "EnhancedEmailService: No recipients found for instruction ${instruction.ini_name}"
                    return [success: false, emailsSent: 0, message: "No recipients found for instruction completion"]
                }

                // Get email template
                def template = EmailTemplateRepository.findActiveByType(sql, 'INSTRUCTION_COMPLETED')
                if (!template) {
                    println "EnhancedEmailService: No active template found for INSTRUCTION_COMPLETED"
                    return [success: false, emailsSent: 0, message: "No template found for INSTRUCTION_COMPLETED"]
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
                    contextualStepUrl: stepViewUrl, // Fix: Add missing contextualStepUrl for template compatibility
                    hasStepViewUrl: stepViewUrl != null,
                    migrationCode: migrationCode,
                    iterationCode: iterationCode,
                    sourceView: 'stepview', // Add missing sourceView property
                    isBulkOperation: false,  // Template compatibility - single step operation
                    operationType: 'INSTRUCTION_COMPLETED', // Fix: Add missing operationType variable
                    // Template-specific variables (must be top-level for template access)
                    // US-056B Phase 2: Enhanced CommentDTO processing for template compatibility
                    recentComments: processCommentsForTemplate(stepInstance?.recentComments),
                    impacted_teams: stepInstance?.impacted_teams ?: '',

                    // TD-015 Phase 3: Pre-processed variables for simplified templates
                    breadcrumb: buildBreadcrumb(migrationCode, iterationCode, stepInstance),
                    instructionsHtml: buildInstructionsHtml((stepInstance?.instructions ?: []) as List),
                    commentsHtml: buildCommentsHtml(processCommentsForTemplate(stepInstance?.recentComments)),
                    durationAndEnvironment: buildDurationAndEnvironment(stepInstance),
                    stepViewLinkHtml: buildStepViewLinkHtml(stepViewUrl, stepViewUrl != null),
                    statusBadgeHtml: buildStatusBadge(stepInstance?.sti_status as String), // Use step's current status
                    teamRowHtml: buildOptionalField('Team', stepInstance?.team_name as String),
                    impactedTeamsRowHtml: buildOptionalField('Impacted Teams', stepInstance?.impacted_teams as String),
                    predecessorRowHtml: buildOptionalField('Predecessor',
                        stepInstance?.predecessor_code ? "${stepInstance.predecessor_code} ${stepInstance.predecessor_name ?: ''}".trim() : null),
                    environmentRowHtml: buildOptionalField('Environment', stepInstance?.environment_name as String)
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

                    return [success: true, emailsSent: recipients.size(), message: "Instruction completion notification sent successfully"]
                } else {
                    return [success: false, emailsSent: 0, message: "Email sending failed for instruction completion"]
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

                return [success: false, emailsSent: 0, message: "Exception during instruction completion email processing: ${e.message}"]
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
            println "🚨🚨🚨 [CRITICAL DEBUG] EnhancedEmailService.sendEmail called:"
            println "🚨 [CRITICAL DEBUG]   - Raw recipients: ${recipients}"
            println "🚨 [CRITICAL DEBUG]   - Raw recipients size: ${recipients?.size()}"
            println "🚨 [CRITICAL DEBUG]   - Raw recipients class: ${recipients?.getClass()?.name}"

            // Remove any null or empty email addresses
            def validRecipients = recipients.findAll { it && it.trim() }
            println "🚨 [CRITICAL DEBUG]   - Valid recipients: ${validRecipients}"
            println "🚨 [CRITICAL DEBUG]   - Valid recipients size: ${validRecipients?.size()}"
            println "🚨 [CRITICAL DEBUG]   - Subject: ${subject}"
            println "🚨 [CRITICAL DEBUG]   - Body length: ${body?.length()} characters"

            if (!validRecipients) {
                println "🚨 [CRITICAL DEBUG] ❌❌❌ No valid recipients found, skipping email send"
                return false
            }

            println "🚨 [CRITICAL DEBUG]   - About to call sendEmailViaMailHog..."
            // For development environment, use MailHog directly
            def result = sendEmailViaMailHog(validRecipients, subject, body)
            println "🚨 [CRITICAL DEBUG]   - sendEmailViaMailHog returned: ${result}"
            println "🚨🚨🚨 [CRITICAL DEBUG] EnhancedEmailService.sendEmail RETURNING: ${result}"
            return result

        } catch (Exception e) {
            println "🚨 [CRITICAL DEBUG] ❌❌❌ ERROR in sendEmail: ${e.message}"
            println "🚨 [CRITICAL DEBUG] Exception class: ${e.getClass().name}"
            e.printStackTrace()
            return false
        }
    }

    /**
     * Send email via MailHog for development environment
     */
    private static boolean sendEmailViaMailHog(List<String> recipients, String subject, String body) {
        try {
            println "🚨 [CRITICAL DEBUG] EnhancedEmailService.sendEmailViaMailHog() - ENTRY POINT"
            println "🚨 [CRITICAL DEBUG] MailHog sending starting (development mode)"
            println "🚨 [CRITICAL DEBUG] Recipients to process: ${recipients}"
            println "🚨 [CRITICAL DEBUG] Recipients count: ${recipients?.size()}"
            println "🚨 [CRITICAL DEBUG] Subject: ${subject}"
            println "🚨 [CRITICAL DEBUG] Body preview: ${body?.take(200)}..."

            // MailHog SMTP configuration
            Properties props = new Properties()
            props.put("mail.smtp.host", "umig_mailhog")
            props.put("mail.smtp.port", "1025")
            props.put("mail.smtp.auth", "false")
            props.put("mail.smtp.starttls.enable", "false")
            props.put("mail.smtp.connectiontimeout", "5000")
            props.put("mail.smtp.timeout", "5000")

            println "🚨 [CRITICAL DEBUG] SMTP properties configured for umig_mailhog:1025"
            println "🚨 [CRITICAL DEBUG] SMTP host: umig_mailhog"
            println "🚨 [CRITICAL DEBUG] SMTP port: 1025"
            println "🚨 [CRITICAL DEBUG] SMTP auth: false"

            // Create session
            println "🚨 [CRITICAL DEBUG] About to create JavaMail session..."
            Session session = Session.getInstance(props)
            println "🚨 [CRITICAL DEBUG] ✅ JavaMail session created successfully"
            println "🚨 [CRITICAL DEBUG] Session properties: ${session.getProperties()}"

            // Send to each recipient
            boolean allSent = true
            println "🚨 [CRITICAL DEBUG] Starting to process ${recipients.size()} recipients"
            recipients.each { recipient ->
                try {
                    println "🚨 [CRITICAL DEBUG] === Processing recipient: ${recipient} ==="
                    println "🚨 [CRITICAL DEBUG] Creating MimeMessage..."
                    MimeMessage message = new MimeMessage(session)
                    println "🚨 [CRITICAL DEBUG] ✅ MimeMessage created"

                    println "🚨 [CRITICAL DEBUG] Setting FROM address: ${DEFAULT_FROM_ADDRESS}"
                    message.setFrom(new InternetAddress(DEFAULT_FROM_ADDRESS))
                    println "🚨 [CRITICAL DEBUG] ✅ FROM address set"

                    println "🚨 [CRITICAL DEBUG] Setting TO address: ${recipient}"
                    message.setRecipients(Message.RecipientType.TO, InternetAddress.parse(recipient))
                    println "🚨 [CRITICAL DEBUG] ✅ TO address set"

                    println "🚨 [CRITICAL DEBUG] Setting subject: ${subject}"
                    message.setSubject(subject, "UTF-8")
                    println "🚨 [CRITICAL DEBUG] ✅ Subject set"

                    println "🚨 [CRITICAL DEBUG] Setting content (${body?.length()} chars)"
                    message.setContent(body, "text/html; charset=utf-8")
                    println "🚨 [CRITICAL DEBUG] ✅ Content set"

                    println "🚨 [CRITICAL DEBUG] Setting sent date"
                    message.setSentDate(new Date())
                    println "🚨 [CRITICAL DEBUG] ✅ Sent date set"

                    println "🚨 [CRITICAL DEBUG] === ABOUT TO SEND MESSAGE VIA Transport.send() ==="
                    println "🚨 [CRITICAL DEBUG] Message details:"
                    println "🚨 [CRITICAL DEBUG]   - From: ${message.getFrom()}"
                    println "🚨 [CRITICAL DEBUG]   - To: ${message.getAllRecipients()}"
                    println "🚨 [CRITICAL DEBUG]   - Subject: ${message.getSubject()}"

                    Transport.send(message)
                    println "🚨 [CRITICAL DEBUG] ✅✅✅ Transport.send() COMPLETED SUCCESSFULLY for ${recipient}"
                } catch (Exception e) {
                    println "🚨 [CRITICAL DEBUG] ❌❌❌ FAILED to send email to ${recipient}"
                    println "🚨 [CRITICAL DEBUG] Exception type: ${e.getClass().name}"
                    println "🚨 [CRITICAL DEBUG] Exception message: ${e.message}"
                    println "🚨 [CRITICAL DEBUG] Exception cause: ${e.getCause()?.message ?: 'None'}"
                    println "🚨 [CRITICAL DEBUG] Full stack trace:"
                    e.printStackTrace()
                    allSent = false
                }
            }

            println "🚨 [CRITICAL DEBUG] === EMAIL PROCESSING COMPLETED ==="
            println "🚨 [CRITICAL DEBUG] All emails processed. Overall success: ${allSent}"
            println "🚨 [CRITICAL DEBUG] Returning result: ${allSent}"
            return allSent

        } catch (Exception e) {
            println "🚨 [CRITICAL DEBUG] ❌❌❌ FATAL ERROR in sendEmailViaMailHog: ${e.message}"
            println "🚨 [CRITICAL DEBUG] Exception type: ${e.getClass().name}"
            println "🚨 [CRITICAL DEBUG] Exception cause: ${e.getCause()?.message ?: 'None'}"
            println "🚨 [CRITICAL DEBUG] Full stack trace:"
            e.printStackTrace()
            return false
        }
    }
    
    /**
     * Process template with Groovy's SimpleTemplateEngine
     * Enhanced to handle URL construction variables
     * FIXED: Added missing validation and caching from EmailService
     */
    /**
     * Process email templates using simple ${} variable substitution
     * TD-015 Phase 3: Simplified to use GStringTemplateEngine only
     *
     * All GSP scriptlets (<% %>) have been removed from templates.
     * Conditionals and loops are now pre-processed in Groovy code.
     *
     * @param templateText HTML template with ${variable} placeholders
     * @param variables Map of variable names to values
     * @return Processed template with all variables substituted
     */
    private static String processTemplate(String templateText, Map variables) {
        try {
            // Use GStringTemplateEngine for simple ${variable} substitution
            // Note: All <% %> scriptlets must be removed from templates
            def engine = new groovy.text.GStringTemplateEngine()
            def template = engine.createTemplate(templateText)
            def result = template.make(variables).toString()

            println "✅ Template processed successfully (${result.length()} characters)"
            return result

        } catch (Exception e) {
            println "❌ Template processing error: ${e.message}"
            println "   Template variables available: ${variables?.keySet()}"
            e.printStackTrace()
            return templateText  // Fallback only on error
        }
    }

    // ========================================
    // TEMPLATE PRE-PROCESSING HELPER METHODS (TD-015 Phase 2)
    // ========================================

    /**
     * Helper methods for pre-processing email template content
     * These methods eliminate the need for GSP scriptlets in templates
     * by performing all conditionals and loops in Groovy code before rendering
     *
     * All methods are:
     * - Pure functions (no side effects)
     * - Stateless (no instance variables)
     * - Null-safe (handle missing data gracefully)
     * - Easily testable (deterministic outputs)
     *
     * @see TD-015-PHASE2-HELPER-METHODS.md
     * @since Sprint 8 (2025-09-30)
     */

    /**
     * Build hierarchical breadcrumb navigation string
     * Handles 6 nested conditionals from template lines 19-30
     *
     * @param migrationCode Migration identifier (e.g., "MIG-2025-Q1")
     * @param iterationCode Iteration identifier (e.g., "ITER-001")
     * @param stepInstance Map containing step hierarchy (plan_name, sequence_name, phase_name)
     * @return Formatted breadcrumb string with › separators
     */
    private static String buildBreadcrumb(String migrationCode, String iterationCode, Map stepInstance) {
        // Primary path: Use codes if available
        if (migrationCode && iterationCode) {
            def parts = [migrationCode, iterationCode]

            // Add optional hierarchy levels
            if (stepInstance?.plan_name) {
                parts.add(stepInstance.plan_name as String)
            }
            if (stepInstance?.sequence_name) {
                parts.add(stepInstance.sequence_name as String)
            }
            if (stepInstance?.phase_name) {
                parts.add(stepInstance.phase_name as String)
            }

            return parts.join(' › ')
        }

        // Fallback path: Use full names from stepInstance
        else {
            String migration = stepInstance?.migration_name ?: 'Migration'
            String iteration = stepInstance?.iteration_name ?: 'Iteration'
            return "${migration} › ${iteration}"
        }
    }

    /**
     * Build instructions table HTML from instructions list
     * Handles loop with conditional icons (template lines 145-158)
     *
     * @param instructions List of instruction maps (ini_name, ini_duration_minutes, team_name, control_code, completed)
     * @return HTML string with <tr> rows for each instruction
     */
    private static String buildInstructionsHtml(List instructions) {
        // Empty collection fallback
        if (!instructions || instructions.isEmpty()) {
            return '<tr><td colspan="5" style="text-align:center; color:#6c757d; padding:20px;">No instructions defined for this step.</td></tr>'
        }

        def html = new StringBuilder()
        instructions.eachWithIndex { instruction, index ->
            // Cast to Map for safe property access
            def instructionMap = instruction as Map

            // Status icon: ✓ if completed, otherwise show 1-based index number
            def statusIcon = instructionMap.completed ? '✓' : (index + 1).toString()

            // Fallback values for missing data
            def name = instructionMap.ini_name ?: instructionMap.description ?: "Instruction ${index + 1}"
            def duration = instructionMap.ini_duration_minutes ? "${instructionMap.ini_duration_minutes} min" : '-'
            def team = instructionMap.team_name ?: '-'
            def control = instructionMap.control_code ?: '-'

            html.append("""
        <tr>
            <td style="text-align:center; font-weight:bold; color:${instructionMap.completed ? '#28a745' : '#6c757d'};">${statusIcon}</td>
            <td>${name}</td>
            <td>${duration}</td>
            <td>${team}</td>
            <td>${control}</td>
        </tr>
    """)
        }

        return html.toString()
    }

    /**
     * Build recent comments HTML (max 3 items)
     * Handles loop with index-based margin (template lines 185-197)
     *
     * @param comments List of comment maps (author_name, created_at, comment_text)
     * @return HTML string with comment card divs (max 3)
     */
    private static String buildCommentsHtml(List comments) {
        // Empty collection fallback
        if (!comments || comments.isEmpty()) {
            return '<p style="color:#6c757d; text-align:center; padding:20px;">No comments yet. Be the first to add your insights!</p>'
        }

        def html = new StringBuilder()
        comments.take(3).eachWithIndex { comment, index ->
            // Cast to Map for safe property access
            def commentMap = comment as Map

            // First comment has no top margin, others have 12px
            def marginTop = index == 0 ? '0' : '12px'

            // Fallback values
            def author = commentMap.author_name ?: 'Anonymous'
            def date = commentMap.created_at ?: 'Recent'
            def text = commentMap.comment_text ?: '(No comment text)'

            html.append("""
        <div class="comment-card" style="margin: ${marginTop} 0; padding: 12px; background: #f8f9fa; border-left: 3px solid #0052cc;">
            <div class="comment-author" style="font-weight: bold; color: #0052cc; margin-bottom: 4px;">${author}</div>
            <div class="comment-date" style="font-size: 12px; color: #6c757d; margin-bottom: 8px;">${date}</div>
            <div class="comment-text" style="color: #212529;">${text}</div>
        </div>
    """)
        }

        return html.toString()
    }

    /**
     * Build duration and environment display string
     * Handles 3 conditionals with smart separator (template lines 67-76)
     *
     * @param stepInstance Map containing sti_duration_minutes and environment_name
     * @return Formatted string: "30 min | Production" or "30 min" or "Production" or ""
     */
    private static String buildDurationAndEnvironment(Map stepInstance) {
        def parts = []

        // Add duration if present
        if (stepInstance?.sti_duration_minutes) {
            parts.add("${stepInstance.sti_duration_minutes} min")
        }

        // Add environment if present
        if (stepInstance?.environment_name) {
            parts.add(stepInstance.environment_name as String)
        }

        // Join with " | " separator only if both exist
        return parts.join(' | ')
    }

    /**
     * Build StepView link HTML or fallback message
     * Handles conditional URL block (template lines 173-182)
     *
     * @param stepViewUrl Confluence StepView URL (or null if unavailable)
     * @param hasStepViewUrl Boolean flag indicating URL availability
     * @return HTML string with clickable link or informational message
     */
    private static String buildStepViewLinkHtml(String stepViewUrl, boolean hasStepViewUrl) {
        // Primary path: URL available
        if (hasStepViewUrl && stepViewUrl) {
            return """
        <div style="margin: 20px 0; text-align: center;">
            <a href="${stepViewUrl}" class="btn-primary" style="
                display: inline-block;
                padding: 12px 24px;
                background-color: #0052cc;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-weight: bold;
            ">
                🔗 View in Confluence
            </a>
            <p style="margin-top: 12px; color: #6c757d; font-size: 14px;">
                Click to view this step with live updates and collaboration features
            </p>
        </div>
    """
        }

        // Fallback path: URL unavailable
        else {
            return """
        <div style="margin: 20px 0; padding: 16px; background: #f8f9fa; border-radius: 4px; text-align: center;">
            <p style="margin: 0 0 8px 0; font-weight: bold; color: #495057;">📌 Access Information:</p>
            <p style="margin: 0; color: #6c757d;">
                Direct link is not available. Please access the UMIG system in Confluence
                to view the most current step details and collaborate with your team.
            </p>
        </div>
    """
        }
    }

    /**
     * Build optional table row HTML (reusable utility)
     * Used for team, impacted_teams, predecessor, environment, etc.
     *
     * @param label Row label (e.g., "Team", "Predecessor")
     * @param value Field value (or null if not present)
     * @return HTML <tr> string or empty string if value is null/empty
     */
    private static String buildOptionalField(String label, String value) {
        // Only generate row if value is present
        if (value && value.trim()) {
            return """
        <tr>
            <td style="font-weight: bold; color: #495057; width: 180px;">${label}</td>
            <td style="color: #212529;">${value}</td>
        </tr>
    """
        } else {
            return '' // Return empty string to hide row
        }
    }

    /**
     * Build status badge HTML with color based on status
     *
     * @param status Step status string (e.g., "OPEN", "COMPLETED", "BLOCKED")
     * @return HTML span with colored badge
     */
    private static String buildStatusBadge(String status) {
        // Determine badge color based on status
        String color
        String displayText = status ?: 'UNKNOWN'

        switch (status?.toUpperCase()) {
            case 'OPEN':
            case 'IN_PROGRESS':
                color = '#0052cc' // Blue
                break
            case 'COMPLETED':
            case 'DONE':
                color = '#28a745' // Green
                break
            case 'BLOCKED':
            case 'FAILED':
                color = '#dc3545' // Red
                break
            case 'PENDING':
            case 'WAITING':
                color = '#ffc107' // Yellow/Orange
                break
            default:
                color = '#6c757d' // Gray
                break
        }

        return """
    <span class="status-badge" style="
        display: inline-block;
        padding: 6px 12px;
        background-color: ${color};
        color: white;
        border-radius: 4px;
        font-weight: bold;
        font-size: 14px;
    ">
        ${displayText}
    </span>
"""
    }

    /**
     * Build documentation link HTML
     * Can be active link or disabled/placeholder state
     *
     * @param url Documentation URL (or null if unavailable)
     * @param linkText Link display text (e.g., "View Documentation")
     * @return HTML anchor tag or disabled text
     */
    private static String buildDocumentationLink(String url, String linkText) {
        def displayText = linkText ?: 'View Documentation'

        // Active link if URL present
        if (url && url.trim() && url != '#') {
            return """
        <a href="${url}" target="_blank" style="
            color: #0052cc;
            text-decoration: none;
            font-weight: bold;
        ">
            📖 ${displayText}
        </a>
    """
        }

        // Disabled state if URL not available
        else {
            return """
        <span style="color: #6c757d; font-style: italic;">
            📖 ${displayText} (Not Available)
        </span>
    """
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
        if (!templateText) {
            println "🚨🚨🚨 [TD-015 DEBUG] getCachedTemplate: templateText is null or empty!"
            return null
        }

        println "🚨🚨🚨 [TD-015 DEBUG] getCachedTemplate called, template length: ${templateText.length()}"

        // Use hash as cache key for stability
        String cacheKey = templateText.hashCode().toString()
        println "🚨🚨🚨 [TD-015 DEBUG] Cache key: ${cacheKey}"

        groovy.text.Template template = TEMPLATE_CACHE.get(cacheKey)
        if (template != null) {
            cacheHits.incrementAndGet()
            println "🚨🚨🚨 [TD-015 DEBUG] Template found in cache! (hits: ${cacheHits.get()})"
            return template
        }

        println "🚨🚨🚨 [TD-015 DEBUG] Template NOT in cache, compiling... (misses: ${cacheMisses.get()})"

        // Compile and cache new template
        try {
            cacheMisses.incrementAndGet()
            println "🚨🚨🚨 [TD-015 DEBUG] About to call TEMPLATE_ENGINE.createTemplate()..."
            println "🚨🚨🚨 [TD-015 DEBUG] Template preview (first 500 chars): ${templateText.take(500)}"

            template = TEMPLATE_ENGINE.createTemplate(templateText)

            println "✅ Template compiled successfully with GStringTemplateEngine (length: ${templateText.length()} chars)"

            // Limit cache size with simple eviction
            if (TEMPLATE_CACHE.size() >= MAX_CACHE_SIZE) {
                // Remove oldest entry (simple FIFO)
                String firstKey = TEMPLATE_CACHE.keySet().iterator().next()
                TEMPLATE_CACHE.remove(firstKey)
                println "🚨🚨🚨 [TD-015 DEBUG] Cache eviction: removed key ${firstKey}"
            }

            TEMPLATE_CACHE.put(cacheKey, template)
            println "🚨🚨🚨 [TD-015 DEBUG] Template cached successfully, cache size now: ${TEMPLATE_CACHE.size()}"
            return template
        } catch (Exception e) {
            // Log to audit log for visibility (println goes to catalina.out which is hard to access)
            try {
                DatabaseUtil.withSql { sql ->
                    // Log as a template compilation failure
                    // Using null for entityId since this is a template-level error, not entity-specific
                    // Using 'TEMPLATE_ENGINE' as entityType to distinguish from step/instruction errors
                    AuditLogRepository.logEmailFailed(
                        sql,
                        null as Integer,  // No user context available during template compilation
                        null as UUID,     // No specific entity ID - this is a template error
                        [] as List<String>,  // No recipients yet - compilation happens before sending
                        "Template Compilation Error" as String,
                        "Template engine: GStringTemplateEngine | Error: ${e.class.name}: ${e.message} | Template preview: ${templateText.take(200)}" as String,
                        'TEMPLATE_ENGINE' as String  // Custom entity type for template errors
                    )
                }
            } catch (Exception auditError) {
                // If audit logging fails, fall back to println
                println "Failed to log template compilation error to audit log: ${auditError.message}"
            }

            // Also print for catalina.out debugging
            println "❌ Template compilation FAILED with GStringTemplateEngine"
            println "Exception: ${e.class.name}: ${e.message}"
            e.printStackTrace()

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
                    contextualStepUrl: stepViewUrl ?: '', // Fix: Add missing contextualStepUrl for template compatibility
                    hasUrl: stepViewUrl ? true : false,
                    hasStepViewUrl: stepViewUrl ? true : false, // Fix: Add missing hasStepViewUrl for template compatibility
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