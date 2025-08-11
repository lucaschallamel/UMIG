---
description: Systematic bug investigation and resolution workflow with GENDEV agent orchestration for root cause analysis, impact assessment, and comprehensive resolution
---

# Bug Investigation & Resolution Workflow

**Systematic bug investigation with AI-enhanced root cause analysis, impact assessment, and resolution tracking**

## Purpose

Leverage GENDEV agents to systematically investigate, analyze, and resolve bugs through structured root cause analysis, impact assessment, and validated resolution implementation.

## When to Use

- Critical production issues
- Customer-reported bugs
- QA findings and regressions
- Performance degradation
- Security vulnerabilities
- Data integrity issues

## Prerequisites

- GENDEV agents available
- Bug tracking system configured
- Access to logs and monitoring
- Test environments available
- Root cause procedures established

## Workflow Steps

### Phase 1: Issue Triage & Initial Assessment

```bash
/gd:risk-manager --validation_level=enterprise --severity_assessment=automated
/gd:test-suite-generator --test_focus=reproduction --validation_level=standard
```

**Deliverables:** Bug validation, severity classification, impact assessment, reproducibility validation, resource allocation

### Phase 2: Root Cause Analysis

```bash
/gd:risk-manager --validation_level=strict
/gd:system-architect --validation_level=standard
```

**Deliverables:** Root cause identification, system diagnostics, code flow analysis, performance metrics, error patterns

### Phase 3: Impact Analysis & Risk Assessment

```bash
/gd:risk-manager --validation_level=enterprise
/gd:risk-manager --validation_level=standard
```

**Deliverables:** Component impact, user impact, business risk, dependency analysis, mitigation strategies

### Phase 4: Solution Design & Implementation

```bash
/gd:risk-manager --validation_level=standard
/gd:code-refactoring-specialist
```

**Deliverables:** Solution design, fix implementation, refactoring, edge case handling, performance optimization

### Phase 5: Testing & Validation

```bash
/gd:test-suite-generator --test_focus=bug_fix --validation_level=standard
/gd:qa-coordinator --validation_level=standard
```

**Deliverables:** Fix validation, regression tests, integration testing, performance validation, UAT coordination

### Phase 6: Code Review & Quality Assurance

```bash
/gd:code-reviewer
/gd:security-analyzer --validation_level=standard
```

**Deliverables:** Code review, security validation, quality metrics, compliance check, documentation review

### Phase 7: Deployment & Monitoring

```bash
/gd:deployment-ops-manager --validation_level=standard
/gd:resource-monitor
```

**Deliverables:** Deployment plan, rollback strategy, monitoring setup, alerting configuration, validation metrics

### Phase 8: Documentation & Knowledge Sharing

```bash
/gd:documentation-generator --doc_type=incident_report --validation_level=standard
/gd:stakeholder-communicator --validation_level=standard
```

**Deliverables:** Incident report, root cause documentation, lessons learned, knowledge base update, stakeholder updates

## Bug Resolution Standards

### Severity Levels

- **Critical (P0)**: System down, data loss - 4hr SLA
- **High (P1)**: Major functionality broken - 24hr SLA
- **Medium (P2)**: Functionality impaired - 72hr SLA
- **Low (P3)**: Minor issues - Next release

### Quality Metrics

- Fix effectiveness: 100% resolution
- Test coverage: >95% affected areas
- Performance impact: <5% degradation
- Security: Zero new vulnerabilities
- Documentation: Complete incident report

## Success Criteria

- Root cause identified and documented
- Fix validated with comprehensive testing
- No regression introduced
- Performance benchmarks maintained
- Security posture improved or maintained
- Complete documentation and knowledge transfer

## Troubleshooting

### Common Challenges

**Investigation:** Intermittent bugs, complex dependencies, limited logging, production access
**Resolution:** Root cause complexity, regression risks, performance impact, time pressure
**Testing:** Coverage gaps, data sensitivity, environment differences, integration complexity

### Resolution

1. Systematic investigation methodology
2. Enhanced logging and tracing
3. Incremental fixes with validation
4. Risk assessment and mitigation
5. Clear stakeholder communication

## Bug Investigation Checklist

- [ ] Bug report validated
- [ ] Severity assigned
- [ ] Reproducibility confirmed
- [ ] Impact assessed
- [ ] Root cause identified
- [ ] Solution designed
- [ ] Fix implemented
- [ ] Tests written
- [ ] Code reviewed
- [ ] Security validated
- [ ] Regression tested
- [ ] Performance verified
- [ ] Deployment planned
- [ ] Monitoring configured
- [ ] Production validated
- [ ] Documentation complete
- [ ] Lessons learned captured
- [ ] Knowledge base updated

## Related GENDEV Agents

**Primary:** bug-tracker, root-cause-analyzer, impact-analyzer, test-suite-generator, code-reviewer

**Supporting:** system-analyzer, risk-manager, problem-solver, code-refactoring-specialist, qa-coordinator, security-analyzer, deployment-ops-manager, resource-monitor, documentation-generator, stakeholder-communicator

## Integration Points

- **Prerequisites:** Bug tracking system, monitoring tools
- **Parallel:** code-review-quality, testing-validation
- **Triggers:** deployment-release, documentation-generation
- **Integrates:** Incident management, knowledge base

## Best Practices

1. Systematic investigation approach
2. Root cause over symptom fixing
3. Comprehensive validation testing
4. Risk-based prioritization
5. Clear communication throughout
6. Documentation for future prevention
7. Continuous process improvement
8. Knowledge sharing culture
