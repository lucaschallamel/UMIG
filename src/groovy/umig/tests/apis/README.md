# API Tests

**Purpose**: Comprehensive REST API endpoint validation, contracts, and functionality testing

## Files

```
apis/
├── README.md                       # This file (includes Groovy development guide)
├── MigrationApiIntegrationTest.groovy
├── PlansApiUnitTest.groovy
├── PlansApiUnitTestSimplified.groovy
├── stepViewApiUnitTest.groovy
├── checkUserEndpoint.groovy
└── [Other API validation scripts]
```

## Test Scope

### API Validation

- **Endpoint responses** - HTTP status codes and data formats
- **Contract maintenance** - API version compatibility
- **Authentication** - User authentication and authorization
- **Response formats** - Data model consistency

### Key Patterns

- **CustomEndpointDelegate** - All REST endpoints use @BaseScript annotation
- **DatabaseUtil.withSql** - Safe database access with lifecycle management
- **Type safety** - Explicit casting with 'as' keyword
- **Path parameters** - getAdditionalPath method for URL segments

## Usage

```bash
# Run API tests
npm run test:apis

# Individual test execution
groovy MigrationApiIntegrationTest.groovy
groovy PlansApiUnitTest.groovy
```

## Groovy Development Guidelines for UMIG

### 1. REST Endpoints (MANDATORY Pattern)

All REST endpoints MUST use `CustomEndpointDelegate`:

```groovy
import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import groovy.transform.BaseScript

@BaseScript CustomEndpointDelegate delegate

plans(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Implementation
    return Response.ok(payload).build()
}
```

**Key Requirements**:

- `@BaseScript CustomEndpointDelegate delegate` annotation
- Method named after resource (e.g., `plans`, `teams`)
- Accepts `httpMethod`, `request`, `binding` arguments
- Returns `javax.ws.rs.core.Response` object
- Secure by default: `groups: ["confluence-users"]`

**Reference**: ADR-011-ScriptRunner-REST-Endpoint-Configuration.md

### 2. Database Access (MANDATORY Pattern)

ALL database access MUST use `DatabaseUtil.withSql`:

```groovy
// In DatabaseUtil.groovy
import com.onresolve.scriptrunner.db.DatabaseUtil as SRDatabaseUtil
import groovy.transform.stc.ClosureParams
import groovy.transform.stc.FromString

class DatabaseUtil {
    static <T> T withSql(@ClosureParams(value = FromString, options = "groovy.sql.Sql") Closure<T> closure) {
        return SRDatabaseUtil.withSql('umig_db_pool', closure)
    }
}

// In repository class
def findAllTeams() {
    DatabaseUtil.withSql { sql ->
        return sql.rows('SELECT * FROM teams_tms')
    }
}
```

**Why**:

- **Safe**: Prevents connection leaks
- **IDE-Friendly**: Resolves static analysis warnings
- **Correct**: Officially recommended by Adaptavist

### 3. Type Safety

Use explicit casts with `as` keyword when IDE type checker is incorrect:

```groovy
def result = sql.firstRow("INSERT ... RETURNING mig_id")
if (result?.mig_id) {
    def typedId = result.mig_id as UUID
    return findPlanById(typedId)
}
```

### 4. Path Parameters

Use `getAdditionalPath` for URL path segments:

```groovy
def path = getAdditionalPath(request) // Returns "/123"
if (path) {
    def planId = path.substring(1) as Integer
    // Use planId
}
```

## ADR Compliance

- **ADR-011**: CustomEndpointDelegate pattern for all REST endpoints
- **ADR-026**: Specific SQL query validation
- **ADR-031**: Explicit type casting
- **ADR-036**: Pure Groovy implementation

---

**Updated**: September 26, 2025 | **Version**: 2.0
