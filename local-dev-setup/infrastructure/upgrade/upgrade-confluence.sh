#!/bin/bash

# Confluence 9.2.7 Upgrade Script for US-032
# Stream A: Container image replacement preserving data

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_DIR="$SCRIPT_DIR/../backup"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
LOG_FILE="$PROJECT_DIR/upgrade-confluence-$TIMESTAMP.log"

# Logging function
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "${RED}ERROR: $1${NC}" | tee -a "$LOG_FILE"
}

log_success() {
    echo -e "${GREEN}SUCCESS: $1${NC}" | tee -a "$LOG_FILE"
}

log_warning() {
    echo -e "${YELLOW}WARNING: $1${NC}" | tee -a "$LOG_FILE"
}

log_info() {
    echo -e "${BLUE}INFO: $1${NC}" | tee -a "$LOG_FILE"
}

# Pre-flight checks
preflight_checks() {
    log_info "Starting pre-flight checks..."
    
    # Check if podman is installed
    if ! command -v podman &> /dev/null; then
        log_error "Podman is not installed"
        exit 1
    fi
    
    # Check if containers are running
    if ! podman ps | grep -q umig_confluence; then
        log_warning "Confluence container is not running"
    fi
    
    if ! podman ps | grep -q umig_postgres; then
        log_error "PostgreSQL container is not running - required for backup"
        exit 1
    fi
    
    # Check if backup scripts exist
    if [ ! -f "$BACKUP_DIR/backup-all.sh" ]; then
        log_error "Backup scripts not found in $BACKUP_DIR"
        exit 1
    fi
    
    # Check Containerfile has been updated
    if ! grep -q "confluence:9.2.7" "$PROJECT_DIR/confluence/Containerfile"; then
        log_error "Containerfile not updated to 9.2.7"
        exit 1
    fi
    
    log_success "Pre-flight checks passed"
}

# Create backup with verification
create_backup() {
    log_info "Creating backup before upgrade..."
    
    # Ensure backup script exists and is executable
    if [ ! -f "$BACKUP_DIR/backup-all.sh" ]; then
        log_error "Backup script not found at: $BACKUP_DIR/backup-all.sh"
        exit 1
    fi
    
    if [ ! -x "$BACKUP_DIR/backup-all.sh" ]; then
        log_warn "Making backup script executable..."
        chmod +x "$BACKUP_DIR/backup-all.sh"
    fi
    
    # Run backup from the backup directory
    cd "$BACKUP_DIR"
    
    if ./backup-all.sh; then
        # Get the latest backup timestamp from the actual backup location
        BACKUP_TIMESTAMP=$(ls -t "$PROJECT_DIR/../backups/" 2>/dev/null | head -n1)
        
        if [ -z "$BACKUP_TIMESTAMP" ]; then
            log_error "Backup appears to have failed - no backup directory created"
            exit 1
        fi
        
        BACKUP_PATH="$PROJECT_DIR/../backups/$BACKUP_TIMESTAMP"
        log_success "Backup created: $BACKUP_TIMESTAMP"
        echo "$BACKUP_TIMESTAMP" > "$PROJECT_DIR/.last-backup-before-upgrade"
        
        # Verify backup is not empty
        log_info "Verifying backup integrity..."
        local has_content=false
        
        # Check for backup files and their sizes
        for backup_file in "$BACKUP_PATH"/*.tar* "$BACKUP_PATH"/*.sql* "$BACKUP_PATH"/*.gz*; do
            if [ -f "$backup_file" ]; then
                local file_size=$(stat -f%z "$backup_file" 2>/dev/null || stat -c%s "$backup_file" 2>/dev/null)
                local file_name=$(basename "$backup_file")
                
                if [ "$file_size" -gt 0 ]; then
                    log_info "  ✓ $file_name: $(du -h "$backup_file" | cut -f1)"
                    has_content=true
                else
                    log_error "  ✗ $file_name: EMPTY FILE (0 bytes)"
                    log_error "Backup verification failed - empty backup file detected"
                    log_error "This would leave you without a pre-upgrade backup!"
                    exit 1
                fi
            fi
        done
        
        if [ "$has_content" = false ]; then
            log_error "No valid backup files found in $BACKUP_PATH"
            log_error "Backup verification failed - aborting upgrade"
            exit 1
        fi
        
        log_success "Backup verification passed - all files contain data"
    else
        log_error "Backup script execution failed - aborting upgrade"
        exit 1
    fi
    
    cd "$PROJECT_DIR"
}

# Build new image
build_new_image() {
    log_info "Building new Confluence 9.2.7 image..."
    cd "$PROJECT_DIR"
    
    # Tag the old image for rollback
    log_info "Tagging old image for rollback..."
    podman tag localhost/umig-confluence:latest localhost/umig-confluence:8.5.6-backup || true
    
    # Build new image
    if podman-compose build --no-cache confluence; then
        log_success "New Confluence 9.2.7 image built successfully"
    else
        log_error "Failed to build new image"
        exit 1
    fi
}

# Deploy new container
deploy_new_container() {
    log_info "Deploying new Confluence 9.2.7 container..."
    cd "$PROJECT_DIR"
    
    # Stop old container
    log_info "Stopping old Confluence container..."
    podman-compose stop confluence
    
    # Remove old container (preserving volumes)
    log_info "Removing old container (volumes preserved)..."
    podman-compose rm -f confluence
    
    # Start new container
    log_info "Starting new Confluence 9.2.7 container..."
    if podman-compose up -d confluence; then
        log_success "New container started"
    else
        log_error "Failed to start new container"
        rollback
        exit 1
    fi
    
    # Wait for Confluence to be ready
    wait_for_confluence
}

# Wait for Confluence to be ready
wait_for_confluence() {
    log_info "Waiting for Confluence to be ready..."
    MAX_WAIT=300 # 5 minutes
    ELAPSED=0
    
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        if curl -s -o /dev/null -w "%{http_code}" http://localhost:8090 | grep -q "200\|302"; then
            log_success "Confluence is ready"
            return 0
        fi
        
        echo -n "."
        sleep 5
        ELAPSED=$((ELAPSED + 5))
    done
    
    log_error "Confluence did not become ready within $MAX_WAIT seconds"
    return 1
}

# Rollback function
rollback() {
    log_warning "Initiating rollback..."
    
    # Stop current container
    podman-compose stop confluence
    podman-compose rm -f confluence
    
    # Restore old image
    if podman images | grep -q "umig-confluence.*8.5.6-backup"; then
        log_info "Restoring old image..."
        podman tag localhost/umig-confluence:8.5.6-backup localhost/umig-confluence:latest
    fi
    
    # Revert Containerfile
    log_info "Reverting Containerfile..."
    sed -i 's/confluence:9.2.7/confluence-server:8.5.6-jdk17/' "$PROJECT_DIR/confluence/Containerfile"
    
    # Start old version
    podman-compose up -d confluence
    
    log_warning "Rollback completed - please verify system status"
}

# Verify upgrade
verify_upgrade() {
    log_info "Verifying upgrade..."
    
    # Check container is running
    if ! podman ps | grep -q umig_confluence; then
        log_error "Confluence container is not running"
        return 1
    fi
    
    # Check version (this would need to be done via UI or API)
    log_info "Please verify in UI that Confluence is running version 9.2.7"
    log_info "URL: http://localhost:8090"
    
    return 0
}

# Main execution
main() {
    log_info "=== Starting Confluence 9.2.7 Upgrade (US-032) ==="
    log_info "Timestamp: $TIMESTAMP"
    log_info "Log file: $LOG_FILE"
    
    preflight_checks
    
    # Prompt for confirmation
    echo -e "${YELLOW}This will upgrade Confluence from 8.5.6 to 9.2.7${NC}"
    echo -e "${YELLOW}Data will be preserved, but a backup will be created first${NC}"
    read -p "Continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Upgrade cancelled by user"
        exit 0
    fi
    
    create_backup
    build_new_image
    deploy_new_container
    verify_upgrade
    
    log_success "=== Confluence upgrade completed successfully ==="
    log_info "Next steps:"
    log_info "1. Access Confluence at http://localhost:8090"
    log_info "2. Upgrade ScriptRunner to 9.21.0 via Marketplace"
    log_info "3. Run smoke tests: npm test"
    log_info "4. If issues occur, run rollback function or restore from backup"
}

# Run main function
main "$@"