#!/bin/bash

# Phase B: Systematic Test Suite Execution
# Executes all created test suites with real database and endpoints

set -e

echo "=================================================="
echo "UMIG US-024 Phase B: Test Suite Execution"
echo "=================================================="
echo "Executing comprehensive test suites against live environment"
echo ""

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_DIR="./test-results/phase-b-$TIMESTAMP"
mkdir -p "$RESULTS_DIR"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test execution function
execute_test_suite() {
    local suite_name="$1"
    local test_file="$2"
    local description="$3"
    
    echo -e "${BLUE}===============================================${NC}"
    echo -e "${BLUE}Executing: $suite_name${NC}"
    echo -e "${BLUE}Description: $description${NC}"
    echo -e "${BLUE}File: $test_file${NC}"
    echo -e "${BLUE}===============================================${NC}"
    
    # Check if test file exists
    if [ ! -f "$test_file" ]; then
        echo -e "${RED}❌ ERROR: Test file not found: $test_file${NC}"
        echo "$suite_name: ERROR - Test file not found" >> "$RESULTS_DIR/execution-summary.log"
        return 1
    fi
    
    # Create suite-specific log file
    local suite_log="$RESULTS_DIR/${suite_name,,}-results.log"
    
    echo "Starting execution at $(date)" > "$suite_log"
    echo "Test Suite: $suite_name" >> "$suite_log"
    echo "Test File: $test_file" >> "$suite_log"
    echo "=========================================" >> "$suite_log"
    echo "" >> "$suite_log"
    
    # Execute the test with proper classpath
    local start_time=$(date +%s)
    
    if cd "$(dirname $0)/../../../" && groovy -cp ".:src/groovy:local-dev-setup/scripts/groovy" "$test_file" >> "$suite_log" 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${GREEN}✅ $suite_name: PASSED (${duration}s)${NC}"
        echo "$suite_name: PASSED (${duration}s)" >> "$RESULTS_DIR/execution-summary.log"
        
        # Extract key metrics from log if available
        local test_count=$(grep -o "Tests run: [0-9]*" "$suite_log" | head -1 | grep -o "[0-9]*" || echo "N/A")
        local failures=$(grep -o "Failures: [0-9]*" "$suite_log" | head -1 | grep -o "[0-9]*" || echo "0")
        
        echo "  Tests: $test_count, Failures: $failures, Duration: ${duration}s" >> "$RESULTS_DIR/execution-summary.log"
        
        return 0
    else
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        echo -e "${RED}❌ $suite_name: FAILED (${duration}s)${NC}"
        echo "$suite_name: FAILED (${duration}s)" >> "$RESULTS_DIR/execution-summary.log"
        
        # Show last few lines of error
        echo "Last 10 lines of error log:"
        tail -n 10 "$suite_log" | sed 's/^/  /'
        
        return 1
    fi
}

# Initialize results
echo "UMIG US-024 Phase B Test Execution Results - $TIMESTAMP" > "$RESULTS_DIR/execution-summary.log"
echo "=======================================================" >> "$RESULTS_DIR/execution-summary.log"
echo "Execution started at: $(date)" >> "$RESULTS_DIR/execution-summary.log"
echo "" >> "$RESULTS_DIR/execution-summary.log"

TOTAL_SUITES=0
PASSED_SUITES=0
FAILED_SUITES=0

echo "Environment Check"
echo "-----------------"
echo -n "Checking if development environment is running... "

# Check if Confluence is running
if curl -s "http://localhost:8090" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Confluence is running${NC}"
else
    echo -e "${RED}❌ Confluence is not running${NC}"
    echo "Please run 'npm start' from local-dev-setup/ directory first"
    exit 1
fi

# Check if PostgreSQL is accessible
if curl -s "http://localhost:8090/rest/scriptrunner/latest/custom/users?page=1&size=1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Database connectivity confirmed${NC}"
else
    echo -e "${YELLOW}⚠️  Database connectivity uncertain${NC}"
fi

echo ""
echo "B.1: Unit Test Execution"
echo "-------------------------"

# Execute Unit Tests
execute_test_suite "Unit-Repository" \
                  "src/groovy/umig/tests/unit/repository/StepRepositoryTest.groovy" \
                  "StepRepository methods with real database"
TOTAL_SUITES=$((TOTAL_SUITES + 1))
[[ $? -eq 0 ]] && PASSED_SUITES=$((PASSED_SUITES + 1)) || FAILED_SUITES=$((FAILED_SUITES + 1))

echo ""
echo "B.2: Integration Test Execution"
echo "--------------------------------"

# Execute Integration Tests
execute_test_suite "Integration-API" \
                  "src/groovy/umig/tests/integration/StepsApiIntegrationTest.groovy" \
                  "Complete API integration testing"
TOTAL_SUITES=$((TOTAL_SUITES + 1))
[[ $? -eq 0 ]] && PASSED_SUITES=$((PASSED_SUITES + 1)) || FAILED_SUITES=$((FAILED_SUITES + 1))

echo ""
echo "B.3: Performance Validation"
echo "----------------------------"

# Execute Performance Tests
execute_test_suite "Performance-Validation" \
                  "src/groovy/umig/tests/performance/StepsApiPerformanceValidator.groovy" \
                  "Performance benchmarks and load testing"
TOTAL_SUITES=$((TOTAL_SUITES + 1))
[[ $? -eq 0 ]] && PASSED_SUITES=$((PASSED_SUITES + 1)) || FAILED_SUITES=$((FAILED_SUITES + 1))

echo ""
echo "B.4: Backward Compatibility Check"
echo "----------------------------------"

# Execute Compatibility Tests
execute_test_suite "Backward-Compatibility" \
                  "src/groovy/umig/tests/compatibility/BackwardCompatibilityValidator.groovy" \
                  "Backward compatibility validation"
TOTAL_SUITES=$((TOTAL_SUITES + 1))
[[ $? -eq 0 ]] && PASSED_SUITES=$((PASSED_SUITES + 1)) || FAILED_SUITES=$((FAILED_SUITES + 1))

echo ""
echo "B.5: Quality Gate Validation"
echo "-----------------------------"

# Execute Quality Gate Tests
execute_test_suite "Quality-Gates" \
                  "src/groovy/umig/tests/validation/US024QualityGateValidator.groovy" \
                  "Comprehensive quality gate validation"
TOTAL_SUITES=$((TOTAL_SUITES + 1))
[[ $? -eq 0 ]] && PASSED_SUITES=$((PASSED_SUITES + 1)) || FAILED_SUITES=$((FAILED_SUITES + 1))

echo ""
echo "B.6: Database Quality Validation"
echo "---------------------------------"

# Execute Database Quality Validation
execute_test_suite "Database-Quality" \
                  "src/groovy/umig/tests/validation/DatabaseQualityValidator.groovy" \
                  "Direct database layer validation and performance testing"
TOTAL_SUITES=$((TOTAL_SUITES + 1))
[[ $? -eq 0 ]] && PASSED_SUITES=$((PASSED_SUITES + 1)) || FAILED_SUITES=$((FAILED_SUITES + 1))

echo ""
echo "B.7: Additional Validation Tests"
echo "---------------------------------"

# Test database connectivity specifically
echo -n "Testing DatabaseUtil.withSql connectivity... "
cat > "$RESULTS_DIR/db-connectivity-test.groovy" << 'EOF'
@Grab('org.postgresql:postgresql:42.7.1')
import groovy.sql.Sql
import umig.utils.DatabaseUtil

try {
    def result = DatabaseUtil.withSql { sql ->
        return sql.firstRow('SELECT COUNT(*) as count FROM steps_master_stm')
    }
    
    if (result && result.count != null) {
        println "✅ DatabaseUtil.withSql: SUCCESS - Found ${result.count} master steps"
        System.exit(0)
    } else {
        println "❌ DatabaseUtil.withSql: FAILED - No data returned"
        System.exit(1)
    }
} catch (Exception e) {
    println "❌ DatabaseUtil.withSql: ERROR - ${e.message}"
    System.exit(1)
}
EOF

if cd "$(dirname $0)/../../../" && groovy -cp ".:src/groovy" "$RESULTS_DIR/db-connectivity-test.groovy" > "$RESULTS_DIR/db-test.log" 2>&1; then
    echo -e "${GREEN}✅ Database connectivity confirmed${NC}"
    echo "Database connectivity: PASSED" >> "$RESULTS_DIR/execution-summary.log"
else
    echo -e "${RED}❌ Database connectivity failed${NC}"
    echo "Database connectivity: FAILED" >> "$RESULTS_DIR/execution-summary.log"
    cat "$RESULTS_DIR/db-test.log"
fi

echo ""
echo "=================================================="
echo "Phase B Test Execution Results Summary"
echo "=================================================="
echo "Total Test Suites: $TOTAL_SUITES"
echo -e "Passed Suites: ${GREEN}$PASSED_SUITES${NC}"
echo -e "Failed Suites: ${RED}$FAILED_SUITES${NC}"

# Calculate pass rate
if [ $TOTAL_SUITES -gt 0 ]; then
    PASS_RATE=$((PASSED_SUITES * 100 / TOTAL_SUITES))
    echo "Suite Pass Rate: $PASS_RATE%"
else
    PASS_RATE=0
fi

# Save summary
echo "" >> "$RESULTS_DIR/execution-summary.log"
echo "Execution completed at: $(date)" >> "$RESULTS_DIR/execution-summary.log"
echo "" >> "$RESULTS_DIR/execution-summary.log"
echo "FINAL SUMMARY:" >> "$RESULTS_DIR/execution-summary.log"
echo "Total Test Suites: $TOTAL_SUITES" >> "$RESULTS_DIR/execution-summary.log"
echo "Passed Suites: $PASSED_SUITES" >> "$RESULTS_DIR/execution-summary.log"
echo "Failed Suites: $FAILED_SUITES" >> "$RESULTS_DIR/execution-summary.log"
echo "Suite Pass Rate: $PASS_RATE%" >> "$RESULTS_DIR/execution-summary.log"

# Generate detailed report
echo ""
echo "Generating Detailed Report"
echo "--------------------------"

cat > "$RESULTS_DIR/detailed-report.md" << EOF
# UMIG US-024 Phase B Test Execution Report

**Execution Date**: $(date)  
**Environment**: Development (localhost:8090)  
**Database**: PostgreSQL container  

## Summary

- **Total Test Suites**: $TOTAL_SUITES
- **Passed Suites**: $PASSED_SUITES
- **Failed Suites**: $FAILED_SUITES
- **Success Rate**: $PASS_RATE%

## Test Suite Results

EOF

# Add individual suite results
for log_file in "$RESULTS_DIR"/*-results.log; do
    if [ -f "$log_file" ]; then
        suite_name=$(basename "$log_file" -results.log)
        echo "### $suite_name" >> "$RESULTS_DIR/detailed-report.md"
        echo "" >> "$RESULTS_DIR/detailed-report.md"
        if grep -q "PASSED" "$RESULTS_DIR/execution-summary.log" | grep -q "$suite_name"; then
            echo "✅ **Status**: PASSED" >> "$RESULTS_DIR/detailed-report.md"
        else
            echo "❌ **Status**: FAILED" >> "$RESULTS_DIR/detailed-report.md"
        fi
        echo "" >> "$RESULTS_DIR/detailed-report.md"
        echo "**Log File**: \`$(basename "$log_file")\`" >> "$RESULTS_DIR/detailed-report.md"
        echo "" >> "$RESULTS_DIR/detailed-report.md"
    fi
done

echo ""
echo "Detailed results saved to: $RESULTS_DIR/"
echo "- execution-summary.log: Complete execution summary"
echo "- detailed-report.md: Markdown report for documentation"
echo "- *-results.log: Individual test suite logs"

# Exit with appropriate code
if [ $FAILED_SUITES -eq 0 ]; then
    echo -e "${GREEN}✅ All test suites passed! Ready for Phase C.${NC}"
    exit 0
else
    echo -e "${RED}❌ $FAILED_SUITES test suites failed. Review results before proceeding.${NC}"
    echo ""
    echo "Next Steps:"
    echo "1. Review individual suite logs in $RESULTS_DIR/"
    echo "2. Fix identified issues"
    echo "3. Re-run specific test suites as needed"
    echo "4. Proceed to Phase C when all issues are resolved"
    exit 1
fi