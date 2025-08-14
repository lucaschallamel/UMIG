# US-024: StepsAPI Refactoring to Modern Patterns
**Complete User Story Documentation**

## Story Overview

### Story Metadata
- **Story ID**: US-024
- **Epic**: API Modernization & Admin GUI
- **Sprint**: 4 (Aug 7-13, 2025)
- **Priority**: HIGH PRIORITY (Critical Path)
- **Story Points**: 5
- **Status**: 📋 Ready for Development
- **Dependencies**: None (blocks US-028 Enhanced IterationView)
- **Risk Level**: MEDIUM (refactoring complexity with backward compatibility)

### Business Value Statement
**As a** system developer  
**I want** to refactor StepsAPI to use the modern patterns established in Sprint 3  
**So that** we have consistent API patterns across all 6 core APIs and improved performance for step operations that support advanced UI features

**Business Impact**: Enables US-028 Enhanced IterationView with advanced filtering, bulk operations, and dashboard capabilities while ensuring all APIs follow consistent modern patterns.

---

## Detailed Acceptance Criteria

### AC1: Advanced Query Parameters Implementation
**Given** the need for sophisticated step filtering comparable to other modernized APIs  
**When** calling steps endpoints with various filter combinations  
**Then** the API must support:
- **Hierarchical filtering**: `migrationId`, `iterationId`, `planId`, `sequenceId`, `phaseId`
- **Entity filtering**: `teamId`, `statusId`, `assignedTo`, `labelId`
- **Search capabilities**: Text search across step names and descriptions
- **Sorting options**: `stepNumber`, `createdAt`, `updatedAt`, `status`, `priority`
- **Pagination**: `limit` (max 1000, default 100), `offset` (default 0)
- **Response format**: Consistent with PlansApi.groovy pagination metadata

**Verification**: All filter combinations return correct results with proper SQL query optimization

### AC2: Master/Instance Separation Enhancement
**Given** the canonical master-instance pattern used throughout UMIG  
**When** managing step templates and their instances  
**Then** implement:
- **Master endpoints**: `/steps/master` for template management
- **Instance endpoints**: `/steps/instance/{id}` for specific instance details
- **Bulk instantiation**: POST `/steps/instances/bulk` for creating multiple instances
- **Template management**: Full CRUD for step master templates
- **Instance lifecycle**: Status transitions, assignments, completion tracking

**Verification**: Master-instance relationships maintain data integrity and support template reuse

### AC3: Bulk Operations Support
**Given** the operational need for efficient multi-step management  
**When** performing bulk actions on multiple steps  
**Then** provide endpoints for:
- **Bulk status updates**: `PUT /steps/bulk/status` with validation
- **Bulk team assignments**: `PUT /steps/bulk/assign` with team validation
- **Bulk reordering**: `PUT /steps/bulk/reorder` with sequence number updates
- **Bulk export**: `GET /steps/export?format=json|csv` with filtering support
- **Safety checks**: Validation before bulk operations, transaction rollback on errors

**Verification**: Bulk operations handle 100+ steps efficiently with proper error handling

### AC4: Hierarchical Filtering (ADR-030) Compliance
**Given** the established hierarchical filtering pattern from Sprint 3  
**When** filtering steps across the migration hierarchy  
**Then** ensure:
- **Instance ID usage**: Filter by plan_instance_id, sequence_instance_id, phase_instance_id
- **Optimized JOINs**: Efficient SQL queries for hierarchical relationships
- **Performance targets**: <200ms response time for filtered queries up to 10,000 steps
- **Proper indexing**: Database indexes supporting hierarchical filtering

**Verification**: Hierarchical filtering performs efficiently across large datasets

### AC5: Type Safety and Parameter Validation (ADR-031)
**Given** the type safety patterns established in Sprint 3  
**When** processing query parameters and request bodies  
**Then** implement:
- **Explicit casting**: `UUID.fromString()`, `Integer.parseInt()` for all parameters
- **Input validation**: Parameter format validation with descriptive error messages
- **Error handling**: Proper HTTP status codes (400 for validation, 404 for not found)
- **Request body validation**: JSON schema validation for POST/PUT operations

**Verification**: All invalid inputs return appropriate 400 errors with clear error messages

### AC6: Dashboard and Analytics Endpoints
**Given** the dashboard endpoint pattern from other modernized APIs  
**When** requesting step analytics and summaries  
**Then** provide:
- **Summary endpoint**: `GET /steps/summary` with counts by status, team, phase
- **Progress tracking**: `GET /steps/progress?migrationId={id}` with completion metrics
- **Metrics aggregation**: Step completion rates, average execution time, bottleneck identification
- **Real-time data**: Current status without caching delays

**Verification**: Dashboard endpoints return accurate real-time metrics for IterationView integration

### AC7: Performance Optimization
**Given** the critical performance requirements for step operations  
**When** processing step queries and operations  
**Then** achieve:
- **Response time**: <200ms for standard queries (<1000 steps)
- **Large dataset handling**: <500ms for queries up to 10,000 steps
- **Database optimization**: Proper indexing, query optimization, connection pooling
- **Memory efficiency**: Streaming for large result sets, paginated responses

**Verification**: Performance benchmarks consistently meet targets under realistic load

### AC8: Comprehensive Error Handling
**Given** the robust error handling patterns from Sprint 3  
**When** encountering various error conditions  
**Then** provide:
- **HTTP status codes**: 400 (validation), 404 (not found), 409 (conflict), 500 (server error)
- **Error message format**: Consistent JSON error response structure
- **Transaction safety**: Rollback on errors, atomic operations for bulk updates
- **Logging**: Detailed error logging for debugging and monitoring

**Verification**: All error scenarios return appropriate status codes and descriptive messages

---

## Technical Implementation Plan

### Phase 1: Repository Layer Enhancement (Days 1-2)

#### StepRepository.groovy Enhancements
```groovy
// Add advanced query methods following Sprint 3 patterns
def findStepsWithFilters(sql, filters, limit, offset, sortBy, sortOrder)
def getStepsSummary(sql, migrationId)
def getStepsProgress(sql, migrationId)
def bulkUpdateStepStatus(sql, stepIds, statusId, userId)
def bulkAssignSteps(sql, stepIds, teamId, userId)
def bulkReorderSteps(sql, stepReorderData)
```

#### Database Optimization
- Add composite indexes for hierarchical filtering
- Optimize existing queries for performance
- Implement connection pooling best practices

### Phase 2: API Layer Refactoring (Days 2-3)

#### StepsApi.groovy Modernization
```groovy
// Follow PlansApi.groovy pattern for parameter handling
def parseAndValidateFilters(queryParams)
def validatePaginationParams(queryParams)
def handleBulkOperations(request, operation)
def formatStandardResponse(data, metadata)
```

#### New Endpoint Structure
- `GET /steps` - Enhanced filtering and pagination
- `GET /steps/master` - Master template management
- `GET /steps/instance/{id}` - Instance details with instructions
- `GET /steps/summary` - Dashboard metrics
- `GET /steps/progress` - Progress tracking
- `PUT /steps/bulk/status` - Bulk status updates
- `PUT /steps/bulk/assign` - Bulk team assignments
- `GET /steps/export` - Data export functionality

### Phase 3: Testing and Validation (Days 3-4)

#### Comprehensive Test Suite
- **Unit tests**: Repository method testing with mock SQL
- **Integration tests**: API endpoint testing using ADR-036 framework
- **Performance tests**: Load testing with realistic datasets
- **Regression tests**: Backward compatibility validation

#### Test Coverage Requirements
- 90%+ code coverage for new functionality
- 100% coverage for critical paths (bulk operations, hierarchical filtering)
- Performance benchmarks for all query patterns

---

## Risk Analysis and Mitigation

### High-Risk Areas

#### 1. Backward Compatibility Risk
**Risk**: Existing IterationView functionality breaks during refactoring  
**Probability**: Medium  
**Impact**: High  
**Mitigation**: 
- Maintain existing endpoint signatures
- Implement feature flags for new functionality
- Comprehensive regression testing
- Staged rollout with rollback capability

#### 2. Performance Degradation Risk
**Risk**: New filtering patterns perform worse than current implementation  
**Probability**: Medium  
**Impact**: High  
**Mitigation**:
- Performance baseline establishment before changes
- Database query optimization and indexing
- Performance testing with realistic data volumes
- Query execution plan analysis

#### 3. Data Integrity Risk
**Risk**: Bulk operations cause data inconsistencies  
**Probability**: Low  
**Impact**: High  
**Mitigation**:
- Transaction-wrapped bulk operations
- Validation before execution
- Atomic operations with rollback capability
- Comprehensive error handling and logging

### Medium-Risk Areas

#### 4. Integration Complexity Risk
**Risk**: Complex integration with existing UI components  
**Probability**: Medium  
**Impact**: Medium  
**Mitigation**:
- Gradual feature rollout
- Extensive integration testing
- Clear API documentation and examples

#### 5. Test Coverage Risk
**Risk**: Insufficient test coverage for complex scenarios  
**Probability**: Low  
**Impact**: Medium  
**Mitigation**:
- Mandatory 90% coverage threshold
- Peer review of test scenarios
- Integration with existing test framework

---

## Dependencies and Blockers Analysis

### Blocking Dependencies
**None** - US-024 can begin immediately

### Success Dependencies (Stories that depend on US-024)
- **US-028 Enhanced IterationView**: Requires modernized StepsAPI for advanced filtering and bulk operations
- **Future Dashboard Features**: Depend on summary and progress endpoints

### Technical Dependencies
- **ADR-030** (Hierarchical Filtering): ✅ Established pattern
- **ADR-031** (Type Safety): ✅ Established pattern  
- **ADR-036** (Integration Testing): ✅ Framework available
- **Status Field Normalization**: ✅ Completed in US-006b
- **StepRepository.groovy**: 🔄 Requires enhancement (part of this story)

---

## Definition of Done

### Functional Requirements
- [ ] All 8 acceptance criteria fully implemented and tested
- [ ] Advanced filtering supports all specified parameters
- [ ] Master/instance separation properly implemented
- [ ] Bulk operations functional with safety checks
- [ ] Dashboard endpoints return accurate real-time data
- [ ] Export functionality supports JSON and CSV formats

### Quality Requirements
- [ ] 90%+ test coverage achieved across all new functionality
- [ ] Performance targets met: <200ms standard queries, <500ms large datasets
- [ ] Zero breaking changes for existing IterationView functionality
- [ ] All error scenarios properly handled with appropriate HTTP status codes
- [ ] SQL queries optimized with proper indexing

### Documentation Requirements
- [ ] OpenAPI specification updated with all new endpoints
- [ ] Repository method documentation complete
- [ ] Integration test examples provided
- [ ] Performance benchmark results documented

### Integration Requirements
- [ ] Full compatibility with existing IterationView
- [ ] Integration tests passing for all endpoints
- [ ] Postman collection updated with new endpoints
- [ ] Admin GUI components ready for modernized API

---

## Success Metrics

### Performance Metrics
- **Response Time**: <200ms for standard queries (target: 150ms average)
- **Large Dataset Performance**: <500ms for 10,000+ step queries
- **Bulk Operation Performance**: <2s for 100-step bulk updates
- **Database Query Efficiency**: <50ms average SQL execution time

### Quality Metrics
- **Test Coverage**: ≥90% (target: 95%)
- **Error Rate**: <1% in production scenarios
- **API Consistency Score**: 100% alignment with Sprint 3 patterns
- **Backward Compatibility**: 100% existing functionality preserved

### Business Metrics
- **Development Velocity**: Enables US-028 Enhanced IterationView
- **API Consistency**: All 6 core APIs using modern patterns
- **Feature Enablement**: Bulk operations, advanced filtering, dashboard integration
- **Technical Debt Reduction**: Consistent patterns across entire API layer

---

## Testing Requirements

### Unit Testing Strategy
```groovy
// StepRepositoryTest.groovy
class StepRepositoryTest {
    def "should filter steps by hierarchical parameters"()
    def "should handle bulk status updates with validation"()
    def "should return correct summary metrics"()
    def "should maintain data integrity during bulk operations"()
}
```

### Integration Testing Strategy
Using ADR-036 framework:
- **Endpoint testing**: All new endpoints with various parameter combinations
- **Error scenario testing**: Invalid parameters, data conflicts, constraint violations
- **Performance testing**: Large dataset queries, bulk operations under load
- **Regression testing**: Existing IterationView compatibility

### Performance Testing Requirements
- **Load testing**: 1000 concurrent step queries
- **Stress testing**: 10,000+ step datasets
- **Bulk operation testing**: 100+ step bulk updates
- **Memory profiling**: Large result set handling

---

## Stakeholder Communication Plan

### Development Team
- **Daily standup updates** on refactoring progress
- **Technical review sessions** for complex implementation decisions
- **Pair programming** for critical repository enhancements

### Product Owner
- **Sprint planning session** for story breakdown confirmation
- **Mid-sprint review** of acceptance criteria completion
- **Demo session** showcasing new API capabilities

### QA Team
- **Test strategy review** for comprehensive coverage planning
- **Early access** to development environment for testing
- **Regression testing coordination** for IterationView compatibility

### Operations Team
- **Performance impact assessment** for production deployment
- **Monitoring strategy** for new endpoint usage patterns
- **Rollback procedure** documentation for risk mitigation

---

This comprehensive user story documentation provides the complete framework for successfully implementing US-024 StepsAPI Refactoring to Modern Patterns, ensuring consistency with Sprint 3 patterns while maintaining backward compatibility and achieving performance targets that enable advanced UI features in US-028.