# US-041B: PILOT Instance Entity Management

## Story Metadata

**Story ID**: US-041B  
**Epic**: Admin GUI Enhancement Suite  
**Sprint**: Sprint 7 (Weeks 3-4)  
**Priority**: P2 (Feature Enhancement)  
**Story Points**: 2-3 points  
**Status**: PENDING (Start after US-082-B completion)  
**Created**: September 10, 2025  
**Owner**: Frontend Development  
**Dependencies**: US-082-B (Component Architecture Development) - MUST BE COMPLETE  
**Risk**: LOW-MEDIUM (depends on US-082-B component architecture)

**Split From**: US-041 - Requirements analyst recommended splitting for focused implementation and proper dependency management

**Audit Compatibility**: ✅ Fully compatible with US-041A JSON-based audit logging (see archived validation document for analysis)

---

## User Story Statement

**As a** PILOT user  
**I want** advanced instance entity management capabilities through the Admin GUI  
**So that** I can efficiently manage plan instances, sequence instances, phase instances, and step instances with hierarchical filtering and bulk operations for complex cutover scenarios

### Value Statement

This story extends the Admin GUI with PILOT role capabilities for managing instance entities (the execution records as opposed to master templates). PILOT users gain sophisticated operational control over cutover execution while leveraging the component architecture established in US-082-B for maintainable, scalable implementation.

**Built on US-082-B Foundation**: Leverages the component-based architecture, reusable UI components, and service patterns established in US-082-B to deliver advanced functionality with minimal integration complexity.

---

## Acceptance Criteria

### AC-041B.1: PILOT Role Instance Entity Management

**Given** a user with PILOT role permissions and US-082-B component architecture available  
**When** accessing the Admin GUI  
**Then** provide comprehensive CRUD operations for instance entities:

- Plan Instances (pli_id based management) using reusable TableComponent
- Sequence Instances (sqi_id based management) with standardized ModalComponent
- Phase Instances (phi_id based management) leveraging FormComponent
- Step Instances (sti_id based management) with ButtonGroupComponent
  **And** implement hierarchical filtering (filter step instances by phase instance)
  **And** utilize US-082-B component event system for inter-component communication
  **And** ensure data integrity across instance-to-master relationships

### AC-041B.2: Advanced Instance Operations with Component Architecture

**Given** PILOT role access to instance entities and established component patterns  
**When** performing advanced operations  
**Then** implement instance-specific features using US-082-B components:

- Bulk status updates across multiple instances using enhanced ButtonGroupComponent
- Instance timeline management with standardized FormComponent validation
- Cross-instance dependency validation with NotificationComponent feedback
- Instance-level progress tracking using LoadingIndicatorComponent
  **And** provide visual hierarchy displays using component-based tree rendering
  **And** implement advanced filtering leveraging US-082-B FilterComponent patterns
  **And** ensure consistent user experience across all instance management operations

### AC-041B.3: Hierarchical Filtering and Navigation

**Given** the hierarchical nature of instance entities  
**When** PILOT users navigate instance relationships  
**Then** provide sophisticated hierarchical operations:

- Filter step instances by parent phase instance (phi_id)
- Filter phase instances by parent sequence instance (sqi_id)
- Filter sequence instances by parent plan instance (pli_id)
- Cross-hierarchy navigation with breadcrumb tracking
  **And** use US-082-B component state management for hierarchy context
  **And** implement efficient loading patterns for large hierarchical datasets
  **And** provide visual indicators for instance-to-master relationships

### AC-041B.4: Bulk Operations and Instance Workflows

**Given** PILOT users managing multiple instances simultaneously  
**When** performing bulk operations on instance entities  
**Then** provide efficient batch management capabilities:

- Multi-select functionality across all instance entity tables
- Bulk status updates with validation and conflict resolution
- Batch scheduling and timeline updates
- Mass assignment of teams or resources to instances
  **And** implement progress indicators using US-082-B LoadingIndicatorComponent
  **And** provide detailed operation results with NotificationComponent
  **And** ensure atomic operations with proper rollback on partial failures

### AC-041B.5: Integration with Existing Backend APIs

**Given** existing instance-based API endpoints and US-082-B service architecture  
**When** PILOT users perform instance management operations  
**Then** leverage established backend infrastructure:

- Use existing Plans API instance endpoints (pli_id operations)
- Leverage Sequences API instance endpoints (sqi_id operations)
- Utilize Phases API instance endpoints (phi_id operations)
- Integrate with Steps API instance endpoints (sti_id operations)
  **And** implement consistent error handling using US-082-B ErrorHandlingService
  **And** maintain existing API response time standards (<3s)
  **And** ensure proper authentication context with UserService integration

---

## Technical Requirements

### Component Architecture Dependencies (US-082-B)

**Required Components from US-082-B**

- **TableComponent**: Paginated, sortable tables for instance entity lists
- **ModalComponent**: Standardized dialogs for instance creation/editing
- **FormComponent**: Validated forms with data binding for instance fields
- **ButtonGroupComponent**: Consistent action buttons for bulk operations
- **NotificationComponent**: User feedback for operations and validation
- **LoadingIndicatorComponent**: Async operation progress indicators

**Required Services from US-082-B**

- **ConfigurationService**: Centralized settings for instance entity configurations
- **EventBus**: Component communication for hierarchy updates
- **ErrorHandlingService**: Centralized error management and user feedback
- **UrlService**: Consistent URL construction for instance API endpoints

### Frontend Implementation Architecture

**Instance Entity Management Components**

```javascript
// Extends US-082-B component architecture
class InstanceEntityManager {
  constructor(entityType) {
    this.entityType = entityType; // 'plans', 'sequences', 'phases', 'steps'
    this.tableComponent = new TableComponent({
      entityConfig: InstanceEntityConfigs[entityType],
      apiEndpoint: `/rest/scriptrunner/latest/custom/${entityType}`,
      enableBulkOperations: true,
      hierarchicalFiltering: true,
    });
    this.modalComponent = new ModalComponent();
    this.formComponent = new FormComponent();
    this.initializeComponents();
  }

  initializeComponents() {
    // Leverage US-082-B component patterns
    // Implement hierarchical filtering logic
    // Setup bulk operation workflows
  }
}

// Instance-specific entity configurations
const InstanceEntityConfigs = {
  plans: {
    idField: "pli_id",
    displayField: "pli_name",
    hierarchicalFilter: "iterationId",
    bulkOperations: ["updateStatus", "assignTeam", "scheduleTimeline"],
  },
  sequences: {
    idField: "sqi_id",
    displayField: "sqi_name",
    hierarchicalFilter: "planInstanceId",
    bulkOperations: ["updateStatus", "assignTeam", "updateDependencies"],
  },
  phases: {
    idField: "phi_id",
    displayField: "phi_name",
    hierarchicalFilter: "sequenceInstanceId",
    bulkOperations: ["updateStatus", "assignOwner", "updateTimeline"],
  },
  steps: {
    idField: "sti_id",
    displayField: "sti_name",
    hierarchicalFilter: "phaseInstanceId",
    bulkOperations: ["updateStatus", "assignExecutor", "updateProgress"],
  },
};
```

**Hierarchical Filtering Implementation**

```javascript
class HierarchicalFilterManager {
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.filterState = new Map();
    this.initializeHierarchicalFilters();
  }

  initializeHierarchicalFilters() {
    // Setup cascading filter relationships
    // Implement breadcrumb navigation
    // Handle filter state management
    // Use US-082-B EventBus for component communication
  }

  applyHierarchicalFilter(parentType, parentId, childEntityManager) {
    // Filter child instances by parent instance ID
    // Update UI components through EventBus
    // Maintain filter breadcrumb trail
  }
}
```

### PILOT Role Configuration

**Role-Based Access Control**

- Extend existing RBAC patterns to include instance-level permissions
- PILOT role configuration for instance entity access
- Permission validation for bulk operations
- Audit logging integration for PILOT actions (leverages US-041A JSON-based audit with hierarchy tracking)

**UI Component Role Integration**

```javascript
// Role-based component visibility and functionality
class PilotRoleManager {
  constructor(userService) {
    this.userService = userService;
    this.pilotCapabilities = [
      "instance.create",
      "instance.update",
      "instance.delete",
      "instance.bulk_update",
      "instance.assign_team",
      "instance.schedule_timeline",
    ];
  }

  configurePilotInterface(componentManager) {
    if (this.userService.hasRole("PILOT")) {
      // Enable advanced instance management features
      // Show bulk operation buttons
      // Allow hierarchical navigation
    }
  }
}
```

---

## Implementation Approach

### Phase 1: Component Integration Setup (0.5 points)

- Verify US-082-B component architecture availability
- Configure instance entity specifications using established patterns
- Setup PILOT role validation and permissions
- Initialize EventBus communication for hierarchical operations

### Phase 2: Instance Entity CRUD Operations (1 point)

- Implement Plan Instance management using TableComponent/ModalComponent
- Develop Sequence Instance operations with FormComponent validation
- Create Phase Instance management with hierarchical filtering
- Build Step Instance operations with bulk operation capabilities

### Phase 3: Advanced Features and Integration (1-1.5 points)

- Implement hierarchical filtering across all instance types
- Develop bulk operations with progress indicators and error handling
- Add cross-instance dependency validation and timeline management
- Complete integration testing with existing API endpoints

---

## Definition of Done

- [ ] All instance entity CRUD operations implemented using US-082-B components
- [ ] Hierarchical filtering functional for all parent-child relationships
- [ ] Bulk operations working with proper validation and rollback
- [ ] PILOT role permissions validated for all instance management operations
- [ ] Integration with existing API endpoints maintaining <3s response times
- [ ] Component-based UI consistent with US-082-B architecture patterns
- [ ] Cross-instance dependency validation working correctly
- [ ] Progress indicators and error handling functional for all operations
- [ ] 90%+ test coverage for all new instance management functionality
- [ ] Performance benchmarks met for large hierarchical datasets
- [ ] User documentation updated for PILOT role capabilities
- [ ] Security review completed for advanced instance management features

---

## Dependencies and Constraints

### Hard Dependencies

- **US-082-B 100% Complete**: Component architecture must be fully implemented
  - TableComponent, ModalComponent, FormComponent available
  - EventBus, ConfigurationService, ErrorHandlingService functional
  - Component patterns established and documented
- **Existing Instance APIs**: Plan, Sequence, Phase, Step instance endpoints available
- **Authentication Resolution**: PILOT role validation working correctly

### Technical Constraints

- **Component Architecture**: Must use US-082-B patterns and components
- **Performance**: Maintain existing response times for instance operations
- **API Compatibility**: Zero breaking changes to existing instance API contracts
- **UI Consistency**: Follow US-082-B design patterns and user experience

### Business Constraints

- **User Experience**: PILOT features must not complicate ADMIN user workflows
- **Training**: Enhanced instance management may require PILOT user training
- **Data Integrity**: Instance-to-master relationships must remain intact

---

## Success Metrics

- **PILOT User Productivity**: 40% reduction in time for instance management tasks
- **Component Reuse**: 70%+ functionality using US-082-B established components
- **Hierarchical Navigation**: 100% accurate parent-child filtering relationships
- **Bulk Operation Efficiency**: 80% time savings for multi-instance operations
- **System Integration**: Zero breaking changes to existing instance workflows
- **User Adoption**: 85%+ PILOT user satisfaction with advanced features

---

## Risks and Mitigation

### Technical Risks

- **US-082-B Dependency**: Component architecture delays impact this story
  - _Mitigation_: Close coordination with US-082-B implementation, parallel preparation work
- **Component Integration**: Complex integration with hierarchical data structures
  - _Mitigation_: Leverage established patterns, comprehensive integration testing
- **Performance Impact**: Hierarchical filtering may slow large datasets
  - _Mitigation_: Implement efficient loading patterns, pagination, caching strategies

### Business Risks

- **Feature Complexity**: Advanced features may overwhelm basic PILOT users
  - _Mitigation_: Progressive disclosure, contextual help, role-based UI adaptation
- **Training Requirements**: Instance management complexity may require extensive training
  - _Mitigation_: Comprehensive documentation, intuitive UI patterns, user guides

---

## Testing Strategy

### Component Integration Testing

- Verify US-082-B component functionality with instance entity data
- Test EventBus communication for hierarchical filtering operations
- Validate form components with instance entity validation rules
- Test modal components with instance creation/editing workflows

### Hierarchical Operations Testing

- Test parent-child filtering across all instance entity relationships
- Verify breadcrumb navigation and filter state management
- Test cross-hierarchy navigation with large datasets
- Validate hierarchical data loading and performance

### Bulk Operations Testing

- Test multi-select functionality across different instance entity types
- Verify bulk status updates with conflict resolution
- Test atomic operations with proper rollback on failures
- Validate progress indicators and user feedback for long-running operations

### Performance Testing

- Test hierarchical filtering with large instance datasets (1000+ records)
- Verify bulk operations performance with multiple selections
- Test component loading times with complex hierarchical structures
- Validate API response times under PILOT user load

---

## Implementation Notes

### Development Strategy

**Component-First Approach**

1. Verify and configure US-082-B component availability
2. Implement instance entity configurations for each entity type
3. Build hierarchical filtering using EventBus patterns
4. Add bulk operations with proper validation and feedback

**API Integration Strategy**

1. Leverage existing instance-based API endpoints
2. Use established repository patterns for data access
3. Maintain existing error handling and response patterns
4. Implement consistent authentication context

**Testing Strategy**

1. Unit testing for component integration and configuration
2. Integration testing with US-082-B components
3. End-to-end testing for hierarchical workflows
4. Performance testing with realistic data volumes

### Code Patterns to Follow

- **Component Architecture**: Mandatory use of US-082-B component patterns
- **EventBus Communication**: Component interaction through established EventBus
- **Configuration Management**: Use ConfigurationService for entity specifications
- **Error Handling**: Leverage ErrorHandlingService for consistent user feedback
- **API Patterns**: Follow existing instance API patterns and conventions

### Performance Considerations

- **Component Reuse**: Leverage US-082-B components for consistent performance
- **Hierarchical Loading**: Implement lazy loading for large hierarchical datasets
- **Bulk Operations**: Use efficient batch processing patterns
- **State Management**: Optimize component state for hierarchical navigation

---

## Related Documentation

- **US-082-B Component Architecture**: Required foundation for this implementation
- **US-041A Audit Logging**: JSON-based audit infrastructure with full PILOT instance support
- **Audit JSON Schema**: See US-041A for hierarchy structure in `aud_details -> entitySpecific -> hierarchy`
- **Instance API Documentation**: Plans, Sequences, Phases, Steps instance endpoints
- **RBAC Patterns**: ADR-042 authentication context and role validation
- **Admin GUI Architecture**: Established patterns from US-031
- **Database Schema**: Instance entity relationships and filtering patterns
- **Archived Validation**: `US-041B-VALIDATION-pilot-instance-management.ARCHIVED.md` for compatibility analysis

---

## Story Breakdown

### Sub-tasks

1. **Component Integration Setup** (0.5 points)
   - Configure instance entity specifications using US-082-B patterns
   - Setup PILOT role validation and permissions
   - Initialize component communication patterns

2. **Instance Entity CRUD Implementation** (1 point)
   - Implement Plan Instance management with TableComponent
   - Develop Sequence Instance operations with ModalComponent
   - Create Phase Instance management with FormComponent
   - Build Step Instance operations with validation

3. **Advanced Features and Testing** (1-1.5 points)
   - Implement hierarchical filtering across all entity types
   - Develop bulk operations with progress indicators
   - Complete integration testing and performance validation
   - Add user documentation and training materials

### Critical Path Dependencies

- Cannot start until US-082-B Component Architecture is 100% complete
- Component availability blocks all development work
- Integration testing requires functional US-082-B components

---

## Change Log

| Date       | Version | Changes                                                       | Author |
| ---------- | ------- | ------------------------------------------------------------- | ------ |
| 2025-10-08 | 1.2     | Added audit compatibility notes and JSON hierarchy references | System |
| 2025-09-10 | 1.1     | Added detailed US-082-B dependency and component usage        | System |
| 2025-09-10 | 1.0     | Initial story creation from US-041 split                      | System |

---

**Story Status**: Pending (US-082-B Dependency)  
**Next Action**: Monitor US-082-B completion in weeks 3-4 of Sprint 7  
**Risk Level**: Low-Medium (depends on US-082-B component stability)  
**Strategic Priority**: Medium (PILOT user enhancement with proven component foundation)  
**Integration**: Requires US-082-B completion, can run parallel with US-041A
