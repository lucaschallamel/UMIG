# US-079: Environment Monitoring Alignment

**Story Type**: Operations Enhancement  
**Priority**: Medium  
**Complexity**: Medium  
**Sprint**: Q1 2026  
**Epic**: Operations & Monitoring  
**Related Stories**: US-053 (Production Monitoring), US-078 (Deployment Automation), US-059 (Performance Monitoring)

## Business Context

**Current Monitoring Gap**: UMIG currently has comprehensive development monitoring through local containerized services but lacks standardized monitoring across UAT and Production environments. This creates blind spots for performance issues, security events, and operational metrics that could impact business operations.

**Environment Disparity**:

- **DEV Environment**: Complete monitoring stack (Postgres metrics, application logs, health checks via npm commands)
- **UAT Environment**: Limited monitoring, manual health checks, basic Confluence logging
- **PROD Environment**: Minimal monitoring, reactive troubleshooting, limited visibility into system health

**Business Risk**: $75K+ potential impact from undetected performance degradation, security incidents, and operational issues in production environments where monitoring coverage is insufficient.

## User Story

**As a** system administrator and operations team member  
**I want** consistent monitoring and alerting across all UMIG environments  
**So that** I can proactively detect issues, maintain security compliance, and ensure consistent performance regardless of deployment environment

## Business Value

- **Operational Excellence**: 70% improvement in mean time to detection (MTTD) for system issues
- **Risk Mitigation**: $75K+ value from proactive issue detection and resolution
- **Security Compliance**: Uniform security event monitoring across all environments
- **Performance Optimization**: Data-driven capacity planning and performance tuning
- **SLA Achievement**: 99.9% uptime target through proactive monitoring and alerting
- **Audit Readiness**: Complete operational audit trail across all environments

## Technical Requirements

### 1. Unified Monitoring Architecture

**Environment-Agnostic Monitoring Stack**:

```yaml
# /monitoring/docker-compose.monitoring.yml
version: "3.8"
services:
  prometheus:
    image: prom/prometheus:v2.45.0
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - "--config.file=/etc/prometheus/prometheus.yml"
      - "--storage.tsdb.path=/prometheus"
      - "--web.console.libraries=/etc/prometheus/console_libraries"
      - "--web.console.templates=/etc/prometheus/consoles"

  grafana:
    image: grafana/grafana:10.0.0
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=${GRAFANA_PASSWORD}
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/dashboards:/var/lib/grafana/dashboards
      - ./grafana/provisioning:/etc/grafana/provisioning

  alertmanager:
    image: prom/alertmanager:v0.25.0
    ports:
      - "9093:9093"
    volumes:
      - ./alertmanager.yml:/etc/alertmanager/alertmanager.yml

  node-exporter:
    image: prom/node-exporter:v1.6.0
    ports:
      - "9100:9100"
    command:
      - "--path.rootfs=/host"
    volumes:
      - "/:/host:ro,rslave"

volumes:
  prometheus_data:
  grafana_data:
```

### 2. UMIG Application Metrics Integration

**Groovy Metrics Collection** (`/src/groovy/umig/monitoring/MetricsCollector.groovy`):

```groovy
package umig.monitoring

import groovy.transform.CompileStatic
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong
import java.time.Instant

@CompileStatic
class MetricsCollector {
    private static final Map<String, AtomicLong> counters = new ConcurrentHashMap<>()
    private static final Map<String, Double> gauges = new ConcurrentHashMap<>()
    private static final Map<String, List<Long>> histograms = new ConcurrentHashMap<>()

    // API Performance Metrics
    static void recordApiCall(String endpoint, String method, long duration, int statusCode) {
        incrementCounter("umig_api_requests_total", [
            endpoint: endpoint,
            method: method,
            status: statusCode.toString()
        ])

        recordHistogram("umig_api_duration_ms", duration, [
            endpoint: endpoint,
            method: method
        ])
    }

    // Database Performance Metrics
    static void recordDatabaseOperation(String operation, String table, long duration, boolean success) {
        incrementCounter("umig_database_operations_total", [
            operation: operation,
            table: table,
            status: success ? "success" : "error"
        ])

        recordHistogram("umig_database_duration_ms", duration, [
            operation: operation,
            table: table
        ])
    }

    // Business Logic Metrics
    static void recordMigrationOperation(String operation, String migrationType, boolean success) {
        incrementCounter("umig_migration_operations_total", [
            operation: operation,
            migration_type: migrationType,
            status: success ? "success" : "error"
        ])
    }

    // System Health Metrics
    static void updateSystemHealth(String component, String status, double responseTime) {
        setGauge("umig_component_health", status == "healthy" ? 1.0 : 0.0, [
            component: component
        ])

        setGauge("umig_component_response_time", responseTime, [
            component: component
        ])
    }

    // Security Event Metrics
    static void recordSecurityEvent(String eventType, String severity, String user) {
        incrementCounter("umig_security_events_total", [
            event_type: eventType,
            severity: severity,
            user: user
        ])
    }

    // Metrics Export Endpoint
    static String exportPrometheusMetrics() {
        StringBuilder metrics = new StringBuilder()

        // Export counters
        counters.each { name, counter ->
            metrics.append("# TYPE ${name} counter\n")
            metrics.append("${name} ${counter.get()}\n")
        }

        // Export gauges
        gauges.each { name, value ->
            metrics.append("# TYPE ${name} gauge\n")
            metrics.append("${name} ${value}\n")
        }

        return metrics.toString()
    }

    private static void incrementCounter(String name, Map<String, String> labels = [:]) {
        String key = buildMetricKey(name, labels)
        counters.computeIfAbsent(key) { new AtomicLong(0) }.incrementAndGet()
    }

    private static void setGauge(String name, double value, Map<String, String> labels = [:]) {
        String key = buildMetricKey(name, labels)
        gauges.put(key, value)
    }

    private static void recordHistogram(String name, long value, Map<String, String> labels = [:]) {
        String key = buildMetricKey(name, labels)
        histograms.computeIfAbsent(key) { [] }.add(value)
    }

    private static String buildMetricKey(String name, Map<String, String> labels) {
        if (labels.isEmpty()) {
            return name
        }

        String labelString = labels.collect { k, v -> "${k}=\"${v}\"" }.join(',')
        return "${name}{${labelString}}"
    }
}
```

### 3. Health Check and Monitoring Endpoints

**Monitoring API** (`/src/groovy/umig/api/v2/MonitoringApi.groovy`):

```groovy
@BaseScript CustomEndpointDelegate delegate

// Prometheus metrics endpoint
metrics(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    try {
        String metrics = umig.monitoring.MetricsCollector.exportPrometheusMetrics()

        return Response.ok(metrics)
            .header("Content-Type", "text/plain; version=0.0.4; charset=utf-8")
            .build()

    } catch (Exception e) {
        log.error("Failed to export metrics", e)
        return Response.status(500)
            .entity([error: "Failed to export metrics", details: e.message])
            .build()
    }
}

// Health check endpoint
health(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    try {
        Map<String, Object> health = [:]
        health.timestamp = System.currentTimeMillis()
        health.status = "UP"
        health.checks = [:]

        // Database connectivity check
        long dbStart = System.currentTimeMillis()
        def dbStatus = checkDatabaseHealth()
        long dbDuration = System.currentTimeMillis() - dbStart

        health.checks.database = [
            status: dbStatus.healthy ? "UP" : "DOWN",
            responseTime: dbDuration,
            details: dbStatus.details
        ]

        // ScriptRunner context check
        long srStart = System.currentTimeMillis()
        def srStatus = checkScriptRunnerHealth()
        long srDuration = System.currentTimeMillis() - srStart

        health.checks.scriptrunner = [
            status: srStatus.healthy ? "UP" : "DOWN",
            responseTime: srDuration,
            details: srStatus.details
        ]

        // Overall status determination
        boolean allHealthy = health.checks.values().every { it.status == "UP" }
        health.status = allHealthy ? "UP" : "DOWN"

        // Record health metrics
        umig.monitoring.MetricsCollector.updateSystemHealth(
            "umig_application",
            health.status,
            health.checks.values().sum { it.responseTime as double } / health.checks.size()
        )

        int statusCode = allHealthy ? 200 : 503
        return Response.status(statusCode).entity(health).build()

    } catch (Exception e) {
        log.error("Health check failed", e)
        return Response.status(503)
            .entity([
                status: "DOWN",
                error: "Health check failed",
                details: e.message,
                timestamp: System.currentTimeMillis()
            ])
            .build()
    }
}

// System information endpoint
info(httpMethod: "GET", groups: ["confluence-administrators"]) { request, binding ->
    try {
        Map<String, Object> info = [:]

        // Application information
        info.application = [
            name: "UMIG",
            version: getClass().getPackage().getImplementationVersion() ?: "development",
            buildTime: getBuildTimestamp(),
            commitHash: getCommitHash()
        ]

        // Environment information
        info.environment = [
            javaVersion: System.getProperty("java.version"),
            groovyVersion: groovy.lang.GroovySystem.version,
            scriptRunnerVersion: getScriptRunnerVersion(),
            confluenceVersion: getConfluenceVersion()
        ]

        // Runtime information
        Runtime runtime = Runtime.getRuntime()
        info.runtime = [
            maxMemory: runtime.maxMemory(),
            totalMemory: runtime.totalMemory(),
            freeMemory: runtime.freeMemory(),
            usedMemory: runtime.totalMemory() - runtime.freeMemory(),
            processors: runtime.availableProcessors()
        ]

        return Response.ok(info).build()

    } catch (Exception e) {
        log.error("Failed to get system info", e)
        return Response.status(500)
            .entity([error: "Failed to get system info", details: e.message])
            .build()
    }
}

private Map<String, Object> checkDatabaseHealth() {
    return umig.repository.DatabaseUtil.withSql { sql ->
        try {
            sql.firstRow("SELECT 1 as health_check")
            return [healthy: true, details: "Database connection successful"]
        } catch (Exception e) {
            return [healthy: false, details: "Database connection failed: ${e.message}"]
        }
    }
}

private Map<String, Object> checkScriptRunnerHealth() {
    try {
        // Check if we can access ScriptRunner context
        def user = com.onresolve.scriptrunner.runner.util.UserMessageUtil.getLoggedInUser()
        return [healthy: true, details: "ScriptRunner context accessible"]
    } catch (Exception e) {
        return [healthy: false, details: "ScriptRunner context failed: ${e.message}"]
    }
}

// Additional helper methods for system information
private String getBuildTimestamp() {
    // Implementation to read build timestamp from build-info.json
    return "Unknown"
}

private String getCommitHash() {
    // Implementation to read commit hash from build-info.json
    return "Unknown"
}

private String getScriptRunnerVersion() {
    // Implementation to get ScriptRunner version
    return "Unknown"
}

private String getConfluenceVersion() {
    // Implementation to get Confluence version
    return "Unknown"
}
```

### 4. Environment-Specific Configuration

**Monitoring Configuration Template** (`/monitoring/environments/template.env`):

```bash
# Environment-specific monitoring configuration
ENVIRONMENT_NAME=
GRAFANA_PASSWORD=
ALERT_EMAIL=
SLACK_WEBHOOK_URL=
PROMETHEUS_RETENTION=15d

# Database monitoring
DB_HOST=
DB_PORT=5432
DB_NAME=umig_app_db
DB_MONITOR_USER=umig_monitor
DB_MONITOR_PASSWORD=

# Application monitoring
UMIG_BASE_URL=
HEALTH_CHECK_INTERVAL=30s
METRIC_COLLECTION_INTERVAL=15s

# Alerting thresholds
CPU_THRESHOLD=80
MEMORY_THRESHOLD=85
DISK_THRESHOLD=90
RESPONSE_TIME_THRESHOLD=3000
ERROR_RATE_THRESHOLD=5
```

**Prometheus Configuration** (`/monitoring/prometheus.yml`):

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "umig_alerts.yml"

alerting:
  alertmanagers:
    - static_configs:
        - targets:
            - alertmanager:9093

scrape_configs:
  - job_name: "prometheus"
    static_configs:
      - targets: ["localhost:9090"]

  - job_name: "umig-application"
    scrape_interval: 30s
    metrics_path: "/rest/scriptrunner/latest/custom/metrics"
    static_configs:
      - targets: ["${UMIG_BASE_URL}"]

  - job_name: "umig-health"
    scrape_interval: 30s
    metrics_path: "/rest/scriptrunner/latest/custom/health"
    static_configs:
      - targets: ["${UMIG_BASE_URL}"]

  - job_name: "node-exporter"
    static_configs:
      - targets: ["node-exporter:9100"]

  - job_name: "postgres-exporter"
    static_configs:
      - targets: ["postgres-exporter:9187"]
```

## Acceptance Criteria

### Functional Requirements

**AC-1: Unified Monitoring Stack Deployment**

- [ ] Monitoring stack deployable across DEV, UAT, and PROD environments
- [ ] Prometheus, Grafana, and Alertmanager configured for each environment
- [ ] Environment-specific configuration management with secure secrets
- [ ] Health check endpoints accessible and functional in all environments
- [ ] Metrics collection endpoints exposing UMIG-specific application metrics

**AC-2: Application Performance Monitoring**

- [ ] API response time and error rate monitoring for all endpoints
- [ ] Database query performance and connection health tracking
- [ ] Migration operation success/failure rates and duration tracking
- [ ] Authentication and authorization event monitoring
- [ ] System resource utilization (CPU, memory, disk) tracking

**AC-3: Security Event Correlation**

- [ ] Failed authentication attempts tracked and alerted
- [ ] Unauthorized access attempts logged and correlated
- [ ] Security events aggregated across all environments for threat detection
- [ ] Compliance audit trail maintained with appropriate retention policies
- [ ] Anomaly detection for unusual access patterns or system behavior

**AC-4: Operational Alerting**

- [ ] Real-time alerts for system health degradation (CPU >80%, Memory >85%)
- [ ] Application-specific alerts for API errors >5% or response time >3s
- [ ] Database connectivity and performance alerts
- [ ] Deployment success/failure notifications integrated with US-078
- [ ] Escalation procedures for critical alerts requiring immediate attention

### Non-Functional Requirements

**Performance**:

- [ ] Monitoring overhead <2% of system resources
- [ ] Metrics collection latency <100ms
- [ ] Dashboard load times <3 seconds for standard operational views
- [ ] Alert delivery within 30 seconds of threshold breach

**Reliability**:

- [ ] 99.9% monitoring stack uptime across all environments
- [ ] Monitoring data retention for 15 days (configurable by environment)
- [ ] Automatic recovery from monitoring component failures
- [ ] Backup and disaster recovery for monitoring configuration and historical data

**Usability**:

- [ ] Standardized dashboards across all environments with environment identification
- [ ] Role-based access to monitoring data (operators, administrators, developers)
- [ ] Mobile-responsive monitoring dashboards for on-call support
- [ ] Integration with existing notification channels (email, Slack, PagerDuty)

## Technical Implementation Plan

### Phase 1: Monitoring Infrastructure Setup (2 days)

1. **Day 1**: Prometheus and Grafana deployment configuration for all environments
2. **Day 2**: Alertmanager setup with notification channel integration

### Phase 2: Application Metrics Integration (2 days)

1. **Day 1**: UMIG metrics collection implementation and health check endpoints
2. **Day 2**: Business logic and security event monitoring integration

### Phase 3: Dashboard and Alerting Configuration (1 day)

1. **Day 1**: Grafana dashboard creation and alert rule configuration across environments

## Testing Strategy

### Unit Tests

- MetricsCollector functionality and thread safety
- Health check endpoint logic and error handling
- Alert condition evaluation and notification delivery
- Configuration management for environment-specific settings

### Integration Tests

- End-to-end monitoring stack deployment and configuration
- Metrics collection and export functionality validation
- Alert triggering and notification delivery testing
- Cross-environment monitoring data correlation and consistency

### User Acceptance Testing

- Operations team validation of monitoring dashboards and alerting
- System administrator approval of health check and diagnostic capabilities
- Security team validation of security event monitoring and correlation
- Performance validation of monitoring overhead and system impact

### Performance Tests

- Monitoring overhead assessment under various application loads
- Dashboard performance with high-volume metrics data
- Alert delivery performance during system stress conditions
- Scalability testing for monitoring stack across multiple environments

## Definition of Done

- [ ] All acceptance criteria met and verified through comprehensive testing
- [ ] Monitoring stack deployed and operational in DEV, UAT, and PROD
- [ ] Application metrics collection integrated and functional
- [ ] Security event monitoring and correlation operational
- [ ] Operational dashboards and alerting configured and validated
- [ ] Performance impact assessment completed and within acceptable limits
- [ ] Documentation updated with monitoring procedures and troubleshooting guides
- [ ] Operations team training completed on new monitoring capabilities
- [ ] Integration with US-078 deployment automation validated

## Risks & Mitigation

**Risk**: Monitoring overhead may impact application performance  
**Mitigation**: Comprehensive performance testing and configurable metrics collection intervals

**Risk**: Alert fatigue from too many false positive alerts  
**Mitigation**: Careful threshold tuning and staged rollout with feedback incorporation

**Risk**: Security concerns with exposing monitoring endpoints  
**Mitigation**: Proper authentication and authorization for monitoring endpoints, network segmentation

**Risk**: Environment-specific configuration complexity  
**Mitigation**: Template-based configuration management and comprehensive testing procedures

## Dependencies

- Completion of US-078 (Deployment Automation) for integrated monitoring deployment
- US-053 (Production Monitoring) foundation components
- Network access configuration for monitoring stack deployment
- Notification channel setup (email, Slack, PagerDuty) for alerting
- Security approval for monitoring data retention and access policies

## Success Metrics

- **Detection Time**: 70% improvement in mean time to detection (MTTD) for system issues
- **Monitoring Coverage**: 100% of critical system components and business functions monitored
- **Alert Accuracy**: >95% alert precision (true positives vs. false positives)
- **System Visibility**: 100% environment parity for monitoring capabilities
- **Operational Efficiency**: 50% reduction in manual health checks and troubleshooting time
- **Security Compliance**: 100% security events properly detected and logged
- **Uptime Achievement**: 99.9% system uptime through proactive monitoring and alerting

## Economic Impact

- **Development Cost**: $20K (5 days × $4K/day)
- **Risk Mitigation**: $75K+ (proactive issue detection and security event monitoring)
- **Operational Efficiency**: $35K/year (50% reduction in manual monitoring efforts)
- **SLA Achievement**: $50K/year (99.9% uptime target achievement)
- **Compliance Value**: $15K/year (automated audit trail and security monitoring)
- **Net ROI**: 775%+ within first year

---

**Story Points**: 5  
**Estimated Hours**: 40  
**Business Value Points**: 75  
**Risk Mitigation**: High  
**Security Impact**: Medium

**Created**: 2025-07-09  
**Updated**: 2025-07-09  
**Status**: Backlog  
**Epic Priority**: Medium  
**Assignee**: TBD (DevOps Engineer + Systems Administrator)

---

### Related ADRs and Documentation

- **ADR-055**: Monitoring and Observability Architecture (TO BE CREATED by this story)
- **ADR-056**: Security Event Correlation Framework (TO BE CREATED by this story)
- **US-053**: Production Monitoring API foundation
- **US-078**: Deployment Process Automation integration requirements
- **US-059**: Performance Monitoring Framework baseline components
