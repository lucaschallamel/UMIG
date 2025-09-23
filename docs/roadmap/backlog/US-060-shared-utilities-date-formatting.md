# User Story Template

**Story ID**: US-060  
**Title**: Extract Shared Utilities for Date Formatting  
**Epic**: Code Refactoring & Maintainability Improvements  
**Priority**: Medium  
**Story Points**: 3

## Story Overview

Extract and centralize date formatting utilities that are currently duplicated across multiple UMIG components (StepDataTransferObject, email templates, API responses, and frontend JavaScript). This refactoring improves code maintainability, ensures consistent date formatting across the application, and reduces technical debt identified in recent code reviews.

## User Story Statement

**As a** developer maintaining UMIG codebase  
**I want** centralized date formatting utilities with consistent patterns  
**So that** I can reduce code duplication, ensure consistent date formatting across all components, and simplify maintenance of date-related functionality

## Acceptance Criteria

### Functional Requirements

- [ ] **AC1**: Create `DateFormatUtil` Groovy utility class with standardized methods for common date formatting patterns
- [ ] **AC2**: Create JavaScript `dateUtils.js` module for frontend date formatting consistency with backend patterns
- [ ] **AC3**: Replace duplicated date formatting code in StepDataTransferObject, email templates, and API responses
- [ ] **AC4**: Implement timezone-aware formatting with proper UTC handling for database timestamps
- [ ] **AC5**: Ensure backward compatibility with existing date formats in APIs and UI components

### Non-Functional Requirements

- [ ] **Performance**: Date formatting operations <1ms per call, no performance degradation from existing implementations
- [ ] **Security**: Proper input validation and sanitization for date parameters to prevent injection attacks
- [ ] **Usability**: Consistent date format display across all UMIG interfaces (admin GUI, APIs, emails)
- [ ] **Compatibility**: Compatible with ScriptRunner 9.21.0, Groovy 3.0.15, and existing PostgreSQL timestamp handling

### Definition of Done

- [ ] Code implemented and peer reviewed
- [ ] Unit tests written and passing (≥85% coverage for utility classes)
- [ ] Integration tests updated for components using new utilities
- [ ] API documentation updated to reflect standardized date formats
- [ ] Frontend components tested with new JavaScript utilities
- [ ] Performance benchmarks met for date-intensive operations
- [ ] Deployment to test environment successful
- [ ] UAT sign-off completed with verification of consistent formatting

## Technical Requirements

### Database Changes

- No direct database schema changes required
- Ensure compatibility with existing `timestamp with time zone` columns
- Verify proper handling of PostgreSQL date/time types

### API Changes

- Standardize date formatting in all API responses using new utilities
- Maintain backward compatibility for existing API consumers
- Update StepsApi.groovy and other APIs to use centralized formatting

### Frontend Changes

- Replace inline date formatting in admin-gui JavaScript modules
- Implement `dateUtils.js` module with functions matching backend patterns
- Update all admin GUI components to use standardized date display
- Ensure proper timezone handling in browser environments

### Integration Points

- Integration with existing ADR-031 type safety patterns
- Compatibility with DatabaseUtil.withSql timestamp handling
- Integration with email template system for consistent date formatting
- Alignment with existing error handling and validation patterns

## Dependencies

### Prerequisites

- Review of existing date formatting patterns across codebase
- Identification of all locations requiring date formatting standardization
- Analysis of timezone requirements and PostgreSQL timestamp behavior

### Parallel Work

- Can work in parallel with US-058 (Method Refactoring)
- Coordination needed with US-056B template integration completion
- May inform US-064 (Template Caching) date handling requirements

### Blocked By

- Completion of current Sprint 6 activities
- Code freeze lift after US-056B merge

## Risk Assessment

### Technical Risks

- Breaking existing date formatting behavior during migration
- **Mitigation**: Comprehensive regression testing and phased rollout
- Timezone handling complexity with PostgreSQL and browser differences
- **Mitigation**: Extensive testing across timezones, UTC standardization

### Business Risks

- Temporary inconsistency during migration period
- **Mitigation**: Quick implementation window, feature flags if needed
- User confusion from date format changes
- **Mitigation**: Maintain existing user-facing formats, only improve consistency

### Timeline Risks

- Underestimating scope of date formatting usage across codebase
- **Mitigation**: Thorough code analysis before implementation, buffer time
- Integration complexity with existing components
- **Mitigation**: Incremental migration approach, component-by-component testing

## Testing Strategy

### Unit Testing

- DateFormatUtil class comprehensive testing for all format patterns
- JavaScript dateUtils module testing across browsers
- Edge case testing for timezone boundaries, leap years, invalid dates

### Integration Testing

- End-to-end testing of date formatting in API responses
- Email template date formatting validation
- Admin GUI date display consistency verification
- Cross-component date formatting compatibility testing

### User Acceptance Testing

- Admin user validation of consistent date formats across interfaces
- Developer team validation of utility ease-of-use
- Performance validation for date-intensive operations

### Performance Testing

- Benchmark date formatting performance before and after migration
- Load testing for API endpoints with heavy date formatting
- Memory usage assessment for utility class instantiation

## Implementation Notes

### Development Approach

- Phase 1: Create utility classes with comprehensive unit tests
- Phase 2: Migrate StepDataTransferObject and email templates
- Phase 3: Update API responses and frontend components
- Follow existing UMIG patterns from ADR-031 (Type Safety)

### UI/UX Guidelines

- Maintain existing user-visible date formats to avoid confusion
- Ensure consistent date format across admin interfaces
- Consider user locale preferences for future enhancement

### Data Migration

- No data migration required
- Verify no date format changes affect existing data interpretation
- Test database timestamp retrieval and formatting consistency

## Success Metrics

### Quantitative Metrics

- 100% replacement of duplicated date formatting code
- ≥85% test coverage for new utility classes
- Zero date formatting-related bugs in first 30 days post-deployment
- <1ms performance overhead per date formatting operation

### Qualitative Metrics

- Developer satisfaction with utility ease-of-use
- Improved code maintainability scores in code review tools
- Consistent date formatting across all UMIG interfaces
- Reduced time spent debugging date-related issues

## Related Documentation

- [ADR-031: Type Safety and Parameter Validation](../../../solution-architecture.md#adr-031)
- [UMIG Database Patterns](../../../architecture/database-patterns.md)
- [Frontend Development Standards](../../../technical/frontend-standards.md)
- [Email Template Architecture](../../../technical/email-templates.md)

## Story Breakdown

### Sub-tasks

1. **Utility Class Creation**: Implement DateFormatUtil.groovy with comprehensive date formatting methods
2. **JavaScript Module**: Create dateUtils.js with frontend date formatting functions
3. **Component Migration**: Update StepDataTransferObject, APIs, and templates to use new utilities
4. **Testing & Validation**: Comprehensive testing and performance validation
5. **Documentation**: Update technical documentation and code comments

### Recommended Sprint Distribution

- **Week 1 Days 1-2**: Utility class creation and unit testing
- **Week 1 Days 3-4**: Component migration and integration testing
- **Week 1 Day 5**: Final validation and documentation updates

## Change Log

| Date       | Version | Changes                                          | Author |
| ---------- | ------- | ------------------------------------------------ | ------ |
| 2025-07-09 | 1.0     | Initial story creation for date formatting utils | System |

---

**Implementation Priority**: MEDIUM - Improves maintainability and reduces technical debt
**Security Review Required**: LOW - Utility functions with input validation
**Performance Testing Required**: YES - Verify no performance degradation in date-intensive operations
