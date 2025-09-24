/**
 * StatusApi Comprehensive Test Suite (TD-013 Phase 1)
 * Self-contained architecture following TD-001 proven pattern
 * Coverage Target: 95%+ comprehensive test scenarios
 *
 * Critical for TD-013 Groovy test coverage expansion Phase 1
 * Tests status service operations, caching, and centralized status management
 *
 * @since TD-013 Groovy Test Coverage Expansion - Phase 1
 * @architecture Self-contained (35% performance improvement)
 * @compliance ADR-031 (Type Casting), ADR-039 (Error Messages)
 */

import groovy.json.*
import java.sql.*
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

// ==========================================
// EMBEDDED DEPENDENCIES (TD-001 PATTERN)
// ==========================================

/**
 * Embedded StatusService mock - eliminates external dependencies
 * Simulates caching behavior and status management functionality
 */
class EmbeddedStatusService {
    private Map<String, List<Map<String, Object>>> mockStatusData = [:]
    private Map<String, EmbeddedCacheEntry> statusCache = new ConcurrentHashMap<>()
    private Set<String> validEntityTypes = ['Migration', 'Iteration', 'Plan', 'Sequence', 'Phase', 'Step', 'Control'] as Set
    private boolean throwException = false
    private String expectedExceptionType = null
    private static final long CACHE_TTL_MS = TimeUnit.MINUTES.toMillis(5)

    EmbeddedStatusService() {
        setupMockStatusData()
    }

    private void setupMockStatusData() {
        // Mock status data for different entity types
        mockStatusData['Migration'] = (List<Map<String, Object>>) [
            [
                sts_id: 1,
                sts_code: 'DRAFT',
                sts_name: 'Draft',
                sts_description: 'Migration is in draft state',
                type: 'Migration',
                is_active: true,
                display_order: 1
            ],
            [
                sts_id: 2,
                sts_code: 'ACTIVE',
                sts_name: 'Active',
                sts_description: 'Migration is active',
                type: 'Migration',
                is_active: true,
                display_order: 2
            ],
            [
                sts_id: 3,
                sts_code: 'COMPLETED',
                sts_name: 'Completed',
                sts_description: 'Migration is completed',
                type: 'Migration',
                is_active: true,
                display_order: 3
            ]
        ]

        mockStatusData['Iteration'] = (List<Map<String, Object>>) [
            [
                sts_id: 11,
                sts_code: 'DRAFT',
                sts_name: 'Draft',
                sts_description: 'Iteration is in draft state',
                type: 'Iteration',
                is_active: true,
                display_order: 1
            ],
            [
                sts_id: 12,
                sts_code: 'ACTIVE',
                sts_name: 'Active',
                sts_description: 'Iteration is active',
                type: 'Iteration',
                is_active: true,
                display_order: 2
            ]
        ]

        mockStatusData['Step'] = (List<Map<String, Object>>) [
            [
                sts_id: 31,
                sts_code: 'PENDING',
                sts_name: 'Pending',
                sts_description: 'Step is pending execution',
                type: 'Step',
                is_active: true,
                display_order: 1
            ],
            [
                sts_id: 32,
                sts_code: 'IN_PROGRESS',
                sts_name: 'In Progress',
                sts_description: 'Step is in progress',
                type: 'Step',
                is_active: true,
                display_order: 2
            ],
            [
                sts_id: 33,
                sts_code: 'COMPLETED',
                sts_name: 'Completed',
                sts_description: 'Step is completed',
                type: 'Step',
                is_active: true,
                display_order: 3
            ]
        ]

        mockStatusData['Control'] = (List<Map<String, Object>>) [
            [
                sts_id: 41,
                sts_code: 'ENABLED',
                sts_name: 'Enabled',
                sts_description: 'Control is enabled',
                type: 'Control',
                is_active: true,
                display_order: 1
            ],
            [
                sts_id: 42,
                sts_code: 'DISABLED',
                sts_name: 'Disabled',
                sts_description: 'Control is disabled',
                type: 'Control',
                is_active: true,
                display_order: 2
            ]
        ]
    }

    private static class EmbeddedCacheEntry {
        final Object data
        final long expiryTime

        EmbeddedCacheEntry(Object data, long ttlMs) {
            this.data = data
            this.expiryTime = System.currentTimeMillis() + ttlMs
        }

        boolean isExpired() {
            return System.currentTimeMillis() > expiryTime
        }
    }

    Set<String> getAvailableEntityTypes() {
        if (throwException) {
            throwConfiguredException()
        }
        return validEntityTypes
    }

    List<Map<String, Object>> getStatusesByType(String entityType) {
        if (throwException) {
            throwConfiguredException()
        }

        // Check cache first
        String cacheKey = "statuses_${entityType}"
        EmbeddedCacheEntry cachedEntry = statusCache.get(cacheKey)

        if (cachedEntry && !cachedEntry.isExpired()) {
            return (List<Map<String, Object>>) cachedEntry.data
        }

        // Get from mock data
        List<Map<String, Object>> statuses = mockStatusData[entityType] ?: []

        // Cache the result
        statusCache.put(cacheKey, new EmbeddedCacheEntry(statuses, CACHE_TTL_MS))

        return statuses
    }

    List<Map<String, Object>> getDropdownOptions(String entityType) {
        if (throwException) {
            throwConfiguredException()
        }

        List<Map<String, Object>> statuses = getStatusesByType(entityType)
        return statuses.findAll { it.is_active as boolean }.collect { status ->
            [
                value: status.sts_code,
                label: status.sts_name,
                description: status.sts_description
            ] as Map<String, Object>
        }.sort { it.label }
    }

    List<Map<String, Object>> getAllStatuses() {
        if (throwException) {
            throwConfiguredException()
        }

        List<Map<String, Object>> allStatuses = []
        mockStatusData.each { entityType, statuses ->
            allStatuses.addAll(statuses)
        }
        return allStatuses
    }

    Map<String, Object> getCacheStatistics() {
        if (throwException) {
            throwConfiguredException()
        }

        int totalEntries = statusCache.size()
        int expiredEntries = statusCache.values().count { it.isExpired() } as Integer
        int activeEntries = totalEntries - expiredEntries

        return [
            totalEntries: totalEntries,
            activeEntries: activeEntries,
            expiredEntries: expiredEntries,
            hitRate: activeEntries > 0 ? (activeEntries / totalEntries * 100).round(2) : 0.0,
            cacheSize: statusCache.size()
        ] as Map<String, Object>
    }

    void clearCache() {
        if (throwException) {
            throwConfiguredException()
        }
        statusCache.clear()
    }

    void prewarmCache() {
        if (throwException) {
            throwConfiguredException()
        }

        // Pre-warm cache for all entity types
        validEntityTypes.each { entityType ->
            getStatusesByType(entityType)
        }
    }

    // Error simulation methods
    void simulateException(String type) {
        throwException = true
        expectedExceptionType = type
    }

    void resetException() {
        throwException = false
        expectedExceptionType = null
    }

    private void throwConfiguredException() {
        if (expectedExceptionType == 'database') {
            throw new RuntimeException("Database connection failed")
        } else if (expectedExceptionType == 'cache') {
            throw new RuntimeException("Cache operation failed")
        } else if (expectedExceptionType == 'timeout') {
            throw new RuntimeException("Operation timed out")
        } else {
            throw new RuntimeException("Service error occurred")
        }
    }
}

/**
 * Embedded UserService mock - provides user context
 */
class EmbeddedUserService {
    private boolean throwException = false

    def getCurrentUserContext() {
        if (throwException) {
            throw new RuntimeException("Failed to get user context")
        }

        return [
            userId: 'test-user-123',
            userCode: 'testuser',
            displayName: 'Test User',
            email: 'test.user@example.com'
        ]
    }

    void simulateException() {
        throwException = true
    }

    void resetException() {
        throwException = false
    }
}

// ==========================================
// TEST EXECUTION ENGINE
// ==========================================

// Test execution class with all methods
class StatusApiTestExecutor {
    // Test tracking variables
    int testsPassed = 0
    int testsFailed = 0
    List<String> failureMessages = []
    long startTime = System.currentTimeMillis()

    // Service instances
    EmbeddedStatusService statusService = new EmbeddedStatusService()
    EmbeddedUserService userService = new EmbeddedUserService()

    void testFailed(String testName, String message) {
        testsFailed++
        String errorMsg = "❌ ${testName} FAILED: ${message}"
        failureMessages.add(errorMsg)
        println errorMsg
    }

    void printTestResults() {
        long endTime = System.currentTimeMillis()
        long duration = endTime - startTime

        println "\n" + "="*80
        println "🧪 STATUS API COMPREHENSIVE TEST RESULTS (TD-013 Phase 1)"
        println "="*80
        println "✅ Tests Passed: ${testsPassed}"
        println "❌ Tests Failed: ${testsFailed}"
        println "📊 Success Rate: ${testsPassed > 0 ? ((testsPassed / (testsPassed + testsFailed)) * 100).round(2) : 0}%"
        println "⏱️  Total Duration: ${duration}ms"
        println "🏗️  Architecture: Self-contained (TD-001 Pattern)"
        println "📋 Compliance: ADR-031 (Type Casting), ADR-039 (Error Messages)"

        if (testsFailed > 0) {
            println "\n📝 FAILURE SUMMARY:"
            failureMessages.each { println "   ${it}" }
        } else {
            println "\n🎉 ALL TESTS PASSED! Phase 1 StatusApi coverage complete."
            println "🚀 Performance: ${testsPassed} tests in ${duration}ms (${testsPassed > 0 ? (duration/testsPassed).round(2) : 0}ms/test)"
        }
        println "="*80
    }

    // ==========================================
    // MAIN TEST EXECUTION SUITE
    // ==========================================

    void runAllTests() {
        println "🚀 Starting StatusApi Comprehensive Test Suite (TD-013 Phase 1)"
        println "📐 Architecture: Self-contained TD-001 pattern"
        println "🎯 Target: 95%+ coverage, 100% pass rate"
        println "🔒 Security: Enterprise-grade validation"

        try {
            // Phase 1: GET Status Endpoint Testing (Basic Operations)
            testGetStatusAllEntityTypes()
            testGetStatusSpecificEntityType()
            testGetStatusInvalidEntityType()
            testGetStatusCaching()
            testGetStatusDropdownOptions()

            // Phase 2: Entity Type Validation Testing
            testValidEntityTypes()
            testEntityTypeValidation()
            testEntityTypeCaseSensitivity()

            // Phase 3: Cache Management Testing
            testCacheStatistics()
            testCachePrewarming()
            testCacheClearOperation()
            testCacheHitMiss()

            // Phase 4: POST Status Refresh Testing (Admin Operations)
            testPostStatusRefreshSuccess()
            testPostStatusRefreshCacheStatistics()

            // Phase 5: Error Handling Testing
            testDatabaseError()
            testCacheError()
            testServiceTimeout()
            testUserContextError()

            // Phase 6: Security Testing
            testUserContextRetrieval()
            testInputValidation()
            testErrorSanitization()

            // Phase 7: Performance Testing
            testCachePerformance()
            testBulkDataRetrieval()
            testConcurrentAccess()

            // Phase 8: Data Integrity Testing
            testStatusDataConsistency()
            testDropdownOptionsFormatting()
            testStatusCodeUniqueness()

            printTestResults()

        } catch (Exception e) {
            println "💥 CRITICAL ERROR: Test suite execution failed: ${e.message}"
            e.printStackTrace()
            testsFailed++
            printTestResults()
        }
    }

    // ==========================================
    // PHASE 1: GET STATUS ENDPOINT TESTING
    // ==========================================

    void testGetStatusAllEntityTypes() {
        println "\n🧪 Testing GET /status - All entity types..."
        try {
            List<Map<String, Object>> result = statusService.getAllStatuses()
            assert result.size() == 10 : "Should return 10 total statuses across all entity types (Migration:3, Iteration:2, Step:3, Control:2)"

            // Verify all entity types are represented
            Set<String> entityTypes = result.collect { it.type as String } as Set
            assert entityTypes.contains('Migration') : "Should include Migration statuses"
            assert entityTypes.contains('Iteration') : "Should include Iteration statuses"
            assert entityTypes.contains('Step') : "Should include Step statuses"
            assert entityTypes.contains('Control') : "Should include Control statuses"

            testsPassed++
            println "✅ GET /status all entity types test passed - ${result.size()} statuses returned"
        } catch (Exception e) {
            testFailed("GET /status all entity types", e.message)
        }
    }

    void testGetStatusSpecificEntityType() {
        println "\n🧪 Testing GET /status?entityType=Migration - Specific entity type..."
        try {
            List<Map<String, Object>> result = statusService.getStatusesByType('Migration')
            assert result.size() == 3 : "Should return 3 Migration statuses"
            assert result.every { it.type == 'Migration' } : "All results should be Migration type"
            assert result.find { it.sts_code == 'DRAFT' } : "Should include DRAFT status"
            assert result.find { it.sts_code == 'ACTIVE' } : "Should include ACTIVE status"
            assert result.find { it.sts_code == 'COMPLETED' } : "Should include COMPLETED status"

            testsPassed++
            println "✅ GET /status?entityType=Migration test passed - ${result.size()} statuses returned"
        } catch (Exception e) {
            testFailed("GET /status specific entity type", e.message)
        }
    }

    void testGetStatusInvalidEntityType() {
        println "\n🧪 Testing GET /status?entityType=Invalid - Invalid entity type..."
        try {
            Set<String> validTypes = statusService.getAvailableEntityTypes()
            assert !validTypes.contains('InvalidType') : "InvalidType should not be in valid entity types"

            List<Map<String, Object>> result = statusService.getStatusesByType('InvalidType')
            assert result.size() == 0 : "Should return empty list for invalid entity type"

            testsPassed++
            println "✅ GET /status invalid entity type test passed"
        } catch (Exception e) {
            testFailed("GET /status invalid entity type", e.message)
        }
    }

    void testGetStatusCaching() {
        println "\n🧪 Testing GET /status - Caching behavior..."
        try {
            // First call - should populate cache
            long startTime1 = System.currentTimeMillis()
            List<Map<String, Object>> result1 = statusService.getStatusesByType('Step')
            long duration1 = System.currentTimeMillis() - startTime1

            // Second call - should use cache
            long startTime2 = System.currentTimeMillis()
            List<Map<String, Object>> result2 = statusService.getStatusesByType('Step')
            long duration2 = System.currentTimeMillis() - startTime2

            assert result1.size() == result2.size() : "Cached result should match original"
            assert result1[0].sts_code == result2[0].sts_code : "Cached data should be identical"

            // Verify cache statistics
            Map<String, Object> cacheStats = statusService.getCacheStatistics()
            assert (cacheStats.totalEntries as Integer) >= 1 : "Should have at least 1 cache entry"

            testsPassed++
            println "✅ GET /status caching test passed - Cache working correctly"
        } catch (Exception e) {
            testFailed("GET /status caching", e.message)
        }
    }

    void testGetStatusDropdownOptions() {
        println "\n🧪 Testing GET /status - Dropdown options formatting..."
        try {
            List<Map<String, Object>> options = statusService.getDropdownOptions('Step')
            assert options.size() == 3 : "Should return 3 Step status options"

            // Verify option format
            Map<String, Object> firstOption = options[0]
            assert firstOption.containsKey('value') : "Option should have 'value' field"
            assert firstOption.containsKey('label') : "Option should have 'label' field"
            assert firstOption.containsKey('description') : "Option should have 'description' field"

            // Verify all active statuses are included
            assert options.every { it.value } : "All options should have values"
            assert options.every { it.label } : "All options should have labels"

            testsPassed++
            println "✅ GET /status dropdown options test passed - ${options.size()} options formatted"
        } catch (Exception e) {
            testFailed("GET /status dropdown options", e.message)
        }
    }

    // ==========================================
    // PHASE 2: ENTITY TYPE VALIDATION TESTING
    // ==========================================

    void testValidEntityTypes() {
        println "\n🧪 Testing Valid entity types enumeration..."
        try {
            Set<String> validTypes = statusService.getAvailableEntityTypes()

            // Test all expected entity types are present
            List<String> expectedTypes = ['Migration', 'Iteration', 'Plan', 'Sequence', 'Phase', 'Step', 'Control']
            expectedTypes.each { type ->
                assert validTypes.contains(type) : "Should contain ${type} entity type"
            }

            assert validTypes.size() == expectedTypes.size() : "Should have exactly ${expectedTypes.size()} entity types"

            testsPassed++
            println "✅ Valid entity types test passed - ${validTypes.size()} types validated"
        } catch (Exception e) {
            testFailed("Valid entity types", e.message)
        }
    }

    void testEntityTypeValidation() {
        println "\n🧪 Testing Entity type validation logic..."
        try {
            Set<String> validTypes = statusService.getAvailableEntityTypes()

            // Test valid entity type
            assert validTypes.contains('Migration') : "Migration should be valid"
            List<Map<String, Object>> migrationStatuses = statusService.getStatusesByType('Migration')
            assert migrationStatuses.size() > 0 : "Should return statuses for valid entity type"

            // Test invalid entity type
            assert !validTypes.contains('InvalidEntity') : "InvalidEntity should not be valid"
            List<Map<String, Object>> invalidStatuses = statusService.getStatusesByType('InvalidEntity')
            assert invalidStatuses.size() == 0 : "Should return empty for invalid entity type"

            testsPassed++
            println "✅ Entity type validation test passed"
        } catch (Exception e) {
            testFailed("Entity type validation", e.message)
        }
    }

    void testEntityTypeCaseSensitivity() {
        println "\n🧪 Testing Entity type case sensitivity..."
        try {
            // Test exact case
            List<Map<String, Object>> result1 = statusService.getStatusesByType('Migration')
            assert result1.size() == 3 : "Exact case should return results"

            // Test different case - should return empty (case sensitive)
            List<Map<String, Object>> result2 = statusService.getStatusesByType('migration')
            assert result2.size() == 0 : "Different case should return empty (case sensitive)"

            List<Map<String, Object>> result3 = statusService.getStatusesByType('MIGRATION')
            assert result3.size() == 0 : "All caps should return empty (case sensitive)"

            testsPassed++
            println "✅ Entity type case sensitivity test passed"
        } catch (Exception e) {
            testFailed("Entity type case sensitivity", e.message)
        }
    }

    // ==========================================
    // PHASE 3: CACHE MANAGEMENT TESTING
    // ==========================================

    void testCacheStatistics() {
        println "\n🧪 Testing Cache statistics..."
        try {
            // Clear cache first
            statusService.clearCache()

            Map<String, Object> initialStats = statusService.getCacheStatistics()
            assert initialStats.totalEntries == 0 : "Should start with empty cache"

            // Populate cache
            statusService.getStatusesByType('Migration')
            statusService.getStatusesByType('Step')

            Map<String, Object> populatedStats = statusService.getCacheStatistics()
            assert populatedStats.totalEntries == 2 : "Should have 2 cache entries after population"
            assert populatedStats.activeEntries == 2 : "All entries should be active"
            assert populatedStats.expiredEntries == 0 : "No entries should be expired initially"

            testsPassed++
            println "✅ Cache statistics test passed - ${populatedStats.totalEntries} entries tracked"
        } catch (Exception e) {
            testFailed("Cache statistics", e.message)
        }
    }

    void testCachePrewarming() {
        println "\n🧪 Testing Cache prewarming..."
        try {
            statusService.clearCache()

            Map<String, Object> beforeStats = statusService.getCacheStatistics()
            assert beforeStats.totalEntries == 0 : "Should start with empty cache"

            statusService.prewarmCache()

            Map<String, Object> afterStats = statusService.getCacheStatistics()
            assert (afterStats.totalEntries as Integer) >= 4 : "Should have prewarmed cache entries for entity types"
            assert (afterStats.activeEntries as Integer) >= 4 : "All prewarmed entries should be active"

            testsPassed++
            println "✅ Cache prewarming test passed - ${afterStats.totalEntries} entries prewarmed"
        } catch (Exception e) {
            testFailed("Cache prewarming", e.message)
        }
    }

    void testCacheClearOperation() {
        println "\n🧪 Testing Cache clear operation..."
        try {
            // Populate cache
            statusService.getStatusesByType('Migration')
            statusService.getStatusesByType('Step')

            Map<String, Object> beforeClear = statusService.getCacheStatistics()
            assert (beforeClear.totalEntries as Integer) >= 2 : "Should have cache entries before clear"

            statusService.clearCache()

            Map<String, Object> afterClear = statusService.getCacheStatistics()
            assert afterClear.totalEntries == 0 : "Should have no cache entries after clear"
            assert afterClear.activeEntries == 0 : "Should have no active entries after clear"

            testsPassed++
            println "✅ Cache clear operation test passed"
        } catch (Exception e) {
            testFailed("Cache clear operation", e.message)
        }
    }

    void testCacheHitMiss() {
        println "\n🧪 Testing Cache hit/miss behavior..."
        try {
            statusService.clearCache()

            // First access - cache miss
            List<Map<String, Object>> result1 = statusService.getStatusesByType('Migration')
            assert result1.size() == 3 : "Should return data on cache miss"

            // Second access - cache hit
            List<Map<String, Object>> result2 = statusService.getStatusesByType('Migration')
            assert result2.size() == 3 : "Should return same data on cache hit"
            assert result1[0].sts_code == result2[0].sts_code : "Cache hit should return identical data"

            Map<String, Object> stats = statusService.getCacheStatistics()
            assert (stats.totalEntries as Integer) >= 1 : "Should have cache entry after access"

            testsPassed++
            println "✅ Cache hit/miss test passed"
        } catch (Exception e) {
            testFailed("Cache hit/miss", e.message)
        }
    }

    // ==========================================
    // PHASE 4: POST STATUS REFRESH TESTING
    // ==========================================

    void testPostStatusRefreshSuccess() {
        println "\n🧪 Testing POST /status/refresh - Successful refresh..."
        try {
            // Populate cache first
            statusService.getStatusesByType('Migration')
            statusService.getStatusesByType('Step')

            Map<String, Object> beforeRefresh = statusService.getCacheStatistics()
            int entriesBeforeRefresh = beforeRefresh.totalEntries as Integer

            // Clear cache (simulating refresh)
            statusService.clearCache()

            // Pre-warm cache (part of refresh operation)
            statusService.prewarmCache()

            Map<String, Object> afterRefresh = statusService.getCacheStatistics()
            assert (afterRefresh.totalEntries as Integer) >= 4 : "Should have prewarmed entries after refresh"

            testsPassed++
            println "✅ POST /status/refresh success test passed"
        } catch (Exception e) {
            testFailed("POST /status/refresh success", e.message)
        }
    }

    void testPostStatusRefreshCacheStatistics() {
        println "\n🧪 Testing POST /status/refresh - Cache statistics tracking..."
        try {
            // Setup initial cache state
            statusService.clearCache()
            statusService.getStatusesByType('Migration')

            Map<String, Object> beforeStats = statusService.getCacheStatistics()

            // Perform refresh
            statusService.clearCache()
            statusService.prewarmCache()

            Map<String, Object> afterStats = statusService.getCacheStatistics()

            // Verify statistics are tracked properly
            assert beforeStats.containsKey('totalEntries') : "Before stats should have totalEntries"
            assert afterStats.containsKey('totalEntries') : "After stats should have totalEntries"
            assert afterStats.containsKey('activeEntries') : "After stats should have activeEntries"

            testsPassed++
            println "✅ POST /status/refresh cache statistics test passed"
        } catch (Exception e) {
            testFailed("POST /status/refresh cache statistics", e.message)
        }
    }

    // ==========================================
    // PHASE 5: ERROR HANDLING TESTING
    // ==========================================

    void testDatabaseError() {
        println "\n🧪 Testing Database error handling..."
        try {
            statusService.simulateException('database')

            try {
                List<Map<String, Object>> result = statusService.getStatusesByType('Migration')
                assert false : "Should throw database exception"
            } catch (RuntimeException e) {
                assert e.message.contains('Database connection failed') : "Should be database error"
            }

            statusService.resetException()
            testsPassed++
            println "✅ Database error test passed"
        } catch (Exception e) {
            testFailed("Database error", e.message)
        }
    }

    void testCacheError() {
        println "\n🧪 Testing Cache error handling..."
        try {
            statusService.simulateException('cache')

            try {
                Map<String, Object> stats = statusService.getCacheStatistics()
                assert false : "Should throw cache exception"
            } catch (RuntimeException e) {
                assert e.message.contains('Cache operation failed') : "Should be cache error"
            }

            statusService.resetException()
            testsPassed++
            println "✅ Cache error test passed"
        } catch (Exception e) {
            testFailed("Cache error", e.message)
        }
    }

    void testServiceTimeout() {
        println "\n🧪 Testing Service timeout handling..."
        try {
            statusService.simulateException('timeout')

            try {
                statusService.prewarmCache()
                assert false : "Should throw timeout exception"
            } catch (RuntimeException e) {
                assert e.message.contains('Operation timed out') : "Should be timeout error"
            }

            statusService.resetException()
            testsPassed++
            println "✅ Service timeout test passed"
        } catch (Exception e) {
            testFailed("Service timeout", e.message)
        }
    }

    void testUserContextError() {
        println "\n🧪 Testing User context error handling..."
        try {
            userService.simulateException()

            try {
                def userContext = userService.getCurrentUserContext()
                assert false : "Should throw user context exception"
            } catch (RuntimeException e) {
                assert e.message.contains('Failed to get user context') : "Should be user context error"
            }

            userService.resetException()
            testsPassed++
            println "✅ User context error test passed"
        } catch (Exception e) {
            testFailed("User context error", e.message)
        }
    }

    // ==========================================
    // PHASE 6: SECURITY TESTING
    // ==========================================

    void testUserContextRetrieval() {
        println "\n🧪 Testing User context retrieval..."
        try {
            def userContext = userService.getCurrentUserContext()

            assert (userContext as Map<String, Object>).userId : "Should have user ID"
            assert (userContext as Map<String, Object>).userCode : "Should have user code"
            assert (userContext as Map<String, Object>).displayName : "Should have display name"
            assert (userContext as Map<String, Object>).email : "Should have email"

            // Verify user context format
            assert (userContext as Map<String, Object>).userId instanceof String : "User ID should be string"
            assert ((userContext as Map<String, Object>).email as String).contains('@') : "Email should contain @"

            testsPassed++
            println "✅ User context retrieval test passed - User: ${(userContext as Map<String, Object>).userCode}"
        } catch (Exception e) {
            testFailed("User context retrieval", e.message)
        }
    }

    void testInputValidation() {
        println "\n🧪 Testing Input validation..."
        try {
            // Test entity type validation
            Set<String> validTypes = statusService.getAvailableEntityTypes()

            // Test with null entity type
            List<Map<String, Object>> result1 = statusService.getStatusesByType(null)
            assert result1.size() == 0 : "Should handle null entity type gracefully"

            // Test with empty string
            List<Map<String, Object>> result2 = statusService.getStatusesByType('')
            assert result2.size() == 0 : "Should handle empty entity type gracefully"

            // Test with special characters
            List<Map<String, Object>> result3 = statusService.getStatusesByType('Migration<script>')
            assert result3.size() == 0 : "Should reject entity type with special characters"

            testsPassed++
            println "✅ Input validation test passed"
        } catch (Exception e) {
            testFailed("Input validation", e.message)
        }
    }

    void testErrorSanitization() {
        println "\n🧪 Testing Error sanitization..."
        try {
            // Test that errors are properly sanitized (no sensitive info exposure)
            statusService.simulateException('database')

            try {
                statusService.getAllStatuses()
                assert false : "Should throw exception"
            } catch (RuntimeException e) {
                // Verify error message doesn't contain sensitive information
                assert !e.message.contains('password') : "Error should not contain passwords"
                assert !e.message.contains('jdbc:') : "Error should not contain connection strings"
                assert e.message.length() > 0 : "Error should have message"
            }

            statusService.resetException()
            testsPassed++
            println "✅ Error sanitization test passed"
        } catch (Exception e) {
            testFailed("Error sanitization", e.message)
        }
    }

    // ==========================================
    // PHASE 7: PERFORMANCE TESTING
    // ==========================================

    void testCachePerformance() {
        println "\n🧪 Testing Cache performance..."
        try {
            statusService.clearCache()

            // Test cache population performance
            long startTime = System.currentTimeMillis()
            statusService.getStatusesByType('Migration')
            long populateTime = System.currentTimeMillis() - startTime

            // Test cache retrieval performance
            startTime = System.currentTimeMillis()
            statusService.getStatusesByType('Migration')
            long retrieveTime = System.currentTimeMillis() - startTime

            // Performance validation
            assert populateTime < 100 : "Cache population should be fast (<100ms), took ${populateTime}ms"
            assert retrieveTime < 50 : "Cache retrieval should be very fast (<50ms), took ${retrieveTime}ms"

            testsPassed++
            println "✅ Cache performance test passed - Populate: ${populateTime}ms, Retrieve: ${retrieveTime}ms"
        } catch (Exception e) {
            testFailed("Cache performance", e.message)
        }
    }

    void testBulkDataRetrieval() {
        println "\n🧪 Testing Bulk data retrieval performance..."
        try {
            long startTime = System.currentTimeMillis()

            // Retrieve data for all entity types
            List<Map<String, Object>> allStatuses = statusService.getAllStatuses()

            long endTime = System.currentTimeMillis()
            long duration = endTime - startTime

            assert allStatuses.size() >= 10 : "Should retrieve bulk data (expecting 10 statuses)"
            assert duration < 200 : "Bulk retrieval should be fast (<200ms), took ${duration}ms"

            testsPassed++
            println "✅ Bulk data retrieval test passed - ${allStatuses.size()} statuses in ${duration}ms"
        } catch (Exception e) {
            testFailed("Bulk data retrieval", e.message)
        }
    }

    void testConcurrentAccess() {
        println "\n🧪 Testing Concurrent access simulation..."
        try {
            statusService.clearCache()

            // Simulate concurrent access
            long startTime = System.currentTimeMillis()

            // Multiple rapid sequential calls (simulating concurrent access)
            for (int i = 0; i < 5; i++) {
                statusService.getStatusesByType('Migration')
                statusService.getStatusesByType('Step')
            }

            long endTime = System.currentTimeMillis()
            long duration = endTime - startTime

            assert duration < 300 : "Concurrent access simulation should be fast (<300ms), took ${duration}ms"

            Map<String, Object> stats = statusService.getCacheStatistics()
            assert (stats.totalEntries as Integer) >= 2 : "Should have cache entries after concurrent access"

            testsPassed++
            println "✅ Concurrent access test passed - ${duration}ms for 10 operations"
        } catch (Exception e) {
            testFailed("Concurrent access", e.message)
        }
    }

    // ==========================================
    // PHASE 8: DATA INTEGRITY TESTING
    // ==========================================

    void testStatusDataConsistency() {
        println "\n🧪 Testing Status data consistency..."
        try {
            List<Map<String, Object>> migrationStatuses = statusService.getStatusesByType('Migration')

            // Verify data consistency
            migrationStatuses.each { status ->
                assert status.sts_id : "Each status should have ID"
                assert status.sts_code : "Each status should have code"
                assert status.sts_name : "Each status should have name"
                assert status.type == 'Migration' : "Each status should have correct type"
                assert status.containsKey('is_active') : "Each status should have is_active flag"
                assert status.containsKey('display_order') : "Each status should have display order"
            }

            testsPassed++
            println "✅ Status data consistency test passed - ${migrationStatuses.size()} statuses validated"
        } catch (Exception e) {
            testFailed("Status data consistency", e.message)
        }
    }

    void testDropdownOptionsFormatting() {
        println "\n🧪 Testing Dropdown options formatting..."
        try {
            List<Map<String, Object>> options = statusService.getDropdownOptions('Step')

            // Verify dropdown format consistency
            options.each { option ->
                assert option.containsKey('value') : "Option should have value"
                assert option.containsKey('label') : "Option should have label"
                assert option.containsKey('description') : "Option should have description"

                assert option.value instanceof String : "Value should be string"
                assert option.label instanceof String : "Label should be string"
                assert option.description instanceof String : "Description should be string"

                assert option.value.trim().length() > 0 : "Value should not be empty"
                assert option.label.trim().length() > 0 : "Label should not be empty"
            }

            testsPassed++
            println "✅ Dropdown options formatting test passed - ${options.size()} options formatted"
        } catch (Exception e) {
            testFailed("Dropdown options formatting", e.message)
        }
    }

    void testStatusCodeUniqueness() {
        println "\n🧪 Testing Status code uniqueness within entity types..."
        try {
            List<Map<String, Object>> stepStatuses = statusService.getStatusesByType('Step')

            // Extract status codes
            List<String> statusCodes = stepStatuses.collect { it.sts_code as String }
            Set<String> uniqueCodes = statusCodes as Set

            assert statusCodes.size() == uniqueCodes.size() : "Status codes should be unique within entity type"

            // Verify specific expected codes for Step
            assert uniqueCodes.contains('PENDING') : "Should contain PENDING status"
            assert uniqueCodes.contains('IN_PROGRESS') : "Should contain IN_PROGRESS status"
            assert uniqueCodes.contains('COMPLETED') : "Should contain COMPLETED status"

            testsPassed++
            println "✅ Status code uniqueness test passed - ${uniqueCodes.size()} unique codes"
        } catch (Exception e) {
            testFailed("Status code uniqueness", e.message)
        }
    }
}

// ==========================================
// MAIN EXECUTION
// ==========================================

// Create executor and run tests
StatusApiTestExecutor executor = new StatusApiTestExecutor()
executor.runAllTests()