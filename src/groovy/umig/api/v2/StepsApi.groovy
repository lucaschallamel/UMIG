package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.StepRepository
import groovy.json.JsonBuilder
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID

@BaseScript CustomEndpointDelegate delegate

final StepRepository stepRepository = new StepRepository()

/**
 * Handles GET requests for Steps with hierarchical filtering for the runsheet.
 * - GET /steps -> returns all steps (not recommended for production)
 * - GET /steps/master -> returns all master steps for dropdowns
 * - GET /steps?migrationId={uuid} -> returns steps in a migration
 * - GET /steps?iterationId={uuid} -> returns steps in an iteration
 * - GET /steps?planId={uuid} -> returns steps in a plan
 * - GET /steps?sequenceId={uuid} -> returns steps in a sequence
 * - GET /steps?phaseId={uuid} -> returns steps in a phase
 * - GET /steps?teamId={uuid} -> returns steps owned by a team
 * - GET /steps?labelId={uuid} -> returns steps with a label
 * 
 * Multiple filters can be combined for progressive refinement.
 * Results are ordered by sequence number, phase number, and step number.
 */
steps(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // GET /steps/master - return all master steps for dropdowns
    if (pathParts.size() == 1 && pathParts[0] == 'master') {
        try {
            def masterSteps
            
            // Check if migrationId is provided as query parameter
            def migrationId = queryParams.getFirst("migrationId")
            if (migrationId) {
                try {
                    def migUuid = UUID.fromString(migrationId)
                    masterSteps = stepRepository.findMasterStepsByMigrationId(migUuid)
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid migration ID format"]).toString())
                        .build()
                }
            } else {
                masterSteps = stepRepository.findAllMasterSteps()
            }
            
            // Transform to dropdown-friendly format
            def result = masterSteps.collect { step ->
                [
                    stm_id: step.stm_id,
                    stt_code: step.stt_code,
                    stm_step_number: step.stm_number,
                    stm_title: step.stm_name,
                    stm_description: step.stm_description,
                    stt_name: step.stt_name,
                    // Add composed display fields
                    step_code: "${step.stt_code}-${String.format('%03d', step.stm_number)}",
                    display_name: "${step.stt_code}-${String.format('%03d', step.stm_number)}: ${step.stm_name}"
                ]
            }
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to fetch master steps: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /steps with query parameters for hierarchical filtering
    if (pathParts.empty) {
        try {
            def filters = [:]
            
            // Extract query parameters
            if (queryParams.getFirst("migrationId")) {
                filters.migrationId = queryParams.getFirst("migrationId")
            }
            
            if (queryParams.getFirst("iterationId")) {
                filters.iterationId = queryParams.getFirst("iterationId")
            }
            
            if (queryParams.getFirst("planId")) {
                filters.planId = queryParams.getFirst("planId")
            }
            
            if (queryParams.getFirst("sequenceId")) {
                filters.sequenceId = queryParams.getFirst("sequenceId")
            }
            
            if (queryParams.getFirst("phaseId")) {
                filters.phaseId = queryParams.getFirst("phaseId")
            }
            
            if (queryParams.getFirst("teamId")) {
                filters.teamId = queryParams.getFirst("teamId")
            }
            
            if (queryParams.getFirst("labelId")) {
                filters.labelId = queryParams.getFirst("labelId")
            }
            
            // Fetch filtered steps
            def steps = stepRepository.findFilteredStepInstances(filters)
            
            // Group steps by sequence and phase for frontend consumption
            def groupedSteps = [:]
            
            steps.each { stepItem ->
                def step = stepItem as Map
                def sequenceKey = "${step.sequenceNumber}-${step.sequenceId}"
                def phaseKey = "${step.phaseNumber}-${step.phaseId}"
                
                if (!groupedSteps[sequenceKey]) {
                    groupedSteps[sequenceKey] = [
                        id: step.sequenceId,
                        name: step.sequenceName,
                        number: step.sequenceNumber,
                        phases: [:]
                    ]
                }
                
                def sequenceMap = groupedSteps[sequenceKey] as Map
                def phasesMap = sequenceMap.phases as Map
                
                if (!phasesMap[phaseKey]) {
                    phasesMap[phaseKey] = [
                        id: step.phaseId,
                        name: step.phaseName,
                        number: step.phaseNumber,
                        steps: []
                    ]
                }
                
                def phaseMap = phasesMap[phaseKey] as Map
                def stepsList = phaseMap.steps as List
                
                // Fetch labels for this step
                def stepLabels = []
                try {
                    // Convert stmId to UUID if it's a string
                    def stmId = step.stmId instanceof UUID ? step.stmId : UUID.fromString(step.stmId.toString())
                    stepLabels = stepRepository.findLabelsByStepId(stmId)
                } catch (Exception e) {
                    // If label fetching fails, continue with empty labels
                    stepLabels = []
                }
                
                // Add step to phase
                stepsList.add([
                    id: step.id,
                    code: "${step.sttCode}-${String.format('%03d', step.stmNumber)}",
                    name: step.name,
                    status: step.status,
                    durationMinutes: step.durationMinutes,
                    ownerTeamId: step.ownerTeamId,
                    ownerTeamName: step.ownerTeamName ?: 'Unassigned',
                    labels: stepLabels
                ])
            }
            
            // Convert to arrays and sort
            def result = groupedSteps.values().collect { sequenceItem ->
                def sequence = sequenceItem as Map
                def phasesMap = sequence.phases as Map
                
                def phasesList = phasesMap.values().collect { phaseItem ->
                    def phase = phaseItem as Map
                    def stepsList = phase.steps as List
                    
                    return [
                        id: phase.id,
                        name: phase.name,
                        number: phase.number,
                        steps: stepsList.sort { stepItem -> (stepItem as Map).code }
                    ]
                }
                phasesList.sort { phaseItem -> (phaseItem as Map).number }
                
                return [
                    id: sequence.id,
                    name: sequence.name,
                    number: sequence.number,
                    phases: phasesList
                ]
            }
            result.sort { sequenceItem -> (sequenceItem as Map).number }
            
            return Response.ok(new JsonBuilder(result).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid UUID format: ${e.message}"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
}

/**
 * Handles PUT requests for updating step instance status.
 * - PUT /steps/{stepInstanceId}/status -> updates step status and sends notifications
 * 
 * Request body should contain:
 * {
 *   "status": "OPEN|IN_PROGRESS|COMPLETED|BLOCKED|ON_HOLD",
 *   "userId": 123 (optional, for audit logging)
 * }
 */
steps(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // PUT /steps/{stepInstanceId}/status
    if (pathParts.size() == 2 && pathParts[1] == 'status') {
        try {
            def stepInstanceId = pathParts[0]
            def stepInstanceUuid = UUID.fromString(stepInstanceId)
            
            // Parse request body
            def requestData = new JsonBuilder()
            if (body) {
                requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            }
            
            def newStatus = requestData.status as String
            def userId = requestData.userId as Integer
            
            if (!newStatus) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Missing required field: status"]).toString())
                    .build()
            }
            
            // Validate status value
            def validStatuses = ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'ON_HOLD']
            if (!validStatuses.contains(newStatus.toUpperCase())) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid status. Must be one of: ${validStatuses.join(', ')}"]).toString())
                    .build()
            }
            
            // Update step status and send notifications
            def result = stepRepository.updateStepInstanceStatusWithNotification(stepInstanceUuid, newStatus, userId)
            
            if (result.success) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Step status updated successfully",
                    stepInstanceId: stepInstanceId,
                    newStatus: newStatus,
                    emailsSent: result.emailsSent
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: result.error ?: "Failed to update step status"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid step instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to update step status: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
}

/**
 * Handles POST requests for step-related actions.
 * - POST /steps/{stepInstanceId}/open -> marks step as opened by PILOT and sends notifications
 * - POST /steps/{stepInstanceId}/instructions/{instructionId}/complete -> marks instruction as completed
 * 
 * Request body should contain:
 * {
 *   "userId": 123 (optional, for audit logging)
 * }
 */
steps(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // POST /steps/{stepInstanceId}/open
    if (pathParts.size() == 2 && pathParts[1] == 'open') {
        try {
            def stepInstanceId = pathParts[0]
            def stepInstanceUuid = UUID.fromString(stepInstanceId)
            
            // Parse request body
            def requestData = [:]
            if (body) {
                requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            }
            
            def userId = requestData.userId as Integer
            
            // Mark step as opened and send notifications
            def result = stepRepository.openStepInstanceWithNotification(stepInstanceUuid, userId)
            
            if (result.success) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Step opened successfully",
                    stepInstanceId: stepInstanceId,
                    emailsSent: result.emailsSent
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: result.error ?: "Failed to open step"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid step instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to open step: ${e.message}"]).toString())
                .build()
        }
    }
    
    // POST /steps/{stepInstanceId}/instructions/{instructionId}/complete
    if (pathParts.size() == 4 && pathParts[1] == 'instructions' && pathParts[3] == 'complete') {
        try {
            def stepInstanceId = pathParts[0]
            def instructionId = pathParts[2]
            def stepInstanceUuid = UUID.fromString(stepInstanceId)
            def instructionUuid = UUID.fromString(instructionId)
            
            // Parse request body
            def requestData = [:]
            if (body) {
                requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            }
            
            def userId = requestData.userId as Integer
            
            // Complete instruction and send notifications
            def result = stepRepository.completeInstructionWithNotification(instructionUuid, stepInstanceUuid, userId)
            
            if (result.success) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Instruction completed successfully",
                    instructionId: instructionId,
                    stepInstanceId: stepInstanceId,
                    emailsSent: result.emailsSent
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: result.error ?: "Failed to complete instruction"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to complete instruction: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
}