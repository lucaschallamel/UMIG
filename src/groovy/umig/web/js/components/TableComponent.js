/**
 * TableComponent - Reusable Data Table Component
 * US-082-B Component Architecture Development
 *
 * Features:
 * - Sortable columns with visual indicators
 * - Multi-row selection with bulk operations
 * - Configurable pagination
 * - Responsive design for mobile/tablet
 * - Dynamic column configuration
 * - Keyboard navigation and accessibility (WCAG AA)
 * - Loading states and empty state handling
 * - Row-level actions with role-based visibility
 * - Search highlighting and filtering integration
 */

// Import BaseComponent for Node.js/testing environment
let BaseComponent;
if (typeof require !== "undefined") {
  BaseComponent = require("./BaseComponent");
} else if (typeof window !== "undefined") {
  BaseComponent = window.BaseComponent;
}

// Import SecurityUtils for safe HTML handling
let SecurityUtils;
if (typeof require !== "undefined") {
  try {
    SecurityUtils = require("./SecurityUtils");
  } catch (e) {
    // SecurityUtils not available in this environment
  }
} else if (typeof window !== "undefined") {
  SecurityUtils = window.SecurityUtils;
}

class TableComponent extends BaseComponent {
  constructor(containerId, config = {}) {
    super(containerId, config);

    // Merge TableComponent-specific configuration with defaults
    this.config = {
      ...this.config,
      columns: config.columns || [],
      data: config.data || [],
      pagination: {
        enabled: true,
        pageSize: 25,
        pageSizeOptions: [10, 25, 50, 100],
        currentPage: 1,
        ...(config.pagination || {}),
      },
      selection: {
        enabled: true,
        multiple: true,
        selectedRows: new Set(),
        ...(config.selection || {}),
      },
      sorting: {
        enabled: true,
        column: null,
        direction: "asc",
        ...(config.sorting || {}),
      },
      actions: {
        edit: true,
        delete: true,
        view: false,
        custom: [],
        ...(config.actions || {}),
      },
      search: {
        enabled: true,
        term: "",
        highlightResults: true,
        ...(config.search || {}),
      },
      export: {
        enabled: false,
        formats: ["csv", "json", "xlsx"],
        ...(config.export || {}),
      },
      columnVisibility: {
        enabled: true,
        visibleColumns: null,
        ...(config.columnVisibility || {}),
      },
      loading: false,
      emptyMessage: "No data available",
    };

    // Internal state
    this.processedData = [];
    this.filteredData = [];
    this.paginatedData = [];
    this.customRenderers = new Map();

    // Bind methods
    this.handleSort = this.handleSort.bind(this);
    this.handleRowSelect = this.handleRowSelect.bind(this);
    this.handleSelectAll = this.handleSelectAll.bind(this);
    this.handlePageChange = this.handlePageChange.bind(this);
    this.handlePageSizeChange = this.handlePageSizeChange.bind(this);
    this.handleRowAction = this.handleRowAction.bind(this);
    this.handleKeyNavigation = this.handleKeyNavigation.bind(this);
  }

  /**
   * Component initialization
   */
  onInitialize() {
    // Process initial data
    this.processData();

    // Setup keyboard navigation
    this.setupKeyboardNavigation();
  }

  /**
   * Component rendering
   */
  onRender() {
    // Clear container safely
    this.clearContainer();

    // Create main wrapper
    const wrapper = document.createElement("div");
    wrapper.className = `table-component ${this.currentBreakpoint || "desktop"}`;
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "Data table");

    // Use SecurityUtils to safely set inner HTML with sanitization
    if (SecurityUtils && SecurityUtils.safeSetInnerHTML) {
      SecurityUtils.safeSetInnerHTML(
        wrapper,
        this.renderToolbar() +
          this.renderTable() +
          this.renderPagination() +
          this.renderLoadingOverlay(),
        {
          allowedTags: [
            "div",
            "table",
            "thead",
            "tbody",
            "tfoot",
            "tr",
            "th",
            "td",
            "button",
            "input",
            "select",
            "option",
            "label",
            "span",
            "strong",
            "em",
            "mark",
            "a",
            "ul",
            "ol",
            "li",
          ],
          allowedAttributes: {
            div: ["class", "role", "aria-label", "aria-hidden"],
            table: ["class", "role", "aria-label"],
            thead: ["class"],
            tbody: ["class"],
            tfoot: ["class"],
            tr: ["class", "data-row-id", "role", "aria-selected"],
            th: [
              "class",
              "scope",
              "data-field",
              "data-column",
              "aria-sort",
              "aria-label",
              "role",
            ],
            td: ["class", "data-field", "role"],
            button: [
              "class",
              "type",
              "aria-label",
              "disabled",
              "data-action",
              "data-row-id",
              "data-format",
            ],
            input: [
              "type",
              "class",
              "value",
              "placeholder",
              "aria-label",
              "data-row-id",
              "data-column",
              "checked",
            ],
            select: ["class", "aria-label"],
            label: ["class"],
            a: ["href", "class"],
            span: ["class", "aria-hidden"],
            mark: ["class"],
          },
          allowedClasses: [
            // Table component base classes
            "table-component",
            "desktop",
            "tablet",
            "mobile",

            // Table structure classes
            "table-toolbar",
            "table-wrapper",
            "table-responsive",
            "data-table",
            "table-header",
            "table-body",
            "data-row",
            "data-cell",
            "header-cell",
            "header-content",
            "actions-column",
            "select-all",

            // Interactive and state classes
            "sortable",
            "sorted",
            "sorted-asc",
            "sorted-desc",
            "selected",
            "selectable",
            "action-btn",
            "action-view",
            "action-edit",
            "action-delete",
            "sort-indicator",

            // Pagination classes
            "pagination",
            "pagination-info",
            "pagination-controls",
            "page-button",
            "pagination-next",
            "pagination-prev",
            "current",
            "disabled",

            // Loading and state classes
            "loading-overlay",
            "loading-spinner",
            "empty-state",
            "error-state",
            "table-loading",
            "table-empty",

            // Export and toolbar classes
            "export-form",
            "form-row",
            "form-group",
            "export-button",

            // Utility classes
            "sr-only",
            "hidden",
            "btn",
            "btn-primary",
            "btn-secondary",
            "btn-sm",

            // Badge and status classes
            "badge",
            "badge-active",
            "badge-inactive",
            "badge-primary",
            "badge-secondary",
            "badge-success",
            "badge-warning",
            "badge-danger",
            "badge-info",

            // Search and highlight classes
            "highlight",
            "search-highlight",
            "filtered",

            // Responsive classes
            "responsive-table",
            "mobile-view",
            "tablet-view",
            "desktop-view",
          ],
        },
      );
    } else {
      // Fallback if SecurityUtils not available
      wrapper.innerHTML =
        this.renderToolbar() +
        this.renderTable() +
        this.renderPagination() +
        this.renderLoadingOverlay();
    }

    this.container.appendChild(wrapper);
    this.setupDOMListeners();
  }

  /**
   * Render toolbar with actions and column visibility
   */
  renderToolbar() {
    if (!this.config.export.enabled && !this.config.columnVisibility.enabled) {
      return "";
    }

    return `
      <div class="table-toolbar">
        ${this.config.export.enabled ? this.renderExportButtons() : ""}
        ${this.config.columnVisibility.enabled ? this.renderColumnToggle() : ""}
      </div>
    `;
  }

  /**
   * Render export buttons
   */
  renderExportButtons() {
    const buttons = this.config.export.formats
      .map(
        (format) => `
      <button class="btn-export" data-format="${format}" aria-label="Export as ${format.toUpperCase()}">
        Export ${format.toUpperCase()}
      </button>
    `,
      )
      .join("");

    return `<div class="export-buttons">${buttons}</div>`;
  }

  /**
   * Render column visibility toggle
   */
  renderColumnToggle() {
    return `
      <div class="column-toggle">
        <button class="btn-column-toggle" aria-label="Toggle column visibility">
          Columns
        </button>
        <div class="column-dropdown hidden" role="menu">
          ${this.config.columns
            .map(
              (col) => `
            <label class="column-option">
              <input type="checkbox" 
                     data-column="${col.key}" 
                     ${this.isColumnVisible(col.key) ? "checked" : ""}
                     aria-label="Toggle ${col.label} column">
              ${col.label}
            </label>
          `,
            )
            .join("")}
        </div>
      </div>
    `;
  }

  /**
   * Render main table
   */
  renderTable() {
    if (this.config.loading) {
      return this.renderLoadingState();
    }

    if (this.paginatedData.length === 0) {
      return this.renderEmptyState();
    }

    return `
      <div class="table-wrapper" role="table">
        <table class="data-table" aria-label="Data table">
          ${this.renderTableHeader()}
          ${this.renderTableBody()}
        </table>
      </div>
    `;
  }

  /**
   * Render table header
   */
  renderTableHeader() {
    const visibleColumns = this.getVisibleColumns();

    return `
      <thead>
        <tr role="row">
          ${
            this.config.selection.enabled
              ? `
            <th class="select-column" role="columnheader">
              <input type="checkbox" 
                     class="select-all" 
                     aria-label="Select all rows"
                     ${this.areAllRowsSelected() ? "checked" : ""}>
            </th>
          `
              : ""
          }
          ${visibleColumns.map((col) => this.renderHeaderCell(col)).join("")}
          ${this.hasRowActions() ? '<th class="actions-column" role="columnheader">Actions</th>' : ""}
        </tr>
      </thead>
    `;
  }

  /**
   * Render header cell with sorting
   */
  renderHeaderCell(column) {
    const isSortable = this.config.sorting.enabled && column.sortable !== false;
    const isSorted = this.config.sorting.column === column.key;
    const sortDirection = isSorted ? this.config.sorting.direction : null;

    return `
      <th class="header-cell ${isSortable ? "sortable" : ""} ${isSorted ? "sorted" : ""}"
          role="columnheader"
          aria-sort="${isSorted ? sortDirection : "none"}"
          ${isSortable ? `data-column="${column.key}"` : ""}>
        <div class="header-content">
          <span>${column.label}</span>
          ${
            isSortable
              ? `
            <span class="sort-indicator" aria-hidden="true">
              ${isSorted && sortDirection === "asc" ? "▲" : ""}
              ${isSorted && sortDirection === "desc" ? "▼" : ""}
              ${!isSorted ? "◆" : ""}
            </span>
          `
              : ""
          }
        </div>
      </th>
    `;
  }

  /**
   * Render table body
   */
  renderTableBody() {
    return `
      <tbody>
        ${this.paginatedData.map((row, index) => this.renderRow(row, index)).join("")}
      </tbody>
    `;
  }

  /**
   * Render table row
   */
  renderRow(row, index) {
    const visibleColumns = this.getVisibleColumns();
    const rowId = row.id || this.config.data.indexOf(row);
    const isSelected = this.config.selection.selectedRows.has(rowId);

    return `
      <tr class="data-row ${isSelected ? "selected" : ""}" 
          data-row-id="${rowId}"
          role="row"
          aria-selected="${isSelected}">
        ${
          this.config.selection.enabled
            ? `
          <td class="select-column" role="cell">
            <input type="checkbox" 
                   class="row-select" 
                   data-row-id="${rowId}"
                   aria-label="Select row ${index + 1}"
                   ${isSelected ? "checked" : ""}>
          </td>
        `
            : ""
        }
        ${visibleColumns.map((col) => this.renderCell(row, col)).join("")}
        ${this.hasRowActions() ? this.renderActionCell(row, rowId) : ""}
      </tr>
    `;
  }

  /**
   * Render table cell
   */
  renderCell(row, column) {
    let value = row[column.key];

    // Apply custom renderer if available
    if (this.customRenderers.has(column.key)) {
      value = this.customRenderers.get(column.key)(value, row);
    } else if (column.renderer) {
      value = column.renderer(value, row);
    }

    // Apply search highlighting
    if (this.config.search.highlightResults && this.config.search.term) {
      value = this.highlightSearchTerm(value, this.config.search.term);
    }

    return `<td class="data-cell" role="cell" data-column="${column.key}">${value}</td>`;
  }

  /**
   * Render action cell
   */
  renderActionCell(row, rowId) {
    const actions = [];

    if (this.config.actions.view) {
      actions.push(`
        <button class="action-btn action-view" 
                data-action="view" 
                data-row-id="${rowId}"
                aria-label="View row">
          View
        </button>
      `);
    }

    if (this.config.actions.edit) {
      actions.push(`
        <button class="action-btn action-edit" 
                data-action="edit" 
                data-row-id="${rowId}"
                aria-label="Edit row">
          Edit
        </button>
      `);
    }

    if (this.config.actions.delete) {
      actions.push(`
        <button class="action-btn action-delete" 
                data-action="delete" 
                data-row-id="${rowId}"
                aria-label="Delete row">
          Delete
        </button>
      `);
    }

    // Add custom actions
    this.config.actions.custom.forEach((action) => {
      actions.push(`
        <button class="action-btn action-custom" 
                data-action="${action.key}" 
                data-row-id="${rowId}"
                aria-label="${action.label}">
          ${action.label}
        </button>
      `);
    });

    return `
      <td class="actions-column" role="cell">
        <div class="action-buttons">
          ${actions.join("")}
        </div>
      </td>
    `;
  }

  /**
   * Render pagination controls
   */
  renderPagination() {
    if (!this.config.pagination.enabled || this.filteredData.length === 0) {
      return "";
    }

    const totalPages = Math.ceil(
      this.filteredData.length / this.config.pagination.pageSize,
    );
    const currentPage = this.config.pagination.currentPage;
    const startItem = (currentPage - 1) * this.config.pagination.pageSize + 1;
    const endItem = Math.min(
      currentPage * this.config.pagination.pageSize,
      this.filteredData.length,
    );

    return `
      <div class="table-pagination" role="navigation" aria-label="Table pagination">
        <div class="pagination-info">
          Showing ${startItem}-${endItem} of ${this.filteredData.length} items
        </div>
        <div class="pagination-controls">
          <select class="page-size-select" aria-label="Items per page">
            ${this.config.pagination.pageSizeOptions
              .map(
                (size) => `
              <option value="${size}" ${size === this.config.pagination.pageSize ? "selected" : ""}>
                ${size} per page
              </option>
            `,
              )
              .join("")}
          </select>
          <button class="pagination-btn pagination-first" 
                  ${currentPage === 1 ? "disabled" : ""}
                  aria-label="First page">
            ⟨⟨
          </button>
          <button class="pagination-btn pagination-prev" 
                  ${currentPage === 1 ? "disabled" : ""}
                  aria-label="Previous page">
            ⟨
          </button>
          <span class="pagination-current">
            Page ${currentPage} of ${totalPages}
          </span>
          <button class="pagination-btn pagination-next" 
                  ${currentPage === totalPages ? "disabled" : ""}
                  aria-label="Next page">
            ⟩
          </button>
          <button class="pagination-btn pagination-last" 
                  ${currentPage === totalPages ? "disabled" : ""}
                  aria-label="Last page">
            ⟩⟩
          </button>
        </div>
      </div>
    `;
  }

  /**
   * Render loading state
   */
  renderLoadingState() {
    return `
      <div class="table-loading" role="status" aria-live="polite">
        <div class="loading-spinner"></div>
        <span>Loading data...</span>
      </div>
    `;
  }

  /**
   * Render loading overlay
   */
  renderLoadingOverlay() {
    return `
      <div class="loading-overlay ${this.config.loading ? "visible" : "hidden"}" role="status" aria-live="polite">
        <div class="loading-spinner"></div>
      </div>
    `;
  }

  /**
   * Render empty state
   */
  renderEmptyState() {
    return `
      <div class="table-empty" role="status">
        <p>${this.config.emptyMessage}</p>
      </div>
    `;
  }

  /**
   * Data processing
   */
  processData() {
    // Apply search filter
    this.filteredData = this.applySearch(this.config.data);

    // Apply sorting
    if (this.config.sorting.column) {
      this.filteredData = this.applySort(this.filteredData);
    }

    // Apply pagination
    this.paginatedData = this.applyPagination(this.filteredData);
  }

  /**
   * Apply search filter
   */
  applySearch(data) {
    if (!this.config.search.term) {
      return data;
    }

    const searchTerm = this.config.search.term.toLowerCase();
    const visibleColumns = this.getVisibleColumns();

    return data.filter((row) => {
      return visibleColumns.some((col) => {
        const value = String(row[col.key] || "").toLowerCase();
        return value.includes(searchTerm);
      });
    });
  }

  /**
   * Apply sorting
   */
  applySort(data) {
    const column = this.config.columns.find(
      (col) => col.key === this.config.sorting.column,
    );
    if (!column) return data;

    const sorted = [...data].sort((a, b) => {
      let aVal = a[column.key];
      let bVal = b[column.key];

      // Handle null/undefined
      if (aVal == null) return 1;
      if (bVal == null) return -1;

      // Custom sort function
      if (column.sortFn) {
        return column.sortFn(aVal, bVal);
      }

      // Default sort
      if (typeof aVal === "number" && typeof bVal === "number") {
        return aVal - bVal;
      }

      return String(aVal).localeCompare(String(bVal));
    });

    return this.config.sorting.direction === "desc" ? sorted.reverse() : sorted;
  }

  /**
   * Apply pagination
   */
  applyPagination(data) {
    if (!this.config.pagination.enabled) {
      return data;
    }

    const start =
      (this.config.pagination.currentPage - 1) *
      this.config.pagination.pageSize;
    const end = start + this.config.pagination.pageSize;

    return data.slice(start, end);
  }

  /**
   * DOM Event Listeners
   */
  setupDOMListeners() {
    // Sorting
    if (this.config.sorting.enabled) {
      this.container.querySelectorAll(".sortable").forEach((header) => {
        this.addDOMListener(header, "click", () => {
          this.handleSort(header.dataset.column);
        });
      });
    }

    // Selection
    if (this.config.selection.enabled) {
      // Select all
      const selectAll = this.container.querySelector(".select-all");
      if (selectAll) {
        this.addDOMListener(selectAll, "change", this.handleSelectAll);
      }

      // Individual row selection
      this.container.querySelectorAll(".row-select").forEach((checkbox) => {
        this.addDOMListener(checkbox, "change", (e) => {
          this.handleRowSelect(checkbox.dataset.rowId, e.target.checked);
        });
      });
    }

    // Pagination
    if (this.config.pagination.enabled) {
      // Page size
      const pageSizeSelect = this.container.querySelector(".page-size-select");
      if (pageSizeSelect) {
        this.addDOMListener(pageSizeSelect, "change", (e) => {
          this.handlePageSizeChange(parseInt(e.target.value));
        });
      }

      // Navigation buttons
      const firstBtn = this.container.querySelector(".pagination-first");
      if (firstBtn) {
        this.addDOMListener(firstBtn, "click", () => this.goToPage(1));
      }

      const prevBtn = this.container.querySelector(".pagination-prev");
      if (prevBtn) {
        this.addDOMListener(prevBtn, "click", () =>
          this.goToPage(this.config.pagination.currentPage - 1),
        );
      }

      const nextBtn = this.container.querySelector(".pagination-next");
      if (nextBtn) {
        this.addDOMListener(nextBtn, "click", () =>
          this.goToPage(this.config.pagination.currentPage + 1),
        );
      }

      const lastBtn = this.container.querySelector(".pagination-last");
      if (lastBtn) {
        const totalPages = Math.ceil(
          this.filteredData.length / this.config.pagination.pageSize,
        );
        this.addDOMListener(lastBtn, "click", () => this.goToPage(totalPages));
      }
    }

    // Row actions
    this.container.querySelectorAll(".action-btn").forEach((btn) => {
      this.addDOMListener(btn, "click", () => {
        this.handleRowAction(btn.dataset.action, btn.dataset.rowId);
      });
    });

    // Export buttons
    this.container.querySelectorAll(".btn-export").forEach((btn) => {
      this.addDOMListener(btn, "click", () => {
        this.exportData(btn.dataset.format);
      });
    });

    // Column visibility toggle
    const columnToggle = this.container.querySelector(".btn-column-toggle");
    if (columnToggle) {
      this.addDOMListener(columnToggle, "click", () => {
        const dropdown = this.container.querySelector(".column-dropdown");
        dropdown.classList.toggle("hidden");
      });
    }

    // Column visibility checkboxes
    this.container
      .querySelectorAll(".column-option input")
      .forEach((checkbox) => {
        this.addDOMListener(checkbox, "change", () => {
          this.toggleColumnVisibility(
            checkbox.dataset.column,
            checkbox.checked,
          );
        });
      });
  }

  /**
   * Event handlers
   */
  handleSort(column) {
    if (this.config.sorting.column === column) {
      // Toggle direction
      this.config.sorting.direction =
        this.config.sorting.direction === "asc" ? "desc" : "asc";
    } else {
      // New column
      this.config.sorting.column = column;
      this.config.sorting.direction = "asc";
    }

    this.processData();
    this.render();

    this.emit("sort", {
      column: this.config.sorting.column,
      direction: this.config.sorting.direction,
    });

    this.announce(
      `Table sorted by ${column} ${this.config.sorting.direction}ending`,
    );
  }

  handleRowSelect(rowId, selected) {
    if (selected) {
      this.config.selection.selectedRows.add(rowId);
    } else {
      this.config.selection.selectedRows.delete(rowId);
    }

    // Update row appearance
    const row = this.container.querySelector(`tr[data-row-id="${rowId}"]`);
    if (row) {
      row.classList.toggle("selected", selected);
      row.setAttribute("aria-selected", selected);
    }

    // Update select all checkbox
    this.updateSelectAllCheckbox();

    this.emit("selectionChange", {
      selectedRows: Array.from(this.config.selection.selectedRows),
    });
  }

  handleSelectAll(e) {
    const checked = e.target.checked;

    if (checked) {
      // Select all visible rows
      this.paginatedData.forEach((row) => {
        const rowId = row.id || this.config.data.indexOf(row);
        this.config.selection.selectedRows.add(rowId);
      });
    } else {
      // Deselect all
      this.config.selection.selectedRows.clear();
    }

    // Update UI
    this.container.querySelectorAll(".row-select").forEach((checkbox) => {
      checkbox.checked = checked;
    });

    this.container.querySelectorAll(".data-row").forEach((row) => {
      row.classList.toggle("selected", checked);
      row.setAttribute("aria-selected", checked);
    });

    this.emit("selectionChange", {
      selectedRows: Array.from(this.config.selection.selectedRows),
    });

    this.announce(checked ? "All rows selected" : "All rows deselected");
  }

  handlePageChange(page) {
    this.goToPage(page);
  }

  handlePageSizeChange(size) {
    this.setPageSize(size);
  }

  handleRowAction(action, rowId) {
    const row = this.config.data.find(
      (r) => (r.id || this.config.data.indexOf(r)) == rowId,
    );

    this.emit("rowAction", {
      action,
      rowId,
      row,
    });
  }

  /**
   * Keyboard navigation
   */
  setupKeyboardNavigation() {
    this.addDOMListener(this.container, "keydown", this.handleKeyNavigation);
  }

  handleKeyNavigation(e) {
    // Navigate between rows with arrow keys
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      this.navigateRows(e.key === "ArrowUp" ? -1 : 1);
    }

    // Select row with space
    if (e.key === " " && this.config.selection.enabled) {
      e.preventDefault();
      this.toggleCurrentRowSelection();
    }

    // Navigate pages with Page Up/Down
    if (e.key === "PageUp") {
      e.preventDefault();
      this.goToPage(this.config.pagination.currentPage - 1);
    }

    if (e.key === "PageDown") {
      e.preventDefault();
      this.goToPage(this.config.pagination.currentPage + 1);
    }
  }

  navigateRows(direction) {
    const rows = Array.from(this.container.querySelectorAll(".data-row"));
    const currentIndex = rows.findIndex((row) =>
      row.classList.contains("focused"),
    );

    let newIndex = currentIndex + direction;
    if (newIndex < 0) newIndex = 0;
    if (newIndex >= rows.length) newIndex = rows.length - 1;

    rows.forEach((row) => row.classList.remove("focused"));
    if (rows[newIndex]) {
      rows[newIndex].classList.add("focused");
      rows[newIndex].focus();
    }
  }

  toggleCurrentRowSelection() {
    const focusedRow = this.container.querySelector(".data-row.focused");
    if (focusedRow) {
      const checkbox = focusedRow.querySelector(".row-select");
      if (checkbox) {
        checkbox.checked = !checkbox.checked;
        this.handleRowSelect(checkbox.dataset.rowId, checkbox.checked);
      }
    }
  }

  /**
   * Public API methods
   */
  setData(data) {
    this.config.data = data;
    this.processData();
    this.render();
  }

  getData() {
    return this.config.data;
  }

  getFilteredData() {
    return this.filteredData;
  }

  getSelection() {
    return Array.from(this.config.selection.selectedRows);
  }

  clearSelection() {
    this.config.selection.selectedRows.clear();
    this.render();
    this.emit("selectionChange", { selectedRows: [] });
  }

  setSearchTerm(term) {
    this.config.search.term = term;
    this.config.pagination.currentPage = 1; // Reset to first page
    this.processData();
    this.render();
  }

  sortBy(column, direction = "asc") {
    this.config.sorting.column = column;
    this.config.sorting.direction = direction;
    this.processData();
    this.render();
  }

  goToPage(page) {
    const totalPages = Math.ceil(
      this.filteredData.length / this.config.pagination.pageSize,
    );

    if (page < 1) page = 1;
    if (page > totalPages) page = totalPages;

    this.config.pagination.currentPage = page;
    this.processData();
    this.render();

    this.emit("pageChange", { page });
    this.announce(`Page ${page} of ${totalPages}`);
  }

  setPageSize(size) {
    this.config.pagination.pageSize = size;
    this.config.pagination.currentPage = 1; // Reset to first page
    this.processData();
    this.render();

    this.emit("pageSizeChange", { pageSize: size });
  }

  setLoading(loading) {
    this.config.loading = loading;
    this.render();
  }

  /**
   * Column visibility
   */
  getVisibleColumns() {
    if (!this.config.columnVisibility.visibleColumns) {
      return this.config.columns;
    }

    return this.config.columns.filter((col) =>
      this.config.columnVisibility.visibleColumns.includes(col.key),
    );
  }

  isColumnVisible(columnKey) {
    if (!this.config.columnVisibility.visibleColumns) {
      return true;
    }
    return this.config.columnVisibility.visibleColumns.includes(columnKey);
  }

  setColumnVisibility(columns) {
    this.config.columnVisibility.visibleColumns = columns;
    this.render();
  }

  toggleColumnVisibility(column, visible) {
    if (!this.config.columnVisibility.visibleColumns) {
      this.config.columnVisibility.visibleColumns = this.config.columns.map(
        (c) => c.key,
      );
    }

    if (visible) {
      if (!this.config.columnVisibility.visibleColumns.includes(column)) {
        this.config.columnVisibility.visibleColumns.push(column);
      }
    } else {
      const index = this.config.columnVisibility.visibleColumns.indexOf(column);
      if (index > -1) {
        this.config.columnVisibility.visibleColumns.splice(index, 1);
      }
    }

    this.render();
  }

  /**
   * Custom renderers
   */
  addCustomRenderer(column, renderer) {
    this.customRenderers.set(column, renderer);
    this.render();
  }

  removeCustomRenderer(column) {
    this.customRenderers.delete(column);
    this.render();
  }

  /**
   * Data export
   */
  exportData(format = "csv") {
    const data = this.getExportData();

    switch (format) {
      case "csv":
        this.exportAsCSV(data);
        break;
      case "json":
        this.exportAsJSON(data);
        break;
      case "xlsx":
        this.exportAsExcel(data);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    this.emit("export", { format, rowCount: data.length });
  }

  getExportData() {
    // Export filtered data or selected rows
    if (this.config.selection.selectedRows.size > 0) {
      return this.filteredData.filter((row) => {
        const rowId = row.id || this.config.data.indexOf(row);
        return this.config.selection.selectedRows.has(rowId);
      });
    }
    return this.filteredData;
  }

  exportAsCSV(data) {
    const visibleColumns = this.getVisibleColumns();
    const headers = visibleColumns.map((col) => col.label).join(",");

    const rows = data.map((row) => {
      return visibleColumns
        .map((col) => {
          const value = row[col.key];
          // Escape values containing commas or quotes
          if (
            typeof value === "string" &&
            (value.includes(",") || value.includes('"'))
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(",");
    });

    const csv = [headers, ...rows].join("\n");
    this.downloadFile(csv, "data.csv", "text/csv");
  }

  exportAsJSON(data) {
    const json = JSON.stringify(data, null, 2);
    this.downloadFile(json, "data.json", "application/json");
  }

  exportAsExcel(data) {
    // This would require a library like SheetJS in production
    console.warn("Excel export requires additional library");
    this.emit("exportError", { format: "xlsx", error: "Not implemented" });
  }

  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  /**
   * Utility methods
   */
  highlightSearchTerm(text, term) {
    if (!text || !term) return text;

    // Use SecurityUtils for safe highlighting if available
    if (SecurityUtils && SecurityUtils.highlightSearchTerm) {
      return SecurityUtils.highlightSearchTerm(text, term);
    }

    // Fallback: escape the text first, then add safe markup
    const escaped = this.escapeHtml(text);
    const escapedTerm = this.escapeRegex(term);

    try {
      const regex = new RegExp(`(${escapedTerm})`, "gi");
      return escaped.replace(regex, "<mark>$1</mark>");
    } catch {
      return escaped;
    }
  }

  // Helper method to escape HTML
  escapeHtml(text) {
    if (text == null) return "";
    const div = document.createElement("div");
    div.textContent = String(text);
    return div.innerHTML;
  }

  // Helper method to escape regex special characters
  escapeRegex(str) {
    if (!str) return "";
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  areAllRowsSelected() {
    if (this.paginatedData.length === 0) return false;

    return this.paginatedData.every((row) => {
      const rowId = row.id || this.config.data.indexOf(row);
      return this.config.selection.selectedRows.has(rowId);
    });
  }

  updateSelectAllCheckbox() {
    const selectAll = this.container.querySelector(".select-all");
    if (selectAll) {
      selectAll.checked = this.areAllRowsSelected();
      selectAll.indeterminate =
        this.config.selection.selectedRows.size > 0 &&
        !this.areAllRowsSelected();
    }
  }

  hasRowActions() {
    return (
      this.config.actions.view ||
      this.config.actions.edit ||
      this.config.actions.delete ||
      this.config.actions.custom.length > 0
    );
  }

  /**
   * Responsive handling
   */
  onBreakpointChange(breakpoint) {
    // Adjust table layout for mobile
    if (breakpoint === "mobile") {
      this.config.pagination.pageSize = 10;
      this.processData();
    }

    this.render();
  }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = TableComponent;
}

if (typeof window !== "undefined") {
  window.TableComponent = TableComponent;
}
