# US-003: Phases API with Control Points

**Sprint:** Sprint 0  
**Priority:** High  
**Type:** API Implementation  
**Estimated Effort:** 4-5 hours  
**Dependencies:** US-001 (Plans API), US-002 (Sequences API)  
**Created:** 2025-08-04  
**Status:** ✅ COMPLETED (2025-08-04)  
**Actual Effort:** ~5 hours

## Completion Summary

✅ **Implementation Complete**: PhasesApi.groovy (2,076 lines) with full control point management  
✅ **Testing Complete**: Unit tests (PhaseRepositoryTest.groovy) and Integration tests (30 comprehensive tests)  
✅ **Documentation Complete**: API documentation (PhasesAPI.md), OpenAPI updated, Postman collection regenerated  
✅ **Quality Gates Met**: 90%+ coverage, <200ms performance, ADR compliance verified  

## User Story

**As a** quality manager and operations coordinator  
**I want** a comprehensive Phases API that includes control point management  
**So that** I can enforce quality gates during migration execution, track phase progress, and ensure all critical steps are completed before proceeding

## Business Value

- **Risk Reduction**: Control points prevent progression without critical validations
- **Quality Assurance**: Enforces completion of mandatory steps before phase transitions
- **Progress Visibility**: Real-time progress aggregation from step completions
- **Operational Control**: Flexible control validation with override capabilities for emergency situations

## Background & Context

Phases represent major milestones within sequences and contain multiple steps. Each phase can have control points that act as quality gates, preventing progression until specific conditions are met. This is critical for enterprise migrations where skipping validation steps could cause system failures.

Current implementation needs:
- Master phase templates with reusable control configurations
- Instance phases created from masters with status tracking
- Control point validation logic with override capabilities
- Progress aggregation from child steps
- Integration with existing Plans and Sequences APIs

## Acceptance Criteria

### API Endpoints

1. **Master Phase Management**
   - [x] `GET /phases/masters` - List all master phase templates
   - [x] `GET /phases/masters/{id}` - Get specific master phase details
   - [x] `POST /phases/masters` - Create new master phase template
   - [x] `PUT /phases/masters/{id}` - Update master phase
   - [x] `DELETE /phases/masters/{id}` - Delete master phase (with cascade protection)

2. **Phase Instance Operations**
   - [x] `GET /phases` - List phase instances with hierarchical filtering
   - [x] `GET /phases/{id}` - Get specific phase instance details
   - [x] `POST /phases` - Create phase instance from master
   - [x] `PUT /phases/{id}` - Update phase instance (status, overrides)
   - [x] `DELETE /phases/{id}` - Delete phase instance

3. **Ordering Management**
   - [x] `PUT /phases/masters/{sequenceId}/reorder` - Bulk reorder master phases within sequence
   - [x] `PUT /phases/{sequenceId}/reorder` - Bulk reorder phase instances within sequence
   - [x] `PUT /phases/masters/{id}/order` - Update single master phase order
   - [x] `PUT /phases/{id}/order` - Update single phase instance order

4. **Control Point Management**
   - [x] `GET /phases/{id}/controls` - List control points for a phase
   - [x] `PUT /phases/{id}/controls/{controlId}` - Update control point status
   - [x] `POST /phases/{id}/controls/{controlId}/override` - Override control with reason
   - [x] `GET /phases/{id}/controls/validation` - Validate all control points

5. **Progress and Status**
   - [x] `GET /phases/{id}/progress` - Calculate phase progress from steps
   - [x] `PUT /phases/{id}/status` - Update phase status with validation
   - [x] `GET /phases/{id}/readiness` - Check if phase ready to proceed

### Repository Requirements

**PhaseRepository.groovy**:
- `findAllMasterPhases()` - Query all master phase templates
- `findMasterPhaseById(UUID)` - Get specific master phase
- `createMasterPhase(Map)` - Create master phase with controls
- `updateMasterPhase(UUID, Map)` - Update master phase
- `deleteMasterPhase(UUID)` - Delete with cascade check
- `findPhaseInstances(Map filters)` - Hierarchical filtering support
- `findPhaseInstanceById(UUID)` - Get specific instance
- `createPhaseInstance(UUID masterPhaseId, UUID sequenceId, Map overrides)` - Instance creation
- `updatePhaseInstance(UUID, Map)` - Update instance
- `deletePhaseInstance(UUID)` - Delete instance
- `findControlPoints(UUID phaseId)` - Get phase control points
- `updateControlPoint(UUID controlId, Map status)` - Control point update
- `calculatePhaseProgress(UUID phaseId)` - Aggregate step progress
- `validateControlPoints(UUID phaseId)` - Check control readiness
- `overrideControl(UUID controlId, String reason, String overrideBy)` - Control override
- `reorderMasterPhases(UUID sequenceId, Map<UUID, Integer> phaseOrderMap)` - Bulk reorder master phases
- `reorderPhaseInstances(UUID sequenceId, Map<UUID, Integer> phaseOrderMap)` - Bulk reorder instances
- `updateMasterPhaseOrder(UUID phaseId, UUID sequenceId, Integer newOrder)` - Update single master order
- `updatePhaseInstanceOrder(UUID phaseId, UUID sequenceId, Integer newOrder)` - Update single instance order
- `normalizePhaseOrder(UUID sequenceId)` - Fix order gaps after deletions

### Technical Requirements

1. **Type Safety (ADR-031)**
   - [x] Explicit casting for all query parameters
   - [x] UUID and Integer parsing with validation
   - [x] Proper null handling

2. **Hierarchical Filtering (ADR-030)**
   - [x] Filter by migrationId, iterationId, planId, sequenceId
   - [x] Use instance IDs for filtering, not master IDs
   - [x] Cascading filter logic

3. **Control Point Logic**
   - [x] Control types: MANDATORY, OPTIONAL, CONDITIONAL
   - [x] Validation states: PENDING, VALIDATED, FAILED, OVERRIDDEN
   - [x] Override tracking with reason and actor
   - [x] Progress calculation excluding optional controls

4. **Ordering Logic**
   - [x] Maintain phase order within sequences (phm_order, phi_order)
   - [x] Automatic gap normalization after deletions
   - [x] Bulk reordering with transaction support
   - [x] Order validation to prevent duplicates
   - [x] Preserve order during instance creation from master

5. **Integration Points**
   - [x] Seamless integration with Sequences API
   - [x] Status propagation to parent sequence
   - [x] Step aggregation for progress calculation
   - [x] Control validation before status transitions

### Database Schema

**Existing Tables**:
- `phases_master_phm` - Master phase templates
- `phases_instance_phi` - Phase instances
- `controls_master_ctm` - Control point templates  
- `controls_instance_cti` - Control point instances

**Key Fields**:
- Phase ordering within sequence (`phm_order`, `phi_order`)
- Control validation status (`cti_status`, `cti_validated_by`)
- Override tracking (`cti_override_reason`, `cti_override_by`)
- Progress tracking (`phi_progress_percentage`)

### Testing Requirements

1. **Unit Tests (PhaseRepositoryTest.groovy)**
   - [x] All repository methods with specific SQL mocks (ADR-026)
   - [x] Control point validation logic
   - [x] Progress calculation scenarios
   - [x] Error handling for invalid states

2. **Integration Tests (PhasesApiIntegrationTest.groovy)**
   - [x] Complete CRUD operations
   - [x] Hierarchical filtering validation
   - [x] Control point workflows
   - [x] Status transition validation
   - [x] Progress aggregation accuracy

3. **Performance Tests**
   - [x] Response time <200ms for standard queries
   - [x] Bulk operations handling
   - [x] Progress calculation optimization

### Documentation Requirements

- [x] OpenAPI specification update with all endpoints
- [x] Postman collection regeneration
- [x] API reference documentation (PhasesAPI.md)
- [x] Control point workflow documentation
- [x] Integration guide with Sequences API

## Implementation Strategy

### Phase 1: Repository Foundation (1.5 hours)
1. Create PhaseRepository.groovy following SequenceRepository patterns
2. Implement all data access methods with DatabaseUtil
3. Add control point management methods
4. Implement progress calculation logic

### Phase 2: API Implementation (2 hours)
1. Create PhasesApi.groovy following established patterns
2. Implement lazy repository loading
3. Add all REST endpoints with proper error handling
4. Integrate hierarchical filtering

### Phase 3: Advanced Features (1.5 hours)
1. Implement ordering management (bulk and single operations)
2. Add control validation logic
3. Implement override capabilities with tracking
4. Create progress aggregation from steps
5. Add readiness checks

### Phase 4: Testing & Documentation (0.5 hours)
1. Write comprehensive unit tests
2. Create integration test suite
3. Update OpenAPI specification
4. Regenerate Postman collection

## Success Metrics

- **Code Coverage**: ≥90% unit test coverage
- **Performance**: All endpoints <200ms response time
- **Quality**: Zero critical bugs, ADR compliance
- **Documentation**: Complete API documentation with examples
- **Integration**: Seamless operation with Plans and Sequences APIs

## Risk Mitigation

- **Risk**: Complex control point validation logic
  - **Mitigation**: Start with simple MANDATORY/OPTIONAL, add CONDITIONAL later
  
- **Risk**: Performance impact of progress calculation
  - **Mitigation**: Implement caching strategy, optimize queries
  
- **Risk**: Integration complexity with existing APIs
  - **Mitigation**: Follow established patterns from US-001 and US-002

## Dependencies

- Plans API (US-001) - Complete ✅
- Sequences API (US-002) - Complete ✅
- Database schema - Existing tables ready ✅
- Status normalization (US-002c) - Can be done in parallel

## Notes

- Control points are critical for enterprise migrations where validation gates prevent costly failures
- Override capability needed for emergency situations but must be tracked for audit
- Progress calculation should be efficient as it will be called frequently by UI
- Phase ordering is crucial for execution sequence and must be maintained consistently
- Bulk reordering operations should use transactions to ensure atomicity
- Consider future enhancement for conditional control points based on runtime conditions
- Ordering logic can leverage patterns from US-002 Sequences API implementation

---

**Pattern Confidence**: Very high - can leverage proven patterns from US-001 and US-002 with 46% velocity improvement demonstrated.