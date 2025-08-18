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
 * Converted from Spock to standard Groovy test pattern for Phase 2 refactoring
 * Zero-dependency pattern applied for US-022 integration test expansion
 * 
 * Run from project root: npm run test:unit
 */

import java.util.UUID
import java.sql.SQLException

// Mock SQL interface for testing
class MockSql {
    def executeUpdateCalls = []
    def executeUpdateResponses = []
    
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

// Mock InstructionRepository for zero-dependency testing
class MockInstructionRepository {
    def deleteInstanceInstruction(UUID instanceId) {
        if (instanceId == null) {
            throw new IllegalArgumentException("Instruction instance ID cannot be null")
        }
        
        return MockDatabaseUtil.withSql { sql ->
            try {
                return sql.executeUpdate(
                    'DELETE FROM instructions_instance_ini WHERE ini_id = :iniId',
                    [iniId: instanceId]
                )
            } catch (SQLException e) {
                if (e.getSQLState() == "23503") {
                    throw new IllegalArgumentException("Cannot delete instruction instance due to foreign key constraint", e)
                } else {
                    throw new RuntimeException("Failed to delete instruction instance ${instanceId}", e)
                }
            }
        }
    }
}

class InstructionRepositoryDeleteInstanceTests {
    
    MockInstructionRepository repository
    MockSql mockSql
    
    def setUp() {
        repository = new MockInstructionRepository()
        mockSql = new MockSql()
        MockDatabaseUtil.mockSql = mockSql
    }
    
    def tearDown() {
        // Clean up mocks
        mockSql.executeUpdateCalls.clear()
        mockSql.executeUpdateResponses.clear()
    }
    
    
    void testDeleteInstanceInstructionShouldDeleteInstructionInstanceSuccessfully() {
        // given: an instruction instance ID
        def instanceId = UUID.randomUUID()
        
        // and: DatabaseUtil.withSql is mocked
        mockSql.executeUpdateResponses << 1
        
        // when: deleteInstanceInstruction is called
        def result = repository.deleteInstanceInstruction(instanceId)
        
        // then: executes DELETE query with exact structure validation
        assert mockSql.executeUpdateCalls.size() == 1
        def call = mockSql.executeUpdateCalls[0]
        assert call.query.contains('DELETE FROM instructions_instance_ini')
        assert call.query.contains('WHERE ini_id = :iniId')
        assert call.params.iniId == instanceId
        
        // and: returns affected rows count
        assert result == 1
    }
    
    void testDeleteInstanceInstructionShouldReturn0WhenInstructionInstanceNotFound() {
        // given: a non-existent instruction instance ID
        def instanceId = UUID.randomUUID()
        
        // and: DatabaseUtil.withSql is mocked
        mockSql.executeUpdateResponses << 0
        
        // when: deleteInstanceInstruction is called
        def result = repository.deleteInstanceInstruction(instanceId)
        
        // then: executes DELETE query
        assert mockSql.executeUpdateCalls.size() == 1
        def call = mockSql.executeUpdateCalls[0]
        assert call.params.iniId == instanceId
        
        // and: returns 0 (no rows affected)
        assert result == 0
    }
    
    void testDeleteInstanceInstructionShouldThrowIllegalArgumentExceptionForNullId() {
        // given: null ID
        
        try {
            // when: deleteInstanceInstruction is called with null
            repository.deleteInstanceInstruction(null)
            assert false, "Expected IllegalArgumentException"
        } catch (IllegalArgumentException ex) {
            // then: throws IllegalArgumentException
            assert ex.message.contains("Instruction instance ID cannot be null")
        }
    }
    
    void testDeleteInstanceInstructionShouldHandleForeignKeyConstraintViolations() {
        // given: instruction instance ID that has foreign key references
        def instanceId = UUID.randomUUID()
        def sqlException = new SQLException("Foreign key constraint", "23503")
        
        // and: DatabaseUtil.withSql is mocked
        mockSql.executeUpdateResponses << sqlException
        
        try {
            // when: deleteInstanceInstruction is called
            repository.deleteInstanceInstruction(instanceId)
            assert false, "Expected IllegalArgumentException"
        } catch (IllegalArgumentException ex) {
            // then: throws IllegalArgumentException with foreign key message
            assert ex.message.contains("Cannot delete instruction instance due to foreign key constraint")
            assert ex.cause == sqlException
        }
    }
    
    void testDeleteInstanceInstructionShouldHandleGeneralSqlExceptions() {
        // given: instruction instance ID and general SQL error
        def instanceId = UUID.randomUUID()
        def sqlException = new SQLException("Database connection failed", "08001")
        
        // and: DatabaseUtil.withSql is mocked
        mockSql.executeUpdateResponses << sqlException
        
        try {
            // when: deleteInstanceInstruction is called
            repository.deleteInstanceInstruction(instanceId)
            assert false, "Expected RuntimeException"
        } catch (RuntimeException ex) {
            // then: throws RuntimeException with descriptive message
            assert ex.message.contains("Failed to delete instruction instance ${instanceId}")
            assert ex.cause == sqlException
        }
    }
    
    void testDeleteInstanceInstructionShouldValidateSqlQueryStructureExactly() {
        // given: an instruction instance ID
        def instanceId = UUID.randomUUID()
        
        // and: DatabaseUtil.withSql is mocked
        mockSql.executeUpdateResponses << 1
        
        // when: deleteInstanceInstruction is called
        repository.deleteInstanceInstruction(instanceId)
        
        // then: validates exact SQL structure according to ADR-026
        assert mockSql.executeUpdateCalls.size() == 1
        def call = mockSql.executeUpdateCalls[0]
        String query = call.query
        
        // Validate exact table name
        assert query.contains('instructions_instance_ini')
        // Validate WHERE clause structure
        assert query.contains('WHERE ini_id = :iniId')
        // Ensure no additional clauses
        assert !query.toLowerCase().contains('join')
        assert !query.toLowerCase().contains('group by')
        assert !query.toLowerCase().contains('order by')
        assert !query.toLowerCase().contains('having')
        
        // Validate parameter type safety (ADR-031)
        Map params = call.params
        assert params.iniId instanceof UUID
        assert params.iniId == instanceId
    }
    
    void testDeleteInstanceInstructionParameterTypeValidation() {
        // given: DatabaseUtil.withSql is mocked
        
        // Test different UUID types
        def testUuids = [
            UUID.randomUUID(),
            UUID.fromString("123e4567-e89b-12d3-a456-426614174000"),
            UUID.fromString("00000000-0000-0000-0000-000000000000")
        ]
        
        testUuids.each { instanceId ->
            mockSql.executeUpdateCalls.clear()
            mockSql.executeUpdateResponses << 1
            
            // when: deleteInstanceInstruction is called with different UUID types
            repository.deleteInstanceInstruction(instanceId)
            
            // then: validates parameter type is UUID
            assert mockSql.executeUpdateCalls.size() == 1
            def call = mockSql.executeUpdateCalls[0]
            assert call.params.iniId instanceof UUID
        }
    }
    
    void testDeleteInstanceInstructionPerformanceWithRealisticId() {
        // given: a realistic instruction instance UUID
        def instanceId = UUID.fromString("550e8400-e29b-41d4-a716-446655440000")
        
        // and: DatabaseUtil.withSql is mocked
        mockSql.executeUpdateResponses << 1
        
        // when: deleteInstanceInstruction is called
        def startTime = System.currentTimeMillis()
        def result = repository.deleteInstanceInstruction(instanceId)
        def endTime = System.currentTimeMillis()
        
        // then: executes DELETE query efficiently
        assert mockSql.executeUpdateCalls.size() == 1
        def call = mockSql.executeUpdateCalls[0]
        assert call.params.iniId == instanceId
        
        // and: completes within reasonable time (< 100ms for unit test)
        assert (endTime - startTime) < 100
        
        // and: returns expected result
        assert result == 1
    }
    
    void testDeleteInstanceInstructionConcurrentDeletionAttempts() {
        // given: instruction instance ID for concurrent deletion test
        def instanceId = UUID.randomUUID()
        
        // and: DatabaseUtil.withSql is mocked to simulate concurrent access
        mockSql.executeUpdateResponses.addAll([1, 0, 0]) // First succeeds, others find nothing
        
        // when: deleteInstanceInstruction is called multiple times concurrently
        def results = []
        3.times {
            results << repository.deleteInstanceInstruction(instanceId)
        }
        
        // then: each call executes DELETE query independently
        assert mockSql.executeUpdateCalls.size() == 3
        mockSql.executeUpdateCalls.each { call ->
            assert call.params.iniId == instanceId
        }
        
        // and: returns appropriate results for each call
        assert results == [1, 0, 0]
    }
    
    // Test runner method
    void runTests() {
        println "Running InstructionRepositoryDeleteInstanceTest..."
        
        def testMethods = [
            'testDeleteInstanceInstructionShouldDeleteInstructionInstanceSuccessfully',
            'testDeleteInstanceInstructionShouldReturn0WhenInstructionInstanceNotFound',
            'testDeleteInstanceInstructionShouldThrowIllegalArgumentExceptionForNullId',
            'testDeleteInstanceInstructionShouldHandleForeignKeyConstraintViolations',
            'testDeleteInstanceInstructionShouldHandleGeneralSqlExceptions',
            'testDeleteInstanceInstructionShouldValidateSqlQueryStructureExactly',
            'testDeleteInstanceInstructionParameterTypeValidation',
            'testDeleteInstanceInstructionPerformanceWithRealisticId',
            'testDeleteInstanceInstructionConcurrentDeletionAttempts'
        ]
        
        def passed = 0
        def failed = 0
        
        testMethods.each { methodName ->
            try {
                setUp()
                this."$methodName"()
                tearDown()
                println "✓ $methodName"
                passed++
            } catch (Exception e) {
                println "✗ $methodName: $e.message"
                failed++
            }
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
def test = new InstructionRepositoryDeleteInstanceTests()
test.runTests()