package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.StepRepository
import umig.repository.StatusRepository
import umig.repository.UserRepository
import groovy.json.JsonBuilder
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID

@BaseScript CustomEndpointDelegate delegate

final StepRepository stepRepository = new StepRepository()
final StatusRepository statusRepository = new StatusRepository()
final UserRepository userRepository = new UserRepository()

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
    
    // GET /steps/instance/{stepInstanceId} - return step instance details with instructions
    if (pathParts.size() == 2 && pathParts[0] == 'instance') {
        def stepInstanceId = pathParts[1]
        
        try {
            // Try to parse as UUID first
            UUID stepInstanceUuid = UUID.fromString(stepInstanceId)
            def stepDetails = stepRepository.findStepInstanceDetailsById(stepInstanceUuid)
            
            if (!stepDetails) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Step instance not found for ID: ${stepInstanceId}"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(stepDetails).toString()).build()
            
        } catch (IllegalArgumentException e) {
            // If not a valid UUID, try to parse as step code for backward compatibility
            try {
                def stepDetails = stepRepository.findStepInstanceDetailsByCode(stepInstanceId)
                
                if (!stepDetails) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Step instance not found for code: ${stepInstanceId}"]).toString())
                        .build()
                }
                
                return Response.ok(new JsonBuilder(stepDetails).toString()).build()
                
            } catch (Exception ex) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid step instance ID format: ${stepInstanceId}"]).toString())
                    .build()
            }
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to load step details: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /steps/master - return all master steps for dropdowns
    if (pathParts.size() == 1 && pathParts[0] == 'master') {
        try {
            def masterSteps
            
            // Check if migrationId is provided as query parameter
            def migrationId = queryParams.getFirst("migrationId")
            if (migrationId) {
                try {
                    def migUuid = UUID.fromString(migrationId as String)
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
            def result = masterSteps.collect { stepItem ->
                def step = stepItem as Map
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
            def requestData = [:] as Map
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
// Note: Multi-method comment endpoints removed due to ScriptRunner limitations
// Comment functionality is handled by separate endpoints below

/**
 * GET endpoint to fetch status options for Step entities
 * Returns all statuses from status_sts table where sts_type = 'Step'
 * Used for populating the dynamic color-coded status dropdown
 */
statuses(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // GET /statuses/step - return all step statuses
    if (pathParts.size() == 1 && pathParts[0] == 'step') {
        try {
            def statuses = statusRepository.findStatusesByType('Step')
            
            return Response.ok(new JsonBuilder(statuses).toString()).build()
        } catch (Exception e) {
            log.error("Error fetching step statuses", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to fetch statuses: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /statuses/{type} - return statuses for any entity type
    if (pathParts.size() == 1) {
        def entityType = pathParts[0]
        // Capitalize first letter to match database values
        entityType = entityType.substring(0, 1).toUpperCase() + entityType.substring(1).toLowerCase()
        
        try {
            def statuses = statusRepository.findStatusesByType(entityType)
            
            if (!statuses || (statuses as List).size() == 0) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "No statuses found for type: ${entityType}"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(statuses).toString()).build()
        } catch (Exception e) {
            log.error("Error fetching statuses for type: ${entityType}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to fetch statuses: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /statuses - return all statuses
    if (pathParts.isEmpty()) {
        try {
            def statuses = statusRepository.findAllStatuses()
            
            return Response.ok(new JsonBuilder(statuses).toString()).build()
        } catch (Exception e) {
            log.error("Error fetching all statuses", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to fetch statuses: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Invalid status endpoint"]).toString())
        .build()
}

/**
 * Handles GET requests for step comments.
 * - GET /steps/{stepInstanceId}/comments -> returns all comments for a step instance
 */
comments(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // GET /steps/{stepInstanceId}/comments
    if (pathParts.size() == 2 && pathParts[1] == 'comments') {
        try {
            def stepInstanceId = UUID.fromString(pathParts[0])
            def comments = stepRepository.findCommentsByStepInstanceId(stepInstanceId)
            
            return Response.ok(new JsonBuilder(comments).toString()).build()
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid step instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to fetch comments: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Invalid comments endpoint"]).toString())
        .build()
}

/**
 * Handles POST requests for creating comments.
 * - POST /steps/{stepInstanceId}/comments -> creates a new comment
 * 
 * Request body should contain:
 * {
 *   "body": "Comment text",
 *   "userId": 123 (optional)
 * }
 */
comments(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // POST /steps/{stepInstanceId}/comments
    if (pathParts.size() == 2 && pathParts[1] == 'comments') {
        try {
            def stepInstanceId = UUID.fromString(pathParts[0])
            
            // Parse request body
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            def commentBody = requestData.body as String
            def userId = requestData.userId as Integer ?: 1 // Default to user 1 for now
            
            if (!commentBody || commentBody.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Comment body is required"]).toString())
                    .build()
            }
            
            def result = stepRepository.createComment(stepInstanceId, commentBody, userId)
            
            return Response.ok(new JsonBuilder([
                success: true,
                commentId: (result as Map).id,
                createdAt: (result as Map).createdAt
            ]).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid step instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to create comment: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Invalid comments endpoint"]).toString())
        .build()
}

/**
 * Handles PUT requests for updating comments.
 * - PUT /comments/{commentId} -> updates a comment
 * 
 * Request body should contain:
 * {
 *   "body": "Updated comment text",
 *   "userId": 123 (optional)
 * }
 */
comments(httpMethod: "PUT", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // PUT /comments/{commentId}
    if (pathParts.size() == 1) {
        try {
            def commentId = Integer.parseInt(pathParts[0])
            
            // Parse request body
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            def commentBody = requestData.body as String
            def userId = requestData.userId as Integer ?: 1 // Default to user 1 for now
            
            if (!commentBody || commentBody.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Comment body is required"]).toString())
                    .build()
            }
            
            def success = stepRepository.updateComment(commentId, commentBody, userId)
            
            if (success) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Comment updated successfully"
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Comment not found"]).toString())
                    .build()
            }
            
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid comment ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to update comment: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Invalid comments endpoint"]).toString())
        .build()
}

/**
 * Handles DELETE requests for deleting comments.
 * - DELETE /comments/{commentId} -> deletes a comment
 */
comments(httpMethod: "DELETE", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // DELETE /comments/{commentId}
    if (pathParts.size() == 1) {
        try {
            def commentId = Integer.parseInt(pathParts[0])
            def userId = 1 // Default to user 1 for now
            
            def success = stepRepository.deleteComment(commentId, userId)
            
            if (success) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Comment deleted successfully"
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Comment not found"]).toString())
                    .build()
            }
            
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid comment ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to delete comment: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Invalid comments endpoint"]).toString())
        .build()
}

/**
 * Handles GET requests for user context information.
 * - GET /user/context -> returns current user's role information
 */
user(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // GET /user/context
    if (pathParts.size() == 1 && pathParts[0] == 'context') {
        try {
            // Get user by username from query params
            def username = queryParams.getFirst('username')
            if (!username) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Username is required"]).toString())
                    .build()
            }
            
            // Find user by username (this would need a method in UserRepository)
            // For now, let's use a simple approach
            def user = userRepository.findUserByUsername(username as String)
            
            if (!user) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "User not found"]).toString())
                    .build()
            }
            
            // Return user context with role information
            def userMap = user as Map
            return Response.ok(new JsonBuilder([
                userId: userMap.usr_id,
                username: userMap.usr_code,
                firstName: userMap.usr_first_name,
                lastName: userMap.usr_last_name,
                email: userMap.usr_email,
                isAdmin: userMap.usr_is_admin,
                roleId: userMap.rls_id,
                role: userMap.role_code ?: 'NORMAL', // Default to NORMAL if no role
                isActive: userMap.usr_active
            ]).toString()).build()
            
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to get user context: ${e.message}"]).toString())
                .build()
        }
    }
    
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Invalid user endpoint"]).toString())
        .build()
}
