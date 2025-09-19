---
description: Fast variant for rapid code review with essential quality, security, and performance validation
---

# Code Review & Quality - Fast Track

**Rapid code review with quality gates, security scanning, and actionable feedback**

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

- Version control configured
- Code standards defined
- Review guidelines established

## Phase 1: Context & Quality Analysis

Deploy code reviewer with code refactoring specialist.
**Output**: Change impact, quality metrics, complexity assessment, improvement priorities, standards compliance

## Phase 2: Security & Performance

Execute security analyzer: standard validation.
Direct performance optimizer: standard validation.
**Output**: Security vulnerabilities, performance bottlenecks, resource usage, optimization opportunities

## Phase 3: Testing & Validation

Engage test suite generator: standard validation.
Deploy QA coordinator: standard validation.
**Output**: Coverage gaps, test effectiveness, edge case validation, quality assurance passed

## Phase 4: Feedback & Documentation

Direct code reviewer with documentation generator: standard validation.
**Output**: Review feedback, action items, approval status, improvement recommendations

## Quality Gates

- **Code**: Complexity <10, duplication <3%
- **Security**: Zero high-risk vulnerabilities
- **Testing**: >80% coverage, critical paths tested
- **Performance**: No degradation, resources optimized

## Success Criteria

- Critical issues resolved
- Security validated
- Tests comprehensive
- Standards met
- Feedback actionable

## Quick Troubleshooting

- **High complexity**: Refactor into smaller functions
- **Security gaps**: Validate inputs, sanitize outputs
- **Performance issues**: Profile code, optimize queries
