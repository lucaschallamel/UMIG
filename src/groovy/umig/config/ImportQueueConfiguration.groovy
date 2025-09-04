package umig.config

import groovy.transform.CompileStatic

/**
 * Import Queue Configuration - US-034 Enhancement
 * 
 * Centralized configuration for all import queue management, scheduling,
 * and resource management components introduced in US-034.
 * 
 * This configuration integrates with the 7 new database tables:
 * - stg_import_queue_management_iqm
 * - stg_import_resource_locks_irl
 * - stg_scheduled_import_schedules_sis
 * - stg_schedule_execution_history_seh
 * - stg_import_performance_monitoring_ipm
 * - stg_schedule_resource_reservations_srr
 * - stg_import_queue_statistics_iqs
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 2 Integration
 */
@CompileStatic
class ImportQueueConfiguration {
    
    // ================================
    // QUEUE MANAGEMENT CONFIGURATION
    // ================================
    
    /** Maximum number of concurrent imports allowed */
    public static final int MAX_CONCURRENT_IMPORTS = 3
    
    /** Maximum size of import request queue */
    public static final int MAX_QUEUE_SIZE = 10
    
    /** Default priority for import requests */
    public static final int DEFAULT_PRIORITY = 5
    
    /** Queue timeout in minutes */
    public static final int QUEUE_TIMEOUT_MINUTES = 60
    
    /** Queue cleanup interval in minutes */
    public static final int QUEUE_CLEANUP_INTERVAL_MINUTES = 30
    
    /** Maximum queue wait time in minutes before rejection */
    public static final int MAX_QUEUE_WAIT_MINUTES = 120
    
    // ================================
    // RESOURCE MANAGEMENT CONFIGURATION
    // ================================
    
    /** Maximum memory allocation per import (MB) */
    public static final int MAX_MEMORY_PER_IMPORT_MB = 1024
    
    /** Maximum database connections per import */
    public static final int MAX_DB_CONNECTIONS_PER_IMPORT = 3
    
    /** Resource lock timeout in seconds */
    public static final int RESOURCE_LOCK_TIMEOUT_SECONDS = 300
    
    /** Resource lock cleanup interval in minutes */
    public static final int RESOURCE_LOCK_CLEANUP_INTERVAL_MINUTES = 15
    
    /** Maximum resource lock duration in minutes */
    public static final int MAX_RESOURCE_LOCK_DURATION_MINUTES = 60
    
    /** System memory utilization threshold for new imports */
    public static final double MEMORY_UTILIZATION_THRESHOLD = 0.85
    
    /** System CPU utilization threshold for new imports */
    public static final double CPU_UTILIZATION_THRESHOLD = 0.80
    
    // ================================
    // SCHEDULING CONFIGURATION
    // ================================
    
    /** Enable/disable import scheduling feature */
    public static final boolean SCHEDULING_ENABLED = true
    
    /** Maximum number of active recurring schedules */
    public static final int MAX_RECURRING_SCHEDULES = 20
    
    /** Scheduler executor thread pool size */
    public static final int SCHEDULER_EXECUTOR_THREADS = 4
    
    /** Schedule execution grace period in minutes */
    public static final int SCHEDULE_GRACE_PERIOD_MINUTES = 5
    
    /** Maximum schedule retry attempts */
    public static final int MAX_SCHEDULE_RETRY_ATTEMPTS = 3
    
    /** Schedule retry delay in minutes */
    public static final int SCHEDULE_RETRY_DELAY_MINUTES = 15
    
    /** Schedule execution timeout in minutes */
    public static final int SCHEDULE_EXECUTION_TIMEOUT_MINUTES = 120
    
    /** Schedule cleanup interval for completed executions */
    public static final int SCHEDULE_CLEANUP_INTERVAL_DAYS = 30
    
    // ================================
    // PERFORMANCE MONITORING CONFIGURATION
    // ================================
    
    /** Performance monitoring enabled */
    public static final boolean PERFORMANCE_MONITORING_ENABLED = true
    
    /** Performance data retention period in days */
    public static final int PERFORMANCE_DATA_RETENTION_DAYS = 30
    
    /** Performance metrics collection interval in seconds */
    public static final int PERFORMANCE_METRICS_INTERVAL_SECONDS = 30
    
    /** Performance alert threshold for import duration (minutes) */
    public static final int PERFORMANCE_ALERT_DURATION_MINUTES = 45
    
    /** Performance alert threshold for memory usage (percentage) */
    public static final double PERFORMANCE_ALERT_MEMORY_THRESHOLD = 0.90
    
    /** Performance alert threshold for error rate (percentage) */
    public static final double PERFORMANCE_ALERT_ERROR_RATE_THRESHOLD = 0.10
    
    // ================================
    // BATCH SIZE AND LIMITS
    // ================================
    
    /** Maximum files per import batch */
    public static final int MAX_BATCH_SIZE = 1000
    
    /** Maximum JSON file size in MB */
    public static final int MAX_JSON_FILE_SIZE_MB = 10
    
    /** Maximum CSV file size in MB */
    public static final int MAX_CSV_FILE_SIZE_MB = 50
    
    /** Maximum total import payload size in MB */
    public static final int MAX_TOTAL_PAYLOAD_SIZE_MB = 100
    
    /** Maximum instruction count per step */
    public static final int MAX_INSTRUCTIONS_PER_STEP = 500
    
    // ================================
    // PRIORITY LEVELS
    // ================================
    
    /** Critical priority level */
    public static final int PRIORITY_CRITICAL = 20
    
    /** High priority level */
    public static final int PRIORITY_HIGH = 15
    
    /** Normal priority level */
    public static final int PRIORITY_NORMAL = 10
    
    /** Low priority level */
    public static final int PRIORITY_LOW = 5
    
    /** Background priority level */
    public static final int PRIORITY_BACKGROUND = 1
    
    // ================================
    // IMPORT TYPE CONFIGURATIONS
    // ================================
    
    /** Import type configurations with resource requirements */
    public static final Map<String, Map<String, Object>> IMPORT_TYPE_CONFIG = [
        'JSON_IMPORT': [
            estimatedDurationMinutes: 5 as Object,
            memoryRequirementMB: 256 as Object,
            cpuWeight: 2 as Object,
            dbConnections: 2 as Object
        ] as Map<String, Object>,
        'CSV_IMPORT': [
            estimatedDurationMinutes: 3 as Object,
            memoryRequirementMB: 128 as Object,
            cpuWeight: 1 as Object,
            dbConnections: 1 as Object
        ] as Map<String, Object>,
        'COMPLETE_IMPORT': [
            estimatedDurationMinutes: 15 as Object,
            memoryRequirementMB: 512 as Object,
            cpuWeight: 3 as Object,
            dbConnections: 3 as Object
        ] as Map<String, Object>,
        'BULK_IMPORT': [
            estimatedDurationMinutes: 30 as Object,
            memoryRequirementMB: 1024 as Object,
            cpuWeight: 5 as Object,
            dbConnections: 4 as Object
        ] as Map<String, Object>,
        'SCHEDULED_IMPORT': [
            estimatedDurationMinutes: 10 as Object,
            memoryRequirementMB: 384 as Object,
            cpuWeight: 2 as Object,
            dbConnections: 2 as Object
        ] as Map<String, Object>
    ] as Map<String, Map<String, Object>>
    
    // ================================
    // RESOURCE LOCK TYPES
    // ================================
    
    /** Available resource lock types */
    public static final List<String> RESOURCE_LOCK_TYPES = [
        'EXCLUSIVE',    // Only one process can hold this lock
        'SHARED'        // Multiple processes can hold this lock
    ]
    
    /** Resource types that can be locked */
    public static final List<String> LOCKABLE_RESOURCE_TYPES = [
        'DATABASE_TABLE',
        'FILE_SYSTEM',
        'MEMORY_ALLOCATION',
        'CPU_SLOT',
        'IMPORT_BATCH'
    ]
    
    // ================================
    // ERROR HANDLING CONFIGURATION
    // ================================
    
    /** Enable detailed error logging */
    public static final boolean DETAILED_ERROR_LOGGING = true
    
    /** Maximum error log retention days */
    public static final int ERROR_LOG_RETENTION_DAYS = 14
    
    /** Error notification threshold */
    public static final int ERROR_NOTIFICATION_THRESHOLD = 5
    
    /** Automatic retry enabled for transient failures */
    public static final boolean AUTO_RETRY_ENABLED = true
    
    /** Maximum automatic retry attempts */
    public static final int MAX_AUTO_RETRY_ATTEMPTS = 3
    
    /** Retry backoff multiplier */
    public static final double RETRY_BACKOFF_MULTIPLIER = 1.5
    
    // ================================
    // MONITORING AND ALERTING
    // ================================
    
    /** Enable system health monitoring */
    public static final boolean HEALTH_MONITORING_ENABLED = true
    
    /** Health check interval in minutes */
    public static final int HEALTH_CHECK_INTERVAL_MINUTES = 5
    
    /** Enable email notifications for critical events */
    public static final boolean EMAIL_NOTIFICATIONS_ENABLED = true
    
    /** Email notification recipients for import queue alerts */
    public static final List<String> ALERT_EMAIL_RECIPIENTS = [
        'umig-admin@company.com'
    ]
    
    /** Slack notification webhook URL (if configured) */
    public static final String SLACK_WEBHOOK_URL = System.getenv('UMIG_SLACK_WEBHOOK_URL') ?: null
    
    // ================================
    // UTILITY METHODS
    // ================================
    
    /**
     * Get import type configuration
     */
    static Map<String, Object> getImportTypeConfig(String importType) {
        return IMPORT_TYPE_CONFIG[importType] ?: IMPORT_TYPE_CONFIG['JSON_IMPORT']
    }
    
    /**
     * Calculate estimated duration for import type
     */
    static int getEstimatedDuration(String importType, int itemCount = 1) {
        Map<String, Object> config = getImportTypeConfig(importType)
        int baseDuration = config.estimatedDurationMinutes as int
        
        // Scale based on item count (with diminishing returns)
        double scaleFactor = Math.min(Math.sqrt(itemCount as double), 5.0 as double)
        return Math.ceil(baseDuration * scaleFactor) as int
    }
    
    /**
     * Calculate memory requirement for import type
     */
    static int getMemoryRequirement(String importType, int itemCount = 1) {
        Map<String, Object> config = getImportTypeConfig(importType)
        int baseMemory = config.memoryRequirementMB as int
        
        // Scale linearly with item count up to max
        int scaledMemory = baseMemory + (itemCount * 10) // 10MB per additional item
        return Math.min(scaledMemory, MAX_MEMORY_PER_IMPORT_MB)
    }
    
    /**
     * Get priority level description
     */
    static String getPriorityDescription(int priority) {
        if (priority >= PRIORITY_CRITICAL) return "Critical"
        if (priority >= PRIORITY_HIGH) return "High"
        if (priority >= PRIORITY_NORMAL) return "Normal"
        if (priority >= PRIORITY_LOW) return "Low"
        return "Background"
    }
    
    /**
     * Check if system is within operational thresholds
     */
    static boolean isSystemHealthy(double memoryUtilization, double cpuUtilization) {
        return memoryUtilization < MEMORY_UTILIZATION_THRESHOLD && 
               cpuUtilization < CPU_UTILIZATION_THRESHOLD
    }
    
    /**
     * Calculate queue position based on priority and timestamp
     */
    static int calculateQueuePosition(int priority, long queuedTimestamp, List<Map> existingQueue) {
        if (existingQueue == null || existingQueue.isEmpty()) {
            return 1
        }
        
        int position = 1
        for (Map queuedItem : existingQueue) {
            int itemPriority = queuedItem.priority as int
            long itemTimestamp = queuedItem.queuedTimestamp as long
            
            // Higher priority goes first
            if (priority < itemPriority) {
                position++
            }
            // Same priority: FIFO (earlier timestamp goes first)
            else if (priority == itemPriority && queuedTimestamp > itemTimestamp) {
                position++
            }
        }
        
        return position
    }
    
    /**
     * Get configuration summary for logging/monitoring
     */
    static Map<String, Object> getConfigurationSummary() {
        return [
            maxConcurrentImports: MAX_CONCURRENT_IMPORTS,
            maxQueueSize: MAX_QUEUE_SIZE,
            schedulingEnabled: SCHEDULING_ENABLED,
            performanceMonitoringEnabled: PERFORMANCE_MONITORING_ENABLED,
            memoryThreshold: MEMORY_UTILIZATION_THRESHOLD,
            cpuThreshold: CPU_UTILIZATION_THRESHOLD,
            supportedImportTypes: IMPORT_TYPE_CONFIG.keySet(),
            resourceLockTypes: RESOURCE_LOCK_TYPES,
            lockableResourceTypes: LOCKABLE_RESOURCE_TYPES
        ]
    }
}