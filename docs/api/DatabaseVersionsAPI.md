# Database Versions API Specification

## 1. API Overview

- **API Name:** Database Versions API v2
- **Purpose:** Comprehensive Liquibase database version management and migration tracking for UMIG infrastructure. Provides detailed changeset analysis, package generation, health monitoring, and validation capabilities for database schema evolution and deployment orchestration.
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-031 (Type Safety), ADR-042 (Dual Authentication Support), ADR-036 (Database Migration Management)

## 2. Endpoints

| Method | Path                                 | Description                                      |
| ------ | ------------------------------------ | ------------------------------------------------ |
| GET    | /database-versions                   | Get comprehensive database version information   |
| GET    | /database-versions/{id}              | Get specific database version by ID              |
| GET    | /database-versions/statistics        | Get database version statistics and analytics    |
| GET    | /database-versions/validate          | Validate database schema and migration integrity |
| GET    | /database-versions/health            | Get database health and migration status         |
| GET    | /database-versions/package/sql       | Generate SQL package for deployment              |
| GET    | /database-versions/package/liquibase | Generate Liquibase package for deployment        |

## 3. Request Details

### 3.1. Path Parameters

#### GET /database-versions/{id}

| Name | Type | Required | Description                        |
| ---- | ---- | -------- | ---------------------------------- |
| id   | UUID | Yes      | Database version unique identifier |

### 3.2. Query Parameters

#### GET /database-versions

| Name               | Type    | Required | Description                                        |
| ------------------ | ------- | -------- | -------------------------------------------------- |
| includeChangesets  | Boolean | No       | Include changeset details (default: true)          |
| includeStatistics  | Boolean | No       | Include version statistics (default: false)        |
| includePackageInfo | Boolean | No       | Include package generation info (default: false)   |
| versionFilter      | String  | No       | Filter by version pattern (e.g., "1.30.\*")        |
| statusFilter       | String  | No       | Filter by status: applied, pending, failed         |
| limit              | Integer | No       | Maximum number of versions to return (default: 50) |

#### GET /database-versions/statistics

| Name               | Type    | Required | Description                                                             |
| ------------------ | ------- | -------- | ----------------------------------------------------------------------- |
| groupBy            | String  | No       | Group statistics by: version, author, category, date (default: version) |
| includePerformance | Boolean | No       | Include performance metrics (default: true)                             |
| timeRange          | String  | No       | Time range for stats: 7d, 30d, 90d, all (default: 30d)                  |

#### GET /database-versions/validate

| Name                   | Type    | Required | Description                                                          |
| ---------------------- | ------- | -------- | -------------------------------------------------------------------- |
| validationType         | String  | No       | Validation type: schema, integrity, dependencies, all (default: all) |
| includeRecommendations | Boolean | No       | Include optimization recommendations (default: true)                 |
| strictMode             | Boolean | No       | Enable strict validation rules (default: false)                      |

#### GET /database-versions/health

| Name               | Type    | Required | Description                                                          |
| ------------------ | ------- | -------- | -------------------------------------------------------------------- |
| includePerformance | Boolean | No       | Include performance health metrics (default: true)                   |
| includeCapacity    | Boolean | No       | Include capacity analysis (default: true)                            |
| healthThreshold    | String  | No       | Health threshold: excellent, good, warning, critical (default: good) |

#### GET /database-versions/package/sql and /database-versions/package/liquibase

| Name              | Type    | Required | Description                                                      |
| ----------------- | ------- | -------- | ---------------------------------------------------------------- |
| versionFrom       | String  | No       | Starting version for package generation                          |
| versionTo         | String  | No       | Target version for package generation                            |
| includeRollback   | Boolean | No       | Include rollback scripts (default: true)                         |
| environmentTarget | String  | No       | Target environment: dev, test, prod (default: dev)               |
| compressionLevel  | String  | No       | Package compression: none, standard, maximum (default: standard) |

### 3.3. Request Body

Not applicable - all endpoints are GET requests.

## 4. Response Details

### 4.1. Success Response

#### GET /database-versions

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/database-versions",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "totalVersions": "integer",
    "filteredVersions": "integer"
  },
  "currentVersion": {
    "semanticVersion": "string",
    "changesetCount": "integer",
    "lastChangeset": "string",
    "status": "string",
    "deployedAt": "string (ISO datetime)"
  },
  "versions": [
    {
      "id": "string (UUID)",
      "semanticVersion": "string",
      "changesetCount": "integer",
      "status": "string",
      "createdAt": "string (ISO datetime)",
      "deployedAt": "string (ISO datetime)",
      "author": "string",
      "description": "string",
      "changesets": "array (when includeChangesets=true)",
      "statistics": "object (when includeStatistics=true)",
      "packageInfo": "object (when includePackageInfo=true)"
    }
  ],
  "summary": {
    "totalChangesets": "integer",
    "appliedChangesets": "integer",
    "pendingChangesets": "integer",
    "failedChangesets": "integer",
    "lastMigrationDate": "string (ISO datetime)"
  }
}
```

#### GET /database-versions/{id}

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/database-versions/{id}",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "versionId": "string (UUID)"
  },
  "version": {
    "id": "string (UUID)",
    "semanticVersion": "string",
    "changesetCount": "integer",
    "status": "string",
    "createdAt": "string (ISO datetime)",
    "deployedAt": "string (ISO datetime)",
    "author": "string",
    "description": "string",
    "tags": "array of strings",
    "changesets": [
      {
        "id": "string",
        "filename": "string",
        "changesetId": "string",
        "author": "string",
        "description": "string",
        "executedAt": "string (ISO datetime)",
        "executionTime": "integer (milliseconds)",
        "status": "string",
        "checksum": "string",
        "rollbackAvailable": "boolean"
      }
    ],
    "dependencies": [
      {
        "dependencyType": "string",
        "targetVersion": "string",
        "description": "string"
      }
    ],
    "performance": {
      "migrationTime": "integer (milliseconds)",
      "rollbackTime": "integer (milliseconds)",
      "impactedTables": "integer",
      "performanceRating": "string"
    }
  }
}
```

#### GET /database-versions/statistics

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/database-versions/statistics",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "timeRange": "string",
    "groupBy": "string"
  },
  "overview": {
    "totalVersions": "integer",
    "totalChangesets": "integer",
    "averageMigrationTime": "number",
    "successRate": "number",
    "lastAnalysis": "string (ISO datetime)"
  },
  "statistics": [
    {
      "groupKey": "string",
      "versionCount": "integer",
      "changesetCount": "integer",
      "averageExecutionTime": "number",
      "successRate": "number",
      "failureCount": "integer"
    }
  ],
  "trends": {
    "migrationFrequency": "array of trend objects",
    "performanceTrends": "array of trend objects",
    "errorPatterns": "array of trend objects"
  },
  "performance": {
    "fastestMigration": "object",
    "slowestMigration": "object",
    "averageChangesetsPerVersion": "number",
    "migrationComplexityTrend": "string"
  }
}
```

#### GET /database-versions/validate

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/database-versions/validate",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "validationType": "string",
    "strictMode": "boolean"
  },
  "validation": {
    "overallStatus": "string",
    "validationScore": "number (0-100)",
    "lastValidation": "string (ISO datetime)",
    "validationTime": "integer (milliseconds)"
  },
  "results": {
    "schema": {
      "status": "string",
      "issues": "array of issue objects",
      "score": "number"
    },
    "integrity": {
      "status": "string",
      "issues": "array of issue objects",
      "score": "number"
    },
    "dependencies": {
      "status": "string",
      "issues": "array of issue objects",
      "score": "number"
    },
    "performance": {
      "status": "string",
      "issues": "array of issue objects",
      "score": "number"
    }
  },
  "issues": [
    {
      "severity": "string",
      "category": "string",
      "description": "string",
      "recommendation": "string",
      "impactedObjects": "array of strings",
      "estimatedFixTime": "string"
    }
  ],
  "recommendations": [
    {
      "priority": "string",
      "category": "string",
      "action": "string",
      "impact": "string",
      "effort": "string"
    }
  ]
}
```

#### GET /database-versions/health

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/database-versions/health",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "healthThreshold": "string"
  },
  "health": {
    "overallHealth": "string",
    "healthScore": "number (0-100)",
    "lastAssessment": "string (ISO datetime)",
    "trend": "string"
  },
  "components": {
    "migrationEngine": {
      "status": "string",
      "lastMigration": "string (ISO datetime)",
      "pendingMigrations": "integer",
      "failureRate": "number"
    },
    "schemaIntegrity": {
      "status": "string",
      "integrityScore": "number",
      "lastCheck": "string (ISO datetime)",
      "issueCount": "integer"
    },
    "performance": {
      "status": "string",
      "averageExecutionTime": "number",
      "performanceTrend": "string",
      "bottlenecks": "array of strings"
    },
    "capacity": {
      "status": "string",
      "utilizationPercentage": "number",
      "growthRate": "number",
      "estimatedCapacity": "string"
    }
  },
  "alerts": [
    {
      "severity": "string",
      "component": "string",
      "message": "string",
      "timestamp": "string (ISO datetime)",
      "actionRequired": "boolean"
    }
  ]
}
```

#### GET /database-versions/package/sql and /database-versions/package/liquibase

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/database-versions/package/{type}",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "packageType": "string",
    "environmentTarget": "string"
  },
  "package": {
    "packageId": "string (UUID)",
    "version": "string",
    "packageType": "string",
    "generatedAt": "string (ISO datetime)",
    "size": "integer (bytes)",
    "compressionLevel": "string",
    "checksumSHA256": "string"
  },
  "contents": {
    "changesets": "array of changeset objects",
    "rollbackScripts": "array of rollback objects (when includeRollback=true)",
    "dependencies": "array of dependency objects",
    "metadata": "object"
  },
  "deployment": {
    "deploymentReady": "boolean",
    "validationStatus": "string",
    "estimatedDeploymentTime": "string",
    "riskAssessment": "string",
    "prerequisites": "array of strings"
  },
  "downloadInfo": {
    "downloadUrl": "string",
    "expiresAt": "string (ISO datetime)",
    "accessToken": "string"
  }
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema              | Example                                                                                                  | Description                                   |
| ----------- | ---------------- | ------------------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| 400         | application/json | {"error": "string"} | {"error": "Invalid version ID format", "provided": "invalid-uuid", "expected": "UUID format"}            | Invalid request parameters or malformed UUID  |
| 404         | application/json | {"error": "string"} | {"error": "Database version not found", "versionId": "123e4567-e89b-12d3-a456-426614174000"}             | Version ID not found in database              |
| 500         | application/json | {"error": "string"} | {"error": "Database version analysis failed", "component": "liquibase", "details": "Connection timeout"} | Internal server error during version analysis |
| 503         | application/json | {"error": "string"} | {"error": "Database versioning service temporarily unavailable", "reason": "Migration in progress"}      | Service temporarily unavailable               |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication (groups: ["confluence-users"])
- **Permissions:** User must be member of confluence-users group

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (database version information is operational data)
- **Input Validation:**
  - UUID format validation for version IDs
  - Enum validation for filter parameters
  - Type casting validation (ADR-031)
  - SQL injection prevented via repository pattern
- **Other Security Considerations:**
  - Database schema information requires operational privileges
  - Package generation includes access controls and expiration
  - Sensitive configuration data excluded from responses

## 7. Business Logic & Side Effects

- **Key Logic:**
  - **Liquibase Integration**: Direct integration with Liquibase changelog analysis and package generation
  - **Semantic Versioning**: Automatic semantic version derivation from database changelog structure
  - **Package Generation**: On-demand SQL and Liquibase package creation for deployment
  - **Health Monitoring**: Continuous database schema health assessment and integrity validation
  - **Performance Analysis**: Migration performance tracking and optimization recommendations

- **Side Effects:**
  - **Read-Only Operations**: No database schema modifications
  - **Package Generation**: Creates temporary deployment packages with expiration
  - **Performance Logging**: Contributes to database performance baseline
  - **Cache Updates**: Updates version information cache based on schema changes

- **Idempotency:**
  - **Fully Idempotent**: All operations are read-only except temporary package generation

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - `databasechangelog` (Liquibase standard table)
  - `databasechangeloglock` (Liquibase lock table)
  - Version metadata and tracking tables
  - Performance metrics and analysis tables

- **External APIs:** Liquibase Engine, DatabaseVersionManager.js integration
- **Other Services:**
  - AuthenticationService for user context
  - DatabaseUtil for connection management
  - PackageGenerationService for deployment artifacts
  - PerformanceAnalysisService for metrics collection

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment

## 10. Testing & Mock Data

- **Unit Tests:** Version parsing, changeset analysis, and package generation tests
- **Integration Tests:** Full Liquibase integration tested in database test suite
- **E2E Tests:** Tested via deployment workflows and database migration scenarios
- **Mock Data/Fixtures:** Available via npm run generate-data:erase

## 11. Business Logic & Validation Rules

### Database Version Management

- Semantic versions derived from Liquibase changelog structure and metadata
- Changeset tracking with execution performance metrics and rollback capabilities
- Package generation with environment-specific configuration and validation
- Health scoring based on schema integrity, performance metrics, and migration success rates

### Performance Requirements

- Response time targets: <400ms (versions), <300ms (statistics), <500ms (validation), <200ms (health), <2s (package generation)
- Package generation: Temporary packages with 24-hour expiration for security
- Validation cycles: Schema integrity checks every 15 minutes
- Performance analysis: Continuous monitoring with trend analysis

### Validation and Health Assessment

- Schema integrity validation using Liquibase built-in validation
- Dependency analysis across changeset relationships
- Performance assessment based on execution time patterns
- Health thresholds: Excellent (≥95%), Good (≥85%), Warning (≥70%), Critical (<70%)

## 12. Examples

### Get Database Versions

```bash
curl -X GET "/rest/scriptrunner/latest/custom/database-versions" \
  -H "Authorization: Basic [credentials]"
```

### Get Database Versions with Changesets

```bash
curl -X GET "/rest/scriptrunner/latest/custom/database-versions?includeChangesets=true&includeStatistics=true" \
  -H "Authorization: Basic [credentials]"
```

### Get Specific Database Version

```bash
curl -X GET "/rest/scriptrunner/latest/custom/database-versions/123e4567-e89b-12d3-a456-426614174000" \
  -H "Authorization: Basic [credentials]"
```

### Get Database Version Statistics

```bash
curl -X GET "/rest/scriptrunner/latest/custom/database-versions/statistics?groupBy=author&timeRange=30d&includePerformance=true" \
  -H "Authorization: Basic [credentials]"
```

### Validate Database Schema

```bash
curl -X GET "/rest/scriptrunner/latest/custom/database-versions/validate?validationType=all&strictMode=true" \
  -H "Authorization: Basic [credentials]"
```

### Get Database Health

```bash
curl -X GET "/rest/scriptrunner/latest/custom/database-versions/health?includePerformance=true&includeCapacity=true" \
  -H "Authorization: Basic [credentials]"
```

### Generate SQL Package

```bash
curl -X GET "/rest/scriptrunner/latest/custom/database-versions/package/sql?versionFrom=1.30.0&versionTo=1.31.0&includeRollback=true&environmentTarget=prod" \
  -H "Authorization: Basic [credentials]"
```

### Generate Liquibase Package

```bash
curl -X GET "/rest/scriptrunner/latest/custom/database-versions/package/liquibase?compressionLevel=maximum&environmentTarget=prod" \
  -H "Authorization: Basic [credentials]"
```

## 13. Notes

- **Liquibase Integration**: Direct integration with Liquibase engine for comprehensive changeset management and package generation
- **Performance Optimization**: Repository pattern with lazy loading for optimal resource usage during version analysis
- **Package Security**: Generated packages include access controls, checksums, and automatic expiration for secure deployment
- **Health Monitoring**: Continuous schema health assessment with proactive alerting for migration issues

## 14. Related APIs

- **Admin Version API**: System version information that includes database version data
- **Dashboard API**: Dashboard metrics that may consume database health information
- **System Configuration APIs**: Configuration management for database connection and migration settings

## 15. Change Log

- **2025-01-XX:** Initial Database Versions API implementation with comprehensive Liquibase integration and package generation capabilities

---

> **Note:** Update this specification whenever the API changes. Reference this spec in code reviews and database migration procedures.
