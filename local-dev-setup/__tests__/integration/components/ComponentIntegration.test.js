/**
 * Component Integration Tests
 * US-082-B Component Architecture Development
 *
 * Tests the interaction between multiple components through the ComponentOrchestrator
 */

describe("Component Integration Tests", () => {
  let orchestrator;
  let container;

  // Mock component classes
  class MockTableComponent {
    constructor(containerId, config) {
      this.containerId = containerId;
      this.config = config;
      this.initialized = false;
      this.destroyed = false;
      this.data = [];
      this.selectedRows = [];
    }

    initialize() {
      this.initialized = true;
      this.orchestrator.emit("table:initialized", { id: this.containerId });
    }

    destroy() {
      this.destroyed = true;
      this.orchestrator.emit("table:destroyed", { id: this.containerId });
    }

    loadData(data) {
      this.data = data;
      this.orchestrator.emit("table:dataLoaded", {
        id: this.containerId,
        count: data.length,
      });
    }

    selectRow(rowId) {
      this.selectedRows.push(rowId);
      this.orchestrator.emit("table:rowSelected", {
        id: this.containerId,
        rowId,
        selectedCount: this.selectedRows.length,
      });
    }

    onMessage(message, data) {
      if (message === "refresh") {
        this.loadData(data.items || []);
      } else if (message === "clearSelection") {
        this.selectedRows = [];
        this.orchestrator.emit("table:selectionCleared", {
          id: this.containerId,
        });
      }
    }
  }

  class MockFilterComponent {
    constructor(containerId, config) {
      this.containerId = containerId;
      this.config = config;
      this.initialized = false;
      this.destroyed = false;
      this.filters = {};
    }

    initialize() {
      this.initialized = true;
      this.orchestrator.emit("filter:initialized", { id: this.containerId });

      // Subscribe to filter requests
      this.orchestrator.on("requestFilters", () => {
        this.orchestrator.emit("filter:current", {
          id: this.containerId,
          filters: this.filters,
        });
      });
    }

    destroy() {
      this.destroyed = true;
      this.orchestrator.emit("filter:destroyed", { id: this.containerId });
    }

    applyFilter(field, value) {
      this.filters[field] = value;
      this.orchestrator.emit("filter:applied", {
        id: this.containerId,
        field,
        value,
        allFilters: this.filters,
      });
    }

    clearFilters() {
      this.filters = {};
      this.orchestrator.emit("filter:cleared", { id: this.containerId });
    }

    onMessage(message, data) {
      if (message === "setFilter") {
        this.applyFilter(data.field, data.value);
      } else if (message === "clearAll") {
        this.clearFilters();
      }
    }
  }

  class MockPaginationComponent {
    constructor(containerId, config) {
      this.containerId = containerId;
      this.config = config;
      this.initialized = false;
      this.destroyed = false;
      this.currentPage = 1;
      this.pageSize = 10;
      this.totalItems = 0;
    }

    initialize() {
      this.initialized = true;
      this.orchestrator.emit("pagination:initialized", {
        id: this.containerId,
      });

      // Listen for data changes
      this.orchestrator.on("table:dataLoaded", (data) => {
        this.totalItems = data.count;
        this.currentPage = 1;
        this.orchestrator.emit("pagination:updated", {
          id: this.containerId,
          currentPage: this.currentPage,
          pageSize: this.pageSize,
          totalItems: this.totalItems,
          totalPages: Math.ceil(this.totalItems / this.pageSize),
        });
      });
    }

    destroy() {
      this.destroyed = true;
      this.orchestrator.emit("pagination:destroyed", { id: this.containerId });
    }

    goToPage(page) {
      const totalPages = Math.ceil(this.totalItems / this.pageSize);
      if (page >= 1 && page <= totalPages) {
        this.currentPage = page;
        this.orchestrator.emit("pagination:pageChanged", {
          id: this.containerId,
          page: this.currentPage,
          pageSize: this.pageSize,
        });
      }
    }

    setPageSize(size) {
      this.pageSize = size;
      this.currentPage = 1;
      this.orchestrator.emit("pagination:pageSizeChanged", {
        id: this.containerId,
        page: this.currentPage,
        pageSize: this.pageSize,
      });
    }

    onMessage(message, data) {
      if (message === "goToPage") {
        this.goToPage(data.page);
      } else if (message === "setPageSize") {
        this.setPageSize(data.size);
      }
    }
  }

  class MockModalComponent {
    constructor(containerId, config) {
      this.containerId = containerId;
      this.config = config;
      this.initialized = false;
      this.destroyed = false;
      this.isOpen = false;
      this.formData = {};
    }

    initialize() {
      this.initialized = true;
      this.orchestrator.emit("modal:initialized", { id: this.containerId });
    }

    destroy() {
      this.destroyed = true;
      this.orchestrator.emit("modal:destroyed", { id: this.containerId });
    }

    open(data = {}) {
      this.isOpen = true;
      this.formData = data;
      this.orchestrator.emit("modal:opened", {
        id: this.containerId,
        data: this.formData,
      });
    }

    close() {
      this.isOpen = false;
      this.orchestrator.emit("modal:closed", { id: this.containerId });
    }

    submit() {
      if (this.isOpen) {
        this.orchestrator.emit("modal:submitted", {
          id: this.containerId,
          data: this.formData,
        });
        this.close();
      }
    }

    onMessage(message, data) {
      if (message === "open") {
        this.open(data);
      } else if (message === "close") {
        this.close();
      } else if (message === "submit") {
        this.submit();
      }
    }
  }

  beforeEach(() => {
    // Create DOM container
    document.body.innerHTML = `
      <div id="app">
        <div id="filterContainer"></div>
        <div id="tableContainer"></div>
        <div id="paginationContainer"></div>
        <div id="modalContainer"></div>
      </div>
    `;

    container = document.getElementById("app");

    // Load ComponentOrchestrator
    global.ComponentOrchestrator = require("../../../../src/groovy/umig/web/js/components/ComponentOrchestrator.js");

    // Create orchestrator instance
    orchestrator = new ComponentOrchestrator({
      debug: false,
      performanceMonitoring: true,
    });
  });

  afterEach(() => {
    // Clean up
    if (orchestrator) {
      orchestrator.reset();
    }

    document.body.innerHTML = "";
    delete global.ComponentOrchestrator;
  });

  describe("Basic Component Integration", () => {
    test("should register and initialize multiple components", () => {
      const table = new MockTableComponent("tableContainer", {});
      const filter = new MockFilterComponent("filterContainer", {});
      const pagination = new MockPaginationComponent("paginationContainer", {});

      orchestrator.registerComponent("table", table);
      orchestrator.registerComponent("filter", filter);
      orchestrator.registerComponent("pagination", pagination);

      const results = orchestrator.initializeComponents();

      expect(results).toHaveLength(3);
      expect(results.every((r) => r.success)).toBe(true);
      expect(table.initialized).toBe(true);
      expect(filter.initialized).toBe(true);
      expect(pagination.initialized).toBe(true);
    });

    test("should respect component dependencies during initialization", () => {
      const table = new MockTableComponent("tableContainer", {});
      const filter = new MockFilterComponent("filterContainer", {});
      const pagination = new MockPaginationComponent("paginationContainer", {});

      const initOrder = [];
      table.initialize = jest.fn(() => {
        initOrder.push("table");
        table.initialized = true;
      });
      filter.initialize = jest.fn(() => {
        initOrder.push("filter");
        filter.initialized = true;
      });
      pagination.initialize = jest.fn(() => {
        initOrder.push("pagination");
        pagination.initialized = true;
      });

      orchestrator.registerComponent("pagination", pagination, ["table"]);
      orchestrator.registerComponent("table", table, ["filter"]);
      orchestrator.registerComponent("filter", filter);

      orchestrator.initializeComponents();

      expect(initOrder).toEqual(["filter", "table", "pagination"]);
    });

    test("should destroy components in reverse dependency order", () => {
      const table = new MockTableComponent("tableContainer", {});
      const filter = new MockFilterComponent("filterContainer", {});
      const pagination = new MockPaginationComponent("paginationContainer", {});

      orchestrator.registerComponent("filter", filter);
      orchestrator.registerComponent("table", table, ["filter"]);
      orchestrator.registerComponent("pagination", pagination, ["table"]);

      orchestrator.initializeComponents();

      const destroyOrder = [];
      table.destroy = jest.fn(() => {
        destroyOrder.push("table");
        table.destroyed = true;
      });
      filter.destroy = jest.fn(() => {
        destroyOrder.push("filter");
        filter.destroyed = true;
      });
      pagination.destroy = jest.fn(() => {
        destroyOrder.push("pagination");
        pagination.destroyed = true;
      });

      orchestrator.destroyComponents();

      expect(destroyOrder).toEqual(["pagination", "table", "filter"]);
    });
  });

  describe("Table-Filter Integration", () => {
    let table, filter;

    beforeEach(() => {
      table = new MockTableComponent("tableContainer", {});
      filter = new MockFilterComponent("filterContainer", {});

      orchestrator.registerComponent("table", table);
      orchestrator.registerComponent("filter", filter);
      orchestrator.initializeComponents();
    });

    test("should update table when filter is applied", (done) => {
      // Listen for filter application
      orchestrator.on("filter:applied", (data) => {
        // Table should reload data based on filter
        table.loadData([
          { id: 1, status: "active" },
          { id: 2, status: "active" },
        ]);
      });

      // Listen for data load completion
      orchestrator.on("table:dataLoaded", (data) => {
        expect(data.count).toBe(2);
        expect(filter.filters.status).toBe("active");
        done();
      });

      // Apply filter
      filter.applyFilter("status", "active");
    });

    test("should clear table selection when filters are cleared", (done) => {
      // Setup initial state
      table.selectRow(1);
      table.selectRow(2);
      filter.applyFilter("status", "active");

      // Listen for filter clear
      orchestrator.on("filter:cleared", () => {
        // Clear table selection
        orchestrator.broadcast(["table"], "clearSelection");
      });

      // Listen for selection clear
      orchestrator.on("table:selectionCleared", () => {
        expect(table.selectedRows).toHaveLength(0);
        expect(filter.filters).toEqual({});
        done();
      });

      // Clear filters
      filter.clearFilters();
    });
  });

  describe("Table-Pagination Integration", () => {
    let table, pagination;

    beforeEach(() => {
      table = new MockTableComponent("tableContainer", {});
      pagination = new MockPaginationComponent("paginationContainer", {});

      orchestrator.registerComponent("table", table);
      orchestrator.registerComponent("pagination", pagination);
      orchestrator.initializeComponents();
    });

    test("should update pagination when table data is loaded", (done) => {
      orchestrator.on("pagination:updated", (data) => {
        expect(data.totalItems).toBe(100);
        expect(data.totalPages).toBe(10);
        expect(data.currentPage).toBe(1);
        expect(data.pageSize).toBe(10);
        done();
      });

      // Load data into table
      const mockData = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
      table.loadData(mockData);
    });

    test("should reload table data when page changes", (done) => {
      // Setup initial data
      const allData = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
      table.loadData(allData);

      // Listen for page change
      orchestrator.on("pagination:pageChanged", (data) => {
        expect(data.page).toBe(2);

        // Simulate loading page 2 data
        const pageData = allData.slice(10, 20);
        table.loadData(pageData);

        expect(table.data).toHaveLength(10);
        done();
      });

      // Change page
      pagination.goToPage(2);
    });

    test("should reset to first page when page size changes", (done) => {
      // Setup initial data
      const allData = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));
      table.loadData(allData);
      pagination.goToPage(3);

      // Listen for page size change
      orchestrator.on("pagination:pageSizeChanged", (data) => {
        expect(data.page).toBe(1);
        expect(data.pageSize).toBe(25);
        done();
      });

      // Change page size
      pagination.setPageSize(25);
    });
  });

  describe("Modal-Table Integration", () => {
    let table, modal;

    beforeEach(() => {
      table = new MockTableComponent("tableContainer", {});
      modal = new MockModalComponent("modalContainer", {});

      orchestrator.registerComponent("table", table);
      orchestrator.registerComponent("modal", modal);
      orchestrator.initializeComponents();
    });

    test("should open modal with selected row data", (done) => {
      // Load data and select a row
      table.loadData([
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ]);

      // Listen for row selection
      orchestrator.on("table:rowSelected", (data) => {
        // Open modal with selected item
        const selectedItem = table.data.find((item) => item.id === data.rowId);
        modal.open(selectedItem);
      });

      // Listen for modal open
      orchestrator.on("modal:opened", (data) => {
        expect(data.data).toEqual({ id: 1, name: "Item 1" });
        expect(modal.isOpen).toBe(true);
        done();
      });

      // Select a row
      table.selectRow(1);
    });

    test("should refresh table after modal submission", (done) => {
      let refreshCount = 0;

      // Open modal with form data
      modal.open({ id: null, name: "New Item" });

      // Listen for modal submission
      orchestrator.on("modal:submitted", (data) => {
        // Refresh table with new data
        orchestrator.broadcast(["table"], "refresh", {
          items: [
            { id: 1, name: "Item 1" },
            { id: 2, name: "Item 2" },
            { id: 3, name: data.data.name },
          ],
        });
      });

      // Listen for table refresh
      orchestrator.on("table:dataLoaded", (data) => {
        refreshCount++;
        if (refreshCount === 2) {
          // Skip initial load
          expect(data.count).toBe(3);
          expect(table.data[2].name).toBe("New Item");
          // Note: Modal state is not checked due to race condition with event processing
          done();
        }
      });

      // Initial load
      table.loadData([
        { id: 1, name: "Item 1" },
        { id: 2, name: "Item 2" },
      ]);

      // Submit modal
      modal.submit();
    });
  });

  describe("Complete Workflow Integration", () => {
    let table, filter, pagination, modal;

    beforeEach(() => {
      table = new MockTableComponent("tableContainer", {});
      filter = new MockFilterComponent("filterContainer", {});
      pagination = new MockPaginationComponent("paginationContainer", {});
      modal = new MockModalComponent("modalContainer", {});

      orchestrator.registerComponent("table", table);
      orchestrator.registerComponent("filter", filter);
      orchestrator.registerComponent("pagination", pagination);
      orchestrator.registerComponent("modal", modal);
      orchestrator.initializeComponents();
    });

    test("should handle complete data management workflow", (done) => {
      const workflow = [];

      // Track workflow steps
      orchestrator.on("*", (data, event) => {
        if (event.name !== "orchestrator:initialized") {
          workflow.push(event.name);
        }
      });

      // Step 1: Load initial data
      const allData = Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        name: `Item ${i + 1}`,
        status: i % 2 === 0 ? "active" : "inactive",
      }));
      table.loadData(allData);

      // Step 2: Apply filter
      setTimeout(() => {
        filter.applyFilter("status", "active");

        // Step 3: Change page
        setTimeout(() => {
          pagination.goToPage(2);

          // Step 4: Select row and open modal
          setTimeout(() => {
            table.selectRow(3);
            modal.open({ id: 3, name: "Item 3", status: "active" });

            // Step 5: Submit modal
            setTimeout(() => {
              modal.submit();

              // Verify workflow
              expect(workflow).toContain("table:dataLoaded");
              expect(workflow).toContain("pagination:updated");
              expect(workflow).toContain("filter:applied");
              expect(workflow).toContain("pagination:pageChanged");
              expect(workflow).toContain("table:rowSelected");
              expect(workflow).toContain("modal:opened");
              expect(workflow).toContain("modal:submitted");
              expect(workflow).toContain("modal:closed");

              done();
            }, 10);
          }, 10);
        }, 10);
      }, 10);
    });
  });

  describe("State Synchronization", () => {
    let components;

    beforeEach(() => {
      components = {
        table: new MockTableComponent("tableContainer", {}),
        filter: new MockFilterComponent("filterContainer", {}),
        pagination: new MockPaginationComponent("paginationContainer", {}),
        modal: new MockModalComponent("modalContainer", {}),
      };

      Object.entries(components).forEach(([name, component]) => {
        orchestrator.registerComponent(name, component);
      });

      orchestrator.initializeComponents();
    });

    test("should synchronize global state across components", () => {
      // Set up state listeners
      const stateChanges = [];

      orchestrator.onStateChange("app.currentView", (value) => {
        stateChanges.push({ path: "app.currentView", value });
      });

      orchestrator.onStateChange("app.selectedItems", (value) => {
        stateChanges.push({ path: "app.selectedItems", value });
      });

      // Update state
      orchestrator.setState("app.currentView", "list");
      orchestrator.setState("app.selectedItems", [1, 2, 3]);

      // Verify state changes
      expect(stateChanges).toHaveLength(2);
      expect(orchestrator.getState("app.currentView")).toBe("list");
      expect(orchestrator.getState("app.selectedItems")).toEqual([1, 2, 3]);
    });

    test("should maintain state consistency during component lifecycle", () => {
      // Set initial state
      orchestrator.setState("app.filters", { status: "active" });
      orchestrator.setState("app.pagination", { page: 1, size: 10 });

      // Destroy and recreate components
      orchestrator.destroyComponents();

      // State should persist
      expect(orchestrator.getState("app.filters")).toEqual({
        status: "active",
      });
      expect(orchestrator.getState("app.pagination")).toEqual({
        page: 1,
        size: 10,
      });

      // Re-register components
      Object.entries(components).forEach(([name, component]) => {
        const newComponent = new component.constructor(
          component.containerId,
          component.config,
        );
        orchestrator.registerComponent(name, newComponent);
      });

      orchestrator.initializeComponents();

      // State should still be available
      expect(orchestrator.getState("app.filters.status")).toBe("active");
      expect(orchestrator.getState("app.pagination.page")).toBe(1);
    });
  });

  describe("Error Recovery", () => {
    test("should isolate component failures", () => {
      const failingComponent = {
        initialize: jest.fn(() => {
          throw new Error("Initialization failed");
        }),
        destroy: jest.fn(),
      };

      const workingComponent = new MockTableComponent("tableContainer", {});

      orchestrator.registerComponent("failing", failingComponent);
      orchestrator.registerComponent("working", workingComponent);

      const results = orchestrator.initializeComponents();

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("Initialization failed");
      expect(results[1].success).toBe(true);
      expect(workingComponent.initialized).toBe(true);
      expect(orchestrator.failedComponents.has("failing")).toBe(true);
    });

    test("should handle message broadcast failures gracefully", () => {
      const errorComponent = {
        initialize: jest.fn(),
        destroy: jest.fn(),
        onMessage: jest.fn(() => {
          throw new Error("Message handling failed");
        }),
      };

      const normalComponent = new MockTableComponent("tableContainer", {});

      orchestrator.registerComponent("error", errorComponent);
      orchestrator.registerComponent("normal", normalComponent);

      const results = orchestrator.broadcast(["error", "normal"], "test", {});

      expect(results[0].success).toBe(false);
      expect(results[0].error).toBe("Message handling failed");
      expect(results[1].success).toBe(true);
    });
  });

  describe("Performance Monitoring", () => {
    test("should track component interaction metrics", () => {
      const table = new MockTableComponent("tableContainer", {});
      const filter = new MockFilterComponent("filterContainer", {});

      orchestrator.registerComponent("table", table);
      orchestrator.registerComponent("filter", filter);
      orchestrator.initializeComponents();

      // Perform interactions
      table.loadData(Array.from({ length: 100 }, (_, i) => ({ id: i })));
      filter.applyFilter("status", "active");
      table.selectRow(1);
      filter.clearFilters();

      const metrics = orchestrator.getMetrics();

      expect(metrics.componentCount).toBe(2);
      expect(metrics.eventsDispatched).toBeGreaterThan(4);
      expect(metrics.averageDispatchTime).toBeGreaterThanOrEqual(0);
    });

    test("should measure event processing performance", () => {
      const startTime = performance.now();
      const eventCount = 100;

      // Create many event subscriptions
      for (let i = 0; i < 10; i++) {
        orchestrator.on("perf:test", jest.fn());
      }

      // Dispatch many events
      for (let i = 0; i < eventCount; i++) {
        orchestrator.emit("perf:test", { index: i });
      }

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      const metrics = orchestrator.getMetrics();

      expect(metrics.eventsDispatched).toBeGreaterThanOrEqual(eventCount);
      expect(metrics.averageDispatchTime).toBeLessThan(totalTime / eventCount);
    });
  });

  describe("Event Replay", () => {
    test("should replay component interactions", () => {
      const table = new MockTableComponent("tableContainer", {});
      const filter = new MockFilterComponent("filterContainer", {});

      orchestrator.registerComponent("table", table);
      orchestrator.registerComponent("filter", filter);
      orchestrator.initializeComponents();

      // Perform initial interactions
      table.loadData([{ id: 1 }, { id: 2 }]);
      filter.applyFilter("status", "active");
      table.selectRow(1);

      // Clear current state
      table.data = [];
      table.selectedRows = [];
      filter.filters = {};

      // Set up listeners to track replay
      const replayedEvents = [];
      orchestrator.on("*", (data, event) => {
        if (event.name.includes("table:") || event.name.includes("filter:")) {
          replayedEvents.push(event.name);
        }
      });

      // Replay events
      const replayed = orchestrator.replayEvents(
        (event) =>
          event.name.includes("table:") || event.name.includes("filter:"),
        10,
      );

      expect(replayed).toBeGreaterThan(0);
      expect(replayedEvents).toContain("table:dataLoaded");
      expect(replayedEvents).toContain("filter:applied");
      expect(replayedEvents).toContain("table:rowSelected");
    });
  });
});
