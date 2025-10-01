# V2 REST APIs

Production-ready ScriptRunner REST API endpoints implementing complete UMIG functionality across 30+ entity types and system operations.

## Responsibilities

- Implement all REST endpoints using CustomEndpointDelegate pattern with ScriptRunner integration
- Provide CRUD operations for core entities, migration hierarchy, and system configuration
- Enforce type safety with explicit casting and parameter validation (ADR-031)
- Integrate with repository layer for all database operations using DatabaseUtil.withSql pattern
- Return consistent JSON responses with proper HTTP status codes and error handling
- Support hierarchical filtering using instance IDs for correct parent-child relationships

## Structure

```
v2/
├── Core Entity APIs (8 files)
│   ├── ApplicationsApi.groovy         # Application catalog management
│   ├── EnvironmentsApi.groovy         # Environment configuration
│   ├── LabelsApi.groovy               # Taxonomy and categorization
│   ├── TeamsApi.groovy                # Team organization structure
│   ├── UsersApi.groovy                # User profile management
│   ├── TeamMembersApi.groovy          # Team membership relationships
│   ├── TeamsRelationshipApi.groovy    # Inter-team dependencies
│   └── UsersRelationshipApi.groovy    # User role assignments
│
├── Migration Hierarchy APIs (8 files)
│   ├── migrationApi.groovy            # Top-level migration orchestration
│   ├── IterationsApi.groovy           # Migration iteration cycles
│   ├── PlansApi.groovy                # Implementation plan templates
│   ├── SequencesApi.groovy            # Execution sequence definitions
│   ├── PhasesApi.groovy               # Migration phase structure
│   ├── StepsApi.groovy                # Step-level operations (master + instance)
│   ├── InstructionsApi.groovy         # Detailed instruction management
│   └── stepViewApi.groovy             # Enhanced step view with aggregations
│
├── Configuration & System APIs (14 files)
│   ├── ControlsApi.groovy             # Control inventory (55+ controls)
│   ├── StatusApi.groovy               # Status code management
│   ├── EmailTemplatesApi.groovy       # Email template configuration
│   ├── SystemConfigurationApi.groovy  # System-wide settings
│   ├── UrlConfigurationApi.groovy     # URL pattern management
│   ├── IterationTypesApi.groovy       # Iteration classification
│   ├── MigrationTypesApi.groovy       # Migration categorization
│   ├── RolesApi.groovy                # RBAC role definitions
│   ├── AdminVersionApi.groovy         # Version management and health
│   ├── DatabaseVersionsApi.groovy     # Schema version tracking
│   ├── DashboardApi.groovy            # Dashboard data aggregation
│   ├── ImportApi.groovy               # Bulk import operations
│   ├── ImportQueueApi.groovy          # Import queue management
│   └── testEndpoint.groovy            # Development testing utilities
│
├── web/                               # Web resource endpoints
└── README.md
```

## Key API Patterns

### Endpoint Registration

All APIs follow the CustomEndpointDelegate pattern for ScriptRunner integration:

```groovy
@BaseScript CustomEndpointDelegate delegate

entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def getRepository = { -> new SomeRepository() }
    // Implementation
    return Response.ok(payload).build()
}
```

### API Categories

**Core Entity APIs** - Foundational data entities with full CRUD operations

- Applications, Environments, Labels, Teams, Users
- Team membership and relationship management
- User role assignments and inter-team dependencies

**Migration Hierarchy APIs** - Hierarchical migration workflow implementation

- Migrations → Iterations → Plans → Sequences → Phases → Steps → Instructions
- Both master templates (_master_) and execution instances (_instance_)
- Enhanced step view with cross-entity aggregations and relationships

**Configuration & System APIs** - System management and operational support

- Control inventory with 55+ pre-configured controls
- Email templates with 4 notification types (iteration start, iteration end, step assignment, step completion)
- System configuration, URL management, and version tracking
- Dashboard aggregations and bulk import operations
- Type definitions for iterations and migrations

### Type Safety (ADR-031 Mandatory)

```groovy
// UUID parameters
def migrationId = UUID.fromString(params.migrationId as String)

// Integer parameters
def pageSize = Integer.parseInt(params.pageSize as String)

// String parameters with validation
def status = (params.status as String)?.toUpperCase()

// Optional parameters with null safety
def teamId = params.teamId ? UUID.fromString(params.teamId as String) : null
```

### Hierarchical Filtering (ADR-030 Critical)

```groovy
// ✅ CORRECT - Use instance IDs for filtering
WHERE pli_id = ?  // Plan instance ID
WHERE sqi_id = ?  // Sequence instance ID
WHERE phi_id = ?  // Phase instance ID
WHERE sti_id = ?  // Step instance ID

// ❌ WRONG - Never use master IDs for instance filtering
WHERE plm_id = ?  // Plan master ID - INCORRECT for instances
```

### Error Handling with SQL State Mapping

```groovy
try {
    repository.deleteById(id)
} catch (Exception e) {
    if (e.getSQLState() == '23503') {
        throw new BadRequestException("Cannot delete: referenced by other records")
    } else if (e.getSQLState() == '23505') {
        throw new ConflictException("Duplicate entry exists")
    }
    throw new InternalServerErrorException("Database error: ${e.message}")
}
```

## Performance Standards

- **Simple queries**: <50ms response time (single entity by ID)
- **Complex queries**: <100ms response time (filtered lists with joins)
- **Bulk operations**: <500ms response time (import, export, batch updates)
- **Pagination**: Default 50 items, max 500, configurable via pageSize parameter
- **Caching**: 70% hit rate on frequently accessed configuration data

## Quality Metrics

- **Test coverage**: 95%+ across all endpoints with integration and unit tests
- **Operational status**: 100% of 30 APIs production-ready and stable
- **ADR compliance**: Complete validation against ADR-023, ADR-030, ADR-031, ADR-042
- **Security rating**: 8.5/10 with 8-phase security controls and comprehensive penetration testing

## Related

- See `../../repository/` for database access layer implementations
- See `../../service/` for business logic and data transformation services
- See `../../dto/` for data transfer objects and schema definitions
- See `../../utils/` for shared utilities (DatabaseUtil, SecurityUtils, EmailService)
- See `/docs/api/openapi.yaml` for complete OpenAPI 3.0 specification (v2.12.0)
- See `../../tests/integration/api/` for API integration tests
- See `../../tests/unit/api/v2/` for API unit tests
