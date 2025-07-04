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
migrations(httpMethod: "GET") { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []

    log.warn("DEBUG: pathParts=${pathParts} queryParams=${queryParams}")
    try {
        if (!pathParts) {
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
