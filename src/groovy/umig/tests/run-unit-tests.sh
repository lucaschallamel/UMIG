#!/bin/bash

# This script runs all unit tests for the UMIG project.
# It should be executed from the root of the project directory.

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Running Unit Tests..."

# --- SDKMAN Integration ---
# Source SDKMAN to use the correct Groovy version
source "$HOME/.sdkman/bin/sdkman-init.sh"
echo "Using Groovy version: $(groovy --version)"

# --- Configuration ---
# This path is specific to the local machine's Groovy Grape cache.
JDBC_DRIVER_PATH="/Users/lucaschallamel/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.3.jar"

# --- Pre-flight Check ---
if [ ! -f "$JDBC_DRIVER_PATH" ]; then
    echo "❌ Error: PostgreSQL JDBC driver not found at $JDBC_DRIVER_PATH"
    echo "Please ensure the driver has been downloaded by Groovy's Grape."
    echo "Attempting to download dependencies..."
    groovy src/groovy/umig/tests/grab-postgres-jdbc.groovy
fi

# --- Unit Test Execution ---
# Due to Groovy 3.0.x compatibility issues with JAX-RS dependencies,
# we use simplified unit tests without Spock framework

# Track test results
FAILED_TESTS=()

# Function to report test failures
report_failure() {
    FAILED_TESTS+=("$1")
    echo "❌ Test failed: $1"
}

# Run unit tests
echo ""
echo "Running unit tests..."
echo "===================="

## Instructions API
echo "Testing Instructions API..."
groovy src/groovy/umig/tests/unit/api/v2/InstructionsApiWorkingTest.groovy || report_failure "InstructionsApiWorkingTest"

## Plans API  
echo "Testing Plans API..."
groovy src/groovy/umig/tests/apis/PlansApiUnitTestSimple.groovy || report_failure "PlansApiUnitTestSimple"

## Team Repository
echo "Testing Team Repository..."
groovy src/groovy/umig/tests/unit/repository/TeamRepositorySpec.groovy 2>/dev/null || report_failure "TeamRepositorySpec"

## Phase Repository
echo "Testing Phase Repository..."
groovy src/groovy/umig/tests/unit/PhaseRepositoryTest.groovy || report_failure "PhaseRepositoryTest"

## Sequence Repository
echo "Testing Sequence Repository..."
groovy src/groovy/umig/tests/unit/SequenceRepositoryTest.groovy || report_failure "SequenceRepositoryTest"

## Migration Repository
echo "Testing Migration Repository..."
groovy src/groovy/umig/tests/unit/repository/MigrationRepositoryTest.groovy || report_failure "MigrationRepositoryTest"

# --- Test Summary ---
echo ""
echo "Test Summary"
echo "============"
if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    printf "\n✅ All unit tests passed successfully!\n"
else
    printf "\n❌ ${#FAILED_TESTS[@]} test(s) failed:\n"
    for test in "${FAILED_TESTS[@]}"; do
        echo "   - $test"
    done
    exit 1
fi