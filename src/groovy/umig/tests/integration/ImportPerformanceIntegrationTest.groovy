package umig.tests.integration

import umig.tests.utils.BaseIntegrationTest
import umig.tests.utils.IntegrationTestHttpClient
import umig.tests.utils.HttpResponse
import umig.service.ImportService
import umig.service.CsvImportService
import umig.repository.ImportRepository
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.sql.Sql
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.ExecutorService
import java.util.concurrent.TimeUnit

/**
 * Comprehensive Performance Integration Test for US-034 Data Import Strategy
 * 
 * Validates performance requirements and production-scale handling:
 * 1. Large-Scale Teams Import (1000+ records) - <60s completion target
 * 2. Large-Scale Users Import (1000+ records) - Relationship performance validation  
 * 3. Large-Scale JSON Import (100+ files) - Batch processing performance
 * 4. Concurrent Import Operations - Multi-user scenarios, resource contention
 * 5. Memory Usage During Large Imports - Resource consumption monitoring
 * 6. Database Connection Pooling - Connection efficiency validation
 * 7. Import Progress Tracking Performance - Real-time progress at scale
 * 8. Rollback Performance with Large Data - Cleanup efficiency validation
 * 
 * Performance Targets:
 * - Large Dataset Import: 1000+ records within <60s
 * - API Response Times: All endpoints <500ms  
 * - Memory Usage: Reasonable consumption during large imports
 * - Concurrent Operations: Multiple simultaneous imports without degradation
 * 
 * Framework: Extends BaseIntegrationTest (US-037 95% compliance)
 * Database: DatabaseUtil.withSql pattern with explicit casting (ADR-031)
 * Monitoring: JVM memory usage, database connection metrics, response times
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 4 (Performance Testing)
 */
class ImportPerformanceIntegrationTest extends BaseIntegrationTest {

    private ImportService importService
    private CsvImportService csvImportService
    private ImportRepository importRepository
    private ExecutorService executorService
    
    // Performance tracking
    private final Set<UUID> performanceTestBatches = new HashSet<>()
    private final List<Map> performanceMetrics = []
    
    // Performance thresholds
    private static final long LARGE_IMPORT_TIMEOUT_MS = 60000 // 60 seconds
    private static final long API_RESPONSE_TIMEOUT_MS = 500   // 500 milliseconds
    private static final int LARGE_DATASET_SIZE = 1000
    private static final int CONCURRENT_OPERATIONS = 5

    void setup() {
        super.setup()
        importService = new ImportService()
        csvImportService = new CsvImportService()
        importRepository = new ImportRepository()
        executorService = Executors.newFixedThreadPool(CONCURRENT_OPERATIONS)
        logProgress("ImportPerformanceIntegrationTest setup complete")
    }

    void cleanup() {
        if (executorService) {
            executorService.shutdown()
            try {
                if (!executorService.awaitTermination(30, TimeUnit.SECONDS)) {
                    executorService.shutdownNow()
                }
            } catch (InterruptedException e) {
                executorService.shutdownNow()
            }
        }
        cleanupPerformanceTestData()
        logPerformanceReport()
        super.cleanup()
    }

    // ====== PERFORMANCE TEST METHODS ======

    void testLargeScaleTeamsImport() {
        logProgress("Testing large-scale teams import (${LARGE_DATASET_SIZE} records)")

        // Generate large teams dataset
        StringBuilder csvData = new StringBuilder("team_name,team_description\n")
        (1..LARGE_DATASET_SIZE).each { i ->
            csvData.append("Perf Test Team ${String.format('%04d', i)},Performance testing team number ${i}\n")
        }

        // Record memory before import
        long memoryBefore = getUsedMemory()
        long startTime = System.currentTimeMillis()
        
        // Execute large-scale import
        HttpResponse response = httpClient.post('/csvImport/csv/teams', csvData.toString())
        
        long duration = System.currentTimeMillis() - startTime
        long memoryAfter = getUsedMemory()
        long memoryUsed = memoryAfter - memoryBefore
        
        // Validate performance targets
        assert duration < LARGE_IMPORT_TIMEOUT_MS, 
            "Large teams import should complete within ${LARGE_IMPORT_TIMEOUT_MS}ms (actual: ${duration}ms)"
        
        validateApiSuccess(response, 200)
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).success == true, "Large teams import should succeed: ${((Map)jsonBody).error}"
        assert (((Map)jsonBody).importedCount as Integer) == LARGE_DATASET_SIZE, 
            "Should import ${LARGE_DATASET_SIZE} teams"
        
        // Track batch for cleanup
        if (((Map)jsonBody).batchId) {
            performanceTestBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
        }
        
        // Record performance metrics
        recordPerformanceMetric('Large Teams Import', [
            records: LARGE_DATASET_SIZE,
            durationMs: duration,
            memoryUsedMB: memoryUsed / (1024 * 1024),
            recordsPerSecond: (LARGE_DATASET_SIZE * 1000) / duration,
            memoryPerRecord: memoryUsed / LARGE_DATASET_SIZE
        ])
        
        // Validate database state
        validateLargeDatasetInDatabase('tbl_teams', 'tms_name', 'Perf Test Team%', LARGE_DATASET_SIZE)

        logProgress("✅ Large-scale teams import test passed (${duration}ms, ${memoryUsed / 1024 / 1024}MB)")
    }

    void testLargeScaleUsersImport() {
        logProgress("Testing large-scale users import (${LARGE_DATASET_SIZE} records)")

        // Prerequisites: Create teams for user associations (smaller set for performance)
        createPerformanceTestTeams(100)
        
        // Generate large users dataset with team associations
        StringBuilder csvData = new StringBuilder("username,full_name,email,team_name\n")
        (1..LARGE_DATASET_SIZE).each { i ->
            int teamNumber = ((i - 1) % 100) + 1
            csvData.append("perf.user.${String.format('%04d', i)},")
            csvData.append("Performance User ${i},")
            csvData.append("perf.user.${i}@performance.test,")
            csvData.append("Perf Team ${String.format('%03d', teamNumber)}\n")
        }

        // Record memory and execute import
        long memoryBefore = getUsedMemory()
        long startTime = System.currentTimeMillis()
        
        HttpResponse response = httpClient.post('/csvImport/csv/users', csvData.toString())
        
        long duration = System.currentTimeMillis() - startTime
        long memoryAfter = getUsedMemory()
        long memoryUsed = memoryAfter - memoryBefore
        
        // Validate performance targets
        assert duration < LARGE_IMPORT_TIMEOUT_MS, 
            "Large users import should complete within ${LARGE_IMPORT_TIMEOUT_MS}ms (actual: ${duration}ms)"
        
        validateApiSuccess(response, 200)
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).success == true, "Large users import should succeed: ${((Map)jsonBody).error}"
        assert (((Map)jsonBody).importedCount as Integer) == LARGE_DATASET_SIZE, 
            "Should import ${LARGE_DATASET_SIZE} users"
        
        // Track batch for cleanup
        if (((Map)jsonBody).batchId) {
            performanceTestBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
        }
        
        // Record performance metrics
        recordPerformanceMetric('Large Users Import', [
            records: LARGE_DATASET_SIZE,
            durationMs: duration,
            memoryUsedMB: memoryUsed / (1024 * 1024),
            recordsPerSecond: (LARGE_DATASET_SIZE * 1000) / duration,
            relationshipsProcessed: LARGE_DATASET_SIZE // Each user has a team relationship
        ])
        
        // Validate database state with relationships
        DatabaseUtil.withSql { sql ->
            def userCount = sql.firstRow("""
                SELECT COUNT(*) as count 
                FROM tbl_users 
                WHERE usr_username LIKE 'perf.user.%'
            """)
            assert (userCount.count as Integer) == LARGE_DATASET_SIZE, 
                "Should have ${LARGE_DATASET_SIZE} users in database"
            
            // Validate relationship integrity
            def usersWithTeams = sql.firstRow("""
                SELECT COUNT(*) as count 
                FROM tbl_users u 
                JOIN tbl_teams t ON u.usr_team_id = t.tms_id 
                WHERE u.usr_username LIKE 'perf.user.%'
            """)
            assert (usersWithTeams.count as Integer) == LARGE_DATASET_SIZE, 
                "All users should have valid team relationships"
        }

        logProgress("✅ Large-scale users import test passed (${duration}ms, ${memoryUsed / 1024 / 1024}MB)")
    }

    void testLargeScaleJsonImport() {
        logProgress("Testing large-scale JSON import (100+ files)")

        // Generate large JSON files dataset
        List<Map> jsonFiles = []
        int fileCount = 100
        int instructionsPerFile = 5
        
        (1..fileCount).each { i ->
            List instructions = []
            (1..instructionsPerFile).each { j ->
                instructions << [
                    instruction_id: "PERF-${String.format('%03d', i)}-${String.format('%02d', j)}",
                    description: "Performance test instruction ${j} for step ${i}"
                ]
            }
            
            jsonFiles << [
                filename: "performance_test_${String.format('%03d', i)}.json",
                content: new JsonBuilder([
                    step_type: 'PERF',
                    step_number: i,
                    title: "Performance Test Step ${i}",
                    task_list: instructions
                ]).toString()
            ]
        }

        // Record memory and execute import
        long memoryBefore = getUsedMemory()
        long startTime = System.currentTimeMillis()
        
        HttpResponse response = httpClient.post('/importData/batch', [files: jsonFiles])
        
        long duration = System.currentTimeMillis() - startTime
        long memoryAfter = getUsedMemory()
        long memoryUsed = memoryAfter - memoryBefore
        
        // Validate performance targets
        assert duration < LARGE_IMPORT_TIMEOUT_MS, 
            "Large JSON import should complete within ${LARGE_IMPORT_TIMEOUT_MS}ms (actual: ${duration}ms)"
        
        validateApiSuccess(response, 200)
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).success == true, "Large JSON import should succeed: ${((Map)jsonBody).errors}"
        assert (((Map)jsonBody).processedFiles as Integer) == fileCount, "Should process ${fileCount} JSON files"
        assert (((Map)jsonBody).totalSteps as Integer) == fileCount, "Should create ${fileCount} steps"
        
        // Track batch for cleanup
        if (((Map)jsonBody).batchId) {
            performanceTestBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
        }
        
        // Record performance metrics
        recordPerformanceMetric('Large JSON Import', [
            files: fileCount,
            totalInstructions: fileCount * instructionsPerFile,
            durationMs: duration,
            memoryUsedMB: memoryUsed / (1024 * 1024),
            filesPerSecond: (fileCount * 1000) / duration,
            instructionsPerSecond: (fileCount * instructionsPerFile * 1000) / duration
        ])
        
        // Validate database state
        DatabaseUtil.withSql { sql ->
            def stepCount = sql.firstRow("""
                SELECT COUNT(*) as count 
                FROM stg_steps 
                WHERE sts_title LIKE 'Performance Test Step%'
            """)
            assert (stepCount.count as Integer) == fileCount, 
                "Should have ${fileCount} steps in staging"
            
            def instructionCount = sql.firstRow("""
                SELECT COUNT(*) as count 
                FROM stg_step_instructions 
                WHERE sti_instruction_id LIKE 'PERF-%'
            """)
            assert (instructionCount.count as Integer) == (fileCount * instructionsPerFile), 
                "Should have ${fileCount * instructionsPerFile} instructions in staging"
        }

        logProgress("✅ Large-scale JSON import test passed (${duration}ms, ${memoryUsed / 1024 / 1024}MB)")
    }

    void testConcurrentImportOperations() {
        logProgress("Testing concurrent import operations (${CONCURRENT_OPERATIONS} parallel)")

        List<Future<Map>> futures = []
        long startTime = System.currentTimeMillis()
        
        // Submit concurrent import operations
        (1..CONCURRENT_OPERATIONS).each { i ->
            Future<?> future = executorService.submit({
                try {
                    // Generate unique dataset for each concurrent operation
                    String teamsData = generateTeamsData("Concurrent ${i}", 50)
                    
                    long threadStartTime = System.currentTimeMillis()
                    HttpResponse response = httpClient.post('/csvImport/csv/teams', teamsData)
                    long threadDuration = System.currentTimeMillis() - threadStartTime
                    
                    return [
                        threadId: i,
                        success: response.success,
                        statusCode: response.statusCode,
                        duration: threadDuration,
                        recordCount: response.success ? (((Map)response.jsonBody)?.importedCount ?: 0) : 0,
                        batchId: response.success ? ((Map)response.jsonBody)?.batchId : null,
                        response: response.jsonBody
                    ]
                } catch (Exception e) {
                    return [
                        threadId: i,
                        success: false,
                        error: e.message,
                        duration: -1
                    ]
                }
            })
            futures.add(future as Future<Map>)
        }
        
        // Collect results
        List<Map> results = []
        futures.each { future ->
            try {
                Map result = future.get(LARGE_IMPORT_TIMEOUT_MS, TimeUnit.MILLISECONDS)
                results.add(result)
                
                // Track successful batches for cleanup
                if (result.batchId) {
                    performanceTestBatches.add(UUID.fromString(result.batchId as String))
                }
            } catch (Exception e) {
                results.add([threadId: -1, success: false, error: e.message])
            }
        }
        
        long totalDuration = System.currentTimeMillis() - startTime
        
        // Validate concurrent operation results
        def successfulOperations = results.findAll { it.success }
        def failedOperations = results.findAll { !it.success }
        
        assert successfulOperations.size() >= (CONCURRENT_OPERATIONS * 0.8), 
            "At least 80% of concurrent operations should succeed (${successfulOperations.size()}/${CONCURRENT_OPERATIONS})"
        
        assert totalDuration < (LARGE_IMPORT_TIMEOUT_MS * 2), 
            "Concurrent operations should complete within reasonable time (actual: ${totalDuration}ms)"
        
        // Validate response times didn't degrade significantly
        def averageResponseTime = ((successfulOperations.collect { it.duration as Long }.sum() as Long) / (successfulOperations.size() as Long)) as Long
        assert (averageResponseTime as Long) < (API_RESPONSE_TIMEOUT_MS * 3), 
            "Average response time should not degrade significantly under concurrency (actual: ${averageResponseTime}ms)"
        
        // Record performance metrics
        recordPerformanceMetric('Concurrent Import Operations', [
            concurrentOperations: CONCURRENT_OPERATIONS,
            successfulOperations: successfulOperations.size(),
            failedOperations: failedOperations.size(),
            totalDurationMs: totalDuration,
            averageResponseTimeMs: averageResponseTime,
            totalRecordsImported: successfulOperations.collect { it.recordCount }.sum()
        ])
        
        logProgress("✅ Concurrent import operations test passed (${successfulOperations.size()}/${CONCURRENT_OPERATIONS} succeeded, ${totalDuration}ms total)")
    }

    void testMemoryUsageDuringLargeImports() {
        logProgress("Testing memory usage during large imports")

        // Baseline memory measurement
        forceGarbageCollection()
        long baselineMemory = getUsedMemory()
        List<Long> memorySnapshots = [baselineMemory]
        
        // Generate medium-large dataset for memory monitoring
        int recordCount = 500
        String csvData = generateTeamsData("Memory Test", recordCount)
        
        // Monitor memory during import
        Thread memoryMonitor = new Thread({
            while (!Thread.currentThread().interrupted) {
                memorySnapshots.add(getUsedMemory())
                Thread.sleep(100) // Sample every 100ms
            }
        })
        
        memoryMonitor.start()
        long startTime = System.currentTimeMillis()
        
        // Execute import
        HttpResponse response = httpClient.post('/csvImport/csv/teams', csvData)
        
        long duration = System.currentTimeMillis() - startTime
        memoryMonitor.interrupt()
        memoryMonitor.join(1000) // Wait up to 1 second for monitoring thread to finish
        
        // Analyze memory usage
        long peakMemory = memorySnapshots.max()
        long memoryIncrease = peakMemory - baselineMemory
        long averageMemory = ((memorySnapshots.sum() as Long) / (memorySnapshots.size() as Integer)) as Long
        
        // Validate response
        validateApiSuccess(response, 200)
        def jsonBody = response.jsonBody
        assert (((Map)jsonBody).importedCount as Integer) == recordCount, "Should import ${recordCount} records"
        
        // Track batch for cleanup
        if (((Map)jsonBody).batchId) {
            performanceTestBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
        }
        
        // Memory usage validation
        long memoryPerRecord = ((memoryIncrease as BigDecimal) / (recordCount as BigDecimal)) as Long
        assert memoryPerRecord < (50 * 1024), // Less than 50KB per record
            "Memory usage per record should be reasonable (actual: ${memoryPerRecord} bytes)"
        
        // Memory should not increase indefinitely (check for memory leaks)
        forceGarbageCollection()
        long finalMemory = getUsedMemory()
        long memoryRetained = finalMemory - baselineMemory
        assert memoryRetained < (memoryIncrease * 0.5), 
            "Should not retain excessive memory after import (retained: ${memoryRetained / 1024 / 1024}MB)"
        
        // Record performance metrics
        recordPerformanceMetric('Memory Usage During Import', [
            records: recordCount,
            baselineMemoryMB: baselineMemory / (1024 * 1024),
            peakMemoryMB: peakMemory / (1024 * 1024),
            memoryIncreaseMB: memoryIncrease / (1024 * 1024),
            averageMemoryMB: averageMemory / (1024 * 1024),
            memoryPerRecordBytes: memoryPerRecord,
            memoryRetainedMB: memoryRetained / (1024 * 1024),
            durationMs: duration
        ])

        logProgress("✅ Memory usage test passed (Peak: ${peakMemory / 1024 / 1024}MB, Per record: ${memoryPerRecord} bytes)")
    }

    void testDatabaseConnectionPooling() {
        logProgress("Testing database connection pooling efficiency")

        List<Future<Map>> connectionFutures = []
        int connectionTests = 10
        long startTime = System.currentTimeMillis()
        
        // Submit multiple database operations concurrently
        (1..connectionTests).each { i ->
            Future<?> future = executorService.submit({
                long threadStartTime = System.currentTimeMillis()
                try {
                    // Perform database operation
                    DatabaseUtil.withSql { sql ->
                        // Simple query to test connection efficiency
                        def result = sql.firstRow("SELECT COUNT(*) as count FROM tbl_teams WHERE tms_name LIKE 'Perf Test Team%'")
                        return [
                            threadId: i,
                            success: true,
                            duration: System.currentTimeMillis() - threadStartTime,
                            recordCount: result?.count ?: 0
                        ]
                    }
                } catch (Exception e) {
                    return [
                        threadId: i,
                        success: false,
                        error: e.message,
                        duration: System.currentTimeMillis() - threadStartTime
                    ]
                }
            })
            connectionFutures.add(future as Future<Map>)
        }
        
        // Collect connection test results
        List<Map> connectionResults = []
        connectionFutures.each { future ->
            try {
                connectionResults.add(future.get(10, TimeUnit.SECONDS))
            } catch (Exception e) {
                connectionResults.add([success: false, error: e.message])
            }
        }
        
        long totalDuration = System.currentTimeMillis() - startTime
        
        // Validate connection efficiency
        def successfulConnections = connectionResults.findAll { it.success }
        assert successfulConnections.size() == connectionTests, 
            "All database connections should succeed (${successfulConnections.size()}/${connectionTests})"
        
        def averageConnectionTime = ((successfulConnections.collect { it.duration as Long }.sum() as Long) / (successfulConnections.size() as int)) as Long
        assert (averageConnectionTime as Long) < 1000, // Less than 1 second per connection
            "Database connections should be efficient (average: ${averageConnectionTime}ms)"
        
        // Record performance metrics
        recordPerformanceMetric('Database Connection Pooling', [
            concurrentConnections: connectionTests,
            successfulConnections: successfulConnections.size(),
            totalDurationMs: totalDuration,
            averageConnectionTimeMs: averageConnectionTime,
            connectionEfficiency: (successfulConnections.size() / connectionTests) * 100
        ])

        logProgress("✅ Database connection pooling test passed (${averageConnectionTime}ms average)")
    }

    void testImportProgressTrackingPerformance() {
        logProgress("Testing import progress tracking performance")

        // Create a batch with progress tracking
        UUID orchestrationId = UUID.randomUUID()
        List<Map> progressUpdates = []
        int progressUpdatesCount = 50
        
        long startTime = System.currentTimeMillis()
        
        // Generate multiple progress updates
        (1..progressUpdatesCount).each { i ->
            int completed = (i * 20) // Simulate progress
            int total = 1000
            String message = "Processing batch ${i} of ${progressUpdatesCount}"
            
            long updateStartTime = System.currentTimeMillis()
            Map result = importRepository.trackImportProgress(
                orchestrationId, 
                'PERFORMANCE_TEST', 
                completed, 
                total, 
                message
            )
            long updateDuration = System.currentTimeMillis() - updateStartTime
            
            progressUpdates.add([
                updateNumber: i,
                success: result.success,
                duration: updateDuration
            ])
        }
        
        long totalDuration = System.currentTimeMillis() - startTime
        
        // Validate progress tracking efficiency
        def successfulUpdates = progressUpdates.findAll { it.success }
        assert successfulUpdates.size() == progressUpdatesCount, 
            "All progress updates should succeed (${successfulUpdates.size()}/${progressUpdatesCount})"
        
        def averageUpdateTime = ((progressUpdates.collect { it.duration as Long }.sum() as Long) / (progressUpdatesCount as Integer)) as Long
        assert averageUpdateTime < 100, // Less than 100ms per update
            "Progress updates should be fast (average: ${averageUpdateTime}ms)"
        
        // Validate final progress status retrieval performance
        long statusStartTime = System.currentTimeMillis()
        Map finalStatus = importRepository.getProgressStatus(orchestrationId)
        long statusDuration = System.currentTimeMillis() - statusStartTime
        
        assert finalStatus != null, "Should retrieve progress status"
        assert statusDuration < 200, "Progress status retrieval should be fast (${statusDuration}ms)"
        
        // Record performance metrics
        recordPerformanceMetric('Import Progress Tracking', [
            progressUpdates: progressUpdatesCount,
            successfulUpdates: successfulUpdates.size(),
            totalDurationMs: totalDuration,
            averageUpdateTimeMs: averageUpdateTime,
            statusRetrievalTimeMs: statusDuration
        ])
        
        // Cleanup progress tracking data
        DatabaseUtil.withSql { sql ->
            sql.execute("DELETE FROM import_progress_tracking WHERE orchestration_id = ?", [orchestrationId])
            sql.execute("DELETE FROM import_orchestrations WHERE orchestration_id = ?", [orchestrationId])
        }

        logProgress("✅ Import progress tracking performance test passed (${averageUpdateTime}ms average)")
    }

    void testRollbackPerformanceWithLargeData() {
        logProgress("Testing rollback performance with large dataset")

        // Create a large import to rollback
        String largeTeamsData = generateTeamsData("Rollback Perf", 200)
        
        HttpResponse importResponse = httpClient.post('/csvImport/csv/teams', largeTeamsData)
        validateApiSuccess(importResponse, 200)
        
        UUID batchId = UUID.fromString(((Map)importResponse.jsonBody).batchId as String)
        performanceTestBatches.add(batchId)
        
        // Measure rollback performance
        long startTime = System.currentTimeMillis()
        
        Map rollbackData = [reason: "Performance testing rollback"]
        HttpResponse rollbackResponse = httpClient.post("/rollbackBatch/rollback/${batchId}", rollbackData)
        
        long duration = System.currentTimeMillis() - startTime
        
        // Validate rollback success and performance
        validateApiSuccess(rollbackResponse, 200)
        def rollbackBody = rollbackResponse.jsonBody
        assert ((Map)rollbackBody).success == true, "Rollback should succeed: ${((Map)rollbackBody).error}"
        
        assert duration < 5000, // Less than 5 seconds for rollback
            "Rollback should be fast even for large datasets (actual: ${duration}ms)"
        
        // Validate rollback completeness
        DatabaseUtil.withSql { sql ->
            def remainingTeams = sql.firstRow("""
                SELECT COUNT(*) as count 
                FROM tbl_teams 
                WHERE tms_name LIKE 'Rollback Perf%'
            """)
            assert (remainingTeams.count as Integer) == 0, "All teams should be rolled back"
            
            def batchStatus = sql.firstRow("""
                SELECT imb_status 
                FROM tbl_import_batches 
                WHERE imb_id = ?
            """, [batchId])
            assert batchStatus?.imb_status == 'ROLLED_BACK', "Batch should have ROLLED_BACK status"
        }
        
        // Record performance metrics
        recordPerformanceMetric('Rollback Performance', [
            recordsRolledBack: 200,
            rollbackDurationMs: duration,
            rollbackRatePerSecond: (200 * 1000) / duration
        ])

        logProgress("✅ Rollback performance test passed (${duration}ms for 200 records)")
    }

    // ====== HELPER METHODS ======

    /**
     * Generate teams CSV data for performance testing
     * @param prefix Prefix for team names
     * @param count Number of teams to generate
     * @return CSV data string
     */
    private String generateTeamsData(String prefix, int count) {
        StringBuilder csvData = new StringBuilder("team_name,team_description\n")
        (1..count).each { i ->
            csvData.append("${prefix} Team ${String.format('%04d', i)},Performance testing team ${prefix} number ${i}\n")
        }
        return csvData.toString()
    }

    /**
     * Create performance test teams for relationship testing
     * @param count Number of teams to create
     */
    private void createPerformanceTestTeams(int count) {
        String teamsData = generateTeamsData("Perf Team", count)
        HttpResponse response = httpClient.post('/csvImport/csv/teams', teamsData)
        validateApiSuccess(response, 200)
        if (((Map)response.jsonBody).batchId) {
            performanceTestBatches.add(UUID.fromString(((Map)response.jsonBody).batchId as String))
        }
    }

    /**
     * Validate large dataset in database
     * @param tableName Table to check
     * @param columnName Column to filter on
     * @param pattern Pattern to match
     * @param expectedCount Expected record count
     */
    private void validateLargeDatasetInDatabase(String tableName, String columnName, String pattern, int expectedCount) {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("""
                SELECT COUNT(*) as count 
                FROM ${tableName} 
                WHERE ${columnName} LIKE ?
            """, [pattern])
            
            assert (result.count as Integer) == expectedCount, 
                "Should have ${expectedCount} records in ${tableName} (actual: ${result.count})"
        }
    }

    /**
     * Get current JVM memory usage
     * @return Used memory in bytes
     */
    private long getUsedMemory() {
        Runtime runtime = Runtime.getRuntime()
        return runtime.totalMemory() - runtime.freeMemory()
    }

    /**
     * Force garbage collection for accurate memory measurements
     */
    private void forceGarbageCollection() {
        System.gc()
        Thread.sleep(100) // Give GC time to run
        System.gc()
    }

    /**
     * Record performance metric for reporting
     * @param testName Name of the test
     * @param metrics Map of metric values
     */
    private void recordPerformanceMetric(String testName, Map metrics) {
        performanceMetrics.add([
            testName: testName,
            timestamp: System.currentTimeMillis(),
            metrics: metrics
        ])
    }

    /**
     * Log comprehensive performance report
     */
    private void logPerformanceReport() {
        println "\n" + "="*80
        println "PERFORMANCE TEST REPORT - US-034 Data Import Strategy"
        println "="*80
        
        performanceMetrics.each { metric ->
            println "\n${metric.testName}:"
            println "-" * (((String)metric.testName).length() + 1)
            
            ((Map)metric.metrics).each { key, value ->
                if (value instanceof Number) {
                    if (((String)key).contains('MB')) {
                        println "  ${key}: ${String.format('%.2f', value)} MB"
                    } else if (((String)key).contains('Ms')) {
                        println "  ${key}: ${value} ms"
                    } else if (((String)key).contains('PerSecond')) {
                        println "  ${key}: ${String.format('%.2f', value)}"
                    } else {
                        println "  ${key}: ${value}"
                    }
                } else {
                    println "  ${key}: ${value}"
                }
            }
        }
        
        println "\n" + "="*80
    }

    /**
     * Clean up all performance test data
     */
    private void cleanupPerformanceTestData() {
        try {
            DatabaseUtil.withSql { sql ->
                // Clean up staging data
                sql.execute("DELETE FROM stg_step_instructions WHERE sti_instruction_id LIKE 'PERF-%'")
                sql.execute("DELETE FROM stg_steps WHERE sts_title LIKE 'Performance Test%'")
                
                // Clean up performance test batches
                performanceTestBatches.each { batchId ->
                    sql.execute("DELETE FROM tbl_import_audit_log WHERE ial_batch_id = ?", [batchId])
                    sql.execute("DELETE FROM tbl_import_batches WHERE imb_id = ?", [batchId])
                }
                
                // Clean up performance test entities
                sql.execute("DELETE FROM tbl_users WHERE usr_username LIKE 'perf.user.%'")
                sql.execute("DELETE FROM tbl_teams WHERE tms_name LIKE '%Perf%' OR tms_name LIKE 'Concurrent%' OR tms_name LIKE 'Memory Test%' OR tms_name LIKE 'Rollback Perf%'")
            }
        } catch (Exception e) {
            println "⚠️ Warning during performance test data cleanup: ${e.message}"
        }
    }
}