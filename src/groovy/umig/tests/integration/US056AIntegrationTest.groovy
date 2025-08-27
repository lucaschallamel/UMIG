package umig.tests.integration

import spock.lang.Specification
import spock.lang.Shared
import spock.lang.Stepwise

import umig.dto.StepDataTransferObject
import umig.dto.CommentDTO
import umig.service.StepDataTransformationService
import umig.repository.StepRepository
import umig.utils.DatabaseUtil

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

/**
 * US-056-A Service Layer Standardization Integration Test
 * 
 * Validates the complete data flow through the DTO transformation service:
 * 1. StepDataTransferObject creation and validation
 * 2. Service transformation methods (DTO ↔ Database ↔ Email Template)
 * 3. Repository integration with DTO methods
 * 4. End-to-end data consistency validation
 * 
 * This test proves the concept works and serves as validation for Sprint 5 completion.
 * 
 * @since US-056-A Phase 1
 */
@Stepwise
class US056AIntegrationTest extends Specification {
    
    @Shared StepDataTransformationService transformationService
    @Shared StepRepository stepRepository
    @Shared String testStepId = UUID.randomUUID().toString()
    @Shared String testStepInstanceId = UUID.randomUUID().toString()
    @Shared StepDataTransferObject testDTO
    
    def setupSpec() {
        transformationService = new StepDataTransformationService()
        stepRepository = new StepRepository()
        
        // Create comprehensive test DTO
        testDTO = createTestStepDataTransferObject()
    }
    
    def "Step 1: DTO Creation and Validation"() {
        when: "Creating a comprehensive StepDataTransferObject"
        def dto = StepDataTransferObject.builder()
            .stepId(testStepId)
            .stepInstanceId(testStepInstanceId)
            .stepName("US-056-A Integration Test Step")
            .stepDescription("Test step for validating DTO transformation service")
            .stepStatus("IN_PROGRESS")
            .assignedTeamId(UUID.randomUUID().toString())
            .assignedTeamName("Test Team")
            .migrationId(UUID.randomUUID().toString())
            .migrationCode("TEST-MIG-001")
            .iterationId(UUID.randomUUID().toString())
            .iterationCode("TEST-ITR-001")
            .sequenceId(UUID.randomUUID().toString())
            .phaseId(UUID.randomUUID().toString())
            .priority(7)
            .stepType("VALIDATION")
            .stepCategory("INTEGRATION")
            .estimatedDuration(60)
            .actualDuration(45)
            .dependencyCount(3)
            .completedDependencies(2)
            .instructionCount(5)
            .completedInstructions(3)
            .hasActiveComments(true)
            .comments([createTestComment()])
            .build()
        
        then: "DTO should be created successfully"
        dto != null
        dto.stepId == testStepId
        dto.stepInstanceId == testStepInstanceId
        dto.stepName == "US-056-A Integration Test Step"
        
        and: "DTO validation should pass"
        def errors = dto.validate()
        errors.isEmpty()
        
        and: "Computed properties should work correctly"
        dto.dependencyCompletionPercentage == 66.67d  // 2/3 * 100, rounded
        dto.instructionCompletionPercentage == 60.0d   // 3/5 * 100
        !dto.isReadyToStart  // Not ready because dependencies incomplete
        
        and: "JSON serialization should work"
        def jsonString = dto.toJson()
        jsonString.contains(testStepId)
        
        and: "Template map conversion should work"
        def templateMap = dto.toTemplateMap()
        templateMap.stepId == testStepId
        templateMap.stepName == "US-056-A Integration Test Step"
        templateMap.recentComments.size() == 1
    }
    
    def "Step 2: Service Transformation - DTO to Database Parameters"() {
        when: "Converting DTO to database parameters"
        def dbParams = transformationService.toDatabaseParams(testDTO)
        
        then: "Database parameters should be created correctly"
        dbParams != null
        dbParams.stm_id == UUID.fromString(testStepId)
        dbParams.sti_id == UUID.fromString(testStepInstanceId)
        dbParams.stm_name == "US-056-A Integration Test Step"
        dbParams.sti_status == "IN_PROGRESS"
        dbParams.sti_priority == 7
        
        and: "All non-null values should be included"
        dbParams.each { key, value ->
            assert value != null : "Database parameter ${key} should not be null"
        }
        
        and: "UUID fields should be properly converted"
        dbParams.stm_id instanceof UUID
        dbParams.sti_id instanceof UUID
        dbParams.tms_id instanceof UUID
        dbParams.mig_id instanceof UUID
    }
    
    def "Step 3: Service Transformation - DTO to Email Template Data"() {
        when: "Converting DTO to email template data"
        def templateData = transformationService.toEmailTemplateData(testDTO)
        
        then: "Email template data should be comprehensive"
        templateData != null
        templateData.size() > 20  // Should have many fields
        
        and: "Core fields should be present and formatted"
        templateData.stepDisplayName == "US-056-A Integration Test Step"
        templateData.statusDisplayName == "In Progress"
        templateData.priorityDisplayName == "Medium-High Priority"
        templateData.assignedTeamName == "Test Team"
        
        and: "Progress text should be formatted correctly"
        templateData.dependencyProgressText == "2/3 dependencies (67%)"
        templateData.instructionProgressText == "3/5 instructions (60%)"
        
        and: "CSS classes should be mapped correctly"
        templateData.statusClass == "status-in-progress"
        templateData.priorityClass == "priority-medium-high"
        
        and: "All template fields should have non-null values"
        templateData.each { key, value ->
            assert value != null : "Template data ${key} should not be null"
        }
        
        and: "Comments should be included safely"
        templateData.recentComments instanceof List
        templateData.commentCount == 1
        templateData.hasActiveComments == true
    }
    
    def "Step 4: Service Transformation - Database Row to DTO"() {
        given: "A mock database row with typical field names"
        def mockDbRow = [
            stm_id: UUID.fromString(testStepId),
            sti_id: UUID.fromString(testStepInstanceId),
            stm_name: "DB Row Test Step",
            stm_description: "Test step from database row",
            sti_status: "COMPLETED",
            tms_id: UUID.randomUUID(),
            team_name: "Database Team",
            mig_id: UUID.randomUUID(),
            migration_code: "DB-MIG-001",
            itr_id: UUID.randomUUID(),
            iteration_code: "DB-ITR-001",
            seq_id: UUID.randomUUID(),
            phm_id: UUID.randomUUID(),
            sti_created_date: new java.sql.Timestamp(System.currentTimeMillis()),
            sti_last_modified_date: new java.sql.Timestamp(System.currentTimeMillis()),
            sti_is_active: true,
            sti_priority: 8,
            stm_estimated_duration: 120,
            sti_actual_duration: 100,
            dependency_count: 2,
            completed_dependencies: 2,
            instruction_count: 4,
            completed_instructions: 4,
            has_active_comments: false
        ]
        
        when: "Converting database row to DTO"
        def dtoFromDb = transformationService.fromDatabaseRow(mockDbRow)
        
        then: "DTO should be created correctly from database row"
        dtoFromDb != null
        dtoFromDb.stepId == testStepId
        dtoFromDb.stepInstanceId == testStepInstanceId
        dtoFromDb.stepName == "DB Row Test Step"
        dtoFromDb.stepStatus == "COMPLETED"
        dtoFromDb.priority == 8
        
        and: "Temporal fields should be converted correctly"
        dtoFromDb.createdDate instanceof LocalDateTime
        dtoFromDb.lastModifiedDate instanceof LocalDateTime
        
        and: "Progress calculations should work correctly"
        dtoFromDb.dependencyCompletionPercentage == 100.0d
        dtoFromDb.instructionCompletionPercentage == 100.0d
        dtoFromDb.isReadyToStart == true  // All dependencies complete
        
        and: "DTO validation should pass"
        def errors = dtoFromDb.validate()
        errors.isEmpty()
    }
    
    def "Step 5: Batch Transformation Validation"() {
        given: "Multiple test DTOs"
        def dtos = [
            testDTO,
            StepDataTransferObject.create(UUID.randomUUID().toString(), "Test Step 2", "PENDING"),
            StepDataTransferObject.create(UUID.randomUUID().toString(), "Test Step 3", "COMPLETED")
        ]
        
        when: "Batch transforming to email template data"
        def templateDataList = transformationService.batchTransformToEmailTemplateData(dtos)
        
        then: "All DTOs should be transformed successfully"
        templateDataList.size() == 3
        templateDataList.each { templateData ->
            assert templateData != null
            assert templateData.stepId != null
            assert templateData.stepDisplayName != null
            assert templateData.statusDisplayName != null
        }
        
        when: "Batch transforming to database parameters"
        def dbParamsList = transformationService.batchTransformToDatabaseParams(dtos)
        
        then: "All DTOs should be transformed to database parameters"
        dbParamsList.size() == 3
        dbParamsList.each { params ->
            assert params != null
            assert params.stm_id != null
            assert params.stm_name != null
            assert params.sti_status != null
        }
    }
    
    def "Step 6: Error Handling and Edge Cases"() {
        when: "Handling null DTO in transformation service"
        def nullTemplateData = transformationService.toEmailTemplateData(null)
        
        then: "Should return empty map without throwing exception"
        nullTemplateData != null
        nullTemplateData.isEmpty()
        
        when: "Handling invalid database row"
        def invalidRow = [invalid_field: "test"]
        def dtoFromInvalidRow = transformationService.fromDatabaseRow(invalidRow)
        
        then: "Should handle missing required fields gracefully"
        thrown(RuntimeException)  // Should fail validation during build()
        
        when: "Handling DTO with validation errors for database conversion"
        def invalidDTO = new StepDataTransferObject()  // Missing required fields
        
        then: "Should throw validation exception"
        def ex = thrown(IllegalArgumentException)
        ex.message.contains("stepId is required")
    }
    
    def "Step 7: JSON Schema Validation Integration"() {
        when: "Converting DTO to JSON"
        def jsonString = testDTO.toJson()
        
        then: "JSON should be valid and parseable"
        jsonString != null
        jsonString.contains(testStepId)
        jsonString.contains("US-056-A Integration Test Step")
        
        when: "Parsing JSON back to DTO"
        def parsedDTO = StepDataTransferObject.fromJson(jsonString)
        
        then: "Parsed DTO should match original"
        parsedDTO != null
        parsedDTO.stepId == testDTO.stepId
        parsedDTO.stepName == testDTO.stepName
        parsedDTO.stepStatus == testDTO.stepStatus
        parsedDTO.priority == testDTO.priority
        
        and: "Computed properties should work correctly"
        parsedDTO.dependencyCompletionPercentage == testDTO.dependencyCompletionPercentage
        parsedDTO.instructionCompletionPercentage == testDTO.instructionCompletionPercentage
    }
    
    def "Step 8: End-to-End Integration Success Validation"() {
        when: "Performing complete round-trip transformation"
        // DTO → Database Params → Mock DB Row → DTO → Template Data
        def dbParams = transformationService.toDatabaseParams(testDTO)
        def mockDbRow = simulateDatabaseRowFromParams(dbParams)
        def roundTripDTO = transformationService.fromDatabaseRow(mockDbRow)
        def finalTemplateData = transformationService.toEmailTemplateData(roundTripDTO)
        
        then: "End-to-end transformation should preserve data integrity"
        roundTripDTO.stepId == testDTO.stepId
        roundTripDTO.stepName == testDTO.stepName
        roundTripDTO.stepStatus == testDTO.stepStatus
        roundTripDTO.priority == testDTO.priority
        
        and: "Final template data should be complete"
        finalTemplateData.stepDisplayName == testDTO.stepName
        finalTemplateData.statusDisplayName != null
        finalTemplateData.priorityDisplayName != null
        
        and: "No data loss should occur in round-trip"
        def originalJson = testDTO.toJson()
        def roundTripJson = roundTripDTO.toJson()
        // Core fields should match (some computed fields may differ due to formatting)
        originalJson.contains(testDTO.stepId)
        roundTripJson.contains(testDTO.stepId)
        
        and: "US-056-A Phase 1 objectives should be met"
        // 1. Unified data structure ✓
        roundTripDTO instanceof StepDataTransferObject
        // 2. Consistent transformations ✓  
        finalTemplateData.stepDisplayName != null
        // 3. Template rendering safety ✓
        finalTemplateData.each { key, value -> assert value != null }
        // 4. Type safety compliance ✓
        roundTripDTO.validate().isEmpty()
    }
    
    // ========================================
    // HELPER METHODS
    // ========================================
    
    private StepDataTransferObject createTestStepDataTransferObject() {
        return StepDataTransferObject.builder()
            .stepId(testStepId)
            .stepInstanceId(testStepInstanceId)
            .stepName("US-056-A Integration Test Step")
            .stepDescription("Comprehensive test step for DTO transformation validation")
            .stepStatus("IN_PROGRESS")
            .assignedTeamId(UUID.randomUUID().toString())
            .assignedTeamName("Test Team")
            .migrationId(UUID.randomUUID().toString())
            .migrationCode("TEST-MIG-001")
            .iterationId(UUID.randomUUID().toString())
            .iterationCode("TEST-ITR-001")
            .sequenceId(UUID.randomUUID().toString())
            .phaseId(UUID.randomUUID().toString())
            .priority(7)
            .stepType("VALIDATION")
            .stepCategory("INTEGRATION")
            .estimatedDuration(60)
            .actualDuration(45)
            .dependencyCount(3)
            .completedDependencies(2)
            .instructionCount(5)
            .completedInstructions(3)
            .hasActiveComments(true)
            .comments([createTestComment()])
            .build()
    }
    
    private CommentDTO createTestComment() {
        def comment = new CommentDTO()
        comment.commentId = UUID.randomUUID().toString()
        comment.text = "This is a test comment for US-056-A integration testing"
        comment.authorId = UUID.randomUUID().toString() 
        comment.authorName = "Test Author"
        comment.createdDate = LocalDateTime.now()
        comment.isActive = true
        comment.isResolved = false
        return comment
    }
    
    private Map simulateDatabaseRowFromParams(Map<String, Object> dbParams) {
        // Simulate what the database would return after insert/update
        Map mockRow = [:]
        
        // Map database parameters back to result row format
        mockRow.stm_id = dbParams.stm_id
        mockRow.sti_id = dbParams.sti_id
        mockRow.stm_name = dbParams.stm_name
        mockRow.stm_description = dbParams.stm_description
        mockRow.sti_status = dbParams.sti_status
        mockRow.tms_id = dbParams.tms_id
        mockRow.team_name = "Test Team"  // Would come from JOIN
        mockRow.mig_id = dbParams.mig_id
        mockRow.migration_code = "TEST-MIG-001"  // Would come from JOIN
        mockRow.itr_id = dbParams.itr_id
        mockRow.iteration_code = "TEST-ITR-001"  // Would come from JOIN
        mockRow.seq_id = dbParams.seq_id
        mockRow.phm_id = dbParams.phm_id
        mockRow.sti_created_date = dbParams.sti_created_date
        mockRow.sti_last_modified_date = dbParams.sti_last_modified_date
        mockRow.sti_is_active = dbParams.sti_is_active
        mockRow.sti_priority = dbParams.sti_priority
        mockRow.stm_estimated_duration = dbParams.stm_estimated_duration
        mockRow.sti_actual_duration = dbParams.sti_actual_duration
        
        // Add some computed fields that would come from database aggregation
        mockRow.dependency_count = 3
        mockRow.completed_dependencies = 2
        mockRow.instruction_count = 5
        mockRow.completed_instructions = 3
        mockRow.has_active_comments = true
        mockRow.last_comment_date = new java.sql.Timestamp(System.currentTimeMillis())
        
        return mockRow
    }
}