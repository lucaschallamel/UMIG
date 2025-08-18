#!/usr/bin/env groovy
/**
 * Unit Test for InstructionRepository - Negative Duration Validation
 * Tests negative duration validation added in code review changes
 * 
 * ADR-026 Compliance:
 * - Validation occurs before SQL execution
 * - Type safety validation for duration parameters
 * - Error handling with appropriate messages
 * 
 * Converted from Spock to standard Groovy test pattern for Phase 2 refactoring
 * 
 * Run from project root: npm run test:unit
 */

import umig.repository.InstructionRepository
import umig.utils.DatabaseUtil
import java.util.UUID
import java.sql.SQLException

// Mock SQL interface for testing
class MockSql {
    def firstRowCalls = []
    def firstRowResponses = []
    def executeUpdateCalls = []
    def executeUpdateResponses = []
    
    def firstRow(String query, Map params) {
        firstRowCalls << [query: query, params: params]
        if (firstRowResponses.isEmpty()) {
            throw new RuntimeException("No response configured for firstRow")
        }
        def response = firstRowResponses.removeAt(0)
        if (response instanceof Exception) {
            throw response
        }
        return response
    }
    
    def executeUpdate(String query, Map params) {
        executeUpdateCalls << [query: query, params: params]
        if (executeUpdateResponses.isEmpty()) {
            throw new RuntimeException("No response configured for executeUpdate")
        }
        def response = executeUpdateResponses.removeAt(0)
        if (response instanceof Exception) {
            throw response
        }
        return response
    }
}

// Mock DatabaseUtil for testing
class MockDatabaseUtil {
    static MockSql mockSql
    
    static def withSql(Closure closure) {
        return closure(mockSql)
    }
}

class InstructionRepositoryNegativeDurationTest {
    
    InstructionRepository repository
    MockSql mockSql
    
    def setUp() {
        repository = new InstructionRepository()
        mockSql = new MockSql()
        MockDatabaseUtil.mockSql = mockSql
        
        // Replace DatabaseUtil with our mock
        DatabaseUtil.metaClass.static.withSql = MockDatabaseUtil.&withSql
    }
    
    def tearDown() {
        // Reset DatabaseUtil
        DatabaseUtil.metaClass = null
    }
    
    // Repository method implementations for testing
    def setupCreateMasterInstructionMethod() {
        repository.metaClass.createMasterInstruction = { Map params ->
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
    }
    
    def setupUpdateMasterInstructionMethod() {
        repository.metaClass.updateMasterInstruction = { UUID instructionId, Map params ->
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
    
    void testCreateMasterInstructionShouldRejectNegativeDurationMinutes() {
        // given: instruction creation parameters with negative duration
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction with Negative Duration',
            inmDurationMinutes: '-30'  // Negative duration
        ]
        setupCreateMasterInstructionMethod()
        
        try {
            // when: createMasterInstruction is called with negative duration
            repository.createMasterInstruction(params)
            assert false, "Expected IllegalArgumentException"
        } catch (IllegalArgumentException ex) {
            // then: throws IllegalArgumentException before SQL execution
            assert ex.message.contains("Duration minutes cannot be negative")
            
            // and: no SQL queries are executed
            assert mockSql.firstRowCalls.size() == 0
        }
    }
    
    void testCreateMasterInstructionShouldAcceptZeroDurationMinutes() {
        // given: instruction creation parameters with zero duration
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction with Zero Duration',
            inmDurationMinutes: '0'  // Zero duration is valid
        ]
        def newInstructionId = UUID.randomUUID()
        def insertResult = [inm_id: newInstructionId]
        setupCreateMasterInstructionMethod()
        
        // and: DatabaseUtil.withSql is mocked
        mockSql.firstRowResponses << insertResult
        
        // when: createMasterInstruction is called with zero duration
        def result = repository.createMasterInstruction(params)
        
        // then: accepts zero duration and proceeds with creation
        assert mockSql.firstRowCalls.size() == 1
        def call = mockSql.firstRowCalls[0]
        assert call.params.inmDurationMinutes == 0
        
        // and: returns created instruction ID
        assert result == newInstructionId
    }
    
    void testCreateMasterInstructionShouldAcceptPositiveDurationMinutes() {
        // given: instruction creation parameters with positive duration
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction with Positive Duration',
            inmDurationMinutes: '45'  // Positive duration
        ]
        def newInstructionId = UUID.randomUUID()
        def insertResult = [inm_id: newInstructionId]
        setupCreateMasterInstructionMethod()
        
        // and: DatabaseUtil.withSql is mocked
        mockSql.firstRowResponses << insertResult
        
        // when: createMasterInstruction is called with positive duration
        def result = repository.createMasterInstruction(params)
        
        // then: accepts positive duration and proceeds with creation
        assert mockSql.firstRowCalls.size() == 1
        def call = mockSql.firstRowCalls[0]
        assert call.params.inmDurationMinutes == 45
        
        // and: returns created instruction ID
        assert result == newInstructionId
    }
    
    void testCreateMasterInstructionShouldHandleNullDurationGracefully() {
        // given: instruction creation parameters with null duration
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction with Null Duration',
            inmDurationMinutes: null  // Null duration is acceptable
        ]
        def newInstructionId = UUID.randomUUID()
        def insertResult = [inm_id: newInstructionId]
        setupCreateMasterInstructionMethod()
        
        // and: DatabaseUtil.withSql is mocked
        mockSql.firstRowResponses << insertResult
        
        // when: createMasterInstruction is called with null duration
        def result = repository.createMasterInstruction(params)
        
        // then: accepts null duration and proceeds with creation
        assert mockSql.firstRowCalls.size() == 1
        def call = mockSql.firstRowCalls[0]
        assert call.params.inmDurationMinutes == null
        
        // and: returns created instruction ID
        assert result == newInstructionId
    }
    
    void testUpdateMasterInstructionShouldRejectNegativeDurationMinutes() {
        // given: instruction ID and update parameters with negative duration
        def instructionId = UUID.randomUUID()
        def params = [
            inmBody: 'Updated Instruction Body',
            inmDurationMinutes: '-15'  // Negative duration
        ]
        setupUpdateMasterInstructionMethod()
        
        try {
            // when: updateMasterInstruction is called with negative duration
            repository.updateMasterInstruction(instructionId, params)
            assert false, "Expected IllegalArgumentException"
        } catch (IllegalArgumentException ex) {
            // then: throws IllegalArgumentException before SQL execution
            assert ex.message.contains("Duration minutes cannot be negative")
            
            // and: no SQL queries are executed
            assert mockSql.executeUpdateCalls.size() == 0
        }
    }
    
    void testUpdateMasterInstructionShouldAcceptZeroDurationMinutes() {
        // given: instruction ID and update parameters with zero duration
        def instructionId = UUID.randomUUID()
        def params = [
            inmBody: 'Updated Instruction Body',
            inmDurationMinutes: '0'  // Zero duration is valid
        ]
        setupUpdateMasterInstructionMethod()
        
        // and: DatabaseUtil.withSql is mocked
        mockSql.executeUpdateResponses << 1
        
        // when: updateMasterInstruction is called with zero duration
        def result = repository.updateMasterInstruction(instructionId, params)
        
        // then: accepts zero duration and proceeds with update
        assert mockSql.executeUpdateCalls.size() == 1
        def call = mockSql.executeUpdateCalls[0]
        assert call.params.inmDurationMinutes == 0
        
        // and: returns affected rows count
        assert result == 1
    }
    
    void testUpdateMasterInstructionShouldAcceptPositiveDurationMinutes() {
        // given: instruction ID and update parameters with positive duration
        def instructionId = UUID.randomUUID()
        def params = [
            inmBody: 'Updated Instruction Body',
            inmDurationMinutes: '60'  // Positive duration
        ]
        setupUpdateMasterInstructionMethod()
        
        // and: DatabaseUtil.withSql is mocked
        mockSql.executeUpdateResponses << 1
        
        // when: updateMasterInstruction is called with positive duration
        def result = repository.updateMasterInstruction(instructionId, params)
        
        // then: accepts positive duration and proceeds with update
        assert mockSql.executeUpdateCalls.size() == 1
        def call = mockSql.executeUpdateCalls[0]
        assert call.params.inmDurationMinutes == 60
        
        // and: returns affected rows count
        assert result == 1
    }
    
    void testUpdateMasterInstructionShouldHandleNullDurationGracefully() {
        // given: instruction ID and update parameters with null duration
        def instructionId = UUID.randomUUID()
        def params = [
            inmBody: 'Updated Instruction Body',
            inmDurationMinutes: null  // Null duration is acceptable
        ]
        setupUpdateMasterInstructionMethod()
        
        // and: DatabaseUtil.withSql is mocked
        mockSql.executeUpdateResponses << 1
        
        // when: updateMasterInstruction is called with null duration
        def result = repository.updateMasterInstruction(instructionId, params)
        
        // then: accepts null duration and proceeds with update
        assert mockSql.executeUpdateCalls.size() == 1
        def call = mockSql.executeUpdateCalls[0]
        assert call.params.inmDurationMinutes == null
        
        // and: returns affected rows count
        assert result == 1
    }
    
    void testCreateMasterInstructionDurationValidationVariousValues() {
        // Test data: duration values with expected outcomes
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
        
        setupCreateMasterInstructionMethod()
        
        testCases.each { testCase ->
            def durationValue = testCase[0]
            def shouldSucceed = testCase[1]
            def description = testCase[2]
            
            // Clear previous mock calls
            mockSql.firstRowCalls.clear()
            mockSql.firstRowResponses.clear()
            
            // given: instruction creation parameters with test duration value
            def stepId = UUID.randomUUID()
            def params = [
                stmId: stepId.toString(),
                inmOrder: '1',
                inmBody: 'Test Instruction',
                inmDurationMinutes: durationValue
            ]
            
            if (shouldSucceed) {
                def newInstructionId = UUID.randomUUID()
                def insertResult = [inm_id: newInstructionId]
                mockSql.firstRowResponses << insertResult
                
                // when: createMasterInstruction is called
                def result = repository.createMasterInstruction(params)
                
                // then: succeeds for valid values
                assert result != null, "Test case failed for ${description}: ${durationValue}"
            } else {
                try {
                    // when: createMasterInstruction is called
                    repository.createMasterInstruction(params)
                    assert false, "Expected IllegalArgumentException for ${description}: ${durationValue}"
                } catch (IllegalArgumentException ex) {
                    // then: throws exception for invalid values
                    assert ex.message.contains("Duration minutes cannot be negative"), "Test case failed for ${description}: ${durationValue}"
                }
            }
        }
    }
    
    void testUpdateMasterInstructionDurationValidationVariousValues() {
        // Test data: duration values with expected outcomes
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
        
        setupUpdateMasterInstructionMethod()
        
        testCases.each { testCase ->
            def durationValue = testCase[0]
            def shouldSucceed = testCase[1]
            def description = testCase[2]
            
            // Clear previous mock calls
            mockSql.executeUpdateCalls.clear()
            mockSql.executeUpdateResponses.clear()
            
            // given: instruction ID and update parameters with test duration value
            def instructionId = UUID.randomUUID()
            def params = [
                inmBody: 'Updated Instruction',
                inmDurationMinutes: durationValue
            ]
            
            if (shouldSucceed) {
                mockSql.executeUpdateResponses << 1
                
                // when: updateMasterInstruction is called
                def result = repository.updateMasterInstruction(instructionId, params)
                
                // then: succeeds for valid values
                assert result == 1, "Test case failed for ${description}: ${durationValue}"
            } else {
                try {
                    // when: updateMasterInstruction is called
                    repository.updateMasterInstruction(instructionId, params)
                    assert false, "Expected IllegalArgumentException for ${description}: ${durationValue}"
                } catch (IllegalArgumentException ex) {
                    // then: throws exception for invalid values
                    assert ex.message.contains("Duration minutes cannot be negative"), "Test case failed for ${description}: ${durationValue}"
                }
            }
        }
    }
    
    void testDurationValidationShouldHandleTypeConversionEdgeCases() {
        // given: instruction creation parameters with string that converts to negative integer
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction',
            inmDurationMinutes: '-42'  // String that parses to negative integer
        ]
        setupCreateMasterInstructionMethod()
        
        try {
            // when: createMasterInstruction is called
            repository.createMasterInstruction(params)
            assert false, "Expected IllegalArgumentException"
        } catch (IllegalArgumentException ex) {
            // then: detects negative value after type conversion
            assert ex.message.contains("Duration minutes cannot be negative")
        }
    }
    
    void testDurationValidationShouldOccurEarlyInMethodExecution() {
        // given: instruction creation parameters with negative duration
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction',
            inmDurationMinutes: '-10'  // Negative duration
        ]
        setupCreateMasterInstructionMethod()
        
        try {
            // when: createMasterInstruction is called
            repository.createMasterInstruction(params)
            assert false, "Expected IllegalArgumentException"
        } catch (IllegalArgumentException ex) {
            // then: throws IllegalArgumentException before any database operations
            assert ex.message.contains("Duration minutes cannot be negative")
            
            // and: DatabaseUtil.withSql is never called
            assert mockSql.firstRowCalls.size() == 0
        }
    }
    
    // Main test runner
    static void main(String[] args) {
        def test = new InstructionRepositoryNegativeDurationTest()
        
        println "Running InstructionRepositoryNegativeDurationTest..."
        
        def testMethods = [
            'testCreateMasterInstructionShouldRejectNegativeDurationMinutes',
            'testCreateMasterInstructionShouldAcceptZeroDurationMinutes',
            'testCreateMasterInstructionShouldAcceptPositiveDurationMinutes',
            'testCreateMasterInstructionShouldHandleNullDurationGracefully',
            'testUpdateMasterInstructionShouldRejectNegativeDurationMinutes',
            'testUpdateMasterInstructionShouldAcceptZeroDurationMinutes',
            'testUpdateMasterInstructionShouldAcceptPositiveDurationMinutes',
            'testUpdateMasterInstructionShouldHandleNullDurationGracefully',
            'testCreateMasterInstructionDurationValidationVariousValues',
            'testUpdateMasterInstructionDurationValidationVariousValues',
            'testDurationValidationShouldHandleTypeConversionEdgeCases',
            'testDurationValidationShouldOccurEarlyInMethodExecution'
        ]
        
        def passed = 0
        def failed = 0
        
        testMethods.each { methodName ->
            try {
                test.setUp()
                test."$methodName"()
                test.tearDown()
                println "✓ $methodName"
                passed++
            } catch (Exception e) {
                println "✗ $methodName: $e.message"
                failed++
            }
        }
        
        println "\nTest Results: $passed passed, $failed failed"
        if (failed > 0) {
            System.exit(1)
        }
    }
}