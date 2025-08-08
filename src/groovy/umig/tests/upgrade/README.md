# Confluence 9.2.7 Upgrade Validation Test Suite

Comprehensive validation tests for the UMIG Confluence upgrade from 8.5.6 to 9.2.7.

## Overview

This test suite validates that all critical components are functioning correctly before and after the Confluence upgrade. The tests are designed to be fast, reliable, and provide clear pass/fail indicators.

## Test Files

### 1. `test-container-health.sh`
**Purpose:** Verify container status and health  
**Coverage:**
- Container running status
- Health check validation
- Network connectivity between containers
- Port accessibility
- Volume mount verification
- Resource usage monitoring

### 2. `test-database-connectivity.sh`
**Purpose:** Test PostgreSQL connections  
**Coverage:**
- PostgreSQL server connectivity
- Confluence database connection and schema
- UMIG application database connection and tables
- Internal container-to-database connectivity
- Connection pooling and performance
- Liquibase schema version validation

### 3. `test-api-endpoints.sh`
**Purpose:** Validate REST API endpoints  
**Coverage:**
- Confluence base connectivity
- Confluence REST API v1 endpoints
- ScriptRunner custom endpoint base
- UMIG core API endpoints (steps, teams, users, etc.)
- API response format validation
- API performance testing
- Confluence 9.2.7 specific features

### 4. `test-scriptrunner.sh`
**Purpose:** Check ScriptRunner installation and functionality  
**Coverage:**
- ScriptRunner plugin installation
- Version compatibility with Confluence 9.2.7
- Custom script roots configuration
- UMIG endpoints registration
- Groovy script compilation
- Database access from scripts
- Security context validation

### 5. `run-all-tests.sh`
**Purpose:** Master test runner with comprehensive reporting  
**Features:**
- Executes all tests in optimal order
- Pre-flight environment checks
- Detailed logging and reporting
- Markdown report generation
- Single test execution option
- Comprehensive summary with recommendations

## Usage

### Run All Tests
```bash
cd src/groovy/umig/tests/upgrade/
./run-all-tests.sh
```

### Run Specific Test
```bash
./run-all-tests.sh --test container-health
./run-all-tests.sh --test database-connectivity
./run-all-tests.sh --test api-endpoints
./run-all-tests.sh --test scriptrunner
```

### List Available Tests
```bash
./run-all-tests.sh --list
```

### Get Help
```bash
./run-all-tests.sh --help
```

## Test Environment Requirements

### Running Containers
- `umig_confluence` - Confluence application
- `umig_postgres` - PostgreSQL database
- `umig_mailhog` - Mail server

### Network Accessibility
- Port 8090: Confluence HTTP
- Port 5432: PostgreSQL
- Port 8025: MailHog Web UI
- Port 1025: MailHog SMTP

### Expected Services
- Confluence at http://localhost:8090
- UMIG APIs at http://localhost:8090/confluence/rest/scriptrunner/latest/custom
- PostgreSQL databases: `confluence`, `umig_app_db`

## Pre-Upgrade Validation

Before upgrading to Confluence 9.2.7:

1. **Start Environment:**
   ```bash
   cd local-dev-setup/
   npm start
   ```

2. **Wait for Startup** (2-3 minutes for full initialization)

3. **Run Validation:**
   ```bash
   cd src/groovy/umig/tests/upgrade/
   ./run-all-tests.sh
   ```

4. **Verify All Tests Pass** before proceeding with upgrade

## Post-Upgrade Validation

After upgrading to Confluence 9.2.7:

1. **Wait for Startup** (upgrade may take 5-10 minutes)

2. **Run Validation Again:**
   ```bash
   ./run-all-tests.sh
   ```

3. **Compare Results** with pre-upgrade validation

4. **Address Any Failures** before using the system

## Test Output

### Console Output
- ✅ **Green checkmarks** for passing tests
- ❌ **Red X marks** for failing tests
- ⚠️ **Yellow warnings** for non-critical issues
- ℹ️ **Blue info** for status information

### Log Files
All test runs generate logs in `logs/` directory:
- `upgrade_validation_TIMESTAMP.log` - Full test suite log
- `test-NAME_TIMESTAMP.log` - Individual test logs
- `upgrade_validation_report_TIMESTAMP.md` - Detailed markdown report

### Exit Codes
- **0** - All tests passed
- **1** - One or more tests failed

## Troubleshooting

### Common Issues

**Container Not Running:**
```bash
podman ps --all
npm start  # Start environment
```

**Database Connection Failed:**
```bash
# Check PostgreSQL container
podman logs umig_postgres
# Verify environment variables
podman exec umig_postgres env | grep POSTGRES
```

**API Endpoints Not Responding:**
```bash
# Check Confluence logs
podman logs umig_confluence --tail 50
# Verify ScriptRunner installation
curl -s http://localhost:8090/confluence/plugins/servlet/scriptrunner/admin
```

**ScriptRunner Issues:**
```bash
# Check UMIG scripts mount
podman exec umig_confluence ls -la /var/atlassian/application-data/confluence/scripts/umig
# Verify CATALINA_OPTS
podman exec umig_confluence printenv CATALINA_OPTS
```

### Test-Specific Debugging

**For detailed debugging of specific failures:**
```bash
# Run single test with verbose output
bash -x ./test-container-health.sh
bash -x ./test-database-connectivity.sh
bash -x ./test-api-endpoints.sh
bash -x ./test-scriptrunner.sh
```

## Integration with Upgrade Process

This test suite integrates with the broader upgrade process:

1. **Pre-Upgrade:** Validate current 8.5.6 environment
2. **Upgrade:** Follow steps in `confluence/UPGRADE-NOTES-9.2.7.md`
3. **Post-Upgrade:** Re-validate with same test suite
4. **Comparison:** Ensure no regressions introduced

## Test Criteria

### Pass Criteria
- All containers running and healthy
- All databases accessible with expected schema
- All UMIG API endpoints registered and responding
- ScriptRunner properly configured and loading UMIG scripts
- No critical errors in container logs
- Performance within acceptable thresholds

### Fail Criteria
- Any container not running or unhealthy
- Database connectivity issues
- UMIG API endpoints returning 404 or connection errors
- ScriptRunner compilation or loading errors
- Critical security or configuration issues

## Maintenance

### Adding New Tests
1. Create test script following naming convention: `test-NAME.sh`
2. Update `TESTS` array in `run-all-tests.sh`
3. Add to `TEST_ORDER` array for execution sequence
4. Update this README

### Updating for Future Upgrades
1. Update version references in test scripts
2. Add version-specific feature tests
3. Update compatibility checks
4. Modify expected behavior based on upgrade notes

---

**Note:** This test suite is specifically designed for UMIG's Confluence environment and may need adaptation for other ScriptRunner-based applications.