---
description: Fast variant for rapid pull request creation with essential validation and comprehensive descriptions
---

# Pull Request - Fast Track

**Rapid PR creation with code quality validation, comprehensive descriptions, and review readiness**

## Prerequisites

- Development work completed
- Code quality standards defined
- Project style guidelines established

## Workflow Steps

### Phase 1: Pre-PR Validation & Quality

```bash
/gd:code-reviewer
/gd:security-architect --validation_level=standard
```

**Deliverables:** Code quality analysis, security validation, compliance check, performance assessment

### Phase 2: Scope Analysis & Documentation

```bash
/gd:documentation-generator --validation_level=standard
git log main..HEAD --stat --oneline && git diff main..HEAD --name-status
```

**Deliverables:** PR scope analysis, work stream identification, file impact assessment, commit categorization

### Phase 3: Testing & Integration

```bash
/gd:test-suite-generator --validation=comprehensive --coverage=95 --validation_level=standard
/gd:qa-coordinator --validation_level=standard
```

**Deliverables:** Test validation, coverage verification, integration testing, quality assurance

### Phase 4: PR Generation & Review Readiness

```bash
/gd:documentation-generator --validation_level=standard
```

**Deliverables:** Complete PR description, testing instructions, review focus areas, deployment notes

## Quality Gates

- **Code**: Lint/format/test passing, quality standards met
- **Security**: Zero critical vulnerabilities
- **Coverage**: >95% test coverage maintained
- **Documentation**: Rule 03/07 compliance verified

## Success Criteria

- Quality validation passed
- Multi-stream PR documented
- Testing instructions clear
- Review readiness verified
- Anti-tunnel vision validated

## Quick Troubleshooting

- **Quality issues**: Run lint/format/test, address violations
- **Missing context**: Review commits, analyze file changes comprehensively
- **Incomplete coverage**: Identify missing work streams, expand testing

## Integration

- **Prerequisites**: Feature development complete, commit workflow
- **Triggers**: Code review process, deployment preparation
