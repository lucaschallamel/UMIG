# API Layer

REST API endpoint implementations for UMIG serving 30+ entity types and system operations across hierarchical migration workflows.

## Responsibilities

- Define REST endpoint routes and HTTP method handlers using CustomEndpointDelegate pattern
- Enforce authentication and authorization with groups: ["confluence-users"] security controls
- Validate request parameters with explicit type casting (ADR-031 compliance)
- Orchestrate business logic through repository and service layer integration
- Handle errors with SQL state mapping (23503→400, 23505→409) and actionable messages
- Implement 8-phase security controls with XSS/CSRF protection and rate limiting

## Structure

```
api/
├── v2/                          # Version 2 REST APIs (30 endpoints)
│   ├── *Api.groovy              # Entity-specific API endpoints
│   ├── stepViewApi.groovy       # Step view specialized API
│   ├── testEndpoint.groovy      # Development testing endpoint
│   └── web/                     # Web resource endpoints
└── README.md
```

## Key Components

This folder contains only the v2 subfolder. All REST API implementations reside in `v2/` and follow consistent patterns:

### Core Entity APIs (8)

- **ApplicationsApi.groovy** - Application catalog management
- **EnvironmentsApi.groovy** - Environment configuration
- **LabelsApi.groovy** - Taxonomy and categorization
- **TeamsApi.groovy** - Team organization structure
- **UsersApi.groovy** - User profile management
- **TeamMembersApi.groovy** - Team membership relationships
- **TeamsRelationshipApi.groovy** - Inter-team dependencies
- **UsersRelationshipApi.groovy** - User role assignments

### Migration Hierarchy APIs (8)

- **migrationApi.groovy** - Top-level migration orchestration
- **IterationsApi.groovy** - Migration iteration cycles
- **PlansApi.groovy** - Implementation plan templates
- **SequencesApi.groovy** - Execution sequence definitions
- **PhasesApi.groovy** - Migration phase structure
- **StepsApi.groovy** - Step-level operations (master + instance)
- **InstructionsApi.groovy** - Detailed instruction management
- **stepViewApi.groovy** - Enhanced step view with aggregations

### Configuration & System APIs (14)

- **ControlsApi.groovy** - Control inventory management (55+ controls)
- **StatusApi.groovy** - Status code management
- **EmailTemplatesApi.groovy** - Email template configuration
- **SystemConfigurationApi.groovy** - System-wide settings
- **UrlConfigurationApi.groovy** - URL pattern management
- **IterationTypesApi.groovy** - Iteration classification
- **MigrationTypesApi.groovy** - Migration categorization
- **RolesApi.groovy** - RBAC role definitions
- **AdminVersionApi.groovy** - Version management and health
- **DatabaseVersionsApi.groovy** - Schema version tracking
- **DashboardApi.groovy** - Dashboard data aggregation
- **ImportApi.groovy** - Bulk import operations
- **ImportQueueApi.groovy** - Import queue management
- **testEndpoint.groovy** - Development testing utilities

## Critical Patterns (ADR-023, ADR-031, ADR-042)

### Endpoint Declaration

```groovy
@BaseScript CustomEndpointDelegate delegate

entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Lazy load repositories to avoid class loading issues
    def getRepository = { -> new SomeRepository() }

    // Type safety with explicit casting
    params.id = UUID.fromString(filters.id as String)

    return Response.ok(payload).build()
}
```

### Type Safety (Mandatory)

- **UUIDs**: `UUID.fromString(param as String)`
- **Integers**: `Integer.parseInt(param as String)`
- **Strings**: `param.toUpperCase() as String`
- **Maps**: `(param as Map<String, Object>)?.get('key')`

### Hierarchical Filtering

- **ALWAYS use instance IDs**: pli_id, sqi_id, phi_id, sti_id
- **NEVER use master IDs** for filtering instance records
- **Foreign key pattern**: WHERE pli_id = ? (instance) NOT WHERE plm_id = ? (master)

### Error Handling

```groovy
try {
    // Database operation
} catch (Exception e) {
    if (e.getSQLState() == '23503') {
        throw new BadRequestException("Foreign key violation")
    } else if (e.getSQLState() == '23505') {
        throw new ConflictException("Unique constraint violation")
    }
    throw new InternalServerErrorException("Unexpected error: ${e.message}")
}
```

## Related

- See `../repository/` for data access layer with DatabaseUtil.withSql pattern
- See `../service/` for business logic orchestration and data transformation
- See `../utils/` for shared utilities (security, authentication, validation)
- See `../tests/integration/api/` for API integration tests
- See `../tests/unit/api/` for API unit tests
- See `/docs/api/openapi.yaml` for complete API specification (v2.12.0)
