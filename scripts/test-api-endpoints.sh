#!/bin/bash

# Test Script for US-088-B Database Version Manager API Endpoints
# Tests the corrected endpoint URLs for enhanced package generation

echo "==================================================================="
echo "Testing US-088-B Database Version Manager Enhanced API Endpoints"
echo "==================================================================="

# Configuration
BASE_URL="http://localhost:8090"
API_BASE="/rest/scriptrunner/latest/custom"

# Basic auth credentials from .env
if [ -f .env ]; then
    source .env
    AUTH="-u ${CONFLUENCE_USERNAME}:${CONFLUENCE_PASSWORD}"
else
    echo "Warning: .env file not found, using default credentials"
    AUTH="-u admin:admin"
fi

echo ""
echo "Testing standard endpoints first..."
echo "-----------------------------------"

# Test 1: Standard database versions endpoint
echo "1. Testing GET $API_BASE/databaseVersions"
curl -s $AUTH -w "HTTP Status: %{http_code}\n" "$BASE_URL$API_BASE/databaseVersions" | head -3
echo ""

# Test 2: New SQL package endpoint (CORRECTED URL)
echo "2. Testing GET $API_BASE/databaseVersionsPackageSQL (CORRECTED)"
curl -s $AUTH -w "HTTP Status: %{http_code}\n" "$BASE_URL$API_BASE/databaseVersionsPackageSQL" | head -3
echo ""

# Test 3: New Liquibase package endpoint (CORRECTED URL)
echo "3. Testing GET $API_BASE/databaseVersionsPackageLiquibase (CORRECTED)"
curl -s $AUTH -w "HTTP Status: %{http_code}\n" "$BASE_URL$API_BASE/databaseVersionsPackageLiquibase" | head -3
echo ""

echo "Testing with parameters..."
echo "--------------------------"

# Test 4: SQL package with parameters
echo "4. Testing SQL package with selection=all&format=postgresql"
curl -s $AUTH -w "HTTP Status: %{http_code}\n" \
  "$BASE_URL$API_BASE/databaseVersionsPackageSQL?selection=all&format=postgresql" | head -5
echo ""

# Test 5: Liquibase package with parameters
echo "5. Testing Liquibase package with selection=all"
curl -s $AUTH -w "HTTP Status: %{http_code}\n" \
  "$BASE_URL$API_BASE/databaseVersionsPackageLiquibase?selection=all" | head -5
echo ""

echo "==================================================================="
echo "Test complete. Check HTTP status codes above:"
echo "- 200: Success - Endpoint is working"
echo "- 404: Not Found - Endpoint not registered or wrong URL"
echo "- 401: Unauthorized - Check credentials"
echo "- 500: Server Error - Check Confluence logs"
echo "==================================================================="