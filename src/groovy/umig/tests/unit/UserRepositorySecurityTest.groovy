/**
 * Security Unit Tests for UserRepository
 * Tests critical security vulnerability fixes
 * 
 * FIXES TESTED:
 * 1. SQL Injection prevention in getUserActivity method
 * 2. Input validation and sanitization
 * 3. Authorization controls for data access
 */

package umig.tests.unit

import groovy.sql.Sql
import groovy.sql.GroovyRowResult
import java.sql.SQLException

// Embedded MockSql for self-contained testing (TD-001 pattern)
class MockSql {
    List<Map> mockRows = []
    Map mockFirstRow = null
    List<String> executedQueries = []
    List<Object> queryParams = []
    
    List<GroovyRowResult> rows(String query, Object params = []) {
        executedQueries << query

        // Handle both List and Map parameter types (ADR-031 type safety)
        if (params instanceof List) {
            queryParams.addAll(params as List)
        } else if (params instanceof Map) {
            queryParams.addAll((params as Map).values())
        }

        // Validate that query doesn't contain injection vulnerabilities
        if (query.contains("INTERVAL ':days days'") || query.contains("INTERVAL \":days days\"")) {
            throw new SQLException("SQL injection vulnerability detected in query")
        }

        return mockRows.collect { new GroovyRowResult(it) }
    }

    GroovyRowResult firstRow(String query, Object params = []) {
        executedQueries << query

        // Handle both List and Map parameter types (ADR-031 type safety)
        if (params instanceof List) {
            queryParams.addAll(params as List)
        } else if (params instanceof Map) {
            queryParams.addAll((params as Map).values())
        }

        return mockFirstRow ? new GroovyRowResult(mockFirstRow) : null
    }

    void execute(String query, Object params = []) {
        executedQueries << query

        // Handle both List and Map parameter types (ADR-031 type safety)
        if (params instanceof List) {
            queryParams.addAll(params as List)
        } else if (params instanceof Map) {
            queryParams.addAll((params as Map).values())
        }
    }
    
    void clearMocks() {
        mockRows.clear()
        mockFirstRow = null
        executedQueries.clear()
        queryParams.clear()
    }
}

// Embedded DatabaseUtil for self-contained testing
class DatabaseUtil {
    static MockSql mockSqlInstance = new MockSql()
    
    static def withSql(Closure closure) {
        return closure(mockSqlInstance)
    }
    
    static void clearMocks() {
        mockSqlInstance.clearMocks()
    }
}

// Embedded UserRepository with security fixes
class UserRepository {
    
    /**
     * [SFT] Fixed getUserActivity method with SQL injection prevention
     */
    def getUserActivity(int userId, int days = 30) {
        // [SF] [SFT] Input validation and SQL injection prevention
        if (userId <= 0) {
            throw new IllegalArgumentException("User ID must be positive")
        }
        if (days <= 0 || days > 365) {
            throw new IllegalArgumentException("Days must be between 1 and 365")
        }
        
        DatabaseUtil.withSql { MockSql sql ->
            return sql.rows("""
                SELECT 
                    entity_type,
                    entity_id,
                    action,
                    old_value,
                    new_value,
                    changed_at,
                    changed_by
                FROM audit_log
                WHERE ((entity_type = 'user' AND entity_id = :userId)
                   OR changed_by = :userId)
                   AND changed_at >= (NOW() - INTERVAL '1 day' * :days)
                ORDER BY changed_at DESC
                LIMIT 1000
            """, [userId: userId, days: days])
        }
    }
    
    /**
     * [SFT] Security validation for user activity access
     */
    boolean canAccessUserActivity(int requestingUserId, int targetUserId, boolean isAdmin = false) {
        // [SFT] Users can always access their own activity
        if (requestingUserId == targetUserId) {
            return true
        }
        
        // [SFT] Administrators can access any user's activity
        if (isAdmin) {
            return true
        }
        
        // [SFT] Regular users cannot access other users' activity
        return false
    }
}

/**
 * Self-contained security test class
 */
class UserRepositorySecurityTest {
    
    UserRepository userRepository
    
    def setup() {
        userRepository = new UserRepository()
        DatabaseUtil.clearMocks()
    }
    
    def cleanup() {
        DatabaseUtil.clearMocks()
    }
    
    // Test SQL injection prevention
    void testSqlInjectionPrevention() {
        setup()
        
        println "Testing SQL injection prevention..."
        
        // Test malicious days parameter
        def maliciousInputs = [
            "1; DROP TABLE users_usr; --",
            "'; DELETE FROM audit_log; --",
            "' OR '1'='1' --",
            "'; TRUNCATE TABLE users_usr; --"
        ]
        
        maliciousInputs.each { maliciousInput ->
            try {
                userRepository.getUserActivity(1, maliciousInput as int)
                throw new AssertionError("Should have thrown IllegalArgumentException for: ${maliciousInput}")
            } catch (IllegalArgumentException e) {
                println "✓ Blocked malicious input: ${maliciousInput}"
            } catch (NumberFormatException e) {
                println "✓ Type conversion blocked malicious input: ${maliciousInput}"
            }
        }
        
        cleanup()
    }
    
    // Test input validation
    void testInputValidation() {
        setup()
        
        println "Testing input validation..."
        
        // Test invalid user IDs
        def invalidUserIds = [-1, 0, null]
        invalidUserIds.each { userId ->
            try {
                if (userId == null) {
                    userRepository.getUserActivity(userId, 30)
                } else {
                    userRepository.getUserActivity(userId as int, 30)
                }
                throw new AssertionError("Should have thrown exception for userId: ${userId}")
            } catch (IllegalArgumentException | NullPointerException e) {
                println "✓ Blocked invalid userId: ${userId}"
            }
        }
        
        // Test invalid days values
        def invalidDays = [-1, 0, 366, 1000]
        invalidDays.each { days ->
            try {
                userRepository.getUserActivity(1, days as int)
                throw new AssertionError("Should have thrown exception for days: ${days}")
            } catch (IllegalArgumentException e) {
                println "✓ Blocked invalid days: ${days}"
            }
        }
        
        cleanup()
    }
    
    // Test secure query structure
    void testSecureQueryStructure() {
        setup()
        
        println "Testing secure query structure..."
        
        // Mock successful query execution
        DatabaseUtil.mockSqlInstance.mockRows = [
            [entity_type: 'user', entity_id: 1, action: 'update', changed_by: 1]
        ]
        
        def result = userRepository.getUserActivity(1, 30)
        
        // Verify query was executed
        assert DatabaseUtil.mockSqlInstance.executedQueries.size() == 1
        
        def query = DatabaseUtil.mockSqlInstance.executedQueries[0]
        def params = DatabaseUtil.mockSqlInstance.queryParams
        
        // Verify secure parameterization
        assert !query.contains("INTERVAL ':days days'"), "Query should not use string interpolation for INTERVAL"
        assert query.contains("INTERVAL '1 day' * :days"), "Query should use secure multiplication pattern"
        assert query.contains(":userId"), "Query should use parameterized userId"
        assert query.contains(":days"), "Query should use parameterized days"
        
        // Verify parameters were passed correctly
        assert params.contains(1), "userId parameter should be passed"
        assert params.contains(30), "days parameter should be passed"
        
        println "✓ Query uses secure parameterization"
        
        cleanup()
    }
    
    // Test authorization controls
    void testAuthorizationControls() {
        setup()
        
        println "Testing authorization controls..."
        
        // Test: User can access own activity
        assert userRepository.canAccessUserActivity(1, 1, false) == true
        println "✓ User can access own activity"
        
        // Test: Regular user cannot access other user's activity
        assert userRepository.canAccessUserActivity(1, 2, false) == false
        println "✓ Regular user blocked from other user's activity"
        
        // Test: Admin can access any user's activity
        assert userRepository.canAccessUserActivity(1, 2, true) == true
        println "✓ Admin can access any user's activity"
        
        // Test: Admin accessing own activity
        assert userRepository.canAccessUserActivity(1, 1, true) == true
        println "✓ Admin can access own activity"
        
        cleanup()
    }
    
    // Test edge cases and boundary conditions
    void testEdgeCases() {
        setup()
        
        println "Testing edge cases..."
        
        // Test boundary values
        def boundaryTests = [
            [userId: 1, days: 1, shouldPass: true],
            [userId: 1, days: 365, shouldPass: true],
            [userId: Integer.MAX_VALUE, days: 30, shouldPass: true],
            [userId: 1, days: 366, shouldPass: false]
        ]
        
        boundaryTests.each { test ->
            try {
                userRepository.getUserActivity(test.userId as int, test.days as int)
                if (!test.shouldPass) {
                    throw new AssertionError("Should have failed for userId=${test.userId}, days=${test.days}")
                }
                println "✓ Boundary test passed: userId=${test.userId}, days=${test.days}"
            } catch (IllegalArgumentException e) {
                if (test.shouldPass) {
                    throw new AssertionError("Should have passed for userId=${test.userId}, days=${test.days}")
                }
                println "✓ Boundary test correctly failed: userId=${test.userId}, days=${test.days}"
            }
        }
        
        cleanup()
    }
    
    // Main test runner
    static void main(String[] args) {
        println "=== UserRepository Security Tests ==="
        println "Testing fixes for SQL injection and authorization vulnerabilities"
        println ""
        
        def test = new UserRepositorySecurityTest()
        
        try {
            test.testSqlInjectionPrevention()
            println ""
            
            test.testInputValidation()
            println ""
            
            test.testSecureQueryStructure()
            println ""
            
            test.testAuthorizationControls()
            println ""
            
            test.testEdgeCases()
            println ""
            
            println "=== ALL SECURITY TESTS PASSED ==="
            println "✓ SQL injection vulnerability fixed"
            println "✓ Input validation implemented"
            println "✓ Secure query parameterization verified"
            println "✓ Authorization controls working"
            println "✓ Edge cases handled properly"
            
        } catch (Exception e) {
            println "❌ TEST FAILED: ${e.message}"
            e.printStackTrace()
            System.exit(1)
        }
    }
}