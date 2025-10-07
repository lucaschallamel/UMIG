# Users API Specification

> This specification defines the Users API for the UMIG project, providing comprehensive user management capabilities including CRUD operations, pagination, filtering, and team membership management.

---

## 1. API Overview

- **API Name:** Users API
- **Purpose:** Manage user accounts, authentication, role assignments, and team memberships within the UMIG system
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-023 (API Standards and Error Handling), ADR-030 (Hierarchical Filtering Pattern), ADR-031 (Groovy Type Safety and Filtering Patterns)

## 2. Endpoints

| Method | Path           | Description                                           |
| ------ | -------------- | ----------------------------------------------------- |
| GET    | /users         | Get all users with pagination, filtering, and sorting |
| POST   | /users         | Create a new user                                     |
| GET    | /users/{id}    | Get a specific user by ID                             |
| PUT    | /users/{id}    | Update an existing user                               |
| DELETE | /users/{id}    | Delete a user                                         |
| GET    | /users/current | Get current authenticated user                        |
| GET    | /user/context  | Get user context with role information                |

## 3. Request Details

### 3.1. Path Parameters

| Name | Type    | Required                         | Description            |
| ---- | ------- | -------------------------------- | ---------------------- |
| id   | integer | Yes (for single user operations) | Unique user identifier |

### 3.2. Query Parameters (GET /users)

| Name      | Type    | Required | Description                                                                                                     |
| --------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------- |
| page      | integer | No       | Page number (1-based, default: 1)                                                                               |
| size      | integer | No       | Number of items per page (1-500, default: 50)                                                                   |
| search    | string  | No       | Search term to filter users by name, email, or code (min 2 chars)                                               |
| sort      | string  | No       | Field to sort by (usr_id, usr_first_name, usr_last_name, usr_email, usr_code, usr_is_admin, usr_active, rls_id) |
| direction | string  | No       | Sort direction (asc, desc, default: asc)                                                                        |
| teamId    | integer | No       | Filter users by team membership                                                                                 |
| userCode  | string  | No       | Find user by exact code match (for authentication, returns debug info if not found)                             |
| active    | boolean | No       | Filter users by active status (true for active, false for inactive)                                             |

#### GET /users/current Query Parameters

| Name     | Type   | Required | Description                                                                          |
| -------- | ------ | -------- | ------------------------------------------------------------------------------------ |
| username | string | No       | Admin-only: Username to view another user's data (requires administrator privileges) |

#### GET /user/context Query Parameters

| Name     | Type   | Required | Description                      |
| -------- | ------ | -------- | -------------------------------- |
| username | string | Yes      | Username to retrieve context for |

### 3.3. Request Body

#### POST /users

- **Content-Type:** application/json
- **Schema:**

```json
{
  "usr_code": "string",
  "usr_first_name": "string",
  "usr_last_name": "string",
  "usr_email": "string",
  "usr_is_admin": "boolean",
  "usr_active": "boolean",
  "rls_id": "integer"
}
```

- **Required fields:** usr_first_name, usr_last_name, usr_is_admin
- **Example:**

```json
{
  "usr_code": "JDO",
  "usr_first_name": "John",
  "usr_last_name": "Doe",
  "usr_email": "john.doe@example.com",
  "usr_is_admin": false,
  "usr_active": true,
  "rls_id": 2
}
```

#### PUT /users/{id}

- **Content-Type:** application/json
- **Schema:** Same as POST (all fields optional)
- **Example:**

```json
{
  "usr_email": "john.doe.updated@example.com",
  "usr_active": false
}
```

## 4. Response Details

### 4.1. Success Response

#### GET /users (Paginated List)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "content": [
    {
      "usr_id": "integer",
      "usr_code": "string",
      "usr_first_name": "string",
      "usr_last_name": "string",
      "usr_email": "string",
      "usr_is_admin": "boolean",
      "usr_active": "boolean",
      "rls_id": "integer",
      "role_code": "string",
      "role_description": "string",
      "teams": [
        {
          "tms_id": "integer",
          "tms_name": "string",
          "tms_description": "string",
          "tms_email": "string"
        }
      ],
      "created_at": "timestamp",
      "created_by": "string",
      "updated_at": "timestamp",
      "updated_by": "string"
    }
  ],
  "totalElements": "integer",
  "totalPages": "integer",
  "pageNumber": "integer",
  "pageSize": "integer",
  "hasNext": "boolean",
  "hasPrevious": "boolean",
  "sortField": "string",
  "sortDirection": "string"
}
```

#### GET /users/{id} (Single User)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "usr_id": "integer",
  "usr_code": "string",
  "usr_first_name": "string",
  "usr_last_name": "string",
  "usr_email": "string",
  "usr_is_admin": "boolean",
  "usr_active": "boolean",
  "rls_id": "integer",
  "role_code": "string",
  "role_description": "string",
  "teams": [
    {
      "tms_id": "integer",
      "tms_name": "string",
      "tms_description": "string",
      "tms_email": "string"
    }
  ],
  "created_at": "timestamp",
  "created_by": "string",
  "updated_at": "timestamp",
  "updated_by": "string"
}
```

#### POST /users

- **Status Code:** 201 Created
- **Content-Type:** application/json
- **Schema:**

```json
{
  "usr_id": "integer",
  "usr_code": "string",
  "usr_first_name": "string",
  "usr_last_name": "string",
  "usr_email": "string",
  "usr_is_admin": "boolean",
  "usr_active": "boolean",
  "rls_id": "integer",
  "role_code": "string",
  "role_description": "string",
  "teams": [],
  "created_at": "timestamp",
  "created_by": "string",
  "updated_at": "timestamp",
  "updated_by": "string"
}
```

#### PUT /users/{id}

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "usr_id": "integer",
  "usr_code": "string",
  "usr_first_name": "string",
  "usr_last_name": "string",
  "usr_email": "string",
  "usr_is_admin": "boolean",
  "usr_active": "boolean",
  "rls_id": "integer",
  "role_code": "string",
  "role_description": "string",
  "teams": [
    {
      "tms_id": "integer",
      "tms_name": "string",
      "tms_description": "string",
      "tms_email": "string"
    }
  ],
  "created_at": "timestamp",
  "created_by": "string",
  "updated_at": "timestamp",
  "updated_by": "string"
}
```

#### DELETE /users/{id}

- **Status Code:** 204 No Content
- **Body:** Empty

#### GET /users/current (Current Authenticated User)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "userId": "integer",
  "username": "string",
  "confluenceUserId": "string",
  "confluenceContextUsername": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "isAdmin": "boolean",
  "roleId": "integer",
  "role": "string",
  "isActive": "boolean",
  "source": "string"
}
```

- **Example (Standard User Request):**

```json
{
  "userId": 1001,
  "username": "JDO",
  "confluenceUserId": "jdoe",
  "confluenceContextUsername": "jdoe",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "isAdmin": false,
  "roleId": 2,
  "role": "NORMAL",
  "isActive": true,
  "source": "current_user_endpoint"
}
```

- **Example (Admin Cross-User Query):**

```bash
# Admin viewing another user's data
GET /users/current?username=MSmith
```

```json
{
  "userId": 1002,
  "username": "MSmith",
  "confluenceUserId": "msmith",
  "confluenceContextUsername": "admin",
  "firstName": "Mary",
  "lastName": "Smith",
  "email": "mary.smith@example.com",
  "isAdmin": false,
  "roleId": 2,
  "role": "NORMAL",
  "isActive": true,
  "source": "current_user_endpoint"
}
```

#### GET /user/context

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "userId": "integer",
  "username": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "isAdmin": "boolean",
  "roleId": "integer",
  "role": "string",
  "isActive": "boolean"
}
```

- **Example:**

```json
{
  "userId": 1001,
  "username": "JDO",
  "firstName": "John",
  "lastName": "Doe",
  "email": "john.doe@example.com",
  "isAdmin": false,
  "roleId": 2,
  "role": "NORMAL",
  "isActive": true
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema                                                                                         | Example                                                                                                                               | Description                                                          |
| ----------- | ---------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| 400         | application/json | `{"error": "string"}`                                                                          | `{"error": "Invalid User ID format."}`                                                                                                | Bad request - validation errors, invalid parameters                  |
| 401         | application/json | `{"error": "string", "errorCode": "string", "message": "string"}`                              | `{"error": "Authentication Required", "errorCode": "SESSION_INVALID"}`                                                                | Authentication failed - no valid session (GET /users/current)        |
| 403         | application/json | `{"error": "string", "errorCode": "string", "message": "string"}`                              | `{"error": "Access Denied", "errorCode": "USER_NOT_REGISTERED"}`                                                                      | User authenticated but not registered in UMIG (GET /users/current)   |
| 403         | application/json | `{"error": "string", "errorCode": "string", "message": "string"}`                              | `{"error": "Access Denied", "errorCode": "USER_DEACTIVATED"}`                                                                         | User exists but account is deactivated (GET /users/current)          |
| 403         | application/json | `{"error": "string", "errorCode": "string", "message": "string"}`                              | `{"error": "Access Denied", "errorCode": "INSUFFICIENT_PRIVILEGES_CROSS_USER"}`                                                       | Non-admin attempted cross-user query (GET /users/current)            |
| 404         | application/json | `{"error": "string"}`                                                                          | `{"error": "User with ID 123 not found."}`                                                                                            | User not found                                                       |
| 409         | application/json | `{"error": "string", "details": "string", "sqlState": "string", "blocking_relationships": {}}` | `{"error": "A user with this email address already exists.", "details": "Duplicate value constraint violation", "sqlState": "23505"}` | Conflict - duplicate email/code or deletion blocked by relationships |
| 500         | application/json | `{"error": "string"}`                                                                          | `{"error": "Database error occurred: connection timeout"}`                                                                            | Internal server error                                                |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence user authentication (ScriptRunner groups)
- **Permissions:** `confluence-users` or `confluence-administrators` groups

## 6. Rate Limiting & Security

- **Rate Limits:** Inherits from Confluence/ScriptRunner settings
- **RLS (Row-Level Security):** No (handled at application level)
- **Input Validation:**
  - Email format validation
  - Required field validation
  - Type checking for all parameters
  - Search term minimum length (2 characters)
  - Page size maximum (500 records)
- **Other Security Considerations:**
  - SQL injection prevention through parameterized queries
  - Team membership cannot be set directly (must use Teams API)

## 7. Business Logic & Side Effects

- **Key Logic:**
  - User codes are automatically generated if not provided
  - usr_active defaults to true if not specified
  - Team memberships are preserved during updates
  - Pagination is 1-based (page 1 is the first page)
- **Side Effects:**
  - Creating/updating users triggers database timestamp updates
  - Deleting users removes all team memberships
- **Idempotency:** GET and DELETE are idempotent; POST is not; PUT is idempotent

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `users_usr` (primary table)
  - `teams_tms_x_users_usr` (team membership junction table)
  - `teams_tms` (for team details in responses)
  - `roles_rls` (for role validation)
- **External APIs:** None
- **Other Services:** UserRepository (Groovy class)

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** No deprecated endpoints currently

## 10. Testing & Mock Data

- **Unit Tests:** `src/groovy/umig/tests/apis/UsersApiUnitTest.groovy` (planned)
- **Integration Tests:** Via Postman collection
- **E2E Tests:** Manual testing through Admin GUI
- **Mock Data/Fixtures:** Generated via `local-dev-setup/scripts/generators/005_generate_users.js`

## 11. User Context and Role Management

### Role ID Mapping

The system supports three user roles:

| Role ID | Role Code | Description                           |
| ------- | --------- | ------------------------------------- |
| 1       | ADMIN     | Administrator with full system access |
| 2       | NORMAL    | Standard user access                  |
| 3       | PILOT     | Pilot user with execution privileges  |

### Authentication Support

The `/users` endpoint supports authentication queries via the `userCode` parameter:

**Example Request:**

```bash
GET /users?userCode=JDO
```

**Success Response:**

```json
[
  {
    "usr_id": 1001,
    "usr_code": "JDO",
    "usr_first_name": "John",
    "usr_last_name": "Doe",
    "usr_email": "john.doe@example.com",
    "usr_is_admin": false,
    "usr_active": true,
    "rls_id": 2,
    "role_code": "NORMAL",
    "role_description": "Standard User Role",
    "teams": [],
    "created_at": "2025-09-21T10:30:00Z",
    "created_by": "admin",
    "updated_at": "2025-09-21T10:30:00Z",
    "updated_by": "admin"
  }
]
```

**Not Found Response (with Debug Info):**

```json
{
  "error": "User with code INVALID not found.",
  "debug": "Available active user codes: JDO, MSmith, SJones, DBAdmin"
}
```

### Enhanced Error Messages

The API provides detailed constraint violation messages:

**Email Duplicate (409 Conflict):**

```json
{
  "error": "A user with this email address already exists.",
  "details": "Duplicate value constraint violation",
  "sqlState": "23505"
}
```

**Missing Required Field (400 Bad Request):**

```json
{
  "error": "Missing required field: First Name (usr_first_name)",
  "details": "Database constraint violation - field cannot be null",
  "sqlState": "23502"
}
```

**Foreign Key Violation (400 Bad Request):**

```json
{
  "error": "Invalid reference - the specified role or team does not exist.",
  "details": "Foreign key constraint violation",
  "sqlState": "23503"
}
```

## 12. Enhanced Role and Audit Information

### Role Fields in All Responses

All user endpoints now include comprehensive role information in their responses:

- **`role_code`**: The role code (ADMIN, NORMAL, PILOT)
- **`role_description`**: Human-readable role description
- **`rls_id`**: Numeric role identifier

**Example role mappings:**

| rls_id | role_code | role_description   |
| ------ | --------- | ------------------ |
| 1      | ADMIN     | Administrator Role |
| 2      | NORMAL    | Standard User Role |
| 3      | PILOT     | Pilot User Role    |

### Audit Trail Fields

All user responses include comprehensive audit information:

- **`created_at`**: ISO 8601 timestamp of user creation
- **`created_by`**: Username of the user who created this record
- **`updated_at`**: ISO 8601 timestamp of last update
- **`updated_by`**: Username of the user who last updated this record

### Consistency Across Endpoints

**Important**: Both the paginated list endpoint (`GET /users`) and individual user endpoint (`GET /users/{id}`) now return identical field structures, including role information and audit trails. This ensures consistent data presentation across all user operations.

## 13. GET /users/current Endpoint Details

### 13.1. Endpoint Purpose

The `/users/current` endpoint provides secure access to the currently authenticated user's profile with enhanced authentication validation and optional cross-user viewing for administrators. This endpoint implements the enhanced dual authentication mechanism from ADR-042.

### 13.2. Authentication Mechanism

- **Primary Authentication**: Uses `UserService.getCurrentUserContext()` which leverages:
  - `AuthenticatedUserThreadLocal` (primary)
  - Confluence SAL UserManager (fallback)
- **Session Validation**: Verifies active Confluence session before processing
- **Admin Cross-User Query**: Allows administrators to view other users' data via `?username` parameter

### 13.3. Response Fields

| Field                     | Type    | Description                                           |
| ------------------------- | ------- | ----------------------------------------------------- |
| userId                    | integer | UMIG database user ID                                 |
| username                  | string  | User's UMIG username (usr_code)                       |
| confluenceUserId          | string  | Confluence user identifier                            |
| confluenceContextUsername | string  | Authenticated user's Confluence username from context |
| firstName                 | string  | User's first name                                     |
| lastName                  | string  | User's last name                                      |
| email                     | string  | User's email address                                  |
| isAdmin                   | boolean | Administrator flag                                    |
| roleId                    | integer | User's role ID                                        |
| role                      | string  | User's role code (ADMIN, NORMAL, PILOT, or USER)      |
| isActive                  | boolean | User active status                                    |
| source                    | string  | Always "current_user_endpoint" for this endpoint      |

### 13.4. Security Scenarios

The endpoint implements four distinct security scenarios:

#### Scenario 1: User Not Registered (403 Forbidden)

- **Condition**: User authenticated in Confluence but not found in UMIG database
- **Error Code**: `USER_NOT_REGISTERED`
- **Response**: Detailed troubleshooting guidance and admin contact information

#### Scenario 2: Authentication Failed (401 Unauthorized)

- **Condition**: No valid Confluence session or authentication verification failed
- **Error Code**: `SESSION_INVALID`
- **Response**: Session validation guidance and troubleshooting steps

#### Scenario 3: User Deactivated (403 Forbidden)

- **Condition**: User exists in UMIG but account is deactivated
- **Error Code**: `USER_DEACTIVATED`
- **Response**: Account status information and reactivation guidance

#### Scenario 4: Insufficient Privileges for Cross-User Query (403 Forbidden)

- **Condition**: Non-admin user attempts to view another user's data via `?username` parameter
- **Error Code**: `INSUFFICIENT_PRIVILEGES_CROSS_USER`
- **Response**: Privilege requirement explanation

### 13.5. Admin Cross-User Query Feature

Administrators can view other users' data by providing the `username` query parameter:

```bash
GET /users/current?username=targetuser
```

**Validation Process**:

1. Verify authenticated user has admin privileges
2. Validate target username exists in UMIG
3. Return target user's data with `confluenceContextUsername` showing admin's username

### 13.6. Usage Examples

**Standard User Request**:

```bash
GET /users/current
```

**Admin Cross-User Query**:

```bash
GET /users/current?username=MSmith
```

**Error Response - User Not Registered**:

```json
{
  "error": "Access Denied",
  "errorCode": "USER_NOT_REGISTERED",
  "message": "User 'jdoe' is authenticated in Confluence but not registered in UMIG",
  "details": {
    "confluenceUsername": "jdoe",
    "isAuthenticated": true,
    "isRegisteredInUmig": false,
    "requiredAction": "Contact your administrator to create a UMIG user account"
  },
  "troubleshooting": [
    "Verify user is registered in UMIG database (users_usr table)",
    "Contact administrator to create user account",
    "Check if auto-user-creation is enabled in UserService configuration",
    "Run SQL query: SELECT * FROM users_usr WHERE LOWER(usr_code) = LOWER('jdoe') OR LOWER(usr_confluence_user_id) = LOWER('jdoe')"
  ],
  "links": {
    "documentation": "/wiki/display/UMIG/User+Registration",
    "support": "/wiki/display/UMIG/Contact+Administrator"
  }
}
```

## 14. Changelog

### Version 2.3.0 (October 7, 2025)

- **New Endpoint**: Added `GET /users/current` for authenticated user profile retrieval
- **Enhanced Security**: Implemented four-scenario security model with detailed error codes
- **Admin Features**: Added cross-user query capability for administrators
- **Dual Authentication**: Integrated ADR-042 enhanced authentication mechanism
- **Comprehensive Error Handling**: Added detailed troubleshooting guidance for all failure scenarios

### Version 2.2.0 (September 21, 2025)

- **Enhanced Role Information**: Added `role_code` and `role_description` fields to all user responses
- **Comprehensive Audit Fields**: Added `created_at`, `created_by`, `updated_at`, `updated_by` to all responses
- **Pagination Consistency**: Fixed pagination endpoint to return complete role information matching individual user endpoints
- **Field Standardization**: Ensured all endpoints return consistent field structures for better API usability

### Version 2.1.0 (August 25, 2025)

- **Added User Context Endpoint**: New `/user/context` endpoint for retrieving user context with role information
- **Enhanced Authentication Support**: Added `userCode` query parameter with debug information for authentication lookups
- **Improved Error Handling**: More detailed error messages with SQL state codes and constraint-specific information
- **Role Management**: Clear role ID to role code mapping (ADMIN, NORMAL, PILOT)
- **Better Debugging**: Not found responses include available user codes for troubleshooting

### Version 2.0.0 (January 15, 2025)

- **Change:** Initial API specification created
- **Author:** Claude (AI Assistant)

---

> **Note:** Update this specification whenever the API changes. Reference this spec in code reviews and ADRs.

## Additional Implementation Notes

### Type Safety Patterns (ADR-031)

The Users API implements comprehensive type safety patterns:

- Explicit casting for all query parameters (`as String`, `as Integer`)
- Null checks before type conversion
- Defensive programming for numeric parameters

### Error Message Details

The API provides detailed error messages for constraint violations:

- **23505 (unique_violation)**: Identifies which field (email or code) is duplicated
- **23502 (not_null_violation)**: Identifies which required field is missing
- **23503 (foreign_key_violation)**: Generic message for invalid role references

### Pagination Implementation

- Uses offset-based pagination
- Calculates total pages using ceiling division: `(totalCount + pageSize - 1) / pageSize`
- Provides navigation hints with `hasNext` and `hasPrevious` flags

### Search Functionality

- Case-insensitive search using PostgreSQL ILIKE
- Searches across: first name, last name, email, and user code
- Minimum 2-character search term to prevent overly broad queries
