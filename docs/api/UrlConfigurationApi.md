# URL Configuration API Specification

> This API provides URL configuration management for client-side URL construction, enabling dynamic URL generation based on environment settings rather than hardcoded values. Critical for StepView navigation and Admin GUI integration.

---

## 1. API Overview

- **API Name:** URL Configuration API v2
- **Purpose:** Expose URL configuration from UrlConstructionService to client-side JavaScript for dynamic URL construction based on environment settings. Enables proper StepView navigation across different environments (DEV, TEST, PROD).
- **Owner:** UMIG Development Team
- **Related ADRs:**
  - ADR-017 (V2 REST API Architecture)
  - ADR-048 (URL Construction Service Architecture)
  - ADR-031 (Groovy Type Safety)

## 2. Endpoints

| Method | Path                                | Description                                        |
| ------ | ----------------------------------- | -------------------------------------------------- |
| GET    | /api/v2/urlConfiguration            | Get URL configuration for client-side construction |
| GET    | /api/v2/urlConfiguration/health     | Health check for URL configuration service         |
| POST   | /api/v2/urlConfiguration/clearCache | Clear URL configuration cache                      |
| GET    | /api/v2/urlConfiguration/debug      | Debug information for troubleshooting              |

## 3. Request Details

### 3.1. Path Parameters

None required for URL Configuration API endpoints.

### 3.2. Query Parameters

#### GET /urlConfiguration

| Name        | Type   | Required | Description                                                                   |
| ----------- | ------ | -------- | ----------------------------------------------------------------------------- |
| environment | String | No       | Specific environment code (DEV, EV1, EV2, PROD). Auto-detects if not provided |

### 3.3. Request Body

#### POST /urlConfiguration/clearCache

No request body required.

## 4. Response Details

### 4.1. Success Response

#### GET /urlConfiguration

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "baseUrl": "string", // Base Confluence URL
  "spaceKey": "string", // Confluence space key
  "pageId": "string", // Confluence page ID
  "pageTitle": "string", // URL-encoded page title
  "environment": "string", // Environment code (DEV, EV1, etc.)
  "isActive": "boolean", // Configuration active status
  "urlTemplate": "string" // Complete URL template for client-side use
}
```

- **Example:**

```json
{
  "baseUrl": "http://localhost:8090",
  "spaceKey": "UMIG",
  "pageId": "1048581",
  "pageTitle": "UMIG+-+Step+View",
  "environment": "DEV",
  "isActive": true,
  "urlTemplate": "http://localhost:8090/spaces/UMIG/pages/1048581/UMIG%2B-%2BStep%2BView"
}
```

#### GET /urlConfiguration/health

- **Status Code:** 200 (healthy), 202 (degraded), 500 (error)
- **Content-Type:** application/json
- **Schema:**

```json
{
  "status": "string", // "healthy", "degraded", or "error"
  "timestamp": "string", // ISO timestamp
  "details": {} // Health check details from UrlConstructionService
}
```

#### POST /urlConfiguration/clearCache

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Example:**

```json
{
  "message": "URL configuration cache cleared successfully",
  "timestamp": "Wed Aug 27 15:30:45 GMT 2025",
  "nextCacheRefresh": "On next request"
}
```

#### GET /urlConfiguration/debug

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "serviceHealth": {}, // Service health status
  "cachedConfigurations": {}, // Currently cached configurations
  "environmentDetection": {
    "currentDetectedEnv": "string",
    "systemProperties": {} // System property values
  },
  "timestamp": "string"
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Description                                               | Example                                                                                                                                 |
| ----------- | ---------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 400         | application/json | Invalid environment parameter                             | `{"error": "Invalid environment parameter", "parameter": "INVALID", "message": "Environment code must be 3-4 alphanumeric characters"}` |
| 404         | application/json | No URL configuration found for environment                | `{"error": "No URL configuration found", "environment": "DEV", "message": "URL construction service could not find configuration"}`     |
| 500         | application/json | Internal server error or configuration validation failure | `{"error": "Internal server error", "service": "UrlConstructionService", "suggestion": "Check system_configuration_scf table entries"}` |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication (groups: ["confluence-users"])
- **Permissions:** User must be member of confluence-users group
- **Additional Security:** Input validation and sanitization for all parameters

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (configuration is environment-wide)
- **Input Validation:**
  - Environment parameter: 2-5 alphanumeric characters only
  - Pattern validation against known environment codes
  - SQL injection prevention via parameter sanitization
  - URL validation for security (prevents malicious URLs)
  - XSS prevention in page titles
- **Other Security Considerations:**
  - Cache TTL of 5 minutes to prevent stale configuration
  - Comprehensive URL validation before returning to client
  - Protocol restriction to HTTP/HTTPS only

## 7. Business Logic & Side Effects

- **Key Logic:**
  - Auto-detects current environment if not specified
  - Falls back through environment hierarchy (specific → auto-detect → defaults)
  - Validates all URL components before returning to client
  - Caches configuration for 5 minutes to reduce database load
- **Side Effects:**
  - GET requests may trigger cache refresh if expired
  - POST to clearCache forces immediate cache invalidation
- **Idempotency:**
  - GET requests are idempotent
  - POST clearCache is idempotent (clearing an already empty cache is safe)

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `system_configuration_scf` (primary configuration storage)
  - `environments_env` (environment definitions)
- **External APIs:** None
- **Other Services:**
  - UrlConstructionService (core service for URL generation)
  - DatabaseUtil for connection management
  - Caching layer with 5-minute TTL

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment
- **Backward Compatibility:** Maintains compatibility with existing StepView and Admin GUI

## 10. Testing & Mock Data

- **Unit Tests:** UrlConstructionServiceTest.groovy covers service logic
- **Integration Tests:** UrlConfigurationFlowTest.groovy tests end-to-end flow
- **Security Tests:** UrlConfigurationApiSecurityTest.groovy validates security measures
- **Mock Data/Fixtures:** Available via system_configuration_scf seed data

## 11. Business Logic & Validation Rules

### Environment Parameter Validation

- Must be 2-5 alphanumeric characters
- Validated against known patterns: DEV, TST, EV[1-9], PROD, STG, PRE, UAT, LOCAL
- Case-insensitive (normalized to uppercase)
- SQL injection prevention via character filtering

### URL Configuration Validation

- Base URL must be valid HTTP/HTTPS URL
- Localhost and 127.0.0.1 allowed for development
- Port validation (80-65535 range)
- Space key must be alphanumeric with hyphens/underscores only
- Page ID must be numeric only
- Page title sanitized to prevent XSS

### Cache Management

- 5-minute TTL for configuration cache
- Automatic refresh on expiry
- Manual cache clear available for immediate updates

## 12. Examples

### Get URL Configuration (Auto-detect Environment)

```bash
curl -X GET http://localhost:8090/rest/scriptrunner/latest/custom/api/v2/urlConfiguration \
  -H "Authorization: Basic [credentials]"
```

### Get URL Configuration for Specific Environment

```bash
curl -X GET "http://localhost:8090/rest/scriptrunner/latest/custom/api/v2/urlConfiguration?environment=PROD" \
  -H "Authorization: Basic [credentials]"
```

### Clear Configuration Cache

```bash
curl -X POST http://localhost:8090/rest/scriptrunner/latest/custom/api/v2/urlConfiguration/clearCache \
  -H "Authorization: Basic [credentials]"
```

### Check Service Health

```bash
curl -X GET http://localhost:8090/rest/scriptrunner/latest/custom/api/v2/urlConfiguration/health \
  -H "Authorization: Basic [credentials]"
```

### Get Debug Information

```bash
curl -X GET http://localhost:8090/rest/scriptrunner/latest/custom/api/v2/urlConfiguration/debug \
  -H "Authorization: Basic [credentials]"
```

## 13. Notes

- **Critical for Navigation:** This API is essential for StepView and Admin GUI URL construction
- **Performance:** Caching reduces database load significantly (5-minute TTL)
- **Security Focus:** Extensive input validation and sanitization to prevent injection attacks
- **Environment Detection:** Falls back through multiple detection strategies for reliability
- **Client Integration:** Used by step-view.js and admin-gui.js for dynamic URL generation

## 14. Related APIs

- **StepView API:** Uses URL configuration for step navigation links
- **Admin GUI API:** Relies on URL configuration for entity navigation
- **System Configuration API:** Manages the underlying configuration data

## 15. Change Log

- **2025-08-27:** Initial creation as part of US-039 email notification infrastructure
- **2025-08-27:** Added comprehensive security validation and sanitization (ADR-048)
- **2025-08-27:** Enhanced with health check and debug endpoints for production support

---

> **Note:** This API is critical infrastructure for the UMIG system's navigation capabilities. Any changes must be thoroughly tested across all environments and validated against security requirements per ADR-048.
