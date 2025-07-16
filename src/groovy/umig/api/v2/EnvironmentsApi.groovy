package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.EnvironmentRepository
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import groovy.json.JsonException
import java.sql.SQLException
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

final EnvironmentRepository environmentRepository = new EnvironmentRepository()

/**
 * Handles GET requests for Environments.
 * - GET /environments -> returns all environments with counts
 * - GET /environments/{id} -> returns a single environment with full details
 * - GET /environments/{id}/iterations -> returns iterations grouped by role
 * - GET /environments/roles -> returns all available environment roles
 */
environments(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    try {
        // GET /environments/roles - special endpoint for environment roles
        if (pathParts.size() == 1 && pathParts[0] == 'roles') {
            def roles = environmentRepository.getAllEnvironmentRoles()
            return Response.ok(new JsonBuilder(roles).toString()).build()
        }

        // GET /environments/{id}/iterations
        if (pathParts.size() == 2 && pathParts[1] == 'iterations') {
            try {
                def envId = Integer.parseInt(pathParts[0])
                def iterationsByRole = environmentRepository.getIterationsByEnvironmentGroupedByRole(envId)
                return Response.ok(new JsonBuilder(iterationsByRole).toString()).build()
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid environment ID format"]).toString())
                    .build()
            }
        }

        // GET /environments/{id}
        if (pathParts.size() == 1) {
            try {
                def envId = Integer.parseInt(pathParts[0])
                def environment = environmentRepository.findEnvironmentById(envId)
                if (!environment) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Environment not found"]).toString())
                        .build()
                }
                return Response.ok(new JsonBuilder(environment).toString()).build()
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid environment ID format"]).toString())
                    .build()
            }
        }

        // GET /environments - list all
        // Extract pagination and search parameters
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
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid page number format"]).toString())
                    .build()
            }
        }
        
        if (size) {
            try {
                pageSize = Integer.parseInt(size as String)
                if (pageSize < 1) pageSize = 50
                if (pageSize > 200) pageSize = 200  // Maximum page size
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid page size format"]).toString())
                    .build()
            }
        }
        
        // Parse sort parameters
        String sortField = 'env_id'  // Default sort field
        String sortDirection = 'asc'
        
        if (sort && ['env_id', 'env_code', 'env_name', 'env_description', 'application_count', 'iteration_count'].contains(sort as String)) {
            sortField = sort as String
        }
        
        if (direction && ['asc', 'desc'].contains((direction as String).toLowerCase())) {
            sortDirection = (direction as String).toLowerCase()
        }
        
        // Validate search term
        String searchTerm = search as String
        if (searchTerm && searchTerm.trim().length() < 2) {
            searchTerm = null  // Ignore very short search terms (less than 2 characters)
        }
        
        // Get paginated environments
        def result = environmentRepository.findAllEnvironmentsWithCounts(pageNumber, pageSize, searchTerm, sortField, sortDirection)
        return Response.ok(new JsonBuilder(result).toString()).build()

    } catch (SQLException e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred: ${e.message}"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected error occurred: ${e.message}"]).toString())
            .build()
    }
}

/**
 * Handles POST requests for Environments.
 * - POST /environments -> creates a new environment
 * - POST /environments/{id}/applications/{appId} -> associates an application
 * - POST /environments/{id}/iterations/{iteId} -> associates an iteration with role
 */
environments(httpMethod: "POST", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    try {
        // POST /environments/{id}/applications/{appId}
        if (pathParts.size() == 3 && pathParts[1] == 'applications') {
            try {
                def envId = Integer.parseInt(pathParts[0])
                def appId = Integer.parseInt(pathParts[2])
                
                environmentRepository.associateApplication(envId, appId)
                return Response.ok(new JsonBuilder([message: "Application associated successfully"]).toString()).build()
                
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid ID format"]).toString())
                    .build()
            } catch (SQLException e) {
                if (e.getSQLState() == "23505") {
                    return Response.status(Response.Status.CONFLICT)
                        .entity(new JsonBuilder([error: "Association already exists"]).toString())
                        .build()
                }
                throw e
            }
        }

        // POST /environments/{id}/iterations/{iteId}
        if (pathParts.size() == 3 && pathParts[1] == 'iterations') {
            try {
                def envId = Integer.parseInt(pathParts[0])
                def iteId = UUID.fromString(pathParts[2] as String)
                
                def payload = new JsonSlurper().parseText(body) as Map
                def roleId = payload.enr_id
                
                if (!roleId) {
                    return Response.status(Response.Status.BAD_REQUEST)
                        .entity(new JsonBuilder([error: "enr_id is required"]).toString())
                        .build()
                }
                
                environmentRepository.associateIteration(envId, iteId.toString(), roleId as Integer)
                return Response.ok(new JsonBuilder([message: "Iteration associated successfully"]).toString()).build()
                
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid environment ID format"]).toString())
                    .build()
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid iteration ID format"]).toString())
                    .build()
            } catch (SQLException e) {
                if (e.getSQLState() == "23505") {
                    return Response.status(Response.Status.CONFLICT)
                        .entity(new JsonBuilder([error: "Association already exists"]).toString())
                        .build()
                }
                throw e
            }
        }

        // POST /environments - create new environment
        if (pathParts.isEmpty()) {
            def payload = new JsonSlurper().parseText(body) as Map
            
            // Validate required fields
            if (!payload.env_code || !payload.env_name) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "env_code and env_name are required"]).toString())
                    .build()
            }
            
            def newEnv = environmentRepository.createEnvironment([
                env_code: payload.env_code as String,
                env_name: payload.env_name as String,
                env_description: payload.env_description as String
            ])
            
            return Response.status(Response.Status.CREATED)
                .entity(new JsonBuilder(newEnv).toString())
                .build()
        }

        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid endpoint"]).toString())
            .build()

    } catch (JsonException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid JSON in request body"]).toString())
            .build()
    } catch (SQLException e) {
        if (e.getSQLState() == "23505") {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([error: "An environment with this code already exists"]).toString())
                .build()
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected error occurred"]).toString())
            .build()
    }
}

/**
 * Handles PUT requests for Environments.
 * - PUT /environments/{id} -> updates an environment
 */
environments(httpMethod: "PUT", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    if (pathParts.size() != 1) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Environment ID is required"]).toString())
            .build()
    }

    try {
        def envId = Integer.parseInt(pathParts[0])
        def payload = new JsonSlurper().parseText(body) as Map
        
        // Validate required fields
        if (!payload.env_code || !payload.env_name) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "env_code and env_name are required"]).toString())
                .build()
        }
        
        def updatedEnv = environmentRepository.updateEnvironment(envId, [
            env_code: payload.env_code as String,
            env_name: payload.env_name as String,
            env_description: payload.env_description as String
        ])
        
        if (!updatedEnv) {
            return Response.status(Response.Status.NOT_FOUND)
                .entity(new JsonBuilder([error: "Environment not found"]).toString())
                .build()
        }
        
        // Return the updated environment
        return Response.ok(new JsonBuilder(updatedEnv).toString()).build()

    } catch (NumberFormatException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid environment ID format"]).toString())
            .build()
    } catch (JsonException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid JSON in request body"]).toString())
            .build()
    } catch (SQLException e) {
        if (e.getSQLState() == "23505") {
            return Response.status(Response.Status.CONFLICT)
                .entity(new JsonBuilder([error: "An environment with this code already exists"]).toString())
                .build()
        }
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected error occurred"]).toString())
            .build()
    }
}

/**
 * Handles DELETE requests for Environments.
 * - DELETE /environments/{id} -> deletes an environment
 * - DELETE /environments/{id}/applications/{appId} -> removes application association
 * - DELETE /environments/{id}/iterations/{iteId} -> removes iteration association
 */
environments(httpMethod: "DELETE", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    if (pathParts.isEmpty()) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Environment ID is required"]).toString())
            .build()
    }

    try {
        def envId = Integer.parseInt(pathParts[0])

        // DELETE /environments/{id}/applications/{appId}
        if (pathParts.size() == 3 && pathParts[1] == 'applications') {
            try {
                def appId = Integer.parseInt(pathParts[2])
                def removed = environmentRepository.disassociateApplication(envId, appId)
                
                if (!removed) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Association not found"]).toString())
                        .build()
                }
                
                return Response.noContent().build()
                
            } catch (NumberFormatException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid application ID format"]).toString())
                    .build()
            }
        }

        // DELETE /environments/{id}/iterations/{iteId}
        if (pathParts.size() == 3 && pathParts[1] == 'iterations') {
            try {
                def iteId = UUID.fromString(pathParts[2] as String)
                def removed = environmentRepository.disassociateIteration(envId, iteId.toString())
                
                if (!removed) {
                    return Response.status(Response.Status.NOT_FOUND)
                        .entity(new JsonBuilder([error: "Association not found"]).toString())
                        .build()
                }
                
                return Response.noContent().build()
                
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST)
                    .entity(new JsonBuilder([error: "Invalid iteration ID format"]).toString())
                    .build()
            }
        }

        // DELETE /environments/{id}
        if (pathParts.size() == 1) {
            // Check for blocking relationships
            def blockingRelationships = environmentRepository.getEnvironmentBlockingRelationships(envId)
            if (blockingRelationships && !blockingRelationships.isEmpty()) {
                return Response.status(Response.Status.CONFLICT)
                    .entity(new JsonBuilder([
                        error: "Cannot delete environment with ID ${envId} due to existing relationships",
                        blocking_relationships: blockingRelationships
                    ]).toString())
                    .build()
            }
            
            def deleted = environmentRepository.deleteEnvironment(envId)
            if (!deleted) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "Environment not found"]).toString())
                    .build()
            }
            
            return Response.noContent().build()
        }

        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid endpoint"]).toString())
            .build()

    } catch (NumberFormatException e) {
        return Response.status(Response.Status.BAD_REQUEST)
            .entity(new JsonBuilder([error: "Invalid environment ID format"]).toString())
            .build()
    } catch (SQLException e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Database error occurred"]).toString())
            .build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "An unexpected error occurred"]).toString())
            .build()
    }
}