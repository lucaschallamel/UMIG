---
description: Enhanced Sprint Review & Retrospective workflow with GENDEV agent integration.
---

# Enhanced Sprint Review & Retrospective Workflow with GENDEV Integration

> **Filename convention:** `{yyyymmdd}-sprint-review.md`. Place in `/docs/devJournal/`.

## AI-Enhanced Sprint Context Gathering

**Sprint Analysis:**

```bash
/gd:businessprocessanalyst --analysis_type=sprint_analysis --scope=comprehensive --focus=performance_insights
```

**Metrics Collection:**

```bash
/gd:qacoordinator --metrics_type=sprint_performance --scope=comprehensive --focus=quantitative_analysis
```

**Traditional Commands:**

- Commits: `git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --oneline | wc -l`
- PRs: `git log --merges --since="YYYY-MM-DD" --until="YYYY-MM-DD" --oneline | wc -l`
- Issues: `git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --grep="close[sd]\\|fixe[sd]" --oneline | wc -l`

**Insight Generation:**

```bash
/gd:documentationgenerator --analysis_type=sprint_insights --scope=comprehensive --focus=learning_extraction
```

## AI-Enhanced Sprint Review Document

**Document Generation:**

```bash
/gd:documentationgenerator --document_type=sprint_review --scope=comprehensive --focus=structured_analysis
```

### 1. Sprint Overview

```bash
/gd:businessprocessanalyst --overview_type=sprint_summary --scope=comprehensive --focus=strategic_alignment
```

- Sprint Dates, Goal, Participants, Branch/Release, Strategic Alignment

---

### 2. Achievements & Deliverables

```bash
/gd:codereviewer --analysis_type=sprint_achievements --scope=comprehensive --focus=deliverable_assessment
```

- Major Features, Technical Milestones, Documentation Updates, Testing & Quality, Code Quality Metrics

### 3. Sprint Metrics

```bash
/gd:qacoordinator --metrics_type=sprint_performance --scope=comprehensive --focus=trend_analysis
```

- Commits, PRs Merged, Issues Closed, Branches Created, Performance Trends, Quality Metrics

### 4. Review of Sprint Goals

```bash
/gd:businessprocessanalyst --analysis_type=goal_achievement --scope=sprint_objectives --focus=completion_assessment
```

- What was planned, What was achieved, What was not completed, Achievement Rate, Goal Alignment

### 5. Demo & Walkthrough

```bash
/gd:documentationgenerator --content_type=demo_materials --scope=sprint_deliverables --focus=user_experience
```

- Visual Documentation, Demo Scripts, Reviewer Instructions, Feature Highlights, User Impact

### 6. Retrospective

```bash
/gd:businessprocessanalyst --analysis_type=retrospective --scope=comprehensive --focus=continuous_improvement
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
/gd:businessprocessanalyst --planning_type=action_items --scope=next_sprint --focus=strategic_priorities
```

- Priority-Ranked Actions, Owner Assignment, Deadlines, Success Metrics, Risk Assessment

### 8. References

```bash
/gd:documentationgenerator --reference_type=sprint_documentation --scope=comprehensive --focus=cross_linking
```

- Dev Journal Entries, ADRs, Changelog/Docs, Cross-References, Knowledge Base

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

> **Filename convention:** `{yyyymmdd}-sprint-review.md`. Place in `/docs/devJournal/`.

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
