package umig.repository

import groovy.sql.Sql
import groovy.sql.GroovyResultSet
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import umig.utils.DatabaseUtil
import java.sql.Timestamp
import org.slf4j.Logger
import org.slf4j.LoggerFactory

/**
 * Repository for Import Queue Management operations
 * 
 * Handles the stg_import_queue_management_iqm table to manage concurrent import requests,
 * priority queuing, and resource coordination for US-034 Data Import Strategy.
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 2
 */
class ImportQueueManagementRepository {
    
    private static final Logger log = LoggerFactory.getLogger(ImportQueueManagementRepository.class)
    private static final JsonSlurper jsonSlurper = new JsonSlurper()
    
    /**
     * Queue a new import request with priority and resource requirements
     * 
     * @param requestId Unique request identifier
     * @param importType Type of import (CSV, JSON, BULK, etc.)
     * @param requestedBy User ID requesting the import
     * @param priority Priority level (1-20, where 1 is highest)
     * @param configuration Import configuration as Map
     * @param resourceRequirements Resource requirements as Map (optional)
     * @param estimatedDuration Estimated duration in minutes (optional)
     * @return Queue entry result with position information
     */
    Map queueImportRequest(UUID requestId, String importType, String requestedBy, 
                          Integer priority = 5, Map configuration = [:], 
                          Map resourceRequirements = null, Integer estimatedDuration = null) {
        
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Calculate queue position
                Integer queuePosition = calculateQueuePosition(sql, priority)
                
                String insertQuery = """
                    INSERT INTO stg_import_queue_management_iqm (
                        iqm_request_id, iqm_priority, iqm_status, iqm_import_type,
                        iqm_requested_by, iqm_requested_at, iqm_estimated_duration,
                        iqm_resource_requirements, iqm_configuration, iqm_queue_position
                    ) VALUES (?, ?, 'QUEUED', ?, ?, ?, ?, ?, ?, ?)
                """
                
                String configJson = new JsonBuilder(configuration).toString()
                String resourceJson = resourceRequirements ? new JsonBuilder(resourceRequirements).toString() : null
                Timestamp now = new Timestamp(System.currentTimeMillis())
                
                sql.executeUpdate(insertQuery, [
                    requestId, priority, importType, requestedBy, now,
                    estimatedDuration, resourceJson, configJson, queuePosition
                ])
                
                result.success = true
                result.requestId = requestId
                result.queuePosition = queuePosition
                result.estimatedWaitTime = calculateEstimatedWaitTime(sql, queuePosition)
                
                log.info("Queued import request ${requestId} for user ${requestedBy} at position ${queuePosition}")
                
            } catch (Exception e) {
                log.error("Failed to queue import request ${requestId}: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Get the next highest priority queued import request
     * 
     * @param assignToWorker Worker identifier to assign the request to
     * @return Next queued import request or null if queue is empty
     */
    Map getNextQueuedRequest(String assignToWorker) {
        Map result = null
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Get highest priority queued request
                String selectQuery = """
                    SELECT iqm_id, iqm_request_id, iqm_priority, iqm_import_type,
                           iqm_requested_by, iqm_requested_at, iqm_estimated_duration,
                           iqm_resource_requirements, iqm_configuration
                    FROM stg_import_queue_management_iqm
                    WHERE iqm_status = 'QUEUED' AND iqm_is_active = true
                    ORDER BY iqm_priority ASC, iqm_requested_at ASC
                    LIMIT 1
                """
                
                def row = sql.firstRow(selectQuery)
                if (row) {
                    // Update status to PROCESSING and assign worker
                    String updateQuery = """
                        UPDATE stg_import_queue_management_iqm 
                        SET iqm_status = 'PROCESSING',
                            iqm_assigned_worker = ?,
                            iqm_started_at = ?,
                            iqm_last_modified_date = ?
                        WHERE iqm_id = ?
                    """
                    
                    Timestamp now = new Timestamp(System.currentTimeMillis())
                    sql.executeUpdate(updateQuery, [assignToWorker, now, now, row.getProperty('iqm_id')])
                    
                    result = [
                        id: row.getProperty('iqm_id') as Long,
                        requestId: row.getProperty('iqm_request_id'),
                        priority: row.getProperty('iqm_priority') as Integer,
                        importType: row.getProperty('iqm_import_type') as String,
                        requestedBy: row.getProperty('iqm_requested_by') as String,
                        requestedAt: row.getProperty('iqm_requested_at'),
                        estimatedDuration: row.getProperty('iqm_estimated_duration') as Integer,
                        resourceRequirements: row.getProperty('iqm_resource_requirements') ? 
                            jsonSlurper.parseText(row.getProperty('iqm_resource_requirements') as String) : null,
                        configuration: jsonSlurper.parseText(row.getProperty('iqm_configuration') as String),
                        assignedWorker: assignToWorker,
                        startedAt: now
                    ]
                    
                    log.info("Assigned queued request ${row.getProperty('iqm_request_id')} to worker ${assignToWorker}")
                }
                
            } catch (Exception e) {
                log.error("Failed to get next queued request: ${e.message}", e)
            }
        }
        
        return result
    }
    
    /**
     * Update import request status
     * 
     * @param requestId Request identifier
     * @param status New status (QUEUED, PROCESSING, COMPLETED, FAILED, CANCELLED)
     * @param error Optional error message for failed requests
     * @return Update result
     */
    Map updateRequestStatus(UUID requestId, String status, String error = null) {
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                String updateQuery = """
                    UPDATE stg_import_queue_management_iqm 
                    SET iqm_status = ?, iqm_last_modified_date = ?
                    WHERE iqm_request_id = ?
                """
                
                Timestamp now = new Timestamp(System.currentTimeMillis())
                int updated = sql.executeUpdate(updateQuery, [status, now, requestId])
                
                if (updated > 0) {
                    result.success = true
                    result.requestId = requestId
                    result.status = status
                    
                    // Update queue positions for remaining queued items
                    if (status in ['COMPLETED', 'FAILED', 'CANCELLED']) {
                        recalculateQueuePositions(sql)
                    }
                    
                    log.info("Updated request ${requestId} status to ${status}")
                } else {
                    result.error = "Request ${requestId} not found"
                }
                
            } catch (Exception e) {
                log.error("Failed to update request ${requestId} status: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Get current queue status and statistics
     * 
     * @return Queue statistics and active requests
     */
    Map getQueueStatus() {
        Map result = [:]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Get queue statistics
                String statsQuery = """
                    SELECT 
                        COUNT(*) FILTER (WHERE iqm_status = 'QUEUED') as queued_count,
                        COUNT(*) FILTER (WHERE iqm_status = 'PROCESSING') as processing_count,
                        COUNT(*) FILTER (WHERE iqm_status = 'COMPLETED') as completed_count,
                        COUNT(*) FILTER (WHERE iqm_status = 'FAILED') as failed_count,
                        AVG(iqm_estimated_duration) FILTER (WHERE iqm_status = 'QUEUED') as avg_estimated_duration
                    FROM stg_import_queue_management_iqm
                    WHERE iqm_is_active = true AND iqm_requested_at >= NOW() - INTERVAL '24 hours'
                """
                
                def statsRow = sql.firstRow(statsQuery)
                result.statistics = [
                    queued: (statsRow?.getProperty('queued_count') ?: 0) as Integer,
                    processing: (statsRow?.getProperty('processing_count') ?: 0) as Integer,
                    completed: (statsRow?.getProperty('completed_count') ?: 0) as Integer,
                    failed: (statsRow?.getProperty('failed_count') ?: 0) as Integer,
                    averageEstimatedDuration: (statsRow?.getProperty('avg_estimated_duration') ?: 0) as Double
                ]
                
                // Get current queue
                String queueQuery = """
                    SELECT iqm_request_id, iqm_priority, iqm_import_type, iqm_requested_by,
                           iqm_requested_at, iqm_queue_position, iqm_estimated_duration
                    FROM stg_import_queue_management_iqm
                    WHERE iqm_status = 'QUEUED' AND iqm_is_active = true
                    ORDER BY iqm_priority ASC, iqm_requested_at ASC
                """
                
                result.queue = [] as List
                sql.eachRow(queueQuery) { row ->
                    Map queueItem = [
                        requestId: row.getProperty('iqm_request_id'),
                        priority: row.getProperty('iqm_priority') as Integer,
                        importType: row.getProperty('iqm_import_type') as String,
                        requestedBy: row.getProperty('iqm_requested_by') as String,
                        requestedAt: row.getProperty('iqm_requested_at'),
                        queuePosition: row.getProperty('iqm_queue_position') as Integer,
                        estimatedDuration: row.getProperty('iqm_estimated_duration') as Integer
                    ]
                    (result.queue as List).add(queueItem)
                }
                
            } catch (Exception e) {
                log.error("Failed to get queue status: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Cancel a queued import request
     * 
     * @param requestId Request to cancel
     * @param cancelledBy User cancelling the request
     * @return Cancellation result
     */
    Map cancelRequest(UUID requestId, String cancelledBy) {
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Only allow cancellation of queued requests
                String updateQuery = """
                    UPDATE stg_import_queue_management_iqm 
                    SET iqm_status = 'CANCELLED', iqm_last_modified_date = ?
                    WHERE iqm_request_id = ? AND iqm_status = 'QUEUED'
                """
                
                Timestamp now = new Timestamp(System.currentTimeMillis())
                int updated = sql.executeUpdate(updateQuery, [now, requestId])
                
                if (updated > 0) {
                    result.success = true
                    result.requestId = requestId
                    result.cancelledBy = cancelledBy
                    
                    // Recalculate queue positions
                    recalculateQueuePositions(sql)
                    
                    log.info("Cancelled request ${requestId} by user ${cancelledBy}")
                } else {
                    result.error = "Request ${requestId} not found or not in QUEUED status"
                }
                
            } catch (Exception e) {
                log.error("Failed to cancel request ${requestId}: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Get comprehensive queue statistics for monitoring and reporting
     * 
     * @return Queue statistics including performance metrics
     */
    Map getQueueStatistics() {
        Map result = [:]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Get current queue metrics
                String currentStatsQuery = """
                    SELECT 
                        COUNT(*) FILTER (WHERE iqm_status = 'QUEUED') as queued_count,
                        COUNT(*) FILTER (WHERE iqm_status = 'PROCESSING') as processing_count,
                        COUNT(*) FILTER (WHERE iqm_status = 'COMPLETED') as completed_today,
                        COUNT(*) FILTER (WHERE iqm_status = 'FAILED') as failed_today,
                        COUNT(*) FILTER (WHERE iqm_status = 'CANCELLED') as cancelled_today,
                        AVG(iqm_estimated_duration) FILTER (WHERE iqm_status = 'QUEUED') as avg_estimated_duration,
                        MIN(iqm_requested_at) FILTER (WHERE iqm_status = 'QUEUED') as oldest_queued_request,
                        MAX(iqm_priority) FILTER (WHERE iqm_status = 'QUEUED') as highest_priority_queued
                    FROM stg_import_queue_management_iqm
                    WHERE iqm_is_active = true 
                      AND iqm_requested_at >= CURRENT_DATE
                """
                
                def currentRow = sql.firstRow(currentStatsQuery)
                
                // Get historical performance metrics (last 7 days)
                String performanceQuery = """
                    SELECT 
                        COUNT(*) as total_requests,
                        COUNT(*) FILTER (WHERE iqm_status = 'COMPLETED') as successful_requests,
                        COUNT(*) FILTER (WHERE iqm_status = 'FAILED') as failed_requests,
                        AVG(EXTRACT(EPOCH FROM (iqm_completed_at - iqm_started_at))/60) FILTER (WHERE iqm_completed_at IS NOT NULL) as avg_processing_minutes,
                        AVG(iqm_priority) as avg_priority
                    FROM stg_import_queue_management_iqm
                    WHERE iqm_requested_at >= NOW() - INTERVAL '7 days'
                      AND iqm_is_active = true
                """
                
                def perfRow = sql.firstRow(performanceQuery)
                
                // Get queue position analysis
                String positionQuery = """
                    SELECT 
                        iqm_queue_position,
                        COUNT(*) as requests_at_position
                    FROM stg_import_queue_management_iqm
                    WHERE iqm_status = 'QUEUED' AND iqm_is_active = true
                    GROUP BY iqm_queue_position
                    ORDER BY iqm_queue_position ASC
                    LIMIT 10
                """
                
                List<Map> queuePositions = []
                sql.eachRow(positionQuery) { row ->
                    queuePositions.add([
                        position: row.getProperty('iqm_queue_position') as Integer,
                        requestCount: row.getProperty('requests_at_position') as Integer
                    ])
                }
                
                // Calculate success rate
                Integer totalRequests = perfRow?.getProperty('total_requests') as Integer ?: 0
                Integer successfulRequests = perfRow?.getProperty('successful_requests') as Integer ?: 0
                Double successRate = totalRequests > 0 ? (((successfulRequests.doubleValue() / totalRequests.doubleValue()) * 100) as Double) : (0.0 as Double)
                
                result = [
                    timestamp: new Timestamp(System.currentTimeMillis()),
                    currentQueue: [
                        totalQueued: currentRow?.getProperty('queued_count') as Integer ?: 0,
                        totalProcessing: currentRow?.getProperty('processing_count') as Integer ?: 0,
                        completedToday: currentRow?.getProperty('completed_today') as Integer ?: 0,
                        failedToday: currentRow?.getProperty('failed_today') as Integer ?: 0,
                        cancelledToday: currentRow?.getProperty('cancelled_today') as Integer ?: 0,
                        averageEstimatedDuration: Math.round(((currentRow?.getProperty('avg_estimated_duration') as Double) ?: 0.0) * 10) / 10.0,
                        oldestQueuedRequest: currentRow?.getProperty('oldest_queued_request') as Timestamp,
                        highestPriorityQueued: currentRow?.getProperty('highest_priority_queued') as Integer
                    ],
                    performanceMetrics: [
                        totalRequestsLast7Days: totalRequests,
                        successfulRequests: successfulRequests,
                        failedRequests: perfRow?.getProperty('failed_requests') as Integer ?: 0,
                        successRate: Math.round(successRate * 10) / 10.0,
                        averageProcessingMinutes: Math.round(((perfRow?.getProperty('avg_processing_minutes') as Double) ?: 0.0) * 10) / 10.0,
                        averagePriority: Math.round(((perfRow?.getProperty('avg_priority') as Double) ?: 5.0) * 10) / 10.0
                    ],
                    queuePositionAnalysis: queuePositions,
                    systemHealth: determineQueueHealth(currentRow, perfRow)
                ]
                
            } catch (Exception e) {
                log.error("Failed to get queue statistics: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    // ====== PRIVATE HELPER METHODS ======
    
    private String determineQueueHealth(groovy.sql.GroovyRowResult currentRow, groovy.sql.GroovyRowResult perfRow) {
        Integer queuedCount = currentRow?.getProperty('queued_count') as Integer ?: 0
        Integer processingCount = currentRow?.getProperty('processing_count') as Integer ?: 0
        Integer failedToday = currentRow?.getProperty('failed_today') as Integer ?: 0
        
        if (queuedCount > 20) return "OVERLOADED"
        if (failedToday > 5) return "UNSTABLE"
        if (queuedCount > 10) return "BUSY"
        if (processingCount > 5) return "BUSY"
        
        return "HEALTHY"
    }
    
    private Integer calculateQueuePosition(Sql sql, Integer priority) {
        String countQuery = """
            SELECT COUNT(*) + 1 as position
            FROM stg_import_queue_management_iqm
            WHERE iqm_status = 'QUEUED' AND iqm_is_active = true
            AND (iqm_priority < ? OR (iqm_priority = ? AND iqm_requested_at < ?))
        """
        
        Timestamp now = new Timestamp(System.currentTimeMillis())
        def row = sql.firstRow(countQuery, [priority, priority, now])
        return (row?.getProperty('position') ?: 1) as Integer
    }
    
    private Integer calculateEstimatedWaitTime(Sql sql, Integer queuePosition) {
        if (queuePosition <= 1) return 0
        
        String avgQuery = """
            SELECT COALESCE(AVG(iqm_estimated_duration), 15) as avg_duration
            FROM stg_import_queue_management_iqm
            WHERE iqm_status = 'PROCESSING' AND iqm_is_active = true
        """
        
        def row = sql.firstRow(avgQuery)
        Integer avgDuration = (row?.getProperty('avg_duration') ?: 15) as Integer
        return (queuePosition - 1) * avgDuration
    }
    
    private void recalculateQueuePositions(Sql sql) {
        String updateQuery = """
            UPDATE stg_import_queue_management_iqm 
            SET iqm_queue_position = subq.new_position
            FROM (
                SELECT iqm_id, ROW_NUMBER() OVER (ORDER BY iqm_priority ASC, iqm_requested_at ASC) as new_position
                FROM stg_import_queue_management_iqm
                WHERE iqm_status = 'QUEUED' AND iqm_is_active = true
            ) subq
            WHERE stg_import_queue_management_iqm.iqm_id = subq.iqm_id
        """
        
        sql.executeUpdate(updateQuery)
    }
}