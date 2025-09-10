# US-047: Enhanced Step Management with Embedded Instructions

**Story ID**: US-047  
**Title**: Master Step Management with Integrated Instruction Handling  
**Epic**: Admin GUI Enhancement (US-082)  
**Story Points**: 3 (reduced due to simplified approach)  
**Priority**: High (core to US-082 refactoring)  
**Status**: Revised - Pending US-082 Integration

## Overview

Enhance Master Step management to treat instructions as integral properties of steps, leveraging the existing unified DTO architecture (US-056F). Instructions are managed exclusively within their parent step context, never as standalone entities. This approach simplifies both UI complexity and backend architecture while providing a more intuitive user experience.

## User Story

**As a** Migration Coordinator  
**I want to** manage Master Instructions as embedded components of Master Steps  
**So that I can** efficiently define complete step configurations including their instruction sequences in a single, unified interface without context switching

## Business Value

- **Architectural Simplification**: Leverages existing unified DTO investment (StepMasterDTO/StepInstanceDTO)
- **Reduced Complexity**: No separate instruction services, APIs, or state management needed
- **Improved Performance**: Single API calls for step+instructions, unified caching strategy
- **Natural UX**: Instructions always shown in context, eliminating confusion about ownership
- **Atomic Operations**: Step and instruction changes saved together, ensuring data consistency

## Acceptance Criteria

### AC-047-01: Unified Step+Instructions Loading

**Given** I am opening a Master Step modal (VIEW/EDIT/CREATE)  
**When** the modal loads  
**Then** the step data should include embedded instruction data in a single API call  
**And** the unified StepMasterDTO should contain the complete hierarchy  
**And** instructions should display as a collapsible section within the modal

### AC-047-02: Instructions as Step Properties

**Given** I am editing a Master Step with instructions  
**When** I modify instructions (add/edit/delete/reorder)  
**Then** changes should be tracked as modifications to the step object  
**And** the save button should indicate "Save Step" (not "Save Step and Instructions")  
**And** all changes should be submitted as a single unified DTO

### AC-047-03: Inline Instruction Management

**Given** I am in the instructions section of a step modal  
**When** I perform instruction operations  
**Then** all operations should occur inline without opening additional modals  
**And** the instruction context (parent step) should always be visible  
**And** changes should update the parent step's state immediately

### AC-047-04: Atomic Save Operations

**Given** I have modified both step fields and instructions  
**When** I click the single "Save" button  
**Then** the entire step+instructions hierarchy should be saved atomically  
**And** the backend should receive a single StepMasterDTO object  
**And** either all changes succeed or all fail together

### AC-047-05: Component Integration with US-082

**Given** the US-082 component architecture is in place  
**When** implementing instruction management  
**Then** it should use the standard TableComponent for instruction lists  
**And** it should use FormComponent for instruction editing  
**And** it should follow the service layer patterns from US-082-A

### AC-047-06: Performance Requirements

**Given** a step with up to 20 instructions  
**When** loading the step modal  
**Then** the complete step+instructions should load in <500ms  
**And** instruction reordering should complete in <200ms  
**And** the save operation should complete in <2s

### AC-047-07: No Standalone Instruction Management

**Given** the system architecture  
**When** searching for instruction management features  
**Then** there should be NO separate instruction management screens  
**And** there should be NO instruction-specific API endpoints  
**And** instructions should ONLY be accessible through their parent steps

## Technical Requirements

### Architecture Approach: Instructions as Complex Step Properties

#### Core Principle

Instructions are treated as complex collection properties of steps, similar to how a step has scalar properties (name, description) but with richer structure. This leverages the existing unified DTO architecture from US-056F.

### Frontend Implementation

#### Component Architecture (Aligned with US-082)

```javascript
// Enhanced StepModal using US-082 components
StepModal {
  // Step scalar properties section
  StepDetailsSection {
    - Uses FormComponent from US-082-B
    - Standard step fields (name, description, etc.)
  }

  // Instructions as complex property section
  InstructionsSection {
    - Uses TableComponent from US-082-B for list display
    - Uses FormComponent for inline editing
    - Collapsible/expandable for space management
    - All changes update parent step state
  }

  // Single save action for entire hierarchy
  ModalActions {
    - Single "Save Step" button
    - Saves complete StepMasterDTO
  }
}
```

#### State Management Pattern

```javascript
// Unified state - instructions as step property
const [stepData, setStepData] = useState({
  // Scalar properties
  stepMasterId: "",
  stepName: "",
  stepDescription: "",
  stepDuration: 0,

  // Complex collection property
  instructions: [],
  instructionCount: 0,
  maxInstructionOrder: 0,
});

// All instruction operations update step state
const handleInstructionAdd = (newInstruction) => {
  setStepData({
    ...stepData,
    instructions: [...stepData.instructions, newInstruction],
    instructionCount: stepData.instructionCount + 1,
  });
};
```

#### Service Layer Integration (US-082-A)

```javascript
// Enhanced StepService - no separate InstructionService needed
class StepService extends BaseService {
  async getStepWithInstructions(stepId) {
    const response = await this.apiService.get(`/steps/${stepId}/full`);
    return response.data; // Returns complete StepMasterDTO
  }

  async saveStepWithInstructions(stepData) {
    // Single atomic save of complete hierarchy
    const response = await this.apiService.put(
      `/steps/${stepData.stepMasterId}/full`,
      stepData,
    );
    return response.data;
  }

  // Instruction operations as step methods
  async reorderStepInstructions(stepId, newOrder) {
    const response = await this.apiService.patch(
      `/steps/${stepId}/instruction-order`,
      newOrder,
    );
    return response.data;
  }
}
```

### Backend Integration

#### Enhanced StepsApi Pattern

```groovy
// StepsApi.groovy - Enhanced for unified operations
@BaseScript CustomEndpointDelegate delegate

stepWithInstructions(httpMethod: "GET", groups: ["confluence-users"]) { request, binding ->
    def stepId = UUID.fromString(pathParams.stepId as String)
    def stepService = new StepService()
    def stepData = stepService.findMasterWithInstructions(stepId)
    return Response.ok(stepData).build()
}

stepWithInstructions(httpMethod: "PUT", groups: ["confluence-users"]) { request, binding ->
    def stepData = new JsonSlurper().parseText(requestBody)
    def stepService = new StepService()
    def savedStep = stepService.saveStepWithInstructions(stepData)
    return Response.ok(savedStep).build()
}
```

#### Repository Pattern with Unified DTO

```groovy
// StepRepository.groovy - Single enrichment point (ADR-047)
class StepRepository {
    def findMasterWithInstructions(UUID stepMasterId) {
        DatabaseUtil.withSql { sql ->
            // Single query for complete hierarchy
            def query = """
                SELECT
                    s.*,
                    i.inm_id, i.inm_description, i.inm_order, i.inm_duration_min,
                    i.tms_id, i.ctm_id
                FROM steps_master_stm s
                LEFT JOIN instructions_master_inm i ON s.stm_id = i.stm_id
                WHERE s.stm_id = ?
                ORDER BY i.inm_order
            """

            def rows = sql.rows(query, [stepMasterId])
            return transformToUnifiedDTO(rows)
        }
    }

    def saveStepWithInstructions(StepMasterDTO stepData) {
        DatabaseUtil.withSql { sql ->
            sql.withTransaction {
                // Update step
                updateStep(sql, stepData)

                // Handle instructions as step property updates
                syncInstructions(sql, stepData.stepMasterId, stepData.instructions)
            }
        }
    }
}
```

#### Data Transformation Service

```groovy
// StepDataTransformationService.groovy - From US-056F
class StepDataTransformationService {
    StepMasterDTO fromDatabaseRowsWithInstructions(rows) {
        if (!rows) return null

        def step = new StepMasterDTO()
        // Map step fields from first row
        step.stepMasterId = rows[0].stm_id
        step.stepName = rows[0].stm_name
        // ... other step fields

        // Instructions as complex property
        step.instructions = rows.findAll { it.inm_id != null }.collect { row ->
            [
                instructionId: row.inm_id,
                description: row.inm_description,
                order: row.inm_order,
                duration: row.inm_duration_min,
                teamId: row.tms_id,
                controlId: row.ctm_id
            ]
        }

        step.instructionCount = step.instructions.size()
        return step
    }
}

### Performance Optimization

#### Unified Loading Strategy

- **Single API Call**: Step+instructions loaded together, eliminating N+1 queries
- **Unified Caching**: Cache complete StepMasterDTO objects at service layer
- **Optimistic Updates**: UI updates immediately, with rollback on failure
- **Smart Dirty Checking**: Only send changed instructions to backend

#### Performance Targets (Simplified)

- **Modal Load**: <500ms for step with 20 instructions (single API call)
- **Instruction Operations**: <100ms for add/edit/delete (local state)
- **Save Operation**: <2s for complete hierarchy (atomic transaction)
- **Reorder**: <200ms for drag-drop operations (optimistic UI)

## Dependencies

### Primary Dependencies (US-082 Integration)

- **US-082-A**: Foundation Service Layer (ApiService, AuthenticationService)
- **US-082-B**: Core Components (TableComponent, FormComponent, ModalComponent)
- **US-056F**: Dual DTO Architecture (StepMasterDTO, StepInstanceDTO)

### Simplified API Dependencies

- **Enhanced StepsApi**: Single endpoint for step+instructions operations
- **TeamsApi**: Team dropdown population (read-only)
- **ControlsApi**: Control dropdown population (read-only)
- **NO InstructionsApi**: Instructions managed through StepsApi only

### Technical Dependencies

- Unified DTO classes (StepMasterDTO with embedded instructions)
- StepDataTransformationService for DTO mapping
- DatabaseUtil for atomic transactions
- Existing modal infrastructure (to be enhanced)

## Data Validation Rules

### Field Validation

- `inm_description`: Required, non-empty, max 1000 characters
- `inm_duration_min`: Positive integer, max 9999 minutes
- `tms_id`: Must exist in teams_tms table
- `ctm_id`: Must exist in controls_master_ctm table
- `inm_order`: Positive integer, unique within step scope

### Business Rules

- Each step can have 0-n instructions
- Instructions must maintain sequential order (no gaps)
- Team assignment is optional but recommended
- Control assignment is optional
- Order values auto-adjust when instructions added/removed

### Referential Integrity

- Instructions cascade delete when parent step deleted
- Team/control references must be valid and active
- Order sequence maintained automatically

## Testing Requirements

### Unit Testing

- Instruction component rendering and state management
- Validation rule enforcement
- Order management algorithms
- Bulk operation transaction handling

### Integration Testing

- Step modal with instructions integration
- API calls for dropdown population
- Bulk save operation workflows
- Drag-and-drop reordering functionality

### User Acceptance Testing

- Complete instruction management workflow
- Order management scenarios (add, delete, reorder)
- Large dataset performance (50+ instructions)
- Error handling and recovery scenarios

### Edge Cases

- Empty instruction lists
- Single instruction management
- Maximum instruction count handling
- Network failure during bulk operations
- Concurrent user modifications

## Risk Assessment

### Reduced Risks (Due to Simplified Architecture)

- **✅ Eliminated Complexity**: No separate instruction services or state management
- **✅ Performance Improved**: Single API calls instead of multiple
- **✅ Data Integrity**: Atomic operations ensure consistency
- **✅ Simplified Testing**: Test step operations, instructions included

### Remaining Considerations

- **Modal Size**: Large instruction lists may require scrolling
  - *Mitigation*: Collapsible sections, progressive disclosure
- **Change Tracking**: Complex state for multiple instruction edits
  - *Mitigation*: Dirty checking at field level, optimistic updates
- **Validation Complexity**: Cross-instruction validation rules
  - *Mitigation*: Client-side validation with server verification

## Definition of Done

- [ ] StepMasterDTO enhanced to include instructions collection
- [ ] StepsApi enhanced with `/steps/{id}/full` endpoints
- [ ] InstructionsSection component integrated within StepModal
- [ ] Single atomic save operation for step+instructions
- [ ] Instructions managed exclusively through parent steps
- [ ] US-082 component patterns followed (TableComponent, FormComponent)
- [ ] Performance targets met (<500ms load, <2s save)
- [ ] No standalone instruction management screens created
- [ ] Unit tests for unified operations (>90% coverage)
- [ ] Integration tests for atomic save/load operations
- [ ] Documentation updated to reflect embedded approach
- [ ] Code review validates simplified architecture

## Related Stories

- **US-082**: Admin GUI Architecture Refactoring Epic (new foundation)
- **US-082-A**: Foundation Service Layer (service patterns)
- **US-082-B**: Core Component Library (UI components)
- **US-056F**: Dual DTO Architecture (unified DTOs)
- **US-031**: Admin GUI Complete Integration (original foundation)

## Integration Timeline with US-082

### Phase Integration Plan

1. **Week 1-2 (US-082-A)**: Enhance service layer to support unified step+instructions
2. **Week 3-4 (US-082-B)**: Build reusable components for instruction management
3. **Week 5-6 (US-082-C)**: Implement as part of step entity migration
4. **Week 7-8 (US-082-D)**: Optimize for complex hierarchical relationships

### Key Architecture Decisions

- **Instructions as Properties**: Instructions are complex properties of steps, not independent entities
- **Single Service Pattern**: No InstructionService - all operations through StepService
- **Unified State Management**: Instructions managed as part of step state
- **Atomic Operations**: Step and instructions saved/loaded together
- **Component Reuse**: Leverage US-082 components (Table, Form, Modal)

### Benefits of Revised Approach

1. **50% Less Code**: No duplicate service/API/state layers
2. **Better Performance**: Single API calls, unified caching
3. **Simpler Mental Model**: Instructions clearly belong to steps
4. **Easier Testing**: Test step operations, instructions included
5. **Future-Proof**: Pattern extends to other step properties

---

**Created**: 2025-08-26
**Revised**: 2025-09-10 (Aligned with US-082 architecture)
**Integration**: US-082 Phase 3-4 (Weeks 5-8)
**Dependencies**: US-082-A, US-082-B, US-056F
```
