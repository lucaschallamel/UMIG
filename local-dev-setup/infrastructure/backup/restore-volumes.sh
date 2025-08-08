#!/bin/bash
# UMIG Confluence Upgrade - Volume Restore Script
# Restores Podman named volumes from tar archives
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

# Volume configuration
VOLUMES=(
    "confluence_data"
    "postgres_data"
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
    echo "  --force            Force restore even if volumes exist"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 20250808_143022"
    echo "  $0 20250808_143022 --dry-run"
    echo "  $0 20250808_143022 --force"
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
    log "ERROR" "Volume restore failed. Check ${LOG_FILE} for details."
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
    LOG_FILE="${BACKUP_DIR}/volume_restore.log"
}

# Check if Podman is available
check_podman() {
    if ! command -v podman &> /dev/null; then
        log "ERROR" "Podman is not installed or not in PATH"
        exit 1
    fi
    log "INFO" "Podman version: $(podman --version)"
}

# Validate backup directory and files
validate_backup() {
    log "INFO" "Validating backup directory and files..."
    
    # Check if backup directory exists
    if [[ ! -d "${BACKUP_DIR}" ]]; then
        log "ERROR" "Backup directory not found: ${BACKUP_DIR}"
        exit 1
    fi
    
    # Check if volumes directory exists
    if [[ ! -d "${BACKUP_DIR}/volumes" ]]; then
        log "ERROR" "Volumes backup directory not found: ${BACKUP_DIR}/volumes"
        exit 1
    fi
    
    # Check if all volume backup files exist
    for volume in "${VOLUMES[@]}"; do
        local backup_file="${BACKUP_DIR}/volumes/${volume}.tar.gz"
        if [[ ! -f "${backup_file}" ]]; then
            log "ERROR" "Backup file not found: ${backup_file}"
            exit 1
        fi
        log "INFO" "Found backup file: ${volume}.tar.gz"
    done
    
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

# Check current volume status
check_volume_status() {
    log "INFO" "Checking current volume status..."
    
    for volume in "${VOLUMES[@]}"; do
        if podman volume exists "${volume}"; then
            if [[ "${FORCE_RESTORE}" == "true" ]]; then
                log "WARN" "Volume '${volume}' exists but --force specified"
            else
                log "ERROR" "Volume '${volume}' already exists"
                log "ERROR" "Use --force to overwrite existing volumes"
                exit 1
            fi
        else
            log "INFO" "Volume '${volume}' does not exist (good for restore)"
        fi
    done
}

# Stop containers that use the volumes
stop_containers() {
    local containers=("umig_confluence" "umig_postgres")
    local stopped_containers=()
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY_RUN" "Would stop containers: ${containers[*]}"
        return
    fi
    
    log "INFO" "Stopping containers that use these volumes..."
    
    for container in "${containers[@]}"; do
        if podman ps | grep -q "${container}"; then
            log "INFO" "Stopping container: ${container}"
            podman stop "${container}" || log "WARN" "Failed to stop ${container}"
            stopped_containers+=("${container}")
        else
            log "INFO" "Container ${container} is not running"
        fi
    done
    
    # Wait for containers to stop
    if [[ ${#stopped_containers[@]} -gt 0 ]]; then
        log "INFO" "Waiting for containers to stop completely..."
        sleep 5
    fi
    
    # Save list of stopped containers for later restart
    if [[ ${#stopped_containers[@]} -gt 0 ]]; then
        printf '%s\n' "${stopped_containers[@]}" > "${BACKUP_DIR}/stopped_containers.txt"
    fi
}

# Remove existing volumes
remove_existing_volumes() {
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY_RUN" "Would remove existing volumes if they exist"
        return
    fi
    
    if [[ "${FORCE_RESTORE}" == "true" ]]; then
        log "INFO" "Removing existing volumes..."
        
        for volume in "${VOLUMES[@]}"; do
            if podman volume exists "${volume}"; then
                log "INFO" "Removing volume: ${volume}"
                podman volume rm "${volume}" || log "WARN" "Failed to remove ${volume}"
            fi
        done
    fi
}

# Restore a single volume
restore_volume() {
    local volume_name="$1"
    local backup_file="${BACKUP_DIR}/volumes/${volume_name}.tar.gz"
    
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY_RUN" "Would restore volume: ${volume_name} from ${backup_file}"
        return
    fi
    
    log "INFO" "Restoring volume: ${volume_name}"
    
    # Create the volume first
    podman volume create "${volume_name}" >> "${LOG_FILE}" 2>&1
    
    # Create temporary container to restore volume data
    log "INFO" "Creating temporary container for ${volume_name} restore..."
    local temp_container="restore_temp_$(date +%s)"
    
    # Copy backup file to a temporary location accessible by container
    local temp_backup="/tmp/restore_${volume_name}_$(date +%s).tar.gz"
    cp "${backup_file}" "${temp_backup}"
    
    # Mount volume and extract tar archive
    podman run --rm \
        --name "${temp_container}" \
        --volume "${volume_name}:/data" \
        --volume "${temp_backup}:${temp_backup}:ro" \
        docker.io/alpine:latest \
        sh -c "cd /data && tar -xzf ${temp_backup} && echo 'Volume ${volume_name} restore completed'" \
        >> "${LOG_FILE}" 2>&1
    
    # Clean up temporary backup file
    rm -f "${temp_backup}"
    
    # Verify volume was restored
    local volume_info=$(podman volume inspect "${volume_name}" | grep -i mountpoint || true)
    if [[ -n "${volume_info}" ]]; then
        log "SUCCESS" "Volume ${volume_name} restored successfully"
    else
        log "ERROR" "Volume ${volume_name} restore may have failed"
        exit 1
    fi
}

# Main restore function
perform_restore() {
    log "INFO" "Starting volume restore process..."
    
    stop_containers
    remove_existing_volumes
    
    # Restore each volume
    for volume in "${VOLUMES[@]}"; do
        restore_volume "${volume}"
    done
    
    if [[ "${DRY_RUN}" == "false" ]]; then
        log "SUCCESS" "All volumes restored successfully"
    else
        log "DRY_RUN" "Dry run completed - no actual restore performed"
    fi
}

# Restart containers
restart_containers() {
    if [[ "${DRY_RUN}" == "true" ]]; then
        log "DRY_RUN" "Would restart previously stopped containers"
        return
    fi
    
    local stopped_file="${BACKUP_DIR}/stopped_containers.txt"
    if [[ -f "${stopped_file}" ]]; then
        log "INFO" "Restarting previously stopped containers..."
        
        while IFS= read -r container; do
            log "INFO" "Starting container: ${container}"
            podman start "${container}" || log "WARN" "Failed to start ${container}"
        done < "${stopped_file}"
        
        # Clean up the file
        rm -f "${stopped_file}"
    else
        log "INFO" "No containers to restart"
    fi
}

# Generate restore summary
generate_summary() {
    local mode="COMPLETED"
    if [[ "${DRY_RUN}" == "true" ]]; then
        mode="DRY RUN COMPLETED"
    fi
    
    cat > "${BACKUP_DIR}/volume_restore_summary.txt" << EOF
UMIG Confluence Upgrade - Volume Restore Summary
===============================================
Restore Date: $(date)
Backup Timestamp: ${RESTORE_TIMESTAMP}
Restore Mode: ${mode}
Script Version: 1.0

Volumes Restored:
EOF
    
    for volume in "${VOLUMES[@]}"; do
        echo "- ${volume}" >> "${BACKUP_DIR}/volume_restore_summary.txt"
    done
    
    cat >> "${BACKUP_DIR}/volume_restore_summary.txt" << EOF

Options Used:
- Dry Run: ${DRY_RUN}
- Force Restore: ${FORCE_RESTORE}

Log File: ${LOG_FILE}
Status: ${mode}
EOF
    
    log "INFO" "Restore summary written to volume_restore_summary.txt"
    log "SUCCESS" "Volume restore ${mode,,}!"
}

# Main execution
main() {
    echo "==============================================="
    echo "UMIG Confluence Upgrade - Volume Restore"
    echo "==============================================="
    echo "Restore Timestamp: ${RESTORE_TIMESTAMP}"
    echo "Backup Directory: ${BACKUP_DIR}"
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo "Mode: DRY RUN (no actual changes)"
    fi
    if [[ "${FORCE_RESTORE}" == "true" ]]; then
        echo "Mode: FORCE (will overwrite existing volumes)"
    fi
    echo "==============================================="
    echo ""
    
    check_podman
    validate_backup
    check_volume_status
    perform_restore
    restart_containers
    generate_summary
    
    echo ""
    if [[ "${DRY_RUN}" == "true" ]]; then
        echo "Dry run completed! No actual restore was performed."
    else
        echo "Volume restore completed successfully!"
    fi
    echo "Log file: ${LOG_FILE}"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_arguments "$@"
    main
fi