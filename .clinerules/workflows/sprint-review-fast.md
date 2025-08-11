---
description: Fast variant for rapid sprint review with essential metrics analysis and retrospective insights
---

# Sprint Review - Fast Track

**Rapid sprint analysis with comprehensive metrics, achievements assessment, and actionable improvement planning**

## Prerequisites

- Sprint timeline defined (dates/duration)
- Git repository with sprint commits
- Sprint goals documented
- Team access for retrospective input

## Workflow Steps

### Phase 1: Sprint Metrics & Achievement Analysis

```bash
/gd:business-process-analyst
/gd:qa-coordinator --validation_level=standard
```

**Deliverables:** Sprint metrics (commits/PRs/issues), achievement assessment, deliverable quality evaluation, goal completion analysis

### Phase 2: Retrospective Analysis & Learning Extraction

```bash
/gd:documentation-generator --validation_level=standard
git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --stat --oneline
```

**Deliverables:** Retrospective insights, learning patterns, workflow analysis, improvement opportunities, team dynamics assessment

### Phase 3: Action Planning & Future Optimization

```bash
/gd:business-process-analyst
/gd:project-planner --validation_level=standard --timeline_constraint=normal
```

**Deliverables:** Prioritized action items, improvement experiments, next sprint optimization, strategic alignment, risk mitigation

### Phase 4: Documentation & Knowledge Synthesis

```bash
/gd:documentation-generator --validation_level=standard
```

**Deliverables:** Sprint review document, knowledge base updates, cross-reference validation, continuous improvement documentation

## Quality Gates

- **Metrics**: 95% sprint data captured and analyzed
- **Achievements**: 100% deliverable assessment completed
- **Learning**: Key insights extracted and documented
- **Actions**: Prioritized improvement plan with owners/deadlines

## Success Criteria

- Sprint performance comprehensively analyzed
- Achievements accurately assessed
- Retrospective insights documented
- Action items prioritized with clear ownership
- Knowledge base updated for future sprints

## Quick Troubleshooting

- **Missing metrics**: Review git logs, check branch activity, validate commit patterns
- **Unclear achievements**: Cross-reference with sprint goals, assess deliverable quality
- **Limited insights**: Engage team for qualitative input, review workflow patterns

## Integration

- **Prerequisites**: Sprint completion, git history available, team input accessible
- **Triggers**: End-of-sprint ceremonies, milestone reviews, project retrospectives
