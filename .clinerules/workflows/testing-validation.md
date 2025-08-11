---
description: Comprehensive testing and validation workflow with GENDEV agent orchestration for multi-tiered testing strategies
---

# Testing & Validation Workflow

**Multi-tiered testing with AI-enhanced test generation and quality assurance**

## Purpose

Orchestrate GENDEV agents for comprehensive testing strategies covering unit, integration, E2E, and performance testing with automated validation.

## When to Use

- Feature testing requirements
- Regression testing campaigns
- Performance validation
- Security testing
- CI/CD pipeline integration

## Prerequisites

- GENDEV agents available
- Code ready for testing
- Testing frameworks configured
- Test environment provisioned
- Coverage targets defined

## Workflow Steps

### Phase 1: Test Strategy & Planning

```bash
/gd:qa-coordinator --validation_level=enterprise
/gd:test-suite-generator --test_types=unit,integration,e2e,performance --coverage_target=90 --validation_level=standard
```

**Deliverables:** Risk-based test strategy, test pyramid structure, automation framework, quality metrics

### Phase 2: Unit Testing

```bash
/gd:test-suite-generator --test_focus=unit --coverage_target=95 --validation_level=standard
/gd:code-reviewer
```

**Deliverables:** 95% unit test coverage, edge case testing, mock implementation, test quality validation

### Phase 3: Integration Testing

```bash
/gd:test-suite-generator --test_focus=integration --validation_level=standard
/gd:api-designer
```

**Deliverables:** Component integration tests, API contract validation, service dependency testing

### Phase 4: End-to-End Testing

```bash
/gd:user-story-generator --validation_level=standard
/gd:test-suite-generator --validation_level=standard
```

**Deliverables:** User journey tests, cross-browser validation, accessibility compliance, CI/CD integration

### Phase 5: Performance Testing

```bash
/gd:performance-optimizer --validation_level=enterprise
/gd:performance-optimizer --validation_level=standard
```

**Deliverables:** Load/stress tests, performance benchmarks, scalability validation, resource monitoring

### Phase 6: Security Testing

```bash
/gd:security-analyzer --validation_level=enterprise
/gd:security-analyzer --validation_level=standard
```

**Deliverables:** Vulnerability assessment, penetration tests, compliance validation, risk prioritization

### Phase 7: Test Automation & CI/CD

```bash
/gd:cicd-builder
/gd:deployment-ops-manager --environment_type=testing --validation_level=standard
```

**Deliverables:** CI/CD pipeline integration, quality gates, automated environments, test data management

### Phase 8: Test Reporting & Analysis

```bash
/gd:qa-coordinator --validation_level=standard
/gd:documentation-generator --doc_type=test-report --audience_level=executive --validation_level=standard
```

**Deliverables:** Coverage metrics, quality dashboards, executive reports, risk assessments, trend analysis

## Testing Standards

### Coverage Requirements

- Unit: ≥95% line, ≥90% branch
- Integration: ≥80% component coverage
- E2E: ≥90% user journey coverage
- Performance: 100% critical paths
- Security: 100% attack surface

### Quality Metrics

- Execution: <30min full suite
- Reliability: <2% flaky tests
- Detection: ≥95% defects found
- Automation: ≥90% coverage
- Performance: <200ms p95, <0.1% errors

## Success Criteria

- All coverage targets met
- Test reliability standards achieved
- Performance benchmarks passed
- Zero critical vulnerabilities
- CI/CD fully integrated
- Complete documentation

## Troubleshooting

### Common Issues

**Coverage:** Insufficient tests, missing scenarios, edge cases
**Quality:** Flaky tests, poor maintainability, slow execution
**Automation:** CI/CD complexity, environment inconsistencies

### Resolution

1. Use coverage tools for gap analysis
2. Refactor for quality and speed
3. Standardize environments
4. Evaluate and upgrade tools

## Test Execution Checklist

- [ ] Environment provisioned and configured
- [ ] Test data prepared
- [ ] Automation framework functional
- [ ] CI/CD pipeline integrated
- [ ] Unit tests ≥95% coverage
- [ ] Integration tests validated
- [ ] E2E critical paths covered
- [ ] Performance benchmarks met
- [ ] Security vulnerabilities assessed
- [ ] Results analyzed and documented
- [ ] Metrics collected and reported
- [ ] Defects prioritized
- [ ] Coverage gaps addressed

## Related GENDEV Agents

**Primary:** test-suite-generator, qa-coordinator, performance-optimizer, security-analyzer, test-automation-engineer

**Supporting:** user-story-writer, api-designer, code-quality-analyzer, environment-manager, cicd-builder, documentation-generator

## Integration Points

- **Prerequisites:** feature-development, code-review-quality
- **Parallel:** security-assessment, performance-optimization
- **Triggers:** deployment-release
- **Integrates:** All workflows for quality validation

## Best Practices

1. Test-driven development approach
2. Risk-based test prioritization
3. Automation-first strategy
4. Continuous testing integration
5. Environment consistency
6. Metrics-driven improvements
7. Collaborative testing culture
8. Performance-aware testing
