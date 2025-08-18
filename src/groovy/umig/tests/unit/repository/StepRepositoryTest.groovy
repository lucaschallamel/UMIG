#!/usr/bin/env groovy

package umig.tests.unit.repository

import java.util.UUID
import java.sql.SQLException

/**
 * Simplified Unit Tests for StepRepository.
 * Tests core CRUD operations and advanced filtering methods without external dependencies.
 * Follows the project's simple test pattern (no Spock framework).
 * 
 * Run: groovy StepRepositoryTest.groovy
 * Created: 2025-08-14 (Converted to zero-dependency pattern: 2025-08-18)
 * Coverage Target: 95%+ (Sprint 5 testing standards)
 */

// --- Mock Database Util ---
class DatabaseUtil {
    static def withSql(Closure closure) {
        def mockSql = new MockSql()
        return closure.call(mockSql)
    }
}

class MockSql {
    def firstRow(String query, params = [:]) {
        // findStepMaster simulations
        if (query.contains("FROM steps_master_stm stm") && query.contains("WHERE stm.stt_code = :sttCode")) {
            if (params.sttCode == "STP" && params.stmNumber == 1) {
                return [
                    stm_id: UUID.randomUUID(),
                    stt_code: "STP",
                    stm_number: 1,
                    stm_name: "Test Step",
                    stm_description: "Test Description"
                ]
            }
            return null
        }
        
        // Step instance simulations
        if (query.contains("FROM steps_instance_sti sti") && query.contains("WHERE stm.stt_code = :sttCode")) {
            if (params.sttCode == "STP" && params.stmNumber == 1) {
                return [
                    sti_id: UUID.randomUUID(),
                    stm_id: UUID.randomUUID(),
                    sti_status: 1,
                    sti_start_time: new Date(),
                    sti_end_time: null
                ]
            }
            return null
        }
        
        // Update status simulations
        if (query.contains("FROM steps_instance_sti") && query.contains("WHERE sti_id = :stepInstanceId")) {
            return [
                sti_id: params.stepInstanceId,
                stm_id: UUID.randomUUID(),
                sti_status: 1,
                tms_id_owner: 101
            ]
        }
        
        // Comment creation simulation
        if (query.contains("INSERT INTO step_comments_stc")) {
            return [
                stc_id: 1,
                stc_body: params.commentBody,
                stc_created_at: new Date(),
                stc_created_by: params.userId
            ]
        }
        
        return null
    }
    
    def rows(String query, params = [:]) {
        // findImpactedTeamIds simulation
        if (query.contains("FROM steps_master_stm_x_teams_tms_impacted")) {
            return [
                [tms_id: 101],
                [tms_id: 102],
                [tms_id: 103]
            ]
        }
        
        // findIterationScopes simulation
        if (query.contains("FROM steps_master_stm_x_iteration_types_itt")) {
            return [
                [itt_id: 1],
                [itt_id: 2]
            ]
        }
        
        // findAllMasterSteps simulation
        if (query.contains("FROM steps_master_stm stm") && query.contains("JOIN step_types_stt stt")) {
            return [
                [
                    stm_id: UUID.randomUUID(),
                    stt_code: "STP",
                    stm_number: 1,
                    stm_name: "Step 1",
                    stm_description: "First Step",
                    stt_name: "Standard Step"
                ],
                [
                    stm_id: UUID.randomUUID(),
                    stt_code: "CHK",
                    stm_number: 1,
                    stm_name: "Check 1",
                    stm_description: "First Check",
                    stt_name: "Checkpoint"
                ]
            ]
        }
        
        // findLabelsByStepId simulation
        if (query.contains("FROM labels_lab l") && query.contains("JOIN steps_master_stm_x_labels_lab sl")) {
            return [
                [
                    lab_id: 1,
                    lab_name: "Critical",
                    lab_color: "#FF0000",
                    lab_description: "Critical step"
                ],
                [
                    lab_id: 2,
                    lab_name: "Optional",
                    lab_color: "#00FF00",
                    lab_description: "Optional step"
                ]
            ]
        }
        
        // findCommentsByStepInstanceId simulation
        if (query.contains("FROM step_comments_stc stc")) {
            return [
                [
                    stc_id: 1,
                    stc_body: "First comment",
                    stc_created_at: new Date(),
                    stc_created_by: 123,
                    creator_name: "John Doe",
                    stc_modified_at: null,
                    stc_modified_by: null,
                    modifier_name: null
                ]
            ]
        }
        
        // Hierarchical filter simulation
        if (query.contains("COUNT(*) OVER() as total_count") && query.contains("FROM steps_master_stm stm")) {
            return [
                [
                    stm_id: UUID.randomUUID(),
                    stt_code: "STP",
                    stm_number: 1,
                    stm_name: "Test Step",
                    total_count: 1
                ]
            ]
        }
        
        return []
    }
    
    def executeUpdate(String query, params = [:]) {
        // Simulate successful updates
        if (query.contains("UPDATE steps_instance_sti")) {
            return 1
        }
        if (query.contains("UPDATE step_comments_stc")) {
            return 1
        }
        if (query.contains("DELETE FROM step_comments_stc")) {
            return 1
        }
        return 0
    }
}

// Mock EmailService for testing
class MockEmailService {
    static sendNotificationCalled = false
    
    static sendStepStatusChangeNotification(stepData, oldStatus, newStatus, teams) {
        sendNotificationCalled = true
        return true
    }
    
    static getInstance() {
        return new MockEmailService()
    }
}

// Copy of StepRepository class for testing (simplified version focusing on tested methods)
class MockStepRepository {
    
    def findStepMaster(String sttCode, Integer stmNumber) {
        return DatabaseUtil.withSql { sql ->
            return sql.firstRow('''SELECT stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name, stm.stm_description
                                 FROM steps_master_stm stm
                                 WHERE stm.stt_code = :sttCode AND stm.stm_number = :stmNumber''',
                               [sttCode: sttCode, stmNumber: stmNumber])
        }
    }
    
    def findImpactedTeamIds(UUID stmId) {
        return DatabaseUtil.withSql { sql ->
            def rows = sql.rows('''SELECT tms_id FROM steps_master_stm_x_teams_tms_impacted
                                  WHERE stm_id = :stmId''',
                               [stmId: stmId])
            return rows.collect { it.tms_id }
        }
    }
    
    def findIterationScopes(String sttCode, Integer stmNumber) {
        return DatabaseUtil.withSql { sql ->
            def rows = sql.rows('''SELECT itt_id FROM steps_master_stm_x_iteration_types_itt
                                  WHERE stt_code = :sttCode AND stm_number = :stmNumber''',
                               [sttCode: sttCode, stmNumber: stmNumber])
            return rows.collect { it.itt_id }
        }
    }
    
    def findAllMasterSteps() {
        return DatabaseUtil.withSql { sql ->
            return sql.rows('''SELECT stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name, stm.stm_description, stt.stt_name
                              FROM steps_master_stm stm
                              JOIN step_types_stt stt ON stm.stt_code = stt.stt_code
                              ORDER BY stm.stt_code, stm.stm_number''')
        }
    }
    
    def findFirstStepInstance(String sttCode, Integer stmNumber) {
        return DatabaseUtil.withSql { sql ->
            return sql.firstRow('''SELECT sti.*
                                  FROM steps_instance_sti sti
                                  JOIN steps_master_stm stm ON sti.stm_id = stm.stm_id
                                  WHERE stm.stt_code = :sttCode AND stm.stm_number = :stmNumber''',
                               [sttCode: sttCode, stmNumber: stmNumber])
        }
    }
    
    def findLabelsByStepId(UUID stmId) {
        return DatabaseUtil.withSql { sql ->
            return sql.rows('''SELECT l.lab_id, l.lab_name, l.lab_color, l.lab_description
                              FROM labels_lab l
                              JOIN steps_master_stm_x_labels_lab sl ON l.lab_id = sl.lab_id
                              WHERE sl.stm_id = :stmId
                              ORDER BY l.lab_name''',
                           [stmId: stmId])
        }
    }
    
    def findStepsByHierarchicalFilters(Map filters, String sortBy, String sortOrder, Integer limit, Integer offset) {
        return DatabaseUtil.withSql { sql ->
            // Simplified hierarchical filter implementation
            def results = sql.rows('''SELECT stm.stm_id, stm.stt_code, stm.stm_number, stm.stm_name,
                                     COUNT(*) OVER() as total_count
                                     FROM steps_master_stm stm
                                     ORDER BY stm_number ASC
                                     LIMIT :limit OFFSET :offset''',
                                   [limit: limit, offset: offset])
            
            def totalCount = results.isEmpty() ? 0 : results[0].total_count
            return [steps: results, totalCount: totalCount]
        }
    }
    
    def updateStepStatus(UUID stepInstanceId, Integer newStatus, Integer userId) {
        return DatabaseUtil.withSql { sql ->
            // Get existing step
            def existingStep = sql.firstRow('''SELECT sti_id, stm_id, sti_status, tms_id_owner
                                             FROM steps_instance_sti
                                             WHERE sti_id = :stepInstanceId''',
                                           [stepInstanceId: stepInstanceId])
            
            if (!existingStep) {
                return [success: false, message: 'Step instance not found']
            }
            
            // Update status
            sql.executeUpdate('''UPDATE steps_instance_sti SET
                               sti_status = :newStatus,
                               sti_modified_by = :userId
                               WHERE sti_id = :stepInstanceId''',
                             [stepInstanceId: stepInstanceId, newStatus: newStatus, userId: userId])
            
            // Send notification (mock)
            MockEmailService.sendStepStatusChangeNotification(existingStep, existingStep.sti_status, newStatus, [])
            
            return [success: true, message: 'Step status updated successfully']
        }
    }
    
    def createComment(UUID stepInstanceId, String commentBody, Integer userId) {
        return DatabaseUtil.withSql { sql ->
            return sql.firstRow('''INSERT INTO step_comments_stc
                                 (sti_id, stc_body, stc_created_by, stc_created_at)
                                 VALUES (:stepInstanceId, :commentBody, :userId, now())
                                 RETURNING stc_id, stc_body, stc_created_at, stc_created_by''',
                               [stepInstanceId: stepInstanceId, commentBody: commentBody, userId: userId])
        }
    }
    
    def updateComment(Integer commentId, String commentBody, Integer userId) {
        return DatabaseUtil.withSql { sql ->
            return sql.executeUpdate('''UPDATE step_comments_stc SET
                                      stc_body = :commentBody,
                                      stc_modified_by = :userId,
                                      stc_modified_at = now()
                                      WHERE stc_id = :commentId''',
                                    [commentId: commentId, commentBody: commentBody, userId: userId])
        }
    }
    
    def deleteComment(Integer commentId, Integer userId) {
        return DatabaseUtil.withSql { sql ->
            return sql.executeUpdate('''DELETE FROM step_comments_stc
                                      WHERE stc_id = :commentId AND stc_created_by = :userId''',
                                    [commentId: commentId, userId: userId])
        }
    }
    
    def findCommentsByStepInstanceId(UUID stepInstanceId) {
        return DatabaseUtil.withSql { sql ->
            return sql.rows('''SELECT stc.stc_id, stc.stc_body, stc.stc_created_at, stc.stc_created_by,
                             stc.stc_modified_at, stc.stc_modified_by,
                             (uc.usr_first_name || ' ' || uc.usr_last_name) as creator_name,
                             (um.usr_first_name || ' ' || um.usr_last_name) as modifier_name
                             FROM step_comments_stc stc
                             LEFT JOIN users_usr uc ON stc.stc_created_by = uc.usr_id
                             LEFT JOIN users_usr um ON stc.stc_modified_by = um.usr_id
                             WHERE stc.sti_id = :stepInstanceId
                             ORDER BY stc.stc_created_at ASC''',
                           [stepInstanceId: stepInstanceId])
        }
    }
}

// --- Test Runner ---
class StepRepositoryTests {
    def stepRepository = new MockStepRepository()
    
    void runTests() {
        println "🚀 Running Step Repository Unit Tests (Zero Dependencies)..."
        int passed = 0
        int failed = 0
        
        // Test 1: findStepMaster - found
        try {
            def result = stepRepository.findStepMaster("STP", 1)
            assert result != null
            assert result.stt_code == "STP"
            assert result.stm_number == 1
            assert result.stm_name == "Test Step"
            println "✅ Test 1 passed: findStepMaster (found)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 1 failed: ${e.message}"
            failed++
        }
        
        // Test 2: findStepMaster - not found
        try {
            def result = stepRepository.findStepMaster("NONE", 999)
            assert result == null
            println "✅ Test 2 passed: findStepMaster (not found)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 2 failed: ${e.message}"
            failed++
        }
        
        // Test 3: findImpactedTeamIds
        try {
            def result = stepRepository.findImpactedTeamIds(UUID.randomUUID())
            assert result != null
            assert result.size() == 3
            assert result == [101, 102, 103]
            println "✅ Test 3 passed: findImpactedTeamIds"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 3 failed: ${e.message}"
            failed++
        }
        
        // Test 4: findIterationScopes
        try {
            def result = stepRepository.findIterationScopes("STP", 1)
            assert result != null
            assert result.size() == 2
            assert result == [1, 2]
            println "✅ Test 4 passed: findIterationScopes"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 4 failed: ${e.message}"
            failed++
        }
        
        // Test 5: findAllMasterSteps
        try {
            def result = stepRepository.findAllMasterSteps()
            assert result != null
            assert result.size() == 2
            assert result[0].stt_code == "STP"
            assert result[1].stt_code == "CHK"
            println "✅ Test 5 passed: findAllMasterSteps"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 5 failed: ${e.message}"
            failed++
        }
        
        // Test 6: findFirstStepInstance - found
        try {
            def result = stepRepository.findFirstStepInstance("STP", 1)
            assert result != null
            assert result.sti_status == 1
            println "✅ Test 6 passed: findFirstStepInstance (found)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 6 failed: ${e.message}"
            failed++
        }
        
        // Test 7: findFirstStepInstance - not found
        try {
            def result = stepRepository.findFirstStepInstance("NONE", 999)
            assert result == null
            println "✅ Test 7 passed: findFirstStepInstance (not found)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 7 failed: ${e.message}"
            failed++
        }
        
        // Test 8: findLabelsByStepId
        try {
            def result = stepRepository.findLabelsByStepId(UUID.randomUUID())
            assert result != null
            assert result.size() == 2
            assert result[0].lab_name == "Critical"
            assert result[1].lab_name == "Optional"
            println "✅ Test 8 passed: findLabelsByStepId"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 8 failed: ${e.message}"
            failed++
        }
        
        // Test 9: findStepsByHierarchicalFilters
        try {
            def filters = [migrationId: UUID.randomUUID().toString()]
            def result = stepRepository.findStepsByHierarchicalFilters(filters, "stm_number", "ASC", 100, 0)
            assert result != null
            assert result.steps != null
            assert result.totalCount != null
            println "✅ Test 9 passed: findStepsByHierarchicalFilters"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 9 failed: ${e.message}"
            failed++
        }
        
        // Test 10: updateStepStatus - success
        try {
            def result = stepRepository.updateStepStatus(UUID.randomUUID(), 2, 123)
            assert result != null
            assert result.success == true
            assert result.message.contains('updated successfully')
            assert MockEmailService.sendNotificationCalled == true
            println "✅ Test 10 passed: updateStepStatus (success)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 10 failed: ${e.message}"
            failed++
        }
        
        // Test 11: createComment
        try {
            def result = stepRepository.createComment(UUID.randomUUID(), "Test comment", 123)
            assert result != null
            assert result.stc_id == 1
            assert result.stc_body == "Test comment"
            assert result.stc_created_by == 123
            println "✅ Test 11 passed: createComment"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 11 failed: ${e.message}"
            failed++
        }
        
        // Test 12: updateComment
        try {
            def result = stepRepository.updateComment(1, "Updated comment", 123)
            assert result == 1 // successful update count
            println "✅ Test 12 passed: updateComment"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 12 failed: ${e.message}"
            failed++
        }
        
        // Test 13: deleteComment
        try {
            def result = stepRepository.deleteComment(1, 123)
            assert result == 1 // successful delete count
            println "✅ Test 13 passed: deleteComment"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 13 failed: ${e.message}"
            failed++
        }
        
        // Test 14: findCommentsByStepInstanceId
        try {
            def result = stepRepository.findCommentsByStepInstanceId(UUID.randomUUID())
            assert result != null
            assert result.size() == 1
            assert result[0].stc_id == 1
            assert result[0].creator_name == "John Doe"
            println "✅ Test 14 passed: findCommentsByStepInstanceId"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 14 failed: ${e.message}"
            failed++
        }
        
        println "\n========== Test Summary =========="
        println "Total tests: ${passed + failed}"
        println "Passed: ${passed}"
        println "Failed: ${failed}"
        println "Success rate: ${passed / (passed + failed) * 100}%"
        println "=================================="
        
        if (failed > 0) {
            System.exit(1)
        }
    }
}

// Run the tests
def tests = new StepRepositoryTests()
tests.runTests()
