---
description: Fast variant for rapid feature development with integrated quality assurance
---

# Feature Development - Fast Track

**Rapid feature delivery with architecture, testing, and security built-in**

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

- Feature requirements defined
- Development environment ready
- Team capacity allocated

## Phase 1: Planning & Design

Deploy requirements analyst: standard validation, normal timeline, medium complexity.
Execute system architect: standard validation.
**Output**: User stories, acceptance criteria, component design, API contracts, data models

## Phase 2: Implementation & Security

Direct code refactoring specialist.
Engage interface designer: standard validation.
**Output**: Business logic, UI components, security controls, responsive design

## Phase 3: Testing & Quality

Execute test suite generator: unit/integration/e2e tests, standard validation.
Deploy code reviewer.
**Output**: 90% test coverage, security validated, code quality verified, edge cases tested

## Phase 4: Documentation & Deployment

Direct documentation generator: standard validation.
Engage deployment ops manager: standard validation.
**Output**: User guides, API docs, staged deployment, monitoring active, rollback plan

## Quality Gates

- **Code**: Clean, maintainable, secure
- **Testing**: >90% coverage, all types passing
- **Security**: Zero high-risk vulnerabilities
- **Performance**: Meets requirements

## Success Criteria

- Feature meets acceptance criteria
- Tests comprehensive and passing
- Security validated
- Documentation complete
- Deployment successful

## Quick Troubleshooting

- **Test failures**: Check test data, review mocks
- **Performance issues**: Profile code, optimize queries
- **Integration problems**: Validate contracts, check versions

## Integration

- **Prerequisites**: Requirements defined
- **Triggers**: testing-validation, deployment-release
