package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.IterationTypeRepository
import umig.service.UserService
import umig.utils.RateLimiter
import umig.utils.RBACUtil
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import groovy.transform.Field
import groovy.json.JsonException
import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException
import java.util.regex.Pattern
import org.apache.log4j.LogManager
import org.apache.log4j.Logger

@BaseScript CustomEndpointDelegate delegate

@Field
final Logger log = LogManager.getLogger(getClass())

@Field
final IterationTypeRepository iterationTypeRepository = new IterationTypeRepository()

@Field
final UserService userService = new UserService()

/**
 * Color validation utility
 * Validates hex color codes (e.g., #6B73FF, #000000)
 */
private static boolean isValidHexColor(String color) {
    if (!color) return false
    return Pattern.matches(/^#[0-9A-Fa-f]{6}$/, color)
}

/**
 * Icon name validation utility
 * Validates common icon naming patterns (alphanumeric, dash, underscore)
 */
private static boolean isValidIconName(String iconName) {
    if (!iconName) return false
    return Pattern.matches(/^[a-zA-Z0-9_-]+$/, iconName)
}

/**
 * GET /iterationTypes - List all iteration types
 * Simple endpoint to serve iteration types for Admin GUI dropdowns
 * Query parameters:
 * - includeInactive: boolean to include inactive iteration types
 * - stats: boolean to include usage statistics
 */
iterationTypes(httpMethod: "GET", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // Rate limiting check
    def rateLimiter = RateLimiter.getInstance()
    def userContext = userService.getCurrentUserContext()
    def userKey = (userContext.userCode ?: userContext.userId?.toString() ?: request.remoteAddr) as String
    
    if (!rateLimiter.checkRateLimit(userKey, 'read', 200)) {
        log.warn("Rate limit exceeded for user: ${userKey}")
        return Response.status(429)
            .entity(new JsonBuilder([error: 'Rate limit exceeded. Please try again later.']).toString())
            .header('X-RateLimit-Limit', '200')
            .header('X-RateLimit-Remaining', '0')
            .header('X-RateLimit-Reset', rateLimiter.getResetTimeSeconds(userKey, 'read').toString())
            .header('Retry-After', '60')
            .build()
    }

    try {
        log.info("GET /iterationTypes - Fetching iteration types for user: ${userKey}")

        // GET /iterationTypes/{code} - Get specific iteration type
        if (pathParts.size() == 1) {
            def ittCode = pathParts[0] as String
            def iterationType = iterationTypeRepository.findIterationTypeByCode(ittCode)
            
            if (!iterationType) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Iteration type with code '${ittCode}' not found"]).toString())
                    .build()
            }
            
            log.info("GET /iterationTypes/${ittCode} - Found iteration type")
            return Response.ok(new JsonBuilder(iterationType).toString())
                .header('X-Content-Type-Options', 'nosniff')
                .header('X-Frame-Options', 'DENY')
                .header('X-XSS-Protection', '1; mode=block')
                .header('X-RateLimit-Limit', '200')
                .header('X-RateLimit-Remaining', rateLimiter.getRemainingRequests(userKey, 'read').toString())
                .build()
        }

        // Parse query parameters
        def includeInactive = queryParams.getFirst('includeInactive') == 'true'
        def showStats = queryParams.getFirst('stats') == 'true'
        
        // Handle pagination and sorting parameters from Admin GUI
        def pageParam = queryParams.getFirst('page')
        def sizeParam = queryParams.getFirst('size')
        def sortParam = queryParams.getFirst('sort')
        def directionParam = queryParams.getFirst('direction')
        
        // Check if this is a paginated request (Admin GUI)
        boolean isPaginatedRequest = pageParam || sizeParam || sortParam || directionParam
        
        if (isPaginatedRequest) {
            // Parse pagination parameters with validation (ADR-031 Type Safety)
            int pageNumber = 1
            int pageSize = 50
            String sortField = null
            String sortDirection = 'asc'
            
            try {
                if (pageParam) {
                    pageNumber = Integer.parseInt(pageParam as String)
                    if (pageNumber < 1) pageNumber = 1
                }
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid page parameter: must be a positive integer"]).toString())
                    .build()
            }
            
            try {
                if (sizeParam) {
                    pageSize = Integer.parseInt(sizeParam as String)
                    if (pageSize < 1 || pageSize > 1000) pageSize = 50 // Reasonable limits
                }
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid size parameter: must be a positive integer"]).toString())
                    .build()
            }
            
            if (sortParam) {
                sortField = sortParam as String
                // Validate sort field (must match repository validation)
                def allowedSortFields = ['itt_code', 'itt_name', 'itt_description', 'itt_color', 'itt_icon', 'itt_display_order', 'itt_active', 'created_by', 'created_at', 'updated_by', 'updated_at']
                if (!allowedSortFields.contains(sortField)) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid sort field: ${sortField}. Allowed fields: ${allowedSortFields.join(', ')}"]).toString())
                        .build()
                }
            }
            
            if (directionParam) {
                sortDirection = directionParam as String
                if (!['asc', 'desc'].contains(sortDirection.toLowerCase())) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid direction parameter: must be 'asc' or 'desc'"]).toString())
                        .build()
                }
            }
            
            log.debug("GET /iterationTypes - Paginated request: page=${pageNumber}, size=${pageSize}, sort=${sortField}, direction=${sortDirection}")
            
            // Use paginated repository method
            def result = iterationTypeRepository.findAllIterationTypesWithPagination(pageNumber, pageSize, includeInactive, sortField, sortDirection)
            
            // Explicit casting for type safety (ADR-031)
            def resultMap = result as Map
            def dataList = resultMap.data as List
            def paginationMap = resultMap.pagination as Map
            def totalPages = paginationMap.totalPages as Integer
            
            log.info("GET /iterationTypes - Paginated response: ${dataList.size()} iteration types (page ${pageNumber} of ${totalPages})")
            
            return Response.ok(new JsonBuilder(result).toString())
                .header('X-Content-Type-Options', 'nosniff')
                .header('X-Frame-Options', 'DENY')
                .header('X-XSS-Protection', '1; mode=block')
                .header('X-RateLimit-Limit', '200')
                .header('X-RateLimit-Remaining', rateLimiter.getRemainingRequests(userKey, 'read').toString())
                .build()
        } else {
            // Legacy non-paginated request
            def iterationTypes
            if (showStats) {
                iterationTypes = iterationTypeRepository.getIterationTypeUsageStats() as List
                log.info("GET /iterationTypes - Found ${iterationTypes.size()} iteration types with usage stats")
            } else {
                iterationTypes = iterationTypeRepository.findAllIterationTypes(includeInactive) as List
                log.info("GET /iterationTypes - Found ${iterationTypes.size()} iteration types (includeInactive: ${includeInactive})")
            }
            
            return Response.ok(new JsonBuilder(iterationTypes).toString())
                .header('X-Content-Type-Options', 'nosniff')
                .header('X-Frame-Options', 'DENY')
                .header('X-XSS-Protection', '1; mode=block')
                .header('X-RateLimit-Limit', '200')
                .header('X-RateLimit-Remaining', rateLimiter.getRemainingRequests(userKey, 'read').toString())
                .build()
        }
        
    } catch (SQLException e) {
        log.error("Database error in GET /iterationTypes", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred"]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in GET /iterationTypes", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected internal error occurred"]).toString())
            .build()
    }
}

/**
 * POST /iterationTypes - Create a new iteration type
 * Body should contain iteration type data in JSON format
 */
iterationTypes(httpMethod: "POST", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        // Extract user context
        def userContext = userService.getCurrentUserContext()
        def userKey = (userContext.userCode ?: userContext.userId?.toString() ?: request.remoteAddr) as String
        def auditUser = (userContext.userCode ?: userContext.userId?.toString() ?: 'system') as String
        
        // Rate limiting check
        def rateLimiter = RateLimiter.getInstance()
        if (!rateLimiter.checkRateLimit(userKey, 'write', 50)) {
            log.warn("Rate limit exceeded for user: ${userKey}")
            return Response.status(429)
                .entity(new JsonBuilder([error: 'Rate limit exceeded. Please try again later.']).toString())
                .header('X-RateLimit-Limit', '50')
                .header('X-RateLimit-Remaining', '0')
                .header('X-RateLimit-Reset', rateLimiter.getResetTimeSeconds(userKey, 'write').toString())
                .header('Retry-After', '60')
                .build()
        }
        
        // RBAC check
        def rbacUtil = RBACUtil.getInstance()
        if (!rbacUtil.hasRole(userKey, 'ITERATION_TYPE_ADMIN')) {
            rbacUtil.auditSecurityEvent(userKey, 'CREATE', 'ITERATION_TYPE', false)
            log.warn("Unauthorized access attempt for user: ${userKey} on POST /iterationTypes")
            return Response.status(403)
                .entity(new JsonBuilder([error: 'Insufficient permissions to create iteration types']).toString())
                .build()
        }
        
        log.info("POST /iterationTypes - Creating new iteration type by user: ${userKey}")
        
        Map iterationTypeData = new JsonSlurper().parseText(body) as Map
        
        // Mass assignment protection - whitelist allowed fields
        def allowedFields = ['itt_code', 'itt_name', 'itt_description', 'itt_color', 'itt_icon', 'itt_display_order', 'itt_active']
        def sanitizedData = [:]
        allowedFields.each { field ->
            if (iterationTypeData.containsKey(field)) {
                sanitizedData[field] = iterationTypeData[field]
            }
        }
        
        // Prevent injection of system fields
        ['created_at', 'updated_at', 'created_by', 'updated_by'].each { systemField ->
            if (iterationTypeData.containsKey(systemField)) {
                log.warn("Attempted to set system field ${systemField} by user ${userKey}")
            }
        }
        
        // Add audit fields (using sanitized data)
        sanitizedData.created_by = auditUser
        sanitizedData.updated_by = auditUser
        
        // Validate required fields
        if (!sanitizedData.itt_code) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "itt_code is required"]).toString())
                .build()
        }
        
        if (!sanitizedData.itt_name) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "itt_name is required"]).toString())
                .build()
        }
        
        // Validate itt_code format (alphanumeric, underscore, dash)
        def ittCode = sanitizedData.itt_code as String
        if (!Pattern.matches(/^[a-zA-Z0-9_-]+$/, ittCode)) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "itt_code must contain only alphanumeric characters, underscores, and dashes"]).toString())
                .build()
        }
        
        // Validate optional color field
        if (sanitizedData.itt_color && !isValidHexColor(sanitizedData.itt_color as String)) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "itt_color must be a valid hex color code (e.g., #6B73FF)"]).toString())
                .build()
        }
        
        // Validate optional icon field
        if (sanitizedData.itt_icon && !isValidIconName(sanitizedData.itt_icon as String)) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "itt_icon must contain only alphanumeric characters, underscores, and dashes"]).toString())
                .build()
        }
        
        // Validate display_order if provided
        if (sanitizedData.itt_display_order != null) {
            try {
                def displayOrder = Integer.parseInt(sanitizedData.itt_display_order as String)
                sanitizedData.itt_display_order = displayOrder
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "itt_display_order must be a valid integer"]).toString())
                    .build()
            }
        }
        
        // Check if iteration type code already exists
        if (iterationTypeRepository.iterationTypeExists(ittCode)) {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([error: "Iteration type with code '${ittCode}' already exists"]).toString())
                .build()
        }
        
        def newIterationType = iterationTypeRepository.createIterationType(sanitizedData)
        
        if (newIterationType) {
            def iterationType = newIterationType as Map
            rbacUtil.auditSecurityEvent(userKey, 'CREATE', ("ITERATION_TYPE:${iterationType.itt_code}" as String), true)
            log.info("POST /iterationTypes - Created iteration type with code: ${iterationType.itt_code}")
            return Response.status(Response.Status.CREATED)
                .entity(new JsonBuilder(newIterationType).toString())
                .header('X-Content-Type-Options', 'nosniff')
                .header('X-Frame-Options', 'DENY')
                .header('X-XSS-Protection', '1; mode=block')
                .header('X-RateLimit-Limit', '50')
                .header('X-RateLimit-Remaining', rateLimiter.getRemainingRequests(userKey, 'write').toString())
                .build()
        } else {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Failed to create iteration type due to an unknown error"]).toString())
                .build()
        }
        
    } catch (JsonException e) {
        log.warn("Invalid JSON format in POST /iterationTypes", e)
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
            .build()
    } catch (IllegalArgumentException e) {
        log.warn("Validation error in POST /iterationTypes: ${e.message}", e)
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: e.message]).toString())
            .build()
    } catch (SQLException e) {
        if (e.getSQLState() == '23505' && e.getMessage().contains("iteration_types_itt_pkey")) {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([error: "An iteration type with this code already exists"]).toString())
                .build()
        }
        log.error("Database error in POST /iterationTypes", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "A database error occurred"]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in POST /iterationTypes", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected internal error occurred"]).toString())
            .build()
    }
}

/**
 * PUT /iterationTypes/{code} - Update an existing iteration type
 * Body should contain updated iteration type data in JSON format
 */
iterationTypes(httpMethod: "PUT", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // PUT /iterationTypes/{code} - Update specific iteration type
    if (pathParts.size() == 1) {
        try {
            def ittCode = pathParts[0] as String
            
            // Extract user context
            def userContext = userService.getCurrentUserContext()
            def userKey = (userContext.userCode ?: userContext.userId?.toString() ?: request.remoteAddr) as String
            def auditUser = (userContext.userCode ?: userContext.userId?.toString() ?: 'system') as String
            
            // Rate limiting check
            def rateLimiter = RateLimiter.getInstance()
            if (!rateLimiter.checkRateLimit(userKey, 'write', 50)) {
                log.warn("Rate limit exceeded for user: ${userKey}")
                return Response.status(429)
                    .entity(new JsonBuilder([error: 'Rate limit exceeded. Please try again later.']).toString())
                    .header('X-RateLimit-Limit', '50')
                    .header('X-RateLimit-Remaining', '0')
                    .header('X-RateLimit-Reset', rateLimiter.getResetTimeSeconds(userKey, 'write').toString())
                    .header('Retry-After', '60')
                    .build()
            }
            
            // RBAC check
            def rbacUtil = RBACUtil.getInstance()
            if (!rbacUtil.hasRole(userKey, 'ITERATION_TYPE_ADMIN')) {
                rbacUtil.auditSecurityEvent(userKey, 'UPDATE', "ITERATION_TYPE:${ittCode}", false)
                log.warn("Unauthorized access attempt for user: ${userKey} on PUT /iterationTypes/${ittCode}")
                return Response.status(403)
                    .entity(new JsonBuilder([error: 'Insufficient permissions to update iteration types']).toString())
                    .build()
            }
            
            log.info("PUT /iterationTypes/${ittCode} - Updating iteration type by user: ${userKey}")
            
            Map iterationTypeData = new JsonSlurper().parseText(body) as Map
            
            // Mass assignment protection - whitelist allowed fields
            def allowedUpdateFields = ['itt_name', 'itt_description', 'itt_color', 'itt_icon', 'itt_display_order', 'itt_active']
            def sanitizedData = [:]
            allowedUpdateFields.each { field ->
                if (iterationTypeData.containsKey(field)) {
                    sanitizedData[field] = iterationTypeData[field]
                }
            }
            
            // Prevent modification of system fields
            ['itt_code', 'created_by', 'created_at', 'updated_at'].each { protectedField ->
                if (iterationTypeData.containsKey(protectedField)) {
                    log.warn("Attempted to modify protected field ${protectedField} by user ${userKey}")
                }
            }
            
            // Add audit fields (using sanitized data)
            sanitizedData.updated_by = auditUser
            
            // Check if iteration type exists
            def existingIterationType = iterationTypeRepository.findIterationTypeByCode(ittCode)
            if (!existingIterationType) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Iteration type with code '${ittCode}' not found"]).toString())
                    .build()
            }
            
            // Validate optional color field
            if (sanitizedData.itt_color && !isValidHexColor(sanitizedData.itt_color as String)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "itt_color must be a valid hex color code (e.g., #6B73FF)"]).toString())
                    .build()
            }
            
            // Validate optional icon field
            if (sanitizedData.itt_icon && !isValidIconName(sanitizedData.itt_icon as String)) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "itt_icon must contain only alphanumeric characters, underscores, and dashes"]).toString())
                    .build()
            }
            
            // Validate display_order if provided
            if (sanitizedData.itt_display_order != null) {
                try {
                    def displayOrder = Integer.parseInt(sanitizedData.itt_display_order as String)
                    sanitizedData.itt_display_order = displayOrder
                } catch (NumberFormatException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "itt_display_order must be a valid integer"]).toString())
                        .build()
                }
            }
            
            // Validate itt_active if provided
            if (sanitizedData.itt_active != null) {
                if (sanitizedData.itt_active instanceof String) {
                    sanitizedData.itt_active = Boolean.parseBoolean(sanitizedData.itt_active as String)
                } else if (!(sanitizedData.itt_active instanceof Boolean)) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "itt_active must be a boolean value"]).toString())
                        .build()
                }
            }
            
            def updatedIterationType = iterationTypeRepository.updateIterationType(ittCode, sanitizedData)
            
            if (updatedIterationType) {
                rbacUtil.auditSecurityEvent(userKey, 'UPDATE', "ITERATION_TYPE:${ittCode}", true)
                log.info("PUT /iterationTypes/${ittCode} - Updated iteration type successfully by user: ${userKey}")
                return Response.ok(new JsonBuilder(updatedIterationType).toString())
                    .header('X-Content-Type-Options', 'nosniff')
                    .header('X-Frame-Options', 'DENY')
                    .header('X-XSS-Protection', '1; mode=block')
                    .header('X-RateLimit-Limit', '50')
                    .header('X-RateLimit-Remaining', rateLimiter.getRemainingRequests(userKey, 'write').toString())
                    .build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Iteration type with code '${ittCode}' not found for update"]).toString())
                    .build()
            }
            
        } catch (JsonException e) {
            log.warn("Invalid JSON format in PUT /iterationTypes/${pathParts[0]}", e)
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
                .build()
        } catch (SQLException e) {
            log.error("Database error in PUT /iterationTypes/${pathParts[0]}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "A database error occurred"]).toString())
                .build()
        } catch (Exception e) {
            log.error("Unexpected error in PUT /iterationTypes/${pathParts[0]}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred"]).toString())
                .build()
        }
    }

    // Fallback for invalid PUT paths
    return Response.status(Response.Status.BAD_REQUEST)
        .entity(new JsonBuilder([error: "Invalid path for PUT request. Use /iterationTypes/{code}"]).toString())
        .build()
}

/**
 * DELETE /iterationTypes/{code} - Soft delete an iteration type (set itt_active = false)
 * Checks for blocking relationships before allowing deletion
 */
iterationTypes(httpMethod: "DELETE", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // DELETE /iterationTypes/{code} - Delete specific iteration type
    if (pathParts.size() == 1) {
        try {
            def ittCode = pathParts[0] as String
            
            // Extract user context
            def userContext = userService.getCurrentUserContext()
            def userKey = (userContext.userCode ?: userContext.userId?.toString() ?: request.remoteAddr) as String
            
            // Rate limiting check
            def rateLimiter = RateLimiter.getInstance()
            if (!rateLimiter.checkRateLimit(userKey, 'write', 50)) {
                log.warn("Rate limit exceeded for user: ${userKey}")
                return Response.status(429)
                    .entity(new JsonBuilder([error: 'Rate limit exceeded. Please try again later.']).toString())
                    .header('X-RateLimit-Limit', '50')
                    .header('X-RateLimit-Remaining', '0')
                    .header('X-RateLimit-Reset', rateLimiter.getResetTimeSeconds(userKey, 'write').toString())
                    .header('Retry-After', '60')
                    .build()
            }
            
            // RBAC check
            def rbacUtil = RBACUtil.getInstance()
            if (!rbacUtil.hasRole(userKey, 'ITERATION_TYPE_ADMIN')) {
                rbacUtil.auditSecurityEvent(userKey, 'DELETE', "ITERATION_TYPE:${ittCode}", false)
                log.warn("Unauthorized access attempt for user: ${userKey} on DELETE /iterationTypes/${ittCode}")
                return Response.status(403)
                    .entity(new JsonBuilder([error: 'Insufficient permissions to delete iteration types']).toString())
                    .build()
            }
            
            log.info("DELETE /iterationTypes/${ittCode} - Attempting to delete iteration type by user: ${userKey}")
            
            // Check if iteration type exists
            def existingIterationType = iterationTypeRepository.findIterationTypeByCode(ittCode)
            if (!existingIterationType) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Iteration type with code '${ittCode}' not found"]).toString())
                    .build()
            }
            
            // Check for blocking relationships
            def blockingRelationships = iterationTypeRepository.getIterationTypeBlockingRelationships(ittCode) as Map
            if (blockingRelationships && !blockingRelationships.isEmpty()) {
                def errorMessage = "Cannot delete iteration type '${ittCode}' because it is still in use by:"
                def details = []
                
                if (blockingRelationships.iterations) {
                    def iterationNames = (blockingRelationships.iterations as List).collect { iteration ->
                        def iter = iteration as Map
                        "${iter.ite_name} (in migration: ${iter.mig_name})" 
                    }
                    details << "Iterations: ${iterationNames.join(', ')}"
                }
                
                if (blockingRelationships.steps_master) {
                    def stepNames = (blockingRelationships.steps_master as List).collect { step ->
                        def stepMap = step as Map
                        stepMap.stm_name
                    }
                    details << "Step templates: ${stepNames.join(', ')}"
                }
                
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([
                        error: errorMessage,
                        details: details,
                        blocking_relationships: blockingRelationships
                    ]).toString())
                    .header('X-Content-Type-Options', 'nosniff')
                    .header('X-Frame-Options', 'DENY')
                    .header('X-XSS-Protection', '1; mode=block')
                    .build()
            }
            
            // Audit field is set from the earlier extracted userKey
            def auditUser = userKey
            
            // Perform soft delete by setting itt_active = false
            def updateData = [
                itt_active: false,
                updated_by: auditUser
            ]
            
            def updatedIterationType = iterationTypeRepository.updateIterationType(ittCode, updateData)
            
            if (updatedIterationType) {
                rbacUtil.auditSecurityEvent(userKey, 'DELETE', "ITERATION_TYPE:${ittCode}", true)
                log.info("DELETE /iterationTypes/${ittCode} - Soft deleted iteration type successfully by user: ${userKey}")
                return Response.noContent()
                    .header('X-Content-Type-Options', 'nosniff')
                    .header('X-Frame-Options', 'DENY')
                    .header('X-XSS-Protection', '1; mode=block')
                    .header('X-RateLimit-Limit', '50')
                    .header('X-RateLimit-Remaining', rateLimiter.getRemainingRequests(userKey, 'write').toString())
                    .build()
            } else {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Iteration type with code '${ittCode}' not found for deletion"]).toString())
                    .build()
            }
            
        } catch (SQLException e) {
            if (e.getSQLState() == '23503') {
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([error: "Cannot delete iteration type with code '${pathParts[0]}' because it is still referenced by other resources"]).toString())
                    .build()
            }
            log.error("Database error in DELETE /iterationTypes/${pathParts[0]}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "A database error occurred"]).toString())
                .build()
        } catch (Exception e) {
            log.error("Unexpected error in DELETE /iterationTypes/${pathParts[0]}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "An unexpected internal error occurred"]).toString())
                .build()
        }
    }

    // Fallback for invalid DELETE paths
    return Response.status(Response.Status.BAD_REQUEST)
        .entity(new JsonBuilder([error: "Invalid path for DELETE request. Use /iterationTypes/{code}"]).toString())
        .build()
}