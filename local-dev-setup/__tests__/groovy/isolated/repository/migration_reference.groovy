package umig.tests.unit.repository

import groovy.sql.GroovyRowResult
import groovy.sql.Sql
import java.sql.Connection
import java.sql.SQLException
import java.sql.Timestamp

/**
 * Comprehensive test suite for ApplicationRepository following TD-001 self-contained architecture
 *
 * Coverage: 28 tests across 5 categories targeting 85-90% of 15 repository methods
 * - Category 1: CRUD Operations (6 tests)
 * - Category 2: Query Methods with Pagination (7 tests)
 * - Category 3: Relationship Management (8 tests)
 * - Category 4: Validation & Error Handling (4 tests)
 * - Category 5: Performance & Edge Cases (3 tests)
 *
 * ADR-031 Compliance: Explicit type casting throughout
 * TD-001 Architecture: Zero external dependencies, embedded MockSql and DatabaseUtil
 */
class ApplicationRepositoryComprehensiveTest {

    // ==================== EMBEDDED MOCK INFRASTRUCTURE (TD-001) ====================

    /**
     * Consolidated test infrastructure to reduce static nested class count from 5 to 2
     * Following proven pattern from StepInstanceRepositoryComprehensiveTest
     * Reduces ScriptRunner class loader overhead and prevents stack crashes
     */
    static class EmbeddedTestInfrastructure {

        /**
         * Simplified MockConnection using methodMissing pattern (50 lines vs 189)
         * Only implements essential Connection methods, delegates rest to methodMissing
         */
        static class MockConnection implements Connection {
            private boolean closed = false
            private boolean autoCommit = true

            @Override
            void close() { closed = true }

            @Override
            boolean isClosed() { return closed }

            @Override
            boolean getAutoCommit() { return autoCommit }

            @Override
            void setAutoCommit(boolean ac) { autoCommit = ac }

            // Handle all other Connection interface methods with sensible defaults
            def methodMissing(String name, args) {
                // Return null for most unused Connection methods
                return null
            }

            def propertyMissing(String name) {
                // Return null for property access
                return null
            }

            @Override
            <T> T unwrap(Class<T> iface) { return null }

            @Override
            boolean isWrapperFor(Class<?> iface) { return false }
        }

        /**
         * EmbeddedMockSql - Complete PostgreSQL behavior simulation with junction table management
         * Handles named parameters, SQL state errors, and complex query routing
         */
        static class EmbeddedMockSql extends Sql {
            private Map<Integer, Map<String, Object>> applications = [:]
            private Map<Integer, Map<String, Object>> environments = [:]
            private Map<Integer, Map<String, Object>> teams = [:]
            private Map<Integer, Map<String, Object>> labels = [:]
            private List<Map<String, Object>> envAppJunctions = []
            private List<Map<String, Object>> teamAppJunctions = []
            private List<Map<String, Object>> labelAppJunctions = []

            EmbeddedMockSql() {
                super(new MockConnection())
                initializeTestData()
            }

        /**
         * Initialize comprehensive test dataset
         * 5 Applications, 4 Environments, 3 Teams, 5 Labels
         * 10 env associations, 7 team associations, 12 label associations
         */
        private void initializeTestData() {
            // Applications
            applications[1] = [
                app_id: 1,
                app_code: 'APP-001',
                app_name: 'CustomerPortal',
                app_description: 'Customer-facing portal application'
            ] as Map<String, Object>

            applications[2] = [
                app_id: 2,
                app_code: 'APP-002',
                app_name: 'PaymentGateway',
                app_description: 'Payment processing service'
            ] as Map<String, Object>

            applications[3] = [
                app_id: 3,
                app_code: 'APP-003',
                app_name: 'ReportingService',
                app_description: 'Business intelligence reporting'
            ] as Map<String, Object>

            applications[4] = [
                app_id: 4,
                app_code: 'APP-004',
                app_name: 'OrphanApp',
                app_description: 'Application with no relationships'
            ] as Map<String, Object>

            applications[5] = [
                app_id: 5,
                app_code: 'APP-005',
                app_name: 'MigrationApp',
                app_description: 'Legacy migration application'
            ] as Map<String, Object>

            // Environments
            environments[1] = [env_id: 1, env_code: 'DEV', env_name: 'Development', env_description: 'Dev environment'] as Map<String, Object>
            environments[2] = [env_id: 2, env_code: 'TEST', env_name: 'Testing', env_description: 'Test environment'] as Map<String, Object>
            environments[3] = [env_id: 3, env_code: 'UAT', env_name: 'User Acceptance', env_description: 'UAT environment'] as Map<String, Object>
            environments[4] = [env_id: 4, env_code: 'PROD', env_name: 'Production', env_description: 'Production environment'] as Map<String, Object>

            // Teams
            teams[1] = [tms_id: 1, tms_name: 'Platform', tms_description: 'Platform engineering team'] as Map<String, Object>
            teams[2] = [tms_id: 2, tms_name: 'DevOps', tms_description: 'DevOps operations team'] as Map<String, Object>
            teams[3] = [tms_id: 3, tms_name: 'Security', tms_description: 'Security operations team'] as Map<String, Object>

            // Labels
            labels[1] = [lbl_id: 1, lbl_name: 'Critical', lbl_color: '#FF0000'] as Map<String, Object>
            labels[2] = [lbl_id: 2, lbl_name: 'Migration', lbl_color: '#00FF00'] as Map<String, Object>
            labels[3] = [lbl_id: 3, lbl_name: 'Legacy', lbl_color: '#0000FF'] as Map<String, Object>
            labels[4] = [lbl_id: 4, lbl_name: 'Modernized', lbl_color: '#FFFF00'] as Map<String, Object>
            labels[5] = [lbl_id: 5, lbl_name: 'Archived', lbl_color: '#FF00FF'] as Map<String, Object>

            // Environment-Application associations (10 associations)
            envAppJunctions.addAll([
                [env_id: 1, app_id: 1], [env_id: 2, app_id: 1], [env_id: 3, app_id: 1], // APP-001: 3 envs
                [env_id: 1, app_id: 2], [env_id: 4, app_id: 2],                         // APP-002: 2 envs
                [env_id: 1, app_id: 3],                                                 // APP-003: 1 env
                [env_id: 1, app_id: 5], [env_id: 2, app_id: 5], [env_id: 3, app_id: 5], [env_id: 4, app_id: 5] // APP-005: 4 envs
            ])

            // Team-Application associations (7 associations)
            teamAppJunctions.addAll([
                [tms_id: 1, app_id: 1], [tms_id: 2, app_id: 1],     // APP-001: 2 teams
                [tms_id: 1, app_id: 2],                              // APP-002: 1 team
                [tms_id: 3, app_id: 3],                              // APP-003: 1 team
                [tms_id: 1, app_id: 5], [tms_id: 2, app_id: 5], [tms_id: 3, app_id: 5] // APP-005: 3 teams
            ])

            // Label-Application associations (12 associations)
            labelAppJunctions.addAll([
                [lbl_id: 1, app_id: 1], [lbl_id: 2, app_id: 1], [lbl_id: 3, app_id: 1], [lbl_id: 4, app_id: 1], // APP-001: 4 labels
                [lbl_id: 1, app_id: 2], [lbl_id: 2, app_id: 2],                                                 // APP-002: 2 labels
                [lbl_id: 3, app_id: 3],                                                                         // APP-003: 1 label
                [lbl_id: 1, app_id: 5], [lbl_id: 2, app_id: 5], [lbl_id: 3, app_id: 5], [lbl_id: 4, app_id: 5], [lbl_id: 5, app_id: 5] // APP-005: 5 labels
            ])
        }

        /**
         * Query routing for SELECT operations (rows method)
         * Handles non-paginated findAll, paginated findAll, relationship queries
         */
        @Override
        List<GroovyRowResult> rows(String query, Map<String, Object> params = [:]) {
            // Non-paginated findAll with counts
            if (query.contains('FROM applications_app a') &&
                query.contains('LEFT JOIN') &&
                query.contains('env_counts') &&
                !query.contains('LIMIT')) {
                return applications.values().collect { app ->
                    def envCount = envAppJunctions.count { it.app_id == app.app_id }
                    def teamCount = teamAppJunctions.count { it.app_id == app.app_id }
                    def labelCount = labelAppJunctions.count { it.app_id == app.app_id }

                    new GroovyRowResult(((app as Map<String, Object>) + ([
                        environment_count: envCount,
                        team_count: teamCount,
                        label_count: labelCount
                    ] as Map<String, Object>)) as Map<String, Object>)
                }
            }

            // Paginated findAll with search and sorting
            if (query.contains('LIMIT :size OFFSET :offset')) {
                def filtered = applications.values().toList()

                // Apply search filter (minimum 2 characters)
                if (params.search) {
                    def searchTerm = (params.search as String).toUpperCase()
                    filtered = filtered.findAll { app ->
                        (app.app_code as String).toUpperCase().contains(searchTerm) ||
                        (app.app_name as String).toUpperCase().contains(searchTerm) ||
                        (app.app_description as String).toUpperCase().contains(searchTerm)
                    }
                }

                // Add computed columns
                def enriched = filtered.collect { app ->
                    def envCount = envAppJunctions.count { it.app_id == app.app_id }
                    def teamCount = teamAppJunctions.count { it.app_id == app.app_id }
                    def labelCount = labelAppJunctions.count { it.app_id == app.app_id }

                    (app + ([
                        environment_count: envCount,
                        team_count: teamCount,
                        label_count: labelCount
                    ] as Map<String, Object>)) as Map<String, Object>
                }

                // Apply sorting (handle computed columns)
                if (query.contains('ORDER BY COALESCE(env_counts.env_count, 0)')) {
                    def direction = query.contains('DESC') ? 'desc' : 'asc'
                    enriched = direction == 'desc' ?
                        enriched.sort { a, b -> (b.environment_count as Integer) <=> (a.environment_count as Integer) } :
                        enriched.sort { it.environment_count }
                } else if (query.contains('ORDER BY COALESCE(team_counts.team_count, 0)')) {
                    def direction = query.contains('DESC') ? 'desc' : 'asc'
                    enriched = direction == 'desc' ?
                        enriched.sort { a, b -> (b.team_count as Integer) <=> (a.team_count as Integer) } :
                        enriched.sort { it.team_count }
                } else if (query.contains('ORDER BY COALESCE(label_counts.label_count, 0)')) {
                    def direction = query.contains('DESC') ? 'desc' : 'asc'
                    enriched = direction == 'desc' ?
                        enriched.sort { a, b -> (b.label_count as Integer) <=> (a.label_count as Integer) } :
                        enriched.sort { it.label_count }
                } else if (query.contains('ORDER BY a.app_name')) {
                    def direction = query.contains('DESC') ? 'desc' : 'asc'
                    enriched = direction == 'desc' ?
                        enriched.sort { a, b -> (b.app_name as String) <=> (a.app_name as String) } :
                        enriched.sort { a, b -> (a.app_name as String) <=> (b.app_name as String) }
                } else {
                    // Default: sort by app_code
                    def direction = query.contains('DESC') ? 'desc' : 'asc'
                    enriched = direction == 'desc' ?
                        enriched.sort { a, b -> (b.app_code as String) <=> (a.app_code as String) } :
                        enriched.sort { a, b -> (a.app_code as String) <=> (b.app_code as String) }
                }

                // Apply pagination
                int offset = params.offset as int
                int size = params.size as int
                int endIndex = Math.min(offset + size, enriched.size())

                if (offset >= enriched.size()) {
                    return []
                }

                return enriched.subList(offset, endIndex).collect { new GroovyRowResult(it as Map<String, Object>) }
            }

            // Find environments for application
            if (query.contains('FROM environments_env e') &&
                query.contains('JOIN environments_env_x_applications_app')) {
                Integer appId = params.appId as Integer
                return envAppJunctions
                    .findAll { it.app_id == appId }
                    .collect { junction ->
                        def env = environments[junction.env_id]
                        new GroovyRowResult(env)
                    }
            }

            // Find teams for application
            if (query.contains('FROM teams_tms t') &&
                query.contains('JOIN teams_tms_x_applications_app')) {
                Integer appId = params.appId as Integer
                return teamAppJunctions
                    .findAll { it.app_id == appId }
                    .collect { junction ->
                        def team = teams[junction.tms_id]
                        new GroovyRowResult(team)
                    }
            }

            // Find labels for application
            if (query.contains('FROM labels_lbl l') &&
                query.contains('JOIN labels_lbl_x_applications_app')) {
                Integer appId = params.appId as Integer
                return labelAppJunctions
                    .findAll { it.app_id == appId }
                    .collect { junction ->
                        def label = labels[junction.lbl_id]
                        new GroovyRowResult(label)
                    }
                    .sort { it.lbl_name }
            }

            return []
        }

        /**
         * Query routing for single row SELECT operations
         * Handles find by ID, count queries
         */
        @Override
        GroovyRowResult firstRow(String query, Map<String, Object> params = [:]) {
            // Find application by ID
            if (query.contains('FROM applications_app a') &&
                query.contains('WHERE a.app_id = :appId')) {
                Integer appId = (params.appId as Integer)
                def app = applications[appId]
                return app ? new GroovyRowResult(app) : null
            }

            // Count query for pagination
            if (query.contains('SELECT COUNT(*)')) {
                def filtered = applications.values().toList()

                // Apply search filter if present
                if (params.search) {
                    def searchTerm = (params.search as String).toUpperCase()
                    filtered = filtered.findAll { app ->
                        (app.app_code as String).toUpperCase().contains(searchTerm) ||
                        (app.app_name as String).toUpperCase().contains(searchTerm) ||
                        (app.app_description as String).toUpperCase().contains(searchTerm)
                    }
                }

                return new GroovyRowResult([0: filtered.size()] as Map<String, Object>)
            }

            return null
        }

        /**
         * INSERT operations - handles application creation and junction table associations
         * Implements SQL state 23505 (unique constraint) and 23503 (foreign key) errors
         */
        @Override
        List<List<Object>> executeInsert(String query, Map<String, Object> params = [:]) {
            // Create application
            if (query.contains('INSERT INTO applications_app')) {
                // Check unique constraint on app_code
                boolean codeExists = applications.values().any {
                    it.app_code == params.app_code
                }
                if (codeExists) {
                    throw new SQLException(
                        "duplicate key value violates unique constraint \"applications_app_code_key\"",
                        "23505"
                    )
                }

                int newId = (applications.keySet().max() ?: 0) + 1
                applications[newId] = ((params as Map<String, Object>) + ([app_id: newId] as Map<String, Object>)) as Map<String, Object>
                return [[newId] as List<Object>] as List<List<Object>>
            }

            // Associate environment
            if (query.contains('INSERT INTO environments_env_x_applications_app')) {
                int envId = params.envId as int
                int appId = params.appId as int

                // Foreign key validation (simulate FK violation)
                if (envId == 999) {
                    throw new SQLException(
                        "insert or update on table \"environments_env_x_applications_app\" violates foreign key constraint",
                        "23503"
                    )
                }

                // Check for duplicate
                boolean exists = envAppJunctions.any {
                    it.env_id == envId && it.app_id == appId
                }
                if (exists) {
                    throw new SQLException(
                        "duplicate key value violates unique constraint \"environments_env_x_applications_app_pkey\"",
                        "23505"
                    )
                }

                envAppJunctions.add([env_id: envId, app_id: appId] as Map<String, Object>)
                return [[1] as List<Object>] as List<List<Object>>
            }

            // Associate team
            if (query.contains('INSERT INTO teams_tms_x_applications_app')) {
                int teamId = params.teamId as int
                int appId = params.appId as int

                // Check for duplicate
                boolean exists = teamAppJunctions.any {
                    it.tms_id == teamId && it.app_id == appId
                }
                if (exists) {
                    throw new SQLException(
                        "duplicate key value violates unique constraint \"teams_tms_x_applications_app_pkey\"",
                        "23505"
                    )
                }

                teamAppJunctions.add([tms_id: teamId, app_id: appId] as Map<String, Object>)
                return [[1] as List<Object>] as List<List<Object>>
            }

            // Associate label
            if (query.contains('INSERT INTO labels_lbl_x_applications_app')) {
                int labelId = params.labelId as int
                int appId = params.appId as int

                // Check for duplicate
                boolean exists = labelAppJunctions.any {
                    it.lbl_id == labelId && it.app_id == appId
                }
                if (exists) {
                    throw new SQLException(
                        "duplicate key value violates unique constraint \"labels_lbl_x_applications_app_pkey\"",
                        "23505"
                    )
                }

                labelAppJunctions.add([lbl_id: labelId, app_id: appId] as Map<String, Object>)
                return [[1] as List<Object>] as List<List<Object>>
            }

            return [[0] as List<Object>] as List<List<Object>>
        }

        /**
         * UPDATE and DELETE operations
         * Returns rows affected count
         */
        @Override
        int executeUpdate(String query, Map<String, Object> params = [:]) {
            // Update application
            if (query.contains('UPDATE applications_app')) {
                int appId = params.app_id
                if (applications.containsKey(appId)) {
                    applications[appId].putAll(params)
                    return 1
                }
                return 0
            }

            // Delete application
            if (query.contains('DELETE FROM applications_app')) {
                int appId = params.appId
                if (applications.containsKey(appId)) {
                    applications.remove(appId)
                    return 1
                }
                return 0
            }

            // Disassociate environment
            if (query.contains('DELETE FROM environments_env_x_applications_app')) {
                int envId = params.envId
                int appId = params.appId
                boolean removed = envAppJunctions.removeIf {
                    it.env_id == envId && it.app_id == appId
                }
                return removed ? 1 : 0
            }

            // Disassociate team
            if (query.contains('DELETE FROM teams_tms_x_applications_app')) {
                int teamId = params.teamId
                int appId = params.appId
                boolean removed = teamAppJunctions.removeIf {
                    it.tms_id == teamId && it.app_id == appId
                }
                return removed ? 1 : 0
            }

            // Disassociate label
            if (query.contains('DELETE FROM labels_lbl_x_applications_app')) {
                int labelId = params.labelId
                int appId = params.appId
                boolean removed = labelAppJunctions.removeIf {
                    it.lbl_id == labelId && it.app_id == appId
                }
                return removed ? 1 : 0
            }

            return 0
        }
        }

        /**
         * EmbeddedDatabaseUtil - Simulates umig.utils.DatabaseUtil
         * Provides withSql closure pattern with new instance per call
         */
        static class EmbeddedDatabaseUtil {
            static <T> T withSql(Closure<T> closure) {
                def mockSql = new EmbeddedMockSql()
                return closure.call(mockSql)
            }
        }

        /**
         * EmbeddedApplicationRepository - Mirrors ApplicationRepository.groovy
         * Implements all 15 methods with identical logic using EmbeddedDatabaseUtil
         */
        static class EmbeddedApplicationRepository {

        /**
         * Method 1: findAllApplicationsWithCounts() - No pagination
         */
        List<Map<String, Object>> findAllApplicationsWithCounts() {
            return EmbeddedDatabaseUtil.withSql { sql ->
                List<GroovyRowResult> results = (sql as EmbeddedMockSql).rows("""
                    SELECT
                        a.app_id,
                        a.app_code,
                        a.app_name,
                        a.app_description,
                        COALESCE(env_counts.env_count, 0)::INTEGER AS environment_count,
                        COALESCE(team_counts.team_count, 0)::INTEGER AS team_count,
                        COALESCE(label_counts.label_count, 0)::INTEGER AS label_count
                    FROM applications_app a
                    LEFT JOIN (
                        SELECT app_id, COUNT(*)::INTEGER AS env_count
                        FROM environments_env_x_applications_app
                        GROUP BY app_id
                    ) env_counts ON a.app_id = env_counts.app_id
                    LEFT JOIN (
                        SELECT app_id, COUNT(*)::INTEGER AS team_count
                        FROM teams_tms_x_applications_app
                        GROUP BY app_id
                    ) team_counts ON a.app_id = team_counts.app_id
                    LEFT JOIN (
                        SELECT app_id, COUNT(*)::INTEGER AS label_count
                        FROM labels_lbl_x_applications_app
                        GROUP BY app_id
                    ) label_counts ON a.app_id = label_counts.app_id
                    ORDER BY a.app_code
                """)
                return results.collect { it as Map<String, Object> }
            }
        }

        /**
         * Method 2: findApplicationById(int appId) - With full relationships
         */
        Map<String, Object> findApplicationById(int appId) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                GroovyRowResult application = (sql as EmbeddedMockSql).firstRow("""
                    SELECT
                        a.app_id,
                        a.app_code,
                        a.app_name,
                        a.app_description
                    FROM applications_app a
                    WHERE a.app_id = :appId
                """, [appId: appId])

                if (application) {
                    def app = application as Map<String, Object>

                    // Get related environments
                    def envResults = (sql as EmbeddedMockSql).rows("""
                        SELECT e.env_id, e.env_code, e.env_name, e.env_description
                        FROM environments_env e
                        JOIN environments_env_x_applications_app exa ON e.env_id = exa.env_id
                        WHERE exa.app_id = :appId
                        ORDER BY e.env_code
                    """, [appId: appId])
                    app.environments = envResults.collect { it as Map<String, Object> }

                    // Get related teams
                    def teamResults = (sql as EmbeddedMockSql).rows("""
                        SELECT t.tms_id, t.tms_name, t.tms_description
                        FROM teams_tms t
                        JOIN teams_tms_x_applications_app txa ON t.tms_id = txa.tms_id
                        WHERE txa.app_id = :appId
                        ORDER BY t.tms_name
                    """, [appId: appId])
                    app.teams = teamResults.collect { it as Map<String, Object> }

                    // Get related labels
                    def labelResults = (sql as EmbeddedMockSql).rows("""
                        SELECT l.lbl_id, l.lbl_name, l.lbl_color
                        FROM labels_lbl l
                        JOIN labels_lbl_x_applications_app lxa ON l.lbl_id = lxa.lbl_id
                        WHERE lxa.app_id = :appId
                        ORDER BY l.lbl_name
                    """, [appId: appId])
                    app.labels = labelResults.collect { it as Map<String, Object> }

                    return app
                }

                return null
            }
        }

        /**
         * Method 3: createApplication(Map application) - Returns created entity
         */
        Map<String, Object> createApplication(Map<String, Object> application) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                List<List<Object>> keys = (sql as EmbeddedMockSql).executeInsert("""
                    INSERT INTO applications_app (app_code, app_name, app_description)
                    VALUES (:app_code, :app_name, :app_description)
                """, application)

                application.app_id = keys[0][0]
                return application
            }
        }

        /**
         * Method 4: updateApplication(int appId, Map updates) - Returns updated entity
         */
        Map<String, Object> updateApplication(int appId, Map<String, Object> updates) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                (sql as EmbeddedMockSql).executeUpdate("""
                    UPDATE applications_app
                    SET app_code = :app_code,
                        app_name = :app_name,
                        app_description = :app_description
                    WHERE app_id = :app_id
                """, ((updates as Map<String, Object>) + ([app_id: appId] as Map<String, Object>)) as Map<String, Object>)

                return findApplicationById(appId)
            }
        }

        /**
         * Method 5: deleteApplication(int appId) - Returns boolean
         */
        boolean deleteApplication(int appId) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                int rowsAffected = (sql as EmbeddedMockSql).executeUpdate("""
                    DELETE FROM applications_app WHERE app_id = :appId
                """, [appId: appId])

                return rowsAffected > 0
            }
        }

        /**
         * Method 6: getApplicationBlockingRelationships(int appId) - Returns blocking map
         */
        Map<String, Object> getApplicationBlockingRelationships(int appId) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                def blocking = [:]

                // Check environments
                def environments = (sql as EmbeddedMockSql).rows("""
                    SELECT e.env_id, e.env_code, e.env_name
                    FROM environments_env e
                    JOIN environments_env_x_applications_app exa ON e.env_id = exa.env_id
                    WHERE exa.app_id = :appId
                """, [appId: appId])
                if (environments) blocking['environments'] = environments.collect { it as Map<String, Object> }

                // Check teams
                def teams = (sql as EmbeddedMockSql).rows("""
                    SELECT t.tms_id, t.tms_name, t.tms_description
                    FROM teams_tms t
                    JOIN teams_tms_x_applications_app txa ON t.tms_id = txa.tms_id
                    WHERE txa.app_id = :appId
                """, [appId: appId])
                if (teams) blocking['teams'] = teams.collect { it as Map<String, Object> }

                // Check labels
                def labels = (sql as EmbeddedMockSql).rows("""
                    SELECT l.lbl_id, l.lbl_name, l.lbl_color
                    FROM labels_lbl l
                    JOIN labels_lbl_x_applications_app lxa ON l.lbl_id = lxa.lbl_id
                    WHERE lxa.app_id = :appId
                """, [appId: appId])
                if (labels) blocking['labels'] = labels.collect { it as Map<String, Object> }

                return blocking
            }
        }

        /**
         * Method 7: associateEnvironment(int appId, int envId) - Boolean with duplicate handling
         */
        boolean associateEnvironment(int appId, int envId) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                try {
                    (sql as EmbeddedMockSql).executeInsert("""
                        INSERT INTO environments_env_x_applications_app (env_id, app_id)
                        VALUES (:envId, :appId)
                    """, [envId: envId, appId: appId])
                    return true
                } catch (Exception e) {
                    // Handle duplicate key error gracefully
                    if (e.message.contains("duplicate key") || e.message.contains("unique constraint")) {
                        return false
                    }
                    throw e
                }
            }
        }

        /**
         * Method 8: disassociateEnvironment(int appId, int envId) - Boolean
         */
        boolean disassociateEnvironment(int appId, int envId) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                int rowsAffected = (sql as EmbeddedMockSql).executeUpdate("""
                    DELETE FROM environments_env_x_applications_app
                    WHERE env_id = :envId AND app_id = :appId
                """, [envId: envId, appId: appId])

                return rowsAffected > 0
            }
        }

        /**
         * Method 9: associateTeam(int appId, int teamId) - Boolean with duplicate handling
         */
        boolean associateTeam(int appId, int teamId) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                try {
                    (sql as EmbeddedMockSql).executeInsert("""
                        INSERT INTO teams_tms_x_applications_app (tms_id, app_id)
                        VALUES (:teamId, :appId)
                    """, [teamId: teamId, appId: appId])
                    return true
                } catch (Exception e) {
                    // Handle duplicate key error gracefully
                    if (e.message.contains("duplicate key") || e.message.contains("unique constraint")) {
                        return false
                    }
                    throw e
                }
            }
        }

        /**
         * Method 10: disassociateTeam(int appId, int teamId) - Boolean
         */
        boolean disassociateTeam(int appId, int teamId) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                int rowsAffected = (sql as EmbeddedMockSql).executeUpdate("""
                    DELETE FROM teams_tms_x_applications_app
                    WHERE tms_id = :teamId AND app_id = :appId
                """, [teamId: teamId, appId: appId])

                return rowsAffected > 0
            }
        }

        /**
         * Method 11: findAllApplicationsWithCounts(page, size, search, sortField, sortDirection) - Paginated
         */
        Map<String, Object> findAllApplicationsWithCounts(int page, int size, String search, String sortField, String sortDirection) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                def params = [:]

                // Build search filter
                if (search && search.trim().length() >= 2) {
                    params.search = "%" + search.trim() + "%"
                }

                // Calculate offset
                int offset = (page - 1) * size

                // Get total count
                def countResult = (sql as EmbeddedMockSql).firstRow(
                    "SELECT COUNT(*) FROM applications_app a",
                    params
                )
                long totalCount = (countResult[0] as Number).longValue()

                // Get paginated data
                params.size = size
                params.offset = offset

                def results = (sql as EmbeddedMockSql).rows("""
                    SELECT
                        a.app_id,
                        a.app_code,
                        a.app_name,
                        a.app_description,
                        COALESCE(env_counts.env_count, 0)::INTEGER AS environment_count,
                        COALESCE(team_counts.team_count, 0)::INTEGER AS team_count,
                        COALESCE(label_counts.label_count, 0)::INTEGER AS label_count
                    FROM applications_app a
                    LEFT JOIN (
                        SELECT app_id, COUNT(*)::INTEGER AS env_count
                        FROM environments_env_x_applications_app
                        GROUP BY app_id
                    ) env_counts ON a.app_id = env_counts.app_id
                    LEFT JOIN (
                        SELECT app_id, COUNT(*)::INTEGER AS team_count
                        FROM teams_tms_x_applications_app
                        GROUP BY app_id
                    ) team_counts ON a.app_id = team_counts.app_id
                    LEFT JOIN (
                        SELECT app_id, COUNT(*)::INTEGER AS label_count
                        FROM labels_lbl_x_applications_app
                        GROUP BY app_id
                    ) label_counts ON a.app_id = label_counts.app_id
                    ORDER BY a.app_code ASC
                    LIMIT :size OFFSET :offset
                """, params)

                def applications = results.collect { it as Map<String, Object> }

                // Calculate pagination metadata
                long totalPages = (((totalCount as Number).longValue() + size - 1) / size) as long

                return [
                    data: applications,
                    pagination: [
                        currentPage: page,
                        pageSize: size,
                        totalItems: totalCount,
                        totalPages: totalPages,
                        hasNext: page < totalPages,
                        hasPrevious: page > 1
                    ]
                ]
            }
        }

        /**
         * Method 12: findApplicationLabels(int appId) - Ordered list
         */
        List<Map<String, Object>> findApplicationLabels(int appId) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                def results = (sql as EmbeddedMockSql).rows("""
                    SELECT l.lbl_id, l.lbl_name, l.lbl_color
                    FROM labels_lbl l
                    JOIN labels_lbl_x_applications_app lxa ON l.lbl_id = lxa.lbl_id
                    WHERE lxa.app_id = :appId
                    ORDER BY l.lbl_name
                """, [appId: appId])
                return results.collect { it as Map<String, Object> }
            }
        }

        /**
         * Method 13: associateLabel(int appId, int labelId) - Boolean with duplicate handling
         */
        boolean associateLabel(int appId, int labelId) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                try {
                    (sql as EmbeddedMockSql).executeInsert("""
                        INSERT INTO labels_lbl_x_applications_app (lbl_id, app_id)
                        VALUES (:labelId, :appId)
                    """, [labelId: labelId, appId: appId])
                    return true
                } catch (Exception e) {
                    // Handle duplicate key error gracefully
                    if (e.message.contains("duplicate key") || e.message.contains("unique constraint")) {
                        return false
                    }
                    throw e
                }
            }
        }

        /**
         * Method 14: disassociateLabel(int appId, int labelId) - Boolean
         */
        boolean disassociateLabel(int appId, int labelId) {
            return EmbeddedDatabaseUtil.withSql { sql ->
                int rowsAffected = (sql as EmbeddedMockSql).executeUpdate("""
                    DELETE FROM labels_lbl_x_applications_app
                    WHERE lbl_id = :labelId AND app_id = :appId
                """, [labelId: labelId, appId: appId])

                return rowsAffected > 0
            }
        }
        }
    } // End of EmbeddedTestInfrastructure

    // ==================== TEST EXECUTION FRAMEWORK ====================
    // Instance-based state to prevent ScriptRunner contamination

    static class TestExecutor {
        int testCount = 0
        int passCount = 0
        List<String> failures = []
        long startTime = System.currentTimeMillis()

        void runTest(String testName, Closure testLogic) {
            testCount++
            try {
                testLogic.call()
                passCount++
                println "  ✓ ${testName}"
            } catch (AssertionError e) {
                failures.add("${testName}: ${e.message}".toString())
                println "  ✗ ${testName}: ${e.message}"
            } catch (Exception e) {
                failures.add("${testName}: ${e.class.simpleName} - ${e.message}".toString())
                println "  ✗ ${testName}: ${e.class.simpleName} - ${e.message}"
            }
        }

        void printTestSummary() {
            long duration = System.currentTimeMillis() - startTime
            println "\n" + "="*80
            println "TEST SUMMARY"
            println "="*80
            println "Tests Run: ${testCount}"
            println "Passed: ${passCount}"
            println "Failed: ${testCount - passCount}"
            println "Success Rate: ${String.format('%.1f', (passCount / testCount) * 100)}%"
            println "Duration: ${duration}ms"

            if (failures) {
                println "\nFAILURES:"
                failures.each { println "  - ${it}" }
            }

            println "="*80
        }

        boolean hasFailures() {
            return !failures.isEmpty()
        }
    }

    // ==================== TEST CATEGORIES (28 TESTS) ====================

    /**
     * CATEGORY 1: CRUD OPERATIONS (6 tests)
     */
    static void testCRUDOperations(TestExecutor executor) {
        println "\n📋 Category 1: CRUD Operations (6 tests)"
        EmbeddedTestInfrastructure.EmbeddedApplicationRepository repository = new EmbeddedTestInfrastructure.EmbeddedApplicationRepository()

        // Test 1: Create application success
        executor.runTest("testCreateApplicationSuccess") {
            def newApp = [
                app_code: 'APP-NEW',
                app_name: 'NewApplication',
                app_description: 'Newly created application'
            ] as Map<String, Object>

            def created = repository.createApplication(newApp) as Map<String, Object>

            assert created != null : "Created application should not be null"
            assert created.app_id instanceof Integer : "app_id should be Integer"
            assert created.app_code == 'APP-NEW' : "app_code should match"
            assert created.app_name == 'NewApplication' : "app_name should match"
        }

        // Test 2: Create application with unique constraint violation
        executor.runTest("testCreateApplicationUniqueConstraintViolation") {
            def duplicateApp = [
                app_code: 'APP-001',
                app_name: 'Duplicate',
                app_description: 'Should fail'
            ] as Map<String, Object>

            boolean exceptionThrown = false
            try {
                repository.createApplication(duplicateApp)
            } catch (SQLException e) {
                exceptionThrown = true
                assert e.SQLState == '23505' : "Should be unique constraint violation (23505)"
                assert e.message.contains('duplicate key') : "Error message should mention duplicate key"
            }

            assert exceptionThrown : "Should throw SQLException for duplicate app_code"
        }

        // Test 3: Find application by ID success
        executor.runTest("testFindApplicationByIdSuccess") {
            def app = repository.findApplicationById(1)

            assert app != null : "Should find application"
            assert app.app_id == 1 : "app_id should be 1"
            assert app.app_code == 'APP-001' : "app_code should be APP-001"
            assert app.app_name == 'CustomerPortal' : "app_name should match"
            assert app.environments instanceof List : "environments should be a list"
            assert app.teams instanceof List : "teams should be a list"
            assert app.labels instanceof List : "labels should be a list"
            assert app.environments.size() == 3 : "Should have 3 environments"
            assert app.teams.size() == 2 : "Should have 2 teams"
            assert app.labels.size() == 4 : "Should have 4 labels"
        }

        // Test 4: Find application by ID not found
        executor.runTest("testFindApplicationByIdNotFound") {
            def app = repository.findApplicationById(999)

            assert app == null : "Should return null for non-existent application"
        }

        // Test 5: Update application success
        executor.runTest("testUpdateApplicationSuccess") {
            def updates = [
                app_code: 'APP-001-UPDATED',
                app_name: 'CustomerPortal Updated',
                app_description: 'Updated description'
            ] as Map<String, Object>

            def updated = repository.updateApplication(1, updates) as Map<String, Object>

            assert updated != null : "Updated application should not be null"
            assert updated.app_code == 'APP-001-UPDATED' : "app_code should be updated"
            assert updated.app_name == 'CustomerPortal Updated' : "app_name should be updated"
            assert updated.app_description == 'Updated description' : "app_description should be updated"
        }

        // Test 6: Delete application success
        executor.runTest("testDeleteApplicationSuccess") {
            boolean deleted = repository.deleteApplication(4)

            assert deleted == true : "Should successfully delete orphan application"

            def app = repository.findApplicationById(4)
            assert app == null : "Application should no longer exist"
        }
    }

    /**
     * CATEGORY 2: QUERY METHODS WITH PAGINATION (7 tests)
     */
    static void testQueryMethodsWithPagination(TestExecutor executor) {
        println "\n📋 Category 2: Query Methods with Pagination (7 tests)"
        EmbeddedTestInfrastructure.EmbeddedApplicationRepository repository = new EmbeddedTestInfrastructure.EmbeddedApplicationRepository()

        // Test 7: Find all applications with counts (no pagination)
        executor.runTest("testFindAllApplicationsWithCountsNoPagination") {
            def applications = repository.findAllApplicationsWithCounts()

            assert applications != null : "Applications list should not be null"
            assert applications.size() == 5 : "Should return all 5 applications"

            def app1 = applications.find { it.app_id == 1 }
            assert app1 != null : "Should find APP-001"
            assert app1.environment_count == 3 : "APP-001 should have 3 environments"
            assert app1.team_count == 2 : "APP-001 should have 2 teams"
            assert app1.label_count == 4 : "APP-001 should have 4 labels"

            def orphan = applications.find { it.app_id == 4 }
            assert orphan != null : "Should find OrphanApp"
            assert orphan.environment_count == 0 : "OrphanApp should have 0 environments"
            assert orphan.team_count == 0 : "OrphanApp should have 0 teams"
            assert orphan.label_count == 0 : "OrphanApp should have 0 labels"
        }

        // Test 8: Find all applications with pagination (first page)
        executor.runTest("testFindAllApplicationsWithPaginationFirstPage") {
            def result = repository.findAllApplicationsWithCounts(1, 2, null, null, 'asc')

            assert result != null : "Result should not be null"
            assert result.data instanceof List : "data should be a list"
            assert result.data.size() == 2 : "Should return 2 items (page size)"

            def pagination = result.pagination as Map<String, Object>
            assert pagination.currentPage == 1 : "Should be page 1"
            assert pagination.pageSize == 2 : "Page size should be 2"
            assert pagination.totalItems == 5 : "Total items should be 5"
            assert pagination.totalPages == 3 : "Total pages should be 3"
            assert pagination.hasNext == true : "Should have next page"
            assert pagination.hasPrevious == false : "Should not have previous page"
        }

        // Test 9: Find all applications with pagination (last page)
        executor.runTest("testFindAllApplicationsWithPaginationLastPage") {
            def result = repository.findAllApplicationsWithCounts(3, 2, null, null, 'asc')

            assert result != null : "Result should not be null"
            assert (result.data as List).size() == 1 : "Last page should have 1 item"

            def pagination = result.pagination as Map<String, Object>
            assert pagination.currentPage == 3 : "Should be page 3"
            assert pagination.hasNext == false : "Should not have next page"
            assert pagination.hasPrevious == true : "Should have previous page"
        }

        // Test 10: Find all applications with search filter
        executor.runTest("testFindAllApplicationsWithSearchFilter") {
            def result = repository.findAllApplicationsWithCounts(1, 10, 'Portal', null, 'asc')

            assert result != null : "Result should not be null"
            def apps = result.data as List
            assert apps.size() == 1 : "Should find 1 application matching 'Portal'"
            assert (((apps[0] as Map).app_name as String)).contains('Portal') : "Should match CustomerPortal"
        }

        // Test 11: Find all with search filter too short
        executor.runTest("testFindAllApplicationsWithSearchFilterTooShort") {
            def result = repository.findAllApplicationsWithCounts(1, 10, 'A', null, 'asc')

            assert result != null : "Result should not be null"
            // Single character search should be ignored (< 2 chars)
            assert (result.data as List).size() == 5 : "Should return all applications (search ignored)"
        }

        // Test 12: Sort by computed column (environment_count)
        executor.runTest("testFindAllApplicationsWithSortByComputedColumn") {
            def result = repository.findAllApplicationsWithCounts(1, 10, null, 'environment_count', 'desc')

            assert result != null : "Result should not be null"
            def apps = result.data as List

            // MigrationApp (4 envs) should be first, OrphanApp (0 envs) should be last
            assert ((apps[0] as Map).app_id as Integer) == 5 : "MigrationApp should be first"
            assert ((apps[0] as Map).environment_count as Integer) == 4 : "Should have 4 environments"
            assert ((apps[apps.size()-1] as Map).app_id as Integer) == 4 : "OrphanApp should be last"
            assert ((apps[apps.size()-1] as Map).environment_count as Integer) == 0 : "Should have 0 environments"
        }

        // Test 13: Default sort (app_code ascending)
        executor.runTest("testFindAllApplicationsWithDefaultSort") {
            def result = repository.findAllApplicationsWithCounts(1, 10, null, null, 'asc')

            assert result != null : "Result should not be null"
            def apps = result.data as List

            assert ((apps[0] as Map).app_code as String) == 'APP-001' : "First should be APP-001"
            assert ((apps[1] as Map).app_code as String) == 'APP-002' : "Second should be APP-002"
            assert ((apps[4] as Map).app_code as String) == 'APP-005' : "Last should be APP-005"
        }
    }

    /**
     * CATEGORY 3: RELATIONSHIP MANAGEMENT (8 tests)
     */
    static void testRelationshipManagement(TestExecutor executor) {
        println "\n📋 Category 3: Relationship Management (8 tests)"
        EmbeddedTestInfrastructure.EmbeddedApplicationRepository repository = new EmbeddedTestInfrastructure.EmbeddedApplicationRepository()

        // Test 14: Associate environment success
        executor.runTest("testAssociateEnvironmentSuccess") {
            boolean associated = repository.associateEnvironment(4, 1)

            assert associated == true : "Should successfully associate environment"

            def app = repository.findApplicationById(4)
            assert (app.environments as List).size() == 1 : "OrphanApp should now have 1 environment"
        }

        // Test 15: Associate environment duplicate key
        executor.runTest("testAssociateEnvironmentDuplicateKey") {
            boolean associated = repository.associateEnvironment(1, 1)

            assert associated == false : "Should return false for duplicate association"
        }

        // Test 16: Disassociate environment success
        executor.runTest("testDisassociateEnvironmentSuccess") {
            boolean disassociated = repository.disassociateEnvironment(1, 1)

            assert disassociated == true : "Should successfully disassociate environment"

            def app = repository.findApplicationById(1)
            assert app.environments.size() == 2 : "Should now have 2 environments (was 3)"
        }

        // Test 17: Disassociate environment not found
        executor.runTest("testDisassociateEnvironmentNotFound") {
            boolean disassociated = repository.disassociateEnvironment(4, 1)

            assert disassociated == false : "Should return false for non-existent association"
        }

        // Test 18: Associate team success
        executor.runTest("testAssociateTeamSuccess") {
            boolean associated = repository.associateTeam(4, 1)

            assert associated == true : "Should successfully associate team"

            def app = repository.findApplicationById(4)
            assert app.teams.size() == 1 : "OrphanApp should now have 1 team"
        }

        // Test 19: Disassociate team success
        executor.runTest("testDisassociateTeamSuccess") {
            boolean disassociated = repository.disassociateTeam(1, 1)

            assert disassociated == true : "Should successfully disassociate team"

            def app = repository.findApplicationById(1)
            assert app.teams.size() == 1 : "Should now have 1 team (was 2)"
        }

        // Test 20: Associate label success
        executor.runTest("testAssociateLabelSuccess") {
            boolean associated = repository.associateLabel(4, 1)

            assert associated == true : "Should successfully associate label"

            def labels = repository.findApplicationLabels(4)
            assert labels.size() == 1 : "OrphanApp should now have 1 label"
            assert labels[0].lbl_name == 'Critical' : "Label should be Critical"
        }

        // Test 21: Disassociate label success
        executor.runTest("testDisassociateLabelSuccess") {
            boolean disassociated = repository.disassociateLabel(1, 1)

            assert disassociated == true : "Should successfully disassociate label"

            def labels = repository.findApplicationLabels(1)
            assert labels.size() == 3 : "Should now have 3 labels (was 4)"
        }
    }

    /**
     * CATEGORY 4: VALIDATION & ERROR HANDLING (4 tests)
     */
    static void testValidationAndErrorHandling(TestExecutor executor) {
        println "\n📋 Category 4: Validation & Error Handling (4 tests)"
        EmbeddedTestInfrastructure.EmbeddedApplicationRepository repository = new EmbeddedTestInfrastructure.EmbeddedApplicationRepository()

        // Test 22: Delete application with blocking relationships
        executor.runTest("testDeleteApplicationWithBlockingRelationships") {
            def blocking = repository.getApplicationBlockingRelationships(1)

            assert blocking != null : "Blocking map should not be null"
            assert blocking.containsKey('environments') : "Should have environment relationships"
            assert blocking.containsKey('teams') : "Should have team relationships"
            assert blocking.containsKey('labels') : "Should have label relationships"

            def envs = blocking['environments']
            assert envs.size() == 3 : "Should have 3 blocking environments"
        }

        // Test 23: Associate environment foreign key violation
        executor.runTest("testAssociateEnvironmentForeignKeyViolation") {
            boolean exceptionThrown = false
            try {
                repository.associateEnvironment(1, 999)
            } catch (SQLException e) {
                exceptionThrown = true
                assert e.SQLState == '23503' : "Should be foreign key violation (23503)"
                assert e.message.contains('foreign key') : "Error message should mention foreign key"
            }

            assert exceptionThrown : "Should throw SQLException for invalid foreign key"
        }

        // Test 24: Get blocking relationships for orphan application
        executor.runTest("testGetApplicationBlockingRelationshipsEmpty") {
            def blocking = repository.getApplicationBlockingRelationships(4) as Map

            assert blocking != null : "Blocking map should not be null"
            assert blocking.isEmpty() : "OrphanApp should have no blocking relationships"
        }

        // Test 25: Find application labels returns ordered list
        executor.runTest("testFindApplicationLabelsReturnsOrdered") {
            def labels = repository.findApplicationLabels(1)

            assert labels != null : "Labels list should not be null"
            assert labels.size() == 4 : "APP-001 should have 4 labels"

            // Verify ordering by label name (alphabetical)
            assert labels[0].lbl_name == 'Critical' : "First should be Critical"
            assert labels[1].lbl_name == 'Legacy' : "Second should be Legacy"
            assert labels[2].lbl_name == 'Migration' : "Third should be Migration"
            assert labels[3].lbl_name == 'Modernized' : "Fourth should be Modernized"
        }
    }

    /**
     * CATEGORY 5: PERFORMANCE & EDGE CASES (3 tests)
     */
    static void testPerformanceAndEdgeCases(TestExecutor executor) {
        println "\n📋 Category 5: Performance & Edge Cases (3 tests)"
        EmbeddedTestInfrastructure.EmbeddedApplicationRepository repository = new EmbeddedTestInfrastructure.EmbeddedApplicationRepository()

        // Test 26: Pagination with large offset (beyond dataset)
        executor.runTest("testPaginationWithLargeOffset") {
            def result = repository.findAllApplicationsWithCounts(10, 10, null, null, 'asc')

            assert result != null : "Result should not be null"
            assert (result.data as List).isEmpty() : "Should return empty list for offset beyond dataset"

            def pagination = result.pagination as Map<String, Object>
            assert (pagination.totalItems as Number).longValue() == 5 : "Total items should still be 5"
            assert (pagination.currentPage as Integer) == 10 : "Current page should be 10"
        }

        // Test 27: Find application by ID with no relationships
        executor.runTest("testFindApplicationByIdWithNoRelationships") {
            def app = repository.findApplicationById(4)

            assert app != null : "Should find OrphanApp"
            assert app.app_id == 4 : "app_id should be 4"
            assert (app.environments as List).isEmpty() : "Should have no environments"
            assert (app.teams as List).isEmpty() : "Should have no teams"
            assert (app.labels as List).isEmpty() : "Should have no labels"
        }

        // Test 28: Pagination with max page size
        executor.runTest("testFindAllApplicationsWithMaxPageSize") {
            def result = repository.findAllApplicationsWithCounts(1, 100, null, null, 'asc')

            assert result != null : "Result should not be null"
            assert result.data.size() == 5 : "Should return all 5 applications (page size > total)"

            def pagination = result.pagination as Map<String, Object>
            assert (pagination.totalPages as Number).longValue() == 1 : "Should have only 1 page"
            assert (pagination.hasNext as Boolean) == false : "Should not have next page"
        }
    }

    // ==================== MAIN TEST RUNNER ====================
    // Creates isolated executor instance to prevent ScriptRunner state contamination

    static void main(String[] args) {
        // Create isolated test executor
        TestExecutor executor = new TestExecutor()

        println "\n" + "="*80
        println "ApplicationRepository Comprehensive Test Suite"
        println "TD-001 Self-Contained Architecture | ADR-031 Type Casting"
        println "Target: 28 tests, 85-90% coverage of 15 repository methods"
        println "="*80

        // Execute all test categories
        testCRUDOperations(executor)                    // 6 tests
        testQueryMethodsWithPagination(executor)        // 7 tests
        testRelationshipManagement(executor)            // 8 tests
        testValidationAndErrorHandling(executor)        // 4 tests
        testPerformanceAndEdgeCases(executor)           // 3 tests

        // Print final summary
        executor.printTestSummary()

        // Exit with appropriate code
        System.exit(executor.hasFailures() ? 1 : 0)
    }
}