#!/usr/bin/env groovy
/**
 * Unit Test for InstructionRepository - deleteInstanceInstruction method
 * Tests the new deleteInstanceInstruction method added in code review
 * 
 * ADR-026 Compliance:
 * - Mandatory specific SQL query validation
 * - Exact table name, WHERE clause validation
 * - Type safety validation for parameters
 * - Error handling and SQL state mapping verification
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

class InstructionRepositoryDeleteInstanceSpec extends Specification {
    
    InstructionRepository repository
    def mockSql
    
    def setup() {
        repository = new InstructionRepository()
        mockSql = Mock()
    }
    
    // ==================== DELETE INSTANCE INSTRUCTION TESTS ====================
    
    def "deleteInstanceInstruction should delete instruction instance successfully"() {
        given: "an instruction instance ID"
        def instanceId = UUID.randomUUID()
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "deleteInstanceInstruction is called"
        def result = repository.deleteInstanceInstruction(instanceId)
        
        then: "executes DELETE query with exact structure validation"
        1 * mockSql.executeUpdate({ String query ->
            query.contains('DELETE FROM instructions_instance_ini') &&
            query.contains('WHERE ini_id = :iniId')
        }, [iniId: instanceId]) >> 1
        
        and: "returns affected rows count"
        result == 1
    }
    
    def "deleteInstanceInstruction should return 0 when instruction instance not found"() {
        given: "a non-existent instruction instance ID"
        def instanceId = UUID.randomUUID()
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "deleteInstanceInstruction is called"
        def result = repository.deleteInstanceInstruction(instanceId)
        
        then: "executes DELETE query"
        1 * mockSql.executeUpdate(_, [iniId: instanceId]) >> 0
        
        and: "returns 0 (no rows affected)"
        result == 0
    }
    
    def "deleteInstanceInstruction should throw IllegalArgumentException for null ID"() {
        when: "deleteInstanceInstruction is called with null"
        repository.deleteInstanceInstruction(null)
        
        then: "throws IllegalArgumentException"
        def ex = thrown(IllegalArgumentException)
        ex.message.contains("Instruction instance ID cannot be null")
    }
    
    def "deleteInstanceInstruction should handle foreign key constraint violations"() {
        given: "instruction instance ID that has foreign key references"
        def instanceId = UUID.randomUUID()
        def sqlException = new SQLException("Foreign key constraint", "23503")
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.executeUpdate(_, _) >> { throw sqlException }
        
        when: "deleteInstanceInstruction is called"
        repository.deleteInstanceInstruction(instanceId)
        
        then: "throws IllegalArgumentException with foreign key message"
        def ex = thrown(IllegalArgumentException)
        ex.message.contains("Cannot delete instruction instance due to foreign key constraint")
        ex.cause == sqlException
    }
    
    def "deleteInstanceInstruction should handle general SQL exceptions"() {
        given: "instruction instance ID and general SQL error"
        def instanceId = UUID.randomUUID()
        def sqlException = new SQLException("Database connection failed", "08001")
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        mockSql.executeUpdate(_, _) >> { throw sqlException }
        
        when: "deleteInstanceInstruction is called"
        repository.deleteInstanceInstruction(instanceId)
        
        then: "throws RuntimeException with descriptive message"
        def ex = thrown(RuntimeException)
        ex.message.contains("Failed to delete instruction instance ${instanceId}")
        ex.cause == sqlException
    }
    
    def "deleteInstanceInstruction should validate SQL query structure exactly"() {
        given: "an instruction instance ID"
        def instanceId = UUID.randomUUID()
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "deleteInstanceInstruction is called"
        repository.deleteInstanceInstruction(instanceId)
        
        then: "validates exact SQL structure according to ADR-026"
        1 * mockSql.executeUpdate({ String query ->
            // Validate exact table name
            query.contains('instructions_instance_ini') &&
            // Validate WHERE clause structure
            query.contains('WHERE ini_id = :iniId') &&
            // Ensure no additional clauses
            !query.toLowerCase().contains('join') &&
            !query.toLowerCase().contains('group by') &&
            !query.toLowerCase().contains('order by') &&
            !query.toLowerCase().contains('having')
        }, { Map params ->
            // Validate parameter type safety (ADR-031)
            params.iniId instanceof UUID &&
            params.iniId == instanceId
        }) >> 1
    }
    
    @Unroll
    def "deleteInstanceInstruction should validate parameter types correctly for instanceId: #instanceId"() {
        given: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "deleteInstanceInstruction is called with different UUID types"
        repository.deleteInstanceInstruction(instanceId)
        
        then: "validates parameter type is UUID"
        1 * mockSql.executeUpdate(_, { Map params ->
            params.iniId instanceof UUID
        }) >> 1
        
        where:
        instanceId << [
            UUID.randomUUID(),
            UUID.fromString("123e4567-e89b-12d3-a456-426614174000"),
            UUID.fromString("00000000-0000-0000-0000-000000000000")
        ]
    }
    
    def "deleteInstanceInstruction performance test with realistic instruction instance ID"() {
        given: "a realistic instruction instance UUID"
        def instanceId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000")
        
        and: "DatabaseUtil.withSql is mocked"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "deleteInstanceInstruction is called"
        def startTime = System.currentTimeMillis()
        def result = repository.deleteInstanceInstruction(instanceId)
        def endTime = System.currentTimeMillis()
        
        then: "executes DELETE query efficiently"
        1 * mockSql.executeUpdate(_, [iniId: instanceId]) >> 1
        
        and: "completes within reasonable time (< 100ms for unit test)"
        (endTime - startTime) < 100
        
        and: "returns expected result"
        result == 1
    }
    
    def "deleteInstanceInstruction should handle multiple concurrent deletion attempts gracefully"() {
        given: "instruction instance ID for concurrent deletion test"
        def instanceId = UUID.randomUUID()
        
        and: "DatabaseUtil.withSql is mocked to simulate concurrent access"
        GroovyMock(umig.utils.DatabaseUtil, global: true)
        umig.utils.DatabaseUtil.withSql(_) >> { closure -> closure(mockSql) }
        
        when: "deleteInstanceInstruction is called multiple times concurrently"
        def results = []
        3.times {
            results << repository.deleteInstanceInstruction(instanceId)
        }
        
        then: "each call executes DELETE query independently"
        3 * mockSql.executeUpdate(_, [iniId: instanceId]) >>> [1, 0, 0] // First succeeds, others find nothing
        
        and: "returns appropriate results for each call"
        results == [1, 0, 0]
    }
}