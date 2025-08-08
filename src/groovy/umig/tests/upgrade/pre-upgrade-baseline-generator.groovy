#!/usr/bin/env groovy
/**
 * Pre-Upgrade Baseline Generator for US-032
 * Creates comprehensive baseline documentation of system state before upgrade
 * 
 * Usage: groovy -cp postgres-driver.jar pre-upgrade-baseline-generator.groovy
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

class PreUpgradeBaselineGenerator {
    
    static final String DB_URL = "jdbc:postgresql://localhost:5432/umig_dev"
    static final String DB_USER = "umig_user"
    static final String DB_PASSWORD = "umig_password"
    static final String BASE_URL = "http://localhost:8090"
    
    def baseline = [
        timestamp: LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME),
        systemVersions: [:],
        databaseState: [:],
        apiEndpoints: [:],
        performanceMetrics: [:],
        configurationState: [:],
        dataIntegrity: [:]
    ]
    
    static void main(String[] args) {
        println "🔍 Creating Pre-Upgrade Baseline for US-032..."
        println "============================================="
        
        def generator = new PreUpgradeBaselineGenerator()
        
        try {
            generator.captureSystemVersions()
            generator.captureDatabaseState()
            generator.captureApiEndpointBaseline()
            generator.capturePerformanceBaseline()
            generator.captureConfigurationState()
            generator.captureDataIntegrity()
            generator.generateBaselineReport()
            
            println "✅ Baseline generation completed successfully"
            
        } catch (Exception e) {
            println "❌ Baseline generation failed: ${e.message}"
            e.printStackTrace()
            System.exit(1)
        }
    }
    
    def captureSystemVersions() {
        println "\n📋 Capturing System Versions..."
        
        baseline.systemVersions = [:]
        
        // Java version
        baseline.systemVersions.java = System.getProperty("java.version")
        println "  Java: ${baseline.systemVersions.java}"
        
        // Groovy version  
        baseline.systemVersions.groovy = GroovySystem.version
        println "  Groovy: ${baseline.systemVersions.groovy}"
        
        // PostgreSQL version
        withSql { sql ->
            def result = sql.firstRow("SELECT version() as version")
            baseline.systemVersions.postgresql = result.version
            println "  PostgreSQL: ${baseline.systemVersions.postgresql.take(50)}..."
        }
        
        // Confluence version (attempt to detect)
        try {
            def confluenceInfo = getConfluenceSystemInfo()
            baseline.systemVersions.confluence = confluenceInfo.version ?: "Unable to detect"
            baseline.systemVersions.confluenceBuildNumber = confluenceInfo.buildNumber ?: "Unknown"
            println "  Confluence: ${baseline.systemVersions.confluence}"
            
        } catch (Exception e) {
            baseline.systemVersions.confluence = "Detection failed: ${e.message}"
            println "  Confluence: ${baseline.systemVersions.confluence}"
        }
        
        // ScriptRunner version (attempt to detect)
        try {
            def scriptRunnerInfo = getScriptRunnerInfo()
            baseline.systemVersions.scriptRunner = scriptRunnerInfo.version ?: "Unable to detect"
            println "  ScriptRunner: ${baseline.systemVersions.scriptRunner}"
            
        } catch (Exception e) {
            baseline.systemVersions.scriptRunner = "Detection failed: ${e.message}"
            println "  ScriptRunner: ${baseline.systemVersions.scriptRunner}"
        }
        
        // System information
        baseline.systemVersions.operatingSystem = System.getProperty("os.name")
        baseline.systemVersions.systemArchitecture = System.getProperty("os.arch")
        baseline.systemVersions.availableProcessors = Runtime.runtime.availableProcessors()
        baseline.systemVersions.maxMemory = Runtime.runtime.maxMemory()
        
        println "  OS: ${baseline.systemVersions.operatingSystem} (${baseline.systemVersions.systemArchitecture})"
        println "  CPUs: ${baseline.systemVersions.availableProcessors}"
        println "  Max Memory: ${baseline.systemVersions.maxMemory / 1024 / 1024}MB"
    }
    
    def captureDatabaseState() {
        println "\n🗄️  Capturing Database State..."
        
        withSql { sql ->
            // Database size and statistics
            def dbStats = sql.firstRow("""
                SELECT 
                    pg_size_pretty(pg_database_size(current_database())) as database_size,
                    (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'umig_%') as umig_tables
            """)
            
            baseline.databaseState.size = dbStats.database_size
            baseline.databaseState.umigTables = dbStats.umig_tables
            
            println "  Database Size: ${baseline.databaseState.size}"
            println "  UMIG Tables: ${baseline.databaseState.umigTables}"
            
            // Critical data counts
            def dataCounts = [:]
            
            def criticalTables = [
                'umig_migration_master',
                'umig_plan_instance', 
                'umig_sequence_instance',
                'umig_phase_instance',
                'umig_step_instance',
                'umig_team_master',
                'umig_user_master',
                'umig_environment_master',
                'umig_application_master'
            ]
            
            criticalTables.each { table ->
                try {
                    def count = sql.firstRow("SELECT COUNT(*) as count FROM ${table}")
                    dataCounts[table] = count.count
                    println "    ${table}: ${count.count} records"
                } catch (Exception e) {
                    dataCounts[table] = "Error: ${e.message}"
                    println "    ${table}: Error - ${e.message}"
                }
            }
            
            baseline.databaseState.recordCounts = dataCounts
            
            // Index health
            def indexStats = sql.rows("""
                SELECT 
                    schemaname,
                    tablename,
                    indexname,
                    idx_tup_read,
                    idx_tup_fetch,
                    idx_scan
                FROM pg_stat_user_indexes 
                WHERE schemaname = 'public' 
                AND tablename LIKE 'umig_%'
                ORDER BY idx_scan DESC
                LIMIT 20
            """)
            
            baseline.databaseState.topIndexes = indexStats.collect { row ->
                [
                    table: row.tablename,
                    index: row.indexname,
                    scans: row.idx_scan,
                    tuplesRead: row.idx_tup_read,
                    tuplesFetched: row.idx_tup_fetch
                ]
            }
            
            println "  Top ${baseline.databaseState.topIndexes.size()} most used indexes captured"
        }
    }
    
    def captureApiEndpointBaseline() {
        println "\n🌐 Capturing API Endpoint Baseline..."
        
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
        
        baseline.apiEndpoints.results = []
        
        println "  Testing ${endpoints.size()} API endpoints..."
        
        endpoints.each { endpoint ->
            def result = testEndpoint(endpoint)
            baseline.apiEndpoints.results << result
            
            def status = result.success ? "✅" : "❌"
            def responseTime = result.responseTime != -1 ? "${result.responseTime}ms" : "Failed"
            println "    ${status} ${endpoint}: ${responseTime}"
        }
        
        // Calculate summary statistics
        def successful = baseline.apiEndpoints.results.findAll { it.success }
        
        baseline.apiEndpoints.summary = [
            totalEndpoints: endpoints.size(),
            successfulEndpoints: successful.size(),
            failedEndpoints: endpoints.size() - successful.size(),
            averageResponseTime: successful.empty ? 0 : successful.sum { it.responseTime } / successful.size(),
            maxResponseTime: successful.empty ? 0 : successful.max { it.responseTime }.responseTime,
            minResponseTime: successful.empty ? 0 : successful.min { it.responseTime }.responseTime
        ]
        
        println "  Summary: ${baseline.apiEndpoints.summary.successfulEndpoints}/${baseline.apiEndpoints.summary.totalEndpoints} successful"
        println "  Avg Response: ${Math.round(baseline.apiEndpoints.summary.averageResponseTime)}ms"
    }
    
    def capturePerformanceBaseline() {
        println "\n⚡ Capturing Performance Baseline..."
        
        // Database query performance
        withSql { sql ->
            def queryTests = [:]
            
            // Test 1: Simple count query
            def start = System.currentTimeMillis()
            sql.firstRow("SELECT COUNT(*) FROM umig_migration_master")
            queryTests.simpleCount = System.currentTimeMillis() - start
            
            // Test 2: Complex join query (Step View)
            start = System.currentTimeMillis()
            sql.rows("""
                SELECT si.step_instance_id, si.step_name, pli.plan_name, tm.team_name
                FROM umig_step_instance si
                LEFT JOIN umig_phase_instance phi ON si.phase_instance_id = phi.phase_instance_id
                LEFT JOIN umig_sequence_instance sqi ON phi.sequence_instance_id = sqi.sequence_instance_id
                LEFT JOIN umig_plan_instance pli ON sqi.plan_instance_id = pli.plan_instance_id
                LEFT JOIN umig_team_master tm ON si.responsible_team_id = tm.team_id
                LIMIT 100
            """)
            queryTests.complexJoin = System.currentTimeMillis() - start
            
            // Test 3: Hierarchical filtering
            start = System.currentTimeMillis()
            sql.rows("""
                SELECT COUNT(*) as step_count
                FROM umig_step_instance si
                JOIN umig_phase_instance phi ON si.phase_instance_id = phi.phase_instance_id
                JOIN umig_sequence_instance sqi ON phi.sequence_instance_id = sqi.sequence_instance_id
                JOIN umig_plan_instance pli ON sqi.plan_instance_id = pli.plan_instance_id
                WHERE pli.status IN ('active', 'pending')
            """)
            queryTests.hierarchicalFilter = System.currentTimeMillis() - start
            
            baseline.performanceMetrics.databaseQueries = queryTests
            
            println "    Simple Count: ${queryTests.simpleCount}ms"
            println "    Complex Join: ${queryTests.complexJoin}ms"  
            println "    Hierarchical Filter: ${queryTests.hierarchicalFilter}ms"
        }
        
        // API response time baseline (already captured in endpoint testing)
        baseline.performanceMetrics.apiResponseTimes = baseline.apiEndpoints.summary
        
        // System resource usage
        def runtime = Runtime.runtime
        baseline.performanceMetrics.systemResources = [
            totalMemory: runtime.totalMemory(),
            freeMemory: runtime.freeMemory(),
            usedMemory: runtime.totalMemory() - runtime.freeMemory(),
            maxMemory: runtime.maxMemory()
        ]
        
        def usedMemoryMB = baseline.performanceMetrics.systemResources.usedMemory / 1024 / 1024
        def totalMemoryMB = baseline.performanceMetrics.systemResources.totalMemory / 1024 / 1024
        println "    Memory Usage: ${Math.round(usedMemoryMB)}MB / ${Math.round(totalMemoryMB)}MB"
    }
    
    def captureConfigurationState() {
        println "\n⚙️  Capturing Configuration State..."
        
        // System properties that might affect upgrade
        def relevantProperties = [
            'java.version',
            'java.vendor',
            'java.home',
            'user.timezone',
            'file.encoding'
        ]
        
        baseline.configurationState.systemProperties = [:]
        relevantProperties.each { prop ->
            baseline.configurationState.systemProperties[prop] = System.getProperty(prop)
        }
        
        // Database configuration
        withSql { sql ->
            def dbConfig = sql.rows("""
                SELECT name, setting, unit, category, short_desc
                FROM pg_settings 
                WHERE category IN ('Connection Settings', 'Memory', 'Query Tuning')
                ORDER BY category, name
            """)
            
            baseline.configurationState.databaseSettings = dbConfig.collect { row ->
                [
                    name: row.name,
                    setting: row.setting,
                    unit: row.unit,
                    category: row.category,
                    description: row.short_desc
                ]
            }
        }
        
        println "    System Properties: ${baseline.configurationState.systemProperties.size()} captured"
        println "    Database Settings: ${baseline.configurationState.databaseSettings.size()} captured"
    }
    
    def captureDataIntegrity() {
        println "\n🔍 Capturing Data Integrity Baseline..."
        
        withSql { sql ->
            // Foreign key constraint validation
            def constraintChecks = [:]
            
            // Check critical relationships
            def relationshipQueries = [
                'plan_to_migration': '''
                    SELECT COUNT(*) as valid_count,
                           (SELECT COUNT(*) FROM umig_plan_instance WHERE migration_id IS NOT NULL) as total_count
                    FROM umig_plan_instance pli
                    JOIN umig_migration_master mm ON pli.migration_id = mm.migration_id
                ''',
                'sequence_to_plan': '''
                    SELECT COUNT(*) as valid_count,
                           (SELECT COUNT(*) FROM umig_sequence_instance WHERE plan_instance_id IS NOT NULL) as total_count
                    FROM umig_sequence_instance sqi
                    JOIN umig_plan_instance pli ON sqi.plan_instance_id = pli.plan_instance_id
                ''',
                'phase_to_sequence': '''
                    SELECT COUNT(*) as valid_count,
                           (SELECT COUNT(*) FROM umig_phase_instance WHERE sequence_instance_id IS NOT NULL) as total_count
                    FROM umig_phase_instance phi
                    JOIN umig_sequence_instance sqi ON phi.sequence_instance_id = sqi.sequence_instance_id
                ''',
                'step_to_phase': '''
                    SELECT COUNT(*) as valid_count,
                           (SELECT COUNT(*) FROM umig_step_instance WHERE phase_instance_id IS NOT NULL) as total_count
                    FROM umig_step_instance si
                    JOIN umig_phase_instance phi ON si.phase_instance_id = phi.phase_instance_id
                '''
            ]
            
            relationshipQueries.each { checkName, query ->
                try {
                    def result = sql.firstRow(query)
                    constraintChecks[checkName] = [
                        valid: result.valid_count,
                        total: result.total_count,
                        integrity: result.valid_count == result.total_count
                    ]
                    
                    def status = constraintChecks[checkName].integrity ? "✅" : "⚠️"
                    println "    ${status} ${checkName}: ${result.valid_count}/${result.total_count}"
                    
                } catch (Exception e) {
                    constraintChecks[checkName] = [error: e.message]
                    println "    ❌ ${checkName}: Error - ${e.message}"
                }
            }
            
            baseline.dataIntegrity.constraintChecks = constraintChecks
            
            // Data consistency checks
            def consistencyChecks = [:]
            
            // Check for orphaned records
            try {
                def orphanedSteps = sql.firstRow("""
                    SELECT COUNT(*) as count FROM umig_step_instance 
                    WHERE phase_instance_id IS NOT NULL 
                    AND phase_instance_id NOT IN (SELECT phase_instance_id FROM umig_phase_instance)
                """)
                
                consistencyChecks.orphanedSteps = orphanedSteps.count
                println "    Orphaned Steps: ${orphanedSteps.count}"
                
            } catch (Exception e) {
                consistencyChecks.orphanedSteps = "Error: ${e.message}"
            }
            
            baseline.dataIntegrity.consistencyChecks = consistencyChecks
        }
    }
    
    def generateBaselineReport() {
        println "\n📊 Generating Baseline Report..."
        
        // Save detailed JSON baseline
        def jsonBaseline = new JsonBuilder(baseline).toPrettyString()
        new File('pre-upgrade-baseline.json').text = jsonBaseline
        
        // Generate human-readable summary
        def summary = generateSummaryReport()
        new File('pre-upgrade-baseline-summary.txt').text = summary
        
        println "    ✅ Detailed baseline: pre-upgrade-baseline.json"
        println "    ✅ Summary report: pre-upgrade-baseline-summary.txt"
    }
    
    def generateSummaryReport() {
        def summary = new StringBuilder()
        
        summary << "UMIG Pre-Upgrade Baseline Summary\n"
        summary << "=================================\n"
        summary << "Generated: ${baseline.timestamp}\n\n"
        
        // System Versions
        summary << "System Versions:\n"
        summary << "----------------\n"
        baseline.systemVersions.each { key, value ->
            summary << "  ${key}: ${value}\n"
        }
        
        // Database State
        summary << "\nDatabase State:\n"
        summary << "---------------\n"
        summary << "  Size: ${baseline.databaseState.size}\n"
        summary << "  UMIG Tables: ${baseline.databaseState.umigTables}\n"
        summary << "  Record Counts:\n"
        baseline.databaseState.recordCounts.each { table, count ->
            summary << "    ${table}: ${count}\n"
        }
        
        // API Endpoints
        summary << "\nAPI Endpoints:\n" 
        summary << "--------------\n"
        summary << "  Total: ${baseline.apiEndpoints.summary.totalEndpoints}\n"
        summary << "  Successful: ${baseline.apiEndpoints.summary.successfulEndpoints}\n"
        summary << "  Failed: ${baseline.apiEndpoints.summary.failedEndpoints}\n"
        summary << "  Avg Response Time: ${Math.round(baseline.apiEndpoints.summary.averageResponseTime)}ms\n"
        
        // Performance Metrics
        summary << "\nPerformance Baseline:\n"
        summary << "--------------------\n"
        summary << "  Database Queries:\n"
        baseline.performanceMetrics.databaseQueries.each { query, time ->
            summary << "    ${query}: ${time}ms\n"
        }
        
        // Data Integrity
        summary << "\nData Integrity:\n"
        summary << "---------------\n"
        baseline.dataIntegrity.constraintChecks.each { check, result ->
            if (result.containsKey('integrity')) {
                def status = result.integrity ? "✅ PASS" : "⚠️ ISSUE"
                summary << "  ${check}: ${status} (${result.valid}/${result.total})\n"
            } else {
                summary << "  ${check}: ❌ ERROR\n"
            }
        }
        
        summary << "\nBaseline generation completed successfully.\n"
        summary << "Use this baseline to compare post-upgrade system state.\n"
        
        return summary.toString()
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
    
    def testEndpoint(endpoint) {
        def result = [
            endpoint: endpoint,
            timestamp: LocalDateTime.now().toString(),
            success: false,
            responseTime: -1,
            statusCode: -1,
            error: null
        ]
        
        def startTime = System.currentTimeMillis()
        
        try {
            def client = HttpClients.createDefault()
            def request = new HttpGet("${BASE_URL}${endpoint}")
            request.setHeader("Accept", "application/json")
            
            def response = client.execute(request)
            
            result.statusCode = response.statusLine.statusCode
            result.responseTime = System.currentTimeMillis() - startTime
            result.success = result.statusCode >= 200 && result.statusCode < 400
            
            EntityUtils.consume(response.entity)
            client.close()
            
        } catch (Exception e) {
            result.error = e.message
            result.responseTime = System.currentTimeMillis() - startTime
        }
        
        return result
    }
    
    def getConfluenceSystemInfo() {
        // Attempt to get Confluence system info
        // This would need to be adapted based on available Confluence REST APIs
        return [version: "Unable to detect", buildNumber: "Unknown"]
    }
    
    def getScriptRunnerInfo() {
        // Attempt to get ScriptRunner version info
        try {
            def client = HttpClients.createDefault()
            def request = new HttpGet("${BASE_URL}/rest/scriptrunner/latest/canned/com.onresolve.scriptrunner.canned.common.admin.GetScriptRunnerInfo")
            def response = client.execute(request)
            
            if (response.statusLine.statusCode == 200) {
                def content = EntityUtils.toString(response.entity)
                def json = new JsonSlurper().parseText(content)
                return [version: json.version ?: "Unknown"]
            }
            
        } catch (Exception e) {
            // Ignore - will return default
        }
        
        return [version: "Unable to detect"]
    }
}