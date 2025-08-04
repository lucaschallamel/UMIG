# Current Patterns - UMIG Project

**Last Updated**: 4 August 2025  
**Pattern Status**: Mature and proven across 3 major implementations + infrastructure patterns

## Core Development Patterns

### ScriptRunner API Pattern (Proven)

**Template**: StepsApi.groovy → PlansApi.groovy → SequencesApi.groovy  
**Success Rate**: 100% implementation success with consistent structure

#### Mandatory Components
```groovy
// 1. Base Script Configuration
@BaseScript CustomEndpointDelegate delegate
@Grab('org.postgresql:postgresql:42.5.0')

// 2. Lazy Repository Loading (Critical for ScriptRunner)
def getRepositoryName = {
    def repoClass = this.class.classLoader.loadClass('umig.repository.RepositoryName')
    return repoClass.newInstance()
}

// 3. Endpoint Definition with Security
entityName(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    // Implementation
}
```

#### Type Safety Pattern (ADR-031 Compliance)
```groovy
// MANDATORY: Explicit casting for all query parameters
if (queryParams.getFirst('migrationId')) {
    filters.migrationId = UUID.fromString(queryParams.getFirst('migrationId') as String)
}
if (queryParams.getFirst('teamId')) {
    filters.teamId = Integer.parseInt(queryParams.getFirst('teamId') as String)
}
```

### Repository Pattern (Proven)

**Scale Range**: 451-926 lines, 13-25+ methods  
**Architecture**: DatabaseUtil.withSql wrapper with comprehensive method coverage

#### Standard Method Categories
1. **Find Operations** (4-6 methods)
   - `findAllMaster*()`, `findMaster*ById()`
   - `find*Instances()`, `find*InstanceById()`
   
2. **Create Operations** (2-3 methods)
   - `createMaster*()`, `create*InstancesFromMaster()`
   
3. **Update Operations** (2-4 methods)
   - `update*InstanceStatus()`, `update*Order()` (where applicable)
   
4. **Delete Operations** (2 methods)
   - `deleteMaster*()`, `delete*Instance()`
   
5. **Advanced Operations** (3-12 methods)
   - Hierarchical filtering, validation, specialised business logic

#### Database Connection Pattern
```groovy
// MANDATORY: Use DatabaseUtil wrapper
DatabaseUtil.withSql { sql ->
    return sql.rows('SELECT * FROM table_name WHERE condition = :param', [param: value])
}
```

### Hierarchical Filtering Pattern (ADR-030)

**Implementation**: Use instance IDs (pli_id, sqi_id, phi_id), NOT master IDs  
**Success Rate**: 100% accuracy across Plans and Sequences APIs

```groovy
// Standard hierarchical filter implementation
def filters = [:]
if (queryParams.getFirst('migrationId')) {
    filters.migrationId = UUID.fromString(queryParams.getFirst('migrationId') as String)
}
if (queryParams.getFirst('iterationId')) {
    filters.iterationId = UUID.fromString(queryParams.getFirst('iterationId') as String)
}
if (queryParams.getFirst('planId')) { // or parentId for current level
    filters.planId = UUID.fromString(queryParams.getFirst('planId') as String)
}
```

### Testing Pattern (ADR-026 Compliance)

**Structure**: Unit tests + Integration tests with 90%+ coverage  
**Mock Strategy**: Specific SQL query mocks with exact regex patterns

#### Unit Test Pattern
```groovy
class EntityRepositoryTest extends GroovyTestCase {
    def setup() {
        DatabaseUtil.metaClass.static.withSql = mockSqlClosure
    }
    
    void testSpecificMethod() {
        // Arrange: specific SQL mock with regex pattern
        // Act: call repository method
        // Assert: verify result and SQL call
    }
}
```

#### Integration Test Pattern
```groovy
class EntityApiIntegrationTest extends GroovyTestCase {
    // Real database testing with PostgreSQL from local-dev-setup
    // 15-20 test scenarios covering all endpoints and error conditions
    // Proper cleanup and test isolation
}
```

## Advanced Patterns (US-002 Innovations)

### Circular Dependency Detection

**Implementation**: Recursive Common Table Expressions (CTEs)  
**Performance**: Validated for plans with 50+ sequences

```sql
WITH RECURSIVE dependency_chain AS (
    SELECT sqm_id, predecessor_sqm_id, 1 as depth, ARRAY[sqm_id] as path
    FROM sequences_master_sqm WHERE plm_id = :planId
    UNION ALL
    SELECT s.sqm_id, s.predecessor_sqm_id, dc.depth + 1, dc.path || s.sqm_id
    FROM sequences_master_sqm s
    JOIN dependency_chain dc ON s.predecessor_sqm_id = dc.sqm_id
    WHERE s.sqm_id != ALL(dc.path) AND dc.depth < 50
)
SELECT COUNT(*) FROM dependency_chain 
WHERE sqm_id = ANY(path[1:array_length(path,1)-1])
```

### Transaction-Based Ordering

**Use Case**: Complex ordering operations requiring atomicity  
**Implementation**: BEGIN/COMMIT/ROLLBACK with comprehensive error handling

```groovy
def complexOrderingOperation(params) {
    DatabaseUtil.withSql { sql ->
        sql.execute("BEGIN")
        try {
            // Multiple related updates
            sql.execute("COMMIT")
            return success
        } catch (Exception e) {
            sql.execute("ROLLBACK")
            throw e
        }
    }
}
```

## Documentation Patterns

### OpenAPI Specification Pattern

**Maintenance**: Auto-updated with each API implementation  
**Structure**: Comprehensive endpoint documentation with examples

- **Endpoints**: Complete CRUD operations with path parameters
- **Schemas**: Entity definitions with full attribute specifications  
- **Examples**: Request/response examples for all operations
- **Error Responses**: HTTP status code mapping with descriptions

### Postman Collection Pattern

**Generation**: Automated via enhanced generation script  
**Features**: Auto-authentication, dynamic baseUrl, environment-driven configuration

```javascript
// Enhanced collection generation with:
// - Automatic Basic Auth configuration
// - Environment variable integration
// - 19,239-line comprehensive collection
```

## Development Workflow Patterns

### Four-Phase Implementation (US-002 Success)

1. **Repository Foundation** (1.5hrs planned, 1.2hrs actual)
   - Comprehensive repository with all required methods
   - Advanced features implementation where applicable
   
2. **API Implementation** (2hrs planned, 1.8hrs actual)
   - ScriptRunner-compatible endpoint structure
   - Type-safe parameter handling
   
3. **Advanced Features Integration** (1hr planned, 0.8hrs actual)
   - Specialised business logic (ordering, validation, etc.)
   
4. **Testing & Validation** (1.5hrs planned, 1.3hrs actual)
   - Unit and integration test suites
   - Documentation updates

### GENDEV Agent Coordination

**Proven Team**: Requirements Analyst, API Designer, QA Coordinator  
**Integration**: Seamless coordination for requirements, design, and testing phases

### Velocity Acceleration Pattern

**US-001**: Baseline implementation with ScriptRunner integration challenges  
**US-002**: 46% faster delivery through pattern reuse  
**Projection**: US-003/US-004 expected to achieve similar or better acceleration

## Error Handling Patterns

### SQL State Mapping (Consistent)

```groovy
// Standard error response mapping
catch (SQLException e) {
    def sqlState = e.getSQLState() ?: "00000"
    switch (sqlState) {
        case "23503": // Foreign key violation
            return Response.status(400).entity([error: "Invalid reference"]).build()
        case "23505": // Unique constraint violation  
            return Response.status(409).entity([error: "Resource already exists"]).build()
        default:
            return Response.status(500).entity([error: "Database error"]).build()
    }
}
```

### HTTP Status Code Standards

- **200**: Successful GET operations
- **201**: Successful POST operations (creation)
- **204**: Successful PUT/DELETE operations
- **400**: Bad request (validation errors, invalid references)
- **409**: Conflict (unique constraint violations)
- **500**: Server errors (unexpected database issues)

## Quality Assurance Patterns

### Definition of Done (24 Criteria)

1. **Functional Requirements**: All CRUD operations implemented and tested
2. **Type Safety**: ADR-031 compliance with explicit casting
3. **Repository Pattern**: Consistent with established structure (13-25+ methods)
4. **API Pattern**: ScriptRunner compatibility with lazy loading
5. **Hierarchical Filtering**: ADR-030 compliance using instance IDs
6. **Error Handling**: Comprehensive SQL state mapping and HTTP responses
7. **Testing Coverage**: 90%+ unit test coverage, comprehensive integration tests
8. **Documentation**: OpenAPI specification and README updates
9. **Performance**: API response times <200ms for typical queries
10. **Code Quality**: Consistent formatting and clear documentation

## Infrastructure Patterns (US-002b Implementation)

### Audit Fields Standardization Pattern

**Implementation**: Comprehensive audit fields across 25+ database tables  
**Infrastructure**: AuditFieldsUtil.groovy utility class with standardised methods

#### Standard Audit Fields Schema
```sql
-- Mandatory audit fields for all entities
created_by VARCHAR(255) DEFAULT 'system',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_by VARCHAR(255) DEFAULT 'system',
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

#### AuditFieldsUtil Pattern
```groovy
class AuditFieldsUtil {
    static Map<String, Object> getStandardAuditFields(String actor = 'system') {
        return [
            created_by: actor,
            created_at: new Date(),
            updated_by: actor,
            updated_at: new Date()
        ]
    }
    
    static Map<String, Object> getUpdateAuditFields(String actor = 'system') {
        return [
            updated_by: actor,
            updated_at: new Date()
        ]
    }
}
```

#### Tiered Association Strategy
**Tier 1 (Critical)**: Full audit for access control tracking (teams_tms_x_users_usr)  
**Tier 2 (Standard)**: Minimal audit for change tracking (label associations)  
**Tier 3 (Simple)**: No audit overhead for pure many-to-many relationships

### Database Migration Pattern (Comprehensive)

**Structure**: Sequential migrations with rollback capability  
**Implementation**: 3-migration approach for complex changes

```sql
-- Migration 016: Core audit fields implementation
-- Migration 017: Association table audit fields  
-- Migration 018: Special case handling and fixes
```

### Documentation Automation Pattern

**Workflow**: Documentation Generator agent with systematic updates  
**Coverage**: API references, OpenAPI specification, Postman collection regeneration

#### API Documentation Template Usage
```markdown
# Use apiSpecificationTemplate.md for consistent API documentation
# Automatic generation of:
# - Endpoint specifications with examples
# - Request/response schemas  
# - Error handling documentation
# - Authentication and authorisation details
```

---

**Pattern Maturity**: These patterns have proven successful across 3 major implementations (APIs + infrastructure) with measurable velocity improvements and comprehensive quality standards. Ready for application to US-003 and US-004 with very high confidence.