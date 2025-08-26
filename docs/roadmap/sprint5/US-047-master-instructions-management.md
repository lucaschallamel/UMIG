# US-047: Master Instructions Management in Step Modals

**Story ID**: US-047  
**Title**: Master Instructions Management within Master Steps Modal Views  
**Epic**: Admin GUI Enhancement  
**Story Points**: 5  
**Priority**: Medium  
**Status**: Backlog  

## Overview

Implement comprehensive Master Instructions management capabilities within Master Steps modal views (VIEW/EDIT/CREATE). Users need the ability to manage instruction sequences directly within step modals, including adding, editing, deleting, and reordering instructions with proper team and control assignments.

## User Story

**As a** Migration Coordinator  
**I want to** manage Master Instructions directly within Master Steps modal views  
**So that I can** efficiently define and maintain instruction sequences for each step without navigating between separate interfaces  

## Business Value

- **Streamlined Workflow**: Manage instructions in context of their parent steps
- **Improved Efficiency**: Single modal for complete step configuration
- **Better UX**: Inline editing reduces navigation overhead
- **Data Integrity**: Direct parent-child relationship management
- **Order Management**: Clear visual sequence control for instructions

## Acceptance Criteria

### AC-047-01: Instructions Section in Step Modals
**Given** I am viewing a Master Step in VIEW/EDIT/CREATE modal  
**When** I scroll to the Instructions section  
**Then** I should see all associated instructions displayed in order (inm_order ASC)  
**And** each instruction should show: description, duration, assigned team, assigned control, order  

### AC-047-02: Add New Instruction
**Given** I am in EDIT or CREATE mode for a Master Step  
**When** I click "Add Instruction" button  
**Then** I should see an inline form with fields: description (required), duration (minutes), team dropdown, control dropdown, order  
**And** the team dropdown should be populated from TeamsApi  
**And** the control dropdown should be populated from ControlsApi  
**And** the order field should default to next sequence number  

### AC-047-03: Edit Existing Instructions
**Given** I am in EDIT mode for a Master Step with existing instructions  
**When** I click edit on an instruction  
**Then** I should see inline editing fields for all instruction properties  
**And** I should be able to save or cancel changes  
**And** validation should prevent empty descriptions  

### AC-047-04: Delete Instructions
**Given** I am in EDIT mode viewing instructions  
**When** I click delete on an instruction  
**Then** I should see a confirmation dialog  
**And** upon confirmation, the instruction should be removed from the list  
**And** remaining instructions should maintain proper order sequence  

### AC-047-05: Reorder Instructions
**Given** I am in EDIT mode with multiple instructions  
**When** I change the order field of an instruction  
**Then** the instruction list should re-sort automatically  
**And** I should be able to drag-and-drop instructions to reorder them  
**And** order values should update automatically to maintain sequence  

### AC-047-06: Bulk Save Operations
**Given** I have made multiple changes to instructions in a step modal  
**When** I save the step  
**Then** all instruction changes should be saved atomically  
**And** any validation errors should be displayed clearly  
**And** partial saves should not occur if any instruction has errors  

### AC-047-07: Data Integration and Validation
**Given** I am working with instructions in step modals  
**When** I select teams and controls from dropdowns  
**Then** only active teams and controls should be available  
**And** team and control names should display clearly in the instruction list  
**And** duration must be a positive integer  
**And** description cannot be empty or whitespace only  

## Technical Requirements

### Frontend Implementation

#### Modal Integration
- Extend existing Step modal components (VIEW/EDIT/CREATE)
- Add Instructions section with collapsible/expandable design
- Implement inline editing forms within modal context
- Maintain modal scroll position during instruction operations

#### Component Structure
```javascript
// StepModal extensions
- InstructionsSection component
- InstructionRow component (VIEW mode)
- InstructionEditForm component (EDIT mode)
- InstructionAddForm component
- DragDropOrderManager component
```

#### State Management
- Maintain instructions state within step modal context
- Track changes for bulk save operations
- Handle optimistic updates for reordering
- Implement undo/redo for instruction changes

#### UI/UX Requirements
- Responsive design within modal constraints
- Clear visual hierarchy for instruction sequences
- Drag-and-drop indicators and animations
- Loading states for dropdown population
- Error messaging for validation failures

### Backend Integration

#### API Enhancement
- Leverage existing InstructionsApi with potential extensions
- Implement bulk instruction operations
- Order management utilities for sequence updates
- Cascade operations when steps are deleted

#### Data Operations
```sql
-- Required operations
INSERT INTO instructions_master_inm (stm_id, inm_description, inm_duration_min, tms_id, ctm_id, inm_order)
UPDATE instructions_master_inm SET inm_description = ?, inm_duration_min = ?, tms_id = ?, ctm_id = ?, inm_order = ?
DELETE FROM instructions_master_inm WHERE inm_id = ?
SELECT * FROM instructions_master_inm WHERE stm_id = ? ORDER BY inm_order ASC
```

#### Bulk Operations
- Transaction-wrapped multiple instruction saves
- Order recalculation when instructions added/removed
- Validation aggregation across multiple instructions
- Atomic rollback on any validation failure

### Performance Considerations

#### Optimization Strategies
- Cache team and control dropdown data
- Debounce order field changes to reduce API calls
- Lazy load instruction details for steps with many instructions
- Implement virtual scrolling for large instruction lists

#### Load Time Targets
- Instructions section load: <500ms
- Dropdown population: <300ms
- Bulk save operations: <2s for 50+ instructions
- Reorder operations: <200ms response time

## Dependencies

### API Dependencies
- **TeamsApi**: Required for team dropdown population
- **ControlsApi**: Required for control assignment dropdown
- **InstructionsApi**: Core CRUD operations (may need enhancement)
- **StepsApi**: Parent relationship management

### Component Dependencies
- Existing Step modal infrastructure
- Common validation components
- Drag-and-drop utility libraries
- Form handling utilities

### Data Dependencies
- teams_tms table for team assignments
- controls_master_ctm table for control assignments
- instructions_master_inm table structure
- Foreign key relationships (stm_id, tms_id, ctm_id)

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

### Technical Risks
- **Modal Complexity**: Adding extensive functionality within modal constraints
- **Performance Impact**: Large instruction lists affecting modal responsiveness
- **State Management**: Complex state synchronization between modal and instruction data
- **Bulk Operations**: Transaction management across multiple API calls

### Mitigation Strategies
- Implement progressive disclosure for instruction management
- Use virtual scrolling and pagination for large lists
- Implement optimistic UI updates with rollback capability
- Design atomic bulk operations with proper error handling

## Definition of Done

- [ ] Instructions section implemented in all Step modal modes (VIEW/EDIT/CREATE)
- [ ] Add, edit, delete, and reorder functionality working correctly
- [ ] Team and control dropdowns populated from respective APIs
- [ ] Bulk save operations implemented with proper error handling
- [ ] Order management working with drag-and-drop support
- [ ] All validation rules implemented and tested
- [ ] Unit tests covering component functionality (>90% coverage)
- [ ] Integration tests for API interactions
- [ ] UAT scenarios validated by product owner
- [ ] Performance targets met for large instruction lists
- [ ] Documentation updated with new functionality
- [ ] Code review completed and approved

## Related Stories

- **US-031**: Admin GUI Complete Integration (foundation)
- **US-036**: StepView UI Refactoring (modal improvements)
- **US-024**: StepsAPI Refactoring (backend foundation)

## Notes

### Implementation Priority
1. Basic CRUD operations within modals
2. Team/control dropdown integration
3. Order management and reordering
4. Bulk operations and performance optimization
5. Advanced UX features (drag-and-drop, animations)

### Future Enhancements
- Instruction templates for common sequences
- Instruction duplication across steps
- Advanced filtering and search within instructions
- Instruction execution tracking integration
- Custom instruction types and categories

---

**Created**: 2025-08-26  
**Last Updated**: 2025-08-26  
**Estimated Completion**: Sprint 7-8 (Post-MVP Enhancement)  
**Dependencies**: US-031 (Admin GUI foundation)