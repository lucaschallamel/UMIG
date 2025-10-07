# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

UMIG (Unified Migration Implementation Guide) is a pure ScriptRunner application for Atlassian Confluence managing complex IT cutover events. Built without external frameworks using Groovy backend, vanilla JavaScript frontend, and PostgreSQL database.

**Stack**: Groovy 3.0.15 (ScriptRunner 9.21.0), Vanilla JS with AUI, PostgreSQL 14 with Liquibase, Podman containers, RESTful v2 APIs

**Current Status**: See `docs/roadmap/unified-roadmap.md` for active sprint details and progress tracking.

## Critical Commands

All commands run from `local-dev-setup/` directory unless noted otherwise.

### Environment Management

```bash
npm start                    # Start complete development stack
npm stop                     # Stop all services
npm run restart              # Restart with data preservation
npm run restart:erase        # Reset everything (clean slate)
npm run restart:erase:umig   # Reset only UMIG database
npm run generate-data        # Generate synthetic data (ask user first!)
npm run generate-data:erase  # Generate with database reset (ask user first!)
```

### Testing - Technology-Prefixed Architecture

```bash
# JavaScript Testing (Jest)
npm run test:js:unit         # JavaScript unit tests
npm run test:js:integration  # JavaScript integration tests
npm run test:js:e2e          # End-to-end tests (Playwright)
npm run test:js:components   # Component tests (95%+ coverage)
npm run test:js:security     # Security test suite (28 scenarios)
npm run test:js:security:pentest # Penetration testing (21 attack vectors)

# Groovy Testing (Self-contained, run from project root)
npm run test:groovy:unit     # Groovy unit tests (43 tests, 100% pass rate)
npm run test:groovy:integration # Groovy integration tests
npm run test:groovy:all      # All Groovy tests

# Cross-Technology Commands
npm run test:all:comprehensive # Complete test suite (JS + Groovy)
npm run test:all:unit        # All unit tests (JS + Groovy)
npm run test:all:quick       # Quick validation
```

### Running Single Tests

```bash
# JavaScript tests (Jest)
npm run test:js:unit -- --testPathPattern='TeamsEntityManager'

# Groovy tests - IMPORTANT: Run from project root, not test directory
groovy src/groovy/umig/tests/unit/SpecificTest.groovy

# Component-specific tests
npm run test:js:components -- --testPathPattern='BaseEntityManager'
```

### Email Testing (MailHog)

```bash
npm run mailhog:test        # Test SMTP connectivity
npm run mailhog:check       # Check message count
npm run mailhog:clear       # Clear test inbox
```

### Build & Deployment

```bash
npm run build:uat            # UAT build
npm run build:prod           # Production build (84% size reduction)
npm run build:dev            # Development build with tests
```

### Health Checks & Debugging

```bash
npm run health:check         # Verify system health
npm run logs:postgres        # View PostgreSQL logs
npm run logs:confluence      # View Confluence logs
npm run logs:all             # View all container logs
```

### API Documentation

```bash
npm run validate:openapi     # Validate OpenAPI specification
npm run generate:redoc       # Generate ReDoc documentation
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

// DatabaseUtil automatically handles:
// - Production: ScriptRunner connection pool
// - Test Mode: Direct database connections (when ScriptRunner unavailable)
```

### Type Safety (ADR-031, ADR-043)

```groovy
// MANDATORY explicit casting for ALL parameters
UUID.fromString(param as String)      // UUIDs
Integer.parseInt(param as String)     // Integers
param.toUpperCase() as String        // Strings
(param as Map<String, Object>)?.get('key') // Maps
```

### REST API Pattern

```groovy
@BaseScript CustomEndpointDelegate delegate

entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Lazy load repositories to avoid class loading issues
    def getRepository = { -> new SomeRepository() }

    // Type safety with explicit casting
    def id = UUID.fromString(params.id as String)

    // Always use DatabaseUtil.withSql
    def result = DatabaseUtil.withSql { sql ->
        return getRepository().findById(sql, id)
    }

    return Response.ok(result).build()
}
```

### JavaScript Module Loading (ADR-057)

```javascript
// ✅ CORRECT - Direct class declaration without IIFE
class ModalComponent extends BaseComponent {
    constructor(containerId, config = {}) {
        super(containerId, config);
    }
}
window.ModalComponent = ModalComponent;

// ❌ WRONG - Never use IIFE wrappers (causes race conditions)
(function() {
    class ModalComponent extends BaseComponent { ... }
})();
```

### Component Architecture

**Lifecycle**: initialize() → mount() → render() → update() → unmount() → destroy()
**Base Pattern**: All components extend `BaseComponent` (ADR-054)
**Entity Managers**: All entity managers extend `BaseEntityManager` (ADR-060)
**Security**: Use `window.SecurityUtils` for XSS/CSRF protection (ADR-058)

```javascript
// Example Entity Manager
class TeamsEntityManager extends BaseEntityManager {
  constructor() {
    super("teams", {
      entityName: "Team",
      apiEndpoint: "/teams",
      // ...configuration
    });
  }
}
```

### Email Service Integration (ADR-032, ADR-048)

```groovy
// Use EnhancedEmailService for step notifications
def emailService = new EnhancedEmailService()
def urlService = new UrlConstructionService()

// Construct step view URL
def stepViewUrl = urlService.constructStepViewUrl(
    migrationName, iterationName, stepCode
)

// Send notification with template
emailService.sendStepStatusChangeNotification(
    step, recipients, statusChange, stepViewUrl
)
```

### Error Handling

```groovy
// SQL state mappings (ADR-023)
try {
    // database operation
} catch (SQLException e) {
    if (e.getSQLState() == '23503') {
        throw new BadRequestException("Foreign key violation")
    } else if (e.getSQLState() == '23505') {
        throw new ConflictException("Unique constraint violation")
    }
    throw new InternalServerErrorException(e.message)
}
```

## Non-Negotiable Standards

1. **Database**: `DatabaseUtil.withSql` pattern ONLY
2. **Type Safety**: Explicit casting for ALL parameters
3. **Frontend**: Pure vanilla JavaScript, NO frameworks
4. **Security**: `groups: ["confluence-users"]` on all endpoints
5. **Testing**: Self-contained architecture for Groovy tests (run from project root)
6. **Naming**: Database `snake_case` with `_master_`/`_instance_` suffixes
7. **Repository Pattern**: ALL data access through repositories
8. **Schema Authority**: Database schema is truth - fix code, not schema (ADR-059)
9. **Module Loading**: NEVER use IIFE wrappers - use direct class declaration (ADR-057)
10. **Component Base**: Always extend BaseComponent or BaseEntityManager (ADR-060)

## Key File Locations

### API & Backend

- **API Endpoints**: `src/groovy/umig/api/v2/*.groovy` (31+ endpoints)
- **Repositories**: `src/groovy/umig/repository/*.groovy`
- **Services**: `src/groovy/umig/utils/*.groovy` (EmailService, UrlConstructionService, DatabaseUtil)
- **Macros**: `src/groovy/umig/macros/v1/*.groovy`

### Frontend Components

- **Core Components**: `src/groovy/umig/web/js/components/*.js`
- **Entity Managers**: `src/groovy/umig/web/js/entities/*/*.js`
- **Services**: `src/groovy/umig/web/js/services/*.js`
- **Security**: `ComponentOrchestrator.js` (62KB, 8.5/10 security rating)

### Testing

- **JavaScript Tests**: `local-dev-setup/__tests__/`
- **Groovy Tests**: `src/groovy/umig/tests/` (run from project root!)
- **Test Configs**: `local-dev-setup/jest.config.*.js`

### Documentation

- **Architecture Hub**: `docs/architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md`
- **ADRs**: `docs/architecture/adr/` (74+ architecture decisions)
- **API Spec**: `docs/api/openapi.yaml` (v2.12.0)
- **Data Model**: `docs/dataModel/UMIG_Data_Model.md`
- **Roadmap**: `docs/roadmap/unified-roadmap.md`

## Services & Endpoints

- **Confluence**: http://localhost:8090 (admin/123456)
- **PostgreSQL**: localhost:5432 (umig_app_db)
- **MailHog**: http://localhost:8025
- **API Base**: `/rest/scriptrunner/latest/custom/`

### Complete API Endpoints (31+ total)

**Core**: Users, Teams, TeamMembers, Environments, Applications, Labels, Migrations, Status
**Hierarchy**: Plans, Sequences, Phases, Steps, Instructions, Iterations
**Admin**: SystemConfiguration, UrlConfiguration, Controls, IterationTypes, MigrationTypes, EmailTemplates
**System**: AdminVersion, Dashboard, DatabaseVersions, Roles
**Special**: Import, ImportQueue, StepView, Web, TestEndpoint
**Relationships**: TeamsRelationship, UsersRelationship

## Common Workflows

### Adding New Entity to Admin GUI

1. Create API: `src/groovy/umig/api/v2/{Entity}Api.groovy`
2. Create repository: `src/groovy/umig/repository/{Entity}Repository.groovy`
3. Create entity manager extending BaseEntityManager: `src/groovy/umig/web/js/entities/{entity}/{Entity}EntityManager.js`
4. Register in ComponentOrchestrator
5. Add Liquibase migrations in `local-dev-setup/liquibase/changelogs/`
6. Write tests: `npm run test:js:components -- --testPathPattern={Entity}`

### Debugging Frontend Issues

```bash
# Common console errors to watch for:
# - "BaseComponent not available" → Module loading race condition (check load order)
# - CSRF token errors → SecurityUtils.js load order issue
# - "Cannot read property of undefined" → Check component initialization

# View logs
npm run logs:confluence      # Backend errors
npm run logs:all             # All services

# Test specific component
npm run test:js:components -- --testPathPattern='ComponentName'
```

### Running Groovy Tests Correctly

```bash
# IMPORTANT: Groovy tests must run from project root
cd /Users/lucaschallamel/Documents/GitHub/UMIG  # Navigate to project root
groovy src/groovy/umig/tests/unit/SomeTest.groovy

# Or use npm script (already in correct directory)
npm run test:groovy:unit     # All unit tests
npm run test:groovy:integration # All integration tests
```

### Email Testing Workflow

```bash
# 1. Ensure MailHog is running
npm run mailhog:check

# 2. Test SMTP connectivity
npm run mailhog:test

# 3. Trigger email in application
# 4. View email in browser: http://localhost:8025

# 5. Clear test inbox when done
npm run mailhog:clear
```

## Quick Troubleshooting

### Component Loading Issues

**Symptom**: "BaseComponent is not defined" or similar
**Solution**:

- Check for IIFE wrappers in component files (remove them per ADR-057)
- Verify SecurityUtils.js loads before other components
- Check ComponentOrchestrator initialization order

### Type Casting Errors

```groovy
// Common fixes for PostgreSQL JDBC errors
UUID.fromString(param as String)           // UUID parameters
Integer.parseInt(param as String)          // Integer parameters
param?.toString() ?: ''                    // Nullable strings
(param as Map<String, Object>)?.get('key') // Map access
```

### Test Failures

**JavaScript**: Check `jest.config.*.js` environment settings, verify NODE_ENV
**Groovy**: Must run from project root, not test directory
**Database**: Clean reset with `npm run restart:erase` (WARNING: erases all data!)

### Authentication Issues

- Verify ADR-042 dual authentication pattern (browser session + API context)
- Check UserService fallback hierarchy in logs
- Review session-based auth in `local-dev-setup/SESSION_AUTH_UTILITIES.md`
- Confirm ScriptRunner endpoint registration in Confluence admin UI

### API 404 Errors

- Verify endpoint registration in ScriptRunner UI (Confluence Admin → ScriptRunner → REST Endpoints)
- Check endpoint naming convention (camelCase in code, lowercase in URL)
- Confirm `groups: ["confluence-users"]` is present
- Ask user to refresh ScriptRunner cache if endpoint exists but not found

## Important Reminders

- **Database**: Use `.env` credentials, database name is `umig_app_db`
- **API Testing**: Session-based auth required (see `local-dev-setup/SESSION_AUTH_UTILITIES.md`)
- **Stack Management**: Usually running - ask before restarting
- **Git Operations**: Never add/commit without explicit user request
- **Data Generation**: Always ask before running `generate-data` commands (destructive)
- **ScriptRunner Cache**: Ask user to refresh manually when adding/modifying endpoints
- **Schema Changes**: NEVER modify schema to match code - fix code to match schema (ADR-059)
- **Groovy Tests**: Always run from project root directory

## Common Error Patterns

### "Cannot invoke method on null object"

```groovy
// ❌ WRONG - No null check
def result = obj.someMethod()

// ✅ CORRECT - Safe navigation
def result = obj?.someMethod() ?: defaultValue
```

### "No signature of method... applicable for argument types"

```groovy
// ❌ WRONG - Type inference failure
def id = params.id
UUID uuid = UUID.fromString(id)

// ✅ CORRECT - Explicit casting
def id = params.id as String
UUID uuid = UUID.fromString(id)
```

### Component Not Loading

```javascript
// ❌ WRONG - IIFE wrapper
(function() {
    class MyComponent extends BaseComponent { ... }
    window.MyComponent = MyComponent;
})();

// ✅ CORRECT - Direct declaration
class MyComponent extends BaseComponent { ... }
window.MyComponent = MyComponent;
```

## Development Context

- See `docs/devJournal/` for sprint reviews and development history
- Review `docs/architecture/adr/` for architectural decisions (74+ ADRs)
- Check `docs/roadmap/unified-roadmap.md` for current sprint status
- API documentation in `docs/api/openapi.yaml`
