# Dashboard API Specification

## 1. API Overview

- **API Name:** Dashboard API v2
- **Purpose:** Real-time dashboard metrics and health monitoring endpoints for UMIG operations teams. Provides comprehensive system metrics aggregation, operational health monitoring, and performance analytics with intelligent caching for optimal response times.
- **Owner:** UMIG Development Team
- **Related ADRs:** ADR-017 (V2 REST API Architecture), ADR-031 (Type Safety), ADR-042 (Dual Authentication Support)

## 2. Endpoints

| Method | Path               | Description                                           |
| ------ | ------------------ | ----------------------------------------------------- |
| GET    | /dashboard/metrics | Get comprehensive dashboard metrics                   |
| GET    | /dashboard/health  | Get system health monitoring data                     |
| GET    | /dashboard/summary | Get dashboard summary with key performance indicators |

## 3. Request Details

### 3.1. Path Parameters

No path parameters required for any endpoints.

### 3.2. Query Parameters

#### GET /dashboard/metrics

| Name           | Type    | Required | Description                                            |
| -------------- | ------- | -------- | ------------------------------------------------------ |
| includeDetails | Boolean | No       | Include detailed metrics breakdown (default: true)     |
| includeHistory | Boolean | No       | Include historical metrics (default: false)            |
| timeRange      | String  | No       | Time range for metrics: 1h, 6h, 24h, 7d (default: 24h) |
| refreshCache   | Boolean | No       | Force cache refresh (default: false)                   |

#### GET /dashboard/health

| Name              | Type    | Required | Description                                                                |
| ----------------- | ------- | -------- | -------------------------------------------------------------------------- |
| includeComponents | Boolean | No       | Include component health details (default: true)                           |
| includeMetrics    | Boolean | No       | Include performance metrics (default: true)                                |
| healthThreshold   | String  | No       | Health threshold level: excellent, good, warning, critical (default: good) |

#### GET /dashboard/summary

| Name          | Type    | Required | Description                                             |
| ------------- | ------- | -------- | ------------------------------------------------------- |
| kpiOnly       | Boolean | No       | Return only key performance indicators (default: false) |
| includeAlerts | Boolean | No       | Include active alerts and warnings (default: true)      |

### 3.3. Request Body

Not applicable - all endpoints are GET requests.

## 4. Response Details

### 4.1. Success Response

#### GET /dashboard/metrics

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/dashboard/metrics",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "cacheStatus": "string",
    "dataFreshness": "string"
  },
  "metrics": {
    "system": {
      "uptime": "string",
      "performance": {
        "responseTime": "number",
        "throughput": "number",
        "errorRate": "number"
      },
      "resources": {
        "memoryUsage": "number",
        "cpuUsage": "number",
        "diskUsage": "number"
      }
    },
    "operations": {
      "migrations": {
        "active": "integer",
        "completed": "integer",
        "failed": "integer",
        "successRate": "number"
      },
      "steps": {
        "totalExecuted": "integer",
        "averageExecutionTime": "number",
        "failureRate": "number"
      },
      "notifications": {
        "sent": "integer",
        "failed": "integer",
        "deliveryRate": "number"
      }
    },
    "database": {
      "connectionHealth": "string",
      "queryPerformance": "number",
      "activeConnections": "integer",
      "migrationStatus": "string"
    },
    "teams": {
      "activeTeams": "integer",
      "totalUsers": "integer",
      "teamUtilization": "number"
    }
  },
  "trends": {
    "performance": "object (when includeHistory=true)",
    "usage": "object (when includeHistory=true)",
    "alerts": "array of trend objects"
  },
  "lastUpdate": "string (ISO datetime)",
  "cacheExpiry": "string (ISO datetime)"
}
```

#### GET /dashboard/health

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/dashboard/health",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "healthThreshold": "string"
  },
  "overallHealth": {
    "status": "string",
    "score": "number (0-100)",
    "lastAssessment": "string (ISO datetime)",
    "trend": "string"
  },
  "components": {
    "api": {
      "status": "string",
      "score": "number",
      "lastCheck": "string (ISO datetime)",
      "metrics": {
        "responseTime": "number",
        "errorRate": "number",
        "availability": "number"
      }
    },
    "database": {
      "status": "string",
      "score": "number",
      "lastCheck": "string (ISO datetime)",
      "metrics": {
        "connectionHealth": "string",
        "queryPerformance": "number",
        "replicationLag": "number"
      }
    },
    "notifications": {
      "status": "string",
      "score": "number",
      "lastCheck": "string (ISO datetime)",
      "metrics": {
        "deliveryRate": "number",
        "queueHealth": "string",
        "responseTime": "number"
      }
    },
    "fileSystem": {
      "status": "string",
      "score": "number",
      "lastCheck": "string (ISO datetime)",
      "metrics": {
        "diskUsage": "number",
        "ioPerformance": "number",
        "freeSpace": "number"
      }
    }
  },
  "alerts": [
    {
      "severity": "string",
      "component": "string",
      "message": "string",
      "timestamp": "string (ISO datetime)",
      "acknowledged": "boolean"
    }
  ],
  "recommendations": [
    {
      "priority": "string",
      "category": "string",
      "action": "string",
      "impact": "string"
    }
  ]
}
```

#### GET /dashboard/summary

- **Status Code:** 200 OK
- **Content-Type:** application/json
- **Schema:**

```json
{
  "metadata": {
    "endpoint": "/dashboard/summary",
    "generatedAt": "string (ISO datetime)",
    "requestedBy": "string",
    "responseTime": "integer (milliseconds)",
    "summaryType": "string"
  },
  "kpi": {
    "systemAvailability": "number",
    "averageResponseTime": "number",
    "migrationSuccessRate": "number",
    "activeOperations": "integer",
    "criticalAlerts": "integer"
  },
  "quickStats": {
    "activeMigrations": "integer",
    "completedToday": "integer",
    "activeUsers": "integer",
    "systemLoad": "number"
  },
  "healthSummary": {
    "overallScore": "number",
    "componentStatus": "object",
    "trendIndicator": "string"
  },
  "alerts": [
    {
      "severity": "string",
      "count": "integer",
      "latestTimestamp": "string (ISO datetime)"
    }
  ],
  "operationalInsights": {
    "peakUsageTime": "string",
    "bottlenecks": "array of strings",
    "optimizationOpportunities": "array of strings"
  }
}
```

### 4.2. Error Responses

| Status Code | Content-Type     | Schema              | Example                                                                                                    | Description                                        |
| ----------- | ---------------- | ------------------- | ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 500         | application/json | {"error": "string"} | {"error": "Dashboard metrics collection failed", "component": "database", "details": "Connection timeout"} | Internal server error during metrics collection    |
| 503         | application/json | {"error": "string"} | {"error": "Dashboard service temporarily unavailable", "retryAfter": 30}                                   | Service temporarily unavailable due to system load |

## 5. Authentication & Authorization

- **Required?** Yes
- **Mechanism:** Confluence Authentication (groups: ["confluence-users"])
- **Permissions:** User must be member of confluence-users group

## 6. Rate Limiting & Security

- **Rate Limits:** Standard ScriptRunner limits apply
- **RLS (Row-Level Security):** No (aggregated metrics data)
- **Input Validation:**
  - Boolean parameter validation for query parameters
  - Enum validation for timeRange and healthThreshold parameters
  - SQL injection prevented via repository pattern
- **Other Security Considerations:**
  - Dashboard metrics are aggregated operational data
  - No sensitive business data exposed
  - Caching system prevents resource exhaustion

## 7. Business Logic & Side Effects

- **Key Logic:**
  - **Intelligent Caching**: 5-minute TTL cache for metrics with smart invalidation
  - **Health Scoring**: Composite scoring algorithm across multiple system components
  - **Performance Optimization**: Repository field-level instantiation for optimal resource usage
  - **Real-time Aggregation**: Live calculation of operational metrics and KPIs

- **Side Effects:**
  - **Read-Only Operations**: No data modifications
  - **Cache Updates**: Automatic cache refresh based on TTL and data changes
  - **Performance Monitoring**: Contributes to system performance baseline
  - **Audit-Safe**: No audit trail entries created

- **Idempotency:**
  - **Fully Idempotent**: All operations are read-only with consistent caching behavior

## 8. Dependencies & Backing Services

- **DB Tables/Entities:**
  - System performance tables
  - Migration execution logs
  - Component health status tables
  - Operational metrics aggregation views

- **External APIs:** Performance monitoring integrations, system health endpoints
- **Other Services:**
  - AuthenticationService for user context
  - CacheManager for metrics caching
  - HealthMonitoringService for component status

## 9. Versioning & Deprecation

- **API Version:** v2
- **Deprecation Policy:** Breaking changes will require version increment

## 10. Testing & Mock Data

- **Unit Tests:** Component health checks and metrics calculation tests
- **Integration Tests:** Full dashboard data pipeline tested in integration test suite
- **E2E Tests:** Tested via admin monitoring dashboards and operational workflows
- **Mock Data/Fixtures:** Available via npm run generate-data:erase

## 11. Business Logic & Validation Rules

### Dashboard Metrics Collection

- System metrics aggregated from multiple operational data sources
- Health scores calculated using weighted composite algorithm
- Performance metrics derived from real-time system monitoring
- Cache strategy balances real-time accuracy with system performance

### Performance Requirements

- Response time targets: <300ms (metrics), <200ms (health), <150ms (summary)
- Cache TTL: 5 minutes for metrics data with smart invalidation
- Health assessment refresh: Every 60 seconds for critical components
- Background refresh prevents cache miss performance degradation

### Health Assessment Logic

- Overall health calculated from component health scores with weighting
- Thresholds: Excellent (≥90%), Good (≥75%), Warning (≥60%), Critical (<60%)
- Component status: operational, degraded, warning, critical
- Alert generation and recommendation engine for proactive operations

## 12. Examples

### Get Dashboard Metrics

```bash
curl -X GET "/rest/scriptrunner/latest/custom/dashboard/metrics" \
  -H "Authorization: Basic [credentials]"
```

### Get Dashboard Metrics with History

```bash
curl -X GET "/rest/scriptrunner/latest/custom/dashboard/metrics?includeHistory=true&timeRange=24h" \
  -H "Authorization: Basic [credentials]"
```

### Get System Health Status

```bash
curl -X GET "/rest/scriptrunner/latest/custom/dashboard/health?includeComponents=true&healthThreshold=good" \
  -H "Authorization: Basic [credentials]"
```

### Get Dashboard Summary

```bash
curl -X GET "/rest/scriptrunner/latest/custom/dashboard/summary?kpiOnly=false&includeAlerts=true" \
  -H "Authorization: Basic [credentials]"
```

### Force Cache Refresh

```bash
curl -X GET "/rest/scriptrunner/latest/custom/dashboard/metrics?refreshCache=true" \
  -H "Authorization: Basic [credentials]"
```

## 13. Notes

- **Caching Strategy**: 5-minute TTL with intelligent invalidation based on operational data changes
- **Performance Optimization**: Field-level repository instantiation and lazy loading for optimal resource usage
- **Health Monitoring**: Continuous background assessment with proactive alerting and recommendations
- **Operational Focus**: Designed for operations teams requiring real-time visibility into system performance and health

## 14. Related APIs

- **Admin Version API**: System version information that may be included in dashboard metrics
- **Steps API**: Execution metrics that contribute to dashboard operational statistics
- **System Configuration APIs**: Configuration data that influences dashboard behavior and thresholds

## 15. Change Log

- **2025-01-XX:** Initial Dashboard API implementation with caching and health monitoring capabilities

---

> **Note:** Update this specification whenever the API changes. Reference this spec in code reviews and operations documentation.
