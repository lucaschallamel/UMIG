package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.StepRepository
import groovy.json.JsonBuilder
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

final StepRepository stepRepository = new StepRepository()

/**
 * Handles GET requests for Steps with hierarchical filtering for the runsheet.
 * - GET /steps -> returns all steps (not recommended for production)
 * - GET /steps?migrationId={uuid} -> returns steps in a migration
 * - GET /steps?iterationId={uuid} -> returns steps in an iteration
 * - GET /steps?planId={uuid} -> returns steps in a plan
 * - GET /steps?sequenceId={uuid} -> returns steps in a sequence
 * - GET /steps?phaseId={uuid} -> returns steps in a phase
 * - GET /steps?teamId={uuid} -> returns steps owned by a team
 * - GET /steps?labelId={uuid} -> returns steps with a label
 * 
 * Multiple filters can be combined for progressive refinement.
 * Results are ordered by sequence number, phase number, and step number.
 */
steps(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // GET /steps with query parameters for hierarchical filtering
    if (pathParts.empty) {
        try {
            def filters = [:]
            
            // Extract query parameters
            if (queryParams.getFirst("migrationId")) {
                filters.migrationId = queryParams.getFirst("migrationId")
            }
            
            if (queryParams.getFirst("iterationId")) {
                filters.iterationId = queryParams.getFirst("iterationId")
            }
            
            if (queryParams.getFirst("planId")) {
                filters.planId = queryParams.getFirst("planId")
            }
            
            if (queryParams.getFirst("sequenceId")) {
                filters.sequenceId = queryParams.getFirst("sequenceId")
            }
            
            if (queryParams.getFirst("phaseId")) {
                filters.phaseId = queryParams.getFirst("phaseId")
            }
            
            if (queryParams.getFirst("teamId")) {
                filters.teamId = queryParams.getFirst("teamId")
            }
            
            if (queryParams.getFirst("labelId")) {
                filters.labelId = queryParams.getFirst("labelId")
            }
            
            // Fetch filtered steps
            def steps = stepRepository.findFilteredStepInstances(filters)
            
            // Group steps by sequence and phase for frontend consumption
            def groupedSteps = [:]
            
            steps.each { stepItem ->
                def step = stepItem as Map
                def sequenceKey = "${step.sequenceNumber}-${step.sequenceId}"
                def phaseKey = "${step.phaseNumber}-${step.phaseId}"
                
                if (!groupedSteps[sequenceKey]) {
                    groupedSteps[sequenceKey] = [
                        id: step.sequenceId,
                        name: step.sequenceName,
                        number: step.sequenceNumber,
                        phases: [:]
                    ]
                }
                
                def sequenceMap = groupedSteps[sequenceKey] as Map
                def phasesMap = sequenceMap.phases as Map
                
                if (!phasesMap[phaseKey]) {
                    phasesMap[phaseKey] = [
                        id: step.phaseId,
                        name: step.phaseName,
                        number: step.phaseNumber,
                        steps: []
                    ]
                }
                
                def phaseMap = phasesMap[phaseKey] as Map
                def stepsList = phaseMap.steps as List
                
                // Add step to phase
                stepsList.add([
                    id: step.id,
                    code: "${step.sttCode}-${String.format('%03d', step.stmNumber)}",
                    name: step.name,
                    status: step.status,
                    durationMinutes: step.durationMinutes,
                    ownerTeamId: step.ownerTeamId,
                    ownerTeamName: step.ownerTeamName ?: 'Unassigned'
                ])
            }
            
            // Convert to arrays and sort
            def result = groupedSteps.values().collect { sequenceItem ->
                def sequence = sequenceItem as Map
                def phasesMap = sequence.phases as Map
                
                def phasesList = phasesMap.values().collect { phaseItem ->
                    def phase = phaseItem as Map
                    def stepsList = phase.steps as List
                    
                    return [
                        id: phase.id,
                        name: phase.name,
                        number: phase.number,
                        steps: stepsList.sort { stepItem -> (stepItem as Map).code }
                    ]
                }
                phasesList.sort { phaseItem -> (phaseItem as Map).number }
                
                return [
                    id: sequence.id,
                    name: sequence.name,
                    number: sequence.number,
                    phases: phasesList
                ]
            }
            result.sort { sequenceItem -> (sequenceItem as Map).number }
            
            return Response.ok(new JsonBuilder(result).toString()).build()
            
        } catch (IllegalArgumentException e) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid UUID format: ${e.message}"]).toString())
                .build()
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Invalid path
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Endpoint not found"]).toString())
        .build()
}