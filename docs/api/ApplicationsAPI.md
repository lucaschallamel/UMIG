# Applications API Specification

> Comprehensive CRUD API for managing applications with advanced pagination, association management, and full lifecycle support for application data including environment, team, and label relationships.

---

## 1. API Overview

- **API Name:** Applications API v2
- **Purpose:** Complete lifecycle management of applications including creation, retrieval, updating, and deletion. Features advanced pagination with Admin GUI support, comprehensive association management for environments, teams, and labels, and enterprise-grade error handling.
- **Owner:** UMIG Development Team
- **Performance SLA:** <100ms response time, <160ms for paginated requests
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-031 (Type Safety), ADR-039 (Error Handling), ADR-042 (Authentication Context)

## 2. Endpoints

| Method | Path                                     | Description                                  | Rate Limit\* |
| ------ | ---------------------------------------- | -------------------------------------------- | ------------ |
| GET    | `/api/v2/applications`                   | Get all applications with pagination/sorting | Standard     |
| GET    | `/api/v2/applications/{id}`              | Get specific application with full details   | Standard     |
| GET    | `/api/v2/applications/{id}/environments` | Get environments associated with application | Standard     |
| GET    | `/api/v2/applications/{id}/teams`        | Get teams associated with application        | Standard     |
| GET    | `/api/v2/applications/{id}/labels`       | Get labels associated with application       | Standard     |
| POST   | `/api/v2/applications`                   | Create a new application                     | Standard     |
| PUT    | `/api/v2/applications/{id}`              | Update an existing application               | Standard     |
| DELETE | `/api/v2/applications/{id}`              | Delete an application                        | Standard     |

\*Standard rate limits apply as per ScriptRunner configuration

## 3. Request Details

### 3.1. Path Parameters

| Name | Type    | Required | Description                                        |
| ---- | ------- | -------- | -------------------------------------------------- |
| id   | integer | Yes\*    | The application ID (for GET/{id}, PUT, DELETE ops) |

\*Required only for specific operations as indicated in endpoint paths

### 3.2. Query Parameters (GET /applications)

| Name      | Type    | Required | Description                                      |
| --------- | ------- | -------- | ------------------------------------------------ |
| page      | integer | No       | Page number for pagination (1-based, minimum: 1) |
| size      | integer | No       | Page size (1-500, default: 50)                   |
| search    | string  | No       | Search term (minimum 2 characters)               |
| sort      | string  | No       | Sort field (see allowed fields below)            |
| direction | string  | No       | Sort direction: 'asc' or 'desc' (default: 'asc') |

**Allowed Sort Fields:**
`app_id`, `app_code`, `app_name`, `app_description`, `environment_count`, `team_count`

### 3.3. Request Body

#### POST /applications

- **Content-Type:** application/json
- **Schema:**

```json
{
  "app_code": "string (required, unique)",
  "app_name": "string (required)",
  "app_description": "string (optional)"
}
```

- **Example:**

```json
{
  "app_code": "CUSTOMER_PORTAL",
  "app_name": "Customer Portal Application",
  "app_description": "Main customer-facing web application for account management"
}
```

#### PUT /applications/{id}

- **Content-Type:** application/json
- **Schema:** Same as POST, all fields required for full update

## 4. Response Details

### 4.1. Success Responses

#### GET /applications (Simple Array Response)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "app_id": "integer",
    "app_code": "string",
    "app_name": "string",
    "app_description": "string",
    "environment_count": "integer (when available)",
    "team_count": "integer (when available)"
  }
]
```

- **Example:**

```json
[
  {
    "app_id": 1,
    "app_code": "CUSTOMER_PORTAL",
    "app_name": "Customer Portal Application",
    "app_description": "Main customer-facing web application",
    "environment_count": 4,
    "team_count": 2
  }
]
```

#### GET /applications (Paginated Response)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "data": [
    {
      "app_id": "integer",
      "app_code": "string",
      "app_name": "string",
      "app_description": "string",
      "environment_count": "integer",
      "team_count": "integer"
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

#### GET /applications/{id}

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "app_id": "integer",
  "app_code": "string",
  "app_name": "string",
  "app_description": "string",
  "environments": [
    {
      "env_id": "integer",
      "env_name": "string",
      "env_code": "string"
    }
  ],
  "teams": [
    {
      "tms_id": "integer",
      "tms_name": "string"
    }
  ],
  "labels": [
    {
      "lbl_id": "integer",
      "lbl_name": "string",
      "lbl_color": "string"
    }
  ]
}
```

#### GET /applications/{id}/environments

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "env_id": "integer",
    "env_code": "string",
    "env_name": "string",
    "env_description": "string"
  }
]
```

#### GET /applications/{id}/teams

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "tms_id": "integer",
    "tms_name": "string",
    "tms_description": "string",
    "tms_email": "string"
  }
]
```

#### GET /applications/{id}/labels

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "lbl_id": "integer",
    "lbl_name": "string",
    "lbl_color": "string",
    "lbl_description": "string"
  }
]
```

#### POST /applications

- **Status Code:** 201 Created
- **Content-Type:** application/json
- **Schema:** Created application object with full details

#### PUT /applications/{id}

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:** Updated application object with full details

#### DELETE /applications/{id}

- **Status Code:** 204 No Content
- **Content-Type:** None
- **Schema:** Empty response body

### 4.2. Error Responses

| Status Code | Content-Type     | Schema                                              | Example                                                     | Description                                   |
| ----------- | ---------------- | --------------------------------------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "Invalid Application ID format"}`                | Invalid ID format                             |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "Invalid page number format"}`                   | Invalid pagination parameters                 |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "app_code and app_name are required"}`           | Missing required fields                       |
| 400         | application/json | `{"error": "string"}`                               | `{"error": "Invalid JSON in request body"}`                 | Malformed JSON                                |
| 404         | application/json | `{"error": "string"}`                               | `{"error": "Application with ID 123 not found"}`            | Application not found                         |
| 409         | application/json | `{"error": "string"}`                               | `{"error": "An application with this code already exists"}` | Code conflict                                 |
| 409         | application/json | `{"error": "string", "blocking_relationships": {}}` | Complex blocking relationship error (similar to other APIs) | Conflict - cannot delete due to relationships |
| 500         | application/json | `{"error": "string"}`                               | `{"error": "Database error occurred: Connection timeout"}`  | Database connection failure                   |
| 500         | application/json | `{"error": "string"}`                               | `{"error": "An unexpected internal error occurred"}`        | Unexpected system error                       |
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

### 6.1. Rate Limiting

- **Rate Limits:** Standard ScriptRunner rate limiting configuration
- **Implementation:** Built-in ScriptRunner throttling mechanisms
- **Monitoring:** Automatic rate limit monitoring and enforcement

### 6.2. Security Features

- **Input Validation:**
  - Integer format validation for application IDs
  - String length limits and content validation for application fields
  - SQL injection prevention via prepared statements
  - Type casting validation (ADR-031)
  - JSON format validation for request bodies
- **Data Protection:**
  - User context captured for all operations
  - Comprehensive error handling without information leakage
  - Blocking relationship validation prevents data corruption
- **Access Control:**
  - Confluence group-based authorization
  - Write operations restricted to administrators
  - User context preservation for audit trails
- **Other Security Considerations:**
  - Association data validated before exposure
  - Comprehensive audit logging for all operations
  - Secure database connection management

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Supports both simple array and paginated responses based on query parameters
  - Dynamic sorting across all application fields with Admin GUI integration
  - Search functionality with minimum 2-character requirement
  - Maximum page size limit of 500 for performance optimization
  - Comprehensive relationship management with environments, teams, and labels
  - Association data enrichment for detailed application views
- **Side Effects:**
  - GET: No state changes, may update access logs
  - POST: Creates new application record with audit trail
  - PUT: Updates existing application record with audit trail
  - DELETE: Removes application record after relationship validation
  - Association endpoints: Return related entity data
- **Idempotency:**
  - GET: Yes (no state changes)
  - POST: No (creates new resources)
  - PUT: Yes (repeatable updates)
  - DELETE: Yes (repeatable deletion)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `applications_app` (primary table)
    - `app_id` (SERIAL, primary key)
    - `app_code` (VARCHAR, unique)
    - `app_name` (VARCHAR, application name)
    - `app_description` (TEXT, optional description)
  - `environments_env_x_applications_app` (environment associations)
  - `teams_tms_x_applications_app` (team associations)
  - `applications_app_x_labels_lbl` (label associations)
  - Association target tables: `environments_env`, `teams_tms`, `labels_lbl`

- **External APIs:** None
- **Other Services:**
  - ApplicationRepository for data access operations with association management
  - DatabaseUtil for connection management with connection pooling
  - UserService for authentication context (ADR-042)
  - JsonBuilder for JSON response serialization
  - Log4j for operation and error logging

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment
- **Backward Compatibility:** Maintained for pagination parameter changes

## 10. Testing & Mock Data

- **Unit Tests:** Repository tests cover data access operations including pagination and association management
- **Integration Tests:** Full CRUD operations tested including association endpoints
- **E2E Tests:** Tested via Admin GUI and association management scenarios
- **Performance Tests:** Pagination and search performance validated
- **Mock Data/Fixtures:** Available via npm run generate-data:erase

## 11. Business Logic & Validation Rules

### Create Application (POST)

- **Business Rules:**
  - Application code must be unique across the system
  - Application code and name are mandatory fields
  - Description is optional but recommended
  - Audit fields automatically populated from user context
- **Validation Rules:**
  - app_code: Required, string, must be unique
  - app_name: Required, non-empty string
  - app_description: Optional string
- **Error Conditions:**
  - Duplicate app_code: Returns 409 Conflict
  - Missing required fields: Returns 400 Bad Request
  - Database errors: Returns 500 Internal Server Error

### Retrieve Applications (GET)

- **Business Rules:**
  - Returns all applications with environment and team counts when available
  - Pagination triggered by presence of page, size, sort, or direction parameters
  - Search requires minimum 2 characters
  - Maximum page size of 500 for performance
  - Default sorting by app_id ascending
- **Validation Rules:**
  - page: Must be positive integer, defaults to 1
  - size: Must be 1-500, defaults to 50
  - search: Minimum 2 characters if provided
  - sort: Must be one of allowed fields
  - direction: Must be 'asc' or 'desc', defaults to 'asc'
- **Error Conditions:**
  - Invalid pagination parameters: Returns 400 Bad Request
  - Database errors: Returns 500 Internal Server Error

### Association Endpoints Logic

- **Environment Associations:** Returns environments where application is deployed
- **Team Associations:** Returns teams responsible for the application
- **Label Associations:** Returns categorization labels applied to application
- **Validation:** Application must exist before returning associations
- **Error Handling:** 404 if application not found, 500 for database errors

## 12. Performance Characteristics

- **Response Times:**
  - Simple GET requests: <60ms typical
  - Association endpoints: <80ms typical
  - Paginated requests: <120ms typical
  - Write operations: <150ms typical
- **Throughput:**
  - Standard ScriptRunner rate limits apply
  - Concurrent request support
  - Efficient database query optimization
- **Resource Usage:**
  - Memory: Efficient with proper connection pooling
  - Database: Optimized queries with proper indexing
  - Network: Minimal payload sizes (<2KB typical)

## 13. Examples

### Get Applications with Pagination

```bash
curl -X GET "/rest/scriptrunner/latest/custom/applications?page=1&size=10&sort=app_name&direction=asc" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "app_id": 1,
      "app_code": "CUSTOMER_PORTAL",
      "app_name": "Customer Portal Application",
      "app_description": "Main customer-facing web application",
      "environment_count": 4,
      "team_count": 2
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
    "field": "app_name",
    "direction": "asc"
  }
}
```

### Get Application Details

```bash
curl -X GET /rest/scriptrunner/latest/custom/applications/1 \
  -H "Content-Type: application/json"
```

### Get Application Environments

```bash
curl -X GET /rest/scriptrunner/latest/custom/applications/1/environments \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
[
  {
    "env_id": 1,
    "env_code": "PROD",
    "env_name": "Production Environment",
    "env_description": "Main production environment"
  }
]
```

### Create New Application

```bash
curl -X POST /rest/scriptrunner/latest/custom/applications \
  -H "Content-Type: application/json" \
  -d '{
    "app_code": "MOBILE_APP",
    "app_name": "Mobile Application",
    "app_description": "Customer mobile application for iOS and Android"
  }'
```

### Search Applications

```bash
curl -X GET "/rest/scriptrunner/latest/custom/applications?search=portal&page=1&size=5" \
  -H "Content-Type: application/json"
```

## 14. Notes

- **Association Management:**
  - Provides comprehensive view of application relationships
  - Critical for understanding application deployment and ownership
  - Supports migration planning and execution workflows
- **Admin GUI Integration:**
  - Supports pagination, sorting, and search for management interface
  - Provides environment and team counts for overview displays
  - Efficient data loading with proper pagination
- **Performance Optimization:**
  - Optimized database queries with proper indexing
  - Connection pooling for database efficiency
  - Efficient association data loading

## 15. Related APIs

- **Environments API:** Referenced in application-environment associations
- **Teams API:** Referenced in application-team associations
- **Labels API:** Referenced in application-label associations
- **Admin GUI APIs:** Primary consumer for application management interface

## 16. Changelog

- **2025-09-16:** Complete documentation rewrite with full API coverage, pagination, associations, and enterprise features
- **2025-09-15:** Added comprehensive CRUD operations and association endpoints
- **2025-07-15:** Initial basic API specification created

---

> **Note:** This API provides comprehensive application management with extensive association capabilities critical for migration planning and execution. All changes should be tested across consuming applications, particularly the Admin GUI components and migration workflow systems.
