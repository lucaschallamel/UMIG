---
description: Fast variant for rapid bug investigation and resolution with root cause focus
---

# Bug Investigation & Resolution - Fast Track

**Rapid bug triage, root cause analysis, and validated resolution**

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

- Bug tracking system configured
- Access to logs and monitoring
- Test environments available

## Phase 1: Triage & Analysis

Deploy risk manager: automated triage, impact-based severity, comprehensive root cause, technical focus, forensic depth, strict validation.
Execute test suite generator: reproduction focus, automated validation, exploratory style, 95% coverage, strict validation.
**Output**: Severity classification, reproducible test case, root cause identified, impact assessment

## Phase 2: Solution & Implementation

Direct code refactoring specialist: bug fix focus, conservative risk, targeted scope, comprehensive testing.
Engage system architect: microservices type, enterprise scale, high complexity, strict validation.
**Output**: Fix implementation, dependency validation, edge case handling, performance verified

## Phase 3: Testing & Validation

Execute test suite generator: regression/integration tests, fix-focused coverage, TDD style, 90% target, enterprise validation.
Deploy QA coordinator: comprehensive quality, risk-based methodology, optimized maturity, strict validation.
**Output**: Regression tests, fix validation, integration verified, UAT passed

## Phase 4: Deployment & Documentation

Direct deployment ops manager: blue-green strategy, production environment, comprehensive monitoring, strict validation, automated recovery.
Engage documentation generator: incident report type, technical audience, detailed format, strict validation, comprehensive strategy.
**Output**: Hotfix deployed, monitoring active, incident report, knowledge base updated

## Quality Gates

- **Root Cause**: Identified and validated
- **Testing**: >95% coverage on affected areas
- **Regression**: Zero new issues introduced
- **Performance**: No degradation

## Success Criteria

- Root cause documented
- Fix validated in production
- No regression introduced
- Performance maintained
- Lessons learned captured

## Quick Troubleshooting

- **Can't reproduce**: Check environment differences, review logs
- **Fix causes regression**: Expand test coverage, review dependencies
- **Performance impact**: Profile changes, optimize critical path
