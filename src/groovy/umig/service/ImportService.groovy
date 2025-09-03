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
     */
    Map importBatch(List<Map> jsonFiles, String userId) {
        Map batchResult = [
            totalFiles: jsonFiles.size(),
            successCount: 0,
            failureCount: 0,
            skippedCount: 0,
            results: [],
            statistics: [:]
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
}