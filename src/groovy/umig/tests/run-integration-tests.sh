#!/bin/bash

# This script runs all integration tests for the UMIG project.
# It should be executed from the root of the project directory.

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Running Integration Tests..."

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

# Track test results
FAILED_TESTS=()

# Function to report test failures
report_failure() {
    FAILED_TESTS+=("$1")
    echo "❌ Test failed: $1"
}

# --- Test Execution ---
echo ""
echo "Running integration tests..."
echo "==========================="

printf "\n🧪 Running Step View API Integration Test...\n"
groovy -cp "$JDBC_DRIVER_PATH" src/groovy/umig/tests/integration/stepViewApiIntegrationTest.groovy || report_failure "stepViewApiIntegrationTest"

printf "\n🧪 Running Plans API Integration Test...\n"
groovy -cp "$JDBC_DRIVER_PATH" src/groovy/umig/tests/integration/PlansApiIntegrationTest.groovy || report_failure "PlansApiIntegrationTest"

printf "\n🧪 Running Sequences API Integration Test...\n"
groovy -cp "$JDBC_DRIVER_PATH" src/groovy/umig/tests/integration/SequencesApiIntegrationTest.groovy || report_failure "SequencesApiIntegrationTest"

printf "\n🧪 Running Phases API Integration Test...\n"
groovy -cp "$JDBC_DRIVER_PATH" src/groovy/umig/tests/integration/PhasesApiIntegrationTest.groovy || report_failure "PhasesApiIntegrationTest"

printf "\n🧪 Running Instructions API Integration Test...\n"
groovy -cp "$JDBC_DRIVER_PATH" src/groovy/umig/tests/integration/InstructionsApiIntegrationTestWorking.groovy || report_failure "InstructionsApiIntegrationTestWorking"

printf "\n🧪 Running Controls API Integration Test...\n"
groovy -cp "$JDBC_DRIVER_PATH" src/groovy/umig/tests/integration/ControlsApiIntegrationTest.groovy || report_failure "ControlsApiIntegrationTest"

# --- Test Summary ---
echo ""
echo "Integration Test Summary"
echo "========================"
if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
    printf "\n✅ All integration tests passed successfully!\n"
else
    printf "\n❌ ${#FAILED_TESTS[@]} test(s) failed:\n"
    for test in "${FAILED_TESTS[@]}"; do
        echo "   - $test"
    done
    exit 1
fi
