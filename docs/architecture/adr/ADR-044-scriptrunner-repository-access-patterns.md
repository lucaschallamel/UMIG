# ADR-044: ScriptRunner Repository Access Patterns

## Status

Accepted

## Date

2025-08-25

## Context

During US-031 implementation, we discovered critical ScriptRunner-specific issues that prevent traditional repository access patterns from working. The `@BaseScript CustomEndpointDelegate` prevents direct field access in private methods, causing "Variable is undeclared" errors that completely break repository functionality.

### Problems Identified

1. **Field Access Restrictions**: `@BaseScript CustomEndpointDelegate` prevents direct `@Field` access in private methods
2. **Static Type Checking Conflicts**: ADR-031 static type checking amplifies ScriptRunner access limitations
3. **Repository Instantiation Failures**: Traditional Groovy field patterns fail in ScriptRunner context
4. **Method Visibility Issues**: Private methods cannot access script-level repository instances
5. **Cascading API Failures**: Repository access errors cause complete endpoint failures

### Current State Challenges

```groovy
// ❌ FAILS in ScriptRunner context
@Field final MigrationRepository migrationRepository = new MigrationRepository()

private def handleRequest() {
    // ERROR: Variable 'migrationRepository' is undeclared
    def result = migrationRepository.findAll()
}
```

### Error Signatures

- `Variable 'repository' is undeclared in private method`
- `Cannot access script fields from private methods`
- `No such property for class Object` (from repository instantiation failures)

## Decision

Establish **Mandatory ScriptRunner Repository Access Patterns** using closure-based accessor pattern that works within ScriptRunner's `@BaseScript CustomEndpointDelegate` constraints while maintaining ADR-031 static type checking compliance.

### Core Principles

1. **Closure-Based Access**: All repository access must use closure pattern for ScriptRunner compatibility
2. **Script-Level Visibility**: Use `def` instead of `private` for methods that access repositories
3. **Lazy Initialization**: Repository instances created on-demand to avoid initialization issues
4. **Type Safety Compliance**: Maintain ADR-031 explicit casting requirements

## Implementation

### 1. Mandatory Repository Access Pattern

```groovy
package umig.api.v2

import com.onresolve.scriptrunner.runner.rest.common.CustomEndpointDelegate
import umig.repository.MigrationRepository
import groovy.json.JsonBuilder
import groovy.transform.BaseScript
import javax.servlet.http.HttpServletRequest
import javax.ws.rs.core.MultivaluedMap
import javax.ws.rs.core.Response
import java.util.UUID

@BaseScript CustomEndpointDelegate delegate

// MANDATORY: Use closure pattern for repository access (NOT @Field)
def getRepository = { ->
    return new MigrationRepository()
}

// MANDATORY: All methods that access repositories must use 'def', not 'private'
migrations(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []

    try {
        if (pathParts.size() == 1) {
            return handleSingleMigration(pathParts[0])
        } else {
            return handleMigrationList(queryParams)
        }
    } catch (Exception e) {
        return handleApiError(e)
    }
}

// CRITICAL: Use 'def' instead of 'private' for ScriptRunner compatibility
def handleSingleMigration(String migrationIdString) {
    def migrationId = UUID.fromString(migrationIdString as String)
    def repository = getRepository()  // Access via closure
    def migration = repository.findMigrationById(migrationId) as Map

    if (!migration) {
        return Response.status(404)
            .entity(new JsonBuilder([error: "Migration not found", code: 404]).toString())
            .build()
    }

    return Response.ok(new JsonBuilder([data: migration]).toString()).build()
}

def handleMigrationList(MultivaluedMap queryParams) {
    def filters = extractFilters(queryParams)
    def repository = getRepository()  // Access via closure
    def result = repository.findMigrationsWithFilters(
        filters as Map,
        filters.pageNumber as int,
        filters.pageSize as int,
        filters.sortField as String,
        filters.sortDirection as String
    )
    return Response.ok(new JsonBuilder(result).toString()).build()
}

def extractFilters(MultivaluedMap queryParams) {
    def filters = [:]
    def pageNumber = 1
    def pageSize = 50
    def sortField = 'created_at'
    def sortDirection = 'desc'

    queryParams.keySet().each { param ->
        def value = queryParams.getFirst(param) as String  // ADR-031 compliance
        switch (param) {
            case 'page':
                pageNumber = Integer.parseInt(value as String)
                break
            case 'size':
                pageSize = Integer.parseInt(value as String)
                break
            case 'sort':
                sortField = value as String
                break
            case 'direction':
                sortDirection = value as String
                break
            default:
                filters[param] = value as String
        }
    }

    return [
        *: filters,
        pageNumber: pageNumber,
        pageSize: pageSize,
        sortField: sortField,
        sortDirection: sortDirection
    ]
}

def handleApiError(Exception e) {
    return Response.status(500)
        .entity(new JsonBuilder([error: "Internal server error", code: 500, message: e.message]).toString())
        .build()
}
```

### 2. Repository Access Anti-Patterns

#### ❌ WRONG: Field Declaration Pattern

```groovy
// FAILS in ScriptRunner - causes "undeclared variable" errors
@Field final MigrationRepository migrationRepository = new MigrationRepository()

private def handleRequest() {
    // ERROR: Variable 'migrationRepository' is undeclared
    def result = migrationRepository.findAll()
}
```

#### ❌ WRONG: Private Method with Field Access

```groovy
// FAILS in ScriptRunner - private methods cannot access script fields
@Field final repository = new MigrationRepository()

private Response handleMigrationUpdate(UUID id, Map data) {
    // ERROR: Cannot access script fields from private methods
    return repository.updateMigration(id, data)
}
```

#### ❌ WRONG: Direct Instantiation in Method

```groovy
// ANTI-PATTERN: Creates new instance on every call
private def handleRequest() {
    def repository = new MigrationRepository()  // Performance penalty
    return repository.findAll()
}
```

### 3. CORRECT: ScriptRunner-Compatible Patterns

#### ✅ Closure-Based Repository Access

```groovy
// CORRECT: Closure pattern works with @BaseScript
def getRepository = { ->
    return new MigrationRepository()
}

def handleRequest() {
    def repository = getRepository()  // Works in all method types
    return repository.findAll()
}
```

#### ✅ Cached Repository Access (Advanced)

```groovy
// OPTIONAL: Cached repository for performance
def getRepository = { ->
    if (!this.@repositoryInstance) {
        this.@repositoryInstance = new MigrationRepository()
    }
    return this.@repositoryInstance
}
```

#### ✅ Multiple Repository Access

```groovy
// Pattern for APIs that need multiple repositories
def getMigrationRepository = { ->
    return new MigrationRepository()
}

def getUserRepository = { ->
    return new UserRepository()
}

def getStatusRepository = { ->
    return new StatusRepository()
}

def handleComplexRequest() {
    def migRepo = getMigrationRepository()
    def userRepo = getUserRepository()
    def statusRepo = getStatusRepository()

    // Use multiple repositories safely
    def migration = migRepo.findById(id)
    def user = userRepo.findById(migration.usr_id_owner)
    def status = statusRepo.findStatusById(migration.mig_status)
}
```

### 4. Method Visibility Requirements

#### ScriptRunner Method Visibility Rules

| Method Type     | Visibility  | Repository Access | Use Case                    |
| --------------- | ----------- | ----------------- | --------------------------- |
| HTTP Handlers   | No modifier | ✅ Via closure    | Main endpoint methods       |
| Helper Methods  | `def`       | ✅ Via closure    | Business logic              |
| Private Methods | `private`   | ❌ NO ACCESS      | Pure utility functions only |
| Static Methods  | `static`    | ❌ NO ACCESS      | Stateless utilities         |

#### ✅ CORRECT: Method Visibility Pattern

```groovy
// HTTP handler - no visibility modifier required
migrations(httpMethod: "GET", groups: ["confluence-users"]) { ... }

// Helper method - use 'def' for repository access
def handleMigrationRequest() {
    def repository = getRepository()  // ✅ Works
    return repository.findAll()
}

// Utility method - private OK if no repository access
private String formatErrorMessage(String message) {
    return "Error: ${message}"  // ✅ Works - no repository access
}

// Static utility - no repository access allowed
static int mapSqlStateToHttpStatus(String sqlState) {
    switch (sqlState) {
        case '23503': return 400
        default: return 500
    }
}
```

### 5. Integration with ADR-031 Static Type Checking

```groovy
// MANDATORY: Maintain ADR-031 compliance in repository access pattern
def getRepository = { ->
    return new MigrationRepository()
}

def handleRequest(MultivaluedMap queryParams) {
    // ADR-031: Explicit type casting for all parameters
    def filters = [:]
    queryParams.keySet().each { param ->
        def value = queryParams.getFirst(param) as String  // Required
        filters[param] = value as String
    }

    // Repository access via closure
    def repository = getRepository()

    // ADR-031: Explicit casting for all repository method parameters
    def result = repository.findWithFilters(
        filters as Map,
        1 as int,
        50 as int,
        'created_at' as String,
        'desc' as String
    )

    return Response.ok(new JsonBuilder(result).toString()).build()
}
```

## ScriptRunner Context Analysis

### Why Traditional Patterns Fail

1. **@BaseScript Transformation**: ScriptRunner transforms the script into a class, breaking traditional field access patterns
2. **Execution Context**: Methods execute in different contexts than where fields are declared
3. **Groovy Compilation**: Static type checking interacts poorly with ScriptRunner's runtime field access
4. **Delegation Pattern**: CustomEndpointDelegate creates additional layers that interfere with field visibility

### ScriptRunner-Specific Constraints

| Constraint                            | Impact                         | Workaround                   |
| ------------------------------------- | ------------------------------ | ---------------------------- |
| No @Field access in private methods   | Repository instantiation fails | Use closure pattern          |
| Script transformation changes context | Field visibility lost          | Use method-level access      |
| CustomEndpointDelegate interference   | Breaks traditional patterns    | Use delegation-safe patterns |
| Static type checking requirements     | Requires explicit casting      | Maintain ADR-031 compliance  |

## Testing Patterns

### Unit Testing with Repository Access Pattern

```groovy
// Test class can verify closure pattern works correctly
class RepositoryAccessTest {

    def "test closure repository access pattern"() {
        given: "A closure-based repository accessor"
        def getTestRepository = { ->
            return new TestRepository()
        }

        when: "Repository is accessed via closure"
        def repository = getTestRepository()

        then: "Repository instance is created successfully"
        repository != null
        repository instanceof TestRepository
    }

    def "test multiple repository access"() {
        given: "Multiple repository closures"
        def getRepo1 = { -> new Repository1() }
        def getRepo2 = { -> new Repository2() }

        when: "Both repositories are accessed"
        def repo1 = getRepo1()
        def repo2 = getRepo2()

        then: "Both instances are created correctly"
        repo1 instanceof Repository1
        repo2 instanceof Repository2
    }
}
```

### Integration Testing Requirements

```groovy
// Integration tests must verify ScriptRunner context behavior
def "test API endpoint repository access in ScriptRunner context"() {
    given: "ScriptRunner endpoint with closure-based repository access"
    def endpoint = new TestScriptRunnerEndpoint()

    when: "API method is called"
    def response = endpoint.handleRequest(testParams)

    then: "Repository access works without errors"
    response.status == 200
    !response.entity.contains("undeclared variable")
}
```

## Consequences

### Positive

1. **ScriptRunner Compatibility**: Repository access works reliably in all ScriptRunner contexts
2. **Elimination of "Undeclared Variable" Errors**: Closure pattern resolves field access issues
3. **ADR-031 Compliance**: Pattern maintains static type checking requirements
4. **Consistent Access Pattern**: Single pattern works across all repository types
5. **Developer Clarity**: Clear distinction between ScriptRunner-compatible and incompatible patterns

### Negative

1. **Slight Performance Overhead**: Closure call on each repository access
2. **Pattern Complexity**: Developers must remember ScriptRunner-specific patterns
3. **Code Verbosity**: More code required compared to simple field access
4. **Learning Curve**: Team must understand ScriptRunner execution context differences

### Neutral

1. **Repository Logic Unchanged**: Repository implementation not affected
2. **API Functionality**: No impact on actual API behavior or responses
3. **Testing Requirements**: Same testing coverage required, different patterns

## Migration Strategy

### Phase 1: Pattern Documentation (Day 1)

- Document all ScriptRunner-compatible patterns
- Create repository access template
- Update development guidelines

### Phase 2: Existing API Updates (Days 2-3)

- Convert all existing APIs to use closure pattern
- Remove @Field repository declarations
- Update method visibility as needed

### Phase 3: Validation & Testing (Day 4)

- Test all converted APIs in ScriptRunner environment
- Verify no "undeclared variable" errors
- Validate ADR-031 compliance maintained

### Phase 4: Developer Training (Day 5)

- Team training on ScriptRunner patterns
- Code review checklist updates
- Best practices documentation

## Validation

### Success Metrics

1. **Zero "Undeclared Variable" Errors**: Complete elimination of repository access failures
2. **100% API Compatibility**: All endpoints work in ScriptRunner environment
3. **ADR-031 Compliance**: No regression in static type checking compliance
4. **Developer Adoption**: Team consistently uses correct patterns

### Compliance Checklist

- [ ] Repository access uses closure pattern (`def getRepository = { -> ... }`)
- [ ] Methods that access repositories use `def` visibility (not `private`)
- [ ] No `@Field` repository declarations
- [ ] All repository method parameters explicitly cast (ADR-031)
- [ ] Multiple repositories use separate closure accessors

## References

- Admin-GUI-Entity-Troubleshooting-Quick-Reference.md - Source error patterns and solutions
- US-031 Admin GUI Implementation - Context where issues were discovered
- ScriptRunner CustomEndpointDelegate Documentation - Technical context
- ADR-031: Type Safety Enforcement - Related static type checking requirements
- Repository Access Error Debugging Session (August 22, 2025) - Proof of concept

## Related ADRs

- ADR-031: Type Safety Enforcement - Static type checking requirements that must be maintained
- ADR-043: PostgreSQL JDBC Type Casting Standards - Type conversion patterns used in repositories
- ADR-047: Layer Separation Anti-Patterns - Repository vs API layer responsibilities

---

_This ADR resolves ScriptRunner-specific repository access issues that prevent traditional Groovy field patterns from working, enabling reliable repository access across all UMIG API endpoints._
