# UMIG Rollback Compatibility Procedures

**Document**: Operational Rollback and Emergency Recovery Guide
**Version**: 1.0
**Last Updated**: 2025-09-25
**Owner**: DevOps Team, Operations Team
**Reference**: [ADR-066 - UMIG Comprehensive Versioning Strategy](../../architecture/adr/ADR-066-UMIG-Comprehensive-Versioning-Strategy.md)

## Overview

This guide provides comprehensive operational procedures for UMIG rollback operations, including compatibility validation, automated rollback execution, manual emergency procedures, and recovery validation across all environments.

## Rollback Compatibility Matrix

### Version Compatibility Overview

| Current Version | Rollback Target | Compatibility | Risk Level | Downtime | Procedure       |
| --------------- | --------------- | ------------- | ---------- | -------- | --------------- |
| **v1.3.0**      | v1.2.2          | ✅ Full       | Low        | <3m      | Automated       |
| **v1.3.0**      | v1.2.1          | ✅ Full       | Low        | <5m      | Automated       |
| **v1.3.0**      | v1.2.0          | ⚠️ Limited    | Medium     | <5m      | Automated       |
| **v1.3.0**      | v1.1.x          | ❌ Manual     | High       | <15m     | Manual Required |
| **v1.2.0**      | v1.1.2          | ✅ Full       | Low        | <3m      | Automated       |
| **v1.2.0**      | v1.1.1          | ✅ Full       | Low        | <5m      | Automated       |
| **v1.2.0**      | v1.0.x          | ⚠️ Limited    | High       | <10m     | Manual Required |

### Component Compatibility Details

```json
{
  "rollbackCompatibility": {
    "from-1.3.0": {
      "canRollbackTo": {
        "1.2.2": {
          "automatic": true,
          "dataLoss": false,
          "time": "<3m",
          "procedures": [
            "application-stop",
            "database-rollback",
            "artifact-restore"
          ],
          "confidence": "high",
          "validationRequired": false
        },
        "1.2.1": {
          "automatic": true,
          "dataLoss": false,
          "time": "<5m",
          "procedures": [
            "application-stop",
            "database-rollback",
            "artifact-restore",
            "config-rollback"
          ],
          "confidence": "high",
          "validationRequired": true
        },
        "1.2.0": {
          "automatic": true,
          "dataLoss": false,
          "time": "<5m",
          "procedures": [
            "application-stop",
            "database-rollback",
            "artifact-restore",
            "config-rollback"
          ],
          "confidence": "medium",
          "validationRequired": true
        }
      }
    },
    "componentCompatibility": {
      "database": {
        "schema-031": {
          "compatible": ["030", "029"],
          "rollbackSupported": true,
          "dataLoss": false,
          "procedures": ["liquibase-rollback"]
        },
        "schema-030": {
          "compatible": ["029", "028"],
          "rollbackSupported": true,
          "dataLoss": false,
          "procedures": ["liquibase-rollback"]
        }
      },
      "api": {
        "v2.3.1": {
          "backward": ["v2.3.0", "v2.2.x"],
          "forward": ["v2.4.0-alpha"],
          "breaking": false,
          "rollbackImpact": "none"
        }
      },
      "ui": {
        "1.3.0": {
          "compatible": ["1.2.x", "1.1.5+"],
          "migration": "hot-swap",
          "rollback": "immediate",
          "components": 28
        }
      }
    }
  }
}
```

## Rollback Decision Framework

### 1. Automated Rollback Triggers

#### Critical System Failures

```bash
#!/bin/bash
# scripts/rollback/automated-rollback-triggers.sh

CRITICAL_THRESHOLDS=(
    "health_check_failures:3"
    "error_rate:0.10"
    "response_time:5000"
    "memory_usage:0.90"
    "cpu_usage:0.95"
)

check_rollback_triggers() {
    local environment="$1"
    local current_version="$2"

    echo "=== Checking Rollback Triggers for $environment ==="

    local trigger_count=0
    local triggered_conditions=()

    # Health check failures
    local health_failures=$(count_recent_health_failures "$environment" 300)  # 5 minutes
    if [[ $health_failures -ge 3 ]]; then
        trigger_count=$((trigger_count + 1))
        triggered_conditions+=("health_check_failures:$health_failures")
    fi

    # Error rate check
    local error_rate=$(get_current_error_rate "$environment")
    if (( $(echo "$error_rate > 0.10" | bc -l) )); then
        trigger_count=$((trigger_count + 1))
        triggered_conditions+=("error_rate:$error_rate")
    fi

    # Response time check
    local avg_response_time=$(get_average_response_time "$environment")
    if [[ $avg_response_time -gt 5000 ]]; then
        trigger_count=$((trigger_count + 1))
        triggered_conditions+=("response_time:${avg_response_time}ms")
    fi

    # Memory usage check
    local memory_usage=$(get_memory_usage "$environment")
    if (( $(echo "$memory_usage > 0.90" | bc -l) )); then
        trigger_count=$((trigger_count + 1))
        triggered_conditions+=("memory_usage:$memory_usage")
    fi

    # Evaluate rollback decision
    if [[ $trigger_count -ge 2 ]]; then
        echo "🚨 CRITICAL: Multiple rollback triggers detected ($trigger_count)"
        printf '%s\n' "${triggered_conditions[@]}"

        local rollback_target=$(determine_rollback_target "$current_version")
        echo "Recommended rollback target: $rollback_target"

        if [[ "$AUTO_ROLLBACK_ENABLED" == "true" ]]; then
            echo "Initiating automated rollback..."
            initiate_automated_rollback "$environment" "$current_version" "$rollback_target" "$(IFS=,; echo "${triggered_conditions[*]}")"
        else
            echo "Manual intervention required - sending alerts..."
            send_critical_rollback_alert "$environment" "$current_version" "${triggered_conditions[@]}"
        fi
    else
        echo "✅ No critical rollback triggers detected"
    fi
}

determine_rollback_target() {
    local current_version="$1"

    # Query rollback compatibility matrix
    local compatibility_data=$(cat /etc/umig/rollback-compatibility.json)
    local rollback_candidates=$(echo "$compatibility_data" | jq -r ".rollbackCompatibility.\"from-$current_version\".canRollbackTo | keys[]")

    # Select best candidate (highest confidence, lowest risk)
    local best_target=""
    local highest_confidence=0

    for candidate in $rollback_candidates; do
        local confidence=$(echo "$compatibility_data" | jq -r ".rollbackCompatibility.\"from-$current_version\".canRollbackTo.\"$candidate\".confidence")
        local automatic=$(echo "$compatibility_data" | jq -r ".rollbackCompatibility.\"from-$current_version\".canRollbackTo.\"$candidate\".automatic")

        if [[ "$automatic" == "true" ]] && [[ "$confidence" == "high" ]]; then
            best_target="$candidate"
            break
        fi
    done

    echo "${best_target:-"manual_selection_required"}"
}

count_recent_health_failures() {
    local environment="$1"
    local seconds="$2"
    local since_timestamp=$(date -d "$seconds seconds ago" -Iseconds)

    grep "$environment" /var/log/umig/health.log | \
    awk -F'|' '$1 >= "'$since_timestamp'" && $2 != "healthy"' | \
    wc -l
}

get_current_error_rate() {
    local environment="$1"
    curl -s "$(get_environment_url "$environment")/admin/health" | \
    jq -r '.metrics.errorRate // 0'
}

initiate_automated_rollback() {
    local environment="$1"
    local current_version="$2"
    local target_version="$3"
    local trigger_reasons="$4"

    echo "🔄 AUTOMATED ROLLBACK INITIATED"
    echo "Environment: $environment"
    echo "Current: $current_version → Target: $target_version"
    echo "Triggers: $trigger_reasons"

    # Execute automated rollback
    ./scripts/rollback/execute-automated-rollback.sh "$environment" "$current_version" "$target_version" "$trigger_reasons"
}
```

### 2. Manual Rollback Decision Process

#### Rollback Decision Checklist

```bash
#!/bin/bash
# scripts/rollback/manual-rollback-decision.sh

manual_rollback_assessment() {
    local environment="$1"
    local current_version="$2"
    local issue_description="$3"

    echo "=== Manual Rollback Assessment ==="
    echo "Environment: $environment"
    echo "Current Version: $current_version"
    echo "Issue: $issue_description"
    echo ""

    # Severity assessment
    assess_issue_severity "$issue_description"

    # Business impact assessment
    assess_business_impact "$environment"

    # Technical risk assessment
    assess_technical_risks "$current_version"

    # Rollback options analysis
    analyze_rollback_options "$current_version"

    # Recommendation generation
    generate_rollback_recommendation "$environment" "$current_version" "$issue_description"
}

assess_issue_severity() {
    local issue="$1"

    echo "Issue Severity Assessment:"
    echo "------------------------"

    # Critical keywords
    local critical_keywords=("data loss" "security breach" "system down" "critical failure" "authentication failure")
    local high_keywords=("performance degradation" "intermittent failure" "component failure" "high error rate")
    local medium_keywords=("ui issue" "minor bug" "cosmetic issue" "configuration issue")

    local severity="LOW"

    for keyword in "${critical_keywords[@]}"; do
        if echo "$issue" | grep -qi "$keyword"; then
            severity="CRITICAL"
            break
        fi
    done

    if [[ "$severity" == "LOW" ]]; then
        for keyword in "${high_keywords[@]}"; do
            if echo "$issue" | grep -qi "$keyword"; then
                severity="HIGH"
                break
            fi
        done
    fi

    if [[ "$severity" == "LOW" ]]; then
        for keyword in "${medium_keywords[@]}"; do
            if echo "$issue" | grep -qi "$keyword"; then
                severity="MEDIUM"
                break
            fi
        done
    fi

    echo "Severity Level: $severity"

    case "$severity" in
        "CRITICAL")
            echo "⚠️ IMMEDIATE ROLLBACK RECOMMENDED"
            echo "   - System stability at risk"
            echo "   - User data may be affected"
            echo "   - Business operations disrupted"
            ;;
        "HIGH")
            echo "⚠️ ROLLBACK CONSIDERATION REQUIRED"
            echo "   - Significant impact on users"
            echo "   - Service degradation occurring"
            echo "   - Timeline: Within 1 hour"
            ;;
        "MEDIUM")
            echo "ℹ️ SCHEDULED ROLLBACK CONSIDERATION"
            echo "   - Limited user impact"
            echo "   - Can be addressed in next maintenance window"
            ;;
        "LOW")
            echo "✅ ROLLBACK NOT NECESSARY"
            echo "   - Minimal impact"
            echo "   - Can be fixed in next regular deployment"
            ;;
    esac

    echo ""
}

assess_business_impact() {
    local environment="$1"

    echo "Business Impact Assessment:"
    echo "-------------------------"

    case "$environment" in
        "production")
            echo "Environment: PRODUCTION"
            echo "Impact Level: CRITICAL"
            echo "- Direct customer impact"
            echo "- Revenue implications"
            echo "- SLA considerations"
            echo "- Regulatory compliance risk"
            ;;
        "uat")
            echo "Environment: UAT"
            echo "Impact Level: MEDIUM"
            echo "- Testing delays"
            echo "- Stakeholder confidence"
            echo "- Release timeline impact"
            ;;
        "development")
            echo "Environment: DEVELOPMENT"
            echo "Impact Level: LOW"
            echo "- Developer productivity"
            echo "- Testing capability"
            echo "- Feature development pace"
            ;;
    esac

    echo ""
}

assess_technical_risks() {
    local current_version="$1"

    echo "Technical Risk Assessment:"
    echo "------------------------"

    # Check rollback compatibility
    local compatibility_file="/etc/umig/rollback-compatibility.json"
    if [[ -f "$compatibility_file" ]]; then
        local available_targets=$(jq -r ".rollbackCompatibility.\"from-$current_version\".canRollbackTo | keys[]" "$compatibility_file" 2>/dev/null)

        if [[ -n "$available_targets" ]]; then
            echo "Available rollback targets:"
            for target in $available_targets; do
                local risk=$(jq -r ".rollbackCompatibility.\"from-$current_version\".canRollbackTo.\"$target\".confidence" "$compatibility_file")
                local time=$(jq -r ".rollbackCompatibility.\"from-$current_version\".canRollbackTo.\"$target\".time" "$compatibility_file")
                local data_loss=$(jq -r ".rollbackCompatibility.\"from-$current_version\".canRollbackTo.\"$target\".dataLoss" "$compatibility_file")

                echo "  - $target: Risk($risk), Time($time), DataLoss($data_loss)"
            done
        else
            echo "❌ No compatible rollback targets found"
            echo "   Manual intervention required"
        fi
    else
        echo "⚠️ Rollback compatibility matrix not available"
    fi

    echo ""
}

generate_rollback_recommendation() {
    local environment="$1"
    local current_version="$2"
    local issue="$3"

    echo "Rollback Recommendation:"
    echo "----------------------"

    # Simple decision logic (would be more sophisticated in practice)
    local severity=$(assess_issue_severity "$issue" | grep "Severity Level:" | cut -d':' -f2 | xargs)

    case "$severity" in
        "CRITICAL")
            echo "🚨 IMMEDIATE ROLLBACK REQUIRED"
            echo "Action: Execute emergency rollback procedures"
            echo "Timeline: Immediate (within 15 minutes)"
            echo "Approval: Operations manager authorization"
            ;;
        "HIGH")
            echo "⚠️ PLANNED ROLLBACK RECOMMENDED"
            echo "Action: Schedule rollback within maintenance window"
            echo "Timeline: Within 2 hours or next maintenance window"
            echo "Approval: Development team + Operations manager"
            ;;
        "MEDIUM"|"LOW")
            echo "✅ ROLLBACK NOT RECOMMENDED"
            echo "Action: Implement fix in next regular deployment"
            echo "Timeline: Next scheduled release"
            echo "Approval: Standard development process"
            ;;
    esac

    echo ""
    echo "Next Steps:"
    echo "1. Review rollback compatibility matrix"
    echo "2. Notify stakeholders of decision"
    echo "3. Prepare rollback execution plan"
    echo "4. Schedule rollback execution"
    echo "5. Execute post-rollback validation"
}
```

## Automated Rollback Execution

### 1. Comprehensive Automated Rollback Script

```bash
#!/bin/bash
# scripts/rollback/execute-automated-rollback.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROLLBACK_LOG="/var/log/umig/rollback-$(date +%Y%m%d-%H%M%S).log"
ROLLBACK_CONFIG="/etc/umig/rollback-config.json"

execute_automated_rollback() {
    local environment="$1"
    local current_version="$2"
    local target_version="$3"
    local rollback_reason="$4"

    echo "=====================================" | tee -a "$ROLLBACK_LOG"
    echo "AUTOMATED ROLLBACK EXECUTION STARTED" | tee -a "$ROLLBACK_LOG"
    echo "=====================================" | tee -a "$ROLLBACK_LOG"
    echo "Environment: $environment" | tee -a "$ROLLBACK_LOG"
    echo "Current Version: $current_version" | tee -a "$ROLLBACK_LOG"
    echo "Target Version: $target_version" | tee -a "$ROLLBACK_LOG"
    echo "Reason: $rollback_reason" | tee -a "$ROLLBACK_LOG"
    echo "Timestamp: $(date -Iseconds)" | tee -a "$ROLLBACK_LOG"
    echo "Log File: $ROLLBACK_LOG" | tee -a "$ROLLBACK_LOG"
    echo "=====================================" | tee -a "$ROLLBACK_LOG"

    # Validate rollback prerequisites
    if ! validate_rollback_prerequisites "$environment" "$current_version" "$target_version"; then
        echo "❌ Rollback prerequisites validation failed" | tee -a "$ROLLBACK_LOG"
        handle_rollback_failure "prerequisites_failed" "$environment" "$current_version" "$target_version"
        exit 1
    fi

    # Send rollback initiation notifications
    send_rollback_notifications "initiated" "$environment" "$current_version" "$target_version" "$rollback_reason"

    # Create system backup before rollback
    if ! create_rollback_backup "$environment" "$current_version"; then
        echo "❌ Failed to create rollback backup" | tee -a "$ROLLBACK_LOG"
        handle_rollback_failure "backup_failed" "$environment" "$current_version" "$target_version"
        exit 1
    fi

    # Execute rollback phases
    local rollback_start_time=$(date +%s)

    if execute_rollback_phases "$environment" "$current_version" "$target_version"; then
        local rollback_end_time=$(date +%s)
        local rollback_duration=$((rollback_end_time - rollback_start_time))

        echo "✅ Rollback execution completed successfully in ${rollback_duration}s" | tee -a "$ROLLBACK_LOG"

        # Post-rollback validation
        if validate_rollback_success "$environment" "$target_version"; then
            echo "✅ Rollback validation passed" | tee -a "$ROLLBACK_LOG"
            send_rollback_notifications "completed" "$environment" "$current_version" "$target_version" "${rollback_duration}s"
            cleanup_rollback_artifacts "$environment"
        else
            echo "❌ Rollback validation failed" | tee -a "$ROLLBACK_LOG"
            handle_rollback_failure "validation_failed" "$environment" "$current_version" "$target_version"
            exit 1
        fi
    else
        echo "❌ Rollback execution failed" | tee -a "$ROLLBACK_LOG"
        handle_rollback_failure "execution_failed" "$environment" "$current_version" "$target_version"
        exit 1
    fi

    echo "=====================================" | tee -a "$ROLLBACK_LOG"
    echo "AUTOMATED ROLLBACK COMPLETED SUCCESSFULLY" | tee -a "$ROLLBACK_LOG"
    echo "=====================================" | tee -a "$ROLLBACK_LOG"
}

validate_rollback_prerequisites() {
    local environment="$1"
    local current_version="$2"
    local target_version="$3"

    echo "📋 Validating rollback prerequisites..." | tee -a "$ROLLBACK_LOG"

    # Check rollback compatibility
    if ! check_rollback_compatibility "$current_version" "$target_version"; then
        echo "❌ Version compatibility check failed" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Check target artifact availability
    if ! check_target_artifact_availability "$target_version"; then
        echo "❌ Target version artifact not available" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Check system resources
    if ! check_system_resources "$environment"; then
        echo "❌ Insufficient system resources" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Check backup storage availability
    if ! check_backup_storage_availability; then
        echo "❌ Insufficient backup storage" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    echo "✅ Rollback prerequisites validation passed" | tee -a "$ROLLBACK_LOG"
    return 0
}

execute_rollback_phases() {
    local environment="$1"
    local current_version="$2"
    local target_version="$3"

    echo "🔄 Executing rollback phases..." | tee -a "$ROLLBACK_LOG"

    # Phase 1: Stop Application Services
    echo "📋 Phase 1: Stopping application services..." | tee -a "$ROLLBACK_LOG"
    if ! stop_application_services "$environment"; then
        echo "❌ Failed to stop application services" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Phase 2: Database Rollback
    echo "📋 Phase 2: Rolling back database..." | tee -a "$ROLLBACK_LOG"
    if ! rollback_database "$environment" "$current_version" "$target_version"; then
        echo "❌ Database rollback failed" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Phase 3: Application Artifact Rollback
    echo "📋 Phase 3: Rolling back application artifacts..." | tee -a "$ROLLBACK_LOG"
    if ! rollback_application_artifacts "$environment" "$target_version"; then
        echo "❌ Application artifact rollback failed" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Phase 4: Configuration Rollback
    echo "📋 Phase 4: Rolling back configuration..." | tee -a "$ROLLBACK_LOG"
    if ! rollback_configuration "$environment" "$target_version"; then
        echo "❌ Configuration rollback failed" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Phase 5: Restart Application Services
    echo "📋 Phase 5: Restarting application services..." | tee -a "$ROLLBACK_LOG"
    if ! restart_application_services "$environment"; then
        echo "❌ Failed to restart application services" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Phase 6: Immediate Validation
    echo "📋 Phase 6: Running immediate validation..." | tee -a "$ROLLBACK_LOG"
    if ! run_immediate_rollback_validation "$environment" "$target_version"; then
        echo "❌ Immediate validation failed" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    echo "✅ All rollback phases completed successfully" | tee -a "$ROLLBACK_LOG"
    return 0
}

rollback_database() {
    local environment="$1"
    local current_version="$2"
    local target_version="$3"

    echo "🗄️ Rolling back database..." | tee -a "$ROLLBACK_LOG"

    # Get target changeset from version mapping
    local target_changeset=$(get_changeset_for_version "$target_version")
    local current_changeset=$(get_changeset_for_version "$current_version")

    if [[ -z "$target_changeset" ]] || [[ -z "$current_changeset" ]]; then
        echo "❌ Could not determine database changesets" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    echo "Database rollback: changeset $current_changeset → $target_changeset" | tee -a "$ROLLBACK_LOG"

    # Calculate rollback count
    local rollback_count=$((current_changeset - target_changeset))

    if [[ $rollback_count -le 0 ]]; then
        echo "⚠️ No database rollback required" | tee -a "$ROLLBACK_LOG"
        return 0
    fi

    # Create database backup before rollback
    if ! create_database_backup "pre-rollback-$(date +%Y%m%d-%H%M%S)"; then
        echo "❌ Database backup failed" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Execute Liquibase rollback
    echo "Executing Liquibase rollback: $rollback_count changesets" | tee -a "$ROLLBACK_LOG"

    local db_config=$(get_database_config "$environment")
    local db_url=$(echo "$db_config" | jq -r '.url')
    local db_user=$(echo "$db_config" | jq -r '.username')
    local db_password=$(echo "$db_config" | jq -r '.password')

    liquibase --changelog-file=db.changelog-master.xml \
              --url="$db_url" \
              --username="$db_user" \
              --password="$db_password" \
              rollback-count "$rollback_count" 2>&1 | tee -a "$ROLLBACK_LOG"

    if [[ ${PIPESTATUS[0]} -ne 0 ]]; then
        echo "❌ Liquibase rollback failed" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Validate rollback success
    if ! validate_database_rollback "$target_changeset"; then
        echo "❌ Database rollback validation failed" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    echo "✅ Database rollback completed successfully" | tee -a "$ROLLBACK_LOG"
    return 0
}

rollback_application_artifacts() {
    local environment="$1"
    local target_version="$2"

    echo "📦 Rolling back application artifacts..." | tee -a "$ROLLBACK_LOG"

    # Locate target version artifact
    local artifact_path=$(find_artifact_for_version "$target_version")

    if [[ ! -f "$artifact_path" ]]; then
        echo "❌ Target version artifact not found: $artifact_path" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Backup current artifacts
    if ! backup_current_artifacts "$environment"; then
        echo "❌ Failed to backup current artifacts" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Extract and deploy target artifacts
    local temp_dir="/tmp/umig-rollback-$(date +%s)"
    mkdir -p "$temp_dir"

    echo "Extracting artifacts from: $artifact_path" | tee -a "$ROLLBACK_LOG"
    unzip -q "$artifact_path" -d "$temp_dir"

    if [[ $? -ne 0 ]]; then
        echo "❌ Failed to extract rollback artifacts" | tee -a "$ROLLBACK_LOG"
        rm -rf "$temp_dir"
        return 1
    fi

    # Deploy Groovy files
    echo "Deploying Groovy components..." | tee -a "$ROLLBACK_LOG"
    if ! deploy_groovy_artifacts "$temp_dir" "$environment"; then
        echo "❌ Groovy artifact deployment failed" | tee -a "$ROLLBACK_LOG"
        rm -rf "$temp_dir"
        return 1
    fi

    # Deploy web assets
    echo "Deploying web assets..." | tee -a "$ROLLBACK_LOG"
    if ! deploy_web_artifacts "$temp_dir" "$environment"; then
        echo "❌ Web artifact deployment failed" | tee -a "$ROLLBACK_LOG"
        rm -rf "$temp_dir"
        return 1
    fi

    # Validate artifact deployment
    if ! validate_artifact_deployment "$target_version"; then
        echo "❌ Artifact deployment validation failed" | tee -a "$ROLLBACK_LOG"
        rm -rf "$temp_dir"
        return 1
    fi

    rm -rf "$temp_dir"
    echo "✅ Application artifact rollback completed" | tee -a "$ROLLBACK_LOG"
    return 0
}

validate_rollback_success() {
    local environment="$1"
    local target_version="$2"

    echo "🔍 Validating rollback success..." | tee -a "$ROLLBACK_LOG"

    # Health endpoint validation
    if ! validate_health_endpoints "$environment"; then
        echo "❌ Health endpoint validation failed" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Version endpoint validation
    if ! validate_version_endpoints "$environment" "$target_version"; then
        echo "❌ Version endpoint validation failed" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Component functionality validation
    if ! validate_component_functionality "$environment"; then
        echo "❌ Component functionality validation failed" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    # Performance baseline validation
    if ! validate_performance_baseline "$environment" "$target_version"; then
        echo "❌ Performance baseline validation failed" | tee -a "$ROLLBACK_LOG"
        return 1
    fi

    echo "✅ Rollback validation completed successfully" | tee -a "$ROLLBACK_LOG"
    return 0
}

# Helper functions for rollback execution
stop_application_services() {
    local environment="$1"
    echo "Stopping UMIG services for $environment..." | tee -a "$ROLLBACK_LOG"

    # Stop ScriptRunner endpoints (graceful shutdown)
    curl -X POST "$(get_environment_url "$environment")/admin/shutdown" 2>/dev/null || true

    # Wait for graceful shutdown
    sleep 30

    # Verify services stopped
    local health_check=$(curl -s --max-time 5 "$(get_environment_url "$environment")/admin/health" 2>/dev/null || echo "stopped")
    if [[ "$health_check" == "stopped" ]]; then
        echo "✅ Application services stopped successfully" | tee -a "$ROLLBACK_LOG"
        return 0
    else
        echo "⚠️ Services may still be running" | tee -a "$ROLLBACK_LOG"
        return 0  # Continue with rollback
    fi
}

restart_application_services() {
    local environment="$1"
    echo "Restarting UMIG services for $environment..." | tee -a "$ROLLBACK_LOG"

    # Restart Confluence (which will restart ScriptRunner)
    sudo systemctl restart confluence 2>/dev/null || {
        echo "⚠️ Could not restart Confluence service" | tee -a "$ROLLBACK_LOG"
        echo "Manual service restart may be required" | tee -a "$ROLLBACK_LOG"
    }

    # Wait for startup
    echo "Waiting for service startup..." | tee -a "$ROLLBACK_LOG"
    local max_wait=300  # 5 minutes
    local wait_time=0

    while [[ $wait_time -lt $max_wait ]]; do
        local health_status=$(curl -s --max-time 10 "$(get_environment_url "$environment")/admin/health" 2>/dev/null | jq -r '.umig.status // "starting"')

        if [[ "$health_status" == "healthy" ]]; then
            echo "✅ Application services started successfully" | tee -a "$ROLLBACK_LOG"
            return 0
        fi

        echo "Service status: $health_status (waiting...)" | tee -a "$ROLLBACK_LOG"
        sleep 15
        wait_time=$((wait_time + 15))
    done

    echo "❌ Service startup timeout after ${max_wait}s" | tee -a "$ROLLBACK_LOG"
    return 1
}

send_rollback_notifications() {
    local status="$1"  # initiated, completed, failed
    local environment="$2"
    local current_version="$3"
    local target_version="$4"
    local additional_info="$5"

    case "$status" in
        "initiated")
            ./scripts/notifications/slack-rollback-notification.sh "rollback_initiated" "$environment" "$current_version" "$target_version" "$additional_info"
            ;;
        "completed")
            ./scripts/notifications/slack-rollback-notification.sh "rollback_completed" "$environment" "$target_version" "$current_version" "$additional_info"
            ;;
        "failed")
            ./scripts/notifications/slack-rollback-notification.sh "rollback_failed" "$environment" "$current_version" "$target_version" "$additional_info"
            ;;
    esac
}

handle_rollback_failure() {
    local failure_type="$1"
    local environment="$2"
    local current_version="$3"
    local target_version="$4"

    echo "🚨 ROLLBACK FAILURE DETECTED: $failure_type" | tee -a "$ROLLBACK_LOG"

    # Send critical failure notifications
    send_rollback_notifications "failed" "$environment" "$current_version" "$target_version" "$failure_type"

    # Trigger incident response
    ./scripts/incident/create-rollback-incident.sh "$failure_type" "$environment" "$current_version" "$target_version"

    # Attempt emergency recovery if possible
    case "$failure_type" in
        "backup_failed"|"prerequisites_failed")
            echo "Manual intervention required immediately" | tee -a "$ROLLBACK_LOG"
            ;;
        "execution_failed"|"validation_failed")
            echo "Attempting emergency recovery..." | tee -a "$ROLLBACK_LOG"
            attempt_emergency_recovery "$environment" "$current_version"
            ;;
    esac
}

# Execute rollback if called directly
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    execute_automated_rollback "$1" "$2" "$3" "$4"
fi
```

## Manual Emergency Rollback Procedures

### 1. Emergency Rollback Checklist

```markdown
# UMIG Emergency Manual Rollback Checklist

## ⚠️ CRITICAL: Use only when automated rollback fails or is unavailable

### Pre-Rollback Assessment [REQUIRED]

- [ ] **Incident Severity Confirmed**: Critical/High severity requiring immediate rollback
- [ ] **Rollback Target Selected**: Version compatibility validated from matrix
- [ ] **Stakeholders Notified**: Operations manager, development lead, business stakeholders
- [ ] **Backup Verified**: Current system backup created and validated
- [ ] **Resources Available**: Technical team available for 2+ hours
- [ ] **Communication Established**: Incident bridge active, status page updated

### Emergency Rollback Execution [STEP-BY-STEP]

#### Step 1: System Preparation [5 minutes]

- [ ] **Enable Maintenance Mode**: Display maintenance message to users
- [ ] **Document Current State**: Screenshot version endpoints, record current metrics
- [ ] **Prepare Workspace**: Terminal access to production systems, rollback artifacts ready
- [ ] **Start Incident Log**: Begin detailed timestamped incident documentation

#### Step 2: Service Shutdown [5 minutes]

- [ ] **Stop User Access**: Block new user sessions at load balancer level
- [ ] **Graceful Service Shutdown**: Allow in-progress operations to complete
- [ ] **Verify Service Stop**: Confirm all UMIG processes stopped
- [ ] **Monitor Active Connections**: Ensure no active database connections

#### Step 3: Database Rollback [10 minutes]

- [ ] **Create Emergency Backup**: Full database backup before any changes
- [ ] **Identify Target Changeset**: Confirm Liquibase changeset for target version
- [ ] **Execute Liquibase Rollback**: Run changeset rollback commands
- [ ] **Validate Schema Version**: Confirm database schema matches target
- [ ] **Test Database Connectivity**: Basic connection and query tests

#### Step 4: Application Rollback [15 minutes]

- [ ] **Backup Current Files**: Create backup of current application files
- [ ] **Locate Target Artifacts**: Find and verify target version deployment package
- [ ] **Extract Rollback Files**: Unzip and prepare target version files
- [ ] **Deploy Groovy Components**: Copy Groovy files to ScriptRunner directory
- [ ] **Deploy Web Assets**: Copy JavaScript/CSS files to web directory
- [ ] **Update Configuration**: Restore configuration files for target version

#### Step 5: Service Restart [10 minutes]

- [ ] **Restart Confluence Service**: Restart Confluence to reload ScriptRunner
- [ ] **Monitor Startup Logs**: Watch for startup errors or failures
- [ ] **Wait for Full Initialization**: Allow ComponentOrchestrator to load
- [ ] **Verify Service Health**: Check all services responding correctly

#### Step 6: Validation Testing [15 minutes]

- [ ] **Health Endpoint Check**: Verify /admin/health returns healthy status
- [ ] **Version Verification**: Confirm /admin/version shows target version
- [ ] **Component Status Check**: Verify /admin/components shows all active
- [ ] **API Functionality Test**: Test key API endpoints (teams, users, migrations)
- [ ] **UI Component Test**: Verify UI components load and function correctly
- [ ] **Authentication Test**: Confirm user authentication working
- [ ] **Database Connectivity**: Verify application can read/write database

#### Step 7: Traffic Restoration [5 minutes]

- [ ] **Disable Maintenance Mode**: Remove maintenance message
- [ ] **Restore User Access**: Re-enable user sessions at load balancer
- [ ] **Monitor Initial Traffic**: Watch for immediate errors or issues
- [ ] **Verify User Experience**: Test from user perspective

#### Step 8: Post-Rollback Monitoring [30 minutes]

- [ ] **Performance Monitoring**: Watch response times and error rates
- [ ] **Component Health**: Monitor all components for stability
- [ ] **User Feedback**: Monitor for user-reported issues
- [ ] **System Resources**: Check CPU, memory, database performance
- [ ] **Error Logs**: Review application logs for issues

### Post-Rollback Tasks [REQUIRED]

- [ ] **Update Status Communications**: Notify all stakeholders of completion
- [ ] **Document Rollback Execution**: Complete incident documentation
- [ ] **Schedule Post-Mortem**: Plan incident review within 24 hours
- [ ] **Update Monitoring**: Adjust monitoring for target version
- [ ] **Plan Forward Fix**: Determine how to address original issue

### Rollback Failure Escalation [IF NEEDED]

- [ ] **Escalate to Senior Engineer**: Bring in additional technical expertise
- [ ] **Contact Database Administrator**: For complex database issues
- [ ] **Engage Confluence Support**: For ScriptRunner/Confluence issues
- [ ] **Consider Data Recovery**: If data integrity compromised
- [ ] **Implement Emergency Bypass**: Temporary workarounds while fixing

### Success Criteria Validation [REQUIRED]

- [ ] **All Health Checks Passing**: Green status across all monitoring
- [ ] **Target Version Confirmed**: Version endpoints show correct version
- [ ] **No Data Loss**: All critical data preserved and accessible
- [ ] **Performance Within Baseline**: Response times acceptable
- [ ] **User Access Restored**: Users can access system normally
```

### 2. Emergency Contact Information

```bash
# /etc/umig/emergency-contacts.json
{
  "contacts": {
    "technical_lead": {
      "name": "Lucas Challamel",
      "phone": "+41-XXX-XXX-XXXX",
      "email": "lucas.challamel@company.com",
      "availability": "24/7",
      "expertise": ["UMIG Architecture", "Database", "ScriptRunner"]
    },
    "operations_manager": {
      "name": "Operations Manager",
      "phone": "+41-XXX-XXX-XXXX",
      "email": "ops-manager@company.com",
      "availability": "Business hours + on-call",
      "expertise": ["Deployment", "Infrastructure", "Incident Management"]
    },
    "database_administrator": {
      "name": "DBA Team",
      "phone": "+41-XXX-XXX-XXXX",
      "email": "dba-team@company.com",
      "availability": "24/7 on-call",
      "expertise": ["PostgreSQL", "Liquibase", "Data Recovery"]
    }
  },
  "escalation_matrix": {
    "level_1": ["technical_lead"],
    "level_2": ["technical_lead", "operations_manager"],
    "level_3": ["technical_lead", "operations_manager", "database_administrator", "cto"]
  }
}
```

## Component-Specific Rollback Procedures

### 1. Database-Only Rollback

```bash
#!/bin/bash
# scripts/rollback/database-only-rollback.sh

execute_database_only_rollback() {
    local target_changeset="$1"
    local reason="$2"

    echo "=== Database-Only Rollback ==="
    echo "Target Changeset: $target_changeset"
    echo "Reason: $reason"
    echo "Timestamp: $(date -Iseconds)"

    # Validation
    if ! validate_database_only_rollback_prerequisites "$target_changeset"; then
        echo "❌ Database-only rollback prerequisites failed"
        exit 1
    fi

    # Create backup
    local backup_name="rollback-$(date +%Y%m%d-%H%M%S)"
    if ! create_database_backup "$backup_name"; then
        echo "❌ Database backup failed"
        exit 1
    fi

    # Calculate rollback count
    local current_changeset=$(liquibase status | grep "changesets have not been applied" | wc -l)
    local rollback_count=$((current_changeset - target_changeset))

    if [[ $rollback_count -le 0 ]]; then
        echo "✅ Database already at or beyond target changeset"
        return 0
    fi

    # Execute rollback
    echo "Rolling back $rollback_count changesets..."
    liquibase rollback-count "$rollback_count"

    # Validate
    if ! validate_database_rollback_success "$target_changeset"; then
        echo "❌ Database rollback validation failed"
        # Attempt to restore backup
        restore_database_backup "$backup_name"
        exit 1
    fi

    echo "✅ Database-only rollback completed successfully"

    # Notify stakeholders
    send_database_rollback_notification "$target_changeset" "$rollback_count" "$reason"
}

validate_database_only_rollback_prerequisites() {
    local target_changeset="$1"

    # Check if target changeset is valid
    if ! liquibase tag-exists "changeset-$target_changeset"; then
        echo "❌ Target changeset does not exist"
        return 1
    fi

    # Check for dependent application version
    local app_version=$(curl -s "$UMIG_BASE_URL/admin/version" | jq -r '.umig.version')
    local compatible_db_version=$(get_compatible_db_version "$app_version")

    if [[ "$compatible_db_version" != "$target_changeset" ]]; then
        echo "⚠️ Warning: Application version $app_version may not be compatible with changeset $target_changeset"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            return 1
        fi
    fi

    return 0
}
```

### 2. UI Component Hot-Swap Rollback

```javascript
// scripts/rollback/ui-component-rollback.js
const ComponentRollback = {
  async rollbackComponent(componentName, targetVersion) {
    console.log(`🔄 Rolling back ${componentName} to version ${targetVersion}`);

    try {
      // Step 1: Prepare rollback
      await this.prepareComponentRollback(componentName, targetVersion);

      // Step 2: Unload current component
      await this.safeUnloadComponent(componentName);

      // Step 3: Load target component version
      await this.loadComponentVersion(componentName, targetVersion);

      // Step 4: Validate component functionality
      await this.validateComponentAfterRollback(componentName, targetVersion);

      console.log(`✅ Component ${componentName} rolled back successfully`);
      return { success: true, version: targetVersion };
    } catch (error) {
      console.error(`❌ Component rollback failed: ${error.message}`);

      // Attempt recovery
      await this.attemptComponentRecovery(componentName);

      return { success: false, error: error.message };
    }
  },

  async prepareComponentRollback(componentName, targetVersion) {
    // Check if target version exists
    const versionExists = await this.checkComponentVersionExists(
      componentName,
      targetVersion,
    );
    if (!versionExists) {
      throw new Error(
        `Target version ${targetVersion} not found for ${componentName}`,
      );
    }

    // Create component state backup
    await this.backupComponentState(componentName);

    // Notify other components of pending rollback
    if (window.ComponentOrchestrator) {
      await window.ComponentOrchestrator.notifyComponentRollback(
        componentName,
        targetVersion,
      );
    }
  },

  async safeUnloadComponent(componentName) {
    if (window.ComponentOrchestrator) {
      // Use orchestrator for safe unloading
      await window.ComponentOrchestrator.safeUnloadComponent(componentName);
    } else {
      // Manual unload
      if (
        window[componentName] &&
        typeof window[componentName].destroy === "function"
      ) {
        await window[componentName].destroy();
      }
      delete window[componentName];
    }
  },

  async loadComponentVersion(componentName, targetVersion) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `/umig-web/js/components/${componentName}-${targetVersion}.js`;

      script.onload = () => {
        // Verify component loaded correctly
        if (window[componentName]) {
          resolve();
        } else {
          reject(
            new Error(`Component ${componentName} not found after loading`),
          );
        }
      };

      script.onerror = () => {
        reject(
          new Error(
            `Failed to load component ${componentName} version ${targetVersion}`,
          ),
        );
      };

      document.head.appendChild(script);
    });
  },

  async validateComponentAfterRollback(componentName, expectedVersion) {
    const component = window[componentName];

    if (!component) {
      throw new Error(
        `Component ${componentName} not available after rollback`,
      );
    }

    // Check version
    if (component.version && component.version !== expectedVersion) {
      throw new Error(
        `Version mismatch: expected ${expectedVersion}, got ${component.version}`,
      );
    }

    // Check basic functionality
    if (typeof component.initialize === "function") {
      await component.initialize();
    }

    // Register with orchestrator
    if (window.ComponentOrchestrator) {
      await window.ComponentOrchestrator.registerComponent(
        componentName,
        component,
      );
    }

    console.log(`✅ Component ${componentName} validation passed`);
  },

  async attemptComponentRecovery(componentName) {
    console.log(`🔄 Attempting recovery for ${componentName}...`);

    try {
      // Try to restore from backup
      await this.restoreComponentFromBackup(componentName);
    } catch (backupError) {
      console.error(`❌ Recovery failed: ${backupError.message}`);

      // Last resort: reload page
      console.log("🔄 Performing page reload as last resort...");
      setTimeout(() => window.location.reload(), 1000);
    }
  },
};

// Export for use in rollback scripts
if (typeof module !== "undefined" && module.exports) {
  module.exports = ComponentRollback;
} else {
  window.ComponentRollback = ComponentRollback;
}
```

## Rollback Success Validation

### 1. Comprehensive Validation Suite

```bash
#!/bin/bash
# scripts/rollback/validate-rollback-success.sh

validate_rollback_success() {
    local environment="$1"
    local target_version="$2"
    local timeout="${3:-300}"  # 5 minutes default

    echo "=== Comprehensive Rollback Validation ==="
    echo "Environment: $environment"
    echo "Target Version: $target_version"
    echo "Timeout: ${timeout}s"
    echo "Start Time: $(date -Iseconds)"

    local validation_start_time=$(date +%s)
    local validation_results=()

    # Health endpoint validation
    echo "📋 1. Health Endpoint Validation"
    if validate_health_endpoints "$environment" "$timeout"; then
        validation_results+=("health:PASS")
        echo "✅ Health endpoints validation passed"
    else
        validation_results+=("health:FAIL")
        echo "❌ Health endpoints validation failed"
    fi

    # Version endpoint validation
    echo "📋 2. Version Endpoint Validation"
    if validate_version_endpoints "$environment" "$target_version"; then
        validation_results+=("version:PASS")
        echo "✅ Version endpoints validation passed"
    else
        validation_results+=("version:FAIL")
        echo "❌ Version endpoints validation failed"
    fi

    # Component functionality validation
    echo "📋 3. Component Functionality Validation"
    if validate_component_functionality "$environment"; then
        validation_results+=("components:PASS")
        echo "✅ Component functionality validation passed"
    else
        validation_results+=("components:FAIL")
        echo "❌ Component functionality validation failed"
    fi

    # Database connectivity validation
    echo "📋 4. Database Connectivity Validation"
    if validate_database_connectivity "$environment"; then
        validation_results+=("database:PASS")
        echo "✅ Database connectivity validation passed"
    else
        validation_results+=("database:FAIL")
        echo "❌ Database connectivity validation failed"
    fi

    # API functionality validation
    echo "📋 5. API Functionality Validation"
    if validate_api_functionality "$environment"; then
        validation_results+=("api:PASS")
        echo "✅ API functionality validation passed"
    else
        validation_results+=("api:FAIL")
        echo "❌ API functionality validation failed"
    fi

    # Performance baseline validation
    echo "📋 6. Performance Baseline Validation"
    if validate_performance_baseline "$environment" "$target_version"; then
        validation_results+=("performance:PASS")
        echo "✅ Performance baseline validation passed"
    else
        validation_results+=("performance:WARN")
        echo "⚠️ Performance baseline validation warning (non-blocking)"
    fi

    # Security validation
    echo "📋 7. Security Validation"
    if validate_security_posture "$environment"; then
        validation_results+=("security:PASS")
        echo "✅ Security validation passed"
    else
        validation_results+=("security:FAIL")
        echo "❌ Security validation failed"
    fi

    # Calculate validation results
    local validation_end_time=$(date +%s)
    local validation_duration=$((validation_end_time - validation_start_time))
    local total_tests=${#validation_results[@]}
    local passed_tests=$(printf '%s\n' "${validation_results[@]}" | grep -c ":PASS")
    local failed_tests=$(printf '%s\n' "${validation_results[@]}" | grep -c ":FAIL")
    local warning_tests=$(printf '%s\n' "${validation_results[@]}" | grep -c ":WARN")

    # Generate validation report
    echo ""
    echo "=== Validation Summary ==="
    echo "Duration: ${validation_duration}s"
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $failed_tests"
    echo "Warnings: $warning_tests"

    # Detailed results
    echo ""
    echo "Detailed Results:"
    for result in "${validation_results[@]}"; do
        local test_name=$(echo "$result" | cut -d':' -f1)
        local test_result=$(echo "$result" | cut -d':' -f2)
        case "$test_result" in
            "PASS") echo "✅ $test_name" ;;
            "FAIL") echo "❌ $test_name" ;;
            "WARN") echo "⚠️ $test_name" ;;
        esac
    done

    # Generate validation report file
    local report_file="/var/log/umig/rollback-validation-$(date +%Y%m%d-%H%M%S).json"
    generate_validation_report "$environment" "$target_version" "$validation_duration" "${validation_results[@]}" > "$report_file"

    # Determine overall result
    if [[ $failed_tests -eq 0 ]]; then
        echo ""
        echo "✅ ROLLBACK VALIDATION SUCCESSFUL"
        echo "All critical validations passed"
        return 0
    else
        echo ""
        echo "❌ ROLLBACK VALIDATION FAILED"
        echo "$failed_tests critical validations failed"
        echo "Validation report: $report_file"
        return 1
    fi
}

validate_health_endpoints() {
    local environment="$1"
    local timeout="$2"
    local env_url=$(get_environment_url "$environment")

    local end_time=$(($(date +%s) + timeout))

    while [[ $(date +%s) -lt $end_time ]]; do
        local health_response=$(curl -s --max-time 10 "$env_url/rest/scriptrunner/latest/custom/admin/health" 2>/dev/null)

        if [[ -n "$health_response" ]]; then
            local health_status=$(echo "$health_response" | jq -r '.umig.status // "unknown"')

            if [[ "$health_status" == "healthy" ]]; then
                return 0
            fi

            echo "Health status: $health_status (waiting...)"
        else
            echo "Health endpoint not responding (waiting...)"
        fi

        sleep 10
    done

    echo "❌ Health endpoint validation timeout"
    return 1
}

validate_api_functionality() {
    local environment="$1"
    local env_url=$(get_environment_url "$environment")

    # Test key API endpoints
    local endpoints=("teams" "users" "environments" "applications")

    for endpoint in "${endpoints[@]}"; do
        echo "Testing API endpoint: $endpoint"

        local response=$(curl -s -w "%{http_code}" -o /dev/null --max-time 10 "$env_url/rest/scriptrunner/latest/custom/$endpoint")

        if [[ "$response" -eq 200 ]]; then
            echo "✅ $endpoint endpoint responsive"
        else
            echo "❌ $endpoint endpoint failed (HTTP $response)"
            return 1
        fi
    done

    return 0
}

generate_validation_report() {
    local environment="$1"
    local target_version="$2"
    local duration="$3"
    shift 3
    local results=("$@")

    cat << EOF
{
  "rollbackValidation": {
    "timestamp": "$(date -Iseconds)",
    "environment": "$environment",
    "targetVersion": "$target_version",
    "duration": "${duration}s",
    "results": {
EOF

    local first=true
    for result in "${results[@]}"; do
        local test_name=$(echo "$result" | cut -d':' -f1)
        local test_result=$(echo "$result" | cut -d':' -f2)

        if [[ "$first" == "true" ]]; then
            first=false
        else
            echo ","
        fi

        echo -n "      \"$test_name\": \"$test_result\""
    done

    cat << EOF

    },
    "summary": {
      "totalTests": ${#results[@]},
      "passed": $(printf '%s\n' "${results[@]}" | grep -c ":PASS"),
      "failed": $(printf '%s\n' "${results[@]}" | grep -c ":FAIL"),
      "warnings": $(printf '%s\n' "${results[@]}" | grep -c ":WARN")
    }
  }
}
EOF
}
```

## Quick Reference Commands

### Essential Rollback Commands

```bash
# Check rollback compatibility
./scripts/rollback/check-rollback-compatibility.sh v1.2.0 v1.1.2

# Execute automated rollback
./scripts/rollback/execute-automated-rollback.sh production v1.2.0 v1.1.2 "critical_performance_issue"

# Manual rollback decision assessment
./scripts/rollback/manual-rollback-decision.sh production v1.2.0 "database performance degradation"

# Database-only rollback
./scripts/rollback/database-only-rollback.sh 029 "schema_compatibility_issue"

# Component hot-swap rollback
node -e "ComponentRollback.rollbackComponent('TeamsEntityManager', '1.1.2')"

# Validate rollback success
./scripts/rollback/validate-rollback-success.sh production v1.1.2
```

### Emergency Commands

```bash
# Emergency rollback status check
curl -s "$UMIG_BASE_URL/admin/health" | jq '{status: .umig.status, version: .umig.version}'

# Emergency component status
curl -s "$UMIG_BASE_URL/admin/components" | jq '.orchestrator.status'

# Emergency database check
curl -s "$UMIG_BASE_URL/admin/health" | jq '.components.database'

# Stop application services
sudo systemctl stop confluence

# Start application services
sudo systemctl start confluence
```

### Monitoring Commands

```bash
# Monitor rollback progress
tail -f /var/log/umig/rollback-*.log

# Check version after rollback
curl -s "$UMIG_BASE_URL/admin/version" | jq '.umig.version'

# Monitor health during rollback
watch -n 5 "curl -s $UMIG_BASE_URL/admin/health | jq '.umig.status'"
```

---

**Emergency Contact**: In case of rollback failure or critical issues, contact:

- **Technical Lead**: Lucas Challamel (+41-XXX-XXX-XXXX)
- **Operations Manager**: ops-manager@company.com
- **24/7 Support**: support@company.com

**Next Steps**: After completing rollback operations, refer to:

- [Version Management Procedures](version-management-procedures.md) for version coordination
- [Deployment Tracking Guide](deployment-tracking-guide.md) for monitoring
- [Build Artifact Specifications](build-artifact-specifications.md) for artifact management
