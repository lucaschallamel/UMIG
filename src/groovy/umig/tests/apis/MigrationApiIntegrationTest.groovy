#!/usr/bin/env groovy

/**
 * UMIG Migration API Integration Test
 * 
 * This test validates all CRUD operations and dashboard endpoints for the Migration API.
 * Credentials are loaded from the .env file for security.
 * 
 * Run with: groovy src/groovy/umig/tests/apis/MigrationApiIntegrationTest.groovy
 */

@Grab('org.codehaus.groovy.modules.http-builder:http-builder:0.7.1')
import groovyx.net.http.RESTClient
import groovyx.net.http.HttpResponseException
import static groovyx.net.http.ContentType.JSON
import groovy.json.JsonBuilder
import groovy.transform.Field

// Script-level variables (no static, no class)
@Field String BASE_URL = "http://localhost:8090/rest/scriptrunner/latest/custom"
@Field String username = null
@Field String password = null
@Field RESTClient restClient = null

// Test counters
@Field int totalTests = 0
@Field int passedTests = 0
@Field int failedTests = 0

// Test migration ID (will be set during create test)
@Field String testMigrationId = null

/**
 * Load credentials from .env file
 */
def loadCredentials() {
    // Try multiple possible locations for .env file
    def possiblePaths = [
        "local-dev-setup/.env",
        "../local-dev-setup/.env", 
        "../../local-dev-setup/.env",
        "../../../local-dev-setup/.env",
        "../../../../local-dev-setup/.env"
    ]
    
    def envFile = null
    for (String path : possiblePaths) {
        def testFile = new File(path)
        if (testFile.exists()) {
            envFile = testFile
            break
        }
    }
    
    if (!envFile) {
        def currentDir = System.getProperty("user.dir")
        throw new RuntimeException("Cannot find .env file. Current directory: ${currentDir}. Searched paths: ${possiblePaths}")
    }
    
    println "✅ Using .env file: ${envFile.absolutePath}"
    
    envFile.eachLine { line ->
        if (line.startsWith("POSTMAN_AUTH_USERNAME=")) {
            username = line.split("=", 2)[1].trim()
        } else if (line.startsWith("POSTMAN_AUTH_PASSWORD=")) {
            password = line.split("=", 2)[1].trim()
        }
    }
    
    if (!username || !password) {
        throw new RuntimeException("Credentials not found in .env file")
    }
    
    println "✅ Loaded credentials from .env file for user: ${username}"
}

/**
 * Initialize REST client with authentication
 */
def initializeClient() {
    restClient = new RESTClient(BASE_URL + '/')
    
    // Configure Basic Authentication manually using Authorization header
    def credentials = "${username}:${password}".bytes.encodeBase64().toString()
    restClient.headers.'Authorization' = "Basic ${credentials}"
    
    // Configure headers to ensure proper JSON handling
    restClient.headers.'Accept' = 'application/json'
    restClient.headers.'User-Agent' = 'UMIG-Integration-Test/1.0'
    
    // Set default content type
    restClient.contentType = JSON
    
    println "✅ Initialized REST client with authentication"
}

/**
 * Run a test and track results
 */
def runTest(String testName, Closure testLogic) {
    totalTests++
    println "\n🧪 Test ${totalTests}: ${testName}"
    println "-".multiply(50)
    
    try {
        testLogic()
        passedTests++
        println "✅ Test passed"
    } catch (Exception e) {
        failedTests++
        println "❌ Test failed: ${e.message}"
        if (e instanceof HttpResponseException) {
            println "   HTTP Status: ${e.response.status}"
            try {
                println "   Response: ${e.response.data}"
            } catch (ignored) {}
        }
    }
}

/**
 * Test GET /migrations (list)
 */
def testGetMigrationsList() {
    runTest("GET /migrations (list)") {
        def response = restClient.get(
            path: 'migrations',
            query: [page: 1, size: 5]
        )
        
        assert response.status == 200
        assert response.data.data != null
        println "   Found ${response.data.data.size()} migrations"
        if (response.data.pagination) {
            println "   Total: ${response.data.pagination.total} migrations"
        }
    }
}

/**
 * Test GET /migrations/dashboard/summary
 */
def testDashboardSummary() {
    runTest("GET /migrations/dashboard/summary") {
        def response = restClient.get(
            path: 'migrations/dashboard/summary'
        )
        
        assert response.status == 200
        assert response.data.data != null
        println "   Total migrations: ${response.data.data.totalMigrations}"
    }
}

/**
 * Test GET /migrations/dashboard/progress
 */
def testDashboardProgress() {
    runTest("GET /migrations/dashboard/progress") {
        def response = restClient.get(
            path: 'migrations/dashboard/progress'
        )
        
        assert response.status == 200
        assert response.data != null
        println "   Progress data received"
    }
}

/**
 * Test GET /migrations/dashboard/metrics
 */
def testDashboardMetrics() {
    runTest("GET /migrations/dashboard/metrics") {
        def response = restClient.get(
            path: 'migrations/dashboard/metrics',
            query: [period: 'month']
        )
        
        assert response.status == 200
        assert response.data.data != null
        println "   Metrics period: ${response.data.data.period}"
    }
}

/**
 * Test POST /migrations (create)
 */
def testCreateMigration() {
    runTest("POST /migrations (create)") {
        def timestamp = System.currentTimeMillis()
        // Use all required fields based on database schema
        def migrationData = [
            mig_name: "Integration Test Migration " + timestamp.toString(),
            usr_id_owner: 1, // Use existing user ID
            mig_type: "MIGRATION", // Required field
            mig_status: 1, // Required field (Planning status)
            created_by: "admin",
            updated_by: "admin"
        ]
        
        def response = restClient.post(
            path: 'migrations',
            body: migrationData,
            requestContentType: JSON
        )
        
        assert response.status == 201
        assert response.data.mig_id != null
        testMigrationId = response.data.mig_id
        println "   Created migration ID: ${testMigrationId}"
        println "   Name: ${response.data.mig_name}"
    }
}

/**
 * Test GET /migrations/{id} (single)
 */
def testGetSingleMigration() {
    runTest("GET /migrations/{id} (single)") {
        if (!testMigrationId) {
            throw new RuntimeException("No test migration ID available")
        }
        
        def response = restClient.get(
            path: "migrations/${testMigrationId}"
        )
        
        assert response.status == 200
        assert response.data.mig_id == testMigrationId
        println "   Retrieved migration: ${response.data.mig_name}"
        println "   Status: ${response.data.mig_status}"
    }
}

/**
 * Test PUT /migrations/{id} (update)
 */
def testUpdateMigration() {
    runTest("PUT /migrations/{id} (update)") {
        if (!testMigrationId) {
            throw new RuntimeException("No test migration ID available")
        }
        
        def updateData = [
            mig_name: "Updated Integration Test Migration",
            mig_status: 2, // Active status
            mig_description: "Updated by integration test"
        ]
        
        def response = restClient.put(
            path: "migrations/${testMigrationId}",
            body: updateData,
            requestContentType: JSON
        )
        
        assert response.status == 200
        assert response.data.mig_name == updateData.mig_name
        println "   Updated migration name: ${response.data.mig_name}"
    }
}

/**
 * Test DELETE /migrations/{id}
 */
def testDeleteMigration() {
    runTest("DELETE /migrations/{id}") {
        if (!testMigrationId) {
            throw new RuntimeException("No test migration ID available")
        }
        
        def response = restClient.delete(
            path: "migrations/${testMigrationId}"
        )
        
        assert response.status == 204
        println "   Migration deleted successfully"
        
        // Verify deletion
        try {
            restClient.get(
                path: "migrations/${testMigrationId}"
            )
            throw new RuntimeException("Migration still exists after deletion!")
        } catch (HttpResponseException e) {
            if (e.response.status == 404) {
                println "   Verified: Migration no longer exists"
            } else {
                throw e
            }
        }
    }
}

/**
 * Test error handling - invalid ID
 */
def testErrorHandlingInvalidId() {
    runTest("Error handling - invalid ID") {
        def invalidId = "00000000-0000-0000-0000-000000000000"
        
        try {
            restClient.get(
                path: "migrations/${invalidId}"
            )
            throw new RuntimeException("Should have returned 404")
        } catch (HttpResponseException e) {
            assert e.response.status == 404
            println "   Correctly returned 404 for non-existent migration"
        }
    }
}

/**
 * Print test summary
 */
def printSummary() {
    println "\n" + "=".multiply(60)
    println "TEST SUMMARY"
    println "=".multiply(60)
    println "Total Tests: ${totalTests}"
    println "Passed: ${passedTests}"
    println "Failed: ${failedTests}"
    if (totalTests > 0) {
        def successRate = (passedTests * 100) / totalTests
        println "Success Rate: ${successRate}%"
    }
    println "Test completed at: ${new Date()}"
    println "=".multiply(60)
    
    // Exit with appropriate code
    if (failedTests > 0) {
        System.exit(1)
    }
}

// ============================================================================
// MAIN EXECUTION STARTS HERE
// ============================================================================

println "=".multiply(60)
println "UMIG Migration API Integration Test"
println "=".multiply(60)

try {
    // Setup
    loadCredentials()
    initializeClient()
    
    // Run tests
    testGetMigrationsList()
    testDashboardSummary()
    testDashboardProgress()
    testDashboardMetrics()
    testCreateMigration()
    testGetSingleMigration()
    testUpdateMigration()
    testDeleteMigration()
    testErrorHandlingInvalidId()
    
} catch (Exception e) {
    println "\n❌ Fatal error: ${e.message}"
    e.printStackTrace()
    System.exit(1)
} finally {
    printSummary()
}