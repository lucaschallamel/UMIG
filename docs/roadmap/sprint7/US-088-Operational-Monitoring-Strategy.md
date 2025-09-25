# US-088: Operational Monitoring & Deployment Tracking Strategy

**Document**: Operational Monitoring for Multi-Component UMIG Architecture
**Sprint**: 7 (US-088 - Build Process and Deployment Packaging)
**Author**: Lucas Challamel
**Date**: 2025-09-25
**Status**: IMPLEMENTATION_GUIDE

## Executive Summary

This document defines comprehensive operational monitoring and deployment tracking for UMIG's multi-component architecture, ensuring full visibility into version status, component health, and deployment lifecycle across all environments.

## 1. Deployment Tracking Architecture

### 1.1 Environment State Management

```json
{
  "environments": {
    "development": {
      "umigVersion": "1.3.0-dev+ci.1245",
      "deployedAt": "2024-09-25T10:15:30Z",
      "components": {
        "database": "032-dev",
        "api": "2.4.0-dev",
        "ui": "1.3.0-dev",
        "backend": "1.3.0-dev"
      },
      "status": "active",
      "health": "healthy",
      "uptime": "2h 45m"
    },
    "uat": {
      "umigVersion": "1.2.0-rc.2",
      "deployedAt": "2024-09-24T14:30:00Z",
      "components": {
        "database": "031",
        "api": "2.3.1",
        "ui": "1.2.0",
        "backend": "1.2.0"
      },
      "status": "testing",
      "health": "healthy",
      "uptime": "1d 2h 15m"
    },
    "production": {
      "umigVersion": "1.1.2",
      "deployedAt": "2024-09-20T09:00:00Z",
      "components": {
        "database": "030",
        "api": "2.3.0",
        "ui": "1.1.2",
        "backend": "1.1.2"
      },
      "status": "stable",
      "health": "healthy",
      "uptime": "5d 7h 45m"
    }
  }
}
```

### 1.2 Deployment History Tracking

```json
{
  "deploymentHistory": [
    {
      "id": "deploy-prod-20240925-143055",
      "environment": "production",
      "version": "1.2.0",
      "deployedAt": "2024-09-25T14:30:55Z",
      "deployedBy": "automation",
      "artifact": "umig-app-v1.2.0-20240925.143055.zip",
      "status": "successful",
      "duration": "4m 32s",
      "previousVersion": "1.1.2",
      "rollback": null,
      "validationResults": {
        "healthChecks": "passed",
        "smokeTests": "passed",
        "performanceBaseline": "passed"
      }
    },
    {
      "id": "deploy-uat-20240924-143000",
      "environment": "uat",
      "version": "1.2.0-rc.2",
      "deployedAt": "2024-09-24T14:30:00Z",
      "deployedBy": "lucas.challamel",
      "artifact": "umig-app-v1.2.0-rc.2-20240924.143000.zip",
      "status": "successful",
      "duration": "3m 18s",
      "previousVersion": "1.2.0-rc.1",
      "rollback": null
    }
  ]
}
```

## 2. Real-Time Health Monitoring

### 2.1 Health Check Endpoints

```groovy
// /rest/scriptrunner/latest/custom/admin/health
@BaseScript CustomEndpointDelegate delegate

adminHealth(httpMethod: "GET", groups: ["confluence-administrators"]) { request, binding ->
    def healthData = [
        umig: [
            version: UMIGVersion.VERSION,
            status: "healthy",
            uptime: getUptime(),
            deployedAt: UMIGVersion.DEPLOYED_AT
        ],
        components: [
            database: checkDatabaseHealth(),
            api: checkApiHealth(),
            ui: checkUIComponentHealth(),
            authentication: checkAuthenticationHealth()
        ],
        system: [
            confluence: getConfluenceVersion(),
            postgresql: getDatabaseVersion(),
            scriptrunner: getScriptRunnerVersion(),
            java: System.getProperty("java.version")
        ],
        metrics: [
            activeUsers: getActiveUserCount(),
            apiCalls24h: getApiCallCount(),
            errorRate: getErrorRate(),
            responseTime: getAverageResponseTime()
        ]
    ]

    return Response.ok(new JsonBuilder(healthData).toPrettyString()).build()
}

// Component health check functions
def checkDatabaseHealth() {
    try {
        DatabaseUtil.withSql { sql ->
            def result = sql.firstRow("SELECT 1 as health_check")
            return [
                status: "healthy",
                responseTime: "${System.currentTimeMillis() - startTime}ms",
                schemaVersion: getCurrentSchemaVersion(),
                connections: getActiveConnectionCount()
            ]
        }
    } catch (Exception e) {
        return [
            status: "unhealthy",
            error: e.message,
            lastCheck: new Date().toString()
        ]
    }
}

def checkUIComponentHealth() {
    return [
        status: "healthy",
        componentsLoaded: 25,
        securityRating: "8.5/10",
        performanceScore: "A+",
        lastUpdate: UMIGVersion.BUILD
    ]
}
```

### 2.2 Version Information Endpoint

```groovy
// /rest/scriptrunner/latest/custom/admin/version
adminVersion(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def versionInfo = [
        umig: [
            version: UMIGVersion.VERSION,
            build: UMIGVersion.BUILD,
            codename: UMIGVersion.CODENAME,
            environment: System.getProperty("umig.environment", "unknown")
        ],
        components: [
            database: [
                schema: getCurrentSchemaVersion(),
                semantic: getDatabaseSemanticVersion(),
                changesets: getTotalChangesets()
            ],
            api: [
                version: "v2.3.1",
                endpoints: 27,
                compatibility: "v2.x"
            ],
            ui: [
                version: UMIGVersion.VERSION,
                components: 25,
                architecture: "ComponentOrchestrator"
            ],
            backend: [
                version: UMIGVersion.VERSION,
                groovy: GroovySystem.version,
                java: System.getProperty("java.version")
            ]
        ],
        deployment: [
            deployedAt: UMIGVersion.DEPLOYED_AT,
            deployedBy: UMIGVersion.DEPLOYED_BY,
            artifact: UMIGVersion.ARTIFACT_NAME,
            buildNumber: UMIGVersion.BUILD_NUMBER
        ]
    ]

    return Response.ok(new JsonBuilder(versionInfo).toPrettyString()).build()
}
```

### 2.3 Component Status Monitoring

```groovy
// /rest/scriptrunner/latest/custom/admin/components
adminComponents(httpMethod: "GET", groups: ["confluence-administrators"]) { request, binding ->
    def componentStatus = [
        orchestrator: [
            status: "active",
            components: getLoadedComponents(),
            performance: getComponentPerformanceMetrics(),
            security: getSecurityStatus()
        ],
        entityManagers: [
            teams: checkEntityManagerHealth("TeamsEntityManager"),
            users: checkEntityManagerHealth("UsersEntityManager"),
            applications: checkEntityManagerHealth("ApplicationsEntityManager"),
            environments: checkEntityManagerHealth("EnvironmentsEntityManager")
        ],
        services: [
            stepDataTransformation: checkServiceHealth("StepDataTransformationService"),
            emailService: checkServiceHealth("EnhancedEmailService"),
            notificationIntegration: checkServiceHealth("StepNotificationIntegration")
        ],
        repositories: [
            status: "healthy",
            pattern: "unified-with-enrichment",
            activeConnections: getRepositoryConnectionCount(),
            queryPerformance: getQueryPerformanceMetrics()
        ]
    ]

    return Response.ok(new JsonBuilder(componentStatus).toPrettyString()).build()
}
```

## 3. Monitoring Dashboard Integration

### 3.1 Metrics Collection Configuration

```json
{
  "metrics": {
    "collection": {
      "interval": "30s",
      "retention": "90d",
      "aggregation": "1m"
    },
    "endpoints": [
      {
        "path": "/admin/health",
        "method": "GET",
        "frequency": "30s",
        "timeout": "10s",
        "alertOnFailure": true
      },
      {
        "path": "/admin/version",
        "method": "GET",
        "frequency": "5m",
        "versionDrift": true
      },
      {
        "path": "/admin/components",
        "method": "GET",
        "frequency": "1m",
        "componentHealth": true
      }
    ],
    "businessMetrics": [
      {
        "name": "active-migrations",
        "query": "SELECT COUNT(*) FROM mig_master WHERE status = 'ACTIVE'",
        "frequency": "5m"
      },
      {
        "name": "completed-steps-24h",
        "query": "SELECT COUNT(*) FROM ste_instance WHERE completed_on > NOW() - INTERVAL '24 hours'",
        "frequency": "10m"
      },
      {
        "name": "user-activity",
        "query": "SELECT COUNT(DISTINCT usr_id) FROM ste_instance WHERE created_on > NOW() - INTERVAL '1 hour'",
        "frequency": "5m"
      }
    ]
  }
}
```

### 3.2 Alert Configuration

```yaml
alerts:
  - name: umig-health-check-failed
    description: UMIG health check endpoint returning errors
    condition: health_check_success < 1
    severity: critical
    threshold: 3_consecutive_failures
    actions:
      - notification: pagerduty
      - notification: slack-critical
      - action: auto-rollback-trigger

  - name: umig-version-drift-detected
    description: Version mismatch detected between components
    condition: component_version_mismatch > 0
    severity: high
    actions:
      - notification: slack-devops
      - action: deployment-freeze

  - name: umig-component-degraded
    description: UMIG component showing degraded performance
    condition: component_health_score < 0.8
    severity: medium
    threshold: 5m
    actions:
      - notification: slack-dev-team
      - action: performance-investigation

  - name: umig-api-error-rate-high
    description: API error rate above threshold
    condition: api_error_rate > 0.05
    severity: high
    threshold: 2m
    actions:
      - notification: slack-critical
      - action: traffic-analysis

  - name: umig-deployment-failed
    description: UMIG deployment failed validation
    condition: deployment_success < 1
    severity: critical
    actions:
      - notification: pagerduty
      - notification: slack-critical
      - action: auto-rollback
      - action: incident-creation
```

## 4. Deployment Lifecycle Monitoring

### 4.1 Pre-Deployment Monitoring

```bash
#!/bin/bash
# scripts/monitoring/pre-deployment-monitor.sh

monitor_pre_deployment() {
    echo "=== Pre-Deployment Monitoring ==="

    # System health baseline
    echo "📊 Collecting baseline metrics..."
    collect_baseline_metrics

    # Version compatibility check
    echo "🔍 Validating version compatibility..."
    validate_version_compatibility

    # Resource availability check
    echo "💾 Checking resource availability..."
    check_resource_availability

    # Traffic pattern analysis
    echo "📈 Analyzing traffic patterns..."
    analyze_traffic_patterns

    # Dependency health check
    echo "🔗 Validating dependencies..."
    check_dependency_health
}

collect_baseline_metrics() {
    # CPU, memory, disk usage
    # Active user count
    # API response times
    # Database performance
    # Component health scores
}
```

### 4.2 During-Deployment Monitoring

```bash
#!/bin/bash
# scripts/monitoring/deployment-monitor.sh

monitor_deployment() {
    local deployment_id=$1
    echo "=== Monitoring Deployment: $deployment_id ==="

    # Real-time deployment progress
    monitor_deployment_progress $deployment_id

    # Health check monitoring
    monitor_health_during_deployment

    # Performance impact tracking
    monitor_performance_impact

    # User experience monitoring
    monitor_user_experience

    # Error rate monitoring
    monitor_error_rates
}

monitor_health_during_deployment() {
    while deployment_in_progress; do
        health_status=$(curl -s ${UMIG_BASE_URL}/admin/health | jq -r '.status')
        if [[ "$health_status" != "healthy" ]]; then
            echo "🚨 Health check failed during deployment"
            trigger_deployment_rollback
            break
        fi
        sleep 10
    done
}
```

### 4.3 Post-Deployment Monitoring

```bash
#!/bin/bash
# scripts/monitoring/post-deployment-monitor.sh

monitor_post_deployment() {
    local deployment_id=$1
    echo "=== Post-Deployment Monitoring: $deployment_id ==="

    # Immediate validation (0-5 minutes)
    perform_immediate_validation

    # Short-term monitoring (5-30 minutes)
    perform_short_term_monitoring

    # Extended monitoring (30 minutes - 24 hours)
    setup_extended_monitoring

    # Performance comparison
    compare_performance_metrics

    # User feedback collection
    collect_user_feedback
}

perform_immediate_validation() {
    echo "🔍 Immediate validation (0-5 minutes)..."

    # Health endpoints validation
    validate_health_endpoints || exit 1

    # Version endpoint validation
    validate_version_endpoints || exit 1

    # Component functionality validation
    validate_component_functionality || exit 1

    # Basic smoke tests
    run_smoke_tests || exit 1

    echo "✅ Immediate validation passed"
}

perform_short_term_monitoring() {
    echo "📊 Short-term monitoring (5-30 minutes)..."

    for i in {1..6}; do  # 30 minutes with 5-minute intervals
        echo "Monitoring cycle $i/6..."

        # Performance metrics
        collect_performance_metrics

        # Error rate monitoring
        monitor_error_rates

        # Resource utilization
        monitor_resource_utilization

        # User activity patterns
        monitor_user_activity

        sleep 300  # 5 minutes
    done

    echo "✅ Short-term monitoring completed"
}
```

## 5. Version Drift Detection

### 5.1 Component Version Synchronization

```groovy
// Scheduled job to detect version drift
class VersionDriftDetector {

    def detectVersionDrift() {
        def expectedVersions = loadExpectedVersionMatrix()
        def actualVersions = collectActualVersions()

        def driftDetected = []

        expectedVersions.each { component, expectedVersion ->
            def actualVersion = actualVersions[component]
            if (actualVersion != expectedVersion) {
                driftDetected << [
                    component: component,
                    expected: expectedVersion,
                    actual: actualVersion,
                    severity: calculateSeverity(component, expectedVersion, actualVersion)
                ]
            }
        }

        if (driftDetected.size() > 0) {
            alertVersionDrift(driftDetected)
        }

        return driftDetected
    }

    def collectActualVersions() {
        return [
            database: getCurrentSchemaVersion(),
            api: getCurrentApiVersion(),
            ui: getCurrentUIVersion(),
            backend: getCurrentBackendVersion()
        ]
    }

    def calculateSeverity(component, expected, actual) {
        // Version comparison logic to determine severity
        // CRITICAL: Major version mismatch
        // HIGH: Minor version mismatch with breaking changes
        // MEDIUM: Patch version mismatch
        // LOW: Build metadata mismatch
    }
}
```

### 5.2 Automated Version Reconciliation

```groovy
class VersionReconciliation {

    def reconcileVersions() {
        def driftIssues = new VersionDriftDetector().detectVersionDrift()

        driftIssues.each { issue ->
            switch (issue.severity) {
                case "CRITICAL":
                    triggerEmergencyRollback(issue)
                    break
                case "HIGH":
                    scheduleUrgentReconciliation(issue)
                    break
                case "MEDIUM":
                    scheduleMaintenance(issue)
                    break
                case "LOW":
                    logInformational(issue)
                    break
            }
        }
    }

    def triggerEmergencyRollback(issue) {
        // Immediate rollback for critical version mismatches
        log.error("CRITICAL version drift detected: ${issue}")
        // Trigger automated rollback procedure
    }
}
```

## 6. Performance Baseline Tracking

### 6.1 Performance Metrics Collection

```json
{
  "performanceBaseline": {
    "version": "1.2.0",
    "establishedAt": "2024-09-25T14:45:30Z",
    "environment": "production",
    "metrics": {
      "api": {
        "averageResponseTime": "180ms",
        "95thPercentile": "350ms",
        "99thPercentile": "850ms",
        "errorRate": "0.02%",
        "throughput": "450 req/min"
      },
      "ui": {
        "pageLoadTime": "1.2s",
        "componentRenderTime": "45ms",
        "interactivityTime": "800ms",
        "cumulativeLayoutShift": "0.05"
      },
      "database": {
        "queryResponseTime": "25ms",
        "connectionPoolUtilization": "65%",
        "cachehitRatio": "92%",
        "activeConnections": 12
      },
      "system": {
        "cpuUtilization": "35%",
        "memoryUtilization": "68%",
        "diskIoUtilization": "15%",
        "networkThroughput": "45Mbps"
      }
    }
  }
}
```

### 6.2 Performance Degradation Detection

```javascript
// Performance monitoring script
const performanceMonitor = {
  baseline: loadPerformanceBaseline(),

  checkPerformanceDegradation() {
    const current = collectCurrentMetrics();
    const degradations = [];

    Object.keys(this.baseline.metrics).forEach((category) => {
      Object.keys(this.baseline.metrics[category]).forEach((metric) => {
        const baselineValue = this.baseline.metrics[category][metric];
        const currentValue = current.metrics[category][metric];

        const degradation = calculateDegradation(baselineValue, currentValue);

        if (degradation > 0.15) {
          // 15% degradation threshold
          degradations.push({
            category,
            metric,
            baseline: baselineValue,
            current: currentValue,
            degradation: `${(degradation * 100).toFixed(1)}%`,
          });
        }
      });
    });

    if (degradations.length > 0) {
      alertPerformanceDegradation(degradations);
    }

    return degradations;
  },
};
```

## 7. Operational Dashboards

### 7.1 Environment Overview Dashboard

```json
{
  "dashboard": "UMIG Environment Overview",
  "panels": [
    {
      "title": "Environment Status",
      "type": "status-grid",
      "data_source": "/admin/health",
      "refresh": "30s"
    },
    {
      "title": "Version Matrix",
      "type": "table",
      "data_source": "/admin/version",
      "refresh": "5m"
    },
    {
      "title": "Component Health",
      "type": "gauge-grid",
      "data_source": "/admin/components",
      "refresh": "1m"
    },
    {
      "title": "Deployment History",
      "type": "timeline",
      "data_source": "deployment-log",
      "refresh": "5m"
    }
  ]
}
```

### 7.2 Performance Monitoring Dashboard

```json
{
  "dashboard": "UMIG Performance Monitoring",
  "panels": [
    {
      "title": "API Performance",
      "type": "time-series",
      "metrics": ["response_time", "throughput", "error_rate"],
      "refresh": "30s"
    },
    {
      "title": "UI Performance",
      "type": "time-series",
      "metrics": ["page_load_time", "component_render_time", "interactivity"],
      "refresh": "1m"
    },
    {
      "title": "Database Performance",
      "type": "time-series",
      "metrics": ["query_time", "connection_pool", "cache_hit_ratio"],
      "refresh": "30s"
    },
    {
      "title": "System Resources",
      "type": "gauge-grid",
      "metrics": ["cpu_usage", "memory_usage", "disk_io", "network"],
      "refresh": "30s"
    }
  ]
}
```

## 8. Integration with Existing Monitoring Tools

### 8.1 Prometheus Metrics Endpoint

```groovy
// /rest/scriptrunner/latest/custom/admin/metrics/prometheus
adminPrometheusMetrics(httpMethod: "GET", groups: ["confluence-administrators"]) { request, binding ->
    def metrics = generatePrometheusMetrics()

    return Response.ok(metrics)
        .header("Content-Type", "text/plain")
        .build()
}

def generatePrometheusMetrics() {
    def metrics = []

    // UMIG application metrics
    metrics << "umig_version_info{version=\"${UMIGVersion.VERSION}\",build=\"${UMIGVersion.BUILD}\"} 1"
    metrics << "umig_uptime_seconds ${getUptimeSeconds()}"
    metrics << "umig_health_status ${getHealthStatusValue()}"

    // Component metrics
    metrics << "umig_database_schema_version ${getCurrentSchemaVersion().replaceAll('[^0-9]', '')}"
    metrics << "umig_api_version_info{version=\"v2.3.1\"} 1"
    metrics << "umig_ui_components_loaded ${getLoadedComponentCount()}"

    // Performance metrics
    metrics << "umig_api_response_time_ms ${getAverageResponseTime()}"
    metrics << "umig_api_error_rate ${getApiErrorRate()}"
    metrics << "umig_active_users ${getActiveUserCount()}"

    return metrics.join('\n')
}
```

### 8.2 Datadog Integration

```json
{
  "datadog": {
    "custom_metrics": [
      {
        "metric": "umig.version.info",
        "type": "gauge",
        "tags": ["version:${VERSION}", "environment:${ENV}"]
      },
      {
        "metric": "umig.deployment.duration",
        "type": "histogram",
        "tags": ["environment:${ENV}", "version:${VERSION}"]
      },
      {
        "metric": "umig.component.health",
        "type": "gauge",
        "tags": ["component:${COMPONENT}", "environment:${ENV}"]
      }
    ],
    "dashboards": [
      "umig-environment-overview",
      "umig-performance-monitoring",
      "umig-deployment-tracking"
    ]
  }
}
```

This comprehensive operational monitoring strategy ensures complete visibility into UMIG's multi-component architecture, enabling proactive issue detection, version drift prevention, and confident deployment operations across all environments.
