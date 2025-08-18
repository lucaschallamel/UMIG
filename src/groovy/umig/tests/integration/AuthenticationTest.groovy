package umig.tests.integration

import groovy.json.JsonSlurper

/**
 * Simple authentication test to verify credentials are working correctly.
 * This test validates that the AuthenticationHelper can properly load credentials
 * and authenticate with the UMIG REST APIs.
 * 
 * Created: 2025-08-18
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * Purpose: Validate authentication setup before running integration tests
 * Security: Environment-based credential management
 */
class AuthenticationTest {
    
    private static final String BASE_URL = "http://localhost:8090/rest/scriptrunner/latest/custom"
    private JsonSlurper jsonSlurper = new JsonSlurper()
    
    /**
     * Test basic authentication with a simple endpoint
     */
    def testBasicAuthentication() {
        println "\n=== Testing Basic Authentication ==="
        
        try {
            // Test with a simple GET endpoint that should work with proper auth
            def url = "${BASE_URL}/teams"
            def connection = new URL(url).openConnection() as HttpURLConnection
            connection.requestMethod = "GET"
            
            // Configure authentication using our helper
            AuthenticationHelper.configureAuthentication(connection)
            
            def responseCode = connection.responseCode
            
            println "  Response code: ${responseCode}"
            
            if (responseCode == 200) {
                println "  ✅ Authentication successful"
                def response = jsonSlurper.parse(connection.inputStream)
                println "  ✓ Retrieved ${response instanceof List ? response.size() : 1} team(s)"
                return true
            } else if (responseCode == 401 || responseCode == 403) {
                println "  ❌ Authentication failed: ${responseCode}"
                println "  Check credentials in .env file or environment variables"
                return false
            } else {
                println "  ⚠️  Unexpected response: ${responseCode}"
                return false
            }
            
        } catch (Exception e) {
            println "  ❌ Authentication test failed: ${AuthenticationHelper.sanitizeErrorMessage(e.message)}"
            return false
        }
    }
    
    /**
     * Test credential loading from various sources
     */
    def testCredentialLoading() {
        println "\n=== Testing Credential Loading ==="
        
        try {
            // Clear any cached credentials to force reload
            AuthenticationHelper.clearCache()
            
            // Test credential validation
            def credentialsValid = AuthenticationHelper.validateCredentials()
            
            if (credentialsValid) {
                println "  ✅ Credentials loaded successfully"
                def authHeader = AuthenticationHelper.getAuthHeader()
                if (authHeader && authHeader.length() > 0) {
                    println "  ✓ Authentication header generated (length: ${authHeader.length()})"
                    return true
                } else {
                    println "  ❌ Authentication header is empty"
                    return false
                }
            } else {
                println "  ❌ Failed to load credentials"
                println "  Please check:"
                println "    1. .env file exists in local-dev-setup/ directory"
                println "    2. POSTMAN_AUTH_USERNAME is set"
                println "    3. POSTMAN_AUTH_PASSWORD is set"
                println "    4. Or set environment variables directly"
                return false
            }
            
        } catch (Exception e) {
            println "  ❌ Credential loading failed: ${AuthenticationHelper.sanitizeErrorMessage(e.message)}"
            return false
        }
    }
    
    /**
     * Test multiple authenticated requests
     */
    def testMultipleAuthenticatedRequests() {
        println "\n=== Testing Multiple Authenticated Requests ==="
        
        def endpoints = [
            "/teams",
            "/environments", 
            "/applications"
        ]
        
        def successCount = 0
        
        endpoints.each { endpoint ->
            try {
                def url = "${BASE_URL}${endpoint}"
                def connection = new URL(url).openConnection() as HttpURLConnection
                connection.requestMethod = "GET"
                
                AuthenticationHelper.configureAuthentication(connection)
                
                def responseCode = connection.responseCode
                
                if (responseCode == 200) {
                    successCount++
                    println "  ✓ ${endpoint}: Success (${responseCode})"
                } else {
                    println "  ✗ ${endpoint}: Failed (${responseCode})"
                }
                
                connection.disconnect()
                
            } catch (Exception e) {
                println "  ✗ ${endpoint}: Exception - ${AuthenticationHelper.sanitizeErrorMessage(e.message)}"
            }
        }
        
        println "  Results: ${successCount}/${endpoints.size()} endpoints accessible"
        return successCount == endpoints.size()
    }
    
    /**
     * Execute all authentication tests
     */
    static void main(String[] args) {
        def testRunner = new AuthenticationTest()
        def results = []
        
        println """
╔════════════════════════════════════════════════════════════════╗
║  Authentication Test Suite                                    ║
║  Framework: ADR-036 Pure Groovy                               ║
║  Purpose: Validate authentication setup                       ║
╚════════════════════════════════════════════════════════════════╝
"""
        
        // Run tests
        results << testRunner.testCredentialLoading()
        results << testRunner.testBasicAuthentication()
        results << testRunner.testMultipleAuthenticatedRequests()
        
        // Summary
        def passed = results.count(true)
        def total = results.size()
        
        println """
╔════════════════════════════════════════════════════════════════╗
║  Authentication Test Results                                  ║
╚════════════════════════════════════════════════════════════════╝
  Total Tests: ${total}
  Passed: ${passed}
  Failed: ${total - passed}
  
  Status: ${passed == total ? '✅ All tests passed' : '❌ Some tests failed'}
"""
        
        if (passed == total) {
            println "  🎉 Authentication is properly configured!"
            println "  Integration tests should now work correctly."
        } else {
            println "  🔧 Authentication needs to be fixed before running integration tests."
            println "  Check the error messages above for troubleshooting guidance."
            System.exit(1)
        }
    }
}