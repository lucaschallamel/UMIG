# Labels API Specification

> Use this template to define and document each API in the UMIG project. This ensures clarity, consistency, and alignment with project rules and best practices.

---

## 1. API Overview
- **API Name:** Labels API
- **Purpose:** Retrieve labels with hierarchical filtering based on step instances in migration execution hierarchy
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-020 (SPA + REST Pattern), ADR-023 (API Standards)

## 2. Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/labels` | Get all labels with optional hierarchical filtering |

## 3. Request Details
### 3.1. Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| None | - | - | - |

### 3.2. Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| migrationId | UUID | No | Filter labels by migration ID |
| iterationId | UUID | No | Filter labels by iteration ID |
| planId | UUID | No | Filter labels by plan instance ID |
| sequenceId | UUID | No | Filter labels by sequence instance ID |
| phaseId | UUID | No | Filter labels by phase instance ID |

### 3.3. Request Body
- **Content-Type:** N/A (GET only)
- **Schema:** N/A
```json
{
  
}
```
- **Example:** N/A
```json
{
  
}
```

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
    "description": "string",
    "color": "string"
  }
]
```
- **Example:**
```json
[
  {
    "id": 1,
    "name": "Critical",
    "description": "Critical priority label",
    "color": "#FF0000"
  },
  {
    "id": 2,
    "name": "Database",
    "description": "Database-related tasks",
    "color": "#0066CC"
  }
]
```

### 4.2. Error Responses

| Status Code | Content-Type | Schema | Example | Description |
|-------------|--------------|--------|---------|-------------|
| 400 | application/json | {"error": "string"} | {"error": "Invalid migration ID format"} | Invalid UUID format |
| 500 | application/json | {"error": "string"} | {"error": "A database error occurred"} | Internal server error |

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
  - Hierarchical filtering follows specific path: filtered phases → step instances → master steps → labels
  - Query flow: PHI instances → STI via phi_id → STM via stm_id → labels via labels_lbl_x_steps_master_stm
  - Progressive filtering: fewer labels returned at deeper hierarchy levels
  - Returns distinct labels only
- **Side Effects:** None (read-only operation)
- **Idempotency:** Yes (GET operation)

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

---

> **Note:** Update this specification whenever the API changes. Reference this spec in code reviews and ADRs.