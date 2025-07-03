# UMIG Project - Gemini AI Assistant Guide

## Project Overview

UMIG (Unified Migration Implementation Guide) is a bespoke, multi-user, real-time web application designed to manage and orchestrate complex IT cutover events for data migration projects. Built as a **pure ScriptRunner application** for Atlassian Confluence, it provides a central command and control platform for managing hierarchical implementation plans.

### Core Architecture
- **Backend**: Groovy scripts using ScriptRunner for Confluence
- **Frontend**: Vanilla JavaScript SPAs with Atlassian AUI styling
- **Database**: PostgreSQL with Liquibase migrations
- **Development Environment**: Podman-based containerization
- **API**: RESTful endpoints following v2 conventions

## Tech Stack & Dependencies

### Primary Technologies
- **Confluence + ScriptRunner**: Application runtime environment
- **Groovy**: Backend development language
- **PostgreSQL 14**: Primary database
- **Liquibase**: Database migration management
- **Podman**: Containerization for local development
- **Node.js**: Data utilities and testing framework
- **Vanilla JavaScript**: Frontend development (no frameworks)

### Key Dependencies
- **@faker-js/faker**: Synthetic data generation
- **Jest**: Unit testing for Node.js utilities
- **pg**: PostgreSQL driver for Node.js
- **commander**: CLI interface for utilities

## Project Structure

```
UMIG/
├── src/                              # Main application source
│   ├── com/umig/                     # Packaged backend (Java-style)
│   │   ├── api/v2/                   # REST API endpoints
│   │   ├── repository/               # Data access layer
│   │   └── utils/                    # Utility classes
│   ├── macros/                       # ScriptRunner macros for UI
│   ├── test/                         # Unit tests (Groovy)
│   └── web/                          # Frontend assets (CSS/JS)
├── docs/                             # Comprehensive documentation
│   ├── adr/                          # Architecture Decision Records
│   ├── api/                          # API documentation & OpenAPI spec
│   ├── dataModel/                    # Database schema & ERD
│   ├── devJournal/                   # Sprint reviews & dev notes
│   └── ui-ux/                        # UI/UX specifications
├── local-dev-setup/                  # Node.js development environment
│   ├── scripts/                      # Data generation and utilities
│   │   ├── generators/               # Individual data generators
│   │   ├── lib/                      # Shared utilities (db.js, utils.js)
│   │   ├── start.js, stop.js         # Environment management
│   │   └── umig_generate_fake_data.js # Main data generation script
│   ├── __tests__/                    # Jest unit tests and fixtures
│   ├── liquibase/                    # Database migrations
│   ├── confluence/                   # Container configuration
│   ├── postgres/                     # Database initialization
│   ├── package.json                  # npm scripts and dependencies
│   └── podman-compose.yml            # Container orchestration
├── tests/                            # Integration tests (Groovy)
└── cline-docs/                       # AI assistant context docs
```

## Build & Development Commands

### Environment Management (Node.js Only - No Shell Scripts)
```bash
# From local-dev-setup/ directory - npm scripts only
cd local-dev-setup

npm install            # First-time setup
npm start              # Start complete development stack
npm stop               # Graceful shutdown of all services  
npm run restart        # Restart environment
npm run restart:erase  # Restart and erase all data volumes
npm test               # Run all tests

# Advanced data management
npm run generate-data:erase  # Generate fake data with reset
npm run generate-data        # Generate fake data without reset
```

### Data Generation & Testing
```bash
# All commands from local-dev-setup/ directory
cd local-dev-setup

# Generate synthetic data
npm run generate-data        # Generate without reset
npm run generate-data:erase  # Generate with full reset
node scripts/umig_generate_fake_data.js  # Direct script execution

# Run Node.js unit tests
npm test

# Run Groovy integration tests (from project root)
cd ..
./tests/run-integration-tests.sh
```

### Database Operations
```bash
# Run Liquibase migrations manually
liquibase --defaults-file=liquibase/liquibase.properties update
```

## Core Data Model

### Design Philosophy: Canonical vs Instance
- **Canonical (Master) Entities**: Reusable templates/playbooks (`_master_` suffix)
- **Instance Entities**: Time-bound execution records (`_instance_` suffix)

### Entity Hierarchy (Current - Iteration-Centric Model)
1. **Strategic Layer**: `Migrations` → `Iterations` → `Plans`
2. **Canonical Layer**: `Plans` → `Sequences` → `Phases` → `Steps` → `Instructions`
3. **Quality Gates**: `Controls` defined at Phase level
4. **Instance Layer**: Mirrors canonical hierarchy with execution tracking
5. **Collaboration**: Comments at both master and instance levels

### Key Tables (Updated July 2025)
- `migrations_mig`: Strategic initiatives
- `iterations_itr`: Links migrations to plans for iterative delivery
- `plans_master_plm`: Master playbooks
- `steps_master_stm`: Granular executable tasks
- `instructions_master_inm`: Detailed procedures
- `step_master_comments`, `step_instance_comments`: Collaboration features
- `*_instance_*`: Live execution tracking

## Architecture Patterns

### SPA + REST Pattern (ADR020)
**All admin interfaces follow this standardized pattern:**

**Backend (Groovy)**:
```groovy
@BaseScript CustomEndpointDelegate delegate

entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Repository pattern for data access
    // Return JSON responses
    return Response.ok(payload).build()
}
```

**Frontend (Vanilla JS)**:
- Single JS file per entity (`entity-name.js`)
- Dynamic rendering of list/detail/edit views
- No page reloads, seamless navigation
- Atlassian AUI styling

### Database Access Pattern
```groovy
// Required pattern using DatabaseUtil.withSql
DatabaseUtil.withSql { sql ->
    return sql.rows('SELECT * FROM table_name')
}
```

### REST Endpoint Structure
- Base URL: `/rest/scriptrunner/latest/custom/`
- Endpoints: `/users`, `/teams`, `/plans`, `/stepViewApi`
- V2 API conventions (documented in `docs/api/openapi.yaml`)

## Key Development Guidelines

### Groovy/ScriptRunner Requirements
1. **REST Endpoints**: Must use `CustomEndpointDelegate` pattern
2. **Database Access**: Must use `DatabaseUtil.withSql` pattern  
3. **Security**: Include `groups: ["confluence-users"]` by default
4. **Type Safety**: Use explicit casting when IDE reports errors but runtime type is certain
5. **Path Parameters**: Use `getAdditionalPath(request)` for URL segments

### Frontend Requirements
1. **No Frameworks**: Use vanilla JavaScript only
2. **Styling**: Atlassian AUI components and styles
3. **API Calls**: Use fetch() with robust error handling
4. **Forms**: Dynamic generation from entity fields
5. **Navigation**: Single-page application workflow

## Testing Strategy

### Unit Tests
- **Location**: `src/test/` (Groovy), `local-dev-setup/data-utils/__tests__/` (Node.js)
- **Purpose**: Fast, isolated component validation
- **Technology**: Groovy for backend, Jest for Node.js utilities

### Integration Tests
- **Location**: `tests/integration/`
- **Purpose**: End-to-end validation against live environment
- **Requirements**: Running local development stack
- **Technology**: Groovy with PostgreSQL JDBC

## Configuration Files

### Environment
- **Podman Compose**: `local-dev-setup/podman-compose.yml`
- **Environment Variables**: `local-dev-setup/.env` (user-created)
- **Database**: PostgreSQL with connection pooling

### Database
- **Liquibase Config**: `local-dev-setup/liquibase/liquibase.properties`
- **Migrations**: `local-dev-setup/liquibase/changelogs/`
- **Connection Pool**: `umig_db_pool` in ScriptRunner

## Services & Ports

When development environment is running:
- **Confluence**: <http://localhost:8090>
- **PostgreSQL**: localhost:5432
- **MailHog**: <http://localhost:8025> (email testing)

## Key Documentation

### **PRIMARY REFERENCE (MANDATORY)**
- **`docs/solution-architecture.md`**: Complete solution architecture consolidating all 26 ADRs - ALWAYS REVIEW FIRST

### Critical References
- **API Spec**: `docs/api/openapi.yaml` - OpenAPI specification
- **Data Model**: `docs/dataModel/README.md` - Database schema and ERD
- **Current ADRs**: `docs/adr/` (skip `docs/adr/archive/` - consolidated in solution-architecture.md)

### Development Context
- **Dev Journal**: `docs/devJournal/` - Sprint reviews and progress tracking
- **Project Context**: `cline-docs/` - AI assistant context and progress
- **UI/UX Specs**: `docs/ui-ux/` - Interface specifications

## Implementation Status (July 2025)

### ✅ Completed Features
- **Local Development Environment**: Node.js orchestrated Podman containers
- **Admin UI (SPA Pattern)**: Complete user/team management with robust error handling
- **API Standards**: Comprehensive REST patterns (ADR-023) with specific error mappings
- **Data Generation**: Modular synthetic data generators with 3-digit prefixes
- **Testing Framework**: Stabilized with specific SQL query mocks (ADR-026)
- **Architecture Documentation**: All 26 ADRs consolidated into solution-architecture.md

### 🚧 MVP Remaining Work
- **Core REST APIs**: Plans, Chapters, Steps, Tasks, Controls, Instructions, Labels endpoints
- **Main Dashboard UI**: Real-time interface with AJAX polling
- **Planning Feature**: HTML macro-plan generation and export
- **Data Import Strategy**: Migration from existing Confluence/Draw.io/Excel sources

### STEP View System (Existing)
- Macro: `stepViewMacro.groovy`
- Frontend: `step-view.js`
- API: `stepViewApi.groovy`
- Purpose: Display migration/release steps in Confluence

## Development Workflow

1. **Environment Setup**: `cd local-dev-setup && npm install && npm start`
2. **Database Changes**: Create Liquibase changesets in `local-dev-setup/liquibase/changelogs/`
3. **Backend Development**: Add Groovy classes in `src/com/umig/`
4. **Frontend Development**: Create/modify JS files in `src/web/js/`
5. **Testing**: Run unit tests (`npm test` in local-dev-setup) and integration tests (`./tests/run-integration-tests.sh`)
6. **Documentation**: Update relevant documentation, primarily `docs/solution-architecture.md`

## Important Notes

- **No External Frameworks**: Project deliberately avoids heavy JS frameworks
- **ScriptRunner Only**: Not a traditional Confluence plugin
- **Security**: All endpoints require Confluence user authentication
- **Type Safety**: Defensive type handling for all API payloads
- **Architecture Locked**: Core decisions finalized for MVP phase

## AI Assistant Guidelines

### **CRITICAL: Always Start Here**
1. **MANDATORY FIRST STEP**: Review `/docs/solution-architecture.md` for complete architectural context
2. **Skip Archive**: Ignore `/docs/adr/archive/` - all content consolidated in solution-architecture.md

### Development Standards (Non-Negotiable)
1. **API Pattern**: Use established SPA+REST pattern - reference `TeamsApi.groovy` and `UsersApi.groovy`
2. **Database Access**: MANDATORY `DatabaseUtil.withSql` pattern - no exceptions
3. **Testing**: Specific SQL query mocks required (ADR-026) - prevent regressions
4. **Naming**: Strict `snake_case` database conventions with `_master_`/`_instance_` suffixes
5. **Error Handling**: Specific SQL state mappings (23503→400, 23505→409)

### Project Context (Current State)
- **Maturity**: Proof-of-concept with solid architectural foundation
- **Timeline**: 4-week MVP deadline - ruthless scope management required
- **Focus**: Complete core REST APIs and main dashboard implementation
- **Pattern**: Reference existing user/team management as implementation template