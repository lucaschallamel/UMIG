---
description: Fast variant for rapid bug investigation and resolution with root cause focus
---

# Bug Investigation & Resolution - Fast Track

**Rapid bug triage, root cause analysis, and validated resolution**

## Prerequisites

- Bug tracking system configured
- Access to logs and monitoring
- Test environments available

## Workflow Steps

### Phase 1: Triage & Analysis

```bash
/gd:risk-manager --triage=automated --severity_assessment=impact_based --root_cause=comprehensive --risk_focus=technical --assessment_depth=forensic --validation_level=strict
/gd:test-suite-generator --test_focus=reproduction --validation=automated --test_style=exploratory --coverage_target=95 --validation_level=strict
```

**Deliverables:** Severity classification, reproducible test case, root cause identified, impact assessment

### Phase 2: Solution & Implementation

```bash
/gd:code-refactoring-specialist --refactoring_focus=bug_fix --risk_tolerance=conservative --scope=targeted --testing_strategy=comprehensive
/gd:system-architect --architecture_type=microservices --scale=enterprise --complexity=high --validation_level=strict
```

**Deliverables:** Fix implementation, dependency validation, edge case handling, performance verified

### Phase 3: Testing & Validation

```bash
/gd:test-suite-generator --test_types=regression,integration --coverage=fix_focused --test_style=tdd --coverage_target=90 --validation_level=enterprise
/gd:qa-coordinator --quality_focus=comprehensive --methodology=risk_based --maturity_level=optimized --validation_level=strict
```

**Deliverables:** Regression tests, fix validation, integration verified, UAT passed

### Phase 4: Deployment & Documentation

```bash
/gd:deployment-ops-manager --deployment_strategy=blue_green --environment_type=production --monitoring_depth=comprehensive --validation_level=strict --recovery_strategy=automated
/gd:documentation-generator --doc_type=incident_report --audience_level=technical --format_style=detailed --validation_level=strict --content_strategy=comprehensive
```

**Deliverables:** Hotfix deployed, monitoring active, incident report, knowledge base updated

## Quality Gates

- **Root Cause**: Identified and validated
- **Testing**: >95% coverage on affected areas
- **Regression**: Zero new issues introduced
- **Performance**: No degradation

## Success Criteria

- Root cause documented
- Fix validated in production
- No regression introduced
- Performance maintained
- Lessons learned captured

## Quick Troubleshooting

- **Can't reproduce**: Check environment differences, review logs
- **Fix causes regression**: Expand test coverage, review dependencies
- **Performance impact**: Profile changes, optimize critical path

## Integration

- **Prerequisites**: Bug tracking, monitoring tools
- **Triggers**: deployment-release, code-review-quality
