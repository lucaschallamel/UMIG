# Labels API Specification

---

## 1. API Overview

- **API Name:** Labels API
- **Purpose:** Manage labels with full CRUD operations, hierarchical filtering, and association management for applications and steps
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-020 (SPA + REST Pattern), ADR-023 (API Standards), ADR-030 (Hierarchical Filtering), ADR-031 (Type Safety)

## 2. Endpoints

| Method | Path                                             | Description                                         |
| ------ | ------------------------------------------------ | --------------------------------------------------- |
| GET    | `/labels`                                        | Get all labels with optional hierarchical filtering |
| GET    | `/labels/{id}`                                   | Get a specific label by ID                          |
| POST   | `/labels`                                        | Create a new label                                  |
| PUT    | `/labels/{id}`                                   | Update an existing label                            |
| DELETE | `/labels/{id}`                                   | Delete a label                                      |
| GET    | `/labels/{id}/steps`                             | Get steps associated with a label                   |
| POST   | `/labels/{labelId}/applications/{applicationId}` | Add application association                         |
| DELETE | `/labels/{labelId}/applications/{applicationId}` | Remove application association                      |
| POST   | `/labels/{labelId}/steps/{stepId}`               | Add step association                                |
| DELETE | `/labels/{labelId}/steps/{stepId}`               | Remove step association                             |

## 3. Request Details

### 3.1. Path Parameters

| Name          | Type    | Required                        | Description    |
| ------------- | ------- | ------------------------------- | -------------- |
| id            | Integer | Yes (for specific endpoints)    | Label ID       |
| labelId       | Integer | Yes (for association endpoints) | Label ID       |
| applicationId | Integer | Yes (for app associations)      | Application ID |
| stepId        | UUID    | Yes (for step associations)     | Step Master ID |

### 3.2. Query Parameters (GET /labels only)

| Name        | Type | Required | Description                           |
| ----------- | ---- | -------- | ------------------------------------- |
| migrationId | UUID | No       | Filter labels by migration ID         |
| iterationId | UUID | No       | Filter labels by iteration ID         |
| planId      | UUID | No       | Filter labels by plan instance ID     |
| sequenceId  | UUID | No       | Filter labels by sequence instance ID |
| phaseId     | UUID | No       | Filter labels by phase instance ID    |

### 3.3. Request Body

#### POST /labels - Create Label

- **Content-Type:** application/json
- **Schema:**

```json
{
  "lbl_name": "string (required)",
  "lbl_description": "string (optional)",
  "lbl_color": "string (required, hex color)",
  "mig_id": "UUID string (required)"
}
```

- **Example:**

```json
{
  "lbl_name": "High Priority",
  "lbl_description": "Tasks requiring immediate attention",
  "lbl_color": "#FF0000",
  "mig_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

#### PUT /labels/{id} - Update Label

- **Content-Type:** application/json
- **Schema:**

```json
{
  "lbl_name": "string (optional)",
  "lbl_description": "string (optional)",
  "lbl_color": "string (optional, hex color)",
  "mig_id": "UUID string (optional)"
}
```

- **Example:**

```json
{
  "lbl_name": "Critical Priority",
  "lbl_color": "#CC0000"
}
```

## 4. Response Details

### 4.1. Success Responses

#### GET /labels - List Labels

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
[
  {
    "id": "integer",
    "name": "string",
    "description": "string",
    "color": "string"
  }
]
```

#### GET /labels/{id} - Get Label Details

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "lbl_id": "integer",
  "mig_id": "UUID string",
  "lbl_name": "string",
  "lbl_description": "string",
  "lbl_color": "string",
  "created_at": "ISO 8601 timestamp",
  "created_by": "integer",
  "applications": [
    {
      "app_id": "integer",
      "app_code": "string",
      "app_name": "string"
    }
  ],
  "step_count": "integer"
}
```

#### GET /labels/{id}/steps - Get Label Steps

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "steps": [
    {
      "stm_id": "UUID string",
      "step_type": "string",
      "step_number": "integer",
      "step_title": "string"
    }
  ]
}
```

#### POST /labels - Create Label

- **Status Code:** 201
- **Content-Type:** application/json
- **Schema:** Same as GET /labels/{id}

#### PUT /labels/{id} - Update Label

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:** Same as GET /labels/{id}

#### DELETE /labels/{id} - Delete Label

- **Status Code:** 204
- **Content-Type:** N/A (No Content)

#### POST/DELETE Association Endpoints

- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**

```json
{
  "success": true,
  "message": "string"
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema              | Example                                                  | Description                                    |
| ----------- | ---------------- | ------------------- | -------------------------------------------------------- | ---------------------------------------------- |
| 400         | application/json | {"error": "string"} | {"error": "Invalid migration ID format"}                 | Invalid UUID format or missing required fields |
| 404         | application/json | {"error": "string"} | {"error": "Label not found"}                             | Resource not found                             |
| 409         | application/json | {"error": "string"} | {"error": "Label name already exists in this migration"} | Duplicate constraint violation                 |
| 500         | application/json | {"error": "string"} | {"error": "A database error occurred"}                   | Internal server error                          |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Basic Authentication
- **Permissions:** confluence-users, confluence-administrators

## 6. Rate Limiting & Security

- **Rate Limits:** None specified
- **RLS (Row-Level Security):** No
- **Input Validation:** UUID format validation for query parameters
- **Other Security Considerations:** SQL injection prevention via parameterized queries

## 7. Business Logic & Side Effects

- **Key Logic:**
  - **GET /labels**: Hierarchical filtering follows specific path: filtered phases → step instances → master steps → labels
  - Query flow: PHI instances → STI via phi_id → STM via stm_id → labels via labels_lbl_x_steps_master_stm
  - Progressive filtering: fewer labels returned at deeper hierarchy levels
  - Returns distinct labels only
  - **CRUD Operations**:
    - Labels are scoped to migrations (unique constraint on mig_id + lbl_name)
    - Migration ID can be updated via PUT endpoint
    - Deletion removes all associations (cascade)
  - **Association Management**:
    - Many-to-many relationships with applications and steps
    - Associations are tracked with audit fields (created_at, created_by)
- **Side Effects:**
  - POST/PUT/DELETE operations modify database state
  - DELETE removes all associated relationships
- **Idempotency:**
  - GET operations: Yes
  - PUT operations: Yes (same data produces same result)
  - POST/DELETE associations: Yes (duplicate adds/removes are handled gracefully)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `labels_lbl` (primary)
  - `labels_lbl_x_steps_master_stm` (label-step relationships)
  - `steps_master_stm` (master steps)
  - `steps_instance_sti` (step instances)
  - `phases_instance_phi` (phase instances)
  - `phases_master_phm`, `sequences_master_sqm`, `plans_master_plm` (hierarchy)
  - `iterations_ite`, `migrations_mig` (top-level hierarchy)
  - `plans_instance_pli`, `sequences_instance_sqi` (instance tables)
- **External APIs:** None
- **Other Services:** DatabaseUtil for connection management

## 9. Versioning & Deprecation

- **API Version:** V2
- **Deprecation Policy:** Follow project deprecation guidelines

## 10. Testing & Mock Data

- **Unit Tests:** None specified
- **Integration Tests:** Manual testing performed
- **E2E Tests:** None specified
- **Mock Data/Fixtures:** Synthetic data via data generators (24 labels total)

## 11. Changelog

- **Date:** 2025-07-09
- **Change:** Created Labels API with hierarchical filtering support
- **Author:** Claude AI Assistant

- **Date:** 2025-07-09
- **Change:** Implemented database queries following STI→STM→Labels relationship path
- **Author:** Claude AI Assistant

- **Date:** 2025-07-16
- **Change:** Added full CRUD operations (POST, PUT, DELETE endpoints)
- **Author:** Claude AI Assistant

- **Date:** 2025-07-16
- **Change:** Added association management endpoints for applications and steps
- **Author:** Claude AI Assistant

- **Date:** 2025-07-16
- **Change:** Added GET /labels/{id}/steps endpoint for retrieving label-associated steps
- **Author:** Claude AI Assistant

- **Date:** 2025-07-16
- **Change:** Enhanced LabelRepository with comprehensive CRUD and association methods
- **Author:** Claude AI Assistant

---

> **Note:** Update this specification whenever the API changes. Reference this spec in code reviews and ADRs.
