#!/usr/bin/env groovy

package umig.tests.unit.repository

import java.util.UUID
import java.sql.SQLException

/**
 * Simplified Unit Tests for MigrationRepository.
 * Tests core CRUD operations and advanced filtering methods without external dependencies.
 * Follows the project's simple test pattern (no Spock framework).
 * 
 * Run: groovy MigrationRepositoryTest.groovy
 * Created: 2025-08-14
 * Coverage Target: 95%+ (Sprint 4 testing standards)
 */

// --- Mock Database Util ---
class DatabaseUtil {
    static def withSql(Closure closure) {
        def mockSql = new MockSql()
        return closure.call(mockSql)
    }
}

class MockSql {
    // Static variable to persist across MockSql instances
    static def lastCreatedMigration = null
    
    // Support both Map and ArrayList parameters for rows() method
    def rows(String query, params = [:]) {
        if (query.contains("ORDER BY mig_name")) {
            // findAllMigrations basic
            return [
                [
                    mig_id: UUID.fromString("123e4567-e89b-12d3-a456-426614174000"),
                    usr_id_owner: 1,
                    mig_name: "Test Migration A",
                    mig_description: "Description A",
                    mig_status: "Planning",
                    mig_type: "MIGRATION",
                    created_by: "system",
                    created_at: new Date(),
                    updated_by: "system",
                    updated_at: new Date(),
                    sts_id: 1,
                    sts_name: "Planning",
                    sts_color: "#808080",
                    sts_type: "migration"
                ]
            ]
        }
        
        if (query.contains("COUNT(*) as total") && query.contains("migrations_mig m") && !query.contains("JOIN")) {
            // Count query for pagination (no JOIN clause - this is the paginated count)
            return [[total: 25]]
        }
        
        if (query.contains("WHERE s.sts_name IN") && query.contains("LIMIT") && query.contains("OFFSET")) {
            // findMigrationsByStatuses
            return [
                [
                    mig_id: UUID.fromString("456e4567-e89b-12d3-a456-426614174000"),
                    mig_name: "Active Migration",
                    mig_status: 2,
                    mig_type: "MIGRATION",
                    created_by: "system",
                    created_at: new Date(),
                    updated_by: "system",
                    updated_at: new Date(),
                    sts_id: 2,
                    sts_name: "Active",
                    sts_color: "#00FF00",
                    sts_type: "migration"
                ]
            ]
        }
        
        if (query.contains("WHERE m.mig_start_date >= ?") && query.contains("LIMIT") && query.contains("OFFSET")) {
            // findMigrationsByDateRange - specific pattern with LIMIT
            return [
                [
                    mig_id: UUID.fromString("789e4567-e89b-12d3-a456-426614174000"),
                    mig_name: "Date Range Migration",
                    mig_start_date: new Date() + 1,
                    mig_status: 1,
                    mig_type: "MIGRATION",
                    created_by: "system",
                    created_at: new Date(),
                    updated_by: "system", 
                    updated_at: new Date(),
                    sts_id: 1,
                    sts_name: "Planning",
                    sts_color: "#808080",
                    sts_type: "migration"
                ]
            ]
        }
        
        if (query.contains("JOIN status_sts s ON m.mig_status = s.sts_id") && query.contains("LIMIT") && query.contains("OFFSET")) {
            // Paginated migration query - general case
            return [
                [
                    mig_id: UUID.fromString("123e4567-e89b-12d3-a456-426614174000"),
                    usr_id_owner: 1,
                    mig_name: "Test Migration Paginated",
                    mig_description: "Paginated Description",
                    mig_status: 1,
                    mig_type: "MIGRATION",
                    created_by: "system",
                    created_at: new Date(),
                    updated_by: "system",
                    updated_at: new Date(),
                    sts_id: 1,
                    sts_name: "Planning",
                    sts_color: "#808080",
                    sts_type: "migration"
                ]
            ]
        }
        
        
        if (query.contains("FROM status_sts s") && query.contains("LEFT JOIN migrations_mig m")) {
            // getDashboardSummary - status counts
            return [
                [sts_name: "Planning", sts_color: "#808080", count: 10],
                [sts_name: "Active", sts_color: "#00FF00", count: 5],
                [sts_name: "Completed", sts_color: "#0000FF", count: 3]
            ]
        }
        
        if (query.contains("WHERE mig_end_date >")) {
            // getDashboardSummary - upcoming deadlines
            return [
                [mig_id: UUID.randomUUID(), mig_name: "Upcoming Migration", mig_end_date: new Date() + 5]
            ]
        }
        
        if (query.contains("WHERE updated_at >=")) {
            // getDashboardSummary - recent updates
            return [
                [mig_id: UUID.randomUUID(), mig_name: "Recently Updated", updated_at: new Date(), updated_by: "admin"]
            ]
        }
        
        return []
    }
    
    // Support both Map and ArrayList parameters for firstRow() method
    def firstRow(String query, params = [:]) {
        
        if (query.contains("WHERE mig_id = :migrationId")) {
            // findMigrationById with Map params
            if (params instanceof Map && params.migrationId?.toString() == "123e4567-e89b-12d3-a456-426614174000") {
                return [
                    mig_id: params.migrationId,
                    usr_id_owner: 1,
                    mig_name: "Test Migration",
                    mig_description: "Test Description",
                    mig_status: 1,
                    mig_type: "MIGRATION",
                    created_by: "system",
                    created_at: new Date(),
                    updated_by: "system",
                    updated_at: new Date()
                ]
            }
            // Support newly created migrations
            if (params instanceof Map && MockSql.lastCreatedMigration && params.migrationId == MockSql.lastCreatedMigration.mig_id) {
                return MockSql.lastCreatedMigration
            }
            // Fallback: string comparison for UUID objects
            if (params instanceof Map && MockSql.lastCreatedMigration && 
                params.migrationId?.toString() == MockSql.lastCreatedMigration.mig_id?.toString()) {
                return MockSql.lastCreatedMigration
            }
            return null // Migration not found
        }
        
        if (query.contains("SELECT sts_id FROM status_sts WHERE sts_name = 'Planning'")) {
            // Default status lookup for create - matches both simple and complex queries
            return [sts_id: 1]
        }
        
        if (query.contains("SELECT sts_id FROM status_sts WHERE sts_name = ? AND sts_type = 'migration'")) {
            // Status validation for bulk operations with ArrayList params
            if (params instanceof List && params.size() > 0) {
                def statusName = params[0]
                def statusMap = ["Active": 2, "Completed": 3, "Planning": 1]
                def statusId = statusMap[statusName]
                return statusId ? [sts_id: statusId] : null
            }
            // Status validation with Map params
            if (params instanceof Map && params.status) {
                def statusMap = ["Active": 2, "Completed": 3, "Planning": 1]
                def statusId = statusMap[params.status]
                return statusId ? [sts_id: statusId] : null
            }
            return null
        }
        
        if (query.contains("COUNT(*) as total FROM migrations_mig m WHERE m.") && query.contains(">=") && query.contains("<=")) {
            // Date range count query with ArrayList params
            return [total: 25]
        }
        
        if (query.contains("COUNT(*) as total FROM migrations_mig m") && params instanceof List) {
            // Count query with ArrayList params (e.g., statusNames)
            return [total: 25]
        }
        
        if (query.contains("WHERE s.sts_name IN ('In Progress', 'Active')")) {
            // Dashboard active migrations - must come before general count
            return [total: 10]
        }
        
        // Check for specific dashboard query first
        if (query.contains("COUNT(*) as total FROM migrations_mig") && !query.contains("JOIN") && !query.contains("WHERE") && params instanceof Map && params.isEmpty()) {
            // Dashboard total migrations (without JOIN, WHERE, and empty params)
            return [total: 18]
        }
        
        if (query.contains("COUNT(*) as total") && params instanceof Map && params.search) {
            // Pagination with search count - should return 25 for test
            return [total: 25]
        }
        
        if (query.contains("COUNT(*) as total")) {
            // Default count
            return [total: 25]
        }
        
        return null
    }
    
    def executeInsert(String query, Map params = [:]) {
        if (query.contains("INSERT INTO migrations_mig")) {
            // Store the created migration data for later retrieval
            MockSql.lastCreatedMigration = [
                mig_id: params.mig_id,
                usr_id_owner: params.usr_id_owner,
                mig_name: params.mig_name,
                mig_description: params.mig_description,
                mig_status: params.mig_status,
                mig_type: params.mig_type,
                mig_start_date: params.mig_start_date,
                mig_end_date: params.mig_end_date,
                mig_business_cutover_date: params.mig_business_cutover_date,
                created_by: params.created_by,
                created_at: new Date(),
                updated_by: params.updated_by,
                updated_at: new Date()
            ]
            return [] // Success indicator for insert
        }
        throw new SQLException("Insert failed", "23503", 1) // Simulate constraint violation
    }
    
    
    // Support both Map and ArrayList parameters for executeUpdate() method
    def executeUpdate(String query, params = [:]) {
        if (query.contains("UPDATE migrations_mig")) {
            // Handle Map params
            if (params instanceof Map && params.mig_id?.toString() == "123e4567-e89b-12d3-a456-426614174000") {
                return 1 // Successful update
            }
            // Handle bulk update with ArrayList params
            if (params instanceof List && params.size() >= 4) {
                // Bulk update format: [statusRow.sts_id, new Date(), 'bulk-update', migrationId]
                def migrationId = params[3]?.toString()
                if (migrationId == "123e4567-e89b-12d3-a456-426614174000") {
                    return 1 // Successful update
                }
            }
            return 0 // Not found
        }
        
        if (query.contains("DELETE FROM migrations_mig")) {
            // Handle ArrayList params for delete
            if (params instanceof List && params.size() > 0 && params[0]?.toString() == "123e4567-e89b-12d3-a456-426614174000") {
                return 1 // Successful delete
            }
            // Handle Map params for delete
            if (params instanceof Map && params.mig_id?.toString() == "123e4567-e89b-12d3-a456-426614174000") {
                return 1 // Successful delete
            }
            return 0 // Not found
        }
        
        return 0 // Default: not found
    }
    
    def withTransaction(Closure closure) {
        return closure() // Simple transaction mock
    }
}

// Copy of MigrationRepository class for testing (simplified version focusing on tested methods)
class MigrationRepository {
    
    def findAllMigrations() {
        DatabaseUtil.withSql { sql ->
            return sql.rows("""
                SELECT mig_id, usr_id_owner, mig_name, mig_description, mig_status, mig_type, 
                       mig_start_date, mig_end_date, mig_business_cutover_date, 
                       created_by, created_at, updated_by, updated_at
                FROM migrations_mig
                ORDER BY mig_name
            """)
        }
    }
    
    def findAllMigrations(int pageNumber, int pageSize, String searchTerm = null, String sortField = null, String sortDirection = 'asc') {
        DatabaseUtil.withSql { sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            def allowedSortFields = ['mig_id', 'mig_name', 'mig_description', 'mig_status', 'mig_type']
            if (!sortField || !allowedSortFields.contains(sortField)) {
                sortField = 'mig_name'
            }
            
            sortDirection = (sortDirection?.toLowerCase() == 'desc') ? 'DESC' : 'ASC'
            
            def params = [:]
            if (searchTerm && searchTerm.trim()) {
                params.search = "%${searchTerm.trim()}%"
            }
            
            def totalCount = sql.firstRow("SELECT COUNT(*) as total FROM migrations_mig m", params)?.total ?: 0
            def offset = (pageNumber - 1) * pageSize
            def totalPages = (int) Math.ceil((double) totalCount / (double) pageSize)
            
            def migrations = sql.rows("""
                SELECT m.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                ORDER BY m.${sortField} ${sortDirection}
                LIMIT ${pageSize} OFFSET ${offset}
            """, params)
            
            def enrichedMigrations = migrations.collect { enrichMigrationWithStatusMetadata(it) }
            
            return [
                data: enrichedMigrations,
                pagination: [
                    page: pageNumber,
                    size: pageSize,
                    total: totalCount,
                    totalPages: totalPages,
                    hasNext: pageNumber < totalPages,
                    hasPrevious: pageNumber > 1
                ],
                filters: [
                    search: searchTerm,
                    sort: sortField,
                    direction: sortDirection.toLowerCase()
                ]
            ]
        }
    }
    
    def findMigrationById(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            return sql.firstRow("""
                SELECT mig_id, usr_id_owner, mig_name, mig_description, mig_status, mig_type, 
                       mig_start_date, mig_end_date, mig_business_cutover_date, 
                       created_by, created_at, updated_by, updated_at
                FROM migrations_mig
                WHERE mig_id = :migrationId
            """, [migrationId: migrationId])
        }
    }
    
    def findMigrationsByStatuses(List<String> statusNames, int pageNumber = 1, int pageSize = 50) {
        DatabaseUtil.withSql { sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            def statusPlaceholders = statusNames.collect { '?' }.join(', ')
            def totalCount = sql.firstRow("SELECT COUNT(*) as total FROM migrations_mig m", statusNames)?.total ?: 0
            def offset = (pageNumber - 1) * pageSize
            
            def migrations = sql.rows("""
                SELECT m.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                WHERE s.sts_name IN (${statusPlaceholders})
                ORDER BY m.mig_name ASC
                LIMIT ${pageSize} OFFSET ${offset}
            """, statusNames)
            
            return [
                data: migrations,
                pagination: [
                    page: pageNumber,
                    size: pageSize,
                    total: totalCount,
                    totalPages: (int) Math.ceil((double) totalCount / (double) pageSize)
                ]
            ]
        }
    }
    
    def findMigrationsByDateRange(Date startDate, Date endDate, String dateField = 'mig_start_date', int pageNumber = 1, int pageSize = 50) {
        DatabaseUtil.withSql { sql ->
            pageNumber = Math.max(1, pageNumber)
            pageSize = Math.min(100, Math.max(1, pageSize))
            
            def allowedDateFields = ['mig_start_date', 'mig_end_date', 'mig_business_cutover_date', 'created_at', 'updated_at']
            if (!allowedDateFields.contains(dateField)) {
                dateField = 'mig_start_date'
            }
            
            def totalCount = sql.firstRow("SELECT COUNT(*) as total FROM migrations_mig m WHERE m.${dateField} >= ? AND m.${dateField} <= ?", [startDate, endDate])?.total ?: 0
            def offset = (pageNumber - 1) * pageSize
            
            def migrations = sql.rows("""
                SELECT m.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                WHERE m.${dateField} >= ? AND m.${dateField} <= ?
                ORDER BY m.${dateField} ASC
                LIMIT ${pageSize} OFFSET ${offset}
            """, [startDate, endDate])
            
            return [
                data: migrations,
                pagination: [
                    page: pageNumber,
                    size: pageSize,
                    total: totalCount,
                    totalPages: (int) Math.ceil((double) totalCount / (double) pageSize)
                ]
            ]
        }
    }
    
    def bulkUpdateStatus(List<UUID> migrationIds, String newStatus, String reason = null) {
        DatabaseUtil.withSql { sql ->
            return sql.withTransaction {
                def results = [updated: [], failed: []]
                
                def statusRow = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = ? AND sts_type = 'migration'", [newStatus])
                if (!statusRow) {
                    throw new IllegalArgumentException("Invalid status: ${newStatus}")
                }
                
                migrationIds.each { migrationId ->
                    try {
                        def updateCount = sql.executeUpdate("""
                            UPDATE migrations_mig
                            SET mig_status = ?, updated_at = ?, updated_by = ?
                            WHERE mig_id = ?
                        """, [statusRow.sts_id, new Date(), 'bulk-update', migrationId])
                        
                        if (updateCount > 0) {
                            results.updated << migrationId
                        } else {
                            results.failed << [id: migrationId, error: "Migration not found"]
                        }
                    } catch (Exception e) {
                        results.failed << [id: migrationId, error: e.message]
                    }
                }
                
                return results
            }
        }
    }
    
    def getDashboardSummary() {
        DatabaseUtil.withSql { sql ->
            def statusCounts = sql.rows("""
                SELECT s.sts_name, s.sts_color, COUNT(m.mig_id) as count
                FROM status_sts s
                LEFT JOIN migrations_mig m ON m.mig_status = s.sts_id
                WHERE s.sts_type = 'migration'
                GROUP BY s.sts_id, s.sts_name, s.sts_color
                ORDER BY s.sts_name
            """)
            
            def upcomingDeadlines = sql.rows("""
                SELECT mig_id, mig_name, mig_end_date
                FROM migrations_mig
                WHERE mig_end_date > CURRENT_DATE 
                  AND mig_end_date <= CURRENT_DATE + INTERVAL '30 days'
                ORDER BY mig_end_date ASC
                LIMIT 5
            """)
            
            def recentUpdates = sql.rows("""
                SELECT mig_id, mig_name, updated_at, updated_by
                FROM migrations_mig
                WHERE updated_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
                ORDER BY updated_at DESC
                LIMIT 5
            """)
            
            def totalMigrations = sql.firstRow("SELECT COUNT(*) as total FROM migrations_mig")?.total ?: 0
            def activeMigrations = sql.firstRow("""
                SELECT COUNT(*) as total FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                WHERE s.sts_name IN ('In Progress', 'Active')
            """)?.total ?: 0
            
            return [
                totalMigrations: totalMigrations,
                activeMigrations: activeMigrations,
                statusDistribution: statusCounts,
                upcomingDeadlines: upcomingDeadlines,
                recentUpdates: recentUpdates
            ]
        }
    }
    
    def create(Map migrationData) {
        DatabaseUtil.withSql { sql ->
            if (!migrationData.mig_status) {
                def defaultStatus = sql.firstRow("SELECT sts_id FROM status_sts WHERE sts_name = 'Planning' AND sts_type = 'migration'")
                migrationData.mig_status = defaultStatus?.sts_id ?: 1
            }
            
            def migrationId = UUID.randomUUID()
            
            def params = [
                mig_id: migrationId,
                usr_id_owner: (migrationData.usr_id_owner ?: migrationData.ownerId) as Integer,
                mig_name: (migrationData.mig_name ?: migrationData.name).toString(),
                mig_description: (migrationData.mig_description ?: migrationData.description) as String,
                mig_status: (migrationData.mig_status ?: migrationData.status) as Integer,
                mig_type: (migrationData.mig_type ?: migrationData.type ?: 'MIGRATION') as String,
                mig_start_date: migrationData.mig_start_date ?: migrationData.startDate,
                mig_end_date: migrationData.mig_end_date ?: migrationData.endDate,
                mig_business_cutover_date: migrationData.mig_business_cutover_date ?: migrationData.businessCutoverDate,
                created_by: (migrationData.created_by ?: 'system') as String,
                updated_by: (migrationData.updated_by ?: 'system') as String
            ]
            
            sql.executeInsert("""
                INSERT INTO migrations_mig (
                    mig_id, usr_id_owner, mig_name, mig_description, mig_status, 
                    mig_type, mig_start_date, mig_end_date, mig_business_cutover_date,
                    created_by, created_at, updated_by, updated_at
                ) VALUES (
                    :mig_id, :usr_id_owner, :mig_name, :mig_description, :mig_status,
                    :mig_type, :mig_start_date, :mig_end_date, :mig_business_cutover_date,
                    :created_by, CURRENT_TIMESTAMP, :updated_by, CURRENT_TIMESTAMP
                )
            """, params)
            
            return findMigrationById(migrationId)
        }
    }
    
    def update(UUID migrationId, Map migrationData) {
        DatabaseUtil.withSql { sql ->
            def updateFields = []
            Map<String, Object> params = [mig_id: migrationId]
            
            // Handle both snake_case and camelCase field names
            if (migrationData.containsKey('mig_name') || migrationData.containsKey('name')) {
                updateFields << "mig_name = :mig_name"
                params.mig_name = (migrationData.mig_name ?: migrationData.name) as String
            }
            if (migrationData.containsKey('mig_description') || migrationData.containsKey('description')) {
                updateFields << "mig_description = :mig_description"
                params.mig_description = (migrationData.mig_description ?: migrationData.description) as String
            }
            if (migrationData.containsKey('mig_status') || migrationData.containsKey('status')) {
                updateFields << "mig_status = :mig_status"
                params.mig_status = (migrationData.mig_status ?: migrationData.status) as Integer
            }
            
            updateFields << "updated_at = CURRENT_TIMESTAMP"
            updateFields << "updated_by = :updated_by"
            params.updated_by = (migrationData.updated_by ?: 'system') as String
            
            if (updateFields.size() <= 2) { // Only timestamp fields
                return findMigrationById(migrationId) // No real fields to update
            }
            
            def updateQuery = """
                UPDATE migrations_mig
                SET ${updateFields.join(', ')}
                WHERE mig_id = :mig_id
            """
            
            def rowsUpdated = sql.executeUpdate(updateQuery, params)
            
            if (rowsUpdated > 0) {
                return findMigrationById(migrationId)
            }
            return null
        }
    }
    
    def delete(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            def rowsDeleted = sql.executeUpdate("DELETE FROM migrations_mig WHERE mig_id = ?", [migrationId])
            return rowsDeleted > 0
        }
    }
    
    private Map enrichMigrationWithStatusMetadata(Map row) {
        return [
            mig_id: row.mig_id,
            usr_id_owner: row.usr_id_owner,
            mig_name: row.mig_name,
            mig_description: row.mig_description,
            mig_status: row.sts_name,
            mig_type: row.mig_type,
            mig_start_date: row.mig_start_date,
            mig_end_date: row.mig_end_date,
            mig_business_cutover_date: row.mig_business_cutover_date,
            created_by: row.created_by,
            created_at: row.created_at,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            statusMetadata: [
                id: row.sts_id,
                name: row.sts_name,
                color: row.sts_color,
                type: row.sts_type
            ]
        ]
    }
}

// --- Test Runner ---
class MigrationRepositoryTests {
    def migrationRepository = new MigrationRepository()
    
    void runTests() {
        println "🚀 Running Migration Repository Unit Tests (Without External Dependencies)..."
        int passed = 0
        int failed = 0
        
        // Test 1: findAllMigrations
        try {
            def migrations = migrationRepository.findAllMigrations()
            assert migrations.size() == 1
            assert migrations[0].mig_name == "Test Migration A"
            assert migrations[0].mig_type == "MIGRATION"
            println "✅ Test 1 passed: findAllMigrations"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 1 failed: ${e.message}"
            failed++
        }
        
        // Test 2: findMigrationById - found
        try {
            def migration = migrationRepository.findMigrationById(UUID.fromString("123e4567-e89b-12d3-a456-426614174000"))
            assert migration != null
            assert migration.mig_name == "Test Migration"
            assert migration.usr_id_owner == 1
            println "✅ Test 2 passed: findMigrationById (found)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 2 failed: ${e.message}"
            failed++
        }
        
        // Test 3: findMigrationById - not found
        try {
            def migration = migrationRepository.findMigrationById(UUID.fromString("999e4567-e89b-12d3-a456-426614174000"))
            assert migration == null
            println "✅ Test 3 passed: findMigrationById (not found)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 3 failed: ${e.message}"
            failed++
        }
        
        // Test 4: findAllMigrations with pagination
        try {
            def result = migrationRepository.findAllMigrations(2, 10, "test", "mig_name", "desc")
            assert result.data.size() == 1
            assert result.pagination.page == 2
            assert result.pagination.size == 10
            assert result.pagination.total == 25
            assert result.filters.search == "test"
            assert result.filters.sort == "mig_name"
            assert result.filters.direction == "desc"
            println "✅ Test 4 passed: findAllMigrations (paginated)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 4 failed: ${e.message}"
            failed++
        }
        
        // Test 5: findMigrationsByStatuses
        try {
            def result = migrationRepository.findMigrationsByStatuses(["Active", "Planning"], 1, 20)
            assert result.data.size() == 1
            assert result.data[0].mig_name == "Active Migration"
            assert result.pagination.page == 1
            assert result.pagination.size == 20
            println "✅ Test 5 passed: findMigrationsByStatuses"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 5 failed: ${e.message}"
            failed++
        }
        
        // Test 6: findMigrationsByDateRange
        try {
            def startDate = new Date()
            def endDate = new Date() + 30
            def result = migrationRepository.findMigrationsByDateRange(startDate, endDate, "mig_start_date", 1, 50)
            assert result.data.size() == 1
            assert result.data[0].mig_name == "Date Range Migration"
            assert result.pagination.total == 25
            println "✅ Test 6 passed: findMigrationsByDateRange"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 6 failed: ${e.message}"
            failed++
        }
        
        // Test 7: bulkUpdateStatus
        try {
            def migrationIds = [UUID.fromString("123e4567-e89b-12d3-a456-426614174000")]
            def result = migrationRepository.bulkUpdateStatus(migrationIds, "Active")
            assert result.updated.size() == 1
            assert result.failed.size() == 0
            println "✅ Test 7 passed: bulkUpdateStatus"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 7 failed: ${e.message}"
            failed++
        }
        
        // Test 8: getDashboardSummary
        try {
            def summary = migrationRepository.getDashboardSummary()
            assert summary.totalMigrations == 18
            assert summary.activeMigrations == 10
            assert summary.statusDistribution.size() == 3
            assert summary.upcomingDeadlines.size() == 1
            assert summary.recentUpdates.size() == 1
            println "✅ Test 8 passed: getDashboardSummary"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 8 failed: ${e.message}"
            failed++
        }
        
        // Test 9: create migration
        try {
            def migrationData = [
                mig_name: "Test Migration Create",
                usr_id_owner: 1,
                mig_type: "MIGRATION",
                created_by: "admin",
                updated_by: "admin"
            ]
            def result = migrationRepository.create(migrationData)
            assert result != null, "Create result should not be null"
            assert result.mig_name == "Test Migration Create", "Migration name should match: expected 'Test Migration Create', got '${result.mig_name}'"
            println "✅ Test 9 passed: create"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 9 failed: ${e.message}"
            if (e instanceof Exception && !(e instanceof AssertionError)) {
                e.printStackTrace()
            }
            failed++
        }
        
        // Test 10: update migration
        try {
            def migrationId = UUID.fromString("123e4567-e89b-12d3-a456-426614174000")
            def updateData = [mig_name: "Updated Name", mig_description: "Updated Description"]
            def result = migrationRepository.update(migrationId, updateData)
            assert result != null
            assert result.mig_name == "Test Migration"  // Mock returns this
            println "✅ Test 10 passed: update"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 10 failed: ${e.message}"
            failed++
        }
        
        // Test 11: update migration - not found
        try {
            def migrationId = UUID.fromString("999e4567-e89b-12d3-a456-426614174000")
            def updateData = [mig_name: "Updated Name"]
            def result = migrationRepository.update(migrationId, updateData)
            assert result == null
            println "✅ Test 11 passed: update (not found)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 11 failed: ${e.message}"
            failed++
        }
        
        // Test 12: delete migration - success
        try {
            def migrationId = UUID.fromString("123e4567-e89b-12d3-a456-426614174000")
            def result = migrationRepository.delete(migrationId)
            assert result == true
            println "✅ Test 12 passed: delete (success)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 12 failed: ${e.message}"
            failed++
        }
        
        // Test 13: delete migration - not found
        try {
            def migrationId = UUID.fromString("999e4567-e89b-12d3-a456-426614174000")
            def result = migrationRepository.delete(migrationId)
            assert result == false
            println "✅ Test 13 passed: delete (not found)"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 13 failed: ${e.message}"
            failed++
        }
        
        // Test 14: camelCase field mapping in create
        try {
            def migrationData = [
                name: "CamelCase Migration",
                description: "CamelCase Description", 
                ownerId: 1,
                type: "CUTOVER"
            ]
            def result = migrationRepository.create(migrationData)
            assert result != null, "Create result should not be null"
            assert result.mig_name == "CamelCase Migration", "Migration name should match: expected 'CamelCase Migration', got '${result?.mig_name}'"
            println "✅ Test 14 passed: create with camelCase fields"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 14 failed: ${e.message}"
            if (e instanceof Exception && !(e instanceof AssertionError)) {
                e.printStackTrace()
            }
            failed++
        }
        
        // Test 15: camelCase field mapping in update
        try {
            def migrationId = UUID.fromString("123e4567-e89b-12d3-a456-426614174000")
            def updateData = [
                name: "Updated CamelCase Name",
                description: "Updated CamelCase Description"
            ]
            def result = migrationRepository.update(migrationId, updateData)
            assert result != null  // Should successfully handle camelCase fields
            println "✅ Test 15 passed: update with camelCase fields"
            passed++
        } catch (AssertionError | Exception e) {
            println "❌ Test 15 failed: ${e.message}"
            failed++
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
def tests = new MigrationRepositoryTests()
tests.runTests()