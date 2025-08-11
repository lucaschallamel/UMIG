---
description: Comprehensive deployment and release workflow with GENDEV agent orchestration for automated, safe, and monitored production deployments
---

# Deployment & Release Workflow

**Automated deployment with AI-enhanced validation, rollback strategies, and comprehensive monitoring**

## Purpose

Orchestrate GENDEV agents for safe, automated production deployments with validation gates, rollback capabilities, and comprehensive monitoring.

## When to Use

- Production releases
- Hotfix deployments
- Feature rollouts
- Infrastructure updates
- Configuration changes
- Emergency patches

## Prerequisites

- GENDEV agents available
- CI/CD pipeline configured
- Deployment environments ready
- Monitoring tools integrated
- Rollback procedures defined

## Workflow Steps

### Phase 1: Pre-Deployment Preparation

```bash
/gd:deployment-ops-manager --validation_level=enterprise
/gd:risk-manager --validation_level=standard
```

**Deliverables:** Deployment readiness, risk assessment, dependency validation, resource verification, backup strategy

### Phase 2: Release Planning & Coordination

```bash
/gd:project-planner --validation_level=standard --timeline_constraint=normal
/gd:stakeholder-communicator --validation_level=standard
```

**Deliverables:** Release plan, deployment schedule, stakeholder notifications, change windows, approval gates

### Phase 3: Build & Package Management

```bash
/gd:cicd-builder
/gd:dependency-manager --validation_level=standard
```

**Deliverables:** Build artifacts, dependency validation, version tagging, security scanning, artifact repository

### Phase 4: Environment Configuration

```bash
/gd:iac-automation-engineer
/gd:security-architect --validation_level=standard
```

**Deliverables:** Infrastructure provisioning, configuration management, security hardening, compliance validation

### Phase 5: Deployment Execution

```bash
/gd:deployment-ops-manager --deployment_strategy=blue_green --validation_level=standard
/gd:resource-monitor
```

**Deliverables:** Blue-green deployment, progressive rollout, health checks, monitoring alerts, validation gates

### Phase 6: Testing & Validation

```bash
/gd:test-suite-generator --test_focus=smoke --validation_level=standard
/gd:qa-coordinator --validation_level=standard
```

**Deliverables:** Smoke tests, integration validation, performance benchmarks, user acceptance, security verification

### Phase 7: Monitoring & Observability

```bash
/gd:resource-monitor
/gd:performance-optimizer --validation_level=standard
```

**Deliverables:** Real-time monitoring, performance dashboards, anomaly detection, SLA tracking, alert configuration

### Phase 8: Post-Deployment Activities

```bash
/gd:documentation-generator --doc_type=release_notes --audience_level=mixed --validation_level=standard
/gd:training-change-manager --training_scope=new_features --validation_level=standard
```

**Deliverables:** Release notes, deployment documentation, training materials, knowledge base updates, lessons learned

## Deployment Standards

### Deployment Strategies

- **Blue-Green**: Zero-downtime with instant rollback
- **Canary**: Progressive rollout with monitoring
- **Rolling**: Gradual replacement of instances
- **Feature Flags**: Controlled feature activation

### Quality Gates

- Build success: 100% required
- Test coverage: >90% passing
- Security scan: Zero critical issues
- Performance: Within SLA bounds
- Health checks: All passing

## Success Criteria

- Zero-downtime deployment
- All tests passing
- Performance maintained
- Security verified
- Monitoring operational
- Documentation complete

## Troubleshooting

### Common Issues

**Preparation:** Missing dependencies, configuration drift, resource constraints
**Deployment:** Failed health checks, rollback triggers, network issues
**Post-Deploy:** Performance degradation, unexpected errors, monitoring gaps

### Resolution

1. Automated rollback on failure
2. Progressive rollout validation
3. Real-time monitoring alerts
4. Clear escalation procedures
5. Comprehensive logging

## Deployment Checklist

- [ ] Risk assessment complete
- [ ] Stakeholders notified
- [ ] Backup created
- [ ] Dependencies validated
- [ ] Build artifacts ready
- [ ] Security scan passed
- [ ] Infrastructure provisioned
- [ ] Configuration validated
- [ ] Deployment executed
- [ ] Health checks passing
- [ ] Smoke tests passed
- [ ] Performance validated
- [ ] Monitoring active
- [ ] Alerts configured
- [ ] Documentation updated
- [ ] Team briefed
- [ ] Rollback tested
- [ ] Success metrics met

## Related GENDEV Agents

**Primary:** deployment-ops-manager, cicd-builder, resource-monitor, qa-coordinator, iac-automation-engineer

**Supporting:** risk-manager, project-planner, stakeholder-communicator, dependency-manager, security-architect, test-suite-generator, performance-optimizer, documentation-generator, training-change-manager

## Integration Points

- **Prerequisites:** feature-development, testing-validation
- **Parallel:** monitoring setup, documentation-generation
- **Triggers:** incident response, rollback procedures
- **Integrates:** CI/CD pipeline, monitoring systems

## Best Practices

1. Automated deployment pipelines
2. Progressive rollout strategies
3. Comprehensive validation gates
4. Real-time monitoring
5. Automated rollback capability
6. Clear communication plans
7. Documentation automation
8. Continuous improvement
