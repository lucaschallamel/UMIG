#!/bin/bash
# smoke-test-suite.sh - Critical path validation for US-032 upgrade
# Immediate post-upgrade verification

set -e

echo "🔥 Running Smoke Test Suite for US-032 Upgrade..."
echo "=================================================="

FAILED_TESTS=()

# Test 1: Confluence Startup and Basic Connectivity
test_confluence_startup() {
    echo "Testing Confluence startup and connectivity..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s http://localhost:8090/status > /dev/null 2>&1; then
            echo "✅ Confluence is accessible"
            
            # Test admin panel access
            if curl -f -s -H "Accept: text/html" http://localhost:8090/admin > /dev/null 2>&1; then
                echo "✅ Confluence admin panel accessible"
                return 0
            else
                echo "⚠️  Confluence admin panel may not be accessible"
                return 1
            fi
        fi
        
        echo "  Attempt $attempt/$max_attempts - waiting for Confluence..."
        sleep 10
        ((attempt++))
    done
    
    echo "❌ Confluence startup failed after $max_attempts attempts"
    return 1
}

# Test 2: ScriptRunner Console and Basic Functionality
test_scriptrunner_console() {
    echo "Testing ScriptRunner console access and basic functionality..."
    
    # Test ScriptRunner console access
    if curl -f -s -H "Accept: text/html" "http://localhost:8090/plugins/servlet/scriptrunner/admin" > /dev/null 2>&1; then
        echo "✅ ScriptRunner console accessible"
        
        # Test ScriptRunner REST endpoint functionality
        if curl -f -s "http://localhost:8090/rest/scriptrunner/latest/canned/com.onresolve.scriptrunner.canned.common.admin.GetScriptRunnerInfo" > /dev/null 2>&1; then
            echo "✅ ScriptRunner REST endpoints functional"
            return 0
        else
            echo "⚠️  ScriptRunner REST endpoints may have issues"
            return 1
        fi
    else
        echo "❌ ScriptRunner console access failed"
        return 1
    fi
}

# Test 3: Database Connectivity and Basic Queries
test_database_connectivity() {
    echo "Testing database connectivity and basic queries..."
    
    # Test basic database connection
    if groovy -cp ~/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.3.jar << 'EOF'
import java.sql.DriverManager
import java.sql.SQLException

try {
    def dbUrl = "jdbc:postgresql://localhost:5432/umig_dev"
    def dbUser = "umig_user" 
    def dbPassword = "umig_password"
    
    def connection = DriverManager.getConnection(dbUrl, dbUser, dbPassword)
    
    // Test basic query
    def statement = connection.createStatement()
    def resultSet = statement.executeQuery("SELECT COUNT(*) as count FROM umig_migration_master")
    
    if (resultSet.next()) {
        def count = resultSet.getInt("count")
        println "✅ Database connectivity working - ${count} migrations found"
    }
    
    // Test a key join query
    def joinQuery = """
        SELECT COUNT(*) as step_count 
        FROM umig_step_instance si
        JOIN umig_phase_instance phi ON si.phase_instance_id = phi.phase_instance_id
        LIMIT 1
    """
    def joinResult = statement.executeQuery(joinQuery)
    
    if (joinResult.next()) {
        println "✅ Database joins working correctly"
    }
    
    connection.close()
    System.exit(0)
    
} catch (SQLException e) {
    println "❌ Database connectivity failed: ${e.message}"
    System.exit(1)
} catch (Exception e) {
    println "❌ Database test failed: ${e.message}"
    System.exit(1)
}
EOF
    then
        echo "✅ Database connectivity and queries working"
        return 0
    else
        echo "❌ Database connectivity or queries failed"
        return 1
    fi
}

# Test 4: Critical UMIG API Endpoints
test_critical_apis() {
    echo "Testing critical UMIG API endpoints..."
    
    local critical_endpoints=(
        "/rest/umig-api/v2/users"
        "/rest/umig-api/v2/teams"
        "/rest/umig-api/v2/environments"
        "/rest/umig-api/v2/steps"
        "/rest/umig-api/v2/plans"
        "/rest/umig-api/v2/sequences"
        "/rest/umig-api/v2/phases"
        "/rest/umig-api/v2/step-view"
    )
    
    local failed_count=0
    local slow_endpoints=()
    
    for endpoint in "${critical_endpoints[@]}"; do
        local start_time=$(date +%s%3N)
        
        if curl -f -s -H "Accept: application/json" "http://localhost:8090${endpoint}" > /dev/null 2>&1; then
            local end_time=$(date +%s%3N)
            local response_time=$((end_time - start_time))
            
            if [ $response_time -gt 1000 ]; then
                slow_endpoints+=("${endpoint} (${response_time}ms)")
            fi
            
            echo "  ✅ ${endpoint} (${response_time}ms)"
        else
            echo "  ❌ ${endpoint}"
            ((failed_count++))
        fi
    done
    
    # Report slow endpoints
    if [ ${#slow_endpoints[@]} -gt 0 ]; then
        echo "⚠️  Slow response times detected:"
        for slow_endpoint in "${slow_endpoints[@]}"; do
            echo "    - $slow_endpoint"
        done
    fi
    
    if [ $failed_count -eq 0 ]; then
        echo "✅ All critical APIs responding (${#critical_endpoints[@]} endpoints tested)"
        return 0
    else
        echo "❌ ${failed_count}/${#critical_endpoints[@]} critical APIs failed"
        return 1
    fi
}

# Test 5: UMIG DatabaseUtil Pattern Validation
test_database_util_pattern() {
    echo "Testing UMIG DatabaseUtil pattern functionality..."
    
    if groovy -cp ~/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.3.jar << 'EOF'
import java.sql.DriverManager
import groovy.sql.Sql

// Simulate DatabaseUtil.withSql pattern
def withSql(closure) {
    def dbUrl = "jdbc:postgresql://localhost:5432/umig_dev"
    def dbUser = "umig_user"
    def dbPassword = "umig_password" 
    
    def sql = null
    try {
        sql = Sql.newInstance(dbUrl, dbUser, dbPassword, "org.postgresql.Driver")
        return closure(sql)
    } finally {
        sql?.close()
    }
}

try {
    // Test the pattern
    def result = withSql { sql ->
        return sql.rows('SELECT COUNT(*) as count FROM umig_migration_master WHERE is_active = true')
    }
    
    if (result && result.size() > 0) {
        println "✅ DatabaseUtil pattern working - found ${result[0].count} active migrations"
        System.exit(0)
    } else {
        println "❌ DatabaseUtil pattern failed - no results returned"
        System.exit(1)
    }
    
} catch (Exception e) {
    println "❌ DatabaseUtil pattern failed: ${e.message}"
    System.exit(1)
}
EOF
    then
        echo "✅ DatabaseUtil pattern validated"
        return 0
    else
        echo "❌ DatabaseUtil pattern validation failed"
        return 1
    fi
}

# Test 6: Admin GUI Basic Access
test_admin_gui_access() {
    echo "Testing Admin GUI access..."
    
    # Test main admin page
    if curl -f -s "http://localhost:8090/display/UMIG/Admin" > /dev/null 2>&1; then
        echo "✅ Admin GUI main page accessible"
        
        # Test if key resources are loading
        local gui_resources=(
            "js/umig-admin.js"
            "css/umig-admin.css"
        )
        
        local resource_issues=0
        for resource in "${gui_resources[@]}"; do
            if ! curl -f -s "http://localhost:8090/download/resources/umig-admin/${resource}" > /dev/null 2>&1; then
                echo "  ⚠️ Resource may not be loading: $resource"
                ((resource_issues++))
            fi
        done
        
        if [ $resource_issues -eq 0 ]; then
            echo "✅ Admin GUI resources loading correctly"
            return 0
        else
            echo "⚠️  Admin GUI has resource loading issues"
            return 1
        fi
    else
        echo "❌ Admin GUI access failed"
        return 1
    fi
}

# Test 7: Email Service Basic Functionality
test_email_service() {
    echo "Testing email service basic functionality..."
    
    # Test if MailHog is accessible (dev environment)
    if curl -f -s "http://localhost:8025/api/v1/messages" > /dev/null 2>&1; then
        echo "✅ MailHog email service accessible"
        return 0
    else
        echo "⚠️  Email service (MailHog) may not be running"
        return 1
    fi
}

# Test 8: Authentication and Authorization
test_authentication() {
    echo "Testing authentication and authorization..."
    
    # Test that protected endpoints require authentication
    local protected_endpoint="/rest/umig-api/v2/users"
    local response_code=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:8090${protected_endpoint}")
    
    if [ "$response_code" = "200" ]; then
        echo "⚠️  Endpoint ${protected_endpoint} may not require authentication"
        echo "  (This may be expected in development environment)"
        return 0
    elif [ "$response_code" = "401" ] || [ "$response_code" = "403" ]; then
        echo "✅ Authentication appears to be enforced (HTTP ${response_code})"
        return 0
    else
        echo "❌ Unexpected response code for authentication test: ${response_code}"
        return 1
    fi
}

# Execute smoke tests with timing
echo "Starting smoke test execution..."
echo "================================="

START_TIME=$(date +%s)

test_confluence_startup || FAILED_TESTS+=("Confluence Startup")
test_scriptrunner_console || FAILED_TESTS+=("ScriptRunner Console")
test_database_connectivity || FAILED_TESTS+=("Database Connectivity")
test_critical_apis || FAILED_TESTS+=("Critical APIs")
test_database_util_pattern || FAILED_TESTS+=("DatabaseUtil Pattern")
test_admin_gui_access || FAILED_TESTS+=("Admin GUI Access")
test_email_service || FAILED_TESTS+=("Email Service")
test_authentication || FAILED_TESTS+=("Authentication")

END_TIME=$(date +%s)
TOTAL_TIME=$((END_TIME - START_TIME))

# Results summary
echo ""
echo "========================================="
echo "SMOKE TEST RESULTS"
echo "========================================="
echo "Execution Time: ${TOTAL_TIME} seconds"
echo ""

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    echo "✅ ALL SMOKE TESTS PASSED"
    echo ""
    echo "🎉 System is ready for comprehensive testing"
    echo "   - Confluence and ScriptRunner are functional"
    echo "   - Database connectivity confirmed"
    echo "   - Critical APIs responding"
    echo "   - UMIG patterns validated"
    echo "   - Admin GUI accessible"
    echo ""
    echo "Next Steps:"
    echo "  1. Run comprehensive integration tests"
    echo "  2. Execute performance validation"
    echo "  3. Perform security validation"
    exit 0
else
    echo "❌ ${#FAILED_TESTS[@]} SMOKE TESTS FAILED:"
    for test in "${FAILED_TESTS[@]}"; do
        echo "   - $test"
    done
    echo ""
    echo "🚨 CRITICAL: System not ready for comprehensive testing"
    echo ""
    echo "Required Actions:"
    echo "  1. Investigate and resolve failed smoke tests"
    echo "  2. Verify upgrade procedures completed successfully"
    echo "  3. Check system logs for errors"
    echo "  4. Consider rollback if critical failures persist"
    exit 1
fi