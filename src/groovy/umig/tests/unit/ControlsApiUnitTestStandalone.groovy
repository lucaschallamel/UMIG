#!/usr/bin/env groovy

package umig.tests.unit

/**
 * Standalone Unit Test for Controls API
 * Tests the ControlRepository methods with mocked database
 * No external dependencies - can run outside ScriptRunner
 */

import groovy.transform.CompileStatic

// Disable static type checking for this file due to dynamic mocking
@groovy.transform.TypeChecked(groovy.transform.TypeCheckingMode.SKIP)

/**
 * Mock SQL interface that provides expected method signatures
 */
interface MockSqlInterface {
    List<Map<String, Object>> rows(String query, Map<String, Object> params)
    Map<String, Object> firstRow(String query, Map<String, Object> params)
    int executeUpdate(String query, Map<String, Object> params)
}

// Mock DatabaseUtil to avoid ScriptRunner dependency
class DatabaseUtil {
    static Closure mockSqlProvider = null
    
    static Object withSql(Closure closure) {
        if (mockSqlProvider != null) {
            return mockSqlProvider.call(closure)
        }
        // This will be overridden in each test
        return null
    }
}

// Mock ControlRepository with the methods we need to test
class ControlRepository {
    
    List<Map<String, Object>> findAllMasterControls() {
        return DatabaseUtil.withSql { Object sql ->
            return (sql as MockSqlInterface).rows("SELECT * FROM control_master ORDER BY ctm_order", [:])
        } as List<Map<String, Object>>
    }
    
    Map<String, Object> findControlInstanceById(UUID id) {
        return DatabaseUtil.withSql { Object sql ->
            return (sql as MockSqlInterface).firstRow("SELECT * FROM control_instance WHERE cti_id = ?", [cti_id: id] as Map<String, Object>)
        } as Map<String, Object>
    }
    
    Map<String, Object> calculatePhaseControlProgress(UUID phaseId) {
        return DatabaseUtil.withSql { Object sql ->
            List<Map<String, Object>> controls = (sql as MockSqlInterface).rows("SELECT * FROM control_instance WHERE phi_id = ?", [phi_id: phaseId] as Map<String, Object>)
            
            int totalControls = controls.size()
            int passedControls = (controls.count { Map<String, Object> it -> 
                it.cti_status == 'PASSED' 
            }) as int
            int failedControls = (controls.count { Map<String, Object> it -> 
                it.cti_status == 'FAILED' 
            }) as int
            int pendingControls = (controls.count { Map<String, Object> it -> 
                it.cti_status == 'PENDING' 
            }) as int
            int validatedControls = (controls.count { Map<String, Object> it -> 
                it.cti_status == 'VALIDATED' 
            }) as int
            int criticalControls = (controls.count { Map<String, Object> it -> 
                it.cti_is_critical == true 
            }) as int
            
            double progressPercentage = totalControls > 0 ? 
                ((validatedControls + passedControls) / totalControls) * 100 : 0.0
            
            boolean criticalFailure = controls.any { Map<String, Object> it -> 
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
            ] as Map<String, Object>
        } as Map<String, Object>
    }
    
    Map<String, Object> validateControl(UUID controlId, Map<String, Object> validationData) {
        return DatabaseUtil.withSql { Object sql ->
            Map<String, Object> control = (sql as MockSqlInterface).firstRow("SELECT * FROM control_instance WHERE cti_id = ?", [cti_id: controlId] as Map<String, Object>)
            if (control) {
                (sql as MockSqlInterface).executeUpdate(
                    "UPDATE control_instance SET cti_status = ?, usr_id_it_validator = ?, usr_id_biz_validator = ? WHERE cti_id = ?",
                    [
                        cti_status: validationData.cti_status,
                        usr_id_it_validator: validationData.usr_id_it_validator,
                        usr_id_biz_validator: validationData.usr_id_biz_validator,
                        cti_id: controlId
                    ] as Map<String, Object>
                )
            }
            return control
        } as Map<String, Object>
    }
    
    boolean reorderMasterControls(UUID phaseId, Map<String, Object> controlOrder) {
        return DatabaseUtil.withSql { Object sql ->
            controlOrder.each { Object controlId, Object order ->
                (sql as MockSqlInterface).executeUpdate(
                    "UPDATE control_master SET ctm_order = ? WHERE ctm_id = ? AND phm_id = ?",
                    [ctm_order: order, ctm_id: controlId, phm_id: phaseId] as Map<String, Object>
                )
            }
            return true
        } as boolean
    }
}

class ControlsApiUnitTest {
    
    static void testFindAllMasterControls() {
        println "Testing findAllMasterControls()..."
        
        // Mock the DatabaseUtil using a concrete mock implementation
        Object mockSql = [
            rows: { String query, Map<String, Object> params -> 
                return [
                    [ctm_id: UUID.randomUUID(), ctm_name: 'Control 1', ctm_order: 1] as Map<String, Object>,
                    [ctm_id: UUID.randomUUID(), ctm_name: 'Control 2', ctm_order: 2] as Map<String, Object>
                ] as List<Map<String, Object>>
            }
        ] as MockSqlInterface
        
        // Set up mock SQL provider for DatabaseUtil.withSql
        DatabaseUtil.mockSqlProvider = { Closure closure ->
            return closure.call(mockSql)
        }
        
        ControlRepository repository = new ControlRepository()
        List<Map<String, Object>> controls = repository.findAllMasterControls()
        
        assert controls.size() == 2
        assert controls[0]['ctm_name'] == 'Control 1'
        println "✅ findAllMasterControls() test passed"
        
        // Cleanup mock provider
        DatabaseUtil.mockSqlProvider = null
    }
    
    static void testFindControlInstanceById() {
        println "Testing findControlInstanceById()..."
        
        UUID testId = UUID.randomUUID()
        Object mockSql = [
            firstRow: { String query, Map<String, Object> params -> 
                if (params.cti_id == testId) {
                    return [
                        cti_id: testId, 
                        cti_name: 'Test Control Instance',
                        cti_status: 'PENDING'
                    ] as Map<String, Object>
                }
                return null
            }
        ] as MockSqlInterface
        
        DatabaseUtil.mockSqlProvider = { Closure closure ->
            return closure.call(mockSql)
        }
        
        ControlRepository repository = new ControlRepository()
        Map<String, Object> control = repository.findControlInstanceById(testId)
        
        assert control != null
        assert control['cti_name'] == 'Test Control Instance'
        assert control['cti_status'] == 'PENDING'
        println "✅ findControlInstanceById() test passed"
        
        // Cleanup mock provider
        DatabaseUtil.mockSqlProvider = null
    }
    
    static void testCalculatePhaseControlProgress() {
        println "Testing calculatePhaseControlProgress()..."
        
        UUID phaseId = UUID.randomUUID()
        Object mockSql = [
            rows: { String query, Map<String, Object> params -> 
                return [
                    [cti_id: UUID.randomUUID(), cti_status: 'PASSED', cti_is_critical: true] as Map<String, Object>,
                    [cti_id: UUID.randomUUID(), cti_status: 'PASSED', cti_is_critical: false] as Map<String, Object>,
                    [cti_id: UUID.randomUUID(), cti_status: 'FAILED', cti_is_critical: true] as Map<String, Object>,
                    [cti_id: UUID.randomUUID(), cti_status: 'PENDING', cti_is_critical: false] as Map<String, Object>
                ] as List<Map<String, Object>>
            }
        ] as MockSqlInterface
        
        DatabaseUtil.mockSqlProvider = { Closure closure ->
            return closure.call(mockSql)
        }
        
        ControlRepository repository = new ControlRepository()
        Map<String, Object> progress = repository.calculatePhaseControlProgress(phaseId)
        
        assert progress['totalControls'] == 4
        assert progress['passedControls'] == 2
        assert progress['failedControls'] == 1
        assert progress['pendingControls'] == 1
        assert progress['criticalControls'] == 2
        assert progress['progressPercentage'] == 50.0 // 2 passed / 4 total
        println "✅ calculatePhaseControlProgress() test passed"
        
        // Cleanup mock provider
        DatabaseUtil.mockSqlProvider = null
    }
    
    static void testValidateControl() {
        println "Testing validateControl()..."
        
        UUID controlId = UUID.randomUUID()
        boolean updateCalled = false
        
        Object mockSql = [
            firstRow: { String query, Map<String, Object> params -> 
                return [cti_id: controlId, cti_name: 'Test Control'] as Map<String, Object>
            },
            executeUpdate: { String query, Map<String, Object> params ->
                updateCalled = true
                assert params.cti_status == 'PASSED'
                assert params.usr_id_it_validator == 1
                assert params.cti_id == controlId
                return 1
            }
        ] as MockSqlInterface
        
        DatabaseUtil.mockSqlProvider = { Closure closure ->
            return closure.call(mockSql)
        }
        
        ControlRepository repository = new ControlRepository()
        Map<String, Object> validationData = [
            cti_status: 'PASSED',
            usr_id_it_validator: 1,
            usr_id_biz_validator: 2
        ] as Map<String, Object>
        Map<String, Object> result = repository.validateControl(controlId, validationData)
        
        assert updateCalled
        assert result != null
        println "✅ validateControl() test passed"
        
        // Cleanup mock provider
        DatabaseUtil.mockSqlProvider = null
    }
    
    static void main(String[] args) {
        println "============================================"
        println "Controls API Standalone Unit Tests"
        println "============================================\n"
        
        int testsPassed = 0
        int testsFailed = 0
        
        Map<String, Closure> tests = [
            'findAllMasterControls': ControlsApiUnitTest.&testFindAllMasterControls,
            'findControlInstanceById': ControlsApiUnitTest.&testFindControlInstanceById,
            'calculatePhaseControlProgress': ControlsApiUnitTest.&testCalculatePhaseControlProgress,
            'validateControl': ControlsApiUnitTest.&testValidateControl
        ]
        
        tests.each { String name, Closure test ->
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

// Test runner - this handles the args parameter properly
@CompileStatic
class TestRunner {
    static void main(String[] args) {
        ControlsApiUnitTest.main(args)
    }
}

// Execute tests when run as script
if (this.binding?.variables?.containsKey('args')) {
    TestRunner.main(this.binding.variables.args as String[])
} else {
    TestRunner.main([] as String[])
}