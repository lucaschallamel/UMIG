package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.MigrationRepository
import groovy.json.JsonBuilder
import groovy.json.JsonException
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import groovy.transform.Field
import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException
import java.util.UUID
import org.apache.log4j.LogManager
import org.apache.log4j.Logger

@BaseScript CustomEndpointDelegate delegate

@Field
final MigrationRepository migrationRepository = new MigrationRepository()

@Field
final Logger log = LogManager.getLogger(getClass())

/**
 * GET /iterations - List all iterations with pagination, filtering, and search
 * GET /iterations/{id} - Get single iteration with metadata
 * Updated: Force reload for proper pagination support
 */
iterationsList(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []

    try {
        if (pathParts.size() == 1) {
            // GET /iterations/{id} - Single iteration
            def iterationId = pathParts[0]
            try {
                def iteration = migrationRepository.findIterationById(UUID.fromString(iterationId))
                if (!iteration) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Iteration not found"]).toString())
                        .build()
                }
                
                return Response.ok(new JsonBuilder(iteration).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid iteration UUID"]).toString()).build()
            }
        } else if (!pathParts) {
            // GET /iterations - List all iterations with pagination
            def page = queryParams.getFirst('page')
            def size = queryParams.getFirst('size')
            def search = queryParams.getFirst('search')
            def sort = queryParams.getFirst('sort')
            def direction = queryParams.getFirst('direction')
            def migrationId = queryParams.getFirst('migrationId')
            
            // Build filters map
            Map filters = [:]
            
            // Parse pagination parameters
            int pageNumber = 1
            int pageSize = 50
            
            if (page) {
                try {
                    pageNumber = Integer.parseInt(page as String)
                    if (pageNumber < 1) pageNumber = 1
                } catch (NumberFormatException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid page number format"]).toString())
                        .build()
                }
            }
            
            if (size) {
                try {
                    pageSize = Integer.parseInt(size as String)
                    if (pageSize < 1 || pageSize > 100) pageSize = 50
                } catch (NumberFormatException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid page size format"]).toString())
                        .build()
                }
            }
            
            // Validate search term
            if (search) {
                String searchTerm = (search as String).trim()
                if (searchTerm.length() > 100) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Search term too long (max 100 characters)"]).toString())
                        .build()
                }
                filters.search = searchTerm
            }
            
            // Validate sort parameters
            String sortField = null
            String sortDirection = 'asc'
            
            if (sort) {
                def allowedSortFields = ['ite_id', 'ite_name', 'itt_code', 'ite_static_cutover_date', 'ite_dynamic_cutover_date', 'ite_status', 'migration_name', 'created_at', 'updated_at']
                if (allowedSortFields.contains(sort as String)) {
                    sortField = sort as String
                } else {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid sort field. Allowed: ${allowedSortFields.join(', ')}"]).toString())
                        .build()
                }
            }
            
            if (direction && ['asc', 'desc'].contains((direction as String).toLowerCase())) {
                sortDirection = (direction as String).toLowerCase()
            }
            
            // Parse filter parameters
            if (migrationId) {
                try {
                    filters.migrationId = UUID.fromString(migrationId as String)
                } catch (IllegalArgumentException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid migration ID format"]).toString())
                        .build()
                }
            }
            
            // Get iterations with filters and pagination
            def result = migrationRepository.findIterationsWithFilters(filters, pageNumber, pageSize, sortField, sortDirection)
            return Response.ok(new JsonBuilder(result).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Unknown endpoint"]).toString()).build()
        }
    } catch (Exception e) {
        log.error("Unexpected error in GET /iterations", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Internal error", details: e.getMessage()]).toString())
            .build()
    }
}

/**
 * POST /iterations - Create new iteration
 */
iterationsList(httpMethod: "POST", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        Map iterationData = new JsonSlurper().parseText(body) as Map
        log.info("POST /iterations - Creating iteration with data: ${iterationData}")
        
        // Validate required fields
        if (!iterationData.ite_name && !iterationData.name) {
            log.warn("POST /iterations - Missing iteration name. Data: ${iterationData}")
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Iteration name is required"]).toString())
                .build()
        }
        
        if (!iterationData.mig_id && !iterationData.migrationId) {
            log.warn("POST /iterations - Missing migration ID. Data: ${iterationData}")
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Migration ID is required"]).toString())
                .build()
        }
        
        try {
            Map newIteration = migrationRepository.createIteration(iterationData) as Map
            log.info("POST /iterations - Successfully created iteration: ${newIteration?.ite_id}")
            
            if (newIteration) {
                return Response.status(Response.Status.CREATED)
                    .entity(new JsonBuilder(newIteration).toString())
                    .build()
            } else {
                log.error("POST /iterations - Repository returned null for iteration creation")
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: "Failed to create iteration - no data returned"]).toString())
                    .build()
            }
        } catch (IllegalArgumentException e) {
            log.error("POST /iterations - Validation error: ${e.message}", e)
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: e.message]).toString())
                .build()
        }
        
    } catch (JsonException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
            .build()
    } catch (SQLException e) {
        def status = mapSqlExceptionToHttpStatus(e)
        def message = mapSqlExceptionToMessage(e)
        return Response.status(status)
            .entity(new JsonBuilder([error: message]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in POST /iterations", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected internal error occurred"]).toString())
            .build()
    }
}

/**
 * PUT /iterations/{id} - Update iteration
 */
iterationsList(httpMethod: "PUT", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []
    
    if (pathParts.size() != 1) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid path for PUT request"]).toString())
            .build()
    }
    
    def iterationId
    try {
        iterationId = UUID.fromString(pathParts[0])
    } catch (IllegalArgumentException e) {
        log.warn("PUT /iterations - Invalid UUID format: ${pathParts[0]}")
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid iteration UUID"]).toString())
            .build()
    }
    
    try {
        Map iterationData = new JsonSlurper().parseText(body) as Map
        log.info("PUT /iterations/${iterationId} - Updating with data: ${iterationData}")
        
        def updatedIteration = migrationRepository.updateIteration(iterationId, iterationData)
        
        if (updatedIteration) {
            log.info("PUT /iterations/${iterationId} - Successfully updated iteration")
            return Response.ok(new JsonBuilder(updatedIteration).toString()).build()
        } else {
            log.warn("PUT /iterations/${iterationId} - Iteration not found")
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Iteration not found"]).toString())
                .build()
        }
        
    } catch (JsonException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid JSON format in request body"]).toString())
            .build()
    } catch (SQLException e) {
        def status = mapSqlExceptionToHttpStatus(e)
        def message = mapSqlExceptionToMessage(e)
        return Response.status(status)
            .entity(new JsonBuilder([error: message]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in PUT /iterations", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected internal error occurred"]).toString())
            .build()
    }
}

/**
 * DELETE /iterations/{id} - Delete iteration
 */
iterationsList(httpMethod: "DELETE", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []
    
    if (pathParts.size() != 1) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid path for DELETE request"]).toString())
            .build()
    }
    
    def iterationId
    try {
        iterationId = UUID.fromString(pathParts[0])
    } catch (IllegalArgumentException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid iteration UUID"]).toString())
            .build()
    }
    
    try {
        // Check if iteration exists
        def iteration = migrationRepository.findIterationById(iterationId)
        if (!iteration) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Iteration not found"]).toString())
                .build()
        }
        
        migrationRepository.deleteIteration(iterationId)
        return Response.noContent().build()
        
    } catch (SQLException e) {
        if (e.getSQLState() == '23503') {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([error: "Cannot delete iteration - it has associated plans or is referenced by other resources"]).toString())
                .build()
        }
        log.warn("Database error deleting iteration ${iterationId}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "A database error occurred"]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error deleting iteration ${iterationId}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected internal error occurred"]).toString())
            .build()
    }
}

/**
 * Helper method to map SQL exceptions to HTTP status codes
 */
private Response.Status mapSqlExceptionToHttpStatus(SQLException e) {
    def sqlState = e.getSQLState()
    switch (sqlState) {
        case '23503': // Foreign key violation
            return Response.Status.CONFLICT
        case '23505': // Unique constraint violation
            return Response.Status.CONFLICT
        case '23502': // Not null violation
            return Response.Status.BAD_REQUEST
        default:
            return Response.Status.INTERNAL_SERVER_ERROR
    }
}

/**
 * Helper method to map SQL exceptions to user-friendly messages
 */
private String mapSqlExceptionToMessage(SQLException e) {
    def sqlState = e.getSQLState()
    def message = e.getMessage()
    
    switch (sqlState) {
        case '23503':
            if (message.contains('mig_id')) {
                return "Invalid migration ID - migration does not exist"
            }
            return "Foreign key constraint violation - referenced resource does not exist"
            
        case '23505':
            if (message.contains('ite_name')) {
                return "An iteration with this name already exists"
            }
            return "Unique constraint violation - duplicate value not allowed"
            
        case '23502':
            return "Required field is missing"
            
        default:
            log.warn("Unmapped SQL exception: ${sqlState} - ${message}", e)
            return "A database error occurred"
    }
}