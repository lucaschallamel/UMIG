package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.MigrationRepository
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import groovy.transform.Field
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

@Field
final MigrationRepository migrationRepository = new MigrationRepository()

// GET /migrations
migrations(httpMethod: "GET") { queryParams, body, request ->
    try {
        def migrationsRaw = migrationRepository.findAllMigrations()
        def migrations = migrationsRaw.collect { migration ->
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
        return Response.ok(new JsonBuilder(migrations).toString()).build()
    } catch (Exception e) {
        log.error("Failed to list migrations", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
            .entity(new JsonBuilder([error: "Failed to list migrations"]).toString())
            .build()
    }
}
