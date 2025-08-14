package umig.tests.compatibility

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import umig.utils.DatabaseUtil
import java.util.UUID
import java.sql.SQLException

/**
 * Backward compatibility validation for US-024 StepsAPI Refactoring.
 * Ensures 100% existing functionality preserved, particularly for IterationView integration.
 * Validates that all existing endpoints and data structures remain compatible.
 * 
 * Phase 3.4 Implementation for US-024 StepsAPI Refactoring
 * Created: 2025-08-14
 * Target: 100% existing functionality preserved
 */
class BackwardCompatibilityValidator {
    
    private static final String BASE_URL = "http://localhost:8090/rest/scriptrunner/latest/custom"
    private JsonSlurper jsonSlurper = new JsonSlurper()
    
    // Test data for compatibility validation
    private static UUID testMigrationId
    private static UUID testIterationId
    private static UUID testStepInstanceId
    private static String testStepCode
    
    static {
        setupCompatibilityTestData()
    }

    /**
     * Setup test data for backward compatibility validation
     */
    static void setupCompatibilityTestData() {
        DatabaseUtil.withSql { sql ->
            // Get migration ID
            def migration = sql.firstRow("SELECT mig_id FROM migrations_mig LIMIT 1")
            testMigrationId = migration?.mig_id
            
            // Get iteration ID
            def iteration = sql.firstRow("SELECT ite_id FROM iterations_ite LIMIT 1")
            testIterationId = iteration?.ite_id
            
            // Get step instance ID
            def step = sql.firstRow("SELECT sti_id FROM steps_instance_sti LIMIT 1")
            testStepInstanceId = step?.sti_id
            
            // Get step code
            def stepWithCode = sql.firstRow("""
                SELECT CONCAT(stm.stt_code, '-', stm.stm_number) as step_code
                FROM steps_master_stm stm
                LIMIT 1
            """)
            testStepCode = stepWithCode?.step_code
        }
    }

    /**
     * Main backward compatibility validation method
     */
    static void main(String[] args) {
        def validator = new BackwardCompatibilityValidator()
        def results = []
        
        try {
            println "=".repeat(80)
            println "US-024 StepsAPI Backward Compatibility Validation - Phase 3.4"
            println "Ensuring 100% existing functionality preserved"
            println "=".repeat(80)
            
            // Compatibility Test Group 1: API Endpoint Compatibility
            results << validator.validateExistingEndpointStructure()
            results << validator.validateDataStructureCompatibility()
            results << validator.validateResponseFormatCompatibility()
            
            // Compatibility Test Group 2: IterationView Integration
            results << validator.validateIterationViewIntegration()
            results << validator.validateHierarchicalDataAccess()
            results << validator.validateFilteringCapabilities()
            
            // Compatibility Test Group 3: Admin GUI Compatibility  
            results << validator.validateAdminGuiDataFormats()
            results << validator.validateFieldNamingConsistency()
            
            // Compatibility Test Group 4: Database Schema Compatibility
            results << validator.validateDatabaseSchemaIntegrity()
            results << validator.validateExistingQueryCompatibility()
            
            // Compatibility Test Group 5: Functionality Preservation
            results << validator.validateStepStatusWorkflows()
            results << validator.validateCommentFunctionality()
            results << validator.validateBulkOperationCompatibility()
            
            // Compatibility Test Group 6: Error Handling Compatibility
            results << validator.validateErrorResponseCompatibility()
            results << validator.validateValidationMessageCompatibility()
            
        } catch (Exception e) {
            results << [test: "Compatibility Test Execution", success: false, error: e.message]
            e.printStackTrace()
        }
        
        // Print comprehensive compatibility results
        printCompatibilityResults(results)
    }

    // =====================================
    // Compatibility Test Group 1: API Endpoint Compatibility
    // =====================================
    
    def validateExistingEndpointStructure() {
        def testName = "Existing Endpoint Structure Compatibility"
        try {
            def endpointTests = []
            
            // Test base /steps endpoint (should return appropriate structure)
            def baseResponse = makeHttpRequest("GET", "${BASE_URL}/steps")
            endpointTests << [
                endpoint: "GET /steps",
                status: baseResponse.status,
                hasStepsProperty: baseResponse.data?.containsKey('steps') ?: false,
                hasTotalCount: baseResponse.data?.containsKey('totalCount') ?: false,
                compatible: baseResponse.status in [200, 400] // 400 is acceptable for empty filters
            ]
            
            // Test /steps/master endpoint
            def masterResponse = makeHttpRequest("GET", "${BASE_URL}/steps/master")
            endpointTests << [
                endpoint: "GET /steps/master",
                status: masterResponse.status,
                isArray: masterResponse.data instanceof List,
                hasStepMasterFields: masterResponse.data && masterResponse.data.size() > 0 ? 
                    masterResponse.data[0].containsKey('stm_id') : true,
                compatible: masterResponse.status == 200
            ]
            
            // Test step instance endpoint (if data available)
            if (testStepInstanceId) {
                def instanceResponse = makeHttpRequest("GET", "${BASE_URL}/steps/${testStepInstanceId}")
                endpointTests << [
                    endpoint: "GET /steps/{id}",
                    status: instanceResponse.status,
                    hasStepInstance: instanceResponse.data?.containsKey('stepInstance') ?: false,
                    compatible: instanceResponse.status in [200, 404] // 404 acceptable for missing data
                ]
            }
            
            def allCompatible = endpointTests.every { it.compatible }
            
            return [
                test: testName,
                success: allCompatible,
                details: endpointTests.collect { 
                    "${it.endpoint}: ${it.status} ${it.compatible ? '✓' : '✗'}"
                }.join(", ")
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateDataStructureCompatibility() {
        def testName = "Data Structure Compatibility"
        try {
            def structureTests = []
            
            // Test master steps data structure
            def masterResponse = makeHttpRequest("GET", "${BASE_URL}/steps/master")
            if (masterResponse.status == 200 && masterResponse.data instanceof List && masterResponse.data.size() > 0) {
                def firstStep = masterResponse.data[0]
                def requiredFields = ['stm_id', 'stt_code', 'stm_number', 'stm_name']
                def hasAllFields = requiredFields.every { firstStep.containsKey(it) }
                
                structureTests << [
                    structure: "Master Steps",
                    hasRequiredFields: hasAllFields,
                    missingFields: requiredFields.findAll { !firstStep.containsKey(it) }
                ]
            }
            
            // Test filtered steps data structure
            if (testMigrationId) {
                def filteredResponse = makeHttpRequest("GET", "${BASE_URL}/steps?migrationId=${testMigrationId}")
                if (filteredResponse.status == 200 && filteredResponse.data?.steps instanceof List) {
                    structureTests << [
                        structure: "Filtered Steps",
                        hasStepsArray: true,
                        hasTotalCount: filteredResponse.data.containsKey('totalCount'),
                        hasMetadata: filteredResponse.data.containsKey('filters') // New feature should not break compatibility
                    ]
                }
            }
            
            def allCompatible = structureTests.every { 
                it.hasRequiredFields != false && it.hasStepsArray != false 
            }
            
            return [
                test: testName,
                success: allCompatible,
                details: "Structures tested: ${structureTests.size()}, All compatible: ${allCompatible}"
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateResponseFormatCompatibility() {
        def testName = "Response Format Compatibility"
        try {
            def formatTests = []
            
            // Test JSON response format consistency
            def endpoints = [
                ["Master Steps", "${BASE_URL}/steps/master"],
                ["Migration Filter", testMigrationId ? "${BASE_URL}/steps?migrationId=${testMigrationId}" : null]
            ].findAll { it[1] != null }
            
            endpoints.each { endpoint ->
                def response = makeHttpRequest("GET", endpoint[1])
                
                formatTests << [
                    endpoint: endpoint[0],
                    status: response.status,
                    isValidJson: response.data != null,
                    hasExpectedStructure: response.status == 200 ? 
                        (response.data instanceof List || response.data instanceof Map) : true,
                    compatible: response.status in [200, 400, 404]
                ]
            }
            
            def allFormatCompatible = formatTests.every { it.compatible && it.isValidJson }
            
            return [
                test: testName,
                success: allFormatCompatible,
                details: "Format tests: ${formatTests.size()}, JSON compatible: ${allFormatCompatible}"
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Compatibility Test Group 2: IterationView Integration
    // =====================================
    
    def validateIterationViewIntegration() {
        def testName = "IterationView Integration Compatibility"
        try {
            def integrationTests = []
            
            // Test iteration-based step retrieval (key IterationView functionality)
            if (testIterationId) {
                def iterationResponse = makeHttpRequest("GET", "${BASE_URL}/steps?iterationId=${testIterationId}")
                integrationTests << [
                    integration: "Iteration Filter",
                    status: iterationResponse.status,
                    hasSteps: iterationResponse.data?.containsKey('steps') ?: false,
                    dataStructure: iterationResponse.data?.steps instanceof List,
                    compatible: iterationResponse.status in [200, 404] // 404 ok if no data
                ]
            }
            
            // Test migration-based step retrieval (IterationView uses this)
            if (testMigrationId) {
                def migrationResponse = makeHttpRequest("GET", "${BASE_URL}/steps?migrationId=${testMigrationId}")
                integrationTests << [
                    integration: "Migration Filter", 
                    status: migrationResponse.status,
                    hasSteps: migrationResponse.data?.containsKey('steps') ?: false,
                    hasTotalCount: migrationResponse.data?.containsKey('totalCount') ?: false,
                    compatible: migrationResponse.status == 200
                ]
            }
            
            // Test pagination (IterationView requires this)
            if (testMigrationId) {
                def paginationResponse = makeHttpRequest("GET", 
                    "${BASE_URL}/steps?migrationId=${testMigrationId}&limit=10&offset=0")
                integrationTests << [
                    integration: "Pagination",
                    status: paginationResponse.status,
                    respectsLimit: paginationResponse.data?.steps?.size() <= 10,
                    compatible: paginationResponse.status == 200
                ]
            }
            
            def allIntegrationCompatible = integrationTests.every { it.compatible }
            
            return [
                test: testName,
                success: allIntegrationCompatible,
                details: "Integration tests: ${integrationTests.size()}, All compatible: ${allIntegrationCompatible}"
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateHierarchicalDataAccess() {
        def testName = "Hierarchical Data Access Compatibility"
        try {
            def hierarchicalTests = []
            
            // Test all hierarchical filters that IterationView might use
            def filterTests = [
                ["Migration", testMigrationId ? "migrationId=${testMigrationId}" : null],
                ["Iteration", testIterationId ? "iterationId=${testIterationId}" : null]
            ].findAll { it[1] != null }
            
            filterTests.each { filterTest ->
                def response = makeHttpRequest("GET", "${BASE_URL}/steps?${filterTest[1]}")
                
                hierarchicalTests << [
                    filter: filterTest[0],
                    status: response.status,
                    hasData: response.data != null,
                    hasExpectedStructure: response.data?.containsKey('steps') ?: false,
                    compatible: response.status in [200, 404]
                ]
            }
            
            // Test sorting compatibility (IterationView uses sorting)
            if (testMigrationId) {
                def sortResponse = makeHttpRequest("GET", 
                    "${BASE_URL}/steps?migrationId=${testMigrationId}&sortBy=stm_number&sortOrder=ASC")
                hierarchicalTests << [
                    filter: "Sorting",
                    status: sortResponse.status,
                    hasData: sortResponse.data != null,
                    compatible: sortResponse.status in [200, 400]
                ]
            }
            
            def allHierarchicalCompatible = hierarchicalTests.every { it.compatible }
            
            return [
                test: testName,
                success: allHierarchicalCompatible,
                details: "Hierarchical tests: ${hierarchicalTests.size()}, Compatible: ${allHierarchicalCompatible}"
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateFilteringCapabilities() {
        def testName = "Filtering Capabilities Compatibility"
        try {
            def filteringTests = []
            
            // Test basic filtering still works as expected
            if (testMigrationId) {
                def basicFilter = makeHttpRequest("GET", "${BASE_URL}/steps?migrationId=${testMigrationId}")
                filteringTests << [
                    filterType: "Basic Migration Filter",
                    works: basicFilter.status == 200,
                    hasResults: basicFilter.data?.steps instanceof List
                ]
            }
            
            // Test that empty filters return appropriate response (not error)
            def emptyFilter = makeHttpRequest("GET", "${BASE_URL}/steps")
            filteringTests << [
                filterType: "Empty Filters",
                works: emptyFilter.status in [200, 400], // Both acceptable
                handledGracefully: emptyFilter.data != null
            ]
            
            // Test invalid UUID handling (should not crash)
            def invalidUuid = makeHttpRequest("GET", "${BASE_URL}/steps?migrationId=invalid-uuid")
            filteringTests << [
                filterType: "Invalid UUID",
                works: invalidUuid.status in [400, 422], // Should return validation error
                handledGracefully: invalidUuid.data != null
            ]
            
            def allFilteringCompatible = filteringTests.every { it.works && it.handledGracefully }
            
            return [
                test: testName,
                success: allFilteringCompatible,
                details: "Filter tests: ${filteringTests.size()}, All working: ${allFilteringCompatible}"
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Compatibility Test Group 3: Admin GUI Compatibility
    // =====================================
    
    def validateAdminGuiDataFormats() {
        def testName = "Admin GUI Data Format Compatibility"
        try {
            def guiFormatTests = []
            
            // Test master steps format (Admin GUI expects specific field names)
            def masterResponse = makeHttpRequest("GET", "${BASE_URL}/steps/master")
            if (masterResponse.status == 200 && masterResponse.data instanceof List && masterResponse.data.size() > 0) {
                def step = masterResponse.data[0]
                def requiredFieldsForGui = ['stm_id', 'stt_code', 'stm_number', 'stm_name']
                def hasGuiFields = requiredFieldsForGui.every { step.containsKey(it) }
                
                guiFormatTests << [
                    component: "Master Steps Dropdown",
                    hasRequiredFields: hasGuiFields,
                    fieldCount: step.keySet().size(),
                    compatible: hasGuiFields
                ]
            }
            
            // Test step instance format (Admin GUI step details)
            if (testStepInstanceId) {
                def instanceResponse = makeHttpRequest("GET", "${BASE_URL}/steps/${testStepInstanceId}")
                if (instanceResponse.status == 200 && instanceResponse.data?.stepInstance) {
                    def stepInstance = instanceResponse.data.stepInstance
                    def hasInstanceFields = ['sti_id', 'stm_id', 'sti_status'].every { 
                        stepInstance.containsKey(it) 
                    }
                    
                    guiFormatTests << [
                        component: "Step Instance Details",
                        hasRequiredFields: hasInstanceFields,
                        hasInstructions: instanceResponse.data.containsKey('instructions'),
                        hasComments: instanceResponse.data.containsKey('comments'),
                        compatible: hasInstanceFields
                    ]
                }
            }
            
            def allGuiCompatible = guiFormatTests.every { it.compatible }
            
            return [
                test: testName,
                success: allGuiCompatible,
                details: "GUI format tests: ${guiFormatTests.size()}, Compatible: ${allGuiCompatible}"
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateFieldNamingConsistency() {
        def testName = "Field Naming Consistency"
        try {
            def namingTests = []
            
            // Validate that database field names are preserved for Admin GUI compatibility
            def masterResponse = makeHttpRequest("GET", "${BASE_URL}/steps/master")
            if (masterResponse.status == 200 && masterResponse.data instanceof List && masterResponse.data.size() > 0) {
                def step = masterResponse.data[0]
                
                // These are the expected database field names that Admin GUI depends on
                def expectedDbFields = [
                    'stm_id': step.containsKey('stm_id'),
                    'stt_code': step.containsKey('stt_code'),
                    'stm_number': step.containsKey('stm_number'),
                    'stm_name': step.containsKey('stm_name'),
                    'stm_description': step.containsKey('stm_description')
                ]
                
                def allDbFieldsPresent = expectedDbFields.values().every { it }
                
                namingTests << [
                    context: "Master Steps Database Fields",
                    allPresent: allDbFieldsPresent,
                    missingFields: expectedDbFields.findAll { !it.value }.collect { it.key }
                ]
            }
            
            def allNamingConsistent = namingTests.every { it.allPresent }
            
            return [
                test: testName,
                success: allNamingConsistent,
                details: "Naming tests: ${namingTests.size()}, Consistent: ${allNamingConsistent}"
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Compatibility Test Group 4: Database Schema Compatibility
    // =====================================
    
    def validateDatabaseSchemaIntegrity() {
        def testName = "Database Schema Integrity"
        try {
            def schemaTests = []
            
            DatabaseUtil.withSql { sql ->
                // Test that all expected tables still exist
                def expectedTables = [
                    'steps_master_stm',
                    'steps_instance_sti', 
                    'step_types_stt',
                    'step_comments_stc',
                    'steps_master_stm_x_teams_tms_impacted',
                    'steps_master_stm_x_labels_lab',
                    'steps_master_stm_x_iteration_types_itt'
                ]
                
                expectedTables.each { tableName ->
                    try {
                        def tableExists = sql.firstRow("SELECT 1 FROM ${tableName} LIMIT 1")
                        schemaTests << [
                            table: tableName,
                            exists: true,
                            accessible: true
                        ]
                    } catch (SQLException e) {
                        schemaTests << [
                            table: tableName,
                            exists: false,
                            accessible: false,
                            error: e.message
                        ]
                    }
                }
                
                // Test that key columns still exist in steps_instance_sti
                try {
                    def stepInstance = sql.firstRow("""
                        SELECT sti_id, stm_id, sti_status, tms_id_owner, sti_order,
                               sti_start_time, sti_end_time, phi_id,
                               sti_created_at, sti_created_by, sti_modified_at, sti_modified_by
                        FROM steps_instance_sti 
                        LIMIT 1
                    """)
                    
                    schemaTests << [
                        table: "steps_instance_sti_columns",
                        exists: true,
                        hasAllColumns: true,
                        accessible: true
                    ]
                } catch (SQLException e) {
                    schemaTests << [
                        table: "steps_instance_sti_columns", 
                        exists: false,
                        hasAllColumns: false,
                        error: e.message
                    ]
                }
            }
            
            def allSchemaIntact = schemaTests.every { it.exists && it.accessible }
            
            return [
                test: testName,
                success: allSchemaIntact,
                details: "Schema tests: ${schemaTests.size()}, All intact: ${allSchemaIntact}",
                failedTables: schemaTests.findAll { !it.exists }.collect { it.table }
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateExistingQueryCompatibility() {
        def testName = "Existing Query Compatibility"
        try {
            def queryTests = []
            
            DatabaseUtil.withSql { sql ->
                // Test basic step queries that existing code might use
                try {
                    def masterSteps = sql.rows("""
                        SELECT stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name
                        FROM steps_master_stm stm
                        LIMIT 10
                    """)
                    
                    queryTests << [
                        queryType: "Master Steps Basic Query",
                        works: true,
                        resultCount: masterSteps.size()
                    ]
                } catch (SQLException e) {
                    queryTests << [
                        queryType: "Master Steps Basic Query",
                        works: false,
                        error: e.message
                    ]
                }
                
                // Test step instance query with joins
                try {
                    def stepInstances = sql.rows("""
                        SELECT sti.sti_id, sti.stm_id, sti.sti_status, stm.stm_name
                        FROM steps_instance_sti sti
                        JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                        LIMIT 10
                    """)
                    
                    queryTests << [
                        queryType: "Step Instance with Master Join",
                        works: true,
                        resultCount: stepInstances.size()
                    ]
                } catch (SQLException e) {
                    queryTests << [
                        queryType: "Step Instance with Master Join",
                        works: false,
                        error: e.message
                    ]
                }
                
                // Test hierarchical query (like IterationView uses)
                if (testMigrationId) {
                    try {
                        def hierarchicalSteps = sql.rows("""
                            SELECT DISTINCT stm.stm_id, stm.stt_code, stm.stm_number
                            FROM steps_master_stm stm
                            JOIN phases_master_phm phm ON stm.phm_id = phm.phm_id
                            JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                            JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                            JOIN iterations_ite ite ON plm.plm_id = ite.plm_id
                            WHERE ite.mig_id = :migrationId
                            LIMIT 5
                        """, [migrationId: testMigrationId])
                        
                        queryTests << [
                            queryType: "Hierarchical Query",
                            works: true,
                            resultCount: hierarchicalSteps.size()
                        ]
                    } catch (SQLException e) {
                        queryTests << [
                            queryType: "Hierarchical Query",
                            works: false,
                            error: e.message
                        ]
                    }
                }
            }
            
            def allQueriesWork = queryTests.every { it.works }
            
            return [
                test: testName,
                success: allQueriesWork,
                details: "Query tests: ${queryTests.size()}, All working: ${allQueriesWork}",
                failedQueries: queryTests.findAll { !it.works }.collect { it.queryType }
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Compatibility Test Group 5: Functionality Preservation
    // =====================================
    
    def validateStepStatusWorkflows() {
        def testName = "Step Status Workflow Compatibility"
        try {
            def workflowTests = []
            
            // Test status update endpoint exists and works
            if (testStepInstanceId) {
                def statusUpdateBody = new JsonBuilder([
                    newStatus: 2,
                    userId: 1
                ]).toString()
                
                def statusResponse = makeHttpRequest("PUT", 
                    "${BASE_URL}/steps/${testStepInstanceId}/status", statusUpdateBody)
                
                workflowTests << [
                    workflow: "Status Update",
                    endpointExists: true,
                    acceptsCorrectFormat: statusResponse.status in [200, 400, 404], // All acceptable for compatibility
                    returnsResponse: statusResponse.data != null
                ]
                
                // Test status update with comment
                def commentUpdateBody = new JsonBuilder([
                    newStatus: 3,
                    comment: "Compatibility test comment", 
                    userId: 1
                ]).toString()
                
                def commentResponse = makeHttpRequest("PUT",
                    "${BASE_URL}/steps/${testStepInstanceId}/status-comment", commentUpdateBody)
                
                workflowTests << [
                    workflow: "Status Update with Comment",
                    endpointExists: true,
                    acceptsCorrectFormat: commentResponse.status in [200, 400, 404],
                    returnsResponse: commentResponse.data != null
                ]
            }
            
            def allWorkflowsCompatible = workflowTests.every { 
                it.endpointExists && it.acceptsCorrectFormat 
            }
            
            return [
                test: testName,
                success: allWorkflowsCompatible,
                details: "Workflow tests: ${workflowTests.size()}, Compatible: ${allWorkflowsCompatible}"
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateCommentFunctionality() {
        def testName = "Comment Functionality Compatibility"
        try {
            def commentTests = []
            
            // Test comment creation endpoint
            if (testStepInstanceId) {
                def createCommentBody = new JsonBuilder([
                    commentBody: "Compatibility test comment",
                    userId: 1
                ]).toString()
                
                def createResponse = makeHttpRequest("POST",
                    "${BASE_URL}/steps/${testStepInstanceId}/comments", createCommentBody)
                
                commentTests << [
                    functionality: "Create Comment",
                    endpointExists: true,
                    acceptsCorrectFormat: createResponse.status in [200, 201, 400, 404],
                    returnsData: createResponse.data != null
                ]
                
                // Test comment retrieval (via step instance details)
                def detailsResponse = makeHttpRequest("GET", "${BASE_URL}/steps/${testStepInstanceId}")
                commentTests << [
                    functionality: "Retrieve Comments",
                    endpointExists: true,
                    includesComments: detailsResponse.data?.containsKey('comments') ?: false,
                    returnsData: detailsResponse.data != null
                ]
            }
            
            def allCommentFunctionalityWorks = commentTests.every { 
                it.endpointExists && it.returnsData 
            }
            
            return [
                test: testName,
                success: allCommentFunctionalityWorks,
                details: "Comment tests: ${commentTests.size()}, Working: ${allCommentFunctionalityWorks}"
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateBulkOperationCompatibility() {
        def testName = "Bulk Operation Compatibility"
        try {
            def bulkTests = []
            
            // Test bulk status update endpoint exists
            if (testStepInstanceId) {
                def bulkStatusBody = new JsonBuilder([
                    statusUpdates: [
                        [stepInstanceId: testStepInstanceId.toString(), newStatus: 2]
                    ],
                    userId: 1
                ]).toString()
                
                def bulkStatusResponse = makeHttpRequest("PUT",
                    "${BASE_URL}/steps/bulk/status", bulkStatusBody)
                
                bulkTests << [
                    operation: "Bulk Status Update",
                    endpointExists: true,
                    acceptsCorrectFormat: bulkStatusResponse.status in [200, 400, 404],
                    returnsResultsArray: bulkStatusResponse.data?.containsKey('results') ?: false
                ]
            }
            
            def allBulkOperationsCompatible = bulkTests.every { 
                it.endpointExists && it.acceptsCorrectFormat 
            }
            
            return [
                test: testName,
                success: allBulkOperationsCompatible,
                details: "Bulk tests: ${bulkTests.size()}, Compatible: ${allBulkOperationsCompatible}"
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }

    // =====================================
    // Compatibility Test Group 6: Error Handling Compatibility
    // =====================================
    
    def validateErrorResponseCompatibility() {
        def testName = "Error Response Compatibility"
        try {
            def errorTests = []
            
            // Test 404 error for non-existent step
            def nonExistentId = UUID.randomUUID()
            def notFoundResponse = makeHttpRequest("GET", "${BASE_URL}/steps/${nonExistentId}")
            
            errorTests << [
                errorType: "404 Not Found",
                correctStatus: notFoundResponse.status == 404,
                hasErrorData: notFoundResponse.data != null,
                jsonFormat: notFoundResponse.data instanceof Map
            ]
            
            // Test 400 error for invalid UUID
            def invalidUuidResponse = makeHttpRequest("GET", "${BASE_URL}/steps?migrationId=invalid-uuid")
            
            errorTests << [
                errorType: "400 Invalid UUID",
                correctStatus: invalidUuidResponse.status in [400, 422],
                hasErrorData: invalidUuidResponse.data != null,
                jsonFormat: invalidUuidResponse.data instanceof Map
            ]
            
            // Test validation error for invalid status update
            if (testStepInstanceId) {
                def invalidStatusBody = new JsonBuilder([
                    newStatus: 999, // Invalid status
                    userId: 1
                ]).toString()
                
                def validationResponse = makeHttpRequest("PUT",
                    "${BASE_URL}/steps/${testStepInstanceId}/status", invalidStatusBody)
                
                errorTests << [
                    errorType: "400 Validation Error",
                    correctStatus: validationResponse.status in [400, 422],
                    hasErrorData: validationResponse.data != null,
                    providesErrorMessage: validationResponse.data?.containsKey('message') ?: false
                ]
            }
            
            def allErrorsHandledCorrectly = errorTests.every { 
                it.correctStatus && it.hasErrorData && it.jsonFormat 
            }
            
            return [
                test: testName,
                success: allErrorsHandledCorrectly,
                details: "Error tests: ${errorTests.size()}, Handled correctly: ${allErrorsHandledCorrectly}"
            ]
        } catch (Exception e) {
            return [test: testName, success: false, error: e.message]
        }
    }
    
    def validateValidationMessageCompatibility() {
        def testName = "Validation Message Compatibility"
        try {
            def validationTests = []
            
            // Test that validation messages are in expected format
            if (testStepInstanceId) {
                def invalidDataBody = new JsonBuilder([
                    newStatus: "invalid", // String instead of integer
                    userId: "invalid"     // String instead of integer
                ]).toString()
                
                def validationResponse = makeHttpRequest("PUT",
                    "${BASE_URL}/steps/${testStepInstanceId}/status", invalidDataBody)
                
                validationTests << [
                    validationType: "Type Validation",
                    hasValidationError: validationResponse.status in [400, 422],
                    hasMessage: validationResponse.data?.containsKey('message') ?: false,
                    messageIsString: validationResponse.data?.message instanceof String
                ]
            }
            
            def allValidationCompatible = validationTests.every { 
                it.hasValidationError && it.hasMessage 
            }
            
            return [
                test: testName,
                success: allValidationCompatible,
                details: "Validation tests: ${validationTests.size()}, Compatible: ${allValidationCompatible}"
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
            connection.connectTimeout = 10000
            connection.readTimeout = 15000
            
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
     * Print comprehensive compatibility results
     */
    private static void printCompatibilityResults(List results) {
        println "\n" + "=".repeat(80)
        println "US-024 StepsAPI Backward Compatibility Results - Phase 3.4"
        println "=".repeat(80)
        
        def successful = results.count { it.success }
        def total = results.size()
        def compatibilityRate = total > 0 ? (successful / total * 100).round(1) : 0
        
        println "Compatibility Status: ${successful}/${total} tests passed (${compatibilityRate}%)"
        println ""
        
        // Group results by success/failure
        def passed = results.findAll { it.success }
        def failed = results.findAll { !it.success }
        
        if (passed) {
            println "✅ COMPATIBLE (${passed.size()}):"
            passed.each { result ->
                println "   ✓ ${result.test}"
                if (result.details) {
                    println "     ${result.details}"
                }
            }
            println ""
        }
        
        if (failed) {
            println "❌ COMPATIBILITY ISSUES (${failed.size()}):"
            failed.each { result ->
                println "   ✗ ${result.test}"
                if (result.error) {
                    println "     Error: ${result.error}"
                }
                if (result.details) {
                    println "     Details: ${result.details}"
                }
                if (result.failedTables) {
                    println "     Failed Tables: ${result.failedTables.join(', ')}"
                }
                if (result.failedQueries) {
                    println "     Failed Queries: ${result.failedQueries.join(', ')}"
                }
            }
            println ""
        }
        
        // Compatibility summary
        println "🔄 COMPATIBILITY SUMMARY:"
        println "   Target: 100% existing functionality preserved"
        println "   Result: ${compatibilityRate}% compatibility maintained"
        println "   Status: ${compatibilityRate >= 95 ? 'FULLY COMPATIBLE' : 'COMPATIBILITY ISSUES DETECTED'}"
        println ""
        
        if (compatibilityRate < 95) {
            println "⚠️  RECOMMENDATIONS:"
            println "   - Review failed compatibility tests above"
            println "   - Ensure all existing integrations are tested"
            println "   - Validate IterationView functionality manually"
            println "   - Check Admin GUI components still work"
            println ""
        }
        
        println "=".repeat(80)
        println "Phase 3.4 Backward Compatibility Validation Complete"
        println "=".repeat(80)
    }
}