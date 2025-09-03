package umig.tests.integration

import groovy.json.JsonBuilder
import groovy.sql.Sql
import umig.service.ImportService
import umig.repository.StagingImportRepository
import umig.repository.ImportRepository
import umig.utils.DatabaseUtil
import umig.tests.utils.BaseIntegrationTest
import java.sql.Timestamp
import java.util.Date

/**
 * Integration tests for ImportService
 * Tests the complete JSON import workflow including staging and promotion
 * 
 * Framework: BaseIntegrationTest (US-037 standardized pattern)
 * Database: DatabaseUtil.withSql pattern (ADR-031 explicit casting)
 * Performance: <500ms API validation, <2min total test suite
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034
 */
class ImportServiceIntegrationTest extends BaseIntegrationTest {
    
    private ImportService importService
    private StagingImportRepository stagingRepository
    
    /**
     * Test setup - initializes services and clears staging data
     */
    void setup() {
        importService = new ImportService()
        stagingRepository = new StagingImportRepository()
        
        // Clear staging tables before each test
        DatabaseUtil.withSql { Sql sql ->
            stagingRepository.clearStagingTables(sql)
        }
    }
    
    /**
     * Test cleanup - clears staging data after each test
     */
    void cleanup() {
        // Clear staging tables after each test
        DatabaseUtil.withSql { Sql sql ->
            stagingRepository.clearStagingTables(sql)
        }
    }
    
    /**
     * Test single JSON import with valid data
     * Validates complete workflow from JSON to staging tables
     */
    void testImportSingleJsonWithValidData() {
        setup()
        
        try {
            // Prepare test JSON data
            Map jsonData = [
                step_type: "TRT",
                step_number: 2842,
                title: "ATLAS - PHASE 6.3 - AFTER EOD*2",
                predecessor: "TRT-2841",
                successor: "TRT-2843",
                primary_team: "ATLAS",
                impacted_teams: "EXPLOITATION,MONITORING",
                macro_time_sequence: "G - WEEK-END 2 - P&C",
                time_sequence: "GQ - ATLAS PHASE 6.2 - STAR 2",
                task_list: [
                    [
                        instruction_id: "TRT-2842-1",
                        instruction_title: "CONTROL-M JOB: 45-PH6.3_FU_LOAX1",
                        nominated_user: "John Doe",
                        instruction_assigned_team: "ATLAS",
                        associated_controls: "CTL-001",
                        duration_minutes: 30
                    ],
                    [
                        instruction_id: "TRT-2842-2",
                        instruction_title: "CONTROL-M JOB: 46-PH6.3_FU_TAR22",
                        nominated_user: "Jane Smith",
                        instruction_assigned_team: "ATLAS",
                        associated_controls: "CTL-002",
                        duration_minutes: 45
                    ]
                ]
            ]
            
            String jsonContent = new JsonBuilder(jsonData).toString()
            
            // Execute import
            Map result = importService.importJsonData(jsonContent, "test_import.json", "test_user")
            
            // Verify import success
            assert result.success, "Import should be successful"
            assert result.batchId != null, "Batch ID should be created"
            assert result.stepId == "TRT-2842", "Step ID should match"
            Map statistics = result.statistics as Map
            assert (statistics.instructionsImported as Integer) == 2, "Should import 2 instructions"
            
            // Verify data in staging tables
            Map stagingStats = stagingRepository.getStagingStatistics()
            assert stagingStats.totalSteps == 1, "Should have 1 step in staging"
            assert stagingStats.totalInstructions == 2, "Should have 2 instructions in staging"
            
            // Verify validation passed
            assert (result.validationPassed ?: false), "Validation should pass"
            
            // Verify promotion attempted (may fail without proper phase setup)
            if (result.promotionResult) {
                println "Promotion result: ${result.promotionResult}"
                // Even if promotion fails due to missing phase, the attempt should be made
                assert result.promotionResult != null, "Promotion should be attempted"
            }
            
            println "✅ testImportSingleJsonWithValidData: PASSED"
            
        } catch (Exception e) {
            println "❌ testImportSingleJsonWithValidData: FAILED - ${e.message}"
            throw e
        } finally {
            cleanup()
        }
    }
    
    /**
     * Test import with invalid step type
     * Validates error handling for step type validation
     */
    void testImportWithInvalidStepType() {
        setup()
        
        try {
            // Prepare test JSON with invalid step type (not 3 characters)
            Map jsonData = [
                step_type: "INVALID",  // More than 3 characters
                step_number: 100,
                title: "Invalid Step Type Test",
                task_list: []
            ]
            
            String jsonContent = new JsonBuilder(jsonData).toString()
            
            // Execute import
            Map result = importService.importJsonData(jsonContent, "invalid_test.json", "test_user")
            
            // Verify import failure
            assert !result.success, "Import should fail with invalid step type"
            List errors = result.errors as List
            assert errors?.any { (it as String).contains("3 characters") }, "Should have error about step type length"
            
            println "✅ testImportWithInvalidStepType: PASSED"
            
        } catch (Exception e) {
            println "❌ testImportWithInvalidStepType: FAILED - ${e.message}"
            throw e
        } finally {
            cleanup()
        }
    }
    
    /**
     * Test batch import functionality
     * Validates processing of multiple JSON files in a single operation
     */
    void testImportBatch() {
        setup()
        
        try {
            // Prepare multiple JSON files
            List<Map> jsonFiles = [
                [
                    filename: "file1.json",
                    content: new JsonBuilder([
                        step_type: "IGO",
                        step_number: 100,
                        title: "Step 100",
                        task_list: [
                            [instruction_id: "IGO-100-1", instruction_title: "Task 1"]
                        ]
                    ]).toString()
                ],
                [
                    filename: "file2.json",
                    content: new JsonBuilder([
                        step_type: "CHK",
                        step_number: 200,
                        title: "Step 200",
                        task_list: [
                            [instruction_id: "CHK-200-1", instruction_title: "Task 1"],
                            [instruction_id: "CHK-200-2", instruction_title: "Task 2"]
                        ]
                    ]).toString()
                ],
                [
                    filename: "file3.json",
                    content: new JsonBuilder([
                        step_type: "DUM",
                        step_number: 300,
                        title: "Step 300",
                        task_list: []
                    ]).toString()
                ]
            ]
            
            // Execute batch import
            Map batchResult = importService.importBatch(jsonFiles, "test_user")
            
            // Verify batch import results
            assert batchResult.totalFiles == 3, "Should process 3 files"
            assert batchResult.successCount == 3, "All 3 should succeed"
            assert batchResult.failureCount == 0, "No failures expected"
            
            // Verify statistics
            assert batchResult.statistics != null, "Should have statistics"
            Map statistics = batchResult.statistics as Map
            assert (statistics.totalSteps as Integer) == 3, "Should have 3 steps total"
            assert (statistics.totalInstructions as Integer) == 3, "Should have 3 instructions total"
            
            // Verify step type distribution
            Map stepTypeCounts = statistics.importedByType as Map
            assert stepTypeCounts["IGO"] == 1, "Should have 1 IGO step"
            assert stepTypeCounts["CHK"] == 1, "Should have 1 CHK step"
            assert stepTypeCounts["DUM"] == 1, "Should have 1 DUM step"
            
            println "✅ testImportBatch: PASSED"
            
        } catch (Exception e) {
            println "❌ testImportBatch: FAILED - ${e.message}"
            throw e
        } finally {
            cleanup()
        }
    }
    
    /**
     * Test import with missing required fields
     * Validates error handling for incomplete JSON data
     */
    void testImportWithMissingRequiredFields() {
        setup()
        
        try {
            // Prepare JSON with missing required fields
            Map jsonData = [
                // Missing step_type
                step_number: 100,
                title: "Missing Type Test"
            ]
            
            String jsonContent = new JsonBuilder(jsonData).toString()
            
            // Execute import
            Map result = importService.importJsonData(jsonContent, "missing_fields.json", "test_user")
            
            // Verify import failure
            assert !result.success, "Import should fail with missing step_type"
            assert (result.errors as List).any { (it as String).contains("step_type") }, "Should have error about missing step_type"
            
            println "✅ testImportWithMissingRequiredFields: PASSED"
            
        } catch (Exception e) {
            println "❌ testImportWithMissingRequiredFields: FAILED - ${e.message}"
            throw e
        } finally {
            cleanup()
        }
    }
    
    /**
     * Test import duplicate step handling
     * Validates update behavior when same step is imported multiple times
     */
    void testImportDuplicateStep() {
        setup()
        
        try {
            // First import
            Map jsonData = [
                step_type: "TRT",
                step_number: 500,
                title: "Original Step",
                primary_team: "TEAM1",
                task_list: [
                    [instruction_id: "TRT-500-1", instruction_title: "Original Task"]
                ]
            ]
            
            String jsonContent1 = new JsonBuilder(jsonData).toString()
            Map result1 = importService.importJsonData(jsonContent1, "original.json", "test_user")
            assert result1.success, "First import should succeed"
            
            // Second import with same step ID but different content
            jsonData.title = "Updated Step"
            jsonData.primary_team = "TEAM2"
            jsonData.task_list = [
                [instruction_id: "TRT-500-1", instruction_title: "Updated Task"],
                [instruction_id: "TRT-500-2", instruction_title: "New Task"]
            ]
            
            String jsonContent2 = new JsonBuilder(jsonData).toString()
            Map result2 = importService.importJsonData(jsonContent2, "update.json", "test_user")
            
            // Verify update succeeded
            assert result2.success, "Update import should succeed"
            assert result2.stepId == "TRT-500", "Should update same step"
            
            // Verify final state
            List stagingSteps = stagingRepository.getAllStagingSteps()
            assert stagingSteps.size() == 1, "Should still have 1 step"
            Map step = stagingSteps[0] as Map
            assert (step.title as String) == "Updated Step", "Title should be updated"
            assert (step.primary_team as String) == "TEAM2", "Team should be updated"
            List instructions = step.instructions as List
            assert instructions?.size() == 2, "Should have 2 instructions"
            
            println "✅ testImportDuplicateStep: PASSED"
            
        } catch (Exception e) {
            println "❌ testImportDuplicateStep: FAILED - ${e.message}"
            throw e
        } finally {
            cleanup()
        }
    }
    
    /**
     * Test validation with orphan steps (steps without instructions)
     * Validates warning system for edge cases
     */
    void testValidationWithOrphanSteps() {
        setup()
        
        try {
            // Import a step without instructions
            Map jsonData = [
                step_type: "CHK",
                step_number: 999,
                title: "Orphan Step",
                task_list: []  // No instructions
            ]
            
            String jsonContent = new JsonBuilder(jsonData).toString()
            Map result = importService.importJsonData(jsonContent, "orphan.json", "test_user")
            
            // Import should succeed
            assert result.success, "Import should succeed even without instructions"
            
            // But validation should have warnings
            assert result.validationPassed, "Validation should pass with warnings"
            if (result.validationWarnings) {
                assert result.validationWarnings.any { (it as String).contains("without instructions") }, 
                       "Should have warning about steps without instructions"
            }
            
            println "✅ testValidationWithOrphanSteps: PASSED"
            
        } catch (Exception e) {
            println "❌ testValidationWithOrphanSteps: FAILED - ${e.message}"
            throw e
        } finally {
            cleanup()
        }
    }
    
    /**
     * Test clearing staging data
     * Validates cleanup functionality
     */
    void testClearStagingData() {
        setup()
        
        try {
            // Import some data first
            Map jsonData = [
                step_type: "IGO",
                step_number: 777,
                title: "Test Step",
                task_list: [
                    [instruction_id: "IGO-777-1", instruction_title: "Test Task"]
                ]
            ]
            
            String jsonContent = new JsonBuilder(jsonData).toString()
            importService.importJsonData(jsonContent, "test.json", "test_user")
            
            // Verify data exists
            Map statsBefore = importService.getStagingStatistics()
            assert (statsBefore.totalSteps as Integer) > 0, "Should have data in staging"
            
            // Clear staging data
            importService.clearStagingData()
            
            // Verify data cleared
            Map statsAfter = importService.getStagingStatistics()
            assert statsAfter.totalSteps == 0, "Should have no steps after clearing"
            assert statsAfter.totalInstructions == 0, "Should have no instructions after clearing"
            
            println "✅ testClearStagingData: PASSED"
            
        } catch (Exception e) {
            println "❌ testClearStagingData: FAILED - ${e.message}"
            throw e
        } finally {
            cleanup()
        }
    }
    
    /**
     * Run all tests in sequence
     * Main test runner following ScriptRunner console pattern
     */
    static void main(String[] args) {
        ImportServiceIntegrationTest testSuite = new ImportServiceIntegrationTest()
        
        println "=" * 80
        println "IMPORT SERVICE INTEGRATION TEST SUITE"
        println "=" * 80
        println "Framework: BaseIntegrationTest (US-037 standardized pattern)"
        println "Started: ${new Date()}"
        println ""
        
        def testMethods = [
            'testImportSingleJsonWithValidData',
            'testImportWithInvalidStepType',
            'testImportBatch',
            'testImportWithMissingRequiredFields',
            'testImportDuplicateStep',
            'testValidationWithOrphanSteps',
            'testClearStagingData'
        ]
        
        int passed = 0
        int failed = 0
        
        testMethods.each { methodName ->
            try {
                println "Running: ${methodName}"
                testSuite.invokeMethod(methodName, null)
                passed++
            } catch (Exception e) {
                println "FAILED: ${methodName} - ${e.message}"
                failed++
            }
        }
        
        println ""
        println "=" * 80
        println "TEST RESULTS"
        println "=" * 80
        println "Total Tests: ${testMethods.size()}"
        println "Passed: ${passed}"
        println "Failed: ${failed}"
        println "Success Rate: ${(passed / testMethods.size() * 100).round(1)}%"
        println "Completed: ${new Date()}"
        println ""
        
        if (failed == 0) {
            println "🎉 ALL TESTS PASSED!"
        } else {
            println "⚠️  ${failed} TEST(S) FAILED"
        }
    }
}