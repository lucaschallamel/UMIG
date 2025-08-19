package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.StepRepository
import umig.utils.DatabaseUtil
import groovy.json.JsonBuilder
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID

@BaseScript CustomEndpointDelegate delegate

final StepRepository stepRepository = new StepRepository()

/**
 * Step View API - Returns step instance data for standalone step view
 * 
 * Endpoints:
 * - GET /stepViewApi/instance?stepCode=XXX-nnn - Returns active step instance data
 */
stepViewApi(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath?.split('/')?.findAll { it } ?: []
    
    // GET /stepViewApi/instance?migrationName=xxx&iterationName=xxx&stepCode=XXX-nnn
    if (pathParts.size() == 1 && pathParts[0] == 'instance') {
        final String migrationName = queryParams.getFirst("migrationName")
        final String iterationName = queryParams.getFirst("iterationName")
        final String stepCode = queryParams.getFirst("stepCode")
        
        // Validate required parameters
        if (!migrationName || !iterationName || !stepCode) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Missing required parameters. Expected: migrationName, iterationName, stepCode"]).toString())
                .build()
        }
        
        if (!stepCode.contains('-')) {
            return Response.status(Response.Status.BAD_REQUEST)
                .entity(new JsonBuilder([error: "Invalid 'stepCode' parameter. Expected format: XXX-nnn"]).toString())
                .build()
        }
        
        try {
            def (sttCode, stmNumberStr) = stepCode.toUpperCase().tokenize('-')
            def stmNumber = stmNumberStr as Integer
            
            // Find the active step instance for this step code
            def stepInstance = DatabaseUtil.withSql { sql ->
                sql.firstRow('''
                    SELECT 
                        sti.sti_id,
                        sti.sti_name,
                        sti.sti_status,
                        sti.sti_duration_minutes,
                        stm.stm_id,
                        stm.stt_code,
                        stm.stm_number,
                        stm.stm_name as master_name,
                        stm.stm_description,
                        stm.stm_duration_minutes as master_duration,
                        stm.tms_id_owner,
                        tms.tms_name as owner_team_name,
                        mig.mig_name as migration_name,
                        ite.ite_name as iteration_name,
                        plm.plm_name as plan_name,
                        sqm.sqm_name as sequence_name,
                        phm.phm_name as phase_name,
                        -- Predecessor info
                        pred_stm.stt_code as predecessor_stt_code,
                        pred_stm.stm_number as predecessor_stm_number,
                        pred_stm.stm_name as predecessor_name,
                        -- Environment info
                        enr.enr_name as environment_role_name,
                        env.env_name as environment_name
                    FROM steps_master_stm stm
                    JOIN steps_instance_sti sti ON stm.stm_id = sti.stm_id
                    JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                    JOIN phases_master_phm phm ON phi.phm_id = phm.phm_id
                    JOIN sequences_instance_sqi sqi ON phi.sqi_id = sqi.sqi_id
                    JOIN sequences_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
                    JOIN plans_master_plm plm ON pli.plm_id = plm.plm_id
                    JOIN iterations_ite ite ON pli.ite_id = ite.ite_id
                    JOIN migrations_mig mig ON ite.mig_id = mig.mig_id
                    LEFT JOIN teams_tms tms ON stm.tms_id_owner = tms.tms_id
                    LEFT JOIN steps_master_stm pred_stm ON stm.stm_id_predecessor = pred_stm.stm_id
                    LEFT JOIN environment_roles_enr enr ON stm.enr_id = enr.enr_id
                    -- Join to get actual environment name for this iteration and role
                    LEFT JOIN environments_env_x_iterations_ite eei ON eei.ite_id = ite.ite_id AND eei.enr_id = sti.enr_id
                    LEFT JOIN environments_env env ON eei.env_id = env.env_id
                    WHERE stm.stt_code = :sttCode 
                    AND stm.stm_number = :stmNumber
                    AND UPPER(mig.mig_name) = UPPER(:migrationName)
                    AND UPPER(ite.ite_name) = UPPER(:iterationName)
                    ORDER BY ite.created_at DESC
                    LIMIT 1
                ''', [sttCode: sttCode, stmNumber: stmNumber, migrationName: migrationName, iterationName: iterationName])
            }
            
            if (!stepInstance) {
                return Response.status(Response.Status.NOT_FOUND)
                    .entity(new JsonBuilder([error: "No step instance found for step code: ${stepCode} in migration: ${migrationName}, iteration: ${iterationName}"]).toString())
                    .build()
            }
            
            // Use the same method as iteration view to get complete step details
            def stepDetails = stepRepository.findStepInstanceDetailsById(UUID.fromString(stepInstance['sti_id'] as String))
            
            if (!stepDetails) {
                return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                    .entity(new JsonBuilder([error: "Failed to load step details"]).toString())
                    .build()
            }
            
            return Response.ok(new JsonBuilder(stepDetails).toString()).build()
            
        } catch (Exception e) {
            return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
                .entity(new JsonBuilder([error: "Could not load step view: ${e.message}"]).toString())
                .build()
        }
    }
    
    // Default response for invalid paths
    return Response.status(Response.Status.NOT_FOUND)
        .entity(new JsonBuilder([error: "Invalid endpoint"]).toString())
        .build()
}

