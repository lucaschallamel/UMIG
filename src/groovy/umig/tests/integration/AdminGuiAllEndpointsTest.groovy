package umig.tests.integration

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import groovy.sql.Sql

/**
 * Integration test for all Admin GUI API endpoints
 * US-031: Admin GUI Complete Integration
 * 
 * Tests all 11 entity endpoints to ensure they are properly integrated
 * and returning valid responses.
 * 
 * @author Claude (US-031 Implementation)
 * @date August 2025
 */
class AdminGuiAllEndpointsTest {
    
    /**
     * Load environment variables from .env file
     */
    static def loadEnv() {
        def props = new Properties()
        def envFile = new File('local-dev-setup/.env')
        if (!envFile.exists()) {
            envFile = new File('.env')
        }
        if (!envFile.exists()) {
            envFile = new File('../local-dev-setup/.env')
        }
        if (envFile.exists()) {
            envFile.withInputStream { props.load(it) }
        }
        return props
    }
    
    // Configuration from .env file
    private static final ENV = loadEnv()
    
    // Test configuration
    static final String BASE_URL = ENV.getProperty('CONFLUENCE_BASE_URL', 'http://localhost:8090')
    static final String API_BASE = "${BASE_URL}/rest/scriptrunner/latest/custom"
    
    // Authentication from .env
    static final String AUTH_USERNAME = ENV.getProperty('POSTMAN_AUTH_USERNAME', 'admin')
    static final String AUTH_PASSWORD = ENV.getProperty('POSTMAN_AUTH_PASSWORD', 'admin')
    
    static {
        println "Debug: AUTH_USERNAME = ${AUTH_USERNAME}"
        println "Debug: AUTH_PASSWORD = ${AUTH_PASSWORD}"
        println "Debug: ENV loaded ${ENV.size()} properties"
    }
    
    // Database configuration
    static final String DB_URL = "jdbc:postgresql://localhost:5432/umig_app_db"
    static final String DB_USER = ENV.getProperty('UMIG_DB_USER', 'umig_app_user')
    static final String DB_PASSWORD = ENV.getProperty('UMIG_DB_PASSWORD', '123456')
    
    // Test data
    static JsonSlurper jsonSlurper = new JsonSlurper()
    static int testsPassed = 0
    static int testsFailed = 0
    static List<String> failedTests = []
    
    /**
     * Main test execution method
     */
    static void main(String[] args) {
        println "=" * 60
        println "Admin GUI All Endpoints Integration Test"
        println "US-031: Admin GUI Complete Integration"
        println "=" * 60
        println ""
        
        // Test all entity endpoints
        testEndpoint("users")
        testEndpoint("teams")
        testEndpoint("environments")
        testEndpoint("applications")
        testEndpoint("labels")
        testEndpoint("iterations")
        testEndpoint("migrations")
        testEndpoint("plans")
        testEndpoint("sequences")
        testEndpoint("phases")
        testEndpoint("steps")
        testEndpoint("instructions")
        testEndpoint("controls")
        
        // Print summary
        printTestSummary()
    }
    
    /**
     * Generic test method for any API endpoint
     */
    static void testEndpoint(String endpoint) {
        println "Testing ${endpoint} API..."
        
        try {
            def response = makeGetRequest("${API_BASE}/${endpoint}")
            
            if (response.status == 200) {
                def data = jsonSlurper.parseText(response.content)
                assert data != null : "Response data should not be null"
                
                // Handle different response structures
                def itemCount = 0
                if (data instanceof List) {
                    itemCount = data.size()
                } else if (data.containsKey('content')) {
                    // Paginated response
                    itemCount = data.content?.size() ?: 0
                } else if (data.containsKey('data')) {
                    itemCount = data.data?.size() ?: 0
                } else {
                    // Single object response
                    itemCount = 1
                }
                
                println "  ✅ ${endpoint}: SUCCESS (HTTP ${response.status})"
                println "  Response contains: ${itemCount} items"
                if (data instanceof Map && data.containsKey('totalElements')) {
                    println "  Total elements: ${data.totalElements}"
                }
                testsPassed++
            } else {
                throw new Exception("HTTP ${response.status}")
            }
        } catch (Exception e) {
            println "  ❌ ${endpoint}: FAILED - ${e.message}"
            testsFailed++
            failedTests.add(endpoint)
        }
        println ""
    }
    
    
    /**
     * Make HTTP GET request with Basic Authentication
     */
    static Map makeGetRequest(String url) {
        HttpURLConnection connection = null
        try {
            connection = (HttpURLConnection) new URL(url).openConnection()
            connection.setRequestMethod("GET")
            connection.setRequestProperty("Accept", "application/json")
            
            // Add Basic Authentication
            String userpass = "${AUTH_USERNAME}:${AUTH_PASSWORD}"
            String basicAuth = "Basic " + userpass.getBytes().encodeBase64().toString()
            connection.setRequestProperty("Authorization", basicAuth)
            
            connection.setConnectTimeout(5000)
            connection.setReadTimeout(5000)
            
            int responseCode = connection.getResponseCode()
            String content = ""
            
            if (responseCode == 200) {
                content = connection.getInputStream().getText()
            } else {
                // Try to get error stream if available
                if (connection.getErrorStream()) {
                    content = connection.getErrorStream().getText()
                }
            }
            
            return [status: responseCode, content: content]
        } finally {
            if (connection != null) {
                connection.disconnect()
            }
        }
    }
    
    /**
     * Print test summary
     */
    static void printTestSummary() {
        println "=" * 60
        println "TEST SUMMARY"
        println "=" * 60
        println "Tests Passed: ${testsPassed}"
        println "Tests Failed: ${testsFailed}"
        
        if (testsFailed > 0) {
            println "\nFailed Endpoints:"
            failedTests.each { endpoint ->
                println "  - ${endpoint}"
            }
            println "\n❌ TEST SUITE FAILED"
            System.exit(1)
        } else {
            println "\n✅ ALL TESTS PASSED"
            System.exit(0)
        }
    }
}