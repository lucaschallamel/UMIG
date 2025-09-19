package umig.tests.unit.mock

/**
 * MockStatusService for Test Suite Migration (TD-003)
 *
 * Provides controlled status values for test isolation while maintaining compatibility
 * with the dynamic status management system. This mock ensures tests remain reliable
 * and predictable while adapting to database-driven status configuration.
 *
 * Key Features:
 * - Controlled test values that don't change unexpectedly
 * - Compatible interface with production StatusService
 * - Support for both ID-based and name-based status lookup
 * - Validation methods to ensure test data integrity
 *
 * Migration Patterns Supported:
 * - Pattern 1: Replace hardcoded switch statements
 * - Pattern 2: Replace direct status assignments
 * - Pattern 3: Provide controlled test isolation
 *
 * Created: TD-003 Phase 1 Test Suite Migration
 * Usage: Import and use in test files instead of hardcoded status strings
 */
class MockStatusService {

    // Test-controlled status mappings (stable for testing)
    // Matches original hardcoded switch statement in StepRepositoryDTOTest.groovy
    private static final Map<Integer, Map<String, String>> STATUS_BY_ID = [
        1: [id: '1', name: 'PENDING', entityType: 'Step', description: 'Step is pending execution'],
        2: [id: '2', name: 'IN_PROGRESS', entityType: 'Step', description: 'Step is currently in progress'],
        3: [id: '3', name: 'COMPLETED', entityType: 'Step', description: 'Step has been completed successfully'],
        4: [id: '4', name: 'FAILED', entityType: 'Step', description: 'Step execution failed'],
        5: [id: '5', name: 'CANCELLED', entityType: 'Step', description: 'Step execution was cancelled'],
        6: [id: '6', name: 'BLOCKED', entityType: 'Step', description: 'Step is blocked by dependencies']
    ]

    private static final Map<String, Map<String, String>> STATUS_BY_NAME = [
        'PENDING': STATUS_BY_ID[1],
        'IN_PROGRESS': STATUS_BY_ID[2],
        'COMPLETED': STATUS_BY_ID[3],
        'FAILED': STATUS_BY_ID[4],
        'CANCELLED': STATUS_BY_ID[5],
        'BLOCKED': STATUS_BY_ID[6]
    ]

    /**
     * Get status by ID and entity type (Migration Pattern 1)
     * Replaces hardcoded switch statements: case 1: return "PENDING"
     */
    static Map<String, String> getStatusByIdAndType(Integer statusId, String entityType = 'Step') {
        if (!statusId || !entityType) {
            return null
        }

        Map<String, String> status = STATUS_BY_ID[statusId]
        if (status && status.entityType == entityType) {
            return status
        }

        return null
    }

    /**
     * Get status name by ID (Migration Pattern 1 - simplified)
     * Direct replacement for mapStatusToString(Integer status) methods
     */
    static String getStatusNameById(Integer statusId) {
        Map<String, String> status = getStatusByIdAndType(statusId, 'Step')
        return status?.name ?: 'UNKNOWN'
    }

    /**
     * Get default status for entity type (Migration Pattern 2)
     * Replaces direct status assignments: dto.stepStatus = 'IN_PROGRESS'
     */
    static String getDefaultStatus(String entityType = 'Step') {
        return 'PENDING' // Controlled test default
    }

    /**
     * Get status by name (Migration Pattern 2)
     * For tests that need to lookup status details by name
     */
    static Map<String, String> getStatusByName(String statusName, String entityType = 'Step') {
        if (!statusName || !entityType) {
            return null
        }

        Map<String, String> status = STATUS_BY_NAME[statusName.toUpperCase()]
        if (status && status.entityType == entityType) {
            return status
        }

        return null
    }

    /**
     * Validate status exists (Migration Pattern 3)
     * Ensures test data uses valid status values
     */
    static boolean validateStatus(String statusName, String entityType = 'Step') {
        if (!statusName || !entityType) {
            return false
        }

        return STATUS_BY_NAME.containsKey(statusName.toUpperCase())
    }

    /**
     * Validate status ID exists (Migration Pattern 3)
     */
    static boolean validateStatusId(Integer statusId, String entityType = 'Step') {
        return getStatusByIdAndType(statusId, entityType) != null
    }

    /**
     * Get all available statuses for testing (Migration Pattern 3)
     * Useful for comprehensive test coverage
     */
    static List<String> getAllStatusNames(String entityType = 'Step') {
        return STATUS_BY_NAME.keySet() as List<String>
    }

    /**
     * Get all available status IDs for testing
     */
    static List<Integer> getAllStatusIds(String entityType = 'Step') {
        return STATUS_BY_ID.keySet() as List<Integer>
    }

    /**
     * Controlled status transition testing
     * Provides predictable status progression for workflow testing
     */
    static String getNextStatus(String currentStatus) {
        switch(currentStatus?.toUpperCase()) {
            case 'PENDING': return 'IN_PROGRESS'
            case 'IN_PROGRESS': return 'COMPLETED'
            case 'COMPLETED': return 'COMPLETED' // Terminal state
            case 'FAILED': return 'PENDING' // Retry workflow
            case 'BLOCKED': return 'PENDING' // Unblock workflow
            case 'CANCELLED': return 'PENDING' // Restart workflow
            default: return 'PENDING'
        }
    }

    /**
     * Check if status is terminal (cannot transition)
     */
    static boolean isTerminalStatus(String statusName) {
        return statusName?.toUpperCase() in ['COMPLETED', 'CANCELLED']
    }

    /**
     * Get status display color for UI testing (optional enhancement)
     */
    static String getStatusColor(String statusName) {
        switch(statusName?.toUpperCase()) {
            case 'PENDING': return '#FFA500' // Orange
            case 'IN_PROGRESS': return '#007BFF' // Blue
            case 'COMPLETED': return '#28A745' // Green
            case 'FAILED': return '#DC3545' // Red
            case 'CANCELLED': return '#6C757D' // Gray
            case 'BLOCKED': return '#6C757D' // Gray
            default: return '#6C757D'
        }
    }

    /**
     * Reset mock state (for test cleanup if needed)
     */
    static void reset() {
        // Currently no internal state to reset
        // Placeholder for future stateful mock features
    }

    /**
     * Quick validation test for MockStatusService
     */
    static void main(String[] args) {
        println "=== MockStatusService Validation Test ==="

        try {
            // Test basic functionality
            assert getStatusNameById(1) == 'PENDING'
            assert getStatusNameById(2) == 'IN_PROGRESS'
            assert getStatusNameById(3) == 'COMPLETED'

            assert getDefaultStatus('Step') == 'PENDING'

            assert validateStatus('IN_PROGRESS', 'Step') == true
            assert validateStatus('INVALID_STATUS', 'Step') == false

            assert getStatusByIdAndType(2, 'Step').name == 'IN_PROGRESS'
            assert getStatusByName('COMPLETED', 'Step').id == '3'

            println "✅ All MockStatusService functions working correctly"
            println "✅ TD-003 Migration patterns ready for implementation"

        } catch (Exception e) {
            println "❌ MockStatusService validation failed: ${e.message}"
            System.exit(1)
        }
    }
}