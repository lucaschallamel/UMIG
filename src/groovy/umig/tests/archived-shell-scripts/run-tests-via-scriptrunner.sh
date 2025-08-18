#!/bin/bash

# ========================================================================
# ⚠️  DEPRECATION WARNING ⚠️
# ========================================================================
# This shell script is DEPRECATED and will be removed in Sprint 6.
# 
# MIGRATION: Use NPM command instead:
#   npm run test:integration
#   (ScriptRunner support is automatically included)
#
# Migration Date: August 28, 2025
# Reason: Shell scripts have been migrated to JavaScript NPM runners 
#         for better cross-platform compatibility and maintainability.
# ========================================================================

echo "⚠️  WARNING: This script is deprecated. Use 'npm run test:integration' instead."
echo "   Migration deadline: August 28, 2025"
echo "   This script will be removed in Sprint 6."
echo "   ScriptRunner support is now built into the NPM test runner."
echo ""

# Run Integration Tests via ScriptRunner REST Endpoint
# This executes the tests through ScriptRunner's script execution capability

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  UMIG Integration Tests - ScriptRunner Execution              ║"
echo "║  Running tests via ScriptRunner REST endpoint                 ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Configuration
CONFLUENCE_URL="http://localhost:8090"
SCRIPTRUNNER_URL="$CONFLUENCE_URL/rest/scriptrunner/latest/custom/scriptConsole"
USERNAME="admin"
PASSWORD="admin"

# Check if Confluence is accessible
if ! curl -s -o /dev/null -w "%{http_code}" "$CONFLUENCE_URL" | grep -q "200\|302"; then
    echo "❌ Confluence is not accessible at $CONFLUENCE_URL"
    echo "   Please ensure the environment is running with: npm start"
    exit 1
fi

echo "✅ Confluence is accessible"
echo ""

# Function to execute a test via ScriptRunner
run_test_via_scriptrunner() {
    local test_file=$1
    local test_name=$(basename "$test_file" .groovy)
    
    echo "🧪 Running $test_name..."
    
    # Read the test file content
    local test_content=$(cat "src/groovy/umig/tests/integration/$test_file" 2>/dev/null)
    
    if [ -z "$test_content" ]; then
        echo "❌ Could not read test file: $test_file"
        return 1
    fi
    
    # Execute via ScriptRunner REST API
    local response=$(curl -s -X POST \
        -u "$USERNAME:$PASSWORD" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        "$SCRIPTRUNNER_URL" \
        -d "{\"script\": $(echo "$test_content" | jq -Rs .)}")
    
    # Check response
    if echo "$response" | grep -q "success.*true"; then
        echo "✅ $test_name passed"
        return 0
    else
        echo "❌ $test_name failed"
        echo "   Response: $response"
        return 1
    fi
}

# Alternative: Direct test execution for ADR-036 tests
# These tests use HttpURLConnection and don't need ScriptRunner context
run_standalone_test() {
    local test_file=$1
    local test_name=$(basename "$test_file" .groovy)
    
    echo "🧪 Running $test_name (standalone)..."
    
    # Run the test directly with proper classpath
    cd /Users/lucaschallamel/Documents/GitHub/UMIG
    
    # Use the PostgreSQL driver and source directory in classpath
    groovy -cp "local-dev-setup/libs/postgresql-42.6.0.jar:src/groovy" \
        "src/groovy/umig/tests/integration/$test_file" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ $test_name passed"
        return 0
    else
        echo "❌ $test_name failed"
        return 1
    fi
}

# Track test results
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_TEST_NAMES=()

echo "═══════════════════════════════════════════════════════════════════"
echo "Running Integration Tests"
echo "═══════════════════════════════════════════════════════════════════"
echo ""

# ADR-036 Pure Groovy tests (can run standalone)
STANDALONE_TESTS=(
    "ApplicationsApiIntegrationTest.groovy"
    "EnvironmentsApiIntegrationTest.groovy"
    "TeamsApiIntegrationTest.groovy"
    "MigrationsApiBulkOperationsTest.groovy"
    "CrossApiIntegrationTest.groovy"
)

# Tests that have been converted to ADR-036
CONVERTED_TESTS=(
    "PlansApiIntegrationTest.groovy"
    "SequencesApiIntegrationTest.groovy"
    "PhasesApiIntegrationTest.groovy"
    "ControlsApiIntegrationTest.groovy"
)

echo "Running ADR-036 Pure Groovy Tests..."
echo "───────────────────────────────────"

for test in "${STANDALONE_TESTS[@]}" "${CONVERTED_TESTS[@]}"; do
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if run_standalone_test "$test"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        FAILED_TEST_NAMES+=("$test")
    fi
    echo ""
done

# Summary
echo "═══════════════════════════════════════════════════════════════════"
echo "Integration Test Summary"
echo "═══════════════════════════════════════════════════════════════════"
echo ""
echo "Total Tests: $TOTAL_TESTS"
echo "✅ Passed: $PASSED_TESTS"
echo "❌ Failed: $FAILED_TESTS"

if [ ${#FAILED_TEST_NAMES[@]} -gt 0 ]; then
    echo ""
    echo "Failed Tests:"
    for failed_test in "${FAILED_TEST_NAMES[@]}"; do
        echo "  - $failed_test"
    done
fi

echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -eq 0 ]; then
    echo "🎉 All integration tests passed!"
    exit 0
else
    echo "⚠️  Some tests failed. Please review the output above."
    exit 1
fi