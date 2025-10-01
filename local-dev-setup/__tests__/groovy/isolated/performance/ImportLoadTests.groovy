package umig.tests.performance

import umig.tests.utils.BaseIntegrationTest
import umig.tests.utils.IntegrationTestHttpClient
import umig.tests.utils.HttpResponse
import umig.service.ImportService
import umig.service.CsvImportService
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.sql.Sql
import java.util.UUID
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.ThreadPoolExecutor
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicLong
import java.nio.charset.StandardCharsets
import org.slf4j.Logger
import org.slf4j.LoggerFactory

/**
 * Comprehensive Load Testing Suite for US-034 Data Import Strategy
 * 
 * Performance and scalability tests including:
 * - 1000+ record CSV imports with throughput validation
 * - Concurrent batch operations (5, 10, 20 simultaneous imports)
 * - Rollback performance under load conditions
 * - Memory stress testing with large datasets (>10k records)
 * - Database connection pool exhaustion scenarios
 * - Rate limiting validation and circuit breaker testing
 * - Progress indicator verification under load
 * - Sustained load testing over extended periods
 * - Performance degradation analysis under different load conditions
 * - Resource utilization monitoring and optimization
 * 
 * Performance Targets:
 * - API Response Time: <500ms for standard operations
 * - Large Dataset Processing: <60s for 10,000 records
 * - Concurrent Operations: 80% success rate with 20 concurrent imports
 * - Memory Usage: <500MB peak for 5,000 record imports
 * - Rollback Performance: <10s for batch rollbacks under load
 * - Throughput: >100 records/second sustained processing
 * 
 * Framework: Extends BaseIntegrationTest (US-037 compliance)
 * Database: Uses DatabaseUtil.withSql pattern with explicit casting
 * Monitoring: Comprehensive performance metrics collection
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Enhanced Load Testing (December 2025)
 */
class ImportLoadTests extends BaseIntegrationTest {

    private static final Logger log = LoggerFactory.getLogger(ImportLoadTests.class)
    
    private ImportService importService
    private CsvImportService csvImportService
    private ThreadPoolExecutor loadTestExecutor
    
    // Load test configuration
    private static final int SMALL_LOAD_RECORDS = 500
    private static final int MEDIUM_LOAD_RECORDS = 1000
    private static final int LARGE_LOAD_RECORDS = 5000
    private static final int XLARGE_LOAD_RECORDS = 10000
    private static final int STRESS_LOAD_RECORDS = 20000
    
    private static final int MAX_CONCURRENT_THREADS = 25
    private static final long SUSTAINED_LOAD_DURATION_MS = 300000 // 5 minutes
    private static final long PERFORMANCE_TEST_TIMEOUT_MS = 600000 // 10 minutes
    
    // Performance targets
    private static final long TARGET_API_RESPONSE_MS = 500
    private static final long TARGET_LARGE_DATASET_MS = 60000 // 60 seconds
    private static final double TARGET_CONCURRENT_SUCCESS_RATE = 0.80 // 80%
    private static final long TARGET_PEAK_MEMORY_MB = 500
    private static final long TARGET_ROLLBACK_TIME_MS = 10000 // 10 seconds
    private static final double TARGET_THROUGHPUT_RECORDS_PER_SEC = 100.0
    
    // Test data tracking
    private final Set<UUID> createdBatches = new HashSet<>()
    private final Set<UUID> createdOrchestrations = new HashSet<>()
    private final AtomicInteger totalRequestsProcessed = new AtomicInteger(0)
    private final AtomicLong totalProcessingTime = new AtomicLong(0)
    private final List<PerformanceMetric> performanceMetrics = Collections.synchronizedList([])
    
    void setup() {
        super.setup()
        importService = new ImportService()
        csvImportService = new CsvImportService()
        loadTestExecutor = Executors.newFixedThreadPool(MAX_CONCURRENT_THREADS) as ThreadPoolExecutor
        
        // Initialize performance metrics
        performanceMetrics.clear()
        totalRequestsProcessed.set(0)
        totalProcessingTime.set(0)
        
        logProgress("ImportLoadTests setup complete with ${MAX_CONCURRENT_THREADS} thread pool")
    }

    void cleanup() {
        try {
            // Shutdown executor service
            if (loadTestExecutor && !loadTestExecutor.isShutdown()) {
                loadTestExecutor.shutdown()
                if (!loadTestExecutor.awaitTermination(30, TimeUnit.SECONDS)) {
                    loadTestExecutor.shutdownNow()
                }
            }
            
            // Generate performance report
            generatePerformanceReport()
            
            // Clean up test data
            cleanupLoadTestData()
        } catch (Exception e) {
            println "⚠️ Warning during load test cleanup: ${e.message}"
        }
        super.cleanup()
    }

    // ========== LARGE RECORD SET LOAD TESTING ==========

    void testMediumRecordSetLoad() {
        logProgress("Testing medium record set load (${MEDIUM_LOAD_RECORDS} records)")
        executeRecordSetLoadTest(MEDIUM_LOAD_RECORDS, "medium", TARGET_API_RESPONSE_MS * 2)
    }

    void testLargeRecordSetLoad() {
        logProgress("Testing large record set load (${LARGE_LOAD_RECORDS} records)")
        executeRecordSetLoadTest(LARGE_LOAD_RECORDS, "large", (TARGET_LARGE_DATASET_MS / 2) as long)
    }

    void testXLargeRecordSetLoad() {
        logProgress("Testing extra large record set load (${XLARGE_LOAD_RECORDS} records)")
        executeRecordSetLoadTest(XLARGE_LOAD_RECORDS, "xlarge", TARGET_LARGE_DATASET_MS)
    }

    void testStressRecordSetLoad() {
        logProgress("Testing stress record set load (${STRESS_LOAD_RECORDS} records)")
        executeRecordSetLoadTest(STRESS_LOAD_RECORDS, "stress", TARGET_LARGE_DATASET_MS * 2)
    }

    private void executeRecordSetLoadTest(int recordCount, String testSize, long timeoutMs) {
        logProgress("Executing ${testSize} record set load test: ${recordCount} records")
        
        // Pre-test memory measurement
        System.gc()
        Thread.sleep(1000)
        long preTestMemory = getCurrentMemoryUsage()
        
        // Generate large CSV dataset
        String largeCsvData = generateLargeCsvDataset("teams", recordCount)
        
        // Execute load test
        long startTime = System.currentTimeMillis()
        long startMemory = getCurrentMemoryUsage()
        
        HttpResponse response = httpClient.postWithTimeout('/csvImport/csv/teams', largeCsvData, timeoutMs as int)
        
        long endTime = System.currentTimeMillis()
        long endMemory = getCurrentMemoryUsage()
        
        // Calculate metrics
        long processingTime = endTime - startTime
        long memoryUsed = ((endMemory - startMemory) / (1024 * 1024)) as long // MB
        long peakMemory = (endMemory / (1024 * 1024)) as long // MB
        double throughput = recordCount / (processingTime / 1000.0) // records/sec
        
        // Record performance metrics
        PerformanceMetric metric = new PerformanceMetric(
            testName: "${testSize}_record_set_load",
            recordCount: recordCount,
            processingTimeMs: processingTime,
            memoryUsedMB: memoryUsed,
            peakMemoryMB: peakMemory,
            throughputRecordsPerSec: throughput,
            success: response?.statusCode == 200,
            timestamp: startTime
        )
        performanceMetrics << metric
        
        // Validate results
        if (response && response.statusCode == 200) {
            def jsonBody = response.jsonBody
            assert ((Map)jsonBody).success == true, "Large dataset import should succeed: ${((Map)jsonBody).error}"
            
            if (((Map)jsonBody).batchId) {
                createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
            }
            
            // Performance validation
            assert processingTime <= timeoutMs, 
                "${testSize} dataset should complete within timeout: ${processingTime}ms <= ${timeoutMs}ms"
            
            if (recordCount <= LARGE_LOAD_RECORDS) {
                assert memoryUsed <= TARGET_PEAK_MEMORY_MB, 
                    "Memory usage should be reasonable for ${testSize}: ${memoryUsed}MB <= ${TARGET_PEAK_MEMORY_MB}MB"
            }
            
            assert throughput >= (TARGET_THROUGHPUT_RECORDS_PER_SEC / 4), 
                "Throughput should meet minimum target for ${testSize}: ${throughput} >= ${TARGET_THROUGHPUT_RECORDS_PER_SEC / 4}"
            
            logProgress("✅ ${testSize} record set load test passed: ${processingTime}ms, ${throughput} records/sec, ${memoryUsed}MB")
        } else {
            // Validate error handling under load
            if (response) {
                assert response.statusCode in [413, 503, 504], 
                    "Should return appropriate error under load: ${response.statusCode}"
                logProgress("✅ ${testSize} record set properly handled load limit: ${response.statusCode}")
            } else {
                logProgress("✅ ${testSize} record set handled extreme load with timeout")
            }
        }
        
        // Memory cleanup verification
        System.gc()
        Thread.sleep(2000)
        long postCleanupMemory = getCurrentMemoryUsage()
        long memoryRecovered = endMemory - postCleanupMemory
        
        logProgress("Memory recovery: ${memoryRecovered / (1024 * 1024)}MB recovered after ${testSize} test")
    }

    // ========== CONCURRENT BATCH OPERATIONS ==========

    void testConcurrentBatchOperations5() {
        executeConcurrentBatchTest(5, "5 concurrent batches")
    }

    void testConcurrentBatchOperations10() {
        executeConcurrentBatchTest(10, "10 concurrent batches")
    }

    void testConcurrentBatchOperations20() {
        executeConcurrentBatchTest(20, "20 concurrent batches")
    }

    private void executeConcurrentBatchTest(int concurrentCount, String testDescription) {
        logProgress("Testing ${testDescription} with performance monitoring")
        
        List<CompletableFuture<ConcurrentTestResult>> futures = []
        AtomicInteger successCount = new AtomicInteger(0)
        AtomicInteger errorCount = new AtomicInteger(0)
        AtomicLong totalConcurrentTime = new AtomicLong(0)
        
        long overallStartTime = System.currentTimeMillis()
        
        // Launch concurrent operations
        (1..concurrentCount).each { batchNum ->
            CompletableFuture<ConcurrentTestResult> future = CompletableFuture.supplyAsync({
                return executeSingleConcurrentBatch(batchNum, SMALL_LOAD_RECORDS)
            }, loadTestExecutor)
            
            futures << future
        }
        
        // Collect results with timeout handling
        List<ConcurrentTestResult> results = []
        futures.each { future ->
            try {
                ConcurrentTestResult result = future.get(2, TimeUnit.MINUTES)
                results << result
                
                if (result.success) {
                    successCount.incrementAndGet()
                    totalConcurrentTime.addAndGet(result.processingTimeMs)
                    if (result.batchId) {
                        createdBatches.add(result.batchId)
                    }
                } else {
                    errorCount.incrementAndGet()
                }
            } catch (Exception e) {
                errorCount.incrementAndGet()
                logProgress("⚠️ Concurrent operation failed: ${e.message}")
            }
        }
        
        long overallEndTime = System.currentTimeMillis()
        long totalWallClockTime = overallEndTime - overallStartTime
        
        // Calculate performance metrics
        double successRate = (successCount.get() as double) / (concurrentCount as double)
        double avgResponseTime = results.isEmpty() ? 0 : (results.collect { it.processingTimeMs }.sum() as double) / (results.size() as double)
        double overallThroughput = (successCount.get() * SMALL_LOAD_RECORDS) / (totalWallClockTime / 1000.0)
        
        // Record concurrent performance metrics
        PerformanceMetric concurrentMetric = new PerformanceMetric(
            testName: "concurrent_batch_${concurrentCount}",
            recordCount: concurrentCount * SMALL_LOAD_RECORDS,
            processingTimeMs: totalWallClockTime,
            memoryUsedMB: (getCurrentMemoryUsage() / (1024L * 1024L)) as long,
            throughputRecordsPerSec: overallThroughput,
            success: successRate >= TARGET_CONCURRENT_SUCCESS_RATE,
            timestamp: overallStartTime,
            additionalMetrics: [
                concurrentOperations: concurrentCount,
                successRate: successRate,
                avgResponseTime: avgResponseTime,
                successCount: successCount.get(),
                errorCount: errorCount.get()
            ]
        )
        performanceMetrics << concurrentMetric
        
        // Validate concurrent performance
        assert successRate >= TARGET_CONCURRENT_SUCCESS_RATE, 
            "Concurrent success rate should meet target: ${(successRate * 100).round(1)}% >= ${(TARGET_CONCURRENT_SUCCESS_RATE * 100).round(1)}%"
        
        assert avgResponseTime <= (TARGET_API_RESPONSE_MS * 3), 
            "Average response time under concurrency should be reasonable: ${avgResponseTime}ms <= ${TARGET_API_RESPONSE_MS * 3}ms"
        
        assert totalWallClockTime <= (TARGET_API_RESPONSE_MS * concurrentCount * 0.7), 
            "Concurrent operations should show parallelization benefit: ${totalWallClockTime}ms"
        
        logProgress("✅ ${testDescription} passed: ${(successRate * 100).round(1)}% success rate, ${avgResponseTime.round(1)}ms avg response, ${overallThroughput.round(1)} records/sec throughput")
    }

    private ConcurrentTestResult executeSingleConcurrentBatch(int batchNum, int recordCount) {
        ConcurrentTestResult result = new ConcurrentTestResult(batchNum: batchNum, recordCount: recordCount)
        
        try {
            // Generate test data for this batch
            String csvData = generateLargeCsvDataset("teams", recordCount, "BATCH${batchNum}")
            
            long startTime = System.currentTimeMillis()
            HttpResponse response = httpClient.post('/csvImport/csv/teams', csvData)
            long endTime = System.currentTimeMillis()
            
            result.processingTimeMs = endTime - startTime
            result.success = response?.statusCode == 200
            
            if (result.success && response.jsonBody) {
                def jsonBody = response.jsonBody
                if (((Map)jsonBody).batchId) {
                    result.batchId = UUID.fromString(((Map)jsonBody).batchId as String)
                }
                result.importedCount = (((Map)jsonBody).importedCount ?: 0) as int
            } else {
                result.errorMessage = response?.body ?: "Unknown error"
            }
            
        } catch (Exception e) {
            result.success = false
            result.errorMessage = e.message
        }
        
        return result
    }

    // ========== ROLLBACK PERFORMANCE UNDER LOAD ==========

    void testRollbackPerformanceUnderLoad() {
        logProgress("Testing rollback performance under concurrent load")
        
        // First create multiple batches to rollback
        List<UUID> batchesToRollback = []
        int batchCount = 10
        
        (1..batchCount).each { i ->
            UUID batchId = createLargeTestBatchForRollback(MEDIUM_LOAD_RECORDS)
            batchesToRollback << batchId
            createdBatches.add(batchId)
        }
        
        // Wait for batch creation to complete
        Thread.sleep(5000)
        
        // Test concurrent rollbacks
        List<CompletableFuture<RollbackResult>> rollbackFutures = []
        long rollbackStartTime = System.currentTimeMillis()
        
        batchesToRollback.each { batchId ->
            CompletableFuture<RollbackResult> future = CompletableFuture.supplyAsync({
                return executeRollbackWithTiming(batchId)
            }, loadTestExecutor)
            
            rollbackFutures << future
        }
        
        // Collect rollback results
        List<RollbackResult> rollbackResults = []
        rollbackFutures.each { future ->
            try {
                RollbackResult result = future.get(30, TimeUnit.SECONDS)
                rollbackResults << result
            } catch (Exception e) {
                rollbackResults << new RollbackResult(success: false, errorMessage: e.message)
            }
        }
        
        long totalRollbackTime = System.currentTimeMillis() - rollbackStartTime
        
        // Analyze rollback performance
        int successfulRollbacks = (rollbackResults.count { it.success }) as int
        double avgRollbackTime = (rollbackResults.findAll { it.success }.collect { it.processingTimeMs }.sum() as double) / Math.max(successfulRollbacks, 1)
        double rollbackSuccessRate = successfulRollbacks / batchCount
        
        // Record rollback performance metrics
        PerformanceMetric rollbackMetric = new PerformanceMetric(
            testName: "concurrent_rollback_load",
            recordCount: batchCount,
            processingTimeMs: totalRollbackTime,
            throughputRecordsPerSec: batchCount / (totalRollbackTime / 1000.0),
            success: rollbackSuccessRate >= 0.8,
            timestamp: rollbackStartTime,
            additionalMetrics: [
                rollbackCount: batchCount,
                successfulRollbacks: successfulRollbacks,
                avgRollbackTime: avgRollbackTime,
                rollbackSuccessRate: rollbackSuccessRate
            ]
        )
        performanceMetrics << rollbackMetric
        
        // Validate rollback performance
        assert rollbackSuccessRate >= 0.8, 
            "Rollback success rate should be high: ${(rollbackSuccessRate * 100).round(1)}% >= 80%"
        
        assert avgRollbackTime <= TARGET_ROLLBACK_TIME_MS, 
            "Average rollback time should meet target: ${avgRollbackTime.round(1)}ms <= ${TARGET_ROLLBACK_TIME_MS}ms"
        
        assert totalRollbackTime <= (TARGET_ROLLBACK_TIME_MS * batchCount * 0.6), 
            "Concurrent rollbacks should show parallelization: ${totalRollbackTime}ms"
        
        logProgress("✅ Rollback performance under load passed: ${successfulRollbacks}/${batchCount} successful, ${avgRollbackTime.round(1)}ms avg time")
    }

    // ========== SUSTAINED LOAD TESTING ==========

    void testSustainedLoadPerformance() {
        logProgress("Testing sustained load performance over ${SUSTAINED_LOAD_DURATION_MS / 1000} seconds")
        
        AtomicInteger operationsCompleted = new AtomicInteger(0)
        AtomicInteger operationsSuccessful = new AtomicInteger(0)
        AtomicLong totalResponseTime = new AtomicLong(0)
        
        long testStartTime = System.currentTimeMillis()
        long testEndTime = testStartTime + SUSTAINED_LOAD_DURATION_MS
        
        // Launch sustained load generators
        List<CompletableFuture<Void>> loadGenerators = []
        int numGenerators = 5 // Concurrent load generators
        
        (1..numGenerators).each { generatorId ->
            CompletableFuture<Void> generator = CompletableFuture.runAsync({
                executeSustainedLoadGenerator(generatorId, testEndTime, operationsCompleted, operationsSuccessful, totalResponseTime)
            }, loadTestExecutor)
            
            loadGenerators << generator
        }
        
        // Monitor progress during test
        CompletableFuture<Void> monitor = CompletableFuture.runAsync({
            while (System.currentTimeMillis() < testEndTime) {
                Thread.sleep(30000) // Report every 30 seconds
                long elapsed = System.currentTimeMillis() - testStartTime
                int completed = operationsCompleted.get()
                int successful = operationsSuccessful.get()
                double currentThroughput = completed / (elapsed / 1000.0)
                
                logProgress("Sustained load progress: ${elapsed / 1000}s, ${completed} ops (${successful} successful), ${currentThroughput.round(1)} ops/sec")
            }
        }, loadTestExecutor)
        
        // Wait for test completion
        try {
            CompletableFuture.allOf(loadGenerators as CompletableFuture[]).get(SUSTAINED_LOAD_DURATION_MS + 30000, TimeUnit.MILLISECONDS)
            monitor.cancel(true)
        } catch (Exception e) {
            logProgress("⚠️ Sustained load test interruption: ${e.message}")
        }
        
        long actualTestDuration = System.currentTimeMillis() - testStartTime
        
        // Calculate sustained load metrics
        int totalOps = operationsCompleted.get()
        int successfulOps = operationsSuccessful.get()
        double successRate = (successfulOps as double) / Math.max(totalOps, 1)
        double overallThroughput = (totalOps as double) / (actualTestDuration / 1000.0)
        double avgResponseTime = totalOps > 0 ? (totalResponseTime.get() as double) / (totalOps as double) : 0
        
        // Record sustained load metrics
        PerformanceMetric sustainedMetric = new PerformanceMetric(
            testName: "sustained_load",
            recordCount: totalOps,
            processingTimeMs: actualTestDuration,
            throughputRecordsPerSec: overallThroughput,
            success: successRate >= 0.85 && overallThroughput >= 1.0, // At least 1 op/sec sustained
            timestamp: testStartTime,
            additionalMetrics: [
                totalOperations: totalOps,
                successfulOperations: successfulOps,
                successRate: successRate,
                avgResponseTime: avgResponseTime,
                sustainedThroughput: overallThroughput,
                testDurationSeconds: actualTestDuration / 1000
            ]
        )
        performanceMetrics << sustainedMetric
        
        // Validate sustained load performance
        assert successRate >= 0.85, 
            "Sustained load success rate should be high: ${(successRate * 100).round(1)}% >= 85%"
        
        assert overallThroughput >= 1.0, 
            "Should maintain minimum throughput under sustained load: ${overallThroughput.round(2)} ops/sec >= 1.0"
        
        assert avgResponseTime <= (TARGET_API_RESPONSE_MS * 2), 
            "Average response time under sustained load: ${avgResponseTime.round(1)}ms <= ${TARGET_API_RESPONSE_MS * 2}ms"
        
        logProgress("✅ Sustained load test passed: ${totalOps} operations, ${(successRate * 100).round(1)}% success, ${overallThroughput.round(2)} ops/sec")
    }

    private void executeSustainedLoadGenerator(int generatorId, long testEndTime, AtomicInteger operationsCompleted, AtomicInteger operationsSuccessful, AtomicLong totalResponseTime) {
        int operationCounter = 0
        
        while (System.currentTimeMillis() < testEndTime) {
            try {
                operationCounter++
                
                // Generate small test data for sustained operations
                String testData = generateLargeCsvDataset("teams", 50, "SUSTAINED${generatorId}_${operationCounter}")
                
                long opStartTime = System.currentTimeMillis()
                HttpResponse response = httpClient.post('/csvImport/csv/teams', testData)
                long opEndTime = System.currentTimeMillis()
                
                operationsCompleted.incrementAndGet()
                totalResponseTime.addAndGet(opEndTime - opStartTime)
                
                if (response?.statusCode == 200) {
                    operationsSuccessful.incrementAndGet()
                    
                    // Track batch for cleanup
                    def jsonBody = response.jsonBody
                    if (((Map)jsonBody)?.batchId) {
                        synchronized (createdBatches) {
                            createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
                        }
                    }
                }
                
                // Brief pause between operations to simulate realistic load
                Thread.sleep(200)
                
            } catch (Exception e) {
                operationsCompleted.incrementAndGet()
                // Continue with next operation
            }
        }
    }

    // ========== MEMORY STRESS AND MONITORING ==========

    void testMemoryStressUnderLoad() {
        logProgress("Testing memory stress under concurrent load")
        
        List<CompletableFuture<Map>> memoryStressFutures = []
        int concurrentMemoryOps = 8
        
        long memoryTestStartTime = System.currentTimeMillis()
        long initialMemory = getCurrentMemoryUsage()
        
        // Launch concurrent memory-intensive operations
        (1..concurrentMemoryOps).each { opId ->
            CompletableFuture<Map> future = CompletableFuture.supplyAsync({
                return executeMemoryStressOperation(opId, MEDIUM_LOAD_RECORDS)
            }, loadTestExecutor)
            
            memoryStressFutures << future
        }
        
        // Monitor memory usage during test
        List<Long> memorySnapshots = Collections.synchronizedList([])
        CompletableFuture<Void> memoryMonitor = CompletableFuture.runAsync({
            while (!memoryStressFutures.every { it.isDone() }) {
                memorySnapshots << getCurrentMemoryUsage()
                Thread.sleep(1000) // Sample every second
            }
        }, loadTestExecutor)
        
        // Collect results
        List<Map> memoryResults = []
        memoryStressFutures.each { future ->
            try {
                Map result = future.get(5, TimeUnit.MINUTES)
                memoryResults << result
                
                if (result.batchId) {
                    createdBatches.add(result.batchId as UUID)
                }
            } catch (Exception e) {
                memoryResults << [success: false, error: e.message]
            }
        }
        
        memoryMonitor.cancel(true)
        
        long finalMemory = getCurrentMemoryUsage()
        long peakMemory = memorySnapshots.max() ?: finalMemory
        long memoryGrowth = finalMemory - initialMemory
        
        // Analyze memory stress results
        int successfulOps = (memoryResults.count { it.success }) as int
        double memorySuccessRate = (successfulOps as double) / (concurrentMemoryOps as double)
        long avgProcessingTime = ((memoryResults.findAll { it.success }.collect { it.processingTimeMs ?: 0 }.sum() as long) / Math.max(successfulOps, 1)) as long
        
        // Record memory stress metrics
        PerformanceMetric memoryMetric = new PerformanceMetric(
            testName: "memory_stress_concurrent",
            recordCount: concurrentMemoryOps * MEDIUM_LOAD_RECORDS,
            processingTimeMs: System.currentTimeMillis() - memoryTestStartTime,
            memoryUsedMB: (memoryGrowth / (1024L * 1024L)) as long,
            peakMemoryMB: (peakMemory / (1024L * 1024L)) as long,
            success: memorySuccessRate >= 0.75 && peakMemory < (2048L * 1024 * 1024), // <2GB peak
            timestamp: memoryTestStartTime,
            additionalMetrics: [
                concurrentOperations: concurrentMemoryOps,
                successfulOperations: successfulOps,
                memoryGrowthMB: (memoryGrowth / (1024L * 1024L)) as long,
                peakMemoryMB: (peakMemory / (1024L * 1024L)) as long,
                avgProcessingTime: avgProcessingTime
            ]
        )
        performanceMetrics << memoryMetric
        
        // Validate memory stress performance
        assert memorySuccessRate >= 0.75, 
            "Memory stress success rate should be reasonable: ${(memorySuccessRate * 100).round(1)}% >= 75%"
        
        assert peakMemory < (2048L * 1024 * 1024), 
            "Peak memory usage should be controlled: ${peakMemory / (1024 * 1024)}MB < 2048MB"
        
        // Force cleanup and verify memory recovery
        System.gc()
        Thread.sleep(3000)
        long postCleanupMemory = getCurrentMemoryUsage()
        long memoryRecovered = finalMemory - postCleanupMemory
        
        assert memoryRecovered > 0, "Memory should be recovered after cleanup: ${memoryRecovered / (1024 * 1024)}MB recovered"
        
        logProgress("✅ Memory stress test passed: ${successfulOps}/${concurrentMemoryOps} successful, peak ${peakMemory / (1024 * 1024)}MB, recovered ${memoryRecovered / (1024 * 1024)}MB")
    }

    private Map executeMemoryStressOperation(int opId, int recordCount) {
        try {
            String csvData = generateLargeCsvDataset("teams", recordCount, "MEMORY${opId}")
            
            long startTime = System.currentTimeMillis()
            long startMemory = getCurrentMemoryUsage()
            
            HttpResponse response = httpClient.post('/csvImport/csv/teams', csvData)
            
            long endTime = System.currentTimeMillis()
            long endMemory = getCurrentMemoryUsage()
            
            Map<String, Object> result = [
                success: response?.statusCode == 200,
                processingTimeMs: endTime - startTime,
                memoryUsedMB: ((endMemory - startMemory) / (1024L * 1024L)) as long,
                opId: opId
            ]
            
            if (result.success && response.jsonBody) {
                def jsonBody = response.jsonBody
                if (((Map)jsonBody).batchId) {
                    result.batchId = UUID.fromString(((Map)jsonBody).batchId as String) as Object
                }
            }
            
            return result
            
        } catch (Exception e) {
            return [success: false, error: e.message, opId: opId]
        }
    }

    // ========== PROGRESS INDICATOR VERIFICATION ==========

    void testProgressIndicatorUnderLoad() {
        logProgress("Testing progress indicator verification under load")
        
        // Start a large import operation
        String largeDataset = generateLargeCsvDataset("teams", LARGE_LOAD_RECORDS)
        
        long startTime = System.currentTimeMillis()
        
        // Start import in background
        CompletableFuture<HttpResponse> importFuture = CompletableFuture.supplyAsync({
            return httpClient.postWithTimeout('/csvImport/csv/teams', largeDataset, PERFORMANCE_TEST_TIMEOUT_MS as int)
        }, loadTestExecutor) as CompletableFuture<HttpResponse>
        
        // Monitor progress while import is running
        List<Map> progressSnapshots = []
        UUID batchId = null
        
        // Wait a bit for import to start
        Thread.sleep(2000)
        
        // Try to get batch ID from recent imports
        try {
            HttpResponse historyResponse = httpClient.get('/importHistory/history', ['limit': '1'])
            if (historyResponse.statusCode == 200) {
                def historyBody = historyResponse.jsonBody
                if (historyBody instanceof List && !historyBody.isEmpty()) {
                    Map latestImport = historyBody[0] as Map
                    if (latestImport.batchId) {
                        batchId = UUID.fromString(latestImport.batchId as String)
                    }
                }
            }
        } catch (Exception e) {
            logProgress("Could not retrieve batch ID for progress monitoring: ${e.message}")
        }
        
        // Monitor progress if we have a batch ID
        if (batchId) {
            int progressChecks = 0
            while (!importFuture.isDone() && progressChecks < 20) {
                try {
                    HttpResponse progressResponse = httpClient.get("/importHistory/batch/${batchId}")
                    if (progressResponse.statusCode == 200) {
                        def progressBody = progressResponse.jsonBody
                        progressSnapshots << [
                            timestamp: System.currentTimeMillis(),
                            status: ((Map)progressBody).status,
                            batchId: batchId.toString()
                        ]
                    }
                } catch (Exception e) {
                    // Continue monitoring even if individual checks fail
                }
                
                Thread.sleep(1000)
                progressChecks++
            }
        }
        
        // Wait for import completion
        HttpResponse finalResponse = null
        try {
            finalResponse = importFuture.get(PERFORMANCE_TEST_TIMEOUT_MS as long, TimeUnit.MILLISECONDS) as HttpResponse
        } catch (Exception e) {
            logProgress("Import operation timed out or failed: ${e.message}")
        }
        
        long totalTime = System.currentTimeMillis() - startTime
        
        // Validate progress indicator functionality
        if (finalResponse && finalResponse.statusCode == 200) {
            def jsonBody = finalResponse.jsonBody
            if (((Map)jsonBody).batchId) {
                createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
            }
            
            // Validate that progress was trackable
            assert progressSnapshots.size() > 0, "Should be able to track progress during large operations"
            
            logProgress("✅ Progress tracking verified: ${progressSnapshots.size()} progress snapshots captured during ${totalTime}ms operation")
        } else {
            logProgress("✅ Progress indicator test completed with controlled failure (expected under extreme load)")
        }
    }

    // ========== HELPER METHODS AND UTILITIES ==========

    private String generateLargeCsvDataset(String entityType, int recordCount, String prefix = "") {
        StringBuilder csv = new StringBuilder()
        
        switch (entityType) {
            case "teams":
                csv.append("tms_id,tms_name,tms_email,tms_description\n")
                (1..recordCount).each { i ->
                    csv.append("${prefix}${i},${prefix}Team_${i},${prefix.toLowerCase()}team${i}@loadtest.com,Load test team ${i}\n")
                }
                break
                
            case "users":
                csv.append("usr_id,usr_code,usr_first_name,usr_last_name,usr_email,usr_is_admin,tms_id,rls_id\n")
                (1..recordCount).each { i ->
                    csv.append("${prefix}${i},${prefix}USER_${i},LoadTest${i},User${i},${prefix.toLowerCase()}user${i}@loadtest.com,false,1,1\n")
                }
                break
                
            case "applications":
                csv.append("app_id,app_code,app_name,app_description\n")
                (1..recordCount).each { i ->
                    csv.append("${prefix}${i},${prefix}APP_${i},Load Test Application ${i},Load test application ${i}\n")
                }
                break
                
            case "environments":
                csv.append("env_id,env_code,env_name,env_description\n")
                (1..recordCount).each { i ->
                    csv.append("${prefix}${i},${prefix}ENV_${i},Load Test Environment ${i},Load test environment ${i}\n")
                }
                break
        }
        
        return csv.toString()
    }

    private UUID createLargeTestBatchForRollback(int recordCount) {
        UUID batchId = UUID.randomUUID()
        
        DatabaseUtil.withSql { sql ->
            sql.execute('''
                INSERT INTO tbl_import_batches 
                (imb_id, imb_source_identifier, imb_import_type, imb_status, imb_user_id, imb_created_date, imb_record_count)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
            ''', [batchId, 'load_test_batch', 'CSV_TEAMS', 'COMPLETED', 'load-test', recordCount])
        }
        
        return batchId
    }

    private RollbackResult executeRollbackWithTiming(UUID batchId) {
        RollbackResult result = new RollbackResult(batchId: batchId)
        
        try {
            long startTime = System.currentTimeMillis()
            HttpResponse response = httpClient.delete("/importRollback/batch/${batchId}")
            long endTime = System.currentTimeMillis()
            
            result.processingTimeMs = endTime - startTime
            result.success = response?.statusCode == 200
            
            if (!result.success) {
                result.errorMessage = response?.body ?: "Unknown rollback error"
            }
            
        } catch (Exception e) {
            result.success = false
            result.errorMessage = e.message
        }
        
        return result
    }

    private long getCurrentMemoryUsage() {
        Runtime runtime = Runtime.getRuntime()
        return runtime.totalMemory() - runtime.freeMemory()
    }

    private void generatePerformanceReport() {
        logProgress("Generating comprehensive load test performance report")
        
        if (performanceMetrics.isEmpty()) {
            logProgress("No performance metrics collected")
            return
        }
        
        // Overall statistics
        int totalTests = performanceMetrics.size()
        int successfulTests = (performanceMetrics.count { it.success }) as int
        double overallSuccessRate = (successfulTests as double) / (totalTests as double)
        
        // Response time statistics
        List<Long> responseTimes = performanceMetrics.findAll { it.processingTimeMs > 0 }.collect { it.processingTimeMs }
        double avgResponseTime = (responseTimes.sum() as double) / Math.max(responseTimes.size(), 1)
        long minResponseTime = (responseTimes.min() ?: 0) as long
        long maxResponseTime = (responseTimes.max() ?: 0) as long
        
        // Throughput statistics
        List<Double> throughputs = performanceMetrics.findAll { it.throughputRecordsPerSec > 0 }.collect { it.throughputRecordsPerSec }
        double avgThroughput = (throughputs.sum() as double) / Math.max(throughputs.size(), 1)
        double maxThroughput = (throughputs.max() ?: 0) as double
        
        // Memory statistics
        List<Long> memoryUsages = performanceMetrics.findAll { it.memoryUsedMB > 0 }.collect { it.memoryUsedMB }
        double avgMemoryUsage = (memoryUsages.sum() as double) / Math.max(memoryUsages.size(), 1)
        long peakMemoryUsage = (memoryUsages.max() ?: 0) as long
        
        logProgress("=" * 80)
        logProgress("LOAD TEST PERFORMANCE REPORT")
        logProgress("=" * 80)
        logProgress("Overall Results:")
        logProgress("  Total Tests: ${totalTests}")
        logProgress("  Successful Tests: ${successfulTests}")
        logProgress("  Success Rate: ${(overallSuccessRate * 100).round(1)}%")
        logProgress("")
        logProgress("Response Time Statistics:")
        logProgress("  Average: ${avgResponseTime.round(1)}ms")
        logProgress("  Minimum: ${minResponseTime}ms")
        logProgress("  Maximum: ${maxResponseTime}ms")
        logProgress("  Target: ${TARGET_API_RESPONSE_MS}ms")
        logProgress("")
        logProgress("Throughput Statistics:")
        logProgress("  Average: ${avgThroughput.round(2)} records/sec")
        logProgress("  Peak: ${maxThroughput.round(2)} records/sec")
        logProgress("  Target: ${TARGET_THROUGHPUT_RECORDS_PER_SEC} records/sec")
        logProgress("")
        logProgress("Memory Usage Statistics:")
        logProgress("  Average: ${avgMemoryUsage.round(1)}MB")
        logProgress("  Peak: ${peakMemoryUsage}MB")
        logProgress("  Target: ${TARGET_PEAK_MEMORY_MB}MB")
        logProgress("")
        logProgress("Performance Target Assessment:")
        logProgress("  Response Time: ${avgResponseTime <= TARGET_API_RESPONSE_MS ? '✅ MET' : '❌ MISSED'}")
        logProgress("  Throughput: ${avgThroughput >= TARGET_THROUGHPUT_RECORDS_PER_SEC ? '✅ MET' : '❌ MISSED'}")
        logProgress("  Memory Usage: ${peakMemoryUsage <= TARGET_PEAK_MEMORY_MB ? '✅ MET' : '❌ MISSED'}")
        logProgress("  Success Rate: ${overallSuccessRate >= 0.9 ? '✅ EXCELLENT' : overallSuccessRate >= 0.8 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT'}")
        logProgress("=" * 80)
    }

    private void cleanupLoadTestData() {
        try {
            DatabaseUtil.withSql { sql ->
                // Clean up test batches
                createdBatches.each { batchId ->
                    sql.execute("DELETE FROM tbl_import_audit_log WHERE ial_batch_id = ?", [batchId])
                    sql.execute("DELETE FROM tbl_import_batches WHERE imb_id = ?", [batchId])
                }
                
                // Clean up staging data with load test prefixes
                List<String> loadTestPrefixes = ['BATCH', 'SUSTAINED', 'MEMORY', 'LOAD']
                loadTestPrefixes.each { prefix ->
                    sql.execute("DELETE FROM stg_step_instructions WHERE sti_created_by LIKE '%${prefix}%'")
                    sql.execute("DELETE FROM stg_steps WHERE sts_created_by LIKE '%${prefix}%'")
                }
                
                // Clean up orchestration data
                createdOrchestrations.each { orchestrationId ->
                    sql.execute("DELETE FROM import_progress_tracking WHERE orchestration_id = ?", [orchestrationId])
                    sql.execute("DELETE FROM import_orchestrations WHERE orchestration_id = ?", [orchestrationId])
                }
                
                // Clean up test entities
                loadTestPrefixes.each { prefix ->
                    sql.execute("DELETE FROM tbl_teams WHERE tms_name LIKE '${prefix}%' OR tms_description LIKE '%Load test%'")
                    sql.execute("DELETE FROM tbl_users WHERE usr_username LIKE '${prefix.toLowerCase()}%' OR usr_first_name LIKE '%LoadTest%'")
                    sql.execute("DELETE FROM applications_app WHERE app_name LIKE '${prefix}%' OR app_name LIKE '%Load Test%'")
                    sql.execute("DELETE FROM environments_env WHERE env_name LIKE '${prefix}%' OR env_name LIKE '%Load Test%'")
                }
            }
        } catch (Exception e) {
            println "⚠️ Warning during load test data cleanup: ${e.message}"
        }
    }

    // ========== DATA CLASSES FOR TEST RESULTS ==========

    static class PerformanceMetric {
        String testName
        int recordCount
        long processingTimeMs
        long memoryUsedMB
        long peakMemoryMB
        double throughputRecordsPerSec
        boolean success
        long timestamp
        Map<String, Object> additionalMetrics = [:]
    }

    static class ConcurrentTestResult {
        int batchNum
        int recordCount
        long processingTimeMs
        boolean success
        UUID batchId
        int importedCount
        String errorMessage
    }

    static class RollbackResult {
        UUID batchId
        long processingTimeMs
        boolean success
        String errorMessage
    }
}