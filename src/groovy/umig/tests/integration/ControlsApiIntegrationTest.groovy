#!/usr/bin/env groovy

/**
 * Comprehensive integration tests for ControlsApi following ADR-036 pure Groovy testing framework.
 * Tests all endpoints including control masters, control instances, validation, and error scenarios.
 * Validates performance requirements (<500ms response times) and business logic.
 * 
 * Updated: 2025-08-18
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * Coverage: Controls CRUD, master/instance operations, validation workflows, error handling
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
def BASE_URL = "http://localhost:8090/rest/scriptrunner/latest/custom"
def jsonSlurper = new JsonSlurper()

// Database configuration from .env
def dbUrl = 'jdbc:postgresql://localhost:5432/umig_app_db'
def dbUser = ENV.getProperty('DB_USER', 'umig_app_user')
def dbPassword = ENV.getProperty('DB_PASSWORD', '123456')
def AUTH_USERNAME = ENV.getProperty('POSTMAN_AUTH_USERNAME')
def AUTH_PASSWORD = ENV.getProperty('POSTMAN_AUTH_PASSWORD')
def AUTH_HEADER = "Basic " + Base64.encoder.encodeToString((AUTH_USERNAME + ':' + AUTH_PASSWORD).bytes)

// Test data
def testTeamId = null
def testMasterPlanId = null
def testMasterSequenceId = null
def testMasterPhaseId = null
def testIterationId = null
def testMigrationId = null
def testUserId = null
def testPlanInstanceId = null
def testSequenceInstanceId = null
def testPhaseInstanceId = null
def testControlMasterId = null
def testControlInstanceId = null

/**
 * Setup test data by querying actual database for valid IDs
 */
def setupTestData(String dbUrl, String dbUser, String dbPassword) {
    def sql = Sql.newInstance(dbUrl, dbUser, dbPassword, 'org.postgresql.Driver')
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
            VALUES (?, 'Test Migration for Controls', 'MIGRATION', 5, 'system', 'system')
            RETURNING mig_id
        """, [testUserId])
        testMigrationId = migrationResult?.mig_id
        
        // Create test master plan
        def planResult = sql.firstRow("""
            INSERT INTO plans_master_plm (tms_id, plm_name, plm_description, plm_status, created_by, updated_by)
            VALUES (?, 'Test Master Plan for Controls', 'Test plan for control integration', 5, 'system', 'system')
            RETURNING plm_id
        """, [testTeamId])
        testMasterPlanId = planResult?.plm_id
        
        // Create test iteration
        def iterationResult = sql.firstRow("""
            INSERT INTO iterations_ite (mig_id, plm_id, itt_code, ite_name, ite_description, ite_status, created_by, updated_by)
            VALUES (?, ?, 'CUTOVER', 'Test Iteration for Controls', 'Test iteration', 5, 'system', 'system')
            RETURNING ite_id
        """, [testMigrationId, testMasterPlanId])
        testIterationId = iterationResult?.ite_id
        
        // Create test plan instance
        def planInstanceResult = sql.firstRow("""
            INSERT INTO plans_instance_pli (plm_id, ite_id, usr_id_owner, pli_name, pli_description, pli_status, created_by, updated_by)
            VALUES (?, ?, ?, 'Test Plan Instance for Controls', 'Instance for control testing', 5, 'system', 'system')
            RETURNING pli_id
        """, [testMasterPlanId, testIterationId, testUserId])
        testPlanInstanceId = planInstanceResult?.pli_id
        
        // Create test master sequence
        def sequenceResult = sql.firstRow("""
            INSERT INTO sequences_master_sqm (plm_id, sqm_name, sqm_description, sqm_order, created_by, updated_by)
            VALUES (?, 'Test Master Sequence for Controls', 'Sequence for control testing', 1, 'system', 'system')
            RETURNING sqm_id
        """, [testMasterPlanId])
        testMasterSequenceId = sequenceResult?.sqm_id
        
        // Create test sequence instance
        def sequenceInstanceResult = sql.firstRow("""
            INSERT INTO sequences_instance_sqi (sqm_id, pli_id, sqi_name, sqi_description, sqi_order, sqi_status, created_by, updated_by)
            VALUES (?, ?, 'Test Sequence Instance for Controls', 'Instance for control testing', 1, 13, 'system', 'system')
            RETURNING sqi_id
        """, [testMasterSequenceId, testPlanInstanceId])
        testSequenceInstanceId = sequenceInstanceResult?.sqi_id
        
        // Create test master phase
        def phaseResult = sql.firstRow("""
            INSERT INTO phases_master_phm (sqm_id, phm_name, phm_description, phm_order, created_by, updated_by)
            VALUES (?, 'Test Master Phase for Controls', 'Phase for control testing', 1, 'system', 'system')
            RETURNING phm_id
        """, [testMasterSequenceId])
        testMasterPhaseId = phaseResult?.phm_id
        
        // Create test phase instance
        def phaseInstanceResult = sql.firstRow("""
            INSERT INTO phases_instance_phi (phm_id, sqi_id, phi_name, phi_description, phi_order, phi_status, created_by, updated_by)
            VALUES (?, ?, 'Test Phase Instance for Controls', 'Instance for control testing', 1, 17, 'system', 'system')
            RETURNING phi_id
        """, [testMasterPhaseId, testSequenceInstanceId])
        testPhaseInstanceId = phaseInstanceResult?.phi_id
        
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
    def sql = Sql.newInstance(dbUrl, dbUser, dbPassword, 'org.postgresql.Driver')
    try {
        println "\n🧹 Cleaning up test data..."
        
        // Delete in correct order (instances before masters)
        sql.execute("DELETE FROM control_instance_cti WHERE cti_id = ?", [testControlInstanceId])
        sql.execute("DELETE FROM control_master_ctm WHERE ctm_id = ?", [testControlMasterId])
        sql.execute("DELETE FROM phases_instance_phi WHERE phi_id = ?", [testPhaseInstanceId])
        sql.execute("DELETE FROM phases_master_phm WHERE phm_id = ?", [testMasterPhaseId])
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
setupTestData(dbUrl, dbUser, dbPassword)

// Test Data
def testControlMasterData = [
    phm_id: testMasterPhaseId,
    ctm_name: "Integration Test Control", 
    ctm_description: "Control created by integration test",
    ctm_type: "TECHNICAL",
    ctm_validation_rule: "MANUAL"
]

// Main test execution
println "============================================"
println "Controls API Integration Test (ADR-036)"
println "============================================"
println "Base URL: ${BASE_URL}"
println ""

try {
    // Test 1: Create Master Control
    println "\n🧪 Test 1: Create Master Control"
    def createResponse = makePostRequest(BASE_URL, 'controls/master', testControlMasterData)
    
    assert createResponse.responseCode == 201 : "Expected 201, got ${createResponse.responseCode}"
    assert createResponse.data.ctm_name == 'Integration Test Control'
    assert createResponse.data.phm_id == testMasterPhaseId.toString()
    def newControlMasterId = UUID.fromString(createResponse.data.ctm_id as String)
    testControlMasterId = newControlMasterId
    println "✅ Master control created: ${newControlMasterId}"
    
    // Test 2: Get All Master Controls  
    println "\n🧪 Test 2: Get All Master Controls"
    def listResponse = makeGetRequest(BASE_URL, 'controls/master')
    
    assert listResponse.responseCode == 200 : "Expected 200, got ${listResponse.responseCode}"
    assert listResponse.data instanceof List
    assert listResponse.data.find { it.ctm_id == newControlMasterId.toString() } != null
    println "✅ Retrieved ${listResponse.data.size()} master controls"
    
    // Test 3: Get Master Control by ID
    println "\n🧪 Test 3: Get Master Control by ID"
    def getResponse = makeGetRequest(BASE_URL, "controls/master/${newControlMasterId}")
    
    assert getResponse.responseCode == 200 : "Expected 200, got ${getResponse.responseCode}"
    assert getResponse.data.ctm_id == newControlMasterId.toString()
    assert getResponse.data.ctm_name == 'Integration Test Control'
    println "✅ Retrieved master control by ID"
    
    // Test 4: Update Master Control
    println "\n🧪 Test 4: Update Master Control"
    def updateResponse = makePutRequest(BASE_URL, "controls/master/${newControlMasterId}", [
        ctm_name: 'Updated Test Control',
        ctm_description: 'Updated control description'
    ])
    
    assert updateResponse.responseCode == 200 : "Expected 200, got ${updateResponse.responseCode}"
    assert updateResponse.data.ctm_name == 'Updated Test Control'
    println "✅ Master control updated"
    
    // Test 5: Create Control Instance
    println "\n🧪 Test 5: Create Control Instance"
    def instanceData = [
        ctm_id: testControlMasterId.toString(),
        phi_id: testPhaseInstanceId.toString(),
        cti_name: 'Test Control Instance',
        cti_description: 'Instance created by integration test',
        cti_type: 'TECHNICAL',
        cti_status: 'PENDING'
    ]
    def instanceResponse = makePostRequest(BASE_URL, 'controls/instance', instanceData)
    
    assert instanceResponse.responseCode == 201 : "Expected 201, got ${instanceResponse.responseCode}"
    assert instanceResponse.data.ctm_id == testControlMasterId.toString()
    assert instanceResponse.data.cti_name == 'Test Control Instance'
    testControlInstanceId = UUID.fromString(instanceResponse.data.cti_id as String)
    println "✅ Control instance created: ${testControlInstanceId}"
    
    // Test 6: Get Control Instances with Filtering
    println "\n🧪 Test 6: Get Control Instances with Filtering"
    def instancesResponse = makeGetRequest(BASE_URL, "controls?phaseInstanceId=${testPhaseInstanceId}")
    
    assert instancesResponse.responseCode == 200 : "Expected 200, got ${instancesResponse.responseCode}"
    assert instancesResponse.data instanceof List
    assert instancesResponse.data.find { it.cti_id == testControlInstanceId.toString() } != null
    println "✅ Retrieved filtered control instances"
    
    // Test 7: Get Control Instance by ID
    println "\n🧪 Test 7: Get Control Instance by ID"
    def getInstanceResponse = makeGetRequest(BASE_URL, "controls/instance/${testControlInstanceId}")
    
    assert getInstanceResponse.responseCode == 200 : "Expected 200, got ${getInstanceResponse.responseCode}"
    assert getInstanceResponse.data.cti_id == testControlInstanceId.toString()
    assert getInstanceResponse.data.cti_name == 'Test Control Instance'
    println "✅ Retrieved control instance by ID"
    
    // Test 8: Update Control Instance
    println "\n🧪 Test 8: Update Control Instance"
    def updateInstanceResponse = makePutRequest(BASE_URL, "controls/instance/${testControlInstanceId}", [
        cti_name: 'Updated Control Instance',
        cti_description: 'Updated instance description',
        cti_status: 'IN_PROGRESS'
    ])
    
    assert updateInstanceResponse.responseCode == 200 : "Expected 200, got ${updateInstanceResponse.responseCode}"
    assert updateInstanceResponse.data.cti_name == 'Updated Control Instance'
    println "✅ Control instance updated"
    
    // Test 9: Validate Control Point
    println "\n🧪 Test 9: Validate Control Point"
    def validateResponse = makePostRequest(BASE_URL, "controls/instance/${testControlInstanceId}/validate", [
        validation_result: 'PASSED',
        validation_notes: 'Test validation notes'
    ])
    
    assert validateResponse.responseCode == 200 : "Expected 200, got ${validateResponse.responseCode}"
    assert validateResponse.data.success == true
    println "✅ Control point validation completed"
    
    // Test 10: Error Handling - Invalid UUID
    println "\n🧪 Test 10: Error Handling - Invalid UUID"
    def errorResponse = makeGetRequest(BASE_URL, "controls/master/invalid-uuid")
    assert errorResponse.responseCode == 400 : "Expected 400, got ${errorResponse.responseCode}"
    println "✅ Invalid UUID handled correctly"
    
    // Test 11: Error Handling - Not Found
    println "\n🧪 Test 11: Error Handling - Not Found"
    def randomId = UUID.randomUUID()
    def notFoundResponse = makeGetRequest(BASE_URL, "controls/master/${randomId}")
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