# Sprint 0 User Stories Breakdown

## Sprint Overview
- **Sprint Duration**: 5 working days (July 30-31, Aug 2, 5-6, 2025)
- **Sprint Goal**: Establish canonical-first foundation with consolidated APIs following proven StepsApi patterns
- **Total Story Points**: 40 points
- **Team Velocity Target**: 8-10 points/day

## Epic 1: Canonical Data API Foundation (21 points)

### US-001: Plans API Implementation
**As a** system architect  
**I want** a consolidated Plans API that manages both master and instance operations  
**So that** I can maintain canonical plan templates and create instances efficiently

**Acceptance Criteria:**
- GET, POST, PUT, DELETE operations for master plans
- Instance creation from master templates with override support
- Hierarchical filtering (migration → iteration → plan)
- Status management for instances
- Audit logging for all operations
- Unit test coverage ≥90%

**Story Points**: 5  
**Dependencies**: None  
**Priority**: High

### US-002: Sequences API with Ordering
**As a** cutover coordinator  
**I want** a Sequences API with drag-drop ordering capabilities  
**So that** I can organize execution sequences logically

**Acceptance Criteria:**
- CRUD operations for master sequences
- Bulk reordering endpoint (/sequences/reorder)
- Order field management (sqm_order)
- Plan-based filtering
- Progress roll-up calculations
- Integration tests for ordering logic

**Story Points**: 5  
**Dependencies**: US-001  
**Priority**: High

### US-003: Phases API with Control Points
**As a** quality manager  
**I want** a Phases API that includes control point management  
**So that** I can enforce quality gates during execution

**Acceptance Criteria:**
- CRUD operations for master phases
- Control point endpoints (/phases/{id}/controls)
- Progress aggregation from steps
- Sequence-based filtering
- Control validation logic implementation
- Test coverage for control operations

**Story Points**: 5  
**Dependencies**: US-002  
**Priority**: High

### US-004: Instructions API with Distribution
**As a** team lead  
**I want** an Instructions API with distribution tracking  
**So that** I can ensure all team members receive their tasks

**Acceptance Criteria:**
- CRUD for master instructions
- Distribution status endpoint (/instructions/{id}/distribution)
- Completion tracking endpoints
- Step-based filtering
- Bulk operations support
- Distribution channel integration points

**Story Points**: 3  
**Dependencies**: US-001  
**Priority**: Medium

### US-005: Controls API Implementation
**As a** compliance officer  
**I want** a Controls API for managing quality gate templates  
**So that** I can standardize validation checkpoints

**Acceptance Criteria:**
- Control template management
- Validation rules configuration
- Progress dependency definitions
- Integration with Phases API
- Unit tests for validation logic

**Story Points**: 3  
**Dependencies**: US-003  
**Priority**: Medium

## Epic 2: Database Schema Evolution (8 points)

### US-006: Assignment Schema Migration
**As a** database administrator  
**I want** assignment tracking tables in the database  
**So that** we can manage task assignments systematically

**Acceptance Criteria:**
- Create assignment_rules_asr table with proper constraints
- Create step_assignments_sta table with foreign keys
- Support for manual, role-based, and team-based assignments
- JSONB criteria field for flexible rules
- Liquibase changeset validated
- Rollback script included

**Story Points**: 3  
**Dependencies**: None  
**Priority**: High

### US-007: Distribution Tracking Migration
**As a** operations manager  
**I want** distribution logging tables  
**So that** I can track instruction delivery status

**Acceptance Criteria:**
- Create distribution_log_dsl table
- Support multiple channels (email, confluence, teams)
- Status tracking (pending, sent, delivered, failed)
- Metadata storage for channel-specific data
- Indexes for performance
- Migration tested in dev environment

**Story Points**: 2  
**Dependencies**: None  
**Priority**: Medium

### US-008: Migration Rollback Scripts
**As a** DevOps engineer  
**I want** rollback scripts for all new migrations  
**So that** we can safely revert database changes if needed

**Acceptance Criteria:**
- Rollback scripts for migrations 034 and 035
- Test rollback in isolated environment
- Document rollback procedures
- Verify data integrity after rollback

**Story Points**: 3  
**Dependencies**: US-006, US-007  
**Priority**: High

## Epic 3: Repository Layer Implementation (8 points)

### US-009: Plan Repository with Canonical Methods
**As a** backend developer  
**I want** a PlanRepository with separate master/instance methods  
**So that** I can maintain clear separation of concerns

**Acceptance Criteria:**
- findAllMasterPlans() with status joins
- createMasterPlan() with validation
- Instance creation from master method
- Override field handling
- Error handling with specific exceptions
- Repository unit tests

**Story Points**: 2  
**Dependencies**: US-006  
**Priority**: High

### US-010: Sequence Repository with Ordering
**As a** backend developer  
**I want** a SequenceRepository with reordering capabilities  
**So that** I can manage sequence order programmatically

**Acceptance Criteria:**
- Master sequence CRUD methods
- reorderMasterSequences() bulk operation
- Instance order update methods
- Transaction handling for ordering
- Performance optimization for large sets

**Story Points**: 2  
**Dependencies**: US-009  
**Priority**: Medium

### US-011: Phase Repository with Progress
**As a** backend developer  
**I want** a PhaseRepository with progress calculation  
**So that** I can aggregate completion status

**Acceptance Criteria:**
- Control point query methods
- calculatePhaseProgress() implementation
- Status update methods
- Efficient progress aggregation queries
- Caching strategy for calculations

**Story Points**: 2  
**Dependencies**: US-010  
**Priority**: Medium

### US-012: Instruction Repository with Distribution
**As a** backend developer  
**I want** an InstructionRepository with distribution methods  
**So that** I can track instruction delivery

**Acceptance Criteria:**
- Master instruction queries
- markInstructionDistributed() method
- markInstructionComplete() method
- Bulk operation support
- Distribution status queries

**Story Points**: 2  
**Dependencies**: US-007  
**Priority**: Medium

## Epic 4: UI Components (3 points)

### US-013: Master Plan Template UI Design
**As a** UI designer  
**I want** mockups for canonical plan management  
**So that** developers can implement the interface

**Acceptance Criteria:**
- Master plan library interface mockup
- Plan cloning/versioning UI design
- Instance creation workflow mockup
- AUI component compliance
- Mobile-responsive considerations
- Figma/HTML prototype delivered

**Story Points**: 1  
**Dependencies**: None  
**Priority**: Low

### US-014: Sequence Ordering Interface Design
**As a** UI designer  
**I want** a drag-drop sequence ordering mockup  
**So that** users can intuitively reorder sequences

**Acceptance Criteria:**
- Drag-drop interface mockup
- Visual sequence flow representation
- Override highlighting design
- Accessibility considerations (keyboard nav)
- Integration points identified

**Story Points**: 1  
**Dependencies**: None  
**Priority**: Low

### US-015: Assignment Interface Prototype
**As a** UI designer  
**I want** an assignment management interface design  
**So that** coordinators can easily assign tasks

**Acceptance Criteria:**
- Team list to step drag-drop mockup
- Bulk assignment UI elements
- Assignment rule builder interface
- Visual feedback for assignments
- Error state designs

**Story Points**: 1  
**Dependencies**: None  
**Priority**: Low

## Sprint Planning Recommendations

### Day 1-2 (Wed-Thu, July 30-31)
- **Focus**: API scaffolding and database design
- **Stories**: US-001, US-002, US-006, US-007
- **Points**: 15

### Day 3 (Fri, Aug 2)
- **Focus**: Review and planning after holiday
- **Stories**: US-008, US-009
- **Points**: 5

### Day 4 (Mon, Aug 5)
- **Focus**: Complete APIs and repositories
- **Stories**: US-003, US-004, US-010, US-011
- **Points**: 12

### Day 5 (Tue, Aug 6)
- **Focus**: Integration and testing
- **Stories**: US-005, US-012, US-013, US-014, US-015
- **Points**: 8

## Definition of Done
1. Code complete and follows established patterns
2. Unit tests written and passing (≥90% coverage)
3. Integration tests for API endpoints
4. API documentation updated in OpenAPI spec
5. Code reviewed by at least one team member
6. No critical SonarQube issues
7. Merged to main branch

## Risk Register

### High Risks
1. **Pattern Deviation**: Mitigate by referencing StepsApi.groovy continuously
2. **Holiday Disruption**: Front-load critical work before Aug 1

### Medium Risks
1. **Integration Conflicts**: Daily integration checkpoints at 5 PM
2. **Scope Creep**: Strict adherence to acceptance criteria

### Low Risks
1. **UI Design Delays**: Can extend into Week 1 if needed
2. **Test Coverage**: Automated coverage reports

## Sprint Metrics
- **Planned Velocity**: 40 points
- **Daily Standup**: 9:30 AM
- **Sprint Review**: Aug 6, 4:00 PM
- **Sprint Retrospective**: Aug 6, 5:00 PM

## Notes for Product Owner
- All stories follow INVEST principles
- Dependencies clearly marked for planning
- UI stories are lower priority and can spill to next sprint if needed
- Focus is on establishing the canonical-first foundation
- Consolidated API approach reduces complexity from 12+ to 6 APIs