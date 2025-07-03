package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.StepRepository
import umig.repository.InstructionRepository
import umig.repository.TeamRepository
import umig.repository.StepTypeRepository
import groovy.json.JsonBuilder
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response

@BaseScript CustomEndpointDelegate delegate

final StepRepository stepRepository = new StepRepository()
final InstructionRepository instructionRepository = new InstructionRepository()
final TeamRepository teamRepository = new TeamRepository()
final StepTypeRepository stepTypeRepository = new StepTypeRepository()

stepViewApi(httpMethod: "GET", groups: ["confluence-users", "confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    final String stepId = queryParams.getFirst("stepid")
    if (!stepId || !stepId.contains('-')) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "Missing or invalid 'stepid' parameter."]).toString()).build()
    }
    try {
        def (sttCode, stmNumberStr) = stepId.tokenize('-')
        def stmNumber = stmNumberStr as Integer
        def stepDetails = stepRepository.findStepMaster(sttCode, stmNumber)
        if (!stepDetails) {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "Step with ID ${stepId} not found."]).toString()).build()
        }
        def instructions = instructionRepository.findInstructionsMaster(stepDetails.stm_id)
        def impactedTeamIds = stepRepository.findImpactedTeamIds(stepDetails.stm_id)
        def impactedTeams = impactedTeamIds.collect { teamRepository.findTeamById(it) }
        def statusType = stepTypeRepository.findStepTypeByCode(stepDetails.stt_code)?.stt_name

        def stepSummary = [
            'ID'          : stepId,
            'Name'        : stepDetails.stm_name,
            'Description' : stepDetails.stm_description,
            'Type'        : statusType
        ]
        def formattedInstructions = instructions.collect {
            [
                'Order'      : it.inm_order,
                'Description': it.inm_body
            ]
        }
        def formattedTeams = impactedTeams.collect { it?.tms_name }

        def result = [
            stepSummary  : stepSummary,
            instructions : formattedInstructions,
            impactedTeams: formattedTeams
        ]
        return Response.ok(new JsonBuilder(result).toString()).build()
    } catch (Exception e) {
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "Could not render STEP View: ${e.message}" ]).toString()).build()
    }
}

/**
 * Gathers all data required for the STEP View and returns it as a structured map.
 * @param stepId The step identifier (e.g., 'BGO-4').
 * @return A map containing all step data.
 */
Map getStepViewData(String stepId) {
    def (sttCode, stmNumberStr) = stepId.tokenize('-')
    def stmNumber = stmNumberStr as Integer

    // --- Repositories ---
    def stepRepository = new StepRepository()
    def instructionRepository = new InstructionRepository()
    def teamRepository = new TeamRepository()
    def stepTypeRepository = new StepTypeRepository()

    // --- Data Retrieval with Instrumentation ---
    log.debug("[UMIG] Fetching stepDetails for code=${sttCode}, number=${stmNumber}")
    def stepDetails = stepRepository.findStepMaster(sttCode, stmNumber)
    log.debug("[UMIG] stepDetails: ${stepDetails}")
    if (!stepDetails) {
        // Fallback: Try direct SQL
        log.warn("[UMIG] stepDetails via repository is null, trying direct SQL fallback.")
        com.umig.utils.DatabaseUtil.withSql { sql ->
            stepDetails = sql.firstRow('''
                SELECT stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name, stm.stm_description
                FROM steps_master_stm stm
                WHERE stm.stt_code = :sttCode AND stm.stm_number = :stmNumber
            ''', [sttCode: sttCode, stmNumber: stmNumber])
        }
        log.debug("[UMIG] stepDetails (fallback): ${stepDetails}")
        if (!stepDetails) {
            return [error: "Step with ID ${stepId} not found."]
        }
    }

    log.debug("[UMIG] Fetching instructions for stm_id=${stepDetails.stm_id}")
    def instructions = instructionRepository.findInstructionsMaster(stepDetails.stm_id)
    log.debug("[UMIG] instructions: ${instructions}")
    if (!instructions) {
        log.warn("[UMIG] instructions via repository is null, trying direct SQL fallback.")
        com.umig.utils.DatabaseUtil.withSql { sql ->
            instructions = sql.rows('''
                SELECT inm.inm_order, inm.inm_body
                FROM instructions_master_inm inm
                WHERE inm.stm_id = :stmId
                ORDER BY inm.inm_order
            ''', [stmId: stepDetails.stm_id])
        }
        log.debug("[UMIG] instructions (fallback): ${instructions}")
    }

    log.debug("[UMIG] Fetching impactedTeamIds for stm_id=${stepDetails.stm_id}")
    def impactedTeamIds = stepRepository.findImpactedTeamIds(stepDetails.stm_id)
    log.debug("[UMIG] impactedTeamIds: ${impactedTeamIds}")
    if (!impactedTeamIds) {
        log.warn("[UMIG] impactedTeamIds via repository is null, trying direct SQL fallback.")
        com.umig.utils.DatabaseUtil.withSql { sql ->
            impactedTeamIds = sql.rows('''
                SELECT tms_id FROM steps_master_stm_x_teams_tms_impacted WHERE stm_id = :stmId
            ''', [stmId: stepDetails.stm_id])*.tms_id
        }
        log.debug("[UMIG] impactedTeamIds (fallback): ${impactedTeamIds}")
    }

    log.debug("[UMIG] Fetching impactedTeams for impactedTeamIds=${impactedTeamIds}")
    def impactedTeams = impactedTeamIds.collect {
        def team = teamRepository.findTeamById(it)
        if (!team) {
            log.warn("[UMIG] teamRepository.findTeamById(${it}) returned null, trying direct SQL fallback.")
            com.umig.utils.DatabaseUtil.withSql { sql ->
                team = sql.firstRow('SELECT tms_id, tms_name FROM teams_tms WHERE tms_id = :tmsId', [tmsId: it])
            }
            log.debug("[UMIG] team (fallback): ${team}")
        }
        return team
    }
    log.debug("[UMIG] impactedTeams: ${impactedTeams}")

    log.debug("[UMIG] Fetching statusType for stt_code=${stepDetails.stt_code}")
    def statusType = stepTypeRepository.findStepTypeByCode(stepDetails.stt_code)?.stt_name
    log.debug("[UMIG] statusType: ${statusType}")
    if (!statusType) {
        log.warn("[UMIG] statusType via repository is null, trying direct SQL fallback.")
        com.umig.utils.DatabaseUtil.withSql { sql ->
            statusType = sql.firstRow('SELECT stt_name FROM step_types_stt WHERE stt_code = :sttCode', [sttCode: stepDetails.stt_code])?.stt_name
        }
        log.debug("[UMIG] statusType (fallback): ${statusType}")
    }

    // --- Data Assembly ---
    def stepSummary = [
        'ID'          : stepId,
        'Name'        : stepDetails.stm_name,
        'Description' : stepDetails.stm_description,
        'Type'        : statusType
    ]

    def formattedInstructions = instructions.collect {
        [
            'Order'      : it.inm_order,
            'Description': it.inm_body
        ]
    }

    def formattedTeams = impactedTeams.collect { it?.tms_name }

    return [
        stepSummary  : stepSummary,
        instructions : formattedInstructions,
        impactedTeams: formattedTeams
    ]
}
