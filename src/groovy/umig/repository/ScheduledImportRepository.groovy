package umig.repository

import groovy.sql.Sql
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import umig.utils.DatabaseUtil
import java.sql.Timestamp
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.time.LocalDateTime
import java.time.ZoneId
import java.time.temporal.ChronoUnit

/**
 * Repository for Scheduled Import Management
 * 
 * Handles the stg_scheduled_import_schedules_sis and stg_schedule_execution_history_seh 
 * tables to manage scheduled and recurring import operations for US-034 Data Import Strategy.
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 2
 */
class ScheduledImportRepository {
    
    private static final Logger log = LoggerFactory.getLogger(ScheduledImportRepository.class)
    private static final JsonSlurper jsonSlurper = new JsonSlurper()
    
    /**
     * Create a new scheduled import operation
     * 
     * @param scheduleName Descriptive name for the schedule
     * @param scheduleDescription Optional description
     * @param scheduledTime When to execute the import
     * @param recurring Whether this is a recurring schedule
     * @param recurringPattern Cron-like pattern for recurring schedules
     * @param importConfiguration Import configuration as Map
     * @param createdBy User creating the schedule
     * @param priority Priority level (1-20)
     * @return Schedule creation result
     */
    Map createSchedule(String scheduleName, String scheduleDescription, 
                      Timestamp scheduledTime, Boolean recurring = false,
                      String recurringPattern = null, Map importConfiguration = [:],
                      String createdBy, Integer priority = 5) {
        
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Calculate next execution time
                Timestamp nextExecution = calculateNextExecution(scheduledTime, recurring, recurringPattern)
                
                String insertQuery = """
                    INSERT INTO stg_scheduled_import_schedules_sis (
                        sis_schedule_name, sis_schedule_description, sis_scheduled_time,
                        sis_recurring, sis_recurring_pattern, sis_import_configuration,
                        sis_created_by, sis_priority, sis_next_execution, sis_status
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
                """
                
                String configJson = new JsonBuilder(importConfiguration).toString()
                
                sql.executeUpdate(insertQuery, [
                    scheduleName, scheduleDescription, scheduledTime,
                    recurring, recurringPattern, configJson,
                    createdBy, priority, nextExecution
                ])
                
                // Get the generated schedule ID
                String selectIdQuery = """
                    SELECT sis_id FROM stg_scheduled_import_schedules_sis
                    WHERE sis_schedule_name = ? AND sis_created_by = ?
                    ORDER BY sis_created_date DESC LIMIT 1
                """
                
                def row = sql.firstRow(selectIdQuery, [scheduleName, createdBy])
                
                result.success = true
                result.scheduleId = row?.getProperty('sis_id') as Integer
                result.scheduleName = scheduleName
                result.nextExecution = nextExecution
                result.recurring = recurring
                
                log.info("Created schedule '${scheduleName}' (ID: ${row?.getProperty('sis_id') as Integer}) by ${createdBy}")
                
            } catch (Exception e) {
                log.error("Failed to create schedule '${scheduleName}': ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Get schedules that are ready for execution
     * 
     * @param maxResults Maximum number of schedules to return
     * @return List of schedules ready for execution
     */
    List<Map> getSchedulesReadyForExecution(Integer maxResults = 10) {
        List<Map> schedules = []
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                String query = """
                    SELECT sis_id, sis_schedule_name, sis_schedule_description,
                           sis_scheduled_time, sis_recurring, sis_recurring_pattern,
                           sis_import_configuration, sis_created_by, sis_priority,
                           sis_next_execution
                    FROM stg_scheduled_import_schedules_sis
                    WHERE sis_status = 'ACTIVE' 
                      AND sis_is_active = true
                      AND sis_next_execution <= ?
                    ORDER BY sis_priority ASC, sis_next_execution ASC
                    LIMIT ?
                """
                
                Timestamp now = new Timestamp(System.currentTimeMillis())
                
                sql.eachRow(query, [now, maxResults]) { row ->
                    schedules << [
                        scheduleId: row.getProperty('sis_id') as Integer,
                        scheduleName: row.getProperty('sis_schedule_name') as String,
                        scheduleDescription: row.getProperty('sis_schedule_description') as String,
                        scheduledTime: row.getProperty('sis_scheduled_time') as Timestamp,
                        recurring: row.getProperty('sis_recurring') as Boolean,
                        recurringPattern: row.getProperty('sis_recurring_pattern') as String,
                        importConfiguration: jsonSlurper.parseText(row.getProperty('sis_import_configuration') as String),
                        createdBy: row.getProperty('sis_created_by') as String,
                        priority: row.getProperty('sis_priority') as Integer,
                        nextExecution: row.getProperty('sis_next_execution') as Timestamp
                    ]
                }
                
            } catch (Exception e) {
                log.error("Failed to get schedules ready for execution: ${e.message}", e)
            }
        }
        
        return schedules
    }
    
    /**
     * Mark a schedule as being executed and log the execution start
     * 
     * @param scheduleId Schedule ID to execute
     * @param executionId Unique execution identifier
     * @param executedBy Worker or system executing the schedule
     * @return Execution start result
     */
    Map startScheduleExecution(Integer scheduleId, UUID executionId, String executedBy) {
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                Timestamp now = new Timestamp(System.currentTimeMillis())
                
                // Update schedule status to EXECUTING
                String updateScheduleQuery = """
                    UPDATE stg_scheduled_import_schedules_sis
                    SET sis_status = 'EXECUTING',
                        sis_last_executed = ?,
                        sis_last_modified_date = ?
                    WHERE sis_id = ? AND sis_status = 'ACTIVE'
                """
                
                int updated = sql.executeUpdate(updateScheduleQuery, [now, now, scheduleId])
                
                if (updated > 0) {
                    // Log execution start
                    String insertHistoryQuery = """
                        INSERT INTO stg_schedule_execution_history_seh (
                            seh_execution_id, sis_id, seh_started_at, seh_status,
                            seh_executed_by
                        ) VALUES (?, ?, ?, 'RUNNING', ?)
                    """
                    
                    sql.executeUpdate(insertHistoryQuery, [executionId, scheduleId, now, executedBy])
                    
                    result.success = true
                    result.scheduleId = scheduleId
                    result.executionId = executionId
                    result.startedAt = now
                    result.executedBy = executedBy
                    
                    log.info("Started execution of schedule ${scheduleId} with ID ${executionId}")
                } else {
                    result.error = "Schedule ${scheduleId} not found or not in ACTIVE status"
                }
                
            } catch (Exception e) {
                log.error("Failed to start execution of schedule ${scheduleId}: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Complete a schedule execution and update next execution time
     * 
     * @param executionId Execution identifier
     * @param status Final status (COMPLETED, FAILED)
     * @param importResults Results from the import operation
     * @param errorMessage Optional error message for failed executions
     * @return Completion result
     */
    Map completeScheduleExecution(UUID executionId, String status, 
                                 Map importResults = null, String errorMessage = null) {
        
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                Timestamp now = new Timestamp(System.currentTimeMillis())
                
                // Update execution history
                String updateHistoryQuery = """
                    UPDATE stg_schedule_execution_history_seh
                    SET seh_completed_at = ?,
                        seh_status = ?,
                        seh_import_results = ?,
                        seh_error_message = ?
                    WHERE seh_execution_id = ?
                """
                
                String resultsJson = importResults ? new JsonBuilder(importResults).toString() : null
                
                sql.executeUpdate(updateHistoryQuery, [
                    now, status, resultsJson, errorMessage, executionId
                ])
                
                // Get schedule details for next execution calculation
                String selectScheduleQuery = """
                    SELECT sis.sis_id, sis.sis_recurring, sis.sis_recurring_pattern,
                           sis.sis_scheduled_time
                    FROM stg_schedule_execution_history_seh seh
                    JOIN stg_scheduled_import_schedules_sis sis ON seh.sis_id = sis.sis_id
                    WHERE seh.seh_execution_id = ?
                """
                
                def scheduleRow = sql.firstRow(selectScheduleQuery, [executionId])
                
                if (scheduleRow) {
                    Integer scheduleId = scheduleRow.getProperty('sis_id') as Integer
                    Boolean recurring = scheduleRow.getProperty('sis_recurring') as Boolean
                    
                    if (recurring) {
                        // Calculate next execution time for recurring schedules
                        Timestamp nextExecution = calculateNextExecution(
                            scheduleRow.getProperty('sis_scheduled_time') as Timestamp,
                            recurring,
                            scheduleRow.getProperty('sis_recurring_pattern') as String
                        )
                        
                        String updateScheduleQuery = """
                            UPDATE stg_scheduled_import_schedules_sis
                            SET sis_status = 'ACTIVE',
                                sis_next_execution = ?,
                                sis_execution_count = COALESCE(sis_execution_count, 0) + 1,
                                sis_last_modified_date = ?
                            WHERE sis_id = ?
                        """
                        
                        sql.executeUpdate(updateScheduleQuery, [nextExecution, now, scheduleId])
                        
                        result.nextExecution = nextExecution
                    } else {
                        // Mark one-time schedule as completed
                        String updateScheduleQuery = """
                            UPDATE stg_scheduled_import_schedules_sis
                            SET sis_status = 'COMPLETED',
                                sis_execution_count = COALESCE(sis_execution_count, 0) + 1,
                                sis_last_modified_date = ?
                            WHERE sis_id = ?
                        """
                        
                        sql.executeUpdate(updateScheduleQuery, [now, scheduleId])
                    }
                    
                    result.success = true
                    result.executionId = executionId
                    result.scheduleId = scheduleId
                    result.status = status
                    result.recurring = recurring
                    
                    log.info("Completed execution ${executionId} with status ${status}")
                } else {
                    result.error = "Execution ${executionId} not found"
                }
                
            } catch (Exception e) {
                log.error("Failed to complete execution ${executionId}: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Get execution history for a specific schedule
     * 
     * @param scheduleId Schedule ID to get history for
     * @param limit Maximum number of executions to return
     * @return List of execution history records
     */
    List<Map> getScheduleExecutionHistory(Integer scheduleId, Integer limit = 50) {
        List<Map> history = []
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                String query = """
                    SELECT seh_execution_id, seh_started_at, seh_completed_at,
                           seh_status, seh_executed_by, seh_import_results,
                           seh_error_message
                    FROM stg_schedule_execution_history_seh
                    WHERE sis_id = ?
                    ORDER BY seh_started_at DESC
                    LIMIT ?
                """
                
                sql.eachRow(query, [scheduleId, limit]) { row ->
                    Map execution = [
                        executionId: row.getProperty('seh_execution_id') as UUID,
                        startedAt: row.getProperty('seh_started_at') as Timestamp,
                        completedAt: row.getProperty('seh_completed_at') as Timestamp,
                        status: row.getProperty('seh_status') as String,
                        executedBy: row.getProperty('seh_executed_by') as String,
                        errorMessage: row.getProperty('seh_error_message') as String
                    ]
                    
                    def importResultsValue = row.getProperty('seh_import_results')
                    if (importResultsValue) {
                        execution.importResults = jsonSlurper.parseText(importResultsValue as String) as Map
                    }
                    
                    history << execution
                }
                
            } catch (Exception e) {
                log.error("Failed to get execution history for schedule ${scheduleId}: ${e.message}", e)
            }
        }
        
        return history
    }
    
    /**
     * Update a schedule configuration
     * 
     * @param scheduleId Schedule to update
     * @param updates Map of field updates
     * @param updatedBy User making the update
     * @return Update result
     */
    Map updateSchedule(Integer scheduleId, Map updates, String updatedBy) {
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                List<String> setParts = []
                List<Object> parameters = []
                
                // Build dynamic update query based on provided updates
                if (updates.scheduleName) {
                    setParts << "sis_schedule_name = ?"
                    parameters << updates.scheduleName
                }
                
                if (updates.scheduleDescription) {
                    setParts << "sis_schedule_description = ?"
                    parameters << updates.scheduleDescription
                }
                
                if (updates.scheduledTime) {
                    setParts << "sis_scheduled_time = ?"
                    parameters << updates.scheduledTime
                    
                    // Recalculate next execution
                    String recurringPattern = null
                    Boolean recurring = false
                    
                    // Get current recurring settings if not updating them
                    if (!updates.containsKey('recurring') || !updates.containsKey('recurringPattern')) {
                        String selectQuery = "SELECT sis_recurring, sis_recurring_pattern FROM stg_scheduled_import_schedules_sis WHERE sis_id = ?"
                        def existingRow = sql.firstRow(selectQuery, [scheduleId])
                        if (existingRow) {
                            recurring = updates.recurring ?: (existingRow.getProperty('sis_recurring') as Boolean)
                            recurringPattern = updates.recurringPattern ?: (existingRow.getProperty('sis_recurring_pattern') as String)
                        }
                    }
                    
                    Timestamp nextExecution = calculateNextExecution(
                        updates.scheduledTime as Timestamp, recurring, recurringPattern
                    )
                    setParts << "sis_next_execution = ?"
                    parameters << nextExecution
                }
                
                if (updates.containsKey('recurring')) {
                    setParts << "sis_recurring = ?"
                    parameters << updates.recurring
                }
                
                if (updates.recurringPattern) {
                    setParts << "sis_recurring_pattern = ?"
                    parameters << updates.recurringPattern
                }
                
                if (updates.importConfiguration) {
                    setParts << "sis_import_configuration = ?"
                    parameters << new JsonBuilder(updates.importConfiguration).toString()
                }
                
                if (updates.priority) {
                    setParts << "sis_priority = ?"
                    parameters << updates.priority
                }
                
                if (updates.status) {
                    setParts << "sis_status = ?"
                    parameters << updates.status
                }
                
                if (!setParts.isEmpty()) {
                    setParts << "sis_last_modified_date = ?"
                    parameters << new Timestamp(System.currentTimeMillis())
                    parameters << scheduleId
                    
                    String updateQuery = """
                        UPDATE stg_scheduled_import_schedules_sis
                        SET ${setParts.join(', ')}
                        WHERE sis_id = ?
                    """
                    
                    int updated = sql.executeUpdate(updateQuery, parameters)
                    
                    if (updated > 0) {
                        result.success = true
                        result.scheduleId = scheduleId
                        result.updatedFields = updates.keySet()
                        result.updatedBy = updatedBy
                        
                        log.info("Updated schedule ${scheduleId} by ${updatedBy}")
                    } else {
                        result.error = "Schedule ${scheduleId} not found"
                    }
                } else {
                    result.error = "No valid update fields provided"
                }
                
            } catch (Exception e) {
                log.error("Failed to update schedule ${scheduleId}: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Delete a schedule (marks as inactive)
     * 
     * @param scheduleId Schedule to delete
     * @param deletedBy User performing the deletion
     * @return Deletion result
     */
    Map deleteSchedule(Integer scheduleId, String deletedBy) {
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                String updateQuery = """
                    UPDATE stg_scheduled_import_schedules_sis
                    SET sis_is_active = false,
                        sis_status = 'DELETED',
                        sis_last_modified_date = ?
                    WHERE sis_id = ?
                """
                
                Timestamp now = new Timestamp(System.currentTimeMillis())
                int updated = sql.executeUpdate(updateQuery, [now, scheduleId])
                
                if (updated > 0) {
                    result.success = true
                    result.scheduleId = scheduleId
                    result.deletedBy = deletedBy
                    result.deletedAt = now
                    
                    log.info("Deleted schedule ${scheduleId} by ${deletedBy}")
                } else {
                    result.error = "Schedule ${scheduleId} not found"
                }
                
            } catch (Exception e) {
                log.error("Failed to delete schedule ${scheduleId}: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Get schedule statistics and health metrics
     * 
     * @return Schedule statistics
     */
    Map getScheduleStatistics() {
        Map result = [:]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                String statsQuery = """
                    SELECT 
                        COUNT(*) FILTER (WHERE sis_status = 'ACTIVE' AND sis_is_active = true) as active_schedules,
                        COUNT(*) FILTER (WHERE sis_status = 'EXECUTING') as executing_schedules,
                        COUNT(*) FILTER (WHERE sis_status = 'COMPLETED') as completed_schedules,
                        COUNT(*) FILTER (WHERE sis_recurring = true AND sis_is_active = true) as recurring_schedules,
                        COUNT(*) FILTER (WHERE sis_next_execution <= NOW()) as overdue_schedules
                    FROM stg_scheduled_import_schedules_sis
                """
                
                def row = sql.firstRow(statsQuery)
                result.statistics = [
                    activeSchedules: row?.getProperty('active_schedules') as Integer ?: 0,
                    executingSchedules: row?.getProperty('executing_schedules') as Integer ?: 0,
                    completedSchedules: row?.getProperty('completed_schedules') as Integer ?: 0,
                    recurringSchedules: row?.getProperty('recurring_schedules') as Integer ?: 0,
                    overdueSchedules: row?.getProperty('overdue_schedules') as Integer ?: 0
                ]
                
                // Execution statistics
                String execStatsQuery = """
                    SELECT 
                        COUNT(*) as total_executions,
                        COUNT(*) FILTER (WHERE seh_status = 'COMPLETED') as successful_executions,
                        COUNT(*) FILTER (WHERE seh_status = 'FAILED') as failed_executions,
                        AVG(EXTRACT(EPOCH FROM (seh_completed_at - seh_started_at))/60) as avg_execution_minutes
                    FROM stg_schedule_execution_history_seh
                    WHERE seh_started_at >= NOW() - INTERVAL '7 days'
                """
                
                def execRow = sql.firstRow(execStatsQuery)
                result.executionStatistics = [
                    totalExecutions: execRow?.getProperty('total_executions') as Integer ?: 0,
                    successfulExecutions: execRow?.getProperty('successful_executions') as Integer ?: 0,
                    failedExecutions: execRow?.getProperty('failed_executions') as Integer ?: 0,
                    averageExecutionMinutes: Math.round(((execRow?.getProperty('avg_execution_minutes') as Double) ?: 0.0) * 10) / 10.0
                ]
                
            } catch (Exception e) {
                log.error("Failed to get schedule statistics: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Get schedules filtered by user with pagination and status filtering
     * 
     * @param userId User ID to filter by (null for all users)
     * @param limit Maximum number of schedules to return
     * @param activeOnly Whether to return only active schedules
     * @return List of schedules matching the criteria
     */
    List<Map> getSchedulesByUser(String userId, Integer limit = 50, Boolean activeOnly = true) {
        List<Map> schedules = []
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                String whereClause = "WHERE sis_is_active = true"
                List<Object> parameters = []
                
                if (activeOnly) {
                    whereClause += " AND sis_status = 'ACTIVE'"
                }
                
                if (userId) {
                    whereClause += " AND sis_created_by = ?"
                    parameters << userId
                }
                
                String query = """
                    SELECT sis_id, sis_schedule_name, sis_schedule_description,
                           sis_scheduled_time, sis_recurring, sis_recurring_pattern,
                           sis_import_configuration, sis_created_by, sis_priority,
                           sis_next_execution, sis_status, sis_execution_count,
                           sis_last_executed, sis_created_date
                    FROM stg_scheduled_import_schedules_sis
                    ${whereClause}
                    ORDER BY sis_created_date DESC
                    LIMIT ?
                """
                
                parameters << limit
                
                sql.eachRow(query, parameters) { row ->
                    Map schedule = [
                        scheduleId: row.getProperty('sis_id') as Integer,
                        scheduleName: row.getProperty('sis_schedule_name') as String,
                        scheduleDescription: row.getProperty('sis_schedule_description') as String,
                        scheduledTime: row.getProperty('sis_scheduled_time') as Timestamp,
                        recurring: row.getProperty('sis_recurring') as Boolean,
                        recurringPattern: row.getProperty('sis_recurring_pattern') as String,
                        createdBy: row.getProperty('sis_created_by') as String,
                        priority: row.getProperty('sis_priority') as Integer,
                        nextExecution: row.getProperty('sis_next_execution') as Timestamp,
                        status: row.getProperty('sis_status') as String,
                        executionCount: row.getProperty('sis_execution_count') as Integer ?: 0,
                        lastExecuted: row.getProperty('sis_last_executed') as Timestamp,
                        createdDate: row.getProperty('sis_created_date') as Timestamp
                    ]
                    
                    // Parse import configuration
                    def configValue = row.getProperty('sis_import_configuration')
                    if (configValue) {
                        try {
                            schedule.importConfiguration = jsonSlurper.parseText(configValue as String) as Map
                        } catch (Exception e) {
                            log.warn("Failed to parse import configuration for schedule ${schedule.scheduleId}: ${e.message}")
                            schedule.importConfiguration = [:] as Map
                        }
                    } else {
                        schedule.importConfiguration = [:] as Map
                    }
                    
                    schedules << schedule
                }
                
            } catch (Exception e) {
                log.error("Failed to get schedules by user ${userId}: ${e.message}", e)
            }
        }
        
        return schedules
    }
    
    // ====== PRIVATE HELPER METHODS ======
    
    private Timestamp calculateNextExecution(Timestamp scheduledTime, Boolean recurring, String recurringPattern) {
        if (!recurring || !recurringPattern) {
            return scheduledTime
        }
        
        // Simple cron pattern support - extend as needed
        LocalDateTime now = LocalDateTime.now()
        LocalDateTime scheduled = scheduledTime.toLocalDateTime()
        
        // Basic patterns - extend for full cron support
        switch (recurringPattern.toLowerCase()) {
            case 'daily':
                return Timestamp.valueOf(scheduled.plusDays(1))
            case 'weekly':
                return Timestamp.valueOf(scheduled.plusWeeks(1))
            case 'monthly':
                return Timestamp.valueOf(scheduled.plusMonths(1))
            case 'hourly':
                return Timestamp.valueOf(scheduled.plusHours(1))
            default:
                // For complex cron patterns, implement full cron parser
                log.warn("Unsupported recurring pattern: ${recurringPattern}, using daily")
                return Timestamp.valueOf(scheduled.plusDays(1))
        }
    }
}