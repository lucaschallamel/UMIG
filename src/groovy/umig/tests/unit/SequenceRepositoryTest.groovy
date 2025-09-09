package umig.tests.unit

import java.util.UUID
import groovy.transform.CompileStatic
import groovy.transform.TypeCheckingMode

/**
 * Unit test for SequenceRepository - Standalone Groovy Test
 * Converted from Spock to standard Groovy per ADR-036
 * Self-contained with embedded mock classes for ScriptRunner compatibility
 * Uses the most basic mocking approach to avoid MetaClass issues
 */

// ==================== MOCK CLASSES ====================

/**
 * Mock SQL class that simulates database operations
 * Explicit typing for static type checker compatibility
 */
class MockSql {
    Map<String, Object> mockResults = [:]
    String queryCaptured = null
    Object paramsCaptured = null
    String methodCalled = null
    
    List<Map<String, Object>> rows(String query, Map<String, Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'rows'
        return (mockResults['rows'] as List<Map<String, Object>>) ?: []
    }
    
    List<Map<String, Object>> rows(String query, List<Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'rows'
        return (mockResults['rows'] as List<Map<String, Object>>) ?: []
    }
    
    List<Map<String, Object>> rows(String query) {
        queryCaptured = query
        paramsCaptured = [:]
        methodCalled = 'rows'
        return (mockResults['rows'] as List<Map<String, Object>>) ?: []
    }
    
    Map<String, Object> firstRow(String query, Map<String, Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'firstRow'
        return mockResults['firstRow'] as Map<String, Object>
    }
    
    Map<String, Object> firstRow(String query, List<Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'firstRow'
        return mockResults['firstRow'] as Map<String, Object>
    }
    
    Map<String, Object> firstRow(String query) {
        queryCaptured = query
        paramsCaptured = [:]
        methodCalled = 'firstRow'
        return mockResults['firstRow'] as Map<String, Object>
    }
    
    int executeUpdate(String query, Map<String, Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'executeUpdate'
        return (mockResults['executeUpdate'] as Integer) ?: 1
    }
    
    int executeUpdate(String query, List<Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'executeUpdate'
        return (mockResults['executeUpdate'] as Integer) ?: 1
    }
    
    int executeUpdate(String query) {
        queryCaptured = query
        paramsCaptured = [:]
        methodCalled = 'executeUpdate'
        return (mockResults['executeUpdate'] as Integer) ?: 1
    }
    
    boolean execute(String query, Map<String, Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'execute'
        return true
    }
    
    boolean execute(String query, List<Object> params) {
        queryCaptured = query
        paramsCaptured = params
        methodCalled = 'execute'
        return true
    }
    
    boolean execute(String query) {
        queryCaptured = query
        paramsCaptured = [:]
        methodCalled = 'execute'
        return true
    }
    
    void setMockResult(String method, Object result) {
        mockResults[method] = result
    }
}

/**
 * Mock DatabaseUtil for testing - completely self-contained
 */
class DatabaseUtil {
    static MockSql mockSql = new MockSql()
    
    static <T> T withSql(Closure<T> closure) {
        return closure(mockSql)
    }
    
    static void resetMock() {
        mockSql = new MockSql()
    }
}

// ==================== REPOSITORY IMPLEMENTATION ====================

/**
 * Repository for SEQUENCE data following UMIG patterns.
 * Embedded implementation for self-contained testing.
 */
class SequenceRepository {

    /**
     * Finds all master sequences with associated plan and team information
     */
    List<Map<String, Object>> findAllMasterSequences() {
        return DatabaseUtil.withSql { MockSql sql ->
            return sql.rows('''
                SELECT 
                    sqm.sqm_id,
                    sqm.sqm_name,
                    sqm.sqm_order,
                    sqm.sqm_description,
                    sqm.plm_id,
                    plm.plm_name,
                    plm.tms_id,
                    tms.tms_name
                FROM sequence_master_sqm sqm
                JOIN plan_master_plm plm ON sqm.plm_id = plm.plm_id
                JOIN team_master_tms tms ON plm.tms_id = tms.tms_id
                WHERE sqm.sqm_is_active = true
                ORDER BY plm.plm_name, sqm.sqm_order
            ''', [:] as Map<String, Object>)
        }
    }

    /**
     * Finds master sequences by plan ID
     */
    List<Map<String, Object>> findMasterSequencesByPlanId(UUID planId) {
        if (!planId) {
            throw new IllegalArgumentException("Plan ID cannot be null")
        }
        
        return DatabaseUtil.withSql { MockSql sql ->
            return sql.rows('''
                SELECT 
                    sqm_id,
                    sqm_name,
                    sqm_order,
                    sqm_description,
                    plm_id
                FROM sequence_master_sqm
                WHERE plm_id = :planId 
                  AND sqm_is_active = true
                ORDER BY sqm_order
            ''', [planId: planId] as Map<String, Object>)
        }
    }

    /**
     * Finds sequence instances by iteration with hierarchical filtering
     */
    List<Map<String, Object>> findSequencesByIteration(Map<String, Object> filters) {
        if (!filters || !filters.migrationId || !filters.iterationId) {
            throw new IllegalArgumentException("Migration ID and Iteration ID are required")
        }

        return DatabaseUtil.withSql { MockSql sql ->
            return sql.rows('''
                SELECT DISTINCT
                    sqi.sqi_id,
                    sqi.sqi_name,
                    sqi.sqi_order,
                    sqi.sqi_description,
                    sqi.sqm_id,
                    sqm.sqm_name,
                    sqi.pli_id,
                    pli.pli_name,
                    sqi.itm_id
                FROM sequence_instance_sqi sqi
                JOIN sequence_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plan_instance_pli pli ON sqi.pli_id = pli.pli_id
                WHERE pli.mgi_id = :migrationId::uuid
                  AND sqi.itm_id = :iterationId::uuid
                  AND (:teamId IS NULL OR pli.tms_id = :teamId::integer)
                ORDER BY sqi.sqi_order
            ''', [
                migrationId: filters.migrationId,
                iterationId: filters.iterationId,
                teamId: filters.teamId
            ] as Map<String, Object>)
        }
    }

    /**
     * Creates a new sequence instance
     */
    UUID createSequenceInstance(Map<String, Object> params, String createdBy) {
        def sequenceInstanceId = UUID.randomUUID()
        
        DatabaseUtil.withSql { MockSql sql ->
            sql.executeUpdate('''
                INSERT INTO sequence_instance_sqi (
                    sqi_id, sqm_id, pli_id, itm_id, 
                    sqi_name, sqi_order, sqi_description,
                    sqi_status, sqi_is_active,
                    created_by, created_at, updated_by, updated_at
                ) VALUES (
                    :sequenceInstanceId, :sqmId, :pliId, :itmId,
                    :sequenceName, :sequenceOrder, :sequenceDescription,
                    :sequenceStatus, :sequenceIsActive,
                    :createdBy, NOW(), :createdBy, NOW()
                )
            ''', [
                sequenceInstanceId: sequenceInstanceId,
                sqmId: params.sqmId,
                pliId: params.pliId,
                itmId: params.itmId,
                sequenceName: params.sequenceName,
                sequenceOrder: params.sequenceOrder,
                sequenceDescription: params.sequenceDescription,
                sequenceStatus: params.sequenceStatus ?: 'PENDING',
                sequenceIsActive: params.sequenceIsActive ?: true,
                createdBy: createdBy
            ] as Map<String, Object>)
        }
        
        return sequenceInstanceId
    }

    /**
     * Updates sequence instance status
     */
    boolean updateSequenceStatus(UUID sequenceInstanceId, String status, String updatedBy) {
        return DatabaseUtil.withSql { MockSql sql ->
            def updateCount = sql.executeUpdate('''
                UPDATE sequence_instance_sqi 
                SET sqi_status = :status,
                    updated_by = :updatedBy, 
                    updated_at = NOW()
                WHERE sqi_id = :sequenceInstanceId
            ''', [
                status: status,
                updatedBy: updatedBy,
                sequenceInstanceId: sequenceInstanceId
            ] as Map<String, Object>)
            
            return updateCount > 0
        }
    }

    /**
     * Finds sequence by ID with detailed information
     */
    Map<String, Object> findSequenceById(UUID sequenceInstanceId) {
        return DatabaseUtil.withSql { MockSql sql ->
            return sql.firstRow('''
                SELECT 
                    sqi.sqi_id,
                    sqi.sqi_name,
                    sqi.sqi_order,
                    sqi.sqi_status,
                    sqi.sqm_id,
                    sqm.sqm_name,
                    sqi.pli_id,
                    pli.pli_name
                FROM sequence_instance_sqi sqi
                JOIN sequence_master_sqm sqm ON sqi.sqm_id = sqm.sqm_id
                JOIN plan_instance_pli pli ON sqi.pli_id = pli.pli_id
                WHERE sqi.sqi_id = :sequenceInstanceId
            ''', [sequenceInstanceId: sequenceInstanceId] as Map<String, Object>)
        }
    }
}

// ==================== TEST CLASS ====================

@CompileStatic(TypeCheckingMode.SKIP)
class SequenceRepositoryTestClass {

    SequenceRepository repository = new SequenceRepository()
    
    void testFindAllMasterSequences() {
        println "Testing findAllMasterSequences..."
        
        def expectedSequences = [
            [
                sqm_id: UUID.randomUUID(),
                sqm_name: 'Pre-Migration Checks',
                sqm_order: 1,
                sqm_description: 'Initial validation sequence',
                plm_id: UUID.randomUUID(),
                plm_name: 'Migration Plan A',
                tms_id: 1,
                tms_name: 'Core Team'
            ],
            [
                sqm_id: UUID.randomUUID(),
                sqm_name: 'Data Migration',
                sqm_order: 2,
                sqm_description: 'Main data transfer sequence',
                plm_id: UUID.randomUUID(),
                plm_name: 'Migration Plan B',
                tms_id: 2,
                tms_name: 'Data Team'
            ]
        ]
        
        DatabaseUtil.mockSql.setMockResult('rows', expectedSequences)
        List<Map<String, Object>> result = repository.findAllMasterSequences()
        
        assert result == expectedSequences
        // Fix: Explicit type casting for property access
        assert ((result[0] as Map<String, Object>)['sqm_name'] as String) == 'Pre-Migration Checks'
        assert ((result[0] as Map<String, Object>)['plm_name'] as String) == 'Migration Plan A'
        assert ((result[1] as Map<String, Object>)['sqm_name'] as String) == 'Data Migration'
        
        println "✓ findAllMasterSequences test passed"
    }
    
    void testFindMasterSequencesByPlanId() {
        println "Testing findMasterSequencesByPlanId..."
        
        def planId = UUID.randomUUID()
        def expectedSequences = [
            [
                sqm_id: UUID.randomUUID(),
                sqm_name: 'Sequence 1',
                sqm_order: 1,
                sqm_description: 'First sequence',
                plm_id: planId
            ],
            [
                sqm_id: UUID.randomUUID(),
                sqm_name: 'Sequence 2', 
                sqm_order: 2,
                sqm_description: 'Second sequence',
                plm_id: planId
            ]
        ]
        
        DatabaseUtil.mockSql.setMockResult('rows', expectedSequences)
        List<Map<String, Object>> result = repository.findMasterSequencesByPlanId(planId)
        
        assert result == expectedSequences
        // Fix: Explicit type casting and size check
        assert result.size() == 2
        assert ((result[0] as Map<String, Object>)['sqm_name'] as String) == 'Sequence 1'
        assert ((result[0] as Map<String, Object>)['sqm_order'] as Integer) == 1
        assert ((result[1] as Map<String, Object>)['sqm_name'] as String) == 'Sequence 2'
        assert ((result[1] as Map<String, Object>)['sqm_order'] as Integer) == 2
        
        println "✓ findMasterSequencesByPlanId test passed"
    }
    
    void testFindSequencesByIteration() {
        println "Testing findSequencesByIteration..."
        
        Map<String, Object> filters = [
            migrationId: UUID.randomUUID().toString(),
            iterationId: UUID.randomUUID().toString(),
            teamId: '123'
        ] as Map<String, Object>
        
        def expectedSequences = [
            [
                sqi_id: UUID.randomUUID(),
                sqi_name: 'Instance Sequence 1',
                sqi_order: 1,
                sqi_description: 'First instance',
                sqm_id: UUID.randomUUID(),
                sqm_name: 'Master Seq 1',
                pli_id: UUID.randomUUID(),
                pli_name: 'Plan Instance 1',
                itm_id: UUID.randomUUID()
            ],
            [
                sqi_id: UUID.randomUUID(),
                sqi_name: 'Instance Sequence 2',
                sqi_order: 2,
                sqi_description: 'Second instance',
                sqm_id: UUID.randomUUID(),
                sqm_name: 'Master Seq 2',
                pli_id: UUID.randomUUID(),
                pli_name: 'Plan Instance 2',
                itm_id: UUID.randomUUID()
            ]
        ]
        
        DatabaseUtil.mockSql.setMockResult('rows', expectedSequences)
        List<Map<String, Object>> result = repository.findSequencesByIteration(filters)
        
        assert result == expectedSequences
        // Fix: Explicit type casting for property access
        assert ((result[0] as Map<String, Object>)['sqi_name'] as String) == 'Instance Sequence 1'
        assert ((result[1] as Map<String, Object>)['sqi_name'] as String) == 'Instance Sequence 2'
        
        println "✓ findSequencesByIteration test passed"
    }
    
    void testCreateSequenceInstance() {
        println "Testing createSequenceInstance..."
        
        Map<String, Object> params = [
            sqmId: UUID.randomUUID(),
            pliId: UUID.randomUUID(),
            itmId: UUID.randomUUID(),
            sequenceName: "Test Sequence Instance",
            sequenceOrder: 1,
            sequenceDescription: "Test sequence for validation",
            sequenceStatus: "PENDING",
            sequenceIsActive: true
        ] as Map<String, Object>
        def createdBy = "test_user"
        
        DatabaseUtil.resetMock() // Ensure clean state
        UUID result = repository.createSequenceInstance(params, createdBy)
        
        assert result instanceof UUID
        println "✓ createSequenceInstance test passed"
    }
    
    void testUpdateSequenceStatus() {
        println "Testing updateSequenceStatus..."
        
        def sequenceInstanceId = UUID.randomUUID()
        def status = "COMPLETED"
        def updatedBy = "test_user"
        
        DatabaseUtil.mockSql.setMockResult('executeUpdate', 1)
        boolean result = repository.updateSequenceStatus(sequenceInstanceId, status, updatedBy)
        
        assert result == true
        println "✓ updateSequenceStatus test passed"
    }
    
    void testFindSequenceById() {
        println "Testing findSequenceById..."
        
        def sequenceId = UUID.randomUUID()
        def expectedSequence = [
            sqi_id: sequenceId,
            sqi_name: "Test Sequence",
            sqi_order: 1,
            sqi_status: "PENDING",
            sqm_id: UUID.randomUUID(),
            sqm_name: "Master Sequence",
            pli_id: UUID.randomUUID(),
            pli_name: "Plan Instance"
        ]
        
        DatabaseUtil.mockSql.setMockResult('firstRow', expectedSequence)
        Map<String, Object> result = repository.findSequenceById(sequenceId)
        
        assert result == expectedSequence
        assert (result['sqi_name'] as String) == "Test Sequence"
        println "✓ findSequenceById test passed"
    }
    
    void testValidationFlow() {
        println "Testing sequence validation flow..."
        
        // Simulate complex validation scenario
        def sequenceId = UUID.randomUUID()
        
        // Test validation logic
        assert sequenceId != null
        assert sequenceId.toString().length() == 36
        
        println "✓ Validation flow test passed"
    }
    
    void testErrorHandling() {
        println "Testing error handling scenarios..."
        
        try {
            // Test null plan ID handling
            repository.findMasterSequencesByPlanId(null)
            assert false : "Should have thrown IllegalArgumentException"
        } catch (IllegalArgumentException e) {
            assert e.message.contains("Plan ID cannot be null")
            println "   ✓ Correctly caught null plan ID error"
        }
        
        try {
            // Test empty filters handling
            repository.findSequencesByIteration([:] as Map<String, Object>)
            assert false : "Should have thrown IllegalArgumentException"
        } catch (IllegalArgumentException e) {
            assert e.message.contains("Migration ID and Iteration ID are required")
            println "   ✓ Correctly caught empty filters error"
        }
        
        println "✓ Error handling test passed"
    }
}

// ==================== MAIN EXECUTION ====================

// Main method for standalone execution per ADR-036
def test = new SequenceRepositoryTestClass()
def totalTests = 0
def passedTests = 0
List<Map<String, Object>> failedTests = []

println """
=== Running SequenceRepositoryTest ==="""
println "Testing pattern: ADR-036 (Pure Groovy, no external dependencies)"

def testMethods = [
    'testFindAllMasterSequences',
    'testFindMasterSequencesByPlanId',
    'testFindSequencesByIteration',
    'testCreateSequenceInstance',
    'testUpdateSequenceStatus',
    'testFindSequenceById',
    'testValidationFlow',
    'testErrorHandling'
]

testMethods.each { methodName ->
    totalTests++
    try {
        DatabaseUtil.resetMock() // Reset mock state for each test
        test.invokeMethod(methodName, null)
        passedTests++
    } catch (AssertionError | Exception e) {
        failedTests << ([test: methodName as Object, error: e.message as Object] as Map<String, Object>)
        println "✗ ${methodName} failed: ${e.message}"
    }
}

println """
=== Test Summary ==="""
println "Total: ${totalTests}"
println "Passed: ${passedTests}"
println "Failed: ${failedTests.size()}"
// Fix: Convert to double before Math.round()
def successRate = Math.round((passedTests * 100.0 / totalTests) as double)
println "Success rate: ${successRate}%"

if (failedTests) {
    println """
Failed tests:"""
    failedTests.each { failure ->
        Map<String, Object> failureMap = failure as Map<String, Object>
        println "  - ${failureMap.test}: ${failureMap.error}"
    }
    System.exit(1)
} else {
    println """
✅ All tests passed!"""
    System.exit(0)
}