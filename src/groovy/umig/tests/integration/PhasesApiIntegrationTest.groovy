#!/usr/bin/env groovy
/**
 * Integration Test for Phases API
 * Tests the Phases API endpoints against a live database
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
def testMasterPhaseId = null
def testPhaseInstanceId = null
def testControlId = null
def testSecondMasterPhaseId = null

println "============================================"
println "Phases API Integration Test"
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
        VALUES ('Phases Test Team', 'phases-test@example.com', 'Team for phases integration tests', 'system', 'system')
        RETURNING tms_id
    """)
    testTeamId = teamResult.tms_id
    println "  Created test team: ${testTeamId}"
    
    // Create test user
    def userResult = sql.firstRow("""
        INSERT INTO users_usr (usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, usr_confluence_user_id, created_by, updated_by)
        VALUES ('PHE', 'Phase', 'Tester', 'phase.tester@example.com', false, 'phasetester', 'system', 'system')
        RETURNING usr_id
    """)
    testUserId = userResult.usr_id
    println "  Created test user: ${testUserId}"
    
    // Create test migration and iteration
    def migrationResult = sql.firstRow("""
        INSERT INTO migrations_mig (mig_code, mig_name, mig_status, created_by, updated_by)
        VALUES ('PHE-TEST', 'Phase Test Migration', 'ACTIVE', 'system', 'system')
        RETURNING mig_id
    """)
    testMigrationId = migrationResult.mig_id
    println "  Created test migration: ${testMigrationId}"
    
    def iterationResult = sql.firstRow("""
        INSERT INTO iterations_ite (itr_code, itr_name, itr_type, mig_id, created_by, updated_by)
        VALUES ('PHE-IT1', 'Phase Test Iteration', 'CUTOVER', :migId, 'system', 'system')
        RETURNING itr_id
    """, [migId: testMigrationId])
    testIterationId = iterationResult.itr_id
    println "  Created test iteration: ${testIterationId}"
    
    // Create test master plan
    def planResult = sql.firstRow("""
        INSERT INTO plans_master_plm (tms_id, plm_name, plm_description, plm_status, created_by, updated_by)
        VALUES (:teamId, 'Phase Test Plan', 'Plan for phase testing', 'DRAFT', 'system', 'system')
        RETURNING plm_id
    """, [teamId: testTeamId])
    testMasterPlanId = planResult.plm_id
    println "  Created test master plan: ${testMasterPlanId}"
    
    // Create test plan instance
    def planInstanceResult = sql.firstRow("""
        INSERT INTO plans_instance_pli (plm_id, ite_id, usr_id_owner, pli_name, pli_description, created_by, updated_by)
        VALUES (:planId, :iterationId, :userId, 'Phase Test Plan Instance', 'Instance for phase testing', 'system', 'system')
        RETURNING pli_id
    """, [planId: testMasterPlanId, iterationId: testIterationId, userId: testUserId])
    testPlanInstanceId = planInstanceResult.pli_id
    println "  Created test plan instance: ${testPlanInstanceId}"
    
    // Create test master sequence
    def sequenceResult = sql.firstRow("""
        INSERT INTO sequences_master_sqm (plm_id, sqm_name, sqm_description, sqm_order, created_by, updated_by)
        VALUES (:planId, 'Phase Test Sequence', 'Sequence for phase testing', 1, 'system', 'system')
        RETURNING sqm_id
    """, [planId: testMasterPlanId])
    testMasterSequenceId = sequenceResult.sqm_id
    println "  Created test master sequence: ${testMasterSequenceId}"
    
    // Create test sequence instance
    def sequenceInstanceResult = sql.firstRow("""
        INSERT INTO sequences_instance_sqi (sqm_id, pli_id, sqi_name, sqi_description, sqi_order, created_by, updated_by)
        VALUES (:sequenceId, :planInstanceId, 'Phase Test Sequence Instance', 'Instance for phase testing', 1, 'system', 'system')
        RETURNING sqi_id
    """, [sequenceId: testMasterSequenceId, planInstanceId: testPlanInstanceId])
    testSequenceInstanceId = sequenceInstanceResult.sqi_id
    println "  Created test sequence instance: ${testSequenceInstanceId}"
    
    // ==================== MASTER PHASE MANAGEMENT TESTS (5 endpoints) ====================
    
    // Test 1: Create Master Phase
    println "\n🧪 Test 1: Create Master Phase"
    def createMasterResponse = client.post(
        path: 'phasesmaster',
        body: [
            sqm_id: testMasterSequenceId.toString(),
            phm_name: 'Integration Test Phase',
            phm_description: 'Phase created by integration test',
            phm_order: 1
        ]
    )
    
    assert createMasterResponse.status == 201
    assert createMasterResponse.data.phm_name == 'Integration Test Phase'
    assert createMasterResponse.data.sqm_id == testMasterSequenceId.toString()
    testMasterPhaseId = UUID.fromString(createMasterResponse.data.phm_id as String)
    println "✅ Master phase created: ${testMasterPhaseId}"
    
    // Test 2: Get All Master Phases
    println "\n🧪 Test 2: Get All Master Phases"
    def listMasterResponse = client.get(path: 'phasesmaster')
    
    assert listMasterResponse.status == 200
    assert listMasterResponse.data instanceof List
    assert listMasterResponse.data.find { it.phm_id == testMasterPhaseId.toString() } != null
    println "✅ Retrieved ${listMasterResponse.data.size()} master phases"
    
    // Test 3: Get Master Phases by Sequence ID
    println "\n🧪 Test 3: Get Master Phases by Sequence ID"
    def sequenceFilterResponse = client.get(
        path: 'phasesmaster',
        query: [sequenceId: testMasterSequenceId.toString()]
    )
    
    assert sequenceFilterResponse.status == 200
    assert sequenceFilterResponse.data instanceof List
    assert sequenceFilterResponse.data.find { it.phm_id == testMasterPhaseId.toString() } != null
    println "✅ Retrieved phases filtered by sequence"
    
    // Test 4: Get Master Phase by ID
    println "\n🧪 Test 4: Get Master Phase by ID"
    def getMasterResponse = client.get(path: "phasesmaster/${testMasterPhaseId}")
    
    assert getMasterResponse.status == 200
    assert getMasterResponse.data.phm_id == testMasterPhaseId.toString()
    assert getMasterResponse.data.phm_name == 'Integration Test Phase'
    println "✅ Retrieved master phase by ID"
    
    // Test 5: Update Master Phase
    println "\n🧪 Test 5: Update Master Phase"
    def updateMasterResponse = client.put(
        path: "phasesmaster/${testMasterPhaseId}",
        body: [
            phm_name: 'Updated Test Phase',
            phm_description: 'Updated phase description'
        ]
    )
    
    assert updateMasterResponse.status == 200
    assert updateMasterResponse.data.phm_name == 'Updated Test Phase'
    assert updateMasterResponse.data.phm_description == 'Updated phase description'
    println "✅ Master phase updated"
    
    // ==================== INSTANCE PHASE OPERATIONS TESTS (5 endpoints) ====================
    
    // Test 6: Create Phase Instance
    println "\n🧪 Test 6: Create Phase Instance"
    def createInstanceResponse = client.post(
        path: 'phasesinstance',
        body: [
            phm_id: testMasterPhaseId.toString(),
            sqi_id: testSequenceInstanceId.toString(),
            phi_name: 'Test Phase Instance',
            phi_description: 'Instance created by integration test'
        ]
    )
    
    assert createInstanceResponse.status == 201
    assert createInstanceResponse.data.phm_id == testMasterPhaseId.toString()
    assert createInstanceResponse.data.sqi_id == testSequenceInstanceId.toString()
    assert createInstanceResponse.data.phi_name == 'Test Phase Instance'
    testPhaseInstanceId = UUID.fromString(createInstanceResponse.data.phi_id as String)
    println "✅ Phase instance created: ${testPhaseInstanceId}"
    
    // Test 7: Get Phase Instances - Migration Filter
    println "\n🧪 Test 7: Get Phase Instances - Migration Filter"
    def migrationFilterResponse = client.get(
        path: 'phasesinstance',
        query: [migrationId: testMigrationId.toString()]
    )
    
    assert migrationFilterResponse.status == 200
    assert migrationFilterResponse.data instanceof List
    assert migrationFilterResponse.data.find { it.phi_id == testPhaseInstanceId.toString() } != null
    println "✅ Retrieved phases filtered by migration"
    
    // Test 8: Get Phase Instances - Iteration Filter
    println "\n🧪 Test 8: Get Phase Instances - Iteration Filter"
    def iterationFilterResponse = client.get(
        path: 'phasesinstance',
        query: [iterationId: testIterationId.toString()]
    )
    
    assert iterationFilterResponse.status == 200
    assert iterationFilterResponse.data instanceof List
    assert iterationFilterResponse.data.find { it.phi_id == testPhaseInstanceId.toString() } != null
    println "✅ Retrieved phases filtered by iteration"
    
    // Test 9: Get Phase Instances - Plan Instance Filter
    println "\n🧪 Test 9: Get Phase Instances - Plan Instance Filter"
    def planFilterResponse = client.get(
        path: 'phasesinstance',
        query: [planInstanceId: testPlanInstanceId.toString()]
    )
    
    assert planFilterResponse.status == 200
    assert planFilterResponse.data instanceof List
    assert planFilterResponse.data.find { it.phi_id == testPhaseInstanceId.toString() } != null
    println "✅ Retrieved phases filtered by plan instance"
    
    // Test 10: Get Phase Instances - Sequence Instance Filter
    println "\n🧪 Test 10: Get Phase Instances - Sequence Instance Filter"
    def sequenceInstanceFilterResponse = client.get(
        path: 'phasesinstance',
        query: [sequenceInstanceId: testSequenceInstanceId.toString()]
    )
    
    assert sequenceInstanceFilterResponse.status == 200
    assert sequenceInstanceFilterResponse.data instanceof List
    assert sequenceInstanceFilterResponse.data.find { it.phi_id == testPhaseInstanceId.toString() } != null
    println "✅ Retrieved phases filtered by sequence instance"
    
    // Test 11: Get Phase Instances - Team Filter
    println "\n🧪 Test 11: Get Phase Instances - Team Filter"
    def teamFilterResponse = client.get(
        path: 'phasesinstance',
        query: [teamId: testTeamId.toString()]
    )
    
    assert teamFilterResponse.status == 200
    assert teamFilterResponse.data instanceof List
    assert teamFilterResponse.data.find { it.phi_id == testPhaseInstanceId.toString() } != null
    println "✅ Retrieved phases filtered by team"
    
    // Test 12: Get Phase Instances - Combined Filters
    println "\n🧪 Test 12: Get Phase Instances - Combined Filters"
    def combinedFilterResponse = client.get(
        path: 'phasesinstance',
        query: [
            migrationId: testMigrationId.toString(),
            teamId: testTeamId.toString()
        ]
    )
    
    assert combinedFilterResponse.status == 200
    assert combinedFilterResponse.data instanceof List
    assert combinedFilterResponse.data.find { it.phi_id == testPhaseInstanceId.toString() } != null
    println "✅ Retrieved phases with combined filters"
    
    // Test 13: Get Phase Instance by ID
    println "\n🧪 Test 13: Get Phase Instance by ID"
    def getInstanceResponse = client.get(path: "phasesinstance/${testPhaseInstanceId}")
    
    assert getInstanceResponse.status == 200
    assert getInstanceResponse.data.phi_id == testPhaseInstanceId.toString()
    assert getInstanceResponse.data.phi_name == 'Test Phase Instance'
    println "✅ Retrieved phase instance by ID"
    
    // Test 14: Update Phase Instance
    println "\n🧪 Test 14: Update Phase Instance"
    def updateInstanceResponse = client.put(
        path: "phasesinstance/${testPhaseInstanceId}",
        body: [
            phi_name: 'Updated Instance Name',
            phi_description: 'Updated instance description',
            phi_status: 'IN_PROGRESS'
        ]
    )
    
    assert updateInstanceResponse.status == 200
    assert updateInstanceResponse.data.phi_name == 'Updated Instance Name'
    println "✅ Phase instance updated"
    
    // ==================== CONTROL POINTS MANAGEMENT TESTS (4 endpoints) ====================
    
    // Setup control point test data
    def controlResult = sql.firstRow("""
        INSERT INTO control_master_ctm (phm_id, ctm_name, ctm_description, ctm_type, ctm_validation_rule, created_by, updated_by)
        VALUES (:phaseId, 'Test Control Point', 'Control for testing', 'TECHNICAL', 'MANUAL', 'system', 'system')
        RETURNING ctm_id
    """, [phaseId: testMasterPhaseId])
    def testControlMasterId = controlResult.ctm_id
    
    def controlInstanceResult = sql.firstRow("""
        INSERT INTO control_instance_cti (ctm_id, phi_id, cti_name, cti_description, cti_type, cti_status, created_by, updated_by)
        VALUES (:controlMasterId, :phaseInstanceId, 'Test Control Instance', 'Instance control for testing', 'TECHNICAL', 'PENDING', 'system', 'system')
        RETURNING cti_id
    """, [controlMasterId: testControlMasterId, phaseInstanceId: testPhaseInstanceId])
    testControlId = controlInstanceResult.cti_id
    println "  Created test control point: ${testControlId}"
    
    // Test 15: Get Phase Control Points
    println "\n🧪 Test 15: Get Phase Control Points"
    def controlsResponse = client.get(path: "phases/${testPhaseInstanceId}/controls")
    
    assert controlsResponse.status == 200
    assert controlsResponse.data instanceof List
    assert controlsResponse.data.find { it.cti_id == testControlId } != null
    println "✅ Retrieved control points for phase"
    
    // Test 16: Validate Control Points
    println "\n🧪 Test 16: Validate Control Points"
    def validateResponse = client.post(path: "phases/${testPhaseInstanceId}/controls/validate")
    
    assert validateResponse.status == 200
    assert validateResponse.data.phi_id == testPhaseInstanceId.toString()
    assert validateResponse.data.containsKey('validation_status')
    println "✅ Control points validation completed"
    
    // Test 17: Update Control Point Status
    println "\n🧪 Test 17: Update Control Point Status"
    def updateControlResponse = client.put(
        path: "phases/${testPhaseInstanceId}/controls/${testControlId}",
        body: [
            cti_status: 'VALIDATED',
            usr_id_it_validator: testUserId.toString()
        ]
    )
    
    assert updateControlResponse.status == 200
    assert updateControlResponse.data.success == true
    println "✅ Control point status updated"
    
    // Test 18: Override Control Point
    println "\n🧪 Test 18: Override Control Point"
    def overrideResponse = client.post(
        path: "phases/${testPhaseInstanceId}/controls/${testControlId}/override",
        body: [
            reason: 'Test override for integration testing',
            overrideBy: 'phasetester'
        ]
    )
    
    assert overrideResponse.status == 200
    assert overrideResponse.data.success == true
    println "✅ Control point overridden"
    
    // ==================== ORDERING MANAGEMENT TESTS (4 endpoints) ====================
    
    // Create second master phase for reordering tests
    def createSecondMasterResponse = client.post(
        path: 'phasesmaster',
        body: [
            sqm_id: testMasterSequenceId.toString(),
            phm_name: 'Second Test Phase',
            phm_description: 'Second phase for testing',
            phm_order: 2
        ]
    )
    
    assert createSecondMasterResponse.status == 201
    testSecondMasterPhaseId = UUID.fromString(createSecondMasterResponse.data.phm_id as String)
    println "  Created second master phase: ${testSecondMasterPhaseId}"
    
    // Test 19: Bulk Reorder Master Phases
    println "\n🧪 Test 19: Bulk Reorder Master Phases"
    def bulkReorderMasterResponse = client.put(
        path: "phasesmasterreorder",
        body: [
            sequenceId: testMasterSequenceId.toString(),
            phaseOrderMap: [
                (testSecondMasterPhaseId.toString()): 1,
                (testMasterPhaseId.toString()): 2
            ]
        ]
    )
    
    assert bulkReorderMasterResponse.status == 200
    assert bulkReorderMasterResponse.data.success == true
    println "✅ Bulk master phase reorder completed"
    
    // Test 20: Move Master Phase
    println "\n🧪 Test 20: Move Master Phase"
    def moveMasterResponse = client.post(
        path: "phasesmastermove/${testMasterPhaseId}",
        body: [
            newOrder: 1
        ]
    )
    
    assert moveMasterResponse.status == 200
    assert moveMasterResponse.data.success == true
    println "✅ Master phase moved"
    
    // Create second phase instance for instance reordering tests
    def createSecondInstanceResponse = client.post(
        path: 'phasesinstance',
        body: [
            phm_id: testSecondMasterPhaseId.toString(),
            sqi_id: testSequenceInstanceId.toString(),
            phi_name: 'Second Phase Instance',
            phi_description: 'Second instance for testing'
        ]
    )
    
    assert createSecondInstanceResponse.status == 201
    def testSecondPhaseInstanceId = UUID.fromString(createSecondInstanceResponse.data.phi_id as String)
    println "  Created second phase instance: ${testSecondPhaseInstanceId}"
    
    // Test 21: Bulk Reorder Phase Instances
    println "\n🧪 Test 21: Bulk Reorder Phase Instances"
    def bulkReorderInstanceResponse = client.put(
        path: "phasesinstancereorder",
        body: [
            sequenceInstanceId: testSequenceInstanceId.toString(),
            phaseOrderMap: [
                (testSecondPhaseInstanceId.toString()): 1,
                (testPhaseInstanceId.toString()): 2
            ]
        ]
    )
    
    assert bulkReorderInstanceResponse.status == 200
    assert bulkReorderInstanceResponse.data.success == true
    println "✅ Bulk phase instance reorder completed"
    
    // Test 22: Move Phase Instance
    println "\n🧪 Test 22: Move Phase Instance"
    def moveInstanceResponse = client.post(
        path: "phasesinstancemove/${testPhaseInstanceId}",
        body: [
            newOrder: 1
        ]
    )
    
    assert moveInstanceResponse.status == 200
    assert moveInstanceResponse.data.success == true
    println "✅ Phase instance moved"
    
    // ==================== PROGRESS TRACKING TEST (1 endpoint) ====================
    
    // Test 23: Get Phase Progress
    println "\n🧪 Test 23: Get Phase Progress"
    def progressResponse = client.get(path: "phases/${testPhaseInstanceId}/progress")
    
    assert progressResponse.status == 200
    assert progressResponse.data.phi_id == testPhaseInstanceId.toString()
    assert progressResponse.data.containsKey('progress_percentage')
    println "✅ Phase progress retrieved"
    
    // ==================== ERROR HANDLING TESTS ====================
    
    // Test 24: Error Handling - Invalid UUID Format
    println "\n🧪 Test 24: Error Handling - Invalid UUID Format"
    try {
        client.get(path: "phasesmaster/invalid-uuid")
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        assert e.response.status == 400
        println "✅ Invalid UUID handled correctly"
    }
    
    // Test 25: Error Handling - Master Phase Not Found
    println "\n🧪 Test 25: Error Handling - Master Phase Not Found"
    try {
        def randomId = UUID.randomUUID()
        client.get(path: "phasesmaster/${randomId}")
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        assert e.response.status == 404
        println "✅ Not found handled correctly"
    }
    
    // Test 26: Error Handling - Phase Instance Not Found
    println "\n🧪 Test 26: Error Handling - Phase Instance Not Found"
    try {
        def randomId = UUID.randomUUID()
        client.get(path: "phasesinstance/${randomId}")
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        assert e.response.status == 404
        println "✅ Phase instance not found handled correctly"
    }
    
    // Test 27: Error Handling - Missing Required Fields
    println "\n🧪 Test 27: Error Handling - Missing Required Fields"
    try {
        client.post(
            path: 'phasesmaster',
            body: [
                phm_name: 'Incomplete Phase'
                // Missing sqm_id
            ]
        )
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        assert e.response.status == 400
        println "✅ Missing required fields handled correctly"
    }
    
    // Test 28: Error Handling - Invalid JSON
    println "\n🧪 Test 28: Error Handling - Invalid JSON"
    try {
        client.post(
            path: 'phasesmaster',
            body: "invalid json"
        )
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        assert e.response.status == 400
        println "✅ Invalid JSON handled correctly"
    }
    
    // Test 29: Error Handling - Foreign Key Violation
    println "\n🧪 Test 29: Error Handling - Foreign Key Violation"
    try {
        def randomId = UUID.randomUUID()
        client.post(
            path: 'phasesmaster',
            body: [
                sqm_id: randomId.toString(),
                phm_name: 'Invalid Sequence Phase',
                phm_description: 'Phase with non-existent sequence'
            ]
        )
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        assert e.response.status == 400
        println "✅ Foreign key violation handled correctly"
    }
    
    // Test 30: Error Handling - Circular Dependency
    println "\n🧪 Test 30: Error Handling - Circular Dependency"
    try {
        // Try to create circular dependency by setting predecessor to self
        client.put(
            path: "phasesmaster/${testMasterPhaseId}",
            body: [
                predecessor_phm_id: testMasterPhaseId.toString()
            ]
        )
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        assert e.response.status == 400
        println "✅ Circular dependency validation handled correctly"
    }
    
    // Cleanup second phase instances and masters
    try {
        client.delete(path: "phasesinstance/${testSecondPhaseInstanceId}")
        println "✅ Second phase instance deleted"
    } catch (Exception e) {
        println "⚠️  Failed to delete second phase instance: ${e.message}"
    }
    
    try {
        client.delete(path: "phasesmaster/${testSecondMasterPhaseId}")
        println "✅ Second master phase deleted"
    } catch (Exception e) {
        println "⚠️  Failed to delete second master phase: ${e.message}"
    }
    
    println "\n============================================"
    println "✅ All 30 tests passed!"
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
            if (testControlId) {
                sql.execute("DELETE FROM control_instance_cti WHERE cti_id = ?", [testControlId])
            }
            if (testControlMasterId) {
                sql.execute("DELETE FROM control_master_ctm WHERE ctm_id = ?", [testControlMasterId])
            }
            if (testPhaseInstanceId) {
                sql.execute("DELETE FROM phases_instance_phi WHERE phi_id = ?", [testPhaseInstanceId])
            }
            if (testMasterPhaseId) {
                sql.execute("DELETE FROM phases_master_phm WHERE phm_id = ?", [testMasterPhaseId])
            }
            if (testSecondMasterPhaseId) {
                sql.execute("DELETE FROM phases_master_phm WHERE phm_id = ?", [testSecondMasterPhaseId])
            }
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
            
            println "✅ Test data cleaned up"
        } catch (Exception e) {
            println "⚠️  Failed to cleanup test data: ${e.message}"
        }
        sql.close()
    }
}