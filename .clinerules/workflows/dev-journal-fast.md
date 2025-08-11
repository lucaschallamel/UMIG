---
description: Fast variant for rapid development journal creation with essential documentation and knowledge capture
---

# Development Journal - Fast Track

**Rapid session documentation with context analysis, evidence gathering, and knowledge preservation**

## Prerequisites

- Development session completed
- Understanding of work scope
- Access to project documentation structure

## Workflow Steps

### Phase 1: Session Analysis & Context

```bash
/gd:context-manager
/gd:project-planner --validation_level=standard --timeline_constraint=normal
```

**Deliverables:** Session timeline, work streams, technical decisions, problem-solutions, documentation structure validation

### Phase 2: Evidence Gathering

```bash
/gd:code-reviewer
/gd:business-process-analyst
```

**Deliverables:** Code changes analysis, work stream relationships, cross-dependencies, scope documentation

### Phase 3: Narrative Generation

```bash
/gd:documentation-generator --validation_level=standard
/gd:system-architect --validation_level=standard
```

**Deliverables:** Journal entry (YYYYMMDD-nn.md), narrative synthesis, architectural cross-references, README updates

### Phase 4: Quality Verification

```bash
/gd:qa-coordinator --validation_level=standard
```

**Deliverables:** Completeness validation, evidence coverage verification, quality assurance, final review

## Quality Gates

- **Coverage**: All work streams documented
- **Format**: YYYYMMDD-nn.md in docs/devJournal/
- **Evidence**: Technical decisions justified
- **Completeness**: Future developers informed

## Success Criteria

- Session comprehensively documented
- Work streams identified
- Technical decisions explained
- Next steps defined
- READMEs updated

## Quick Troubleshooting

- **Missing context**: Review conversation timeline, check work artifacts
- **Incomplete coverage**: Verify against code changes, documentation updates
- **Format issues**: Follow YYYYMMDD-nn.md naming, ensure proper structure

## Integration

- **Prerequisites**: Development session complete
- **Triggers**: Commit workflow, knowledge preservation
