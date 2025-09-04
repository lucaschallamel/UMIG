package umig.repository

import groovy.sql.Sql
import umig.utils.DatabaseUtil
import java.sql.Timestamp
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.util.concurrent.TimeUnit

/**
 * Repository for Import Resource Lock Management
 * 
 * Handles the stg_import_resource_locks_irl table to prevent resource conflicts
 * between concurrent import operations for US-034 Data Import Strategy.
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 2
 */
class ImportResourceLockRepository {
    
    private static final Logger log = LoggerFactory.getLogger(ImportResourceLockRepository.class)
    
    /**
     * Acquire a resource lock for an import operation
     * 
     * @param resourceType Type of resource (MIGRATION, ITERATION, PLAN, SEQUENCE, etc.)
     * @param resourceId Identifier of the specific resource
     * @param lockType Type of lock (EXCLUSIVE or SHARED)
     * @param requestId Import request ID from queue management
     * @param lockDurationMinutes Duration to hold the lock (default 60 minutes)
     * @return Lock acquisition result
     */
    Map acquireResourceLock(String resourceType, String resourceId, String lockType, 
                           UUID requestId, Integer lockDurationMinutes = 60) {
        
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Check for conflicting locks
                if (hasConflictingLocks(sql, resourceType, resourceId, lockType)) {
                    result.error = "Resource ${resourceType}:${resourceId} is already locked"
                    result.conflictingLocks = getConflictingLocks(sql, resourceType, resourceId)
                    return result
                }
                
                // Calculate expiration time
                Timestamp now = new Timestamp(System.currentTimeMillis())
                Timestamp expiresAt = new Timestamp(now.getTime() + TimeUnit.MINUTES.toMillis(lockDurationMinutes))
                
                // Acquire the lock
                String insertQuery = """
                    INSERT INTO stg_import_resource_locks_irl (
                        irl_resource_type, irl_resource_id, irl_lock_type,
                        irl_locked_by_request, irl_locked_at, irl_expires_at
                    ) VALUES (?, ?, ?, ?, ?, ?)
                """
                
                sql.executeUpdate(insertQuery, [
                    resourceType, resourceId, lockType, requestId, now, expiresAt
                ])
                
                result.success = true
                result.lockId = getLatestLockId(sql, requestId, resourceType, resourceId)
                result.resourceType = resourceType
                result.resourceId = resourceId
                result.lockType = lockType
                result.expiresAt = expiresAt
                result.lockedBy = requestId
                
                log.info("Acquired ${lockType} lock on ${resourceType}:${resourceId} for request ${requestId}")
                
            } catch (Exception e) {
                log.error("Failed to acquire lock on ${resourceType}:${resourceId}: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Release a specific resource lock
     * 
     * @param lockId Lock ID to release
     * @param requestId Request ID that owns the lock (for security)
     * @return Release result
     */
    Map releaseResourceLock(Integer lockId, UUID requestId) {
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                String deleteQuery = """
                    DELETE FROM stg_import_resource_locks_irl
                    WHERE irl_id = ? AND irl_locked_by_request = ?
                """
                
                int deleted = sql.executeUpdate(deleteQuery, [lockId, requestId])
                
                if (deleted > 0) {
                    result.success = true
                    result.lockId = lockId
                    result.releasedBy = requestId
                    
                    log.info("Released lock ${lockId} by request ${requestId}")
                } else {
                    result.error = "Lock ${lockId} not found or not owned by request ${requestId}"
                }
                
            } catch (Exception e) {
                log.error("Failed to release lock ${lockId}: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Release all locks held by a specific import request
     * 
     * @param requestId Request ID to release all locks for
     * @return Release result with count of locks released
     */
    Map releaseAllLocksForRequest(UUID requestId) {
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Get locks before deletion for logging
                String selectQuery = """
                    SELECT irl_id, irl_resource_type, irl_resource_id, irl_lock_type
                    FROM stg_import_resource_locks_irl
                    WHERE irl_locked_by_request = ?
                """
                
                List<Map> locksToRelease = []
                sql.eachRow(selectQuery, [requestId]) { row ->
                    locksToRelease.add([
                        id: row.getProperty('irl_id') as Integer,
                        resourceType: row.getProperty('irl_resource_type') as String,
                        resourceId: row.getProperty('irl_resource_id') as String,
                        lockType: row.getProperty('irl_lock_type') as String
                    ])
                }
                
                // Delete all locks for the request
                String deleteQuery = """
                    DELETE FROM stg_import_resource_locks_irl
                    WHERE irl_locked_by_request = ?
                """
                
                int deleted = sql.executeUpdate(deleteQuery, [requestId])
                
                result.success = true
                result.requestId = requestId
                result.locksReleased = deleted
                result.lockDetails = locksToRelease
                
                if (deleted > 0) {
                    log.info("Released ${deleted} locks for request ${requestId}")
                }
                
            } catch (Exception e) {
                log.error("Failed to release locks for request ${requestId}: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Check if a resource is currently locked
     * 
     * @param resourceType Type of resource
     * @param resourceId Resource identifier
     * @return Lock status information
     */
    Map checkResourceLockStatus(String resourceType, String resourceId) {
        Map result = [locked: false, locks: []]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Clean up expired locks first
                cleanupExpiredLocks(sql)
                
                String query = """
                    SELECT irl_id, irl_lock_type, irl_locked_by_request, 
                           irl_locked_at, irl_expires_at
                    FROM stg_import_resource_locks_irl
                    WHERE irl_resource_type = ? AND irl_resource_id = ?
                      AND irl_is_active = true AND irl_expires_at > ?
                    ORDER BY irl_locked_at ASC
                """
                
                Timestamp now = new Timestamp(System.currentTimeMillis())
                
                sql.eachRow(query, [resourceType, resourceId, now]) { row ->
                    result.locked = true
                    ((List)result.locks).add([
                        lockId: row.getProperty('irl_id') as Integer,
                        lockType: row.getProperty('irl_lock_type') as String,
                        lockedBy: row.getProperty('irl_locked_by_request') as Object,
                        lockedAt: row.getProperty('irl_locked_at') as Timestamp,
                        expiresAt: row.getProperty('irl_expires_at') as Timestamp
                    ])
                }
                
            } catch (Exception e) {
                log.error("Failed to check lock status for ${resourceType}:${resourceId}: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Get all active locks for a specific import request
     * 
     * @param requestId Import request ID
     * @return List of active locks
     */
    List<Map> getActiveLocksForRequest(UUID requestId) {
        List<Map> locks = []
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                String query = """
                    SELECT irl_id, irl_resource_type, irl_resource_id, irl_lock_type,
                           irl_locked_at, irl_expires_at
                    FROM stg_import_resource_locks_irl
                    WHERE irl_locked_by_request = ? 
                      AND irl_is_active = true 
                      AND irl_expires_at > ?
                    ORDER BY irl_locked_at ASC
                """
                
                Timestamp now = new Timestamp(System.currentTimeMillis())
                
                sql.eachRow(query, [requestId, now]) { row ->
                    locks.add([
                        lockId: row.getProperty('irl_id') as Integer,
                        resourceType: row.getProperty('irl_resource_type') as String,
                        resourceId: row.getProperty('irl_resource_id') as String,
                        lockType: row.getProperty('irl_lock_type') as String,
                        lockedAt: row.getProperty('irl_locked_at') as Timestamp,
                        expiresAt: row.getProperty('irl_expires_at') as Timestamp
                    ])
                }
                
            } catch (Exception e) {
                log.error("Failed to get locks for request ${requestId}: ${e.message}", e)
            }
        }
        
        return locks
    }
    
    /**
     * Extend the duration of a specific lock
     * 
     * @param lockId Lock ID to extend
     * @param requestId Request ID that owns the lock
     * @param additionalMinutes Additional minutes to extend the lock
     * @return Extension result
     */
    Map extendLockDuration(Integer lockId, UUID requestId, Integer additionalMinutes) {
        Map result = [success: false]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                String updateQuery = """
                    UPDATE stg_import_resource_locks_irl
                    SET irl_expires_at = irl_expires_at + INTERVAL '${additionalMinutes} minutes'
                    WHERE irl_id = ? AND irl_locked_by_request = ?
                      AND irl_is_active = true AND irl_expires_at > ?
                """
                
                Timestamp now = new Timestamp(System.currentTimeMillis())
                int updated = sql.executeUpdate(updateQuery, [lockId, requestId, now])
                
                if (updated > 0) {
                    result.success = true
                    result.lockId = lockId
                    result.extendedMinutes = additionalMinutes
                    
                    log.info("Extended lock ${lockId} by ${additionalMinutes} minutes for request ${requestId}")
                } else {
                    result.error = "Lock ${lockId} not found, expired, or not owned by request ${requestId}"
                }
                
            } catch (Exception e) {
                log.error("Failed to extend lock ${lockId}: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Get comprehensive lock statistics for monitoring
     * 
     * @return Lock statistics and health metrics
     */
    Map getLockStatistics() {
        Map result = [:]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Clean up expired locks first
                cleanupExpiredLocks(sql)
                
                String statsQuery = """
                    SELECT 
                        COUNT(*) FILTER (WHERE irl_lock_type = 'EXCLUSIVE') as exclusive_count,
                        COUNT(*) FILTER (WHERE irl_lock_type = 'SHARED') as shared_count,
                        COUNT(*) as total_active_locks,
                        COUNT(DISTINCT irl_resource_type) as locked_resource_types,
                        COUNT(DISTINCT irl_locked_by_request) as active_requests
                    FROM stg_import_resource_locks_irl
                    WHERE irl_is_active = true AND irl_expires_at > ?
                """
                
                Timestamp now = new Timestamp(System.currentTimeMillis())
                def row = sql.firstRow(statsQuery, [now])
                
                result.statistics = [
                    exclusiveLocks: row?.getProperty('exclusive_count') as Integer ?: 0,
                    sharedLocks: row?.getProperty('shared_count') as Integer ?: 0,
                    totalActiveLocks: row?.getProperty('total_active_locks') as Integer ?: 0,
                    lockedResourceTypes: row?.getProperty('locked_resource_types') as Integer ?: 0,
                    activeRequests: row?.getProperty('active_requests') as Integer ?: 0
                ]
                
                // Get resource type breakdown
                String resourceQuery = """
                    SELECT irl_resource_type, COUNT(*) as lock_count,
                           COUNT(*) FILTER (WHERE irl_lock_type = 'EXCLUSIVE') as exclusive_count
                    FROM stg_import_resource_locks_irl
                    WHERE irl_is_active = true AND irl_expires_at > ?
                    GROUP BY irl_resource_type
                    ORDER BY lock_count DESC
                """
                
                result.resourceBreakdown = []
                sql.eachRow(resourceQuery, [now]) { resourceRow ->
                    Integer lockCount = resourceRow.getProperty('lock_count') as Integer
                    Integer exclusiveCount = resourceRow.getProperty('exclusive_count') as Integer
                    ((List)result.resourceBreakdown).add([
                        resourceType: resourceRow.getProperty('irl_resource_type') as String,
                        totalLocks: lockCount,
                        exclusiveLocks: exclusiveCount,
                        sharedLocks: lockCount - exclusiveCount
                    ])
                }
                
            } catch (Exception e) {
                log.error("Failed to get lock statistics: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    // ====== PRIVATE HELPER METHODS ======
    
    private boolean hasConflictingLocks(Sql sql, String resourceType, String resourceId, String lockType) {
        String query = """
            SELECT COUNT(*) as count
            FROM stg_import_resource_locks_irl
            WHERE irl_resource_type = ? AND irl_resource_id = ?
              AND irl_is_active = true AND irl_expires_at > ?
              AND (irl_lock_type = 'EXCLUSIVE' OR ? = 'EXCLUSIVE')
        """
        
        Timestamp now = new Timestamp(System.currentTimeMillis())
        def row = sql.firstRow(query, [resourceType, resourceId, now, lockType])
        Integer count = row?.getProperty('count') as Integer ?: 0
        return count.compareTo(0) > 0
    }
    
    private List<Map> getConflictingLocks(Sql sql, String resourceType, String resourceId) {
        List<Map> conflicts = []
        
        String query = """
            SELECT irl_id, irl_lock_type, irl_locked_by_request, irl_expires_at
            FROM stg_import_resource_locks_irl
            WHERE irl_resource_type = ? AND irl_resource_id = ?
              AND irl_is_active = true AND irl_expires_at > ?
        """
        
        Timestamp now = new Timestamp(System.currentTimeMillis())
        sql.eachRow(query, [resourceType, resourceId, now]) { row ->
            conflicts.add([
                lockId: row.getProperty('irl_id') as Integer,
                lockType: row.getProperty('irl_lock_type') as String,
                lockedBy: row.getProperty('irl_locked_by_request') as Object,
                expiresAt: row.getProperty('irl_expires_at') as Timestamp
            ])
        }
        
        return conflicts
    }
    
    private Integer getLatestLockId(Sql sql, UUID requestId, String resourceType, String resourceId) {
        String query = """
            SELECT irl_id
            FROM stg_import_resource_locks_irl
            WHERE irl_locked_by_request = ? 
              AND irl_resource_type = ? 
              AND irl_resource_id = ?
            ORDER BY irl_locked_at DESC
            LIMIT 1
        """
        
        def row = sql.firstRow(query, [requestId, resourceType, resourceId])
        return row?.getProperty('irl_id') as Integer
    }
    
    private void cleanupExpiredLocks(Sql sql) {
        String cleanupQuery = """
            DELETE FROM stg_import_resource_locks_irl
            WHERE irl_expires_at <= ? OR irl_is_active = false
        """
        
        Timestamp now = new Timestamp(System.currentTimeMillis())
        int cleaned = sql.executeUpdate(cleanupQuery, [now])
        
        if (cleaned > 0) {
            log.debug("Cleaned up ${cleaned} expired resource locks")
        }
    }
    
    /**
     * Get comprehensive system resource status for monitoring and API responses
     * 
     * @return System resource status including lock statistics and health metrics
     */
    Map getSystemResourceStatus() {
        Map result = [:]
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Clean up expired locks first
                cleanupExpiredLocks(sql)
                
                // Get comprehensive statistics
                Map lockStats = getLockStatistics()
                
                // Get system-wide metrics
                String systemQuery = """
                    SELECT 
                        COUNT(DISTINCT irl_locked_by_request) as active_requests,
                        COUNT(DISTINCT irl_resource_type) as resource_types_locked,
                        MIN(irl_locked_at) as earliest_lock,
                        MAX(irl_expires_at) as latest_expiry,
                        AVG(EXTRACT(EPOCH FROM (irl_expires_at - irl_locked_at))/60) as avg_lock_duration_minutes
                    FROM stg_import_resource_locks_irl
                    WHERE irl_is_active = true AND irl_expires_at > ?
                """
                
                Timestamp now = new Timestamp(System.currentTimeMillis())
                def systemRow = sql.firstRow(systemQuery, [now])
                
                // Get active locks summary
                String activeLocksQuery = """
                    SELECT irl_id, irl_resource_type, irl_resource_id, irl_lock_type,
                           irl_locked_by_request, irl_locked_at, irl_expires_at
                    FROM stg_import_resource_locks_irl
                    WHERE irl_is_active = true AND irl_expires_at > ?
                    ORDER BY irl_locked_at ASC
                    LIMIT 50
                """
                
                List<Map> activeLocks = []
                sql.eachRow(activeLocksQuery, [now]) { row ->
                    activeLocks.add([
                        lockId: row.getProperty('irl_id') as Integer,
                        resourceType: row.getProperty('irl_resource_type') as String,
                        resourceId: row.getProperty('irl_resource_id') as String,
                        lockType: row.getProperty('irl_lock_type') as String,
                        lockedBy: row.getProperty('irl_locked_by_request') as Object,
                        lockedAt: row.getProperty('irl_locked_at') as Timestamp,
                        expiresAt: row.getProperty('irl_expires_at') as Timestamp,
                        duration: calculateLockDuration(row.getProperty('irl_locked_at') as Timestamp, now)
                    ])
                }
                
                // Calculate memory utilization (basic estimation)
                Runtime runtime = Runtime.getRuntime()
                long freeMemory = runtime.freeMemory()
                long totalMemory = runtime.totalMemory()
                long maxMemory = runtime.maxMemory()
                double memoryUtilization = ((double) (totalMemory - freeMemory) / maxMemory) * 100
                
                result = [
                    timestamp: now,
                    systemMetrics: [
                        activeRequests: systemRow?.getProperty('active_requests') as Integer ?: 0,
                        resourceTypesLocked: systemRow?.getProperty('resource_types_locked') as Integer ?: 0,
                        earliestLock: systemRow?.getProperty('earliest_lock') as Timestamp,
                        latestExpiry: systemRow?.getProperty('latest_expiry') as Timestamp,
                        averageLockDurationMinutes: Math.round(((systemRow?.getProperty('avg_lock_duration_minutes') as Double) ?: 0.0) * 10) / 10.0,
                        memoryUtilizationPercent: Math.round(memoryUtilization * 10) / 10.0
                    ],
                    lockStatistics: lockStats.statistics ?: [:],
                    resourceBreakdown: lockStats.resourceBreakdown ?: [],
                    activeLocks: activeLocks,
                    healthStatus: determineSystemHealth(lockStats, memoryUtilization, activeLocks.size())
                ]
                
            } catch (Exception e) {
                log.error("Failed to get system resource status: ${e.message}", e)
                result.error = e.message
            }
        }
        
        return result
    }
    
    /**
     * Get all currently active resource locks for system monitoring
     * 
     * @return List of active resource locks
     */
    List<Map> getActiveResourceLocks() {
        List<Map> locks = []
        
        DatabaseUtil.withSql { Sql sql ->
            try {
                // Clean up expired locks first
                cleanupExpiredLocks(sql)
                
                String query = """
                    SELECT irl_id, irl_resource_type, irl_resource_id, irl_lock_type,
                           irl_locked_by_request, irl_locked_at, irl_expires_at
                    FROM stg_import_resource_locks_irl
                    WHERE irl_is_active = true AND irl_expires_at > ?
                    ORDER BY irl_locked_at ASC
                """
                
                Timestamp now = new Timestamp(System.currentTimeMillis())
                
                sql.eachRow(query, [now]) { row ->
                    locks.add([
                        lockId: row.getProperty('irl_id') as Integer,
                        resourceType: row.getProperty('irl_resource_type') as String,
                        resourceId: row.getProperty('irl_resource_id') as String,
                        lockType: row.getProperty('irl_lock_type') as String,
                        lockedBy: row.getProperty('irl_locked_by_request') as Object,
                        lockedAt: row.getProperty('irl_locked_at') as Timestamp,
                        expiresAt: row.getProperty('irl_expires_at') as Timestamp,
                        durationMinutes: calculateLockDuration(row.getProperty('irl_locked_at') as Timestamp, now)
                    ])
                }
                
            } catch (Exception e) {
                log.error("Failed to get active resource locks: ${e.message}", e)
            }
        }
        
        return locks
    }
    
    // Helper methods for the new functionality
    
    private Long calculateLockDuration(Timestamp lockTime, Timestamp currentTime) {
        return ((currentTime.time - lockTime.time) / (1000 * 60)) as Long // Duration in minutes
    }
    
    private String determineSystemHealth(Map lockStats, double memoryUtilization, int activeLockCount) {
        if (memoryUtilization > 90.0) return "CRITICAL"
        if (memoryUtilization > 80.0) return "WARNING"
        if (activeLockCount > 100) return "WARNING"
        
        Integer totalLocks = (lockStats.statistics as Map)?.totalActiveLocks as Integer ?: 0
        if (totalLocks > 50) return "WARNING"
        
        return "HEALTHY"
    }
}