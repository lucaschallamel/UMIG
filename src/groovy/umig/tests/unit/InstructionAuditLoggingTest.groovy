/**
 * Standalone test for Instruction Audit Logging implementation
 * Tests the integration between InstructionRepository and AuditLogRepository
 * 
 * Validates US-036 requirement: Create EVENT records in audit_log_aud for instruction completion/incompletion
 * 
 * Run from project root: groovy src/groovy/umig/tests/unit/InstructionAuditLoggingTest.groovy
 */

import java.util.UUID
import java.sql.SQLException

// ==================== MOCK CLASSES ====================

/**
 * Mock SQL class that simulates database operations
 * Tracks calls for both instruction updates and audit logging
 */
class MockSql {
    def mockResults = [:]
    def capturedCalls = []
    def queryCaptured = null
    def paramsCaptured = null
    def methodCalled = null
    
    def firstRow(String query, Map params = [:]) {
        recordCall('firstRow', query, params)
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'firstRow'
        return mockResults['firstRow']
    }
    
    def executeUpdate(String query, Map params = [:]) {
        recordCall('executeUpdate', query, params)
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'executeUpdate'
        return mockResults['executeUpdate'] ?: 1
    }
    
    def execute(String query, List params = []) {
        recordCall('execute', query, params)
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'execute'
        return mockResults['execute'] ?: true
    }
    
    def withTransaction(Closure closure) {
        return closure()
    }
    
    def setMockResult(String method, Object result) {
        mockResults[method] = result
    }
    
    def recordCall(String method, String query, Object params) {
        capturedCalls << [
            method: method,
            query: query,
            params: params,
            timestamp: new Date()
        ]
    }
    
    def getCapturedAuditCalls() {
        return capturedCalls.findAll { call -> 
            call.query.contains('audit_log_aud') 
        }
    }
    
    def getCapturedInstructionCalls() {
        return capturedCalls.findAll { call -> 
            call.query.contains('instructions_instance_ini') 
        }
    }
    
    def reset() {
        capturedCalls.clear()
        mockResults.clear()
        queryCaptured = null
        paramsCaptured = null
        methodCalled = null
    }
}

/**
 * Mock DatabaseUtil for testing
 */
class DatabaseUtil {
    static MockSql mockSql = new MockSql()
    
    static def withSql(Closure closure) {
        return closure(mockSql)
    }
    
    static void resetMock() {
        mockSql.reset()
    }
}

/**
 * Mock AuthenticationService
 */
class AuthenticationService {
    static def getSystemUser() {
        return 'test-system-user'
    }
}

// ==================== MOCK AUDIT LOG REPOSITORY ====================

/**
 * Mock AuditLogRepository that captures audit logging calls
 */
class AuditLogRepository {
    static def auditCallsLog = []
    
    static void logInstructionCompleted(Object sql, Integer userId, UUID instructionInstanceId, UUID stepInstanceId) {
        auditCallsLog << [
            action: 'INSTRUCTION_COMPLETED',
            userId: userId,
            instructionInstanceId: instructionInstanceId,
            stepInstanceId: stepInstanceId,
            timestamp: new Date()
        ]
        
        // Also call the actual SQL execute to simulate real behavior
        sql.execute("""
            INSERT INTO audit_log_aud (
                usr_id, aud_entity_id, aud_entity_type, aud_action, aud_details
            ) VALUES (?, ?, ?, ?, ?::jsonb)
        """, [
            userId,
            instructionInstanceId,
            'INSTRUCTION_INSTANCE',
            'INSTRUCTION_COMPLETED',
            '{"step_instance_id":"' + stepInstanceId.toString() + '","completion_timestamp":"' + new Date().format('yyyy-MM-dd HH:mm:ss') + '"}'
        ])
    }
    
    static void logInstructionUncompleted(Object sql, Integer userId, UUID instructionInstanceId, UUID stepInstanceId) {
        auditCallsLog << [
            action: 'INSTRUCTION_UNCOMPLETED',
            userId: userId,
            instructionInstanceId: instructionInstanceId,
            stepInstanceId: stepInstanceId,
            timestamp: new Date()
        ]
        
        // Also call the actual SQL execute to simulate real behavior
        sql.execute("""
            INSERT INTO audit_log_aud (
                usr_id, aud_entity_id, aud_entity_type, aud_action, aud_details
            ) VALUES (?, ?, ?, ?, ?::jsonb)
        """, [
            userId,
            instructionInstanceId,
            'INSTRUCTION_INSTANCE',
            'INSTRUCTION_UNCOMPLETED',
            '{"step_instance_id":"' + stepInstanceId.toString() + '","uncomplete_timestamp":"' + new Date().format('yyyy-MM-dd HH:mm:ss') + '"}'
        ])
    }
    
    static void reset() {
        auditCallsLog.clear()
    }
}

// ==================== INSTRUCTION REPOSITORY (SIMPLIFIED) ====================

/**
 * Simplified InstructionRepository with audit logging for testing
 */
class InstructionRepository {
    
    def completeInstruction(UUID iniId, Integer userId) {
        if (!iniId || !userId) {
            throw new IllegalArgumentException("Instruction instance ID and user ID are required")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                // First, get the step instance ID for audit logging
                def stepInfo = sql.firstRow('''
                    SELECT sti_id 
                    FROM instructions_instance_ini 
                    WHERE ini_id = :iniId AND ini_is_completed = false
                ''', [iniId: iniId])
                
                if (!stepInfo) {
                    return 0 // Instruction not found or already completed
                }
                
                def affectedRows = sql.executeUpdate('''
                    UPDATE instructions_instance_ini 
                    SET 
                        ini_is_completed = true,
                        ini_completed_at = CURRENT_TIMESTAMP,
                        usr_id_completed_by = :userId,
                        updated_at = CURRENT_TIMESTAMP,
                        updated_by = :updatedBy
                    WHERE ini_id = :iniId AND ini_is_completed = false
                ''', [iniId: iniId, userId: userId, updatedBy: AuthenticationService.getSystemUser()])
                
                // Log to audit trail if update was successful
                if (affectedRows > 0) {
                    try {
                        AuditLogRepository.logInstructionCompleted(sql, userId, iniId, stepInfo.sti_id as UUID)
                    } catch (Exception auditError) {
                        // Audit logging failure shouldn't break the main flow
                        println "InstructionRepository: Failed to log instruction completion audit - ${auditError.message}"
                    }
                }
                
                return affectedRows
            } catch (SQLException e) {
                if (e.getSQLState() == '23503') {
                    throw new IllegalArgumentException("User does not exist", e)
                }
                throw new RuntimeException("Failed to complete instruction ${iniId}", e)
            }
        }
    }
    
    def uncompleteInstruction(UUID iniId) {
        if (!iniId) {
            throw new IllegalArgumentException("Instruction instance ID cannot be null")
        }
        
        DatabaseUtil.withSql { sql ->
            try {
                // First, get the step instance ID and current user for audit logging
                def instructionInfo = sql.firstRow('''
                    SELECT sti_id, usr_id_completed_by 
                    FROM instructions_instance_ini 
                    WHERE ini_id = :iniId AND ini_is_completed = true
                ''', [iniId: iniId])
                
                if (!instructionInfo) {
                    return 0 // Instruction not found or not completed
                }
                
                def affectedRows = sql.executeUpdate('''
                    UPDATE instructions_instance_ini 
                    SET 
                        ini_is_completed = false,
                        ini_completed_at = NULL,
                        usr_id_completed_by = NULL,
                        updated_at = CURRENT_TIMESTAMP,
                        updated_by = :updatedBy
                    WHERE ini_id = :iniId AND ini_is_completed = true
                ''', [iniId: iniId, updatedBy: AuthenticationService.getSystemUser()])
                
                // Log to audit trail if update was successful
                if (affectedRows > 0) {
                    try {
                        // Use the original completing user ID or null if system uncompleted
                        def auditUserId = instructionInfo.usr_id_completed_by as Integer
                        AuditLogRepository.logInstructionUncompleted(sql, auditUserId, iniId, instructionInfo.sti_id as UUID)
                    } catch (Exception auditError) {
                        // Audit logging failure shouldn't break the main flow
                        println "InstructionRepository: Failed to log instruction uncompletion audit - ${auditError.message}"
                    }
                }
                
                return affectedRows
            } catch (SQLException e) {
                throw new RuntimeException("Failed to uncomplete instruction ${iniId}", e)
            }
        }
    }
}

// ==================== TEST CLASS ====================

class InstructionAuditLoggingTestRunner {
    
    static InstructionRepository repository
    static MockSql mockSql
    
    static void main(String[] args) {
        println "Running Instruction Audit Logging tests..."
        
        // Setup
        repository = new InstructionRepository()
        
        // Run all tests
        testCompleteInstructionWithAuditLogging()
        testUncompleteInstructionWithAuditLogging()
        testCompleteInstructionNotFoundNoAuditLogging()
        testUncompleteInstructionNotFoundNoAuditLogging()
        testCompleteInstructionAuditFailureDoesNotBreakFlow()
        
        println "All Instruction Audit Logging tests passed!"
    }
    
    static void testCompleteInstructionWithAuditLogging() {
        println "Testing completeInstruction with audit logging..."
        
        // Setup test data
        def instructionId = UUID.randomUUID()
        def stepInstanceId = UUID.randomUUID()
        def userId = 123
        
        // Reset mocks
        DatabaseUtil.resetMock()
        AuditLogRepository.reset()
        
        // Setup mock responses
        DatabaseUtil.mockSql.setMockResult('firstRow', [sti_id: stepInstanceId])
        DatabaseUtil.mockSql.setMockResult('executeUpdate', 1)
        DatabaseUtil.mockSql.setMockResult('execute', true)
        
        // Execute test
        def result = repository.completeInstruction(instructionId, userId)
        
        // Validate instruction update was called
        def instructionCalls = DatabaseUtil.mockSql.getCapturedInstructionCalls()
        assert instructionCalls.size() >= 2, "Expected at least 2 instruction calls (SELECT and UPDATE)"
        
        def selectCall = instructionCalls.find { it.query.contains('SELECT sti_id') }
        assert selectCall != null, "Expected SELECT query to get step instance ID"
        assert selectCall.params.iniId == instructionId
        
        def updateCall = instructionCalls.find { it.query.contains('UPDATE instructions_instance_ini') }
        assert updateCall != null, "Expected UPDATE query to complete instruction"
        assert updateCall.params.iniId == instructionId
        assert updateCall.params.userId == userId
        assert updateCall.query.contains('ini_is_completed = true')
        
        // Validate audit logging was called
        def auditCalls = DatabaseUtil.mockSql.getCapturedAuditCalls()
        assert auditCalls.size() == 1, "Expected exactly 1 audit call"
        
        def auditCall = auditCalls[0]
        assert auditCall.query.contains('INSERT INTO audit_log_aud')
        assert auditCall.params[0] == userId, "Expected userId in audit params"
        assert auditCall.params[1] == instructionId, "Expected instructionId in audit params"
        assert auditCall.params[2] == 'INSTRUCTION_INSTANCE', "Expected entity type in audit params"
        assert auditCall.params[3] == 'INSTRUCTION_COMPLETED', "Expected action in audit params"
        assert auditCall.params[4].contains(stepInstanceId.toString()), "Expected step instance ID in audit details"
        
        // Validate AuditLogRepository was called
        def auditLogCalls = AuditLogRepository.auditCallsLog
        assert auditLogCalls.size() == 1, "Expected exactly 1 AuditLogRepository call"
        assert auditLogCalls[0].action == 'INSTRUCTION_COMPLETED'
        assert auditLogCalls[0].userId == userId
        assert auditLogCalls[0].instructionInstanceId == instructionId
        assert auditLogCalls[0].stepInstanceId == stepInstanceId
        
        assert result == 1, "Expected 1 affected row"
        
        println "✓ completeInstruction with audit logging test passed"
    }
    
    static void testUncompleteInstructionWithAuditLogging() {
        println "Testing uncompleteInstruction with audit logging..."
        
        // Setup test data
        def instructionId = UUID.randomUUID()
        def stepInstanceId = UUID.randomUUID()
        def completedByUserId = 456
        
        // Reset mocks
        DatabaseUtil.resetMock()
        AuditLogRepository.reset()
        
        // Setup mock responses
        DatabaseUtil.mockSql.setMockResult('firstRow', [sti_id: stepInstanceId, usr_id_completed_by: completedByUserId])
        DatabaseUtil.mockSql.setMockResult('executeUpdate', 1)
        DatabaseUtil.mockSql.setMockResult('execute', true)
        
        // Execute test
        def result = repository.uncompleteInstruction(instructionId)
        
        // Validate instruction update was called
        def instructionCalls = DatabaseUtil.mockSql.getCapturedInstructionCalls()
        assert instructionCalls.size() >= 2, "Expected at least 2 instruction calls (SELECT and UPDATE)"
        
        def selectCall = instructionCalls.find { it.query.contains('SELECT sti_id, usr_id_completed_by') }
        assert selectCall != null, "Expected SELECT query to get instruction info"
        assert selectCall.params.iniId == instructionId
        
        def updateCall = instructionCalls.find { it.query.contains('UPDATE instructions_instance_ini') }
        assert updateCall != null, "Expected UPDATE query to uncomplete instruction"
        assert updateCall.params.iniId == instructionId
        assert updateCall.query.contains('ini_is_completed = false')
        assert updateCall.query.contains('usr_id_completed_by = NULL')
        
        // Validate audit logging was called
        def auditCalls = DatabaseUtil.mockSql.getCapturedAuditCalls()
        assert auditCalls.size() == 1, "Expected exactly 1 audit call"
        
        def auditCall = auditCalls[0]
        assert auditCall.query.contains('INSERT INTO audit_log_aud')
        assert auditCall.params[0] == completedByUserId, "Expected original completing userId in audit params"
        assert auditCall.params[1] == instructionId, "Expected instructionId in audit params"
        assert auditCall.params[2] == 'INSTRUCTION_INSTANCE', "Expected entity type in audit params"
        assert auditCall.params[3] == 'INSTRUCTION_UNCOMPLETED', "Expected action in audit params"
        assert auditCall.params[4].contains(stepInstanceId.toString()), "Expected step instance ID in audit details"
        
        // Validate AuditLogRepository was called
        def auditLogCalls = AuditLogRepository.auditCallsLog
        assert auditLogCalls.size() == 1, "Expected exactly 1 AuditLogRepository call"
        assert auditLogCalls[0].action == 'INSTRUCTION_UNCOMPLETED'
        assert auditLogCalls[0].userId == completedByUserId
        assert auditLogCalls[0].instructionInstanceId == instructionId
        assert auditLogCalls[0].stepInstanceId == stepInstanceId
        
        assert result == 1, "Expected 1 affected row"
        
        println "✓ uncompleteInstruction with audit logging test passed"
    }
    
    static void testCompleteInstructionNotFoundNoAuditLogging() {
        println "Testing completeInstruction not found - no audit logging..."
        
        // Setup test data
        def instructionId = UUID.randomUUID()
        def userId = 123
        
        // Reset mocks
        DatabaseUtil.resetMock()
        AuditLogRepository.reset()
        
        // Setup mock responses - instruction not found
        DatabaseUtil.mockSql.setMockResult('firstRow', null)
        
        // Execute test
        def result = repository.completeInstruction(instructionId, userId)
        
        // Validate no audit logging was called when instruction not found
        def auditCalls = DatabaseUtil.mockSql.getCapturedAuditCalls()
        assert auditCalls.size() == 0, "Expected no audit calls when instruction not found"
        
        def auditLogCalls = AuditLogRepository.auditCallsLog
        assert auditLogCalls.size() == 0, "Expected no AuditLogRepository calls when instruction not found"
        
        assert result == 0, "Expected 0 affected rows when instruction not found"
        
        println "✓ completeInstruction not found - no audit logging test passed"
    }
    
    static void testUncompleteInstructionNotFoundNoAuditLogging() {
        println "Testing uncompleteInstruction not found - no audit logging..."
        
        // Setup test data
        def instructionId = UUID.randomUUID()
        
        // Reset mocks
        DatabaseUtil.resetMock()
        AuditLogRepository.reset()
        
        // Setup mock responses - instruction not found
        DatabaseUtil.mockSql.setMockResult('firstRow', null)
        
        // Execute test
        def result = repository.uncompleteInstruction(instructionId)
        
        // Validate no audit logging was called when instruction not found
        def auditCalls = DatabaseUtil.mockSql.getCapturedAuditCalls()
        assert auditCalls.size() == 0, "Expected no audit calls when instruction not found"
        
        def auditLogCalls = AuditLogRepository.auditCallsLog
        assert auditLogCalls.size() == 0, "Expected no AuditLogRepository calls when instruction not found"
        
        assert result == 0, "Expected 0 affected rows when instruction not found"
        
        println "✓ uncompleteInstruction not found - no audit logging test passed"
    }
    
    static void testCompleteInstructionAuditFailureDoesNotBreakFlow() {
        println "Testing completeInstruction - audit failure does not break main flow..."
        
        // Setup test data
        def instructionId = UUID.randomUUID()
        def stepInstanceId = UUID.randomUUID()
        def userId = 123
        
        // Reset mocks
        DatabaseUtil.resetMock()
        AuditLogRepository.reset()
        
        // Setup mock responses
        DatabaseUtil.mockSql.setMockResult('firstRow', [sti_id: stepInstanceId])
        DatabaseUtil.mockSql.setMockResult('executeUpdate', 1)
        
        // Setup mock to fail on audit logging
        DatabaseUtil.mockSql.metaClass.execute = { String query, List params ->
            if (query.contains('audit_log_aud')) {
                throw new RuntimeException("Audit logging failed")
            }
            return true
        }
        
        // Execute test - should not throw despite audit failure
        def result = repository.completeInstruction(instructionId, userId)
        
        // Main operation should still succeed
        assert result == 1, "Expected 1 affected row despite audit failure"
        
        println "✓ completeInstruction - audit failure does not break main flow test passed"
    }
}

// Execute tests when run as script
InstructionAuditLoggingTestRunner.main(args)