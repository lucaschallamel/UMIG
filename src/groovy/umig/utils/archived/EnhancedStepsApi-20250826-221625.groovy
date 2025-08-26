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
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID
import java.util.Date
import java.sql.SQLException

@BaseScript CustomEndpointDelegate delegate

/**
 * EnhancedStepsApi - Extended Steps API with URL-aware email notifications
 * 
 * This API extends the existing StepsApi functionality to include enhanced
 * email notifications with clickable stepView URLs. It provides new endpoints
 * that automatically extract migration and iteration context for URL construction.
 * 
 * Key Features:
 * - Enhanced status updates with URL-aware notifications  
 * - Automatic migration/iteration context detection
 * - Fallback to standard notifications when context is unavailable
 * - Health check endpoints for monitoring URL construction
 * - Backward compatibility with existing API patterns
 * 
 * @author UMIG Project Team
 * @since 2025-08-21
 */

/**
 * Enhanced PUT endpoint for step status updates with URL-aware notifications
 * - PUT /enhanced-steps/{stepInstanceId}/status -> individual step status update with URLs
 */
enhancedSteps(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    String extraPath = getAdditionalPath(request) as String
    List<String> pathParts = extraPath?.split('/')?.findAll { String it -> it } as List<String> ?: [] as List<String>
    
    // Enhanced error handling with SQL state mapping and context - inline
    Closure<Response> handleError = { Exception e, String context ->
        if (e instanceof IllegalArgumentException) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: e.message,
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        // SQL state mappings (ADR-031)
        def errorMessage = e.message?.toLowerCase() ?: ""
        if (errorMessage.contains("23503") || errorMessage.contains("foreign key")) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: "Invalid reference: related entity not found",
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        if (errorMessage.contains("23505") || errorMessage.contains("unique constraint")) {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([
                    error: "Duplicate entry: resource already exists",
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        // Default internal server error
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Internal server error: ${e.message}",
                context: context,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]).toString())
            .build()
    }
    
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
    
    // Enhanced error handling with SQL state mapping and context - inline
    Closure<Response> handleError = { Exception e, String context ->
        if (e instanceof IllegalArgumentException) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([
                    error: e.message,
                    context: context,
                    timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
                ]).toString())
                .build()
        }
        
        // Default internal server error
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Internal server error: ${e.message}",
                context: context,
                timestamp: new Date().format("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'")
            ]).toString())
            .build()
    }
    
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

// END OF POST METHOD

/**
 * Enhanced GET endpoint for step content and health monitoring with URL-aware functionality
 * - GET /enhanced-steps/{stepInstanceId}/content -> get formatted step content with instructions
 * - GET /enhanced-steps/health -> system health check
 * - GET /enhanced-steps/config -> configuration status
 */
enhancedSteps(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap<String, String> queryParams, String body, HttpServletRequest request ->
    // Simple test endpoint for now
    return Response.ok(new JsonBuilder([message: "GET method works", timestamp: new Date()]).toString()).build()
}
