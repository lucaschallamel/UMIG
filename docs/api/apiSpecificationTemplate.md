# API Specification Template

> Use this template to define and document each API in the UMIG project. This ensures clarity, consistency, and alignment with project rules and best practices.

---

## 1. API Overview

- **API Name:** [API Name] v2 (specify version)
- **Purpose:** [Detailed purpose and business value]
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), [other relevant ADRs]

## 2. Endpoints

| Method | Path               | Description                         |
| ------ | ------------------ | ----------------------------------- |
|        | /api/v2/[resource] | [Full API v2 path with description] |

## 3. Request Details

### 3.1. Path Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
|      |      |          |             |

### 3.2. Query Parameters

| Name | Type | Required | Description |
| ---- | ---- | -------- | ----------- |
|      |      |          |             |

### 3.3. Request Body

- **Content-Type:**
- **Schema:**

```json
{}
```

- **Example:**

```json
{}
```

## 4. Response Details

### 4.1. Success Response

- **Status Code:**
- **Content-Type:**
- **Schema:**

```json
{}
```

- **Example:**

```json
{}
```

### 4.2. Error Responses

| Status Code | Content-Type | Schema | Example | Description |
| ----------- | ------------ | ------ | ------- | ----------- |
|             |              |        |         |             |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication (groups: ["confluence-users"])
- **Permissions:** User must be member of confluence-users group

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (data access controlled by Confluence permissions)
- **Input Validation:**
  - UUID format validation for all IDs
  - String length limits and content validation
  - Type casting validation (ADR-031)
  - SQL injection prevented via prepared statements
- **Other Security Considerations:** [Specify any additional security measures]

## 7. Business Logic & Side Effects

- **Key Logic:**
- **Side Effects:**
- **Idempotency:**

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `[primary_table]` (primary table)
  - `[related_tables]` (relationships)

- **External APIs:** None (unless external dependencies exist)
- **Other Services:**
  - Repository pattern for data access
  - DatabaseUtil for connection management

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment

## 10. Testing & Mock Data

- **Unit Tests:** Repository tests cover data access operations
- **Integration Tests:** Full CRUD operations tested in integration test suite
- **E2E Tests:** Tested via Admin GUI and Postman collections
- **Mock Data/Fixtures:** Available via npm run generate-data:erase

## 11. Business Logic & Validation Rules

### [Operation Name] (e.g., Create, Update, Delete)

- [Specific validation rules and business logic]
- [Error conditions and handling]
- [Side effects and constraints]

### [Additional Operations]

- [Continue for each major operation]

## 12. Examples

### [Operation Example]

```bash
curl -X [METHOD] /rest/scriptrunner/latest/custom/api/v2/[endpoint] \
  -H "Content-Type: application/json" \
  -d '[request body]'
```

## 13. Notes

- [Important implementation notes]
- [Integration considerations]
- [Performance characteristics]

## 14. Related APIs

- **[Related API 1]:** [Relationship description]
- **[Related API 2]:** [Relationship description]

## 15. Change Log

- **2025-[MM-DD]:** [Change description]

---

> **Note:** Update this specification whenever the API changes. Reference this spec in code reviews and ADRs.
