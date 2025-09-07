package umig.tests.utils

import groovy.sql.Sql
import groovy.transform.stc.ClosureParams
import groovy.transform.stc.FromString
import java.sql.DriverManager

/**
 * Test-specific database utility class that provides the same interface as DatabaseUtil
 * but uses direct database connections instead of ScriptRunner's connection pool.
 * 
 * This allows integration tests to run without ScriptRunner dependencies.
 * 
 * Created: 2025-09-06 (US-022 Integration Test Fix)
 * Purpose: Replace DatabaseUtil in test environment to avoid ScriptRunner compilation issues
 */
class TestDatabaseUtil {

    // Database connection configuration for tests
    private static final String DB_URL = "jdbc:postgresql://localhost:5432/umig_app_db"
    private static final String DB_USER = System.getenv('UMIG_DB_USER') ?: "umig_app_user"  
    private static final String DB_PASSWORD = System.getenv('UMIG_DB_PASSWORD') ?: "123456"

    /**
     * Executes a closure with a managed groovy.sql.Sql instance using direct database connection.
     * This mirrors the interface of the production DatabaseUtil.withSql method.
     * 
     * @param closure The closure to execute with the Sql object.
     * @return The result of the closure.
     */
    static <T> T withSql(@ClosureParams(value = FromString, options = "groovy.sql.Sql") Closure<T> closure) {
        Sql sql = null
        try {
            // Create direct database connection for tests
            sql = Sql.newInstance(DB_URL, DB_USER, DB_PASSWORD, "org.postgresql.Driver")
            return closure.call(sql)
        } finally {
            // Ensure connection is properly closed
            sql?.close()
        }
    }

    /**
     * Test utility method to verify database connectivity
     * @return true if database connection is successful
     */
    static boolean testConnection() {
        try {
            withSql { sql ->
                sql.firstRow("SELECT 1 as test")
            }
            return true
        } catch (Exception e) {
            println "Database connection test failed: ${e.message}"
            return false
        }
    }
}