# UMIG Project - Claude AI Assistant Guide

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
├── local-dev-setup/                  # Development environment
│   ├── data-utils/                   # Node.js data generation tools
│   ├── liquibase/                    # Database migrations
│   └── *.sh                          # Environment management scripts
├── tests/                            # Integration tests (Groovy)
└── cline-docs/                       # AI assistant context docs
```

## Build & Development Commands

### Environment Management
```bash
# Start development environment
./local-dev-setup/start.sh

# Stop environment  
./local-dev-setup/stop.sh

# Restart environment (--reset flag deletes database)
./local-dev-setup/restart.sh [--reset]
```

### Data Generation & Testing
```bash
# Generate synthetic data (from local-dev-setup/data-utils/)
npm run start
# or
node umig_generate_fake_data.js

# Run Node.js unit tests
npm test

# Run Groovy integration tests (from project root)
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

### Entity Hierarchy
1. **Strategic Layer**: `Migrations` → `Iterations`
2. **Canonical Layer**: `Plans` → `Sequences` → `Phases` → `Steps` → `Instructions`
3. **Quality Gates**: `Controls` defined at Phase level
4. **Instance Layer**: Mirrors canonical hierarchy with execution tracking

### Key Tables
- `migrations_mig`: Strategic initiatives
- `plans_master_plm`: Master playbooks
- `steps_master_stm`: Granular executable tasks
- `instructions_master_inm`: Detailed procedures
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

### Must-Read ADRs
- **ADR-018**: Pure ScriptRunner Application Structure
- **ADR020**: SPA+REST Admin Entity Management Pattern
- **ADR-017**: V2 REST API Architecture

### Technical References
- **API Spec**: `docs/api/openapi.yaml`
- **Data Model**: `docs/dataModel/README.md` (includes full ERD)
- **Groovy Guidelines**: `src/README.md`
- **Testing Guide**: `tests/README.md`

### Current Development
- **Dev Journal**: `docs/devJournal/` (sprint reviews, daily notes)
- **UI/UX Specs**: `docs/ui-ux/`
- **Progress Tracking**: `cline-docs/progress.md`

## Key Features Implemented

### Admin UI (SPA Pattern)
- User management (`user-list.js`, `UsersApi.groovy`)
- Team management
- Dynamic form generation
- Seamless navigation

### STEP View System
- Macro: `stepViewMacro.groovy`
- Frontend: `step-view.js`
- API: `stepViewApi.groovy`
- Purpose: Display migration/release steps in Confluence

### Data Generation
- Modular fake data generators
- CSV import utilities
- Comprehensive test fixtures

## Development Workflow

1. **Environment Setup**: Run `./local-dev-setup/start.sh`
2. **Database Changes**: Create Liquibase changesets in `liquibase/changelogs/`
3. **Backend Development**: Add Groovy classes in `src/com/umig/`
4. **Frontend Development**: Create/modify JS files in `src/web/js/`
5. **Testing**: Run unit tests (`npm test`) and integration tests (`./tests/run-integration-tests.sh`)
6. **Documentation**: Update relevant ADRs and README files

## Important Notes

- **No External Frameworks**: Project deliberately avoids heavy JS frameworks
- **ScriptRunner Only**: Not a traditional Confluence plugin
- **Security**: All endpoints require Confluence user authentication
- **Type Safety**: Defensive type handling for all API payloads
- **Architecture Locked**: Core decisions finalized for MVP phase

## AI Assistant Guidelines

When working on this project:
1. Follow the established SPA+REST pattern for new admin interfaces
2. Use the required Groovy patterns for database access and REST endpoints
3. Maintain consistency with existing code style and architecture
4. Update relevant documentation when making changes
5. Consider the canonical vs instance data model when working with entities
6. Test changes using both unit and integration test suites
7. Reference existing implementations as patterns for new features