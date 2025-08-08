# Sprint 4 Story Breakdown & Implementation Plan

**Sprint**: Sprint 4 - API Modernization & Admin GUI  
**Branch**: `sprint-004-api-modernization-admin-gui`  
**Duration**: August 7-13, 2025 (5 working days)  
**Total Points**: 33 (5 completed, 28 in progress)

## Sprint 4 Story Map

### ✅ Day 1 (Aug 7) - COMPLETED
- **US-017**: Status Field Normalization (5 points) ✅

### 🚨 Day 2 (Aug 8) - CRITICAL INFRASTRUCTURE
- **US-032**: Confluence Upgrade to v9.2.7 & ScriptRunner 9.21.0 (3 points) ⭐ URGENT

### 🔄 Days 2-3 (Aug 8-9) - API Refactoring
- **US-024**: StepsAPI Refactoring to Modern Patterns (5 points) ⭐ HIGH PRIORITY
- **US-025**: MigrationsAPI Refactoring (3 points)

### 📋 Days 3-4 (Aug 9-12) - Admin GUI & UI
- **US-031**: Admin GUI Complete Integration (8 points)
- **US-028**: Enhanced IterationView with New APIs (3 points)

### 📋 Day 5 (Aug 13) - Quality & Documentation
- **US-022**: Integration Test Suite Expansion (3 points)
- **US-030**: API Documentation Completion (3 points)

---

## US-032: Confluence Upgrade to v9.2.7 & ScriptRunner 9.21.0

### Story Overview
**As a** system administrator  
**I want** to upgrade our Confluence environment to v9.2.7 and ScriptRunner to 9.21.0  
**So that** UMIG continues to function properly on the updated platform with security patches and compatibility

### Current State Analysis
- **Confluence**: Currently running on older version
- **ScriptRunner**: Currently running on older version  
- **UMIG**: Built on Groovy/ScriptRunner with REST API endpoints
- **Risk**: Version incompatibilities could break existing functionality

### Target State
- **Confluence v9.2.7**: Latest stable version with security updates
- **ScriptRunner v9.21.0**: Compatible version with latest features
- **UMIG**: Fully functional on upgraded platform
- **Zero downtime**: Upgrade should not disrupt ongoing development

### Implementation Checklist

#### 1. Pre-Upgrade Assessment
- [ ] Document current Confluence and ScriptRunner versions
- [ ] Backup current UMIG configuration and data
- [ ] Review ScriptRunner 9.21.0 compatibility notes
- [ ] Identify potential breaking changes
- [ ] Test current UMIG functionality baseline

#### 2. Development Environment Upgrade
- [ ] Update local-dev-setup Confluence container to v9.2.7
- [ ] Update ScriptRunner to 9.21.0 in development
- [ ] Verify UMIG APIs still function correctly
- [ ] Run full integration test suite
- [ ] Test Admin GUI functionality
- [ ] Verify database connections and migrations

#### 3. Code Compatibility Review
- [ ] Review Groovy 3.0.15 compatibility with new ScriptRunner
- [ ] Check REST API endpoint patterns
- [ ] Verify CustomEndpointDelegate functionality
- [ ] Test DatabaseUtil.withSql patterns
- [ ] Validate macro implementations
- [ ] Check email service functionality

#### 4. Testing & Validation
- [ ] Run complete integration test suite
- [ ] Test all API endpoints (25+ endpoints)
- [ ] Verify Admin GUI functionality
- [ ] Test iteration view performance
- [ ] Validate data persistence and queries
- [ ] Check security configurations

#### 5. Documentation Updates
- [ ] Update local-dev-setup README with new versions
- [ ] Document any configuration changes needed
- [ ] Update deployment instructions
- [ ] Note any breaking changes discovered
- [ ] Update system requirements

### Dependencies
- Development environment must be stable before proceeding with other Sprint 4 work
- All subsequent development depends on stable platform

### Success Criteria
- [ ] Confluence v9.2.7 running successfully
- [ ] ScriptRunner v9.21.0 installed and functional
- [ ] All existing UMIG functionality working
- [ ] All integration tests passing
- [ ] Admin GUI fully operational
- [ ] Performance maintained or improved
- [ ] Zero data loss or corruption

### Risk Mitigation
- **Complete backup** before any changes
- **Incremental approach** - dev environment first
- **Rollback plan** if upgrade fails
- **Communication** with stakeholders about timing

---

## US-024: StepsAPI Refactoring to Modern Patterns

### Story Overview
**As a** system developer  
**I want** to refactor StepsAPI to use the modern patterns established in Sprint 3  
**So that** we have consistent API patterns and improved performance for Step operations

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

### Implementation Checklist

#### 1. Advanced Query Parameters
- [ ] Implement comprehensive filtering
  - [ ] By migration_id
  - [ ] By iteration_id
  - [ ] By plan_id
  - [ ] By sequence_id
  - [ ] By phase_id
  - [ ] By team_id
  - [ ] By status
  - [ ] By assigned_to
- [ ] Add sorting capabilities
  - [ ] By step_number
  - [ ] By created_at
  - [ ] By updated_at
  - [ ] By status
- [ ] Implement pagination
  - [ ] Limit/offset pattern
  - [ ] Default limits
  - [ ] Max limit enforcement

#### 2. Master/Instance Separation
- [ ] Implement master step template support
- [ ] Add instance management
- [ ] Create template instantiation endpoints
- [ ] Add bulk instance creation

#### 3. Bulk Operations
- [ ] Bulk status updates
- [ ] Bulk team assignment
- [ ] Bulk deletion (with safety checks)
- [ ] Bulk reordering

#### 4. Hierarchical Filtering (ADR-030)
- [ ] Accept instance IDs for filtering
- [ ] Implement proper JOIN strategies
- [ ] Optimize for large datasets

#### 5. Status Field Normalization (ADR-035)
- [ ] Ensure FK compliance to status_sts
- [ ] Support both ID and name inputs
- [ ] Proper status validation

#### 6. Performance Optimization
- [ ] Implement query optimization
- [ ] Add database indexes where needed
- [ ] Implement caching strategy
- [ ] Target <200ms response time

#### 7. Error Handling
- [ ] Comprehensive error messages
- [ ] Proper HTTP status codes
- [ ] Transaction rollback on errors
- [ ] Validation feedback

#### 8. Testing
- [ ] Unit tests for new methods
- [ ] Integration tests for all endpoints
- [ ] Performance tests for large datasets
- [ ] Error scenario coverage

### Technical Implementation Plan

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

### Dependencies
- StepRepository.groovy (needs enhancement)
- DatabaseUtil (existing)
- Status normalization (US-017) ✅
- ADR-030 (Hierarchical Filtering)
- ADR-031 (Type Safety)

### Success Criteria
- [ ] All Sprint 3 patterns implemented
- [ ] Performance <200ms for standard queries
- [ ] 90%+ test coverage
- [ ] Full backward compatibility
- [ ] Documentation complete

---

## US-025: MigrationsAPI Refactoring

### Story Overview
**As a** system developer  
**I want** to refactor MigrationsAPI to modern patterns  
**So that** the top-level entity API is consistent and performant

### Implementation Checklist
- [ ] Consistent CRUD patterns
- [ ] Comprehensive filtering options
- [ ] Bulk status updates
- [ ] Progress aggregation endpoints
- [ ] Transaction handling
- [ ] Error handling and validation

### Technical Notes
- Top-level entity affecting all others
- Currently very basic implementation
- Critical for dashboard functionality

---

## US-031: Admin GUI Complete Integration

### Story Overview
**As a** system administrator  
**I want** a fully functional Admin GUI for managing all UMIG entities  
**So that** I can efficiently administer users, teams, migrations, and all canonical data

### Current State
- 9 entities already configured in admin-gui.js
- SPA architecture established
- Users management complete
- Missing: Applications, Labels, Migrations, Steps, Instructions, Controls, Iterations, Audit logs

### Implementation Checklist
- [ ] Connect to Sprint 3 APIs
  - [ ] Plans API integration
  - [ ] Sequences API integration
  - [ ] Phases API integration
  - [ ] Instructions API integration
  - [ ] Controls API integration
- [ ] Complete missing entities
  - [ ] Applications management
  - [ ] Labels management
  - [ ] Migrations management
  - [ ] Steps management (after US-024)
  - [ ] Iterations management
- [ ] Add Audit logs viewing
- [ ] Ensure role-based access control
- [ ] Test all CRUD operations

---

## US-028: Enhanced IterationView with New APIs

### Story Overview
**As a** migration coordinator  
**I want** the IterationView enhanced to use the refactored StepsAPI  
**So that** I get improved performance and new features

### Implementation Checklist
- [ ] Integrate with refactored StepsAPI
- [ ] Implement real-time status updates
- [ ] Add bulk operations UI
- [ ] Performance improvements
- [ ] Enhanced filtering

---

## US-022: Integration Test Suite Expansion

### Story Overview
**As a** developer  
**I want** comprehensive integration tests for all refactored APIs  
**So that** we maintain quality and prevent regressions

### Implementation Checklist
- [ ] Complete test coverage for StepsAPI
- [ ] Complete test coverage for MigrationsAPI
- [ ] Performance benchmarking tests
- [ ] Load testing for concurrent operations
- [ ] Test data generators

---

## US-030: API Documentation Completion

### Story Overview
**As a** developer  
**I want** complete and updated documentation for all APIs  
**So that** the system is maintainable and understandable

### Implementation Checklist
- [ ] Update OpenAPI spec
- [ ] Document all refactored endpoints
- [ ] Create migration guide
- [ ] Update Postman collections
- [ ] Generate API changelog

---

## Daily Execution Plan

### Day 2 (Aug 8) - Thursday  
**Morning (4 hours)**: 🚨 CRITICAL INFRASTRUCTURE
- **US-032**: Confluence Upgrade to v9.2.7 & ScriptRunner 9.21.0
- Document current versions and backup system
- Update local-dev-setup environment
- Test UMIG functionality on new platform

**Afternoon (4 hours)**:
- Complete Confluence upgrade validation
- Run full integration test suite
- Begin StepsAPI analysis if upgrade stable
- Create detailed refactoring plan

### Day 3 (Aug 9) - Friday
**Morning (4 hours)**:
- Complete StepRepository work
- Begin StepsAPI refactoring
- Implement new endpoints

**Afternoon (4 hours)**:
- Complete StepsAPI refactoring
- Begin MigrationsAPI work
- Write initial tests

### Day 4 (Aug 12) - Monday
**Morning (4 hours)**:
- Complete MigrationsAPI refactoring
- Begin Admin GUI integration
- Connect Sprint 3 APIs

**Afternoon (4 hours)**:
- Complete Admin GUI integration
- Begin IterationView enhancement
- Integration testing

### Day 5 (Aug 13) - Tuesday
**Morning (4 hours)**:
- Complete IterationView enhancement
- Expand integration test suite
- Performance testing

**Afternoon (4 hours)**:
- Complete API documentation
- Final testing and polish
- Sprint wrap-up

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| API refactoring complexity | Use proven Sprint 3 patterns |
| Time constraints | Front-load critical work |
| Integration issues | Test continuously |
| Performance regression | Benchmark throughout |

---

## Notes
- This document will be updated daily with progress
- Each story has detailed acceptance criteria in sprint4-user-stories.md
- Follow ADR-031 for type safety
- Maintain backward compatibility where possible