---
description: Fast variant for rapid documentation updates with change analysis and automated content generation
---

# Documentation Update - Fast Track

**Rapid documentation sync with change analysis, automated updates, and quality validation**

## Prerequisites

- Changes completed and analyzed
- Documentation structure established
- Understanding of change impact

## Workflow Steps

### Phase 1: Change Analysis & Impact

```bash
/gd:documentation-generator --validation_level=standard
/gd:system-architect --validation_level=standard
```

**Deliverables:** Change impact analysis, documentation requirements, architecture updates, systemPatterns.md sync

### Phase 2: Core Documentation Updates

```bash
/gd:documentation-generator --validation_level=standard
/gd:business-process-analyst
```

**Deliverables:** README updates, CHANGELOG entries, ADR assessment, memory-bank synchronization

### Phase 3: Structure & Cross-References

```bash
/gd:documentation-generator --validation_level=standard
/gd:project-planner --validation_level=standard --timeline_constraint=normal
```

**Deliverables:** Work folder READMEs, memory-bank updates, cross-reference validation, sprint documentation

### Phase 4: Quality Assurance

```bash
/gd:qa-coordinator --validation_level=standard
```

**Deliverables:** Accuracy verification, consistency validation, completeness assessment, quality assurance

## Quality Gates

- **Architecture**: systemPatterns.md updated
- **Coverage**: All affected docs updated
- **Consistency**: Cross-references validated
- **Completeness**: No missing documentation

## Success Criteria

- Documentation synchronized
- Architecture reference current
- Cross-references validated
- Quality standards met
- Scaffolding compliant

## Quick Troubleshooting

- **Missing updates**: Check change impact, review affected areas
- **Broken references**: Validate links, update cross-references
- **Inconsistent content**: Run consistency checks, align terminology

## Integration

- **Prerequisites**: Development changes complete
- **Triggers**: Commit workflow, release preparation
