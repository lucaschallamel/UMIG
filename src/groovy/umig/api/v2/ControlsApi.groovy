package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.ControlRepository
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.json.JsonException
import groovy.transform.BaseScript
import groovy.transform.TypeCheckingMode
import groovy.transform.TypeChecked

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException
import java.util.UUID

@TypeChecked(TypeCheckingMode.SKIP)
@SuppressWarnings(['GroovyUnusedDeclaration', 'GrMethodMayBeStatic'])
@BaseScript CustomEndpointDelegate delegate

final ControlRepository controlRepository = new ControlRepository()

/**
 * Handles error responses with proper SQL state mapping
 */
private Response handleError(Exception e) {
    if (e instanceof SQLException) {
        def sqlState = e.getSQLState()
        switch (sqlState) {
            case '23503': // Foreign key violation
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Foreign key constraint violation: ${e.message}"]).toString())
                    .build()
            case '23505': // Unique violation
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([error: "Unique constraint violation: ${e.message}"]).toString())
                    .build()
            case '23514': // Check constraint violation
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Check constraint violation: ${e.message}"]).toString())
                    .build()
            default:
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: "Database error: ${e.message}"]).toString())
                    .build()
        }
    } else if (e instanceof IllegalArgumentException) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: e.message]).toString())
            .build()
    } else {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
            .build()
    }
}

/**
 * Builds standardized success responses with consistent JSON formatting.
 * This ensures all successful API responses follow the same pattern.
 * @param data The data to return in the response body
 * @param status The HTTP status code (defaults to OK/200)
 * @return Response object with JSON body
 */
private Response buildSuccessResponse(Object data, Response.Status status = Response.Status.OK) {
    return Response.status(status)
        .entity(new JsonBuilder(data).toString())
        .build()
}

// ==================== CONTROLS API - GET ENDPOINTS ====================

/**
 * Handles GET requests for controls.
 * - GET /controls/master -> returns all master controls
 * - GET /controls/master/{ctm_id} -> returns specific master control
 * - GET /controls/master?phaseId={phm_id} -> returns controls filtered by phase
 * - GET /controls/instance -> returns all control instances
 * - GET /controls/instance/{cti_id} -> returns specific control instance
 * - GET /controls/{phi_id}/progress -> returns phase control progress
 */
controls(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // ==================== MASTER CONTROL GET OPERATIONS ====================
        
        // GET /controls/master/{ctm_id} - get specific master control
        if (pathParts.size() == 2 && pathParts[0] == 'master') {
            def controlId = UUID.fromString(pathParts[1] as String)
            def control = controlRepository.findMasterControlById(controlId)
            
            if (!control) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master control not found"]).toString())
                    .build()
            }
            
            return buildSuccessResponse(control)
        }
        
        // GET /controls/master with optional filtering
        if (pathParts.size() == 1 && pathParts[0] == 'master') {
            def controls
            
            // Filter by phase ID if provided
            if (queryParams.getFirst("phaseId")) {
                def phaseId = UUID.fromString(queryParams.getFirst("phaseId") as String)
                controls = controlRepository.findMasterControlsByPhaseId(phaseId)
            } else {
                controls = controlRepository.findAllMasterControls()
            }
            
            return buildSuccessResponse(controls)
        }
        
        // ==================== INSTANCE CONTROL GET OPERATIONS ====================
        
        // GET /controls/instance/{cti_id} - get specific control instance
        if (pathParts.size() == 2 && pathParts[0] == 'instance') {
            def instanceId = UUID.fromString(pathParts[1] as String)
            def instance = controlRepository.findControlInstanceById(instanceId)
            
            if (!instance) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Control instance not found"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(instance).toString()).build()
        }
        
        // GET /controls/instance with hierarchical filtering
        if (pathParts.size() == 1 && pathParts[0] == 'instance') {
            def filters = [:]
            
            // ADR-031: Type safety for all filters
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
            
            if (queryParams.getFirst("teamId")) {
                filters.teamId = queryParams.getFirst("teamId") as String
            }
            
            if (queryParams.getFirst("statusId")) {
                filters.statusId = queryParams.getFirst("statusId") as String
            }
            
            def instances = controlRepository.findControlInstances(filters)
            return buildSuccessResponse(instances)
        }
        
        // ==================== PROGRESS GET OPERATIONS ====================
        
        // GET /controls/{phi_id}/progress - get phase control progress
        if (pathParts.size() == 2 && pathParts[1] == 'progress') {
            def phaseId = UUID.fromString(pathParts[0] as String)
            def progress = controlRepository.calculatePhaseControlProgress(phaseId)
            
            return buildSuccessResponse(progress)
        }
        
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
            .build()
            
    } catch (Exception e) {
        return handleError(e)
    }
}

// ==================== CONTROLS API - POST ENDPOINTS ====================

/**
 * Handles POST requests for controls.
 * - POST /controls/master -> creates new master control
 * - POST /controls/master/{ctm_id}/instantiate -> creates instances from master
 * - POST /controls/instance -> creates new control instance
 * - POST /controls/master/bulk -> creates multiple master controls
 * - POST /controls/instance/bulk -> creates multiple control instances
 */
controls(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // ==================== MASTER CONTROL POST OPERATIONS ====================
        
        // POST /controls/master - create new master control
        if (pathParts.size() == 1 && pathParts[0] == 'master') {
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            // Validate required fields
            if (!requestData['phm_id'] || !requestData['ctm_name']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "phm_id and ctm_name are required"]).toString())
                    .build()
            }
            
            def controlData = [:]
            controlData['phm_id'] = UUID.fromString(requestData['phm_id'] as String)
            controlData['ctm_name'] = requestData['ctm_name'] as String
            controlData['ctm_description'] = requestData['ctm_description'] as String
            controlData['ctm_type'] = requestData['ctm_type'] as String
            controlData['ctm_is_critical'] = requestData['ctm_is_critical'] as Boolean
            controlData['ctm_code'] = requestData['ctm_code'] as String
            controlData['ctm_order'] = requestData['ctm_order'] as Integer
            
            def masterControl = controlRepository.createMasterControl(controlData)
            
            return Response.status(Response.Status.CREATED)
                .entity(new JsonBuilder(masterControl).toString())
                .build()
        }
        
        // POST /controls/master/{ctm_id}/instantiate - create instances from master
        if (pathParts.size() == 3 && pathParts[0] == 'master' && pathParts[2] == 'instantiate') {
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['phi_id']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "phi_id is required"]).toString())
                    .build()
            }
            
            def masterControlId = UUID.fromString(pathParts[1] as String)
            def phaseInstanceId = UUID.fromString(requestData['phi_id'] as String)
            
            def overrides = [:]
            overrides['cti_name'] = requestData['cti_name'] as String
            overrides['cti_description'] = requestData['cti_description'] as String
            overrides['cti_status'] = requestData['cti_status'] ?: 'NOT_STARTED'
            overrides['cti_order'] = requestData['cti_order'] as Integer
            overrides['cti_type'] = requestData['cti_type'] as String
            overrides['cti_is_critical'] = requestData['cti_is_critical'] as Boolean
            overrides['cti_code'] = requestData['cti_code'] as String
            
            // Create single control instance from master control
            def instance = controlRepository.createControlInstance(masterControlId, phaseInstanceId, overrides)
            
            return Response.status(Response.Status.CREATED)
                .entity(new JsonBuilder(instance).toString())
                .build()
        }
        
        // POST /controls/master/bulk - create multiple master controls
        if (pathParts.size() == 2 && pathParts[0] == 'master' && pathParts[1] == 'bulk') {
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['controls'] || !(requestData['controls'] instanceof List)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "controls array is required"]).toString())
                    .build()
            }
            
            def createdControls = []
            def failures = []
            
            (requestData['controls'] as List).eachWithIndex { controlData, index ->
                try {
                    if (!controlData['phm_id'] || !controlData['ctm_name']) {
                        failures.add([index: index, error: "phm_id and ctm_name are required"])
                        return
                    }
                    
                    def data = [:]
                    data['phm_id'] = UUID.fromString(controlData['phm_id'] as String)
                    data['ctm_name'] = controlData['ctm_name'] as String
                    data['ctm_description'] = controlData['ctm_description'] as String
                    data['ctm_type'] = controlData['ctm_type'] as String
                    data['ctm_is_critical'] = controlData['ctm_is_critical'] as Boolean
                    data['ctm_code'] = controlData['ctm_code'] as String
                    data['ctm_order'] = controlData['ctm_order'] as Integer
                    
                    def masterControl = controlRepository.createMasterControl(data)
                    if (masterControl) {
                        createdControls.add(masterControl)
                    } else {
                        failures.add([index: index, error: "Failed to create control"])
                    }
                } catch (Exception e) {
                    failures.add([index: index, error: e.message])
                }
            }
            
            def result = [
                created: createdControls,
                failures: failures,
                summary: [
                    total_requested: (requestData['controls'] as List).size(),
                    created_count: createdControls.size(),
                    failed_count: failures.size()
                ]
            ]
            
            return Response.status(Response.Status.CREATED)
                .entity(new JsonBuilder(result).toString())
                .build()
        }
        
        // ==================== INSTANCE CONTROL POST OPERATIONS ====================
        
        // POST /controls/instance - create new control instance
        if (pathParts.size() == 1 && pathParts[0] == 'instance') {
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            // Validate required fields
            if (!requestData['ctm_id'] || !requestData['phi_id']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "ctm_id and phi_id are required"]).toString())
                    .build()
            }
            
            def overrides = [:]
            overrides['cti_name'] = requestData['cti_name'] as String
            overrides['cti_description'] = requestData['cti_description'] as String
            overrides['cti_status'] = requestData['cti_status'] ?: 'NOT_STARTED'
            overrides['cti_order'] = requestData['cti_order'] as Integer
            overrides['cti_type'] = requestData['cti_type'] as String
            overrides['cti_is_critical'] = requestData['cti_is_critical'] as Boolean
            overrides['cti_code'] = requestData['cti_code'] as String
            overrides['usr_id_it_validator'] = requestData['usr_id_it_validator'] as Integer
            overrides['usr_id_biz_validator'] = requestData['usr_id_biz_validator'] as Integer
            
            def controlInstance = controlRepository.createControlInstance(
                UUID.fromString(requestData['ctm_id'] as String),
                UUID.fromString(requestData['phi_id'] as String),
                overrides
            )
            
            return Response.status(Response.Status.CREATED)
                .entity(new JsonBuilder(controlInstance).toString())
                .build()
        }
        
        // POST /controls/instance/bulk - create multiple control instances
        if (pathParts.size() == 2 && pathParts[0] == 'instance' && pathParts[1] == 'bulk') {
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['instances'] || !(requestData['instances'] instanceof List)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "instances array is required"]).toString())
                    .build()
            }
            
            def createdInstances = []
            def failures = []
            
            (requestData['instances'] as List).eachWithIndex { instanceData, index ->
                try {
                    if (!instanceData['ctm_id'] || !instanceData['phi_id']) {
                        failures.add([index: index, error: "ctm_id and phi_id are required"])
                        return
                    }
                    
                    def overrides = [:]
                    overrides['cti_name'] = instanceData['cti_name'] as String
                    overrides['cti_description'] = instanceData['cti_description'] as String
                    overrides['cti_status'] = instanceData['cti_status'] as String ?: 'PENDING'
                    overrides['cti_order'] = instanceData['cti_order'] as Integer
                    overrides['cti_type'] = instanceData['cti_type'] as String
                    overrides['cti_is_critical'] = instanceData['cti_is_critical'] as Boolean
                    overrides['cti_code'] = instanceData['cti_code'] as String
                    overrides['usr_id_it_validator'] = instanceData['usr_id_it_validator'] as Integer
                    overrides['usr_id_biz_validator'] = instanceData['usr_id_biz_validator'] as Integer
                    
                    def controlInstance = controlRepository.createControlInstance(
                        UUID.fromString(instanceData['ctm_id'] as String),
                        UUID.fromString(instanceData['phi_id'] as String),
                        overrides
                    )
                    
                    if (controlInstance) {
                        createdInstances.add(controlInstance)
                    } else {
                        failures.add([index: index, error: "Failed to create control instance"])
                    }
                } catch (Exception e) {
                    failures.add([index: index, error: e.message])
                }
            }
            
            def result = [
                created: createdInstances,
                failures: failures,
                summary: [
                    total_requested: (requestData['instances'] as List).size(),
                    created_count: createdInstances.size(),
                    failed_count: failures.size()
                ]
            ]
            
            return Response.status(Response.Status.CREATED)
                .entity(new JsonBuilder(result).toString())
                .build()
        }
        
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
            .build()
            
    } catch (Exception e) {
        return handleError(e)
    }
}

// ==================== CONTROLS API - PUT ENDPOINTS ====================

/**
 * Handles PUT requests for controls.
 * - PUT /controls/master/{ctm_id} -> updates master control
 * - PUT /controls/master/reorder -> reorders master controls
 * - PUT /controls/instance/{cti_id} -> updates control instance
 * - PUT /controls/instance/{cti_id}/status -> updates control instance status
 * - PUT /controls/instance/{cti_id}/validate -> validates control
 * - PUT /controls/instance/{cti_id}/override -> overrides control
 * - PUT /controls/instance/bulk/validate -> validates multiple controls
 */
controls(httpMethod: "PUT", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // ==================== MASTER CONTROL PUT OPERATIONS ====================
        
        // PUT /controls/master/reorder - reorder master controls
        if (pathParts.size() == 2 && pathParts[0] == 'master' && pathParts[1] == 'reorder') {
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['phm_id'] || !requestData['control_order']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "phm_id and control_order array are required"]).toString())
                    .build()
            }
            
            def controlOrder = [:]
            requestData['control_order'].eachWithIndex { controlId, index ->
                controlOrder[UUID.fromString(controlId as String)] = (index as Integer) + 1
            }
            
            def result = controlRepository.reorderMasterControls(
                UUID.fromString(requestData['phm_id'] as String),
                controlOrder
            )
            
            return Response.status(Response.Status.NO_CONTENT).build()
        }
        
        // PUT /controls/master/{ctm_id} - update master control
        if (pathParts.size() == 2 && pathParts[0] == 'master') {
            def controlId = UUID.fromString(pathParts[1] as String)
            
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            def updateData = [:]
            updateData['ctm_name'] = requestData['ctm_name'] as String
            updateData['ctm_description'] = requestData['ctm_description'] as String
            updateData['ctm_type'] = requestData['ctm_type'] as String
            updateData['ctm_is_critical'] = requestData['ctm_is_critical'] as Boolean
            updateData['ctm_code'] = requestData['ctm_code'] as String
            
            def result = controlRepository.updateMasterControl(controlId, updateData)
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
        
        // ==================== INSTANCE CONTROL PUT OPERATIONS ====================
        
        // PUT /controls/instance/{cti_id}/status - update control instance status
        if (pathParts.size() == 3 && pathParts[0] == 'instance' && pathParts[2] == 'status') {
            def controlId = UUID.fromString(pathParts[1] as String)
            
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['cti_status']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "cti_status is required"]).toString())
                    .build()
            }
            
            def updateData = [:]
            updateData['cti_status'] = requestData['cti_status']
            
            def result = controlRepository.updateControlInstance(controlId, updateData)
            
            return Response.status(Response.Status.NO_CONTENT).build()
        }
        
        // PUT /controls/instance/{cti_id}/validate - validate control
        if (pathParts.size() == 3 && pathParts[0] == 'instance' && pathParts[2] == 'validate') {
            def controlId = UUID.fromString(pathParts[1] as String)
            
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            def validationData = [:]
            validationData['cti_status'] = requestData['cti_status']
            validationData['usr_id_it_validator'] = requestData['usr_id_it_validator'] as Integer
            validationData['usr_id_biz_validator'] = requestData['usr_id_biz_validator'] as Integer
            
            def result = controlRepository.validateControl(controlId, validationData)
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
        
        // PUT /controls/instance/{cti_id}/override - override control
        if (pathParts.size() == 3 && pathParts[0] == 'instance' && pathParts[2] == 'override') {
            def controlId = UUID.fromString(pathParts[1] as String)
            
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['reason'] || !requestData['overrideBy']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "reason and overrideBy are required"]).toString())
                    .build()
            }
            
            def result = controlRepository.overrideControl(
                controlId,
                requestData['reason'] as String,
                requestData['overrideBy'] as String
            )
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
        
        // PUT /controls/instance/{cti_id} - update control instance
        if (pathParts.size() == 2 && pathParts[0] == 'instance') {
            def controlId = UUID.fromString(pathParts[1] as String)
            
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            def updateData = [:]
            updateData['cti_name'] = requestData['cti_name'] as String
            updateData['cti_description'] = requestData['cti_description'] as String
            updateData['cti_status'] = requestData['cti_status']
            updateData['cti_order'] = requestData['cti_order'] as Integer
            updateData['cti_type'] = requestData['cti_type'] as String
            updateData['cti_is_critical'] = requestData['cti_is_critical'] as Boolean
            updateData['cti_code'] = requestData['cti_code'] as String
            updateData['usr_id_it_validator'] = requestData['usr_id_it_validator'] as Integer
            updateData['usr_id_biz_validator'] = requestData['usr_id_biz_validator'] as Integer
            
            def result = controlRepository.updateControlInstance(controlId, updateData)
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
        
        // PUT /controls/instance/bulk/validate - validate multiple controls
        if (pathParts.size() == 3 && pathParts[0] == 'instance' && pathParts[1] == 'bulk' && pathParts[2] == 'validate') {
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['phi_id']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "phi_id is required"]).toString())
                    .build()
            }
            
            def validationData = [:]
            validationData['cti_status'] = requestData['cti_status']
            validationData['usr_id_it_validator'] = requestData['usr_id_it_validator'] as Integer
            validationData['usr_id_biz_validator'] = requestData['usr_id_biz_validator'] as Integer
            
            def result = controlRepository.validateAllPhaseControls(
                UUID.fromString(requestData['phi_id'] as String),
                validationData
            )
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
        
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
            .build()
            
    } catch (Exception e) {
        return handleError(e)
    }
}

// ==================== CONTROLS API - DELETE ENDPOINTS ====================

/**
 * Handles DELETE requests for controls.
 * - DELETE /controls/master/{ctm_id} -> deletes master control
 * - DELETE /controls/instance/{cti_id} -> deletes control instance
 */
controls(httpMethod: "DELETE", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // DELETE /controls/master/{ctm_id} - delete master control
        if (pathParts.size() == 2 && pathParts[0] == 'master') {
            def controlId = UUID.fromString(pathParts[1] as String)
            def result = controlRepository.deleteMasterControl(controlId)
            
            if (result) {
                return Response.status(Response.Status.NO_CONTENT).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master control not found or has dependencies"]).toString())
                    .build()
            }
        }
        
        // DELETE /controls/instance/{cti_id} - delete control instance
        if (pathParts.size() == 2 && pathParts[0] == 'instance') {
            def instanceId = UUID.fromString(pathParts[1] as String)
            def result = controlRepository.deleteControlInstance(instanceId)
            
            if (result) {
                return Response.status(Response.Status.NO_CONTENT).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Control instance not found"]).toString())
                    .build()
            }
        }
        
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
            .build()
            
    } catch (Exception e) {
        return handleError(e)
    }
}