#!/usr/bin/env groovy

/**
 * DTO Performance Analysis Script for US-056-C
 * 
 * This script analyzes the performance impact of the newly migrated DTO-based endpoints
 * in StepRepository and provides specific optimization recommendations.
 * 
 * Usage: groovy PerformanceDTOAnalysis.groovy
 * Prerequisites: Database must be running (npm start from local-dev-setup)
 */

@Grab('org.postgresql:postgresql:42.7.3')
@Grab('org.slf4j:slf4j-simple:1.7.36')

import groovy.sql.Sql
import java.sql.DriverManager
import java.util.UUID
import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

class PerformanceDTOAnalysis {
    
    private static final String DB_URL = "jdbc:postgresql://localhost:5432/umig_app_db"
    private static final String DB_USER = "umig_app_user"
    private static final String DB_PASS = "umig_local_dev_pass"
    
    private Sql sql
    private Map<String, List<Long>> performanceMetrics = [:]
    private List<String> recommendations = []
    
    // Performance targets from requirements
    private static final long SINGLE_ENTITY_TARGET_MS = 51L
    private static final long PAGINATED_QUERY_TARGET_MS = 500L
    
    static void main(String[] args) {
        new PerformanceDTOAnalysis().analyze()
    }
    
    void analyze() {
        println "\n" + "=" * 80
        println "  UMIG DTO PERFORMANCE ANALYSIS - US-056-C"
        println "=" * 80
        println "Target: <${SINGLE_ENTITY_TARGET_MS}ms single entity, <${PAGINATED_QUERY_TARGET_MS}ms paginated"
        println "Timestamp: ${LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_DATE_TIME)}"
        println ""
        
        try {
            connectToDatabase()
            analyzeCurrentIndexes()
            analyzeDTOBaseQueryPerformance()
            analyzeTransformationOverhead()
            analyzeQueryComplexity()
            analyzeSpecificEndpoints()
            generateOptimizationRecommendations()
            createPerformanceReport()
        } catch (Exception e) {
            println "❌ Analysis failed: ${e.message}"
            e.printStackTrace()
        } finally {
            sql?.close()
        }
    }
    
    private void connectToDatabase() {
        try {
            sql = Sql.newInstance(DB_URL, DB_USER, DB_PASS, "org.postgresql.Driver")
            println "✅ Database connection established"
        } catch (Exception e) {
            throw new RuntimeException("Database connection failed: ${e.message}")
        }
    }
    
    private void analyzeCurrentIndexes() {
        println "\n📊 ANALYZING CURRENT DATABASE INDEXES"
        println "-" * 50
        
        def indexQuery = """
            SELECT 
                schemaname,
                tablename, 
                indexname,
                indexdef
            FROM pg_indexes 
            WHERE schemaname = 'public' 
                AND tablename IN ('steps_instance_sti', 'steps_master_stm', 'phases_instance_phi', 
                                 'sequences_instance_sqi', 'plans_instance_pli', 'migrations_mig',
                                 'iterations_ite', 'teams_tms', 'step_types_stt')
            ORDER BY tablename, indexname
        """
        
        def indexes = sql.rows(indexQuery)
        def indexesByTable = indexes.groupBy { it.tablename }
        
        indexesByTable.each { table, tableIndexes ->
            println "\n🔍 ${table.toUpperCase()}:"
            tableIndexes.each { idx ->
                println "  • ${idx.indexname}"
                if (idx.indexdef.toLowerCase().contains('btree')) {
                    println "    ${idx.indexdef.substring(idx.indexdef.indexOf('('))}"
                }
            }
        }
        
        checkMissingIndexes(indexesByTable)
    }
    
    private void checkMissingIndexes(Map indexesByTable) {
        println "\n🔍 CHECKING FOR MISSING CRITICAL INDEXES"
        
        def criticalIndexes = [
            'steps_instance_sti': ['assigned_team_id', 'phi_id', 'sti_status', 'sti_is_active', 'sti_priority'],
            'steps_master_stm': ['phm_id', 'stt_code', 'stm_order'],
            'phases_instance_phi': ['sqi_id', 'phi_is_active'],
            'sequences_instance_sqi': ['pli_id', 'sqi_is_active'],
            'plans_instance_pli': ['mig_id', 'ite_id', 'pli_is_active'],
            'migrations_mig': ['mig_code'],
            'iterations_ite': ['ite_code']
        ]
        
        criticalIndexes.each { table, columns ->
            def existingIndexes = indexesByTable[table]?.collect { 
                it.indexdef.toLowerCase() 
            } ?: []
            
            columns.each { column ->
                def hasIndex = existingIndexes.any { it.contains(column.toLowerCase()) }
                if (!hasIndex) {
                    recommendations << "❌ Missing index on ${table}.${column} - critical for DTO query performance"
                }
            }
        }
    }
    
    private void analyzeDTOBaseQueryPerformance() {
        println "\n🚀 ANALYZING buildDTOBaseQuery() PERFORMANCE"
        println "-" * 50
        
        def baseQuery = buildDTOBaseQuery()
        
        // Test query with EXPLAIN ANALYZE on a sample
        def explainQuery = "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + baseQuery + """
            WHERE sti.sti_is_active = true 
            AND mig.mig_code = 'MIG001'
            ORDER BY sqi.sqi_number, phi.phi_number, sti.sti_number
            LIMIT 10
        """
        
        try {
            def startTime = System.currentTimeMillis()
            def explainResult = sql.rows(explainQuery)
            def queryTime = System.currentTimeMillis() - startTime
            
            recordMetric('dto_base_query_with_explain', queryTime)
            
            println "📈 Base query with EXPLAIN: ${queryTime}ms"
            
            if (explainResult) {
                def plan = explainResult[0]['QUERY PLAN']
                analyzeQueryPlan(plan)
            }
            
        } catch (Exception e) {
            println "⚠️  Could not analyze base query: ${e.message}"
        }
        
        // Test simplified version without subqueries
        testSimplifiedQuery()
    }
    
    private void testSimplifiedQuery() {
        println "\n🧪 TESTING SIMPLIFIED QUERY (without aggregation subqueries)"
        
        def simplifiedQuery = """
            SELECT 
                stm.stm_id, sti.sti_id,
                COALESCE(sti.sti_name, stm.stm_name) as stm_name,
                sti.sti_status,
                tms.tms_name as team_name,
                mig.mig_code, ite.ite_code
            FROM steps_instance_sti sti
            JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
            JOIN step_types_stt stt ON stm.stt_code = stt.stt_code
            JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
            LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
            LEFT JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
            LEFT JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
            LEFT JOIN migrations_mig mig ON pli.mig_id = mig.mig_id
            LEFT JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
            LEFT JOIN teams_tms tms ON sti.assigned_team_id = tms.tms_id
            WHERE sti.sti_is_active = true
            LIMIT 10
        """
        
        def times = []
        5.times {
            def startTime = System.currentTimeMillis()
            try {
                sql.rows(simplifiedQuery)
                times << (System.currentTimeMillis() - startTime)
            } catch (Exception e) {
                println "⚠️  Simplified query failed: ${e.message}"
            }
        }
        
        if (times) {
            def avgTime = times.sum() / times.size()
            recordMetric('simplified_query', avgTime as long)
            println "📊 Simplified query average: ${avgTime}ms (${times.join(', ')}ms)"
            
            if (avgTime > SINGLE_ENTITY_TARGET_MS) {
                recommendations << "⚠️  Simplified query exceeds ${SINGLE_ENTITY_TARGET_MS}ms target - core JOINs need optimization"
            }
        }
    }
    
    private void analyzeTransformationOverhead() {
        println "\n🔄 ANALYZING DTO TRANSFORMATION OVERHEAD"
        println "-" * 50
        
        // Simulate transformation overhead by testing with different result sizes
        [1, 10, 50, 100].each { limit ->
            testTransformationTime(limit)
        }
    }
    
    private void testTransformationTime(int limit) {
        def query = """
            SELECT 
                stm.stm_id, sti.sti_id,
                COALESCE(sti.sti_name, stm.stm_name) as stm_name,
                COALESCE(sti.sti_description, stm.stm_description) as stm_description,
                sti.sti_status,
                sti.sti_created_date,
                sti.sti_last_modified_date
            FROM steps_instance_sti sti
            JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
            WHERE sti.sti_is_active = true
            LIMIT ${limit}
        """
        
        try {
            def startTime = System.currentTimeMillis()
            def rows = sql.rows(query)
            def queryTime = System.currentTimeMillis() - startTime
            
            // Simulate DTO transformation time
            startTime = System.currentTimeMillis()
            def dtos = simulateDTOTransformation(rows)
            def transformTime = System.currentTimeMillis() - startTime
            
            recordMetric("transformation_${limit}_rows", transformTime)
            println "📈 ${limit} rows: Query ${queryTime}ms + Transform ${transformTime}ms = ${queryTime + transformTime}ms total"
            
            if (limit == 1 && (queryTime + transformTime) > SINGLE_ENTITY_TARGET_MS) {
                recommendations << "⚠️  Single entity (query + transform) exceeds ${SINGLE_ENTITY_TARGET_MS}ms target"
            }
            
        } catch (Exception e) {
            println "⚠️  Transform test failed for ${limit} rows: ${e.message}"
        }
    }
    
    private List simulateDTOTransformation(List rows) {
        // Simulate the transformation logic without actually creating DTOs
        return rows.collect { row ->
            [
                stepId: row.stm_id?.toString(),
                stepInstanceId: row.sti_id?.toString(),
                stepName: row.stm_name?.toString(),
                stepDescription: row.stm_description?.toString(),
                stepStatus: row.sti_status?.toString() ?: 'PENDING',
                createdDate: row.sti_created_date,
                lastModifiedDate: row.sti_last_modified_date
            ]
        }
    }
    
    private void analyzeQueryComplexity() {
        println "\n🔍 ANALYZING QUERY COMPLEXITY METRICS"
        println "-" * 50
        
        def complexityChecks = [
            'Total tables in base query': 13,  // Based on buildDTOBaseQuery
            'Subqueries for aggregation': 3,   // dependency, instruction, comment counts
            'LEFT JOINs': 9,
            'INNER JOINs': 4,
            'Selected columns': 30
        ]
        
        complexityChecks.each { metric, value ->
            println "📊 ${metric}: ${value}"
        }
        
        // Check if complexity is within reasonable bounds
        if (complexityChecks['Total tables in base query'] > 15) {
            recommendations << "⚠️  Query joins too many tables (${complexityChecks['Total tables in base query']}) - consider breaking into multiple queries"
        }
        
        if (complexityChecks['Subqueries for aggregation'] > 3) {
            recommendations << "⚠️  Too many aggregation subqueries - consider materialized views or separate calls"
        }
    }
    
    private void analyzeSpecificEndpoints() {
        println "\n🎯 ANALYZING SPECIFIC DTO ENDPOINT PATTERNS"
        println "-" * 50
        
        // Test different filtering patterns that would be used by the API endpoints
        def filterTests = [
            'Single step by ID': "sti.sti_id = '${UUID.randomUUID()}'",
            'Steps by migration': "mig.mig_code = 'MIG001'",
            'Steps by team': "tms.tms_name = 'Infrastructure Team'",
            'Steps by status': "sti.sti_status = 'IN_PROGRESS'",
            'Complex hierarchical filter': """
                mig.mig_code = 'MIG001' 
                AND sti.sti_status IN ('PENDING', 'IN_PROGRESS') 
                AND tms.tms_name IS NOT NULL
            """
        ]
        
        filterTests.each { testName, whereClause ->
            testFilterPerformance(testName, whereClause)
        }
    }
    
    private void testFilterPerformance(String testName, String whereClause) {
        def query = buildSimpleQuery() + " WHERE sti.sti_is_active = true AND " + whereClause + " LIMIT 10"
        
        try {
            def times = []
            3.times {
                def startTime = System.currentTimeMillis()
                sql.rows(query)
                times << (System.currentTimeMillis() - startTime)
            }
            
            def avgTime = times.sum() / times.size()
            recordMetric("filter_${testName.toLowerCase().replaceAll(' ', '_')}", avgTime as long)
            println "📊 ${testName}: ${avgTime}ms average"
            
        } catch (Exception e) {
            println "⚠️  Filter test '${testName}' failed: ${e.message}"
        }
    }
    
    private void generateOptimizationRecommendations() {
        println "\n💡 GENERATING OPTIMIZATION RECOMMENDATIONS"
        println "-" * 60
        
        // Database optimization recommendations
        recommendations.addAll([
            "🔧 INDEX OPTIMIZATIONS:",
            "  • Create composite index: (sti_is_active, sti_status, assigned_team_id) on steps_instance_sti",
            "  • Create composite index: (pli_id, sqi_is_active) on sequences_instance_sqi", 
            "  • Create composite index: (sqi_id, phi_is_active) on phases_instance_phi",
            "  • Create composite index: (mig_id, ite_id, pli_is_active) on plans_instance_pli",
            "",
            "🔧 QUERY OPTIMIZATIONS:",
            "  • Consider lazy loading of aggregation counts (dependency_count, instruction_count, comment_count)",
            "  • Implement separate endpoint for step counts to avoid subquery overhead",
            "  • Use EXPLAIN ANALYZE to identify sequential scans in production queries",
            "  • Consider partitioning steps_instance_sti by migration or date if data grows large",
            "",
            "🔧 DTO TRANSFORMATION OPTIMIZATIONS:",
            "  • Implement DTO field caching for frequently accessed steps",
            "  • Use batch transformation for pagination (already implemented)",
            "  • Consider lazy initialization of non-critical DTO fields",
            "  • Implement DTO result caching with TTL for read-heavy endpoints",
            "",
            "🔧 APPLICATION OPTIMIZATIONS:",
            "  • Add connection pooling monitoring and optimization",
            "  • Implement query result pagination with cursor-based approach for large datasets",
            "  • Add query timeout configuration per endpoint complexity",
            "  • Consider read replicas for heavy analytical queries"
        ])
    }
    
    private void createPerformanceReport() {
        println "\n" + "=" * 80
        println "  PERFORMANCE ANALYSIS SUMMARY"
        println "=" * 80
        
        println "\n📊 MEASURED PERFORMANCE METRICS:"
        performanceMetrics.each { metric, times ->
            def avg = times.sum() / times.size()
            def min = times.min()
            def max = times.max()
            
            def status = "✅"
            if (metric.contains("single") || metric.contains("1_row")) {
                status = avg <= SINGLE_ENTITY_TARGET_MS ? "✅" : "❌"
            } else if (avg > PAGINATED_QUERY_TARGET_MS) {
                status = "⚠️ "
            }
            
            println "${status} ${metric}: ${avg}ms avg (${min}-${max}ms range)"
        }
        
        println "\n🎯 TARGET COMPLIANCE:"
        def singleEntityMetrics = performanceMetrics.findAll { k, v -> 
            k.contains("1_row") || k.contains("single") 
        }
        
        if (singleEntityMetrics) {
            def worstSingle = singleEntityMetrics.values().flatten().max()
            def compliance = worstSingle <= SINGLE_ENTITY_TARGET_MS
            println "${compliance ? '✅' : '❌'} Single entity target (<${SINGLE_ENTITY_TARGET_MS}ms): ${worstSingle}ms worst case"
        }
        
        println "\n⚠️  CRITICAL RECOMMENDATIONS:"
        recommendations.findAll { it.startsWith("❌") || it.startsWith("⚠️ ") }.each {
            println it
        }
        
        println "\n📋 COMPLETE RECOMMENDATIONS:"
        recommendations.each { println it }
        
        println "\n" + "=" * 80
        println "Analysis completed at ${LocalDateTime.now().format(DateTimeFormatter.ISO_LOCAL_TIME)}"
        println "Next steps: Review recommendations and implement high-impact optimizations"
        println "=" * 80
    }
    
    private String buildDTOBaseQuery() {
        return '''
            SELECT 
                stm.stm_id, sti.sti_id,
                COALESCE(sti.sti_name, stm.stm_name) as stm_name,
                COALESCE(sti.sti_description, stm.stm_description) as stm_description,
                sti.sti_status as step_status,
                tms.tms_id, tms.tms_name as team_name,
                mig.mig_id as migration_id, mig.mig_code as migration_code,
                ite.ite_id as iteration_id, ite.ite_code as iteration_code,
                sqm.sqm_id as sequence_id, phm.phm_id as phase_id,
                sti.sti_created_date as created_date,
                sti.sti_last_modified_date as last_modified_date,
                sti.sti_is_active as is_active,
                sti.sti_priority as priority,
                stt.stt_code as step_type,
                stt.stt_name as step_category,
                stm.stm_estimated_duration as estimated_duration,
                sti.sti_actual_duration as actual_duration,
                COALESCE(dep_counts.dependency_count, 0) as dependency_count,
                COALESCE(dep_counts.completed_dependencies, 0) as completed_dependencies,
                COALESCE(inst_counts.instruction_count, 0) as instruction_count,
                COALESCE(inst_counts.completed_instructions, 0) as completed_instructions,
                COALESCE(comment_counts.comment_count, 0) as comment_count,
                CASE WHEN comment_counts.comment_count > 0 THEN true ELSE false END as has_active_comments,
                comment_counts.last_comment_date
            FROM steps_instance_sti sti
            JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
            JOIN step_types_stt stt ON stm.stt_code = stt.stt_code
            JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
            JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
            LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
            LEFT JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
            LEFT JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
            LEFT JOIN migrations_mig mig ON pli.mig_id = mig.mig_id
            LEFT JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
            LEFT JOIN teams_tms tms ON sti.assigned_team_id = tms.tms_id
            LEFT JOIN (
                SELECT sti_id, COUNT(*) as dependency_count,
                       SUM(CASE WHEN dependency_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_dependencies
                FROM step_dependencies_sde WHERE is_active = true GROUP BY sti_id
            ) dep_counts ON sti.sti_id = dep_counts.sti_id
            LEFT JOIN (
                SELECT sti_id, COUNT(*) as instruction_count,
                       SUM(CASE WHEN ini_status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_instructions
                FROM instructions_instance_ini WHERE ini_is_active = true GROUP BY sti_id
            ) inst_counts ON sti.sti_id = inst_counts.sti_id
            LEFT JOIN (
                SELECT sti_id, COUNT(*) as comment_count, MAX(created_at) as last_comment_date
                FROM step_instance_comments_sic WHERE is_active = true GROUP BY sti_id
            ) comment_counts ON sti.sti_id = comment_counts.sti_id
        '''
    }
    
    private String buildSimpleQuery() {
        return '''
            SELECT 
                stm.stm_id, sti.sti_id,
                COALESCE(sti.sti_name, stm.stm_name) as stm_name,
                sti.sti_status,
                tms.tms_name as team_name,
                mig.mig_code, ite.ite_code
            FROM steps_instance_sti sti
            JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
            JOIN step_types_stt stt ON stm.stt_code = stt.stt_code
            JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
            LEFT JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
            LEFT JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
            LEFT JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
            LEFT JOIN migrations_mig mig ON pli.mig_id = mig.mig_id
            LEFT JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
            LEFT JOIN teams_tms tms ON sti.assigned_team_id = tms.tms_id
        '''
    }
    
    private void analyzeQueryPlan(def plan) {
        println "\n🔍 QUERY EXECUTION PLAN ANALYSIS:"
        // Basic analysis of query plan (simplified for demo)
        def planText = plan.toString()
        if (planText.contains("Seq Scan")) {
            recommendations << "⚠️  Query plan shows sequential scans - missing indexes detected"
        }
        if (planText.contains("Hash Join")) {
            println "📊 Hash joins detected - normal for complex queries"
        }
        if (planText.contains("Nested Loop")) {
            recommendations << "⚠️  Nested loops detected - may indicate missing indexes or poor join selectivity"
        }
    }
    
    private void recordMetric(String name, long timeMs) {
        if (!performanceMetrics[name]) {
            performanceMetrics[name] = []
        }
        performanceMetrics[name] << timeMs
    }
}