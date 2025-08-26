package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.StepRepository
import umig.repository.StatusRepository
import umig.repository.UserRepository
import umig.utils.UserService
import umig.utils.StepNotificationIntegration
import umig.utils.StepContentFormatter
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.json.JsonException
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException
import java.util.UUID
import java.util.Date

@BaseScript CustomEndpointDelegate delegate

final StepRepository stepRepository = new StepRepository()

/**
 * Enhanced error handling with proper SQL state mapping and context
 */
private Response handleError(Exception e, String context = null) {
    def timestamp = new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
    def errorResponse = [timestamp: timestamp]
    
    if (context) {
        errorResponse.context = context
    }
    
    if (e instanceof SQLException) {
        def sqlState = e.getSQLState()
        switch (sqlState) {
            case '23503': // Foreign key violation
                errorResponse.error = "Foreign key constraint violation: ${e.message}"
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder(errorResponse).toString())
                    .build()
            case '23505': // Unique violation
                errorResponse.error = "Unique constraint violation: ${e.message}"
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder(errorResponse).toString())
                    .build()
            case '23514': // Check constraint violation
                errorResponse.error = "Check constraint violation: ${e.message}"
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder(errorResponse).toString())
                    .build()
            default:
                errorResponse.error = "Database error: ${e.message}"
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder(errorResponse).toString())
                    .build()
        }
    } else if (e instanceof IllegalArgumentException) {
        errorResponse.error = e.message
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder(errorResponse).toString())
            .build()
    } else {
        // Handle enhanced error patterns from EnhancedStepsApi
        def errorMessage = e.message?.toLowerCase() ?: ""
        if (errorMessage.contains("23503") || errorMessage.contains("foreign key")) {
            errorResponse.error = "Invalid reference: related entity not found"
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder(errorResponse).toString())
                .build()
        }
        
        if (errorMessage.contains("23505") || errorMessage.contains("unique constraint")) {
            errorResponse.error = "Duplicate entry: resource already exists"
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder(errorResponse).toString())
                .build()
        }
        
        errorResponse.error = "Internal server error: ${e.message}"
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder(errorResponse).toString())
            .build()
    }
}

/**
 * Consolidated Steps API - Basic operations and enhanced notification features
 * 
 * This API provides both basic CRUD operations for master steps and enhanced
 * notification features for step instances with URL-aware email notifications.
 * 
 * Basic Operations:
 * - GET /steps/master -> returns all master steps
 * - GET /steps/master/{stm_id} -> returns specific master step
 * 
 * Enhanced Operations (with URL-aware notifications):
 * - PUT /enhanced-steps/{stepInstanceId}/status -> update step status with enhanced notifications
 * - POST /enhanced-steps/{stepInstanceId}/open -> open step with enhanced notifications
 * - POST /enhanced-steps/{stepInstanceId}/instructions/{instructionId}/complete -> complete instruction
 * - GET /enhanced-steps/* -> health and monitoring endpoints
 */

// ============================================================================
// BASIC STEPS OPERATIONS (Original StepsApi functionality)
// ============================================================================
steps(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    try {
        // GET /steps/master/{stm_id} - get specific master step
        if (pathParts.size() == 2 && pathParts[0] == 'master') {
            def stepId = UUID.fromString(pathParts[1])
            def step = stepRepository.findMasterStepById(stepId)
            
            if (!step) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Master step not found"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(step).toString()).build()
        }
        
        // GET /steps/master - return master steps with Admin GUI support
        if (pathParts.size() == 1 && pathParts[0] == 'master') {
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
                        pageNumber = Integer.parseInt(value)
                        break
                    case 'size':
                        pageSize = Integer.parseInt(value)
                        break
                    case 'sort':
                        sortField = value
                        break
                    case 'direction':
                        sortDirection = value
                        break
                    default:
                        filters[param] = value
                }
            }

            def allowedSortFields = ['stm_id', 'stm_name', 'stm_order', 'phm_name', 'created_at', 'updated_at']
            if (sortField && !allowedSortFields.contains(sortField)) {
                return Response.status(400)
                    .entity(new JsonBuilder([error: "Invalid sort field: ${sortField}. Allowed fields: ${allowedSortFields.join(', ')}", code: 400]).toString())
                    .build()
            }

            def result = stepRepository.findMasterStepsWithFilters(filters, pageNumber as int, pageSize as int, sortField, sortDirection)
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
        
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
            .build()
            
    } catch (Exception e) {
        return handleError(e, "GET /steps")
    }
}

// ============================================================================
// ENHANCED STEPS OPERATIONS (Enhanced notification features)
// ============================================================================

/**
 * Enhanced PUT endpoint for step status updates with URL-aware notifications
 * - PUT /enhanced-steps/{stepInstanceId}/status -> individual step status update with URLs
 */
enhancedSteps(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request) as String
    List<String> pathParts = extraPath?.split('/')?.findAll { String it -> it } as List<String> ?: [] as List<String>
    
    // PUT /enhanced-steps/{stepInstanceId}/status - individual step status update with enhanced notifications
    if (pathParts.size() == 2 && pathParts[1] == 'status') {
        try {
            String stepInstanceId = pathParts[0] as String
            UUID stepInstanceUuid = UUID.fromString(stepInstanceId) as UUID
            
            // Validate request body
            if (!body) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Request body is required"]).toString())
                    .build()
            }
            
            // Parse request body with type safety
            def requestData = new JsonSlurper().parseText(body) as Map
            def statusId = requestData.statusId as Integer
            
            // Get user context using UserService for intelligent fallback handling
            def userContext
            try {
                userContext = UserService.getCurrentUserContext()
                def userId = userContext.userId
                
                // Log the user context for debugging
                if (userContext.isSystemUser || userContext.fallbackReason) {
                    println "EnhancedStepsApi: Using ${userContext.fallbackReason ?: 'system user'} for '${userContext.confluenceUsername}' (userId: ${userId})"
                }
            } catch (Exception e) {
                // If UserService fails, fall back to null userId (acceptable for repository)
                println "EnhancedStepsApi: UserService failed (${e.message}), proceeding with null userId for audit"
                userContext = [userId: null, confluenceUsername: "unknown"]
            }
            
            def userId = userContext?.userId
            
            // BACKWARD COMPATIBILITY: Support legacy status field for gradual migration
            StatusRepository statusRepository = new StatusRepository()
            if (!statusId && requestData.status) {
                // Convert status name to ID using database lookup for backward compatibility
                def statusName = (requestData.status as String).toUpperCase()
                def statusRecord = statusRepository.findStatusByNameAndType(statusName, 'Step')
                
                if (statusRecord) {
                    statusId = (statusRecord as Map).id as Integer
                } else {
                    def availableStatuses = statusRepository.findStatusesByType('Step')
                    def statusNames = availableStatuses.collect { (it as Map).name }.join(', ')
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([
                            error: "Invalid status name '${statusName}'. Use statusId instead, or valid status names: ${statusNames}"
                        ]).toString())
                        .build()
                }
            }
            
            if (!statusId) {
                def validStatuses = statusRepository.findStatusesByType('Step')
                def statusOptions = validStatuses.collect { "${(it as Map).id}=${(it as Map).name}" }.join(', ')
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "Missing required field: statusId", 
                        validOptions: statusOptions
                    ]).toString())
                    .build()
            }
            
            // Validate status ID against database - single source of truth
            if (!statusRepository.isValidStatusId(statusId, 'Step')) {
                def validStatusIds = statusRepository.getValidStatusIds('Step')
                def availableStatuses = statusRepository.findStatusesByType('Step')
                def statusOptions = availableStatuses.collect { "${(it as Map).id}=${(it as Map).name}" }.join(', ')
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([
                        error: "Invalid statusId '${statusId}' for Step entities",
                        validStatusIds: validStatusIds,
                        validOptions: statusOptions
                    ]).toString())
                    .build()
            }
            
            // Update step status using enhanced notification integration
            def integrationResult = StepNotificationIntegration.updateStepStatusWithEnhancedNotifications(
                stepInstanceUuid, 
                statusId, 
                userId as Integer
            )
            def result = integrationResult as Map
            
            if ((result.success as Boolean)) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: result.message ?: "Step status updated successfully",
                    stepInstanceId: stepInstanceId,
                    statusId: statusId,
                    emailsSent: result.emailsSent ?: 0,
                    enhancedNotification: result.enhancedNotification ?: false,
                    migrationCode: result.migrationCode,
                    iterationCode: result.iterationCode,
                    contextMissing: result.contextMissing ?: false
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: (result.error ?: "Failed to update step status") as String]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return handleError(e, "PUT /enhanced-steps/{stepInstanceId}/status")
        } catch (Exception e) {
            return handleError(e, "PUT /enhanced-steps/{stepInstanceId}/status")
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Enhanced endpoint not found"]).toString())
        .build()
}

/**
 * Enhanced POST endpoint for step actions with URL-aware notifications
 * - POST /enhanced-steps/{stepInstanceId}/open -> marks step as opened with URLs
 * - POST /enhanced-steps/{stepInstanceId}/instructions/{instructionId}/complete -> marks instruction as completed with URLs
 */
enhancedSteps(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request) as String
    List<String> pathParts = extraPath?.split('/')?.findAll { String it -> it } as List<String> ?: [] as List<String>
    
    // POST /enhanced-steps/{stepInstanceId}/open
    if (pathParts.size() == 2 && pathParts[1] == 'open') {
        try {
            def stepInstanceId = pathParts[0]
            def stepInstanceUuid = UUID.fromString(stepInstanceId)
            
            // Parse request body
            def requestData = [:]
            if (body) {
                requestData = new JsonSlurper().parseText(body) as Map
            }
            
            // Get user context using UserService
            def userContext
            try {
                userContext = UserService.getCurrentUserContext()
                if (userContext.isSystemUser || userContext.fallbackReason) {
                    println "EnhancedStepsApi (open): Using ${userContext.fallbackReason ?: 'system user'} for '${userContext.confluenceUsername}'"
                }
            } catch (Exception e) {
                println "EnhancedStepsApi (open): UserService failed (${e.message}), using null userId"
                userContext = [userId: null]
            }
            
            def userId = userContext?.userId
            
            // Open step using enhanced notification integration
            def integrationResult = StepNotificationIntegration.openStepWithEnhancedNotifications(
                stepInstanceUuid, 
                userId as Integer
            )
            def result = integrationResult as Map
            
            if ((result.success as Boolean)) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: result.message ?: "Step opened successfully",
                    stepInstanceId: stepInstanceId,
                    emailsSent: result.emailsSent ?: 0,
                    enhancedNotification: result.enhancedNotification ?: false,
                    migrationCode: result.migrationCode,
                    iterationCode: result.iterationCode,
                    contextMissing: result.contextMissing ?: false
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: (result.error ?: "Failed to open step") as String]).toString())
                    .build()
            }
            
        } catch (IllegalArgumentException e) {
            return handleError(e, "POST /enhanced-steps/{stepInstanceId}/open")
        } catch (Exception e) {
            return handleError(e, "POST /enhanced-steps/{stepInstanceId}/open")
        }
    }
    
    // POST /enhanced-steps/{stepInstanceId}/instructions/{instructionId}/complete
    if (pathParts.size() == 4 && pathParts[1] == 'instructions' && pathParts[3] == 'complete') {
        try {
            def stepInstanceId = pathParts[0]
            def instructionId = pathParts[2]
            def stepInstanceUuid = UUID.fromString(stepInstanceId)
            def instructionUuid = UUID.fromString(instructionId)
            
            // Parse request body
            def requestData = [:]
            if (body) {
                requestData = new JsonSlurper().parseText(body) as Map
            }
            
            // Get user context using UserService
            def userContext
            try {
                userContext = UserService.getCurrentUserContext()
                if (userContext.isSystemUser || userContext.fallbackReason) {
                    println "EnhancedStepsApi (complete): Using ${userContext.fallbackReason ?: 'system user'} for '${userContext.confluenceUsername}'"
                }
            } catch (Exception e) {
                println "EnhancedStepsApi (complete): UserService failed (${e.message}), using null userId"
                userContext = [userId: null]
            }
            
            def userId = userContext?.userId
            
            // Complete instruction using enhanced notification integration
            def integrationResult = StepNotificationIntegration.completeInstructionWithEnhancedNotifications(
                instructionUuid, 
                stepInstanceUuid, 
                userId as Integer
            )
            def result = integrationResult as Map
            
            if ((result.success as Boolean)) {
                return Response.ok(new JsonBuilder([
                    success: true,
                    message: result.message ?: "Instruction completed successfully",
                    instructionId: instructionId,
                    stepInstanceId: stepInstanceId,
                    emailsSent: result.emailsSent ?: 0,
                    enhancedNotification: result.enhancedNotification ?: false,
                    migrationCode: result.migrationCode,
                    iterationCode: result.iterationCode,
                    contextMissing: result.contextMissing ?: false
                ]).toString()).build()
            } else {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: (result.error ?: "Failed to complete instruction") as String]).toString())
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
        .entity(new JsonBuilder([error: "Enhanced endpoint not found"]).toString())
        .build()
}

/**
 * Enhanced GET endpoint for step content and health monitoring with URL-aware functionality
 * - GET /enhanced-steps/{stepInstanceId}/content -> get formatted step content with instructions
 * - GET /enhanced-steps/health -> system health check
 * - GET /enhanced-steps/config -> configuration status
 */
enhancedSteps(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request) as String
    List<String> pathParts = extraPath?.split('/')?.findAll { String it -> it } as List<String> ?: [] as List<String>
    
    // GET /enhanced-steps/health -> system health check
    if (pathParts.size() == 1 && pathParts[0] == 'health') {
        return Response.ok(new JsonBuilder([
            status: "healthy",
            timestamp: new Date(),
            version: "consolidated-api",
            endpoints: [
                "GET /steps/master",
                "GET /steps/master/{id}",
                "PUT /enhanced-steps/{stepInstanceId}/status",
                "POST /enhanced-steps/{stepInstanceId}/open",
                "POST /enhanced-steps/{stepInstanceId}/instructions/{instructionId}/complete",
                "GET /enhanced-steps/health"
            ]
        ]).toString()).build()
    }
    
    // Default response for other GET requests
    return Response.ok(new JsonBuilder([
        message: "Enhanced Steps API - GET endpoint active", 
        timestamp: new Date(),
        availableEndpoints: [
            "GET /enhanced-steps/health - System health check"
        ]
    ]).toString()).build()
}
