# Migration Types API Specification

> This document defines the Migration Types API for managing migration type master data in the UMIG system. This API provides comprehensive CRUD operations with advanced sorting, filtering, and specialized endpoints for UI integration and statistical reporting.

---

## 1. API Overview

- **API Name:** Migration Types API v2
- **Purpose:** Manage migration type master data with comprehensive CRUD operations, advanced sorting/filtering capabilities, and specialized endpoints for UI integration and statistical reporting. Provides centralized management of migration type definitions used throughout the UMIG system.
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-031 (Type Safety Requirements), ADR-043 (Parameter Validation), ADR-051 (RBAC Implementation)

## 2. Endpoints

| Method | Path                          | Description                                    |
| ------ | ----------------------------- | ---------------------------------------------- |
| GET    | `/migrationTypes`             | Get all migration types with sorting/filtering |
| GET    | `/migrationTypes/{id}`        | Get a specific migration type by ID            |
| GET    | `/migrationTypes/code/{code}` | Get a specific migration type by code          |
| GET    | `/migrationTypes/selection`   | Get active migration types for dropdowns       |
| GET    | `/migrationTypes/stats`       | Get migration type usage statistics            |
| POST   | `/migrationTypes`             | Create a new migration type                    |
| POST   | `/migrationTypes/reorder`     | Reorder migration types by display order       |
| PUT    | `/migrationTypes/{id}`        | Update an existing migration type by ID        |
| PUT    | `/migrationTypes/code/{code}` | Update an existing migration type by code      |
| DELETE | `/migrationTypes/{id}`        | Delete a migration type by ID                  |
| DELETE | `/migrationTypes/code/{code}` | Delete a migration type by code                |

## 3. Request Details

### 3.1. Path Parameters

| Name | Type    | Required | Description                             |
| ---- | ------- | -------- | --------------------------------------- |
| id   | integer | Yes      | Migration type identifier               |
| code | string  | Yes      | Migration type code (unique identifier) |

### 3.2. Query Parameters

| Name            | Type    | Required | Description                                                              |
| --------------- | ------- | -------- | ------------------------------------------------------------------------ |
| includeInactive | boolean | No       | Include inactive migration types in results (default: false)             |
| sort            | string  | No       | Sort field (see supported fields below)                                  |
| direction       | string  | No       | Sort direction: 'asc' or 'desc' (default: 'asc')                         |
| page            | integer | No       | Page number for pagination (future enhancement, default: 1)              |
| size            | integer | No       | Page size for pagination (future enhancement, range: 1-100, default: 50) |

#### Supported Sort Fields (12 total)

- `mtm_id` - Migration type ID
- `mtm_code` - Migration type code
- `mtm_name` - Migration type name
- `mtm_description` - Migration type description
- `mtm_color` - Display color
- `mtm_icon` - Display icon
- `mtm_display_order` - Display order
- `mtm_active` - Active status
- `created_by` - Creator user
- `created_at` - Creation timestamp
- `updated_by` - Last modifier user
- `updated_at` - Last update timestamp

### 3.3. Request Body

#### Create/Update Migration Type

- **Content-Type:** application/json
- **Schema:**

```json
{
  "mtm_code": "string",
  "mtm_name": "string",
  "mtm_description": "string",
  "mtm_color": "string",
  "mtm_icon": "string",
  "mtm_display_order": "integer",
  "mtm_active": "boolean"
}
```

- **Example:**

```json
{
  "mtm_code": "INFRA_MIGRATION",
  "mtm_name": "Infrastructure Migration",
  "mtm_description": "Migration of core infrastructure components including servers, network, and storage systems",
  "mtm_color": "#2196F3",
  "mtm_icon": "icon-server",
  "mtm_display_order": 10,
  "mtm_active": true
}
```

#### Reorder Migration Types

- **Content-Type:** application/json
- **Schema:**

```json
{
  "orderMap": {
    "mtm_id": "new_display_order"
  }
}
```

- **Example:**

```json
{
  "orderMap": {
    "1": 20,
    "2": 10,
    "3": 30
  }
}
```

## 4. Response Details

### 4.1. Success Response

#### Single Migration Type

- **Status Code:** 200 (GET), 201 (POST), 200 (PUT)
- **Content-Type:** application/json
- **Schema:**

```json
{
  "mtm_id": "integer",
  "mtm_code": "string",
  "mtm_name": "string",
  "mtm_description": "string",
  "mtm_color": "string",
  "mtm_icon": "string",
  "mtm_display_order": "integer",
  "mtm_active": "boolean",
  "created_by": "string",
  "created_at": "timestamp",
  "updated_by": "string",
  "updated_at": "timestamp"
}
```

- **Example:**

```json
{
  "mtm_id": 1,
  "mtm_code": "APP_MIGRATION",
  "mtm_name": "Application Migration",
  "mtm_description": "Migration of business applications and associated data",
  "mtm_color": "#4CAF50",
  "mtm_icon": "icon-application",
  "mtm_display_order": 5,
  "mtm_active": true,
  "created_by": "admin",
  "created_at": "2025-09-01T10:00:00Z",
  "updated_by": "admin",
  "updated_at": "2025-09-01T10:00:00Z"
}
```

#### Multiple Migration Types (List/Array)

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:** Array of migration type objects

```json
[
  {
    "mtm_id": "integer",
    "mtm_code": "string",
    "mtm_name": "string",
    "mtm_description": "string",
    "mtm_color": "string",
    "mtm_icon": "string",
    "mtm_display_order": "integer",
    "mtm_active": "boolean",
    "created_by": "string",
    "created_at": "timestamp",
    "updated_by": "string",
    "updated_at": "timestamp"
  }
]
```

#### Selection Endpoint Response

- **Schema:** Simplified migration type objects for dropdown usage

```json
[
  {
    "mtm_id": "integer",
    "mtm_code": "string",
    "mtm_name": "string",
    "mtm_color": "string",
    "mtm_icon": "string"
  }
]
```

#### Statistics Endpoint Response

- **Schema:** Usage statistics by migration type

```json
[
  {
    "mtm_id": "integer",
    "mtm_code": "string",
    "mtm_name": "string",
    "usage_count": "integer",
    "last_used": "timestamp"
  }
]
```

#### Reorder Success Response

- **Schema:**

```json
{
  "message": "string",
  "updatedCount": "integer"
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Description                                     | Example Response                                                                                          |
| ----------- | ---------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 400         | application/json | Bad Request (validation errors, invalid format) | `{"error": "mtm_code and mtm_name are required"}`                                                         |
| 400         | application/json | Invalid sort field                              | `{"error": "Invalid sort field 'invalid_field'. Allowed fields are: mtm_id, mtm_code..."}`                |
| 400         | application/json | Invalid ID format                               | `{"error": "Invalid migration type ID format"}`                                                           |
| 401         | application/json | Unauthorized (not logged in)                    | `{"error": "Authentication required"}`                                                                    |
| 403         | application/json | Forbidden (insufficient permissions)            | `{"error": "Administrative privileges required"}`                                                         |
| 404         | application/json | Migration type not found                        | `{"error": "Migration type not found"}`                                                                   |
| 409         | application/json | Conflict (duplicate code, constraint violation) | `{"error": "Migration type code already exists"}`                                                         |
| 409         | application/json | Cannot delete due to relationships              | `{"error": "Cannot delete migration type due to existing relationships", "blockingRelationships": {...}}` |
| 500         | application/json | Internal server error                           | `{"error": "Database error occurred", "details": "Connection timeout"}`                                   |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication
- **Permissions:**
  - **Read Operations (GET):** `groups: ["confluence-users", "confluence-administrators"]`
  - **Write Operations (POST/PUT/DELETE):** `groups: ["confluence-administrators"]`
- **Security Notes:**
  - UI-level RBAC currently implemented (SUPERADMIN only) as interim solution
  - API-level RBAC planned for Phase 5 implementation (ADR-051)
  - Administrative operations restricted to confluence-administrators group

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply (no additional throttling)
- **RLS (Row-Level Security):** No (data access controlled by Confluence permissions)
- **Input Validation:**
  - **Type Safety:** All parameters explicitly cast per ADR-031 and ADR-043
  - **Sort Field Validation:** Whitelist validation against 12 allowed sort fields
  - **Sort Direction Validation:** Limited to 'asc' or 'desc' values
  - **Page Size Validation:** Range 1-100 for pagination parameters
  - **Code Uniqueness:** Enforced at database and application level
  - **Color Format:** Hex color format validation (#RRGGBB)
  - **SQL Injection Prevention:** All queries use parameterized statements
  - **XSS Prevention:** Input sanitization on all string fields
- **Other Security Considerations:**
  - Audit trail maintained (created_by, created_at, updated_by, updated_at)
  - Blocking relationship checks prevent orphaned references
  - Graceful error handling without exposing internal system details

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Automatic display order management for new migration types
  - Uniqueness enforcement on migration type codes
  - Active/inactive status management
  - Relationship validation before deletion
- **Side Effects:**
  - Creation/update operations set audit fields automatically
  - Reorder operations affect multiple records simultaneously
  - Deletion checks for blocking relationships across system
- **Idempotency:**
  - GET operations: Fully idempotent
  - PUT operations: Idempotent (repeated calls with same data produce same result)
  - POST operations: Not idempotent (creates new resource each call)
  - DELETE operations: Idempotent (subsequent deletes return 404 but no error)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `migration_types_master` (primary table)
  - Related tables checked for blocking relationships on delete:
    - `migrations_master` (migration type references)
    - Other system tables with foreign key relationships

- **External APIs:** None
- **Other Services:**
  - **MigrationTypesRepository:** Data access layer with all CRUD operations
  - **DatabaseUtil:** Connection management and transaction handling
  - **UserService:** Authentication context and audit trail management
  - **Confluence UserManager:** User identification and permission validation

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment
- **Backward Compatibility:** Current implementation maintains compatibility with existing clients
- **Migration Path:** Future API changes will provide clear migration documentation

## 10. Testing & Mock Data

- **Unit Tests:** Repository tests cover all data access operations and validation logic
- **Integration Tests:** Full CRUD operations tested in integration test suite with real database
- **E2E Tests:** Admin GUI integration and Postman collection validation
- **Mock Data/Fixtures:** Available via `npm run generate-data:erase` command
- **Test Coverage:** All endpoints covered in automated test suite (`local-dev-setup/__tests__/api/iterationTypesApi.test.js`)

## 11. Business Logic & Validation Rules

### Create Migration Type

- **Required Fields:** `mtm_code`, `mtm_name`
- **Code Uniqueness:** Must be unique across all migration types
- **Display Order:** Auto-assigned if not provided
- **Active Status:** Defaults to `true` if not specified
- **Audit Fields:** Automatically set during creation
- **Color Validation:** Must be valid hex color format if provided
- **Error Conditions:**
  - Missing required fields → 400 Bad Request
  - Duplicate code → 409 Conflict
  - Invalid JSON format → 400 Bad Request

### Update Migration Type

- **Identification:** By ID or code (two endpoints available)
- **Partial Updates:** Supported - only provided fields are updated
- **Code Changes:** Allowed if new code is unique
- **Audit Fields:** `updated_by` and `updated_at` automatically set
- **Error Conditions:**
  - Migration type not found → 404 Not Found
  - Code conflict on update → 409 Conflict
  - Invalid data format → 400 Bad Request

### Delete Migration Type

- **Relationship Validation:** Checks for blocking relationships before deletion
- **Blocking Relationships:** Any foreign key references prevent deletion
- **Soft vs Hard Delete:** Hard delete - record is permanently removed
- **Error Conditions:**
  - Migration type not found → 404 Not Found
  - Blocking relationships exist → 409 Conflict with relationship details
  - Foreign key constraint violation → 409 Conflict

### Reorder Migration Types

- **Batch Operation:** Updates multiple records in single transaction
- **Order Map Format:** ID to new display order mapping
- **Validation:** All IDs must exist, all orders must be positive integers
- **Atomicity:** All updates succeed or all fail
- **Error Conditions:**
  - Invalid order map format → 400 Bad Request
  - Non-existent migration type ID → 400 Bad Request
  - Invalid order values → 400 Bad Request

### Sorting and Filtering

- **Default Sort:** `mtm_display_order ASC, mtm_code ASC`
- **Custom Sorting:** 12 supported fields with ASC/DESC directions
- **Secondary Sorting:** Always applied for consistent ordering
- **Active Filter:** `includeInactive=false` by default
- **Validation:** Sort fields validated against whitelist
- **Error Conditions:**
  - Invalid sort field → 400 Bad Request with allowed fields list
  - Invalid sort direction → Defaults to 'asc'

## 12. Examples

### Get All Active Migration Types

```bash
curl -X GET '/rest/scriptrunner/latest/custom/migrationTypes' \
  -H "Accept: application/json"
```

### Get All Migration Types with Sorting

```bash
curl -X GET '/rest/scriptrunner/latest/custom/migrationTypes?sort=mtm_name&direction=desc&includeInactive=true' \
  -H "Accept: application/json"
```

### Get Migration Type by ID

```bash
curl -X GET '/rest/scriptrunner/latest/custom/migrationTypes/1' \
  -H "Accept: application/json"
```

### Get Migration Type by Code

```bash
curl -X GET '/rest/scriptrunner/latest/custom/migrationTypes/code/APP_MIGRATION' \
  -H "Accept: application/json"
```

### Get Selection Data for Dropdowns

```bash
curl -X GET '/rest/scriptrunner/latest/custom/migrationTypes/selection' \
  -H "Accept: application/json"
```

### Get Usage Statistics

```bash
curl -X GET '/rest/scriptrunner/latest/custom/migrationTypes/stats' \
  -H "Accept: application/json"
```

### Create New Migration Type

```bash
curl -X POST '/rest/scriptrunner/latest/custom/migrationTypes' \
  -H "Content-Type: application/json" \
  -d '{
    "mtm_code": "DATA_MIGRATION",
    "mtm_name": "Data Migration",
    "mtm_description": "Migration of enterprise data and databases",
    "mtm_color": "#FF9800",
    "mtm_icon": "icon-database",
    "mtm_display_order": 15,
    "mtm_active": true
  }'
```

### Update Migration Type

```bash
curl -X PUT '/rest/scriptrunner/latest/custom/migrationTypes/1' \
  -H "Content-Type: application/json" \
  -d '{
    "mtm_description": "Updated description for application migration",
    "mtm_color": "#4CAF50"
  }'
```

### Reorder Migration Types

```bash
curl -X POST '/rest/scriptrunner/latest/custom/migrationTypes/reorder' \
  -H "Content-Type: application/json" \
  -d '{
    "orderMap": {
      "1": 30,
      "2": 10,
      "3": 20
    }
  }'
```

### Delete Migration Type

```bash
curl -X DELETE '/rest/scriptrunner/latest/custom/migrationTypes/1' \
  -H "Accept: application/json"
```

## 13. Notes

- **Performance:** Optimized queries with proper indexing on `mtm_code`, `mtm_display_order`, and `mtm_active` fields
- **Concurrency:** Database-level constraints ensure data consistency in multi-user scenarios
- **Caching:** No application-level caching implemented - relies on database query optimization
- **Future Enhancements:**
  - Pagination implementation ready (page/size parameters accepted)
  - API-level RBAC implementation planned for Phase 5
  - Audit log integration for compliance tracking
- **Admin GUI Integration:** Full CRUD operations supported through Admin GUI with SUPERADMIN role restriction

## 14. Related APIs

- **Migrations API:** References migration types through `mtm_id` foreign key relationships
- **Import API:** Uses migration types for data validation and categorization during bulk imports
- **Status API:** May reference migration type data for status reporting and categorization
- **Controls API:** Administrative controls may affect migration type visibility and management

## 15. Change Log

- **2025-09-08:** Initial API specification creation for US-042 Migration Types Management implementation
- **2025-09-08:** Added comprehensive CRUD operations with advanced sorting, filtering, and specialized endpoints
- **2025-09-08:** Documented security model, validation rules, and error handling patterns
- **2025-09-08:** Added reorder functionality and usage statistics endpoints

---

> **Note:** This specification reflects the complete implementation of US-042 Migration Types Management. Update this specification whenever the API changes. Reference this spec in code reviews and ADRs. All endpoints have been implemented and tested through the comprehensive test suite.
