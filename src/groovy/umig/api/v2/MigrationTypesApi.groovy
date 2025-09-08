package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.MigrationTypesRepository
import umig.service.UserService
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import groovy.transform.Field

import javax.servlet.http.HttpServletRequest
import groovy.json.JsonException
import java.sql.SQLException
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import org.apache.log4j.LogManager
import org.apache.log4j.Logger

@BaseScript CustomEndpointDelegate delegate

@Field
final Logger log = LogManager.getLogger(getClass())

@Field  
final UserService userService = new UserService()

// Lazy initialize repository to avoid class loading issues
MigrationTypesRepository getMigrationTypesRepository() {
    return new MigrationTypesRepository()
}

/**
 * Handles GET requests for Migration Types.
 * - GET /migrationTypes -> returns all active migration types
 * - GET /migrationTypes?includeInactive=true -> returns all migration types
 * - GET /migrationTypes/selection -> returns active migration types for dropdowns
 * - GET /migrationTypes/stats -> returns usage statistics
 * - GET /migrationTypes/{id} -> returns a single migration type by ID
 * - GET /migrationTypes/code/{code} -> returns a single migration type by code
 */
migrationTypes(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def extraPath = getAdditionalPath(request)
        def pathParts = extraPath?.split('/')?.findAll { it } ?: []
        
        MigrationTypesRepository repository = getMigrationTypesRepository()
        
        // Handle special endpoints first
        if (pathParts.size() == 1 && pathParts[0] == 'selection') {
            log.info("GET /migrationTypes/selection - Fetching active migration types for selection")
            List migrationTypes = repository.getActiveMigrationTypesForSelection() as List
            return Response.ok(new JsonBuilder(migrationTypes).toString()).build()
        }
        
        if (pathParts.size() == 1 && pathParts[0] == 'stats') {
            log.info("GET /migrationTypes/stats - Fetching migration type usage statistics")
            List stats = repository.getMigrationTypeUsageStats() as List
            return Response.ok(new JsonBuilder(stats).toString()).build()
        }
        
        // Handle single migration type by ID: GET /migrationTypes/{id}
        if (pathParts.size() == 1 && pathParts[0].isNumber()) {
            def mtmId
            try {
                mtmId = Integer.parseInt(pathParts[0])
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid migration type ID format"]).toString())
                    .build()
            }
            
            log.info("GET /migrationTypes/${mtmId} - Fetching single migration type")
            Map migrationType = repository.findMigrationTypeById(mtmId) as Map
            
            if (!migrationType) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Migration type not found"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(migrationType).toString()).build()
        }
        
        // Handle single migration type by code: GET /migrationTypes/code/{code}
        if (pathParts.size() == 2 && pathParts[0] == 'code') {
            String mtmCode = pathParts[1] as String
            log.info("GET /migrationTypes/code/${mtmCode} - Fetching migration type by code")
            Map migrationType = repository.findMigrationTypeByCode(mtmCode) as Map
            
            if (!migrationType) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Migration type not found"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(migrationType).toString()).build()
        }
        
        // Default: GET /migrationTypes with optional includeInactive parameter
        if (pathParts.empty) {
            String includeInactive = queryParams.getFirst('includeInactive') as String
            boolean includeInactiveFlag = includeInactive ? Boolean.parseBoolean(includeInactive) : false
            
            log.info("GET /migrationTypes - Fetching migration types (includeInactive: ${includeInactiveFlag})")
            List migrationTypes = repository.findAllMigrationTypes(includeInactiveFlag) as List
            
            log.info("GET /migrationTypes - Found ${migrationTypes.size()} migration types")
            return Response.ok(new JsonBuilder(migrationTypes).toString()).build()
        }
        
        // Invalid path
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
            .build()
            
    } catch (SQLException e) {
        log.error("Database error in GET /migrationTypes", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred", details: e.getMessage()]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in GET /migrationTypes", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected internal error occurred", details: e.getMessage()]).toString())
            .build()
    }
}

/**
 * Handles POST requests for Migration Types.
 * - POST /migrationTypes -> creates a new migration type
 * - POST /migrationTypes/reorder -> reorders migration types
 */
migrationTypes(httpMethod: "POST", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def extraPath = getAdditionalPath(request)
        def pathParts = extraPath?.split('/')?.findAll { it } ?: []
        
        MigrationTypesRepository repository = getMigrationTypesRepository()
        
        // Handle reordering: POST /migrationTypes/reorder
        if (pathParts.size() == 1 && pathParts[0] == 'reorder') {
            log.info("POST /migrationTypes/reorder - Reordering migration types")
            
            Map json = new JsonSlurper().parseText(body) as Map
            
            // Validate request format
            if (!json.orderMap) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Missing orderMap in request body"]).toString())
                    .build()
            }
            
            // Convert to proper types and validate
            Map<Integer, Integer> orderMap = [:]
            (json.orderMap as Map).each { key, value ->
                try {
                    orderMap[Integer.parseInt(key.toString())] = Integer.parseInt(value.toString())
                } catch (NumberFormatException e) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "Invalid ID or order value in orderMap"]).toString())
                        .build()
                }
            }
            
            Integer updateCount = repository.reorderMigrationTypes(orderMap) as Integer
            
            log.info("POST /migrationTypes/reorder - Updated ${updateCount} migration types")
            return Response.ok(new JsonBuilder([
                message: "Migration types reordered successfully",
                updatedCount: updateCount
            ]).toString()).build()
        }
        
        // Default: POST /migrationTypes (create new migration type)
        if (pathParts.empty) {
            log.info("POST /migrationTypes - Creating new migration type")
            
            Map json = new JsonSlurper().parseText(body) as Map
            
            // Validate required fields
            if (!json.mtm_code || !json.mtm_name) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "mtm_code and mtm_name are required"]).toString())
                    .build()
            }
            
            // Check if code already exists
            if (repository.migrationTypeExists(json.mtm_code as String) as Boolean) {
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([error: "Migration type code already exists"]).toString())
                    .build()
            }
            
            // Set audit fields
            Map userContext = userService.getCurrentUserContext() as Map
            json.created_by = userContext.userCode ?: getCurrentUser(request)
            json.updated_by = json.created_by
            
            Map createdMigrationType = repository.createMigrationType(json) as Map
            
            log.info("POST /migrationTypes - Created migration type with ID: ${createdMigrationType.mtm_id}")
            return Response.status(Response.Status.CREATED)
                .entity(new JsonBuilder(createdMigrationType).toString())
                .build()
        }
        
        // Invalid path
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
            .build()
            
    } catch (JsonException e) {
        log.error("Invalid JSON in POST /migrationTypes", e)
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid JSON format", details: e.getMessage()]).toString())
            .build()
    } catch (IllegalArgumentException e) {
        log.error("Validation error in POST /migrationTypes", e)
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: e.getMessage()]).toString())
            .build()
    } catch (SQLException e) {
        log.error("Database error in POST /migrationTypes", e)
        
        // Handle specific database errors
        if (e.getSQLState() == '23505') { // Unique constraint violation
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([error: "Migration type code already exists"]).toString())
                .build()
        }
        
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred", details: e.getMessage()]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in POST /migrationTypes", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected internal error occurred", details: e.getMessage()]).toString())
            .build()
    }
}

/**
 * Handles PUT requests for Migration Types.
 * - PUT /migrationTypes/{id} -> updates a migration type by ID
 * - PUT /migrationTypes/code/{code} -> updates a migration type by code
 */
migrationTypes(httpMethod: "PUT", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def extraPath = getAdditionalPath(request)
        def pathParts = extraPath?.split('/')?.findAll { it } ?: []
        
        MigrationTypesRepository repository = getMigrationTypesRepository()
        Map json = new JsonSlurper().parseText(body) as Map
        
        // Set audit fields
        Map userContext = userService.getCurrentUserContext() as Map
        json.updated_by = userContext.userCode ?: getCurrentUser(request)
        
        // Handle update by ID: PUT /migrationTypes/{id}
        if (pathParts.size() == 1 && pathParts[0].isNumber()) {
            Integer mtmId
            try {
                mtmId = Integer.parseInt(pathParts[0])
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid migration type ID format"]).toString())
                    .build()
            }
            
            log.info("PUT /migrationTypes/${mtmId} - Updating migration type")
            
            // Check if migration type exists
            if (!(repository.migrationTypeIdExists(mtmId) as Boolean)) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Migration type not found"]).toString())
                    .build()
            }
            
            Map updatedMigrationType = repository.updateMigrationType(mtmId, json) as Map
            
            if (!updatedMigrationType) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Migration type not found"]).toString())
                    .build()
            }
            
            log.info("PUT /migrationTypes/${mtmId} - Successfully updated migration type")
            return Response.ok(new JsonBuilder(updatedMigrationType).toString()).build()
        }
        
        // Handle update by code: PUT /migrationTypes/code/{code}
        if (pathParts.size() == 2 && pathParts[0] == 'code') {
            String mtmCode = pathParts[1] as String
            log.info("PUT /migrationTypes/code/${mtmCode} - Updating migration type by code")
            
            // Check if migration type exists
            if (!(repository.migrationTypeExists(mtmCode) as Boolean)) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Migration type not found"]).toString())
                    .build()
            }
            
            Map updatedMigrationType = repository.updateMigrationTypeByCode(mtmCode, json) as Map
            
            if (!updatedMigrationType) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Migration type not found"]).toString())
                    .build()
            }
            
            log.info("PUT /migrationTypes/code/${mtmCode} - Successfully updated migration type")
            return Response.ok(new JsonBuilder(updatedMigrationType).toString()).build()
        }
        
        // Invalid path
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
            .build()
            
    } catch (JsonException e) {
        log.error("Invalid JSON in PUT /migrationTypes", e)
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid JSON format", details: e.getMessage()]).toString())
            .build()
    } catch (SQLException e) {
        log.error("Database error in PUT /migrationTypes", e)
        
        // Handle specific database errors
        if (e.getSQLState() == '23505') { // Unique constraint violation
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([error: "Migration type code already exists"]).toString())
                .build()
        }
        
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred", details: e.getMessage()]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in PUT /migrationTypes", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected internal error occurred", details: e.getMessage()]).toString())
            .build()
    }
}

/**
 * Handles DELETE requests for Migration Types.
 * - DELETE /migrationTypes/{id} -> deletes a migration type by ID
 * - DELETE /migrationTypes/code/{code} -> deletes a migration type by code
 */
migrationTypes(httpMethod: "DELETE", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def extraPath = getAdditionalPath(request)
        def pathParts = extraPath?.split('/')?.findAll { it } ?: []
        
        MigrationTypesRepository repository = getMigrationTypesRepository()
        
        // Handle delete by ID: DELETE /migrationTypes/{id}
        if (pathParts.size() == 1 && pathParts[0].isNumber()) {
            Integer mtmId
            try {
                mtmId = Integer.parseInt(pathParts[0])
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid migration type ID format"]).toString())
                    .build()
            }
            
            log.info("DELETE /migrationTypes/${mtmId} - Checking for blocking relationships")
            
            // Check for blocking relationships
            Map blocking = repository.getMigrationTypeBlockingRelationships(mtmId) as Map
            if (blocking) {
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([
                        error: "Cannot delete migration type due to existing relationships",
                        blockingRelationships: blocking
                    ]).toString())
                    .build()
            }
            
            log.info("DELETE /migrationTypes/${mtmId} - Deleting migration type")
            Boolean deleted = repository.deleteMigrationType(mtmId) as Boolean
            
            if (!deleted) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Migration type not found"]).toString())
                    .build()
            }
            
            log.info("DELETE /migrationTypes/${mtmId} - Successfully deleted migration type")
            return Response.ok(new JsonBuilder([message: "Migration type deleted successfully"]).toString()).build()
        }
        
        // Handle delete by code: DELETE /migrationTypes/code/{code}
        if (pathParts.size() == 2 && pathParts[0] == 'code') {
            String mtmCode = pathParts[1] as String
            log.info("DELETE /migrationTypes/code/${mtmCode} - Deleting migration type by code")
            
            // First get the ID to check for blocking relationships
            Map migrationType = repository.findMigrationTypeByCode(mtmCode) as Map
            if (!migrationType) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Migration type not found"]).toString())
                    .build()
            }
            
            // Check for blocking relationships
            Map blocking = repository.getMigrationTypeBlockingRelationships(migrationType.mtm_id as Integer) as Map
            if (blocking) {
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([
                        error: "Cannot delete migration type due to existing relationships",
                        blockingRelationships: blocking
                    ]).toString())
                    .build()
            }
            
            Boolean deleted = repository.deleteMigrationTypeByCode(mtmCode) as Boolean
            
            if (!deleted) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Migration type not found"]).toString())
                    .build()
            }
            
            log.info("DELETE /migrationTypes/code/${mtmCode} - Successfully deleted migration type")
            return Response.ok(new JsonBuilder([message: "Migration type deleted successfully"]).toString()).build()
        }
        
        // Invalid path
        return Response.status(Response.Status.NOT_FOUND)
            .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
            .build()
            
    } catch (SQLException e) {
        log.error("Database error in DELETE /migrationTypes", e)
        
        // Handle specific database errors
        if (e.getSQLState() == '23503') { // Foreign key violation
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([error: "Cannot delete migration type due to existing references"]).toString())
                .build()
        }
        
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred", details: e.getMessage()]).toString())
            .build()
    } catch (Exception e) {
        log.error("Unexpected error in DELETE /migrationTypes", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected internal error occurred", details: e.getMessage()]).toString())
            .build()
    }
}

/**
 * Utility method to get current user from request context.
 * Uses multiple fallback strategies for user identification.
 */
String getCurrentUser(HttpServletRequest request) {
    // Try to get user from Confluence context
    try {
        def userManager = com.atlassian.sal.api.component.ComponentLocator.getComponent(com.atlassian.sal.api.user.UserManager)
        def remoteUser = userManager?.getRemoteUser(request)
        if (remoteUser?.userKey) {
            return remoteUser.userKey.stringValue as String
        }
    } catch (Exception e) {
        log.debug("Could not get user from Confluence context: ${e.getMessage()}")
    }
    
    // Fallback to request headers
    String userKey = request.getHeader('X-UMIG-User-Key') as String
    if (userKey) return userKey
    
    // Final fallback
    return 'system'
}