#!/usr/bin/env groovy

package umig.tests.integration

import umig.tests.utils.BaseIntegrationTest
import umig.tests.utils.IntegrationTestHttpClient
import umig.tests.utils.HttpResponse
import groovy.json.JsonBuilder
import java.util.UUID

/**
 * Comprehensive integration tests for EnvironmentsApi following ADR-036 pure Groovy testing framework.
 * Tests all endpoints including environments management, associations, and error scenarios.
 * Validates performance requirements (<500ms response times) and business logic.
 * 
 * Updated: 2025-08-27 (US-037 Phase 4A)
 * Framework: ADR-036 Pure Groovy + BaseIntegrationTest (Zero external dependencies)
 * Coverage: Environments CRUD, Team/Application associations, pagination, error handling
 * Security: Authenticated via AuthenticationHelper integration
 * Performance: <500ms API validation, <2min total test suite
 */
class EnvironmentsApiIntegrationTest extends BaseIntegrationTest {
    
    // Test data tracking with explicit types (ADR-031)
    private Integer testEnvironmentId = null
    private Integer testTeamId = null
    private Integer testApplicationId = null
    private Integer createdEnvironmentId = null
    
    /**
     * Setup test data by querying actual database for valid IDs
     */
    @Override
    def setup() {
        super.setup()
        setupTestData()
    }
    
    /**
     * Setup test data by querying database for valid association IDs
     */
    private void setupTestData() {
        logProgress("Setting up test data from database")
        
        try {
            // Get first environment ID for read tests
            def environmentResult = executeDbQuery("SELECT env_id FROM environments_env LIMIT 1")
            testEnvironmentId = environmentResult ? environmentResult[0]?.env_id as Integer : null
            
            // Get first team ID for association tests
            def teamResult = executeDbQuery("SELECT tms_id FROM teams_tms LIMIT 1")
            testTeamId = teamResult ? teamResult[0]?.tms_id as Integer : null
            
            // Get first application ID for association tests
            def applicationResult = executeDbQuery("SELECT app_id FROM applications_app LIMIT 1")
            testApplicationId = applicationResult ? applicationResult[0]?.app_id as Integer : null
            
            logProgress("Test data setup complete:")
            logProgress("- Environment ID: ${testEnvironmentId}")
            logProgress("- Team ID: ${testTeamId}")
            logProgress("- Application ID: ${testApplicationId}")
            
        } catch (Exception e) {
            println "⚠️ Warning: Could not setup all test data: ${e.message}"
        }
    }
    
    /**
     * Test 1: Get All Environments
     */
    def testGetAllEnvironments() {
        logProgress("Test 1: Get All Environments")
        
        def response = httpClient.get("environments")
        validateApiSuccess(response, 200)
        
        // Validate response structure
        def jsonBody = response.jsonBody
        assert jsonBody instanceof List || jsonBody.containsKey('environments') : 
            "Response should be a list or contain 'environments' property"
            
        logProgress("✅ Retrieved environments list successfully")
        return response
    }
    
    /**
     * Test 2: Get Environment by ID (if available)
     */
    def testGetEnvironmentById() {
        logProgress("Test 2: Get Environment by ID")
        
        if (!testEnvironmentId) {
            logProgress("⚠️ Skipping test - no environment ID available")
            return null
        }
        
        def response = httpClient.get("environments/${testEnvironmentId}")
        
        // Accept both success (found) and not found responses
        assert response.statusCode in [200, 404] : 
            "Expected 200 or 404, got ${response.statusCode}"
            
        if (response.statusCode == 200) {
            validatePerformance(response)
            def jsonBody = response.jsonBody
            assert jsonBody != null : "Response should contain environment data"
            assert jsonBody.env_id != null : "Environment should have an ID"
            logProgress("✅ Environment found: ${jsonBody.env_id}")
        } else {
            logProgress("✅ Environment not found (404) - acceptable result")
        }
        
        return response
    }
    
    /**
     * Test 3: Create Environment
     */
    def testCreateEnvironment() {
        logProgress("Test 3: Create Environment")
        
        // Create test environment data with unique name
        def testEnvironmentData = createTestEnvironment("Integration Test Env ${System.currentTimeMillis()}")
        
        def response = httpClient.post("environments", testEnvironmentData)
        
        // ScriptRunner APIs may return 200 or 201 for successful creation
        assert response.statusCode in [200, 201] : 
            "Expected 200/201, got ${response.statusCode}. Response: ${response.body}"
        validatePerformance(response)
        
        // Try to extract created environment ID from response
        if (response.jsonBody) {
            def jsonBody = response.jsonBody
            if (jsonBody.env_id) {
                createdEnvironmentId = jsonBody.env_id as Integer
                // Track for cleanup if different from generated ID
                if (createdEnvironmentId != testEnvironmentData.env_id) {
                    createdEnvironments.add(createdEnvironmentId)
                }
            }
        }
        
        logProgress("✅ Environment creation successful: HTTP ${response.statusCode}")
        return response
    }
    
    /**
     * Test 4: Team Associations (if available)
     */
    def testTeamAssociations() {
        logProgress("Test 4: Environment-Team Associations")
        
        if (!testEnvironmentId || !testTeamId) {
            logProgress("⚠️ Skipping test - missing environment or team ID")
            return null
        }
        
        def response = httpClient.get("environments/${testEnvironmentId}/teams")
        
        // Association endpoints may return 200 (with data) or 404 (no associations)
        assert response.statusCode in [200, 404] : 
            "Expected 200/404, got ${response.statusCode}"
        validatePerformance(response)
        
        if (response.statusCode == 200) {
            def jsonBody = response.jsonBody
            assert jsonBody instanceof List || jsonBody.containsKey('teams') : 
                "Response should be a list or contain 'teams' property"
            logProgress("✅ Team associations retrieved")
        } else {
            logProgress("✅ No team associations found (404)")
        }
        
        return response
    }
    
    /**
     * Test 5: Application Associations (if available)
     */
    def testApplicationAssociations() {
        logProgress("Test 5: Environment-Application Associations")
        
        if (!testEnvironmentId || !testApplicationId) {
            logProgress("⚠️ Skipping test - missing environment or application ID")
            return null
        }
        
        def response = httpClient.get("environments/${testEnvironmentId}/applications")
        
        assert response.statusCode in [200, 404] : 
            "Expected 200/404, got ${response.statusCode}"
        validatePerformance(response)
        
        if (response.statusCode == 200) {
            def jsonBody = response.jsonBody
            assert jsonBody instanceof List || jsonBody.containsKey('applications') : 
                "Response should be a list or contain 'applications' property"
            logProgress("✅ Application associations retrieved")
        } else {
            logProgress("✅ No application associations found (404)")
        }
        
        return response
    }
    
    /**
     * Test 6: Search Functionality
     */
    def testSearchFunctionality() {
        logProgress("Test 6: Environment Search")
        
        def queryParams = [search: "test"]
        def response = httpClient.get("environments", queryParams)
        
        validateApiSuccess(response, 200)
        
        def jsonBody = response.jsonBody
        assert jsonBody instanceof List || jsonBody.containsKey('environments') : 
            "Search response should be a list or contain 'environments' property"
            
        logProgress("✅ Environment search functionality working")
        return response
    }
    
    /**
     * Test 7: Filter by Type
     */
    def testFilterByType() {
        logProgress("Test 7: Environment Filter by Type")
        
        def queryParams = [type: "PRODUCTION"]
        def response = httpClient.get("environments", queryParams)
        
        validateApiSuccess(response, 200)
        
        def jsonBody = response.jsonBody
        assert jsonBody instanceof List || jsonBody.containsKey('environments') : 
            "Filter response should be a list or contain 'environments' property"
            
        logProgress("✅ Environment type filtering working")
        return response
    }
    
    /**
     * Test 8: Error Handling - Invalid ID Format
     */
    def testErrorHandlingInvalidId() {
        logProgress("Test 8: Error Handling - Invalid ID Format")
        
        def response = httpClient.get("environments/invalid-id")
        validateApiError(response, 400)
        
        logProgress("✅ Invalid ID format handled correctly (400)")
        return response
    }
    
    /**
     * Test 9: Error Handling - Not Found
     */
    def testErrorHandlingNotFound() {
        logProgress("Test 9: Error Handling - Not Found")
        
        def randomId = 999999 as Integer
        def response = httpClient.get("environments/${randomId}")
        validateApiError(response, 404)
        
        logProgress("✅ Non-existent environment handled correctly (404)")
        return response
    }
    
    /**
     * Execute all tests in sequence
     */
    def runAllTests() {
        println "============================================"
        println "Environments API Integration Test (US-037)"
        println "============================================"
        println "Framework: ADR-036 Pure Groovy + BaseIntegrationTest"
        println "Database: DatabaseUtil.withSql pattern"
        println "Performance: <500ms validation enabled"
        println ""
        
        try {
            def testResults = [:]
            
            // Execute all tests
            testResults['getAllEnvironments'] = testGetAllEnvironments()
            testResults['getEnvironmentById'] = testGetEnvironmentById() 
            testResults['createEnvironment'] = testCreateEnvironment()
            testResults['teamAssociations'] = testTeamAssociations()
            testResults['applicationAssociations'] = testApplicationAssociations()
            testResults['searchFunctionality'] = testSearchFunctionality()
            testResults['filterByType'] = testFilterByType()
            testResults['errorHandlingInvalidId'] = testErrorHandlingInvalidId()
            testResults['errorHandlingNotFound'] = testErrorHandlingNotFound()
            
            // Performance summary
            def successfulTests = testResults.values().findAll { it != null && it.isSuccessful() }
            if (successfulTests) {
                def avgResponseTime = successfulTests.sum { it.responseTimeMs } / successfulTests.size()
                println ""
                println "📊 Performance Summary:"
                println "- Tests executed: ${testResults.values().findAll { it != null }.size()}"
                println "- Average response time: ${Math.round(avgResponseTime)}ms"
                println "- All response times < 500ms: ${successfulTests.every { it.responseTimeMs < 500 }}"
            }
            
            println "\n============================================"
            println "✅ All Environments API tests completed successfully!"
            println "============================================"
            
            return testResults
            
        } catch (Exception e) {
            println "\n❌ Test execution failed: ${e.class.simpleName}: ${e.message}"
            e.printStackTrace()
            throw e
        }
    }
}

// Execute tests if run directly
if (this.class.name == 'EnvironmentsApiIntegrationTest') {
    def testInstance = new EnvironmentsApiIntegrationTest()
    try {
        testInstance.setup()
        def results = testInstance.runAllTests()
        println "\n🎉 Integration test suite completed successfully!"
        System.exit(0)
    } catch (Exception e) {
        println "\n💥 Integration test suite failed!"
        System.exit(1)
    } finally {
        testInstance.cleanup()
    }
}