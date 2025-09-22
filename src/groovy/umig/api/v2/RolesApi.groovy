package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import groovy.transform.Field

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.sql.SQLException
import org.apache.log4j.LogManager
import org.apache.log4j.Logger

@BaseScript CustomEndpointDelegate delegate

@Field
final Logger log = LogManager.getLogger(getClass())

/**
 * GET /roles - Get all available user roles
 * Returns a list of all roles from the roles_rls table.
 */
roles(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        def roles = DatabaseUtil.withSql { sql ->
            sql.rows("""
                SELECT rls_id, rls_code, rls_description
                FROM roles_rls
                ORDER BY rls_id
            """)
        }

        log.info("GET /roles - Retrieved ${roles.size()} roles")
        return Response.ok(new JsonBuilder(roles).toString()).build()

    } catch (SQLException e) {
        log.error("GET /roles - Database error: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Database error while retrieving roles",
                details: e.message
            ]).toString())
            .build()
    } catch (Exception e) {
        log.error("GET /roles - Unexpected error: ${e.message}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([
                error: "Unexpected error while retrieving roles",
                details: e.message
            ]).toString())
            .build()
    }
}