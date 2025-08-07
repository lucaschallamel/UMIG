# Teams API Specification

> Use this template to define and document each API in the UMIG project. This ensures clarity, consistency, and alignment with project rules and best practices.

---

## 1. API Overview

- **API Name:** Teams API
- **Purpose:** Manage team entities and provide hierarchical filtering based on migration execution hierarchy
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-020 (SPA + REST Pattern), ADR-023 (API Standards)

## 2. Endpoints

| Method | Path                                           | Description                                        |
| ------ | ---------------------------------------------- | -------------------------------------------------- |
| GET    | `/teams`                                       | Get all teams with optional hierarchical filtering |
| GET    | `/teams/{id}`                                  | Get a specific team by ID                          |
| GET    | `/teams/{id}/members`                          | Get all members of a team                          |
| GET    | `/teams/{id}/applications`                     | Get all applications associated with a team        |
| POST   | `/teams`                                       | Create a new team                                  |
| PUT    | `/teams/{id}`                                  | Update an existing team                            |
| DELETE | `/teams/{id}`                                  | Delete a team                                      |
| PUT    | `/teams/{teamId}/users/{userId}`               | Add user to team                                   |
| DELETE | `/teams/{teamId}/users/{userId}`               | Remove user from team                              |
| PUT    | `/teams/{teamId}/applications/{applicationId}` | Add application to team                            |
| DELETE | `/teams/{teamId}/applications/{applicationId}` | Remove application from team                       |

## 3. Request Details

### 3.1. Path Parameters

| Name          | Type    | Required | Description                                       |
| ------------- | ------- | -------- | ------------------------------------------------- |
| id            | integer | Yes      | Team identifier                                   |
| teamId        | integer | Yes      | Team identifier for membership operations         |
| userId        | integer | Yes      | User identifier for membership operations         |
| applicationId | integer | Yes      | Application identifier for association operations |

### 3.2. Query Parameters

| Name        | Type | Required | Description                          |
| ----------- | ---- | -------- | ------------------------------------ |
| migrationId | UUID | No       | Filter teams by migration ID         |
| iterationId | UUID | No       | Filter teams by iteration ID         |
| planId      | UUID | No       | Filter teams by plan instance ID     |
| sequenceId  | UUID | No       | Filter teams by sequence instance ID |
| phaseId     | UUID | No       | Filter teams by phase instance ID    |

### 3.3. Request Body

- **Content-Type:** application/json
- **Schema:** (For POST/PUT operations)

```json
{
  "tms_name": "string",
  "tms_description": "string",
  "tms_email": "string"
}
```

- **Example:**

```json
{
  "tms_name": "DevOps Team",
  "tms_description": "Infrastructure and deployment team",
  "tms_email": "devops@company.com"
}
```

## 4. Response Details

### 4.1. Success Response

- **Status Code:** 200 (GET), 201 (POST), 204 (PUT/DELETE)
- **Content-Type:** application/json
- **Schema:**

```json
{
  "tms_id": "integer",
  "tms_name": "string",
  "tms_description": "string",
  "tms_email": "string"
}
```

- **Example:**

```json
[
  {
    "tms_id": 1,
    "tms_name": "IT_CUTOVER",
    "tms_description": "Team for IT Cutover activities",
    "tms_email": "it_cutover@umig.com"
  },
  {
    "tms_id": 2,
    "tms_name": "DevOps Team",
    "tms_description": "Infrastructure and deployment team",
    "tms_email": "devops@company.com"
  }
]
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema              | Example                                            | Description           |
| ----------- | ---------------- | ------------------- | -------------------------------------------------- | --------------------- |
| 400         | application/json | {"error": "string"} | {"error": "Invalid migration ID format"}           | Invalid UUID format   |
| 404         | application/json | {"error": "string"} | {"error": "Team with ID 123 not found"}            | Team not found        |
| 409         | application/json | {"error": "string"} | {"error": "A team with this email already exists"} | Email conflict        |
| 500         | application/json | {"error": "string"} | {"error": "A database error occurred"}             | Internal server error |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Basic Authentication
- **Permissions:** confluence-users, confluence-administrators

## 6. Rate Limiting & Security

- **Rate Limits:** None specified
- **RLS (Row-Level Security):** No
- **Input Validation:** UUID format validation, email format validation
- **Other Security Considerations:** SQL injection prevention via parameterized queries

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Hierarchical filtering uses instance→master table relationships
  - Teams are filtered by step assignments through `steps_master_stm_x_teams_tms_impacted`
  - Progressive filtering: fewer teams returned at deeper hierarchy levels
- **Side Effects:** None for GET operations; database modifications for POST/PUT/DELETE
- **Idempotency:** GET operations are idempotent; POST is not idempotent; PUT/DELETE are idempotent

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `teams_tms` (primary)
  - `steps_master_stm_x_teams_tms_impacted` (team-step relationships)
  - `steps_master_stm`, `phases_master_phm`, `sequences_master_sqm`, `plans_master_plm` (hierarchy)
  - `iterations_ite`, `migrations_mig` (top-level hierarchy)
  - `plans_instance_pli`, `sequences_instance_sqi`, `phases_instance_phi` (instance tables)
- **External APIs:** None
- **Other Services:** DatabaseUtil for connection management

## 9. Versioning & Deprecation

- **API Version:** V2
- **Deprecation Policy:** Follow project deprecation guidelines

## 10. Testing & Mock Data

- **Unit Tests:** None specified
- **Integration Tests:** Manual testing performed
- **E2E Tests:** None specified
- **Mock Data/Fixtures:** Synthetic data via data generators

## 11. Changelog

- **Date:** 2025-07-09
- **Change:** Added hierarchical filtering query parameters (migrationId, iterationId, planId, sequenceId, phaseId)
- **Author:** Claude AI Assistant

- **Date:** 2025-07-09
- **Change:** Fixed field mapping issue (tms_id→id, tms_name→name) and corrected instance→master table relationships
- **Author:** Claude AI Assistant

- **Date:** 2025-01-15
- **Change:** Updated specification to use correct database field names (tms_id, tms_name, tms_description, tms_email) and integer IDs instead of UUIDs
- **Author:** Claude AI Assistant

---

> **Note:** Update this specification whenever the API changes. Reference this spec in code reviews and ADRs.
