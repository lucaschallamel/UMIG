# User Story: US-088-B - Database Version Manager Liquibase Integration

## Story Overview

**As a** system administrator and developer
**I want** the DatabaseVersionManager to use Liquibase's `databasechangelog` table as the single source of truth for migration tracking
**So that** migration versioning is accurate, consistent, and automatically synchronized with the actual database state without manual maintenance of hardcoded arrays.

---

## Epic Context

**Epic**: US-088 - Database Migration Management System Enhancement
**Sprint**: Sprint 7
**Story Points**: 8
**Priority**: High
**Dependencies**: US-087 (Admin GUI Phase 2 completion)

---

## Problem Statement

The current DatabaseVersionManager.js maintains a hardcoded array of 34 migrations that must be manually updated whenever new migrations are added. This creates several critical issues:

1. **Inconsistency**: The `db.changelog-master.xml` file contains 33 entries while the filesystem has 34 SQL files
2. **Missing Migration**: `030_bulk_operation_email_templates.sql` exists in filesystem but is absent from the master XML
3. **Manual Maintenance**: Hardcoded arrays require manual updates, creating opportunities for human error
4. **Source of Truth Conflict**: Multiple systems tracking the same information inconsistently

---

## Solution Approach

Replace the hardcoded migration tracking with a dynamic system that queries Liquibase's `databasechangelog` table directly, establishing it as the single source of truth for all migration tracking.

---

## Acceptance Criteria

### AC1: Backend Database Integration
**GIVEN** the Liquibase `databasechangelog` table contains migration records
**WHEN** the DatabaseVersionRepository queries for migration information
**THEN** it should return complete migration data including:
- Migration filename
- Execution timestamp
- Checksum validation
- Author information
- Liquibase changelog ID

```groovy
// Expected DatabaseVersionRepository.groovy method signature
def getAllMigrations() {
    return DatabaseUtil.withSql { sql ->
        def results = sql.rows('''
            SELECT filename, dateexecuted, md5sum, author, id, orderexecuted
            FROM databasechangelog
            ORDER BY orderexecuted ASC
        ''')
        return results.collect { enrichMigrationRecord(it) }
    }
}
```

### AC2: REST API Endpoint Creation
**GIVEN** a new database versions API endpoint
**WHEN** called with proper authentication
**THEN** it should return JSON array of all migrations from Liquibase table

```groovy
// Expected endpoint structure in DatabaseVersionsApi.groovy
databaseVersions(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def repository = new DatabaseVersionRepository()
    def versions = repository.getAllMigrations()
    return Response.ok(new JsonBuilder(versions).toString()).build()
}
```

### AC3: Frontend Component Refactoring
**GIVEN** the DatabaseVersionManager.js component
**WHEN** it initializes
**THEN** it should:
- Remove all hardcoded `knownChangesets` arrays
- Make API call to `/rest/scriptrunner/latest/custom/databaseVersions`
- Dynamically populate migration data from API response
- Maintain existing UI functionality without visual changes

```javascript
// Expected DatabaseVersionManager.js pattern (following ADR-057)
class DatabaseVersionManager extends BaseComponent {
    async initialize() {
        try {
            const response = await fetch('/rest/scriptrunner/latest/custom/databaseVersions');
            this.migrations = await response.json();
            this.render();
        } catch (error) {
            console.error('Failed to load database versions:', error);
        }
    }
}
```

### AC4: Migration File Alignment
**GIVEN** the `db.changelog-master.xml` file
**WHEN** compared against filesystem migration files
**THEN** it should:
- Include all 34 SQL files from `liquibase/changelogs/`
- Add missing entry for `030_bulk_operation_email_templates.sql`
- Maintain proper chronological ordering
- Use consistent naming conventions

### AC5: Liquibase Integration Validation
**GIVEN** the updated system
**WHEN** new migrations are added via standard Liquibase process
**THEN** they should:
- Automatically appear in DatabaseVersionManager UI
- Not require any manual code updates
- Maintain proper version ordering
- Include all Liquibase metadata

### AC6: Error Handling and Fallback
**GIVEN** potential database connectivity issues
**WHEN** the Liquibase table is unavailable
**THEN** the system should:
- Display appropriate error messages
- Log detailed error information for debugging
- Not crash the admin interface
- Provide graceful degradation

### AC7: Testing Coverage
**GIVEN** the refactored components
**WHEN** running the test suite
**THEN** it should achieve:
- Backend unit tests for DatabaseVersionRepository (≥90% coverage)
- Frontend component tests for API integration (≥85% coverage)
- Integration tests validating end-to-end functionality
- Mock data tests for error scenarios

---

## Technical Implementation Details

### Backend Components

**DatabaseVersionRepository.groovy** (NEW)
```groovy
package umig.repository

class DatabaseVersionRepository {
    def getAllMigrations() { /* Implementation as per AC1 */ }
    def getMigrationById(String id) { /* Specific migration lookup */ }
    def validateMigrationChecksum(String id) { /* Checksum validation */ }
}
```

**DatabaseVersionsApi.groovy** (NEW)
```groovy
@BaseScript CustomEndpointDelegate delegate
// Implementation as per AC2
```

### Frontend Components

**DatabaseVersionManager.js** (REFACTORED)
- Remove hardcoded arrays (lines ~15-50)
- Add API integration methods
- Maintain existing render() and UI methods
- Follow ADR-057 (no IIFE wrappers)
- Use SecurityUtils for CSRF protection (ADR-058)

### Database Alignment

**db.changelog-master.xml** updates:
- Add missing `<include file="030_bulk_operation_email_templates.sql" relativeToChangelogFile="true"/>`
- Verify all 34 migrations are included
- Maintain chronological order

---

## Testing Strategy

### Backend Testing
```bash
# New Groovy tests
npm run test:groovy:unit -- DatabaseVersionRepository
npm run test:groovy:integration -- DatabaseVersionsApi

# Expected test files:
# src/groovy/umig/tests/unit/DatabaseVersionRepositoryTest.groovy
# src/groovy/umig/tests/integration/DatabaseVersionsApiTest.groovy
```

### Frontend Testing
```bash
# Component API integration tests
npm run test:js:components -- --testPathPattern='DatabaseVersionManager'

# Expected test scenarios:
# - API call success and data population
# - Error handling for failed API calls
# - UI rendering with dynamic data
# - Compatibility with ComponentOrchestrator
```

### Integration Testing
```bash
# End-to-end validation
npm run test:all:integration
npm run test:js:e2e -- --testNamePattern='database.version.manager'
```

---

## Definition of Done

- [ ] **Backend**: DatabaseVersionRepository created with comprehensive Liquibase integration
- [ ] **API**: DatabaseVersionsApi endpoint functional and properly secured
- [ ] **Frontend**: DatabaseVersionManager.js refactored to use API instead of hardcoded arrays
- [ ] **Database**: All 34 migration files properly referenced in db.changelog-master.xml
- [ ] **Testing**: All acceptance criteria validated with automated tests
- [ ] **Documentation**: Technical documentation updated reflecting new architecture
- [ ] **Performance**: No performance degradation in admin GUI load times
- [ ] **Security**: All API endpoints follow ADR-042 authentication patterns
- [ ] **Code Review**: Implementation follows ADR-057, ADR-058, ADR-059, ADR-060 patterns

---

## Risk Mitigation

### High Risk: Database Connectivity Failures
**Mitigation**: Implement robust error handling with fallback messaging and detailed logging

### Medium Risk: Migration File Synchronization
**Mitigation**: Validate all filesystem migrations are in master XML before deployment

### Low Risk: UI Performance Impact
**Mitigation**: Cache API results appropriately and implement loading states

---

## Dependencies and Constraints

**Dependencies**:
- US-087 Phase 2 completion (current sprint work)
- Liquibase changelog table populated with all historical migrations
- ComponentOrchestrator security framework (from US-082)

**Constraints**:
- Must maintain backward compatibility with existing admin GUI
- Cannot modify existing Liquibase migration files
- Must follow schema-first development principle (ADR-059)
- Zero-downtime deployment required

---

## Success Metrics

- Migration tracking accuracy: 100% (all 34 migrations properly tracked)
- Automated synchronization: No manual updates required for new migrations
- Test coverage: ≥90% backend, ≥85% frontend
- Performance: Admin GUI load time impact <200ms
- Error rate: <0.1% for database version queries

---

## Implementation Timeline

### Phase 1: Database Layer (2-3 days)
- Create DatabaseVersionRepository with Liquibase queries
- Implement robust error handling and connection management
- Unit test repository with MockSql following TD-001 patterns

### Phase 2: API Layer (1-2 days)
- Implement DatabaseVersionsApi REST endpoint
- Add proper authentication and authorization (ADR-042)
- Integration testing with real database connectivity

### Phase 3: Frontend Integration (2-3 days)
- Refactor DatabaseVersionManager.js to remove hardcoded arrays
- Implement API integration with caching and retry logic
- Maintain existing UI/UX while adding dynamic data loading

### Phase 4: Migration Alignment (1 day)
- Update db.changelog-master.xml with missing migration
- Validate all 34 migrations are properly referenced
- Test Liquibase deployment process

### Phase 5: Testing & Validation (1-2 days)
- Component testing with Jest (frontend)
- Integration testing across all layers
- Performance testing and optimization

---

## Related Documentation

- **Architecture**: ADR-057 (Component Loading), ADR-058 (Security), ADR-059 (Schema Authority)
- **Testing**: TD-001 (Self-contained tests), TD-002 (Technology-prefixed commands)
- **Sprint Context**: US-087 (Admin GUI Phase 2), US-082 (Component Architecture)
- **Database**: Liquibase migration patterns and `databasechangelog` table structure

---

**Story Created**: 2025-09-25
**Estimated Effort**: 8 story points
**Technical Complexity**: High
**Business Value**: High (eliminates manual maintenance and improves system reliability)

---

## Current Status

**Status**: Planning
**Assigned**: TBD
**Sprint**: Sprint 7
**Related Issues**: DatabaseVersionManager hardcoded array maintenance, missing migration in master XML

**Next Steps**:
1. Fix immediate issue: Add missing migration to db.changelog-master.xml
2. Begin backend implementation with DatabaseVersionRepository
3. Create API endpoint following UMIG security patterns
4. Refactor frontend component for dynamic data loading