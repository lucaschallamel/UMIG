#!/bin/bash

# Master Quality Check Script - Executes complete US-024 validation
# Orchestrates all phases of quality checking and validation

set -e

echo "🔍 UMIG US-024 COMPREHENSIVE QUALITY CHECK"
echo "=========================================="
echo "Systematic validation of StepsAPI refactoring"
echo "Environment: Development (localhost:8090)"
echo "Started: $(date)"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
MASTER_RESULTS_DIR="./test-results/master-quality-check-$TIMESTAMP"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Ensure we're in the right directory (local-dev-setup)
if [ ! -f "package.json" ] || [ ! -d "scripts/quality-check" ]; then
    echo -e "${RED}❌ ERROR: Must be run from local-dev-setup/ directory${NC}"
    echo "Current directory: $(pwd)"
    echo "Expected files: package.json, scripts/quality-check/"
    exit 1
fi

# Create master results directory
mkdir -p "$MASTER_RESULTS_DIR"

# Initialize master log
cat > "$MASTER_RESULTS_DIR/master-execution.log" << EOF
UMIG US-024 Master Quality Check Execution
==========================================
Started: $(date)
Environment: Development (localhost:8090)
Results Directory: $MASTER_RESULTS_DIR

EOF

echo "Pre-flight Checks"
echo "-----------------"

# Check if environment is running
echo -n "Checking development environment... "
if npm run status > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Development environment is running${NC}"
    echo "Environment check: PASSED" >> "$MASTER_RESULTS_DIR/master-execution.log"
else
    echo -e "${YELLOW}⚠️  Environment status unclear, attempting to start...${NC}"
    echo "Environment check: STARTING" >> "$MASTER_RESULTS_DIR/master-execution.log"
    
    if npm start > "$MASTER_RESULTS_DIR/environment-startup.log" 2>&1 & then
        echo -e "${GREEN}✅ Environment startup initiated${NC}"
        echo "Waiting 30 seconds for services to initialize..."
        sleep 30
    else
        echo -e "${RED}❌ Failed to start environment${NC}"
        echo "Environment check: FAILED" >> "$MASTER_RESULTS_DIR/master-execution.log"
        exit 1
    fi
fi

# Verify connectivity
echo -n "Verifying Confluence connectivity... "
if curl -s "http://localhost:8090" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Confluence responding${NC}"
    echo "Confluence connectivity: PASSED" >> "$MASTER_RESULTS_DIR/master-execution.log"
else
    echo -e "${RED}❌ Confluence not responding${NC}"
    echo "Confluence connectivity: FAILED" >> "$MASTER_RESULTS_DIR/master-execution.log"
    echo "Please ensure 'npm start' completed successfully"
    exit 1
fi

echo ""

# =============================================================================
# PHASE A: SMOKE TESTING
# =============================================================================
echo -e "${BLUE}🔥 PHASE A: SMOKE TESTING${NC}"
echo "=========================="
echo "Manual endpoint validation to identify working vs failing endpoints"
echo ""

PHASE_A_START=$(date +%s)

# Make scripts executable
chmod +x "$SCRIPT_DIR/api-smoke-test.sh"

if bash "$SCRIPT_DIR/api-smoke-test.sh"; then
    PHASE_A_END=$(date +%s)
    PHASE_A_DURATION=$((PHASE_A_END - PHASE_A_START))
    echo -e "${GREEN}✅ Phase A: PASSED (${PHASE_A_DURATION}s)${NC}"
    echo "Phase A Smoke Testing: PASSED (${PHASE_A_DURATION}s)" >> "$MASTER_RESULTS_DIR/master-execution.log"
    PHASE_A_STATUS="PASSED"
else
    PHASE_A_END=$(date +%s)
    PHASE_A_DURATION=$((PHASE_A_END - PHASE_A_START))
    echo -e "${RED}❌ Phase A: FAILED (${PHASE_A_DURATION}s)${NC}"
    echo "Phase A Smoke Testing: FAILED (${PHASE_A_DURATION}s)" >> "$MASTER_RESULTS_DIR/master-execution.log"
    PHASE_A_STATUS="FAILED"
    
    echo ""
    echo -e "${YELLOW}⚠️  Phase A failed but continuing with Phase B for complete assessment${NC}"
fi

# Copy Phase A results to master directory
if [ -d "./test-results/phase-a-"* ]; then
    latest_phase_a=$(ls -td ./test-results/phase-a-* | head -1)
    cp -r "$latest_phase_a" "$MASTER_RESULTS_DIR/phase-a-results"
    echo "Phase A results copied to master results directory"
fi

echo ""

# =============================================================================
# PHASE B: SYSTEMATIC TEST SUITE EXECUTION
# =============================================================================
echo -e "${BLUE}🧪 PHASE B: SYSTEMATIC TEST SUITE EXECUTION${NC}"
echo "============================================"
echo "Executing comprehensive test suites with real database and endpoints"
echo ""

PHASE_B_START=$(date +%s)

# Make scripts executable
chmod +x "$SCRIPT_DIR/phase-b-test-execution.sh"

if bash "$SCRIPT_DIR/phase-b-test-execution.sh"; then
    PHASE_B_END=$(date +%s)
    PHASE_B_DURATION=$((PHASE_B_END - PHASE_B_START))
    echo -e "${GREEN}✅ Phase B: PASSED (${PHASE_B_DURATION}s)${NC}"
    echo "Phase B Test Execution: PASSED (${PHASE_B_DURATION}s)" >> "$MASTER_RESULTS_DIR/master-execution.log"
    PHASE_B_STATUS="PASSED"
else
    PHASE_B_END=$(date +%s)
    PHASE_B_DURATION=$((PHASE_B_END - PHASE_B_START))
    echo -e "${RED}❌ Phase B: FAILED (${PHASE_B_DURATION}s)${NC}"
    echo "Phase B Test Execution: FAILED (${PHASE_B_DURATION}s)" >> "$MASTER_RESULTS_DIR/master-execution.log"
    PHASE_B_STATUS="FAILED"
fi

# Copy Phase B results to master directory
if [ -d "./test-results/phase-b-"* ]; then
    latest_phase_b=$(ls -td ./test-results/phase-b-* | head -1)
    cp -r "$latest_phase_b" "$MASTER_RESULTS_DIR/phase-b-results"
    echo "Phase B results copied to master results directory"
fi

echo ""

# =============================================================================
# PHASE C: ISSUE ANALYSIS AND RECOMMENDATIONS
# =============================================================================
echo -e "${BLUE}🔧 PHASE C: ISSUE ANALYSIS AND RECOMMENDATIONS${NC}"
echo "=============================================="
echo "Analyzing results and providing actionable recommendations"
echo ""

TOTAL_ISSUES=0
CRITICAL_ISSUES=0
RECOMMENDATIONS=()

# Analyze Phase A results
if [ "$PHASE_A_STATUS" = "FAILED" ]; then
    echo "Analyzing Phase A failures..."
    if [ -f "$MASTER_RESULTS_DIR/phase-a-results/summary.log" ]; then
        phase_a_failures=$(grep "FAIL" "$MASTER_RESULTS_DIR/phase-a-results/summary.log" | wc -l || echo "0")
        TOTAL_ISSUES=$((TOTAL_ISSUES + phase_a_failures))
        
        # Check for specific critical issues
        if grep -q "comments.*FAIL" "$MASTER_RESULTS_DIR/phase-a-results/summary.log"; then
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
            RECOMMENDATIONS+=("FIX CRITICAL: Comments endpoint failing - check StepsApi.groovy implementation")
        fi
        
        if grep -q "Registry.*FAIL" "$MASTER_RESULTS_DIR/phase-a-results/summary.log"; then
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
            RECOMMENDATIONS+=("FIX CRITICAL: StepsAPI endpoints not registered in ScriptRunner")
        fi
    fi
fi

# Analyze Phase B results
if [ "$PHASE_B_STATUS" = "FAILED" ]; then
    echo "Analyzing Phase B failures..."
    if [ -f "$MASTER_RESULTS_DIR/phase-b-results/execution-summary.log" ]; then
        phase_b_failures=$(grep "FAILED" "$MASTER_RESULTS_DIR/phase-b-results/execution-summary.log" | wc -l || echo "0")
        TOTAL_ISSUES=$((TOTAL_ISSUES + phase_b_failures))
        
        # Check for database connectivity issues
        if grep -q "Database.*FAILED" "$MASTER_RESULTS_DIR/phase-b-results/execution-summary.log"; then
            CRITICAL_ISSUES=$((CRITICAL_ISSUES + 1))
            RECOMMENDATIONS+=("FIX CRITICAL: Database connectivity issues - check DatabaseUtil configuration")
        fi
    fi
fi

# =============================================================================
# MASTER REPORT GENERATION
# =============================================================================
echo -e "${PURPLE}📊 GENERATING MASTER REPORT${NC}"
echo "============================"

MASTER_END=$(date +%s)
MASTER_START=$(($PHASE_A_START))
MASTER_DURATION=$((MASTER_END - MASTER_START))

# Generate comprehensive report
cat > "$MASTER_RESULTS_DIR/master-report.md" << EOF
# UMIG US-024 Master Quality Check Report

**Execution Date**: $(date)  
**Total Duration**: ${MASTER_DURATION} seconds  
**Environment**: Development (localhost:8090)  
**Database**: PostgreSQL container  

## Executive Summary

EOF

# Determine overall status
if [ "$PHASE_A_STATUS" = "PASSED" ] && [ "$PHASE_B_STATUS" = "PASSED" ]; then
    OVERALL_STATUS="PASSED"
    echo "- **Overall Status**: ✅ **PASSED** - All quality checks successful" >> "$MASTER_RESULTS_DIR/master-report.md"
    echo "- **US-028 Readiness**: ✅ **READY** - StepsAPI validated for production use" >> "$MASTER_RESULTS_DIR/master-report.md"
elif [ "$PHASE_A_STATUS" = "PASSED" ] && [ "$PHASE_B_STATUS" = "FAILED" ]; then
    OVERALL_STATUS="PARTIAL"
    echo "- **Overall Status**: ⚠️ **PARTIAL** - Endpoints work but test suites failed" >> "$MASTER_RESULTS_DIR/master-report.md"
    echo "- **US-028 Readiness**: ⚠️ **CONDITIONAL** - Review test failures before proceeding" >> "$MASTER_RESULTS_DIR/master-report.md"
else
    OVERALL_STATUS="FAILED"
    echo "- **Overall Status**: ❌ **FAILED** - Critical issues found" >> "$MASTER_RESULTS_DIR/master-report.md"
    echo "- **US-028 Readiness**: ❌ **BLOCKED** - Must resolve issues before proceeding" >> "$MASTER_RESULTS_DIR/master-report.md"
fi

cat >> "$MASTER_RESULTS_DIR/master-report.md" << EOF
- **Total Issues Found**: $TOTAL_ISSUES
- **Critical Issues**: $CRITICAL_ISSUES

## Phase Results

### Phase A: Smoke Testing
- **Status**: $PHASE_A_STATUS
- **Duration**: ${PHASE_A_DURATION}s
- **Objective**: Manual endpoint validation
- **Results**: Located in \`phase-a-results/\`

### Phase B: Test Suite Execution
- **Status**: $PHASE_B_STATUS  
- **Duration**: ${PHASE_B_DURATION}s
- **Objective**: Comprehensive automated testing
- **Results**: Located in \`phase-b-results/\`

## Recommendations

EOF

if [ ${#RECOMMENDATIONS[@]} -eq 0 ]; then
    echo "✅ No critical issues found - system ready for production use" >> "$MASTER_RESULTS_DIR/master-report.md"
else
    echo "**Priority Action Items**:" >> "$MASTER_RESULTS_DIR/master-report.md"
    echo "" >> "$MASTER_RESULTS_DIR/master-report.md"
    for i in "${!RECOMMENDATIONS[@]}"; do
        echo "$((i+1)). ${RECOMMENDATIONS[$i]}" >> "$MASTER_RESULTS_DIR/master-report.md"
    done
fi

cat >> "$MASTER_RESULTS_DIR/master-report.md" << EOF

## Next Steps

EOF

if [ "$OVERALL_STATUS" = "PASSED" ]; then
    cat >> "$MASTER_RESULTS_DIR/master-report.md" << EOF
1. ✅ **Proceed with US-028** - StepsAPI is validated and ready
2. 📋 **Update documentation** - Ensure API specs reflect current implementation  
3. 🚀 **Deploy to staging** - Ready for staging environment testing
4. 📊 **Monitor performance** - Establish production monitoring baselines
EOF
elif [ "$OVERALL_STATUS" = "PARTIAL" ]; then
    cat >> "$MASTER_RESULTS_DIR/master-report.md" << EOF
1. 🔍 **Review test failures** - Analyze specific test suite failures
2. 🔧 **Fix non-critical issues** - Address test framework issues
3. ⚠️ **Conditional US-028** - Can proceed with caution and monitoring
4. 📋 **Document known issues** - Ensure stakeholder awareness
EOF
else
    cat >> "$MASTER_RESULTS_DIR/master-report.md" << EOF
1. 🚨 **Fix critical issues** - Must resolve before any deployment
2. 🔄 **Re-run quality checks** - Validate fixes with this same script
3. 🛑 **Block US-028** - Do not proceed until issues resolved
4. 🆘 **Escalate if needed** - Consider stakeholder involvement
EOF
fi

echo ""
echo "=================================================="
echo "MASTER QUALITY CHECK RESULTS"
echo "=================================================="
echo "Completed: $(date)"
echo "Total Duration: ${MASTER_DURATION}s"
echo ""
echo "PHASE RESULTS:"
echo "- Phase A (Smoke Testing): $PHASE_A_STATUS (${PHASE_A_DURATION}s)"
echo "- Phase B (Test Suites): $PHASE_B_STATUS (${PHASE_B_DURATION}s)"
echo ""

if [ "$OVERALL_STATUS" = "PASSED" ]; then
    echo -e "${GREEN}🎉 OVERALL STATUS: PASSED${NC}"
    echo -e "${GREEN}✅ US-028 READY: StepsAPI validated for production use${NC}"
elif [ "$OVERALL_STATUS" = "PARTIAL" ]; then
    echo -e "${YELLOW}⚠️  OVERALL STATUS: PARTIAL${NC}"
    echo -e "${YELLOW}⚠️  US-028 CONDITIONAL: Review failures before proceeding${NC}"
else
    echo -e "${RED}❌ OVERALL STATUS: FAILED${NC}"
    echo -e "${RED}🛑 US-028 BLOCKED: Must resolve critical issues${NC}"
fi

echo ""
echo "📁 Complete results saved to: $MASTER_RESULTS_DIR/"
echo "📊 Master report: master-report.md"
echo "🔥 Phase A results: phase-a-results/"
echo "🧪 Phase B results: phase-b-results/"
echo "📝 Execution log: master-execution.log"

# Final completion log
echo "" >> "$MASTER_RESULTS_DIR/master-execution.log"
echo "Execution completed: $(date)" >> "$MASTER_RESULTS_DIR/master-execution.log"
echo "Overall Status: $OVERALL_STATUS" >> "$MASTER_RESULTS_DIR/master-execution.log"
echo "Total Issues: $TOTAL_ISSUES" >> "$MASTER_RESULTS_DIR/master-execution.log"
echo "Critical Issues: $CRITICAL_ISSUES" >> "$MASTER_RESULTS_DIR/master-execution.log"

# Exit with appropriate code
case "$OVERALL_STATUS" in
    "PASSED")
        echo -e "${GREEN}✅ Quality check completed successfully!${NC}"
        exit 0
        ;;
    "PARTIAL") 
        echo -e "${YELLOW}⚠️  Quality check completed with warnings. Review before proceeding.${NC}"
        exit 2
        ;;
    *)
        echo -e "${RED}❌ Quality check failed. Must resolve issues before US-028.${NC}"
        exit 1
        ;;
esac