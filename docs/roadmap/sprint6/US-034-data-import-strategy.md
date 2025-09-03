# US-034: Data Import Strategy & Implementation

## Story Metadata

**Story ID**: US-034  
**Epic**: Sprint 6 Data Migration Foundation  
**Sprint**: Sprint 6 (September 2-6, 2025)  
**Priority**: P1 (MVP Critical - Production Deployment Blocker)  
**Effort**: 5 points _(Increased from 3 points - expanded scope)_  
**Status**: 75% COMPLETE (HTML/JSON extraction done, database integration pending)  
**Timeline**: Sprint 6 (September 2-6, 2025) - 2 days remaining effort  
**Owner**: Backend Development  
**Dependencies**: All repository patterns established (✅ resolved), Database schema stable (✅ resolved), Base entity APIs operational (✅ resolved)  
**Risk**: MODERATE (entity dependency sequencing, Master Plan creation, data validation complexity)

## Description

**As a** system administrator  
**I want** a comprehensive data import strategy including CSV base entity imports and JSON steps/instructions import  
**So that** I can migrate complete existing migration data into UMIG efficiently with proper entity dependencies

### Value Statement

This story enables MVP deployment by providing the complete data migration foundation: CSV import for base entities (Teams, Users, Applications, Environments) followed by JSON import for complex hierarchical data (Steps/Instructions). This two-phase approach ensures proper entity relationships and enables organizations to migrate complete existing migration data through secure, validated import processes.

### SCOPE CLARIFICATION - Complete Data Import Strategy

**Phase 1 - Base Entities (CSV Import) - 40% of effort:**
- Teams, Users, Applications, Environments CSV import capabilities
- Master Plan entity creation to hold imported configuration
- Entity dependency validation and sequencing

**Phase 2 - Hierarchical Data (JSON Import) - 35% of effort:**  
- JSON steps/instructions import (HTML→JSON extraction ✅ COMPLETE)
- Database integration for extracted JSON data
- Cross-entity relationship validation

**Phase 3 - Validation & Integration - 25% of effort:**
- End-to-end import process validation
- Data integrity checking across all imported entities
- Import rollback and error recovery mechanisms

## Enhanced Acceptance Criteria

### AC-034.1: Master Plan Entity Creation (NEW REQUIREMENT)

**Given** need for imported configuration management  
**When** importing migration data  
**Then** create Master Plan entity to hold imported configuration  
**And** assign unique identifiers for each import batch  
**And** track import metadata (source, date, user, entities imported)  
**And** enable configuration-specific queries and filtering  
**And** support multiple import configurations within same system

### AC-034.2: CSV Base Entity Import Foundation (CRITICAL MISSING COMPONENT)

**Given** base entities must exist before hierarchical data import  
**When** importing foundational data  
**Then** implement CSV import for Teams, Users, Applications, Environments  
**And** support CSV format with standard delimiters (comma, semicolon, tab)  
**And** provide CSV template downloads for each entity type  
**And** validate entity-specific business rules (usernames, team codes, environment types)  
**And** handle entity relationships (team membership, application-environment associations)  
**And** ensure proper entity dependency sequencing: Users → Teams → Environments → Applications

### AC-034.3: JSON Steps/Instructions Database Integration (75% COMPLETE)

**Given** HTML→JSON extraction is complete (42+ instructions from 19 files)  
**When** importing extracted JSON step data  
**Then** integrate existing JSON extraction with database import  
**And** create Steps Master entities from JSON step definitions  
**And** create Instructions Master entities from JSON task lists  
**And** validate hierarchical relationships (Steps → Instructions)  
**And** handle team assignments and predecessor/successor relationships  
**And** preserve all extracted metadata (step types, time sequences, control associations)

### AC-034.4: Entity Dependency Sequencing (NEW REQUIREMENT)

**Given** entities have complex interdependencies  
**When** executing import operations  
**Then** implement proper import sequence: Master Plan → Base Entities → Hierarchical Data  
**And** validate prerequisite entities exist before dependent imports  
**And** provide clear error messages for missing dependencies  
**And** support partial rollback when dependency validation fails  
**And** document import order requirements in user guidance

### AC-034.5: Import Process Orchestration

**Given** multiple import phases must be coordinated  
**When** running complete migration import  
**Then** provide orchestrated import workflow spanning all phases  
**And** support individual phase execution for troubleshooting  
**And** provide progress tracking across multi-phase imports  
**And** enable resume functionality for interrupted multi-phase operations  
**And** validate data consistency between import phases

### AC-034.6: Data Validation and Quality Assurance

**Given** imported data must meet production quality standards  
**When** processing import data  
**Then** implement comprehensive validation framework for all entity types  
**And** validate business rules (team codes, user permissions, application criticality)  
**And** perform referential integrity checks across all imported entities  
**And** generate data quality reports with validation results  
**And** provide detailed error reporting with suggested corrections

### AC-034.7: Import Audit and Rollback Capabilities

**Given** need for operational safety and compliance  
**When** executing import operations  
**Then** implement comprehensive audit logging for all import activities  
**And** support atomic rollback of individual entity import phases  
**And** provide transaction-based import processing with commit/rollback  
**And** maintain import history with user attribution and timestamps  
**And** enable selective rollback of specific entity types or import batches

### AC-034.8: User Interface and Templates (ENHANCED SCOPE)

**Given** need for user-friendly import experience  
**When** providing import capabilities  
**Then** implement phased import interface (Base Entities → Hierarchical Data)  
**And** provide CSV templates for all base entities with sample data  
**And** support drag-and-drop upload for CSV and JSON files  
**And** provide import preview with dependency validation  
**And** display import progress across all phases with detailed status  
**And** export import templates with proper formatting and instructions

---

## Technical Requirements

### Phase 1: Master Plan & Base Entity Infrastructure (40% effort)

**Master Plan Entity Creation:**
- Create `master_plans_mpm` table with import configuration tracking
- Add foreign key references from imported entities to Master Plan
- Implement MasterPlanRepository with CRUD operations
- Add Master Plan API endpoints for configuration management

**CSV Import Infrastructure:**
- Create BaseEntityImportService in `src/groovy/umig/service/`
- Implement CSV parsing with encoding detection and delimiter handling
- Add validation framework for base entities (Users, Teams, Environments, Applications)
- Create CSV template generation service with proper formatting

**Entity-Specific Import Services:**
- TeamsImportService with team code validation and hierarchy support
- UsersImportService with authentication integration and role assignment
- EnvironmentsImportService with environment type validation
- ApplicationsImportService with criticality levels and environment associations

### Phase 2: JSON Integration & Database Import (35% effort)

**JSON Import Integration:**  
- Integrate existing PowerShell JSON extraction (scrape_html_batch_v4.ps1) with Groovy backend
- Create StepsImportService for JSON step definition processing  
- Create InstructionsImportService for JSON task list processing
- Implement hierarchical relationship validation (Steps → Instructions)
- Add team assignment processing from JSON metadata

**Database Integration:**  
- Extend existing StepsRepository and InstructionsRepository for import operations
- Add batch insert capabilities with transaction management
- Implement predecessor/successor relationship processing
- Add metadata preservation (step types, time sequences, control associations)

### Phase 3: Orchestration & Validation (25% effort)

**Import Orchestration:**
- Create ImportOrchestrationService for multi-phase import coordination
- Implement dependency validation between import phases
- Add import progress tracking with real-time status updates
- Create import rollback mechanisms with atomic transaction support

**API Endpoints Enhancement:**
- `POST /api/v2/import/master-plan` - Create import configuration
- `POST /api/v2/import/csv/teams` - Import teams CSV  
- `POST /api/v2/import/csv/users` - Import users CSV
- `POST /api/v2/import/csv/environments` - Import environments CSV
- `POST /api/v2/import/csv/applications` - Import applications CSV
- `POST /api/v2/import/json/steps-instructions` - Import JSON hierarchy
- `GET /api/v2/import/templates/{entity}` - Download CSV templates
- `GET /api/v2/import/status/{batchId}` - Import progress tracking
- `POST /api/v2/import/rollback/{batchId}` - Rollback import batch

### Technology Stack Integration

**Backend Implementation:**
- Groovy-based services following existing repository patterns
- DatabaseUtil.withSql integration for transaction management
- Existing API endpoint patterns (StepsApi.groovy, TeamsApi.groovy reference)
- Integration with existing authentication and authorization framework

**Data Processing Libraries:**
- OpenCSV for CSV file handling with encoding detection
- Groovy JSON parsing for existing JSON integration
- Existing database connection pooling and transaction management
- File upload handling via ScriptRunner-compatible interfaces

### Dependencies

- ✅ All repository patterns established (resolved)
- ✅ Database schema stable (resolved)
- User authentication and authorization framework
- File upload infrastructure (ScriptRunner-compatible)

### Detailed Sub-Tasks (Implementation Roadmap)

#### Phase 1 Sub-Tasks: Master Plan & Base Entity Infrastructure (2 points)

**Sub-task 1.1**: Master Plan Entity Creation (0.5 points)
- Create `master_plans_mpm` database table with Liquibase migration
- Implement MasterPlanRepository with CRUD operations following existing patterns
- Add Master Plan API endpoints with proper authentication
- Create Master Plan tests and integration validation

**Sub-task 1.2**: CSV Base Entity Import Foundation (1.0 points)  
- Implement BaseEntityImportService with CSV parsing capabilities
- Add entity validation framework for Users, Teams, Environments, Applications
- Create CSV template generation service with proper formatting
- Build file upload interface compatible with ScriptRunner

**Sub-task 1.3**: Entity-Specific Import Services (0.5 points)
- Create TeamsImportService with team code validation
- Create UsersImportService with authentication integration  
- Create EnvironmentsImportService with environment type validation
- Create ApplicationsImportService with criticality and environment associations

#### Phase 2 Sub-Tasks: JSON Integration & Database Import (2 points)

**Sub-task 2.1**: JSON-Database Integration Bridge (1.0 points)
- Create Groovy service to process existing JSON extraction output
- Extend StepsRepository for batch import operations with transaction support
- Extend InstructionsRepository for hierarchical data import
- Add JSON metadata preservation (step types, sequences, team assignments)

**Sub-task 2.2**: Hierarchical Data Processing (1.0 points)
- Implement Steps Master entity creation from JSON step definitions
- Implement Instructions Master entity creation from JSON task lists  
- Add predecessor/successor relationship processing with validation
- Create team assignment mapping from JSON to existing team entities

#### Phase 3 Sub-Tasks: Orchestration & Validation (1 point)

**Sub-task 3.1**: Import Process Orchestration (0.5 points)
- Create ImportOrchestrationService for multi-phase coordination
- Implement dependency validation between import phases
- Add progress tracking with real-time status updates
- Create comprehensive error reporting and rollback mechanisms

**Sub-task 3.2**: API Integration & User Interface (0.5 points)
- Implement 9 new import API endpoints following existing patterns
- Add import progress monitoring interface
- Create CSV template download functionality
- Integrate with existing Admin GUI for import management

### Testing Requirements (Enhanced Scope)

- **Phase 1 Testing**: Master Plan entity creation and CSV base entity import validation
- **Phase 2 Testing**: JSON integration with existing extracted data (42+ instructions)
- **Phase 3 Testing**: End-to-end orchestrated import with rollback validation
- **Performance Testing**: Large dataset handling (1000+ records across all entities)
- **Integration Testing**: Cross-entity dependency validation and referential integrity
- **Error Recovery Testing**: Rollback mechanisms and partial failure handling

## Definition of Done

### Phase 1: Master Plan & Base Entity Infrastructure
- [ ] Master Plan entity (`master_plans_mpm`) created with Liquibase migration
- [ ] MasterPlanRepository implemented with full CRUD operations
- [ ] Master Plan API endpoints operational with authentication
- [ ] CSV import infrastructure complete for all 4 base entities (Teams, Users, Environments, Applications)
- [ ] CSV template generation functional with proper formatting and validation
- [ ] Entity-specific import services operational (Teams, Users, Environments, Applications)
- [ ] File upload interface integrated with ScriptRunner compatibility
- [ ] Entity dependency sequencing validated: Users → Teams → Environments → Applications

### Phase 2: JSON Integration & Database Integration
- [ ] JSON extraction integration complete with existing PowerShell output (42+ instructions from 19 files)
- [ ] StepsRepository extended for batch import operations with transaction support
- [ ] InstructionsRepository extended for hierarchical data import with relationship validation  
- [ ] Steps Master entity creation from JSON step definitions functional
- [ ] Instructions Master entity creation from JSON task lists operational
- [ ] Predecessor/successor relationship processing with validation complete
- [ ] Team assignment mapping from JSON to existing database entities working
- [ ] All JSON metadata preserved (step types, time sequences, control associations)

### Phase 3: Import Process Orchestration
- [ ] ImportOrchestrationService operational for multi-phase import coordination
- [ ] Dependency validation between import phases complete with clear error messages
- [ ] Import progress tracking with real-time status updates functional
- [ ] Comprehensive rollback mechanisms tested and validated for all phases
- [ ] 9 new import API endpoints implemented following existing patterns:
  - [ ] `POST /api/v2/import/master-plan` - Create import configuration
  - [ ] `POST /api/v2/import/csv/teams` - Import teams CSV  
  - [ ] `POST /api/v2/import/csv/users` - Import users CSV
  - [ ] `POST /api/v2/import/csv/environments` - Import environments CSV
  - [ ] `POST /api/v2/import/csv/applications` - Import applications CSV
  - [ ] `POST /api/v2/import/json/steps-instructions` - Import JSON hierarchy
  - [ ] `GET /api/v2/import/templates/{entity}` - Download CSV templates
  - [ ] `GET /api/v2/import/status/{batchId}` - Import progress tracking
  - [ ] `POST /api/v2/import/rollback/{batchId}` - Rollback import batch

### Quality Assurance & Integration
- [ ] Comprehensive data validation framework operational for all entity types
- [ ] Business rule validation complete (team codes, user permissions, application criticality)
- [ ] Referential integrity checks working across all imported entities
- [ ] Performance benchmarks achieved (process 1000+ records across entities <60s)
- [ ] Import audit logging complete with user attribution and timestamps
- [ ] Duplicate detection and handling operational for all entity types
- [ ] End-to-end integration testing completed across all import scenarios
- [ ] Full test coverage achieved (unit, integration, and orchestration tests)
- [ ] Security review completed for file upload and data processing
- [ ] User documentation complete with import templates for all entity types
- [ ] Import progress interface integrated with existing Admin GUI

### Acceptance Validation
- [ ] Complete migration scenario tested: CSV base entities → JSON hierarchical data → validation
- [ ] Error recovery and rollback scenarios validated for all phases
- [ ] Import history and audit trail interface functional
- [ ] CSV templates downloadable with sample data and proper instructions
- [ ] Multi-batch import capability validated with proper configuration management

## Risk Factors (Updated for Enhanced Scope)

- **High**: Entity dependency sequencing failures could cascade across all imported data
- **High**: JSON integration with 42+ existing instructions requires careful data preservation
- **Medium**: Master Plan entity creation impacts existing database schema
- **Medium**: CSV parsing errors could corrupt base entity relationships
- **Medium**: Multi-phase import rollback complexity across 3 different phases
- **Low**: User interface complexity for phased import management
- **Low**: Performance impact from large dataset processing (mitigated by batch processing)

## Sprint Planning Notes (Updated for Enhanced Scope)

### Scope Expansion Recognition

- **Original Estimate**: 3 points (CSV import only)
- **Enhanced Scope**: 5 points (CSV + JSON + Master Plan + Orchestration)
- **Reason for Expansion**: Critical discovery that base entities are prerequisite for hierarchical data import
- **Completion Status**: 75% complete (HTML→JSON extraction operational, database integration pending)

### Sprint 6 Implementation Plan (Updated)

- **Remaining Effort**: 1.25 points (25% of enhanced scope)
- **Estimated Timeline**: 1-2 days remaining implementation
- **Prerequisites**: ✅ Sprint 5 MVP completion, ✅ Admin GUI operational, ✅ JSON extraction complete
- **Integration Points**: Admin GUI phased import interface, existing API patterns, PowerShell JSON output
- **Testing Strategy**: Leverage existing 95%+ test coverage framework for comprehensive validation

### Implementation Sequencing Strategy

**Day 1**: Master Plan entity + CSV base entity infrastructure (Phase 1 completion)
**Day 2**: JSON database integration + orchestration service (Phases 2-3 completion)
**Validation**: End-to-end testing with existing extracted data (42+ instructions from 19 files)

### Critical Success Factors

- **Leverage Completed Work**: 75% scope already operational with HTML→JSON extraction
- **Entity Dependency Management**: Proper sequencing of Users → Teams → Environments → Applications → Steps/Instructions
- **Data Preservation**: Maintain integrity of existing extracted JSON data during database integration
- **Rollback Safety**: Atomic transaction support across all import phases

---

**Document Version**: 3.0 (Complete Data Import Strategy - Enhanced Scope)  
**Created**: August 18, 2025  
**Last Updated**: September 3, 2025  
**Owner**: UMIG Development Team  
**Review Date**: Sprint 6 Implementation (September 2-6, 2025)

_This specification provides the complete data import strategy encompassing CSV base entity imports, JSON hierarchical data integration, Master Plan entity creation, and comprehensive import orchestration. Expanded from 3 to 5 story points to address critical missing components discovered during implementation. 75% complete with HTML→JSON extraction operational (42+ instructions from 19 files). Remaining 25% focuses on database integration and import orchestration for Sprint 6 completion._

### Enhancement Summary (v3.0)

**Critical Missing Components Added:**
- Master Plan entity creation for import configuration management
- CSV import infrastructure for base entities (Teams, Users, Applications, Environments)  
- Entity dependency sequencing and validation framework
- JSON-database integration bridge for existing extracted data
- Import process orchestration across multiple phases
- Comprehensive rollback mechanisms and audit logging

**Story Point Adjustment**: 3 → 5 points (expanded scope with 75% completion status)  
**Implementation Timeline**: 1.25 points remaining effort (1-2 days in Sprint 6)
