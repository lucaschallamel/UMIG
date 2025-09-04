package umig.service

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import groovy.sql.Sql
import umig.repository.StagingImportRepository
import umig.repository.ImportRepository
import umig.utils.DatabaseUtil
import java.sql.Timestamp
import org.slf4j.Logger
import org.slf4j.LoggerFactory

/**
 * Service for importing migration data from JSON files extracted from Confluence HTML
 * Uses staging tables (stg_steps, stg_step_instructions) for intermediate storage
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034
 */
class ImportService {
    
    private static final Logger log = LoggerFactory.getLogger(ImportService.class)
    
    // Performance Constants - US-034 Enhancement
    private static final int MAX_BATCH_SIZE = 1000 // Maximum files per batch
    
    private StagingImportRepository stagingRepository
    private ImportRepository importRepository
    
    ImportService() {
        this.stagingRepository = new StagingImportRepository()
        this.importRepository = new ImportRepository()
    }
    
    /**
     * Import JSON data from extracted Confluence files into staging tables
     * 
     * @param jsonContent The JSON content as String
     * @param importSource Source identifier (e.g., filename)
     * @param userId User performing the import
     * @return Map containing import results and statistics
     */
    Map importJsonData(String jsonContent, String importSource, String userId) {
        log.info("Starting JSON import from source: ${importSource} by user: ${userId}")
        
        Map result = [
            success: false,
            source: importSource,
            statistics: [:],
            errors: [],
            warnings: []
        ]
        
        try {
            // Parse JSON
            def jsonSlurper = new JsonSlurper()
            def jsonData = jsonSlurper.parseText(jsonContent)
            Map jsonMap = (Map) jsonData
            
            // Validate JSON structure
            Map validation = validateJsonStructure(jsonData)
            if (!validation.valid) {
                result.errors = validation.errors
                return result
            }
            
            // Validate step type is exactly 3 characters
            String stepTypeValue = jsonMap.step_type as String
            if (stepTypeValue?.length() != 3) {
                ((List) result.errors) << "Step type must be exactly 3 characters. Got: '${stepTypeValue}'"
                return result
            }
            
            // Process in transaction
            DatabaseUtil.withSql { Sql sql ->
                sql.withTransaction {
                    // Create import batch for tracking
                    UUID batchId = importRepository.createImportBatch(
                        sql, 
                        importSource, 
                        'JSON_IMPORT', 
                        userId
                    )
                    result.batchId = batchId
                    
                    // Insert step into staging with batch tracking
                    String stepId = stagingRepository.createStagingStep(
                        sql, 
                        jsonMap,
                        batchId,
                        importSource,
                        userId
                    )
                    result.stepId = stepId
                    
                    // Insert instructions if present
                    int instructionCount = 0
                    def taskList = jsonMap.task_list
                    if (taskList && taskList instanceof List) {
                        instructionCount = stagingRepository.createStagingInstructions(
                            sql, 
                            stepId, 
                            (List) taskList
                        )
                    }
                    
                    // Collect statistics
                    result.statistics = [
                        batchId: batchId.toString(),
                        stepId: stepId,
                        stepType: jsonMap.step_type,
                        stepNumber: jsonMap.step_number,
                        instructionsImported: instructionCount,
                        primaryTeam: jsonMap.primary_team,
                        impactedTeams: jsonMap.impacted_teams
                    ]
                    
                    // Update batch status to completed
                    importRepository.updateImportBatchStatus(
                        sql,
                        batchId,
                        'COMPLETED',
                        (Map) result.statistics
                    )
                    
                    result.success = true
                    log.info("Import completed successfully. Batch: ${batchId}, Step: ${stepId}, Instructions: ${instructionCount}")
                    
                    // Automatic validation after successful import
                    Map validationResult = validateStagingData()
                    if (validationResult.valid) {
                        log.info("Staging data validation passed. Ready for promotion to master tables.")
                        result.validationPassed = true
                        
                        // Automatic promotion to master tables
                        Map promotionResult = promoteToMaster(batchId)
                        result.promotionResult = promotionResult
                        
                        if (promotionResult.success) {
                            log.info("Successfully promoted to master tables: ${promotionResult.message}")
                        } else {
                            log.warn("Promotion to master tables had issues: ${promotionResult}")
                        }
                    } else {
                        log.warn("Staging data validation has warnings/errors: ${validationResult}")
                        result.validationPassed = false
                        result.validationErrors = validationResult.errors
                        result.validationWarnings = validationResult.warnings
                    }
                }
            }
            
        } catch (IllegalArgumentException e) {
            log.error("Validation error: ${e.message}")
            ((List) result.errors) << e.message
        } catch (Exception e) {
            log.error("Import failed: ${e.message}", e)
            ((List) result.errors) << "Import failed: ${e.message}"
        }
        
        return result
    }
    
    /**
     * Import multiple JSON files in batch
     * US-034 Enhancement: Added batch size validation, performance monitoring, and resource management
     */
    Map importBatch(List<Map> jsonFiles, String userId) {
        // SECURITY VALIDATION - Batch size limits
        if (jsonFiles?.size() > MAX_BATCH_SIZE) {
            log.error("Batch size validation failed: ${jsonFiles.size()} files exceeds limit of ${MAX_BATCH_SIZE}")
            return [
                success: false,
                error: "Batch size exceeds maximum allowed size of ${MAX_BATCH_SIZE} files",
                actualSize: jsonFiles.size(),
                maxSize: MAX_BATCH_SIZE,
                cvssScore: 6.5,
                threatLevel: "MEDIUM",
                securityAlert: "Resource exhaustion prevention - batch size exceeds safe limits"
            ]
        }
        
        // PERFORMANCE VALIDATION - Memory check before starting batch
        if (!checkMemoryAvailability(jsonFiles.size())) {
            log.error("Insufficient memory available for batch processing ${jsonFiles.size()} files")
            return [
                success: false,
                error: "Insufficient memory available for batch processing",
                batchSize: jsonFiles.size(),
                recommendedAction: "Reduce batch size or wait for memory to be available",
                memoryStatus: getMemoryStatus()
            ]
        }
        
        Map batchResult = [
            totalFiles: jsonFiles?.size() ?: 0,
            successCount: 0,
            failureCount: 0,
            skippedCount: 0,
            results: [],
            statistics: [:],
            performanceMetrics: [
                batchSize: jsonFiles?.size() ?: 0,
                startTime: System.currentTimeMillis(),
                memoryUsageStart: Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()
            ]
        ]
        
        // Count by step type
        Map stepTypeCounts = [:]
        
        jsonFiles.each { fileData ->
            try {
                Map fileMap = (Map) fileData
                Map result = importJsonData(
                    fileMap.content as String, 
                    fileMap.filename as String, 
                    userId
                )
                
                if (result.success) {
                    batchResult.successCount = ((int) batchResult.successCount) + 1
                    Map resultStats = (Map) result.statistics
                    String stepType = resultStats.stepType as String
                    stepTypeCounts[stepType] = ((Integer) (stepTypeCounts[stepType] ?: 0)) + 1
                } else if (((List) result.warnings)?.size() > 0) {
                    batchResult.skippedCount = ((int) batchResult.skippedCount) + 1
                } else {
                    batchResult.failureCount = ((int) batchResult.failureCount) + 1
                }
                
                ((List) batchResult.results) << [
                    filename: fileMap.filename,
                    success: result.success,
                    stepId: result.stepId,
                    statistics: result.statistics,
                    errors: result.errors,
                    warnings: result.warnings
                ]
                
            } catch (Exception e) {
                Map fileMap = (Map) fileData
                log.error("Failed to process file ${fileMap.filename}: ${e.message}")
                batchResult.failureCount = ((int) batchResult.failureCount) + 1
                ((List) batchResult.results) << [
                    filename: fileMap.filename,
                    success: false,
                    errors: [e.message]
                ]
            }
        }
        
        // Get overall statistics from staging tables
        batchResult.statistics = stagingRepository.getStagingStatistics()
        ((Map) batchResult.statistics).importedByType = stepTypeCounts
        
        // Complete performance metrics - US-034 Enhancement
        Map performanceMetrics = (Map) batchResult.performanceMetrics
        performanceMetrics.endTime = System.currentTimeMillis()
        
        // ADR-031: Explicit type casting for mathematical operations
        long startTime = (performanceMetrics.startTime as Long)
        long endTime = (performanceMetrics.endTime as Long)
        long memoryUsageStart = (performanceMetrics.memoryUsageStart as Long)
        long memoryUsageEnd = Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()
        long durationMs = endTime - startTime
        long memoryDelta = memoryUsageEnd - memoryUsageStart
        int totalFiles = (batchResult.totalFiles as Integer)
        
        performanceMetrics.memoryUsageEnd = memoryUsageEnd
        performanceMetrics.durationMs = durationMs
        performanceMetrics.memoryDelta = memoryDelta
        performanceMetrics.filesPerSecond = durationMs > 0 ? 
            ((totalFiles as Double) * 1000.0d) / (durationMs as Double) : 0.0d
        
        // Additional performance analysis - US-034
        performanceMetrics.memoryEfficiency = calculateMemoryEfficiency(performanceMetrics)
        performanceMetrics.throughputRating = calculateThroughputRating(performanceMetrics.filesPerSecond as Double)
        performanceMetrics.resourceUtilization = getResourceUtilizationSummary()
        
        log.info("Batch import completed: ${batchResult.totalFiles} files, ${performanceMetrics.durationMs}ms, ${String.format('%.2f', performanceMetrics.filesPerSecond)} files/sec, Memory efficiency: ${performanceMetrics.memoryEfficiency}")
        
        // Clean up resources after large batch operations
        if (jsonFiles.size() >= 100) {
            optimizeResourceUsage()
        }
        
        return batchResult
    }
    
    /**
     * Validate JSON structure before processing
     */
    private Map validateJsonStructure(def jsonData) {
        Map result = [valid: true, errors: []]
        Map jsonMap = (Map) jsonData
        
        // Check required fields
        if (!jsonMap.step_type) {
            ((List) result.errors) << "Missing required field: step_type"
            result.valid = false
        }
        
        if (jsonMap.step_number == null) {
            ((List) result.errors) << "Missing required field: step_number"
            result.valid = false
        }
        
        if (!jsonMap.title) {
            ((List) result.errors) << "Missing required field: title"
            result.valid = false
        }
        
        // Validate task list if present
        def taskList = jsonMap.task_list
        if (taskList != null && !(taskList instanceof List)) {
            ((List) result.errors) << "task_list must be an array"
            result.valid = false
        }
        
        // Validate task list items have required fields
        if (taskList instanceof List) {
            ((List) taskList).eachWithIndex { task, index ->
                Map taskMap = (Map) task
                if (!taskMap.instruction_id) {
                    ((List) result.errors) << "Task ${index + 1} missing instruction_id"
                    result.valid = false
                }
            }
        }
        
        return result
    }
    
    /**
     * Get current staging data
     */
    List getStagingData() {
        return stagingRepository.getAllStagingSteps()
    }
    
    /**
     * Get staging statistics
     */
    Map getStagingStatistics() {
        return stagingRepository.getStagingStatistics()
    }
    
    /**
     * Clear all staging data
     */
    void clearStagingData() {
        DatabaseUtil.withSql { Sql sql ->
            stagingRepository.clearStagingTables(sql)
        }
        log.info("Staging tables cleared")
    }
    
    /**
     * Validate staging data before promotion to master tables
     */
    Map validateStagingData() {
        return stagingRepository.validateStagingData()
    }
    
    /**
     * Promote staging data to master tables
     * Creates master step and instruction records from staging data
     * 
     * @param batchId Optional batch ID to promote (if null, promotes all)
     * @param phaseId Optional phase ID to link steps to (will use default if not provided)
     */
    Map promoteToMaster(UUID batchId = null, UUID phaseId = null) {
        Map validation = validateStagingData()
        
        if (!validation.valid) {
            return [
                success: false,
                message: "Validation failed",
                errors: validation.errors,
                warnings: validation.warnings
            ]
        }
        
        Map result = [:]
        
        DatabaseUtil.withSql { Sql sql ->
            result = stagingRepository.promoteToMasterTables(sql, phaseId, batchId)
        }
        
        if (result.success) {
            log.info("Successfully promoted staging data to master tables: ${result.message}")
        } else {
            log.warn("Issues during promotion to master tables: ${result}")
        }
        
        // Include validation warnings if any
        List warnings = (List) validation.warnings
        if (warnings?.size() > 0) {
            result.validationWarnings = validation.warnings
        }
        
        return result
    }
    
    /**
     * US-034 Performance Enhancement Methods
     */
    
    /**
     * Check if sufficient memory is available for batch processing
     */
    private boolean checkMemoryAvailability(int batchSize) {
        Runtime runtime = Runtime.getRuntime()
        long freeMemory = runtime.freeMemory()
        long maxMemory = runtime.maxMemory()
        long totalMemory = runtime.totalMemory()
        
        // Estimate memory needed (approximate 1MB per file for JSON processing)
        long estimatedMemoryNeeded = batchSize * 1024 * 1024L
        long availableMemory = maxMemory - (totalMemory - freeMemory)
        
        // Require at least 50% headroom for safe processing
        return availableMemory > (estimatedMemoryNeeded * 1.5)
    }
    
    /**
     * Get current memory status for monitoring
     */
    private Map getMemoryStatus() {
        Runtime runtime = Runtime.getRuntime()
        long freeMemory = runtime.freeMemory()
        long totalMemory = runtime.totalMemory()
        long maxMemory = runtime.maxMemory()
        long usedMemory = totalMemory - freeMemory
        
        return [
            freeMemoryMB: freeMemory / (1024 * 1024),
            totalMemoryMB: totalMemory / (1024 * 1024),
            maxMemoryMB: maxMemory / (1024 * 1024),
            usedMemoryMB: usedMemory / (1024 * 1024),
            memoryUtilizationPercent: Math.round((usedMemory * 100.0d) / (maxMemory as Double) * 100.0d) / 100.0d
        ]
    }
    
    /**
     * Calculate memory efficiency rating
     */
    private String calculateMemoryEfficiency(Map performanceMetrics) {
        long memoryDelta = performanceMetrics.memoryDelta as Long
        int totalFiles = performanceMetrics.batchSize as Integer
        
        if (totalFiles == 0) return "N/A"
        
        long memoryPerFile = (memoryDelta / totalFiles) as Long
        
        // Rate efficiency based on memory usage per file
        if (memoryPerFile < 500 * 1024) return "EXCELLENT" // < 500KB per file
        if (memoryPerFile < 1024 * 1024) return "GOOD"      // < 1MB per file  
        if (memoryPerFile < 5 * 1024 * 1024) return "FAIR"  // < 5MB per file
        return "POOR" // > 5MB per file
    }
    
    /**
     * Calculate throughput performance rating
     */
    private String calculateThroughputRating(Double filesPerSecond) {
        if (filesPerSecond >= 10.0) return "EXCELLENT"
        if (filesPerSecond >= 5.0) return "GOOD"
        if (filesPerSecond >= 1.0) return "FAIR"
        return "POOR"
    }
    
    /**
     * Get comprehensive resource utilization summary
     */
    private Map getResourceUtilizationSummary() {
        Map memoryStatus = getMemoryStatus()
        
        return [
            memory: memoryStatus,
            timestamp: System.currentTimeMillis(),
            recommendation: getPerformanceRecommendation(memoryStatus)
        ]
    }
    
    /**
     * Get performance recommendation based on current resource status
     */
    private String getPerformanceRecommendation(Map memoryStatus) {
        double memoryUtilization = memoryStatus.memoryUtilizationPercent as Double
        
        if (memoryUtilization > 85) {
            return "HIGH memory usage detected. Consider reducing batch sizes or adding more memory."
        } else if (memoryUtilization > 70) {
            return "MODERATE memory usage. Monitor for memory leaks in large operations."
        } else if (memoryUtilization < 30) {
            return "LOW memory usage. Batch sizes can potentially be increased for better throughput."
        } else {
            return "OPTIMAL memory usage for current workload."
        }
    }
    
    /**
     * Optimize resource usage after large operations
     */
    private void optimizeResourceUsage() {
        log.debug("Optimizing resource usage after large batch operation")
        
        // Suggest garbage collection
        System.gc()
        
        // Allow thread scheduling
        Thread.yield()
        
        // Log post-optimization memory status
        Map memoryStatus = getMemoryStatus()
        log.debug("Resource optimization completed. Memory status: ${memoryStatus.memoryUtilizationPercent}% utilized")
    }
}