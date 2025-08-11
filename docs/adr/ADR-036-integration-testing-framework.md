# ADR-036: Integration Testing Framework

## Status

**Status**: Accepted  
**Date**: 2025-08-11  
**Author**: Development Team  
**Implementation**: US-025 Phase 4 - MigrationsAPI Integration Testing

## Context

During US-025 Phase 4, we needed to implement comprehensive integration testing for the MigrationsAPI to ensure proper functionality across all CRUD operations, dashboard endpoints, and error handling scenarios. The existing testing infrastructure primarily focused on unit tests, but we required end-to-end API testing with real HTTP requests and database interactions.

Key requirements:

1. **Real HTTP Testing**: Test actual REST endpoints with proper authentication
2. **Database Integration**: Validate database operations and transactions
3. **Error Handling**: Test SQL state mappings and error responses
4. **Dynamic Credentials**: Load configuration from environment files
5. **Pure Groovy Approach**: Avoid shell script dependencies for better IDE integration

## Decision

We will implement a **pure Groovy integration testing framework** using RESTClient for HTTP operations and dynamic credential loading from environment files.

### Core Architecture

#### 1. Pure Groovy Testing Framework

```groovy
@Grab('org.codehaus.groovy.modules.http-builder:http-builder:0.7.1')
import groovyx.net.http.RESTClient
import groovyx.net.http.HttpResponseException
import java.util.concurrent.ThreadLocalRandom
```

#### 2. Dynamic Environment Loading

```groovy
def loadEnvironmentVariables() {
    def envFile = new File('.env')
    if (envFile.exists()) {
        envFile.readLines().each { line ->
            if (line.contains('=') && !line.startsWith('#')) {
                def (key, value) = line.split('=', 2)
                System.setProperty(key.trim(), value.trim())
            }
        }
    }
}
```

#### 3. HTTP Basic Authentication Pattern

```groovy
def setupRestClient() {
    def confluenceUrl = System.getProperty('CONFLUENCE_URL', 'http://localhost:8090')
    def client = new RESTClient("${confluenceUrl}/")

    def username = System.getProperty('CONFLUENCE_USERNAME', 'admin')
    def password = System.getProperty('CONFLUENCE_PASSWORD', 'admin')

    def credentials = "${username}:${password}".bytes.encodeBase64().toString()
    client.defaultRequestHeaders['Authorization'] = "Basic ${credentials}"
    client.defaultRequestHeaders['Content-Type'] = 'application/json'

    return client
}
```

#### 4. Comprehensive Test Coverage

**CRUD Operations Testing**:

- List migrations (GET /migrations)
- Get by ID (GET /migrations/{id})
- Create migration (POST /migrations)
- Update migration (PUT /migrations/{id})
- Delete migration (DELETE /migrations/{id})

**Dashboard Endpoints Testing**:

- Migration summary (GET /migrations/summary)
- Migration progress (GET /migrations/{id}/progress)
- Migration metrics (GET /migrations/metrics)

**Error Handling Validation**:

- SQL state to HTTP status mappings (23503→400, 23505→409)
- Invalid parameter handling
- Authentication failures

#### 5. Test Data Management

```groovy
def generateTestData() {
    def timestamp = System.currentTimeMillis()
    return [
        mig_name: "Integration Test Migration " + timestamp.toString(),
        mig_description: "Integration test description",
        mig_type: "MIGRATION",
        mig_status: "PLANNING"
    ]
}
```

## Implementation Details

### Test Structure Pattern

```groovy
class MigrationApiIntegrationTest {
    static RESTClient client
    static def testMigrationId

    static void main(String[] args) {
        try {
            loadEnvironmentVariables()
            client = setupRestClient()

            // Execute all test methods
            testListMigrations()
            testCreateMigration()
            testGetMigrationById()
            testUpdateMigration()
            testDeleteMigration()
            testDashboardEndpoints()
            testErrorHandling()

            println "All tests passed! ✅"
        } catch (Exception e) {
            println "Test failed: ${e.message}"
            e.printStackTrace()
        }
    }
}
```

### Error Handling Pattern

```groovy
static void testErrorHandling() {
    try {
        // Test invalid ID format
        client.get(path: "rest/scriptrunner/latest/custom/migrations/invalid-id")
        throw new RuntimeException("Expected 400 error for invalid ID")
    } catch (HttpResponseException e) {
        assert e.statusCode == 400, "Expected 400 for invalid ID, got ${e.statusCode}"
        println "✅ Invalid ID handling: ${e.statusCode}"
    }
}
```

### Data Serialization Best Practices

**Critical Fix**: Avoid GString interpolation in JSON payloads to prevent field overflow:

```groovy
// ❌ Avoid this - causes GString serialization issues
mig_name: "Integration Test Migration ${timestamp}",

// ✅ Use this - explicit string concatenation
mig_name: "Integration Test Migration " + timestamp.toString(),
```

## Consequences

### Positive

- **IDE Integration**: Pure Groovy approach works seamlessly in IDEs
- **Database Validation**: Tests validate actual database operations and constraints
- **Authentication Testing**: Validates security layer integration
- **Real Environment**: Tests against actual Confluence/ScriptRunner environment
- **Error Coverage**: Comprehensive error scenario testing
- **Dynamic Configuration**: Environment-based configuration for flexibility
- **Type Safety**: Explicit type handling prevents casting issues

### Negative

- **Environment Dependency**: Requires running Confluence instance
- **Test Data**: Creates actual test data that needs cleanup
- **Network Dependency**: Requires network connectivity to test endpoints
- **Slower Execution**: Integration tests are slower than unit tests

### Neutral

- **Groovy Dependencies**: Uses @Grab for HTTP client dependencies
- **Manual Execution**: Tests run via `groovy` command rather than test runner

## Migration Strategy

### Phase 1: Framework Implementation ✅

1. Create MigrationApiIntegrationTest.groovy
2. Implement pure Groovy HTTP testing framework
3. Add dynamic environment loading
4. Implement comprehensive test coverage

### Phase 2: Bug Fixes ✅

1. Fix mig_type casting issue (Integer → String)
2. Fix GString serialization in JSON payloads
3. Resolve authentication integration issues

### Phase 3: Validation ✅

1. Execute complete test suite (9 tests)
2. Achieve 100% test success rate
3. Document testing patterns and best practices

## Testing Results

**US-025 Phase 4 Results**:

- **Total Tests**: 9 integration tests
- **Success Rate**: 100% (all tests passing)
- **Coverage**: All CRUD operations, dashboard endpoints, error scenarios
- **Critical Bugs Fixed**: 2 (mig_type casting, GString serialization)
- **Authentication**: HTTP Basic Auth validated

## Related ADRs

- **ADR-031**: Groovy Type Safety - Integration tests validate explicit casting patterns
- **ADR-034**: Liquibase SQL Compatibility - Tests validate database constraint behavior
- **ADR-035**: Status Field Normalization - Tests validate status field handling

## References

- User Story US-025: MigrationsAPI Integration Testing
- Implementation File: `src/groovy/umig/tests/apis/MigrationApiIntegrationTest.groovy`
- Environment Configuration: `.env` file with CONFLUENCE\_\* variables
- Execution Command: `groovy MigrationApiIntegrationTest.groovy`

## Notes

This framework establishes the pattern for all future API integration testing in UMIG:

1. **Pure Groovy Approach**: Eliminates shell script dependencies
2. **Environment Integration**: Dynamic credential loading from `.env`
3. **Comprehensive Coverage**: Tests all endpoint types and error scenarios
4. **Type Safety**: Validates ADR-031 type casting requirements
5. **Real Integration**: Tests against actual Confluence/ScriptRunner environment

The successful implementation of this framework for MigrationsAPI provides a reusable template for testing all other API endpoints (Teams, Plans, Sequences, etc.) with consistent patterns and quality standards.
