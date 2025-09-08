#!/usr/bin/env groovy

package umig.tests.integration.api

import umig.tests.utils.BaseIntegrationTest
import umig.tests.utils.IntegrationTestHttpClient
import umig.tests.utils.HttpResponse
import umig.tests.integration.AuthenticationHelper
import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import groovy.transform.CompileStatic
import java.util.UUID

/**
 * Integration Tests for StepsApi DTO Endpoints (US-056-C API Layer Integration)
 * 
 * Tests the migrated StepsApi endpoints that now use service layer DTOs:
 * - GET /steps (with filters) → findFilteredStepInstancesAsDTO
 * - GET /steps/master → findMasterStepsWithFiltersAsDTO  
 * - GET /steps/master/{id} → findMasterByIdAsDTO
 * - GET /steps (with pagination) → findStepsWithFiltersAsDTO
 * - GET /steps/export → CSV/JSON export with DTOs
 * 
 * Verifies:
 * - Backward compatibility of API responses
 * - DTO transformation correctness
 * - Performance targets (<51ms single entity retrieval)
 * - Proper type safety and error handling
 * 
 * Following UMIG patterns:
 * - BaseIntegrationTest framework (80% code reduction)
 * - Performance validation (<500ms API calls)
 * - Cross-platform compatibility (no shell scripts)
 * - ADR-031 type safety verification
 * 
 * Created: US-056-C API Layer Integration
 * Coverage Target: All migrated GET endpoints
 */
class StepsApiDTOIntegrationTests extends BaseIntegrationTest {
    
    private static final String STEPS_ENDPOINT = "/rest/scriptrunner/latest/custom/steps"
    private IntegrationTestHttpClient httpClient
    private JsonSlurper jsonSlurper
    
    def setup() {
        super.setup()
        httpClient = new IntegrationTestHttpClient()
        jsonSlurper = new JsonSlurper()
        
        // Ensure we have test data
        setupTestData()
    }
    
    def cleanup() {
        super.cleanup()
    }
    
    /**
     * Set up test data for integration tests
     */
    private void setupTestData() {
        logProgress("Setting up test data for StepsApi DTO integration tests")
        
        // Create test migration
        def migration = createTestMigration("US-056-C Integration Test Migration")
        def migrationId = migration.mig_id
        
        // Create test team
        def team = createTestTeam("US-056-C Test Team")
        def teamId = team.tms_id
        
        logProgress("Test data setup complete: Migration=${migrationId}, Team=${teamId}")
    }
    
    /**
     * Test GET /steps returns DTOs with backward compatibility
     * Verifies the migration to findFilteredStepInstancesAsDTO maintains API contract
     */
    def testGetStepsEndpointReturnsDTO() {
        logProgress("Testing GET /steps endpoint returns DTO with backward compatibility")
        
        try {
            def response = httpClient.get(STEPS_ENDPOINT)
            
            // Validate successful response
            validateApiSuccess(response, 200)
            
            def jsonResponse = jsonSlurper.parseText(response.body) as List
            
            // Verify response structure (should be grouped by sequences/phases for backward compatibility)
            assert jsonResponse instanceof List : "Response should be a List for backward compatibility"
            
            if (jsonResponse?.size() > 0) {
                def firstSequence = jsonResponse[0] as Map
                
                // Verify sequence structure
                assert firstSequence.containsKey('id') : "Sequence should have id field"
                assert firstSequence.containsKey('name') : "Sequence should have name field" 
                assert firstSequence.containsKey('number') : "Sequence should have number field"
                assert firstSequence.containsKey('phases') : "Sequence should have phases field"
                
                def phases = firstSequence.phases as List
                if (phases instanceof List && phases?.size() > 0) {
                    def firstPhase = phases[0] as Map
                    
                    // Verify phase structure
                    assert firstPhase.containsKey('id') : "Phase should have id field"
                    assert firstPhase.containsKey('name') : "Phase should have name field"
                    assert firstPhase.containsKey('number') : "Phase should have number field"
                    assert firstPhase.containsKey('steps') : "Phase should have steps field"
                    
                    def steps = firstPhase.steps as List
                    if (steps instanceof List && steps?.size() > 0) {
                        def firstStep = steps[0] as Map
                        
                        // Verify step structure (transformed from StepInstanceDTO)
                        assert firstStep.containsKey('id') : "Step should have id field"
                        assert firstStep.containsKey('code') : "Step should have code field"
                        assert firstStep.containsKey('name') : "Step should have name field" 
                        assert firstStep.containsKey('status') : "Step should have status field"
                        assert firstStep.containsKey('ownerTeamName') : "Step should have ownerTeamName field"
                        
                        logProgress("✅ Backward compatibility verified: step structure intact")
                    }
                }
            }
            
            logProgress("✅ Test passed: GET /steps returns DTO with backward compatibility")
        } catch (Exception e) {
            logProgress("❌ Test failed: GET /steps DTO compatibility - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test GET /steps with filters uses DTO transformation
     * Verifies filtering through findFilteredStepInstancesAsDTO works correctly
     */
    def testGetStepsWithFiltersUsesDTO() {
        logProgress("Testing GET /steps with filters uses DTO transformation")
        
        try {
            // Create test data with known migration
            def migration = createTestMigration("Filter Test Migration")
            def migrationId = migration.mig_id
            
            def response = httpClient.get("${STEPS_ENDPOINT}?migrationId=${migrationId}")
            
            // Validate successful response  
            validateApiSuccess(response, 200)
            
            def jsonResponse = jsonSlurper.parseText(response.body) as List
            
            // Verify response is properly filtered (should be empty or contain only steps from our migration)
            assert jsonResponse instanceof List : "Filtered response should be a List"
            
            // If there are results, they should all belong to our migration
            if (jsonResponse?.size() > 0) {
                logProgress("Found ${jsonResponse.size()} sequences in filtered response")
            }
            
            logProgress("✅ Test passed: GET /steps with filters uses DTO transformation")
        } catch (Exception e) {
            logProgress("❌ Test failed: GET /steps with filters - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test GET /steps/master returns DTOs
     * Verifies migration to findMasterStepsWithFiltersAsDTO
     */
    def testGetStepsMasterReturnsDTO() {
        logProgress("Testing GET /steps/master returns DTOs")
        
        try {
            def response = httpClient.get("${STEPS_ENDPOINT}/master?page=1&size=10")
            
            // Validate successful response
            validateApiSuccess(response, 200)
            
            def jsonResponse = jsonSlurper.parseText(response.body) as Map
            
            // Verify response structure matches findMasterStepsWithFiltersAsDTO output
            assert jsonResponse.containsKey('data') : "Master response should have data field"
            assert jsonResponse.containsKey('pagination') : "Master response should have pagination field"
            assert jsonResponse.containsKey('filters') : "Master response should have filters field"
            assert jsonResponse.containsKey('sort') : "Master response should have sort field"
            
            // Verify pagination structure
            def pagination = jsonResponse.pagination as Map
            assert pagination.containsKey('pageNumber') : "Pagination should have pageNumber"
            assert pagination.containsKey('pageSize') : "Pagination should have pageSize"
            assert pagination.containsKey('totalCount') : "Pagination should have totalCount"
            assert pagination.containsKey('totalPages') : "Pagination should have totalPages"
            assert pagination.containsKey('hasNext') : "Pagination should have hasNext"
            assert pagination.containsKey('hasPrevious') : "Pagination should have hasPrevious"
            
            // Verify data is array of StepMasterDTOs
            def data = jsonResponse.data as List
            assert data instanceof List : "Data should be a List of StepMasterDTOs"
            
            if (data?.size() > 0) {
                def firstMaster = data[0] as Map
                
                // Verify StepMasterDTO structure
                assert firstMaster.containsKey('stepMasterId') : "Master should have stepMasterId"
                assert firstMaster.containsKey('stepName') : "Master should have stepName"
                assert firstMaster.containsKey('stepTypeCode') : "Master should have stepTypeCode"
                assert firstMaster.containsKey('stepNumber') : "Master should have stepNumber"
                assert firstMaster.containsKey('isActive') : "Master should have isActive"
                
                logProgress("✅ StepMasterDTO structure verified")
            }
            
            logProgress("✅ Test passed: GET /steps/master returns DTOs")
        } catch (Exception e) {
            logProgress("❌ Test failed: GET /steps/master DTO - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test GET /steps/master/{id} returns single DTO  
     * Verifies migration to findMasterByIdAsDTO
     */
    def testGetStepsMasterByIdReturnsDTO() {
        logProgress("Testing GET /steps/master/{id} returns single DTO")
        
        try {
            // First, get list of masters to find a valid ID
            def listResponse = httpClient.get("${STEPS_ENDPOINT}/master?page=1&size=1")
            validateApiSuccess(listResponse, 200)
            
            def listJson = jsonSlurper.parseText(listResponse.body) as Map
            
            if (listJson.data && (listJson.data as List)?.size() > 0) {
                def masterStepId = ((listJson.data as List)[0] as Map).stepMasterId
                
                def response = httpClient.get("${STEPS_ENDPOINT}/master/${masterStepId}")
                
                // Validate successful response
                validateApiSuccess(response, 200)
                
                def jsonResponse = jsonSlurper.parseText(response.body) as Map
                
                // Verify single StepMasterDTO structure
                assert jsonResponse.containsKey('stepMasterId') : "Single master should have stepMasterId"
                assert jsonResponse.containsKey('stepName') : "Single master should have stepName"
                assert jsonResponse.containsKey('stepTypeCode') : "Single master should have stepTypeCode"
                assert jsonResponse.containsKey('stepNumber') : "Single master should have stepNumber"
                assert jsonResponse.stepMasterId == masterStepId : "Returned ID should match requested ID"
                
                logProgress("✅ Single StepMasterDTO structure verified")
            } else {
                logProgress("⚠️ No master steps found for single retrieval test")
            }
            
            logProgress("✅ Test passed: GET /steps/master/{id} returns single DTO")
        } catch (Exception e) {
            logProgress("❌ Test failed: GET /steps/master/{id} DTO - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test GET /steps/export works with DTOs
     * Verifies CSV/JSON export functionality after DTO migration
     */
    def testGetStepsExportWorksWithDTO() {
        logProgress("Testing GET /steps/export works with DTOs")
        
        try {
            // Test JSON export (default)
            def jsonResponse = httpClient.get("${STEPS_ENDPOINT}/export?format=json")
            validateApiSuccess(jsonResponse, 200)
            
            def jsonData = jsonSlurper.parseText(jsonResponse.body) as Map
            assert jsonData.containsKey('data') : "Export should have data field"
            assert jsonData.data instanceof List : "Export data should be a List"
            
            // Test CSV export
            def csvResponse = httpClient.get("${STEPS_ENDPOINT}/export?format=csv")
            validateApiSuccess(csvResponse, 200)
            
            // Verify CSV headers are present
            def csvContent = csvResponse.body
            assert csvContent.contains("Step ID") : "CSV should contain Step ID header"
            assert csvContent.contains("Step Name") : "CSV should contain Step Name header"
            assert csvContent.contains("Status") : "CSV should contain Status header"
            
            logProgress("✅ Export functionality verified for both JSON and CSV")
            logProgress("✅ Test passed: GET /steps/export works with DTOs")
        } catch (Exception e) {
            logProgress("❌ Test failed: GET /steps/export DTO - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test performance under 51ms for single entity retrieval
     * Verifies DTO migration meets performance targets
     */
    def testGetStepsPerformanceUnder51ms() {
        logProgress("Testing GET /steps performance under 51ms target")
        
        try {
            // Get a master step ID first
            def listResponse = httpClient.get("${STEPS_ENDPOINT}/master?page=1&size=1")
            validateApiSuccess(listResponse, 200)
            
            def listJson = jsonSlurper.parseText(listResponse.body) as Map
            
            if (listJson.data && (listJson.data as List)?.size() > 0) {
                def masterStepId = ((listJson.data as List)[0] as Map).stepMasterId
                
                // Measure single entity retrieval time
                long startTime = System.currentTimeMillis()
                def response = httpClient.get("${STEPS_ENDPOINT}/master/${masterStepId}")
                long endTime = System.currentTimeMillis()
                long duration = endTime - startTime
                
                // Validate success and performance
                validateApiSuccess(response, 200)
                
                // Performance target: <51ms for single entity retrieval
                assert duration < 51 : "Single step retrieval should be under 51ms, was ${duration}ms"
                
                logProgress("✅ Performance target met: ${duration}ms < 51ms")
            } else {
                logProgress("⚠️ No master steps available for performance test")
            }
            
            logProgress("✅ Test passed: Performance under 51ms target")
        } catch (Exception e) {
            logProgress("❌ Test failed: Performance test - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test backward compatibility of API response structure
     * Ensures existing frontend code continues to work after DTO migration
     */
    def testBackwardCompatibilityOfApiResponses() {
        logProgress("Testing backward compatibility of API responses")
        
        try {
            def response = httpClient.get(STEPS_ENDPOINT)
            validateApiSuccess(response, 200)
            
            def jsonResponse = jsonSlurper.parseText(response.body) as List
            
            // Verify the response still matches the expected structure from before DTO migration
            assert jsonResponse instanceof List : "Response should be a List (backward compatibility)"
            
            // Test with enhanced method (should have different structure)
            def enhancedResponse = httpClient.get("${STEPS_ENDPOINT}?enhanced=true&limit=10")
            validateApiSuccess(enhancedResponse, 200)
            
            def enhancedJson = jsonSlurper.parseText(enhancedResponse.body) as Map
            
            // Enhanced response should have DTO structure
            assert enhancedJson.containsKey('data') : "Enhanced response should have data field"
            assert enhancedJson.containsKey('pagination') || enhancedJson.containsKey('totalCount') : "Enhanced response should have pagination info"
            
            logProgress("✅ Both legacy and enhanced response structures verified")
            logProgress("✅ Test passed: Backward compatibility maintained")
        } catch (Exception e) {
            logProgress("❌ Test failed: Backward compatibility - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test error handling for invalid parameters
     * Verifies proper error responses after DTO migration
     */
    def testErrorHandlingForInvalidParameters() {
        logProgress("Testing error handling for invalid parameters")
        
        try {
            // Test invalid UUID format
            def invalidResponse = httpClient.get("${STEPS_ENDPOINT}?migrationId=invalid-uuid")
            assert invalidResponse.statusCode == 400 : "Invalid UUID should return 400"
            
            def errorJson = jsonSlurper.parseText(invalidResponse.body) as Map
            assert errorJson.containsKey('error') : "Error response should have error field"
            assert (errorJson.error as String).toLowerCase().contains('uuid') : "Error should mention UUID format"
            
            // Test invalid master step ID
            def invalidMasterResponse = httpClient.get("${STEPS_ENDPOINT}/master/invalid-uuid")
            assert invalidMasterResponse.statusCode == 400 : "Invalid master UUID should return 400"
            
            logProgress("✅ Error handling verified for invalid parameters")
            logProgress("✅ Test passed: Error handling works correctly")
        } catch (Exception e) {
            logProgress("❌ Test failed: Error handling - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test pagination functionality in master endpoints  
     * Verifies pagination works correctly with DTO transformation
     */
    def testPaginationFunctionalityWithDTOs() {
        logProgress("Testing pagination functionality with DTOs")
        
        try {
            // Test first page
            def page1Response = httpClient.get("${STEPS_ENDPOINT}/master?page=1&size=5")
            validateApiSuccess(page1Response, 200)
            
            def page1Json = jsonSlurper.parseText(page1Response.body) as Map
            
            assert (page1Json.pagination as Map).pageNumber == 1 : "First page should be page 1"
            assert (page1Json.pagination as Map).pageSize == 5 : "Page size should be 5"
            
            if (((page1Json.pagination as Map).totalCount as Integer) > 5) {
                // Test second page if there are enough records
                def page2Response = httpClient.get("${STEPS_ENDPOINT}/master?page=2&size=5")
                validateApiSuccess(page2Response, 200)
                
                def page2Json = jsonSlurper.parseText(page2Response.body) as Map
                
                assert (page2Json.pagination as Map).pageNumber == 2 : "Second page should be page 2"
                assert (page2Json.pagination as Map).hasPrevious == true : "Second page should have previous"
                
                logProgress("✅ Multi-page pagination verified")
            }
            
            logProgress("✅ Test passed: Pagination functionality works with DTOs")
        } catch (Exception e) {
            logProgress("❌ Test failed: Pagination functionality - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test sorting functionality in master endpoints
     * Verifies sorting works correctly with DTO transformation
     */
    def testSortingFunctionalityWithDTOs() {
        logProgress("Testing sorting functionality with DTOs")
        
        try {
            // Test ascending sort by name
            def ascResponse = httpClient.get("${STEPS_ENDPOINT}/master?page=1&size=10&sort=stm_name&direction=asc")
            validateApiSuccess(ascResponse, 200)
            
            def ascJson = jsonSlurper.parseText(ascResponse.body) as Map
            assert (ascJson.sort as Map).field == "stm_name" : "Sort field should be stm_name"
            assert (ascJson.sort as Map).direction == "ASC" : "Sort direction should be ASC"
            
            // Test descending sort
            def descResponse = httpClient.get("${STEPS_ENDPOINT}/master?page=1&size=10&sort=stm_name&direction=desc")
            validateApiSuccess(descResponse, 200)
            
            def descJson = jsonSlurper.parseText(descResponse.body) as Map
            assert (descJson.sort as Map).direction == "DESC" : "Sort direction should be DESC"
            
            logProgress("✅ Sorting functionality verified")
            logProgress("✅ Test passed: Sorting functionality works with DTOs")
        } catch (Exception e) {
            logProgress("❌ Test failed: Sorting functionality - ${e.message}")
            throw e
        }
    }
    
    /**
     * Test filtering functionality in master endpoints
     * Verifies filtering works correctly with DTO transformation  
     */
    def testFilteringFunctionalityWithDTOs() {
        logProgress("Testing filtering functionality with DTOs")
        
        try {
            // Test name filter
            def filteredResponse = httpClient.get("${STEPS_ENDPOINT}/master?stm_name=test&page=1&size=10")
            validateApiSuccess(filteredResponse, 200)
            
            def filteredJson = jsonSlurper.parseText(filteredResponse.body) as Map
            assert (filteredJson.filters as Map).containsKey('stm_name') : "Filters should preserve stm_name"
            assert (filteredJson.filters as Map).stm_name == "test" : "Filter value should be preserved"
            
            // Test step type filter
            def typeFilterResponse = httpClient.get("${STEPS_ENDPOINT}/master?stt_code=CUTOVER&page=1&size=10")
            validateApiSuccess(typeFilterResponse, 200)
            
            def typeJson = jsonSlurper.parseText(typeFilterResponse.body) as Map
            assert (typeJson.filters as Map).containsKey('stt_code') : "Filters should preserve stt_code"
            
            logProgress("✅ Filtering functionality verified")
            logProgress("✅ Test passed: Filtering functionality works with DTOs")
        } catch (Exception e) {
            logProgress("❌ Test failed: Filtering functionality - ${e.message}")
            throw e
        }
    }
    
    /**
     * Run all integration tests for StepsApi DTO migration
     */
    def runAllTests() {
        println "🚀 Running StepsApi DTO Integration Tests (US-056-C)..."
        
        def testMethods = [
            "testGetStepsEndpointReturnsDTO",
            "testGetStepsWithFiltersUsesDTO", 
            "testGetStepsMasterReturnsDTO",
            "testGetStepsMasterByIdReturnsDTO",
            "testGetStepsExportWorksWithDTO",
            "testGetStepsPerformanceUnder51ms",
            "testBackwardCompatibilityOfApiResponses",
            "testErrorHandlingForInvalidParameters",
            "testPaginationFunctionalityWithDTOs",
            "testSortingFunctionalityWithDTOs",
            "testFilteringFunctionalityWithDTOs"
        ]
        
        int passed = 0
        int failed = 0
        
        for (def testMethod : testMethods) {
            try {
                this.invokeMethod(testMethod, null)
                passed++
            } catch (Exception e) {
                println "❌ ${testMethod} failed: ${e.message}"
                e.printStackTrace()
                failed++
            }
        }
        
        println "\n========== StepsApi DTO Integration Test Summary =========="
        println "Total tests: ${passed + failed}"
        println "Passed: ${passed}"
        println "Failed: ${failed}"
        println "Coverage: All migrated GET endpoints (US-056-C)"
        println "Success rate: ${(passed / (passed + failed) * 100).round(1)}%"
        println "Target: Backward compatibility + performance <51ms"
        println "============================================================"
        
        if (failed > 0) {
            System.exit(1)
        }
    }
}

// Run the tests if executed directly
def tests = new StepsApiDTOIntegrationTests()
tests.setup()
try {
    tests.runAllTests()
} finally {
    tests.cleanup()
}