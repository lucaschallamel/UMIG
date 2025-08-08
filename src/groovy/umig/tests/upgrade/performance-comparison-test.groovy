#!/usr/bin/env groovy
/**
 * Performance Comparison Test for US-032
 * Compares post-upgrade performance against pre-upgrade baseline
 * 
 * Usage: groovy -cp postgres-driver.jar performance-comparison-test.groovy
 */

@Grab('org.postgresql:postgresql:42.7.3')
@Grab('org.apache.httpcomponents:httpclient:4.5.14')

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.sql.Sql
import org.apache.http.client.methods.HttpGet
import org.apache.http.impl.client.HttpClients
import org.apache.http.util.EntityUtils
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.CountDownLatch
import java.util.concurrent.ConcurrentLinkedQueue

class PerformanceComparisonTest {
    
    static final String DB_URL = "jdbc:postgresql://localhost:5432/umig_dev"
    static final String DB_USER = "umig_user"
    static final String DB_PASSWORD = "umig_password"
    static final String BASE_URL = "http://localhost:8090"
    
    def baseline = null
    def currentResults = [
        timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
        endpoints: [],
        databaseQueries: [:],
        loadTest: [:],
        summary: [:]
    ]
    
    static void main(String[] args) {
        println "⚡ Running Performance Comparison Test for US-032..."
        println "==================================================="
        
        def tester = new PerformanceComparisonTest()
        
        try {
            tester.loadBaseline()
            tester.runCurrentPerformanceTests()
            tester.compareAndReport()
            
            println "✅ Performance comparison completed successfully"
            
        } catch (Exception e) {
            println "❌ Performance comparison failed: ${e.message}"
            e.printStackTrace()
            System.exit(1)
        }
    }
    
    def loadBaseline() {
        println "\n📊 Loading Pre-Upgrade Baseline..."
        
        try {
            def baselineFile = new File('pre-upgrade-baseline.json')
            if (baselineFile.exists()) {
                baseline = new JsonSlurper().parse(baselineFile)
                println "  ✅ Baseline loaded from: pre-upgrade-baseline.json"
                println "  📅 Baseline timestamp: ${baseline.timestamp}"
                
                if (baseline.performanceMetrics) {
                    println "  📈 Baseline metrics available"
                } else {
                    println "  ⚠️ Baseline missing performance metrics"
                }
            } else {
                println "  ⚠️ No baseline file found - will create new performance baseline"
                baseline = null
            }
        } catch (Exception e) {
            println "  ❌ Error loading baseline: ${e.message}"
            baseline = null
        }
    }
    
    def runCurrentPerformanceTests() {
        println "\n🔬 Running Current Performance Tests..."
        
        // Test API endpoint performance
        testApiEndpointPerformance()
        
        // Test database query performance  
        testDatabaseQueryPerformance()
        
        // Run load testing
        runLoadTest()
        
        // Calculate summary statistics
        calculateSummaryStatistics()
    }
    
    def testApiEndpointPerformance() {
        println "\n  🌐 Testing API Endpoint Performance..."
        
        def endpoints = [
            '/rest/umig-api/v2/users',
            '/rest/umig-api/v2/teams',
            '/rest/umig-api/v2/environments',
            '/rest/umig-api/v2/applications',
            '/rest/umig-api/v2/labels',
            '/rest/umig-api/v2/steps',
            '/rest/umig-api/v2/plans',
            '/rest/umig-api/v2/sequences',
            '/rest/umig-api/v2/phases',
            '/rest/umig-api/v2/instructions',
            '/rest/umig-api/v2/controls',
            '/rest/umig-api/v2/migrations',
            '/rest/umig-api/v2/step-view',
            '/rest/umig-api/v2/team-members',
            '/rest/umig-api/v2/email-templates',
            '/rest/umig-api/v2/web'
        ]
        
        currentResults.endpoints = []
        
        println "    Testing ${endpoints.size()} endpoints (5 samples each)..."
        
        endpoints.each { endpoint ->
            def samples = []
            def successCount = 0
            
            // Take 5 samples per endpoint
            5.times { 
                def result = testEndpointPerformance(endpoint)
                if (result.success) {
                    samples << result.responseTime
                    successCount++
                }
                
                // Small delay between samples
                Thread.sleep(50)
            }
            
            if (!samples.isEmpty()) {
                def endpointResult = [
                    endpoint: endpoint,
                    samples: samples,
                    avgResponseTime: samples.sum() / samples.size(),
                    minResponseTime: samples.min(),
                    maxResponseTime: samples.max(),
                    successRate: (successCount / 5.0) * 100,
                    stdDeviation: calculateStandardDeviation(samples)
                ]
                
                currentResults.endpoints << endpointResult
                
                def avgTime = Math.round(endpointResult.avgResponseTime)
                println "      ${endpoint}: ${avgTime}ms avg (${endpointResult.minResponseTime}-${endpointResult.maxResponseTime}ms range)"
            } else {
                println "      ❌ ${endpoint}: All requests failed"
            }
        }
    }
    
    def testDatabaseQueryPerformance() {
        println "\n  🗄️  Testing Database Query Performance..."
        
        withSql { sql ->
            def queryTests = [:]
            
            // Test 1: Simple count query (5 samples)
            println "    Testing simple count query..."
            def countSamples = []
            5.times {
                def start = System.currentTimeMillis()
                sql.firstRow("SELECT COUNT(*) FROM umig_migration_master")
                countSamples << (System.currentTimeMillis() - start)
                Thread.sleep(10)
            }
            queryTests.simpleCount = [
                samples: countSamples,
                average: countSamples.sum() / countSamples.size(),
                min: countSamples.min(),
                max: countSamples.max()
            ]
            
            // Test 2: Complex join query (Step View)
            println "    Testing complex join query..."
            def joinSamples = []
            5.times {
                def start = System.currentTimeMillis()
                sql.rows("""
                    SELECT si.step_instance_id, si.step_name, si.status,
                           pli.plan_name, sqi.sequence_name, phi.phase_name, tm.team_name
                    FROM umig_step_instance si
                    LEFT JOIN umig_phase_instance phi ON si.phase_instance_id = phi.phase_instance_id
                    LEFT JOIN umig_sequence_instance sqi ON phi.sequence_instance_id = sqi.sequence_instance_id
                    LEFT JOIN umig_plan_instance pli ON sqi.plan_instance_id = pli.plan_instance_id
                    LEFT JOIN umig_team_master tm ON si.responsible_team_id = tm.team_id
                    ORDER BY si.expected_start_time
                    LIMIT 100
                """)
                joinSamples << (System.currentTimeMillis() - start)
                Thread.sleep(10)
            }
            queryTests.complexJoin = [
                samples: joinSamples,
                average: joinSamples.sum() / joinSamples.size(),
                min: joinSamples.min(),
                max: joinSamples.max()
            ]
            
            // Test 3: Hierarchical filtering
            println "    Testing hierarchical filtering query..."
            def filterSamples = []
            5.times {
                def start = System.currentTimeMillis()
                sql.rows("""
                    SELECT COUNT(*) as step_count,
                           AVG(expected_duration_minutes) as avg_duration,
                           COUNT(DISTINCT responsible_team_id) as teams_involved
                    FROM umig_step_instance si
                    JOIN umig_phase_instance phi ON si.phase_instance_id = phi.phase_instance_id
                    JOIN umig_sequence_instance sqi ON phi.sequence_instance_id = sqi.sequence_instance_id
                    JOIN umig_plan_instance pli ON sqi.plan_instance_id = pli.plan_instance_id
                    WHERE pli.status IN ('active', 'pending')
                    GROUP BY pli.plan_instance_id
                """)
                filterSamples << (System.currentTimeMillis() - start)
                Thread.sleep(10)
            }
            queryTests.hierarchicalFilter = [
                samples: filterSamples,
                average: filterSamples.sum() / filterSamples.size(),
                min: filterSamples.min(),
                max: filterSamples.max()
            ]
            
            // Test 4: Heavy aggregation query
            println "    Testing aggregation query..."
            def aggSamples = []
            5.times {
                def start = System.currentTimeMillis()
                sql.rows("""
                    SELECT pli.plan_name,
                           COUNT(si.step_instance_id) as total_steps,
                           COUNT(CASE WHEN si.status = 'completed' THEN 1 END) as completed_steps,
                           AVG(si.expected_duration_minutes) as avg_duration,
                           SUM(si.expected_duration_minutes) as total_duration
                    FROM umig_plan_instance pli
                    LEFT JOIN umig_sequence_instance sqi ON pli.plan_instance_id = sqi.plan_instance_id
                    LEFT JOIN umig_phase_instance phi ON sqi.sequence_instance_id = phi.sequence_instance_id
                    LEFT JOIN umig_step_instance si ON phi.phase_instance_id = si.phase_instance_id
                    GROUP BY pli.plan_instance_id, pli.plan_name
                    ORDER BY total_steps DESC
                """)
                aggSamples << (System.currentTimeMillis() - start)
                Thread.sleep(10)
            }
            queryTests.aggregation = [
                samples: aggSamples,
                average: aggSamples.sum() / aggSamples.size(),
                min: aggSamples.min(),
                max: aggSamples.max()
            ]
            
            currentResults.databaseQueries = queryTests
            
            // Report database query results
            queryTests.each { queryName, results ->
                println "      ${queryName}: ${Math.round(results.average)}ms avg (${results.min}-${results.max}ms range)"
            }
        }
    }
    
    def runLoadTest() {
        println "\n  🔄 Running Load Test (20 concurrent users, 30 seconds)..."
        
        def executor = Executors.newFixedThreadPool(20)
        def results = new ConcurrentLinkedQueue()
        def latch = new CountDownLatch(20)
        
        def startTime = System.currentTimeMillis()
        def endTime = startTime + 30000 // 30 seconds
        
        // Submit 20 concurrent user simulation tasks
        20.times { userId ->
            executor.submit {
                def userResults = [
                    userId: userId,
                    requests: 0,
                    successful: 0,
                    failed: 0,
                    totalResponseTime: 0,
                    responseTimes: []
                ]
                
                try {
                    while (System.currentTimeMillis() < endTime) {
                        def requestStart = System.currentTimeMillis()
                        
                        try {
                            def client = HttpClients.createDefault()
                            def request = new HttpGet("${BASE_URL}/rest/umig-api/v2/step-view")
                            request.setHeader("Accept", "application/json")
                            
                            def response = client.execute(request)
                            def responseTime = System.currentTimeMillis() - requestStart
                            
                            userResults.requests++
                            userResults.totalResponseTime += responseTime
                            userResults.responseTimes << responseTime
                            
                            if (response.statusLine.statusCode >= 200 && response.statusLine.statusCode < 400) {
                                userResults.successful++
                            } else {
                                userResults.failed++
                            }
                            
                            EntityUtils.consume(response.entity)
                            client.close()
                            
                        } catch (Exception e) {
                            userResults.requests++
                            userResults.failed++
                            userResults.totalResponseTime += (System.currentTimeMillis() - requestStart)
                        }
                        
                        Thread.sleep(200) // 200ms between requests per user (5 RPS per user)
                    }
                } finally {
                    results.offer(userResults)
                    latch.countDown()
                }
            }
        }
        
        // Wait for all users to complete
        executor.shutdown()
        latch.await(45, TimeUnit.SECONDS)
        
        def actualDuration = System.currentTimeMillis() - startTime
        
        // Calculate load test summary
        def allResults = results.toList()
        def totalRequests = allResults.sum { it.requests } ?: 0
        def totalSuccessful = allResults.sum { it.successful } ?: 0
        def totalFailed = allResults.sum { it.failed } ?: 0
        def allResponseTimes = allResults.collectMany { it.responseTimes }.findAll { it != null }
        
        currentResults.loadTest = [
            duration: actualDuration,
            concurrentUsers: 20,
            totalRequests: totalRequests,
            successfulRequests: totalSuccessful,
            failedRequests: totalFailed,
            requestsPerSecond: totalRequests / (actualDuration / 1000.0),
            successRate: totalRequests > 0 ? (totalSuccessful / totalRequests) * 100 : 0,
            avgResponseTime: allResponseTimes.empty ? 0 : allResponseTimes.sum() / allResponseTimes.size(),
            minResponseTime: allResponseTimes.empty ? 0 : allResponseTimes.min(),
            maxResponseTime: allResponseTimes.empty ? 0 : allResponseTimes.max(),
            p95ResponseTime: allResponseTimes.empty ? 0 : calculatePercentile(allResponseTimes, 95),
            p99ResponseTime: allResponseTimes.empty ? 0 : calculatePercentile(allResponseTimes, 99)
        ]
        
        println "    Duration: ${Math.round(actualDuration / 1000.0)}s"
        println "    Total Requests: ${totalRequests}"
        println "    Success Rate: ${Math.round(currentResults.loadTest.successRate)}%"
        println "    RPS: ${Math.round(currentResults.loadTest.requestsPerSecond)}"
        println "    Avg Response Time: ${Math.round(currentResults.loadTest.avgResponseTime)}ms"
        println "    P95 Response Time: ${Math.round(currentResults.loadTest.p95ResponseTime)}ms"
    }
    
    def calculateSummaryStatistics() {
        println "\n  📊 Calculating Summary Statistics..."
        
        def validEndpoints = currentResults.endpoints.findAll { it.avgResponseTime != null }
        
        currentResults.summary = [
            totalEndpoints: currentResults.endpoints.size(),
            testedEndpoints: validEndpoints.size(),
            avgApiResponseTime: validEndpoints.empty ? 0 : validEndpoints.sum { it.avgResponseTime } / validEndpoints.size(),
            maxApiResponseTime: validEndpoints.empty ? 0 : validEndpoints.max { it.maxResponseTime }.maxResponseTime,
            minApiResponseTime: validEndpoints.empty ? 0 : validEndpoints.min { it.minResponseTime }.minResponseTime,
            avgDbQueryTime: currentResults.databaseQueries.values().sum { it.average } / currentResults.databaseQueries.size()
        ]
        
        println "    API Endpoints: ${currentResults.summary.testedEndpoints}/${currentResults.summary.totalEndpoints}"
        println "    Avg API Response: ${Math.round(currentResults.summary.avgApiResponseTime)}ms"
        println "    Avg DB Query Time: ${Math.round(currentResults.summary.avgDbQueryTime)}ms"
    }
    
    def compareAndReport() {
        println "\n📈 Performance Comparison Analysis..."
        println "===================================="
        
        if (!baseline) {
            println "📊 No baseline available - creating new performance baseline"
            reportCurrentMetrics()
            saveCurrentAsBaseline()
            return
        }
        
        def comparison = [
            timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
            baseline: baseline,
            current: currentResults,
            analysis: [:]
        ]
        
        // API Response Time Comparison
        println "\n🌐 API Response Time Comparison:"
        def apiIssues = []
        
        if (baseline.apiEndpoints?.results && currentResults.endpoints) {
            currentResults.endpoints.each { currentEndpoint ->
                def baselineEndpoint = baseline.apiEndpoints.results.find { 
                    it.endpoint == currentEndpoint.endpoint 
                }
                
                if (baselineEndpoint && baselineEndpoint.responseTime && baselineEndpoint.responseTime > 0) {
                    def improvement = baselineEndpoint.responseTime - currentEndpoint.avgResponseTime
                    def percentChange = (improvement / baselineEndpoint.responseTime) * 100
                    
                    if (percentChange < -25) { // More than 25% slower
                        apiIssues << [
                            endpoint: currentEndpoint.endpoint,
                            degradation: Math.abs(percentChange),
                            baseline: baselineEndpoint.responseTime,
                            current: currentEndpoint.avgResponseTime
                        ]
                        println "  ❌ ${currentEndpoint.endpoint}: ${Math.round(currentEndpoint.avgResponseTime)}ms (${Math.round(Math.abs(percentChange))}% SLOWER)"
                    } else if (percentChange < -10) { // 10-25% slower
                        println "  ⚠️ ${currentEndpoint.endpoint}: ${Math.round(currentEndpoint.avgResponseTime)}ms (${Math.round(Math.abs(percentChange))}% slower)"
                    } else if (percentChange > 15) { // More than 15% faster
                        println "  ✅ ${currentEndpoint.endpoint}: ${Math.round(currentEndpoint.avgResponseTime)}ms (${Math.round(percentChange)}% FASTER)"
                    } else {
                        println "  ⚪ ${currentEndpoint.endpoint}: ${Math.round(currentEndpoint.avgResponseTime)}ms (${percentChange > 0 ? '+' : ''}${Math.round(percentChange)}%)"
                    }
                } else {
                    println "  🆕 ${currentEndpoint.endpoint}: ${Math.round(currentEndpoint.avgResponseTime)}ms (no baseline)"
                }
            }
        }
        
        // Database Query Performance Comparison
        println "\n🗄️  Database Query Performance Comparison:"
        def dbIssues = []
        
        if (baseline.performanceMetrics?.databaseQueries && currentResults.databaseQueries) {
            currentResults.databaseQueries.each { queryName, currentResult ->
                def baselineResult = baseline.performanceMetrics.databaseQueries[queryName]
                
                if (baselineResult && baselineResult instanceof Number) {
                    def improvement = baselineResult - currentResult.average
                    def percentChange = (improvement / baselineResult) * 100
                    
                    if (percentChange < -30) { // More than 30% slower
                        dbIssues << [
                            query: queryName,
                            degradation: Math.abs(percentChange),
                            baseline: baselineResult,
                            current: currentResult.average
                        ]
                        println "  ❌ ${queryName}: ${Math.round(currentResult.average)}ms (${Math.round(Math.abs(percentChange))}% SLOWER)"
                    } else if (percentChange < -15) { // 15-30% slower
                        println "  ⚠️ ${queryName}: ${Math.round(currentResult.average)}ms (${Math.round(Math.abs(percentChange))}% slower)"
                    } else if (percentChange > 20) { // More than 20% faster
                        println "  ✅ ${queryName}: ${Math.round(currentResult.average)}ms (${Math.round(percentChange)}% FASTER)"
                    } else {
                        println "  ⚪ ${queryName}: ${Math.round(currentResult.average)}ms (${percentChange > 0 ? '+' : ''}${Math.round(percentChange)}%)"
                    }
                } else {
                    println "  🆕 ${queryName}: ${Math.round(currentResult.average)}ms (no baseline)"
                }
            }
        }
        
        // Load Test Comparison
        if (baseline.performanceMetrics?.loadTest && currentResults.loadTest) {
            println "\n🔄 Load Test Comparison:"
            def baselineRPS = baseline.performanceMetrics.loadTest.requestsPerSecond
            def currentRPS = currentResults.loadTest.requestsPerSecond
            def rpsChange = baselineRPS > 0 ? ((currentRPS - baselineRPS) / baselineRPS) * 100 : 0
            
            println "  Requests/sec: ${Math.round(currentRPS)} vs ${Math.round(baselineRPS)} (${rpsChange > 0 ? '+' : ''}${Math.round(rpsChange)}%)"
            
            def baselineSuccess = baseline.performanceMetrics.loadTest.successRate
            def currentSuccess = currentResults.loadTest.successRate
            println "  Success Rate: ${Math.round(currentSuccess)}% vs ${Math.round(baselineSuccess)}%"
            
            def baselineAvgRT = baseline.performanceMetrics.loadTest.avgResponseTime
            def currentAvgRT = currentResults.loadTest.avgResponseTime
            def rtChange = baselineAvgRT > 0 ? ((currentAvgRT - baselineAvgRT) / baselineAvgRT) * 100 : 0
            println "  Avg Response Time: ${Math.round(currentAvgRT)}ms vs ${Math.round(baselineAvgRT)}ms (${rtChange > 0 ? '+' : ''}${Math.round(rtChange)}%)"
        }
        
        // Overall Assessment
        println "\n🎯 Performance Assessment Summary:"
        def totalIssues = apiIssues.size() + dbIssues.size()
        
        if (totalIssues == 0) {
            println "  ✅ No significant performance degradation detected"
            println "  ✅ Upgrade performance validation: PASSED"
        } else if (totalIssues <= 2) {
            println "  ⚠️  Minor performance issues detected (${totalIssues} issues)"
            println "  ⚠️  Upgrade performance validation: ACCEPTABLE WITH MONITORING"
        } else {
            println "  ❌ Significant performance degradation detected (${totalIssues} issues)"
            println "  ❌ Upgrade performance validation: NEEDS INVESTIGATION"
            
            if (!apiIssues.isEmpty()) {
                println "\n  API Performance Issues:"
                apiIssues.each { issue ->
                    println "    - ${issue.endpoint}: ${Math.round(issue.degradation)}% slower (${Math.round(issue.baseline)}ms → ${Math.round(issue.current)}ms)"
                }
            }
            
            if (!dbIssues.isEmpty()) {
                println "\n  Database Performance Issues:"
                dbIssues.each { issue ->
                    println "    - ${issue.query}: ${Math.round(issue.degradation)}% slower (${Math.round(issue.baseline)}ms → ${Math.round(issue.current)}ms)"
                }
            }
        }
        
        // Save comparison report
        comparison.analysis = [
            apiIssues: apiIssues,
            databaseIssues: dbIssues,
            totalIssues: totalIssues,
            overallAssessment: totalIssues == 0 ? "PASSED" : totalIssues <= 2 ? "ACCEPTABLE" : "NEEDS_INVESTIGATION"
        ]
        
        def comparisonJson = new JsonBuilder(comparison).toPrettyString()
        new File('post-upgrade-performance-comparison.json').text = comparisonJson
        
        // Generate summary report
        generatePerformanceReport(comparison)
        
        println "\n📊 Reports generated:"
        println "  - post-upgrade-performance-comparison.json (detailed)"
        println "  - performance-comparison-summary.txt (summary)"
    }
    
    def reportCurrentMetrics() {
        println "\n📊 Current Performance Metrics:"
        println "  API Response Times:"
        println "    Average: ${Math.round(currentResults.summary.avgApiResponseTime)}ms"
        println "    Range: ${Math.round(currentResults.summary.minApiResponseTime)}-${Math.round(currentResults.summary.maxApiResponseTime)}ms"
        println "  Database Query Times:"
        currentResults.databaseQueries.each { query, result ->
            println "    ${query}: ${Math.round(result.average)}ms"
        }
        println "  Load Test Results:"
        println "    RPS: ${Math.round(currentResults.loadTest.requestsPerSecond)}"
        println "    Success Rate: ${Math.round(currentResults.loadTest.successRate)}%"
        println "    Avg Response: ${Math.round(currentResults.loadTest.avgResponseTime)}ms"
    }
    
    def saveCurrentAsBaseline() {
        def newBaseline = [
            timestamp: currentResults.timestamp,
            performanceMetrics: [
                apiResponseTimes: currentResults.summary,
                databaseQueries: currentResults.databaseQueries.collectEntries { k, v -> [k, v.average] },
                loadTest: currentResults.loadTest
            ],
            apiEndpoints: [
                results: currentResults.endpoints.collect { endpoint ->
                    [
                        endpoint: endpoint.endpoint,
                        responseTime: endpoint.avgResponseTime,
                        success: true
                    ]
                }
            ]
        ]
        
        def baselineJson = new JsonBuilder(newBaseline).toPrettyString()
        new File('post-upgrade-performance-baseline.json').text = baselineJson
        
        println "  📊 New baseline saved: post-upgrade-performance-baseline.json"
    }
    
    def generatePerformanceReport(comparison) {
        def report = new StringBuilder()
        
        report << "UMIG Post-Upgrade Performance Comparison Report\n"
        report << "===============================================\n"
        report << "Generated: ${comparison.timestamp}\n"
        report << "Assessment: ${comparison.analysis.overallAssessment}\n\n"
        
        report << "EXECUTIVE SUMMARY\n"
        report << "-----------------\n"
        report << "Total Performance Issues: ${comparison.analysis.totalIssues}\n"
        report << "API Issues: ${comparison.analysis.apiIssues.size()}\n"
        report << "Database Issues: ${comparison.analysis.databaseIssues.size()}\n\n"
        
        if (comparison.analysis.apiIssues) {
            report << "API PERFORMANCE ISSUES\n"
            report << "----------------------\n"
            comparison.analysis.apiIssues.each { issue ->
                report << "- ${issue.endpoint}\n"
                report << "  Degradation: ${Math.round(issue.degradation)}%\n"
                report << "  Baseline: ${Math.round(issue.baseline)}ms\n"
                report << "  Current: ${Math.round(issue.current)}ms\n\n"
            }
        }
        
        if (comparison.analysis.databaseIssues) {
            report << "DATABASE PERFORMANCE ISSUES\n"
            report << "---------------------------\n"
            comparison.analysis.databaseIssues.each { issue ->
                report << "- ${issue.query}\n"
                report << "  Degradation: ${Math.round(issue.degradation)}%\n"
                report << "  Baseline: ${Math.round(issue.baseline)}ms\n"
                report << "  Current: ${Math.round(issue.current)}ms\n\n"
            }
        }
        
        report << "RECOMMENDATIONS\n"
        report << "---------------\n"
        if (comparison.analysis.totalIssues == 0) {
            report << "- Performance is stable or improved\n"
            report << "- Proceed with upgrade validation\n"
        } else {
            report << "- Investigate performance degradation causes\n"
            report << "- Monitor system resources during peak usage\n"
            report << "- Consider performance tuning if issues persist\n"
        }
        
        new File('performance-comparison-summary.txt').text = report.toString()
    }
    
    // Utility methods
    def withSql(closure) {
        def sql = null
        try {
            sql = Sql.newInstance(DB_URL, DB_USER, DB_PASSWORD, "org.postgresql.Driver")
            return closure(sql)
        } finally {
            sql?.close()
        }
    }
    
    def testEndpointPerformance(endpoint) {
        def startTime = System.currentTimeMillis()
        
        try {
            def client = HttpClients.createDefault()
            def request = new HttpGet("${BASE_URL}${endpoint}")
            request.setHeader("Accept", "application/json")
            
            def response = client.execute(request)
            def responseTime = System.currentTimeMillis() - startTime
            
            def success = response.statusLine.statusCode >= 200 && response.statusLine.statusCode < 400
            
            EntityUtils.consume(response.entity)
            client.close()
            
            return [
                endpoint: endpoint,
                responseTime: responseTime,
                statusCode: response.statusLine.statusCode,
                success: success
            ]
            
        } catch (Exception e) {
            return [
                endpoint: endpoint,
                responseTime: System.currentTimeMillis() - startTime,
                statusCode: -1,
                success: false,
                error: e.message
            ]
        }
    }
    
    def calculateStandardDeviation(values) {
        if (values.size() <= 1) return 0
        
        def mean = values.sum() / values.size()
        def variance = values.collect { (it - mean) ** 2 }.sum() / (values.size() - 1)
        return Math.sqrt(variance)
    }
    
    def calculatePercentile(values, percentile) {
        if (values.empty) return 0
        
        def sortedValues = values.sort()
        def index = (percentile / 100.0) * (sortedValues.size() - 1)
        
        if (index == Math.floor(index)) {
            return sortedValues[(int)index]
        } else {
            def lower = sortedValues[(int)Math.floor(index)]
            def upper = sortedValues[(int)Math.ceil(index)]
            def weight = index - Math.floor(index)
            return lower + weight * (upper - lower)
        }
    }
}