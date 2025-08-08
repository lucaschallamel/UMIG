#!/bin/bash
# UMIG Confluence Upgrade - Master Backup Script
# Orchestrates complete system backup (volumes + databases)
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

LOG_FILE="${BACKUP_DIR}/master_backup.log"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
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
        "STEP") echo -e "${CYAN}[STEP]${NC} ${message}" ;;
    esac
    
    # File output without colors
    if [[ -f "${LOG_FILE}" ]]; then
        echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
    fi
}

# Error handler
error_exit() {
    local line_no="$1"
    local error_code="$2"
    log "ERROR" "Master backup script failed at line ${line_no} with exit code ${error_code}"
    log "ERROR" "Complete backup failed. Check ${LOG_FILE} for details."
    
    # Cleanup incomplete backup
    if [[ -d "${BACKUP_DIR}" ]]; then
        log "INFO" "Cleaning up incomplete backup directory..."
        rm -rf "${BACKUP_DIR}"
    fi
    
    exit "${error_code}"
}

# Set up error handling
trap 'error_exit ${LINENO} $?' ERR

# Display banner
show_banner() {
    echo -e "${BOLD}${CYAN}"
    echo "=================================================================="
    echo "   UMIG CONFLUENCE UPGRADE - MASTER BACKUP SYSTEM"
    echo "=================================================================="
    echo -e "${NC}"
    echo "Backup Timestamp: ${TIMESTAMP}"
    echo "Backup Directory: ${BACKUP_DIR}"
    echo "Script Version: 1.0"
    echo ""
    echo "This script will perform a complete backup of:"
    echo "• Podman volumes (confluence_data, postgres_data)"
    echo "• PostgreSQL databases (confluence, umig_app_db)"
    echo "• Container configurations and metadata"
    echo ""
    echo "=================================================================="
    echo ""
}

# Pre-flight checks
preflight_checks() {
    log "STEP" "Performing pre-flight checks..."
    
    # Check if Podman is available
    if ! command -v podman &> /dev/null; then
        log "ERROR" "Podman is not installed or not in PATH"
        exit 1
    fi
    
    # Check if backup scripts exist
    local scripts=("backup-volumes.sh" "backup-databases.sh")
    for script in "${scripts[@]}"; do
        if [[ ! -f "${SCRIPT_DIR}/${script}" ]]; then
            log "ERROR" "Required script not found: ${script}"
            exit 1
        fi
        
        if [[ ! -x "${SCRIPT_DIR}/${script}" ]]; then
            log "INFO" "Making ${script} executable..."
            chmod +x "${SCRIPT_DIR}/${script}"
        fi
    done
    
    # Check available disk space
    local available_space_kb=$(df "${BACKUP_BASE_DIR}" 2>/dev/null | awk 'NR==2 {print $4}' || echo "0")
    local available_space_gb=$((available_space_kb / 1024 / 1024))
    
    if [[ ${available_space_gb} -lt 10 ]]; then
        log "WARN" "Available disk space is less than 10GB (${available_space_gb}GB)"
        log "WARN" "Backup may fail if insufficient space"
    else
        log "INFO" "Available disk space: ${available_space_gb}GB"
    fi
    
    # Check if containers are running
    local containers=("umig_confluence" "umig_postgres")
    for container in "${containers[@]}"; do
        if ! podman ps | grep -q "${container}"; then
            log "ERROR" "Container '${container}' is not running"
            log "ERROR" "Please start all containers before backup"
            exit 1
        fi
    done
    
    log "SUCCESS" "Pre-flight checks completed"
}

# Create master backup directory
setup_master_backup_dir() {
    log "STEP" "Setting up master backup directory..."
    
    # Create the main backup directory
    mkdir -p "${BACKUP_DIR}"
    
    # Create log file
    touch "${LOG_FILE}"
    
    # Create master backup info file
    cat > "${BACKUP_DIR}/master_backup_info.txt" << EOF
UMIG Confluence Upgrade - Master Backup
=======================================
Backup Date: $(date)
Backup Timestamp: ${TIMESTAMP}
Script Version: 1.0
Hostname: $(hostname)
System: $(uname -a)

Environment Information:
- Podman Version: $(podman --version)
- Available Space: $(df -h "${BACKUP_BASE_DIR}" | awk 'NR==2 {print $4}')

Backup Components:
- Podman Volumes (confluence_data, postgres_data)
- PostgreSQL Databases (confluence, umig_app_db)
- Container Configurations
- System Metadata

Backup Location: ${BACKUP_DIR}
Log File: ${LOG_FILE}

Status: IN PROGRESS
Started: $(date)
EOF
    
    log "SUCCESS" "Master backup directory created: ${BACKUP_DIR}"
}

# Backup container configurations
backup_container_configs() {
    log "STEP" "Backing up container configurations..."
    
    local config_dir="${BACKUP_DIR}/container_configs"
    mkdir -p "${config_dir}"
    
    # Export container configurations
    local containers=("umig_confluence" "umig_postgres")
    
    for container in "${containers[@]}"; do
        log "INFO" "Exporting configuration for container: ${container}"
        
        # Container inspection
        podman inspect "${container}" > "${config_dir}/${container}_inspect.json" 2>>"${LOG_FILE}" || {
            log "WARN" "Could not inspect container: ${container}"
        }
        
        # Container logs (last 1000 lines)
        podman logs --tail 1000 "${container}" > "${config_dir}/${container}_logs.txt" 2>>"${LOG_FILE}" || {
            log "WARN" "Could not get logs for container: ${container}"
        }
    done
    
    # Export volume information
    podman volume ls --format json > "${config_dir}/volumes_list.json" 2>>"${LOG_FILE}" || {
        log "WARN" "Could not list volumes"
    }
    
    # Export network information
    podman network ls --format json > "${config_dir}/networks_list.json" 2>>"${LOG_FILE}" || {
        log "WARN" "Could not list networks"
    }
    
    # Export system information
    podman system info > "${config_dir}/system_info.txt" 2>>"${LOG_FILE}" || {
        log "WARN" "Could not get system info"
    }
    
    log "SUCCESS" "Container configurations backed up"
}

# Execute volume backup
execute_volume_backup() {
    log "STEP" "Starting volume backup process..."
    
    # Run the volume backup script with the same timestamp
    TIMESTAMP="${TIMESTAMP}" "${SCRIPT_DIR}/backup-volumes.sh" || {
        log "ERROR" "Volume backup failed"
        exit 1
    }
    
    # Move volume backup contents to our master backup directory
    local volume_backup_dir="${BACKUP_BASE_DIR}/${TIMESTAMP}"
    if [[ -d "${volume_backup_dir}/volumes" ]]; then
        cp -r "${volume_backup_dir}/volumes" "${BACKUP_DIR}/"
        cp "${volume_backup_dir}/volume_backup.log" "${BACKUP_DIR}/"
        
        # Update manifest
        if [[ -f "${volume_backup_dir}/backup_manifest.sha256" ]]; then
            cat "${volume_backup_dir}/backup_manifest.sha256" >> "${BACKUP_DIR}/master_manifest.sha256"
        fi
        
        log "SUCCESS" "Volume backup completed and integrated"
    else
        log "ERROR" "Volume backup directory not found"
        exit 1
    fi
}

# Execute database backup
execute_database_backup() {
    log "STEP" "Starting database backup process..."
    
    # Run the database backup script with the same timestamp
    TIMESTAMP="${TIMESTAMP}" "${SCRIPT_DIR}/backup-databases.sh" || {
        log "ERROR" "Database backup failed"
        exit 1
    }
    
    # Move database backup contents to our master backup directory
    local db_backup_dir="${BACKUP_BASE_DIR}/${TIMESTAMP}"
    if [[ -d "${db_backup_dir}/databases" ]]; then
        cp -r "${db_backup_dir}/databases" "${BACKUP_DIR}/"
        cp -r "${db_backup_dir}/schemas" "${BACKUP_DIR}/"
        cp -r "${db_backup_dir}/metadata" "${BACKUP_DIR}/"
        cp "${db_backup_dir}/database_backup.log" "${BACKUP_DIR}/"
        
        # Update manifest
        if [[ -f "${db_backup_dir}/backup_manifest.sha256" ]]; then
            cat "${db_backup_dir}/backup_manifest.sha256" >> "${BACKUP_DIR}/master_manifest.sha256"
        fi
        
        log "SUCCESS" "Database backup completed and integrated"
    else
        log "ERROR" "Database backup directory not found"
        exit 1
    fi
}

# Create final manifest and verification
create_final_manifest() {
    log "STEP" "Creating final backup manifest..."
    
    cd "${BACKUP_DIR}"
    
    # Create comprehensive manifest
    find . -type f -exec sha256sum {} \; > "complete_manifest.sha256"
    
    # Create backup tree structure
    tree . > "backup_structure.txt" 2>/dev/null || {
        find . -type d | sort > "backup_structure.txt"
    }
    
    # Update master backup info with completion status
    cat >> "${BACKUP_DIR}/master_backup_info.txt" << EOF

Status: COMPLETED SUCCESSFULLY
Finished: $(date)
Total Size: $(du -sh . | cut -f1)

Backup Structure:
$(cat backup_structure.txt)

Files and Checksums:
$(wc -l complete_manifest.sha256 | cut -d' ' -f1) files backed up with checksums

Restore Instructions:
1. For complete restore: ./restore-all.sh ${TIMESTAMP}
2. For volumes only: ./restore-volumes.sh ${TIMESTAMP}
3. For databases only: ./restore-databases.sh ${TIMESTAMP}
4. For verification: ./verify-backup.sh ${TIMESTAMP}
EOF
    
    log "SUCCESS" "Final manifest created"
}

# Display backup summary
show_summary() {
    log "STEP" "Generating backup summary..."
    
    local total_size=$(du -sh "${BACKUP_DIR}" | cut -f1)
    local file_count=$(find "${BACKUP_DIR}" -type f | wc -l)
    local duration=$(($(date +%s) - ${start_time}))
    local duration_formatted=$(printf '%02d:%02d:%02d' $((duration/3600)) $((duration%3600/60)) $((duration%60)))
    
    echo ""
    echo -e "${BOLD}${GREEN}"
    echo "=================================================================="
    echo "                BACKUP COMPLETED SUCCESSFULLY"
    echo "=================================================================="
    echo -e "${NC}"
    echo "Backup Summary:"
    echo "• Total Size: ${total_size}"
    echo "• Files Backed Up: ${file_count}"
    echo "• Duration: ${duration_formatted}"
    echo "• Location: ${BACKUP_DIR}"
    echo ""
    echo "Components Backed Up:"
    echo "• ✅ Podman Volumes (confluence_data, postgres_data)"
    echo "• ✅ PostgreSQL Databases (confluence, umig_app_db)" 
    echo "• ✅ Container Configurations"
    echo "• ✅ System Metadata"
    echo ""
    echo "Next Steps:"
    echo "• Verify backup: ./verify-backup.sh ${TIMESTAMP}"
    echo "• Test restore: ./restore-all.sh ${TIMESTAMP} --dry-run"
    echo ""
    echo "Log Files:"
    echo "• Master Log: ${LOG_FILE}"
    echo "• Volume Log: ${BACKUP_DIR}/volume_backup.log"
    echo "• Database Log: ${BACKUP_DIR}/database_backup.log"
    echo ""
    echo -e "${BOLD}${GREEN}Backup completed successfully!${NC}"
    echo "=================================================================="
}

# Cleanup function
cleanup() {
    # Remove duplicate backup directories created by individual scripts
    local timestamp_dirs=$(find "${BACKUP_BASE_DIR}" -maxdepth 1 -name "${TIMESTAMP}" -not -path "${BACKUP_DIR}")
    for dir in ${timestamp_dirs}; do
        if [[ "${dir}" != "${BACKUP_DIR}" ]] && [[ -d "${dir}" ]]; then
            log "INFO" "Cleaning up duplicate directory: ${dir}"
            rm -rf "${dir}"
        fi
    done
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    show_banner
    
    preflight_checks
    setup_master_backup_dir
    backup_container_configs
    execute_volume_backup
    execute_database_backup
    create_final_manifest
    cleanup
    show_summary
    
    log "SUCCESS" "Master backup process completed successfully!"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi