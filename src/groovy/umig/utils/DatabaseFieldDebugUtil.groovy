package umig.utils

import groovy.sql.Sql
import java.util.UUID

/**
 * DatabaseFieldDebugUtil - Utility class for debugging database field access issues
 *
 * US-058 Phase 2B - Extracted from simple-stm-name-debug.groovy for permanent utility infrastructure
 * Provides comprehensive database field debugging capabilities for troubleshooting data access patterns
 *
 * Key Features:
 * - Table structure analysis and validation
 * - Field access pattern testing
 * - Query result debugging
 * - Defensive programming pattern validation
 * - Mock data generation for testing
 *
 * Usage:
 *   DatabaseFieldDebugUtil.analyzeTableStructure('steps_master_stm')
 *   DatabaseFieldDebugUtil.validateFieldAccess(queryResult, ['stm_name', 'sti_name'])
 *   DatabaseFieldDebugUtil.debugQueryExecution(query, params)
 *
 * @author UMIG Development Team
 * @since US-058 Phase 2B
 */
class DatabaseFieldDebugUtil {

    /**
     * Analyze database table structure and verify expected columns
     *
     * @param tableName - Name of the table to analyze
     * @param expectedColumns - List of expected column names (optional)
     * @return Map containing analysis results
     */
    static Map<String, Object> analyzeTableStructure(String tableName, List<String> expectedColumns = []) {
        println "🏗️  Analyzing table structure: ${tableName}"

        Map<String, Object> analysisResult = [
            tableName: tableName,
            columnsFound: [] as List<String>,
            expectedColumns: expectedColumns,
            missingColumns: [] as List<String>,
            extraColumns: [] as List<String>,
            hasAllExpected: false,
            analysisTimestamp: new Date()
        ]

        try {
            DatabaseUtil.withSql { sql ->
                List<Map<String, Object>> columns = sql.rows("""
                    SELECT column_name, data_type, is_nullable, column_default
                    FROM information_schema.columns
                    WHERE table_name = ?
                    ORDER BY ordinal_position
                """, [tableName] as List<Object>) as List<Map<String, Object>>

                analysisResult.columnsFound = columns.collect { Map<String, Object> col ->
                    col.column_name as String
                } as List<String>

                println "   Found ${columns.size()} columns:"
                columns.each { Map<String, Object> col ->
                    String columnName = col.column_name as String
                    def marker = expectedColumns.contains(columnName) ? '🎯' : '  '
                    println "   ${marker} ${columnName}: ${col.data_type} (nullable: ${col.is_nullable})"
                }

                if (expectedColumns) {
                    List<String> columnsFoundList = analysisResult.columnsFound as List<String>
                    analysisResult.missingColumns = expectedColumns.findAll { String expectedCol ->
                        !columnsFoundList.contains(expectedCol)
                    } as List<String>
                    analysisResult.extraColumns = columnsFoundList.findAll { String foundCol ->
                        !expectedColumns.contains(foundCol)
                    } as List<String>

                    List<String> missingColumnsList = analysisResult.missingColumns as List<String>
                    analysisResult.hasAllExpected = missingColumnsList.isEmpty()

                    println "\n   Column validation:"
                    println "   ✓ All expected present: ${analysisResult.hasAllExpected}"
                    if (missingColumnsList) {
                        println "   ❌ Missing columns: ${missingColumnsList}"
                    }
                }
            }

        } catch (Exception e) {
            println "   ❌ Table analysis failed: ${e.message}"
            analysisResult.error = e.message
        }

        return analysisResult
    }

    /**
     * Validate field access patterns on query result objects
     *
     * @param queryResult - The database query result object to test
     * @param fieldsToTest - List of field names to test access patterns
     * @return Map containing field access test results
     */
    static Map<String, Object> validateFieldAccess(Object queryResult, List<String> fieldsToTest) {
        println "🔬 Validating field access patterns"

        Map<String, Object> validationResult = [
            accessibleFields: [:] as Map<String, Object>,
            inaccessibleFields: [:] as Map<String, Object>,
            testTimestamp: new Date()
        ]

        if (!queryResult) {
            println "   ❌ Query result is null"
            validationResult.error = "Query result is null"
            return validationResult
        }

        println "   Query result type: ${queryResult.class.name}"

        // Safe type casting for Map operations
        if (queryResult instanceof Map) {
            Map<String, Object> queryMap = queryResult as Map<String, Object>
            println "   Available keys: ${queryMap.keySet()}"
        } else {
            println "   Non-map result type - attempting property access"
        }

        fieldsToTest.each { String fieldName ->
            println "\n   Testing field access: '${fieldName}'"

            Map<String, Closure> accessTests = [
                'Direct property': { ->
                    if (queryResult instanceof Map) {
                        return (queryResult as Map<String, Object>)[fieldName]
                    } else {
                        try {
                            // Use reflection for safe property access on Object type
                            return queryResult.getClass().getMethod("get", Object.class).invoke(queryResult, fieldName)
                        } catch (Exception ignored) {
                            return null
                        }
                    }
                },
                'Bracket notation': { ->
                    if (queryResult instanceof Map) {
                        return (queryResult as Map<String, Object>)[fieldName]
                    } else {
                        return null
                    }
                },
                'getProperty method': { ->
                    if (queryResult instanceof Map) {
                        return (queryResult as Map<String, Object>).get(fieldName)
                    } else {
                        try {
                            // Use reflection for safe property access on Object type
                            return queryResult.getClass().getMethod("get", Object.class).invoke(queryResult, fieldName)
                        } catch (Exception ignored) {
                            return null
                        }
                    }
                },
                'containsKey check': { ->
                    if (queryResult instanceof Map) {
                        return (queryResult as Map<String, Object>).containsKey(fieldName)
                    } else {
                        return queryResult.hasProperty(fieldName)
                    }
                },
                'Safe navigation': { ->
                    if (queryResult instanceof Map) {
                        return (queryResult as Map<String, Object>)[fieldName]
                    } else {
                        try {
                            // Use reflection for safe property access on Object type
                            return queryResult.getClass().getMethod("get", Object.class).invoke(queryResult, fieldName)
                        } catch (Exception ignored) {
                            return null
                        }
                    }
                }
            ]

            Map<String, Object> fieldResults = [:]
            accessTests.each { String testName, Closure testClosure ->
                try {
                    Object result = testClosure()
                    fieldResults[testName] = [success: true, value: result] as Map<String, Object>
                    println "     ✅ ${testName}: ${result}"
                } catch (Exception ex) {
                    fieldResults[testName] = [success: false, error: ex.message] as Map<String, Object>
                    println "     ❌ ${testName}: ERROR - ${ex.message}"
                }
            }

            boolean isAccessible = fieldResults.values().any { Object resultObj ->
                if (resultObj instanceof Map) {
                    Map<String, Object> resultMap = resultObj as Map<String, Object>
                    return resultMap.success as Boolean
                }
                return false
            }
            if (isAccessible) {
                validationResult.accessibleFields[fieldName] = fieldResults
            } else {
                validationResult.inaccessibleFields[fieldName] = fieldResults
            }
        }

        return validationResult
    }

    /**
     * Debug query execution with comprehensive result analysis
     *
     * @param query - SQL query to execute
     * @param params - Query parameters (optional)
     * @param fieldsToAnalyze - Specific fields to analyze in detail
     * @return Map containing query execution debug results
     */
    static Map<String, Object> debugQueryExecution(String query, List<Object> params = [], List<String> fieldsToAnalyze = []) {
        println "🧪 Debugging query execution"

        Map<String, Object> debugResult = [
            query: query,
            params: params,
            executionTimestamp: new Date(),
            resultAnalysis: [:] as Map<String, Object>
        ]

        try {
            DatabaseUtil.withSql { sql ->
                println "   Executing query with parameters: ${params}"

                Object queryResult = params ? sql.firstRow(query, params) : sql.firstRow(query)

                if (queryResult) {
                    println "   ✅ Query execution successful"
                    println "   Result type: ${queryResult.class.name}"

                    if (queryResult instanceof Map) {
                        Map<String, Object> queryMap = queryResult as Map<String, Object>
                        println "   Available columns (${queryMap.keySet().size()}):"

                        // Log all available columns
                        queryMap.keySet().each { Object columnNameObj ->
                            String columnName = columnNameObj as String
                            Object value = queryMap[columnName]
                            String marker = fieldsToAnalyze.contains(columnName) ? '🎯' : '  '
                            println "   ${marker} ${columnName}: ${value} (${value?.class?.name ?: 'null'})"
                        }

                        debugResult.resultAnalysis = [
                            columnCount: queryMap.keySet().size(),
                            columns: queryMap.keySet() as List<String>,
                            hasData: true
                        ] as Map<String, Object>
                    } else {
                        println "   Non-map result type"
                        debugResult.resultAnalysis = [
                            hasData: true,
                            resultType: queryResult.class.name
                        ] as Map<String, Object>
                    }

                    // Analyze specific fields if requested
                    if (fieldsToAnalyze) {
                        println "\n   Detailed field analysis:"
                        Map<String, Object> fieldValidation = validateFieldAccess(queryResult, fieldsToAnalyze)
                        debugResult.fieldValidation = fieldValidation
                    }

                } else {
                    println "   ❌ Query returned no results"
                    debugResult.resultAnalysis = [hasData: false] as Map<String, Object>
                }
            }

        } catch (Exception e) {
            println "   ❌ Query execution failed: ${e.message}"
            debugResult.error = e.message
            e.printStackTrace()
        }

        return debugResult
    }

    /**
     * Test defensive programming patterns for field mapping
     *
     * @param sourceData - Source data object (e.g., query result)
     * @param fieldMappings - Map of target field to source field mappings
     * @param fallbackValues - Map of fallback values for each target field
     * @return Map containing the safely mapped data
     */
    static Map<String, Object> testDefensiveFieldMapping(Object sourceData, Map<String, String> fieldMappings, Map<String, String> fallbackValues = [:]) {
        println "🛡️  Testing defensive field mapping patterns"

        Map<String, Object> mappedData = [:]
        Map<String, Object> mappingResults = [:]

        fieldMappings.each { String targetField, String sourceField ->
            try {
                Object sourceValue = null
                if (sourceData instanceof Map) {
                    sourceValue = (sourceData as Map<String, Object>)[sourceField]
                } else if (sourceData) {
                    try {
                        // Use reflection for safe property access on Object type
                        sourceValue = sourceData.getClass().getMethod("get", Object.class).invoke(sourceData, sourceField)
                    } catch (Exception ignored) {
                        sourceValue = null
                    }
                }

                String fallbackValue = fallbackValues[targetField] ?: 'Unknown'

                // Apply defensive programming pattern
                String safeValue = (sourceValue ?: fallbackValue) as String

                mappedData[targetField] = safeValue
                mappingResults[targetField] = [
                    sourceField: sourceField,
                    sourceValue: sourceValue,
                    fallbackValue: fallbackValue,
                    finalValue: safeValue,
                    usedFallback: !sourceValue
                ] as Map<String, Object>

                Map<String, Object> fieldResult = mappingResults[targetField] as Map<String, Object>
                Boolean usedFallback = fieldResult.usedFallback as Boolean
                String marker = usedFallback ? '⚠️ ' : '✅'
                println "   ${marker} ${targetField} (from ${sourceField}): '${safeValue}'"

            } catch (Exception e) {
                mappingResults[targetField] = [
                    sourceField: sourceField,
                    error: e.message
                ] as Map<String, Object>
                println "   ❌ ${targetField} mapping failed: ${e.message}"
            }
        }

        return [
            mappedData: mappedData,
            mappingResults: mappingResults,
            mappingTimestamp: new Date()
        ] as Map<String, Object>
    }

    /**
     * Generate comprehensive database diagnostic report
     *
     * @param tables - List of table names to analyze
     * @param sampleQueries - Map of query name to query SQL for testing
     * @return Comprehensive diagnostic report
     */
    static Map<String, Object> generateDatabaseDiagnosticReport(List<String> tables = [], Map<String, String> sampleQueries = [:]) {
        println "📋 Generating comprehensive database diagnostic report"
        println "=" * 80

        Map<String, Object> report = [
            reportTimestamp: new Date(),
            databaseInfo: [:] as Map<String, Object>,
            tableAnalysis: [:] as Map<String, Object>,
            queryTests: [:] as Map<String, Object>,
            summary: [:] as Map<String, Object>
        ]

        try {
            // Basic database information
            DatabaseUtil.withSql { sql ->
                Object dbInfoResult = sql.firstRow("SELECT current_database(), current_user, version(), now()")
                if (dbInfoResult instanceof List) {
                    List<Object> dbInfo = dbInfoResult as List<Object>
                    report.databaseInfo = [
                        database: dbInfo[0],
                        user: dbInfo[1],
                        version: dbInfo[2],
                        timestamp: dbInfo[3]
                    ] as Map<String, Object>

                    println "📊 Database Info: ${dbInfo[0]} as ${dbInfo[1]}"
                } else if (dbInfoResult instanceof Map) {
                    Map<String, Object> dbInfoMap = dbInfoResult as Map<String, Object>
                    report.databaseInfo = dbInfoMap
                    println "📊 Database Info: ${dbInfoMap}"
                }
            }

            // Analyze specified tables
            if (tables) {
                println "\n🏗️  Table Analysis:"
                tables.each { String tableName ->
                    report.tableAnalysis[tableName] = analyzeTableStructure(tableName)
                }
            }

            // Test sample queries
            if (sampleQueries) {
                println "\n🧪 Query Testing:"
                sampleQueries.each { String queryName, String query ->
                    println "\n   Testing query: ${queryName}"
                    report.queryTests[queryName] = debugQueryExecution(query)
                }
            }

            // Generate summary
            Map<String, Object> tableAnalysisMap = report.tableAnalysis as Map<String, Object>
            Map<String, Object> queryTestsMap = report.queryTests as Map<String, Object>

            int tableCount = tableAnalysisMap.size()
            int queryCount = queryTestsMap.size()
            Integer successfulQueriesCount = queryTestsMap.values().count { Object testResult ->
                if (testResult instanceof Map) {
                    Map<String, Object> testMap = testResult as Map<String, Object>
                    return !testMap.containsKey('error')
                }
                return false
            } as Integer
            int successfulQueries = successfulQueriesCount

            report.summary = [
                tablesAnalyzed: tableCount,
                queriesTested: queryCount,
                successfulQueries: successfulQueries,
                overallHealth: successfulQueries == queryCount ? 'HEALTHY' : 'ISSUES_DETECTED'
            ] as Map<String, Object>

            Map<String, Object> summaryMap = report.summary as Map<String, Object>
            println "\n📋 Diagnostic Summary:"
            println "   Tables analyzed: ${tableCount}"
            println "   Queries tested: ${queryCount}"
            println "   Successful queries: ${successfulQueries}/${queryCount}"
            println "   Overall health: ${summaryMap.overallHealth}"

        } catch (Exception e) {
            println "❌ Diagnostic report generation failed: ${e.message}"
            report.error = e.message
        }

        return report
    }

    /**
     * Quick validation utility for the stm_name field access issue specifically
     *
     * @param stepInstanceId - UUID of step instance to test
     * @return Validation results for the stm_name field access pattern
     */
    static Map<String, Object> validateStmNameFieldAccess(UUID stepInstanceId = null) {
        println "🎯 Quick stm_name field access validation"

        if (!stepInstanceId) {
            // Find a sample step instance
            stepInstanceId = DatabaseUtil.withSql { sql ->
                Object result = sql.firstRow("""
                    SELECT sti.sti_id
                    FROM steps_instance_sti sti
                    INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                    WHERE stm.stm_name IS NOT NULL
                    LIMIT 1
                """)

                if (result instanceof Map) {
                    Map<String, Object> resultMap = result as Map<String, Object>
                    return resultMap.sti_id as UUID
                } else if (result instanceof List) {
                    List<Object> resultList = result as List<Object>
                    return resultList[0] as UUID
                }
                return null
            } as UUID

            if (!stepInstanceId) {
                return [error: "No sample step instance found for testing"] as Map<String, Object>
            }
        }

        String query = '''
            SELECT
                sti.sti_id as step_instance_id,
                sti.sti_name as step_instance_name,
                sti.sti_status as step_instance_status,
                stm.stm_id as step_master_id,
                stm.stm_name as step_master_name,
                stm.stm_description as step_master_description
            FROM steps_instance_sti sti
            INNER JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
            WHERE sti.sti_id = ?
        '''

        Map<String, Object> debugResult = debugQueryExecution(query, [stepInstanceId] as List<Object>, ['step_master_name', 'stm_name'] as List<String>)

        // Test the specific field mapping that was problematic
        Map<String, Object> resultAnalysis = debugResult.resultAnalysis as Map<String, Object>
        Boolean hasData = resultAnalysis.hasData as Boolean
        if (hasData) {
            DatabaseUtil.withSql { sql ->
                Object queryResult = sql.firstRow(query, [stepInstanceId] as List<Object>)

                Map<String, Object> mappingTest = testDefensiveFieldMapping(
                    queryResult,
                    [
                        'stm_name': 'step_master_name',  // This was the critical mapping
                        'sti_id': 'step_instance_id',
                        'sti_name': 'step_instance_name'
                    ] as Map<String, String>,
                    [
                        'stm_name': 'Unknown Step',
                        'sti_id': 'unknown-id',
                        'sti_name': 'Unknown Step Instance'
                    ] as Map<String, String>
                )

                debugResult.mappingTest = mappingTest
            }
        }

        return debugResult
    }
}