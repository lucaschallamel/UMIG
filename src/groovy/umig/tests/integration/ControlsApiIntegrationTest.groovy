package umig.tests.integration

import umig.tests.utils.BaseIntegrationTest
import umig.tests.utils.IntegrationTestHttpClient
import umig.tests.utils.HttpResponse
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import java.util.UUID

/**
 * Comprehensive integration tests for ControlsApi following BaseIntegrationTest framework.
 * Tests all endpoints including control masters, control instances, validation, and error scenarios.
 * Validates performance requirements (<500ms response times) and business logic.
 * 
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * Base Class: BaseIntegrationTest (US-037 Phase 4B)
 * Coverage: Controls CRUD, master/instance operations, validation workflows, error handling
 * Updated: 2025-08-27
 */
class ControlsApiIntegrationTest extends BaseIntegrationTest {
    
    // Test data tracking
    private UUID testControlMasterId = null
    private UUID testControlInstanceId = null
    private UUID testMasterPhaseId = null
    private UUID testPhaseInstanceId = null
    private UUID testMasterSequenceId = null
    private UUID testMasterPlanId = null
    private UUID testPlanInstanceId = null
    private UUID testIterationId = null
    private UUID testMigrationId = null
    private Integer testTeamId = null
    private Integer testUserId = null
    private Integer testSequenceInstanceId = null
    
    @Override
    def setup() {
        super.setup()
        setupControlsTestData()
    }
    
    /**
     * Setup test data hierarchy required for controls testing
     * Creates: Migration → Iteration → Plan Instance → Sequence → Phase → Control
     */
    private void setupControlsTestData() {
        logProgress("Setting up controls test data hierarchy")
        
        DatabaseUtil.withSql { sql ->
            try {
                // Get first team and user IDs
                def team = sql.firstRow("SELECT tms_id FROM teams_tms LIMIT 1")
                testTeamId = team?.tms_id as Integer
                
                def user = sql.firstRow("SELECT usr_id FROM users_usr LIMIT 1")
                testUserId = user?.usr_id as Integer
                
                // Get valid status IDs
                def migrationStatusId = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = 'PLANNING' AND sts_type = 'Migration'")?.sts_id ?: 1
                def planStatusId = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = 'PLANNING' AND sts_type = 'Plan'")?.sts_id ?: 1
                def iterationStatusId = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = 'PLANNING' AND sts_type = 'Iteration'")?.sts_id ?: 1
                def sequenceStatusId = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = 'PLANNING' AND sts_type = 'Sequence'")?.sts_id ?: 1
                def phaseStatusId = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = 'PLANNING' AND sts_type = 'Phase'")?.sts_id ?: 1
                
                // Create test migration
                def migrationResult = sql.firstRow("""
                    INSERT INTO migrations_mig (usr_id_owner, mig_name, mig_type, mig_status, created_by, updated_by)
                    VALUES (?, ?, 'MIGRATION', ?, 'system', 'system')
                    RETURNING mig_id
                """, [testUserId, "${TEST_DATA_PREFIX}Migration_Controls", migrationStatusId])
                testMigrationId = migrationResult?.mig_id as UUID
                createdMigrations.add(testMigrationId)
                
                // Create test master plan
                def planResult = sql.firstRow("""
                    INSERT INTO plans_master_plm (tms_id, plm_name, plm_description, plm_status, created_by, updated_by)
                    VALUES (?, ?, 'Test plan for control integration', ?, 'system', 'system')
                    RETURNING plm_id
                """, [testTeamId, "${TEST_DATA_PREFIX}Plan_Controls", planStatusId])
                testMasterPlanId = planResult?.plm_id as UUID
                createdPlans.add(testMasterPlanId)
                
                // Create test iteration
                def iterationResult = sql.firstRow("""
                    INSERT INTO iterations_ite (mig_id, plm_id, itt_code, ite_name, ite_description, ite_status, created_by, updated_by)
                    VALUES (?, ?, 'CUTOVER', ?, 'Test iteration for controls', ?, 'system', 'system')
                    RETURNING ite_id
                """, [testMigrationId, testMasterPlanId, "${TEST_DATA_PREFIX}Iteration_Controls", iterationStatusId])
                testIterationId = iterationResult?.ite_id as UUID
                
                // Create test plan instance
                def planInstanceResult = sql.firstRow("""
                    INSERT INTO plans_instance_pli (plm_id, ite_id, usr_id_owner, pli_name, pli_description, pli_status, created_by, updated_by)
                    VALUES (?, ?, ?, ?, 'Instance for control testing', ?, 'system', 'system')
                    RETURNING pli_id
                """, [testMasterPlanId, testIterationId, testUserId, "${TEST_DATA_PREFIX}PlanInstance_Controls", planStatusId])
                testPlanInstanceId = planInstanceResult?.pli_id as UUID
                
                // Create test master sequence
                def sequenceResult = sql.firstRow("""
                    INSERT INTO sequences_master_sqm (plm_id, sqm_name, sqm_description, sqm_order, created_by, updated_by)
                    VALUES (?, ?, 'Sequence for control testing', 1, 'system', 'system')
                    RETURNING sqm_id
                """, [testMasterPlanId, "${TEST_DATA_PREFIX}Sequence_Controls"])
                testMasterSequenceId = sequenceResult?.sqm_id as UUID
                createdSequences.add(testMasterSequenceId)
                
                // Create test sequence instance
                def sequenceInstanceResult = sql.firstRow("""
                    INSERT INTO sequences_instance_sqi (sqm_id, pli_id, sqi_name, sqi_description, sqi_order, sqi_status, created_by, updated_by)
                    VALUES (?, ?, ?, 'Instance for control testing', 1, ?, 'system', 'system')
                    RETURNING sqi_id
                """, [testMasterSequenceId, testPlanInstanceId, "${TEST_DATA_PREFIX}SequenceInstance_Controls", sequenceStatusId])
                testSequenceInstanceId = sequenceInstanceResult?.sqi_id as Integer
                
                // Create test master phase
                def phaseResult = sql.firstRow("""
                    INSERT INTO phases_master_phm (sqm_id, phm_name, phm_description, phm_order, created_by, updated_by)
                    VALUES (?, ?, 'Phase for control testing', 1, 'system', 'system')
                    RETURNING phm_id
                """, [testMasterSequenceId, "${TEST_DATA_PREFIX}Phase_Controls"])
                testMasterPhaseId = phaseResult?.phm_id as UUID
                createdPhases.add(testMasterPhaseId)
                
                // Create test phase instance
                def phaseInstanceResult = sql.firstRow("""
                    INSERT INTO phases_instance_phi (phm_id, sqi_id, phi_name, phi_description, phi_order, phi_status, created_by, updated_by)
                    VALUES (?, ?, ?, 'Instance for control testing', 1, ?, 'system', 'system')
                    RETURNING phi_id
                """, [testMasterPhaseId, testSequenceInstanceId, "${TEST_DATA_PREFIX}PhaseInstance_Controls", phaseStatusId])
                testPhaseInstanceId = phaseInstanceResult?.phi_id as UUID
                
            } catch (Exception e) {
                throw new RuntimeException("Failed to setup controls test data: ${e.message}", e)
            }
        }
        
        logProgress("Controls test data hierarchy created successfully")
    }
    
    /**
     * Test 1: Create Master Control
     */
    void testCreateMasterControl() {
        logProgress("Testing master control creation")
        
        def testControlMasterData = [
            phm_id: testMasterPhaseId.toString(),
            ctm_name: "${TEST_DATA_PREFIX}Control_Master",
            ctm_description: "Control created by integration test",
            ctm_type: "TECHNICAL",
            ctm_is_critical: true
        ]
        
        HttpResponse response = httpClient.post("/controls/master", testControlMasterData)
        
        validateApiSuccess(response, 201)
        
        def responseData = response.jsonBody as Map
        assert (responseData.ctm_name as String) == testControlMasterData.ctm_name
        assert (responseData.phm_id as String) == testMasterPhaseId.toString()
        assert (responseData.ctm_type as String) == "TECHNICAL"
        assert (responseData.ctm_is_critical as Boolean) == true
        
        testControlMasterId = UUID.fromString(responseData.ctm_id as String)
        
        logProgress("Master control created successfully: ${testControlMasterId}")
    }
    
    /**
     * Test 2: Get All Master Controls
     */
    void testGetAllMasterControls() {
        logProgress("Testing retrieval of all master controls")
        
        HttpResponse response = httpClient.get("/controls/master")
        
        validateApiSuccess(response)
        
        def responseData = response.jsonBody
        assert responseData instanceof List
        
        def createdControl = responseData.find { ((it as Map).ctm_id as String) == testControlMasterId.toString() }
        assert createdControl != null : "Created control should be found in master controls list"
        assert ((createdControl as Map).ctm_name as String).contains(TEST_DATA_PREFIX)
        
        logProgress("Retrieved ${responseData.size()} master controls successfully")
    }
    
    /**
     * Test 3: Get Master Control by ID
     */
    void testGetMasterControlById() {
        logProgress("Testing retrieval of master control by ID")
        
        HttpResponse response = httpClient.get("/controls/master/${testControlMasterId}")
        
        validateApiSuccess(response)
        
        def responseData = response.jsonBody as Map
        assert (responseData.ctm_id as String) == testControlMasterId.toString()
        assert (responseData.ctm_name as String).contains(TEST_DATA_PREFIX)
        assert (responseData.ctm_type as String) == "TECHNICAL"
        assert (responseData.phm_id as String) == testMasterPhaseId.toString()
        
        logProgress("Master control retrieved by ID successfully")
    }
    
    /**
     * Test 4: Update Master Control
     */
    void testUpdateMasterControl() {
        logProgress("Testing master control update")
        
        def updateData = [
            ctm_name: "${TEST_DATA_PREFIX}Control_Updated",
            ctm_description: "Updated control description",
            ctm_is_critical: false
        ]
        
        HttpResponse response = httpClient.put("/controls/master/${testControlMasterId}", updateData)
        
        validateApiSuccess(response)
        
        def responseData = response.jsonBody as Map
        assert (responseData.ctm_name as String) == updateData.ctm_name
        assert (responseData.ctm_description as String) == updateData.ctm_description
        assert (responseData.ctm_is_critical as Boolean) == false
        
        logProgress("Master control updated successfully")
    }
    
    /**
     * Test 5: Create Control Instance
     */
    void testCreateControlInstance() {
        logProgress("Testing control instance creation")
        
        def instanceData = [
            ctm_id: testControlMasterId.toString(),
            phi_id: testPhaseInstanceId.toString(),
            cti_name: "${TEST_DATA_PREFIX}Control_Instance",
            cti_description: "Instance created by integration test",
            cti_type: "TECHNICAL",
            cti_status: "PENDING"
        ]
        
        HttpResponse response = httpClient.post("/controls/instance", instanceData)
        
        validateApiSuccess(response, 201)
        
        def responseData = response.jsonBody as Map
        assert (responseData.ctm_id as String) == testControlMasterId.toString()
        assert (responseData.phi_id as String) == testPhaseInstanceId.toString()
        assert (responseData.cti_name as String) == instanceData.cti_name
        assert (responseData.cti_type as String) == "TECHNICAL"
        
        testControlInstanceId = UUID.fromString(responseData.cti_id as String)
        
        logProgress("Control instance created successfully: ${testControlInstanceId}")
    }
    
    /**
     * Test 6: Get Control Instances with Filtering
     */
    void testGetControlInstancesWithFiltering() {
        logProgress("Testing filtered retrieval of control instances")
        
        HttpResponse response = httpClient.get("/controls", ["phaseInstanceId": testPhaseInstanceId.toString()])
        
        validateApiSuccess(response)
        
        def responseData = response.jsonBody
        assert responseData instanceof List
        
        def createdInstance = responseData.find { ((it as Map).cti_id as String) == testControlInstanceId.toString() }
        assert createdInstance != null : "Created control instance should be found in filtered list"
        assert ((createdInstance as Map).cti_name as String).contains(TEST_DATA_PREFIX)
        
        logProgress("Filtered control instances retrieved successfully")
    }
    
    /**
     * Test 7: Get Control Instance by ID
     */
    void testGetControlInstanceById() {
        logProgress("Testing retrieval of control instance by ID")
        
        HttpResponse response = httpClient.get("/controls/instance/${testControlInstanceId}")
        
        validateApiSuccess(response)
        
        def responseData = response.jsonBody as Map
        assert (responseData.cti_id as String) == testControlInstanceId.toString()
        assert (responseData.cti_name as String).contains(TEST_DATA_PREFIX)
        assert (responseData.ctm_id as String) == testControlMasterId.toString()
        
        logProgress("Control instance retrieved by ID successfully")
    }
    
    /**
     * Test 8: Update Control Instance
     */
    void testUpdateControlInstance() {
        logProgress("Testing control instance update")
        
        def updateData = [
            cti_name: "${TEST_DATA_PREFIX}Control_Instance_Updated",
            cti_description: "Updated instance description",
            cti_status: "IN_PROGRESS"
        ]
        
        HttpResponse response = httpClient.put("/controls/instance/${testControlInstanceId}", updateData)
        
        validateApiSuccess(response)
        
        def responseData = response.jsonBody as Map
        assert (responseData.cti_name as String) == updateData.cti_name
        assert (responseData.cti_description as String) == updateData.cti_description
        
        logProgress("Control instance updated successfully")
    }
    
    /**
     * Test 9: Validate Control Point
     */
    void testValidateControlPoint() {
        logProgress("Testing control point validation")
        
        def validationData = [
            validation_result: "PASSED",
            validation_notes: "Test validation notes from integration test"
        ]
        
        HttpResponse response = httpClient.post("/controls/instance/${testControlInstanceId}/validate", validationData)
        
        validateApiSuccess(response)
        
        def responseData = response.jsonBody as Map
        assert (responseData.success as Boolean) == true : "Validation should succeed"
        
        logProgress("Control point validation completed successfully")
    }
    
    /**
     * Test 10: Error Handling - Invalid UUID
     */
    void testErrorHandlingInvalidUuid() {
        logProgress("Testing error handling for invalid UUID")
        
        HttpResponse response = httpClient.get("/controls/master/invalid-uuid")
        
        validateApiError(response, 400)
        
        logProgress("Invalid UUID error handling validated")
    }
    
    /**
     * Test 11: Error Handling - Not Found
     */
    void testErrorHandlingNotFound() {
        logProgress("Testing error handling for non-existent control")
        
        UUID randomId = UUID.randomUUID()
        HttpResponse response = httpClient.get("/controls/master/${randomId}")
        
        validateApiError(response, 404)
        
        logProgress("Not found error handling validated")
    }
    
    /**
     * Test 12: Master Control Deletion
     */
    void testDeleteMasterControl() {
        logProgress("Testing master control deletion")
        
        // First delete the instance to avoid foreign key constraint
        if (testControlInstanceId) {
            HttpResponse deleteInstanceResponse = httpClient.delete("/controls/instance/${testControlInstanceId}")
            validateApiSuccess(deleteInstanceResponse, 204)
            logProgress("Control instance deleted before master")
        }
        
        HttpResponse response = httpClient.delete("/controls/master/${testControlMasterId}")
        
        validateApiSuccess(response, 204)
        
        // Verify deletion by trying to get the control
        HttpResponse getResponse = httpClient.get("/controls/master/${testControlMasterId}")
        validateApiError(getResponse, 404)
        
        logProgress("Master control deletion validated")
    }
    
    /**
     * Custom cleanup for controls-specific test data
     */
    @Override
    def cleanup() {
        logProgress("Cleaning up controls test data")
        
        try {
            // Clean up control instances and masters manually if they exist
            DatabaseUtil.withSql { sql ->
                if (testControlInstanceId) {
                    sql.execute("DELETE FROM controls_instance_cti WHERE cti_id = ?", [testControlInstanceId])
                }
                if (testControlMasterId) {
                    sql.execute("DELETE FROM controls_master_ctm WHERE ctm_id = ?", [testControlMasterId])
                }
                if (testPhaseInstanceId) {
                    sql.execute("DELETE FROM phases_instance_phi WHERE phi_id = ?", [testPhaseInstanceId])
                }
                if (testSequenceInstanceId) {
                    sql.execute("DELETE FROM sequences_instance_sqi WHERE sqi_id = ?", [testSequenceInstanceId])
                }
                if (testPlanInstanceId) {
                    sql.execute("DELETE FROM plans_instance_pli WHERE pli_id = ?", [testPlanInstanceId])
                }
                if (testIterationId) {
                    sql.execute("DELETE FROM iterations_ite WHERE ite_id = ?", [testIterationId])
                }
            }
        } catch (Exception e) {
            println "⚠️ Error during controls-specific cleanup: ${e.message}"
        }
        
        // Call parent cleanup for standard cleanup
        super.cleanup()
    }
    
    /**
     * Main test execution method - runs all tests in sequence
     */
    void runAllTests() {
        try {
            testCreateMasterControl()
            testGetAllMasterControls()
            testGetMasterControlById()
            testUpdateMasterControl()
            testCreateControlInstance()
            testGetControlInstancesWithFiltering()
            testGetControlInstanceById()
            testUpdateControlInstance()
            testValidateControlPoint()
            testErrorHandlingInvalidUuid()
            testErrorHandlingNotFound()
            testDeleteMasterControl()
            
            println "\n============================================"
            println "✅ All Controls API integration tests passed!"
            println "============================================"
            
        } catch (Exception e) {
            println "\n❌ Controls API integration test failed: ${e.class.simpleName}: ${e.message}"
            throw e
        }
    }
}