package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.InstructionRepository
import umig.repository.StatusRepository
import umig.repository.UserRepository
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import groovy.json.JsonException
import java.sql.SQLException
import java.util.UUID
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

/**
 * Instructions API - REST endpoint for instruction management
 */
@BaseScript CustomEndpointDelegate delegate

// Repository accessors using closure pattern for proper scoping
def getInstructionRepository = { ->
    return new InstructionRepository()
}

def getStatusRepository = { ->
    return new StatusRepository()
}

def getUserRepository = { ->
    return new UserRepository()
}

/**
 * Handles GET requests for Instructions with hierarchical filtering.
 * Endpoint 1: GET /instructions -> returns all master instructions
 * Endpoint 2: GET /instructions?stepId={uuid} -> filter by step
 * Endpoint 3: GET /instructions/instance/{id} -> return instance details
 * Endpoint 13: GET /instructions/analytics/progress -> return progress metrics
 * Endpoint 14: GET /instructions/analytics/completion -> return completion statistics
 * 
 * Multiple filters can be combined for progressive refinement.
 * Results are ordered by instruction order within each step.
 */
instructions(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // Route to appropriate handler based on path structure
        if (pathParts.size() == 2 && pathParts[0] == 'analytics' && pathParts[1] == 'progress') {
            return handleAnalyticsProgressRequest(queryParams)
        }
        
        if (pathParts.size() == 2 && pathParts[0] == 'analytics' && pathParts[1] == 'completion') {
            return handleAnalyticsCompletionRequest(queryParams)
        }
        
        if (pathParts.size() == 2 && pathParts[0] == 'instance') {
            return handleInstanceDetailsRequest(pathParts[1])
        }
        
        // GET /instructions/master - return master instructions with Admin GUI support
        if (pathParts.size() == 1 && pathParts[0] == 'master') {
            return handleMasterInstructionsRequest(queryParams)
        }
        
        if (pathParts.empty) {
            return handleInstructionsFilterRequest(queryParams)
        }
        
        // Invalid path
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
 * Handles GET /instructions/analytics/progress requests
 * Returns progress metrics with hierarchical filtering support
 */
def handleAnalyticsProgressRequest(MultivaluedMap queryParams) {
    def filters = extractHierarchicalFilters(queryParams)
    def instructionRepository = getInstructionRepository()
    def progressMetrics = instructionRepository.findInstructionsWithHierarchicalFiltering(filters)
    
    def metrics = progressMetrics as Map
    return Response.ok(new JsonBuilder([
        total_instructions: metrics.total,
        completed_instructions: metrics.completed,
        pending_instructions: metrics.pending,
        completion_percentage: metrics.completion_percentage,
        instructions: metrics.instructions
    ]).toString()).build()
}

/**
 * Handles GET /instructions/analytics/completion requests
 * Returns completion statistics based on migration, team, or iteration filters
 */
def handleAnalyticsCompletionRequest(MultivaluedMap queryParams) {
    def migrationId = queryParams.getFirst("migrationId") as String
    def teamId = queryParams.getFirst("teamId") as String
    def iterationId = queryParams.getFirst("iterationId") as String
    
    if (migrationId) {
        return handleCompletionByMigration(migrationId)
    } else if (teamId && iterationId) {
        return handleTeamWorkload(teamId, iterationId)
    } else if (teamId) {
        return handleCompletionByTeam(teamId)
    } else {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Missing required parameter: migrationId or teamId"]).toString())
            .build()
    }
}

/**
 * Handles GET /instructions/instance/{id} requests
 * Returns specific instruction instance details
 */
def handleInstanceDetailsRequest(String instanceId) {
    try {
        // Type safety per ADR-031
        UUID instanceUuid = UUID.fromString(instanceId)
        def instructionRepository = getInstructionRepository()
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

/**
 * Handles GET /instructions requests with query parameters
 * Filters instructions by step master ID or step instance ID
 */
def handleInstructionsFilterRequest(MultivaluedMap queryParams) {
    def stepId = queryParams.getFirst("stepId") as String
    def stepInstanceId = queryParams.getFirst("stepInstanceId") as String
    
    if (stepId) {
        return handleInstructionsByStepId(stepId)
    } else if (stepInstanceId) {
        return handleInstructionsByStepInstanceId(stepInstanceId)
    } else {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "stepId or stepInstanceId parameter required"]).toString())
            .build()
    }
}

/**
 * Extracts hierarchical filters from query parameters
 */
private Map extractHierarchicalFilters(MultivaluedMap queryParams) {
    def filters = [:]
    
    if (queryParams.getFirst("migrationId")) {
        filters.migrationId = queryParams.getFirst("migrationId") as String
    }
    if (queryParams.getFirst("iterationId")) {
        filters.iterationId = queryParams.getFirst("iterationId") as String
    }
    if (queryParams.getFirst("planInstanceId")) {
        filters.planInstanceId = queryParams.getFirst("planInstanceId") as String
    }
    if (queryParams.getFirst("sequenceInstanceId")) {
        filters.sequenceInstanceId = queryParams.getFirst("sequenceInstanceId") as String
    }
    if (queryParams.getFirst("phaseInstanceId")) {
        filters.phaseInstanceId = queryParams.getFirst("phaseInstanceId") as String
    }
    if (queryParams.getFirst("stepInstanceId")) {
        filters.stepInstanceId = queryParams.getFirst("stepInstanceId") as String
    }
    if (queryParams.getFirst("teamId")) {
        filters.teamId = queryParams.getFirst("teamId") as String
    }
    
    return filters
}

/**
 * Handles GET /instructions/master requests
 * Returns master instructions with Admin GUI support (pagination, sorting, filtering)
 */
def handleMasterInstructionsRequest(MultivaluedMap queryParams) {
    try {
        // Extract query parameters for Admin GUI support
        def filters = [:]
        def pageNumber = 1
        def pageSize = 50
        def sortField = null
        def sortDirection = 'asc'

        // Extract standard parameters
        queryParams.keySet().each { param ->
            def value = queryParams.getFirst(param)
            switch (param) {
                case 'page':
                    pageNumber = Integer.parseInt(value as String)
                    break
                case 'size':
                    pageSize = Integer.parseInt(value as String)
                    break
                case 'sort':
                    sortField = value as String
                    break
                case 'direction':
                    sortDirection = value as String
                    break
                default:
                    filters[param] = value
            }
        }

        // Validate sort field
        def allowedSortFields = ['inm_id', 'inm_name', 'inm_status', 'created_at', 'updated_at', 'instance_count', 'control_count']
        if (sortField && !allowedSortFields.contains(sortField)) {
            return Response.status(400)
                .entity(new JsonBuilder([error: "Invalid sort field: ${sortField}. Allowed fields: ${allowedSortFields.join(', ')}", code: 400]).toString())
                .build()
        }

        def instructionRepository = getInstructionRepository()
        def result = instructionRepository.findMasterInstructionsWithFilters(filters as Map, pageNumber as int, pageSize as int, sortField as String, sortDirection as String)
        return Response.ok(new JsonBuilder(result).toString()).build()
    } catch (SQLException e) {
        def statusCode = mapSqlStateToHttpStatus(e.getSQLState())
        return Response.status(statusCode)
            .entity(new JsonBuilder([error: e.message, code: statusCode]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(500)
            .entity(new JsonBuilder([error: "Internal server error", code: 500]).toString())
            .build()
    }
}

/**
 * Handles completion statistics by migration ID
 */
def handleCompletionByMigration(String migrationId) {
    try {
        // Type safety per ADR-031
        def migUuid = UUID.fromString(migrationId as String)
        def instructionRepository = getInstructionRepository()
        def stats = instructionRepository.getInstructionStatisticsByMigration(migUuid)
        return Response.ok(new JsonBuilder(stats).toString()).build()
    } catch (IllegalArgumentException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid migration ID format"]).toString())
            .build()
    }
}

/**
 * Handles team workload calculation by team and iteration
 */
def handleTeamWorkload(String teamId, String iterationId) {
    try {
        // Type safety per ADR-031
        def tmsId = Integer.parseInt(teamId as String)
        def iteUuid = UUID.fromString(iterationId as String)
        def instructionRepository = getInstructionRepository()
        def workload = instructionRepository.getTeamWorkload(tmsId, iteUuid)
        return Response.ok(new JsonBuilder(workload).toString()).build()
    } catch (IllegalArgumentException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid team ID or iteration ID format"]).toString())
            .build()
    } catch (NumberFormatException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid team ID format"]).toString())
            .build()
    }
}

/**
 * Handles completion statistics by team ID
 */
def handleCompletionByTeam(String teamId) {
    try {
        // Type safety per ADR-031
        def tmsId = Integer.parseInt(teamId as String)
        def instructionRepository = getInstructionRepository()
        def stats = instructionRepository.getInstructionStatisticsByTeam(tmsId)
        return Response.ok(new JsonBuilder(stats).toString()).build()
    } catch (NumberFormatException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid team ID format"]).toString())
            .build()
    }
}

/**
 * Handles instructions filtered by step master ID
 */
def handleInstructionsByStepId(String stepId) {
    try {
        // Type safety per ADR-031
        def stmUuid = UUID.fromString(stepId as String)
        def instructionRepository = getInstructionRepository()
        def instructions = instructionRepository.findMasterInstructionsByStepId(stmUuid)
        return Response.ok(new JsonBuilder(instructions).toString()).build()
    } catch (IllegalArgumentException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid step ID format"]).toString())
            .build()
    }
}

/**
 * Handles instructions filtered by step instance ID
 */
def handleInstructionsByStepInstanceId(String stepInstanceId) {
    try {
        // Type safety per ADR-031
        def stiUuid = UUID.fromString(stepInstanceId as String)
        def instructionRepository = getInstructionRepository()
        def instructions = instructionRepository.findInstanceInstructionsByStepInstanceId(stiUuid)
        return Response.ok(new JsonBuilder(instructions).toString()).build()
    } catch (IllegalArgumentException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid step instance ID format"]).toString())
            .build()
    }
}

/**
 * Handles POST requests for Instructions.
 * Endpoint 4: POST /instructions -> create master instruction
 * Endpoint 5: POST /instructions/instance -> create instruction instance
 * Endpoint 6: POST /instructions/bulk -> handle bulk creation
 * 
 * Request body should contain appropriate instruction data based on endpoint.
 */
instructions(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // POST /instructions/bulk - handle bulk creation
        if (pathParts.size() == 1 && pathParts[0] == 'bulk') {
            // Parse request body
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
            
            def masterInstructions = instructions.findAll { (it as Map).type == 'master' || !(it as Map).containsKey('type') }
            def instanceInstructions = instructions.findAll { (it as Map).type == 'instance' }
            
            def created = []
            def errors = []
            
            // Process master instructions
            masterInstructions.each { instruction ->
                try {
                    def instructionMap = instruction as Map
                    def instructionParams = [
                        stmId: instructionMap.stmId,
                        tmsId: instructionMap.tmsId,
                        ctmId: instructionMap.ctmId,
                        inmOrder: instructionMap.inmOrder,
                        inmBody: instructionMap.inmBody,
                        inmDurationMinutes: instructionMap.inmDurationMinutes
                    ]
                    
                    def instructionRepository = getInstructionRepository()
                    def createdId = instructionRepository.createMasterInstruction(instructionParams)
                    created << [type: 'master', inmId: createdId, originalData: instruction]
                    
                } catch (Exception e) {
                    errors << [type: 'master', error: e.message, originalData: instruction]
                }
            }
            
            // Process instance instructions
            instanceInstructions.each { instruction ->
                try {
                    def instructionMap = instruction as Map
                    def stiId = UUID.fromString(instructionMap.stiId as String)
                    def inmIds = (instructionMap.inmIds as List).collect { UUID.fromString(it as String) }
                    
                    def instructionRepository = getInstructionRepository()
                    def createdInstanceIds = instructionRepository.createInstanceInstructions(stiId, inmIds)
                    createdInstanceIds.each { instanceId ->
                        created << [type: 'instance', iniId: instanceId, originalData: instruction]
                    }
                    
                } catch (Exception e) {
                    errors << [type: 'instance', error: e.message, originalData: instruction]
                }
            }
            
            if (errors.isEmpty()) {
                return Response.status(Response.Status.CREATED)
                    .entity(new JsonBuilder([
                        success: true,
                        created: created,
                        errors: errors,
                        summary: [
                            total_requested: instructions.size(),
                            successful: created.size(),
                            failed: errors.size()
                        ]
                    ]).toString()).build()
            } else {
                return Response.ok()
                    .entity(new JsonBuilder([
                        success: false,
                        created: created,
                        errors: errors,
                        summary: [
                            total_requested: instructions.size(),
                            successful: created.size(),
                            failed: errors.size()
                        ]
                    ]).toString()).build()
            }
        }
        
        // POST /instructions/instance - create instruction instance
        if (pathParts.size() == 1 && pathParts[0] == 'instance') {
            // Parse request body
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
                // Type safety per ADR-031
                def stepInstanceUuid = UUID.fromString(stiId as String)
                def masterInstructionUuids = inmIds.collect { UUID.fromString(it as String) }
                
                def instructionRepository = getInstructionRepository()
                def createdInstanceIds = instructionRepository.createInstanceInstructions(stepInstanceUuid, masterInstructionUuids)
                
                return Response.status(Response.Status.CREATED)
                    .entity(new JsonBuilder([
                        success: true,
                        message: "Instruction instances created successfully",
                        stepInstanceId: stiId,
                        createdInstances: createdInstanceIds
                    ]).toString()).build()
                    
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Referenced step instance or master instruction does not exist"]).toString())
                    .build()
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
        
        // POST /instructions - create master instruction
        if (pathParts.empty) {
            // Parse request body
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
                def instructionParams = [
                    stmId: stmId,
                    tmsId: requestData.tmsId,
                    ctmId: requestData.ctmId,
                    inmOrder: inmOrder,
                    inmBody: inmBody,
                    inmDurationMinutes: requestData.inmDurationMinutes
                ]
                
                def instructionRepository = getInstructionRepository()
                def createdId = instructionRepository.createMasterInstruction(instructionParams)
                
                return Response.status(Response.Status.CREATED)
                    .entity(new JsonBuilder([
                        success: true,
                        message: "Master instruction created successfully",
                        inmId: createdId
                    ]).toString()).build()
                    
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Referenced step, team, or control does not exist"]).toString())
                    .build()
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
        
        // Invalid path
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
 * Handles PUT requests for Instructions.
 * Endpoint 7: PUT /instructions/{id} -> update master instruction
 * Endpoint 8: PUT /instructions/instance/{id} -> update instance status
 * Endpoint 9: PUT /instructions/bulk -> handle bulk updates
 * 
 * Request body should contain appropriate update data based on endpoint.
 */
instructions(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // PUT /instructions/bulk - handle bulk updates
        if (pathParts.size() == 1 && pathParts[0] == 'bulk') {
            // Parse request body
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
            
            def masterUpdates = updates.findAll { (it as Map).type == 'master' || !(it as Map).containsKey('type') }
            def instanceUpdates = updates.findAll { (it as Map).type == 'instance' }
            
            def updated = []
            def errors = []
            
            // Process master instruction updates
            masterUpdates.each { update ->
                try {
                    def updateMap = update as Map
                    def inmId = UUID.fromString(updateMap.inmId as String)
                    def updateParams = [:]
                    
                    if (updateMap.containsKey('tmsId')) updateParams.tmsId = updateMap.tmsId
                    if (updateMap.containsKey('ctmId')) updateParams.ctmId = updateMap.ctmId
                    if (updateMap.containsKey('inmOrder')) updateParams.inmOrder = updateMap.inmOrder
                    if (updateMap.containsKey('inmBody')) updateParams.inmBody = updateMap.inmBody
                    if (updateMap.containsKey('inmDurationMinutes')) updateParams.inmDurationMinutes = updateMap.inmDurationMinutes
                    
                    def instructionRepository = getInstructionRepository()
                    def affectedRows = instructionRepository.updateMasterInstruction(inmId, updateParams)
                    if ((affectedRows as Integer) > 0) {
                        updated << [type: 'master', inmId: inmId, originalData: updateMap]
                    } else {
                        errors << [type: 'master', error: "Instruction not found", originalData: updateMap]
                    }
                    
                } catch (Exception e) {
                    errors << [type: 'master', error: e.message, originalData: update]
                }
            }
            
            // Process instance instruction updates (status completion)
            instanceUpdates.each { update ->
                try {
                    def updateMap = update as Map
                    def iniId = UUID.fromString(updateMap.iniId as String)
                    def userId = updateMap.userId ? Integer.parseInt(updateMap.userId as String) : null
                    
                    if (updateMap.action == 'complete' && userId) {
                        def instructionRepository = getInstructionRepository()
                        def affectedRows = instructionRepository.completeInstruction(iniId, userId)
                        if ((affectedRows as Integer) > 0) {
                            updated << [type: 'instance', iniId: iniId, action: 'completed', originalData: updateMap]
                        } else {
                            errors << [type: 'instance', error: "Instruction instance not found or already completed", originalData: updateMap]
                        }
                    } else if (updateMap.action == 'uncomplete') {
                        def instructionRepository = getInstructionRepository()
                        def affectedRows = instructionRepository.uncompleteInstruction(iniId)
                        if ((affectedRows as Integer) > 0) {
                            updated << [type: 'instance', iniId: iniId, action: 'uncompleted', originalData: updateMap]
                        } else {
                            errors << [type: 'instance', error: "Instruction instance not found or not completed", originalData: updateMap]
                        }
                    } else {
                        errors << [type: 'instance', error: "Invalid action or missing userId for completion", originalData: updateMap]
                    }
                    
                } catch (Exception e) {
                    errors << [type: 'instance', error: e.message, originalData: update]
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
        
        // PUT /instructions/instance/{id} - update instance status
        if (pathParts.size() == 2 && pathParts[0] == 'instance') {
            def instanceId = pathParts[1]
            
            try {
                // Type safety per ADR-031
                def instanceUuid = UUID.fromString(instanceId)
                
                // Parse request body
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
                    
                    def instructionRepository = getInstructionRepository()
                    def affectedRows = instructionRepository.completeInstruction(instanceUuid, userId)
                    if ((affectedRows as Integer) > 0) {
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
                    def instructionRepository = getInstructionRepository()
                    def affectedRows = instructionRepository.uncompleteInstruction(instanceUuid)
                    if ((affectedRows as Integer) > 0) {
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
            } catch (SQLException e) {
                if (e.getSQLState() == '23503') {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "User does not exist"]).toString())
                        .build()
                }
                throw e
            }
        }
        
        // PUT /instructions/{id} - update master instruction
        if (pathParts.size() == 1) {
            def instructionId = pathParts[0]
            
            try {
                // Type safety per ADR-031
                def instructionUuid = UUID.fromString(instructionId)
                
                // Parse request body
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
                
                def instructionRepository = getInstructionRepository()
                def affectedRows = instructionRepository.updateMasterInstruction(instructionUuid, updateParams)
                
                if ((affectedRows as Integer) > 0) {
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
            } catch (SQLException e) {
                if (e.getSQLState() == '23503') {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Referenced team or control does not exist"]).toString())
                        .build()
                } else if (e.getSQLState() == '23505') {
                    return Response.status(Response.Status.CONFLICT)
                        .entity(new JsonBuilder([error: "Instruction order already exists for this step"]).toString())
                        .build()
                }
                throw e
            }
        }
        
        // Invalid path
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
 * Handles DELETE requests for Instructions.
 * Endpoint 10: DELETE /instructions/{id} -> delete master instruction
 * Endpoint 11: DELETE /instructions/instance/{id} -> delete instance
 * Endpoint 12: DELETE /instructions/bulk -> handle bulk deletion
 */
instructions(httpMethod: "DELETE", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // DELETE /instructions/bulk - handle bulk deletion
        if (pathParts.size() == 1 && pathParts[0] == 'bulk') {
            // Parse request body
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
            
            def masterDeletions = deletions.findAll { (it as Map).type == 'master' || !(it as Map).containsKey('type') }
            def instanceDeletions = deletions.findAll { (it as Map).type == 'instance' }
            
            def deleted = []
            def errors = []
            
            // Process instance deletions first (foreign key constraints)
            instanceDeletions.each { deletion ->
                try {
                    def deletionMap = deletion as Map
                    def iniId = UUID.fromString(deletionMap.iniId as String)
                    def instructionRepository = getInstructionRepository()
                    def affectedRows = instructionRepository.deleteInstanceInstruction(iniId)
                    
                    if ((affectedRows as Integer) > 0) {
                        deleted << [type: 'instance', iniId: iniId, originalData: deletionMap]
                    } else {
                        errors << [type: 'instance', error: "Instruction instance not found", originalData: deletionMap]
                    }
                    
                } catch (Exception e) {
                    errors << [type: 'instance', error: e.message, originalData: deletion]
                }
            }
            
            // Process master instruction deletions
            masterDeletions.each { deletion ->
                try {
                    def deletionMap = deletion as Map
                    def inmId = UUID.fromString(deletionMap.inmId as String)
                    def instructionRepository = getInstructionRepository()
                    def affectedRows = instructionRepository.deleteMasterInstruction(inmId)
                    if ((affectedRows as Integer) > 0) {
                        deleted << [type: 'master', inmId: inmId, originalData: deletionMap]
                    } else {
                        errors << [type: 'master', error: "Instruction not found", originalData: deletionMap]
                    }
                    
                } catch (Exception e) {
                    errors << [type: 'master', error: e.message, originalData: deletion]
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
        
        // DELETE /instructions/instance/{id} - delete instance
        if (pathParts.size() == 2 && pathParts[0] == 'instance') {
            def instanceId = pathParts[1]
            
            try {
                // Type safety per ADR-031
                UUID instanceUuid = UUID.fromString(instanceId)
                
                def instructionRepository = getInstructionRepository()
                def affectedRows = instructionRepository.deleteInstanceInstruction(instanceUuid)
                
                if ((affectedRows as Integer) > 0) {
                    return Response.ok(new JsonBuilder([
                        success: true,
                        message: "Instruction instance deleted successfully",
                        iniId: instanceId
                    ]).toString()).build()
                } else {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Instruction instance not found"]).toString())
                        .build()
                }
                    
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid instruction instance ID format"]).toString())
                    .build()
            }
        }
        
        // DELETE /instructions/{id} - delete master instruction
        if (pathParts.size() == 1) {
            def instructionId = pathParts[0]
            
            try {
                // Type safety per ADR-031
                def instructionUuid = UUID.fromString(instructionId)
                
                def instructionRepository = getInstructionRepository()
                def affectedRows = instructionRepository.deleteMasterInstruction(instructionUuid)
                
                if ((affectedRows as Integer) > 0) {
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
        
        // Invalid path
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
 * GET endpoint to fetch status options for Instruction entities
 * Returns all statuses from status_sts table where sts_type = 'Instruction'
 * Used for populating dynamic status dropdowns
 */
statuses(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // GET /statuses/instruction - return all instruction statuses
    if (pathParts.size() == 1 && pathParts[0] == 'instruction') {
        try {
            def statusRepository = getStatusRepository()
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
 * Additional utility endpoints for instruction management
 * These support the complete instruction lifecycle management
 */

/**
 * POST endpoint to reorder master instructions within a step
 * Supports drag-and-drop reordering functionality
 */
reorder(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    
    try {
        // Parse request body
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
            // Type safety per ADR-031
            def stepUuid = UUID.fromString(stmId as String)
            def instructionRepository = getInstructionRepository()
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
        } catch (SQLException e) {
            if (e.getSQLState() == '23505') {
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([error: "Duplicate order values detected"]).toString())
                    .build()
            }
            throw e
        }
        
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
            .build()
    }
}

/**
 * GET endpoint to retrieve instruction completion timeline for analytics
 * Supports project management and reporting needs
 */
timeline(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    
    def iterationId = queryParams.getFirst("iterationId") as String
    
    if (!iterationId) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Missing required parameter: iterationId"]).toString())
            .build()
    }
    
    try {
        // Type safety per ADR-031
        def iterationUuid = UUID.fromString(iterationId as String)
        def instructionRepository = getInstructionRepository()
        def timeline = instructionRepository.getInstructionCompletionTimeline(iterationUuid)
        
        return Response.ok(new JsonBuilder([
            iterationId: iterationId,
            timeline: timeline,
            total_completed: (timeline as List).size()
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

/**
 * Maps SQL state codes to appropriate HTTP status codes
 */
private static int mapSqlStateToHttpStatus(String sqlState) {
    switch (sqlState) {
        case '23503': return 400 // Foreign key violation
        case '23505': return 409 // Unique violation
        case '23514': return 400 // Check constraint violation
        default: return 500     // General server error
    }
}