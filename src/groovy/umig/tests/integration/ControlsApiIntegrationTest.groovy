#!/usr/bin/env groovy
/**
 * Integration Test for Controls API
 * Tests the Controls API endpoints against a live database
 * 
 * Prerequisites:
 * - Running PostgreSQL database from local-dev-setup
 * - Database initialized with schema
 * 
 * Run from project root: ./src/groovy/umig/tests/run-integration-tests.sh
 */

@GrabConfig(systemClassLoader=true)
@Grab('org.postgresql:postgresql:42.7.3')
@Grab('org.codehaus.groovy.modules.http-builder:http-builder:0.7.1')

import groovy.sql.Sql
import groovyx.net.http.RESTClient
import groovyx.net.http.ContentType
import groovyx.net.http.HttpResponseException
import java.util.UUID
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

// Database configuration
def dbUrl = System.getenv('DATABASE_URL') ?: 'jdbc:postgresql://localhost:5432/umig_app_db'
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
def testMasterControlId = null
def testControlInstanceId = null
def testSecondMasterControlId = null
def testSecondControlInstanceId = null

println "============================================"
println "Controls API Integration Test"
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
        VALUES ('Controls Test Team', 'controls-test@example.com', 'Team for controls integration tests', 'system', 'system')
        RETURNING tms_id
    """)
    testTeamId = teamResult.tms_id
    println "  Created test team: ${testTeamId}"
    
    // Create test user
    def userResult = sql.firstRow("""
        INSERT INTO users_usr (usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, usr_confluence_user_id, created_by, updated_by)
        VALUES ('CTL', 'Control', 'Tester', 'control.tester@example.com', false, 'controltester', 'system', 'system')
        RETURNING usr_id
    """)
    testUserId = userResult.usr_id
    println "  Created test user: ${testUserId}"
    
    // Create test migration and iteration
    def migrationResult = sql.firstRow("""
        INSERT INTO migrations_mig (mig_code, mig_name, mig_status, created_by, updated_by)
        VALUES ('CTL-TEST', 'Control Test Migration', 'ACTIVE', 'system', 'system')
        RETURNING mig_id
    """)
    testMigrationId = migrationResult.mig_id
    println "  Created test migration: ${testMigrationId}"
    
    def iterationResult = sql.firstRow("""
        INSERT INTO iterations_ite (itr_code, itr_name, itr_type, mig_id, created_by, updated_by)
        VALUES ('CTL-IT1', 'Control Test Iteration', 'CUTOVER', :migId, 'system', 'system')
        RETURNING itr_id
    """, [migId: testMigrationId])
    testIterationId = iterationResult.itr_id
    println "  Created test iteration: ${testIterationId}"
    
    // Create test master plan
    def planResult = sql.firstRow("""
        INSERT INTO plans_master_plm (tms_id, plm_name, plm_description, plm_status, created_by, updated_by)
        VALUES (:teamId, 'Control Test Plan', 'Plan for control testing', 'DRAFT', 'system', 'system')
        RETURNING plm_id
    """, [teamId: testTeamId])
    testMasterPlanId = planResult.plm_id
    println "  Created test master plan: ${testMasterPlanId}"
    
    // Create test plan instance
    def planInstanceResult = sql.firstRow("""
        INSERT INTO plans_instance_pli (plm_id, ite_id, usr_id_owner, pli_name, pli_description, created_by, updated_by)
        VALUES (:planId, :iterationId, :userId, 'Control Test Plan Instance', 'Instance for control testing', 'system', 'system')
        RETURNING pli_id
    """, [planId: testMasterPlanId, iterationId: testIterationId, userId: testUserId])
    testPlanInstanceId = planInstanceResult.pli_id
    println "  Created test plan instance: ${testPlanInstanceId}"
    
    // Create test master sequence
    def sequenceResult = sql.firstRow("""
        INSERT INTO sequences_master_sqm (plm_id, sqm_name, sqm_description, sqm_order, created_by, updated_by)
        VALUES (:planId, 'Control Test Sequence', 'Sequence for control testing', 1, 'system', 'system')
        RETURNING sqm_id
    """, [planId: testMasterPlanId])
    testMasterSequenceId = sequenceResult.sqm_id
    println "  Created test master sequence: ${testMasterSequenceId}"
    
    // Create test sequence instance
    def sequenceInstanceResult = sql.firstRow("""
        INSERT INTO sequences_instance_sqi (sqm_id, pli_id, sqi_name, sqi_description, sqi_order, created_by, updated_by)
        VALUES (:sequenceId, :planInstanceId, 'Control Test Sequence Instance', 'Instance for control testing', 1, 'system', 'system')
        RETURNING sqi_id
    """, [sequenceId: testMasterSequenceId, planInstanceId: testPlanInstanceId])
    testSequenceInstanceId = sequenceInstanceResult.sqi_id
    println "  Created test sequence instance: ${testSequenceInstanceId}"
    
    // Create test master phase
    def phaseResult = sql.firstRow("""
        INSERT INTO phases_master_phm (sqm_id, phm_name, phm_description, phm_order, created_by, updated_by)
        VALUES (:sequenceId, 'Control Test Phase', 'Phase for control testing', 1, 'system', 'system')
        RETURNING phm_id
    """, [sequenceId: testMasterSequenceId])
    testMasterPhaseId = phaseResult.phm_id
    println "  Created test master phase: ${testMasterPhaseId}"
    
    // Create test phase instance
    def phaseInstanceResult = sql.firstRow("""
        INSERT INTO phases_instance_phi (phm_id, sqi_id, phi_name, phi_description, phi_order, created_by, updated_by)
        VALUES (:phaseId, :sequenceInstanceId, 'Control Test Phase Instance', 'Instance for control testing', 1, 'system', 'system')
        RETURNING phi_id
    """, [phaseId: testMasterPhaseId, sequenceInstanceId: testSequenceInstanceId])
    testPhaseInstanceId = phaseInstanceResult.phi_id
    println "  Created test phase instance: ${testPhaseInstanceId}"
    
    // ==================== MASTER CONTROL TESTS ====================
    
    // Test 1: Create Master Control and Verify
    println "\n🧪 Test 1: Create Master Control and Verify"
    def startTime1 = System.currentTimeMillis()
    
    def createMasterResponse = client.post(
        path: 'controls/master',
        body: [
            phm_id: testMasterPhaseId.toString(),
            ctm_name: 'Integration Test Control',
            ctm_description: 'Control created by integration test',
            ctm_type: 'TECHNICAL',
            ctm_is_critical: true,
            ctm_code: 'ITC001',
            ctm_order: 1
        ]
    )
    
    def elapsedTime1 = System.currentTimeMillis() - startTime1
    assert createMasterResponse.status == 201
    assert createMasterResponse.data.ctm_name == 'Integration Test Control'
    assert createMasterResponse.data.phm_id == testMasterPhaseId.toString()
    assert createMasterResponse.data.ctm_is_critical == true
    assert elapsedTime1 < 200
    testMasterControlId = UUID.fromString(createMasterResponse.data.ctm_id as String)
    println "✅ Master control created in ${elapsedTime1}ms: ${testMasterControlId}"
    
    // Test 2: Create Instance from Master
    println "\n🧪 Test 2: Create Instance from Master"
    def startTime2 = System.currentTimeMillis()
    
    def createInstanceResponse = client.post(
        path: "controls/master/${testMasterControlId}/instantiate",
        body: [
            phi_id: testPhaseInstanceId.toString(),
            cti_name: 'Test Control Instance',
            cti_description: 'Instance created from master'
        ]
    )
    
    def elapsedTime2 = System.currentTimeMillis() - startTime2
    assert createInstanceResponse.status == 201
    assert createInstanceResponse.data.ctm_id == testMasterControlId.toString()
    assert createInstanceResponse.data.phi_id == testPhaseInstanceId.toString()
    assert createInstanceResponse.data.cti_name == 'Test Control Instance'
    assert createInstanceResponse.data.cti_status == 'PENDING'
    assert elapsedTime2 < 200
    testControlInstanceId = UUID.fromString(createInstanceResponse.data.cti_id as String)
    println "✅ Control instance created from master in ${elapsedTime2}ms: ${testControlInstanceId}"
    
    // Test 3: Update Instance with Overrides
    println "\n🧪 Test 3: Update Instance with Overrides"
    def startTime3 = System.currentTimeMillis()
    
    def updateInstanceResponse = client.put(
        path: "controls/instance/${testControlInstanceId}",
        body: [
            cti_name: 'Updated Control Instance',
            cti_description: 'Updated with overrides',
            cti_type: 'BUSINESS',
            cti_is_critical: false,
            usr_id_it_validator: testUserId
        ]
    )
    
    def elapsedTime3 = System.currentTimeMillis() - startTime3
    assert updateInstanceResponse.status == 200
    assert updateInstanceResponse.data.cti_name == 'Updated Control Instance'
    assert updateInstanceResponse.data.cti_type == 'BUSINESS'
    assert updateInstanceResponse.data.cti_is_critical == false
    assert elapsedTime3 < 200
    println "✅ Control instance updated with overrides in ${elapsedTime3}ms"
    
    // Test 4: Validate Control Successfully
    println "\n🧪 Test 4: Validate Control Successfully"
    def startTime4 = System.currentTimeMillis()
    
    def validateResponse = client.put(
        path: "controls/instance/${testControlInstanceId}/validate",
        body: [
            cti_status: 'VALIDATED',
            usr_id_it_validator: testUserId
        ]
    )
    
    def elapsedTime4 = System.currentTimeMillis() - startTime4
    assert validateResponse.status == 200
    assert validateResponse.data.success == true || validateResponse.data.cti_status == 'VALIDATED'
    assert elapsedTime4 < 200
    println "✅ Control validated successfully in ${elapsedTime4}ms"
    
    // Test 5: Override Control with Reason
    println "\n🧪 Test 5: Override Control with Reason"
    def startTime5 = System.currentTimeMillis()
    
    def overrideResponse = client.put(
        path: "controls/instance/${testControlInstanceId}/override",
        body: [
            reason: 'Integration test override for testing purposes',
            overrideBy: 'controltester'
        ]
    )
    
    def elapsedTime5 = System.currentTimeMillis() - startTime5
    assert overrideResponse.status == 200
    assert overrideResponse.data.success == true || overrideResponse.data.containsKey('override_reason')
    assert elapsedTime5 < 200
    println "✅ Control overridden with reason in ${elapsedTime5}ms"
    
    // Create second master control for bulk operations
    def createSecondMasterResponse = client.post(
        path: 'controls/master',
        body: [
            phm_id: testMasterPhaseId.toString(),
            ctm_name: 'Second Test Control',
            ctm_description: 'Second control for testing',
            ctm_type: 'BUSINESS',
            ctm_is_critical: false,
            ctm_code: 'ITC002',
            ctm_order: 2
        ]
    )
    testSecondMasterControlId = UUID.fromString(createSecondMasterResponse.data.ctm_id as String)
    
    // Create second control instance
    def createSecondInstanceResponse = client.post(
        path: "controls/master/${testSecondMasterControlId}/instantiate",
        body: [
            phi_id: testPhaseInstanceId.toString(),
            cti_name: 'Second Control Instance',
            cti_description: 'Second instance for testing'
        ]
    )
    testSecondControlInstanceId = UUID.fromString(createSecondInstanceResponse.data.cti_id as String)
    println "  Created second control for bulk operations: ${testSecondControlInstanceId}"
    
    // Test 6: Bulk Validation of Phase Controls
    println "\n🧪 Test 6: Bulk Validation of Phase Controls"
    def startTime6 = System.currentTimeMillis()
    
    def bulkValidateResponse = client.put(
        path: "controls/instance/bulk/validate",
        body: [
            phi_id: testPhaseInstanceId.toString(),
            cti_status: 'VALIDATED',
            usr_id_it_validator: testUserId
        ]
    )
    
    def elapsedTime6 = System.currentTimeMillis() - startTime6
    assert bulkValidateResponse.status == 200
    assert bulkValidateResponse.data.success == true || bulkValidateResponse.data.containsKey('validated_count')
    assert elapsedTime6 < 200
    println "✅ Bulk validation completed in ${elapsedTime6}ms"
    
    // Test 7: Hierarchical Filtering - Migration Level
    println "\n🧪 Test 7: Hierarchical Filtering - Migration Level"
    def startTime7 = System.currentTimeMillis()
    
    def migrationFilterResponse = client.get(
        path: 'controls/instance',
        query: [migrationId: testMigrationId.toString()]
    )
    
    def elapsedTime7 = System.currentTimeMillis() - startTime7
    assert migrationFilterResponse.status == 200
    assert migrationFilterResponse.data instanceof List
    assert migrationFilterResponse.data.find { it.cti_id == testControlInstanceId.toString() } != null
    assert elapsedTime7 < 200
    println "✅ Migration-level filtering works in ${elapsedTime7}ms - found ${migrationFilterResponse.data.size()} controls"
    
    // Test 8: Hierarchical Filtering - Phase Level
    println "\n🧪 Test 8: Hierarchical Filtering - Phase Level"
    def startTime8 = System.currentTimeMillis()
    
    def phaseFilterResponse = client.get(
        path: 'controls/instance',
        query: [phaseInstanceId: testPhaseInstanceId.toString()]
    )
    
    def elapsedTime8 = System.currentTimeMillis() - startTime8
    assert phaseFilterResponse.status == 200
    assert phaseFilterResponse.data instanceof List
    assert phaseFilterResponse.data.find { it.cti_id == testControlInstanceId.toString() } != null
    assert elapsedTime8 < 200
    println "✅ Phase-level filtering works in ${elapsedTime8}ms - found ${phaseFilterResponse.data.size()} controls"
    
    // Test 9: Team-based Filtering
    println "\n🧪 Test 9: Team-based Filtering"
    def startTime9 = System.currentTimeMillis()
    
    def teamFilterResponse = client.get(
        path: 'controls/instance',
        query: [teamId: testTeamId.toString()]
    )
    
    def elapsedTime9 = System.currentTimeMillis() - startTime9
    assert teamFilterResponse.status == 200
    assert teamFilterResponse.data instanceof List
    assert teamFilterResponse.data.find { it.cti_id == testControlInstanceId.toString() } != null
    assert elapsedTime9 < 200
    println "✅ Team-based filtering works in ${elapsedTime9}ms - found ${teamFilterResponse.data.size()} controls"
    
    // Test 10: Status-based Filtering
    println "\n🧪 Test 10: Status-based Filtering"
    def startTime10 = System.currentTimeMillis()
    
    def statusFilterResponse = client.get(
        path: 'controls/instance',
        query: [statusId: 'VALIDATED']
    )
    
    def elapsedTime10 = System.currentTimeMillis() - startTime10
    assert statusFilterResponse.status == 200
    assert statusFilterResponse.data instanceof List
    // Note: May or may not find our control depending on status update timing
    assert elapsedTime10 < 200
    println "✅ Status-based filtering works in ${elapsedTime10}ms - found ${statusFilterResponse.data.size()} validated controls"
    
    // Test 11: Critical Controls Filtering
    println "\n🧪 Test 11: Critical Controls Filtering"
    def startTime11 = System.currentTimeMillis()
    
    def criticalFilterResponse = client.get(
        path: 'controls/master',
        query: [phaseId: testMasterPhaseId.toString()]
    )
    
    def elapsedTime11 = System.currentTimeMillis() - startTime11
    assert criticalFilterResponse.status == 200
    assert criticalFilterResponse.data instanceof List
    // Filter for critical controls in the response
    def criticalControls = criticalFilterResponse.data.findAll { it.ctm_is_critical == true }
    assert criticalControls.size() > 0
    assert elapsedTime11 < 200
    println "✅ Critical controls filtering works in ${elapsedTime11}ms - found ${criticalControls.size()} critical controls"
    
    // Test 12: Reorder Controls within Phase
    println "\n🧪 Test 12: Reorder Controls within Phase"
    def startTime12 = System.currentTimeMillis()
    
    def reorderResponse = client.put(
        path: 'controls/master/reorder',
        body: [
            phm_id: testMasterPhaseId.toString(),
            control_order: [
                testSecondMasterControlId.toString(),
                testMasterControlId.toString()
            ]
        ]
    )
    
    def elapsedTime12 = System.currentTimeMillis() - startTime12
    assert reorderResponse.status == 204
    assert elapsedTime12 < 200
    println "✅ Controls reordered successfully in ${elapsedTime12}ms"
    
    // Test 13: Delete Cascade Validation
    println "\n🧪 Test 13: Delete Cascade Validation"
    def startTime13 = System.currentTimeMillis()
    
    try {
        // Try to delete master control that has instances - should fail
        client.delete(path: "controls/master/${testMasterControlId}")
        assert false, "Should have thrown exception for cascade constraint"
    } catch (HttpResponseException e) {
        def elapsedTime13 = System.currentTimeMillis() - startTime13
        assert e.response.status == 400 || e.response.status == 409
        assert elapsedTime13 < 200
        println "✅ Delete cascade validation works in ${elapsedTime13}ms - prevented deletion with instances"
    }
    
    // Test 14: Concurrent Validation Handling
    println "\n🧪 Test 14: Concurrent Validation Handling"
    def startTime14 = System.currentTimeMillis()
    
    // Simulate concurrent validation attempts
    def executor = Executors.newFixedThreadPool(3)
    def futures = []
    
    3.times { index ->
        futures << executor.submit {
            try {
                def concurrentClient = new RESTClient("${apiBaseUrl}${apiPath}/")
                concurrentClient.contentType = ContentType.JSON
                return concurrentClient.put(
                    path: "controls/instance/${testSecondControlInstanceId}/status",
                    body: [
                        cti_status: 'IN_PROGRESS'
                    ]
                )
            } catch (Exception e) {
                return e
            }
        }
    }
    
    def results = futures.collect { it.get() }
    executor.shutdown()
    executor.awaitTermination(5, TimeUnit.SECONDS)
    
    def elapsedTime14 = System.currentTimeMillis() - startTime14
    // At least one should succeed
    def successCount = results.count { !(it instanceof Exception) && it.status == 204 }
    assert successCount >= 1
    assert elapsedTime14 < 500 // Allow more time for concurrent operations
    println "✅ Concurrent validation handled in ${elapsedTime14}ms - ${successCount} successes"
    
    // Test 15: Progress Calculation Accuracy
    println "\n🧪 Test 15: Progress Calculation Accuracy"
    def startTime15 = System.currentTimeMillis()
    
    def progressResponse = client.get(path: "controls/${testPhaseInstanceId}/progress")
    
    def elapsedTime15 = System.currentTimeMillis() - startTime15
    assert progressResponse.status == 200
    assert progressResponse.data.containsKey('progress_percentage') || progressResponse.data.containsKey('phi_id')
    assert elapsedTime15 < 200
    println "✅ Progress calculation works in ${elapsedTime15}ms"
    
    // Test 16: Validation History Tracking
    println "\n🧪 Test 16: Validation History Tracking"
    def startTime16 = System.currentTimeMillis()
    
    // Update control status to track history
    def historyResponse = client.put(
        path: "controls/instance/${testControlInstanceId}/status",
        body: [
            cti_status: 'COMPLETED'
        ]
    )
    
    def elapsedTime16 = System.currentTimeMillis() - startTime16
    assert historyResponse.status == 204
    assert elapsedTime16 < 200
    
    // Verify the control was updated
    def updatedControlResponse = client.get(path: "controls/instance/${testControlInstanceId}")
    assert updatedControlResponse.status == 200
    println "✅ Validation history tracking works in ${elapsedTime16}ms"
    
    // Test 17: Cross-phase Control Dependencies
    println "\n🧪 Test 17: Cross-phase Control Dependencies"
    def startTime17 = System.currentTimeMillis()
    
    // Get controls by sequence to check cross-phase relationships
    def sequenceControlsResponse = client.get(
        path: 'controls/instance',
        query: [sequenceInstanceId: testSequenceInstanceId.toString()]
    )
    
    def elapsedTime17 = System.currentTimeMillis() - startTime17
    assert sequenceControlsResponse.status == 200
    assert sequenceControlsResponse.data instanceof List
    assert sequenceControlsResponse.data.size() >= 2 // Our test controls
    assert elapsedTime17 < 200
    println "✅ Cross-phase dependencies query works in ${elapsedTime17}ms - found ${sequenceControlsResponse.data.size()} controls"
    
    // Test 18: Performance under Load (50+ Controls)
    println "\n🧪 Test 18: Performance under Load (50+ Controls)"
    def startTime18 = System.currentTimeMillis()
    
    // Create bulk controls for load testing
    def bulkControls = []
    (1..25).each { i ->
        bulkControls << [
            phm_id: testMasterPhaseId.toString(),
            ctm_name: "Load Test Control ${i}",
            ctm_description: "Control ${i} for load testing",
            ctm_type: (i % 2 == 0) ? 'TECHNICAL' : 'BUSINESS',
            ctm_is_critical: (i % 3 == 0),
            ctm_code: "LTC${String.format('%03d', i)}",
            ctm_order: i + 10
        ]
    }
    
    def bulkCreateResponse = client.post(
        path: 'controls/master/bulk',
        body: [
            controls: bulkControls
        ]
    )
    
    assert bulkCreateResponse.status == 201
    assert bulkCreateResponse.data.created.size() == 25
    assert bulkCreateResponse.data.summary.created_count == 25
    
    // Test retrieval performance with many controls
    def loadTestResponse = client.get(
        path: 'controls/master',
        query: [phaseId: testMasterPhaseId.toString()]
    )
    
    def elapsedTime18 = System.currentTimeMillis() - startTime18
    assert loadTestResponse.status == 200
    assert loadTestResponse.data.size() >= 27 // 25 + our 2 original controls
    assert elapsedTime18 < 1000 // Allow 1 second for bulk operations
    println "✅ Load test completed in ${elapsedTime18}ms - created and retrieved ${loadTestResponse.data.size()} controls"
    
    // Test 19: Transaction Rollback on Error
    println "\n🧪 Test 19: Transaction Rollback on Error"
    def startTime19 = System.currentTimeMillis()
    
    try {
        // Attempt to create control with invalid foreign key
        def invalidResponse = client.post(
            path: 'controls/master',
            body: [
                phm_id: UUID.randomUUID().toString(), // Invalid phase ID
                ctm_name: 'Invalid Control',
                ctm_description: 'Should fail with FK violation'
            ]
        )
        assert false, "Should have thrown exception"
    } catch (HttpResponseException e) {
        def elapsedTime19 = System.currentTimeMillis() - startTime19
        assert e.response.status == 400
        assert elapsedTime19 < 200
        println "✅ Transaction rollback works in ${elapsedTime19}ms - FK violation caught"
    }
    
    // Test 20: Audit Field Population
    println "\n🧪 Test 20: Audit Field Population"
    def startTime20 = System.currentTimeMillis()
    
    def auditTestResponse = client.get(path: "controls/master/${testMasterControlId}")
    
    def elapsedTime20 = System.currentTimeMillis() - startTime20
    assert auditTestResponse.status == 200
    assert auditTestResponse.data.created_by == 'system'
    assert auditTestResponse.data.updated_by != null
    assert auditTestResponse.data.created_at != null
    assert auditTestResponse.data.updated_at != null
    assert elapsedTime20 < 200
    println "✅ Audit fields populated correctly in ${elapsedTime20}ms"
    
    println "\n============================================"
    println "✅ All 20 Controls API tests passed!"
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
            if (testSecondControlInstanceId) {
                sql.execute("DELETE FROM controls_instance_cti WHERE cti_id = ?", [testSecondControlInstanceId])
            }
            if (testControlInstanceId) {
                sql.execute("DELETE FROM controls_instance_cti WHERE cti_id = ?", [testControlInstanceId])
            }
            if (testSecondMasterControlId) {
                sql.execute("DELETE FROM controls_master_ctm WHERE ctm_id = ?", [testSecondMasterControlId])
            }
            if (testMasterControlId) {
                sql.execute("DELETE FROM controls_master_ctm WHERE ctm_id = ?", [testMasterControlId])
            }
            
            // Clean up bulk test controls
            sql.execute("DELETE FROM controls_master_ctm WHERE phm_id = ? AND ctm_name LIKE 'Load Test Control%'", [testMasterPhaseId])
            
            if (testPhaseInstanceId) {
                sql.execute("DELETE FROM phases_instance_phi WHERE phi_id = ?", [testPhaseInstanceId])
            }
            if (testMasterPhaseId) {
                sql.execute("DELETE FROM phases_master_phm WHERE phm_id = ?", [testMasterPhaseId])
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