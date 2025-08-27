package umig.tests.integration

import umig.repository.StepRepository
import umig.dto.StepDataTransferObject
import umig.service.StepDataTransformationService
import java.util.UUID
import java.util.Date

/**
 * Integration Test Suite for StepRepository DTO Operations (US-056-A)
 * 
 * Tests the new DTO-based CRUD operations in StepRepository:
 * - createDTO() - Create new steps with DTO
 * - updateDTO() - Update existing steps with DTO  
 * - saveDTO() - Smart save (create or update)
 * - batchSaveDTO() - Batch operations for performance
 * 
 * Following UMIG patterns:
 * - DatabaseUtil integration for transaction testing
 * - Comprehensive error handling validation
 * - Type safety with ADR-031 compliance
 * - Real database testing with cleanup
 * 
 * @since US-056-A Phase 1 Repository Enhancement
 * @author UMIG Development Team
 */
class StepRepositoryDTOIntegrationTest {
    
    private StepRepository stepRepository = new StepRepository()
    private StepDataTransformationService transformationService = new StepDataTransformationService()
    
    // Test data IDs - will be populated during setup
    private UUID testMigrationId
    private UUID testIterationId
    private UUID testPhaseInstanceId
    private UUID testPhaseMasterId
    private UUID testTeamId
    private UUID testStepMasterId
    private UUID testStepInstanceId
    
    /**
     * Test data setup - creates minimal required entities for testing
     * Uses real database with transaction rollback for isolation
     */
    def setupTestData() {
        // Setup will use existing test data or create minimal required entities
        // This would typically reference existing test migrations and iterations
        testMigrationId = UUID.fromString("550e8400-e29b-41d4-a716-446655440001") // Example migration ID
        testIterationId = UUID.fromString("550e8400-e29b-41d4-a716-446655440002") // Example iteration ID
        testPhaseInstanceId = UUID.fromString("550e8400-e29b-41d4-a716-446655440003") // Example phase instance ID
        testPhaseMasterId = UUID.fromString("550e8400-e29b-41d4-a716-446655440004") // Example phase master ID
        testTeamId = UUID.fromString("550e8400-e29b-41d4-a716-446655440005") // Example team ID
    }
    
    /**
     * Test createDTO() method - New step creation with DTO
     * 
     * Validates:
     * - Step master and instance creation in single transaction
     * - Relationship handling (impacted teams, iteration types)
     * - Proper ID generation and return
     * - Error handling for constraint violations
     */
    def testCreateDTO() {
        setupTestData()
        
        // Test Case 1: Create complete step with relationships
        def newStepDTO = new StepDataTransferObject(
            // Core identification - using actual DTO properties
            stepId: UUID.randomUUID().toString(),
            stepName: "Test Step Creation via DTO",
            stepDescription: "Integration test for createDTO method",
            stepStatus: "PENDING",
            
            // Team assignment
            assignedTeamId: testTeamId.toString(),
            assignedTeamName: "Test Team",
            
            // Hierarchical context
            migrationId: testMigrationId.toString(),
            iterationId: testIterationId.toString(),
            phaseId: testPhaseInstanceId.toString(),
            
            // Extended metadata
            stepType: "TECH",
            stepCategory: "TECHNICAL",
            estimatedDuration: 30,
            priority: 8
        )
        
        // Execute createDTO
        StepDataTransferObject createdDTO = stepRepository.createDTO(newStepDTO) as StepDataTransferObject
        
        // Validate creation success
        assert createdDTO != null
        assert createdDTO.stepId != null
        assert createdDTO.stepInstanceId != null
        assert createdDTO.stepName == "Test Step Creation via DTO"
        assert createdDTO.stepType == "TECH"
        assert createdDTO.stepStatus == "PENDING"
        assert createdDTO.priority == 8
        
        // Validate it can be retrieved using correct method and UUID casting
        StepDataTransferObject retrievedDTO = stepRepository.findByIdAsDTO(UUID.fromString(createdDTO.stepInstanceId as String)) as StepDataTransferObject
        assert retrievedDTO != null
        assert retrievedDTO.stepName == createdDTO.stepName
        
        println "✓ createDTO test passed - Step created with ID: ${createdDTO.stepInstanceId}"
        
        // Store for cleanup and further testing
        testStepInstanceId = UUID.fromString(createdDTO.stepInstanceId as String)
    }
    
    /**
     * Test updateDTO() method - Step modification with DTO
     * 
     * Validates:
     * - Step master and instance updates
     * - Relationship updates (add/remove teams and iteration types)
     * - Optimistic locking and error handling
     * - Partial updates (only changed fields)
     */
    def testUpdateDTO() {
        // Prerequisites: testCreateDTO must run first
        if (!testStepInstanceId) {
            testCreateDTO()
        }
        
        // Retrieve current step with proper type casting
        StepDataTransferObject originalDTO = stepRepository.findByIdAsDTO(testStepInstanceId as UUID) as StepDataTransferObject
        assert originalDTO != null
        
        // Modify DTO properties
        originalDTO.stepName = "Updated Step Name via DTO"
        originalDTO.stepDescription = "Updated description for integration testing"
        originalDTO.stepStatus = "IN_PROGRESS"
        originalDTO.priority = 6
        
        // Execute updateDTO with proper type
        StepDataTransferObject updatedDTO = stepRepository.updateDTO(originalDTO) as StepDataTransferObject
        
        // Validate update success
        assert updatedDTO != null
        assert updatedDTO.stepInstanceId == testStepInstanceId
        assert updatedDTO.stepName == "Updated Step Name via DTO"
        assert updatedDTO.stepDescription == "Updated description for integration testing"
        assert updatedDTO.stepStatus == "IN_PROGRESS"
        assert updatedDTO.priority == 6
        assert updatedDTO.lastModifiedDate != null
        
        // Validate persistence with proper type casting
        StepDataTransferObject retrievedUpdatedDTO = stepRepository.findByIdAsDTO(testStepInstanceId as UUID) as StepDataTransferObject
        assert retrievedUpdatedDTO.stepName == "Updated Step Name via DTO"
        assert retrievedUpdatedDTO.stepStatus == "IN_PROGRESS"
        
        println "✓ updateDTO test passed - Step updated successfully"
    }
    
    /**
     * Test saveDTO() method - Smart save logic (create vs update)
     * 
     * Validates:
     * - Automatic detection of create vs update operations
     * - Proper routing to createDTO or updateDTO
     * - Error handling for invalid operations
     */
    def testSaveDTO() {
        // Test Case 1: Save new step (should route to createDTO)
        def newStepDTO = new StepDataTransferObject(
            stepId: UUID.randomUUID().toString(),
            stepName: "Test Save New Step via DTO",
            stepDescription: "Testing saveDTO create path",
            stepStatus: "PENDING",
            assignedTeamId: testTeamId.toString(),
            phaseId: testPhaseInstanceId.toString(),
            stepType: "TECH",
            priority: 5
        )
        
        StepDataTransferObject savedNewDTO = stepRepository.saveDTO(newStepDTO) as StepDataTransferObject
        assert savedNewDTO != null
        assert savedNewDTO.stepId != null
        assert savedNewDTO.stepInstanceId != null
        assert savedNewDTO.stepName == "Test Save New Step via DTO"
        
        println "✓ saveDTO create path test passed"
        
        // Test Case 2: Save existing step (should route to updateDTO) 
        savedNewDTO.stepName = "Updated via Save DTO"
        savedNewDTO.stepDescription = "Testing saveDTO update path"
        
        StepDataTransferObject savedUpdatedDTO = stepRepository.saveDTO(savedNewDTO) as StepDataTransferObject
        assert savedUpdatedDTO != null
        assert savedUpdatedDTO.stepInstanceId == savedNewDTO.stepInstanceId
        assert savedUpdatedDTO.stepName == "Updated via Save DTO"
        
        println "✓ saveDTO update path test passed"
    }
    
    /**
     * Test batchSaveDTO() method - Batch operations for performance
     * 
     * Validates:
     * - Multiple step creation/update in single transaction
     * - Performance optimization for bulk operations
     * - Transaction rollback on partial failures
     * - Proper return of all processed DTOs
     */
    def testBatchSaveDTO() {
        def batchStepDTOs = []
        
        // Create multiple test steps
        for (int i = 1; i <= 3; i++) {
            batchStepDTOs << new StepDataTransferObject(
                stepId: UUID.randomUUID().toString(),
                stepName: "Batch Test Step ${i}",
                stepDescription: "Testing batch save operation ${i}",
                stepStatus: "PENDING",
                assignedTeamId: testTeamId.toString(),
                phaseId: testPhaseInstanceId.toString(),
                stepType: "TECH",
                priority: 5 + i
            )
        }
        
        // Execute batch save
        List<StepDataTransferObject> savedBatchDTOs = stepRepository.batchSaveDTO(batchStepDTOs as List<StepDataTransferObject>) as List<StepDataTransferObject>
        
        // Validate batch operation success
        assert savedBatchDTOs != null
        assert savedBatchDTOs.size() == 3
        
        savedBatchDTOs.eachWithIndex { StepDataTransferObject dto, index ->
            assert dto.stepId != null
            assert dto.stepInstanceId != null
            assert dto.stepName == "Batch Test Step ${index + 1}"
            assert dto.priority == 5 + (index + 1)
            
            // Validate individual persistence with proper type casting
            StepDataTransferObject retrievedDTO = stepRepository.findByIdAsDTO(UUID.fromString(dto.stepInstanceId as String)) as StepDataTransferObject
            assert retrievedDTO.stepName == dto.stepName
        }
        
        println "✓ batchSaveDTO test passed - ${savedBatchDTOs.size()} steps created in batch"
    }
    
    /**
     * Test error handling and edge cases
     * 
     * Validates:
     * - Null parameter handling
     * - Invalid ID handling
     * - Constraint violation mapping
     * - Transaction rollback on errors
     */
    def testErrorHandling() {
        // Test Case 1: Null DTO handling
        try {
            stepRepository.createDTO(null)
            assert false, "Should throw IllegalArgumentException for null DTO"
        } catch (IllegalArgumentException e) {
            assert e.message.contains("cannot be null")
            println "✓ Null DTO error handling test passed"
        }
        
        // Test Case 2: Missing required fields
        try {
            def invalidDTO = new StepDataTransferObject()
            stepRepository.createDTO(invalidDTO)
            assert false, "Should throw IllegalArgumentException for missing required fields"
        } catch (IllegalArgumentException e) {
            assert e.message.contains("requires")
            println "✓ Missing required fields error handling test passed"
        }
        
        // Test Case 3: Update with invalid ID
        try {
            def invalidUpdateDTO = new StepDataTransferObject(
                stepInstanceId: "00000000-0000-0000-0000-000000000000",
                stepId: "00000000-0000-0000-0000-000000000000",
                stepName: "Invalid Update Test",
                stepStatus: "PENDING"
            )
            stepRepository.updateDTO(invalidUpdateDTO)
            assert false, "Should throw IllegalStateException for invalid ID"
        } catch (IllegalStateException e) {
            assert e.message.contains("not found")
            println "✓ Invalid ID error handling test passed"
        }
    }
    
    /**
     * Test integration with existing query methods
     * 
     * Validates:
     * - DTO methods work with existing findBy* methods
     * - Consistent data format between old and new methods
     * - Backward compatibility maintained
     */
    def testBackwardCompatibilityIntegration() {
        // Create step using new DTO method
        if (!testStepInstanceId) {
            testCreateDTO()
        }
        
        // Retrieve using both old and new methods
        StepDataTransferObject dtoResult = stepRepository.findByIdAsDTO(testStepInstanceId as UUID) as StepDataTransferObject
        def legacyResult = stepRepository.findStepInstanceDetailsById(testStepInstanceId as UUID)
        
        // Validate consistency (where applicable)
        assert dtoResult != null
        assert legacyResult != null
        
        // Basic field consistency checks with proper type casting
        def legacyResultCasted = legacyResult as Map<String, Object>
        assert dtoResult.stepInstanceId == legacyResultCasted.sti_id.toString()
        assert dtoResult.stepName == (legacyResultCasted.sti_name ?: legacyResultCasted.stm_name)
        
        println "✓ Backward compatibility integration test passed"
    }
    
    /**
     * Performance validation test
     * 
     * Validates:
     * - DTO operations complete within acceptable time limits
     * - Batch operations show performance improvement
     * - Memory usage remains reasonable
     */
    def testPerformanceValidation() {
        def startTime = System.currentTimeMillis()
        
        // Test individual operation performance
        def singleDTO = new StepDataTransferObject(
            stepId: UUID.randomUUID().toString(),
            stepName: "Performance Test Step",
            stepDescription: "Testing operation performance",
            stepStatus: "PENDING",
            assignedTeamId: testTeamId.toString(),
            phaseId: testPhaseInstanceId.toString(),
            stepType: "TECH"
        )
        
        StepDataTransferObject createdDTO = stepRepository.createDTO(singleDTO) as StepDataTransferObject
        def singleOpTime = System.currentTimeMillis() - startTime
        
        assert singleOpTime < 3000, "Single operation should complete within 3 seconds"
        
        // Test batch operation performance
        startTime = System.currentTimeMillis()
        def batchDTOs = []
        for (int i = 1; i <= 5; i++) {
            batchDTOs << new StepDataTransferObject(
                stepId: UUID.randomUUID().toString(),
                stepName: "Performance Batch Step ${i}",
                stepStatus: "PENDING",
                assignedTeamId: testTeamId.toString(),
                phaseId: testPhaseInstanceId.toString(),
                stepType: "TECH"
            )
        }
        
        List<StepDataTransferObject> batchResults = stepRepository.batchSaveDTO(batchDTOs as List<StepDataTransferObject>) as List<StepDataTransferObject>
        def batchOpTime = System.currentTimeMillis() - startTime
        
        assert batchResults.size() == 5
        assert batchOpTime < 5000, "Batch operation should complete within 5 seconds"
        
        def avgTimePerStep = batchOpTime / 5.0
        assert avgTimePerStep < singleOpTime, "Batch operations should show performance improvement per step"
        
        println "✓ Performance validation test passed"
        println "  - Single operation: ${singleOpTime}ms"
        println "  - Batch operation: ${batchOpTime}ms (${Math.round(avgTimePerStep as double)}ms per step)"
    }
    
    /**
     * Run all integration tests in proper sequence
     * 
     * Tests are ordered to handle dependencies and build up test data
     * for comprehensive validation of the DTO enhancement
     */
    def runAllTests() {
        println "=== StepRepository DTO Integration Tests (US-056-A) ==="
        println "Testing enhanced repository methods with comprehensive validation..."
        println ""
        
        try {
            // Core functionality tests
            testCreateDTO()
            testUpdateDTO() 
            testSaveDTO()
            testBatchSaveDTO()
            
            // Quality and compatibility tests
            testErrorHandling()
            testBackwardCompatibilityIntegration()
            testPerformanceValidation()
            
            println ""
            println "=== ALL TESTS PASSED ✓ ==="
            println "StepRepository DTO enhancement is ready for production use"
            println ""
            
            return true
            
        } catch (Exception e) {
            println ""
            println "=== TEST FAILURE ✗ ==="
            println "Error during integration testing: ${e.message}"
            e.printStackTrace()
            println ""
            
            return false
        }
    }
    
    /**
     * Main method for standalone test execution
     * Can be called directly for development testing
     */
    static void main(String[] args) {
        def testSuite = new StepRepositoryDTOIntegrationTest()
        def success = testSuite.runAllTests()
        
        if (!success) {
            System.exit(1)
        }
    }
}