# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UMIG (Unified Migration Implementation Guide) is a pure ScriptRunner application for Atlassian Confluence managing complex IT cutover events. Built without external frameworks using Groovy backend, vanilla JavaScript frontend, and PostgreSQL database.

**Stack**: Groovy 3.0.15 (ScriptRunner 9.21.0), Vanilla JS with AUI, PostgreSQL 14 with Liquibase, Podman containers, RESTful v2 APIs

## Critical Commands

### Environment Management (from `local-dev-setup/`)

```bash
npm start                    # Start complete development stack
npm stop                     # Stop all services
npm run restart:erase        # Reset everything (clean slate)
npm run generate-data:erase  # Generate fake data with reset
```

### Testing Commands - Technology-Prefixed Architecture

```bash
# JavaScript Testing (Jest) - Complete test coverage with component architecture
npm run test:js:unit         # JavaScript unit tests
npm run test:js:integration  # JavaScript integration tests
npm run test:js:e2e          # JavaScript E2E tests
npm run test:js:quick        # Quick test suite (~158 tests)

# Component Testing (Jest) - New component architecture validation
npm run test:js:components   # Component unit tests (95%+ coverage)
npm run test:js:security     # Component security tests (28 scenarios)
npm run test:js:security:pentest # Penetration testing (21 attack vectors)

# Groovy Testing - 31/31 tests passing (100%)
npm run test:groovy:unit     # Groovy unit tests (35% faster compilation)
npm run test:groovy:integration # Groovy integration tests
npm run test:groovy:all      # All Groovy tests

# Cross-Technology Commands
npm run test:all:comprehensive # Complete test suite (unit + integration + e2e + components + security)
npm run test:all:unit        # All unit tests (JS + Groovy + Components)
npm run test:all:quick       # Quick validation across technologies

# Legacy Commands (maintained for compatibility)
npm test                     # Run JavaScript tests
npm run test:unit           # Unit tests
npm run test:integration    # Integration tests
```

### Email Testing (MailHog)

```bash
npm run mailhog:test        # Test SMTP connectivity
npm run mailhog:check       # Check message count
npm run mailhog:clear       # Clear test inbox
```

### Running Single Tests

```bash
# JavaScript tests (Jest)
npm run test:js:unit -- --testPathPattern='specific.test.js'

# Groovy tests - Self-contained architecture (from project root)
groovy src/groovy/umig/tests/unit/SpecificTest.groovy
groovy src/groovy/umig/tests/integration/SpecificIntegrationTest.groovy
```

## Architecture & Patterns

### Hierarchical Data Model

**Entity Hierarchy**: Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions
**Pattern**: Canonical (`_master_`) templates vs Instance (`_instance_`) execution records
**Scale**: Handles 5 migrations, 30 iterations, 1,443+ step instances

### Revolutionary Self-Contained Test Architecture (TD-001)

```groovy
// Self-contained test pattern - embeds all dependencies
class TestClass {
    // Embedded MockSql, DatabaseUtil, repositories directly in test file
    // Eliminates external dependencies and MetaClass complexity
    // 35% compilation performance improvement achieved
}
```

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

### Component Architecture (US-082-B/C)

**Enterprise Component System**: 186KB+ production-ready component suite with ComponentOrchestrator

**Core Components** (location: `src/groovy/umig/web/js/components/`):

- `ComponentOrchestrator.js` - 62KB enterprise-secure orchestration system (8.5/10 security rating)
- `BaseComponent.js` - Foundation component with lifecycle management
- `TableComponent.js` - Advanced data table with sorting, filtering, pagination
- `ModalComponent.js` - Feature-rich modal system with focus management
- `FilterComponent.js` - Advanced filtering with persistence
- `PaginationComponent.js` - Performance-optimized pagination
- `SecurityUtils.js` - XSS/CSRF protection utilities

**Entity Managers** (location: `src/groovy/umig/web/js/entities/*/`):

- `BaseEntityManager.js` - 914-line architectural foundation (42% development acceleration)
- `TeamsEntityManager.js` - Teams with bidirectional relationships (77% performance improvement)
- `UsersEntityManager.js` - Users with authentication (68.5% performance improvement)
- `EnvironmentsEntityManager.js` - Environment management with advanced filtering
- `ApplicationsEntityManager.js` - Applications with security hardening (9.2/10 rating)
- `LabelsEntityManager.js` - Label management with dynamic type control
- `MigrationTypesEntityManager.js` - Migration type configuration
- `IterationTypesEntityManager.js` - Iteration type workflow configuration

**Component Patterns**:

```javascript
// Standardized lifecycle: initialize() → mount() → render() → update() → unmount() → destroy()
// Event-driven architecture with centralized orchestration
// Security-first design with input validation at boundaries
// Performance optimization through intelligent shouldUpdate() methods
```

### Hierarchical Filtering Pattern

- Use instance IDs (`pli_id`, `sqi_id`, `phi_id`), NOT master IDs
- Include ALL fields in SELECT that are referenced in result mapping
- API pattern: `/resource?parentId={uuid}`

## Key Files & References

### Primary Architecture Document

`docs/architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md` - Hub for 49 ADRs

### Technical Debt Documentation (Revolutionary Achievements)

- `docs/roadmap/sprint6/TD-001.md` - Self-contained architecture breakthrough (100% Groovy test pass rate)
- `docs/roadmap/sprint6/TD-002.md` - Technology-prefixed test infrastructure (100% JavaScript test pass rate)
- `docs/roadmap/sprint6/US-082-B-component-architecture.md` - Component architecture implementation (100% complete)

### Component Architecture Documentation

- `docs/devJournal/20250910-03-emergency-component-architecture.md` - Emergency component development with security hardening
- `ComponentOrchestrator-FINAL-SECURITY-ASSESSMENT.md` - Enterprise security certification (8.5/10 rating)

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

### Complete API Endpoints (27 total)

Core: Users, Teams, TeamMembers, Environments, Applications, Labels, Migrations, Status
Hierarchy: Plans, Sequences, Phases, Steps, EnhancedSteps, Instructions, Iterations
Admin: SystemConfiguration, UrlConfiguration, Controls, IterationTypes, MigrationTypes, EmailTemplates
Special: Import, ImportQueue, StepView, Web, TestEndpoint
Relationships: TeamsRelationship, UsersRelationship

## Testing Infrastructure Excellence

### Revolutionary Achievements (TD-001/TD-002 Complete)

- **100% Test Pass Rate**: JavaScript 64/64, Groovy 31/31
- **35% Performance Improvement**: Groovy compilation optimization
- **Self-Contained Architecture**: Zero external dependencies in tests
- **Technology-Prefixed Commands**: Clear separation between test technologies
- **Zero Compilation Errors**: Complete static type checking compliance

### JavaScript Testing Framework

- Location: `local-dev-setup/__tests__/` (modern structure)
- Categories: unit, integration, e2e, dom, email, security, performance
- Framework: Jest with specialized configurations
- Pattern: `{component}.{type}.test.js`

### Groovy Testing (Self-Contained Pattern)

- Location: `src/groovy/umig/tests/unit/` and `src/groovy/umig/tests/integration/`
- Revolutionary self-contained architecture (embedded dependencies)
- 100% ADR-036 compliance (pure Groovy, no external frameworks)
- Static type optimization with strategic dynamic areas

### Cross-Platform Testing

- All tests runnable on Windows/macOS/Linux
- No shell script dependencies
- Docker/Podman container compatibility
- Smart infrastructure detection for optimal resource usage

## Non-Negotiable Standards

1. **Database**: `DatabaseUtil.withSql` pattern ONLY
2. **Type Safety**: Explicit casting for ALL parameters
3. **Frontend**: Pure vanilla JavaScript, NO frameworks
4. **Security**: `groups: ["confluence-users"]` on all endpoints
5. **Testing**: Self-contained architecture for Groovy tests
6. **Naming**: Database `snake_case` with `_master_`/`_instance_` suffixes
7. **Repository Pattern**: ALL data access through repositories
8. **Error Handling**: SQL state mappings with actionable messages
9. **Layer Separation**: Single enrichment point in repositories (ADR-047)
10. **Service Layer**: Unified DTOs with transformation service (ADR-049)
11. **Component Security**: Enterprise-grade security controls in all components (8.5/10 rating required)
12. **Entity Managers**: Always extend BaseEntityManager for consistent architecture

## Quick Troubleshooting

### Test Failures

- Use technology-prefixed commands for clarity (`test:js:unit` vs `test:groovy:unit`)
- Check self-contained test pattern for Groovy tests
- Verify test database is clean with `npm run restart:erase`
- Use `npm run health:check` for system validation
- For integration test issues: ensure `jest.config.integration.js` uses `jsdom` environment
- Component test failures: check ComponentOrchestrator security configuration

### Component Integration Issues

- Verify ComponentOrchestrator.js initialization and component registration
- Check component lifecycle management (initialize → mount → render → update → unmount → destroy)
- Validate cross-component event communication through orchestrator
- Ensure security controls are active (XSS/CSRF protection, rate limiting)
- For entity managers: confirm they extend BaseEntityManager properly

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

## Documentation Structure

### Sprint 6 Documentation (Current Sprint)

- Technical debt resolution: `docs/roadmap/sprint6/TD-001.md` and `TD-002.md`
- Component architecture: `docs/roadmap/sprint6/US-082-B-component-architecture.md`
- Entity migration standard: `docs/roadmap/sprint6/US-082-C-entity-migration-standard.md`
- Sprint overview: `docs/roadmap/unified-roadmap.md`
- Development journal: `docs/devJournal/20250909-*.md` and `docs/devJournal/20250910-03-emergency-component-architecture.md`

### Architecture Documentation

- Central hub: `docs/architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md`
- 49 ADRs covering all major architectural decisions
- API documentation: `docs/api/` with OpenAPI specifications

### Testing Documentation

- JavaScript framework: `local-dev-setup/__tests__/README.md`
- Groovy framework: `src/groovy/umig/tests/README.md`
- Technology-prefixed commands: `local-dev-setup/PHASE1_TECHNOLOGY_PREFIXED_TESTS.md`

# important-instruction-reminders
Do what has been asked; nothing more, nothing less.
NEVER create files unless they're absolutely necessary for achieving your goal.
ALWAYS prefer editing an existing file to creating a new one.
NEVER proactively create documentation files (*.md) or README files. Only create documentation files if explicitly requested by the User.