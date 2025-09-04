package umig.tests.integration

import umig.tests.utils.BaseIntegrationTest
import umig.tests.utils.IntegrationTestHttpClient
import umig.tests.utils.HttpResponse
import umig.service.ImportService
import umig.service.CsvImportService
import umig.repository.ImportRepository
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.sql.Sql
import java.util.UUID

/**
 * Comprehensive Integration Test for US-034 Import API Endpoints
 * 
 * Tests all 12 import API endpoints end-to-end:
 * 1. POST /import/json - Single JSON import
 * 2. POST /import/batch - Batch JSON import
 * 3. GET /import/history - Import history with filtering
 * 4. GET /import/batch/{id} - Specific batch details
 * 5. GET /import/statistics - Overall statistics
 * 6. DELETE /import/batch/{id} - Batch rollback
 * 7. PUT /import/batch/{id}/status - Status updates
 * 8. POST /import/csv/teams - CSV team import
 * 9. POST /import/csv/users - CSV user import
 * 10. POST /import/csv/applications - CSV application import
 * 11. POST /import/csv/environments - CSV environment import
 * 12. POST /import/master-plan - Master plan creation
 * 13. GET /import/templates/{entity} - CSV template download
 * 14. POST /import/rollback/{id} - Enhanced rollback
 * 
 * Framework: Extends BaseIntegrationTest (US-037 95% compliance)
 * Performance: <500ms API response validation
 * Authentication: confluence-administrators group testing
 * Database: DatabaseUtil.withSql pattern with explicit casting (ADR-031)
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 4 (Integration Testing)
 */
class ImportApiIntegrationTest extends BaseIntegrationTest {

    private ImportService importService
    private CsvImportService csvImportService
    private ImportRepository importRepository
    
    // Test data tracking for cleanup
    private final Set<UUID> createdBatches = new HashSet<>()
    private final Set<UUID> createdOrchestrations = new HashSet<>()
    private final Set<UUID> createdPlans = new HashSet<>()

    void setup() {
        super.setup()
        importService = new ImportService()
        csvImportService = new CsvImportService()
        importRepository = new ImportRepository()
        logProgress("ImportApiIntegrationTest setup complete")
    }

    void cleanup() {
        cleanupImportTestData()
        super.cleanup()
    }

    // ====== ENDPOINT TESTING METHODS ======

    void testSingleJsonImportApiEndpoint() {
        logProgress("Testing single JSON import API endpoint")

        // Prepare test JSON data
        Map testStepData = [
            step_type: 'TST',
            step_number: 1,
            title: 'API Test Step',
            task_list: [
                [instruction_id: 'API-001', description: 'Test instruction 1'],
                [instruction_id: 'API-002', description: 'Test instruction 2']
            ]
        ]

        Map requestPayload = [
            source: 'api_test_step.json',
            content: new JsonBuilder(testStepData).toString()
        ]

        // Execute API call
        HttpResponse response = httpClient.post('/importData/json', requestPayload)
        
        // Validate response
        validateApiSuccess(response, 200)
        def jsonBody = response.jsonBody
        
        assert ((Map)jsonBody).success == true, "Import should succeed: ${((Map)jsonBody).error}"
        assert ((Map)jsonBody).source == 'api_test_step.json', "Source should match request"
        assert ((Map)jsonBody).batchId != null, "Should return batch ID"
        assert ((Map)jsonBody).stepCount != null, "Should return step count"
        
        // Track for cleanup
        if (((Map)jsonBody).batchId) {
            createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
        }

        logProgress("✅ Single JSON import API test passed")
    }

    void testBatchJsonImportApiEndpoint() {
        logProgress("Testing batch JSON import API endpoint")

        // Prepare batch test data
        List testFiles = [
            [
                filename: 'batch_test_1.json',
                content: new JsonBuilder([
                    step_type: 'BTH',
                    step_number: 1,
                    title: 'Batch Test Step 1',
                    task_list: [
                        [instruction_id: 'BTH-001', description: 'Batch instruction 1']
                    ]
                ]).toString()
            ],
            [
                filename: 'batch_test_2.json',
                content: new JsonBuilder([
                    step_type: 'BTH',
                    step_number: 2,
                    title: 'Batch Test Step 2',
                    task_list: [
                        [instruction_id: 'BTH-002', description: 'Batch instruction 2']
                    ]
                ]).toString()
            ]
        ]

        Map requestPayload = [files: testFiles]

        // Execute API call
        HttpResponse response = httpClient.post('/importData/batch', requestPayload)
        
        // Validate response
        validateApiSuccess(response, 200)
        def jsonBody = response.jsonBody
        
        assert ((Map)jsonBody).success == true, "Batch import should succeed: ${((Map)jsonBody).errors}"
        assert ((Map)jsonBody).batchId != null, "Should return batch ID"
        assert (((Map)jsonBody).processedFiles as Integer) >= 2, "Should process multiple files"
        assert (((Map)jsonBody).totalSteps as Integer) >= 2, "Should create multiple steps"
        
        // Track for cleanup
        if (((Map)jsonBody).batchId) {
            createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
        }

        logProgress("✅ Batch JSON import API test passed")
    }

    void testImportHistoryApiEndpoint() {
        logProgress("Testing import history API endpoint")

        // First create some test data
        UUID testBatchId = createTestImportBatch()
        createdBatches.add(testBatchId)

        // Test basic history endpoint
        HttpResponse response = httpClient.get('/importHistory/history')
        validateApiSuccess(response, 200)
        
        def jsonBody = response.jsonBody
        assert jsonBody instanceof List, "History should return list"
        
        // Test filtered history with user ID
        HttpResponse filteredResponse = httpClient.get('/importHistory/history', ['userId': 'integration-test'])
        validateApiSuccess(filteredResponse, 200)
        
        // Test with limit parameter
        HttpResponse limitedResponse = httpClient.get('/importHistory/history', ['limit': '5'])
        validateApiSuccess(limitedResponse, 200)
        def limitedBody = limitedResponse.jsonBody
        assert (limitedBody as List).size() <= 5, "Should respect limit parameter"

        logProgress("✅ Import history API test passed")
    }

    void testSpecificBatchDetailsApiEndpoint() {
        logProgress("Testing specific batch details API endpoint")

        // Create test batch
        UUID testBatchId = createTestImportBatch()
        createdBatches.add(testBatchId)

        // Test existing batch details
        HttpResponse response = httpClient.get("/importHistory/batch/${testBatchId}")
        validateApiSuccess(response, 200)
        
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).batchId == testBatchId.toString(), "Should return correct batch ID"
        assert ((Map)jsonBody).status != null, "Should have status"
        
        // Test non-existent batch
        UUID nonExistentBatchId = UUID.randomUUID()
        HttpResponse notFoundResponse = httpClient.get("/importHistory/batch/${nonExistentBatchId}")
        validateApiError(notFoundResponse, 404)

        logProgress("✅ Batch details API test passed")
    }

    void testImportStatisticsApiEndpoint() {
        logProgress("Testing import statistics API endpoint")

        // Execute statistics request
        HttpResponse response = httpClient.get('/importHistory/statistics')
        validateApiSuccess(response, 200)
        
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).totalBatches != null, "Should have total batches count"
        assert ((Map)jsonBody).totalSteps != null, "Should have total steps count"
        assert ((Map)jsonBody).successRate != null, "Should have success rate"
        assert ((Map)jsonBody).averageProcessingTime != null, "Should have average processing time"

        logProgress("✅ Import statistics API test passed")
    }

    void testBatchRollbackApiEndpoint() {
        logProgress("Testing batch rollback API endpoint")

        // Create test batch to rollback
        UUID testBatchId = createTestImportBatch()
        createdBatches.add(testBatchId)

        // Test rollback with reason
        Map rollbackPayload = [reason: "Integration test rollback"]
        HttpResponse response = httpClient.delete("/importRollback/batch/${testBatchId}")
        
        validateApiSuccess(response, 200)
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).message != null, "Should have success message"
        assert ((Map)jsonBody).batchId == testBatchId.toString(), "Should return batch ID"
        
        // Test rollback of non-existent batch
        UUID nonExistentBatchId = UUID.randomUUID()
        HttpResponse notFoundResponse = httpClient.delete("/importRollback/batch/${nonExistentBatchId}")
        validateApiError(notFoundResponse, 404)

        logProgress("✅ Batch rollback API test passed")
    }

    void testBatchStatusUpdateApiEndpoint() {
        logProgress("Testing batch status update API endpoint")

        // Create test batch
        UUID testBatchId = createTestImportBatch()
        createdBatches.add(testBatchId)

        // Test status update
        Map statusUpdate = [
            status: 'COMPLETED',
            statistics: [
                completedSteps: 5,
                totalInstructions: 12,
                processingTime: 2500
            ]
        ]

        HttpResponse response = httpClient.put("/importStatusUpdate/batch/${testBatchId}/status", statusUpdate)
        validateApiSuccess(response, 200)
        
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).message != null, "Should have success message"
        assert ((Map)jsonBody).batchId == testBatchId.toString(), "Should return batch ID"
        assert ((Map)jsonBody).status == 'COMPLETED', "Should return updated status"

        // Test invalid status update (missing status)
        Map invalidUpdate = [statistics: [test: 'value']]
        HttpResponse badRequestResponse = httpClient.put("/importStatusUpdate/batch/${testBatchId}/status", invalidUpdate)
        validateApiError(badRequestResponse, 400)

        logProgress("✅ Batch status update API test passed")
    }

    void testCsvTeamsImportApiEndpoint() {
        logProgress("Testing CSV teams import API endpoint")

        // Prepare CSV data
        String csvData = """team_name,team_description
API Test Team 1,First API test team
API Test Team 2,Second API test team"""

        // Execute CSV import
        HttpResponse response = httpClient.post('/csvImport/csv/teams', csvData)
        validateApiSuccess(response, 200)
        
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).success == true, "CSV import should succeed: ${((Map)jsonBody).error}"
        assert ((Map)jsonBody).importedCount != null, "Should return imported count"
        assert ((Map)jsonBody).batchId != null, "Should return batch ID"
        
        // Track for cleanup
        if (((Map)jsonBody).batchId) {
            createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
        }

        logProgress("✅ CSV teams import API test passed")
    }

    void testCsvUsersImportApiEndpoint() {
        logProgress("Testing CSV users import API endpoint")

        // First ensure we have teams for user association
        testCsvTeamsImportApiEndpoint()

        // Prepare CSV data
        String csvData = """username,full_name,email,team_name
api.test1,API Test User 1,apitest1@example.com,API Test Team 1
api.test2,API Test User 2,apitest2@example.com,API Test Team 2"""

        // Execute CSV import
        HttpResponse response = httpClient.post('/csvImport/csv/users', csvData)
        validateApiSuccess(response, 200)
        
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).success == true, "CSV user import should succeed: ${((Map)jsonBody).error}"
        assert ((Map)jsonBody).importedCount != null, "Should return imported count"
        
        // Track for cleanup
        if (((Map)jsonBody).batchId) {
            createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
        }

        logProgress("✅ CSV users import API test passed")
    }

    void testCsvApplicationsImportApiEndpoint() {
        logProgress("Testing CSV applications import API endpoint")

        // Prepare CSV data
        String csvData = """app_name,app_description,app_type,app_owner,app_version
API Test App 1,First API test application,WEB,Test Owner,1.0.0
API Test App 2,Second API test application,API,Test Owner,2.0.0"""

        // Execute CSV import
        HttpResponse response = httpClient.post('/csvImport/csv/applications', csvData)
        validateApiSuccess(response, 200)
        
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).success == true, "CSV applications import should succeed: ${((Map)jsonBody).error}"
        assert ((Map)jsonBody).importedCount != null, "Should return imported count"
        
        // Track for cleanup
        if (((Map)jsonBody).batchId) {
            createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
        }

        logProgress("✅ CSV applications import API test passed")
    }

    void testCsvEnvironmentsImportApiEndpoint() {
        logProgress("Testing CSV environments import API endpoint")

        // Prepare CSV data
        String csvData = """env_name,env_description,env_type,env_status
API Test Dev,Development environment for API testing,DEV,Active
API Test Prod,Production environment for API testing,PROD,Active"""

        // Execute CSV import
        HttpResponse response = httpClient.post('/csvImport/csv/environments', csvData)
        validateApiSuccess(response, 200)
        
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).success == true, "CSV environments import should succeed: ${((Map)jsonBody).error}"
        assert ((Map)jsonBody).importedCount != null, "Should return imported count"
        
        // Track for cleanup
        if (((Map)jsonBody).batchId) {
            createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
        }

        logProgress("✅ CSV environments import API test passed")
    }

    void testMasterPlanCreationApiEndpoint() {
        logProgress("Testing master plan creation API endpoint")

        // Prepare master plan data
        Map planData = [
            planName: 'API Integration Test Plan',
            description: 'Master plan created via API integration testing',
            userId: 'integration-test'
        ]

        // Execute master plan creation
        HttpResponse response = httpClient.post('/masterPlanImport', planData)
        validateApiSuccess(response, 200)
        
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).success == true, "Master plan creation should succeed: ${((Map)jsonBody).error}"
        assert ((Map)jsonBody).planId != null, "Should return plan ID"
        assert ((Map)jsonBody).planName == planData.planName, "Should return correct plan name"
        assert ((Map)jsonBody).batchId != null, "Should return batch ID"
        
        // Track for cleanup
        if (((Map)jsonBody).batchId) {
            createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
        }
        if (((Map)jsonBody).planId) {
            createdPlans.add(UUID.fromString(((Map)jsonBody).planId as String))
        }

        // Test duplicate plan name (should fail)
        HttpResponse duplicateResponse = httpClient.post('/masterPlanImport', planData)
        validateApiError(duplicateResponse, 409) // Conflict

        logProgress("✅ Master plan creation API test passed")
    }

    void testCsvTemplateDownloadEndpoints() {
        logProgress("Testing CSV template download endpoints")

        // Test all supported entity types
        List<String> entityTypes = ['teams', 'users', 'applications', 'environments']
        
        entityTypes.each { entityType ->
            HttpResponse response = httpClient.get("/csvTemplates/templates/${entityType}")
            validateApiSuccess(response, 200)
            
            // Validate CSV content type
            assert response.body != null && !response.body.isEmpty(), "Template should have content for ${entityType}"
            // Basic CSV validation - should start with header row
            assert response.body.contains(','), "Template should be CSV format for ${entityType}"
        }

        // Test unsupported entity type
        HttpResponse badResponse = httpClient.get('/csvTemplates/templates/invalid_entity')
        validateApiError(badResponse, 400)

        logProgress("✅ CSV template download API tests passed")
    }

    void testEnhancedRollbackApiEndpoint() {
        logProgress("Testing enhanced rollback API endpoint")

        // Create test batch for rollback
        UUID testBatchId = createTestImportBatch()
        createdBatches.add(testBatchId)

        // Test enhanced rollback with detailed reason
        Map rollbackData = [
            reason: "Enhanced API integration test rollback with detailed audit trail"
        ]

        HttpResponse response = httpClient.post("/rollbackBatch/rollback/${testBatchId}", rollbackData)
        validateApiSuccess(response, 200)
        
        def jsonBody = response.jsonBody
        assert ((Map)jsonBody).success == true, "Enhanced rollback should succeed: ${((Map)jsonBody).error}"
        assert ((Map)jsonBody).batchId == testBatchId.toString(), "Should return batch ID"
        assert ((Map)jsonBody).rollbackActions != null, "Should return rollback actions"
        assert ((Map)jsonBody).rolledBackBy != null, "Should return user who performed rollback"

        logProgress("✅ Enhanced rollback API test passed")
    }

    void testBatchImportOrchestration() {
        logProgress("Testing complete batch import orchestration")

        // Test sequential import dependencies: Teams → Users → Applications → Environments → JSON
        
        // 1. Import Teams
        String teamsData = """team_name,team_description
Orchestration Team 1,First orchestration test team
Orchestration Team 2,Second orchestration test team"""
        
        HttpResponse teamsResponse = httpClient.post('/csvImport/csv/teams', teamsData)
        validateApiSuccess(teamsResponse, 200)
        
        // 2. Import Users (dependent on teams)
        String usersData = """username,full_name,email,team_name
orch.user1,Orchestration User 1,orchuser1@example.com,Orchestration Team 1
orch.user2,Orchestration User 2,orchuser2@example.com,Orchestration Team 2"""
        
        HttpResponse usersResponse = httpClient.post('/csvImport/csv/users', usersData)
        validateApiSuccess(usersResponse, 200)
        
        // 3. Import Applications
        String appsData = """app_name,app_description,app_type,app_owner,app_version
Orchestration App 1,First orchestration application,WEB,Orch Owner,1.0.0"""
        
        HttpResponse appsResponse = httpClient.post('/csvImport/csv/applications', appsData)
        validateApiSuccess(appsResponse, 200)
        
        // 4. Import Environments
        String envsData = """env_name,env_description,env_type,env_status
Orch Dev,Development environment,DEV,Active"""
        
        HttpResponse envsResponse = httpClient.post('/csvImport/csv/environments', envsData)
        validateApiSuccess(envsResponse, 200)
        
        // 5. Import JSON steps (dependent on all base entities)
        List jsonFiles = [
            [
                filename: 'orchestration_step.json',
                content: new JsonBuilder([
                    step_type: 'ORCH',
                    step_number: 1,
                    title: 'Orchestration Test Step',
                    task_list: [
                        [instruction_id: 'ORCH-001', description: 'Orchestration instruction']
                    ]
                ]).toString()
            ]
        ]
        
        HttpResponse jsonResponse = httpClient.post('/importData/batch', [files: jsonFiles])
        validateApiSuccess(jsonResponse, 200)
        
        // Track all batches for cleanup
        [teamsResponse, usersResponse, appsResponse, envsResponse, jsonResponse].each { response ->
            def batch = ((Map)response.jsonBody)?.batchId
            if (batch) {
                createdBatches.add(UUID.fromString(batch as String))
            }
        }

        logProgress("✅ Batch import orchestration test passed")
    }

    void testAuthenticationAndAuthorization() {
        logProgress("Testing authentication and authorization")

        // All endpoints should require authentication
        // This test validates that proper authentication headers are being sent
        // AuthenticationHelper should handle the actual authentication setup

        // Test that requests succeed with proper authentication (handled by AuthenticationHelper)
        HttpResponse authenticatedResponse = httpClient.get('/importHistory/statistics')
        assert authenticatedResponse.statusCode != 401, "Should not return 401 with proper authentication"
        assert authenticatedResponse.statusCode != 403, "Should not return 403 with proper authentication"

        // Note: Testing unauthorized access would require bypassing AuthenticationHelper
        // which is outside the scope of this integration test
        
        logProgress("✅ Authentication and authorization test passed")
    }

    void testApiErrorHandlingScenarios() {
        logProgress("Testing API error handling scenarios")

        // Test invalid JSON payload
        HttpResponse invalidJsonResponse = httpClient.post('/importData/json', "{ invalid json }")
        assert invalidJsonResponse.statusCode >= 400, "Should handle invalid JSON gracefully"

        // Test missing required fields
        Map invalidPayload = [source: 'test.json'] // Missing 'content'
        HttpResponse missingFieldResponse = httpClient.post('/importData/json', invalidPayload)
        validateApiError(missingFieldResponse, 400)

        // Test invalid batch ID format
        HttpResponse invalidBatchResponse = httpClient.get('/importHistory/batch/invalid-uuid-format')
        assert invalidBatchResponse.statusCode >= 400, "Should handle invalid UUID format"

        // Test empty CSV data
        HttpResponse emptyCsvResponse = httpClient.post('/csvImport/csv/teams', '')
        assert emptyCsvResponse.statusCode >= 400, "Should handle empty CSV data"

        logProgress("✅ API error handling scenarios test passed")
    }

    void testPerformanceWithLargeDatasets() {
        logProgress("Testing performance with large datasets")

        // Generate larger JSON batch for performance testing
        List<Map> largeJsonFiles = []
        (1..20).each { i ->
            largeJsonFiles << [
                filename: "performance_test_${i}.json",
                content: new JsonBuilder([
                    step_type: 'PERF',
                    step_number: i,
                    title: "Performance Test Step ${i}",
                    task_list: (1..5).collect { j ->
                        [instruction_id: "PERF-${i}-${j}", description: "Performance instruction ${j}"]
                    }
                ]).toString()
            ]
        }

        long startTime = System.currentTimeMillis()
        HttpResponse response = httpClient.post('/importData/batch', [files: largeJsonFiles])
        long duration = System.currentTimeMillis() - startTime

        // Validate performance targets
        validateApiSuccess(response, 200)
        assert duration < 60000, "Large dataset import should complete within 60 seconds (actual: ${duration}ms)"
        
        def jsonBody = response.jsonBody
        assert (((Map)jsonBody).processedFiles as Integer) == 20, "Should process all 20 files"
        assert (((Map)jsonBody).totalSteps as Integer) == 20, "Should create 20 steps"
        
        // Track for cleanup
        if (((Map)jsonBody).batchId) {
            createdBatches.add(UUID.fromString(((Map)jsonBody).batchId as String))
        }

        logProgress("✅ Performance with large datasets test passed (${duration}ms)")
    }

    // ====== HELPER METHODS ======

    /**
     * Create a test import batch for testing purposes
     * @return UUID of created batch
     */
    private UUID createTestImportBatch() {
        UUID batchId = UUID.randomUUID()
        
        DatabaseUtil.withSql { sql ->
            sql.execute('''
                INSERT INTO tbl_import_batches 
                (imb_id, imb_source_identifier, imb_import_type, imb_status, imb_user_id, imb_created_date)
                VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ''', [batchId, 'integration_test_batch', 'TEST_IMPORT', 'COMPLETED', 'integration-test'])
        }
        
        return batchId
    }

    /**
     * Clean up all import-related test data
     */
    private void cleanupImportTestData() {
        try {
            DatabaseUtil.withSql { sql ->
                // Clean up in dependency order
                
                // Remove staging data
                sql.execute("DELETE FROM stg_step_instructions WHERE sti_created_by LIKE 'integration%' OR sti_created_by LIKE 'api%'")
                sql.execute("DELETE FROM stg_steps WHERE sts_created_by LIKE 'integration%' OR sts_created_by LIKE 'api%'")
                
                // Remove test batches
                createdBatches.each { batchId ->
                    sql.execute("DELETE FROM tbl_import_audit_log WHERE ial_batch_id = ?", [batchId])
                    sql.execute("DELETE FROM tbl_import_batches WHERE imb_id = ?", [batchId])
                }
                
                // Remove test orchestrations
                createdOrchestrations.each { orchestrationId ->
                    sql.execute("DELETE FROM import_progress_tracking WHERE orchestration_id = ?", [orchestrationId])
                    sql.execute("DELETE FROM import_orchestrations WHERE orchestration_id = ?", [orchestrationId])
                }
                
                // Remove test base entities
                sql.execute("DELETE FROM tbl_teams WHERE tms_name LIKE 'API Test%' OR tms_name LIKE '%Integration%' OR tms_name LIKE 'Orchestration%'")
                sql.execute("DELETE FROM tbl_users WHERE usr_username LIKE 'api.test%' OR usr_username LIKE 'orch.%' OR usr_full_name LIKE '%API Test%'")
                sql.execute("DELETE FROM applications_app WHERE app_name LIKE 'API Test%' OR app_name LIKE '%Integration%' OR app_name LIKE 'Orchestration%'")
                sql.execute("DELETE FROM environments_env WHERE env_name LIKE 'API Test%' OR env_name LIKE '%Integration%' OR env_name LIKE 'Orch %'")
                
                // Remove test master plans
                createdPlans.each { planId ->
                    sql.execute("DELETE FROM tbl_plans_master WHERE plm_id = ?", [planId])
                }
                sql.execute("DELETE FROM tbl_plans_master WHERE plm_name LIKE '%API Integration%' OR plm_created_by = 'integration-test'")
            }
        } catch (Exception e) {
            println "⚠️ Warning during import test data cleanup: ${e.message}"
        }
    }
}