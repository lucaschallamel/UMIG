# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UMIG (Unified Migration Implementation Guide) is a pure ScriptRunner application for Atlassian Confluence managing complex IT cutover events. Built without external frameworks using Groovy backend, vanilla JavaScript frontend, and PostgreSQL database.

**Stack**: Groovy 3.0.15 (ScriptRunner 9.21.0), Vanilla JS with AUI, PostgreSQL 14 with Liquibase, Podman containers, RESTful v2 APIs

## Current Sprint Status

**Sprint 8**: Security Architecture Enhancement (Started September 26, 2025)
**Branch**: `bugfix/US-058-email-service-iteration-step-views`
**Focus**: Enhanced security architecture with ADRs 67-70
**Previous Sprint 7**: Achieved 224% completion (130/58 points)

## Critical Commands

### Environment Management (from `local-dev-setup/`)

```bash
npm start                    # Start complete development stack
npm stop                     # Stop all services
npm run restart:erase        # Reset everything (clean slate)
npm run generate-data:erase  # Generate fake data with reset - DO NOT USE without user permission
```

### Testing Commands - Technology-Prefixed Architecture

```bash
# JavaScript Testing (Jest)
npm run test:js:unit         # JavaScript unit tests
npm run test:js:integration  # JavaScript integration tests
npm run test:js:e2e          # JavaScript E2E tests
npm run test:js:quick        # Quick test suite (~158 tests)
npm run test:js:components   # Component unit tests (95%+ coverage)
npm run test:js:security     # Component security tests (28 scenarios)
npm run test:js:security:pentest # Penetration testing (21 attack vectors)

# Groovy Testing - 31/31 tests passing (100%)
npm run test:groovy:unit     # Groovy unit tests
npm run test:groovy:integration # Groovy integration tests
npm run test:groovy:all      # All Groovy tests

# Cross-Technology Commands
npm run test:all:comprehensive # Complete test suite
npm run test:all:unit        # All unit tests (JS + Groovy)
npm run test:all:quick       # Quick validation
```

### Running Single Tests

```bash
# JavaScript tests (Jest)
npm run test:js:unit -- --testPathPattern='specific.test.js'

# Groovy tests - Self-contained architecture (from project root)
groovy src/groovy/umig/tests/unit/SpecificTest.groovy

# Component tests
npm run test:js:components -- --testPathPattern='TeamsEntityManager'
```

### Email Testing (MailHog)

```bash
npm run mailhog:test        # Test SMTP connectivity
npm run mailhog:check       # Check message count
npm run mailhog:clear       # Clear test inbox
npm run email:test          # Comprehensive email testing
```

### API Documentation

```bash
npm run validate:openapi     # Validate OpenAPI specification
npm run generate:redoc       # Generate ReDoc documentation
```

### Build & Deployment

```bash
npm run build:production     # Production build with 84% size reduction
npm run build:deployment     # Create deployment package
```

### Health Checks

```bash
npm run health:check         # Verify system health
npm run postgres:check       # Check database connectivity
npm run confluence:check     # Check Confluence status
npm run scriptrunner:check   # Verify ScriptRunner installation
```

## Architecture & Critical Patterns

### Hierarchical Data Model

**Entity Hierarchy**: Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions
**Pattern**: Canonical (`_master_`) templates vs Instance (`_instance_`) execution records
**Scale**: Handles 5 migrations, 30 iterations, 1,443+ step instances

### Database Access Pattern (MANDATORY)

```groovy
// ALWAYS use DatabaseUtil.withSql pattern
DatabaseUtil.withSql { sql ->
    return sql.rows('SELECT * FROM table_name WHERE id = ?', [id])
}
```

### Type Safety (ADR-031, ADR-043)

```groovy
// MANDATORY explicit casting for ALL parameters
UUID.fromString(param as String)      // UUIDs
Integer.parseInt(param as String)     // Integers
param.toUpperCase() as String        // Strings
```

### REST API Pattern

```groovy
@BaseScript CustomEndpointDelegate delegate

entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Lazy load repositories to avoid class loading issues
    def getRepository = { -> new SomeRepository() }

    // Type safety with explicit casting
    params.migrationId = UUID.fromString(filters.migrationId as String)

    return Response.ok(payload).build()
}
```

### JavaScript Module Loading (ADR-057)

```javascript
// ✅ CORRECT - Direct class declaration without IIFE
class ModalComponent extends BaseComponent { ... }
window.ModalComponent = ModalComponent;

// ❌ WRONG - Never use IIFE wrappers (causes race conditions)
(function() { ... })();
```

### Component Architecture

**Component Lifecycle**: initialize() → mount() → render() → update() → unmount() → destroy()
**Security Pattern**: Use `window.SecurityUtils` for XSS/CSRF protection (ADR-058)
**Base Pattern**: Always extend BaseEntityManager for entity managers (ADR-060)

### Error Handling

```groovy
// SQL state mappings
if (e.getSQLState() == '23503') {
    throw new BadRequestException("Foreign key violation")
} else if (e.getSQLState() == '23505') {
    throw new ConflictException("Unique constraint violation")
}
```

## Non-Negotiable Standards

1. **Database**: `DatabaseUtil.withSql` pattern ONLY
2. **Type Safety**: Explicit casting for ALL parameters
3. **Frontend**: Pure vanilla JavaScript, NO frameworks
4. **Security**: `groups: ["confluence-users"]` on all endpoints
5. **Testing**: Self-contained architecture for Groovy tests
6. **Naming**: Database `snake_case` with `_master_`/`_instance_` suffixes
7. **Repository Pattern**: ALL data access through repositories
8. **Schema Authority**: Database schema is truth - fix code, not schema (ADR-059)
9. **Module Loading**: NEVER use IIFE wrappers - use direct class declaration
10. **Component Security**: Enterprise-grade controls (8.5+/10 rating required)

## Key File Locations

### API Endpoints

- Implementation: `src/groovy/umig/api/v2/*.groovy`
- Documentation: `docs/api/*.md`
- OpenAPI: `docs/api/openapi.yaml` (v2.12.0)

### Repositories

- Location: `src/groovy/umig/repository/*.groovy`
- Pattern: All data access via repositories with `DatabaseUtil.withSql`

### Frontend Components

- Core: `src/groovy/umig/web/js/components/*.js`
- Entity Managers: `src/groovy/umig/web/js/entities/*/*.js`
- Security: `ComponentOrchestrator.js` (62KB, 8.5/10 rating)

### Testing

- JavaScript: `local-dev-setup/__tests__/`
- Groovy: `src/groovy/umig/tests/`
- Configurations: `jest.config.*.js`

### Architecture Documentation

- Central Hub: `docs/architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md`
- ADRs: `docs/architecture/adr/` (70+ decisions)
- Latest ADRs: ADR-067 through ADR-070 (Security Architecture)

### Sprint Documentation

- Roadmap: `docs/roadmap/unified-roadmap.md`
- Sprint 7: `docs/roadmap/sprint7/` (224% completion achieved)
- Sprint 8: Security Architecture Enhancement (current)

## Services & Endpoints

- **Confluence**: http://localhost:8090 (admin/123456)
- **PostgreSQL**: localhost:5432 (umig_app_db)
- **MailHog**: http://localhost:8025
- **API Base**: `/rest/scriptrunner/latest/custom/`

### Complete API Endpoints (31+ total)

**Core**: Users, Teams, TeamMembers, Environments, Applications, Labels, Migrations, Status
**Hierarchy**: Plans, Sequences, Phases, Steps, EnhancedSteps, Instructions, Iterations
**Admin**: SystemConfiguration, UrlConfiguration, Controls, IterationTypes, MigrationTypes, EmailTemplates
**System**: AdminVersion, Dashboard, DatabaseVersions, Roles
**Special**: Import, ImportQueue, StepView, Web, TestEndpoint
**Relationships**: TeamsRelationship, UsersRelationship

## Quick Troubleshooting

### Component Loading Issues

- Check for IIFE wrappers (remove them)
- Verify SecurityUtils.js loads first
- Check ComponentOrchestrator initialization

### Type Casting Errors

```groovy
// Common fixes
UUID.fromString(param as String)
Integer.parseInt(param as String)
param?.toString() ?: ''
(param as Map<String, Object>)?.get('key')
```

### Test Failures

- JavaScript: Check `jest.config.*.js` environment settings
- Groovy: Run from project root, not test directory
- Clean database: `npm run restart:erase` (WARNING: erases data)

### Authentication Issues

- Check UserService fallback hierarchy
- Verify ADR-042 dual authentication pattern
- Review session-based authentication in `SESSION_AUTH_UTILITIES.md`

## Development Workflows

### Adding New Entity to Admin GUI

1. Create API: `src/groovy/umig/api/v2/{Entity}Api.groovy`
2. Create repository: `src/groovy/umig/repository/{Entity}Repository.groovy`
3. Create entity manager: `src/groovy/umig/web/js/entities/{entity}/{Entity}EntityManager.js`
4. Register in ComponentOrchestrator
5. Add Liquibase migrations
6. Write tests: `npm run test:js:components -- --testPathPattern={Entity}`

### Debugging

```bash
# Frontend console errors to watch for:
# - "BaseComponent not available" → Module loading race condition
# - CSRF token errors → SecurityUtils.js load order
# - API 404 → Verify endpoint registration in ScriptRunner UI

# Backend debugging
npm run logs:confluence      # View Confluence logs
npm run logs:postgres        # View PostgreSQL logs
npm run logs:all             # View all container logs
```

## Important Reminders

- Database: Use `.env` credentials with `umig_app_db`
- API Testing: Basic auth with `.env` credentials for CURL/Postman
- Stack Management: Usually running, ask before restarting
- Git Operations: Never add/commit without explicit user request
- Data Reset: Use `npm run restart:erase:umig` then `npm run generate-data`
- ScriptRunner Cache: Ask user to refresh manually when needed
- Schema Changes: NEVER modify schema to match code - fix code to match schema
