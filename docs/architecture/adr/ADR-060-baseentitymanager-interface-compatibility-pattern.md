# ADR-060: BaseEntityManager Interface Compatibility Pattern

## Status

**Status**: Accepted
**Date**: 2025-09-18
**Author**: Development Team
**Technical Story**: TD-004 - Architectural Interface Mismatches Resolution
**Related Journals**: 20250918-01.md

## Context

During US-087 Teams Component Migration, we discovered fundamental architectural interface mismatches between BaseEntityManager (US-087) and ComponentOrchestrator/Components (US-082-B). This created a critical conflict between two architectural philosophies:

### The Interface Mismatch Problem

Every integration attempt followed the same error pattern:

```
BaseEntityManager expects → Component method that doesn't exist
```

Specific examples of interface mismatches:

- `TypeError: this.orchestrator.render is not a function`
- `TypeError: this.tableComponent.updateData is not a function`
- `PaginationComponent missing updatePagination method`
- `GET /users/current 404 (Not Found)` - wrong API path configuration

### Conflicting Architectural Philosophies

#### US-082-B Component Architecture (September 10, 2025)

- **Philosophy**: Self-managing components
- **Pattern**: Components handle their own rendering and state management
- **Orchestrator Role**: Coordination and communication, not control
- **Implementation**: 62KB enterprise-secure system (8.5/10 security rating)
- **Interface**: `setState()` pattern with automatic re-rendering

#### US-087 EntityManager Pattern (Current Sprint)

- **Philosophy**: Orchestrated control
- **Pattern**: BaseEntityManager controls component rendering
- **Manager Role**: Direct manipulation of component methods
- **Interface Expectations**: Assumes methods like `render()`, `updatePagination()`, `updateData()`

## Decision

We will **modify BaseEntityManager to adapt to the established component architecture** rather than adding bridge methods to stable components.

### Rationale

1. **Preserve Proven Architecture**: Components have 8.5/10 security rating and proven stability
2. **Maintain Single Pattern**: Self-managing components philosophy is consistent
3. **Avoid Technical Debt**: No layering fixes on stable foundation
4. **Component Purity**: Keep components focused and simple
5. **Architecture Consistency**: One unified approach across the system

### Implementation Strategy

**BaseEntityManager must adapt to component contracts, not vice versa**

## Consequences

### Positive

- **Preserved Component Architecture**: 8.5/10 security rating maintained
- **Eliminated Interface Mismatches**: All TypeError exceptions resolved
- **Architecture Consistency**: Single self-managing component pattern
- **Reduced Complexity**: No bridge methods or compatibility layers needed
- **Faster Integration**: Components work as designed without modification
- **Future Compatibility**: New entity managers follow established patterns

### Negative

- **BaseEntityManager Refactoring**: Required updating entity manager interfaces
- **Learning Curve**: Developers must understand component self-management
- **Pattern Adjustment**: Entity managers must use setState() instead of direct control

## Implementation Details

### Interface Compatibility Matrix

#### ComponentOrchestrator Interface

**BaseEntityManager Expected**:

```javascript
await this.orchestrator.render(); // ❌ Doesn't exist
```

**Actual ComponentOrchestrator Interface**:

```javascript
// No render() method - components self-render
// Provides: registerComponent(), getComponent(), emit(), on()
```

**Solution**: Remove orchestrator.render() calls, components self-render on state changes

#### PaginationComponent Interface

**BaseEntityManager Expected**:

```javascript
await this.paginationComponent.updatePagination(data); // ❌ Doesn't exist
```

**Actual PaginationComponent Interface**:

```javascript
this.setState(data); // ✅ Triggers automatic re-render
this.render(); // ✅ Self-renders
```

**Solution**: Use setState() pattern instead of updatePagination()

#### TableComponent Interface

**BaseEntityManager Expected**:

```javascript
await this.tableComponent.updateData(data); // ❌ Doesn't exist
```

**Actual TableComponent Interface**:

```javascript
this.setState({ data: data }); // ✅ Updates state and re-renders
```

**Solution**: Use setState() with data property

### API Configuration Fixes

**BaseEntityManager/TeamsEntityManager Used**:

```javascript
"/users/current"; // ❌ Relative path fails in ScriptRunner
```

**Corrected Pattern**:

```javascript
"/rest/scriptrunner/latest/custom/users/current"; // ✅ Full ScriptRunner path
```

### Fixed Implementation Pattern

```javascript
class TeamsEntityManager extends BaseEntityManager {
  async loadData() {
    // OLD (Broken):
    // await this.orchestrator.render();
    // await this.paginationComponent.updatePagination(data);

    // NEW (Compatible):
    const data = await this.fetchTeams();

    // Use component setState() pattern
    this.tableComponent.setState({ data: data.items });
    this.paginationComponent.setState({
      currentPage: data.currentPage,
      totalPages: data.totalPages,
      totalItems: data.totalItems,
    });

    // Components self-render automatically
  }
}
```

### BaseEntityManager Interface Requirements

All entity managers must follow these patterns:

1. **Component State Management**: Use `component.setState()` pattern
2. **No Direct Rendering**: Components handle their own rendering
3. **API Paths**: Use full ScriptRunner REST paths
4. **Event Communication**: Use ComponentOrchestrator event system
5. **Error Handling**: Components manage their own error states

## Related ADRs

- **ADR-054**: Enterprise Component Security Architecture Pattern - Component security foundations
- **ADR-057**: JavaScript Module Loading Anti-Pattern - Component loading patterns
- **ADR-058**: Global SecurityUtils Access Pattern - Component dependency patterns
- **US-082-B**: Component Architecture Implementation - Self-managing component philosophy

## Validation

Success criteria for this decision:

- ✅ Zero TypeError exceptions for missing methods
- ✅ All entity managers use setState() pattern
- ✅ Components maintain 8.5/10+ security rating
- ✅ BaseEntityManager interface compliance achieved
- ✅ Teams Component Migration unblocked
- ✅ No regression in component functionality

## Implementation Examples

### Correct Pattern (Component-Compatible)

```javascript
class ApplicationsEntityManager extends BaseEntityManager {
  async handleSearch(searchTerm) {
    // Validate input using SecurityUtils
    const validated = window.SecurityUtils.validateInput(searchTerm);

    if (!validated.isValid) {
      // Let component handle error state
      this.tableComponent.setState({
        error: validated.error,
        loading: false,
      });
      return;
    }

    // Fetch data
    const results = await this.searchApplications(validated.data);

    // Update component state - component will re-render automatically
    this.tableComponent.setState({
      data: results,
      loading: false,
      error: null,
    });

    // Update filter component if needed
    this.filterComponent.setState({
      activeSearch: searchTerm,
    });
  }
}
```

### Anti-Pattern (Incompatible)

```javascript
class ApplicationsEntityManager extends BaseEntityManager {
  async handleSearch(searchTerm) {
    // ANTI-PATTERN: Trying to control component rendering
    await this.orchestrator.render(); // ❌ Method doesn't exist
    await this.tableComponent.updateData(results); // ❌ Method doesn't exist
    await this.paginationComponent.updatePagination(page); // ❌ Method doesn't exist

    // ANTI-PATTERN: Direct DOM manipulation instead of component state
    this.tableComponent.element.innerHTML = html; // ❌ Bypasses component
  }
}
```

### Component Communication Pattern

```javascript
class BaseEntityManager {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;

    // Listen for component events
    this.orchestrator.on("filter-changed", this.handleFilterChange.bind(this));
    this.orchestrator.on("page-changed", this.handlePageChange.bind(this));
  }

  async handleFilterChange(filterData) {
    // Process filter
    const results = await this.applyFilter(filterData);

    // Update table component state
    this.tableComponent.setState({
      data: results,
      loading: false,
    });
  }

  notifyComponents(event, data) {
    // Emit events for inter-component communication
    this.orchestrator.emit(event, data);
  }
}
```

## Security Considerations

### Maintained Security Standards

- **Component Security**: 8.5/10 security rating preserved through interface adaptation
- **Input Validation**: All entity managers use SecurityUtils for validation
- **State Sanitization**: Component setState() includes sanitization
- **Error Handling**: Secure error state management through component interfaces

### Security Pattern Compliance

```javascript
class SecureEntityManager extends BaseEntityManager {
  async processUserInput(input) {
    // Security validation first
    const validated = window.SecurityUtils.validateInput(input);

    if (!validated.isValid) {
      // Secure error state through component
      this.setState({
        error: "Invalid input detected",
        data: null,
      });
      return;
    }

    // Process validated data
    const sanitized = window.SecurityUtils.sanitizeData(validated.data);

    // Update component with clean data
    this.tableComponent.setState({
      data: sanitized,
      error: null,
    });
  }
}
```

## Lessons Learned

1. **Interface Contracts Must Be Explicit**: Implicit assumptions about component interfaces lead to integration failures
2. **Preserve Proven Architecture**: Stable, high-security components should not be modified for integration
3. **Adapter Pattern**: Managers should adapt to component interfaces, not vice versa
4. **Self-Managing Philosophy**: Components handling their own lifecycle reduces complexity
5. **Security Through Architecture**: Maintaining component architecture preserves security boundaries

## Amendment History

- **2025-09-18**: Initial ADR creation based on TD-004 interface mismatch resolution
