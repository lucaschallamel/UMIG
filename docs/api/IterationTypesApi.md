# IterationTypes API Specification

> Comprehensive CRUD API for managing iteration types, providing full lifecycle management of iteration type data with pagination, sorting, and enhanced Admin GUI integration capabilities.

---

## 1. API Overview

- **API Name:** IterationTypes API v2
- **Purpose:** Complete lifecycle management of iteration types including creation, retrieval, updating, and deletion. Supports pagination, sorting, and enhanced filtering for Admin GUI integration. Manages iteration type master data that defines different phases of migration execution (RUN, DR, CUTOVER, etc.).
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-031 (Type Safety), ADR-026 (Testing Patterns), ADR-039 (Error Handling), ADR-042 (Authentication Context)

## 2. Endpoints

| Method | Path                          | Description                                          |
| ------ | ----------------------------- | ---------------------------------------------------- |
| GET    | /api/v2/iterationTypes        | Retrieve all iteration types with pagination/sorting |
| GET    | /api/v2/iterationTypes/{code} | Retrieve specific iteration type by code             |
| POST   | /api/v2/iterationTypes        | Create a new iteration type                          |
| PUT    | /api/v2/iterationTypes/{code} | Update an existing iteration type                    |
| DELETE | /api/v2/iterationTypes/{code} | Delete (soft delete) an iteration type               |

## 3. Request Details

### 3.1. Path Parameters

| Name | Type   | Required | Description                                                  |
| ---- | ------ | -------- | ------------------------------------------------------------ |
| code | string | Yes\*    | The unique iteration type code (for GET/{code}, PUT, DELETE) |

\*Required only for single-resource operations (GET/{code}, PUT, DELETE)

### 3.2. Query Parameters

| Name            | Type    | Required | Description                                                       |
| --------------- | ------- | -------- | ----------------------------------------------------------------- |
| includeInactive | boolean | No       | Include inactive iteration types (default: false)                 |
| stats           | boolean | No       | Include usage statistics (iteration counts, step counts)          |
| page            | integer | No       | Page number for pagination (1-based, triggers paginated response) |
| size            | integer | No       | Page size (1-1000, default: 50)                                   |
| sort            | string  | No       | Sort field (see allowed fields below)                             |
| direction       | string  | No       | Sort direction: 'asc' or 'desc' (default: 'asc')                  |

**Allowed Sort Fields:**
`itt_code`, `itt_name`, `itt_description`, `itt_color`, `itt_icon`, `itt_display_order`, `itt_active`, `created_by`, `created_at`, `updated_by`, `updated_at`

### 3.3. Request Body

#### POST /iterationTypes

- **Content-Type:** application/json
- **Schema:**

```json
{
  "itt_code": "string (required, alphanumeric/underscore/dash)",
  "itt_name": "string (required)",
  "itt_description": "string (optional)",
  "itt_color": "string (optional, hex color format #RRGGBB)",
  "itt_icon": "string (optional, alphanumeric/underscore/dash)",
  "itt_display_order": "integer (optional, default: 0)",
  "itt_active": "boolean (optional, default: true)"
}
```

- **Example:**

```json
{
  "itt_code": "CUTOVER",
  "itt_name": "Production Cutover",
  "itt_description": "Final production cutover execution",
  "itt_color": "#FF6B6B",
  "itt_icon": "play-circle",
  "itt_display_order": 10,
  "itt_active": true
}
```

#### PUT /iterationTypes/{code}

- **Content-Type:** application/json
- **Schema:** Same as POST, but all fields are optional (partial update supported)

```json
{
  "itt_name": "string (optional)",
  "itt_description": "string (optional)",
  "itt_color": "string (optional, hex color format #RRGGBB)",
  "itt_icon": "string (optional, alphanumeric/underscore/dash)",
  "itt_display_order": "integer (optional)",
  "itt_active": "boolean (optional)"
}
```

## 4. Response Details

### 4.1. Success Response

#### GET /iterationTypes (Simple Array Response)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "itt_code": "string",
    "itt_name": "string",
    "itt_description": "string",
    "itt_color": "string",
    "itt_icon": "string",
    "itt_display_order": "integer",
    "itt_active": "boolean",
    "created_by": "string",
    "created_at": "timestamp",
    "updated_by": "string",
    "updated_at": "timestamp"
  }
]
```

- **Example:**

```json
[
  {
    "itt_code": "CUTOVER",
    "itt_name": "Production Cutover",
    "itt_description": "Final production cutover execution",
    "itt_color": "#FF6B6B",
    "itt_icon": "play-circle",
    "itt_display_order": 10,
    "itt_active": true,
    "created_by": "admin",
    "created_at": "2025-09-08T10:30:00Z",
    "updated_by": "admin",
    "updated_at": "2025-09-08T10:30:00Z"
  }
]
```

#### GET /iterationTypes (Paginated Response)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "data": [
    {
      "itt_code": "string",
      "itt_name": "string",
      "itt_description": "string",
      "itt_color": "string",
      "itt_icon": "string",
      "itt_display_order": "integer",
      "itt_active": "boolean",
      "created_by": "string",
      "created_at": "timestamp",
      "updated_by": "string",
      "updated_at": "timestamp"
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

#### GET /iterationTypes?stats=true (With Usage Statistics)

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "itt_code": "string",
    "itt_name": "string",
    "itt_active": "boolean",
    "iteration_count": "integer",
    "step_count": "integer"
  }
]
```

#### POST /iterationTypes

- **Status Code:** 201 Created
- **Content-Type:** application/json
- **Schema:** Created iteration type object (same structure as GET response)

#### PUT /iterationTypes/{code}

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:** Updated iteration type object (same structure as GET response)

#### DELETE /iterationTypes/{code}

- **Status Code:** 204 No Content
- **Content-Type:** None
- **Schema:** Empty response body

### 4.2. Error Responses

| Status Code | Content-Type     | Schema                                  | Example                                                                 | Description                                   |
| ----------- | ---------------- | --------------------------------------- | ----------------------------------------------------------------------- | --------------------------------------------- |
| 400         | application/json | `{"error": "string"}`                   | `{"error": "Invalid page parameter: must be a positive integer"}`       | Bad request - validation error                |
| 400         | application/json | `{"error": "string"}`                   | `{"error": "itt_code is required"}`                                     | Missing required fields                       |
| 400         | application/json | `{"error": "string"}`                   | `{"error": "Itt_color must be a valid hex color code (e.g., #6B73FF)"}` | Invalid field format                          |
| 400         | application/json | `{"error": "string"}`                   | `{"error": "Invalid sort field: invalid_field. Allowed fields: ..."}`   | Invalid sort field                            |
| 400         | application/json | `{"error": "string"}`                   | `{"error": "Invalid JSON format in request body"}`                      | Malformed JSON                                |
| 404         | application/json | `{"error": "string"}`                   | `{"error": "Iteration type with code 'INVALID' not found"}`             | Resource not found                            |
| 409         | application/json | `{"error": "string"}`                   | `{"error": "Iteration type with code 'CUTOVER' already exists"}`        | Conflict - duplicate code                     |
| 409         | application/json | `{"error": "string", "details": [...]}` | Complex blocking relationship error (see DELETE section)                | Conflict - cannot delete due to relationships |
| 500         | application/json | `{"error": "string"}`                   | `{"error": "Database error occurred"}`                                  | Database connection failure                   |
| 500         | application/json | `{"error": "string"}`                   | `{"error": "An unexpected internal error occurred"}`                    | Unexpected system error                       |
| 401         | application/json | Confluence standard error response      | Confluence authentication error                                         | Authentication required                       |
| 403         | application/json | Confluence standard error response      | Confluence authorization error                                          | Insufficient permissions                      |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication (groups: ["confluence-users"])
- **Permissions:** User must be member of confluence-users group

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (controlled by Confluence permissions)
- **Input Validation:**
  - UUID format validation for all IDs
  - String length limits and content validation
  - Type casting validation (ADR-031)
  - SQL injection prevented via prepared statements
  - Hex color format validation (#RRGGBB pattern)
  - Icon name validation (alphanumeric, dash, underscore)
  - Code format validation (alphanumeric, underscore, dash)
- **Other Security Considerations:**
  - Soft delete pattern for audit trail preservation
  - User context captured for audit fields
  - Comprehensive error handling without information leakage

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Supports both paginated and non-paginated responses based on query parameters
  - Dynamic sorting across all iteration type fields
  - Soft delete pattern (sets itt_active = false)
  - Automatic audit trail maintenance (created_by, updated_by, timestamps)
  - Blocking relationship validation before deletion
- **Side Effects:**
  - POST: Creates new iteration type record with audit fields
  - PUT: Updates existing record with updated_by and updated_at
  - DELETE: Soft deletes record (sets itt_active = false) with audit trail
- **Idempotency:**
  - GET: Yes (no state changes)
  - POST: No (creates new resources)
  - PUT: Yes (repeatable updates)
  - DELETE: Yes (repeatable soft delete)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `iteration_types_itt` (primary table)
    - `itt_code` (VARCHAR, primary key)
    - `itt_name` (VARCHAR, display name)
    - `itt_description` (TEXT, optional description)
    - `itt_color` (VARCHAR, hex color code)
    - `itt_icon` (VARCHAR, icon name)
    - `itt_display_order` (INTEGER, ordering)
    - `itt_active` (BOOLEAN, soft delete flag)
    - `created_by`, `created_at`, `updated_by`, `updated_at` (audit fields)
  - `iterations_ite` (relationship checking)
  - `steps_master_stm_x_iteration_types_itt` (relationship checking)

- **External APIs:** None
- **Other Services:**
  - IterationTypeRepository for data access operations
  - DatabaseUtil for connection management
  - UserService for authentication context
  - JsonBuilder for JSON response serialization
  - Log4j for operation logging

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment

## 10. Testing & Mock Data

- **Unit Tests:** Repository tests cover data access operations including pagination and sorting
- **Integration Tests:** Full CRUD operations tested in integration test suite
- **E2E Tests:** Tested via Admin GUI and Postman collections
- **Mock Data/Fixtures:** Available via npm run generate-data:erase

## 11. Business Logic & Validation Rules

### Create Iteration Type (POST)

- **Business Rules:**
  - Iteration type code must be unique across the system
  - Display order helps organize iteration types for UI presentation
  - Default color (#6B73FF) and icon (play-circle) applied if not provided
  - Audit fields automatically populated from user context
- **Validation Rules:**
  - itt_code: Required, alphanumeric/underscore/dash only
  - itt_name: Required, non-empty string
  - itt_color: Optional, must be valid hex format (#RRGGBB)
  - itt_icon: Optional, alphanumeric/underscore/dash only
  - itt_display_order: Optional integer, defaults to 0
- **Error Conditions:**
  - Duplicate itt_code: Returns 409 Conflict
  - Invalid color format: Returns 400 Bad Request
  - Missing required fields: Returns 400 Bad Request

### Retrieve Iteration Types (GET)

- **Business Rules:**
  - Returns active iteration types by default (itt_active = true)
  - includeInactive=true returns all iteration types regardless of status
  - Pagination triggered by presence of page/size/sort/direction parameters
  - Non-paginated response returns simple array, paginated returns object with metadata
  - Default sorting by itt_display_order, then itt_code
  - stats=true includes usage counts from related tables
- **Validation Rules:**
  - page: Must be positive integer, defaults to 1
  - size: Must be 1-1000, defaults to 50
  - sort: Must be one of 11 allowed fields
  - direction: Must be 'asc' or 'desc', defaults to 'asc'
- **Error Conditions:**
  - Invalid pagination parameters: Returns 400 Bad Request
  - Invalid sort field: Returns 400 Bad Request with allowed fields list
  - Database error: Returns 500 Internal Server Error

### Update Iteration Type (PUT)

- **Business Rules:**
  - Partial updates supported - only provided fields are updated
  - itt_code cannot be changed (primary key)
  - updated_by and updated_at automatically set
  - Validates optional fields if provided
- **Validation Rules:**
  - Same validation as POST for any provided fields
  - Resource must exist (checked before update)
- **Error Conditions:**
  - Resource not found: Returns 404 Not Found
  - Invalid field values: Returns 400 Bad Request

### Delete Iteration Type (DELETE)

- **Business Rules:**
  - Soft delete only - sets itt_active = false
  - Checks for blocking relationships before deletion
  - Cannot delete if referenced by iterations or step templates
  - Audit trail maintained with updated_by and updated_at
- **Validation Rules:**
  - Resource must exist
  - Must not have blocking relationships
- **Error Conditions:**
  - Resource not found: Returns 404 Not Found
  - Blocking relationships exist: Returns 409 Conflict with detailed information
  - Foreign key constraints: Returns 409 Conflict

## 12. Examples

### Create Iteration Type

```bash
curl -X POST /rest/scriptrunner/latest/custom/iterationTypes \
  -H "Content-Type: application/json" \
  -d '{
    "itt_code": "CUTOVER",
    "itt_name": "Production Cutover",
    "itt_description": "Final production cutover execution",
    "itt_color": "#FF6B6B",
    "itt_icon": "play-circle",
    "itt_display_order": 10
  }'
```

**Response (201 Created):**

```json
{
  "itt_code": "CUTOVER",
  "itt_name": "Production Cutover",
  "itt_description": "Final production cutover execution",
  "itt_color": "#FF6B6B",
  "itt_icon": "play-circle",
  "itt_display_order": 10,
  "itt_active": true,
  "created_by": "admin",
  "created_at": "2025-09-08T10:30:00Z",
  "updated_by": "admin",
  "updated_at": "2025-09-08T10:30:00Z"
}
```

### Retrieve All Iteration Types with Pagination

```bash
curl -X GET "/rest/scriptrunner/latest/custom/iterationTypes?page=1&size=10&sort=itt_name&direction=asc&includeInactive=false" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
{
  "data": [
    {
      "itt_code": "CUTOVER",
      "itt_name": "Production Cutover",
      "itt_description": "Final production cutover execution",
      "itt_color": "#FF6B6B",
      "itt_icon": "play-circle",
      "itt_display_order": 10,
      "itt_active": true,
      "created_by": "admin",
      "created_at": "2025-09-08T10:30:00Z",
      "updated_by": "admin",
      "updated_at": "2025-09-08T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "size": 10,
    "total": 5,
    "totalPages": 1,
    "hasNext": false,
    "hasPrevious": false
  },
  "sort": {
    "field": "itt_name",
    "direction": "asc"
  }
}
```

### Retrieve Usage Statistics

```bash
curl -X GET "/rest/scriptrunner/latest/custom/iterationTypes?stats=true" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**

```json
[
  {
    "itt_code": "CUTOVER",
    "itt_name": "Production Cutover",
    "itt_active": true,
    "iteration_count": 15,
    "step_count": 45
  },
  {
    "itt_code": "PILOT",
    "itt_name": "Pilot Testing",
    "itt_active": true,
    "iteration_count": 8,
    "step_count": 22
  }
]
```

### Retrieve Specific Iteration Type

```bash
curl -X GET /rest/scriptrunner/latest/custom/iterationTypes/CUTOVER \
  -H "Content-Type: application/json"
```

### Update Iteration Type

```bash
curl -X PUT /rest/scriptrunner/latest/custom/iterationTypes/CUTOVER \
  -H "Content-Type: application/json" \
  -d '{
    "itt_name": "Updated Production Cutover",
    "itt_color": "#00FF00"
  }'
```

### Delete Iteration Type

```bash
curl -X DELETE /rest/scriptrunner/latest/custom/iterationTypes/CUTOVER \
  -H "Content-Type: application/json"
```

**Success Response (204 No Content):** Empty response body

**Error Response (409 Conflict):**

```json
{
  "error": "Cannot delete iteration type 'CUTOVER' because it is still in use by:",
  "details": [
    "Iterations: Migration Alpha Cutover (in migration: Alpha Migration)",
    "Step templates: Database Backup, Application Deployment"
  ],
  "blocking_relationships": {
    "iterations": [
      {
        "ite_id": "uuid",
        "ite_name": "Migration Alpha Cutover",
        "mig_name": "Alpha Migration"
      }
    ],
    "steps_master": [
      {
        "stm_id": "uuid",
        "stm_name": "Database Backup",
        "stm_description": "Backup production database"
      }
    ]
  }
}
```

### Admin GUI Integration Example

```javascript
// Load iteration types with pagination for Admin GUI
async function loadIterationTypesWithPagination(
  page = 1,
  size = 50,
  sort = "itt_display_order",
) {
  const params = new URLSearchParams({
    page: page.toString(),
    size: size.toString(),
    sort: sort,
    direction: "asc",
    includeInactive: "false",
  });

  const response = await fetch(
    `/rest/scriptrunner/latest/custom/iterationTypes?${params}`,
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Create new iteration type
async function createIterationType(iterationTypeData) {
  const response = await fetch(
    "/rest/scriptrunner/latest/custom/iterationTypes",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(iterationTypeData),
    },
  );

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Failed to create iteration type");
  }

  return await response.json();
}
```

## 13. Notes

- **Implementation Notes:**
  - Enhanced from simple read-only API to full CRUD operations
  - Intelligent response format switching (simple array vs paginated object)
  - Comprehensive validation with user-friendly error messages
  - Soft delete pattern maintains data integrity and audit trail
  - Performance optimized with proper indexing on sort fields
- **Integration Considerations:**
  - Primary consumer is Admin GUI with pagination and sorting requirements
  - Legacy consumers continue to work with simple array response format
  - Blocking relationship validation prevents data corruption
  - Audit trail support for compliance requirements
- **Performance Characteristics:**
  - Non-paginated requests: <50ms typical response time
  - Paginated requests: <100ms typical response time
  - Small payload size for simple requests (<5KB typical)
  - Larger payloads for paginated responses with metadata
  - Database queries optimized with proper indexing

## 14. Related APIs

- **Iterations API:** References iteration types via itt_code foreign key relationships
- **Steps API:** Step templates can be linked to iteration types via junction table
- **Admin GUI APIs:** Consumed by Admin GUI for dropdown population and full CRUD management

## 15. Change Log

- **2025-09-08:** Complete API rewrite with full CRUD operations, pagination, sorting, and enhanced validation
- **2025-08-26:** Enhanced with pagination and sorting for Admin GUI integration
- **2025-08-25:** Initial API specification created following template v1.0
- **2025-08-22:** API implementation completed as part of US-031 Admin GUI integration

---

> **Note:** This API now provides complete lifecycle management of iteration types with enterprise-grade features including pagination, sorting, comprehensive validation, and soft delete patterns. All changes should be tested across consuming applications, particularly the Admin GUI components and any APIs that reference iteration types.
