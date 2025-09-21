/**
 * TableComponent Unit Tests
 * US-082-B Component Architecture Development
 *
 * Tests:
 * - Component initialization
 * - Data rendering
 * - Sorting functionality
 * - Pagination
 * - Row selection
 * - Search/filtering
 * - Column visibility
 * - Accessibility features
 * - Responsive behavior
 */

// Import components
const TableComponent = require("../../../../src/groovy/umig/web/js/components/TableComponent");
const BaseComponent = require("../../../../src/groovy/umig/web/js/components/BaseComponent");
const SecurityUtils = require("../../../../src/groovy/umig/web/js/components/SecurityUtils");

// Make components available globally for TableComponent
global.BaseComponent = BaseComponent;
global.SecurityUtils = SecurityUtils;

describe("TableComponent", () => {
  let container;
  let component;
  let mockData;

  beforeEach(() => {
    // Create container element
    container = document.createElement("div");
    container.id = "test-table";
    document.body.appendChild(container);

    // Create mock data
    mockData = [
      {
        id: 1,
        name: "John Doe",
        email: "john@example.com",
        role: "Admin",
        status: "Active",
      },
      {
        id: 2,
        name: "Jane Smith",
        email: "jane@example.com",
        role: "User",
        status: "Active",
      },
      {
        id: 3,
        name: "Bob Johnson",
        email: "bob@example.com",
        role: "User",
        status: "Inactive",
      },
      {
        id: 4,
        name: "Alice Brown",
        email: "alice@example.com",
        role: "Admin",
        status: "Active",
      },
      {
        id: 5,
        name: "Charlie Wilson",
        email: "charlie@example.com",
        role: "User",
        status: "Active",
      },
    ];
  });

  afterEach(() => {
    // Clean up
    if (component) {
      component.destroy();
      component = null;
    }
    document.body.removeChild(container);
  });

  describe("Initialization", () => {
    test("should initialize with default configuration", () => {
      component = new TableComponent("test-table");
      component.initialize();

      expect(component.initialized).toBe(true);
      expect(component.config.pagination.enabled).toBe(true);
      expect(component.config.pagination.pageSize).toBe(25);
      expect(component.config.selection.enabled).toBe(true);
      expect(component.config.sorting.enabled).toBe(true);
    });

    test("should initialize with custom configuration", () => {
      component = new TableComponent("test-table", {
        pagination: { pageSize: 10 },
        selection: { enabled: false },
        sorting: { enabled: false },
      });
      component.initialize();

      expect(component.config.pagination.pageSize).toBe(10);
      expect(component.config.selection.enabled).toBe(false);
      expect(component.config.sorting.enabled).toBe(false);
    });

    test("should throw error if container not found", () => {
      component = new TableComponent("non-existent");

      expect(() => component.initialize()).toThrow(
        "Container element not found",
      );
    });
  });

  describe("Data Rendering", () => {
    beforeEach(() => {
      component = new TableComponent("test-table", {
        columns: [
          { key: "name", label: "Name", sortable: true },
          { key: "email", label: "Email", sortable: true },
          { key: "role", label: "Role", sortable: true },
          { key: "status", label: "Status", sortable: false },
        ],
        data: mockData,
        pagination: { pageSize: 3 },
      });
      component.initialize();
    });

    test("should render table with data", () => {
      // Debug visible columns and row data
      console.log("Visible columns:", component.getVisibleColumns());
      console.log("First row data:", component.paginatedData[0]);
      console.log("Selection enabled:", component.config.selection.enabled);
      console.log(
        "Selected rows:",
        Array.from(component.config.selection.selectedRows),
      );

      // Test direct HTML parsing
      const firstRow = component.paginatedData[0];
      const renderedRow = component.renderRow(firstRow, 0);

      console.log("Rendered row length:", renderedRow.length);
      console.log(
        "First 200 chars of rendered row:",
        renderedRow.substring(0, 200),
      );
      console.log(
        "Looking for data-row class:",
        renderedRow.indexOf('class="data-row'),
      );

      component.render();

      const rows = container.querySelectorAll(".data-row");
      expect(rows.length).toBe(3); // Due to pagination

      if (rows.length > 0) {
        const cells = rows[0].querySelectorAll(".data-cell");
        expect(cells[0].textContent).toBe("John Doe");
        expect(cells[1].textContent).toBe("john@example.com");
      }
    });

    test("should render column headers", () => {
      component.render();

      const headers = container.querySelectorAll(".header-cell");
      expect(headers.length).toBe(4);
      expect(headers[0].textContent).toContain("Name");
      expect(headers[1].textContent).toContain("Email");
    });

    test("should render empty state when no data", () => {
      component.setData([]);

      const emptyState = container.querySelector(".table-empty");
      expect(emptyState).toBeTruthy();
      expect(emptyState.textContent).toContain("No data available");
    });

    test("should render loading state", () => {
      component.setLoading(true);

      const loadingState = container.querySelector(".table-loading");
      expect(loadingState).toBeTruthy();
      expect(loadingState.textContent).toContain("Loading data...");
    });
  });

  describe("Sorting", () => {
    beforeEach(() => {
      component = new TableComponent("test-table", {
        columns: [
          { key: "name", label: "Name", sortable: true },
          { key: "role", label: "Role", sortable: true },
        ],
        data: mockData,
      });
      component.initialize();
      component.render();
    });

    test("should sort data by column", () => {
      component.sortBy("name", "asc");

      const sortedData = component.getFilteredData();
      expect(sortedData[0].name).toBe("Alice Brown");
      expect(sortedData[sortedData.length - 1].name).toBe("John Doe");
    });

    test("should toggle sort direction", () => {
      component.sortBy("name", "asc");
      component.handleSort("name");

      expect(component.config.sorting.direction).toBe("desc");

      const sortedData = component.getFilteredData();
      expect(sortedData[0].name).toBe("John Doe");
    });

    test("should emit sort event", () => {
      const sortHandler = jest.fn();
      component.on("sort", sortHandler);

      component.handleSort("name");

      expect(sortHandler).toHaveBeenCalledWith({
        column: "name",
        direction: "asc",
      });
    });

    test("should update ARIA attributes on sort", () => {
      component.sortBy("name", "asc");
      component.render();

      // Debug logging
      console.log("Container HTML:", container.innerHTML);
      console.log("Sorting config:", component.config.sorting);

      const nameHeader = container.querySelector('[data-column="name"]');
      console.log("Name header found:", !!nameHeader);
      if (nameHeader) {
        console.log("Name header attributes:", {
          "data-column": nameHeader.getAttribute("data-column"),
          "aria-sort": nameHeader.getAttribute("aria-sort"),
          class: nameHeader.getAttribute("class"),
        });
      }

      expect(nameHeader).toBeTruthy();
      expect(nameHeader.getAttribute("aria-sort")).toBe("asc");
    });
  });

  describe("Pagination", () => {
    beforeEach(() => {
      component = new TableComponent("test-table", {
        columns: [
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
        ],
        data: mockData,
        pagination: { pageSize: 2 },
      });
      component.initialize();
      component.render();
    });

    test("should paginate data correctly", () => {
      const rows = container.querySelectorAll(".data-row");
      expect(rows.length).toBe(2);

      const paginationInfo = container.querySelector(".pagination-info");
      expect(paginationInfo.textContent).toContain("Showing 1-2 of 5 items");
    });

    test("should navigate to next page", () => {
      component.goToPage(2);

      const rows = container.querySelectorAll(".data-row");
      expect(rows.length).toBe(2);

      const firstCell = rows[0].querySelector(".data-cell");
      expect(firstCell.textContent).toBe("Bob Johnson");
    });

    test("should navigate to last page", () => {
      component.goToPage(3);

      const rows = container.querySelectorAll(".data-row");
      expect(rows.length).toBe(1); // Last page has only 1 item

      const firstCell = rows[0].querySelector(".data-cell");
      expect(firstCell.textContent).toBe("Charlie Wilson");
    });

    test("should change page size", () => {
      component.setPageSize(3);

      const rows = container.querySelectorAll(".data-row");
      expect(rows.length).toBe(3);

      const paginationInfo = container.querySelector(".pagination-info");
      expect(paginationInfo.textContent).toContain("Showing 1-3 of 5 items");
    });

    test("should emit page change event", () => {
      const pageHandler = jest.fn();
      component.on("pageChange", pageHandler);

      component.goToPage(2);

      expect(pageHandler).toHaveBeenCalledWith({ page: 2 });
    });

    test("should disable navigation buttons appropriately", () => {
      // First page
      component.goToPage(1);

      const prevBtn = container.querySelector(".pagination-prev");
      const nextBtn = container.querySelector(".pagination-next");

      expect(prevBtn.disabled).toBe(true);
      expect(nextBtn.disabled).toBe(false);

      // Last page
      component.goToPage(3);

      expect(container.querySelector(".pagination-prev").disabled).toBe(false);
      expect(container.querySelector(".pagination-next").disabled).toBe(true);
    });
  });

  describe("Row Selection", () => {
    beforeEach(() => {
      component = new TableComponent("test-table", {
        columns: [
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
        ],
        data: mockData,
        selection: { enabled: true, multiple: true },
      });
      component.initialize();
      component.render();
    });

    test("should select individual rows", () => {
      component.handleRowSelect("1", true);

      expect(component.getSelection()).toEqual(["1"]);

      const row = container.querySelector('[data-row-id="1"]');
      expect(row.classList.contains("selected")).toBe(true);
      expect(row.getAttribute("aria-selected")).toBe("true");
    });

    test("should deselect rows", () => {
      component.handleRowSelect("1", true);
      component.handleRowSelect("1", false);

      expect(component.getSelection()).toEqual([]);

      const row = container.querySelector('[data-row-id="1"]');
      expect(row.classList.contains("selected")).toBe(false);
    });

    test("should select multiple rows", () => {
      component.handleRowSelect("1", true);
      component.handleRowSelect("2", true);
      component.handleRowSelect("3", true);

      expect(component.getSelection()).toEqual(["1", "2", "3"]);
    });

    test("should select all visible rows", () => {
      const selectAll = container.querySelector(".select-all");
      selectAll.checked = true;
      component.handleSelectAll({ target: selectAll });

      const selectedRows = component.getSelection();
      expect(selectedRows.length).toBeGreaterThan(0);

      const rows = container.querySelectorAll(".data-row");
      rows.forEach((row) => {
        expect(row.classList.contains("selected")).toBe(true);
      });
    });

    test("should clear selection", () => {
      component.handleRowSelect("1", true);
      component.handleRowSelect("2", true);

      component.clearSelection();

      expect(component.getSelection()).toEqual([]);
    });

    test("should emit selection change event", () => {
      const selectionHandler = jest.fn();
      component.on("selectionChange", selectionHandler);

      component.handleRowSelect("1", true);

      expect(selectionHandler).toHaveBeenCalledWith({
        selectedRows: ["1"],
      });
    });
  });

  describe("Search and Filtering", () => {
    beforeEach(() => {
      component = new TableComponent("test-table", {
        columns: [
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
        ],
        data: mockData,
        search: { enabled: true, highlightResults: true },
      });
      component.initialize();
    });

    test("should filter data by search term", () => {
      component.setSearchTerm("admin");

      const filteredData = component.getFilteredData();
      expect(filteredData.length).toBe(2);
      expect(filteredData[0].role).toBe("Admin");
      expect(filteredData[1].role).toBe("Admin");
    });

    test("should be case-insensitive search", () => {
      component.setSearchTerm("JOHN");

      const filteredData = component.getFilteredData();
      expect(filteredData.length).toBe(2); // John Doe and Bob Johnson
    });

    test("should search across all visible columns", () => {
      component.setSearchTerm("example.com");

      const filteredData = component.getFilteredData();
      expect(filteredData.length).toBe(5); // All have example.com email
    });

    test("should highlight search terms in results", () => {
      component.setSearchTerm("John");
      component.render();

      const marks = container.querySelectorAll("mark");
      expect(marks.length).toBeGreaterThan(0);
      expect(marks[0].textContent).toBe("John");
    });

    test("should reset to first page on search", () => {
      component.goToPage(2);
      component.setSearchTerm("admin");

      expect(component.config.pagination.currentPage).toBe(1);
    });
  });

  describe("Column Visibility", () => {
    beforeEach(() => {
      component = new TableComponent("test-table", {
        columns: [
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" },
          { key: "status", label: "Status" },
        ],
        data: mockData,
        columnVisibility: { enabled: true },
      });
      component.initialize();
      component.render();
    });

    test("should show all columns by default", () => {
      const headers = container.querySelectorAll(".header-cell");
      expect(headers.length).toBe(4);
    });

    test("should hide columns", () => {
      component.toggleColumnVisibility("email", false);
      component.toggleColumnVisibility("status", false);

      const headers = container.querySelectorAll(".header-cell");
      expect(headers.length).toBe(2);

      const visibleColumns = component.getVisibleColumns();
      expect(visibleColumns.length).toBe(2);
      expect(visibleColumns[0].key).toBe("name");
      expect(visibleColumns[1].key).toBe("role");
    });

    test("should toggle column visibility", () => {
      component.toggleColumnVisibility("email", false);
      expect(component.isColumnVisible("email")).toBe(false);

      component.toggleColumnVisibility("email", true);
      expect(component.isColumnVisible("email")).toBe(true);
    });

    test("should update column dropdown checkboxes", () => {
      component.toggleColumnVisibility("email", false);
      component.render();

      const emailCheckbox = container.querySelector('[data-column="email"]');
      expect(emailCheckbox.checked).toBe(false);
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      component = new TableComponent("test-table", {
        columns: [
          { key: "name", label: "Name", sortable: true },
          { key: "email", label: "Email", sortable: true },
        ],
        data: mockData,
        accessibility: true,
      });
      component.initialize();
      component.render();
    });

    test("should have proper ARIA roles", () => {
      const table = container.querySelector('[role="table"]');
      expect(table).toBeTruthy();

      const rows = container.querySelectorAll('[role="row"]');
      expect(rows.length).toBeGreaterThan(0);

      const cells = container.querySelectorAll('[role="cell"]');
      expect(cells.length).toBeGreaterThan(0);

      const headers = container.querySelectorAll('[role="columnheader"]');
      expect(headers.length).toBeGreaterThan(0);
    });

    test("should have ARIA labels for interactive elements", () => {
      const selectAll = container.querySelector(".select-all");
      expect(selectAll.getAttribute("aria-label")).toBe("Select all rows");

      const sortableHeader = container.querySelector(".sortable");
      expect(sortableHeader.getAttribute("aria-sort")).toBe("none");
    });

    test("should announce state changes", () => {
      const announceSpy = jest.spyOn(component, "announce");

      component.handleSort("name");

      expect(announceSpy).toHaveBeenCalledWith(
        "Table sorted by name ascending",
      );
    });

    test("should support keyboard navigation", () => {
      // Initialize component with data to enable keyboard navigation
      component = new TableComponent("test-table", {
        columns: [
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
        ],
        data: mockData,
      });
      component.initialize();
      component.render();

      const event = new KeyboardEvent("keydown", {
        key: "ArrowDown",
        cancelable: true,
      });
      container.dispatchEvent(event);

      // Verify focus moved (would need more setup in real test)
      expect(event.defaultPrevented).toBe(true);
    });

    test("should have proper contrast ratios", async () => {
      // This would use axe-core in a real test
      const results = await global.runAccessibilityTests(container);

      expect(results.isAccessible).toBe(true);
    });
  });

  describe("Responsive Behavior", () => {
    beforeEach(() => {
      component = new TableComponent("test-table", {
        columns: [
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
        ],
        data: mockData,
        responsive: true,
      });
      component.initialize();
    });

    test("should adjust for mobile breakpoint", () => {
      component.onBreakpointChange("mobile");

      expect(component.config.pagination.pageSize).toBe(10);
      expect(component.currentBreakpoint).toBe("mobile");
    });

    test("should detect breakpoint from width", () => {
      expect(component.getBreakpoint(375)).toBe("mobile");
      expect(component.getBreakpoint(768)).toBe("tablet");
      expect(component.getBreakpoint(1024)).toBe("desktop");
    });

    test("should emit breakpoint change event", () => {
      const breakpointHandler = jest.fn();
      component.on("breakpointChange", breakpointHandler);

      component.handleResize(375);

      expect(breakpointHandler).toHaveBeenCalledWith("mobile");
    });
  });

  describe("Custom Renderers", () => {
    beforeEach(() => {
      component = new TableComponent("test-table", {
        columns: [
          { key: "name", label: "Name" },
          { key: "status", label: "Status" },
        ],
        data: mockData,
      });
      component.initialize();
    });

    test("should apply custom renderer to column", () => {
      const statusRenderer = (value) => {
        return value === "Active"
          ? '<span class="badge-active">Active</span>'
          : '<span class="badge-inactive">Inactive</span>';
      };

      component.addCustomRenderer("status", statusRenderer);
      component.render();

      const activeBadge = container.querySelector(".badge-active");
      expect(activeBadge).toBeTruthy();
      expect(activeBadge.textContent).toBe("Active");
    });

    test("should remove custom renderer", () => {
      const renderer = jest.fn((value) => value);
      component.addCustomRenderer("name", renderer);
      component.removeCustomRenderer("name");
      component.render();

      expect(renderer).not.toHaveBeenCalled();
    });
  });

  describe("Data Export", () => {
    beforeEach(() => {
      component = new TableComponent("test-table", {
        columns: [
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
          { key: "role", label: "Role" }, // Added role column for proper search testing
        ],
        data: mockData,
        export: { enabled: true },
      });
      component.initialize();

      // Mock download functionality
      global.URL.createObjectURL = jest.fn(() => "blob:mock");
      global.URL.revokeObjectURL = jest.fn();
    });

    test("should export data as CSV", () => {
      const createElementSpy = jest.spyOn(document, "createElement");

      component.exportData("csv");

      expect(createElementSpy).toHaveBeenCalledWith("a");

      const link = createElementSpy.mock.results[0].value;
      expect(link.download).toBe("data.csv");
    });

    test("should export filtered data", () => {
      component.setSearchTerm("Admin");

      const exportData = component.getExportData();
      expect(exportData.length).toBe(2);
      expect(exportData[0].role).toBe("Admin");
    });

    test("should export selected rows only", () => {
      component.handleRowSelect("1", true);
      component.handleRowSelect("3", true);

      const exportData = component.getExportData();
      expect(exportData.length).toBe(2);
    });

    test("should emit export event", () => {
      const exportHandler = jest.fn();
      component.on("export", exportHandler);

      component.exportData("csv");

      expect(exportHandler).toHaveBeenCalledWith({
        format: "csv",
        rowCount: 5,
      });
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      component = new TableComponent("test-table", {
        columns: [{ key: "name", label: "Name" }],
        data: mockData,
        errorBoundary: true,
      });
      component.initialize();
    });

    test("should handle rendering errors gracefully", () => {
      // Force an error
      component.config.columns = null;

      expect(() => component.render()).not.toThrow();

      const errorState = container.querySelector(".component-error");
      expect(errorState).toBeTruthy();
    });

    test("should emit error event", () => {
      const errorHandler = jest.fn();
      component.on("error", errorHandler);

      const error = new Error("Test error");
      component.handleError(error, "test");

      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error,
          context: "test",
        }),
      );
    });

    test("should recover from error state", () => {
      component.handleError(new Error("Test"), "test");
      component.clearError();

      expect(component.errorState).toBeNull();
    });
  });

  describe("Performance", () => {
    test("should track render metrics", () => {
      component = new TableComponent("test-table", {
        columns: [{ key: "name", label: "Name" }],
        data: mockData,
        performanceMonitoring: true,
      });
      component.initialize();

      component.render();
      component.render();

      const metrics = component.getPerformanceMetrics();

      expect(metrics.renderCount).toBe(2);
      expect(metrics.lastRenderTime).toBeGreaterThan(0);
      expect(metrics.averageRenderTime).toBeGreaterThan(0);
    });

    test("should handle large datasets efficiently", () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
      }));

      component = new TableComponent("test-table", {
        columns: [
          { key: "name", label: "Name" },
          { key: "email", label: "Email" },
        ],
        data: largeData,
        pagination: { pageSize: 50 },
      });

      const startTime = performance.now();
      component.initialize();
      component.render();
      const endTime = performance.now();

      // Should render within reasonable time (adjusted for jsdom test environment)
      expect(endTime - startTime).toBeLessThan(2000);

      // Should only render visible rows
      const rows = container.querySelectorAll(".data-row");
      expect(rows.length).toBe(50);
    });
  });
});
