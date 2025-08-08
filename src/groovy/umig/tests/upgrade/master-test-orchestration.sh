#!/bin/bash
# master-test-orchestration.sh
# Comprehensive test orchestration for US-032 Confluence & ScriptRunner upgrade validation
# Executes all test phases with comprehensive reporting and risk assessment

set -e

# Configuration
TEST_REPORTS_DIR="test-reports/$(date +%Y%m%d-%H%M%S)"
PARALLEL_TESTS=true
PERFORMANCE_BASELINE_REQUIRED=true
EMAIL_NOTIFICATIONS=false
STOP_ON_CRITICAL_FAILURE=true

# Test thresholds
SMOKE_TEST_REQUIRED=true
INTEGRATION_TEST_REQUIRED=true
PERFORMANCE_DEGRADATION_THRESHOLD=25  # % degradation before failing
SECURITY_FAILURE_THRESHOLD=0          # Max allowed security failures
MAX_WARNING_COUNT=5                   # Max warnings before escalation

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Create test reports directory
mkdir -p "$TEST_REPORTS_DIR"
mkdir -p "$TEST_REPORTS_DIR/logs"
mkdir -p "$TEST_REPORTS_DIR/artifacts"

# Global test tracking
PHASE_RESULTS=()
TOTAL_TESTS_RUN=0
TOTAL_TESTS_PASSED=0
TOTAL_TESTS_FAILED=0
TOTAL_WARNINGS=0
CRITICAL_FAILURES=()
PERFORMANCE_ISSUES=()
SECURITY_ISSUES=()

# Logging function with levels
log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local color=""
    
    case $level in
        "ERROR")   color="$RED" ;;
        "SUCCESS") color="$GREEN" ;;
        "WARNING") color="$YELLOW" ;;
        "INFO")    color="$BLUE" ;;
        "DEBUG")   color="$PURPLE" ;;
        *)         color="$NC" ;;
    esac
    
    echo -e "${color}[$timestamp] [$level] $message${NC}" | tee -a "$TEST_REPORTS_DIR/test-execution.log"
}

# Banner function
print_banner() {
    local title="$1"
    echo ""
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}$title${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
}

# Test phase execution with comprehensive error handling and metrics
execute_test_phase() {
    local phase_name="$1"
    local script_path="$2"
    local required="$3"
    local timeout_seconds="$4"
    
    log "INFO" "Starting $phase_name"
    
    local start_time=$(date +%s)
    local phase_result=""
    
    if [ ! -f "$script_path" ]; then
        log "ERROR" "$phase_name script not found: $script_path"
        phase_result="SCRIPT_NOT_FOUND"
        PHASE_RESULTS+=("$phase_name:SCRIPT_NOT_FOUND")
        
        if [ "$required" = "true" ]; then
            CRITICAL_FAILURES+=("$phase_name: Script not found")
            if [ "$STOP_ON_CRITICAL_FAILURE" = "true" ]; then
                log "ERROR" "Critical test phase failed - stopping execution"
                cleanup_and_exit 1
            fi
        fi
        return 1
    fi
    
    # Execute test with timeout
    local test_output_file="$TEST_REPORTS_DIR/logs/${phase_name,,}-execution.log"
    local test_result_file="$TEST_REPORTS_DIR/${phase_name,,}-results.txt"
    
    if [ -n "$timeout_seconds" ] && [ "$timeout_seconds" -gt 0 ]; then
        timeout "$timeout_seconds" bash "$script_path" > "$test_output_file" 2>&1
        local exit_code=$?
    else
        bash "$script_path" > "$test_output_file" 2>&1
        local exit_code=$?
    fi
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    # Copy output to results file for processing
    cp "$test_output_file" "$test_result_file"
    
    # Analyze test results
    if [ $exit_code -eq 0 ]; then
        phase_result="PASSED"
        log "SUCCESS" "$phase_name completed successfully in ${duration}s"
        TOTAL_TESTS_PASSED=$((TOTAL_TESTS_PASSED + 1))
        
        # Check for warnings even in passed tests
        local warning_count=$(grep -c "⚠️\|WARNING\|WARN" "$test_output_file" 2>/dev/null || echo "0")
        if [ "$warning_count" -gt 0 ]; then
            log "WARNING" "$phase_name passed but generated $warning_count warnings"
            TOTAL_WARNINGS=$((TOTAL_WARNINGS + warning_count))
        fi
        
    elif [ $exit_code -eq 124 ]; then
        phase_result="TIMEOUT"
        log "ERROR" "$phase_name timed out after ${timeout_seconds}s"
        TOTAL_TESTS_FAILED=$((TOTAL_TESTS_FAILED + 1))
        
        if [ "$required" = "true" ]; then
            CRITICAL_FAILURES+=("$phase_name: Timeout after ${timeout_seconds}s")
        fi
        
    else
        phase_result="FAILED"
        log "ERROR" "$phase_name failed with exit code $exit_code after ${duration}s"
        TOTAL_TESTS_FAILED=$((TOTAL_TESTS_FAILED + 1))
        
        # Extract failure details
        local failure_details=$(tail -10 "$test_output_file" | tr '\n' ' ')
        
        if [ "$required" = "true" ]; then
            CRITICAL_FAILURES+=("$phase_name: $failure_details")
            
            if [ "$STOP_ON_CRITICAL_FAILURE" = "true" ]; then
                log "ERROR" "Critical test phase failed - stopping execution"
                cleanup_and_exit 1
            fi
        fi
    fi
    
    PHASE_RESULTS+=("$phase_name:$phase_result:${duration}s")
    TOTAL_TESTS_RUN=$((TOTAL_TESTS_RUN + 1))
    
    # Phase-specific result processing
    case "$phase_name" in
        "Security Validation")
            process_security_results "$test_result_file"
            ;;
        "Performance Comparison")
            process_performance_results "$test_result_file"
            ;;
        "Integration Tests")
            process_integration_results "$test_result_file"
            ;;
    esac
    
    return $exit_code
}

# Process security test results
process_security_results() {
    local results_file="$1"
    
    if [ -f "$results_file" ]; then
        local security_failures=$(grep -c "❌.*Security\|FAILED.*Security" "$results_file" 2>/dev/null || echo "0")
        local security_warnings=$(grep -c "⚠️.*Security\|WARNING.*Security" "$results_file" 2>/dev/null || echo "0")
        
        if [ "$security_failures" -gt "$SECURITY_FAILURE_THRESHOLD" ]; then
            SECURITY_ISSUES+=("$security_failures security test failures detected")
            log "ERROR" "Security validation failed with $security_failures failures"
        fi
        
        if [ "$security_warnings" -gt 3 ]; then
            SECURITY_ISSUES+=("$security_warnings security warnings detected")
            log "WARNING" "Multiple security warnings detected: $security_warnings"
        fi
    fi
}

# Process performance test results
process_performance_results() {
    local results_file="$1"
    
    if [ -f "$results_file" ]; then
        # Look for performance degradation indicators
        local degradation_detected=$(grep -c "SLOWER\|degradation\|performance issue" "$results_file" 2>/dev/null || echo "0")
        
        if [ "$degradation_detected" -gt 0 ]; then
            PERFORMANCE_ISSUES+=("Performance degradation detected in $degradation_detected metrics")
            log "WARNING" "Performance degradation detected in $degradation_detected metrics"
        fi
        
        # Extract specific performance metrics if available
        if grep -q "NEEDS_INVESTIGATION" "$results_file" 2>/dev/null; then
            PERFORMANCE_ISSUES+=("Performance assessment requires investigation")
            log "ERROR" "Performance degradation exceeds acceptable thresholds"
        fi
    fi
}

# Process integration test results
process_integration_results() {
    local results_file="$1"
    
    if [ -f "$results_file" ]; then
        local failed_apis=$(grep -c "❌.*rest/umig-api\|API.*failed" "$results_file" 2>/dev/null || echo "0")
        
        if [ "$failed_apis" -gt 0 ]; then
            CRITICAL_FAILURES+=("$failed_apis API integration tests failed")
            log "ERROR" "$failed_apis API integration tests failed"
        fi
    fi
}

# Parallel test execution for performance optimization
execute_parallel_tests() {
    log "INFO" "Executing parallel specialized test suites"
    
    local pids=()
    local test_names=()
    
    # Start parallel tests
    if [ -f "src/groovy/umig/tests/upgrade/performance-comparison-test.groovy" ]; then
        groovy -cp ~/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.3.jar \
               src/groovy/umig/tests/upgrade/performance-comparison-test.groovy \
               > "$TEST_REPORTS_DIR/performance-results.txt" 2>&1 &
        pids+=($!)
        test_names+=("Performance Comparison")
    fi
    
    if [ -f "src/groovy/umig/tests/upgrade/security-validation-test.groovy" ]; then
        groovy -cp ~/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.3.jar \
               src/groovy/umig/tests/upgrade/security-validation-test.groovy \
               > "$TEST_REPORTS_DIR/security-results.txt" 2>&1 &
        pids+=($!)
        test_names+=("Security Validation")
    fi
    
    # Additional parallel tests can be added here
    
    # Wait for parallel tests to complete with timeout
    local failed_parallel=0
    local timeout=1800  # 30 minutes timeout for parallel tests
    
    for i in "${!pids[@]}"; do
        local pid=${pids[$i]}
        local test_name=${test_names[$i]}
        
        if wait_with_timeout $pid $timeout; then
            log "SUCCESS" "$test_name completed successfully"
            TOTAL_TESTS_PASSED=$((TOTAL_TESTS_PASSED + 1))
        else
            log "ERROR" "$test_name failed or timed out"
            TOTAL_TESTS_FAILED=$((TOTAL_TESTS_FAILED + 1))
            failed_parallel=$((failed_parallel + 1))
        fi
        
        TOTAL_TESTS_RUN=$((TOTAL_TESTS_RUN + 1))
    done
    
    if [ $failed_parallel -gt 0 ]; then
        log "WARNING" "$failed_parallel parallel tests failed"
        return 1
    else
        log "SUCCESS" "All parallel tests completed successfully"
        return 0
    fi
}

# Wait for process with timeout
wait_with_timeout() {
    local pid=$1
    local timeout=$2
    local count=0
    
    while [ $count -lt $timeout ]; do
        if ! kill -0 $pid 2>/dev/null; then
            wait $pid
            return $?
        fi
        sleep 1
        count=$((count + 1))
    done
    
    # Timeout reached, kill the process
    kill -TERM $pid 2>/dev/null
    sleep 5
    kill -KILL $pid 2>/dev/null
    return 1
}

# Comprehensive test report generation
generate_comprehensive_report() {
    log "INFO" "Generating comprehensive test report"
    
    local report_file="$TEST_REPORTS_DIR/US-032-Comprehensive-Test-Report.html"
    local json_report_file="$TEST_REPORTS_DIR/US-032-Test-Results.json"
    
    # Generate JSON report
    generate_json_report "$json_report_file"
    
    # Generate HTML report
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>US-032 Confluence & ScriptRunner Upgrade - Comprehensive Test Report</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; margin: -30px -30px 30px -30px; border-radius: 8px 8px 0 0; }
        .header h1 { margin: 0; font-size: 2.2em; }
        .header .subtitle { margin: 10px 0 0 0; opacity: 0.9; font-size: 1.1em; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .summary-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #ddd; }
        .summary-card.success { border-left-color: #28a745; }
        .summary-card.danger { border-left-color: #dc3545; }
        .summary-card.warning { border-left-color: #ffc107; }
        .summary-card.info { border-left-color: #17a2b8; }
        .summary-card h3 { margin: 0 0 10px 0; color: #333; }
        .summary-card .number { font-size: 2em; font-weight: bold; color: #333; }
        .section { margin-bottom: 40px; }
        .section h2 { color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px; }
        .test-result { background: #f8f9fa; margin: 10px 0; padding: 15px; border-radius: 6px; border-left: 4px solid #ddd; }
        .test-result.passed { border-left-color: #28a745; }
        .test-result.failed { border-left-color: #dc3545; }
        .test-result.warning { border-left-color: #ffc107; }
        .test-result h4 { margin: 0 0 8px 0; color: #333; }
        .test-result .status { font-weight: bold; padding: 4px 8px; border-radius: 4px; color: white; display: inline-block; margin-bottom: 8px; }
        .status.passed { background: #28a745; }
        .status.failed { background: #dc3545; }
        .status.warning { background: #ffc107; }
        .details ul { margin: 8px 0; padding-left: 20px; }
        .details li { margin: 4px 0; }
        .timestamp { color: #666; font-style: italic; }
        .risk-indicator { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: bold; margin: 5px; }
        .risk-low { background: #d4edda; color: #155724; }
        .risk-medium { background: #fff3cd; color: #856404; }
        .risk-high { background: #f8d7da; color: #721c24; }
        .risk-critical { background: #dc3545; color: white; }
        .recommendations { background: #e3f2fd; padding: 20px; border-radius: 8px; border-left: 4px solid #2196f3; }
        .artifact-link { display: inline-block; margin: 5px; padding: 8px 15px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
        .artifact-link:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>US-032: Confluence & ScriptRunner Upgrade Test Report</h1>
            <div class="subtitle">Generated: $(date '+%Y-%m-%d %H:%M:%S')</div>
            <div class="subtitle">Test Suite: Comprehensive Upgrade Validation</div>
        </div>
        
        <div class="summary-grid">
            <div class="summary-card $([ $TOTAL_TESTS_PASSED -gt $TOTAL_TESTS_FAILED ] && echo "success" || echo "danger")">
                <h3>Tests Executed</h3>
                <div class="number">$TOTAL_TESTS_RUN</div>
            </div>
            <div class="summary-card success">
                <h3>Passed</h3>
                <div class="number">$TOTAL_TESTS_PASSED</div>
            </div>
            <div class="summary-card danger">
                <h3>Failed</h3>
                <div class="number">$TOTAL_TESTS_FAILED</div>
            </div>
            <div class="summary-card warning">
                <h3>Warnings</h3>
                <div class="number">$TOTAL_WARNINGS</div>
            </div>
        </div>
        
        <div class="section">
            <h2>Executive Summary</h2>
            <div class="test-result $([ ${#CRITICAL_FAILURES[@]} -eq 0 ] && echo "passed" || echo "failed")">
                <h4>Overall Assessment</h4>
EOF

    # Add overall assessment
    if [ ${#CRITICAL_FAILURES[@]} -eq 0 ] && [ ${#SECURITY_ISSUES[@]} -eq 0 ] && [ ${#PERFORMANCE_ISSUES[@]} -eq 0 ]; then
        echo '<div class="status passed">UPGRADE VALIDATION PASSED</div>' >> "$report_file"
        echo '<p>All critical test phases completed successfully. The upgrade is ready for production deployment.</p>' >> "$report_file"
    elif [ ${#CRITICAL_FAILURES[@]} -gt 0 ]; then
        echo '<div class="status failed">UPGRADE VALIDATION FAILED</div>' >> "$report_file"
        echo '<p>Critical test failures detected. The upgrade requires investigation and resolution before deployment.</p>' >> "$report_file"
    else
        echo '<div class="status warning">UPGRADE VALIDATION WITH WARNINGS</div>' >> "$report_file"
        echo '<p>Upgrade validation completed with warnings. Review recommendations before deployment.</p>' >> "$report_file"
    fi
    
    # Add phase results
    cat >> "$report_file" << EOF
            </div>
        </div>
        
        <div class="section">
            <h2>Test Phase Results</h2>
EOF

    # Add each phase result
    for phase_result in "${PHASE_RESULTS[@]}"; do
        IFS=':' read -r phase_name phase_status phase_duration <<< "$phase_result"
        local status_class=""
        case "$phase_status" in
            "PASSED") status_class="passed" ;;
            "FAILED"|"TIMEOUT"|"SCRIPT_NOT_FOUND") status_class="failed" ;;
            *) status_class="warning" ;;
        esac
        
        cat >> "$report_file" << EOF
            <div class="test-result $status_class">
                <h4>$phase_name</h4>
                <div class="status $status_class">$phase_status</div>
                <p>Duration: $phase_duration</p>
            </div>
EOF
    done
    
    # Add critical failures section
    if [ ${#CRITICAL_FAILURES[@]} -gt 0 ]; then
        cat >> "$report_file" << EOF
        </div>
        
        <div class="section">
            <h2>Critical Failures</h2>
EOF
        for failure in "${CRITICAL_FAILURES[@]}"; do
            echo "<div class=\"test-result failed\"><p>$failure</p></div>" >> "$report_file"
        done
    fi
    
    # Add security issues section
    if [ ${#SECURITY_ISSUES[@]} -gt 0 ]; then
        cat >> "$report_file" << EOF
        </div>
        
        <div class="section">
            <h2>Security Issues</h2>
EOF
        for issue in "${SECURITY_ISSUES[@]}"; do
            echo "<div class=\"test-result warning\"><p>$issue</p></div>" >> "$report_file"
        done
    fi
    
    # Add performance issues section
    if [ ${#PERFORMANCE_ISSUES[@]} -gt 0 ]; then
        cat >> "$report_file" << EOF
        </div>
        
        <div class="section">
            <h2>Performance Issues</h2>
EOF
        for issue in "${PERFORMANCE_ISSUES[@]}"; do
            echo "<div class=\"test-result warning\"><p>$issue</p></div>" >> "$report_file"
        done
    fi
    
    # Add recommendations
    cat >> "$report_file" << EOF
        </div>
        
        <div class="section">
            <h2>Recommendations</h2>
            <div class="recommendations">
                <h4>Next Steps</h4>
                <ul>
EOF

    if [ ${#CRITICAL_FAILURES[@]} -gt 0 ]; then
        echo "                    <li><strong>Critical:</strong> Resolve all failed test cases before production deployment</li>" >> "$report_file"
        echo "                    <li><strong>Investigation:</strong> Review detailed logs for root cause analysis</li>" >> "$report_file"
        echo "                    <li><strong>Rollback:</strong> Consider rollback if issues cannot be resolved quickly</li>" >> "$report_file"
    else
        echo "                    <li><strong>Deployment:</strong> Upgrade validation successful - proceed with deployment</li>" >> "$report_file"
        echo "                    <li><strong>Monitoring:</strong> Continue monitoring system performance and security</li>" >> "$report_file"
    fi
    
    if [ ${#PERFORMANCE_ISSUES[@]} -gt 0 ]; then
        echo "                    <li><strong>Performance:</strong> Monitor system performance closely after deployment</li>" >> "$report_file"
        echo "                    <li><strong>Optimization:</strong> Consider performance tuning if issues persist</li>" >> "$report_file"
    fi
    
    if [ ${#SECURITY_ISSUES[@]} -gt 0 ]; then
        echo "                    <li><strong>Security:</strong> Address security warnings in next maintenance window</li>" >> "$report_file"
        echo "                    <li><strong>Review:</strong> Conduct security review with security team</li>" >> "$report_file"
    fi
    
    # Add artifacts section
    cat >> "$report_file" << EOF
                </ul>
            </div>
        </div>
        
        <div class="section">
            <h2>Test Artifacts</h2>
            <p>Detailed test logs and results are available in the following files:</p>
            <a href="US-032-Test-Results.json" class="artifact-link">JSON Test Results</a>
            <a href="logs/" class="artifact-link">Detailed Logs</a>
            <a href="security-validation-report.json" class="artifact-link">Security Report</a>
            <a href="performance-comparison-summary.txt" class="artifact-link">Performance Report</a>
        </div>
        
        <div class="section">
            <p class="timestamp">Report generated: $(date '+%Y-%m-%d %H:%M:%S')</p>
            <p class="timestamp">Test reports directory: $TEST_REPORTS_DIR</p>
        </div>
    </div>
</body>
</html>
EOF

    log "SUCCESS" "Comprehensive HTML report generated: $report_file"
}

# Generate JSON report for programmatic consumption
generate_json_report() {
    local json_file="$1"
    
    # Build phase results array
    local phase_results_json="["
    local first=true
    for phase_result in "${PHASE_RESULTS[@]}"; do
        IFS=':' read -r phase_name phase_status phase_duration <<< "$phase_result"
        if [ "$first" = true ]; then
            first=false
        else
            phase_results_json+=","
        fi
        phase_results_json+="{\"name\":\"$phase_name\",\"status\":\"$phase_status\",\"duration\":\"$phase_duration\"}"
    done
    phase_results_json+="]"
    
    # Generate JSON report
    cat > "$json_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "testSuite": "US-032 Comprehensive Upgrade Validation",
  "summary": {
    "totalTests": $TOTAL_TESTS_RUN,
    "passed": $TOTAL_TESTS_PASSED,
    "failed": $TOTAL_TESTS_FAILED,
    "warnings": $TOTAL_WARNINGS,
    "criticalFailures": ${#CRITICAL_FAILURES[@]},
    "securityIssues": ${#SECURITY_ISSUES[@]},
    "performanceIssues": ${#PERFORMANCE_ISSUES[@]}
  },
  "phases": $phase_results_json,
  "criticalFailures": $(printf '%s\n' "${CRITICAL_FAILURES[@]}" | jq -R . | jq -s .),
  "securityIssues": $(printf '%s\n' "${SECURITY_ISSUES[@]}" | jq -R . | jq -s .),
  "performanceIssues": $(printf '%s\n' "${PERFORMANCE_ISSUES[@]}" | jq -R . | jq -s .),
  "overallStatus": "$([ ${#CRITICAL_FAILURES[@]} -eq 0 ] && echo "PASSED" || echo "FAILED")",
  "reportsDirectory": "$TEST_REPORTS_DIR"
}
EOF
}

# Email notification (if configured)
send_email_notification() {
    if [ "$EMAIL_NOTIFICATIONS" = "true" ]; then
        local subject="US-032 Upgrade Test Results - $(date '+%Y-%m-%d %H:%M')"
        local status_emoji=""
        local overall_status=""
        
        if [ ${#CRITICAL_FAILURES[@]} -eq 0 ]; then
            status_emoji="✅"
            overall_status="PASSED"
        else
            status_emoji="❌"
            overall_status="FAILED"
        fi
        
        local body="US-032 Confluence & ScriptRunner Upgrade Test Results
        
Status: $status_emoji $overall_status

Summary:
- Total Tests: $TOTAL_TESTS_RUN
- Passed: $TOTAL_TESTS_PASSED
- Failed: $TOTAL_TESTS_FAILED
- Warnings: $TOTAL_WARNINGS

Critical Failures: ${#CRITICAL_FAILURES[@]}
Security Issues: ${#SECURITY_ISSUES[@]}
Performance Issues: ${#PERFORMANCE_ISSUES[@]}

Detailed reports available at: $TEST_REPORTS_DIR

$([ ${#CRITICAL_FAILURES[@]} -gt 0 ] && echo "CRITICAL: Review and resolve failures before deployment" || echo "SUCCESS: Upgrade validation completed successfully")
"
        
        # This would integrate with actual email system
        log "INFO" "Email notification prepared: $subject"
        echo "$body" > "$TEST_REPORTS_DIR/email-notification.txt"
    fi
}

# Cleanup function
cleanup_and_exit() {
    local exit_code="$1"
    
    log "INFO" "Performing cleanup and generating final reports"
    
    # Ensure all background processes are terminated
    jobs -p | xargs -r kill 2>/dev/null || true
    
    # Generate reports regardless of exit status
    generate_comprehensive_report
    send_email_notification
    
    # Final summary
    print_banner "FINAL TEST EXECUTION SUMMARY"
    
    echo -e "📊 ${BLUE}Test Execution Statistics:${NC}"
    echo -e "   Total Tests Run: ${CYAN}$TOTAL_TESTS_RUN${NC}"
    echo -e "   Tests Passed: ${GREEN}$TOTAL_TESTS_PASSED${NC}"
    echo -e "   Tests Failed: ${RED}$TOTAL_TESTS_FAILED${NC}"
    echo -e "   Warnings Generated: ${YELLOW}$TOTAL_WARNINGS${NC}"
    echo ""
    
    echo -e "🎯 ${BLUE}Issue Summary:${NC}"
    echo -e "   Critical Failures: ${RED}${#CRITICAL_FAILURES[@]}${NC}"
    echo -e "   Security Issues: ${YELLOW}${#SECURITY_ISSUES[@]}${NC}"
    echo -e "   Performance Issues: ${YELLOW}${#PERFORMANCE_ISSUES[@]}${NC}"
    echo ""
    
    if [ ${#CRITICAL_FAILURES[@]} -eq 0 ] && [ ${#SECURITY_ISSUES[@]} -eq 0 ] && [ ${#PERFORMANCE_ISSUES[@]} -eq 0 ]; then
        echo -e "✅ ${GREEN}OVERALL RESULT: UPGRADE VALIDATION PASSED${NC}"
        echo -e "   ${GREEN}All critical validations completed successfully${NC}"
        echo -e "   ${GREEN}System is ready for production deployment${NC}"
    elif [ ${#CRITICAL_FAILURES[@]} -gt 0 ]; then
        echo -e "❌ ${RED}OVERALL RESULT: UPGRADE VALIDATION FAILED${NC}"
        echo -e "   ${RED}Critical test failures require immediate attention${NC}"
        echo -e "   ${RED}DO NOT deploy to production until issues are resolved${NC}"
    else
        echo -e "⚠️  ${YELLOW}OVERALL RESULT: UPGRADE VALIDATION WITH WARNINGS${NC}"
        echo -e "   ${YELLOW}Review warnings and recommendations before deployment${NC}"
        echo -e "   ${YELLOW}Consider additional monitoring post-deployment${NC}"
    fi
    
    echo ""
    echo -e "📁 ${BLUE}Reports Available:${NC}"
    echo -e "   📊 Comprehensive HTML Report: ${CYAN}$TEST_REPORTS_DIR/US-032-Comprehensive-Test-Report.html${NC}"
    echo -e "   📋 JSON Results: ${CYAN}$TEST_REPORTS_DIR/US-032-Test-Results.json${NC}"
    echo -e "   📝 Execution Log: ${CYAN}$TEST_REPORTS_DIR/test-execution.log${NC}"
    echo ""
    
    exit $exit_code
}

# Trap for cleanup
trap 'cleanup_and_exit 130' INT TERM

# Main execution flow
main() {
    print_banner "US-032 COMPREHENSIVE UPGRADE TEST SUITE"
    
    log "INFO" "Starting US-032 Confluence & ScriptRunner Upgrade Test Suite"
    log "INFO" "Test reports will be saved to: $TEST_REPORTS_DIR"
    log "INFO" "Configuration: PARALLEL_TESTS=$PARALLEL_TESTS, STOP_ON_CRITICAL_FAILURE=$STOP_ON_CRITICAL_FAILURE"
    
    # Phase 1: Environment Validation
    print_banner "PHASE 1: ENVIRONMENT VALIDATION"
    
    # Check if we're in the right directory and have necessary files
    if [ ! -f "src/groovy/umig/tests/upgrade/smoke-test-suite.sh" ]; then
        log "ERROR" "Test scripts not found. Please run from UMIG project root directory."
        cleanup_and_exit 1
    fi
    
    # Make test scripts executable
    chmod +x src/groovy/umig/tests/upgrade/*.sh 2>/dev/null || true
    
    log "INFO" "Environment validation completed"
    
    # Phase 2: Pre-Upgrade Baseline (if needed)
    print_banner "PHASE 2: PRE-UPGRADE BASELINE GENERATION"
    
    if [ ! -f "pre-upgrade-baseline.json" ] && [ "$PERFORMANCE_BASELINE_REQUIRED" = "true" ]; then
        log "INFO" "Pre-upgrade baseline not found - generating baseline"
        if [ -f "src/groovy/umig/tests/upgrade/pre-upgrade-baseline-generator.groovy" ]; then
            execute_test_phase "Pre-Upgrade Baseline Generation" \
                              "groovy -cp ~/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.3.jar src/groovy/umig/tests/upgrade/pre-upgrade-baseline-generator.groovy" \
                              "false" \
                              "600"
        else
            log "WARNING" "Pre-upgrade baseline generator not found"
        fi
    else
        log "INFO" "Pre-upgrade baseline available or not required"
    fi
    
    # Phase 3: Smoke Tests (Critical)
    print_banner "PHASE 3: SMOKE TESTS"
    
    if [ "$SMOKE_TEST_REQUIRED" = "true" ]; then
        execute_test_phase "Smoke Tests" \
                          "src/groovy/umig/tests/upgrade/smoke-test-suite.sh" \
                          "true" \
                          "300"
    else
        log "INFO" "Smoke tests skipped (not required)"
    fi
    
    # Phase 4: Comprehensive Integration Tests (Critical)
    print_banner "PHASE 4: INTEGRATION TESTS"
    
    if [ "$INTEGRATION_TEST_REQUIRED" = "true" ]; then
        execute_test_phase "Integration Tests" \
                          "src/groovy/umig/tests/run-integration-tests.sh" \
                          "true" \
                          "900"
    else
        log "INFO" "Integration tests skipped (not required)"
    fi
    
    # Phase 5: Specialized Tests (Parallel execution)
    print_banner "PHASE 5: SPECIALIZED VALIDATION TESTS"
    
    if [ "$PARALLEL_TESTS" = "true" ]; then
        log "INFO" "Executing specialized tests in parallel"
        execute_parallel_tests || log "WARNING" "Some specialized tests failed"
    else
        # Sequential execution
        log "INFO" "Executing specialized tests sequentially"
        
        if [ -f "src/groovy/umig/tests/upgrade/performance-comparison-test.groovy" ]; then
            execute_test_phase "Performance Comparison" \
                              "groovy -cp ~/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.3.jar src/groovy/umig/tests/upgrade/performance-comparison-test.groovy" \
                              "false" \
                              "1200"
        fi
        
        if [ -f "src/groovy/umig/tests/upgrade/security-validation-test.groovy" ]; then
            execute_test_phase "Security Validation" \
                              "groovy -cp ~/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.3.jar src/groovy/umig/tests/upgrade/security-validation-test.groovy" \
                              "false" \
                              "600"
        fi
    fi
    
    # Phase 6: Final Validation and Reporting
    print_banner "PHASE 6: FINAL VALIDATION & REPORTING"
    
    log "INFO" "Performing final validation checks"
    
    # Check if critical thresholds are exceeded
    if [ $TOTAL_WARNINGS -gt $MAX_WARNING_COUNT ]; then
        log "WARNING" "Warning count ($TOTAL_WARNINGS) exceeds threshold ($MAX_WARNING_COUNT)"
    fi
    
    if [ ${#SECURITY_ISSUES[@]} -gt 0 ] && [ $SECURITY_FAILURE_THRESHOLD -eq 0 ]; then
        log "ERROR" "Security issues detected and security failure threshold is zero"
        CRITICAL_FAILURES+=("Security validation failed with ${#SECURITY_ISSUES[@]} issues")
    fi
    
    # Generate comprehensive reports
    log "INFO" "Generating comprehensive test reports"
    
    cleanup_and_exit $([ ${#CRITICAL_FAILURES[@]} -eq 0 ] && echo 0 || echo 1)
}

# Execute main function with all arguments
main "$@"