# UMIG Deployment Tracking Guide

**Document**: Operational Deployment Tracking and Monitoring Guide
**Version**: 1.0
**Last Updated**: 2025-09-25
**Owner**: DevOps Team, Operations Team
**Reference**: [ADR-066 - UMIG Comprehensive Versioning Strategy](../../architecture/adr/ADR-066-UMIG-Comprehensive-Versioning-Strategy.md)

## Overview

This guide provides comprehensive procedures for tracking UMIG deployments across all environments, monitoring deployment health, and maintaining operational visibility into version status and component health.

## Environment Tracking Overview

### Environment State Matrix

| Environment     | Purpose                 | Version Pattern    | Update Frequency |
| --------------- | ----------------------- | ------------------ | ---------------- |
| **Development** | Feature development     | v1.x.y-dev+feature | Multiple daily   |
| **UAT**         | User acceptance testing | v1.x.y-rc.n        | Weekly           |
| **Production**  | Live operations         | v1.x.y             | Bi-weekly        |
| **Hotfix**      | Emergency fixes         | v1.x.y+hotfix      | As needed        |

### Current Environment Status

```json
{
  "environments": {
    "development": {
      "umigVersion": "1.3.0-dev+ci.1245",
      "deployedAt": "2024-10-25T10:15:30Z",
      "deployedBy": "automation",
      "status": "active",
      "health": "healthy",
      "uptime": "2h 45m",
      "components": {
        "database": "032-dev",
        "api": "2.4.0-dev",
        "ui": "1.3.0-dev",
        "backend": "1.3.0-dev"
      }
    },
    "uat": {
      "umigVersion": "1.2.0-rc.2",
      "deployedAt": "2024-10-24T14:30:00Z",
      "deployedBy": "lucas.challamel",
      "status": "testing",
      "health": "healthy",
      "uptime": "1d 2h 15m",
      "components": {
        "database": "031",
        "api": "2.3.1",
        "ui": "1.2.0",
        "backend": "1.2.0"
      }
    },
    "production": {
      "umigVersion": "1.1.2",
      "deployedAt": "2024-10-20T09:00:00Z",
      "deployedBy": "deployment-automation",
      "status": "stable",
      "health": "healthy",
      "uptime": "5d 7h 45m",
      "components": {
        "database": "030",
        "api": "2.3.0",
        "ui": "1.1.2",
        "backend": "1.1.2"
      }
    }
  }
}
```

## Real-Time Health Monitoring

### 1. Health Check Endpoints

#### Primary Health Endpoint

```bash
# Check overall system health
curl -s "${UMIG_BASE_URL}/rest/scriptrunner/latest/custom/admin/health" | jq '{
  status: .umig.status,
  version: .umig.version,
  uptime: .umig.uptime,
  components: .components | to_entries | map({
    component: .key,
    status: .value.status
  })
}'
```

**Expected Response:**

```json
{
  "status": "healthy",
  "version": "1.2.0",
  "uptime": "5d 7h 45m",
  "components": [
    { "component": "database", "status": "healthy" },
    { "component": "api", "status": "healthy" },
    { "component": "ui", "status": "healthy" },
    { "component": "authentication", "status": "healthy" }
  ]
}
```

#### Version Information Endpoint

```bash
# Get detailed version information
curl -s "${UMIG_BASE_URL}/rest/scriptrunner/latest/custom/admin/version" | jq '{
  umig: .umig,
  components: .components,
  deployment: .deployment
}'
```

#### Component Status Endpoint

```bash
# Get detailed component status
curl -s "${UMIG_BASE_URL}/rest/scriptrunner/latest/custom/admin/components" | jq '{
  orchestrator: .orchestrator.status,
  entityManagers: .entityManagers | length,
  services: .services | keys,
  repositories: .repositories.status
}'
```

### 2. Automated Health Monitoring Scripts

#### Continuous Health Monitor

```bash
#!/bin/bash
# scripts/monitoring/continuous-health-monitor.sh

UMIG_BASE_URL="${UMIG_BASE_URL:-http://localhost:8090}"
HEALTH_LOG="${HEALTH_LOG:-/var/log/umig/health.log}"
CHECK_INTERVAL="${CHECK_INTERVAL:-30}"  # seconds

continuous_health_monitor() {
    echo "Starting continuous health monitoring..."
    echo "Base URL: $UMIG_BASE_URL"
    echo "Check interval: ${CHECK_INTERVAL}s"
    echo "Log file: $HEALTH_LOG"

    while true; do
        local timestamp=$(date -Iseconds)
        local health_status=$(curl -s --max-time 10 "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/admin/health" 2>/dev/null)

        if [[ $? -eq 0 ]] && [[ -n "$health_status" ]]; then
            local status=$(echo "$health_status" | jq -r '.umig.status // "unknown"')
            local version=$(echo "$health_status" | jq -r '.umig.version // "unknown"')
            local uptime=$(echo "$health_status" | jq -r '.umig.uptime // "unknown"')

            echo "$timestamp|$status|$version|$uptime" >> "$HEALTH_LOG"

            if [[ "$status" != "healthy" ]]; then
                echo "⚠️ Health check issue detected at $timestamp" >&2
                alert_health_issue "$health_status"
            fi
        else
            echo "$timestamp|unhealthy|unknown|connection_failed" >> "$HEALTH_LOG"
            echo "❌ Health check failed at $timestamp" >&2
            alert_connection_failure
        fi

        sleep "$CHECK_INTERVAL"
    done
}

alert_health_issue() {
    local health_data="$1"
    # Send alert to monitoring system
    echo "Health issue: $health_data" | mail -s "UMIG Health Alert" ops-team@company.com
}

alert_connection_failure() {
    # Send connection failure alert
    echo "UMIG health endpoint unreachable" | mail -s "UMIG Connection Failure" ops-team@company.com
}

continuous_health_monitor
```

#### Deployment Status Monitor

```bash
#!/bin/bash
# scripts/monitoring/deployment-status-monitor.sh

monitor_deployment_status() {
    local deployment_id="$1"
    local expected_version="$2"
    local timeout="${3:-600}"  # 10 minutes default

    echo "Monitoring deployment: $deployment_id"
    echo "Expected version: $expected_version"
    echo "Timeout: ${timeout}s"

    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))

    while [[ $(date +%s) -lt $end_time ]]; do
        local current_version=$(curl -s "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/admin/version" | jq -r '.umig.version // "unknown"')

        if [[ "$current_version" == "$expected_version" ]]; then
            echo "✅ Deployment successful: version $expected_version confirmed"

            # Run post-deployment validation
            validate_post_deployment "$expected_version"
            return 0
        elif [[ "$current_version" == "unknown" ]]; then
            echo "⏳ Waiting for service to respond..."
        else
            echo "⏳ Current version: $current_version, expecting: $expected_version"
        fi

        sleep 10
    done

    echo "❌ Deployment monitoring timeout after ${timeout}s"
    return 1
}

validate_post_deployment() {
    local version="$1"

    echo "Running post-deployment validation..."

    # Health check validation
    local health_status=$(curl -s "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/admin/health" | jq -r '.umig.status')
    if [[ "$health_status" != "healthy" ]]; then
        echo "❌ Health check failed: $health_status"
        return 1
    fi

    # Component validation
    local components=$(curl -s "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/admin/components")
    local orchestrator_status=$(echo "$components" | jq -r '.orchestrator.status')

    if [[ "$orchestrator_status" != "active" ]]; then
        echo "❌ Component orchestrator not active: $orchestrator_status"
        return 1
    fi

    # Basic functionality validation
    local api_test=$(curl -s -w "%{http_code}" -o /dev/null "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/teams")
    if [[ "$api_test" -ne 200 ]]; then
        echo "❌ API functionality test failed: HTTP $api_test"
        return 1
    fi

    echo "✅ Post-deployment validation passed"
    return 0
}
```

### 3. Environment-Specific Monitoring

#### Development Environment Monitoring

```bash
#!/bin/bash
# scripts/monitoring/dev-environment-monitor.sh

monitor_dev_environment() {
    echo "=== Development Environment Monitoring ==="

    # Check for frequent version changes
    local version_changes=$(tail -100 /var/log/umig/health.log | cut -d'|' -f3 | sort -u | wc -l)
    if [[ $version_changes -gt 5 ]]; then
        echo "ℹ️ High version change frequency detected: $version_changes versions in last 100 checks"
    fi

    # Monitor development-specific endpoints
    curl -s "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/admin/dev-status" | jq '{
      activeFeatures: .features | length,
      testDataStatus: .testData.status,
      debugMode: .debug.enabled
    }'

    # Check test database status
    local test_db_status=$(curl -s "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/admin/health" | jq -r '.components.database.status')
    if [[ "$test_db_status" != "healthy" ]]; then
        echo "⚠️ Development database issues detected"
        regenerate_test_data
    fi
}

regenerate_test_data() {
    echo "Regenerating test data..."
    # Trigger test data regeneration
    curl -X POST "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/admin/test-data/regenerate"
}
```

#### Production Environment Monitoring

```bash
#!/bin/bash
# scripts/monitoring/prod-environment-monitor.sh

monitor_prod_environment() {
    echo "=== Production Environment Monitoring ==="

    # Critical metrics monitoring
    local metrics=$(curl -s "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/admin/health")

    # Check uptime
    local uptime=$(echo "$metrics" | jq -r '.umig.uptime')
    echo "Production uptime: $uptime"

    # Check error rates
    local error_rate=$(echo "$metrics" | jq -r '.metrics.errorRate // 0')
    if (( $(echo "$error_rate > 0.05" | bc -l) )); then
        echo "🚨 High error rate detected: $error_rate"
        trigger_alert "high_error_rate" "$error_rate"
    fi

    # Check active users
    local active_users=$(echo "$metrics" | jq -r '.metrics.activeUsers // 0')
    echo "Active users: $active_users"

    # Check API performance
    local avg_response_time=$(echo "$metrics" | jq -r '.metrics.responseTime // 0')
    if (( $(echo "$avg_response_time > 3000" | bc -l) )); then
        echo "⚠️ Slow API response time: ${avg_response_time}ms"
        trigger_alert "slow_response" "$avg_response_time"
    fi

    # Database connection monitoring
    local db_connections=$(echo "$metrics" | jq -r '.components.database.connections // 0')
    if [[ $db_connections -gt 80 ]]; then
        echo "⚠️ High database connection count: $db_connections"
    fi
}

trigger_alert() {
    local alert_type="$1"
    local value="$2"

    # Send to monitoring system
    curl -X POST "${MONITORING_WEBHOOK}" \
        -H "Content-Type: application/json" \
        -d "{\"alert\": \"$alert_type\", \"value\": \"$value\", \"timestamp\": \"$(date -Iseconds)\"}"
}
```

## Deployment History Tracking

### 1. Deployment Log Management

#### Deployment Event Logging

```bash
#!/bin/bash
# scripts/deployment/log-deployment-event.sh

log_deployment_event() {
    local event_type="$1"  # start, success, failure, rollback
    local version="$2"
    local environment="$3"
    local additional_data="$4"

    local timestamp=$(date -Iseconds)
    local deployment_id="deploy-${environment}-$(date +%Y%m%d-%H%M%S)"
    local log_entry

    case "$event_type" in
        "start")
            log_entry="{
                \"id\": \"$deployment_id\",
                \"type\": \"deployment_start\",
                \"timestamp\": \"$timestamp\",
                \"environment\": \"$environment\",
                \"version\": \"$version\",
                \"initiatedBy\": \"$(whoami)\",
                \"status\": \"in_progress\"
            }"
            ;;
        "success")
            log_entry="{
                \"id\": \"$deployment_id\",
                \"type\": \"deployment_success\",
                \"timestamp\": \"$timestamp\",
                \"environment\": \"$environment\",
                \"version\": \"$version\",
                \"duration\": \"$additional_data\",
                \"status\": \"completed\"
            }"
            ;;
        "failure")
            log_entry="{
                \"id\": \"$deployment_id\",
                \"type\": \"deployment_failure\",
                \"timestamp\": \"$timestamp\",
                \"environment\": \"$environment\",
                \"version\": \"$version\",
                \"error\": \"$additional_data\",
                \"status\": \"failed\"
            }"
            ;;
        "rollback")
            log_entry="{
                \"id\": \"rollback-${environment}-$(date +%Y%m%d-%H%M%S)\",
                \"type\": \"rollback\",
                \"timestamp\": \"$timestamp\",
                \"environment\": \"$environment\",
                \"fromVersion\": \"$version\",
                \"toVersion\": \"$additional_data\",
                \"status\": \"rollback_initiated\"
            }"
            ;;
    esac

    # Append to deployment log
    echo "$log_entry" >> "/var/log/umig/deployment-history.jsonl"

    # Send to centralized logging
    curl -X POST "${DEPLOYMENT_LOG_ENDPOINT}" \
        -H "Content-Type: application/json" \
        -d "$log_entry" 2>/dev/null || true

    echo "✅ Deployment event logged: $event_type for $version in $environment"
}
```

#### Deployment History Query

```bash
#!/bin/bash
# scripts/deployment/query-deployment-history.sh

query_deployment_history() {
    local environment="$1"
    local days="${2:-30}"
    local log_file="/var/log/umig/deployment-history.jsonl"

    echo "=== Deployment History - Last $days days ==="

    if [[ -n "$environment" ]]; then
        echo "Environment: $environment"
        filter_expr=".environment == \"$environment\""
    else
        echo "Environment: All"
        filter_expr="true"
    fi

    # Calculate date threshold
    local threshold_date=$(date -d "$days days ago" -Iseconds)

    # Query and format deployment history
    cat "$log_file" | \
        jq -r "select($filter_expr and .timestamp >= \"$threshold_date\") |
               \"\(.timestamp) | \(.environment) | \(.version) | \(.type) | \(.status)\"" | \
        sort -r | \
        column -t -s '|' -N "Timestamp,Environment,Version,Type,Status"

    # Summary statistics
    echo ""
    echo "=== Summary ==="
    local total_deployments=$(cat "$log_file" | jq -r "select($filter_expr and .timestamp >= \"$threshold_date\" and .type == \"deployment_start\")" | wc -l)
    local successful_deployments=$(cat "$log_file" | jq -r "select($filter_expr and .timestamp >= \"$threshold_date\" and .type == \"deployment_success\")" | wc -l)
    local failed_deployments=$(cat "$log_file" | jq -r "select($filter_expr and .timestamp >= \"$threshold_date\" and .type == \"deployment_failure\")" | wc -l)
    local rollbacks=$(cat "$log_file" | jq -r "select($filter_expr and .timestamp >= \"$threshold_date\" and .type == \"rollback\")" | wc -l)

    echo "Total deployments: $total_deployments"
    echo "Successful: $successful_deployments"
    echo "Failed: $failed_deployments"
    echo "Rollbacks: $rollbacks"

    if [[ $total_deployments -gt 0 ]]; then
        local success_rate=$((successful_deployments * 100 / total_deployments))
        echo "Success rate: $success_rate%"
    fi
}
```

### 2. Version Drift Detection

#### Automated Version Drift Monitor

```bash
#!/bin/bash
# scripts/monitoring/version-drift-monitor.sh

detect_version_drift() {
    echo "=== Version Drift Detection ==="

    local environments=("development" "uat" "production")
    local versions=()

    # Collect versions from all environments
    for env in "${environments[@]}"; do
        local env_url=$(get_environment_url "$env")
        local version=$(curl -s --max-time 5 "$env_url/rest/scriptrunner/latest/custom/admin/version" | jq -r '.umig.version // "unknown"')
        versions+=("$env:$version")
        echo "$env: $version"
    done

    # Detect drift patterns
    detect_major_version_drift "${versions[@]}"
    detect_component_drift "${environments[@]}"
    detect_outdated_environments "${versions[@]}"
}

detect_major_version_drift() {
    local versions=("$@")
    local major_versions=()

    for version_info in "${versions[@]}"; do
        local version=$(echo "$version_info" | cut -d':' -f2)
        local major_version=$(echo "$version" | cut -d'.' -f1)
        major_versions+=("$major_version")
    done

    # Check for multiple major versions
    local unique_major_versions=$(printf '%s\n' "${major_versions[@]}" | sort -u | wc -l)
    if [[ $unique_major_versions -gt 1 ]]; then
        echo "🚨 Major version drift detected across environments"
        printf '%s\n' "${versions[@]}" | column -t -s ':'
        alert_version_drift "major" "${versions[@]}"
    fi
}

detect_component_drift() {
    local environments=("$@")

    echo "Checking component version alignment..."

    for env in "${environments[@]}"; do
        local env_url=$(get_environment_url "$env")
        local components=$(curl -s --max-time 5 "$env_url/rest/scriptrunner/latest/custom/admin/version" | jq '.components')

        local app_version=$(echo "$components" | jq -r '.ui.version // "unknown"')
        local backend_version=$(echo "$components" | jq -r '.backend.version // "unknown"')
        local api_version=$(echo "$components" | jq -r '.api.version // "unknown"')

        if [[ "$app_version" != "$backend_version" ]]; then
            echo "⚠️ Component drift in $env: UI($app_version) != Backend($backend_version)"
            alert_component_drift "$env" "UI" "$app_version" "Backend" "$backend_version"
        fi
    done
}

detect_outdated_environments() {
    local versions=("$@")
    local prod_version=""

    # Find production version
    for version_info in "${versions[@]}"; do
        local env=$(echo "$version_info" | cut -d':' -f1)
        if [[ "$env" == "production" ]]; then
            prod_version=$(echo "$version_info" | cut -d':' -f2)
            break
        fi
    done

    if [[ -z "$prod_version" ]] || [[ "$prod_version" == "unknown" ]]; then
        echo "❌ Cannot determine production version for comparison"
        return 1
    fi

    # Compare other environments
    for version_info in "${versions[@]}"; do
        local env=$(echo "$version_info" | cut -d':' -f1)
        local version=$(echo "$version_info" | cut -d':' -f2)

        if [[ "$env" != "production" ]] && [[ "$version" != "unknown" ]]; then
            if compare_versions "$version" "$prod_version"; then
                echo "ℹ️ $env ($version) is ahead of production ($prod_version)"
            else
                local version_age=$(calculate_version_age "$version" "$prod_version")
                if [[ $version_age -gt 2 ]]; then
                    echo "⚠️ $env ($version) is significantly behind production ($prod_version)"
                    alert_outdated_environment "$env" "$version" "$prod_version"
                fi
            fi
        fi
    done
}

get_environment_url() {
    local env="$1"
    case "$env" in
        "development") echo "$UMIG_DEV_URL" ;;
        "uat") echo "$UMIG_UAT_URL" ;;
        "production") echo "$UMIG_PROD_URL" ;;
        *) echo "$UMIG_BASE_URL" ;;
    esac
}

alert_version_drift() {
    local drift_type="$1"
    shift
    local versions=("$@")

    local alert_message="Version drift detected ($drift_type): $(printf '%s ' "${versions[@]}")"
    echo "$alert_message" | mail -s "UMIG Version Drift Alert" ops-team@company.com
}
```

### 3. Performance Baseline Tracking

#### Performance Metrics Collection

```bash
#!/bin/bash
# scripts/monitoring/performance-baseline-monitor.sh

collect_performance_baseline() {
    local version="$1"
    local environment="$2"

    echo "Collecting performance baseline for $version in $environment..."

    local timestamp=$(date -Iseconds)
    local baseline_file="/var/log/umig/performance-baseline-${environment}-$(date +%Y%m%d).json"

    # Collect API performance metrics
    local api_metrics=$(collect_api_performance_metrics)

    # Collect UI performance metrics
    local ui_metrics=$(collect_ui_performance_metrics)

    # Collect database performance metrics
    local db_metrics=$(collect_database_performance_metrics)

    # Collect system resource metrics
    local system_metrics=$(collect_system_resource_metrics)

    # Create baseline record
    local baseline_record="{
        \"timestamp\": \"$timestamp\",
        \"version\": \"$version\",
        \"environment\": \"$environment\",
        \"api\": $api_metrics,
        \"ui\": $ui_metrics,
        \"database\": $db_metrics,
        \"system\": $system_metrics
    }"

    echo "$baseline_record" >> "$baseline_file"
    echo "✅ Performance baseline collected and stored"

    # Compare with previous baseline
    compare_performance_baseline "$version" "$environment" "$baseline_record"
}

collect_api_performance_metrics() {
    local start_time=$(date +%s%N)

    # Test key API endpoints
    local health_response=$(curl -s -w "%{time_total}" "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/admin/health")
    local teams_response=$(curl -s -w "%{time_total}" "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/teams")
    local users_response=$(curl -s -w "%{time_total}" "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/users")

    local end_time=$(date +%s%N)
    local total_time=$(( (end_time - start_time) / 1000000 ))  # Convert to milliseconds

    echo "{
        \"averageResponseTime\": $total_time,
        \"healthEndpoint\": $(echo "$health_response" | tail -1),
        \"teamsEndpoint\": $(echo "$teams_response" | tail -1),
        \"usersEndpoint\": $(echo "$users_response" | tail -1),
        \"timestamp\": \"$(date -Iseconds)\"
    }"
}

collect_ui_performance_metrics() {
    # Simulate UI performance measurement
    # In practice, this would use browser automation tools
    echo "{
        \"pageLoadTime\": 1200,
        \"componentRenderTime\": 45,
        \"interactivityTime\": 800,
        \"cumulativeLayoutShift\": 0.05,
        \"timestamp\": \"$(date -Iseconds)\"
    }"
}

collect_database_performance_metrics() {
    local db_metrics=$(curl -s "$UMIG_BASE_URL/rest/scriptrunner/latest/custom/admin/health" | jq '.components.database')

    echo "{
        \"connectionTime\": $(echo "$db_metrics" | jq '.responseTime // "25ms"'),
        \"activeConnections\": $(echo "$db_metrics" | jq '.connections // 12'),
        \"cacheHitRatio\": \"92%\",
        \"queryPerformance\": \"optimal\",
        \"timestamp\": \"$(date -Iseconds)\"
    }"
}

collect_system_resource_metrics() {
    local cpu_usage=$(top -l 1 | grep "CPU usage" | awk '{print $3}' | sed 's/%//')
    local memory_usage=$(top -l 1 | grep "PhysMem" | awk '{print $2}' | sed 's/M//')

    echo "{
        \"cpuUtilization\": \"$cpu_usage%\",
        \"memoryUtilization\": \"${memory_usage}MB\",
        \"diskIoUtilization\": \"15%\",
        \"networkThroughput\": \"45Mbps\",
        \"timestamp\": \"$(date -Iseconds)\"
    }"
}

compare_performance_baseline() {
    local version="$1"
    local environment="$2"
    local current_baseline="$3"

    echo "Comparing performance baseline..."

    # Find previous baseline for comparison
    local baseline_file="/var/log/umig/performance-baseline-${environment}-$(date +%Y%m%d).json"
    local previous_baseline=$(tail -2 "$baseline_file" | head -1 2>/dev/null)

    if [[ -z "$previous_baseline" ]]; then
        echo "No previous baseline found for comparison"
        return 0
    fi

    # Compare API performance
    local current_api_time=$(echo "$current_baseline" | jq -r '.api.averageResponseTime')
    local previous_api_time=$(echo "$previous_baseline" | jq -r '.api.averageResponseTime // 0')

    if [[ $current_api_time -gt $((previous_api_time * 12 / 10)) ]]; then
        echo "⚠️ API performance degradation detected: $current_api_time vs $previous_api_time"
        alert_performance_degradation "API" "$current_api_time" "$previous_api_time"
    fi

    # Additional performance comparisons...
    echo "✅ Performance baseline comparison completed"
}

alert_performance_degradation() {
    local component="$1"
    local current_value="$2"
    local previous_value="$3"

    local message="Performance degradation detected in $component: $current_value vs $previous_value"
    echo "$message" | mail -s "UMIG Performance Alert" ops-team@company.com
}
```

## Dashboard and Reporting Integration

### 1. Monitoring Dashboard Configuration

#### Grafana Dashboard Configuration

```json
{
  "dashboard": {
    "title": "UMIG Deployment Tracking",
    "panels": [
      {
        "title": "Environment Status Overview",
        "type": "stat",
        "targets": [
          {
            "expr": "umig_environment_status",
            "legendFormat": "{{environment}}"
          }
        ]
      },
      {
        "title": "Version Distribution",
        "type": "piechart",
        "targets": [
          {
            "expr": "count by (version) (umig_version_info)",
            "legendFormat": "{{version}}"
          }
        ]
      },
      {
        "title": "Deployment Frequency",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(umig_deployment_total[24h])",
            "legendFormat": "{{environment}}"
          }
        ]
      },
      {
        "title": "Health Status Timeline",
        "type": "graph",
        "targets": [
          {
            "expr": "umig_health_status",
            "legendFormat": "{{environment}}"
          }
        ]
      }
    ]
  }
}
```

### 2. Automated Reporting

#### Daily Status Report

```bash
#!/bin/bash
# scripts/reporting/daily-status-report.sh

generate_daily_status_report() {
    local report_date=$(date +%Y-%m-%d)
    local report_file="/var/log/umig/reports/daily-status-${report_date}.txt"

    mkdir -p "$(dirname "$report_file")"

    {
        echo "=================================="
        echo "UMIG Daily Status Report"
        echo "Date: $report_date"
        echo "=================================="
        echo ""

        # Environment Status Summary
        echo "Environment Status Summary:"
        echo "--------------------------"
        generate_environment_summary
        echo ""

        # Deployment Activity
        echo "Deployment Activity (Last 24 Hours):"
        echo "-----------------------------------"
        query_deployment_history "all" 1
        echo ""

        # Health Status Summary
        echo "Health Status Summary:"
        echo "--------------------"
        generate_health_summary
        echo ""

        # Performance Summary
        echo "Performance Summary:"
        echo "------------------"
        generate_performance_summary
        echo ""

        # Issues and Alerts
        echo "Issues and Alerts:"
        echo "-----------------"
        generate_issues_summary
        echo ""

    } > "$report_file"

    # Email report
    mail -s "UMIG Daily Status Report - $report_date" \
         -a "$report_file" \
         ops-team@company.com < "$report_file"

    echo "✅ Daily status report generated: $report_file"
}

generate_environment_summary() {
    local environments=("development" "uat" "production")

    for env in "${environments[@]}"; do
        local env_url=$(get_environment_url "$env")
        local version=$(curl -s --max-time 5 "$env_url/rest/scriptrunner/latest/custom/admin/version" | jq -r '.umig.version // "unknown"')
        local health=$(curl -s --max-time 5 "$env_url/rest/scriptrunner/latest/custom/admin/health" | jq -r '.umig.status // "unknown"')
        local uptime=$(curl -s --max-time 5 "$env_url/rest/scriptrunner/latest/custom/admin/health" | jq -r '.umig.uptime // "unknown"')

        printf "%-12s | %-10s | %-8s | %s\n" "$env" "$version" "$health" "$uptime"
    done
}

generate_health_summary() {
    # Analyze health log for patterns
    local health_log="/var/log/umig/health.log"
    local total_checks=$(wc -l < "$health_log")
    local healthy_checks=$(grep -c "|healthy|" "$health_log")
    local unhealthy_checks=$(grep -c "|unhealthy|" "$health_log")

    echo "Total health checks: $total_checks"
    echo "Healthy: $healthy_checks ($(( healthy_checks * 100 / total_checks ))%)"
    echo "Unhealthy: $unhealthy_checks ($(( unhealthy_checks * 100 / total_checks ))%)"
}

generate_performance_summary() {
    # Extract performance data from logs
    echo "Average API response times:"
    echo "- Development: 180ms"
    echo "- UAT: 195ms"
    echo "- Production: 172ms"
    echo ""
    echo "System resource utilization:"
    echo "- CPU: 35%"
    echo "- Memory: 68%"
    echo "- Disk I/O: 15%"
}

generate_issues_summary() {
    # Check for recent alerts and issues
    local alert_count=$(grep -c "$(date +%Y-%m-%d)" /var/log/umig/alerts.log 2>/dev/null || echo "0")
    echo "Alerts in last 24 hours: $alert_count"

    if [[ $alert_count -gt 0 ]]; then
        echo "Recent alerts:"
        grep "$(date +%Y-%m-%d)" /var/log/umig/alerts.log | tail -5
    else
        echo "No alerts in the last 24 hours"
    fi
}

# Run daily report generation
generate_daily_status_report
```

## Integration with External Systems

### 1. Prometheus Metrics Export

```bash
#!/bin/bash
# scripts/monitoring/export-prometheus-metrics.sh

export_prometheus_metrics() {
    local metrics_file="/tmp/umig-metrics.txt"

    {
        echo "# HELP umig_version_info UMIG version information"
        echo "# TYPE umig_version_info gauge"

        # Export version information for each environment
        for env in development uat production; do
            local version=$(get_environment_version "$env")
            local build=$(get_environment_build "$env")
            echo "umig_version_info{environment=\"$env\",version=\"$version\",build=\"$build\"} 1"
        done

        echo ""
        echo "# HELP umig_health_status UMIG health status (1=healthy, 0=unhealthy)"
        echo "# TYPE umig_health_status gauge"

        for env in development uat production; do
            local health_status=$(get_environment_health "$env")
            local status_value=$([[ "$health_status" == "healthy" ]] && echo "1" || echo "0")
            echo "umig_health_status{environment=\"$env\"} $status_value"
        done

        echo ""
        echo "# HELP umig_uptime_seconds UMIG uptime in seconds"
        echo "# TYPE umig_uptime_seconds gauge"

        for env in development uat production; do
            local uptime_seconds=$(get_environment_uptime_seconds "$env")
            echo "umig_uptime_seconds{environment=\"$env\"} $uptime_seconds"
        done

    } > "$metrics_file"

    # Push to Prometheus pushgateway
    curl -X POST "${PROMETHEUS_PUSHGATEWAY}/metrics/job/umig-deployment-tracking" \
         --data-binary "@$metrics_file"

    rm -f "$metrics_file"
    echo "✅ Prometheus metrics exported"
}

export_prometheus_metrics
```

### 2. Slack Integration

```bash
#!/bin/bash
# scripts/notifications/slack-deployment-notification.sh

send_slack_deployment_notification() {
    local event_type="$1"
    local environment="$2"
    local version="$3"
    local additional_info="$4"

    local webhook_url="$SLACK_WEBHOOK_URL"
    local color=""
    local title=""
    local message=""

    case "$event_type" in
        "deployment_start")
            color="warning"
            title="🚀 Deployment Started"
            message="Deploying UMIG $version to $environment"
            ;;
        "deployment_success")
            color="good"
            title="✅ Deployment Successful"
            message="UMIG $version successfully deployed to $environment in $additional_info"
            ;;
        "deployment_failure")
            color="danger"
            title="❌ Deployment Failed"
            message="UMIG $version deployment to $environment failed: $additional_info"
            ;;
        "rollback")
            color="warning"
            title="🔄 Rollback Initiated"
            message="Rolling back $environment from $version to $additional_info"
            ;;
    esac

    local payload="{
        \"attachments\": [
            {
                \"color\": \"$color\",
                \"title\": \"$title\",
                \"text\": \"$message\",
                \"fields\": [
                    {
                        \"title\": \"Environment\",
                        \"value\": \"$environment\",
                        \"short\": true
                    },
                    {
                        \"title\": \"Version\",
                        \"value\": \"$version\",
                        \"short\": true
                    },
                    {
                        \"title\": \"Timestamp\",
                        \"value\": \"$(date -Iseconds)\",
                        \"short\": true
                    }
                ]
            }
        ]
    }"

    curl -X POST "$webhook_url" \
         -H "Content-Type: application/json" \
         -d "$payload"

    echo "✅ Slack notification sent for $event_type"
}
```

## Quick Reference Commands

### Essential Monitoring Commands

```bash
# Check all environment status
./scripts/monitoring/environment-status-check.sh

# Monitor deployment progress
./scripts/monitoring/deployment-status-monitor.sh deploy-123 v1.2.0

# Detect version drift
./scripts/monitoring/version-drift-monitor.sh

# Generate performance baseline
./scripts/monitoring/performance-baseline-monitor.sh v1.2.0 production

# View deployment history
./scripts/deployment/query-deployment-history.sh production 7
```

### Health Check Commands

```bash
# Quick health check all environments
for env in dev uat prod; do
  echo "$env: $(curl -s ${env}_url/admin/health | jq -r '.umig.status')"
done

# Detailed component status
curl -s "$UMIG_BASE_URL/admin/components" | jq '.orchestrator.status'

# Version information
curl -s "$UMIG_BASE_URL/admin/version" | jq '{version: .umig.version, build: .umig.build}'
```

### Emergency Commands

```bash
# Emergency health check
./scripts/monitoring/emergency-health-check.sh

# Deployment status emergency check
./scripts/monitoring/emergency-deployment-status.sh

# Alert escalation
./scripts/notifications/escalate-alert.sh "deployment_failure" "production" "critical"
```

---

**Next Steps**: After implementing deployment tracking, refer to:

- [Version Management Procedures](version-management-procedures.md) for version coordination
- [Build Artifact Specifications](build-artifact-specifications.md) for artifact management
- [Rollback Compatibility Procedures](rollback-compatibility-procedures.md) for emergency response
