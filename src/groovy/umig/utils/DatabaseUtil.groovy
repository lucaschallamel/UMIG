package umig.utils

import groovy.transform.stc.ClosureParams
import groovy.transform.stc.FromString

/**
 * Utility class for handling database connections.
 * Centralizes access to the database connection pool configured in ScriptRunner.
 * 
 * TEST MODE: When ScriptRunner is not available (during integration tests), 
 * this class automatically falls back to direct database connections.
 */
class DatabaseUtil {

    /**
     * Executes a closure with a managed groovy.sql.Sql instance from the ScriptRunner connection pool.
     * This is the recommended, safe way to interact with the database.
     * @param closure The closure to execute with the Sql object.
     * @return The result of the closure.
     */
    static <T> T withSql(@ClosureParams(value = FromString, options = "groovy.sql.Sql") Closure<T> closure) {
        // Check if we're in test mode (ScriptRunner not available)
        if (isTestMode()) {
            return useTestDatabaseConnection(closure)
        }
        
        // Production mode - use ScriptRunner connection pool
        try {
            // Dynamically import ScriptRunner class to avoid compilation errors during tests
            Class srDatabaseUtilClass = Class.forName('com.onresolve.scriptrunner.db.DatabaseUtil')
            // Use reflection to invoke the static withSql method to avoid type checking issues
            return (T) srDatabaseUtilClass.invokeMethod('withSql', ['umig_db_pool', closure] as Object[])
        } catch (ClassNotFoundException e) {
            // ScriptRunner not available, fall back to test mode
            return useTestDatabaseConnection(closure)
        }
    }
    
    /**
     * Determines if we're running in test mode (ScriptRunner not available)
     */
    private static boolean isTestMode() {
        try {
            Class.forName('com.onresolve.scriptrunner.db.DatabaseUtil')
            return false  // ScriptRunner is available
        } catch (ClassNotFoundException e) {
            return true   // ScriptRunner not available, must be test mode
        }
    }
    
    /**
     * Uses direct database connection for test scenarios
     */
    private static <T> T useTestDatabaseConnection(@ClosureParams(value = FromString, options = "groovy.sql.Sql") Closure<T> closure) {
        // Database connection configuration for tests
        final String DB_URL = "jdbc:postgresql://localhost:5432/umig_app_db"
        final String DB_USER = System.getenv('UMIG_DB_USER') ?: "umig_app_user"  
        final String DB_PASSWORD = System.getenv('UMIG_DB_PASSWORD') ?: "123456"
        
        // Dynamically create Sql connection to avoid import issues
        def sql = null
        try {
            // Create direct database connection for tests
            Class.forName("org.postgresql.Driver")
            def connection = java.sql.DriverManager.getConnection(DB_URL, DB_USER, DB_PASSWORD)
            sql = new groovy.sql.Sql(connection)
            return closure.call(sql)
        } finally {
            // Ensure connection is properly closed
            sql?.close()
        }
    }
}
