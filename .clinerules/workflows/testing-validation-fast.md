---
description: Fast variant for rapid testing and validation with essential coverage and quality gates
---

# Testing & Validation - Fast Track

**Rapid test execution with automated coverage, quality validation, and CI/CD integration**

## Prerequisites

- Code ready for testing
- Testing frameworks configured
- Test environments available

## Workflow Steps

### Phase 1: Test Strategy & Unit Testing

```bash
/gd:qa-coordinator --validation_level=standard
/gd:test-suite-generator --coverage=90 --validation_level=standard
```

**Deliverables:** Test strategy, 90% unit coverage, integration tests, edge case validation, automation framework

### Phase 2: E2E & Performance Testing

```bash
/gd:test-suite-generator --validation_level=standard
/gd:performance-optimizer --validation_level=standard
```

**Deliverables:** User journey tests, performance benchmarks, load validation, browser compatibility

### Phase 3: Security & Quality Validation

```bash
/gd:security-analyzer --validation_level=standard
/gd:code-reviewer
```

**Deliverables:** Security test results, vulnerability assessment, test quality validation, coverage analysis

### Phase 4: CI/CD Integration & Reporting

```bash
/gd:cicd-builder
/gd:qa-coordinator --validation_level=standard
```

**Deliverables:** CI/CD integration, quality dashboard, test metrics, execution reports

## Quality Gates

- **Coverage**: >90% unit, >80% integration
- **Performance**: SLA compliance, <200ms p95
- **Security**: Zero critical vulnerabilities
- **Reliability**: <2% flaky tests

## Success Criteria

- Coverage targets met
- Performance benchmarks passed
- Security validated
- CI/CD integrated
- Quality metrics tracked

## Quick Troubleshooting

- **Low coverage**: Generate missing tests, focus on critical paths
- **Flaky tests**: Fix timing issues, improve test data management
- **Slow execution**: Parallelize tests, optimize test data

## Integration

- **Prerequisites**: feature-development, code-review-quality
- **Triggers**: deployment-release, production validation
