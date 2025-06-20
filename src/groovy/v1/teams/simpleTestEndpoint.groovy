package v1.teams

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.transform.BaseScript
import javax.ws.rs.core.Response
import javax.ws.rs.core.MultivaluedMap

// This @BaseScript annotation is the key. It makes the endpoint DSL available.
@BaseScript CustomEndpointDelegate delegate

// This now matches the exact, working pattern from your teams.groovy file.
simpleTestEndpoint(
    httpMethod: "GET"
) { MultivaluedMap queryParams, String body ->
    Response.ok("This is a working GET endpoint from simpleTestEndpoint.groovy.").build()
}