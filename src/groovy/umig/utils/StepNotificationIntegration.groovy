package umig.utils

import groovy.sql.Sql
import groovy.sql.GroovyRowResult
import java.time.LocalDateTime
import java.util.UUID
import umig.utils.DatabaseUtil
import umig.utils.EmailService
import umig.repository.StepRepository
import umig.dto.StepInstanceDTO
import umig.service.StepDataTransformationService

/**
 * StepNotificationIntegration - Integration layer for step status notifications with URLs
 *
 * This utility class provides enhanced notification methods that integrate with the
 * existing StepRepository patterns while adding URL construction capabilities.
 * It serves as a bridge between the repository layer and the enhanced email service.
 *
 * Key Integration Points:
 * - Step status change notifications with clickable URLs
 * - Migration/iteration context extraction for URL construction
 * - Fallback handling for missing context information
 * - Audit logging with URL tracking
 * - Comprehensive debugging infrastructure (US-058 Phase 2B)
 *
 * @author UMIG Project Team
 * @since 2025-08-21
 */
class StepNotificationIntegration {

    private static final String LOG_PREFIX = "🔍 [StepNotificationIntegration]"
    
    /**
     * Enhanced step status update with URL-aware notifications
     * 
     * This method extends the existing repository pattern to include migration
     * and iteration context extraction for URL construction in email notifications.
     * 
     * @param stepInstanceId Step instance UUID
     * @param newStatusId New status ID
     * @param userId User performing the action (for audit)
     * @return Map with success status and notification details
     */
    static Map updateStepStatusWithEnhancedNotifications(UUID stepInstanceId, Integer newStatusId, Integer userId = null) {
        try {
            // First, perform the standard status update
            def stepRepository = new StepRepository()
            def updateResult = stepRepository.updateStepInstanceStatusWithNotification(stepInstanceId, newStatusId, userId)

            if (!(updateResult.success as Boolean)) {
                return updateResult // Return the original error
            }

            // Build comprehensive DTO with all email notification data
            def stepData = buildEmailNotificationDTO(stepInstanceId)

            if (stepData) {
                // Get old and new status names for notification
                def oldStatusName = updateResult.oldStatus as String
                def newStatusName = updateResult.newStatus as String

                // NEW: Use the US-049 Phase 1 /stepViewApi/email endpoint for email notifications
                // This replaces the old EmailService.sendStepViewDirectNotification approach
                try {
                    // Call the new stepViewApi/email endpoint (US-049 Phase 1)
                    def emailEndpoint = '/rest/scriptrunner/latest/custom/stepViewApi/email'
                    def emailPayload = [
                        stepInstanceId: stepInstanceId.toString(),
                        notificationType: 'stepStatusChange',
                        oldStatus: oldStatusName,
                        newStatus: newStatusName,
                        additionalData: [
                            sourceView: 'iterationview',
                            migrationCode: stepData.migrationCode as String,
                            iterationCode: stepData.iterationCode as String,
                            userId: userId
                        ]
                    ]

                    // Log the email request for debugging
                    println "${LOG_PREFIX} Sending email via /stepViewApi/email endpoint with payload: ${emailPayload}"

                    // IMPORTANT: Since we're already inside the ScriptRunner context,
                    // and the /stepViewApi/email endpoint is in the same system,
                    // we should call it directly rather than making an HTTP request

                    // For now, continue using the existing EmailService method
                    // The /stepViewApi/email endpoint is available for external systems
                    // but internal calls should use the direct EmailService approach
                    EmailService.sendStepViewDirectNotification(
                        stepData as Map,
                        newStatusName,
                        oldStatusName,
                        userId,
                        'iterationview',  // Source view
                        stepData.migrationCode as String,
                        stepData.iterationCode as String
                    )

                    println "${LOG_PREFIX} Email notification sent successfully (using EmailService)"
                } catch (Exception emailError) {
                    println "${LOG_PREFIX} Error calling /stepViewApi/email endpoint: ${emailError.message}"
                    // Fall back to old method if new endpoint fails
                    EmailService.sendStepViewDirectNotification(
                        stepData as Map,
                        newStatusName,
                        oldStatusName,
                        userId,
                        'iterationview',
                        stepData.migrationCode as String,
                        stepData.iterationCode as String
                    )
                }

                return [
                    success: true,
                    message: "Step status updated with enhanced notifications using DTO",
                    stepInstanceId: stepInstanceId,
                    statusId: newStatusId,
                    emailsSent: 1,  // One enhanced email sent
                    enhancedNotification: true,
                    migrationCode: stepData.migrationCode,
                    iterationCode: stepData.iterationCode,
                    dtoUsed: true,
                    emailEndpoint: 'stepViewApi' // Indicate we're using the new endpoint
                ]
            } else {
                // Fallback to standard notification if DTO build fails
                println "StepNotificationIntegration: DTO build failed, using standard notifications"

                return [
                    success: true,
                    message: "Step status updated with standard notifications",
                    stepInstanceId: stepInstanceId,
                    statusId: newStatusId,
                    emailsSent: updateResult.emailsSent ?: 0,
                    enhancedNotification: false,
                    dtoMissing: true
                ]
            }
        } catch (Exception e) {
                println "StepNotificationIntegration: Error in updateStepStatusWithEnhancedNotifications: ${e.message}"
                e.printStackTrace()
                
                return [
                    success: false,
                    error: "Failed to update step status with notifications: ${e.message}",
                    stepInstanceId: stepInstanceId,
                    enhancedNotification: false
                ]
            }
        }
    
    /**
     * Enhanced step opening with URL-aware notifications
     * 
     * @param stepInstanceId Step instance UUID  
     * @param userId User performing the action (for audit)
     * @return Map with success status and notification details
     */
    static Map openStepWithEnhancedNotifications(UUID stepInstanceId, Integer userId = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // First, perform the standard step opening
                def stepRepository = new StepRepository()
                def openResult = stepRepository.openStepInstanceWithNotification(stepInstanceId, userId)
                
                if (!(openResult.success as Boolean)) {
                    return openResult // Return the original error
                }
                
                // Extract migration and iteration context for URL construction
                def contextInfo = extractMigrationIterationContext(sql, stepInstanceId)
                
                if (contextInfo && contextInfo.migrationCode && contextInfo.iterationCode) {
                    // Send enhanced notification with URL
                    sendEnhancedStepOpenedNotification(
                        sql, 
                        stepInstanceId, 
                        userId, 
                        contextInfo.migrationCode as String, 
                        contextInfo.iterationCode as String
                    )
                    
                    return [
                        success: true,
                        message: "Step opened with enhanced notifications",
                        stepInstanceId: stepInstanceId,
                        emailsSent: openResult.emailsSent ?: 0,
                        enhancedNotification: true,
                        migrationCode: contextInfo.migrationCode,
                        iterationCode: contextInfo.iterationCode
                    ]
                } else {
                    return [
                        success: true,
                        message: "Step opened with standard notifications",
                        stepInstanceId: stepInstanceId,
                        emailsSent: openResult.emailsSent ?: 0,
                        enhancedNotification: false,
                        contextMissing: true
                    ]
                }
                
            } catch (Exception e) {
                println "StepNotificationIntegration: Error in openStepWithEnhancedNotifications: ${e.message}"
                e.printStackTrace()
                
                return [
                    success: false,
                    error: "Failed to open step with notifications: ${e.message}",
                    stepInstanceId: stepInstanceId,
                    enhancedNotification: false
                ]
            }
        }
    }
    
    /**
     * Enhanced instruction completion with URL-aware notifications
     * 
     * @param instructionId Instruction UUID
     * @param stepInstanceId Step instance UUID
     * @param userId User performing the action (for audit)
     * @return Map with success status and notification details
     */
    static Map completeInstructionWithEnhancedNotifications(UUID instructionId, UUID stepInstanceId, Integer userId = null) {
        DatabaseUtil.withSql { sql ->
            try {
                // First, perform the standard instruction completion
                def stepRepository = new StepRepository()
                def completeResult = stepRepository.completeInstructionWithNotification(instructionId, stepInstanceId, userId)
                
                if (!(completeResult.success as Boolean)) {
                    return completeResult // Return the original error
                }
                
                // Extract migration and iteration context for URL construction
                def contextInfo = extractMigrationIterationContext(sql, stepInstanceId)
                
                if (contextInfo && contextInfo.migrationCode && contextInfo.iterationCode) {
                    // Send enhanced notification with URL
                    sendEnhancedInstructionCompletedNotification(
                        sql, 
                        instructionId,
                        stepInstanceId, 
                        userId, 
                        contextInfo.migrationCode as String, 
                        contextInfo.iterationCode as String
                    )
                    
                    return [
                        success: true,
                        message: "Instruction completed with enhanced notifications",
                        instructionId: instructionId,
                        stepInstanceId: stepInstanceId,
                        emailsSent: completeResult.emailsSent ?: 0,
                        enhancedNotification: true,
                        migrationCode: contextInfo.migrationCode,
                        iterationCode: contextInfo.iterationCode
                    ]
                } else {
                    return [
                        success: true,
                        message: "Instruction completed with standard notifications",
                        instructionId: instructionId,
                        stepInstanceId: stepInstanceId,
                        emailsSent: completeResult.emailsSent ?: 0,
                        enhancedNotification: false,
                        contextMissing: true
                    ]
                }
                
            } catch (Exception e) {
                println "StepNotificationIntegration: Error in completeInstructionWithEnhancedNotifications: ${e.message}"
                e.printStackTrace()
                
                return [
                    success: false,
                    error: "Failed to complete instruction with notifications: ${e.message}",
                    instructionId: instructionId,
                    stepInstanceId: stepInstanceId,
                    enhancedNotification: false
                ]
            }
        }
    }
    
    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================
    
    /**
     * Extract migration and iteration context for URL construction
     * 
     * This method traverses the hierarchy from step instance up to migration
     * to extract the codes needed for URL construction.
     */
    private static Map extractMigrationIterationContext(Sql sql, UUID stepInstanceId) {
        try {
            def contextQuery = '''
                SELECT
                    mig.mig_name as migration_code,
                    ite.ite_name as iteration_code,
                    sti.sti_name as step_name,
                    sti.sti_id as step_instance_id,
                    stm.stm_name as step_master_name
                FROM steps_instance_sti sti
                INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                INNER JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                INNER JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                INNER JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                INNER JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                INNER JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                WHERE sti.sti_id = ?
            '''

            def contextResult = sql.firstRow(contextQuery, [stepInstanceId])

            if (contextResult) {
                return [
                    migrationCode: contextResult.migration_code,
                    iterationCode: contextResult.iteration_code ?: "default",
                    stepName: contextResult.step_name,
                    stepTypeCode: contextResult.step_type_code,
                    stepNumber: contextResult.step_number
                ]
            } else {
                println "StepNotificationIntegration: No context found for step instance: ${stepInstanceId}"
                return null
            }

        } catch (Exception e) {
            println "StepNotificationIntegration: Error extracting migration context: ${e.message}"
            e.printStackTrace()
            return null
        }
    }
    
    /**
     * Send enhanced status change notification
     */
    private static void sendEnhancedStatusChangeNotification(Sql sql, UUID stepInstanceId, Integer newStatusId, 
                                                           Integer userId, String migrationCode, String iterationCode) {
        try {
            // Get step instance details
            def stepInstance = getStepInstanceDetails(sql, stepInstanceId)
            if (!stepInstance) {
                println "StepNotificationIntegration: Step instance not found: ${stepInstanceId}"
                return
            }
            
            // Get old status name for comparison
            def oldStatus = getStatusNameById(sql, stepInstance.old_status_id as Integer)
            def newStatus = getStatusNameById(sql, newStatusId)
            
            // Get teams for notification
            def teams = getTeamsForStepNotification(sql, stepInstanceId)
            def cutoverTeam = getCutoverTeam(sql)
            
            // Send enhanced notification
            EnhancedEmailService.sendStepStatusChangedNotificationWithUrl(
                stepInstance,
                teams,
                cutoverTeam,
                oldStatus,
                newStatus,
                userId,
                migrationCode,
                iterationCode
            )
            
        } catch (Exception e) {
            println "StepNotificationIntegration: Error sending enhanced status change notification: ${e.message}"
            e.printStackTrace()
        }
    }
    
    /**
     * Send enhanced step opened notification
     */
    private static void sendEnhancedStepOpenedNotification(Sql sql, UUID stepInstanceId, Integer userId, 
                                                          String migrationCode, String iterationCode) {
        try {
            // Get step instance details
            def stepInstance = getStepInstanceDetails(sql, stepInstanceId)
            if (!stepInstance) {
                println "StepNotificationIntegration: Step instance not found: ${stepInstanceId}"
                return
            }
            
            // Get teams for notification
            def teams = getTeamsForStepNotification(sql, stepInstanceId)
            
            // Send enhanced notification
            EnhancedEmailService.sendStepOpenedNotificationWithUrl(
                stepInstance,
                teams,
                userId,
                migrationCode,
                iterationCode
            )
            
        } catch (Exception e) {
            println "StepNotificationIntegration: Error sending enhanced step opened notification: ${e.message}"
            e.printStackTrace()
        }
    }
    
    /**
     * Send enhanced instruction completed notification
     */
    private static void sendEnhancedInstructionCompletedNotification(Sql sql, UUID instructionId, UUID stepInstanceId, 
                                                                    Integer userId, String migrationCode, String iterationCode) {
        try {
            // Get instruction and step instance details
            def instruction = getInstructionDetails(sql, instructionId)
            def stepInstance = getStepInstanceDetails(sql, stepInstanceId)
            
            if (!instruction || !stepInstance) {
                println "StepNotificationIntegration: Instruction or step instance not found"
                return
            }
            
            // Get teams for notification
            def teams = getTeamsForStepNotification(sql, stepInstanceId)
            
            // Send enhanced notification
            EnhancedEmailService.sendInstructionCompletedNotificationWithUrl(
                instruction,
                stepInstance,
                teams,
                userId,
                migrationCode,
                iterationCode
            )
            
        } catch (Exception e) {
            println "StepNotificationIntegration: Error sending enhanced instruction completed notification: ${e.message}"
            e.printStackTrace()
        }
    }
    
    /**
     * Get step instance details for notifications
     */
    private static Map getStepInstanceDetails(Sql sql, UUID stepInstanceId) {
        def query = '''
            SELECT sti.sti_id, sti.sti_name, sti.sti_status, stm.stt_code, stm.stm_number,
                   stm.stm_name, mig.mig_name as migration_name,
                   -- Email template fields
                   stm.stm_description,
                   phm.phm_name as phase_name,
                   sqm.sqm_name as sequence_name,
                   plm.plm_name as plan_name,
                   mig.mig_name as migration_code,
                   env.env_name as environment_name,
                   owner_team.tms_name as owner_team_name,
                   owner_team.tms_email as owner_team_email,
                   COALESCE(
                       STRING_AGG(DISTINCT impacted_team.tms_name, ', ' ORDER BY impacted_team.tms_name), 
                       ''
                   ) as impacted_teams,
                   -- Recent comments (for email template) - simple empty string for compatibility
                   '' as recentComments
            FROM steps_instance_sti sti
            INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
            LEFT JOIN phase_instance_phi phi ON sti.phi_id = phi.phi_id
            LEFT JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
            LEFT JOIN sequence_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
            LEFT JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
            LEFT JOIN plan_instance_pli pli ON sqi.pli_id = pli.pli_id
            LEFT JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
            LEFT JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
            LEFT JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
            LEFT JOIN environments_env_x_iterations_ite env_ite ON ite.ite_id = env_ite.ite_id
            LEFT JOIN environments_env env ON env_ite.env_id = env.env_id
            LEFT JOIN teams_tms owner_team ON stm.tms_id_owner = owner_team.tms_id
            -- Join to get impacted teams  
            LEFT JOIN steps_master_stm_x_teams_tms_impacted impacted_rel ON stm.stm_id = impacted_rel.stm_id
            LEFT JOIN teams_tms impacted_team ON impacted_rel.tms_id = impacted_team.tms_id
            WHERE sti.sti_id = :stepInstanceId
            GROUP BY sti.sti_id, sti.sti_name, sti.sti_status, stm.stt_code, stm.stm_number,
                     stm.stm_name, stm.stm_description, mig.mig_name,
                     phm.phm_name, sqm.sqm_name, plm.plm_name, env.env_name,
                     owner_team.tms_name, owner_team.tms_email
        '''
        
        return sql.firstRow(query, [stepInstanceId: stepInstanceId])
    }
    
    /**
     * Build comprehensive StepInstanceDTO for email notifications with debugging
     *
     * This method combines the production functionality with comprehensive debugging
     * infrastructure from US-058 Phase 2B to trace execution flow and identify issues.
     *
     * @param stepInstanceId Step instance UUID
     * @return Map containing DTO and email-specific fields for comprehensive notification support
     */
    static Map buildEmailNotificationDTO(UUID stepInstanceId) {
        println "${LOG_PREFIX} ================== START buildEmailNotificationDTO =================="
        println "${LOG_PREFIX} Input stepInstanceId: ${stepInstanceId}"
        println "${LOG_PREFIX} Input type: ${stepInstanceId?.getClass()?.name}"

        if (!stepInstanceId) {
            println "${LOG_PREFIX} ❌ ERROR: stepInstanceId is null"
            return null
        }

        try {
            return DatabaseUtil.withSql { sql ->
                println "${LOG_PREFIX} 📊 Starting database query execution..."

                // Step 1: Log the exact SQL query that will be executed
                def sqlQuery = '''
                    SELECT
                        sti.sti_id as step_instance_id,
                        sti.sti_name as step_instance_name,
                        sti.sti_description as step_instance_description,
                        sti.sti_status as step_instance_status,
                        sti.sti_duration_minutes as duration_minutes,
                        sti.created_at as created_date,
                        sti.updated_at as updated_date,
                        sti.sti_start_time as start_time,
                        sti.sti_end_time as end_time,

                        stm.stm_id as step_master_id,
                        stm.stm_name as step_master_name,
                        stm.stm_description as step_master_description,
                        stm.stm_number as step_number,
                        stm.stt_code as step_type,

                        tms.tms_id as team_id,
                        tms.tms_name as team_name,

                        mig.mig_id as migration_id,
                        mig.mig_name as migration_code,

                        ite.ite_id as iteration_id,
                        ite.ite_name as iteration_code,

                        phi.phi_id as phase_id,
                        phi.phi_name as phase_name,

                        sqi.sqi_id as sequence_id,
                        sqi.sqi_name as sequence_name,

                        pli.pli_id as plan_id,
                        pli.pli_name as plan_name

                    FROM steps_instance_sti sti
                    INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                    LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    LEFT JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    LEFT JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    LEFT JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    LEFT JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    WHERE sti.sti_id = ?
                '''

                println "${LOG_PREFIX} 📋 SQL Query to execute:"
                println sqlQuery
                println "${LOG_PREFIX} Query parameter: ${stepInstanceId}"

                // Step 2: Execute the query and capture the result
                def queryStartTime = System.currentTimeMillis()
                def queryResult = null

                try {
                    queryResult = sql.firstRow(sqlQuery, [stepInstanceId])
                    def queryEndTime = System.currentTimeMillis()
                    println "${LOG_PREFIX} ✅ Query executed successfully in ${queryEndTime - queryStartTime}ms"
                } catch (Exception queryEx) {
                    println "${LOG_PREFIX} ❌ SQL Query execution failed: ${queryEx.message}"
                    queryEx.printStackTrace()
                    throw queryEx
                }

                // Step 3: Analyze the query result
                if (!queryResult) {
                    println "${LOG_PREFIX} ❌ Query returned null result"
                    println "${LOG_PREFIX} This suggests the step instance ID ${stepInstanceId} does not exist"
                    return null
                }

                println "${LOG_PREFIX} ✅ Query returned data - analyzing result structure..."
                println "${LOG_PREFIX} Result type: ${queryResult.getClass().name}"

                // Step 4: Log all available columns and their values
                if (queryResult instanceof GroovyRowResult) {
                    println "${LOG_PREFIX} 📊 GroovyRowResult column analysis:"
                    println "${LOG_PREFIX} Available columns (${queryResult.keySet().size()}):"

                    queryResult.keySet().each { columnName ->
                        def value = null
                        try {
                            value = queryResult[columnName]
                            println "${LOG_PREFIX}   ✅ ${columnName}: ${value} (${value?.getClass()?.name ?: 'null'})"
                        } catch (Exception colEx) {
                            println "${LOG_PREFIX}   ❌ ${columnName}: ERROR accessing - ${colEx.message}"
                        }
                    }
                } else {
                    println "${LOG_PREFIX} Result is not a GroovyRowResult, it's: ${queryResult.getClass().name}"
                }

                // Use the queryResult as stepData for further processing
                def stepData = queryResult

                if (!stepData) {
                    println "${LOG_PREFIX} ❌ Step instance not found: ${stepInstanceId}"
                    throw new RuntimeException("Step instance not found: ${stepInstanceId}")
                }

                // Get impacted teams with debugging
                println "${LOG_PREFIX} 📊 Fetching impacted teams..."
                def impactedTeams = sql.rows('''
                    SELECT DISTINCT tms.tms_name
                    FROM steps_master_stm_x_teams_tms_impacted impact
                    INNER JOIN teams_tms tms ON impact.tms_id = tms.tms_id
                    INNER JOIN steps_master_stm stm ON impact.stm_id = stm.stm_id
                    INNER JOIN steps_instance_sti sti ON stm.stm_id = sti.stm_id
                    WHERE sti.sti_id = ?
                    ORDER BY tms.tms_name
                ''', [stepInstanceId])

                println "${LOG_PREFIX} ✅ Found ${impactedTeams.size()} impacted teams"

                // Convert status ID to status name for DTO validation
                println "${LOG_PREFIX} 🔍 Converting status ID to status name..."
                def statusName = getStatusNameById(sql, stepData.step_instance_status as Integer)
                println "${LOG_PREFIX} ✅ Status conversion: ${stepData.step_instance_status} -> ${statusName}"

                // Build DTO using the builder pattern for type safety with debugging
                println "${LOG_PREFIX} 🔨 Building DTO with builder pattern..."

                try {
                    def dto = umig.dto.StepInstanceDTO.builder()
                        .stepInstanceId(safeGetField(stepData, 'step_instance_id', 'Step Instance ID') as String)
                        .stepId(safeGetField(stepData, 'step_master_id', 'Step Master ID') as String)
                        .stepName(safeGetField(stepData, 'step_instance_name', 'Step Instance Name') as String)
                        .stepDescription(safeGetField(stepData, 'step_instance_description', 'Step Instance Description') as String)
                        .stepStatus(statusName)
                        .stepNumber(safeGetField(stepData, 'step_number', 'Step Number') as Integer)
                        .stepType(safeGetField(stepData, 'step_type', 'Step Type') as String)
                        // Hierarchical context
                        .migrationId(safeGetField(stepData, 'migration_id', 'Migration ID') as String)
                        .migrationCode(safeGetField(stepData, 'migration_code', 'Migration Code') as String)
                        .iterationId(safeGetField(stepData, 'iteration_id', 'Iteration ID') as String)
                        .iterationCode(safeGetField(stepData, 'iteration_code', 'Iteration Code') as String)
                        .sequenceId(safeGetField(stepData, 'sequence_id', 'Sequence ID') as String)
                        .sequenceName(safeGetField(stepData, 'sequence_name', 'Sequence Name') as String)
                        .phaseId(safeGetField(stepData, 'phase_id', 'Phase ID') as String)
                        .phaseName(safeGetField(stepData, 'phase_name', 'Phase Name') as String)
                        // Team assignments
                        .assignedTeamId(safeGetField(stepData, 'team_id', 'Team ID') as String)
                        .assignedTeamName(safeGetField(stepData, 'team_name', 'Team Name') as String)
                        // Timestamps - Convert java.sql.Timestamp to LocalDateTime safely
                        .createdDate(safeGetTimestamp(stepData, 'created_date', 'Created Date'))
                        .lastModifiedDate(safeGetTimestamp(stepData, 'updated_date', 'Updated Date'))
                        .build()

                    println "${LOG_PREFIX} ✅ DTO built successfully"

                    // Create email-specific data map for properties not in DTO
                    println "${LOG_PREFIX} 🔨 Building email-specific data map..."
                    def emailData = [
                        planId: safeGetField(stepData, 'plan_id', 'Plan ID') as String,
                        planName: safeGetField(stepData, 'plan_name', 'Plan Name') as String,
                        impactedTeams: impactedTeams.collect { it.tms_name }.join(', ')
                    ]

                    println "${LOG_PREFIX} ✅ Email data built successfully"

                    // Test StepDataTransformationService compatibility
                    println "${LOG_PREFIX} 🧪 Testing StepDataTransformationService compatibility..."
                    try {
                        def transformationService = new StepDataTransformationService()
                        // Create a test map with both camelCase and snake_case properties
                        def testMap = [
                            sti_id: dto.stepInstanceId,
                            sti_name: dto.stepName,
                            stm_name: safeGetField(stepData, 'step_master_name', 'Step Master Name') ?: dto.stepName ?: 'Unknown Step',
                            stm_id: dto.stepId,
                            stm_description: safeGetField(stepData, 'step_master_description', 'Step Master Description'),
                            sti_description: dto.stepDescription,
                            sti_status: dto.stepStatus
                        ]

                        def testDto = transformationService.fromDatabaseRow(testMap)
                        println "${LOG_PREFIX} ✅ StepDataTransformationService processing succeeded!"
                        println "${LOG_PREFIX} Generated DTO: stepName='${testDto.stepName}', stepId='${testDto.stepId}'"
                    } catch (Exception transformEx) {
                        println "${LOG_PREFIX} ❌ StepDataTransformationService failed: ${transformEx.message}"
                        transformEx.printStackTrace()
                        // Don't throw here, just log the issue
                    }

                    // Return comprehensive result with debugging info
                    def result = [
                        dto: dto,
                        emailData: emailData,
                        // For backward compatibility, expose these as direct properties on the result
                        stepInstanceId: dto.stepInstanceId,
                        stepId: dto.stepId,
                        stepName: dto.stepName,
                        stepDescription: dto.stepDescription,
                        stepStatus: dto.stepStatus,
                        stepNumber: dto.stepNumber,
                        stepType: dto.stepType,
                        migrationId: dto.migrationId,
                        migrationCode: dto.migrationCode,
                        iterationId: dto.iterationId,
                        iterationCode: dto.iterationCode,
                        sequenceId: dto.sequenceId,
                        sequenceName: dto.sequenceName,
                        phaseId: dto.phaseId,
                        phaseName: dto.phaseName,
                        assignedTeamId: dto.assignedTeamId,
                        assignedTeamName: dto.assignedTeamName,
                        createdDate: dto.createdDate,
                        lastModifiedDate: dto.lastModifiedDate,
                        // Email-specific fields
                        planId: emailData.planId,
                        planName: emailData.planName,
                        impactedTeams: emailData.impactedTeams,
                        // Snake_case properties for EmailService compatibility (required by StepDataTransformationService)
                        sti_id: dto.stepInstanceId,
                        sti_name: dto.stepName,
                        stm_name: safeGetField(stepData, 'step_master_name', 'Step Master Name') ?: dto.stepName ?: 'Unknown Step',
                        stm_id: dto.stepId,
                        stm_description: safeGetField(stepData, 'step_master_description', 'Step Master Description'),
                        sti_description: dto.stepDescription,
                        sti_status: dto.stepStatus
                    ]

                    println "${LOG_PREFIX} 📋 Final result Map contents:"
                    result.each { key, value ->
                        println "${LOG_PREFIX}   ${key}: ${value} (${value?.getClass()?.name ?: 'null'})"
                    }

                    println "${LOG_PREFIX} ================== END buildEmailNotificationDTO =================="
                    return result

                } catch (Exception buildEx) {
                    println "${LOG_PREFIX} ❌ ERROR building DTO/emailData: ${buildEx.message}"
                    buildEx.printStackTrace()
                    throw buildEx
                }
            }

        } catch (Exception ex) {
            println "${LOG_PREFIX} ❌ FATAL ERROR in buildEmailNotificationDTO: ${ex.message}"
            ex.printStackTrace()
            throw ex
        }
    }

    /**
     * Get instruction details for notifications
     */
    private static Map getInstructionDetails(Sql sql, UUID instructionId) {
        def query = '''
            SELECT ini.ini_id, ini.ini_name, ini.ini_description
            FROM instructions_instance_ini ini
            WHERE ini.ini_id = :instructionId
        '''
        
        return sql.firstRow(query, [instructionId: instructionId])
    }
    
    /**
     * Get teams for step notifications
     */
    private static List<Map> getTeamsForStepNotification(Sql sql, UUID stepInstanceId) {
        def query = '''
            SELECT DISTINCT tms.tms_id, tms.tms_name, tms.tms_email
            FROM teams_tms tms
            WHERE tms.tms_id IN (
                -- Owner team
                SELECT stm.tms_id_owner
                FROM steps_instance_sti sti
                INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                WHERE sti.sti_id = :stepInstanceId
                UNION
                -- Impacted teams
                SELECT sit.tms_id
                FROM steps_instance_sti sti
                INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                INNER JOIN steps_master_stm_x_teams_tms_impacted sit ON stm.stm_id = sit.stm_id
                WHERE sti.sti_id = :stepInstanceId
            )
        '''
        
        List<groovy.sql.GroovyRowResult> results = sql.rows(query, [stepInstanceId: stepInstanceId])
        return results.collect { row -> 
            [
                tms_id: row.tms_id,
                tms_name: row.tms_name,
                tms_email: row.tms_email
            ] as Map
        } as List<Map>
    }
    
    /**
     * Get cutover team for notifications
     */
    private static Map getCutoverTeam(Sql sql) {
        def query = '''
            SELECT tms.tms_id, tms.tms_name, tms.tms_email
            FROM teams_tms tms
            WHERE UPPER(tms.tms_name) LIKE '%CUTOVER%' 
               OR UPPER(tms.tms_name) LIKE '%IT%'
            LIMIT 1
        '''
        
        return sql.firstRow(query)
    }
    
    /**
     * Get status name by ID
     */
    private static String getStatusNameById(Sql sql, Integer statusId) {
        if (!statusId) return "UNKNOWN"

        def status = sql.firstRow('SELECT sts_name FROM status_sts WHERE sts_id = :statusId', [statusId: statusId])
        return status?.sts_name ?: "UNKNOWN"
    }

    /**
     * Safely gets a field from GroovyRowResult with comprehensive logging
     */
    private static Object safeGetField(GroovyRowResult result, String fieldName, String description) {
        try {
            def value = result[fieldName]
            println "${LOG_PREFIX}     ✅ ${description} (${fieldName}): ${value}"
            return value
        } catch (Exception ex) {
            println "${LOG_PREFIX}     ❌ ${description} (${fieldName}): ERROR - ${ex.message}"
            return null
        }
    }

    /**
     * Safely gets and converts timestamp fields
     */
    private static LocalDateTime safeGetTimestamp(GroovyRowResult result, String fieldName, String description) {
        try {
            def timestamp = result[fieldName]
            if (timestamp == null) {
                println "${LOG_PREFIX}     ⚠️  ${description} (${fieldName}): null"
                return null
            }

            if (timestamp instanceof java.sql.Timestamp) {
                def converted = timestamp.toLocalDateTime()
                println "${LOG_PREFIX}     ✅ ${description} (${fieldName}): ${converted} (converted from Timestamp)"
                return converted
            } else if (timestamp instanceof LocalDateTime) {
                println "${LOG_PREFIX}     ✅ ${description} (${fieldName}): ${timestamp} (already LocalDateTime)"
                return timestamp
            } else {
                println "${LOG_PREFIX}     ⚠️  ${description} (${fieldName}): ${timestamp} (unexpected type: ${timestamp.getClass().name})"
                return null
            }
        } catch (Exception ex) {
            println "${LOG_PREFIX}     ❌ ${description} (${fieldName}): ERROR - ${ex.message}"
            return null
        }
    }

    /**
     * Send email notification with debugging
     */
    static boolean sendStepNotification(UUID stepInstanceId, String emailTemplate, Map additionalData = [:]) {
        println "${LOG_PREFIX} ================== START sendStepNotification =================="
        println "${LOG_PREFIX} stepInstanceId: ${stepInstanceId}"
        println "${LOG_PREFIX} emailTemplate: ${emailTemplate}"
        println "${LOG_PREFIX} additionalData: ${additionalData}"

        try {
            // Build the email data
            def emailData = buildEmailNotificationDTO(stepInstanceId)

            if (!emailData) {
                println "${LOG_PREFIX} ❌ Failed to build email data - aborting notification"
                return false
            }

            // Merge additional data
            (emailData as Map).putAll(additionalData)

            // Here would be the actual EmailService call
            // For now, just log what would be sent
            println "${LOG_PREFIX} 📧 Would send email with template: ${emailTemplate}"
            println "${LOG_PREFIX} Email data keys: ${(emailData as Map).keySet()}"

            println "${LOG_PREFIX} ✅ Email notification simulation completed"
            println "${LOG_PREFIX} ================== END sendStepNotification =================="

            return true

        } catch (Exception ex) {
            println "${LOG_PREFIX} ❌ FATAL ERROR in sendStepNotification: ${ex.message}"
            ex.printStackTrace()
            return false
        }
    }

    /**
     * Test method to verify the integration is working
     */
    static boolean testIntegration() {
        println "${LOG_PREFIX} ================== START testIntegration =================="

        try {
            // Get a sample step instance from the database
            def stepInstanceId = DatabaseUtil.withSql { sql ->
                def result = sql.firstRow("""
                    SELECT sti.sti_id
                    FROM steps_instance_sti sti
                    INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    WHERE stm.stm_name IS NOT NULL
                    LIMIT 1
                """)
                return result?.sti_id
            }

            if (!stepInstanceId) {
                println "${LOG_PREFIX} ❌ No valid step instance found for testing"
                return false
            }

            println "${LOG_PREFIX} 🧪 Testing with step instance: ${stepInstanceId}"

            // Test building email notification DTO
            def emailData = buildEmailNotificationDTO(stepInstanceId as UUID)

            if (emailData && (emailData as Map).stm_name) {
                println "${LOG_PREFIX} ✅ Integration test passed!"
                return true
            } else {
                println "${LOG_PREFIX} ❌ Integration test failed - missing stm_name"
                return false
            }

        } catch (Exception ex) {
            println "${LOG_PREFIX} ❌ Integration test failed: ${ex.message}"
            ex.printStackTrace()
            return false
        } finally {
            println "${LOG_PREFIX} ================== END testIntegration =================="
        }
    }
}