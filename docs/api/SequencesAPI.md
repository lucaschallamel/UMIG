# Sequences API Specification

> Comprehensive API specification for Sequences management in the UMIG project. Sequences represent ordered execution units within plans, supporting dependency management and predecessor relationships.

---

## 1. API Overview

- **API Name:** Sequences API v2 (Enhanced with PostgreSQL Patterns)
- **Purpose:** Manage migration execution sequences with ordering, dependencies, hierarchical filtering, and enhanced PostgreSQL compatibility
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-030 (Hierarchical Filtering), ADR-031 (Type Safety), ADR-037 (PostgreSQL Integration), ADR-040 (Enhanced Error Handling)

## 2. Endpoints

| Method | Path                            | Description                                         |
| ------ | ------------------------------- | --------------------------------------------------- |
| GET    | /sequences/master               | List all master sequence templates                  |
| POST   | /sequences/master               | Create new master sequence template                 |
| GET    | /sequences/master/{id}          | Get specific master sequence template               |
| PUT    | /sequences/master/{id}          | Update master sequence template                     |
| DELETE | /sequences/master/{id}          | Soft delete master sequence template                |
| PUT    | /sequences/master/{id}/order    | Update sequence order within plan (reordering)      |
| PUT    | /sequences/master/reorder       | Bulk reorder master sequences within plan           |
| GET    | /sequences                      | List sequence instances with hierarchical filtering |
| POST   | /sequences/instance             | Create sequence instance from master template       |
| GET    | /sequences/instance/{id}        | Get specific sequence instance                      |
| PUT    | /sequences/instance/{id}        | Update sequence instance                            |
| DELETE | /sequences/instance/{id}        | Delete sequence instance                            |
| PUT    | /sequences/instance/{id}/status | Update sequence instance status                     |
| PUT    | /sequences/instance/reorder     | Bulk reorder sequence instances within plan         |

## 3. Request Details

### 3.1. Path Parameters

| Name | Type | Required | Description                                 |
| ---- | ---- | -------- | ------------------------------------------- |
| id   | UUID | Yes      | Sequence identifier (master or instance ID) |

### 3.2. Query Parameters (Enhanced with Type Safety)

| Name        | Type           | Required | Description                                      |
| ----------- | -------------- | -------- | ------------------------------------------------ |
| migrationId | UUID           | No       | Filter sequences by migration (hierarchical)     |
| iterationId | UUID           | No       | Filter sequences by iteration (hierarchical)     |
| planId      | UUID           | No       | Filter sequences by plan instance (hierarchical) |
| teamId      | Integer        | No       | Filter sequences by owning team                  |
| status      | String/Integer | No       | Filter by status name ("DRAFT", "ACTIVE") or ID  |

**Type Safety Note:** All parameters undergo explicit type casting with PostgreSQL compatibility validation.

### 3.3. Request Body

#### Master Sequence Creation

- **Content-Type:** application/json
- **Schema:**

```json
{
  "plm_id": "uuid (required)",
  "tms_id": "integer (optional - auto-assigned from plan if not provided)",
  "sqm_name": "string (required)",
  "sqm_description": "string (optional)",
  "sqm_order": "integer (optional - auto-assigned as next available if not provided)",
  "sqm_status": "string or integer (optional - accepts both status names and IDs)",
  "planned_start_date": "string (optional - flexible date format)",
  "planned_end_date": "string (optional - flexible date format)",
  "predecessor_sqm_id": "uuid (optional)"
}
```

**Enhanced Features:**

- **Flexible Status Input:** Accepts both "DRAFT"/"ACTIVE"/"INACTIVE" (strings) or 1/2/3 (integers)
- **Multiple Date Formats:** Supports YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY, ISO 8601 - automatically converted to PostgreSQL date type
- **Auto-Assignment:** Team ID inherited from plan, sequence order auto-incremented
- **PostgreSQL Compatibility:** All fields converted to appropriate PostgreSQL types (java.sql.Date, java.sql.Timestamp)

- **Example - Basic Creation:**

```json
{
  "plm_id": "123e4567-e89b-12d3-a456-426614174000",
  "sqm_name": "Pre-Migration Validation",
  "sqm_description": "Validate system readiness before migration",
  "sqm_status": "DRAFT",
  "planned_start_date": "2025-03-15"
}
```

- **Example - Flexible Input Formats:**

```json
{
  "plm_id": "123e4567-e89b-12d3-a456-426614174000",
  "tms_id": 1,
  "sqm_name": "Data Migration Sequence",
  "sqm_status": 2,
  "planned_start_date": "15/03/2025",
  "planned_end_date": "2025-03-20T10:00:00Z",
  "sqm_order": 2
}
```

**Note:** In the flexible example, status uses integer ID (2), dates use different formats (DD/MM/YYYY and ISO 8601), demonstrating the enhanced parsing capabilities.

#### Sequence Instance Creation

- **Content-Type:** application/json
- **Schema:**

```json
{
  "sqm_id": "uuid (required)",
  "pli_id": "uuid (required)",
  "usr_id_owner": "integer (required)",
  "sqi_name": "string (optional - inherited from master if not provided)",
  "sqi_description": "string (optional - inherited from master if not provided)",
  "sqi_status": "string or integer (optional - accepts both status names and IDs)",
  "actual_start_date": "string (optional - flexible date format)",
  "actual_end_date": "string (optional - flexible date format)"
}
```

**Enhanced Features:**

- **Flexible Status Input:** Supports "DRAFT", "ACTIVE", "IN_PROGRESS", "COMPLETED", "ON_HOLD" (strings) or corresponding integer IDs
- **Actual Date Tracking:** Separate fields for actual execution dates with flexible format support
- **Inheritance:** Name and description inherited from master template if not overridden
- **PostgreSQL Integration:** Automatic conversion to PostgreSQL-compatible types

- **Example - Basic Instance Creation:**

```json
{
  "sqm_id": "123e4567-e89b-12d3-a456-426614174000",
  "pli_id": "987fcdeb-51a2-43d1-9c45-123456789abc",
  "usr_id_owner": 5,
  "sqi_name": "Q1 Pre-Migration Validation",
  "sqi_description": "First quarter validation sequence",
  "sqi_status": "DRAFT"
}
```

- **Example - With Flexible Date Formats:**

```json
{
  "sqm_id": "123e4567-e89b-12d3-a456-426614174000",
  "pli_id": "987fcdeb-51a2-43d1-9c45-123456789abc",
  "usr_id_owner": 5,
  "sqi_status": "IN_PROGRESS",
  "actual_start_date": "15/03/2025",
  "actual_end_date": "2025-03-20T14:30:00Z"
}
```

#### Sequence Order Update

- **Content-Type:** application/json
- **Schema:**

```json
{
  "sqm_order": "integer"
}
```

- **Example:**

```json
{
  "sqm_order": 3
}
```

## 4. Response Details

### 4.1. Success Response - Master Sequence

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "sqm_id": "uuid",
  "plm_id": "uuid",
  "plm_name": "string",
  "tms_id": "integer",
  "tms_name": "string",
  "sqm_name": "string",
  "sqm_description": "string",
  "sqm_order": "integer",
  "sqm_status": "integer (FK to status_sts)",
  "sts_id": "integer",
  "sts_name": "string",
  "sts_color": "string",
  "predecessor_sqm_id": "uuid",
  "predecessor_name": "string",
  "created_by": "string",
  "created_at": "datetime",
  "updated_by": "string",
  "updated_at": "datetime"
}
```

- **Example:**

```json
{
  "sqm_id": "123e4567-e89b-12d3-a456-426614174000",
  "plm_id": "987fcdeb-51a2-43d1-9c45-123456789abc",
  "plm_name": "Application Migration Plan",
  "tms_id": 1,
  "tms_name": "Infrastructure Team",
  "sqm_name": "Pre-Migration Validation",
  "sqm_description": "Validate system readiness before migration",
  "sqm_order": 1,
  "sqm_status": "ACTIVE",
  "sts_id": 2,
  "sts_name": "Active",
  "sts_color": "#28a745",
  "predecessor_sqm_id": null,
  "predecessor_name": null,
  "created_by": "admin",
  "created_at": "2025-07-15T10:30:00Z",
  "updated_by": "admin",
  "updated_at": "2025-07-15T10:30:00Z"
}
```

### 4.2. Success Response - Sequence Instance

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "sqi_id": "uuid",
  "sqm_id": "uuid",
  "sqm_name": "string",
  "pli_id": "uuid",
  "pli_name": "string",
  "ite_id": "uuid",
  "itr_name": "string",
  "mig_id": "uuid",
  "mig_name": "string",
  "sqi_name": "string",
  "sqi_description": "string",
  "sqi_order": "integer",
  "sqi_status": "integer (FK to status_sts)",
  "sts_id": "integer",
  "sts_name": "string",
  "sts_color": "string",
  "usr_id_owner": "integer",
  "owner_name": "string",
  "tms_id": "integer",
  "tms_name": "string",
  "created_by": "string",
  "created_at": "datetime",
  "updated_by": "string",
  "updated_at": "datetime"
}
```

### 4.3. Enhanced Error Responses (PostgreSQL-Compatible)

| Status Code | Content-Type     | Schema | Example                                                                                                                    | Description                          |
| ----------- | ---------------- | ------ | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 400         | application/json | Error  | `{"error": "Invalid status: INVALID_STATUS. Valid options: DRAFT, ACTIVE, INACTIVE"}`                                      | Bad request - validation/type errors |
| 400         | application/json | Error  | `{"error": "Invalid date format for planned_start_date. Supported formats: YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY, ISO 8601"}` | Date format validation               |
| 404         | application/json | Error  | `{"error": "Sequence not found"}`                                                                                          | Resource not found                   |
| 409         | application/json | Error  | `{"error": "A sequence with this name already exists in the specified plan (SQL State: 23505)"}`                           | Unique constraint violation          |
| 409         | application/json | Error  | `{"error": "Invalid plan ID - plan does not exist (SQL State: 23503)"}`                                                    | Foreign key violation                |
| 500         | application/json | Error  | `{"error": "Internal server error"}`                                                                                       | Server error                         |

**Enhanced Error Handling Features:**

- **PostgreSQL SQL State Codes:** Specific error codes (23503 for foreign key violations, 23505 for unique constraints)
- **Flexible Input Validation:** Clear guidance on supported formats for status and date fields
- **Auto-Assignment Guidance:** Helpful messages about auto-assignment behavior
- **Type Conversion Errors:** Specific feedback on PostgreSQL type conversion failures

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence session-based authentication
- **Permissions:**
  - Read operations: `confluence-users`
  - Create/Update operations: `confluence-users`
  - Delete operations: `confluence-administrators`

## 6. Rate Limiting & Security (Enhanced)

- **Rate Limits:** Standard Confluence limits apply
- **RLS (Row-Level Security):** No
- **Input Validation:** Enhanced PostgreSQL-compatible validation with explicit type casting
  - UUID parameters converted with PostgreSQL UUID validation
  - Date fields support multiple formats with java.sql.Date conversion
  - Status fields accept both string names and integer IDs with database lookup validation
  - Integer fields validated with proper PostgreSQL integer type casting
- **Type Safety:** All parameters undergo explicit casting following ADR-031 patterns
- **PostgreSQL Compatibility:** Uses java.sql.Date and java.sql.Timestamp for optimal database integration
- **Error Mapping:** SQL state codes (23503, 23505) mapped to meaningful HTTP status codes
- **Other Security Considerations:** SQL injection prevention through parameterized queries with PostgreSQL-optimized binding

## 7. Business Logic & Side Effects

- **Key Logic (Enhanced):**
  - Master sequences serve as templates for creating instances with PostgreSQL type consistency
  - Sequences maintain execution order within plans via auto-incremented `sqm_order` field
  - Predecessor relationships create execution dependencies with referential integrity
  - Sequence instances inherit order and properties from master with type-safe conversion
  - Master sequences cannot be deleted if active instances exist (enforced via foreign key constraints)
  - **Status Flexibility:** Accepts both string names ("DRAFT", "ACTIVE") and integer IDs for seamless integration
  - **Date Parsing:** Multiple date formats automatically converted to PostgreSQL date/timestamp types
  - **Auto-Assignment:** Team ID and order automatically assigned when not provided
- **Side Effects:**
  - Creating instances generates phases hierarchically with proper sequence numbering
  - Order changes affect sequence execution flow with validation
  - Status changes trigger computed field updates (phase_count, step_count, completion_percentage)
  - Date updates maintain PostgreSQL type consistency
- **Idempotency:** PUT operations are idempotent for status and field updates with PostgreSQL transaction safety
- **Enhanced Metadata:** Repository layer enriches responses with computed fields and status metadata

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `sequences_master` - Master sequence templates
  - `sequences_instance` - Sequence instances
  - `plans_master` - Parent plan templates
  - `plans_instance` - Parent plan instances
  - `teams_master` - Team ownership
  - `statuses` - Status lookup
  - `users` - User information
  - `iterations` - Iteration associations
- **External APIs:** None
- **Other Services:** Email notification service for status changes

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** 6-month notice for breaking changes

## 10. Testing & Mock Data

- **Unit Tests:** Covered in API integration test suite
- **Integration Tests:** Via PlansApi test coverage (sequences created with plans)
- **E2E Tests:** Via Postman collection
- **Mock Data/Fixtures:** Generated through data generation scripts (001-100)

## 11. Hierarchical Filtering

The Sequences API supports progressive hierarchical filtering:

### Migration Level

```
GET /sequences?migrationId=123e4567-e89b-12d3-a456-426614174000
```

Returns all sequence instances within the specified migration.

### Iteration Level

```
GET /sequences?iterationId=987fcdeb-51a2-43d1-9c45-123456789abc
```

Returns all sequence instances within the specified iteration.

### Plan Level

```
GET /sequences?planId=456e7890-e89b-12d3-a456-426614174000
```

Returns all sequence instances within the specified plan instance.

### Combined Filtering

```
GET /sequences?migrationId={mig-id}&teamId=1&status=ACTIVE
```

Returns sequence instances matching all specified criteria.

## 12. Ordering and Dependencies

### Sequence Ordering

Sequences within a plan are ordered using the `sqm_order` field:

- Order determines execution sequence within a plan
- Lower numbers execute first (1, 2, 3, ...)
- Order can be updated via `PUT /sequences/master/{id}/order`

### Predecessor Relationships

Sequences can have predecessor dependencies:

- `predecessor_sqm_id` links to another sequence that must complete first
- Creates execution dependency chains
- Prevents parallel execution of dependent sequences

### Example Dependency Chain

```
Sequence 1: Pre-Migration Validation (order: 1, predecessor: null)
Sequence 2: Application Shutdown (order: 2, predecessor: Sequence 1)
Sequence 3: Data Migration (order: 3, predecessor: Sequence 2)
Sequence 4: Application Startup (order: 4, predecessor: Sequence 3)
```

## 13. Enhanced Features Summary (PostgreSQL Integration)

### 13.1. PostgreSQL Type Casting Enhancements

- **Date Handling:** Multiple input formats (YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY, ISO 8601) automatically converted to java.sql.Date for PostgreSQL compatibility
- **Status Flexibility:** Accepts both string status names ("DRAFT", "ACTIVE", "INACTIVE") and integer status IDs for flexible API usage
- **Type Safety:** All input parameters explicitly cast to appropriate types following ADR-031 patterns
- **UUID Validation:** Enhanced UUID format validation with PostgreSQL UUID type conversion

### 13.2. Auto-Assignment Features

- **Team Inheritance:** Team ID (tms_id) automatically assigned from parent plan when not provided
- **Order Management:** Sequence order (sqm_order) auto-incremented to next available position
- **Default Status:** Status defaults to "DRAFT" for new sequences if not specified
- **Computed Fields:** Phase count, step count, and completion percentage automatically calculated

### 13.3. Enhanced Error Handling

- **PostgreSQL SQL State Codes:** Specific error mapping (23503 for foreign key violations, 23505 for unique constraints)
- **Helpful Error Messages:** Clear guidance on valid input formats and auto-assignment behavior
- **Type Conversion Feedback:** Detailed error messages for PostgreSQL type conversion failures

### 13.4. Repository vs API Layer Separation

- **Repository Enrichment:** Data enrichment and computation handled in repository layer
- **API Passthrough:** API layer passes enriched data without duplication
- **Single Source of Truth:** Repository layer as the authoritative source for business logic

## 14. Troubleshooting Guide

### 14.1. Common Status Issues

- **Problem:** "Invalid status name: INVALID_STATUS"
- **Solution:** Use valid status names: "DRAFT", "ACTIVE", "INACTIVE" for master sequences; "DRAFT", "ACTIVE", "IN_PROGRESS", "COMPLETED", "ON_HOLD" for instances
- **Alternative:** Use integer status IDs (1=DRAFT, 2=ACTIVE, etc.)

### 14.2. Date Format Issues

- **Problem:** "Invalid date format for planned_start_date"
- **Solution:** Use supported formats: YYYY-MM-DD, DD/MM/YYYY, MM-DD-YYYY, or ISO 8601
- **Example:** "2025-03-15", "15/03/2025", "03-15-2025", or "2025-03-15T10:00:00Z"

### 14.3. Auto-Assignment Behavior

- **Problem:** Team ID or order not as expected
- **Solution:** Sequence inherits team from parent plan, order auto-increments - provide explicit values if needed
- **Verification:** Check response for computed tms_id and sqm_order values

### 14.4. PostgreSQL Constraint Violations

- **Problem:** "SQL State: 23503" or "SQL State: 23505" errors
- **Solution:** Check foreign key references (plan IDs, team IDs, user IDs) and unique constraints (sequence names within plans)
- **Prevention:** Validate parent resources exist before creating sequences

## 15. Changelog

- **2025-08-22:** Enhanced with PostgreSQL integration patterns, flexible status handling, multiple date formats, auto-assignment features, and comprehensive error handling
- **2025-07-15:** Created comprehensive API specification with audit fields and dependency documentation
- **2025-08-01:** Initial implementation of Sequences API v2 with ordering support
- **Author:** Claude AI Assistant (UMIG Documentation Update)

---

> **Note:** This specification reflects the enhanced production state of the Sequences API with PostgreSQL integration patterns. All audit fields (created_by, created_at, updated_by, updated_at) use PostgreSQL-compatible timestamp types. The API supports complex dependency management, ordering, flexible input formats, auto-assignment features, and enhanced error handling for sophisticated migration execution control. Status fields accept both string names and integer IDs, date fields support multiple formats with automatic PostgreSQL type conversion, and computed metadata fields provide real-time sequence analytics.
