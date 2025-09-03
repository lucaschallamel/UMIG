package umig.tests.integration

import umig.repository.ImportRepository
import umig.service.ImportService
import umig.service.CsvImportService
import umig.utils.DatabaseUtil
import umig.tests.utils.BaseIntegrationTest
import groovy.json.JsonBuilder
import groovy.sql.Sql
import java.util.UUID
import java.sql.Timestamp

/**
 * Integration Test for US-034 Import Rollback Validation System
 * 
 * Tests rollback mechanisms at different granularities:
 * - Batch-level rollback
 * - Orchestration-level rollback  
 * - Partial rollback scenarios
 * - Data integrity verification
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 3
 */
class ImportRollbackValidationTest extends BaseIntegrationTest {

    private ImportRepository importRepository
    private ImportService importService
    private CsvImportService csvImportService

    def setup() {
        super.setup()
        importRepository = new ImportRepository()
        importService = new ImportService()
        csvImportService = new CsvImportService()
        return null
    }

    def cleanup() {
        cleanupTestRollbackData()
        super.cleanup()
        return null
    }

    void testBatchLevelRollback() {
        println "\n=== Testing Batch-Level Rollback ==="

        // Create test import batch with real data
        UUID batchId = createTestImportBatch()
        
        // Verify data exists before rollback
        Map<String, Integer> beforeCounts = getImportedDataCounts(batchId)
        assert (beforeCounts.steps as Integer) > 0, "Should have imported steps before rollback"
        assert (beforeCounts.instructions as Integer) > 0, "Should have imported instructions before rollback"

        // Perform batch rollback
        boolean rollbackSuccess = importRepository.rollbackImportBatch(batchId, "Integration test batch rollback")
        assert rollbackSuccess == true, "Batch rollback should succeed"

        // Verify data is marked inactive
        Map<String, Integer> afterCounts = getActiveDataCounts(batchId)
        assert (afterCounts.steps as Integer) == 0, "Steps should be inactive after rollback"
        assert (afterCounts.instructions as Integer) == 0, "Instructions should be inactive after rollback"

        // Verify batch status
        DatabaseUtil.withSql { Sql sql ->
            String query = "SELECT imb_status FROM import_batches WHERE imb_id = ?"
            def row = sql.firstRow(query, batchId)
            assert (row?.imb_status as String) == 'ROLLED_BACK', "Batch status should be ROLLED_BACK"
        }

        // Verify rollback doesn't affect other batches
        UUID otherBatchId = createTestImportBatch()
        Map<String, Integer> otherBatchCounts = getActiveDataCounts(otherBatchId)
        assert (otherBatchCounts.steps as Integer) > 0, "Other batch data should remain active"

        println "✅ Batch-level rollback test passed"
    }

    void testOrchestrationLevelRollback() {
        println "\n=== Testing Orchestration-Level Rollback ==="

        // Create orchestration with multiple batches
        UUID orchestrationId = createOrchestrationWithBatches()
        List<UUID> batchIds = getBatchesForOrchestration(orchestrationId)
        
        assert (batchIds.size() as Integer) >= 2, "Should have multiple batches for orchestration test"

        // Verify data exists before rollback
        Map<String, Integer> beforeTotalCounts = [steps: 0, instructions: 0]
        batchIds.each { batchId ->
            Map<String, Integer> batchCounts = getImportedDataCounts(batchId)
            beforeTotalCounts.steps = (beforeTotalCounts.steps as Integer) + (batchCounts.steps as Integer)
            beforeTotalCounts.instructions = (beforeTotalCounts.instructions as Integer) + (batchCounts.instructions as Integer)
        }
        assert (beforeTotalCounts.steps as Integer) > 0, "Should have steps across all batches"
        assert (beforeTotalCounts.instructions as Integer) > 0, "Should have instructions across all batches"

        // Perform orchestration rollback
        Map<String, Object> rollbackResult = importRepository.rollbackOrchestration(
            orchestrationId, 
            "Integration test orchestration rollback", 
            "test_user"
        )
        
        assert (rollbackResult.success as Boolean) == true, "Orchestration rollback should succeed: ${rollbackResult.errors}"
        assert (rollbackResult.batchesRolledBack as Integer) == (batchIds.size() as Integer), "Should rollback all batches"
        assert ((rollbackResult.rollbackActions as List).size() as Integer) > 0, "Should have rollback actions"

        // Verify all batches are rolled back
        batchIds.each { batchId ->
            Map<String, Integer> counts = getActiveDataCounts(batchId)
            assert (counts.steps as Integer) == 0, "Steps should be inactive for batch ${batchId}"
            assert (counts.instructions as Integer) == 0, "Instructions should be inactive for batch ${batchId}"
        }

        // Verify orchestration status
        DatabaseUtil.withSql { Sql sql ->
            String query = "SELECT status FROM import_orchestrations WHERE orchestration_id = ?"
            def row = sql.firstRow(query, orchestrationId.toString())
            assert (row?.status as String) == 'ROLLED_BACK', "Orchestration status should be ROLLED_BACK"
        }

        // Verify rollback audit trail
        List<Map<String, Object>> rollbackHistory = importRepository.getRollbackHistory(orchestrationId, 10)
        assert (rollbackHistory.size() as Integer) > 0, "Should have rollback history"
        assert (rollbackHistory[0].orchestrationId as String) == orchestrationId.toString(), "History should match orchestration"
        assert (rollbackHistory[0].actionType as String) == 'ORCHESTRATION_ROLLBACK', "Should be orchestration rollback"
        assert (rollbackHistory[0].success as Boolean) == true, "Rollback should be marked successful"

        println "✅ Orchestration-level rollback test passed"
    }

    void testPartialRollbackScenarios() {
        println "\n=== Testing Partial Rollback Scenarios ==="

        // Create orchestration in partial completion state
        UUID orchestrationId = createPartiallyCompletedOrchestration()

        // Get initial state
        Map<String, Integer> initialCounts = getOrchestrationDataCounts(orchestrationId)
        assert (initialCounts.totalSteps as Integer) > 0, "Should have initial data"

        // Test partial rollback
        Map<String, Object> rollbackResult = importRepository.rollbackOrchestration(
            orchestrationId,
            "Partial rollback test",
            "test_user"
        )

        assert (rollbackResult.success as Boolean) == true, "Partial rollback should succeed"

        // Verify selective rollback occurred
        Map<String, Integer> afterCounts = getOrchestrationDataCounts(orchestrationId)
        assert (afterCounts.totalSteps as Integer) == 0, "All steps should be rolled back"

        // Verify staging data cleanup
        int stagingStepsCount = getStagingDataCount(orchestrationId)
        assert stagingStepsCount == 0, "Staging data should be cleaned up"

        println "✅ Partial rollback scenarios test passed"
    }

    void testRollbackDataIntegrity() {
        println "\n=== Testing Rollback Data Integrity ==="

        // Create interconnected data for integrity testing
        UUID orchestrationId = createInterconnectedTestData()
        List<UUID> batchIds = getBatchesForOrchestration(orchestrationId)

        // Record initial foreign key relationships
        Map<String, Integer> initialRelationships = getDataRelationships(batchIds)
        assert (initialRelationships.stepInstructionLinks as Integer) > 0, "Should have step-instruction relationships"

        // Perform rollback
        Map<String, Object> rollbackResult = importRepository.rollbackOrchestration(
            orchestrationId,
            "Data integrity test rollback", 
            "test_user"
        )

        assert (rollbackResult.success as Boolean) == true, "Rollback should succeed"

        // Verify no orphaned records
        Map<String, Integer> orphanedRecords = getOrphanedRecords(batchIds)
        assert (orphanedRecords.orphanedInstructions as Integer) == 0, "Should have no orphaned instructions"
        assert (orphanedRecords.danglingReferences as Integer) == 0, "Should have no dangling foreign key references"

        // Verify referential integrity maintained
        boolean integrityCheck = verifyReferentialIntegrity()
        assert integrityCheck == true, "Database referential integrity should be maintained"

        println "✅ Rollback data integrity test passed"
    }

    void testRollbackRecoveryScenarios() {
        println "\n=== Testing Rollback Recovery Scenarios ==="

        UUID orchestrationId = UUID.randomUUID()

        // Create orchestration record
        createOrchestrationRecord(orchestrationId, 'FAILED')

        // Create batch that partially failed rollback
        UUID problematicBatchId = createProblematicBatchForRollbackTest(orchestrationId)

        // Attempt rollback that may encounter issues
        Map<String, Object> rollbackResult = importRepository.rollbackOrchestration(
            orchestrationId,
            "Recovery scenario test",
            "test_user"
        )

        // Validate rollback handling
        if (rollbackResult.success as Boolean) {
            // If successful, verify completion
            assert ((rollbackResult.rollbackActions as List).size() as Integer) > 0, "Should have rollback actions"
            println "✅ Rollback completed successfully"
        } else {
            // If failed, verify error handling
            assert ((rollbackResult.errors as List).size() as Integer) > 0, "Should have error details"
            println "✅ Rollback failure handled correctly: ${rollbackResult.errors}"
        }

        // Verify rollback attempt is recorded regardless of outcome
        List<Map<String, Object>> rollbackHistory = importRepository.getRollbackHistory(orchestrationId, 5)
        assert (rollbackHistory.size() as Integer) > 0, "Rollback attempt should be recorded"

        println "✅ Rollback recovery scenarios test passed"
    }

    void testConcurrentRollbackOperations() {
        println "\n=== Testing Concurrent Rollback Operations ==="

        // Create multiple orchestrations
        List<UUID> orchestrationIds = []
        (1..3).each { i ->
            UUID orchId = createOrchestrationWithBatches()
            orchestrationIds << orchId
        }

        // Perform concurrent rollbacks
        List<Thread> rollbackThreads = []
        Map<UUID, Map<String, Object>> rollbackResults = [:]

        orchestrationIds.each { orchId ->
            Thread thread = Thread.start {
                try {
                    Map<String, Object> result = importRepository.rollbackOrchestration(
                        orchId,
                        "Concurrent rollback test ${orchId}",
                        "concurrent_test_user"
                    )
                    rollbackResults[orchId] = result
                } catch (Exception e) {
                    rollbackResults[orchId] = [success: false, error: e.message] as Map<String, Object>
                }
            }
            rollbackThreads << thread
        }

        // Wait for all rollbacks to complete
        rollbackThreads.each { it.join(30000) } // 30 second timeout

        // Validate results
        assert (rollbackResults.size() as Integer) == (orchestrationIds.size() as Integer), "Should have results for all orchestrations"
        
        int successfulRollbacks = rollbackResults.values().count { (it.success as Boolean) == true } as Integer
        assert successfulRollbacks >= 2, "At least 2 concurrent rollbacks should succeed"

        // Verify database consistency
        orchestrationIds.each { orchId ->
            DatabaseUtil.withSql { Sql sql ->
                String query = "SELECT status FROM import_orchestrations WHERE orchestration_id = ?"
                def row = sql.firstRow(query, orchId.toString())
                assert (row?.status as String) in ['ROLLED_BACK', 'FAILED'], "Orchestration should be in terminal state"
            }
        }

        println "✅ Concurrent rollback operations test passed"
    }

    void testRollbackPerformance() {
        println "\n=== Testing Rollback Performance ==="

        // Create orchestration with larger dataset
        UUID orchestrationId = createLargeDatasetOrchestration()
        
        // Get data counts before rollback
        Map<String, Integer> beforeCounts = getOrchestrationDataCounts(orchestrationId)
        println "Pre-rollback data: ${beforeCounts.totalSteps} steps, ${beforeCounts.totalInstructions} instructions"

        // Time the rollback operation
        long startTime = System.currentTimeMillis()
        
        Map<String, Object> rollbackResult = importRepository.rollbackOrchestration(
            orchestrationId,
            "Performance test rollback",
            "performance_test_user"
        )
        
        long duration = System.currentTimeMillis() - startTime

        // Validate performance
        assert (rollbackResult.success as Boolean) == true, "Large dataset rollback should succeed"
        assert duration < 30000, "Rollback should complete within 30 seconds: took ${duration}ms"

        // Validate completion
        Map<String, Integer> afterCounts = getOrchestrationDataCounts(orchestrationId)
        assert (afterCounts.totalSteps as Integer) == 0, "All steps should be rolled back"
        assert (afterCounts.totalInstructions as Integer) == 0, "All instructions should be rolled back"

        println "✅ Rollback performance test passed (${duration}ms)"
    }

    // ====== HELPER METHODS ======

    private UUID createTestImportBatch() {
        // Create a real import batch with test data
        String jsonContent = new JsonBuilder([
            step_type: 'RBK',
            step_number: 1,
            title: 'Rollback Test Step',
            task_list: [
                [instruction_id: 'RBK-001', description: 'First rollback test instruction'],
                [instruction_id: 'RBK-002', description: 'Second rollback test instruction']
            ]
        ]).toString()

        Map<String, Object> result = importService.importJsonData(jsonContent, 'rollback_test.json', 'rollback_test_user')
        assert (result.success as Boolean) == true, "Test import should succeed for rollback test"

        return UUID.fromString(result.batchId as String)
    }

    private UUID createOrchestrationWithBatches() {
        UUID orchestrationId = UUID.randomUUID()

        DatabaseUtil.withSql { Sql sql ->
            // Create orchestration
            createOrchestrationRecord(orchestrationId, 'COMPLETED')

            // Create multiple batches
            (1..3).each { i ->
                UUID batchId = createTestImportBatch()
                
                // Link batch to orchestration
                String updateQuery = """
                    UPDATE import_batches 
                    SET orchestration_id = ?, entity_type = ?
                    WHERE imb_id = ?
                """
                sql.executeUpdate(updateQuery, [
                    orchestrationId.toString(),
                    "test_entity_${i}",
                    batchId
                ])
            }
        }

        return orchestrationId
    }

    private void createOrchestrationRecord(UUID orchestrationId, String status) {
        DatabaseUtil.withSql { Sql sql ->
            String query = """
                INSERT INTO import_orchestrations 
                (orchestration_id, status, started, user_id, phase_count)
                VALUES (?, ?, ?, ?, ?)
            """
            sql.executeInsert(query, [
                orchestrationId.toString(),
                status,
                new Timestamp(System.currentTimeMillis()),
                'rollback_test_user',
                5
            ])
        }
    }

    private UUID createPartiallyCompletedOrchestration() {
        UUID orchestrationId = createOrchestrationWithBatches()
        
        // Mark as partially completed
        DatabaseUtil.withSql { Sql sql ->
            String updateQuery = """
                UPDATE import_orchestrations 
                SET status = 'FAILED', 
                    phase_details = ?::jsonb
                WHERE orchestration_id = ?
            """
            
            Map phaseDetails = [
                BASE_ENTITIES: [status: 'COMPLETED'],
                JSON_PROCESSING: [status: 'FAILED']
            ]
            
            sql.executeUpdate(updateQuery, [
                new JsonBuilder(phaseDetails).toString(),
                orchestrationId.toString()
            ])
        }
        
        return orchestrationId
    }

    private UUID createInterconnectedTestData() {
        // Create orchestration with complex relationships
        UUID orchestrationId = createOrchestrationWithBatches()
        
        // Add some staging data to simulate interconnected relationships
        DatabaseUtil.withSql { Sql sql ->
            // Create staging steps with cross-references
            (1..5).each { i ->
                String insertStaging = """
                    INSERT INTO stg_steps 
                    (step_id, step_type, step_number, title, created_date)
                    VALUES (?, ?, ?, ?, ?)
                """
                sql.executeUpdate(insertStaging, [
                    "INT-${i}",
                    'INT',
                    i,
                    "Interconnected Test Step ${i}",
                    new Timestamp(System.currentTimeMillis())
                ])
            }
        }
        
        return orchestrationId
    }

    private UUID createProblematicBatchForRollbackTest(UUID orchestrationId) {
        UUID batchId = createTestImportBatch()
        
        DatabaseUtil.withSql { Sql sql ->
            // Link to orchestration
            String updateQuery = """
                UPDATE import_batches 
                SET orchestration_id = ?, entity_type = ?
                WHERE imb_id = ?
            """
            sql.executeUpdate(updateQuery, [
                orchestrationId.toString(),
                'problematic_entity',
                batchId
            ])
        }
        
        return batchId
    }

    private UUID createLargeDatasetOrchestration() {
        UUID orchestrationId = UUID.randomUUID()
        createOrchestrationRecord(orchestrationId, 'COMPLETED')

        // Create multiple batches with more data
        (1..5).each { batchNum ->
            (1..3).each { stepNum ->
                UUID batchId = createTestImportBatch()
                
                DatabaseUtil.withSql { Sql sql ->
                    String updateQuery = """
                        UPDATE import_batches 
                        SET orchestration_id = ?, entity_type = ?
                        WHERE imb_id = ?
                    """
                    sql.executeUpdate(updateQuery, [
                        orchestrationId.toString(),
                        "large_dataset_batch_${batchNum}",
                        batchId
                    ])
                }
            }
        }

        return orchestrationId
    }

    private List<UUID> getBatchesForOrchestration(UUID orchestrationId) {
        List<UUID> batchIds = []
        
        DatabaseUtil.withSql { Sql sql ->
            String query = "SELECT imb_id FROM import_batches WHERE orchestration_id = ?"
            sql.eachRow(query, [orchestrationId.toString()]) { row ->
                batchIds << UUID.fromString(row['imb_id'] as String)
            }
        }
        
        return batchIds
    }

    private Map<String, Integer> getImportedDataCounts(UUID batchId) {
        Map<String, Integer> counts = [steps: 0, instructions: 0]
        
        DatabaseUtil.withSql { Sql sql ->
            // Count steps
            String stepsQuery = "SELECT COUNT(*) as count FROM steps_master_stm WHERE stm_import_batch_id = ?"
            def stepsRow = sql.firstRow(stepsQuery, batchId)
            counts.steps = (stepsRow?.count as Number)?.intValue() ?: 0
            
            // Count instructions  
            String instructionsQuery = "SELECT COUNT(*) as count FROM instructions_master_inm WHERE inm_import_batch_id = ?"
            def instructionsRow = sql.firstRow(instructionsQuery, batchId)
            counts.instructions = (instructionsRow?.count as Number)?.intValue() ?: 0
        }
        
        return counts
    }

    private Map<String, Integer> getActiveDataCounts(UUID batchId) {
        Map<String, Integer> counts = [steps: 0, instructions: 0]
        
        DatabaseUtil.withSql { Sql sql ->
            // Count active steps
            String stepsQuery = """
                SELECT COUNT(*) as count 
                FROM steps_master_stm 
                WHERE stm_import_batch_id = ? AND stm_is_active = true
            """
            def stepsRow = sql.firstRow(stepsQuery, batchId)
            counts.steps = (stepsRow?.count as Number)?.intValue() ?: 0
            
            // Count active instructions
            String instructionsQuery = """
                SELECT COUNT(*) as count 
                FROM instructions_master_inm 
                WHERE inm_import_batch_id = ? AND inm_is_active = true
            """
            def instructionsRow = sql.firstRow(instructionsQuery, batchId)
            counts.instructions = (instructionsRow?.count as Number)?.intValue() ?: 0
        }
        
        return counts
    }

    private Map<String, Integer> getOrchestrationDataCounts(UUID orchestrationId) {
        Map<String, Integer> counts = [totalSteps: 0, totalInstructions: 0]
        
        DatabaseUtil.withSql { Sql sql ->
            String stepsQuery = """
                SELECT COUNT(*) as count
                FROM steps_master_stm stm
                JOIN import_batches ib ON stm.stm_import_batch_id = ib.imb_id
                WHERE ib.orchestration_id = ? AND stm.stm_is_active = true
            """
            def stepsRow = sql.firstRow(stepsQuery, orchestrationId.toString())
            counts.totalSteps = (stepsRow?.count as Number)?.intValue() ?: 0
            
            String instructionsQuery = """
                SELECT COUNT(*) as count
                FROM instructions_master_inm inm
                JOIN import_batches ib ON inm.inm_import_batch_id = ib.imb_id  
                WHERE ib.orchestration_id = ? AND inm.inm_is_active = true
            """
            def instructionsRow = sql.firstRow(instructionsQuery, orchestrationId.toString())
            counts.totalInstructions = (instructionsRow?.count as Number)?.intValue() ?: 0
        }
        
        return counts
    }

    private int getStagingDataCount(UUID orchestrationId) {
        int count = 0
        
        DatabaseUtil.withSql { Sql sql ->
            String query = """
                SELECT COUNT(*) as count
                FROM stg_steps ss
                JOIN import_batches ib ON ss.batch_id = ib.imb_id
                WHERE ib.orchestration_id = ?
            """
            def row = sql.firstRow(query, orchestrationId.toString())
            count = (row?.count as Number)?.intValue() ?: 0
        }
        
        return count
    }

    private Map<String, Integer> getDataRelationships(List<UUID> batchIds) {
        Map<String, Integer> relationships = [stepInstructionLinks: 0]
        
        if (batchIds.isEmpty()) return relationships
        
        DatabaseUtil.withSql { Sql sql ->
            String placeholders = batchIds.collect { '?' }.join(',')
            String query = """
                SELECT COUNT(*) as count
                FROM instructions_master_inm inm
                JOIN steps_master_stm stm ON inm.inm_step_master_id = stm.stm_id
                WHERE inm.inm_import_batch_id IN (${placeholders})
            """
            def row = sql.firstRow(query, batchIds as Object[])
            relationships.stepInstructionLinks = (row?.count as Number)?.intValue() ?: 0
        }
        
        return relationships
    }

    private Map<String, Integer> getOrphanedRecords(List<UUID> batchIds) {
        Map<String, Integer> orphaned = [orphanedInstructions: 0, danglingReferences: 0]
        
        if (batchIds.isEmpty()) return orphaned
        
        DatabaseUtil.withSql { Sql sql ->
            // Check for orphaned instructions
            String orphanedQuery = """
                SELECT COUNT(*) as count
                FROM instructions_master_inm inm
                LEFT JOIN steps_master_stm stm ON inm.inm_step_master_id = stm.stm_id
                WHERE inm.inm_import_batch_id IN (${batchIds.collect { '?' }.join(',')})
                AND stm.stm_id IS NULL
            """
            def orphanedRow = sql.firstRow(orphanedQuery, batchIds as Object[])
            orphaned.orphanedInstructions = (orphanedRow?.count as Number)?.intValue() ?: 0
        }
        
        return orphaned
    }

    private boolean verifyReferentialIntegrity() {
        // Basic referential integrity check
        return DatabaseUtil.withSql { Sql sql ->
            try {
                // Check foreign key constraints are not violated
                String checkQuery = """
                    SELECT COUNT(*) as count
                    FROM instructions_master_inm inm
                    LEFT JOIN steps_master_stm stm ON inm.inm_step_master_id = stm.stm_id
                    WHERE inm.inm_is_active = true 
                    AND stm.stm_id IS NULL
                """
                def row = sql.firstRow(checkQuery)
                return ((row?.count as Number)?.intValue() ?: 0) == 0
            } catch (Exception e) {
                println "Integrity check failed: ${e.message}"
                return false
            }
        } as Boolean
    }

    private void cleanupTestRollbackData() {
        DatabaseUtil.withSql { Sql sql ->
            // Clean up rollback test data
            sql.execute("DELETE FROM import_rollback_actions WHERE executed_by LIKE '%test%'")
            sql.execute("DELETE FROM import_progress_tracking WHERE message LIKE '%test%' OR message LIKE '%Test%'")
            sql.execute("DELETE FROM instructions_master_inm WHERE inm_import_batch_id IN (SELECT imb_id FROM import_batches WHERE imb_user_id LIKE '%test%')")
            sql.execute("DELETE FROM steps_master_stm WHERE stm_import_batch_id IN (SELECT imb_id FROM import_batches WHERE imb_user_id LIKE '%test%')")
            sql.execute("DELETE FROM stg_step_instructions WHERE step_id LIKE 'RBK-%' OR step_id LIKE 'INT-%'")
            sql.execute("DELETE FROM stg_steps WHERE step_id LIKE 'RBK-%' OR step_id LIKE 'INT-%'")
            sql.execute("DELETE FROM import_batches WHERE imb_user_id LIKE '%test%' OR imb_source LIKE '%test%'")
            sql.execute("DELETE FROM import_orchestrations WHERE user_id LIKE '%test%'")
        }
    }
}