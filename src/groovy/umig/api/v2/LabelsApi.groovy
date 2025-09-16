package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.LabelRepository
import umig.service.UserService
import umig.utils.security.RateLimitManager
import umig.utils.security.ErrorSanitizer
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import groovy.transform.Field

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException
import java.util.UUID
import groovy.json.JsonException
import java.util.concurrent.TimeUnit
import org.slf4j.Logger
import org.slf4j.LoggerFactory

@BaseScript CustomEndpointDelegate delegate

@Field
final LabelRepository labelRepository = new LabelRepository()

@Field
final UserService userService = new UserService()

@Field
final RateLimitManager rateLimitManager = RateLimitManager.getInstance()

@Field
final ErrorSanitizer errorSanitizer = ErrorSanitizer.getInstance()

@Field
final Logger log = LoggerFactory.getLogger('LabelsApi')

// Rate limiting configuration per endpoint (requests per minute)
@Field
final Map<String, Map<String, Integer>> RATE_LIMITS = [
    'GET': ['limit': 150, 'windowMs': 60000],      // 150 per minute for read operations
    'POST': ['limit': 15, 'windowMs': 60000],      // 15 per minute for create operations
    'PUT': ['limit': 25, 'windowMs': 60000],       // 25 per minute for update operations
    'DELETE': ['limit': 10, 'windowMs': 60000]     // 10 per minute for delete operations
]

private Integer getLabelIdFromPath(HttpServletRequest request) {
    def extraPath = getAdditionalPath(request)
    if (extraPath) {
        def pathParts = extraPath.split('/').findAll { it }
        if (pathParts.size() >= 1) {
            try {
                return pathParts[0].toInteger()
            } catch (NumberFormatException e) {
                return null
            }
        }
    }
    return null
}

/**
 * Enhanced rate limiting and security validation wrapper
 * @param httpMethod HTTP method for the request
 * @param request HTTP servlet request
 * @param operation Operation name for rate limiting
 * @return Response or null if validation passes
 */
private Response validateSecurityAndRateLimit(String httpMethod, HttpServletRequest request, String operation) {
    try {
        // Get client identifier for rate limiting
        String clientId = getClientIdentifier(request)
        
        // Check rate limits
        def rateLimitConfig = RATE_LIMITS[httpMethod]
        if (rateLimitConfig) {
            boolean allowed = rateLimitManager.isAllowed(
                clientId, 
                "labels_${httpMethod.toLowerCase()}",
                rateLimitConfig.limit,
                rateLimitConfig.windowMs
            )
            
            if (!allowed) {
                log.warn("Rate limit exceeded for client ${clientId} on ${httpMethod} ${operation}")
                return Response.status(429)
                    .entity(errorSanitizer.sanitizeError([
                        error: "Rate limit exceeded",
                        message: "Too many requests. Please wait before trying again.",
                        retryAfter: rateLimitConfig.windowMs / 1000
                    ]))
                    .header("Retry-After", String.valueOf(rateLimitConfig.windowMs / 1000))
                    .header("X-RateLimit-Limit", String.valueOf(rateLimitConfig.limit))
                    .header("X-RateLimit-Remaining", "0")
                    .build()
            }
            
            // Add rate limit headers to successful requests
            int remaining = rateLimitManager.getRemaining(clientId, "labels_${httpMethod.toLowerCase()}")
            // Headers will be added to response in calling method
        }
        
        return null // Validation passed
    } catch (Exception e) {
        log.error("Security validation failed for ${httpMethod} ${operation}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(errorSanitizer.sanitizeError([error: "Security validation failed"]))
            .build()
    }
}

/**
 * Get client identifier for rate limiting
 * @param request HTTP servlet request
 * @return Client identifier string
 */
private String getClientIdentifier(HttpServletRequest request) {
    // Use multiple factors for client identification
    String remoteAddr = request.getRemoteAddr()
    String userAgent = request.getHeader("User-Agent") ?: "unknown"
    String sessionId = request.getSession(false)?.getId() ?: "no-session"
    
    // Create composite identifier
    return "${remoteAddr}:${sessionId}:${userAgent.hashCode()}"
}

/**
 * Get current user with proper error handling and audit logging
 * @param request HTTP servlet request (unused, kept for compatibility)
 * @return User identifier string
 */
private String getCurrentUser(HttpServletRequest request = null) {
    try {
        def userContext = userService.getCurrentUserContext()
        def auditUser = userContext.userCode ?: userContext.userId?.toString() ?: 'system'
        log.debug("Using user context for labels operation: ${auditUser}")
        return auditUser
    } catch (Exception e) {
        log.warn("Failed to get current user context, falling back to system", e)
        return 'system'
    }
}

// GET /labels, /labels/{id}, /labels/{id}/blocking-relationships
labels(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    // Security and rate limiting validation
    def securityValidation = validateSecurityAndRateLimit("GET", request, "labels")
    if (securityValidation) {
        return securityValidation
    }
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []
    
    // Handle /labels/{id}/blocking-relationships
    if (pathParts.size() == 2 && pathParts[1] == 'blocking-relationships') {
        Integer labelId = getLabelIdFromPath(request)
        
        if (labelId == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Label ID format."]).toString()).build()
        }
        
        try {
            def label = labelRepository.findLabelById(labelId)
            if (!label) {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Label with ID ${labelId} not found."]).toString()).build()
            }
            
            def blockingRelationships = labelRepository.getLabelBlockingRelationships(labelId)
            return Response.ok(new JsonBuilder(blockingRelationships).toString()).build()
            
        } catch (SQLException e) {
            log.error("Database error in GET /labels/{id}/blocking-relationships", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(errorSanitizer.sanitizeError([
                    error: "Database operation failed",
                    message: "Unable to retrieve label relationships. Please try again later.",
                    requestId: UUID.randomUUID().toString()
                ]))
                .build()
        } catch (Exception e) {
            log.error("Unexpected error in GET /labels/{id}/blocking-relationships", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(errorSanitizer.sanitizeError([
                    error: "Internal server error",
                    message: "An unexpected error occurred. Please try again later.",
                    requestId: UUID.randomUUID().toString()
                ]))
                .build()
        }
    }
    
    // Handle /labels/{id}
    Integer labelId = getLabelIdFromPath(request)

    // Handle case where path is /labels/{invalid_id}
    if (getAdditionalPath(request) && labelId == null && pathParts.size() == 1) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Label ID format."]).toString()).build()
    }

    try {
        if (labelId != null && pathParts.size() == 1) {
            def label = labelRepository.findLabelById(labelId)
            if (!label) {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Label with ID ${labelId} not found."]).toString()).build()
            }
            return Response.ok(new JsonBuilder(label).toString()).build()
        } else if (!extraPath || pathParts.size() == 0) {
            // Handle /labels (list with hierarchical filtering and pagination)
            def labels
            
            // Extract hierarchical filtering parameters
            def migrationId = queryParams.getFirst('migrationId')
            def iterationId = queryParams.getFirst('iterationId')
            def planId = queryParams.getFirst('planId')
            def sequenceId = queryParams.getFirst('sequenceId')
            def phaseId = queryParams.getFirst('phaseId')
            
            // Extract pagination parameters
            def page = queryParams.getFirst('page')
            def size = queryParams.getFirst('size')
            def search = queryParams.getFirst('search')
            def sort = queryParams.getFirst('sort')
            def direction = queryParams.getFirst('direction')
            
            // Admin GUI compatibility - handle parameterless calls
            if (!migrationId && !iterationId && !planId && !sequenceId && !phaseId && 
                !page && !size && !search && !sort && !direction) {
                return Response.ok(new JsonBuilder([]).toString()).build()
            }
            
            // Check for hierarchical filtering query parameters first
            if (migrationId) {
                try {
                    def migId = UUID.fromString(migrationId as String)
                    labels = labelRepository.findLabelsByMigrationId(migId)
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid migration ID format"]).toString()).build()
                }
            } else if (iterationId) {
                try {
                    def iteId = UUID.fromString(iterationId as String)
                    labels = labelRepository.findLabelsByIterationId(iteId)
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid iteration ID format"]).toString()).build()
                }
            } else if (planId) {
                try {
                    def planInstanceId = UUID.fromString(planId as String)
                    labels = labelRepository.findLabelsByPlanId(planInstanceId)
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid plan ID format"]).toString()).build()
                }
            } else if (sequenceId) {
                try {
                    def sequenceInstanceId = UUID.fromString(sequenceId as String)
                    labels = labelRepository.findLabelsBySequenceId(sequenceInstanceId)
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid sequence ID format"]).toString()).build()
                }
            } else if (phaseId) {
                try {
                    def phaseInstanceId = UUID.fromString(phaseId as String)
                    labels = labelRepository.findLabelsByPhaseId(phaseInstanceId)
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid phase ID format"]).toString()).build()
                }
            } else {
                // Handle pagination/search for main labels list
                // Parse pagination parameters with defaults
                int pageNumber = 1
                int pageSize = 50
                
                if (page) {
                    try {
                        pageNumber = Integer.parseInt(page as String)
                        if (pageNumber < 1) pageNumber = 1
                    } catch (NumberFormatException e) {
                        pageNumber = 1
                    }
                }
                
                if (size) {
                    try {
                        pageSize = Integer.parseInt(size as String)
                        if (pageSize < 1) pageSize = 50
                        if (pageSize > 500) pageSize = 500 // Maximum limit
                    } catch (NumberFormatException e) {
                        pageSize = 50
                    }
                }
                
                // Parse sort parameters
                String sortField = null
                String sortDirection = 'asc'
                
                if (sort) {
                    // Validate sort field against allowed columns
                    def allowedSortFields = ['lbl_id', 'lbl_name', 'lbl_description', 'lbl_color', 'mig_name', 'application_count', 'step_count', 'created_at']
                    if (allowedSortFields.contains(sort as String)) {
                        sortField = sort as String
                    }
                }
                
                if (direction && ['asc', 'desc'].contains((direction as String).toLowerCase())) {
                    sortDirection = (direction as String).toLowerCase()
                }
                
                // Validate search term
                String searchTerm = search as String
                if (searchTerm && searchTerm.trim().length() < 2) {
                    searchTerm = null  // Ignore very short search terms (less than 2 characters)
                }
                
                // Get paginated labels
                def result = labelRepository.findAllLabelsWithPagination(pageNumber, pageSize, searchTerm, sortField, sortDirection)
                return Response.ok(new JsonBuilder(result).toString()).build()
            }
            
            // Return simple list for hierarchical filtering
            return Response.ok(new JsonBuilder(labels).toString()).build()
            
        } else {
            // Unknown path
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Endpoint not found"]).toString()).build()
        }
    } catch (SQLException e) {
        log.error("Database error in GET /labels", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(errorSanitizer.sanitizeError([
                error: "Database operation failed",
                message: "Unable to retrieve labels. Please try again later.",
                requestId: UUID.randomUUID().toString()
            ]))
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in GET /labels", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(errorSanitizer.sanitizeError([
                error: "Internal server error",
                message: "An unexpected error occurred. Please try again later.",
                requestId: UUID.randomUUID().toString()
            ]))
            .build()
    }
}

// POST /labels
labels(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    // Security and rate limiting validation
    def securityValidation = validateSecurityAndRateLimit("POST", request, "labels")
    if (securityValidation) {
        return securityValidation
    }
    try {
        if (!body || body.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Request body is required"]).toString()).build()
        }

        def jsonSlurper = new JsonSlurper()
        Map labelData = jsonSlurper.parseText(body) as Map

        // Basic validation - required fields
        if (!labelData['lbl_name'] || labelData['lbl_name'].toString().trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "lbl_name is required"]).toString()).build()
        }

        if (!labelData['lbl_color'] || labelData['lbl_color'].toString().trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "lbl_color is required"]).toString()).build()
        }

        if (!labelData['mig_id']) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "mig_id is required"]).toString()).build()
        }

        // Validate field lengths
        if (labelData['lbl_name'].toString().length() > 100) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "lbl_name must be 100 characters or less"]).toString()).build()
        }

        if (labelData['lbl_description'] && labelData['lbl_description'].toString().length() > 500) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "lbl_description must be 500 characters or less"]).toString()).build()
        }

        if (labelData['lbl_color'].toString().length() > 7) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "lbl_color must be 7 characters or less (hex color format)"]).toString()).build()
        }

        // Type safety - explicit casting per ADR-031
        def processedLabelData = [:]
        processedLabelData['lbl_name'] = labelData['lbl_name'].toString().trim()
        processedLabelData['lbl_color'] = labelData['lbl_color'].toString().trim()
        
        if (labelData['lbl_description']) {
            processedLabelData['lbl_description'] = labelData['lbl_description'].toString().trim()
        }
        
        try {
            processedLabelData['mig_id'] = UUID.fromString(labelData['mig_id'] as String)
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid mig_id format. Must be a valid UUID."]).toString()).build()
        }

        // Add audit fields with proper user context
        String currentUser = getCurrentUser(request)
        processedLabelData['created_by'] = currentUser

        // Create label
        def newLabel = labelRepository.createLabel(processedLabelData as Map)
        return Response.status(Response.Status.CREATED).entity(new JsonBuilder(newLabel).toString()).build()

    } catch (JsonException e) {
        log.error("JSON parsing error in POST /labels", e)
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid JSON in request body"]).toString()).build()
    } catch (SQLException e) {
        log.error("Database error in POST /labels", e)
        // Handle specific SQL errors with sanitized responses
        if (e.getSQLState() == "23505") { // Unique constraint violation
            return Response.status(Response.Status.CONFLICT)
                .entity(errorSanitizer.sanitizeError([
                    error: "Conflict",
                    message: "Label with this name already exists in the migration",
                    field: "lbl_name"
                ]))
                .build()
        } else if (e.getSQLState() == "23503") { // Foreign key constraint violation
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(errorSanitizer.sanitizeError([
                    error: "Invalid reference",
                    message: "Referenced migration does not exist",
                    field: "mig_id"
                ]))
                .build()
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(errorSanitizer.sanitizeError([
                error: "Database operation failed",
                message: "Unable to create label. Please try again later.",
                requestId: UUID.randomUUID().toString()
            ]))
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in POST /labels", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(errorSanitizer.sanitizeError([
                error: "Internal server error",
                message: "An unexpected error occurred. Please try again later.",
                requestId: UUID.randomUUID().toString()
            ]))
            .build()
    }
}

// PUT /labels/{id}
labels(httpMethod: "PUT", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    // Security and rate limiting validation
    def securityValidation = validateSecurityAndRateLimit("PUT", request, "labels")
    if (securityValidation) {
        return securityValidation
    }
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []
    
    // Handle /labels/{id}
    Integer labelId = getLabelIdFromPath(request)

    if (labelId == null || pathParts.size() != 1) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Label ID format."]).toString()).build()
    }

    try {
        if (!body || body.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Request body is required"]).toString()).build()
        }

        def jsonSlurper = new JsonSlurper()
        Map labelData = jsonSlurper.parseText(body) as Map

        // Build update map with type safety
        def updates = [:]
        
        if (labelData.containsKey('lbl_name')) {
            def name = labelData['lbl_name']?.toString()?.trim()
            if (!name || name.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "lbl_name cannot be empty"]).toString()).build()
            }
            if (name.length() > 100) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "lbl_name must be 100 characters or less"]).toString()).build()
            }
            updates['lbl_name'] = name
        }

        if (labelData.containsKey('lbl_description')) {
            def description = labelData['lbl_description']?.toString()?.trim()
            if (description && description.length() > 500) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "lbl_description must be 500 characters or less"]).toString()).build()
            }
            updates['lbl_description'] = description
        }

        if (labelData.containsKey('lbl_color')) {
            def color = labelData['lbl_color']?.toString()?.trim()
            if (!color || color.isEmpty()) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "lbl_color cannot be empty"]).toString()).build()
            }
            if (color.length() > 7) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "lbl_color must be 7 characters or less (hex color format)"]).toString()).build()
            }
            updates['lbl_color'] = color
        }

        if (labelData.containsKey('mig_id')) {
            try {
                updates['mig_id'] = UUID.fromString(labelData['mig_id'] as String)
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid mig_id format. Must be a valid UUID."]).toString()).build()
            }
        }

        if (updates.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "At least one field must be provided for update"]).toString()).build()
        }

        // Add audit fields with proper user context for update
        String currentUser = getCurrentUser(request)
        updates['updated_by'] = currentUser
        updates['updated_at'] = new Date()
        
        // Update label
        def updatedLabel = labelRepository.updateLabel(labelId as Integer, updates as Map)
        if (!updatedLabel) {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Label with ID ${labelId} not found."]).toString()).build()
        }

        return Response.ok(new JsonBuilder(updatedLabel).toString()).build()

    } catch (JsonException e) {
        log.error("JSON parsing error in PUT /labels/{id}", e)
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid JSON in request body"]).toString()).build()
    } catch (SQLException e) {
        log.error("Database error in PUT /labels/{id}", e)
        if (e.getSQLState() == "23505") { // Unique constraint violation
            return Response.status(Response.Status.CONFLICT)
                .entity(errorSanitizer.sanitizeError([
                    error: "Conflict",
                    message: "Label with this name already exists in the migration",
                    field: "lbl_name"
                ]))
                .build()
        } else if (e.getSQLState() == "23503") { // Foreign key constraint violation
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(errorSanitizer.sanitizeError([
                    error: "Invalid reference",
                    message: "Referenced migration does not exist",
                    field: "mig_id"
                ]))
                .build()
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(errorSanitizer.sanitizeError([
                error: "Database operation failed",
                message: "Unable to update label. Please try again later.",
                requestId: UUID.randomUUID().toString()
            ]))
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in PUT /labels/{id}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(errorSanitizer.sanitizeError([
                error: "Internal server error",
                message: "An unexpected error occurred. Please try again later.",
                requestId: UUID.randomUUID().toString()
            ]))
            .build()
    }
}

// DELETE /labels/{id}
labels(httpMethod: "DELETE", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    // Security and rate limiting validation
    def securityValidation = validateSecurityAndRateLimit("DELETE", request, "labels")
    if (securityValidation) {
        return securityValidation
    }
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []
    
    // Handle /labels/{id}
    Integer labelId = getLabelIdFromPath(request)

    if (labelId == null || pathParts.size() != 1) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Label ID format."]).toString()).build()
    }

    try {
        // Check if label exists
        def label = labelRepository.findLabelById(labelId)
        if (!label) {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Label with ID ${labelId} not found."]).toString()).build()
        }

        // Check for blocking relationships
        def blockingRelationships = labelRepository.getLabelBlockingRelationships(labelId)
        if (blockingRelationships && !blockingRelationships.isEmpty()) {
            return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([
                error: "Cannot delete label. It has existing relationships.",
                details: "This label is still associated with applications or steps. Remove these associations first.",
                relationships: blockingRelationships
            ]).toString()).build()
        }

        // Delete label
        def deleted = labelRepository.deleteLabel(labelId)
        if (deleted) {
            return Response.ok(new JsonBuilder([message: "Label deleted successfully"]).toString()).build()
        } else {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Failed to delete label"]).toString()).build()
        }

    } catch (SQLException e) {
        log.error("Database error in DELETE /labels/{id}", e)
        if (e.getSQLState() == "23503") { // Foreign key constraint violation
            return Response.status(Response.Status.CONFLICT)
                .entity(errorSanitizer.sanitizeError([
                    error: "Cannot delete label",
                    message: "This label is still associated with applications or steps. Remove these associations first.",
                    details: "Label has existing relationships that prevent deletion"
                ]))
                .build()
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(errorSanitizer.sanitizeError([
                error: "Database operation failed",
                message: "Unable to delete label. Please try again later.",
                requestId: UUID.randomUUID().toString()
            ]))
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in DELETE /labels/{id}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(errorSanitizer.sanitizeError([
                error: "Internal server error",
                message: "An unexpected error occurred. Please try again later.",
                requestId: UUID.randomUUID().toString()
            ]))
            .build()
    }
}