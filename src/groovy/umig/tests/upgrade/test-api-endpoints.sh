#!/bin/bash

# API Endpoints Validation Test
# Tests REST API endpoints to ensure they respond correctly after upgrade

set -euo pipefail

readonly SCRIPT_NAME="$(basename "${0}")"
readonly YELLOW='\033[1;33m'
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly NC='\033[0m' # No Color

# Configuration
readonly CONFLUENCE_BASE="http://localhost:8090/confluence"
readonly UMIG_API_BASE="${CONFLUENCE_BASE}/rest/scriptrunner/latest/custom"
readonly CONFLUENCE_API_BASE="${CONFLUENCE_BASE}/rest/api"
readonly TIMEOUT=10
readonly MAX_RETRIES=3

log() {
    echo -e "${YELLOW}[${SCRIPT_NAME}]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}✅ $1${NC}" >&2
}

error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

# Helper function to make HTTP requests with retries
http_request() {
    local url="$1"
    local expected_status="${2:-200}"
    local method="${3:-GET}"
    local retry_count=0
    
    while [ $retry_count -lt $MAX_RETRIES ]; do
        local response
        local status_code
        
        if response=$(curl -s -w "\n%{http_code}" --connect-timeout $TIMEOUT -X "$method" "$url" 2>/dev/null); then
            status_code=$(echo "$response" | tail -n1)
            local body=$(echo "$response" | head -n -1)
            
            if [ "$status_code" = "$expected_status" ]; then
                echo "$body"
                return 0
            fi
        fi
        
        ((retry_count++))
        if [ $retry_count -lt $MAX_RETRIES ]; then
            sleep 2
        fi
    done
    
    return 1
}

# Test 1: Confluence Base Connectivity
test_confluence_base() {
    log "Testing Confluence base connectivity..."
    local failed=0
    
    # Test Confluence login page (should return 200)
    if http_request "${CONFLUENCE_BASE}/login.action" 200 >/dev/null; then
        success "Confluence login page is accessible"
    else
        error "Confluence login page is not accessible"
        ((failed++))
    fi
    
    # Test Confluence status page
    if http_request "${CONFLUENCE_BASE}/status" 200 >/dev/null; then
        success "Confluence status endpoint is accessible"
    else
        error "Confluence status endpoint is not accessible"
        ((failed++))
    fi
    
    return $failed
}

# Test 2: Confluence REST API
test_confluence_rest_api() {
    log "Testing Confluence REST API endpoints..."
    local failed=0
    
    # Test API info endpoint (anonymous access)
    if response=$(http_request "${CONFLUENCE_API_BASE}/content" 200); then
        success "Confluence REST API is accessible"
        
        # Verify JSON response structure
        if echo "$response" | grep -q '"results"'; then
            success "Confluence API returns valid JSON structure"
        else
            error "Confluence API response format is invalid"
            ((failed++))
        fi
    else
        error "Confluence REST API is not accessible"
        ((failed++))
    fi
    
    # Test API spaces endpoint
    if http_request "${CONFLUENCE_API_BASE}/space" 200 >/dev/null; then
        success "Confluence spaces API is accessible"
    else
        error "Confluence spaces API is not accessible"
        ((failed++))
    fi
    
    return $failed
}

# Test 3: ScriptRunner REST Endpoint Base
test_scriptrunner_base() {
    log "Testing ScriptRunner base endpoint..."
    local failed=0
    
    # Test ScriptRunner custom endpoint root
    # This should return either 200 with a list or 404 (which is also acceptable for root)
    local status_code
    if status_code=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT "${UMIG_API_BASE}/" -o /dev/null 2>/dev/null); then
        if [[ "$status_code" =~ ^(200|404|405)$ ]]; then
            success "ScriptRunner custom endpoint base is accessible (HTTP $status_code)"
        else
            error "ScriptRunner endpoint returned unexpected status: $status_code"
            ((failed++))
        fi
    else
        error "ScriptRunner custom endpoint base is not accessible"
        ((failed++))
    fi
    
    return $failed
}

# Test 4: UMIG Core API Endpoints
test_umig_core_apis() {
    log "Testing UMIG core API endpoints..."
    local failed=0
    
    # Define core UMIG endpoints to test
    local endpoints=(
        "steps"
        "teams"
        "users"
        "environments"
        "applications"
        "labels"
        "migrations"
        "plans"
        "sequences"
        "phases"
        "instructions"
    )
    
    for endpoint in "${endpoints[@]}"; do
        local url="${UMIG_API_BASE}/${endpoint}"
        
        # For UMIG APIs, we expect either 200 (success) or 401/403 (auth required)
        local status_code
        if status_code=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT "$url" -o /dev/null 2>/dev/null); then
            if [[ "$status_code" =~ ^(200|401|403)$ ]]; then
                success "UMIG ${endpoint} API is accessible (HTTP $status_code)"
            else
                error "UMIG ${endpoint} API returned unexpected status: $status_code"
                ((failed++))
            fi
        else
            error "UMIG ${endpoint} API is not accessible"
            ((failed++))
        fi
    done
    
    return $failed
}

# Test 5: UMIG API Response Format
test_umig_api_format() {
    log "Testing UMIG API response formats..."
    local failed=0
    
    # Test a specific endpoint that should return JSON
    # Using teams endpoint as it's likely to have data and be accessible
    if response=$(http_request "${UMIG_API_BASE}/teams" 200 2>/dev/null || http_request "${UMIG_API_BASE}/teams" 401 2>/dev/null); then
        if echo "$response" | grep -q -E '(\[|\{).*(\]|\})' || echo "$response" | grep -q -i "authentication\|authorization"; then
            success "UMIG teams API returns expected format"
        else
            error "UMIG teams API response format is unexpected"
            ((failed++))
        fi
    else
        # Try with a different endpoint if teams fails
        if response=$(http_request "${UMIG_API_BASE}/labels" 200 2>/dev/null || http_request "${UMIG_API_BASE}/labels" 401 2>/dev/null); then
            success "UMIG labels API is responding (alternative test)"
        else
            error "Cannot validate UMIG API response format"
            ((failed++))
        fi
    fi
    
    return $failed
}

# Test 6: API Performance
test_api_performance() {
    log "Testing API performance..."
    local failed=0
    
    # Measure response time for key endpoints
    local start_time
    local end_time
    local duration
    
    # Test Confluence API performance
    start_time=$(date +%s%N)
    if http_request "${CONFLUENCE_API_BASE}/content" 200 >/dev/null; then
        end_time=$(date +%s%N)
        duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds
        
        if [ $duration -lt 5000 ]; then # Less than 5 seconds
            success "Confluence API responded in ${duration}ms (acceptable)"
        else
            error "Confluence API took ${duration}ms (slow performance)"
            ((failed++))
        fi
    else
        error "Cannot measure Confluence API performance"
        ((failed++))
    fi
    
    # Test UMIG API performance (just connection time)
    start_time=$(date +%s%N)
    curl -s --connect-timeout $TIMEOUT "${UMIG_API_BASE}/teams" -o /dev/null 2>/dev/null
    local curl_exit=$?
    end_time=$(date +%s%N)
    duration=$(( (end_time - start_time) / 1000000 ))
    
    if [ $curl_exit -eq 0 ] && [ $duration -lt 3000 ]; then
        success "UMIG API connection time: ${duration}ms (acceptable)"
    else
        if [ $curl_exit -ne 0 ]; then
            error "UMIG API connection failed"
        else
            error "UMIG API connection took ${duration}ms (slow)"
        fi
        ((failed++))
    fi
    
    return $failed
}

# Test 7: Check for Confluence 9.2.7 specific features
test_confluence_version_features() {
    log "Testing Confluence 9.2.7 specific features..."
    local failed=0
    
    # Check if the new content API v2 endpoints are available
    if status_code=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT "${CONFLUENCE_API_BASE}/v2/pages" -o /dev/null 2>/dev/null); then
        if [[ "$status_code" =~ ^(200|401|403)$ ]]; then
            success "Confluence API v2 endpoints are available"
        else
            # This might be expected if v2 isn't fully available yet
            log "Confluence API v2 returned status: $status_code (may be expected)"
        fi
    fi
    
    # Verify that deprecated endpoints still work (for backward compatibility)
    if http_request "${CONFLUENCE_API_BASE}/content?limit=1" 200 >/dev/null; then
        success "Legacy Confluence API endpoints still functional"
    else
        error "Legacy Confluence API endpoints not working"
        ((failed++))
    fi
    
    return $failed
}

# Main test execution
main() {
    log "Starting API endpoints validation tests..."
    local total_failed=0
    
    echo "=========================================="
    echo "🌐 API Endpoints Validation Tests"
    echo "=========================================="
    echo
    
    # Run all tests
    test_confluence_base || ((total_failed++))
    echo
    
    test_confluence_rest_api || ((total_failed++))
    echo
    
    test_scriptrunner_base || ((total_failed++))
    echo
    
    test_umig_core_apis || ((total_failed++))
    echo
    
    test_umig_api_format || ((total_failed++))
    echo
    
    test_api_performance || ((total_failed++))
    echo
    
    test_confluence_version_features || ((total_failed++))
    echo
    
    # Summary
    echo "=========================================="
    if [ $total_failed -eq 0 ]; then
        success "All API endpoint tests PASSED ✨"
        echo "REST APIs are ready for Confluence 9.2.7"
        exit 0
    else
        error "${total_failed} test group(s) FAILED ❌"
        echo "Please review API endpoint issues before proceeding"
        exit 1
    fi
}

# Ensure required tools are available
command -v curl >/dev/null 2>&1 || { error "curl is required but not installed"; exit 1; }

main "$@"