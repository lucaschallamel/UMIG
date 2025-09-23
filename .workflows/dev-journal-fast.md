---
description: Fast variant for rapid development journal creation with essential documentation and knowledge capture
---

# Development Journal - Fast Track (Zero Tunnel Vision Edition)

**Rapid COMPREHENSIVE documentation covering ALL development since last journal entry**

⚡ **KEY ENHANCEMENT**: This workflow now analyzes the ENTIRE git history since your last dev journal, not just the current session. Prevents tunnel vision through mandatory git history analysis.

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

- Development session completed
- Understanding of work scope
- Access to project documentation structure

## Phase 1: Git History Analysis & Context (CRITICAL - Prevents Tunnel Vision)

### Quick Git History Gather (2 minutes)

```bash
# Find last journal and get ALL work since then
last_journal=$(ls docs/devJournal/202*.md 2>/dev/null | grep -v "$(date +%Y%m%d)" | tail -1)
last_date="${last_journal:19:4}-${last_journal:23:2}-${last_journal:25:2}"

# Get comprehensive history in one command
git log --oneline --since="${last_date:-1970-01-01}" --author="$(git config user.name)"

# Get user stories and commit types
git log --since="${last_date:-1970-01-01}" --grep="US-\|feat\|fix\|docs\|test" --oneline

# Get file change summary
git diff --stat $(git merge-base HEAD main)..HEAD
```

### Work Stream Categorization (1 minute)

Quickly identify ALL work (not just current session):

- **Features/Stories**: All US- items
- **Bug Fixes**: All fix commits
- **Refactoring**: Code improvements
- **Documentation**: Docs updates
- **Testing**: Test additions
- **Infrastructure**: Config/tooling

Deploy context manager with FULL git history.
Execute project planner: standard validation, normal timeline.
**Output**: Complete timeline since last journal, ALL work streams, technical decisions, problem-solutions

## Phase 2: Evidence Gathering (History-Based)

Direct code reviewer with ALL commits from Phase 1.
Engage business process analyst for complete period.
**Focus**: Analyze cumulative changes, not just current session
**Output**: ALL code changes since last journal, complete work stream relationships, cross-session dependencies

## Phase 3: Narrative Generation (Complete Timeline)

Execute documentation generator with FULL history.
Deploy system architect for period analysis.

### Fast Journal Template

```markdown
# Developer Journal — YYYYMMDD-nn

## Development Period

- **Since Last Entry:** [Date from Phase 1]
- **Total Commits:** [Count from git log]
- **User Stories/Features:** [All US- items]

## Work Completed

### Features & Stories

[List ALL features/stories with commits]

### Bug Fixes & Improvements

[List ALL fixes and refactoring]

### Technical Decisions

[Key decisions with commit refs]

## Current State

- Working: [What's functional]
- Issues: [What needs attention]

## Next Steps

[Immediate priorities based on complete history]
```

**Output**: Complete journal entry covering ALL work since last entry, not just current session

## Phase 4: Fast Anti-Tunnel Vision Verification

Direct QA coordinator with comprehensive checklist.

### Quick Verification (2 minutes)

- [ ] **Timeline Complete**: ALL commits since last journal included
- [ ] **User Stories**: Every US- item documented
- [ ] **Bug Fixes**: All fixes listed with commits
- [ ] **Parallel Work**: Multiple branches identified
- [ ] **Documentation**: Docs changes captured
- [ ] **Testing**: Test work included
- [ ] **Refactoring**: Code improvements noted
- [ ] **Commit Coverage**: Count matches git log
- [ ] **No Tunnel Vision**: Work from ALL sessions included

**Output**: Verified complete coverage of entire development period

## Quality Gates

- **Git Coverage**: 100% commits since last journal documented
- **Timeline**: Complete period from last journal to present
- **Format**: YYYYMMDD-nn.md in docs/devJournal/
- **Evidence**: All technical decisions traced to commits
- **Completeness**: No development work missing

## Success Criteria

- **Complete Timeline**: Entire period since last journal documented
- **All Work Streams**: Every feature, fix, and improvement captured
- **Commit Traceability**: All work linked to specific commits
- **Cross-Session**: Work from multiple days properly integrated
- **Zero Tunnel Vision**: Comprehensive view of all development

## Quick Troubleshooting

- **Missing commits**: Check git log date range, verify author filter
- **Incomplete coverage**: Compare journal to `git log --oneline` count
- **Tunnel vision detected**: Re-run Phase 1 git history commands
- **Format issues**: Follow YYYYMMDD-nn.md naming, use template
- **Missing work streams**: Check `git grep "US-"` and commit types

## Integration

- **Prerequisites**: Development session complete
- **Triggers**: Commit workflow, knowledge preservation
