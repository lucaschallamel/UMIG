# Iterations API Specification

> Comprehensive API specification for Iterations management in the UMIG project. Iterations represent phases within migrations with full CRUD functionality, pagination, and comprehensive filtering capabilities.

---

## 1. API Overview

- **API Name:** Iterations API v2
- **Purpose:** Manage migration iterations with comprehensive CRUD operations, pagination, search, and hierarchical filtering
- **Owner:** UMIG Development Team
- **Base URL:** `/rest/scriptrunner/latest/custom/iterationsList`
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-030 (Hierarchical Filtering), ADR-031 (Type Safety), US-031 (Admin GUI Integration)

## 2. Endpoints

| Method | Path                 | Description                                  |
| ------ | -------------------- | -------------------------------------------- |
| GET    | /iterationsList      | List all iterations with pagination & search |
| POST   | /iterationsList      | Create new iteration                         |
| GET    | /iterationsList/{id} | Get specific iteration by ID                 |
| PUT    | /iterationsList/{id} | Update existing iteration                    |
| DELETE | /iterationsList/{id} | Delete iteration                             |

## 3. Request Details

### 3.1. Path Parameters

| Name | Type | Required | Description    |
| ---- | ---- | -------- | -------------- |
| id   | UUID | Yes      | Iteration UUID |

### 3.2. Query Parameters

#### For GET /iterationsList (List)

| Name        | Type    | Required | Description                                                                                                                                                            |
| ----------- | ------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| page        | Integer | No       | Page number (default 1, minimum 1)                                                                                                                                     |
| size        | Integer | No       | Page size (1-100, default 50)                                                                                                                                          |
| search      | String  | No       | Search term for iteration names and descriptions (max 100 chars)                                                                                                       |
| sort        | String  | No       | Field to sort by (ite_id, ite_name, itt_code, ite_static_cutover_date, ite_dynamic_cutover_date, ite_status, migration_name, master_plan_name, created_at, updated_at) |
| direction   | String  | No       | Sort direction (asc, desc) - default: asc                                                                                                                              |
| migrationId | UUID    | No       | Filter by migration ID                                                                                                                                                 |

### 3.3. Request Body

#### Create Iteration (POST /iterationsList)

- **Content-Type:** application/json
- **Schema:**

```json
{
  "ite_name": "string (required) | Alternative: name",
  "ite_description": "string (optional)",
  "mig_id": "uuid (required) | Alternative: migrationId",
  "itt_code": "string (optional)",
  "ite_static_cutover_date": "string (date/datetime, optional)",
  "ite_dynamic_cutover_date": "string (date/datetime, optional)"
}
```

**Note:** The API supports flexible field naming - you can use either `ite_name` or `name`, and either `mig_id` or `migrationId`.

- **Example:**

```json
{
  "ite_name": "Phase 1 Iteration",
  "ite_description": "Initial migration phase for core applications",
  "mig_id": "123e4567-e89b-12d3-a456-426614174000",
  "itt_code": "PHASE1",
  "ite_static_cutover_date": "2025-08-15",
  "ite_dynamic_cutover_date": "2025-08-15T16:00:00"
}
```

- **Alternative naming example:**

```json
{
  "name": "Phase 1 Iteration",
  "ite_description": "Initial migration phase for core applications",
  "migrationId": "123e4567-e89b-12d3-a456-426614174000",
  "itt_code": "PHASE1"
}
```

#### Update Iteration (PUT /iterationsList/{id})

- **Content-Type:** application/json
- **Schema:** Same as create, but all fields are optional (only provided fields are updated)

```json
{
  "ite_name": "string (optional)",
  "ite_description": "string (optional)",
  "itt_code": "string (optional)",
  "ite_static_cutover_date": "string (optional)",
  "ite_dynamic_cutover_date": "string (optional)"
}
```

## 4. Response Details

### 4.1. Success Responses

#### GET /iterationsList - List with Pagination

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "data": [
    {
      "ite_id": "uuid",
      "ite_name": "string",
      "ite_description": "string",
      "mig_id": "uuid",
      "migration_name": "string",
      "itt_code": "string",
      "ite_static_cutover_date": "string",
      "ite_dynamic_cutover_date": "string",
      "ite_status": "integer",
      "created_at": "string",
      "updated_at": "string"
    }
  ],
  "pagination": {
    "page": "integer",
    "size": "integer",
    "total": "integer",
    "totalPages": "integer",
    "hasNext": "boolean",
    "hasPrev": "boolean"
  }
}
```

#### GET /iterationsList/{id} - Single Iteration

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "ite_id": "uuid",
  "ite_name": "string",
  "ite_description": "string",
  "mig_id": "uuid",
  "migration_name": "string",
  "itt_code": "string",
  "ite_static_cutover_date": "string",
  "ite_dynamic_cutover_date": "string",
  "ite_status": "integer",
  "created_at": "string",
  "updated_at": "string"
}
```

#### POST /iterationsList - Created Iteration

- **Status Code:** 201
- **Content-Type:** application/json
- **Schema:** Same as single iteration response

#### PUT /iterationsList/{id} - Updated Iteration

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:** Same as single iteration response

#### DELETE /iterationsList/{id} - Deletion Success

- **Status Code:** 204
- **Content-Type:** No content

### 4.2. Error Responses

| Status Code | Content-Type     | Description                                            |
| ----------- | ---------------- | ------------------------------------------------------ |
| 400         | application/json | Bad Request - Invalid parameters or validation errors  |
| 404         | application/json | Not Found - Iteration does not exist                   |
| 409         | application/json | Conflict - Name already exists or constraint violation |
| 500         | application/json | Internal Server Error                                  |

#### Error Response Schema

```json
{
  "error": "string",
  "details": "string (optional, included in 500 errors)"
}
```

#### Common Error Examples

```json
// Missing iteration name
{
  "error": "Iteration name is required"
}

// Missing migration ID
{
  "error": "Migration ID is required"
}

// Invalid JSON format
{
  "error": "Invalid JSON format in request body"
}

// Invalid UUID format
{
  "error": "Invalid iteration UUID"
}

// Invalid page number
{
  "error": "Invalid page number format"
}

// Invalid page size
{
  "error": "Invalid page size format"
}

// Search term too long
{
  "error": "Search term too long (max 100 characters)"
}

// Invalid sort field
{
  "error": "Invalid sort field. Allowed: ite_id, ite_name, itt_code, ite_static_cutover_date, ite_dynamic_cutover_date, ite_status, migration_name, master_plan_name, created_at, updated_at"
}

// Invalid migration ID format
{
  "error": "Invalid migration ID format"
}

// Name already exists (SQL unique constraint)
{
  "error": "An iteration with this name already exists"
}

// Migration not found (SQL foreign key violation)
{
  "error": "Invalid migration ID - migration does not exist"
}

// Required field missing (SQL not null violation)
{
  "error": "Required field is missing"
}

// Cannot delete - has dependencies (SQL foreign key violation)
{
  "error": "Cannot delete iteration - it has associated plans or is referenced by other resources"
}

// Internal server error with details
{
  "error": "Internal error",
  "details": "Specific error message"
}

// Unknown endpoint
{
  "error": "Unknown endpoint"
}

// Invalid path for PUT/DELETE
{
  "error": "Invalid path for PUT request"
}

// Iteration not found
{
  "error": "Iteration not found"
}
```

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication (groups: ["confluence-users", "confluence-administrators"])
- **Permissions:** User must be member of confluence-users or confluence-administrators group

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (data access controlled by Confluence permissions)
- **Input Validation:**
  - UUID format validation for all IDs
  - String length limits (search max 100 chars)
  - Date format validation (YYYY-MM-DD or ISO datetime)
  - Pagination bounds (page >= 1, size 1-100)
  - Sort field validation against allowed fields list
  - JSON format validation for request bodies
  - Number format validation for pagination parameters
- **Other Security Considerations:** SQL injection prevented via prepared statements

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Name uniqueness enforced across all iterations
  - Migration ID must reference existing migration (foreign key constraint)
  - Soft delete not implemented - hard delete only
  - Automatic timestamp management (created_at, updated_at)
  - Support for both static and dynamic cutover dates
  - Flexible field naming support (name/ite_name, migrationId/mig_id)

- **Side Effects:**
  - Creating iterations may affect migration status calculations
  - Deleting iterations will fail if plans or other resources reference them (SQL state 23503)
  - Search functionality performs case-insensitive matching on names and descriptions
  - Comprehensive SQL exception mapping to user-friendly error messages

- **SQL State Mappings:**
  - 23503 (Foreign key violation): HTTP 409 - Invalid migration ID or deletion blocked by dependencies
  - 23505 (Unique constraint): HTTP 409 - Duplicate iteration name
  - 23502 (Not null violation): HTTP 400 - Required field missing

- **Idempotency:**
  - GET operations are idempotent
  - POST is not idempotent (creates new resource)
  - PUT is idempotent (same update produces same result)
  - DELETE is idempotent (repeated deletes return same result)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `iteration_ite` (primary table)
  - `migration_mig` (foreign key relationship)
  - `status_sts` (status lookup)

- **External APIs:** None
- **Other Services:**
  - MigrationRepository for data access
  - DatabaseUtil for connection management

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment

## 10. Testing & Mock Data

- **Unit Tests:** MigrationRepository tests cover iteration operations
- **Integration Tests:** Full CRUD operations tested in AdminGuiAllEndpointsTest.groovy
- **E2E Tests:** Tested via Admin GUI integration
- **Mock Data/Fixtures:** Available via npm run generate-data:erase

## 11. Business Logic & Validation Rules

### Create Iteration

- Name is required and must be unique
- Migration ID is required and must reference existing migration
- Date formats support both YYYY-MM-DD and ISO datetime strings
- Status defaults to appropriate value if not specified

### Update Iteration

- Only provided fields are updated (partial updates supported)
- Name uniqueness validation applies if name is being changed
- Cannot update migration association after creation

### Delete Iteration

- Fails if iteration has associated plans or other resources
- Hard delete only (no soft delete functionality)

### List Iterations

- Default pagination: page=1, size=50
- Search performs case-insensitive matching on name and description
- Sorting supports all major iteration fields
- Migration filtering enables hierarchical data access

## 12. Examples

### Create Basic Iteration

```bash
curl -X POST /rest/scriptrunner/latest/custom/iterationsList \
  -H "Content-Type: application/json" \
  -d '{
    "ite_name": "Phase 1 Iteration",
    "mig_id": "123e4567-e89b-12d3-a456-426614174000",
    "ite_static_cutover_date": "2025-08-15"
  }'
```

### Create Iteration with Alternative Field Names

```bash
curl -X POST /rest/scriptrunner/latest/custom/iterationsList \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Phase 1 Iteration",
    "migrationId": "123e4567-e89b-12d3-a456-426614174000",
    "ite_static_cutover_date": "2025-08-15"
  }'
```

### List Iterations with Search and Sorting

```bash
curl "/rest/scriptrunner/latest/custom/iterationsList?search=phase&page=1&size=10&sort=ite_name&direction=asc"
```

### List Iterations by Migration

```bash
curl "/rest/scriptrunner/latest/custom/iterationsList?migrationId=123e4567-e89b-12d3-a456-426614174000&page=1&size=20"
```

### Get Single Iteration

```bash
curl "/rest/scriptrunner/latest/custom/iterationsList/123e4567-e89b-12d3-a456-426614174000"
```

### Update Iteration

```bash
curl -X PUT /rest/scriptrunner/latest/custom/iterationsList/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -d '{
    "ite_description": "Updated description",
    "ite_dynamic_cutover_date": "2025-08-15T16:00:00"
  }'
```

### Delete Iteration

```bash
curl -X DELETE /rest/scriptrunner/latest/custom/iterationsList/123e4567-e89b-12d3-a456-426614174000
```

## 13. Notes

- Iterations API is fully integrated with Admin GUI and supports all CRUD operations
- Pagination metadata includes comprehensive navigation information
- Search functionality provides real-time filtering capabilities
- Date handling is flexible supporting both date-only and datetime formats
- Migration relationship is immutable after iteration creation
- API supports flexible field naming for improved client compatibility
- Comprehensive error handling with specific SQL state mappings
- All API endpoints require proper Confluence authentication

## 14. Related APIs

- **Migrations API:** Parent relationship for iteration filtering
- **Plans API:** Child relationship - iterations contain plan instances
- **Phases API:** Grandchild relationship via plans
- **Status API:** Provides status lookup data for iteration status fields

## 15. Change Log

- **2025-08-22:** Initial creation with comprehensive CRUD functionality
- **2025-08-22:** Added pagination, search, and filtering capabilities
- **2025-08-22:** Integrated with Admin GUI and comprehensive error handling
- **2025-08-25:** Updated documentation to match implementation - added flexible field naming, comprehensive error mapping, SQL state handling, and expanded examples

---

> **Note:** This specification is fully aligned with the current implementation in IterationsApi.groovy. Update this specification whenever the API changes to maintain accuracy between implementation and documentation.
