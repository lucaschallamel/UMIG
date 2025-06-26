// A self-contained unit test for the getStepViewData function from stepViewApi.groovy
// This file can be run directly from the command line: `groovy stepViewApiUnitTest.groovy`

// --- Mock Repositories ---
// These classes simulate the real repositories by returning hardcoded data.
class StepRepository {
    Map findStepById(String sttCode, Integer stmNumber) {
        if (sttCode == 'BGO' && stmNumber == 4) {
            return [
                stm_id: 4,
                stt_id: 1,
                stm_name: 'Review and Approve Document',
                stm_description: 'A critical step for quality assurance.',
                stm_creation_tms: new Date(),
                stm_last_update_tms: new Date()
            ]
        }
        return null
    }

    List findImpactedTeamsByStepId(Integer stmId) {
        if (stmId == 4) {
            return [
                [tms_id: 101, tms_name: 'Legal'],
                [tms_id: 102, tms_name: 'Compliance']
            ]
        }
        return []
    }
}

class InstructionRepository {
    List findInstructionsByStepId(Integer stmId) {
        if (stmId == 4) {
            return [
                [ins_id: 201, ins_order: 1, ins_description: 'Verify author credentials.'],
                [ins_id: 202, ins_order: 2, ins_description: 'Check for plagiarism.'],
                [ins_id: 203, ins_order: 3, ins_description: 'Approve in the system.']
            ]
        }
        return []
    }
}

class LookupRepository {
    String findStatusTypeById(Integer sttId) {
        if (sttId == 1) {
            return 'Business Process'
        }
        return null
    }
}

// --- Function Under Test ---
// This is the function copied directly from stepViewApi.groovy
Map getStepViewData(String stepId) {
    def (sttCode, stmNumberStr) = stepId.tokenize('-')
    def stmNumber = stmNumberStr as Integer

    // --- Data Retrieval ---
    def stepRepo = new StepRepository()
    def instrRepo = new InstructionRepository()
    def lookupRepo = new LookupRepository()

    def stepDetails = stepRepo.findStepById(sttCode, stmNumber)
    if (!stepDetails) {
        return [error: "Step with ID ${stepId} not found."]
    }

    def instructions = instrRepo.findInstructionsByStepId(stepDetails.stm_id)
    def impactedTeams = stepRepo.findImpactedTeamsByStepId(stepDetails.stm_id)
    def statusType = lookupRepo.findStatusTypeById(stepDetails.stt_id)

    // --- Data Assembly ---
    def stepSummary = [
        'ID'          : stepId,
        'Name'        : stepDetails.stm_name,
        'Description' : stepDetails.stm_description,
        'Type'        : statusType,
        'Created'     : stepDetails.stm_creation_tms.format("yyyy-MM-dd'T'HH:mm:ss'Z'"),
        'Last Updated': stepDetails.stm_last_update_tms.format("yyyy-MM-dd'T'HH:mm:ss'Z'")
    ]

    def formattedInstructions = instructions.collect {
        [
            'Order'      : it.ins_order,
            'Description': it.ins_description
        ]
    }

    def formattedTeams = impactedTeams.collect { it.tms_name }

    return [
        stepSummary : stepSummary,
        instructions: formattedInstructions,
        impactedTeams: formattedTeams
    ]
}

// --- Test Execution ---
println "Running unit test for getStepViewData..."

def result = getStepViewData('BGO-4')

// --- Assertions ---
assert result != null
assert result.error == null
assert result.stepSummary != null
assert result.instructions != null
assert result.impactedTeams != null

assert result.stepSummary.ID == 'BGO-4'
assert result.stepSummary.Name == 'Review and Approve Document'
assert result.stepSummary.Type == 'Business Process'

assert result.instructions.size() == 3
assert result.instructions[0].Order == 1
assert result.instructions[0].Description == 'Verify author credentials.'

assert result.impactedTeams.size() == 2
assert result.impactedTeams.contains('Legal')
assert result.impactedTeams.contains('Compliance')

println "✅ Unit test passed successfully!"
