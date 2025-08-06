# Applications API Specification

> Use this template to define and document each API in the UMIG project. This ensures clarity, consistency, and alignment with project rules and best practices.

---

## 1. API Overview
- **API Name:** Applications API
- **Purpose:** Manage application entities for team associations and environment relationships
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-020 (SPA + REST Pattern), ADR-023 (API Standards)

## 2. Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/applications` | Get all applications |

## 3. Request Details
### 3.1. Path Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| N/A | N/A | N/A | No path parameters for current endpoints |

### 3.2. Query Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| N/A | N/A | N/A | No query parameters for current endpoints |

### 3.3. Request Body
- **Content-Type:** N/A (GET only)
- **Schema:** N/A
- **Example:** N/A

## 4. Response Details
### 4.1. Success Response
- **Status Code:** 200
- **Content-Type:** application/json
- **Schema:**
```json
[
  {
    "app_id": "integer",
    "app_name": "string",
    "app_code": "string",
    "app_description": "string"
  }
]
```
- **Example:**
```json
[
  {
    "app_id": 1,
    "app_name": "Customer Portal",
    "app_code": "CUST_PORTAL",
    "app_description": "Main customer-facing application"
  },
  {
    "app_id": 2,
    "app_name": "Admin Dashboard",
    "app_code": "ADMIN_DASH",
    "app_description": "Administrative interface"
  }
]
```

### 4.2. Error Responses

| Status Code | Content-Type | Schema | Example | Description |
|-------------|--------------|--------|---------|-------------|
| 500 | application/json | `{"error": "string"}` | `{"error": "Database error occurred"}` | Internal server error |

## 5. Authentication & Authorization
- **Required?** Yes
- **Mechanism:** Confluence user authentication (ScriptRunner groups)
- **Permissions:** confluence-users, confluence-administrators

## 6. Rate Limiting & Security
- **Rate Limits:** None specified
- **RLS (Row-Level Security):** No
- **Input Validation:** Minimal (read-only endpoint)
- **Other Security Considerations:** Standard ScriptRunner security model

## 7. Business Logic & Side Effects
- **Key Logic:** Simple retrieval of all applications from applications_app table
- **Side Effects:** None (read-only)
- **Idempotency:** Yes (GET operation)

## 8. Dependencies & Backing Services
- **DB Tables/Entities:** applications_app
- **External APIs:** None
- **Other Services:** DatabaseUtil for connection management

## 9. Versioning & Deprecation
- **API Version:** V2
- **Deprecation Policy:** Standard UMIG API deprecation policy

## 10. Testing & Mock Data
- **Unit Tests:** To be implemented
- **Integration Tests:** To be implemented
- **E2E Tests:** To be implemented
- **Mock Data/Fixtures:** Generated via fake data generators

## 11. Changelog
- **Date:** 2025-07-15
- **Change:** Initial API specification created
- **Author:** UMIG Development Team

---

> **Note:** This API is primarily used for populating dropdown selections in team association management and environment management interfaces. Additional CRUD operations may be added in future iterations.