#!/bin/bash

###############################################################################
# UMIG API Smoke Test Suite
# Consolidated from multiple test files - provides comprehensive API testing
# Created: 2025-08-14
# Purpose: Single source of truth for all API endpoint testing
###############################################################################

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="http://localhost:8090/rest/scriptrunner/latest/custom"
CONTEXT_PATH=""
USERNAME="${CONFLUENCE_USER:-admin}"
PASSWORD="${CONFLUENCE_PASSWORD:-admin}"
LOG_FILE="logs/api-smoke-test-$(date +%Y%m%d_%H%M%S).log"
VERBOSE_MODE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --verbose|-v)
            VERBOSE_MODE=true
            shift
            ;;
        --endpoint)
            SPECIFIC_ENDPOINT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [options]"
            echo "Options:"
            echo "  -v, --verbose       Enable verbose output"
            echo "  --endpoint NAME     Test specific endpoint only"
            echo "  -h, --help         Show this help message"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Initialize logging
mkdir -p logs
echo "API Smoke Test Started at $(date)" > "$LOG_FILE"

# Helper functions
log_message() {
    echo "$1" | tee -a "$LOG_FILE"
}

log_verbose() {
    if [ "$VERBOSE_MODE" = true ]; then
        echo "$1" | tee -a "$LOG_FILE"
    else
        echo "$1" >> "$LOG_FILE"
    fi
}

print_header() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

test_endpoint() {
    local method="$1"
    local endpoint="$2"
    local description="$3"
    local data="$4"
    local expected_status="${5:-200}"
    
    log_verbose "Testing: $method $endpoint"
    
    local curl_opts="-s -w \n%{http_code} -u $USERNAME:$PASSWORD"
    
    if [ -n "$data" ]; then
        curl_opts="$curl_opts -H 'Content-Type: application/json' -d '$data'"
    fi
    
    response=$(eval "curl -X $method $curl_opts $BASE_URL$endpoint")
    http_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "  ${GREEN}✓${NC} $description"
        log_verbose "    Response: $body"
        return 0
    else
        echo -e "  ${RED}✗${NC} $description (Expected: $expected_status, Got: $http_code)"
        log_verbose "    Response: $body"
        return 1
    fi
}

analyze_error() {
    local endpoint="$1"
    local error="$2"
    
    echo -e "${YELLOW}  Diagnostic Analysis:${NC}"
    
    # Check if it's an authentication error
    if [[ "$error" == *"401"* ]] || [[ "$error" == *"Unauthorized"* ]]; then
        echo "    - Authentication failed. Check credentials."
        echo "    - Current user: $USERNAME"
    fi
    
    # Check if it's a ScriptRunner registration issue
    if [[ "$error" == *"404"* ]] || [[ "$error" == *"Not Found"* ]]; then
        echo "    - Endpoint may not be registered in ScriptRunner"
        echo "    - Check ScriptRunner script console for registration"
        
        # Try to get ScriptRunner registry info
        local registry_check=$(curl -s -u "$USERNAME:$PASSWORD" \
            "$BASE_URL/../../../plugins/servlet/scriptrunner/admin/console" 2>/dev/null || echo "")
        
        if [[ -n "$registry_check" ]]; then
            echo "    - ScriptRunner console is accessible"
        else
            echo "    - Cannot access ScriptRunner console - may need configuration"
        fi
    fi
    
    # Check for specific error patterns
    if [[ "$error" == *"Invalid comments endpoint"* ]]; then
        echo "    - Comments endpoint usage error detected"
        echo "    - Use: /steps/{stepInstanceId}/comments for step comments"
        echo "    - Or: /comments/{commentId} for specific comment operations"
    fi
}

# Main test execution
print_header "UMIG API Smoke Test Suite"

echo -e "\n${BLUE}Configuration:${NC}"
echo "  Base URL: $BASE_URL"
echo "  Username: $USERNAME"
echo "  Log File: $LOG_FILE"
echo ""

# Test categories
test_categories=(
    "health:Health & Status Endpoints"
    "users:User Management"
    "teams:Team Management"
    "steps:Steps API"
    "comments:Comments API"
    "migrations:Migration Management"
    "environments:Environment Configuration"
)

total_tests=0
passed_tests=0
failed_tests=0

for category_def in "${test_categories[@]}"; do
    IFS=':' read -r category title <<< "$category_def"
    
    # Skip if specific endpoint requested and doesn't match
    if [ -n "$SPECIFIC_ENDPOINT" ] && [ "$category" != "$SPECIFIC_ENDPOINT" ]; then
        continue
    fi
    
    print_header "$title"
    
    case $category in
        health)
            test_endpoint "GET" "/health" "Health check endpoint" "" 200 && ((passed_tests++)) || ((failed_tests++))
            ((total_tests++))
            
            # Database connectivity test
            echo -e "\n  ${BLUE}Database Connectivity:${NC}"
            db_check=$(PGPASSWORD=123456 psql -h localhost -p 5432 -U umig_app_user -d umig_app_db \
                -c "SELECT 'Connected' as status;" -t 2>/dev/null | tr -d ' ')
            if [ "$db_check" = "Connected" ]; then
                echo -e "    ${GREEN}✓${NC} PostgreSQL connection successful"
                ((passed_tests++))
            else
                echo -e "    ${RED}✗${NC} PostgreSQL connection failed"
                ((failed_tests++))
            fi
            ((total_tests++))
            ;;
            
        users)
            test_endpoint "GET" "/users" "List all users" "" 200 && ((passed_tests++)) || ((failed_tests++))
            ((total_tests++))
            test_endpoint "GET" "/users?limit=5" "List users with limit" "" 200 && ((passed_tests++)) || ((failed_tests++))
            ((total_tests++))
            ;;
            
        teams)
            test_endpoint "GET" "/teams" "List all teams" "" 200 && ((passed_tests++)) || ((failed_tests++))
            ((total_tests++))
            test_endpoint "GET" "/teams?includeMembers=true" "List teams with members" "" 200 && ((passed_tests++)) || ((failed_tests++))
            ((total_tests++))
            ;;
            
        steps)
            test_endpoint "GET" "/steps?limit=5" "List step instances" "" 200 && ((passed_tests++)) || ((failed_tests++))
            ((total_tests++))
            test_endpoint "GET" "/steps/master" "List master steps" "" 200 && ((passed_tests++)) || ((failed_tests++))
            ((total_tests++))
            
            # Get a step ID for testing
            step_id=$(curl -s -u "$USERNAME:$PASSWORD" "$BASE_URL/steps?limit=1" | \
                python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('data',[{}])[0].get('sti_id',''))" 2>/dev/null)
            
            if [ -n "$step_id" ] && [ "$step_id" != "" ]; then
                test_endpoint "GET" "/steps/$step_id" "Get step instance details" "" 200 && ((passed_tests++)) || ((failed_tests++))
                ((total_tests++))
                test_endpoint "GET" "/steps/$step_id/comments" "Get step comments" "" 200 && ((passed_tests++)) || ((failed_tests++))
                ((total_tests++))
            fi
            ;;
            
        comments)
            # Test improved error messages
            echo -e "\n  ${BLUE}Testing Error Message Improvements:${NC}"
            
            response=$(curl -s -u "$USERNAME:$PASSWORD" "$BASE_URL/comments" 2>/dev/null || echo "{}")
            if echo "$response" | grep -q "Invalid comments endpoint usage"; then
                echo -e "    ${GREEN}✓${NC} GET /comments shows improved error message"
                ((passed_tests++))
            else
                echo -e "    ${RED}✗${NC} GET /comments missing improved error message"
                ((failed_tests++))
            fi
            ((total_tests++))
            
            response=$(curl -s -X POST -u "$USERNAME:$PASSWORD" \
                -H "Content-Type: application/json" \
                -d '{"body":"test"}' \
                "$BASE_URL/comments" 2>/dev/null || echo "{}")
            if echo "$response" | grep -q "Invalid comments endpoint usage"; then
                echo -e "    ${GREEN}✓${NC} POST /comments shows improved error message"
                ((passed_tests++))
            else
                echo -e "    ${RED}✗${NC} POST /comments missing improved error message"
                ((failed_tests++))
            fi
            ((total_tests++))
            ;;
            
        migrations)
            test_endpoint "GET" "/migrations" "List migrations" "" 200 && ((passed_tests++)) || ((failed_tests++))
            ((total_tests++))
            ;;
            
        environments)
            test_endpoint "GET" "/environments" "List environments" "" 200 && ((passed_tests++)) || ((failed_tests++))
            ((total_tests++))
            ;;
    esac
done

# Summary
print_header "Test Summary"

success_rate=0
if [ $total_tests -gt 0 ]; then
    success_rate=$((passed_tests * 100 / total_tests))
fi

echo -e "\nResults:"
echo -e "  Total Tests: $total_tests"
echo -e "  ${GREEN}Passed: $passed_tests${NC}"
echo -e "  ${RED}Failed: $failed_tests${NC}"
echo -e "  Success Rate: ${success_rate}%"

if [ $failed_tests -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed successfully!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed. Check $LOG_FILE for details.${NC}"
    exit 1
fi