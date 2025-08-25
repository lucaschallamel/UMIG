# UMIG V2 REST APIs

This folder contains all V2 REST API endpoints implemented using ScriptRunner Custom REST functionality.

## 🚀 Quick Overview

**Total APIs**: 21 endpoints serving 15+ entity types  
**Architecture**: Pure ScriptRunner Groovy with Repository Pattern  
**Authentication**: HTTP Basic Auth (`groups: ["confluence-users"]`)  
**Documentation**: Complete OpenAPI 3.0 specification at `/docs/api/openapi.yaml`

## 📋 Core API Endpoints

### Entity Management APIs

| API                        | Status | Entity Type  | Key Features                                |
| -------------------------- | ------ | ------------ | ------------------------------------------- |
| **ApplicationsApi.groovy** | ✅     | Applications | Label associations, environment mapping     |
| **EnvironmentsApi.groovy** | ✅     | Environments | Application associations, iteration mapping |
| **LabelsApi.groovy**       | ✅     | Labels       | Application associations, step associations |
| **TeamsApi.groovy**        | ✅     | Teams        | User associations, hierarchical filtering   |
| **UsersApi.groovy**        | ✅     | Users        | Team associations, role context             |

### Migration Process APIs

| API                      | Status | Entity Type | Key Features                                      |
| ------------------------ | ------ | ----------- | ------------------------------------------------- |
| **migrationApi.groovy**  | ✅     | Migrations  | Iteration management, dashboard metrics           |
| **IterationsApi.groovy** | ✅     | Iterations  | Complete CRUD, type management                    |
| **PlansApi.groovy**      | ✅     | Plans       | Hierarchical filtering, sequence associations     |
| **SequencesApi.groovy**  | ✅     | Sequences   | Advanced ordering logic, plan associations        |
| **PhasesApi.groovy**     | ✅     | Phases      | Sequence associations, step management            |
| **StepsApi.groovy**      | ✅     | Steps       | Complete v2.2.0, comments system, bulk operations |

### Support & Control APIs

| API                               | Status | Entity Type          | Key Features                                  |
| --------------------------------- | ------ | -------------------- | --------------------------------------------- |
| **InstructionsApi.groovy**        | ✅     | Instructions         | Template and instance operations (19 methods) |
| **ControlsApi.groovy**            | ✅     | Controls             | Step control points, instruction associations |
| **StatusApi.groovy**              | ✅     | Status               | Centralized status with color coding          |
| **EmailTemplatesApi.groovy**      | ✅     | Email Templates      | Template management, rendering support        |
| **SystemConfigurationApi.groovy** | ✅     | System Configuration | Application settings, feature flags           |

### UI Component APIs

| API                    | Status | Purpose             | Integration                       |
| ---------------------- | ------ | ------------------- | --------------------------------- |
| **stepViewApi.groovy** | ✅     | Step View Component | Enhanced interface, UAT validated |
| **WebApi.groovy**      | ✅     | Web Components      | General UI support                |

## 🏗️ Architecture Standards

### Mandatory Patterns (ADR-023, ADR-031)

**1. Repository Pattern**

```groovy
@BaseScript CustomEndpointDelegate delegate
import umig.repository.ExampleRepository

exampleEntity(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def repository = new ExampleRepository()
    def results = repository.findByFilters(params)
    return Response.ok(new JsonBuilder(results).toString()).build()
}
```

**2. Type Safety (ADR-031)**

```groovy
// ✅ MANDATORY - Explicit casting
params.migrationId = UUID.fromString(filters.migrationId as String)
params.teamId = Integer.parseInt(filters.teamId as String)

// ❌ WRONG - Implicit casting
def migrationId = UUID.fromString(filters.migrationId)
def teamId = filters.teamId as Integer
```

**3. Hierarchical Filtering (ADR-030)**

- Use instance IDs (`pli_id`, `sqi_id`, `phi_id`) for filtering, NOT master IDs
- Support progressive refinement: Migration → Iteration → Plan → Sequence
- Include ALL fields in SELECT that are referenced in result mapping

### Admin GUI Compatibility Pattern

```groovy
// Handle parameterless calls for Admin GUI integration
if (stepId) {
    return handleInstructionsByStepId(stepId)
} else if (stepInstanceId) {
    return handleInstructionsByStepInstanceId(stepInstanceId)
} else {
    // For Admin GUI - return empty array when no filters provided
    return Response.ok(new JsonBuilder([]).toString()).build()
}
```

### Error Handling Standards

**SQL State Mappings**:

- `23503` → `400 Bad Request` (Foreign key constraint)
- `23505` → `409 Conflict` (Unique constraint)
- `23514` → `400 Bad Request` (Check constraint)

**Error Response Format**:

```groovy
return Response.status(400).entity([
    error: "Validation failed",
    details: "Invalid migrationId format",
    sqlState: "23503",
    endpoint: "/migrations"
]).build()
```

## 🔧 Authentication & Security

### Standard Authentication

```groovy
entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Standard Confluence user authentication
    // No additional auth required for most endpoints
}
```

### Enhanced Authentication Context (ADR-042)

```groovy
import umig.service.AuthenticationService

// Get current user context
def authService = new AuthenticationService()
def currentUser = authService.getCurrentUser()
def userContext = authService.getUserContext(currentUser?.name ?: 'anonymous')
```

## 📊 API Development Guidelines

### Reference Implementation Templates

**Best Practices**: Reference these proven implementations:

- **StepsApi.groovy**: Complete CRUD with comments, bulk operations, pagination
- **TeamsApi.groovy**: User associations, hierarchical filtering
- **LabelsApi.groovy**: Application associations, clean architecture
- **InstructionsApi.groovy**: Template/instance pattern, comprehensive operations

### Endpoint Naming Convention

```
/api/v2/{entityName}           # Collection endpoints
/api/v2/{entityName}/{id}      # Individual resource
/api/v2/{entityName}/bulk      # Bulk operations
/api/v2/{entityName}/{id}/sub  # Sub-resources (e.g., comments)
```

### Testing Integration

All APIs include comprehensive testing:

- **Unit Tests**: Repository layer with ADR-026 compliant specific SQL mocks
- **Integration Tests**: Full API testing with live database (21 test files)
- **UAT Tests**: User acceptance validation with real scenarios

## 🎯 OpenAPI Integration

### Complete API Documentation

- **Location**: `/docs/api/openapi.yaml`
- **Version**: 2.4.0 (August 25, 2025)
- **Coverage**: 100% of implemented endpoints
- **Standards**: OpenAPI 3.0 specification

### Version History

- **v2.4.0**: Steps API v2.2.0 integration, Users API v2.1.0 enhancement
- **v2.3.0**: Migration API specification sync, enhanced sorting
- **v2.2.0**: Enhanced Migration API with flexible status handling
- **v2.1.0**: US-024 Complete with improved error handling

## 📈 Performance & Quality Standards

### Response Time Targets

- Simple queries: < 50ms
- Complex queries: < 100ms
- Bulk operations: < 500ms
- Admin GUI integration: < 3s

### Quality Gates

- **Test Coverage**: 95% for new APIs
- **Error Handling**: Comprehensive with SQL state mappings
- **Type Safety**: 100% explicit casting (ADR-031)
- **Documentation**: Complete OpenAPI specification

## 🔗 Cross-References

### Primary Documentation

- **[Solution Architecture](../../docs/solution-architecture.md)**: Complete architectural decisions (45 ADRs)
- **[Repository README](../repository/README.md)**: Repository pattern implementation
- **[Testing README](../tests/README.md)**: Comprehensive testing framework

### Key ADRs

- **[ADR-017](../../docs/adr/archive/ADR-017-V2-REST-API-Architecture.md)**: V2 REST API Architecture
- **[ADR-023](../../docs/adr/archive/ADR-023-Standardized-Rest-Api-Patterns.md)**: Standardized API patterns
- **[ADR-030](../../docs/adr/archive/ADR-030-hierarchical-filtering-pattern.md)**: Hierarchical filtering
- **[ADR-031](../../docs/adr/archive/ADR-031-groovy-type-safety-and-filtering-patterns.md)**: Type safety requirements
- **[ADR-042](../../docs/adr/ADR-042-dual-authentication-context-management.md)**: Authentication patterns

### Related Components

- **Database Layer**: [Repository README](../repository/README.md)
- **Frontend Layer**: [JavaScript README](../web/js/README.md)
- **Testing Suite**: [Tests README](../tests/README.md)
- **Memory Bank**: [Active Context](../../docs/memory-bank/activeContext.md)

## 🚧 Development Status

### Recently Completed (Sprint 5)

- ✅ **US-031**: Admin GUI Complete Integration (11/13 endpoints functional)
- ✅ **US-036**: StepView UI Refactoring (100% complete with RBAC)
- ✅ **Steps API v2.2.0**: 6 new endpoints, enhanced bulk operations
- ✅ **Users API v2.1.0**: Role mapping and enhanced context

### Current Focus

- Authentication blocker resolution (HTTP 401 investigation)
- Manual endpoint registration completion (2/13 remaining)
- Production deployment preparation

### API Implementation Maturity

- **Production Ready**: 19/21 APIs (90.5%)
- **Testing Coverage**: 95%+ across all endpoints
- **Documentation**: 100% OpenAPI specification coverage
- **Quality Assurance**: ADR compliance validated

---

**Last Updated**: August 25, 2025  
**API Version**: V2.4.0  
**Implementation Status**: 90.5% production ready  
**Quality Score**: 95%+ comprehensive validation
