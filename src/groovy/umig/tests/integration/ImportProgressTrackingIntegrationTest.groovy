package umig.tests.integration

import umig.repository.ImportRepository
import umig.utils.DatabaseUtil
import umig.tests.utils.BaseIntegrationTest
import groovy.json.JsonBuilder
import groovy.sql.Sql
import java.util.UUID
import java.sql.Timestamp
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit

/**
 * Integration Test for US-034 Import Progress Tracking System
 * 
 * Tests real-time progress tracking, persistence, and concurrent access
 * 
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 3
 */
class ImportProgressTrackingIntegrationTest extends BaseIntegrationTest {

    private ImportRepository importRepository

    void setup() {
        super.setup()
        importRepository = new ImportRepository()
    }

    void cleanup() {
        cleanupTestProgressData()
        super.cleanup()
    }

    void testProgressTrackingLifecycle() {
        println "\n=== Testing Complete Progress Tracking Lifecycle ==="

        UUID orchestrationId = UUID.randomUUID()
        String phase = 'TEST_PHASE'

        // Test initial progress
        Map result1 = importRepository.trackImportProgress(orchestrationId, phase, 0, 100, "Starting test phase") as Map
        assert (result1.success as Boolean) == true, "Initial progress tracking should succeed"
        assert (result1.progressPercentage as Integer) == 0, "Initial progress should be 0%"
        assert (result1.status as String) == 'PENDING', "Initial status should be PENDING"

        // Test mid-progress update
        Map result2 = importRepository.trackImportProgress(orchestrationId, phase, 45, 100, "Halfway through test phase") as Map
        assert (result2.success as Boolean) == true, "Mid-progress tracking should succeed"
        assert (result2.progressPercentage as Integer) == 45, "Progress should be 45%"
        assert (result2.status as String) == 'IN_PROGRESS', "Status should be IN_PROGRESS"

        // Test completion
        Map result3 = importRepository.trackImportProgress(orchestrationId, phase, 100, 100, "Test phase completed") as Map
        assert (result3.success as Boolean) == true, "Completion tracking should succeed"
        assert (result3.progressPercentage as Integer) == 100, "Progress should be 100%"
        assert (result3.status as String) == 'COMPLETED', "Status should be COMPLETED"

        // Verify persistence
        Map progressStatus = importRepository.getProgressStatus(orchestrationId) as Map
        Map phaseStatus = (progressStatus.phases as Map)[phase] as Map
        assert (phaseStatus?.progressPercentage as Integer) == 100, "Persisted progress should be 100%"
        assert (phaseStatus?.status as String) == 'COMPLETED', "Persisted status should be COMPLETED"

        println "✅ Progress tracking lifecycle test passed"
    }

    void testMultiPhaseProgressTracking() {
        println "\n=== Testing Multi-Phase Progress Tracking ==="

        UUID orchestrationId = UUID.randomUUID()
        List<String> phases = ['BASE_ENTITIES', 'JSON_PROCESSING', 'MASTER_PROMOTION', 'VALIDATION']

        // Track progress across multiple phases
        phases.eachWithIndex { phase, index ->
            // Simulate phase progression
            importRepository.trackImportProgress(orchestrationId, phase, 0, 10, "Starting ${phase}")
            importRepository.trackImportProgress(orchestrationId, phase, 5, 10, "Halfway ${phase}")
            importRepository.trackImportProgress(orchestrationId, phase, 10, 10, "Completed ${phase}")
        }

        // Validate overall progress
        Map progressStatus = importRepository.getProgressStatus(orchestrationId) as Map
        Map phasesMap = progressStatus.phases as Map
        assert (phasesMap.size() as Integer) == 4, "Should track 4 phases"
        assert (progressStatus.overallProgress as Integer) == 100, "Overall progress should be 100%"
        assert (progressStatus.status as String) == 'COMPLETED', "Overall status should be COMPLETED"

        // Validate individual phase tracking
        phases.each { phase ->
            Map phaseProgress = (phasesMap[phase] as Map)
            assert (phaseProgress.progressPercentage as Integer) == 100, "Phase ${phase} should be 100%"
            assert (phaseProgress.status as String) == 'COMPLETED', "Phase ${phase} should be COMPLETED"
            assert (phaseProgress.itemsProcessed as Integer) == 10, "Phase ${phase} should have processed 10 items"
            assert (phaseProgress.itemsTotal as Integer) == 10, "Phase ${phase} should have 10 total items"
        }

        println "✅ Multi-phase progress tracking test passed"
    }

    void testProgressTrackingConcurrency() {
        println "\n=== Testing Progress Tracking Concurrency ==="

        UUID orchestrationId = UUID.randomUUID()
        String phase = 'CONCURRENT_TEST'
        int threadCount = 5
        int updatesPerThread = 10
        CountDownLatch startLatch = new CountDownLatch(1)
        CountDownLatch completeLatch = new CountDownLatch(threadCount)
        List<Exception> exceptions = Collections.synchronizedList([])

        // Create concurrent threads updating progress
        List<Thread> threads = []
        (1..threadCount).each { threadNum ->
            Thread thread = new Thread({
                try {
                    startLatch.await() // Wait for all threads to be ready
                    
                    (1..updatesPerThread).each { updateNum ->
                        int progress = (threadNum - 1) * updatesPerThread + updateNum
                        int total = threadCount * updatesPerThread
                        
                        Map result = importRepository.trackImportProgress(
                            orchestrationId, 
                            phase, 
                            progress, 
                            total, 
                            "Thread ${threadNum} update ${updateNum}"
                        ) as Map
                        
                        if (!(result.success as Boolean)) {
                            exceptions << new Exception("Thread ${threadNum} failed at update ${updateNum}: ${result.error}")
                        }
                        
                        // Small delay to increase concurrency chances
                        Thread.sleep(10)
                    }
                } catch (Exception e) {
                    exceptions << e
                } finally {
                    completeLatch.countDown()
                }
            })
            threads << thread
            thread.start()
        }

        // Start all threads simultaneously
        startLatch.countDown()
        
        // Wait for completion
        boolean completed = completeLatch.await(30, TimeUnit.SECONDS)
        assert completed, "Concurrent progress tracking should complete within 30 seconds"
        assert exceptions.isEmpty(), "No exceptions should occur: ${exceptions}"

        // Validate final state
        Map progressStatus = importRepository.getProgressStatus(orchestrationId) as Map
        Map phasesMap = progressStatus.phases as Map
        Map phaseProgress = phasesMap[phase] as Map
        
        assert phaseProgress != null, "Phase progress should exist"
        assert (phaseProgress.progressPercentage as Integer) == 100, "Final progress should be 100%"
        assert (phaseProgress.itemsTotal as Integer) == threadCount * updatesPerThread, "Total items should match expected"
        assert (phaseProgress.status as String) == 'COMPLETED', "Final status should be COMPLETED"

        println "✅ Progress tracking concurrency test passed"
    }

    void testProgressTrackingPersistenceAndRecovery() {
        println "\n=== Testing Progress Tracking Persistence and Recovery ==="

        UUID orchestrationId = UUID.randomUUID()
        String phase1 = 'PERSISTENCE_TEST_1'
        String phase2 = 'PERSISTENCE_TEST_2'

        // Create initial progress
        importRepository.trackImportProgress(orchestrationId, phase1, 75, 100, "Phase 1 progress")
        importRepository.trackImportProgress(orchestrationId, phase2, 30, 100, "Phase 2 progress")

        // Simulate application restart by creating new repository instance
        ImportRepository newRepositoryInstance = new ImportRepository()

        // Verify persistence
        Map recoveredProgress = newRepositoryInstance.getProgressStatus(orchestrationId) as Map
        Map recoveredPhasesMap = recoveredProgress.phases as Map
        
        assert (recoveredPhasesMap.size() as Integer) == 2, "Should recover 2 phases"
        assert ((recoveredPhasesMap[phase1] as Map)?.progressPercentage as Integer) == 75, "Phase 1 progress should be recovered"
        assert ((recoveredPhasesMap[phase2] as Map)?.progressPercentage as Integer) == 30, "Phase 2 progress should be recovered"

        // Test progress update after recovery
        Map updateResult = newRepositoryInstance.trackImportProgress(orchestrationId, phase1, 100, 100, "Phase 1 completed after recovery") as Map
        assert (updateResult.success as Boolean) == true, "Progress update after recovery should succeed"

        // Verify final state
        Map finalProgress = newRepositoryInstance.getProgressStatus(orchestrationId) as Map
        Map finalPhasesMap = finalProgress.phases as Map
        assert ((finalPhasesMap[phase1] as Map)?.progressPercentage as Integer) == 100, "Phase 1 should be completed after recovery"

        println "✅ Progress tracking persistence and recovery test passed"
    }

    void testProgressTrackingErrorHandling() {
        println "\n=== Testing Progress Tracking Error Handling ==="

        UUID validOrchestrationId = UUID.randomUUID()
        String validPhase = 'ERROR_TEST'

        // Test invalid orchestration ID format (should handle gracefully)
        try {
            // This should not crash but handle the error gracefully
            Map result = importRepository.trackImportProgress(null, validPhase, 50, 100, "Test with null ID") as Map
            assert (result.success as Boolean) == false, "Tracking with null orchestration ID should fail gracefully"
        } catch (Exception e) {
            println "Expected error handled: ${e.message}"
        }

        // Test with negative progress values
        Map negativeResult = importRepository.trackImportProgress(validOrchestrationId, validPhase, -10, 100, "Negative progress") as Map
        // Should either succeed with normalization or fail gracefully
        assert negativeResult != null, "Should handle negative progress gracefully"

        // Test with progress greater than total
        Map overResult = importRepository.trackImportProgress(validOrchestrationId, validPhase, 150, 100, "Over 100% progress") as Map
        if (overResult.success as Boolean) {
            // If accepted, should be normalized or capped
            assert (overResult.progressPercentage as Integer) <= 100, "Progress should be capped at 100%"
        }

        // Test with zero total
        Map zeroTotalResult = importRepository.trackImportProgress(validOrchestrationId, validPhase, 50, 0, "Zero total items") as Map
        assert (zeroTotalResult.success as Boolean) == true, "Should handle zero total items"
        assert (zeroTotalResult.progressPercentage as Integer) == 0, "Progress should be 0% with zero total"

        println "✅ Progress tracking error handling test passed"
    }

    void testProgressTrackingPerformance() {
        println "\n=== Testing Progress Tracking Performance ==="

        UUID orchestrationId = UUID.randomUUID()
        String phase = 'PERFORMANCE_TEST'
        int updateCount = 100

        long startTime = System.currentTimeMillis()

        // Perform many rapid updates
        (1..updateCount).each { i ->
            Map result = importRepository.trackImportProgress(
                orchestrationId, 
                phase, 
                i, 
                updateCount, 
                "Performance test update ${i}"
            ) as Map
            assert (result.success as Boolean) == true, "Performance test update ${i} should succeed"
        }

        long duration = System.currentTimeMillis() - startTime
        double averageTimePerUpdate = duration / updateCount

        println "Performance Results:"
        println "  Total updates: ${updateCount}"
        println "  Total time: ${duration}ms"
        println "  Average per update: ${averageTimePerUpdate}ms"

        // Performance assertions
        assert duration < 30000, "100 updates should complete within 30 seconds"
        assert averageTimePerUpdate < 300, "Each update should average less than 300ms"

        // Validate final state
        Map finalProgress = importRepository.getProgressStatus(orchestrationId) as Map
        Map finalPhasesMap = finalProgress.phases as Map
        Map finalPhaseProgress = finalPhasesMap[phase] as Map
        assert (finalPhaseProgress?.progressPercentage as Integer) == 100, "Final progress should be 100%"
        assert (finalPhaseProgress?.itemsProcessed as Integer) == updateCount, "Should have processed all items"

        println "✅ Progress tracking performance test passed"
    }

    void testProgressTrackingWithRealTimeQueries() {
        println "\n=== Testing Progress Tracking with Real-Time Queries ==="

        UUID orchestrationId = UUID.randomUUID()
        List<String> phases = ['REALTIME_PHASE_1', 'REALTIME_PHASE_2']

        // Start background progress simulation
        Thread progressThread = Thread.start {
            phases.each { phase ->
                (1..20).each { i ->
                    importRepository.trackImportProgress(orchestrationId, phase, i, 20, "Real-time update ${i}")
                    Thread.sleep(50) // Simulate work
                }
            }
        }

        // Query progress in real-time
        List<Integer> observedProgressValues = []
        (1..30).each { queryNum ->
            Thread.sleep(100) // Query every 100ms
            Map progressStatus = importRepository.getProgressStatus(orchestrationId) as Map
            Map phasesMap = progressStatus.phases as Map
            
            if ((phasesMap.size() as Integer) > 0) {
                Integer overallProgress = progressStatus.overallProgress as Integer
                observedProgressValues.add(overallProgress)
                println "Query ${queryNum}: Overall progress ${overallProgress}%"
            }
        }

        // Wait for background thread to complete
        progressThread.join(10000)

        // Validate real-time behavior
        assert (observedProgressValues.size() as Integer) > 0, "Should have observed progress values"
        assert (observedProgressValues.last() as Integer) == 100, "Final observed progress should be 100%"

        // Validate progression (should generally increase)
        boolean hasProgression = false
        for (int i = 1; i < (observedProgressValues.size() as Integer); i++) {
            if ((observedProgressValues[i] as Integer) > (observedProgressValues[i-1] as Integer)) {
                hasProgression = true
                break
            }
        }
        assert hasProgression, "Should observe progress increasing over time"

        println "✅ Progress tracking real-time queries test passed"
    }

    // ====== HELPER METHODS ======

    private void cleanupTestProgressData() {
        DatabaseUtil.withSql { Sql sql ->
            // Clean up test progress tracking data
            sql.execute("""
                DELETE FROM import_progress_tracking 
                WHERE orchestration_id IN (
                    SELECT DISTINCT orchestration_id 
                    FROM import_progress_tracking 
                    WHERE phase_name LIKE '%TEST%' 
                    OR message LIKE '%test%'
                    OR message LIKE '%Test%'
                )
            """)
            
            sql.execute("""
                DELETE FROM import_orchestrations 
                WHERE orchestration_id NOT IN (
                    SELECT DISTINCT orchestration_id 
                    FROM import_progress_tracking
                )
                AND (configuration LIKE '%test%' OR user_id LIKE '%test%')
            """)
        }
    }
}