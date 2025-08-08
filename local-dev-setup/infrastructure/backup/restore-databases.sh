#!/bin/bash
# UMIG Confluence Upgrade - Database Restore Script
# Restores PostgreSQL databases from backup files
# 
# Author: gendev-deployment-ops-manager
# Version: 1.0
# Date: 2025-08-08

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_BASE_DIR="${SCRIPT_DIR}/../../backups"
RESTORE_TIMESTAMP=""
BACKUP_DIR=""
LOG_FILE=""
DRY_RUN=false
FORCE_RESTORE=false
RESTORE_FORMAT="custom"  # custom or sql

# Database configuration
POSTGRES_CONTAINER="umig_postgres"
POSTGRES_USER="umig_admin"
POSTGRES_PASSWORD="umig_secure_2024"
DATABASES=(
    "confluence"
    "umig_app_db"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Usage function
usage() {
    echo "Usage: $0 <backup_timestamp> [options]"
    echo ""
    echo "Arguments:"
    echo "  backup_timestamp    Timestamp of the backup to restore (format: YYYYMMDD_HHMMSS)"
    echo ""
    echo "Options:"
    echo "  --dry-run          Show what would be restored without actually doing it"
    echo "  --force            Force restore even if databases exist"
    echo "  --format FORMAT    Restore format: 'custom' (default) or 'sql'"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 20250808_143022"
    echo "  $0 20250808_143022 --dry-run"
    echo "  $0 20250808_143022 --force --format sql"
    exit 1
}

# Logging function
log() {
    local level="$1"
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Console output with colors
    case "$level" in
        "INFO")  echo -e "${BLUE}[INFO]${NC}  ${message}" ;;
        "WARN")  echo -e "${YELLOW}[WARN]${NC}  ${message}" ;;
        "ERROR") echo -e "${RED}[ERROR]${NC} ${message}" ;;
        "SUCCESS") echo -e "${GREEN}[SUCCESS]${NC} ${message}" ;;
        "DRY_RUN") echo -e "${CYAN}[DRY-RUN]${NC} ${message}" ;;
    esac
    
    # File output without colors (if log file exists)
    if [[ -f "${LOG_FILE}" ]]; then
        echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
    fi
}

# Error handler
error_exit() {
    local line_no="$1"
    local error_code="$2"
    log "ERROR" "Script failed at line ${line_no} with exit code ${error_code}"
    log "ERROR" "Database restore failed. Check ${LOG_FILE} for details."
    exit "${error_code}"
}

# Set up error handling
trap 'error_exit ${LINENO} $?' ERR

# Parse command line arguments
parse_arguments() {
    if [[ $# -eq 0 ]]; then
        echo "Error: No backup timestamp provided"
        usage
    fi
    
    RESTORE_TIMESTAMP="$1"
    shift
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            --force)
                FORCE_RESTORE=true
                shift
                ;;
            --format)
                RESTORE_FORMAT="$2"
                if [[ "${RESTORE_FORMAT}" != "custom" && "${RESTORE_FORMAT}" != "sql" ]]; then
                    echo "Error: Invalid format. Use 'custom' or 'sql'"
                    exit 1
                fi
                shift 2
                ;;
            --help)
                usage
                ;;
            *)
                echo "Error: Unknown option $1"
                usage
                ;;
        esac
    done
    
    # Validate timestamp format
    if [[ ! "${RESTORE_TIMESTAMP}" =~ ^[0-9]{8}_[0-9]{6}$ ]]; then
        log "ERROR" "Invalid timestamp format. Expected: YYYYMMDD_HHMMSS"
        exit 1
    fi
    
    BACKUP_DIR="${BACKUP_BASE_DIR}/${RESTORE_TIMESTAMP}"
    LOG_FILE="${BACKUP_DIR}/database_restore.log"
}

# Check if Podman is available
check_podman() {
    if ! command -v podman &> /dev/null; then
        log "ERROR" "Podman is not installed or not in PATH"
        exit 1
    fi
    log "INFO" "Podman version: $(podman --version)"
}

# Check if PostgreSQL container is running
check_postgres_container() {
    log "INFO" "Checking PostgreSQL container status..."
    
    if ! podman ps | grep -q "${POSTGRES_CONTAINER}"; then
        log "ERROR" "PostgreSQL container '${POSTGRES_CONTAINER}' is not running"
        log "INFO" "Please start the container before running restore"
        exit 1
    fi
    
    log "INFO" "PostgreSQL container is running"
    
    # Test connection
    if ! podman exec "${POSTGRES_CONTAINER}" pg_isready -U "${POSTGRES_USER}" > /dev/null 2>&1; then
        log "ERROR" "PostgreSQL is not ready to accept connections"
        exit 1
    fi
    
    log "INFO" "PostgreSQL is ready for restore"
}

# Validate backup directory and files
validate_backup() {
    log "INFO" "Validating backup directory and files..."
    
    # Check if backup directory exists
    if [[ ! -d "${BACKUP_DIR}" ]]; then
        log "ERROR" "Backup directory not found: ${BACKUP_DIR}"
        exit 1
    fi
    
    # Check if databases directory exists
    if [[ ! -d "${BACKUP_DIR}/databases" ]]; then
        log "ERROR" "Database backup directory not found: ${BACKUP_DIR}/databases"
        exit 1
    fi
    
    # Check if backup files exist based on format
    for db in "${DATABASES[@]}"; do
        local backup_file=""
        if [[ "${RESTORE_FORMAT}" == "custom" ]]; then
            backup_file="${BACKUP_DIR}/databases/${db}.backup"
        else
            backup_file="${BACKUP_DIR}/databases/${db}.sql.gz"
        fi
        
        if [[ ! -f "${backup_file}" ]]; then
            log "ERROR" "Backup file not found: ${backup_file}"
            exit 1
        fi
        log "INFO" "Found backup file: $(basename ${backup_file})"
    done
    
    # Check globals file
    if [[ -f "${BACKUP_DIR}/databases/globals.sql" ]]; then
        log "INFO" "Found global settings backup"
    else
        log "WARN" "Global settings backup not found"
    fi
    
    # Check manifest file if it exists
    if [[ -f "${BACKUP_DIR}/backup_manifest.sha256" ]]; then
        log "INFO" "Validating backup integrity..."
        cd "${BACKUP_DIR}"
        if sha256sum -c backup_manifest.sha256 --quiet; then
            log "SUCCESS" "Backup integrity verified"
        else
            log "ERROR" "Backup integrity check failed"
            exit 1
        fi
    else
        log "WARN" "No manifest file found, skipping integrity check"
    fi
    
    log "SUCCESS" "Backup validation completed"
}

# Check current database status
check_database_status() {
    log "INFO" "Checking current database status..."
    
    for db in "${DATABASES[@]}"; do
        local db_exists=$(podman exec "${POSTGRES_CONTAINER}" \
            psql -U "${POSTGRES_USER}" -tAc \
            "SELECT 1 FROM pg_database WHERE datname='${db}'" 2>/dev/null || echo "")
        
        if [[ "${db_exists}" == "1" ]]; then
            if [[ "${FORCE_RESTORE}" == "true" ]]; then
                log "WARN" "Database '${db}' exists but --force specified"
            else
                log "ERROR" "Database '${db}' already exists"
                log "ERROR" "Use --force to overwrite existing databases"
                exit 1
            fi
        else
            log "INFO" "Database '${db}' does not exist (good for restore)"
        fi
    done
}

# Stop applications that use databases
stop_applications() {
    local confluence_container="umig_confluence"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY_RUN" "Would stop Confluence container if running"
        return
    fi
    
    log "INFO" "Stopping applications that use these databases..."
    
    if podman ps | grep -q "${confluence_container}"; then
        log "INFO" "Stopping Confluence container: ${confluence_container}"
        podman stop "${confluence_container}" || log "WARN" "Failed to stop ${confluence_container}"
        echo "${confluence_container}" > "${BACKUP_DIR}/stopped_apps.txt"
        
        # Wait for container to stop
        log "INFO" "Waiting for application to stop completely..."
        sleep 10
    else
        log "INFO" "Confluence container is not running"
    fi
}

# Drop existing databases
drop_existing_databases() {
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY_RUN" "Would drop existing databases if they exist"
        return
    fi
    
    if [[ "${FORCE_RESTORE}" == "true" ]]; then
        log "INFO" "Dropping existing databases..."
        
        for db in "${DATABASES[@]}"; do
            local db_exists=$(podman exec "${POSTGRES_CONTAINER}" \
                psql -U "${POSTGRES_USER}" -tAc \
                "SELECT 1 FROM pg_database WHERE datname='${db}'" 2>/dev/null || echo "")
            
            if [[ "${db_exists}" == "1" ]]; then
                log "INFO" "Dropping database: ${db}"
                
                # Terminate active connections
                podman exec "${POSTGRES_CONTAINER}" \
                    psql -U "${POSTGRES_USER}" -c \
                    "SELECT pg_terminate_backend(pg_stat_activity.pid) FROM pg_stat_activity WHERE pg_stat_activity.datname = '${db}' AND pid <> pg_backend_pid();" \
                    >> "${LOG_FILE}" 2>&1 || true
                
                # Drop database
                podman exec "${POSTGRES_CONTAINER}" \
                    psql -U "${POSTGRES_USER}" -c "DROP DATABASE IF EXISTS \"${db}\";" \
                    >> "${LOG_FILE}" 2>&1
            fi
        done
    fi
}

# Restore global settings
restore_globals() {
    local globals_file="${BACKUP_DIR}/databases/globals.sql"
    
    if [[ ! -f "${globals_file}" ]]; then
        log "INFO" "No global settings to restore"
        return
    fi
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY_RUN" "Would restore global PostgreSQL settings"
        return
    fi
    
    log "INFO" "Restoring global PostgreSQL settings..."
    
    # Copy globals file to container
    podman cp "${globals_file}" "${POSTGRES_CONTAINER}:/tmp/globals.sql"
    
    # Restore globals
    podman exec "${POSTGRES_CONTAINER}" \
        psql -U "${POSTGRES_USER}" -f "/tmp/globals.sql" \
        >> "${LOG_FILE}" 2>&1 || {
        log "WARN" "Global settings restore encountered issues (this may be normal)"
    }
    
    # Clean up
    podman exec "${POSTGRES_CONTAINER}" rm -f "/tmp/globals.sql"
    
    log "SUCCESS" "Global settings restored"
}

# Restore database using custom format
restore_database_custom() {
    local db_name="$1"
    local backup_file="${BACKUP_DIR}/databases/${db_name}.backup"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY_RUN" "Would restore database ${db_name} from custom format backup"
        return
    fi
    
    log "INFO" "Restoring database ${db_name} from custom format..."
    
    # Copy backup file to container
    podman cp "${backup_file}" "${POSTGRES_CONTAINER}:/tmp/${db_name}.backup"
    
    # Restore using pg_restore
    podman exec "${POSTGRES_CONTAINER}" \
        pg_restore -U "${POSTGRES_USER}" \
        --verbose --clean --create \
        --if-exists \
        "/tmp/${db_name}.backup" \
        >> "${LOG_FILE}" 2>&1
    
    # Clean up temp file
    podman exec "${POSTGRES_CONTAINER}" rm -f "/tmp/${db_name}.backup"
    
    # Verify database was restored
    local db_exists=$(podman exec "${POSTGRES_CONTAINER}" \
        psql -U "${POSTGRES_USER}" -tAc \
        "SELECT 1 FROM pg_database WHERE datname='${db_name}'" 2>/dev/null || echo "")
    
    if [[ "${db_exists}" == "1" ]]; then
        log "SUCCESS" "Database ${db_name} restored successfully (custom format)"
    else
        log "ERROR" "Database ${db_name} restore failed"
        exit 1
    fi
}

# Restore database using SQL format
restore_database_sql() {
    local db_name="$1"
    local backup_file="${BACKUP_DIR}/databases/${db_name}.sql.gz"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY_RUN" "Would restore database ${db_name} from SQL format backup"
        return
    fi
    
    log "INFO" "Restoring database ${db_name} from SQL format..."
    
    # Decompress and restore directly
    gunzip -c "${backup_file}" | podman exec -i "${POSTGRES_CONTAINER}" \
        psql -U "${POSTGRES_USER}" \
        >> "${LOG_FILE}" 2>&1
    
    # Verify database was restored
    local db_exists=$(podman exec "${POSTGRES_CONTAINER}" \
        psql -U "${POSTGRES_USER}" -tAc \
        "SELECT 1 FROM pg_database WHERE datname='${db_name}'" 2>/dev/null || echo "")
    
    if [[ "${db_exists}" == "1" ]]; then
        log "SUCCESS" "Database ${db_name} restored successfully (SQL format)"
    else
        log "ERROR" "Database ${db_name} restore failed"
        exit 1
    fi
}

# Get restored database statistics
get_restored_db_stats() {
    local db_name="$1"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        return
    fi
    
    log "INFO" "Gathering statistics for restored database: ${db_name}"
    
    # Get database size
    local db_size=$(podman exec "${POSTGRES_CONTAINER}" \
        psql -U "${POSTGRES_USER}" -d "${db_name}" -tAc \
        "SELECT pg_size_pretty(pg_database_size('${db_name}'))" 2>/dev/null || echo "Unknown")
    
    # Get table count
    local table_count=$(podman exec "${POSTGRES_CONTAINER}" \
        psql -U "${POSTGRES_USER}" -d "${db_name}" -tAc \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null || echo "0")
    
    log "INFO" "Restored database ${db_name} - Size: ${db_size}, Tables: ${table_count}"
    
    # Save restore statistics
    cat >> "${BACKUP_DIR}/database_restore_summary.txt" << EOF

${db_name} Restore Results:
- Database Size: ${db_size}
- Table Count: ${table_count}
- Restore Format: ${RESTORE_FORMAT}
- Restore Time: $(date)
EOF
}

# Main restore function
perform_restore() {
    log "INFO" "Starting database restore process..."
    
    stop_applications
    drop_existing_databases
    restore_globals
    
    # Restore each database
    for db in "${DATABASES[@]}"; do
        if [[ "${RESTORE_FORMAT}" == "custom" ]]; then
            restore_database_custom "${db}"
        else
            restore_database_sql "${db}"
        fi
        get_restored_db_stats "${db}"
    done
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        log "SUCCESS" "All databases restored successfully"
    else
        log "DRY_RUN" "Dry run completed - no actual restore performed"
    fi
}

# Restart applications
restart_applications() {
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY_RUN" "Would restart previously stopped applications"
        return
    fi
    
    local stopped_file="${BACKUP_DIR}/stopped_apps.txt"
    if [[ -f "${stopped_file}" ]]; then
        log "INFO" "Restarting previously stopped applications..."
        
        while IFS= read -r app; do
            log "INFO" "Starting application: ${app}"
            podman start "${app}" || log "WARN" "Failed to start ${app}"
        done < "${stopped_file}"
        
        # Clean up the file
        rm -f "${stopped_file}"
        
        # Wait for applications to start
        log "INFO" "Waiting for applications to start..."
        sleep 15
    else
        log "INFO" "No applications to restart"
    fi
}

# Generate restore summary
generate_summary() {
    local mode="COMPLETED"
    if [[ "${DRY_RUN}" == "true" ]]; then
        mode="DRY RUN COMPLETED"
    fi
    
    cat > "${BACKUP_DIR}/database_restore_summary.txt" << EOF
UMIG Confluence Upgrade - Database Restore Summary
=================================================
Restore Date: $(date)
Backup Timestamp: ${RESTORE_TIMESTAMP}
Restore Mode: ${mode}
Restore Format: ${RESTORE_FORMAT}
Script Version: 1.0

Databases Restored:
EOF
    
    for db in "${DATABASES[@]}"; do
        echo "- ${db}" >> "${BACKUP_DIR}/database_restore_summary.txt"
    done
    
    cat >> "${BACKUP_DIR}/database_restore_summary.txt" << EOF

Options Used:
- Dry Run: ${DRY_RUN}
- Force Restore: ${FORCE_RESTORE}
- Restore Format: ${RESTORE_FORMAT}

Log File: ${LOG_FILE}
Status: ${mode}

Post-Restore Verification:
- Verify applications can connect to databases
- Check data integrity and completeness
- Monitor application logs for any issues
EOF
    
    log "INFO" "Restore summary written to database_restore_summary.txt"
    log "SUCCESS" "Database restore ${mode,,}!"
}

# Main execution
main() {
    echo "==============================================="
    echo "UMIG Confluence Upgrade - Database Restore"
    echo "==============================================="
    echo "Restore Timestamp: ${RESTORE_TIMESTAMP}"
    echo "Backup Directory: ${BACKUP_DIR}"
    echo "Restore Format: ${RESTORE_FORMAT}"
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo "Mode: DRY RUN (no actual changes)"
    fi
    if [[ "${FORCE_RESTORE}" == "true" ]]; then
        echo "Mode: FORCE (will overwrite existing databases)"
    fi
    echo "==============================================="
    echo ""
    
    check_podman
    check_postgres_container
    validate_backup
    check_database_status
    perform_restore
    restart_applications
    generate_summary
    
    echo ""
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo "Dry run completed! No actual restore was performed."
    else
        echo "Database restore completed successfully!"
        echo "Please verify that applications can connect and function properly."
    fi
    echo "Log file: ${LOG_FILE}"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_arguments "$@"
    main
fi