# TD-003: Eliminate Hardcoded Status Values Technical Debt

## Project Overview

**Sprint**: Sprint 7 - Infrastructure Excellence & Admin GUI Migration
**Priority**: P1 (Critical Technical Debt)
**Created**: September 18, 2025
**Owner**: Development Team
**Estimated Effort**: 8 story points (5-7 days)

### Problem Statement

The UMIG application contains 50+ files with hardcoded status values (`PENDING`, `TODO`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `BLOCKED`, `CANCELLED`) instead of dynamically retrieving from the `status_sts` database table. This creates maintenance issues, inconsistencies, and prevents dynamic status management.

### Current State Analysis

Based on codebase analysis, hardcoded status values are found in:

#### High Impact Areas (Critical)

1. **StepDataTransformationService.groovy** (580 lines) - Missing TODO and BLOCKED status formatting
2. **StepInstanceDTO.groovy** (516 lines) - Hardcoded validation arrays and documentation
3. **EntityConfig.js** (2,800+ lines) - Multiple entity status dropdown definitions
4. **step-view.js** (4,700+ lines) - Status filtering, mapping, and color coding
5. **iteration-view.js** - Status filtering and display logic

#### Medium Impact Areas

1. **StepRepository.groovy** - Status-based queries and filtering
2. **Multiple API files** - Status validation and filtering logic
3. **Test files** - Hardcoded status expectations in assertions
4. **Email templates** - Status-based conditional logic

#### Low Impact Areas

1. **Documentation files** - Status references in examples
2. **Migration scripts** - Historical status references
3. **Configuration files** - Default status values

### Solution Architecture

#### Core Components to Create

1. **StatusService.groovy** - Centralized status management service
2. **StatusApi.groovy** - REST endpoint for frontend status retrieval
3. **Frontend StatusProvider.js** - Client-side status caching and management
4. **Status caching mechanism** - Performance optimization

## Implementation Plan

### Phase 1: Foundation Infrastructure (Days 1-2)

#### Phase 1A: StatusService Creation (0.5 days)

**Owner**: Backend Team
**Dependencies**: Existing StatusRepository

**Tasks**:

- Create `StatusService.groovy` extending StatusRepository functionality
- Implement caching mechanism using Groovy caching annotations
- Add status validation and business logic methods
- Create status formatting utilities (display names, CSS classes)

**Deliverables**:

```groovy
class StatusService {
    def getStatusesByType(String entityType, boolean useCache = true)
    def validateStatus(String statusName, String entityType)
    def getStatusDisplayName(String statusCode)
    def getStatusCssClass(String statusCode)
    def refreshStatusCache()
}
```

#### Phase 1B: StatusApi Creation (0.5 days)

**Owner**: Backend Team
**Dependencies**: Phase 1A Complete

**Tasks**:

- Create REST endpoint `/rest/scriptrunner/latest/custom/statuses`
- Support entity type filtering: `/statuses?entityType=Step`
- Implement caching headers for frontend optimization
- Add comprehensive error handling and logging

**Deliverables**:

- GET `/statuses` - All statuses
- GET `/statuses?entityType={type}` - Filtered by entity type
- Response format: `[{"id": "21", "name": "PENDING", "displayName": "Pending", "color": "#DDDDDD", "cssClass": "status-pending"}]`

#### Phase 1C: Frontend StatusProvider (0.5 days)

**Owner**: Frontend Team
**Dependencies**: Phase 1B Complete

**Tasks**:

- Create `StatusProvider.js` for centralized status management
- Implement client-side caching with 5-minute TTL
- Add status lookup utilities for dropdowns and displays
- Create status formatting helpers

**Deliverables**:

```javascript
class StatusProvider {
    static async getStatusesForEntity(entityType)
    static getStatusDisplayName(statusCode)
    static getStatusCssClass(statusCode)
    static refreshCache()
}
```

#### Phase 1D: Service Integration Testing (0.5 days)

**Owner**: QA Team
**Dependencies**: Phases 1A-1C Complete

**Tasks**:

- Unit tests for StatusService methods
- Integration tests for StatusApi endpoints
- Frontend integration tests for StatusProvider
- Performance testing for caching mechanisms

### Phase 2: Critical Service Layer Migration (Days 3-4)

#### Phase 2A: StepDataTransformationService Migration (1 day)

**Owner**: Backend Team
**Priority**: Critical (Missing TODO/BLOCKED formatting)
**Dependencies**: Phase 1 Complete

**Issues to Address**:

1. Missing `TODO` and `BLOCKED` status formatting in `formatStatusForDisplay()` (line 605)
2. Missing `TODO` and `BLOCKED` CSS class mapping in `getStatusCssClass()` (line 658)
3. Hardcoded status defaults in transformation methods

**Tasks**:

- Replace hardcoded status formatting with StatusService calls
- Add missing TODO and BLOCKED status handling
- Update all transformation methods to use dynamic status resolution
- Add comprehensive error handling for missing statuses

**Testing Required**:

- Verify all 7 status types format correctly
- Validate CSS class generation for all statuses
- Test email template integration with new formatting

#### Phase 2B: StepInstanceDTO Migration (1 day)

**Owner**: Backend Team
**Priority**: High (Core data structure)
**Dependencies**: Phase 2A Complete

**Tasks**:

- Replace hardcoded validation array with StatusService validation
- Update documentation to remove hardcoded status lists
- Implement dynamic status validation in `validateStatus()` method
- Update JSON schema validation if applicable

**Before**:

```groovy
return status in ['PENDING', 'TODO', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'BLOCKED', 'CANCELLED']
```

**After**:

```groovy
return statusService.validateStatus(status, 'Step')
```

### Phase 3: Frontend Migration (Day 5)

#### Phase 3A: EntityConfig.js Migration (0.5 days)

**Owner**: Frontend Team
**Priority**: High (Multiple entity dropdowns)

**Current Issue**: 7+ hardcoded status dropdown definitions across different entities

**Tasks**:

- Replace all hardcoded status options with StatusProvider calls
- Implement dynamic dropdown population
- Ensure proper entity type filtering for each dropdown
- Maintain backward compatibility during transition

#### Phase 3B: step-view.js Migration (0.5 days)

**Owner**: Frontend Team
**Priority**: Critical (4,700+ lines, core functionality)

**Current Issues**:

1. Hardcoded status filter options (lines 414-419)
2. Hardcoded status ID mapping (lines 4364-4372)
3. Hardcoded status color mapping (lines 4423-4430, 4533-4540)

**Tasks**:

- Replace hardcoded filter options with dynamic StatusProvider data
- Remove hardcoded status ID mappings
- Implement dynamic color resolution from database
- Update status display logic throughout the file

### Phase 4: Remaining Components & Testing (Days 6-7)

#### Phase 4A: Repository & API Layer (1 day)

**Owner**: Backend Team

**Tasks**:

- Update StepRepository status-based queries to use StatusService
- Migrate remaining API files to use dynamic status validation
- Update email service status conditional logic
- Review and update any remaining service layer components

#### Phase 4B: Test Suite Migration (0.5 days)

**Owner**: QA Team

**Tasks**:

- Update unit tests to use StatusService instead of hardcoded values
- Modify integration tests to handle dynamic status resolution
- Update test data generators to use database statuses
- Add new tests for StatusService and StatusApi

#### Phase 4C: Documentation & Cleanup (0.5 days)

**Owner**: Documentation Team

**Tasks**:

- Update API documentation to reflect new endpoints
- Update developer guides to reference StatusService patterns
- Create migration guide for future status-related development
- Remove or update hardcoded status references in documentation

## Dependencies & Prerequisites

### Internal Dependencies

1. **StatusRepository** - Already exists with required methods
2. **DatabaseUtil** - For transaction management
3. **Component Architecture** - Leveraging US-082-B/C patterns
4. **Admin GUI Framework** - For frontend integration

### External Dependencies

1. **Database Access** - status_sts table must be populated
2. **Caching Infrastructure** - For performance optimization
3. **Build Process** - For deployment of new components

## Risk Analysis & Mitigation

### High Risks

#### Risk 1: Performance Impact from Database Calls

**Probability**: Medium
**Impact**: High
**Mitigation**:

- Implement aggressive caching (5-minute TTL)
- Pre-load statuses at application startup
- Use database connection pooling
- Monitor performance metrics during rollout

#### Risk 2: Frontend Dropdown Loading Delays

**Probability**: Medium
**Impact**: Medium
**Mitigation**:

- Implement client-side caching in StatusProvider
- Pre-fetch common status lists at page load
- Provide loading states and fallback options
- Use async loading with proper error handling

#### Risk 3: Breaking Changes During Migration

**Probability**: High
**Impact**: High
**Mitigation**:

- Implement backward compatibility layer during transition
- Comprehensive testing at each phase
- Feature toggles for gradual rollout
- Immediate rollback plan if issues detected

### Medium Risks

#### Risk 4: Incomplete Migration Leading to Inconsistencies

**Probability**: Medium
**Impact**: Medium
**Mitigation**:

- Comprehensive file scanning and cataloging
- Automated testing to detect hardcoded values
- Code review checklist for all changes
- Post-migration validation testing

#### Risk 5: Database Status Data Inconsistencies

**Probability**: Low
**Impact**: High
**Mitigation**:

- Validate status_sts table completeness before migration
- Create data validation scripts
- Implement fallback to hardcoded values if database fails
- Database backup before any status updates

## Success Criteria

### Functional Requirements

1. **Zero Hardcoded Status Values**: No remaining hardcoded status strings in code
2. **Dynamic Status Loading**: All dropdowns populate from database
3. **Performance Maintained**: Page load times within 10% of current
4. **Backward Compatibility**: Existing functionality preserved during transition
5. **Error Resilience**: Graceful degradation if status service unavailable

### Technical Requirements

1. **Caching Effectiveness**: 95%+ cache hit rate for status requests
2. **API Response Time**: Status API responds within 100ms
3. **Test Coverage**: 90%+ coverage for all new status-related code
4. **Code Quality**: Zero PMD/SonarQube violations in new code

### Business Requirements

1. **Zero Downtime**: Migration completed without service interruption
2. **User Experience**: No visible changes to end users during migration
3. **Maintainability**: Future status additions require only database changes
4. **Audit Trail**: All status changes logged for compliance

## Testing Strategy

### Phase-by-Phase Testing

#### Phase 1 Testing: Infrastructure

- **Unit Tests**: StatusService methods (15+ test cases)
- **Integration Tests**: StatusApi endpoints (8+ test scenarios)
- **Frontend Tests**: StatusProvider functionality (12+ test cases)
- **Performance Tests**: Cache performance and API response times

#### Phase 2 Testing: Service Layer

- **Regression Tests**: Ensure existing functionality unchanged
- **Integration Tests**: Service layer interactions with new StatusService
- **Data Validation**: Verify all status types handled correctly
- **Email Template Tests**: Validate template rendering with new status formatting

#### Phase 3 Testing: Frontend

- **UI Tests**: Dropdown population and selection
- **Integration Tests**: API communication and error handling
- **Cross-browser Tests**: Compatibility across supported browsers
- **User Journey Tests**: End-to-end status change workflows

#### Phase 4 Testing: Comprehensive

- **End-to-End Tests**: Complete user workflows involving status changes
- **Load Tests**: Performance under concurrent user load
- **Security Tests**: Ensure no new vulnerabilities introduced
- **Acceptance Tests**: Validate all success criteria met

### Automated Testing Infrastructure

- **Continuous Integration**: All tests run on every commit
- **Performance Monitoring**: Automated performance regression detection
- **Test Data Management**: Consistent test status data across environments
- **Rollback Testing**: Automated validation of rollback procedures

## Rollback Strategy

### Immediate Rollback (If Critical Issues Detected)

#### Rollback Triggers

1. Performance degradation > 20%
2. Critical functionality broken
3. Data corruption detected
4. Security vulnerabilities introduced

#### Rollback Procedure (< 30 minutes)

1. **Database**: Restore previous application version (no schema changes)
2. **Backend**: Revert to previous codebase using git tags
3. **Frontend**: Restore previous JavaScript files
4. **Cache**: Clear all status-related caches
5. **Monitoring**: Verify system restoration
6. **Communication**: Notify stakeholders of rollback

### Partial Rollback (Phase-by-Phase)

#### Phase-Specific Rollback

- Each phase includes specific rollback procedures
- Feature toggles allow selective component disabling
- Database changes are additive (no deletions)
- Backward compatibility maintained throughout migration

## Resource Requirements

### Development Team Allocation

- **Backend Developer**: 4 days (StatusService, API, DTO migration)
- **Frontend Developer**: 3 days (StatusProvider, EntityConfig, step-view)
- **QA Engineer**: 2 days (Testing throughout phases)
- **DevOps Engineer**: 1 day (Deployment and monitoring)

### Infrastructure Resources

- **Development Environment**: Extended for testing periods
- **Database Resources**: Additional connections for testing
- **Monitoring Tools**: Enhanced logging during migration
- **Staging Environment**: Full environment for integration testing

## Timeline & Milestones

### Detailed Timeline (7 Days Total)

#### Day 1 (Foundation)

- **Morning**: StatusService creation and basic testing
- **Afternoon**: StatusApi implementation and initial tests

#### Day 2 (Foundation Complete)

- **Morning**: StatusProvider frontend implementation
- **Afternoon**: Integration testing and cache validation

#### Day 3 (Service Layer Start)

- **Morning**: StepDataTransformationService migration
- **Afternoon**: Critical status formatting bug fixes

#### Day 4 (Service Layer Complete)

- **Morning**: StepInstanceDTO migration and validation
- **Afternoon**: Service layer integration testing

#### Day 5 (Frontend Migration)

- **Morning**: EntityConfig.js status dropdown migration
- **Afternoon**: step-view.js critical components migration

#### Day 6 (Completion Phase)

- **Morning**: Repository and remaining API migrations
- **Afternoon**: Test suite updates and validation

#### Day 7 (Deployment & Validation)

- **Morning**: Final testing and documentation
- **Afternoon**: Production deployment and monitoring

### Critical Milestones

- **Day 2 EOD**: Foundation infrastructure complete and tested
- **Day 4 EOD**: Service layer migration complete
- **Day 5 EOD**: Frontend components migrated
- **Day 7 EOD**: Full migration deployed and validated

## Post-Implementation

### Monitoring & Validation (Days 8-10)

1. **Performance Monitoring**: Track API response times and cache hit rates
2. **Error Monitoring**: Watch for status-related errors or failures
3. **User Feedback**: Monitor for any reported issues with status functionality
4. **Data Validation**: Ensure status data integrity maintained

### Documentation Updates

1. **Developer Guidelines**: Updated patterns for status handling
2. **API Documentation**: New status endpoint documentation
3. **Troubleshooting Guide**: Common issues and solutions
4. **Architecture Decision Record**: ADR documenting the migration

### Future Enhancements

1. **Status Management Interface**: Admin interface for status configuration
2. **Status History Tracking**: Audit trail for status changes
3. **Custom Status Types**: Support for organization-specific statuses
4. **Status Workflow Rules**: Business logic for valid status transitions

## Conclusion

TD-003 represents a critical technical debt remediation that will improve maintainability, consistency, and flexibility of the UMIG status management system. The phased approach ensures minimal risk while delivering immediate benefits through dynamic status management.

The 7-day implementation plan balances thoroughness with Sprint 7's aggressive timeline, leveraging existing infrastructure and established patterns from US-082-B/C. Success will eliminate 50+ maintenance points and establish a foundation for future status-related enhancements.

**Key Success Factors**:

1. Disciplined phase-by-phase execution with testing at each stage
2. Proactive performance monitoring and optimization
3. Comprehensive rollback planning and testing
4. Clear communication and coordination across teams

This technical debt resolution will significantly improve system maintainability while maintaining the high performance and reliability standards established in previous sprints.
