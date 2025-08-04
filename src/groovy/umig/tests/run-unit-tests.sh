#!/bin/bash

# This script runs all unit tests for the UMIG project.
# It should be executed from the root of the project directory.

# Exit immediately if a command exits with a non-zero status.
set -e

echo "🚀 Running Unit Tests..."

# --- Configuration ---
# This path is specific to the local machine's Groovy Grape cache.
JDBC_DRIVER_PATH="/Users/lucaschallamel/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.3.jar"

# --- Pre-flight Check ---
if [ ! -f "$JDBC_DRIVER_PATH" ]; then
    echo "❌ Error: PostgreSQL JDBC driver not found at $JDBC_DRIVER_PATH"
    echo "Please ensure the driver has been downloaded by Groovy's Grape."
    echo "Attempting to download dependencies..."
    groovy tests/grab-postgres-jdbc.groovy
fi

# --- Unit Test Execution ---
printf "\n🧪 Running Sequence Repository Unit Test...\n"
groovy -cp "$JDBC_DRIVER_PATH" tests/unit/SequenceRepositoryTest.groovy

# --- Add future unit tests here ---

printf "\n✅ All unit tests passed successfully!\n"