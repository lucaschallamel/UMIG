# UMIG Testing Framework Documentation

## Overview

The UMIG project uses a consolidated testing framework optimized for API validation, integration testing, and quality assurance. This framework was refined during the US-024 StepsAPI refactoring project and provides comprehensive coverage with minimal redundancy.

## Testing Structure

```
local-dev-setup/scripts/quality-check/
├── immediate-health-check.sh      # Environment & database validation
├── api-smoke-test.sh              # Consolidated API endpoint testing
├── phase-b-test-execution.sh      # Groovy test suite runner
└── master-quality-check.sh        # Master orchestration script
```

### Script Purposes

#### 1. immediate-health-check.sh

- **Purpose**: Quick environment and database connectivity validation
- **When to use**: Before any testing session to ensure environment readiness
- **Key features**:
  - PostgreSQL connectivity check
  - Confluence availability verification
  - ScriptRunner configuration validation
  - Database record counting

#### 2. api-smoke-test.sh

- **Purpose**: Comprehensive API endpoint testing (consolidated from 5 previous scripts)
- **When to use**: API validation, endpoint testing, error message verification
- **Key features**:
  - All UMIG API coverage (users, teams, steps, comments, migrations, environments)
  - Authentication validation
  - Improved error message testing (especially comments endpoints)
  - Diagnostic analysis for failures
  - Verbose mode for debugging
  - Endpoint-specific testing capability

#### 3. phase-b-test-execution.sh

- **Purpose**: Execute Groovy unit and integration test suites
- **When to use**: Comprehensive code testing, pre-deployment validation
- **Key features**:
  - Unit test execution
  - Integration test execution
  - Database query validation
  - Repository pattern testing

#### 4. master-quality-check.sh

- **Purpose**: Orchestrate complete quality validation workflow
- **When to use**: Full system validation, release readiness assessment
- **Key features**:
  - Sequential execution of all test phases
  - Comprehensive reporting
  - Issue analysis and recommendations
  - Handoff readiness assessment

## Usage Examples

### Quick Health Check

```bash
cd local-dev-setup
./scripts/quality-check/immediate-health-check.sh
```

### API Testing

```bash
# Test all endpoints
./scripts/quality-check/api-smoke-test.sh

# Test specific endpoint
./scripts/quality-check/api-smoke-test.sh --endpoint steps

# Verbose mode for debugging
./scripts/quality-check/api-smoke-test.sh --verbose
```

### Full Quality Validation

```bash
# Run complete test suite with reporting
./scripts/quality-check/master-quality-check.sh
```

## Test Coverage

### API Endpoints

- ✅ `/users` - User management
- ✅ `/teams` - Team management
- ✅ `/steps` - Step instances and master steps
- ✅ `/steps/{id}/comments` - Comments as sub-resource
- ✅ `/comments/{id}` - Direct comment operations
- ✅ `/migrations` - Migration management
- ✅ `/environments` - Environment configuration
- ✅ `/labels` - Label management
- ✅ `/applications` - Application registry

### Validation Types

- **Functional**: Endpoint availability and response validation
- **Integration**: Database connectivity and query execution
- **Security**: Authentication and authorization
- **Performance**: Response time validation
- **Error Handling**: Improved error messages and diagnostics

## Recent Improvements (US-024)

### Comments Endpoint Enhancement

All comments endpoints now return helpful error messages instead of generic "Invalid comments endpoint":

- **GET /comments** → Guides to `/steps/{stepInstanceId}/comments`
- **POST /comments** → Shows correct creation pattern with example
- **PUT /comments/{id}** → Shows correct update pattern with example
- **DELETE /comments/{id}** → Shows correct deletion pattern

### Testing Consolidation

- **Before**: 8 scattered test scripts with 80% redundancy
- **After**: 4 organized scripts with clear purposes
- **Result**: 50% reduction in files, 100% functionality preserved

## Groovy Testing

### Test Locations

```
src/groovy/umig/tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── upgrade/        # Upgrade validation tests
└── apis/          # API-specific tests
```

### Running Groovy Tests

```bash
# Unit tests
./src/groovy/umig/tests/run-unit-tests.sh

# Integration tests
./src/groovy/umig/tests/run-integration-tests.sh

# All tests via phase-b script
./scripts/quality-check/phase-b-test-execution.sh
```

## Quality Gates

### Pass Criteria

- ✅ All API endpoints responding (200/201 status)
- ✅ Database connectivity verified
- ✅ Authentication working
- ✅ Error messages are helpful and actionable
- ✅ Groovy tests passing (>80% coverage)
- ✅ No critical issues identified

### Failure Handling

1. **Environment Issues**: Check Docker/Podman containers
2. **Database Issues**: Verify PostgreSQL and ScriptRunner pool configuration
3. **API Issues**: Check ScriptRunner script registration
4. **Test Issues**: Review logs in `test-results/` directory

## Best Practices

### Before Testing

1. Ensure environment is running: `npm start`
2. Run health check: `./scripts/quality-check/immediate-health-check.sh`
3. Verify database has test data: `npm run generate-data`

### During Testing

1. Use verbose mode for debugging issues
2. Test specific endpoints when troubleshooting
3. Check logs in `test-results/` for detailed output

### After Testing

1. Review master report for recommendations
2. Address any identified issues
3. Document any new test requirements

## Maintenance

### Adding New Tests

1. **API Tests**: Add to `api-smoke-test.sh` in appropriate category
2. **Groovy Tests**: Place in appropriate subdirectory under `src/groovy/umig/tests/`
3. **Integration**: Ensure new tests are called by `phase-b-test-execution.sh`

### Updating Error Messages

When improving error messages:

1. Update the API implementation
2. Add validation to `api-smoke-test.sh`
3. Document the improvement in this file

## Troubleshooting

### Common Issues

#### "Confluence not responding"

```bash
# Check container status
podman ps
# Restart if needed
npm run restart
```

#### "Database connection failed"

```bash
# Check PostgreSQL
PGPASSWORD=123456 psql -h localhost -p 5432 -U umig_app_user -d umig_app_db -c "SELECT 1;"
# Verify ScriptRunner pool configuration
```

#### "Invalid comments endpoint"

- This has been fixed! Endpoints now return helpful guidance
- If still seeing this, ensure StepsApi.groovy changes are deployed

## Related Documentation

- [Quality Check Procedures](./QUALITY_CHECK_PROCEDURES.md) - Generic validation procedures
- [API Documentation](../api/openapi.yaml) - OpenAPI specification
- [Solution Architecture](../solution-architecture.md) - System design and ADRs

---

_Last Updated: 2025-08-14_  
_Framework Version: 2.0 (Post US-024 Consolidation)_
