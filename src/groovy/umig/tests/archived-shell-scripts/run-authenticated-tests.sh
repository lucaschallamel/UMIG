#!/bin/bash

# ========================================================================
# ⚠️  DEPRECATION WARNING ⚠️
# ========================================================================
# This shell script is DEPRECATED and will be removed in Sprint 6.
# 
# MIGRATION: Use NPM command instead:
#   npm run test:integration:auth
#
# Migration Date: August 28, 2025
# Reason: Shell scripts have been migrated to JavaScript NPM runners 
#         for better cross-platform compatibility and maintainability.
# ========================================================================

# UMIG Authenticated Integration Tests Runner
# Purpose: Run integration tests with proper authentication support
# Created: 2025-08-18

echo "⚠️  WARNING: This script is deprecated. Use 'npm run test:integration:auth' instead."
echo "   Migration deadline: August 28, 2025"
echo "   This script will be removed in Sprint 6."
echo ""

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  UMIG Authenticated Integration Tests                         ║"
echo "║  Running tests with secure authentication                     ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Navigate to project root
cd "$(dirname "$0")/../../.." || exit 1

# Test authentication first
echo "🔐 Verifying authentication setup..."
groovy -cp src/groovy src/groovy/umig/tests/integration/AuthenticationTest.groovy
if [ $? -ne 0 ]; then
    echo "❌ Authentication verification failed. Please check your .env file."
    exit 1
fi

echo ""
echo "✅ Authentication verified. Running integration tests..."
echo ""

# Run the new integration tests that have authentication
echo "🧪 Running MigrationsAPI Bulk Operations Test..."
groovy -cp src/groovy src/groovy/umig/tests/integration/MigrationsApiBulkOperationsTest.groovy
MIGRATIONS_RESULT=$?

echo ""
echo "🧪 Running Cross-API Integration Test..."
groovy -cp src/groovy src/groovy/integration/CrossApiIntegrationTest.groovy
CROSSAPI_RESULT=$?

# Summary
echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║  Test Results Summary                                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"

TOTAL_TESTS=2
PASSED_TESTS=0

if [ $MIGRATIONS_RESULT -eq 0 ]; then
    echo "✅ MigrationsAPI Bulk Operations Test: PASSED"
    ((PASSED_TESTS++))
else
    echo "❌ MigrationsAPI Bulk Operations Test: FAILED"
fi

if [ $CROSSAPI_RESULT -eq 0 ]; then
    echo "✅ Cross-API Integration Test: PASSED"
    ((PASSED_TESTS++))
else
    echo "❌ Cross-API Integration Test: FAILED"
fi

echo ""
echo "Overall: $PASSED_TESTS/$TOTAL_TESTS tests passed"

if [ $PASSED_TESTS -eq $TOTAL_TESTS ]; then
    echo "🎉 All authenticated tests passed!"
    exit 0
else
    echo "⚠️ Some tests failed. Please review the output above."
    exit 1
fi