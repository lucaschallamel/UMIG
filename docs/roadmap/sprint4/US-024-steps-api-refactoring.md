# US-024: StepsAPI Refactoring to Modern Patterns

## Story Metadata

**Story ID**: US-024  
**Epic**: API Modernization & Admin GUI  
**Sprint**: 4  
**Priority**: HIGH  
**Story Points**: 5  
**Status**: 📋 Ready for Development  
**Dependencies**: None  
**Risk**: MEDIUM (refactoring complexity)

---

## User Story Statement

**As a** system developer  
**I want** to refactor StepsAPI to use the modern patterns established in Sprint 3  
**So that** we have consistent API patterns and improved performance for Step operations

### Value Statement

This story ensures consistency across all UMIG APIs by applying the modern patterns proven successful in Sprint 3. It will improve performance, maintainability, and provide advanced features like bulk operations and hierarchical filtering.

---

## Acceptance Criteria

### AC1: Advanced Query Parameters Implementation
**Given** the need for sophisticated step filtering  
**When** calling steps endpoints  
**Then** support comprehensive filtering by migration_id, iteration_id, plan_id, sequence_id, phase_id, team_id, status, and assigned_to  
**And** implement sorting capabilities by step_number, created_at, updated_at, and status  
**And** provide pagination with limit/offset pattern and enforcement

### AC2: Master/Instance Separation
**Given** the master-instance pattern used throughout UMIG  
**When** managing step templates and instances  
**Then** implement master step template support  
**And** add instance management capabilities  
**And** create template instantiation endpoints  
**And** provide bulk instance creation

### AC3: Bulk Operations Support
**Given** the need for efficient multi-step operations  
**When** performing bulk actions  
**Then** support bulk status updates  
**And** enable bulk team assignment  
**And** provide bulk deletion with safety checks  
**And** support bulk reordering capabilities

### AC4: Hierarchical Filtering (ADR-030)
**Given** the need for instance-based filtering  
**When** filtering across the hierarchy  
**Then** accept instance IDs for filtering  
**And** implement proper JOIN strategies  
**And** optimize performance for large datasets

### AC5: Status Field Normalization (ADR-035)
**Given** the completed status normalization work  
**When** handling step status  
**Then** ensure FK compliance to status_sts table  
**And** support both ID and name inputs  
**And** provide proper status validation

### AC6: Performance Optimization
**Given** the need for responsive API performance  
**When** processing step queries  
**Then** implement query optimization  
**And** add database indexes where needed  
**And** implement caching strategy  
**And** achieve target response time <200ms

### AC7: Error Handling Enhancement
**Given** the need for robust error management  
**When** encountering errors  
**Then** provide comprehensive error messages  
**And** return proper HTTP status codes  
**And** implement transaction rollback on errors  
**And** provide validation feedback

### AC8: Comprehensive Testing
**Given** the critical nature of step operations  
**When** validating the refactored API  
**Then** achieve 90%+ test coverage  
**And** include integration tests for all endpoints  
**And** implement performance tests for large datasets  
**And** cover all error scenarios

---

## Technical Implementation

### Current State Analysis

**File**: `src/groovy/umig/api/v2/StepsApi.groovy`
- Basic CRUD operations implemented
- Missing advanced features from Sprint 3 patterns
- No hierarchical filtering
- Limited query parameters
- Basic error handling

### Target State (Sprint 3 Pattern)

Based on successful patterns from:
- `PlansApi.groovy` (US-001)
- `SequencesApi.groovy` (US-002)
- `PhasesApi.groovy` (US-003)
- `InstructionsApi.groovy` (US-004)

### Implementation Phases

#### Phase 1: Repository Layer Enhancement
1. Extend `StepRepository.groovy`
2. Add advanced query methods
3. Implement bulk operations
4. Add performance optimizations

#### Phase 2: API Layer Refactoring
1. Refactor `StepsApi.groovy`
2. Implement new endpoints
3. Add parameter validation
4. Enhance error handling

#### Phase 3: Testing & Documentation
1. Write comprehensive tests
2. Update API documentation
3. Performance benchmarking
4. Integration testing

### Code Patterns to Follow

From `PlansApi.groovy`:
```groovy
// Advanced filtering pattern
def filters = [:]
if (params.migration_id) filters.migration_id = UUID.fromString(params.migration_id as String)
if (params.status) filters.status = params.status as String

// Pagination pattern
def limit = params.limit ? Integer.parseInt(params.limit as String) : 100
def offset = params.offset ? Integer.parseInt(params.offset as String) : 0

// Repository call pattern
def result = DatabaseUtil.withSql { sql ->
    return PlanRepository.getPlansWithFilters(sql, filters, limit, offset)
}
```

From `SequencesApi.groovy`:
```groovy
// Bulk operation pattern
def bulkUpdate = { request, binding ->
    def payload = parseJson(request)
    def results = DatabaseUtil.withSql { sql ->
        return SequenceRepository.bulkUpdateSequences(sql, payload.sequences)
    }
    return Response.ok(results).build()
}
```

---

## Dependencies and References

### Technical Dependencies
- StepRepository.groovy (needs enhancement)
- DatabaseUtil (existing)
- Status normalization (US-017) ✅ COMPLETED
- ADR-030 (Hierarchical Filtering)
- ADR-031 (Type Safety)

### Blocking Dependencies
- None (can begin immediately)

### Success Dependencies
- US-028 (Enhanced IterationView) depends on US-024 completion

---

## Definition of Done

- [ ] All Sprint 3 patterns implemented in StepsAPI
- [ ] Advanced filtering, sorting, and pagination functional
- [ ] Master/instance separation implemented
- [ ] Bulk operations working with safety checks
- [ ] Hierarchical filtering optimized for performance
- [ ] Status field normalization fully compliant
- [ ] Performance target <200ms achieved for standard queries
- [ ] Comprehensive error handling implemented
- [ ] 90%+ test coverage achieved
- [ ] Full backward compatibility maintained
- [ ] API documentation updated
- [ ] Integration tests passing
- [ ] Performance benchmarks met

---

## Success Metrics

- **Performance**: <200ms response time for standard queries
- **Test Coverage**: 90%+ code coverage
- **Backward Compatibility**: 100% existing functionality preserved
- **Consistency**: Full alignment with Sprint 3 API patterns
- **Error Rate**: <1% error rate in production scenarios

---

## Notes

- **Critical for US-028**: IterationView enhancement depends on this refactoring
- **Pattern Consistency**: Must follow exact patterns from successful Sprint 3 APIs
- **Performance Focus**: Step operations are frequently used, performance is critical
- **Backward Compatibility**: Existing IterationView must continue working during development

---

**Story Owner**: Development Team  
**Stakeholders**: System administrators, migration coordinators  
**Review Date**: Daily during sprint execution  
**Next Review**: Upon completion