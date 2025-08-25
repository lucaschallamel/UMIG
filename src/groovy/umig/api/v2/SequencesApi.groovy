package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import javax.ws.rs.core.Response
import javax.ws.rs.core.MultivaluedMap
import javax.servlet.http.HttpServletRequest
import java.util.UUID
import java.sql.SQLException

/**
 * Sequences API - repositories instantiated within methods to avoid class loading issues
 */
@BaseScript CustomEndpointDelegate delegate

// Import repository at compile time but instantiate lazily
import umig.repository.SequenceRepository

/**
 * Handles GET requests for Sequences with hierarchical filtering.
 * - GET /sequences -> returns sequence instances with filtering
 * - GET /sequences/master -> returns all master sequences
 * - GET /sequences/master/{id} -> returns specific master sequence
 * - GET /sequences/instance/{id} -> returns specific sequence instance
 * - GET /sequences?migrationId={uuid} -> returns sequences in a migration
 * - GET /sequences?iterationId={uuid} -> returns sequences in an iteration
 * - GET /sequences?planId={uuid} -> returns sequences in a plan
 * - GET /sequences?teamId={int} -> returns sequences owned by a team
 * - GET /sequences?status={string} -> returns sequences with specific status
 * 
 * Multiple filters can be combined for progressive refinement.
 */
sequences(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load repositories to avoid class loading issues
    def getSequenceRepository = { ->
        return new SequenceRepository()
    }
    
    // GET /sequences/master/{id} - return specific master sequence
    if (pathParts.size() == 2 && pathParts[0] == 'master') {
        try {
            def sequenceId = UUID.fromString(pathParts[1])
            SequenceRepository sequenceRepository = getSequenceRepository()
            def masterSequence = sequenceRepository.findMasterSequenceById(sequenceId)
            
            if (!masterSequence) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master sequence not found for ID: ${sequenceId}"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(masterSequence).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid sequence ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to retrieve master sequence: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /sequences/master - return master sequences with Admin GUI support
    if (pathParts.size() == 1 && pathParts[0] == 'master') {
        try {
            SequenceRepository sequenceRepository = getSequenceRepository()
            
            def filters = [:]
            def pageNumber = 1
            def pageSize = 50
            def sortField = null
            def sortDirection = 'asc'

            // Extract query parameters
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

            // Validate sort field - must match repository allowed fields
            def allowedSortFields = ['sqm_id', 'sqm_name', 'plm_name', 'sqm_order', 'created_at', 'updated_at', 'phase_count', 'instance_count']
            if (sortField && !allowedSortFields.contains(sortField)) {
                return Response.status(400)
                    .entity(new JsonBuilder([error: "Invalid sort field: ${sortField}. Allowed fields: ${allowedSortFields.join(', ')}", code: 400]).toString())
                    .build()
            }

            def result = sequenceRepository.findMasterSequencesWithFilters(filters as Map, pageNumber as int, pageSize as int, sortField as String, sortDirection as String)
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
    
    // GET /sequences/instance/{id} - return specific sequence instance with details
    if (pathParts.size() == 2 && pathParts[0] == 'instance') {
        try {
            def instanceId = UUID.fromString(pathParts[1])
            SequenceRepository sequenceRepository = getSequenceRepository()
            def sequenceInstance = sequenceRepository.findSequenceInstanceById(instanceId)
            
            if (!sequenceInstance) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Sequence instance not found for ID: ${instanceId}"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(sequenceInstance).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid sequence instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to retrieve sequence instance: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /sequences with query parameters for hierarchical filtering
    if (pathParts.empty) {
        try {
            def filters = [:]
            
            // Extract query parameters with type safety
            if (queryParams.getFirst("migrationId")) {
                filters.migrationId = queryParams.getFirst("migrationId")
            }
            
            if (queryParams.getFirst("iterationId")) {
                filters.iterationId = queryParams.getFirst("iterationId")
            }
            
            if (queryParams.getFirst("planId")) {
                filters.planId = queryParams.getFirst("planId")
            }
            
            if (queryParams.getFirst("teamId")) {
                filters.teamId = queryParams.getFirst("teamId")
            }
            
            if (queryParams.getFirst("status")) {
                filters.status = queryParams.getFirst("status")
            }
            
            // Fetch filtered sequence instances
            SequenceRepository sequenceRepository = getSequenceRepository()
            def sequenceInstances = sequenceRepository.findSequenceInstancesByFilters(filters as Map)
            
            // Transform to consistent format
            def result = sequenceInstances.collect { sequenceItem ->
                def sequence = sequenceItem as Map
                [
                    sqi_id: sequence.sqi_id,
                    sqm_id: sequence.sqm_id,
                    pli_id: sequence.pli_id,
                    sqi_order: sequence.sqi_order,
                    sqi_name: sequence.sqi_name,
                    sqi_description: sequence.sqi_description,
                    sqi_status: sequence.sqi_status,
                    predecessor_sqi_id: sequence.predecessor_sqi_id,
                    predecessor_name: sequence.predecessor_name,
                    usr_id_owner: sequence.usr_id_owner,
                    owner_name: sequence.owner_name,
                    master_sequence_name: sequence.sqm_name,
                    plan_instance_name: sequence.pli_name,
                    plan_name: sequence.plm_name,
                    iteration_name: sequence.itr_name,
                    migration_name: sequence.mig_name,
                    team_name: sequence.tms_name,
                    created_at: sequence.created_at,
                    updated_at: sequence.updated_at
                ]
            }
            
            return Response.ok(new JsonBuilder(result).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid parameter format: ${e.message}"]).toString())
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
 * Handles POST requests for creating sequences.
 * - POST /sequences/master -> creates a new master sequence
 * - POST /sequences/instance -> creates sequence instances from master
 * 
 * Master sequence request body:
 * {
 *   "plm_id": "uuid",
 *   "sqm_order": 10,
 *   "sqm_name": "Sequence Name",
 *   "sqm_description": "Description",
 *   "predecessor_sqm_id": "uuid" (optional)
 * }
 * 
 * Instance request body:
 * {
 *   "pli_id": "uuid",
 *   "usr_id": 1
 * }
 */
sequences(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    def getSequenceRepository = { ->
        return new SequenceRepository()
    }
    
    // POST /sequences/master - create new master sequence
    if (pathParts.size() == 1 && pathParts[0] == 'master') {
        try {
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            
            // Validate required fields
            def requiredFields = ['plm_id', 'sqm_name']
            def missingFields = requiredFields.findAll { !requestData.containsKey(it) || !requestData[it] }
            
            if (missingFields) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Missing required fields: ${missingFields.join(', ')}"]).toString())
                    .build()
            }
            
            // Parse UUID with type safety (ADR-031)
            requestData.plm_id = UUID.fromString(requestData.plm_id as String)
            if (requestData.predecessor_sqm_id) {
                requestData.predecessor_sqm_id = UUID.fromString(requestData.predecessor_sqm_id as String)
            }
            if (requestData.sqm_order) {
                requestData.sqm_order = Integer.parseInt(requestData.sqm_order as String)
            }
            
            // Create master sequence
            SequenceRepository sequenceRepository = getSequenceRepository()
            def result = sequenceRepository.createMasterSequence(requestData)
            
            if (result) {
                return Response.status(Response.Status.CREATED)
                    .entity(new JsonBuilder(result).toString())
                    .build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: "Failed to create master sequence"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid UUID format or parameter type"]).toString())
                .build()
        } catch (Exception e) {
            if (e.message?.contains("duplicate key")) {
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([error: "Sequence with this name already exists in the plan"]).toString())
                    .build()
            }
            if (e.message?.contains("foreign key")) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Referenced plan or predecessor sequence does not exist"]).toString())
                    .build()
            }
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to create master sequence: ${e.message}"]).toString())
                .build()
        }
    }
    
    // POST /sequences/instance - create sequence instances from master for a plan instance
    if (pathParts.size() == 1 && pathParts[0] == 'instance') {
        try {
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            
            // Validate required fields
            def requiredFields = ['pli_id', 'usr_id']
            def missingFields = requiredFields.findAll { !requestData.containsKey(it) || !requestData[it] }
            
            if (missingFields) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Missing required fields: ${missingFields.join(', ')}"]).toString())
                    .build()
            }
            
            // Parse with type safety (ADR-031)
            def planInstanceId = UUID.fromString(requestData.pli_id as String)
            def userId = Integer.parseInt(requestData.usr_id as String)
            
            // Create sequence instances
            SequenceRepository sequenceRepository = getSequenceRepository()
            def result = sequenceRepository.createSequenceInstancesFromMaster(planInstanceId, userId)
            
            if (result) {
                // Cast to List to ensure size() method is available
                def resultList = result as List
                return Response.status(Response.Status.CREATED)
                    .entity(new JsonBuilder([
                        success: true,
                        message: "Sequence instances created successfully",
                        created_count: resultList.size(),
                        instances: resultList
                    ]).toString())
                    .build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: "Failed to create sequence instances"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid UUID format or parameter type"]).toString())
                .build()
        } catch (Exception e) {
            if (e.message?.contains("foreign key")) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Referenced plan instance does not exist"]).toString())
                    .build()
            }
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to create sequence instances: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
}

/**
 * Handles PUT requests for updating sequences.
 * - PUT /sequences/master/{id} -> updates master sequence
 * - PUT /sequences/master/{id}/order -> updates sequence order and dependencies
 * - PUT /sequences/instance/{id} -> updates sequence instance
 * - PUT /sequences/instance/{id}/status -> updates instance status
 * 
 * Request body for updates should contain only fields to update.
 * Order update body: { "sqm_order": 15, "predecessor_sqm_id": "uuid" }
 * Status update body: { "status": "IN_PROGRESS" }
 */
sequences(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    def getSequenceRepository = { ->
        return new SequenceRepository()
    }
    
    // PUT /sequences/master/{id}/order - update sequence order and dependencies
    if (pathParts.size() == 3 && pathParts[0] == 'master' && pathParts[2] == 'order') {
        try {
            def sequenceId = UUID.fromString(pathParts[1])
            
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            
            // Validate required field
            if (!requestData.sqm_order) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Missing required field: sqm_order"]).toString())
                    .build()
            }
            
            def newOrder = Integer.parseInt(requestData.sqm_order as String)
            def predecessorId = requestData.predecessor_sqm_id ? UUID.fromString(requestData.predecessor_sqm_id as String) : null
            
            SequenceRepository sequenceRepository = getSequenceRepository()
            def result = sequenceRepository.reorderMasterSequence(sequenceId, newOrder, predecessorId)
            
            if (result) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Sequence order updated successfully",
                    sequenceId: sequenceId,
                    newOrder: newOrder,
                    predecessorId: predecessorId
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master sequence not found"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid sequence ID format or parameter type"]).toString())
                .build()
        } catch (Exception e) {
            if (e.message?.contains("circular dependency")) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Update would create circular dependency"]).toString())
                    .build()
            }
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to update sequence order: ${e.message}"]).toString())
                .build()
        }
    }
    
    // PUT /sequences/master/{id} - update master sequence
    if (pathParts.size() == 2 && pathParts[0] == 'master') {
        try {
            def sequenceId = UUID.fromString(pathParts[1])
            
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            
            // Handle UUID parsing for optional fields with type safety (ADR-031)
            if (requestData.predecessor_sqm_id) {
                requestData.predecessor_sqm_id = UUID.fromString(requestData.predecessor_sqm_id as String)
            }
            if (requestData.sqm_order) {
                requestData.sqm_order = Integer.parseInt(requestData.sqm_order as String)
            }
            
            SequenceRepository sequenceRepository = getSequenceRepository()
            def result = sequenceRepository.updateMasterSequence(sequenceId, requestData)
            
            if (result) {
                return Response.ok(new JsonBuilder(result).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master sequence not found"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid sequence ID format or parameter type"]).toString())
                .build()
        } catch (Exception e) {
            if (e.message?.contains("circular dependency")) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Update would create circular dependency"]).toString())
                    .build()
            }
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to update master sequence: ${e.message}"]).toString())
                .build()
        }
    }
    
    // PUT /sequences/instance/{id}/status - update instance status
    if (pathParts.size() == 3 && pathParts[0] == 'instance' && pathParts[2] == 'status') {
        try {
            def instanceId = UUID.fromString(pathParts[1])
            
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            def statusId = requestData.statusId as Integer
            def userId = requestData.usr_id ? Integer.parseInt(requestData.usr_id as String) : null
            
            if (!statusId) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Missing required field: statusId"]).toString())
                    .build()
            }
            
            SequenceRepository sequenceRepository = getSequenceRepository()
            def result = sequenceRepository.updateSequenceInstanceStatus(instanceId, statusId, userId)
            
            if (result) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Sequence status updated successfully",
                    instanceId: instanceId,
                    newStatusId: statusId
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Sequence instance not found"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid instance ID format or parameter type"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to update sequence status: ${e.message}"]).toString())
                .build()
        }
    }
    
    // PUT /sequences/instance/{id} - update sequence instance
    if (pathParts.size() == 2 && pathParts[0] == 'instance') {
        try {
            def instanceId = UUID.fromString(pathParts[1])
            
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            
            // Handle type conversion for optional fields with type safety (ADR-031)
            if (requestData.usr_id_owner) {
                requestData.usr_id_owner = Integer.parseInt(requestData.usr_id_owner as String)
            }
            if (requestData.sqi_order) {
                requestData.sqi_order = Integer.parseInt(requestData.sqi_order as String)
            }
            if (requestData.predecessor_sqi_id) {
                requestData.predecessor_sqi_id = UUID.fromString(requestData.predecessor_sqi_id as String)
            }
            
            SequenceRepository sequenceRepository = getSequenceRepository()
            def result = sequenceRepository.updateSequenceInstance(instanceId, requestData)
            
            if (result) {
                return Response.ok(new JsonBuilder(result).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Sequence instance not found"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid instance ID format or parameter type"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to update sequence instance: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
}

/**
 * Handles DELETE requests for deleting sequences.
 * - DELETE /sequences/master/{id} -> soft delete master sequence
 * - DELETE /sequences/instance/{id} -> delete sequence instance
 * 
 * Master sequences can only be deleted if they have no active instances.
 * Restricted to administrators.
 */
sequences(httpMethod: "DELETE", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    def getSequenceRepository = { ->
        return new SequenceRepository()
    }
    
    // DELETE /sequences/master/{id} - soft delete master sequence
    if (pathParts.size() == 2 && pathParts[0] == 'master') {
        try {
            def sequenceId = UUID.fromString(pathParts[1])
            
            SequenceRepository sequenceRepository = getSequenceRepository()
            
            // Check for active instances
            if (sequenceRepository.hasSequenceInstances(sequenceId)) {
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([error: "Cannot delete master sequence with active instances"]).toString())
                    .build()
            }
            
            def result = sequenceRepository.softDeleteMasterSequence(sequenceId)
            
            if (result) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Master sequence deleted successfully"
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master sequence not found"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid sequence ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to delete master sequence: ${e.message}"]).toString())
                .build()
        }
    }
    
    // DELETE /sequences/instance/{id} - delete sequence instance
    if (pathParts.size() == 2 && pathParts[0] == 'instance') {
        try {
            def instanceId = UUID.fromString(pathParts[1])
            SequenceRepository sequenceRepository = getSequenceRepository()
            def result = sequenceRepository.deleteSequenceInstance(instanceId)
            
            if (result) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Sequence instance deleted successfully"
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Sequence instance not found"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to delete sequence instance: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
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