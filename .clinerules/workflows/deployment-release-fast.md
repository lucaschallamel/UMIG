---
description: Fast variant for rapid deployment and release with essential safety checks
---

# Deployment & Release - Fast Track

**Rapid, safe production deployments with automated validation and rollback**

## Prerequisites

- CI/CD pipeline configured
- Deployment environments ready
- Monitoring tools integrated

## Workflow Steps

### Phase 1: Pre-Deployment & Planning

```bash
/gd:deployment-ops-manager --validation_level=standard
/gd:risk-manager --validation_level=standard
```

**Deliverables:** Deployment readiness, risk matrix, backup strategy, stakeholder notifications

### Phase 2: Build & Configuration

```bash
/gd:cicd-builder
/gd:security-architect --validation_level=standard
```

**Deliverables:** Build artifacts, security validation, infrastructure config, compliance checks

### Phase 3: Deployment & Validation

```bash
/gd:deployment-ops-manager --validation_level=standard
/gd:test-suite-generator --test_focus=smoke --validation=production --validation_level=standard
```

**Deliverables:** Blue-green deployment, health checks, smoke tests, rollback ready

### Phase 4: Monitoring & Finalization

```bash
/gd:resource-monitor
/gd:documentation-generator --doc_type=release_notes --validation_level=standard
```

**Deliverables:** Real-time monitoring, alerts configured, release notes, knowledge base updated

## Quality Gates

- **Build**: 100% success required
- **Security**: Zero critical issues
- **Health**: All checks passing
- **Performance**: Within SLA bounds

## Success Criteria

- Zero-downtime deployment
- All tests passing
- Monitoring operational
- Rollback tested
- Documentation complete

## Quick Troubleshooting

- **Health check failures**: Verify endpoints, check dependencies
- **Performance degradation**: Review resource allocation, check cache
- **Rollback needed**: Execute blue-green swap, validate recovery

## Integration

- **Prerequisites**: feature-development, testing-validation
- **Triggers**: incident response, monitoring alerts
