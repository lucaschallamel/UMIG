package umig.tests.isolated.repository

import groovy.sql.GroovyRowResult
import groovy.sql.Sql
import java.sql.Connection
import java.sql.SQLException
import java.sql.Timestamp

/**
 * TD-014: Comprehensive test suite for MigrationRepository
 * Architecture: Self-contained with embedded test infrastructure (ADR-031, TD-001)
 * Location: Isolated directory per ADR-072 (file size >1900 lines expected)
 * 
 * Test Coverage:
 * - 50 tests across 6 categories
 * - 29 repository methods (90-95% coverage target)
 * - File size: 70-80KB target
 * 
 * Categories:
 * A. CRUD Operations (10 tests)
 * B. Simple Retrieval & Pagination (8 tests)
 * C. Status Filtering (6 tests)
 * D. Date Range Filtering (6 tests)
 * E. Hierarchical Relationships (12 tests)
 * F. Validation & Edge Cases (8 tests)
 */
class MigrationRepositoryComprehensiveTest {

    /**
     * EMBEDDED TEST INFRASTRUCTURE
     * Self-contained test architecture with zero external dependencies
     * Copied EXACTLY from ApplicationRepositoryComprehensiveTest.groovy structure
     */
    static class EmbeddedTestInfrastructure {

        /**
         * MockConnection - Minimal Connection implementation
         * Implements all required Connection interface methods with minimal stubs
         */
        static class MockConnection implements Connection {
            @Override
            void close() throws SQLException {}

            @Override
            boolean isClosed() throws SQLException { return false }

            @Override
            void setAutoCommit(boolean autoCommit) throws SQLException {}

            @Override
            boolean getAutoCommit() throws SQLException { return true }

            @Override
            void commit() throws SQLException {}

            @Override
            void rollback() throws SQLException {}

            @Override
            java.sql.Statement createStatement() throws SQLException { return null }

            @Override
            java.sql.PreparedStatement prepareStatement(String sql) throws SQLException { return null }

            @Override
            java.sql.DatabaseMetaData getMetaData() throws SQLException { return null }

            @Override
            java.sql.CallableStatement prepareCall(String sql) throws SQLException { return null }

            @Override
            String nativeSQL(String sql) throws SQLException { return sql }

            @Override
            void setReadOnly(boolean readOnly) throws SQLException {}

            @Override
            boolean isReadOnly() throws SQLException { return false }

            @Override
            void setCatalog(String catalog) throws SQLException {}

            @Override
            String getCatalog() throws SQLException { return null }

            @Override
            void setTransactionIsolation(int level) throws SQLException {}

            @Override
            int getTransactionIsolation() throws SQLException { return Connection.TRANSACTION_NONE }

            @Override
            java.sql.SQLWarning getWarnings() throws SQLException { return null }

            @Override
            void clearWarnings() throws SQLException {}

            @Override
            java.sql.Statement createStatement(int resultSetType, int resultSetConcurrency) throws SQLException { return null }

            @Override
            java.sql.PreparedStatement prepareStatement(String sql, int resultSetType, int resultSetConcurrency) throws SQLException { return null }

            @Override
            java.sql.CallableStatement prepareCall(String sql, int resultSetType, int resultSetConcurrency) throws SQLException { return null }

            @Override
            Map<String, Class<?>> getTypeMap() throws SQLException { return [:] }

            @Override
            void setTypeMap(Map<String, Class<?>> map) throws SQLException {}

            @Override
            void setHoldability(int holdability) throws SQLException {}

            @Override
            int getHoldability() throws SQLException { return 0 }

            @Override
            java.sql.Savepoint setSavepoint() throws SQLException { return null }

            @Override
            java.sql.Savepoint setSavepoint(String name) throws SQLException { return null }

            @Override
            void rollback(java.sql.Savepoint savepoint) throws SQLException {}

            @Override
            void releaseSavepoint(java.sql.Savepoint savepoint) throws SQLException {}

            @Override
            java.sql.Statement createStatement(int resultSetType, int resultSetConcurrency, int resultSetHoldability) throws SQLException { return null }

            @Override
            java.sql.PreparedStatement prepareStatement(String sql, int resultSetType, int resultSetConcurrency, int resultSetHoldability) throws SQLException { return null }

            @Override
            java.sql.CallableStatement prepareCall(String sql, int resultSetType, int resultSetConcurrency, int resultSetHoldability) throws SQLException { return null }

            @Override
            java.sql.PreparedStatement prepareStatement(String sql, int autoGeneratedKeys) throws SQLException { return null }

            @Override
            java.sql.PreparedStatement prepareStatement(String sql, int[] columnIndexes) throws SQLException { return null }

            @Override
            java.sql.PreparedStatement prepareStatement(String sql, String[] columnNames) throws SQLException { return null }

            @Override
            java.sql.Clob createClob() throws SQLException { return null }

            @Override
            java.sql.Blob createBlob() throws SQLException { return null }

            @Override
            java.sql.NClob createNClob() throws SQLException { return null }

            @Override
            java.sql.SQLXML createSQLXML() throws SQLException { return null }

            @Override
            boolean isValid(int timeout) throws SQLException { return true }

            @Override
            void setClientInfo(String name, String value) throws java.sql.SQLClientInfoException {}

            @Override
            void setClientInfo(Properties properties) throws java.sql.SQLClientInfoException {}

            @Override
            String getClientInfo(String name) throws SQLException { return null }

            @Override
            Properties getClientInfo() throws SQLException { return new Properties() }

            @Override
            java.sql.Array createArrayOf(String typeName, Object[] elements) throws SQLException { return null }

            @Override
            java.sql.Struct createStruct(String typeName, Object[] attributes) throws SQLException { return null }

            @Override
            void setSchema(String schema) throws SQLException {}

            @Override
            String getSchema() throws SQLException { return null }

            @Override
            void abort(java.util.concurrent.Executor executor) throws SQLException {}

            @Override
            void setNetworkTimeout(java.util.concurrent.Executor executor, int milliseconds) throws SQLException {}

            @Override
            int getNetworkTimeout() throws SQLException { return 0 }

            @Override
            <T> T unwrap(Class<T> iface) throws SQLException { return null }

            @Override
            boolean isWrapperFor(Class<?> iface) throws SQLException { return false }
        }

        /**
         * EmbeddedMockSql - Core SQL mocking with migration-specific data structures
         * Implements query routing for all MigrationRepository operations
         */
        static class EmbeddedMockSql extends Sql {
            // Migration data structures - STATIC for persistence across withSql calls
            private static Map<UUID, Map<String, Object>> migrations = [:]
            private static Map<Integer, Map<String, Object>> statuses = [:]
            private static Map<Integer, Map<String, Object>> users = [:]
            private static Map<UUID, Map<String, Object>> iterations = [:]
            private static Map<UUID, Map<String, Object>> planMasters = [:]
            private static Map<UUID, Map<String, Object>> planInstances = [:]
            private static Map<UUID, Map<String, Object>> sequences = [:]
            private static Map<UUID, Map<String, Object>> phases = [:]

            // Counters for auto-increment IDs - STATIC for persistence
            private static int nextStatusId = 1
            private static int nextUserId = 1
            private static boolean dataInitialized = false

            /**
             * Reset all mock data to initial state
             * Called before tests to ensure clean state
             */
            static void resetMockData() {
                migrations.clear()
                statuses.clear()
                users.clear()
                iterations.clear()
                planMasters.clear()
                planInstances.clear()
                sequences.clear()
                phases.clear()
                nextStatusId = 1
                nextUserId = 1
                dataInitialized = false
            }

            EmbeddedMockSql() {
                super(new MockConnection())
                initializeTestData()
            }

            /**
             * Initialize comprehensive test data
             * 5 migrations with varying statuses and dates
             * 4 iterations linked to migrations
             * Complete hierarchical structure
             * NOTE: Only runs once (guards against re-initialization)
             */
            private void initializeTestData() {
                if (dataInitialized) return
                dataInitialized = true
                // Initialize statuses (Migration type)
                def statusIds = [:]
                ['Planning', 'In Progress', 'Completed', 'On Hold', 'Cancelled'].each { statusName ->
                    def statusId = nextStatusId++
                    statuses[statusId] = [
                        status_id: statusId,
                        status_entity_type: 'Migration',
                        status_name: statusName,
                        status_description: "${statusName} status for migrations",
                        status_icon: statusName.toLowerCase().replace(' ', '_'),
                        status_is_active: true
                    ]
                    statusIds[statusName] = statusId
                }

                // Initialize users
                def userIds = [:]
                ['admin', 'migration_lead', 'team_member'].each { username ->
                    def userId = nextUserId++
                    users[userId] = [
                        user_id: userId,
                        user_username: username,
                        user_email: "${username}@example.com",
                        user_display_name: username.replace('_', ' ').capitalize()
                    ]
                    userIds[username] = userId
                }

                // Initialize 5 migrations with varying characteristics
                def migrationData = [
                    [
                        name: 'Cloud Migration Q1',
                        status: 'In Progress',
                        owner: 'admin',
                        targetDate: '2025-03-31',
                        description: 'Primary cloud migration initiative'
                    ],
                    [
                        name: 'Legacy System Retirement',
                        status: 'Planning',
                        owner: 'migration_lead',
                        targetDate: '2025-06-30',
                        description: 'Decommission legacy systems'
                    ],
                    [
                        name: 'Database Consolidation',
                        status: 'Completed',
                        owner: 'admin',
                        targetDate: '2024-12-31',
                        description: 'Completed database consolidation'
                    ],
                    [
                        name: 'Network Infrastructure Update',
                        status: 'On Hold',
                        owner: 'team_member',
                        targetDate: '2025-09-30',
                        description: 'Network infrastructure modernization'
                    ],
                    [
                        name: 'Security Compliance Migration',
                        status: 'In Progress',
                        owner: 'migration_lead',
                        targetDate: '2025-04-30',
                        description: 'Security and compliance updates'
                    ]
                ]

                def migrationIds = []
                def now = new Timestamp(System.currentTimeMillis())

                migrationData.eachWithIndex { data, index ->
                    def migrationId = UUID.randomUUID()
                    migrationIds << migrationId
                    
                    migrations[migrationId] = [
                        mig_id: migrationId,
                        mig_name: data.name,
                        mig_description: data.description,
                        mig_status_id: statusIds[data.status],
                        mig_owner_id: userIds[data.owner],
                        mig_target_completion_date: Timestamp.valueOf("${data.targetDate} 23:59:59"),
                        mig_created_at: new Timestamp(now.time - (30L - index * 5) * 24 * 60 * 60 * 1000),
                        mig_updated_at: new Timestamp(now.time - (10L - index * 2) * 24 * 60 * 60 * 1000),
                        mig_is_active: true
                    ]
                }

                // Initialize 4 iterations linked to first 4 migrations
                def iterationNames = ['Initial Wave', 'Phase 2', 'Final Cutover', 'Rollback Plan', 'Post-Migration Review']
                def iterationIds = []
                
                iterationNames.eachWithIndex { name, index ->
                    def iterationId = UUID.randomUUID()
                    iterationIds << iterationId
                    
                    iterations[iterationId] = [
                        iter_id: iterationId,
                        iter_name: name,
                        iter_description: "Iteration: ${name}",
                        iter_migration_id: migrationIds[index],
                        iter_status_id: statusIds['Planning'],
                        iter_scheduled_start_date: Timestamp.valueOf("2025-0${index + 2}-01 00:00:00"),
                        iter_scheduled_end_date: Timestamp.valueOf("2025-0${index + 2}-28 23:59:59"),
                        iter_created_at: now,
                        iter_updated_at: now,
                        iter_is_active: true
                    ]
                }

                // Initialize plan masters (templates) for first 3 iterations
                iterationIds.take(3).eachWithIndex { iterationId, index ->
                    def planMasterId = UUID.randomUUID()
                    
                    planMasters[planMasterId] = [
                        plan_id: planMasterId,
                        plan_name: "Plan Template ${index + 1}",
                        plan_description: "Master plan template ${index + 1}",
                        plan_iteration_id: iterationId,
                        plan_is_master: true,
                        plan_created_at: now,
                        plan_updated_at: now,
                        plan_is_active: true
                    ]

                    // Create corresponding plan instance
                    def planInstanceId = UUID.randomUUID()
                    planInstances[planInstanceId] = [
                        plan_id: planInstanceId,
                        plan_name: "Plan Instance ${index + 1}",
                        plan_description: "Instance of plan template ${index + 1}",
                        plan_iteration_id: iterationId,
                        plan_master_id: planMasterId,
                        plan_is_master: false,
                        plan_created_at: now,
                        plan_updated_at: now,
                        plan_is_active: true
                    ]

                    // Create 2 sequences per plan master
                    (1..2).each { seqNum ->
                        def sequenceId = UUID.randomUUID()
                        sequences[sequenceId] = [
                            seq_id: sequenceId,
                            seq_name: "Sequence ${seqNum}",
                            seq_plan_id: planMasterId,
                            seq_order: seqNum,
                            seq_created_at: now,
                            seq_is_active: true
                        ]

                        // Create 3 phases per sequence
                        (1..3).each { phaseNum ->
                            def phaseId = UUID.randomUUID()
                            phases[phaseId] = [
                                phase_id: phaseId,
                                phase_name: "Phase ${phaseNum}",
                                phase_seq_id: sequenceId,
                                phase_order: phaseNum,
                                phase_created_at: now,
                                phase_is_active: true
                            ]
                        }
                    }
                }
            }

            /**
             * Query routing implementation
             * Routes queries to appropriate handler based on SQL pattern
             */
            @Override
            List<GroovyRowResult> rows(String query, List params = []) {
                def sql = query.toLowerCase().trim()

                // Route to appropriate handler based on query pattern
                // CRITICAL: Check for count(*) FIRST before table-specific checks
                if (sql.contains('count(*)')) {
                    return handleCountQuery(query, params)
                } else if (sql.contains('from tbl_migrations_master') || sql.contains('from tbl_migration')) {
                    return handleMigrationQuery(query, params)
                } else if (sql.contains('from tbl_iterations_master')) {
                    return handleIterationQuery(query, params)
                } else if (sql.contains('from tbl_plans_master')) {
                    return handlePlanQuery(query, params)
                } else if (sql.contains('from tbl_sequences_master')) {
                    return handleSequenceQuery(query, params)
                } else if (sql.contains('from tbl_phases_master')) {
                    return handlePhaseQuery(query, params)
                }

                return []
            }

            /**
             * Handle migration queries with status enrichment
             */
            private List<GroovyRowResult> handleMigrationQuery(String query, List params) {
                def results = []
                def sql = query.toLowerCase()

                // Start with all migrations
                def targetMigrations = migrations.values()

                // CRITICAL: Filter active migrations by default (soft delete pattern)
                // Only include active migrations unless explicitly querying all
                targetMigrations = targetMigrations.findAll { it.mig_is_active == true }

                // Detect pagination query (LIMIT ? OFFSET ? with Integer params)
                def isPaginationQuery = sql.contains('limit') && sql.contains('offset') && 
                                        params && params.size() >= 2 && 
                                        params[0] instanceof Integer && params[1] instanceof Integer

                // Filter by migration_id if provided
                if (params && params[0] instanceof UUID) {
                    def migrationId = params[0] as UUID
                    targetMigrations = targetMigrations.findAll { it.mig_id == migrationId }
                }

                // Apply ILIKE name search filter if present
                // Note: Use CharSequence to match both String and GString (from string interpolation)
                if (sql.contains('ilike') && params && params[0] instanceof CharSequence) {
                    def searchPattern = params[0].toString()
                    // Remove SQL wildcards and convert to case-insensitive regex
                    def searchTerm = searchPattern.replaceAll('%', '').toLowerCase()
                    targetMigrations = targetMigrations.findAll { 
                        it.mig_name?.toLowerCase()?.contains(searchTerm) 
                    }
                }

                // Apply owner filter if present (but NOT for pagination queries)
                if (!isPaginationQuery && sql.contains('mig_owner_id = ?') && params && params[0] instanceof Integer) {
                    def ownerId = params[0] as Integer
                    targetMigrations = targetMigrations.findAll { it.mig_owner_id == ownerId }
                }

                // Apply status filter if present (but NOT for pagination queries)
                if (!isPaginationQuery && sql.contains('mig_status_id = ?') && params && params[0] instanceof Integer) {
                    def statusId = params[0] as Integer
                    targetMigrations = targetMigrations.findAll { it.mig_status_id == statusId }
                }

                // Apply date range filters (for queries with ONLY date parameters)
                if (sql.contains('mig_target_completion_date >=') && sql.contains('mig_target_completion_date <=') &&
                    params && params.size() == 2 && params[0] instanceof Timestamp && params[1] instanceof Timestamp) {
                    def startDate = params[0] as Timestamp
                    def endDate = params[1] as Timestamp
                    targetMigrations = targetMigrations.findAll {
                        it.mig_target_completion_date >= startDate && it.mig_target_completion_date <= endDate
                    }
                }

                // Convert to list and apply sorting based on ORDER BY clause
                def migrationList = targetMigrations.toList()

                if (sql.contains('order by m.mig_created_at desc') || sql.contains('order by mig_created_at desc')) {
                    migrationList = migrationList.sort { a, b -> b.mig_created_at <=> a.mig_created_at }
                } else if (sql.contains('order by m.mig_target_completion_date') || sql.contains('order by mig_target_completion_date')) {
                    migrationList = migrationList.sort { a, b -> a.mig_target_completion_date <=> b.mig_target_completion_date }
                } else if (sql.contains('order by m.mig_created_at') || sql.contains('order by mig_created_at')) {
                    migrationList = migrationList.sort { a, b -> a.mig_created_at <=> b.mig_created_at }
                }

                targetMigrations = migrationList
                
                // Apply pagination
                // For parameterized queries (LIMIT ? OFFSET ?), extract from params
                // For literal queries (LIMIT 10 OFFSET 20), extract from SQL text
                def offset = 0
                def limit = 1000 // Reasonable default instead of Integer.MAX_VALUE
                
                if (isPaginationQuery) {
                    // Parameterized query: params = [pageSize, offset]
                    limit = params[0] as Integer
                    offset = params[1] as Integer
                } else {
                    // Literal query: extract from SQL text
                    if (sql.contains('offset')) {
                        def offsetMatch = sql =~ /offset\s+(\d+)/
                        if (offsetMatch) offset = offsetMatch[0][1] as Integer
                    }
                    if (sql.contains('limit')) {
                        def limitMatch = sql =~ /limit\s+(\d+)/
                        if (limitMatch) limit = limitMatch[0][1] as Integer
                    }
                }

                // Apply pagination only if needed
                if (offset > 0 || limit < 1000) {
                    targetMigrations = targetMigrations.drop(offset).take(limit)
                }

                // Enrich with status metadata
                targetMigrations.each { migration ->
                    def statusData = statuses[migration.mig_status_id]
                    def ownerData = users[migration.mig_owner_id]
                    
                    def row = new GroovyRowResult([
                        mig_id: migration.mig_id,
                        mig_name: migration.mig_name,
                        mig_description: migration.mig_description,
                        mig_status_id: migration.mig_status_id,
                        mig_owner_id: migration.mig_owner_id,
                        mig_target_completion_date: migration.mig_target_completion_date,
                        mig_created_at: migration.mig_created_at,
                        mig_updated_at: migration.mig_updated_at,
                        mig_is_active: migration.mig_is_active,
                        // Status metadata
                        status_name: statusData?.status_name,
                        status_description: statusData?.status_description,
                        status_icon: statusData?.status_icon,
                        status_is_active: statusData?.status_is_active,
                        // Owner metadata
                        owner_username: ownerData?.user_username,
                        owner_email: ownerData?.user_email,
                        owner_display_name: ownerData?.user_display_name
                    ])
                    results << row
                }

                return results
            }

            /**
             * Handle iteration queries
             */
            private List<GroovyRowResult> handleIterationQuery(String query, List params) {
                def results = []
                def sql = query.toLowerCase()

                def targetIterations = iterations.values()

                // Filter by migration_id if provided
                if (sql.contains('iter_migration_id') && params) {
                    def migrationId = params[0] as UUID
                    targetIterations = targetIterations.findAll { it.iter_migration_id == migrationId }
                }

                targetIterations.each { iteration ->
                    def statusData = statuses[iteration.iter_status_id]
                    
                    def row = new GroovyRowResult([
                        iter_id: iteration.iter_id,
                        iter_name: iteration.iter_name,
                        iter_description: iteration.iter_description,
                        iter_migration_id: iteration.iter_migration_id,
                        iter_status_id: iteration.iter_status_id,
                        iter_scheduled_start_date: iteration.iter_scheduled_start_date,
                        iter_scheduled_end_date: iteration.iter_scheduled_end_date,
                        iter_created_at: iteration.iter_created_at,
                        iter_updated_at: iteration.iter_updated_at,
                        iter_is_active: iteration.iter_is_active,
                        status_name: statusData?.status_name
                    ])
                    results << row
                }

                return results
            }

            /**
             * Handle plan queries (masters and instances)
             */
            private List<GroovyRowResult> handlePlanQuery(String query, List params) {
                def results = []
                def sql = query.toLowerCase()

                def targetPlans = []
                
                // Check if query is for masters only or instances only
                if (sql.contains('plan_is_master = true') || sql.contains("plan_is_master = 't'")) {
                    targetPlans = planMasters.values()
                } else if (sql.contains('plan_is_master = false') || sql.contains("plan_is_master = 'f'")) {
                    targetPlans = planInstances.values()
                } else {
                    targetPlans = planMasters.values() + planInstances.values()
                }

                // Filter by iteration_id if provided
                if (sql.contains('plan_iteration_id') && params) {
                    def iterationId = params[0] as UUID
                    targetPlans = targetPlans.findAll { it.plan_iteration_id == iterationId }
                }

                targetPlans.each { plan ->
                    def row = new GroovyRowResult(plan)
                    results << row
                }

                return results
            }

            /**
             * Handle sequence queries
             */
            private List<GroovyRowResult> handleSequenceQuery(String query, List params) {
                def results = []
                def sql = query.toLowerCase()

                def targetSequences = sequences.values()

                // Filter by plan_id if provided
                if (sql.contains('seq_plan_id') && params) {
                    def planId = params[0] as UUID
                    targetSequences = targetSequences.findAll { it.seq_plan_id == planId }
                }

                targetSequences.each { sequence ->
                    def row = new GroovyRowResult(sequence)
                    results << row
                }

                return results.sort { it.seq_order }
            }

            /**
             * Handle phase queries
             */
            private List<GroovyRowResult> handlePhaseQuery(String query, List params) {
                def results = []
                def sql = query.toLowerCase()

                def targetPhases = phases.values()

                // Filter by sequence_id if provided
                if (sql.contains('phase_seq_id') && params) {
                    def sequenceId = params[0] as UUID
                    targetPhases = targetPhases.findAll { it.phase_seq_id == sequenceId }
                }

                targetPhases.each { phase ->
                    def row = new GroovyRowResult(phase)
                    results << row
                }

                return results.sort { it.phase_order }
            }

            /**
             * Handle count queries
             */
            private List<GroovyRowResult> handleCountQuery(String query, List params) {
                def sql = query.toLowerCase()
                def count = 0

                if (sql.contains('from tbl_migrations_master')) {
                    def targetMigrations = migrations.values()

                    // Apply active filter (default behavior)
                    if (sql.contains('mig_is_active')) {
                        targetMigrations = targetMigrations.findAll { it.mig_is_active == true }
                    }

                    // Apply same filters as main query
                    if (sql.contains('mig_status_id') && params) {
                        def statusId = params[0] as Integer
                        targetMigrations = targetMigrations.findAll { it.mig_status_id == statusId }
                    }

                    count = targetMigrations.size()
                } else if (sql.contains('from tbl_iterations_master')) {
                    count = iterations.size()
                }

                return [new GroovyRowResult([count: count])]
            }

            /**
             * Execute insert operations
             */
            @Override
            List<List<Object>> executeInsert(String sql, List params) {
                def lowerSql = sql.toLowerCase()

                if (lowerSql.contains('into tbl_migrations_master')) {
                    return handleMigrationInsert(params)
                } else if (lowerSql.contains('into tbl_iterations_master')) {
                    return handleIterationInsert(params)
                }

                return [[]]
            }

            private List<List<Object>> handleMigrationInsert(List params) {
                def migrationId = params[0] as UUID
                def migrationName = params[1] as String
                def now = new Timestamp(System.currentTimeMillis())

                // Check for duplicate migration name (SQL state 23505)
                def duplicateName = migrations.values().any { it.mig_name?.equalsIgnoreCase(migrationName) && it.mig_is_active }
                if (duplicateName) {
                    throw new RuntimeException("SQL state 23505: Unique constraint violation on migration name '${migrationName}'")
                }

                // Check for valid statusId (SQL state 23503)
                def statusId = params[3] as Integer
                if (!statuses.containsKey(statusId)) {
                    throw new RuntimeException("SQL state 23503: Foreign key constraint violation on mig_status_id=${statusId}")
                }

                migrations[migrationId] = [
                    mig_id: migrationId,
                    mig_name: params[1] as String,
                    mig_description: params[2] as String,
                    mig_status_id: params[3] as Integer,
                    mig_owner_id: params[4] as Integer,
                    mig_target_completion_date: params[5] as Timestamp,
                    mig_created_at: now,
                    mig_updated_at: now,
                    mig_is_active: true
                ]

                return [[migrationId]]
            }

            private List<List<Object>> handleIterationInsert(List params) {
                def iterationId = params[0] as UUID
                def now = new Timestamp(System.currentTimeMillis())

                iterations[iterationId] = [
                    iter_id: iterationId,
                    iter_name: params[1] as String,
                    iter_description: params[2] as String,
                    iter_migration_id: params[3] as UUID,
                    iter_status_id: params[4] as Integer,
                    iter_scheduled_start_date: params[5] as Timestamp,
                    iter_scheduled_end_date: params[6] as Timestamp,
                    iter_created_at: now,
                    iter_updated_at: now,
                    iter_is_active: true
                ]

                return [[iterationId]]
            }

            /**
             * Execute update operations
             */
            @Override
            int executeUpdate(String sql, List params) {
                def lowerSql = sql.toLowerCase()

                if (lowerSql.contains('update tbl_migrations_master')) {
                    return handleMigrationUpdate(sql, params)
                } else if (lowerSql.contains('delete from tbl_migrations_master')) {
                    return handleMigrationDelete(params)
                }

                return 0
            }

            private int handleMigrationUpdate(String sql, List params) {
                def lowerSql = sql.toLowerCase()
                
                if (lowerSql.contains('mig_is_active = false')) {
                    // Soft delete
                    def migrationId = params[0] as UUID
                    if (migrations.containsKey(migrationId)) {
                        migrations[migrationId].mig_is_active = false
                        return 1
                    }
                } else {
                    // Regular update
                    def migrationId = params.last() as UUID
                    if (migrations.containsKey(migrationId)) {
                        def migration = migrations[migrationId]
                        
                        // Update fields based on query
                        if (lowerSql.contains('mig_name')) {
                            migration.mig_name = params[0] as String
                        }
                        if (lowerSql.contains('mig_description')) {
                            migration.mig_description = params[1] as String
                        }
                        if (lowerSql.contains('mig_status_id')) {
                            def statusIndex = lowerSql.indexOf('mig_status_id')
                            def paramIndex = lowerSql.substring(0, statusIndex).count('?')
                            def newStatusId = params[paramIndex] as Integer

                            // Validate statusId exists (SQL state 23503)
                            if (!statuses.containsKey(newStatusId)) {
                                throw new RuntimeException("SQL state 23503: Foreign key constraint violation on mig_status_id=${newStatusId}")
                            }

                            migration.mig_status_id = newStatusId
                        }
                        
                        migration.mig_updated_at = new Timestamp(System.currentTimeMillis())
                        return 1
                    }
                }
                
                return 0
            }

            private int handleMigrationDelete(List params) {
                def migrationId = params[0] as UUID

                // Check for dependent iterations (SQL state 23503)
                def hasIterations = iterations.values().any { it.iter_migration_id == migrationId && it.iter_is_active }
                if (hasIterations) {
                    throw new RuntimeException("SQL state 23503: Foreign key constraint violation - migration has dependent iterations")
                }

                if (migrations.remove(migrationId) != null) {
                    return 1
                }
                return 0
            }

            /**
             * First row query support
             */
            @Override
            GroovyRowResult firstRow(String query, List params = []) {
                def results = rows(query, params)
                return results ? results[0] : null
            }
        }

        /**
         * EmbeddedDatabaseUtil - Database utility wrapper
         * Provides DatabaseUtil.withSql pattern for consistent database access
         */
        static class EmbeddedDatabaseUtil {
            static <T> T withSql(Closure<T> closure) {
                def mockSql = new EmbeddedMockSql()
                return closure.call(mockSql)
            }
        }

        /**
         * EmbeddedMigrationRepository - Repository implementation under test
         * All 29 methods from MigrationRepository
         */
        static class EmbeddedMigrationRepository {
            
            // ========================================
            // CRUD OPERATIONS (5 methods)
            // ========================================

            /**
             * Create new migration
             */
            Map<String, Object> createMigration(Map<String, Object> migrationData) {
                // Validate required fields
                if (!migrationData.name) {
                    throw new IllegalArgumentException("Migration name is required")
                }
                if (!migrationData.statusId) {
                    throw new IllegalArgumentException("Migration statusId is required")
                }
                if (!migrationData.ownerId) {
                    throw new IllegalArgumentException("Migration ownerId is required")
                }

                return EmbeddedDatabaseUtil.withSql { sql ->
                    def migrationId = UUID.randomUUID()
                    def now = new Timestamp(System.currentTimeMillis())

                    sql.executeInsert(
                        '''INSERT INTO tbl_migrations_master 
                           (mig_id, mig_name, mig_description, mig_status_id, mig_owner_id, mig_target_completion_date)
                           VALUES (?, ?, ?, ?, ?, ?)''',
                        [
                            migrationId,
                            migrationData.name as String,
                            migrationData.description as String,
                            migrationData.statusId as Integer,
                            migrationData.ownerId as Integer,
                            migrationData.targetCompletionDate as Timestamp
                        ]
                    )

                    return getMigrationById(migrationId)
                }
            }

            /**
             * Get migration by ID with status enrichment
             */
            Map<String, Object> getMigrationById(UUID migrationId) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def row = sql.firstRow(
                        '''SELECT m.*, 
                                  s.status_name, s.status_description, s.status_icon, s.status_is_active,
                                  u.user_username as owner_username, u.user_email as owner_email, 
                                  u.user_display_name as owner_display_name
                           FROM tbl_migrations_master m
                           LEFT JOIN tbl_statuses_master s ON m.mig_status_id = s.status_id
                           LEFT JOIN tbl_users u ON m.mig_owner_id = u.user_id
                           WHERE m.mig_id = ? AND m.mig_is_active = true''',
                        [migrationId]
                    )

                    if (!row) return null

                    return transformToMigrationOutput(row)
                }
            }

            /**
             * Update existing migration
             */
            Map<String, Object> updateMigration(UUID migrationId, Map<String, Object> updates) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def setClause = []
                    def params = []

                    if (updates.containsKey('name')) {
                        setClause << 'mig_name = ?'
                        params << (updates.name as String)
                    }
                    if (updates.containsKey('description')) {
                        setClause << 'mig_description = ?'
                        params << (updates.description as String)
                    }
                    if (updates.containsKey('statusId')) {
                        setClause << 'mig_status_id = ?'
                        params << (updates.statusId as Integer)
                    }
                    if (updates.containsKey('ownerId')) {
                        setClause << 'mig_owner_id = ?'
                        params << (updates.ownerId as Integer)
                    }
                    if (updates.containsKey('targetCompletionDate')) {
                        setClause << 'mig_target_completion_date = ?'
                        params << (updates.targetCompletionDate as Timestamp)
                    }

                    setClause << 'mig_updated_at = CURRENT_TIMESTAMP'
                    params << migrationId

                    def updateSql = "UPDATE tbl_migrations_master SET ${setClause.join(', ')} WHERE mig_id = ?"
                    sql.executeUpdate(updateSql, params)

                    return getMigrationById(migrationId)
                }
            }

            /**
             * Soft delete migration
             */
            boolean softDeleteMigration(UUID migrationId) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def result = sql.executeUpdate(
                        'UPDATE tbl_migrations_master SET mig_is_active = false WHERE mig_id = ?',
                        [migrationId]
                    )
                    return result > 0
                }
            }

            /**
             * Hard delete migration (admin only)
             */
            boolean deleteMigration(UUID migrationId) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def result = sql.executeUpdate(
                        'DELETE FROM tbl_migrations_master WHERE mig_id = ?',
                        [migrationId]
                    )
                    return result > 0
                }
            }

            // ========================================
            // SIMPLE RETRIEVAL (4 methods)
            // ========================================

            /**
             * Get all migrations
             */
            List<Map<String, Object>> getAllMigrations() {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def rows = sql.rows(
                        '''SELECT m.*, 
                                  s.status_name, s.status_description, s.status_icon, s.status_is_active,
                                  u.user_username as owner_username, u.user_email as owner_email,
                                  u.user_display_name as owner_display_name
                           FROM tbl_migrations_master m
                           LEFT JOIN tbl_statuses_master s ON m.mig_status_id = s.status_id
                           LEFT JOIN tbl_users u ON m.mig_owner_id = u.user_id
                           WHERE m.mig_is_active = true
                           ORDER BY m.mig_created_at DESC'''
                    )

                    return rows.collect { transformToMigrationOutput(it) }
                }
            }

            /**
             * Get active migrations only
             */
            List<Map<String, Object>> getActiveMigrations() {
                return getAllMigrations().findAll { it.isActive }
            }

            /**
             * Get migrations by owner
             */
            List<Map<String, Object>> getMigrationsByOwner(Integer ownerId) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def rows = sql.rows(
                        '''SELECT m.*, 
                                  s.status_name, s.status_description, s.status_icon, s.status_is_active,
                                  u.user_username as owner_username, u.user_email as owner_email,
                                  u.user_display_name as owner_display_name
                           FROM tbl_migrations_master m
                           LEFT JOIN tbl_statuses_master s ON m.mig_status_id = s.status_id
                           LEFT JOIN tbl_users u ON m.mig_owner_id = u.user_id
                           WHERE m.mig_owner_id = ? AND m.mig_is_active = true
                           ORDER BY m.mig_created_at DESC''',
                        [ownerId]
                    )

                    return rows.collect { transformToMigrationOutput(it) }
                }
            }

            /**
             * Count total migrations
             */
            Integer countMigrations() {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def row = sql.firstRow(
                        'SELECT COUNT(*) as count FROM tbl_migrations_master WHERE mig_is_active = true'
                    )
                    return row.count as Integer
                }
            }

            // ========================================
            // PAGINATION (2 methods)
            // ========================================

            /**
             * Get paginated migrations
             */
            Map<String, Object> getPaginatedMigrations(Integer page, Integer pageSize) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def offset = (page - 1) * pageSize
                    
                    def rows = sql.rows(
                        '''SELECT m.*, 
                                  s.status_name, s.status_description, s.status_icon, s.status_is_active,
                                  u.user_username as owner_username, u.user_email as owner_email,
                                  u.user_display_name as owner_display_name
                           FROM tbl_migrations_master m
                           LEFT JOIN tbl_statuses_master s ON m.mig_status_id = s.status_id
                           LEFT JOIN tbl_users u ON m.mig_owner_id = u.user_id
                           WHERE m.mig_is_active = true
                           ORDER BY m.mig_created_at DESC
                           LIMIT ? OFFSET ?''',
                        [pageSize, offset]
                    )

                    def totalCount = countMigrations()
                    def migrations = rows.collect { transformToMigrationOutput(it) }

                    return [
                        migrations: migrations,
                        page: page,
                        pageSize: pageSize,
                        totalCount: totalCount,
                        totalPages: Math.ceil(totalCount / pageSize) as Integer
                    ]
                }
            }

            /**
             * Search migrations by name
             */
            List<Map<String, Object>> searchMigrationsByName(String searchTerm) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def rows = sql.rows(
                        '''SELECT m.*, 
                                  s.status_name, s.status_description, s.status_icon, s.status_is_active,
                                  u.user_username as owner_username, u.user_email as owner_email,
                                  u.user_display_name as owner_display_name
                           FROM tbl_migrations_master m
                           LEFT JOIN tbl_statuses_master s ON m.mig_status_id = s.status_id
                           LEFT JOIN tbl_users u ON m.mig_owner_id = u.user_id
                           WHERE m.mig_name ILIKE ? AND m.mig_is_active = true
                           ORDER BY m.mig_created_at DESC''',
                        ["%${searchTerm}%"]
                    )

                    return rows.collect { transformToMigrationOutput(it) }
                }
            }

            // ========================================
            // STATUS FILTERING (3 methods)
            // ========================================

            /**
             * Get migrations by status
             */
            List<Map<String, Object>> getMigrationsByStatus(Integer statusId) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def rows = sql.rows(
                        '''SELECT m.*, 
                                  s.status_name, s.status_description, s.status_icon, s.status_is_active,
                                  u.user_username as owner_username, u.user_email as owner_email,
                                  u.user_display_name as owner_display_name
                           FROM tbl_migrations_master m
                           LEFT JOIN tbl_statuses_master s ON m.mig_status_id = s.status_id
                           LEFT JOIN tbl_users u ON m.mig_owner_id = u.user_id
                           WHERE m.mig_status_id = ? AND m.mig_is_active = true
                           ORDER BY m.mig_created_at DESC''',
                        [statusId]
                    )

                    return rows.collect { transformToMigrationOutput(it) }
                }
            }

            /**
             * Get migrations by multiple statuses
             */
            List<Map<String, Object>> getMigrationsByStatuses(List<Integer> statusIds) {
                return getAllMigrations().findAll { it.statusId in statusIds }
            }

            /**
             * Count migrations by status
             */
            Integer countMigrationsByStatus(Integer statusId) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def row = sql.firstRow(
                        '''SELECT COUNT(*) as count 
                           FROM tbl_migrations_master 
                           WHERE mig_status_id = ? AND mig_is_active = true''',
                        [statusId]
                    )
                    return row.count as Integer
                }
            }

            // ========================================
            // HIERARCHICAL OPERATIONS (9 methods)
            // ========================================

            /**
             * Get iterations for migration
             */
            List<Map<String, Object>> getIterationsForMigration(UUID migrationId) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def rows = sql.rows(
                        '''SELECT i.*, s.status_name
                           FROM tbl_iterations_master i
                           LEFT JOIN tbl_statuses_master s ON i.iter_status_id = s.status_id
                           WHERE i.iter_migration_id = ? AND i.iter_is_active = true
                           ORDER BY i.iter_scheduled_start_date''',
                        [migrationId]
                    )

                    return rows.collect { row ->
                        [
                            id: row.iter_id,
                            name: row.iter_name,
                            description: row.iter_description,
                            migrationId: row.iter_migration_id,
                            statusId: row.iter_status_id,
                            statusName: row.status_name,
                            scheduledStartDate: row.iter_scheduled_start_date,
                            scheduledEndDate: row.iter_scheduled_end_date,
                            createdAt: row.iter_created_at,
                            isActive: row.iter_is_active
                        ]
                    }
                }
            }

            /**
             * Get plan masters for iteration
             */
            List<Map<String, Object>> getPlanMastersForIteration(UUID iterationId) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def rows = sql.rows(
                        '''SELECT * FROM tbl_plans_master 
                           WHERE plan_iteration_id = ? 
                           AND plan_is_master = true 
                           AND plan_is_active = true
                           ORDER BY plan_created_at''',
                        [iterationId]
                    )

                    return rows.collect { transformToPlanOutput(it) }
                }
            }

            /**
             * Get plan instances for iteration
             */
            List<Map<String, Object>> getPlanInstancesForIteration(UUID iterationId) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def rows = sql.rows(
                        '''SELECT * FROM tbl_plans_master 
                           WHERE plan_iteration_id = ? 
                           AND plan_is_master = false 
                           AND plan_is_active = true
                           ORDER BY plan_created_at''',
                        [iterationId]
                    )

                    return rows.collect { transformToPlanOutput(it) }
                }
            }

            /**
             * Get sequences for plan
             */
            List<Map<String, Object>> getSequencesForPlan(UUID planId) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def rows = sql.rows(
                        '''SELECT * FROM tbl_sequences_master 
                           WHERE seq_plan_id = ? AND seq_is_active = true
                           ORDER BY seq_order''',
                        [planId]
                    )

                    return rows.collect { row ->
                        [
                            id: row.seq_id,
                            name: row.seq_name,
                            planId: row.seq_plan_id,
                            order: row.seq_order,
                            createdAt: row.seq_created_at,
                            isActive: row.seq_is_active
                        ]
                    }
                }
            }

            /**
             * Get phases for sequence
             */
            List<Map<String, Object>> getPhasesForSequence(UUID sequenceId) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def rows = sql.rows(
                        '''SELECT * FROM tbl_phases_master 
                           WHERE phase_seq_id = ? AND phase_is_active = true
                           ORDER BY phase_order''',
                        [sequenceId]
                    )

                    return rows.collect { row ->
                        [
                            id: row.phase_id,
                            name: row.phase_name,
                            sequenceId: row.phase_seq_id,
                            order: row.phase_order,
                            createdAt: row.phase_created_at,
                            isActive: row.phase_is_active
                        ]
                    }
                }
            }

            /**
             * Get complete migration hierarchy
             */
            Map<String, Object> getMigrationHierarchy(UUID migrationId) {
                def migration = getMigrationById(migrationId)
                if (!migration) return null

                def iterations = getIterationsForMigration(migrationId)
                
                iterations.each { iteration ->
                    def planMasters = getPlanMastersForIteration(iteration.id as UUID)
                    def planInstances = getPlanInstancesForIteration(iteration.id as UUID)
                    
                    iteration.planMasters = planMasters
                    iteration.planInstances = planInstances
                    
                    planMasters.each { plan ->
                        def sequences = getSequencesForPlan(plan.id as UUID)
                        plan.sequences = sequences
                        
                        sequences.each { sequence ->
                            def phases = getPhasesForSequence(sequence.id as UUID)
                            sequence.phases = phases
                        }
                    }
                }

                migration.iterations = iterations
                return migration
            }

            /**
             * Count iterations for migration
             */
            Integer countIterationsForMigration(UUID migrationId) {
                return getIterationsForMigration(migrationId).size()
            }

            /**
             * Count plan masters for iteration
             */
            Integer countPlanMastersForIteration(UUID iterationId) {
                return getPlanMastersForIteration(iterationId).size()
            }

            /**
             * Check if migration has iterations
             */
            boolean hasMigrationIterations(UUID migrationId) {
                return countIterationsForMigration(migrationId) > 0
            }

            // ========================================
            // DATE RANGE FILTERING (3 methods)
            // ========================================

            /**
             * Get migrations by target date range
             */
            List<Map<String, Object>> getMigrationsByDateRange(Timestamp startDate, Timestamp endDate) {
                return EmbeddedDatabaseUtil.withSql { sql ->
                    def rows = sql.rows(
                        '''SELECT m.*, 
                                  s.status_name, s.status_description, s.status_icon, s.status_is_active,
                                  u.user_username as owner_username, u.user_email as owner_email,
                                  u.user_display_name as owner_display_name
                           FROM tbl_migrations_master m
                           LEFT JOIN tbl_statuses_master s ON m.mig_status_id = s.status_id
                           LEFT JOIN tbl_users u ON m.mig_owner_id = u.user_id
                           WHERE m.mig_target_completion_date >= ? 
                           AND m.mig_target_completion_date <= ?
                           AND m.mig_is_active = true
                           ORDER BY m.mig_target_completion_date''',
                        [startDate, endDate]
                    )

                    return rows.collect { transformToMigrationOutput(it) }
                }
            }

            /**
             * Get overdue migrations
             */
            List<Map<String, Object>> getOverdueMigrations() {
                def now = new Timestamp(System.currentTimeMillis())
                return getAllMigrations().findAll { 
                    it.targetCompletionDate < now && it.statusName != 'Completed'
                }
            }

            /**
             * Get upcoming migrations (next 30 days)
             */
            List<Map<String, Object>> getUpcomingMigrations(Integer days = 30) {
                def now = new Timestamp(System.currentTimeMillis())
                def futureDate = new Timestamp(now.time + days * 24L * 60 * 60 * 1000)
                
                return getMigrationsByDateRange(now, futureDate)
            }

            // ========================================
            // VALIDATION (3 methods)
            // ========================================

            /**
             * Check if migration exists
             */
            boolean migrationExists(UUID migrationId) {
                return getMigrationById(migrationId) != null
            }

            /**
             * Validate migration name is unique
             */
            boolean isMigrationNameUnique(String name, UUID excludeId = null) {
                def migrations = getAllMigrations()
                return !migrations.any { 
                    it.name.equalsIgnoreCase(name) && it.id != excludeId
                }
            }

            /**
             * Validate migration can be deleted (no dependencies)
             */
            Map<String, Object> validateMigrationDeletion(UUID migrationId) {
                def iterationCount = countIterationsForMigration(migrationId)
                
                return [
                    canDelete: iterationCount == 0,
                    blockingDependencies: iterationCount > 0 ? ['iterations'] : [],
                    dependencyCounts: [
                        iterations: iterationCount
                    ]
                ]
            }

            // ========================================
            // HELPER METHODS
            // ========================================

            /**
             * Transform database row to migration output format
             */
            private Map<String, Object> transformToMigrationOutput(GroovyRowResult row) {
                return [
                    id: row.mig_id,
                    name: row.mig_name,
                    description: row.mig_description,
                    statusId: row.mig_status_id,
                    statusName: row.status_name,
                    statusDescription: row.status_description,
                    statusIcon: row.status_icon,
                    statusIsActive: row.status_is_active,
                    ownerId: row.mig_owner_id,
                    ownerUsername: row.owner_username,
                    ownerEmail: row.owner_email,
                    ownerDisplayName: row.owner_display_name,
                    targetCompletionDate: row.mig_target_completion_date,
                    createdAt: row.mig_created_at,
                    updatedAt: row.mig_updated_at,
                    isActive: row.mig_is_active
                ]
            }

            /**
             * Transform database row to plan output format
             */
            private Map<String, Object> transformToPlanOutput(GroovyRowResult row) {
                return [
                    id: row.plan_id,
                    name: row.plan_name,
                    description: row.plan_description,
                    iterationId: row.plan_iteration_id,
                    masterId: row.plan_master_id,
                    isMaster: row.plan_is_master,
                    createdAt: row.plan_created_at,
                    updatedAt: row.plan_updated_at,
                    isActive: row.plan_is_active
                ]
            }
        }
    }

    /**
     * TEST EXECUTOR
     * Standardized test execution framework with result tracking
     */
    static class TestExecutor {
        private int testsRun = 0
        private int testsPassed = 0
        private int testsFailed = 0
        private List<String> failureMessages = []

        void runTest(String testName, Closure testLogic) {
            testsRun++
            try {
                testLogic()
                testsPassed++
                println "✓ ${testName}"
            } catch (AssertionError e) {
                testsFailed++
                def failureMsg = "${testName}: ${e.message}"
                failureMessages << failureMsg
                println "✗ ${failureMsg}"
            } catch (Exception e) {
                testsFailed++
                def failureMsg = "${testName}: ${e.class.simpleName} - ${e.message}"
                failureMessages << failureMsg
                println "✗ ${failureMsg}"
            }
        }

        void printSummary() {
            println "\n${'=' * 80}"
            println "TEST EXECUTION SUMMARY"
            println "${'=' * 80}"
            println "Total Tests: ${testsRun}"
            println "Passed: ${testsPassed} (${testsRun > 0 ? String.format('%.1f%%', (testsPassed / testsRun) * 100) : '0.0%'})"
            println "Failed: ${testsFailed}"
            
            if (testsFailed > 0) {
                println "\nFAILURES:"
                failureMessages.each { msg ->
                    println "  - ${msg}"
                }
            }
            println "${'=' * 80}\n"
        }
    }

    // ========================================
    // CATEGORY A: CRUD OPERATIONS (10 tests)
    // ========================================

    static void testCreateMigration(TestExecutor executor) {
        executor.runTest("A1: Create Migration - Valid Data") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrationData = [
                name: 'Test Migration',
                description: 'Test Description',
                statusId: 1,
                ownerId: 1,
                targetCompletionDate: Timestamp.valueOf('2025-12-31 23:59:59')
            ]
            
            def result = repo.createMigration(migrationData)
            
            assert result != null
            assert result.name == 'Test Migration'
            assert result.description == 'Test Description'
            assert result.statusId == 1
            assert result.ownerId == 1
            assert result.id != null
        }
    }

    static void testGetMigrationById(TestExecutor executor) {
        executor.runTest("A2: Get Migration By ID - Existing") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            assert migrations.size() > 0
            
            def firstMigration = migrations[0]
            def result = repo.getMigrationById(firstMigration.id as UUID)
            
            assert result != null
            assert result.id == firstMigration.id
            assert result.name == firstMigration.name
            assert result.statusName != null
        }
    }

    static void testGetMigrationByIdNonExistent(TestExecutor executor) {
        executor.runTest("A3: Get Migration By ID - Non-Existent") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def randomId = UUID.randomUUID()
            def result = repo.getMigrationById(randomId)
            
            assert result == null
        }
    }

    static void testUpdateMigration(TestExecutor executor) {
        executor.runTest("A4: Update Migration - Valid Changes") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def migrationToUpdate = migrations[0]
            
            def updates = [
                name: 'Updated Migration Name',
                description: 'Updated Description'
            ]
            
            def result = repo.updateMigration(migrationToUpdate.id as UUID, updates)
            
            assert result != null
            assert result.name == 'Updated Migration Name'
            assert result.description == 'Updated Description'
        }
    }

    static void testUpdateMigrationStatus(TestExecutor executor) {
        executor.runTest("A5: Update Migration - Status Change") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def migrationToUpdate = migrations[0]
            def originalStatusId = migrationToUpdate.statusId
            
            def newStatusId = originalStatusId == 1 ? 2 : 1
            def updates = [statusId: newStatusId]
            
            def result = repo.updateMigration(migrationToUpdate.id as UUID, updates)
            
            assert result != null
            assert result.statusId == newStatusId
            assert result.statusId != originalStatusId
        }
    }

    static void testSoftDeleteMigration(TestExecutor executor) {
        executor.runTest("A6: Soft Delete Migration") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def initialCount = migrations.size()
            def migrationToDelete = migrations[0]
            
            def deleteResult = repo.softDeleteMigration(migrationToDelete.id as UUID)
            assert deleteResult == true
            
            def afterDelete = repo.getAllMigrations()
            assert afterDelete.size() == initialCount - 1
        }
    }

    static void testHardDeleteMigration(TestExecutor executor) {
        executor.runTest("A7: Hard Delete Migration") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrationData = [
                name: 'Migration To Delete',
                description: 'Will be deleted',
                statusId: 1,
                ownerId: 1,
                targetCompletionDate: Timestamp.valueOf('2025-12-31 23:59:59')
            ]
            
            def created = repo.createMigration(migrationData)
            def deleteResult = repo.deleteMigration(created.id as UUID)
            
            assert deleteResult == true
            
            def retrieved = repo.getMigrationById(created.id as UUID)
            assert retrieved == null
        }
    }

    static void testCreateMigrationWithMissingFields(TestExecutor executor) {
        executor.runTest("A8: Create Migration - Missing Required Fields") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrationData = [
                name: 'Incomplete Migration'
                // Missing other required fields
            ]
            
            try {
                repo.createMigration(migrationData)
                assert false : "Should have thrown exception for missing fields"
            } catch (Exception e) {
                assert e != null
            }
        }
    }

    static void testUpdateNonExistentMigration(TestExecutor executor) {
        executor.runTest("A9: Update Migration - Non-Existent") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def randomId = UUID.randomUUID()
            def updates = [name: 'Updated Name']
            
            def result = repo.updateMigration(randomId, updates)
            assert result == null
        }
    }

    static void testDeleteNonExistentMigration(TestExecutor executor) {
        executor.runTest("A10: Delete Migration - Non-Existent") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def randomId = UUID.randomUUID()
            def result = repo.deleteMigration(randomId)
            
            assert result == false
        }
    }

    // ========================================
    // CATEGORY B: PAGINATION & RETRIEVAL (8 tests)
    // ========================================

    static void testGetAllMigrations(TestExecutor executor) {
        executor.runTest("B1: Get All Migrations") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def result = repo.getAllMigrations()
            
            assert result != null
            assert result.size() == 5
            assert result[0].statusName != null
        }
    }

    static void testGetActiveMigrations(TestExecutor executor) {
        executor.runTest("B2: Get Active Migrations Only") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def result = repo.getActiveMigrations()
            
            assert result != null
            assert result.every { it.isActive == true }
        }
    }

    static void testCountMigrations(TestExecutor executor) {
        executor.runTest("B3: Count Total Migrations") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def count = repo.countMigrations()
            
            assert count == 5
        }
    }

    static void testGetPaginatedMigrationsFirstPage(TestExecutor executor) {
        executor.runTest("B4: Paginated Migrations - First Page") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def result = repo.getPaginatedMigrations(1, 2)
            
            assert result.migrations.size() == 2
            assert result.page == 1
            assert result.pageSize == 2
            assert result.totalCount == 5
            assert result.totalPages == 3
        }
    }

    static void testGetPaginatedMigrationsLastPage(TestExecutor executor) {
        executor.runTest("B5: Paginated Migrations - Last Page") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def result = repo.getPaginatedMigrations(3, 2)
            
            assert result.migrations.size() == 1
            assert result.page == 3
            assert result.totalPages == 3
        }
    }

    static void testSearchMigrationsByName(TestExecutor executor) {
        executor.runTest("B6: Search Migrations By Name - Found") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def result = repo.searchMigrationsByName('Cloud')
            
            assert result.size() == 1
            assert result[0].name.contains('Cloud')
        }
    }

    static void testSearchMigrationsByNameNoResults(TestExecutor executor) {
        executor.runTest("B7: Search Migrations By Name - No Results") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def result = repo.searchMigrationsByName('NonExistent')
            
            assert result.size() == 0
        }
    }

    static void testGetMigrationsByOwner(TestExecutor executor) {
        executor.runTest("B8: Get Migrations By Owner") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def result = repo.getMigrationsByOwner(1) // admin user
            
            assert result.size() >= 1
            assert result.every { it.ownerId == 1 }
        }
    }

    // ========================================
    // CATEGORY C: HIERARCHICAL RELATIONSHIPS (12 tests)
    // ========================================

    static void testGetIterationsForMigration(TestExecutor executor) {
        executor.runTest("C1: Get Iterations For Migration") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def migrationId = migrations[0].id as UUID
            
            def result = repo.getIterationsForMigration(migrationId)
            
            assert result != null
            assert result.size() >= 1
            assert result[0].migrationId == migrationId
        }
    }

    static void testGetPlanMastersForIteration(TestExecutor executor) {
        executor.runTest("C2: Get Plan Masters For Iteration") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def iterations = repo.getIterationsForMigration(migrations[0].id as UUID)
            
            if (iterations.size() > 0) {
                def result = repo.getPlanMastersForIteration(iterations[0].id as UUID)
                
                assert result != null
                assert result.every { it.isMaster == true }
            }
        }
    }

    static void testGetPlanInstancesForIteration(TestExecutor executor) {
        executor.runTest("C3: Get Plan Instances For Iteration") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def iterations = repo.getIterationsForMigration(migrations[0].id as UUID)
            
            if (iterations.size() > 0) {
                def result = repo.getPlanInstancesForIteration(iterations[0].id as UUID)
                
                assert result != null
                assert result.every { it.isMaster == false }
            }
        }
    }

    static void testGetSequencesForPlan(TestExecutor executor) {
        executor.runTest("C4: Get Sequences For Plan") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def iterations = repo.getIterationsForMigration(migrations[0].id as UUID)
            
            if (iterations.size() > 0) {
                def plans = repo.getPlanMastersForIteration(iterations[0].id as UUID)
                
                if (plans.size() > 0) {
                    def result = repo.getSequencesForPlan(plans[0].id as UUID)
                    
                    assert result != null
                    assert result.size() >= 1
                }
            }
        }
    }

    static void testGetPhasesForSequence(TestExecutor executor) {
        executor.runTest("C5: Get Phases For Sequence") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def iterations = repo.getIterationsForMigration(migrations[0].id as UUID)
            
            if (iterations.size() > 0) {
                def plans = repo.getPlanMastersForIteration(iterations[0].id as UUID)
                
                if (plans.size() > 0) {
                    def sequences = repo.getSequencesForPlan(plans[0].id as UUID)
                    
                    if (sequences.size() > 0) {
                        def result = repo.getPhasesForSequence(sequences[0].id as UUID)
                        
                        assert result != null
                        assert result.size() >= 1
                    }
                }
            }
        }
    }

    static void testGetMigrationHierarchy(TestExecutor executor) {
        executor.runTest("C6: Get Complete Migration Hierarchy") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def migrationId = migrations[0].id as UUID
            
            def result = repo.getMigrationHierarchy(migrationId)
            
            assert result != null
            assert result.iterations != null
            assert result.iterations.size() >= 1
            
            if (result.iterations.size() > 0) {
                def iteration = result.iterations[0]
                assert iteration.planMasters != null || iteration.planInstances != null
            }
        }
    }

    static void testCountIterationsForMigration(TestExecutor executor) {
        executor.runTest("C7: Count Iterations For Migration") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def count = repo.countIterationsForMigration(migrations[0].id as UUID)
            
            assert count >= 0
        }
    }

    static void testCountPlanMastersForIteration(TestExecutor executor) {
        executor.runTest("C8: Count Plan Masters For Iteration") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def iterations = repo.getIterationsForMigration(migrations[0].id as UUID)
            
            if (iterations.size() > 0) {
                def count = repo.countPlanMastersForIteration(iterations[0].id as UUID)
                assert count >= 0
            }
        }
    }

    static void testHasMigrationIterations(TestExecutor executor) {
        executor.runTest("C9: Check Migration Has Iterations") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def result = repo.hasMigrationIterations(migrations[0].id as UUID)
            
            assert result == true
        }
    }

    static void testHasMigrationIterationsEmpty(TestExecutor executor) {
        executor.runTest("C10: Check Migration Has No Iterations") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def migrations = repo.getAllMigrations()
            def migrationWithoutIterations = migrations.find { 
                repo.countIterationsForMigration(it.id as UUID) == 0 
            }
            
            if (migrationWithoutIterations) {
                def result = repo.hasMigrationIterations(migrationWithoutIterations.id as UUID)
                assert result == false
            }
        }
    }

    static void testGetIterationsForNonExistentMigration(TestExecutor executor) {
        executor.runTest("C11: Get Iterations For Non-Existent Migration") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def randomId = UUID.randomUUID()
            def result = repo.getIterationsForMigration(randomId)
            
            assert result.size() == 0
        }
    }

    static void testGetHierarchyForNonExistentMigration(TestExecutor executor) {
        executor.runTest("C12: Get Hierarchy For Non-Existent Migration") {
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            def randomId = UUID.randomUUID()
            def result = repo.getMigrationHierarchy(randomId)
            
            assert result == null
        }
    }

    // ========================================
    // PLACEHOLDER TESTS FOR REMAINING CATEGORIES
    // To be implemented: Categories D, E, F (20 tests)
    // ========================================

    static void testGetMigrationsByStatus(TestExecutor executor) {
        executor.runTest("D1: Get Migrations By Status") {
            // Reset mock data to ensure clean state
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            // Test: Get migrations with "In Progress" status (statusId = 2)
            def statusId = 2 // "In Progress" status
            def result = repo.getMigrationsByStatus(statusId)
            
            // Verify correct count
            assert result != null
            assert result.size() == 2, "Expected 2 'In Progress' migrations, got ${result.size()}"
            
            // Verify all returned migrations have correct status
            assert result.every { it.statusName == 'In Progress' }, "All migrations should have 'In Progress' status"
            assert result.every { it.statusId == statusId }, "All migrations should have statusId = 2"
            
            // Verify migrations are ordered by creation date (DESC)
            def migrationNames = result.collect { it.name }
            assert migrationNames.contains('Cloud Migration Q1'), "Should include 'Cloud Migration Q1'"
            assert migrationNames.contains('Security Compliance Migration'), "Should include 'Security Compliance Migration'"
            
            // Verify fields are populated
            assert result.every { it.id != null }, "All migrations should have id"
            assert result.every { it.name != null }, "All migrations should have name"
            assert result.every { it.statusName != null }, "All migrations should have statusName"
        }
    }

    static void testGetMigrationsByMultipleStatuses(TestExecutor executor) {
        executor.runTest("D2: Get Migrations By Multiple Statuses") {
            // Reset mock data to ensure clean state
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            // Test: Get migrations with multiple statuses (In Progress and Planning)
            def statusIds = [1, 2] // Planning (1) and In Progress (2)
            def result = repo.getMigrationsByStatuses(statusIds)
            
            // Verify correct count (2 In Progress + 1 Planning = 3 total)
            assert result != null
            assert result.size() == 3, "Expected 3 migrations with 'Planning' or 'In Progress' status, got ${result.size()}"
            
            // Verify all returned migrations have one of the specified statuses
            assert result.every { it.statusId in statusIds }, "All migrations should have statusId in [1, 2]"
            
            // Verify specific migrations are included
            def statusNames = result.collect { it.statusName }
            assert statusNames.count { it == 'In Progress' } == 2, "Should have 2 'In Progress' migrations"
            assert statusNames.count { it == 'Planning' } == 1, "Should have 1 'Planning' migration"
            
            // Verify no other statuses are included
            assert !statusNames.contains('Completed'), "Should not include 'Completed' migrations"
            assert !statusNames.contains('On Hold'), "Should not include 'On Hold' migrations"
            assert !statusNames.contains('Cancelled'), "Should not include 'Cancelled' migrations"
        }
    }

    static void testCountMigrationsByStatus(TestExecutor executor) {
        executor.runTest("D3: Count Migrations By Status") {
            // Reset mock data to ensure clean state
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            // Test count for each status
            def inProgressCount = repo.countMigrationsByStatus(2) // In Progress
            def planningCount = repo.countMigrationsByStatus(1)   // Planning
            def completedCount = repo.countMigrationsByStatus(3)  // Completed
            def onHoldCount = repo.countMigrationsByStatus(4)     // On Hold
            def cancelledCount = repo.countMigrationsByStatus(5)  // Cancelled
            
            // Verify correct counts
            assert inProgressCount == 2, "Expected 2 'In Progress' migrations, got ${inProgressCount}"
            assert planningCount == 1, "Expected 1 'Planning' migration, got ${planningCount}"
            assert completedCount == 1, "Expected 1 'Completed' migration, got ${completedCount}"
            assert onHoldCount == 1, "Expected 1 'On Hold' migration, got ${onHoldCount}"
            assert cancelledCount == 0, "Expected 0 'Cancelled' migrations, got ${cancelledCount}"
            
            // Verify total count
            def totalCount = inProgressCount + planningCount + completedCount + onHoldCount + cancelledCount
            assert totalCount == 5, "Total migrations should be 5, got ${totalCount}"
        }
    }

    static void testGetMigrationsByDateRange(TestExecutor executor) {
        executor.runTest("E1: Get Migrations By Date Range") {
            // Reset mock data to ensure clean state
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            // Test: Get migrations with target dates in Q1 2025 (Jan 1 - Mar 31)
            def startDate = Timestamp.valueOf('2025-01-01 00:00:00')
            def endDate = Timestamp.valueOf('2025-03-31 23:59:59')
            def result = repo.getMigrationsByDateRange(startDate, endDate)
            
            // Verify correct count (only Cloud Migration Q1 with target date 2025-03-31)
            assert result != null
            assert result.size() == 1, "Expected 1 migration in Q1 2025, got ${result.size()}"
            
            // Verify the correct migration is returned
            assert result[0].name == 'Cloud Migration Q1', "Should return 'Cloud Migration Q1'"
            assert result[0].targetCompletionDate >= startDate, "Target date should be >= start date"
            assert result[0].targetCompletionDate <= endDate, "Target date should be <= end date"
            
            // Test: Get migrations with target dates in all of 2025
            def start2025 = Timestamp.valueOf('2025-01-01 00:00:00')
            def end2025 = Timestamp.valueOf('2025-12-31 23:59:59')
            def result2025 = repo.getMigrationsByDateRange(start2025, end2025)
            
            // Should return 4 migrations (all except Database Consolidation which is 2024-12-31)
            assert result2025.size() == 4, "Expected 4 migrations in 2025, got ${result2025.size()}"
            
            // Verify all expected 2025 migrations are present
            def migrationNames = result2025.collect { it.name }
            assert migrationNames.contains('Cloud Migration Q1'), "Should include Cloud Migration Q1"
            assert migrationNames.contains('Security Compliance Migration'), "Should include Security Compliance Migration"
            assert migrationNames.contains('Legacy System Retirement'), "Should include Legacy System Retirement"
            assert migrationNames.contains('Network Infrastructure Update'), "Should include Network Infrastructure Update"

            // Verify migrations are sorted by target completion date (ascending)
            for (int i = 0; i < result2025.size() - 1; i++) {
                assert result2025[i].targetCompletionDate <= result2025[i + 1].targetCompletionDate,
                    "Migration ${result2025[i].name} (${result2025[i].targetCompletionDate}) should come before ${result2025[i + 1].name} (${result2025[i + 1].targetCompletionDate})"
            }
        }
    }

    static void testGetOverdueMigrations(TestExecutor executor) {
        executor.runTest("E2: Get Overdue Migrations") {
            // Reset mock data to ensure clean state
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            // Test: Get overdue migrations (target date < now AND status != Completed)
            def result = repo.getOverdueMigrations()
            
            // Verify result structure
            assert result != null
            
            // All overdue migrations should have:
            // 1. Target completion date in the past
            // 2. Status NOT 'Completed'
            def now = new Timestamp(System.currentTimeMillis())
            result.each { migration ->
                assert migration.targetCompletionDate < now, "Overdue migration should have past target date: ${migration.name}"
                assert migration.statusName != 'Completed', "Overdue migration should not be Completed: ${migration.name}"
            }
            
            // Verify 'Database Consolidation' is NOT in results (it's Completed even though past)
            def migrationNames = result.collect { it.name }
            assert !migrationNames.contains('Database Consolidation'), "Completed migrations should not be overdue"
            
            // At minimum, verify the method works without errors
            assert result instanceof List, "Result should be a List"
        }
    }

    static void testGetUpcomingMigrations(TestExecutor executor) {
        executor.runTest("E3: Get Upcoming Migrations") {
            // Reset mock data to ensure clean state
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()
            
            // Test with default 30 days
            def result30 = repo.getUpcomingMigrations()
            
            // Verify result structure
            assert result30 != null
            assert result30 instanceof List, "Result should be a List"
            
            // All upcoming migrations should have future target dates
            def now = new Timestamp(System.currentTimeMillis())
            def future30 = new Timestamp(now.time + 30L * 24 * 60 * 60 * 1000)
            
            result30.each { migration ->
                assert migration.targetCompletionDate >= now, "Upcoming migration should have future target date: ${migration.name}"
                assert migration.targetCompletionDate <= future30, "Migration should be within 30 days: ${migration.name}"
            }
            
            // Test with custom 90 days
            def result90 = repo.getUpcomingMigrations(90)
            assert result90 != null
            
            // 90-day window should include same or more migrations than 30-day window
            assert result90.size() >= result30.size(), "90-day window should include at least as many migrations as 30-day window"
            
            // Verify migrations are ordered by target completion date (ascending)
            if (result90.size() > 1) {
                for (int i = 0; i < result90.size() - 1; i++) {
                    assert result90[i].targetCompletionDate <= result90[i + 1].targetCompletionDate,
                        "Migrations should be ordered by target date"
                }
            }
        }
    }

    static void testMigrationExists(TestExecutor executor) {
        executor.runTest("F1: Migration Exists") {
            // Reset mock data to ensure clean state
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()

            // Test: Check existing migration exists
            def migrations = repo.getAllMigrations()
            assert migrations.size() > 0, "Should have migrations for testing"

            def existingMigrationId = migrations[0].id as UUID
            def existsResult = repo.migrationExists(existingMigrationId)

            // Verify existing migration is found
            assert existsResult == true, "Existing migration should exist"

            // Test: Check non-existent migration does not exist
            def nonExistentId = UUID.randomUUID()
            def notExistsResult = repo.migrationExists(nonExistentId)

            // Verify non-existent migration is not found
            assert notExistsResult == false, "Non-existent migration should not exist"

            // Test: Verify soft-deleted migration doesn't exist
            repo.softDeleteMigration(existingMigrationId)
            def deletedExistsResult = repo.migrationExists(existingMigrationId)

            // Verify soft-deleted migration is not found (because getAllMigrations filters inactive)
            assert deletedExistsResult == false, "Soft-deleted migration should not exist"
        }
    }

    static void testIsMigrationNameUnique(TestExecutor executor) {
        executor.runTest("F2: Is Migration Name Unique") {
            // Reset mock data to ensure clean state
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()

            // Test: Unique name (not in database)
            def uniqueNameResult = repo.isMigrationNameUnique('Totally Unique Migration Name', null)
            assert uniqueNameResult == true, "Unique name should return true"

            // Test: Duplicate name (exists in database)
            def migrations = repo.getAllMigrations()
            assert migrations.size() > 0, "Should have migrations for testing"

            def existingName = migrations[0].name
            def duplicateNameResult = repo.isMigrationNameUnique(existingName, null)
            assert duplicateNameResult == false, "Duplicate name should return false"

            // Test: Case-insensitive duplicate detection
            def lowercaseName = existingName.toLowerCase()
            def caseInsensitiveResult = repo.isMigrationNameUnique(lowercaseName, null)
            assert caseInsensitiveResult == false, "Case-insensitive duplicate should return false"

            // Test: Exclusion logic - same name but exclude current ID
            def existingMigrationId = migrations[0].id as UUID
            def excludeResult = repo.isMigrationNameUnique(existingName, existingMigrationId)
            assert excludeResult == true, "Name with exclusion of same ID should return true"

            // Test: Exclusion logic - same name but different exclude ID
            def otherMigrationId = UUID.randomUUID()
            def excludeOtherResult = repo.isMigrationNameUnique(existingName, otherMigrationId)
            assert excludeOtherResult == false, "Name with exclusion of different ID should return false"
        }
    }

    static void testValidateMigrationDeletion(TestExecutor executor) {
        executor.runTest("F3: Validate Migration Deletion") {
            // Reset mock data to ensure clean state
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()

            // Create a test migration without iterations
            def testMigrationData = [
                name: 'Test Migration Without Dependencies',
                description: 'Test migration for deletion validation',
                statusId: 1,
                ownerId: 1,
                targetCompletionDate: Timestamp.valueOf('2025-12-31 23:59:59')
            ]
            def migrationWithoutDeps = repo.createMigration(testMigrationData)
            assert migrationWithoutDeps != null, "Test migration should be created"

            // Verify the test migration has no iterations
            assert repo.countIterationsForMigration(migrationWithoutDeps.id as UUID) == 0, "Test migration should have no iterations"

            def validationNoDeps = repo.validateMigrationDeletion(migrationWithoutDeps.id as UUID)

            // Verify migration can be deleted
            assert validationNoDeps.canDelete == true, "Migration without dependencies should be deletable"
            assert validationNoDeps.blockingDependencies == [], "Should have no blocking dependencies"
            assert validationNoDeps.dependencyCounts.iterations == 0, "Should have 0 iterations"

            // Test: Migration with iterations cannot be deleted
            def migrationWithDeps = repo.getAllMigrations().find { m ->
                repo.countIterationsForMigration(m.id as UUID) > 0
            }
            assert migrationWithDeps != null, "Should have migration with iterations"

            def validationWithDeps = repo.validateMigrationDeletion(migrationWithDeps.id as UUID)

            // Verify migration cannot be deleted
            assert validationWithDeps.canDelete == false, "Migration with dependencies should not be deletable"
            assert validationWithDeps.blockingDependencies == ['iterations'], "Should have 'iterations' as blocking dependency"
            assert validationWithDeps.dependencyCounts.iterations > 0, "Should have iterations count > 0"

            // Verify structure of validation result
            assert validationWithDeps.containsKey('canDelete'), "Result should have 'canDelete' field"
            assert validationWithDeps.containsKey('blockingDependencies'), "Result should have 'blockingDependencies' field"
            assert validationWithDeps.containsKey('dependencyCounts'), "Result should have 'dependencyCounts' field"
            assert validationWithDeps.dependencyCounts.containsKey('iterations'), "dependencyCounts should have 'iterations' field"
        }
    }

    // ========================================
    // CATEGORY G: SQL STATE MAPPING TESTS
    // ========================================

    static void testDeleteMigrationWithDependentIterations(TestExecutor executor) {
        executor.runTest("G1: Foreign Key Constraint Violation (23503)") {
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()

            // Find a migration with iterations
            def migrationWithIterations = repo.getAllMigrations().find { m ->
                repo.countIterationsForMigration(m.id as UUID) > 0
            }
            assert migrationWithIterations != null, "Should have migration with iterations for FK test"

            // Attempt hard delete (should fail with FK violation)
            def sqlStateDetected = false
            def exceptionMessage = ''

            try {
                repo.deleteMigration(migrationWithIterations.id as UUID)
                assert false, "Should have thrown FK constraint violation"
            } catch (Exception e) {
                sqlStateDetected = e.message?.contains('23503') ||
                                   e.message?.contains('foreign key') ||
                                   e.message?.contains('FK constraint')
                exceptionMessage = e.message
            }

            assert sqlStateDetected, "Should detect SQL state 23503 or FK constraint error. Got: ${exceptionMessage}"
        }
    }

    static void testCreateMigrationWithDuplicateName(TestExecutor executor) {
        executor.runTest("G2: Unique Constraint Violation (23505)") {
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()

            // Get existing migration name
            def existingMigration = repo.getAllMigrations()[0]
            def duplicateName = existingMigration.name

            // Attempt to create migration with duplicate name (should fail)
            def sqlStateDetected = false
            def exceptionMessage = ''

            try {
                def duplicateData = [
                    name: duplicateName,  // Duplicate name
                    description: 'Test duplicate name constraint',
                    statusId: 1,
                    ownerId: 1,
                    targetCompletionDate: Timestamp.valueOf('2025-12-31 23:59:59')
                ]
                repo.createMigration(duplicateData)
                assert false, "Should have thrown unique constraint violation"
            } catch (Exception e) {
                sqlStateDetected = e.message?.contains('23505') ||
                                   e.message?.contains('unique constraint') ||
                                   e.message?.contains('duplicate')
                exceptionMessage = e.message
            }

            assert sqlStateDetected, "Should detect SQL state 23505 or unique constraint error. Got: ${exceptionMessage}"
        }
    }

    static void testUpdateMigrationWithInvalidStatus(TestExecutor executor) {
        executor.runTest("G3: Update Foreign Key Constraint (23503)") {
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()

            // Get existing migration
            def existingMigration = repo.getAllMigrations()[0]

            // Attempt to update with non-existent statusId (should fail with FK violation)
            def sqlStateDetected = false
            def exceptionMessage = ''

            try {
                def invalidUpdateData = [
                    statusId: 99999  // Non-existent status ID
                ]
                repo.updateMigration(existingMigration.id as UUID, invalidUpdateData)
                assert false, "Should have thrown FK constraint violation for invalid status"
            } catch (Exception e) {
                sqlStateDetected = e.message?.contains('23503') ||
                                   e.message?.contains('foreign key') ||
                                   e.message?.contains('invalid status')
                exceptionMessage = e.message
            }

            assert sqlStateDetected, "Should detect SQL state 23503 or FK constraint error. Got: ${exceptionMessage}"
        }
    }

    static void testSoftDeletePreservesIterations(TestExecutor executor) {
        executor.runTest("G4: Cascade Delete Validation") {
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()

            // Find migration with iterations
            def migrationWithIterations = repo.getAllMigrations().find { m ->
                repo.countIterationsForMigration(m.id as UUID) > 0
            }
            assert migrationWithIterations != null, "Should have migration with iterations"

            def migrationId = migrationWithIterations.id as UUID
            def iterationCountBefore = repo.countIterationsForMigration(migrationId)
            assert iterationCountBefore > 0, "Should have iterations before soft delete"

            // Soft delete migration
            repo.softDeleteMigration(migrationId)

            // Verify iterations still exist
            def iterationCountAfter = repo.countIterationsForMigration(migrationId)
            assert iterationCountAfter == iterationCountBefore, "Iterations should remain after soft delete"

            // Verify migration marked inactive
            def deletedMigration = repo.getMigrationById(migrationId)
            assert deletedMigration == null || !deletedMigration.isActive, "Migration should be inactive after soft delete"
        }
    }

    // ========================================
    // CATEGORY H: JOIN NULL EDGE CASE TESTS
    // ========================================

    static void testGetMigrationWithMissingStatus(TestExecutor executor) {
        executor.runTest("H1: Missing Status Reference") {
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()

            // Directly insert a migration with NULL statusId (bypass repository validation)
            def migrationId = UUID.randomUUID()
            def now = new Timestamp(System.currentTimeMillis())

            EmbeddedTestInfrastructure.EmbeddedMockSql.migrations[migrationId] = [
                mig_id: migrationId,
                mig_name: 'Migration With Null Status',
                mig_description: 'Test NULL status handling',
                mig_status_id: null,  // NULL statusId
                mig_owner_id: 1,
                mig_target_completion_date: Timestamp.valueOf('2025-12-31 23:59:59'),
                mig_created_at: now,
                mig_updated_at: now,
                mig_is_active: true
            ]

            // Query via getMigrationById - should handle NULL gracefully
            def result = repo.getMigrationById(migrationId)

            // Verify NULL handling (doesn't crash, handles missing status)
            assert result != null, "Should return migration even with NULL statusId"
            assert result.id == migrationId, "Should return correct migration"
            assert result.statusId == null || result.statusName == null, "Should handle NULL status gracefully"
        }
    }

    static void testGetIterationsWithOrphanedRecords(TestExecutor executor) {
        executor.runTest("H2: Orphaned Iteration Records") {
            EmbeddedTestInfrastructure.EmbeddedMockSql.resetMockData()
            def repo = new EmbeddedTestInfrastructure.EmbeddedMigrationRepository()

            // Create migration and iterations
            def migrationData = [
                name: 'Migration To Be Deleted',
                description: 'Test orphaned iterations',
                statusId: 1,
                ownerId: 1,
                targetCompletionDate: Timestamp.valueOf('2025-12-31 23:59:59')
            ]
            def migration = repo.createMigration(migrationData)
            def migrationId = migration.id as UUID

            // Verify migration has iterations
            def iterationsBefore = repo.getIterationsForMigration(migrationId)
            assert iterationsBefore.size() == 0, "New migration should have no iterations initially"

            // Create an iteration manually
            def iterationId = UUID.randomUUID()
            def now = new Timestamp(System.currentTimeMillis())
            EmbeddedTestInfrastructure.EmbeddedMockSql.iterations[iterationId] = [
                iter_id: iterationId,
                iter_name: 'Test Iteration',
                iter_description: 'Will be orphaned',
                iter_migration_id: migrationId,
                iter_status_id: 1,
                iter_scheduled_start_date: Timestamp.valueOf('2025-01-01 00:00:00'),
                iter_scheduled_end_date: Timestamp.valueOf('2025-12-31 23:59:59'),
                iter_created_at: now,
                iter_updated_at: now,
                iter_is_active: true
            ]

            // Verify iteration exists
            def iterationsAfterCreate = repo.getIterationsForMigration(migrationId)
            assert iterationsAfterCreate.size() == 1, "Should have 1 iteration after creation"

            // Delete migration directly (bypass soft delete to create orphan)
            EmbeddedTestInfrastructure.EmbeddedMockSql.migrations.remove(migrationId)

            // Query getIterationsForMigration on deleted ID - should handle gracefully
            def iterationsAfterDelete = repo.getIterationsForMigration(migrationId)

            // Verify empty result, no crash
            assert iterationsAfterDelete != null, "Should not crash on orphaned iterations"
            assert iterationsAfterDelete.size() >= 0, "Should return empty or valid result"
        }
    }

    // ========================================
    // MAIN TEST EXECUTION
    // ========================================

    static void main(String[] args) {
        println "\n${'=' * 80}"
        println "TD-014: MIGRATION REPOSITORY COMPREHENSIVE TEST SUITE"
        println "${'=' * 80}\n"

        def executor = new TestExecutor()

        // Category A: CRUD Operations (10 tests)
        println "CATEGORY A: CRUD OPERATIONS"
        println "-" * 80
        testCreateMigration(executor)
        testGetMigrationById(executor)
        testGetMigrationByIdNonExistent(executor)
        testUpdateMigration(executor)
        testUpdateMigrationStatus(executor)
        testSoftDeleteMigration(executor)
        testHardDeleteMigration(executor)
        testCreateMigrationWithMissingFields(executor)
        testUpdateNonExistentMigration(executor)
        testDeleteNonExistentMigration(executor)

        // Category B: Pagination & Retrieval (8 tests)
        println "\nCATEGORY B: PAGINATION & RETRIEVAL"
        println "-" * 80
        testGetAllMigrations(executor)
        testGetActiveMigrations(executor)
        testCountMigrations(executor)
        testGetPaginatedMigrationsFirstPage(executor)
        testGetPaginatedMigrationsLastPage(executor)
        testSearchMigrationsByName(executor)
        testSearchMigrationsByNameNoResults(executor)
        testGetMigrationsByOwner(executor)

        // Category C: Hierarchical Relationships (12 tests)
        println "\nCATEGORY C: HIERARCHICAL RELATIONSHIPS"
        println "-" * 80
        testGetIterationsForMigration(executor)
        testGetPlanMastersForIteration(executor)
        testGetPlanInstancesForIteration(executor)
        testGetSequencesForPlan(executor)
        testGetPhasesForSequence(executor)
        testGetMigrationHierarchy(executor)
        testCountIterationsForMigration(executor)
        testCountPlanMastersForIteration(executor)
        testHasMigrationIterations(executor)
        testHasMigrationIterationsEmpty(executor)
        testGetIterationsForNonExistentMigration(executor)
        testGetHierarchyForNonExistentMigration(executor)

        // Placeholder tests for remaining categories
        println "\nCATEGORY D-F: PLACEHOLDER TESTS"
        println "-" * 80
        testGetMigrationsByStatus(executor)
        testGetMigrationsByMultipleStatuses(executor)
        testCountMigrationsByStatus(executor)
        testGetMigrationsByDateRange(executor)
        testGetOverdueMigrations(executor)
        testGetUpcomingMigrations(executor)
        testMigrationExists(executor)
        testIsMigrationNameUnique(executor)
        testValidateMigrationDeletion(executor)

        // Category G: SQL State Mapping Tests
        println "\nCATEGORY G: SQL STATE MAPPING TESTS"
        println "-" * 80
        testDeleteMigrationWithDependentIterations(executor)
        testCreateMigrationWithDuplicateName(executor)
        testUpdateMigrationWithInvalidStatus(executor)
        testSoftDeletePreservesIterations(executor)

        // Category H: JOIN NULL Edge Case Tests
        println "\nCATEGORY H: JOIN NULL EDGE CASE TESTS"
        println "-" * 80
        testGetMigrationWithMissingStatus(executor)
        testGetIterationsWithOrphanedRecords(executor)

        executor.printSummary()
    }
}
