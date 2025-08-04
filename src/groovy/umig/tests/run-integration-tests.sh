#!/bin/bash

# This script runs all integration tests for the UMIG project.
# It should be executed from the root of the project directory.

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Running Integration Tests..."

# --- Configuration ---
# This path is specific to the local machine's Groovy Grape cache.
JDBC_DRIVER_PATH="/Users/lucaschallamel/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.2.20.jar"

# --- Pre-flight Check ---
if [ ! -f "$JDBC_DRIVER_PATH" ]; then
    echo "❌ Error: PostgreSQL JDBC driver not found at $JDBC_DRIVER_PATH"
    echo "Please ensure the driver has been downloaded by Groovy's Grape."
    exit 1
fi

# --- Test Execution ---
printf "\n🧪 Running Step View API Integration Test...\n"
groovy -cp "$JDBC_DRIVER_PATH" src/groovy/umig/tests/integration/stepViewApiIntegrationTest.groovy

printf "\n🧪 Running Plans API Integration Test...\n"
groovy -cp "$JDBC_DRIVER_PATH" src/groovy/umig/tests/integration/PlansApiIntegrationTest.groovy

printf "\n🧪 Running Sequences API Integration Test...\n"
groovy -cp "$JDBC_DRIVER_PATH" src/groovy/umig/tests/integration/SequencesApiIntegrationTest.groovy

# --- Add future integration tests here ---


printf "\n✅ All integration tests passed successfully!\n"
