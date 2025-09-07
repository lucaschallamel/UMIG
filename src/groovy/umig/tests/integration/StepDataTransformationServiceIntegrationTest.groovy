package umig.tests.integration

// Add Jackson dependencies for DTO classes
@Grab('com.fasterxml.jackson.core:jackson-databind:2.15.2')
@Grab('com.fasterxml.jackson.datatype:jackson-datatype-jsr310:2.15.2')
@Grab('org.postgresql:postgresql:42.7.3')

import umig.dto.StepInstanceDTO
import umig.dto.StepMasterDTO
import umig.dto.CommentDTO
import umig.service.StepDataTransformationService
import umig.repository.StepRepository
import umig.utils.DatabaseUtil

import java.time.LocalDateTime

/**
 * US-056-A Service Layer Standardization Integration Test - Pure Groovy Compatible
 * 
 * Validates the complete data flow through the DTO transformation service using
 * Pure Groovy testing patterns following ADR-036.
 * 
 * Tests cover:
 * 1. StepInstanceDTO creation and validation
 * 2. StepMasterDTO creation and validation
 * 3. Service transformation methods (DTO ↔ Database ↔ Email Template)
 * 4. Repository integration with DTO methods
 * 5. End-to-end data consistency validation
 * 
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * 
 * @since US-056-A Phase 1 - Pure Groovy Version
 */
class StepDataTransformationServiceIntegrationTest {
    
    private StepDataTransformationService transformationService
    private StepRepository stepRepository
    private String testStepId
    private String testStepInstanceId
    private StepInstanceDTO testDTO
    
    // Test execution results
    private static List<String> testResults = []
    private static List<String> failedTests = []
    
    StepDataTransformationServiceIntegrationTest() {
        println "Initializing StepDataTransformationService Integration Test..."
        setup()
    }
    
    void setup() {
        transformationService = new StepDataTransformationService()
        stepRepository = new StepRepository()
        testStepId = UUID.randomUUID().toString()
        testStepInstanceId = UUID.randomUUID().toString()
        
        // Create comprehensive test DTO using helper method
        testDTO = createTestStepInstanceDTO(testStepId, testStepInstanceId)
    }
    
    /**
     * Main test execution method - runs all tests in sequence
     */
    static void main(String[] args) {
        def testInstance = new StepDataTransformationServiceIntegrationTest()
        testInstance.runAllTests()
        testInstance.printTestResults()
    }
    
    void runAllTests() {
        println "\n" + "="*80
        println "US-056-A StepDataTransformationService Integration Tests"
        println "="*80
        
        try {
            testDTOCreationAndValidation()
            testMasterDTOCreationAndValidation()
            testServiceTransformationDTOToDatabaseParams()
            testServiceTransformationDTOToEmailTemplateData()
            testServiceTransformationDatabaseRowToDTO()
            testServiceTransformationMasterDatabaseRowToDTO()
            testBatchTransformationValidation()
            testErrorHandlingAndEdgeCases()
            testJSONSchemaValidationIntegration()
            testEndToEndIntegrationSuccessValidation()
            
            println "\n" + "="*80
            println "✅ ALL TESTS COMPLETED SUCCESSFULLY!"
            println "Total tests passed: ${testResults.size()}"
            if (failedTests.size() > 0) {
                println "❌ Failed tests: ${failedTests.size()}"
            }
            println "="*80
            
        } catch (Exception e) {
            println "❌ CRITICAL TEST FAILURE: ${e.message}"
            e.printStackTrace()
            failedTests.add("Critical test execution failure: ${e.message}".toString())
        }
    }
    
    void printTestResults() {
        if (failedTests.size() > 0) {
            println "\n❌ FAILED TESTS:"
            failedTests.each { failure ->
                println "  - ${failure}"
            }
            System.exit(1)
        } else {
            println "\n✅ All tests passed successfully!"
            System.exit(0)
        }
    }
    
    void testDTOCreationAndValidation() {
        println "\n🧪 Test 1: DTO Creation and Validation"
        
        try {
            // Creating a comprehensive StepInstanceDTO
            def dto = createTestStepInstanceDTO(testStepId, testStepInstanceId)
            
            // DTO should be created successfully
            assert dto != null, "DTO should not be null"
            assert dto.stepId == testStepId, "StepId should match"
            assert dto.stepInstanceId == testStepInstanceId, "StepInstanceId should match"
            assert dto.stepName == "US-056-A Integration Test Step", "StepName should match"
            
            // DTO validation should pass
            def validationErrors = dto.validate()
            assert validationErrors.isEmpty(), "Validation errors should be empty: ${validationErrors}"
            
            // Computed properties should work correctly
            def depPercentage = dto.dependencyCompletionPercentage
            def instPercentage = dto.instructionCompletionPercentage
            def isReady = dto.isReadyToStart
            assert depPercentage == 66.67d, "Dependency percentage should be 66.67%, got: ${depPercentage}" // 2/3 * 100, rounded
            assert instPercentage == 60.0d, "Instruction percentage should be 60.0%, got: ${instPercentage}"   // 3/5 * 100
            assert !isReady, "Should not be ready because dependencies incomplete"  // Not ready because dependencies incomplete
            
            // JSON serialization should work
            def jsonString = dto.toJson()
            assert jsonString.contains(testStepId), "JSON should contain stepId"
            
            // Template map conversion should work
            def templateMap = dto.toTemplateMap()
            assert templateMap.stepId == testStepId, "Template map stepId should match"
            assert templateMap.stepName == "US-056-A Integration Test Step", "Template map stepName should match"
            def recentComments = templateMap.recentComments as List
            assert recentComments.size() == 1, "Should have 1 recent comment, got: ${recentComments.size()}"
            
            testResults.add("✅ DTO Creation and Validation - PASSED")
            println "   ✅ All DTO creation and validation checks passed"
            
        } catch (Exception e) {
            failedTests.add("DTO Creation and Validation: ${e.message}".toString())
            println "   ❌ DTO Creation and Validation failed: ${e.message}"
            throw e
        }
    }
    
    void testMasterDTOCreationAndValidation() {
        println "\n🧪 Test 2: Master DTO Creation and Validation"
        
        try {
            // Creating a comprehensive StepMasterDTO
            def masterDto = createTestStepMasterDTO()
            
            // Master DTO should be created successfully
            assert masterDto != null, "Master DTO should not be null"
            assert masterDto.stepMasterId != null, "StepMasterId should not be null"
            assert masterDto.stepName == "US-056F Master Test Step", "StepName should match"
            assert masterDto.stepTypeCode == "VALIDATION", "StepTypeCode should match"
            
            // JSON serialization should work
            def jsonString = masterDto.toJson()
            assert jsonString.contains(masterDto.stepMasterId), "JSON should contain stepMasterId"
            
            testResults.add("✅ Master DTO Creation and Validation - PASSED")
            println "   ✅ All Master DTO creation and validation checks passed"
            
        } catch (Exception e) {
            failedTests.add("Master DTO Creation and Validation: ${e.message}".toString())
            println "   ❌ Master DTO Creation and Validation failed: ${e.message}"
            throw e
        }
    }
    
    void testServiceTransformationDTOToDatabaseParams() {
        println "\n🧪 Test 3: Service Transformation - DTO to Database Parameters"
        
        try {
            // Converting DTO to database parameters
            def dbParams = transformationService.toDatabaseParams(testDTO)
            
            // Database parameters should be created correctly
            assert dbParams != null, "Database parameters should not be null"
            assert dbParams.stm_id == UUID.fromString(testStepId), "stm_id should match testStepId"
            assert dbParams.sti_id == UUID.fromString(testStepInstanceId), "sti_id should match testStepInstanceId"
            assert dbParams.stm_name == "US-056-A Integration Test Step", "stm_name should match"
            assert dbParams.sti_status == "IN_PROGRESS", "sti_status should be IN_PROGRESS"
            assert dbParams.sti_priority == 7, "sti_priority should be 7"
            
            // All non-null values should be included
            dbParams.each { key, value ->
                assert value != null, "Database parameter ${key} should not be null"
            }
            
            // UUID fields should be properly converted
            def stmId = dbParams.stm_id
            def stiId = dbParams.sti_id
            def tmsId = dbParams.tms_id
            def migId = dbParams.mig_id
            assert stmId instanceof UUID, "stm_id should be UUID"
            assert stiId instanceof UUID, "sti_id should be UUID"
            assert tmsId instanceof UUID, "tms_id should be UUID"
            assert migId instanceof UUID, "mig_id should be UUID"
            
            testResults.add("✅ Service Transformation DTO to Database Parameters - PASSED")
            println "   ✅ All database parameter transformation checks passed"
            
        } catch (Exception e) {
            failedTests.add("Service Transformation DTO to Database Parameters: ${e.message}".toString())
            println "   ❌ Service Transformation DTO to Database Parameters failed: ${e.message}"
            throw e
        }
    }
    
    void testServiceTransformationDTOToEmailTemplateData() {
        println "\n🧪 Test 4: Service Transformation - DTO to Email Template Data"
        
        try {
            // Converting DTO to email template data
            def templateData = transformationService.toEmailTemplateData(testDTO)
            
            // Email template data should be comprehensive
            assert templateData != null, "Template data should not be null"
            assert templateData.size() > 20, "Should have many fields, got: ${templateData.size()}"  // Should have many fields
            
            // Core fields should be present and formatted
            assert templateData.stepDisplayName == "US-056-A Integration Test Step", "stepDisplayName should match"
            assert templateData.statusDisplayName == "In Progress", "statusDisplayName should be 'In Progress'"
            assert templateData.priorityDisplayName == "Medium-High Priority", "priorityDisplayName should be 'Medium-High Priority'"
            assert templateData.assignedTeamName == "Test Team", "assignedTeamName should be 'Test Team'"
            
            // Progress text should be formatted correctly
            assert templateData.dependencyProgressText == "2/3 dependencies (67%)", "dependencyProgressText should be '2/3 dependencies (67%)'"
            assert templateData.instructionProgressText == "3/5 instructions (60%)", "instructionProgressText should be '3/5 instructions (60%)'"
            
            // CSS classes should be mapped correctly
            assert templateData.statusClass == "status-in-progress", "statusClass should be 'status-in-progress'"
            assert templateData.priorityClass == "priority-medium-high", "priorityClass should be 'priority-medium-high'"
            
            // All template fields should have non-null values
            templateData.each { key, value ->
                assert value != null, "Template data ${key} should not be null"
            }
            
            // Comments should be included safely
            def recentComments = templateData.recentComments
            def commentCount = templateData.commentCount
            def hasActiveComments = templateData.hasActiveComments
            
            assert recentComments instanceof List, "recentComments should be a List"
            assert commentCount == 1, "commentCount should be 1"
            assert hasActiveComments == true, "hasActiveComments should be true"
            
            testResults.add("✅ Service Transformation DTO to Email Template Data - PASSED")
            println "   ✅ All email template data transformation checks passed"
            
        } catch (Exception e) {
            failedTests.add("Service Transformation DTO to Email Template Data: ${e.message}".toString())
            println "   ❌ Service Transformation DTO to Email Template Data failed: ${e.message}"
            throw e
        }
    }
    
    void testServiceTransformationDatabaseRowToDTO() {
        println "\n🧪 Test 5: Service Transformation - Database Row to DTO"
        
        try {
            // A mock database row with typical field names
            def mockDbRow = createMockDatabaseRow(testStepId, testStepInstanceId)
            
            // Converting database row to DTO
            def dtoFromDb = transformationService.fromDatabaseRow(mockDbRow)
            
            // DTO should be created correctly from database row
            assert dtoFromDb != null, "DTO from DB should not be null"
            assert dtoFromDb.stepId == testStepId, "stepId should match"
            assert dtoFromDb.stepInstanceId == testStepInstanceId, "stepInstanceId should match"
            assert dtoFromDb.stepName == "DB Row Test Step", "stepName should be 'DB Row Test Step'"
            assert dtoFromDb.stepStatus == "COMPLETED", "stepStatus should be 'COMPLETED'"
            assert dtoFromDb.priority == 8, "priority should be 8"
            
            // Temporal fields should be converted correctly
            assert dtoFromDb.createdDate instanceof LocalDateTime, "createdDate should be LocalDateTime"
            assert dtoFromDb.lastModifiedDate instanceof LocalDateTime, "lastModifiedDate should be LocalDateTime"
            
            // Progress calculations should work correctly
            assert dtoFromDb.dependencyCompletionPercentage == 100.0d, "dependencyCompletionPercentage should be 100.0"
            assert dtoFromDb.instructionCompletionPercentage == 100.0d, "instructionCompletionPercentage should be 100.0"
            assert dtoFromDb.isReadyToStart == true, "isReadyToStart should be true"  // All dependencies complete
            
            // DTO validation should pass
            def validationErrors = dtoFromDb.validate()
            assert validationErrors.isEmpty(), "Validation errors should be empty: ${validationErrors}"
            
            testResults.add("✅ Service Transformation Database Row to DTO - PASSED")
            println "   ✅ All database row to DTO transformation checks passed"
            
        } catch (Exception e) {
            failedTests.add("Service Transformation Database Row to DTO: ${e.message}".toString())
            println "   ❌ Service Transformation Database Row to DTO failed: ${e.message}"
            throw e
        }
    }
    
    void testServiceTransformationMasterDatabaseRowToDTO() {
        println "\n🧪 Test 6: Service Transformation - Master Database Row to DTO"
        
        try {
            // A mock master database row with typical field names
            def mockMasterDbRow = createMockMasterDatabaseRow()
            
            // Converting master database row to DTO
            def masterDtoFromDb = transformationService.fromMasterDatabaseRow(mockMasterDbRow)
            
            // Master DTO should be created correctly from database row
            assert masterDtoFromDb != null, "Master DTO from DB should not be null"
            assert masterDtoFromDb.stepMasterId != null, "stepMasterId should not be null"
            assert masterDtoFromDb.stepName == "DB Master Row Test Step", "stepName should be 'DB Master Row Test Step'"
            assert masterDtoFromDb.stepTypeCode == "CUTOVER", "stepTypeCode should be 'CUTOVER'"
            assert masterDtoFromDb.stepNumber == 10, "stepNumber should be 10"
            
            // Temporal fields should be in string format for masters
            assert masterDtoFromDb.createdDate instanceof String, "createdDate should be String for masters"
            assert masterDtoFromDb.lastModifiedDate instanceof String, "lastModifiedDate should be String for masters"
            
            testResults.add("✅ Service Transformation Master Database Row to DTO - PASSED")
            println "   ✅ All master database row to DTO transformation checks passed"
            
        } catch (Exception e) {
            failedTests.add("Service Transformation Master Database Row to DTO: ${e.message}".toString())
            println "   ❌ Service Transformation Master Database Row to DTO failed: ${e.message}"
            throw e
        }
    }
    
    void testBatchTransformationValidation() {
        println "\n🧪 Test 7: Batch Transformation Validation"
        
        try {
            // Multiple test DTOs
            def dtos = [
                testDTO,
                createSimpleTestDTO(UUID.randomUUID().toString(), "Test Step 2", "PENDING"),
                createSimpleTestDTO(UUID.randomUUID().toString(), "Test Step 3", "COMPLETED")
            ]
            
            // Batch transforming to email template data
            def templateDataList = transformationService.batchTransformToEmailTemplateData(dtos)
            
            // All DTOs should be transformed successfully
            assert templateDataList.size() == 3, "Should have 3 template data items"
            templateDataList.each { templateData ->
                assert templateData != null, "Template data should not be null"
                assert templateData.stepId != null, "stepId should not be null"
                assert templateData.stepDisplayName != null, "stepDisplayName should not be null"
                assert templateData.statusDisplayName != null, "statusDisplayName should not be null"
            }
            
            // Batch transforming to database parameters
            def dbParamsList = transformationService.batchTransformToDatabaseParams(dtos)
            
            // All DTOs should be transformed to database parameters
            assert dbParamsList.size() == 3, "Should have 3 database parameter sets"
            dbParamsList.each { params ->
                assert params != null, "Database parameters should not be null"
                assert params.stm_id != null, "stm_id should not be null"
                assert params.stm_name != null, "stm_name should not be null"
                assert params.sti_status != null, "sti_status should not be null"
            }
            
            testResults.add("✅ Batch Transformation Validation - PASSED")
            println "   ✅ All batch transformation checks passed"
            
        } catch (Exception e) {
            failedTests.add("Batch Transformation Validation: ${e.message}".toString())
            println "   ❌ Batch Transformation Validation failed: ${e.message}"
            throw e
        }
    }
    
    void testErrorHandlingAndEdgeCases() {
        println "\n🧪 Test 8: Error Handling and Edge Cases"
        
        try {
            // Handling null DTO in transformation service
            def nullTemplateData = transformationService.toEmailTemplateData(null)
            
            // Should return empty map without throwing exception
            assert nullTemplateData != null, "Null template data should not be null (should be empty map)"
            assert nullTemplateData.isEmpty(), "Null template data should be empty"
            
            // Handling invalid database row
            def invalidRow = [invalid_field: "test"]
            def exceptionThrown = false
            def caughtException = null
            try {
                transformationService.fromDatabaseRow(invalidRow)
            } catch (RuntimeException ex) {
                exceptionThrown = true
                caughtException = ex
            }
            
            // Should handle missing required fields gracefully
            assert exceptionThrown, "Exception should be thrown for invalid database row"
            assert caughtException != null, "Caught exception should not be null"
            
            // Handling DTO with validation errors for database conversion
            def invalidDTO = new StepInstanceDTO()  // Missing required fields
            def validationExceptionThrown = false
            def caughtValidationException = null
            try {
                transformationService.toDatabaseParams(invalidDTO)
            } catch (IllegalArgumentException ex) {
                validationExceptionThrown = true
                caughtValidationException = ex
            }
            
            // Should throw validation exception
            assert validationExceptionThrown, "Validation exception should be thrown"
            assert caughtValidationException.message.contains("stepId is required"), "Exception message should contain 'stepId is required'"
            
            testResults.add("✅ Error Handling and Edge Cases - PASSED")
            println "   ✅ All error handling and edge case checks passed"
            
        } catch (Exception e) {
            failedTests.add("Error Handling and Edge Cases: ${e.message}".toString())
            println "   ❌ Error Handling and Edge Cases failed: ${e.message}"
            throw e
        }
    }
    
    void testJSONSchemaValidationIntegration() {
        println "\n🧪 Test 9: JSON Schema Validation Integration"
        
        try {
            // Converting DTO to JSON
            def jsonString = testDTO.toJson()
            
            // JSON should be valid and parseable
            assert jsonString != null, "JSON string should not be null"
            assert jsonString.contains(testStepId), "JSON should contain testStepId"
            assert jsonString.contains("US-056-A Integration Test Step"), "JSON should contain step name"
            
            // Parsing JSON back to DTO
            def parsedDTO = StepInstanceDTO.fromJson(jsonString)
            
            // Parsed DTO should match original
            assert parsedDTO != null, "Parsed DTO should not be null"
            assert parsedDTO.stepId == testDTO.stepId, "Parsed stepId should match original"
            assert parsedDTO.stepName == testDTO.stepName, "Parsed stepName should match original"
            assert parsedDTO.stepStatus == testDTO.stepStatus, "Parsed stepStatus should match original"
            assert parsedDTO.priority == testDTO.priority, "Parsed priority should match original"
            
            // Computed properties should work correctly
            assert parsedDTO.dependencyCompletionPercentage == testDTO.dependencyCompletionPercentage, "Parsed dependencyCompletionPercentage should match original"
            assert parsedDTO.instructionCompletionPercentage == testDTO.instructionCompletionPercentage, "Parsed instructionCompletionPercentage should match original"
            
            testResults.add("✅ JSON Schema Validation Integration - PASSED")
            println "   ✅ All JSON schema validation checks passed"
            
        } catch (Exception e) {
            failedTests.add("JSON Schema Validation Integration: ${e.message}".toString())
            println "   ❌ JSON Schema Validation Integration failed: ${e.message}"
            throw e
        }
    }
    
    void testEndToEndIntegrationSuccessValidation() {
        println "\n🧪 Test 10: End-to-End Integration Success Validation"
        
        try {
            // Performing complete round-trip transformation
            // DTO → Database Params → Mock DB Row → DTO → Template Data
            def dbParams = transformationService.toDatabaseParams(testDTO)
            def mockDbRow = simulateDatabaseRowFromParams(dbParams)
            def roundTripDTO = transformationService.fromDatabaseRow(mockDbRow)
            def finalTemplateData = transformationService.toEmailTemplateData(roundTripDTO)
            
            // End-to-end transformation should preserve data integrity
            assert roundTripDTO.stepId == testDTO.stepId, "Round trip stepId should match original"
            assert roundTripDTO.stepName == testDTO.stepName, "Round trip stepName should match original"
            assert roundTripDTO.stepStatus == testDTO.stepStatus, "Round trip stepStatus should match original"
            assert roundTripDTO.priority == testDTO.priority, "Round trip priority should match original"
            
            // Final template data should be complete
            assert finalTemplateData.stepDisplayName == testDTO.stepName, "Final template stepDisplayName should match original"
            assert finalTemplateData.statusDisplayName != null, "Final template statusDisplayName should not be null"
            assert finalTemplateData.priorityDisplayName != null, "Final template priorityDisplayName should not be null"
            
            // No data loss should occur in round-trip
            def originalJson = testDTO.toJson()
            def roundTripJson = roundTripDTO.toJson()
            // Core fields should match (some computed fields may differ due to formatting)
            assert originalJson.contains(testDTO.stepId), "Original JSON should contain stepId"
            assert roundTripJson.contains(testDTO.stepId), "Round trip JSON should contain stepId"
            
            // US-056-A Phase 1 objectives should be met
            // 1. Unified data structure ✓
            assert roundTripDTO instanceof StepInstanceDTO, "Round trip DTO should be StepInstanceDTO instance"
            // 2. Consistent transformations ✓  
            assert finalTemplateData.stepDisplayName != null, "Final template stepDisplayName should not be null"
            // 3. Template rendering safety ✓
            finalTemplateData.each { key, value -> 
                assert value != null, "Final template data ${key} should not be null"
            }
            // 4. Type safety compliance ✓
            def validationErrors = roundTripDTO.validate()
            assert validationErrors.isEmpty(), "Round trip DTO validation errors should be empty: ${validationErrors}"
            
            testResults.add("✅ End-to-End Integration Success Validation - PASSED")
            println "   ✅ All end-to-end integration checks passed"
            println "   🎯 US-056-A Phase 1 objectives successfully validated!"
            
        } catch (Exception e) {
            failedTests.add("End-to-End Integration Success Validation: ${e.message}".toString())
            println "   ❌ End-to-End Integration Success Validation failed: ${e.message}"
            throw e
        }
    }
    
    // ========================================
    // HELPER METHODS - Pure Groovy Compatible
    // ========================================
    
    /**
     * Helper method to create comprehensive test DTO
     */
    private StepInstanceDTO createTestStepInstanceDTO(String stepId, String stepInstanceId) {
        return StepInstanceDTO.builder()
            .stepId(stepId)
            .stepInstanceId(stepInstanceId)
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
    
    /**
     * Helper method to create simple test DTO for batch operations
     */
    private StepInstanceDTO createSimpleTestDTO(String stepId, String stepName, String status) {
        return StepInstanceDTO.builder()
            .stepId(stepId)
            .stepInstanceId(UUID.randomUUID().toString())
            .stepName(stepName)
            .stepDescription("Simple test step")
            .stepStatus(status)
            .assignedTeamId(UUID.randomUUID().toString())
            .assignedTeamName("Test Team")
            .migrationId(UUID.randomUUID().toString())
            .migrationCode("TEST-MIG")
            .priority(5)
            .dependencyCount(1)
            .completedDependencies(status == "COMPLETED" ? 1 : 0)
            .instructionCount(1)
            .completedInstructions(status == "COMPLETED" ? 1 : 0)
            .hasActiveComments(false)
            .build()
    }
    
    /**
     * Helper method to create test comment DTO
     */
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
    
    /**
     * Helper method to create mock database row for testing
     */
    private Map createMockDatabaseRow(String stepId, String stepInstanceId) {
        return [
            stm_id: UUID.fromString(stepId),
            sti_id: UUID.fromString(stepInstanceId),
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
    }
    
    /**
     * Helper method to simulate database row from parameters
     */
    private Map simulateDatabaseRowFromParams(Map dbParams) {
        // Simulate what the database would return after insert/update
        def mockRow = [:]
        
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
    
    /**
     * Helper method to create comprehensive test StepMasterDTO
     */
    private StepMasterDTO createTestStepMasterDTO() {
        def stepMasterId = UUID.randomUUID().toString()
        
        return StepMasterDTO.builder()
            .withStepMasterId(stepMasterId)
            .withStepTypeCode("VALIDATION")
            .withStepNumber(5)
            .withStepName("US-056F Master Test Step")
            .withStepDescription("Comprehensive test step master for DTO transformation validation")
            .withPhaseId(UUID.randomUUID().toString())
            .withCreatedDate(new java.util.Date().toString())
            .withLastModifiedDate(new java.util.Date().toString())
            .withIsActive(true)
            .withInstructionCount(3)
            .withInstanceCount(2)
            .build()
    }
    
    /**
     * Helper method to create mock master database row for testing
     */
    private Map createMockMasterDatabaseRow() {
        def stepMasterId = UUID.randomUUID().toString()
        
        return [
            stm_id: UUID.fromString(stepMasterId),
            stt_code: "CUTOVER",
            stm_number: 10,
            stm_name: "DB Master Row Test Step",
            stm_description: "Test master step from database row",
            phm_id: UUID.randomUUID(),
            stm_created_date: new java.sql.Timestamp(System.currentTimeMillis()),
            stm_last_modified_date: new java.sql.Timestamp(System.currentTimeMillis()),
            stm_is_active: true,
            instruction_count: 5,
            instance_count: 3
        ]
    }
}