package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.StepRepository
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

final StepRepository stepRepository = new StepRepository()

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
 * Steps API - repositories instantiated within methods to avoid class loading issues
 */

// Import repositories at compile time but instantiate lazily

/**
 * Handles GET requests for steps.
 * - GET /steps/master -> returns all master steps
 * - GET /steps/master/{stm_id} -> returns specific master step
 * - GET /steps/instance -> returns all step instances
 * - GET /steps/instance/{sti_id} -> returns specific step instance
 */
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
        return handleError(e)
    }
}
