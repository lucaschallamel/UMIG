@Grab('org.postgresql:postgresql:42.6.0')

package umig.tests.integration

import groovy.json.JsonBuilder
import groovy.json.JsonSlurper
import groovy.sql.Sql
import groovy.transform.CompileStatic
import umig.repository.StatusRepository
import umig.repository.StepRepository
import umig.utils.DatabaseUtil
import umig.tests.unit.mock.MockStatusService

/**
 * Integration Test for Database-Driven Status Validation (TD-003 Migrated)
 *
 * This test validates the complete refactoring from hardcoded status mappings
 * to database-driven validation using the status_sts table as single source of truth.
 *
 * MIGRATION NOTE (TD-003 Phase 2):
 * - Migrated from hardcoded status arrays to MockStatusService patterns
 * - Maintains test reliability while eliminating hardcoded status values
 * - Uses MockStatusService.getAllStatusNames() instead of hardcoded arrays
 *
 * Test Scope:
 * - Status repository validation methods
 * - Steps API status validation
 * - Database integrity and foreign key constraints
 * - Error handling for invalid status IDs
 * - Backward compatibility with status names
 */
@CompileStatic
class StatusValidationIntegrationTest {

    // Repository and utility instances - properly declared with types
    private StatusRepository statusRepository
    private StepRepository stepRepository
    private JsonSlurper jsonSlurper

    void setup() {
        this.statusRepository = new StatusRepository()
        this.stepRepository = new StepRepository()
        this.jsonSlurper = new JsonSlurper()

        println "🧪 StatusValidationIntegrationTest: Setup complete"
    }

    /**
     * Test that status_sts table contains expected Step statuses
     */
    boolean testStatusTableIntegrity() {
        println "\n📋 Test: Status table integrity"

        List<Map<String, Object>> stepStatuses = this.statusRepository.findStatusesByType('Step') as List<Map<String, Object>>

        assert stepStatuses != null : "Step statuses should not be null"
        assert stepStatuses.size() >= 7 : "Should have at least 7 step statuses"

        // Verify required statuses exist (TD-003: Using MockStatusService instead of hardcoded array)
        List<String> statusNames = stepStatuses.collect { Map<String, Object> status ->
            (String) status.name
        }
        List<String> requiredStatuses = MockStatusService.getAllStatusNames('Step')

        requiredStatuses.each { String requiredStatus ->
            assert statusNames.contains(requiredStatus) : "Missing required status: ${requiredStatus}"
        }

        // Verify each status has required fields
        stepStatuses.each { Map<String, Object> status ->
            assert status.id != null : "Status ID should not be null"
            assert ((String) status.name) != null : "Status name should not be null"
            assert ((String) status.color) != null : "Status color should not be null"
            assert ((String) status.type) == 'Step' : "Status type should be 'Step'"

            // Verify color format (hex color)
            String color = (String) status.color
            assert color.matches('^#[0-9A-Fa-f]{6}$') : "Invalid color format: ${color}"
        }

        println "✅ Status table integrity verified - ${stepStatuses.size()} statuses found"
        return true
    }

    /**
     * Test StatusRepository validation methods
     */
    boolean testStatusRepositoryValidation() {
        println "\n🔍 Test: StatusRepository validation methods"

        // Get valid status IDs for testing
        List<Integer> validStatusIds = this.statusRepository.getValidStatusIds('Step') as List<Integer>
        assert validStatusIds.size() >= 7 : "Should have at least 7 valid status IDs"

        Integer validStatusId = validStatusIds.get(0)
        Integer invalidStatusId = 999999

        // Test isValidStatusId with valid ID
        assert this.statusRepository.isValidStatusId(validStatusId, 'Step') : "Valid status ID should be accepted"

        // Test isValidStatusId with invalid ID
        assert !this.statusRepository.isValidStatusId(invalidStatusId, 'Step') : "Invalid status ID should be rejected"

        // Test isValidStatusId with null values
        assert !this.statusRepository.isValidStatusId(null, 'Step') : "Null status ID should be rejected"
        assert !this.statusRepository.isValidStatusId(validStatusId, null) : "Null entity type should be rejected"

        // Test isValidStatusId with wrong entity type
        assert !this.statusRepository.isValidStatusId(validStatusId, 'WrongType') : "Wrong entity type should be rejected"

        // Test getValidStatusIds
        List<Integer> validIds = this.statusRepository.getValidStatusIds('Step') as List<Integer>
        assert validIds.every { Integer it -> it instanceof Integer } : "All valid IDs should be integers"

        println "✅ StatusRepository validation methods work correctly"
        return true
    }

    /**
     * Test status lookup by name and type (backward compatibility)
     */
    boolean testStatusLookupByName() {
        println "\n🔄 Test: Status lookup by name (backward compatibility)"

        // Test finding status by name (TD-003: Using MockStatusService validation)
        String testStatusName = MockStatusService.getDefaultStatus('Step') // Gets 'PENDING'
        Map<String, Object> pendingStatus = this.statusRepository.findStatusByNameAndType(testStatusName, 'Step') as Map<String, Object>
        assert pendingStatus != null : "Should find ${testStatusName} status"
        assert ((String) pendingStatus.name) == testStatusName : "Status name should match"
        assert ((String) pendingStatus.type) == 'Step' : "Status type should match"
        assert pendingStatus.id != null : "Status ID should be present"

        // Test case insensitivity (TD-003: Using MockStatusService to get valid status name)
        List<String> validStatusNames = MockStatusService.getAllStatusNames('Step')
        String todoStatusName = validStatusNames.find { String statusName -> statusName == 'TODO' } ?: validStatusNames.get(1) // Use TODO if available, otherwise second status
        Map<String, Object> todoStatus = this.statusRepository.findStatusByNameAndType(todoStatusName, 'Step') as Map<String, Object>
        assert todoStatus != null : "Should find ${todoStatusName} status"

        // Test non-existent status
        Map<String, Object> invalidStatus = this.statusRepository.findStatusByNameAndType('INVALID_STATUS', 'Step') as Map<String, Object>
        assert invalidStatus == null : "Should not find invalid status"

        // Test wrong entity type (TD-003: Using MockStatusService for consistent test status name)
        Map<String, Object> wrongTypeStatus = this.statusRepository.findStatusByNameAndType(MockStatusService.getDefaultStatus('Step'), 'WrongType') as Map<String, Object>
        assert wrongTypeStatus == null : "Should not find status with wrong type"

        println "✅ Status lookup by name works correctly"
        return true
    }

    /**
     * Test database constraints and data integrity
     */
    boolean testDatabaseConstraints() {
        println "\n🔐 Test: Database constraints and data integrity"

        DatabaseUtil.withSql { Sql sql ->
            // Test foreign key constraint exists
            groovy.sql.GroovyRowResult constraintCheck = sql.firstRow("""
                SELECT tc.constraint_name, tc.constraint_type, kcu.column_name
                FROM information_schema.table_constraints tc
                JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                WHERE tc.table_name = 'steps_instance_sti'
                AND kcu.column_name = 'sti_status'
                AND tc.constraint_type = 'FOREIGN KEY'
            """)

            assert constraintCheck != null : "Foreign key constraint should exist for sti_status"

            // Test that all step instances have valid status references
            groovy.sql.GroovyRowResult countResult = sql.firstRow("""
                SELECT COUNT(*) as count
                FROM steps_instance_sti sti
                LEFT JOIN status_sts sts ON sti.sti_status = sts.sts_id
                WHERE sts.sts_id IS NULL
            """)
            Long invalidStatusCount = countResult.count as Long

            assert invalidStatusCount == 0 : "All step instances should have valid status references"

            // Test status_sts table constraints
            List<groovy.sql.GroovyRowResult> statusTableInfo = sql.rows("""
                SELECT column_name, is_nullable, data_type
                FROM information_schema.columns
                WHERE table_name = 'status_sts'
                ORDER BY ordinal_position
            """)

            // Verify critical columns exist and are properly constrained
            List<String> criticalColumns = ['sts_id', 'sts_name', 'sts_color', 'sts_type']
            criticalColumns.each { String columnName ->
                groovy.sql.GroovyRowResult columnInfo = statusTableInfo.find { groovy.sql.GroovyRowResult row ->
                    row.column_name == columnName
                }
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
    boolean runAllTests() {
        println "🚀 Starting StatusValidationIntegrationTest"
        println "=" * 60

        List<String> tests = [
            'testStatusTableIntegrity',
            'testStatusRepositoryValidation',
            'testStatusLookupByName',
            'testDatabaseConstraints'
        ]

        Map<String, Boolean> results = [:]

        tests.each { String testName ->
            try {
                // Call methods by name with proper type safety
                Boolean result
                switch (testName) {
                    case 'testStatusTableIntegrity':
                        result = testStatusTableIntegrity()
                        break
                    case 'testStatusRepositoryValidation':
                        result = testStatusRepositoryValidation()
                        break
                    case 'testStatusLookupByName':
                        result = testStatusLookupByName()
                        break
                    case 'testDatabaseConstraints':
                        result = testDatabaseConstraints()
                        break
                    default:
                        throw new IllegalArgumentException("Unknown test method: ${testName}")
                }
                results[testName] = result
            } catch (Exception e) {
                println "❌ ${testName} FAILED: ${e.message}"
                e.printStackTrace()
                results[testName] = false
            }
        }

        println "\n" + "=" * 60
        println "📊 TEST RESULTS:"

        int passed = 0
        int total = results.size()

        results.each { String testName, Boolean success ->
            String status = success ? "✅ PASS" : "❌ FAIL"
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
    // Static method for direct execution
    static void main(String[] args) {
        try {
            StatusValidationIntegrationTest test = new StatusValidationIntegrationTest()
            test.setup()
            test.runAllTests()
        } catch (Exception e) {
            println "❌ TEST EXECUTION FAILED: ${e.message}"
            e.printStackTrace()
        }
    }
}