---
description: Fast variant for rapid deployment and release with essential safety checks
---

# Deployment & Release - Fast Track

**Rapid, safe production deployments with automated validation and rollback**

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

- CI/CD pipeline configured
- Deployment environments ready
- Monitoring tools integrated

## Phase 1: Pre-Deployment & Planning

Deploy deployment ops manager: standard validation.
Execute risk manager: standard validation.
**Output**: Deployment readiness, risk matrix, backup strategy, stakeholder notifications

## Phase 2: Build & Configuration

Direct CI/CD builder.
Engage security architect: standard validation.
**Output**: Build artifacts, security validation, infrastructure config, compliance checks

## Phase 3: Deployment & Validation

Execute deployment ops manager: standard validation.
Deploy test suite generator: smoke test focus, production validation, standard validation.
**Output**: Blue-green deployment, health checks, smoke tests, rollback ready

## Phase 4: Monitoring & Finalization

Direct resource monitor.
Engage documentation generator: release notes type, standard validation.
**Output**: Real-time monitoring, alerts configured, release notes, knowledge base updated

## Quality Gates

- **Build**: 100% success required
- **Security**: Zero critical issues
- **Health**: All checks passing
- **Performance**: Within SLA bounds

## Success Criteria

- Zero-downtime deployment
- All tests passing
- Monitoring operational
- Rollback tested
- Documentation complete

## Quick Troubleshooting

- **Health check failures**: Verify endpoints, check dependencies
- **Performance degradation**: Review resource allocation, check cache
- **Rollback needed**: Execute blue-green swap, validate recovery

## Integration

- **Prerequisites**: feature-development, testing-validation
- **Triggers**: incident response, monitoring alerts
