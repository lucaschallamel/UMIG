# UMIG ScriptRunner Source Tree Overview

This document serves as the main entry point for developers working with the UMIG Groovy source code. It describes the structure, conventions, and mandatory requirements for all Groovy backend code and frontend assets used by ScriptRunner in the UMIG project.

## Project Status (August 28, 2025)

**✅ Sprint 5 COMPLETE - Production Ready System:**

- Complete REST API suite (13 v2 APIs) with 100% functionality
- Repository pattern with DatabaseUtil.withSql enforcement across all components
- Type safety compliance (ADR-031) with comprehensive explicit casting implementation
- BaseIntegrationTest framework standardization (US-037) with 80% development acceleration
- Admin GUI with complete SPA architecture (13/13 entities fully operational)
- Enhanced email notification system (US-039A) with mobile-responsive templates
- Service layer standardization (US-056-A) with unified DTO architecture
- StepView UI refactoring (US-036) with modern UX patterns
- Main Dashboard UI (US-033) with streamlined interface
- Infrastructure automation and cross-platform testing framework
- PostgreSQL production patterns (ADR-047) with enhanced performance
- Authentication resolution with comprehensive validation systems

**✅ Sprint 5 Achievements:**

- 89% story completion rate (8/9 stories) with 93% velocity (39/42 points)
- MVP functionality 100% operational with production-ready quality
- Cross-platform development infrastructure with JavaScript-based testing
- Systematic data structure improvements preventing template rendering failures

## Directory Structure

```
src/groovy/umig/
├── api/v2/                 # REST API endpoints (13 APIs)
├── macros/v1/             # Confluence macros (3 macros)
├── repository/            # Data access layer (19 repositories)
├── tests/                 # Testing framework (4 consolidated scripts)
│   ├── apis/             # API-specific tests
│   ├── integration/      # Integration tests
│   ├── unit/            # Unit tests
│   ├── upgrade/         # Upgrade validation (US-032)
│   └── validation/      # Quality validators
├── utils/                # Shared utilities (6 core services)
└── web/                  # Frontend assets (8 JS modules, CSS)
    ├── js/              # JavaScript modules
    └── css/             # Stylesheets
```

## Architectural Patterns

### 1. Repository Pattern (MANDATORY)

All database access must use the repository pattern with `DatabaseUtil.withSql`:

```groovy
// CORRECT - Repository method
DatabaseUtil.withSql { sql ->
    return sql.rows('''
        SELECT id, name, email
        FROM tbl_users
        WHERE active = true
    ''')
}

// INCORRECT - Direct SQL access
def sql = Sql.newInstance(...)  // ❌ Not allowed
```

### 2. REST API Pattern (MANDATORY)

All APIs follow the `CustomEndpointDelegate` pattern established in StepsApi.groovy:

```groovy
@BaseScript CustomEndpointDelegate delegate

entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Type safety with explicit casting (ADR-031)
    def id = UUID.fromString(request.pathParameters.id as String)

    // Repository pattern usage
    def result = EntityRepository.findById(id)

    return Response.ok(result).build()
}
```

### 3. Type Safety (ADR-031 - MANDATORY)

Explicit casting is required for all query parameters and path variables:

```groovy
// CORRECT - Explicit casting
params.migrationId = UUID.fromString(filters.migrationId as String)
params.teamId = Integer.parseInt(filters.teamId as String)
params.isActive = Boolean.parseBoolean(filters.isActive as String)

// INCORRECT - Implicit conversion
params.migrationId = filters.migrationId  // ❌ Type unsafe
```

## Mandatory Requirements

### Database Access (ADR-026, ADR-030)

- **ONLY** use `DatabaseUtil.withSql` pattern
- All repositories must extend proper base patterns
- Connection pooling handled automatically
- SQL injection protection enforced

### Error Handling

- Map SQL states to HTTP codes: 23503→400, 23505→409
- Use proper Response.status() methods
- Include meaningful error messages
- Follow error patterns in StepsApi.groovy

### Security

- Default to `groups: ["confluence-users"]`
- Validate all inputs before processing
- Use UUID validation for IDs
- Sanitize all user inputs

### Performance

- Use hierarchical filtering with instance IDs
- Include ALL referenced fields in SELECT
- Avoid N+1 query patterns
- Cache frequently accessed lookups

## Groovy Version Compatibility

**Target Version**: Groovy 3.0.15 (ScriptRunner 9.21.0)

- Static type checking compatible
- Modern Groovy syntax supported
- @BaseScript annotations required for endpoints
- Closure-based patterns for database access

## Quick Navigation

- **API Development**: See `api/README.md` for REST endpoint patterns
- **Repository Layer**: See `repository/README.md` for data access patterns
- **Testing**: See `tests/README.md` for testing framework and scripts
- **Frontend**: See `web/README.md` for JavaScript/CSS asset management
- **Macros**: See `macros/README.md` for Confluence macro development

## Recent Improvements (US-024)

### API Refactoring

- StepsAPI improved with enhanced error handling
- Comments endpoint error messages standardized
- Repository pattern enforcement across all APIs
- Type safety improvements with explicit casting

### Testing Consolidation

- Reduced from 8 scripts to 4 consolidated test runners
- Added DatabaseQualityValidator for validation testing
- Performance baseline validation integrated
- US-024 quality gate validation implemented

### Documentation Consolidation

- Reduced from 6 files to 3 focused documentation files
- Improved cross-referencing between components
- Enhanced developer guidance and examples

## Development Workflow

### 1. New API Development

1. Reference StepsApi.groovy, TeamsApi.groovy, or LabelsApi.groovy as templates
2. Create corresponding repository class
3. Implement type safety with explicit casting
4. Add integration and unit tests
5. Update OpenAPI specification

### 2. Repository Development

1. Follow patterns in existing repositories
2. Use `DatabaseUtil.withSql` exclusively
3. Implement proper error handling
4. Add comprehensive unit tests
5. Document query patterns and performance considerations

### 3. Testing Requirements

1. All new code requires unit tests
2. Integration tests for API endpoints
3. Use specific SQL query mocks (ADR-026)
4. Performance validation for critical paths

## Key References

- **PRIMARY**: `/docs/solution-architecture.md` (33 consolidated ADRs)
- **API Specs**: `/docs/api/openapi.yaml` and individual API docs
- **Data Model**: `/docs/dataModel/README.md`
- **Operations**: `/docs/operations/README.md`
- **ADR-026**: Testing patterns and SQL mocking
- **ADR-030**: Repository pattern enforcement
- **ADR-031**: Type safety requirements
- **ADR-043**: Dual authentication context management
- **ADR-044**: Mandatory endpoint registration patterns
- **ADR-047**: PostgreSQL production-ready patterns

## Best Practices

### Code Quality

- Follow Groovy static type checking guidelines
- Use meaningful variable and method names
- Add JSDoc-style comments for complex logic
- Maintain consistent error handling patterns

### Performance

- Use hierarchical filtering with instance IDs (pli_id, sqi_id, phi_id)
- Avoid deep object graphs in API responses
- Implement proper pagination for large datasets
- Cache lookup data appropriately

### Maintainability

- Follow established naming conventions
- Keep methods focused and testable
- Use dependency injection patterns where appropriate
- Document complex business logic thoroughly

---

**Environment**: Confluence 9.2.7 + ScriptRunner 9.21.0  
**Status**: Production ready for core functionality, MVP features in progress  
**Stack**: Groovy/ScriptRunner backend, Vanilla JS frontend, PostgreSQL database
