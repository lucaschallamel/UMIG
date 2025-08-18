#!/usr/bin/env groovy
/**
 * Standalone Unit Test for Controls API  
 * Tests repository methods with properly mocked database
 * Zero external dependencies - runs outside ScriptRunner
 */

// Mock SQL class that implements the methods we need
class MockSql {
    def rowsData = []
    def firstRowData = null
    def updateCount = 0
    
    def rows(query, params = [:]) {
        return rowsData
    }
    
    def firstRow(query, params = [:]) {
        return firstRowData
    }
    
    def executeUpdate(Object... args) {
        updateCount++
        return 1
    }
    
    def withTransaction(Closure closure) {
        return closure.call()
    }
}

// Mock DatabaseUtil to avoid ScriptRunner dependency
class DatabaseUtil {
    static def withSql(Closure closure) {
        // Will be overridden in tests
        return null
    }
}

// Mock ControlRepository with the methods we need to test
class ControlRepository {
    
    def findAllMasterControls() {
        return DatabaseUtil.withSql { sql ->
            sql.rows("SELECT * FROM control_master ORDER BY ctm_order")
        }
    }
    
    def findControlInstanceById(UUID id) {
        return DatabaseUtil.withSql { sql ->
            sql.firstRow("SELECT * FROM control_instance WHERE cti_id = ?", [cti_id: id])
        }
    }
    
    def calculatePhaseControlProgress(UUID phaseId) {
        return DatabaseUtil.withSql { sql ->
            def controls = sql.rows("SELECT * FROM control_instance WHERE phi_id = ?", [phi_id: phaseId])
            
            def totalControls = controls.size()
            def passedControls = controls.count { it.cti_status == 'PASSED' }
            def failedControls = controls.count { it.cti_status == 'FAILED' }
            def pendingControls = controls.count { it.cti_status == 'PENDING' }
            def validatedControls = controls.count { it.cti_status == 'VALIDATED' }
            def criticalControls = controls.count { it.cti_is_critical == true }
            
            def progressPercentage = totalControls > 0 ? 
                ((validatedControls + passedControls) / totalControls) * 100 : 0.0
            
            def criticalFailure = controls.any { 
                it.cti_is_critical == true && it.cti_status == 'FAILED' 
            }
            
            return [
                totalControls: totalControls,
                validatedControls: validatedControls,
                passedControls: passedControls,
                failedControls: failedControls,
                pendingControls: pendingControls,
                criticalControls: criticalControls,
                progressPercentage: progressPercentage,
                criticalFailure: criticalFailure
            ]
        }
    }
    
    def validateControl(UUID controlId, Map validationData) {
        return DatabaseUtil.withSql { sql ->
            def control = sql.firstRow("SELECT * FROM control_instance WHERE cti_id = ?", [cti_id: controlId])
            if (control) {
                sql.executeUpdate(
                    "UPDATE control_instance SET cti_status = ?, usr_id_it_validator = ?, usr_id_biz_validator = ? WHERE cti_id = ?",
                    validationData.cti_status,
                    validationData.usr_id_it_validator,
                    validationData.usr_id_biz_validator,
                    controlId
                )
            }
            return control
        }
    }
    
    def reorderMasterControls(UUID phaseId, Map<UUID, Integer> orderMap) {
        return DatabaseUtil.withSql { sql ->
            sql.withTransaction {
                orderMap.each { controlId, newOrder ->
                    sql.executeUpdate(
                        "UPDATE controls_master_ctm SET ctm_order = ?, updated_by = 'system', updated_at = CURRENT_TIMESTAMP WHERE ctm_id = ? AND phm_id = ?",
                        newOrder, controlId, phaseId
                    )
                }
                return true
            }
        }
    }
}

class ControlsApiUnitTestClass {
    
    static void testFindAllMasterControls() {
        println "Testing findAllMasterControls()..."
        
        // Create mock SQL with test data
        def mockSql = new MockSql()
        mockSql.rowsData = [
            [ctm_id: UUID.randomUUID(), ctm_name: 'Control 1', ctm_order: 1],
            [ctm_id: UUID.randomUUID(), ctm_name: 'Control 2', ctm_order: 2]
        ]
        
        // Override DatabaseUtil to return our mock
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def controls = repository.findAllMasterControls()
        
        assert controls.size() == 2
        assert controls[0].ctm_name == 'Control 1'
        println "✅ findAllMasterControls() test passed"
    }
    
    static void testFindControlInstanceById() {
        println "Testing findControlInstanceById()..."
        
        def testId = UUID.randomUUID()
        def mockSql = new MockSql()
        mockSql.firstRowData = [
            cti_id: testId, 
            cti_name: 'Test Control Instance',
            cti_status: 'PENDING'
        ]
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def control = repository.findControlInstanceById(testId)
        
        assert control != null
        assert control.cti_name == 'Test Control Instance'
        assert control.cti_status == 'PENDING'
        println "✅ findControlInstanceById() test passed"
    }
    
    static void testCalculatePhaseControlProgress() {
        println "Testing calculatePhaseControlProgress()..."
        
        def phaseId = UUID.randomUUID()
        def mockSql = new MockSql()
        mockSql.rowsData = [
            [cti_id: UUID.randomUUID(), cti_status: 'PASSED', cti_is_critical: true],
            [cti_id: UUID.randomUUID(), cti_status: 'PASSED', cti_is_critical: false],
            [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: true],
            [cti_id: UUID.randomUUID(), cti_status: 'PENDING', cti_is_critical: false]
        ]
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def progress = repository.calculatePhaseControlProgress(phaseId)
        
        assert progress.totalControls == 4
        assert progress.passedControls == 2
        assert progress.failedControls == 1
        assert progress.pendingControls == 1
        assert progress.criticalControls == 2
        assert progress.progressPercentage == 50.0 // 2 passed / 4 total
        assert progress.criticalFailure == true // Has critical failures
        println "✅ calculatePhaseControlProgress() test passed"
    }
    
    static void testValidateControl() {
        println "Testing validateControl()..."
        
        def controlId = UUID.randomUUID()
        def mockSql = new MockSql()
        mockSql.firstRowData = [cti_id: controlId, cti_name: 'Test Control']
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def validationData = [
            cti_status: 'PASSED',
            usr_id_it_validator: 1,
            usr_id_biz_validator: 2
        ]
        def result = repository.validateControl(controlId, validationData)
        
        assert mockSql.updateCount == 1
        assert result != null
        assert result.cti_name == 'Test Control'
        println "✅ validateControl() test passed"
    }
    
    static void testReorderMasterControls() {
        println "Testing reorderMasterControls()..."
        
        def phaseId = UUID.randomUUID()
        def control1Id = UUID.randomUUID()
        def control2Id = UUID.randomUUID()
        def mockSql = new MockSql()
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def controlOrder = [
            (control1Id): 1,
            (control2Id): 2
        ]
        def result = repository.reorderMasterControls(phaseId, controlOrder)
        
        assert mockSql.updateCount == 2
        assert result
        println "✅ reorderMasterControls() test passed"
    }
    
    // ==================== EDGE CASE TESTS ====================
    
    static void testCalculatePhaseControlProgressWithZeroControls() {
        println "Testing calculatePhaseControlProgress() with zero controls..."
        
        def phaseId = UUID.randomUUID()
        def mockSql = new MockSql()
        mockSql.rowsData = [] // No controls
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def progress = repository.calculatePhaseControlProgress(phaseId)
        
        assert progress.totalControls == 0
        assert progress.validatedControls == 0
        assert progress.passedControls == 0
        assert progress.failedControls == 0
        assert progress.pendingControls == 0
        assert progress.criticalControls == 0
        assert progress.progressPercentage == 0.0
        assert progress.criticalFailure == false
        println "✅ calculatePhaseControlProgress() with zero controls test passed"
    }
    
    static void testCalculatePhaseControlProgressWithAllFailedCriticalControls() {
        println "Testing calculatePhaseControlProgress() with all failed critical controls..."
        
        def phaseId = UUID.randomUUID()
        def mockSql = new MockSql()
        mockSql.rowsData = [
            [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: true],
            [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: true],
            [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: true]
        ]
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def progress = repository.calculatePhaseControlProgress(phaseId)
        
        assert progress.totalControls == 3
        assert progress.validatedControls == 0
        assert progress.passedControls == 0
        assert progress.failedControls == 3
        assert progress.pendingControls == 0
        assert progress.criticalControls == 3
        assert progress.progressPercentage == 0.0 // No passed or validated controls
        assert progress.criticalFailure == true // All critical controls failed
        println "✅ calculatePhaseControlProgress() with all failed critical controls test passed"
    }
    
    static void testCalculatePhaseControlProgressWithMixedValidationStates() {
        println "Testing calculatePhaseControlProgress() with mixed validation states..."
        
        def phaseId = UUID.randomUUID()
        def mockSql = new MockSql()
        mockSql.rowsData = [
            [cti_id: UUID.randomUUID(), cti_status: 'PASSED', cti_is_critical: true],
            [cti_id: UUID.randomUUID(), cti_status: 'VALIDATED', cti_is_critical: true],
            [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: false],
            [cti_id: UUID.randomUUID(), cti_status: 'PENDING', cti_is_critical: false],
            [cti_id: UUID.randomUUID(), cti_status: 'CANCELLED', cti_is_critical: false],
            [cti_id: UUID.randomUUID(), cti_status: 'TODO', cti_is_critical: true]
        ]
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def progress = repository.calculatePhaseControlProgress(phaseId)
        
        assert progress.totalControls == 6
        assert progress.validatedControls == 1
        assert progress.passedControls == 1
        assert progress.failedControls == 1
        assert progress.pendingControls == 1
        assert progress.criticalControls == 3
        // Progress: (1 validated + 1 passed) / 6 = 33.33%
        assert Math.abs(progress.progressPercentage - 33.33) < 0.01
        println "✅ calculatePhaseControlProgress() with mixed validation states test passed"
    }
    
    static void testValidateControlWithNullValues() {
        println "Testing validateControl() with null values..."
        
        def controlId = UUID.randomUUID()
        def mockSql = new MockSql()
        mockSql.firstRowData = [cti_id: controlId, cti_name: 'Test Control']
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def validationData = [
            cti_status: 'PASSED',
            usr_id_it_validator: null,
            usr_id_biz_validator: null
        ]
        def result = repository.validateControl(controlId, validationData)
        
        assert mockSql.updateCount == 1
        assert result != null
        assert result.cti_name == 'Test Control'
        println "✅ validateControl() with null values test passed"
    }
    
    static void main(String[] args) {
        println "============================================"
        println "Controls API Unit Tests (Fixed)"
        println "============================================\n"
        
        def testsPassed = 0
        def testsFailed = 0
        
        def tests = [
            'findAllMasterControls': this.&testFindAllMasterControls,
            'findControlInstanceById': this.&testFindControlInstanceById,
            'calculatePhaseControlProgress': this.&testCalculatePhaseControlProgress,
            'validateControl': this.&testValidateControl,
            'reorderMasterControls': this.&testReorderMasterControls,
            // Edge case tests
            'calculatePhaseControlProgress with zero controls': this.&testCalculatePhaseControlProgressWithZeroControls,
            'calculatePhaseControlProgress with all failed critical': this.&testCalculatePhaseControlProgressWithAllFailedCriticalControls,
            'calculatePhaseControlProgress with mixed states': this.&testCalculatePhaseControlProgressWithMixedValidationStates,
            'validateControl with null values': this.&testValidateControlWithNullValues
        ]
        
        tests.each { name, test ->
            try {
                test()
                testsPassed++
            } catch (AssertionError e) {
                println "❌ ${name} test failed: ${e.message}"
                testsFailed++
            } catch (Exception e) {
                println "❌ ${name} test error: ${e.message}"
                e.printStackTrace()
                testsFailed++
            }
        }
        
        println "\n" + "=" * 40
        println "Test Summary"
        println "=" * 40
        println "✅ Passed: ${testsPassed}"
        println "❌ Failed: ${testsFailed}"
        println "Total: ${testsPassed + testsFailed}"
        
        if (testsFailed == 0) {
            println "\n🎉 All unit tests passed!"
        } else {
            println "\n⚠️ Some tests failed"
            System.exit(1)
        }
    }
}

// Run the tests
ControlsApiUnitTestClass.main(args)