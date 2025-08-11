---
description: Fast variant for rapid pull request creation with essential validation and comprehensive descriptions
---

# Pull Request - Fast Track

**Rapid PR creation with code quality validation, comprehensive descriptions, and review readiness**

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

- Development work completed
- Code quality standards defined
- Project style guidelines established

## Phase 1: Pre-PR Validation & Quality

Deploy code reviewer.
Execute security architect: standard validation.
**Output**: Code quality analysis, security validation, compliance check, performance assessment

## Phase 2: Scope Analysis & Documentation

Direct documentation generator: standard validation.
Run: `git log main..HEAD --stat --oneline && git diff main..HEAD --name-status`
**Output**: PR scope analysis, work stream identification, file impact assessment, commit categorization

## Phase 3: Testing & Integration

Execute test suite generator: comprehensive validation, 95% coverage, standard validation.
Deploy QA coordinator: standard validation.
**Output**: Test validation, coverage verification, integration testing, quality assurance

## Phase 4: PR Generation & Review Readiness

Direct documentation generator: standard validation.
**Output**: Complete PR description, testing instructions, review focus areas, deployment notes

## Quality Gates

- **Code**: Lint/format/test passing, quality standards met
- **Security**: Zero critical vulnerabilities
- **Coverage**: >95% test coverage maintained
- **Documentation**: Rule 03/07 compliance verified

## Success Criteria

- Quality validation passed
- Multi-stream PR documented
- Testing instructions clear
- Review readiness verified
- Anti-tunnel vision validated

## Quick Troubleshooting

- **Quality issues**: Run lint/format/test, address violations
- **Missing context**: Review commits, analyze file changes comprehensively
- **Incomplete coverage**: Identify missing work streams, expand testing

## Integration

- **Prerequisites**: Feature development complete, commit workflow
- **Triggers**: Code review process, deployment preparation