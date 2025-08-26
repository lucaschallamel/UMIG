package umig.utils

import groovy.sql.Sql
import groovy.sql.GroovyRowResult
import java.util.UUID
import umig.utils.DatabaseUtil
import umig.utils.EmailService
import umig.utils.EnhancedEmailNotificationService
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
    static Map<String, Object> updateStepStatusWithEnhancedNotifications(UUID stepInstanceId, Integer newStatusId, Integer userId = null) {
        return DatabaseUtil.withSql { Sql sql ->
            Map<String, Object> result
            try {
                // First, perform the database status update only
                StepRepository stepRepository = new StepRepository()
                Map<String, Object> updateResult = stepRepository.updateStepInstanceStatus(stepInstanceId, newStatusId, userId)
                
                if (!(updateResult['success'] as Boolean)) {
                    result = updateResult as Map<String, Object> // Return the original error
                    return result
                }
                
                // Extract migration and iteration context for URL construction
                Map<String, Object> contextInfo = extractMigrationIterationContextInternal(sql, stepInstanceId)
                
                if (contextInfo && contextInfo['migrationCode'] && contextInfo['iterationCode']) {
                    // Send enhanced notification with URL
                    sendEnhancedStatusChangeNotification(
                        sql, 
                        stepInstanceId, 
                        newStatusId, 
                        userId, 
                        contextInfo['migrationCode'] as String, 
                        contextInfo['iterationCode'] as String
                    )
                    
                    result = [
                        success: true,
                        message: "Step status updated with enhanced notifications",
                        stepInstanceId: stepInstanceId,
                        statusId: newStatusId,
                        emailsSent: 1, // Enhanced notification sent
                        enhancedNotification: true,
                        migrationCode: contextInfo['migrationCode'],
                        iterationCode: contextInfo['iterationCode']
                    ] as Map<String, Object>
                } else {
                    // Fallback to standard notification if context extraction fails
                    println "StepNotificationIntegration: Context extraction failed, using standard notifications"
                    
                    result = [
                        success: true,
                        message: "Step status updated with standard notifications",
                        stepInstanceId: stepInstanceId,
                        statusId: newStatusId,
                        emailsSent: 0, // No enhanced notification sent due to missing context
                        enhancedNotification: false,
                        contextMissing: true
                    ] as Map<String, Object>
                }
                
            } catch (Exception e) {
                println "StepNotificationIntegration: Error in updateStepStatusWithEnhancedNotifications: ${e.message}"
                e.printStackTrace()
                
                result = [
                    success: false,
                    error: "Failed to update step status with notifications: ${e.message}",
                    stepInstanceId: stepInstanceId,
                    enhancedNotification: false
                ] as Map<String, Object>
            }
            return result
        } as Map<String, Object>
    }
    
    /**
     * Enhanced step opening with URL-aware notifications
     * 
     * @param stepInstanceId Step instance UUID  
     * @param userId User performing the action (for audit)
     * @return Map with success status and notification details
     */
    static Map<String, Object> openStepWithEnhancedNotifications(UUID stepInstanceId, Integer userId = null) {
        return DatabaseUtil.withSql { Sql sql ->
            Map<String, Object> result
            try {
                // First, perform the database step opening only
                StepRepository stepRepository = new StepRepository()
                Map<String, Object> openResult = stepRepository.openStepInstance(stepInstanceId, userId)
                
                if (!(openResult['success'] as Boolean)) {
                    result = openResult as Map<String, Object> // Return the original error
                    return result
                }
                
                // Extract migration and iteration context for URL construction
                Map<String, Object> contextInfo = extractMigrationIterationContextInternal(sql, stepInstanceId)
                
                if (contextInfo && contextInfo['migrationCode'] && contextInfo['iterationCode']) {
                    // Send enhanced notification with URL
                    sendEnhancedStepOpenedNotification(
                        sql, 
                        stepInstanceId, 
                        userId, 
                        contextInfo['migrationCode'] as String, 
                        contextInfo['iterationCode'] as String
                    )
                    
                    result = [
                        success: true,
                        message: "Step opened with enhanced notifications",
                        stepInstanceId: stepInstanceId,
                        emailsSent: 1, // Enhanced notification sent
                        enhancedNotification: true,
                        migrationCode: contextInfo['migrationCode'],
                        iterationCode: contextInfo['iterationCode']
                    ] as Map<String, Object>
                } else {
                    result = [
                        success: true,
                        message: "Step opened with standard notifications",
                        stepInstanceId: stepInstanceId,
                        emailsSent: 0, // No enhanced notification sent due to missing context
                        enhancedNotification: false,
                        contextMissing: true
                    ] as Map<String, Object>
                }
                
            } catch (Exception e) {
                println "StepNotificationIntegration: Error in openStepWithEnhancedNotifications: ${e.message}"
                e.printStackTrace()
                
                result = [
                    success: false,
                    error: "Failed to open step with notifications: ${e.message}",
                    stepInstanceId: stepInstanceId,
                    enhancedNotification: false
                ] as Map<String, Object>
            }
            return result
        } as Map<String, Object>
    }
    
    /**
     * Enhanced instruction completion with URL-aware notifications
     * 
     * @param instructionId Instruction UUID
     * @param stepInstanceId Step instance UUID
     * @param userId User performing the action (for audit)
     * @return Map with success status and notification details
     */
    static Map<String, Object> completeInstructionWithEnhancedNotifications(UUID instructionId, UUID stepInstanceId, Integer userId = null) {
        return DatabaseUtil.withSql { Sql sql ->
            Map<String, Object> result
            try {
                // First, perform the database instruction completion only
                StepRepository stepRepository = new StepRepository()
                Map<String, Object> completeResult = stepRepository.completeInstruction(instructionId, stepInstanceId, userId)
                
                if (!(completeResult['success'] as Boolean)) {
                    result = completeResult as Map<String, Object> // Return the original error
                    return result
                }
                
                // Extract migration and iteration context for URL construction
                Map<String, Object> contextInfo = extractMigrationIterationContextInternal(sql, stepInstanceId)
                
                if (contextInfo && contextInfo['migrationCode'] && contextInfo['iterationCode']) {
                    // Send enhanced notification with URL
                    sendEnhancedInstructionCompletedNotification(
                        sql, 
                        instructionId,
                        stepInstanceId, 
                        userId, 
                        contextInfo['migrationCode'] as String, 
                        contextInfo['iterationCode'] as String
                    )
                    
                    result = [
                        success: true,
                        message: "Instruction completed with enhanced notifications",
                        instructionId: instructionId,
                        stepInstanceId: stepInstanceId,
                        emailsSent: 1, // Enhanced notification sent
                        enhancedNotification: true,
                        migrationCode: contextInfo['migrationCode'],
                        iterationCode: contextInfo['iterationCode']
                    ] as Map<String, Object>
                } else {
                    result = [
                        success: true,
                        message: "Instruction completed with standard notifications",
                        instructionId: instructionId,
                        stepInstanceId: stepInstanceId,
                        emailsSent: 0, // No enhanced notification sent due to missing context
                        enhancedNotification: false,
                        contextMissing: true
                    ] as Map<String, Object>
                }
                
            } catch (Exception e) {
                println "StepNotificationIntegration: Error in completeInstructionWithEnhancedNotifications: ${e.message}"
                e.printStackTrace()
                
                result = [
                    success: false,
                    error: "Failed to complete instruction with notifications: ${e.message}",
                    instructionId: instructionId,
                    stepInstanceId: stepInstanceId,
                    enhancedNotification: false
                ] as Map<String, Object>
            }
            return result
        } as Map<String, Object>
    }
    
    // ========================================
    // PUBLIC HELPER METHODS (US-039 Phase 1)
    // ========================================
    
    /**
     * Extract migration and iteration context for URL construction (public wrapper)
     * Added in US-039 Phase 1 for API access to context information
     */
    static Map<String, Object> extractMigrationIterationContext(UUID stepInstanceId) {
        return DatabaseUtil.withSql { Sql sql ->
            Map<String, Object> result = extractMigrationIterationContextInternal(sql, stepInstanceId)
            return result
        } as Map<String, Object>
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
    private static Map<String, Object> extractMigrationIterationContextInternal(Sql sql, UUID stepInstanceId) {
        try {
            String contextQuery = '''
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
            
            GroovyRowResult contextResult = sql.firstRow(contextQuery, [stepInstanceId: stepInstanceId])
            
            if (contextResult) {
                Map<String, Object> result = [
                    migrationCode: contextResult['migration_code'],
                    iterationCode: contextResult['iteration_code'] ?: "default",
                    stepName: contextResult['step_name'],
                    stepTypeCode: contextResult['step_type_code'],
                    stepNumber: contextResult['step_number']
                ] as Map<String, Object>
                return result
            } else {
                println "StepNotificationIntegration: No context found for step instance: ${stepInstanceId}"
                return null as Map<String, Object>
            }
            
        } catch (Exception e) {
            println "StepNotificationIntegration: Error extracting migration context: ${e.message}"
            e.printStackTrace()
            return null as Map<String, Object>
        }
    }
    
    /**
     * Send enhanced status change notification
     */
    private static void sendEnhancedStatusChangeNotification(Sql sql, UUID stepInstanceId, Integer newStatusId, 
                                                           Integer userId, String migrationCode, String iterationCode) {
        try {
            // Get step instance details
            Map<String, Object> stepInstance = getStepInstanceDetails(sql, stepInstanceId)
            if (!stepInstance) {
                println "StepNotificationIntegration: Step instance not found: ${stepInstanceId}"
                return
            }
            
            // Get old status name for comparison
            String oldStatus = getStatusNameById(sql, stepInstance['old_status_id'] as Integer)
            String newStatus = getStatusNameById(sql, newStatusId)
            
            // Get teams for notification
            List<Map> teams = getTeamsForStepNotification(sql, stepInstanceId)
            Map<String, Object> cutoverTeam = getCutoverTeam(sql)
            
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
            Map<String, Object> stepInstance = getStepInstanceDetails(sql, stepInstanceId)
            if (!stepInstance) {
                println "StepNotificationIntegration: Step instance not found: ${stepInstanceId}"
                return
            }
            
            // Get teams for notification
            List<Map> teams = getTeamsForStepNotification(sql, stepInstanceId)
            
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
            Map<String, Object> instruction = getInstructionDetails(sql, instructionId)
            Map<String, Object> stepInstance = getStepInstanceDetails(sql, stepInstanceId)
            
            if (!instruction || !stepInstance) {
                println "StepNotificationIntegration: Instruction or step instance not found"
                return
            }
            
            // Get teams for notification
            List<Map> teams = getTeamsForStepNotification(sql, stepInstanceId)
            
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
    private static Map<String, Object> getStepInstanceDetails(Sql sql, UUID stepInstanceId) {
        String query = '''
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
        
        GroovyRowResult result = sql.firstRow(query, [stepInstanceId: stepInstanceId])
        if (result) {
            Map<String, Object> stepDetails = [
                sti_id: result['sti_id'],
                sti_name: result['sti_name'],
                sti_status: result['sti_status'],
                stt_code: result['stt_code'],
                stm_number: result['stm_number'],
                stm_name: result['stm_name'],
                migration_name: result['migration_name'],
                old_status_id: result['sti_status']
            ] as Map<String, Object>
            return stepDetails
        } else {
            return null as Map<String, Object>
        }
    }
    
    /**
     * Get instruction details for notifications
     */
    private static Map<String, Object> getInstructionDetails(Sql sql, UUID instructionId) {
        String query = '''
            SELECT ini.ini_id, ini.ini_name, ini.ini_description
            FROM instructions_instance_ini ini
            WHERE ini.ini_id = :instructionId
        '''
        
        GroovyRowResult result = sql.firstRow(query, [instructionId: instructionId])
        if (result) {
            Map<String, Object> instructionDetails = [
                ini_id: result['ini_id'],
                ini_name: result['ini_name'],
                ini_description: result['ini_description']
            ] as Map<String, Object>
            return instructionDetails
        } else {
            return null as Map<String, Object>
        }
    }
    
    /**
     * Get teams for step notifications
     */
    private static List<Map> getTeamsForStepNotification(Sql sql, UUID stepInstanceId) {
        String query = '''
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
        
        List<GroovyRowResult> results = sql.rows(query, [stepInstanceId: stepInstanceId])
        return results.collect { GroovyRowResult row -> 
            [
                tms_id: row['tms_id'],
                tms_name: row['tms_name'],
                tms_email: row['tms_email']
            ] as Map
        } as List<Map>
    }
    
    /**
     * Get cutover team for notifications
     */
    private static Map<String, Object> getCutoverTeam(Sql sql) {
        String query = '''
            SELECT tms.tms_id, tms.tms_name, tms.tms_email
            FROM teams_tms tms
            WHERE UPPER(tms.tms_name) LIKE '%CUTOVER%' 
               OR UPPER(tms.tms_name) LIKE '%IT%'
            LIMIT 1
        '''
        
        GroovyRowResult result = sql.firstRow(query)
        if (result) {
            Map<String, Object> cutoverTeam = [
                tms_id: result['tms_id'],
                tms_name: result['tms_name'],
                tms_email: result['tms_email']
            ] as Map<String, Object>
            return cutoverTeam
        } else {
            return null as Map<String, Object>
        }
    }
    
    /**
     * Get status name by ID
     */
    private static String getStatusNameById(Sql sql, Integer statusId) {
        if (!statusId) return "UNKNOWN"
        
        GroovyRowResult status = sql.firstRow('SELECT sts_name FROM status_sts WHERE sts_id = :statusId', [statusId: statusId])
        return status ? (status['sts_name'] as String) : "UNKNOWN"
    }
}