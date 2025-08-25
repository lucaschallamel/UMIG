# Plans API Specification

> Comprehensive API specification for Plans management in the UMIG project. Plans represent migration execution blueprints with master templates and instances for specific iterations.

---

## 1. API Overview

- **API Name:** Plans API v2 (Enhanced with PostgreSQL Patterns)
- **Purpose:** Manage migration execution plans with hierarchical filtering, template instantiation, and flexible input handling
- **Owner:** UMIG Development Team
- **Enhanced Features:** Flexible status handling, enhanced date parsing, auto-assignment patterns, PostgreSQL compatibility
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-030 (Hierarchical Filtering), ADR-031 (Type Safety), US-031 (Admin GUI Integration), Migrations API Breakthrough Patterns

## 2. Endpoints

| Method | Path                 | Description                                     |
| ------ | -------------------- | ----------------------------------------------- |
| GET    | /plans/master        | List all master plan templates                  |
| POST   | /plans/master        | Create new master plan template                 |
| GET    | /plans/master/{id}   | Get specific master plan template               |
| PUT    | /plans/master/{id}   | Update master plan template                     |
| DELETE | /plans/master/{id}   | Soft delete master plan template                |
| GET    | /plans               | List plan instances with hierarchical filtering |
| POST   | /plans/instance      | Create plan instance from master template       |
| GET    | /plans/instance/{id} | Get specific plan instance                      |
| PUT    | /plans/instance/{id} | Update plan instance                            |
| DELETE | /plans/instance/{id} | Delete plan instance                            |
| PUT    | /plans/{id}/status   | Update plan instance status                     |

## 3. Request Details

### 3.1. Path Parameters

| Name | Type | Required | Description                             |
| ---- | ---- | -------- | --------------------------------------- |
| id   | UUID | Yes      | Plan identifier (master or instance ID) |

### 3.2. Query Parameters

| Name        | Type    | Required | Description                              |
| ----------- | ------- | -------- | ---------------------------------------- |
| migrationId | UUID    | No       | Filter plans by migration (hierarchical) |
| iterationId | UUID    | No       | Filter plans by iteration (hierarchical) |
| teamId      | Integer | No       | Filter plans by owning team              |
| statusId    | Integer | No       | Filter plans by status                   |

### 3.3. Request Body

#### Master Plan Creation

- **Content-Type:** application/json
- **Schema:**

```json
{
  "tms_id": "integer",
  "plm_name": "string",
  "plm_description": "string (optional)",
  "plm_status": "integer (FK to status_sts)"
}
```

- **Example:**

```json
{
  "tms_id": 1,
  "plm_name": "Application Migration Plan",
  "plm_description": "Comprehensive plan for migrating core applications",
  "plm_status": "DRAFT"
}
```

**Enhanced Status Handling Examples:**

```json
// Using status name (string)
{
  "plm_status": "PLANNING"
}

// Using status ID (integer)
{
  "plm_status": 1
}

// Both formats are supported for flexible input
{
  "plm_status": "ACTIVE"  // Resolved to ID automatically
}
```

#### Plan Instance Creation

- **Content-Type:** application/json
- **Schema:**

```json
{
  "plm_id": "uuid",
  "ite_id": "uuid",
  "usr_id_owner": "integer",
  "pli_name": "string (optional)",
  "pli_description": "string (optional)"
}
```

- **Example:**

```json
{
  "plm_id": "123e4567-e89b-12d3-a456-426614174000",
  "ite_id": "987fcdeb-51a2-43d1-9c45-123456789abc",
  "usr_id_owner": 5,
  "pli_name": "Q1 2025 App Migration",
  "pli_description": "First quarter implementation of app migration plan"
}
```

## 4. Response Details

### 4.1. Success Response - Master Plan

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "plm_id": "uuid",
  "tms_id": "integer",
  "tms_name": "string",
  "plm_name": "string",
  "plm_description": "string",
  "plm_status": "integer (FK to status_sts)",
  "sts_id": "integer",
  "sts_name": "string",
  "sts_color": "string",
  "created_by": "string",
  "created_at": "datetime",
  "updated_by": "string",
  "updated_at": "datetime"
}
```

- **Example:**

```json
{
  "plm_id": "123e4567-e89b-12d3-a456-426614174000",
  "tms_id": 1,
  "tms_name": "Infrastructure Team",
  "plm_name": "Application Migration Plan",
  "plm_description": "Comprehensive plan for migrating core applications",
  "plm_status": "ACTIVE",
  "sts_id": 2,
  "sts_name": "Active",
  "sts_color": "#28a745",
  "created_by": "admin",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_by": "admin",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### 4.2. Success Response - Plan Instance

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "pli_id": "uuid",
  "plm_id": "uuid",
  "plm_name": "string",
  "ite_id": "uuid",
  "itr_name": "string",
  "mig_name": "string",
  "pli_name": "string",
  "pli_description": "string",
  "pli_status": "integer (FK to status_sts)",
  "sts_id": "integer",
  "sts_name": "string",
  "sts_color": "string",
  "usr_id_owner": "integer",
  "owner_name": "string",
  "tms_id": "integer",
  "created_by": "string",
  "created_at": "datetime",
  "updated_by": "string",
  "updated_at": "datetime"
}
```

### 4.3. Error Responses (Enhanced PostgreSQL Patterns)

| Status Code | Content-Type     | Schema | Example                                                                                      | Description                                 |
| ----------- | ---------------- | ------ | -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 400         | application/json | Error  | `{"error": "Invalid plan ID format"}`                                                        | Bad request - invalid parameters            |
| 400         | application/json | Error  | `{"error": "Invalid status name: UNKNOWN. Available statuses: PLANNING, ACTIVE, COMPLETED"}` | Invalid status name with suggestions        |
| 400         | application/json | Error  | `{"error": "Invalid date format. Use yyyy-MM-dd or ISO datetime"}`                           | Enhanced date parsing error                 |
| 404         | application/json | Error  | `{"error": "Plan not found"}`                                                                | Resource not found                          |
| 409         | application/json | Error  | `{"error": "Plan with this name already exists"}`                                            | Conflict - duplicate name (SQL State 23505) |
| 409         | application/json | Error  | `{"error": "Invalid owner user ID 999 - user does not exist"}`                               | Foreign key constraint (SQL State 23503)    |
| 500         | application/json | Error  | `{"error": "Internal server error"}`                                                         | Server error                                |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence session-based authentication
- **Permissions:**
  - Read operations: `confluence-users`
  - Create/Update operations: `confluence-users`
  - Delete operations: `confluence-administrators`

## 6. Rate Limiting & Security

- **Rate Limits:** Standard Confluence limits apply
- **RLS (Row-Level Security):** No
- **Input Validation:**
  - All UUID and integer parameters validated with explicit casting (ADR-031)
  - Flexible status input handling (string names or integer IDs)
  - Enhanced date format support (yyyy-MM-dd, ISO datetime with milliseconds)
  - Auto-assignment patterns for required fields
- **PostgreSQL Compatibility:** SQL State error code mapping (23503→400, 23505→409)
- **Other Security Considerations:** SQL injection prevention through parameterized queries with prepared statements

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Master plans serve as templates for creating instances
  - Plan instances inherit properties from master but can override name/description
  - Master plans cannot be deleted if active instances exist
  - Status updates trigger audit field updates
- **Side Effects:**
  - Creating instances generates sequences and phases hierarchically
  - Status changes may affect dependent sequences
- **Idempotency:** PUT operations are idempotent for status and field updates

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `plans_master` - Master plan templates
  - `plans_instance` - Plan instances
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

- **Unit Tests:** `PlansApiUnitTest.groovy`, `PlansApiUnitTestSimple.groovy`
- **Integration Tests:** Covered in API integration test suite
- **E2E Tests:** Via Postman collection
- **Mock Data/Fixtures:** Generated through data generation scripts (001-100)

## 11. Hierarchical Filtering

The Plans API supports progressive hierarchical filtering:

### Migration Level

```
GET /plans?migrationId=123e4567-e89b-12d3-a456-426614174000
```

Returns all plan instances within the specified migration.

### Iteration Level

```
GET /plans?iterationId=987fcdeb-51a2-43d1-9c45-123456789abc
```

Returns all plan instances within the specified iteration.

### Combined Filtering

```
GET /plans?migrationId={mig-id}&teamId=1&statusId=2
```

Returns plan instances matching all specified criteria.

## 12. Enhanced Features (PostgreSQL Patterns)

### 12.1. Flexible Status Handling

The Plans API supports dual-format status input for enhanced usability:

**Status Names (Strings):**

```json
{
  "plm_status": "PLANNING" // Automatically resolved to status ID
}
```

**Status IDs (Integers):**

```json
{
  "plm_status": 1 // Direct database reference
}
```

**Benefits:**

- Enhanced developer experience with readable status names
- Backward compatibility with integer IDs
- Automatic validation against status_sts table
- Comprehensive error messages for invalid statuses

### 12.2. Enhanced Date Parsing

Multiple date format support with automatic PostgreSQL type conversion:

**Supported Formats:**

- `yyyy-MM-dd` - Simple date format
- `yyyy-MM-dd'T'HH:mm:ss` - ISO datetime format
- `yyyy-MM-dd'T'HH:mm:ss.SSS` - ISO datetime with milliseconds

**Examples:**

```json
{
  "startDate": "2025-03-15", // Simple date
  "endDate": "2025-06-30T18:00:00", // ISO datetime
  "businessCutoverDate": "2025-05-15T14:30:00.000" // ISO with milliseconds
}
```

### 12.3. Auto-Assignment Patterns

**Owner Assignment Fallback Strategy:**

1. Use provided `usr_id_owner` if valid
2. Fallback to system admin user if available
3. Fallback to any active user
4. Error if no users exist

**Status Assignment:**

1. Use provided status (name or ID) if valid
2. Fallback to "PLANNING" status
3. Fallback to "Draft" or "New" if available
4. Error with available status list

## 13. Troubleshooting Guide

### 13.1. Common PostgreSQL Compatibility Issues

**Invalid Status Error:**

```json
{
  "error": "Invalid status name: UNKNOWN. Available statuses: PLANNING, ACTIVE, COMPLETED"
}
```

**Solution:** Use one of the suggested status names or check status_sts table.

**Date Parsing Failure:**

```json
{
  "error": "Invalid date format. Use yyyy-MM-dd or ISO datetime"
}
```

**Solution:** Ensure dates match supported formats or use java.sql.Date/Timestamp types.

**Foreign Key Constraint Violation (SQL State 23503):**

```json
{
  "error": "Invalid owner user ID 999 - user does not exist"
}
```

**Solution:** Verify user exists in users_usr table or omit for auto-assignment.

**Unique Constraint Violation (SQL State 23505):**

```json
{
  "error": "A plan with the name 'Existing Plan' already exists"
}
```

**Solution:** Choose a unique plan name or update existing plan instead.

### 13.2. Enhanced Error Recovery

The API provides specific error messages with recovery guidance:

- Invalid status: Lists available status options
- Invalid user: Suggests checking user table or using auto-assignment
- Invalid date: Shows supported date formats
- Constraint violations: Explains specific database constraint

### 13.3. Cross-Reference with Related APIs

**Pattern Consistency:**

- Same PostgreSQL patterns used in Migrations API
- Consistent error handling across all v2 APIs
- Shared status resolution logic
- Unified date parsing utilities

**Related Documentation:**

- US-031: Admin GUI Complete Integration
- ADR-031: Type Safety and Explicit Casting
- Migrations API: Reference implementation for these patterns

## 14. Changelog

- **2025-08-22:** Enhanced with PostgreSQL patterns, flexible status handling, and comprehensive troubleshooting
- **2025-01-15:** Created comprehensive API specification with audit fields
- **2024-12-15:** Initial implementation of Plans API v2
- **Author:** Claude AI Assistant (UMIG Documentation Update)

---

> **Note:** This specification reflects the current production state of the Plans API. All audit fields (created_by, created_at, updated_by, updated_at) are now standardized across all entities per US-002b implementation.
