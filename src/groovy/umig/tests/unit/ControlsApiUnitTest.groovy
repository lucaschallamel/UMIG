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
                    [cti_id: UUID.randomUUID(), cti_status: 'VALIDATED', cti_is_critical: true],
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
        assert progress['validatedControls'] == 1
        assert progress['passedControls'] == 1
        assert progress['failedControls'] == 1
        assert progress['pendingControls'] == 1
        assert progress['criticalControls'] == 2
        assert progress['progressPercentage'] == 50.0 // (1 validated + 1 passed) / 4 total
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
                assert params.cti_status == 'VALIDATED'
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
            cti_status: 'VALIDATED',
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
            'reorderMasterControls': this.&testReorderMasterControls
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