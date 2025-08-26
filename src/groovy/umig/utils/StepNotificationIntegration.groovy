package umig.utils

import groovy.sql.Sql
import java.util.UUID
import umig.utils.DatabaseUtil
import umig.utils.EnhancedEmailService
import umig.repository.StepRepository

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
 * 
 * @author UMIG Project Team
 * @since 2025-08-21
 */
class StepNotificationIntegration {
    
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
        DatabaseUtil.withSql { sql ->
            try {
                // First, perform the standard status update
                def stepRepository = new StepRepository()
                def updateResult = stepRepository.updateStepInstanceStatusWithNotification(stepInstanceId, newStatusId, userId)
                
                if (!(updateResult.success as Boolean)) {
                    return updateResult // Return the original error
                }
                
                // Extract migration and iteration context for URL construction
                def contextInfo = extractMigrationIterationContextInternal(sql, stepInstanceId)
                
                if (contextInfo && contextInfo.migrationCode && contextInfo.iterationCode) {
                    // Send enhanced notification with URL
                    sendEnhancedStatusChangeNotification(
                        sql, 
                        stepInstanceId, 
                        newStatusId, 
                        userId, 
                        contextInfo.migrationCode as String, 
                        contextInfo.iterationCode as String
                    )
                    
                    return [
                        success: true,
                        message: "Step status updated with enhanced notifications",
                        stepInstanceId: stepInstanceId,
                        statusId: newStatusId,
                        emailsSent: updateResult.emailsSent ?: 0,
                        enhancedNotification: true,
                        migrationCode: contextInfo.migrationCode,
                        iterationCode: contextInfo.iterationCode
                    ]
                } else {
                    // Fallback to standard notification if context extraction fails
                    println "StepNotificationIntegration: Context extraction failed, using standard notifications"
                    
                    return [
                        success: true,
                        message: "Step status updated with standard notifications",
                        stepInstanceId: stepInstanceId,
                        statusId: newStatusId,
                        emailsSent: updateResult.emailsSent ?: 0,
                        enhancedNotification: false,
                        contextMissing: true
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
                def contextInfo = extractMigrationIterationContextInternal(sql, stepInstanceId)
                
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
                def contextInfo = extractMigrationIterationContextInternal(sql, stepInstanceId)
                
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
    // PUBLIC HELPER METHODS (US-039 Phase 1)
    // ========================================
    
    /**
     * Extract migration and iteration context for URL construction (public wrapper)
     * Added in US-039 Phase 1 for API access to context information
     */
    static Map extractMigrationIterationContext(UUID stepInstanceId) {
        DatabaseUtil.withSql { sql ->
            return extractMigrationIterationContextInternal(sql, stepInstanceId)
        }
    }
    
    // ========================================
    // PRIVATE HELPER METHODS
    // ========================================
    
    /**
     * Extract migration and iteration context for URL construction (internal implementation)
     * 
     * This method traverses the hierarchy from step instance up to migration
     * to extract the codes needed for URL construction.
     */
    private static Map extractMigrationIterationContextInternal(Sql sql, UUID stepInstanceId) {
        try {
            def contextQuery = '''
                SELECT 
                    mig.mig_code as migration_code,
                    itn.itn_code as iteration_code,
                    sti.sti_name as step_name,
                    stm.stt_code as step_type_code,
                    stm.stm_number as step_number
                FROM steps_instance_sti sti
                INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                INNER JOIN phase_instance_phi phi ON sti.phi_id = phi.phi_id
                INNER JOIN sequence_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                INNER JOIN plan_instance_pli pli ON sqi.pli_id = pli.pli_id
                INNER JOIN iteration_instance_ini ini ON pli.ini_id = ini.ini_id
                INNER JOIN migration_mig mig ON ini.mig_id = mig.mig_id
                LEFT JOIN iteration_types_itn itn ON ini.itt_id = itn.itt_id
                WHERE sti.sti_id = :stepInstanceId
            '''
            
            def contextResult = sql.firstRow(contextQuery, [stepInstanceId: stepInstanceId])
            
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
            
            // Send enhanced notification with mobile template (US-039 Phase 1)
            EnhancedEmailNotificationService.sendAutomatedStatusChangeNotification(
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
            
            // Send enhanced notification with mobile template (US-039 Phase 1)
            EnhancedEmailNotificationService.sendAutomatedStepOpenedNotification(
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
            
            // Send enhanced notification with mobile template (US-039 Phase 1)
            EnhancedEmailNotificationService.sendAutomatedInstructionCompletedNotification(
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
                   stm.stm_name, mig.mig_name as migration_name
            FROM steps_instance_sti sti
            INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
            LEFT JOIN phase_instance_phi phi ON sti.phi_id = phi.phi_id
            LEFT JOIN sequence_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
            LEFT JOIN plan_instance_pli pli ON sqi.pli_id = pli.pli_id
            LEFT JOIN iteration_instance_ini ini ON pli.ini_id = ini.ini_id
            LEFT JOIN migration_mig mig ON ini.mig_id = mig.mig_id
            WHERE sti.sti_id = :stepInstanceId
        '''
        
        return sql.firstRow(query, [stepInstanceId: stepInstanceId])
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
                SELECT sti.tms_id 
                FROM steps_instance_sti sti 
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
}