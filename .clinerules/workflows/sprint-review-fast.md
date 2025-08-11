---
description: Fast variant for rapid sprint review with essential metrics analysis and retrospective insights
---

# Sprint Review - Fast Track

**Rapid sprint analysis with comprehensive metrics, achievements assessment, and actionable improvement planning**

## MANDATORY UNIVERSAL VERIFICATION PROTOCOL

**GENDEV AGENT DELEGATION ENCOURAGED**: Leverage specialized GENDEV agents whenever asked for complex tasks while maintaining strict verification protocols.

### ZERO TRUST VERIFICATION REQUIREMENTS
**CRITICAL**: Every agent delegation requires evidence-based verification through direct tool calls.
- **NEVER** trust completion reports or assume task success
- **ALWAYS** verify actual outputs exist through file reads and directory checks
- **VALIDATE** content quality, completeness, and format compliance
- **CONFIRM** all deliverables before phase progression

### MANDATORY ERROR REPORTING PROTOCOL
**NO SILENT FAILURES**: All errors, failures, and issues must be explicitly reported.

**Error Classification & Response**:
- **CRITICAL FAILURES**: Task cannot be completed → Escalate immediately with full context
- **PARTIAL FAILURES**: Some components completed → Detailed breakdown of what succeeded/failed
- **WARNING CONDITIONS**: Task completed with issues → Document suboptimal results and risks
- **DEPENDENCY FAILURES**: External services unavailable → Report impact and alternative approaches

**Comprehensive Error Surface Requirements**:
- **IMMEDIATE REPORTING**: No delays or batching of error notifications
- **ROOT CAUSE ANALYSIS**: Explain why failures occurred
- **IMPACT ASSESSMENT**: Describe affected functionality and consequences
- **RECOVERY OPTIONS**: Suggest alternative approaches or manual interventions
- **ESCALATION PATH**: Clear indication when human intervention is required

### VERIFICATION CHECKLIST (ADAPTIVE)
**File System Verification**:
- Use `view_files` to read all target files and validate content
- Use `list_dir` to verify directory structure changes
- Check file timestamps, sizes, and modification indicators

**Quality Validation**:
- Verify content matches requirements and success criteria
- Check formatting, structure, and completeness
- Validate cross-references and consistency across related files

**Error Transparency**:
- Surface all subagent errors to user with full context
- Maintain complete error history for debugging
- Flag any attempts to hide or suppress failures as protocol violations

**ZERO TOLERANCE FOR SILENT FAILURES**: Any agent that fails to report errors or attempts to hide failures violates this protocol and must be immediately escalated.

## Prerequisites

- Sprint timeline defined (dates/duration)
- Git repository with sprint commits
- Sprint goals documented
- Team access for retrospective input

## Phase 1: Sprint Metrics & Achievement Analysis

Deploy business process analyst.
Execute QA coordinator: standard validation.
**Output**: Sprint metrics (commits/PRs/issues), achievement assessment, deliverable quality evaluation, goal completion analysis

## Phase 2: Retrospective Analysis & Learning Extraction

Direct documentation generator: standard validation.
Run: `git log --since="YYYY-MM-DD" --until="YYYY-MM-DD" --stat --oneline`
**Output**: Retrospective insights, learning patterns, workflow analysis, improvement opportunities, team dynamics assessment

## Phase 3: Action Planning & Future Optimization

Engage business process analyst.
Deploy project planner: standard validation, normal timeline.
**Output**: Prioritized action items, improvement experiments, next sprint optimization, strategic alignment, risk mitigation

## Phase 4: Documentation & Knowledge Synthesis

Direct documentation generator: standard validation.
**Output**: Sprint review document, knowledge base updates, cross-reference validation, continuous improvement documentation

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