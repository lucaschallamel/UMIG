package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.PhaseRepository
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.json.JsonException
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException
import java.util.UUID

@BaseScript CustomEndpointDelegate delegate

final PhaseRepository phaseRepository = new PhaseRepository()

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

// ==================== PHASES API - GET ENDPOINTS ====================

/**
 * Handles GET requests for phases.
 * - GET /phases/master -> returns all master phases
 * - GET /phases/master/{phm_id} -> returns specific master phase
 * - GET /phases/instance -> returns all phase instances
 * - GET /phases/instance/{phi_id} -> returns specific phase instance
 * - GET /phases/{phi_id}/controls -> returns control points for phase
 * - GET /phases/{phi_id}/progress -> returns phase progress
 */
phases(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // ==================== MASTER PHASE GET OPERATIONS ====================
        
        // GET /phases/master/{phm_id} - get specific master phase
        if (pathParts.size() == 2 && pathParts[0] == 'master') {
            def phaseId = UUID.fromString(pathParts[1] as String)
            def phase = phaseRepository.findMasterPhaseById(phaseId)
            
            if (!phase) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master phase not found"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(phase).toString()).build()
        }
        
        // GET /phases/master with optional filtering
        if (pathParts.size() == 1 && pathParts[0] == 'master') {
            def phases
            
            // Filter by sequence ID if provided
            if (queryParams.getFirst("sequenceId")) {
                def sequenceId = UUID.fromString(queryParams.getFirst("sequenceId") as String)
                phases = phaseRepository.findMasterPhasesBySequenceId(sequenceId)
            } else {
                phases = phaseRepository.findAllMasterPhases()
            }
            
            return Response.ok(new JsonBuilder(phases).toString()).build()
        }
        
        // ==================== INSTANCE PHASE GET OPERATIONS ====================
        
        // GET /phases/instance/{phi_id} - get specific phase instance
        if (pathParts.size() == 2 && pathParts[0] == 'instance') {
            def instanceId = UUID.fromString(pathParts[1] as String)
            def instance = phaseRepository.findPhaseInstanceById(instanceId)
            
            if (!instance) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Phase instance not found"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(instance).toString()).build()
        }
        
        // GET /phases/instance with hierarchical filtering
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
            
            if (queryParams.getFirst("teamId")) {
                filters.teamId = queryParams.getFirst("teamId") as String
            }
            
            if (queryParams.getFirst("statusId")) {
                filters.statusId = queryParams.getFirst("statusId") as String
            }
            
            def instances = phaseRepository.findPhaseInstances(filters)
            return Response.ok(new JsonBuilder(instances).toString()).build()
        }
        
        // ==================== CONTROL POINT GET OPERATIONS ====================
        
        // GET /phases/{phi_id}/controls - get control points for phase
        if (pathParts.size() == 2 && pathParts[1] == 'controls') {
            def phaseId = UUID.fromString(pathParts[0] as String)
            def controls = phaseRepository.findControlPoints(phaseId)
            
            return Response.ok(new JsonBuilder(controls).toString()).build()
        }
        
        // GET /phases/{phi_id}/progress - get phase progress with weighted calculation
        if (pathParts.size() == 2 && pathParts[1] == 'progress') {
            def phaseId = UUID.fromString(pathParts[0] as String)
            def progress = phaseRepository.calculatePhaseProgress(phaseId)
            
            return Response.ok(new JsonBuilder(progress).toString()).build()
        }
        
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
            .build()
            
    } catch (Exception e) {
        return handleError(e)
    }
}

// ==================== PHASES API - POST ENDPOINTS ====================

/**
 * Handles POST requests for phases.
 * - POST /phases/master -> creates new master phase
 * - POST /phases/master/{phm_id}/instantiate -> creates instances from master
 * - POST /phases/instance -> creates new phase instance
 * - POST /phases/{phi_id}/controls/validate -> validates all control points
 * - POST /phases/{phi_id}/controls/{cti_id}/override -> overrides control with reason
 */
phases(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // ==================== MASTER PHASE POST OPERATIONS ====================
        
        // POST /phases/master - create new master phase
        if (pathParts.size() == 1 && pathParts[0] == 'master') {
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            // Validate required fields
            if (!requestData['sqm_id'] || !requestData['phm_name']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "sqm_id and phm_name are required"]).toString())
                    .build()
            }
            
            def phaseData = [:]
            phaseData['sqm_id'] = UUID.fromString(requestData['sqm_id'] as String)
            phaseData['phm_name'] = requestData['phm_name'] as String
            phaseData['phm_description'] = requestData['phm_description'] as String
            phaseData['phm_order'] = requestData['phm_order'] as Integer
            phaseData['predecessor_phm_id'] = requestData['predecessor_phm_id'] ? UUID.fromString(requestData['predecessor_phm_id'] as String) : null
            
            def masterPhase = phaseRepository.createMasterPhase(phaseData)
            
            return Response.status(Response.Status.CREATED)
                .entity(new JsonBuilder(masterPhase).toString())
                .build()
        }
        
        // POST /phases/master/{phm_id}/instantiate - create instances from master
        if (pathParts.size() == 3 && pathParts[1] == 'master' && pathParts[2] == 'instantiate') {
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['sqi_id']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "sqi_id is required"]).toString())
                    .build()
            }
            
            def masterPhaseId = UUID.fromString(pathParts[0] as String)
            def sequenceInstanceId = UUID.fromString(requestData['sqi_id'] as String)
            
            // Create single phase instance from master phase
            def instance = phaseRepository.createPhaseInstance(masterPhaseId, sequenceInstanceId)
            
            return Response.status(Response.Status.CREATED)
                .entity(new JsonBuilder(instance).toString())
                .build()
        }
        
        // ==================== INSTANCE PHASE POST OPERATIONS ====================
        
        // POST /phases/instance - create new phase instance
        if (pathParts.size() == 1 && pathParts[0] == 'instance') {
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            // Validate required fields
            if (!requestData['phm_id'] || !requestData['sqi_id']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "phm_id and sqi_id are required"]).toString())
                    .build()
            }
            
            def overrides = [:]
            overrides['phi_name'] = requestData['phi_name'] as String
            overrides['phi_description'] = requestData['phi_description'] as String
            overrides['phi_order'] = requestData['phi_order'] as Integer
            overrides['predecessor_phi_id'] = requestData['predecessor_phi_id'] ? UUID.fromString(requestData['predecessor_phi_id'] as String) : null
            overrides['phi_status'] = requestData['phi_status'] as String ?: 'PLANNING'
            
            def phaseInstance = phaseRepository.createPhaseInstance(
                UUID.fromString(requestData['phm_id'] as String),
                UUID.fromString(requestData['sqi_id'] as String),
                overrides
            )
            
            return Response.status(Response.Status.CREATED)
                .entity(new JsonBuilder(phaseInstance).toString())
                .build()
        }
        
        // ==================== CONTROL POINT POST OPERATIONS ====================
        
        // POST /phases/{phi_id}/controls/validate - validate all control points
        if (pathParts.size() == 3 && pathParts[1] == 'controls' && pathParts[2] == 'validate') {
            def phaseId = UUID.fromString(pathParts[0] as String)
            def jsonSlurper = new JsonSlurper()
            def requestData = body ? jsonSlurper.parseText(body) : [:]
            
            def validationResult = phaseRepository.validateControlPoints(phaseId)
            
            return Response.ok(new JsonBuilder(validationResult).toString()).build()
        }
        
        // POST /phases/{phi_id}/controls/{cti_id}/override - override control point
        if (pathParts.size() == 4 && pathParts[1] == 'controls' && pathParts[3] == 'override') {
            def phaseId = UUID.fromString(pathParts[0] as String)
            def controlId = UUID.fromString(pathParts[2] as String)
            
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body with reason is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['reason'] || !requestData['overrideBy']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "reason and overrideBy are required"]).toString())
                    .build()
            }
            
            def result = phaseRepository.overrideControl(
                controlId,
                requestData['reason'] as String,
                requestData['overrideBy'] as String
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

// ==================== PHASES API - PUT ENDPOINTS ====================

/**
 * Handles PUT requests for phases.
 * - PUT /phases/master/{phm_id} -> updates master phase
 * - PUT /phases/master/reorder -> reorders master phases
 * - PUT /phases/master/{phm_id}/move -> moves master phase
 * - PUT /phases/instance/{phi_id} -> updates phase instance
 * - PUT /phases/instance/{phi_id}/status -> updates phase instance status
 * - PUT /phases/instance/reorder -> reorders phase instances
 * - PUT /phases/instance/{phi_id}/move -> moves phase instance
 * - PUT /phases/{phi_id}/controls/{cti_id} -> updates control point status
 */
phases(httpMethod: "PUT", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // ==================== MASTER PHASE PUT OPERATIONS ====================
        
        // PUT /phases/master/reorder - reorder master phases
        if (pathParts.size() == 2 && pathParts[0] == 'master' && pathParts[1] == 'reorder') {
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['sqm_id'] || !requestData['phase_order']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "sqm_id and phase_order array are required"]).toString())
                    .build()
            }
            
            def phaseOrder = [:]
            requestData['phase_order'].eachWithIndex { phaseId, index ->
                phaseOrder[UUID.fromString(phaseId as String)] = (index as Integer) + 1
            }
            
            def result = phaseRepository.reorderMasterPhases(
                UUID.fromString(requestData['sqm_id'] as String),
                phaseOrder
            )
            
            return Response.status(Response.Status.NO_CONTENT).build()
        }
        
        // PUT /phases/master/{phm_id}/move - move master phase to different sequence
        if (pathParts.size() == 3 && pathParts[0] == 'master' && pathParts[2] == 'move') {
            def phaseId = UUID.fromString(pathParts[1] as String)
            
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['target_sqm_id']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "target_sqm_id is required"]).toString())
                    .build()
            }
            
            // Move operation would need to be implemented as update + reorder
            def updateData = [:]
            updateData['sqm_id'] = UUID.fromString(requestData['target_sqm_id'] as String)
            if (requestData['new_order']) {
                updateData['phm_order'] = requestData['new_order'] as Integer
            }
            
            def result = phaseRepository.updateMasterPhase(phaseId, updateData)
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
        
        // PUT /phases/master/{phm_id} - update master phase
        if (pathParts.size() == 2 && pathParts[0] == 'master') {
            def phaseId = UUID.fromString(pathParts[1] as String)
            
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            def updateData = [:]
            updateData['phm_name'] = requestData['phm_name'] as String
            updateData['phm_description'] = requestData['phm_description'] as String
            updateData['phm_order'] = requestData['phm_order'] as Integer
            updateData['predecessor_phm_id'] = requestData['predecessor_phm_id'] ? UUID.fromString(requestData['predecessor_phm_id'] as String) : null
            
            def result = phaseRepository.updateMasterPhase(phaseId, updateData)
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
        
        // ==================== INSTANCE PHASE PUT OPERATIONS ====================
        
        // PUT /phases/instance/reorder - reorder phase instances
        if (pathParts.size() == 2 && pathParts[0] == 'instance' && pathParts[1] == 'reorder') {
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['sqi_id'] || !requestData['phase_order']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "sqi_id and phase_order array are required"]).toString())
                    .build()
            }
            
            def phaseOrder = [:]
            requestData['phase_order'].eachWithIndex { phaseId, index ->
                phaseOrder[UUID.fromString(phaseId as String)] = (index as Integer) + 1
            }
            
            def result = phaseRepository.reorderPhaseInstances(
                UUID.fromString(requestData['sqi_id'] as String),
                phaseOrder
            )
            
            return Response.status(Response.Status.NO_CONTENT).build()
        }
        
        // PUT /phases/instance/{phi_id}/move - move phase instance to different sequence
        if (pathParts.size() == 3 && pathParts[0] == 'instance' && pathParts[2] == 'move') {
            def phaseId = UUID.fromString(pathParts[1] as String)
            
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['target_sqi_id']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "target_sqi_id is required"]).toString())
                    .build()
            }
            
            // Move operation would need to be implemented as update + reorder
            def updateData = [:]
            updateData['sqi_id'] = UUID.fromString(requestData['target_sqi_id'] as String)
            if (requestData['new_order']) {
                updateData['phi_order'] = requestData['new_order'] as Integer
            }
            
            def result = phaseRepository.updatePhaseInstance(phaseId, updateData)
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
        
        // PUT /phases/instance/{phi_id}/status - update phase instance status
        if (pathParts.size() == 3 && pathParts[0] == 'instance' && pathParts[2] == 'status') {
            def phaseId = UUID.fromString(pathParts[1] as String)
            
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['sts_id']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "sts_id is required"]).toString())
                    .build()
            }
            
            def updateData = [:]
            updateData['phi_status'] = requestData['sts_id'] as String
            
            def result = phaseRepository.updatePhaseInstance(phaseId, updateData)
            
            return Response.status(Response.Status.NO_CONTENT).build()
        }
        
        // PUT /phases/instance/{phi_id} - update phase instance
        if (pathParts.size() == 2 && pathParts[0] == 'instance') {
            def phaseId = UUID.fromString(pathParts[1] as String)
            
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            def updateData = [:]
            updateData['phi_name'] = requestData['phi_name'] as String
            updateData['phi_description'] = requestData['phi_description'] as String
            updateData['phi_order'] = requestData['phi_order'] as Integer
            updateData['predecessor_phi_id'] = requestData['predecessor_phi_id'] ? UUID.fromString(requestData['predecessor_phi_id'] as String) : null
            updateData['phi_status'] = requestData['sts_id'] ? requestData['sts_id'] as String : null
            
            def result = phaseRepository.updatePhaseInstance(phaseId, updateData)
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
        
        // ==================== CONTROL POINT PUT OPERATIONS ====================
        
        // PUT /phases/{phi_id}/controls/{cti_id} - update control point status
        if (pathParts.size() == 3 && pathParts[1] == 'controls') {
            def phaseId = UUID.fromString(pathParts[0] as String)
            def controlId = UUID.fromString(pathParts[2] as String)
            
            if (!body || body.trim().isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            def jsonSlurper = new JsonSlurper()
            def requestData = jsonSlurper.parseText(body)
            
            if (!requestData['status']) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "status is required"]).toString())
                    .build()
            }
            
            def statusData = [:]
            statusData['cti_status'] = requestData['status'] as String
            if (requestData['validatedBy']) {
                statusData['usr_id_it_validator'] = requestData['validatedBy'] as String
            }
            
            def result = phaseRepository.updateControlPoint(controlId, statusData)
            
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
        
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
            .build()
            
    } catch (Exception e) {
        return handleError(e)
    }
}

// ==================== PHASES API - DELETE ENDPOINTS ====================

/**
 * Handles DELETE requests for phases.
 * - DELETE /phases/master/{phm_id} -> deletes master phase
 * - DELETE /phases/instance/{phi_id} -> deletes phase instance
 */
phases(httpMethod: "DELETE", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // DELETE /phases/master/{phm_id} - delete master phase
        if (pathParts.size() == 2 && pathParts[0] == 'master') {
            def phaseId = UUID.fromString(pathParts[1] as String)
            def result = phaseRepository.deleteMasterPhase(phaseId)
            
            if (result) {
                return Response.status(Response.Status.NO_CONTENT).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master phase not found"]).toString())
                    .build()
            }
        }
        
        // DELETE /phases/instance/{phi_id} - delete phase instance
        if (pathParts.size() == 2 && pathParts[0] == 'instance') {
            def instanceId = UUID.fromString(pathParts[1] as String)
            def result = phaseRepository.deletePhaseInstance(instanceId)
            
            if (result) {
                return Response.status(Response.Status.NO_CONTENT).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Phase instance not found"]).toString())
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