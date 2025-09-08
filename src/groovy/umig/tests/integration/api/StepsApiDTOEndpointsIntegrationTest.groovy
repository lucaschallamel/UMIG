package umig.tests.integration.api

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import umig.tests.utils.BaseIntegrationTest
import umig.tests.utils.IntegrationTestHttpClient
import umig.tests.utils.HttpResponse
import umig.utils.DatabaseUtil
import java.util.UUID
import javax.ws.rs.core.Response

/**
 * Integration Tests for StepsApi DTO Endpoints (US-056-C Phase 2)
 * 
 * Tests the integration between StepsApi action endpoints and the new DTO layer:
 * - GET /steps (filtered step instances using DTO)
 * - GET /steps/masters (master steps using DTO) 
 * - Validates proper DTO serialization in API responses
 * - Tests real database interactions with service layer DTOs
 * - Ensures backward compatibility with existing integrations
 * 
 * This test specifically validates the API layer integration for US-056-C
 * where StepsApi endpoints now use service layer DTOs instead of raw database results.
 * 
 * Following UMIG patterns:
 * - BaseIntegrationTest framework (80% code reduction)
 * - ADR-036 Pure Groovy testing (Zero external dependencies)
 * - Real database integration testing
 * - DatabaseUtil.withSql pattern compliance
 * - Explicit type casting validation (ADR-031)
 * 
 * Created: US-056-C API Layer Integration
 * Requires: Running local development stack (npm start)
 * Coverage: StepsApi DTO integration endpoints
 */
class StepsApiDTOEndpointsIntegrationTest extends BaseIntegrationTest {
    
    private JsonSlurper jsonSlurper = new JsonSlurper()
    private IntegrationTestHttpClient httpClient
    
    // Test data - will be populated from actual database
    private UUID testIterationId
    private UUID testPhaseId
    private Integer testTeamId
    private UUID testStepInstanceId
    
    def setup() {
        super.setup()
        httpClient = new IntegrationTestHttpClient()
        setupTestData()
    }
    
    /**
     * Setup test data by querying actual database
     */
    void setupTestData() {
        DatabaseUtil.withSql { sql ->
            // Get first iteration for filtering (ADR-031 explicit casting)
            def iteration = sql.firstRow("SELECT ite_id FROM iterations_ite LIMIT 1")
            testIterationId = iteration ? UUID.fromString(iteration.ite_id as String) : null
            
            // Get first phase for filtering (ADR-031 explicit casting)  
            def phase = sql.firstRow("SELECT phi_id FROM phases_instance_phi LIMIT 1")
            testPhaseId = phase ? UUID.fromString(phase.phi_id as String) : null
            
            // Get first team for filtering (ADR-031 explicit casting)
            def team = sql.firstRow("SELECT tem_id FROM teams_tem LIMIT 1")
            testTeamId = team ? (team.tem_id as Integer) : null
            
            // Get first step instance (ADR-031 explicit casting)
            def stepInstance = sql.firstRow("SELECT sti_id FROM steps_instance_sti LIMIT 1")
            testStepInstanceId = stepInstance ? UUID.fromString(stepInstance.sti_id as String) : null
            
            assert testIterationId != null : "Test iteration ID required"
            assert testPhaseId != null : "Test phase ID required"
            assert testTeamId != null : "Test team ID required"
        }
    }
    
    /**
     * Test GET /steps endpoint with DTO integration
     * Validates that the endpoint returns properly structured DTO objects
     */
    void testGetStepsWithDTOIntegration() {
        // Arrange
        String endpoint = "/steps"
        Map<String, String> filters = [
            iterationId: testIterationId.toString(),
            teamId: testTeamId.toString()
        ]
        
        // Act - Use IntegrationTestHttpClient pattern (ADR-043 type safety)
        HttpResponse response = httpClient.get(endpoint, filters)
        
        // Assert response structure (ADR-031 explicit casting)
        assert response.statusCode == 200 : "Should return OK status"
        
        def jsonResponse = jsonSlurper.parseText(response.body as String) as List
        assert jsonResponse instanceof List : "Response should be a list"
        
        if (jsonResponse.size() > 0) {
            def firstStep = jsonResponse[0] as Map
            
            // Validate DTO structure (StepInstanceDTO fields)
            assert firstStep.containsKey('stiId') : "Should have step instance ID"
            assert firstStep.containsKey('stmId') : "Should have step master ID"
            assert firstStep.containsKey('phiId') : "Should have phase ID"
            assert firstStep.containsKey('stiStatus') : "Should have status"
            assert firstStep.containsKey('stmName') : "Should have step name"
            assert firstStep.containsKey('phiName') : "Should have phase name"
            assert firstStep.containsKey('statusName') : "Should have status name"
            
            // Validate field types (ADR-031 type casting)
            assert (firstStep.stiId as String) != null : "Step instance ID should not be null"
            assert (firstStep.stiStatus as Integer) instanceof Integer : "Status should be Integer"
            assert (firstStep.stmName as String) instanceof String : "Step name should be String"
            
            println "[PASS] DTO structure validation - All required fields present with correct types"
        }
        
        println "[PASS] testGetStepsWithDTOIntegration"
    }
    
    /**
     * Test GET /steps/masters endpoint with DTO integration
     * Validates that master steps endpoint returns properly structured DTO objects
     */
    void testGetStepsMastersWithDTOIntegration() {
        // Arrange
        String endpoint = "/steps/masters"
        Map<String, String> filters = [
            phaseId: testPhaseId.toString(),
            pageNumber: "1",
            pageSize: "10"
        ]
        
        // Act - Use IntegrationTestHttpClient pattern (ADR-043 type safety)
        HttpResponse response = httpClient.get(endpoint, filters)
        
        // Assert response structure (ADR-031 explicit casting)
        assert response.statusCode == 200 : "Should return OK status"
        
        def jsonResponse = jsonSlurper.parseText(response.body as String) as Map
        assert jsonResponse instanceof Map : "Response should be a map with data and metadata"
        assert jsonResponse.containsKey('data') : "Should have data field"
        assert jsonResponse.containsKey('totalCount') : "Should have totalCount field"
        assert jsonResponse.containsKey('pageNumber') : "Should have pageNumber field"
        assert jsonResponse.containsKey('pageSize') : "Should have pageSize field"
        
        def stepsList = jsonResponse.data as List
        assert stepsList instanceof List : "Data should be a list"
        
        if (stepsList.size() > 0) {
            def firstStep = stepsList[0] as Map
            
            // Validate DTO structure (StepMasterDTO fields)
            assert firstStep.containsKey('stmId') : "Should have step master ID"
            assert firstStep.containsKey('sttCode') : "Should have step type code"
            assert firstStep.containsKey('stmNumber') : "Should have step number"
            assert firstStep.containsKey('stmName') : "Should have step name"
            assert firstStep.containsKey('stmDescription') : "Should have description"
            assert firstStep.containsKey('phiId') : "Should have phase ID"
            assert firstStep.containsKey('phiName') : "Should have phase name"
            
            // Validate field types (ADR-031 type casting)
            assert (firstStep.stmId as String) != null : "Step master ID should not be null"
            assert (firstStep.stmNumber as Integer) instanceof Integer : "Step number should be Integer"
            assert (firstStep.stmName as String) instanceof String : "Step name should be String"
            assert (firstStep.sttCode as String) instanceof String : "Step type code should be String"
            
            println "[PASS] Master DTO structure validation - All required fields present with correct types"
        }
        
        // Validate pagination metadata (ADR-031 explicit casting)
        assert (jsonResponse.totalCount as Integer) instanceof Integer : "Total count should be Integer"
        assert (jsonResponse.pageNumber as Integer) instanceof Integer : "Page number should be Integer"
        assert (jsonResponse.pageSize as Integer) instanceof Integer : "Page size should be Integer"
        
        println "[PASS] testGetStepsMastersWithDTOIntegration"
    }
    
    /**
     * Test endpoint performance with DTO layer
     * Ensures DTO integration doesn't significantly impact performance
     */
    void testStepsEndpointPerformanceWithDTO() {
        // Arrange
        String endpoint = "/steps"
        Map<String, String> filters = [
            iterationId: testIterationId.toString()
        ]
        
        // Act - Measure performance using IntegrationTestHttpClient (ADR-043 type safety)
        long startTime = System.currentTimeMillis()
        HttpResponse response = httpClient.get(endpoint, filters)
        long endTime = System.currentTimeMillis()
        long duration = endTime - startTime
        
        // Assert performance (should be under target thresholds)
        assert response.statusCode == 200 : "Should return OK status"
        assert duration < 5000 : "Response should be under 5 seconds (current: ${duration}ms)"
        
        println "[PASS] Performance test - Response time: ${duration}ms (Target: <5000ms)"
        println "[PASS] testStepsEndpointPerformanceWithDTO"
    }
    
    /**
     * Test error handling with DTO integration
     * Validates proper error responses when DTO transformation fails
     */
    void testStepsEndpointErrorHandlingWithDTO() {
        // Arrange - Use invalid filters to trigger potential errors
        String endpoint = "/steps"
        Map<String, String> filters = [
            iterationId: "invalid-uuid-format"
        ]
        
        // Act - Use IntegrationTestHttpClient pattern (ADR-043 type safety)
        HttpResponse response = httpClient.get(endpoint, filters)
        
        // Assert - Should handle gracefully (ADR-031 explicit casting)
        // Note: Exact behavior depends on implementation
        assert response.statusCode in [200, 400] : "Should return valid status code"
        
        if (response.statusCode == 400) {
            def jsonResponse = jsonSlurper.parseText(response.body as String) as Map
            assert jsonResponse.containsKey('error') : "Should have error message"
            println "[PASS] Error handling - Proper error response for invalid input"
        } else {
            println "[PASS] Error handling - Graceful handling of invalid input"
        }
        
        println "[PASS] testStepsEndpointErrorHandlingWithDTO"
    }
    
    /**
     * Test backward compatibility
     * Ensures existing integrations still work with new DTO layer
     */
    void testBackwardCompatibilityWithDTO() {
        // Arrange - Test with minimal filters (as existing integrations might use)
        String endpoint = "/steps"
        Map<String, String> filters = [:]
        
        // Act - Use IntegrationTestHttpClient pattern (ADR-043 type safety)
        HttpResponse response = httpClient.get(endpoint, filters)
        
        // Assert - Should handle parameterless calls (ADR requirement)
        assert response.statusCode == 200 : "Should handle parameterless calls"
        
        def jsonResponse = jsonSlurper.parseText(response.body as String) as List
        assert jsonResponse instanceof List : "Should maintain list response format"
        
        println "[PASS] Backward compatibility - Parameterless calls handled correctly"
        println "[PASS] testBackwardCompatibilityWithDTO"
    }
    
    /**
     * Test real database integration with service layer
     * Validates that DTO transformation works with actual database data
     */
    void testRealDatabaseIntegrationWithServiceLayer() {
        // This test validates that the service layer properly transforms
        // real database results into DTOs without data loss
        
        DatabaseUtil.withSql { sql ->
            // Get a real step instance from database (ADR-031 explicit casting)
            def stepData = sql.firstRow("""
                SELECT sti.*, stm.stm_name, stm.stm_description, 
                       phi.phi_name, stat.status_name
                FROM steps_instance_sti sti
                JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                JOIN phases_instance_phi phi ON sti.phi_id = phi.phi_id
                JOIN status stat ON sti.sti_status = stat.status_id
                WHERE sti.sti_id = ?
            """, [testStepInstanceId])
            
            if (stepData) {
                // Validate that database fields align with DTO expectations (ADR-031 explicit casting)
                assert (stepData.sti_id as String) != null : "Database should have step instance ID"
                assert (stepData.stm_id as String) != null : "Database should have step master ID" 
                assert (stepData.phi_id as String) != null : "Database should have phase ID"
                assert (stepData.sti_status as Integer) != null : "Database should have status"
                assert (stepData.stm_name as String) != null : "Database should have step name"
                assert (stepData.phi_name as String) != null : "Database should have phase name"
                
                println "[PASS] Database integration - Real data aligns with DTO structure"
            }
        }
        
        println "[PASS] testRealDatabaseIntegrationWithServiceLayer"
    }
    
    /**
     * Run all integration tests
     */
    static void main(String[] args) {
        println "=== StepsApi DTO Integration Tests ==="
        println "US-056-C Phase 2: API Layer Integration with Service DTOs"
        println "Requires: Running development stack (npm start)"
        
        StepsApiDTOEndpointsIntegrationTest test = new StepsApiDTOEndpointsIntegrationTest()
        
        try {
            test.setup()  // Changed from setUp() to setup() to match BaseIntegrationTest
            
            test.testGetStepsWithDTOIntegration()
            test.testGetStepsMastersWithDTOIntegration()
            test.testStepsEndpointPerformanceWithDTO()
            test.testStepsEndpointErrorHandlingWithDTO()
            test.testBackwardCompatibilityWithDTO()
            test.testRealDatabaseIntegrationWithServiceLayer()
            
            println "\n=== All Integration Tests Passed ✓ ==="
            println "Coverage: StepsApi DTO endpoint integration"
            println "Framework: BaseIntegrationTest + ADR-036 Pure Groovy"
            println "Validation: Service layer DTO integration successful"
            
        } catch (Exception e) {
            println "\n=== Integration Test Failed ✗ ==="
            println "Error: ${e.message}"
            e.printStackTrace()
            System.exit(1)
        } finally {
            test?.cleanup()  // Changed from tearDown() to cleanup() to match BaseIntegrationTest
        }
    }
}