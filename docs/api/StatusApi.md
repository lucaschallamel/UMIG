# Status API Specification

> REST API for status lookup data in the UMIG project. Provides status information for different entity types (Migration, Iteration, Plan, etc.) to support consistent status management across the application.

---

## 1. API Overview

- **API Name:** Status API v2
- **Purpose:** Provide status lookup data for different entity types with color coding and metadata
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), US-031 (Admin GUI Integration)

## 2. Endpoints

| Method | Path    | Description                                     |
| ------ | ------- | ----------------------------------------------- |
| GET    | /status | Get statuses by entity type with color metadata |

## 3. Request Details

### 3.1. Path Parameters

None.

### 3.2. Query Parameters

| Name       | Type   | Required | Description                                        |
| ---------- | ------ | -------- | -------------------------------------------------- |
| entityType | String | Yes      | Entity type to get statuses for (case-insensitive) |

**Valid Entity Types:**

- Migration
- Iteration
- Plan
- Sequence
- Phase
- Step
- Control
- Instruction

### 3.3. Request Body

Not applicable - GET endpoint only.

## 4. Response Details

### 4.1. Success Response

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "id": "integer",
    "name": "string",
    "color": "string (hex color code)",
    "type": "string"
  }
]
```

- **Example:**

```json
[
  {
    "id": 1,
    "name": "PLANNING",
    "color": "#FFA500",
    "type": "Migration"
  },
  {
    "id": 2,
    "name": "IN_PROGRESS",
    "color": "#007BFF",
    "type": "Migration"
  },
  {
    "id": 3,
    "name": "COMPLETED",
    "color": "#28A745",
    "type": "Migration"
  }
]
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema        | Description                    |
| ----------- | ---------------- | ------------- | ------------------------------ |
| 400         | application/json | ErrorResponse | Missing or invalid entity type |
| 500         | application/json | ErrorResponse | Internal server error          |

#### Error Response Schema

```json
{
  "error": "string",
  "message": "string (optional)"
}
```

#### Error Examples

```json
// Missing entity type parameter
{
  "error": "Missing required parameter 'entityType'",
  "message": "Valid entity types: Migration, Iteration, Plan, Sequence, Phase, Step, Control, Instruction"
}

// Invalid entity type
{
  "error": "Invalid entity type: INVALID_TYPE",
  "message": "Valid entity types: Migration, Iteration, Plan, Sequence, Phase, Step, Control, Instruction"
}

// Internal server error
{
  "error": "Internal server error",
  "message": "Database connection failed"
}
```

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication (groups: ["confluence-users"])
- **Permissions:** User must be member of confluence-users group

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (status data is reference/lookup data)
- **Input Validation:**
  - Entity type parameter is required and validated against allowed values
  - Case-insensitive matching but normalized to proper case internally
- **Other Security Considerations:** SQL injection prevented via prepared statements

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Entity type parameter is case-insensitive but normalized internally
  - Returns all statuses associated with the specified entity type
  - Includes color metadata for UI display purposes
  - StatusRepository handles all database interactions

- **Side Effects:** None - read-only operation

- **Idempotency:** Yes - multiple identical requests return same result

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `status_sts` (primary status lookup table)
  - Entity-specific status mappings

- **External APIs:** None
- **Other Services:**
  - StatusRepository for data access
  - DatabaseUtil for connection management

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment

## 10. Testing & Mock Data

- **Unit Tests:** StatusRepository tests cover status lookup operations
- **Integration Tests:** Tested via Admin GUI integration tests
- **E2E Tests:** Tested via Admin GUI status display functionality
- **Mock Data/Fixtures:** Status data seeded via database migrations

## 11. Business Logic & Validation Rules

### Entity Type Validation

- Parameter is required - returns 400 if missing
- Case-insensitive matching (e.g., "migration", "Migration", "MIGRATION" all work)
- Normalized to proper case internally for consistency
- Invalid types return 400 with list of valid options

### Status Lookup

- Returns all statuses for the specified entity type
- Includes both active and inactive statuses (no filtering applied)
- Color codes provided for consistent UI display
- Results ordered by status ID (database default)

### Error Handling

- Comprehensive error messages with guidance
- Lists valid entity types in error responses
- Database errors caught and returned as 500 status

## 12. Examples

### Get Migration Statuses

```bash
curl "/rest/scriptrunner/latest/custom/status?entityType=Migration"

# Response:
[
  {"id": 1, "name": "PLANNING", "color": "#FFA500", "type": "Migration"},
  {"id": 2, "name": "IN_PROGRESS", "color": "#007BFF", "type": "Migration"},
  {"id": 3, "name": "COMPLETED", "color": "#28A745", "type": "Migration"}
]
```

### Get Phase Statuses (Case-insensitive)

```bash
curl "/rest/scriptrunner/latest/custom/status?entityType=phase"

# Response:
[
  {"id": 10, "name": "PENDING", "color": "#6C757D", "type": "Phase"},
  {"id": 11, "name": "ACTIVE", "color": "#007BFF", "type": "Phase"},
  {"id": 12, "name": "COMPLETED", "color": "#28A745", "type": "Phase"}
]
```

### Error Example - Invalid Entity Type

```bash
curl "/rest/scriptrunner/latest/custom/status?entityType=InvalidType"

# Response (400):
{
  "error": "Invalid entity type: InvalidType",
  "message": "Valid entity types: Migration, Iteration, Plan, Sequence, Phase, Step, Control, Instruction"
}
```

## 13. Notes

- Status API serves as a central lookup service for all entity status information
- Color codes enable consistent status visualization across the Admin GUI
- Case-insensitive entity type matching improves API usability
- Read-only API focused on providing reference data

## 14. Related APIs

- **All Entity APIs:** Status API provides lookup data used by Migrations, Iterations, Plans, Sequences, Phases, Steps, Controls, and Instructions APIs
- **Admin GUI:** Primary consumer of status data for dropdown populations and status displays

## 15. Change Log

- **2025-08-22:** Initial creation with comprehensive status lookup functionality
- **2025-08-22:** Added case-insensitive entity type matching
- **2025-08-22:** Integrated with Admin GUI for consistent status management

---

> **Note:** This specification is fully aligned with the OpenAPI.yaml specification and implementation in StatusApi.groovy. Update this specification whenever the API changes.
