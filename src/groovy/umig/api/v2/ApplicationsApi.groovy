package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.ApplicationRepository
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript
import groovy.transform.Field

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException

@BaseScript CustomEndpointDelegate delegate

@Field
final ApplicationRepository applicationRepository = new ApplicationRepository()

private Integer getApplicationIdFromPath(HttpServletRequest request) {
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

// GET /applications, /applications/{id}, /applications/{id}/environments, /applications/{id}/teams, /applications/{id}/labels
applications(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []
    
    // Handle /applications/{id}/environments
    if (pathParts.size() == 2 && pathParts[1] == 'environments') {
        Integer appId = getApplicationIdFromPath(request)
        
        if (appId == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Application ID format."]).toString()).build()
        }
        
        try {
            def application = applicationRepository.findApplicationById(appId)
            if (!application) {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Application with ID ${appId} not found."]).toString()).build()
            }
            
            return Response.ok(new JsonBuilder(application.environments).toString()).build()
            
        } catch (SQLException e) {
            log.error("Database error in GET /applications/{id}/environments", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
        } catch (Exception e) {
            log.error("Unexpected error in GET /applications/{id}/environments", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
        }
    }
    
    // Handle /applications/{id}/teams
    if (pathParts.size() == 2 && pathParts[1] == 'teams') {
        Integer appId = getApplicationIdFromPath(request)
        
        if (appId == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Application ID format."]).toString()).build()
        }
        
        try {
            def application = applicationRepository.findApplicationById(appId)
            if (!application) {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Application with ID ${appId} not found."]).toString()).build()
            }
            
            return Response.ok(new JsonBuilder(application.teams).toString()).build()
            
        } catch (SQLException e) {
            log.error("Database error in GET /applications/{id}/teams", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
        } catch (Exception e) {
            log.error("Unexpected error in GET /applications/{id}/teams", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
        }
    }
    
    // Handle /applications/{id}/labels
    if (pathParts.size() == 2 && pathParts[1] == 'labels') {
        Integer appId = getApplicationIdFromPath(request)
        
        if (appId == null) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Application ID format."]).toString()).build()
        }
        
        try {
            def application = applicationRepository.findApplicationById(appId)
            if (!application) {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Application with ID ${appId} not found."]).toString()).build()
            }
            
            return Response.ok(new JsonBuilder(application.labels).toString()).build()
            
        } catch (SQLException e) {
            log.error("Database error in GET /applications/{id}/labels", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
        } catch (Exception e) {
            log.error("Unexpected error in GET /applications/{id}/labels", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
        }
    }
    
    // Handle /applications/{id}
    Integer appId = getApplicationIdFromPath(request)

    // Handle case where path is /applications/{invalid_id}
    if (getAdditionalPath(request) && appId == null && pathParts.size() == 1) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Application ID format."]).toString()).build()
    }

    try {
        if (appId != null && pathParts.size() == 1) {
            def application = applicationRepository.findApplicationById(appId)
            if (!application) {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Application with ID ${appId} not found."]).toString()).build()
            }
            return Response.ok(new JsonBuilder(application).toString()).build()
        } else if (!extraPath || pathParts.size() == 0) {
            // Handle /applications (list all)
            // Extract pagination parameters
            def page = queryParams.getFirst('page')
            def size = queryParams.getFirst('size')
            def search = queryParams.getFirst('search')
            def sort = queryParams.getFirst('sort')
            def direction = queryParams.getFirst('direction')
            
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
                def allowedSortFields = ['app_id', 'app_code', 'app_name', 'app_description', 'environment_count', 'team_count']
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
            
            // Get paginated applications
            def result = applicationRepository.findAllApplicationsWithCounts(pageNumber, pageSize, searchTerm, sortField, sortDirection)
            return Response.ok(new JsonBuilder(result).toString()).build()
        } else {
            // Unknown path
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Endpoint not found"]).toString()).build()
        }
    } catch (SQLException e) {
        log.error("Database error in GET /applications", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
    } catch (Exception e) {
        log.error("Unexpected error in GET /applications", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
    }
}

// POST /applications
applications(httpMethod: "POST", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        if (!body || body.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Request body is required"]).toString()).build()
        }

        def jsonSlurper = new JsonSlurper()
        def applicationData = jsonSlurper.parseText(body)

        // Basic validation
        if (!applicationData['app_code'] || applicationData['app_code'].toString().trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "app_code is required"]).toString()).build()
        }

        if (applicationData['app_code'].toString().length() > 50) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "app_code must be 50 characters or less"]).toString()).build()
        }

        if (applicationData['app_name'] && applicationData['app_name'].toString().length() > 64) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "app_name must be 64 characters or less"]).toString()).build()
        }

        // Create application
        def newApplication = applicationRepository.createApplication(applicationData as Map)
        return Response.status(Response.Status.CREATED).entity(new JsonBuilder(newApplication).toString()).build()

    } catch (SQLException e) {
        log.error("Database error in POST /applications", e)
        // Handle specific SQL errors
        if (e.getSQLState() == "23505") { // Unique constraint violation
            return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([error: "Application with this code already exists"]).toString()).build()
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
    } catch (Exception e) {
        log.error("Unexpected error in POST /applications", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
    }
}

// PUT /applications/{id}, /applications/{appId}/environments/{envId}, /applications/{appId}/teams/{teamId}, /applications/{appId}/labels/{labelId}
applications(httpMethod: "PUT", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []
    
    // Handle /applications/{appId}/environments/{envId}
    if (pathParts.size() == 3 && pathParts[1] == 'environments') {
        Integer appId = null
        Integer envId = null
        
        try {
            appId = pathParts[0].toInteger()
            envId = pathParts[2].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid ID format."]).toString()).build()
        }
        
        try {
            def success = applicationRepository.associateEnvironment(appId, envId)
            if (success) {
                return Response.ok(new JsonBuilder([message: "Environment associated successfully"]).toString()).build()
            } else {
                return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([error: "Association already exists"]).toString()).build()
            }
            
        } catch (SQLException e) {
            log.error("Database error in PUT /applications/{appId}/environments/{envId}", e)
            if (e.getSQLState() == "23503") { // Foreign key constraint violation
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Application or Environment not found"]).toString()).build()
            }
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
        } catch (Exception e) {
            log.error("Unexpected error in PUT /applications/{appId}/environments/{envId}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
        }
    }
    
    // Handle /applications/{appId}/teams/{teamId}
    if (pathParts.size() == 3 && pathParts[1] == 'teams') {
        Integer appId = null
        Integer teamId = null
        
        try {
            appId = pathParts[0].toInteger()
            teamId = pathParts[2].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid ID format."]).toString()).build()
        }
        
        try {
            def success = applicationRepository.associateTeam(appId, teamId)
            if (success) {
                return Response.ok(new JsonBuilder([message: "Team associated successfully"]).toString()).build()
            } else {
                return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([error: "Association already exists"]).toString()).build()
            }
            
        } catch (SQLException e) {
            log.error("Database error in PUT /applications/{appId}/teams/{teamId}", e)
            if (e.getSQLState() == "23503") { // Foreign key constraint violation
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Application or Team not found"]).toString()).build()
            }
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
        } catch (Exception e) {
            log.error("Unexpected error in PUT /applications/{appId}/teams/{teamId}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
        }
    }
    
    // Handle /applications/{appId}/labels/{labelId}
    if (pathParts.size() == 3 && pathParts[1] == 'labels') {
        Integer appId = null
        Integer labelId = null
        
        try {
            appId = pathParts[0].toInteger()
            labelId = pathParts[2].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid ID format."]).toString()).build()
        }
        
        try {
            def success = applicationRepository.associateLabel(appId, labelId)
            if (success) {
                return Response.ok(new JsonBuilder([message: "Label associated successfully"]).toString()).build()
            } else {
                return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([error: "Association already exists"]).toString()).build()
            }
            
        } catch (SQLException e) {
            log.error("Database error in PUT /applications/{appId}/labels/{labelId}", e)
            if (e.getSQLState() == "23503") { // Foreign key constraint violation
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Application or Label not found"]).toString()).build()
            }
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
        } catch (Exception e) {
            log.error("Unexpected error in PUT /applications/{appId}/labels/{labelId}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
        }
    }
    
    // Handle /applications/{id}
    Integer appId = getApplicationIdFromPath(request)

    if (appId == null || pathParts.size() != 1) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Application ID format."]).toString()).build()
    }

    try {
        if (!body || body.trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Request body is required"]).toString()).build()
        }

        def jsonSlurper = new JsonSlurper()
        def applicationData = jsonSlurper.parseText(body)

        // Basic validation
        if (!applicationData['app_code'] || applicationData['app_code'].toString().trim().isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "app_code is required"]).toString()).build()
        }

        if (applicationData['app_code'].toString().length() > 50) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "app_code must be 50 characters or less"]).toString()).build()
        }

        if (applicationData['app_name'] && applicationData['app_name'].toString().length() > 64) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "app_name must be 64 characters or less"]).toString()).build()
        }

        // Update application
        def updatedApplication = applicationRepository.updateApplication(appId as Integer, applicationData as Map)
        if (!updatedApplication) {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Application with ID ${appId} not found."]).toString()).build()
        }

        return Response.ok(new JsonBuilder(updatedApplication).toString()).build()

    } catch (SQLException e) {
        log.error("Database error in PUT /applications/{id}", e)
        if (e.getSQLState() == "23505") { // Unique constraint violation
            return Response.status(Response.Status.CONFLICT).entity(new JsonBuilder([error: "Application with this code already exists"]).toString()).build()
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
    } catch (Exception e) {
        log.error("Unexpected error in PUT /applications/{id}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
    }
}

// DELETE /applications/{id}, /applications/{appId}/environments/{envId}, /applications/{appId}/teams/{teamId}
applications(httpMethod: "DELETE", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []
    
    // Handle /applications/{appId}/environments/{envId}
    if (pathParts.size() == 3 && pathParts[1] == 'environments') {
        Integer appId = null
        Integer envId = null
        
        try {
            appId = pathParts[0].toInteger()
            envId = pathParts[2].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid ID format."]).toString()).build()
        }
        
        try {
            def success = applicationRepository.disassociateEnvironment(appId, envId)
            if (success) {
                return Response.ok(new JsonBuilder([message: "Environment disassociated successfully"]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Association not found"]).toString()).build()
            }
            
        } catch (SQLException e) {
            log.error("Database error in DELETE /applications/{appId}/environments/{envId}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
        } catch (Exception e) {
            log.error("Unexpected error in DELETE /applications/{appId}/environments/{envId}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
        }
    }
    
    // Handle /applications/{appId}/teams/{teamId}
    if (pathParts.size() == 3 && pathParts[1] == 'teams') {
        Integer appId = null
        Integer teamId = null
        
        try {
            appId = pathParts[0].toInteger()
            teamId = pathParts[2].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid ID format."]).toString()).build()
        }
        
        try {
            def success = applicationRepository.disassociateTeam(appId, teamId)
            if (success) {
                return Response.ok(new JsonBuilder([message: "Team disassociated successfully"]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Association not found"]).toString()).build()
            }
            
        } catch (SQLException e) {
            log.error("Database error in DELETE /applications/{appId}/teams/{teamId}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
        } catch (Exception e) {
            log.error("Unexpected error in DELETE /applications/{appId}/teams/{teamId}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
        }
    }
    
    // Handle /applications/{appId}/labels/{labelId}
    if (pathParts.size() == 3 && pathParts[1] == 'labels') {
        Integer appId = null
        Integer labelId = null
        
        try {
            appId = pathParts[0].toInteger()
            labelId = pathParts[2].toInteger()
        } catch (NumberFormatException e) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid ID format."]).toString()).build()
        }
        
        try {
            def success = applicationRepository.disassociateLabel(appId, labelId)
            if (success) {
                return Response.ok(new JsonBuilder([message: "Label disassociated successfully"]).toString()).build()
            } else {
                return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Association not found"]).toString()).build()
            }
            
        } catch (SQLException e) {
            log.error("Database error in DELETE /applications/{appId}/labels/{labelId}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
        } catch (Exception e) {
            log.error("Unexpected error in DELETE /applications/{appId}/labels/{labelId}", e)
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
        }
    }
    
    // Handle /applications/{id}
    Integer appId = getApplicationIdFromPath(request)

    if (appId == null || pathParts.size() != 1) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid Application ID format."]).toString()).build()
    }

    try {
        // Check if application exists
        def application = applicationRepository.findApplicationById(appId)
        if (!application) {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Application with ID ${appId} not found."]).toString()).build()
        }

        // Check for blocking relationships
        def blockingRelationships = applicationRepository.getApplicationBlockingRelationships(appId)
        if (blockingRelationships && !blockingRelationships.isEmpty()) {
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([
                error: "Cannot delete application. It has existing relationships.",
                relationships: blockingRelationships
            ]).toString()).build()
        }

        // Delete application
        def deleted = applicationRepository.deleteApplication(appId)
        if (deleted) {
            return Response.ok(new JsonBuilder([message: "Application deleted successfully"]).toString()).build()
        } else {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Failed to delete application"]).toString()).build()
        }

    } catch (SQLException e) {
        log.error("Database error in DELETE /applications/{id}", e)
        if (e.getSQLState() == "23503") { // Foreign key constraint violation
            return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Cannot delete application. It is referenced by other records."]).toString()).build()
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString()).build()
    } catch (Exception e) {
        log.error("Unexpected error in DELETE /applications/{id}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An unexpected internal error occurred: ${e.message}"]).toString()).build()
    }
}

/**
 * Simple Iterations API for listing iterations.
 * Provides a GET endpoint to retrieve all iterations.
 */
iterations(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def iterations = DatabaseUtil.withSql { sql ->
            sql.rows("""
                SELECT ite_id, ite_name, itt_code, ite_status
                FROM iterations_ite
                ORDER BY ite_name
            """)
        }
        
        return Response.ok(new JsonBuilder(iterations).toString()).build()
        
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Failed to fetch iterations: ${e.message}"]).toString())
            .build()
    }
}