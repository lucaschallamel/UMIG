# UMIG API Security & Performance Standards

> Unified standards for security implementation and performance characteristics across all UMIG REST APIs. This guide establishes consistent security baselines and performance expectations for enterprise-grade API operations.

---

## 1. Security Framework Overview

### 1.1. Security Rating System

- **Enterprise Grade (9.0-10.0):** Advanced rate limiting, client blocking, comprehensive audit logging
- **Production Grade (7.0-8.9):** Standard rate limiting, RBAC integration, security headers
- **Standard Grade (5.0-6.9):** Basic authentication, input validation, error handling
- **Development Grade (<5.0):** Minimal security controls

### 1.2. Current API Security Ratings

| API               | Security Rating | Key Security Features                                                       |
| ----------------- | --------------- | --------------------------------------------------------------------------- |
| EnvironmentsAPI   | 9.2/10          | Advanced rate limiting with client blocking, IP tracking, automatic cleanup |
| IterationTypesAPI | 8.5/10          | RBAC integration, security headers, enhanced input validation               |
| TeamsAPI          | 7.0/10          | Standard authentication, comprehensive input validation                     |
| ApplicationsAPI   | 7.0/10          | Standard authentication, association validation                             |
| UsersAPI          | 7.5/10          | Enhanced user context management, audit trail integration                   |

---

## 2. Authentication & Authorization Standards

### 2.1. Authentication Requirements

**All APIs must implement:**

- Confluence Authentication integration
- User context capture for audit trails
- Session management with ScriptRunner

### 2.2. Authorization Levels

```yaml
READ_OPERATIONS:
  groups: ["confluence-users", "confluence-administrators"]
  description: "Standard read access for authenticated users"

WRITE_OPERATIONS:
  groups: ["confluence-administrators"]
  description: "Administrative privileges required for modifications"

ADMINISTRATIVE_OPERATIONS:
  groups: ["confluence-administrators"]
  additional_checks: ["user_context_validation", "audit_logging"]
  description: "Enhanced administrative operations with full audit trail"
```

### 2.3. User Context Management (ADR-042)

```groovy
// Standard user context pattern for all APIs
def userContext = userService.getCurrentUserContext()
def userIdentifier = userContext.userCode ?: userContext.userId?.toString() ?: "system"

// Audit trail integration
def auditInfo = [
    user: userIdentifier,
    timestamp: new Date(),
    operation: operationType,
    resource: resourceId
]
```

---

## 3. Rate Limiting Standards

### 3.1. Rate Limiting Tiers

#### Tier 1: Enterprise Rate Limiting (EnvironmentsAPI Standard)

```yaml
READ_OPERATIONS:
  per_minute: 60
  per_hour: 600
  client_tracking: "IP-based with proxy awareness"

WRITE_OPERATIONS:
  per_minute: 30
  per_hour: 300
  stricter_enforcement: true

BLOCKING_POLICY:
  threshold: "1.5x hourly limit"
  duration: "automatic cleanup after 24 hours"
  logging: "comprehensive security event logging"
```

#### Tier 2: Standard Rate Limiting

```yaml
RATE_LIMITS:
  implementation: "ScriptRunner built-in throttling"
  monitoring: "automatic enforcement"
  configuration: "standard ScriptRunner limits"
```

### 3.2. Rate Limit Response Format

**Standard HTTP 429 Response:**

```json
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later.",
  "retryAfter": "60 seconds",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**Required Headers:**

```http
Retry-After: 60
X-RateLimit-Limit: 60
X-RateLimit-Reset: 1640995200000
X-RateLimit-Remaining: 0
```

---

## 4. Input Validation Standards

### 4.1. Universal Validation Rules

```yaml
UUID_VALIDATION:
  pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$"
  error: "Invalid UUID format"

INTEGER_VALIDATION:
  type_casting: "Integer.parseInt(param as String)"
  error: "Invalid integer format"

EMAIL_VALIDATION:
  pattern: "RFC 5322 compliant"
  error: "Invalid email format"

SEARCH_TERMS:
  minimum_length: 2
  error: "Search term must be at least 2 characters"

PAGINATION:
  page_minimum: 1
  size_minimum: 1
  size_maximum: 500
  default_size: 50
```

### 4.2. Security Validation Patterns

```groovy
// SQL Injection Prevention (ADR-031)
// ALWAYS use explicit type casting
UUID.fromString(param as String)
Integer.parseInt(param as String)
param.toUpperCase() as String

// Input Sanitization
def sanitizedInput = input?.trim()?.take(MAX_LENGTH)

// Validation Chain Pattern
if (!isValidFormat(input)) {
    return Response.status(400)
        .entity(new JsonBuilder([error: "Invalid format"]))
        .build()
}
```

---

## 5. Error Handling Standards

### 5.1. Standard HTTP Status Code Mapping

```yaml
400_BAD_REQUEST:
  triggers: ["invalid_parameters", "validation_errors", "malformed_json"]
  format: '{"error": "descriptive message"}'

401_UNAUTHORIZED:
  triggers: ["missing_authentication", "invalid_credentials"]
  format: "Confluence standard error response"

403_FORBIDDEN:
  triggers: ["insufficient_permissions"]
  format: "Confluence standard error response"

404_NOT_FOUND:
  triggers: ["resource_not_found"]
  format: '{"error": "Resource with ID {id} not found"}'

409_CONFLICT:
  triggers: ["duplicate_entries", "blocking_relationships"]
  format: '{"error": "message", "blocking_relationships": {}}'

429_TOO_MANY_REQUESTS:
  triggers: ["rate_limit_exceeded"]
  format: "Standard rate limit response with retry headers"

500_INTERNAL_SERVER_ERROR:
  triggers: ["database_errors", "unexpected_exceptions"]
  format: '{"error": "Database error occurred"}'
```

### 5.2. SQL State Code Mapping

```yaml
"23503":
  http_status: 400
  message: "Foreign key constraint violation"

"23505":
  http_status: 409
  message: "Unique constraint violation - duplicate entry"

"23514":
  http_status: 400
  message: "Check constraint violation"
```

---

## 6. Performance Standards

### 6.1. Response Time SLA

```yaml
SIMPLE_GET_REQUESTS:
  target: "<100ms"
  maximum: "200ms"

PAGINATED_REQUESTS:
  target: "<150ms"
  maximum: "300ms"

WRITE_OPERATIONS:
  target: "<200ms"
  maximum: "500ms"

ASSOCIATION_OPERATIONS:
  target: "<120ms"
  maximum: "250ms"
```

### 6.2. Pagination Standards

```yaml
PAGINATION_PARAMETERS:
  page: "1-based indexing, minimum 1, default 1"
  size: "1-500 range, default 50"
  sort: "field validation required"
  direction: "asc/desc validation, default asc"

RESPONSE_FORMAT:
  simple_array: "when no pagination parameters provided"
  paginated_object: "when pagination parameters present"

PERFORMANCE_LIMITS:
  max_page_size: 500
  query_timeout: "30 seconds"
  connection_pool: "optimized for concurrent access"
```

### 6.3. Resource Usage Guidelines

```yaml
MEMORY_MANAGEMENT:
  connection_pooling: "required"
  result_set_limits: "enforce maximum result sizes"
  cleanup: "automatic resource cleanup"

NETWORK_OPTIMIZATION:
  payload_compression: "JSON minification"
  typical_payload_size: "<5KB"
  header_optimization: "minimal required headers"

DATABASE_OPTIMIZATION:
  prepared_statements: "mandatory"
  index_usage: "verify query execution plans"
  connection_reuse: "DatabaseUtil.withSql pattern"
```

---

## 7. Security Headers Standards

### 7.1. Mandatory Security Headers

```yaml
ENTERPRISE_APIS:
  headers:
    - "X-Content-Type-Options: nosniff"
    - "X-Frame-Options: DENY"
    - "X-XSS-Protection: 1; mode=block"
    - "X-RateLimit-Limit: {limit}"
    - "X-RateLimit-Remaining: {remaining}"

STANDARD_APIS:
  headers:
    - "Content-Type: application/json"
    - "Cache-Control: no-cache"
```

### 7.2. CORS Policy

```yaml
CORS_CONFIGURATION:
  allowed_origins: "Confluence instance domains only"
  allowed_methods: ["GET", "POST", "PUT", "DELETE"]
  allowed_headers: ["Content-Type", "Authorization"]
  max_age: 3600
```

---

## 8. Audit & Logging Standards

### 8.1. Security Event Logging

```yaml
MANDATORY_LOGGING:
  authentication_events: "all authentication attempts"
  authorization_failures: "permission denied events"
  rate_limit_violations: "threshold exceeded events"
  input_validation_failures: "malformed or malicious inputs"

LOG_FORMAT:
  timestamp: "ISO 8601 format"
  user_context: "user identifier and session info"
  operation: "API endpoint and method"
  result: "success/failure with details"
  security_context: "IP address, user agent, rate limit status"
```

### 8.2. Audit Trail Requirements

```yaml
WRITE_OPERATIONS:
  required_fields: ["user", "timestamp", "operation", "resource_id", "changes"]
  retention_period: "7 years minimum"
  format: "structured JSON for analysis"

READ_OPERATIONS:
  access_logging: "optional for performance"
  security_logging: "mandatory for violations"
```

---

## 9. Business Logic Standards

### 9.1. Idempotency Requirements

```yaml
GET_OPERATIONS:
  idempotent: true
  side_effects: "none (excluding access logs)"

POST_OPERATIONS:
  idempotent: false
  side_effects: "resource creation with audit trail"

PUT_OPERATIONS:
  idempotent: true
  side_effects: "resource update with audit trail"

DELETE_OPERATIONS:
  idempotent: true
  side_effects: "resource removal after relationship validation"
```

### 9.2. Relationship Validation

```yaml
BLOCKING_RELATIONSHIPS:
  validation: "mandatory before deletion operations"
  response_format: "detailed blocking relationship information"
  error_code: 409

CASCADE_OPERATIONS:
  policy: "explicit cascade rules documented"
  validation: "referential integrity checks"
  logging: "cascade operation audit trail"
```

---

## 10. Documentation Standards

### 10.1. API Documentation Template

```yaml
REQUIRED_SECTIONS:
  - "API Overview (with security rating and performance SLA)"
  - "Endpoints (with rate limit information)"
  - "Request Details (with validation rules)"
  - "Response Details (with error schemas)"
  - "Authentication & Authorization"
  - "Rate Limiting & Security"
  - "Business Logic & Side Effects"
  - "Dependencies & Backing Services"
  - "Performance Characteristics"
  - "Examples (with security scenarios)"
```

### 10.2. Security Documentation Requirements

```yaml
SECURITY_SECTION:
  rate_limiting: "detailed implementation and limits"
  input_validation: "comprehensive validation rules"
  error_handling: "security-conscious error responses"
  audit_logging: "security event documentation"

PERFORMANCE_SECTION:
  response_times: "typical and maximum SLA"
  throughput: "concurrent request capabilities"
  resource_usage: "memory and database efficiency"
```

---

## 11. Compliance & Monitoring

### 11.1. Security Compliance Checklist

- [ ] Authentication integration implemented
- [ ] Authorization levels configured
- [ ] Rate limiting appropriate for API sensitivity
- [ ] Input validation comprehensive
- [ ] Error handling security-conscious
- [ ] Audit logging implemented
- [ ] Security headers configured
- [ ] Documentation complete and accurate

### 11.2. Performance Monitoring

```yaml
MONITORING_METRICS:
  response_time_p95: "95th percentile response time"
  error_rate: "percentage of 4xx and 5xx responses"
  throughput: "requests per minute sustained"
  rate_limit_violations: "frequency of 429 responses"

ALERTING_THRESHOLDS:
  response_time: ">500ms sustained for 5 minutes"
  error_rate: ">5% for any 10-minute period"
  rate_limit_violations: ">10 per hour for single client"
```

---

## 12. Implementation Guidelines

### 12.1. New API Development

1. **Security First:** Start with security requirements and work outward
2. **Performance by Design:** Consider pagination and query optimization from start
3. **Documentation Driven:** Write documentation first, implement second
4. **Testing Integration:** Include security and performance test scenarios

### 12.2. Existing API Enhancement

1. **Security Assessment:** Rate current implementation against standards
2. **Gap Analysis:** Identify missing security or performance features
3. **Incremental Improvement:** Prioritize by security impact and user benefit
4. **Documentation Update:** Ensure documentation reflects actual implementation

---

## 13. Version History

- **2025-09-16:** Initial comprehensive security and performance standards document
- **2025-09-16:** Established enterprise-grade security rating system
- **2025-09-16:** Defined performance SLA and monitoring requirements

---

> **Note:** These standards are mandatory for all new API development and should be applied incrementally to existing APIs based on security risk assessment and business priority. Regular reviews should be conducted to ensure continued compliance and effectiveness.
