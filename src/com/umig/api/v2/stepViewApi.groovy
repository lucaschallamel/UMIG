import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.transform.BaseScript
import groovy.json.JsonOutput

// NOTE: The following imports only resolve in the Confluence+ScriptRunner runtime. Safe to ignore IDE warnings locally.
import com.umig.repository.TeamRepository
import com.umig.repository.StepTypeRepository
import com.umig.repository.StepRepository
import com.umig.repository.InstructionRepository
import com.umig.repository.LookupRepository

@BaseScript CustomEndpointDelegate delegate

/**
 * REST endpoint to fetch and render the HTML for the STEP View.
 * Called by the client-side JS controller.
 */
stepViewApi(httpMethod: "GET") { javax.ws.rs.core.Request request ->
    def stepId = request.getUri().getQueryParameters().getFirst("stepid")

    if (!stepId || !stepId.contains('-')) {
        return javax.ws.rs.core.Response.status(400).entity("<div class='aui-message aui-message-error'>Error: Missing or invalid 'stepid' parameter.</div>").build()
    }

    try {
        def data = getStepViewData(stepId)
        def json = JsonOutput.toJson(data)
        return javax.ws.rs.core.Response.ok(json).type('application/json').build()
    } catch (e) {
        log.error("UMIG Error: Failed to render STEP View for ${stepId}", e)
        return javax.ws.rs.core.Response.status(500).entity("<div class='aui-message aui-message-error'>Error: Could not render STEP View. Check server logs for details.</div>").build()
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

    // --- Data Retrieval ---
    def stepDetails = stepRepository.findStepMaster(sttCode, stmNumber)
    if (!stepDetails) {
        return [error: "Step with ID ${stepId} not found."]
    }

    def instructions = instructionRepository.findInstructionsMaster(stepDetails.stm_id)
    def impactedTeamIds = stepRepository.findImpactedTeamIds(stepDetails.stm_id)
    def impactedTeams = impactedTeamIds.collect { teamRepository.findTeamById(it) }
    def statusType = stepTypeRepository.findStepTypeByCode(stepDetails.stt_code)?.stt_name

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

    def formattedTeams = impactedTeams.collect { it.tms_name }

    return [
        stepSummary  : stepSummary,
        instructions : formattedInstructions,
        impactedTeams: formattedTeams
    ]
}
