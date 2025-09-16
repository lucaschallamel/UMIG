# Component Architecture API Documentation

**US-082-B Component Architecture Development**

This document provides comprehensive usage examples and guides for the UMIG Admin GUI component architecture, including the ComponentOrchestrator, BaseComponent pattern, and all specialized components.

## Table of Contents

1. [Overview](#overview)
2. [ComponentOrchestrator](#componentorchestrator)
3. [BaseComponent Pattern](#basecomponent-pattern)
4. [Component Library](#component-library)
5. [Integration Patterns](#integration-patterns)
6. [Security Architecture](#security-architecture)
7. [Best Practices](#best-practices)
8. [Examples](#examples)
9. [Testing](#testing)

## Overview

The UMIG Admin GUI component architecture is built around a centralized event bus system (ComponentOrchestrator) that manages component lifecycle, communication, and state synchronization. All components inherit from BaseComponent and follow consistent patterns for initialization, rendering, and destruction.

### Architecture Principles

- **Event-Driven Communication**: Components communicate through events via the ComponentOrchestrator
- **Dependency Management**: Components can declare dependencies on other components
- **State Management**: Global state is managed centrally with immutable updates
- **Error Isolation**: Component failures are isolated and don't affect other components
- **Performance Monitoring**: Built-in metrics and performance tracking
- **Accessibility**: WCAG AA compliance throughout all components

## ComponentOrchestrator

The ComponentOrchestrator is the central coordination system that manages all components and their interactions.

### Basic Usage

```javascript
// Initialize the orchestrator
const orchestrator = new ComponentOrchestrator({
  debug: false,
  maxQueueSize: 100,
  enableReplay: true,
  stateHistory: 10,
  performanceMonitoring: true,
  errorIsolation: true,
});

// Register components
orchestrator.registerComponent("userTable", userTableComponent);
orchestrator.registerComponent("userFilter", userFilterComponent, [
  "userTable",
]);
orchestrator.registerComponent("userModal", userModalComponent);

// Initialize all components
orchestrator.initializeComponents();
```

### Event Bus API

#### Subscribing to Events

```javascript
// Subscribe to specific events
const subscriptionId = orchestrator.on("table:rowSelected", (data, event) => {
  console.log("Row selected:", data.rowId);
});

// Subscribe to all events from a component
orchestrator.on("table:*", (data, event) => {
  console.log("Table event:", event.name, data);
});

// Subscribe to all events (wildcard)
orchestrator.on("*", (data, event) => {
  console.log("Any event:", event.name);
});

// Unsubscribe
orchestrator.off("table:rowSelected", subscriptionId);
```

#### Emitting Events

```javascript
// Emit simple event
orchestrator.emit("user:created", {
  id: 123,
  name: "John Doe",
});

// Emit with options
orchestrator.emit(
  "data:processing",
  { status: "started" },
  {
    priority: "high",
    queued: false,
    source: "dataService",
  },
);

// Queue event for later processing
orchestrator.emit("batch:update", { items: [1, 2, 3] }, { queued: true });
```

### State Management API

#### Setting and Getting State

```javascript
// Set nested state
orchestrator.setState("app.user.preferences.theme", "dark");
orchestrator.setState("app.currentPage", 1);

// Get state
const theme = orchestrator.getState("app.user.preferences.theme");
const fullState = orchestrator.getState(); // Returns entire state tree

// Subscribe to state changes
const stateSubscriptionId = orchestrator.onStateChange(
  "app.user",
  (newValue, oldValue, path) => {
    console.log("User state changed:", { newValue, oldValue, path });
  },
);

// Subscribe to all state changes
orchestrator.onStateChange(null, (newState, oldState, path) => {
  console.log("State changed at:", path);
});
```

#### State History and Time Travel

```javascript
// View state history
console.log(orchestrator.stateHistory);

// State updates include:
// {
//   timestamp: 1638360000000,
//   path: 'app.user.name',
//   oldValue: 'Jane',
//   newValue: 'John',
//   source: 'userProfile'
// }
```

### Component Management API

#### Registering Components

```javascript
// Register with dependencies
orchestrator.registerComponent("dataTable", tableComponent, [
  "dataFilter",
  "pagination",
]);

// Register without dependencies
orchestrator.registerComponent("headerComponent", headerComponent);

// Check component status
const status = orchestrator.getComponentStatus("dataTable");
// Returns: {
//   id: 'dataTable',
//   status: 'initialized',
//   registeredAt: 1638360000000,
//   hasErrors: false,
//   dependencies: ['dataFilter', 'pagination'],
//   dependents: []
// }
```

#### Component Lifecycle Management

```javascript
// Initialize all components (respects dependencies)
const initResults = orchestrator.initializeComponents();

// Initialize specific component
orchestrator.executeLifecycle("dataTable", "initialize");

// Destroy all components (reverse dependency order)
const destroyResults = orchestrator.destroyComponents();

// Unregister component
orchestrator.unregisterComponent("dataTable");
```

#### Component Communication

```javascript
// Broadcast message to specific components
const results = orchestrator.broadcast(
  ["table", "filter", "pagination"],
  "refresh",
  { source: "user", timestamp: Date.now() },
);

// Results format:
// [
//   { componentId: 'table', success: true },
//   { componentId: 'filter', success: true },
//   { componentId: 'pagination', success: false, error: 'Component not ready' }
// ]
```

### Performance and Monitoring

```javascript
// Get performance metrics
const metrics = orchestrator.getMetrics();
// Returns: {
//   eventsDispatched: 156,
//   eventsQueued: 5,
//   stateUpdates: 23,
//   averageDispatchTime: 0.8,
//   componentCount: 4,
//   eventQueueSize: 5,
//   eventHistorySize: 50,
//   stateHistorySize: 10,
//   activeSubscriptions: 12,
//   failedComponents: 0
// }

// Process queued events
const processedCount = orchestrator.processEventQueue();
```

### Event Replay and Debugging

```javascript
// Replay recent events
orchestrator.replayEvents();

// Replay specific events
orchestrator.replayEvents((event) => event.name.startsWith("user:"), 10);

// Debug mode
const debugOrchestrator = new ComponentOrchestrator({ debug: true });
// Exposes window.UMIG_ORCHESTRATOR for browser debugging
```

## BaseComponent Pattern

All components extend BaseComponent which provides common functionality.

### Creating a Custom Component

```javascript
class CustomDataComponent extends BaseComponent {
  constructor(containerId, config = {}) {
    super(containerId, {
      debug: false,
      accessibility: true,
      responsive: true,
      performanceMonitoring: true,
      errorBoundary: true,
      // Custom config
      dataSource: null,
      refreshInterval: 30000,
      ...config,
    });

    this.data = [];
    this.loading = false;
  }

  // Component-specific initialization
  onInitialize() {
    this.setupEventListeners();
    this.loadInitialData();
  }

  setupEventListeners() {
    // Listen for refresh requests
    this.orchestrator.on("data:refresh", (data) => {
      this.loadData(data.source);
    });

    // Listen for filter changes
    this.orchestrator.on("filter:applied", (data) => {
      this.applyFilter(data.filters);
    });
  }

  async loadData(source = null) {
    this.loading = true;
    this.setState({ loading: true });

    try {
      const response = await fetch(source || this.config.dataSource);
      this.data = await response.json();

      this.render();

      // Emit success event
      this.emit("dataLoaded", {
        count: this.data.length,
        source: source,
      });
    } catch (error) {
      this.handleError(error, "loadData");

      // Emit error event
      this.emit("dataLoadError", {
        error: error.message,
        source: source,
      });
    } finally {
      this.loading = false;
      this.setState({ loading: false });
    }
  }

  render() {
    if (!this.container) return;

    const startTime = this.startPerformanceMeasure("render");

    try {
      this.container.innerHTML = this.renderTemplate();
      this.attachEventHandlers();

      this.endPerformanceMeasure(startTime);
    } catch (error) {
      this.handleError(error, "render");
    }
  }

  renderTemplate() {
    if (this.loading) {
      return `
        <div class="loading-state" role="status" aria-live="polite">
          <span class="sr-only">Loading data...</span>
          <div class="spinner"></div>
        </div>
      `;
    }

    return `
      <div class="data-component" role="region" aria-label="Data Display">
        <h2>Data (${this.data.length} items)</h2>
        <ul role="list">
          ${this.data
            .map(
              (item) => `
            <li role="listitem" data-id="${item.id}">
              ${this.escapeHtml(item.name)}
            </li>
          `,
            )
            .join("")}
        </ul>
      </div>
    `;
  }

  attachEventHandlers() {
    const items = this.container.querySelectorAll("[data-id]");
    items.forEach((item) => {
      item.addEventListener("click", (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        this.selectItem(id);
      });
    });
  }

  selectItem(id) {
    const item = this.data.find((d) => d.id === id);
    if (item) {
      this.emit("itemSelected", { item, id });
    }
  }

  // Handle messages from other components
  onMessage(message, data) {
    switch (message) {
      case "refresh":
        this.loadData();
        break;
      case "selectItem":
        this.selectItem(data.id);
        break;
      case "clear":
        this.data = [];
        this.render();
        break;
    }
  }

  // Cleanup
  onDestroy() {
    // Component-specific cleanup
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }
}
```

### Using the Custom Component

```javascript
// Create component instance
const dataComponent = new CustomDataComponent("dataContainer", {
  dataSource: "/api/data",
  refreshInterval: 60000,
  debug: true,
});

// Register with orchestrator
orchestrator.registerComponent("dataDisplay", dataComponent);

// Initialize
orchestrator.executeLifecycle("dataDisplay", "initialize");
```

## Component Library

### TableComponent

Displays tabular data with sorting, selection, and pagination support.

```javascript
const tableComponent = new TableComponent("tableContainer", {
  columns: [
    { key: "id", title: "ID", sortable: true },
    { key: "name", title: "Name", sortable: true },
    { key: "status", title: "Status", sortable: false },
  ],
  selectable: true,
  multiSelect: true,
  pageSize: 20,
  showPagination: true,
});

// Listen for table events
orchestrator.on("table:rowSelected", (data) => {
  console.log("Selected row:", data.rowId);
});

orchestrator.on("table:sortChanged", (data) => {
  console.log("Sort changed:", data.column, data.direction);
});
```

### FilterComponent

Provides filtering capabilities with multiple field types.

```javascript
const filterComponent = new FilterComponent("filterContainer", {
  fields: [
    {
      key: "name",
      label: "Name",
      type: "text",
      placeholder: "Enter name...",
    },
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "inactive", label: "Inactive" },
      ],
    },
    {
      key: "dateRange",
      label: "Date Range",
      type: "dateRange",
    },
  ],
  autoApply: false,
  showClearAll: true,
});

// Listen for filter events
orchestrator.on("filter:applied", (data) => {
  console.log("Filters applied:", data.filters);
});
```

### ModalComponent

Modal dialog for forms and content display.

```javascript
const modalComponent = new ModalComponent('modalContainer', {
  title: 'Edit User',
  size: 'medium', // small, medium, large
  closable: true,
  backdrop: true,
  keyboard: true,
  form: {
    fields: [
      { name: 'name', type: 'text', label: 'Name', required: true },
      { name: 'email', type: 'email', label: 'Email', required: true },
      { name: 'role', type: 'select', label: 'Role', options: [...] }
    ],
    validation: {
      name: { minLength: 2, maxLength: 50 },
      email: { pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ }
    }
  }
});

// Modal events
orchestrator.on('modal:opened', (data) => {
  console.log('Modal opened with data:', data);
});

orchestrator.on('modal:submitted', (data) => {
  console.log('Form submitted:', data.formData);
});
```

### PaginationComponent

Handles pagination controls and navigation.

```javascript
const paginationComponent = new PaginationComponent("paginationContainer", {
  pageSize: 20,
  showPageSizes: true,
  pageSizeOptions: [10, 20, 50, 100],
  showPageInfo: true,
  showFirstLast: true,
  maxVisiblePages: 7,
});

// Pagination events
orchestrator.on("pagination:pageChanged", (data) => {
  console.log("Page changed to:", data.page);
});

orchestrator.on("pagination:pageSizeChanged", (data) => {
  console.log("Page size changed to:", data.pageSize);
});
```

## Integration Patterns

### Master-Detail Pattern

```javascript
// Register components with dependencies
orchestrator.registerComponent("userList", userListComponent);
orchestrator.registerComponent("userDetail", userDetailComponent, ["userList"]);
orchestrator.registerComponent("userModal", userModalComponent, ["userDetail"]);

// Set up master-detail communication
orchestrator.on("userList:rowSelected", (data) => {
  // Load detail view
  orchestrator.broadcast(["userDetail"], "loadUser", { userId: data.rowId });
});

orchestrator.on("userDetail:edit", (data) => {
  // Open edit modal
  orchestrator.broadcast(["userModal"], "open", { user: data.user });
});

orchestrator.on("userModal:submitted", (data) => {
  // Update detail and refresh list
  orchestrator.broadcast(["userDetail"], "updateUser", { user: data.formData });
  orchestrator.broadcast(["userList"], "refresh");
});
```

### Filter-Table-Pagination Pattern

```javascript
// Initialize components
const components = {
  filter: new FilterComponent("filterContainer", {
    /* config */
  }),
  table: new TableComponent("tableContainer", {
    /* config */
  }),
  pagination: new PaginationComponent("paginationContainer", {
    /* config */
  }),
};

// Register components
Object.entries(components).forEach(([name, component]) => {
  orchestrator.registerComponent(name, component);
});

// Set up communication
orchestrator.on("filter:applied", (data) => {
  // Apply filters and reset pagination
  orchestrator.setState("app.filters", data.filters);
  orchestrator.broadcast(["table"], "applyFilters", data);
  orchestrator.broadcast(["pagination"], "reset");
});

orchestrator.on("pagination:pageChanged", (data) => {
  // Load page data
  orchestrator.broadcast(["table"], "loadPage", {
    page: data.page,
    pageSize: data.pageSize,
    filters: orchestrator.getState("app.filters"),
  });
});

orchestrator.on("table:dataLoaded", (data) => {
  // Update pagination
  orchestrator.broadcast(["pagination"], "updateTotal", {
    total: data.totalCount,
  });
});
```

### Async Data Loading Pattern

```javascript
class AsyncDataComponent extends BaseComponent {
  async loadData() {
    // Emit loading state
    this.emit("loadingStarted", { timestamp: Date.now() });

    try {
      // Set global loading state
      this.orchestrator.setState("app.loading", true);

      const response = await fetch("/api/data");
      const data = await response.json();

      // Update state
      this.orchestrator.setState("app.data", data);
      this.orchestrator.setState("app.loading", false);

      // Emit success
      this.emit("loadingCompleted", { count: data.length });
    } catch (error) {
      this.orchestrator.setState("app.loading", false);
      this.orchestrator.setState("app.error", error.message);

      // Emit error
      this.emit("loadingFailed", { error: error.message });
    }
  }
}

// Global loading indicator
orchestrator.onStateChange("app.loading", (isLoading) => {
  const spinner = document.getElementById("globalSpinner");
  spinner.style.display = isLoading ? "block" : "none";
});
```

## Security Architecture

The ComponentOrchestrator has been hardened through a comprehensive 8-phase security methodology, achieving enterprise-grade security certification with an 8.5/10 security rating and 78% risk reduction.

### Security Controls Framework

The following security controls have been implemented based on **ADR-054: Enterprise Component Security Architecture Pattern**:

#### 1. Prototype Pollution Prevention (CVSS 9.0)

```javascript
// Dangerous keys protection
const DANGEROUS_KEYS = ["__proto__", "constructor", "prototype"];
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== "object") return obj;
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!DANGEROUS_KEYS.includes(key)) {
      sanitized[key] =
        typeof value === "object" ? sanitizeObject(value) : value;
    }
  }
  return sanitized;
};
```

#### 2. Input Validation and XSS Prevention

```javascript
// Comprehensive input sanitization
const sanitizeInput = (input, context = "default") => {
  if (typeof input !== "string") return input;

  const contexts = {
    html: (str) =>
      str.replace(
        /[<>'"&]/g,
        (char) =>
          ({
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#x27;",
            '"': "&quot;",
            "&": "&amp;",
          })[char],
      ),
    attribute: (str) =>
      str.replace(/['"<>&]/g, (char) => `&#${char.charCodeAt(0)};`),
    javascript: (str) => JSON.stringify(str).slice(1, -1),
    default: (str) =>
      str.replace(
        /[<>'"&]/g,
        (char) =>
          ({
            "<": "&lt;",
            ">": "&gt;",
            "'": "&#x27;",
            '"': "&quot;",
            "&": "&amp;",
          })[char],
      ),
  };

  return contexts[context] ? contexts[context](input) : contexts.default(input);
};
```

#### 3. State Mutation Protection

```javascript
// Immutable state management with deep freezing
const createImmutableState = (state) => {
  if (typeof state !== "object" || state === null) return state;

  const immutableState = Array.isArray(state) ? [...state] : { ...state };

  Object.keys(immutableState).forEach((key) => {
    if (
      typeof immutableState[key] === "object" &&
      immutableState[key] !== null
    ) {
      immutableState[key] = createImmutableState(immutableState[key]);
    }
  });

  return Object.freeze(immutableState);
};
```

#### 4. Event System Security

```javascript
// Secure event handling with validation
class SecureEventBus {
  constructor() {
    this.allowedEvents = new Set();
    this.eventValidators = new Map();
  }

  registerAllowedEvent(eventName, validator = null) {
    this.allowedEvents.add(eventName);
    if (validator) {
      this.eventValidators.set(eventName, validator);
    }
  }

  emit(eventName, data = {}) {
    if (!this.allowedEvents.has(eventName)) {
      console.warn(
        `Security Warning: Unauthorized event emission attempt: ${eventName}`,
      );
      return false;
    }

    const validator = this.eventValidators.get(eventName);
    if (validator && !validator(data)) {
      console.warn(
        `Security Warning: Event data validation failed for: ${eventName}`,
      );
      return false;
    }

    // Proceed with secure event emission
    return super.emit(eventName, sanitizeObject(data));
  }
}
```

#### 5. Component Isolation

```javascript
// Secure component sandboxing
class SecureComponent extends BaseComponent {
  constructor(id, orchestrator, options = {}) {
    super(id, orchestrator, options);
    this.securityContext = {
      allowedOperations: options.allowedOperations || [],
      dataAccessLevel: options.dataAccessLevel || "read",
      eventPermissions: options.eventPermissions || [],
    };
  }

  execute(operation, ...args) {
    if (!this.securityContext.allowedOperations.includes(operation)) {
      throw new SecurityError(`Unauthorized operation: ${operation}`);
    }
    return super.execute(operation, ...args);
  }
}
```

### Multi-Agent Security Collaboration

The security hardening was implemented using **ADR-055: Multi-Agent Security Collaboration Workflow Architecture** with three specialized GENDEV agents:

1. **gendev-test-suite-generator**: Created 49 comprehensive security tests
2. **gendev-code-refactoring-specialist**: Implemented security controls and refactored vulnerable patterns
3. **gendev-security-analyzer**: Performed CVSS scoring and vulnerability assessment

### Security Metrics

- **Security Rating**: 8.5/10 (Enterprise Grade)
- **Risk Reduction**: 78% from baseline
- **Test Coverage**: 49 security-focused tests with 100% pass rate
- **Vulnerability Mitigation**: 15 critical vulnerabilities resolved
- **Compliance**: OWASP Top 10, NIST Framework aligned

### Security Testing Commands

```bash
# Security-focused component testing
npm run test:js:security              # Security test suite
npm run test:js:integration:security  # Security integration tests
npm run security:validate             # Component security validation
npm run security:audit                # Security audit report
```

### Security Best Practices

1. **Always sanitize component inputs** using the provided sanitization functions
2. **Use immutable state patterns** to prevent unauthorized state mutations
3. **Validate all inter-component communications** through the secure event system
4. **Implement proper component isolation** with security contexts
5. **Regular security testing** using the provided test suites

For detailed implementation guides, see:

- **[ADR-054: Enterprise Component Security Architecture Pattern](../architecture/adr/ADR-054-enterprise-component-security-architecture-pattern.md)**
- **[ADR-055: Multi-Agent Security Collaboration Workflow Architecture](../architecture/adr/ADR-055-multi-agent-security-collaboration-workflow-architecture.md)**

## Best Practices

### 1. Component Design

```javascript
// ✅ Good: Single Responsibility
class UserTableComponent extends BaseComponent {
  // Focuses only on displaying user data in table format
}

// ❌ Bad: Multiple Responsibilities
class UserManagementComponent extends BaseComponent {
  // Handles table, filtering, editing, permissions, etc.
}
```

### 2. Event Naming

```javascript
// ✅ Good: Descriptive, namespaced events
this.emit("user:selected", { userId, userData });
this.emit("table:sortChanged", { column, direction });
this.emit("form:validationFailed", { errors });

// ❌ Bad: Generic, unclear events
this.emit("click", data);
this.emit("change", value);
this.emit("update", info);
```

### 3. State Management

```javascript
// ✅ Good: Immutable state updates
orchestrator.setState("app.users", [...existingUsers, newUser]);

// ❌ Bad: Mutating existing state
const users = orchestrator.getState("app.users");
users.push(newUser); // This mutates the original state
```

### 4. Error Handling

```javascript
// ✅ Good: Comprehensive error handling
async loadData() {
  try {
    this.setState({ loading: true, error: null });
    const data = await this.dataService.fetch();
    this.setState({ data, loading: false });
    this.emit('dataLoaded', { count: data.length });
  } catch (error) {
    this.setState({ loading: false, error: error.message });
    this.emit('dataLoadFailed', { error: error.message });
    this.logError('Data load failed', error);
  }
}

// ❌ Bad: Silent failures
async loadData() {
  try {
    const data = await this.dataService.fetch();
    this.data = data;
  } catch (error) {
    // Silent failure - other components don't know about the error
  }
}
```

### 5. Performance

```javascript
// ✅ Good: Debounced updates
class SearchComponent extends BaseComponent {
  constructor(containerId, config) {
    super(containerId, config);
    this.searchDebounce = this.debounce(this.performSearch.bind(this), 300);
  }

  onSearchInput(value) {
    this.searchDebounce(value);
  }
}

// ✅ Good: Efficient rendering
render() {
  const perfMeasure = this.startPerformanceMeasure('render');

  // Only update if data changed
  if (this.shouldUpdate()) {
    this.container.innerHTML = this.renderTemplate();
    this.lastRenderData = this.deepClone(this.data);
  }

  this.endPerformanceMeasure(perfMeasure);
}
```

### 6. Accessibility

```javascript
// ✅ Good: Full accessibility support
renderTemplate() {
  return `
    <div role="region" aria-label="User Management">
      <h2 id="userTableTitle">Users (${this.data.length})</h2>
      <table role="table" aria-labelledby="userTableTitle">
        <thead>
          <tr role="row">
            <th role="columnheader" aria-sort="${this.sortDirection}">
              <button onclick="sortBy('name')" aria-label="Sort by name">
                Name
              </button>
            </th>
          </tr>
        </thead>
        <tbody role="rowgroup">
          ${this.data.map(user => `
            <tr role="row" aria-selected="${user.selected}" tabindex="0">
              <td role="gridcell">${this.escapeHtml(user.name)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}
```

## Examples

### Complete CRUD Application

```javascript
// Application setup
const orchestrator = new ComponentOrchestrator({
  debug: true,
  performanceMonitoring: true
});

// Component configurations
const components = {
  userFilter: new FilterComponent('userFilterContainer', {
    fields: [
      { key: 'name', label: 'Name', type: 'text' },
      { key: 'status', label: 'Status', type: 'select', options: [...] },
      { key: 'role', label: 'Role', type: 'select', options: [...] }
    ]
  }),

  userTable: new TableComponent('userTableContainer', {
    columns: [
      { key: 'id', title: 'ID', sortable: true },
      { key: 'name', title: 'Name', sortable: true },
      { key: 'email', title: 'Email', sortable: true },
      { key: 'status', title: 'Status', sortable: false },
      { key: 'actions', title: 'Actions', sortable: false }
    ],
    selectable: true,
    actions: [
      { key: 'edit', label: 'Edit', icon: 'edit' },
      { key: 'delete', label: 'Delete', icon: 'trash', confirm: true }
    ]
  }),

  userPagination: new PaginationComponent('userPaginationContainer', {
    pageSize: 20,
    showPageSizes: true
  }),

  userModal: new ModalComponent('userModalContainer', {
    title: 'User Management',
    size: 'medium'
  })
};

// Register all components
Object.entries(components).forEach(([name, component]) => {
  orchestrator.registerComponent(name, component);
});

// Set up application workflows
class UserApplication {
  constructor(orchestrator) {
    this.orchestrator = orchestrator;
    this.setupEventListeners();
    this.initializeApp();
  }

  setupEventListeners() {
    // Filter → Table communication
    this.orchestrator.on('filter:applied', (data) => {
      this.loadUsers({ filters: data.filters, page: 1 });
    });

    // Table → Modal communication
    this.orchestrator.on('table:actionClicked', (data) => {
      if (data.action === 'edit') {
        this.editUser(data.rowData);
      } else if (data.action === 'delete') {
        this.deleteUser(data.rowData);
      }
    });

    // Pagination → Table communication
    this.orchestrator.on('pagination:pageChanged', (data) => {
      const filters = this.orchestrator.getState('app.filters');
      this.loadUsers({ filters, page: data.page, pageSize: data.pageSize });
    });

    // Modal → Application communication
    this.orchestrator.on('modal:submitted', (data) => {
      this.saveUser(data.formData);
    });

    // Error handling
    this.orchestrator.on('*:error', (data) => {
      this.handleError(data.error);
    });
  }

  async initializeApp() {
    // Initialize all components
    await this.orchestrator.initializeComponents();

    // Load initial data
    this.loadUsers();
  }

  async loadUsers(params = {}) {
    try {
      this.orchestrator.setState('app.loading', true);

      const response = await fetch('/api/users?' + new URLSearchParams(params));
      const result = await response.json();

      // Update table
      this.orchestrator.broadcast(['userTable'], 'loadData', {
        data: result.users,
        totalCount: result.total
      });

      // Update pagination
      this.orchestrator.broadcast(['userPagination'], 'updateTotal', {
        total: result.total,
        currentPage: params.page || 1
      });

      // Update global state
      this.orchestrator.setState('app.users', result.users);
      this.orchestrator.setState('app.loading', false);

    } catch (error) {
      this.orchestrator.setState('app.loading', false);
      this.handleError(error);
    }
  }

  editUser(userData) {
    this.orchestrator.broadcast(['userModal'], 'open', {
      mode: 'edit',
      data: userData,
      title: `Edit User: ${userData.name}`
    });
  }

  async saveUser(formData) {
    try {
      const response = await fetch(`/api/users/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        this.orchestrator.broadcast(['userModal'], 'close');
        this.loadUsers(); // Refresh data
        this.showNotification('User saved successfully', 'success');
      } else {
        throw new Error('Failed to save user');
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  async deleteUser(userData) {
    if (confirm(`Delete user ${userData.name}?`)) {
      try {
        const response = await fetch(`/api/users/${userData.id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          this.loadUsers(); // Refresh data
          this.showNotification('User deleted successfully', 'success');
        } else {
          throw new Error('Failed to delete user');
        }
      } catch (error) {
        this.handleError(error);
      }
    }
  }

  handleError(error) {
    console.error('Application error:', error);
    this.showNotification(error.message || 'An error occurred', 'error');
  }

  showNotification(message, type) {
    // Implement notification display
    this.orchestrator.emit('notification:show', { message, type });
  }
}

// Initialize application
const app = new UserApplication(orchestrator);
```

## Testing

### Unit Testing Components

```javascript
describe("CustomDataComponent", () => {
  let component;
  let orchestrator;

  beforeEach(() => {
    document.body.innerHTML = '<div id="testContainer"></div>';

    global.ComponentOrchestrator = require("../path/to/ComponentOrchestrator");
    orchestrator = new ComponentOrchestrator();

    component = new CustomDataComponent("testContainer", {
      dataSource: "/api/test-data",
    });

    orchestrator.registerComponent("testComponent", component);
  });

  afterEach(() => {
    orchestrator.reset();
    document.body.innerHTML = "";
  });

  test("should initialize correctly", () => {
    component.initialize();

    expect(component.initialized).toBe(true);
    expect(component.container).toBeTruthy();
  });

  test("should emit events correctly", (done) => {
    orchestrator.on("testComponent:dataLoaded", (data) => {
      expect(data.count).toBeGreaterThan(0);
      done();
    });

    component.initialize();
    component.loadData();
  });

  test("should handle messages correctly", () => {
    component.initialize();

    const refreshSpy = jest.spyOn(component, "loadData");
    component.onMessage("refresh", {});

    expect(refreshSpy).toHaveBeenCalled();
  });
});
```

### Integration Testing

```javascript
describe("Component Integration", () => {
  let orchestrator;
  let components;

  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <div id="filterContainer"></div>
      <div id="tableContainer"></div>
      <div id="paginationContainer"></div>
    `;

    orchestrator = new ComponentOrchestrator();

    components = {
      filter: new FilterComponent("filterContainer", {
        /* config */
      }),
      table: new TableComponent("tableContainer", {
        /* config */
      }),
      pagination: new PaginationComponent("paginationContainer", {
        /* config */
      }),
    };

    // Register components
    Object.entries(components).forEach(([name, component]) => {
      orchestrator.registerComponent(name, component);
    });

    orchestrator.initializeComponents();
  });

  test("should handle filter-table-pagination workflow", (done) => {
    let eventCount = 0;
    const expectedEvents = [
      "filter:applied",
      "table:dataLoaded",
      "pagination:updated",
    ];

    expectedEvents.forEach((eventName) => {
      orchestrator.on(eventName, () => {
        eventCount++;
        if (eventCount === expectedEvents.length) {
          done();
        }
      });
    });

    // Trigger workflow
    components.filter.applyFilter("status", "active");
  });
});
```

---

This documentation provides comprehensive guidance for implementing and using the UMIG Admin GUI component architecture. For additional examples and advanced usage patterns, refer to the component source code and test files.
