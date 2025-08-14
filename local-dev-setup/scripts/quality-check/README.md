# UMIG Quality Check System

## Overview

Consolidated quality validation system for the UMIG project, streamlined from 8 test scripts to 4 essential ones. This system provides comprehensive API validation, Groovy test execution, and environment health checking with improved error diagnostics.

## Recent Consolidation (US-024)

### What Changed
- **Test Scripts**: Consolidated from 8 scripts → 4 essential scripts (50% reduction)
- **Documentation**: Consolidated from 6 files → 3 files with better organization
- **Comments Endpoints**: Improved error messages to guide users to correct URL patterns
- **API Testing**: Unified all API endpoint testing into single `api-smoke-test.sh`

### Current Structure
```
quality-check/
├── immediate-health-check.sh      # Environment & database validation
├── api-smoke-test.sh              # Consolidated API endpoint testing
├── phase-b-test-execution.sh      # Groovy test suite runner
└── master-quality-check.sh        # Master orchestration script
```

## Quick Start

```bash
# From local-dev-setup/ directory

# 1. Quick health check first
./scripts/quality-check/immediate-health-check.sh

# 2. API endpoint testing (consolidated from 5 scripts)
./scripts/quality-check/api-smoke-test.sh

# 3. Full comprehensive validation (recommended)
./scripts/quality-check/master-quality-check.sh

# 4. Individual test phases if needed
./scripts/quality-check/phase-b-test-execution.sh   # Groovy test execution
```

## Script Descriptions

### 🩺 `immediate-health-check.sh`
**Purpose**: Pre-flight validation  
**Duration**: 30 seconds  
**Checks**: Environment, database, API connectivity, test files, scripts  
**Use**: Run first to ensure system readiness

### 🔥 `api-smoke-test.sh` (CONSOLIDATED)
**Purpose**: Comprehensive API endpoint testing  
**Duration**: 2-5 minutes  
**Features**:
- All UMIG API endpoints (users, teams, steps, comments, migrations, environments)
- Improved error message testing (especially comments endpoints)
- Diagnostic analysis for failures
- Verbose mode for debugging (`--verbose`)
- Endpoint-specific testing (`--endpoint steps`)
**Output**: Identifies working vs failing endpoints with helpful error guidance

### 🧪 `phase-b-test-execution.sh`
**Purpose**: Groovy test suite execution  
**Duration**: 10-20 minutes  
**Tests**: Unit, integration, upgrade validation tests  
**Output**: Complete validation of Groovy test frameworks

### 🎯 `master-quality-check.sh`
**Purpose**: Complete orchestrated quality validation  
**Duration**: 15-30 minutes  
**Process**: Runs all phases, analyzes results, provides recommendations  
**Output**: Master report with deployment readiness assessment

## Test Coverage

### API Endpoints (via api-smoke-test.sh)
- ✅ `/users` - User management
- ✅ `/teams` - Team management  
- ✅ `/steps` - Step instances and master steps
- ✅ `/steps/{id}/comments` - Comments as sub-resource (with improved error messages)
- ✅ `/comments/{id}` - Direct comment operations
- ✅ `/migrations` - Migration management
- ✅ `/environments` - Environment configuration
- ✅ `/labels` - Label management
- ✅ `/applications` - Application registry

### Groovy Test Suites (via phase-b-test-execution.sh)
- **Unit Tests**: Repository methods with real database
- **Integration Tests**: Complete API testing
- **Upgrade Tests**: Confluence/ScriptRunner compatibility validation
- **API Tests**: Endpoint-specific test suites

## Output Structure

```
test-results/
├── master-quality-check-TIMESTAMP/
│   ├── master-report.md              # Executive summary
│   ├── master-execution.log          # Complete execution log
│   ├── phase-a-results/              # Endpoint smoke test results
│   │   ├── summary.log
│   │   └── full-responses.log
│   └── phase-b-results/              # Test suite execution results
│       ├── execution-summary.log
│       ├── detailed-report.md
│       └── *-results.log            # Individual suite logs
├── phase-a-TIMESTAMP/                # Individual phase A results
└── phase-b-TIMESTAMP/                # Individual phase B results
```

## Quality Gates & Success Criteria

### API Testing Success Criteria
- ✅ All critical endpoints return valid HTTP responses (200-299)
- ✅ API endpoints properly registered in ScriptRunner
- ✅ Query parameters work correctly
- ✅ Error responses provide helpful guidance (not generic messages)
- ✅ Authentication and authorization working

### Groovy Test Success Criteria  
- ✅ Unit tests: 100% pass rate with real database
- ✅ Integration tests: All endpoints validated end-to-end
- ✅ Performance: <200ms simple queries, <500ms complex
- ✅ Compatibility: No regression in existing functionality
- ✅ Coverage: >80% test coverage achieved

### Deployment Readiness Assessment
- **READY**: All tests pass, performance meets targets
- **CONDITIONAL**: Minor issues that don't block integration
- **BLOCKED**: Critical issues that must be resolved first

## Common Issues & Solutions

### Environment Issues
- **Problem**: "Confluence not responding"
- **Solution**: Run `npm start` and wait 30+ seconds for initialization

### Database Issues  
- **Problem**: "DatabaseUtil.withSql connectivity failed"
- **Solution**: Verify PostgreSQL container is running, check connection pooling

### Endpoint Issues
- **Problem**: "Invalid comments endpoint"
- **Solution**: This has been fixed! Error messages now guide users to correct URL patterns:
  - Use `/steps/{stepInstanceId}/comments` for accessing comments
  - Direct comment operations via `/comments/{id}` for updates/deletes

### Test Suite Issues
- **Problem**: "Test file not found"
- **Solution**: Verify all test files are present, check file paths in test scripts

## Performance Benchmarks

### Target Performance (ADR-031)
- **Simple queries**: <200ms response time
- **Complex hierarchical queries**: <500ms response time
- **Bulk operations**: <1s for reasonable batch sizes
- **Dashboard aggregations**: <1s for summary statistics

### Load Testing Scenarios
- **Concurrent users**: 10 simultaneous requests
- **Large datasets**: 1000+ step instances
- **Memory usage**: Within JVM limits
- **Connection pooling**: Efficient resource usage

## Integration with Development Workflow

### Pre-Development
```bash
./immediate-health-check.sh  # Verify environment ready
```

### Post-Implementation
```bash
./phase-a-smoke-tests.sh     # Quick validation of changes
```

### Pre-Deployment
```bash
./master-quality-check.sh    # Comprehensive validation
```

### Continuous Integration
- All scripts designed for CI/CD integration
- Exit codes indicate success/failure/warnings
- Structured output for automated processing
- Results suitable for quality dashboards

## Troubleshooting

### Script Execution Issues

```bash
# Make scripts executable
chmod +x scripts/quality-check/*.sh

# Verify working directory
pwd  # Should be in local-dev-setup/

# Check environment
npm run status

# Manual endpoint test
curl http://localhost:8090/rest/scriptrunner/latest/custom/steps
```

### Results Analysis

```bash
# View latest results
ls -la test-results/

# Quick summary check
cat test-results/master-quality-check-*/master-report.md

# Detailed error analysis  
grep -r "ERROR\|FAIL" test-results/master-quality-check-*/
```

## Usage Examples

### Testing Specific Endpoints
```bash
# Test only steps endpoints
./scripts/quality-check/api-smoke-test.sh --endpoint steps

# Verbose mode for debugging
./scripts/quality-check/api-smoke-test.sh --verbose

# Test comments functionality
./scripts/quality-check/api-smoke-test.sh --endpoint comments
```

### Running Groovy Tests
```bash
# Direct Groovy test execution
./src/groovy/umig/tests/run-unit-tests.sh
./src/groovy/umig/tests/run-integration-tests.sh

# Via quality check script
./scripts/quality-check/phase-b-test-execution.sh
```

## Related Documentation

- **Testing Framework**: `/docs/testing/TESTING_FRAMEWORK.md` - Complete testing overview
- **Quality Procedures**: `/docs/testing/QUALITY_CHECK_PROCEDURES.md` - Reusable validation procedures
- **Validation Reports**: `/docs/testing/archives/` - Historical test results
- **API Documentation**: `/docs/api/openapi.yaml` - OpenAPI specification

## Maintenance

### Adding New API Tests
1. Edit `api-smoke-test.sh` to add new endpoint tests
2. Follow existing pattern for consistent output
3. Update this README with new coverage

### Updating Groovy Tests
1. Add tests to appropriate directory under `/src/groovy/umig/tests/`
2. Ensure `phase-b-test-execution.sh` includes new test suites
3. Document new test coverage

## Support

- **Documentation**: Consolidated in `/docs/testing/` directory
- **Results Analysis**: Detailed logs in `test-results/` directory
- **Error Messages**: Improved to provide actionable guidance
- **Best Practices**: See QUALITY_CHECK_PROCEDURES.md for templates

---

**Version**: 2.0  
**Updated**: August 14, 2025  
**Changes**: Post US-024 consolidation - reduced from 8 to 4 scripts  
**Impact**: Streamlined testing with improved error diagnostics and documentation