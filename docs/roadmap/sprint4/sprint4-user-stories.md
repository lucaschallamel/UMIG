# Sprint 4 User Stories

**Sprint**: Sprint 4 - MVP Delivery Sprint  
**Duration**: August 7-13, 2025 (5 working days)  
**Total Story Points**: 6+ points (5 completed)  
**Sprint Goal**: Deliver MVP with Main Dashboard, Planning Feature, Data Import, and Event Logging

**✅ Sprint 4 Progress**: 
- US-017 Status Field Normalization (5 points) - COMPLETED ✅  
- Critical data model consistency issue resolved
- All integration tests passing with normalized status implementation

---

## Epic 1: Main Dashboard UI

### US-007: Executive Dashboard Implementation

**As a** migration coordinator  
**I want** a comprehensive dashboard showing migration status  
**So that** I can monitor progress across all active migrations at a glance

**Acceptance Criteria:**

- [ ] Dashboard displays active migrations with progress percentages
- [ ] Real-time metrics for steps completed vs total
- [ ] Team assignment overview with workload distribution
- [ ] Critical path highlighting for blocked items
- [ ] Responsive design working on tablets and desktops
- [ ] Auto-refresh every 30 seconds (configurable)
- [ ] Export dashboard snapshot to PDF

**Technical Notes:**

- Use existing iteration view components for consistency
- Implement with vanilla JavaScript and AUI
- Leverage WebSocket for real-time updates if possible
- Follow SPA pattern established in admin-gui.js

**Story Points:** [TO ESTIMATE]

---

### US-008: Dashboard Analytics Widgets

**As a** project manager  
**I want** analytical widgets showing trends and predictions  
**So that** I can make data-driven decisions about the migration

**Acceptance Criteria:**

- [ ] Velocity chart showing completion rate over time
- [ ] Burndown chart for remaining work
- [ ] Risk heat map for critical phases
- [ ] Team performance metrics
- [ ] Predictive completion dates based on velocity
- [ ] Customizable widget layout (drag and drop)

**Technical Notes:**

- Consider using Chart.js or similar lightweight library
- Cache calculations for performance
- Implement progressive enhancement

**Story Points:** [TO ESTIMATE]

---

## Epic 2: Planning Feature

### US-009: HTML Report Generation

**As a** migration coordinator  
**I want** to export the migration plan as a formatted HTML document  
**So that** I can share it with stakeholders who don't have Confluence access

**Acceptance Criteria:**

- [ ] Generate standalone HTML file with embedded CSS
- [ ] Include all migration hierarchy (iterations → plans → sequences → phases → steps)
- [ ] Preserve team assignments and instructions
- [ ] Print-friendly formatting with page breaks
- [ ] Customizable sections (include/exclude)
- [ ] Company branding support (logo, colors)
- [ ] Generated file size < 5MB for email distribution

**Technical Notes:**

- Server-side generation using Groovy templates
- Inline all CSS for standalone functionality
- Consider PDF generation as enhancement

**Story Points:** [TO ESTIMATE]

---

### US-010: Planning Template Management

**As a** migration architect  
**I want** to save and reuse planning templates  
**So that** I can standardize migration approaches across projects

**Acceptance Criteria:**

- [ ] Save current plan as template
- [ ] Load template into new migration
- [ ] Template versioning support
- [ ] Template sharing between teams
- [ ] Template categories and tags
- [ ] Template preview before loading

**Technical Notes:**

- Extend existing plans_master pattern
- Consider template marketplace for future

**Story Points:** [TO ESTIMATE]

---

## Epic 3: Data Import Strategy

### US-011: Confluence JSON Import

**As a** migration coordinator  
**I want** to import migration data from Confluence JSON exports  
**So that** I can migrate existing documentation into UMIG

**Acceptance Criteria:**

- [ ] Parse Confluence JSON export format
- [ ] Map Confluence page hierarchy to UMIG structure
- [ ] Extract tables as steps/instructions
- [ ] Preserve formatting where possible
- [ ] Import validation with error reporting
- [ ] Dry-run mode for preview
- [ ] Rollback capability for failed imports

**Technical Notes:**

- Build on existing NodeJS import utilities
- Consider streaming for large files
- Implement in backend for security

**Story Points:** [TO ESTIMATE]

---

### US-012: CSV Bulk Import

**As a** data administrator  
**I want** to bulk import steps and instructions from CSV files  
**So that** I can quickly populate UMIG from existing spreadsheets

**Acceptance Criteria:**

- [ ] Support standard CSV format with headers
- [ ] Column mapping interface
- [ ] Data validation with detailed error messages
- [ ] Support for hierarchical data (parent-child relationships)
- [ ] Transaction-based import (all or nothing)
- [ ] Import history and audit trail
- [ ] Download template CSV

**Technical Notes:**

- Leverage existing CSV import patterns
- Consider Apache Commons CSV for parsing
- Implement progress indicator for large files

**Story Points:** [TO ESTIMATE]

---

## Epic 4: Event Logging Backend

### US-013: Audit Trail Implementation

**As a** compliance officer  
**I want** comprehensive audit logging of all system changes  
**So that** I can track who did what and when for compliance

**Acceptance Criteria:**

- [ ] Log all CRUD operations with timestamp
- [ ] Capture user, action, entity, old value, new value
- [ ] Implement log retention policies (configurable)
- [ ] Search and filter capabilities
- [ ] Export audit logs to CSV
- [ ] Performance impact < 5% on operations
- [ ] GDPR-compliant data handling

**Technical Notes:**

- Consider async logging for performance
- Implement as aspect/interceptor pattern
- Use separate schema/table for logs

**Story Points:** [TO ESTIMATE]

---

### US-014: Event Notification System

**As a** team member  
**I want** to receive notifications about relevant events  
**So that** I stay informed about changes affecting my work

**Acceptance Criteria:**

- [ ] Subscribe to specific event types
- [ ] Email notifications for critical events
- [ ] In-app notification center
- [ ] Notification preferences per user
- [ ] Batch notifications (digest mode)
- [ ] Unsubscribe links in emails

**Technical Notes:**

- Extend existing EmailService
- Consider notification queue for reliability
- Implement rate limiting

**Story Points:** [TO ESTIMATE]

---

## Epic 1: Core System Functionality

### US-017: Status Field Normalization Implementation ✅ COMPLETED

**As a** system administrator  
**I want** consistent and normalized status values across all UMIG entities  
**So that** data integrity is maintained and status management is centralized

**Acceptance Criteria:**

- [x] ✅ **Critical Discrepancy Resolution**: Identified and resolved discrepancy between ADR-035 and solution architecture section 6.6 regarding status values
- [x] ✅ **Source of Truth Established**: Confirmed solution architecture as authoritative with correct status values:
  - Migration/Iteration/Plan/Sequence/Phase: PLANNING, IN_PROGRESS, COMPLETED, CANCELLED (4 each)  
  - Step: PENDING, TODO, IN_PROGRESS, COMPLETED, FAILED, BLOCKED, CANCELLED (7 total)
  - Control: TODO, PASSED, FAILED, CANCELLED (4 total)
- [x] ✅ **ADR-035 Correction**: Updated ADR-035 to remove incorrect status values (NOT_STARTED, ON_HOLD, VALIDATED) 
- [x] ✅ **Repository Layer Updates**: Systematically updated all repository files with correct status values
- [x] ✅ **API Layer Updates**: Updated all API files (PlansApi, SequencesApi, StepsApi, ControlsApi, migrationApi) with consistent status handling
- [x] ✅ **Test Infrastructure Updates**: Updated all integration test files to use correct status values and prevent FK constraint violations
- [x] ✅ **Documentation Consolidation**: Cleaned up and consolidated all status-related documentation for consistency
- [x] ✅ **Recovery Implementation**: Successfully recovered US-006b implementation that was accidentally reverted in commit 7056d21
- [x] ✅ **Validation**: All integration tests pass with normalized status implementation
- [x] ✅ **Data Integrity**: FK constraints properly enforce valid status values across all entities

**Technical Implementation Details:**

**Status Value Standardization:**
- **Migration/Iteration/Plan/Sequence/Phase Entities**: 4 status values each
  - PLANNING (Orange #FFA500) 
  - IN_PROGRESS (Blue #0066CC)
  - COMPLETED (Green #00AA00)
  - CANCELLED (Red #CC0000)
- **Step Entity**: 7 status values total
  - PENDING (Light Grey #DDDDDD)
  - TODO (Yellow #FFFF00) 
  - IN_PROGRESS (Blue #0066CC)
  - COMPLETED (Green #00AA00)
  - FAILED (Red #FF0000)
  - BLOCKED (Orange #FF6600)
  - CANCELLED (Dark Red #CC0000)
- **Control Entity**: 4 status values total
  - TODO (Yellow #FFFF00)
  - PASSED (Green #00AA00) 
  - FAILED (Red #FF0000)
  - CANCELLED (Dark Red #CC0000)

**Files Updated:**
- Repository Layer: `ControlRepository.groovy`, `InstructionRepository.groovy`  
- API Layer: `PlansApi.groovy`, `SequencesApi.groovy`, `StepsApi.groovy`, `ControlsApi.groovy`, `migrationApi.groovy`, `InstructionsApi.groovy`
- Testing Layer: All integration test files updated with correct status values
- Documentation: ADR-035, solution architecture section 6.6 consistency achieved

**Architecture Patterns:**
- Foreign key constraints maintain referential integrity to `status_sts` table
- API accepts both integer IDs and string names for backward compatibility  
- Instructions use boolean completion pattern (no FK to status table by design)
- Hybrid approach balances normalization with pragmatic simplicity

**Quality Assurance:**
- All 25+ integration tests updated and passing
- FK constraint violations eliminated from test cleanup
- Type safety maintained with explicit casting per ADR-031
- Status resolution logic tested across all entity types

**Epic**: EP-001: Core System Functionality  
**Story Points**: 5 (High complexity data model fix)  
**Status**: ✅ COMPLETED (August 7, 2025)

---

## Technical Debt & Improvements

### US-015: API Documentation Completion

**As a** developer  
**I want** complete documentation for all API endpoints  
**So that** I can properly integrate with and maintain the APIs

**Acceptance Criteria:**

- [x] StepsAPI.md documentation created
- [x] TeamMembersAPI.md documentation created
- [x] stepViewAPI.md documentation created
- [x] WebAPI.md documentation created
- [x] API README updated with complete list
- [x] Remove redundant UserApi.groovy file (DONE)
- [x] Remove PhasesApi.groovy.backup file (DONE)
- [ ] Update OpenAPI specification with missing endpoints

**Technical Notes:**

- Documentation already completed during planning phase
- Only cleanup tasks remaining

**Story Points:** 1 (mostly done)

---

### US-016: Test Infrastructure Fixes

**As a** developer  
**I want** to fix the integration test cleanup issues  
**So that** tests run reliably without FK constraint violations

**Acceptance Criteria:**

- [ ] Fix cleanup order for FK constraints
- [ ] Implement transaction rollback for test isolation
- [ ] Create reusable test fixtures
- [ ] Document test best practices
- [ ] Achieve 100% test pass rate

**Technical Notes:**

- Priority fix before new development
- Consider TestContainers for isolation

**Story Points:** [TO ESTIMATE]

---

## Story Point Estimation

| Story  | Complexity | Effort | Risk   | Points | Status |
| ------ | ---------- | ------ | ------ | ------ | ------ |
| US-007 | High       | High   | Medium | ?      | Pending |
| US-008 | Medium     | Medium | Low    | ?      | Pending |
| US-009 | Medium     | High   | Low    | ?      | Pending |
| US-010 | Low        | Medium | Low    | ?      | Pending |
| US-011 | High       | High   | High   | ?      | Pending |
| US-012 | Medium     | Medium | Medium | ?      | Pending |
| US-013 | Medium     | High   | Medium | ?      | Pending |
| US-014 | Medium     | Medium | Low    | ?      | Pending |
| US-015 | Low        | Low    | Low    | 1      | Pending |
| US-016 | Low        | Low    | Low    | ?      | Pending |
| US-017 | High       | High   | Medium | 5      | ✅ COMPLETED |

**Total Estimated:** 6 points (with 5 points completed)  
**Remaining:** [TO BE CALCULATED]

---

## Dependencies

- Sprint 3 completion (✅ DONE)
- Test infrastructure fixes (US-015) should be done first
- Dashboard (US-007) before Analytics (US-008)
- Import strategy decision before implementation

---

## Definition of Done

- [ ] Code complete with >90% test coverage
- [ ] API documentation updated
- [ ] Integration tests passing
- [ ] Performance benchmarks met (<200ms)
- [ ] Security review completed
- [ ] Documentation updated
- [ ] Peer review completed (AI-assisted)
- [ ] Deployed to development environment
