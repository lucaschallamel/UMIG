package umig.service

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import groovy.sql.Sql
import umig.repository.ImportRepository
import umig.repository.ImportQueueManagementRepository
import umig.repository.ImportResourceLockRepository
import umig.repository.ScheduledImportRepository
import umig.service.ImportService
import umig.service.CsvImportService
import umig.utils.DatabaseUtil
import java.sql.Timestamp
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.locks.ReentrantLock
import java.util.concurrent.Semaphore
import java.util.concurrent.TimeUnit

/**
 * Import Orchestration Service - Complete workflow coordination for US-034 Data Import Strategy
 * 
 * Coordinates the complete import pipeline:
 * 1. Base Entities (Teams → Users → Applications → Environments) 
 * 2. JSON Step Data Processing
 * 3. Master Table Promotion
 * 4. Error Recovery and Resume Capabilities
 * 
 * FEATURES:
 * - Entity sequencing with dependency management
 * - Progress tracking with persistence 
 * - Automatic error recovery and resume
 * - Rollback support at orchestration level
 * - Real-time status updates
 * 
 * @author UMIG Development Team  
 * @since Sprint 6 - US-034 Phase 2
 */
class ImportOrchestrationService {
    
    private static final Logger log = LoggerFactory.getLogger(ImportOrchestrationService.class)
    
    // Import phase execution order - CRITICAL for dependency management
    private static final List<String> IMPORT_PHASES = [
        'BASE_ENTITIES',    // Teams, Users, Applications, Environments
        'JSON_PROCESSING',  // Step and instruction JSON data
        'MASTER_PROMOTION', // Staging → Master tables
        'VALIDATION',       // Final validation and consistency checks
        'CLEANUP'           // Optional staging cleanup
    ]
    
    // Base entity import order - MUST maintain referential integrity
    private static final List<String> BASE_ENTITY_ORDER = [
        'teams',         // Independent - no dependencies
        'users',         // Independent - no dependencies  
        'applications',  // Independent - no dependencies
        'environments'   // Independent - no dependencies
    ]
    
    // Service dependencies
    private ImportService importService
    private CsvImportService csvImportService
    private ImportRepository importRepository
    
    // US-034 DATABASE-BACKED COORDINATION - Replaced in-memory coordination
    private ImportQueueManagementRepository queueRepository
    private ImportResourceLockRepository lockRepository
    private ScheduledImportRepository scheduleRepository
    
    // Legacy in-memory tracking for backward compatibility during transition
    private final Map<UUID, Map> orchestrationProgress = new ConcurrentHashMap<>()
    private final ReentrantLock orchestrationLock = new ReentrantLock(true) // Fair lock - kept for method-level coordination
    
    // Database-backed coordination with legacy fallback for transition period
    private final Semaphore concurrentImportSemaphore = new Semaphore(3, true) 
    private final Map<String, ReentrantLock> entityLocks = new ConcurrentHashMap<>()
    private final AtomicInteger activeOrchestrations = new AtomicInteger(0)
    
    ImportOrchestrationService() {
        this.importService = new ImportService()
        this.csvImportService = new CsvImportService()
        this.importRepository = new ImportRepository()
        
        // Initialize US-034 database-backed repositories
        this.queueRepository = new ImportQueueManagementRepository()
        this.lockRepository = new ImportResourceLockRepository()
        this.scheduleRepository = new ScheduledImportRepository()
    }
    
    /**
     * Orchestrate complete import workflow with concurrent coordination
     * US-034 Enhancement: Added resource locking, concurrent limits, and improved error handling
     * 
     * @param importConfiguration Configuration containing:
     *   - baseEntities: Map of entity name to CSV data
     *   - jsonFiles: List of JSON file data extracted from Confluence
     *   - options: Import options (rollback_on_failure, cleanup_staging, etc.)
     *   - userId: User performing the import
     * @return Orchestration result with progress tracking ID
     */
    Map orchestrateCompleteImport(Map importConfiguration) {
        UUID orchestrationId = UUID.randomUUID()
        String userId = importConfiguration.userId as String ?: 'system'
        
        // Initialize result at method level for proper scoping
        Map result = [
            orchestrationId: orchestrationId,
            started: new Timestamp(System.currentTimeMillis()),
            userId: userId,
            success: false,
            currentPhase: null,
            phases: [:],
            statistics: [:],
            errors: [],
            warnings: []
        ]
        
        // US-034 DATABASE-BACKED COORDINATION - Use queue management instead of semaphore
        UUID requestId = UUID.randomUUID()
        
        // Queue the import request using database-backed queue management
        Map queueResult = queueRepository.queueImportRequest(
            requestId,
            'COMPLETE_IMPORT', 
            userId,
            importConfiguration.priority as Integer ?: 5,
            importConfiguration,
            calculateResourceRequirements(importConfiguration),
            estimateImportDuration(importConfiguration)
        )
        
        if (!queueResult.success) {
            log.error("Failed to queue import request for user ${userId}: ${queueResult.error}")
            return [
                success: false,
                error: queueResult.error,
                queueingFailed: true
            ]
        }
        
        // Add request tracking to result
        result.requestId = requestId
        result.queuePosition = queueResult.queuePosition
        result.estimatedWaitTime = queueResult.estimatedWaitTime
        
        try {
            // Increment active orchestrations counter
            activeOrchestrations.incrementAndGet()
            
            log.info("Starting import orchestration: ${orchestrationId} by user: ${userId} (${activeOrchestrations.get()} active orchestrations)")
            
            // Initialize progress tracking
            Map progressTracker = initializeProgressTracking(orchestrationId, importConfiguration)
        
            try {
            // Validate import configuration
            Map validation = validateImportConfiguration(importConfiguration)
            if (!validation.valid) {
                result.errors = validation.errors
                updateOrchestrationStatus(orchestrationId, 'FAILED', 'Configuration validation failed')
                return result
            }
            
            // Execute import phases sequentially
            for (String phase : IMPORT_PHASES) {
                updateOrchestrationStatus(orchestrationId, 'IN_PROGRESS', "Executing phase: ${phase}")
                result.currentPhase = phase
                
                log.info("Orchestration ${orchestrationId}: Starting phase ${phase}")
                
                Map phaseResult = executeImportPhase(orchestrationId, phase, importConfiguration)
                result.phases[phase] = phaseResult
                
                // Check for phase failure
                if (!phaseResult.success) {
                    log.error("Orchestration ${orchestrationId}: Phase ${phase} failed: ${phaseResult.errors}")
                    (result.errors as List<String>).addAll(phaseResult.errors as List<String>)
                    
                    // Handle rollback if configured
                    Map options = importConfiguration.options as Map ?: [:]
                    boolean rollbackOnFailure = options.rollback_on_failure as Boolean ?: true
                    if (rollbackOnFailure) {
                        log.info("Orchestration ${orchestrationId}: Rolling back due to phase failure")
                        Map rollbackResult = rollbackOrchestration(orchestrationId, "Phase ${phase} failed")
                        result.rollbackResult = rollbackResult
                    }
                    
                    updateOrchestrationStatus(orchestrationId, 'FAILED', "Phase ${phase} failed")
                    return result
                }
                
                // Update progress
                updatePhaseProgress(orchestrationId, phase, 'COMPLETED')
                log.info("Orchestration ${orchestrationId}: Phase ${phase} completed successfully")
            }
            
            // All phases completed successfully
            result.success = true
            result.completed = new Timestamp(System.currentTimeMillis())
            result.statistics = generateOrchestrationStatistics(orchestrationId)
            
            updateOrchestrationStatus(orchestrationId, 'COMPLETED', 'All phases completed successfully')
            log.info("Orchestration ${orchestrationId}: All phases completed successfully")
            
            } catch (Exception e) {
                log.error("Orchestration ${orchestrationId} failed with exception: ${e.message}", e)
                (result.errors as List<String>) << ("Orchestration failed: ${e.message}" as String)
                updateOrchestrationStatus(orchestrationId, 'FAILED', e.message)
            } catch (InterruptedException e) {
                log.error("Orchestration ${orchestrationId} interrupted: ${e.message}")
                result.errors = result.errors ?: []
                (result.errors as List) << "Orchestration interrupted: ${e.message}"
                updateOrchestrationStatus(orchestrationId, 'INTERRUPTED', 'Operation was interrupted')
                Thread.currentThread().interrupt() // Preserve interrupted status
            }
            
        } catch (Exception e) {
            log.error("Orchestration setup failed for ${orchestrationId}: ${e.message}", e)
            // Update the method-level result with failure information
            result.success = false
            result.error = "Failed to initialize orchestration: ${e.message}"
            (result.errors as List<String>) << ("Setup failed: ${e.message}" as String)
            
            // Try to persist the failure result
            try {
                persistOrchestrationResults(orchestrationId, result)
            } catch (Exception persistException) {
                log.error("Failed to persist orchestration failure: ${persistException.message}")
            }
        } finally {
            // US-034 DATABASE-BACKED CLEANUP - Update queue status instead of semaphore
            try {
                // Update queue status based on result
                String finalStatus = result.success ? 'COMPLETED' : 'FAILED'
                String errorMessage = result.errors ? (result.errors as List<String>).join('; ') : null
                queueRepository.updateRequestStatus(requestId, finalStatus, errorMessage)
                
                // Release any acquired resource locks
                lockRepository.releaseAllLocksForRequest(requestId)
                
                log.info("Import orchestration ${orchestrationId} completed with status ${finalStatus}")
                
                // Clean up progress tracking after completion
                if (result?.success || (result?.errors as List)?.size() > 0) {
                    // Keep failed orchestrations in memory for potential resume
                    if (result.success) {
                        orchestrationProgress.remove(orchestrationId)
                    }
                }
            } catch (Exception cleanupException) {
                log.error("Error during orchestration cleanup: ${cleanupException.message}", cleanupException)
            } finally {
                // Decrement active orchestrations counter
                activeOrchestrations.decrementAndGet()
                log.debug("Active orchestrations count: ${activeOrchestrations.get()}")
            }
        }
        
        return result
    }
    
    /**
     * Resume failed import from last successful checkpoint
     */
    Map resumeFailedImport(UUID orchestrationId) {
        log.info("Attempting to resume failed import: ${orchestrationId}")
        
        Map orchestrationState = getOrchestrationStatus(orchestrationId)
        if (!orchestrationState) {
            return [
                success: false,
                error: "Orchestration not found: ${orchestrationId}"
            ]
        }
        
        if (orchestrationState.status != 'FAILED') {
            return [
                success: false,
                error: "Can only resume failed orchestrations. Current status: ${orchestrationState.status}"
            ]
        }
        
        // Determine last successful phase and resume from next phase
        String lastSuccessfulPhase = findLastSuccessfulPhase(orchestrationId)
        String resumePhase = getNextPhase(lastSuccessfulPhase)
        
        if (!resumePhase) {
            return [
                success: false,
                error: "No phase to resume from. Import may have completed or configuration is invalid."
            ]
        }
        
        log.info("Resuming orchestration ${orchestrationId} from phase: ${resumePhase}")
        
        // Update status and resume
        updateOrchestrationStatus(orchestrationId, 'RESUMING', "Resuming from phase: ${resumePhase}")
        
        // Get original configuration and resume
        Map originalConfig = getOrchestrationConfiguration(orchestrationId)
        originalConfig.resumeFromPhase = resumePhase
        
        return orchestrateCompleteImport(originalConfig)
    }
    
    /**
     * Execute specific import phase
     */
    private Map executeImportPhase(UUID orchestrationId, String phase, Map config) {
        switch (phase) {
            case 'BASE_ENTITIES':
                return executeBaseEntitiesPhase(orchestrationId, config)
            case 'JSON_PROCESSING':
                return executeJsonProcessingPhase(orchestrationId, config)
            case 'MASTER_PROMOTION':
                return executeMasterPromotionPhase(orchestrationId, config)
            case 'VALIDATION':
                return executeValidationPhase(orchestrationId, config)
            case 'CLEANUP':
                return executeCleanupPhase(orchestrationId, config)
            default:
                return [
                    success: false,
                    errors: ["Unknown import phase: ${phase}"]
                ]
        }
    }
    
    /**
     * Execute base entities import phase (Teams, Users, Applications, Environments)
     */
    private Map executeBaseEntitiesPhase(UUID orchestrationId, Map config) {
        log.info("Executing BASE_ENTITIES phase for orchestration: ${orchestrationId}")
        
        Map baseEntities = config.baseEntities as Map ?: [:]
        String userId = config.userId as String
        
        Map phaseResult = [
            success: true,
            entities: [:],
            statistics: [:],
            errors: [],
            warnings: []
        ]
        
        // Process base entities in dependency order with entity locking - US-034 Enhancement
        for (String entityType : BASE_ENTITY_ORDER) {
            if (!baseEntities.containsKey(entityType)) {
                log.info("Skipping ${entityType} - no data provided")
                continue
            }
            
            String csvData = baseEntities[entityType] as String
            
            // CONCURRENT COORDINATION - Entity-level locking
            ReentrantLock entityLock = getEntityLock(entityType)
            boolean lockAcquired = false
            
            try {
                // Acquire entity lock with timeout
                if (entityLock.tryLock(60, TimeUnit.SECONDS)) {
                    lockAcquired = true
                    log.info("Processing ${entityType} CSV import (entity lock acquired)...")
                    
                    Map entityResult
                    switch (entityType) {
                case 'teams':
                    entityResult = csvImportService.importTeams(csvData, "${entityType}_orchestrated.csv", userId)
                    break
                case 'users':
                    entityResult = csvImportService.importUsers(csvData, "${entityType}_orchestrated.csv", userId)
                    break
                case 'applications':
                    entityResult = csvImportService.importApplications(csvData, "${entityType}_orchestrated.csv", userId)
                    break
                case 'environments':
                    entityResult = csvImportService.importEnvironments(csvData, "${entityType}_orchestrated.csv", userId)
                    break
                    default:
                        log.warn("Unknown entity type: ${entityType}")
                        continue
                    }
                    
                    phaseResult.entities[entityType] = entityResult
                    
                    if (!entityResult.success) {
                        log.error("Failed to import ${entityType}: ${entityResult.errors}")
                        phaseResult.success = false
                        (phaseResult.errors as List<String>).addAll(entityResult.errors as List<String>)
                        // Continue with other entities but track failure
                    }
                    
                    updatePhaseProgress(orchestrationId, 'BASE_ENTITIES', "Completed ${entityType}")
                    
                } else {
                    // Could not acquire lock within timeout
                    log.error("Could not acquire entity lock for ${entityType} within 60 seconds")
                    phaseResult.success = false
                    (phaseResult.errors as List<String>) << ("Failed to acquire entity lock for ${entityType} - possible concurrent operation" as String)
                }
                
            } catch (InterruptedException e) {
                log.error("Entity import interrupted for ${entityType}: ${e.message}")
                phaseResult.success = false
                (phaseResult.errors as List<String>) << ("Entity import interrupted for ${entityType}: ${e.message}" as String)
                Thread.currentThread().interrupt()
            } finally {
                // Release entity lock
                if (lockAcquired) {
                    entityLock.unlock()
                    log.debug("Entity lock released for ${entityType}")
                }
            }
        }
        
        return phaseResult
    }
    
    /**
     * Execute JSON processing phase (Steps and Instructions from Confluence extraction)
     */
    private Map executeJsonProcessingPhase(UUID orchestrationId, Map config) {
        log.info("Executing JSON_PROCESSING phase for orchestration: ${orchestrationId}")
        
        List<Map> jsonFiles = config.jsonFiles as List<Map> ?: []
        String userId = config.userId as String
        
        if (jsonFiles.isEmpty()) {
            log.warn("No JSON files provided for processing")
            return [
                success: true,
                message: "No JSON files to process",
                statistics: [filesProcessed: 0]
            ]
        }
        
        // Use ImportService batch import
        Map batchResult = importService.importBatch(jsonFiles, userId)
        
        updatePhaseProgress(orchestrationId, 'JSON_PROCESSING', "Processed ${jsonFiles.size()} JSON files")
        
        return [
            success: batchResult.failureCount == 0,
            batchResult: batchResult,
            statistics: batchResult.statistics,
            errors: (batchResult.results as List).findAll { !(it as Map).success }.collect { (it as Map).errors }.flatten() as List<String>,
            warnings: (batchResult.results as List).findAll { (it as Map).warnings }.collect { (it as Map).warnings }.flatten() as List<String>
        ]
    }
    
    /**
     * Execute master table promotion phase
     */
    private Map executeMasterPromotionPhase(UUID orchestrationId, Map config) {
        log.info("Executing MASTER_PROMOTION phase for orchestration: ${orchestrationId}")
        
        // Promote all staging data to master tables
        Map promotionResult = importService.promoteToMaster()
        
        updatePhaseProgress(orchestrationId, 'MASTER_PROMOTION', 
            promotionResult.success ? "Promotion completed" : "Promotion failed")
        
        return promotionResult
    }
    
    /**
     * Execute validation phase
     */
    private Map executeValidationPhase(UUID orchestrationId, Map config) {
        log.info("Executing VALIDATION phase for orchestration: ${orchestrationId}")
        
        // Comprehensive validation of imported data
        Map validationResult = importService.validateStagingData()
        
        updatePhaseProgress(orchestrationId, 'VALIDATION', 
            validationResult.valid ? "Validation passed" : "Validation issues found")
        
        return [
            success: validationResult.valid,
            validation: validationResult,
            errors: validationResult.errors ?: [],
            warnings: validationResult.warnings ?: []
        ]
    }
    
    /**
     * Execute cleanup phase
     */
    private Map executeCleanupPhase(UUID orchestrationId, Map config) {
        log.info("Executing CLEANUP phase for orchestration: ${orchestrationId}")
        
        Map options = config.options as Map ?: [:]
        boolean cleanupStaging = options.cleanup_staging as Boolean ?: false
        
        if (cleanupStaging) {
            importService.clearStagingData()
            updatePhaseProgress(orchestrationId, 'CLEANUP', "Staging tables cleared")
            return [success: true, message: "Staging data cleared"]
        } else {
            updatePhaseProgress(orchestrationId, 'CLEANUP', "Staging data preserved")
            return [success: true, message: "Staging data preserved for review"]
        }
    }
    
    /**
     * Initialize progress tracking for orchestration
     */
    private Map initializeProgressTracking(UUID orchestrationId, Map config) {
        Map progressTracker = [
            orchestrationId: orchestrationId,
            status: 'INITIALIZING',
            phases: [:],
            started: new Timestamp(System.currentTimeMillis()),
            configuration: config
        ]
        
        // Initialize phase tracking
        IMPORT_PHASES.each { phase ->
            progressTracker.phases[phase] = [
                status: 'PENDING',
                progress: 0,
                message: null,
                started: null,
                completed: null
            ]
        }
        
        orchestrationProgress[orchestrationId] = progressTracker
        
        // Persist to database
        persistOrchestrationProgress(orchestrationId, progressTracker)
        
        return progressTracker
    }
    
    /**
     * Update orchestration status
     */
    private void updateOrchestrationStatus(UUID orchestrationId, String status, String message) {
        Map progress = orchestrationProgress[orchestrationId]
        if (progress) {
            progress.status = status
            progress.lastUpdate = new Timestamp(System.currentTimeMillis())
            progress.lastMessage = message
            
            // Persist update
            persistOrchestrationProgress(orchestrationId, progress)
        }
    }
    
    /**
     * Update phase progress
     */
    private void updatePhaseProgress(UUID orchestrationId, String phase, String message) {
        Map progress = orchestrationProgress[orchestrationId]
        if (progress && progress.phases[phase]) {
            Map phaseProgress = progress.phases[phase] as Map
            phaseProgress.message = message
            phaseProgress.lastUpdate = new Timestamp(System.currentTimeMillis())
            
            if (message.startsWith('Completed') || message.contains('completed')) {
                phaseProgress.status = 'COMPLETED'
                phaseProgress.completed = new Timestamp(System.currentTimeMillis())
                phaseProgress.progress = 100
            } else {
                phaseProgress.status = 'IN_PROGRESS'
                if (!phaseProgress.started) {
                    phaseProgress.started = new Timestamp(System.currentTimeMillis())
                }
            }
            
            // Persist update
            persistOrchestrationProgress(orchestrationId, progress)
        }
    }
    
    /**
     * Rollback orchestration
     */
    Map rollbackOrchestration(UUID orchestrationId, String reason) {
        log.info("Rolling back orchestration ${orchestrationId}: ${reason}")
        
        Map rollbackResult = [
            orchestrationId: orchestrationId,
            reason: reason,
            rollbackActions: [],
            success: false
        ]
        
        try {
            // Get orchestration status to determine rollback scope
            Map orchestrationState = getOrchestrationStatus(orchestrationId)
            if (!orchestrationState) {
                rollbackResult.error = "Orchestration not found"
                return rollbackResult
            }
            
            // Rollback completed phases in reverse order
            List<String> completedPhases = IMPORT_PHASES.findAll { phase ->
                Map phaseState = orchestrationState.phases[phase] as Map
                phaseState?.status == 'COMPLETED'
            }
            
            completedPhases.reverse().each { phase ->
                Map phaseRollback = rollbackPhase(orchestrationId, phase)
                (rollbackResult.rollbackActions as List) << [
                    phase: phase,
                    result: phaseRollback
                ]
            }
            
            // Update orchestration status
            updateOrchestrationStatus(orchestrationId, 'ROLLED_BACK', reason)
            
            rollbackResult.success = true
            log.info("Orchestration ${orchestrationId} rolled back successfully")
            
        } catch (Exception e) {
            log.error("Rollback failed for orchestration ${orchestrationId}: ${e.message}", e)
            rollbackResult.error = e.message
        }
        
        return rollbackResult
    }
    
    /**
     * Rollback specific phase
     */
    private Map rollbackPhase(UUID orchestrationId, String phase) {
        switch (phase) {
            case 'MASTER_PROMOTION':
            case 'JSON_PROCESSING':
                // Clear staging tables
                importService.clearStagingData()
                return [success: true, action: 'Cleared staging tables']
            
            case 'BASE_ENTITIES':
                // Note: Base entity rollback is complex due to potential dependencies
                // For now, log the action but don't attempt automatic rollback
                log.warn("Base entity rollback requires manual intervention for orchestration: ${orchestrationId}")
                return [success: true, action: 'Manual rollback required for base entities']
            
            default:
                return [success: true, action: 'No rollback action required']
        }
    }
    
    /**
     * Get orchestration history
     */
    List getOrchestrationHistory(String userId = null, Integer limit = 20) {
        return DatabaseUtil.withSql { Sql sql ->
            String query = """
                SELECT orchestration_id, status, started, completed, user_id, 
                       phase_count, success_count, error_count
                FROM import_orchestrations io
                ${userId ? "WHERE user_id = ?" : ""}
                ORDER BY started DESC
                LIMIT ?
            """
            
            List<Object> params = userId ? [userId as Object, limit as Object] : [limit as Object]
            return sql.rows(query, params) as List
        }
    }
    
    /**
     * Get detailed orchestration status
     */
    Map getOrchestrationStatus(UUID orchestrationId) {
        // First check in-memory cache
        Map memoryStatus = orchestrationProgress[orchestrationId]
        if (memoryStatus) {
            return memoryStatus
        }
        
        // Fallback to database
        return DatabaseUtil.withSql { Sql sql ->
            String query = """
                SELECT * FROM import_orchestrations 
                WHERE orchestration_id = ?
            """
            
            def row = sql.firstRow(query, [orchestrationId.toString()])
            if (row) {
                return [
                    orchestrationId: UUID.fromString(row.orchestration_id as String),
                    status: row.status,
                    started: row.started,
                    completed: row.completed,
                    userId: row.user_id,
                    phases: parseJsonField(row.phase_details as String),
                    statistics: parseJsonField(row.statistics as String),
                    configuration: parseJsonField(row.configuration as String)
                ]
            }
            return null
        }
    }
    
    // Helper methods
    private Map validateImportConfiguration(Map config) {
        List<String> errors = []
        
        if (!config.userId) {
            errors << "Missing required field: userId"
        }
        
        if (!config.baseEntities && !config.jsonFiles) {
            errors << "At least one of baseEntities or jsonFiles must be provided"
        }
        
        return [
            valid: errors.isEmpty(),
            errors: errors
        ]
    }
    
    private void persistOrchestrationProgress(UUID orchestrationId, Map progress) {
        // Persist progress to database for recovery
        DatabaseUtil.withSql { Sql sql ->
            String upsertQuery = """
                INSERT INTO import_orchestrations 
                (orchestration_id, status, started, user_id, phase_details, configuration, last_update)
                VALUES (?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT (orchestration_id) 
                DO UPDATE SET 
                    status = EXCLUDED.status,
                    phase_details = EXCLUDED.phase_details,
                    last_update = EXCLUDED.last_update
            """
            
            sql.executeUpdate(upsertQuery, [
                orchestrationId.toString(),
                progress.status,
                progress.started,
                (progress.configuration as Map)?.userId,
                new JsonBuilder(progress.phases).toString(),
                new JsonBuilder(progress.configuration).toString(),
                new Timestamp(System.currentTimeMillis())
            ])
        }
    }
    
    private void persistOrchestrationResults(UUID orchestrationId, Map result) {
        DatabaseUtil.withSql { Sql sql ->
            String updateQuery = """
                UPDATE import_orchestrations 
                SET completed = ?, 
                    success = ?,
                    statistics = ?,
                    error_details = ?
                WHERE orchestration_id = ?
            """
            
            sql.executeUpdate(updateQuery, [
                result.completed ?: new Timestamp(System.currentTimeMillis()),
                result.success,
                new JsonBuilder(result.statistics).toString(),
                new JsonBuilder([errors: result.errors, warnings: result.warnings]).toString(),
                orchestrationId.toString()
            ])
        }
    }
    
    private String findLastSuccessfulPhase(UUID orchestrationId) {
        Map status = getOrchestrationStatus(orchestrationId)
        if (!status?.phases) return null
        
        String lastSuccessful = null
        for (String phase : IMPORT_PHASES) {
            Map phaseStatus = status.phases[phase] as Map
            if (phaseStatus?.status == 'COMPLETED') {
                lastSuccessful = phase
            } else {
                break
            }
        }
        
        return lastSuccessful
    }
    
    private String getNextPhase(String currentPhase) {
        if (!currentPhase) return IMPORT_PHASES[0]
        
        int currentIndex = IMPORT_PHASES.indexOf(currentPhase)
        if (currentIndex >= 0 && currentIndex < IMPORT_PHASES.size() - 1) {
            return IMPORT_PHASES[currentIndex + 1]
        }
        
        return null
    }
    
    private Map getOrchestrationConfiguration(UUID orchestrationId) {
        Map status = getOrchestrationStatus(orchestrationId)
        return status?.configuration as Map ?: [:]
    }
    
    private Map generateOrchestrationStatistics(UUID orchestrationId) {
        Map progress = orchestrationProgress[orchestrationId]
        if (!progress) return [:]
        
        int completedPhases = (progress.phases as Map).values().count { 
            Map phaseMap = it as Map
            phaseMap.status == 'COMPLETED' 
        } as Integer
        
        return [
            totalPhases: IMPORT_PHASES.size(),
            completedPhases: completedPhases,
            duration: calculateDuration(progress.started as Timestamp, new Timestamp(System.currentTimeMillis())),
            orchestrationId: orchestrationId.toString()
        ]
    }
    
    private Long calculateDuration(Timestamp start, Timestamp end) {
        return end.time - start.time
    }
    
    private Map parseJsonField(Object jsonField) {
        String jsonString = jsonField as String
        if (!jsonString) return [:]
        try {
            return new JsonSlurper().parseText(jsonString) as Map
        } catch (Exception e) {
            log.warn("Failed to parse JSON field: ${e.message}")
            return [:]
        }
    }
    
    /**
     * US-034 Concurrent Coordination Enhancement Methods
     */
    
    /**
     * Get or create entity-specific lock for concurrent coordination
     */
    private ReentrantLock getEntityLock(String entityType) {
        return entityLocks.computeIfAbsent(entityType, { k -> new ReentrantLock(true) })
    }
    
    /**
     * Get current concurrent operation status
     */
    private Map getConcurrentOperationStatus() {
        return [
            maxConcurrentImports: 3,
            availableSlots: concurrentImportSemaphore.availablePermits(),
            activeOrchestrations: activeOrchestrations.get(),
            queuedOrchestrations: Math.max(0, (activeOrchestrations.get() as Integer) - 3),
            entityLocksActive: entityLocks.size(),
            systemRecommendation: activeOrchestrations.get() > 2 ? 
                "High concurrent activity - consider staggering import operations" : 
                "Normal concurrent activity levels"
        ]
    }
    
    /**
     * Check if orchestration can proceed based on resource availability
     */
    private boolean canProceedWithOrchestration() {
        // Check memory availability
        Runtime runtime = Runtime.getRuntime()
        long freeMemory = runtime.freeMemory()
        long totalMemory = runtime.totalMemory()
        long maxMemory = runtime.maxMemory()
        
        double memoryUtilization = (double) (totalMemory - freeMemory) / maxMemory
        
        // Prevent new orchestrations if memory usage is too high
        if (memoryUtilization > 0.85) {
            log.warn("Memory utilization too high (${String.format('%.1f', memoryUtilization * 100)}%) - blocking new orchestrations")
            return false
        }
        
        // Check if too many active orchestrations
        if (activeOrchestrations.get() >= 5) {
            log.warn("Too many active orchestrations (${activeOrchestrations.get()}) - blocking new requests")
            return false
        }
        
        return true
    }
    
    /**
     * Clean up expired orchestration progress tracking
     */
    private void cleanupExpiredProgress() {
        long cutoffTime = System.currentTimeMillis() - (24 * 60 * 60 * 1000L) // 24 hours ago
        
        orchestrationProgress.entrySet().removeIf { entry ->
            Map progress = entry.getValue() as Map
            Timestamp started = progress.started as Timestamp
            return started && started.time < cutoffTime
        }
    }
    
    /**
     * Get orchestration queue information
     */
    Map getOrchestrationQueueInfo() {
        return [
            activeOrchestrations: activeOrchestrations.get(),
            availableConcurrentSlots: concurrentImportSemaphore.availablePermits(),
            totalTrackedOrchestrations: orchestrationProgress.size(),
            entityLocks: entityLocks.keySet(),
            systemStatus: canProceedWithOrchestration() ? "READY" : "RESOURCE_CONSTRAINED",
            recommendations: generateSystemRecommendations()
        ]
    }
    
    /**
     * Generate system performance recommendations
     */
    private List<String> generateSystemRecommendations() {
        List<String> recommendations = []
        
        if (activeOrchestrations.get() > 2) {
            recommendations << "High concurrent activity detected - consider staggering large import operations"
        }
        
        Runtime runtime = Runtime.getRuntime()
        double memoryUtilization = (double) (runtime.totalMemory() - runtime.freeMemory()) / runtime.maxMemory()
        if (memoryUtilization > 0.70) {
            recommendations << ("Memory usage is elevated (${String.format('%.1f', memoryUtilization * 100)}%) - monitor for memory leaks" as String)
        }
        
        if (entityLocks.size() > 4) {
            recommendations << "Multiple entity locks active - ensure proper lock release in error scenarios"
        }
        
        if (recommendations.isEmpty()) {
            recommendations << "System operating within normal parameters"
        }
        
        return recommendations
    }
    
    // ====== US-034 DATABASE-BACKED COORDINATION HELPER METHODS ======
    
    /**
     * Calculate resource requirements for import configuration
     * US-034 Enhancement: Database-backed resource estimation
     */
    Map calculateResourceRequirements(Map importConfiguration) {
        Map requirements = [:]
        
        // Estimate based on configuration
        if (importConfiguration.baseEntities) {
            requirements.estimatedEntities = (importConfiguration.baseEntities as Map).size()
        }
        
        if (importConfiguration.jsonFiles) {
            requirements.estimatedJsonFiles = (importConfiguration.jsonFiles as List).size()
        }
        
        // Resource requirements
        requirements.memoryMB = Math.max(512, (requirements.estimatedEntities as Integer ?: 0) * 50)
        requirements.diskSpaceMB = Math.max(100, (requirements.estimatedJsonFiles as Integer ?: 0) * 10)
        requirements.concurrentConnections = Math.min(5, Math.max(1, (requirements.estimatedEntities as Integer ?: 1)))
        
        return requirements
    }
    
    /**
     * Estimate import duration for queue management
     * US-034 Enhancement: Duration estimation for queue positioning
     */
    Integer estimateImportDuration(Map importConfiguration) {
        // Basic duration estimation in minutes
        int baseTime = 5 // 5 minute base
        int entityTime = (((importConfiguration.baseEntities as Map)?.size() ?: 0) as Integer) * 2 // 2 minutes per entity type
        int jsonTime = (((importConfiguration.jsonFiles as List)?.size() ?: 0) as Integer) * 1 // 1 minute per JSON file
        
        return Math.max(5, baseTime + entityTime + jsonTime)
    }
    
    /**
     * Get current import queue status
     * US-034 Enhancement: Database-backed queue status
     */
    Map getImportQueueStatus() {
        try {
            return queueRepository.getQueueStatus()
        } catch (Exception e) {
            log.error("Failed to get import queue status: ${e.message}", e)
            return [error: e.message]
        }
    }
    
    /**
     * Get status of a specific import request
     * US-034 Enhancement: Database-backed request tracking
     */
    Map getImportRequestStatus(UUID requestId) {
        try {
            // Get queue status first
            Map queueStatus = queueRepository.getQueueStatus()
            
            // Find request in current queue or history
            Map requestInfo = (queueStatus.queue as List<Map>)?.find { Map it -> 
                (it.requestId as UUID) == requestId 
            } as Map
            
            if (!requestInfo) {
                return [
                    requestId: requestId,
                    found: false,
                    message: "Request not found in current queue"
                ]
            }
            
            // Get active locks for this request
            List<Map> activeLocks = lockRepository.getActiveLocksForRequest(requestId)
            
            return [
                requestId: requestId,
                found: true,
                status: requestInfo,
                activeLocks: activeLocks,
                queueStatistics: queueStatus.statistics
            ]
            
        } catch (Exception e) {
            log.error("Failed to get status for request ${requestId}: ${e.message}", e)
            return [
                requestId: requestId,
                error: e.message
            ]
        }
    }
    
    /**
     * Cancel a queued import request
     * US-034 Enhancement: Database-backed request cancellation
     */
    Map cancelImportRequest(UUID requestId, String cancelledBy) {
        try {
            Map result = queueRepository.cancelRequest(requestId, cancelledBy)
            
            if (result.success) {
                // Also release any acquired locks
                lockRepository.releaseAllLocksForRequest(requestId)
                log.info("Cancelled import request ${requestId} and released associated locks")
            }
            
            return result
            
        } catch (Exception e) {
            log.error("Failed to cancel import request ${requestId}: ${e.message}", e)
            return [
                success: false,
                requestId: requestId,
                error: e.message
            ]
        }
    }
}