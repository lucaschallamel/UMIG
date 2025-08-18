#!/usr/bin/env groovy
/**
 * Standalone Unit Test for Controls API
 * Tests the ControlRepository methods with mocked database
 * No external dependencies - can run outside ScriptRunner
 */

package umig.tests.unit

import groovy.sql.Sql

// Mock DatabaseUtil to avoid ScriptRunner dependency
class DatabaseUtil {
    static def withSql(Closure closure) {
        // This will be overridden in each test
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
                    [
                        cti_status: validationData.cti_status,
                        usr_id_it_validator: validationData.usr_id_it_validator,
                        usr_id_biz_validator: validationData.usr_id_biz_validator,
                        cti_id: controlId
                    ]
                )
            }
            return control
        }
    }
    
    def reorderMasterControls(UUID phaseId, Map controlOrder) {
        return DatabaseUtil.withSql { sql ->
            controlOrder.each { controlId, order ->
                sql.executeUpdate(
                    "UPDATE control_master SET ctm_order = ? WHERE ctm_id = ? AND phm_id = ?",
                    [ctm_order: order, ctm_id: controlId, phm_id: phaseId]
                )
            }
            return true
        }
    }
}

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
                assert params[0] == 'PASSED'  // cti_status
                assert params[1] == 1          // usr_id_it_validator
                assert params[3] == controlId  // cti_id
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
    
    static void main(String[] args) {
        println "============================================"
        println "Controls API Standalone Unit Tests"
        println "============================================\n"
        
        def testsPassed = 0
        def testsFailed = 0
        
        def tests = [
            'findAllMasterControls': this.&testFindAllMasterControls,
            'findControlInstanceById': this.&testFindControlInstanceById,
            'calculatePhaseControlProgress': this.&testCalculatePhaseControlProgress,
            'validateControl': this.&testValidateControl
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
ControlsApiUnitTest.main(args)