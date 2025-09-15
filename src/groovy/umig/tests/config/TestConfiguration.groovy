/**
 * Test Configuration for Groovy Integration Tests
 * Handles JDBC driver loading and database connectivity
 *
 * This configuration addresses PostgreSQL driver issues by:
 * 1. Ensuring proper JDBC driver registration
 * 2. Providing fallback configuration for test environments
 * 3. Managing database connection lifecycle
 */

package umig.tests.config

import java.sql.DriverManager
import java.sql.Connection
import java.sql.SQLException

class TestConfiguration {

    // Database connection configuration
    static final String JDBC_URL = "jdbc:postgresql://localhost:5432/umig_app_db"
    static final String JDBC_USER = "umig_app"
    static final String JDBC_PASSWORD = "umig_app_password"
    static final String JDBC_DRIVER = "org.postgresql.Driver"

    // Test environment flags
    static final boolean IS_TEST_ENV = true
    static final int CONNECTION_TIMEOUT = 10000 // 10 seconds

    /**
     * Initialize PostgreSQL JDBC driver
     * This method ensures the driver is properly loaded before any database operations
     */
    static void initializeJdbcDriver() {
        try {
            // Explicit driver loading to ensure PostgreSQL driver is available
            Class.forName(JDBC_DRIVER)
            println("✅ PostgreSQL JDBC driver loaded successfully")

            // Verify driver registration
            def drivers = DriverManager.getDrivers()
            def postgresqlDriverFound = false
            while (drivers.hasMoreElements()) {
                def driver = drivers.nextElement()
                if (driver.class.name.contains("postgresql")) {
                    postgresqlDriverFound = true
                    println("✅ PostgreSQL driver registered: ${driver.class.name}")
                    break
                }
            }

            if (!postgresqlDriverFound) {
                throw new SQLException("PostgreSQL driver not properly registered")
            }

        } catch (ClassNotFoundException e) {
            throw new RuntimeException("PostgreSQL JDBC driver not found in classpath. " +
                "Ensure postgresql-42.7.3.jar is included. Error: ${e.message}", e)
        } catch (SQLException e) {
            throw new RuntimeException("Failed to register PostgreSQL driver: ${e.message}", e)
        }
    }

    /**
     * Create a test database connection with proper error handling
     * @return Connection to the test database
     */
    static Connection createTestConnection() {
        initializeJdbcDriver()

        try {
            // Set connection timeout - explicit casting to int (ADR-031/043 compliance)
            DriverManager.setLoginTimeout((CONNECTION_TIMEOUT / 1000) as int)

            // Create connection with explicit driver specification
            def connection = DriverManager.getConnection(JDBC_URL, JDBC_USER, JDBC_PASSWORD)

            // Configure connection for tests
            connection.autoCommit = false // Use transactions for test isolation

            println("✅ Test database connection established")
            return connection

        } catch (SQLException e) {
            println("❌ Failed to connect to test database:")
            println("   URL: ${JDBC_URL}")
            println("   User: ${JDBC_USER}")
            println("   Error: ${e.message}")

            // Provide troubleshooting information
            if (e.message.contains("Connection refused")) {
                println("💡 Troubleshooting:")
                println("   1. Ensure PostgreSQL is running: npm start")
                println("   2. Check database is accessible: psql -h localhost -p 5432 -U ${JDBC_USER} -d umig_app_db")
                println("   3. Verify credentials in docker-compose.yml")
            }

            throw new RuntimeException("Database connection failed: ${e.message}", e)
        }
    }

    /**
     * Execute a test operation with automatic connection management
     * @param operation Closure that receives a Connection parameter
     * @return Result of the operation
     */
    static def withTestConnection(Closure operation) {
        Connection connection = null
        try {
            connection = createTestConnection()
            return operation.call(connection)
        } finally {
            if (connection != null && !connection.isClosed()) {
                try {
                    connection.rollback() // Rollback any changes for test isolation
                    connection.close()
                    println("✅ Test database connection closed")
                } catch (SQLException e) {
                    println("⚠️ Warning: Failed to close test connection: ${e.message}")
                }
            }
        }
    }

    /**
     * Verify test database connectivity
     * @return true if database is accessible, false otherwise
     */
    static boolean verifyDatabaseConnectivity() {
        try {
            withTestConnection { connection ->
                // Explicit casting to Connection for SQL operations (ADR-031/043 compliance)
                def statement = (connection as Connection).createStatement()
                def resultSet = statement.executeQuery("SELECT 1 as test_value")

                if (resultSet.next()) {
                    def testValue = resultSet.getInt("test_value")
                    println("✅ Database connectivity verified (test query returned: ${testValue})")
                    return testValue == 1
                }

                return false
            }
        } catch (Exception e) {
            println("❌ Database connectivity check failed: ${e.message}")
            return false
        }
    }

    /**
     * Setup method to be called at the beginning of test suites
     */
    static void setupTestEnvironment() {
        println("🔧 Setting up Groovy test environment...")

        // Initialize JDBC driver
        initializeJdbcDriver()

        // Verify database connectivity
        if (!verifyDatabaseConnectivity()) {
            throw new RuntimeException("Test environment setup failed: Database not accessible")
        }

        println("✅ Groovy test environment setup complete")
    }

    /**
     * Cleanup method to be called at the end of test suites
     */
    static void cleanupTestEnvironment() {
        println("🧹 Cleaning up Groovy test environment...")

        // Clear any cached connections
        try {
            // Force driver manager cleanup if needed
            System.gc()
            println("✅ Groovy test environment cleanup complete")
        } catch (Exception e) {
            println("⚠️ Warning during test cleanup: ${e.message}")
        }
    }
}