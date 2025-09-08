# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UMIG (Unified Migration Implementation Guide) is a pure ScriptRunner application for Atlassian Confluence that manages complex IT cutover events. Built without external frameworks, it uses Groovy backend, vanilla JavaScript frontend, and PostgreSQL database.

**Stack**: Groovy 3.0.15 (ScriptRunner 9.21.0), Vanilla JS with AUI, PostgreSQL 14 with Liquibase, Podman containers, RESTful v2 APIs

## Critical Commands

### Environment Management (from `local-dev-setup/`)

```bash
npm start                    # Start complete development stack
npm stop                     # Stop all services
npm run restart:erase        # Reset everything (clean slate)
npm run generate-data:erase  # Generate fake data with reset
```

### Testing Commands

```bash
npm test                     # Run JavaScript tests (Jest)
npm run test:unit           # Groovy unit tests
npm run test:integration    # Integration tests (needs running stack)
npm run test:all            # Complete test suite (unit + integration + uat)
npm run test:us034          # Data import tests (comprehensive)
npm run test:us039          # Email notification tests
npm run test:security       # Security validation tests
npm run health:check        # System health monitoring
npm run quality:check       # Master quality assurance
```

### Email Testing (MailHog)

```bash
npm run mailhog:test        # Test SMTP connectivity
npm run mailhog:check       # Check message count
npm run mailhog:clear       # Clear test inbox
```

## Architecture & Patterns

### Hierarchical Data Model

**Entity Hierarchy**: Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions
**Pattern**: Canonical (`_master_`) templates vs Instance (`_instance_`) execution records
**Scale**: Handles 5 migrations, 30 iterations, 1,443+ step instances

### MANDATORY Database Pattern

```groovy
// ALWAYS use DatabaseUtil.withSql pattern
DatabaseUtil.withSql { sql ->
    return sql.rows('SELECT * FROM table_name WHERE id = ?', [id])
}
```

### REST API Pattern

```groovy
@BaseScript CustomEndpointDelegate delegate

entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Lazy load repositories to avoid class loading issues
    def getRepository = { -> new SomeRepository() }

    // Type safety with explicit casting (ADR-031)
    params.migrationId = UUID.fromString(filters.migrationId as String)
    params.teamId = Integer.parseInt(filters.teamId as String)

    return Response.ok(payload).build()
}
```

### Frontend Rules

- **ZERO frameworks** - Pure vanilla JavaScript only
- Use Atlassian AUI for styling
- Dynamic rendering without page reloads
- Pattern: `/admin-gui/*` modular components

### Hierarchical Filtering Pattern

- Use instance IDs (`pli_id`, `sqi_id`, `phi_id`), NOT master IDs
- Include ALL fields in SELECT that are referenced in result mapping
- API pattern: `/resource?parentId={uuid}`

## Key Files & References

### Primary Architecture Document

`docs/architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md` - Hub for 49 ADRs

### API Templates (Use as Reference)

- `src/groovy/umig/api/v2/StepsApi.groovy` - Most comprehensive API example (1950 lines)
- `src/groovy/umig/api/v2/TeamsApi.groovy` - Standard CRUD pattern
- `src/groovy/umig/api/v2/InstructionsApi.groovy` - Hierarchical filtering

### Repository Pattern

- `src/groovy/umig/repository/StepRepository.groovy` - Complex queries
- All data access via repositories with `DatabaseUtil.withSql`

### Service Layer (US-056)

- `StepInstanceDTO` - Instance execution DTO (516 lines)
- `StepMasterDTO` - Master template DTO (231 lines)
- `StepDataTransformationService` - Data transformation (580 lines)
- Dual DTO architecture for master/instance separation (US-056F)
- Single enrichment point pattern (ADR-047)

## Critical Development Rules

### Type Safety (ADR-031, ADR-043)

```groovy
// MANDATORY explicit casting for ALL parameters
UUID.fromString(param as String)      // UUIDs
Integer.parseInt(param as String)     // Integers
param.toUpperCase() as String        // Strings
```

### Error Handling

- SQL state mappings: 23503→400 (FK violation), 23505→409 (unique constraint)
- Always provide actionable error messages (ADR-039)
- Include context in error responses

### Admin GUI Compatibility

```groovy
// Handle parameterless calls for Admin GUI
if (!filters || filters.isEmpty()) {
    return Response.ok(new JsonBuilder([]).toString()).build()
}
```

### Authentication Context (ADR-042)

- Dual authentication with fallback hierarchy
- UserService provides intelligent user identification
- Always log authentication context for audit

## Services & Endpoints

- **Confluence**: http://localhost:8090
- **PostgreSQL**: localhost:5432 (DB: umig_app_db)
- **MailHog**: http://localhost:8025
- **API Base**: `/rest/scriptrunner/latest/custom/`

### Complete API Endpoints (25 total)

Core: Users, Teams, TeamMembers, Environments, Applications, Labels, Migrations, Status
Hierarchy: Plans, Sequences, Phases, Steps, EnhancedSteps, Instructions, Iterations
Admin: SystemConfiguration, UrlConfiguration, Controls, IterationTypes, MigrationTypes, EmailTemplates
Special: Import, ImportQueue, StepView, Web, TestEndpoint

## Current Focus Areas

### Sprint 6 (100% Complete - 30/30 points)

- ✅ US-056-C: API Layer Integration (DTO pattern, <51ms performance)
- ✅ US-034: Data Import Strategy (Enterprise orchestration, 51ms query performance)
- ✅ US-039-B: Email Template Integration (12.4ms average processing)
- ✅ US-042: Migration Types Management (Dynamic CRUD operations, Admin GUI integration)
- ✅ US-043: Iteration Types Management (Enhanced readonly implementation, visual differentiation)
- ✅ Testing Infrastructure: Modern `__tests__/` directory structure

### Recently Completed (Sprint 5)

- ✅ Email notification system with mobile-responsive templates
- ✅ Cross-platform testing framework (100% JavaScript)
- ✅ Service layer standardization (unified DTOs)
- ✅ Admin GUI complete integration (13 entities)

### Technical Debt & Known Issues

- Authentication context reliability improved with 4-level fallback (ADR-042)
- Template rendering failures resolved with unified DTO pattern (ADR-049)
- Shell script elimination complete - all testing now cross-platform
- UI-level RBAC interim solution (ADR-051) - upgrade to API-level planned (US-074)

## Testing Strategy

### JavaScript Testing Framework

- Location: `local-dev-setup/__tests__/` (modern structure)
- Categories: unit, integration, e2e, uat, regression
- Framework: Jest with Playwright for integration
- Pattern: `{component}.{type}.test.js`

### Groovy Testing

- Location: `src/groovy/umig/tests/unit/` and `src/groovy/umig/tests/integration/`
- Mock specific SQL queries (ADR-026)
- BaseIntegrationTest framework (80% code reduction)
- 95%+ coverage target

### Cross-Platform Testing

- All tests runnable on Windows/macOS/Linux
- No shell script dependencies
- Docker/Podman container compatibility

### Email Testing

- Enhanced framework with database integration
- Mobile-responsive templates validated
- MailHog for SMTP testing (localhost:8025)

## Non-Negotiable Standards

1. **Database**: `DatabaseUtil.withSql` pattern ONLY
2. **Type Safety**: Explicit casting for ALL parameters
3. **Frontend**: Pure vanilla JavaScript, NO frameworks
4. **Security**: `groups: ["confluence-users"]` on all endpoints
5. **Testing**: Specific SQL query mocks to prevent regressions
6. **Naming**: Database `snake_case` with `_master_`/`_instance_` suffixes
7. **Repository Pattern**: ALL data access through repositories
8. **Error Handling**: SQL state mappings with actionable messages
9. **Layer Separation**: Single enrichment point in repositories (ADR-047)
10. **Service Layer**: Unified DTOs with transformation service (ADR-049)

## Quick Troubleshooting

### Authentication Issues

- Check UserService fallback hierarchy
- Verify frontend provides userId when ThreadLocal fails
- Review ADR-042 for context management

### Type Casting Errors

- Ensure explicit casting per ADR-043
- Check repository enrichment patterns (ADR-047)
- Validate PostgreSQL type compatibility

### Template Rendering Failures

- Verify unified DTO usage (ADR-049)
- Check StepDataTransformationService
- Ensure defensive null checking in templates

### Test Failures

- Verify specific SQL mocks (ADR-026)
- Check BaseIntegrationTest usage
- Ensure test database is clean
- Use `npm run health:check` for system validation
- Check `__tests__/` directory for JavaScript tests

## Documentation Structure

### Sprint 6 Documentation

- Primary reference: `docs/roadmap/sprint6/` (story documents)
- Sprint overview: `docs/roadmap/unified-roadmap.md` (complete roadmap)
- Development journal: `docs/devJournal/20250908-01-*.md` for session records

### Architecture Documentation

- Central hub: `docs/architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md`
- 49 ADRs covering all major architectural decisions
- API documentation: `docs/api/` with OpenAPI specifications

### Testing Documentation

- JavaScript framework: `local-dev-setup/__tests__/README.md`
- Groovy framework: `src/groovy/umig/tests/README.md`
- Testing strategies: `docs/testing/README.md`
