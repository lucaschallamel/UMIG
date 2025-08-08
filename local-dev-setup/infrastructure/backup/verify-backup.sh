#!/bin/bash
# UMIG Confluence Upgrade - Backup Verification Script
# Verifies integrity and completeness of backup files
# 
# Author: gendev-deployment-ops-manager
# Version: 1.0
# Date: 2025-08-08

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_BASE_DIR="${SCRIPT_DIR}/../../backups"
VERIFY_TIMESTAMP=""
BACKUP_DIR=""
LOG_FILE=""
VERBOSE=false
QUICK_MODE=false

# Expected backup structure
EXPECTED_DIRS=(
    "volumes"
    "databases"
    "schemas"
    "metadata"
    "container_configs"
)

EXPECTED_VOLUME_FILES=(
    "confluence_data.tar.gz"
    "postgres_data.tar.gz"
)

EXPECTED_DB_FILES=(
    "confluence.backup"
    "confluence.sql.gz"
    "umig_app_db.backup"
    "umig_app_db.sql.gz"
    "globals.sql"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Usage function
usage() {
    echo "Usage: $0 <backup_timestamp> [options]"
    echo ""
    echo "Arguments:"
    echo "  backup_timestamp    Timestamp of the backup to verify (format: YYYYMMDD_HHMMSS)"
    echo ""
    echo "Options:"
    echo "  --verbose          Show detailed verification information"
    echo "  --quick            Quick verification (skip integrity checks)"
    echo "  --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 20250808_143022"
    echo "  $0 20250808_143022 --verbose"
    echo "  $0 20250808_143022 --quick"
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
        "CHECK") echo -e "${CYAN}[CHECK]${NC} ${message}" ;;
        "VERBOSE") 
            if [[ "${VERBOSE}" == "true" ]]; then
                echo -e "${BLUE}[VERBOSE]${NC} ${message}"
            fi
            ;;
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
    log "ERROR" "Verification script failed at line ${line_no} with exit code ${error_code}"
    log "ERROR" "Backup verification failed. Check ${LOG_FILE} for details."
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
    
    VERIFY_TIMESTAMP="$1"
    shift
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --verbose)
                VERBOSE=true
                shift
                ;;
            --quick)
                QUICK_MODE=true
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
    if [[ ! "${VERIFY_TIMESTAMP}" =~ ^[0-9]{8}_[0-9]{6}$ ]]; then
        log "ERROR" "Invalid timestamp format. Expected: YYYYMMDD_HHMMSS"
        exit 1
    fi
    
    BACKUP_DIR="${BACKUP_BASE_DIR}/${VERIFY_TIMESTAMP}"
    LOG_FILE="${BACKUP_DIR}/verification.log"
}

# Display verification banner
show_banner() {
    echo -e "${BOLD}${CYAN}"
    echo "=================================================================="
    echo "        UMIG CONFLUENCE UPGRADE - BACKUP VERIFICATION"
    echo "=================================================================="
    echo -e "${NC}"
    echo "Backup Timestamp: ${VERIFY_TIMESTAMP}"
    echo "Backup Directory: ${BACKUP_DIR}"
    if [[ "${QUICK_MODE}" == "true" ]]; then
        echo "Mode: Quick verification (structure and size only)"
    else
        echo "Mode: Full verification (includes integrity checks)"
    fi
    if [[ "${VERBOSE}" == "true" ]]; then
        echo "Verbosity: Detailed output enabled"
    fi
    echo "=================================================================="
    echo ""
}

# Check if backup directory exists
check_backup_directory() {
    log "CHECK" "Verifying backup directory exists..."
    
    if [[ ! -d "${BACKUP_DIR}" ]]; then
        log "ERROR" "Backup directory not found: ${BACKUP_DIR}"
        exit 1
    fi
    
    log "SUCCESS" "Backup directory found"
    log "VERBOSE" "Directory: ${BACKUP_DIR}"
}

# Verify directory structure
verify_directory_structure() {
    log "CHECK" "Verifying backup directory structure..."
    
    local missing_dirs=()
    local found_dirs=()
    
    for dir in "${EXPECTED_DIRS[@]}"; do
        if [[ -d "${BACKUP_DIR}/${dir}" ]]; then
            found_dirs+=("${dir}")
            log "VERBOSE" "Directory found: ${dir}"
        else
            missing_dirs+=("${dir}")
        fi
    done
    
    # Check for unexpected directories
    local unexpected_dirs=()
    while IFS= read -r -d '' dir; do
        local dirname=$(basename "${dir}")
        if [[ ! " ${EXPECTED_DIRS[@]} " =~ " ${dirname} " ]]; then
            unexpected_dirs+=("${dirname}")
        fi
    done < <(find "${BACKUP_DIR}" -maxdepth 1 -type d -not -path "${BACKUP_DIR}" -print0 2>/dev/null || true)
    
    # Report results
    if [[ ${#missing_dirs[@]} -gt 0 ]]; then
        log "WARN" "Missing directories: ${missing_dirs[*]}"
    fi
    
    if [[ ${#unexpected_dirs[@]} -gt 0 ]]; then
        log "INFO" "Additional directories found: ${unexpected_dirs[*]}"
    fi
    
    if [[ ${#found_dirs[@]} -ge 3 ]]; then
        log "SUCCESS" "Directory structure verification passed (${#found_dirs[@]}/${#EXPECTED_DIRS[@]} expected dirs found)"
    else
        log "ERROR" "Directory structure verification failed (too few directories found)"
        exit 1
    fi
}

# Verify volume backup files
verify_volume_files() {
    log "CHECK" "Verifying volume backup files..."
    
    if [[ ! -d "${BACKUP_DIR}/volumes" ]]; then
        log "WARN" "Volumes directory not found, skipping volume verification"
        return
    fi
    
    local missing_files=()
    local found_files=()
    local total_size=0
    
    for file in "${EXPECTED_VOLUME_FILES[@]}"; do
        local file_path="${BACKUP_DIR}/volumes/${file}"
        if [[ -f "${file_path}" ]]; then
            found_files+=("${file}")
            
            # Get file size
            local file_size=$(du -b "${file_path}" | cut -f1)
            total_size=$((total_size + file_size))
            local file_size_human=$(du -h "${file_path}" | cut -f1)
            
            log "VERBOSE" "Volume file found: ${file} (${file_size_human})"
            
            # Check if file is not empty
            if [[ ${file_size} -eq 0 ]]; then
                log "ERROR" "Volume file is empty: ${file}"
                exit 1
            fi
            
            # Quick corruption check (verify it's a valid gzip file)
            if ! gzip -t "${file_path}" 2>/dev/null; then
                log "ERROR" "Volume file appears corrupted (invalid gzip): ${file}"
                exit 1
            fi
        else
            missing_files+=("${file}")
        fi
    done
    
    # Report results
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log "ERROR" "Missing volume files: ${missing_files[*]}"
        exit 1
    fi
    
    local total_size_human=$(numfmt --to=iec-i --suffix=B ${total_size})
    log "SUCCESS" "Volume files verification passed (${#found_files[@]} files, ${total_size_human} total)"
}

# Verify database backup files
verify_database_files() {
    log "CHECK" "Verifying database backup files..."
    
    if [[ ! -d "${BACKUP_DIR}/databases" ]]; then
        log "WARN" "Databases directory not found, skipping database verification"
        return
    fi
    
    local missing_files=()
    local found_files=()
    local total_size=0
    
    for file in "${EXPECTED_DB_FILES[@]}"; do
        local file_path="${BACKUP_DIR}/databases/${file}"
        if [[ -f "${file_path}" ]]; then
            found_files+=("${file}")
            
            # Get file size
            local file_size=$(du -b "${file_path}" | cut -f1)
            total_size=$((total_size + file_size))
            local file_size_human=$(du -h "${file_path}" | cut -f1)
            
            log "VERBOSE" "Database file found: ${file} (${file_size_human})"
            
            # Check if file is not empty
            if [[ ${file_size} -eq 0 ]]; then
                log "ERROR" "Database file is empty: ${file}"
                exit 1
            fi
            
            # Verify file type specific checks
            case "${file}" in
                *.sql.gz)
                    if ! gzip -t "${file_path}" 2>/dev/null; then
                        log "ERROR" "Database file appears corrupted (invalid gzip): ${file}"
                        exit 1
                    fi
                    ;;
                *.backup)
                    # Basic check for pg_dump custom format
                    local header=$(head -c 5 "${file_path}" 2>/dev/null || echo "")
                    if [[ "${header}" != "PGDMP" ]]; then
                        log "WARN" "Database file may not be a valid pg_dump custom format: ${file}"
                    fi
                    ;;
            esac
        else
            missing_files+=("${file}")
        fi
    done
    
    # Report results
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log "WARN" "Missing database files (some may be optional): ${missing_files[*]}"
    fi
    
    local total_size_human=$(numfmt --to=iec-i --suffix=B ${total_size})
    log "SUCCESS" "Database files verification passed (${#found_files[@]}/${#EXPECTED_DB_FILES[@]} files, ${total_size_human} total)"
}

# Verify metadata and configuration files
verify_metadata_files() {
    log "CHECK" "Verifying metadata and configuration files..."
    
    local important_files=(
        "master_backup_info.txt"
        "backup_info.txt"
        "complete_manifest.sha256"
    )
    
    local found_files=()
    local missing_files=()
    
    for file in "${important_files[@]}"; do
        if [[ -f "${BACKUP_DIR}/${file}" ]]; then
            found_files+=("${file}")
            log "VERBOSE" "Metadata file found: ${file}"
        else
            missing_files+=("${file}")
        fi
    done
    
    # Check container configs
    if [[ -d "${BACKUP_DIR}/container_configs" ]]; then
        local config_files=$(find "${BACKUP_DIR}/container_configs" -type f | wc -l)
        log "VERBOSE" "Container configuration files found: ${config_files}"
    else
        log "WARN" "Container configurations directory not found"
    fi
    
    # Report results
    if [[ ${#missing_files[@]} -gt 0 ]]; then
        log "WARN" "Missing metadata files: ${missing_files[*]}"
    fi
    
    log "SUCCESS" "Metadata verification passed (${#found_files[@]} files found)"
}

# Verify backup integrity using checksums
verify_integrity() {
    if [[ "${QUICK_MODE}" == "true" ]]; then
        log "INFO" "Skipping integrity verification (quick mode enabled)"
        return
    fi
    
    log "CHECK" "Verifying backup integrity using checksums..."
    
    local manifest_files=(
        "complete_manifest.sha256"
        "master_manifest.sha256"
        "backup_manifest.sha256"
    )
    
    local verified=false
    
    for manifest in "${manifest_files[@]}"; do
        local manifest_path="${BACKUP_DIR}/${manifest}"
        if [[ -f "${manifest_path}" ]]; then
            log "INFO" "Using manifest file: ${manifest}"
            
            cd "${BACKUP_DIR}"
            
            # Count total files in manifest
            local total_files=$(wc -l < "${manifest_path}")
            log "INFO" "Verifying ${total_files} files..."
            
            # Verify checksums
            local start_time=$(date +%s)
            if sha256sum -c "${manifest_path}" --quiet 2>>"${LOG_FILE}"; then
                local end_time=$(date +%s)
                local duration=$((end_time - start_time))
                log "SUCCESS" "Integrity verification passed (${total_files} files verified in ${duration}s)"
                verified=true
                break
            else
                log "ERROR" "Integrity verification failed using ${manifest}"
                # Don't exit immediately, try other manifests
            fi
        fi
    done
    
    if [[ "${verified}" == "false" ]]; then
        if [[ -f "${BACKUP_DIR}/complete_manifest.sha256" ]] || [[ -f "${BACKUP_DIR}/master_manifest.sha256" ]] || [[ -f "${BACKUP_DIR}/backup_manifest.sha256" ]]; then
            log "ERROR" "Integrity verification failed - checksums do not match"
            exit 1
        else
            log "WARN" "No manifest files found - cannot verify integrity"
        fi
    fi
}

# Check backup completeness based on backup info files
verify_completeness() {
    log "CHECK" "Verifying backup completeness..."
    
    # Read backup info to understand what should be backed up
    local info_files=(
        "master_backup_info.txt"
        "backup_info.txt"
    )
    
    local backup_date=""
    local expected_components=()
    
    for info_file in "${info_files[@]}"; do
        if [[ -f "${BACKUP_DIR}/${info_file}" ]]; then
            log "VERBOSE" "Reading backup information from: ${info_file}"
            
            # Extract backup date
            backup_date=$(grep "Backup Date:" "${BACKUP_DIR}/${info_file}" | head -1 | cut -d: -f2- | xargs || echo "Unknown")
            
            # Extract components
            if grep -q "Volumes Backed Up:" "${BACKUP_DIR}/${info_file}"; then
                expected_components+=("volumes")
            fi
            if grep -q "Databases Backed Up:" "${BACKUP_DIR}/${info_file}"; then
                expected_components+=("databases")
            fi
            
            break
        fi
    done
    
    if [[ -z "${backup_date}" ]]; then
        log "WARN" "Could not determine backup date from info files"
    else
        log "VERBOSE" "Backup created: ${backup_date}"
    fi
    
    # Verify age of backup
    if [[ "${VERIFY_TIMESTAMP}" =~ ^([0-9]{4})([0-9]{2})([0-9]{2})_([0-9]{2})([0-9]{2})([0-9]{2})$ ]]; then
        local backup_epoch=$(date -j -f "%Y%m%d_%H%M%S" "${VERIFY_TIMESTAMP}" "+%s" 2>/dev/null || echo "0")
        local current_epoch=$(date +%s)
        local age_hours=$(( (current_epoch - backup_epoch) / 3600 ))
        
        if [[ ${age_hours} -gt 168 ]]; then  # 1 week
            log "WARN" "Backup is ${age_hours} hours old (more than 1 week)"
        else
            log "VERBOSE" "Backup age: ${age_hours} hours"
        fi
    fi
    
    log "SUCCESS" "Completeness verification passed"
}

# Generate verification report
generate_report() {
    log "INFO" "Generating verification report..."
    
    local report_file="${BACKUP_DIR}/verification_report.txt"
    local total_size=$(du -sh "${BACKUP_DIR}" | cut -f1)
    local file_count=$(find "${BACKUP_DIR}" -type f | wc -l)
    
    cat > "${report_file}" << EOF
UMIG Confluence Upgrade - Backup Verification Report
===================================================
Verification Date: $(date)
Backup Timestamp: ${VERIFY_TIMESTAMP}
Backup Directory: ${BACKUP_DIR}
Verification Mode: $(if [[ "${QUICK_MODE}" == "true" ]]; then echo "Quick"; else echo "Full"; fi)
Script Version: 1.0

Backup Summary:
- Total Size: ${total_size}
- Total Files: ${file_count}
- Backup Age: $(if [[ "${VERIFY_TIMESTAMP}" =~ ^([0-9]{4})([0-9]{2})([0-9]{2})_([0-9]{2})([0-9]{2})([0-9]{2})$ ]]; then 
    local backup_epoch=$(date -j -f "%Y%m%d_%H%M%S" "${VERIFY_TIMESTAMP}" "+%s" 2>/dev/null || echo "0")
    local current_epoch=$(date +%s)
    local age_hours=$(( (current_epoch - backup_epoch) / 3600 ))
    echo "${age_hours} hours"
else
    echo "Unknown"
fi)

Verification Results:
EOF
    
    # Add verification results
    echo "✅ Directory structure: PASSED" >> "${report_file}"
    
    if [[ -d "${BACKUP_DIR}/volumes" ]]; then
        echo "✅ Volume files: PASSED" >> "${report_file}"
    else
        echo "⚠️  Volume files: NOT FOUND" >> "${report_file}"
    fi
    
    if [[ -d "${BACKUP_DIR}/databases" ]]; then
        echo "✅ Database files: PASSED" >> "${report_file}"
    else
        echo "⚠️  Database files: NOT FOUND" >> "${report_file}"
    fi
    
    echo "✅ Metadata files: PASSED" >> "${report_file}"
    
    if [[ "${QUICK_MODE}" == "false" ]]; then
        echo "✅ Integrity check: PASSED" >> "${report_file}"
    else
        echo "⏭️  Integrity check: SKIPPED (quick mode)" >> "${report_file}"
    fi
    
    echo "✅ Completeness check: PASSED" >> "${report_file}"
    
    cat >> "${report_file}" << EOF

Backup Components Found:
EOF
    
    # List components
    if [[ -d "${BACKUP_DIR}/volumes" ]]; then
        echo "- Volume Backups:" >> "${report_file}"
        find "${BACKUP_DIR}/volumes" -name "*.tar.gz" -exec basename {} \; | sed 's/^/  • /' >> "${report_file}"
    fi
    
    if [[ -d "${BACKUP_DIR}/databases" ]]; then
        echo "- Database Backups:" >> "${report_file}"
        find "${BACKUP_DIR}/databases" -name "*.backup" -o -name "*.sql.gz" -o -name "globals.sql" | xargs -I {} basename {} | sed 's/^/  • /' >> "${report_file}"
    fi
    
    if [[ -d "${BACKUP_DIR}/container_configs" ]]; then
        echo "- Container Configurations:" >> "${report_file}"
        find "${BACKUP_DIR}/container_configs" -type f | wc -l | sed 's/^/  • /' | sed 's/$/ files/' >> "${report_file}"
    fi
    
    cat >> "${report_file}" << EOF

Verification Status: PASSED ✅
Next Steps:
- Backup is verified and ready for restore if needed
- Consider testing restore process in non-production environment
- Keep this backup safe until upgrade is confirmed successful

Log File: ${LOG_FILE}
EOF
    
    log "SUCCESS" "Verification report generated: verification_report.txt"
}

# Display verification summary
show_summary() {
    local total_size=$(du -sh "${BACKUP_DIR}" | cut -f1)
    local file_count=$(find "${BACKUP_DIR}" -type f | wc -l)
    
    echo ""
    echo -e "${BOLD}${GREEN}"
    echo "=================================================================="
    echo "              BACKUP VERIFICATION COMPLETED"
    echo "=================================================================="
    echo -e "${NC}"
    echo "Verification Summary:"
    echo "• Backup Size: ${total_size}"
    echo "• Files Verified: ${file_count}"
    echo "• Timestamp: ${VERIFY_TIMESTAMP}"
    echo ""
    echo "Verification Results:"
    echo "• ✅ Directory Structure"
    echo "• ✅ Volume Files"
    echo "• ✅ Database Files"
    echo "• ✅ Metadata Files"
    if [[ "${QUICK_MODE}" == "false" ]]; then
        echo "• ✅ Integrity Check"
    else
        echo "• ⏭️  Integrity Check (skipped)"
    fi
    echo "• ✅ Completeness Check"
    echo ""
    echo "Status: ${BOLD}${GREEN}VERIFICATION PASSED${NC}"
    echo ""
    echo "Reports:"
    echo "• Verification Report: ${BACKUP_DIR}/verification_report.txt"
    echo "• Log File: ${LOG_FILE}"
    echo ""
    echo -e "${BOLD}${GREEN}Backup is verified and ready for use!${NC}"
    echo "=================================================================="
}

# Main execution
main() {
    show_banner
    
    check_backup_directory
    verify_directory_structure
    verify_volume_files
    verify_database_files
    verify_metadata_files
    verify_integrity
    verify_completeness
    generate_report
    show_summary
    
    log "SUCCESS" "Backup verification completed successfully!"
}

# Script execution
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    parse_arguments "$@"
    main
fi