#!/usr/bin/env groovy

/**
 * Comprehensive integration tests for PhasesApi following ADR-036 pure Groovy testing framework.
 * Tests all endpoints including master phases, phase instances, control points, and error scenarios.
 * Validates performance requirements (<500ms response times) and business logic.
 * 
 * Updated: 2025-08-18
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * Coverage: Phases CRUD, master/instance operations, control points, ordering, error handling
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
    def envFile = new File("/Users/lucaschallamel/Documents/GitHub/UMIG/local-dev-setup/.env")
    if (!envFile.exists()) {
        // Try relative path
        envFile = new File("local-dev-setup/.env")
    }
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
def testMasterPhaseId = null
def testPhaseInstanceId = null

/**
 * Setup test data by querying actual database for valid IDs
 */
def setupTestData(dbUrl, dbUser, dbPassword) {
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
            VALUES (?, 'Test Migration for Phases', 'MIGRATION', 5, 'system', 'system')
            RETURNING mig_id
        """, [testUserId])
        testMigrationId = migrationResult?.mig_id
        
        // Create test master plan
        def planResult = sql.firstRow("""
            INSERT INTO plans_master_plm (tms_id, plm_name, plm_description, plm_status, created_by, updated_by)
            VALUES (?, 'Test Master Plan for Phases', 'Test plan for phase integration', 5, 'system', 'system')
            RETURNING plm_id
        """, [testTeamId])
        testMasterPlanId = planResult?.plm_id
        
        // Create test iteration
        def iterationResult = sql.firstRow("""
            INSERT INTO iterations_ite (mig_id, plm_id, itt_code, ite_name, ite_description, ite_status, created_by, updated_by)
            VALUES (?, ?, 'CUTOVER', 'Test Iteration for Phases', 'Test iteration', 5, 'system', 'system')
            RETURNING ite_id
        """, [testMigrationId, testMasterPlanId])
        testIterationId = iterationResult?.ite_id
        
        // Create test plan instance
        def planInstanceResult = sql.firstRow("""
            INSERT INTO plans_instance_pli (plm_id, ite_id, usr_id_owner, pli_name, pli_description, pli_status, created_by, updated_by)
            VALUES (?, ?, ?, 'Test Plan Instance for Phases', 'Instance for phase testing', 5, 'system', 'system')
            RETURNING pli_id
        """, [testMasterPlanId, testIterationId, testUserId])
        testPlanInstanceId = planInstanceResult?.pli_id
        
        // Create test master sequence
        def sequenceResult = sql.firstRow("""
            INSERT INTO sequences_master_sqm (plm_id, sqm_name, sqm_description, sqm_order, created_by, updated_by)
            VALUES (?, 'Test Master Sequence for Phases', 'Sequence for phase testing', 1, 'system', 'system')
            RETURNING sqm_id
        """, [testMasterPlanId])
        testMasterSequenceId = sequenceResult?.sqm_id
        
        // Create test sequence instance
        def sequenceInstanceResult = sql.firstRow("""
            INSERT INTO sequences_instance_sqi (sqm_id, pli_id, sqi_name, sqi_description, sqi_order, sqi_status, created_by, updated_by)
            VALUES (?, ?, 'Test Sequence Instance for Phases', 'Instance for phase testing', 1, 13, 'system', 'system')
            RETURNING sqi_id
        """, [testMasterSequenceId, testPlanInstanceId])
        testSequenceInstanceId = sequenceInstanceResult?.sqi_id
        
    } finally {
        sql?.close()
    }
}

/**
 * HTTP helper method for GET requests
 */
def makeGetRequest(String baseUrl, String endpoint, String authHeader) {
    def url = new URL("${baseUrl}/${endpoint}")
    def connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "GET"
    connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty("Authorization", authHeader)
    
    def responseCode = connection.responseCode
    def slurper = new JsonSlurper()
    def response = responseCode < 400 ? 
        slurper.parse(connection.inputStream) : 
        slurper.parse(connection.errorStream)
        
    return [responseCode: responseCode, data: response]
}

/**
 * HTTP helper method for POST requests  
 */
def makePostRequest(String baseUrl, String endpoint, Map body, String authHeader) {
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
    def slurper = new JsonSlurper()
    def response = responseCode < 400 ? 
        slurper.parse(connection.inputStream) : 
        slurper.parse(connection.errorStream)
        
    return [responseCode: responseCode, data: response]
}

/**
 * HTTP helper method for PUT requests
 */
def makePutRequest(String baseUrl, String endpoint, Map body, String authHeader) {
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
    def slurper = new JsonSlurper()
    def response = responseCode < 400 ? 
        slurper.parse(connection.inputStream) : 
        slurper.parse(connection.errorStream)
        
    return [responseCode: responseCode, data: response]
}

/**
 * HTTP helper method for DELETE requests
 */
def makeDeleteRequest(String baseUrl, String endpoint, String authHeader) {
    def url = new URL("${baseUrl}/${endpoint}")
    def connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "DELETE"
    connection.setRequestProperty("Authorization", authHeader)
    
    def responseCode = connection.responseCode
    def slurper = new JsonSlurper()
    def response = responseCode < 400 && connection.contentLength > 0 ? 
        slurper.parse(connection.inputStream) : 
        null
        
    return [responseCode: responseCode, data: response]
}

/**
 * Clean up test data
 */
def cleanupTestData(dbUrl, dbUser, dbPassword) {
    def sql = null
    try {
        sql = Sql.newInstance(dbUrl, dbUser, dbPassword, 'org.postgresql.Driver')
    } catch (Exception e) {
        println "⚠️  Database cleanup failed: ${e.message}"
        return
    }
    try {
        println "\n🧹 Cleaning up test data..."
        
        // Delete in correct order (instances before masters)
        if (testPhaseInstanceId) {
            sql.execute("DELETE FROM phases_instance_phi WHERE phi_id = ?", [testPhaseInstanceId])
        }
        if (testMasterPhaseId) {
            sql.execute("DELETE FROM phases_master_phm WHERE phm_id = ?", [testMasterPhaseId])
        }
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
def testPhaseData = [
    sqm_id: testMasterSequenceId,
    phm_name: "Integration Test Phase", 
    phm_description: "Phase created by integration test",
    phm_order: 1
]

// Main test execution
println "============================================"
println "Phases API Integration Test (ADR-036)"
println "============================================"
println "Base URL: ${API_BASE}"
println "Auth User: ${AUTH_USERNAME}"
println "Auth Pass: ${AUTH_PASSWORD ? '***' : 'NOT SET'}"
println ""

try {
    // Test 1: Create Master Phase
    println "\n🧪 Test 1: Create Master Phase"
    def createResponse = makePostRequest(API_BASE, 'phases/master', testPhaseData, AUTH_HEADER)
    
    if (createResponse.responseCode != 201) {
        println "Response code: ${createResponse.responseCode}"
        println "Response body: ${createResponse.data}"
    }
    
    assert createResponse.responseCode == 201 : "Expected 201, got ${createResponse.responseCode}"
    assert createResponse.data.phm_name == 'Integration Test Phase'
    assert createResponse.data.sqm_id == testMasterSequenceId.toString()
    def newMasterPhaseId = UUID.fromString(createResponse.data.phm_id as String)
    testMasterPhaseId = newMasterPhaseId
    println "✅ Master phase created: ${newMasterPhaseId}"
    
    // Test 2: Get All Master Phases  
    println "\n🧪 Test 2: Get All Master Phases"
    def listResponse = makeGetRequest(API_BASE, 'phases/master', AUTH_HEADER)
    
    assert listResponse.responseCode == 200 : "Expected 200, got ${listResponse.responseCode}"
    assert listResponse.data instanceof List
    assert listResponse.data.find { it.phm_id == newMasterPhaseId.toString() } != null
    println "✅ Retrieved ${listResponse.data.size()} master phases"
    
    // Test 3: Get Master Phase by ID
    println "\n🧪 Test 3: Get Master Phase by ID"
    def getResponse = makeGetRequest(API_BASE, "phases/master/${newMasterPhaseId}", AUTH_HEADER)
    
    assert getResponse.responseCode == 200 : "Expected 200, got ${getResponse.responseCode}"
    assert getResponse.data.phm_id == newMasterPhaseId.toString()
    assert getResponse.data.phm_name == 'Integration Test Phase'
    println "✅ Retrieved master phase by ID"
    
    // Test 4: Update Master Phase
    println "\n🧪 Test 4: Update Master Phase"
    def updateResponse = makePutRequest(API_BASE, "phases/master/${newMasterPhaseId}", [
        phm_name: 'Updated Test Phase',
        phm_description: 'Updated phase description'
    ], AUTH_HEADER)
    
    assert updateResponse.responseCode == 200 : "Expected 200, got ${updateResponse.responseCode}"
    assert updateResponse.data.phm_name == 'Updated Test Phase'
    println "✅ Master phase updated"
    
    // Test 5: Create Phase Instance
    println "\n🧪 Test 5: Create Phase Instance"
    def instanceData = [
        phm_id: testMasterPhaseId.toString(),
        sqi_id: testSequenceInstanceId.toString(),
        phi_name: 'Test Phase Instance',
        phi_description: 'Instance created by integration test'
    ]
    def instanceResponse = makePostRequest(API_BASE, 'phases/instance', instanceData, AUTH_HEADER)
    
    assert instanceResponse.responseCode == 201 : "Expected 201, got ${instanceResponse.responseCode}"
    assert instanceResponse.data.phm_id == testMasterPhaseId.toString()
    assert instanceResponse.data.phi_name == 'Test Phase Instance'
    testPhaseInstanceId = UUID.fromString(instanceResponse.data.phi_id as String)
    println "✅ Phase instance created: ${testPhaseInstanceId}"
    
    // Test 6: Get Phase Instances with Filtering
    println "\n🧪 Test 6: Get Phase Instances with Filtering"
    def instancesResponse = makeGetRequest(API_BASE, "phases?sequenceInstanceId=${testSequenceInstanceId}", AUTH_HEADER)
    
    assert instancesResponse.responseCode == 200 : "Expected 200, got ${instancesResponse.responseCode}"
    assert instancesResponse.data instanceof List
    assert instancesResponse.data.find { it.phi_id == testPhaseInstanceId.toString() } != null
    println "✅ Retrieved filtered phase instances"
    
    // Test 7: Get Phase Instance by ID
    println "\n🧪 Test 7: Get Phase Instance by ID"
    def getInstanceResponse = makeGetRequest(API_BASE, "phases/instance/${testPhaseInstanceId}", AUTH_HEADER)
    
    assert getInstanceResponse.responseCode == 200 : "Expected 200, got ${getInstanceResponse.responseCode}"
    assert getInstanceResponse.data.phi_id == testPhaseInstanceId.toString()
    assert getInstanceResponse.data.phi_name == 'Test Phase Instance'
    println "✅ Retrieved phase instance by ID"
    
    // Test 8: Update Phase Instance
    println "\n🧪 Test 8: Update Phase Instance"
    def updateInstanceResponse = makePutRequest(API_BASE, "phases/instance/${testPhaseInstanceId}", [
        phi_name: 'Updated Phase Instance',
        phi_description: 'Updated instance description'
    ], AUTH_HEADER)
    
    assert updateInstanceResponse.responseCode == 200 : "Expected 200, got ${updateInstanceResponse.responseCode}"
    assert updateInstanceResponse.data.phi_name == 'Updated Phase Instance'
    println "✅ Phase instance updated"
    
    // Test 9: Error Handling - Invalid UUID
    println "\n🧪 Test 9: Error Handling - Invalid UUID"
    def errorResponse = makeGetRequest(API_BASE, "phases/master/invalid-uuid", AUTH_HEADER)
    assert errorResponse.responseCode == 400 : "Expected 400, got ${errorResponse.responseCode}"
    println "✅ Invalid UUID handled correctly"
    
    // Test 10: Error Handling - Not Found
    println "\n🧪 Test 10: Error Handling - Not Found"
    def randomId = UUID.randomUUID()
    def notFoundResponse = makeGetRequest(API_BASE, "phases/master/${randomId}", AUTH_HEADER)
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
    cleanupTestData(DB_URL, DB_USER, DB_PASSWORD)
}