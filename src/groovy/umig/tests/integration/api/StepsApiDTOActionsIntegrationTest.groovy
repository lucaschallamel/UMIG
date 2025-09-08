package umig.tests.integration.api

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import umig.tests.utils.BaseIntegrationTest
import umig.tests.utils.IntegrationTestHttpClient
import umig.tests.utils.HttpResponse
import umig.repository.StepRepository
import umig.repository.PhaseRepository
import umig.repository.TeamRepository
import umig.utils.DatabaseUtil
import javax.ws.rs.core.Response

/**
 * Integration tests for StepsApi DTO action endpoints
 * Added for US-056C Phase 2 API integration
 * 
 * Tests POST/PUT/DELETE endpoints with DTO pattern:
 * - POST /steps/master
 * - PUT /steps/master/{id}
 * - DELETE /steps/master/{id}
 * 
 * Following UMIG patterns:
 * - BaseIntegrationTest framework (US-037)
 * - Real database connections
 * - End-to-end validation
 * - Performance benchmarking
 * - ADR-031 explicit type casting
 * - ADR-043 type safety requirements
 */
class StepsApiDTOActionsIntegrationTest extends BaseIntegrationTest {
    
    private static final String STEPS_ENDPOINT = "/rest/scriptrunner/latest/custom/steps"
    
    private StepRepository stepRepository
    private PhaseRepository phaseRepository
    private TeamRepository teamRepository
    private IntegrationTestHttpClient httpClient
    private JsonSlurper jsonSlurper
    private UUID testPhaseId
    private Integer testTeamId
    private UUID createdStepId
    
    def setup() {
        super.setup()
        
        stepRepository = new StepRepository()
        phaseRepository = new PhaseRepository()
        teamRepository = new TeamRepository()
        httpClient = new IntegrationTestHttpClient()
        jsonSlurper = new JsonSlurper()
        
        // Create test data prerequisites
        createTestPrerequisites()
    }
    
    def cleanup() {
        // Clean up created test data
        if (createdStepId) {
            try {
                stepRepository.deleteMaster(createdStepId)
            } catch (Exception e) {
                // Ignore cleanup errors
            }
        }
        
        super.cleanup()
    }
    
    /**
     * Test POST /steps/master - Create new step master with DTO
     */
    def testCreateStepMaster_Success() {
        logProgress("Testing POST /steps/master - Create new step master with DTO")
        
        try {
            // Given: Valid step master data
            def stepData = [
                phm_id: testPhaseId.toString(),
                tms_id_owner: testTeamId.toString(),
                stt_code: 'CUTOVER',
                stm_number: '999',
                stm_name: 'Integration Test Step Master',
                stm_description: 'Created via US-056C Phase 2 integration test',
                stm_duration_minutes: '120',
                enr_id_target: '1',
                enr_id: '2'
            ]
            
            // When: POST request to create step master
            def response = httpClient.post("${STEPS_ENDPOINT}/master", stepData)
            
            // Then: Step is created successfully
            validateApiSuccess(response, Response.Status.CREATED.statusCode)
            
            def responseData = jsonSlurper.parseText(response.body) as Map
            assert responseData.stepMasterId != null : "Response should contain stepMasterId"
            assert responseData.stepTypeCode as String == 'CUTOVER' : "Step type should be CUTOVER"
            assert responseData.stepNumber as Integer == 999 : "Step number should be 999"
            assert responseData.stepName as String == 'Integration Test Step Master' : "Step name should match"
            
            // Store for cleanup (ADR-031 explicit casting)
            createdStepId = UUID.fromString(responseData.stepMasterId as String)
            
            // Verify in database
            def dbStep = stepRepository.findMasterByIdAsDTO(createdStepId)
            assert dbStep != null : "Step should exist in database"
            assert dbStep.stepName as String == 'Integration Test Step Master' : "Database step name should match"
            
            logProgress("✅ Test passed: POST /steps/master creates step successfully")
        } catch (Exception e) {
            logProgress("❌ Test failed: POST /steps/master - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test POST /steps/master - Missing required fields
     */
    def testCreateStepMaster_MissingRequiredFields() {
        logProgress("Testing POST /steps/master - Missing required fields")
        
        try {
            // Given: Step data missing required fields
            def stepData = [
                phm_id: testPhaseId.toString(),
                stm_name: 'Incomplete Step'
                // Missing: tms_id_owner, stt_code, stm_number, enr_id_target
            ]
            
            // When: POST request with incomplete data
            def response = httpClient.post("${STEPS_ENDPOINT}/master", stepData)
            
            // Then: Bad request response
            validateApiError(response, Response.Status.BAD_REQUEST.statusCode)
            
            def responseData = jsonSlurper.parseText(response.body) as Map
            assert responseData.error as String != null : "Response should contain error message"
            assert (responseData.error as String).contains('Missing required fields') : "Error should mention missing fields"
            
            logProgress("✅ Test passed: POST /steps/master validates required fields")
        } catch (Exception e) {
            logProgress("❌ Test failed: POST /steps/master validation - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test PUT /steps/master/{id} - Update existing step master
     */
    def testUpdateStepMaster_Success() {
        logProgress("Testing PUT /steps/master/{id} - Update existing step master")
        
        try {
            // Given: Create a step master first
            def initialData = [
                phm_id: testPhaseId.toString(),
                tms_id_owner: testTeamId.toString(),
                stt_code: 'PREPARATION',
                stm_number: '888',
                stm_name: 'Original Step Name',
                stm_description: 'Original Description',
                stm_duration_minutes: '60',
                enr_id_target: '1',
                enr_id: '2'
            ]
            
            def createdDTO = stepRepository.createMasterFromDTO(initialData)
            createdStepId = UUID.fromString(createdDTO.stepMasterId as String)
            
            // Update data
            def updateData = [
                stm_name: 'Updated Step Name via DTO',
                stm_description: 'Updated Description via US-056C Phase 2',
                stm_duration_minutes: '180'
            ]
            
            // When: PUT request to update step master
            def response = httpClient.put("${STEPS_ENDPOINT}/master/${createdStepId}", updateData)
            
            // Then: Step is updated successfully
            validateApiSuccess(response, Response.Status.OK.statusCode)
            
            def responseData = jsonSlurper.parseText(response.body) as Map
            assert responseData.stepMasterId as String == createdStepId.toString() : "Step master ID should match"
            assert responseData.stepName as String == 'Updated Step Name via DTO' : "Step name should be updated"
            assert responseData.stepDescription as String == 'Updated Description via US-056C Phase 2' : "Step description should be updated"
            
            // Verify in database
            def dbStep = stepRepository.findMasterByIdAsDTO(createdStepId)
            assert dbStep.stepName as String == 'Updated Step Name via DTO' : "Database step name should be updated"
            
            logProgress("✅ Test passed: PUT /steps/master/{id} updates step successfully")
        } catch (Exception e) {
            logProgress("❌ Test failed: PUT /steps/master/{id} - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test PUT /steps/master/{id} - Step not found
     */
    def testUpdateStepMaster_NotFound() {
        logProgress("Testing PUT /steps/master/{id} - Step not found")
        
        try {
            // Given: Non-existent step ID
            def nonExistentId = UUID.randomUUID()
            def updateData = [stm_name: 'Should Fail']
            
            // When: PUT request to non-existent step
            def response = httpClient.put("${STEPS_ENDPOINT}/master/${nonExistentId}", updateData)
            
            // Then: Not found response
            validateApiError(response, Response.Status.BAD_REQUEST.statusCode)
            
            def responseData = jsonSlurper.parseText(response.body) as Map
            assert responseData.error as String != null : "Response should contain error message"
            assert (responseData.error as String).contains('Step master not found') : "Error should mention step not found"
            
            logProgress("✅ Test passed: PUT /steps/master/{id} handles not found correctly")
        } catch (Exception e) {
            logProgress("❌ Test failed: PUT /steps/master/{id} not found - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test DELETE /steps/master/{id} - Delete step master
     */
    def testDeleteStepMaster_Success() {
        logProgress("Testing DELETE /steps/master/{id} - Delete step master")
        
        try {
            // Given: Create a step master first
            def stepData = [
                phm_id: testPhaseId.toString(),
                tms_id_owner: testTeamId.toString(),
                stt_code: 'VALIDATION',
                stm_number: '777',
                stm_name: 'Step to Delete',
                stm_description: 'Will be deleted',
                stm_duration_minutes: '30',
                enr_id_target: '1',
                enr_id: '2'
            ]
            
            def createdDTO = stepRepository.createMasterFromDTO(stepData)
            def stepIdToDelete = UUID.fromString(createdDTO.stepMasterId as String)
            
            // When: DELETE request
            def response = httpClient.delete("${STEPS_ENDPOINT}/master/${stepIdToDelete}")
            
            // Then: Step is deleted successfully
            validateApiSuccess(response, Response.Status.NO_CONTENT.statusCode)
            
            // Verify deleted from database
            def deletedStep = DatabaseUtil.withSql { sql ->
                sql.firstRow(
                    'SELECT * FROM steps_master_stm WHERE stm_id = ?',
                    [stepIdToDelete]
                )
            }
            assert deletedStep == null : "Step should be deleted from database"
            
            logProgress("✅ Test passed: DELETE /steps/master/{id} deletes step successfully")
        } catch (Exception e) {
            logProgress("❌ Test failed: DELETE /steps/master/{id} - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test DELETE /steps/master/{id} - Cannot delete with active instances
     */
    def testDeleteStepMaster_WithActiveInstances() {
        logProgress("Testing DELETE /steps/master/{id} - Cannot delete with active instances")
        
        try {
            // Given: Create a step master with an instance
            def stepData = [
                phm_id: testPhaseId.toString(),
                tms_id_owner: testTeamId.toString(),
                stt_code: 'CUTOVER',
                stm_number: '666',
                stm_name: 'Step with Instances',
                stm_description: 'Has active instances',
                stm_duration_minutes: '45',
                enr_id_target: '1',
                enr_id: '2'
            ]
            
            def createdDTO = stepRepository.createMasterFromDTO(stepData)
            createdStepId = UUID.fromString(createdDTO.stepMasterId as String)
            
            // Create an instance for this master
            DatabaseUtil.withSql { sql ->
                def instanceId = UUID.randomUUID()
                sql.execute('''
                    INSERT INTO steps_instance_sti (
                        sti_id, stm_id, phi_id, sti_name, sti_status, 
                        sti_is_active, sti_created_date, sti_last_modified_date
                    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ''', [instanceId, createdStepId, null, 'Test Instance', 'PENDING', true])
            }
            
            // When: Attempt to delete step with instances
            def response = httpClient.delete("${STEPS_ENDPOINT}/master/${createdStepId}")
            
            // Then: Conflict response
            validateApiError(response, Response.Status.CONFLICT.statusCode)
            
            def responseData = jsonSlurper.parseText(response.body) as Map
            assert responseData.error as String != null : "Response should contain error message"
            assert (responseData.error as String).contains('Cannot delete step master') : "Error should mention cannot delete step master"
            assert (responseData.error as String).contains('active instances') : "Error should mention active instances"
            
            // Clean up instance for cleanup method
            DatabaseUtil.withSql { sql ->
                sql.execute('DELETE FROM steps_instance_sti WHERE stm_id = ?', [createdStepId])
            }
            
            logProgress("✅ Test passed: DELETE /steps/master/{id} prevents deletion with active instances")
        } catch (Exception e) {
            logProgress("❌ Test failed: DELETE /steps/master/{id} with instances - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test DELETE /steps/master/{id} - Step not found
     */
    def testDeleteStepMaster_NotFound() {
        logProgress("Testing DELETE /steps/master/{id} - Step not found")
        
        try {
            // Given: Non-existent step ID
            def nonExistentId = UUID.randomUUID()
            
            // When: DELETE request to non-existent step
            def response = httpClient.delete("${STEPS_ENDPOINT}/master/${nonExistentId}")
            
            // Then: Not found response
            validateApiError(response, Response.Status.NOT_FOUND.statusCode)
            
            def responseData = jsonSlurper.parseText(response.body) as Map
            assert responseData.error as String != null : "Response should contain error message"
            assert (responseData.error as String).contains('Step master not found') : "Error should mention step master not found"
            
            logProgress("✅ Test passed: DELETE /steps/master/{id} handles not found correctly")
        } catch (Exception e) {
            logProgress("❌ Test failed: DELETE /steps/master/{id} not found - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test end-to-end workflow: Create, Update, Delete
     */
    def testCompleteLifecycle() {
        logProgress("Testing complete lifecycle: Create, Update, Delete")
        
        try {
            // Step 1: Create
            def createData = [
                phm_id: testPhaseId.toString(),
                tms_id_owner: testTeamId.toString(),
                stt_code: 'CUTOVER',
                stm_number: '555',
                stm_name: 'Lifecycle Test Step',
                stm_description: 'Testing complete lifecycle',
                stm_duration_minutes: '90',
                enr_id_target: '1',
                enr_id: '2'
            ]
            
            def createResponse = httpClient.post("${STEPS_ENDPOINT}/master", createData)
            validateApiSuccess(createResponse, Response.Status.CREATED.statusCode)
            
            def createdStep = jsonSlurper.parseText(createResponse.body) as Map
            def stepId = createdStep.stepMasterId as String
            
            // Step 2: Update
            def updateData = [
                stm_name: 'Lifecycle Test - Updated',
                stm_duration_minutes: '120'
            ]
            
            def updateResponse = httpClient.put("${STEPS_ENDPOINT}/master/${stepId}", updateData)
            validateApiSuccess(updateResponse, Response.Status.OK.statusCode)
            
            def updatedStep = jsonSlurper.parseText(updateResponse.body) as Map
            assert updatedStep.stepName as String == 'Lifecycle Test - Updated' : "Step name should be updated"
            
            // Step 3: Delete
            def deleteResponse = httpClient.delete("${STEPS_ENDPOINT}/master/${stepId}")
            validateApiSuccess(deleteResponse, Response.Status.NO_CONTENT.statusCode)
            
            // Verify deletion
            def verifyDeleted = DatabaseUtil.withSql { sql ->
                sql.firstRow('SELECT * FROM steps_master_stm WHERE stm_id = ?', 
                    [UUID.fromString(stepId)])
            }
            assert verifyDeleted == null : "Step should be deleted from database"
            
            logProgress("✅ Test passed: Complete lifecycle test completed successfully")
        } catch (Exception e) {
            logProgress("❌ Test failed: Complete lifecycle - ${e.message}")
            throw e
        }
    }
    
    // ========================================
    // Helper Methods
    // ========================================
    
    private void createTestPrerequisites() {
        DatabaseUtil.withSql { sql ->
            // Find or create a test phase
            def phase = sql.firstRow('''
                SELECT phm.phm_id 
                FROM phases_master_phm phm
                JOIN sequences_master_sqm sqm ON phm.sqm_id = sqm.sqm_id
                JOIN plans_master_plm plm ON sqm.plm_id = plm.plm_id
                LIMIT 1
            ''')
            
            if (phase) {
                testPhaseId = phase.phm_id as UUID
            } else {
                // Create minimal test data hierarchy
                def planId = UUID.randomUUID()
                sql.execute('''
                    INSERT INTO plans_master_plm (plm_id, plm_name, plm_description)
                    VALUES (?, ?, ?)
                ''', [planId, 'Test Plan for US-056C', 'Integration test plan'])
                
                def sequenceId = UUID.randomUUID()
                sql.execute('''
                    INSERT INTO sequences_master_sqm (sqm_id, plm_id, sqm_name, sqm_description)
                    VALUES (?, ?, ?, ?)
                ''', [sequenceId, planId, 'Test Sequence', 'Integration test sequence'])
                
                testPhaseId = UUID.randomUUID()
                sql.execute('''
                    INSERT INTO phases_master_phm (phm_id, sqm_id, phm_name, phm_description)
                    VALUES (?, ?, ?, ?)
                ''', [testPhaseId, sequenceId, 'Test Phase', 'Integration test phase'])
            }
            
            // Find or create a test team
            def team = sql.firstRow('SELECT tms_id FROM teams_tms LIMIT 1')
            if (team) {
                testTeamId = team.tms_id as Integer
            } else {
                def result = sql.executeInsert('''
                    INSERT INTO teams_tms (tms_name, tms_description)
                    VALUES (?, ?)
                ''', ['Test Team US-056C', 'Integration test team'])
                testTeamId = result[0][0] as Integer
            }
        }
    }
    

}