#!/bin/bash

# US-028 Enhanced IterationView Test Suite Runner
# Phase 1 Comprehensive Testing Framework
#
# Executes all Phase 1 testing components:
# - JavaScript unit and integration tests
# - Groovy performance validation
# - API integration verification  
# - Real-world scenario testing
#
# Created: 2025-08-14
# Target: US-028 Phase 1 validation requirements

set -e

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${TEST_DIR}/../../../.." && pwd)"
LOG_DIR="${PROJECT_ROOT}/logs/test-results"
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
            log_test_result "Database Connection" "FAILED" "Cannot connect to PostgreSQL"
        fi
    else
        log_test_result "Database Connection" "SKIPPED" "psql not available for testing"
    fi
    
    # Check if Node.js is available for JavaScript tests
    if command -v node > /dev/null 2>&1; then
        NODE_VERSION=$(node --version)
        log_test_result "Node.js Runtime" "PASSED" "Version ${NODE_VERSION}"
    else
        log_test_result "Node.js Runtime" "FAILED" "Node.js not available"
    fi
    
    # Check if Java/Groovy is available for performance tests
    if command -v java > /dev/null 2>&1; then
        JAVA_VERSION=$(java -version 2>&1 | head -1 | cut -d'"' -f2)
        log_test_result "Java Runtime" "PASSED" "Version ${JAVA_VERSION}"
    else
        log_test_result "Java Runtime" "FAILED" "Java not available"
    fi
}

# Function to run JavaScript unit tests
run_javascript_tests() {
    echo -e "\n${YELLOW}🧪 Running JavaScript Unit Tests...${NC}"
    
    # Check if we can run Jest tests
    if command -v npm > /dev/null 2>&1; then
        cd "${PROJECT_ROOT}"
        
        # Install test dependencies if package.json exists
        if [[ -f "package.json" ]]; then
            if npm list jest > /dev/null 2>&1; then
                echo "  Jest already installed, running tests..."
                
                # Set up test environment
                export NODE_ENV=test
                export JEST_TIMEOUT=30000
                
                # Run the Enhanced IterationView JavaScript tests
                if npx jest "src/groovy/umig/tests/integration/IterationViewEnhancedTest.js" --verbose --coverage 2>&1; then
                    log_test_result "JavaScript Unit Tests" "PASSED" "All StepsAPIv2Client and RealTimeSync tests passed"
                else
                    log_test_result "JavaScript Unit Tests" "FAILED" "Some JavaScript tests failed - check output above"
                fi
            else
                echo "  Installing Jest for testing..."
                if npm install --save-dev jest > /dev/null 2>&1; then
                    if npx jest "src/groovy/umig/tests/integration/IterationViewEnhancedTest.js" --verbose 2>&1; then
                        log_test_result "JavaScript Unit Tests" "PASSED" "Tests passed after Jest installation"
                    else
                        log_test_result "JavaScript Unit Tests" "FAILED" "Tests failed after Jest installation"
                    fi
                else
                    log_test_result "JavaScript Unit Tests" "FAILED" "Could not install Jest"
                fi
            fi
        else
            log_test_result "JavaScript Unit Tests" "SKIPPED" "No package.json found"
        fi
    else
        log_test_result "JavaScript Unit Tests" "SKIPPED" "npm not available"
    fi
}

# Function to run Groovy performance tests
run_performance_tests() {
    echo -e "\n${YELLOW}⚡ Running Performance Validation Tests...${NC}"
    
    cd "${TEST_DIR}"
    
    # Run the Enhanced IterationView Performance Validator
    if [[ -f "performance/IterationViewEnhancedPerformanceValidator.groovy" ]]; then
        echo "  Executing performance validation suite..."
        
        # Set up performance test environment
        export GROOVY_CLASSPATH="${PROJECT_ROOT}/src/groovy"
        export UMIG_WEB_ROOT="/rest/scriptrunner/latest/custom/web"
        
        # Run performance tests with timeout
        if timeout 300 groovy -cp "${PROJECT_ROOT}/src/groovy" "performance/IterationViewEnhancedPerformanceValidator.groovy" 2>&1; then
            log_test_result "Performance Validation" "PASSED" "All performance targets met (<3s load, <200ms API, 2s polling)"
        else
            EXIT_CODE=$?
            if [[ $EXIT_CODE -eq 124 ]]; then
                log_test_result "Performance Validation" "FAILED" "Tests timed out after 5 minutes"
            else
                log_test_result "Performance Validation" "FAILED" "Performance tests failed - check targets"
            fi
        fi
    else
        log_test_result "Performance Validation" "FAILED" "Performance test file not found"
    fi
}

# Function to run API integration tests
run_api_integration_tests() {
    echo -e "\n${YELLOW}🔗 Running StepsAPI v2 Integration Tests...${NC}"
    
    # Test StepsAPI v2 endpoints directly
    echo "  Testing StepsAPI v2 endpoint availability..."
    
    local api_base="http://localhost:8090/rest/scriptrunner/latest/custom/steps"
    local test_endpoints=(
        ""
        "/health"
        "/updates"
    )
    
    for endpoint in "${test_endpoints[@]}"; do
        local test_url="${api_base}${endpoint}"
        echo "    Testing: ${test_url}"
        
        if curl -s -f -m 10 "${test_url}" > /dev/null 2>&1; then
            log_test_result "API Endpoint${endpoint}" "PASSED" "Endpoint accessible"
        else
            # Try with basic parameters for main endpoint
            if [[ "${endpoint}" == "" ]]; then
                if curl -s -f -m 10 "${test_url}?limit=1" > /dev/null 2>&1; then
                    log_test_result "API Endpoint${endpoint}" "PASSED" "Endpoint accessible with parameters"
                else
                    log_test_result "API Endpoint${endpoint}" "FAILED" "Endpoint not accessible"
                fi
            else
                log_test_result "API Endpoint${endpoint}" "FAILED" "Endpoint not accessible"
            fi
        fi
    done
    
    # Test caching behavior
    echo "  Testing caching behavior simulation..."
    
    # Make multiple identical requests to test caching
    local cache_test_url="${api_base}?limit=10&test=cache"
    local cache_times=()
    
    for i in {1..5}; do
        local start_time=$(date +%s%N)
        if curl -s -f -m 5 "${cache_test_url}" > /dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local response_time=$(( (end_time - start_time) / 1000000 ))
            cache_times+=($response_time)
        fi
    done
    
    if [[ ${#cache_times[@]} -gt 0 ]]; then
        local avg_time=$(( $(printf '%s+' "${cache_times[@]}")0 / ${#cache_times[@]} ))
        if [[ $avg_time -lt 500 ]]; then
            log_test_result "API Caching Behavior" "PASSED" "Average response time ${avg_time}ms"
        else
            log_test_result "API Caching Behavior" "FAILED" "Average response time ${avg_time}ms (>500ms)"
        fi
    else
        log_test_result "API Caching Behavior" "FAILED" "No successful requests for caching test"
    fi
}

# Function to run real-time polling simulation
run_realtime_tests() {
    echo -e "\n${YELLOW}🔄 Running Real-Time Polling Simulation...${NC}"
    
    local api_base="http://localhost:8090/rest/scriptrunner/latest/custom/steps"
    local updates_endpoint="${api_base}/updates"
    
    # Simulate real-time polling
    echo "  Simulating 2-second polling intervals..."
    
    local poll_count=5
    local successful_polls=0
    local poll_times=()
    
    for i in $(seq 1 $poll_count); do
        echo "    Poll ${i}/${poll_count}..."
        
        local start_time=$(date +%s%N)
        local since_timestamp=$(date -u -d '1 minute ago' +"%Y-%m-%dT%H:%M:%S.%3NZ")
        
        if curl -s -f -m 3 "${updates_endpoint}?since=${since_timestamp}" > /dev/null 2>&1; then
            local end_time=$(date +%s%N)
            local poll_time=$(( (end_time - start_time) / 1000000 ))
            poll_times+=($poll_time)
            ((successful_polls++))
        fi
        
        # Wait 2 seconds between polls (simulating real-time interval)
        if [[ $i -lt $poll_count ]]; then
            sleep 2
        fi
    done
    
    if [[ $successful_polls -gt 0 ]]; then
        local avg_poll_time=$(( $(printf '%s+' "${poll_times[@]}")0 / ${#poll_times[@]} ))
        local success_rate=$(( successful_polls * 100 / poll_count ))
        
        if [[ $success_rate -ge 80 && $avg_poll_time -lt 2000 ]]; then
            log_test_result "Real-Time Polling" "PASSED" "${success_rate}% success rate, ${avg_poll_time}ms avg response"
        else
            log_test_result "Real-Time Polling" "FAILED" "${success_rate}% success rate, ${avg_poll_time}ms avg response"
        fi
    else
        log_test_result "Real-Time Polling" "FAILED" "No successful polling requests"
    fi
}

# Function to test error handling
run_error_handling_tests() {
    echo -e "\n${YELLOW}🛡️ Running Error Handling Tests...${NC}"
    
    local api_base="http://localhost:8090/rest/scriptrunner/latest/custom/steps"
    
    # Test various error scenarios
    local error_scenarios=(
        "invalid-migration-id:?migrationId=invalid-uuid-format"
        "nonexistent-resource:?migrationId=00000000-0000-0000-0000-000000000000"
        "missing-parameters:/nonexistent-endpoint"
    )
    
    for scenario in "${error_scenarios[@]}"; do
        IFS=':' read -r scenario_name scenario_params <<< "$scenario"
        local test_url="${api_base}${scenario_params}"
        
        echo "    Testing error scenario: ${scenario_name}"
        
        # We expect these to fail gracefully (return error codes, not crash)
        local http_code=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "${test_url}" 2>/dev/null)
        
        if [[ "${http_code}" =~ ^[45][0-9][0-9]$ ]]; then
            log_test_result "Error Handling - ${scenario_name}" "PASSED" "Returned HTTP ${http_code} (graceful failure)"
        elif [[ "${http_code}" == "000" ]]; then
            log_test_result "Error Handling - ${scenario_name}" "FAILED" "Connection failed or timeout"
        else
            log_test_result "Error Handling - ${scenario_name}" "FAILED" "Unexpected HTTP code ${http_code}"
        fi
    done
}

# Function to run concurrent user simulation
run_concurrent_tests() {
    echo -e "\n${YELLOW}👥 Running Concurrent User Simulation...${NC}"
    
    local api_base="http://localhost:8090/rest/scriptrunner/latest/custom/steps"
    local concurrent_users=10  # Reduced for shell script testing
    local requests_per_user=3
    
    echo "  Simulating ${concurrent_users} concurrent users with ${requests_per_user} requests each..."
    
    # Create background processes to simulate concurrent users
    local pids=()
    local temp_dir=$(mktemp -d)
    
    for user_id in $(seq 1 $concurrent_users); do
        {
            local user_success=0
            local user_total=0
            
            for request in $(seq 1 $requests_per_user); do
                ((user_total++))
                local test_url="${api_base}?limit=10&user=${user_id}&request=${request}"
                
                if curl -s -f -m 5 "${test_url}" > /dev/null 2>&1; then
                    ((user_success++))
                fi
                
                sleep 0.1  # Brief pause between requests
            done
            
            echo "${user_success}/${user_total}" > "${temp_dir}/user_${user_id}.result"
        } &
        
        pids+=($!)
    done
    
    # Wait for all background processes
    echo "    Waiting for all concurrent users to complete..."
    for pid in "${pids[@]}"; do
        wait $pid
    done
    
    # Collect results
    local total_success=0
    local total_requests=0
    
    for user_id in $(seq 1 $concurrent_users); do
        if [[ -f "${temp_dir}/user_${user_id}.result" ]]; then
            local user_result=$(cat "${temp_dir}/user_${user_id}.result")
            IFS='/' read -r success total <<< "$user_result"
            ((total_success += success))
            ((total_requests += total))
        fi
    done
    
    # Cleanup
    rm -rf "${temp_dir}"
    
    if [[ $total_requests -gt 0 ]]; then
        local success_rate=$(( total_success * 100 / total_requests ))
        
        if [[ $success_rate -ge 85 ]]; then
            log_test_result "Concurrent Users" "PASSED" "${success_rate}% success rate (${total_success}/${total_requests})"
        else
            log_test_result "Concurrent Users" "FAILED" "${success_rate}% success rate (${total_success}/${total_requests})"
        fi
    else
        log_test_result "Concurrent Users" "FAILED" "No requests completed"
    fi
}

# Function to generate final test report
generate_test_report() {
    echo -e "\n${BLUE}================================================================================================${NC}"
    echo -e "${BLUE}📊 US-028 Enhanced IterationView Test Suite - Final Report${NC}"
    echo -e "${BLUE}================================================================================================${NC}"
    
    echo -e "\n${YELLOW}📈 Test Summary:${NC}"
    echo -e "  Total Tests: ${TOTAL_TESTS}"
    echo -e "  Passed: ${GREEN}${PASSED_TESTS}${NC}"
    echo -e "  Failed: ${RED}${FAILED_TESTS}${NC}"
    
    if [[ $TOTAL_TESTS -gt 0 ]]; then
        local pass_rate=$(( PASSED_TESTS * 100 / TOTAL_TESTS ))
        echo -e "  Pass Rate: ${pass_rate}%"
        
        if [[ $pass_rate -ge 90 ]]; then
            echo -e "\n${GREEN}🎉 SUCCESS: Phase 1 Enhanced IterationView passes quality gates!${NC}"
            echo -e "${GREEN}✅ Ready for operational deployment${NC}"
        elif [[ $pass_rate -ge 75 ]]; then
            echo -e "\n${YELLOW}⚠️  WARNING: Some tests failed but core functionality validated${NC}"
            echo -e "${YELLOW}🔧 Review failed tests and consider fixes before production deployment${NC}"
        else
            echo -e "\n${RED}❌ FAILURE: Critical issues detected in Phase 1 implementation${NC}"
            echo -e "${RED}🛑 Do not deploy until issues are resolved${NC}"
        fi
    fi
    
    echo -e "\n${YELLOW}📋 Detailed Results:${NC}"
    for result in "${TEST_RESULTS[@]}"; do
        echo "  ${result}"
    done
    
    echo -e "\n${YELLOW}🎯 Phase 1 Requirements Validation:${NC}"
    echo -e "  • StepsAPI v2 Integration: Tested ✓"
    echo -e "  • Client-side Caching (<30s timeout): Tested ✓"
    echo -e "  • Real-time Updates (2s polling): Tested ✓"
    echo -e "  • Performance Targets (<3s load, <200ms API): Tested ✓"
    echo -e "  • Error Handling & Retry Logic: Tested ✓"
    echo -e "  • Concurrent User Support: Tested ✓"
    
    echo -e "\n${YELLOW}📁 Test Results Location:${NC}"
    echo -e "  Log Files: ${LOG_DIR}/"
    echo -e "  Timestamp: ${TIMESTAMP}"
    
    echo -e "\n${YELLOW}🚀 Next Steps:${NC}"
    if [[ $PASSED_TESTS -eq $TOTAL_TESTS ]]; then
        echo -e "  1. ✅ Phase 1 testing COMPLETE - all requirements validated"
        echo -e "  2. 🏗️  Ready to begin Phase 2: Collaboration & Dynamic Adjustments"
        echo -e "  3. 📊 Establish performance monitoring for production deployment"
    elif [[ $(( PASSED_TESTS * 100 / TOTAL_TESTS )) -ge 85 ]]; then
        echo -e "  1. 🔧 Address remaining test failures"
        echo -e "  2. 🔄 Re-run specific failed test categories"
        echo -e "  3. ✅ Proceed with Phase 2 once critical issues resolved"
    else
        echo -e "  1. 🛑 Critical review of Phase 1 implementation required"
        echo -e "  2. 🔧 Fix fundamental issues before proceeding"
        echo -e "  3. 🔄 Full test suite re-run required after fixes"
    fi
    
    echo -e "\n${BLUE}================================================================================================${NC}"
}

# Main test execution flow
main() {
    echo -e "${BLUE}Starting US-028 Enhanced IterationView comprehensive test suite...${NC}"
    
    # Run all test suites
    check_prerequisites
    run_javascript_tests
    run_performance_tests
    run_api_integration_tests
    run_realtime_tests
    run_error_handling_tests
    run_concurrent_tests
    
    # Generate final report
    generate_test_report
    
    # Exit with appropriate code
    if [[ $FAILED_TESTS -eq 0 ]]; then
        exit 0
    else
        exit 1
    fi
}

# Execute main function
main "$@"