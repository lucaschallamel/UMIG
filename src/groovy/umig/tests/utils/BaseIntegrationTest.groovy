package umig.tests.utils

import groovy.json.JsonSlurper
import groovy.json.JsonBuilder
import umig.utils.DatabaseUtil
import umig.tests.integration.AuthenticationHelper
import groovy.sql.Sql
import java.util.UUID

/**
 * Base class for UMIG integration tests providing standardized patterns.
 * 
 * Features:
 * - Standardized test data setup and cleanup
 * - Database connection management via DatabaseUtil.withSql
 * - Performance validation helpers
 * - HTTP client integration
 * - Error handling and logging patterns
 * - UUID-based test data management
 * 
 * Framework: ADR-036 Pure Groovy (Zero external dependencies)
 * Database: DatabaseUtil.withSql pattern (ADR-031 explicit casting)
 * Security: AuthenticationHelper integration
 * Performance: <500ms API validation, <2min total test suite
 * 
 * Created: 2025-08-27 (US-037 Phase 3)
 * Version: 1.0
 */
abstract class BaseIntegrationTest {
    
    // Test configuration constants
    protected static final int PERFORMANCE_THRESHOLD_MS = 500
    protected static final int TOTAL_TEST_TIMEOUT_MS = 120000 // 2 minutes
    protected static final String TEST_DATA_PREFIX = "IT_TEST_"
    
    // Shared utilities
    protected final IntegrationTestHttpClient httpClient = new IntegrationTestHttpClient()
    protected final JsonSlurper jsonSlurper = new JsonSlurper()
    
    // Test data tracking for cleanup
    protected final Set<UUID> createdMigrations = new HashSet<>()
    protected final Set<Integer> createdTeams = new HashSet<>()
    protected final Set<Integer> createdUsers = new HashSet<>()
    protected final Set<Integer> createdLabels = new HashSet<>()
    protected final Set<Integer> createdApplications = new HashSet<>()
    protected final Set<Integer> createdEnvironments = new HashSet<>()
    protected final Set<UUID> createdPlans = new HashSet<>()
    protected final Set<UUID> createdSequences = new HashSet<>()
    protected final Set<UUID> createdPhases = new HashSet<>()
    protected final Set<UUID> createdSteps = new HashSet<>()
    
    /**
     * Setup method called before each test
     * Override in subclasses for specific setup requirements
     */
    def setup() {
        println "🧪 Starting test: ${this.class.simpleName}"
        
        // Validate authentication
        if (!AuthenticationHelper.validateCredentials()) {
            throw new IllegalStateException("Integration test authentication not configured")
        }
        
        // Clear any previous test data tracking
        clearTestDataTracking()
    }
    
    /**
     * Cleanup method called after each test
     * Automatically cleans up tracked test data
     */
    def cleanup() {
        try {
            cleanupTestData()
            println "✅ Test cleanup completed: ${this.class.simpleName}"
        } catch (Exception e) {
            println "⚠️ Cleanup warning: ${e.message}"
        }
    }
    
    /**
     * Create test migration data with automatic cleanup tracking
     * @param migrationName Custom migration name (optional)
     * @return Migration data map with generated UUID
     */
    protected Map<String, Object> createTestMigration(String migrationName = null) {
        def migrationId = UUID.randomUUID()
        def name = migrationName ?: "${TEST_DATA_PREFIX}Migration_${migrationId.toString().substring(0, 8)}"
        
        def migrationData = [
            mig_id: migrationId,
            mig_name: name,
            mig_description: "Integration test migration for ${this.class.simpleName}",
            mig_status: 'PLANNING',
            mig_target_date: new Date(),
            mig_created_by: 'integration-test',
            mig_created_date: new Date()
        ]
        
        // Track for cleanup
        createdMigrations.add(migrationId)
        
        return migrationData as Map<String, Object>
    }
    
    /**
     * Create test team data with automatic cleanup tracking
     * @param teamName Custom team name (optional)
     * @return Team data map with generated ID
     */
    protected Map<String, Object> createTestTeam(String teamName = null) {
        def teamId = generateTestId()
        def name = teamName ?: "${TEST_DATA_PREFIX}Team_${teamId}"
        
        def teamData = [
            tms_id: teamId,
            tms_name: name,
            tms_description: "Integration test team for ${this.class.simpleName}",
            tms_email: "test-team-${teamId}@integration.test",
            tms_created_date: new Date()
        ]
        
        // Track for cleanup
        createdTeams.add(teamId as Integer)
        
        return teamData as Map<String, Object>
    }
    
    /**
     * Create test label data with automatic cleanup tracking
     * @param labelName Custom label name (optional)
     * @return Label data map with generated ID
     */
    protected Map<String, Object> createTestLabel(String labelName = null) {
        def labelId = generateTestId()
        def name = labelName ?: "${TEST_DATA_PREFIX}Label_${labelId}"
        
        def labelData = [
            lbl_id: labelId,
            lbl_name: name,
            lbl_description: "Integration test label for ${this.class.simpleName}",
            lbl_color: '#FF5733',
            lbl_created_date: new Date()
        ]
        
        // Track for cleanup
        createdLabels.add(labelId as Integer)
        
        return labelData as Map<String, Object>
    }
    
    /**
     * Create test application data with automatic cleanup tracking
     * @param applicationName Custom application name (optional)
     * @return Application data map with generated ID
     */
    protected Map<String, Object> createTestApplication(String applicationName = null) {
        def applicationId = generateTestId()
        def name = applicationName ?: "${TEST_DATA_PREFIX}App_${applicationId}"
        
        def applicationData = [
            app_id: applicationId,
            app_name: name,
            app_description: "Integration test application for ${this.class.simpleName}",
            app_owner: "Test Owner",
            app_version: "1.0.0",
            app_status: "Active",
            app_created_date: new Date()
        ]
        
        // Track for cleanup
        createdApplications.add(applicationId as Integer)
        
        return applicationData as Map<String, Object>
    }
    
    /**
     * Create test environment data with automatic cleanup tracking
     * @param environmentName Custom environment name (optional)
     * @return Environment data map with generated ID
     */
    protected Map<String, Object> createTestEnvironment(String environmentName = null) {
        def environmentId = generateTestId()
        def name = environmentName ?: "${TEST_DATA_PREFIX}Env_${environmentId}"
        
        def environmentData = [
            env_id: environmentId,
            env_name: name,
            env_description: "Integration test environment for ${this.class.simpleName}",
            env_status: "Active",
            env_created_date: new Date()
        ]
        
        // Track for cleanup
        createdEnvironments.add(environmentId as Integer)
        
        return environmentData as Map<String, Object>
    }
    
    /**
     * Execute database query with proper error handling and type casting
     * Uses UMIG DatabaseUtil.withSql pattern (ADR-031)
     * @param query SQL query string
     * @param params Query parameters (will be explicitly cast)
     * @return Query results
     */
    protected def executeDbQuery(String query, Map<String, Object> params = [:]) {
        return DatabaseUtil.withSql { sql ->
            try {
                // Apply explicit type casting per ADR-031
                def castParams = castQueryParameters(params)
                
                if (params.isEmpty()) {
                    return sql.rows(query)
                } else {
                    return sql.rows(query, castParams)
                }
                
            } catch (Exception e) {
                throw new RuntimeException("Database query failed: ${query}. Error: ${e.message}", e)
            }
        }
    }
    
    /**
     * Execute database update with proper error handling
     * @param query SQL update/insert/delete statement
     * @param params Query parameters
     * @return Number of affected rows
     */
    protected int executeDbUpdate(String query, Map<String, Object> params = [:]) {
        return DatabaseUtil.withSql { sql ->
            try {
                def castParams = castQueryParameters(params)
                
                if (params.isEmpty()) {
                    return sql.executeUpdate(query)
                } else {
                    return sql.executeUpdate(query, castParams)
                }
                
            } catch (Exception e) {
                throw new RuntimeException("Database update failed: ${query}. Error: ${e.message}", e)
            }
        }
    }
    
    /**
     * Apply explicit type casting to query parameters (ADR-031)
     * @param params Original parameters
     * @return Parameters with explicit casting applied
     */
    private Map<String, Object> castQueryParameters(Map<String, Object> params) {
        def castParams = [:]
        
        params.each { key, value ->
            if (value == null) {
                castParams[key] = null
            } else if (value instanceof String) {
                // Check if it's a UUID string
                if (isUuidString(value as String)) {
                    castParams[key] = UUID.fromString(value as String)
                } else {
                    castParams[key] = value as String
                }
            } else if (value instanceof Number) {
                castParams[key] = value as Integer
            } else if (value instanceof UUID) {
                castParams[key] = value
            } else {
                castParams[key] = value
            }
        }
        
        return castParams
    }
    
    /**
     * Check if string is valid UUID format
     * @param str String to check
     * @return true if valid UUID format
     */
    private boolean isUuidString(String str) {
        try {
            UUID.fromString(str)
            return true
        } catch (IllegalArgumentException e) {
            return false
        }
    }
    
    /**
     * Validate API response performance
     * @param response HttpResponse object
     * @param customThresholdMs Custom threshold (optional, defaults to 500ms)
     */
    protected void validatePerformance(HttpResponse response, int customThresholdMs = PERFORMANCE_THRESHOLD_MS) {
        IntegrationTestHttpClient.validatePerformance(response, customThresholdMs)
        println "⏱️ Performance OK: ${response.method} ${response.url} - ${response.responseTimeMs}ms"
    }
    
    /**
     * Validate successful API response with common assertions
     * @param response HttpResponse object
     * @param expectedStatus Expected HTTP status (default 200)
     */
    protected void validateApiSuccess(HttpResponse response, int expectedStatus = 200) {
        IntegrationTestHttpClient.validateSuccess(response, expectedStatus)
        validatePerformance(response)
        
        // Additional validation for JSON responses
        if (response.body && !response.body.trim().isEmpty()) {
            def jsonBody = response.jsonBody
            assert jsonBody != null : "Response should contain valid JSON"
        }
    }
    
    /**
     * Validate error API response
     * @param response HttpResponse object
     * @param expectedStatus Expected error status code
     */
    protected void validateApiError(HttpResponse response, int expectedStatus) {
        IntegrationTestHttpClient.validateError(response, expectedStatus)
        println "✅ Error validation passed: ${response.statusCode} - ${response.body}"
    }
    
    /**
     * Generate unique test ID for database entities
     * @return Unique integer ID suitable for primary keys
     */
    protected int generateTestId() {
        return Math.abs(new Random().nextInt(1000000)) + 100000
    }
    
    /**
     * Generate unique test UUID
     * @return UUID for entities requiring UUID primary keys
     */
    protected UUID generateTestUuid() {
        return UUID.randomUUID()
    }
    
    /**
     * Clean up all tracked test data
     * Called automatically in cleanup() method
     */
    private void cleanupTestData() {
        // Clean up in reverse dependency order to avoid foreign key violations
        
        // Steps depend on phases
        createdSteps.each { stepId ->
            cleanupStep(stepId)
        }
        
        // Phases depend on sequences
        createdPhases.each { phaseId ->
            cleanupPhase(phaseId)
        }
        
        // Sequences depend on plans
        createdSequences.each { sequenceId ->
            cleanupSequence(sequenceId)
        }
        
        // Plans depend on migrations
        createdPlans.each { planId ->
            cleanupPlan(planId)
        }
        
        // Clean up independent entities
        createdLabels.each { labelId ->
            cleanupLabel(labelId)
        }
        
        createdApplications.each { appId ->
            cleanupApplication(appId)
        }
        
        createdEnvironments.each { envId ->
            cleanupEnvironment(envId)
        }
        
        createdUsers.each { userId ->
            cleanupUser(userId)
        }
        
        createdTeams.each { teamId ->
            cleanupTeam(teamId)
        }
        
        // Migrations last (many entities depend on them)
        createdMigrations.each { migrationId ->
            cleanupMigration(migrationId)
        }
    }
    
    /**
     * Clear test data tracking sets
     */
    private void clearTestDataTracking() {
        createdMigrations.clear()
        createdTeams.clear()
        createdUsers.clear()
        createdLabels.clear()
        createdApplications.clear()
        createdEnvironments.clear()
        createdPlans.clear()
        createdSequences.clear()
        createdPhases.clear()
        createdSteps.clear()
    }
    
    // Cleanup methods for specific entity types
    // These can be overridden in subclasses for custom cleanup logic
    
    protected void cleanupMigration(UUID migrationId) {
        try {
            executeDbUpdate("DELETE FROM tbl_migrations WHERE mig_id = ?", [mig_id: migrationId])
        } catch (Exception e) {
            println "⚠️ Failed to cleanup migration ${migrationId}: ${e.message}"
        }
    }
    
    protected void cleanupTeam(Integer teamId) {
        try {
            executeDbUpdate("DELETE FROM tbl_teams WHERE tms_id = ?", [tms_id: teamId])
        } catch (Exception e) {
            println "⚠️ Failed to cleanup team ${teamId}: ${e.message}"
        }
    }
    
    protected void cleanupUser(Integer userId) {
        try {
            executeDbUpdate("DELETE FROM tbl_users WHERE usr_id = ?", [usr_id: userId])
        } catch (Exception e) {
            println "⚠️ Failed to cleanup user ${userId}: ${e.message}"
        }
    }
    
    protected void cleanupLabel(Integer labelId) {
        try {
            executeDbUpdate("DELETE FROM tbl_labels WHERE lbl_id = ?", [lbl_id: labelId])
        } catch (Exception e) {
            println "⚠️ Failed to cleanup label ${labelId}: ${e.message}"
        }
    }
    
    protected void cleanupApplication(Integer appId) {
        try {
            executeDbUpdate("DELETE FROM applications_app WHERE app_id = ?", [app_id: appId])
        } catch (Exception e) {
            println "⚠️ Failed to cleanup application ${appId}: ${e.message}"
        }
    }
    
    protected void cleanupEnvironment(Integer envId) {
        try {
            executeDbUpdate("DELETE FROM environments_env WHERE env_id = ?", [env_id: envId])
        } catch (Exception e) {
            println "⚠️ Failed to cleanup environment ${envId}: ${e.message}"
        }
    }
    
    protected void cleanupPlan(UUID planId) {
        try {
            executeDbUpdate("DELETE FROM tbl_plans_instance WHERE pli_id = ?", [pli_id: planId])
        } catch (Exception e) {
            println "⚠️ Failed to cleanup plan ${planId}: ${e.message}"
        }
    }
    
    protected void cleanupSequence(UUID sequenceId) {
        try {
            executeDbUpdate("DELETE FROM tbl_sequences_instance WHERE sqi_id = ?", [sqi_id: sequenceId])
        } catch (Exception e) {
            println "⚠️ Failed to cleanup sequence ${sequenceId}: ${e.message}"
        }
    }
    
    protected void cleanupPhase(UUID phaseId) {
        try {
            executeDbUpdate("DELETE FROM tbl_phases_instance WHERE phi_id = ?", [phi_id: phaseId])
        } catch (Exception e) {
            println "⚠️ Failed to cleanup phase ${phaseId}: ${e.message}"
        }
    }
    
    protected void cleanupStep(UUID stepId) {
        try {
            executeDbUpdate("DELETE FROM tbl_steps_instance WHERE sti_id = ?", [sti_id: stepId])
        } catch (Exception e) {
            println "⚠️ Failed to cleanup step ${stepId}: ${e.message}"
        }
    }
    
    /**
     * Assert that database operation was successful
     * @param affectedRows Number of rows affected by operation
     * @param expectedRows Expected number of affected rows
     * @param operation Description of operation for error messages
     */
    protected void assertDatabaseSuccess(int affectedRows, int expectedRows, String operation) {
        assert affectedRows == expectedRows : 
            "Database ${operation} failed: expected ${expectedRows} affected rows, got ${affectedRows}"
    }
    
    /**
     * Log test progress for debugging and monitoring
     * @param message Progress message
     */
    protected void logProgress(String message) {
        println "📝 ${this.class.simpleName}: ${message}"
    }
    
    /**
     * Create delay for testing async operations
     * @param milliseconds Delay duration
     */
    protected void waitFor(long milliseconds) {
        Thread.sleep(milliseconds)
    }
}