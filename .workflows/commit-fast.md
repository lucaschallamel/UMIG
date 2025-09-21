---
description: Fast variant for rapid commit workflow with essential change analysis and quality commit messages
---

# Commit Workflow - Fast Track

**Rapid commit creation with change analysis, context capture, and quality validation**

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

- Changes staged (`git add`)
- Basic understanding of change scope
- Tests passing (if applicable)

## Phase 1: Change Analysis & Context

Deploy QA coordinator: standard validation.
Engage context manager.
**Output**: Staged changes analysis, work stream identification, session context, completeness validation

## Phase 2: Multi-Stream Assessment

Execute requirements analyst: standard validation, normal timeline, medium complexity.
Run: `git diff --staged --stat && git status --porcelain`
**Output**: Business/technical context, change dependencies, impact assessment, unstaged file review

## Phase 3: Commit Message Generation

Direct documentation generator: commit message type, standard validation.

**CRITICAL COMMIT MESSAGE SAFEGUARDS**:
- **NO HEREDOC SYNTAX**: Ensure no `$(cat <<'EOF'`, `<<EOF`, or similar shell constructs
- **CLEAN TEXT ONLY**: Commit message must be plain text without shell commands
- **FORMAT VALIDATION**: Must follow exact Conventional Commits format without prefixes
- **SYNTAX CHECK**: Verify no bash/shell syntax artifacts before committing

**Output**: Conventional Commits format, multi-stream narrative, context-rich body, proper footers

## Phase 4: Anti-Tunnel Vision Verification

Deploy code reviewer for final validation.
**Output**: Coverage verification, completeness validation, quality assurance, final commit message

## Quality Gates

- **Coverage**: All staged changes explained
- **Format**: Conventional Commits 1.0 compliance
- **Context**: Business/technical rationale clear
- **Completeness**: No missing work streams
- **Syntax Purity**: ZERO shell syntax, heredoc, or command artifacts in commit message

## Success Criteria

- All changes documented
- Context captured
- Format compliant
- Future developers informed
- Anti-tunnel vision verified

## Quick Troubleshooting

- **Missing context**: Review session conversation, check dev journal
- **Incomplete coverage**: Compare commit message against `git diff --staged`
- **Format issues**: Validate against Conventional Commits spec
