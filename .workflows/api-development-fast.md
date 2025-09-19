---
description: Fast variant for rapid API development with essential quality gates
---

# API Development - Fast Track

**Rapid API delivery with security, testing, and documentation essentials**

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

- API requirements defined
- Development environment ready

## Phase 1: Design & Specification

Deploy API designer with requirements analyst: medium complexity, standard validation, normal timeline.
**Output**: OpenAPI spec, endpoint design, data models, auth strategy, integration patterns

## Phase 2: Implementation & Security

Direct code refactoring specialist and security architect: standard validation.
**Output**: API endpoints, business logic, JWT auth, RBAC, input validation, rate limiting

## Phase 3: Testing & Performance

Execute test suite generator: unit/integration/contract tests, 90% coverage, standard validation.
Deploy performance optimizer: standard validation.
**Output**: 90% test coverage, contract tests, load testing results, performance metrics

## Phase 4: Documentation & Deployment

Engage documentation generator: API-type, standard validation.
Direct deployment ops manager: standard validation.
**Output**: Interactive API docs, deployment pipeline, monitoring dashboard, SLA tracking

## Quality Gates

- **Security**: Zero critical vulnerabilities, auth/authz validated
- **Testing**: >90% coverage, contract tests passing
- **Performance**: <200ms response time, load tested
- **Documentation**: OpenAPI complete, examples provided

## Success Criteria

- All endpoints functional with validation
- Security scan passed
- Performance within SLA
- Documentation interactive
- Monitoring operational

## Quick Troubleshooting

- **Slow responses**: Check database queries, enable caching
- **Auth failures**: Verify JWT configuration, check RBAC rules
- **Integration issues**: Validate API contracts, check versioning
