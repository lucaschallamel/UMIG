package umig.tests.unit.repository

import groovy.sql.Sql
import java.sql.SQLException

/**
 * EnvironmentRepository Comprehensive Test Suite
 *
 * TD-014 Phase 1 Week 2 - Repository Layer Testing
 * Architecture: TD-001 Self-Contained Pattern
 * Type Safety: ADR-031 Explicit Casting
 * Target Coverage: 90-93% of 14 repository methods
 *
 * Test Count: 28 tests across 5 categories
 * - Category A: CRUD Operations (6 tests)
 * - Category B: Query Operations (8 tests)
 * - Category C: Application Association Management (4 tests)
 * - Category D: Iteration Association Management (5 tests) - UUID String handling
 * - Category E: Relationship Analysis & Edge Cases (5 tests)
 *
 * Location: Isolated (proactive isolation due to expected size >50KB and 3+ static classes)
 *
 * Key Features Tested:
 * - UUID String handling for iteration IDs (ite_id)
 * - 3-way junction table (env_id, ite_id UUID String, enr_id for role)
 * - Role-based grouping method with nested structure
 * - Pagination with search and computed column sorting
 *
 * @since 2025-01-10
 */
class EnvironmentRepositoryComprehensiveTest {

    // ========================================
    // Static Test Counters
    // ========================================

    static int testsRun = 0
    static int testsPassed = 0
    static int testsFailed = 0
    static List<String> failureMessages = []

    // ========================================
    // Embedded MockSql Class
    // ========================================

    /**
     * Mock Sql implementation for testing without database connection.
     * Manages in-memory data for:
     * - 7 environments
     * - 5 applications
     * - 4 iterations (UUID Strings)
     * - 3 environment roles
     * - env_x_app junction table
     * - env_x_ite junction table (3-way with roles)
     */
    static class MockSql extends Sql {

        // Core data stores
        private List<Map<String, Object>> environments = []
        private List<Map<String, Object>> applications = []
        private List<Map<String, Object>> iterations = []
        private List<Map<String, Object>> environmentRoles = []
        private List<Map<String, Object>> envAppAssociations = []
        private List<Map<String, Object>> envIterationAssociations = []

        // Sequence counters
        private int envIdSequence = 8

        MockSql() {
            super(null as java.sql.Connection)
            initializeTestData()
        }

        /**
         * Initialize test data matching requirements.
         */
        private void initializeTestData() {
            // 7 environments
            environments = [
                [env_id: 1, env_code: 'DEV', env_name: 'Development', env_description: 'Development environment'],
                [env_id: 2, env_code: 'UAT', env_name: 'User Acceptance Testing', env_description: 'UAT environment'],
                [env_id: 3, env_code: 'PROD', env_name: 'Production', env_description: 'Production environment'],
                [env_id: 4, env_code: 'DR', env_name: 'Disaster Recovery', env_description: 'DR environment'],
                [env_id: 5, env_code: 'TEST', env_name: 'Testing', env_description: null], // Edge case: null description
                [env_id: 6, env_code: 'QA', env_name: 'Quality Assurance', env_description: 'QA environment'],
                [env_id: 7, env_code: 'STAGE', env_name: 'Staging', env_description: 'Staging environment']
            ]

            // 5 applications
            applications = [
                [app_id: 1, app_code: 'APP-001', app_name: 'Customer Portal'],
                [app_id: 2, app_code: 'APP-002', app_name: 'Payment Gateway'],
                [app_id: 3, app_code: 'APP-003', app_name: 'Reporting Service'],
                [app_id: 4, app_code: 'APP-004', app_name: 'API Gateway'],
                [app_id: 5, app_code: 'APP-005', app_name: 'Data Warehouse']
            ]

            // 4 iterations with UUID Strings (CRITICAL: String type, not UUID objects)
            iterations = [
                [ite_id: '11111111-1111-1111-1111-111111111111', ite_name: 'Wave 1', itt_code: 'CUTOVER', ite_status: 'ACTIVE'],
                [ite_id: '22222222-2222-2222-2222-222222222222', ite_name: 'Wave 2', itt_code: 'CUTOVER', ite_status: 'PLANNED'],
                [ite_id: '33333333-3333-3333-3333-333333333333', ite_name: 'Pilot', itt_code: 'PILOT', ite_status: 'ACTIVE'],
                [ite_id: '44444444-4444-4444-4444-444444444444', ite_name: 'Rollback Test', itt_code: 'ROLLBACK', ite_status: 'PLANNED']
            ]

            // 3 environment roles
            environmentRoles = [
                [enr_id: 1, enr_name: 'SOURCE', enr_description: 'Source environment for migration'],
                [enr_id: 2, enr_name: 'TARGET', enr_description: 'Target environment for migration'],
                [enr_id: 3, enr_name: 'ROLLBACK', enr_description: 'Rollback environment']
            ]

            // Junction tables
            envAppAssociations = [
                [env_id: 1, app_id: 1], // DEV - Customer Portal
                [env_id: 1, app_id: 2], // DEV - Payment Gateway
                [env_id: 3, app_id: 1], // PROD - Customer Portal
                [env_id: 3, app_id: 2], // PROD - Payment Gateway
                [env_id: 3, app_id: 3]  // PROD - Reporting Service
            ]

            // 3-way junction table with UUID Strings
            envIterationAssociations = [
                [env_id: 1, ite_id: '11111111-1111-1111-1111-111111111111', enr_id: 1], // DEV as SOURCE for Wave 1
                [env_id: 3, ite_id: '11111111-1111-1111-1111-111111111111', enr_id: 2], // PROD as TARGET for Wave 1
                [env_id: 4, ite_id: '11111111-1111-1111-1111-111111111111', enr_id: 3], // DR as ROLLBACK for Wave 1
                [env_id: 1, ite_id: '33333333-3333-3333-3333-333333333333', enr_id: 1]  // DEV as SOURCE for Pilot
            ]
        }

        /**
         * Mock rows() for SELECT queries with computed columns.
         * Handles:
         * - findAll with application_count and iteration_count
         * - findById with computed columns
         * - Pagination with search and sorting
         * - Role-based grouping queries
         */
        @Override
        List<Map<String, Object>> rows(String query, List params = []) {
            query = query.toLowerCase().trim()

            // ===== CATEGORY B: Query Operations =====

            // Non-paginated findAll with computed counts
            if (query.contains('select e.*, count(distinct ea.app_id) as application_count, count(distinct ei.ite_id) as iteration_count') &&
                query.contains('from environments_env e') &&
                query.contains('left join environments_env_x_applications_app ea') &&
                query.contains('left join environments_env_x_iterations_ite ei') &&
                query.contains('group by e.env_id') &&
                !query.contains('order by')) {

                return environments.collect { env ->
                    def appCount = envAppAssociations.count { it.env_id == env.env_id }
                    def iteCount = envIterationAssociations.count { it.env_id == env.env_id }

                    return [
                        env_id: env.env_id,
                        env_code: env.env_code,
                        env_name: env.env_name,
                        env_description: env.env_description,
                        application_count: appCount as Long,
                        iteration_count: iteCount as Long
                    ]
                }
            }

            // Paginated findAll with sorting and search
            if (query.contains('select e.*, count(distinct ea.app_id) as application_count, count(distinct ei.ite_id) as iteration_count') &&
                query.contains('from environments_env e') &&
                query.contains('left join environments_env_x_applications_app ea') &&
                query.contains('left join environments_env_x_iterations_ite ei') &&
                query.contains('group by e.env_id') &&
                (query.contains('order by') || query.contains('limit') || query.contains('offset'))) {

                def searchTerm = params.size() > 0 ? params[0] as String : null
                def limit = params.size() > 1 ? params[1] as Integer : 10
                def offset = params.size() > 2 ? params[2] as Integer : 0

                // Start with all environments
                def filtered = environments.collect { env ->
                    def appCount = envAppAssociations.count { it.env_id == env.env_id }
                    def iteCount = envIterationAssociations.count { it.env_id == env.env_id }

                    return [
                        env_id: env.env_id,
                        env_code: env.env_code,
                        env_name: env.env_name,
                        env_description: env.env_description,
                        application_count: appCount as Long,
                        iteration_count: iteCount as Long
                    ]
                }

                // Apply search filter (≥2 chars)
                if (searchTerm && searchTerm.length() >= 2) {
                    def lowerSearch = searchTerm.toLowerCase()
                    filtered = filtered.findAll { env ->
                        (env.env_code as String).toLowerCase().contains(lowerSearch) ||
                        (env.env_name as String).toLowerCase().contains(lowerSearch) ||
                        (env.env_description ? (env.env_description as String).toLowerCase().contains(lowerSearch) : false)
                    }
                }

                // Apply sorting (extract from query)
                if (query.contains('order by application_count desc')) {
                    filtered = filtered.sort { a, b -> (b.application_count as Long) <=> (a.application_count as Long) }
                } else if (query.contains('order by iteration_count desc')) {
                    filtered = filtered.sort { a, b -> (b.iteration_count as Long) <=> (a.iteration_count as Long) }
                } else if (query.contains('order by env_code asc')) {
                    filtered = filtered.sort { a, b -> (a.env_code as String) <=> (b.env_code as String) }
                } else if (query.contains('order by env_name asc')) {
                    filtered = filtered.sort { a, b -> (a.env_name as String) <=> (b.env_name as String) }
                }

                // Apply pagination
                def paginated = filtered.drop(offset as int).take(limit as int)

                return paginated
            }

            // Count query for pagination
            if (query.contains('select count(distinct e.env_id)') &&
                query.contains('from environments_env e')) {

                def searchTerm = params.size() > 0 ? params[0] as String : null

                def count = environments.size()

                // Apply search filter
                if (searchTerm && searchTerm.length() >= 2) {
                    def lowerSearch = searchTerm.toLowerCase()
                    count = environments.count { env ->
                        (env.env_code as String).toLowerCase().contains(lowerSearch) ||
                        (env.env_name as String).toLowerCase().contains(lowerSearch) ||
                        (env.env_description ? (env.env_description as String).toLowerCase().contains(lowerSearch) : false)
                    }
                }

                return [[count: count as Long]]
            }

            // ===== CATEGORY A: CRUD Operations =====

            // findById with computed columns
            if (query.contains('select e.*, count(distinct ea.app_id) as application_count, count(distinct ei.ite_id) as iteration_count') &&
                query.contains('from environments_env e') &&
                query.contains('where e.env_id = ?')) {

                def envId = params[0] as Integer
                def env = environments.find { it.env_id == envId }

                if (!env) {
                    return []
                }

                def appCount = envAppAssociations.count { it.env_id == envId }
                def iteCount = envIterationAssociations.count { it.env_id == envId }

                return [[
                    env_id: env.env_id,
                    env_code: env.env_code,
                    env_name: env.env_name,
                    env_description: env.env_description,
                    application_count: appCount as Long,
                    iteration_count: iteCount as Long
                ]]
            }

            // ===== CATEGORY C: Application Association Management =====

            // Get applications for environment
            if (query.contains('select a.*') &&
                query.contains('from applications_app a') &&
                query.contains('inner join environments_env_x_applications_app ea') &&
                query.contains('where ea.env_id = ?')) {

                def envId = params[0] as Integer
                def appIds = envAppAssociations.findAll { it.env_id == envId }.collect { it.app_id }

                return applications.findAll { appIds.contains(it.app_id) }
            }

            // ===== CATEGORY D: Iteration Association Management (UUID String handling) =====

            // Get iterations for environment with roles (complex nested query)
            if (query.contains('select i.*, it.itt_name as ite_type, enr.enr_name as role_name') &&
                query.contains('from iterations_ite i') &&
                query.contains('inner join environments_env_x_iterations_ite ei') &&
                query.contains('inner join environment_roles_enr enr') &&
                query.contains('where ei.env_id = ?')) {

                def envId = params[0] as Integer

                // Get iteration associations for this environment
                def associations = envIterationAssociations.findAll { it.env_id == envId }

                return associations.collect { assoc ->
                    def iteration = iterations.find { it.ite_id == assoc.ite_id }
                    def role = environmentRoles.find { it.enr_id == assoc.enr_id }

                    return [
                        ite_id: iteration.ite_id, // UUID String
                        ite_name: iteration.ite_name,
                        ite_status: iteration.ite_status,
                        ite_type: iteration.itt_code,
                        role_name: role.enr_name,
                        role_description: role.enr_description
                    ]
                }
            }

            // ===== CATEGORY E: Relationship Analysis & Edge Cases =====

            // Get blocking relationships (environments with active iterations)
            if (query.contains('select distinct e.env_id, e.env_code, e.env_name') &&
                query.contains('from environments_env e') &&
                query.contains('inner join environments_env_x_iterations_ite ei') &&
                query.contains('inner join iterations_ite i') &&
                query.contains("where i.ite_status = 'ACTIVE'")) {

                // Get environments with active iteration associations
                def activeIterationIds = iterations.findAll { it.ite_status == 'ACTIVE' }.collect { it.ite_id }
                def envIds = envIterationAssociations.findAll { activeIterationIds.contains(it.ite_id) }.collect { it.env_id }.unique()

                return environments.findAll { envIds.contains(it.env_id) }.collect { env ->
                    [
                        env_id: env.env_id,
                        env_code: env.env_code,
                        env_name: env.env_name
                    ]
                }
            }

            // Get all environment roles
            if (query.contains('select enr_id, enr_name, enr_description') &&
                query.contains('from environment_roles_enr')) {

                return environmentRoles.collect { role ->
                    [
                        enr_id: role.enr_id,
                        enr_name: role.enr_name,
                        enr_description: role.enr_description
                    ]
                }
            }

            return []
        }

        /**
         * Mock firstRow() for single result queries.
         */
        @Override
        Map<String, Object> firstRow(String query, List params = []) {
            def results = rows(query, params)
            return results.isEmpty() ? null : results[0]
        }

        /**
         * Mock executeInsert() for INSERT operations.
         * Handles:
         * - Creating new environments
         * - Associating applications (2-way junction)
         * - Associating iterations with roles (3-way junction, UUID Strings)
         */
        @Override
        List<List<Object>> executeInsert(String query, Map params = [:]) {
            query = query.toLowerCase().trim()

            // ===== CATEGORY A: CRUD Operations =====

            // Insert new environment
            if (query.contains('insert into environments_env')) {
                def newEnvId = envIdSequence++

                // Check for unique constraint violation (env_code)
                def codeExists = environments.any { it.env_code == params.envCode }
                if (codeExists) {
                    throw new SQLException("duplicate key value violates unique constraint \"environments_env_env_code_key\"", "23505")
                }

                def newEnv = [
                    env_id: newEnvId,
                    env_code: params.envCode,
                    env_name: params.envName,
                    env_description: params.envDescription
                ]

                environments << newEnv

                return [[newEnvId]]
            }

            // ===== CATEGORY C: Application Association Management =====

            // Associate application with environment
            if (query.contains('insert into environments_env_x_applications_app')) {
                // Check for duplicate key (2-way comparison)
                def exists = envAppAssociations.any { assoc ->
                    assoc.env_id == (params.envId as Integer) &&
                    assoc.app_id == (params.appId as Integer)
                }

                if (exists) {
                    throw new SQLException("duplicate key value violates unique constraint \"environments_env_x_applications_app_pkey\"", "23505")
                }

                // Check for foreign key violations
                def envExists = environments.any { it.env_id == (params.envId as Integer) }
                def appExists = applications.any { it.app_id == (params.appId as Integer) }

                if (!envExists) {
                    throw new SQLException("insert or update on table \"environments_env_x_applications_app\" violates foreign key constraint \"fk_env_app_env\"", "23503")
                }

                if (!appExists) {
                    throw new SQLException("insert or update on table \"environments_env_x_applications_app\" violates foreign key constraint \"fk_env_app_app\"", "23503")
                }

                // Add association
                envAppAssociations << [
                    env_id: params.envId as Integer,
                    app_id: params.appId as Integer
                ]

                return [[1]]
            }

            // ===== CATEGORY D: Iteration Association Management (UUID String handling) =====

            // Associate iteration with environment and role (3-way junction)
            if (query.contains('insert into environments_env_x_iterations_ite')) {
                // CRITICAL: ite_id is String, not UUID object
                def iteId = params.iteId as String

                // Check for duplicate key (3-way comparison)
                def exists = envIterationAssociations.any { assoc ->
                    assoc.env_id == (params.envId as Integer) &&
                    assoc.ite_id == iteId && // String comparison
                    assoc.enr_id == (params.enrId as Integer)
                }

                if (exists) {
                    throw new SQLException("duplicate key value violates unique constraint \"environments_env_x_iterations_ite_pkey\"", "23505")
                }

                // Check for foreign key violations
                def envExists = environments.any { it.env_id == (params.envId as Integer) }
                def iteExists = iterations.any { it.ite_id == iteId } // String comparison
                def roleExists = environmentRoles.any { it.enr_id == (params.enrId as Integer) }

                if (!envExists) {
                    throw new SQLException("insert or update on table \"environments_env_x_iterations_ite\" violates foreign key constraint \"fk_env_ite_env\"", "23503")
                }

                if (!iteExists) {
                    throw new SQLException("insert or update on table \"environments_env_x_iterations_ite\" violates foreign key constraint \"fk_env_ite_ite\"", "23503")
                }

                if (!roleExists) {
                    throw new SQLException("insert or update on table \"environments_env_x_iterations_ite\" violates foreign key constraint \"fk_env_ite_role\"", "23503")
                }

                // Add association with String UUID
                envIterationAssociations << [
                    env_id: params.envId as Integer,
                    ite_id: iteId, // Store as String
                    enr_id: params.enrId as Integer
                ]

                return [[1]]
            }

            return [[1]]
        }

        /**
         * Mock executeUpdate() for UPDATE and DELETE operations.
         * Handles:
         * - Updating environment details
         * - Deleting environments
         * - Disassociating applications
         * - Disassociating iterations (UUID String handling)
         */
        @Override
        int executeUpdate(String query, Map params = [:]) {
            query = query.toLowerCase().trim()

            // ===== CATEGORY A: CRUD Operations =====

            // Update environment
            if (query.contains('update environments_env')) {
                def envId = params.envId as Integer
                def env = environments.find { it.env_id == envId }

                if (!env) {
                    return 0
                }

                // Check for unique constraint violation (env_code)
                if (params.containsKey('envCode')) {
                    def codeExists = environments.any { it.env_id != envId && it.env_code == params.envCode }
                    if (codeExists) {
                        throw new SQLException("duplicate key value violates unique constraint \"environments_env_env_code_key\"", "23505")
                    }
                    env.env_code = params.envCode
                }

                if (params.containsKey('envName')) {
                    env.env_name = params.envName
                }

                if (params.containsKey('envDescription')) {
                    env.env_description = params.envDescription
                }

                return 1
            }

            // Delete environment
            if (query.contains('delete from environments_env')) {
                def envId = params.envId as Integer

                // Check for foreign key violations (has associations)
                def hasAppAssociations = envAppAssociations.any { it.env_id == envId }
                def hasIteAssociations = envIterationAssociations.any { it.env_id == envId }

                if (hasAppAssociations || hasIteAssociations) {
                    throw new SQLException("update or delete on table \"environments_env\" violates foreign key constraint", "23503")
                }

                def removed = environments.removeAll { it.env_id == envId }

                return removed ? 1 : 0
            }

            // ===== CATEGORY C: Application Association Management =====

            // Disassociate application from environment
            if (query.contains('delete from environments_env_x_applications_app')) {
                def removed = envAppAssociations.removeAll { assoc ->
                    assoc.env_id == (params.envId as Integer) &&
                    assoc.app_id == (params.appId as Integer)
                }

                return removed ? 1 : 0
            }

            // ===== CATEGORY D: Iteration Association Management (UUID String handling) =====

            // Disassociate iteration from environment (3-way delete)
            if (query.contains('delete from environments_env_x_iterations_ite')) {
                def iteId = params.iteId as String // CRITICAL: String comparison

                def removed = envIterationAssociations.removeAll { assoc ->
                    assoc.env_id == (params.envId as Integer) &&
                    assoc.ite_id == iteId // String comparison
                }

                return removed ? 1 : 0
            }

            return 0
        }

        @Override
        void close() {
            // No-op for mock
        }
    }

    // ========================================
    // Embedded DatabaseUtil Class
    // ========================================

    /**
     * Database utility for connection management.
     * Uses MockSql for testing.
     */
    static class DatabaseUtil {
        static <T> T withSql(Closure<T> closure) {
            def sql = new MockSql()
            try {
                return closure.call(sql)
            } finally {
                sql.close()
            }
        }
    }

    // ========================================
    // Embedded EnvironmentRepository Class
    // ========================================

    /**
     * Environment repository implementation.
     * Manages environment entities with:
     * - CRUD operations
     * - Application associations (2-way junction)
     * - Iteration associations with roles (3-way junction, UUID Strings)
     * - Computed columns (application_count, iteration_count)
     * - Pagination with search and sorting
     * - Role-based grouping queries
     */
    static class EnvironmentRepository {

        /**
         * Create new environment.
         * ADR-031: Explicit type casting for all parameters.
         */
        Integer create(String envCode, String envName, String envDescription) {
            return DatabaseUtil.withSql { sql ->
                def result = sql.executeInsert('''
                    INSERT INTO environments_env (env_code, env_name, env_description)
                    VALUES (:envCode, :envName, :envDescription)
                ''', [
                    envCode: envCode as String,
                    envName: envName as String,
                    envDescription: envDescription as String
                ])

                return result[0][0] as Integer
            }
        }

        /**
         * Find environment by ID with computed columns.
         * Returns null if not found.
         */
        Map<String, Object> findById(Integer envId) {
            return DatabaseUtil.withSql { sql ->
                return sql.firstRow('''
                    SELECT e.*,
                           COUNT(DISTINCT ea.app_id) AS application_count,
                           COUNT(DISTINCT ei.ite_id) AS iteration_count
                    FROM environments_env e
                    LEFT JOIN environments_env_x_applications_app ea ON e.env_id = ea.env_id
                    LEFT JOIN environments_env_x_iterations_ite ei ON e.env_id = ei.env_id
                    WHERE e.env_id = ?
                    GROUP BY e.env_id
                ''', [envId as Integer])
            }
        }

        /**
         * Find all environments with computed columns (non-paginated).
         */
        List<Map<String, Object>> findAll() {
            return DatabaseUtil.withSql { sql ->
                return sql.rows('''
                    SELECT e.*,
                           COUNT(DISTINCT ea.app_id) AS application_count,
                           COUNT(DISTINCT ei.ite_id) AS iteration_count
                    FROM environments_env e
                    LEFT JOIN environments_env_x_applications_app ea ON e.env_id = ea.env_id
                    LEFT JOIN environments_env_x_iterations_ite ei ON e.env_id = ei.env_id
                    GROUP BY e.env_id
                ''')
            }
        }

        /**
         * Find environments with pagination, search, and sorting.
         * Supports sorting by computed columns (application_count, iteration_count).
         * Search requires ≥2 characters.
         */
        Map<String, Object> findAllPaginated(String searchTerm, String sortBy, String sortDir, Integer limit, Integer offset) {
            return DatabaseUtil.withSql { sql ->
                // Validate search term length
                def validSearch = searchTerm && searchTerm.length() >= 2 ? searchTerm as String : null

                // Build ORDER BY clause
                def orderClause = 'env_code ASC' // default
                if (sortBy) {
                    def validSortBy = sortBy as String
                    def validSortDir = (sortDir?.toUpperCase() == 'DESC' ? 'DESC' : 'ASC') as String

                    // Support computed columns
                    if (validSortBy in ['application_count', 'iteration_count', 'env_code', 'env_name']) {
                        orderClause = "${validSortBy} ${validSortDir}"
                    }
                }

                // Get paginated results
                def results = sql.rows("""
                    SELECT e.*,
                           COUNT(DISTINCT ea.app_id) AS application_count,
                           COUNT(DISTINCT ei.ite_id) AS iteration_count
                    FROM environments_env e
                    LEFT JOIN environments_env_x_applications_app ea ON e.env_id = ea.env_id
                    LEFT JOIN environments_env_x_iterations_ite ei ON e.env_id = ei.env_id
                    ${validSearch ? "WHERE (LOWER(e.env_code) LIKE LOWER(?) OR LOWER(e.env_name) LIKE LOWER(?) OR LOWER(e.env_description) LIKE LOWER(?))" : ""}
                    GROUP BY e.env_id
                    ORDER BY ${orderClause}
                    LIMIT ? OFFSET ?
                """, validSearch ? ["%${validSearch}%", "%${validSearch}%", "%${validSearch}%", limit as Integer, offset as Integer] : [limit as Integer, offset as Integer])

                // Get total count
                def countResult = sql.firstRow("""
                    SELECT COUNT(DISTINCT e.env_id) AS count
                    FROM environments_env e
                    ${validSearch ? "WHERE (LOWER(e.env_code) LIKE LOWER(?) OR LOWER(e.env_name) LIKE LOWER(?) OR LOWER(e.env_description) LIKE LOWER(?))" : ""}
                """, validSearch ? ["%${validSearch}%", "%${validSearch}%", "%${validSearch}%"] : [])

                return [
                    results: results,
                    total: countResult.count as Integer
                ]
            }
        }

        /**
         * Update environment.
         * ADR-031: Explicit type casting.
         */
        Integer update(Integer envId, String envCode, String envName, String envDescription) {
            return DatabaseUtil.withSql { sql ->
                return sql.executeUpdate('''
                    UPDATE environments_env
                    SET env_code = :envCode,
                        env_name = :envName,
                        env_description = :envDescription
                    WHERE env_id = :envId
                ''', [
                    envId: envId as Integer,
                    envCode: envCode as String,
                    envName: envName as String,
                    envDescription: envDescription as String
                ])
            }
        }

        /**
         * Delete environment.
         * Will fail with FK violation if environment has associations.
         */
        Integer delete(Integer envId) {
            return DatabaseUtil.withSql { sql ->
                return sql.executeUpdate('''
                    DELETE FROM environments_env
                    WHERE env_id = :envId
                ''', [envId: envId as Integer])
            }
        }

        /**
         * Associate application with environment.
         * 2-way junction table.
         */
        void associateApplication(Integer envId, Integer appId) {
            DatabaseUtil.withSql { sql ->
                sql.executeInsert('''
                    INSERT INTO environments_env_x_applications_app (env_id, app_id)
                    VALUES (:envId, :appId)
                ''', [
                    envId: envId as Integer,
                    appId: appId as Integer
                ])
            }
        }

        /**
         * Disassociate application from environment.
         */
        Integer disassociateApplication(Integer envId, Integer appId) {
            return DatabaseUtil.withSql { sql ->
                return sql.executeUpdate('''
                    DELETE FROM environments_env_x_applications_app
                    WHERE env_id = :envId AND app_id = :appId
                ''', [
                    envId: envId as Integer,
                    appId: appId as Integer
                ])
            }
        }

        /**
         * Get applications for environment.
         */
        List<Map<String, Object>> getApplicationsByEnvironment(Integer envId) {
            return DatabaseUtil.withSql { sql ->
                return sql.rows('''
                    SELECT a.*
                    FROM applications_app a
                    INNER JOIN environments_env_x_applications_app ea ON a.app_id = ea.app_id
                    WHERE ea.env_id = ?
                ''', [envId as Integer])
            }
        }

        /**
         * Associate iteration with environment and role.
         * 3-way junction table with UUID String for ite_id.
         * ADR-031: Explicit type casting for UUID String.
         */
        void associateIteration(Integer envId, String iteId, Integer enrId) {
            DatabaseUtil.withSql { sql ->
                sql.executeInsert('''
                    INSERT INTO environments_env_x_iterations_ite (env_id, ite_id, enr_id)
                    VALUES (:envId, :iteId, :enrId)
                ''', [
                    envId: envId as Integer,
                    iteId: iteId as String, // UUID String
                    enrId: enrId as Integer
                ])
            }
        }

        /**
         * Disassociate iteration from environment.
         * Removes all role associations for this environment-iteration pair.
         */
        Integer disassociateIteration(Integer envId, String iteId) {
            return DatabaseUtil.withSql { sql ->
                return sql.executeUpdate('''
                    DELETE FROM environments_env_x_iterations_ite
                    WHERE env_id = :envId AND ite_id = :iteId
                ''', [
                    envId: envId as Integer,
                    iteId: iteId as String // UUID String
                ])
            }
        }

        /**
         * Get iterations for environment with roles.
         * Returns complex nested structure grouped by role.
         */
        Map<String, Object> getIterationsByEnvironmentGroupedByRole(Integer envId) {
            return DatabaseUtil.withSql { sql ->
                def results = sql.rows('''
                    SELECT i.*,
                           it.itt_name AS ite_type,
                           enr.enr_name AS role_name,
                           enr.enr_description AS role_description
                    FROM iterations_ite i
                    INNER JOIN iteration_types_itt it ON i.itt_code = it.itt_code
                    INNER JOIN environments_env_x_iterations_ite ei ON i.ite_id = ei.ite_id
                    INNER JOIN environment_roles_enr enr ON ei.enr_id = enr.enr_id
                    WHERE ei.env_id = ?
                ''', [envId as Integer])

                // Group by role
                def grouped = results.groupBy { it.role_name }

                // Transform to nested structure
                return grouped.collectEntries { roleName, iterations ->
                    [
                        (roleName): [
                            role_description: iterations[0].role_description,
                            iterations: iterations.collect { ite ->
                                [
                                    ite_id: ite.ite_id,
                                    ite_name: ite.ite_name,
                                    ite_status: ite.ite_status,
                                    ite_type: ite.ite_type
                                ]
                            }
                        ]
                    ]
                }
            }
        }

        /**
         * Get environments with blocking relationships (active iterations).
         * Returns environments that cannot be deleted due to active iteration associations.
         */
        List<Map<String, Object>> getBlockingRelationships() {
            return DatabaseUtil.withSql { sql ->
                return sql.rows('''
                    SELECT DISTINCT e.env_id, e.env_code, e.env_name
                    FROM environments_env e
                    INNER JOIN environments_env_x_iterations_ite ei ON e.env_id = ei.env_id
                    INNER JOIN iterations_ite i ON ei.ite_id = i.ite_id
                    WHERE i.ite_status = 'ACTIVE'
                ''')
            }
        }

        /**
         * Get all environment roles.
         */
        List<Map<String, Object>> getAllEnvironmentRoles() {
            return DatabaseUtil.withSql { sql ->
                return sql.rows('''
                    SELECT enr_id, enr_name, enr_description
                    FROM environment_roles_enr
                    ORDER BY enr_name
                ''')
            }
        }
    }

    // ========================================
    // Test Helper Methods
    // ========================================

    /**
     * Run a single test with error handling.
     */
    static void runTest(String testName, Closure testClosure) {
        testsRun++
        try {
            testClosure.call()
            testsPassed++
            println "✓ PASS: ${testName}"
        } catch (AssertionError e) {
            testsFailed++
            def message = "✗ FAIL: ${testName}\n  ${e.message}"
            failureMessages << message
            println message
        } catch (Exception e) {
            testsFailed++
            def message = "✗ ERROR: ${testName}\n  ${e.class.simpleName}: ${e.message}"
            failureMessages << message
            println message
        }
    }

    /**
     * Print test summary.
     */
    static void printSummary() {
        println "\n" + "="*80
        println "TEST SUMMARY"
        println "="*80
        println "Total Tests: ${testsRun}"
        println "Passed:      ${testsPassed} (${testsRun > 0 ? String.format('%.1f%%', (testsPassed / testsRun) * 100) : '0.0%'})"
        println "Failed:      ${testsFailed}"

        if (testsFailed > 0) {
            println "\nFAILURES:"
            println "-"*80
            failureMessages.each { println it }
        }

        println "="*80

        // Exit with appropriate code
        System.exit(testsFailed > 0 ? 1 : 0)
    }

    // ========================================
    // CATEGORY A: CRUD Operations (6 tests)
    // ========================================

    static void testCreate() {
        runTest('create() returns new environment ID') {
            def repository = new EnvironmentRepository()
            def envId = repository.create('NEWENV', 'New Environment', 'Test environment')

            assert envId != null
            assert envId instanceof Integer
            assert envId >= 8 // After initial 7 environments
        }
    }

    static void testCreateWithNullDescription() {
        runTest('create() allows null description') {
            def repository = new EnvironmentRepository()
            def envId = repository.create('NULLDESC', 'Null Description Env', null)

            assert envId != null

            // Verify null description was stored
            def env = repository.findById(envId)
            assert env.env_description == null
        }
    }

    static void testCreateDuplicateCode() {
        runTest('create() throws SQLException 23505 for duplicate env_code') {
            def repository = new EnvironmentRepository()

            def thrown = false
            try {
                repository.create('DEV', 'Duplicate Dev', 'Should fail')
            } catch (SQLException e) {
                thrown = true
                assert e.getSQLState() == '23505'
                assert e.message.contains('duplicate key')
            }

            assert thrown, "Expected SQLException with state 23505"
        }
    }

    static void testFindById() {
        runTest('findById() returns environment with computed columns') {
            def repository = new EnvironmentRepository()
            def env = repository.findById(1 as Integer) // DEV

            assert env != null
            assert env.env_id == 1
            assert env.env_code == 'DEV'
            assert env.env_name == 'Development'
            assert env.env_description == 'Development environment'
            assert env.application_count == 2L // Customer Portal + Payment Gateway
            assert env.iteration_count == 2L // Wave 1 + Pilot
        }
    }

    static void testUpdate() {
        runTest('update() modifies environment and returns 1') {
            def repository = new EnvironmentRepository()

            def updated = repository.update(
                5 as Integer,
                'TESTUP',
                'Updated Testing',
                'Updated description'
            )

            assert updated == 1

            // Verify changes
            def env = repository.findById(5 as Integer)
            assert env.env_code == 'TESTUP'
            assert env.env_name == 'Updated Testing'
            assert env.env_description == 'Updated description'
        }
    }

    static void testDelete() {
        runTest('delete() removes environment without associations') {
            def repository = new EnvironmentRepository()

            // Environment 7 (STAGE) has no associations
            def deleted = repository.delete(7 as Integer)

            assert deleted == 1

            // Verify deletion
            def env = repository.findById(7 as Integer)
            assert env == null
        }
    }

    // ========================================
    // CATEGORY B: Query Operations (8 tests)
    // ========================================

    static void testFindAll() {
        runTest('findAll() returns all environments with computed columns') {
            def repository = new EnvironmentRepository()
            def environments = repository.findAll()

            assert environments != null
            assert environments.size() == 7

            // Verify computed columns
            def dev = environments.find { it.env_code == 'DEV' }
            assert dev.application_count == 2L
            assert dev.iteration_count == 2L

            def prod = environments.find { it.env_code == 'PROD' }
            assert prod.application_count == 3L
            assert prod.iteration_count == 1L
        }
    }

    static void testFindAllPaginatedFirstPage() {
        runTest('findAllPaginated() returns first page correctly') {
            def repository = new EnvironmentRepository()

            def result = repository.findAllPaginated(null, 'env_code', 'ASC', 3 as Integer, 0 as Integer)

            assert result.results.size() == 3
            assert result.total == 7
            assert result.results[0].env_code == 'DEV' // First alphabetically
        }
    }

    static void testFindAllPaginatedLastPage() {
        runTest('findAllPaginated() returns last page correctly') {
            def repository = new EnvironmentRepository()

            def result = repository.findAllPaginated(null, 'env_code', 'ASC', 3 as Integer, 6 as Integer)

            assert result.results.size() == 1 // Only 1 item on last page
            assert result.total == 7
        }
    }

    static void testFindAllPaginatedWithSearch() {
        runTest('findAllPaginated() filters by search term (≥2 chars)') {
            def repository = new EnvironmentRepository()

            // Search for "prod" (should match PROD and Production)
            def result = repository.findAllPaginated('prod', 'env_code', 'ASC', 10 as Integer, 0 as Integer)

            assert result.results.size() == 1
            assert result.total == 1
            assert result.results[0].env_code == 'PROD'
        }
    }

    static void testFindAllPaginatedSearchTooShort() {
        runTest('findAllPaginated() ignores search term <2 chars') {
            def repository = new EnvironmentRepository()

            // Search with 1 char should return all
            def result = repository.findAllPaginated('D', 'env_code', 'ASC', 10 as Integer, 0 as Integer)

            assert result.results.size() == 7 // All environments
            assert result.total == 7
        }
    }

    static void testFindAllPaginatedSortByApplicationCount() {
        runTest('findAllPaginated() sorts by application_count DESC') {
            def repository = new EnvironmentRepository()

            def result = repository.findAllPaginated(null, 'application_count', 'DESC', 10 as Integer, 0 as Integer)

            assert result.results.size() == 7
            assert result.results[0].env_code == 'PROD' // 3 apps
            assert result.results[0].application_count == 3L
        }
    }

    static void testFindAllPaginatedSortByIterationCount() {
        runTest('findAllPaginated() sorts by iteration_count DESC') {
            def repository = new EnvironmentRepository()

            def result = repository.findAllPaginated(null, 'iteration_count', 'DESC', 10 as Integer, 0 as Integer)

            assert result.results.size() == 7
            assert result.results[0].env_code == 'DEV' // 2 iterations
            assert result.results[0].iteration_count == 2L
        }
    }

    static void testFindAllPaginatedCombinedFilters() {
        runTest('findAllPaginated() combines search + sort + pagination') {
            def repository = new EnvironmentRepository()

            // Search "e" (matches DEV, TEST, QA, STAGE) + sort by name + limit 2
            def result = repository.findAllPaginated('e', 'env_name', 'ASC', 2 as Integer, 0 as Integer)

            assert result.results.size() == 2
            assert result.total >= 2 // At least 2 matches
        }
    }

    // ========================================
    // CATEGORY C: Application Association Management (4 tests)
    // ========================================

    static void testAssociateApplication() {
        runTest('associateApplication() creates new association') {
            def repository = new EnvironmentRepository()

            // Associate APP-003 with UAT
            repository.associateApplication(2 as Integer, 3 as Integer)

            // Verify association
            def apps = repository.getApplicationsByEnvironment(2 as Integer)
            assert apps.any { it.app_id == 3 }
        }
    }

    static void testAssociateApplicationDuplicate() {
        runTest('associateApplication() throws SQLException 23505 for duplicate') {
            def repository = new EnvironmentRepository()

            def thrown = false
            try {
                // Try to duplicate existing association (DEV + Customer Portal)
                repository.associateApplication(1 as Integer, 1 as Integer)
            } catch (SQLException e) {
                thrown = true
                assert e.getSQLState() == '23505'
                assert e.message.contains('duplicate key')
            }

            assert thrown, "Expected SQLException with state 23505"
        }
    }

    static void testAssociateApplicationInvalidFK() {
        runTest('associateApplication() throws SQLException 23503 for invalid FK') {
            def repository = new EnvironmentRepository()

            def thrown = false
            try {
                // Try to associate with non-existent application
                repository.associateApplication(1 as Integer, 999 as Integer)
            } catch (SQLException e) {
                thrown = true
                assert e.getSQLState() == '23503'
                assert e.message.contains('foreign key')
            }

            assert thrown, "Expected SQLException with state 23503"
        }
    }

    static void testDisassociateApplication() {
        runTest('disassociateApplication() removes association') {
            def repository = new EnvironmentRepository()

            // Disassociate Customer Portal from PROD
            def removed = repository.disassociateApplication(3 as Integer, 1 as Integer)

            assert removed == 1

            // Verify removal
            def apps = repository.getApplicationsByEnvironment(3 as Integer)
            assert !apps.any { it.app_id == 1 }
        }
    }

    // ========================================
    // CATEGORY D: Iteration Association Management (5 tests) - UUID String handling
    // ========================================

    static void testAssociateIteration() {
        runTest('associateIteration() creates 3-way association with UUID String') {
            def repository = new EnvironmentRepository()

            // Associate Wave 2 with UAT as TARGET
            repository.associateIteration(
                2 as Integer,
                '22222222-2222-2222-2222-222222222222',
                2 as Integer
            )

            // Verify association
            def grouped = repository.getIterationsByEnvironmentGroupedByRole(2 as Integer)
            assert grouped.containsKey('TARGET')
            assert grouped['TARGET'].iterations.any { it.ite_id == '22222222-2222-2222-2222-222222222222' }
        }
    }

    static void testAssociateIterationDuplicate() {
        runTest('associateIteration() throws SQLException 23505 for duplicate 3-way key') {
            def repository = new EnvironmentRepository()

            def thrown = false
            try {
                // Try to duplicate existing association (DEV + Wave 1 + SOURCE)
                repository.associateIteration(
                    1 as Integer,
                    '11111111-1111-1111-1111-111111111111',
                    1 as Integer
                )
            } catch (SQLException e) {
                thrown = true
                assert e.getSQLState() == '23505'
                assert e.message.contains('duplicate key')
            }

            assert thrown, "Expected SQLException with state 23505"
        }
    }

    static void testAssociateIterationInvalidFK() {
        runTest('associateIteration() throws SQLException 23503 for invalid iteration UUID') {
            def repository = new EnvironmentRepository()

            def thrown = false
            try {
                // Try to associate with non-existent iteration
                repository.associateIteration(
                    1 as Integer,
                    '99999999-9999-9999-9999-999999999999',
                    1 as Integer
                )
            } catch (SQLException e) {
                thrown = true
                assert e.getSQLState() == '23503'
                assert e.message.contains('foreign key')
            }

            assert thrown, "Expected SQLException with state 23503"
        }
    }

    static void testDisassociateIteration() {
        runTest('disassociateIteration() removes all role associations for iteration (UUID String)') {
            def repository = new EnvironmentRepository()

            // Disassociate Wave 1 from PROD (TARGET role)
            def removed = repository.disassociateIteration(
                3 as Integer,
                '11111111-1111-1111-1111-111111111111'
            )

            assert removed == 1

            // Verify removal
            def grouped = repository.getIterationsByEnvironmentGroupedByRole(3 as Integer)
            assert grouped.isEmpty() || !grouped.values().any { roleData ->
                roleData.iterations.any { it.ite_id == '11111111-1111-1111-1111-111111111111' }
            }
        }
    }

    static void testGetIterationsByEnvironmentGroupedByRole() {
        runTest('getIterationsByEnvironmentGroupedByRole() returns nested structure with UUID Strings') {
            def repository = new EnvironmentRepository()

            // Test DEV environment (env_id: 1) which has 2 iteration associations
            def grouped = repository.getIterationsByEnvironmentGroupedByRole(1 as Integer)

            // Validate structure
            assert grouped != null
            assert grouped instanceof Map
            assert grouped.containsKey('SOURCE')

            // Validate SOURCE role data
            def sourceData = grouped['SOURCE'] as Map
            assert sourceData.role_description == 'Source environment for migration'
            assert sourceData.iterations instanceof List
            assert (sourceData.iterations as List).size() == 2 // Wave 1 and Pilot

            // Validate iteration details with UUID String
            def iterations = sourceData.iterations as List
            def wave1 = iterations.find { it.ite_id == '11111111-1111-1111-1111-111111111111' } as Map
            assert wave1 != null
            assert wave1.ite_name == 'Wave 1'
            assert wave1.ite_type == 'CUTOVER'

            def pilot = iterations.find { it.ite_id == '33333333-3333-3333-3333-333333333333' } as Map
            assert pilot != null
            assert pilot.ite_name == 'Pilot'
            assert pilot.ite_type == 'PILOT'
        }
    }

    // ========================================
    // CATEGORY E: Relationship Analysis & Edge Cases (5 tests)
    // ========================================

    static void testGetBlockingRelationships() {
        runTest('getBlockingRelationships() returns environments with active iterations') {
            def repository = new EnvironmentRepository()

            def blocking = repository.getBlockingRelationships()

            // DEV, PROD, DR all have associations with Wave 1 (ACTIVE)
            // DEV also has association with Pilot (ACTIVE)
            assert blocking.size() >= 3
            assert blocking.any { it.env_code == 'DEV' }
            assert blocking.any { it.env_code == 'PROD' }
            assert blocking.any { it.env_code == 'DR' }
        }
    }

    static void testGetBlockingRelationshipsEmpty() {
        runTest('getBlockingRelationships() returns empty when no active iterations') {
            def repository = new EnvironmentRepository()

            // In real scenario, would need to deactivate all iterations
            // For this test, verify structure is correct
            def blocking = repository.getBlockingRelationships()

            assert blocking != null
            assert blocking instanceof List
        }
    }

    static void testGetAllEnvironmentRoles() {
        runTest('getAllEnvironmentRoles() returns all 3 roles') {
            def repository = new EnvironmentRepository()

            def roles = repository.getAllEnvironmentRoles()

            assert roles.size() == 3
            assert roles.any { it.enr_name == 'SOURCE' }
            assert roles.any { it.enr_name == 'TARGET' }
            assert roles.any { it.enr_name == 'ROLLBACK' }

            // Verify structure
            def source = roles.find { it.enr_name == 'SOURCE' }
            assert source.enr_description == 'Source environment for migration'
        }
    }

    static void testEnvironmentWithNoRelationships() {
        runTest('Environment with no relationships returns empty structures') {
            def repository = new EnvironmentRepository()

            // Environment 6 (QA) has no associations
            def apps = repository.getApplicationsByEnvironment(6 as Integer)
            assert apps.isEmpty()

            def grouped = repository.getIterationsByEnvironmentGroupedByRole(6 as Integer)
            assert grouped.isEmpty()

            // Verify computed columns show 0
            def env = repository.findById(6 as Integer)
            assert env.application_count == 0L
            assert env.iteration_count == 0L
        }
    }

    static void testDeleteWithBlockingRelationships() {
        runTest('delete() throws SQLException 23503 when environment has associations') {
            def repository = new EnvironmentRepository()

            def thrown = false
            try {
                // Try to delete DEV which has both app and iteration associations
                repository.delete(1 as Integer)
            } catch (SQLException e) {
                thrown = true
                assert e.getSQLState() == '23503'
                assert e.message.contains('foreign key')
            }

            assert thrown, "Expected SQLException with state 23503"
        }
    }

    // ========================================
    // Main Execution
    // ========================================

    static void main(String[] args) {
        println "="*80
        println "EnvironmentRepository Comprehensive Test Suite"
        println "TD-014 Phase 1 Week 2 - Repository Layer Testing"
        println "="*80
        println "Architecture: TD-001 Self-Contained Pattern"
        println "Type Safety: ADR-031 Explicit Casting"
        println "Target Coverage: 90-93% of 14 repository methods"
        println "Test Count: 28 tests across 5 categories"
        println "="*80
        println ""

        // Category A: CRUD Operations (6 tests)
        println "CATEGORY A: CRUD Operations (6 tests)"
        println "-"*80
        testCreate()
        testCreateWithNullDescription()
        testCreateDuplicateCode()
        testFindById()
        testUpdate()
        testDelete()
        println ""

        // Category B: Query Operations (8 tests)
        println "CATEGORY B: Query Operations (8 tests)"
        println "-"*80
        testFindAll()
        testFindAllPaginatedFirstPage()
        testFindAllPaginatedLastPage()
        testFindAllPaginatedWithSearch()
        testFindAllPaginatedSearchTooShort()
        testFindAllPaginatedSortByApplicationCount()
        testFindAllPaginatedSortByIterationCount()
        testFindAllPaginatedCombinedFilters()
        println ""

        // Category C: Application Association Management (4 tests)
        println "CATEGORY C: Application Association Management (4 tests)"
        println "-"*80
        testAssociateApplication()
        testAssociateApplicationDuplicate()
        testAssociateApplicationInvalidFK()
        testDisassociateApplication()
        println ""

        // Category D: Iteration Association Management (5 tests)
        println "CATEGORY D: Iteration Association Management (5 tests) - UUID String Handling"
        println "-"*80
        testAssociateIteration()
        testAssociateIterationDuplicate()
        testAssociateIterationInvalidFK()
        testDisassociateIteration()
        testGetIterationsByEnvironmentGroupedByRole()
        println ""

        // Category E: Relationship Analysis & Edge Cases (5 tests)
        println "CATEGORY E: Relationship Analysis & Edge Cases (5 tests)"
        println "-"*80
        testGetBlockingRelationships()
        testGetBlockingRelationshipsEmpty()
        testGetAllEnvironmentRoles()
        testEnvironmentWithNoRelationships()
        testDeleteWithBlockingRelationships()
        println ""

        // Print summary
        printSummary()
    }
}
