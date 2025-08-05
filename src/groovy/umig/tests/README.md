# Testing Guide (UMIG)

This folder contains all Groovy-based tests for the UMIG project.

## Structure
- `apis/`: Unit tests for individual API endpoints
- `unit/`: Unit tests with mocked dependencies (simplified due to Groovy 3.0.x constraints)
- `integration/`: Integration tests requiring live database connections
- `grab-postgres-jdbc.groovy`: JDBC driver dependency setup
- `run-integration-tests.sh`: Integration test runner script
- `run-unit-tests.sh`: Unit test runner script

### Diagnostic Tools
- `checkEnvironmentAssociations.groovy`: General environment association validation
- `checkCutoverProdEnvironments.groovy`: CUTOVER-specific environment checks
- `compareEnvironmentAssignments.groovy`: Environment rule compliance verification
- `checkEnvironmentAssociations.sql`: Manual SQL queries for troubleshooting

## Prerequisites

Before running these tests, ensure you have the following installed and configured:

1. **Groovy 3.0.15**: Required for ScriptRunner 8 compatibility. Install via SDKMAN:
    ```bash
    curl -s "https://get.sdkman.io" | bash
    source "$HOME/.sdkman/bin/sdkman-init.sh"
    sdk install groovy 3.0.15
    sdk use groovy 3.0.15
    ```

2. **Running Local Environment**: The full UMIG development stack (Confluence, PostgreSQL) must be running via Podman. Refer to the main `README.md` in the project root for setup instructions.

3. **`.env` File**: The integration tests read database credentials directly from the `.env` file located at `local-dev-setup/.env`. Ensure this file exists and contains the correct `UMIG_DB_USER`, `UMIG_DB_PASSWORD`, and `UMIG_DB_NAME` variables.

## Running Tests

### Unit Tests

Unit tests use Spock framework and mock all external dependencies. From the **root of the project**, run:

```bash
./src/groovy/umig/tests/run-unit-tests.sh
```

### Integration Tests

Integration tests require the full development environment to be running. From the **root of the project**, run:

```bash
./src/groovy/umig/tests/run-integration-tests.sh
```

### How Dependencies are Managed (Grape)

Our Groovy scripts require a PostgreSQL JDBC driver to connect to the database. We use **Grape**, Groovy's built-in dependency manager, to handle this.

- The first time a script requiring the driver is run, Grape will automatically download it and cache it locally (typically in `~/.groovy/grapes/`).
- The `run-integration-tests.sh` script points directly to this cached driver. If the path changes or the driver is not found, you may need to update the `JDBC_DRIVER_PATH` variable in the script.

### Troubleshooting: Ensuring the JDBC Driver is Downloaded

If you see an error like:

```
❌ Error: PostgreSQL JDBC driver not found at ~/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.2.20.jar
```

You need to trigger Grape to download the JDBC driver manually. Run this script from the `tests/` directory:

1. Create a file called `grab-postgres-jdbc.groovy` with the following contents:

    ```groovy
    @Grab('org.postgresql:postgresql:42.2.20')
    import org.postgresql.Driver

    println "✅  PostgreSQL JDBC driver downloaded via Grape."
    ```

2. Run the script:

    ```bash
    groovy grab-postgres-jdbc.groovy
    ```

This will download the driver to the correct location. You should see:

```
✅  PostgreSQL JDBC driver downloaded via Grape.
```

You can now re-run the integration tests.

## Groovy 3.0.x Compatibility Notes

### Known Issues
ScriptRunner 8 uses Groovy 3.0.x, which has dependency resolution issues with certain libraries:
- **JAX-RS API (javax.ws.rs:javax.ws.rs-api)**: Causes Grape to hang indefinitely
- **HTTP Builder**: Version conflicts with Groovy 3.0.x

### Working Pattern for Unit Tests
Due to dependency constraints, unit tests use a simplified pattern without Spock:

```groovy
#!/usr/bin/env groovy

@Grab('org.postgresql:postgresql:42.7.3')

import groovy.json.JsonBuilder

// Mock response utility
class MockResponse {
    static ok(content) {
        return [status: 200, entity: content]
    }
}

// Test class
class ApiTest {
    static void testEndpoint() {
        def response = MockResponse.ok(new JsonBuilder([
            data: expectedData
        ]).toString())
        
        assert response.status == 200
        println "✅ Test passed"
    }
}

ApiTest.testEndpoint()
```

### Working Dependencies
- `org.postgresql:postgresql:42.7.3` - PostgreSQL driver
- `org.codehaus.groovy:groovy-sql:3.0.15` - Groovy SQL support

## Test Coverage

### Instructions API Tests
- **Unit Tests**: `unit/api/v2/InstructionsApiWorkingTest.groovy`
  - Simplified unit tests without JAX-RS dependencies
  - Mock response testing
  - ADR-031 type safety compliance

- **Integration Tests**: `integration/InstructionsApiIntegrationTestWorking.groovy`
  - Full CRUD operations testing
  - Hierarchical filtering validation
  - Database constraint testing
  - Complete test data cleanup

### Sequences API Tests (US-002)

- **Unit Tests**: `unit/SequenceRepositoryTest.groovy`
  - 25+ test methods covering all repository operations
  - ADR-026 compliant specific SQL mocks
  - Circular dependency validation testing
  - Type safety validation (ADR-031)
  - Error handling scenarios

- **Integration Tests**: `integration/SequencesApiIntegrationTest.groovy`
  - 20 comprehensive test scenarios
  - CRUD operations for master and instance sequences
  - Hierarchical filtering (migration, iteration, plan, team)
  - Ordering operations and bulk reordering
  - Error handling and constraint validation
  - Live database testing with complete cleanup

### Plans API Tests

- **Integration Tests**: `integration/PlansApiIntegrationTest.groovy`
  - 13 test scenarios covering CRUD operations
  - Hierarchical filtering and status management
  - Error handling for invalid data

## Adding a New Integration Test

1. Create your new test script file in the `tests/integration/` directory.
2. Follow the pattern in `PlansApiIntegrationTest.groovy` for loading credentials and connecting to the database.
3. Add a new line to the `run-integration-tests.sh` script to execute your new test.

## Adding a New Unit Test

1. Create your new test class in the `tests/unit/` directory using Spock framework.
2. Follow ADR-026 requirements for specific SQL mocks (no generic matchers).
3. Add test execution to the `run-unit-tests.sh` script.
