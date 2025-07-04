# Migration API Specification

> This document defines the REST API for managing the migration hierarchy in UMIG: Migration > Plan > Iteration > Sequence > Phase. All CRUD operations and hierarchical relationships are described here.

---

## 1. API Overview
- **API Name:** Migration API
- **Purpose:** Manage migrations and their hierarchical structure (Plans, Iterations, Sequences, Phases)
- **Owner:** UMIG Engineering Team
- **Related ADRs:** See `/docs/adr/` and `/docs/solution-architecture.md`

## 2. Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET    | /rest/scriptrunner/latest/custom/migrations         | List all migrations |
| POST   | /rest/scriptrunner/latest/custom/migrations         | Create a new migration |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}    | Get migration by ID |
| PUT    | /rest/scriptrunner/latest/custom/migrations/{id}    | Update migration by ID |
| DELETE | /rest/scriptrunner/latest/custom/migrations/{id}    | Delete migration by ID |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}/plans | List plans for a migration |
| POST   | /rest/scriptrunner/latest/custom/migrations/{id}/plans | Create a plan under a migration |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}/iterations | List iterations for a migration (fields: staticCutoverDate, dynamicCutoverDate; see data model in Liquibase changelogs) |
| POST   | /rest/scriptrunner/latest/custom/migrations/{id}/iterations | Create an iteration under a migration |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}/iterations/{iterationId}/sequences | List sequences for an iteration |
| POST   | /rest/scriptrunner/latest/custom/migrations/{id}/iterations/{iterationId}/sequences | Create a sequence under an iteration |
| GET    | /rest/scriptrunner/latest/custom/migrations/{id}/iterations/{iterationId}/sequences/{sequenceId}/phases | List phases for a sequence |
| POST   | /rest/scriptrunner/latest/custom/migrations/{id}/iterations/{iterationId}/sequences/{sequenceId}/phases | Create a phase under a sequence |

## 3. Request Details
### 3.1. Path Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
| id   | string | yes | Migration/Plan/Iteration/Sequence/Phase ID |

> **Note:** All API field mappings must be cross-checked with the latest Liquibase changelogs in `local-dev-setup/liquibase` before implementation or update. This prevents mapping errors and ensures alignment with the real data model.

### 3.2. Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
|      |      |          |             |

### 3.3. Request Body
- **Content-Type:** application/json
- **Schema (Migration):**
```json
{
  "name": "string",
  "description": "string",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD"
}
```
- **Example:**
```json
{
  "name": "Data Center Migration Q3 2025",
  "description": "Migration of all core services to new data center.",
  "startDate": "2025-07-01",
  "endDate": "2025-09-30"
}
```

## 4. Response Details
### 4.1. Success Response (GET List)
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
[
  {
    "id": "string",
    "name": "string",
    "description": "string",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD"
  }
]
```
- **Example:**
```json
[
  {
    "id": "mig-001",
    "name": "Data Center Migration Q3 2025",
    "description": "Migration of all core services to new data center.",
    "startDate": "2025-07-01",
    "endDate": "2025-09-30"
  }
]
```

### 4.2. Error Responses
| Status Code | Content-Type | Schema | Example | Description |
|-------------|--------------|--------|---------|-------------|
| 400 | application/json | {"error": "string"} | {"error": "Invalid input"} | Bad request |
| 404 | application/json | {"error": "string"} | {"error": "Not found"} | Resource not found |
| 500 | application/json | {"error": "string"} | {"error": "Internal error"} | Server error |

## 5. Authentication & Authorization
- **Required?** Yes
- **Mechanism:** Confluence user session (ScriptRunner context)
- **Permissions:** Must be authorized for migration management

## 6. Rate Limiting & Security
- **Rate Limits:** Standard API rate limits apply
- **RLS (Row-Level Security):** Yes
- **Input Validation:** All input validated for type and required fields
- **Other Security Considerations:** No sensitive data in logs

## 7. Business Logic & Side Effects
- **Key Logic:**
  - Enforce hierarchy: Migration > Plan > Iteration > Sequence > Phase
  - Prevent deletion if children exist
  - Audit all changes
- **Side Effects:**
  - Database updates
  - Audit logging
- **Idempotency:**
  - POST is not idempotent
  - PUT is idempotent

## 8. Dependencies & Backing Services
- **DB Tables/Entities:** migrations, plans, iterations, sequences, phases
- **External APIs:** None
- **Other Services:** None

## 9. Versioning & Deprecation
- **API Version:** v1
- **Deprecation Policy:** Deprecated endpoints will be announced and maintained for 1 minor version

## 10. Testing & Mock Data
- **Unit Tests:** Required for all business logic
- **Integration Tests:** Required for each endpoint
- **E2E Tests:** For critical flows
- **Mock Data/Fixtures:** Provided for all entity types

## 11. Changelog
- **Date:**
- **Change:**
- **Author:**

---

> **Note:** Update this specification whenever the API changes. Reference this spec in code reviews and ADRs.