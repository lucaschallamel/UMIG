---
description: Fast variant for rapid API development with essential quality gates
---

# API Development - Fast Track

**Rapid API delivery with security, testing, and documentation essentials**

## Prerequisites

- GENDEV agents available
- API requirements defined
- Development environment ready

## Workflow Steps

### Phase 1: Design & Specification

```bash
/gd:api-designer
/gd:requirements-analyst --domain_complexity=medium --validation_level=standard --timeline_constraint=normal
```

**Deliverables:** OpenAPI spec, endpoint design, data models, auth strategy, integration patterns

### Phase 2: Implementation & Security

```bash
/gd:code-refactoring-specialist
/gd:security-architect --validation_level=standard
```

**Deliverables:** API endpoints, business logic, JWT auth, RBAC, input validation, rate limiting

### Phase 3: Testing & Performance

```bash
/gd:test-suite-generator --test_types=unit,integration,contract --coverage_target=90 --validation_level=standard
/gd:performance-optimizer --validation_level=standard
```

**Deliverables:** 90% test coverage, contract tests, load testing results, performance metrics

### Phase 4: Documentation & Deployment

```bash
/gd:documentation-generator --doc_type=api --validation_level=standard
/gd:deployment-ops-manager --validation_level=standard
```

**Deliverables:** Interactive API docs, deployment pipeline, monitoring dashboard, SLA tracking

## Quality Gates

- **Security**: Zero critical vulnerabilities, auth/authz validated
- **Testing**: >90% coverage, contract tests passing
- **Performance**: <200ms response time, load tested
- **Documentation**: OpenAPI complete, examples provided

## Success Criteria

- All endpoints functional with validation
- Security scan passed
- Performance within SLA
- Documentation interactive
- Monitoring operational

## Quick Troubleshooting

- **Slow responses**: Check database queries, enable caching
- **Auth failures**: Verify JWT configuration, check RBAC rules
- **Integration issues**: Validate API contracts, check versioning

## Integration

- **Prerequisites**: Requirements defined
- **Triggers**: deployment-release, testing-validation
