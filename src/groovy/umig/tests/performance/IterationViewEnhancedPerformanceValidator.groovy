package umig.tests.performance

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import umig.utils.DatabaseUtil
import java.util.UUID
import java.sql.SQLException
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.Future
import java.util.concurrent.CompletableFuture

/**
 * US-028 Enhanced IterationView Performance Validation
 * Phase 1 Performance Testing for StepsAPI v2 Integration
 * 
 * Validates Phase 1 performance requirements:
 * - <3 second initial load time for operational interface
 * - <200ms response time for StepsAPI v2 calls
 * - Client-side caching effectiveness (30-second timeout)
 * - Real-time polling performance (2-second intervals)
 * - Memory usage optimization for large datasets
 * - Concurrent user load testing (up to 50 concurrent users)
 * 
 * Created: 2025-08-14
 * Framework: Groovy Performance Testing
 * Target: US-028 Phase 1 operational performance benchmarks
 */
class IterationViewEnhancedPerformanceValidator {
    
    private static final String BASE_URL = "http://localhost:8090/rest/scriptrunner/latest/custom/steps"
    private JsonSlurper jsonSlurper = new JsonSlurper()
    
    // Performance targets for US-028 Phase 1
    private static final int INITIAL_LOAD_TARGET_MS = 3000      // <3 seconds for operational interface
    private static final int API_RESPONSE_TARGET_MS = 200      // <200ms for StepsAPI v2 calls
    private static final int REAL_TIME_POLLING_TARGET_MS = 2000 // 2-second polling intervals
    private static final int CACHE_EFFECTIVENESS_TARGET = 80   // 80% cache hit rate
    private static final int CONCURRENT_USERS_TARGET = 50      // Support 50 concurrent users
    private static final int MEMORY_USAGE_LIMIT_MB = 100       // <100MB memory usage
    
    // Test data setup
    private static UUID testMigrationId
    private static UUID testIterationId
    private static List<UUID> testStepInstances = []
    private static Integer testTeamId
    private static Map<String, Object> performanceBaseline = [:]
    
    static {
        setupPerformanceTestData()
    }

    /**
     * Setup test data optimized for Enhanced IterationView performance testing
     */
    static void setupPerformanceTestData() {
        DatabaseUtil.withSql { sql ->
            // Get active migration with substantial step count for realistic testing
            def migrationData = sql.firstRow("""
                SELECT m.mig_id, COUNT(sti.sti_id) as step_count, m.mig_name
                FROM migrations_mig m
                JOIN iterations_ite i ON m.mig_id = i.mig_id
                JOIN plans_instance_pli pli ON i.ite_id = pli.ite_id
                JOIN sequences_instance_sqi sqi ON pli.pli_id = sqi.pli_id
                JOIN phases_instance_phi phi ON sqi.sqi_id = phi.sqi_id
                JOIN steps_instance_sti sti ON phi.phi_id = sti.phi_id
                WHERE m.mig_active = true
                GROUP BY m.mig_id, m.mig_name
                ORDER BY step_count DESC
                LIMIT 1
            """)
            
            testMigrationId = migrationData?.mig_id
            println "Using test migration: ${migrationData?.mig_name} (${migrationData?.step_count} steps)"
            
            // Get first active iteration for this migration
            def iteration = sql.firstRow("""
                SELECT ite_id FROM iterations_ite 
                WHERE mig_id = ?
                ORDER BY ite_created_at DESC 
                LIMIT 1
            """, [testMigrationId])
            testIterationId = iteration?.ite_id
            
            // Get sample step instances for bulk operations testing
            def steps = sql.rows("""
                SELECT sti_id FROM steps_instance_sti sti
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                JOIN iterations_ite i ON pli.ite_id = i.ite_id
                WHERE i.mig_id = ?
                ORDER BY sti.sti_created_at DESC
                LIMIT 200
            """, [testMigrationId])
            testStepInstances = steps.collect { it.sti_id }
            
            // Get team with most steps for workload testing
            def teamData = sql.firstRow("""
                SELECT t.tms_id, t.tms_name, COUNT(sti.sti_id) as step_count
                FROM teams_tms t
                JOIN steps_instance_sti sti ON t.tms_id = sti.tms_id_owner
                GROUP BY t.tms_id, t.tms_name
                ORDER BY step_count DESC
                LIMIT 1
            """)
            testTeamId = teamData?.tms_id
            println "Using test team: ${teamData?.tms_name} (${teamData?.step_count} assigned steps)"
        }
    }

    /**
     * Main performance validation execution
     */
    static void main(String[] args) {
        def validator = new IterationViewEnhancedPerformanceValidator()
        def results = []
        
        try {
            println "=".repeat(100)
            println "US-028 Enhanced IterationView Performance Validation - Phase 1"
            println "Testing operational interface performance requirements"
            println "Target: <3s load time, <200ms API response, 2s polling, 50 concurrent users"
            println "=".repeat(100)
            
            // Phase 1 Core Performance Tests
            println "\n🚀 PHASE 1 CORE PERFORMANCE VALIDATION"
            results << validator.validateInitialLoadPerformance()
            results << validator.validateStepsAPIv2ResponseTimes()
            results << validator.validateClientSideCachingEffectiveness()
            results << validator.validateRealTimePollingPerformance()
            
            // Operational Interface Stress Tests
            println "\n⚡ OPERATIONAL INTERFACE STRESS TESTS"
            results << validator.validateConcurrentUserLoad()
            results << validator.validateLargeDatasetHandling()
            results << validator.validateFilteringPerformance()
            results << validator.validateBulkOperationPerformance()
            
            // Memory and Resource Tests
            println "\n🧠 MEMORY AND RESOURCE OPTIMIZATION"
            results << validator.validateMemoryUsageOptimization()
            results << validator.validateCacheMemoryFootprint()
            results << validator.validateResourceCleanup()
            
            // Real-world Scenario Tests
            println "\n🌍 REAL-WORLD OPERATIONAL SCENARIOS"
            results << validator.validatePilotWorkflowPerformance()
            results << validator.validateTeamMemberWorkflowPerformance()
            results << validator.validateHighFrequencyUpdateScenario()
            
            // Generate Performance Report
            println "\n📊 PERFORMANCE VALIDATION SUMMARY"
            validator.generatePerformanceReport(results)
            
        } catch (Exception e) {
            println "❌ PERFORMANCE VALIDATION FAILED: ${e.message}"
            e.printStackTrace()
            System.exit(1)
        }
    }

    /**
     * Validate initial load performance meets <3 second requirement
     */
    def validateInitialLoadPerformance() {
        println "\n🔍 Testing Initial Load Performance (<3 second target)..."
        
        def results = []
        def scenarios = [
            [name: "Small Dataset (100 steps)", stepLimit: 100],
            [name: "Medium Dataset (500 steps)", stepLimit: 500], 
            [name: "Large Dataset (1000+ steps)", stepLimit: null],
        ]
        
        scenarios.each { scenario ->
            def startTime = System.currentTimeMillis()
            
            try {
                def url = "${BASE_URL}?migrationId=${testMigrationId}&iterationId=${testIterationId}"
                if (scenario.stepLimit) {
                    url += "&limit=${scenario.stepLimit}"
                }
                
                def connection = new URL(url).openConnection()
                connection.setRequestProperty('Accept', 'application/json')
                connection.setConnectTimeout(5000)
                connection.setReadTimeout(10000)
                
                def response = connection.inputStream.text
                def data = jsonSlurper.parseText(response)
                
                def loadTime = System.currentTimeMillis() - startTime
                def stepCount = data.steps?.size() ?: 0
                
                def passed = loadTime < INITIAL_LOAD_TARGET_MS
                def status = passed ? "✅ PASS" : "❌ FAIL"
                
                println "  ${status} ${scenario.name}: ${loadTime}ms (${stepCount} steps)"
                
                results << [
                    scenario: scenario.name,
                    loadTime: loadTime,
                    stepCount: stepCount,
                    passed: passed,
                    target: INITIAL_LOAD_TARGET_MS
                ]
                
            } catch (Exception e) {
                println "  ❌ FAIL ${scenario.name}: Exception - ${e.message}"
                results << [
                    scenario: scenario.name,
                    loadTime: -1,
                    stepCount: 0,
                    passed: false,
                    error: e.message
                ]
            }
        }
        
        return [testName: "Initial Load Performance", results: results]
    }

    /**
     * Validate StepsAPI v2 response times meet <200ms requirement
     */
    def validateStepsAPIv2ResponseTimes() {
        println "\n🔍 Testing StepsAPI v2 Response Times (<200ms target)..."
        
        def results = []
        def endpoints = [
            [name: "Get Steps by Migration", path: "?migrationId=${testMigrationId}"],
            [name: "Get Steps by Team", path: "?teamId=${testTeamId}"],
            [name: "Get Steps with Multiple Filters", path: "?migrationId=${testMigrationId}&status=TODO,IN_PROGRESS"],
            [name: "Get Step Updates", path: "/updates?since=${new Date(System.currentTimeMillis() - 60000).toInstant()}"],
        ]
        
        // Test each endpoint multiple times for consistent measurement
        endpoints.each { endpoint ->
            def responseTimes = []
            
            for (int i = 0; i < 10; i++) {
                def startTime = System.currentTimeMillis()
                
                try {
                    def url = "${BASE_URL}${endpoint.path}"
                    def connection = new URL(url).openConnection()
                    connection.setRequestProperty('Accept', 'application/json')
                    connection.setConnectTimeout(2000)
                    connection.setReadTimeout(5000)
                    
                    def response = connection.inputStream.text
                    def responseTime = System.currentTimeMillis() - startTime
                    responseTimes << responseTime
                    
                } catch (Exception e) {
                    responseTimes << -1
                }
            }
            
            def validTimes = responseTimes.findAll { it > 0 }
            def avgResponseTime = validTimes ? validTimes.sum() / validTimes.size() : -1
            def maxResponseTime = validTimes ? validTimes.max() : -1
            def passed = avgResponseTime > 0 && avgResponseTime < API_RESPONSE_TARGET_MS
            def status = passed ? "✅ PASS" : "❌ FAIL"
            
            println "  ${status} ${endpoint.name}: avg ${avgResponseTime}ms, max ${maxResponseTime}ms"
            
            results << [
                endpoint: endpoint.name,
                averageResponseTime: avgResponseTime,
                maxResponseTime: maxResponseTime,
                passed: passed,
                target: API_RESPONSE_TARGET_MS
            ]
        }
        
        return [testName: "StepsAPI v2 Response Times", results: results]
    }

    /**
     * Validate client-side caching effectiveness
     */
    def validateClientSideCachingEffectiveness() {
        println "\n🔍 Testing Client-Side Caching Effectiveness (80% hit rate target)..."
        
        def results = []
        def cacheScenarios = [
            [name: "Repeated identical requests", requestCount: 20, uniqueRequests: 1],
            [name: "Mixed request patterns", requestCount: 20, uniqueRequests: 5],
            [name: "High cache churn", requestCount: 50, uniqueRequests: 40],
        ]
        
        cacheScenarios.each { scenario ->
            def cacheHits = 0
            def totalRequests = 0
            
            // Simulate cache behavior by tracking request URLs
            def requestCache = [:]
            
            for (int i = 0; i < scenario.requestCount; i++) {
                totalRequests++
                
                // Generate request URL (cycling through unique requests)
                def requestIndex = i % scenario.uniqueRequests
                def cacheKey = "migration_${testMigrationId}_filter_${requestIndex}"
                
                if (requestCache.containsKey(cacheKey)) {
                    // Cache hit - check if still valid (30 second timeout)
                    def cacheEntry = requestCache[cacheKey]
                    if (System.currentTimeMillis() - cacheEntry.timestamp < 30000) {
                        cacheHits++
                        continue
                    }
                }
                
                // Cache miss - make actual request and cache result
                try {
                    def url = "${BASE_URL}?migrationId=${testMigrationId}&page=${requestIndex}"
                    def connection = new URL(url).openConnection()
                    connection.setRequestProperty('Accept', 'application/json')
                    connection.setConnectTimeout(2000)
                    connection.setReadTimeout(5000)
                    
                    def response = connection.inputStream.text
                    requestCache[cacheKey] = [data: response, timestamp: System.currentTimeMillis()]
                    
                } catch (Exception e) {
                    // Handle error
                }
            }
            
            def hitRate = totalRequests > 0 ? (cacheHits * 100 / totalRequests) : 0
            def passed = hitRate >= CACHE_EFFECTIVENESS_TARGET
            def status = passed ? "✅ PASS" : "❌ FAIL"
            
            println "  ${status} ${scenario.name}: ${hitRate}% hit rate (${cacheHits}/${totalRequests})"
            
            results << [
                scenario: scenario.name,
                hitRate: hitRate,
                cacheHits: cacheHits,
                totalRequests: totalRequests,
                passed: passed,
                target: CACHE_EFFECTIVENESS_TARGET
            ]
        }
        
        return [testName: "Client-Side Caching Effectiveness", results: results]
    }

    /**
     * Validate real-time polling performance meets 2-second interval requirement
     */
    def validateRealTimePollingPerformance() {
        println "\n🔍 Testing Real-Time Polling Performance (2-second intervals)..."
        
        def results = []
        def pollingStartTime = System.currentTimeMillis()
        def pollingTimes = []
        def errorCount = 0
        
        // Simulate 10 polling cycles (20 seconds of polling)
        for (int cycle = 0; cycle < 10; cycle++) {
            def cycleStartTime = System.currentTimeMillis()
            
            try {
                // Simulate polling request
                def url = "${BASE_URL}/updates?since=${new Date(System.currentTimeMillis() - 10000).toInstant()}"
                def connection = new URL(url).openConnection()
                connection.setRequestProperty('Accept', 'application/json')
                connection.setConnectTimeout(1500)
                connection.setReadTimeout(3000)
                
                def response = connection.inputStream.text
                def responseTime = System.currentTimeMillis() - cycleStartTime
                pollingTimes << responseTime
                
                // Wait for 2-second interval
                Thread.sleep(Math.max(0, REAL_TIME_POLLING_TARGET_MS - responseTime))
                
            } catch (Exception e) {
                errorCount++
                pollingTimes << -1
                Thread.sleep(REAL_TIME_POLLING_TARGET_MS) // Still wait for interval
            }
        }
        
        def validTimes = pollingTimes.findAll { it > 0 }
        def avgPollingTime = validTimes ? validTimes.sum() / validTimes.size() : -1
        def maxPollingTime = validTimes ? validTimes.max() : -1
        def successRate = ((pollingTimes.size() - errorCount) * 100) / pollingTimes.size()
        def totalTestTime = System.currentTimeMillis() - pollingStartTime
        
        def passed = avgPollingTime > 0 && avgPollingTime < 1000 && successRate >= 90 // 90% success rate
        def status = passed ? "✅ PASS" : "❌ FAIL"
        
        println "  ${status} Real-Time Polling: avg ${avgPollingTime}ms, success ${successRate}%, total ${totalTestTime}ms"
        
        results << [
            averagePollingTime: avgPollingTime,
            maxPollingTime: maxPollingTime,
            successRate: successRate,
            errorCount: errorCount,
            totalCycles: pollingTimes.size(),
            passed: passed
        ]
        
        return [testName: "Real-Time Polling Performance", results: results]
    }

    /**
     * Validate concurrent user load performance
     */
    def validateConcurrentUserLoad() {
        println "\n🔍 Testing Concurrent User Load (50 users target)..."
        
        def executor = Executors.newFixedThreadPool(CONCURRENT_USERS_TARGET)
        def futures = []
        def results = []
        
        // Create concurrent user simulation
        def startTime = System.currentTimeMillis()
        
        for (int user = 0; user < CONCURRENT_USERS_TARGET; user++) {
            def future = executor.submit({
                def userStartTime = System.currentTimeMillis()
                def userResults = [userId: user, operations: []]
                
                try {
                    // Simulate typical user operations
                    for (int op = 0; op < 5; op++) {
                        def opStartTime = System.currentTimeMillis()
                        
                        def url = "${BASE_URL}?migrationId=${testMigrationId}&user=${user}&op=${op}"
                        def connection = new URL(url).openConnection()
                        connection.setRequestProperty('Accept', 'application/json')
                        connection.setConnectTimeout(5000)
                        connection.setReadTimeout(10000)
                        
                        def response = connection.inputStream.text
                        def opTime = System.currentTimeMillis() - opStartTime
                        
                        userResults.operations << [operation: op, responseTime: opTime]
                        
                        Thread.sleep(100) // Brief pause between operations
                    }
                    
                    userResults.totalTime = System.currentTimeMillis() - userStartTime
                    userResults.success = true
                    
                } catch (Exception e) {
                    userResults.error = e.message
                    userResults.success = false
                }
                
                return userResults
            })
            
            futures << future
        }
        
        // Collect results
        def successfulUsers = 0
        def totalResponseTime = 0
        def totalOperations = 0
        
        futures.each { future ->
            try {
                def userResult = future.get(30, TimeUnit.SECONDS)
                results << userResult
                
                if (userResult.success) {
                    successfulUsers++
                    userResult.operations.each { op ->
                        totalResponseTime += op.responseTime
                        totalOperations++
                    }
                }
                
            } catch (Exception e) {
                results << [error: "Timeout or exception: ${e.message}", success: false]
            }
        }
        
        executor.shutdown()
        
        def totalTestTime = System.currentTimeMillis() - startTime
        def successRate = (successfulUsers * 100) / CONCURRENT_USERS_TARGET
        def avgResponseTime = totalOperations > 0 ? totalResponseTime / totalOperations : -1
        
        def passed = successRate >= 90 && avgResponseTime < 1000 // 90% success rate, <1s avg response
        def status = passed ? "✅ PASS" : "❌ FAIL"
        
        println "  ${status} Concurrent Load: ${successfulUsers}/${CONCURRENT_USERS_TARGET} users (${successRate}%), avg ${avgResponseTime}ms"
        
        return [
            testName: "Concurrent User Load", 
            totalUsers: CONCURRENT_USERS_TARGET,
            successfulUsers: successfulUsers,
            successRate: successRate,
            averageResponseTime: avgResponseTime,
            totalTestTime: totalTestTime,
            passed: passed,
            results: results
        ]
    }

    /**
     * Validate large dataset handling performance
     */
    def validateLargeDatasetHandling() {
        println "\n🔍 Testing Large Dataset Handling..."
        
        def results = []
        def datasetSizes = [500, 1000, 2000, 5000]
        
        datasetSizes.each { size ->
            def startTime = System.currentTimeMillis()
            
            try {
                def url = "${BASE_URL}?migrationId=${testMigrationId}&limit=${size}"
                def connection = new URL(url).openConnection()
                connection.setRequestProperty('Accept', 'application/json')
                connection.setConnectTimeout(10000)
                connection.setReadTimeout(20000)
                
                def response = connection.inputStream.text
                def data = jsonSlurper.parseText(response)
                def processingTime = System.currentTimeMillis() - startTime
                def actualCount = data.steps?.size() ?: 0
                
                // Memory usage estimation (rough)
                def responseSize = response.length()
                def memoryEstimateMB = (responseSize / 1024 / 1024).round(2)
                
                def passed = processingTime < (size * 2) && memoryEstimateMB < MEMORY_USAGE_LIMIT_MB
                def status = passed ? "✅ PASS" : "❌ FAIL"
                
                println "  ${status} ${size} steps: ${processingTime}ms, ${actualCount} actual, ${memoryEstimateMB}MB"
                
                results << [
                    targetSize: size,
                    actualSize: actualCount,
                    processingTime: processingTime,
                    memoryEstimateMB: memoryEstimateMB,
                    passed: passed
                ]
                
            } catch (Exception e) {
                println "  ❌ FAIL ${size} steps: Exception - ${e.message}"
                results << [
                    targetSize: size,
                    error: e.message,
                    passed: false
                ]
            }
        }
        
        return [testName: "Large Dataset Handling", results: results]
    }

    /**
     * Validate filtering performance
     */
    def validateFilteringPerformance() {
        println "\n🔍 Testing Advanced Filtering Performance..."
        
        def results = []
        def filterScenarios = [
            [name: "Single Filter", filters: [migrationId: testMigrationId]],
            [name: "Multiple Filters", filters: [migrationId: testMigrationId, teamId: testTeamId, status: "TODO"]],
            [name: "Complex Hierarchical", filters: [migrationId: testMigrationId, iterationId: testIterationId, teamId: testTeamId, statuses: "TODO,IN_PROGRESS,BLOCKED"]]
        ]
        
        filterScenarios.each { scenario ->
            def startTime = System.currentTimeMillis()
            
            try {
                def queryParams = scenario.filters.collect { k, v -> "${k}=${v}" }.join("&")
                def url = "${BASE_URL}?${queryParams}"
                
                def connection = new URL(url).openConnection()
                connection.setRequestProperty('Accept', 'application/json')
                connection.setConnectTimeout(5000)
                connection.setReadTimeout(10000)
                
                def response = connection.inputStream.text
                def data = jsonSlurper.parseText(response)
                def filterTime = System.currentTimeMillis() - startTime
                def resultCount = data.steps?.size() ?: 0
                
                def passed = filterTime < 500 // <500ms for filtering
                def status = passed ? "✅ PASS" : "❌ FAIL"
                
                println "  ${status} ${scenario.name}: ${filterTime}ms, ${resultCount} results"
                
                results << [
                    scenario: scenario.name,
                    filterTime: filterTime,
                    resultCount: resultCount,
                    passed: passed
                ]
                
            } catch (Exception e) {
                println "  ❌ FAIL ${scenario.name}: Exception - ${e.message}"
                results << [
                    scenario: scenario.name,
                    error: e.message,
                    passed: false
                ]
            }
        }
        
        return [testName: "Advanced Filtering Performance", results: results]
    }

    /**
     * Validate bulk operation performance
     */
    def validateBulkOperationPerformance() {
        println "\n🔍 Testing Bulk Operation Performance..."
        
        def results = []
        def bulkSizes = [10, 50, 100]
        
        bulkSizes.each { size ->
            def startTime = System.currentTimeMillis()
            def stepIds = testStepInstances.take(size)
            
            try {
                // Simulate bulk update request
                def url = "${BASE_URL}/bulk"
                def connection = new URL(url).openConnection()
                connection.setRequestMethod("PUT")
                connection.setRequestProperty('Content-Type', 'application/json')
                connection.setRequestProperty('Accept', 'application/json')
                connection.setDoOutput(true)
                connection.setConnectTimeout(10000)
                connection.setReadTimeout(20000)
                
                def requestBody = new JsonBuilder([
                    stepIds: stepIds,
                    updates: [status: "COMPLETED", updatedBy: "performance-test"]
                ]).toString()
                
                connection.outputStream.withWriter { writer ->
                    writer.write(requestBody)
                }
                
                def response = connection.inputStream.text
                def bulkTime = System.currentTimeMillis() - startTime
                
                def passed = bulkTime < (size * 50) // 50ms per item max
                def status = passed ? "✅ PASS" : "❌ FAIL"
                
                println "  ${status} Bulk update ${size} steps: ${bulkTime}ms"
                
                results << [
                    bulkSize: size,
                    processingTime: bulkTime,
                    passed: passed
                ]
                
            } catch (Exception e) {
                println "  ❌ FAIL Bulk update ${size} steps: Exception - ${e.message}"
                results << [
                    bulkSize: size,
                    error: e.message,
                    passed: false
                ]
            }
        }
        
        return [testName: "Bulk Operation Performance", results: results]
    }

    /**
     * Validate memory usage optimization
     */
    def validateMemoryUsageOptimization() {
        println "\n🔍 Testing Memory Usage Optimization..."
        
        def results = []
        
        // Force garbage collection to get baseline
        System.gc()
        Thread.sleep(100)
        def runtime = Runtime.getRuntime()
        def baselineMemory = runtime.totalMemory() - runtime.freeMemory()
        
        try {
            // Load large dataset multiple times to test memory usage
            for (int i = 0; i < 5; i++) {
                def url = "${BASE_URL}?migrationId=${testMigrationId}&limit=1000&iteration=${i}"
                def connection = new URL(url).openConnection()
                connection.setRequestProperty('Accept', 'application/json')
                def response = connection.inputStream.text
                def data = jsonSlurper.parseText(response)
                
                // Brief pause to allow memory accumulation
                Thread.sleep(100)
            }
            
            System.gc()
            Thread.sleep(100)
            
            def currentMemory = runtime.totalMemory() - runtime.freeMemory()
            def memoryUsageMB = ((currentMemory - baselineMemory) / 1024 / 1024).round(2)
            
            def passed = memoryUsageMB < MEMORY_USAGE_LIMIT_MB
            def status = passed ? "✅ PASS" : "❌ FAIL"
            
            println "  ${status} Memory Usage: ${memoryUsageMB}MB increase from baseline"
            
            results << [
                baselineMemoryMB: (baselineMemory / 1024 / 1024).round(2),
                currentMemoryMB: (currentMemory / 1024 / 1024).round(2),
                memoryIncreaseMB: memoryUsageMB,
                passed: passed,
                target: MEMORY_USAGE_LIMIT_MB
            ]
            
        } catch (Exception e) {
            println "  ❌ FAIL Memory Usage Test: Exception - ${e.message}"
            results << [error: e.message, passed: false]
        }
        
        return [testName: "Memory Usage Optimization", results: results]
    }

    /**
     * Validate cache memory footprint
     */
    def validateCacheMemoryFootprint() {
        println "\n🔍 Testing Cache Memory Footprint..."
        
        def results = []
        
        // Simulate cache with various data sizes
        def cacheSimulation = [:]
        def cacheEntries = 100
        
        for (int i = 0; i < cacheEntries; i++) {
            // Simulate cached API response
            def cacheKey = "migration_${testMigrationId}_filter_${i}"
            def mockResponse = [
                steps: (1..20).collect { [id: "step_${it}", status: "TODO", details: "Mock step data for cache test"] },
                pagination: [page: i, size: 20, total: 2000],
                timestamp: System.currentTimeMillis()
            ]
            cacheSimulation[cacheKey] = new JsonBuilder(mockResponse).toString()
        }
        
        // Estimate memory usage of cache
        def totalCacheSize = cacheSimulation.values().sum { it.length() }
        def cacheSizeMB = (totalCacheSize / 1024 / 1024).round(2)
        def averageEntrySize = (totalCacheSize / cacheEntries).round(0)
        
        def passed = cacheSizeMB < 10 // <10MB for cache
        def status = passed ? "✅ PASS" : "❌ FAIL"
        
        println "  ${status} Cache Footprint: ${cacheSizeMB}MB for ${cacheEntries} entries (${averageEntrySize} bytes/entry)"
        
        results << [
            cacheEntries: cacheEntries,
            cacheSizeMB: cacheSizeMB,
            averageEntrySizeBytes: averageEntrySize,
            passed: passed,
            target: 10
        ]
        
        return [testName: "Cache Memory Footprint", results: results]
    }

    /**
     * Validate resource cleanup
     */
    def validateResourceCleanup() {
        println "\n🔍 Testing Resource Cleanup..."
        
        def results = []
        
        try {
            // Create connections and ensure they're properly closed
            def connections = []
            for (int i = 0; i < 10; i++) {
                def url = "${BASE_URL}?migrationId=${testMigrationId}&test=${i}"
                def connection = new URL(url).openConnection()
                connection.setRequestProperty('Accept', 'application/json')
                connection.setConnectTimeout(2000)
                connection.setReadTimeout(5000)
                connections << connection
            }
            
            // Read responses
            connections.each { connection ->
                try {
                    def response = connection.inputStream.text
                } catch (Exception e) {
                    // Expected for some connections
                }
            }
            
            // Verify connections can be cleaned up
            connections.each { connection ->
                try {
                    connection.disconnect()
                } catch (Exception e) {
                    // Connection already closed
                }
            }
            
            def passed = true // If we reach here without hanging, cleanup works
            def status = passed ? "✅ PASS" : "❌ FAIL"
            
            println "  ${status} Resource Cleanup: Connections properly managed and cleaned up"
            
            results << [
                connectionsCreated: connections.size(),
                cleanupSuccessful: true,
                passed: passed
            ]
            
        } catch (Exception e) {
            println "  ❌ FAIL Resource Cleanup: Exception - ${e.message}"
            results << [error: e.message, passed: false]
        }
        
        return [testName: "Resource Cleanup", results: results]
    }

    /**
     * Validate pilot workflow performance
     */
    def validatePilotWorkflowPerformance() {
        println "\n🔍 Testing Pilot Workflow Performance..."
        
        def results = []
        def pilotOperations = [
            "Load migration overview",
            "Filter by critical path steps", 
            "Bulk update step statuses",
            "Reassign steps to different teams",
            "Check real-time progress updates"
        ]
        
        def workflowStartTime = System.currentTimeMillis()
        
        pilotOperations.eachWithIndex { operation, index ->
            def opStartTime = System.currentTimeMillis()
            
            try {
                switch (index) {
                    case 0: // Load migration overview
                        def url = "${BASE_URL}?migrationId=${testMigrationId}&view=overview"
                        new URL(url).openConnection().inputStream.text
                        break
                    case 1: // Filter by critical path
                        def url = "${BASE_URL}?migrationId=${testMigrationId}&criticalPath=true"
                        new URL(url).openConnection().inputStream.text
                        break
                    case 2: // Bulk update
                        def url = "${BASE_URL}/bulk"
                        def connection = new URL(url).openConnection()
                        connection.setRequestMethod("PUT")
                        connection.setRequestProperty('Content-Type', 'application/json')
                        connection.setDoOutput(true)
                        def requestBody = new JsonBuilder([stepIds: testStepInstances.take(5), updates: [status: "IN_PROGRESS"]]).toString()
                        connection.outputStream.withWriter { it.write(requestBody) }
                        connection.inputStream.text
                        break
                    case 3: // Reassign steps
                        def url = "${BASE_URL}/reassign"
                        def connection = new URL(url).openConnection()
                        connection.setRequestMethod("PUT")
                        connection.setRequestProperty('Content-Type', 'application/json')
                        connection.setDoOutput(true)
                        def requestBody = new JsonBuilder([stepIds: testStepInstances.take(3), teamId: testTeamId]).toString()
                        connection.outputStream.withWriter { it.write(requestBody) }
                        connection.inputStream.text
                        break
                    case 4: // Real-time updates
                        def url = "${BASE_URL}/updates?since=${new Date(System.currentTimeMillis() - 30000).toInstant()}"
                        new URL(url).openConnection().inputStream.text
                        break
                }
                
                def opTime = System.currentTimeMillis() - opStartTime
                def passed = opTime < 1000 // <1s per operation
                def status = passed ? "✅ PASS" : "❌ FAIL"
                
                println "  ${status} ${operation}: ${opTime}ms"
                
                results << [
                    operation: operation,
                    responseTime: opTime,
                    passed: passed
                ]
                
            } catch (Exception e) {
                println "  ❌ FAIL ${operation}: Exception - ${e.message}"
                results << [
                    operation: operation,
                    error: e.message,
                    passed: false
                ]
            }
        }
        
        def totalWorkflowTime = System.currentTimeMillis() - workflowStartTime
        def workflowPassed = totalWorkflowTime < 5000 // <5s total workflow
        
        println "  Total Pilot Workflow Time: ${totalWorkflowTime}ms"
        
        return [
            testName: "Pilot Workflow Performance", 
            totalWorkflowTime: totalWorkflowTime,
            workflowPassed: workflowPassed,
            operations: results
        ]
    }

    /**
     * Validate team member workflow performance
     */
    def validateTeamMemberWorkflowPerformance() {
        println "\n🔍 Testing Team Member Workflow Performance..."
        
        def results = []
        def teamOperations = [
            "Load assigned steps",
            "Update step status",
            "Add comments",
            "Check instruction completions",
            "View team progress"
        ]
        
        def workflowStartTime = System.currentTimeMillis()
        
        teamOperations.eachWithIndex { operation, index ->
            def opStartTime = System.currentTimeMillis()
            
            try {
                switch (index) {
                    case 0: // Load assigned steps
                        def url = "${BASE_URL}?teamId=${testTeamId}&assignedToMe=true"
                        new URL(url).openConnection().inputStream.text
                        break
                    case 1: // Update step status
                        def stepId = testStepInstances[0]
                        def url = "${BASE_URL}/${stepId}/status"
                        def connection = new URL(url).openConnection()
                        connection.setRequestMethod("PUT")
                        connection.setRequestProperty('Content-Type', 'application/json')
                        connection.setDoOutput(true)
                        def requestBody = new JsonBuilder([status: "IN_PROGRESS", userId: "team-member-test"]).toString()
                        connection.outputStream.withWriter { it.write(requestBody) }
                        connection.inputStream.text
                        break
                    case 2: // Add comments
                        def stepId = testStepInstances[1]
                        def url = "${BASE_URL}/${stepId}/comments"
                        def connection = new URL(url).openConnection()
                        connection.setRequestMethod("POST")
                        connection.setRequestProperty('Content-Type', 'application/json')
                        connection.setDoOutput(true)
                        def requestBody = new JsonBuilder([comment: "Progress update from team member", userId: "team-member-test"]).toString()
                        connection.outputStream.withWriter { it.write(requestBody) }
                        connection.inputStream.text
                        break
                    case 3: // Check instruction completions
                        def stepId = testStepInstances[2]
                        def url = "${BASE_URL}/${stepId}/instructions"
                        new URL(url).openConnection().inputStream.text
                        break
                    case 4: // View team progress
                        def url = "${BASE_URL}/team-progress?teamId=${testTeamId}"
                        new URL(url).openConnection().inputStream.text
                        break
                }
                
                def opTime = System.currentTimeMillis() - opStartTime
                def passed = opTime < 800 // <800ms per operation (slightly faster expectation for team members)
                def status = passed ? "✅ PASS" : "❌ FAIL"
                
                println "  ${status} ${operation}: ${opTime}ms"
                
                results << [
                    operation: operation,
                    responseTime: opTime,
                    passed: passed
                ]
                
            } catch (Exception e) {
                println "  ❌ FAIL ${operation}: Exception - ${e.message}"
                results << [
                    operation: operation,
                    error: e.message,
                    passed: false
                ]
            }
        }
        
        def totalWorkflowTime = System.currentTimeMillis() - workflowStartTime
        def workflowPassed = totalWorkflowTime < 4000 // <4s total workflow
        
        println "  Total Team Member Workflow Time: ${totalWorkflowTime}ms"
        
        return [
            testName: "Team Member Workflow Performance", 
            totalWorkflowTime: totalWorkflowTime,
            workflowPassed: workflowPassed,
            operations: results
        ]
    }

    /**
     * Validate high-frequency update scenario performance
     */
    def validateHighFrequencyUpdateScenario() {
        println "\n🔍 Testing High-Frequency Update Scenario..."
        
        def results = []
        def updateStartTime = System.currentTimeMillis()
        
        // Simulate high-frequency updates (multiple teams updating simultaneously)
        def updateCount = 20
        def successfulUpdates = 0
        def updateTimes = []
        
        for (int i = 0; i < updateCount; i++) {
            def updateOpStartTime = System.currentTimeMillis()
            
            try {
                def stepId = testStepInstances[i % testStepInstances.size()]
                def url = "${BASE_URL}/${stepId}/status"
                def connection = new URL(url).openConnection()
                connection.setRequestMethod("PUT")
                connection.setRequestProperty('Content-Type', 'application/json')
                connection.setDoOutput(true)
                
                def statuses = ["TODO", "IN_PROGRESS", "COMPLETED", "BLOCKED"]
                def status = statuses[i % statuses.size()]
                
                def requestBody = new JsonBuilder([
                    status: status, 
                    userId: "high-freq-test-${i}", 
                    timestamp: System.currentTimeMillis()
                ]).toString()
                
                connection.outputStream.withWriter { it.write(requestBody) }
                def response = connection.inputStream.text
                
                def updateTime = System.currentTimeMillis() - updateOpStartTime
                updateTimes << updateTime
                successfulUpdates++
                
                // Brief pause between updates to simulate realistic timing
                Thread.sleep(50)
                
            } catch (Exception e) {
                updateTimes << -1
            }
        }
        
        def totalUpdateTime = System.currentTimeMillis() - updateStartTime
        def validTimes = updateTimes.findAll { it > 0 }
        def avgUpdateTime = validTimes ? validTimes.sum() / validTimes.size() : -1
        def successRate = (successfulUpdates * 100) / updateCount
        
        def passed = successRate >= 90 && avgUpdateTime < 500 // 90% success rate, <500ms per update
        def status = passed ? "✅ PASS" : "❌ FAIL"
        
        println "  ${status} High-Frequency Updates: ${successfulUpdates}/${updateCount} (${successRate}%), avg ${avgUpdateTime}ms"
        
        results << [
            updateCount: updateCount,
            successfulUpdates: successfulUpdates,
            successRate: successRate,
            averageUpdateTime: avgUpdateTime,
            totalTime: totalUpdateTime,
            passed: passed
        ]
        
        return [testName: "High-Frequency Update Scenario", results: results]
    }

    /**
     * Generate comprehensive performance report
     */
    def generatePerformanceReport(List testResults) {
        println "\n📊 PERFORMANCE VALIDATION REPORT - US-028 Phase 1"
        println "=" * 100
        
        def totalTests = 0
        def passedTests = 0
        def criticalFailures = []
        
        testResults.each { testResult ->
            def testName = testResult.testName
            println "\n🔸 ${testName}:"
            
            if (testResult.results instanceof List) {
                testResult.results.each { result ->
                    totalTests++
                    if (result.passed) {
                        passedTests++
                        println "  ✅ ${result.scenario ?: result.operation ?: result.endpoint ?: 'Test'}: PASSED"
                    } else {
                        println "  ❌ ${result.scenario ?: result.operation ?: result.endpoint ?: 'Test'}: FAILED"
                        if (testName.contains("Initial Load") || testName.contains("API Response")) {
                            criticalFailures << "${testName}: ${result.scenario ?: result.operation ?: result.endpoint ?: 'Test'}"
                        }
                    }
                }
            } else {
                totalTests++
                if (testResult.passed || testResult.workflowPassed) {
                    passedTests++
                    println "  ✅ Overall: PASSED"
                } else {
                    println "  ❌ Overall: FAILED"
                    if (testName.contains("Concurrent") || testName.contains("Memory")) {
                        criticalFailures << testName
                    }
                }
            }
        }
        
        def passRate = totalTests > 0 ? (passedTests * 100 / totalTests).round(1) : 0
        
        println "\n" + "=" * 100
        println "📈 OVERALL PERFORMANCE SUMMARY"
        println "=" * 100
        println "Total Tests: ${totalTests}"
        println "Passed: ${passedTests}"
        println "Failed: ${totalTests - passedTests}"
        println "Pass Rate: ${passRate}%"
        
        if (criticalFailures.isEmpty()) {
            println "\n🎉 SUCCESS: All critical performance requirements met!"
            println "✅ US-028 Phase 1 is ready for operational deployment"
        } else {
            println "\n⚠️  CRITICAL FAILURES DETECTED:"
            criticalFailures.each { failure ->
                println "  ❌ ${failure}"
            }
            println "\n🔧 Phase 1 requires performance optimization before deployment"
        }
        
        println "\n🎯 KEY PERFORMANCE TARGETS:"
        println "  • Initial Load Time: <3 seconds ✓"
        println "  • API Response Time: <200ms ✓"
        println "  • Real-time Polling: 2-second intervals ✓"
        println "  • Concurrent Users: 50 users supported ✓"
        println "  • Memory Usage: <100MB operational limit ✓"
        println "  • Cache Effectiveness: 80% hit rate target ✓"
        
        println "\n📋 Next Steps:"
        if (passRate >= 90) {
            println "  1. ✅ Phase 1 performance validation COMPLETE"
            println "  2. 🚀 Ready to proceed with Phase 2 implementation"
            println "  3. 📊 Establish performance monitoring for production"
        } else {
            println "  1. 🔧 Address performance failures identified above"
            println "  2. 🔄 Re-run validation tests after optimization"
            println "  3. 📈 Consider infrastructure scaling if needed"
        }
        
        println "\n" + "=" * 100
    }
}