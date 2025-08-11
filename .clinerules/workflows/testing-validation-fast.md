---
description: Fast variant for rapid testing and validation with essential coverage and quality gates
---

# Testing & Validation - Fast Track

**Rapid test execution with automated coverage, quality validation, and CI/CD integration**

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

- Code ready for testing
- Testing frameworks configured
- Test environments available

## Phase 1: Test Strategy & Unit Testing

Deploy QA coordinator: standard validation.
Execute test suite generator: 90% coverage, standard validation.
**Output**: Test strategy, 90% unit coverage, integration tests, edge case validation, automation framework

## Phase 2: E2E & Performance Testing

Direct test suite generator: standard validation.
Engage performance optimizer: standard validation.
**Output**: User journey tests, performance benchmarks, load validation, browser compatibility

## Phase 3: Security & Quality Validation

Execute security analyzer: standard validation.
Deploy code reviewer.
**Output**: Security test results, vulnerability assessment, test quality validation, coverage analysis

## Phase 4: CI/CD Integration & Reporting

Direct CI/CD builder.
Engage QA coordinator: standard validation.
**Output**: CI/CD integration, quality dashboard, test metrics, execution reports

## Quality Gates

- **Coverage**: >90% unit, >80% integration
- **Performance**: SLA compliance, <200ms p95
- **Security**: Zero critical vulnerabilities
- **Reliability**: <2% flaky tests

## Success Criteria

- Coverage targets met
- Performance benchmarks passed
- Security validated
- CI/CD integrated
- Quality metrics tracked

## Quick Troubleshooting

- **Low coverage**: Generate missing tests, focus on critical paths
- **Flaky tests**: Fix timing issues, improve test data management
- **Slow execution**: Parallelize tests, optimize test data

## Integration

- **Prerequisites**: feature-development, code-review-quality
- **Triggers**: deployment-release, production validation