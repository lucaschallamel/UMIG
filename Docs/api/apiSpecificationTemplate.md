# API Specification Template

> Use this template to define and document each API in the UMIG project. This ensures clarity, consistency, and alignment with project rules and best practices.

---

## 1. API Overview
- **API Name:**
- **Purpose:**
- **Owner:**
- **Related ADRs:**

## 2. Endpoints
| Method | Path | Description |
|--------|------|-------------|
|        |      |             |

## 3. Request Details
### 3.1. Path Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
|      |      |          |             |

### 3.2. Query Parameters
| Name | Type | Required | Description |
|------|------|----------|-------------|
|      |      |          |             |

### 3.3. Request Body
- **Content-Type:**
- **Schema:**
```json
{
  
}
```
- **Example:**
```json
{
  
}
```

## 4. Response Details
### 4.1. Success Response
- **Status Code:**
- **Content-Type:**
- **Schema:**
```json
{
  
}
```
- **Example:**
```json
{
  
}
```

### 4.2. Error Responses
| Status Code | Content-Type | Schema | Example | Description |
|-------------|--------------|--------|---------|-------------|
|             |              |        |         |             |

## 5. Authentication & Authorization
- **Required?** (Yes/No)
- **Mechanism:**
- **Permissions:**

## 6. Rate Limiting & Security
- **Rate Limits:**
- **RLS (Row-Level Security):** (Yes/No)
- **Input Validation:**
- **Other Security Considerations:**

## 7. Business Logic & Side Effects
- **Key Logic:**
- **Side Effects:**
- **Idempotency:**

## 8. Dependencies & Backing Services
- **DB Tables/Entities:**
- **External APIs:**
- **Other Services:**

## 9. Versioning & Deprecation
- **API Version:**
- **Deprecation Policy:**

## 10. Testing & Mock Data
- **Unit Tests:**
- **Integration Tests:**
- **E2E Tests:**
- **Mock Data/Fixtures:**

## 11. Changelog
- **Date:**
- **Change:**
- **Author:**

---

> **Note:** Update this specification whenever the API changes. Reference this spec in code reviews and ADRs.