# UMIG Project - Claude AI Assistant Guide

## MANDATORY AGENT DELEGATION VERIFICATION PROTOCOL

**CRITICAL ENFORCEMENT**: Every time Claude delegates work to any agent (GENDEV or Quad, or any other ad hoc agent), Claude MUST implement a comprehensive verification and validation protocol before reporting task completion.

### Core Verification Principle

**ZERO TRUST DELEGATION**: Claude must NEVER trust subagent reports or assume task completion. All delegation outcomes must be independently verified through direct tool calls and evidence gathering.

### Mandatory Verification Framework

#### 1. Pre-Delegation Documentation

- Document current state (file contents, timestamps, directory structure)
- Define specific success criteria and measurable outcomes
- Identify all files/artifacts that should be created or modified
- Establish verification checkpoints

#### 2. Adaptive Verification Checklist Creation

For EVERY delegation, Claude must create a tailored verification checklist based on:

**Task Type Adaptations**:

- **Documentation Tasks**: Verify file existence, content accuracy, formatting, completeness
- **Code Generation**: Verify syntax, functionality, test coverage, security compliance
- **Architecture Design**: Verify diagram creation, documentation completeness, decision rationale
- **Analysis Tasks**: Verify report generation, data accuracy, conclusion validity
- **Configuration Tasks**: Verify file modifications, setting accuracy, functionality

**Context-Specific Adaptations**:

- **File Operations**: Check file existence, size changes, modification timestamps
- **Content Creation**: Validate content quality, completeness, format compliance
- **Multi-file Tasks**: Verify all expected files, cross-reference consistency
- **Integration Tasks**: Test functionality, validate connections, verify compatibility

#### 3. Mandatory Verification Steps (Universal)

**EVERY delegation must include these verification actions**:

1. **File System Verification**
   - Use `view_files` to read all target files
   - Use `list_dir` to verify directory structure changes
   - Check file timestamps and sizes

2. **Content Quality Verification**
   - Validate content matches requirements
   - Check formatting and structure
   - Verify completeness against success criteria

3. **Functional Verification** (when applicable)
   - Test generated code functionality
   - Validate configuration changes
   - Verify integration points

4. **Cross-Reference Verification**
   - Compare multiple verification points
   - Validate consistency across related files
   - Check for unintended side effects

#### 4. Evidence-Based Reporting

**Claude must ONLY report task completion after providing concrete evidence**:

- Quote specific file contents that prove completion
- Show before/after comparisons
- Provide measurable metrics (file sizes, line counts, etc.)
- Document any discrepancies or partial completions

#### 5. Mandatory Error and Failure Reporting

**CRITICAL REQUIREMENT**: Subagents must explicitly and comprehensively report ALL errors, failures, and issues encountered during task execution. Silent failures are PROHIBITED.

**Error Reporting Framework**:

1. **Explicit Error Documentation**
   - All tool call failures must be reported with specific error messages
   - File operation errors (permission denied, file not found, etc.)
   - Syntax errors, compilation failures, or validation issues
   - Network connectivity or external service failures
   - Resource constraints (memory, disk space, timeouts)

2. **Failure Classification**
   - **Critical Failures**: Task cannot be completed (must escalate immediately)
   - **Partial Failures**: Some components completed, others failed (detailed breakdown required)
   - **Warning Conditions**: Task completed but with suboptimal results or potential issues
   - **Dependency Failures**: External dependencies unavailable or malfunctioning

3. **Comprehensive Failure Surface Protocol**
   - **No Silent Failures**: Every error must be explicitly communicated
   - **Root Cause Analysis**: Explain why the failure occurred
   - **Impact Assessment**: Describe what functionality is affected
   - **Recovery Options**: Suggest alternative approaches or manual interventions
   - **Escalation Path**: Clear indication when human intervention is required

4. **Error Propagation Requirements**
   - Subagent errors must be immediately surfaced to main Claude orchestrator
   - Main orchestrator must relay all subagent errors to the user
   - Error context must be preserved through the delegation chain
   - No error filtering or suppression allowed at any level

### Implementation Guidelines

#### Verification Workflow Pattern

```
1. DELEGATE: "I need [agent] to [specific task]"
2. EXECUTE: Call agent with clear parameters
3. VERIFY: Implement adaptive verification checklist
4. VALIDATE: Gather concrete evidence through tool calls
5. REPORT: Provide fact-based completion status with evidence
```

#### Quality Gates

- **Never assume**: Always verify through direct observation
- **Never trust**: Subagent reports are claims, not facts
- **Always evidence**: Every completion claim must have proof
- **Always adapt**: Verification must match task complexity and context

#### Failure Handling

- If verification reveals incomplete work: Re-delegate with specific corrections
- If verification reveals errors: Document issues and implement fixes
- If verification is impossible: Report limitation and request user guidance
- **If subagent reports errors**: Immediately surface to user with full context and recovery options
- **If silent failures detected**: Escalate as critical protocol violation requiring immediate attention

#### Error Transparency Protocol

**MANDATORY ERROR SURFACING**: Every error, failure, or issue encountered by subagents must be:

1. **Immediately Reported**: No delays or batching of error reports
2. **Fully Contextualized**: Include task context, attempted actions, and failure points
3. **Actionably Detailed**: Provide enough information for user to understand and respond
4. **Escalation-Ready**: Clear indication of severity and required intervention level
5. **Audit-Traceable**: Maintain complete error history for debugging and improvement

**Zero Tolerance for Silent Failures**: Any subagent that fails to report errors or attempts to hide failures violates this protocol and must be immediately flagged for remediation.

### Critical Success Factors

1. **Verification Completeness**: Every aspect of delegated work must be verified
2. **Evidence Quality**: Verification evidence must be concrete and measurable
3. **Adaptive Precision**: Verification approach must match task requirements
4. **Zero False Positives**: Never report completion without verified evidence

**This protocol is NON-NEGOTIABLE and must be followed for ALL agent delegations without exception.**

## Overview

UMIG (Unified Migration Implementation Guide) - Pure ScriptRunner application for Atlassian Confluence managing complex IT cutover events.

**Stack**: Groovy 3.0.15/ScriptRunner backend, Vanilla JS/AUI frontend, PostgreSQL/Liquibase, Podman containers, RESTful v2 APIs
**Platform**: Confluence 9.2.7 + ScriptRunner 9.21.0 (Upgraded August 8, 2025)

## GENDEV Development Agents

**35 specialized workflow agents** for development processes, code quality, and project management.

### Agent Delegation System

- **Auto-Delegation**: Claude Code automatically delegates based on development context
- **Manual Commands**: Use `/gd:[agent-name]` for explicit control
- **Agent Locations**: `~/.claude/agents/gendev-*` and `~/.claude/commands/gd/`

### Agent Categories

- **Requirements (4)**: `gendev-requirements-*`, `gendev-user-story-*`
- **Architecture (5)**: `gendev-system-architect`, `gendev-api-designer`, `gendev-data-architect`
- **Development (10)**: `gendev-code-reviewer`, `gendev-test-suite-generator`, `gendev-security-*`
- **Project Mgmt (5)**: `gendev-project-planner`, `gendev-progress-tracker`, `gendev-risk-manager`
- **Operations (5)**: `gendev-cicd-builder`, `gendev-deployment-ops-manager`

### Quick Examples

```bash
# Commands
/gd:system-architect --architecture_style=microservices
/gd:code-reviewer --review_depth=comprehensive
/gd:project-planner --methodology=agile

# Natural language (triggers full agents)
Use the gendev-system-architect agent for technical design
Use the gendev-security-analyzer agent for vulnerability scanning
```

**Key**: Let Claude Code auto-delegate based on your development tasks. Use commands for specific arguments.

## Quad Enhanced Personas

**92 specialized domain expert agents** for strategic guidance, leadership coaching, and technical expertise.

### Agent Delegation System

- **Auto-Delegation**: Claude Code automatically delegates based on domain context
- **Manual Commands**: Use `/qd:[type]-[name]` for explicit control
- **Agent Locations**: `~/.claude/agents/quad-*` and `~/.claude/commands/qd/`

### Agent Categories

- **Coaches (26)**: `quad-coach-*` - Leadership, business, personal development
- **Masters (18)**: `quad-master-*` - Strategic wisdom, complex analysis
- **SMEs (48)**: `quad-sme-*` - Technical specialists, domain experts

### Quick Examples

```bash
# Commands
/qd:coach-leadership develop --level=senior
/qd:master-strategist analyze --scope=market-entry
/qd:sme-cloud-architect design --platform=aws

# Natural language (triggers full agents)
Use the quad-coach-business agent for growth strategy
Use the quad-sme-security agent for threat modeling
```

**Key**: Let Claude Code auto-delegate based on your domain needs. Use commands for precise control.

## Structure

```
UMIG/
├── src/groovy/umig/         # Main source
│   ├── api/v2/              # REST endpoints
│   ├── macros/              # UI macros
│   ├── repository/          # Data access
│   ├── tests/               # Testing framework (90%+ coverage)
│   │   ├── compatibility/   # Backward compatibility validation
│   │   ├── integration/     # Integration tests
│   │   ├── performance/     # Performance validation tests
│   │   ├── unit/           # Comprehensive unit test suite
│   │   ├── upgrade/         # Upgrade validation tests (US-032)
│   │   ├── validation/      # Database and quality validation
│   │   └── apis/           # API-specific tests
│   ├── utils/               # Utilities
│   └── web/js/              # Frontend (admin-gui/* modular)
├── local-dev-setup/         # Development environment
│   ├── infrastructure/      # Infrastructure management (CONSOLIDATED)
│   │   ├── backup/         # Enterprise backup/restore system
│   │   ├── upgrade/        # Upgrade automation (US-032)
│   │   └── verify-provisioning.sh  # System validation
│   ├── scripts/generators/  # Data generation (001-100)
│   ├── liquibase/          # DB migrations
│   └── podman-compose.yml  # Container orchestration
├── docs/                    # Documentation
│   ├── solution-architecture.md  # PRIMARY REFERENCE (33 ADRs consolidated)
│   ├── api/openapi.yaml     # API specification
│   ├── archived/           # Historical documentation
│   │   └── us-032-confluence-upgrade/  # US-032 upgrade archive
│   └── roadmap/            # Sprint planning and UI/UX specs
└── mock/                    # Zero-dependency prototypes
```

## Commands

```bash
# Environment (from local-dev-setup/)
npm install && npm start     # Setup & start
npm stop                     # Stop services
npm run restart:erase        # Reset everything
npm run generate-data:erase  # Generate fake data

# Testing
npm test                     # Node.js tests
./src/groovy/umig/tests/run-integration-tests.sh        # Groovy integration tests
./src/groovy/umig/tests/run-unit-tests.sh              # Groovy unit tests

# Infrastructure Operations (US-032 reorganized)
./local-dev-setup/infrastructure/verify-provisioning.sh    # System health check
./local-dev-setup/infrastructure/backup/backup-all.sh      # Enterprise backup system
./local-dev-setup/infrastructure/upgrade/upgrade-confluence.sh  # Confluence upgrade

# Upgrade Validation (US-032)
./src/groovy/umig/tests/upgrade/run-all-tests.sh          # Complete upgrade validation
```

## Data Model

**Hierarchy**: Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions
**Pattern**: Canonical (`_master_`) vs Instance (`_instance_`) entities
**Scale**: 5 migrations, 30 iterations, 5 plans → 13 sequences → 43 phases → 1,443+ step instances

## Critical Patterns

### Database Access (MANDATORY)

```groovy
DatabaseUtil.withSql { sql ->
    return sql.rows('SELECT * FROM table_name')
}
```

### REST Endpoints

```groovy
@BaseScript CustomEndpointDelegate delegate
entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Repository pattern
    return Response.ok(payload).build()
}
```

### Type Safety (ADR-031)

```groovy
// MANDATORY explicit casting
params.migrationId = UUID.fromString(filters.migrationId as String)
params.teamId = Integer.parseInt(filters.teamId as String)
```

### Hierarchical Filtering

- Use instance IDs (pli_id, sqi_id, phi_id), NOT master IDs
- Include ALL fields in SELECT that are referenced in result mapping
- API pattern: `/resource?parentId={uuid}`

## Development Rules

### Non-Negotiable Standards

1. **API Pattern**: Reference StepsApi.groovy, TeamsApi.groovy, LabelsApi.groovy
2. **Database**: `DatabaseUtil.withSql` pattern only
3. **Type Safety**: Explicit casting for all query parameters
4. **Frontend**: Pure vanilla JavaScript, zero frameworks
5. **Security**: `groups: ["confluence-users"]` default
6. **Testing**: Specific SQL query mocks (ADR-026)
7. **Naming**: `snake_case` with `_master_`/`_instance_` suffixes
8. **Email**: Use EmailService.groovy
9. **Repository Pattern**: All data access via repositories

### Error Handling

- SQL state mappings: 23503→400, 23505→409
- Robust error propagation through all layers

## Status (August 18, 2025)

### ✅ Completed

- Development environment, Admin UI (SPA pattern)
- APIs: Users, Teams, Environments, Applications, Labels, Migrations, Plans, Sequences, Phases, Instructions
- Steps API: 100% complete (All phases finished)
- Iteration View: Enhanced interface with Phase 1 features delivered
- Type safety patterns, hierarchical filtering
- Architecture consolidation (solution-architecture.md)
- Admin GUI modularization (8 components)
- Groovy 3.0.15 static type checking compatibility
- All core REST APIs with advanced features (control points, audit fields, bulk operations)
- Infrastructure modernization (Confluence 9.2.7 + ScriptRunner 9.21.0 upgrade)
- Enterprise backup/restore system with automated validation
- Comprehensive testing framework (90%+ coverage, 4 new ADRs 037-040)
- Documentation consolidation (50% reduction: 6→3 files, 8→4 scripts)

### ✅ Sprint 4 COMPLETE - Strategic Triumph (August 7-15, 2025)

**Project Velocity Record**: 5.7 points/day achieved (highest in project history)

#### ✅ Completed Stories (17 Adjusted Points)

- **US-017**: Application management and association features (Complete)
- **US-032**: Confluence upgrade and infrastructure modernization (Complete)
- **US-025**: Migrations API refactoring with integration testing (Complete)
- **US-024**: StepsAPI Refactoring ✅ 100% COMPLETE (All 3 phases finished - US-028 unblocked!)
- **US-028**: Enhanced IterationView ✅ Phase 1 COMPLETE (August 15, 2025)

#### 🚀 Strategic Infrastructure Work (2 Days Hidden Investment)

**Critical Discovery**: `/steps` endpoint (not `/api/v2/steps`) resolved integration confusion
**GENDEV Agent Optimization**: Enhanced development workflows reducing future coding effort by 80%
**AI Infrastructure Enhancement**: Semantic compression achieving 47% efficiency with 100% semantic preservation
**Memory Bank Evolution**: Intelligent project knowledge organization enabling instant AI assistant context
**Template Standardization**: Reusable patterns for rapid feature development and consistent quality
**Workflow Automation**: Streamlined development processes enabling 10x acceleration in future sprints

### 🚧 Sprint 5 Progress (MVP Completion Focus - August 18-22, 2025)

**Sprint Goal**: Complete MVP functionality and prepare for UAT deployment with fully integrated Admin GUI, enhanced user interfaces, and production-ready documentation.

**Timeline**: 5 working days (August 18-22, 2025)  
**Planned Velocity**: 18 points (72% of 25-point capacity)  
**Buffer**: 7 points (28% for quality assurance and UAT preparation)

#### 📋 Sprint 5 Stories (7 Stories, 18 Points Total)

- **US-022**: Integration Test Expansion (1 point) - Day 1 - Foundation completion
- **US-030**: API Documentation Completion (1 point) - Day 1 - UAT preparation  
- **US-031**: Admin GUI Complete Integration (6 points) - Days 2-4 - Core MVP functionality
- **US-036**: StepView UI Refactoring (3 points) - Days 3-4 - NEW Enhanced interface
- **US-034**: Data Import Strategy (3 points) - Days 4-5 - Migration enablement
- **US-033**: Main Dashboard UI (3 points) - Day 5 - Final MVP component
- **US-035**: Enhanced IterationView Phases 2-3 (1 point) - Day 5 - Enhancement features

#### 📈 Current Focus (Sprint 5 Execution)

- **MVP Timeline**: On track for August 28, 2025
- **Quality Metrics**: 95% test coverage sustained, 8.8/10 code review scores  
- **Infrastructure**: Modernized (Confluence 9.2.7 + ScriptRunner 9.21.0)
- **Current Priorities**: Admin GUI integration, UAT preparation, enhanced UIs
- **Success Metrics**: 100% Admin GUI integration, zero critical defects, performance targets met

### 🎯 Sprint 5 Focus Areas

**Core MVP Completion:**
- ✅ **Admin GUI Complete Integration** - All 11 entity types with cross-module synchronization
- ✅ **Data Import Strategy** - CSV/Excel import with validation and batch processing
- ✅ **Main Dashboard UI** - Streamlined interface with essential widgets
- ✅ **Enhanced UIs** - StepView refactoring and IterationView Phases 2-3

**UAT Preparation:**
- ✅ **API Documentation** - 100% complete OpenAPI specification
- ✅ **Integration Testing** - 95% coverage across all endpoints
- ✅ **Performance Validation** - <3s load times confirmed
- ✅ **Quality Assurance** - Zero critical defects target

**📢 SPRINT 4 STRATEGIC TRIUMPH**: Complete success achieved (August 7-15, 2025) - Project velocity record of 5.7 points/day!

**Key Achievements from Sprint 4**:
- ✅ **US-028 Phase 1**: Enhanced IterationView 100% COMPLETE (August 15, 2025)
- ✅ **StepsAPIv2Client**: Intelligent caching and real-time synchronization
- ✅ **RealTimeSync**: 2-second polling with optimized performance
- ✅ **Role-based Access Control**: NORMAL/PILOT/ADMIN user roles implemented
- ✅ **Performance Excellence**: <3s load time achieved (exceeded target by 40%)
- ✅ **UAT Validation**: All tests passed, 75 steps displayed correctly
- ✅ **Security Score**: 9/10 with comprehensive XSS prevention
- ✅ **Test Coverage**: 95% achieved with production-ready code
- ✅ **AI Infrastructure**: 2 days hidden work enabling 10x future acceleration
- ✅ **Critical Discovery**: Correct `/steps` endpoint identified (not `/api/v2/steps`)
- ✅ **Timeline Success**: All objectives met with MVP delivery on track for August 28

## Key References

- **PRIMARY**: `docs/solution-architecture.md` (ALWAYS REVIEW FIRST - 40 ADRs consolidated)
- **TESTING**: `docs/testing/` (Comprehensive testing framework documentation)
- **QUALITY CHECKS**: `docs/testing/QUALITY_CHECK_PROCEDURES.md` (Validation procedures)
- **API**: `docs/api/openapi.yaml`, individual API docs
- **Data Model**: `docs/dataModel/README.md`
- **Dev Journal**: `docs/devJournal/`
- **Roadmap**: `docs/roadmap/`
- **Archived**: `docs/archived/` (Historical documentation and upgrade records)

## Workflows

Located in `.clinerules/workflows/`:

- memory-bank-update, api-work, api-tests-specs-update
- sprint-review, dev-journal, doc-update
- commit, pull-request, data-model, kick-off

Execute: `"Run the [workflow-name] workflow"`

## Services

- Confluence: <http://localhost:8090>
- PostgreSQL: localhost:5432
- MailHog: <http://localhost:8025>

## Context

**Maturity**: Functional stage, proven patterns
**Timeline**: 4-week MVP deadline
**Focus**: Remaining APIs using established patterns
**Templates**: StepsApi.groovy, TeamsApi.groovy, LabelsApi.groovy, InstructionsApi.groovy
