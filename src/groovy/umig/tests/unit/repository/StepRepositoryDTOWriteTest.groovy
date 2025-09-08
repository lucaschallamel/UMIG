package umig.tests.unit.repository

import java.util.UUID
import java.sql.SQLException
import groovy.sql.Sql

/**
 * Unit tests for StepRepository DTO write operations
 * Added for US-056C Phase 2 API integration
 * 
 * Tests the new DTO-based write methods:
 * - createMasterFromDTO
 * - updateMasterFromDTO
 * - deleteMaster
 * 
 * Following UMIG patterns:
 * - ADR-026: Specific SQL query mocking
 * - ADR-031: Type safety with explicit casting
 * - Zero external dependencies (no GroovyTestCase)
 * - DatabaseUtil.withSql pattern
 * 
 * Run: groovy StepRepositoryDTOWriteTest.groovy
 * Coverage Target: 95%+ (Sprint 5 testing standards)
 */

// --- Mock StepMasterDTO ---
class StepMasterDTO {
    String stepMasterId
    String stepTypeCode
    Integer stepNumber
    String stepName
    String stepDescription
    Integer durationMinutes
    
    StepMasterDTO(Map props = [:]) {
        props.each { key, value ->
            if (this.hasProperty(key as String)) {
                this[key as String] = value
            }
        }
    }
    
    // Fix hasProperty method signature for static type checking
    boolean hasProperty(String name) {
        return this.metaClass.hasProperty(this, name) != null
    }
    
    // Fix getAt method signature for static type checking  
    def getAt(String name) {
        return this.metaClass.getProperty(this, name)
    }
    
    // Fix setAt method signature for static type checking
    void putAt(String name, Object value) {
        this.metaClass.setProperty(this, name, value)
    }
}

// --- Mock Database Util ---
class DatabaseUtil {
    static def withSql(Closure closure) {
        def mockSql = new MockSql()
        return closure.call(mockSql)
    }
}

class MockSql {
    def firstRowData = null
    def rowsData = []
    Integer updateResult = 1
    Boolean executeResult = true
    
    // Fix return type for static type checking - use overloaded methods without defaults
    Map firstRow(String query) {
        return firstRowData as Map
    }
    
    Map firstRow(String query, List params) {
        return firstRowData as Map
    }
    
    Map firstRow(String query, Map params) {
        return firstRowData as Map
    }
    
    List<Map> rows(String query) {
        return rowsData as List<Map>
    }
    
    List<Map> rows(String query, List params) {
        return rowsData as List<Map>
    }
    
    List<Map> rows(String query, Map params) {
        return rowsData as List<Map>
    }
    
    // Fix executeUpdate method signature for static type checking
    Integer executeUpdate(String query) {
        return updateResult
    }
    
    Integer executeUpdate(String query, List params) {
        return updateResult
    }
    
    Integer executeUpdate(String query, Map params) {
        return updateResult
    }
    
    Boolean execute(String query) {
        return executeResult
    }
    
    Boolean execute(String query, List params) {
        return executeResult
    }
    
    Boolean execute(String query, Map params) {
        return executeResult
    }
    
    void close() {}
    def getConnection() { return [close: {}] }
}

// --- Mock StepRepository ---
class StepRepository {
    // Injectable mock for testing specific scenarios
    MockSql mockSqlOverride = null
    
    def createMasterFromDTO(Map stepData) {
        if (stepData == null || stepData.isEmpty()) {
            throw new IllegalArgumentException("Step data cannot be null or empty")
        }
        
        // Validate required fields
        def requiredFields = ['phm_id', 'tms_id_owner', 'stt_code', 'stm_number', 'stm_name', 'enr_id_target']
        for (field in requiredFields) {
            if (!stepData.containsKey(field) || stepData[field] == null) {
                throw new IllegalArgumentException("Required field missing: ${field}")
            }
        }
        
        def stepId = UUID.randomUUID()
        
        def sqlInstance = mockSqlOverride ?: new MockSql()
        return DatabaseUtil.withSql { sql ->
            sqlInstance = mockSqlOverride ?: sql
            // Type casting as per ADR-031
            def params = [
                stm_id: stepId,
                phm_id: UUID.fromString(stepData.phm_id as String),
                tms_id_owner: Integer.parseInt(stepData.tms_id_owner as String),
                stt_code: stepData.stt_code as String,
                stm_number: Integer.parseInt(stepData.stm_number as String),
                stm_name: stepData.stm_name as String,
                stm_description: stepData.stm_description as String ?: '',
                stm_duration_minutes: stepData.stm_duration_minutes ? Integer.parseInt(stepData.stm_duration_minutes as String) : null,
                enr_id_target: Integer.parseInt(stepData.enr_id_target as String),
                enr_id: stepData.enr_id ? Integer.parseInt(stepData.enr_id as String) : null
            ]
            
            (sqlInstance as MockSql).executeUpdate(
                "INSERT INTO steps_master_stm (stm_id, phm_id, tms_id_owner, stt_code, stm_number, stm_name, stm_description, stm_duration_minutes, enr_id_target, enr_id) VALUES (:stm_id, :phm_id, :tms_id_owner, :stt_code, :stm_number, :stm_name, :stm_description, :stm_duration_minutes, :enr_id_target, :enr_id)",
                params
            )
            
            return findMasterByIdAsDTO(stepId)
        }
    }
    
    def updateMasterFromDTO(UUID stepId, Map updateData) {
        if (stepId == null) {
            throw new IllegalArgumentException("Step ID cannot be null")
        }
        if (updateData == null) {
            throw new IllegalArgumentException("Update data cannot be null")
        }
        
        def sqlInstance = mockSqlOverride ?: new MockSql()
        return DatabaseUtil.withSql { sql ->
            sqlInstance = mockSqlOverride ?: sql
            def updateFields = []
            Map<String, Object> params = new HashMap<String, Object>()
            params.put('stm_id', stepId)
            
            if (updateData.stm_name) {
                updateFields << "stm_name = :stm_name"
                params.put('stm_name', updateData.stm_name as String)
            }
            if (updateData.stm_description != null) {
                updateFields << "stm_description = :stm_description"
                params.put('stm_description', updateData.stm_description as String)
            }
            if (updateData.stm_duration_minutes) {
                updateFields << "stm_duration_minutes = :stm_duration_minutes"
                params.put('stm_duration_minutes', Integer.parseInt(updateData.stm_duration_minutes as String))
            }
            
            if (updateFields.isEmpty()) {
                throw new IllegalArgumentException("No valid fields to update")
            }
            
            def query = "UPDATE steps_master_stm SET ${updateFields.join(', ')} WHERE stm_id = :stm_id"
            Integer rowsUpdated = (sqlInstance as MockSql).executeUpdate(query, params)
            
            if (rowsUpdated == 0) {
                throw new IllegalArgumentException("Step master not found with ID: ${stepId}")
            }
            
            return findMasterByIdAsDTO(stepId)
        }
    }
    
    def deleteMaster(UUID stepId) {
        if (stepId == null) {
            throw new IllegalArgumentException("Step ID cannot be null")
        }
        
        def sqlInstance = mockSqlOverride ?: new MockSql()
        return DatabaseUtil.withSql { sql ->
            sqlInstance = mockSqlOverride ?: sql
            // Check for active instances - fix type casting for static type checking
            Map instanceCountRow = (sqlInstance as MockSql).firstRow(
                "SELECT COUNT(*) as count FROM steps_instance_sti WHERE stm_id = ?",
                [stepId]
            )
            Integer instanceCount = (instanceCountRow?.count ?: 0) as Integer
            
            if (instanceCount > 0) {
                throw new IllegalStateException("Cannot delete step master with ${instanceCount} active instances")
            }
            
            // Cascade deletes - fix SQL method calls on Object type
            (sqlInstance as MockSql).execute("DELETE FROM instructions_master_inm WHERE stm_id = ?", [stepId])
            (sqlInstance as MockSql).execute("DELETE FROM instructions_instance_ini WHERE stm_id = ?", [stepId])
            (sqlInstance as MockSql).execute("DELETE FROM step_comments_stc WHERE stm_id = ?", [stepId])
            (sqlInstance as MockSql).execute("DELETE FROM step_audit_sta WHERE stm_id = ?", [stepId])
            
            // Main delete
            Integer rowsDeleted = (sqlInstance as MockSql).executeUpdate("DELETE FROM steps_master_stm WHERE stm_id = ?", [stepId])
            
            return rowsDeleted > 0
        }
    }
    
    def findMasterByIdAsDTO(UUID stepId) {
        // Mock implementation - returns a basic DTO
        return new StepMasterDTO(
            stepMasterId: stepId.toString(),
            stepTypeCode: 'CUTOVER',
            stepNumber: 100,
            stepName: 'Test Step Master',
            stepDescription: 'Test Description'
        )
    }
}

// --- Test Class ---
class StepRepositoryDTOWriteTests {
    
    private StepRepository repository
    
    def setup() {
        repository = new StepRepository()
    }
    
    def cleanup() {
        // Reset mock override to avoid test pollution
        repository?.mockSqlOverride = null
    }
    
    /**
     * Test createMasterFromDTO with valid data
     */
    def testCreateMasterFromDTO_Success() {
        println("Testing createMasterFromDTO_Success...")
        
        // Given: Valid step data
        def stepData = [
            phm_id: 'e1234567-89ab-cdef-0123-456789abcdef',
            tms_id_owner: '1',
            stt_code: 'CUTOVER',
            stm_number: '100',
            stm_name: 'Test Step Master',
            stm_description: 'Test Description',
            stm_duration_minutes: '60',
            enr_id_target: '2',
            enr_id: '3'
        ]
        
        // When: Creating master from DTO
        def result = repository.createMasterFromDTO(stepData)
        
        // Then: DTO is returned with expected values - fix properties access with casting
        assert result != null, "Result should not be null"
        assert (result as StepMasterDTO).stepTypeCode == 'CUTOVER', "Expected CUTOVER, got ${(result as StepMasterDTO).stepTypeCode}"
        assert (result as StepMasterDTO).stepNumber == 100, "Expected 100, got ${(result as StepMasterDTO).stepNumber}"
        assert (result as StepMasterDTO).stepName == 'Test Step Master', "Expected 'Test Step Master', got ${(result as StepMasterDTO).stepName}"
        
        println("✓ testCreateMasterFromDTO_Success passed")
    }
    
    /**
     * Test createMasterFromDTO with missing required fields
     */
    def testCreateMasterFromDTO_MissingRequiredFields() {
        println("Testing createMasterFromDTO_MissingRequiredFields...")
        
        // Given: Step data missing required fields
        def stepData = [
            phm_id: 'e1234567-89ab-cdef-0123-456789abcdef',
            stm_name: 'Test Step'
            // Missing: tms_id_owner, stt_code, stm_number, enr_id_target
        ]
        
        // When/Then: Should throw IllegalArgumentException
        def exceptionThrown = false
        try {
            repository.createMasterFromDTO(stepData)
        } catch (IllegalArgumentException e) {
            exceptionThrown = true
            assert e.message.contains("Required field missing"), "Expected required field error, got: ${e.message}"
        }
        
        assert exceptionThrown, "Expected IllegalArgumentException to be thrown"
        println("✓ testCreateMasterFromDTO_MissingRequiredFields passed")
    }
    
    /**
     * Test updateMasterFromDTO with valid data
     */
    def testUpdateMasterFromDTO_Success() {
        println("Testing updateMasterFromDTO_Success...")
        
        // Given: Existing step ID and update data
        def stepId = UUID.randomUUID()
        def updateData = [
            stm_name: 'Updated Step Name',
            stm_description: 'Updated Description',
            stm_duration_minutes: '90'
        ]
        
        // When: Updating master from DTO
        def result = repository.updateMasterFromDTO(stepId, updateData)
        
        // Then: Updated DTO is returned - fix property access with casting
        assert result != null, "Result should not be null"
        assert (result as StepMasterDTO).stepName == 'Test Step Master', "Expected step name from mock DTO"
        
        println("✓ testUpdateMasterFromDTO_Success passed")
    }
    
    /**
     * Test updateMasterFromDTO when step not found  
     */
    def testUpdateMasterFromDTO_StepNotFound() {
        println("Testing updateMasterFromDTO_StepNotFound...")
        
        // Override mock to simulate step not found - use injectable mock
        MockSql mockSql = new MockSql()
        mockSql.updateResult = 0  // No rows updated
        repository.mockSqlOverride = mockSql
        
        def stepId = UUID.randomUUID()
        def updateData = [stm_name: 'Updated Name']
        
        def exceptionThrown = false
        try {
            repository.updateMasterFromDTO(stepId, updateData)
        } catch (IllegalArgumentException e) {
            exceptionThrown = true
            assert e.message.contains('Step master not found'), "Expected 'not found' error, got: ${e.message}"
        }
        
        assert exceptionThrown, "Expected IllegalArgumentException to be thrown"
        println("✓ testUpdateMasterFromDTO_StepNotFound passed")
    }
    
    /**
     * Test deleteMaster success case
     */
    def testDeleteMaster_Success() {
        println("Testing deleteMaster_Success...")
        
        // Override mock to simulate successful delete - use injectable mock
        MockSql mockSql = new MockSql()
        mockSql.firstRowData = [count: 0]  // No instances
        mockSql.updateResult = 1  // One row deleted
        repository.mockSqlOverride = mockSql
        
        def stepId = UUID.randomUUID()
        def result = repository.deleteMaster(stepId)
        
        assert result == true, "Expected delete to return true"
        println("✓ testDeleteMaster_Success passed")
    }
    
    /**
     * Test deleteMaster when step has active instances
     */
    def testDeleteMaster_WithActiveInstances() {
        println("Testing deleteMaster_WithActiveInstances...")
        
        // Override mock to simulate active instances - use injectable mock
        MockSql mockSql = new MockSql()
        mockSql.firstRowData = [count: 5]  // Has 5 instances
        repository.mockSqlOverride = mockSql
        
        def stepId = UUID.randomUUID()
        
        def exceptionThrown = false
        try {
            repository.deleteMaster(stepId)
        } catch (IllegalStateException e) {
            exceptionThrown = true
            assert e.message.contains('Cannot delete step master with 5 active instances'), "Expected instances error, got: ${e.message}"
        }
        
        assert exceptionThrown, "Expected IllegalStateException to be thrown"
        println("✓ testDeleteMaster_WithActiveInstances passed")
    }
    
    /**
     * Test deleteMaster when step not found
     */
    def testDeleteMaster_StepNotFound() {
        println("Testing deleteMaster_StepNotFound...")
        
        // Override mock to simulate step not found - use injectable mock
        MockSql mockSql = new MockSql()
        mockSql.firstRowData = [count: 0]  // No instances
        mockSql.updateResult = 0  // No rows deleted
        repository.mockSqlOverride = mockSql
        
        def stepId = UUID.randomUUID()
        def result = repository.deleteMaster(stepId)
        
        assert result == false, "Expected delete to return false for non-existent step"
        println("✓ testDeleteMaster_StepNotFound passed")
    }
    
    /**
     * Test null safety for all methods
     */
    def testNullSafety() {
        println("Testing null safety...")
        
        // Test createMasterFromDTO with null
        def nullCreateExceptionThrown = false
        try {
            repository.createMasterFromDTO(null)
        } catch (IllegalArgumentException e) {
            nullCreateExceptionThrown = true
        }
        assert nullCreateExceptionThrown, "Expected exception for null step data"
        
        // Test updateMasterFromDTO with null step ID
        def nullIdExceptionThrown = false
        try {
            repository.updateMasterFromDTO(null, [:])
        } catch (IllegalArgumentException e) {
            nullIdExceptionThrown = true
        }
        assert nullIdExceptionThrown, "Expected exception for null step ID"
        
        // Test updateMasterFromDTO with null data
        def nullDataExceptionThrown = false
        try {
            repository.updateMasterFromDTO(UUID.randomUUID(), null)
        } catch (IllegalArgumentException e) {
            nullDataExceptionThrown = true
        }
        assert nullDataExceptionThrown, "Expected exception for null update data"
        
        // Test deleteMaster with null
        def nullDeleteExceptionThrown = false
        try {
            repository.deleteMaster(null)
        } catch (IllegalArgumentException e) {
            nullDeleteExceptionThrown = true
        }
        assert nullDeleteExceptionThrown, "Expected exception for null step ID in delete"
        
        println("✓ testNullSafety passed")
    }
    
    /**
     * Test type casting for integer fields (ADR-031)
     */
    def testTypeCasting_IntegerFields() {
        println("Testing type casting...")
        
        def stepData = [
            phm_id: 'e1234567-89ab-cdef-0123-456789abcdef',
            tms_id_owner: '123',
            stt_code: 'CUTOVER',
            stm_number: '456',
            stm_name: 'Test Step',
            stm_duration_minutes: '789',
            enr_id_target: '10',
            enr_id: '11'
        ]
        
        // This tests that the type casting logic doesn't throw exceptions
        def result = repository.createMasterFromDTO(stepData)
        assert result != null, "Type casting should not prevent DTO creation"
        
        println("✓ testTypeCasting_IntegerFields passed")
    }
    
    // ========================================
    // Test Runner
    // ========================================
    
    static def runAllTests() {
        println("=== Running StepRepositoryDTOWriteTests ===")
        
        def testInstance = new StepRepositoryDTOWriteTests()
        testInstance.setup()
        
        def testMethods = [
            'testCreateMasterFromDTO_Success',
            'testCreateMasterFromDTO_MissingRequiredFields',
            'testUpdateMasterFromDTO_Success',
            'testUpdateMasterFromDTO_StepNotFound',
            'testDeleteMaster_Success',
            'testDeleteMaster_WithActiveInstances',
            'testDeleteMaster_StepNotFound',
            'testNullSafety',
            'testTypeCasting_IntegerFields'
        ]
        
        def passedTests = 0
        def failedTests = 0
        
        testMethods.each { methodName ->
            try {
                // Fix dynamic method resolution error with explicit casting
                def method = testInstance.metaClass.getMetaMethod(methodName, [] as Object[])
                if (method) {
                    method.invoke(testInstance, [] as Object[])
                } else {
                    // Fallback for reflection-based method invocation
                    testInstance.getClass().getMethod(methodName).invoke(testInstance)
                }
                // Cleanup after each test
                testInstance.cleanup()
                passedTests++
            } catch (Exception e) {
                println("✗ ${methodName} failed: ${e.message}")
                // Cleanup even on failure
                testInstance.cleanup()
                failedTests++
            }
        }
        
        println("\n=== Test Results ===")
        println("Passed: ${passedTests}")
        println("Failed: ${failedTests}")
        println("Total: ${testMethods.size()}")
        println("Success Rate: ${(passedTests / testMethods.size() * 100).round(2)}%")
        
        if (failedTests == 0) {
            println("🎉 All tests passed!")
        } else {
            println("⚠️ Some tests failed")
        }
    }
}

// Run the tests when script is executed
StepRepositoryDTOWriteTests.runAllTests()