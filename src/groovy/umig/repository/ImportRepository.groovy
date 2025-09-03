package umig.repository

import groovy.sql.Sql
import groovy.json.JsonBuilder
import umig.utils.DatabaseUtil
import java.util.UUID
import java.sql.Timestamp
import org.slf4j.Logger
import org.slf4j.LoggerFactory

/**
 * Repository for import-related database operations
 * Manages import batches, audit trails, and import history
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034
 */
class ImportRepository {
    
    private static final Logger log = LoggerFactory.getLogger(ImportRepository.class)
    
    /**
     * Create a new import batch record
     * 
     * @param sql SQL connection
     * @param source Source identifier (filename, API, etc.)
     * @param importType Type of import (JSON_IMPORT, CSV_IMPORT, etc.)
     * @param userId User performing the import
     * @return UUID of the created batch
     */
    UUID createImportBatch(Sql sql, String source, String importType, String userId) {
        UUID batchId = UUID.randomUUID()
        Timestamp now = new Timestamp(System.currentTimeMillis())
        
        String query = """
            INSERT INTO import_batches (
                imb_id, 
                imb_source, 
                imb_type, 
                imb_status, 
                imb_user_id,
                imb_start_time, 
                imb_created_date,
                imb_is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        sql.executeInsert(query, [
            batchId,
            source,
            importType,
            'IN_PROGRESS',
            userId,
            now,
            now,
            true
        ])
        
        log.info("Created import batch: ${batchId} for source: ${source}")
        return batchId
    }
    
    /**
     * Update import batch status and statistics
     * 
     * @param sql SQL connection  
     * @param batchId Batch UUID
     * @param status New status (COMPLETED, FAILED, etc.)
     * @param statistics Map of import statistics
     */
    void updateImportBatchStatus(Sql sql, UUID batchId, String status, Map statistics = [:]) {
        Timestamp now = new Timestamp(System.currentTimeMillis())
        String statsJson = new JsonBuilder(statistics).toString()
        
        String query = """
            UPDATE import_batches 
            SET imb_status = ?,
                imb_end_time = ?,
                imb_statistics = ?::jsonb,
                imb_last_modified_date = ?
            WHERE imb_id = ?
        """
        
        sql.executeUpdate(query, [
            status,
            now,
            statsJson,
            now,
            batchId
        ])
        
        log.info("Updated import batch ${batchId} status to: ${status}")
    }
    
    /**
     * Get import history with optional filtering
     * 
     * @param userId Optional user filter
     * @param limit Maximum number of records
     * @return List of import batch records
     */
    List getImportHistory(String userId = null, Integer limit = 50) {
        List results = []
        
        DatabaseUtil.withSql { Sql sql ->
            String query = """
                SELECT 
                    imb_id,
                    imb_source,
                    imb_type,
                    imb_status,
                    imb_user_id,
                    imb_start_time,
                    imb_end_time,
                    imb_statistics,
                    imb_created_date
                FROM import_batches
                WHERE imb_is_active = true
                ${userId ? "AND imb_user_id = ?" : ""}
                ORDER BY imb_created_date DESC
                LIMIT ?
            """
            
            List<Object> params = []
            if (userId) {
                params = [userId, limit]
            } else {
                params = [limit]
            }
            
            sql.eachRow(query, params) { row ->
                (results as List) << ([
                    batchId: row['imb_id'].toString(),
                    source: row['imb_source'],
                    type: row['imb_type'],
                    status: row['imb_status'],
                    userId: row['imb_user_id'],
                    startTime: row['imb_start_time'],
                    endTime: row['imb_end_time'],
                    statistics: row['imb_statistics'] ? 
                        new groovy.json.JsonSlurper().parseText(row['imb_statistics'].toString()) : [:],
                    createdDate: row['imb_created_date'],
                    duration: calculateDuration(row['imb_start_time'] as Timestamp, row['imb_end_time'] as Timestamp)
                ] as Map)
            }
        }
        
        return results
    }
    
    /**
     * Get detailed information about a specific import batch
     * 
     * @param batchId Batch UUID
     * @return Map containing batch details and imported entities
     */
    Map getImportBatchDetails(UUID batchId) {
        Map result = null
        
        DatabaseUtil.withSql { Sql sql ->
            // Get batch information
            String batchQuery = """
                SELECT 
                    imb_id,
                    imb_source,
                    imb_type,
                    imb_status,
                    imb_user_id,
                    imb_start_time,
                    imb_end_time,
                    imb_statistics,
                    imb_error_message,
                    imb_created_date
                FROM import_batches
                WHERE imb_id = ?
            """
            
            def row = sql.firstRow(batchQuery, [batchId])
            
            if (row) {
                result = [
                    batchId: row['imb_id'].toString(),
                    source: row['imb_source'],
                    type: row['imb_type'],
                    status: row['imb_status'],
                    userId: row['imb_user_id'],
                    startTime: row['imb_start_time'],
                    endTime: row['imb_end_time'],
                    statistics: row['imb_statistics'] ? 
                        new groovy.json.JsonSlurper().parseText(row['imb_statistics'].toString()) : [:],
                    errorMessage: row['imb_error_message'],
                    createdDate: row['imb_created_date'],
                    duration: calculateDuration(row['imb_start_time'] as Timestamp, row['imb_end_time'] as Timestamp),
                    importedEntities: getImportedEntities(sql, batchId)
                ]
            }
        }
        
        return result
    }
    
    /**
     * Get entities imported in a specific batch
     */
    private Map getImportedEntities(Sql sql, UUID batchId) {
        Map entities = [
            steps: [],
            instructions: [],
            teams: []
        ]
        
        // Get imported steps
        String stepsQuery = """
            SELECT stm_id, stm_step_code, stm_step_number, stm_step_name
            FROM steps_master_stm
            WHERE stm_import_batch_id = ?
        """
        
        sql.eachRow(stepsQuery, [batchId]) { row ->
            (entities.steps as List) << ([
                stepId: row['stm_id'].toString(),
                stepCode: "${row['stm_step_code']}-${row['stm_step_number']}",
                stepName: row['stm_step_name']
            ] as Map)
        }
        
        // Get imported instructions
        String instructionsQuery = """
            SELECT inm_id, inm_instruction_id, inm_description
            FROM instructions_master_inm
            WHERE inm_import_batch_id = ?
        """
        
        sql.eachRow(instructionsQuery, [batchId]) { row ->
            (entities.instructions as List) << ([
                instructionId: row['inm_id'].toString(),
                instructionCode: row['inm_instruction_id'],
                description: row['inm_description']
            ] as Map)
        }
        
        return entities
    }
    
    /**
     * Rollback an import batch
     * Marks all imported entities as inactive
     * 
     * @param batchId Batch to rollback
     * @param reason Rollback reason
     * @return Success status
     */
    boolean rollbackImportBatch(UUID batchId, String reason) {
        boolean success = false
        
        DatabaseUtil.withSql { Sql sql ->
            sql.withTransaction {
                try {
                    Timestamp now = new Timestamp(System.currentTimeMillis())
                    
                    // Mark steps as inactive
                    String stepsUpdate = """
                        UPDATE steps_master_stm
                        SET stm_is_active = false,
                            stm_last_modified_date = ?
                        WHERE stm_import_batch_id = ?
                    """
                    int stepsCount = sql.executeUpdate(stepsUpdate, [now, batchId])
                    
                    // Mark instructions as inactive
                    String instructionsUpdate = """
                        UPDATE instructions_master_inm
                        SET inm_is_active = false,
                            inm_last_modified_date = ?
                        WHERE inm_import_batch_id = ?
                    """
                    int instructionsCount = sql.executeUpdate(instructionsUpdate, [now, batchId])
                    
                    // Update batch status
                    String batchUpdate = """
                        UPDATE import_batches
                        SET imb_status = 'ROLLED_BACK',
                            imb_error_message = ?,
                            imb_last_modified_date = ?
                        WHERE imb_id = ?
                    """
                    sql.executeUpdate(batchUpdate, [reason, now, batchId])
                    
                    log.info("Rolled back import batch ${batchId}: ${stepsCount} steps, ${instructionsCount} instructions")
                    success = true
                    
                } catch (Exception e) {
                    log.error("Failed to rollback batch ${batchId}: ${e.message}", e)
                    throw e
                }
            }
        }
        
        return success
    }
    
    /**
     * Calculate duration between two timestamps
     */
    private Long calculateDuration(Timestamp start, Timestamp end) {
        if (start && end) {
            return ((end.time - start.time) / 1000) as Long // Return seconds
        }
        return null
    }
    
    /**
     * Check if a batch exists
     */
    boolean batchExists(UUID batchId) {
        boolean exists = false
        
        DatabaseUtil.withSql { Sql sql ->
            String query = "SELECT COUNT(*) as count FROM import_batches WHERE imb_id = ?"
            def row = sql.firstRow(query, [batchId])
            exists = (row['count'] as Integer) > 0
        }
        
        return exists
    }
    
    /**
     * Get statistics summary for all imports
     */
    Map getImportStatistics() {
        Map stats = [
            totalImports: 0,
            successfulImports: 0,
            failedImports: 0,
            rolledBackImports: 0,
            totalSteps: 0,
            totalInstructions: 0
        ]
        
        DatabaseUtil.withSql { Sql sql ->
            // Get import counts by status
            String statusQuery = """
                SELECT 
                    imb_status,
                    COUNT(*) as count
                FROM import_batches
                WHERE imb_is_active = true
                GROUP BY imb_status
            """
            
            sql.eachRow(statusQuery) { row ->
                Integer count = row['count'] as Integer
                stats.totalImports += count
                
                switch(row['imb_status']) {
                    case 'COMPLETED':
                        stats.successfulImports = count
                        break
                    case 'FAILED':
                        stats.failedImports = count
                        break
                    case 'ROLLED_BACK':
                        stats.rolledBackImports = count
                        break
                }
            }
            
            // Get entity counts
            String stepsQuery = """
                SELECT COUNT(*) as count 
                FROM steps_master_stm 
                WHERE stm_import_batch_id IS NOT NULL 
                AND stm_is_active = true
            """
            stats.totalSteps = sql.firstRow(stepsQuery)['count'] as Integer
            
            String instructionsQuery = """
                SELECT COUNT(*) as count 
                FROM instructions_master_inm 
                WHERE inm_import_batch_id IS NOT NULL 
                AND inm_is_active = true
            """
            stats.totalInstructions = sql.firstRow(instructionsQuery)['count'] as Integer
        }
        
            return stats
    }
    
    // ====== US-034 PHASE 2: ENHANCED PROGRESS TRACKING & ORCHESTRATION METHODS ======
    
    /**
     * Track import progress with real-time updates
     * 
     * @param orchestrationId Orchestration UUID
     * @param phase Current phase name
     * @param completed Number of items completed
     * @param total Total number of items
     * @param message Optional progress message
     * @return Progress tracking result
     */
    Map trackImportProgress(UUID orchestrationId, String phase, Integer completed, Integer total, String message = null) {
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                Integer progressPercentage = total > 0 ? Math.round(((completed as Double) / (total as Double)) * 100.0D as double) as Integer : 0
                
                String upsertQuery = """
                    INSERT INTO import_progress_tracking 
                    (orchestration_id, phase_name, progress_percentage, items_processed, items_total, 
                     status, message, last_update)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT (orchestration_id, phase_name) 
                    DO UPDATE SET 
                        progress_percentage = EXCLUDED.progress_percentage,
                        items_processed = EXCLUDED.items_processed,
                        items_total = EXCLUDED.items_total,
                        status = EXCLUDED.status,
                        message = EXCLUDED.message,
                        last_update = EXCLUDED.last_update,
                        completed = CASE 
                            WHEN EXCLUDED.progress_percentage = 100 THEN EXCLUDED.last_update 
                            ELSE import_progress_tracking.completed 
                        END
                """
                
                String status = progressPercentage == 100 ? 'COMPLETED' : 
                               progressPercentage > 0 ? 'IN_PROGRESS' : 'PENDING'
                
                sql.executeUpdate(upsertQuery, [
                    orchestrationId.toString(),
                    phase,
                    progressPercentage,
                    completed,
                    total,
                    status,
                    message,
                    new Timestamp(System.currentTimeMillis())
                ])
                
                result = [
                    success: true,
                    orchestrationId: orchestrationId.toString(),
                    phase: phase,
                    progressPercentage: progressPercentage,
                    completed: completed,
                    total: total,
                    status: status,
                    message: message
                ]
                
                log.debug("Progress tracked for ${orchestrationId} phase ${phase}: ${progressPercentage}% (${completed}/${total})")
                
            } catch (Exception e) {
                log.error("Failed to track progress for orchestration ${orchestrationId}: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Get current progress status for orchestration
     * 
     * @param orchestrationId Orchestration UUID
     * @return Map containing progress details for all phases
     */
    Map getProgressStatus(UUID orchestrationId) {
        Map progressStatus = [
            orchestrationId: orchestrationId.toString(),
            phases: [:],
            overallProgress: 0,
            status: 'UNKNOWN',
            lastUpdate: null
        ]
        
        DatabaseUtil.withSql { Sql sql ->
            String query = """
                SELECT phase_name, progress_percentage, items_processed, items_total,
                       status, message, started, completed, last_update
                FROM import_progress_tracking
                WHERE orchestration_id = ?
                ORDER BY phase_name
            """
            
            List<Integer> phaseProgressValues = []
            Timestamp latestUpdate = null
            
            sql.eachRow(query, [orchestrationId.toString()]) { row ->
                String phaseName = row['phase_name'] as String
                Integer progressPercentage = row['progress_percentage'] as Integer
                Timestamp lastUpdate = row['last_update'] as Timestamp
                
                progressStatus.phases[phaseName] = [
                    progressPercentage: progressPercentage,
                    itemsProcessed: row['items_processed'],
                    itemsTotal: row['items_total'],
                    status: row['status'],
                    message: row['message'],
                    started: row['started'],
                    completed: row['completed'],
                    lastUpdate: lastUpdate
                ]
                
                (phaseProgressValues as List) << (progressPercentage as Integer)
                
                if (latestUpdate == null || (lastUpdate && lastUpdate.after(latestUpdate))) {
                    latestUpdate = lastUpdate
                }
            }
            
            // Calculate overall progress
            if (!(phaseProgressValues as List).isEmpty()) {
                progressStatus.overallProgress = Math.round(((phaseProgressValues.sum() as Double) / (phaseProgressValues.size() as Double)) as double) as Integer
                progressStatus.lastUpdate = latestUpdate
                
                // Determine overall status
                if (phaseProgressValues.every { it == 100 }) {
                    progressStatus.status = 'COMPLETED'
                } else if (phaseProgressValues.any { it > 0 }) {
                    progressStatus.status = 'IN_PROGRESS'
                } else {
                    progressStatus.status = 'PENDING'
                }
            }
        }
        
        return progressStatus
    }
    
    /**
     * Enhanced orchestration-level rollback with detailed tracking
     * 
     * @param orchestrationId Orchestration to rollback
     * @param reason Rollback reason
     * @param userId User performing rollback
     * @return Rollback result with detailed actions
     */
    Map rollbackOrchestration(UUID orchestrationId, String reason, String userId = 'system') {
        Map rollbackResult = [
            success: false,
            orchestrationId: orchestrationId.toString(),
            reason: reason,
            executedBy: userId,
            executedAt: new Timestamp(System.currentTimeMillis()),
            rollbackActions: [],
            errors: []
        ]
        
        DatabaseUtil.withSql { Sql sql ->
            sql.withTransaction {
                try {
                    // Record rollback action initiation
                    UUID rollbackActionId = UUID.randomUUID()
                    String rollbackInsert = """
                        INSERT INTO import_rollback_actions 
                        (ira_id, orchestration_id, action_type, rollback_reason, executed_by, 
                         executed_at, success)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    """
                    
                    sql.executeInsert(rollbackInsert, [
                        rollbackActionId,
                        orchestrationId.toString(),
                        'ORCHESTRATION_ROLLBACK',
                        reason,
                        userId,
                        rollbackResult.executedAt,
                        false // Will update to true on success
                    ])
                    
                    // Get all batches associated with this orchestration
                    String batchesQuery = """
                        SELECT imb_id, imb_type, imb_source 
                        FROM import_batches 
                        WHERE orchestration_id = ? AND imb_is_active = true
                    """
                    
                    List<UUID> batchesToRollback = []
                    sql.eachRow(batchesQuery, [orchestrationId.toString()]) { row ->
                        batchesToRollback << UUID.fromString(row['imb_id'] as String)
                    }
                    
                    // Rollback each batch
                    batchesToRollback.each { batchId ->
                        boolean batchRollbackSuccess = rollbackImportBatch(batchId, "Orchestration rollback: ${reason}")
                        (rollbackResult.rollbackActions as List) << ([
                            type: 'BATCH_ROLLBACK',
                            batchId: batchId.toString(),
                            success: batchRollbackSuccess
                        ] as Map)
                        
                        if (!batchRollbackSuccess) {
                            (rollbackResult.errors as List) << ("Failed to rollback batch: ${batchId}" as String)
                        }
                    }
                    
                    // Clear staging data associated with orchestration
                    clearStagingDataForOrchestration(sql, orchestrationId)
                    (rollbackResult.rollbackActions as List) << ([
                        type: 'STAGING_CLEANUP',
                        success: true
                    ] as Map)
                    
                    // Update orchestration status
                    String orchestrationUpdate = """
                        UPDATE import_orchestrations 
                        SET status = 'ROLLED_BACK', 
                            rollback_reason = ?,
                            last_update = ?
                        WHERE orchestration_id = ?
                    """
                    sql.executeUpdate(orchestrationUpdate, [
                        reason,
                        rollbackResult.executedAt,
                        orchestrationId.toString()
                    ])
                    
                    // Update rollback action record with success
                    String rollbackUpdate = """
                        UPDATE import_rollback_actions 
                        SET success = true, 
                            rollback_details = ?::jsonb
                        WHERE ira_id = ?
                    """
                    
                    String rollbackDetails = new JsonBuilder([
                        batchesRolledBack: batchesToRollback.size(),
                        actions: rollbackResult.rollbackActions
                    ]).toString()
                    
                    sql.executeUpdate(rollbackUpdate, [rollbackDetails, rollbackActionId])
                    
                    rollbackResult.success = (rollbackResult.errors as List).isEmpty()
                    rollbackResult.batchesRolledBack = batchesToRollback.size()
                    
                    log.info("Orchestration rollback ${rollbackResult.success ? 'completed' : 'completed with errors'} for ${orchestrationId}: ${batchesToRollback.size()} batches processed")
                    
                } catch (Exception e) {
                    log.error("Orchestration rollback failed for ${orchestrationId}: ${e.message}", e)
                    (rollbackResult.errors as List) << ("Rollback transaction failed: ${e.message}" as String)
                    throw e
                }
            }
        }
        
        return rollbackResult
    }
    
    /**
     * Get rollback history for orchestration
     */
    List getRollbackHistory(UUID orchestrationId = null, Integer limit = 20) {
        List rollbackHistory = []
        
        DatabaseUtil.withSql { Sql sql ->
            String query = """
                SELECT ira_id, orchestration_id, action_type, target_phase, rollback_reason,
                       executed_by, executed_at, success, error_message, rollback_details
                FROM import_rollback_actions
                ${orchestrationId ? "WHERE orchestration_id = ?" : ""}
                ORDER BY executed_at DESC
                LIMIT ?
            """
            
            List params = orchestrationId ? [orchestrationId.toString(), limit] : [limit]
            
            sql.eachRow(query, (params as List)) { row ->
                (rollbackHistory as List) << ([
                    rollbackId: row['ira_id'].toString(),
                    orchestrationId: row['orchestration_id'],
                    actionType: row['action_type'],
                    targetPhase: row['target_phase'],
                    reason: row['rollback_reason'],
                    executedBy: row['executed_by'],
                    executedAt: row['executed_at'],
                    success: row['success'],
                    errorMessage: row['error_message'],
                    details: row['rollback_details'] ? 
                        new groovy.json.JsonSlurper().parseText(row['rollback_details'] as String) : null
                ] as Map)
            }
        }
        
        return rollbackHistory
    }
    
    /**
     * Clear staging data for specific orchestration
     */
    private void clearStagingDataForOrchestration(Sql sql, UUID orchestrationId) {
        // Clear staging steps linked to this orchestration via batches
        String clearStagingSteps = """
            DELETE FROM stg_steps 
            WHERE batch_id IN (
                SELECT imb_id FROM import_batches 
                WHERE orchestration_id = ?
            )
        """
        
        String clearStagingInstructions = """
            DELETE FROM stg_step_instructions 
            WHERE step_id IN (
                SELECT step_id FROM stg_steps 
                WHERE batch_id IN (
                    SELECT imb_id FROM import_batches 
                    WHERE orchestration_id = ?
                )
            )
        """
        
        sql.executeUpdate(clearStagingInstructions, [orchestrationId.toString()])
        sql.executeUpdate(clearStagingSteps, [orchestrationId.toString()])
        
        log.info("Cleared staging data for orchestration: ${orchestrationId}")
    }
    
    /**
     * Get entity import dependencies and validation
     */
    List getEntityDependencies() {
        List dependencies = []
        
        DatabaseUtil.withSql { Sql sql ->
            String query = """
                SELECT entity_type, depends_on, import_order, is_required, 
                       validation_query, rollback_query
                FROM import_entity_dependencies
                WHERE is_active = true
                ORDER BY import_order
            """
            
            sql.eachRow(query) { row ->
                (dependencies as List) << ([
                    entityType: row['entity_type'],
                    dependsOn: (row['depends_on'] as String)?.split(',')?.collect { (it as String).trim() },
                    importOrder: row['import_order'],
                    isRequired: row['is_required'],
                    validationQuery: row['validation_query'],
                    rollbackQuery: row['rollback_query']
                ] as Map)
            }
        }
        
        return dependencies
    }
    
    /**
     * Create orchestration batch with enhanced linking
     */
    UUID createOrchestrationBatch(Sql sql, UUID orchestrationId, String source, String importType, String userId, String entityType = null) {
        UUID batchId = UUID.randomUUID()
        Timestamp now = new Timestamp(System.currentTimeMillis())
        
        String query = """
            INSERT INTO import_batches (
                imb_id, 
                imb_source, 
                imb_type, 
                imb_status, 
                imb_user_id,
                imb_start_time, 
                imb_created_date,
                orchestration_id,
                entity_type,
                imb_is_active
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """
        
        sql.executeInsert(query, [
            batchId,
            source,
            importType,
            'IN_PROGRESS',
            userId,
            now,
            now,
            orchestrationId.toString(),
            entityType,
            true
        ])
        
        log.info("Created orchestration batch: ${batchId} for orchestration: ${orchestrationId}, entity: ${entityType}")
        return batchId
    }
}