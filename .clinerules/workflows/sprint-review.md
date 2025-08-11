---
description: Enhanced Sprint Review & Retrospective workflow with GENDEV agent integration.
---

# Enhanced Sprint Review & Retrospective Workflow with GENDEV Integration

> **Filename convention:** `{yyyymmdd}-sprint-review.md`. Place in `docs/devJournal/` per Rule 03 scaffolding.

## AI-Enhanced Sprint Context Gathering

**Sprint Analysis:**

```bash
/gd:business-process-analyst
```

**Metrics Collection:**

```bash
/gd:qa-coordinator --validation_level=enterprise
```

**Traditional Commands:**

- Commits: `git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --oneline | wc -l`
- PRs: `git log --merges --since="YYYY-MM-DD" --until="YYYY-MM-DD" --oneline | wc -l`
- Issues: `git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --grep="close[sd]\\|fixe[sd]" --oneline | wc -l`

**Insight Generation:**

```bash
/gd:documentation-generator --validation_level=enterprise
```

## AI-Enhanced Sprint Review Document

**Document Generation:**

```bash
/gd:documentation-generator --validation_level=enterprise
```

### 1. Sprint Overview

```bash
/gd:business-process-analyst
```

- Sprint Dates, Goal, Participants, Branch/Release, Strategic Alignment

---

### 2. Achievements & Deliverables

```bash
/gd:code-reviewer
```

- Major Features, Technical Milestones, Documentation Updates, Testing & Quality, Code Quality Metrics

### 3. Sprint Metrics

```bash
/gd:qa-coordinator --validation_level=enterprise
```

- Commits, PRs Merged, Issues Closed, Branches Created, Performance Trends, Quality Metrics

### 4. Review of Sprint Goals

```bash
/gd:business-process-analyst
```

- What was planned, What was achieved, What was not completed, Achievement Rate, Goal Alignment

### 5. Demo & Walkthrough

```bash
/gd:documentation-generator --validation_level=standard
```

- Visual Documentation, Demo Scripts, Reviewer Instructions, Feature Highlights, User Impact

### 6. Retrospective

```bash
/gd:business-process-analyst
```

#### What Went Well

- Effective practices, positive surprises, successful workflows, team collaboration highlights

#### What Didn't Go Well

- Blockers with root cause analysis, pain points, technical debt, recurring issues

#### What We Learned

- Technical insights, process learnings, team dynamics, best practices

#### What We'll Try Next

- Prioritized improvement actions, experiments for next sprint, process optimizations

---

### 7. Action Items & Next Steps

```bash
/gd:business-process-analyst
```

- Priority-Ranked Actions, Owner Assignment, Deadlines, Success Metrics, Risk Assessment

### 8. References

```bash
/gd:documentation-generator --validation_level=enterprise
```

- Dev Journal Entries (`docs/devJournal/` YYYYMMDD-nn.md format)
- ADRs (`docs/adr/` architectural decisions)
- Memory Bank files (`docs/memory-bank/` 6 core files per Rule 07)
- README.md files (all work folders per Rule 03)
- Roadmap documentation (`docs/roadmap/` and `docs/roadmap/sprint/`)
- Cross-References and Knowledge Base

---

> _Use this workflow at the end of each sprint to ensure a culture of continuous improvement, transparency, and knowledge sharing._

---

## Best Practices with GENDEV Integration

**Sequential Agent Usage:**

1. Analysis: `gendev-business-process-analyst` → `gendev-qa-coordinator`
2. Documentation: `gendev-documentation-generator` → `gendev-code-reviewer`
3. Planning: `gendev-business-process-analyst` → `gendev-system-architect`

**Key Practices:**

- Cross-agent validation for critical insights
- Iterative improvement of AI prompts
- Knowledge base building through AI insights
- Pattern recognition for recurring issues

## Success Metrics

- **Quality:** 95% topic coverage, 90% actionable insights
- **Efficiency:** 60% reduction in prep time, 90% pattern recognition
- **Improvement:** 90% action completion, 85% knowledge retention

## AI Integration Tips

- Start with AI analysis for data-driven foundation
- Combine quantitative AI with qualitative human insights
- Use predictive analysis for future planning
- Leverage cross-project learning patterns

---

## Traditional Sprint Review Template

> **Filename convention:** `{yyyymmdd}-sprint-review.md`. Place in `docs/devJournal/` per Rule 03 scaffolding.

### 1. Sprint Overview

- Sprint Dates, Goal, Participants, Branch/Release

### 2. Achievements & Deliverables

- Major Features, Technical Milestones, Documentation, Testing & Quality

### 3. Sprint Metrics

- Commits, PRs Merged, Issues Closed, Test Coverage

### 4. Review of Sprint Goals

- What was planned, achieved, not completed

### 5. Demo & Walkthrough

- Screenshots/GIFs, reviewer instructions

### 6. Retrospective

- What Went Well, What Didn't Go Well, What We Learned, What We'll Try Next

### 7. Action Items & Next Steps

- Concrete actions, owners, deadlines

### 8. References

- Dev Journal Entries, ADRs, Changelog/Docs

> _Use this template for continuous improvement and knowledge sharing._
