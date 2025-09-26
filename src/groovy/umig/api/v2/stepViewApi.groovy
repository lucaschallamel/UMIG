package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import umig.repository.StepRepository
import umig.repository.UserRepository
import umig.repository.AuditLogRepository
import umig.service.UserService
import umig.utils.DatabaseUtil
import umig.utils.EnhancedEmailService
import groovy.json.JsonSlurper

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID

@BaseScript CustomEndpointDelegate delegate

// NOTE: The "Failed type checking" warning at line 1 is an inherent ScriptRunner limitation.
// It occurs because Groovy's static type checker runs before the @BaseScript transformation
// is applied, so it cannot resolve CustomEndpointDelegate methods. This warning is harmless
// and should be ignored - the script functions correctly in production.

// Initialize repositories and services (following TeamsApi pattern)
final StepRepository stepRepository = new StepRepository()
final UserRepository userRepository = new UserRepository()
final AuditLogRepository auditLogRepository = new AuditLogRepository()
// EmailService is now used as static methods - no instance needed

/**
 * Step View API - Returns step instance data for standalone step view
 *
 * Endpoints:
 * - GET /stepViewApi/instance?stepCode=XXX-nnn - Returns active step instance data
 * - GET /stepViewApi/userContext?stepCode=XXX-nnn - Returns user context with permissions for RBAC
 * - POST /stepViewApi/email - Send step-related email notifications (US-049 Phase 1)
 */

/**
 * US-049 Phase 1: Core API endpoint for step email notifications
 * POST /stepViewApi/email
 *
 * Integrates with US-058 EmailService (enhanced methods) for step status change notifications.
 * Includes performance monitoring and comprehensive audit logging.
 */
stepViewApiEmail(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        // Performance checkpoint: Start timing
        def startTime = System.currentTimeMillis()

        // Parse request body
        def requestBody = new JsonSlurper().parseText(body)

        // Validate required parameters (ADR-031: explicit type casting)
        if (!((requestBody as Map).stepInstanceId as String)) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Missing required parameter: stepInstanceId",
                    expected: "UUID string"
                ]).toString())
                .build()
        }

        if (!((requestBody as Map).notificationType as String)) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Missing required parameter: notificationType",
                    expected: "One of: stepStatusChange, instructionCompletion, stepAssignment"
                ]).toString())
                .build()
        }

        // Parse and validate stepInstanceId
        UUID stepInstanceId
        try {
            stepInstanceId = UUID.fromString((requestBody as Map).stepInstanceId as String)
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Invalid stepInstanceId format",
                    provided: (requestBody as Map).stepInstanceId,
                    expected: "Valid UUID string"
                ]).toString())
                .build()
        }

        // Validate notification type (ADR-031: explicit type casting)
        def validNotificationTypes = ['stepStatusChange', 'instructionCompletion', 'stepAssignment', 'stepEscalation']
        def notificationType = (requestBody as Map).notificationType as String
        if (!validNotificationTypes.contains(notificationType)) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Invalid notificationType",
                    provided: notificationType,
                    expected: validNotificationTypes
                ]).toString())
                .build()
        }

        // Performance checkpoint 1: Step data retrieval (<200ms target)
        def dataRetrievalStartTime = System.currentTimeMillis()

        // Retrieve step data with email context using existing repository methods
        def stepData = stepRepository.findStepInstanceDetailsById(stepInstanceId)

        if (!stepData) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([
                    error: "Step instance not found",
                    stepInstanceId: stepInstanceId.toString()
                ]).toString())
                .build()
        }

        def dataRetrievalTime = System.currentTimeMillis() - dataRetrievalStartTime

        // Log performance warning if data retrieval exceeds target
        if (dataRetrievalTime > 200) {
            println "US-049 Performance Warning: Step data retrieval exceeded 200ms target: ${dataRetrievalTime}ms for step ${stepInstanceId}"
        }

        // Get current user context for audit logging and email context
        def currentUser = null
        def username = null

        try {
            def userContext = UserService.getCurrentUserContext()
            username = userContext?.confluenceUsername as String
        } catch (Exception e) {
            // Fallback: check query parameter for frontend-provided context
            username = queryParams.getFirst('username') as String
        }

        if (!username) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Unable to determine current user for email context",
                    debug: "Authentication context required for email notifications"
                ]).toString())
                .build()
        }

        // Get user details for email context
        currentUser = userRepository.findUserByUsername(username as String)

        if (!currentUser) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([
                    error: "User not found in database",
                    username: username
                ]).toString())
                .build()
        }

        // Performance checkpoint 2: Email composition and sending (<500ms target)
        def emailStartTime = System.currentTimeMillis()

        // Prepare email context data (ADR-031: explicit type casting)
        def emailContext = [
            stepInstanceId: stepInstanceId,
            stepData: stepData,
            notificationType: notificationType,
            user: currentUser,
            timestamp: new Date(),
            additionalData: (((requestBody as Map).additionalData as Map) ?: [:]) as Map
        ]

        // Send email notification using EnhancedEmailService (US-058 integration)
        def emailResult = [success: false, message: "Not processed"]
        try {
            switch (notificationType) {
                case 'stepStatusChange':
                    // Use existing sendStepStatusChangedNotificationWithUrl method (ADR-031: explicit type casting)
                    def oldStatus = (((requestBody as Map).oldStatus as String) ?: "unknown") as String
                    def newStatus = (((requestBody as Map).newStatus as String) ?: ((stepData as Map).status as String)) as String
                    def teams = (((stepData as Map).teams as List) ?: []) as List<Map>

                    // US-058 Enhancement: Support direct recipient email for testing/development
                    def recipientEmail = ((requestBody as Map).recipientEmail as String)
                    if (recipientEmail && teams.isEmpty()) {
                        // Create a synthetic team with the provided email for testing
                        teams = [[tms_email: recipientEmail, tms_name: "Direct Recipient"]]
                    }

                    def cutoverTeam = ((stepData as Map).cutoverTeam as Map)
                    // Extract migration and iteration names from stepSummary
                    def stepSummary = (stepData as Map).stepSummary as Map
                    def migrationCode = stepSummary?.MigrationName as String
                    def iterationCode = stepSummary?.IterationName as String

                    // Create a simplified step instance structure for EnhancedEmailService
                    def stepInstanceForEmail = [
                        sti_id: stepSummary?.sti_id,
                        sti_name: stepSummary?.Name,
                        // Add other fields that EnhancedEmailService might need
                    ]

                    EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
                        stepInstanceForEmail,
                        teams as List<Map>,
                        cutoverTeam,
                        oldStatus,
                        newStatus,
                        ((currentUser as Map)?.usr_id as Integer),
                        migrationCode,
                        iterationCode
                    )
                    emailResult = [success: true, message: "Step status change notification sent", notificationType: "stepStatusChange"]
                    break

                case 'instructionCompletion':
                    // Use existing sendInstructionCompletedNotificationWithUrl method (ADR-031: explicit type casting)
                    def instruction = (((requestBody as Map).instruction as Map) ?: [:]) as Map
                    def teams = (((stepData as Map).teams as List) ?: []) as List<Map>

                    // US-058 Enhancement: Support direct recipient email for testing/development
                    def recipientEmail = ((requestBody as Map).recipientEmail as String)
                    if (recipientEmail && teams.isEmpty()) {
                        teams = [[tms_email: recipientEmail, tms_name: "Direct Recipient"]]
                    }
                    def migrationCode = ((stepData as Map).migrationName as String)
                    def iterationCode = ((stepData as Map).iterationName as String)

                    EnhancedEmailService.sendInstructionCompletedNotificationWithUrl(
                        instruction,
                        stepData as Map,
                        teams as List<Map>,
                        ((currentUser as Map)?.usr_id as Integer),
                        migrationCode,
                        iterationCode
                    )
                    emailResult = [success: true, message: "Instruction completion notification sent", notificationType: "instructionCompletion"]
                    break

                case 'stepAssignment':
                    // Use sendStepOpenedNotificationWithUrl as it handles team assignments (ADR-031: explicit type casting)
                    def teams = (((stepData as Map).teams as List) ?: []) as List<Map>

                    // US-058 Enhancement: Support direct recipient email for testing/development
                    def recipientEmail = ((requestBody as Map).recipientEmail as String)
                    if (recipientEmail && teams.isEmpty()) {
                        teams = [[tms_email: recipientEmail, tms_name: "Direct Recipient"]]
                    }
                    def migrationCode = ((stepData as Map).migrationName as String)
                    def iterationCode = ((stepData as Map).iterationName as String)

                    EnhancedEmailService.sendStepOpenedNotificationWithUrl(
                        stepData as Map,
                        teams as List<Map>,
                        ((currentUser as Map)?.usr_id as Integer),
                        migrationCode,
                        iterationCode
                    )
                    emailResult = [success: true, message: "Step assignment notification sent", notificationType: "stepAssignment"]
                    break

                case 'stepEscalation':
                    // For escalation, use status change with escalation context (ADR-031: explicit type casting)
                    def oldStatus = ((stepData as Map).status as String)
                    def newStatus = "escalated"
                    def teams = (((stepData as Map).teams as List) ?: []) as List<Map>
                    def cutoverTeam = ((stepData as Map).cutoverTeam as Map)
                    // Extract migration and iteration names from stepSummary
                    def stepSummary = (stepData as Map).stepSummary as Map
                    def migrationCode = stepSummary?.MigrationName as String
                    def iterationCode = stepSummary?.IterationName as String

                    // Create a simplified step instance structure for EnhancedEmailService
                    def stepInstanceForEmail = [
                        sti_id: stepSummary?.sti_id,
                        sti_name: stepSummary?.Name,
                    ]

                    EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
                        stepInstanceForEmail,
                        teams as List<Map>,
                        cutoverTeam,
                        oldStatus,
                        newStatus,
                        ((currentUser as Map)?.usr_id as Integer),
                        migrationCode,
                        iterationCode
                    )
                    emailResult = [success: true, message: "Step escalation notification sent", notificationType: "stepEscalation"]
                    break

                default:
                    throw new IllegalArgumentException("Unsupported notification type: ${notificationType}")
            }
        } catch (Exception emailException) {
            println "US-049 Email Service Error: Failed to send ${notificationType} notification for step ${stepInstanceId}: ${emailException.message}"
            emailException.printStackTrace()

            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([
                    error: "Email notification failed",
                    notificationType: notificationType,
                    stepInstanceId: stepInstanceId.toString(),
                    details: emailException.message
                ]).toString())
                .build()
        }

        def emailProcessingTime = System.currentTimeMillis() - emailStartTime

        // Log performance warning if email processing exceeds target
        if (emailProcessingTime > 500) {
            println "US-049 Performance Warning: Email processing exceeded 500ms target: ${emailProcessingTime}ms for step ${stepInstanceId}"
        }

        // Audit logging for email notification using existing method
        try {
            DatabaseUtil.withSql { sql ->
                auditLogRepository.logEmailSent(
                    sql,
                    ((currentUser as Map)?.usr_id as Integer),
                    stepInstanceId,
                    [], // Recipients extracted by EmailService
                    "Step ${notificationType} notification",
                    null, // Template ID handled by EmailService
                    [
                        notificationType: notificationType,
                        source: "stepViewApi-email-us049-phase1",
                        emailResult: emailResult,
                        performanceMetrics: [
                            dataRetrievalTime: dataRetrievalTime,
                            emailProcessingTime: emailProcessingTime
                        ]
                    ],
                    'STEP_INSTANCE'
                )
            }
        } catch (Exception auditException) {
            println "US-049 Audit Warning: Failed to log email notification audit trail for step ${stepInstanceId}: ${auditException.message}"
            // Continue processing - audit failure should not block email success
        }

        def totalTime = System.currentTimeMillis() - startTime

        // Success response with performance metrics and email result
        def response = [
            success: true,
            stepInstanceId: stepInstanceId.toString(),
            notificationType: notificationType,
            emailResult: emailResult,
            performanceMetrics: [
                dataRetrievalTime: dataRetrievalTime,
                emailProcessingTime: emailProcessingTime,
                totalTime: totalTime,
                targets: [
                    dataRetrievalTarget: "200ms",
                    emailProcessingTarget: "500ms",
                    totalTarget: "800ms"
                ],
                meetsTargets: [
                    dataRetrieval: dataRetrievalTime <= 200,
                    emailProcessing: emailProcessingTime <= 500,
                    total: totalTime <= 800
                ]
            ],
            timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
            source: "stepViewApi-email-us049-phase1"
        ]

        // Log successful completion
        println "US-049 Success: Email notification sent successfully. Type: ${notificationType}, Step: ${stepInstanceId}, Total Time: ${totalTime}ms"

        return Response.ok(new JsonBuilder(response).toString()).build()

    } catch (Exception e) {
        println "US-049 Critical Error: Unexpected failure in stepViewApi/email endpoint: ${e.message}"
        e.printStackTrace()

        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Internal server error in email notification endpoint",
                details: e.message,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
                source: "stepViewApi-email-us049-phase1"
            ]).toString())
            .build()
    }
}

stepViewApi(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // GET /stepViewApi/userContext?stepCode=XXX-nnn - Returns user context with RBAC permissions
    // Also supports calls without stepCode for general RBAC checks (iteration-view)
    if (pathParts.size() == 1 && pathParts[0] == 'userContext') {
        final String stepCode = queryParams.getFirst("stepCode")
        
        // Allow userContext without stepCode for general RBAC checks (iteration-view)
        boolean hasStepCode = stepCode && stepCode.contains('-')
        
        // Variables for step context (only used if stepCode provided)
        String sttCode = null
        Integer stmNumber = null
        
        if (hasStepCode) {
            try {
                final List<String> parts = stepCode.toUpperCase().tokenize('-')
                sttCode = parts[0]
                final String stmNumberStr = parts[1]
                stmNumber = stmNumberStr as Integer
            } catch (Exception e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid 'stepCode' parameter. Expected format: XXX-nnn"]).toString())
                    .build()
            }
        }
        
        try {

            // Get current user from UserService (per ADR-042 authentication hierarchy)
            def currentUser = null
            def username = null

            try {
                def userContext = UserService.getCurrentUserContext()
                username = userContext?.confluenceUsername as String
            } catch (Exception e) {
                // Fallback: check query parameter for frontend-provided context
                username = queryParams.getFirst('username') as String
            }

            if (!username) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "Unable to determine current user for RBAC context",
                        debug: "Authentication context required"
                    ]).toString())
                    .build()
            }

            // Get user details with role information
            currentUser = userRepository.findUserByUsername(username as String)

            if (!currentUser) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([
                        error: "User not found in database",
                        username: username
                    ]).toString())
                    .build()
            }

            // Get role code from role ID (ADR-031: explicit type casting)
            def roleCode = 'USER' // Default
            if (currentUser['rls_id']) {
                def roleId = currentUser['rls_id'] as Integer
                switch(roleId) {
                    case 1: roleCode = 'ADMIN'; break
                    case 2: roleCode = 'USER'; break
                    case 3: roleCode = 'PILOT'; break
                    default: roleCode = 'USER'
                }
            }

            // Get step team context (only if stepCode was provided)
            def stepTeams = null
            if (hasStepCode) {
                stepTeams = DatabaseUtil.withSql { sql ->
                    return sql.firstRow('''
                        SELECT
                            stm.stm_id,
                            stm.tms_id_owner as assigned_team_id,
                            owner_team.tms_name as assigned_team_name
                        FROM steps_master_stm stm
                        LEFT JOIN teams_tms owner_team ON stm.tms_id_owner = owner_team.tms_id
                        WHERE stm.stt_code = :sttCode AND stm.stm_number = :stmNumber
                        LIMIT 1
                    ''', [sttCode: sttCode, stmNumber: stmNumber])
                }

                if (!stepTeams) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([
                        error: "Step not found for code: ${stepCode}"
                    ]).toString())
                    .build()
                }
            }

            // Get user team memberships
            def userTeamMemberships = DatabaseUtil.withSql { sql ->
                return sql.rows('''
                    SELECT
                        tm.tms_id,
                        t.tms_name
                    FROM teams_tms_x_users_usr tm
                    JOIN teams_tms t ON tm.tms_id = t.tms_id
                    WHERE tm.usr_id = :usr_id
                ''', [usr_id: currentUser['usr_id'] as Integer])
            }

            // Calculate permissions based on role and team membership
            def permissions = [:]

            // Base permissions for all authenticated users
            permissions.view_step_details = true
            permissions.add_comments = true
            permissions.update_step_status = false
            permissions.complete_instructions = false
            permissions.edit_comments = false
            permissions.bulk_operations = false
            permissions.email_step_details = false
            permissions.advanced_controls = false
            permissions.extended_shortcuts = false
            permissions.debug_panel = false
            permissions.force_refresh_cache = false
            permissions.security_logging = false

            // Role-based permissions
            if (roleCode == "ADMIN") {
                permissions.keySet().each { key -> permissions[key] = true }
            } else if (roleCode == "PILOT") {
                permissions.update_step_status = true
                permissions.complete_instructions = true
                permissions.edit_comments = true
                permissions.bulk_operations = true
                permissions.email_step_details = true
                permissions.advanced_controls = true
                permissions.extended_shortcuts = true
                permissions.force_refresh_cache = true
            }

            // Team-based permissions (only if step context available)
            if (stepTeams) {
                def userTeamIds = userTeamMemberships.collect { it.tms_id }
                def assignedTeamId = stepTeams.assigned_team_id

                if (assignedTeamId && userTeamIds.contains(assignedTeamId)) {
                    // User is member of assigned team
                    permissions.update_step_status = true
                    permissions.complete_instructions = true
                    permissions.edit_comments = true
                }
            }

            // TODO: Add impacted team logic when requirements are clarified

            def response = [
                userId: currentUser['usr_id'] as Integer,
                username: currentUser['usr_code'] as String,
                firstName: currentUser['usr_first_name'] as String,
                lastName: currentUser['usr_last_name'] as String,
                role: roleCode,
                isAdmin: (currentUser['usr_is_admin'] as Boolean) ?: (roleCode == 'ADMIN'),
                teamMemberships: userTeamMemberships.collect { [
                    teamId: it.tms_id,
                    teamName: it.tms_name
                ] },
                permissions: permissions,
                source: "stepview_user_context",
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]
            
            // Only include stepContext if step information was provided
            if (stepTeams) {
                response.stepContext = [
                    stepId: stepTeams.stm_id,
                    assignedTeamId: stepTeams.assigned_team_id,
                    assignedTeamName: stepTeams.assigned_team_name
                ]
            }
            
            return Response.ok(new JsonBuilder(response).toString()).build()

        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([
                    error: "Failed to load user context for RBAC",
                    details: e.message
                ]).toString())
                .build()
        }
    }

    // GET /stepViewApi/instance?migrationName=xxx&iterationName=xxx&stepCode=XXX-nnn
    if (pathParts.size() == 1 && pathParts[0] == 'instance') {
        final String migrationName = queryParams.getFirst("migrationName")
        final String iterationName = queryParams.getFirst("iterationName")
        final String stepCode = queryParams.getFirst("stepCode")
        
        // Validate required parameters
        if (!migrationName || !iterationName || !stepCode) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Missing required parameters. Expected: migrationName, iterationName, stepCode"]).toString())
                .build()
        }
        
        if (!stepCode.contains('-')) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid 'stepCode' parameter. Expected format: XXX-nnn"]).toString())
                .build()
        }
        
        try {
            final List<String> parts = stepCode.toUpperCase().tokenize('-')
            final String sttCode = parts[0]
            final String stmNumberStr = parts[1]
            final Integer stmNumber = stmNumberStr as Integer
            
            // Find the active step instance for this step code
            def stepInstance = DatabaseUtil.withSql { sql ->
                sql.firstRow('''
                    SELECT 
                        sti.sti_id,
                        sti.sti_name,
                        sti.sti_status,
                        sti.sti_duration_minutes,
                        stm.stm_id,
                        stm.stt_code,
                        stm.stm_number,
                        stm.stm_name as master_name,
                        stm.stm_description,
                        stm.stm_duration_minutes as master_duration,
                        stm.tms_id_owner,
                        tms.tms_name as owner_team_name,
                        mig.mig_name as migration_name,
                        ite.ite_name as iteration_name,
                        plm.plm_name as plan_name,
                        sqm.sqm_name as sequence_name,
                        phm.phm_name as phase_name,
                        -- Predecessor info
                        pred_stm.stt_code as predecessor_stt_code,
                        pred_stm.stm_number as predecessor_stm_number,
                        pred_stm.stm_name as predecessor_name,
                        -- Environment info
                        enr.enr_name as environment_role_name,
                        env.env_name as environment_name
                    FROM steps_master_stm stm
                    JOIN steps_instance_sti sti ON stm.stm_id = sti.stm_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                    LEFT JOIN steps_master_stm pred_stm ON stm.stm_id_predecessor = pred_stm.stm_id
                    LEFT JOIN environment_roles_enr enr ON stm.enr_id = enr.enr_id
                    -- Join to get actual environment name for this iteration and role
                    LEFT JOIN environments_env_x_iterations_ite eei ON eei.ite_id = ite.ite_id AND eei.enr_id = stm.enr_id
                    LEFT JOIN environments_env env ON eei.env_id = env.env_id
                    WHERE stm.stt_code = :sttCode 
                    AND stm.stm_number = :stmNumber
                    AND UPPER(mig.mig_name) = UPPER(:migrationName)
                    AND UPPER(ite.ite_name) = UPPER(:iterationName)
                    ORDER BY ite.created_at DESC
                    LIMIT 1
                ''', [sttCode: sttCode, stmNumber: stmNumber, migrationName: migrationName, iterationName: iterationName])
            }
            
            if (!stepInstance) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "No step instance found for step code: ${stepCode} in migration: ${migrationName}, iteration: ${iterationName}"]).toString())
                    .build()
            }
            
            // Use the same method as iteration view to get complete step details
            def stepDetails = stepRepository.findStepInstanceDetailsById(UUID.fromString(stepInstance['sti_id'] as String))
            
            if (!stepDetails) {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: "Failed to load step details"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(stepDetails).toString()).build()
            
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Could not load step view: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Default response for invalid paths
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Invalid endpoint"]).toString())
        .build()
}

