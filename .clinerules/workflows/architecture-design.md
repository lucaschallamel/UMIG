---
description: Comprehensive architecture design workflow with GENDEV agent orchestration for system architecture, design validation, and technical decision documentation
---

# Architecture Design Workflow

**Systematic architecture design with AI-enhanced analysis, validation, and technical decision documentation**

## Purpose

Orchestrate GENDEV agents to design robust, scalable system architectures through systematic analysis, stakeholder alignment, design validation, and comprehensive documentation.

## When to Use

- New system architecture design
- Legacy system modernization
- Architecture review and optimization
- Technical debt reduction
- Scalability planning
- Integration architecture

## Prerequisites

- GENDEV agents available
- Business requirements defined
- Technical requirements specified
- Stakeholder alignment
- Architecture principles established

## Workflow Steps

### Phase 1: Requirements Analysis & Context

```bash
/gd:requirements-analyst --validation_level=standard --timeline_constraint=normal --domain_complexity=medium
/gd:system-architect --validation_level=enterprise
```

**Deliverables:** Functional/non-functional requirements, quality attributes, constraints, technology landscape, resource limitations

### Phase 2: Architecture Strategy & Principles

```bash
/gd:system-architect --validation_level=standard
/gd:system-architect --validation_level=enterprise
```

**Deliverables:** Architecture vision, design principles, technology stack, integration patterns, quality trade-offs

### Phase 3: System Architecture Design

```bash
/gd:system-architect --validation_level=standard
/gd:interface-designer --validation_level=enterprise
```

**Deliverables:** System decomposition, architecture patterns, component interfaces, data flow, system boundaries

### Phase 4: Data Architecture Design

```bash
/gd:database-schema-designer --validation_level=enterprise
/gd:system-architect --validation_level=standard
```

**Deliverables:** Data models, storage strategy, partitioning, consistency management, data pipelines, event streaming

### Phase 5: API & Integration Design

```bash
/gd:api-designer
/gd:system-architect --validation_level=standard
```

**Deliverables:** API strategy, RESTful/GraphQL design, versioning, service mesh, messaging, resilience patterns

### Phase 6: Security & Performance Architecture

```bash
/gd:security-architect --validation_level=enterprise
/gd:performance-optimizer --validation_level=standard
```

**Deliverables:** Security architecture, threat model, authentication/authorization, performance patterns, caching, monitoring

### Phase 7: Architecture Validation & Review

```bash
/gd:design-reviewer --validation_level=enterprise
/gd:stakeholder-communicator --validation_level=standard
```

**Deliverables:** Quality validation, pattern compliance, risk assessment, stakeholder approval, change management

### Phase 8: Documentation & Communication

```bash
/gd:documentation-generator --doc_type=architecture --validation_level=standard
/gd:documentation-generator --validation_level=standard
```

**Deliverables:** C4 diagrams, ADRs, technical specs, implementation guides, code templates, deployment procedures

## Architecture Quality Attributes

### Performance

- Response time <200ms
- Horizontal scalability
- Linear performance scaling
- Resource efficiency

### Reliability

- 99.9% availability
- Fault tolerance
- Automated recovery
- Data integrity

### Security

- Multi-factor authentication
- RBAC authorization
- Encryption at rest/transit
- Compliance adherence

### Maintainability

- Loosely coupled components
- Comprehensive testing
- Complete documentation
- Future extensibility

## Success Criteria

- Stakeholder approval achieved
- Quality requirements satisfied
- Patterns validated
- Documentation complete
- Implementation ready
- Risks mitigated

## Troubleshooting

### Common Challenges

**Requirements:** Ambiguous attributes, scope creep, misalignment, constraint underestimation
**Design:** Pattern complexity, technology decisions, trade-offs, compliance integration
**Communication:** Technical complexity, stakeholder buy-in, documentation clarity

### Resolution

1. Iterative design with validation
2. Continuous stakeholder engagement
3. Prototype validation
4. Early risk mitigation
5. Documentation excellence

## Architecture Design Checklist

- [ ] Requirements documented
- [ ] Quality attributes prioritized
- [ ] Context analyzed
- [ ] Technology landscape assessed
- [ ] Constraints identified
- [ ] Vision defined
- [ ] Principles established
- [ ] Technology stack selected
- [ ] Integration patterns defined
- [ ] Trade-offs analyzed
- [ ] High-level design complete
- [ ] Components specified
- [ ] Data architecture designed
- [ ] APIs defined
- [ ] Security integrated
- [ ] Attributes validated
- [ ] Patterns verified
- [ ] Risks assessed
- [ ] Stakeholder approval
- [ ] Documentation complete

## Related GENDEV Agents

**Primary:** system-architect, requirements-analyst, api-designer, database-schema-designer, security-architect

**Supporting:** system-analyst, technology-advisor, component-designer, integration-architect, performance-architect, architecture-reviewer, documentation-generator, stakeholder-manager, implementation-guide-creator

## Integration Points

- **Prerequisites:** Business requirements, technical constraints
- **Parallel:** api-development, security-assessment
- **Triggers:** feature-development, performance-optimization
- **Integrates:** All development workflows

## Best Practices

1. Quality attribute focus
2. Stakeholder engagement
3. Iterative refinement
4. Documentation excellence
5. Risk management
6. Pattern application
7. Implementation alignment
8. Continuous evolution
