# Test Consolidation Plan

## Overview

This document outlines the consolidation plan for the UMIG test suite, addressing the Groovy 3.0.x compatibility issues with ScriptRunner 8 and organizing our test structure.

## Files to Remove

The following temporary/experimental files were created during dependency troubleshooting and should be removed:

### Unit Test Files

- `unit/SimpleTest.groovy` - Basic test to verify Spock setup
- `unit/api/v2/InstructionsApiMinimalSpec.groovy` - Minimal test without JAX-RS
- `unit/api/v2/InstructionsApiTestSimple.groovy` - Simple test attempt

### Duplicate/Obsolete Scripts

- `run-unit-tests-fixed.sh` - Temporary fix attempt
- `run-unit-tests-with-classpath.sh` - Alternative classpath approach
- `download-test-dependencies.groovy` - Manual dependency download

## Files to Keep and Maintain

### Core Test Files

#### Unit Tests (Working Versions)

- `unit/api/v2/InstructionsApiWorkingTest.groovy` - Working unit test without Grape issues
- `unit/api/v2/MockResponse.groovy` - Mock response utility
- `unit/api/v2/InstructionsApiSpec.groovy` - Original Spock spec (reference only)

#### Integration Tests

- `integration/InstructionsApiIntegrationTestWorking.groovy` - Fully functional integration test
- Other integration tests remain unchanged

#### Test Scripts

- `run-unit-tests.sh` - Main unit test runner (updated with SDKMAN)
- `run-integration-tests.sh` - Integration test runner

## Recommended Structure

```
tests/
├── unit/
│   ├── api/
│   │   └── v2/
│   │       ├── InstructionsApiTest.groovy    (rename from InstructionsApiWorkingTest)
│   │       ├── MockResponse.groovy
│   │       └── [Other API tests]
│   └── repository/
│       └── [Repository tests]
├── integration/
│   ├── api/
│   │   └── v2/
│   │       └── InstructionsApiIntegrationTest.groovy (rename from InstructionsApiIntegrationTestWorking)
│   └── [Other integration tests]
├── run-unit-tests.sh
├── run-integration-tests.sh
└── README.md (new - test documentation)
```

## Test Strategy

### Unit Tests

- Use the working pattern from `InstructionsApiWorkingTest.groovy`
- Avoid problematic JAX-RS dependencies with Groovy 3.0.x
- Mock responses using `MockResponse` utility

### Integration Tests

- Use direct database connections with PostgreSQL driver
- Test actual API behavior against real database
- Follow pattern from `InstructionsApiIntegrationTestWorking.groovy`

## Groovy 3.0.x Compatibility Notes

### Working Dependencies

```groovy
@Grab('org.postgresql:postgresql:42.7.3')
@Grab('org.codehaus.groovy:groovy-sql:3.0.15')
```

### Problematic Dependencies (Avoid)

```groovy
@Grab('javax.ws.rs:javax.ws.rs-api:2.1.1')  // Causes Grape to hang
@Grab('org.codehaus.groovy.modules.http-builder:http-builder:0.7.1')  // Version conflicts
```

## Action Items

1. Remove temporary test files
2. Rename working test files to proper names
3. Update test scripts to reference correct files
4. Create README.md with test documentation
5. Update CI/CD pipeline if needed
