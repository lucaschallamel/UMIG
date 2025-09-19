# Team Members API Specification

> This specification defines the Team Members API for the UMIG project, providing comprehensive team membership management capabilities including association management, member queries, and relationship operations.

---

## 1. API Overview

- **API Name:** Team Members API
- **Purpose:** Manage team membership associations between teams and users, providing efficient querying and modification of team-user relationships
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-023 (API Standards and Error Handling), ADR-031 (Groovy Type Safety and Filtering Patterns)

## 2. Endpoints

| Method | Path                                        | Description                                      |
| ------ | ------------------------------------------- | ------------------------------------------------ |
| GET    | `/team-members`                             | Get all team memberships with optional filtering |
| GET    | `/team-members/team/{teamId}`               | Get all members for a specific team              |
| GET    | `/team-members/user/{userId}`               | Get all teams for a specific user                |
| PUT    | `/team-members/team/{teamId}/user/{userId}` | Add a user to a team                             |
| DELETE | `/team-members/team/{teamId}/user/{userId}` | Remove a user from a team                        |
| POST   | `/team-members/bulk-add`                    | Bulk add multiple users to teams                 |
| POST   | `/team-members/bulk-remove`                 | Bulk remove multiple users from teams            |

## 3. Request Details

### 3.1. Path Parameters

| Name   | Type    | Required | Description                                  |
| ------ | ------- | -------- | -------------------------------------------- |
| teamId | integer | Yes      | Team identifier for team-specific operations |
| userId | integer | Yes      | User identifier for user-specific operations |

### 3.2. Query Parameters

| Name   | Type    | Required | Description                                 |
| ------ | ------- | -------- | ------------------------------------------- |
| teamId | integer | No       | Filter memberships by team ID               |
| userId | integer | No       | Filter memberships by user ID               |
| active | boolean | No       | Filter by user active status (true/false)   |
| roleId | integer | No       | Filter users by role ID                     |
| search | string  | No       | Search users by name or email (min 2 chars) |

### 3.3. Request Body

#### PUT /team-members/team/{teamId}/user/{userId}

- **Content-Type:** application/json
- **Schema:**

```json
{
  "created_by": "string"
}
```

- **Example:**

```json
{
  "created_by": "admin_user"
}
```

#### POST /team-members/bulk-add

- **Content-Type:** application/json
- **Schema:**

```json
{
  "memberships": [
    {
      "teamId": "integer",
      "userId": "integer",
      "created_by": "string"
    }
  ]
}
```

- **Example:**

```json
{
  "memberships": [
    {
      "teamId": 1,
      "userId": 10,
      "created_by": "admin_user"
    },
    {
      "teamId": 1,
      "userId": 15,
      "created_by": "admin_user"
    }
  ]
}
```

#### POST /team-members/bulk-remove

- **Content-Type:** application/json
- **Schema:**

```json
{
  "memberships": [
    {
      "teamId": "integer",
      "userId": "integer"
    }
  ]
}
```

- **Example:**

```json
{
  "memberships": [
    {
      "teamId": 1,
      "userId": 10
    },
    {
      "teamId": 2,
      "userId": 15
    }
  ]
}
```

## 4. Response Details

### 4.1. Success Response

#### GET /team-members/team/{teamId}

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "usr_id": "integer",
    "usr_name": "string",
    "usr_email": "string",
    "usr_code": "string",
    "rls_id": "integer",
    "created_at": "timestamp",
    "created_by": "string"
  }
]
```

- **Example:**

```json
[
  {
    "usr_id": 10,
    "usr_name": "John Doe",
    "usr_email": "john.doe@company.com",
    "usr_code": "JDOE",
    "rls_id": 2,
    "created_at": "2025-07-15T10:30:00Z",
    "created_by": "admin_user"
  },
  {
    "usr_id": 15,
    "usr_name": "Jane Smith",
    "usr_email": "jane.smith@company.com",
    "usr_code": "JSMITH",
    "rls_id": 1,
    "created_at": "2025-07-15T11:00:00Z",
    "created_by": "admin_user"
  }
]
```

#### GET /team-members/user/{userId}

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "tms_id": "integer",
    "tms_name": "string",
    "tms_description": "string",
    "tms_email": "string",
    "created_at": "timestamp",
    "created_by": "string"
  }
]
```

- **Example:**

```json
[
  {
    "tms_id": 1,
    "tms_name": "IT_CUTOVER",
    "tms_description": "Team for IT Cutover activities",
    "tms_email": "it_cutover@umig.com",
    "created_at": "2025-07-15T10:30:00Z",
    "created_by": "admin_user"
  }
]
```

#### PUT /team-members/team/{teamId}/user/{userId}

- **Status Code:** 201 (Created) or 200 (Already exists)
- **Content-Type:** application/json
- **Schema:**

```json
{
  "message": "string",
  "status": "string"
}
```

- **Examples:**

```json
{
  "message": "User 10 added to team 1.",
  "status": "created"
}
```

```json
{
  "message": "User 10 is already a member of team 1.",
  "status": "exists"
}
```

#### DELETE /team-members/team/{teamId}/user/{userId}

- **Status Code:** 204 (No Content) or 404 (Not Found)
- **Content-Type:** application/json
- **Schema:**

```json
{
  "message": "string",
  "rowsAffected": "integer"
}
```

- **Example:**

```json
{
  "message": "User 10 removed from team 1.",
  "rowsAffected": 1
}
```

#### POST /team-members/bulk-add

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "summary": {
    "total": "integer",
    "created": "integer",
    "existing": "integer",
    "errors": "integer"
  },
  "details": [
    {
      "teamId": "integer",
      "userId": "integer",
      "status": "string",
      "message": "string"
    }
  ]
}
```

- **Example:**

```json
{
  "summary": {
    "total": 3,
    "created": 2,
    "existing": 1,
    "errors": 0
  },
  "details": [
    {
      "teamId": 1,
      "userId": 10,
      "status": "created",
      "message": "User 10 added to team 1."
    },
    {
      "teamId": 1,
      "userId": 15,
      "status": "exists",
      "message": "User 15 is already a member of team 1."
    }
  ]
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema              | Example                                            | Description               |
| ----------- | ---------------- | ------------------- | -------------------------------------------------- | ------------------------- |
| 400         | application/json | {"error": "string"} | {"error": "Invalid team ID format"}                | Invalid input parameters  |
| 404         | application/json | {"error": "string"} | {"error": "Team with ID 123 not found"}            | Team or user not found    |
| 409         | application/json | {"error": "string"} | {"error": "User is already a member of this team"} | Membership already exists |
| 500         | application/json | {"error": "string"} | {"error": "A database error occurred"}             | Internal server error     |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Basic Authentication
- **Permissions:** confluence-users, confluence-administrators

## 6. Rate Limiting & Security

- **Rate Limits:** None specified
- **RLS (Row-Level Security):** No
- **Input Validation:** Integer format validation, bulk operation limits (max 100 per request)
- **Other Security Considerations:** SQL injection prevention via parameterized queries

## 7. Business Logic & Side Effects

### 7.1. Key Logic

- **Association Management:** Creates/removes entries in `teams_tms_x_users_usr` junction table
- **Duplicate Prevention:** Checks for existing memberships before creation
- **Audit Trail:** Records `created_at` timestamp and `created_by` user for all additions
- **Bulk Operations:** Process multiple memberships in single transaction with rollback on any failure

### 7.2. Side Effects

- **Database State:** Modifications to team membership junction table
- **Cascading Effects:** Membership changes may affect team-based permissions and access
- **Audit Logs:** All membership changes are tracked with timestamps and user attribution

### 7.3. Idempotency

- **GET Operations:** Fully idempotent
- **PUT Operations:** Idempotent (adding existing membership returns success)
- **DELETE Operations:** Idempotent (removing non-existent membership returns success)
- **POST Operations:** Not idempotent (bulk operations create audit trail entries)

## 8. Dependencies & Backing Services

### 8.1. Database Tables/Entities

- **Primary:** `teams_tms_x_users_usr` (junction table for team-user relationships)
- **Foreign Keys:**
  - `teams_tms` (team entity validation)
  - `users_usr` (user entity validation)
- **Related:** `roles_rls` (user role information)

### 8.2. External Dependencies

- **DatabaseUtil:** Connection management and SQL execution
- **TeamMembersRepository:** Data access layer encapsulation
- **TeamRepository:** Team entity validation
- **UserRepository:** User entity validation

### 8.3. Other Services

- None specified

## 9. Integration with Other APIs

### 9.1. Teams API Integration

- **Relationship:** Team Members API complements Teams API (`/teams/{id}/members` endpoint)
- **Data Consistency:** Both APIs operate on the same underlying data structures
- **Usage Pattern:** Teams API provides team-centric view, Team Members API provides membership-centric operations

### 9.2. Users API Integration

- **Relationship:** User validation and lookup operations
- **Data Sharing:** User details (name, email, code, role) retrieved via Users API patterns
- **Consistency:** User active status and role changes reflected in membership queries

## 10. Versioning & Deprecation

- **API Version:** V2
- **Deprecation Policy:** Follow project deprecation guidelines
- **Backward Compatibility:** Maintains compatibility with existing Teams API membership endpoints

## 11. Testing & Mock Data

### 11.1. Unit Tests

- **Repository Tests:** TeamMembersRepository method validation
- **API Tests:** HTTP endpoint response validation
- **Error Handling:** Exception and error response testing

### 11.2. Integration Tests

- **Database Integration:** Full CRUD operation validation
- **Cross-API Testing:** Integration with Teams and Users APIs
- **Performance Testing:** Bulk operation efficiency testing

### 11.3. Mock Data/Fixtures

- **Test Data:** `fixture_team_members.csv` and `fixture_team_members_mapping.json`
- **Sample Data:** `sample_team_members.csv` and `sample_team_members_mapping.json`
- **Data Generation:** Synthetic membership data via local development generators

## 12. Performance Considerations

### 12.1. Query Optimization

- **Indexed Lookups:** Primary key and foreign key indexes on junction table
- **Batch Operations:** Bulk operations use single transaction for efficiency
- **Result Ordering:** Default ordering by user name for consistent results

### 12.2. Scalability

- **Pagination:** Built-in pagination support for large team membership lists
- **Filtering:** Database-level filtering to minimize data transfer
- **Caching:** Consider caching for frequently accessed team memberships

## 13. Changelog

### 2025-07-15

- **Change:** Initial API specification created
- **Author:** Claude AI Assistant (gendev-documentation-generator)
- **Details:** Comprehensive specification based on TeamMembersRepository implementation and UMIG API patterns

---

> **Note:** This API specification is based on the UMIG project patterns and the TeamMembersRepository implementation. The actual TeamMembersApi.groovy file should be implemented following these specifications and existing UMIG conventions. Update this specification whenever the API implementation changes.
