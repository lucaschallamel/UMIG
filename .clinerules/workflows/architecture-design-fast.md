---
description: Fast variant for rapid architecture design with essential quality attributes and validation
---

# Architecture Design - Fast Track

**Rapid architecture decisions with quality validation, patterns, and documentation**

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
- Business requirements defined
- Technical constraints known
- Architecture principles established

## Phase 1: Analysis & Strategy

Deploy requirements analyst with system architect: standard validation, normal timeline, medium complexity.
**Output**: Quality attributes, constraints, architecture vision, technology stack, design patterns

## Phase 2: System & Data Design

Direct system architect and database schema designer: standard validation.
**Output**: Component architecture, data models, API contracts, integration patterns, scaling strategy

## Phase 3: Security & Performance

Execute security architect with performance optimizer: standard validation.
**Output**: Security architecture, threat model, performance patterns, monitoring strategy

## Phase 4: Validation & Documentation

Engage design reviewer and documentation generator: standard validation.
**Output**: Architecture validation, C4 diagrams, ADRs, implementation guide, risk mitigation

## Quality Gates
- **Scalability**: Horizontal scaling capable
- **Reliability**: 99.9% availability design
- **Security**: Zero trust, compliance ready
- **Performance**: <200ms response design

## Success Criteria
- Quality attributes met
- Patterns validated
- Security verified
- Documentation complete
- Stakeholder approved

## Quick Troubleshooting
- **Complex requirements**: Focus on MVP, iterate design
- **Technology decisions**: Use proven patterns, avoid bleeding edge
- **Integration challenges**: Standardize APIs, use event-driven