#!/bin/bash

# Container Health Validation Test
# Verifies container status, health, and connectivity for Confluence 9.2.7 upgrade

set -euo pipefail

readonly SCRIPT_NAME="$(basename "${0}")"
readonly YELLOW='\033[1;33m'
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly NC='\033[0m' # No Color

# Configuration
readonly CONTAINERS=("umig_confluence" "umig_postgres" "umig_mailhog")
readonly CONFLUENCE_URL="http://localhost:8090"
readonly POSTGRES_PORT="5432"
readonly MAILHOG_PORT="8025"
readonly TIMEOUT=60

log() {
    echo -e "${YELLOW}[${SCRIPT_NAME}]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}✅ $1${NC}" >&2
}

error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

# Test 1: Container Status Check
test_container_status() {
    log "Testing container status..."
    local failed=0
    
    for container in "${CONTAINERS[@]}"; do
        if podman ps --format "{{.Names}}" | grep -q "^${container}$"; then
            local status=$(podman ps --format "table {{.Names}} {{.Status}}" | grep "${container}" | awk '{print $2}')
            if [[ "$status" == "Up" ]]; then
                success "Container ${container} is running"
            else
                error "Container ${container} status: ${status}"
                ((failed++))
            fi
        else
            error "Container ${container} is not running"
            ((failed++))
        fi
    done
    
    return $failed
}

# Test 2: Container Health Checks
test_container_health() {
    log "Testing container health checks..."
    local failed=0
    
    # Check Confluence container logs for startup completion
    if ! podman logs umig_confluence --tail 20 2>/dev/null | grep -q "Server startup"; then
        if ! wait_for_condition "podman logs umig_confluence --tail 50 | grep -q 'Server startup'" $TIMEOUT; then
            error "Confluence container failed to start properly"
            ((failed++))
        else
            success "Confluence container started successfully"
        fi
    else
        success "Confluence container is healthy"
    fi
    
    # Check PostgreSQL health check
    local pg_health=$(podman inspect umig_postgres --format '{{.State.Health.Status}}' 2>/dev/null || echo "unknown")
    if [[ "$pg_health" == "healthy" ]]; then
        success "PostgreSQL container is healthy"
    else
        error "PostgreSQL container health: ${pg_health}"
        ((failed++))
    fi
    
    # MailHog doesn't have health checks, but we can verify it's responding
    if curl -s "http://localhost:${MAILHOG_PORT}" >/dev/null 2>&1; then
        success "MailHog container is responding"
    else
        error "MailHog container is not responding"
        ((failed++))
    fi
    
    return $failed
}

# Test 3: Network Connectivity
test_network_connectivity() {
    log "Testing network connectivity..."
    local failed=0
    
    # Test internal network connectivity
    if podman exec umig_confluence nc -z umig_postgres 5432 >/dev/null 2>&1; then
        success "Confluence can connect to PostgreSQL internally"
    else
        error "Confluence cannot connect to PostgreSQL internally"
        ((failed++))
    fi
    
    if podman exec umig_confluence nc -z umig_mailhog 1025 >/dev/null 2>&1; then
        success "Confluence can connect to MailHog internally"
    else
        error "Confluence cannot connect to MailHog internally"
        ((failed++))
    fi
    
    return $failed
}

# Test 4: Port Accessibility
test_port_accessibility() {
    log "Testing port accessibility..."
    local failed=0
    
    local ports=("8090" "5432" "8025" "1025")
    
    for port in "${ports[@]}"; do
        if nc -z localhost "$port" >/dev/null 2>&1; then
            success "Port ${port} is accessible"
        else
            error "Port ${port} is not accessible"
            ((failed++))
        fi
    done
    
    return $failed
}

# Test 5: Volume Mounts
test_volume_mounts() {
    log "Testing volume mounts..."
    local failed=0
    
    # Check Confluence data volume
    if podman exec umig_confluence test -d /var/atlassian/application-data/confluence; then
        success "Confluence data volume is mounted"
    else
        error "Confluence data volume is not mounted"
        ((failed++))
    fi
    
    # Check UMIG scripts volume
    if podman exec umig_confluence test -d /var/atlassian/application-data/confluence/scripts/umig; then
        success "UMIG scripts volume is mounted"
    else
        error "UMIG scripts volume is not mounted"
        ((failed++))
    fi
    
    # Check PostgreSQL data volume
    if podman exec umig_postgres test -d /var/lib/postgresql/data; then
        success "PostgreSQL data volume is mounted"
    else
        error "PostgreSQL data volume is not mounted"
        ((failed++))
    fi
    
    return $failed
}

# Test 6: Resource Usage
test_resource_usage() {
    log "Testing resource usage..."
    local failed=0
    
    # Check memory usage (should not exceed 80% of allocated)
    local confluence_memory=$(podman stats umig_confluence --no-stream --format "{{.MemPerc}}" | sed 's/%//')
    if (( $(echo "$confluence_memory < 80" | bc -l) )); then
        success "Confluence memory usage: ${confluence_memory}%"
    else
        error "Confluence memory usage is high: ${confluence_memory}%"
        ((failed++))
    fi
    
    # Check if containers are using expected resources
    local postgres_memory=$(podman stats umig_postgres --no-stream --format "{{.MemPerc}}" | sed 's/%//')
    if (( $(echo "$postgres_memory < 50" | bc -l) )); then
        success "PostgreSQL memory usage: ${postgres_memory}%"
    else
        error "PostgreSQL memory usage is high: ${postgres_memory}%"
        ((failed++))
    fi
    
    return $failed
}

# Helper function to wait for a condition
wait_for_condition() {
    local condition="$1"
    local timeout="$2"
    local counter=0
    
    while ! eval "$condition" && [ $counter -lt $timeout ]; do
        sleep 1
        ((counter++))
    done
    
    [ $counter -lt $timeout ]
}

# Main test execution
main() {
    log "Starting container health validation tests..."
    local total_failed=0
    
    echo "=========================================="
    echo "🐳 Container Health Validation Tests"
    echo "=========================================="
    echo
    
    # Run all tests
    test_container_status || ((total_failed++))
    echo
    
    test_container_health || ((total_failed++))
    echo
    
    test_network_connectivity || ((total_failed++))
    echo
    
    test_port_accessibility || ((total_failed++))
    echo
    
    test_volume_mounts || ((total_failed++))
    echo
    
    test_resource_usage || ((total_failed++))
    echo
    
    # Summary
    echo "=========================================="
    if [ $total_failed -eq 0 ]; then
        success "All container health tests PASSED ✨"
        echo "Container environment is ready for Confluence 9.2.7"
        exit 0
    else
        error "${total_failed} test group(s) FAILED ❌"
        echo "Please review the failures before proceeding with upgrade validation"
        exit 1
    fi
}

# Ensure required tools are available
command -v podman >/dev/null 2>&1 || { error "podman is required but not installed"; exit 1; }
command -v curl >/dev/null 2>&1 || { error "curl is required but not installed"; exit 1; }
command -v nc >/dev/null 2>&1 || { error "nc (netcat) is required but not installed"; exit 1; }
command -v bc >/dev/null 2>&1 || { error "bc is required but not installed"; exit 1; }

main "$@"