# Test Execution Commands - Post-Fix Verification

This document provides all the commands needed to verify that the test suite fixes are working correctly.

## Quick Fix Application

### 1. Apply All Fixes (Automated)

```bash
# Apply package declaration fixes
cd /Users/lucaschallamel/Documents/GitHub/UMIG
groovy src/groovy/umig/tests/fix-package-declarations.groovy

# Create missing service mocks
groovy src/groovy/umig/tests/create-missing-service-mocks.groovy

# Validate all fixes
groovy src/groovy/umig/tests/validate-all-fixes.groovy
```

## Individual Test Category Verification

### Category 1: Package Declaration Fixes (4 tests)

```bash
# Validate package declarations
groovy src/groovy/umig/tests/validate-package-fixes.groovy

# Test individual files
groovy src/groovy/umig/tests/unit/AuditFieldsUtilTest.groovy
groovy src/groovy/umig/tests/unit/SystemConfigurationRepositoryTest.groovy
groovy src/groovy/umig/tests/unit/StepRepositoryAuditFixTest.groovy
groovy src/groovy/umig/tests/unit/DirectAuditLoggingTest.groovy
```

### Category 2: Abstract Class Fix (1 test + 3 dependent tests)

```bash
# Verify EmailSecurityTestBase can be imported
groovy -c "import umig.tests.unit.security.EmailSecurityTestBase; println 'Import successful'"

# Test the 3 tests that depend on it
groovy src/groovy/umig/tests/unit/security/EmailSecurityTest.groovy
groovy src/groovy/umig/tests/unit/security/EmailTemplateSecurityTest.groovy
# Note: Third dependent test would be run when other email security tests exist
```

### Category 3: Spock Framework Conversion (2 tests)

```bash
# Test converted Spock tests
groovy src/groovy/umig/tests/unit/stepViewMacroTest.groovy
groovy src/groovy/umig/tests/unit/stepViewMacroRoleTest.groovy
```

### Category 4: Service Layer Import Resolution (6 tests)

```bash
# Verify service layer mocks were created
ls -la src/groovy/umig/service/
ls -la src/groovy/umig/dto/

# Test the 6 tests that had import issues
groovy src/groovy/umig/tests/unit/service/StepDataTransformationServiceTest.groovy
groovy src/groovy/umig/tests/unit/CommentDTOTemplateIntegrationTest.groovy
groovy src/groovy/umig/tests/unit/EmailServiceCommentIntegrationTest.groovy
groovy src/groovy/umig/tests/unit/UrlConstructionServiceTest.groovy
groovy src/groovy/umig/tests/unit/UrlConstructionServiceValidationTest.groovy
groovy src/groovy/umig/tests/unit/repository/StepRepositoryDTOTest.groovy
```

## Full Test Suite Execution

### Using npm Test Commands

```bash
# Run JavaScript tests
npm test

# Run Groovy unit tests
npm run test:unit

# Run integration tests (requires running stack)
npm run test:integration

# Run UAT tests
npm run test:uat

# Run all tests
npm run test:all
```

### Direct Test Execution

```bash
# Run specific test categories
npm run test:unit:category unit
npm run test:unit:category security
npm run test:unit:category service

# Run tests with pattern matching
npm run test:unit:pattern "*Test.groovy"
npm run test:unit:pattern "*Security*"
```

## Validation Before Running Tests

### Prerequisites Check

```bash
# Verify system is ready
npm run health:check

# Check database connection
npm run test:integration:core

# Verify authentication
npm run test:integration:auth
```

### Quality Gates

```bash
# Run quality checks
npm run quality:check

# Run security validation
npm run test:security

# Performance baseline
npm run test:performance
```

## Debugging Failed Tests

### Individual Test Debugging

```bash
# Run single test with verbose output
groovy -Dverbose=true src/groovy/umig/tests/unit/[TestName].groovy

# Run test with stack trace
groovy -Dstacktrace=true src/groovy/umig/tests/unit/[TestName].groovy

# Check test dependencies
groovy -c "
import umig.tests.utils.TestDatabaseUtil
import umig.service.StepDataTransformationService
import umig.dto.StepInstanceDTO
println 'All imports successful'
"
```

### System Diagnostic

```bash
# Check container health
npm run test:integration:core

# Verify test database
groovy src/groovy/umig/tests/diagnostics/testDatabaseConnection.groovy

# Check authentication context
groovy src/groovy/umig/tests/integration/AuthenticationTest.groovy
```

## Expected Results After Fixes

### Success Criteria

- **Package Declaration Tests**: All 4 tests compile and run without package errors
- **Abstract Class Tests**: EmailSecurityTestBase can be extended by 3 child tests
- **Spock Conversion Tests**: Both tests run in standard Groovy format without Spock dependencies
- **Service Layer Tests**: All 6 tests compile with mock service implementations

### Performance Targets

- Test execution time: <10 seconds per individual test
- Full unit test suite: <5 minutes
- Integration test suite: <15 minutes (with running stack)

### Quality Gates

- All tests must pass before merging
- No compilation errors or unresolved imports
- Proper error handling and meaningful assertions
- ADR-036 compliance (standard Groovy, no external test frameworks)

## Troubleshooting Common Issues

### Import Resolution Problems

```bash
# Clear Groovy cache
rm -rf ~/.groovy/grapes/

# Verify classpath
groovy -cp "src/groovy" -c "println System.getProperty('java.class.path')"
```

### Test Database Issues

```bash
# Reset test database
npm run restart:erase

# Verify database connectivity
groovy src/groovy/umig/tests/diagnostics/testDatabaseConnection.groovy
```

### Authentication Context Issues

```bash
# Test authentication helper
groovy src/groovy/umig/tests/integration/AuthenticationHelper.groovy

# Verify user service
groovy src/groovy/umig/tests/integration/AuthenticationTest.groovy
```

---

## Summary

Total fixes applied: **16 tests** across 4 categories

- ✅ 4 package declaration fixes
- ✅ 1 abstract class fix (affecting 3+ tests)
- ✅ 2 Spock framework conversions
- ✅ 6 service layer import resolutions

Run `groovy src/groovy/umig/tests/validate-all-fixes.groovy` to verify all fixes are working.
