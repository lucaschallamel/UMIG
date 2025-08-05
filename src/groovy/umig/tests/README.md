# Testing Guide (UMIG)

This folder contains all Groovy-based tests for the UMIG project.

## 🎯 MANDATORY Testing Standards

### Groovy Version Constraint
**MANDATORY**: All UMIG tests MUST be compatible with **Groovy 3.0.15**

**Rationale**:
- ScriptRunner for Confluence requires Groovy 3.0.x compatibility  
- Production environment uses Groovy 3.0.15
- Consistency across development, testing, and production environments

### Framework Version Requirements

#### Spock Framework
- **Required Version**: `2.3-groovy-3.0`
- **Forbidden**: `2.3-groovy-4.0` or any groovy-4.0 variants
- **Template**:
  ```groovy
  @Grab('org.spockframework:spock-core:2.3-groovy-3.0')
  ```

#### Database Testing
- **PostgreSQL JDBC**: `org.postgresql:postgresql:42.7.3`
- **Connection**: Use `localhost` hostname, NOT `postgres`

#### REST API Testing
- **Rest Assured**: `io.rest-assured:rest-assured:5.3.2`
- **JSON Path**: `io.rest-assured:json-path:5.3.2`

### Standard Test Dependencies Template
```groovy
#!/usr/bin/env groovy
/**
 * UMIG Standard Test Dependencies - Groovy 3.0 Compatible
 */

@Grab('org.spockframework:spock-core:2.3-groovy-3.0')
@Grab('org.postgresql:postgresql:42.7.3')
@Grab('io.rest-assured:rest-assured:5.3.2')
@Grab('io.rest-assured:json-path:5.3.2')

// Your test code here
```

## Structure
- `unit/`: Unit tests with mocked dependencies using Spock framework
- `integration/`: Integration tests requiring live database connections
- `run-unit-tests.sh`: Unit test runner script
- `run-integration-tests.sh`: Integration test runner script

### Diagnostic Tools
- `checkEnvironmentAssociations.groovy`: General environment association validation
- `checkCutoverProdEnvironments.groovy`: CUTOVER-specific environment checks
- `compareEnvironmentAssignments.groovy`: Environment rule compliance verification

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

### Compliance Validation

#### Pre-Test Checklist
1. ✅ Spock version is `2.3-groovy-3.0` (not groovy-4.0)
2. ✅ Database connection uses `localhost`
3. ✅ All @Grab annotations specify Groovy 3.0 compatible versions
4. ✅ Test can run with `groovy --version` showing 3.0.15

#### Test Execution Validation
```bash
# Verify Groovy version
groovy --version
# Should show: Groovy Version: 3.0.15

# Run unit tests
./src/groovy/umig/tests/run-unit-tests.sh

# Run integration tests  
./src/groovy/umig/tests/run-integration-tests.sh
```

## Common Issues and Solutions

### Issue: Spock 2.3-groovy-4.0 Incompatibility
**Error**: "Spock 2.3.0-groovy-4.0 is not compatible with Groovy 3.0.15"
**Solution**: 
1. Change to `@Grab('org.spockframework:spock-core:2.3-groovy-3.0')`
2. Clear cache: `rm -rf ~/.groovy/grapes/org.spockframework/`

### Issue: Database Connection Failed
**Error**: "java.net.UnknownHostException: postgres"
**Solution**: Use `localhost` instead of `postgres` in connection strings:
```groovy
// ✅ Correct - Use localhost
def dbUrl = "jdbc:postgresql://localhost:5432/umig_app_db"

// ❌ Wrong - Will fail in test environment
def dbUrl = "jdbc:postgresql://postgres:5432/umig_app_db"
```

### Issue: Version Conflicts
**Error**: Various dependency resolution errors
**Solution**: Ensure ALL dependencies are Groovy 3.0 compatible

## Test Coverage

### Instructions API Tests (US-004)

#### Unit Tests Created
1. **InstructionRepositoryDeleteInstanceSpec.groovy**
   - ✅ Successful deletion of instruction instance
   - ✅ Return 0 when instance not found  
   - ✅ Null ID validation (throws IllegalArgumentException)
   - ✅ Foreign key constraint handling (SQL state 23503)
   - ✅ General SQL exception handling
   - ✅ ADR-026 compliance (exact SQL query validation)
   - ✅ Type safety validation (ADR-031)
   - ✅ Performance testing
   - ✅ Concurrent deletion handling

2. **InstructionRepositoryNegativeDurationSpec.groovy**
   - ✅ Reject negative duration in createMasterInstruction
   - ✅ Accept zero duration (valid edge case)
   - ✅ Accept positive duration values
   - ✅ Handle null duration gracefully
   - ✅ Reject negative duration in updateMasterInstruction
   - ✅ Comprehensive parameterized tests with @Unroll
   - ✅ Type conversion edge cases
   - ✅ Early validation (before SQL execution)

#### Integration Tests Created
3. **InstructionsApiDeleteIntegrationTest.groovy**
   - **DELETE /instructions/instance/{id}**
     - ✅ Successful deletion (204 No Content)
     - ✅ 404 for non-existent instance
     - ✅ 400 for invalid UUID format
     - ✅ Database verification after deletion
   
   - **DELETE /instructions/master/{id}**
     - ✅ Successful deletion with cascade
     - ✅ Verification of instance cascade deletion
     - ✅ Foreign key constraint handling
   
   - **DELETE /instructions/bulk**
     - ✅ Multiple instance deletion
     - ✅ Partial failure handling (mix of valid/invalid IDs)
     - ✅ Request body validation
     - ✅ Error detail reporting
   
   - **Authorization & Security**
     - ✅ 401 Unauthorized without token
     - ✅ AuthenticationService integration verification

#### Code Improvements Validated
1. **Method Extraction (InstructionsApi.groovy)**
   - Large methods refactored into smaller handlers
   - Improved code organization and maintainability
   - Each handler method has focused responsibility

2. **Missing Functionality (InstructionRepository.groovy)**
   - `deleteInstanceInstruction` method implemented
   - `deleteMasterInstruction` method implemented
   - Proper error handling with SQL state mapping
   - Cascade deletion support

3. **Validation Enhancement**
   - Negative duration validation added
   - Validation occurs before SQL execution
   - Clear error messages for invalid input

4. **Security Improvement (AuthenticationService.groovy)**
   - Centralized user authentication
   - Configurable system user
   - Environment variable support
   - Fallback handling for anonymous users

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

## ADR Compliance

### ADR-026: Specific SQL Query Validation
All repository tests MUST validate exact SQL queries:
```groovy
// ✅ Correct - Validate specific SQL
def sql = Mock(Sql)
1 * sql.executeUpdate("DELETE FROM instructions_instance_ini WHERE ini_id = :iniId", [iniId: testId])
```

### ADR-031: Type Safety
All parameter casting must be explicit:
```groovy
// ✅ Correct - Explicit casting
params.instructionId = UUID.fromString(id as String)
params.teamId = Integer.parseInt(teamId as String)
```

### ADR-030: Hierarchical Filtering
All tests respect hierarchical filtering patterns in the APIs.

## Test Data Management
- Complete hierarchy creation for realistic testing
- Proper cleanup in reverse order (foreign keys)
- Test isolation with 'test' user marker

## Coverage Metrics
- Repository methods: 100% coverage for new functionality
- API endpoints: 100% coverage for DELETE operations  
- Error scenarios: Comprehensive edge case coverage
- Security: Authentication and authorization validated

## How Dependencies are Managed (Grape)

Our Groovy scripts require a PostgreSQL JDBC driver to connect to the database. We use **Grape**, Groovy's built-in dependency manager, to handle this.

- The first time a script requiring the driver is run, Grape will automatically download it and cache it locally (typically in `~/.groovy/grapes/`).
- The `run-integration-tests.sh` script points directly to this cached driver. If the path changes or the driver is not found, you may need to update the `JDBC_DRIVER_PATH` variable in the script.

### Troubleshooting: Ensuring the JDBC Driver is Downloaded

If you see an error like:

```
❌ Error: PostgreSQL JDBC driver not found at ~/.groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.3.jar
```

You need to trigger Grape to download the JDBC driver manually. Run this script from the `tests/` directory:

1. Create a file called `grab-postgres-jdbc.groovy` with the following contents:

    ```groovy
    @Grab('org.postgresql:postgresql:42.7.3')
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

## Adding New Tests

### Adding a New Integration Test

1. Create your new test script file in the `tests/integration/` directory.
2. Follow the pattern in `PlansApiIntegrationTest.groovy` for loading credentials and connecting to the database.
3. **MANDATORY**: Use the standard dependencies template with Groovy 3.0 versions
4. **MANDATORY**: Use `localhost` for database connections
5. Add a new line to the `run-integration-tests.sh` script to execute your new test.

### Adding a New Unit Test

1. Create your new test class in the `tests/unit/` directory using Spock framework.
2. **MANDATORY**: Use `@Grab('org.spockframework:spock-core:2.3-groovy-3.0')`
3. Follow ADR-026 requirements for specific SQL mocks (no generic matchers).
4. Add test execution to the `run-unit-tests.sh` script.

## Enforcement

- All pull requests MUST include test compatibility verification
- Tests failing due to version incompatibility will not be merged
- Regular audits of test dependencies to ensure Groovy 3.0 compliance

## Documentation Updates

When creating new tests:
1. Update this document if new standards are established
2. Document any new dependency versions
3. Update test coverage metrics
4. Record any environment-specific requirements

---

**Document Version**: 2.0  
**Last Updated**: January 25, 2025  
**Standards Compliance**: Groovy 3.0.15 Mandatory