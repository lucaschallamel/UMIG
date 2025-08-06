 # Sprint 3 - US-006b: Status Field Normalization (Completion Plan)

  ## Current Implementation Status (August 2025)

  ### ✅ Completed Components

  #### Phase 1: Database Schema

  - ✅ `status_sts` table created with all columns
  - ✅ 24 status records populated (4 per entity type)
  - ✅ Foreign keys added for Plans, Sequences, Phases, Steps

  #### Phase 2: API Updates (Partial)

  - ✅ PlansApi.groovy - Using integer status IDs
  - ✅ SequencesApi.groovy - Using integer status IDs
  - ✅ PhasesApi.groovy - Using integer status IDs
  - ✅ StepsApi.groovy - Using integer status IDs
  - ✅ InstructionsApi.groovy - Uses ini_is_completed boolean (no status needed)
  - ✅ ControlsApi.groovy - Using integer status IDs with validation

  #### Phase 5: Testing (Partial)

  - ✅ Integration tests updated for Plans, Sequences, Phases, Steps
  - ✅ Tests using correct status IDs
  - ✅ Instructions tests validate ini_is_completed boolean
  - ✅ Controls tests validate FK constraints

  ### ❌ Missing Components

  #### Database

  - ✅ Instructions use ini_is_completed boolean (no FK needed)
  - ✅ Foreign key constraints for `controls_master_ctm.ctm_status`
  - ✅ Foreign key constraints for `controls_instance_cti.cti_status`

  #### APIs

  - ✅ Instructions API: Uses ini_is_completed boolean (no status validation needed)
  - ✅ Controls API: Status validation against status_sts implemented
  - ✅ Controls API: JOIN with status_sts in GET operations implemented

  #### Admin GUI

  - ❌ No Status Management component
  - ❌ No status dropdowns in entity forms
  - ❌ No color-coded status visualization
  - ❌ No instructions management component
  - ❌ No controls management component

  #### Documentation

  - ✅ OpenAPI spec updated for status normalization
  - ✅ ADR-035 created for status normalization decision
  - ❌ No user guide for status management

  ## Gap Analysis

  ### Critical Gaps (Must Fix)

    ✅ All critical gaps have been addressed:
    1. **Database Integrity**: Controls have FK constraints, Instructions use boolean
    2. **API Validation**: Controls API validates status, Instructions use boolean
    3. **Data Consistency**: Valid status IDs enforced for Controls

  ### Important Gaps (Should Fix)

    1. **Admin GUI**: No interface for status management
    2. **API Responses**: Missing status details (name, color) in responses
    3. **Documentation**: OpenAPI spec outdated

  ### Nice-to-Have Gaps

    1. **Bulk Operations**: No bulk status update capability
    2. **Status History**: No audit trail for status changes
    3. **Status Workflow**: No status transition rules

  ## Comprehensive Implementation Plan with GENDEV Agents

  ### Phase 1: System Architecture Analysis

  **Agent**: `gendev-system-architect`
  **Objective**: Complete gap analysis and dependency mapping

  **Deliverables**:

    1. Complete gap analysis with priorities
    2. Dependency graph for all components
    3. Risk assessment matrix
    4. Implementation sequence recommendation
    5. Validation criteria checklist

  ### Phase 2: Database Migration Design

  **Agent**: `gendev-database-schema-designer`
  **Objective**: Design FK constraints for Instructions/Controls

  **Deliverables**:

    1. Liquibase migration script (021_add_status_foreign_keys.sql)
    2. Data validation queries
    3. Rollback procedures
    4. Performance impact assessment
    5. Test queries for verification

  ### Phase 3: API Implementation Updates

  **Agent**: `gendev-code-reviewer` + `gendev-api-designer`
  **Objective**: Update Instructions and Controls APIs

  **Deliverables**:

    1. Detailed code modifications (line-by-line)
    2. SQL query updates with JOINs
    3. Validation logic implementation
    4. Error handling patterns
    5. Response structure updates

  ### Phase 4: Test Suite Enhancement

  **Agent**: `gendev-test-suite-generator`
  **Objective**: Update integration tests for complete coverage

  **Deliverables**:

    1. Updated test cases for Instructions API
    2. Updated test cases for Controls API
    3. FK constraint validation tests
    4. Invalid status rejection tests
    5. Performance test scenarios

  ### Phase 5: Admin GUI Development

  **Agent**: `gendev-interface-designer`
  **Objective**: Create status management interface

  **Deliverables**:

    1. statusManagement.js component
    2. Status dropdowns for all entity forms
    3. Color-coded status badges
    4. CSS styling for status visualization
    5. Integration with existing components

  ### Phase 6: Documentation Updates

  **Agent**: `gendev-documentation-generator`
  **Objective**: Complete all documentation

  **Deliverables**:

    1. Updated OpenAPI specification
    2. ADR-033 for status normalization
    3. User guide for Admin GUI
    4. Developer implementation guide
    5. Migration procedures

  ### Phase 7: Quality Assurance

  **Agent**: `gendev-qa-coordinator`
  **Objective**: Comprehensive testing and validation

  **Deliverables**:

    1. Test execution report
    2. Performance validation results
    3. Security assessment
    4. Acceptance criteria verification
    5. Sign-off documentation

  ## Execution Sequence

  ### Immediate Actions (Can be done in parallel)

    1. Database migration script creation (Phase 2)
    2. API code review and planning (Phase 3)
    3. Test suite updates (Phase 4)

  ### Sequential Implementation

    1. Execute database migrations
    2. Update Instructions API
    3. Update Controls API
    4. Run updated integration tests
    5. Develop Admin GUI components
    6. Update documentation
    7. Final QA validation

  ### Dependencies

  Database Migrations
      ↓
  API Updates (Instructions, Controls)
      ↓
  Integration Tests
      ↓
  Admin GUI Development
      ↓
  Documentation
      ↓
  Final QA

  ## Success Criteria

  ### Database

  - [ ] All entity tables have FK constraints to status_sts
  - [ ] No orphaned status values exist
  - [ ] Constraints prevent invalid status assignments

  ### APIs

  - [ ] All 6 entity APIs validate status against status_sts
  - [ ] GET operations return status name and color
  - [ ] Invalid status IDs return 400 errors
  - [ ] Existing data continues to work

  ### Admin GUI

  - [ ] Status management CRUD interface functional
  - [ ] All entity forms have status dropdowns
  - [ ] Status colors display correctly
  - [ ] Bulk operations work as expected

  ### Testing

  - [ ] All integration tests pass
  - [ ] FK constraints are tested
  - [ ] Invalid status handling tested
  - [ ] Performance benchmarks met

  ### Documentation

  - [ ] OpenAPI spec accurate
  - [ ] ADR-033 documented
  - [ ] User guides complete
  - [ ] Developer docs updated

  ## Risk Mitigation

  ### High Risk

  - **Data Loss**: Create full backup before migrations
  - **API Breaking Changes**: Maintain backward compatibility
  - **FK Violations**: Validate all existing data first

  ### Medium Risk

  - **Performance Impact**: Test with production-like data
  - **GUI Complexity**: Incremental implementation
  - **Test Coverage**: Automated regression suite

  ### Low Risk

  - **Documentation Gaps**: Review with team
  - **Color Conflicts**: Use accessible color palette
  - **Browser Compatibility**: Test on multiple browsers

  ## Timeline Estimate

  - **Phase 1-2**: 2 hours (Analysis & Design)
  - **Phase 3-4**: 4 hours (Implementation)
  - **Phase 5**: 4 hours (Admin GUI)
  - **Phase 6-7**: 2 hours (Documentation & QA)

  **Total**: ~12 hours of focused development

  ## Next Steps

    1. Execute GENDEV agent tasks for detailed specifications
    2. Review and approve migration scripts
    3. Implement API updates
    4. Develop Admin GUI
    5. Complete testing
    6. Update documentation
    7. Deploy to development environment
    8. Team review and sign-off