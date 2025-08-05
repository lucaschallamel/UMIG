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
 * Prerequisites:
 * - Spock Framework for testing
 * - Mock DatabaseUtil for SQL operations
 * 
 * Run from project root: ./src/groovy/umig/tests/run-unit-tests.sh
 */

@Grab('org.spockframework:spock-core:2.3-groovy-3.0')
@Grab('org.postgresql:postgresql:42.7.3')

import spock.lang.Specification
import spock.lang.Unroll
import umig.repository.InstructionRepository
import java.util.UUID
import java.sql.SQLException

class InstructionRepositoryNegativeDurationSpec extends Specification {
    
    InstructionRepository repository
    def mockSql
    
    def setup() {
        repository = new InstructionRepository()
        mockSql = Mock()
    }
    
    // ==================== NEGATIVE DURATION VALIDATION TESTS ====================
    
    def "createMasterInstruction should reject negative duration minutes"() {
        given: "instruction creation parameters with negative duration"
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction with Negative Duration',
            inmDurationMinutes: '-30'  // Negative duration
        ]
        
        when: "createMasterInstruction is called with negative duration"
        repository.createMasterInstruction(params)
        
        then: "throws IllegalArgumentException before SQL execution"
        def ex = thrown(IllegalArgumentException)
        ex.message.contains("Duration minutes cannot be negative")
        
        and: "no SQL queries are executed"
        0 * mockSql.firstRow(_, _)
    }
    
    def "createMasterInstruction should accept zero duration minutes"() {
        given: "instruction creation parameters with zero duration"
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction with Zero Duration',
            inmDurationMinutes: '0'  // Zero duration is valid
        ]
        def newInstructionId = UUID.randomUUID()
        def insertResult = [inm_id: newInstructionId]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "createMasterInstruction is called with zero duration"
        def result = repository.createMasterInstruction(params)
        
        then: "accepts zero duration and proceeds with creation"
        1 * mockSql.firstRow(_, { Map insertParams ->
            insertParams.inmDurationMinutes == 0
        }) >> insertResult
        
        and: "returns created instruction ID"
        result == newInstructionId
    }
    
    def "createMasterInstruction should accept positive duration minutes"() {
        given: "instruction creation parameters with positive duration"
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction with Positive Duration',
            inmDurationMinutes: '45'  // Positive duration
        ]
        def newInstructionId = UUID.randomUUID()
        def insertResult = [inm_id: newInstructionId]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "createMasterInstruction is called with positive duration"
        def result = repository.createMasterInstruction(params)
        
        then: "accepts positive duration and proceeds with creation"
        1 * mockSql.firstRow(_, { Map insertParams ->
            insertParams.inmDurationMinutes == 45
        }) >> insertResult
        
        and: "returns created instruction ID"
        result == newInstructionId
    }
    
    def "createMasterInstruction should handle null duration gracefully"() {
        given: "instruction creation parameters with null duration"
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction with Null Duration',
            inmDurationMinutes: null  // Null duration is acceptable
        ]
        def newInstructionId = UUID.randomUUID()
        def insertResult = [inm_id: newInstructionId]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "createMasterInstruction is called with null duration"
        def result = repository.createMasterInstruction(params)
        
        then: "accepts null duration and proceeds with creation"
        1 * mockSql.firstRow(_, { Map insertParams ->
            insertParams.inmDurationMinutes == null
        }) >> insertResult
        
        and: "returns created instruction ID"
        result == newInstructionId
    }
    
    def "updateMasterInstruction should reject negative duration minutes"() {
        given: "instruction ID and update parameters with negative duration"
        def instructionId = UUID.randomUUID()
        def params = [
            inmBody: 'Updated Instruction Body',
            inmDurationMinutes: '-15'  // Negative duration
        ]
        
        when: "updateMasterInstruction is called with negative duration"
        repository.updateMasterInstruction(instructionId, params)
        
        then: "throws IllegalArgumentException before SQL execution"
        def ex = thrown(IllegalArgumentException)
        ex.message.contains("Duration minutes cannot be negative")
        
        and: "no SQL queries are executed"
        0 * mockSql.executeUpdate(_, _)
    }
    
    def "updateMasterInstruction should accept zero duration minutes"() {
        given: "instruction ID and update parameters with zero duration"
        def instructionId = UUID.randomUUID()
        def params = [
            inmBody: 'Updated Instruction Body',
            inmDurationMinutes: '0'  // Zero duration is valid
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateMasterInstruction is called with zero duration"
        def result = repository.updateMasterInstruction(instructionId, params)
        
        then: "accepts zero duration and proceeds with update"
        1 * mockSql.executeUpdate(_, { Map updateParams ->
            updateParams.inmDurationMinutes == 0
        }) >> 1
        
        and: "returns affected rows count"
        result == 1
    }
    
    def "updateMasterInstruction should accept positive duration minutes"() {
        given: "instruction ID and update parameters with positive duration"
        def instructionId = UUID.randomUUID()
        def params = [
            inmBody: 'Updated Instruction Body',
            inmDurationMinutes: '60'  // Positive duration
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateMasterInstruction is called with positive duration"
        def result = repository.updateMasterInstruction(instructionId, params)
        
        then: "accepts positive duration and proceeds with update"
        1 * mockSql.executeUpdate(_, { Map updateParams ->
            updateParams.inmDurationMinutes == 60
        }) >> 1
        
        and: "returns affected rows count"
        result == 1
    }
    
    def "updateMasterInstruction should handle null duration gracefully"() {
        given: "instruction ID and update parameters with null duration"
        def instructionId = UUID.randomUUID()
        def params = [
            inmBody: 'Updated Instruction Body',
            inmDurationMinutes: null  // Null duration is acceptable
        ]
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "updateMasterInstruction is called with null duration"
        def result = repository.updateMasterInstruction(instructionId, params)
        
        then: "accepts null duration and proceeds with update"
        1 * mockSql.executeUpdate(_, { Map updateParams ->
            updateParams.inmDurationMinutes == null
        }) >> 1
        
        and: "returns affected rows count"
        result == 1
    }
    
    @Unroll
    def "createMasterInstruction should validate duration value: #durationValue (#description)"() {
        given: "instruction creation parameters with various duration values"
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction',
            inmDurationMinutes: durationValue
        ]
        
        and: "DatabaseUtil.withSql is mocked if needed"
        if (shouldSucceed) {
            def newInstructionId = UUID.randomUUID()
            def insertResult = [inm_id: newInstructionId]
            GroovyMock(umig.utils.DatabaseUtil, global: true)
            umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
            mockSql.firstRow(_, _) >> insertResult
        }
        
        when: "createMasterInstruction is called"
        if (shouldSucceed) {
            def result = repository.createMasterInstruction(params)
            assert result != null
        } else {
            repository.createMasterInstruction(params)
        }
        
        then: "validates duration appropriately"
        if (shouldSucceed) {
            notThrown(IllegalArgumentException)
        } else {
            def ex = thrown(IllegalArgumentException)
            ex.message.contains("Duration minutes cannot be negative")
        }
        
        where:
        durationValue | shouldSucceed | description
        '-1'         | false         | 'negative integer'
        '-999'       | false         | 'large negative integer'
        '-0.5'       | false         | 'negative decimal (if supported)'
        '0'          | true          | 'zero (valid)'
        '1'          | true          | 'positive integer'
        '60'         | true          | 'typical positive value'
        '999'        | true          | 'large positive integer'
        null         | true          | 'null (valid)'
        ''           | true          | 'empty string (treated as null)'
    }
    
    @Unroll
    def "updateMasterInstruction should validate duration value: #durationValue (#description)"() {
        given: "instruction ID and update parameters with various duration values"
        def instructionId = UUID.randomUUID()
        def params = [
            inmBody: 'Updated Instruction',
            inmDurationMinutes: durationValue
        ]
        
        and: "DatabaseUtil.withSql is mocked if needed"
        if (shouldSucceed) {
            GroovyMock(umig.utils.DatabaseUtil, global: true)
            umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
            mockSql.executeUpdate(_, _) >> 1
        }
        
        when: "updateMasterInstruction is called"
        if (shouldSucceed) {
            def result = repository.updateMasterInstruction(instructionId, params)
            assert result == 1
        } else {
            repository.updateMasterInstruction(instructionId, params)
        }
        
        then: "validates duration appropriately"
        if (shouldSucceed) {
            notThrown(IllegalArgumentException)
        } else {
            def ex = thrown(IllegalArgumentException)
            ex.message.contains("Duration minutes cannot be negative")
        }
        
        where:
        durationValue | shouldSucceed | description
        '-1'         | false         | 'negative integer'
        '-30'        | false         | 'negative half hour'
        '-60'        | false         | 'negative hour'
        '0'          | true          | 'zero (valid)'
        '15'         | true          | 'quarter hour'
        '30'         | true          | 'half hour'
        '60'         | true          | 'one hour'
        '120'        | true          | 'two hours'
        null         | true          | 'null (valid)'
        ''           | true          | 'empty string (treated as null)'
    }
    
    def "duration validation should handle type conversion edge cases"() {
        given: "instruction creation parameters with string that converts to negative integer"
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction',
            inmDurationMinutes: '-42'  // String that parses to negative integer
        ]
        
        when: "createMasterInstruction is called"
        repository.createMasterInstruction(params)
        
        then: "detects negative value after type conversion"
        def ex = thrown(IllegalArgumentException)
        ex.message.contains("Duration minutes cannot be negative")
    }
    
    def "duration validation should occur early in method execution"() {
        given: "instruction creation parameters with negative duration"
        def stepId = UUID.randomUUID()
        def params = [
            stmId: stepId.toString(),
            inmOrder: '1',
            inmBody: 'Test Instruction',
            inmDurationMinutes: '-10'  // Negative duration
        ]
        
        and: "DatabaseUtil.withSql is mocked to verify it's never called"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        
        when: "createMasterInstruction is called"
        repository.createMasterInstruction(params)
        
        then: "throws IllegalArgumentException before any database operations"
        thrown(IllegalArgumentException)
        
        and: "DatabaseUtil.withSql is never called"
        0 * umig.utils.DatabaseUtil.withSql(_)
    }
}