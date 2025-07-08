package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.MigrationRepository
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import groovy.transform.Field
import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID

@BaseScript CustomEndpointDelegate delegate

@Field
final MigrationRepository migrationRepository = new MigrationRepository()

// GET /migrations, /migrations/{id}, /migrations/{id}/iterations
migrations(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []

    log.warn("DEBUG: pathParts=${pathParts} queryParams=${queryParams}")
    try {
        // The order of these checks is critical. Go from most specific to least specific.
        if (pathParts.size() == 8 && pathParts[5] == 'sequences' && pathParts[7] == 'phases') {
            // GET /migrations/{migId}/iterations/{iteId}/plan-instances/{pliId}/sequences/{seqId}/phases
            def sequenceId = pathParts[6]
            try {
                def phases = migrationRepository.findPhasesBySequenceId(UUID.fromString(sequenceId))
                def result = phases.collect { [id: it['phi_id'], name: it['phi_name']] }
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid sequence UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 6 && pathParts[5] == "sequences") {
            // GET /migrations/{migId}/iterations/{iteId}/plan-instances/{pliId}/sequences
            def planInstanceId = pathParts[4]
            try {
                def sequences = migrationRepository.findSequencesByPlanInstanceId(UUID.fromString(planInstanceId))
                def result = sequences.collect { [id: it['sqi_id'], name: it['sqi_name']] }
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid plan instance UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 6 && pathParts[5] == "phases") {
            // GET /migrations/{migId}/iterations/{iteId}/plan-instances/{pliId}/phases
            def planInstanceId = pathParts[4]
            try {
                def phases = migrationRepository.findPhasesByPlanInstanceId(UUID.fromString(planInstanceId))
                def result = phases.collect { [id: it['phi_id'], name: it['phi_name']] }
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid plan instance UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 4 && pathParts[3] == "plan-instances") {
            // GET /migrations/{migId}/iterations/{iteId}/plan-instances
            def iterationId = pathParts[2]
            try {
                def planInstances = migrationRepository.findPlanInstancesByIterationId(UUID.fromString(iterationId))
                def result = planInstances.collect { [id: it['pli_id'], name: it['plm_name']] }
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid iteration UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 3 && pathParts[1] == "iterations") {
            // GET /migrations/{migId}/iterations/{iteId}
            def iterationId = pathParts[2]
            try {
                def iteration = migrationRepository.findIterationById(UUID.fromString(iterationId))
                if (!iteration) {
                    return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Iteration not found"]).toString()).build()
                }
                def result = [
                    id: iteration['ite_id'],
                    migrationId: iteration['mig_id'],
                    name: iteration['ite_name'],
                    description: iteration['ite_description'],
                    status: iteration['ite_status'],
                    staticCutoverDate: iteration['ite_static_cutover_date'],
                    dynamicCutoverDate: iteration['ite_dynamic_cutover_date']
                ]
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid iteration UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 2 && pathParts[1] == "iterations") {
            // /migrations/{id}/iterations
            def migrationId = pathParts[0]
            try {
                def iterationsRaw = migrationRepository.findIterationsByMigrationId(UUID.fromString(migrationId))
                def iterations = iterationsRaw.collect { iteration ->
                    [
                        id: iteration['ite_id'],
                        migrationId: iteration['mig_id'],
                        name: iteration['ite_name'],
                        description: iteration['ite_description'],
                        status: iteration['ite_status'],
                        staticCutoverDate: iteration['ite_static_cutover_date'],
                        dynamicCutoverDate: iteration['ite_dynamic_cutover_date']
                    ]
                }
                return Response.ok(new JsonBuilder(iterations).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid migration UUID"]).toString()).build()
            }
        } else if (pathParts.size() == 1) {
            // /migrations/{id}
            def migrationId = pathParts[0]
            try {
                def migration = migrationRepository.findMigrationById(UUID.fromString(migrationId))
                if (!migration) {
                    return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Migration not found"]).toString()).build()
                }
                def result = [
                    id: migration['mig_id'],
                    usr_id_owner: migration['usr_id_owner'],
                    name: migration['mig_name'],
                    description: migration['mig_description'],
                    status: migration['mig_status'],
                    type: migration['mig_type'],
                    startDate: migration['mig_start_date'],
                    endDate: migration['mig_end_date'],
                    businessCutoverDate: migration['mig_business_cutover_date'],
                    createdBy: migration['created_by'],
                    createdAt: migration['created_at'],
                    updatedBy: migration['updated_by'],
                    updatedAt: migration['updated_at']
                ]
                return Response.ok(new JsonBuilder(result).toString()).build()
            } catch (IllegalArgumentException iae) {
                return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Invalid migration UUID"]).toString()).build()
            }
        } else if (!pathParts) {
            // /migrations
            def migrations = migrationRepository.findAllMigrations()
            def result = migrations.collect { migration ->
                migration instanceof Map ? [
                    id: migration['mig_id'],
                    usr_id_owner: migration['usr_id_owner'],
                    name: migration['mig_name'],
                    description: migration['mig_description'],
                    status: migration['mig_status'],
                    type: migration['mig_type'],
                    startDate: migration['mig_start_date'],
                    endDate: migration['mig_end_date'],
                    businessCutoverDate: migration['mig_business_cutover_date'],
                    createdBy: migration['created_by'],
                    createdAt: migration['created_at'],
                    updatedBy: migration['updated_by'],
                    updatedAt: migration['updated_at']
                ] : migration
            }
            return Response.ok(new JsonBuilder(result).toString()).build()
        } else {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Unknown endpoint"]).toString()).build()
        }
    } catch (Exception e) {
        log.error("Unexpected error in GET /migrations", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Internal error", details: e.getMessage()]).toString())
            .build()
    }
}
