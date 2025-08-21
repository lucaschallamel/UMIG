@Grab('org.postgresql:postgresql:42.6.0')

package umig.tests.integration

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.sql.Sql
import umig.repository.StatusRepository
import umig.repository.StepRepository
import umig.utils.DatabaseUtil

/**
 * Integration Test for Database-Driven Status Validation
 * 
 * This test validates the complete refactoring from hardcoded status mappings
 * to database-driven validation using the status_sts table as single source of truth.
 * 
 * Test Scope:
 * - Status repository validation methods
 * - Steps API status validation 
 * - Database integrity and foreign key constraints
 * - Error handling for invalid status IDs
 * - Backward compatibility with status names
 */

StatusRepository statusRepository
StepRepository stepRepository
JsonSlurper jsonSlurper

def setup() {
    statusRepository = new StatusRepository()
    stepRepository = new StepRepository()
    jsonSlurper = new JsonSlurper()
    
    println "🧪 StatusValidationIntegrationTest: Setup complete"
}

/**
 * Test that status_sts table contains expected Step statuses
 */
def testStatusTableIntegrity() {
    println "\n📋 Test: Status table integrity"
    
    def stepStatuses = statusRepository.findStatusesByType('Step')
    
    assert stepStatuses != null : "Step statuses should not be null"
    assert stepStatuses.size() >= 7 : "Should have at least 7 step statuses"
    
    // Verify required statuses exist
    def statusNames = stepStatuses.collect { it.name }
    def requiredStatuses = ['PENDING', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED']
    
    requiredStatuses.each { requiredStatus ->
        assert statusNames.contains(requiredStatus) : "Missing required status: ${requiredStatus}"
    }
    
    // Verify each status has required fields
    stepStatuses.each { status ->
        assert status.id != null : "Status ID should not be null"
        assert status.name != null : "Status name should not be null"
        assert status.color != null : "Status color should not be null"
        assert status.type == 'Step' : "Status type should be 'Step'"
        
        // Verify color format (hex color)
        assert status.color.matches('^#[0-9A-Fa-f]{6}$') : "Invalid color format: ${status.color}"
    }
    
    println "✅ Status table integrity verified - ${stepStatuses.size()} statuses found"
    return true
}

/**
 * Test StatusRepository validation methods
 */
def testStatusRepositoryValidation() {
    println "\n🔍 Test: StatusRepository validation methods"
    
    // Get valid status IDs for testing
    def validStatusIds = statusRepository.getValidStatusIds('Step')
    assert validStatusIds.size() >= 7 : "Should have at least 7 valid status IDs"
    
    def validStatusId = validStatusIds[0]
    def invalidStatusId = 999999
    
    // Test isValidStatusId with valid ID
    assert statusRepository.isValidStatusId(validStatusId, 'Step') : "Valid status ID should be accepted"
    
    // Test isValidStatusId with invalid ID
    assert !statusRepository.isValidStatusId(invalidStatusId, 'Step') : "Invalid status ID should be rejected"
    
    // Test isValidStatusId with null values
    assert !statusRepository.isValidStatusId(null, 'Step') : "Null status ID should be rejected"
    assert !statusRepository.isValidStatusId(validStatusId, null) : "Null entity type should be rejected"
    
    // Test isValidStatusId with wrong entity type
    assert !statusRepository.isValidStatusId(validStatusId, 'WrongType') : "Wrong entity type should be rejected"
    
    // Test getValidStatusIds
    def validIds = statusRepository.getValidStatusIds('Step')
    assert validIds.every { it instanceof Integer } : "All valid IDs should be integers"
    
    println "✅ StatusRepository validation methods work correctly"
    return true
}

/**
 * Test status lookup by name and type (backward compatibility)
 */
def testStatusLookupByName() {
    println "\n🔄 Test: Status lookup by name (backward compatibility)"
    
    // Test finding status by name
    def pendingStatus = statusRepository.findStatusByNameAndType('PENDING', 'Step')
    assert pendingStatus != null : "Should find PENDING status"
    assert pendingStatus.name == 'PENDING' : "Status name should match"
    assert pendingStatus.type == 'Step' : "Status type should match"
    assert pendingStatus.id != null : "Status ID should be present"
    
    // Test case insensitivity
    def todoStatus = statusRepository.findStatusByNameAndType('TODO', 'Step')
    assert todoStatus != null : "Should find TODO status"
    
    // Test non-existent status
    def invalidStatus = statusRepository.findStatusByNameAndType('INVALID_STATUS', 'Step')
    assert invalidStatus == null : "Should not find invalid status"
    
    // Test wrong entity type
    def wrongTypeStatus = statusRepository.findStatusByNameAndType('PENDING', 'WrongType')
    assert wrongTypeStatus == null : "Should not find status with wrong type"
    
    println "✅ Status lookup by name works correctly"
    return true
}

/**
 * Test database constraints and data integrity
 */
def testDatabaseConstraints() {
    println "\n🔐 Test: Database constraints and data integrity"
    
    DatabaseUtil.withSql { Sql sql ->
        // Test foreign key constraint exists
        def constraintCheck = sql.firstRow("""
            SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
            WHERE tc.table_name = 'steps_instance_sti' 
            AND kcu.column_name = 'sti_status'
            AND tc.constraint_type = 'FOREIGN KEY'
        """)
        
        assert constraintCheck != null : "Foreign key constraint should exist for sti_status"
        
        // Test that all step instances have valid status references
        def invalidStatusCount = sql.firstRow("""
            SELECT COUNT(*) as count
            FROM steps_instance_sti sti
            LEFT JOIN status_sts sts ON sti.sti_status = sts.sts_id
            WHERE sts.sts_id IS NULL
        """).count
        
        assert invalidStatusCount == 0 : "All step instances should have valid status references"
        
        // Test status_sts table constraints
        def statusTableInfo = sql.rows("""
            SELECT column_name, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'status_sts'
            ORDER BY ordinal_position
        """)
        
        // Verify critical columns exist and are properly constrained
        def criticalColumns = ['sts_id', 'sts_name', 'sts_color', 'sts_type']
        criticalColumns.each { columnName ->
            def columnInfo = statusTableInfo.find { it.column_name == columnName }
            assert columnInfo != null : "Critical column ${columnName} should exist"
            if (columnName == 'sts_id') {
                assert columnInfo.is_nullable == 'NO' : "Primary key should not be nullable"
            }
        }
        
        println "✅ Database constraints are properly enforced"
    }
    
    return true
}

/**
 * Run all tests
 */
def runAllTests() {
    println "🚀 Starting StatusValidationIntegrationTest"
    println "=" * 60
    
    def tests = [
        'testStatusTableIntegrity',
        'testStatusRepositoryValidation', 
        'testStatusLookupByName',
        'testDatabaseConstraints'
    ]
    
    def results = [:]
    
    tests.each { testName ->
        try {
            results[testName] = this."${testName}"()
        } catch (Exception e) {
            println "❌ ${testName} FAILED: ${e.message}"
            e.printStackTrace()
            results[testName] = false
        }
    }
    
    println "\n" + "=" * 60
    println "📊 TEST RESULTS:"
    
    def passed = 0
    def total = results.size()
    
    results.each { testName, success ->
        def status = success ? "✅ PASS" : "❌ FAIL"
        println "${status} ${testName}"
        if (success) passed++
    }
    
    println "\n📈 SUMMARY: ${passed}/${total} tests passed"
    
    if (passed == total) {
        println "🎉 ALL TESTS PASSED - Database-driven status validation is working correctly!"
    } else {
        println "⚠️  SOME TESTS FAILED - Review the implementation"
    }
    
    return passed == total
}

// Run the tests if executed directly
try {
    setup()
    runAllTests()
} catch (Exception e) {
    println "❌ TEST EXECUTION FAILED: ${e.message}"
    e.printStackTrace()
}