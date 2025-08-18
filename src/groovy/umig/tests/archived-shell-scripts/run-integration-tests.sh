#!/bin/bash

# ========================================================================
# ⚠️  DEPRECATION WARNING ⚠️
# ========================================================================
# This shell script is DEPRECATED and will be removed in Sprint 6.
# 
# MIGRATION: Use NPM command instead:
#   npm run test:integration
#
# Migration Date: August 28, 2025
# Reason: Shell scripts have been migrated to JavaScript NPM runners 
#         for better cross-platform compatibility and maintainability.
# ========================================================================

echo "⚠️  WARNING: This script is deprecated. Use 'npm run test:integration' instead."
echo "   Migration deadline: August 28, 2025"
echo "   This script will be removed in Sprint 6."
echo ""

# This script runs all integration tests for the UMIG project.
# It should be executed from the root of the project directory.
# 
# Updated: 2025-08-18 - Added new test files and enhanced classpath configuration
# - Added MigrationsApiBulkOperationsTest.groovy and CrossApiIntegrationTest.groovy  
# - Enhanced classpath to include src/groovy for DatabaseUtil access (ADR-036)

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

# --- XML Parser Configuration ---
# Force JDK built-in XML parsers to avoid classpath conflicts
XML_PARSER_OPTS="-Djavax.xml.parsers.SAXParserFactory=com.sun.org.apache.xerces.internal.jaxp.SAXParserFactoryImpl"
XML_PARSER_OPTS="$XML_PARSER_OPTS -Djavax.xml.parsers.DocumentBuilderFactory=com.sun.org.apache.xerces.internal.jaxp.DocumentBuilderFactoryImpl"
XML_PARSER_OPTS="$XML_PARSER_OPTS -Djavax.xml.transform.TransformerFactory=com.sun.org.apache.xalan.internal.xsltc.trax.TransformerFactoryImpl"
XML_PARSER_OPTS="$XML_PARSER_OPTS -Djava.endorsed.dirs="

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
groovy $XML_PARSER_OPTS -cp "$JDBC_DRIVER_PATH:src/groovy" src/groovy/umig/tests/integration/stepViewApiIntegrationTest.groovy || report_failure "stepViewApiIntegrationTest"

printf "\n🧪 Running Plans API Integration Test...\n"
groovy $XML_PARSER_OPTS -cp "$JDBC_DRIVER_PATH:src/groovy" src/groovy/umig/tests/integration/PlansApiIntegrationTest.groovy || report_failure "PlansApiIntegrationTest"

printf "\n🧪 Running Sequences API Integration Test...\n"
groovy $XML_PARSER_OPTS -cp "$JDBC_DRIVER_PATH:src/groovy" src/groovy/umig/tests/integration/SequencesApiIntegrationTest.groovy || report_failure "SequencesApiIntegrationTest"

printf "\n🧪 Running Phases API Integration Test...\n"
groovy $XML_PARSER_OPTS -cp "$JDBC_DRIVER_PATH:src/groovy" src/groovy/umig/tests/integration/PhasesApiIntegrationTest.groovy || report_failure "PhasesApiIntegrationTest"

printf "\n🧪 Running Instructions API Integration Test...\n"
groovy $XML_PARSER_OPTS -cp "$JDBC_DRIVER_PATH:src/groovy" src/groovy/umig/tests/integration/InstructionsApiIntegrationTestWorking.groovy || report_failure "InstructionsApiIntegrationTestWorking"

printf "\n🧪 Running Controls API Integration Test...\n"
groovy $XML_PARSER_OPTS -cp "$JDBC_DRIVER_PATH:src/groovy" src/groovy/umig/tests/integration/ControlsApiIntegrationTest.groovy || report_failure "ControlsApiIntegrationTest"

printf "\n🧪 Running Applications API Integration Test...\n"
groovy $XML_PARSER_OPTS -cp "$JDBC_DRIVER_PATH:src/groovy" src/groovy/umig/tests/integration/ApplicationsApiIntegrationTest.groovy || report_failure "ApplicationsApiIntegrationTest"

printf "\n🧪 Running Environments API Integration Test...\n"
groovy $XML_PARSER_OPTS -cp "$JDBC_DRIVER_PATH:src/groovy" src/groovy/umig/tests/integration/EnvironmentsApiIntegrationTest.groovy || report_failure "EnvironmentsApiIntegrationTest"

printf "\n🧪 Running Teams API Integration Test...\n"
groovy $XML_PARSER_OPTS -cp "$JDBC_DRIVER_PATH:src/groovy" src/groovy/umig/tests/integration/TeamsApiIntegrationTest.groovy || report_failure "TeamsApiIntegrationTest"

printf "\n🧪 Running Migrations API Bulk Operations Test...\n"
groovy $XML_PARSER_OPTS -cp "$JDBC_DRIVER_PATH:src/groovy" src/groovy/umig/tests/integration/MigrationsApiBulkOperationsTest.groovy || report_failure "MigrationsApiBulkOperationsTest"

printf "\n🧪 Running Cross API Integration Test...\n"
groovy $XML_PARSER_OPTS -cp "$JDBC_DRIVER_PATH:src/groovy" src/groovy/umig/tests/integration/CrossApiIntegrationTest.groovy || report_failure "CrossApiIntegrationTest"

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
