#!/bin/bash
# UMIG Confluence Upgrade - Volume Backup Script
# Backs up Podman named volumes using tar archives
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
mkdir -p "${BACKUP_DIR}/volumes"
mkdir -p "${BACKUP_DIR}/metadata"

LOG_FILE="${BACKUP_DIR}/volume_backup.log"

# Volume configuration
VOLUMES=(
    "local-dev-setup_confluence_data"
    "local-dev-setup_postgres_data"
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
    log "ERROR" "Volume backup failed. Check ${LOG_FILE} for details."
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

# Check if volumes exist
check_volumes() {
    log "INFO" "Checking if volumes exist..."
    for volume in "${VOLUMES[@]}"; do
        if ! podman volume exists "${volume}"; then
            log "ERROR" "Volume '${volume}' does not exist"
            exit 1
        fi
        log "INFO" "Volume '${volume}' found"
    done
}

# Create backup directory structure
setup_backup_dir() {
    log "INFO" "Creating backup directory: ${BACKUP_DIR}"
    mkdir -p "${BACKUP_DIR}"
    
    # Create subdirectories
    mkdir -p "${BACKUP_DIR}/volumes"
    mkdir -p "${BACKUP_DIR}/metadata"
    
    # Create backup info file
    cat > "${BACKUP_DIR}/backup_info.txt" << EOF
UMIG Confluence Upgrade - Volume Backup
========================================
Backup Date: $(date)
Backup Type: Podman Volumes
Script Version: 1.0
Hostname: $(hostname)
Podman Version: $(podman --version)

Volumes Backed Up:
EOF
    
    for volume in "${VOLUMES[@]}"; do
        echo "- ${volume}" >> "${BACKUP_DIR}/backup_info.txt"
    done
}

# Backup a single volume
backup_volume() {
    local volume_name="$1"
    local backup_file="${BACKUP_DIR}/volumes/${volume_name}.tar.gz"
    
    log "INFO" "Backing up volume: ${volume_name}"
    
    # Get volume info
    local volume_info=$(podman volume inspect "${volume_name}")
    echo "${volume_info}" > "${BACKUP_DIR}/metadata/${volume_name}_info.json"
    
    # Create temporary container to access volume
    log "INFO" "Creating temporary container for ${volume_name}..."
    local temp_container="backup_temp_$(date +%s)"
    
    # Mount volume and create tar archive
    podman run --rm \
        --name "${temp_container}" \
        --volume "${volume_name}:/data:ro" \
        --volume "${BACKUP_DIR}/volumes:/backup" \
        docker.io/alpine:latest \
        sh -c "cd /data && tar -czf /backup/${volume_name}.tar.gz . && echo 'Volume ${volume_name} backup completed'" \
        >> "${LOG_FILE}" 2>&1
    
    # Verify backup file was created
    if [[ ! -f "${backup_file}" ]]; then
        log "ERROR" "Backup file not created: ${backup_file}"
        exit 1
    fi
    
    # Get backup size
    local backup_size=$(du -h "${backup_file}" | cut -f1)
    log "SUCCESS" "Volume ${volume_name} backed up successfully (${backup_size})"
    
    # Record backup details
    cat >> "${BACKUP_DIR}/backup_info.txt" << EOF

${volume_name} Details:
- Backup File: volumes/${volume_name}.tar.gz
- Backup Size: ${backup_size}
- Backup Time: $(date)
EOF
}

# Main backup function
perform_backup() {
    log "INFO" "Starting volume backup process..."
    
    for volume in "${VOLUMES[@]}"; do
        backup_volume "${volume}"
    done
    
    # Create manifest file
    cd "${BACKUP_DIR}"
    find . -type f -exec sha256sum {} \; > backup_manifest.sha256
    
    log "SUCCESS" "All volumes backed up successfully"
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

Restore Instructions:
To restore these volumes, use: ./restore-volumes.sh ${TIMESTAMP}
EOF
    
    log "INFO" "Backup summary written to backup_info.txt"
    log "SUCCESS" "Volume backup completed successfully!"
    log "INFO" "Total backup size: ${total_size}"
}

# Cleanup function
cleanup() {
    # Remove any temporary files if they exist
    log "INFO" "Cleaning up temporary resources..."
}

# Main execution
main() {
    echo "================================================="
    echo "UMIG Confluence Upgrade - Volume Backup Script"
    echo "================================================="
    echo "Timestamp: $(date)"
    echo "Backup Directory: ${BACKUP_DIR}"
    echo "================================================="
    
    check_podman
    check_volumes
    setup_backup_dir
    perform_backup
    generate_summary
    cleanup
    
    echo ""
    echo "Backup completed successfully!"
    echo "Location: ${BACKUP_DIR}"
    echo "Log file: ${LOG_FILE}"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi