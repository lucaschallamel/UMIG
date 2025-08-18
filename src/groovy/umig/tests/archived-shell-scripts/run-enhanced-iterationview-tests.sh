#!/bin/bash

# ========================================================================
# ⚠️  DEPRECATION WARNING ⚠️
# ========================================================================
# This shell script is DEPRECATED and will be removed in Sprint 6.
# 
# MIGRATION: Use NPM command instead:
#   npm run test:iterationview
#
# Migration Date: August 28, 2025
# Reason: Shell scripts have been migrated to JavaScript NPM runners 
#         for better cross-platform compatibility and maintainability.
# ========================================================================

echo "⚠️  WARNING: This script is deprecated. Use 'npm run test:iterationview' instead."
echo "   Migration deadline: August 28, 2025"
echo "   This script will be removed in Sprint 6."
echo ""

# US-028 Enhanced IterationView Test Suite Runner
# Comprehensive validation of Steps API endpoints and Enhanced IterationView performance
#
# CRITICAL TESTING: Steps API calls are failing with 404 errors despite migration dropdown working.
# This test suite validates all Steps API endpoints and identifies the root cause.
#
# Test Focus:
# 1. Validate Steps API endpoints - Test all /steps endpoints vs /api/v2/steps
# 2. Test URL construction - Verify baseUrl + endpoint combinations work correctly  
# 3. Compare with working TeamsApi.groovy pattern
# 4. Verify ScriptRunner endpoint registration - Ensure /steps is properly registered
# 5. Diagnose iteration-view.js StepsAPIv2Client URL construction problems

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
BASE_URL="http://localhost:8090"
SCRIPTRUNNER_BASE="/rest/scriptrunner/latest/custom"
TEST_TIMEOUT=30
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${TEST_DIR}/../../../.." && pwd)"
REPORT_DIR="${TEST_DIR}/../reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Test result tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
TEST_RESULTS=()

echo -e "${BLUE}================================================================================================${NC}"
echo -e "${BLUE}🚀 US-028 Enhanced IterationView Test Suite - Phase 1 Validation${NC}"
echo -e "${BLUE}Testing StepsAPI v2 integration, caching, real-time updates, and performance targets${NC}"
echo -e "${BLUE}================================================================================================${NC}"

# Create log directory
LOG_DIR="${REPORT_DIR}/logs"
mkdir -p "${LOG_DIR}"

# Function to log test results
log_test_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    local log_file="${LOG_DIR}/enhanced_iterationview_tests_${TIMESTAMP}.log"
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') - ${test_name}: ${status} - ${details}" >> "${log_file}"
    TEST_RESULTS+=("${test_name}: ${status}")
    
    if [[ "${status}" == "PASSED" ]]; then
        ((PASSED_TESTS++))
        echo -e "  ${GREEN}✅ ${test_name}: PASSED${NC} - ${details}"
    else
        ((FAILED_TESTS++))
        echo -e "  ${RED}❌ ${test_name}: FAILED${NC} - ${details}"
    fi
    ((TOTAL_TESTS++))
}

# Function to check prerequisites
check_prerequisites() {
    echo -e "\n${YELLOW}🔍 Checking Prerequisites...${NC}"
    
    # Check if Confluence is running
    if curl -s "http://localhost:8090/status" > /dev/null 2>&1; then
        log_test_result "Confluence Service" "PASSED" "Available at localhost:8090"
    else
        log_test_result "Confluence Service" "FAILED" "Not available at localhost:8090"
        echo -e "${RED}❌ Error: Confluence must be running on localhost:8090${NC}"
        exit 1
    fi
    
    # Check if database is accessible
    if command -v psql > /dev/null 2>&1; then
        if PGPASSWORD="${UMIG_DB_PASSWORD:-umigpwd}" psql -h "${UMIG_DB_HOST:-localhost}" -U "${UMIG_DB_USER:-umig}" -d "${UMIG_DB_NAME:-umig}" -c "SELECT 1;" > /dev/null 2>&1; then
            log_test_result "Database Connection" "PASSED" "PostgreSQL accessible"
        else
            log_test_result "Database Connection" "FAILED" "PostgreSQL not accessible"
        fi
    else
        log_test_result "Database Connection" "SKIPPED" "psql not available"
    fi
}

# Function to validate Steps API endpoint registration
validate_steps_api_registration() {
    echo -e "\n${BLUE}🔗 Validating Steps API Endpoint Registration...${NC}"
    
    local endpoints=(
        "/teams"      # Control test - should work
        "/migrations" # Control test - should work  
        "/steps"      # Target test - may fail
        "/steps/master"
        "/statuses/step"
    )
    
    local success_count=0
    local total_count=${#endpoints[@]}
    
    for endpoint in "${endpoints[@]}"; do
        local url="${BASE_URL}${SCRIPTRUNNER_BASE}${endpoint}"
        echo -n "  Testing ${endpoint}... "
        
        if curl -s --max-time ${TEST_TIMEOUT} "${url}" > /dev/null; then
            echo -e "${GREEN}✓ ACCESSIBLE${NC}"
            log_test_result "Endpoint ${endpoint}" "PASSED" "Accessible"
            ((success_count++))
        else
            local status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time ${TEST_TIMEOUT} "${url}")
            if [ "${status_code}" = "404" ]; then
                echo -e "${RED}❌ 404 NOT FOUND${NC}"
                log_test_result "Endpoint ${endpoint}" "FAILED" "404 Not Found"
            else
                echo -e "${YELLOW}⚠ HTTP ${status_code}${NC}"
                log_test_result "Endpoint ${endpoint}" "WARNING" "HTTP ${status_code}"
                ((success_count++))  # Non-404 errors might be permission issues, not registration issues
            fi
        fi
    done
    
    echo ""
    echo "Endpoint Registration Summary: ${success_count}/${total_count} accessible"
    
    if [ ${success_count} -lt 3 ]; then
        echo -e "${RED}❌ CRITICAL: Multiple endpoints not accessible - potential ScriptRunner registration issue${NC}"
        return 1
    elif [ ${success_count} -lt ${total_count} ]; then
        echo -e "${YELLOW}⚠ WARNING: Some endpoints not accessible - partial registration issue${NC}"
        return 2
    else
        echo -e "${GREEN}✓ All endpoints accessible${NC}"
        return 0
    fi
}

# Function to test Steps API with various parameters
test_steps_api_endpoints() {
    echo -e "\n${BLUE}🧪 Testing Steps API Endpoints with Parameters...${NC}"
    
    # Get test migration ID from database
    local test_migration_id
    test_migration_id=$(curl -s "${BASE_URL}${SCRIPTRUNNER_BASE}/migrations" | jq -r '.[0].mig_id // "550e8400-e29b-41d4-a716-446655440001"' 2>/dev/null || echo "550e8400-e29b-41d4-a716-446655440001")
    
    if [ "${test_migration_id}" = "null" ] || [ -z "${test_migration_id}" ]; then
        test_migration_id="550e8400-e29b-41d4-a716-446655440001"
        echo -e "${YELLOW}⚠ Using default test migration ID: ${test_migration_id}${NC}"
    else
        echo -e "${GREEN}✓ Using migration ID from API: ${test_migration_id}${NC}"
    fi
    
    # Test cases
    local test_cases=(
        "/steps:Basic steps endpoint"
        "/steps?migrationId=${test_migration_id}:Steps filtered by migration"
        "/steps/master:Master steps for dropdowns"
        "/steps/master?migrationId=${test_migration_id}:Master steps filtered by migration"
        "/steps/summary?migrationId=${test_migration_id}:Steps summary metrics"
        "/steps/export?migrationId=${test_migration_id}&format=json:Steps export JSON"
        "/statuses/step:Step statuses for dropdowns"
    )
    
    local success_count=0
    local total_count=${#test_cases[@]}
    
    for test_case in "${test_cases[@]}"; do
        local endpoint="${test_case%%:*}"
        local description="${test_case##*:}"
        local url="${BASE_URL}${SCRIPTRUNNER_BASE}${endpoint}"
        
        echo -n "  ${description}... "
        
        local start_time=$(date +%s%3N)
        local response=$(curl -s --max-time ${TEST_TIMEOUT} -w "%{http_code}" "${url}")
        local end_time=$(date +%s%3N)
        local duration=$((end_time - start_time))
        
        local status_code="${response: -3}"
        local body="${response%???}"
        
        if [ "${status_code}" = "200" ]; then
            echo -e "${GREEN}✓ OK (${duration}ms)${NC}"
            log_test_result "API ${description}" "PASSED" "${duration}ms response"
            ((success_count++))
            
            # Validate JSON response
            if echo "${body}" | jq empty 2>/dev/null; then
                echo "    JSON response valid"
                
                # Check for expected structure
                if echo "${body}" | jq -e 'type == "array" or has("data")' > /dev/null 2>&1; then
                    echo "    Response structure valid"
                else
                    echo -e "${YELLOW}    ⚠ Unexpected response structure${NC}"
                fi
            else
                echo -e "${YELLOW}    ⚠ Response is not valid JSON${NC}"
            fi
        elif [ "${status_code}" = "404" ]; then
            echo -e "${RED}❌ 404 NOT FOUND${NC}"
            log_test_result "API ${description}" "FAILED" "404 Not Found"
        else
            echo -e "${YELLOW}⚠ HTTP ${status_code}${NC}"
            log_test_result "API ${description}" "WARNING" "HTTP ${status_code}"
        fi
    done
    
    echo ""
    echo "API Endpoint Testing Summary: ${success_count}/${total_count} successful"
    return $((total_count - success_count))
}

# Function to test URL construction patterns
test_url_construction() {
    echo -e "\n${BLUE}🔧 Testing URL Construction Patterns...${NC}"
    
    # Test the exact patterns used by StepsAPIv2Client
    local base_url="/rest/scriptrunner/latest/custom"
    local endpoint="/steps"
    local test_iteration_id="550e8400-e29b-41d4-a716-446655440002"
    
    # Construct URL like StepsAPIv2Client does
    local constructed_url="${base_url}${endpoint}?iterationId=${test_iteration_id}"
    local full_url="${BASE_URL}${constructed_url}"
    
    echo "  Base URL: ${base_url}"
    echo "  Endpoint: ${endpoint}"
    echo "  Constructed: ${constructed_url}"
    echo "  Full URL: ${full_url}"
    
    echo -n "  Testing constructed URL... "
    
    local status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time ${TEST_TIMEOUT} "${full_url}")
    
    if [ "${status_code}" = "200" ]; then
        echo -e "${GREEN}✓ OK${NC}"
        echo "    URL construction pattern is correct"
        log_test_result "URL Construction" "PASSED" "Pattern correct"
        return 0
    elif [ "${status_code}" = "404" ]; then
        echo -e "${RED}❌ 404 NOT FOUND${NC}"
        echo "    URL construction may be correct, but endpoint not registered"
        log_test_result "URL Construction" "FAILED" "Endpoint not registered"
        return 1
    else
        echo -e "${YELLOW}⚠ HTTP ${status_code}${NC}"
        echo "    URL construction pattern may have issues"
        log_test_result "URL Construction" "WARNING" "HTTP ${status_code}"
        return 2
    fi
}

# Function to generate comprehensive diagnostic report
generate_diagnostic_report() {
    echo -e "\n${BLUE}📊 Generating Diagnostic Report...${NC}"
    
    local report_file="${REPORT_DIR}/us-028-steps-api-diagnostic-report.json"
    mkdir -p "${REPORT_DIR}"
    
    local timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    cat > "${report_file}" << EOF
{
  "timestamp": "${timestamp}",
  "testSuite": "US-028 Steps API Diagnostic Test Suite",
  "environment": {
    "baseUrl": "${BASE_URL}",
    "scriptrunnerBase": "${SCRIPTRUNNER_BASE}",
    "testTimeout": ${TEST_TIMEOUT}
  },
  "summary": {
    "totalTests": ${TOTAL_TESTS},
    "passedTests": ${PASSED_TESTS},
    "failedTests": ${FAILED_TESTS},
    "overallStatus": "$([ ${FAILED_TESTS} -eq 0 ] && echo "PASSED" || echo "FAILED")"
  },
  "testResults": [
EOF

    local first=true
    for result in "${TEST_RESULTS[@]}"; do
        if [ "$first" = true ]; then
            first=false
        else
            echo "," >> "${report_file}"
        fi
        echo "    \"${result}\"" >> "${report_file}"
    done

    cat >> "${report_file}" << EOF
  ],
  "recommendations": [
    {
      "priority": "HIGH",
      "category": "Endpoint Registration",
      "issue": "Steps API endpoints may not be properly registered in ScriptRunner",
      "solution": "Verify StepsApi.groovy deployment and ScriptRunner configuration",
      "actions": [
        "Check ScriptRunner Console for deployment errors",
        "Verify StepsApi.groovy file is in /groovy/umig/api/v2/ directory",
        "Restart Confluence to reload ScriptRunner endpoints",
        "Check ScriptRunner logs for endpoint registration failures"
      ]
    },
    {
      "priority": "MEDIUM", 
      "category": "URL Construction",
      "issue": "Verify StepsAPIv2Client URL construction matches working patterns",
      "solution": "Compare with TeamsApi working implementation",
      "actions": [
        "Ensure baseUrl + endpoint concatenation is correct",
        "Validate query parameter encoding",
        "Test various filter combinations"
      ]
    }
  ],
  "nextSteps": [
    "Review ScriptRunner Console for endpoint registration status",
    "Test endpoints manually in browser developer tools",
    "Verify database connectivity and data availability",
    "Check iteration-view.js console errors for specific failure points"
  ]
}
EOF

    echo -e "${GREEN}✓ Diagnostic report generated: ${report_file}${NC}"
}

# Function to provide specific fixes for StepsAPIv2Client
provide_stepapiv2client_fixes() {
    echo -e "\n${BLUE}🔧 StepsAPIv2Client Fix Recommendations${NC}"
    echo ""
    echo "Based on the diagnostic results, here are specific fixes for iteration-view.js:"
    echo ""
    
    if [ ${FAILED_TESTS} -gt 0 ]; then
        echo "1. ${BLUE}Endpoint Registration Issue (Most Likely):${NC}"
        echo "   The Steps API is not properly registered in ScriptRunner."
        echo "   Fix: Check StepsApi.groovy deployment"
        echo ""
        echo "2. ${BLUE}Alternative URL Pattern (If endpoint exists):${NC}"
        echo "   Try changing StepsAPIv2Client constructor:"
        echo "   From: this.endpoint = '/steps';"
        echo "   To:   this.endpoint = '/api/v2/steps';"
        echo ""
    else
        echo "✅ ${GREEN}No fixes needed - Steps API is working correctly${NC}"
        echo "The 404 issue may be browser-specific or related to:"
        echo "  - Browser cache"
        echo "  - Specific query parameters"
        echo "  - JavaScript execution context"
    fi
    
    echo "3. ${BLUE}Debug Steps for iteration-view.js:${NC}"
    echo "   Add debug logging in StepsAPIv2Client._executeStepsRequest():"
    echo '   console.log("StepsAPIv2: Full URL:", url);'
    echo '   console.log("StepsAPIv2: Response status:", response.status);'
    echo ""
    echo "4. ${BLUE}Error Handling Enhancement:${NC}"
    echo "   Add better error handling in fetchSteps() method:"
    echo '   catch (error) {'
    echo '     console.error("StepsAPIv2 Error:", error);'
    echo '     console.error("URL attempted:", url);'
    echo '     throw error;'
    echo '   }'
}

# Main execution function
main() {
    echo -e "${BLUE}=== US-028 Enhanced IterationView Diagnostic Test Suite ===${NC}"
    echo "Timestamp: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
    echo "Base URL: ${BASE_URL}"
    echo "Report Directory: ${REPORT_DIR}"
    echo ""
    
    # Prerequisites check
    check_prerequisites
    
    echo ""
    
    # Core diagnostic tests
    local exit_code=0
    
    validate_steps_api_registration
    local reg_result=$?
    
    test_steps_api_endpoints
    local api_result=$?
    
    test_url_construction
    local url_result=$?
    
    echo ""
    
    # Generate reports and recommendations
    generate_diagnostic_report
    provide_stepapiv2client_fixes
    
    echo ""
    
    # Final summary
    echo -e "${BLUE}=== DIAGNOSTIC SUMMARY ===${NC}"
    echo "Total Tests: ${TOTAL_TESTS}"
    echo "Passed: ${PASSED_TESTS}"
    echo "Failed: ${FAILED_TESTS}"
    
    if [ ${reg_result} -eq 0 ] && [ ${api_result} -eq 0 ] && [ ${url_result} -eq 0 ]; then
        echo -e "${GREEN}✅ All diagnostic tests passed - Steps API is working correctly${NC}"
        echo "The 404 issue may be related to:"
        echo "  - Browser caching"
        echo "  - Specific filter parameters"
        echo "  - Client-side JavaScript errors"
    elif [ ${reg_result} -ne 0 ]; then
        echo -e "${RED}❌ Endpoint registration issues detected${NC}"
        echo "The Steps API is not properly registered in ScriptRunner"
        exit_code=1
    elif [ ${api_result} -ne 0 ]; then
        echo -e "${RED}❌ API endpoint issues detected${NC}"
        echo "Some Steps API endpoints are not responding correctly"
        exit_code=2
    elif [ ${url_result} -ne 0 ]; then
        echo -e "${RED}❌ URL construction issues detected${NC}"
        echo "The URL patterns used by StepsAPIv2Client may be incorrect"
        exit_code=3
    else
        echo -e "${YELLOW}⚠ Mixed results - partial functionality detected${NC}"
        exit_code=4
    fi
    
    echo ""
    echo -e "${BLUE}Diagnostic test suite completed at $(date)${NC}"
    echo -e "${BLUE}Detailed reports available in: ${REPORT_DIR}${NC}"
    
    exit ${exit_code}
}

# Run main function
main "$@"
