---
description: Fast variant for rapid security assessment with essential threat modeling and vulnerability scanning
---

# Security Assessment - Fast Track

**Rapid security validation with vulnerability scanning, compliance checks, and risk prioritization**

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

- Security requirements defined
- Scanning tools available
- Compliance frameworks identified

## Phase 1: Threat Modeling & Risk

Deploy security architect: standard validation.
Execute risk manager: standard validation.
**Output**: Threat model, attack surface, risk matrix, critical vulnerabilities, mitigation priorities

## Phase 2: Vulnerability Scanning

Direct security analyzer: standard validation.
Execute security analyzer: comprehensive scan, standard validation.
**Output**: Vulnerability report, OWASP compliance, code security issues, API vulnerabilities

## Phase 3: Compliance & Controls

Deploy security architect: standard validation.
Execute test suite generator: standard validation.
**Output**: Compliance status, control effectiveness, gap analysis, security test results

## Phase 4: Remediation & Reporting

Direct risk manager: standard validation.
Engage documentation generator: standard validation.
**Output**: Remediation roadmap, executive summary, technical report, action items

## Quality Gates

- **Critical**: Zero critical vulnerabilities
- **High Risk**: Remediation plan required
- **Compliance**: Core controls validated
- **Testing**: Security tests passing

## Success Criteria

- Critical risks identified
- Vulnerabilities prioritized
- Compliance validated
- Remediation planned
- Reports delivered

## Quick Troubleshooting

- **False positives**: Validate manually, update rules
- **Complex threats**: Focus on critical assets first
- **Resource constraints**: Prioritize by business impact

## Integration

- **Prerequisites**: architecture-design, code complete
- **Triggers**: deployment-release, compliance audit