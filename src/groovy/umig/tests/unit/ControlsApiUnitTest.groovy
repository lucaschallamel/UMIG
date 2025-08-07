#!/usr/bin/env groovy
/**
 * Unit Test for Controls API
 * Tests the ControlRepository methods with mocked database
 */

package umig.tests.unit

import umig.repository.ControlRepository
import umig.utils.DatabaseUtil
import groovy.sql.Sql

class ControlsApiUnitTest {
    
    static void testFindAllMasterControls() {
        println "Testing findAllMasterControls()..."
        
        // Mock the DatabaseUtil
        def mockSql = [
            rows: { query -> 
                return [
                    [ctm_id: UUID.randomUUID(), ctm_name: 'Control 1', ctm_order: 1],
                    [ctm_id: UUID.randomUUID(), ctm_name: 'Control 2', ctm_order: 2]
                ]
            }
        ] as Sql
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def controls = repository.findAllMasterControls()
        
        assert controls.size() == 2
        assert controls[0]['ctm_name'] == 'Control 1'
        println "✅ findAllMasterControls() test passed"
    }
    
    static void testFindControlInstanceById() {
        println "Testing findControlInstanceById()..."
        
        def testId = UUID.randomUUID()
        def mockSql = [
            firstRow: { query, params -> 
                if (params.cti_id == testId) {
                    return [
                        cti_id: testId, 
                        cti_name: 'Test Control Instance',
                        cti_status: 'PENDING'
                    ]
                }
                return null
            }
        ] as Sql
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def control = repository.findControlInstanceById(testId)
        
        assert control != null
        assert control['cti_name'] == 'Test Control Instance'
        assert control['cti_status'] == 'PENDING'
        println "✅ findControlInstanceById() test passed"
    }
    
    static void testCalculatePhaseControlProgress() {
        println "Testing calculatePhaseControlProgress()..."
        
        def phaseId = UUID.randomUUID()
        def mockSql = [
            rows: { query, params -> 
                return [
                    [cti_id: UUID.randomUUID(), cti_status: 'PASSED', cti_is_critical: true],
                    [cti_id: UUID.randomUUID(), cti_status: 'PASSED', cti_is_critical: false],
                    [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: true],
                    [cti_id: UUID.randomUUID(), cti_status: 'PENDING', cti_is_critical: false]
                ]
            }
        ] as Sql
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def progress = repository.calculatePhaseControlProgress(phaseId)
        
        assert progress['totalControls'] == 4
        assert progress['passedControls'] == 2
        assert progress['failedControls'] == 1
        assert progress['pendingControls'] == 1
        assert progress['criticalControls'] == 2
        assert progress['progressPercentage'] == 50.0 // 2 passed / 4 total
        println "✅ calculatePhaseControlProgress() test passed"
    }
    
    static void testValidateControl() {
        println "Testing validateControl()..."
        
        def controlId = UUID.randomUUID()
        def updateCalled = false
        
        def mockSql = [
            firstRow: { query, params -> 
                return [cti_id: controlId, cti_name: 'Test Control']
            },
            executeUpdate: { query, params ->
                updateCalled = true
                assert params.cti_status == 'PASSED'
                assert params.usr_id_it_validator == 1
                assert params.cti_id == controlId
                return 1
            }
        ] as Sql
        
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
        
        assert updateCalled
        assert result != null
        println "✅ validateControl() test passed"
    }
    
    static void testReorderMasterControls() {
        println "Testing reorderMasterControls()..."
        
        def phaseId = UUID.randomUUID()
        def control1Id = UUID.randomUUID()
        def control2Id = UUID.randomUUID()
        def updateCount = 0
        
        def mockSql = [
            executeUpdate: { query, params ->
                updateCount++
                return 1
            }
        ] as Sql
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def controlOrder = [
            (control1Id): 1,
            (control2Id): 2
        ]
        def result = repository.reorderMasterControls(phaseId, controlOrder)
        
        assert updateCount == 2
        assert result
        println "✅ reorderMasterControls() test passed"
    }
    
    // ==================== EDGE CASE TESTS ====================
    
    static void testCalculatePhaseControlProgressWithZeroControls() {
        println "Testing calculatePhaseControlProgress() with zero controls..."
        
        def phaseId = UUID.randomUUID()
        def mockSql = [
            rows: { query, params -> 
                return [] // No controls
            }
        ] as Sql
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def progress = repository.calculatePhaseControlProgress(phaseId)
        
        assert progress['totalControls'] == 0
        assert progress['validatedControls'] == 0
        assert progress['passedControls'] == 0
        assert progress['failedControls'] == 0
        assert progress['pendingControls'] == 0
        assert progress['criticalControls'] == 0
        assert progress['progressPercentage'] == 0.0
        println "✅ calculatePhaseControlProgress() with zero controls test passed"
    }
    
    static void testCalculatePhaseControlProgressWithAllFailedCriticalControls() {
        println "Testing calculatePhaseControlProgress() with all failed critical controls..."
        
        def phaseId = UUID.randomUUID()
        def mockSql = [
            rows: { query, params -> 
                return [
                    [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: true],
                    [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: true],
                    [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: true]
                ]
            }
        ] as Sql
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def progress = repository.calculatePhaseControlProgress(phaseId)
        
        assert progress['totalControls'] == 3
        assert progress['validatedControls'] == 0
        assert progress['passedControls'] == 0
        assert progress['failedControls'] == 3
        assert progress['pendingControls'] == 0
        assert progress['criticalControls'] == 3
        assert progress['progressPercentage'] == 0.0 // No passed or validated controls
        assert progress['criticalFailure'] == true // All critical controls failed
        println "✅ calculatePhaseControlProgress() with all failed critical controls test passed"
    }
    
    static void testCalculatePhaseControlProgressWithMixedValidationStates() {
        println "Testing calculatePhaseControlProgress() with mixed validation states..."
        
        def phaseId = UUID.randomUUID()
        def mockSql = [
            rows: { query, params -> 
                return [
                    [cti_id: UUID.randomUUID(), cti_status: 'PASSED', cti_is_critical: true],
                    [cti_id: UUID.randomUUID(), cti_status: 'PASSED', cti_is_critical: true],
                    [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: false],
                    [cti_id: UUID.randomUUID(), cti_status: 'PENDING', cti_is_critical: false],
                    [cti_id: UUID.randomUUID(), cti_status: 'CANCELLED', cti_is_critical: false],
                    [cti_id: UUID.randomUUID(), cti_status: 'TODO', cti_is_critical: true]
                ]
            }
        ] as Sql
        
        DatabaseUtil.metaClass.static.withSql = { Closure closure ->
            return closure.call(mockSql)
        }
        
        def repository = new ControlRepository()
        def progress = repository.calculatePhaseControlProgress(phaseId)
        
        assert progress['totalControls'] == 6
        assert progress['validatedControls'] == 1
        assert progress['passedControls'] == 1
        assert progress['failedControls'] == 1
        assert progress['pendingControls'] == 1
        assert progress['criticalControls'] == 3
        // Progress: (1 validated + 1 passed) / 6 = 33.33%
        assert Math.abs(progress['progressPercentage'] - 33.33) < 0.01
        println "✅ calculatePhaseControlProgress() with mixed validation states test passed"
    }
    
    static void testValidateControlWithNullValues() {
        println "Testing validateControl() with null values..."
        
        def controlId = UUID.randomUUID()
        def updateCalled = false
        
        def mockSql = [
            firstRow: { query, params -> 
                return [cti_id: controlId, cti_name: 'Test Control']
            },
            executeUpdate: { query, params ->
                updateCalled = true
                // Verify null values are handled properly
                assert params.cti_status == 'PASSED'
                assert params.usr_id_it_validator == null // null validator
                assert params.usr_id_biz_validator == null // null validator
                return 1
            }
        ] as Sql
        
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
        
        assert updateCalled
        assert result != null
        println "✅ validateControl() with null values test passed"
    }
    
    static void main(String[] args) {
        println "============================================"
        println "Controls API Unit Tests"
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