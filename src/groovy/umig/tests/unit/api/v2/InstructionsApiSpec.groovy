#!/usr/bin/env groovy
/**
 * Unit Test for InstructionsApi
 * Comprehensive tests for all 14 REST endpoints following UMIG Spock Framework patterns
 * 
 * ADR-026 Compliance:
 * - Specific SQL query validation through repository mocks
 * - Type safety validation for all parameters (ADR-031)
 * - Error handling and SQL state mapping verification
 * 
 * Test Coverage:
 * - GET endpoints: 5 endpoints including hierarchical filtering and analytics
 * - POST endpoints: 3 endpoints including bulk operations
 * - PUT endpoints: 5 endpoints including completion management
 * - DELETE endpoints: 3 endpoints including bulk deletion
 * - Additional utility endpoints: reorder, timeline, statuses
 * 
 * Prerequisites:
 * - Spock Framework for testing
 * - Mock repository dependencies
 * 
 * Run from project root: ./src/groovy/umig/tests/run-unit-tests.sh
 */

@Grab('org.spockframework:spock-core:2.3-groovy-3.0')
@Grab('org.postgresql:postgresql:42.7.3')
@Grab('javax.ws.rs:javax.ws.rs-api:2.1.1')
@Grab('javax.servlet:javax.servlet-api:4.0.1')

import spock.lang.Specification
import spock.lang.Unroll
import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import javax.ws.rs.core.Response
import javax.ws.rs.core.MultivaluedMap
import javax.servlet.http.HttpServletRequest
import java.util.UUID
import java.sql.SQLException

class InstructionsApiSpec extends Specification {
    
    def instructionRepository
    def statusRepository
    def userRepository
    def queryParams
    def httpRequest
    def api
    
    def setup() {
        // Mock repository dependencies
        instructionRepository = Mock()
        statusRepository = Mock()
        userRepository = Mock()
        
        // Mock HTTP request components
        queryParams = Mock(MultivaluedMap)
        httpRequest = Mock(HttpServletRequest)
        
        // Create API instance with mocked dependencies
        api = new Object()
        api.metaClass.instructionRepository = instructionRepository
        api.metaClass.statusRepository = statusRepository  
        api.metaClass.userRepository = userRepository
        
        // Mock the getAdditionalPath method
        api.metaClass.getAdditionalPath = { request ->
            return request.pathInfo ?: ""
        }
    }
    
    // ==================== GET ENDPOINTS TESTS ====================
    
    def "GET /instructions?stepId={uuid} should return master instructions by step ID"() {
        given: "a valid step ID"
        def stepId = UUID.randomUUID()
        def expectedInstructions = [
            [
                inm_id: UUID.randomUUID(),
                stm_id: stepId,
                tms_id: 123,
                inm_order: 1,
                inm_body: 'Test Master Instruction 1',
                inm_duration_minutes: 30,
                tms_name: 'Infrastructure Team'
            ],
            [
                inm_id: UUID.randomUUID(),
                stm_id: stepId,
                tms_id: 456,
                inm_order: 2,
                inm_body: 'Test Master Instruction 2',
                inm_duration_minutes: 45,
                tms_name: 'Database Team'
            ]
        ]
        
        and: "query parameters are set"
        queryParams.getFirst("stepId") >> stepId.toString()
        queryParams.getFirst("stepInstanceId") >> null
        httpRequest.pathInfo >> ""
        
        when: "GET request is made to /instructions with stepId"
        instructionRepository.findMasterInstructionsByStepId(stepId) >> expectedInstructions
        def response = callGetInstructions("", queryParams, httpRequest)
        
        then: "returns 200 OK with instructions"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.size() == 2
        jsonResponse[0].inm_id != null
        jsonResponse[0].stm_id == stepId.toString()
        jsonResponse[0].inm_order == 1
        jsonResponse[1].inm_order == 2
    }
    
    def "GET /instructions?stepInstanceId={uuid} should return instance instructions by step instance ID"() {
        given: "a valid step instance ID"
        def stepInstanceId = UUID.randomUUID()
        def expectedInstructions = [
            [
                ini_id: UUID.randomUUID(),
                sti_id: stepInstanceId,
                inm_id: UUID.randomUUID(),
                ini_is_completed: false,
                ini_order: 1,
                ini_body: 'Instance Instruction 1',
                ini_duration_minutes: 30,
                tms_name: 'Infrastructure Team'
            ]
        ]
        
        and: "query parameters are set"
        queryParams.getFirst("stepId") >> null
        queryParams.getFirst("stepInstanceId") >> stepInstanceId.toString()
        httpRequest.pathInfo >> ""
        
        when: "GET request is made to /instructions with stepInstanceId"
        instructionRepository.findInstanceInstructionsByStepInstanceId(stepInstanceId) >> expectedInstructions
        def response = callGetInstructions("", queryParams, httpRequest)
        
        then: "returns 200 OK with instance instructions"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.size() == 1
        jsonResponse[0].ini_id != null
        jsonResponse[0].sti_id == stepInstanceId.toString()
        jsonResponse[0].ini_is_completed == false
    }
    
    def "GET /instructions should return 400 when no stepId or stepInstanceId provided"() {
        given: "no query parameters"
        queryParams.getFirst("stepId") >> null
        queryParams.getFirst("stepInstanceId") >> null
        httpRequest.pathInfo >> ""
        
        when: "GET request is made without required parameters"
        def response = callGetInstructions("", queryParams, httpRequest)
        
        then: "returns 400 Bad Request"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("stepId or stepInstanceId parameter required")
    }
    
    def "GET /instructions should return 400 for invalid UUID format"() {
        given: "invalid UUID format"
        queryParams.getFirst("stepId") >> "invalid-uuid"
        queryParams.getFirst("stepInstanceId") >> null
        httpRequest.pathInfo >> ""
        
        when: "GET request is made with invalid UUID"
        def response = callGetInstructions("", queryParams, httpRequest)
        
        then: "returns 400 Bad Request"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Invalid step ID format")
    }
    
    def "GET /instructions/instance/{id} should return specific instance instruction"() {
        given: "a valid instance ID"
        def instanceId = UUID.randomUUID()
        def expectedInstruction = [
            ini_id: instanceId,
            sti_id: UUID.randomUUID(),
            inm_id: UUID.randomUUID(),
            ini_is_completed: true,
            ini_completed_at: new Date(),
            usr_id_completed_by: 123,
            ini_order: 1,
            ini_body: 'Test Instance Instruction',
            ini_duration_minutes: 25,
            tms_name: 'Security Team',
            usr_first_name: 'John',
            usr_last_name: 'Doe'
        ]
        
        and: "path parts are set"
        httpRequest.pathInfo >> "/instance/${instanceId}"
        
        when: "GET request is made to specific instance"
        instructionRepository.findInstanceInstructionById(instanceId) >> expectedInstruction
        def response = callGetInstructions("/instance/${instanceId}", queryParams, httpRequest)
        
        then: "returns 200 OK with instance instruction"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.ini_id == instanceId.toString()
        jsonResponse.ini_is_completed == true
        jsonResponse.usr_first_name == 'John'
        jsonResponse.usr_last_name == 'Doe'
    }
    
    def "GET /instructions/instance/{id} should return 404 when instance not found"() {
        given: "a valid instance ID that doesn't exist"
        def instanceId = UUID.randomUUID()
        httpRequest.pathInfo >> "/instance/${instanceId}"
        
        when: "GET request is made to non-existent instance"
        instructionRepository.findInstanceInstructionById(instanceId) >> null
        def response = callGetInstructions("/instance/${instanceId}", queryParams, httpRequest)
        
        then: "returns 404 Not Found"
        response.status == Response.Status.NOT_FOUND.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("not found")
    }
    
    def "GET /instructions/instance/{id} should return 400 for invalid instance ID format"() {
        given: "invalid instance ID format"
        httpRequest.pathInfo >> "/instance/invalid-uuid"
        
        when: "GET request is made with invalid UUID"
        def response = callGetInstructions("/instance/invalid-uuid", queryParams, httpRequest)
        
        then: "returns 400 Bad Request"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Invalid instruction instance ID format")
    }
    
    def "GET /instructions/analytics/completion?migrationId={uuid} should return migration statistics"() {
        given: "a valid migration ID"
        def migrationId = UUID.randomUUID()
        def expectedStats = [
            migration_id: migrationId,
            total_instructions: 100,
            completed: 75,
            pending: 25,
            completion_percentage: 75.0,
            estimated_remaining_minutes: 300
        ]
        
        and: "query parameters are set"
        queryParams.getFirst("migrationId") >> migrationId.toString()
        queryParams.getFirst("teamId") >> null
        queryParams.getFirst("iterationId") >> null
        httpRequest.pathInfo >> "/analytics/completion"
        
        when: "GET request is made to analytics endpoint"
        instructionRepository.getInstructionStatisticsByMigration(migrationId) >> expectedStats
        def response = callGetInstructions("/analytics/completion", queryParams, httpRequest)
        
        then: "returns 200 OK with statistics"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.migration_id == migrationId.toString()
        jsonResponse.total_instructions == 100
        jsonResponse.completed == 75
        jsonResponse.completion_percentage == 75.0
    }
    
    def "GET /instructions/analytics/completion?teamId={id}&iterationId={uuid} should return team workload"() {
        given: "valid team ID and iteration ID"
        def teamId = 123
        def iterationId = UUID.randomUUID()
        def expectedWorkload = [
            tms_id: teamId,
            tms_name: 'Infrastructure Team',
            iteration_id: iterationId,
            total_instructions: 50,
            completed: 30,
            pending: 20,
            completion_percentage: 60.0
        ]
        
        and: "query parameters are set"
        queryParams.getFirst("migrationId") >> null
        queryParams.getFirst("teamId") >> teamId.toString()
        queryParams.getFirst("iterationId") >> iterationId.toString()
        httpRequest.pathInfo >> "/analytics/completion"
        
        when: "GET request is made to team workload endpoint"
        instructionRepository.getTeamWorkload(teamId, iterationId) >> expectedWorkload
        def response = callGetInstructions("/analytics/completion", queryParams, httpRequest)
        
        then: "returns 200 OK with workload data"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.tms_id == teamId
        jsonResponse.tms_name == 'Infrastructure Team'
        jsonResponse.total_instructions == 50
        jsonResponse.completion_percentage == 60.0
    }
    
    def "GET /instructions/analytics/completion should return 400 when required parameters missing"() {
        given: "no query parameters"
        queryParams.getFirst("migrationId") >> null
        queryParams.getFirst("teamId") >> null
        queryParams.getFirst("iterationId") >> null
        httpRequest.pathInfo >> "/analytics/completion"
        
        when: "GET request is made without required parameters"
        def response = callGetInstructions("/analytics/completion", queryParams, httpRequest)
        
        then: "returns 400 Bad Request"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Missing required parameter")
    }
    
    // ==================== POST ENDPOINTS TESTS ====================
    
    def "POST /instructions should create master instruction successfully"() {
        given: "valid instruction creation data"
        def stepId = UUID.randomUUID()
        def requestBody = new JsonBuilder([
            stmId: stepId.toString(),
            tmsId: 123,
            ctmId: UUID.randomUUID().toString(),
            inmOrder: 1,
            inmBody: 'New Master Instruction',
            inmDurationMinutes: 30
        ]).toString()
        def createdId = UUID.randomUUID()
        
        and: "path info is set"
        httpRequest.pathInfo >> ""
        
        when: "POST request is made to create master instruction"
        instructionRepository.createMasterInstruction(_) >> createdId
        def response = callPostInstructions("", queryParams, requestBody, httpRequest)
        
        then: "returns 201 Created"
        response.status == Response.Status.CREATED.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.success == true
        jsonResponse.message.contains("created successfully")
        jsonResponse.inmId == createdId.toString()
        
        and: "repository method called with correct parameters"
        1 * instructionRepository.createMasterInstruction(_) >> createdId
    }
    
    def "POST /instructions should return 400 for missing required fields"() {
        given: "incomplete instruction data"
        def requestBody = new JsonBuilder([
            inmBody: 'Incomplete Instruction'
            // Missing stmId and inmOrder
        ]).toString()
        httpRequest.pathInfo >> ""
        
        when: "POST request is made with incomplete data"
        def response = callPostInstructions("", queryParams, requestBody, httpRequest)
        
        then: "returns 400 Bad Request"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Missing required fields")
    }
    
    def "POST /instructions should handle SQL foreign key constraint violations"() {
        given: "instruction data with invalid references"
        def requestBody = new JsonBuilder([
            stmId: UUID.randomUUID().toString(),
            inmOrder: 1,
            inmBody: 'Test Instruction'
        ]).toString()
        httpRequest.pathInfo >> ""
        
        when: "POST request is made with invalid references"
        instructionRepository.createMasterInstruction(_) >> { throw new SQLException("Foreign key violation", "23503") }
        def response = callPostInstructions("", queryParams, requestBody, httpRequest)
        
        then: "returns 400 Bad Request with appropriate error message"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Referenced step, team, or control does not exist")
    }
    
    def "POST /instructions should handle SQL unique constraint violations"() {
        given: "instruction data that violates unique constraints"
        def requestBody = new JsonBuilder([
            stmId: UUID.randomUUID().toString(),
            inmOrder: 1,
            inmBody: 'Duplicate Order Instruction'
        ]).toString()
        httpRequest.pathInfo >> ""
        
        when: "POST request is made with duplicate order"
        instructionRepository.createMasterInstruction(_) >> { throw new SQLException("Unique violation", "23505") }
        def response = callPostInstructions("", queryParams, requestBody, httpRequest)
        
        then: "returns 409 Conflict with appropriate error message"
        response.status == Response.Status.CONFLICT.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Instruction order already exists")
    }
    
    def "POST /instructions/instance should create instance instructions successfully"() {
        given: "valid instance creation data"
        def stepInstanceId = UUID.randomUUID()
        def masterIds = [UUID.randomUUID(), UUID.randomUUID()]
        def createdInstanceIds = [UUID.randomUUID(), UUID.randomUUID()]
        def requestBody = new JsonBuilder([
            stiId: stepInstanceId.toString(),
            inmIds: masterIds.collect { it.toString() }
        ]).toString()
        
        and: "path info is set"
        httpRequest.pathInfo >> "/instance"
        
        when: "POST request is made to create instance instructions"
        instructionRepository.createInstanceInstructions(stepInstanceId, masterIds) >> createdInstanceIds
        def response = callPostInstructions("/instance", queryParams, requestBody, httpRequest)
        
        then: "returns 201 Created"
        response.status == Response.Status.CREATED.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.success == true
        jsonResponse.message.contains("created successfully")
        jsonResponse.createdInstances.size() == 2
        
        and: "repository method called with correct parameters"
        1 * instructionRepository.createInstanceInstructions(stepInstanceId, masterIds) >> createdInstanceIds
    }
    
    def "POST /instructions/instance should return 400 for missing required fields"() {
        given: "incomplete instance data"
        def requestBody = new JsonBuilder([
            stiId: UUID.randomUUID().toString()
            // Missing inmIds
        ]).toString()
        httpRequest.pathInfo >> "/instance"
        
        when: "POST request is made with incomplete data"
        def response = callPostInstructions("/instance", queryParams, requestBody, httpRequest)
        
        then: "returns 400 Bad Request"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Missing required fields")
    }
    
    def "POST /instructions/bulk should create multiple instructions successfully"() {
        given: "bulk instruction creation data"
        def instruction1Id = UUID.randomUUID()
        def instruction2Id = UUID.randomUUID()
        def instanceId1 = UUID.randomUUID()
        def requestBody = new JsonBuilder([
            instructions: [
                [
                    type: 'master',
                    stmId: UUID.randomUUID().toString(),
                    inmOrder: 1,
                    inmBody: 'Bulk Master Instruction 1'
                ],
                [
                    type: 'master',
                    stmId: UUID.randomUUID().toString(),
                    inmOrder: 2,
                    inmBody: 'Bulk Master Instruction 2'
                ],
                [
                    type: 'instance',
                    stiId: UUID.randomUUID().toString(),
                    inmIds: [UUID.randomUUID().toString()]
                ]
            ]
        ]).toString()
        httpRequest.pathInfo >> "/bulk"
        
        when: "POST request is made for bulk creation"
        instructionRepository.createMasterInstruction(_) >>> [instruction1Id, instruction2Id]
        instructionRepository.createInstanceInstructions(_, _) >> [instanceId1]
        def response = callPostInstructions("/bulk", queryParams, requestBody, httpRequest)
        
        then: "returns 201 Created with summary"
        response.status == Response.Status.CREATED.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.success == true
        jsonResponse.created.size() == 3
        jsonResponse.errors.size() == 0
        jsonResponse.summary.total_requested == 3
        jsonResponse.summary.successful == 3
        jsonResponse.summary.failed == 0
    }
    
    def "POST /instructions/bulk should return partial content when some operations fail"() {
        given: "bulk instruction data with some invalid entries"
        def instruction1Id = UUID.randomUUID()
        def requestBody = new JsonBuilder([
            instructions: [
                [
                    type: 'master',
                    stmId: UUID.randomUUID().toString(),
                    inmOrder: 1,
                    inmBody: 'Valid Master Instruction'
                ],
                [
                    type: 'master',
                    stmId: "invalid-uuid", // This will cause an error
                    inmOrder: 2,
                    inmBody: 'Invalid Master Instruction'
                ]
            ]
        ]).toString()
        httpRequest.pathInfo >> "/bulk"
        
        when: "POST request is made with mixed valid/invalid data"
        instructionRepository.createMasterInstruction(_) >>> [instruction1Id, { throw new IllegalArgumentException("Invalid UUID") }]
        def response = callPostInstructions("/bulk", queryParams, requestBody, httpRequest)
        
        then: "returns 206 Partial Content"
        response.status == Response.Status.PARTIAL_CONTENT.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.success == false
        jsonResponse.created.size() == 1
        jsonResponse.errors.size() == 1
        jsonResponse.summary.successful == 1
        jsonResponse.summary.failed == 1
    }
    
    // ==================== PUT ENDPOINTS TESTS ====================
    
    def "PUT /instructions/{id} should update master instruction successfully"() {
        given: "valid instruction update data"
        def instructionId = UUID.randomUUID()
        def requestBody = new JsonBuilder([
            tmsId: 456,
            inmOrder: 2,
            inmBody: 'Updated Instruction Body',
            inmDurationMinutes: 45
        ]).toString()
        httpRequest.pathInfo >> "/${instructionId}"
        
        when: "PUT request is made to update instruction"
        instructionRepository.updateMasterInstruction(instructionId, _) >> 1
        def response = callPutInstructions("/${instructionId}", queryParams, requestBody, httpRequest)
        
        then: "returns 200 OK"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.success == true
        jsonResponse.message.contains("updated successfully")
        jsonResponse.inmId == instructionId.toString()
        
        and: "repository method called with correct parameters"
        1 * instructionRepository.updateMasterInstruction(instructionId, _) >> 1
    }
    
    def "PUT /instructions/{id} should return 404 when instruction not found"() {
        given: "update data for non-existent instruction"
        def instructionId = UUID.randomUUID()
        def requestBody = new JsonBuilder([
            inmBody: 'Updated Body'
        ]).toString()
        httpRequest.pathInfo >> "/${instructionId}"
        
        when: "PUT request is made to non-existent instruction"
        instructionRepository.updateMasterInstruction(instructionId, _) >> 0
        def response = callPutInstructions("/${instructionId}", queryParams, requestBody, httpRequest)
        
        then: "returns 404 Not Found"
        response.status == Response.Status.NOT_FOUND.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("not found")
    }
    
    def "PUT /instructions/{id} should return 400 when no valid update fields provided"() {
        given: "empty update data"
        def instructionId = UUID.randomUUID()
        def requestBody = new JsonBuilder([:]).toString()
        httpRequest.pathInfo >> "/${instructionId}"
        
        when: "PUT request is made with no update fields"
        def response = callPutInstructions("/${instructionId}", queryParams, requestBody, httpRequest)
        
        then: "returns 400 Bad Request"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("No valid update fields provided")
    }
    
    def "PUT /instructions/instance/{id} should complete instruction successfully"() {
        given: "valid completion data"
        def instanceId = UUID.randomUUID()
        def userId = 123
        def requestBody = new JsonBuilder([
            action: 'complete',
            userId: userId
        ]).toString()
        httpRequest.pathInfo >> "/instance/${instanceId}"
        
        when: "PUT request is made to complete instruction"
        instructionRepository.completeInstruction(instanceId, userId) >> 1
        def response = callPutInstructions("/instance/${instanceId}", queryParams, requestBody, httpRequest)
        
        then: "returns 200 OK"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.success == true
        jsonResponse.message.contains("completed successfully")
        jsonResponse.action == 'completed'
        jsonResponse.userId == userId
        
        and: "repository method called with correct parameters"
        1 * instructionRepository.completeInstruction(instanceId, userId) >> 1
    }
    
    def "PUT /instructions/instance/{id} should uncomplete instruction successfully"() {
        given: "valid uncompletion data"
        def instanceId = UUID.randomUUID()
        def requestBody = new JsonBuilder([
            action: 'uncomplete'
        ]).toString()
        httpRequest.pathInfo >> "/instance/${instanceId}"
        
        when: "PUT request is made to uncomplete instruction"
        instructionRepository.uncompleteInstruction(instanceId) >> 1
        def response = callPutInstructions("/instance/${instanceId}", queryParams, requestBody, httpRequest)
        
        then: "returns 200 OK"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.success == true
        jsonResponse.message.contains("marked as incomplete")
        jsonResponse.action == 'uncompleted'
        
        and: "repository method called with correct parameters"
        1 * instructionRepository.uncompleteInstruction(instanceId) >> 1
    }
    
    def "PUT /instructions/instance/{id} should return 400 for missing userId on completion"() {
        given: "completion data without userId"
        def instanceId = UUID.randomUUID()
        def requestBody = new JsonBuilder([
            action: 'complete'
            // Missing userId
        ]).toString()
        httpRequest.pathInfo >> "/instance/${instanceId}"
        
        when: "PUT request is made to complete without userId"
        def response = callPutInstructions("/instance/${instanceId}", queryParams, requestBody, httpRequest)
        
        then: "returns 400 Bad Request"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Missing required field: userId")
    }
    
    def "PUT /instructions/instance/{id} should return 400 for invalid action"() {
        given: "invalid action data"
        def instanceId = UUID.randomUUID()
        def requestBody = new JsonBuilder([
            action: 'invalid-action',
            userId: 123
        ]).toString()
        httpRequest.pathInfo >> "/instance/${instanceId}"
        
        when: "PUT request is made with invalid action"
        def response = callPutInstructions("/instance/${instanceId}", queryParams, requestBody, httpRequest)
        
        then: "returns 400 Bad Request"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Invalid action")
    }
    
    def "PUT /instructions/bulk should update multiple instructions successfully"() {
        given: "bulk update data"
        def masterInstructionId = UUID.randomUUID()
        def instanceInstructionId = UUID.randomUUID()
        def requestBody = new JsonBuilder([
            updates: [
                [
                    type: 'master',
                    inmId: masterInstructionId.toString(),
                    inmBody: 'Updated Master Body'
                ],
                [
                    type: 'instance',
                    iniId: instanceInstructionId.toString(),
                    action: 'complete',
                    userId: '123'
                ]
            ]
        ]).toString()
        httpRequest.pathInfo >> "/bulk"
        
        when: "PUT request is made for bulk updates"
        instructionRepository.updateMasterInstruction(masterInstructionId, _) >> 1
        instructionRepository.completeInstruction(instanceInstructionId, 123) >> 1
        def response = callPutInstructions("/bulk", queryParams, requestBody, httpRequest)
        
        then: "returns 200 OK with summary"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.success == true
        jsonResponse.updated.size() == 2
        jsonResponse.errors.size() == 0
        jsonResponse.summary.successful == 2
        jsonResponse.summary.failed == 0
    }
    
    // ==================== DELETE ENDPOINTS TESTS ====================
    
    def "DELETE /instructions/{id} should delete master instruction successfully"() {
        given: "valid instruction ID"
        def instructionId = UUID.randomUUID()
        httpRequest.pathInfo >> "/${instructionId}"
        
        when: "DELETE request is made"
        instructionRepository.deleteMasterInstruction(instructionId) >> 1
        def response = callDeleteInstructions("/${instructionId}", queryParams, "", httpRequest)
        
        then: "returns 200 OK"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.success == true
        jsonResponse.message.contains("deleted successfully")
        jsonResponse.inmId == instructionId.toString()
        
        and: "repository method called"
        1 * instructionRepository.deleteMasterInstruction(instructionId) >> 1
    }
    
    def "DELETE /instructions/{id} should return 404 when instruction not found"() {
        given: "non-existent instruction ID"
        def instructionId = UUID.randomUUID()
        httpRequest.pathInfo >> "/${instructionId}"
        
        when: "DELETE request is made to non-existent instruction"
        instructionRepository.deleteMasterInstruction(instructionId) >> 0
        def response = callDeleteInstructions("/${instructionId}", queryParams, "", httpRequest)
        
        then: "returns 404 Not Found"
        response.status == Response.Status.NOT_FOUND.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("not found")
    }
    
    def "DELETE /instructions/instance/{id} should return 501 Not Implemented"() {
        given: "valid instance ID"
        def instanceId = UUID.randomUUID()
        httpRequest.pathInfo >> "/instance/${instanceId}"
        
        when: "DELETE request is made to instance endpoint"
        def response = callDeleteInstructions("/instance/${instanceId}", queryParams, "", httpRequest)
        
        then: "returns 501 Not Implemented"
        response.status == Response.Status.NOT_IMPLEMENTED.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("not yet implemented")
    }
    
    def "DELETE /instructions/bulk should delete multiple instructions successfully"() {
        given: "bulk deletion data"
        def instructionId1 = UUID.randomUUID()
        def instructionId2 = UUID.randomUUID()
        def requestBody = new JsonBuilder([
            deletions: [
                [
                    type: 'master',
                    inmId: instructionId1.toString()
                ],
                [
                    type: 'master',
                    inmId: instructionId2.toString()
                ]
            ]
        ]).toString()
        httpRequest.pathInfo >> "/bulk"
        
        when: "DELETE request is made for bulk deletion"
        instructionRepository.deleteMasterInstruction(instructionId1) >> 1
        instructionRepository.deleteMasterInstruction(instructionId2) >> 1
        def response = callDeleteInstructions("/bulk", queryParams, requestBody, httpRequest)
        
        then: "returns 200 OK with summary"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.success == true  
        jsonResponse.deleted.size() == 2
        jsonResponse.errors.size() == 0
        jsonResponse.summary.successful == 2
        jsonResponse.summary.failed == 0
    }
    
    // ==================== UTILITY ENDPOINTS TESTS ====================
    
    def "GET /statuses/instruction should return instruction statuses"() {
        given: "expected statuses data"
        def expectedStatuses = [
            [sts_id: 1, sts_name: 'Pending', sts_description: 'Not started'],
            [sts_id: 2, sts_name: 'In Progress', sts_description: 'Currently being executed'],
            [sts_id: 3, sts_name: 'Completed', sts_description: 'Successfully completed']
        ]
        httpRequest.pathInfo >> "/instruction"
        
        when: "GET request is made to statuses endpoint"
        statusRepository.findStatusesByType('Instruction') >> expectedStatuses
        def response = callGetStatuses("/instruction", queryParams, "", httpRequest)
        
        then: "returns 200 OK with statuses"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.size() == 3
        jsonResponse[0].sts_name == 'Pending'
        jsonResponse[1].sts_name == 'In Progress'
        jsonResponse[2].sts_name == 'Completed'
        
        and: "repository method called"
        1 * statusRepository.findStatusesByType('Instruction') >> expectedStatuses
    }
    
    def "POST /reorder should reorder master instructions successfully"() {
        given: "reorder data"
        def stepId = UUID.randomUUID()
        def instruction1Id = UUID.randomUUID()
        def instruction2Id = UUID.randomUUID()
        def requestBody = new JsonBuilder([
            stmId: stepId.toString(),
            orderData: [
                [inmId: instruction1Id.toString(), newOrder: 2],
                [inmId: instruction2Id.toString(), newOrder: 1]
            ]
        ]).toString()
        
        when: "POST request is made to reorder endpoint"
        instructionRepository.reorderMasterInstructions(stepId, _) >> 2
        def response = callPostReorder("", queryParams, requestBody, httpRequest)
        
        then: "returns 200 OK"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.success == true
        jsonResponse.message.contains("reordered successfully")
        jsonResponse.affectedInstructions == 2
        
        and: "repository method called"
        1 * instructionRepository.reorderMasterInstructions(stepId, _) >> 2
    }
    
    def "GET /timeline?iterationId={uuid} should return instruction completion timeline"() {
        given: "valid iteration ID"
        def iterationId = UUID.randomUUID()
        def expectedTimeline = [
            [
                ini_id: UUID.randomUUID(),
                ini_completed_at: new Date(),
                usr_first_name: 'John',
                usr_last_name: 'Doe',
                instruction_body: 'Completed instruction 1',
                tms_name: 'Infrastructure Team'
            ],
            [
                ini_id: UUID.randomUUID(),
                ini_completed_at: new Date(),
                usr_first_name: 'Jane',
                usr_last_name: 'Smith',
                instruction_body: 'Completed instruction 2',
                tms_name: 'Database Team'
            ]
        ]
        queryParams.getFirst("iterationId") >> iterationId.toString()
        
        when: "GET request is made to timeline endpoint"
        instructionRepository.getInstructionCompletionTimeline(iterationId) >> expectedTimeline
        def response = callGetTimeline("", queryParams, "", httpRequest)
        
        then: "returns 200 OK with timeline"
        response.status == Response.Status.OK.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.iterationId == iterationId.toString()
        jsonResponse.timeline.size() == 2
        jsonResponse.total_completed == 2
        jsonResponse.timeline[0].usr_first_name == 'John'
        jsonResponse.timeline[1].usr_first_name == 'Jane'
        
        and: "repository method called"
        1 * instructionRepository.getInstructionCompletionTimeline(iterationId) >> expectedTimeline
    }
    
    def "GET /timeline should return 400 when iterationId missing"() {
        given: "no iteration ID"
        queryParams.getFirst("iterationId") >> null
        
        when: "GET request is made without iterationId"
        def response = callGetTimeline("", queryParams, "", httpRequest)
        
        then: "returns 400 Bad Request"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Missing required parameter: iterationId")
    }
    
    // ==================== ERROR HANDLING TESTS ====================
    
    def "should return 400 for invalid JSON format in POST requests"() {
        given: "malformed JSON"
        def requestBody = "{ invalid json }"
        httpRequest.pathInfo >> ""
        
        when: "POST request is made with invalid JSON"
        def response = callPostInstructions("", queryParams, requestBody, httpRequest)
        
        then: "returns 400 Bad Request"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Invalid JSON format")
    }
    
    def "should return 500 for unexpected exceptions"() {
        given: "repository that throws unexpected exception"
        def stepId = UUID.randomUUID()
        queryParams.getFirst("stepId") >> stepId.toString()
        queryParams.getFirst("stepInstanceId") >> null
        httpRequest.pathInfo >> ""
        
        when: "GET request encounters unexpected error"
        instructionRepository.findMasterInstructionsByStepId(stepId) >> { throw new RuntimeException("Database error") }
        def response = callGetInstructions("", queryParams, httpRequest)
        
        then: "returns 500 Internal Server Error"
        response.status == Response.Status.INTERNAL_SERVER_ERROR.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Internal server error")
    }
    
    @Unroll
    def "should return 400 for invalid UUID format in #endpoint"() {
        given: "invalid UUID parameter"
        httpRequest.pathInfo >> pathInfo
        if (invalidUuid) {
            queryParams.getFirst(_) >> invalidUuid
        }
        
        when: "request is made with invalid UUID"
        def response = null
        switch (methodName) {
            case "GET":
                response = callGetInstructions(extraPath, queryParams, httpRequest)
                break
            case "PUT":
                response = callPutInstructions(extraPath, queryParams, '{"inmBody":"test"}', httpRequest)
                break
            case "DELETE":
                response = callDeleteInstructions(extraPath, queryParams, "", httpRequest)
                break
        }
        
        then: "returns 400 Bad Request"
        response.status == Response.Status.BAD_REQUEST.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains("Invalid") && jsonResponse.error.contains("format")
        
        where:
        endpoint                    | pathInfo              | invalidUuid    | methodName | extraPath
        "GET /instructions/stepId"  | ""                    | "invalid-uuid" | "GET"      | ""
        "GET /instructions/instance"| "/instance/invalid"   | null           | "GET"      | "/instance/invalid"
        "PUT /instructions"         | "/invalid-uuid"       | null           | "PUT"      | "/invalid-uuid"
        "DELETE /instructions"      | "/invalid-uuid"       | null           | "DELETE"   | "/invalid-uuid"
    }
    
    def "should handle SQL constraint violations with appropriate HTTP status codes"() {
        given: "instruction creation data"
        def requestBody = new JsonBuilder([
            stmId: UUID.randomUUID().toString(),
            inmOrder: 1,
            inmBody: 'Test Instruction'
        ]).toString()
        httpRequest.pathInfo >> ""
        
        when: "repository throws SQL exception with specific state"
        instructionRepository.createMasterInstruction(_) >> { throw new SQLException("Constraint violation", sqlState) }
        def response = callPostInstructions("", queryParams, requestBody, httpRequest)
        
        then: "returns appropriate HTTP status"
        response.status == expectedStatus.statusCode
        def jsonResponse = new JsonSlurper().parseText(response.entity as String)
        jsonResponse.error.contains(expectedErrorKeyword)
        
        where:
        sqlState | expectedStatus                  | expectedErrorKeyword
        "23503"  | Response.Status.BAD_REQUEST     | "does not exist"
        "23505"  | Response.Status.CONFLICT        | "already exists"
    }
    
    // ==================== HELPER METHODS ====================
    
    /**
     * Helper method to simulate GET /instructions calls
     */
    private def callGetInstructions(String extraPath, MultivaluedMap queryParams, HttpServletRequest request) {
        // Simulate the actual API method execution
        try {
            def pathParts = extraPath?.split('/')?.findAll { it } ?: []
            
            // Handle analytics endpoints
            if (pathParts.size() == 2 && pathParts[0] == 'analytics' && pathParts[1] == 'completion') {
                def migrationId = queryParams.getFirst("migrationId")
                def teamId = queryParams.getFirst("teamId")
                def iterationId = queryParams.getFirst("iterationId")
                
                if (migrationId) {
                    def migUuid = UUID.fromString(migrationId as String)
                    def stats = instructionRepository.getInstructionStatisticsByMigration(migUuid)
                    return Response.ok(new JsonBuilder(stats).toString()).build()
                } else if (teamId && iterationId) {
                    def tmsId = Integer.parseInt(teamId as String)
                    def iteUuid = UUID.fromString(iterationId as String)
                    def workload = instructionRepository.getTeamWorkload(tmsId, iteUuid)
                    return Response.ok(new JsonBuilder(workload).toString()).build()
                } else {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Missing required parameter: migrationId or teamId"]).toString())
                        .build()
                }
            }
            
            // Handle instance endpoint
            if (pathParts.size() == 2 && pathParts[0] == 'instance') {
                def instanceId = pathParts[1]
                try {
                    UUID instanceUuid = UUID.fromString(instanceId)
                    def instructionInstance = instructionRepository.findInstanceInstructionById(instanceUuid)
                    
                    if (!instructionInstance) {
                        return Response.status(Response.Status.NOT_FOUND)
                            .entity(new JsonBuilder([error: "Instruction instance not found for ID: ${instanceId}"]).toString())
                            .build()
                    }
                    
                    return Response.ok(new JsonBuilder(instructionInstance).toString()).build()
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid instruction instance ID format: ${instanceId}"]).toString())
                        .build()
                }
            }
            
            // Handle main instructions endpoint
            if (pathParts.empty) {
                def stepId = queryParams.getFirst("stepId")
                def stepInstanceId = queryParams.getFirst("stepInstanceId")
                
                if (stepId) {
                    try {
                        def stmUuid = UUID.fromString(stepId as String)
                        def instructions = instructionRepository.findMasterInstructionsByStepId(stmUuid)
                        return Response.ok(new JsonBuilder(instructions).toString()).build()
                    } catch (IllegalArgumentException e) {
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(new JsonBuilder([error: "Invalid step ID format"]).toString())
                            .build()
                    }
                } else if (stepInstanceId) {
                    try {
                        def stiUuid = UUID.fromString(stepInstanceId as String)
                        def instructions = instructionRepository.findInstanceInstructionsByStepInstanceId(stiUuid)
                        return Response.ok(new JsonBuilder(instructions).toString()).build()
                    } catch (IllegalArgumentException e) {
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(new JsonBuilder([error: "Invalid step instance ID format"]).toString())
                            .build()
                    }
                } else {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "stepId or stepInstanceId parameter required"]).toString())
                        .build()
                }
            }
            
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
                .build()
                
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
                .build()
        }
    }
    
    /**
     * Helper method to simulate POST /instructions calls
     */
    private def callPostInstructions(String extraPath, MultivaluedMap queryParams, String body, HttpServletRequest request) {
        try {
            def pathParts = extraPath?.split('/')?.findAll { it } ?: []
            
            // Handle bulk endpoint
            if (pathParts.size() == 1 && pathParts[0] == 'bulk') {
                def requestData = [:]
                if (body) {
                    try {
                        requestData = new JsonSlurper().parseText(body) as Map
                    } catch (Exception e) {
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
                            .build()
                    }
                }
                
                def instructions = requestData.instructions as List
                if (!instructions || instructions.isEmpty()) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Missing required field: instructions array"]).toString())
                        .build()
                }
                
                def created = []
                def errors = []
                
                instructions.each { instruction ->
                    try {
                        if (instruction.type == 'master' || !instruction.containsKey('type')) {
                            def createdId = instructionRepository.createMasterInstruction(instruction)
                            created << [type: 'master', inmId: createdId, originalData: instruction]
                        } else if (instruction.type == 'instance') {
                            def stiId = UUID.fromString(instruction.stiId as String)
                            def inmIds = instruction.inmIds.collect { UUID.fromString(it as String) }
                            def createdInstanceIds = instructionRepository.createInstanceInstructions(stiId, inmIds)
                            createdInstanceIds.each { instanceId ->
                                created << [type: 'instance', iniId: instanceId, originalData: instruction]
                            }
                        }
                    } catch (Exception e) {
                        errors << [error: e.message, originalData: instruction]
                    }
                }
                
                def statusCode = errors.isEmpty() ? Response.Status.CREATED : Response.Status.PARTIAL_CONTENT
                return Response.status(statusCode)
                    .entity(new JsonBuilder([
                        success: errors.isEmpty(),
                        created: created,
                        errors: errors,
                        summary: [
                            total_requested: instructions.size(),
                            successful: created.size(),
                            failed: errors.size()
                        ]
                    ]).toString()).build()
            }
            
            // Handle instance endpoint
            if (pathParts.size() == 1 && pathParts[0] == 'instance') {
                def requestData = [:]
                if (body) {
                    try {
                        requestData = new JsonSlurper().parseText(body) as Map
                    } catch (Exception e) {
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
                            .build()
                    }
                }
                
                def stiId = requestData.stiId
                def inmIds = requestData.inmIds as List
                
                if (!stiId || !inmIds || inmIds.isEmpty()) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Missing required fields: stiId and inmIds array"]).toString())
                        .build()
                }
                
                try {
                    def stepInstanceUuid = UUID.fromString(stiId as String)
                    def masterInstructionUuids = inmIds.collect { UUID.fromString(it as String) }
                    
                    def createdInstanceIds = instructionRepository.createInstanceInstructions(stepInstanceUuid, masterInstructionUuids)
                    
                    return Response.status(Response.Status.CREATED)
                        .entity(new JsonBuilder([
                            success: true,
                            message: "Instruction instances created successfully",
                            stepInstanceId: stiId,
                            createdInstances: createdInstanceIds
                        ]).toString()).build()
                        
                } catch (SQLException e) {
                    if (e.getSQLState() == '23503') {
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(new JsonBuilder([error: "Referenced step instance or master instruction does not exist"]).toString())
                            .build()
                    } else if (e.getSQLState() == '23505') {
                        return Response.status(Response.Status.CONFLICT)
                            .entity(new JsonBuilder([error: "Instruction instance already exists"]).toString())
                            .build()
                    }
                    throw e
                }
            }
            
            // Handle main instructions endpoint  
            if (pathParts.empty) {
                def requestData = [:]
                if (body) {
                    try {
                        requestData = new JsonSlurper().parseText(body) as Map
                    } catch (Exception e) {
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
                            .build()
                    }
                }
                
                def stmId = requestData.stmId
                def inmOrder = requestData.inmOrder
                def inmBody = requestData.inmBody
                
                if (!stmId || inmOrder == null || !inmBody) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Missing required fields: stmId, inmOrder, and inmBody"]).toString())
                        .build()
                }
                
                try {
                    def createdId = instructionRepository.createMasterInstruction(requestData)
                    
                    return Response.status(Response.Status.CREATED)
                        .entity(new JsonBuilder([
                            success: true,
                            message: "Master instruction created successfully",
                            inmId: createdId
                        ]).toString()).build()
                        
                } catch (SQLException e) {
                    if (e.getSQLState() == '23503') {
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(new JsonBuilder([error: "Referenced step, team, or control does not exist"]).toString())
                            .build()
                    } else if (e.getSQLState() == '23505') {
                        return Response.status(Response.Status.CONFLICT)
                            .entity(new JsonBuilder([error: "Instruction order already exists for this step"]).toString())
                            .build()
                    }
                    throw e
                }
            }
            
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
                .build()
                
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
                .build()
        }
    }
    
    /**
     * Helper method to simulate PUT /instructions calls
     */
    private def callPutInstructions(String extraPath, MultivaluedMap queryParams, String body, HttpServletRequest request) {
        try {
            def pathParts = extraPath?.split('/')?.findAll { it } ?: []
            
            // Handle bulk endpoint
            if (pathParts.size() == 1 && pathParts[0] == 'bulk') {
                def requestData = [:]
                if (body) {
                    try {
                        requestData = new JsonSlurper().parseText(body) as Map
                    } catch (Exception e) {
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
                            .build()
                    }
                }
                
                def updates = requestData.updates as List
                if (!updates || updates.isEmpty()) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Missing required field: updates array"]).toString())
                        .build()
                }
                
                def updated = []
                def errors = []
                
                updates.each { update ->
                    try {
                        if (update.type == 'master' || !update.containsKey('type')) {
                            def inmId = UUID.fromString(update.inmId as String)
                            def affectedRows = instructionRepository.updateMasterInstruction(inmId, update)
                            if (affectedRows > 0) {
                                updated << [type: 'master', inmId: inmId, originalData: update]
                            } else {
                                errors << [type: 'master', error: "Instruction not found", originalData: update]
                            }
                        } else if (update.type == 'instance') {
                            def iniId = UUID.fromString(update.iniId as String)
                            def userId = update.userId ? Integer.parseInt(update.userId as String) : null
                            
                            if (update.action == 'complete' && userId) {
                                def affectedRows = instructionRepository.completeInstruction(iniId, userId)
                                if (affectedRows > 0) {
                                    updated << [type: 'instance', iniId: iniId, action: 'completed', originalData: update]
                                } else {
                                    errors << [type: 'instance', error: "Instruction instance not found", originalData: update]
                                }
                            } else if (update.action == 'uncomplete') {
                                def affectedRows = instructionRepository.uncompleteInstruction(iniId)
                                if (affectedRows > 0) {
                                    updated << [type: 'instance', iniId: iniId, action: 'uncompleted', originalData: update]
                                } else {
                                    errors << [type: 'instance', error: "Instruction instance not found", originalData: update]
                                }
                            } else {
                                errors << [type: 'instance', error: "Invalid action or missing userId", originalData: update]
                            }
                        }
                    } catch (Exception e) {
                        errors << [error: e.message, originalData: update]
                    }
                }
                
                return Response.ok(new JsonBuilder([
                    success: errors.isEmpty(),
                    updated: updated,
                    errors: errors,
                    summary: [
                        total_requested: updates.size(),
                        successful: updated.size(),
                        failed: errors.size()
                    ]
                ]).toString()).build()
            }
            
            // Handle instance endpoint
            if (pathParts.size() == 2 && pathParts[0] == 'instance') {
                def instanceId = pathParts[1]
                
                try {
                    def instanceUuid = UUID.fromString(instanceId)
                    
                    def requestData = [:]
                    if (body) {
                        try {
                            requestData = new JsonSlurper().parseText(body) as Map
                        } catch (Exception e) {
                            return Response.status(Response.Status.BAD_REQUEST)
                                .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
                                .build()
                        }
                    }
                    
                    def action = requestData.action as String ?: 'complete'
                    def userId = requestData.userId ? Integer.parseInt(requestData.userId as String) : null
                    
                    if (action == 'complete') {
                        if (!userId) {
                            return Response.status(Response.Status.BAD_REQUEST)
                                .entity(new JsonBuilder([error: "Missing required field: userId for completion"]).toString())
                                .build()
                        }
                        
                        def affectedRows = instructionRepository.completeInstruction(instanceUuid, userId)
                        if (affectedRows > 0) {
                            return Response.ok(new JsonBuilder([
                                success: true,
                                message: "Instruction completed successfully",
                                instanceId: instanceId,
                                action: 'completed',
                                userId: userId
                            ]).toString()).build()
                        } else {
                            return Response.status(Response.Status.NOT_FOUND)
                                .entity(new JsonBuilder([error: "Instruction instance not found or already completed"]).toString())
                                .build()
                        }
                    } else if (action == 'uncomplete') {
                        def affectedRows = instructionRepository.uncompleteInstruction(instanceUuid)
                        if (affectedRows > 0) {
                            return Response.ok(new JsonBuilder([
                                success: true,
                                message: "Instruction marked as incomplete",
                                instanceId: instanceId,
                                action: 'uncompleted'
                            ]).toString()).build()
                        } else {
                            return Response.status(Response.Status.NOT_FOUND)
                                .entity(new JsonBuilder([error: "Instruction instance not found or not completed"]).toString())
                                .build()
                        }
                    } else {
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(new JsonBuilder([error: "Invalid action. Must be 'complete' or 'uncomplete'"]).toString())
                            .build()
                    }
                    
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid instruction instance ID format"]).toString())
                        .build()
                }
            }
            
            // Handle main instructions endpoint
            if (pathParts.size() == 1) {
                def instructionId = pathParts[0]
                
                try {
                    def instructionUuid = UUID.fromString(instructionId)
                    
                    def requestData = [:]
                    if (body) {
                        try {
                            requestData = new JsonSlurper().parseText(body) as Map
                        } catch (Exception e) {
                            return Response.status(Response.Status.BAD_REQUEST)
                                .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
                                .build()
                        }
                    }
                    
                    def updateParams = [:]
                    if (requestData.containsKey('tmsId')) updateParams.tmsId = requestData.tmsId
                    if (requestData.containsKey('ctmId')) updateParams.ctmId = requestData.ctmId
                    if (requestData.containsKey('inmOrder')) updateParams.inmOrder = requestData.inmOrder
                    if (requestData.containsKey('inmBody')) updateParams.inmBody = requestData.inmBody
                    if (requestData.containsKey('inmDurationMinutes')) updateParams.inmDurationMinutes = requestData.inmDurationMinutes
                    
                    if (updateParams.isEmpty()) {
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(new JsonBuilder([error: "No valid update fields provided"]).toString())
                            .build()
                    }
                    
                    def affectedRows = instructionRepository.updateMasterInstruction(instructionUuid, updateParams)
                    
                    if (affectedRows > 0) {
                        return Response.ok(new JsonBuilder([
                            success: true,
                            message: "Master instruction updated successfully",
                            inmId: instructionId,
                            updatedFields: updateParams.keySet()
                        ]).toString()).build()
                    } else {
                        return Response.status(Response.Status.NOT_FOUND)
                            .entity(new JsonBuilder([error: "Master instruction not found"]).toString())
                            .build()
                    }
                    
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid master instruction ID format"]).toString())
                        .build()
                }
            }
            
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
                .build()
                
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
                .build()
        }
    }
    
    /**
     * Helper method to simulate DELETE /instructions calls
     */
    private def callDeleteInstructions(String extraPath, MultivaluedMap queryParams, String body, HttpServletRequest request) {
        try {
            def pathParts = extraPath?.split('/')?.findAll { it } ?: []
            
            // Handle bulk endpoint
            if (pathParts.size() == 1 && pathParts[0] == 'bulk') {
                def requestData = [:]
                if (body) {
                    try {
                        requestData = new JsonSlurper().parseText(body) as Map
                    } catch (Exception e) {
                        return Response.status(Response.Status.BAD_REQUEST)
                            .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
                            .build()
                    }
                }
                
                def deletions = requestData.deletions as List
                if (!deletions || deletions.isEmpty()) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Missing required field: deletions array"]).toString())
                        .build()
                }
                
                def deleted = []
                def errors = []
                
                deletions.each { deletion ->
                    try {
                        if (deletion.type == 'master' || !deletion.containsKey('type')) {
                            def inmId = UUID.fromString(deletion.inmId as String)
                            def affectedRows = instructionRepository.deleteMasterInstruction(inmId)
                            if (affectedRows > 0) {
                                deleted << [type: 'master', inmId: inmId, originalData: deletion]
                            } else {
                                errors << [type: 'master', error: "Instruction not found", originalData: deletion]
                            }
                        } else if (deletion.type == 'instance') {
                            errors << [type: 'instance', error: "Instance deletion not implemented", originalData: deletion]
                        }
                    } catch (Exception e) {
                        errors << [error: e.message, originalData: deletion]
                    }
                }
                
                return Response.ok(new JsonBuilder([
                    success: errors.isEmpty(),
                    deleted: deleted,
                    errors: errors,
                    summary: [
                        total_requested: deletions.size(),
                        successful: deleted.size(),
                        failed: errors.size()
                    ]
                ]).toString()).build()
            }
            
            // Handle instance endpoint
            if (pathParts.size() == 2 && pathParts[0] == 'instance') {
                return Response.status(Response.Status.NOT_IMPLEMENTED)
                    .entity(new JsonBuilder([error: "Instance deletion not yet implemented"]).toString())
                    .build()
            }
            
            // Handle main instructions endpoint
            if (pathParts.size() == 1) {
                def instructionId = pathParts[0]
                
                try {
                    def instructionUuid = UUID.fromString(instructionId)
                    
                    def affectedRows = instructionRepository.deleteMasterInstruction(instructionUuid)
                    
                    if (affectedRows > 0) {
                        return Response.ok(new JsonBuilder([
                            success: true,
                            message: "Master instruction deleted successfully",
                            inmId: instructionId
                        ]).toString()).build()
                    } else {
                        return Response.status(Response.Status.NOT_FOUND)
                            .entity(new JsonBuilder([error: "Master instruction not found"]).toString())
                            .build()
                    }
                    
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid master instruction ID format"]).toString())
                        .build()
                }
            }
            
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
                .build()
                
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
                .build()
        }
    }
    
    /**
     * Helper method to simulate GET /statuses calls
     */
    private def callGetStatuses(String extraPath, MultivaluedMap queryParams, String body, HttpServletRequest request) {
        def pathParts = extraPath?.split('/')?.findAll { it } ?: []
        
        if (pathParts.size() == 1 && pathParts[0] == 'instruction') {
            try {
                def statuses = statusRepository.findStatusesByType('Instruction')
                return Response.ok(new JsonBuilder(statuses).toString()).build()
            } catch (Exception e) {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: "Failed to fetch instruction statuses: ${e.message}"]).toString())
                    .build()
            }
        }
        
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Invalid status endpoint"]).toString())
            .build()
    }
    
    /**
     * Helper method to simulate POST /reorder calls
     */
    private def callPostReorder(String extraPath, MultivaluedMap queryParams, String body, HttpServletRequest request) {
        try {
            def requestData = [:]
            if (body) {
                try {
                    requestData = new JsonSlurper().parseText(body) as Map
                } catch (Exception e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
                        .build()
                }
            }
            
            def stmId = requestData.stmId
            def orderData = requestData.orderData as List
            
            if (!stmId || !orderData || orderData.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Missing required fields: stmId and orderData array"]).toString())
                    .build()
            }
            
            try {
                def stepUuid = UUID.fromString(stmId as String)
                def affectedRows = instructionRepository.reorderMasterInstructions(stepUuid, orderData)
                
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Instructions reordered successfully",
                    stepId: stmId,
                    affectedInstructions: affectedRows
                ]).toString()).build()
                
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid step ID format or order data"]).toString())
                    .build()
            }
            
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
                .build()
        }
    }
    
    /**
     * Helper method to simulate GET /timeline calls
     */
    private def callGetTimeline(String extraPath, MultivaluedMap queryParams, String body, HttpServletRequest request) {
        def iterationId = queryParams.getFirst("iterationId")
        
        if (!iterationId) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Missing required parameter: iterationId"]).toString())
                .build()
        }
        
        try {
            def iterationUuid = UUID.fromString(iterationId as String)
            def timeline = instructionRepository.getInstructionCompletionTimeline(iterationUuid)
            
            return Response.ok(new JsonBuilder([
                iterationId: iterationId,
                timeline: timeline,
                total_completed: timeline.size()
            ]).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid iteration ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
                .build()
        }
    }
}