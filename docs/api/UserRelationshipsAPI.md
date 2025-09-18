# User Relationships API Specification

> Comprehensive bidirectional user-team relationship management API providing enterprise-grade role transition validation, cascade delete protection, and user activity tracking capabilities with performance optimization for large datasets and comprehensive audit logging.

---

## 1. API Overview

- **API Name:** User Relationships API v2
- **Purpose:** Complete bidirectional user-team relationship management including role transition validation, relationship queries, integrity validation, cascade delete protection, user activity tracking, and batch operations. Supports the Users Entity Migration (US-082-C) with enterprise-grade relationship integrity, 90-day audit retention, and performance optimization for large datasets.
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-031 (Type Safety), ADR-026 (Testing Patterns), ADR-039 (Error Handling), ADR-042 (Authentication Context), ADR-043 (Explicit Casting)

## 2. Endpoints

| Method | Path                                           | Description                                        | Security Groups           |
| ------ | ---------------------------------------------- | -------------------------------------------------- | ------------------------- |
| GET    | /api/v2/users/{userId}/teams                   | Retrieve teams for specific user                   | confluence-users          |
| GET    | /api/v2/users/{userId}/teams/{teamId}/validate | Validate specific user-team relationship integrity | confluence-users          |
| GET    | /api/v2/users/{userId}/delete-protection       | Check cascade delete protection for user           | confluence-users          |
| GET    | /api/v2/users/{userId}/activity                | Retrieve user activity tracking with history       | confluence-users          |
| GET    | /api/v2/users/relationship-statistics          | Retrieve user relationship statistics              | confluence-users          |
| PUT    | /api/v2/users/{userId}/soft-delete             | Soft delete user with relationship preservation    | confluence-administrators |
| PUT    | /api/v2/users/{userId}/restore                 | Restore soft-deleted user                          | confluence-administrators |
| PUT    | /api/v2/users/{userId}/role                    | Change user role with validation                   | confluence-administrators |
| PUT    | /api/v2/users/{userId}/role/validate           | Validate role transition feasibility               | confluence-administrators |
| POST   | /api/v2/users/cleanup-orphaned-members         | Cleanup orphaned user memberships                  | confluence-administrators |
| POST   | /api/v2/users/batch-validate                   | Batch validate multiple users                      | confluence-users          |
| POST   | /api/v2/users/batch-validate-relationships     | Batch validate user-team relationships             | confluence-users          |

## 3. Request Details

### 3.1. Path Parameters

| Name   | Type    | Required | Description                                        |
| ------ | ------- | -------- | -------------------------------------------------- |
| userId | integer | Yes\*    | The user ID for user-centric operations            |
| teamId | integer | Yes\*    | The team ID for relationship validation operations |

\*Required based on endpoint context

### 3.2. Query Parameters

| Name            | Type    | Required | Description                                              |
| --------------- | ------- | -------- | -------------------------------------------------------- |
| includeArchived | boolean | No       | Include archived teams (default: false)                  |
| days            | integer | No       | Number of days for activity history (1-365, default: 30) |

### 3.3. Request Body

#### PUT /users/{userId}/soft-delete

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

#### PUT /users/{userId}/restore

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

#### PUT /users/{userId}/role

- **Content-Type:** application/json
- **Schema:**

```json
{
  "roleId": "integer (required, new role ID)",
  "userContext": {
    "userId": "string (optional, for audit trail)",
    "reason": "string (optional, role change reason)",
    "notes": "string (optional, additional context)"
  }
}
```

- **Example:**

```json
{
  "roleId": 3,
  "userContext": {
    "userId": "admin",
    "reason": "Promotion to team lead",
    "notes": "User completed leadership training"
  }
}
```

#### PUT /users/{userId}/role/validate

- **Content-Type:** application/json
- **Schema:**

```json
{
  "fromRoleId": "integer (optional, current role ID)",
  "toRoleId": "integer (required, target role ID)"
}
```

#### POST /users/batch-validate

- **Content-Type:** application/json
- **Schema:**

```json
{
  "userIds": ["integer (required)", "array of user IDs"]
}
```

- **Example:**

```json
{
  "userIds": [101, 102, 103, 104, 105]
}
```

#### POST /users/batch-validate-relationships

- **Content-Type:** application/json
- **Schema:**

```json
{
  "relationships": [
    {
      "userId": "integer (required)",
      "teamId": "integer (required)"
    }
  ]
}
```

- **Example:**

```json
{
  "relationships": [
    { "userId": 101, "teamId": 1 },
    { "userId": 102, "teamId": 1 },
    { "userId": 103, "teamId": 2 }
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
  "userName": "string",
  "userEmail": "string",
  "includeArchived": "boolean",
  "teams": [
    {
      "tms_id": "integer",
      "tms_name": "string",
      "tms_description": "string",
      "tms_active": "boolean",
      "role_name": "string",
      "membership_start_date": "timestamp",
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
  "userName": "John Smith",
  "userEmail": "john.smith@company.com",
  "includeArchived": false,
  "teams": [
    {
      "tms_id": 1,
      "tms_name": "Development Team",
      "tms_description": "Core development team",
      "tms_active": true,
      "role_name": "Senior Developer",
      "membership_start_date": "2025-07-10T10:30:00Z",
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

#### GET /users/{userId}/teams/{teamId}/validate

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "userId": "integer",
  "teamId": "integer",
  "validation": {
    "isValid": "boolean",
    "relationshipExists": "boolean",
    "userActive": "boolean",
    "teamActive": "boolean",
    "roleValid": "boolean",
    "integrityIssues": [
      {
        "issue": "string",
        "severity": "string (LOW|MEDIUM|HIGH|CRITICAL)",
        "description": "string",
        "recommendation": "string"
      }
    ],
    "validationDate": "timestamp",
    "lastAuditDate": "timestamp"
  },
  "timestamp": "timestamp"
}
```

#### GET /users/{userId}/delete-protection

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "userId": "integer",
  "userName": "string",
  "protection": {
    "canDelete": "boolean",
    "blockingRelationships": [
      {
        "type": "string",
        "count": "integer",
        "description": "string",
        "severity": "string"
      }
    ],
    "teamMemberships": "integer",
    "activeMemberships": "integer",
    "leadershipRoles": "integer",
    "relatedEntities": {
      "ownedMigrations": "integer",
      "assignedPlans": "integer",
      "activeSteps": "integer",
      "auditRecords": "integer"
    },
    "retentionPeriod": "integer (days)"
  },
  "timestamp": "timestamp"
}
```

#### GET /users/{userId}/activity

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "userId": "integer",
  "userName": "string",
  "days": "integer",
  "activities": [
    {
      "activity_id": "string",
      "activity_type": "string",
      "description": "string",
      "team_id": "integer",
      "team_name": "string",
      "timestamp": "timestamp",
      "metadata": {
        "action": "string",
        "old_value": "string",
        "new_value": "string",
        "context": "string"
      }
    }
  ],
  "totalActivities": "integer",
  "activitySummary": {
    "teamJoined": "integer",
    "teamLeft": "integer",
    "roleChanged": "integer",
    "loginCount": "integer",
    "lastLoginDate": "timestamp"
  },
  "timestamp": "timestamp"
}
```

#### GET /users/relationship-statistics

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "statistics": {
    "totalUsers": "integer",
    "activeUsers": "integer",
    "inactiveUsers": "integer",
    "archivedUsers": "integer",
    "totalMemberships": "integer",
    "averageTeamsPerUser": "number",
    "orphanedMemberships": "integer",
    "integrityIssues": "integer",
    "roleDistribution": {
      "developer": "integer",
      "team_lead": "integer",
      "manager": "integer",
      "admin": "integer"
    },
    "activityMetrics": {
      "activeInLast30Days": "integer",
      "newUsersLast30Days": "integer",
      "roleChangesLast30Days": "integer"
    },
    "lastCleanupDate": "timestamp",
    "auditRetentionDays": "integer"
  },
  "timestamp": "timestamp"
}
```

#### PUT /users/{userId}/soft-delete

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "userId": "integer",
  "result": {
    "success": "boolean",
    "membershipsHandled": "integer",
    "relatedEntitiesUpdated": "integer",
    "auditRecord": "string",
    "preservedRelationships": "integer",
    "dataRetentionPeriod": "integer (days)",
    "restorationDeadline": "timestamp"
  },
  "message": "string",
  "timestamp": "timestamp"
}
```

#### PUT /users/{userId}/restore

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "userId": "integer",
  "result": {
    "success": "boolean",
    "membershipsRestored": "integer",
    "relatedEntitiesUpdated": "integer",
    "auditRecord": "string",
    "restoredRelationships": "integer",
    "roleRestored": "string",
    "teamsRejoined": "integer"
  },
  "message": "string",
  "timestamp": "timestamp"
}
```

#### PUT /users/{userId}/role

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "userId": "integer",
  "result": {
    "success": "boolean",
    "oldRoleId": "integer",
    "newRoleId": "integer",
    "oldRoleName": "string",
    "newRoleName": "string",
    "effectiveDate": "timestamp",
    "auditRecord": "string",
    "affectedTeams": "integer",
    "permissionsUpdated": "integer"
  },
  "message": "string",
  "timestamp": "timestamp"
}
```

#### PUT /users/{userId}/role/validate

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "userId": "integer",
  "roleTransition": {
    "fromRoleId": "integer",
    "toRoleId": "integer",
    "fromRoleName": "string",
    "toRoleName": "string"
  },
  "validation": {
    "isValid": "boolean",
    "canTransition": "boolean",
    "requiresApproval": "boolean",
    "blockers": [
      {
        "type": "string",
        "description": "string",
        "severity": "string",
        "resolution": "string"
      }
    ],
    "prerequisites": [
      {
        "requirement": "string",
        "fulfilled": "boolean",
        "description": "string"
      }
    ],
    "implications": [
      {
        "area": "string",
        "impact": "string",
        "description": "string"
      }
    ]
  },
  "timestamp": "timestamp"
}
```

#### POST /users/cleanup-orphaned-members

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "cleanup": {
    "orphanedMembershipsFound": "integer",
    "orphanedMembershipsRemoved": "integer",
    "integrityIssuesFixed": "integer",
    "usersAffected": "integer",
    "teamsAffected": "integer",
    "auditRecordsCreated": "integer",
    "executionTimeMs": "integer",
    "details": [
      {
        "action": "string",
        "count": "integer",
        "description": "string",
        "affectedEntities": ["string"]
      }
    ]
  },
  "message": "string",
  "timestamp": "timestamp"
}
```

#### POST /users/batch-validate

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "batchValidation": {
    "totalUsers": "integer",
    "validUsers": "integer",
    "invalidUsers": "integer",
    "results": [
      {
        "userId": "integer",
        "userName": "string",
        "isValid": "boolean",
        "issues": ["string"],
        "teamCount": "integer",
        "lastActivity": "timestamp"
      }
    ],
    "summary": {
      "activeUsers": "integer",
      "inactiveUsers": "integer",
      "orphanedUsers": "integer",
      "usersWithIssues": "integer"
    }
  },
  "message": "string",
  "timestamp": "timestamp"
}
```

#### POST /users/batch-validate-relationships

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "batchValidation": {
    "totalRelationships": "integer",
    "results": [
      {
        "userId": "integer",
        "teamId": "integer",
        "validation": {
          "isValid": "boolean",
          "relationshipExists": "boolean",
          "integrityIssues": ["string"]
        }
      }
    ],
    "validCount": "integer",
    "invalidCount": "integer",
    "summary": {
      "activeRelationships": "integer",
      "archivedRelationships": "integer",
      "orphanedRelationships": "integer",
      "integrityIssues": "integer"
    }
  },
  "timestamp": "timestamp"
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema                    | Example                                                       | Description                           |
| ----------- | ---------------- | ------------------------- | ------------------------------------------------------------- | ------------------------------------- |
| 400         | application/json | `{"error": "string"}`     | `{"error": "Invalid User ID format: 'abc'"}`                  | Bad request - invalid parameters      |
| 400         | application/json | `{"error": "string"}`     | `{"error": "Days parameter must be between 1 and 365"}`       | Invalid query parameters              |
| 400         | application/json | `{"error": "string"}`     | `{"error": "Role ID must be a valid integer"}`                | Invalid request body                  |
| 400         | application/json | `{"error": "string"}`     | `{"error": "Request must contain 'userIds' array"}`           | Missing required fields               |
| 400         | application/json | `{"error": "string"}`     | `{"error": "Invalid JSON format in request body"}`            | Malformed JSON                        |
| 404         | application/json | `{"error": "string"}`     | `{"error": "User with ID 999 not found"}`                     | Resource not found                    |
| 404         | application/json | `{"error": "string"}`     | `{"error": "Team with ID 999 not found"}`                     | Resource not found                    |
| 409         | application/json | `{"error": "string"}`     | `{"error": "User not deleted - already active"}`              | Conflict - user not in expected state |
| 409         | application/json | `{"error": "string"}`     | `{"error": "Cannot delete user due to active relationships"}` | Conflict - blocking relationships     |
| 500         | application/json | `{"error": "string"}`     | `{"error": "Database error occurred"}`                        | Database connection failure           |
| 500         | application/json | `{"error": "string"}`     | `{"error": "An unexpected internal error occurred"}`          | Unexpected system error               |
| 401         | application/json | Confluence standard error | Confluence authentication error                               | Authentication required               |
| 403         | application/json | Confluence standard error | Confluence authorization error                                | Insufficient permissions              |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication
- **Permissions:**
  - **Read Operations (GET):** `groups: ["confluence-users"]`
  - **Administrative Operations (PUT/POST):** Depends on operation:
    - User soft-delete/restore: `groups: ["confluence-administrators"]`
    - Role changes: `groups: ["confluence-administrators"]`
    - Cleanup operations: `groups: ["confluence-administrators"]`
    - Batch validation: `groups: ["confluence-users"]`
- **User Context:** Automatically captured for audit trails per ADR-042

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (controlled by Confluence permissions)
- **Input Validation:**
  - Integer format validation for all IDs (ADR-031, ADR-043)
  - Explicit type casting for all parameters
  - JSON format validation for request bodies
  - Array structure validation for batch operations
  - Days parameter range validation (1-365)
  - Role ID validation against available roles
  - SQL injection prevention via prepared statements
- **Other Security Considerations:**
  - Soft delete pattern for audit trail preservation
  - 90-day audit retention requirement for compliance
  - User context captured for all modifications
  - Comprehensive error handling without information leakage
  - Cascade delete protection to prevent data corruption
  - Role transition validation prevents privilege escalation
  - Activity tracking for security auditing
  - Batch operation limits for performance protection

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Bidirectional user-team relationship management with role awareness
  - Role transition validation with prerequisite checking
  - Activity tracking for audit and compliance requirements
  - Cascade delete protection analyzes impact before user deletion
  - Soft delete pattern maintains complete audit trail
  - Batch operations with performance optimization for large datasets
  - Orphaned member cleanup maintains database integrity
  - 90-day audit retention for regulatory compliance
- **Side Effects:**
  - GET operations: Read-only, may update access logs
  - PUT soft-delete: Sets user inactive, preserves all relationships
  - PUT restore: Reactivates user and associated relationships
  - PUT role change: Updates permissions across affected teams
  - PUT role validate: Read-only validation with compliance checking
  - POST cleanup: Removes orphaned records, creates audit entries
  - POST batch operations: Read-only validation with comprehensive reporting
- **Idempotency:**
  - GET: Yes (no state changes)
  - PUT: Yes (repeatable operations with audit trail)
  - POST cleanup: Yes (safe to run multiple times)
  - POST batch validation: Yes (read-only operations)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `users_usr` (primary user table)
    - `usr_id` (INTEGER, primary key)
    - `usr_first_name`, `usr_last_name`, `usr_email`
    - `usr_active` (BOOLEAN, soft delete flag)
    - Role relationship via foreign key
    - Audit fields: `created_by`, `created_at`, `updated_by`, `updated_at`
  - `teams_tms` (team table for relationships)
    - `tms_id` (INTEGER, primary key)
    - `tms_name`, `tms_description`, `tms_active`
  - `user_team_memberships` (relationship junction table)
    - Foreign key relationships to users and teams
    - Role assignments and membership metadata
    - Audit fields for tracking changes
  - `roles_rol` (role definition table)
    - `rol_id` (INTEGER, primary key)
    - `rol_name`, `rol_description`, `rol_permissions`
  - `user_activity_log` (activity tracking table)
    - Activity history with 90-day retention
    - Action types, timestamps, metadata

- **External APIs:** None
- **Other Services:**
  - UserRepository for data access operations including relationship queries
  - TeamRepository for team validation and cross-referencing
  - RoleRepository for role validation and transition logic
  - DatabaseUtil for connection management with transaction support
  - UserService for authentication context (ADR-042)
  - AuditService for comprehensive activity logging
  - JsonBuilder for JSON response serialization
  - Log4j for comprehensive operation logging

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment
- **Migration Path:** New endpoints complement existing Users API without breaking changes

## 10. Testing & Mock Data

- **Unit Tests:** Repository tests cover relationship queries, role validation, and activity tracking
- **Integration Tests:** Complete user lifecycle including role transitions and batch operations
- **E2E Tests:** User-team relationship scenarios with role management and activity tracking
- **Security Tests:** Role escalation prevention, audit trail validation, activity tracking verification
- **Performance Tests:** Large dataset scenarios (5000+ users, 1000+ teams, 50000+ relationships, 90-day activity history)
- **Mock Data/Fixtures:** Available via `npm run generate-data:erase` with sample user relationships and activity history

## 11. Business Logic & Validation Rules

### Get Teams for User (GET /users/{userId}/teams)

- **Business Rules:**
  - Returns active teams by default (tms_active = true)
  - includeArchived=true includes soft-deleted teams
  - User must exist before querying relationships
  - Includes role information and membership start dates
  - Performance optimized with appropriate indexes
- **Validation Rules:**
  - userId: Must be valid integer format
  - includeArchived: Boolean validation with default false
- **Error Conditions:**
  - Invalid user ID format: Returns 400 Bad Request
  - User not found: Returns 404 Not Found
  - Database error: Returns 500 Internal Server Error

### Validate Relationship Integrity (GET /users/{userId}/teams/{teamId}/validate)

- **Business Rules:**
  - Comprehensive relationship integrity checking from user perspective
  - Validates role assignment consistency
  - Checks for data consistency issues across relationship tables
  - Reports severity levels (LOW|MEDIUM|HIGH|CRITICAL) for different issues
  - Includes audit date tracking for compliance
- **Validation Rules:**
  - Both userId and teamId must be valid integers
  - Both entities must exist in database
- **Error Conditions:**
  - Invalid ID format: Returns 400 Bad Request
  - Entity not found: Returns 404 Not Found
  - Validation error: Returns 500 Internal Server Error

### Check Delete Protection (GET /users/{userId}/delete-protection)

- **Business Rules:**
  - Analyzes all blocking relationships before user deletion
  - Counts team memberships and leadership roles
  - Provides detailed impact assessment across all related entities
  - Considers 90-day audit retention requirements
  - Prevents accidental data loss with comprehensive protection analysis
- **Validation Rules:**
  - userId: Must be valid integer format
  - User must exist in database
- **Error Conditions:**
  - Invalid user ID: Returns 400 Bad Request
  - User not found: Returns 404 Not Found
  - Analysis error: Returns 500 Internal Server Error

### Get User Activity (GET /users/{userId}/activity)

- **Business Rules:**
  - Retrieves activity history for specified number of days (1-365)
  - Includes team join/leave events, role changes, login tracking
  - Provides activity summary with aggregated metrics
  - Supports compliance and audit requirements
  - Performance optimized for large activity datasets
- **Validation Rules:**
  - userId: Must be valid integer format
  - days: Must be integer between 1 and 365, defaults to 30
  - User must exist in database
- **Error Conditions:**
  - Invalid user ID: Returns 400 Bad Request
  - Invalid days parameter: Returns 400 Bad Request
  - User not found: Returns 404 Not Found
  - Activity retrieval error: Returns 500 Internal Server Error

### Soft Delete User (PUT /users/{userId}/soft-delete)

- **Business Rules:**
  - Sets usr_active = false instead of physical deletion
  - Preserves all relationships and audit trail
  - Maintains 90-day retention for compliance
  - Updates audit fields with deletion context
  - Handles dependent relationships gracefully
  - Sets restoration deadline for data recovery
- **Validation Rules:**
  - userId: Must be valid integer format
  - User must exist and not already soft-deleted
  - Optional userContext validated if provided
- **Error Conditions:**
  - Invalid user ID: Returns 400 Bad Request
  - User not found: Returns 404 Not Found
  - Already deleted: Returns 409 Conflict
  - Delete operation failed: Returns 500 Internal Server Error

### Restore User (PUT /users/{userId}/restore)

- **Business Rules:**
  - Reactivates soft-deleted user (usr_active = true)
  - Restores team memberships and role assignments
  - Updates audit trail with restoration context
  - Validates restoration feasibility within retention period
  - Reactivates related permissions and access
- **Validation Rules:**
  - userId: Must be valid integer format
  - User must exist and be currently soft-deleted
  - Must be within data retention period
  - Optional userContext validated if provided
- **Error Conditions:**
  - Invalid user ID: Returns 400 Bad Request
  - User not found: Returns 404 Not Found
  - User not deleted: Returns 409 Conflict
  - Retention period expired: Returns 409 Conflict
  - Restore operation failed: Returns 500 Internal Server Error

### Change User Role (PUT /users/{userId}/role)

- **Business Rules:**
  - Updates user role with comprehensive validation
  - Validates role transition permissions and prerequisites
  - Updates permissions across all affected teams
  - Creates detailed audit trail for role changes
  - Handles role-specific permission updates automatically
- **Validation Rules:**
  - userId: Must be valid integer format
  - roleId: Must be valid integer and exist in roles table
  - User must exist and be active
  - Role transition must pass validation rules
- **Error Conditions:**
  - Invalid user ID: Returns 400 Bad Request
  - Invalid role ID: Returns 400 Bad Request
  - User not found: Returns 404 Not Found
  - Role not found: Returns 404 Not Found
  - Invalid role transition: Returns 409 Conflict
  - Role change failed: Returns 500 Internal Server Error

### Validate Role Transition (PUT /users/{userId}/role/validate)

- **Business Rules:**
  - Comprehensive role transition feasibility analysis
  - Checks prerequisites, blockers, and implications
  - Determines if approval workflow is required
  - Provides detailed guidance for successful transition
  - Validates business rules for role changes
- **Validation Rules:**
  - userId: Must be valid integer format
  - toRoleId: Must be valid integer and exist in roles table
  - fromRoleId: Optional, validated if provided
  - User must exist and be active
- **Error Conditions:**
  - Invalid user ID: Returns 400 Bad Request
  - Invalid role ID: Returns 400 Bad Request
  - User not found: Returns 404 Not Found
  - Role not found: Returns 404 Not Found
  - Validation process error: Returns 500 Internal Server Error

### Cleanup Orphaned Members (POST /users/cleanup-orphaned-members)

- **Business Rules:**
  - Identifies memberships referencing non-existent entities
  - Removes orphaned records with transaction safety
  - Creates comprehensive audit records for all changes
  - Reports detailed cleanup statistics with affected entities
  - Maintains referential integrity across all relationship tables
- **Validation Rules:**
  - No input parameters required
  - Administrative operation with comprehensive logging
- **Error Conditions:**
  - Cleanup process error: Returns 500 Internal Server Error
  - Transaction failure: Rollback and error reporting

### Batch Validate Users (POST /users/batch-validate)

- **Business Rules:**
  - Validates multiple users in single operation
  - Provides detailed validation results for each user
  - Counts valid vs invalid users with summary statistics
  - Performance optimized for large batches
  - Includes team count and activity information
- **Validation Rules:**
  - userIds: Must be array of integer user IDs
  - Maximum batch size limits may apply for performance
- **Error Conditions:**
  - Invalid request format: Returns 400 Bad Request
  - Missing required fields: Returns 400 Bad Request
  - Validation process error: Returns 500 Internal Server Error

### Batch Validate Relationships (POST /users/batch-validate-relationships)

- **Business Rules:**
  - Validates multiple user-team relationships in single operation
  - Provides detailed validation results for each relationship
  - Counts valid vs invalid relationships with summary statistics
  - Performance optimized for large relationship batches
  - Identifies integrity issues across relationship data
- **Validation Rules:**
  - relationships: Must be array of relationship objects
  - Each relationship: Must contain userId and teamId integers
  - Maximum batch size limits may apply for performance
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
  "userName": "John Smith",
  "userEmail": "john.smith@company.com",
  "includeArchived": false,
  "teams": [
    {
      "tms_id": 1,
      "tms_name": "Development Team",
      "tms_description": "Core development team",
      "tms_active": true,
      "role_name": "Senior Developer",
      "membership_start_date": "2025-07-10T10:30:00Z",
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

### Validate User-Team Relationship

```bash
curl -X GET "/rest/scriptrunner/latest/custom/users/101/teams/1/validate" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "userId": 101,
  "teamId": 1,
  "validation": {
    "isValid": true,
    "relationshipExists": true,
    "userActive": true,
    "teamActive": true,
    "roleValid": true,
    "integrityIssues": [],
    "validationDate": "2025-07-13T15:55:00Z",
    "lastAuditDate": "2025-07-13T12:00:00Z"
  },
  "timestamp": "2025-07-13T15:55:00.789Z"
}
```

### Get User Activity

```bash
curl -X GET "/rest/scriptrunner/latest/custom/users/101/activity?days=30" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "userId": 101,
  "userName": "John Smith",
  "days": 30,
  "activities": [
    {
      "activity_id": "ACT_001",
      "activity_type": "ROLE_CHANGE",
      "description": "Role changed from Developer to Senior Developer",
      "team_id": 1,
      "team_name": "Development Team",
      "timestamp": "2025-07-12T14:30:00Z",
      "metadata": {
        "action": "ROLE_UPDATE",
        "old_value": "Developer",
        "new_value": "Senior Developer",
        "context": "Annual review promotion"
      }
    }
  ],
  "totalActivities": 1,
  "activitySummary": {
    "teamJoined": 0,
    "teamLeft": 0,
    "roleChanged": 1,
    "loginCount": 25,
    "lastLoginDate": "2025-07-13T08:30:00Z"
  },
  "timestamp": "2025-07-13T16:00:00.456Z"
}
```

### Check Delete Protection

```bash
curl -X GET "/rest/scriptrunner/latest/custom/users/101/delete-protection" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "userId": 101,
  "userName": "John Smith",
  "protection": {
    "canDelete": false,
    "blockingRelationships": [
      {
        "type": "Active Team Memberships",
        "count": 2,
        "description": "User is active member of 2 teams",
        "severity": "HIGH"
      },
      {
        "type": "Leadership Roles",
        "count": 1,
        "description": "User has leadership role in 1 team",
        "severity": "CRITICAL"
      }
    ],
    "teamMemberships": 2,
    "activeMemberships": 2,
    "leadershipRoles": 1,
    "relatedEntities": {
      "ownedMigrations": 0,
      "assignedPlans": 3,
      "activeSteps": 15,
      "auditRecords": 45
    },
    "retentionPeriod": 90
  },
  "timestamp": "2025-07-13T16:05:00.123Z"
}
```

### Change User Role

```bash
curl -X PUT "/rest/scriptrunner/latest/custom/users/101/role" \
  -H "Content-Type: application/json" \
  -d '{
    "roleId": 3,
    "userContext": {
      "userId": "admin",
      "reason": "Promotion to team lead",
      "notes": "User completed leadership training successfully"
    }
  }'
```

**Response (200 OK):**

```json
{
  "userId": 101,
  "result": {
    "success": true,
    "oldRoleId": 2,
    "newRoleId": 3,
    "oldRoleName": "Senior Developer",
    "newRoleName": "Team Lead",
    "effectiveDate": "2025-07-13T16:10:00Z",
    "auditRecord": "ROLE_CHANGE_2025_01_13_16_10",
    "affectedTeams": 2,
    "permissionsUpdated": 8
  },
  "message": "User role changed successfully",
  "timestamp": "2025-07-13T16:10:00.456Z"
}
```

### Validate Role Transition

```bash
curl -X PUT "/rest/scriptrunner/latest/custom/users/101/role/validate" \
  -H "Content-Type: application/json" \
  -d '{
    "fromRoleId": 2,
    "toRoleId": 4
  }'
```

**Response (200 OK):**

```json
{
  "userId": 101,
  "roleTransition": {
    "fromRoleId": 2,
    "toRoleId": 4,
    "fromRoleName": "Senior Developer",
    "toRoleName": "Engineering Manager"
  },
  "validation": {
    "isValid": true,
    "canTransition": true,
    "requiresApproval": true,
    "blockers": [],
    "prerequisites": [
      {
        "requirement": "Management Training Completion",
        "fulfilled": true,
        "description": "Required leadership training completed on 2025-08-01"
      },
      {
        "requirement": "Minimum Experience (3 years)",
        "fulfilled": true,
        "description": "User has 4.5 years experience"
      }
    ],
    "implications": [
      {
        "area": "Team Management",
        "impact": "Will gain management responsibilities for 2 teams",
        "description": "Direct reports will increase from 0 to 8 team members"
      },
      {
        "area": "Budget Authority",
        "impact": "Will gain budget approval authority up to $50,000",
        "description": "Budget permissions will be activated upon role change"
      }
    ]
  },
  "timestamp": "2025-07-13T16:15:00.789Z"
}
```

### Cleanup Orphaned Members

```bash
curl -X POST "/rest/scriptrunner/latest/custom/users/cleanup-orphaned-members" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "cleanup": {
    "orphanedMembershipsFound": 5,
    "orphanedMembershipsRemoved": 5,
    "integrityIssuesFixed": 3,
    "usersAffected": 4,
    "teamsAffected": 3,
    "auditRecordsCreated": 8,
    "executionTimeMs": 234,
    "details": [
      {
        "action": "Removed orphaned membership",
        "count": 3,
        "description": "Memberships referencing deleted teams",
        "affectedEntities": ["Team_5", "Team_7", "Team_12"]
      },
      {
        "action": "Fixed role inconsistency",
        "count": 2,
        "description": "Invalid role assignments corrected",
        "affectedEntities": ["User_101", "User_205"]
      }
    ]
  },
  "message": "Orphaned member cleanup completed",
  "timestamp": "2025-07-13T16:20:00.123Z"
}
```

### Batch Validate Users

```bash
curl -X POST "/rest/scriptrunner/latest/custom/users/batch-validate" \
  -H "Content-Type: application/json" \
  -d '{
    "userIds": [101, 102, 103, 104, 999]
  }'
```

**Response (200 OK):**

```json
{
  "batchValidation": {
    "totalUsers": 5,
    "validUsers": 4,
    "invalidUsers": 1,
    "results": [
      {
        "userId": 101,
        "userName": "John Smith",
        "isValid": true,
        "issues": [],
        "teamCount": 2,
        "lastActivity": "2025-07-13T08:30:00Z"
      },
      {
        "userId": 999,
        "userName": null,
        "isValid": false,
        "issues": ["User not found"],
        "teamCount": 0,
        "lastActivity": null
      }
    ],
    "summary": {
      "activeUsers": 4,
      "inactiveUsers": 0,
      "orphanedUsers": 0,
      "usersWithIssues": 1
    }
  },
  "message": "Batch user validation completed",
  "timestamp": "2025-07-13T16:25:00.456Z"
}
```

### Batch Validate Relationships

```bash
curl -X POST "/rest/scriptrunner/latest/custom/users/batch-validate-relationships" \
  -H "Content-Type: application/json" \
  -d '{
    "relationships": [
      {"userId": 101, "teamId": 1},
      {"userId": 102, "teamId": 1},
      {"userId": 103, "teamId": 999}
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
        "userId": 101,
        "teamId": 1,
        "validation": {
          "isValid": true,
          "relationshipExists": true,
          "integrityIssues": []
        }
      },
      {
        "userId": 102,
        "teamId": 1,
        "validation": {
          "isValid": true,
          "relationshipExists": true,
          "integrityIssues": []
        }
      },
      {
        "userId": 103,
        "teamId": 999,
        "validation": {
          "isValid": false,
          "relationshipExists": false,
          "integrityIssues": ["Team not found"]
        }
      }
    ],
    "validCount": 2,
    "invalidCount": 1,
    "summary": {
      "activeRelationships": 2,
      "archivedRelationships": 0,
      "orphanedRelationships": 0,
      "integrityIssues": 1
    }
  },
  "timestamp": "2025-07-13T16:30:00.789Z"
}
```

## 13. Notes

- **Implementation Notes:**
  - Built specifically for US-082-C Users Entity Migration
  - Performance optimized for datasets with 5000+ users and 50000+ relationships
  - Comprehensive role management with transition validation
  - Activity tracking with 90-day retention for compliance
  - Soft delete pattern maintains complete audit trail
  - Batch operations support large-scale administration
- **Integration Considerations:**
  - Complements existing Users API without breaking changes
  - Designed for enterprise user management and compliance
  - Supports complex role hierarchies and permission systems
  - Integrates with activity tracking for audit requirements
- **Performance Characteristics:**
  - Simple relationship queries: <100ms response time
  - Activity queries (30-day): <150ms response time
  - Role validation operations: <200ms response time
  - Batch operations: <500ms for 100 items
  - Cleanup operations: <2s for typical database sizes
  - Optimized with proper indexing on user, team, and role tables

## 14. Related APIs

- **Users API:** Core user management operations (CRUD)
- **Teams API:** Team management and configuration operations
- **Team Relationships API:** Bidirectional team-user relationship management
- **Roles API:** Role definition and permission management
- **Admin GUI APIs:** User management interface and relationship visualization

## 15. Change Log

- **2025-07-13:** Initial API specification created for US-082-C Users Entity Migration
- **2025-07-13:** Added comprehensive role management with transition validation
- **2025-07-13:** Implemented activity tracking with 90-day audit retention
- **2025-07-13:** Added batch operations for large-scale user administration
- **2025-07-13:** Implemented cascade delete protection with detailed analysis

---

> **Note:** This API provides enterprise-grade bidirectional user-team relationship management with comprehensive role management, activity tracking, and 90-day audit retention. It's designed to support complex enterprise environments with detailed compliance requirements and large-scale user administration capabilities.
