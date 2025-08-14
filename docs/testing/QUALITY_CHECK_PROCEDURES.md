# Quality Check Procedures Template

## Purpose

This document provides reusable quality validation procedures for any UMIG API or component. These procedures were refined during US-024 and can be adapted for future validation needs.

## Pre-Validation Setup

### Environment Preparation
1. **Start development environment**
   ```bash
   cd local-dev-setup
   npm start
   ```

2. **Verify environment health**
   ```bash
   ./scripts/quality-check/immediate-health-check.sh
   ```

3. **Generate test data (if needed)**
   ```bash
   npm run generate-data:erase
   ```

### Documentation Gathering
- [ ] API specification (OpenAPI/Swagger)
- [ ] Database schema documentation
- [ ] Business requirements
- [ ] Acceptance criteria
- [ ] Known issues or limitations

## Phase A: Smoke Testing

### Objective
Quick validation of basic functionality and endpoint availability

### Execution
```bash
./scripts/quality-check/api-smoke-test.sh --endpoint [target]
```

### Validation Checklist
- [ ] All endpoints responding (not 404)
- [ ] Authentication working
- [ ] Basic CRUD operations functional
- [ ] Error messages are informative
- [ ] Response times acceptable (<3s)

### Expected Outcomes
- Endpoint availability report
- Authentication status
- Basic functionality confirmation
- Initial issue identification

## Phase B: Systematic Testing

### Objective
Comprehensive validation including edge cases and integration points

### Execution
```bash
./scripts/quality-check/phase-b-test-execution.sh
```

### Test Categories

#### 1. Functional Testing
- [ ] Happy path scenarios
- [ ] Boundary conditions
- [ ] Invalid input handling
- [ ] Required field validation
- [ ] Data type validation

#### 2. Integration Testing
- [ ] Database connectivity
- [ ] Cross-service communication
- [ ] External dependency handling
- [ ] Transaction management
- [ ] Cascade operations

#### 3. Performance Testing
- [ ] Response time under normal load
- [ ] Bulk operation handling
- [ ] Pagination efficiency
- [ ] Query optimization
- [ ] Resource utilization

#### 4. Security Testing
- [ ] Authentication enforcement
- [ ] Authorization checks
- [ ] Input sanitization
- [ ] SQL injection prevention
- [ ] XSS protection

#### 5. Error Handling
- [ ] Graceful degradation
- [ ] Meaningful error messages
- [ ] Proper HTTP status codes
- [ ] Error logging
- [ ] Recovery mechanisms

### Expected Outcomes
- Detailed test execution report
- Coverage metrics
- Performance benchmarks
- Security assessment
- Integration verification

## Phase C: Issue Analysis

### Objective
Analyze findings and provide actionable recommendations

### Analysis Framework

#### 1. Issue Categorization
- **Critical**: Blocks functionality, security vulnerabilities
- **High**: Significant impact on user experience
- **Medium**: Functional but suboptimal
- **Low**: Minor improvements, nice-to-have

#### 2. Root Cause Analysis
For each issue:
1. What is the symptom?
2. What is the root cause?
3. What is the impact?
4. What is the recommended fix?
5. What is the effort estimate?

#### 3. Risk Assessment
- Probability of occurrence
- Severity of impact
- Mitigation strategies
- Rollback procedures

### Documentation Template
```markdown
### Issue: [Title]
- **Severity**: Critical/High/Medium/Low
- **Component**: [Affected component]
- **Description**: [What is wrong]
- **Impact**: [User/System impact]
- **Root Cause**: [Why it happens]
- **Recommendation**: [How to fix]
- **Effort**: [Time estimate]
```

## Master Orchestration

### Full Validation Execution
```bash
./scripts/quality-check/master-quality-check.sh
```

### Master Report Sections
1. **Executive Summary**
   - Overall status (PASS/FAIL/PARTIAL)
   - Critical findings
   - Readiness assessment

2. **Phase Results**
   - Phase A outcomes
   - Phase B outcomes
   - Combined assessment

3. **Recommendations**
   - Priority fixes
   - Improvement opportunities
   - Next steps

4. **Metrics**
   - Test coverage
   - Pass/fail rates
   - Performance benchmarks
   - Quality scores

## Decision Criteria

### Go/No-Go Assessment

#### Ready for Production (GO)
- ✅ All critical tests passing
- ✅ No security vulnerabilities
- ✅ Performance within SLAs
- ✅ Error handling robust
- ✅ Documentation complete

#### Conditional Release (CONDITIONAL)
- ⚠️ Non-critical issues present
- ⚠️ Performance acceptable but not optimal
- ⚠️ Minor documentation gaps
- ⚠️ Known limitations documented
- ⚠️ Workarounds available

#### Not Ready (NO-GO)
- ❌ Critical functionality broken
- ❌ Security vulnerabilities found
- ❌ Performance below requirements
- ❌ Data integrity issues
- ❌ Incomplete implementation

## Reporting Template

### Quality Validation Report Structure
```
# [Component] Quality Validation Report

## Executive Summary
- Date: [Date]
- Component: [Name]
- Version: [Version]
- **Status: [PASS/FAIL/PARTIAL]**

## Test Results
### Phase A: Smoke Testing
- Status: [PASS/FAIL]
- Tests Run: [Count]
- Tests Passed: [Count]
- Issues Found: [Count]

### Phase B: Systematic Testing
- Status: [PASS/FAIL]
- Coverage: [Percentage]
- Critical Issues: [Count]
- Total Issues: [Count]

## Issues and Recommendations
[Detailed issue list with recommendations]

## Next Steps
[Action items and timeline]

## Appendices
- Detailed test logs
- Performance metrics
- Security scan results
```

## Best Practices

### Do's
- ✅ Run health check before testing
- ✅ Use verbose mode for debugging
- ✅ Document all findings immediately
- ✅ Test in isolation when troubleshooting
- ✅ Verify fixes with targeted retests

### Don'ts
- ❌ Skip environment verification
- ❌ Ignore warning signs
- ❌ Test in production
- ❌ Modify test data during execution
- ❌ Rush through validation phases

## Customization Guide

### Adapting for Specific APIs
1. Identify API-specific requirements
2. Add custom test cases to `api-smoke-test.sh`
3. Create specialized Groovy tests
4. Update validation checklists
5. Customize report templates

### Adding New Test Types
1. Define test objectives
2. Create test scripts
3. Integrate with phase execution
4. Update documentation
5. Add to master orchestration

## Tools and Resources

### Testing Tools
- `api-smoke-test.sh` - API endpoint testing
- `phase-b-test-execution.sh` - Groovy test runner
- `master-quality-check.sh` - Full orchestration
- `immediate-health-check.sh` - Environment validation

### Monitoring and Logs
- Test results: `test-results/`
- Application logs: `logs/`
- Database logs: PostgreSQL container logs
- Confluence logs: `confluence_data/logs/`

---
*Template Version: 1.0*  
*Last Updated: 2025-08-14*  
*Based on US-024 StepsAPI Validation Experience*