#!/bin/bash

# Immediate Health Check - Quick validation before full quality check
# Verifies environment is ready for comprehensive testing

echo "🩺 UMIG Immediate Health Check"
echo "=============================="
echo "Quick system validation before comprehensive quality testing"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

HEALTH_SCORE=0
MAX_SCORE=7

# Check 1: Development environment
echo -n "1. Development environment status... "
if pgrep -f "confluence" > /dev/null 2>&1 || curl -s "http://localhost:8090" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Running${NC}"
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
else
    echo -e "${RED}❌ Not running${NC}"
    echo "   Run 'npm start' from local-dev-setup/"
fi

# Check 2: Database connectivity
echo -n "2. Database connectivity... "
if curl -s "http://localhost:5432" > /dev/null 2>&1 || netstat -an 2>/dev/null | grep -q ":5432.*LISTEN"; then
    echo -e "${GREEN}✅ PostgreSQL listening${NC}"
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
else
    echo -e "${RED}❌ PostgreSQL not accessible${NC}"
fi

# Check 3: Basic API connectivity
echo -n "3. ScriptRunner API connectivity... "
if curl -s "http://localhost:8090/rest/scriptrunner/latest/custom/" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ ScriptRunner API responding${NC}"
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
else
    echo -e "${RED}❌ ScriptRunner API not responding${NC}"
fi

# Check 4: Test framework files present
echo -n "4. Test framework files... "
missing_files=0

test_files=(
    "../src/groovy/umig/tests/unit/repository/StepRepositoryTest.groovy"
    "../src/groovy/umig/tests/integration/StepsApiIntegrationTest.groovy"
    "../src/groovy/umig/tests/performance/StepsApiPerformanceValidator.groovy"
    "../src/groovy/umig/tests/validation/US024QualityGateValidator.groovy"
)

for file in "${test_files[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -eq 0 ]; then
    echo -e "${GREEN}✅ All test files present${NC}"
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
else
    echo -e "${RED}❌ Missing $missing_files test files${NC}"
fi

# Check 5: StepsApi.groovy exists
echo -n "5. StepsApi.groovy source... "
if [ -f "../src/groovy/umig/api/v2/StepsApi.groovy" ]; then
    echo -e "${GREEN}✅ Found${NC}"
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
else
    echo -e "${RED}❌ Missing${NC}"
fi

# Check 6: Quality check scripts executable
echo -n "6. Quality check scripts... "
script_count=0
for script in phase-a-smoke-tests.sh phase-b-test-execution.sh master-quality-check.sh; do
    if [ -f "$script" ]; then
        script_count=$((script_count + 1))
        chmod +x "$script" 2>/dev/null
    fi
done

if [ $script_count -eq 3 ]; then
    echo -e "${GREEN}✅ All scripts ready${NC}"
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
else
    echo -e "${RED}❌ Missing quality check scripts${NC}"
fi

# Check 7: Test results directory writable
echo -n "7. Test results directory... "
if mkdir -p "./test-results/health-check-test" 2>/dev/null && rmdir "./test-results/health-check-test" 2>/dev/null; then
    echo -e "${GREEN}✅ Writable${NC}"
    HEALTH_SCORE=$((HEALTH_SCORE + 1))
else
    echo -e "${RED}❌ Cannot write to test-results${NC}"
fi

echo ""
echo "============================"
echo "Health Check Results"
echo "============================"

# Calculate health percentage
HEALTH_PERCENTAGE=$((HEALTH_SCORE * 100 / MAX_SCORE))

echo "Score: $HEALTH_SCORE/$MAX_SCORE ($HEALTH_PERCENTAGE%)"

if [ $HEALTH_SCORE -eq $MAX_SCORE ]; then
    echo -e "${GREEN}🟢 EXCELLENT: System ready for comprehensive quality check${NC}"
    echo ""
    echo "✅ Ready to proceed with:"
    echo "   • ./scripts/quality-check/master-quality-check.sh (Full validation)"
    echo "   • ./scripts/quality-check/phase-a-smoke-tests.sh (Quick endpoint test)"
    echo "   • ./scripts/quality-check/investigate-comments-endpoint.sh (Specific issue)"
    exit 0
elif [ $HEALTH_SCORE -ge 5 ]; then
    echo -e "${YELLOW}🟡 GOOD: Minor issues but can proceed with caution${NC}"
    echo ""
    echo "⚠️  Can proceed but may encounter issues. Consider fixing:"
    if [ $HEALTH_SCORE -lt $MAX_SCORE ]; then
        echo "   • Review failed checks above"
    fi
    exit 2
else
    echo -e "${RED}🔴 POOR: Critical issues must be resolved first${NC}"
    echo ""
    echo "❌ Cannot proceed reliably. Must fix:"
    echo "   • Development environment setup"
    echo "   • Database connectivity"
    echo "   • Missing test files or scripts"
    echo ""
    echo "🔧 Suggested actions:"
    echo "   1. Run 'npm start' from local-dev-setup/"
    echo "   2. Wait for services to fully initialize"
    echo "   3. Verify all test files are present"
    echo "   4. Re-run this health check"
    exit 1
fi