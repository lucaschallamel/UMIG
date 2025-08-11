---
description: Comprehensive code review and quality assurance workflow with GENDEV agent orchestration for systematic review and quality validation
---

# Code Review & Quality Workflow

**AI-enhanced code review with systematic quality assessment, security validation, and improvement recommendations**

## Purpose

Orchestrate GENDEV agents for comprehensive code review through quality assessment, security validation, performance analysis, and actionable improvement recommendations.

## When to Use

- Pull request reviews
- Pre-deployment validation
- Code quality audits
- Security assessments
- Technical debt evaluation
- Refactoring validation

## Prerequisites

- GENDEV agents available
- Version control configured
- Code standards defined
- Review guidelines established
- Quality metrics agreed

## Workflow Steps

### Phase 1: Review Preparation & Context

```bash
/gd:code-reviewer
/gd:requirements-validator --validation_level=standard
```

**Deliverables:** Change context, requirements alignment, impact analysis, review scope, quality baseline

### Phase 2: Code Quality Analysis

```bash
/gd:code-reviewer
/gd:code-refactoring-specialist
```

**Deliverables:** Code quality metrics, maintainability score, complexity analysis, duplication detection, improvement opportunities

### Phase 3: Security Review

```bash
/gd:security-analyzer --validation_level=enterprise
/gd:security-architect --validation_level=standard
```

**Deliverables:** Vulnerability assessment, security patterns validation, authentication review, data protection verification

### Phase 4: Performance Analysis

```bash
/gd:performance-optimizer --validation_level=standard
/gd:resource-monitor
```

**Deliverables:** Performance hotspots, resource usage analysis, optimization opportunities, scalability assessment

### Phase 5: Testing Validation

```bash
/gd:test-suite-generator --validation_level=standard
/gd:qa-coordinator --validation_level=standard
```

**Deliverables:** Test coverage analysis, test quality assessment, missing test scenarios, test effectiveness validation

### Phase 6: Standards Compliance

```bash
/gd:code-reviewer
/gd:documentation-generator --validation_level=standard
```

**Deliverables:** Coding standards compliance, naming conventions, documentation completeness, API documentation validation

### Phase 7: Feedback & Recommendations

```bash
/gd:code-reviewer
/gd:training-change-manager --validation_level=standard
```

**Deliverables:** Review feedback, improvement priorities, learning recommendations, best practice guidance

### Phase 8: Review Finalization

```bash
/gd:documentation-generator --doc_type=review_summary --validation_level=standard
/gd:stakeholder-communicator --validation_level=standard
```

**Deliverables:** Review summary, action items, approval status, follow-up plan, knowledge sharing

## Code Review Standards

### Quality Metrics

- Code coverage: >80% overall, >90% critical
- Cyclomatic complexity: <10 per method
- Duplication: <3% across codebase
- Documentation: 100% public APIs
- Security: Zero high-risk vulnerabilities

### Review Criteria

- **Functionality**: Meets requirements, handles edge cases
- **Quality**: Clean, maintainable, efficient
- **Security**: No vulnerabilities, proper validation
- **Performance**: Optimized, scalable
- **Testing**: Comprehensive, effective

## Success Criteria

- All critical issues addressed
- Quality metrics met
- Security validated
- Performance verified
- Tests comprehensive
- Documentation complete

## Troubleshooting

### Common Issues

**Quality:** High complexity, code duplication, poor naming
**Security:** Input validation gaps, authentication flaws, data exposure
**Performance:** Inefficient algorithms, resource leaks, blocking operations
**Testing:** Low coverage, missing edge cases, brittle tests

### Resolution

1. Systematic review approach
2. Automated quality checks
3. Security scanning tools
4. Performance profiling
5. Test gap analysis

## Code Review Checklist

- [ ] Requirements met
- [ ] Design appropriate
- [ ] Code quality high
- [ ] Naming clear
- [ ] No duplication
- [ ] Error handling complete
- [ ] Security validated
- [ ] Performance optimized
- [ ] Tests comprehensive
- [ ] Documentation complete
- [ ] Standards followed
- [ ] Edge cases handled
- [ ] Resources managed
- [ ] Logging appropriate
- [ ] Comments helpful
- [ ] APIs documented
- [ ] Changes justified
- [ ] Impact assessed

## Related GENDEV Agents

**Primary:** code-reviewer, security-analyzer, performance-optimizer, test-suite-generator, code-refactoring-specialist

**Supporting:** requirements-validator, security-architect, resource-monitor, qa-coordinator, documentation-generator, training-change-manager, stakeholder-communicator

## Integration Points

- **Prerequisites:** feature-development, bug-investigation
- **Parallel:** testing-validation, security-assessment
- **Triggers:** deployment-release, documentation-generation
- **Integrates:** Version control, CI/CD pipeline

## Best Practices

1. Systematic review process
2. Automated quality checks
3. Constructive feedback
4. Security-first mindset
5. Performance awareness
6. Test-driven validation
7. Documentation emphasis
8. Continuous learning
