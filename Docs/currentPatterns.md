# Current Patterns & Implementation Guidelines

**Last Updated:** 2025-07-31  
**Version:** 1.1  
**Scope:** Active development patterns from US-001 and US-002 implementation

## Overview

This document captures the current implementation patterns, coding standards, and technical solutions that have been proven effective in the UMIG project. These patterns are derived from successful implementations and should be followed for consistency and reliability.

## Static Type Checking Patterns for Groovy/ScriptRunner

### Problem Context

ScriptRunner environments require explicit type casting due to static type checking requirements. Without proper casting, runtime `ClassCastException` errors occur that are difficult to debug and trace.

### Key Learnings from US-002

During US-002 implementation, we discovered specific patterns that prevent runtime type errors:

#### 1. Mandatory Type Casting for Parameters

**UUID Parameters (CRITICAL)**:
```groovy
// CORRECT - Explicit casting prevents ClassCastException
if (filters.migrationId) {
    query += ' AND mig.mig_id = :migrationId'
    params.migrationId = UUID.fromString(filters.migrationId as String)
}

// INCORRECT - Will cause runtime ClassCastException
params.migrationId = UUID.fromString(filters.migrationId)  // Missing 'as String'
```

**Integer Parameters**:
```groovy
// CORRECT - Explicit casting for integers
if (filters.teamId) {
    query += ' AND stm.tms_id_owner = :teamId'
    params.teamId = Integer.parseInt(filters.teamId as String)
}

// INCORRECT - Type inference fails in ScriptRunner
params.teamId = Integer.parseInt(filters.teamId)  // Missing 'as String'
```

**Path Parameter Extraction**:
```groovy
// CORRECT - Safe path parameter handling with null protection
def pathParts = getAdditionalPath(request)?.split('/') ?: []
if (pathParts.size() >= 1) {
    def id = Integer.parseInt(pathParts[0] as String)
}

// INCORRECT - No null protection or type casting
def pathParts = getAdditionalPath(request).split('/')
def id = Integer.parseInt(pathParts[0])
```

#### 2. Evolution from Dynamic Property Access to Map Notation

**Original Pattern (Problematic)**:
```groovy
// Dynamic property access caused type inference issues
def result = sql.rows(query)
result.each { row ->
    // This caused ClassCastException in some contexts
    def value = row.property_name
}
```

**Current Pattern (Correct)**:
```groovy
// Map notation with explicit casting
def result = sql.rows(query)
result.each { row ->
    def value = row['property_name'] as String
    def numValue = row['numeric_field'] as Integer
}
```

#### 3. Complete Field Selection Pattern

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

### 4. Instance vs Master ID Filtering

**Rule**: Always use instance IDs for hierarchical filtering to ensure correct data retrieval:

```groovy
// CORRECT - Use instance IDs for filtering
query += ' AND pli.pli_id = :planId'      // plan instance ID
query += ' AND sqi.sqi_id = :sequenceId'  // sequence instance ID
query += ' AND phi.phi_id = :phaseId'     // phase instance ID

// INCORRECT - Using master IDs misses instance-specific data
query += ' AND plm.plm_id = :planId'      // Wrong! Uses master ID
```

## Advanced Database Patterns

### Circular Dependency Detection with Recursive CTEs

**Pattern**: Use PostgreSQL recursive Common Table Expressions for complex dependency validation.

**Implementation from US-002**:
```sql
WITH RECURSIVE dependency_chain AS (
    -- Base case: all sequences in the plan
    SELECT sqm_id, predecessor_sqm_id, 1 as depth, 
           ARRAY[sqm_id] as path
    FROM sequences_master_sqm 
    WHERE plm_id = :planId
    
    UNION ALL
    
    -- Recursive case: follow predecessor relationships
    SELECT s.sqm_id, s.predecessor_sqm_id, dc.depth + 1, 
           dc.path || s.sqm_id
    FROM sequences_master_sqm s
    JOIN dependency_chain dc ON s.predecessor_sqm_id = dc.sqm_id
    WHERE s.sqm_id != ALL(dc.path) AND dc.depth < 50
)
SELECT COUNT(*) > 0 as has_cycle
FROM dependency_chain 
WHERE sqm_id = ANY(path[1:array_length(path,1)-1])
```

**Benefits**:
- Detects circular dependencies in complex hierarchies
- Prevents infinite loops with depth limiting
- Path tracking for debugging dependency chains
- Efficient single-query validation

### Transaction-Based Reordering Pattern

**Pattern**: Use explicit transaction management for complex ordering operations.

**Implementation**:
```groovy
def reorderMasterSequence(UUID planId, Map<UUID, Integer> sequenceOrderMap) {
    DatabaseUtil.withSql { sql ->
        sql.execute("BEGIN")
        try {
            // Validate ordering logic
            if (!validateOrderingMap(sequenceOrderMap)) {
                throw new IllegalArgumentException("Invalid ordering map")
            }
            
            // Apply reordering
            sequenceOrderMap.each { sequenceId, newOrder ->
                sql.executeUpdate("""
                    UPDATE sequences_master_sqm 
                    SET sqm_order = :order, updated_date = CURRENT_TIMESTAMP
                    WHERE sqm_id = :sequenceId AND plm_id = :planId
                """, [order: newOrder, sequenceId: sequenceId, planId: planId])
            }
            
            // Validate final state
            if (!validateSequenceOrdering(planId)) {
                throw new IllegalStateException("Ordering validation failed")
            }
            
            sql.execute("COMMIT")
            return [success: true, message: "Sequences reordered successfully"]
            
        } catch (Exception e) {
            sql.execute("ROLLBACK")
            throw new RuntimeException("Reordering failed: ${e.message}", e)
        }
    }
}
```

## Repository Pattern Improvements

### Lazy Repository Loading for ScriptRunner

**Pattern**: Initialize repositories only when needed to optimize ScriptRunner performance.

```groovy
class ApiEndpoint {
    private SequenceRepository sequenceRepository
    
    // Lazy initialization prevents startup issues
    private SequenceRepository getSequenceRepository() {
        if (!sequenceRepository) {
            sequenceRepository = new SequenceRepository()
        }
        return sequenceRepository
    }
    
    // Usage in endpoint methods
    def sequences = getSequenceRepository().findSequencesByIteration(iterationId)
}
```

### Error Handling with SQL State Mapping

**Pattern**: Map database constraint violations to appropriate HTTP status codes.

```groovy
try {
    def result = repository.createSequence(sequenceData)
    return Response.ok(result).build()
    
} catch (SQLException e) {
    switch (e.getSQLState()) {
        case '23503': // Foreign key constraint violation
            return Response.status(400)
                .entity([error: "Invalid reference: ${e.message}"])
                .build()
        case '23505': // Unique constraint violation
            return Response.status(409)
                .entity([error: "Duplicate entry: ${e.message}"])
                .build()
        default:
            return Response.status(500)
                .entity([error: "Database error: ${e.message}"])
                .build()
    }
} catch (IllegalArgumentException e) {
    return Response.status(400)
        .entity([error: "Invalid parameter: ${e.message}"])
        .build()
}
```

## API Design Patterns

### Hierarchical Filtering Implementation

**Pattern**: Support progressive filtering through query parameters.

```groovy
// Parameter extraction with type safety
def filters = [:]
if (queryParams.getFirst('migrationId')) {
    filters.migrationId = UUID.fromString(queryParams.getFirst('migrationId') as String)
}
if (queryParams.getFirst('iterationId')) {
    filters.iterationId = UUID.fromString(queryParams.getFirst('iterationId') as String)
}
if (queryParams.getFirst('planId')) {
    filters.planId = UUID.fromString(queryParams.getFirst('planId') as String)
}

// Apply filters in repository
def results = repository.findSequencesWithFilters(filters)
```

### Path-Based Endpoint Routing

**Pattern**: Handle complex URL structures with path parsing.

```groovy
def pathParts = getAdditionalPath(request)?.split('/') ?: []

if (pathParts.size() == 2 && pathParts[0] == 'master' && pathParts[1] == 'reorder') {
    // Handle /sequences/master/reorder
    return handleMasterReorder(request, body)
    
} else if (pathParts.size() == 3 && pathParts[0] == 'instance' && pathParts[2] == 'status') {
    // Handle /sequences/instance/{id}/status
    def instanceId = UUID.fromString(pathParts[1] as String)
    return handleStatusUpdate(instanceId, body)
}
```

## Testing Patterns

### ADR-026 Compliant Mock Validation

**Pattern**: Use specific SQL query validation in tests.

```groovy
// CORRECT - Specific query pattern matching
def expectedQuery = /UPDATE sequences_master_sqm SET sqm_order = \?, updated_date = .* WHERE sqm_id = \? AND plm_id = \?/
when(mockSql.executeUpdate(matches(expectedQuery), any(List))).thenReturn(1)

// INCORRECT - Generic pattern (forbidden by ADR-026)
when(mockSql.executeUpdate(contains("UPDATE"), any(List))).thenReturn(1)
```

### Integration Test Structure

**Pattern**: Comprehensive integration tests with real database.

```groovy
class SequencesApiIntegrationTest extends BaseIntegrationTest {
    
    @Test
    void testHierarchicalFiltering() {
        // Setup test data
        def migration = createTestMigration()
        def iteration = createTestIteration(migration.mig_id)
        def plan = createTestPlan(iteration.itr_id)
        
        // Test filtering
        def response = get("/sequences?planId=${plan.pli_id}")
        assert response.status == 200
        assert response.data.size() > 0
        
        // Verify filter application
        response.data.each { sequence ->
            assert sequence.plan_id == plan.pli_id.toString()
        }
    }
}
```

## Performance Optimization Patterns

### Query Optimization for Hierarchical Data

**Pattern**: Use appropriate JOIN strategies for hierarchical queries.

```groovy
// Optimized query with proper JOIN order
def query = '''
    SELECT DISTINCT sqi.sqi_id, sqi.sqi_name, sqi.sqi_order,
           pli.pli_name, itr.itr_name, mig.mig_name
    FROM sequences_instance_sqi sqi
    JOIN plans_instance_pli pli ON sqi.pli_id = pli.pli_id
    JOIN iterations_itr itr ON pli.itr_id = itr.itr_id  
    JOIN migrations_mig mig ON itr.mig_id = mig.mig_id
    WHERE 1=1
'''

// Add filters incrementally for optimal query planning
if (filters.migrationId) {
    query += ' AND mig.mig_id = :migrationId'
}
if (filters.iterationId) {
    query += ' AND itr.itr_id = :iterationId'
}
```

### Batch Operations for Bulk Updates

**Pattern**: Use batch operations for multiple record updates.

```groovy
def updateMultipleSequenceOrders(Map<UUID, Integer> orderMap) {
    DatabaseUtil.withSql { sql ->
        def batch = sql.withBatch("""
            UPDATE sequences_master_sqm 
            SET sqm_order = ?, updated_date = CURRENT_TIMESTAMP
            WHERE sqm_id = ?
        """) { ps ->
            orderMap.each { sequenceId, order ->
                ps.addBatch([order, sequenceId])
            }
        }
        return batch
    }
}
```

## Documentation Automation Enhancement

### OpenAPI Specification Patterns

**Pattern**: Maintain comprehensive API documentation with examples.

```yaml
/sequences/master/{id}/reorder:
  put:
    summary: Reorder sequences within a plan
    parameters:
      - name: id
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              sequenceOrders:
                type: array
                items:
                  type: object
                  properties:
                    sequenceId:
                      type: string
                      format: uuid
                    order:
                      type: integer
          example:
            sequenceOrders:
              - sequenceId: "123e4567-e89b-12d3-a456-426614174000"
                order: 1
              - sequenceId: "987fcdeb-51a2-43d1-9f12-345678901234"
                order: 2
```

### Postman Collection Automation

**Pattern**: Generate collections with environment-based configuration.

```javascript
// Auto-authentication setup
pm.request.auth = {
    type: 'basic',
    basic: {
        username: '{{username}}',
        password: '{{password}}'
    }
};

// Dynamic base URL
pm.request.url = pm.request.url.toString().replace('{{baseUrl}}', pm.environment.get('baseUrl'));
```

## Development Process Patterns

### Four-Phase Implementation Approach

Based on US-002 success, use this systematic approach:

1. **Phase 1: Repository Foundation** (30% of time)
   - Implement comprehensive repository with all CRUD operations
   - Add advanced functionality (ordering, validation, dependencies)
   - Ensure ADR-031 type safety compliance

2. **Phase 2: API Implementation** (35% of time)
   - Create all endpoint handlers following ScriptRunner patterns
   - Implement hierarchical filtering and path routing
   - Add comprehensive error handling

3. **Phase 3: Advanced Features** (15% of time)
   - Implement complex business logic (often integrated with Phases 1-2)
   - Add validation and dependency management
   - Optimize performance

4. **Phase 4: Testing & Validation** (20% of time)
   - Create unit tests with ADR-026 compliance
   - Implement integration tests with real database
   - Validate performance and functionality

### Velocity Metrics

**US-002 Achievement**: 46% faster delivery than planned (5.1 hours actual vs. 6 hours planned)

**Key Factors**:
- Proven pattern reuse from US-001
- Resolved ScriptRunner integration challenges
- Systematic four-phase approach
- Comprehensive testing framework

## Testing Coverage Maintenance Strategies

### Coverage Goals

- **Unit Tests**: 90%+ line coverage, 100% critical method coverage
- **Integration Tests**: All endpoints and error conditions
- **Mock Specificity**: ADR-026 compliance with exact SQL query validation

### Maintenance Pattern

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

## Summary

These patterns represent proven solutions from US-001 and US-002 implementations. They should be consistently applied across all future development to maintain code quality, performance, and reliability.

**Key Success Factors**:
1. **Type Safety**: Mandatory explicit casting for all ScriptRunner operations
2. **Database Excellence**: Advanced SQL patterns with transaction management
3. **Testing Rigor**: ADR-026 compliance with comprehensive coverage
4. **Performance Focus**: Optimized queries and batch operations
5. **Documentation Completeness**: Automated specification generation

**Next Implementation**: US-003 (Phases API) and US-004 (Instructions API) should follow these established patterns for consistent quality and accelerated delivery.