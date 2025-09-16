# Teams API Specification

> Comprehensive CRUD API for managing teams with hierarchical filtering, advanced pagination, and full lifecycle management of team data including member and application associations.

---

## 1. API Overview

- **API Name:** Teams API v2
- **Purpose:** Complete lifecycle management of teams including creation, retrieval, updating, and deletion. Features hierarchical filtering across migration execution hierarchy, advanced pagination with Admin GUI support, and comprehensive association management for users and applications.
- **Owner:** UMIG Development Team
- **Performance SLA:** <120ms response time, <180ms for paginated requests
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-031 (Type Safety), ADR-039 (Error Handling), ADR-042 (Authentication Context)

## 2. Endpoints

| Method | Path                                                  | Description                                          | Rate Limit\* |
| ------ | ----------------------------------------------------- | ---------------------------------------------------- | ------------ |
| GET    | `/api/v2/teams`                                       | Get all teams with hierarchical filtering/pagination | Standard     |
| GET    | `/api/v2/teams/{id}`                                  | Get a specific team by ID                            | Standard     |
| GET    | `/api/v2/teams/{id}/members`                          | Get all members of a team                            | Standard     |
| GET    | `/api/v2/teams/{id}/applications`                     | Get all applications associated with a team          | Standard     |
| POST   | `/api/v2/teams`                                       | Create a new team                                    | Standard     |
| PUT    | `/api/v2/teams/{id}`                                  | Update an existing team                              | Standard     |
| DELETE | `/api/v2/teams/{id}`                                  | Delete a team                                        | Standard     |
| PUT    | `/api/v2/teams/{teamId}/users/{userId}`               | Add user to team                                     | Standard     |
| DELETE | `/api/v2/teams/{teamId}/users/{userId}`               | Remove user from team                                | Standard     |
| PUT    | `/api/v2/teams/{teamId}/applications/{applicationId}` | Add application to team                              | Standard     |
| DELETE | `/api/v2/teams/{teamId}/applications/{applicationId}` | Remove application from team                         | Standard     |

\*Standard rate limits apply as per ScriptRunner configuration

## 3. Request Details

### 3.1. Path Parameters

| Name          | Type    | Required | Description                                       |
| ------------- | ------- | -------- | ------------------------------------------------- |
| id            | integer | Yes      | Team identifier                                   |
| teamId        | integer | Yes      | Team identifier for membership operations         |
| userId        | integer | Yes      | User identifier for membership operations         |
| applicationId | integer | Yes      | Application identifier for association operations |

### 3.2. Query Parameters

#### Hierarchical Filtering Parameters

| Name        | Type | Required | Description                          |
| ----------- | ---- | -------- | ------------------------------------ |
| migrationId | UUID | No       | Filter teams by migration ID         |
| iterationId | UUID | No       | Filter teams by iteration ID         |
| planId      | UUID | No       | Filter teams by plan instance ID     |
| sequenceId  | UUID | No       | Filter teams by sequence instance ID |
| phaseId     | UUID | No       | Filter teams by phase instance ID    |

#### Pagination & Search Parameters (Admin GUI)

| Name      | Type    | Required | Description                                      |
| --------- | ------- | -------- | ------------------------------------------------ |
| page      | integer | No       | Page number for pagination (1-based, minimum: 1) |
| size      | integer | No       | Page size (1-200, default: 50)                   |
| search    | string  | No       | Search term (minimum 2 characters)               |
| sort      | string  | No       | Sort field (see allowed fields below)            |
| direction | string  | No       | Sort direction: 'asc' or 'desc' (default: 'asc') |

**Allowed Sort Fields:**
`tms_id`, `tms_name`, `tms_description`, `tms_email`, `member_count`, `application_count`

### 3.3. Request Body

- **Content-Type:** application/json
- **Schema:** (For POST/PUT operations)

```json
{
  "tms_name": "string",
  "tms_description": "string",
  "tms_email": "string"
}
```

- **Example:**

```json
{
  "tms_name": "DevOps Team",
  "tms_description": "Infrastructure and deployment team",
  "tms_email": "devops@company.com"
}
```

## 4. Response Details

### 4.1. Success Responses

#### GET /teams (Simple Array Response)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "tms_id": "integer",
    "tms_name": "string",
    "tms_description": "string",
    "tms_email": "string",
    "member_count": "integer (when available)",
    "application_count": "integer (when available)"
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
    "member_count": 5,
    "application_count": 3
  }
]
```

#### GET /teams (Paginated Response)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "data": [
    {
      "tms_id": "integer",
      "tms_name": "string",
      "tms_description": "string",
      "tms_email": "string",
      "member_count": "integer",
      "application_count": "integer"
    }
  ],
  "pagination": {
    "page": "integer",
    "size": "integer",
    "total": "integer",
    "totalPages": "integer",
    "hasNext": "boolean",
    "hasPrevious": "boolean"
  },
  "sort": {
    "field": "string",
    "direction": "string"
  }
}
```

#### GET /teams/{id}

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "tms_id": "integer",
  "tms_name": "string",
  "tms_description": "string",
  "tms_email": "string",
  "members": [
    {
      "usr_id": "integer",
      "usr_name": "string",
      "usr_email": "string"
    }
  ],
  "applications": [
    {
      "app_id": "integer",
      "app_name": "string"
    }
  ]
}
```

#### POST /teams

- **Status Code:** 201 Created
- **Content-Type:** application/json
- **Schema:** Created team object with full details

#### PUT /teams/{id}

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:** Updated team object with full details

#### DELETE Operations & Association Operations

- **Status Code:** 204 No Content
- **Content-Type:** None
- **Schema:** Empty response body

### 4.2. Error Responses

| Status Code | Content-Type     | Schema                                              | Example                                                       | Description                                   |
| ----------- | ---------------- | --------------------------------------------------- | ------------------------------------------------------------- | --------------------------------------------- |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "Invalid migration ID format"}`                    | Invalid UUID format                           |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "Invalid page number format"}`                     | Invalid pagination parameters                 |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "tms_name is required"}`                           | Missing required fields                       |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "Invalid email format"}`                           | Invalid email format                          |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "Invalid JSON in request body"}`                   | Malformed JSON                                |
| 404         | application/json | `{"error": "string"}`                               | `{"error": "Team with ID 123 not found"}`                     | Team not found                                |
| 409         | application/json | `{"error": "string"}`                               | `{"error": "A team with this email already exists"}`          | Email conflict                                |
| 409         | application/json | `{"error": "string"}`                               | `{"error": "Association already exists"}`                     | Duplicate association                         |
| 409         | application/json | `{"error": "string", "blocking_relationships": {}}` | Complex blocking relationship error (similar to environments) | Conflict - cannot delete due to relationships |
| 500         | application/json | `{"error": "string"}`                               | `{"error": "Database error occurred"}`                        | Database connection failure                   |
| 500         | application/json | `{"error": "string"}`                               | `{"error": "An unexpected error occurred"}`                   | Unexpected system error                       |
| 401         | application/json | Confluence standard error response                  | Confluence authentication error                               | Authentication required                       |
| 403         | application/json | Confluence standard error response                  | Confluence authorization error                                | Insufficient permissions                      |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication
- **Permissions:**
  - **Read Operations (GET):** `confluence-users` OR `confluence-administrators`
  - **Write Operations (POST/PUT/DELETE):** `confluence-administrators` ONLY
- **User Context:** Automatically captured for audit trails

## 6. Rate Limiting & Security

### 6.1. Rate Limiting

- **Rate Limits:** Standard ScriptRunner rate limiting configuration
- **Implementation:** Built-in ScriptRunner throttling mechanisms
- **Monitoring:** Automatic rate limit monitoring and enforcement

### 6.2. Security Features

- **Input Validation:**
  - UUID format validation for all hierarchical filter parameters
  - Integer format validation for team, user, and application IDs
  - Email format validation for team email addresses
  - String length limits and content validation
  - SQL injection prevention via prepared statements
  - Type casting validation (ADR-031)
- **Data Protection:**
  - User context captured for all operations
  - Comprehensive error handling without information leakage
  - Blocking relationship validation prevents data corruption
- **Access Control:**
  - Confluence group-based authorization
  - Write operations restricted to administrators
  - User context preservation for audit trails
- **Other Security Considerations:**
  - Hierarchical filtering uses secure instance→master relationships
  - Association operations validate entity existence before modification
  - Comprehensive audit logging for all operations

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Hierarchical filtering uses instance→master table relationships
  - Teams filtered by step assignments through `steps_master_stm_x_teams_tms_impacted`
  - Progressive filtering: fewer teams returned at deeper hierarchy levels
  - Supports both simple array and paginated responses based on query parameters
  - Dynamic sorting across all team fields with Admin GUI integration
  - Search functionality with minimum 2-character requirement
  - Maximum page size limit of 200 for performance optimization
  - Comprehensive relationship validation before deletions
- **Side Effects:**
  - GET: No state changes, may update cache or access logs
  - POST: Creates new team record with audit trail
  - PUT: Updates existing team record with audit trail
  - DELETE: Removes team record after relationship validation
  - Association operations: Create/remove junction table entries
- **Idempotency:**
  - GET: Yes (no state changes)
  - POST: No (creates new resources)
  - PUT: Yes (repeatable updates)
  - DELETE: Yes (repeatable deletion)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `teams_tms` (primary table)
    - `tms_id` (SERIAL, primary key)
    - `tms_name` (VARCHAR, team name)
    - `tms_description` (TEXT, team description)
    - `tms_email` (VARCHAR, team email)
  - `teams_tms_x_users_usr` (team-user associations)
  - `teams_tms_x_applications_app` (team-application associations)
  - `steps_master_stm_x_teams_tms_impacted` (team-step relationships)
  - Hierarchy tables: `steps_master_stm`, `phases_master_phm`, `sequences_master_sqm`, `plans_master_plm`
  - Instance tables: `plans_instance_pli`, `sequences_instance_sqi`, `phases_instance_phi`
  - Top-level: `iterations_ite`, `migrations_mig`

- **External APIs:** None
- **Other Services:**
  - TeamRepository for data access operations with hierarchical filtering
  - UserRepository for member association operations
  - DatabaseUtil for connection management with connection pooling
  - UserService for authentication context (ADR-042)
  - JsonBuilder for JSON response serialization
  - Log4j for operation logging

## 9. Versioning & Deprecation

- **API Version:** V2
- **Deprecation Policy:** Follow project deprecation guidelines

## 10. Testing & Mock Data

- **Unit Tests:** Repository tests cover hierarchical filtering and pagination operations
- **Integration Tests:** Full CRUD operations tested including association management
- **E2E Tests:** Tested via Admin GUI and hierarchical filtering scenarios
- **Performance Tests:** Pagination and search performance validated
- **Mock Data/Fixtures:** Available via npm run generate-data:erase

## 11. Business Logic & Validation Rules

### Hierarchical Filtering Logic

- **Migration Level:** Returns teams involved in any step within the migration
- **Iteration Level:** Returns teams involved in steps within specific iteration
- **Plan Level:** Returns teams involved in steps within plan instance
- **Sequence Level:** Returns teams involved in steps within sequence instance
- **Phase Level:** Returns teams involved in steps within phase instance
- **Progressive Filtering:** Each level returns subset of previous level

### Pagination & Search Rules

- **Pagination:** Triggered by presence of page, size, sort, or direction parameters
- **Search:** Searches across team name, description, and email fields
- **Sorting:** Default sort by tms_id ascending
- **Limits:** Maximum page size of 200, minimum search length of 2 characters

### Association Management Rules

- **User Associations:** Validates user exists before adding to team
- **Application Associations:** Validates application exists before association
- **Duplicate Prevention:** Prevents duplicate associations
- **Cascade Rules:** Team deletion removes all associations

## 12. Performance Characteristics

- **Response Times:**
  - Simple GET requests: <80ms typical
  - Hierarchical filtering: <120ms typical
  - Paginated requests: <150ms typical
  - Association operations: <100ms typical
- **Throughput:**
  - Standard ScriptRunner rate limits apply
  - Concurrent request support
  - Efficient database query optimization
- **Resource Usage:**
  - Memory: Efficient with proper connection pooling
  - Database: Optimized queries with proper indexing
  - Network: Minimal payload sizes (<3KB typical)

## 13. Examples

### Get Teams with Hierarchical Filtering

```bash
curl -X GET "/rest/scriptrunner/latest/custom/teams?migrationId=550e8400-e29b-41d4-a716-446655440000" \
  -H "Content-Type: application/json"
```

### Get Teams with Pagination

```bash
curl -X GET "/rest/scriptrunner/latest/custom/teams?page=1&size=10&sort=tms_name&direction=asc" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "tms_id": 1,
      "tms_name": "DevOps Team",
      "tms_description": "Infrastructure and deployment team",
      "tms_email": "devops@company.com",
      "member_count": 5,
      "application_count": 3
    }
  ],
  "pagination": {
    "page": 1,
    "size": 10,
    "total": 1,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "sort": {
    "field": "tms_name",
    "direction": "asc"
  }
}
```

### Create New Team

```bash
curl -X POST /rest/scriptrunner/latest/custom/teams \
  -H "Content-Type: application/json" \
  -d '{
    "tms_name": "Security Team",
    "tms_description": "Information security and compliance team",
    "tms_email": "security@company.com"
  }'
```

### Add User to Team

```bash
curl -X PUT /rest/scriptrunner/latest/custom/teams/1/users/5 \
  -H "Content-Type: application/json"
```

### Search Teams

```bash
curl -X GET "/rest/scriptrunner/latest/custom/teams?search=dev&page=1&size=5" \
  -H "Content-Type: application/json"
```

## 14. Notes

- **Hierarchical Filtering:**
  - Uses sophisticated instance→master table relationships
  - Progressively filters teams based on step assignments
  - Critical for migration workflow team identification
- **Admin GUI Integration:**
  - Supports pagination, sorting, and search for management interface
  - Provides member and application counts for overview displays
  - Efficient data loading with proper pagination
- **Association Management:**
  - Flexible user and application association capabilities
  - Proper validation prevents orphaned associations
  - Critical for migration execution team assignments

## 15. Related APIs

- **Users API:** Referenced in team-user associations
- **Applications API:** Referenced in team-application associations
- **Steps API:** References teams via impacted teams relationships
- **Migrations/Iterations APIs:** Used for hierarchical filtering
- **Admin GUI APIs:** Primary consumer for team management interface

## 16. Changelog

- **2025-09-16:** Complete documentation rewrite with pagination, performance characteristics, and comprehensive API coverage
- **2025-09-15:** Added Admin GUI pagination support and enhanced association management
- **2025-07-09:** Added hierarchical filtering query parameters (migrationId, iterationId, planId, sequenceId, phaseId)
- **2025-07-09:** Fixed field mapping issue (tms_id→id, tms_name→name) and corrected instance→master table relationships
- **2025-01-15:** Updated specification to use correct database field names (tms_id, tms_name, tms_description, tms_email) and integer IDs instead of UUIDs

---

> **Note:** This API provides comprehensive team management with sophisticated hierarchical filtering critical for migration workflows. All changes should be tested across consuming applications, particularly the Admin GUI components and migration execution systems.
