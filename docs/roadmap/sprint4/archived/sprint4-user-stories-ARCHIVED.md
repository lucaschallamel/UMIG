# Sprint 4 User Stories

**Sprint**: Sprint 4 - MVP Completion Sprint  
**Duration**: August 8 - September 1, 2025 (4 weeks)  
**Total Story Points**: 21 points (8 completed, 13 remaining)  
**Sprint Goal**: Complete UMIG MVP with Main Dashboard, Planning Feature, and Data Import capabilities

**Foundation**: US-032 Infrastructure Modernization completed August 8, 2025 - UMIG elevated to enterprise-ready status with Confluence 9.2.7 + ScriptRunner 9.21.0 upgrade, comprehensive operational framework, and production-grade infrastructure capabilities

**✅ Sprint 4 Completed Work**:

- US-017: Status Field Normalization (5 points) - COMPLETED ✅ (August 7, 2025)
  - Critical data model consistency issue resolved
  - All integration tests passing with normalized status implementation
- US-032: Infrastructure Modernization (3 points) - COMPLETED ✅ (August 8, 2025)
  - Confluence 8.5.6 → 9.2.7 + ScriptRunner 9.21.0 upgrade
  - Enterprise backup/restore system with 7 comprehensive scripts
  - Infrastructure consolidation under local-dev-setup/infrastructure/
  - 5-dimensional validation framework (Database, API, UI, Data Integrity, Permissions)
  - Project elevated to production-ready operational status

**📋 Sprint 4 Remaining MVP Scope** (13 points remaining):

- US-033: Main Dashboard UI (5 points) - Core runsheet interface 🎯 HIGH PRIORITY
- US-034: Planning Feature HTML Export (3 points) - Stakeholder communication
- US-035: Data Import Strategy (3 points) - Migration data population
- US-036: Event Logging Backend Implementation (2 points) - Audit trail completion

**Enhanced Development Velocity**: With modern platform infrastructure now established, Sprint 4 development benefits from:

- Enhanced ScriptRunner 9.21.0 capabilities enabling faster API development
- Enterprise backup/restore system reducing deployment risk
- Automated validation framework accelerating testing cycles
- Consolidated infrastructure tools improving development workflows

---

## Epic 1: Infrastructure & Platform Foundation

### US-032: Infrastructure Modernization ✅ COMPLETED

**As a** system administrator  
**I want** to upgrade our Confluence environment to v9.2.7 and ScriptRunner to 9.21.0  
**So that** UMIG operates on enterprise-grade infrastructure with modern operational practices

**Completion Summary** (August 8, 2025):

**✅ Platform Upgrade Successfully Completed:**

- [x] ✅ **Confluence 8.5.6 → 9.2.7**: Latest LTS version with security patches
- [x] ✅ **ScriptRunner → 9.21.0**: Latest compatible version with enhanced features
- [x] ✅ **Zero-downtime deployment**: <5 minute service interruption
- [x] ✅ **Zero data loss**: All UMIG data preserved and validated

**✅ Enterprise Operational Framework Established:**

- [x] ✅ **Infrastructure Consolidation**: All tools organized under `local-dev-setup/infrastructure/`
- [x] ✅ **Enterprise Backup System**: 7-script comprehensive backup/restore framework
- [x] ✅ **Validation Framework**: 5-dimensional testing (Database, API, UI, Data, Permissions)
- [x] ✅ **Upgrade Automation**: Reusable scripts for future platform updates
- [x] ✅ **Critical Discovery**: Silent backup failures resolved (prevented catastrophic data loss)

**✅ System Validation Completed (8/8 Tests Passed):**

- [x] ✅ **All containers operational**: confluence, postgres, mailhog
- [x] ✅ **Database connectivity**: PostgreSQL + Liquibase migrations verified
- [x] ✅ **API endpoints functional**: All 25+ REST endpoints responding
- [x] ✅ **Admin GUI operational**: All 8 modules fully functional
- [x] ✅ **ScriptRunner console**: Accessible with full functionality
- [x] ✅ **Email service**: SMTP integration working
- [x] ✅ **Security configuration**: Group permissions maintained
- [x] ✅ **Performance baseline**: No regression detected

**✅ Documentation & Knowledge Transfer:**

- [x] ✅ **Operations Guide**: `/docs/operations/README.md` with complete procedures
- [x] ✅ **Upgrade Archive**: `/docs/archived/us-032-confluence-upgrade/` with full documentation
- [x] ✅ **Infrastructure Commands**: Updated project commands and procedures
- [x] ✅ **Validation Scripts**: `./local-dev-setup/infrastructure/verify-provisioning.sh`

**Technical Achievements:**

**Enterprise-Grade Operational Capabilities:**

- **Backup System**: SHA256 integrity verification, incremental backups, tested restore procedures
- **Infrastructure Management**: Function-based organization (backup/, upgrade/, verification/)
- **System Validation**: Automated health checks with comprehensive reporting
- **Operational Excellence**: Project elevated from development-ready to production-ready

**Foundation for Sprint 4 Success:**

- **Enterprise Platform**: Confluence 9.2.7 + ScriptRunner 9.21.0 with latest security patches and compatibility
- **Development Acceleration**: Modern platform capabilities, enhanced tooling, and improved API patterns
- **Operational Excellence**: 7-script comprehensive backup system with SHA256 integrity verification
- **Risk Mitigation**: Tested upgrade procedures, automated validation, and proven rollback capabilities
- **Production Readiness**: Enterprise-grade operational practices with comprehensive documentation

**Epic**: EP-001: Infrastructure & Platform Foundation  
**Story Points**: 3 (Medium complexity, strategic foundation)  
**Status**: ✅ COMPLETED (August 8, 2025)

---

## Epic 2: MVP Core Features

### US-033: Main Dashboard UI ⭐ HIGH PRIORITY

**As a** migration coordinator  
**I want** a comprehensive dashboard showing migration status  
**So that** I can monitor progress across all active migrations at a glance

**Acceptance Criteria:**

- [ ] **Real-time Migration Overview**: Dashboard displays active migrations with progress percentages
- [ ] **Progress Metrics**: Real-time metrics for steps completed vs total across all migrations
- [ ] **Team Workload Visualization**: Team assignment overview with workload distribution
- [ ] **Critical Path Highlighting**: Visual indicators for blocked items and critical dependencies
- [ ] **Responsive Design**: Working interface for tablets and desktops with AUI framework
- [ ] **Auto-refresh Capability**: Configurable auto-refresh (default 30 seconds)
- [ ] **Export Functionality**: Dashboard snapshot export to PDF for stakeholder communication

**Technical Implementation:**

- **Foundation**: Leverage existing Admin GUI SPA patterns and modular architecture
- **APIs**: Utilize completed Plans, Sequences, Phases, Instructions, Controls APIs from Sprint 3
- **Technology Stack**: Vanilla JavaScript with AUI framework, consistent with established patterns
- **Real-time Updates**: WebSocket integration for live status updates (if feasible)
- **Performance**: Optimize for large datasets with pagination and efficient data loading

**Dependencies:**

- ✅ Sprint 3 APIs (Plans, Sequences, Phases, Instructions, Controls) - COMPLETED
- ✅ Status field normalization (US-017) - COMPLETED
- ✅ Modern platform infrastructure (US-032) - COMPLETED

**Story Points:** 5 (High complexity, high business value)  
**Status:** 🎯 HIGH PRIORITY

---

### US-034: Planning Feature HTML Export

**As a** migration coordinator  
**I want** to export the migration plan as a formatted HTML document  
**So that** I can share comprehensive migration plans with stakeholders who don't have Confluence access

**Acceptance Criteria:**

- [ ] **Standalone HTML Generation**: Generate self-contained HTML file with embedded CSS
- [ ] **Complete Hierarchy Export**: Include all migration hierarchy (iterations → plans → sequences → phases → steps)
- [ ] **Team Assignment Preservation**: Maintain team assignments and detailed instructions
- [ ] **Print-friendly Formatting**: Professional formatting with appropriate page breaks
- [ ] **Customizable Sections**: Include/exclude sections based on stakeholder needs
- [ ] **Corporate Branding**: Support for company logo, colors, and branding elements
- [ ] **File Size Optimization**: Generated file <5MB for email distribution

**Technical Implementation:**

- **Modern Platform Advantage**: Leverage Confluence 9.2.7 + ScriptRunner 9.21.0 enhanced template capabilities
- **Server-side Generation**: Use enhanced Groovy 3.0.15 templates with improved performance
- **CSS Inlining**: Embed all CSS for standalone functionality
- **Data Integration**: Leverage existing repository patterns and Sprint 3 APIs
- **Template System**: Extensible template system for customization
- **Performance**: Efficient generation optimized for upgraded platform

**Infrastructure Benefits:**

- **Enhanced Groovy Support**: ScriptRunner 9.21.0 provides improved template processing
- **Modern JavaScript Integration**: Better frontend-backend integration for export features
- **Enterprise Security**: Enhanced security features for document generation

**Enhancement Considerations:**

- **PDF Generation**: Consider PDF export as future enhancement
- **Template Library**: Reusable templates for different stakeholder types

**Story Points:** 3 (Medium complexity, high business value)  
**Status:** 📋 PLANNED

---

### US-035: Data Import Strategy

**As a** migration coordinator  
**I want** to import migration data from various sources  
**So that** I can populate UMIG with existing migration information efficiently

**Acceptance Criteria:**

- [ ] **Multiple Format Support**: CSV, JSON, Excel import capabilities
- [ ] **Data Validation**: Comprehensive validation with detailed error reporting
- [ ] **Mapping Interface**: User-friendly column/field mapping for flexible data sources
- [ ] **Batch Processing**: Handle large datasets with progress indication
- [ ] **Rollback Capability**: Ability to undo imports if issues are discovered
- [ ] **Audit Trail**: Complete logging of import operations for compliance
- [ ] **Template Downloads**: Provide template files for common import scenarios

**Technical Implementation:**

**Enhanced Platform Capabilities:**

- **Modern Processing Power**: Leverage Confluence 9.2.7 enhanced memory management for large imports
- **ScriptRunner 9.21.0 Features**: Utilize improved file handling and batch processing capabilities
- **Enterprise Security**: Enhanced data validation and sanitization with updated security features

**Implementation Strategy:**

- **Backend Processing**: Server-side import processing with enhanced Groovy 3.0.15 performance
- **Streaming Support**: Handle large files efficiently with modern JVM optimizations
- **Transaction Safety**: Atomic operations with comprehensive rollback using enterprise backup system
- **Progress Tracking**: Real-time progress feedback leveraging modern WebSocket capabilities
- **Error Recovery**: Detailed error messages with improved debugging support

**Infrastructure Benefits:**

- **Automated Backup Integration**: Leverage enterprise backup system for import safety
- **Enhanced Validation**: Use new validation framework for data integrity checks
- **Performance Optimization**: Modern platform enables faster data processing

**Enhancement Considerations:**

- **Confluence Integration**: Direct import from Confluence spaces using native APIs
- **API Integration**: Import from external systems via enhanced REST capabilities

**Story Points:** 3 (Medium complexity, high business value)  
**Status:** 📋 PLANNED

---

### US-036: Event Logging Backend Implementation

**As a** compliance officer  
**I want** comprehensive audit logging of all system changes  
**So that** I can track who did what and when for compliance requirements

**Acceptance Criteria:**

- [ ] **Comprehensive Logging**: All CRUD operations logged with timestamp, user, and details
- [ ] **Event Categories**: System events, user actions, data changes, security events
- [ ] **Structured Data**: JSON-formatted logs for easy parsing and analysis
- [ ] **Performance Impact**: <5% overhead on normal operations
- [ ] **Retention Policies**: Configurable retention with automatic archiving
- [ ] **Search Capabilities**: Fast search and filtering of audit logs
- [ ] **Export Functions**: Export audit logs to CSV/JSON for external analysis

**Technical Implementation:**

**Enterprise Platform Advantages:**

- **Enhanced Security**: Confluence 9.2.7 provides improved audit capabilities and security logging
- **Modern Groovy Features**: ScriptRunner 9.21.0 offers enhanced async processing and event handling
- **Database Optimization**: PostgreSQL optimizations benefit from modern platform performance

**Implementation Strategy:**

- **Asynchronous Logging**: Non-blocking event capture using enhanced ScriptRunner async capabilities
- **Database Storage**: Dedicated audit schema leveraging modern PostgreSQL features
- **Event Queuing**: Enhanced message processing with improved error handling
- **Integration Points**: Seamless integration with existing API endpoints using modern patterns
- **Security Measures**: Enterprise-grade tamper-proof logging with SHA256 integrity verification

**Infrastructure Benefits:**

- **Backup Integration**: Audit logs automatically included in enterprise backup system
- **Validation Framework**: Leverage system validation tools for audit log integrity
- **Performance Monitoring**: Modern platform enables better performance tracking of logging overhead
- **Operational Excellence**: Integration with new infrastructure management tools

**Story Points:** 2 (Low-medium complexity, regulatory requirement)  
**Status:** 📋 PLANNED

---

## Epic 1: Admin GUI Completion

### US-031: Admin GUI Complete Integration ⭐ HIGH PRIORITY

**As a** system administrator  
**I want** a fully functional Admin GUI for managing all UMIG entities  
**So that** I can efficiently administer users, teams, migrations, and all canonical data

**Acceptance Criteria:**

- [ ] Complete integration with Sprint 3 APIs (Plans, Sequences, Phases, Instructions, Controls)
- [ ] Connect Teams and Environments to existing APIs
- [ ] Add Applications and Labels management interfaces
- [ ] Integrate with refactored StepsAPI and MigrationsAPI from Sprint 4
- [ ] Complete Iterations management interface
- [ ] Add Audit logs viewing capability
- [ ] Ensure role-based access control (SUPERADMIN, ADMIN, PILOT)
- [ ] Maintain SPA architecture with consistent error handling

**Technical Notes:**

- Build on existing admin-gui.js configuration (9 entities already configured)
- Leverage established SPA patterns from Sprint 2
- Reuse pagination, sorting, and search components
- Follow entity configuration pattern already in place

**Story Points:** 8  
**Status:** 📋 COMMITTED

---

### US-018: Main Dashboard Development [DEFERRED TO SPRINT 5]

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

**Story Points:** 5  
**Status:** 🔄 DEFERRED - Admin GUI completion is more foundational

---

### US-028: Enhanced IterationView with New APIs

**As a** migration coordinator  
**I want** the IterationView enhanced to use the refactored StepsAPI  
**So that** I get improved performance and new features in the iteration interface

**Acceptance Criteria:**

- [ ] Integrate with refactored StepsAPI
- [ ] Implement real-time status updates
- [ ] Add bulk operations UI (select multiple steps)
- [ ] Performance improvements for large datasets
- [ ] Enhanced filtering with new API capabilities
- [ ] Maintain all existing functionality

**Technical Notes:**

- Build on existing IterationView.js
- Leverage new API endpoints for better performance
- Quick win after StepsAPI refactoring

**Story Points:** 3  
**Status:** 📋 COMMITTED

---

### US-029: Enhanced StepView with New APIs [DEFERRED TO SPRINT 5]

**As a** team member  
**I want** the StepView enhanced with new API capabilities  
**So that** I have a more responsive and feature-rich step execution interface

**Acceptance Criteria:**

- [ ] Integrate with refactored StepsAPI
- [ ] Add quick status update buttons
- [ ] Implement inline editing capabilities
- [ ] Add keyboard shortcuts for common actions
- [ ] Performance optimization for rapid updates
- [ ] Enhanced error handling and user feedback

**Technical Notes:**

- Build on existing StepView implementation
- Coordinate with IterationView enhancements
- Focus on user productivity features

**Story Points:** 3  
**Status:** 🔄 DEFERRED - Lower priority than Admin GUI completion

---

### US-008: Dashboard Analytics Widgets [DEFERRED]

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

### US-022: Integration Test Suite Expansion

**As a** developer  
**I want** comprehensive integration tests for all refactored APIs  
**So that** we maintain quality and prevent regressions

**Acceptance Criteria:**

- [ ] Complete test coverage for refactored StepsAPI
- [ ] Complete test coverage for refactored MigrationsAPI
- [ ] Test coverage for Dashboard API endpoints
- [ ] Performance benchmarking tests
- [ ] Load testing for concurrent operations
- [ ] Test data generators for all entities
- [ ] Achieve >90% code coverage

**Technical Notes:**

- Build on existing Jest and Groovy test infrastructure
- Add performance assertions to tests
- Include negative test cases

**Story Points:** 3  
**Status:** 📋 COMMITTED

---

### US-030: API Documentation Completion

**As a** developer  
**I want** complete and updated documentation for all APIs  
**So that** the system is maintainable and understandable

**Acceptance Criteria:**

- [ ] Update OpenAPI spec with all new endpoints
- [ ] Document all refactored API changes
- [ ] Create migration guide for API consumers
- [ ] Update Postman collections
- [ ] Generate API changelog
- [ ] Create performance tuning guide
- [ ] Document new patterns and conventions

**Technical Notes:**

- Critical for long-term maintainability
- Include code examples for common use cases
- Auto-generate where possible

**Story Points:** 3  
**Status:** 📋 COMMITTED

---

### US-016: Test Infrastructure Fixes [DEFERRED]

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

### Sprint 4 Committed Stories (33 points total)

| Story  | Description                                     | Complexity | Points | Status       | Day      |
| ------ | ----------------------------------------------- | ---------- | ------ | ------------ | -------- |
| US-017 | Status Field Normalization                      | High       | 5      | ✅ COMPLETED | Day 1    |
| US-032 | Confluence Upgrade v9.2.7 & ScriptRunner 9.21.0 | Medium     | 3      | 🚨 URGENT    | Day 2    |
| US-024 | StepsAPI Refactoring                            | High       | 5      | 📋 COMMITTED | Days 2-3 |
| US-025 | MigrationsAPI Refactoring                       | Medium     | 3      | 📋 COMMITTED | Days 2-3 |
| US-031 | Admin GUI Complete Integration                  | High       | 8      | 📋 COMMITTED | Days 3-4 |
| US-028 | Enhanced IterationView                          | Medium     | 3      | 📋 COMMITTED | Day 4    |
| US-022 | Integration Test Suite                          | Medium     | 3      | 📋 COMMITTED | Day 5    |
| US-030 | API Documentation                               | Low        | 3      | 📋 COMMITTED | Day 5    |

**Sprint 4 Total:** 33 points (5 completed + 28 committed)

### Deferred to Sprint 5

| Story  | Description                  | Points | Reason                          |
| ------ | ---------------------------- | ------ | ------------------------------- |
| US-018 | Main Dashboard Development   | 5      | Admin GUI more foundational     |
| US-029 | Enhanced StepView            | 3      | Lower priority than Admin GUI   |
| US-008 | Dashboard Analytics Widgets  | 5      | Complex charts, needs more time |
| US-009 | HTML Report Generation       | 3      | Not critical path               |
| US-010 | Planning Template Management | 3      | Depends on planning feature     |
| US-011 | Confluence JSON Import       | 5      | High complexity, needs focus    |
| US-012 | CSV Bulk Import              | 3      | Can use existing import         |
| US-013 | Audit Trail Implementation   | 5      | Infrastructure change           |
| US-014 | Event Notification System    | 3      | Enhancement                     |
| US-016 | Test Infrastructure Fixes    | 2      | Not blocking                    |

**Deferred Total:** 29 points

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
