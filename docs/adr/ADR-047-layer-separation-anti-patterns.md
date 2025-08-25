# ADR-047: Layer Separation Anti-Patterns

## Status

Accepted

## Date

2025-08-25

## Context

During US-031 implementation, we discovered critical layer separation violations causing cascading failures across multiple API endpoints. The most significant issue was "double enrichment" where both Repository and API layers attempted to enrich the same data, resulting in nested objects that caused type casting failures and complete API breakdown.

### Problems Identified

1. **Double Data Enrichment**: Repository and API layers both enriching the same data structures
2. **Type Casting Cascades**: Enriched objects being re-enriched causing `Cannot cast 'java.util.LinkedHashMap' to 'java.util.UUID'` errors
3. **Layer Responsibility Confusion**: Unclear boundaries between repository and API layer responsibilities
4. **Debugging Complexity**: Errors manifest far from their root cause, making debugging extremely difficult
5. **Inconsistent Data Structures**: Same entity data has different structures depending on access path

### Current State Challenges

```groovy
// ❌ ANTI-PATTERN: Double enrichment
def migration = migrationRepository.findMigrationById(migrationId)  // Returns enriched data
migration = migrationRepository.enrichMigrationWithStatusMetadata(migration)  // Double enrichment!
// Result: statusMetadata becomes nested object, breaks UUID parsing
```

### Error Signatures from Double Enrichment

- `Cannot cast 'java.util.LinkedHashMap' to 'java.util.UUID'`
- `Invalid UUID format: [object Object]`
- `No such property: sts_name for class: java.util.LinkedHashMap`
- `Type casting exceptions with nested object references`

## Decision

Establish **Mandatory Layer Separation Patterns** with clear single responsibility for data enrichment, preventing double enrichment and ensuring consistent data structures across all access patterns.

### Core Principles

1. **Single Enrichment Responsibility**: Only Repository layer performs data enrichment
2. **Clear Layer Boundaries**: API layer handles HTTP concerns only
3. **Consistent Data Structures**: Same entity returns identical structure regardless of access method
4. **No Nested Enrichment**: Data enriched once and passed through unchanged
5. **Repository as Single Source of Truth**: All data transformation happens in Repository layer

## Implementation

### 1. Layer Responsibility Definition

#### Repository Layer (Single Source of Data Truth)

**Responsibilities:**

- Database queries and connections
- Data enrichment and joins
- Business logic application
- Type conversion (ADR-043 compliance)
- Status metadata resolution
- Computed field calculation
- Data validation

**Prohibited Actions:**

- HTTP request/response handling
- Error response formatting
- Query parameter parsing

```groovy
// ✅ CORRECT: Repository handles ALL data enrichment
class MigrationRepository {
    def findMigrationById(UUID migrationId) {
        DatabaseUtil.withSql { sql ->
            def query = """
                SELECT m.*, s.sts_id, s.sts_name, s.sts_color, s.sts_type,
                       COALESCE(iteration_counts.iteration_count, 0) as iteration_count
                FROM migrations_mig m
                JOIN status_sts s ON m.mig_status = s.sts_id
                LEFT JOIN (
                    SELECT mig_id, COUNT(*) as iteration_count
                    FROM iterations_ite
                    GROUP BY mig_id
                ) iteration_counts ON m.mig_id = iteration_counts.mig_id
                WHERE m.mig_id = :migrationId
            """

            def row = sql.firstRow(query, [migrationId: migrationId])
            if (!row) return null

            // SINGLE enrichment point
            return enrichMigrationWithStatusMetadata(row)
        }
    }

    private Map enrichMigrationWithStatusMetadata(Map row) {
        return [
            mig_id: row.mig_id,
            mig_name: row.mig_name,
            mig_description: row.mig_description,
            mig_status: row.sts_name, // Backward compatibility
            // Audit fields
            created_by: row.created_by,
            created_at: row.created_at,
            updated_by: row.updated_by,
            updated_at: row.updated_at,
            // Computed fields
            iteration_count: row.iteration_count ?: 0,
            // Enhanced status metadata
            statusMetadata: [
                id: row.sts_id,
                name: row.sts_name,
                color: row.sts_color,
                type: row.sts_type
            ]
        ]
    }
}
```

#### API Layer (HTTP Gateway Only)

**Responsibilities:**

- HTTP request parsing
- Query parameter extraction
- Response formatting
- Error handling and HTTP status codes
- Authentication and authorization
- Request validation

**Prohibited Actions:**

- Data enrichment or transformation
- Database queries
- Business logic implementation
- Data structure modification

```groovy
// ✅ CORRECT: API layer passes through repository data unchanged
@BaseScript CustomEndpointDelegate delegate

def getRepository = { -> new MigrationRepository() }

migrations(httpMethod: "GET", groups: ["confluence-users"]) { MultivaluedMap queryParams, String body, HttpServletRequest request ->
    def extraPath = getAdditionalPath(request)
    def pathParts = extraPath ? extraPath.split('/').findAll { it } : []

    try {
        if (pathParts.size() == 1) {
            // Single entity retrieval
            def migrationId = UUID.fromString(pathParts[0] as String)
            def repository = getRepository()
            def migration = repository.findMigrationById(migrationId) as Map

            if (!migration) {
                return Response.status(404)
                    .entity(new JsonBuilder([error: "Migration not found", code: 404]).toString())
                    .build()
            }

            // ✅ PASS THROUGH: No additional enrichment
            return Response.ok(new JsonBuilder([data: migration]).toString()).build()
        } else {
            // List retrieval
            def filters = extractFilters(queryParams)
            def repository = getRepository()
            def result = repository.findMigrationsWithFilters(
                filters as Map,
                filters.pageNumber as int,
                filters.pageSize as int,
                filters.sortField as String,
                filters.sortDirection as String
            )

            // ✅ PASS THROUGH: Repository data returned unchanged
            return Response.ok(new JsonBuilder(result).toString()).build()
        }
    } catch (Exception e) {
        return handleApiError(e)
    }
}
```

### 2. Anti-Pattern Examples and Solutions

#### ❌ ANTI-PATTERN 1: Double Enrichment

```groovy
// WRONG: Repository already enriches, API enriches again
def migration = migrationRepository.findMigrationById(migrationId)  // Enriched
migration = migrationRepository.enrichMigrationWithStatusMetadata(migration)  // Double enrichment!

// Result: Creates nested objects that break type casting
// migration.statusMetadata.id becomes migration.statusMetadata.statusMetadata.id
```

#### ✅ SOLUTION 1: Single Enrichment Point

```groovy
// CORRECT: Repository enriches once, API passes through
def migration = migrationRepository.findMigrationById(migrationId)  // Already enriched
return Response.ok(new JsonBuilder([data: migration]).toString()).build()
```

#### ❌ ANTI-PATTERN 2: API Layer Database Queries

```groovy
// WRONG: API layer performing database operations
migrations(httpMethod: "GET") { queryParams ->
    DatabaseUtil.withSql { sql ->  // API should not access database directly
        def results = sql.rows("SELECT * FROM migrations_mig")
        // ... enrichment logic in API layer
    }
}
```

#### ✅ SOLUTION 2: Repository Encapsulation

```groovy
// CORRECT: All database operations in repository
migrations(httpMethod: "GET") { queryParams ->
    def repository = getRepository()
    def result = repository.findMigrationsWithFilters(extractedFilters)
    return Response.ok(new JsonBuilder(result).toString()).build()
}
```

#### ❌ ANTI-PATTERN 3: Repository Handling HTTP Concerns

```groovy
// WRONG: Repository returning HTTP responses
class MigrationRepository {
    def findMigrationById(UUID id) {
        def migration = // ... database query
        if (!migration) {
            // WRONG: Repository handling HTTP responses
            return Response.status(404).entity("Not found").build()
        }
        return migration
    }
}
```

#### ✅ SOLUTION 3: Clear Layer Separation

```groovy
// CORRECT: Repository returns data, API handles HTTP
class MigrationRepository {
    def findMigrationById(UUID id) {
        def migration = // ... database query
        return migration  // Return data or null, let API handle HTTP response
    }
}

// API handles HTTP logic
def migration = repository.findMigrationById(migrationId)
if (!migration) {
    return Response.status(404).entity(errorJson).build()
}
return Response.ok(new JsonBuilder([data: migration]).toString()).build()
```

### 3. Data Flow Architecture

#### ✅ CORRECT: Linear Data Flow

```
1. Request → API Layer (HTTP parsing)
2. API → Repository (method call with parameters)
3. Repository → Database (query execution)
4. Database → Repository (raw data)
5. Repository → Repository (single enrichment)
6. Repository → API (enriched data)
7. API → Response (HTTP formatting)
```

#### ❌ INCORRECT: Circular/Double Processing

```
1. Request → API Layer
2. API → Repository → Database → Repository (enriched)
3. Repository → API (enriched data)
4. API → API (double enrichment) ← PROBLEM
5. API → Response (nested objects)
```

### 4. Testing Layer Separation

#### Repository Layer Tests

```groovy
def "test repository returns enriched data structure"() {
    given: "A migration repository"
    def repository = new MigrationRepository()

    when: "Finding migration by ID"
    def migration = repository.findMigrationById(testMigrationId)

    then: "Data structure is fully enriched"
    migration.mig_id == testMigrationId
    migration.statusMetadata != null
    migration.statusMetadata.id instanceof Integer
    migration.statusMetadata.name instanceof String
    migration.statusMetadata.color instanceof String
    migration.iteration_count instanceof Integer
}
```

#### API Layer Tests

```groovy
def "test API layer passes through repository data unchanged"() {
    given: "Repository returns enriched data"
    def mockRepository = Mock(MigrationRepository)
    def enrichedData = [
        mig_id: UUID.randomUUID(),
        statusMetadata: [id: 1, name: "PLANNING", color: "#FF0000"]
    ]
    mockRepository.findMigrationById(_) >> enrichedData

    when: "API endpoint is called"
    def response = apiEndpoint.getMigration(testId)

    then: "Repository data is returned unchanged"
    def responseData = parseJson(response.entity).data
    responseData == enrichedData  // Exact match - no modification
    responseData.statusMetadata.id == 1  // Not nested or modified
}
```

### 5. Layer Separation Validation

#### Automated Validation Patterns

```groovy
// Validation utility to detect double enrichment
class LayerSeparationValidator {

    static boolean validateNoDoubleEnrichment(Map data) {
        return !hasNestedStatusMetadata(data)
    }

    static boolean hasNestedStatusMetadata(Map data) {
        if (data.statusMetadata instanceof Map) {
            return data.statusMetadata.statusMetadata != null
        }
        return false
    }

    static void assertSingleEnrichment(Map data, String context) {
        if (hasNestedStatusMetadata(data)) {
            throw new IllegalStateException(
                "Double enrichment detected in ${context}. " +
                "Data structure has nested statusMetadata indicating multiple enrichment passes."
            )
        }
    }
}

// Use in tests and debugging
def migration = repository.findMigrationById(id)
LayerSeparationValidator.assertSingleEnrichment(migration, "Migration repository")
```

#### Code Review Checklist

- [ ] Repository methods return consistently structured data
- [ ] API methods do not modify repository data
- [ ] No database queries in API layer
- [ ] No HTTP response handling in repository layer
- [ ] No double enrichment of status metadata
- [ ] Data structures are consistent across all access methods

## Consequences

### Positive

1. **Eliminates Type Casting Failures**: Single enrichment prevents nested object issues
2. **Consistent Data Structures**: Same entity always has identical structure
3. **Simplified Debugging**: Clear layer boundaries make error tracing straightforward
4. **Improved Maintainability**: Single responsibility makes code changes predictable
5. **Performance Optimization**: No duplicate processing or enrichment operations
6. **Clear Developer Understanding**: Obvious separation of concerns

### Negative

1. **Initial Refactoring Effort**: Existing code must be updated to comply with patterns
2. **Stricter Development Discipline**: Developers must respect layer boundaries
3. **More Comprehensive Testing**: Must test layer separation compliance
4. **Documentation Requirements**: Clear guidelines needed for team alignment

### Neutral

1. **No API Functionality Changes**: End-user experience remains identical
2. **Same Performance Characteristics**: Overall system performance unchanged
3. **Compatible with Existing ADRs**: Works with ADR-031 and ADR-043 patterns

## Anti-Pattern Detection

### Warning Signs of Layer Violations

| Warning Sign                 | Description                    | Action Required             |
| ---------------------------- | ------------------------------ | --------------------------- |
| `enrichWith*` called in API  | Data enrichment in wrong layer | Move to repository          |
| Database queries in API      | Data access in wrong layer     | Create repository method    |
| HTTP responses in Repository | HTTP concerns in wrong layer   | Move to API layer           |
| Nested `statusMetadata`      | Double enrichment detected     | Remove duplicate enrichment |
| Different data structures    | Inconsistent enrichment        | Standardize in repository   |

### Automated Detection Rules

```groovy
// Code analysis rules to detect violations
class LayerViolationDetector {

    static List<String> detectViolations(String code) {
        def violations = []

        // Detect database access in API layer
        if (code.contains('@BaseScript') && code.contains('DatabaseUtil.withSql')) {
            violations << "API layer contains direct database access"
        }

        // Detect HTTP responses in Repository
        if (code.contains('class') && code.contains('Repository') && code.contains('Response.status')) {
            violations << "Repository layer contains HTTP response logic"
        }

        // Detect double enrichment patterns
        if (code.contains('enrich') && code.count('enrich') > 1) {
            violations << "Potential double enrichment detected"
        }

        return violations
    }
}
```

## Migration Strategy

### Phase 1: Assessment (Day 1)

- Audit existing APIs for layer violations
- Identify double enrichment instances
- Document current violation patterns

### Phase 2: Repository Consolidation (Days 2-3)

- Move all data enrichment to repository layer
- Standardize data structures across repositories
- Remove duplicate enrichment methods

### Phase 3: API Simplification (Days 4-5)

- Remove data transformation from API layer
- Implement pass-through patterns
- Add layer separation validation

### Phase 4: Testing & Validation (Day 6)

- Test all APIs for consistent data structures
- Validate no type casting failures
- Verify layer separation compliance

## References

- Admin-GUI-Entity-Troubleshooting-Quick-Reference.md - Source double enrichment patterns
- Migrations API Cascading Failure Analysis (August 22, 2025) - Real-world layer separation violations
- US-031 Admin GUI Integration - Context where double enrichment was discovered
- Repository Pattern Best Practices - Foundation principles
- Clean Architecture Principles - Layer separation theory

## Related ADRs

- ADR-031: Type Safety Enforcement - Type casting patterns that interact with enrichment
- ADR-043: PostgreSQL JDBC Type Casting Standards - Repository layer type conversion responsibilities
- ADR-044: ScriptRunner Repository Access Patterns - Repository access patterns that support separation

---

_This ADR eliminates critical layer separation violations that cause type casting failures and establishes clear boundaries between Repository and API layer responsibilities, ensuring consistent data structures and simplified debugging._
