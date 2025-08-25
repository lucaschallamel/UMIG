package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import umig.repository.StatusRepository

import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

/**
 * REST API for status lookup data
 * Provides status information for different entity types (Migration, Iteration, Plan, etc.)
 */
status(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body ->
    
    def statusRepository = new StatusRepository()
    
    // Get entity type parameter (required)
    def entityType = queryParams.getFirst("entityType") as String
    
    if (!entityType) {
        return Response.status(400)
            .entity(new JsonBuilder([
                error: "Missing required parameter 'entityType'",
                message: "Valid entity types: Migration, Iteration, Plan, Sequence, Phase, Step, Control, Instruction"
            ]).toString())
            .build()
    }
    
    try {
        // Validate entity type (case-insensitive but normalize to proper case)
        def validEntityTypes = [
            "migration": "Migration",
            "iteration": "Iteration", 
            "plan": "Plan",
            "sequence": "Sequence",
            "phase": "Phase",
            "step": "Step",
            "control": "Control",
            "instruction": "Instruction"
        ]
        
        def normalizedEntityType = validEntityTypes[entityType.toLowerCase()]
        if (!normalizedEntityType) {
            return Response.status(400)
                .entity(new JsonBuilder([
                    error: "Invalid entity type: ${entityType}",
                    message: "Valid entity types: ${validEntityTypes.values().join(', ')}"
                ]).toString())
                .build()
        }
        
        // Get statuses for the specified entity type
        def statuses = statusRepository.findStatusesByType(normalizedEntityType)
        
        // Transform to format expected by frontend (id, name, color, type)
        // Explicit Map casting for static type checking compatibility (ADR-031)
        def result = statuses.collect { Map status ->
            [
                id: status.id,
                name: status.name,
                color: status.color,
                type: status.type
            ]
        }
        
        return Response.ok(new JsonBuilder(result).toString()).build()
        
    } catch (Exception e) {
        return Response.status(500)
            .entity(new JsonBuilder([
                error: "Internal server error",
                message: e.getMessage()
            ]).toString())
            .build()
    }
}