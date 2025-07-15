package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

/**
 * Simple Applications API for listing applications.
 * Provides a GET endpoint to retrieve all applications.
 */
applications(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def applications = DatabaseUtil.withSql { sql ->
            sql.rows("""
                SELECT app_id, app_code, app_name, app_description
                FROM applications_app
                ORDER BY app_code
            """)
        }
        
        return Response.ok(new JsonBuilder(applications).toString()).build()
        
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Failed to fetch applications: ${e.message}"]).toString())
            .build()
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