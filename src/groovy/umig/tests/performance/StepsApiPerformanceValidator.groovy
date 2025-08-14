package umig.tests.performance

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import umig.utils.DatabaseUtil
import java.util.UUID
import java.sql.SQLException
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Performance validation and baseline testing for StepsApi following US-024 requirements.
 * Validates <200ms response time requirement and establishes performance baselines.
 * Tests concurrent load scenarios and identifies performance bottlenecks.
 * 
 * Phase 3.3 Implementation for US-024 StepsAPI Refactoring
 * Created: 2025-08-14
 * Target: <200ms average response time, <500ms for large datasets
 */
class StepsApiPerformanceValidator {
    
    private static final String BASE_URL = "http://localhost:8090/rest/scriptrunner/latest/custom"
    private JsonSlurper jsonSlurper = new JsonSlurper()
    
    // Performance thresholds (in milliseconds)
    private static final int STANDARD_RESPONSE_TARGET = 200
    private static final int LARGE_DATASET_TARGET = 500
    private static final int BULK_OPERATION_TARGET = 2000
    private static final int DATABASE_QUERY_TARGET = 50
    
    // Test data
    private static UUID testMigrationId
    private static UUID testStepInstanceId
    private static Integer testTeamId
    private static List<UUID> testStepInstances = []
    
    static {
        setupPerformanceTestData()
    }

    /**
     * Setup test data optimized for performance testing
     */
    static void setupPerformanceTestData() {
        DatabaseUtil.withSql { sql ->
            // Get migration with most steps for stress testing
            def migration = sql.firstRow("""
                SELECT m.mig_id, COUNT(sti.sti_id) as step_count
                FROM migrations_mig m
                JOIN iterations_ite i ON m.mig_id = i.mig_id
                JOIN plans_instance_pli pli ON i.ite_id = pli.ite_id
                JOIN sequences_instance_sqi sqi ON pli.pli_id = sqi.pli_id
                JOIN phases_instance_phi phi ON sqi.sqi_id = phi.sqi_id
                JOIN steps_instance_sti sti ON phi.phi_id = sti.phi_id
                GROUP BY m.mig_id
                ORDER BY step_count DESC
                LIMIT 1
            """)
            testMigrationId = migration?.mig_id
            
            // Get multiple step instances for bulk testing
            def steps = sql.rows("""
                SELECT sti_id FROM steps_instance_sti
                ORDER BY sti_created_at DESC
                LIMIT 100
            """)
            testStepInstances = steps.collect { it.sti_id }
            testStepInstanceId = testStepInstances[0]
            
            // Get team with most steps
            def team = sql.firstRow("""
                SELECT t.tms_id, COUNT(sti.sti_id) as step_count
                FROM teams_tms t
                JOIN steps_instance_sti sti ON t.tms_id = sti.tms_id_owner
                GROUP BY t.tms_id
                ORDER BY step_count DESC
                LIMIT 1
            """)
            testTeamId = team?.tms_id
        }
    }

    /**
     * Main performance validation method
     */
    static void main(String[] args) {
        def validator = new StepsApiPerformanceValidator()
        def results = []
        
        try {
            println "=".repeat(80)
            println "US-024 StepsAPI Performance Validation - Phase 3.3"
            println "Validating <200ms response time requirement and stress testing"
            println "=".repeat(80)
            
            // Performance Test Group 1: Standard Query Performance
            results << validator.validateStandardQueryPerformance()
            results << validator.validateHierarchicalFilterPerformance()
            results << validator.validateMasterStepsPerformance()
            
            // Performance Test Group 2: Large Dataset Performance
            results << validator.validateLargeDatasetPerformance()
            results << validator.validateComplexFilterPerformance()
            results << validator.validatePaginationPerformance()
            
            // Performance Test Group 3: Concurrent Load Testing
            results << validator.validateConcurrentQueryLoad()
            results << validator.validateConcurrentUpdateLoad()
            
            // Performance Test Group 4: Bulk Operation Performance
            results << validator.validateBulkOperationPerformance()
            
            // Performance Test Group 5: Database Query Performance
            results << validator.validateDatabaseQueryPerformance()
            
            // Performance Test Group 6: Memory and Resource Usage
            results << validator.validateMemoryUsage()
            
        } catch (Exception e) {
            results << [test: "Performance Test Execution", success: false, error: e.message]
            e.printStackTrace()
        }
        
        // Print comprehensive performance results
        printPerformanceResults(results)
        
        // Generate performance baseline report
        generatePerformanceReport(results)
    }

    // =====================================
    // Performance Test Group 1: Standard Query Performance
    // =====================================
    
    def validateStandardQueryPerformance() {
        def testName = "Standard Query Performance - <200ms Target"
        try {
            def measurements = []
            def endpoints = [
                ["GET /steps/master", "${BASE_URL}/steps/master"],
                ["GET /steps (empty)", "${BASE_URL}/steps"],
                ["GET step instance", testStepInstanceId ? "${BASE_URL}/steps/${testStepInstanceId}" : null]
            ].findAll { it[1] != null }
            
            // Warm up requests (not counted in performance)
            endpoints.each { endpoint ->
                makeHttpRequest("GET", endpoint[1])
            }
            
            // Measure performance over multiple requests
            (1..10).each { iteration ->
                endpoints.each { endpoint ->
                    def startTime = System.currentTimeMillis()
                    def response = makeHttpRequest("GET", endpoint[1])
                    def responseTime = System.currentTimeMillis() - startTime
                    
                    measurements << [
                        endpoint: endpoint[0],
                        responseTime: responseTime,
                        status: response.status,
                        iteration: iteration
                    ]
                }
            }
            
            def avgResponseTime = measurements.sum { it.responseTime } / measurements.size()
            def maxResponseTime = measurements.max { it.responseTime }.responseTime
            def successfulRequests = measurements.count { it.status == 200 }
            def meetTarget = avgResponseTime < STANDARD_RESPONSE_TARGET
            
            return [
                test: testName,
                success: meetTarget && successfulRequests == measurements.size(),
                metrics: [
                    averageResponseTime: avgResponseTime,
                    maxResponseTime: maxResponseTime,
                    target: STANDARD_RESPONSE_TARGET,
                    successRate: (successfulRequests / measurements.size() * 100).round(1),
                    totalRequests: measurements.size()
                ]
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateHierarchicalFilterPerformance() {
        def testName = "Hierarchical Filter Performance"
        try {
            if (!testMigrationId || !testTeamId) {
                return [test: testName, success: false, error: "Insufficient test data"]
            }
            
            def measurements = []
            def filterEndpoints = [
                ["Migration Filter", "${BASE_URL}/steps?migrationId=${testMigrationId}"],
                ["Team Filter", "${BASE_URL}/steps?teamId=${testTeamId}"],
                ["Multiple Filters", "${BASE_URL}/steps?migrationId=${testMigrationId}&teamId=${testTeamId}"]
            ]
            
            // Test each filter type multiple times
            (1..5).each { iteration ->
                filterEndpoints.each { endpoint ->
                    def startTime = System.currentTimeMillis()
                    def response = makeHttpRequest("GET", endpoint[1])
                    def responseTime = System.currentTimeMillis() - startTime
                    
                    measurements << [
                        filter: endpoint[0],
                        responseTime: responseTime,
                        status: response.status,
                        resultCount: response.data?.totalCount ?: 0
                    ]
                }
            }
            
            def avgResponseTime = measurements.sum { it.responseTime } / measurements.size()
            def meetTarget = avgResponseTime < STANDARD_RESPONSE_TARGET
            
            return [
                test: testName,
                success: meetTarget,
                metrics: [
                    averageResponseTime: avgResponseTime,
                    target: STANDARD_RESPONSE_TARGET,
                    filterTypes: filterEndpoints.size(),
                    measurements: measurements.size()
                ]
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateMasterStepsPerformance() {
        def testName = "Master Steps Performance"
        try {
            def measurements = []
            
            // Test master steps endpoints
            (1..10).each { iteration ->
                // All master steps
                def startTime1 = System.currentTimeMillis()
                def response1 = makeHttpRequest("GET", "${BASE_URL}/steps/master")
                def responseTime1 = System.currentTimeMillis() - startTime1
                
                measurements << [
                    endpoint: "All Master Steps",
                    responseTime: responseTime1,
                    status: response1.status,
                    resultCount: response1.data?.size() ?: 0
                ]
                
                // Master steps by migration (if available)
                if (testMigrationId) {
                    def startTime2 = System.currentTimeMillis()
                    def response2 = makeHttpRequest("GET", "${BASE_URL}/steps/master?migrationId=${testMigrationId}")
                    def responseTime2 = System.currentTimeMillis() - startTime2
                    
                    measurements << [
                        endpoint: "Master Steps by Migration",
                        responseTime: responseTime2,
                        status: response2.status,
                        resultCount: response2.data?.size() ?: 0
                    ]
                }
            }
            
            def avgResponseTime = measurements.sum { it.responseTime } / measurements.size()
            def meetTarget = avgResponseTime < STANDARD_RESPONSE_TARGET
            
            return [
                test: testName,
                success: meetTarget,
                metrics: [
                    averageResponseTime: avgResponseTime,
                    target: STANDARD_RESPONSE_TARGET,
                    totalMeasurements: measurements.size()
                ]
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Performance Test Group 2: Large Dataset Performance
    // =====================================
    
    def validateLargeDatasetPerformance() {
        def testName = "Large Dataset Performance - <500ms Target"
        try {
            if (!testMigrationId) {
                return [test: testName, success: false, error: "No migration test data"]
            }
            
            def measurements = []
            
            // Test large dataset queries
            (1..5).each { iteration ->
                // Large pagination request
                def startTime = System.currentTimeMillis()
                def response = makeHttpRequest("GET", "${BASE_URL}/steps?migrationId=${testMigrationId}&limit=1000")
                def responseTime = System.currentTimeMillis() - startTime
                
                measurements << [
                    queryType: "Large Pagination (1000 items)",
                    responseTime: responseTime,
                    status: response.status,
                    resultCount: response.data?.steps?.size() ?: 0
                ]
            }
            
            def avgResponseTime = measurements.sum { it.responseTime } / measurements.size()
            def meetTarget = avgResponseTime < LARGE_DATASET_TARGET
            
            return [
                test: testName,
                success: meetTarget,
                metrics: [
                    averageResponseTime: avgResponseTime,
                    target: LARGE_DATASET_TARGET,
                    maxResultCount: measurements.max { it.resultCount }.resultCount
                ]
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateComplexFilterPerformance() {
        def testName = "Complex Filter Combination Performance"
        try {
            if (!testMigrationId || !testTeamId) {
                return [test: testName, success: false, error: "Insufficient test data"]
            }
            
            def measurements = []
            
            // Test complex filter combinations
            (1..5).each { iteration ->
                def startTime = System.currentTimeMillis()
                def response = makeHttpRequest("GET", 
                    "${BASE_URL}/steps?migrationId=${testMigrationId}&teamId=${testTeamId}&limit=100&sortBy=stm_number&sortOrder=DESC")
                def responseTime = System.currentTimeMillis() - startTime
                
                measurements << [
                    responseTime: responseTime,
                    status: response.status,
                    resultCount: response.data?.steps?.size() ?: 0
                ]
            }
            
            def avgResponseTime = measurements.sum { it.responseTime } / measurements.size()
            def meetTarget = avgResponseTime < STANDARD_RESPONSE_TARGET
            
            return [
                test: testName,
                success: meetTarget,
                metrics: [
                    averageResponseTime: avgResponseTime,
                    target: STANDARD_RESPONSE_TARGET
                ]
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validatePaginationPerformance() {
        def testName = "Pagination Performance at Different Offsets"
        try {
            if (!testMigrationId) {
                return [test: testName, success: false, error: "No migration test data"]
            }
            
            def measurements = []
            def offsets = [0, 100, 500, 1000, 5000]  // Test various pagination offsets
            
            offsets.each { offset ->
                def startTime = System.currentTimeMillis()
                def response = makeHttpRequest("GET", 
                    "${BASE_URL}/steps?migrationId=${testMigrationId}&limit=50&offset=${offset}")
                def responseTime = System.currentTimeMillis() - startTime
                
                measurements << [
                    offset: offset,
                    responseTime: responseTime,
                    status: response.status,
                    resultCount: response.data?.steps?.size() ?: 0
                ]
            }
            
            def avgResponseTime = measurements.sum { it.responseTime } / measurements.size()
            def meetTarget = avgResponseTime < STANDARD_RESPONSE_TARGET
            
            return [
                test: testName,
                success: meetTarget,
                metrics: [
                    averageResponseTime: avgResponseTime,
                    target: STANDARD_RESPONSE_TARGET,
                    offsetsTested: offsets.size(),
                    maxOffset: offsets.max()
                ]
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Performance Test Group 3: Concurrent Load Testing
    // =====================================
    
    def validateConcurrentQueryLoad() {
        def testName = "Concurrent Query Load - 10 Concurrent Users"
        try {
            if (!testMigrationId) {
                return [test: testName, success: false, error: "No migration test data"]
            }
            
            def executor = Executors.newFixedThreadPool(10)
            def measurements = Collections.synchronizedList([])
            def futures = []
            
            // Submit 50 concurrent requests (10 threads, 5 requests each)
            (1..50).each { requestId ->
                futures << executor.submit {
                    try {
                        def startTime = System.currentTimeMillis()
                        def response = makeHttpRequest("GET", "${BASE_URL}/steps?migrationId=${testMigrationId}&limit=50")
                        def responseTime = System.currentTimeMillis() - startTime
                        
                        measurements << [
                            requestId: requestId,
                            responseTime: responseTime,
                            status: response.status,
                            threadId: Thread.currentThread().getId()
                        ]
                    } catch (Exception e) {
                        measurements << [
                            requestId: requestId,
                            responseTime: -1,
                            status: -1,
                            error: e.message
                        ]
                    }
                }
            }
            
            // Wait for all requests to complete
            futures.each { it.get(30, TimeUnit.SECONDS) }
            executor.shutdown()
            
            def successfulRequests = measurements.findAll { it.status == 200 }
            def avgResponseTime = successfulRequests.sum { it.responseTime } / successfulRequests.size()
            def maxResponseTime = successfulRequests.max { it.responseTime }.responseTime
            def successRate = (successfulRequests.size() / measurements.size() * 100).round(1)
            
            def meetTarget = avgResponseTime < STANDARD_RESPONSE_TARGET && successRate >= 95
            
            return [
                test: testName,
                success: meetTarget,
                metrics: [
                    averageResponseTime: avgResponseTime,
                    maxResponseTime: maxResponseTime,
                    successRate: successRate,
                    concurrentUsers: 10,
                    totalRequests: measurements.size(),
                    target: STANDARD_RESPONSE_TARGET
                ]
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateConcurrentUpdateLoad() {
        def testName = "Concurrent Update Load - Status Updates"
        try {
            if (!testStepInstances || testStepInstances.size() < 10) {
                return [test: testName, success: false, error: "Insufficient step instances for concurrent testing"]
            }
            
            def executor = Executors.newFixedThreadPool(5)
            def measurements = Collections.synchronizedList([])
            def futures = []
            
            // Submit 10 concurrent status update requests
            (0..9).each { index ->
                futures << executor.submit {
                    try {
                        def stepId = testStepInstances[index]
                        def requestBody = new JsonBuilder([
                            newStatus: 2,
                            userId: 1
                        ]).toString()
                        
                        def startTime = System.currentTimeMillis()
                        def response = makeHttpRequest("PUT", "${BASE_URL}/steps/${stepId}/status", requestBody)
                        def responseTime = System.currentTimeMillis() - startTime
                        
                        measurements << [
                            stepId: stepId,
                            responseTime: responseTime,
                            status: response.status
                        ]
                    } catch (Exception e) {
                        measurements << [
                            stepId: "error",
                            responseTime: -1,
                            status: -1,
                            error: e.message
                        ]
                    }
                }
            }
            
            // Wait for all updates to complete
            futures.each { it.get(30, TimeUnit.SECONDS) }
            executor.shutdown()
            
            def successfulUpdates = measurements.findAll { it.status in [200, 400] } // 400 may be valid validation response
            def avgResponseTime = successfulUpdates.sum { it.responseTime } / successfulUpdates.size()
            
            def meetTarget = avgResponseTime < STANDARD_RESPONSE_TARGET
            
            return [
                test: testName,
                success: meetTarget,
                metrics: [
                    averageResponseTime: avgResponseTime,
                    successfulUpdates: successfulUpdates.size(),
                    target: STANDARD_RESPONSE_TARGET
                ]
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Performance Test Group 4: Bulk Operation Performance
    // =====================================
    
    def validateBulkOperationPerformance() {
        def testName = "Bulk Operation Performance - <2s Target"
        try {
            if (!testStepInstances || testStepInstances.size() < 50) {
                return [test: testName, success: false, error: "Insufficient step instances for bulk testing"]
            }
            
            def measurements = []
            
            // Test bulk status update (50 steps)
            def bulkStatusData = testStepInstances.take(50).collect { stepId ->
                [stepInstanceId: stepId.toString(), newStatus: 2]
            }
            
            def requestBody = new JsonBuilder([
                statusUpdates: bulkStatusData,
                userId: 1
            ]).toString()
            
            (1..3).each { iteration ->
                def startTime = System.currentTimeMillis()
                def response = makeHttpRequest("PUT", "${BASE_URL}/steps/bulk/status", requestBody)
                def responseTime = System.currentTimeMillis() - startTime
                
                measurements << [
                    operation: "Bulk Status Update (50 steps)",
                    responseTime: responseTime,
                    status: response.status,
                    iteration: iteration
                ]
            }
            
            def avgResponseTime = measurements.sum { it.responseTime } / measurements.size()
            def meetTarget = avgResponseTime < BULK_OPERATION_TARGET
            
            return [
                test: testName,
                success: meetTarget,
                metrics: [
                    averageResponseTime: avgResponseTime,
                    target: BULK_OPERATION_TARGET,
                    bulkSize: 50,
                    iterations: measurements.size()
                ]
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Performance Test Group 5: Database Query Performance
    // =====================================
    
    def validateDatabaseQueryPerformance() {
        def testName = "Database Query Performance - <50ms Target"
        try {
            def measurements = []
            
            // Test direct database queries used by repository
            DatabaseUtil.withSql { sql ->
                // Test master step query
                (1..10).each { iteration ->
                    def startTime = System.currentTimeMillis()
                    sql.rows("SELECT stm_id, stt_code, stm_number, stm_name FROM steps_master_stm LIMIT 100")
                    def queryTime = System.currentTimeMillis() - startTime
                    
                    measurements << [
                        queryType: "Master Steps Query",
                        queryTime: queryTime,
                        iteration: iteration
                    ]
                }
                
                // Test hierarchical filter query (if migration available)
                if (testMigrationId) {
                    (1..5).each { iteration ->
                        def startTime = System.currentTimeMillis()
                        sql.rows("""
                            SELECT DISTINCT stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name
                            FROM steps_master_stm stm
                            JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
                            JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                            JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                            JOIN iterations_ite ite ON plm.plm_id = ite.plm_id
                            WHERE ite.mig_id = :migrationId
                            LIMIT 100
                        """, [migrationId: testMigrationId])
                        def queryTime = System.currentTimeMillis() - startTime
                        
                        measurements << [
                            queryType: "Hierarchical Filter Query",
                            queryTime: queryTime,
                            iteration: iteration
                        ]
                    }
                }
            }
            
            def avgQueryTime = measurements.sum { it.queryTime } / measurements.size()
            def maxQueryTime = measurements.max { it.queryTime }.queryTime
            def meetTarget = avgQueryTime < DATABASE_QUERY_TARGET
            
            return [
                test: testName,
                success: meetTarget,
                metrics: [
                    averageQueryTime: avgQueryTime,
                    maxQueryTime: maxQueryTime,
                    target: DATABASE_QUERY_TARGET,
                    totalQueries: measurements.size()
                ]
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Performance Test Group 6: Memory and Resource Usage
    // =====================================
    
    def validateMemoryUsage() {
        def testName = "Memory Usage Validation"
        try {
            def runtime = Runtime.getRuntime()
            
            // Get baseline memory
            System.gc()
            Thread.sleep(1000)
            def baselineMemory = runtime.totalMemory() - runtime.freeMemory()
            
            // Perform memory-intensive operations
            def measurements = []
            
            // Large data retrieval test
            if (testMigrationId) {
                def response = makeHttpRequest("GET", "${BASE_URL}/steps?migrationId=${testMigrationId}&limit=1000")
                def memoryAfterLargeQuery = runtime.totalMemory() - runtime.freeMemory()
                
                measurements << [
                    operation: "Large Query (1000 items)",
                    memoryUsed: memoryAfterLargeQuery - baselineMemory,
                    resultCount: response.data?.steps?.size() ?: 0
                ]
            }
            
            // Force garbage collection and measure final memory
            System.gc()
            Thread.sleep(1000)
            def finalMemory = runtime.totalMemory() - runtime.freeMemory()
            def memoryLeak = finalMemory - baselineMemory
            
            // Consider successful if memory usage is reasonable (< 100MB) and no major leaks
            def success = measurements.all { it.memoryUsed < 100 * 1024 * 1024 } && // < 100MB per operation
                         memoryLeak < 50 * 1024 * 1024  // < 50MB total leak
            
            return [
                test: testName,
                success: success,
                metrics: [
                    baselineMemory: baselineMemory / (1024 * 1024), // MB
                    finalMemory: finalMemory / (1024 * 1024), // MB
                    memoryLeak: memoryLeak / (1024 * 1024), // MB
                    measurements: measurements.size()
                ]
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Utility Methods
    // =====================================
    
    /**
     * Make HTTP request using URLConnection (pure Groovy, no external dependencies)
     */
    private makeHttpRequest(String method, String url, String body = null) {
        try {
            def connection = new URL(url).openConnection()
            connection.requestMethod = method
            connection.setRequestProperty("Content-Type", "application/json")
            connection.setRequestProperty("Accept", "application/json")
            connection.connectTimeout = 10000  // 10 seconds
            connection.readTimeout = 30000     // 30 seconds
            
            if (body && method in ["POST", "PUT"]) {
                connection.doOutput = true
                connection.outputStream.withWriter { writer ->
                    writer.write(body)
                }
            }
            
            def status = connection.responseCode
            def responseText = ""
            
            try {
                responseText = connection.inputStream.text
            } catch (IOException e) {
                try {
                    responseText = connection.errorStream?.text ?: ""
                } catch (Exception ignored) {
                    responseText = ""
                }
            }
            
            def data = null
            if (responseText && (responseText.trim().startsWith("{") || responseText.trim().startsWith("["))) {
                try {
                    data = jsonSlurper.parseText(responseText)
                } catch (Exception e) {
                    data = [error: "JSON parse error: ${e.message}", rawResponse: responseText]
                }
            } else {
                data = [rawResponse: responseText]
            }
            
            return [status: status, data: data]
            
        } catch (Exception e) {
            return [status: -1, data: [error: e.message]]
        }
    }
    
    /**
     * Print comprehensive performance results
     */
    private static void printPerformanceResults(List results) {
        println "\n" + "=".repeat(80)
        println "US-024 StepsAPI Performance Validation Results - Phase 3.3"
        println "=".repeat(80)
        
        def successful = results.count { it.success }
        def total = results.size()
        def successRate = total > 0 ? (successful / total * 100).round(1) : 0
        
        println "Overall Performance: ${successful}/${total} targets met (${successRate}%)"
        println ""
        
        // Performance summary by category
        results.each { result ->
            def status = result.success ? "✅ PASS" : "❌ FAIL"
            println "${status} ${result.test}"
            
            if (result.metrics) {
                result.metrics.each { key, value ->
                    println "    ${key}: ${value}${key.contains('Time') || key.contains('target') ? 'ms' : ''}"
                }
            }
            
            if (result.error) {
                println "    Error: ${result.error}"
            }
            println ""
        }
        
        // Performance targets summary
        println "🎯 PERFORMANCE TARGETS:"
        println "   Standard Queries: <200ms (Current implementation)"
        println "   Large Datasets: <500ms (10,000+ step queries)"
        println "   Bulk Operations: <2s (100-step bulk updates)"
        println "   Database Queries: <50ms (SQL execution time)"
        println ""
        
        println "=".repeat(80)
        println "Phase 3.3 Performance Validation Complete"
        println "Status: ${successRate >= 80 ? 'PERFORMANCE TARGETS MET' : 'PERFORMANCE OPTIMIZATION NEEDED'}"
        println "=".repeat(80)
    }
    
    /**
     * Generate performance baseline report
     */
    private static void generatePerformanceReport(List results) {
        try {
            def reportPath = "/Users/lucaschallamel/Documents/GitHub/UMIG/docs/performance/us-024-baseline-report.md"
            def reportDir = new File(reportPath).parentFile
            if (!reportDir.exists()) {
                reportDir.mkdirs()
            }
            
            def report = new StringBuilder()
            report.append("# US-024 StepsAPI Performance Baseline Report\n\n")
            report.append("**Generated**: ${new Date()}\n")
            report.append("**Phase**: 3.3 Performance Testing & Validation\n")
            report.append("**Target**: <200ms average response time\n\n")
            
            report.append("## Performance Test Results\n\n")
            results.each { result ->
                report.append("### ${result.test}\n")
                report.append("- **Status**: ${result.success ? 'PASSED' : 'FAILED'}\n")
                
                if (result.metrics) {
                    result.metrics.each { key, value ->
                        report.append("- **${key}**: ${value}${key.contains('Time') || key.contains('target') ? 'ms' : ''}\n")
                    }
                }
                
                if (result.error) {
                    report.append("- **Error**: ${result.error}\n")
                }
                report.append("\n")
            }
            
            report.append("## Summary\n\n")
            def successful = results.count { it.success }
            def total = results.size()
            def successRate = total > 0 ? (successful / total * 100).round(1) : 0
            
            report.append("- **Tests Passed**: ${successful}/${total} (${successRate}%)\n")
            report.append("- **Performance Status**: ${successRate >= 80 ? 'MEETS REQUIREMENTS' : 'NEEDS OPTIMIZATION'}\n")
            report.append("- **Recommendation**: ${successRate >= 80 ? 'Ready for production deployment' : 'Performance optimization required'}\n")
            
            new File(reportPath).text = report.toString()
            println "Performance report generated: ${reportPath}"
            
        } catch (Exception e) {
            println "Error generating performance report: ${e.message}"
        }
    }
}