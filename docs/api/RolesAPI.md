# Roles API Specification

## 1. API Overview

- **API Name:** Roles API v2
- **Purpose:** Role management endpoint for UMIG role-based access control (RBAC) system. Provides comprehensive role information retrieval for user interface components, permission management, and administrative functions within the UMIG ecosystem.
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-031 (Type Safety), ADR-042 (Dual Authentication Support)

## 2. Endpoints

| Method | Path   | Description                           |
| ------ | ------ | ------------------------------------- |
| GET    | /roles | Get all available roles in the system |

## 3. Request Details

### 3.1. Path Parameters

No path parameters required.

### 3.2. Query Parameters

#### GET /roles

| Name          | Type    | Required | Description                                     |
| ------------- | ------- | -------- | ----------------------------------------------- |
| includeActive | Boolean | No       | Include only active roles (default: true)       |
| sortBy        | String  | No       | Sort order: id, code, description (default: id) |
| format        | String  | No       | Response format: full, minimal (default: full)  |

### 3.3. Request Body

Not applicable - endpoint is GET request only.

## 4. Response Details

### 4.1. Success Response

#### GET /roles

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/roles",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "totalRoles": "integer"
  },
  "roles": [
    {
      "rls_id": "integer",
      "rls_code": "string",
      "rls_description": "string"
    }
  ],
  "summary": {
    "totalRoles": "integer",
    "activeRoles": "integer",
    "lastUpdated": "string (ISO datetime)"
  }
}
```

**Example Response:**

```json
{
  "metadata": {
    "endpoint": "/roles",
    "generatedAt": "2025-01-15T10:30:00Z",
    "requestedBy": "admin_user",
    "responseTime": 45,
    "totalRoles": 5
  },
  "roles": [
    {
      "rls_id": 1,
      "rls_code": "ADMIN",
      "rls_description": "System Administrator - Full access to all system functions"
    },
    {
      "rls_id": 2,
      "rls_code": "PILOT",
      "rls_description": "Migration Pilot - Lead migration execution and team coordination"
    },
    {
      "rls_id": 3,
      "rls_code": "USER",
      "rls_description": "Standard User - Basic migration participation and task execution"
    },
    {
      "rls_id": 4,
      "rls_code": "VIEWER",
      "rls_description": "Read-Only Viewer - View migration status and reports only"
    },
    {
      "rls_id": 5,
      "rls_code": "APPROVER",
      "rls_description": "Migration Approver - Approve migration plans and critical decisions"
    }
  ],
  "summary": {
    "totalRoles": 5,
    "activeRoles": 5,
    "lastUpdated": "2025-01-10T14:22:00Z"
  }
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema              | Example                                                                                               | Description                                     |
| ----------- | ---------------- | ------------------- | ----------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| 500         | application/json | {"error": "string"} | {"error": "Database error while retrieving roles", "details": "Connection timeout to roles database"} | Database connectivity or internal server errors |
| 503         | application/json | {"error": "string"} | {"error": "Roles service temporarily unavailable", "retryAfter": 30}                                  | Service temporarily unavailable                 |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication (groups: ["confluence-users"])
- **Permissions:** User must be member of confluence-users group

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (role definitions are system-level configuration data)
- **Input Validation:**
  - Query parameter validation for format and sorting options
  - SQL injection prevented via prepared statements and repository pattern
- **Other Security Considerations:**
  - Role information is non-sensitive configuration data
  - No user-specific data or permissions exposed
  - Standard authentication required for access

## 7. Business Logic & Side Effects

- **Key Logic:**
  - **Role Enumeration**: Retrieves all available roles from the roles_rls table
  - **Hierarchical Ordering**: Roles returned in ID order for consistent hierarchy representation
  - **Static Configuration**: Role definitions are relatively static system configuration
  - **RBAC Foundation**: Supports role-based access control across UMIG components

- **Side Effects:**
  - **Read-Only Operations**: No data modifications
  - **No Audit Trail**: Role retrieval does not create audit entries
  - **Cache-Friendly**: Role data suitable for caching due to infrequent changes

- **Idempotency:**
  - **Fully Idempotent**: Read-only operation with consistent results

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `roles_rls` (primary roles table with rls_id, rls_code, rls_description)

- **External APIs:** None
- **Other Services:**
  - AuthenticationService for user context validation
  - DatabaseUtil for connection management

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment

## 10. Testing & Mock Data

- **Unit Tests:** Role retrieval and data formatting tests
- **Integration Tests:** Database connectivity and role data integrity tests
- **E2E Tests:** Tested via admin interface and role assignment workflows
- **Mock Data/Fixtures:** Available via npm run generate-data:erase

## 11. Business Logic & Validation Rules

### Role Management

- Roles are system-level configuration defining user permission levels
- Role hierarchy: ADMIN > PILOT > APPROVER > USER > VIEWER
- Role codes are unique identifiers used throughout the system for permission checks
- Role descriptions provide human-readable explanations for administrative interfaces

### RBAC Integration

- Roles integrate with team membership for permission assignment
- Each user can have multiple roles across different teams and contexts
- Role definitions are centralized for consistency across all UMIG components
- Permission inheritance follows role hierarchy for streamlined access control

### Data Consistency

- Role data is relatively static and changes infrequently
- Role codes are used as foreign keys in user assignments and permission checks
- Role descriptions support internationalization and administrative customization
- System maintains referential integrity between roles and user assignments

## 12. Examples

### Get All Roles

```bash
curl -X GET "/rest/scriptrunner/latest/custom/roles" \
  -H "Authorization: Basic [credentials]"
```

### Get Roles with Specific Format

```bash
curl -X GET "/rest/scriptrunner/latest/custom/roles?format=minimal&sortBy=code" \
  -H "Authorization: Basic [credentials]"
```

### Get Active Roles Only

```bash
curl -X GET "/rest/scriptrunner/latest/custom/roles?includeActive=true&sortBy=description" \
  -H "Authorization: Basic [credentials]"
```

## 13. Notes

- **Simple Implementation**: Straightforward role enumeration endpoint with minimal complexity
- **RBAC Foundation**: Essential component for role-based access control throughout UMIG system
- **Administrative Support**: Primary use case is populating role selection interfaces and permission management
- **Cache-Friendly**: Role data changes infrequently making it suitable for caching strategies

## 14. Related APIs

- **Users API**: User management that assigns roles to users
- **Teams API**: Team management that may include role-based team membership
- **Step View API**: RBAC implementation that depends on role definitions for permission checks

## 15. Change Log

- **2025-01-XX:** Initial Roles API implementation for RBAC system foundation

---

> **Note:** Update this specification whenever the API changes. Reference this spec in code reviews and role management procedures.
