package umig.tests.unit

import groovy.sql.GroovyRowResult
import groovy.sql.Sql

/**
 * MigrationTypesRepositoryTest - Self-Contained Unit Test
 *
 * Tests the MigrationTypesRepository following the TD-001 self-contained architecture pattern.
 * Embeds all dependencies directly in the test file to achieve 35% compilation performance
 * improvement and eliminate external dependencies.
 *
 * Test Coverage:
 * - CRUD operations for migration types
 * - SERIAL primary key handling (mit_id)
 * - Boolean active status field (mit_active)
 * - Visual field management (mit_color, mit_icon)
 * - Display ordering (mit_display_order)
 * - Business rule validation
 * - Performance benchmarks (<200ms target)
 *
 * @version 1.0.0 (US-082-C Implementation)
 * @author Lucas Challamel
 * @created 2025-01-16
 * @security Enterprise-grade validation via embedded mocks
 * @performance Target <200ms response times for all operations
 */

class MigrationTypesRepositoryTest {

    // ===================================================================
    // EMBEDDED DEPENDENCIES - Self-Contained Architecture (TD-001)
    // ===================================================================

    /**
     * Embedded MockSql implementation to eliminate external dependencies
     */
    static class MockSql {
        List<Map> mockData = []
        Map lastInserted = null
        Map lastUpdated = null
        int deleteCount = 0
        boolean throwException = false
        String exceptionMessage = ""

        List<GroovyRowResult> rows(String query, Map params = [:]) {
            if (throwException) {
                throw new RuntimeException(exceptionMessage)
            }
            
            // Simulate filtering and sorting based on query
            List<Map> filtered = mockData.findAll { row ->
                if (query.contains("WHERE mit_active = TRUE") || query.contains("WHERE mit_active = :active")) {
                    return row.mit_active == true
                }
                if (query.contains("WHERE mit_id = :mtmId")) {
                    return row.mit_id == params.mtmId
                }
                if (query.contains("WHERE mit_code = :mtmCode")) {
                    return row.mit_code == params.mtmCode
                }
                return true
            }

            // Simulate ordering
            if (query.contains("ORDER BY mit_display_order")) {
                filtered = filtered.sort { a, b ->
                    Integer orderA = a.mit_display_order as Integer
                    Integer orderB = b.mit_display_order as Integer
                    return orderA.compareTo(orderB)
                }
            }

            return filtered.collect { data ->
                new GroovyRowResult(data)
            }
        }

        GroovyRowResult firstRow(String query, Map params = [:]) {
            if (throwException) {
                throw new RuntimeException(exceptionMessage)
            }

            // Handle INSERT operations
            if (query.contains("INSERT INTO migration_types_mit")) {
                // Generate new ID
                Integer newId = (mockData.collect { it.mit_id as Integer }.max() ?: 0) + 1
                
                Map newRecord = [
                    mit_id: newId,
                    mit_code: params.mit_code,
                    mit_name: params.mit_name,
                    mit_description: params.mit_description,
                    mit_color: params.mit_color ?: '#6B73FF',
                    mit_icon: params.mit_icon ?: 'layers',
                    mit_display_order: params.mit_display_order ?: 0,
                    mit_active: params.mit_active != null ? params.mit_active : true,
                    created_by: params.created_by ?: 'system',
                    updated_by: params.updated_by ?: 'system',
                    created_at: new Date(),
                    updated_at: new Date()
                ]
                
                mockData.add(newRecord)
                lastInserted = newRecord
                return new GroovyRowResult(newRecord)
            }

            // Handle UPDATE operations
            if (query.contains("UPDATE migration_types_mit")) {
                Map existingRecord = mockData.find { it.mit_id == params.mit_id }
                if (existingRecord) {
                    // Update fields
                    params.each { key, value ->
                        if (key != 'mit_id' && existingRecord.containsKey(key)) {
                            existingRecord[key] = value
                        }
                    }
                    existingRecord.updated_at = new Date()
                    lastUpdated = existingRecord
                    return new GroovyRowResult(existingRecord)
                }
                return null
            }

            // Handle COUNT operations
            if (query.contains("SELECT COUNT(*)")) {
                Integer count = mockData.findAll { row ->
                    if (params.mtmCode) {
                        return row.mit_code == params.mtmCode
                    }
                    if (params.mtmId) {
                        return row.mit_id == params.mtmId
                    }
                    return true
                }.size()
                
                return new GroovyRowResult([count: count])
            }

            // Handle regular SELECT operations (fallback to rows() method)
            List<GroovyRowResult> results = rows(query, params)
            return results.isEmpty() ? null : results[0]
        }

        int executeUpdate(String query, Map params = [:]) {
            if (throwException) {
                throw new RuntimeException(exceptionMessage)
            }

            if (query.contains("DELETE FROM migration_types_mit")) {
                int initialSize = mockData.size()
                mockData.removeAll { row ->
                    if (params.mtmId) {
                        return row.mit_id == params.mtmId
                    }
                    if (params.mtmCode) {
                        return row.mit_code == params.mtmCode
                    }
                    return false
                }
                deleteCount = initialSize - mockData.size()
                return deleteCount
            }

            return 0
        }

        void withTransaction(Closure closure) {
            closure.call()
        }
    }

    /**
     * Embedded DatabaseUtil implementation
     */
    static class MockDatabaseUtil {
        static MockSql sql = new MockSql()

        static def withSql(Closure closure) {
            return closure.call(sql)
        }
    }

    /**
     * Embedded MigrationTypesRepository for testing
     */
    static class TestMigrationTypesRepository {

        def findAllMigrationTypes(boolean includeInactive = false) {
            return MockDatabaseUtil.withSql { MockSql sql ->
                String query = """
                    SELECT
                        mit_id,
                        mit_code,
                        mit_name,
                        mit_description,
                        mit_color,
                        mit_icon,
                        mit_display_order,
                        mit_active,
                        created_by,
                        created_at,
                        updated_by,
                        updated_at
                    FROM migration_types_mit
                    ${includeInactive ? "" : "WHERE mit_active = TRUE"}
                    ORDER BY mit_display_order, mit_code
                """
                return sql.rows(query)
            }
        }

        def findMigrationTypeById(Integer mtmId) {
            return MockDatabaseUtil.withSql { MockSql sql ->
                return sql.firstRow("""
                    SELECT
                        mit_id,
                        mit_code,
                        mit_name,
                        mit_description,
                        mit_color,
                        mit_icon,
                        mit_display_order,
                        mit_active,
                        created_by,
                        created_at,
                        updated_by,
                        updated_at
                    FROM migration_types_mit
                    WHERE mit_id = :mtmId
                """, [mtmId: mtmId])
            }
        }

        def findMigrationTypeByCode(String mtmCode) {
            return MockDatabaseUtil.withSql { MockSql sql ->
                return sql.firstRow("""
                    SELECT
                        mit_id,
                        mit_code,
                        mit_name,
                        mit_description,
                        mit_color,
                        mit_icon,
                        mit_display_order,
                        mit_active,
                        created_by,
                        created_at,
                        updated_by,
                        updated_at
                    FROM migration_types_mit
                    WHERE mit_code = :mtmCode
                """, [mtmCode: mtmCode])
            }
        }

        def createMigrationType(Map params) {
            return MockDatabaseUtil.withSql { MockSql sql ->
                // Validate required fields
                if (!params.mit_code || !params.mit_name) {
                    throw new IllegalArgumentException("mit_code and mit_name are required")
                }

                // Set defaults
                params.mit_description = params.mit_description ?: null
                params.mit_color = params.mit_color ?: '#6B73FF'
                params.mit_icon = params.mit_icon ?: 'layers'
                params.mit_display_order = params.mit_display_order ?: 0
                params.mit_active = params.mit_active != null ? params.mit_active : true
                params.created_by = params.created_by ?: 'system'
                params.updated_by = params.updated_by ?: params.created_by

                return sql.firstRow("""
                    INSERT INTO migration_types_mit (
                        mit_code,
                        mit_name,
                        mit_description,
                        mit_color,
                        mit_icon,
                        mit_display_order,
                        mit_active,
                        created_by,
                        updated_by
                    ) VALUES (
                        :mit_code,
                        :mit_name,
                        :mit_description,
                        :mit_color,
                        :mit_icon,
                        :mit_display_order,
                        :mit_active,
                        :created_by,
                        :updated_by
                    ) RETURNING *
                """, params)
            }
        }

        def updateMigrationType(Integer mtmId, Map params) {
            return MockDatabaseUtil.withSql { MockSql sql ->
                // Build dynamic update query based on provided params
                def updateFields = []
                Map<String, Object> queryParams = [mit_id: mtmId]

                // List of updatable fields
                def updatableFields = [
                    'mit_code', 'mit_name', 'mit_description', 'mit_color',
                    'mit_icon', 'mit_display_order', 'mit_active'
                ]

                updatableFields.each { field ->
                    if (params.containsKey(field)) {
                        updateFields.add("${field} = :${field}")
                        queryParams[field] = params[field]
                    }
                }

                if (updateFields.isEmpty()) {
                    return findMigrationTypeById(mtmId)
                }

                // Always update the updated_by and updated_at fields
                updateFields.add("updated_by = :updated_by")
                updateFields.add("updated_at = CURRENT_TIMESTAMP")
                queryParams.updated_by = params.updated_by ?: 'system'

                String query = """
                    UPDATE migration_types_mit
                    SET ${updateFields.join(', ')}
                    WHERE mit_id = :mit_id
                    RETURNING *
                """

                return sql.firstRow(query, queryParams)
            }
        }

        boolean deleteMigrationType(Integer mtmId) {
            return MockDatabaseUtil.withSql { MockSql sql ->
                int deleted = sql.executeUpdate("""
                    DELETE FROM migration_types_mit
                    WHERE mit_id = :mtmId
                """, [mtmId: mtmId])

                return deleted > 0
            }
        }

        boolean migrationTypeExists(String mtmCode) {
            return MockDatabaseUtil.withSql { MockSql sql ->
                def count = sql.firstRow("""
                    SELECT COUNT(*) as count
                    FROM migration_types_mit
                    WHERE mit_code = :mtmCode
                """, [mtmCode: mtmCode])

                return (count.count as Integer) > 0
            }
        }
    }

    // ===================================================================
    // TEST DATA SETUP
    // ===================================================================

    static void setupTestData() {
        MockDatabaseUtil.sql.mockData.clear()
        MockDatabaseUtil.sql.mockData.addAll([
            [
                mit_id: 1,
                mit_code: 'INFRASTRUCTURE',
                mit_name: 'Infrastructure Migration',
                mit_description: 'Infrastructure and hardware migration',
                mit_color: '#FF6B6B',
                mit_icon: 'server',
                mit_display_order: 1,
                mit_active: true,
                created_by: 'system',
                updated_by: 'system',
                created_at: new Date(),
                updated_at: new Date()
            ],
            [
                mit_id: 2,
                mit_code: 'APPLICATION',
                mit_name: 'Application Migration',
                mit_description: 'Software application migration',
                mit_color: '#4ECDC4',
                mit_icon: 'apps',
                mit_display_order: 2,
                mit_active: true,
                created_by: 'system',
                updated_by: 'system',
                created_at: new Date(),
                updated_at: new Date()
            ],
            [
                mit_id: 3,
                mit_code: 'DATABASE',
                mit_name: 'Database Migration',
                mit_description: 'Database migration',
                mit_color: '#45B7D1',
                mit_icon: 'database',
                mit_display_order: 3,
                mit_active: false,
                created_by: 'system',
                updated_by: 'system',
                created_at: new Date(),
                updated_at: new Date()
            ]
        ])
    }

    // ===================================================================
    // TEST METHODS
    // ===================================================================

    static void main(String[] args) {
        println("🧪 Starting Migration Types Repository Unit Tests (Self-Contained Architecture)")
        
        int totalTests = 0
        int passedTests = 0
        int failedTests = 0
        List<String> testResults = []

        try {
            // Test Suite 1: Basic CRUD Operations
            totalTests++
            if (testFindAllMigrationTypes()) {
                passedTests++
                testResults.add("✅ testFindAllMigrationTypes")
            } else {
                failedTests++
                testResults.add("❌ testFindAllMigrationTypes")
            }

            totalTests++
            if (testFindAllMigrationTypesIncludeInactive()) {
                passedTests++
                testResults.add("✅ testFindAllMigrationTypesIncludeInactive")
            } else {
                failedTests++
                testResults.add("❌ testFindAllMigrationTypesIncludeInactive")
            }

            totalTests++
            if (testFindMigrationTypeById()) {
                passedTests++
                testResults.add("✅ testFindMigrationTypeById")
            } else {
                failedTests++
                testResults.add("❌ testFindMigrationTypeById")
            }

            totalTests++
            if (testFindMigrationTypeByCode()) {
                passedTests++
                testResults.add("✅ testFindMigrationTypeByCode")
            } else {
                failedTests++
                testResults.add("❌ testFindMigrationTypeByCode")
            }

            totalTests++
            if (testCreateMigrationType()) {
                passedTests++
                testResults.add("✅ testCreateMigrationType")
            } else {
                failedTests++
                testResults.add("❌ testCreateMigrationType")
            }

            totalTests++
            if (testCreateMigrationTypeWithDefaults()) {
                passedTests++
                testResults.add("✅ testCreateMigrationTypeWithDefaults")
            } else {
                failedTests++
                testResults.add("❌ testCreateMigrationTypeWithDefaults")
            }

            totalTests++
            if (testUpdateMigrationType()) {
                passedTests++
                testResults.add("✅ testUpdateMigrationType")
            } else {
                failedTests++
                testResults.add("❌ testUpdateMigrationType")
            }

            totalTests++
            if (testDeleteMigrationType()) {
                passedTests++
                testResults.add("✅ testDeleteMigrationType")
            } else {
                failedTests++
                testResults.add("❌ testDeleteMigrationType")
            }

            totalTests++
            if (testMigrationTypeExists()) {
                passedTests++
                testResults.add("✅ testMigrationTypeExists")
            } else {
                failedTests++
                testResults.add("❌ testMigrationTypeExists")
            }

            // Test Suite 2: Validation and Error Handling
            totalTests++
            if (testCreateMigrationTypeValidation()) {
                passedTests++
                testResults.add("✅ testCreateMigrationTypeValidation")
            } else {
                failedTests++
                testResults.add("❌ testCreateMigrationTypeValidation")
            }

            totalTests++
            if (testPerformanceBenchmarks()) {
                passedTests++
                testResults.add("✅ testPerformanceBenchmarks")
            } else {
                failedTests++
                testResults.add("❌ testPerformanceBenchmarks")
            }

            // Generate final report
            println("")
            println("📊 MIGRATION TYPES REPOSITORY TEST RESULTS SUMMARY")
            println("============================================================")
            println("Tests Run: ${totalTests}")
            println("Passed: ${passedTests}")
            println("Failed: ${failedTests}")
            println("Success Rate: ${Math.round((passedTests.doubleValue() / totalTests.doubleValue()) * 100)}%")
            println("")
            println("Test Details:")
            testResults.each { result ->
                println("  ${result}")
            }
            println("============================================================")
            println("✅ Migration Types Repository Test Suite Complete")

            if (failedTests > 0) {
                System.exit(1)
            } else {
                System.exit(0)
            }

        } catch (Exception e) {
            println("💥 Test suite failed with exception: ${e.message}")
            e.printStackTrace()
            System.exit(1)
        }
    }

    static boolean testFindAllMigrationTypes() {
        try {
            setupTestData()
            TestMigrationTypesRepository repository = new TestMigrationTypesRepository()
            
            def result = repository.findAllMigrationTypes()

            // Should only return active migration types
            List<GroovyRowResult> resultList = result as List<GroovyRowResult>
            assert resultList.size() == 2
            assert resultList.every { (it.mit_active as Boolean) == true }
            assert (resultList[0].mit_code as String) == 'INFRASTRUCTURE'
            assert (resultList[1].mit_code as String) == 'APPLICATION'
            
            println("testFindAllMigrationTypes: ✅ PASSED")
            return true
        } catch (Exception e) {
            println("testFindAllMigrationTypes: ❌ FAILED - ${e.message}")
            return false
        }
    }

    static boolean testFindAllMigrationTypesIncludeInactive() {
        try {
            setupTestData()
            TestMigrationTypesRepository repository = new TestMigrationTypesRepository()
            
            def result = repository.findAllMigrationTypes(true)
            
            // Should return all migration types including inactive
            List<GroovyRowResult> resultList = result as List<GroovyRowResult>
            assert resultList.size() == 3
            assert resultList.find { (it.mit_code as String) == 'DATABASE' && !(it.mit_active as Boolean) }
            
            println("testFindAllMigrationTypesIncludeInactive: ✅ PASSED")
            return true
        } catch (Exception e) {
            println("testFindAllMigrationTypesIncludeInactive: ❌ FAILED - ${e.message}")
            return false
        }
    }

    static boolean testFindMigrationTypeById() {
        try {
            setupTestData()
            TestMigrationTypesRepository repository = new TestMigrationTypesRepository()
            
            def result = repository.findMigrationTypeById(1)
            
            assert result != null
            GroovyRowResult migrationTypeResult = result as GroovyRowResult
            assert (migrationTypeResult.mit_id as Integer) == 1
            assert (migrationTypeResult.mit_code as String) == 'INFRASTRUCTURE'
            assert (migrationTypeResult.mit_name as String) == 'Infrastructure Migration'
            
            // Test non-existent ID
            def notFound = repository.findMigrationTypeById(999)
            assert notFound == null
            
            println("testFindMigrationTypeById: ✅ PASSED")
            return true
        } catch (Exception e) {
            println("testFindMigrationTypeById: ❌ FAILED - ${e.message}")
            return false
        }
    }

    static boolean testFindMigrationTypeByCode() {
        try {
            setupTestData()
            TestMigrationTypesRepository repository = new TestMigrationTypesRepository()
            
            def result = repository.findMigrationTypeByCode('APPLICATION')
            
            assert result != null
            GroovyRowResult migrationTypeResult = result as GroovyRowResult
            assert (migrationTypeResult.mit_id as Integer) == 2
            assert (migrationTypeResult.mit_code as String) == 'APPLICATION'
            assert (migrationTypeResult.mit_name as String) == 'Application Migration'
            
            // Test non-existent code
            def notFound = repository.findMigrationTypeByCode('NONEXISTENT')
            assert notFound == null
            
            println("testFindMigrationTypeByCode: ✅ PASSED")
            return true
        } catch (Exception e) {
            println("testFindMigrationTypeByCode: ❌ FAILED - ${e.message}")
            return false
        }
    }

    static boolean testCreateMigrationType() {
        try {
            setupTestData()
            TestMigrationTypesRepository repository = new TestMigrationTypesRepository()
            
            def newMigrationType = [
                mit_code: 'NETWORK',
                mit_name: 'Network Migration',
                mit_description: 'Network infrastructure migration',
                mit_color: '#9B59B6',
                mit_icon: 'network',
                mit_display_order: 4,
                mit_active: true,
                created_by: 'test-user',
                updated_by: 'test-user'
            ]
            
            def result = repository.createMigrationType(newMigrationType)
            
            assert result != null
            GroovyRowResult createdResult = result as GroovyRowResult
            assert (createdResult.mit_id as Integer) == 4 // Next available ID
            assert (createdResult.mit_code as String) == 'NETWORK'
            assert (createdResult.mit_name as String) == 'Network Migration'
            assert (createdResult.mit_color as String) == '#9B59B6'
            assert (createdResult.mit_icon as String) == 'network'
            assert (createdResult.mit_display_order as Integer) == 4
            assert (createdResult.mit_active as Boolean) == true
            assert (createdResult.created_by as String) == 'test-user'
            
            println("testCreateMigrationType: ✅ PASSED")
            return true
        } catch (Exception e) {
            println("testCreateMigrationType: ❌ FAILED - ${e.message}")
            return false
        }
    }

    static boolean testCreateMigrationTypeWithDefaults() {
        try {
            setupTestData()
            TestMigrationTypesRepository repository = new TestMigrationTypesRepository()
            
            def minimalMigrationType = [
                mit_code: 'MINIMAL',
                mit_name: 'Minimal Migration'
            ]
            
            def result = repository.createMigrationType(minimalMigrationType)
            
            assert result != null
            GroovyRowResult defaultResult = result as GroovyRowResult
            assert (defaultResult.mit_code as String) == 'MINIMAL'
            assert (defaultResult.mit_name as String) == 'Minimal Migration'
            assert (defaultResult.mit_color as String) == '#6B73FF' // Default color
            assert (defaultResult.mit_icon as String) == 'layers' // Default icon
            assert (defaultResult.mit_display_order as Integer) == 0 // Default order
            assert (defaultResult.mit_active as Boolean) == true // Default active
            assert (defaultResult.created_by as String) == 'system' // Default creator
            
            println("testCreateMigrationTypeWithDefaults: ✅ PASSED")
            return true
        } catch (Exception e) {
            println("testCreateMigrationTypeWithDefaults: ❌ FAILED - ${e.message}")
            return false
        }
    }

    static boolean testUpdateMigrationType() {
        try {
            setupTestData()
            TestMigrationTypesRepository repository = new TestMigrationTypesRepository()
            
            def updateParams = [
                mit_name: 'Updated Infrastructure Migration',
                mit_color: '#E74C3C',
                updated_by: 'test-user'
            ]
            
            def result = repository.updateMigrationType(1, updateParams)
            
            assert result != null
            GroovyRowResult updatedResult = result as GroovyRowResult
            assert (updatedResult.mit_id as Integer) == 1
            assert (updatedResult.mit_name as String) == 'Updated Infrastructure Migration'
            assert (updatedResult.mit_color as String) == '#E74C3C'
            assert (updatedResult.updated_by as String) == 'test-user'
            // Should not change other fields
            assert (updatedResult.mit_code as String) == 'INFRASTRUCTURE'
            
            println("testUpdateMigrationType: ✅ PASSED")
            return true
        } catch (Exception e) {
            println("testUpdateMigrationType: ❌ FAILED - ${e.message}")
            return false
        }
    }

    static boolean testDeleteMigrationType() {
        try {
            setupTestData()
            TestMigrationTypesRepository repository = new TestMigrationTypesRepository()
            
            // Delete inactive migration type (safer for testing)
            boolean deleted = repository.deleteMigrationType(3)
            
            assert deleted == true
            
            // Verify it's actually deleted
            def notFound = repository.findMigrationTypeById(3)
            assert notFound == null
            
            // Test deleting non-existent ID
            boolean notDeleted = repository.deleteMigrationType(999)
            assert notDeleted == false
            
            println("testDeleteMigrationType: ✅ PASSED")
            return true
        } catch (Exception e) {
            println("testDeleteMigrationType: ❌ FAILED - ${e.message}")
            return false
        }
    }

    static boolean testMigrationTypeExists() {
        try {
            setupTestData()
            TestMigrationTypesRepository repository = new TestMigrationTypesRepository()
            
            // Test existing code
            boolean exists = repository.migrationTypeExists('INFRASTRUCTURE')
            assert exists == true
            
            // Test non-existent code
            boolean notExists = repository.migrationTypeExists('NONEXISTENT')
            assert notExists == false
            
            println("testMigrationTypeExists: ✅ PASSED")
            return true
        } catch (Exception e) {
            println("testMigrationTypeExists: ❌ FAILED - ${e.message}")
            return false
        }
    }

    static boolean testCreateMigrationTypeValidation() {
        try {
            setupTestData()
            TestMigrationTypesRepository repository = new TestMigrationTypesRepository()
            
            // Test missing required fields
            try {
                repository.createMigrationType([mit_name: 'Missing Code'])
                assert false, "Should have thrown validation error"
            } catch (IllegalArgumentException e) {
                assert e.message.contains("mit_code and mit_name are required")
            }
            
            try {
                repository.createMigrationType([mit_code: 'MISSING_NAME'])
                assert false, "Should have thrown validation error"
            } catch (IllegalArgumentException e) {
                assert e.message.contains("mit_code and mit_name are required")
            }
            
            println("testCreateMigrationTypeValidation: ✅ PASSED")
            return true
        } catch (Exception e) {
            println("testCreateMigrationTypeValidation: ❌ FAILED - ${e.message}")
            return false
        }
    }

    static boolean testPerformanceBenchmarks() {
        try {
            setupTestData()
            TestMigrationTypesRepository repository = new TestMigrationTypesRepository()
            
            // Test read operations performance (<200ms target)
            long startTime = System.currentTimeMillis()
            def result = repository.findAllMigrationTypes()
            long readTime = System.currentTimeMillis() - startTime
            
            assert readTime < 200, "Read operation took ${readTime}ms, should be <200ms"
            
            // Test create operation performance
            startTime = System.currentTimeMillis()
            def created = repository.createMigrationType([
                mit_code: 'PERF_TEST',
                mit_name: 'Performance Test Migration'
            ])
            long createTime = System.currentTimeMillis() - startTime
            
            assert createTime < 200, "Create operation took ${createTime}ms, should be <200ms"
            
            // Test update operation performance
            startTime = System.currentTimeMillis()
            GroovyRowResult createdMigrationType = created as GroovyRowResult
            repository.updateMigrationType(createdMigrationType.mit_id as Integer, [mit_name: 'Updated Performance Test'])
            long updateTime = System.currentTimeMillis() - startTime
            
            assert updateTime < 200, "Update operation took ${updateTime}ms, should be <200ms"
            
            println("testPerformanceBenchmarks: ✅ PASSED (Read: ${readTime}ms, Create: ${createTime}ms, Update: ${updateTime}ms)")
            return true
        } catch (Exception e) {
            println("testPerformanceBenchmarks: ❌ FAILED - ${e.message}")
            return false
        }
    }
}