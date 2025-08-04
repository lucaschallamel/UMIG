package umig.tests

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import java.util.concurrent.TimeUnit
import java.util.concurrent.Executors
import java.util.concurrent.Future
import java.util.concurrent.atomic.AtomicInteger

/**
 * Performance Baseline Testing Framework for UMIG APIs
 * Ensures all APIs meet performance standards established in US-001
 */
class PerformanceBaselineValidator {
    
    private static final Map<String, Integer> PERFORMANCE_BASELINES = [
        'api_response_time_ms': 200,      // p95 response time < 200ms
        'bulk_operation_time_ms': 5000,   // Bulk operations < 5 seconds  
        'concurrent_users': 10,           // Support 10+ concurrent users
        'large_dataset_records': 100,     // Handle 100+ records efficiently
        'memory_usage_mb': 100,           // Memory usage < 100MB
        'ui_responsiveness_ms': 100       // UI updates < 100ms
    ]
    
    private static final Map<String, Map> TEST_SCENARIOS = [
        'sequences_crud': [
            endpoint: '/sequences',
            operations: ['GET', 'POST', 'PUT', 'DELETE'],
            baseline: 'api_response_time_ms'
        ],
        'bulk_reordering': [
            endpoint: '/sequences/reorder',
            operations: ['PUT'],
            baseline: 'bulk_operation_time_ms',
            payload_size: 50
        ],
        'concurrent_access': [
            endpoint: '/sequences',
            operations: ['GET'],
            baseline: 'concurrent_users',
            concurrent_requests: 10
        ],
        'large_dataset': [
            endpoint: '/sequences',
            operations: ['GET'],
            baseline: 'large_dataset_records',
            filter_complexity: 'high'
        ]
    ]
    
    /**
     * Validates API performance against established baselines
     */
    static Map validatePerformanceBaselines(String apiEndpoint, Map testConfig = [:]) {
        def results = [
            endpoint: apiEndpoint,
            timestamp: new Date(),
            passed: true,
            overall_score: 0,
            test_results: [:],
            recommendations: []
        ]
        
        try {
            // 1. Single Request Response Time
            results.test_results.response_time = validateResponseTime(apiEndpoint, testConfig)
            
            // 2. Bulk Operations Performance  
            if (apiEndpoint.contains('/reorder') || testConfig.bulk_operation) {
                results.test_results.bulk_performance = validateBulkPerformance(apiEndpoint, testConfig)
            }
            
            // 3. Concurrent User Load
            results.test_results.concurrent_load = validateConcurrentLoad(apiEndpoint, testConfig)
            
            // 4. Large Dataset Handling
            results.test_results.large_dataset = validateLargeDataset(apiEndpoint, testConfig)
            
            // 5. Memory Usage Validation
            results.test_results.memory_usage = validateMemoryUsage(apiEndpoint, testConfig)
            
            // Calculate overall score and pass/fail
            calculateOverallResults(results)
            
        } catch (Exception e) {
            results.passed = false
            results.error = "Performance validation failed: ${e.message}"
        }
        
        return results
    }
    
    private static Map validateResponseTime(String endpoint, Map config) {
        def startTime = System.currentTimeMillis()
        def testResult = [
            test_name: 'API Response Time',
            baseline: PERFORMANCE_BASELINES.api_response_time_ms,
            actual_time: 0,
            passed: false,
            percentile_95: 0,
            measurements: []
        ]
        
        try {
            // Warm-up requests
            3.times { makeTestRequest(endpoint, 'GET', config) }
            
            // Performance measurement - 20 requests for p95 calculation
            def measurements = []
            20.times {
                def requestStart = System.nanoTime()
                def response = makeTestRequest(endpoint, 'GET', config)
                def requestTime = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - requestStart)
                measurements << requestTime
            }
            
            measurements.sort()
            testResult.measurements = measurements
            testResult.actual_time = measurements[(int)(measurements.size() * 0.95)] // p95
            testResult.percentile_95 = testResult.actual_time
            testResult.passed = testResult.actual_time <= testResult.baseline
            
            if (!testResult.passed) {
                testResult.recommendation = "Response time ${testResult.actual_time}ms exceeds baseline ${testResult.baseline}ms. Consider query optimization or caching."
            }
            
        } catch (Exception e) {
            testResult.error = "Response time test failed: ${e.message}"
        }
        
        return testResult
    }
    
    private static Map validateBulkPerformance(String endpoint, Map config) {
        def testResult = [
            test_name: 'Bulk Operation Performance',
            baseline: PERFORMANCE_BASELINES.bulk_operation_time_ms,
            actual_time: 0,
            passed: false,
            payload_size: config.payload_size ?: 50
        ]
        
        try {
            // Generate bulk operation payload
            def bulkPayload = generateBulkReorderPayload(testResult.payload_size)
            
            def startTime = System.nanoTime()
            def response = makeTestRequest(endpoint, 'PUT', [body: bulkPayload])
            testResult.actual_time = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startTime)
            
            testResult.passed = testResult.actual_time <= testResult.baseline
            
            if (!testResult.passed) {
                testResult.recommendation = "Bulk operation ${testResult.actual_time}ms exceeds baseline ${testResult.baseline}ms. Consider transaction optimization or batch processing."
            }
            
        } catch (Exception e) {
            testResult.error = "Bulk performance test failed: ${e.message}"
        }
        
        return testResult
    }
    
    private static Map validateConcurrentLoad(String endpoint, Map config) {
        def testResult = [
            test_name: 'Concurrent User Load',
            baseline: PERFORMANCE_BASELINES.concurrent_users,
            concurrent_requests: config.concurrent_requests ?: 10,
            passed: false,
            success_rate: 0,
            avg_response_time: 0
        ]
        
        try {
            def executor = Executors.newFixedThreadPool(testResult.concurrent_requests)
            def successCount = new AtomicInteger(0)
            def totalResponseTime = new AtomicInteger(0)
            def futures = []
            
            // Launch concurrent requests
            testResult.concurrent_requests.times { i ->
                futures << executor.submit({
                    try {
                        def startTime = System.nanoTime()
                        def response = makeTestRequest(endpoint, 'GET', config)
                        def responseTime = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startTime)
                        
                        totalResponseTime.addAndGet(responseTime)
                        successCount.incrementAndGet()
                        
                        return [success: true, responseTime: responseTime]
                    } catch (Exception e) {
                        return [success: false, error: e.message]
                    }
                })
            }
            
            // Wait for all requests to complete
            futures.each { it.get() }
            executor.shutdown()
            
            testResult.success_rate = (successCount.get() / testResult.concurrent_requests) * 100
            testResult.avg_response_time = totalResponseTime.get() / successCount.get()
            testResult.passed = testResult.success_rate >= 95 && testResult.avg_response_time <= PERFORMANCE_BASELINES.api_response_time_ms
            
            if (!testResult.passed) {
                testResult.recommendation = "Concurrent load test failed. Success rate: ${testResult.success_rate}%, Avg response: ${testResult.avg_response_time}ms. Consider connection pooling or load balancing."
            }
            
        } catch (Exception e) {
            testResult.error = "Concurrent load test failed: ${e.message}"
        }
        
        return testResult
    }
    
    private static Map validateLargeDataset(String endpoint, Map config) {
        def testResult = [
            test_name: 'Large Dataset Handling',
            baseline: PERFORMANCE_BASELINES.api_response_time_ms,
            record_count: PERFORMANCE_BASELINES.large_dataset_records,
            passed: false,
            actual_time: 0
        ]
        
        try {
            // Test with filtering for large datasets
            def filterParams = [
                planInstanceId: generateTestUUID(),
                migrationId: generateTestUUID(),
                // Add complex filtering to simulate real-world usage
            ]
            
            def startTime = System.nanoTime()
            def response = makeTestRequest(endpoint, 'GET', [params: filterParams])
            testResult.actual_time = TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - startTime)
            
            testResult.passed = testResult.actual_time <= testResult.baseline
            
            if (!testResult.passed) {
                testResult.recommendation = "Large dataset query ${testResult.actual_time}ms exceeds baseline. Consider database indexing, pagination, or query optimization."
            }
            
        } catch (Exception e) {
            testResult.error = "Large dataset test failed: ${e.message}"
        }
        
        return testResult
    }
    
    private static Map validateMemoryUsage(String endpoint, Map config) {
        def testResult = [
            test_name: 'Memory Usage Validation',
            baseline: PERFORMANCE_BASELINES.memory_usage_mb,
            passed: false,
            initial_memory: 0,
            peak_memory: 0,
            final_memory: 0
        ]
        
        try {
            Runtime runtime = Runtime.getRuntime()
            System.gc() // Force garbage collection for accurate measurement
            
            testResult.initial_memory = (runtime.totalMemory() - runtime.freeMemory()) / 1024 / 1024
            
            // Perform memory-intensive operations
            10.times {
                makeTestRequest(endpoint, 'GET', config)
            }
            
            testResult.peak_memory = (runtime.totalMemory() - runtime.freeMemory()) / 1024 / 1024
            
            System.gc()
            testResult.final_memory = (runtime.totalMemory() - runtime.freeMemory()) / 1024 / 1024
            
            def memoryIncrease = testResult.peak_memory - testResult.initial_memory
            testResult.passed = memoryIncrease <= testResult.baseline
            
            if (!testResult.passed) {
                testResult.recommendation = "Memory usage increased by ${memoryIncrease}MB, exceeding baseline. Consider memory optimization or garbage collection tuning."
            }
            
        } catch (Exception e) {
            testResult.error = "Memory usage test failed: ${e.message}"
        }
        
        return testResult
    }
    
    private static void calculateOverallResults(Map results) {
        def totalTests = results.test_results.size()
        def passedTests = results.test_results.values().count { it.passed }
        
        results.overall_score = Math.round((passedTests / totalTests) * 100)
        results.passed = results.overall_score >= 80 // 80% pass rate required
        
        // Collect recommendations
        results.test_results.values().each { test ->
            if (test.recommendation) {
                results.recommendations << test.recommendation
            }
        }
    }
    
    // Helper methods for test execution
    private static Map makeTestRequest(String endpoint, String method, Map config = [:]) {
        // Mock implementation - replace with actual HTTP client calls
        Thread.sleep(10 + (Math.random() * 50) as long) // Simulate realistic response time
        
        return [
            status: 200,
            data: [success: true],
            timestamp: System.currentTimeMillis()
        ]
    }
    
    private static String generateBulkReorderPayload(int sequenceCount) {
        def sequences = []
        sequenceCount.times { i ->
            sequences << [
                id: generateTestUUID(),
                order: i + 1
            ]
        }
        
        return new JsonBuilder([
            planId: generateTestUUID(),
            sequences: sequences
        ]).toString()
    }
    
    private static String generateTestUUID() {
        return UUID.randomUUID().toString()
    }
    
    /**
     * Continuous performance monitoring for deployed APIs
     */
    static Map runContinuousMonitoring(List<String> endpoints) {
        def monitoringResults = [
            start_time: new Date(),
            endpoints_monitored: endpoints.size(),
            overall_health: 'HEALTHY',
            alerts: [],
            performance_trends: [:]
        ]
        
        endpoints.each { endpoint ->
            def results = validatePerformanceBaselines(endpoint)
            monitoringResults.performance_trends[endpoint] = results
            
            if (!results.passed) {
                monitoringResults.alerts << [
                    severity: 'HIGH',
                    endpoint: endpoint,
                    issue: "Performance baseline violation: ${results.overall_score}% pass rate",
                    timestamp: new Date()
                ]
                
                if (monitoringResults.overall_health == 'HEALTHY') {
                    monitoringResults.overall_health = 'DEGRADED'
                }
            }
        }
        
        return monitoringResults
    }
    
    /**
     * Generate performance report for Sprint 0 completion
     */
    static Map generateSprintPerformanceReport(List<String> completedAPIs) {
        def report = [
            sprint: 'Sprint 0',
            completion_date: new Date(),
            apis_tested: completedAPIs.size(),
            performance_summary: [:],
            recommendations: [],
            next_sprint_targets: [:]
        ]
        
        completedAPIs.each { api ->
            report.performance_summary[api] = validatePerformanceBaselines(api)
        }
        
        // Analyze trends and set targets for next sprint
        calculateSprintTrends(report)
        
        return report
    }
    
    private static void calculateSprintTrends(Map report) {
        def avgScores = report.performance_summary.values().collect { it.overall_score }
        def sprintAverage = avgScores.sum() / avgScores.size()
        
        report.sprint_performance_average = Math.round(sprintAverage)
        
        if (sprintAverage >= 90) {
            report.next_sprint_targets.performance_improvement = 'Maintain excellence, focus on edge cases'
        } else if (sprintAverage >= 80) {
            report.next_sprint_targets.performance_improvement = 'Optimize failing tests, add monitoring'
        } else {
            report.next_sprint_targets.performance_improvement = 'Critical: Review architecture, add caching'
        }
    }
}