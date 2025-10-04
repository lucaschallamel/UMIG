# Confluence Upgrade Validation Suite

**Purpose**: Comprehensive Confluence 9.2.7 upgrade validation with pre/post-upgrade testing and regression detection

## Files

```
upgrade/
├── README.md                        # This file
├── run-all-tests.sh                # Master test orchestrator
├── test-container-health.sh        # Container status and health
├── test-database-connectivity.sh   # PostgreSQL connectivity
├── test-api-endpoints.sh          # REST API functionality
├── test-scriptrunner.sh           # ScriptRunner integration
└── logs/                          # Test execution logs
```

## Validation Coverage

### Infrastructure Validation
- **Container health** - Running status, network connectivity, port accessibility
- **Database connectivity** - PostgreSQL connections, schema validation, Liquibase versions
- **API functionality** - REST endpoints, response validation, performance testing
- **ScriptRunner integration** - Installation, version compatibility, UMIG endpoints

### Upgrade Workflows

**Pre-Upgrade** (Baseline):
```bash
cd src/groovy/umig/tests/upgrade
./run-all-tests.sh                  # Capture baseline
```

**Post-Upgrade** (Validation):
```bash
./run-all-tests.sh                  # Verify no regressions
```

## Usage

### Run All Tests

```bash
cd src/groovy/umig/tests/upgrade
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

## Test Environment Requirements

### Running Services
- `umig_confluence` - Confluence application (port 8090)
- `umig_postgres` - PostgreSQL database (port 5432)
- `umig_mailhog` - Mail server (ports 8025, 1025)

### Expected Endpoints
- Confluence: http://localhost:8090
- UMIG APIs: http://localhost:8090/confluence/rest/scriptrunner/latest/custom
- PostgreSQL databases: `confluence`, `umig_app_db`

## Pre-Upgrade Validation Workflow

1. **Start environment**: `npm start` from `local-dev-setup/`
2. **Wait for startup**: 2-3 minutes for full initialization
3. **Run validation**: `./run-all-tests.sh`
4. **Verify all tests pass** before proceeding with upgrade

## Post-Upgrade Validation Workflow

1. **Wait for upgrade completion**: 5-10 minutes typical
2. **Run validation**: `./run-all-tests.sh`
3. **Compare with pre-upgrade results**
4. **Address failures** before production use

## Test Output

### Console Indicators
- ✅ **Green checkmarks** - Tests passing
- ❌ **Red X marks** - Tests failing
- ⚠️ **Yellow warnings** - Non-critical issues
- ℹ️ **Blue info** - Status information

### Log Files (logs/ directory)
- `upgrade_validation_TIMESTAMP.log` - Complete test run
- `test-NAME_TIMESTAMP.log` - Individual test logs
- `upgrade_validation_report_TIMESTAMP.md` - Markdown report

### Exit Codes
- **0** - All tests passed
- **1** - One or more failures

## Pass/Fail Criteria

### Pass Criteria
- ✅ All containers running and healthy
- ✅ All databases accessible with expected schema
- ✅ All UMIG API endpoints registered and responding
- ✅ ScriptRunner configured and loading UMIG scripts
- ✅ No critical errors in logs
- ✅ Performance within thresholds

### Fail Criteria
- ❌ Container not running or unhealthy
- ❌ Database connectivity issues
- ❌ UMIG API endpoints 404 or connection errors
- ❌ ScriptRunner compilation/loading errors
- ❌ Critical security or configuration issues

## Troubleshooting

### Container Issues
```bash
podman ps --all              # Check status
npm start                    # Restart environment
```

### Database Issues
```bash
podman logs umig_postgres    # Check PostgreSQL logs
podman exec umig_postgres env | grep POSTGRES  # Verify credentials
```

### API Issues
```bash
podman logs umig_confluence --tail 50  # Check Confluence logs
curl http://localhost:8090/rest/scriptrunner/latest/custom/teams  # Test endpoint
```

### ScriptRunner Issues
```bash
podman exec umig_confluence ls -la /var/atlassian/application-data/confluence/scripts/umig
podman exec umig_confluence printenv CATALINA_OPTS
```

## Integration with Upgrade Process

1. **Pre-Upgrade**: Validate current 8.5.6 environment
2. **Upgrade**: Follow `confluence/UPGRADE-NOTES-9.2.7.md`
3. **Post-Upgrade**: Re-validate with same test suite
4. **Comparison**: Ensure no regressions introduced

---

**Target**: Confluence 9.2.7 upgrade validation
**Updated**: September 26, 2025 | **Version**: 1.0
