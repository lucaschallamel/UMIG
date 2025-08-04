#!/usr/bin/env groovy
/**
 * Integration Test for Sequences API
 * Tests the Sequences API endpoints against a live database
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
def dbUrl = System.getenv('DATABASE_URL') ?: 'jdbc:postgresql://postgres:5432/umig_app_db'
def dbUser = System.getenv('DATABASE_USER') ?: 'umig_app_user'
def dbPassword = System.getenv('DATABASE_PASSWORD') ?: '123456'
def dbDriver = 'org.postgresql.Driver'

// API configuration
def apiBaseUrl = System.getenv('API_BASE_URL') ?: 'http://localhost:8090'
def apiPath = '/rest/scriptrunner/latest/custom'

// Test data
def testTeamId = null
def testMasterPlanId = null
def testMasterSequenceId = null
def testIterationId = null
def testUserId = null
def testPlanInstanceId = null
def testSequenceInstanceId = null
def testMigrationId = null

println "============================================"
println "Sequences API Integration Test"
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
        VALUES ('Sequences Test Team', 'sequences-test@example.com', 'Team for sequences integration tests', 'system', 'system')
        RETURNING tms_id
    """)
    testTeamId = teamResult.tms_id
    println "  Created test team: ${testTeamId}"
    
    // Create test user
    def userResult = sql.firstRow("""
        INSERT INTO users_usr (usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, usr_confluence_user_id, created_by, updated_by)
        VALUES ('SEQ', 'Sequence', 'Tester', 'sequence.tester@example.com', false, 'seqtester', 'system', 'system')
        RETURNING usr_id
    """)
    testUserId = userResult.usr_id
    println "  Created test user: ${testUserId}"
    
    // Create test migration and iteration
    def migrationResult = sql.firstRow("""
        INSERT INTO migrations_mig (mig_code, mig_name, mig_status, created_by, updated_by)
        VALUES ('SEQ-TEST', 'Sequence Test Migration', 'ACTIVE', 'system', 'system')
        RETURNING mig_id
    """)
    testMigrationId = migrationResult.mig_id
    println "  Created test migration: ${testMigrationId}"
    
    def iterationResult = sql.firstRow("""
        INSERT INTO iterations_ite (itr_code, itr_name, itr_type, mig_id, created_by, updated_by)
        VALUES ('SEQ-IT1', 'Sequence Test Iteration', 'CUTOVER', :migId, 'system', 'system')
        RETURNING itr_id
    """, [migId: testMigrationId])
    testIterationId = iterationResult.itr_id
    println "  Created test iteration: ${testIterationId}"
    
    // Create test master plan
    def planResult = sql.firstRow("""
        INSERT INTO plans_master_plm (tms_id, plm_name, plm_description, plm_status, created_by, updated_by)
        VALUES (:teamId, 'Sequence Test Plan', 'Plan for sequence testing', 'DRAFT', 'system', 'system')
        RETURNING plm_id
    """, [teamId: testTeamId])
    testMasterPlanId = planResult.plm_id
    println "  Created test master plan: ${testMasterPlanId}"
    
    // Create test plan instance
    def planInstanceResult = sql.firstRow("""
        INSERT INTO plans_instance_pli (plm_id, ite_id, usr_id_owner, pli_name, pli_description, created_by, updated_by)
        VALUES (:planId, :iterationId, :userId, 'Sequence Test Plan Instance', 'Instance for sequence testing', 'system', 'system')
        RETURNING pli_id
    """, [planId: testMasterPlanId, iterationId: testIterationId, userId: testUserId])
    testPlanInstanceId = planInstanceResult.pli_id
    println "  Created test plan instance: ${testPlanInstanceId}"
    
    // Test 1: Create Master Sequence
    println "\n🧪 Test 1: Create Master Sequence"
    def createMasterResponse = client.post(
        path: 'sequences/master',
        body: [
            plm_id: testMasterPlanId.toString(),
            sqm_name: 'Integration Test Sequence',
            sqm_description: 'Sequence created by integration test',
            sqm_order: 1
        ]
    )
    
    assert createMasterResponse.status == 201
    assert createMasterResponse.data.sqm_name == 'Integration Test Sequence'
    assert createMasterResponse.data.plm_id == testMasterPlanId.toString()
    testMasterSequenceId = UUID.fromString(createMasterResponse.data.sqm_id as String)
    println "✅ Master sequence created: ${testMasterSequenceId}"
    
    // Test 2: Get All Master Sequences
    println "\n🧪 Test 2: Get All Master Sequences"
    def listMasterResponse = client.get(path: 'sequences/master')
    
    assert listMasterResponse.status == 200
    assert listMasterResponse.data instanceof List
    assert listMasterResponse.data.find { it.sqm_id == testMasterSequenceId.toString() } != null
    println "✅ Retrieved ${listMasterResponse.data.size()} master sequences"
    
    // Test 3: Get Master Sequence by ID
    println "\n🧪 Test 3: Get Master Sequence by ID"
    def getMasterResponse = client.get(path: "sequences/master/${testMasterSequenceId}")
    
    assert getMasterResponse.status == 200
    assert getMasterResponse.data.sqm_id == testMasterSequenceId.toString()
    assert getMasterResponse.data.sqm_name == 'Integration Test Sequence'
    println "✅ Retrieved master sequence by ID"
    
    // Test 4: Update Master Sequence
    println "\n🧪 Test 4: Update Master Sequence"
    def updateMasterResponse = client.put(
        path: "sequences/master/${testMasterSequenceId}",
        body: [
            sqm_name: 'Updated Test Sequence',
            sqm_description: 'Updated sequence description'
        ]
    )
    
    assert updateMasterResponse.status == 200
    assert updateMasterResponse.data.sqm_name == 'Updated Test Sequence'
    assert updateMasterResponse.data.sqm_description == 'Updated sequence description'
    println "✅ Master sequence updated"
    
    // Test 5: Create Sequence Instance
    println "\n🧪 Test 5: Create Sequence Instance"
    def createInstanceResponse = client.post(
        path: 'sequences/instance',
        body: [
            sqm_id: testMasterSequenceId.toString(),
            pli_id: testPlanInstanceId.toString(),
            sqi_name: 'Test Sequence Instance',
            sqi_description: 'Instance created by integration test'
        ]
    )
    
    assert createInstanceResponse.status == 201
    assert createInstanceResponse.data.sqm_id == testMasterSequenceId.toString()
    assert createInstanceResponse.data.pli_id == testPlanInstanceId.toString()
    assert createInstanceResponse.data.sqi_name == 'Test Sequence Instance'
    testSequenceInstanceId = UUID.fromString(createInstanceResponse.data.sqi_id as String)
    println "✅ Sequence instance created: ${testSequenceInstanceId}"
    
    // Test 6: Get Sequence Instances - Migration Filter
    println "\n🧪 Test 6: Get Sequence Instances - Migration Filter"
    def migrationFilterResponse = client.get(
        path: 'sequences',
        query: [migrationId: testMigrationId.toString()]
    )
    
    assert migrationFilterResponse.status == 200
    assert migrationFilterResponse.data instanceof List
    assert migrationFilterResponse.data.find { it.sqi_id == testSequenceInstanceId.toString() } != null
    println "✅ Retrieved sequences filtered by migration"
    
    // Test 7: Get Sequence Instances - Iteration Filter
    println "\n🧪 Test 7: Get Sequence Instances - Iteration Filter"
    def iterationFilterResponse = client.get(
        path: 'sequences',
        query: [iterationId: testIterationId.toString()]
    )
    
    assert iterationFilterResponse.status == 200
    assert iterationFilterResponse.data instanceof List
    assert iterationFilterResponse.data.find { it.sqi_id == testSequenceInstanceId.toString() } != null
    println "✅ Retrieved sequences filtered by iteration"
    
    // Test 8: Get Sequence Instances - Plan Instance Filter
    println "\n🧪 Test 8: Get Sequence Instances - Plan Instance Filter"
    def planFilterResponse = client.get(
        path: 'sequences',
        query: [planInstanceId: testPlanInstanceId.toString()]
    )
    
    assert planFilterResponse.status == 200
    assert planFilterResponse.data instanceof List
    assert planFilterResponse.data.find { it.sqi_id == testSequenceInstanceId.toString() } != null
    println "✅ Retrieved sequences filtered by plan instance"
    
    // Test 9: Get Sequence Instances - Team Filter
    println "\n🧪 Test 9: Get Sequence Instances - Team Filter"
    def teamFilterResponse = client.get(
        path: 'sequences',
        query: [teamId: testTeamId.toString()]
    )
    
    assert teamFilterResponse.status == 200
    assert teamFilterResponse.data instanceof List
    assert teamFilterResponse.data.find { it.sqi_id == testSequenceInstanceId.toString() } != null
    println "✅ Retrieved sequences filtered by team"
    
    // Test 10: Get Sequence Instances - Combined Filters
    println "\n🧪 Test 10: Get Sequence Instances - Combined Filters"
    def combinedFilterResponse = client.get(
        path: 'sequences',
        query: [
            migrationId: testMigrationId.toString(),
            teamId: testTeamId.toString()
        ]
    )
    
    assert combinedFilterResponse.status == 200
    assert combinedFilterResponse.data instanceof List
    assert combinedFilterResponse.data.find { it.sqi_id == testSequenceInstanceId.toString() } != null
    println "✅ Retrieved sequences with combined filters"
    
    // Test 11: Get Sequence Instance by ID
    println "\n🧪 Test 11: Get Sequence Instance by ID"
    def getInstanceResponse = client.get(path: "sequences/instance/${testSequenceInstanceId}")
    
    assert getInstanceResponse.status == 200
    assert getInstanceResponse.data.sqi_id == testSequenceInstanceId.toString()
    assert getInstanceResponse.data.sqi_name == 'Test Sequence Instance'
    println "✅ Retrieved sequence instance by ID"
    
    // Test 12: Update Sequence Instance Status
    println "\n🧪 Test 12: Update Sequence Instance Status"
    
    // Create a status if needed
    def statusCheck = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = 'IN_PROGRESS' AND sts_type = 'Sequence'")
    def statusId = statusCheck?.sts_id
    if (!statusId) {
        def statusResult = sql.firstRow("""
            INSERT INTO status_sts (sts_name, sts_type, sts_color, created_by, updated_by)
            VALUES ('IN_PROGRESS', 'Sequence', '#FFA500', 'system', 'system')
            RETURNING sts_id
        """)
        statusId = statusResult.sts_id
    }
    
    def statusResponse = client.put(
        path: "sequences/${testSequenceInstanceId}/status",
        body: [status: 'IN_PROGRESS']
    )
    
    assert statusResponse.status == 200
    println "✅ Sequence instance status updated"
    
    // Test 13: Update Sequence Order
    println "\n🧪 Test 13: Update Sequence Order"
    def orderResponse = client.put(
        path: "sequences/master/${testMasterSequenceId}/order",
        body: [
            sqm_order: 2,
            predecessor_sqm_id: null
        ]
    )
    
    assert orderResponse.status == 200
    println "✅ Sequence order updated"
    
    // Test 14: Create Second Sequence for Bulk Reorder Test
    println "\n🧪 Test 14: Create Second Sequence for Bulk Reorder Test"
    def createSecondResponse = client.post(
        path: 'sequences/master',
        body: [
            plm_id: testMasterPlanId.toString(),
            sqm_name: 'Second Test Sequence',
            sqm_description: 'Second sequence for testing',
            sqm_order: 3
        ]
    )
    
    assert createSecondResponse.status == 201
    def secondSequenceId = UUID.fromString(createSecondResponse.data.sqm_id as String)
    println "✅ Second sequence created: ${secondSequenceId}"
    
    // Test 15: Bulk Reorder Sequences
    println "\n🧪 Test 15: Bulk Reorder Sequences"
    def bulkReorderResponse = client.put(
        path: "sequences/master/reorder",
        body: [
            sequences: [
                [sqm_id: secondSequenceId.toString(), sqm_order: 1],
                [sqm_id: testMasterSequenceId.toString(), sqm_order: 2]
            ]
        ]
    )
    
    assert bulkReorderResponse.status == 200
    println "✅ Bulk sequence reorder completed"
    
    // Test 16: Gap Normalization
    println "\n🧪 Test 16: Gap Normalization"
    def normalizeResponse = client.put(
        path: "sequences/master/normalize-order",
        body: [plm_id: testMasterPlanId.toString()]
    )
    
    assert normalizeResponse.status == 200
    println "✅ Sequence order normalization completed"
    
    // Test 17: Update Sequence Instance
    println "\n🧪 Test 17: Update Sequence Instance"
    def updateInstanceResponse = client.put(
        path: "sequences/instance/${testSequenceInstanceId}",
        body: [
            sqi_name: 'Updated Instance Name',
            sqi_description: 'Updated instance description'
        ]
    )
    
    assert updateInstanceResponse.status == 200
    assert updateInstanceResponse.data.sqi_name == 'Updated Instance Name'
    println "✅ Sequence instance updated"
    
    // Test 18: Error Handling - Invalid UUID
    println "\n🧪 Test 18: Error Handling - Invalid UUID"
    try {
        client.get(path: "sequences/master/invalid-uuid")
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        assert e.response.status == 400
        println "✅ Invalid UUID handled correctly"
    }
    
    // Test 19: Error Handling - Not Found
    println "\n🧪 Test 19: Error Handling - Not Found"
    try {
        def randomId = UUID.randomUUID()
        client.get(path: "sequences/master/${randomId}")
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        assert e.response.status == 404
        println "✅ Not found handled correctly"
    }
    
    // Test 20: Error Handling - Circular Dependency
    println "\n🧪 Test 20: Error Handling - Circular Dependency"
    try {
        // Try to create circular dependency
        client.put(
            path: "sequences/master/${testMasterSequenceId}/order",
            body: [
                sqm_order: 1,
                predecessor_sqm_id: testMasterSequenceId.toString() // Self-referencing
            ]
        )
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        assert e.response.status == 400
        println "✅ Circular dependency validation handled correctly"
    }
    
    // Cleanup second sequence before final cleanup
    try {
        client.delete(path: "sequences/master/${secondSequenceId}")
        println "✅ Second sequence deleted"
    } catch (Exception e) {
        println "⚠️  Failed to delete second sequence: ${e.message}"
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
            if (testSequenceInstanceId) {
                sql.execute("DELETE FROM sequences_instance_sqi WHERE sqi_id = ?", [testSequenceInstanceId])
            }
            if (testMasterSequenceId) {
                sql.execute("DELETE FROM sequences_master_sqm WHERE sqm_id = ?", [testMasterSequenceId])
            }
            if (testPlanInstanceId) {
                sql.execute("DELETE FROM plans_instance_pli WHERE pli_id = ?", [testPlanInstanceId])
            }
            if (testMasterPlanId) {
                sql.execute("DELETE FROM plans_master_plm WHERE plm_id = ?", [testMasterPlanId])
            }
            if (testIterationId) {
                sql.execute("DELETE FROM iterations_ite WHERE itr_id = ?", [testIterationId])
            }
            if (testMigrationId) {
                sql.execute("DELETE FROM migrations_mig WHERE mig_id = ?", [testMigrationId])
            }
            if (testUserId) {
                sql.execute("DELETE FROM users_usr WHERE usr_id = ?", [testUserId])
            }
            if (testTeamId) {
                sql.execute("DELETE FROM teams_tms WHERE tms_id = ?", [testTeamId])
            }
            
            // Clean up any test statuses
            sql.execute("DELETE FROM status_sts WHERE sts_name = 'IN_PROGRESS' AND sts_type = 'Sequence' AND created_by = 'system'")
            
            println "✅ Test data cleaned up"
        } catch (Exception e) {
            println "⚠️  Failed to cleanup test data: ${e.message}"
        }
        sql.close()
    }
}