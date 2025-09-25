#!/bin/bash

# DatabaseVersionManager API Endpoint Verification Script
# US-088-B Debug: Verify API endpoints are properly registered and responding

echo "🔍 DATABASEVERSIONMANAGER API ENDPOINT VERIFICATION"
echo "=================================================="

# Get credentials from .env file
if [ -f ".env" ]; then
    source .env
else
    echo "❌ .env file not found"
    exit 1
fi

BASE_URL="http://localhost:8090"
API_BASE="/rest/scriptrunner/latest/custom/databaseVersions"

# Function to test endpoint
test_endpoint() {
    local endpoint=$1
    local description=$2
    local url="${BASE_URL}${endpoint}"

    echo "📡 Testing: ${description}"
    echo "   URL: ${url}"

    response=$(curl -s -w "%{http_code}" -u "${CONFLUENCE_ADMIN_USER}:${CONFLUENCE_ADMIN_PASSWORD}" "${url}")
    http_code="${response: -3}"
    response_body="${response%???}"

    if [ "$http_code" = "200" ]; then
        echo "   ✅ Status: $http_code OK"
        # Try to detect if it's JSON
        if echo "$response_body" | jq . >/dev/null 2>&1; then
            keys=$(echo "$response_body" | jq -r 'keys[]?' 2>/dev/null | head -5 | tr '\n' ', ' | sed 's/,$//')
            echo "   📊 Response keys: $keys"
        else
            echo "   📝 Response length: ${#response_body} characters"
        fi
    elif [ "$http_code" = "404" ]; then
        echo "   ❌ Status: $http_code NOT FOUND - Endpoint not registered"
    elif [ "$http_code" = "401" ]; then
        echo "   🔐 Status: $http_code UNAUTHORIZED - Check credentials"
    elif [ "$http_code" = "500" ]; then
        echo "   ⚠️  Status: $http_code SERVER ERROR - Check backend logs"
        echo "   📝 Error: $(echo "$response_body" | jq -r '.message // .error // .' 2>/dev/null || echo "$response_body")"
    else
        echo "   ❓ Status: $http_code - Unexpected response"
    fi
    echo ""
}

echo "🧪 Testing DatabaseVersionManager API Endpoints..."
echo ""

# Test main endpoints
test_endpoint "${API_BASE}" "Main databaseVersions endpoint"
test_endpoint "${API_BASE}/statistics" "Migration statistics"
test_endpoint "${API_BASE}/health" "Health check endpoint"

# Test the FIXED package generation endpoints (US-088-B critical fixes)
test_endpoint "${API_BASE}/packageSQL" "SQL Package Generation (FIXED URL)"
test_endpoint "${API_BASE}/packageLiquibase" "Liquibase Package Generation (FIXED URL)"

# Test the OLD URLs that should now return 404 (showing fix was applied)
echo "🔍 Testing old URLs (should return 404 to confirm fixes applied):"
echo ""
test_endpoint "${API_BASE}/packages/sql" "Old SQL URL (should be 404)"
test_endpoint "${API_BASE}/packages/liquibase" "Old Liquibase URL (should be 404)"

echo "📋 SUMMARY"
echo "=========="
echo "Expected results after fixes:"
echo "✅ packageSQL: 200 OK (NEW FIXED URL)"
echo "✅ packageLiquibase: 200 OK (NEW FIXED URL)"
echo "❌ packages/sql: 404 NOT FOUND (OLD URL)"
echo "❌ packages/liquibase: 404 NOT FOUND (OLD URL)"
echo ""
echo "If packageSQL/packageLiquibase return 404:"
echo "→ Check ScriptRunner REST Endpoints registration"
echo "→ Verify DatabaseVersionsApi.groovy compiled successfully"
echo "→ Clear ScriptRunner cache and retry"
echo ""
echo "If old URLs still return 200:"
echo "→ Backend changes not applied - check Groovy file"
echo "→ ScriptRunner cache issue - clear and restart"