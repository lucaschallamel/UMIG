package umig.tests.performance

import umig.service.ImportService
import umig.service.CsvImportService
import umig.service.PerformanceOptimizedImportService
import umig.service.PerformanceOptimizedCsvImportService
import umig.service.ImportPerformanceMonitoringService
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import org.slf4j.Logger
import org.slf4j.LoggerFactory
import java.util.concurrent.CompletableFuture
import java.util.concurrent.TimeUnit

/**
 * Comprehensive Performance Benchmark Suite for US-034 Import Optimizations
 * 
 * Tests and validates performance improvements including:
 * - Memory usage reduction (target: 85% reduction)
 * - Processing speed improvement (target: 4x faster)
 * - Chunked processing effectiveness
 * - CSV streaming parser performance
 * - Async promotion performance
 * - Memory usage monitoring
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Performance Enhancement
 */
class ImportPerformanceBenchmarkSuite {
    
    private static final Logger log = LoggerFactory.getLogger(ImportPerformanceBenchmarkSuite.class)
    
    // Benchmark configuration
    private static final int SMALL_DATASET_SIZE = 100
    private static final int MEDIUM_DATASET_SIZE = 1000
    private static final int LARGE_DATASET_SIZE = 5000
    private static final int XLARGE_DATASET_SIZE = 10000
    
    // Performance targets
    private static final double TARGET_MEMORY_REDUCTION = 0.85 // 85% reduction
    private static final double TARGET_SPEED_IMPROVEMENT = 4.0 // 4x faster
    private static final long TARGET_MAX_MEMORY_MB = 100 // <100MB for 10,000 records
    private static final double TARGET_MIN_THROUGHPUT = 500.0 // 500 records/sec minimum
    
    private ImportService originalService
    private PerformanceOptimizedImportService optimizedService
    private CsvImportService originalCsvService
    private PerformanceOptimizedCsvImportService optimizedCsvService
    private ImportPerformanceMonitoringService monitoringService
    
    /**
     * Benchmark result container
     */
    static class BenchmarkResult {
        String testName
        String service
        int datasetSize
        long processingTimeMs
        long memoryUsedMB
        long peakMemoryMB
        int recordsProcessed
        int successCount
        int errorCount
        double throughputRecordsPerSec
        boolean targetsMet
        Map<String, Object> additionalMetrics = [:]
        
        Map toMap() {
            return [
                testName: testName,
                service: service,
                datasetSize: datasetSize,
                processingTimeMs: processingTimeMs,
                memoryUsedMB: memoryUsedMB,
                peakMemoryMB: peakMemoryMB,
                recordsProcessed: recordsProcessed,
                successCount: successCount,
                errorCount: errorCount,
                throughputRecordsPerSec: throughputRecordsPerSec,
                targetsMet: targetsMet,
                additionalMetrics: additionalMetrics
            ]
        }
    }
    
    /**
     * Performance comparison result
     */
    static class PerformanceComparison {
        BenchmarkResult original
        BenchmarkResult optimized
        double memoryImprovement
        double speedImprovement
        boolean targetsAchieved
        List<String> observations = []
        
        Map toMap() {
            return [
                original: original.toMap(),
                optimized: optimized.toMap(),
                memoryImprovement: memoryImprovement,
                speedImprovement: speedImprovement,
                targetsAchieved: targetsAchieved,
                observations: observations
            ]
        }
    }
    
    ImportPerformanceBenchmarkSuite() {
        this.originalService = new ImportService()
        this.optimizedService = new PerformanceOptimizedImportService()
        this.originalCsvService = new CsvImportService()
        this.optimizedCsvService = new PerformanceOptimizedCsvImportService()
        this.monitoringService = new ImportPerformanceMonitoringService()
        
        log.info("Performance Benchmark Suite initialized")
    }
    
    /**
     * Run complete benchmark suite with all test scenarios
     */
    Map runCompleteBenchmarkSuite() {
        log.info("Starting comprehensive performance benchmark suite")
        
        Map results = [
            suiteStartTime: System.currentTimeMillis(),
            jsonImportBenchmarks: [],
            csvImportBenchmarks: [],
            memoryUsageBenchmarks: [],
            scalabilityBenchmarks: [],
            overallSummary: [:]
        ]
        
        try {
            // JSON Import Benchmarks
            log.info("Running JSON import performance benchmarks...")
            results.jsonImportBenchmarks = runJsonImportBenchmarks()
            
            // CSV Import Benchmarks  
            log.info("Running CSV import performance benchmarks...")
            results.csvImportBenchmarks = runCsvImportBenchmarks()
            
            // Memory Usage Benchmarks
            log.info("Running memory usage benchmarks...")
            results.memoryUsageBenchmarks = runMemoryUsageBenchmarks()
            
            // Scalability Benchmarks
            log.info("Running scalability benchmarks...")
            results.scalabilityBenchmarks = runScalabilityBenchmarks()
            
            // Generate overall summary
            results.overallSummary = generateOverallSummary(results)
            
            log.info("Complete benchmark suite finished in ${System.currentTimeMillis() - results.suiteStartTime}ms")
            
        } catch (Exception e) {
            log.error("Benchmark suite failed: ${e.message}", e)
            results.error = e.message
        }
        
        return results
    }
    
    /**
     * JSON Import Performance Benchmarks
     */
    Map runJsonImportBenchmarks() {
        Map results = [
            smallDataset: [],
            mediumDataset: [],
            largeDataset: []
        ]
        
        // Small dataset (100 records)
        results.smallDataset = benchmarkJsonImport(SMALL_DATASET_SIZE, "small")
        
        // Medium dataset (1,000 records) 
        results.mediumDataset = benchmarkJsonImport(MEDIUM_DATASET_SIZE, "medium")
        
        // Large dataset (5,000 records)
        results.largeDataset = benchmarkJsonImport(LARGE_DATASET_SIZE, "large")
        
        return results
    }
    
    /**
     * CSV Import Performance Benchmarks
     */
    Map runCsvImportBenchmarks() {
        Map results = [
            teamsImport: [],
            usersImport: [],
            applicationsImport: [],
            environmentsImport: []
        ]
        
        // Test each CSV entity type
        results.teamsImport = benchmarkCsvImport("teams", MEDIUM_DATASET_SIZE)
        results.usersImport = benchmarkCsvImport("users", MEDIUM_DATASET_SIZE)
        results.applicationsImport = benchmarkCsvImport("applications", MEDIUM_DATASET_SIZE)
        results.environmentsImport = benchmarkCsvImport("environments", MEDIUM_DATASET_SIZE)
        
        return results
    }
    
    /**
     * Memory Usage Benchmarks
     */
    Map runMemoryUsageBenchmarks() {
        Map results = [
            memoryStressTesting: [],
            garbageCollectionImpact: [],
            peakMemoryAnalysis: []
        ]
        
        // Memory stress testing with very large datasets
        results.memoryStressTesting = benchmarkMemoryUsage(XLARGE_DATASET_SIZE)
        
        // GC impact analysis
        results.garbageCollectionImpact = analyzeGarbageCollectionImpact()
        
        // Peak memory analysis
        results.peakMemoryAnalysis = analyzePeakMemoryUsage()
        
        return results
    }
    
    /**
     * Scalability Benchmarks
     */
    Map runScalabilityBenchmarks() {
        Map results = [
            throughputScaling: [],
            concurrentProcessing: [],
            chunkSizeOptimization: []
        ]
        
        // Test throughput at different scales
        [100, 500, 1000, 2000, 5000].each { size ->
            results.throughputScaling << benchmarkThroughputScaling(size)
        }
        
        // Concurrent processing benchmark
        results.concurrentProcessing = benchmarkConcurrentProcessing()
        
        // Chunk size optimization
        results.chunkSizeOptimization = benchmarkChunkSizeOptimization()
        
        return results
    }
    
    /**
     * Benchmark JSON import performance comparison
     */
    private PerformanceComparison benchmarkJsonImport(int recordCount, String datasetSize) {
        log.info("Benchmarking JSON import: ${datasetSize} dataset (${recordCount} records)")
        
        // Generate test data
        List<Map> testData = generateJsonTestData(recordCount)
        
        // Benchmark original service
        BenchmarkResult originalResult = benchmarkImportService(
            originalService, 
            testData, 
            "original-json-${datasetSize}",
            "JSON_BATCH"
        )
        
        // Benchmark optimized service
        BenchmarkResult optimizedResult = benchmarkImportService(
            optimizedService, 
            testData, 
            "optimized-json-${datasetSize}",
            "JSON_BATCH_OPTIMIZED"
        )
        
        return compareResults(originalResult, optimizedResult, "JSON Import ${datasetSize}")
    }
    
    /**
     * Benchmark CSV import performance comparison
     */
    private PerformanceComparison benchmarkCsvImport(String entityType, int recordCount) {
        log.info("Benchmarking CSV import: ${entityType} (${recordCount} records)")
        
        // Generate test CSV data
        String testCsvData = generateCsvTestData(entityType, recordCount)
        
        // Benchmark original CSV service
        BenchmarkResult originalResult = benchmarkCsvService(
            originalCsvService,
            testCsvData,
            entityType,
            "original-csv-${entityType}",
            recordCount
        )
        
        // Benchmark optimized CSV service  
        BenchmarkResult optimizedResult = benchmarkCsvService(
            optimizedCsvService,
            testCsvData,
            entityType,
            "optimized-csv-${entityType}",
            recordCount
        )
        
        return compareResults(originalResult, optimizedResult, "CSV Import ${entityType}")
    }
    
    /**
     * Benchmark memory usage with large datasets
     */
    private Map benchmarkMemoryUsage(int recordCount) {
        log.info("Benchmarking memory usage with ${recordCount} records")
        
        Map results = [:]
        
        // Force GC before test
        System.gc()
        Thread.sleep(1000)
        
        long baselineMemory = getCurrentMemoryUsage()
        
        // Test with original service
        List<Map> testData = generateJsonTestData(recordCount)
        
        long startMemory = getCurrentMemoryUsage()
        long startTime = System.currentTimeMillis()
        
        Map originalResult = originalService.importBatch(testData, "benchmark-user")
        
        long endTime = System.currentTimeMillis()
        long endMemory = getCurrentMemoryUsage()
        
        results.original = [
            memoryUsedMB: (endMemory - startMemory) / 1024 / 1024,
            processingTimeMs: endTime - startTime,
            recordsProcessed: recordCount,
            success: originalResult.successCount > 0
        ]
        
        // Force GC and wait
        System.gc()
        Thread.sleep(2000)
        
        // Test with optimized service
        startMemory = getCurrentMemoryUsage()
        startTime = System.currentTimeMillis()
        
        Map optimizedResult = optimizedService.importBatchOptimized(testData, "benchmark-user")
        
        endTime = System.currentTimeMillis()
        endMemory = getCurrentMemoryUsage()
        
        results.optimized = [
            memoryUsedMB: (endMemory - startMemory) / 1024 / 1024,
            processingTimeMs: endTime - startTime,
            recordsProcessed: recordCount,
            success: optimizedResult.successCount > 0
        ]
        
        // Calculate improvement
        results.memoryImprovement = results.original.memoryUsedMB > 0 ? 
            1.0 - (results.optimized.memoryUsedMB / results.original.memoryUsedMB) : 0.0
        
        results.speedImprovement = results.optimized.processingTimeMs > 0 ?
            results.original.processingTimeMs / results.optimized.processingTimeMs : 1.0
        
        return results
    }
    
    /**
     * Analyze garbage collection impact
     */
    private Map analyzeGarbageCollectionImpact() {
        log.info("Analyzing garbage collection impact")
        
        Map results = [:]
        
        // Get GC metrics before test
        def gcBefore = getGCMetrics()
        
        // Run memory-intensive operation
        List<Map> largeDataset = generateJsonTestData(LARGE_DATASET_SIZE)
        
        long startTime = System.currentTimeMillis()
        Map importResult = optimizedService.importBatchOptimized(largeDataset, "gc-test-user")
        long endTime = System.currentTimeMillis()
        
        // Get GC metrics after test
        def gcAfter = getGCMetrics()
        
        results.gcCollections = gcAfter.totalCollections - gcBefore.totalCollections
        results.gcTimeMs = gcAfter.totalTimeMs - gcBefore.totalTimeMs
        results.processingTimeMs = endTime - startTime
        results.gcOverheadPercent = (results.gcTimeMs / results.processingTimeMs) * 100
        results.recordsProcessed = LARGE_DATASET_SIZE
        
        return results
    }
    
    /**
     * Analyze peak memory usage patterns
     */
    private Map analyzePeakMemoryUsage() {
        log.info("Analyzing peak memory usage patterns")
        
        Map results = [
            memorySnapshots: [],
            peakMemoryMB: 0,
            memoryEfficiencyScore: 0
        ]
        
        // Monitor memory during processing
        List<Map> testData = generateJsonTestData(XLARGE_DATASET_SIZE)
        
        CompletableFuture<Void> monitoringTask = CompletableFuture.runAsync({
            while (!Thread.currentThread().isInterrupted()) {
                long currentMemory = getCurrentMemoryUsage() / 1024 / 1024
                results.memorySnapshots << [
                    timestamp: System.currentTimeMillis(),
                    memoryUsageMB: currentMemory
                ]
                results.peakMemoryMB = Math.max(results.peakMemoryMB, currentMemory)
                
                try {
                    Thread.sleep(500) // Sample every 500ms
                } catch (InterruptedException e) {
                    break
                }
            }
        })
        
        // Run import
        optimizedService.importBatchOptimized(testData, "peak-memory-test")
        
        // Stop monitoring
        monitoringTask.cancel(true)
        
        // Calculate memory efficiency score (lower peak = better score)
        results.memoryEfficiencyScore = Math.max(0, 100 - (results.peakMemoryMB / TARGET_MAX_MEMORY_MB) * 100)
        
        return results
    }
    
    /**
     * Benchmark throughput scaling
     */
    private Map benchmarkThroughputScaling(int recordCount) {
        List<Map> testData = generateJsonTestData(recordCount)
        
        long startTime = System.currentTimeMillis()
        Map result = optimizedService.importBatchOptimized(testData, "throughput-test")
        long endTime = System.currentTimeMillis()
        
        double throughput = recordCount * 1000.0 / (endTime - startTime)
        
        return [
            recordCount: recordCount,
            processingTimeMs: endTime - startTime,
            throughputRecordsPerSec: throughput,
            memoryUsedMB: getCurrentMemoryUsage() / 1024 / 1024,
            targetsMetThroughput: throughput >= TARGET_MIN_THROUGHPUT
        ]
    }
    
    /**
     * Benchmark concurrent processing
     */
    private Map benchmarkConcurrentProcessing() {
        log.info("Benchmarking concurrent processing capabilities")
        
        int numTasks = 4
        int recordsPerTask = 1000
        
        List<CompletableFuture<Map>> futures = []
        long startTime = System.currentTimeMillis()
        
        // Start concurrent import tasks
        (1..numTasks).each { taskNum ->
            CompletableFuture<Map> future = CompletableFuture.supplyAsync({
                List<Map> taskData = generateJsonTestData(recordsPerTask)
                return optimizedService.importBatchOptimized(taskData, "concurrent-test-${taskNum}")
            })
            futures << future
        }
        
        // Wait for all to complete
        List<Map> results = futures.collect { future ->
            future.get(5, TimeUnit.MINUTES)
        }
        
        long endTime = System.currentTimeMillis()
        
        int totalRecords = numTasks * recordsPerTask
        int totalSuccess = results.collect { it.successCount }.sum()
        
        return [
            concurrentTasks: numTasks,
            recordsPerTask: recordsPerTask,
            totalRecords: totalRecords,
            totalSuccessful: totalSuccess,
            totalProcessingTimeMs: endTime - startTime,
            overallThroughput: totalRecords * 1000.0 / (endTime - startTime),
            concurrencyEfficiency: (totalRecords / (endTime - startTime)) / (recordsPerTask / 1000.0)
        ]
    }
    
    /**
     * Benchmark chunk size optimization
     */
    private Map benchmarkChunkSizeOptimization() {
        log.info("Benchmarking chunk size optimization")
        
        List<Map> testData = generateJsonTestData(LARGE_DATASET_SIZE)
        Map results = [:]
        
        // Test different chunk sizes
        [250, 500, 1000, 2000, 5000].each { chunkSize ->
            Map options = [chunkSize: chunkSize]
            
            long startTime = System.currentTimeMillis()
            long startMemory = getCurrentMemoryUsage()
            
            Map result = optimizedService.importBatchOptimized(testData, "chunk-test", options)
            
            long endTime = System.currentTimeMillis()
            long endMemory = getCurrentMemoryUsage()
            
            results[chunkSize] = [
                chunkSize: chunkSize,
                processingTimeMs: endTime - startTime,
                memoryUsedMB: (endMemory - startMemory) / 1024 / 1024,
                throughput: LARGE_DATASET_SIZE * 1000.0 / (endTime - startTime),
                successCount: result.successCount
            ]
            
            // Allow memory cleanup between tests
            System.gc()
            Thread.sleep(1000)
        }
        
        return results
    }
    
    /**
     * Benchmark individual service
     */
    private BenchmarkResult benchmarkImportService(def service, List<Map> testData, String testName, String operation) {
        BenchmarkResult result = new BenchmarkResult()
        result.testName = testName
        result.service = service.class.simpleName
        result.datasetSize = testData.size()
        
        // Force GC before test
        System.gc()
        Thread.sleep(500)
        
        long startTime = System.currentTimeMillis()
        long startMemory = getCurrentMemoryUsage()
        long baselineMemory = startMemory
        
        try {
            Map importResult
            if (service instanceof PerformanceOptimizedImportService) {
                importResult = service.importBatchOptimized(testData, "benchmark-user")
            } else {
                importResult = service.importBatch(testData, "benchmark-user")
            }
            
            long endTime = System.currentTimeMillis()
            long endMemory = getCurrentMemoryUsage()
            
            result.processingTimeMs = endTime - startTime
            result.memoryUsedMB = (endMemory - baselineMemory) / 1024 / 1024
            result.recordsProcessed = testData.size()
            result.successCount = importResult.successCount ?: 0
            result.errorCount = importResult.failureCount ?: 0
            result.throughputRecordsPerSec = result.processingTimeMs > 0 ? 
                (result.recordsProcessed * 1000.0) / result.processingTimeMs : 0
            
            // Check if targets are met
            result.targetsMet = result.memoryUsedMB <= TARGET_MAX_MEMORY_MB && 
                               result.throughputRecordsPerSec >= TARGET_MIN_THROUGHPUT
            
            // Get peak memory from performance metrics if available
            if (service instanceof PerformanceOptimizedImportService) {
                def metrics = service.getOverallPerformanceMetrics()
                result.peakMemoryMB = metrics.memoryPeakUsageMB
            } else {
                result.peakMemoryMB = result.memoryUsedMB
            }
            
            // Record performance sample
            monitoringService.recordPerformanceSample(
                operation,
                result.recordsProcessed,
                result.processingTimeMs,
                result.errorCount
            )
            
        } catch (Exception e) {
            log.error("Benchmark failed for ${testName}: ${e.message}", e)
            result.errorCount = 1
            result.additionalMetrics.error = e.message
        }
        
        return result
    }
    
    /**
     * Benchmark CSV service
     */
    private BenchmarkResult benchmarkCsvService(def service, String csvData, String entityType, String testName, int expectedRecords) {
        BenchmarkResult result = new BenchmarkResult()
        result.testName = testName
        result.service = service.class.simpleName
        result.datasetSize = expectedRecords
        
        // Force GC before test
        System.gc()
        Thread.sleep(500)
        
        long startTime = System.currentTimeMillis()
        long startMemory = getCurrentMemoryUsage()
        
        try {
            Map importResult
            
            switch (entityType) {
                case "teams":
                    importResult = service instanceof PerformanceOptimizedCsvImportService ?
                        service.importTeamsOptimized(csvData, "benchmark.csv", "benchmark-user") :
                        service.importTeams(csvData, "benchmark.csv", "benchmark-user")
                    break
                case "users":
                    importResult = service instanceof PerformanceOptimizedCsvImportService ?
                        service.importUsersOptimized(csvData, "benchmark.csv", "benchmark-user") :
                        service.importUsers(csvData, "benchmark.csv", "benchmark-user")
                    break
                case "applications":
                    importResult = service instanceof PerformanceOptimizedCsvImportService ?
                        service.importApplicationsOptimized(csvData, "benchmark.csv", "benchmark-user") :
                        service.importApplications(csvData, "benchmark.csv", "benchmark-user")
                    break
                case "environments":
                    importResult = service instanceof PerformanceOptimizedCsvImportService ?
                        service.importEnvironmentsOptimized(csvData, "benchmark.csv", "benchmark-user") :
                        service.importEnvironments(csvData, "benchmark.csv", "benchmark-user")
                    break
                default:
                    throw new IllegalArgumentException("Unknown entity type: ${entityType}")
            }
            
            long endTime = System.currentTimeMillis()
            long endMemory = getCurrentMemoryUsage()
            
            result.processingTimeMs = endTime - startTime
            result.memoryUsedMB = (endMemory - startMemory) / 1024 / 1024
            result.peakMemoryMB = result.memoryUsedMB
            result.recordsProcessed = importResult.recordsProcessed ?: 0
            result.successCount = importResult.recordsImported ?: 0
            result.errorCount = importResult.errors?.size() ?: 0
            result.throughputRecordsPerSec = result.processingTimeMs > 0 ? 
                (result.recordsProcessed * 1000.0) / result.processingTimeMs : 0
            
            result.targetsMet = result.memoryUsedMB <= TARGET_MAX_MEMORY_MB && 
                               result.throughputRecordsPerSec >= TARGET_MIN_THROUGHPUT
            
        } catch (Exception e) {
            log.error("CSV benchmark failed for ${testName}: ${e.message}", e)
            result.errorCount = 1
            result.additionalMetrics.error = e.message
        }
        
        return result
    }
    
    /**
     * Compare benchmark results
     */
    private PerformanceComparison compareResults(BenchmarkResult original, BenchmarkResult optimized, String testDescription) {
        PerformanceComparison comparison = new PerformanceComparison()
        comparison.original = original
        comparison.optimized = optimized
        
        // Calculate improvements
        comparison.memoryImprovement = original.memoryUsedMB > 0 ? 
            1.0 - (optimized.memoryUsedMB / original.memoryUsedMB) : 0.0
            
        comparison.speedImprovement = optimized.processingTimeMs > 0 ? 
            original.processingTimeMs / optimized.processingTimeMs : 1.0
        
        // Check if targets are achieved
        comparison.targetsAchieved = comparison.memoryImprovement >= TARGET_MEMORY_REDUCTION && 
                                   comparison.speedImprovement >= TARGET_SPEED_IMPROVEMENT
        
        // Generate observations
        if (comparison.memoryImprovement >= TARGET_MEMORY_REDUCTION) {
            comparison.observations << "✅ Memory reduction target achieved: ${(comparison.memoryImprovement * 100).round(1)}%"
        } else {
            comparison.observations << "❌ Memory reduction target missed: ${(comparison.memoryImprovement * 100).round(1)}% (target: ${TARGET_MEMORY_REDUCTION * 100}%)"
        }
        
        if (comparison.speedImprovement >= TARGET_SPEED_IMPROVEMENT) {
            comparison.observations << "✅ Speed improvement target achieved: ${comparison.speedImprovement.round(2)}x faster"
        } else {
            comparison.observations << "❌ Speed improvement target missed: ${comparison.speedImprovement.round(2)}x (target: ${TARGET_SPEED_IMPROVEMENT}x)"
        }
        
        if (optimized.throughputRecordsPerSec >= TARGET_MIN_THROUGHPUT) {
            comparison.observations << "✅ Throughput target met: ${optimized.throughputRecordsPerSec.round(1)} records/sec"
        } else {
            comparison.observations << "❌ Throughput target missed: ${optimized.throughputRecordsPerSec.round(1)} records/sec (target: ${TARGET_MIN_THROUGHPUT})"
        }
        
        log.info("Performance comparison for ${testDescription}: Memory improvement: ${(comparison.memoryImprovement * 100).round(1)}%, Speed improvement: ${comparison.speedImprovement.round(2)}x")
        
        return comparison
    }
    
    /**
     * Generate overall summary of benchmark results
     */
    private Map generateOverallSummary(Map results) {
        Map summary = [
            totalTests: 0,
            targetsMetCount: 0,
            averageMemoryImprovement: 0,
            averageSpeedImprovement: 0,
            recommendations: []
        ]
        
        // Collect all performance comparisons
        List<PerformanceComparison> allComparisons = []
        
        results.jsonImportBenchmarks.values().each { datasetResults ->
            if (datasetResults instanceof List) {
                allComparisons.addAll(datasetResults)
            } else if (datasetResults instanceof PerformanceComparison) {
                allComparisons << datasetResults
            }
        }
        
        results.csvImportBenchmarks.values().each { entityResults ->
            if (entityResults instanceof List) {
                allComparisons.addAll(entityResults)
            } else if (entityResults instanceof PerformanceComparison) {
                allComparisons << entityResults
            }
        }
        
        if (!allComparisons.isEmpty()) {
            summary.totalTests = allComparisons.size()
            summary.targetsMetCount = allComparisons.count { it.targetsAchieved }
            summary.averageMemoryImprovement = allComparisons.collect { it.memoryImprovement }.sum() / allComparisons.size()
            summary.averageSpeedImprovement = allComparisons.collect { it.speedImprovement }.sum() / allComparisons.size()
            
            // Generate recommendations
            if (summary.averageMemoryImprovement >= TARGET_MEMORY_REDUCTION) {
                summary.recommendations << "✅ Memory optimization targets achieved across ${summary.targetsMetCount}/${summary.totalTests} tests"
            } else {
                summary.recommendations << "⚠️ Consider further memory optimizations - average improvement: ${(summary.averageMemoryImprovement * 100).round(1)}%"
            }
            
            if (summary.averageSpeedImprovement >= TARGET_SPEED_IMPROVEMENT) {
                summary.recommendations << "✅ Performance improvement targets achieved - average speed increase: ${summary.averageSpeedImprovement.round(2)}x"
            } else {
                summary.recommendations << "⚠️ Consider additional performance tuning - average improvement: ${summary.averageSpeedImprovement.round(2)}x"
            }
            
            // Overall success rate
            double successRate = summary.targetsMetCount / summary.totalTests
            if (successRate >= 0.8) {
                summary.recommendations << "🎉 Excellent performance optimization success rate: ${(successRate * 100).round(1)}%"
            } else if (successRate >= 0.6) {
                summary.recommendations << "👍 Good performance optimization success rate: ${(successRate * 100).round(1)}%"
            } else {
                summary.recommendations << "📈 Performance optimization needs improvement - success rate: ${(successRate * 100).round(1)}%"
            }
        }
        
        return summary
    }
    
    // Utility methods for test data generation and system metrics
    
    private List<Map> generateJsonTestData(int count) {
        List<Map> testData = []
        
        (1..count).each { i ->
            String jsonContent = new JsonBuilder([
                step_type: "TST",
                step_number: i,
                title: "Test Step ${i}",
                description: "Performance benchmark test step ${i}",
                primary_team: "TEST_TEAM",
                impacted_teams: ["TEAM_A", "TEAM_B"],
                task_list: [
                    [
                        instruction_id: "${i}_1",
                        instruction_text: "Test instruction ${i}.1",
                        duration_minutes: 5
                    ],
                    [
                        instruction_id: "${i}_2", 
                        instruction_text: "Test instruction ${i}.2",
                        duration_minutes: 3
                    ]
                ]
            ]).toString()
            
            testData << [
                filename: "test_step_${i}.json",
                content: jsonContent
            ]
        }
        
        return testData
    }
    
    private String generateCsvTestData(String entityType, int count) {
        StringBuilder csv = new StringBuilder()
        
        switch (entityType) {
            case "teams":
                csv.append("tms_id,tms_name,tms_email,tms_description\n")
                (1..count).each { i ->
                    csv.append("${i},Team_${i},team${i}@test.com,Test team ${i}\n")
                }
                break
                
            case "users":
                csv.append("usr_id,usr_code,usr_first_name,usr_last_name,usr_email,usr_is_admin,tms_id,rls_id\n")
                (1..count).each { i ->
                    csv.append("${i},USER_${i},FirstName${i},LastName${i},user${i}@test.com,false,1,1\n")
                }
                break
                
            case "applications":
                csv.append("app_id,app_code,app_name,app_description\n")
                (1..count).each { i ->
                    csv.append("${i},APP_${i},Application ${i},Test application ${i}\n")
                }
                break
                
            case "environments":
                csv.append("env_id,env_code,env_name,env_description\n")
                (1..count).each { i ->
                    csv.append("${i},ENV_${i},Environment ${i},Test environment ${i}\n")
                }
                break
        }
        
        return csv.toString()
    }
    
    private long getCurrentMemoryUsage() {
        Runtime runtime = Runtime.getRuntime()
        return runtime.totalMemory() - runtime.freeMemory()
    }
    
    private Map getGCMetrics() {
        def gcBeans = java.lang.management.ManagementFactory.getGarbageCollectorMXBeans()
        long totalCollections = gcBeans.collect { it.collectionCount }.sum() ?: 0
        long totalTimeMs = gcBeans.collect { it.collectionTime }.sum() ?: 0
        
        return [
            totalCollections: totalCollections,
            totalTimeMs: totalTimeMs
        ]
    }
    
    /**
     * Run a quick performance validation test
     */
    Map runQuickPerformanceValidation() {
        log.info("Running quick performance validation test")
        
        Map result = [
            testName: "Quick Performance Validation",
            startTime: System.currentTimeMillis()
        ]
        
        try {
            // Test with medium dataset
            List<Map> testData = generateJsonTestData(MEDIUM_DATASET_SIZE)
            
            // Test optimized service only
            BenchmarkResult optimizedResult = benchmarkImportService(
                optimizedService,
                testData,
                "quick-validation",
                "QUICK_VALIDATION"
            )
            
            result.result = optimizedResult.toMap()
            result.success = optimizedResult.targetsMet
            result.memoryUsedMB = optimizedResult.memoryUsedMB
            result.throughputRecordsPerSec = optimizedResult.throughputRecordsPerSec
            result.processingTimeMs = optimizedResult.processingTimeMs
            
            if (optimizedResult.targetsMet) {
                result.message = "✅ Performance validation passed - all targets met"
            } else {
                result.message = "❌ Performance validation failed - targets not met"
            }
            
        } catch (Exception e) {
            log.error("Quick performance validation failed: ${e.message}", e)
            result.success = false
            result.error = e.message
            result.message = "❌ Performance validation failed with error: ${e.message}"
        }
        
        result.endTime = System.currentTimeMillis()
        result.totalTimeMs = result.endTime - result.startTime
        
        return result
    }
}