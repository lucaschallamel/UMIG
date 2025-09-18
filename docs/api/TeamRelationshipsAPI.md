# Team Relationships API Specification

> Comprehensive bidirectional team-user relationship management API providing enterprise-grade relationship integrity, cascade delete protection, and orphaned member cleanup capabilities with performance optimization for large datasets.

---

## 1. API Overview

- **API Name:** Team Relationships API v2
- **Purpose:** Complete bidirectional team-user relationship management including relationship queries, integrity validation, cascade delete protection, and orphaned member cleanup. Supports the Teams Entity Migration (US-082-C) with enterprise-grade relationship integrity and performance optimization.
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-031 (Type Safety), ADR-026 (Testing Patterns), ADR-039 (Error Handling), ADR-042 (Authentication Context), ADR-043 (Explicit Casting)

## 2. Endpoints

| Method | Path                                           | Description                                        |
| ------ | ---------------------------------------------- | -------------------------------------------------- |
| GET    | /api/v2/users/{userId}/teams                   | Retrieve teams for specific user                   |
| GET    | /api/v2/teams/{teamId}/users                   | Retrieve users for specific team                   |
| GET    | /api/v2/teams/{teamId}/users/{userId}/validate | Validate specific team-user relationship integrity |
| GET    | /api/v2/teams/{teamId}/delete-protection       | Check cascade delete protection for team           |
| GET    | /api/v2/teams/relationship-statistics          | Retrieve team relationship statistics              |
| PUT    | /api/v2/teams/{teamId}/soft-delete             | Soft delete team with relationship preservation    |
| PUT    | /api/v2/teams/{teamId}/restore                 | Restore soft-deleted team                          |
| POST   | /api/v2/teams/cleanup-orphaned-members         | Cleanup orphaned team members                      |
| POST   | /api/v2/teams/batch-validate-relationships     | Batch validate multiple team-user relationships    |

## 3. Request Details

### 3.1. Path Parameters

| Name   | Type    | Required | Description                             |
| ------ | ------- | -------- | --------------------------------------- |
| userId | integer | Yes\*    | The user ID for user-centric operations |
| teamId | integer | Yes\*    | The team ID for team-centric operations |

\*Required based on endpoint context

### 3.2. Query Parameters

| Name            | Type    | Required | Description                             |
| --------------- | ------- | -------- | --------------------------------------- |
| includeArchived | boolean | No       | Include archived teams (default: false) |
| includeInactive | boolean | No       | Include inactive users (default: false) |

### 3.3. Request Body

#### PUT /teams/{teamId}/soft-delete

- **Content-Type:** application/json
- **Schema:**

```json
{
  "userContext": {
    "userId": "string (optional, for audit trail)",
    "reason": "string (optional, deletion reason)",
    "notes": "string (optional, additional context)"
  }
}
```

#### PUT /teams/{teamId}/restore

- **Content-Type:** application/json
- **Schema:**

```json
{
  "userContext": {
    "userId": "string (optional, for audit trail)",
    "reason": "string (optional, restoration reason)",
    "notes": "string (optional, additional context)"
  }
}
```

#### POST /teams/batch-validate-relationships

- **Content-Type:** application/json
- **Schema:**

```json
{
  "relationships": [
    {
      "teamId": "integer (required)",
      "userId": "integer (required)"
    }
  ]
}
```

- **Example:**

```json
{
  "relationships": [
    { "teamId": 1, "userId": 101 },
    { "teamId": 1, "userId": 102 },
    { "teamId": 2, "userId": 103 }
  ]
}
```

## 4. Response Details

### 4.1. Success Response

#### GET /users/{userId}/teams

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "userId": "integer",
  "includeArchived": "boolean",
  "teams": [
    {
      "tms_id": "integer",
      "tms_name": "string",
      "tms_description": "string",
      "tms_active": "boolean",
      "created_by": "string",
      "created_at": "timestamp",
      "updated_by": "string",
      "updated_at": "timestamp"
    }
  ],
  "totalTeams": "integer",
  "timestamp": "timestamp"
}
```

- **Example:**

```json
{
  "userId": 101,
  "includeArchived": false,
  "teams": [
    {
      "tms_id": 1,
      "tms_name": "Development Team",
      "tms_description": "Core development team",
      "tms_active": true,
      "created_by": "admin",
      "created_at": "2025-07-10T10:30:00Z",
      "updated_by": "admin",
      "updated_at": "2025-07-10T10:30:00Z"
    }
  ],
  "totalTeams": 1,
  "timestamp": "2025-07-13T15:45:23.123Z"
}
```

#### GET /teams/{teamId}/users

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "teamId": "integer",
  "teamName": "string",
  "includeInactive": "boolean",
  "users": [
    {
      "usr_id": "integer",
      "usr_first_name": "string",
      "usr_last_name": "string",
      "usr_email": "string",
      "usr_active": "boolean",
      "role_name": "string",
      "created_by": "string",
      "created_at": "timestamp",
      "updated_by": "string",
      "updated_at": "timestamp"
    }
  ],
  "totalUsers": "integer",
  "timestamp": "timestamp"
}
```

#### GET /teams/{teamId}/users/{userId}/validate

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "teamId": "integer",
  "userId": "integer",
  "validation": {
    "isValid": "boolean",
    "relationshipExists": "boolean",
    "teamActive": "boolean",
    "userActive": "boolean",
    "integrityIssues": [
      {
        "issue": "string",
        "severity": "string",
        "description": "string"
      }
    ],
    "validationDate": "timestamp"
  },
  "timestamp": "timestamp"
}
```

#### GET /teams/{teamId}/delete-protection

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "teamId": "integer",
  "teamName": "string",
  "protection": {
    "canDelete": "boolean",
    "blockingRelationships": [
      {
        "type": "string",
        "count": "integer",
        "description": "string"
      }
    ],
    "memberCount": "integer",
    "activeMembers": "integer",
    "relatedEntities": {
      "migrations": "integer",
      "plans": "integer",
      "steps": "integer"
    }
  },
  "timestamp": "timestamp"
}
```

#### GET /teams/relationship-statistics

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "statistics": {
    "totalTeams": "integer",
    "activeTeams": "integer",
    "archivedTeams": "integer",
    "totalMembers": "integer",
    "averageMembersPerTeam": "number",
    "orphanedMembers": "integer",
    "integrityIssues": "integer",
    "lastCleanupDate": "timestamp"
  },
  "timestamp": "timestamp"
}
```

#### PUT /teams/{teamId}/soft-delete

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "teamId": "integer",
  "result": {
    "success": "boolean",
    "membersHandled": "integer",
    "relatedEntitiesUpdated": "integer",
    "auditRecord": "string",
    "preservedRelationships": "integer"
  },
  "message": "string",
  "timestamp": "timestamp"
}
```

#### PUT /teams/{teamId}/restore

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "teamId": "integer",
  "result": {
    "success": "boolean",
    "membersRestored": "integer",
    "relatedEntitiesUpdated": "integer",
    "auditRecord": "string",
    "restoredRelationships": "integer"
  },
  "message": "string",
  "timestamp": "timestamp"
}
```

#### POST /teams/cleanup-orphaned-members

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "cleanup": {
    "orphanedMembersFound": "integer",
    "orphanedMembersRemoved": "integer",
    "integrityIssuesFixed": "integer",
    "teamsAffected": "integer",
    "executionTimeMs": "integer",
    "details": [
      {
        "action": "string",
        "count": "integer",
        "description": "string"
      }
    ]
  },
  "message": "string",
  "timestamp": "timestamp"
}
```

#### POST /teams/batch-validate-relationships

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "batchValidation": {
    "totalRelationships": "integer",
    "results": [
      {
        "teamId": "integer",
        "userId": "integer",
        "validation": {
          "isValid": "boolean",
          "relationshipExists": "boolean",
          "integrityIssues": ["string"]
        }
      }
    ],
    "validCount": "integer",
    "invalidCount": "integer"
  },
  "timestamp": "timestamp"
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema                    | Example                                                       | Description                       |
| ----------- | ---------------- | ------------------------- | ------------------------------------------------------------- | --------------------------------- |
| 400         | application/json | `{"error": "string"}`     | `{"error": "Invalid User ID format: 'abc'"}`                  | Bad request - invalid parameters  |
| 400         | application/json | `{"error": "string"}`     | `{"error": "Invalid JSON format in request body"}`            | Malformed JSON                    |
| 400         | application/json | `{"error": "string"}`     | `{"error": "Request must contain 'relationships' array"}`     | Missing required fields           |
| 404         | application/json | `{"error": "string"}`     | `{"error": "User with ID 999 not found"}`                     | Resource not found                |
| 404         | application/json | `{"error": "string"}`     | `{"error": "Team with ID 999 not found"}`                     | Resource not found                |
| 409         | application/json | `{"error": "string"}`     | `{"error": "Cannot delete team due to active relationships"}` | Conflict - blocking relationships |
| 500         | application/json | `{"error": "string"}`     | `{"error": "Database error occurred"}`                        | Database connection failure       |
| 500         | application/json | `{"error": "string"}`     | `{"error": "An unexpected internal error occurred"}`          | Unexpected system error           |
| 401         | application/json | Confluence standard error | Confluence authentication error                               | Authentication required           |
| 403         | application/json | Confluence standard error | Confluence authorization error                                | Insufficient permissions          |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication
- **Permissions:**
  - GET endpoints: `groups: ["confluence-users", "confluence-administrators"]`
  - PUT/POST endpoints: `groups: ["confluence-users", "confluence-administrators"]`
- **Administrative Operations:**
  - Soft delete/restore operations require appropriate permissions
  - Cleanup operations may require administrator privileges

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (controlled by Confluence permissions)
- **Input Validation:**
  - Integer format validation for all IDs (ADR-031, ADR-043)
  - Explicit type casting for all parameters
  - JSON format validation for request bodies
  - Relationship array structure validation
  - SQL injection prevention via prepared statements
- **Other Security Considerations:**
  - Soft delete pattern for audit trail preservation
  - User context captured for all modifications
  - Comprehensive error handling without information leakage
  - Cascade delete protection to prevent data corruption
  - Orphaned member cleanup with transaction safety

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Bidirectional relationship queries ensure data consistency
  - Relationship integrity validation prevents orphaned records
  - Cascade delete protection analyzes impact before deletion
  - Soft delete pattern maintains audit trail and enables recovery
  - Orphaned member cleanup maintains database integrity
  - Performance optimization for large datasets with intelligent queries
- **Side Effects:**
  - GET operations: Read-only, no state changes
  - PUT soft-delete: Sets team inactive, preserves relationships
  - PUT restore: Reactivates team and associated relationships
  - POST cleanup: Removes orphaned records, updates integrity counters
  - POST batch-validate: Read-only validation with comprehensive reporting
- **Idempotency:**
  - GET: Yes (no state changes)
  - PUT: Yes (repeatable operations)
  - POST cleanup: Yes (safe to run multiple times)
  - POST batch-validate: Yes (read-only operation)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `teams_tms` (primary team table)
    - `tms_id` (INTEGER, primary key)
    - `tms_name` (VARCHAR, team name)
    - `tms_description` (TEXT, team description)
    - `tms_active` (BOOLEAN, soft delete flag)
    - Audit fields: `created_by`, `created_at`, `updated_by`, `updated_at`
  - `users_usr` (user table for relationships)
    - `usr_id` (INTEGER, primary key)
    - `usr_first_name`, `usr_last_name`, `usr_email`
    - `usr_active` (BOOLEAN, user status)
  - `team_members` (relationship junction table)
    - Foreign key relationships to teams and users
    - Membership metadata and audit fields

- **External APIs:** None
- **Other Services:**
  - TeamRepository for data access operations including relationship queries
  - UserRepository for user validation and cross-referencing
  - DatabaseUtil for connection management with transaction support
  - UserService for authentication context (ADR-042)
  - JsonBuilder for JSON response serialization
  - Log4j for comprehensive operation logging

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment
- **Migration Path:** New endpoints complement existing Teams API without breaking changes

## 10. Testing & Mock Data

- **Unit Tests:** Repository tests cover relationship queries, validation logic, and integrity checks
- **Integration Tests:** Full relationship lifecycle tested including bidirectional consistency
- **E2E Tests:** Team-user relationship scenarios tested via UI and API
- **Mock Data/Fixtures:** Available via `npm run generate-data:erase` with sample relationships
- **Performance Tests:** Large dataset scenarios (1000+ teams, 5000+ users, 10000+ relationships)

## 11. Business Logic & Validation Rules

### Get Teams for User (GET /users/{userId}/teams)

- **Business Rules:**
  - Returns active teams by default (tms_active = true)
  - includeArchived=true includes soft-deleted teams
  - User must exist before querying relationships
  - Performance optimized with appropriate indexes
- **Validation Rules:**
  - userId: Must be valid integer format
  - includeArchived: Boolean validation with default false
- **Error Conditions:**
  - Invalid user ID format: Returns 400 Bad Request
  - User not found: Returns 404 Not Found
  - Database error: Returns 500 Internal Server Error

### Get Users for Team (GET /teams/{teamId}/users)

- **Business Rules:**
  - Returns active users by default (usr_active = true)
  - includeInactive=true includes inactive users
  - Team must exist before querying members
  - Includes role information and membership metadata
- **Validation Rules:**
  - teamId: Must be valid integer format
  - includeInactive: Boolean validation with default false
- **Error Conditions:**
  - Invalid team ID format: Returns 400 Bad Request
  - Team not found: Returns 404 Not Found
  - Database error: Returns 500 Internal Server Error

### Validate Relationship Integrity (GET /teams/{teamId}/users/{userId}/validate)

- **Business Rules:**
  - Comprehensive relationship integrity checking
  - Validates both directions of relationship
  - Checks for data consistency issues
  - Reports severity levels for different issues
- **Validation Rules:**
  - Both teamId and userId must be valid integers
  - Both entities must exist in database
- **Error Conditions:**
  - Invalid ID format: Returns 400 Bad Request
  - Entity not found: Returns 404 Not Found
  - Validation error: Returns 500 Internal Server Error

### Check Delete Protection (GET /teams/{teamId}/delete-protection)

- **Business Rules:**
  - Analyzes all blocking relationships before deletion
  - Counts active members and related entities
  - Provides detailed impact assessment
  - Prevents accidental data loss
- **Validation Rules:**
  - teamId: Must be valid integer format
  - Team must exist in database
- **Error Conditions:**
  - Invalid team ID: Returns 400 Bad Request
  - Team not found: Returns 404 Not Found
  - Analysis error: Returns 500 Internal Server Error

### Soft Delete Team (PUT /teams/{teamId}/soft-delete)

- **Business Rules:**
  - Sets tms_active = false instead of physical deletion
  - Preserves all relationships for audit trail
  - Updates audit fields with deletion context
  - Handles dependent relationships gracefully
- **Validation Rules:**
  - teamId: Must be valid integer format
  - Team must exist and not already soft-deleted
  - Optional userContext validated if provided
- **Error Conditions:**
  - Invalid team ID: Returns 400 Bad Request
  - Team not found: Returns 404 Not Found
  - Already deleted: Returns 409 Conflict
  - Delete operation failed: Returns 500 Internal Server Error

### Restore Team (PUT /teams/{teamId}/restore)

- **Business Rules:**
  - Reactivates soft-deleted team (tms_active = true)
  - Restores associated relationships
  - Updates audit trail with restoration context
  - Validates restoration feasibility
- **Validation Rules:**
  - teamId: Must be valid integer format
  - Team must exist and be currently soft-deleted
  - Optional userContext validated if provided
- **Error Conditions:**
  - Invalid team ID: Returns 400 Bad Request
  - Team not found: Returns 404 Not Found
  - Team not deleted: Returns 409 Conflict
  - Restore operation failed: Returns 500 Internal Server Error

### Cleanup Orphaned Members (POST /teams/cleanup-orphaned-members)

- **Business Rules:**
  - Identifies relationships referencing non-existent entities
  - Removes orphaned records with transaction safety
  - Reports detailed cleanup statistics
  - Maintains referential integrity
- **Validation Rules:**
  - No input parameters required
  - Administrative operation with comprehensive logging
- **Error Conditions:**
  - Cleanup process error: Returns 500 Internal Server Error
  - Transaction failure: Rollback and error reporting

### Batch Validate Relationships (POST /teams/batch-validate-relationships)

- **Business Rules:**
  - Validates multiple relationships in single operation
  - Provides detailed validation results for each relationship
  - Counts valid vs invalid relationships
  - Performance optimized for large batches
- **Validation Rules:**
  - relationships: Must be array of relationship objects
  - Each relationship: Must contain teamId and userId integers
  - Maximum batch size limits may apply
- **Error Conditions:**
  - Invalid request format: Returns 400 Bad Request
  - Missing required fields: Returns 400 Bad Request
  - Validation process error: Returns 500 Internal Server Error

## 12. Examples

### Get Teams for User

```bash
curl -X GET "/rest/scriptrunner/latest/custom/users/101/teams?includeArchived=false" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "userId": 101,
  "includeArchived": false,
  "teams": [
    {
      "tms_id": 1,
      "tms_name": "Development Team",
      "tms_description": "Core development team",
      "tms_active": true,
      "created_by": "admin",
      "created_at": "2025-07-10T10:30:00Z",
      "updated_by": "admin",
      "updated_at": "2025-07-10T10:30:00Z"
    }
  ],
  "totalTeams": 1,
  "timestamp": "2025-07-13T15:45:23.123Z"
}
```

### Get Users for Team

```bash
curl -X GET "/rest/scriptrunner/latest/custom/teams/1/users?includeInactive=false" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "teamId": 1,
  "teamName": "Development Team",
  "includeInactive": false,
  "users": [
    {
      "usr_id": 101,
      "usr_first_name": "John",
      "usr_last_name": "Smith",
      "usr_email": "john.smith@company.com",
      "usr_active": true,
      "role_name": "Developer",
      "created_by": "admin",
      "created_at": "2025-07-10T11:00:00Z",
      "updated_by": "admin",
      "updated_at": "2025-07-10T11:00:00Z"
    }
  ],
  "totalUsers": 1,
  "timestamp": "2025-07-13T15:50:15.456Z"
}
```

### Validate Relationship Integrity

```bash
curl -X GET "/rest/scriptrunner/latest/custom/teams/1/users/101/validate" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "teamId": 1,
  "userId": 101,
  "validation": {
    "isValid": true,
    "relationshipExists": true,
    "teamActive": true,
    "userActive": true,
    "integrityIssues": [],
    "validationDate": "2025-07-13T15:55:00Z"
  },
  "timestamp": "2025-07-13T15:55:00.789Z"
}
```

### Check Delete Protection

```bash
curl -X GET "/rest/scriptrunner/latest/custom/teams/1/delete-protection" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "teamId": 1,
  "teamName": "Development Team",
  "protection": {
    "canDelete": false,
    "blockingRelationships": [
      {
        "type": "Active Members",
        "count": 5,
        "description": "Team has 5 active members"
      },
      {
        "type": "Migration Plans",
        "count": 2,
        "description": "Team is assigned to 2 migration plans"
      }
    ],
    "memberCount": 5,
    "activeMembers": 5,
    "relatedEntities": {
      "migrations": 1,
      "plans": 2,
      "steps": 15
    }
  },
  "timestamp": "2025-07-13T16:00:00.123Z"
}
```

### Soft Delete Team

```bash
curl -X PUT "/rest/scriptrunner/latest/custom/teams/1/soft-delete" \
  -H "Content-Type: application/json" \
  -d '{
    "userContext": {
      "userId": "admin",
      "reason": "Team restructuring",
      "notes": "Moved members to other teams"
    }
  }'
```

**Response (200 OK):**

```json
{
  "teamId": 1,
  "result": {
    "success": true,
    "membersHandled": 5,
    "relatedEntitiesUpdated": 3,
    "auditRecord": "TEAM_SOFT_DELETE_2025_01_13_16_05",
    "preservedRelationships": 5
  },
  "message": "Team soft deleted successfully",
  "timestamp": "2025-07-13T16:05:00.456Z"
}
```

### Cleanup Orphaned Members

```bash
curl -X POST "/rest/scriptrunner/latest/custom/teams/cleanup-orphaned-members" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "cleanup": {
    "orphanedMembersFound": 3,
    "orphanedMembersRemoved": 3,
    "integrityIssuesFixed": 2,
    "teamsAffected": 2,
    "executionTimeMs": 156,
    "details": [
      {
        "action": "Removed orphaned membership",
        "count": 2,
        "description": "Members referencing deleted teams"
      },
      {
        "action": "Fixed integrity constraint",
        "count": 1,
        "description": "Corrected relationship inconsistency"
      }
    ]
  },
  "message": "Orphaned member cleanup completed",
  "timestamp": "2025-07-13T16:10:00.789Z"
}
```

### Batch Validate Relationships

```bash
curl -X POST "/rest/scriptrunner/latest/custom/teams/batch-validate-relationships" \
  -H "Content-Type: application/json" \
  -d '{
    "relationships": [
      {"teamId": 1, "userId": 101},
      {"teamId": 1, "userId": 102},
      {"teamId": 2, "userId": 103}
    ]
  }'
```

**Response (200 OK):**

```json
{
  "batchValidation": {
    "totalRelationships": 3,
    "results": [
      {
        "teamId": 1,
        "userId": 101,
        "validation": {
          "isValid": true,
          "relationshipExists": true,
          "integrityIssues": []
        }
      },
      {
        "teamId": 1,
        "userId": 102,
        "validation": {
          "isValid": false,
          "relationshipExists": false,
          "integrityIssues": ["User not member of team"]
        }
      },
      {
        "teamId": 2,
        "userId": 103,
        "validation": {
          "isValid": true,
          "relationshipExists": true,
          "integrityIssues": []
        }
      }
    ],
    "validCount": 2,
    "invalidCount": 1
  },
  "timestamp": "2025-07-13T16:15:00.123Z"
}
```

## 13. Notes

- **Implementation Notes:**
  - Built specifically for US-082-C Teams Entity Migration
  - Performance optimized for datasets with 1000+ teams and 10000+ relationships
  - Comprehensive relationship integrity validation prevents data corruption
  - Soft delete pattern maintains complete audit trail
  - Bidirectional relationship queries ensure consistency
- **Integration Considerations:**
  - Complements existing Teams API without breaking changes
  - Designed for Admin GUI integration and batch operations
  - Supports migration scenarios with relationship preservation
  - Orphaned member cleanup maintains database health
- **Performance Characteristics:**
  - Simple relationship queries: <100ms response time
  - Batch validation operations: <500ms for 100 relationships
  - Cleanup operations: <1s for typical database sizes
  - Delete protection analysis: <200ms response time
  - Optimized with proper indexing on relationship tables

## 14. Related APIs

- **Teams API:** Core team management operations (CRUD)
- **Users API:** User management and profile operations
- **User Relationships API:** Bidirectional user-team relationship management
- **Admin GUI APIs:** Relationship visualization and management interfaces

## 15. Change Log

- **2025-07-13:** Initial API specification created for US-082-C Teams Entity Migration
- **2025-07-13:** Added comprehensive relationship integrity validation
- **2025-07-13:** Implemented cascade delete protection and orphaned member cleanup
- **2025-07-13:** Added batch validation capabilities for large dataset operations

---

> **Note:** This API provides enterprise-grade bidirectional team-user relationship management with comprehensive integrity validation, cascade delete protection, and performance optimization. It's designed to support complex migration scenarios while maintaining complete data consistency and audit trails.
