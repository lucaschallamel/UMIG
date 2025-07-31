# UMIG Project - Claude AI Assistant Guide

## Overview
UMIG (Unified Migration Implementation Guide) - Pure ScriptRunner application for Atlassian Confluence managing complex IT cutover events.

**Stack**: Groovy/ScriptRunner backend, Vanilla JS/AUI frontend, PostgreSQL/Liquibase, Podman containers, RESTful v2 APIs

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
│   ├── tests/               # Testing
│   ├── utils/               # Utilities
│   └── web/js/              # Frontend (admin-gui/* modular)
├── local-dev-setup/         # Dev environment
│   ├── scripts/generators/  # Data generation (001-100)
│   ├── liquibase/           # DB migrations
│   └── podman-compose.yml   # Container orchestration
├── docs/                    # Documentation
│   ├── solution-architecture.md  # PRIMARY REFERENCE (33 ADRs consolidated)
│   ├── api/openapi.yaml     # API spec
│   └── roadmap/             # UI/UX specs
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
./src/groovy/umig/tests/run-integration-tests.sh  # Groovy tests
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

## Status (July 2025)

### ✅ Completed
- Development environment, Admin UI (SPA pattern)
- APIs: Users, Teams, Environments, Applications, Labels, Steps, Migrations
- Iteration View: Primary runsheet interface with full filtering
- Type safety patterns, hierarchical filtering
- Architecture consolidation (solution-architecture.md)
- Admin GUI modularization (8 components)

### 🚧 MVP Remaining
- APIs: Plans, Sequences, Phases, Instructions
- Main Dashboard UI
- Planning Feature (HTML export)
- Data Import Strategy

## Key References
- **PRIMARY**: `docs/solution-architecture.md` (ALWAYS REVIEW FIRST)
- **API**: `docs/api/openapi.yaml`, individual API docs
- **Data Model**: `docs/dataModel/README.md`
- **Dev Journal**: `docs/devJournal/`
- **Roadmap**: `docs/roadmap/`

## Workflows
Located in `.clinerules/workflows/`:
- memory-bank-update, api-work, api-tests-specs-update
- sprint-review, dev-journal, doc-update
- commit, pull-request, data-model, kick-off

Execute: `"Run the [workflow-name] workflow"`

## Services
- Confluence: http://localhost:8090
- PostgreSQL: localhost:5432
- MailHog: http://localhost:8025

## Context
**Maturity**: Functional stage, proven patterns
**Timeline**: 4-week MVP deadline
**Focus**: Remaining APIs using established patterns
**Templates**: StepsApi.groovy, TeamsApi.groovy, LabelsApi.groovy