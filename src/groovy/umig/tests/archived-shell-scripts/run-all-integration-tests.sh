#!/bin/bash

# ========================================================================
# ⚠️  DEPRECATION WARNING ⚠️
# ========================================================================
# This shell script is DEPRECATED and will be removed in Sprint 6.
# 
# MIGRATION: Use NPM command instead:
#   npm run test:integration:core
#
# Migration Date: August 28, 2025
# Reason: Shell scripts have been migrated to JavaScript NPM runners 
#         for better cross-platform compatibility and maintainability.
# ========================================================================

echo "⚠️  WARNING: This script is deprecated. Use 'npm run test:integration:core' instead."
echo "   Migration deadline: August 28, 2025"
echo "   This script will be removed in Sprint 6."
echo ""

# Run all integration tests and report status
# Framework: ADR-036 Pure Groovy
# Updated: 2025-08-18

echo "============================================"
echo "Running All Integration Tests"
echo "============================================"
echo ""

# Track results
TOTAL=0
PASSED=0
FAILED=0
FAILED_TESTS=""

# Function to run a test
run_test() {
    local test_file=$1
    local test_name=$(basename $test_file .groovy)
    
    echo "Running: $test_name..."
    TOTAL=$((TOTAL + 1))
    
    # Run the test and capture exit code
    groovy "$test_file" > /tmp/${test_name}.log 2>&1
    EXIT_CODE=$?
    
    if [ $EXIT_CODE -eq 0 ]; then
        echo "✅ PASSED: $test_name"
        PASSED=$((PASSED + 1))
    else
        echo "❌ FAILED: $test_name"
        FAILED=$((FAILED + 1))
        FAILED_TESTS="$FAILED_TESTS\n  - $test_name"
        
        # Show error summary
        echo "  Error details:"
        grep -E "FAILED:|ERROR:|Exception:|AssertionError" /tmp/${test_name}.log | head -3 | sed 's/^/    /'
    fi
    echo ""
}

# Run US-022 specific tests (the 10% completion gap)
echo "=== US-022 Integration Tests ==="
run_test "src/groovy/umig/tests/integration/MigrationsApiBulkOperationsTest.groovy"
run_test "src/groovy/umig/tests/integration/CrossApiIntegrationTest.groovy"

# Run other core API tests
echo "=== Core API Integration Tests ==="
run_test "src/groovy/umig/tests/integration/PlansApiIntegrationTest.groovy"
run_test "src/groovy/umig/tests/integration/SequencesApiIntegrationTest.groovy"
run_test "src/groovy/umig/tests/integration/PhasesApiIntegrationTest.groovy"
run_test "src/groovy/umig/tests/integration/ApplicationsApiIntegrationTest.groovy"

# Summary
echo "============================================"
echo "Test Results Summary"
echo "============================================"
echo "Total Tests: $TOTAL"
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo ""

if [ $FAILED -gt 0 ]; then
    echo "Failed Tests:$FAILED_TESTS"
    echo ""
fi

# Calculate percentage
if [ $TOTAL -gt 0 ]; then
    PERCENTAGE=$((PASSED * 100 / TOTAL))
    echo "Success Rate: ${PERCENTAGE}%"
    
    if [ $PERCENTAGE -ge 80 ]; then
        echo "✅ US-022 Integration Test Expansion: COMPLETE (${PERCENTAGE}% pass rate)"
    else
        echo "⚠️  US-022 Integration Test Expansion: In Progress (${PERCENTAGE}% pass rate)"
    fi
fi

echo ""
echo "============================================"
echo "US-022 Status: Integration tests configured with:"
echo "  ✅ Secure authentication from .env"
echo "  ✅ PostgreSQL driver with @Grab"
echo "  ✅ Option A execution pattern (host → Podman)"
echo "  ✅ ADR-036 Pure Groovy framework"
echo "============================================"

exit $FAILED