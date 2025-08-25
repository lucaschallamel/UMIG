#!/usr/bin/env groovy

/**
 * Integration test for Plan deletion functionality.
 * Tests the DELETE /plans/master/{id} endpoint following ADR-036 pure Groovy testing framework.
 * 
 * Created: 2025-08-22
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * Coverage: Master plan deletion, error scenarios, business logic validation
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

// Initialize JsonSlurper
def jsonSlurper = new JsonSlurper()

// Test data variables
def testTeamId = null
def testUserId = null
def testMasterPlanId = null
def testIterationId = null
def testMigrationId = null

/**
 * Setup test data by querying actual database for valid IDs
 */
def setupTestData() {
    def sql = null
    try {
        sql = Sql.newInstance(DB_URL, DB_USER, DB_PASSWORD, 'org.postgresql.Driver')
        
        // Get first team ID
        def team = sql.firstRow("SELECT tms_id FROM teams_tms LIMIT 1")
        testTeamId = team?.tms_id
        
        // Get first user ID
        def user = sql.firstRow("SELECT usr_id FROM users_usr LIMIT 1")
        testUserId = user?.usr_id
        
        // Create test migration for iterations
        def migrationResult = sql.firstRow("""
            INSERT INTO migrations_mig (usr_id_owner, mig_name, mig_type, mig_status, created_by, updated_by)
            VALUES (?, 'Test Migration for Plan Deletion', 'MIGRATION', 5, 'system', 'system')
            RETURNING mig_id
        """, [testUserId])
        testMigrationId = migrationResult?.mig_id
        
        println "Setup complete: teamId=${testTeamId}, userId=${testUserId}, migrationId=${testMigrationId}"
        
    } catch (Exception e) {
        println "⚠️  Database setup failed: ${e.message}"
        throw e
    } finally {
        sql?.close()
    }
}

/**
 * HTTP helper method for GET requests
 */
def makeGetRequest(String endpoint) {
    def url = new URL("${API_BASE}/${endpoint}")
    def connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "GET"
    connection.setRequestProperty("Accept", "application/json")
    connection.setRequestProperty("Authorization", AUTH_HEADER)
    
    def responseCode = connection.responseCode
    def response = null
    
    try {
        response = responseCode < 400 ? 
            jsonSlurper.parse(connection.inputStream) : 
            jsonSlurper.parse(connection.errorStream)
    } catch (Exception e) {
        // Handle empty responses
        response = [:]
    }
        
    return [responseCode: responseCode, data: response]
}

/**
 * HTTP helper method for POST requests
 */
def makePostRequest(String endpoint, Map body) {
    def url = new URL("${API_BASE}/${endpoint}")
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
 * HTTP helper method for DELETE requests
 */
def makeDeleteRequest(String endpoint) {
    def url = new URL("${API_BASE}/${endpoint}")
    def connection = url.openConnection() as HttpURLConnection
    connection.requestMethod = "DELETE"
    connection.setRequestProperty("Authorization", AUTH_HEADER)
    
    def responseCode = connection.responseCode
    def response = null
    
    try {
        if (responseCode < 400 && connection.contentLength != 0) {
            response = jsonSlurper.parse(connection.inputStream)
        } else if (responseCode >= 400) {
            response = jsonSlurper.parse(connection.errorStream)
        } else {
            response = [success: true] // Empty successful response
        }
    } catch (Exception e) {
        response = [success: true] // Handle empty responses as success
    }
        
    return [responseCode: responseCode, data: response]
}

/**
 * Create a test master plan for deletion testing
 */
def createTestPlan() {
    def planData = [
        tms_id: testTeamId,
        plm_name: "Test Plan for Deletion - ${System.currentTimeMillis()}",
        plm_description: "Test plan created for deletion testing",
        plm_status: 5  // PLANNING status ID
    ]
    
    def response = makePostRequest('plans/master', planData)
    assert response.responseCode == 201 : "Test plan creation should succeed, got ${response.responseCode}"
    
    testMasterPlanId = response.data.plm_id
    println "Created test plan: ${testMasterPlanId}"
    return testMasterPlanId
}

/**
 * Create a test iteration for plan instance testing
 */
def createTestIteration(String masterPlanId) {
    def sql = null
    try {
        sql = Sql.newInstance(DB_URL, DB_USER, DB_PASSWORD, 'org.postgresql.Driver')
        
        def iterationResult = sql.firstRow("""
            INSERT INTO iterations_ite (mig_id, plm_id, itt_code, ite_name, ite_description, ite_status, created_by, updated_by)
            VALUES (?, ?, 'CUTOVER', 'Test Iteration for Plan Deletion', 'Test iteration', 5, 'system', 'system')
            RETURNING ite_id
        """, [testMigrationId, UUID.fromString(masterPlanId)])
        
        testIterationId = iterationResult?.ite_id
        println "Created test iteration: ${testIterationId}"
        return testIterationId.toString()
        
    } finally {
        sql?.close()
    }
}

/**
 * Clean up test data
 */
def cleanupTestData() {
    def sql = null
    try {
        sql = Sql.newInstance(DB_URL, DB_USER, DB_PASSWORD, 'org.postgresql.Driver')
        
        println "\n🧹 Cleaning up test data..."
        
        // Clean up in correct order
        if (testIterationId) {
            sql.execute("DELETE FROM iterations_ite WHERE ite_id = ?", [testIterationId])
        }
        if (testMasterPlanId) {
            sql.execute("DELETE FROM plans_master_plm WHERE plm_id = ?", [UUID.fromString(testMasterPlanId)])
        }
        if (testMigrationId) {
            sql.execute("DELETE FROM migrations_mig WHERE mig_id = ?", [testMigrationId])
        }
        
        println "✅ Test data cleaned up"
        
    } catch (Exception e) {
        println "⚠️  Failed to cleanup test data: ${e.message}"
    } finally {
        sql?.close()
    }
}

// Main test execution
println "============================================"
println "Plan Deletion API Integration Test (ADR-036)"
println "============================================"
println "Base URL: ${API_BASE}"
println ""

try {
    // Setup
    setupTestData()
    
    // Test 1: Delete Master Plan Success
    println "\n🧪 Test 1: Delete Master Plan Successfully"
    def planToDelete = createTestPlan()
    
    // Verify plan exists
    def getResponse = makeGetRequest("plans/master/${planToDelete}")
    assert getResponse.responseCode == 200 : "Plan should exist before deletion, got ${getResponse.responseCode}"
    println "✓ Confirmed plan exists before deletion"
    
    // Delete the plan
    def deleteResponse = makeDeleteRequest("plans/master/${planToDelete}")
    println "Delete response code: ${deleteResponse.responseCode}"
    println "Delete response data: ${deleteResponse.data}"
    
    assert deleteResponse.responseCode == 200 : "Delete should succeed, got ${deleteResponse.responseCode}"
    assert deleteResponse.data.success == true : "Response should indicate success"
    println "✅ Master plan deleted successfully"
    
    // Verify plan no longer exists
    def verifyResponse = makeGetRequest("plans/master/${planToDelete}")
    assert verifyResponse.responseCode == 404 : "Plan should not exist after deletion, got ${verifyResponse.responseCode}"
    println "✓ Confirmed plan no longer exists"
    
    // Test 2: Delete Non-existent Plan
    println "\n🧪 Test 2: Delete Non-existent Plan"
    def nonExistentId = UUID.randomUUID().toString()
    
    def notFoundResponse = makeDeleteRequest("plans/master/${nonExistentId}")
    assert notFoundResponse.responseCode == 404 : "Delete should return 404 for non-existent plan, got ${notFoundResponse.responseCode}"
    assert notFoundResponse.data.error == "Master plan not found" : "Should have appropriate error message"
    println "✅ Non-existent plan handled correctly"
    
    // Test 3: Delete Plan with Instances (should fail)
    println "\n🧪 Test 3: Delete Plan with Instances"
    def planWithInstances = createTestPlan()
    def iterationId = createTestIteration(planWithInstances)
    
    // Create a plan instance
    def instanceData = [
        plm_id: planWithInstances,
        ite_id: iterationId,
        usr_id_owner: testUserId
    ]
    def createInstanceResponse = makePostRequest('plans/instance', instanceData)
    assert createInstanceResponse.responseCode == 201 : "Instance creation should succeed"
    println "✓ Created plan instance for testing"
    
    // Try to delete master plan with instances
    def conflictResponse = makeDeleteRequest("plans/master/${planWithInstances}")
    assert conflictResponse.responseCode == 409 : "Delete should fail with instances, got ${conflictResponse.responseCode}"
    assert conflictResponse.data.error == "Cannot delete master plan with active instances" : "Should have appropriate error message"
    println "✅ Plan with instances correctly rejected"
    
    // Clean up instance before plan
    def instanceId = createInstanceResponse.data.pli_id
    makeDeleteRequest("plans/instance/${instanceId}")
    makeDeleteRequest("plans/master/${planWithInstances}") // Now should succeed
    
    // Test 4: Delete Plan with Invalid ID
    println "\n🧪 Test 4: Delete Plan with Invalid UUID"
    def invalidId = "not-a-uuid"
    
    def invalidResponse = makeDeleteRequest("plans/master/${invalidId}")
    assert invalidResponse.responseCode == 400 : "Delete should return 400 for invalid UUID, got ${invalidResponse.responseCode}"
    assert invalidResponse.data.error == "Invalid plan ID format" : "Should have appropriate error message"
    println "✅ Invalid UUID handled correctly"
    
    println "\n============================================"
    println "✅ All plan deletion tests passed!"
    println "============================================"
    
} catch (Exception e) {
    println "\n❌ Test failed: ${e.class.simpleName}: ${e.message}"
    e.printStackTrace()
    System.exit(1)
} finally {
    cleanupTestData()
}