#!/bin/bash

# ScriptRunner Functionality Validation Test
# Tests ScriptRunner installation and UMIG scripts functionality

set -euo pipefail

readonly SCRIPT_NAME="$(basename "${0}")"
readonly YELLOW='\033[1;33m'
readonly GREEN='\033[0;32m'
readonly RED='\033[0;31m'
readonly NC='\033[0m' # No Color

# Configuration
readonly CONFLUENCE_BASE="http://localhost:8090/confluence"
readonly UMIG_API_BASE="${CONFLUENCE_BASE}/rest/scriptrunner/latest/custom"
readonly SCRIPTRUNNER_BASE="${CONFLUENCE_BASE}/plugins/servlet/scriptrunner"
readonly TIMEOUT=15

log() {
    echo -e "${YELLOW}[${SCRIPT_NAME}]${NC} $1" >&2
}

success() {
    echo -e "${GREEN}✅ $1${NC}" >&2
}

error() {
    echo -e "${RED}❌ $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}" >&2
}

# Helper function to make HTTP requests
http_request() {
    local url="$1"
    local expected_status="${2:-200}"
    local method="${3:-GET}"
    
    local response
    local status_code
    
    if response=$(curl -s -w "\n%{http_code}" --connect-timeout $TIMEOUT -X "$method" "$url" 2>/dev/null); then
        status_code=$(echo "$response" | tail -n1)
        local body=$(echo "$response" | head -n -1)
        
        if [ "$status_code" = "$expected_status" ]; then
            echo "$body"
            return 0
        fi
    fi
    
    return 1
}

# Test 1: ScriptRunner Plugin Installation
test_scriptrunner_installation() {
    log "Testing ScriptRunner plugin installation..."
    local failed=0
    
    # Check if ScriptRunner admin pages are accessible
    local status_code
    if status_code=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT "${SCRIPTRUNNER_BASE}/admin/builtin" -o /dev/null 2>/dev/null); then
        # 200 = accessible, 401/403 = installed but auth required, 404 = not installed
        if [[ "$status_code" =~ ^(200|401|403)$ ]]; then
            success "ScriptRunner plugin is installed (HTTP $status_code)"
        else
            error "ScriptRunner plugin may not be installed (HTTP $status_code)"
            ((failed++))
        fi
    else
        error "Cannot verify ScriptRunner plugin installation"
        ((failed++))
    fi
    
    return $failed
}

# Test 2: ScriptRunner Version Compatibility
test_scriptrunner_version() {
    log "Testing ScriptRunner version compatibility..."
    local failed=0
    
    # Try to detect ScriptRunner version from responses or logs
    # ScriptRunner version info might be in various places
    
    # Check container logs for ScriptRunner startup messages
    if podman logs umig_confluence --tail 50 2>/dev/null | grep -i "scriptrunner" | head -5 | grep -q -i "version\|started"; then
        success "ScriptRunner appears to be loading successfully"
        
        # Try to extract version if possible
        local sr_version
        if sr_version=$(podman logs umig_confluence --tail 100 2>/dev/null | grep -i "scriptrunner" | grep -i -o "version [0-9]\+\.[0-9]\+\.[0-9]\+" | head -1); then
            success "Detected ScriptRunner $sr_version"
        else
            warning "Could not detect ScriptRunner version from logs"
        fi
    else
        warning "No ScriptRunner startup messages found in logs"
        # This isn't necessarily a failure - it might just not be logged
    fi
    
    # Check for any ScriptRunner error messages
    if podman logs umig_confluence --tail 100 2>/dev/null | grep -i "scriptrunner" | grep -i -E "error|exception|failed" >/dev/null; then
        error "ScriptRunner errors detected in logs"
        ((failed++))
    else
        success "No ScriptRunner errors in container logs"
    fi
    
    return $failed
}

# Test 3: Custom Script Roots Configuration
test_script_roots() {
    log "Testing custom script roots configuration..."
    local failed=0
    
    # Check if UMIG scripts directory is mounted correctly
    if podman exec umig_confluence test -d /var/atlassian/application-data/confluence/scripts/umig; then
        success "UMIG scripts directory is mounted"
        
        # Check if key UMIG files are present
        local key_files=("api/v2" "repository" "utils" "macros")
        local missing_files=()
        
        for file_path in "${key_files[@]}"; do
            if podman exec umig_confluence test -d "/var/atlassian/application-data/confluence/scripts/umig/$file_path" || 
               podman exec umig_confluence test -f "/var/atlassian/application-data/confluence/scripts/umig/$file_path"; then
                success "UMIG $file_path is present"
            else
                missing_files+=("$file_path")
                error "UMIG $file_path is missing"
                ((failed++))
            fi
        done
    else
        error "UMIG scripts directory is not mounted"
        ((failed++))
    fi
    
    # Verify CATALINA_OPTS includes script roots configuration
    local catalina_opts
    if catalina_opts=$(podman exec umig_confluence printenv CATALINA_OPTS 2>/dev/null); then
        if echo "$catalina_opts" | grep -q "plugin.script.roots"; then
            success "ScriptRunner script roots are configured"
            if echo "$catalina_opts" | grep -q "confluence/scripts"; then
                success "Script roots path is correctly configured"
            else
                error "Script roots path configuration is incorrect"
                ((failed++))
            fi
        else
            error "ScriptRunner script roots are not configured"
            ((failed++))
        fi
    else
        error "Cannot verify CATALINA_OPTS configuration"
        ((failed++))
    fi
    
    return $failed
}

# Test 4: UMIG Custom Endpoints Registration
test_umig_endpoints() {
    log "Testing UMIG custom endpoints registration..."
    local failed=0
    
    # Test that ScriptRunner can find and load UMIG scripts
    # We test this by checking if our custom endpoints respond
    
    local umig_endpoints=("steps" "teams" "users" "labels" "migrations")
    local working_endpoints=0
    
    for endpoint in "${umig_endpoints[@]}"; do
        local url="${UMIG_API_BASE}/${endpoint}"
        local status_code
        
        if status_code=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT "$url" -o /dev/null 2>/dev/null); then
            # Any of these status codes indicates the endpoint was found and processed
            if [[ "$status_code" =~ ^(200|401|403|500)$ ]]; then
                success "UMIG $endpoint endpoint is registered (HTTP $status_code)"
                ((working_endpoints++))
            else
                error "UMIG $endpoint endpoint returned unexpected status: $status_code"
            fi
        else
            error "UMIG $endpoint endpoint is not accessible"
        fi
    done
    
    # At least half of the endpoints should be working
    if [ $working_endpoints -ge 2 ]; then
        success "$working_endpoints/$((${#umig_endpoints[@]})) UMIG endpoints are working"
    else
        error "Only $working_endpoints/$((${#umig_endpoints[@]})) UMIG endpoints are working"
        ((failed++))
    fi
    
    return $failed
}

# Test 5: Groovy Script Compilation
test_script_compilation() {
    log "Testing Groovy script compilation..."
    local failed=0
    
    # Check container logs for compilation errors
    if podman logs umig_confluence --tail 200 2>/dev/null | grep -i -E "groovy.*error|compilation.*error|script.*error" >/dev/null; then
        error "Groovy compilation errors detected in logs"
        ((failed++))
        
        # Show the specific errors
        log "Recent Groovy errors:"
        podman logs umig_confluence --tail 200 2>/dev/null | grep -i -E "groovy.*error|compilation.*error|script.*error" | tail -3
    else
        success "No Groovy compilation errors detected"
    fi
    
    # Check for any script loading errors
    if podman logs umig_confluence --tail 200 2>/dev/null | grep -i -E "umig.*error|scriptrunner.*error.*umig" >/dev/null; then
        error "UMIG script loading errors detected"
        ((failed++))
    else
        success "No UMIG script loading errors detected"
    fi
    
    return $failed
}

# Test 6: Database Connection from Scripts
test_script_database_access() {
    log "Testing database access from scripts..."
    local failed=0
    
    # This is tricky to test without authentication, but we can check for
    # database connection related errors in the logs
    
    # Test by making a simple API call that would require database access
    # and check for database-related errors
    local status_code
    if status_code=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT "${UMIG_API_BASE}/teams" -o /dev/null 2>/dev/null); then
        # If we get a 500 error, check if it's database-related
        if [ "$status_code" = "500" ]; then
            # Check recent logs for database connection errors
            if podman logs umig_confluence --tail 50 2>/dev/null | grep -i -E "database.*error|connection.*error|sql.*error" >/dev/null; then
                error "Database connection errors detected from scripts"
                ((failed++))
            else
                warning "HTTP 500 from scripts but no database errors in logs (may be auth-related)"
            fi
        else
            success "Scripts can attempt database operations (HTTP $status_code)"
        fi
    else
        warning "Cannot test database access from scripts"
    fi
    
    return $failed
}

# Test 7: ScriptRunner Security Context
test_security_context() {
    log "Testing ScriptRunner security context..."
    local failed=0
    
    # Check if ScriptRunner is running with appropriate permissions
    # This is indicated by successful script loading and endpoint registration
    
    # If we can access any UMIG endpoint, ScriptRunner security context is working
    local security_test_passed=false
    local endpoints=("teams" "labels" "users")
    
    for endpoint in "${endpoints[@]}"; do
        local status_code
        if status_code=$(curl -s -w "%{http_code}" --connect-timeout $TIMEOUT "${UMIG_API_BASE}/${endpoint}" -o /dev/null 2>/dev/null); then
            if [[ "$status_code" =~ ^(200|401|403)$ ]]; then
                success "ScriptRunner security context allows UMIG $endpoint access"
                security_test_passed=true
                break
            fi
        fi
    done
    
    if [ "$security_test_passed" = false ]; then
        error "ScriptRunner security context may be misconfigured"
        ((failed++))
    fi
    
    # Check for security-related errors in logs
    if podman logs umig_confluence --tail 100 2>/dev/null | grep -i -E "security.*error|permission.*denied|access.*denied" | grep -i scriptrunner >/dev/null; then
        error "Security-related errors detected for ScriptRunner"
        ((failed++))
    else
        success "No security-related errors detected"
    fi
    
    return $failed
}

# Main test execution
main() {
    log "Starting ScriptRunner functionality validation tests..."
    local total_failed=0
    
    echo "=========================================="
    echo "⚙️  ScriptRunner Functionality Tests"
    echo "=========================================="
    echo
    
    # Run all tests
    test_scriptrunner_installation || ((total_failed++))
    echo
    
    test_scriptrunner_version || ((total_failed++))
    echo
    
    test_script_roots || ((total_failed++))
    echo
    
    test_umig_endpoints || ((total_failed++))
    echo
    
    test_script_compilation || ((total_failed++))
    echo
    
    test_script_database_access || ((total_failed++))
    echo
    
    test_security_context || ((total_failed++))
    echo
    
    # Summary
    echo "=========================================="
    if [ $total_failed -eq 0 ]; then
        success "All ScriptRunner functionality tests PASSED ✨"
        echo "ScriptRunner is ready for Confluence 9.2.7"
        exit 0
    else
        error "${total_failed} test group(s) FAILED ❌"
        echo "Please review ScriptRunner configuration before proceeding"
        exit 1
    fi
}

# Ensure required tools are available
command -v curl >/dev/null 2>&1 || { error "curl is required but not installed"; exit 1; }
command -v podman >/dev/null 2>&1 || { error "podman is required but not installed"; exit 1; }

main "$@"