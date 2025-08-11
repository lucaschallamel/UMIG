---
description: Fast variant for rapid feature development with integrated quality assurance
---

# Feature Development - Fast Track

**Rapid feature delivery with architecture, testing, and security built-in**

## Prerequisites

- Feature requirements defined
- Development environment ready
- Team capacity allocated

## Workflow Steps

### Phase 1: Planning & Design

```bash
/gd:requirements-analyst --validation_level=standard --timeline_constraint=normal --domain_complexity=medium
/gd:system-architect --validation_level=standard
```

**Deliverables:** User stories, acceptance criteria, component design, API contracts, data models

### Phase 2: Implementation & Security

```bash
/gd:code-refactoring-specialist
/gd:interface-designer --validation_level=standard
```

**Deliverables:** Business logic, UI components, security controls, responsive design

### Phase 3: Testing & Quality

```bash
/gd:test-suite-generator --test_types=unit,integration,e2e --validation_level=standard
/gd:code-reviewer
```

**Deliverables:** 90% test coverage, security validated, code quality verified, edge cases tested

### Phase 4: Documentation & Deployment

```bash
/gd:documentation-generator --validation_level=standard
/gd:deployment-ops-manager --validation_level=standard
```

**Deliverables:** User guides, API docs, staged deployment, monitoring active, rollback plan

## Quality Gates

- **Code**: Clean, maintainable, secure
- **Testing**: >90% coverage, all types passing
- **Security**: Zero high-risk vulnerabilities
- **Performance**: Meets requirements

## Success Criteria

- Feature meets acceptance criteria
- Tests comprehensive and passing
- Security validated
- Documentation complete
- Deployment successful

## Quick Troubleshooting

- **Test failures**: Check test data, review mocks
- **Performance issues**: Profile code, optimize queries
- **Integration problems**: Validate contracts, check versions

## Integration

- **Prerequisites**: Requirements defined
- **Triggers**: testing-validation, deployment-release
