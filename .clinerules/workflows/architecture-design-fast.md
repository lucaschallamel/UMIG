---
description: Fast variant for rapid architecture design with essential quality attributes and validation
---

# Architecture Design - Fast Track

**Rapid architecture decisions with quality validation, patterns, and documentation**

## Prerequisites

- Business requirements defined
- Technical constraints known
- Architecture principles established

## Workflow Steps

### Phase 1: Analysis & Strategy

```bash
/gd:requirements-analyst --validation_level=standard --timeline_constraint=normal --domain_complexity=medium
/gd:system-architect --validation_level=standard
```

**Deliverables:** Quality attributes, constraints, architecture vision, technology stack, design patterns

### Phase 2: System & Data Design

```bash
/gd:system-architect --validation_level=standard
/gd:database-schema-designer --validation_level=standard
```

**Deliverables:** Component architecture, data models, API contracts, integration patterns, scaling strategy

### Phase 3: Security & Performance

```bash
/gd:security-architect --validation_level=standard
/gd:performance-optimizer --validation_level=standard
```

**Deliverables:** Security architecture, threat model, performance patterns, monitoring strategy

### Phase 4: Validation & Documentation

```bash
/gd:design-reviewer --validation_level=standard
/gd:documentation-generator --validation_level=standard
```

**Deliverables:** Architecture validation, C4 diagrams, ADRs, implementation guide, risk mitigation

## Quality Gates

- **Scalability**: Horizontal scaling capable
- **Reliability**: 99.9% availability design
- **Security**: Zero trust, compliance ready
- **Performance**: <200ms response design

## Success Criteria

- Quality attributes met
- Patterns validated
- Security verified
- Documentation complete
- Stakeholder approved

## Quick Troubleshooting

- **Complex requirements**: Focus on MVP, iterate design
- **Technology decisions**: Use proven patterns, avoid bleeding edge
- **Integration challenges**: Standardize APIs, use event-driven

## Integration

- **Prerequisites**: Business requirements
- **Triggers**: feature-development, api-development
