# Environments API Specification

> Enterprise-grade CRUD API for managing environments with advanced security features, comprehensive rate limiting, and full lifecycle management of environment data with associations to applications and iterations.

---

## 1. API Overview

- **API Name:** Environments API v2
- **Purpose:** Complete lifecycle management of environments including creation, retrieval, updating, and deletion. Features enterprise-grade security with sophisticated rate limiting, advanced pagination, and comprehensive associations management for applications and iterations.
- **Owner:** UMIG Development Team
- **Security Rating:** 9.2/10 (Enterprise-grade with advanced rate limiting and client blocking)
- **Performance SLA:** <150ms response time, <200ms for paginated requests
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-031 (Type Safety), ADR-039 (Error Handling), ADR-042 (Authentication Context)

## 2. Endpoints

| Method | Path                                           | Description                                       | Rate Limit       |
| ------ | ---------------------------------------------- | ------------------------------------------------- | ---------------- |
| GET    | /api/v2/environments                           | Retrieve all environments with pagination/sorting | 60/min, 600/hour |
| GET    | /api/v2/environments/roles                     | Retrieve all available environment roles          | 60/min, 600/hour |
| GET    | /api/v2/environments/{id}                      | Retrieve specific environment with full details   | 60/min, 600/hour |
| GET    | /api/v2/environments/{id}/iterations           | Retrieve environment iterations grouped by role   | 60/min, 600/hour |
| POST   | /api/v2/environments                           | Create a new environment                          | 30/min, 300/hour |
| POST   | /api/v2/environments/{id}/applications/{appId} | Associate application with environment            | 30/min, 300/hour |
| POST   | /api/v2/environments/{id}/iterations/{iteId}   | Associate iteration with environment (with role)  | 30/min, 300/hour |
| PUT    | /api/v2/environments/{id}                      | Update an existing environment                    | 30/min, 300/hour |
| DELETE | /api/v2/environments/{id}                      | Delete environment (with relationship checks)     | 30/min, 300/hour |
| DELETE | /api/v2/environments/{id}/applications/{appId} | Remove application association                    | 30/min, 300/hour |
| DELETE | /api/v2/environments/{id}/iterations/{iteId}   | Remove iteration association                      | 30/min, 300/hour |

## 3. Request Details

### 3.1. Path Parameters

| Name  | Type    | Required | Description                                                 |
| ----- | ------- | -------- | ----------------------------------------------------------- |
| id    | integer | Yes\*    | The environment ID (for GET/{id}, PUT, DELETE operations)   |
| appId | integer | Yes\*    | The application ID (for application association operations) |
| iteId | UUID    | Yes\*    | The iteration ID (for iteration association operations)     |

\*Required only for specific operations as indicated in endpoint paths

### 3.2. Query Parameters (GET /environments)

| Name      | Type    | Required | Description                                      |
| --------- | ------- | -------- | ------------------------------------------------ |
| page      | integer | No       | Page number for pagination (1-based, minimum: 1) |
| size      | integer | No       | Page size (1-200, default: 50)                   |
| search    | string  | No       | Search term (minimum 2 characters)               |
| sort      | string  | No       | Sort field (see allowed fields below)            |
| direction | string  | No       | Sort direction: 'asc' or 'desc' (default: 'asc') |

**Allowed Sort Fields:**
`env_id`, `env_code`, `env_name`, `env_description`, `application_count`, `iteration_count`

### 3.3. Request Body

#### POST /environments

- **Content-Type:** application/json
- **Schema:**

```json
{
  "env_code": "string (required, unique)",
  "env_name": "string (required)",
  "env_description": "string (optional)"
}
```

- **Example:**

```json
{
  "env_code": "PROD",
  "env_name": "Production Environment",
  "env_description": "Main production environment for live applications"
}
```

#### PUT /environments/{id}

- **Content-Type:** application/json
- **Schema:** Same as POST, all fields required for full update

#### POST /environments/{id}/iterations/{iteId}

- **Content-Type:** application/json
- **Schema:**

```json
{
  "enr_id": "integer (required, environment role ID)"
}
```

## 4. Response Details

### 4.1. Success Responses

#### GET /environments (Simple Array Response)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "env_id": "integer",
    "env_code": "string",
    "env_name": "string",
    "env_description": "string",
    "application_count": "integer",
    "iteration_count": "integer"
  }
]
```

#### GET /environments (Paginated Response)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "data": [
    {
      "env_id": "integer",
      "env_code": "string",
      "env_name": "string",
      "env_description": "string",
      "application_count": "integer",
      "iteration_count": "integer"
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

#### GET /environments/roles

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "enr_id": "integer",
    "enr_name": "string",
    "enr_description": "string"
  }
]
```

#### GET /environments/{id}

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "env_id": "integer",
  "env_code": "string",
  "env_name": "string",
  "env_description": "string",
  "applications": [
    {
      "app_id": "integer",
      "app_name": "string"
    }
  ],
  "iterations": [
    {
      "ite_id": "UUID",
      "ite_name": "string",
      "role": "string"
    }
  ]
}
```

#### POST /environments

- **Status Code:** 201 Created
- **Content-Type:** application/json
- **Schema:** Created environment object with full details

#### PUT /environments/{id}

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:** Updated environment object with full details

#### DELETE Operations

- **Status Code:** 204 No Content
- **Content-Type:** None
- **Schema:** Empty response body

#### Association Operations (POST)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "message": "string (success confirmation)"
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema                                              | Example                                                     | Description                                   |
| ----------- | ---------------- | --------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "Invalid page number format"}`                   | Bad request - validation error                |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "env_code and env_name are required"}`           | Missing required fields                       |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "Invalid environment ID format"}`                | Invalid ID format                             |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "Invalid JSON in request body"}`                 | Malformed JSON                                |
| 404         | application/json | `{"error": "string"}`                               | `{"error": "Environment not found"}`                        | Resource not found                            |
| 409         | application/json | `{"error": "string"}`                               | `{"error": "An environment with this code already exists"}` | Conflict - duplicate code                     |
| 409         | application/json | `{"error": "string"}`                               | `{"error": "Association already exists"}`                   | Conflict - duplicate association              |
| 409         | application/json | `{"error": "string", "blocking_relationships": {}}` | Complex blocking relationship error (see DELETE section)    | Conflict - cannot delete due to relationships |
| 429         | application/json | Rate limit error with retry headers                 | See Rate Limiting section                                   | Too Many Requests - rate limit exceeded       |
| 500         | application/json | `{"error": "string"}`                               | `{"error": "Database error occurred"}`                      | Database connection failure                   |
| 500         | application/json | `{"error": "string"}`                               | `{"error": "An unexpected error occurred"}`                 | Unexpected system error                       |
| 401         | application/json | Confluence standard error response                  | Confluence authentication error                             | Authentication required                       |
| 403         | application/json | Confluence standard error response                  | Confluence authorization error                              | Insufficient permissions                      |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication
- **Permissions:**
  - **Read Operations (GET):** `confluence-users` OR `confluence-administrators`
  - **Write Operations (POST/PUT/DELETE):** `confluence-administrators` ONLY
- **User Context:** Automatically captured for audit trails

## 6. Rate Limiting & Security

### 6.1. Enterprise Rate Limiting System

- **Technology:** Advanced client tracking with IP-based rate limiting
- **Read Operations:** 60 requests/minute, 600 requests/hour per client IP
- **Write Operations:** 30 requests/minute, 300 requests/hour per client IP (stricter limits)
- **Client Blocking:** Automatic blocking for clients exceeding 1.5x hourly limit
- **Cleanup:** Automatic cleanup of rate limiting data after 24 hours

### 6.2. Rate Limit Headers

All responses include rate limiting information:

```http
X-RateLimit-Limit: 60
X-RateLimit-Reset: 1640995200000
Retry-After: 60
```

### 6.3. Rate Limit Exceeded Response (429)

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": "60 seconds",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

### 6.4. Security Features

- **IP Detection:** Advanced proxy-aware IP detection (X-Forwarded-For, X-Real-IP)
- **Request Tracking:** Per-client request counting with atomic operations
- **Memory Management:** Automatic cleanup to prevent memory leaks
- **Audit Logging:** All security events logged for monitoring
- **Input Validation:**
  - UUID format validation for iteration IDs
  - Integer format validation for environment and application IDs
  - String length limits and content validation
  - SQL injection prevention via prepared statements
  - Type casting validation (ADR-031)
- **Other Security Considerations:**
  - User context captured for all operations
  - Comprehensive error handling without information leakage
  - Blocking relationship validation prevents data corruption

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Supports both simple array and paginated responses based on query parameters
  - Dynamic sorting across all environment fields
  - Search functionality with minimum 2-character requirement
  - Maximum page size limit of 200 for performance
  - Comprehensive relationship validation before deletions
  - Automatic audit trail maintenance for all operations
- **Side Effects:**
  - POST: Creates new environment record with associations
  - PUT: Updates existing record with full replacement
  - DELETE: Hard delete with comprehensive relationship blocking
  - Association operations create/remove junction table entries
- **Idempotency:**
  - GET: Yes (no state changes)
  - POST: No (creates new resources)
  - PUT: Yes (repeatable updates)
  - DELETE: Yes (repeatable deletion)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `environments_env` (primary table)
    - `env_id` (SERIAL, primary key)
    - `env_code` (VARCHAR, unique)
    - `env_name` (VARCHAR, display name)
    - `env_description` (TEXT, optional description)
  - `environment_roles_enr` (role definitions)
  - `environments_env_x_applications_app` (application associations)
  - `environments_env_x_iterations_ite` (iteration associations with roles)

- **External APIs:** None
- **Other Services:**
  - EnvironmentRepository for data access operations
  - DatabaseUtil for connection management with connection pooling
  - UserService for authentication context
  - JsonBuilder for JSON response serialization
  - Log4j for operation and security event logging
  - EnvironmentsApiRateLimiter for advanced rate limiting

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment
- **Backward Compatibility:** Maintained for pagination parameter changes

## 10. Testing & Mock Data

- **Unit Tests:** Repository tests cover data access operations including pagination and sorting
- **Integration Tests:** Full CRUD operations tested in integration test suite
- **E2E Tests:** Tested via Admin GUI and Postman collections
- **Security Tests:** Rate limiting and authentication scenarios covered
- **Mock Data/Fixtures:** Available via npm run generate-data:erase

## 11. Business Logic & Validation Rules

### Create Environment (POST)

- **Business Rules:**
  - Environment code must be unique across the system
  - Environment code and name are mandatory fields
  - Description is optional but recommended
  - Audit fields automatically populated from user context
- **Validation Rules:**
  - env_code: Required, string, must be unique
  - env_name: Required, non-empty string
  - env_description: Optional string
- **Error Conditions:**
  - Duplicate env_code: Returns 409 Conflict
  - Missing required fields: Returns 400 Bad Request
  - Database errors: Returns 500 Internal Server Error

### Retrieve Environments (GET)

- **Business Rules:**
  - Returns all environments with application and iteration counts
  - Pagination triggered by presence of page parameter
  - Search requires minimum 2 characters
  - Maximum page size of 200 for performance
  - Default sorting by env_id ascending
- **Validation Rules:**
  - page: Must be positive integer, defaults to 1
  - size: Must be 1-200, defaults to 50
  - search: Minimum 2 characters if provided
  - sort: Must be one of allowed fields
  - direction: Must be 'asc' or 'desc', defaults to 'asc'
- **Error Conditions:**
  - Invalid pagination parameters: Returns 400 Bad Request
  - Database errors: Returns 500 Internal Server Error

### Update Environment (PUT)

- **Business Rules:**
  - Full update - all required fields must be provided
  - Environment ID must exist
  - Code uniqueness validated if changed
- **Validation Rules:**
  - Same validation as POST for all fields
  - Resource must exist (checked before update)
- **Error Conditions:**
  - Resource not found: Returns 404 Not Found
  - Duplicate code: Returns 409 Conflict
  - Invalid field values: Returns 400 Bad Request

### Delete Environment (DELETE)

- **Business Rules:**
  - Hard delete with comprehensive relationship checking
  - Cannot delete if associated with applications or iterations
  - Blocking relationships reported in detail
- **Validation Rules:**
  - Resource must exist
  - Must not have any associations
- **Error Conditions:**
  - Resource not found: Returns 404 Not Found
  - Blocking relationships exist: Returns 409 Conflict with details

### Association Management

- **Business Rules:**
  - Application associations are direct many-to-many
  - Iteration associations require environment role specification
  - Duplicate associations prevented
  - Associations can be removed independently
- **Validation Rules:**
  - Both environment and target resource must exist
  - Role ID required for iteration associations
  - Association uniqueness enforced
- **Error Conditions:**
  - Resource not found: Returns 404 Not Found
  - Duplicate association: Returns 409 Conflict
  - Invalid role: Returns 400 Bad Request

## 12. Performance Characteristics

- **Response Times:**
  - Simple GET requests: <100ms typical
  - Paginated requests: <150ms typical
  - Write operations: <200ms typical
  - Association operations: <100ms typical
- **Throughput:**
  - Read operations: 60 requests/minute per client
  - Write operations: 30 requests/minute per client
  - Concurrent client support: Unlimited
- **Resource Usage:**
  - Memory: Efficient with automatic cleanup
  - Database: Optimized queries with proper indexing
  - Network: Minimal payload sizes (<5KB typical)

## 13. Examples

### Create Environment

```bash
curl -X POST /rest/scriptrunner/latest/custom/environments \
  -H "Content-Type: application/json" \
  -d '{
    "env_code": "PROD",
    "env_name": "Production Environment",
    "env_description": "Main production environment for live applications"
  }'
```

**Response (201 Created):**

```json
{
  "env_id": 1,
  "env_code": "PROD",
  "env_name": "Production Environment",
  "env_description": "Main production environment for live applications"
}
```

### Retrieve Environments with Pagination

```bash
curl -X GET "/rest/scriptrunner/latest/custom/environments?page=1&size=10&sort=env_name&direction=asc" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "env_id": 1,
      "env_code": "PROD",
      "env_name": "Production Environment",
      "env_description": "Main production environment for live applications",
      "application_count": 5,
      "iteration_count": 3
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
    "field": "env_name",
    "direction": "asc"
  }
}
```

### Associate Application with Environment

```bash
curl -X POST /rest/scriptrunner/latest/custom/environments/1/applications/5 \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "message": "Application associated successfully"
}
```

### Associate Iteration with Environment (with Role)

```bash
curl -X POST /rest/scriptrunner/latest/custom/environments/1/iterations/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "enr_id": 2
  }'
```

### Delete Environment (Blocking Relationships Error)

```bash
curl -X DELETE /rest/scriptrunner/latest/custom/environments/1 \
  -H "Content-Type: application/json"
```

**Error Response (409 Conflict):**

```json
{
  "error": "Cannot delete environment with ID 1 due to existing relationships",
  "blocking_relationships": {
    "applications": [
      {
        "app_id": 5,
        "app_name": "Customer Portal"
      }
    ],
    "iterations": [
      {
        "ite_id": "550e8400-e29b-41d4-a716-446655440000",
        "ite_name": "Production Cutover"
      }
    ]
  }
}
```

### Rate Limit Exceeded Error

```bash
# After exceeding rate limits
curl -X GET /rest/scriptrunner/latest/custom/environments
```

**Error Response (429 Too Many Requests):**

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": "60 seconds",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**Headers:**

```http
Retry-After: 60
X-RateLimit-Limit: 60
X-RateLimit-Reset: 1640995200000
```

## 14. Notes

- **Security Implementation:**
  - Enterprise-grade rate limiting with client IP tracking
  - Advanced proxy-aware IP detection
  - Automatic client blocking for abuse prevention
  - Comprehensive audit logging for security events
  - Memory management with automatic cleanup
- **Performance Optimization:**
  - Optimized database queries with proper indexing
  - Connection pooling for database efficiency
  - Minimal payload sizes for network efficiency
  - Efficient pagination implementation
- **Integration Considerations:**
  - Primary consumer is Admin GUI with full CRUD requirements
  - Association management critical for migration workflows
  - Rate limiting protects against abuse while supporting legitimate use
  - Blocking relationship validation prevents data corruption

## 15. Related APIs

- **Applications API:** Referenced in environment-application associations
- **Iterations API:** Referenced in environment-iteration associations
- **Environment Roles API:** Used for iteration association role management
- **Admin GUI APIs:** Consumed by Admin GUI for environment management

## 16. Change Log

- **2025-09-16:** Complete documentation rewrite with enterprise security features, rate limiting, and comprehensive API coverage
- **2025-09-15:** Added rate limiting implementation with client blocking capabilities
- **2025-08-26:** Enhanced with pagination and association management
- **2025-08-22:** Initial comprehensive API implementation
