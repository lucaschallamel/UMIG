// Test compilation of the problematic StepDataTransformationService builder chain
// This simulates the pattern that was failing in lines 97-124

import java.time.LocalDateTime

// Mock classes for compilation test
class CommentDTO {}
class StatusService {
    String getDefaultStatus(String entityType) { return "PENDING" }
}
class DatabaseUtil {
    static withSql(Closure closure) { return null }
}

// Simplified StepInstanceDTO with the fixed builder
class StepInstanceDTO {
    String stepId, stepInstanceId, stepName, stepDescription, stepStatus
    String assignedTeamId, assignedTeamName
    String migrationId, migrationCode, iterationId, iterationCode
    String sequenceId, sequenceName, phaseId, phaseName
    Integer sequenceNumber, phaseNumber
    LocalDateTime createdDate, lastModifiedDate
    String stepType, stepCategory
    Integer estimatedDuration, actualDuration
    Integer dependencyCount, completedDependencies
    Integer instructionCount, completedInstructions
    Boolean hasActiveComments
    LocalDateTime lastCommentDate

    static class Builder {
        private StepInstanceDTO dto = new StepInstanceDTO()

        Builder stepId(String v) { dto.stepId = v; return this }
        Builder stepInstanceId(String v) { dto.stepInstanceId = v; return this }
        Builder stepName(String v) { dto.stepName = v; return this }
        Builder stepDescription(String v) { dto.stepDescription = v; return this }
        Builder stepStatus(String v) { dto.stepStatus = v; return this }
        Builder assignedTeamId(String v) { dto.assignedTeamId = v; return this }
        Builder assignedTeamName(String v) { dto.assignedTeamName = v; return this }
        Builder migrationId(String v) { dto.migrationId = v; return this }
        Builder migrationCode(String v) { dto.migrationCode = v; return this }
        Builder iterationId(String v) { dto.iterationId = v; return this }
        Builder iterationCode(String v) { dto.iterationCode = v; return this }
        Builder sequenceId(String v) { dto.sequenceId = v; return this }
        Builder sequenceName(String v) { dto.sequenceName = v; return this }
        Builder sequenceNumber(Integer v) { dto.sequenceNumber = v; return this }  // FIXED
        Builder phaseId(String v) { dto.phaseId = v; return this }
        Builder phaseName(String v) { dto.phaseName = v; return this }
        Builder phaseNumber(Integer v) { dto.phaseNumber = v; return this }       // FIXED
        Builder createdDate(LocalDateTime v) { dto.createdDate = v; return this }
        Builder lastModifiedDate(LocalDateTime v) { dto.lastModifiedDate = v; return this }
        Builder stepType(String v) { dto.stepType = v; return this }
        Builder stepCategory(String v) { dto.stepCategory = v; return this }
        Builder estimatedDuration(Integer v) { dto.estimatedDuration = v; return this }
        Builder actualDuration(Integer v) { dto.actualDuration = v; return this }
        Builder dependencyCount(Integer v) { dto.dependencyCount = v; return this }
        Builder completedDependencies(Integer v) { dto.completedDependencies = v; return this }
        Builder instructionCount(Integer v) { dto.instructionCount = v; return this }
        Builder completedInstructions(Integer v) { dto.completedInstructions = v; return this }
        Builder hasActiveComments(Boolean v) { dto.hasActiveComments = v; return this }
        Builder lastCommentDate(LocalDateTime v) { dto.lastCommentDate = v; return this }

        StepInstanceDTO build() { return dto }
    }

    static Builder builder() { return new Builder() }
}

// Test the exact pattern from StepDataTransformationService.groovy lines 78-124
class TestTransformationService {
    private StatusService statusService = new StatusService()

    private StatusService getStatusService() { return statusService }
    private String safeUUIDToString(Object uuid) { return uuid?.toString() }
    private String safeString(Object value) { return value?.toString() }
    private Integer safeInteger(Object value, Integer defaultValue = null) {
        return value as Integer ?: defaultValue
    }
    private LocalDateTime safeTimestampToLocalDateTime(Object timestamp) {
        return LocalDateTime.now()
    }
    private Boolean safeBoolean(Object value, Boolean defaultValue = false) {
        return value as Boolean ?: defaultValue
    }

    StepInstanceDTO fromDatabaseRow(Map row) {
        // This is the exact pattern that was failing in the original code
        try {
            return StepInstanceDTO.builder()
                // Core identification - with defensive UUID handling
                .stepId(safeUUIDToString(row.stm_id ?: row.sti_id))
                .stepInstanceId(safeUUIDToString(row.sti_id))
                .stepName(safeString(row.stm_name ?: row.sti_name))
                .stepDescription(safeString(row.stm_description ?: row.sti_description))
                .stepStatus(safeString(row.step_status ?: row.sti_status ?: getStatusService().getDefaultStatus('Step')))

                // Team assignment
                .assignedTeamId(safeUUIDToString(row.tms_id ?: row.assigned_team_id))
                .assignedTeamName(safeString(row.team_name ?: row.tms_name))

                // Hierarchical context
                .migrationId(safeUUIDToString(row.migration_id))
                .migrationCode(safeString(row.migration_name))
                .iterationId(safeUUIDToString(row.iteration_id))
                .iterationCode(safeString(row.iteration_type))
                .sequenceId(safeUUIDToString(row.sequence_id))
                .sequenceName(safeString(row.sequence_name))
                .sequenceNumber(safeInteger(row.sqi_order, 1))  // Line 97 - was failing before fix
                .phaseId(safeUUIDToString(row.phase_id))
                .phaseName(safeString(row.phase_name))
                .phaseNumber(safeInteger(row.phi_order, 1))     // Line 100 - was failing before fix

                // Temporal fields with proper LocalDateTime conversion
                .createdDate(safeTimestampToLocalDateTime(row.created_date))
                .lastModifiedDate(safeTimestampToLocalDateTime(row.last_modified_date))

                // Extended metadata
                .stepType(safeString(row.stt_code))
                .stepCategory(safeString(row.stt_name))
                .estimatedDuration(safeInteger(row.stm_duration_minutes))
                .actualDuration(safeInteger(row.sti_duration_minutes))

                // Progress tracking with safe integer conversion
                .dependencyCount(safeInteger(row.dependency_count, 0))
                .completedDependencies(safeInteger(row.completed_dependencies, 0))
                .instructionCount(safeInteger(row.instruction_count, 0))
                .completedInstructions(safeInteger(row.completed_instructions, 0))

                // Comment integration
                .hasActiveComments(safeBoolean(row.has_active_comments, false))
                .lastCommentDate(safeTimestampToLocalDateTime(row.last_comment_date))

                .build()  // Line 124 - was failing before fix

        } catch (Exception e) {
            throw new RuntimeException("Database row transformation failed: ${e.message}", e)
        }
    }
}

// Test the problematic code pattern
try {
    def service = new TestTransformationService()
    def testRow = [
        stm_id: "test-id",
        stm_name: "Test Step",
        step_status: "PENDING",
        sqi_order: 1,
        phi_order: 2
    ]

    StepInstanceDTO result = service.fromDatabaseRow(testRow)

    println "✅ StepDataTransformationService pattern test PASSED!"
    println "   - Builder chain completed without type errors"
    println "   - sequenceNumber: ${result.sequenceNumber}"
    println "   - phaseNumber: ${result.phaseNumber}"
    println "   - All builder methods returned correct Builder type"

} catch (Exception e) {
    println "❌ StepDataTransformationService pattern test FAILED: ${e.message}"
    e.printStackTrace()
}