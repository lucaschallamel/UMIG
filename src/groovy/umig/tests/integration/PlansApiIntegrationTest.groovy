#!/usr/bin/env groovy
/**
 * Integration Test for Plans API
 * Tests the Plans API endpoints against a live database
 * 
 * Prerequisites:
 * - Running PostgreSQL database from local-dev-setup
 * - Database initialized with schema
 * 
 * Run from project root: ./src/groovy/umig/tests/run-integration-tests.sh
 */

@Grab('org.postgresql:postgresql:42.7.3')
@Grab('org.codehaus.groovy.modules.http-builder:http-builder:0.7.1')

import groovy.sql.Sql
import groovyx.net.http.RESTClient
import groovyx.net.http.ContentType
import groovyx.net.http.HttpResponseException
import java.util.UUID

// Database configuration
def dbUrl = System.getenv('DATABASE_URL') ?: 'jdbc:postgresql://localhost:5432/umig_db'
def dbUser = System.getenv('DATABASE_USER') ?: 'umig_user'
def dbPassword = System.getenv('DATABASE_PASSWORD') ?: 'umig_password'
def dbDriver = 'org.postgresql.Driver'

// API configuration
def apiBaseUrl = System.getenv('API_BASE_URL') ?: 'http://localhost:8090'
def apiPath = '/rest/scriptrunner/latest/custom'

// Test data
def testTeamId = null
def testMasterPlanId = null
def testIterationId = null
def testUserId = null
def testPlanInstanceId = null

println "============================================"
println "Plans API Integration Test"
println "============================================"
println "Database URL: ${dbUrl}"
println "API Base URL: ${apiBaseUrl}${apiPath}"
println ""

def sql = null
def client = null

try {
    // Connect to database
    sql = Sql.newInstance(dbUrl, dbUser, dbPassword, dbDriver)
    println "✅ Connected to database"
    
    // Create REST client
    client = new RESTClient("${apiBaseUrl}${apiPath}/")
    client.contentType = ContentType.JSON
    println "✅ Created REST client"
    
    // Setup test data
    println "\n📋 Setting up test data..."
    
    // Create test team
    def teamResult = sql.firstRow("""
        INSERT INTO teams_tms (tms_name, tms_email, tms_description, created_by, updated_by)
        VALUES ('Integration Test Team', 'test@example.com', 'Team for integration tests', 'system', 'system')
        RETURNING tms_id
    """)
    testTeamId = teamResult.tms_id
    println "  Created test team: ${testTeamId}"
    
    // Create test user
    def userResult = sql.firstRow("""
        INSERT INTO users_usr (usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, usr_confluence_user_id, created_by, updated_by)
        VALUES ('TST', 'Test', 'User', 'test.user@example.com', false, 'testuser', 'system', 'system')
        RETURNING usr_id
    """)
    testUserId = userResult.usr_id
    println "  Created test user: ${testUserId}"
    
    // Create test migration and iteration
    def migrationResult = sql.firstRow("""
        INSERT INTO migrations_mig (mig_code, mig_name, mig_status, created_by, updated_by)
        VALUES ('TEST', 'Test Migration', 'ACTIVE', 'system', 'system')
        RETURNING mig_id
    """)
    def testMigrationId = migrationResult.mig_id
    println "  Created test migration: ${testMigrationId}"
    
    def iterationResult = sql.firstRow("""
        INSERT INTO iterations_itr (itr_code, itr_name, itr_type, mig_id, created_by, updated_by)
        VALUES ('TST-IT1', 'Test Iteration', 'CUTOVER', :migId, 'system', 'system')
        RETURNING itr_id
    """, [migId: testMigrationId])
    testIterationId = iterationResult.itr_id
    println "  Created test iteration: ${testIterationId}"
    
    // Test 1: Create Master Plan
    println "\n🧪 Test 1: Create Master Plan"
    def createResponse = client.post(
        path: 'plans/master',
        body: [
            tms_id: testTeamId,
            plm_name: 'Integration Test Plan',
            plm_description: 'Plan created by integration test',
            plm_status: 'DRAFT'
        ]
    )
    
    assert createResponse.status == 201
    assert createResponse.data.plm_name == 'Integration Test Plan'
    assert createResponse.data.tms_id == testTeamId
    testMasterPlanId = UUID.fromString(createResponse.data.plm_id as String)
    println "✅ Master plan created: ${testMasterPlanId}"
    
    // Test 2: Get All Master Plans
    println "\n🧪 Test 2: Get All Master Plans"
    def listResponse = client.get(path: 'plans/master')
    
    assert listResponse.status == 200
    assert listResponse.data instanceof List
    assert listResponse.data.find { it.plm_id == testMasterPlanId.toString() } != null
    println "✅ Retrieved ${listResponse.data.size()} master plans"
    
    // Test 3: Get Master Plan by ID
    println "\n🧪 Test 3: Get Master Plan by ID"
    def getResponse = client.get(path: "plans/master/${testMasterPlanId}")
    
    assert getResponse.status == 200
    assert getResponse.data.plm_id == testMasterPlanId.toString()
    assert getResponse.data.plm_name == 'Integration Test Plan'
    println "✅ Retrieved master plan by ID"
    
    // Test 4: Update Master Plan
    println "\n🧪 Test 4: Update Master Plan"
    def updateResponse = client.put(
        path: "plans/master/${testMasterPlanId}",
        body: [
            plm_name: 'Updated Test Plan',
            plm_description: 'Updated description'
        ]
    )
    
    assert updateResponse.status == 200
    assert updateResponse.data.plm_name == 'Updated Test Plan'
    assert updateResponse.data.plm_description == 'Updated description'
    println "✅ Master plan updated"
    
    // Test 5: Create Plan Instance
    println "\n🧪 Test 5: Create Plan Instance"
    def instanceResponse = client.post(
        path: 'plans/instance',
        body: [
            plm_id: testMasterPlanId.toString(),
            ite_id: testIterationId.toString(),
            usr_id_owner: testUserId,
            pli_name: 'Test Instance Override'
        ]
    )
    
    assert instanceResponse.status == 201
    assert instanceResponse.data.plm_id == testMasterPlanId.toString()
    assert instanceResponse.data.pli_name == 'Test Instance Override'
    testPlanInstanceId = UUID.fromString(instanceResponse.data.pli_id as String)
    println "✅ Plan instance created: ${testPlanInstanceId}"
    
    // Test 6: Get Plan Instances with Filtering
    println "\n🧪 Test 6: Get Plan Instances with Filtering"
    def instancesResponse = client.get(
        path: 'plans',
        query: [iterationId: testIterationId.toString()]
    )
    
    assert instancesResponse.status == 200
    assert instancesResponse.data instanceof List
    assert instancesResponse.data.find { it.pli_id == testPlanInstanceId.toString() } != null
    println "✅ Retrieved filtered plan instances"
    
    // Test 7: Get Plan Instance by ID
    println "\n🧪 Test 7: Get Plan Instance by ID"
    def instanceGetResponse = client.get(path: "plans/instance/${testPlanInstanceId}")
    
    assert instanceGetResponse.status == 200
    assert instanceGetResponse.data.pli_id == testPlanInstanceId.toString()
    assert instanceGetResponse.data.pli_name == 'Test Instance Override'
    println "✅ Retrieved plan instance by ID"
    
    // Test 8: Update Plan Instance Status
    println "\n🧪 Test 8: Update Plan Instance Status"
    
    // First, create a status if needed
    def statusCheck = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = 'IN_PROGRESS' AND sts_type = 'Plan'")
    def statusId = statusCheck?.sts_id
    if (!statusId) {
        def statusResult = sql.firstRow("""
            INSERT INTO status_sts (sts_name, sts_type, sts_color, created_by, updated_by)
            VALUES ('IN_PROGRESS', 'Plan', '#0000FF', 'system', 'system')
            RETURNING sts_id
        """)
        statusId = statusResult.sts_id
    }
    
    def statusResponse = client.put(
        path: "plans/${testPlanInstanceId}/status",
        body: [statusId: statusId]
    )
    
    assert statusResponse.status == 200
    println "✅ Plan instance status updated"
    
    // Test 9: Update Plan Instance
    println "\n🧪 Test 9: Update Plan Instance"
    def instanceUpdateResponse = client.put(
        path: "plans/instance/${testPlanInstanceId}",
        body: [
            pli_name: 'Updated Instance Name',
            pli_description: 'Updated instance description'
        ]
    )
    
    assert instanceUpdateResponse.status == 200
    assert instanceUpdateResponse.data.pli_name == 'Updated Instance Name'
    println "✅ Plan instance updated"
    
    // Test 10: Delete Plan Instance
    println "\n🧪 Test 10: Delete Plan Instance"
    def deleteInstanceResponse = client.delete(path: "plans/instance/${testPlanInstanceId}")
    
    assert deleteInstanceResponse.status == 204
    println "✅ Plan instance deleted"
    
    // Test 11: Delete Master Plan
    println "\n🧪 Test 11: Delete Master Plan"
    def deleteResponse = client.delete(path: "plans/master/${testMasterPlanId}")
    
    assert deleteResponse.status == 204
    println "✅ Master plan deleted"
    
    // Test 12: Error Handling - Invalid UUID
    println "\n🧪 Test 12: Error Handling - Invalid UUID"
    try {
        client.get(path: "plans/master/invalid-uuid")
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        assert e.response.status == 400
        println "✅ Invalid UUID handled correctly"
    }
    
    // Test 13: Error Handling - Not Found
    println "\n🧪 Test 13: Error Handling - Not Found"
    try {
        def randomId = UUID.randomUUID()
        client.get(path: "plans/master/${randomId}")
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        assert e.response.status == 404
        println "✅ Not found handled correctly"
    }
    
    println "\n============================================"
    println "✅ All tests passed!"
    println "============================================"
    
} catch (Exception e) {
    println "\n❌ Test failed: ${e.message}"
    e.printStackTrace()
    System.exit(1)
} finally {
    // Cleanup test data
    if (sql) {
        try {
            println "\n🧹 Cleaning up test data..."
            
            // Delete in reverse order of creation
            if (testPlanInstanceId) {
                sql.execute("DELETE FROM plans_instance_pli WHERE pli_id = ?", [testPlanInstanceId])
            }
            if (testMasterPlanId) {
                sql.execute("DELETE FROM plans_master_plm WHERE plm_id = ?", [testMasterPlanId])
            }
            if (testIterationId) {
                sql.execute("DELETE FROM iterations_itr WHERE itr_id = ?", [testIterationId])
                sql.execute("DELETE FROM migrations_mig WHERE mig_id IN (SELECT mig_id FROM iterations_itr WHERE itr_id = ?)", [testIterationId])
            }
            if (testUserId) {
                sql.execute("DELETE FROM users_usr WHERE usr_id = ?", [testUserId])
            }
            if (testTeamId) {
                sql.execute("DELETE FROM teams_tms WHERE tms_id = ?", [testTeamId])
            }
            
            println "✅ Test data cleaned up"
        } catch (Exception e) {
            println "⚠️  Failed to cleanup test data: ${e.message}"
        }
        sql.close()
    }
}