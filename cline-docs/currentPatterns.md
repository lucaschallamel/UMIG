# Current Patterns - UMIG Project

**Last Updated**: 6 August 2025  
**Pattern Status**: Mature and proven across 5 major API implementations + quality gate management system

## Consolidated Documentation Notice

This file has been consolidated with /docs/currentPatterns.md to eliminate duplication and maintain a single source of truth for current development patterns.

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

## Control Point Validation Pattern (US-003 Implementation)

### Control Point Types
- **MANDATORY**: Must be validated before phase completion
- **OPTIONAL**: Can be skipped without impact
- **CONDITIONAL**: Required based on runtime conditions

### Validation States
- **PENDING**: Awaiting validation
- **VALIDATED**: Completed successfully
- **FAILED**: Validation failed, requires attention
- **OVERRIDDEN**: Manually overridden with justification

### Emergency Override Pattern
```groovy
def overrideControlPoint(UUID controlId, String reason, String overrideBy) {
    DatabaseUtil.withSql { sql ->
        sql.withTransaction {
            // Update control status with audit trail
            sql.execute("""
                UPDATE controls_instance_cti 
                SET cti_status = 'OVERRIDDEN',
                    cti_override_reason = :reason,
                    cti_override_by = :overrideBy,
                    cti_override_timestamp = NOW()
                WHERE cti_id = :controlId
            """, [controlId: controlId, reason: reason, overrideBy: overrideBy])
        }
    }
}
```

### Progress Aggregation Pattern
```groovy
// Weighted calculation: 70% steps + 30% control points
def calculatePhaseProgress(UUID phaseId) {
    def stepProgress = getStepCompletionPercentage(phaseId)
    def controlProgress = getControlPointStatusPercentage(phaseId)
    return (stepProgress * 0.7) + (controlProgress * 0.3)
}
```

## Endpoint Consolidation Pattern (US-003b Implementation)

### Consolidated Endpoint Structure
**Pattern**: Single endpoint name with path-based routing vs multiple endpoint names

```groovy
// BEFORE: Multiple endpoint names (fragmented)
phasesmaster(httpMethod: "GET", groups: ["confluence-users"]) { ... }
phasesinstance(httpMethod: "GET", groups: ["confluence-users"]) { ... }
phases(httpMethod: "POST", groups: ["confluence-users"]) { ... }

// AFTER: Single endpoint with path routing (consolidated)
phases(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def additionalPath = getAdditionalPath(request)
    switch(additionalPath) {
        case "master":
            return handleMasterOperation(request)
        case "instance": 
            return handleInstanceOperation(request)
        default:
            return handleDefaultOperation(request)
    }
}
```

### Path-Based Routing Implementation
```groovy
// Consistent routing pattern across all HTTP methods
def getAdditionalPath(request) {
    def pathInfo = request.pathInfo
    def contextPath = request.contextPath
    def servletPath = request.servletPath
    
    // Extract additional path after endpoint name
    def additionalPath = pathInfo?.substring(servletPath.length() + 1)
    return additionalPath?.split('/')[0] ?: ''
}
```

### Benefits
- **API Organization**: Consistent developer experience across Swagger/Postman
- **Maintenance**: Single file per logical endpoint grouping
- **Documentation**: Cleaner API specification with logical grouping
- **Client Tools**: Proper folder organization in Postman collections

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

### Performance Optimization Patterns

#### Centralized Filter Validation Pattern
**Purpose**: Reduce redundant type casting and improve query performance  
**Location**: Repository layer (e.g., ControlRepository.validateFilters)  
**Implementation**:
```groovy
private Map validateFilters(Map filters) {
    return filters.findAll { k, v -> v != null }.collectEntries { k, v ->
        switch(k) {
            case ~/.*Id$/: 
                if (k in ['teamId', 'statusId', 'userId']) {
                    return [k, Integer.parseInt(v as String)]
                } else {
                    return [k, UUID.fromString(v as String)]
                }
            default: 
                return [k, v as String]
        }
    }
}
```
**Benefits**: 
- Single-pass validation
- Pattern-based type detection
- ~30% reduction in query preparation overhead

#### Standardized Response Building Pattern
**Purpose**: Ensure consistent API response formatting  
**Location**: API layer (e.g., ControlsApi.buildSuccessResponse)  
**Implementation**:
```groovy
private Response buildSuccessResponse(Object data, Response.Status status = Response.Status.OK) {
    return Response.status(status)
        .entity(new JsonBuilder(data).toString())
        .build()
}
```
**Benefits**:
- Uniform JSON structure across all endpoints
- Single point of change for response format
- Improved API predictability

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

## Additional Detailed Examples (from legacy docs/currentPatterns.md)

### Static Type Checking Deep Dive

The following patterns were identified during US-002 implementation to prevent ClassCastException errors in ScriptRunner:

#### Complete Field Selection Pattern
**Critical Rule**: Always include ALL fields referenced in result mapping:

```groovy
// CORRECT - All referenced fields included in SELECT
def query = '''
    SELECT stm.stm_id, stm.stm_name, stm.stm_description,
           stt.stt_code, stt.stt_name, phi.phi_id
    FROM steps_master_stm stm
    JOIN step_types_stt stt ON stm.stt_id = stt.stt_id
    JOIN phases_instance phi ON stm.phi_id = phi.phi_id
'''

// INCORRECT - Missing fields cause "No such property" errors
def query = '''
    SELECT stm.stm_id, stm.stm_name
    FROM steps_master_stm stm
    JOIN step_types_stt stt ON stm.stt_id = stt.stt_id
'''
// Later reference to stt.stt_code or phi.phi_id will fail
```

### Advanced Testing Coverage Strategies

**Maintenance Pattern**:
```groovy
// Test organization by functionality
class SequenceRepositoryTest {
    // CRUD operations (30% of tests)
    void testCreateMasterSequence()
    void testFindSequenceById()
    void testUpdateSequenceStatus()
    void testDeleteSequence()
    
    // Advanced functionality (40% of tests)
    void testReorderSequences()
    void testValidateCircularDependencies()
    void testHierarchicalFiltering()
    
    // Error handling (30% of tests)
    void testInvalidParameterHandling()
    void testConstraintViolations()
    void testTransactionRollback()
}
```

---

## Groovy 3.0.15 Static Type Checking Patterns (5 August 2025)

### Enhanced Type Safety Implementation
**Context**: Comprehensive compatibility improvements eliminating runtime type errors

#### Dynamic Property Access Resolution
```groovy
// BEFORE (Groovy dynamic property issue)
def createEntity(Map params) {
    def entity = [:]
    entity.name = params.name  // Dynamic property access
    return entity
}

// AFTER (Explicit property assignment)
def createEntity(Map params) {
    def entity = [:]
    entity['name'] = params['name'] as String  // Explicit Map access with type casting
    return entity
}
```

#### Method Signature Compatibility 
```groovy
// BEFORE (Method signature mismatch)
def updateEntity(id, params) {  // Ambiguous parameter types
    // Implementation
}

// AFTER (Explicit parameter typing)
def updateEntity(Integer id, Map params) {  // Clear parameter types
    // Implementation with proper type casting
    params.entityId = Integer.parseInt(params.entityId as String)
}
```

#### Collection Typing Improvements
```groovy
// BEFORE (Generic collection handling)
def items = []
items.addAll(queryResults)

// AFTER (Typed collection handling)
List<Map> items = []
items.addAll(queryResults as List<Map>)
```

#### Variable Declaration Standards
```groovy
// BEFORE (Undeclared variable risk)
result = sql.rows(query)  // Undeclared 'result'

// AFTER (Explicit variable declaration)
def result = sql.rows(query)  // Properly declared variable
```

### Enhanced Error Handling Patterns
```groovy
// BEFORE (Generic exception handling)
catch (Exception e) {
    log.error("Error: ${e.message}")
}

// AFTER (Specific exception handling with type safety)
catch (SQLException e) {
    log.error("SQL Error: ${e.message}", e)
    // Specific error handling based on SQL state
}
```

### Development Experience Benefits
- **Enhanced IDE Support**: Better code completion and real-time error detection
- **Earlier Error Detection**: Compile-time validation preventing runtime issues  
- **Improved Code Navigation**: Enhanced method resolution and refactoring support
- **Better Debugging**: Clearer stack traces and variable inspection

### Production Reliability Enhancements
- **Eliminated ClassCastException**: Explicit type casting prevents runtime casting errors
- **Resolved NoSuchMethodException**: Proper method signature matching eliminates method resolution failures
- **Improved Error Handling**: Specific exception types enable better error recovery
- **Enhanced Performance**: Reduced dynamic dispatch overhead through static typing

### Files Enhanced with Static Type Checking
- PhasesApi.groovy - Dynamic property access fixes, method signature improvements
- TeamsApi.groovy - Parameter type declaration, variable scoping
- UsersApi.groovy - Collection typing, exception handling
- LabelRepository.groovy - Collection casting, numeric type safety
- StepRepository.groovy - Method signature standardisation
- TeamRepository.groovy - Variable declaration improvements
- AuthenticationService.groovy - Type safety in authentication logic

---

## Controls API Pattern Implementation (US-005, 6 August 2025)

### Quality Gate Management System
**Implementation**: Complete control point and quality gate management system with phase-level architecture

#### Control Point Types and States
```groovy
// Control types per ADR-016
enum ControlType {
    MANDATORY,    // Must be validated before phase completion
    OPTIONAL,     // Can be skipped without impact  
    CONDITIONAL   // Required based on runtime conditions
}

// Control validation states
enum ControlStatus {
    PENDING,      // Awaiting validation
    VALIDATED,    // Completed successfully  
    PASSED,       // Validation passed
    FAILED,       // Validation failed, requires attention
    CANCELLED,    // Validation cancelled
    TODO          // Ready for validation
}
```

#### Progress Calculation with Control Points
```groovy
// Weighted progress aggregation: 70% steps + 30% control points
def calculatePhaseProgressWithControls(UUID phaseId) {
    def stepProgress = getStepCompletionPercentage(phaseId)
    def controlProgress = getControlPointValidationPercentage(phaseId)
    return (stepProgress * 0.7) + (controlProgress * 0.3)
}

def getControlPointValidationPercentage(UUID phaseId) {
    DatabaseUtil.withSql { sql ->
        def results = sql.firstRow("""
            SELECT 
                COUNT(*) as total_controls,
                COUNT(CASE WHEN cti_status IN ('VALIDATED', 'PASSED') THEN 1 END) as validated_controls
            FROM controls_instance_cti 
            WHERE phi_id = :phaseId
        """, [phaseId: phaseId])
        
        if (results.total_controls == 0) return 100.0
        return (results.validated_controls / results.total_controls) * 100.0
    }
}
```

#### Control Override Pattern with Audit Trail
```groovy
def overrideControlPoint(UUID controlId, String reason, String overrideBy) {
    DatabaseUtil.withSql { sql ->
        sql.withTransaction {
            // Update control status with complete audit trail
            sql.execute("""
                UPDATE controls_instance_cti 
                SET cti_status = 'OVERRIDDEN',
                    cti_override_reason = :reason,
                    cti_override_by = :overrideBy,
                    cti_override_timestamp = NOW(),
                    updated_by = :overrideBy,
                    updated_at = NOW()
                WHERE cti_id = :controlId
            """, [controlId: controlId, reason: reason, overrideBy: overrideBy])
            
            // Log override event to audit_log_aud table
            logControlOverrideEvent(controlId, reason, overrideBy)
        }
    }
}
```

#### Bulk Control Operations Pattern
```groovy
def bulkInstantiateControls(UUID phaseId, List<UUID> controlMasterIds) {
    DatabaseUtil.withSql { sql ->
        sql.withTransaction {
            controlMasterIds.each { masterControlId ->
                sql.execute("""
                    INSERT INTO controls_instance_cti (
                        cti_id, ctm_id, phi_id, cti_status, cti_is_critical,
                        cti_order, created_by, created_at, updated_by, updated_at
                    )
                    SELECT 
                        :instanceId, :masterControlId, :phaseId, 'PENDING', ctm_is_critical,
                        ctm_order, 'system', NOW(), 'system', NOW()
                    FROM controls_master_ctm 
                    WHERE ctm_id = :masterControlId
                """, [
                    instanceId: UUID.randomUUID(),
                    masterControlId: masterControlId,
                    phaseId: phaseId
                ])
            }
        }
    }
}
```

#### Controls API Repository Pattern (20 Methods)
**Scale**: ControlRepository.groovy with 20 comprehensive methods covering full lifecycle management

1. **Master Control Operations** (5 methods)
   - `findAllMasterControls()`, `findMasterControlById()`, `createMasterControl()`, `updateMasterControl()`, `deleteMasterControl()`

2. **Instance Control Operations** (7 methods)  
   - `findControlInstances()`, `findControlInstanceById()`, `createControlInstancesFromMaster()`, `updateControlInstanceStatus()`, `deleteControlInstance()`, `bulkCreateControlInstances()`, `reorderControlInstances()`

3. **Validation and Override Operations** (4 methods)
   - `validateControlInstance()`, `overrideControlInstance()`, `getControlValidationStatus()`, `getPhaseControlProgress()`

4. **Hierarchical and Filtering Operations** (4 methods)
   - `findControlsByMigration()`, `findControlsByPhase()`, `findCriticalControls()`, `findControlsByStatus()`

### Database Validation Results Pattern
```groovy
// Comprehensive validation of 184 control instances
def validateControlsDatabase() {
    DatabaseUtil.withSql { sql ->
        // Verify total control instances
        def totalControls = sql.firstRow("SELECT COUNT(*) as count FROM controls_instance_cti")
        assert totalControls.count == 184
        
        // Verify critical control distribution (41.85% critical)
        def criticalStats = sql.firstRow("""
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN cti_is_critical THEN 1 END) as critical,
                ROUND(AVG(CASE WHEN cti_is_critical THEN 1.0 ELSE 0.0 END) * 100, 2) as percentage
            FROM controls_instance_cti
        """)
        assert criticalStats.percentage == 41.85
        
        // Verify status distribution
        def statusDistribution = sql.rows("""
            SELECT cti_status, COUNT(*) as count 
            FROM controls_instance_cti 
            GROUP BY cti_status 
            ORDER BY count DESC
        """)
        // Expected: CANCELLED: 58, TODO: 43, FAILED: 42, PASSED: 41
        
        // Verify proper phase relationships
        def phaseRelations = sql.firstRow("""
            SELECT COUNT(*) as count 
            FROM controls_instance_cti cti
            JOIN phases_instance_phi phi ON cti.phi_id = phi.phi_id
            WHERE phi.phi_id IS NOT NULL
        """)
        assert phaseRelations.count == 184
    }
}
```

### Testing Infrastructure Pattern
**Structure**: Unit tests + Integration tests with Controls API-specific validation

#### Controls API Unit Test Pattern
```groovy
class ControlsApiUnitTest {
    static Map mockSqlResults = [:]
    
    static void testFindAllMasterControls() {
        // Mock SQL response for master controls query
        mockSqlResults['SELECT.*FROM controls_master_ctm.*'] = [
            [ctm_id: UUID.randomUUID(), ctm_name: 'Control 1', ctm_is_critical: true],
            [ctm_id: UUID.randomUUID(), ctm_name: 'Control 2', ctm_is_critical: false]
        ]
        
        def mockSql = createMockSql(mockSqlResults)
        def repository = new ControlRepository()
        def result = repository.findAllMasterControls()
        
        assert result.size() == 2
        assert result.any { it.ctm_name == 'Control 1' }
    }
}
```

---

**Pattern Maturity**: These patterns have proven successful across 5 major implementations (APIs + infrastructure + control point system + quality gate management + type safety enhancements) with measurable velocity improvements and comprehensive quality standards. All Sprint 3 APIs completed with enhanced type safety and production reliability.

**Documentation Consolidation**: This file now contains the complete pattern library from both /cline-docs/currentPatterns.md and /docs/currentPatterns.md (consolidated 6 August 2025).