#!/bin/bash

# Database Connectivity Validation Test
# Tests PostgreSQL connections for both Confluence and UMIG databases

set -euo pipefail

readonly SCRIPT_NAME="$(basename "${0}")"
readonly YELLOW='\033[1;33m'
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly NC='\033[0m' # No Color

# Configuration from podman-compose.yml
readonly POSTGRES_HOST="localhost"
readonly POSTGRES_PORT="5432"
readonly CONFLUENCE_DB="${POSTGRES_DB:-umig_db}"
readonly CONFLUENCE_USER="${POSTGRES_USER:-umig_user}"
readonly CONFLUENCE_PASSWORD="${POSTGRES_PASSWORD:-changeme}"
readonly UMIG_DB="${UMIG_DB_NAME:-umig_app_db}"
readonly UMIG_USER="${UMIG_DB_USER:-umig_app_user}"
readonly UMIG_PASSWORD="${UMIG_DB_PASSWORD:-changeme_too}"

log() {
    echo -e "${YELLOW}[${SCRIPT_NAME}]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}✅ $1${NC}" >&2
}

error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

# Test PostgreSQL server connectivity
test_postgres_server() {
    log "Testing PostgreSQL server connectivity..."
    local failed=0
    
    # Test basic connectivity
    if pg_isready -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" >/dev/null 2>&1; then
        success "PostgreSQL server is accepting connections"
    else
        error "PostgreSQL server is not accepting connections"
        ((failed++))
    fi
    
    # Test using container health check
    local container_health=$(podman exec umig_postgres pg_isready -U "$CONFLUENCE_USER" -d "$CONFLUENCE_DB" 2>/dev/null || echo "failed")
    if [[ "$container_health" == *"accepting connections"* ]]; then
        success "PostgreSQL container internal health check passed"
    else
        error "PostgreSQL container internal health check failed: $container_health"
        ((failed++))
    fi
    
    return $failed
}

# Test Confluence database connection
test_confluence_database() {
    log "Testing Confluence database connectivity..."
    local failed=0
    
    # Test database connection and basic query
    local query_result
    if query_result=$(PGPASSWORD="$CONFLUENCE_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$CONFLUENCE_USER" -d "$CONFLUENCE_DB" -t -c "SELECT version();" 2>/dev/null); then
        success "Connected to Confluence database successfully"
        log "PostgreSQL version: $(echo "$query_result" | xargs)"
    else
        error "Failed to connect to Confluence database"
        ((failed++))
    fi
    
    # Test if Confluence tables exist (indicates successful setup)
    if PGPASSWORD="$CONFLUENCE_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$CONFLUENCE_USER" -d "$CONFLUENCE_DB" -t -c "\dt" >/dev/null 2>&1; then
        local table_count
        table_count=$(PGPASSWORD="$CONFLUENCE_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$CONFLUENCE_USER" -d "$CONFLUENCE_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null | xargs)
        if [[ "$table_count" -gt 0 ]]; then
            success "Confluence database contains $table_count tables"
        else
            error "Confluence database has no tables (not initialized)"
            ((failed++))
        fi
    else
        error "Cannot query Confluence database tables"
        ((failed++))
    fi
    
    return $failed
}

# Test UMIG application database connection
test_umig_database() {
    log "Testing UMIG application database connectivity..."
    local failed=0
    
    # Test database connection
    local query_result
    if query_result=$(PGPASSWORD="$UMIG_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$UMIG_USER" -d "$UMIG_DB" -t -c "SELECT current_database();" 2>/dev/null); then
        success "Connected to UMIG database successfully"
        log "Connected to database: $(echo "$query_result" | xargs)"
    else
        error "Failed to connect to UMIG database"
        ((failed++))
    fi
    
    # Test core UMIG tables exist
    local core_tables=("mig_master" "pln_instance" "seq_instance" "phi_instance" "sti_instance")
    local missing_tables=()
    
    for table in "${core_tables[@]}"; do
        if PGPASSWORD="$UMIG_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$UMIG_USER" -d "$UMIG_DB" -t -c "SELECT 1 FROM $table LIMIT 1;" >/dev/null 2>&1; then
            success "Table '$table' exists and is accessible"
        else
            missing_tables+=("$table")
            error "Table '$table' is missing or inaccessible"
            ((failed++))
        fi
    done
    
    # Test database permissions
    if PGPASSWORD="$UMIG_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$UMIG_USER" -d "$UMIG_DB" -t -c "CREATE TEMP TABLE test_permissions (id INT);" >/dev/null 2>&1; then
        success "UMIG user has create table permissions"
    else
        error "UMIG user lacks create table permissions"
        ((failed++))
    fi
    
    return $failed
}

# Test database performance and connectivity from containers
test_internal_connectivity() {
    log "Testing database connectivity from containers..."
    local failed=0
    
    # Test Confluence container can connect to PostgreSQL
    if podman exec umig_confluence nc -z umig_postgres 5432 >/dev/null 2>&1; then
        success "Confluence container can reach PostgreSQL"
    else
        error "Confluence container cannot reach PostgreSQL"
        ((failed++))
    fi
    
    # Test database query performance (should complete within 5 seconds)
    local start_time=$(date +%s)
    if PGPASSWORD="$UMIG_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$UMIG_USER" -d "$UMIG_DB" -t -c "SELECT COUNT(*) FROM information_schema.tables;" >/dev/null 2>&1; then
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        if [ $duration -le 5 ]; then
            success "Database query completed in ${duration}s (performance acceptable)"
        else
            error "Database query took ${duration}s (performance issue)"
            ((failed++))
        fi
    else
        error "Database performance test query failed"
        ((failed++))
    fi
    
    return $failed
}

# Test database connection pooling and concurrent connections
test_connection_limits() {
    log "Testing database connection handling..."
    local failed=0
    
    # Get current connection count
    local connection_count
    if connection_count=$(PGPASSWORD="$CONFLUENCE_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$CONFLUENCE_USER" -d "$CONFLUENCE_DB" -t -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';" 2>/dev/null | xargs); then
        success "Current active connections: $connection_count"
        
        # Warn if connection count is high
        if [ "$connection_count" -gt 50 ]; then
            error "High connection count detected: $connection_count (may indicate connection leak)"
            ((failed++))
        fi
    else
        error "Cannot query active connections"
        ((failed++))
    fi
    
    # Test max connections setting
    local max_connections
    if max_connections=$(PGPASSWORD="$CONFLUENCE_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$CONFLUENCE_USER" -d "$CONFLUENCE_DB" -t -c "SHOW max_connections;" 2>/dev/null | xargs); then
        success "PostgreSQL max_connections: $max_connections"
        
        # Check if max_connections is reasonable
        if [ "$max_connections" -lt 20 ]; then
            error "max_connections ($max_connections) may be too low for Confluence"
            ((failed++))
        fi
    else
        error "Cannot query max_connections setting"
        ((failed++))
    fi
    
    return $failed
}

# Test Liquibase schema version
test_schema_version() {
    log "Testing UMIG database schema version..."
    local failed=0
    
    # Check if databasechangelog table exists (Liquibase)
    if PGPASSWORD="$UMIG_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$UMIG_USER" -d "$UMIG_DB" -t -c "SELECT 1 FROM databasechangelog LIMIT 1;" >/dev/null 2>&1; then
        success "Liquibase change tracking table exists"
        
        # Get the latest applied changeset
        local latest_changeset
        if latest_changeset=$(PGPASSWORD="$UMIG_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$UMIG_USER" -d "$UMIG_DB" -t -c "SELECT filename FROM databasechangelog ORDER BY dateexecuted DESC LIMIT 1;" 2>/dev/null | xargs); then
            success "Latest applied changeset: $latest_changeset"
        else
            error "Cannot query latest changeset"
            ((failed++))
        fi
    else
        error "Liquibase change tracking table missing"
        ((failed++))
    fi
    
    return $failed
}

# Main test execution
main() {
    log "Starting database connectivity validation tests..."
    local total_failed=0
    
    echo "=========================================="
    echo "🗄️  Database Connectivity Validation Tests"
    echo "=========================================="
    echo
    
    # Run all tests
    test_postgres_server || ((total_failed++))
    echo
    
    test_confluence_database || ((total_failed++))
    echo
    
    test_umig_database || ((total_failed++))
    echo
    
    test_internal_connectivity || ((total_failed++))
    echo
    
    test_connection_limits || ((total_failed++))
    echo
    
    test_schema_version || ((total_failed++))
    echo
    
    # Summary
    echo "=========================================="
    if [ $total_failed -eq 0 ]; then
        success "All database connectivity tests PASSED ✨"
        echo "Database connections are ready for Confluence 9.2.7"
        exit 0
    else
        error "${total_failed} test group(s) FAILED ❌"
        echo "Please review database configuration before proceeding"
        exit 1
    fi
}

# Ensure required tools are available
command -v psql >/dev/null 2>&1 || { error "psql (PostgreSQL client) is required but not installed"; exit 1; }
command -v pg_isready >/dev/null 2>&1 || { error "pg_isready is required but not installed"; exit 1; }
command -v podman >/dev/null 2>&1 || { error "podman is required but not installed"; exit 1; }

main "$@"