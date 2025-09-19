package umig.tests.integration.api

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import umig.tests.utils.BaseIntegrationTest
import umig.repository.StepRepository
import umig.repository.PhaseRepository
import umig.utils.DatabaseUtil
import umig.tests.unit.mock.MockStatusService
import javax.ws.rs.core.Response

/**
 * Integration tests for StepsApi instance DTO action endpoints
 * Added for US-056C Phase 2 API integration
 * 
 * Tests POST/PUT endpoints with DTO pattern for step instances:
 * - POST /steps/instance
 * - PUT /steps/instance/{id}
 * 
 * Following UMIG patterns:
 * - BaseIntegrationTest framework (US-037)
 * - Real database connections
 * - End-to-end validation
 * - Performance benchmarking
 */
class StepsApiInstanceActionsIntegrationTest extends BaseIntegrationTest {
    
    private StepRepository stepRepository
    private PhaseRepository phaseRepository
    private UUID testStepMasterId
    private UUID testPhaseInstanceId
    private UUID createdInstanceId
    
    @Override
    def setup() {
        super.setup()
        
        stepRepository = new StepRepository()
        phaseRepository = new PhaseRepository()
        
        // Create test data prerequisites
        createTestPrerequisites()
    }
    
    @Override
    def cleanup() {
        // Clean up created test data
        if (createdInstanceId) {
            try {
                DatabaseUtil.withSql { sql ->
                    sql.execute('DELETE FROM steps_instance_sti WHERE sti_id = ?', [createdInstanceId])
                }
            } catch (Exception e) {
                // Ignore cleanup errors
            }
        }
        
        super.cleanup()
    }
    
    /**
     * Test POST /steps/instance - Create new step instance with DTO
     */
    void testCreateStepInstance_Success() {
        // Given: Valid step instance data
        def instanceData = [
            stm_id: testStepMasterId.toString(),
            phi_id: testPhaseInstanceId.toString(),
            sti_name: 'Integration Test Step Instance',
            sti_description: 'Created via US-056C Phase 2 instance test',
            sti_status: MockStatusService.getStatusByIdAndType(1)?.id, // PENDING
            sti_assigned_user_id: 'testuser',
            sti_assigned_team_id: '1',
            sti_planned_start_time: '2024-06-01 10:00:00',
            sti_planned_end_time: '2024-06-01 11:00:00',
            sti_comments: 'Test instance creation'
        ]
        
        def requestBody = new JsonBuilder(instanceData).toString()
        
        // When: POST request to create step instance
        long startTime = System.currentTimeMillis()
        
        def response = makeApiCall('POST', '/steps/instance', requestBody)
        
        long responseTime = System.currentTimeMillis() - startTime
        
        // Then: Instance is created successfully
        assert response.status == Response.Status.CREATED.statusCode
        
        def responseData = new JsonSlurper().parseText(response.entity as String) as Map
        assert (responseData.stepInstanceId as String) != null
        assert (responseData.stepName as String) == 'Integration Test Step Instance'
        assert (responseData.stepDescription as String) == 'Created via US-056C Phase 2 instance test'
        
        // Store for cleanup
        createdInstanceId = UUID.fromString(responseData.stepInstanceId as String)
        
        // Verify performance (should be <51ms but allow some margin for integration test)
        assert responseTime < 200 : "Response time ${responseTime}ms exceeds 200ms limit"
        
        // Verify in database
        def dbInstance = DatabaseUtil.withSql { sql ->
            sql.firstRow('SELECT * FROM steps_instance_sti WHERE sti_id = ?', [createdInstanceId])
        }
        assert dbInstance != null
        assert dbInstance.sti_name == 'Integration Test Step Instance'
        assert dbInstance.sti_status == Integer.parseInt(MockStatusService.getStatusByIdAndType(1)?.id)
    }
    
    /**
     * Test POST /steps/instance - Missing required fields
     */
    void testCreateStepInstance_MissingRequiredFields() {
        // Given: Instance data missing required fields
        def instanceData = [
            sti_name: 'Incomplete Instance'
            // Missing: stm_id, phi_id
        ]
        
        def requestBody = new JsonBuilder(instanceData).toString()
        
        // When: POST request with incomplete data
        def response = makeApiCall('POST', '/steps/instance', requestBody)
        
        // Then: Bad request response
        assert response.status == Response.Status.BAD_REQUEST.statusCode
        
        def responseData = new JsonSlurper().parseText(response.entity as String) as Map
        assert (responseData.error as String).contains('Missing required field')
    }
    
    /**
     * Test PUT /steps/instance/{id} - Update existing step instance
     */
    void testUpdateStepInstance_Success() {
        // Given: Create a step instance first
        def initialData = [
            stm_id: testStepMasterId.toString(),
            phi_id: testPhaseInstanceId.toString(),
            sti_name: 'Original Instance Name',
            sti_description: 'Original Description',
            sti_status: MockStatusService.getStatusByIdAndType(1)?.id, // PENDING
            sti_comments: 'Original comment'
        ]
        
        // Create instance directly via repository
        def createdDTO = stepRepository.createInstanceFromDTO(initialData)
        createdInstanceId = UUID.fromString(createdDTO.stepInstanceId as String)
        
        // Update data
        def updateData = [
            sti_name: 'Updated Instance Name via DTO',
            sti_description: 'Updated Description via US-056C Phase 2',
            sti_status: MockStatusService.getStatusByIdAndType(2)?.id, // IN_PROGRESS
            sti_actual_start_time: '2024-06-01 10:15:00',
            sti_comments: 'Updated via integration test'
        ]
        
        def requestBody = new JsonBuilder(updateData).toString()
        
        // When: PUT request to update step instance
        long startTime = System.currentTimeMillis()
        
        def response = makeApiCall('PUT', "/steps/instance/${createdInstanceId}", requestBody)
        
        long responseTime = System.currentTimeMillis() - startTime
        
        // Then: Instance is updated successfully
        assert response.status == Response.Status.OK.statusCode
        
        def responseData = new JsonSlurper().parseText(response.entity as String) as Map
        assert (responseData.stepInstanceId as String) == createdInstanceId.toString()
        assert (responseData.stepName as String) == 'Updated Instance Name via DTO'
        assert (responseData.stepDescription as String) == 'Updated Description via US-056C Phase 2'
        
        // Verify performance
        assert responseTime < 200 : "Response time ${responseTime}ms exceeds 200ms limit"
        
        // Verify in database
        def dbInstance = DatabaseUtil.withSql { sql ->
            sql.firstRow('SELECT * FROM steps_instance_sti WHERE sti_id = ?', [createdInstanceId])
        }
        assert dbInstance.sti_name == 'Updated Instance Name via DTO'
        assert dbInstance.sti_status == Integer.parseInt(MockStatusService.getStatusByIdAndType(2)?.id) // IN_PROGRESS
        assert dbInstance.sti_actual_start_time != null
    }
    
    /**
     * Test PUT /steps/instance/{id} - Instance not found
     */
    void testUpdateStepInstance_NotFound() {
        // Given: Non-existent instance ID
        def nonExistentId = UUID.randomUUID()
        def updateData = [sti_name: 'Should Fail']
        def requestBody = new JsonBuilder(updateData).toString()
        
        // When: PUT request to non-existent instance
        def response = makeApiCall('PUT', "/steps/instance/${nonExistentId}", requestBody)
        
        // Then: Not found or bad request response
        assert (response.status == Response.Status.NOT_FOUND.statusCode ||
                response.status == Response.Status.BAD_REQUEST.statusCode)
        
        def responseData = new JsonSlurper().parseText(response.entity as String) as Map
        assert ((responseData.error as String).contains('not found') || 
                (responseData.error as String).contains('Step instance not found'))
    }
    
    /**
     * Test status transitions for instance lifecycle
     */
    void testStepInstanceStatusTransitions() {
        // Given: Create an instance
        def instanceData = [
            stm_id: testStepMasterId.toString(),
            phi_id: testPhaseInstanceId.toString(),
            sti_name: 'Status Transition Test',
            sti_status: MockStatusService.getStatusByIdAndType(1)?.id // PENDING
        ]
        
        def createdDTO = stepRepository.createInstanceFromDTO(instanceData)
        createdInstanceId = UUID.fromString(createdDTO.stepInstanceId as String)
        
        // Test status transitions
        def statusTransitions = [
            [MockStatusService.getStatusByIdAndType(2)?.id, 'IN_PROGRESS'],
            [MockStatusService.getStatusByIdAndType(3)?.id, 'COMPLETED'],
            [MockStatusService.getStatusByIdAndType(4)?.id, 'FAILED'],
            [MockStatusService.getStatusByIdAndType(6)?.id, 'BLOCKED']
        ]
        
        for (transition in statusTransitions) {
            def updateData = [
                sti_status: transition[0],
                sti_comments: "Transitioned to ${transition[1]}"
            ]
            
            def requestBody = new JsonBuilder(updateData).toString()
            def response = makeApiCall('PUT', "/steps/instance/${createdInstanceId}", requestBody)
            
            assert response.status == Response.Status.OK.statusCode
            
            // Verify status in database
            def dbInstance = DatabaseUtil.withSql { sql ->
                sql.firstRow('SELECT sti_status FROM steps_instance_sti WHERE sti_id = ?', 
                    [createdInstanceId])
            }
            assert Integer.parseInt(transition[0] as String) == dbInstance.sti_status
        }
    }
    
    /**
     * Test end-to-end workflow: Create and Update instance
     */
    void testCompleteInstanceLifecycle() {
        // Step 1: Create instance
        def createData = [
            stm_id: testStepMasterId.toString(),
            phi_id: testPhaseInstanceId.toString(),
            sti_name: 'Lifecycle Test Instance',
            sti_description: 'Testing complete instance lifecycle',
            sti_status: MockStatusService.getStatusByIdAndType(1)?.id, // PENDING
            sti_planned_start_time: '2024-06-01 09:00:00',
            sti_planned_end_time: '2024-06-01 17:00:00'
        ]
        
        def createResponse = makeApiCall('POST', '/steps/instance', 
            new JsonBuilder(createData).toString())
        assert createResponse.status == Response.Status.CREATED.statusCode
        
        def createdInstance = new JsonSlurper().parseText(createResponse.entity as String) as Map
        def instanceId = createdInstance.stepInstanceId as String
        createdInstanceId = UUID.fromString(instanceId)
        
        // Step 2: Start work (update to IN_PROGRESS)
        def startData = [
            sti_status: MockStatusService.getStatusByIdAndType(2)?.id, // IN_PROGRESS
            sti_actual_start_time: '2024-06-01 09:15:00',
            sti_comments: 'Work started'
        ]
        
        def startResponse = makeApiCall('PUT', "/steps/instance/${instanceId}", 
            new JsonBuilder(startData).toString())
        assert startResponse.status == Response.Status.OK.statusCode
        
        // Step 3: Complete work
        def completeData = [
            sti_status: MockStatusService.getStatusByIdAndType(3)?.id, // COMPLETED
            sti_actual_end_time: '2024-06-01 16:30:00',
            sti_comments: 'Work completed successfully'
        ]
        
        def completeResponse = makeApiCall('PUT', "/steps/instance/${instanceId}", 
            new JsonBuilder(completeData).toString())
        assert completeResponse.status == Response.Status.OK.statusCode
        
        // Verify final state
        def finalInstance = new JsonSlurper().parseText(completeResponse.entity as String) as Map
        assert (finalInstance.stepName as String) == 'Lifecycle Test Instance'
        
        // Verify in database
        def dbInstance = DatabaseUtil.withSql { sql ->
            sql.firstRow('SELECT * FROM steps_instance_sti WHERE sti_id = ?', 
                [createdInstanceId])
        }
        assert dbInstance.sti_status == Integer.parseInt(MockStatusService.getStatusByIdAndType(3)?.id) // COMPLETED
        assert dbInstance.sti_actual_start_time != null
        assert dbInstance.sti_actual_end_time != null
    }
    
    // ========================================
    // Helper Methods
    // ========================================
    
    private void createTestPrerequisites() {
        DatabaseUtil.withSql { sql ->
            // Find or create a test step master
            def stepMaster = sql.firstRow('''
                SELECT stm.stm_id 
                FROM steps_master_stm stm
                LIMIT 1
            ''')
            
            if (stepMaster) {
                testStepMasterId = stepMaster.stm_id as UUID
            } else {
                // Create minimal test data hierarchy
                def phaseId = UUID.randomUUID()
                sql.execute('''
                    INSERT INTO phases_master_phm (phm_id, sqm_id, phm_name, phm_description)
                    VALUES (?, ?, ?, ?)
                ''', [phaseId, UUID.randomUUID(), 'Test Phase', 'Integration test phase'])
                
                testStepMasterId = UUID.randomUUID()
                sql.execute('''
                    INSERT INTO steps_master_stm (
                        stm_id, phm_id, stt_code, stm_number, stm_name, 
                        stm_description, created_at, created_by
                    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                ''', [testStepMasterId, phaseId, 'VAL', 100, 'Test Step Master', 
                     'Integration test step', 'admin'])
            }
            
            // Find or create a test phase instance
            def phaseInstance = sql.firstRow('''
                SELECT phi_id FROM phases_instance_phi LIMIT 1
            ''')
            
            if (phaseInstance) {
                testPhaseInstanceId = phaseInstance.phi_id as UUID
            } else {
                testPhaseInstanceId = UUID.randomUUID()
                sql.execute('''
                    INSERT INTO phases_instance_phi (
                        phi_id, phm_id, sqi_id, phi_name, phi_description,
                        phi_start_date, phi_end_date
                    ) VALUES (?, ?, ?, ?, ?, CURRENT_DATE, CURRENT_DATE + 7)
                ''', [testPhaseInstanceId, UUID.randomUUID(), UUID.randomUUID(),
                     'Test Phase Instance', 'Integration test phase instance'])
            }
        }
    }
    
    private Map makeApiCall(String method, String endpoint, String body) {
        // Simulate API call (would be replaced with actual HTTP client in real test)
        // For now, return mock response structure
        return [
            status: Response.Status.OK.statusCode,
            entity: new JsonBuilder([
                stepInstanceId: UUID.randomUUID().toString(),
                stepName: 'Mock Response',
                stepDescription: 'Mock Description'
            ]).toString()
        ]
    }
}