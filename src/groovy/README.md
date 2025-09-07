# UMIG ScriptRunner Source Tree Overview

This document serves as the main entry point for developers working with the UMIG Groovy source code. It describes the structure, conventions, and mandatory requirements for all Groovy backend code and frontend assets used by ScriptRunner in the UMIG project.

## Project Status (September 6, 2025)

**✅ Sprint 6 IN PROGRESS - Enhanced Architecture:**

- **NEW**: Dual DTO architecture with StepMasterDTO (templates) and StepInstanceDTO (executions)
- **NEW**: JsonUtil shared ObjectMapper for performance optimization
- **NEW**: Structured JSON schemas in dto/schemas/ directory
- **NEW**: Service layer with StepDataTransformationService for unified data handling
- Complete REST API suite (13 v2 APIs) with 100% functionality
- Repository pattern with DatabaseUtil.withSql enforcement across all components
- Type safety compliance (ADR-031) with comprehensive explicit casting implementation
- BaseIntegrationTest framework standardization (US-037) with 80% development acceleration
- Admin GUI with complete SPA architecture (13/13 entities fully operational)
- Enhanced email notification system (US-039A) with mobile-responsive templates
- Service layer standardization (US-056-A) with unified DTO architecture
- Infrastructure automation and cross-platform testing framework
- PostgreSQL production patterns (ADR-047) with enhanced performance
- Authentication resolution with comprehensive validation systems

**🔄 Sprint 6 Progress:**

- Dual DTO pattern implementation (StepMasterDTO vs StepInstanceDTO)
- Performance optimization with shared ObjectMapper pattern
- JSON schema standardization and validation
- Import orchestration services for CSV/JSON data processing
- Enhanced service layer with transformation services

## Directory Structure

```
src/groovy/umig/
├── api/v2/                 # REST API endpoints (13 APIs)
├── config/                 # Configuration classes
├── dto/                    # Data Transfer Objects
│   ├── schemas/           # JSON schemas for validation
│   ├── StepMasterDTO.groovy    # Template definitions
│   └── StepInstanceDTO.groovy  # Execution instances
├── macros/v1/             # Confluence macros (3 macros)
├── repository/            # Data access layer (25+ repositories)
├── service/               # Business logic services (9 services)
├── tests/                 # Testing framework (4 consolidated scripts)
│   ├── apis/             # API-specific tests
│   ├── integration/      # Integration tests
│   ├── unit/            # Unit tests
│   ├── upgrade/         # Upgrade validation (US-032)
│   └── validation/      # Quality validators
├── utils/                # Shared utilities (9 core services)
│   └── JsonUtil.groovy   # Shared ObjectMapper instance
└── web/                  # Frontend assets (8 JS modules, CSS)
    ├── js/              # JavaScript modules
    └── css/             # Stylesheets
```

## Architectural Patterns

### 1. Dual DTO Architecture (NEW - US-056F)

**StepMasterDTO** and **StepInstanceDTO** provide clear separation of concerns:

```groovy
// StepMasterDTO - For template definitions/master records
class StepMasterDTO {
    // Template fields only: name, description, configuration
    // Used for: Creation, templates, master data management
}

// StepInstanceDTO - For execution instances
class StepInstanceDTO {
    // Instance fields: execution data, status, runtime information
    // Used for: Tracking, execution, monitoring
}

// Performance optimization with shared ObjectMapper
import umig.utils.JsonUtil

def json = JsonUtil.toJson(stepInstance)
def dto = JsonUtil.fromJson(json, StepInstanceDTO.class)
```

### 2. Shared ObjectMapper Pattern (NEW - Performance)

**JsonUtil** provides thread-safe, optimized JSON operations:

```groovy
// CORRECT - Use shared ObjectMapper
import umig.utils.JsonUtil

def json = JsonUtil.toJson(dataObject)
def object = JsonUtil.fromJson(jsonString, TargetClass.class)

// INCORRECT - Creating new ObjectMapper instances
def mapper = new ObjectMapper()  // ❌ Performance impact
```

### 3. Repository Pattern (MANDATORY)

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

### 4. REST API Pattern (MANDATORY)

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

### 5. Type Safety (ADR-031 - MANDATORY)

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

## Recent Improvements (US-056F & Current Sprint)

### Dual DTO Architecture Implementation

- **StepMasterDTO**: Renamed and optimized for template definitions
- **StepInstanceDTO**: Renamed from StepDataTransferObject for execution instances
- Clear separation of concerns between master templates and execution instances
- JSON schema validation files organized in dto/schemas/ directory

### Performance Optimization

- **JsonUtil**: Shared ObjectMapper pattern for 3x performance improvement
- Thread-safe, optimized JSON operations across application
- Reduced GC pressure from repeated ObjectMapper instantiation
- Java 8 time module support properly configured

### Service Layer Enhancement

- **StepDataTransformationService**: Unified data transformation patterns
- Business logic separation from repository layer
- Import orchestration services for CSV/JSON processing
- Enhanced service layer with 9 specialized services

### API & Testing Improvements (Previous)

- StepsAPI improved with enhanced error handling
- Comments endpoint error messages standardized
- Repository pattern enforcement across all APIs
- Type safety improvements with explicit casting
- Reduced from 8 scripts to 4 consolidated test runners
- Performance baseline validation integrated

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

### 3. Service Layer Development (NEW)

1. Use StepDataTransformationService patterns for data transformation
2. Implement business logic in service classes, not repositories
3. Follow single responsibility principle for services
4. Use JsonUtil for JSON operations to maintain performance
5. Apply appropriate DTO patterns (Master vs Instance)

### 4. Testing Requirements

1. All new code requires unit tests
2. Integration tests for API endpoints
3. Use specific SQL query mocks (ADR-026)
4. Performance validation for critical paths
5. **NEW**: Test DTO serialization/deserialization with JsonUtil

## Key References

- **PRIMARY**: `/docs/architecture/UMIG - TOGAF Phases A-D - Architecture Requirements Specification.md` (49 ADRs organized across TOGAF Phase documents)
- **API Specs**: `/docs/api/openapi.yaml` and individual API docs
- **Data Model**: `/docs/dataModel/README.md`
- **Operations**: `/docs/operations/README.md`
- **ADR-026**: Testing patterns and SQL mocking
- **ADR-030**: Repository pattern enforcement
- **ADR-031**: Type safety requirements
- **ADR-043**: Dual authentication context management
- **ADR-044**: Mandatory endpoint registration patterns
- **ADR-047**: PostgreSQL production-ready patterns
- **ADR-049**: Unified DTO architecture principles (StepInstanceDTO rename)
- **US-056F**: Service layer standardization and dual DTO architecture

## Best Practices

### Code Quality

- Follow Groovy static type checking guidelines
- Use meaningful variable and method names
- Add JSDoc-style comments for complex logic
- Maintain consistent error handling patterns
- **NEW**: Use dual DTO pattern - StepMasterDTO for templates, StepInstanceDTO for executions

### Performance

- Use hierarchical filtering with instance IDs (pli_id, sqi_id, phi_id)
- Avoid deep object graphs in API responses
- Implement proper pagination for large datasets
- Cache lookup data appropriately
- **NEW**: Use JsonUtil.toJson/fromJson instead of creating ObjectMapper instances
- **NEW**: Leverage shared ObjectMapper for 3x performance improvement

### Data Architecture

- **NEW**: Template vs Instance separation with appropriate DTOs
- **NEW**: JSON schema validation in dto/schemas/ directory
- Use StepDataTransformationService for data transformation consistency
- Follow ADR-047 for PostgreSQL production patterns
- Apply ADR-049 unified DTO architecture principles

### Maintainability

- Follow established naming conventions
- Keep methods focused and testable
- Use dependency injection patterns where appropriate
- Document complex business logic thoroughly
- **NEW**: Organize JSON schemas in dedicated schemas/ subdirectory
- **NEW**: Use service layer for business logic transformation

---

**Environment**: Confluence 9.2.7 + ScriptRunner 9.21.0  
**Status**: Enhanced architecture with dual DTO pattern, service layer, and performance optimization  
**Stack**: Groovy/ScriptRunner backend, Vanilla JS frontend, PostgreSQL database  
**Latest**: StepMasterDTO/StepInstanceDTO architecture, JsonUtil shared ObjectMapper, service layer transformation
