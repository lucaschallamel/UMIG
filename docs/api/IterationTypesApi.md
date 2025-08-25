# IterationTypes API Specification

> Reference data API for iteration types, providing standardized iteration type codes and names for Admin GUI dropdowns and system configuration.

---

## 1. API Overview

- **API Name:** IterationTypes API v2
- **Purpose:** Provides read-only access to iteration type reference data for dropdown population and system configuration. Essential for Admin GUI integration and maintaining consistent iteration type terminology across the UMIG platform.
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-031 (Type Safety), ADR-026 (Testing Patterns)

## 2. Endpoints

| Method | Path                   | Description                                   |
| ------ | ---------------------- | --------------------------------------------- |
| GET    | /api/v2/iterationTypes | Retrieve all iteration types with codes/names |

## 3. Request Details

### 3.1. Path Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| None | -    | -        | -           |

### 3.2. Query Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
| None | -    | -        | -           |

### 3.3. Request Body

- **Content-Type:** None (GET request)
- **Schema:** N/A
- **Example:** N/A

## 4. Response Details

### 4.1. Success Response

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "itt_code": "string",
    "itt_name": "string"
  }
]
```

- **Example:**

```json
[
  {
    "itt_code": "CUTOVER",
    "itt_name": "Production Cutover"
  },
  {
    "itt_code": "PILOT",
    "itt_name": "Pilot Testing"
  },
  {
    "itt_code": "REHEARSAL",
    "itt_name": "Dress Rehearsal"
  }
]
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema                             | Example                                              | Description                 |
| ----------- | ---------------- | ---------------------------------- | ---------------------------------------------------- | --------------------------- |
| 500         | application/json | `{"error": "string"}`              | `{"error": "Database error occurred"}`               | Database connection failure |
| 500         | application/json | `{"error": "string"}`              | `{"error": "An unexpected internal error occurred"}` | Unexpected system error     |
| 401         | application/json | Confluence standard error response | Confluence authentication error                      | Authentication required     |
| 403         | application/json | Confluence standard error response | Confluence authorization error                       | Insufficient permissions    |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication (groups: ["confluence-users", "confluence-administrators"])
- **Permissions:** User must be member of confluence-users or confluence-administrators group

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (public reference data)
- **Input Validation:**
  - No input parameters to validate
  - Output sanitization handled by JsonBuilder
  - SQL injection prevented via direct SQL queries (no user input)
- **Other Security Considerations:**
  - Read-only access pattern reduces security risk
  - Reference data is non-sensitive
  - Confluence group membership required

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Simple data retrieval from iteration_types_itt table
  - Results ordered by itt_code for consistent presentation
  - No business rules or complex processing
- **Side Effects:** None (read-only operation)
- **Idempotency:** Yes (GET operation, no state changes)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `iteration_types_itt` (primary table)
    - `itt_code` (VARCHAR, primary key)
    - `itt_name` (VARCHAR, display name)

- **External APIs:** None
- **Other Services:**
  - DatabaseUtil for connection management
  - JsonBuilder for JSON response serialization
  - Log4j for operation logging

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment

## 10. Testing & Mock Data

- **Unit Tests:** Database access covered by repository patterns
- **Integration Tests:** Full endpoint testing in integration test suite
- **E2E Tests:** Tested via Admin GUI dropdown population
- **Mock Data/Fixtures:** Available via npm run generate-data:erase

## 11. Business Logic & Validation Rules

### Retrieve All Iteration Types

- **Business Rules:**
  - Returns all active iteration types from the database
  - Results are ordered by itt_code for consistent presentation
  - No filtering or pagination (small reference dataset)
- **Validation Rules:**
  - No input validation required (parameterless endpoint)
  - Database connection validation handled by DatabaseUtil
- **Error Conditions:**
  - Database unavailable: Returns 500 with generic error message
  - SQL execution error: Returns 500 with database error message
  - Authentication failure: Returns 401/403 via Confluence

## 12. Examples

### Retrieve All Iteration Types

```bash
curl -X GET /rest/scriptrunner/latest/custom/api/v2/iterationTypes \
  -H "Content-Type: application/json" \
  -u "username:password"
```

**Response:**

```json
[
  {
    "itt_code": "CUTOVER",
    "itt_name": "Production Cutover"
  },
  {
    "itt_code": "PILOT",
    "itt_name": "Pilot Testing"
  },
  {
    "itt_code": "REHEARSAL",
    "itt_name": "Dress Rehearsal"
  }
]
```

### Admin GUI Integration Example

```javascript
// Admin GUI dropdown population
async function loadIterationTypes() {
  const response = await fetch(
    "/rest/scriptrunner/latest/custom/api/v2/iterationTypes",
  );
  const iterationTypes = await response.json();

  const dropdown = document.getElementById("iterationTypeSelect");
  iterationTypes.forEach((type) => {
    const option = document.createElement("option");
    option.value = type.itt_code;
    option.textContent = type.itt_name;
    dropdown.appendChild(option);
  });
}
```

## 13. Notes

- **Implementation Notes:**
  - Simplest API in the system - single GET operation
  - No complex business logic or validation required
  - Optimized for Admin GUI dropdown population
  - Uses standard UMIG error handling patterns
- **Integration Considerations:**
  - Primary consumer is Admin GUI for dropdown population
  - May be used by other APIs for validation of iteration type codes
  - Reference data changes infrequently, suitable for client-side caching
- **Performance Characteristics:**
  - Very fast response time (<50ms typical)
  - Small payload size (typically <1KB)
  - Database query uses primary key ordering for optimal performance
  - No pagination needed due to small dataset size

## 14. Related APIs

- **Iterations API:** References iteration types via itt_code foreign key relationships
- **Admin GUI APIs:** Consumed by Admin GUI for consistent dropdown population across all iteration-related forms

## 15. Change Log

- **2025-08-25:** Initial API specification created following template v1.0
- **2025-08-22:** API implementation completed as part of US-031 Admin GUI integration

---

> **Note:** This API serves as a foundational reference data endpoint. Changes to iteration types should be coordinated with database administrators and tested across all consuming applications, particularly the Admin GUI components.
