# API Coding Patterns (UMIG)

This document outlines the **mandatory** coding patterns for all REST API endpoints in the UMIG project. These standards are critical for ensuring stability and maintainability within the ScriptRunner environment.

**The definitive guide for this pattern is [ADR-023](../../../../docs/adr/ADR-023-Standardized-Rest-Api-Patterns.md). All developers must read it before writing API code.**

## Current API Endpoints (v2)

### Core Entity APIs

- **ApplicationsApi.groovy** - Application management with label associations
- **ControlsApi.groovy** - Control point management for steps and instructions
- **EmailTemplatesApi.groovy** - Email template management and rendering
- **EnvironmentsApi.groovy** - Environment management with application/iteration associations
- **InstructionsApi.groovy** - Instruction template and execution management (14 endpoints)
- **LabelsApi.groovy** - Label management with application and step associations
- **PhasesApi.groovy** - Phase management with sequence associations
- **PlansApi.groovy** - Plan management with hierarchical filtering
- **SequencesApi.groovy** - Sequence management with advanced ordering logic
- **StepsApi.groovy** - Step master/instance operations with enhanced comments system
- **TeamMembersApi.groovy** - Team membership operations with robust checks
- **TeamsApi.groovy** - Team management with hierarchical filtering
- **UsersApi.groovy** - User management with role and team associations
- **migrationApi.groovy** - Migration and iteration management
- **stepViewApi.groovy** - Individual step view for runsheet display

### Specialized APIs

- **WebApi.groovy** - Frontend integration endpoints

## MANDATORY REST Endpoint Pattern

```groovy
package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.ExampleRepository
import groovy.json.JsonBuilder
import groovy.transform.BaseScript

import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID

@BaseScript CustomEndpointDelegate delegate

// Endpoint definition with authentication
entityName(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    try {
        // 1. Repository instantiation (avoid class loading issues)
        def repository = new ExampleRepository()

        // 2. Parameter extraction and type safety (ADR-031)
        def filters = [:]
        if (queryParams.migrationId?.first()) {
            filters.migrationId = UUID.fromString(queryParams.migrationId.first() as String)
        }

        // 3. Business logic
        def results = repository.findByFilters(filters)

        // 4. Response formatting
        return Response.ok(new JsonBuilder(results).toString()).build()

    } catch (IllegalArgumentException e) {
        // Type conversion errors
        return Response.status(400)
            .entity(new JsonBuilder([error: "Invalid parameter format: ${e.message}"]).toString())
            .build()
    } catch (Exception e) {
        // Generic error handling
        return Response.status(500)
            .entity(new JsonBuilder([error: "Internal server error: ${e.message}"]).toString())
            .build()
    }
}
```

## Type Safety Requirements (ADR-031)

**MANDATORY**: All query parameters MUST use explicit type casting:

```groovy
// ✅ CORRECT - Explicit casting
def migrationId = UUID.fromString(queryParams.migrationId.first() as String)
def teamId = Integer.parseInt(queryParams.teamId.first() as String)

// ❌ INCORRECT - Implicit casting
def migrationId = UUID.fromString(queryParams.migrationId.first())
def teamId = queryParams.teamId.first() as Integer
```

## Authentication and Authorization

- **Default**: `groups: ["confluence-users"]` for general access
- **Admin-only**: `groups: ["confluence-administrators"]` for admin operations
- **Mixed**: `groups: ["confluence-users", "confluence-administrators"]` for flexible access

## Hierarchical Filtering Pattern

**CRITICAL**: All hierarchical filtering must use instance IDs, NOT master IDs:

```groovy
// ✅ CORRECT - Instance IDs
?migrationId=uuid        // References mig_id (migration instance)
?iterationId=uuid        // References iti_id (iteration instance)
?planId=uuid            // References pli_id (plan instance)
?sequenceId=uuid        // References sqi_id (sequence instance)
?phaseId=uuid           // References phi_id (phase instance)

// ❌ INCORRECT - Master IDs (will fail)
?planMasterId=uuid      // plm_id is NOT used for filtering
```

## Enhanced Error Handling

### SQL State Mappings

- **23503** → 400 Bad Request (foreign key violation)
- **23505** → 409 Conflict (unique constraint violation)
- **23502** → 400 Bad Request (not null violation)

### Comment System Error Improvements (US-024)

Enhanced error messages for comment endpoints with clear usage guidance:

```groovy
// Enhanced error response for invalid comment endpoint usage
return Response.status(400).entity(new JsonBuilder([
    error: "Invalid comments endpoint usage",
    message: "To create a comment, use: POST /rest/scriptrunner/latest/custom/steps/{stepInstanceId}/comments",
    example: "POST /rest/scriptrunner/latest/custom/steps/f9aa535d-4d8b-447c-9d89-16494f678702/comments"
]).toString()).build()
```

## Repository Integration Pattern

All APIs MUST use repository pattern for database access:

```groovy
// Lazy load repositories to avoid class loading issues
def getExampleRepository = { ->
    return new ExampleRepository()
}

def repository = getExampleRepository()
def results = repository.findByFilters(filters)
```

## Testing Framework Integration

All APIs support comprehensive testing with:

- Unit tests with repository mocking
- Integration tests with SQL query validation
- ScriptRunner compatibility testing
- 90%+ test coverage requirement

## Advanced Features

### Bulk Operations (Instructions, Steps)

- Support for bulk create, update, and delete operations
- Transaction management for consistency
- Batch processing for performance

### Association Management

- Many-to-many relationship handling
- Graceful duplicate key management
- Idempotent operations for robustness

### Advanced Ordering (Sequences)

- Gap handling and resequencing
- Circular dependency detection using recursive CTEs
- Transaction-safe order operations

## Key Implementation Standards

### Response Format Consistency

- Always return JSON responses
- Use JsonBuilder for response formatting
- Include meaningful error messages
- Maintain consistent field naming

### Path Parameter Handling

- Extract path segments safely
- Validate parameter formats
- Handle malformed requests gracefully

### Database Connection

- ALL database access MUST use repository pattern
- Repositories MUST use `DatabaseUtil.withSql`
- No direct SQL in API endpoints

## Recent Enhancements (US-024)

### StepsApi Comment System

- Enhanced error messages with usage examples
- Clear endpoint documentation in error responses
- User ownership validation for comment operations
- Comprehensive CRUD operations for step comments

### Type Safety Improvements

- Mandatory explicit casting for all parameters
- Enhanced parameter validation
- Better error messages for type conversion failures

## References

- **PRIMARY**: [ADR-023: Standardized REST API Implementation Patterns](../../docs/adr/ADR-023-Standardized-Rest-Api-Patterns.md)
- [ADR-031: Type Safety Improvements](../../docs/adr/ADR-031-Type-Safety-Improvements.md)
- [Repository Pattern Guidelines](../repository/README.md)
- [API Workflow Guide](../../.clinerules/workflows/api-work.md)
- [Testing Guidelines](../tests/README.md)
