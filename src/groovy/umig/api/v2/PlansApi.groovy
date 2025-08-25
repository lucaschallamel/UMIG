package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import javax.ws.rs.core.Response
import javax.ws.rs.core.MultivaluedMap
import javax.servlet.http.HttpServletRequest
import java.util.UUID
import java.sql.SQLException
import org.apache.log4j.LogManager
import org.apache.log4j.Logger

/**
 * Plans API - repositories instantiated within methods to avoid class loading issues
 */
@BaseScript CustomEndpointDelegate delegate

// Import repository at compile time but instantiate lazily
import umig.repository.PlanRepository

final Logger logger = LogManager.getLogger(getClass())

/**
 * Handles GET requests for Plans with hierarchical filtering.
 * - GET /plans -> returns plan instances with filtering
 * - GET /plans/master -> returns all master plans
 * - GET /plans/master/{id} -> returns specific master plan
 * - GET /plans/instance/{id} -> returns specific plan instance
 * - GET /plans?migrationId={uuid} -> returns plans in a migration
 * - GET /plans?iterationId={uuid} -> returns plans in an iteration
 * - GET /plans?teamId={int} -> returns plans owned by a team
 * - GET /plans?statusId={int} -> returns plans with specific status
 * 
 * Multiple filters can be combined for progressive refinement.
 */
plans(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // Lazy load repositories to avoid class loading issues
    def getPlanRepository = { ->
        return new PlanRepository()
    }
    
    // GET /plans/master/{id} - return specific master plan
    if (pathParts.size() == 2 && pathParts[0] == 'master') {
        try {
            def planId = UUID.fromString(pathParts[1])
            PlanRepository planRepository = getPlanRepository()
            def masterPlan = planRepository.findMasterPlanById(planId)
            
            if (!masterPlan) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master plan not found for ID: ${planId}"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(masterPlan).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid plan ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to retrieve master plan: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /plans/master - return master plans with pagination, filtering, and sorting
    if (pathParts.size() == 1 && pathParts[0] == 'master') {
        try {
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

            // Validate sort field
            def allowedSortFields = ['plm_id', 'plm_name', 'plm_status', 'created_at', 'updated_at', 'sequence_count', 'instance_count', 'tms_name']
            if (sortField && !allowedSortFields.contains(sortField)) {
                return Response.status(400)
                    .entity(new JsonBuilder([error: "Invalid sort field: ${sortField}. Allowed fields: ${allowedSortFields.join(', ')}", code: 400]).toString())
                    .build()
            }

            PlanRepository planRepository = getPlanRepository()
            def result = planRepository.findMasterPlansWithFilters(filters as Map, pageNumber as int, pageSize as int, sortField as String, sortDirection as String)
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
    
    // GET /plans/instance/{id} - return specific plan instance with details
    if (pathParts.size() == 2 && pathParts[0] == 'instance') {
        try {
            def instanceId = UUID.fromString(pathParts[1])
            PlanRepository planRepository = getPlanRepository()
            def planInstance = planRepository.findPlanInstanceById(instanceId)
            
            if (!planInstance) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Plan instance not found for ID: ${instanceId}"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(planInstance).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid plan instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to retrieve plan instance: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /plans with query parameters for hierarchical filtering
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
            
            if (queryParams.getFirst("teamId")) {
                filters.teamId = queryParams.getFirst("teamId")
            }
            
            if (queryParams.getFirst("statusId")) {
                filters.statusId = queryParams.getFirst("statusId")
            }
            
            // Fetch filtered plan instances
            PlanRepository planRepository = getPlanRepository()
            def planInstances = planRepository.findPlanInstancesByFilters(filters)
            
            // Transform to consistent format
            def result = planInstances.collect { planItem ->
                def plan = planItem as Map
                [
                    pli_id: plan.pli_id,
                    plm_id: plan.plm_id,
                    ite_id: plan.ite_id,
                    pli_name: plan.pli_name,
                    pli_description: plan.pli_description,
                    pli_status: plan.pli_status,
                    status_name: plan.sts_name,
                    status_color: plan.sts_color,
                    usr_id_owner: plan.usr_id_owner,
                    owner_name: plan.owner_name,
                    master_plan_name: plan.plm_name,
                    iteration_name: plan.itr_name,
                    migration_name: plan.mig_name,
                    created_at: plan.created_at,
                    updated_at: plan.updated_at
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

/**
 * Handles POST requests for creating plans.
 * - POST /plans/master -> creates a new master plan
 * - POST /plans/instance -> creates a plan instance from master
 * 
 * Master plan request body:
 * {
 *   "tms_id": 1,
 *   "plm_name": "Plan Name",
 *   "plm_description": "Description",
 *   "plm_status": "DRAFT"
 * }
 * 
 * Instance request body:
 * {
 *   "plm_id": "uuid",
 *   "ite_id": "uuid",
 *   "usr_id_owner": 1,
 *   "overrides": {
 *     "pli_name": "Custom name",
 *     "pli_description": "Custom description"
 *   }
 * }
 */
plans(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    def getPlanRepository = { ->
        return new PlanRepository()
    }
    
    // POST /plans/master - create new master plan
    if (pathParts.size() == 1 && pathParts[0] == 'master') {
        try {
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            
            // Validate required fields
            def requiredFields = ['tms_id', 'plm_name', 'plm_status']
            def missingFields = requiredFields.findAll { !requestData.containsKey(it) || !requestData[it] }
            
            if (missingFields) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Missing required fields: ${missingFields.join(', ')}"]).toString())
                    .build()
            }
            
            // Type safety: Convert tms_id to integer (ADR-031)
            if (requestData.tms_id) {
                requestData.tms_id = Integer.parseInt(requestData.tms_id as String)
            }
            
            // Create master plan
            PlanRepository planRepository = getPlanRepository()
            def result = planRepository.createMasterPlan(requestData)
            
            if (result) {
                return Response.status(Response.Status.CREATED)
                    .entity(new JsonBuilder(result).toString())
                    .build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: "Failed to create master plan"]).toString())
                    .build()
            }
            
        } catch (Exception e) {
            if (e.message?.contains("duplicate key")) {
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([error: "Plan with this name already exists"]).toString())
                    .build()
            }
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to create master plan: ${e.message}"]).toString())
                .build()
        }
    }
    
    // POST /plans/instance - create plan instance from master
    if (pathParts.size() == 1 && pathParts[0] == 'instance') {
        try {
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            
            // Validate required fields
            def requiredFields = ['plm_id', 'ite_id', 'usr_id_owner']
            def missingFields = requiredFields.findAll { !requestData.containsKey(it) || !requestData[it] }
            
            if (missingFields) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Missing required fields: ${missingFields.join(', ')}"]).toString())
                    .build()
            }
            
            // Parse UUIDs with type safety
            def masterPlanId = UUID.fromString(requestData.plm_id as String)
            def iterationId = UUID.fromString(requestData.ite_id as String)
            
            // Build overrides Map from optional fields
            Map<String, Object> overrides = [:]
            if (requestData.pli_name) {
                overrides.pli_name = requestData.pli_name
            }
            if (requestData.pli_description) {
                overrides.pli_description = requestData.pli_description
            }
            
            // Create plan instance
            PlanRepository planRepository = getPlanRepository()
            def result = planRepository.createPlanInstance(masterPlanId, iterationId, requestData.usr_id_owner as Integer, overrides)
            
            if (result) {
                return Response.status(Response.Status.CREATED)
                    .entity(new JsonBuilder(result).toString())
                    .build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: "Failed to create plan instance"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid UUID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to create plan instance: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
}

/**
 * Handles PUT requests for updating plans.
 * - PUT /plans/master/{id} -> updates master plan
 * - PUT /plans/instance/{id} -> updates plan instance
 * - PUT /plans/{id}/status -> updates instance status
 * 
 * Request body for updates should contain only fields to update.
 */
plans(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    def getPlanRepository = { ->
        return new PlanRepository()
    }
    
    // PUT /plans/master/{id} - update master plan
    if (pathParts.size() == 2 && pathParts[0] == 'master') {
        try {
            def planId = UUID.fromString(pathParts[1])
            
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            PlanRepository planRepository = getPlanRepository()
            def result = planRepository.updateMasterPlan(planId, requestData)
            
            if (result) {
                return Response.ok(new JsonBuilder(result).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master plan not found"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid plan ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to update master plan: ${e.message}"]).toString())
                .build()
        }
    }
    
    // PUT /plans/instance/{id} - update plan instance
    if (pathParts.size() == 2 && pathParts[0] == 'instance') {
        try {
            def instanceId = UUID.fromString(pathParts[1])
            
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            PlanRepository planRepository = getPlanRepository()
            def result = planRepository.updatePlanInstance(instanceId, requestData)
            
            if (result) {
                return Response.ok(new JsonBuilder(result).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Plan instance not found"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to update plan instance: ${e.message}"]).toString())
                .build()
        }
    }
    
    // PUT /plans/{id}/status - update instance status
    if (pathParts.size() == 2 && pathParts[1] == 'status') {
        try {
            def instanceId = UUID.fromString(pathParts[0])
            
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def requestData = new groovy.json.JsonSlurper().parseText(body) as Map
            def statusId = requestData.statusId as Integer
            
            if (!statusId) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Missing required field: statusId"]).toString())
                    .build()
            }
            
            PlanRepository planRepository = getPlanRepository()
            def result = planRepository.updatePlanInstanceStatus(instanceId, statusId)
            
            if (result) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Plan status updated successfully",
                    planInstanceId: instanceId,
                    newStatusId: statusId
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Plan instance not found"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to update plan status: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
}

/**
 * Handles DELETE requests for deleting plans.
 * - DELETE /plans/master/{id} -> soft delete master plan
 * - DELETE /plans/instance/{id} -> delete plan instance
 * 
 * Master plans can only be deleted if they have no active instances.
 * Restricted to administrators.
 */
plans(httpMethod: "DELETE", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    def getPlanRepository = { ->
        return new PlanRepository()
    }
    
    // DELETE /plans/master/{id} - soft delete master plan
    if (pathParts.size() == 2 && pathParts[0] == 'master') {
        try {
            def planId = UUID.fromString(pathParts[1])
            
            PlanRepository planRepository = getPlanRepository()
            
            // Check for active instances
            if (planRepository.hasPlanInstances(planId)) {
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([error: "Cannot delete master plan with active instances"]).toString())
                    .build()
            }
            
            def result = planRepository.softDeleteMasterPlan(planId)
            
            if (result) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Master plan deleted successfully"
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master plan not found"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid plan ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to delete master plan: ${e.message}"]).toString())
                .build()
        }
    }
    
    // DELETE /plans/instance/{id} - delete plan instance
    if (pathParts.size() == 2 && pathParts[0] == 'instance') {
        try {
            def instanceId = UUID.fromString(pathParts[1])
            PlanRepository planRepository = getPlanRepository()
            def result = planRepository.deletePlanInstance(instanceId)
            
            if (result) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: "Plan instance deleted successfully"
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Plan instance not found"]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid instance ID format"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to delete plan instance: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
}
