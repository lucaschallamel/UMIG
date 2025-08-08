# US-024: StepsAPI Refactoring to Modern Patterns

## Story Header

| Field          | Value                                   |
| -------------- | --------------------------------------- |
| **Story ID**   | US-024                                  |
| **Epic**       | API Modernization & Standardization     |
| **Title**      | StepsAPI Refactoring to Modern Patterns |
| **Priority**   | HIGH                                    |
| **Complexity** | 5 points                                |
| **Sprint**     | Sprint 4                                |
| **Timeline**   | Days 2-3                                |
| **Assignee**   | Backend Developer                       |
| **Status**     | Ready for Development                   |

## User Story

**As a** UMIG developer and system integrator  
**I want** the StepsAPI to follow the modern patterns established in Sprint 3  
**So that** I can leverage advanced filtering, bulk operations, and optimized performance for the most granular level of the migration hierarchy.

## Background and Current State Analysis

### Current State

The existing StepsAPI (`src/groovy/umig/api/v2/StepsApi.groovy`) provides basic CRUD operations but lacks the sophisticated features implemented in Sprint 3's modernized APIs. Steps represent the most granular operational level in UMIG's hierarchy and are critical for:

- Iteration View primary interface functionality
- Detailed migration execution tracking
- Granular progress monitoring
- Team-specific task assignment

### Sprint 3 Modernization Achievements

Sprint 3 successfully modernized four APIs with consistent patterns:

- **PlansApi** (US-001): Comprehensive filtering, pagination, hierarchical queries
- **SequencesApi** (US-002): Bulk operations, advanced filtering
- **PhasesApi** (US-003): Master/instance separation, performance optimization
- **InstructionsApi** (US-004): Sub-200ms response times, enhanced error handling

### Technical Debt

Current StepsAPI limitations:

- Basic filtering without hierarchical support
- No bulk operations capability
- Limited query parameter support
- Inconsistent error handling patterns
- Missing status normalization compliance (ADR-035)
- No performance optimization for large datasets

## Detailed Acceptance Criteria

### AC1: Core API Modernization

**Given** the existing StepsAPI structure  
**When** implementing modern patterns  
**Then** the API must include:

- ✅ Master/instance separation following ADR-030
- ✅ Comprehensive CRUD operations with enhanced error handling
- ✅ Status field normalization compliance (ADR-035)
- ✅ Type safety patterns with explicit casting (ADR-031)
- ✅ DatabaseUtil.withSql pattern consistency

**Technical Specifications:**

```groovy
// Enhanced endpoint structure
steps(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def params = [:]
    def filters = request.getQueryParametersMap()

    // Type safety compliance (ADR-031)
    if (filters.phaseInstanceId) {
        params.phaseInstanceId = UUID.fromString(filters.phaseInstanceId as String)
    }
    if (filters.teamId) {
        params.teamId = Integer.parseInt(filters.teamId as String)
    }

    // Status normalization (ADR-035)
    if (filters.status) {
        params.status = StatusUtil.normalizeStatus(filters.status as String)
    }
}
```

### AC2: Hierarchical Filtering Implementation

**Given** the migration hierarchy (Migrations → Plans → Sequences → Phases → Steps)  
**When** querying steps with parent filters  
**Then** the system must support:

- ✅ Filtering by Phase Instance ID (immediate parent)
- ✅ Filtering by Sequence Instance ID (grandparent)
- ✅ Filtering by Plan Instance ID (great-grandparent)
- ✅ Filtering by Migration ID (root ancestor)
- ✅ Combined hierarchical filters with AND logic

**Query Parameter Matrix:**

```yaml
Required Filters:
  - phaseInstanceId: UUID (direct parent)

Optional Hierarchical Filters:
  - sequenceInstanceId: UUID
  - planInstanceId: UUID
  - migrationId: UUID
  - teamId: Integer
  - assigneeId: String
  - status: String (normalized)
  - priority: String
  - category: String
  - estimatedDurationMin: Integer (range)
  - actualDurationMin: Integer (range)

Advanced Filters:
  - hasInstructions: Boolean
  - isBlocking: Boolean
  - lastModifiedAfter: ISO datetime
  - createdAfter: ISO datetime
```

### AC3: Bulk Operations Support

**Given** the need for efficient step management  
**When** performing bulk operations  
**Then** the API must support:

- ✅ Bulk status updates with validation
- ✅ Bulk assignment operations
- ✅ Bulk priority adjustments
- ✅ Bulk category updates
- ✅ Transaction-based error handling

**Bulk Operation Endpoints:**

```groovy
stepsBulkUpdate(httpMethod: "PATCH", groups: ["confluence-users"]) { request, binding ->
    def bulkRequest = parseJson(request.reader.text)

    DatabaseUtil.withSql { sql ->
        sql.withTransaction {
            bulkRequest.updates.each { update ->
                // Validate and apply individual updates
                validateStepUpdate(update)
                applyStepUpdate(sql, update)
            }
        }
    }
}
```

### AC4: Advanced Query Parameters

**Given** complex filtering requirements  
**When** querying steps  
**Then** the API must support:

- ✅ Sorting: `sortBy` and `sortOrder` parameters
- ✅ Pagination: `offset` and `limit` parameters (max 100)
- ✅ Field selection: `fields` parameter for response optimization
- ✅ Search: `search` parameter for text-based filtering
- ✅ Date range filtering with proper validation

**Example Query:**

```
GET /rest/scriptrunner/latest/custom/steps?
    phaseInstanceId=123e4567-e89b-12d3-a456-426614174000&
    status=in_progress&
    teamId=42&
    sortBy=priority,lastModified&
    sortOrder=desc&
    offset=0&
    limit=50&
    fields=id,title,status,assignee,estimatedDuration
```

### AC5: Repository Pattern Enhancement

**Given** the existing StepRepository structure  
**When** implementing modern patterns  
**Then** the repository must include:

- ✅ Enhanced `findByPhaseInstanceId` with comprehensive filtering
- ✅ Hierarchical query methods (`findBySequenceInstanceId`, etc.)
- ✅ Bulk operation methods with transaction support
- ✅ Performance-optimized queries with proper indexing
- ✅ Consistent error handling and logging

**Repository Method Signatures:**

```groovy
class StepRepository {
    static List<Map> findByPhaseInstanceIdWithFilters(Map params)
    static List<Map> findByHierarchicalFilters(Map filters)
    static Map bulkUpdateSteps(List<Map> updates)
    static List<Map> findStepsWithPagination(Map params, int offset, int limit)
    static int countStepsWithFilters(Map filters)
}
```

## Technical Implementation Plan

### Phase 1: Core Infrastructure (4-6 hours)

1. **Repository Enhancement**
   - Extend StepRepository with modern query methods
   - Implement hierarchical filtering logic
   - Add bulk operation support with transactions
   - Optimize database queries with proper JOIN strategies

2. **Type Safety Implementation**
   - Apply ADR-031 patterns for parameter casting
   - Implement validation for all input parameters
   - Add comprehensive error handling

### Phase 2: API Endpoints Modernization (6-8 hours)

1. **GET Operations Enhancement**
   - Implement comprehensive filtering
   - Add pagination and sorting support
   - Optimize response times for large datasets
   - Add field selection capabilities

2. **Bulk Operations Implementation**
   - Create bulk update endpoints
   - Implement transaction-based processing
   - Add validation and error reporting

### Phase 3: Performance Optimization (2-4 hours)

1. **Query Optimization**
   - Implement database query optimization
   - Add response caching where appropriate
   - Monitor and optimize for <200ms response times

2. **Integration Testing**
   - Test hierarchical filtering scenarios
   - Validate bulk operations performance
   - Ensure compatibility with existing Iteration View

### Code Patterns and Standards

**Database Access Pattern:**

```groovy
DatabaseUtil.withSql { sql ->
    def query = """
        SELECT s.*, p.phi_title, sq.sqi_title, pl.pli_title
        FROM step_instances s
        JOIN phase_instances p ON s.phi_id = p.phi_id
        JOIN sequence_instances sq ON p.sqi_id = sq.sqi_id
        JOIN plan_instances pl ON sq.pli_id = pl.pli_id
        WHERE s.phi_id = :phaseInstanceId
        ${filters.status ? "AND s.sti_status = :status" : ""}
        ${filters.teamId ? "AND s.sti_team_id = :teamId" : ""}
        ORDER BY s.sti_order_index, s.sti_title
        LIMIT :limit OFFSET :offset
    """
    return sql.rows(query, params)
}
```

**Error Handling Pattern:**

```groovy
try {
    def result = StepRepository.findByPhaseInstanceIdWithFilters(params)
    return Response.ok(result).build()
} catch (IllegalArgumentException e) {
    return Response.status(400)
        .entity([error: "Invalid parameters", details: e.message])
        .build()
} catch (SQLException e) {
    log.error("Database error in steps query", e)
    return Response.status(500)
        .entity([error: "Database operation failed"])
        .build()
}
```

## Dependencies and Integration Points

### Direct Dependencies

- **PhaseRepository**: For hierarchical validation
- **TeamRepository**: For team-based filtering validation
- **UserRepository**: For assignee validation
- **StatusUtil**: For status normalization (ADR-035)

### Integration Points

- **Iteration View**: Primary consumer of enhanced filtering
- **Admin GUI**: Benefits from improved performance and bulk operations
- **InstructionsAPI**: Parent-child relationship validation
- **Audit System**: Enhanced logging for bulk operations

### Database Schema Dependencies

- **step_instances table**: Primary data source
- **phase_instances table**: Parent relationship
- **sequence_instances table**: Hierarchical filtering
- **plan_instances table**: Hierarchical filtering
- **Indexes**: Ensure proper indexing for performance

## Testing Strategy

### Unit Tests (StepRepositoryTest.groovy)

- ✅ Test all repository methods with various filter combinations
- ✅ Validate type safety and parameter casting
- ✅ Test bulk operations with transaction rollback scenarios
- ✅ Performance testing for large datasets (1000+ steps)

### Integration Tests (StepsApiIntegrationTest.groovy)

- ✅ End-to-end API testing with realistic data
- ✅ Hierarchical filtering validation across all levels
- ✅ Bulk operations testing with concurrent access
- ✅ Performance benchmarking for response times

### API Contract Tests

- ✅ OpenAPI specification compliance
- ✅ Response format validation
- ✅ Error response consistency
- ✅ Pagination and sorting behavior

**Test Data Requirements:**

```groovy
// Comprehensive test dataset
Migration: 1 (with complete hierarchy)
  └── Plans: 3 instances
      └── Sequences: 5 instances
          └── Phases: 10 instances
              └── Steps: 100+ instances (varied status, teams, priorities)
```

## Success Criteria and Performance Targets

### Functional Success Criteria

- ✅ **API Compatibility**: 100% backward compatibility with existing endpoints
- ✅ **Feature Parity**: All Sprint 3 patterns successfully implemented
- ✅ **Data Integrity**: Zero data loss during modernization
- ✅ **Error Handling**: Consistent error responses across all scenarios

### Performance Targets

- ✅ **Response Time**: <200ms for standard queries (up to 100 steps)
- ✅ **Bulk Operations**: <500ms for bulk updates (up to 50 steps)
- ✅ **Hierarchical Queries**: <300ms for cross-hierarchy filtering
- ✅ **Memory Usage**: <50MB heap impact for large result sets

### Quality Metrics

- ✅ **Test Coverage**: >90% code coverage
- ✅ **API Consistency**: 100% adherence to established patterns
- ✅ **Documentation**: Complete API documentation updates
- ✅ **Logging**: Comprehensive audit trail for all operations

## Risk Assessment

### High Risk Items

1. **Performance Degradation**
   - _Risk_: Complex hierarchical queries may impact response times
   - _Mitigation_: Implement query optimization and database indexing
   - _Contingency_: Fallback to simplified queries if performance targets missed

2. **Bulk Operations Complexity**
   - _Risk_: Transaction management and error handling complexity
   - _Mitigation_: Implement comprehensive testing and validation
   - _Contingency_: Limit bulk operation size and implement queuing

### Medium Risk Items

1. **Integration Impact**
   - _Risk_: Changes may affect Iteration View performance
   - _Mitigation_: Thorough integration testing with realistic data volumes
   - _Contingency_: Feature flagging for gradual rollout

2. **Data Consistency**
   - _Risk_: Status normalization changes may affect existing data
   - _Mitigation_: Implement migration scripts and validation
   - _Contingency_: Rollback procedures for data inconsistencies

### Low Risk Items

1. **API Contract Changes**
   - _Risk_: Minor breaking changes in response format
   - _Mitigation_: Maintain backward compatibility
   - _Contingency_: Version API endpoints if necessary

## Migration and Compatibility Considerations

### Backward Compatibility

- ✅ **Existing Endpoints**: Maintain all current endpoint signatures
- ✅ **Response Format**: Preserve existing response structure
- ✅ **Query Parameters**: Add new parameters without breaking existing ones
- ✅ **Error Codes**: Maintain existing HTTP status code patterns

### Data Migration Strategy

1. **Status Normalization**: Apply ADR-035 patterns to existing step data
2. **Index Creation**: Add database indexes for performance optimization
3. **Validation**: Comprehensive data integrity checks
4. **Rollback Plan**: Database backup and rollback procedures

### Deployment Strategy

1. **Feature Flags**: Implement gradual feature enablement
2. **Monitoring**: Enhanced logging and performance monitoring
3. **Validation**: Post-deployment data integrity verification
4. **Rollback**: Automated rollback procedures if issues detected

## Acceptance Testing Checklist

### Pre-Development

- [ ] Review Sprint 3 API patterns (PlansApi, SequencesApi, PhasesApi, InstructionsApi)
- [ ] Validate database schema and indexing requirements
- [ ] Confirm integration points with Iteration View
- [ ] Set up performance testing environment

### Development Phase

- [ ] Implement StepRepository enhancements
- [ ] Modernize StepsAPI endpoints following established patterns
- [ ] Implement comprehensive error handling
- [ ] Add bulk operations support
- [ ] Implement status normalization compliance

### Testing Phase

- [ ] Execute unit test suite with >90% coverage
- [ ] Run integration tests with realistic data volumes
- [ ] Performance testing meets <200ms response time targets
- [ ] Validate hierarchical filtering across all levels
- [ ] Test bulk operations with concurrent access scenarios

### Pre-Production

- [ ] Code review by senior developer
- [ ] API documentation updates completed
- [ ] Integration testing with Iteration View
- [ ] Performance benchmarking completed
- [ ] Deployment and rollback procedures validated

### Production Readiness

- [ ] Feature flags configured for gradual rollout
- [ ] Monitoring and alerting configured
- [ ] Data backup and integrity checks completed
- [ ] Team training on new API capabilities completed

---

## Notes

- **Dependencies**: Requires completion of status normalization (ADR-035) implementation
- **Integration**: Critical for Iteration View enhanced functionality
- **Performance**: Must maintain sub-200ms response times for user experience
- **Compatibility**: Zero-downtime deployment required for production system

**Estimated Effort**: 12-18 hours development + 4-6 hours testing = **2-3 days**
