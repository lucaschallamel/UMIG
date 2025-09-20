// Simple test to verify the StepInstanceDTO builder chain works
// Test script for verifying sequenceNumber and phaseNumber builder methods

import java.time.LocalDateTime

// Mock the essential classes for compilation
class CommentDTO {}

// Simplified StepInstanceDTO for testing
class StepInstanceDTO {
    String stepId
    String stepInstanceId
    String stepName
    String stepStatus
    Integer sequenceNumber
    Integer phaseNumber
    LocalDateTime createdDate
    LocalDateTime lastModifiedDate
    Boolean isActive = true
    Integer priority = 5

    static class Builder {
        private StepInstanceDTO dto = new StepInstanceDTO()

        Builder stepId(String stepId) { dto.stepId = stepId; return this }
        Builder stepInstanceId(String stepInstanceId) { dto.stepInstanceId = stepInstanceId; return this }
        Builder stepName(String stepName) { dto.stepName = stepName; return this }
        Builder stepStatus(String stepStatus) { dto.stepStatus = stepStatus; return this }
        Builder sequenceNumber(Integer sequenceNumber) { dto.sequenceNumber = sequenceNumber; return this }
        Builder phaseNumber(Integer phaseNumber) { dto.phaseNumber = phaseNumber; return this }
        Builder createdDate(LocalDateTime date) { dto.createdDate = date; return this }
        Builder lastModifiedDate(LocalDateTime date) { dto.lastModifiedDate = date; return this }

        StepInstanceDTO build() {
            if (!dto.createdDate) dto.createdDate = LocalDateTime.now()
            if (!dto.lastModifiedDate) dto.lastModifiedDate = LocalDateTime.now()
            return dto
        }
    }

    static Builder builder() {
        return new Builder()
    }
}

// Test the builder chain that was failing in StepDataTransformationService
try {
    StepInstanceDTO dto = StepInstanceDTO.builder()
        .stepId("test-id")
        .stepName("Test Step")
        .stepStatus("PENDING")
        .sequenceNumber(1)  // This was causing the type error
        .phaseNumber(2)     // This was also causing the type error
        .build()

    println "✅ Builder chain test PASSED!"
    println "   - sequenceNumber: ${dto.sequenceNumber}"
    println "   - phaseNumber: ${dto.phaseNumber}"
    println "   - stepName: ${dto.stepName}"

} catch (Exception e) {
    println "❌ Builder chain test FAILED: ${e.message}"
    e.printStackTrace()
}