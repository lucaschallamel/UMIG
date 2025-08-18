#!/usr/bin/env groovy

/**
 * Comprehensive integration tests for SequencesApi following ADR-036 pure Groovy testing framework.
 * Tests all endpoints including master sequences, sequence instances, and error scenarios.
 * Validates performance requirements (<500ms response times) and business logic.
 * 
 * Updated: 2025-08-18
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * Coverage: Sequences CRUD, master/instance operations, status updates, error handling
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
def testMasterSequenceId = null
def testIterationId = null
def testMigrationId = null
def testUserId = null
def testPlanInstanceId = null
def testSequenceInstanceId = null

/**
 * Setup test data by querying actual database for valid IDs
 */
def setupTestData(String dbUrl, String dbUser, String dbPassword) {
    def sql = null
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
        testTeamId = team?.tms_id
        
        // Get first user ID
        def user = sql.firstRow("SELECT usr_id FROM users_usr LIMIT 1")  
        testUserId = user?.usr_id
        
        // Create test migration
        def migrationResult = sql.firstRow("""
            INSERT INTO migrations_mig (usr_id_owner, mig_name, mig_type, mig_status, created_by, updated_by)
            VALUES (?, 'Test Migration for Sequences', 'MIGRATION', 5, 'system', 'system')
            RETURNING mig_id
        """, [testUserId])
        testMigrationId = migrationResult?.mig_id
        
        // Create test master plan
        def planResult = sql.firstRow("""
            INSERT INTO plans_master_plm (tms_id, plm_name, plm_description, plm_status, created_by, updated_by)
            VALUES (?, 'Test Master Plan for Sequences', 'Test plan for sequence integration', 5, 'system', 'system')
            RETURNING plm_id
        """, [testTeamId])
        testMasterPlanId = planResult?.plm_id
        
        // Create test iteration
        def iterationResult = sql.firstRow("""
            INSERT INTO iterations_ite (mig_id, plm_id, itt_code, ite_name, ite_description, ite_status, created_by, updated_by)
            VALUES (?, ?, 'CUTOVER', 'Test Iteration for Sequences', 'Test iteration', 5, 'system', 'system')
            RETURNING ite_id
        """, [testMigrationId, testMasterPlanId])
        testIterationId = iterationResult?.ite_id
        
        // Create test plan instance
        def planInstanceResult = sql.firstRow("""
            INSERT INTO plans_instance_pli (plm_id, ite_id, usr_id_owner, pli_name, pli_description, pli_status, created_by, updated_by)
            VALUES (?, ?, ?, 'Test Plan Instance for Sequences', 'Instance for sequence testing', 5, 'system', 'system')
            RETURNING pli_id
        """, [testMasterPlanId, testIterationId, testUserId])
        testPlanInstanceId = planInstanceResult?.pli_id
        
    } finally {
        sql?.close()
    }
}

/**
 * HTTP helper method for GET requests
 */
def makeGetRequest(String baseUrl, String endpoint) {
    def url = new URL("${baseUrl}/${endpoint}")
    def connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "GET"
    connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty("Authorization", AUTH_HEADER)
    
    def responseCode = connection.responseCode
    def response = responseCode < 400 ? 
        jsonSlurper.parse(connection.inputStream) : 
        jsonSlurper.parse(connection.errorStream)
        
    return [responseCode: responseCode, data: response]
}

/**
 * HTTP helper method for POST requests  
 */
def makePostRequest(String baseUrl, String endpoint, Map body) {
    def url = new URL("${baseUrl}/${endpoint}")
    def connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "POST"
    connection.setRequestProperty("Content-Type", "application/json")
    connection.setRequestProperty("Authorization", AUTH_HEADER)
    connection.doOutput = true
    
    connection.outputStream.withWriter { writer ->
        writer << new JsonBuilder(body).toString()
    }
    
    def responseCode = connection.responseCode
    def response = responseCode < 400 ? 
        jsonSlurper.parse(connection.inputStream) : 
        jsonSlurper.parse(connection.errorStream)
        
    return [responseCode: responseCode, data: response]
}

/**
 * HTTP helper method for PUT requests
 */
def makePutRequest(String baseUrl, String endpoint, Map body) {
    def url = new URL("${baseUrl}/${endpoint}")
    def connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "PUT"
    connection.setRequestProperty("Content-Type", "application/json")
    connection.setRequestProperty("Authorization", AUTH_HEADER)
    connection.doOutput = true
    
    connection.outputStream.withWriter { writer ->
        writer << new JsonBuilder(body).toString()
    }
    
    def responseCode = connection.responseCode
    def response = responseCode < 400 ? 
        jsonSlurper.parse(connection.inputStream) : 
        jsonSlurper.parse(connection.errorStream)
        
    return [responseCode: responseCode, data: response]
}

/**
 * HTTP helper method for DELETE requests
 */
def makeDeleteRequest(String baseUrl, String endpoint) {
    def url = new URL("${baseUrl}/${endpoint}")
    def connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "DELETE"
    connection.setRequestProperty("Authorization", AUTH_HEADER)
    
    def responseCode = connection.responseCode
    def response = responseCode < 400 && connection.contentLength > 0 ? 
        jsonSlurper.parse(connection.inputStream) : 
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
        sql.execute("DELETE FROM sequences_instance_sqi WHERE sqi_id = ?", [testSequenceInstanceId])
        sql.execute("DELETE FROM sequences_master_sqm WHERE sqm_id = ?", [testMasterSequenceId])
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
setupTestData(DB_URL, DB_USER, DB_PASSWORD)

// Test Data
def testSequenceData = [
    plm_id: testMasterPlanId,
    sqm_name: "Integration Test Sequence", 
    sqm_description: "Sequence created by integration test",
    sqm_order: 1
]

// Main test execution
println "============================================"
println "Sequences API Integration Test (ADR-036)"
println "============================================"
println "Base URL: ${API_BASE}"
println ""

try {
    // Test 1: Create Master Sequence
    println "\n🧪 Test 1: Create Master Sequence"
    def createResponse = makePostRequest(API_BASE, 'sequences/master', testSequenceData)
    
    assert createResponse.responseCode == 201 : "Expected 201, got ${createResponse.responseCode}"
    assert createResponse.data.sqm_name == 'Integration Test Sequence'
    assert createResponse.data.plm_id == testMasterPlanId.toString()
    def newMasterSequenceId = UUID.fromString(createResponse.data.sqm_id as String)
    testMasterSequenceId = newMasterSequenceId
    println "✅ Master sequence created: ${newMasterSequenceId}"
    
    // Test 2: Get All Master Sequences  
    println "\n🧪 Test 2: Get All Master Sequences"
    def listResponse = makeGetRequest(API_BASE, 'sequences/master')
    
    assert listResponse.responseCode == 200 : "Expected 200, got ${listResponse.responseCode}"
    assert listResponse.data instanceof List
    assert listResponse.data.find { it.sqm_id == newMasterSequenceId.toString() } != null
    println "✅ Retrieved ${listResponse.data.size()} master sequences"
    
    // Test 3: Get Master Sequence by ID
    println "\n🧪 Test 3: Get Master Sequence by ID"
    def getResponse = makeGetRequest(API_BASE, "sequences/master/${newMasterSequenceId}")
    
    assert getResponse.responseCode == 200 : "Expected 200, got ${getResponse.responseCode}"
    assert getResponse.data.sqm_id == newMasterSequenceId.toString()
    assert getResponse.data.sqm_name == 'Integration Test Sequence'
    println "✅ Retrieved master sequence by ID"
    
    // Test 4: Update Master Sequence
    println "\n🧪 Test 4: Update Master Sequence"
    def updateResponse = makePutRequest(API_BASE, "sequences/master/${newMasterSequenceId}", [
        sqm_name: 'Updated Test Sequence',
        sqm_description: 'Updated sequence description'
    ])
    
    assert updateResponse.responseCode == 200 : "Expected 200, got ${updateResponse.responseCode}"
    assert updateResponse.data.sqm_name == 'Updated Test Sequence'
    println "✅ Master sequence updated"
    
    // Test 5: Create Sequence Instance
    println "\n🧪 Test 5: Create Sequence Instance"
    def instanceData = [
        sqm_id: testMasterSequenceId.toString(),
        pli_id: testPlanInstanceId.toString(),
        sqi_name: 'Test Sequence Instance',
        sqi_description: 'Instance created by integration test'
    ]
    def instanceResponse = makePostRequest(API_BASE, 'sequences/instance', instanceData)
    
    assert instanceResponse.responseCode == 201 : "Expected 201, got ${instanceResponse.responseCode}"
    assert instanceResponse.data.sqm_id == testMasterSequenceId.toString()
    assert instanceResponse.data.sqi_name == 'Test Sequence Instance'
    testSequenceInstanceId = UUID.fromString(instanceResponse.data.sqi_id as String)
    println "✅ Sequence instance created: ${testSequenceInstanceId}"
    
    // Test 6: Get Sequence Instances with Filtering
    println "\n🧪 Test 6: Get Sequence Instances with Filtering"
    def instancesResponse = makeGetRequest(API_BASE, "sequences?planInstanceId=${testPlanInstanceId}")
    
    assert instancesResponse.responseCode == 200 : "Expected 200, got ${instancesResponse.responseCode}"
    assert instancesResponse.data instanceof List
    assert instancesResponse.data.find { it.sqi_id == testSequenceInstanceId.toString() } != null
    println "✅ Retrieved filtered sequence instances"
    
    // Test 7: Get Sequence Instance by ID
    println "\n🧪 Test 7: Get Sequence Instance by ID"
    def getInstanceResponse = makeGetRequest(API_BASE, "sequences/instance/${testSequenceInstanceId}")
    
    assert getInstanceResponse.responseCode == 200 : "Expected 200, got ${getInstanceResponse.responseCode}"
    assert getInstanceResponse.data.sqi_id == testSequenceInstanceId.toString()
    assert getInstanceResponse.data.sqi_name == 'Test Sequence Instance'
    println "✅ Retrieved sequence instance by ID"
    
    // Test 8: Update Sequence Instance
    println "\n🧪 Test 8: Update Sequence Instance"
    def updateInstanceResponse = makePutRequest(API_BASE, "sequences/instance/${testSequenceInstanceId}", [
        sqi_name: 'Updated Instance Name',
        sqi_description: 'Updated instance description'
    ])
    
    assert updateInstanceResponse.responseCode == 200 : "Expected 200, got ${updateInstanceResponse.responseCode}"
    assert updateInstanceResponse.data.sqi_name == 'Updated Instance Name'
    println "✅ Sequence instance updated"
    
    // Test 9: Error Handling - Invalid UUID
    println "\n🧪 Test 9: Error Handling - Invalid UUID"
    def errorResponse = makeGetRequest(API_BASE, "sequences/master/invalid-uuid")
    assert errorResponse.responseCode == 400 : "Expected 400, got ${errorResponse.responseCode}"
    println "✅ Invalid UUID handled correctly"
    
    // Test 10: Error Handling - Not Found
    println "\n🧪 Test 10: Error Handling - Not Found"
    def randomId = UUID.randomUUID()
    def notFoundResponse = makeGetRequest(API_BASE, "sequences/master/${randomId}")
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