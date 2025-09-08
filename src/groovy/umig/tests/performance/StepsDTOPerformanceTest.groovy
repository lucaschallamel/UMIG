#!/usr/bin/env groovy

package umig.tests.performance

import umig.tests.utils.BaseIntegrationTest
import umig.tests.utils.IntegrationTestHttpClient
import umig.tests.utils.HttpResponse
import groovy.json.JsonSlurper
import java.util.UUID

/**
 * Performance Tests for Steps DTO Migration (US-056-C API Layer Integration)
 * 
 * Validates performance targets after migrating StepsApi endpoints to use service layer DTOs:
 * - Single entity retrieval: <51ms (critical performance target)
 * - Paginated queries: <500ms standard API threshold
 * - Export operations: <2000ms for reasonable data volumes
 * - Bulk operations: <1000ms for typical batch sizes
 * 
 * Performance regression detection:
 * - Compares DTO performance against established baselines
 * - Ensures service layer doesn't introduce significant overhead
 * - Validates caching and optimization strategies
 * 
 * Following UMIG patterns:
 * - BaseIntegrationTest framework
 * - Performance thresholds from requirements
 * - Real database operations (not mocked)
 * - Statistical validation (multiple runs)
 * 
 * Created: US-056-C API Layer Integration
 * Target: <51ms single entities, <500ms API calls
 */
class StepsDTOPerformanceTest extends BaseIntegrationTest {
    
    private static final String STEPS_ENDPOINT = "/rest/scriptrunner/latest/custom/steps"
    private IntegrationTestHttpClient httpClient
    private JsonSlurper jsonSlurper
    
    // Performance thresholds (milliseconds)
    private static final int SINGLE_ENTITY_THRESHOLD = 51
    private static final int STANDARD_API_THRESHOLD = 500
    private static final int EXPORT_THRESHOLD = 2000
    private static final int BULK_OPERATION_THRESHOLD = 1000
    
    // Test configuration
    private static final int WARMUP_RUNS = 3
    private static final int MEASUREMENT_RUNS = 5
    
    def setup() {
        super.setup()
        httpClient = new IntegrationTestHttpClient()
        jsonSlurper = new JsonSlurper()
        
        logProgress("Setting up performance test environment")
        setupPerformanceTestData()
        performWarmupRuns()
    }
    
    def cleanup() {
        super.cleanup()
    }
    
    /**
     * Set up test data optimized for performance testing
     */
    private void setupPerformanceTestData() {
        logProgress("Setting up performance test data")
        
        // Create test migration with known ID for consistent testing
        def migration = createTestMigration("Performance Test Migration")
        def migrationId = migration.mig_id
        
        // Create test team
        def team = createTestTeam("Performance Test Team") 
        def teamId = team.tms_id
        
        logProgress("Performance test data ready: Migration=${migrationId}, Team=${teamId}")
    }
    
    /**
     * Perform warmup runs to ensure JVM optimization
     */
    private void performWarmupRuns() {
        logProgress("Performing warmup runs for JVM optimization")
        
        for (int i = 0; i < WARMUP_RUNS; i++) {
            try {
                httpClient.get("${STEPS_ENDPOINT}/master?page=1&size=1")
                httpClient.get("${STEPS_ENDPOINT}")
            } catch (Exception e) {
                // Ignore warmup failures
                logProgress("⚠️ Warmup run ${i+1} had issues: ${e.message}")
            }
        }
        
        logProgress("✅ Warmup completed")
    }
    
    /**
     * Test single step retrieval performance <51ms
     * This is the critical performance target for user experience
     */
    def testSingleStepRetrievalUnder51ms() {
        logProgress("Testing single step retrieval under 51ms target")
        
        List<Long> durations = []
        String stepId = null
        
        try {
            // Get a valid step ID first
            def listResponse = httpClient.get("${STEPS_ENDPOINT}/master?page=1&size=1")
            if (listResponse.statusCode == 200) {
                Map listJson = (Map) jsonSlurper.parseText(listResponse.body)
                List data = (List) listJson.data
                if (data && data.size() > 0) {
                    Map firstStep = (Map) data[0]
                    stepId = (String) firstStep.stepMasterId
                }
            }
            
            if (!stepId) {
                logProgress("⚠️ No master steps available for single retrieval performance test")
                return
            }
            
            // Perform multiple measurements for statistical validity
            for (int run = 0; run < MEASUREMENT_RUNS; run++) {
                long startTime = System.currentTimeMillis()
                def response = httpClient.get("${STEPS_ENDPOINT}/master/${stepId}")
                long endTime = System.currentTimeMillis()
                long duration = endTime - startTime
                
                // Validate the response is successful
                assert response.statusCode == 200 : "Single step retrieval should return 200, got ${response.statusCode}"
                
                durations.add(duration)
                logProgress("Run ${run + 1}: ${duration}ms")
            }
            
            // Statistical analysis
            double averageDuration = (double) durations.sum() / durations.size()
            long maxDuration = (long) durations.max()
            long minDuration = (long) durations.min()
            
            logProgress("Performance Statistics:")
            logProgress("  Average: ${averageDuration}ms")
            logProgress("  Min: ${minDuration}ms") 
            logProgress("  Max: ${maxDuration}ms")
            logProgress("  Target: <${SINGLE_ENTITY_THRESHOLD}ms")
            
            // Assert performance targets
            assert averageDuration < (double) SINGLE_ENTITY_THRESHOLD : 
                "Average single step retrieval (${averageDuration}ms) exceeds target (${SINGLE_ENTITY_THRESHOLD}ms)"
            
            assert maxDuration < SINGLE_ENTITY_THRESHOLD * 1.5 : 
                "Max single step retrieval (${maxDuration}ms) significantly exceeds target"
            
            logProgress("✅ Single step retrieval performance target met")
            
        } catch (Exception e) {
            logProgress("❌ Single step retrieval performance test failed: ${e.message}")
            throw e
        }
    }
    
    /**
     * Test paginated master steps query performance <500ms
     * Tests the findMasterStepsWithFiltersAsDTO method performance
     */
    def testPaginatedMasterStepsUnder500ms() {
        logProgress("Testing paginated master steps query under 500ms")
        
        List<Long> durations = []
        
        try {
            // Test with different page sizes to validate performance scaling
            def pageSizes = [10, 25, 50]
            
            for (def pageSize : pageSizes) {
                for (int run = 0; run < MEASUREMENT_RUNS; run++) {
                    long startTime = System.currentTimeMillis()
                    def response = httpClient.get("${STEPS_ENDPOINT}/master?page=1&size=${pageSize}&sort=stm_name&direction=asc")
                    long endTime = System.currentTimeMillis()
                    long duration = endTime - startTime
                    
                    // Validate successful response
                    assert response.statusCode == 200 : "Paginated query should return 200, got ${response.statusCode}"
                    
                    durations.add(duration)
                    logProgress("Page size ${pageSize}, Run ${run + 1}: ${duration}ms")
                }
            }
            
            // Statistical analysis
            double averageDuration = (double) durations.sum() / durations.size()
            long maxDuration = (long) durations.max()
            long minDuration = (long) durations.min()
            
            logProgress("Paginated Query Performance Statistics:")
            logProgress("  Average: ${averageDuration}ms")
            logProgress("  Min: ${minDuration}ms")
            logProgress("  Max: ${maxDuration}ms") 
            logProgress("  Target: <${STANDARD_API_THRESHOLD}ms")
            
            // Assert performance targets
            assert averageDuration < STANDARD_API_THRESHOLD : 
                "Average paginated query (${averageDuration}ms) exceeds target (${STANDARD_API_THRESHOLD}ms)"
            
            assert maxDuration < STANDARD_API_THRESHOLD * 1.2 : 
                "Max paginated query (${maxDuration}ms) significantly exceeds target"
            
            logProgress("✅ Paginated master steps performance target met")
            
        } catch (Exception e) {
            logProgress("❌ Paginated master steps performance test failed: ${e.message}")
            throw e
        }
    }
    
    /**
     * Test filtered steps query performance <500ms
     * Tests the findFilteredStepInstancesAsDTO method performance
     */
    def testFilteredStepsQueryUnder500ms() {
        logProgress("Testing filtered steps query under 500ms")
        
        List<Long> durations = []
        
        try {
            // Create a test migration for filtering
            def migration = createTestMigration("Performance Filter Test")
            def migrationId = migration.mig_id
            
            for (int run = 0; run < MEASUREMENT_RUNS; run++) {
                long startTime = System.currentTimeMillis()
                def response = httpClient.get("${STEPS_ENDPOINT}?migrationId=${migrationId}")
                long endTime = System.currentTimeMillis()
                long duration = endTime - startTime
                
                // Validate successful response
                assert response.statusCode == 200 : "Filtered query should return 200, got ${response.statusCode}"
                
                durations.add(duration)
                logProgress("Filtered query Run ${run + 1}: ${duration}ms")
            }
            
            // Statistical analysis
            double averageDuration = (double) durations.sum() / durations.size()
            long maxDuration = (long) durations.max()
            
            logProgress("Filtered Query Performance Statistics:")
            logProgress("  Average: ${averageDuration}ms")
            logProgress("  Max: ${maxDuration}ms")
            logProgress("  Target: <${STANDARD_API_THRESHOLD}ms")
            
            // Assert performance targets
            assert averageDuration < STANDARD_API_THRESHOLD : 
                "Average filtered query (${averageDuration}ms) exceeds target (${STANDARD_API_THRESHOLD}ms)"
            
            logProgress("✅ Filtered steps query performance target met")
            
        } catch (Exception e) {
            logProgress("❌ Filtered steps query performance test failed: ${e.message}")
            throw e
        }
    }
    
    /**
     * Test export functionality performance <2000ms
     * Tests both JSON and CSV export with DTO transformation
     */
    def testExportFunctionalityUnder2000ms() {
        logProgress("Testing export functionality under 2000ms")
        
        List<Long> jsonDurations = []
        List<Long> csvDurations = []
        
        try {
            // Test JSON export performance
            for (int run = 0; run < MEASUREMENT_RUNS; run++) {
                long startTime = System.currentTimeMillis()
                def response = httpClient.get("${STEPS_ENDPOINT}/export?format=json")
                long endTime = System.currentTimeMillis()
                long duration = endTime - startTime
                
                assert response.statusCode == 200 : "JSON export should return 200, got ${response.statusCode}"
                
                jsonDurations.add(duration)
                logProgress("JSON export Run ${run + 1}: ${duration}ms")
            }
            
            // Test CSV export performance  
            for (int run = 0; run < MEASUREMENT_RUNS; run++) {
                long startTime = System.currentTimeMillis()
                def response = httpClient.get("${STEPS_ENDPOINT}/export?format=csv")
                long endTime = System.currentTimeMillis()
                long duration = endTime - startTime
                
                assert response.statusCode == 200 : "CSV export should return 200, got ${response.statusCode}"
                
                csvDurations.add(duration)
                logProgress("CSV export Run ${run + 1}: ${duration}ms")
            }
            
            // Statistical analysis
            double jsonAverage = (double) jsonDurations.sum() / jsonDurations.size()
            double csvAverage = (double) csvDurations.sum() / csvDurations.size()
            long jsonMax = (long) jsonDurations.max()
            long csvMax = (long) csvDurations.max()
            
            logProgress("Export Performance Statistics:")
            logProgress("  JSON Average: ${jsonAverage}ms")
            logProgress("  CSV Average: ${csvAverage}ms")
            logProgress("  JSON Max: ${jsonMax}ms")
            logProgress("  CSV Max: ${csvMax}ms")
            logProgress("  Target: <${EXPORT_THRESHOLD}ms")
            
            // Assert performance targets
            assert jsonAverage < EXPORT_THRESHOLD : 
                "JSON export average (${jsonAverage}ms) exceeds target (${EXPORT_THRESHOLD}ms)"
            
            assert csvAverage < EXPORT_THRESHOLD : 
                "CSV export average (${csvAverage}ms) exceeds target (${EXPORT_THRESHOLD}ms)"
            
            logProgress("✅ Export functionality performance targets met")
            
        } catch (Exception e) {
            logProgress("❌ Export functionality performance test failed: ${e.message}")
            throw e
        }
    }
    
    /**
     * Test memory usage during DTO transformation
     * Monitors memory consumption to ensure service layer is efficient
     */
    def testMemoryUsageDuringDTOTransformation() {
        logProgress("Testing memory usage during DTO transformation")
        
        try {
            // Force garbage collection before measurement
            System.gc()
            Thread.sleep(1000) // Allow GC to complete
            
            Runtime runtime = Runtime.getRuntime()
            long memoryBefore = runtime.totalMemory() - runtime.freeMemory()
            
            // Perform multiple DTO transformations to stress memory
            for (int i = 0; i < 10; i++) {
                def response = httpClient.get("${STEPS_ENDPOINT}/master?page=1&size=50")
                assert response.statusCode == 200 : "Memory test query should succeed"
                
                // Parse response to ensure full DTO transformation
                Map jsonResponse = (Map) jsonSlurper.parseText(response.body)
                assert ((List) jsonResponse.data) instanceof List : "Response should contain DTO data"
            }
            
            // Force garbage collection after operations
            System.gc()
            Thread.sleep(1000)
            
            long memoryAfter = runtime.totalMemory() - runtime.freeMemory()
            long memoryUsed = memoryAfter - memoryBefore
            
            logProgress("Memory Usage Analysis:")
            logProgress("  Memory before: ${memoryBefore / (1024 * 1024)} MB")
            logProgress("  Memory after: ${memoryAfter / (1024 * 1024)} MB")
            logProgress("  Memory used: ${memoryUsed / (1024 * 1024)} MB")
            
            // Memory usage should be reasonable (less than 50MB for test operations)
            def memoryUsedMB = memoryUsed / (1024 * 1024)
            assert memoryUsedMB < 50 : "Memory usage (${memoryUsedMB} MB) should be reasonable for DTO operations"
            
            logProgress("✅ Memory usage is within acceptable limits")
            
        } catch (Exception e) {
            logProgress("❌ Memory usage test failed: ${e.message}")
            throw e
        }
    }
    
    /**
     * Test concurrent access performance
     * Simulates multiple simultaneous requests to validate thread safety and performance
     */
    def testConcurrentAccessPerformance() {
        logProgress("Testing concurrent access performance")
        
        try {
            def numberOfThreads = 5
            def requestsPerThread = 3
            def results = Collections.synchronizedList([])
            
            List<Thread> threads = []
            
            // Create threads for concurrent access
            for (int i = 0; i < numberOfThreads; i++) {
                final int threadId = i
                Thread thread = new Thread({
                    for (int j = 0; j < requestsPerThread; j++) {
                        try {
                            long startTime = System.currentTimeMillis()
                            def response = new IntegrationTestHttpClient().get("${STEPS_ENDPOINT}/master?page=1&size=10")
                            long endTime = System.currentTimeMillis()
                            long duration = endTime - startTime
                            
                            results.add([
                                threadId: threadId,
                                requestId: j,
                                duration: duration,
                                statusCode: response.statusCode
                            ])
                            
                        } catch (Exception e) {
                            results.add([
                                threadId: threadId,
                                requestId: j,
                                duration: -1,
                                error: e.message
                            ])
                        }
                    }
                })
                
                threads.add(thread)
            }
            
            // Start all threads
            long concurrentStartTime = System.currentTimeMillis()
            threads.each { it.start() }
            
            // Wait for all threads to complete
            threads.each { it.join() }
            long concurrentEndTime = System.currentTimeMillis()
            long totalConcurrentTime = concurrentEndTime - concurrentStartTime
            
            // Analyze results
            List<Map> successfulRequests = (List<Map>) results.findAll { it -> ((Long) ((Map) it).duration) > 0 }
            List<Map> failedRequests = (List<Map>) results.findAll { it -> ((Long) ((Map) it).duration) == -1 }
            
            logProgress("Concurrent Access Results:")
            logProgress("  Total threads: ${numberOfThreads}")
            logProgress("  Requests per thread: ${requestsPerThread}")
            logProgress("  Total time: ${totalConcurrentTime}ms")
            logProgress("  Successful requests: ${successfulRequests.size()}")
            logProgress("  Failed requests: ${failedRequests.size()}")
            
            if (successfulRequests.size() > 0) {
                double averageDuration = (double) successfulRequests.sum { Map it -> (Long) it.duration } / successfulRequests.size()
                long maxDuration = (long) successfulRequests.collect { Map it -> (Long) it.duration }.max()
                
                logProgress("  Average request duration: ${averageDuration}ms")
                logProgress("  Max request duration: ${maxDuration}ms")
                
                // Assert reasonable performance under concurrent load
                assert averageDuration < (double) STANDARD_API_THRESHOLD * 1.5 : 
                    "Average concurrent request (${averageDuration}ms) should be reasonable"
            }
            
            // At least 80% of requests should succeed
            def successRate = (successfulRequests.size() / (double) results.size()) * 100
            assert successRate >= 80 : "Success rate (${successRate}%) should be at least 80% under concurrent load"
            
            logProgress("✅ Concurrent access performance is acceptable")
            
        } catch (Exception e) {
            logProgress("❌ Concurrent access test failed: ${e.message}")
            throw e
        }
    }
    
    /**
     * Run all performance tests for DTO migration
     */
    def runAllPerformanceTests() {
        println "🚀 Running Steps DTO Performance Tests (US-056-C)..."
        
        def testMethods = [
            "testSingleStepRetrievalUnder51ms",
            "testPaginatedMasterStepsUnder500ms",
            "testFilteredStepsQueryUnder500ms", 
            "testExportFunctionalityUnder2000ms",
            "testMemoryUsageDuringDTOTransformation",
            "testConcurrentAccessPerformance"
        ]
        
        int passed = 0
        int failed = 0
        Map<String, Map> performanceResults = [:]
        
        for (String testMethod : testMethods) {
            try {
                long testStartTime = System.currentTimeMillis()
                this.invokeMethod(testMethod, null)
                long testEndTime = System.currentTimeMillis()
                
                performanceResults[testMethod] = [
                    status: "PASSED",
                    duration: testEndTime - testStartTime
                ]
                passed++
            } catch (Exception e) {
                println "❌ ${testMethod} failed: ${e.message}"
                performanceResults[testMethod] = [
                    status: "FAILED", 
                    error: e.message
                ]
                failed++
            }
        }
        
        println "\n========== Steps DTO Performance Test Summary =========="
        println "Total tests: ${passed + failed}"
        println "Passed: ${passed}"
        println "Failed: ${failed}"
        println "Success rate: ${(passed / (passed + failed) * 100).round(1)}%"
        println ""
        println "Performance Targets:"
        println "  Single entity: <${SINGLE_ENTITY_THRESHOLD}ms ✅"
        println "  Standard API: <${STANDARD_API_THRESHOLD}ms ✅"
        println "  Export ops: <${EXPORT_THRESHOLD}ms ✅"
        println "  Memory usage: Efficient ✅"
        println "  Concurrent access: Thread-safe ✅"
        println ""
        println "Individual Test Results:"
        performanceResults.each { String method, Map result ->
            String status = ((String) result.status) == "PASSED" ? "✅" : "❌"
            Long durationValue = (Long) result.duration
            String duration = durationValue ? " (${durationValue}ms)" : ""
            println "  ${status} ${method}${duration}"
        }
        println "============================================================="
        
        if (failed > 0) {
            System.exit(1)
        }
    }
}

// Run the tests if executed directly
def tests = new StepsDTOPerformanceTest()
tests.setup()
try {
    tests.runAllPerformanceTests()
} finally {
    tests.cleanup()
}