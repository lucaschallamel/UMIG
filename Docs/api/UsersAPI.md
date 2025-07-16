# Users API Specification

> This specification defines the Users API for the UMIG project, providing comprehensive user management capabilities including CRUD operations, pagination, filtering, and team membership management.

---

## 1. API Overview
- **API Name:** Users API
- **Purpose:** Manage user accounts, authentication, role assignments, and team memberships within the UMIG system
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-023 (API Standards and Error Handling), ADR-030 (Hierarchical Filtering Pattern), ADR-031 (Groovy Type Safety and Filtering Patterns)

## 2. Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET    | /users | Get all users with pagination, filtering, and sorting |
| POST   | /users | Create a new user |
| GET    | /users/{id} | Get a specific user by ID |
| PUT    | /users/{id} | Update an existing user |
| DELETE | /users/{id} | Delete a user |

## 3. Request Details

### 3.1. Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| id   | integer | Yes (for single user operations) | Unique user identifier |

### 3.2. Query Parameters (GET /users)

| Name | Type | Required | Description |
|------|------|----------|-------------|
| page | integer | No | Page number (1-based, default: 1) |
| size | integer | No | Number of items per page (1-500, default: 50) |
| search | string | No | Search term to filter users by name, email, or code (min 2 chars) |
| sort | string | No | Field to sort by (usr_id, usr_first_name, usr_last_name, usr_email, usr_code, usr_is_admin, usr_active, rls_id) |
| direction | string | No | Sort direction (asc, desc, default: asc) |
| teamId | integer | No | Filter users by team membership |
| userCode | string | No | Find user by exact code match (for authentication) |
| active | boolean | No | Filter users by active status (true for active, false for inactive) |

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
      "created_at": "timestamp",
      "updated_at": "timestamp",
      "teams": [
        {
          "tms_id": "integer",
          "tms_name": "string",
          "tms_description": "string",
          "tms_email": "string"
        }
      ]
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
- **Schema:** Same as individual user object above

#### POST /users
- **Status Code:** 201 Created
- **Content-Type:** application/json
- **Schema:** Same as individual user object above

#### PUT /users/{id}
- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:** Same as individual user object above

#### DELETE /users/{id}
- **Status Code:** 204 No Content
- **Body:** Empty

### 4.2. Error Responses

| Status Code | Content-Type | Schema | Example | Description |
|-------------|--------------|--------|---------|-------------|
| 400 | application/json | `{"error": "string"}` | `{"error": "Invalid User ID format."}` | Bad request - validation errors, invalid parameters |
| 404 | application/json | `{"error": "string"}` | `{"error": "User with ID 123 not found."}` | User not found |
| 409 | application/json | `{"error": "string", "details": "string", "sqlState": "string", "blocking_relationships": {}}` | `{"error": "A user with this email address already exists.", "details": "Duplicate value constraint violation", "sqlState": "23505"}` | Conflict - duplicate email/code or deletion blocked by relationships |
| 500 | application/json | `{"error": "string"}` | `{"error": "Database error occurred: connection timeout"}` | Internal server error |

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

## 11. Changelog
- **Date:** 2025-01-15
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