#!/bin/bash

# Master Test Runner for Confluence 9.2.7 Upgrade Validation
# Executes all validation tests in sequence and provides comprehensive results

set -euo pipefail

readonly SCRIPT_NAME="$(basename "${0}")"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly YELLOW='\033[1;33m'
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly BOLD='\033[1m'
readonly NC='\033[0m' # No Color

# Configuration
readonly TESTS_DIR="$SCRIPT_DIR"
readonly LOG_DIR="$SCRIPT_DIR/logs"
readonly TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
readonly FULL_LOG="$LOG_DIR/upgrade_validation_$TIMESTAMP.log"

log() {
    echo -e "${YELLOW}[${SCRIPT_NAME}]${NC} $1" >&2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$FULL_LOG"
}

success() {
    echo -e "${GREEN}✅ $1${NC}" >&2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] SUCCESS: $1" >> "$FULL_LOG"
}

error() {
    echo -e "${RED}❌ $1${NC}" >&2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >> "$FULL_LOG"
}

info() {
    echo -e "${BLUE}ℹ️  $1${NC}" >&2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] INFO: $1" >> "$FULL_LOG"
}

header() {
    echo -e "${BOLD}${CYAN}$1${NC}" >&2
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] HEADER: $1" >> "$FULL_LOG"
}

# Test definitions
declare -A TESTS=(
    ["container-health"]="Container Health & Connectivity"
    ["database-connectivity"]="Database Connections"
    ["api-endpoints"]="REST API Endpoints"
    ["scriptrunner"]="ScriptRunner Functionality"
)

# Test execution order
readonly TEST_ORDER=("container-health" "database-connectivity" "scriptrunner" "api-endpoints")

# Initialize logging
setup_logging() {
    mkdir -p "$LOG_DIR"
    echo "Confluence 9.2.7 Upgrade Validation Test Suite" > "$FULL_LOG"
    echo "Started: $(date)" >> "$FULL_LOG"
    echo "=========================================" >> "$FULL_LOG"
}

# Pre-flight checks
preflight_checks() {
    log "Running pre-flight checks..."
    local failed=0
    
    # Check if test scripts exist
    for test_key in "${TEST_ORDER[@]}"; do
        local script_path="$TESTS_DIR/test-${test_key}.sh"
        if [ ! -f "$script_path" ]; then
            error "Test script not found: $script_path"
            ((failed++))
        elif [ ! -x "$script_path" ]; then
            error "Test script not executable: $script_path"
            ((failed++))
        fi
    done
    
    # Check if containers are running
    local required_containers=("umig_confluence" "umig_postgres" "umig_mailhog")
    for container in "${required_containers[@]}"; do
        if ! podman ps --format "{{.Names}}" | grep -q "^${container}$"; then
            error "Required container not running: $container"
            ((failed++))
        fi
    done
    
    # Check basic connectivity
    if ! curl -s --connect-timeout 5 "http://localhost:8090" >/dev/null 2>&1; then
        error "Confluence is not accessible at http://localhost:8090"
        ((failed++))
    fi
    
    if [ $failed -gt 0 ]; then
        error "Pre-flight checks failed. Please ensure the environment is running."
        return 1
    fi
    
    success "Pre-flight checks passed"
    return 0
}

# Execute a single test
execute_test() {
    local test_key="$1"
    local test_name="${TESTS[$test_key]}"
    local script_path="$TESTS_DIR/test-${test_key}.sh"
    local test_log="$LOG_DIR/test-${test_key}_${TIMESTAMP}.log"
    
    header "Running: $test_name"
    log "Executing: $script_path"
    
    local start_time=$(date +%s)
    local exit_code=0
    
    # Execute test and capture output
    if bash "$script_path" > "$test_log" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        success "$test_name completed in ${duration}s"
        
        # Show summary from test output
        if grep -q "✅.*PASSED" "$test_log"; then
            local passed_msg=$(grep "✅.*PASSED" "$test_log" | tail -1 | sed 's/.*✅//' | xargs)
            info "$passed_msg"
        fi
        
        return 0
    else
        exit_code=$?
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        error "$test_name failed in ${duration}s (exit code: $exit_code)"
        
        # Show error summary from test output
        if grep -q "❌.*FAILED" "$test_log"; then
            local failed_msg=$(grep "❌.*FAILED" "$test_log" | tail -1 | sed 's/.*❌//' | xargs)
            error "$failed_msg"
        fi
        
        # Show last few lines of test output for debugging
        log "Last 5 lines of test output:"
        tail -5 "$test_log" >> "$FULL_LOG"
        
        return $exit_code
    fi
}

# Generate detailed report
generate_report() {
    local total_tests="$1"
    local passed_tests="$2"
    local failed_tests="$3"
    local start_time="$4"
    local end_time="$5"
    
    local duration=$((end_time - start_time))
    local report_file="$LOG_DIR/upgrade_validation_report_${TIMESTAMP}.md"
    
    cat > "$report_file" << EOF
# Confluence 9.2.7 Upgrade Validation Report

**Generated:** $(date)  
**Duration:** ${duration}s  
**Total Tests:** $total_tests  
**Passed:** $passed_tests  
**Failed:** $failed_tests  

## Test Results Summary

EOF
    
    for test_key in "${TEST_ORDER[@]}"; do
        local test_name="${TESTS[$test_key]}"
        local test_log="$LOG_DIR/test-${test_key}_${TIMESTAMP}.log"
        
        echo "### $test_name" >> "$report_file"
        
        if [ -f "$test_log" ] && grep -q "✅.*PASSED" "$test_log"; then
            echo "**Status:** ✅ PASSED" >> "$report_file"
            # Extract key success metrics
            if grep -q "✅" "$test_log"; then
                echo "" >> "$report_file"
                echo "**Details:**" >> "$report_file"
                grep "✅" "$test_log" | head -10 | sed 's/^/- /' | sed 's/✅//' >> "$report_file"
            fi
        else
            echo "**Status:** ❌ FAILED" >> "$report_file"
            # Extract key failure information
            if [ -f "$test_log" ] && grep -q "❌" "$test_log"; then
                echo "" >> "$report_file"
                echo "**Issues:**" >> "$report_file"
                grep "❌" "$test_log" | head -5 | sed 's/^/- /' | sed 's/❌//' >> "$report_file"
            fi
        fi
        
        echo "" >> "$report_file"
    done
    
    cat >> "$report_file" << EOF

## Environment Information

- **Confluence Version:** Targeting 9.2.7
- **Container Runtime:** Podman
- **Database:** PostgreSQL 14-alpine
- **Test Suite Version:** $(date +"%Y.%m.%d")

## Recommendations

EOF
    
    if [ $failed_tests -eq 0 ]; then
        cat >> "$report_file" << EOF
✅ **All tests passed!** The environment is ready for Confluence 9.2.7 upgrade.

**Next Steps:**
1. Proceed with the upgrade process
2. Monitor the upgrade logs
3. Re-run this validation after upgrade completion
EOF
    else
        cat >> "$report_file" << EOF
❌ **$failed_tests test(s) failed.** Please resolve issues before proceeding.

**Next Steps:**
1. Review failed test logs in \`$LOG_DIR\`
2. Address the identified issues
3. Re-run the validation suite
4. Only proceed with upgrade after all tests pass
EOF
    fi
    
    info "Detailed report generated: $report_file"
}

# Display final summary
display_summary() {
    local total_tests="$1"
    local passed_tests="$2"
    local failed_tests="$3"
    local duration="$4"
    
    echo
    echo "==========================================="
    header "🎯 CONFLUENCE 9.2.7 UPGRADE VALIDATION SUMMARY"
    echo "==========================================="
    echo
    
    info "Test Suite Execution Time: ${duration}s"
    info "Total Tests: $total_tests"
    
    if [ $passed_tests -gt 0 ]; then
        success "Passed: $passed_tests"
    fi
    
    if [ $failed_tests -gt 0 ]; then
        error "Failed: $failed_tests"
    fi
    
    echo
    
    if [ $failed_tests -eq 0 ]; then
        success "🎉 ALL VALIDATION TESTS PASSED!"
        echo -e "${GREEN}Environment is ready for Confluence 9.2.7 upgrade${NC}"
    else
        error "⚠️  VALIDATION FAILED"
        echo -e "${RED}Please resolve $failed_tests issue(s) before proceeding${NC}"
    fi
    
    echo
    info "Logs available in: $LOG_DIR"
    info "Full log: $FULL_LOG"
}

# Main execution
main() {
    local start_time=$(date +%s)
    local total_tests=${#TEST_ORDER[@]}
    local passed_tests=0
    local failed_tests=0
    
    echo "==========================================="
    header "🚀 Confluence 9.2.7 Upgrade Validation Suite"
    echo "==========================================="
    echo
    
    setup_logging
    
    # Run pre-flight checks
    if ! preflight_checks; then
        error "Pre-flight checks failed. Aborting test suite."
        exit 1
    fi
    
    echo
    
    # Execute all tests
    for test_key in "${TEST_ORDER[@]}"; do
        if execute_test "$test_key"; then
            ((passed_tests++))
        else
            ((failed_tests++))
        fi
        echo
    done
    
    local end_time=$(date +%s)
    local total_duration=$((end_time - start_time))
    
    # Generate report
    generate_report "$total_tests" "$passed_tests" "$failed_tests" "$start_time" "$end_time"
    
    # Display summary
    display_summary "$total_tests" "$passed_tests" "$failed_tests" "$total_duration"
    
    # Exit with appropriate code
    if [ $failed_tests -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Help function
show_help() {
    cat << EOF
Confluence 9.2.7 Upgrade Validation Test Suite

USAGE:
    $0 [OPTIONS]

OPTIONS:
    -h, --help              Show this help message
    -v, --verbose           Enable verbose output
    --test TEST_NAME        Run only specific test (container-health, database-connectivity, api-endpoints, scriptrunner)
    --list                  List available tests

EXAMPLES:
    $0                                    # Run all tests
    $0 --test container-health           # Run only container health tests
    $0 --test api-endpoints              # Run only API endpoint tests
    $0 --list                            # List all available tests

TESTS:
EOF
    
    for test_key in "${TEST_ORDER[@]}"; do
        printf "    %-20s %s\n" "$test_key" "${TESTS[$test_key]}"
    done
    
    echo
    echo "For more information, see: src/groovy/umig/tests/upgrade/"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -v|--verbose)
            set -x
            shift
            ;;
        --test)
            if [[ -n "${2:-}" ]] && [[ -n "${TESTS[$2]:-}" ]]; then
                # Run single test
                setup_logging
                if execute_test "$2"; then
                    success "Test '$2' passed"
                    exit 0
                else
                    error "Test '$2' failed"
                    exit 1
                fi
            else
                error "Invalid test name: ${2:-}. Use --list to see available tests."
                exit 1
            fi
            ;;
        --list)
            echo "Available tests:"
            for test_key in "${TEST_ORDER[@]}"; do
                printf "  %-20s %s\n" "$test_key" "${TESTS[$test_key]}"
            done
            exit 0
            ;;
        *)
            error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Ensure required tools are available
command -v podman >/dev/null 2>&1 || { error "podman is required but not installed"; exit 1; }
command -v curl >/dev/null 2>&1 || { error "curl is required but not installed"; exit 1; }

# Run main function
main "$@"