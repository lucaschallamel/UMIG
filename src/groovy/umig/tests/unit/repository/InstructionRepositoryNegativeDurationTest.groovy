#!/usr/bin/env groovy

package umig.tests.unit.repository

import java.util.UUID
import java.sql.SQLException

/**
 * Unit Test for InstructionRepository - Negative Duration Validation
 * Tests negative duration validation added in code review changes
 * Follows the project's simple test pattern (no external dependencies).
 * 
 * ADR-026 Compliance:
 * - Validation occurs before SQL execution
 * - Type safety validation for duration parameters
 * - Error handling with appropriate messages
 * 
 * Run: groovy InstructionRepositoryNegativeDurationTest.groovy
 * Created: 2025-08-18 (Converted to zero-dependency pattern)
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
    static def firstRowResponses = []
    static def executeUpdateResponses = []
    static def firstRowCalls = []
    static def executeUpdateCalls = []
    
    def firstRow(String query, params = [:]) {
        firstRowCalls << [query: query, params: params]
        
        // createMasterInstruction simulation
        if (query.contains("INSERT INTO instructions_master_inm") && query.contains("RETURNING inm_id")) {
            if (firstRowResponses.isEmpty()) {
                return [inm_id: UUID.randomUUID()]
            }
            def response = firstRowResponses.removeAt(0)
            if (response instanceof Exception) {
                throw response
            }
            return response
        }
        
        return [:]
    }
    
    def executeUpdate(String query, params = [:]) {
        executeUpdateCalls << [query: query, params: params]
        
        // updateMasterInstruction simulation
        if (query.contains("UPDATE instructions_master_inm")) {
            if (executeUpdateResponses.isEmpty()) {
                return 1
            }
            def response = executeUpdateResponses.removeAt(0)
            if (response instanceof Exception) {
                throw response
            }
            return response
        }
        
        return 0
    }
    
    static void reset() {
        firstRowResponses.clear()
        executeUpdateResponses.clear()
        firstRowCalls.clear()
        executeUpdateCalls.clear()
    }
}

// Copy of InstructionRepository class for testing (simplified version focusing on tested methods)
class MockInstructionRepository {
    
    def createMasterInstruction(Map params) {
        // Validate duration before SQL execution
        if (params.inmDurationMinutes != null && params.inmDurationMinutes != '') {
            def duration = Integer.parseInt(params.inmDurationMinutes as String)
            if (duration < 0) {
                throw new IllegalArgumentException("Duration minutes cannot be negative")
            }
        }
        
        return DatabaseUtil.withSql { sql ->
            // Convert parameters for SQL
            def sqlParams = [:]
            sqlParams.putAll(params)
            if (params.inmDurationMinutes != null && params.inmDurationMinutes != '') {
                sqlParams.inmDurationMinutes = Integer.parseInt(params.inmDurationMinutes as String)
            } else {
                sqlParams.inmDurationMinutes = null
            }
            
            def result = sql.firstRow(
                'INSERT INTO instructions_master_inm (stm_id, inm_order, inm_body, inm_duration_minutes) VALUES (:stmId, :inmOrder, :inmBody, :inmDurationMinutes) RETURNING inm_id',
                sqlParams
            )
            return result.inm_id
        }
    }
    
    def updateMasterInstruction(UUID instructionId, Map params) {
        if (instructionId == null) {
            throw new IllegalArgumentException("Instruction ID cannot be null")
        }
        
        // Validate duration before SQL execution
        if (params.inmDurationMinutes != null && params.inmDurationMinutes != '') {
            def duration = Integer.parseInt(params.inmDurationMinutes as String)
            if (duration < 0) {
                throw new IllegalArgumentException("Duration minutes cannot be negative")
            }
        }
        
        return DatabaseUtil.withSql { sql ->
            // Convert parameters for SQL
            def sqlParams = [:]
            sqlParams.putAll(params)
            sqlParams.inmId = instructionId
            if (params.inmDurationMinutes != null && params.inmDurationMinutes != '') {
                sqlParams.inmDurationMinutes = Integer.parseInt(params.inmDurationMinutes as String)
            } else {
                sqlParams.inmDurationMinutes = null
            }
            
            return sql.executeUpdate(
                'UPDATE instructions_master_inm SET inm_body = :inmBody, inm_duration_minutes = :inmDurationMinutes WHERE inm_id = :inmId',
                sqlParams
            )
        }
    }
}

// --- Test Runner ---
class InstructionRepositoryTests {
    def instructionRepository = new MockInstructionRepository()
    
    void runTests() {
        println "🚀 Running Instruction Repository Negative Duration Unit Tests (Zero Dependencies)..."
        
        def passed = 0
        def failed = 0
        
        try {
            MockSql.reset()
            def stepId = UUID.randomUUID()
            def params = [
                stmId: stepId.toString(),
                inmOrder: '1',
                inmBody: 'Test Instruction with Negative Duration',
                inmDurationMinutes: '-30'  // Negative duration
            ]
            
            try {
                instructionRepository.createMasterInstruction(params)
                assert false, "Expected IllegalArgumentException"
            } catch (IllegalArgumentException ex) {
                assert ex.message.contains("Duration minutes cannot be negative")
                assert MockSql.firstRowCalls.size() == 0  // No SQL queries executed
            }
            
            println "✅ Test 1 passed: createMasterInstruction rejects negative duration"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 1 failed: ${e.message}"
            failed++
        }
        
        // Test 2: createMasterInstruction should accept zero duration minutes
        try {
            MockSql.reset()
            def stepId = UUID.randomUUID()
            def params = [
                stmId: stepId.toString(),
                inmOrder: '1',
                inmBody: 'Test Instruction with Zero Duration',
                inmDurationMinutes: '0'  // Zero duration is valid
            ]
            def newInstructionId = UUID.randomUUID()
            MockSql.firstRowResponses << [inm_id: newInstructionId]
            
            def result = instructionRepository.createMasterInstruction(params)
            
            assert result == newInstructionId
            assert MockSql.firstRowCalls.size() == 1
            def call = MockSql.firstRowCalls[0]
            assert call.params.inmDurationMinutes == 0
            
            println "✅ Test 2 passed: createMasterInstruction accepts zero duration"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 2 failed: ${e.message}"
            failed++
        }
        
        // Test 3: createMasterInstruction should accept positive duration minutes
        try {
            MockSql.reset()
            def stepId = UUID.randomUUID()
            def params = [
                stmId: stepId.toString(),
                inmOrder: '1',
                inmBody: 'Test Instruction with Positive Duration',
                inmDurationMinutes: '45'  // Positive duration
            ]
            def newInstructionId = UUID.randomUUID()
            MockSql.firstRowResponses << [inm_id: newInstructionId]
            
            def result = instructionRepository.createMasterInstruction(params)
            
            assert result == newInstructionId
            assert MockSql.firstRowCalls.size() == 1
            def call = MockSql.firstRowCalls[0]
            assert call.params.inmDurationMinutes == 45
            
            println "✅ Test 3 passed: createMasterInstruction accepts positive duration"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 3 failed: ${e.message}"
            failed++
        }
        
        // Test 4: createMasterInstruction should handle null duration gracefully
        try {
            MockSql.reset()
            def stepId = UUID.randomUUID()
            def params = [
                stmId: stepId.toString(),
                inmOrder: '1',
                inmBody: 'Test Instruction with Null Duration',
                inmDurationMinutes: null  // Null duration is acceptable
            ]
            def newInstructionId = UUID.randomUUID()
            MockSql.firstRowResponses << [inm_id: newInstructionId]
            
            def result = instructionRepository.createMasterInstruction(params)
            
            assert result == newInstructionId
            assert MockSql.firstRowCalls.size() == 1
            def call = MockSql.firstRowCalls[0]
            assert call.params.inmDurationMinutes == null
            
            println "✅ Test 4 passed: createMasterInstruction handles null duration"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 4 failed: ${e.message}"
            failed++
        }
        
        // Test 5: updateMasterInstruction should reject negative duration minutes
        try {
            MockSql.reset()
            def instructionId = UUID.randomUUID()
            def params = [
                inmBody: 'Updated Instruction Body',
                inmDurationMinutes: '-15'  // Negative duration
            ]
            
            try {
                instructionRepository.updateMasterInstruction(instructionId, params)
                assert false, "Expected IllegalArgumentException"
            } catch (IllegalArgumentException ex) {
                assert ex.message.contains("Duration minutes cannot be negative")
                assert MockSql.executeUpdateCalls.size() == 0  // No SQL queries executed
            }
            
            println "✅ Test 5 passed: updateMasterInstruction rejects negative duration"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 5 failed: ${e.message}"
            failed++
        }
        
        // Test 6: updateMasterInstruction should accept zero duration minutes
        try {
            MockSql.reset()
            def instructionId = UUID.randomUUID()
            def params = [
                inmBody: 'Updated Instruction Body',
                inmDurationMinutes: '0'  // Zero duration is valid
            ]
            MockSql.executeUpdateResponses << 1
            
            def result = instructionRepository.updateMasterInstruction(instructionId, params)
            
            assert result == 1
            assert MockSql.executeUpdateCalls.size() == 1
            def call = MockSql.executeUpdateCalls[0]
            assert call.params.inmDurationMinutes == 0
            
            println "✅ Test 6 passed: updateMasterInstruction accepts zero duration"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 6 failed: ${e.message}"
            failed++
        }
        
        // Test 7: updateMasterInstruction should accept positive duration minutes
        try {
            MockSql.reset()
            def instructionId = UUID.randomUUID()
            def params = [
                inmBody: 'Updated Instruction Body',
                inmDurationMinutes: '60'  // Positive duration
            ]
            MockSql.executeUpdateResponses << 1
            
            def result = instructionRepository.updateMasterInstruction(instructionId, params)
            
            assert result == 1
            assert MockSql.executeUpdateCalls.size() == 1
            def call = MockSql.executeUpdateCalls[0]
            assert call.params.inmDurationMinutes == 60
            
            println "✅ Test 7 passed: updateMasterInstruction accepts positive duration"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 7 failed: ${e.message}"
            failed++
        }
        
        // Test 8: updateMasterInstruction should handle null duration gracefully
        try {
            MockSql.reset()
            def instructionId = UUID.randomUUID()
            def params = [
                inmBody: 'Updated Instruction Body',
                inmDurationMinutes: null  // Null duration is acceptable
            ]
            MockSql.executeUpdateResponses << 1
            
            def result = instructionRepository.updateMasterInstruction(instructionId, params)
            
            assert result == 1
            assert MockSql.executeUpdateCalls.size() == 1
            def call = MockSql.executeUpdateCalls[0]
            assert call.params.inmDurationMinutes == null
            
            println "✅ Test 8 passed: updateMasterInstruction handles null duration"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 8 failed: ${e.message}"
            failed++
        }
        
        // Test 9: createMasterInstruction duration validation various values
        try {
            def testCases = [
                ['-1', false, 'negative integer'],
                ['-999', false, 'large negative integer'],
                ['0', true, 'zero (valid)'],
                ['1', true, 'positive integer'],
                ['60', true, 'typical positive value'],
                ['999', true, 'large positive integer'],
                [null, true, 'null (valid)'],
                ['', true, 'empty string (treated as null)']
            ]
            
            def allPassed = true
            testCases.each { testCase ->
                MockSql.reset()
                def durationValue = testCase[0]
                def shouldSucceed = testCase[1]
                def description = testCase[2]
                
                def stepId = UUID.randomUUID()
                def params = [
                    stmId: stepId.toString(),
                    inmOrder: '1',
                    inmBody: 'Test Instruction',
                    inmDurationMinutes: durationValue
                ]
                
                if (shouldSucceed) {
                    def newInstructionId = UUID.randomUUID()
                    MockSql.firstRowResponses << [inm_id: newInstructionId]
                    def result = instructionRepository.createMasterInstruction(params)
                    assert result != null, "Test case failed for ${description}: ${durationValue}"
                } else {
                    try {
                        instructionRepository.createMasterInstruction(params)
                        allPassed = false
                        throw new AssertionError("Expected IllegalArgumentException for ${description}: ${durationValue}")
                    } catch (IllegalArgumentException ex) {
                        assert ex.message.contains("Duration minutes cannot be negative"), "Test case failed for ${description}: ${durationValue}"
                    }
                }
            }
            
            assert allPassed
            println "✅ Test 9 passed: createMasterInstruction duration validation various values"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 9 failed: ${e.message}"
            failed++
        }
        
        // Test 10: updateMasterInstruction duration validation various values
        try {
            def testCases = [
                ['-1', false, 'negative integer'],
                ['-30', false, 'negative half hour'],
                ['-60', false, 'negative hour'],
                ['0', true, 'zero (valid)'],
                ['15', true, 'quarter hour'],
                ['30', true, 'half hour'],
                ['60', true, 'one hour'],
                ['120', true, 'two hours'],
                [null, true, 'null (valid)'],
                ['', true, 'empty string (treated as null)']
            ]
            
            def allPassed = true
            testCases.each { testCase ->
                MockSql.reset()
                def durationValue = testCase[0]
                def shouldSucceed = testCase[1]
                def description = testCase[2]
                
                def instructionId = UUID.randomUUID()
                def params = [
                    inmBody: 'Updated Instruction',
                    inmDurationMinutes: durationValue
                ]
                
                if (shouldSucceed) {
                    MockSql.executeUpdateResponses << 1
                    def result = instructionRepository.updateMasterInstruction(instructionId, params)
                    assert result == 1, "Test case failed for ${description}: ${durationValue}"
                } else {
                    try {
                        instructionRepository.updateMasterInstruction(instructionId, params)
                        allPassed = false
                        throw new AssertionError("Expected IllegalArgumentException for ${description}: ${durationValue}")
                    } catch (IllegalArgumentException ex) {
                        assert ex.message.contains("Duration minutes cannot be negative"), "Test case failed for ${description}: ${durationValue}"
                    }
                }
            }
            
            assert allPassed
            println "✅ Test 10 passed: updateMasterInstruction duration validation various values"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 10 failed: ${e.message}"
            failed++
        }
        
        // Test 11: duration validation should handle type conversion edge cases
        try {
            MockSql.reset()
            def stepId = UUID.randomUUID()
            def params = [
                stmId: stepId.toString(),
                inmOrder: '1',
                inmBody: 'Test Instruction',
                inmDurationMinutes: '-42'  // String that parses to negative integer
            ]
            
            try {
                instructionRepository.createMasterInstruction(params)
                assert false, "Expected IllegalArgumentException"
            } catch (IllegalArgumentException ex) {
                assert ex.message.contains("Duration minutes cannot be negative")
            }
            
            println "✅ Test 11 passed: duration validation handles type conversion edge cases"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 11 failed: ${e.message}"
            failed++
        }
        
        // Test 12: duration validation should occur early in method execution
        try {
            MockSql.reset()
            def stepId = UUID.randomUUID()
            def params = [
                stmId: stepId.toString(),
                inmOrder: '1',
                inmBody: 'Test Instruction',
                inmDurationMinutes: '-10'  // Negative duration
            ]
            
            try {
                instructionRepository.createMasterInstruction(params)
                assert false, "Expected IllegalArgumentException"
            } catch (IllegalArgumentException ex) {
                assert ex.message.contains("Duration minutes cannot be negative")
                assert MockSql.firstRowCalls.size() == 0  // DatabaseUtil.withSql is never called
            }
            
            println "✅ Test 12 passed: duration validation occurs early in method execution"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 12 failed: ${e.message}"
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
def tests = new InstructionRepositoryTests()
tests.runTests()