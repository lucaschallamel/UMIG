package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import groovy.transform.Field
import groovy.transform.CompileStatic
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
 * GET /iterationTypes - List all iteration types
 * Simple endpoint to serve iteration types for Admin GUI dropdowns
 */
iterationTypes(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        log.info("GET /iterationTypes - Fetching iteration types")
        
        List<Map<String, Object>> iterationTypes = []
        
        DatabaseUtil.withSql { sql ->
            iterationTypes = sql.rows("""
                SELECT itt_code, itt_name 
                FROM iteration_types_itt 
                ORDER BY itt_code
            """).collect { row ->
                [
                    itt_code: row.itt_code,
                    itt_name: row.itt_name
                ] as Map<String, Object>
            } as List<Map<String, Object>>
        }
        
        log.info("GET /iterationTypes - Found ${iterationTypes.size()} iteration types")
        return Response.ok(new JsonBuilder(iterationTypes).toString()).build()
        
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