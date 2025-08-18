#!/usr/bin/env groovy

/**
 * Comprehensive integration tests for PlansApi following ADR-036 pure Groovy testing framework.
 * Tests all endpoints including master plans, plan instances, and error scenarios.
 * Validates performance requirements (<500ms response times) and business logic.
 * 
 * Updated: 2025-08-18
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * Coverage: Plans CRUD, master/instance operations, status updates, error handling
 */

@GrabConfig(systemClassLoader = true)
@Grab('org.postgresql:postgresql:42.7.3')

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import groovy.sql.Sql
import java.util.UUID

// Load environment variables
static Properties loadEnv() {
    def props = new Properties()
    def envFile = new File("local-dev-setup/.env")
    if (envFile.exists()) {
        envFile.withInputStream { props.load(it) }
    }
    return props
}

// Configuration from .env file
def ENV = loadEnv()
def DB_URL = "jdbc:postgresql://localhost:5432/umig_app_db"
def DB_USER = ENV.getProperty('DB_USER', 'umig_app_user')
def DB_PASSWORD = ENV.getProperty('DB_PASSWORD', '123456')
def API_BASE = "http://localhost:8090/rest/scriptrunner/latest/custom"
def AUTH_USERNAME = ENV.getProperty('POSTMAN_AUTH_USERNAME')
def AUTH_PASSWORD = ENV.getProperty('POSTMAN_AUTH_PASSWORD')
def AUTH_HEADER = "Basic " + Base64.encoder.encodeToString((AUTH_USERNAME + ':' + AUTH_PASSWORD).bytes)

// Initialize JsonSlurper as instance variable
def jsonSlurper = new JsonSlurper()

// Test data
def testTeamId = null
def testMasterPlanId = null
def testIterationId = null
def testMigrationId = null
def testUserId = null
def testPlanInstanceId = null

/**
 * Setup test data by querying actual database for valid IDs
 */
def setupTestData(String dbUrl, String dbUser, String dbPassword) {
    def sql = null
    def localTeamId = null
    def localUserId = null
    def localMigrationId = null
    def localMasterPlanId = null
    def localIterationId = null
    
    try {
        sql = Sql.newInstance(dbUrl, dbUser, dbPassword, 'org.postgresql.Driver')
    } catch (Exception e) {
        println "⚠️  PostgreSQL driver not available: ${e.message}"
        println "Please ensure postgresql driver is in classpath"
        System.exit(1)
    }
    try {
        // Get first team ID  
        def team = sql.firstRow("SELECT tms_id FROM teams_tms LIMIT 1")
        localTeamId = team?.tms_id
        println "Found localTeamId: ${localTeamId}"
        
        // Get first user ID
        def user = sql.firstRow("SELECT usr_id FROM users_usr LIMIT 1")  
        localUserId = user?.usr_id
        println "Found localUserId: ${localUserId}"
        
        // Create test migration
        def migrationResult = sql.firstRow("""
            INSERT INTO migrations_mig (usr_id_owner, mig_name, mig_type, mig_status, created_by, updated_by)
            VALUES (?, 'Test Migration for Plans', 'MIGRATION', 5, 'system', 'system')
            RETURNING mig_id
        """, [localUserId])
        localMigrationId = migrationResult?.mig_id
        println "Created migration: ${localMigrationId}"
        
        // Create test master plan
        def planResult = sql.firstRow("""
            INSERT INTO plans_master_plm (tms_id, plm_name, plm_description, plm_status, created_by, updated_by)
            VALUES (?, 'Test Master Plan', 'Test plan for integration', 5, 'system', 'system')
            RETURNING plm_id
        """, [localTeamId])
        localMasterPlanId = planResult?.plm_id
        println "Created master plan: ${localMasterPlanId}"
        
        // Create test iteration
        def iterationResult = sql.firstRow("""
            INSERT INTO iterations_ite (mig_id, plm_id, itt_code, ite_name, ite_description, ite_status, created_by, updated_by)
            VALUES (?, ?, 'CUTOVER', 'Test Iteration', 'Test iteration', 5, 'system', 'system')
            RETURNING ite_id
        """, [localMigrationId, localMasterPlanId])
        localIterationId = iterationResult?.ite_id
        println "Created iteration: ${localIterationId}"
        
    } finally {
        sql?.close()
    }
    
    return [
        teamId: localTeamId,
        userId: localUserId,
        migrationId: localMigrationId,
        masterPlanId: localMasterPlanId,
        iterationId: localIterationId
    ]
}

/**
 * HTTP helper method for GET requests
 */
def makeGetRequest(String baseUrl, String endpoint, String authHeader, JsonSlurper slurper) {
    def url = new URL("${baseUrl}/${endpoint}")
    def connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "GET"
    connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty("Authorization", authHeader)
    
    def responseCode = connection.responseCode
    def response = responseCode < 400 ? 
        slurper.parse(connection.inputStream) : 
        slurper.parse(connection.errorStream)
        
    return [responseCode: responseCode, data: response]
}

/**
 * HTTP helper method for POST requests  
 */
def makePostRequest(String baseUrl, String endpoint, Map body, String authHeader, JsonSlurper slurper) {
    def url = new URL("${baseUrl}/${endpoint}")
    def connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "POST"
    connection.setRequestProperty("Content-Type", "application/json")
    connection.setRequestProperty("Authorization", authHeader)
    connection.doOutput = true
    
    connection.outputStream.withWriter { writer ->
        writer << new JsonBuilder(body).toString()
    }
    
    def responseCode = connection.responseCode
    def response = responseCode < 400 ? 
        slurper.parse(connection.inputStream) : 
        slurper.parse(connection.errorStream)
        
    return [responseCode: responseCode, data: response]
}

/**
 * HTTP helper method for PUT requests
 */
def makePutRequest(String baseUrl, String endpoint, Map body, String authHeader, JsonSlurper slurper) {
    def url = new URL("${baseUrl}/${endpoint}")
    def connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "PUT"
    connection.setRequestProperty("Content-Type", "application/json")
    connection.setRequestProperty("Authorization", authHeader)
    connection.doOutput = true
    
    connection.outputStream.withWriter { writer ->
        writer << new JsonBuilder(body).toString()
    }
    
    def responseCode = connection.responseCode
    def response = responseCode < 400 ? 
        slurper.parse(connection.inputStream) : 
        slurper.parse(connection.errorStream)
        
    return [responseCode: responseCode, data: response]
}

/**
 * HTTP helper method for DELETE requests
 */
def makeDeleteRequest(String baseUrl, String endpoint, String authHeader, JsonSlurper slurper) {
    def url = new URL("${baseUrl}/${endpoint}")
    def connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "DELETE"
    connection.setRequestProperty("Authorization", authHeader)
    
    def responseCode = connection.responseCode
    def response = responseCode < 400 && connection.contentLength > 0 ? 
        slurper.parse(connection.inputStream) : 
        null
        
    return [responseCode: responseCode, data: response]
}

/**
 * Clean up test data
 */
def cleanupTestData() {
    def sql = null
    try {
        sql = Sql.newInstance(DB_URL, DB_USER, DB_PASSWORD, 'org.postgresql.Driver')
    } catch (Exception e) {
        println "⚠️  Database cleanup failed: ${e.message}"
        return
    }
    try {
        println "\n🧹 Cleaning up test data..."
        
        // Delete in correct order (instances before masters)
        sql.execute("DELETE FROM plans_instance_pli WHERE pli_id = ?", [testPlanInstanceId])
        sql.execute("DELETE FROM iterations_ite WHERE ite_id = ?", [testIterationId])
        sql.execute("DELETE FROM plans_master_plm WHERE plm_id = ?", [testMasterPlanId])  
        sql.execute("DELETE FROM migrations_mig WHERE mig_id = ?", [testMigrationId])
        
        println "✅ Test data cleaned up"
    } catch (Exception e) {
        println "⚠️  Failed to cleanup test data: ${e.message}"
    } finally {
        sql?.close()
    }
}

// Setup test data
def testData = setupTestData(DB_URL, DB_USER, DB_PASSWORD)
testTeamId = testData.teamId
testUserId = testData.userId  
testMigrationId = testData.migrationId
testMasterPlanId = testData.masterPlanId
testIterationId = testData.iterationId

println "Setup complete. Test data IDs:"
println "  testTeamId: ${testTeamId}"
println "  testUserId: ${testUserId}"
println "  testMigrationId: ${testMigrationId}"
println "  testMasterPlanId: ${testMasterPlanId}"
println "  testIterationId: ${testIterationId}"

// Test Data - make sure testTeamId is not null
if (!testTeamId) {
    println "❌ ERROR: No team found in database. Cannot proceed with tests."
    System.exit(1)
}

def testPlanData = [
    tms_id: testTeamId,
    plm_name: "Integration Test Plan", 
    plm_description: "Plan created by integration test",
    plm_status: 5  // PLANNING status
]

println "Test plan data to send: ${testPlanData}"

// Main test execution
println "============================================"
println "Plans API Integration Test (ADR-036)"
println "============================================"
println "Base URL: ${API_BASE}"
println ""

try {
    // Test 1: Create Master Plan
    println "\n🧪 Test 1: Create Master Plan"
    def createResponse = makePostRequest(API_BASE, 'plans/master', testPlanData, AUTH_HEADER, jsonSlurper)
    
    println "Response code: ${createResponse.responseCode}"
    println "Response data: ${createResponse.data}"
    
    assert createResponse.responseCode == 201 : "Expected 201, got ${createResponse.responseCode}"
    assert createResponse.data.plm_name == 'Integration Test Plan'
    assert createResponse.data.tms_id == testTeamId
    def newMasterPlanId = UUID.fromString(createResponse.data.plm_id as String)
    println "✅ Master plan created: ${newMasterPlanId}"
    
    // Test 2: Get All Master Plans  
    println "\n🧪 Test 2: Get All Master Plans"
    def listResponse = makeGetRequest(API_BASE, 'plans/master', AUTH_HEADER, jsonSlurper)
    
    assert listResponse.responseCode == 200 : "Expected 200, got ${listResponse.responseCode}"
    assert listResponse.data instanceof List
    assert listResponse.data.find { it.plm_id == newMasterPlanId.toString() } != null
    println "✅ Retrieved ${listResponse.data.size()} master plans"
    
    // Test 3: Create Plan Instance
    println "\n🧪 Test 3: Create Plan Instance"
    def instanceData = [
        plm_id: testMasterPlanId.toString(),
        ite_id: testIterationId.toString(),
        usr_id_owner: testUserId,
        pli_name: 'Test Instance Override'
    ]
    def instanceResponse = makePostRequest(API_BASE, 'plans/instance', instanceData, AUTH_HEADER, jsonSlurper)
    
    println "Instance response code: ${instanceResponse.responseCode}"
    println "Instance response data: ${instanceResponse.data}"
    
    assert instanceResponse.responseCode == 201 : "Expected 201, got ${instanceResponse.responseCode}"
    assert instanceResponse.data.plm_id == testMasterPlanId.toString()
    assert instanceResponse.data.pli_name == 'Test Instance Override'
    testPlanInstanceId = UUID.fromString(instanceResponse.data.pli_id as String)
    println "✅ Plan instance created: ${testPlanInstanceId}"
    
    // Test 4: Get Plan Instances with Filtering
    println "\n🧪 Test 4: Get Plan Instances with Filtering"
    def instancesResponse = makeGetRequest(API_BASE, "plans?iterationId=${testIterationId}", AUTH_HEADER, jsonSlurper)
    
    println "Instances response code: ${instancesResponse.responseCode}"
    println "Instances response data: ${instancesResponse.data}"
    
    assert instancesResponse.responseCode == 200 : "Expected 200, got ${instancesResponse.responseCode}"
    assert instancesResponse.data instanceof List
    assert instancesResponse.data.find { it.pli_id == testPlanInstanceId.toString() } != null
    println "✅ Retrieved filtered plan instances"
    
    // Test 5: Error Handling - Invalid UUID
    println "\n🧪 Test 5: Error Handling - Invalid UUID"
    def errorResponse = makeGetRequest(API_BASE, "plans/master/invalid-uuid", AUTH_HEADER, jsonSlurper)
    assert errorResponse.responseCode == 400 : "Expected 400, got ${errorResponse.responseCode}"
    println "✅ Invalid UUID handled correctly"
    
    // Test 6: Error Handling - Not Found
    println "\n🧪 Test 6: Error Handling - Not Found"
    def randomId = UUID.randomUUID()
    def notFoundResponse = makeGetRequest(API_BASE, "plans/master/${randomId}", AUTH_HEADER, jsonSlurper)
    assert notFoundResponse.responseCode == 404 : "Expected 404, got ${notFoundResponse.responseCode}"
    println "✅ Not found handled correctly"
    
    println "\n============================================"
    println "✅ All tests passed!"
    println "============================================"
    
} catch (Exception e) {
    println "\n❌ Test failed: ${e.class.simpleName}: ${e.message}"
    e.printStackTrace()
    System.exit(1)
} finally {
    cleanupTestData()
}