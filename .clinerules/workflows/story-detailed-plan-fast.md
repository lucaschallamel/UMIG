---
description: Fast variant for rapid user story scoping and technical design with essential planning and quality gates
---

# Story Detailed Planning - Fast Track

**Rapid user story elaboration with comprehensive technical design and streamlined task breakdown**

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

- User story identifier (US-XXX)
- High-level business context
- Sprint timeline defined
- Existing patterns documented

## Phase 1: Requirements & Story Elaboration

Deploy requirements analyst: enterprise validation, 12 stakeholders, normal timeline, medium complexity.
Execute user story generator: detailed format, standard validation.
**Output**: Requirements analysis, detailed user story, acceptance criteria, edge case scenarios, business constraints

## Phase 2: Technical Architecture & API Design

Direct system architect: standard validation.
Engage API designer.
**Output**: System architecture, component design, API specifications, hierarchical filtering, security patterns

## Phase 3: Data Architecture & Implementation Planning

Execute data architect.
Deploy project planner: standard validation, normal timeline.
**Output**: Data models, database schema, Liquibase migrations, task breakdown, effort estimates, implementation timeline

## Phase 4: Quality Assurance & Validation

Direct test suite generator: 90% coverage target, standard validation.
Engage QA coordinator: standard validation.
**Output**: Test strategy, quality gates, security validation, documentation plan, implementation readiness

## Quality Gates

- **Requirements**: 100% acceptance criteria defined
- **Architecture**: UMIG patterns validated, security approved
- **Data**: Schema designed with audit fields, migrations planned
- **Testing**: 90%+ coverage strategy, security tests included

## Success Criteria

- Story fully elaborated with scenarios
- Technical architecture defined
- Implementation plan validated
- Quality gates established
- Documentation compliance verified

## Quick Troubleshooting

- **Unclear requirements**: Engage stakeholders, define specific acceptance criteria
- **Complex dependencies**: Break down into smaller stories, sequence appropriately
- **Performance concerns**: Review patterns, optimize data models

## Integration

- **Prerequisites**: Business requirements defined, technical patterns established
- **Triggers**: Sprint planning, feature development cycles