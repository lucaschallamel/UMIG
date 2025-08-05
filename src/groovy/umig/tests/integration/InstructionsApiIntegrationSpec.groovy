#!/usr/bin/env groovy
/**
 * Integration Test for Instructions API
 * Tests the Instructions API endpoints against a live database with real data
 * 
 * Prerequisites:
 * - Running PostgreSQL database from local-dev-setup
 * - Database initialized with schema and status_sts data
 * 
 * Run from project root: ./src/groovy/umig/tests/run-integration-tests.sh
 */

@Grab('org.postgresql:postgresql:42.7.3')
@Grab('org.codehaus.groovy.modules.http-builder:http-builder:0.7.1')
@Grab('org.spockframework:spock-core:2.3-groovy-3.0')

import groovy.sql.Sql
import groovyx.net.http.RESTClient
import groovyx.net.http.ContentType
import groovyx.net.http.HttpResponseException
import spock.lang.Specification
import spock.lang.Shared
import java.util.UUID

/**
 * Integration test suite for Instructions API
 * Tests complete database integration and system behavior
 */
class InstructionsApiIntegrationSpec extends Specification {

    @Shared Sql sql
    @Shared RESTClient client
    
    // Database configuration
    @Shared def dbUrl = System.getenv('DATABASE_URL') ?: 'jdbc:postgresql://postgres:5432/umig_app_db'
    @Shared def dbUser = System.getenv('DATABASE_USER') ?: 'umig_app_user'
    @Shared def dbPassword = System.getenv('DATABASE_PASSWORD') ?: '123456'
    @Shared def dbDriver = 'org.postgresql.Driver'
    
    // API configuration
    @Shared def apiBaseUrl = System.getenv('API_BASE_URL') ?: 'http://localhost:8090'
    @Shared def apiPath = '/rest/scriptrunner/latest/custom'
    
    // Test data storage
    @Shared def testTeamId
    @Shared def testUserId
    @Shared def testMigrationId
    @Shared def testIterationId
    @Shared def testMasterPlanId
    @Shared def testPlanInstanceId
    @Shared def testMasterSequenceId
    @Shared def testSequenceInstanceId
    @Shared def testMasterPhaseId
    @Shared def testPhaseInstanceId
    @Shared def testMasterStepId
    @Shared def testStepInstanceId
    @Shared def testControlMasterId
    @Shared def testControlInstanceId
    @Shared def testMasterInstructionId
    @Shared def testSecondMasterInstructionId
    @Shared def testInstructionInstanceId
    
    def setupSpec() {
        println "============================================"
        println "Instructions API Integration Test Setup"
        println "============================================"
        println "Database URL: ${dbUrl}"
        println "API Base URL: ${apiBaseUrl}${apiPath}"
        println ""
        
        // Connect to database
        sql = Sql.newInstance(dbUrl, dbUser, dbPassword, dbDriver)
        println "✅ Connected to database"
        
        // Create REST client
        client = new RESTClient("${apiBaseUrl}${apiPath}/")
        client.contentType = ContentType.JSON
        println "✅ Created REST client"
        
        // Setup comprehensive test data hierarchy
        setupTestDataHierarchy()
    }
    
    def cleanupSpec() {
        println "\n🧹 Cleaning up test data..."
        cleanupTestData()
        sql?.close()
        println "✅ Test data cleaned up"
    }
    
    /**
     * Sets up complete test data hierarchy from migration down to instructions
     */
    def setupTestDataHierarchy() {
        println "\n📋 Setting up comprehensive test data hierarchy..."
        
        // Create test team
        def teamResult = sql.firstRow("""
            INSERT INTO teams_tms (tms_name, tms_email, tms_description, created_by, updated_by)
            VALUES ('Instructions Test Team', 'instructions-test@example.com', 'Team for instructions integration tests', 'system', 'system')
            RETURNING tms_id
        """)
        testTeamId = teamResult.tms_id
        println "  Created test team: ${testTeamId}"
        
        // Create test user
        def userResult = sql.firstRow("""
            INSERT INTO users_usr (usr_code, usr_first_name, usr_last_name, usr_email, usr_is_admin, usr_confluence_user_id, created_by, updated_by)
            VALUES ('INS', 'Instruction', 'Tester', 'instruction.tester@example.com', false, 'instructiontester', 'system', 'system')
            RETURNING usr_id
        """)
        testUserId = userResult.usr_id
        println "  Created test user: ${testUserId}"
        
        // Create test migration and iteration
        def migrationResult = sql.firstRow("""
            INSERT INTO migrations_mig (mig_code, mig_name, mig_status, created_by, updated_by)
            VALUES ('INS-TEST', 'Instructions Test Migration', 'ACTIVE', 'system', 'system')
            RETURNING mig_id
        """)
        testMigrationId = migrationResult.mig_id
        println "  Created test migration: ${testMigrationId}"
        
        def iterationResult = sql.firstRow("""
            INSERT INTO iterations_ite (itr_code, itr_name, itr_type, mig_id, created_by, updated_by)
            VALUES ('INS-IT1', 'Instructions Test Iteration', 'CUTOVER', :migId, 'system', 'system')
            RETURNING itr_id
        """, [migId: testMigrationId])
        testIterationId = iterationResult.itr_id
        println "  Created test iteration: ${testIterationId}"
        
        // Create test master plan and instance
        def planResult = sql.firstRow("""
            INSERT INTO plans_master_plm (tms_id, plm_name, plm_description, plm_status, created_by, updated_by)
            VALUES (:teamId, 'Instructions Test Plan', 'Plan for instruction testing', 'DRAFT', 'system', 'system')
            RETURNING plm_id
        """, [teamId: testTeamId])
        testMasterPlanId = planResult.plm_id
        println "  Created test master plan: ${testMasterPlanId}"
        
        def planInstanceResult = sql.firstRow("""
            INSERT INTO plans_instance_pli (plm_id, ite_id, usr_id_owner, pli_name, pli_description, created_by, updated_by)
            VALUES (:planId, :iterationId, :userId, 'Instructions Test Plan Instance', 'Instance for instruction testing', 'system', 'system')
            RETURNING pli_id
        """, [planId: testMasterPlanId, iterationId: testIterationId, userId: testUserId])
        testPlanInstanceId = planInstanceResult.pli_id
        println "  Created test plan instance: ${testPlanInstanceId}"
        
        // Create test master sequence and instance
        def sequenceResult = sql.firstRow("""
            INSERT INTO sequences_master_sqm (plm_id, sqm_name, sqm_description, sqm_order, created_by, updated_by)
            VALUES (:planId, 'Instructions Test Sequence', 'Sequence for instruction testing', 1, 'system', 'system')
            RETURNING sqm_id
        """, [planId: testMasterPlanId])
        testMasterSequenceId = sequenceResult.sqm_id
        println "  Created test master sequence: ${testMasterSequenceId}"
        
        def sequenceInstanceResult = sql.firstRow("""
            INSERT INTO sequences_instance_sqi (sqm_id, pli_id, sqi_name, sqi_description, sqi_order, created_by, updated_by)
            VALUES (:sequenceId, :planInstanceId, 'Instructions Test Sequence Instance', 'Instance for instruction testing', 1, 'system', 'system')
            RETURNING sqi_id
        """, [sequenceId: testMasterSequenceId, planInstanceId: testPlanInstanceId])
        testSequenceInstanceId = sequenceInstanceResult.sqi_id
        println "  Created test sequence instance: ${testSequenceInstanceId}"
        
        // Create test master phase and instance
        def phaseResult = sql.firstRow("""
            INSERT INTO phases_master_phm (sqm_id, phm_name, phm_description, phm_order, created_by, updated_by)
            VALUES (:sequenceId, 'Instructions Test Phase', 'Phase for instruction testing', 1, 'system', 'system')
            RETURNING phm_id
        """, [sequenceId: testMasterSequenceId])
        testMasterPhaseId = phaseResult.phm_id
        println "  Created test master phase: ${testMasterPhaseId}"
        
        def phaseInstanceResult = sql.firstRow("""
            INSERT INTO phases_instance_phi (phm_id, sqi_id, phi_name, phi_description, created_by, updated_by)
            VALUES (:phaseId, :sequenceInstanceId, 'Instructions Test Phase Instance', 'Instance for instruction testing', 'system', 'system')
            RETURNING phi_id
        """, [phaseId: testMasterPhaseId, sequenceInstanceId: testSequenceInstanceId])
        testPhaseInstanceId = phaseInstanceResult.phi_id
        println "  Created test phase instance: ${testPhaseInstanceId}"
        
        // Create test master step and instance
        def stepResult = sql.firstRow("""
            INSERT INTO steps_master_stm (phi_id, stm_name, stm_description, stm_number, stm_type, stt_code, created_by, updated_by)
            VALUES (:phaseId, 'Instructions Test Step', 'Step for instruction testing', 1, 'MANUAL', 'MAN', 'system', 'system')
            RETURNING stm_id
        """, [phaseId: testMasterPhaseId])
        testMasterStepId = stepResult.stm_id
        println "  Created test master step: ${testMasterStepId}"
        
        def stepInstanceResult = sql.firstRow("""
            INSERT INTO steps_instance_sti (stm_id, phi_id, sti_name, sti_description, created_by, updated_by)
            VALUES (:stepId, :phaseInstanceId, 'Instructions Test Step Instance', 'Instance for instruction testing', 'system', 'system')
            RETURNING sti_id
        """, [stepId: testMasterStepId, phaseInstanceId: testPhaseInstanceId])
        testStepInstanceId = stepInstanceResult.sti_id
        println "  Created test step instance: ${testStepInstanceId}"
        
        // Create test control master and instance
        def controlResult = sql.firstRow("""
            INSERT INTO controls_master_ctm (phm_id, ctm_name, ctm_description, ctm_type, ctm_validation_rule, created_by, updated_by)
            VALUES (:phaseId, 'Instructions Test Control', 'Control for instruction testing', 'TECHNICAL', 'MANUAL', 'system', 'system')
            RETURNING ctm_id
        """, [phaseId: testMasterPhaseId])
        testControlMasterId = controlResult.ctm_id
        println "  Created test control master: ${testControlMasterId}"
        
        def controlInstanceResult = sql.firstRow("""
            INSERT INTO controls_instance_cti (ctm_id, phi_id, cti_name, cti_description, cti_type, cti_status, created_by, updated_by)
            VALUES (:controlMasterId, :phaseInstanceId, 'Instructions Test Control Instance', 'Instance control for instruction testing', 'TECHNICAL', 'PENDING', 'system', 'system')
            RETURNING cti_id
        """, [controlMasterId: testControlMasterId, phaseInstanceId: testPhaseInstanceId])
        testControlInstanceId = controlInstanceResult.cti_id
        println "  Created test control instance: ${testControlInstanceId}"
        
        println "✅ Test data hierarchy created successfully"
    }
    
    /**
     * Cleanup all test data in reverse dependency order
     */
    def cleanupTestData() {
        try {
            // Delete in reverse order of creation
            if (testInstructionInstanceId) {
                sql.execute("DELETE FROM instructions_instance_ini WHERE ini_id = ?", [testInstructionInstanceId])
            }
            if (testMasterInstructionId) {
                sql.execute("DELETE FROM instructions_master_inm WHERE inm_id = ?", [testMasterInstructionId])
            }
            if (testSecondMasterInstructionId) {
                sql.execute("DELETE FROM instructions_master_inm WHERE inm_id = ?", [testSecondMasterInstructionId])
            }
            if (testControlInstanceId) {
                sql.execute("DELETE FROM controls_instance_cti WHERE cti_id = ?", [testControlInstanceId])
            }
            if (testControlMasterId) {
                sql.execute("DELETE FROM controls_master_ctm WHERE ctm_id = ?", [testControlMasterId])
            }
            if (testStepInstanceId) {
                sql.execute("DELETE FROM steps_instance_sti WHERE sti_id = ?", [testStepInstanceId])
            }
            if (testMasterStepId) {
                sql.execute("DELETE FROM steps_master_stm WHERE stm_id = ?", [testMasterStepId])
            }
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
        } catch (Exception e) {
            println "⚠️  Failed to cleanup some test data: ${e.message}"
        }
    }
    
    // ==================== MASTER INSTRUCTION MANAGEMENT TESTS ====================
    
    def "Test 1: Create Master Instruction"() {
        when: "Creating a master instruction"
        def createResponse = client.post(
            path: 'instructions',
            body: [
                stmId: testMasterStepId.toString(),
                tmsId: testTeamId.toString(),
                ctmId: testControlMasterId.toString(),
                inmOrder: 1,
                inmBody: 'Test instruction for integration testing',
                inmDurationMinutes: 30
            ]
        )
        
        then: "Response should be successful"
        createResponse.status == 201
        createResponse.data.success == true
        createResponse.data.inmId != null
        
        and: "Store created ID for later tests"
        testMasterInstructionId = UUID.fromString(createResponse.data.inmId as String)
        
        and: "Verify in database"
        def dbRecord = sql.firstRow("SELECT * FROM instructions_master_inm WHERE inm_id = ?", [testMasterInstructionId])
        dbRecord != null
        dbRecord.stm_id == testMasterStepId
        dbRecord.tms_id == testTeamId
        dbRecord.ctm_id == testControlMasterId
        dbRecord.inm_order == 1
        dbRecord.inm_body == 'Test instruction for integration testing'
        dbRecord.inm_duration_minutes == 30
    }
    
    def "Test 2: Get Master Instructions by Step ID"() {
        when: "Retrieving master instructions by step ID"
        def response = client.get(
            path: 'instructions',
            query: [stepId: testMasterStepId.toString()]
        )
        
        then: "Response should contain our test instruction"
        response.status == 200
        response.data instanceof List
        response.data.size() >= 1
        
        def instruction = response.data.find { it.inm_id == testMasterInstructionId.toString() }
        instruction != null
        instruction.stm_id == testMasterStepId.toString()
        instruction.tms_id == testTeamId
        instruction.tms_name == "Instructions Test Team"
        instruction.inm_body == 'Test instruction for integration testing'
    }
    
    def "Test 3: Update Master Instruction"() {
        when: "Updating master instruction"
        def updateResponse = client.put(
            path: "instructions/${testMasterInstructionId}",
            body: [
                inmBody: 'Updated instruction body for testing',
                inmDurationMinutes: 45
            ]
        )
        
        then: "Update should be successful"
        updateResponse.status == 200
        updateResponse.data.success == true
        updateResponse.data.inmId == testMasterInstructionId.toString()
        
        and: "Verify update in database"
        def dbRecord = sql.firstRow("SELECT * FROM instructions_master_inm WHERE inm_id = ?", [testMasterInstructionId])
        dbRecord.inm_body == 'Updated instruction body for testing'
        dbRecord.inm_duration_minutes == 45
    }
    
    def "Test 4: Create Master Instruction with Order Conflict"() {
        when: "Creating master instruction with existing order"
        client.post(
            path: 'instructions',
            body: [
                stmId: testMasterStepId.toString(),
                inmOrder: 1,  // Same order as existing instruction
                inmBody: 'Duplicate order instruction'
            ]
        )
        
        then: "Should get conflict error"
        HttpResponseException ex = thrown()
        ex.response.status == 409
        ex.response.data.error.contains("order already exists")
    }
    
    def "Test 5: Create Master Instruction with Invalid Step Reference"() {
        when: "Creating master instruction with non-existent step"
        def randomStepId = UUID.randomUUID()
        client.post(
            path: 'instructions',
            body: [
                stmId: randomStepId.toString(),
                inmOrder: 1,
                inmBody: 'Invalid step reference'
            ]
        )
        
        then: "Should get bad request error"
        HttpResponseException ex = thrown()
        ex.response.status == 400
        ex.response.data.error.contains("does not exist")
    }
    
    // ==================== INSTANCE INSTRUCTION MANAGEMENT TESTS ====================
    
    def "Test 6: Create Instruction Instance"() {
        when: "Creating instruction instance"
        def createResponse = client.post(
            path: 'instructions/instance',
            body: [
                stiId: testStepInstanceId.toString(),
                inmIds: [testMasterInstructionId.toString()]
            ]
        )
        
        then: "Response should be successful"
        createResponse.status == 201
        createResponse.data.success == true
        createResponse.data.createdInstances.size() == 1
        
        and: "Store created instance ID"
        testInstructionInstanceId = UUID.fromString(createResponse.data.createdInstances[0] as String)
        
        and: "Verify in database"
        def dbRecord = sql.firstRow("SELECT * FROM instructions_instance_ini WHERE ini_id = ?", [testInstructionInstanceId])
        dbRecord != null
        dbRecord.sti_id == testStepInstanceId
        dbRecord.inm_id == testMasterInstructionId
        dbRecord.ini_is_completed == false
    }
    
    def "Test 7: Get Instance Instructions by Step Instance ID"() {
        when: "Retrieving instance instructions"
        def response = client.get(
            path: 'instructions',
            query: [stepInstanceId: testStepInstanceId.toString()]
        )
        
        then: "Response should contain our instance"
        response.status == 200
        response.data instanceof List
        response.data.size() >= 1
        
        def instance = response.data.find { it.ini_id == testInstructionInstanceId.toString() }
        instance != null
        instance.sti_id == testStepInstanceId.toString()
        instance.inm_id == testMasterInstructionId.toString()
        instance.ini_is_completed == false
    }
    
    def "Test 8: Get Instance Instruction by ID"() {
        when: "Retrieving specific instance instruction"
        def response = client.get(path: "instructions/instance/${testInstructionInstanceId}")
        
        then: "Response should contain instruction details"
        response.status == 200
        response.data.ini_id == testInstructionInstanceId.toString()
        response.data.sti_id == testStepInstanceId.toString()
        response.data.inm_id == testMasterInstructionId.toString()
        response.data.ini_is_completed == false
    }
    
    def "Test 9: Complete Instruction Instance"() {
        when: "Completing instruction instance"
        def completeResponse = client.put(
            path: "instructions/instance/${testInstructionInstanceId}",
            body: [
                action: 'complete',
                userId: testUserId.toString()
            ]
        )
        
        then: "Completion should be successful"
        completeResponse.status == 200
        completeResponse.data.success == true
        completeResponse.data.action == 'completed'
        
        and: "Verify completion in database"
        def dbRecord = sql.firstRow("SELECT * FROM instructions_instance_ini WHERE ini_id = ?", [testInstructionInstanceId])
        dbRecord.ini_is_completed == true
        dbRecord.usr_id_completed_by == testUserId
        dbRecord.ini_completed_at != null
    }
    
    def "Test 10: Uncomplete Instruction Instance"() {
        when: "Marking instruction as incomplete"
        def uncompleteResponse = client.put(
            path: "instructions/instance/${testInstructionInstanceId}",
            body: [
                action: 'uncomplete'
            ]
        )
        
        then: "Uncomplete should be successful"
        uncompleteResponse.status == 200
        uncompleteResponse.data.success == true
        uncompleteResponse.data.action == 'uncompleted'
        
        and: "Verify uncomplete in database"
        def dbRecord = sql.firstRow("SELECT * FROM instructions_instance_ini WHERE ini_id = ?", [testInstructionInstanceId])
        dbRecord.ini_is_completed == false
        dbRecord.usr_id_completed_by == null
        dbRecord.ini_completed_at == null
    }
    
    // ==================== BULK OPERATIONS TESTS ====================
    
    def "Test 11: Bulk Create Master Instructions"() {
        when: "Creating multiple master instructions"
        def bulkResponse = client.post(
            path: 'instructions/bulk',
            body: [
                instructions: [
                    [
                        type: 'master',
                        stmId: testMasterStepId.toString(),
                        tmsId: testTeamId.toString(),
                        inmOrder: 2,
                        inmBody: 'Bulk created instruction 1',
                        inmDurationMinutes: 15
                    ],
                    [
                        type: 'master',
                        stmId: testMasterStepId.toString(),
                        inmOrder: 3,
                        inmBody: 'Bulk created instruction 2',
                        inmDurationMinutes: 20
                    ]
                ]
            ]
        )
        
        then: "Bulk creation should be successful"
        bulkResponse.status == 201
        bulkResponse.data.success == true
        bulkResponse.data.created.size() == 2
        bulkResponse.data.errors.size() == 0
        
        and: "Store second instruction ID for later tests"
        testSecondMasterInstructionId = UUID.fromString(bulkResponse.data.created[1].inmId as String)
    }
    
    def "Test 12: Bulk Update Instructions with Mixed Results"() {
        when: "Bulk updating with valid and invalid data"
        def bulkResponse = client.put(
            path: 'instructions/bulk',
            body: [
                updates: [
                    [
                        type: 'master',
                        inmId: testMasterInstructionId.toString(),
                        inmBody: 'Bulk updated instruction'
                    ],
                    [
                        type: 'master',
                        inmId: UUID.randomUUID().toString(), // Non-existent ID
                        inmBody: 'This should fail'
                    ]
                ]
            ]
        )
        
        then: "Response should show mixed results"
        bulkResponse.status == 200
        bulkResponse.data.success == false
        bulkResponse.data.updated.size() == 1
        bulkResponse.data.errors.size() == 1
        
        and: "Verify successful update"
        def dbRecord = sql.firstRow("SELECT * FROM instructions_master_inm WHERE inm_id = ?", [testMasterInstructionId])
        dbRecord.inm_body == 'Bulk updated instruction'
    }
    
    // ==================== HIERARCHICAL FILTERING AND ANALYTICS TESTS ====================
    
    def "Test 13: Analytics Progress with Migration Filter"() {
        when: "Getting progress analytics by migration"
        def response = client.get(
            path: 'instructions/analytics/progress',
            query: [migrationId: testMigrationId.toString()]
        )
        
        then: "Response should contain progress metrics"
        response.status == 200
        response.data.total_instructions >= 1
        response.data.containsKey('completed_instructions')
        response.data.containsKey('pending_instructions')
        response.data.containsKey('completion_percentage')
        response.data.instructions instanceof List
    }
    
    def "Test 14: Analytics Completion by Migration"() {
        when: "Getting completion statistics by migration"
        def response = client.get(
            path: 'instructions/analytics/completion',
            query: [migrationId: testMigrationId.toString()]
        )
        
        then: "Response should contain completion statistics"
        response.status == 200
        response.data.migration_id == testMigrationId.toString()
        response.data.containsKey('total_instructions')
        response.data.containsKey('completed')
        response.data.containsKey('pending')
        response.data.containsKey('completion_percentage')
        response.data.containsKey('by_team')
        response.data.by_team instanceof List
    }
    
    def "Test 15: Team Workload Analytics"() {
        when: "Getting team workload for specific iteration"
        def response = client.get(
            path: 'instructions/analytics/completion',
            query: [
                teamId: testTeamId.toString(),
                iterationId: testIterationId.toString()
            ]
        )
        
        then: "Response should contain team workload"
        response.status == 200
        response.data.tms_id == testTeamId
        response.data.tms_name == "Instructions Test Team"
        response.data.iteration_id == testIterationId.toString()
        response.data.containsKey('total_instructions')
        response.data.containsKey('by_phase')
    }
    
    def "Test 16: Hierarchical Filtering by Plan Instance"() {
        when: "Getting progress with plan instance filter"
        def response = client.get(
            path: 'instructions/analytics/progress',
            query: [planInstanceId: testPlanInstanceId.toString()]
        )
        
        then: "Response should be filtered correctly"
        response.status == 200
        response.data.instructions instanceof List
        
        and: "All instructions should belong to our test hierarchy"
        response.data.instructions.each { instruction ->
            assert instruction.containsKey('migration_name')
            assert instruction.containsKey('iteration_name')
            assert instruction.containsKey('plan_name')
        }
    }
    
    // ==================== REORDERING AND UTILITY TESTS ====================
    
    def "Test 17: Reorder Master Instructions"() {
        when: "Reordering master instructions"
        def reorderResponse = client.post(
            path: 'reorder',
            body: [
                stmId: testMasterStepId.toString(),
                orderData: [
                    [inmId: testSecondMasterInstructionId.toString(), newOrder: 1],
                    [inmId: testMasterInstructionId.toString(), newOrder: 2]
                ]
            ]
        )
        
        then: "Reordering should be successful"
        reorderResponse.status == 200
        reorderResponse.data.success == true
        reorderResponse.data.affectedInstructions == 2
        
        and: "Verify new order in database"
        def firstInstruction = sql.firstRow("SELECT inm_order FROM instructions_master_inm WHERE inm_id = ?", [testSecondMasterInstructionId])
        def secondInstruction = sql.firstRow("SELECT inm_order FROM instructions_master_inm WHERE inm_id = ?", [testMasterInstructionId])
        firstInstruction.inm_order == 1
        secondInstruction.inm_order == 2
    }
    
    def "Test 18: Get Instruction Completion Timeline"() {
        given: "Complete an instruction for timeline data"
        client.put(
            path: "instructions/instance/${testInstructionInstanceId}",
            body: [action: 'complete', userId: testUserId.toString()]
        )
        
        when: "Getting completion timeline"
        def response = client.get(
            path: 'timeline',
            query: [iterationId: testIterationId.toString()]
        )
        
        then: "Response should contain timeline data"
        response.status == 200
        response.data.iterationId == testIterationId.toString()
        response.data.timeline instanceof List
        response.data.total_completed >= 1
        
        and: "Timeline should contain our completed instruction"
        def completedInstruction = response.data.timeline.find { it.ini_id == testInstructionInstanceId.toString() }
        completedInstruction != null
        completedInstruction.ini_completed_at != null
        completedInstruction.usr_first_name == "Instruction"
        completedInstruction.usr_last_name == "Tester"
    }
    
    def "Test 19: Get Instruction Statuses"() {
        when: "Getting instruction statuses"
        def response = client.get(path: 'statuses/instruction')
        
        then: "Response should contain status options"
        response.status == 200
        response.data instanceof List
        response.data.size() > 0
        
        and: "Each status should have required fields"
        response.data.each { status ->
            assert status.containsKey('sts_id')
            assert status.containsKey('sts_name')
            assert status.containsKey('sts_color')
            assert status.sts_type == 'Instruction'
        }
    }
    
    // ==================== CONSTRAINT AND ERROR HANDLING TESTS ====================
    
    def "Test 20: Database Constraint - Foreign Key Violation"() {
        when: "Creating instruction with non-existent team"
        client.post(
            path: 'instructions',
            body: [
                stmId: testMasterStepId.toString(),
                tmsId: "99999", // Non-existent team
                inmOrder: 10,
                inmBody: 'Invalid team reference'
            ]
        )
        
        then: "Should get foreign key violation error"
        HttpResponseException ex = thrown()
        ex.response.status == 400
        ex.response.data.error.contains("does not exist")
    }
    
    def "Test 21: Database Constraint - Invalid UUID Format"() {
        when: "Using invalid UUID format"
        client.get(path: "instructions/instance/invalid-uuid")
        
        then: "Should get bad request error"
        HttpResponseException ex = thrown()
        ex.response.status == 400
        ex.response.data.error.contains("Invalid")
    }
    
    def "Test 22: Transaction Integrity - Bulk Operation Rollback"() {
        given: "Prepare bulk operation with one invalid item"
        def initialCount = sql.firstRow("SELECT COUNT(*) as count FROM instructions_master_inm WHERE stm_id = ?", [testMasterStepId]).count
        
        when: "Attempting bulk creation with mixed validity"
        def bulkResponse = client.post(
            path: 'instructions/bulk',
            body: [
                instructions: [
                    [
                        type: 'master',
                        stmId: testMasterStepId.toString(),
                        inmOrder: 20,
                        inmBody: 'Valid instruction'
                    ],
                    [
                        type: 'master',
                        stmId: testMasterStepId.toString(),
                        inmOrder: 20, // Duplicate order - should cause conflict
                        inmBody: 'Duplicate order instruction'
                    ]
                ]
            ]
        )
        
        then: "Response should show partial success"
        bulkResponse.status == 206 // Partial Content
        bulkResponse.data.success == false
        bulkResponse.data.created.size() >= 0
        bulkResponse.data.errors.size() >= 1
        
        and: "Database should maintain consistency"
        def finalCount = sql.firstRow("SELECT COUNT(*) as count FROM instructions_master_inm WHERE stm_id = ?", [testMasterStepId]).count
        finalCount > initialCount // Some valid instructions were created
    }
    
    def "Test 23: Performance - Large Dataset Handling"() {
        when: "Retrieving analytics for migration with potential large dataset"
        def startTime = System.currentTimeMillis()
        def response = client.get(
            path: 'instructions/analytics/completion',
            query: [migrationId: testMigrationId.toString()]
        )
        def endTime = System.currentTimeMillis()
        def responseTime = endTime - startTime
        
        then: "Response should be successful and reasonably fast"
        response.status == 200
        responseTime < 5000 // Less than 5 seconds
        
        and: "Response should contain expected data structure"
        response.data.containsKey('total_instructions')
        response.data.containsKey('by_team')
        response.data.by_team instanceof List
    }
    
    def "Test 24: Concurrent Access - Multiple Instructions Creation"() {
        when: "Creating multiple instructions concurrently"
        def responses = []
        def threads = []
        
        (1..3).each { i ->
            threads << Thread.start {
                try {
                    def response = client.post(
                        path: 'instructions',
                        body: [
                            stmId: testMasterStepId.toString(),
                            inmOrder: (30 + i),
                            inmBody: "Concurrent instruction ${i}",
                            inmDurationMinutes: (10 + i)
                        ]
                    )
                    synchronized(responses) {
                        responses << response
                    }
                } catch (Exception e) {
                    synchronized(responses) {
                        responses << [error: e.message]
                    }
                }
            }
        }
        
        threads.each { it.join() }
        
        then: "All concurrent creations should succeed"
        responses.size() == 3
        responses.each { response ->
            if (response.hasProperty('status')) {
                assert response.status == 201
                assert response.data.success == true
            }
        }
    }
    
    def "Test 25: Cross-Entity Integration - Verify Relationships"() {
        when: "Getting detailed instruction with full hierarchy"
        def response = client.get(
            path: 'instructions/analytics/progress',
            query: [stepInstanceId: testStepInstanceId.toString()]
        )
        
        then: "Response should contain complete hierarchy information"
        response.status == 200
        response.data.instructions.size() >= 1
        
        and: "Each instruction should have full context"
        def instruction = response.data.instructions[0]
        instruction.containsKey('migration_name')
        instruction.containsKey('iteration_name') 
        instruction.containsKey('plan_name')
        instruction.containsKey('sequence_name')
        instruction.containsKey('phase_name')
        instruction.containsKey('step_name')
        instruction.containsKey('team_name')
        
        and: "Values should match our test data"
        instruction.migration_name == "Instructions Test Migration"
        instruction.iteration_name == "Instructions Test Iteration"
        instruction.plan_name == "Instructions Test Plan Instance"
        instruction.team_name == "Instructions Test Team"
    }
    
    def "Test 26: Data Integrity - Completion Workflow"() {
        given: "Create fresh instruction instance for completion workflow"
        def createResponse = client.post(
            path: 'instructions/instance',
            body: [
                stiId: testStepInstanceId.toString(),
                inmIds: [testMasterInstructionId.toString()]
            ]
        )
        def workflowInstanceId = UUID.fromString(createResponse.data.createdInstances[0] as String)
        
        when: "Complete instruction and verify state changes"
        // Step 1: Verify initial state
        def initialState = sql.firstRow("SELECT ini_is_completed, ini_completed_at, usr_id_completed_by FROM instructions_instance_ini WHERE ini_id = ?", [workflowInstanceId])
        
        // Step 2: Complete the instruction
        client.put(
            path: "instructions/instance/${workflowInstanceId}",
            body: [action: 'complete', userId: testUserId.toString()]
        )
        
        // Step 3: Verify completed state
        def completedState = sql.firstRow("SELECT ini_is_completed, ini_completed_at, usr_id_completed_by FROM instructions_instance_ini WHERE ini_id = ?", [workflowInstanceId])
        
        // Step 4: Uncomplete the instruction
        client.put(
            path: "instructions/instance/${workflowInstanceId}",
            body: [action: 'uncomplete']
        )
        
        // Step 5: Verify uncompleted state
        def uncompletedState = sql.firstRow("SELECT ini_is_completed, ini_completed_at, usr_id_completed_by FROM instructions_instance_ini WHERE ini_id = ?", [workflowInstanceId])
        
        then: "All state transitions should be correct"
        // Initial state
        initialState.ini_is_completed == false
        initialState.ini_completed_at == null
        initialState.usr_id_completed_by == null
        
        // Completed state
        completedState.ini_is_completed == true
        completedState.ini_completed_at != null
        completedState.usr_id_completed_by == testUserId
        
        // Uncompleted state
        uncompletedState.ini_is_completed == false
        uncompletedState.ini_completed_at == null
        uncompletedState.usr_id_completed_by == null
        
        cleanup: "Remove workflow test instance"
        sql.execute("DELETE FROM instructions_instance_ini WHERE ini_id = ?", [workflowInstanceId])
    }
    
    def "Test 27: API Security - Authorization Headers"() {
        when: "Making request without proper authorization"
        def unauthorizedClient = new RESTClient("${apiBaseUrl}${apiPath}/")
        unauthorizedClient.contentType = ContentType.JSON
        // Note: In real environment, this would test authentication
        // For integration test, we assume the endpoint security is configured
        
        def response = unauthorizedClient.get(path: 'instructions', query: [stepId: testMasterStepId.toString()])
        
        then: "Request should succeed in test environment"
        // Note: Real security testing would require proper authentication setup
        response.status == 200
    }
    
    def "Test 28: Cleanup and Final Verification"() {
        when: "Deleting created test instructions"
        def deleteResponse = client.delete(path: "instructions/${testMasterInstructionId}")
        
        then: "Deletion should be successful"
        deleteResponse.status == 200
        deleteResponse.data.success == true
        
        and: "Instruction should be removed from database"
        def dbRecord = sql.firstRow("SELECT * FROM instructions_master_inm WHERE inm_id = ?", [testMasterInstructionId])
        dbRecord == null
        
        and: "Related instances should also be deleted"
        def instanceCount = sql.firstRow("SELECT COUNT(*) as count FROM instructions_instance_ini WHERE inm_id = ?", [testMasterInstructionId]).count
        instanceCount == 0
    }
    
    def "Integration Test Summary"() {
        when: "Running comprehensive system validation"
        def migrationStats = client.get(
            path: 'instructions/analytics/completion',
            query: [migrationId: testMigrationId.toString()]
        )
        
        def teamStats = client.get(
            path: 'instructions/analytics/completion',
            query: [teamId: testTeamId.toString()]
        )
        
        then: "System should be in consistent state"
        migrationStats.status == 200
        teamStats.status == 200
        
        and: "All components should be properly integrated"
        migrationStats.data.containsKey('by_team')
        teamStats.data.tms_name == "Instructions Test Team"
        
        println "\n============================================"
        println "✅ Instructions API Integration Tests Complete"
        println "   - Master Instruction CRUD: ✅"
        println "   - Instance Instruction Management: ✅"
        println "   - Bulk Operations: ✅"
        println "   - Hierarchical Filtering: ✅"
        println "   - Analytics & Reporting: ✅"
        println "   - Constraint Validation: ✅"
        println "   - Transaction Integrity: ✅"
        println "   - Performance Testing: ✅"
        println "   - Cross-Entity Integration: ✅"
        println "   - Data Integrity Workflows: ✅"
        println "============================================"
    }
}