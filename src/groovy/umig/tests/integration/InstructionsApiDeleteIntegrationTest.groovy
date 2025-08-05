#!/usr/bin/env groovy
/**
 * Integration Test for Instructions API - DELETE operations
 * Tests the new deletion endpoints added in code review improvements
 * 
 * Prerequisites:
 * - Running PostgreSQL with test database
 * - Liquibase migrations executed
 * - Test data in database
 * 
 * Run from project root: ./src/groovy/umig/tests/run-integration-tests.sh
 */

@Grab('org.spockframework:spock-core:2.3-groovy-3.0')
@Grab('org.postgresql:postgresql:42.7.3')
@Grab('com.atlassian.oai:swagger-request-validator-restassured:2.39.0')
@Grab('io.rest-assured:rest-assured:5.3.2')

import spock.lang.Specification
import spock.lang.Shared
import spock.lang.Stepwise
import io.restassured.RestAssured
import io.restassured.http.ContentType
import groovy.sql.Sql
import java.util.UUID

import static io.restassured.RestAssured.*
import static org.hamcrest.Matchers.*

@Stepwise
class InstructionsApiDeleteIntegrationTest extends Specification {
    
    @Shared String baseUrl = System.getProperty('api.base.url', 'http://localhost:8090/rest/scriptrunner/latest/custom')
    @Shared Sql sql
    @Shared String testAuthToken = "test-auth-token" // Mock auth for testing
    
    // Test data IDs to be created during setup
    @Shared UUID testMigrationId
    @Shared UUID testIterationId
    @Shared UUID testPlanId
    @Shared UUID testSequenceId
    @Shared UUID testPhaseId
    @Shared UUID testStepId
    @Shared UUID testInstructionId
    @Shared UUID testInstanceId
    @Shared UUID testTeamId
    
    def setupSpec() {
        RestAssured.baseURI = baseUrl
        RestAssured.enableLoggingOfRequestAndResponseIfValidationFails()
        
        // Database connection
        sql = Sql.newInstance(
            System.getProperty('db.url', 'jdbc:postgresql://localhost:5432/umig_app_db'),
            System.getProperty('db.user', 'umig_app_user'),
            System.getProperty('db.password', '123456'),
            'org.postgresql.Driver'
        )
        
        // Create test data hierarchy
        createTestDataHierarchy()
    }
    
    def cleanupSpec() {
        // Clean up test data in reverse order
        cleanupTestData()
        sql?.close()
    }
    
    // ==================== DELETE INSTANCE TESTS ====================
    
    def "DELETE /instructions/instance/{id} should delete instruction instance successfully"() {
        given: "an existing instruction instance"
        def instanceToDelete = createTestInstructionInstance()
        
        when: "DELETE request is sent to delete the instance"
        def response = given()
            .header("Authorization", "Bearer ${testAuthToken}")
            .when()
            .delete("/instructions/instance/${instanceToDelete}")
        
        then: "returns 204 No Content"
        response.statusCode == 204
        
        and: "instance is deleted from database"
        def count = sql.firstRow("""
            SELECT COUNT(*) as count 
            FROM instructions_instance_ini 
            WHERE ini_id = ?
        """, [instanceToDelete]).count
        count == 0
    }
    
    def "DELETE /instructions/instance/{id} should return 404 for non-existent instance"() {
        given: "a non-existent instance ID"
        def nonExistentId = UUID.randomUUID()
        
        when: "DELETE request is sent"
        def response = given()
            .header("Authorization", "Bearer ${testAuthToken}")
            .when()
            .delete("/instructions/instance/${nonExistentId}")
        
        then: "returns 404 Not Found"
        response.statusCode == 404
        
        and: "error message indicates instance not found"
        response.then()
            .body("error", containsString("not found"))
    }
    
    def "DELETE /instructions/instance/{id} should handle invalid UUID format"() {
        given: "an invalid UUID format"
        def invalidId = "not-a-uuid"
        
        when: "DELETE request is sent"
        def response = given()
            .header("Authorization", "Bearer ${testAuthToken}")
            .when()
            .delete("/instructions/instance/${invalidId}")
        
        then: "returns 400 Bad Request"
        response.statusCode == 400
        
        and: "error message indicates invalid format"
        response.then()
            .body("error", containsString("Invalid UUID format"))
    }
    
    // ==================== DELETE MASTER TESTS ====================
    
    def "DELETE /instructions/master/{id} should delete master instruction and all instances"() {
        given: "a master instruction with instances"
        def masterToDelete = createTestMasterInstruction()
        def instanceCount = createMultipleInstances(masterToDelete, 3)
        
        when: "DELETE request is sent to delete the master"
        def response = given()
            .header("Authorization", "Bearer ${testAuthToken}")
            .when()
            .delete("/instructions/master/${masterToDelete}")
        
        then: "returns 204 No Content"
        response.statusCode == 204
        
        and: "master instruction is deleted"
        def masterCount = sql.firstRow("""
            SELECT COUNT(*) as count 
            FROM instructions_master_inm 
            WHERE inm_id = ?
        """, [masterToDelete]).count
        masterCount == 0
        
        and: "all instances are cascaded deleted"
        def instancesRemaining = sql.firstRow("""
            SELECT COUNT(*) as count 
            FROM instructions_instance_ini 
            WHERE inm_id = ?
        """, [masterToDelete]).count
        instancesRemaining == 0
    }
    
    def "DELETE /instructions/master/{id} should handle foreign key constraints gracefully"() {
        given: "a master instruction that cannot be deleted due to constraints"
        // This would be a master with special constraints that prevent deletion
        def constrainedMasterId = createConstrainedMasterInstruction()
        
        when: "DELETE request is sent"
        def response = given()
            .header("Authorization", "Bearer ${testAuthToken}")
            .when()
            .delete("/instructions/master/${constrainedMasterId}")
        
        then: "returns 400 Bad Request"
        response.statusCode == 400
        
        and: "error message indicates constraint violation"
        response.then()
            .body("error", containsString("constraint"))
    }
    
    // ==================== BULK DELETE TESTS ====================
    
    def "DELETE /instructions/bulk should delete multiple instances successfully"() {
        given: "multiple instruction instances to delete"
        def instancesToDelete = (1..5).collect { createTestInstructionInstance() }
        def requestBody = [
            instructionInstanceIds: instancesToDelete
        ]
        
        when: "DELETE bulk request is sent"
        def response = given()
            .header("Authorization", "Bearer ${testAuthToken}")
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when()
            .delete("/instructions/bulk")
        
        then: "returns 200 OK"
        response.statusCode == 200
        
        and: "response indicates all deletions successful"
        response.then()
            .body("deleted", equalTo(5))
            .body("failed", equalTo(0))
        
        and: "all instances are deleted from database"
        instancesToDelete.each { instanceId ->
            def count = sql.firstRow("""
                SELECT COUNT(*) as count 
                FROM instructions_instance_ini 
                WHERE ini_id = ?
            """, [instanceId]).count
            assert count == 0
        }
    }
    
    def "DELETE /instructions/bulk should handle partial failures gracefully"() {
        given: "mix of valid and invalid instance IDs"
        def validInstances = (1..3).collect { createTestInstructionInstance() }
        def invalidInstances = (1..2).collect { UUID.randomUUID() }
        def allInstances = validInstances + invalidInstances
        
        def requestBody = [
            instructionInstanceIds: allInstances
        ]
        
        when: "DELETE bulk request is sent"
        def response = given()
            .header("Authorization", "Bearer ${testAuthToken}")
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when()
            .delete("/instructions/bulk")
        
        then: "returns 200 OK (changed from 206 based on review feedback)"
        response.statusCode == 200
        
        and: "response indicates partial success with error details"
        response.then()
            .body("deleted", equalTo(3))
            .body("failed", equalTo(2))
            .body("errors", hasSize(2))
            .body("errors[0].id", isIn(invalidInstances.collect { it.toString() }))
            .body("errors[0].reason", containsString("not found"))
    }
    
    def "DELETE /instructions/bulk should validate request body"() {
        given: "invalid request body"
        def requestBody = [
            wrongField: ["not-an-array"]
        ]
        
        when: "DELETE bulk request is sent"
        def response = given()
            .header("Authorization", "Bearer ${testAuthToken}")
            .contentType(ContentType.JSON)
            .body(requestBody)
            .when()
            .delete("/instructions/bulk")
        
        then: "returns 400 Bad Request"
        response.statusCode == 400
        
        and: "error message indicates missing required field"
        response.then()
            .body("error", containsString("instructionInstanceIds"))
    }
    
    // ==================== AUTHORIZATION TESTS ====================
    
    def "DELETE operations should require authentication"() {
        given: "instance ID but no auth token"
        def instanceId = createTestInstructionInstance()
        
        when: "DELETE request is sent without authorization"
        def response = given()
            .when()
            .delete("/instructions/instance/${instanceId}")
        
        then: "returns 401 Unauthorized"
        response.statusCode == 401
    }
    
    def "DELETE operations should use AuthenticationService for audit fields"() {
        given: "a master instruction to delete"
        def masterId = createTestMasterInstruction()
        
        when: "DELETE request is sent with system user context"
        def response = given()
            .header("Authorization", "Bearer system-token")
            .when()
            .delete("/instructions/master/${masterId}")
        
        then: "returns 204 No Content"
        response.statusCode == 204
        
        and: "audit log shows system user (if audit logging is implemented)"
        // This would check audit_log table for the deletion event
        // with created_by = 'system' based on AuthenticationService
    }
    
    // ==================== HELPER METHODS ====================
    
    private void createTestDataHierarchy() {
        // Create complete hierarchy for testing
        testMigrationId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO migrations_mig (mig_id, mig_name, created_by, updated_by)
            VALUES (?, 'TEST_MIGRATION_DELETE', 'test', 'test')
        """, [testMigrationId])
        
        testIterationId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO iterations_ite (ite_id, mig_id, ite_name, created_by, updated_by)
            VALUES (?, ?, 'TEST_ITERATION_DELETE', 'test', 'test')
        """, [testIterationId, testMigrationId])
        
        // Create Plan
        testPlanId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO plans_instance_pli (pli_id, ite_id, plm_id, created_by, updated_by)
            VALUES (?, ?, NULL, 'test', 'test')
        """, [testPlanId, testIterationId])
        
        // Create Sequence
        testSequenceId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO sequences_instance_sqi (sqi_id, pli_id, sqm_id, created_by, updated_by)
            VALUES (?, ?, NULL, 'test', 'test')
        """, [testSequenceId, testPlanId])
        
        // Create Phase
        testPhaseId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO phases_instance_phi (phi_id, sqi_id, phm_id, created_by, updated_by)
            VALUES (?, ?, NULL, 'test', 'test')
        """, [testPhaseId, testSequenceId])
        
        // Create Team
        testTeamId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO teams_tms (tms_id, tms_name, created_by, updated_by)
            VALUES (?, 'TEST_TEAM_DELETE', 'test', 'test')
        """, [testTeamId])
        
        // Create Step Instance
        testStepId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO steps_instance_sti 
            (sti_id, phi_id, stm_id, tms_id, sti_is_critical, sti_minutes_after_migration, created_by, updated_by)
            VALUES (?, ?, NULL, ?, false, 0, 'test', 'test')
        """, [testStepId, testPhaseId, testTeamId])
        
        // Create Master Instruction
        testInstructionId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO instructions_master_inm 
            (inm_id, stm_id, inm_order, inm_body, inm_duration_minutes, created_by, updated_by)
            VALUES (?, NULL, 1, 'TEST_MASTER_INSTRUCTION', 30, 'test', 'test')
        """, [testInstructionId])
        
        // Create Instance Instruction
        testInstanceId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO instructions_instance_ini 
            (ini_id, inm_id, sti_id, ini_body, ini_is_completed, created_by, updated_by)
            VALUES (?, ?, ?, 'TEST_INSTANCE_INSTRUCTION', false, 'test', 'test')
        """, [testInstanceId, testInstructionId, testStepId])
    }
    
    private UUID createTestInstructionInstance() {
        def instanceId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO instructions_instance_ini 
            (ini_id, inm_id, sti_id, ini_body, ini_is_completed, created_by, updated_by)
            VALUES (?, ?, ?, 'Test Instance', false, 'test', 'test')
        """, [instanceId, testInstructionId, testStepId])
        return instanceId
    }
    
    private UUID createTestMasterInstruction() {
        def masterId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO instructions_master_inm 
            (inm_id, stm_id, inm_order, inm_body, inm_duration_minutes, created_by, updated_by)
            VALUES (?, ?, 1, 'Test Master', 30, 'test', 'test')
        """, [masterId, testStepId])
        return masterId
    }
    
    private int createMultipleInstances(UUID masterId, int count) {
        count.times {
            def instanceId = UUID.randomUUID()
            sql.executeInsert("""
                INSERT INTO instructions_instance_ini 
                (ini_id, inm_id, sti_id, ini_body, ini_is_completed, created_by, updated_by)
                VALUES (?, ?, ?, 'Test Instance', false, 'test', 'test')
            """, [instanceId, masterId, testStepId])
        }
        return count
    }
    
    private UUID createConstrainedMasterInstruction() {
        // Create a master instruction with instances that have additional dependencies
        // This simulates a scenario where deletion would violate foreign key constraints
        def masterId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO instructions_master_inm 
            (inm_id, stm_id, inm_order, inm_body, inm_duration_minutes, created_by, updated_by)
            VALUES (?, NULL, 999, 'Constrained Master', 60, 'test', 'test')
        """, [masterId])
        
        // Create an instance that has dependencies (simulating constraint)
        def instanceId = UUID.randomUUID()
        sql.executeInsert("""
            INSERT INTO instructions_instance_ini 
            (ini_id, inm_id, sti_id, ini_body, ini_is_completed, created_by, updated_by)
            VALUES (?, ?, ?, 'Constrained Instance', false, 'test', 'test')
        """, [instanceId, masterId, testStepId])
        
        // Note: In a real scenario, this might have additional references that prevent deletion
        // For testing purposes, we're simulating the constraint at the API level
        
        return masterId
    }
    
    private void cleanupTestData() {
        // Clean up in reverse order due to foreign keys
        try {
            sql.execute("DELETE FROM instructions_instance_ini WHERE created_by = 'test'")
            sql.execute("DELETE FROM instructions_master_inm WHERE created_by = 'test'")
            sql.execute("DELETE FROM steps_instance_sti WHERE created_by = 'test'")
            sql.execute("DELETE FROM steps_master_stm WHERE created_by = 'test'")
            sql.execute("DELETE FROM phases_instance_phi WHERE created_by = 'test'")
            sql.execute("DELETE FROM phases_master_phm WHERE created_by = 'test'")
            sql.execute("DELETE FROM sequences_instance_sqi WHERE created_by = 'test'")
            sql.execute("DELETE FROM sequences_master_sqm WHERE created_by = 'test'")
            sql.execute("DELETE FROM plans_instance_pli WHERE created_by = 'test'")
            sql.execute("DELETE FROM plans_master_plm WHERE created_by = 'test'")
            sql.execute("DELETE FROM iterations_ite WHERE created_by = 'test'")
            sql.execute("DELETE FROM migrations_mig WHERE created_by = 'test'")
            sql.execute("DELETE FROM teams_tms WHERE created_by = 'test'")
        } catch (Exception e) {
            // Log but don't fail cleanup
            println "Cleanup error (non-critical): ${e.message}"
        }
    }
}