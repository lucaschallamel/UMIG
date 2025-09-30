# Admin Version API Specification

## 1. API Overview

- **API Name:** Admin Version API v2
- **Purpose:** System version information and health monitoring endpoints for UMIG admin infrastructure. Provides comprehensive system version aggregation, component status monitoring, cross-component compatibility analysis, and build deployment information for operations teams.
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-031 (Type Safety), ADR-042 (Dual Authentication Support)

## 2. Endpoints

| Method | Path                 | Description                                   |
| ------ | -------------------- | --------------------------------------------- |
| GET    | /admin/version       | Get system version information aggregation    |
| GET    | /admin/components    | Get component status and versions matrix      |
| GET    | /admin/compatibility | Get cross-component compatibility matrix      |
| GET    | /admin/build-info    | Get build metadata and deployment information |

## 3. Request Details

### 3.1. Path Parameters

No path parameters required for any endpoints.

### 3.2. Query Parameters

#### GET /admin/version

| Name           | Type    | Required | Description                                    |
| -------------- | ------- | -------- | ---------------------------------------------- |
| includeDetails | Boolean | No       | Include compatibility details (default: false) |
| includeMetrics | Boolean | No       | Include performance metrics (default: true)    |

#### GET /admin/components

| Name           | Type    | Required | Description                                        |
| -------------- | ------- | -------- | -------------------------------------------------- |
| type           | String  | No       | Filter by component type (api/ui/backend/database) |
| includeMetrics | Boolean | No       | Include performance metrics (default: true)        |
| includeHealth  | Boolean | No       | Include health details (default: true)             |

#### GET /admin/compatibility

| Name                   | Type    | Required | Description                                      |
| ---------------------- | ------- | -------- | ------------------------------------------------ |
| source                 | String  | No       | Source component for compatibility analysis      |
| target                 | String  | No       | Target component for compatibility analysis      |
| includeUpgradePaths    | Boolean | No       | Include upgrade recommendations (default: true)  |
| includeBreakingChanges | Boolean | No       | Include breaking change analysis (default: true) |

#### GET /admin/build-info

| Name               | Type    | Required | Description                                     |
| ------------------ | ------- | -------- | ----------------------------------------------- |
| includePackages    | Boolean | No       | Include package metadata (default: true)        |
| includeEnvironment | Boolean | No       | Include environment information (default: true) |
| includeResources   | Boolean | No       | Include resource metrics (default: false)       |

### 3.3. Request Body

Not applicable - all endpoints are GET requests.

## 4. Response Details

### 4.1. Success Response

#### GET /admin/version

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/admin/version",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "dataFreshness": "string"
  },
  "system": {
    "version": "string",
    "components": {
      "api": {
        "version": "string",
        "status": "string",
        "endpoints": "integer"
      },
      "ui": {
        "version": "string",
        "status": "string",
        "components": "integer"
      },
      "backend": {
        "version": "string",
        "status": "string",
        "services": "integer"
      },
      "database": {
        "version": "string",
        "status": "string",
        "changesets": "integer"
      }
    },
    "lastUpdate": "string (ISO datetime)",
    "uptime": "string",
    "buildNumber": "string",
    "deploymentTarget": "string"
  },
  "database": {
    "semanticVersion": "string",
    "changesetCount": "integer",
    "latestChangeset": "string",
    "packageVersions": {
      "sql": "string",
      "liquibase": "string"
    },
    "categories": "object",
    "lastAnalysis": "string (ISO datetime)",
    "performanceMetrics": "object"
  },
  "deployment": {
    "environment": "string",
    "deployedAt": "string (ISO datetime)",
    "deployedBy": "string",
    "buildTag": "string",
    "gitCommit": "string",
    "configurationVersion": "string",
    "systemHealth": "string",
    "lastHealthCheck": "string (ISO datetime)"
  },
  "health": {
    "status": "string",
    "score": "integer",
    "issues": ["array of strings"],
    "lastAssessment": "string (ISO datetime)",
    "recommendations": ["array of objects"]
  },
  "compatibility": "object (when includeDetails=true)",
  "metrics": "object (when includeMetrics=true)"
}
```

#### GET /admin/components

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/admin/components",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "componentTypes": ["array of strings"]
  },
  "versionMatrix": [
    {
      "component": "string",
      "version": "string",
      "status": "string",
      "compatibility": "string"
    }
  ],
  "components": {
    "api": {
      "version": "string",
      "status": "string",
      "health": "string",
      "endpoints": "integer",
      "lastHealthCheck": "string (ISO datetime)",
      "responseTime": "string",
      "errorRate": "string"
    },
    "ui": {
      "version": "string",
      "status": "string",
      "health": "string",
      "components": "integer",
      "loadTime": "string",
      "componentOrchestrator": "string",
      "securityRating": "string"
    },
    "backend": {
      "version": "string",
      "status": "string",
      "health": "string",
      "services": "integer",
      "repositories": "integer",
      "testCoverage": "string",
      "performanceOptimized": "boolean"
    },
    "database": {
      "version": "string",
      "status": "string",
      "health": "string",
      "changesets": "integer",
      "lastMigration": "string",
      "integrityCheck": "string"
    }
  },
  "health": {
    "overallHealth": "string",
    "healthyComponents": "integer",
    "totalComponents": "integer",
    "healthPercentage": "number",
    "lastAssessment": "string (ISO datetime)"
  },
  "performance": "object (when includeMetrics=true)",
  "recommendations": ["array of objects"]
}
```

#### GET /admin/compatibility

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/admin/compatibility",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "analysisScope": "string"
  },
  "matrix": {
    "api": {
      "ui": {
        "score": "number",
        "status": "string",
        "issues": ["array of strings"]
      },
      "backend": "object",
      "database": "object"
    },
    "ui": "object",
    "backend": "object",
    "database": "object"
  },
  "overallCompatibility": "number",
  "breakingChanges": {
    "detected": "integer",
    "changes": ["array of change objects"],
    "lastAnalysis": "string (ISO datetime)"
  },
  "upgradePaths": {
    "available": ["array of upgrade objects"],
    "recommendations": ["array of recommendation objects"]
  },
  "risks": ["array of risk objects"],
  "recommendations": ["array of recommendation objects"]
}
```

#### GET /admin/build-info

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/admin/build-info",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "informationScope": "string"
  },
  "build": {
    "version": "string",
    "buildNumber": "string",
    "buildTime": "string (ISO datetime)",
    "gitCommit": "string",
    "gitBranch": "string",
    "buildEnvironment": "string",
    "compiler": "string",
    "javaVersion": "string",
    "artifactVersion": "string"
  },
  "packages": {
    "sql": {
      "version": "string",
      "changesets": "integer",
      "lastGenerated": "string (ISO datetime)",
      "packageSize": "string",
      "status": "string"
    },
    "liquibase": {
      "version": "string",
      "changelogVersion": "string",
      "lastGenerated": "string (ISO datetime)",
      "packageSize": "string",
      "status": "string"
    },
    "deployment": {
      "packagesAvailable": "integer",
      "deploymentReady": "boolean",
      "lastPackageGeneration": "string (ISO datetime)",
      "generationTime": "string"
    }
  },
  "environment": {
    "name": "string",
    "confluence": "object",
    "database": "object",
    "scriptRunner": "object",
    "jvm": "object"
  },
  "resources": "object (when includeResources=true)",
  "deployment": {
    "ready": "boolean",
    "status": "string",
    "checks": ["array of check objects"],
    "assessmentTime": "string (ISO datetime)",
    "confidence": "number"
  },
  "recommendations": ["array of recommendation objects"]
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema              | Example                                                                                               | Description                            |
| ----------- | ---------------- | ------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------- |
| 500         | application/json | {"error": "string"} | {"error": "Internal server error during version detection", "message": "Database connection timeout"} | Database connectivity or system errors |
| 503         | application/json | {"error": "string"} | {"error": "Service temporarily unavailable - version detection timeout", "timeout": "500ms exceeded"} | Performance timeout (>500ms)           |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication (groups: ["confluence-users"])
- **Permissions:** User must be member of confluence-users group

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (data access controlled by Confluence permissions)
- **Input Validation:**
  - Boolean parameter validation for query parameters
  - Type casting validation (ADR-031)
  - SQL injection prevented via prepared statements
- **Other Security Considerations:**
  - System version information is non-sensitive operational data
  - Performance timeouts prevent resource exhaustion

## 7. Business Logic & Side Effects

- **Key Logic:**
  - **Parallel Data Collection**: Uses CompletableFuture for concurrent data gathering
  - **Performance Targets**: All endpoints target <500ms response times
  - **Health Scoring**: Calculates overall system health from component metrics
  - **Compatibility Analysis**: Provides cross-component compatibility matrix

- **Side Effects:**
  - **Read-Only Operations**: No data modifications
  - **No Notifications**: Does not trigger notification systems
  - **Audit-Safe**: No audit trail entries created

- **Idempotency:**
  - **Fully Idempotent**: All operations are read-only and produce consistent results

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `databasechangelog` (Liquibase changesets)
  - System configuration tables
  - Component version metadata

- **External APIs:** DatabaseVersionManager.js, ComponentVersionTracker.js integration
- **Other Services:**
  - AuthenticationService for user context
  - DatabaseUtil for connection management

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment

## 10. Testing & Mock Data

- **Unit Tests:** Component health checks and version detection tests
- **Integration Tests:** Full version aggregation tested in integration test suite
- **E2E Tests:** Tested via admin monitoring dashboards
- **Mock Data/Fixtures:** Available via npm run generate-data:erase

## 11. Business Logic & Validation Rules

### Version Information Collection

- System version derived from latest database changeset (v1.31.0)
- Component versions tracked independently (API v2.4.0, UI v1.0.0, Backend v1.0.0)
- Health scores calculated from component performance and availability
- Database version integration with Liquibase changelog analysis

### Performance Requirements

- Response time targets: <200ms (version), <300ms (components), <400ms (compatibility), <250ms (build-info)
- Timeout handling: 500ms maximum with graceful degradation
- Parallel processing for optimal performance across all data collection

### Health Assessment

- Overall health calculated from component health scores
- Thresholds: Excellent (≥90%), Good (≥75%), Warning (≥60%), Critical (<60%)
- Component status: operational, degraded, critical
- Issue tracking and recommendation generation

## 12. Examples

### Get System Version Information

```bash
curl -X GET "/rest/scriptrunner/latest/custom/admin/version" \
  -H "Authorization: Basic [credentials]"
```

### Get System Version with Details

```bash
curl -X GET "/rest/scriptrunner/latest/custom/admin/version?includeDetails=true&includeMetrics=true" \
  -H "Authorization: Basic [credentials]"
```

### Get Component Status Matrix

```bash
curl -X GET "/rest/scriptrunner/latest/custom/admin/components?includeMetrics=true&includeHealth=true" \
  -H "Authorization: Basic [credentials]"
```

### Get Compatibility Analysis

```bash
curl -X GET "/rest/scriptrunner/latest/custom/admin/compatibility?source=api&target=database&includeUpgradePaths=true" \
  -H "Authorization: Basic [credentials]"
```

### Get Build Information

```bash
curl -X GET "/rest/scriptrunner/latest/custom/admin/build-info?includePackages=true&includeEnvironment=true&includeResources=false" \
  -H "Authorization: Basic [credentials]"
```

## 13. Notes

- **Performance Optimization**: All endpoints use parallel data collection with CompletableFuture for sub-500ms response times
- **Integration Points**: Designed for US-088 Phase 2 health endpoints integration with DatabaseVersionManager and ComponentVersionTracker JavaScript components
- **Operational Focus**: Provides comprehensive system visibility for operations teams and admin infrastructure monitoring
- **Error Handling**: Graceful timeout handling with partial data availability when components are temporarily unavailable

## 14. Related APIs

- **DatabaseVersions API**: Database-specific version management and migration tracking
- **Dashboard API**: Dashboard metrics that may consume admin version information
- **System Configuration APIs**: Configuration management that influences version reporting

## 15. Change Log

- **2025-01-XX:** Initial Admin Version API implementation for US-088 Phase 2 health endpoints integration

---

> **Note:** Update this specification whenever the API changes. Reference this spec in code reviews and operations documentation.
