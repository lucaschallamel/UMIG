package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.PlanRepository
import umig.repository.StatusRepository
import umig.repository.UserRepository
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID

@BaseScript CustomEndpointDelegate delegate

final PlanRepository planRepository = new PlanRepository()
final StatusRepository statusRepository = new StatusRepository()
final UserRepository userRepository = new UserRepository()

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
    
    // GET /plans/master/{id} - return specific master plan
    if (pathParts.size() == 2 && pathParts[0] == 'master') {
        try {
            def planId = UUID.fromString(pathParts[1])
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
    
    // GET /plans/master - return all master plans
    if (pathParts.size() == 1 && pathParts[0] == 'master') {
        try {
            def masterPlans = planRepository.findAllMasterPlans()
            
            // Transform to consistent format
            def result = masterPlans.collect { planItem ->
                def plan = planItem as Map
                [
                    plm_id: plan.plm_id,
                    tms_id: plan.tms_id,
                    plm_name: plan.plm_name,
                    plm_description: plan.plm_description,
                    plm_status: plan.plm_status,
                    status_name: plan.sts_name,
                    status_color: plan.sts_color,
                    team_name: plan.tms_name,
                    created_by: plan.created_by,
                    created_at: plan.created_at,
                    updated_by: plan.updated_by,
                    updated_at: plan.updated_at
                ]
            }
            
            return Response.ok(new JsonBuilder(result).toString()).build()
            
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to fetch master plans: ${e.message}"]).toString())
                .build()
        }
    }
    
    // GET /plans/instance/{id} - return specific plan instance with details
    if (pathParts.size() == 2 && pathParts[0] == 'instance') {
        try {
            def instanceId = UUID.fromString(pathParts[1])
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
            
            // Create master plan
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
    
    // DELETE /plans/master/{id} - soft delete master plan
    if (pathParts.size() == 2 && pathParts[0] == 'master') {
        try {
            def planId = UUID.fromString(pathParts[1])
            
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
