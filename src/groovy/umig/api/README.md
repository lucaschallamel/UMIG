# API Coding Patterns (UMIG)

## Instructions API Pattern (2025-08-05)

- Complete instruction template and execution management system with 14 REST endpoints
- Implements hierarchical filtering across all entity levels: `?migrationId=`, `?iterationId=`, `?planId=`, `?sequenceId=`, `?phaseId=`, `?stepId=`
- **TEMPLATE-BASED ARCHITECTURE**: Master/instance pattern supporting instruction templates with execution instances
- **TYPE SAFETY**: Mandatory explicit casting patterns `UUID.fromString(filters.stepId as String)` following ADR-031
- **INTEGRATION**: Seamless integration with Steps, Teams, Labels, and Controls for complete instruction lifecycle management
- Full repository pattern with InstructionRepository (19 methods) for comprehensive testability
- **BULK OPERATIONS**: Support for bulk instruction creation, updates, and status management
- **ERROR HANDLING**: SQL state mapping (23503→400, 23505→409) with proper HTTP responses
- Comprehensive unit and integration testing with 90%+ coverage including ScriptRunner compatibility
- **CRITICAL**: Uses instance IDs (stm_id, phi_id, sqi_id, pli_id) for hierarchical filtering, not master IDs

## Sequences API Pattern (2025-07-31)

- Complete CRUD implementation with advanced ordering functionality following established patterns
- Implements hierarchical filtering with `?migrationId=`, `?iterationId=`, `?planId=` support
- **ORDERING LOGIC**: Advanced sequence ordering with gap handling, resequencing, and circular dependency detection
- **TYPE SAFETY**: Mandatory explicit casting patterns `UUID.fromString(filters.planId as String)`
- Full repository pattern integration with SequenceRepository for comprehensive testability
- **ADVANCED FEATURES**: Circular dependency detection using recursive CTEs, transaction management for order operations
- Comprehensive integration testing with 20 test scenarios covering all CRUD and ordering edge cases
- **CRITICAL**: Uses instance IDs (pli_id, sqi_id) for filtering, not master IDs (plm_id, sqm_id)

## Plans API Pattern (2025-07-31)

- Complete CRUD implementation for Plans API following established patterns
- Implements hierarchical filtering with `?migrationId=`, `?iterationId=`, `?teamId=` support
- **TYPE SAFETY**: Mandatory explicit casting patterns `UUID.fromString(filters.migrationId as String)`
- Full repository pattern integration with PlansRepository for testability
- Comprehensive integration testing with SQL query mocks
- Enhanced error handling for constraint violations and foreign key references
- **CRITICAL**: Uses instance IDs (pli_id) for filtering, not master IDs (plm_id)

## Step View API Pattern (2025-07-17)

- Standalone step view API for retrieving individual step instance data
- Implements three-parameter lookup: `?migrationName=xxx&iterationName=xxx&stepCode=XXX-nnn`
- **UNIQUE PATTERN**: Uses migration/iteration names + step code for unique identification across all migrations
- Comprehensive response includes step details, instructions, teams, labels, comments, and status history
- **CRITICAL**: Joins through environment associations for proper environment role display
- Supports both master step data and instance execution tracking

## Applications API Pattern (2025-07-15)

- Extended Applications API with label association management endpoints
- Implemented GET /applications/{id}/labels, PUT /applications/{appId}/labels/{labelId}, DELETE /applications/{appId}/labels/{labelId}
- Added label_count to listing responses via LEFT JOIN on labels_lbl_x_applications_app table
- **IMPORTANT**: Be aware of field name transformations between different endpoints (e.g., Labels API returns `id/name` while application-specific endpoints return `lbl_id/lbl_name`)
- Handle duplicate key errors gracefully for association endpoints with proper 409 Conflict responses

## Environments API Pattern (2025-07-15)

- Complete REST API implementation for environments with full CRUD operations
- Association management endpoints for applications and iterations with role-based relationships
- **IMPORTANT**: Remove @Field annotations and avoid Logger imports in ScriptRunner REST endpoints
- Implement proper authentication headers: `X-Atlassian-Token: no-check` and `credentials: same-origin`
- Handle many-to-many associations with proper POST/DELETE endpoints

## Hierarchical Filtering and Type Safety (2025-07-10)

- All hierarchical filtering endpoints support query parameters: `?migrationId=`, `?iterationId=`, `?planId=`, `?sequenceId=`, `?phaseId=`
- **MANDATORY**: Use explicit type casting for all parameter conversions: `UUID.fromString(id as String)`, `Integer.parseInt(id as String)`
- **CRITICAL**: Use instance IDs (pli_id, sqi_id, phi_id) for filtering, NOT master IDs (plm_id, sqm_id, phm_id)
- Include ALL database fields referenced in result mapping to prevent "No such property" errors
- Handle many-to-many relationships gracefully with try-catch blocks for optional data

## Teams Membership Robustness (2025-07-02)

- All membership endpoints (`PUT`/`DELETE /teams/{teamId}/users/{userId}`) enforce robust existence checks for both team and user.
- Duplicate associations are prevented; removal is idempotent and returns 404 if the user is not a member.
- Clear, actionable error messages and RESTful status codes are returned for all cases.

This document outlines the **mandatory** coding patterns for all REST API endpoints in the UMIG project. These standards are critical for ensuring stability and maintainability within the ScriptRunner environment.

**The definitive guide for this pattern is [ADR-023](../../../../docs/adr/ADR-023-Standardized-Rest-Api-Patterns.md). All developers must read it before writing API code.**

For a step-by-step guide, see the [api-work.md workflow](../../../../.clinerules/workflows/api-work.md).

## Enhanced Error Handling (2025-07-02)

- **DELETE /users/{id}:**
  - If deletion is blocked by any referencing records (teams, plans, steps, comments, etc.), the API returns:

    ```json
    {
      "error": "Cannot delete user with ID 3 as they are still referenced by other resources.",
      "blocking_relationships": {
        "teams": [{ "tms_id": 4, "tms_name": "Tools Group" }],
        "step_comments_created": [{ "sic_id": 7 }, ...]
        // ...all other referencing records
      }
    }
    ```

  - No associations are deleted unless the user is deleted.

- **POST /users:**
  - Required fields: `usr_first_name`, `usr_last_name`, `usr_email`, `usr_is_admin`, `usr_code`, `rls_id`.
  - Returns clear errors for missing/unknown fields, type errors, and constraint violations. Example:

    ```json
    { "error": "Missing required fields: usr_code, rls_id" }
    { "error": "Unknown fields: usr_confluence_id" }
    { "error": "rls_id must be an integer." }
    { "error": "A user with this email or code already exists." }
    { "error": "Invalid rls_id: referenced role does not exist." }
    ```

## Mandatory Structure Example

```groovy
// src/com/umig/api/v2/UsersApi.groovy
package com.umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.transform.BaseScript
import groovy.json.JsonBuilder
import javax.ws.rs.core.Response
import java.sql.SQLException

@BaseScript CustomEndpointDelegate delegate

// ... import UserRepository

users(httpMethod: "DELETE", groups: ["confluence-administrators"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    // 1. Get and validate path parameter
    Integer userId = getUserIdFromPath(request)
    if (userId == null) {
        return Response.status(Response.Status.BAD_REQUEST).entity(new JsonBuilder([error: "User ID is required."]).toString()).build()
    }

    try {
        // 2. Business logic
        if (userRepository.findUserById(userId) == null) {
            return Response.status(Response.Status.NOT_FOUND).entity(new JsonBuilder([error: "User not found."]).toString()).build()
        }
        userRepository.deleteUser(userId)

        // 3. Return correct success response
        return Response.noContent().build()

    } catch (SQLException e) {
        // 4. Handle specific errors
        log.error("Database error deleting user ${userId}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "A database error occurred."]).toString()).build()
    } catch (Exception e) {
        // 5. Handle generic errors
        log.error("Unexpected error deleting user ${userId}", e)
        return Response.status(Response.Status.INTERNAL_SERVER_ERROR).entity(new JsonBuilder([error: "An internal error occurred."]).toString()).build()
    }
}
```

## See Also

- [ADR-023: Standardized REST API Implementation Patterns](../../../../docs/adr/ADR-023-Standardized-Rest-Api-Patterns.md)
- [Repository Pattern Guidelines](../repository/README.md)
