package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.LabelRepository
import groovy.json.JsonBuilder
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

final LabelRepository labelRepository = new LabelRepository()

/**
 * Handles GET requests for Labels.
 * - GET /labels -> returns all labels
 * - GET /labels?migrationId={uuid} -> returns labels involved in migration
 * - GET /labels?iterationId={uuid} -> returns labels involved in iteration
 * - GET /labels?planId={uuid} -> returns labels involved in plan
 * - GET /labels?sequenceId={uuid} -> returns labels involved in sequence
 * - GET /labels?phaseId={uuid} -> returns labels involved in phase
 */
labels(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []

    // GET /labels with query parameters for hierarchical filtering
    if (pathParts.empty) {
        def labels
        
        // Check for hierarchical filtering query parameters
        if (queryParams.getFirst('migrationId')) {
            try {
                def migrationId = UUID.fromString(queryParams.getFirst('migrationId'))
                labels = labelRepository.findLabelsByMigrationId(migrationId)
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid migration ID format"]).toString()).build()
            }
        } else if (queryParams.getFirst('iterationId')) {
            try {
                def iterationId = UUID.fromString(queryParams.getFirst('iterationId'))
                labels = labelRepository.findLabelsByIterationId(iterationId)
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid iteration ID format"]).toString()).build()
            }
        } else if (queryParams.getFirst('planId')) {
            try {
                def planId = UUID.fromString(queryParams.getFirst('planId'))
                labels = labelRepository.findLabelsByPlanId(planId)
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid plan ID format"]).toString()).build()
            }
        } else if (queryParams.getFirst('sequenceId')) {
            try {
                def sequenceId = UUID.fromString(queryParams.getFirst('sequenceId'))
                labels = labelRepository.findLabelsBySequenceId(sequenceId)
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid sequence ID format"]).toString()).build()
            }
        } else if (queryParams.getFirst('phaseId')) {
            try {
                def phaseId = UUID.fromString(queryParams.getFirst('phaseId'))
                labels = labelRepository.findLabelsByPhaseId(phaseId)
            } catch (IllegalArgumentException e) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid phase ID format"]).toString()).build()
            }
        } else {
            // Default: return all labels
            labels = labelRepository.findAllLabels()
        }
        
        return Response.ok(new JsonBuilder(labels).toString()).build()
    }

    // Fallback for invalid paths
    return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid path."]).toString()).build()
}