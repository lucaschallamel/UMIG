#!/bin/bash

# ========================================================================
# ⚠️  DEPRECATION WARNING ⚠️
# ========================================================================
# This shell script is DEPRECATED and will be removed in Sprint 6.
# 
# MIGRATION: Use NPM command instead:
#   npm run test:integration
#   (Container support is automatically included)
#
# Migration Date: August 28, 2025
# Reason: Shell scripts have been migrated to JavaScript NPM runners 
#         for better cross-platform compatibility and maintainability.
# ========================================================================

echo "⚠️  WARNING: This script is deprecated. Use 'npm run test:integration' instead."
echo "   Migration deadline: August 28, 2025"
echo "   This script will be removed in Sprint 6."
echo "   Container support is now built into the NPM test runner."
echo ""

# Run Integration Tests Inside Confluence Container
# This script executes the integration tests within the Confluence container
# where ScriptRunner and all dependencies are properly configured

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  UMIG Integration Tests - Container Execution                 ║"
echo "║  Running tests inside Confluence container                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Check if containers are running
if ! podman-compose ps | grep -q "Up.*umig_confluence"; then
    echo "❌ Confluence container is not running!"
    echo "   Please start the environment with: npm start"
    exit 1
fi

if ! podman-compose ps | grep -q "Up.*umig_postgres"; then
    echo "❌ PostgreSQL container is not running!"
    echo "   Please start the environment with: npm start"
    exit 1
fi

echo "✅ Containers are running"
echo ""

# Base path inside container
CONTAINER_SCRIPTS_PATH="/var/atlassian/application-data/confluence/scripts"

# Function to run a test inside the container
run_test_in_container() {
    local test_file=$1
    local test_name=$(basename "$test_file" .groovy)
    
    echo "🧪 Running $test_name..."
    
    # Execute the test inside the container using ScriptRunner's groovy environment
    podman exec umig_confluence bash -c "
        cd $CONTAINER_SCRIPTS_PATH
        # ScriptRunner's Groovy is available in the container environment
        # Use the proper classpath for database access
        groovy -cp '/opt/atlassian/confluence/confluence/WEB-INF/lib/*' umig/tests/integration/$test_file
    " 2>&1
    
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

# List of tests to run (ADR-036 Pure Groovy tests)
TESTS=(
    "ApplicationsApiIntegrationTest.groovy"
    "EnvironmentsApiIntegrationTest.groovy"
    "TeamsApiIntegrationTest.groovy"
    "MigrationsApiBulkOperationsTest.groovy"
    "CrossApiIntegrationTest.groovy"
    "PlansApiIntegrationTest.groovy"
    "SequencesApiIntegrationTest.groovy"
    "PhasesApiIntegrationTest.groovy"
    "ControlsApiIntegrationTest.groovy"
    "InstructionsApiIntegrationTestWorking.groovy"
)

# Run each test
for test in "${TESTS[@]}"; do
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if run_test_in_container "$test"; then
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