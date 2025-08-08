#!/bin/bash
# UMIG Confluence Upgrade - Database Backup Script
# Backs up PostgreSQL databases using pg_dump
# 
# Author: gendev-deployment-ops-manager
# Version: 1.0
# Date: 2025-08-08

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_BASE_DIR="${SCRIPT_DIR}/../../backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="${BACKUP_BASE_DIR}/${TIMESTAMP}"

# Create backup directory structure
mkdir -p "${BACKUP_DIR}"

LOG_FILE="${BACKUP_DIR}/database_backup.log"

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
NC='\033[0m' # No Color

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
    esac
    
    # File output without colors
    echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
}

# Error handler
error_exit() {
    local line_no="$1"
    local error_code="$2"
    log "ERROR" "Script failed at line ${line_no} with exit code ${error_code}"
    log "ERROR" "Database backup failed. Check ${LOG_FILE} for details."
    exit "${error_code}"
}

# Set up error handling
trap 'error_exit ${LINENO} $?' ERR

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
        log "INFO" "Please start the container before running backup"
        exit 1
    fi
    
    log "INFO" "PostgreSQL container is running"
    
    # Test connection
    if ! podman exec "${POSTGRES_CONTAINER}" pg_isready -U "${POSTGRES_USER}" > /dev/null 2>&1; then
        log "ERROR" "PostgreSQL is not ready to accept connections"
        exit 1
    fi
    
    log "INFO" "PostgreSQL is ready for backup"
}

# Check if databases exist
check_databases() {
    log "INFO" "Checking if databases exist..."
    
    for db in "${DATABASES[@]}"; do
        local db_exists=$(podman exec "${POSTGRES_CONTAINER}" \
            psql -U "${POSTGRES_USER}" -tAc \
            "SELECT 1 FROM pg_database WHERE datname='${db}'" 2>/dev/null || echo "")
        
        if [[ "${db_exists}" != "1" ]]; then
            log "ERROR" "Database '${db}' does not exist"
            exit 1
        fi
        log "INFO" "Database '${db}' found"
    done
}

# Create backup directory structure
setup_backup_dir() {
    log "INFO" "Creating backup directory: ${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}"
    
    # Create subdirectories
    mkdir -p "${BACKUP_DIR}/databases"
    mkdir -p "${BACKUP_DIR}/schemas"
    mkdir -p "${BACKUP_DIR}/metadata"
    
    # Create backup info file
    cat > "${BACKUP_DIR}/backup_info.txt" << EOF
UMIG Confluence Upgrade - Database Backup
=========================================
Backup Date: $(date)
Backup Type: PostgreSQL Databases
Script Version: 1.0
Hostname: $(hostname)
PostgreSQL Version: $(podman exec "${POSTGRES_CONTAINER}" postgres --version)

Databases Backed Up:
EOF
    
    for db in "${DATABASES[@]}"; do
        echo "- ${db}" >> "${BACKUP_DIR}/backup_info.txt"
    done
}

# Get database statistics
get_db_stats() {
    local db_name="$1"
    
    log "INFO" "Gathering statistics for database: ${db_name}"
    
    # Get database size
    local db_size=$(podman exec "${POSTGRES_CONTAINER}" \
        psql -U "${POSTGRES_USER}" -d "${db_name}" -tAc \
        "SELECT pg_size_pretty(pg_database_size('${db_name}'))")
    
    # Get table count
    local table_count=$(podman exec "${POSTGRES_CONTAINER}" \
        psql -U "${POSTGRES_USER}" -d "${db_name}" -tAc \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
    
    # Get record counts for major tables (if any)
    local record_info=""
    if [[ "${db_name}" == "umig_app_db" ]]; then
        record_info=$(podman exec "${POSTGRES_CONTAINER}" \
            psql -U "${POSTGRES_USER}" -d "${db_name}" -tAc \
            "SELECT 
                'migrations: ' || COUNT(*) || E'\\n' ||
                'iterations: ' || (SELECT COUNT(*) FROM iterations_master) || E'\\n' ||
                'plans: ' || (SELECT COUNT(*) FROM plans_master) || E'\\n' ||
                'sequences: ' || (SELECT COUNT(*) FROM sequences_master) || E'\\n' ||
                'phases: ' || (SELECT COUNT(*) FROM phases_master) || E'\\n' ||
                'steps: ' || (SELECT COUNT(*) FROM steps_master)
             FROM migrations_master" 2>/dev/null || echo "Record counts not available")
    fi
    
    # Save metadata
    cat > "${BACKUP_DIR}/metadata/${db_name}_stats.txt" << EOF
Database: ${db_name}
Size: ${db_size}
Tables: ${table_count}
Backup Time: $(date)

${record_info}
EOF
    
    log "INFO" "Database ${db_name} - Size: ${db_size}, Tables: ${table_count}"
}

# Backup database schema only
backup_schema() {
    local db_name="$1"
    local schema_file="${BACKUP_DIR}/schemas/${db_name}_schema.sql"
    
    log "INFO" "Backing up schema for database: ${db_name}"
    
    podman exec "${POSTGRES_CONTAINER}" \
        pg_dump -U "${POSTGRES_USER}" -d "${db_name}" \
        --schema-only --verbose \
        > "${schema_file}" 2>>"${LOG_FILE}"
    
    # Verify schema file
    if [[ ! -s "${schema_file}" ]]; then
        log "ERROR" "Schema backup failed for ${db_name}"
        exit 1
    fi
    
    local schema_size=$(du -h "${schema_file}" | cut -f1)
    log "SUCCESS" "Schema backup completed for ${db_name} (${schema_size})"
}

# Backup database data
backup_database() {
    local db_name="$1"
    local backup_file="${BACKUP_DIR}/databases/${db_name}.sql"
    local compressed_file="${BACKUP_DIR}/databases/${db_name}.sql.gz"
    
    log "INFO" "Backing up database: ${db_name}"
    
    # Get database statistics first
    get_db_stats "${db_name}"
    
    # Create SQL dump with custom format for better compression and faster restore
    podman exec "${POSTGRES_CONTAINER}" \
        pg_dump -U "${POSTGRES_USER}" -d "${db_name}" \
        --verbose --clean --if-exists --create \
        --format=custom --compress=9 \
        --file="/tmp/${db_name}.backup" \
        2>>"${LOG_FILE}"
    
    # Copy the backup file from container to host
    podman cp "${POSTGRES_CONTAINER}:/tmp/${db_name}.backup" "${BACKUP_DIR}/databases/${db_name}.backup"
    
    # Also create plain SQL for emergency restore
    podman exec "${POSTGRES_CONTAINER}" \
        pg_dump -U "${POSTGRES_USER}" -d "${db_name}" \
        --verbose --clean --if-exists --create \
        > "${backup_file}" 2>>"${LOG_FILE}"
    
    # Compress the SQL file
    gzip "${backup_file}"
    
    # Clean up temp file in container
    podman exec "${POSTGRES_CONTAINER}" rm -f "/tmp/${db_name}.backup"
    
    # Verify backup files
    if [[ ! -f "${BACKUP_DIR}/databases/${db_name}.backup" ]] || [[ ! -f "${compressed_file}" ]]; then
        log "ERROR" "Backup failed for database ${db_name}"
        exit 1
    fi
    
    # Get backup sizes
    local custom_size=$(du -h "${BACKUP_DIR}/databases/${db_name}.backup" | cut -f1)
    local sql_size=$(du -h "${compressed_file}" | cut -f1)
    
    log "SUCCESS" "Database ${db_name} backed up successfully"
    log "INFO" "  Custom format: ${custom_size}"
    log "INFO" "  SQL format (compressed): ${sql_size}"
    
    # Record backup details
    cat >> "${BACKUP_DIR}/backup_info.txt" << EOF

${db_name} Details:
- Custom Backup: databases/${db_name}.backup (${custom_size})
- SQL Backup: databases/${db_name}.sql.gz (${sql_size})
- Schema Only: schemas/${db_name}_schema.sql
- Statistics: metadata/${db_name}_stats.txt
- Backup Time: $(date)
EOF
}

# Backup global PostgreSQL settings
backup_globals() {
    log "INFO" "Backing up PostgreSQL global settings..."
    
    local globals_file="${BACKUP_DIR}/databases/globals.sql"
    
    podman exec "${POSTGRES_CONTAINER}" \
        pg_dumpall -U "${POSTGRES_USER}" --globals-only \
        > "${globals_file}" 2>>"${LOG_FILE}"
    
    if [[ ! -s "${globals_file}" ]]; then
        log "WARN" "Global settings backup may be incomplete"
    else
        local globals_size=$(du -h "${globals_file}" | cut -f1)
        log "SUCCESS" "Global settings backed up (${globals_size})"
    fi
}

# Main backup function
perform_backup() {
    log "INFO" "Starting database backup process..."
    
    # Backup global settings first
    backup_globals
    
    # Backup each database
    for db in "${DATABASES[@]}"; do
        backup_schema "${db}"
        backup_database "${db}"
    done
    
    # Create manifest file
    cd "${BACKUP_DIR}"
    find . -type f -exec sha256sum {} \; > backup_manifest.sha256
    
    log "SUCCESS" "All databases backed up successfully"
    log "INFO" "Backup location: ${BACKUP_DIR}"
    log "INFO" "Manifest file created for integrity verification"
}

# Generate backup summary
generate_summary() {
    local total_size=$(du -sh "${BACKUP_DIR}" | cut -f1)
    
    cat >> "${BACKUP_DIR}/backup_info.txt" << EOF

Backup Summary:
- Total Size: ${total_size}
- Backup Location: ${BACKUP_DIR}
- Log File: ${LOG_FILE}
- Manifest File: backup_manifest.sha256

Backup Files:
- Custom Format: Fast restore, compressed, includes schema and data
- SQL Format: Emergency restore, widely compatible
- Schema Only: Structure only for reference
- Globals: PostgreSQL users, roles, and settings

Restore Instructions:
To restore these databases, use: ./restore-databases.sh ${TIMESTAMP}
EOF
    
    log "INFO" "Backup summary written to backup_info.txt"
    log "SUCCESS" "Database backup completed successfully!"
    log "INFO" "Total backup size: ${total_size}"
}

# Main execution
main() {
    echo "==================================================="
    echo "UMIG Confluence Upgrade - Database Backup Script"
    echo "==================================================="
    echo "Timestamp: $(date)"
    echo "Backup Directory: ${BACKUP_DIR}"
    echo "==================================================="
    
    check_podman
    check_postgres_container
    check_databases
    setup_backup_dir
    perform_backup
    generate_summary
    
    echo ""
    echo "Database backup completed successfully!"
    echo "Location: ${BACKUP_DIR}"
    echo "Log file: ${LOG_FILE}"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi