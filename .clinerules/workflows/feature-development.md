---
description: End-to-end feature development workflow with GENDEV agent orchestration
---

# Feature Development Workflow

**AI-assisted feature development from requirements through deployment**

## Purpose

Orchestrate GENDEV agents to deliver high-quality features from requirements through production, ensuring architectural consistency, security, and testing.

## When to Use

- New feature development
- Feature enhancement
- Multi-component features
- Customer requests
- Strategic initiatives

## Prerequisites

- GENDEV agents available
- Requirements defined
- Architecture guidelines set
- Environment configured
- Team capacity allocated

## Workflow Steps

### Phase 1: Requirements & Planning

```bash
/gd:requirements-analyst --validation_level=enterprise --stakeholder_count=12 --timeline_constraint=normal --domain_complexity=medium
/gd:user-story-generator --story_format=gherkin --validation_level=standard
/gd:project-planner --methodology=agile --validation_level=standard --timeline_constraint=normal
```

**Deliverables:** User stories, acceptance criteria, sprint plan, risk mitigation, quality gates

### Phase 2: Architecture & Design

```bash
/gd:system-architect --validation_level=standard
/gd:api-designer
/gd:database-schema-designer --database_type=relational --validation_level=standard
```

**Deliverables:** Component architecture, API specs, database schema, integration patterns

### Phase 3: Implementation

```bash
/gd:deployment-ops-manager --environment_type=development --validation_level=standard
/gd:code-refactoring-specialist
/gd:interface-designer --validation_level=standard
```

**Deliverables:** Dev environment, business logic, API endpoints, UI components, responsive design

### Phase 4: Testing & Quality

```bash
/gd:test-suite-generator --test_types=unit,integration,e2e --coverage_target=90 --validation_level=standard
/gd:code-reviewer --review_depth=comprehensive
/gd:security-analyzer --validation_level=standard
```

**Deliverables:** 90% test coverage, security validation, code quality review, vulnerability assessment

### Phase 5: Integration & Deployment

```bash
/gd:cicd-builder
/gd:performance-optimizer --validation_level=standard
/gd:documentation-generator --doc_type=feature --audience_level=mixed --validation_level=standard
```

**Deliverables:** CI/CD pipeline, performance validation, documentation suite, deployment guides

### Phase 6: Release & Monitoring

```bash
/gd:deployment-ops-manager --validation_level=standard
/gd:qa-coordinator --validation_level=standard
```

**Deliverables:** Production deployment, monitoring setup, post-release validation, user adoption metrics

## Success Criteria

- 100% acceptance criteria met
- > 90% test coverage
- Zero critical security issues
- Sub-2s response times
- 99.9% availability
- Complete documentation
- Successful deployment

## Troubleshooting

### Common Issues

**Requirements:** Ambiguous specs, conflicting priorities, scope creep
**Technical:** Integration complexity, performance issues, vulnerabilities
**Process:** Timeline delays, quality failures, deployment issues

### Resolution

1. Early requirements validation
2. Iterative design approach
3. Continuous automated testing
4. Proactive risk mitigation
5. Regular stakeholder updates

## Related GENDEV Agents

**Primary:** requirements-analyst, system-architect, project-planner, test-suite-generator, code-reviewer

**Supporting:** user-story-writer, api-designer, database-schema-designer, security-analyzer, performance-optimizer, documentation-generator, cicd-builder, deployment-ops-manager

## Integration Points

- **Prerequisites:** project-planner → feature-development
- **Parallel:** code-review-quality, testing-validation
- **Follows:** architecture-design, api-development
- **Triggers:** deployment-release, documentation-generation

## Best Practices

1. Sequential agent orchestration
2. Quality gates at phase transitions
3. Continuous documentation
4. Early security integration
5. Performance monitoring throughout
6. Regular stakeholder engagement
7. Proactive risk management
8. Iterative refinement approach
