package umig.tests.integration

import umig.service.ImportOrchestrationService
import umig.service.ImportService  
import umig.service.CsvImportService
import umig.repository.ImportRepository
import umig.utils.DatabaseUtil
import umig.tests.utils.BaseIntegrationTest
import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.sql.Sql
import java.util.UUID
import java.sql.Timestamp

/**
 * Comprehensive Integration Test for US-034 Import Orchestration Service
 * 
 * Tests complete import workflow:
 * 1. Base entities (Teams, Users, Applications, Environments)  
 * 2. JSON step processing
 * 3. Master table promotion
 * 4. Progress tracking
 * 5. Error recovery and rollback
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 3
 */
class ImportOrchestrationIntegrationTest extends BaseIntegrationTest {

    private ImportOrchestrationService orchestrationService
    private ImportRepository importRepository
    private ImportService importService

    void setup() {
        super.setup()
        orchestrationService = new ImportOrchestrationService()
        importRepository = new ImportRepository()  
        importService = new ImportService()
    }

    void cleanup() {
        // Clean up test data
        cleanupTestOrchestrations()
        super.cleanup()
    }

    void testCompleteImportOrchestrationSuccess() {
        println "\n=== Testing Complete Import Orchestration Success Workflow ==="

        // Prepare test configuration
        Map importConfiguration = createTestImportConfiguration()

        // Execute orchestration
        Map result = orchestrationService.orchestrateCompleteImport(importConfiguration)

        // Validate orchestration result
        assert (result.success as Boolean) == true, "Orchestration should succeed: ${result.errors}"
        assert result.orchestrationId != null, "Should have orchestration ID"
        assert (result.phases as Map).size() >= 4, "Should have executed multiple phases"

        // Validate phase results
        Map phases = result.phases as Map
        assert (phases.BASE_ENTITIES as Map)?.success == true, "Base entities phase should succeed"
        assert (phases.JSON_PROCESSING as Map)?.success == true, "JSON processing phase should succeed"
        assert (phases.MASTER_PROMOTION as Map)?.success == true, "Master promotion phase should succeed"
        assert (phases.VALIDATION as Map)?.success == true, "Validation phase should succeed"

        // Validate progress tracking
        UUID orchestrationId = UUID.fromString(result.orchestrationId as String)
        Map progressStatus = importRepository.getProgressStatus(orchestrationId)
        
        assert progressStatus.overallProgress == 100, "Overall progress should be 100%"
        assert progressStatus.status == 'COMPLETED', "Overall status should be COMPLETED"

        // Validate statistics
        Map statistics = result.statistics as Map
        assert statistics?.orchestrationId != null, "Should have orchestration statistics"
        assert (statistics?.completedPhases as Integer) >= 4, "Should have completed phases"

        println "✅ Complete import orchestration test passed"
    }

    void testImportOrchestrationWithFailureAndRollback() {
        println "\n=== Testing Import Orchestration Failure and Rollback ==="

        // Create configuration that will fail in JSON processing phase
        Map importConfiguration = createFailingImportConfiguration()

        // Execute orchestration (should fail)
        Map result = orchestrationService.orchestrateCompleteImport(importConfiguration)

        // Validate failure handling
        assert (result.success as Boolean) == false, "Orchestration should fail as designed"
        assert (result.errors as List)?.size() > 0, "Should have error messages"
        assert result.rollbackResult != null, "Should have rollback result"

        // Validate rollback execution
        Map rollbackResult = result.rollbackResult as Map
        assert (rollbackResult.success as Boolean) == true, "Rollback should succeed"
        assert (rollbackResult.rollbackActions as List)?.size() > 0, "Should have rollback actions"

        // Validate orchestration status after rollback
        UUID orchestrationId = UUID.fromString(result.orchestrationId as String)
        DatabaseUtil.withSql { Sql sql ->
            String query = "SELECT status FROM import_orchestrations WHERE orchestration_id = ?"
            def row = sql.firstRow(query, [orchestrationId.toString()])
            assert row?.status == 'ROLLED_BACK', "Orchestration status should be ROLLED_BACK"
        }

        println "✅ Import orchestration failure and rollback test passed"
    }

    void testImportOrchestrationResume() {
        println "\n=== Testing Import Orchestration Resume Functionality ==="

        // Create partial orchestration that fails mid-process
        UUID orchestrationId = createFailedOrchestrationForResume()

        // Attempt resume
        Map resumeResult = orchestrationService.resumeFailedImport(orchestrationId)

        // Validate resume execution
        assert resumeResult.orchestrationId != null, "Resume should have orchestration ID"
        
        // Check if resume was attempted (may succeed or fail based on test data)
        if (resumeResult.success as Boolean) {
            assert resumeResult.phases != null, "Resume should have phase results"
            println "✅ Resume succeeded as expected"
        } else {
            assert (resumeResult.errors as List)?.size() > 0, "Failed resume should have error messages"
            println "✅ Resume failed as expected with proper error handling"
        }

        println "✅ Import orchestration resume test passed"
    }

    void testProgressTrackingAccuracy() {
        println "\n=== Testing Progress Tracking Accuracy ==="

        UUID orchestrationId = UUID.randomUUID()

        // Test progress tracking through multiple phases
        List<Map> progressUpdates = [
            [phase: 'BASE_ENTITIES', completed: 2, total: 4, message: 'Teams and Users imported'],
            [phase: 'BASE_ENTITIES', completed: 4, total: 4, message: 'All base entities imported'],
            [phase: 'JSON_PROCESSING', completed: 10, total: 18, message: 'Processing JSON files'],
            [phase: 'JSON_PROCESSING', completed: 18, total: 18, message: 'All JSON files processed'],
            [phase: 'MASTER_PROMOTION', completed: 1, total: 1, message: 'Promoted to master tables']
        ]

        progressUpdates.each { update ->
            Map trackResult = importRepository.trackImportProgress(
                orchestrationId, 
                update.phase as String, 
                update.completed as Integer, 
                update.total as Integer, 
                update.message as String
            )
            assert trackResult.success == true, "Progress tracking should succeed: ${trackResult.error}"
        }

        // Validate final progress status
        Map finalStatus = importRepository.getProgressStatus(orchestrationId)
        Map phases = finalStatus.phases as Map
        assert phases.size() == 3, "Should track 3 phases"
        assert (phases.BASE_ENTITIES as Map)?.progressPercentage == 100, "Base entities should be 100%"
        assert (phases.JSON_PROCESSING as Map)?.progressPercentage == 100, "JSON processing should be 100%"
        assert (phases.MASTER_PROMOTION as Map)?.progressPercentage == 100, "Master promotion should be 100%"

        println "✅ Progress tracking accuracy test passed"
    }

    void testRollbackGranularity() {
        println "\n=== Testing Rollback Granularity (Orchestration vs Batch) ==="

        // Create orchestration with multiple batches
        UUID orchestrationId = createOrchestrationWithMultipleBatches()

        // Test orchestration-level rollback
        Map rollbackResult = importRepository.rollbackOrchestration(
            orchestrationId, 
            "Integration test rollback", 
            "test_user"
        )

        // Validate orchestration rollback
        assert (rollbackResult.success as Boolean) == true, "Orchestration rollback should succeed"
        assert (rollbackResult.rollbackActions as List)?.size() > 0, "Should have rollback actions"
        assert (rollbackResult.batchesRolledBack as Integer) > 0, "Should have rolled back batches"

        // Verify rollback history
        List rollbackHistory = importRepository.getRollbackHistory(orchestrationId, 10)
        assert rollbackHistory.size() > 0, "Should have rollback history"
        Map firstHistoryItem = rollbackHistory[0] as Map
        assert firstHistoryItem.orchestrationId == orchestrationId.toString(), "History should match orchestration"

        println "✅ Rollback granularity test passed"
    }

    void testEntityDependencyValidation() {
        println "\n=== Testing Entity Dependency Validation ==="

        // Get entity dependencies
        List dependencies = importRepository.getEntityDependencies()
        assert dependencies.size() >= 5, "Should have at least 5 entity types"

        // Validate dependency order
        Map orderMap = [:]
        dependencies.each { dep ->
            Map dependency = dep as Map
            orderMap[dependency.entityType] = dependency.importOrder
        }

        assert (orderMap.teams as Integer) <= (orderMap.users as Integer), "Teams should come before or with users"
        assert (orderMap.applications as Integer) <= (orderMap.json_steps as Integer), "Applications should come before JSON steps"
        assert (orderMap.environments as Integer) <= (orderMap.json_steps as Integer), "Environments should come before JSON steps"

        // Validate required entities
        List requiredEntities = dependencies.findAll { dep ->
            Map dependency = dep as Map
            return dependency.isRequired as Boolean
        }
        assert requiredEntities.size() >= 4, "Should have required entities"

        println "✅ Entity dependency validation test passed"
    }

    void testConcurrentOrchestrationHandling() {
        println "\n=== Testing Concurrent Orchestration Handling ==="

        List<Thread> orchestrationThreads = []
        List<UUID> orchestrationIds = []
        Map<UUID, Boolean> results = [:]

        // Create multiple concurrent orchestrations
        (1..3).each { i ->
            Thread thread = Thread.start {
                try {
                    Map config = createSmallTestImportConfiguration("concurrent_test_${i}")
                    Map result = orchestrationService.orchestrateCompleteImport(config)
                    UUID orchId = UUID.fromString(result.orchestrationId as String)
                    orchestrationIds << orchId
                    results[orchId] = result.success as Boolean
                } catch (Exception e) {
                    println "Thread ${i} failed: ${e.message}"
                }
            }
            orchestrationThreads << thread
        }

        // Wait for all threads to complete
        orchestrationThreads.each { it.join(30000) } // 30 second timeout

        // Validate results
        assert orchestrationIds.size() >= 2, "Should have multiple orchestrations"
        assert results.values().any { it as Boolean == true }, "At least one orchestration should succeed"

        // Validate database consistency
        DatabaseUtil.withSql { Sql sql ->
            orchestrationIds.each { orchId ->
                String query = "SELECT COUNT(*) as count FROM import_orchestrations WHERE orchestration_id = ?"
                def row = sql.firstRow(query, [orchId.toString()])
                assert (row.count as Integer) == 1, "Each orchestration should have exactly one record"
            }
        }

        println "✅ Concurrent orchestration handling test passed"
    }

    void testLargeDatasetImport() {
        println "\n=== Testing Large Dataset Import Performance ==="

        // Create configuration with larger dataset
        Map importConfiguration = createLargeDatasetConfiguration()

        long startTime = System.currentTimeMillis()
        Map result = orchestrationService.orchestrateCompleteImport(importConfiguration)
        long duration = System.currentTimeMillis() - startTime

        // Validate performance and success
        assert (result.success as Boolean) == true, "Large dataset import should succeed: ${result.errors}"
        assert duration < 60000, "Import should complete within 60 seconds" // Adjust based on expectations

        // Validate progress tracking for large dataset
        UUID orchestrationId = UUID.fromString(result.orchestrationId as String)
        Map progressStatus = importRepository.getProgressStatus(orchestrationId)
        assert (progressStatus.overallProgress as Integer) == 100, "Should reach 100% completion"

        // Validate statistics
        Map stats = result.statistics as Map
        assert (stats.completedPhases as Integer) >= 4, "Should complete all phases"

        println "✅ Large dataset import performance test passed (${duration}ms)"
    }

    // ====== HELPER METHODS ======

    private Map createTestImportConfiguration() {
        return [
            userId: 'integration_test_user',
            baseEntities: [
                teams: createTestTeamsCsv(),
                users: createTestUsersCsv(),
                applications: createTestApplicationsCsv(),
                environments: createTestEnvironmentsCsv()
            ],
            jsonFiles: createTestJsonFiles(),
            options: [
                rollback_on_failure: true,
                cleanup_staging: false
            ]
        ]
    }

    private Map createFailingImportConfiguration() {
        Map config = createTestImportConfiguration()
        // Inject invalid JSON to cause failure
        ((List) config.jsonFiles) << [
            filename: 'invalid_test.json',
            content: '{ invalid json content }'
        ]
        return config
    }

    private Map createSmallTestImportConfiguration(String prefix) {
        return [
            userId: "test_user_${prefix}",
            baseEntities: [
                teams: "team_name,team_description\nTest Team ${prefix},Test Description"
            ],
            jsonFiles: [
                [
                    filename: "${prefix}_test.json",
                    content: new JsonBuilder([
                        step_type: 'TST',
                        step_number: 1,
                        title: "Test Step ${prefix}",
                        task_list: []
                    ]).toString()
                ]
            ],
            options: [rollback_on_failure: true]
        ]
    }

    private Map createLargeDatasetConfiguration() {
        Map config = createTestImportConfiguration()
        
        // Add more JSON files to simulate larger dataset
        List jsonFiles = config.jsonFiles as List
        (1..25).each { i ->
            jsonFiles << [
                filename: "large_dataset_${i}.json",
                content: new JsonBuilder([
                    step_type: 'LRG',
                    step_number: i,
                    title: "Large Dataset Step ${i}",
                    task_list: [
                        [instruction_id: "INST-${i}-1", description: "Test instruction ${i}"]
                    ]
                ]).toString()
            ]
        }
        
        return config
    }

    private String createTestTeamsCsv() {
        return """team_name,team_description
Integration Test Team 1,First test team
Integration Test Team 2,Second test team"""
    }

    private String createTestUsersCsv() {
        return """username,full_name,email,team_name
test.user1,Test User 1,test1@example.com,Integration Test Team 1
test.user2,Test User 2,test2@example.com,Integration Test Team 2"""
    }

    private String createTestApplicationsCsv() {
        return """app_name,app_description,app_type
Test App 1,Integration test application 1,WEB
Test App 2,Integration test application 2,API"""
    }

    private String createTestEnvironmentsCsv() {
        return """env_name,env_description,env_type
Test Dev,Development environment,DEV
Test Prod,Production environment,PROD"""
    }

    private List createTestJsonFiles() {
        return [
            [
                filename: 'integration_test_1.json',
                content: new JsonBuilder([
                    step_type: 'INT',
                    step_number: 1,
                    title: 'Integration Test Step 1',
                    task_list: [
                        [instruction_id: 'INT-001', description: 'First integration test instruction'],
                        [instruction_id: 'INT-002', description: 'Second integration test instruction']
                    ]
                ]).toString()
            ],
            [
                filename: 'integration_test_2.json',
                content: new JsonBuilder([
                    step_type: 'INT',
                    step_number: 2,
                    title: 'Integration Test Step 2',
                    task_list: [
                        [instruction_id: 'INT-003', description: 'Third integration test instruction']
                    ]
                ]).toString()
            ]
        ]
    }

    private UUID createFailedOrchestrationForResume() {
        // Create a partial orchestration record for resume testing
        UUID orchestrationId = UUID.randomUUID()
        
        DatabaseUtil.withSql { Sql sql ->
            String insertQuery = """
                INSERT INTO import_orchestrations 
                (orchestration_id, status, started, user_id, phase_details, configuration)
                VALUES (?, ?, ?, ?, ?, ?)
            """
            
            Map phaseDetails = [
                BASE_ENTITIES: [status: 'COMPLETED', progress: 100],
                JSON_PROCESSING: [status: 'FAILED', progress: 50]
            ]
            
            Map configuration = createTestImportConfiguration()
            
            sql.executeInsert(insertQuery, [
                orchestrationId.toString(),
                'FAILED',
                new Timestamp(System.currentTimeMillis() - 3600000), // 1 hour ago
                'test_resume_user',
                new JsonBuilder(phaseDetails).toString(),
                new JsonBuilder(configuration).toString()
            ])
        }
        
        return orchestrationId
    }

    private UUID createOrchestrationWithMultipleBatches() {
        UUID orchestrationId = UUID.randomUUID()
        
        DatabaseUtil.withSql { Sql sql ->
            // Create orchestration
            String orchestrationInsert = """
                INSERT INTO import_orchestrations 
                (orchestration_id, status, started, user_id)
                VALUES (?, ?, ?, ?)
            """
            sql.executeInsert(orchestrationInsert, [
                orchestrationId.toString(),
                'COMPLETED',
                new Timestamp(System.currentTimeMillis()),
                'test_batch_user'
            ])
            
            // Create multiple batches
            (1..3).each { i ->
                UUID batchId = importRepository.createOrchestrationBatch(
                    sql, orchestrationId, "test_batch_${i}", 'TEST_IMPORT', 
                    'test_batch_user', "test_entity_${i}"
                )
            }
        }
        
        return orchestrationId
    }

    private void cleanupTestOrchestrations() {
        DatabaseUtil.withSql { Sql sql ->
            // Clean up test orchestrations
            sql.execute("DELETE FROM import_rollback_actions WHERE executed_by LIKE 'test_%' OR executed_by = 'integration_test_user'")
            sql.execute("DELETE FROM import_progress_tracking WHERE orchestration_id IN (SELECT orchestration_id FROM import_orchestrations WHERE user_id LIKE 'test_%' OR user_id = 'integration_test_user')")
            sql.execute("DELETE FROM import_batches WHERE imb_user_id LIKE 'test_%' OR imb_user_id = 'integration_test_user'")
            sql.execute("DELETE FROM import_orchestrations WHERE user_id LIKE 'test_%' OR user_id = 'integration_test_user'")
        }
    }
}