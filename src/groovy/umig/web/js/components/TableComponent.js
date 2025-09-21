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
if (typeof BaseComponent === "undefined") {
  var BaseComponent = (function () {
    if (typeof require !== "undefined") {
      try {
        return require("./BaseComponent");
      } catch (e) {
        // BaseComponent not available in this environment
        return null;
      }
    } else if (typeof window !== "undefined") {
      return window.BaseComponent;
    }
    return null;
  })();
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
      colorMapping: {
        enabled: false,
        fields: {
          // fieldName: {
          //   attribute: 'data-field-status',
          //   values: { activeValue: 'css-class-suffix', inactiveValue: 'css-class-suffix' }
          // }
        },
        ...(config.colorMapping || {}),
      },
      loading: false,
      emptyMessage: "No data available",
    };

    // Internal state
    this.processedData = [];
    this.filteredData = [];
    this.paginatedData = [];
    this.customRenderers = new Map();

    // CRITICAL DEBUG: Log final configuration to track sorting issues
    console.log("[TableComponent] Constructor completed with config:");
    console.log(
      "[TableComponent]   sorting.enabled:",
      this.config.sorting.enabled,
    );
    console.log(
      "[TableComponent]   columns count:",
      this.config.columns.length,
    );
    console.log(
      "[TableComponent]   columns:",
      this.config.columns.map(
        (c) => `${c.key}(sortable:${c.sortable !== false})`,
      ),
    );

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
    // Initialize or re-initialize sorting listeners storage
    if (!this._sortingListeners) {
      this._sortingListeners = new Map();
    } else {
      // Clear existing listeners if re-initializing
      this._clearSortingListeners();
    }

    // Process initial data
    this.processData();

    // Setup keyboard navigation
    this.setupKeyboardNavigation();

    // CRITICAL FIX: Handle deferred render if data was set before initialization
    if (this._deferredRender) {
      this.logDebug("Processing deferred render after initialization");
      this._deferredRender = false;
      // Note: render() will be called automatically by BaseComponent after onInitialize()
      // so we don't need to call it here - just clear the flag
    }

    console.log("[TableComponent] Component initialized successfully");
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
    if (false && SecurityUtils && SecurityUtils.safeSetInnerHTML) {
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
            div: ["class", "role", "aria-label", "aria-hidden", "style"],
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
              "style",
            ],
            td: [
              "class",
              "data-field",
              "data-column",
              "role",
              "data-user-status",
              "data-user-role",
            ],
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
            span: ["class", "aria-hidden", "style"],
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
        <table class="umig-data-table" aria-label="Data table">
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
   * Render header cell with sorting - BULLETPROOF UMIG-PREFIXED VERSION
   */
  renderHeaderCell(column) {
    const isSortable = this.config.sorting.enabled && column.sortable !== false;
    // Ensure strict equality and proper string comparison
    const isSorted = String(this.config.sorting.column) === String(column.key);
    const sortDirection = isSorted ? this.config.sorting.direction : null;

    console.log(
      `[TableComponent] BULLETPROOF: Rendering header for column '${column.key}' (${column.label})`,
    );
    console.log(
      `[TableComponent]   isSortable: ${isSortable}, isSorted: ${isSorted}, direction: ${sortDirection}`,
    );

    // Build UMIG-prefixed class string with proper spacing to avoid Confluence conflicts
    let cssClasses = "header-cell";
    if (isSortable) {
      cssClasses += " umig-sortable";
    }
    if (isSorted) {
      cssClasses += ` umig-sorted umig-sorted-${sortDirection || "none"}`;
    }

    // Ensure aria-sort always has a valid value
    const ariaSortValue = isSorted && sortDirection ? sortDirection : "none";

    // BULLETPROOF: Always include data-column attribute for sortable columns
    // This ensures our event delegation can always identify the column
    const dataColumnAttribute = isSortable ? `data-column="${column.key}"` : "";

    // CRITICAL: Add umig-specific data attribute for bulletproof identification
    const umigColumnAttribute = isSortable
      ? `data-umig-column="${column.key}"`
      : "";

    const styleAttribute = isSortable
      ? 'style="cursor: pointer !important; user-select: none; position: relative; z-index: 10;"'
      : "";

    console.log(
      `[TableComponent]   Final classes: "${cssClasses}", data-column: "${column.key}"`,
    );

    return `
      <th class="${cssClasses}"
          role="columnheader"
          aria-sort="${ariaSortValue}"
          ${dataColumnAttribute}
          ${umigColumnAttribute}
          ${styleAttribute}
          data-column-label="${column.label}"
          data-umig-sortable="${isSortable}">
        <div class="umig-header-content" style="pointer-events: none; cursor: pointer;">
          <span style="pointer-events: none;">${column.label}</span>
          ${
            isSortable
              ? `<span class="umig-sort-indicator" aria-hidden="true" style="pointer-events: none;"></span>`
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
  /**
   * Get the unique ID for a row based on primary key configuration
   * @param {Object} row - The row data object
   * @returns {string|number} The unique row identifier
   */
  getRowId(row) {
    const primaryKey = this.config.primaryKey || "id";
    return row[primaryKey] || this.config.data.indexOf(row);
  }

  renderRow(row, index) {
    const visibleColumns = this.getVisibleColumns();

    // CRITICAL DEBUG: Log what's happening with row ID generation
    console.log(`[TableComponent] RENDER ROW ${index}:`, {
      row: row,
      primaryKey: this.config.primaryKey,
      rowKeys: Object.keys(row),
      usr_id: row.usr_id,
      id: row.id,
    });

    const rowId = this.getRowId(row);
    console.log(`[TableComponent] Generated rowId for row ${index}:`, rowId);

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
   * Render table cell with color mapping support
   */
  renderCell(row, column) {
    let value = row[column.key];
    let isHtmlContent = false;

    // Apply custom renderer if available
    if (this.customRenderers.has(column.key)) {
      value = this.customRenderers.get(column.key)(value, row);
      isHtmlContent = true; // Custom renderers may return HTML
    } else if (column.renderer) {
      value = column.renderer(value, row);
      isHtmlContent = true; // Column renderers may return HTML
    }

    // Apply search highlighting (skip for HTML content to avoid breaking markup)
    if (
      !isHtmlContent &&
      this.config.search.highlightResults &&
      this.config.search.term
    ) {
      value = this.highlightSearchTerm(value, this.config.search.term);
    }

    // For email type or when renderer is used, allow HTML content
    // Otherwise escape HTML for security
    if (!isHtmlContent && column.type !== "email") {
      // Escape HTML to prevent XSS for non-HTML content
      value = String(value || "").replace(/[&<>"']/g, (match) => {
        const escapeMap = {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        };
        return escapeMap[match];
      });
    }

    // Apply color mapping if configured
    let colorAttributes = "";
    if (
      this.config.colorMapping.enabled &&
      this.config.colorMapping.fields[column.key]
    ) {
      const fieldConfig = this.config.colorMapping.fields[column.key];
      const fieldValue = row[column.key];

      // Convert field value to string for comparison
      const valueKey = String(fieldValue);

      if (fieldConfig.values && fieldConfig.values[valueKey]) {
        const mappedValue = fieldConfig.values[valueKey];
        colorAttributes = ` ${fieldConfig.attribute}="${mappedValue}"`;

        // Debug logging for color mapping
        console.log(
          `[TableComponent] Applied color mapping: ${column.key}=${fieldValue} -> ${fieldConfig.attribute}="${mappedValue}"`,
        );
      }
    }

    return `<td class="data-cell" role="cell" data-column="${column.key}"${colorAttributes}>${value}</td>`;
  }

  /**
   * Render action cell
   */
  renderActionCell(_row, rowId) {
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

    // Client-side pagination - use filtered data length
    const totalItems = this.filteredData.length;
    const totalPages = Math.ceil(totalItems / this.config.pagination.pageSize);
    const currentPage = this.config.pagination.currentPage;
    const startItem = (currentPage - 1) * this.config.pagination.pageSize + 1;
    const endItem = Math.min(
      currentPage * this.config.pagination.pageSize,
      totalItems,
    );

    return `
      <div class="table-pagination" role="navigation" aria-label="Table pagination">
        <div class="pagination-info">
          Showing ${startItem}-${endItem} of ${totalItems} items
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
      // Custom sort function takes precedence and gets full row objects
      if (column.sortFn) {
        return column.sortFn(a, b);
      }

      let aVal = a[column.key];
      let bVal = b[column.key];

      // Handle null/undefined
      if (aVal == null) return 1;
      if (bVal == null) return -1;

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
   * DOM Event Listeners - BULLETPROOF EVENT DELEGATION
   */
  setupDOMListeners() {
    console.log(
      "[TableComponent] Setting up DOM listeners - BULLETPROOF VERSION",
    );
    console.log("[TableComponent] Container available:", !!this.container);
    console.log(
      "[TableComponent] Sorting enabled:",
      this.config.sorting.enabled,
    );

    // CRITICAL FIX: Ensure container exists before any DOM operations
    if (!this.container) {
      console.error(
        "[TableComponent] No container available for setupDOMListeners - ABORTING",
      );
      return;
    }

    // CRITICAL FIX: Clear existing DOM listeners to prevent duplicates
    console.log(
      "[TableComponent] Clearing existing DOM listeners to prevent duplicates",
    );
    this.clearDOMListeners();

    // BULLETPROOF: Use event delegation instead of direct element binding
    this._setupBulletproofSorting();
    this._setupBulletproofActions();
    this._setupNonSortingListeners();
  }

  /**
   * Bulletproof sorting setup using event delegation with Confluence interference prevention
   * @private
   */
  _setupBulletproofSorting() {
    try {
      console.log(
        "[TableComponent] Setting up bulletproof sorting with UMIG-prefixed event delegation",
      );

      // Clear any existing sorting listeners
      this._clearSortingListeners();

      if (!this.config.sorting.enabled) {
        console.log("[TableComponent] Sorting disabled, skipping setup");
        return;
      }

      // BULLETPROOF APPROACH: Use event delegation on the container with event capture
      // This eliminates DOM timing issues and handles re-renders automatically
      // Event capture ensures we intercept clicks before Confluence can handle them
      const sortingHandler = (event) => {
        console.log("[TableComponent] UMIG sorting handler triggered:", event);

        // Find the clicked header element using UMIG-specific attributes
        const clickedElement = event.target;
        const headerElement = this._findUmigHeaderElement(clickedElement);

        if (!headerElement) {
          // Click was not on a UMIG sortable header
          return;
        }

        // Use UMIG-specific methods to identify the column
        const columnKey = this._identifyUmigColumn(headerElement);

        if (!columnKey) {
          console.error(
            "[TableComponent] Could not identify UMIG column for sorting",
          );
          return;
        }

        // CRITICAL: Immediately prevent event from reaching Confluence
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        console.log(
          `[TableComponent] UMIG BULLETPROOF SORT - Column: ${columnKey}`,
        );

        // Add slight delay to ensure DOM state is stable
        setTimeout(() => {
          this.handleSort(columnKey);
        }, 0);
      };

      // CRITICAL: Attach with event capture to intercept before Confluence
      // Use both capture phase and bubble phase for maximum compatibility
      this.container.addEventListener("click", sortingHandler, true); // Capture phase
      this.addDOMListener(this.container, "click", sortingHandler); // Bubble phase

      // Store reference for cleanup
      this._sortingDelegateHandler = sortingHandler;
      this._sortingCaptureHandler = sortingHandler;

      console.log(
        "[TableComponent] ✓ UMIG bulletproof sorting delegation established with capture phase",
      );
    } catch (error) {
      console.error(
        "[TableComponent] Error in bulletproof sorting setup:",
        error,
      );
    }
  }

  /**
   * Find the UMIG header element from a clicked target (handles clicks on nested elements)
   * @private
   */
  _findUmigHeaderElement(clickedElement) {
    // Traverse up the DOM to find the UMIG header element
    let element = clickedElement;
    let attempts = 0;
    const maxAttempts = 5; // Prevent infinite loops

    console.log(
      "[TableComponent] Finding UMIG header element from:",
      clickedElement,
    );

    while (element && attempts < maxAttempts) {
      // Check if this element is a UMIG sortable header
      if (element.tagName === "TH" && this._isUmigHeaderSortable(element)) {
        console.log("[TableComponent] Found UMIG sortable header:", element);
        return element;
      }

      // Move up to parent element
      element = element.parentElement;
      attempts++;
    }

    console.log("[TableComponent] No UMIG sortable header found");
    return null;
  }

  /**
   * Check if a header element is UMIG sortable (uses UMIG-specific attributes/classes)
   * @private
   */
  _isUmigHeaderSortable(element) {
    // Multiple checks for reliability using UMIG-specific identifiers
    const hasUmigSortableClass = element.classList.contains("umig-sortable");
    const hasUmigColumnAttr = element.hasAttribute("data-umig-column");
    const hasUmigSortableAttr =
      element.getAttribute("data-umig-sortable") === "true";
    const hasDataColumn = element.hasAttribute("data-column"); // Fallback compatibility

    console.log("[TableComponent] Checking UMIG sortable:", {
      element: element,
      hasUmigSortableClass,
      hasUmigColumnAttr,
      hasUmigSortableAttr,
      hasDataColumn,
      classList: Array.from(element.classList),
    });

    return (
      hasUmigSortableClass ||
      hasUmigColumnAttr ||
      hasUmigSortableAttr ||
      hasDataColumn
    );
  }

  /**
   * Find the header element from a clicked target (handles clicks on nested elements) - LEGACY
   * @private
   */
  _findHeaderElement(clickedElement) {
    // Redirect to UMIG-specific method
    return this._findUmigHeaderElement(clickedElement);
  }

  /**
   * Check if a header element is sortable - LEGACY
   * @private
   */
  _isHeaderSortable(element) {
    // Redirect to UMIG-specific method
    return this._isUmigHeaderSortable(element);
  }

  /**
   * UMIG-specific column identification with multiple fallback mechanisms
   * @private
   */
  _identifyUmigColumn(headerElement) {
    console.log(
      "[TableComponent] Identifying UMIG column for header:",
      headerElement,
    );

    // Method 1: data-umig-column attribute (UMIG-specific primary)
    const umigColumn = headerElement.getAttribute("data-umig-column");
    if (umigColumn) {
      console.log(
        `[TableComponent] UMIG column identified via data-umig-column: ${umigColumn}`,
      );
      return umigColumn;
    }

    // Method 2: data-column attribute (legacy fallback)
    const dataColumn = headerElement.getAttribute("data-column");
    if (dataColumn) {
      console.log(
        `[TableComponent] UMIG column identified via data-column: ${dataColumn}`,
      );
      return dataColumn;
    }

    // Method 3: Find column index and map to configuration
    const headerRow = headerElement.parentElement;
    const headers = Array.from(headerRow.children);
    let headerIndex = headers.indexOf(headerElement);

    // Account for selection column if present
    if (this.config.selection.enabled && headerIndex > 0) {
      headerIndex--;
    }

    // Get visible columns and map index
    const visibleColumns = this.getVisibleColumns();
    if (headerIndex >= 0 && headerIndex < visibleColumns.length) {
      const column = visibleColumns[headerIndex];
      console.log(
        `[TableComponent] UMIG column identified via index mapping: ${column.key}`,
      );
      return column.key;
    }

    // Method 4: Text content matching (last resort)
    const headerText = headerElement.textContent.trim();
    const matchingColumn = this.config.columns.find(
      (col) => col.label === headerText && col.sortable !== false,
    );

    if (matchingColumn) {
      console.log(
        `[TableComponent] UMIG column identified via text matching: ${matchingColumn.key}`,
      );
      return matchingColumn.key;
    }

    console.error(
      "[TableComponent] Failed to identify UMIG column using all methods",
    );
    console.error("[TableComponent] Header element:", headerElement);
    console.error("[TableComponent] data-umig-column:", umigColumn);
    console.error("[TableComponent] data-column:", dataColumn);
    console.error("[TableComponent] headerIndex:", headerIndex);
    console.error("[TableComponent] headerText:", headerText);

    return null;
  }

  /**
   * Robust column identification with multiple fallback mechanisms - LEGACY
   * @private
   */
  _identifyColumn(headerElement) {
    // Redirect to UMIG-specific method
    return this._identifyUmigColumn(headerElement);
  }

  /**
   * Store sorting listener reference for cleanup
   * @private
   */
  _storeSortingListener(element, handler) {
    if (!this._sortingListeners) {
      this._sortingListeners = new Map();
    }
    this._sortingListeners.set(element, handler);
  }

  /**
   * Clear all sorting listeners to prevent duplicates (including capture phase)
   * @private
   */
  _clearSortingListeners() {
    // Clear old individual listeners (legacy)
    if (this._sortingListeners) {
      this._sortingListeners.forEach((handler, element) => {
        try {
          element.removeEventListener("click", handler);
        } catch (error) {
          console.warn(
            "[TableComponent] Error removing sorting listener:",
            error,
          );
        }
      });
      this._sortingListeners.clear();
    }

    // Clear new delegate handler (bubble phase)
    if (this._sortingDelegateHandler && this.container) {
      try {
        this.container.removeEventListener(
          "click",
          this._sortingDelegateHandler,
        );
        this._sortingDelegateHandler = null;
        console.log("[TableComponent] ✓ Delegate sorting handler cleared");
      } catch (error) {
        console.warn(
          "[TableComponent] Error removing delegate sorting handler:",
          error,
        );
      }
    }

    // Clear capture phase handler
    if (this._sortingCaptureHandler && this.container) {
      try {
        this.container.removeEventListener(
          "click",
          this._sortingCaptureHandler,
          true, // Capture phase
        );
        this._sortingCaptureHandler = null;
        console.log("[TableComponent] ✓ Capture phase sorting handler cleared");
      } catch (error) {
        console.warn(
          "[TableComponent] Error removing capture phase sorting handler:",
          error,
        );
      }
    }
  }

  /**
   * Bulletproof action button setup using event delegation
   * Eliminates click hijacking and race conditions with table re-renders
   * @private
   */
  _setupBulletproofActions() {
    try {
      console.log(
        "[TableComponent] Setting up bulletproof action button delegation",
      );

      // Clear any existing action listeners
      this._clearActionListeners();

      // BULLETPROOF APPROACH: Use event delegation on the container
      // This eliminates DOM timing issues and handles re-renders automatically
      const actionHandler = (event) => {
        // Find the clicked action button element
        const clickedElement = event.target;
        const actionButton = this._findActionButton(clickedElement);

        if (!actionButton) {
          // Click was not on an action button
          return;
        }

        // Extract action data from button
        const actionData = this._extractActionData(actionButton);

        if (!actionData.action || !actionData.rowId) {
          console.error(
            "[TableComponent] Could not extract action data from button",
          );
          return;
        }

        // CRITICAL: Prevent default behavior and stop propagation immediately
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();

        console.log(
          `[TableComponent] BULLETPROOF ACTION - Action: ${actionData.action}, Row: ${actionData.rowId}`,
        );

        // Add a small delay to ensure this executes before any potential re-render
        setTimeout(() => {
          this.handleRowAction(actionData.action, actionData.rowId);
        }, 5);
      };

      // Attach single delegated event listener to container
      this.addDOMListener(this.container, "click", actionHandler);

      // Store reference for cleanup
      this._actionDelegateHandler = actionHandler;

      console.log(
        "[TableComponent] ✓ Bulletproof action delegation established",
      );
    } catch (error) {
      console.error(
        "[TableComponent] Error in bulletproof action setup:",
        error,
      );
    }
  }

  /**
   * Find the action button element from a clicked target (handles clicks on nested elements)
   * @private
   */
  _findActionButton(clickedElement) {
    // Traverse up the DOM to find the action button element
    let element = clickedElement;
    let attempts = 0;
    const maxAttempts = 5; // Prevent infinite loops

    while (element && attempts < maxAttempts) {
      // Check if this element is an action button
      if (element.tagName === "BUTTON" && this._isActionButton(element)) {
        return element;
      }

      // Move up to parent element
      element = element.parentElement;
      attempts++;
    }

    return null;
  }

  /**
   * Check if a button element is an action button
   * @private
   */
  _isActionButton(element) {
    // Multiple checks for reliability
    return (
      element.classList.contains("action-btn") ||
      element.hasAttribute("data-action") ||
      element.hasAttribute("data-row-id")
    );
  }

  /**
   * Extract action data from button element
   * @private
   */
  _extractActionData(buttonElement) {
    console.log(
      "[TableComponent] Extracting action data from button:",
      buttonElement,
    );

    const action = buttonElement.getAttribute("data-action");
    const rowId = buttonElement.getAttribute("data-row-id");

    console.log(
      `[TableComponent] Extracted action: ${action}, rowId: ${rowId}`,
    );

    return { action, rowId };
  }

  /**
   * Clear all action listeners to prevent duplicates
   * @private
   */
  _clearActionListeners() {
    // Clear new delegate handler
    if (this._actionDelegateHandler && this.container) {
      try {
        this.container.removeEventListener(
          "click",
          this._actionDelegateHandler,
        );
        this._actionDelegateHandler = null;
        console.log("[TableComponent] ✓ Delegate action handler cleared");
      } catch (error) {
        console.warn(
          "[TableComponent] Error removing delegate action handler:",
          error,
        );
      }
    }
  }

  /**
   * Setup non-sorting event listeners
   * @private
   */
  _setupNonSortingListeners() {
    try {
      console.log("[TableComponent] Setting up non-sorting listeners");

      // DEFENSIVE: Ensure container still exists
      if (!this.container) {
        console.error(
          "[TableComponent] Container lost during non-sorting listener setup",
        );
        return;
      }

      // Selection
      if (this.config.selection.enabled) {
        // Select all
        const selectAll = this.container.querySelector(".select-all");
        if (selectAll) {
          this.addDOMListener(selectAll, "change", this.handleSelectAll);
          console.log("[TableComponent] ✓ Select-all listener attached");
        } else {
          console.log(
            "[TableComponent] No select-all element found (selection may be disabled)",
          );
        }

        // Individual row selection
        const rowSelectors = this.container.querySelectorAll(".row-select");
        console.log(
          `[TableComponent] Found ${rowSelectors.length} row selection checkboxes`,
        );
        rowSelectors.forEach((checkbox, index) => {
          this.addDOMListener(checkbox, "change", (e) => {
            this.handleRowSelect(checkbox.dataset.rowId, e.target.checked);
          });
        });
        if (rowSelectors.length > 0) {
          console.log(
            `[TableComponent] ✓ ${rowSelectors.length} row selection listeners attached`,
          );
        }
      }

      // CRITICAL FIX: Page Size Event Delegation with Extensive Debugging
      if (this.config.pagination.enabled) {
        console.log(
          "[TableComponent] PAGINATION DEBUG: Setting up page size event delegation",
        );

        // Find ALL page size dropdowns in container
        const pageSizeSelects =
          this.container.querySelectorAll(".page-size-select");
        console.log(
          `[TableComponent] PAGINATION DEBUG: Found ${pageSizeSelects.length} page size dropdowns`,
        );

        // Set up event delegation on container for any page size changes
        const pageSizeHandler = (event) => {
          console.log(
            "[TableComponent] PAGINATION DEBUG: Page size event detected:",
            event,
          );
          console.log(
            "[TableComponent] PAGINATION DEBUG: Event target:",
            event.target,
          );
          console.log(
            "[TableComponent] PAGINATION DEBUG: Event target class list:",
            event.target.classList,
          );

          // Check if this is a page size select change
          if (
            event.target &&
            event.target.classList.contains("page-size-select")
          ) {
            const newSize = parseInt(event.target.value);
            console.log(
              `[TableComponent] PAGINATION DEBUG: Page size change detected: ${newSize}`,
            );

            // Prevent event from propagating to avoid double handling
            event.stopPropagation();

            // Handle the page size change
            this.handlePageSizeChange(newSize);
            return;
          }
        };

        // Attach delegated event listener for page size changes
        this.addDOMListener(this.container, "change", pageSizeHandler);
        console.log(
          "[TableComponent] PAGINATION DEBUG: ✓ Page size event delegation attached to container",
        );

        // Also try direct listeners as fallback
        pageSizeSelects.forEach((select, index) => {
          console.log(
            `[TableComponent] PAGINATION DEBUG: Setting up direct listener ${index} on:`,
            select,
          );
          this.addDOMListener(select, "change", (e) => {
            console.log(
              `[TableComponent] PAGINATION DEBUG: Direct listener ${index} triggered with value:`,
              e.target.value,
            );
            this.handlePageSizeChange(parseInt(e.target.value));
          });
        });

        if (pageSizeSelects.length > 0) {
          console.log(
            `[TableComponent] PAGINATION DEBUG: ✓ ${pageSizeSelects.length} direct page size listeners attached`,
          );
        } else {
          console.warn(
            "[TableComponent] PAGINATION DEBUG: ⚠ No .page-size-select elements found for direct listeners",
          );
        }

        // Navigation buttons with defensive checks and unique identification
        const firstBtn = this.container.querySelector(".pagination-first");
        if (firstBtn) {
          // Give unique ID if not present to ensure proper listener tracking
          if (!firstBtn.id) {
            firstBtn.id = `pagination-first-${this.id || Date.now()}`;
          }
          this.addDOMListener(firstBtn, "click", () => this.goToPage(1));
        }

        const prevBtn = this.container.querySelector(".pagination-prev");
        if (prevBtn) {
          if (!prevBtn.id) {
            prevBtn.id = `pagination-prev-${this.id || Date.now()}`;
          }
          this.addDOMListener(prevBtn, "click", () =>
            this.goToPage(this.config.pagination.currentPage - 1),
          );
        }

        const nextBtn = this.container.querySelector(".pagination-next");
        if (nextBtn) {
          if (!nextBtn.id) {
            nextBtn.id = `pagination-next-${this.id || Date.now()}`;
          }
          this.addDOMListener(nextBtn, "click", () =>
            this.goToPage(this.config.pagination.currentPage + 1),
          );
        }

        const lastBtn = this.container.querySelector(".pagination-last");
        if (lastBtn) {
          if (!lastBtn.id) {
            lastBtn.id = `pagination-last-${this.id || Date.now()}`;
          }
          this.addDOMListener(lastBtn, "click", () => {
            const totalPages = Math.ceil(
              this.filteredData.length / this.config.pagination.pageSize,
            );
            this.goToPage(totalPages);
          });
        }

        const paginationButtons = [firstBtn, prevBtn, nextBtn, lastBtn].filter(
          Boolean,
        );
        console.log(
          `[TableComponent] ✓ ${paginationButtons.length} pagination button listeners attached`,
        );
      }

      // Row actions - NOW HANDLED BY BULLETPROOF DELEGATION
      // No direct listeners needed - all action buttons handled by _setupBulletproofActions()
      const actionButtons = this.container.querySelectorAll(".action-btn");
      console.log(
        `[TableComponent] Found ${actionButtons.length} action buttons (handled by delegation)`,
      );
      if (actionButtons.length > 0) {
        console.log(
          `[TableComponent] ✓ ${actionButtons.length} action buttons will be handled by bulletproof delegation`,
        );
      }

      // Export buttons
      const exportButtons = this.container.querySelectorAll(".btn-export");
      exportButtons.forEach((btn) => {
        this.addDOMListener(btn, "click", () => {
          this.exportData(btn.dataset.format);
        });
      });
      if (exportButtons.length > 0) {
        console.log(
          `[TableComponent] ✓ ${exportButtons.length} export button listeners attached`,
        );
      }

      // Column visibility toggle
      const columnToggle = this.container.querySelector(".btn-column-toggle");
      if (columnToggle) {
        this.addDOMListener(columnToggle, "click", () => {
          const dropdown = this.container.querySelector(".column-dropdown");
          if (dropdown) {
            dropdown.classList.toggle("hidden");
          }
        });
        console.log("[TableComponent] ✓ Column toggle listener attached");
      }

      // Column visibility checkboxes
      const columnCheckboxes = this.container.querySelectorAll(
        ".column-option input",
      );
      columnCheckboxes.forEach((checkbox) => {
        this.addDOMListener(checkbox, "change", () => {
          this.toggleColumnVisibility(
            checkbox.dataset.column,
            checkbox.checked,
          );
        });
      });
      if (columnCheckboxes.length > 0) {
        console.log(
          `[TableComponent] ✓ ${columnCheckboxes.length} column visibility listeners attached`,
        );
      }

      console.log(
        "[TableComponent] ✓ All non-sorting DOM listeners setup complete",
      );
    } catch (error) {
      console.error(
        "[TableComponent] Error setting up non-sorting listeners:",
        error,
      );
    }
  }

  /**
   * Event handlers - BULLETPROOF SORTING WITH COMPREHENSIVE VALIDATION
   */
  handleSort(column) {
    console.log(
      `[TableComponent] BULLETPROOF handleSort called with column: '${column}'`,
    );

    // VALIDATION LAYER 1: Basic input validation
    if (!column || typeof column !== "string") {
      console.error("[TableComponent] Invalid column parameter:", column);
      return;
    }

    // VALIDATION LAYER 2: Check if sorting is enabled
    if (!this.config.sorting.enabled) {
      console.error("[TableComponent] Sorting is disabled");
      return;
    }

    // VALIDATION LAYER 3: Validate column exists in configuration
    const columnConfig = this.config.columns.find((col) => col.key === column);
    if (!columnConfig) {
      console.error(
        `[TableComponent] Column '${column}' not found in table configuration`,
      );
      console.error(
        "[TableComponent] Available columns:",
        this.config.columns.map((c) => c.key),
      );
      return;
    }

    // VALIDATION LAYER 4: Check if column is sortable
    if (columnConfig.sortable === false) {
      console.error(`[TableComponent] Column '${column}' is not sortable`);
      return;
    }

    // VALIDATION LAYER 5: Check component state
    if (!this.config.data || !Array.isArray(this.config.data)) {
      console.error("[TableComponent] Invalid data state for sorting");
      return;
    }

    // Log current state for debugging
    console.log(`[TableComponent] Current sorting state:`, {
      column: this.config.sorting.column,
      direction: this.config.sorting.direction,
    });
    console.log(`[TableComponent] Column config:`, {
      key: columnConfig.key,
      label: columnConfig.label,
      sortable: columnConfig.sortable,
    });

    // ATOMIC STATE UPDATE: Update sorting configuration atomically
    const previousSortColumn = this.config.sorting.column;
    const previousSortDirection = this.config.sorting.direction;

    try {
      if (this.config.sorting.column === column) {
        // Toggle direction for same column
        this.config.sorting.direction =
          this.config.sorting.direction === "asc" ? "desc" : "asc";
        console.log(
          `[TableComponent] Toggling sort direction for column '${column}' to '${this.config.sorting.direction}'`,
        );
      } else {
        // New column - set to ascending
        this.config.sorting.column = column;
        this.config.sorting.direction = "asc";
        console.log(
          `[TableComponent] Setting new sort column '${column}' with direction 'asc'`,
        );
      }

      // ATOMIC OPERATION: Process data and re-render
      console.log(
        `[TableComponent] Processing data with new sort state:`,
        this.config.sorting,
      );
      this.processData();

      console.log(`[TableComponent] Re-rendering table with updated sort`);
      this.render();

      // VERIFICATION: Check that the sorting was applied correctly
      this._verifySortingState(column, columnConfig);

      // Emit sort event
      this.emit("sort", {
        column: this.config.sorting.column,
        direction: this.config.sorting.direction,
      });

      // Accessibility announcement
      const columnLabel = columnConfig.label;
      const direction =
        this.config.sorting.direction === "asc" ? "ascending" : "descending";
      this.announce(`Table sorted by ${columnLabel} ${direction}`);

      console.log(
        `[TableComponent] ✓ Sorting completed successfully for column '${column}'`,
      );
    } catch (error) {
      // ROLLBACK: Restore previous state on error
      console.error(
        "[TableComponent] Error during sorting, rolling back:",
        error,
      );
      this.config.sorting.column = previousSortColumn;
      this.config.sorting.direction = previousSortDirection;

      // Try to restore previous state
      try {
        this.processData();
        this.render();
      } catch (rollbackError) {
        console.error(
          "[TableComponent] Failed to rollback sorting state:",
          rollbackError,
        );
      }
    }
  }

  /**
   * Verify that sorting state was applied correctly to DOM (UMIG-aware)
   * @private
   */
  _verifySortingState(expectedColumn, expectedColumnConfig) {
    try {
      console.log(
        `[TableComponent] Verifying UMIG sorting state for column '${expectedColumn}'`,
      );

      // Find headers with UMIG-specific attributes
      const headerElements = this.container.querySelectorAll(
        "th[data-umig-column], th[data-column]",
      );
      let sortedHeaderFound = false;
      let correctIndicatorFound = false;

      headerElements.forEach((header) => {
        // Try UMIG-specific attribute first, then fallback to legacy
        const columnKey =
          header.getAttribute("data-umig-column") ||
          header.getAttribute("data-column");
        const ariaSortValue = header.getAttribute("aria-sort");
        const hasUmigSortedClass = header.classList.contains("umig-sorted");
        const hasLegacySortedClass = header.classList.contains("sorted"); // Legacy support

        if (columnKey === expectedColumn) {
          sortedHeaderFound = true;

          // Check if this header has the correct UMIG sorting indicators
          if (
            (hasUmigSortedClass || hasLegacySortedClass) &&
            ariaSortValue === this.config.sorting.direction
          ) {
            correctIndicatorFound = true;
            console.log(
              `[TableComponent] ✓ Correct UMIG sorting indicators found on column '${expectedColumn}'`,
            );
          } else {
            console.warn(
              `[TableComponent] ⚠ UMIG sorting indicators may be incorrect:`,
              {
                column: columnKey,
                hasUmigSortedClass,
                hasLegacySortedClass,
                ariaSortValue,
                expectedDirection: this.config.sorting.direction,
                classList: Array.from(header.classList),
              },
            );
          }
        } else {
          // Other headers should not have sorted class
          if (hasUmigSortedClass || hasLegacySortedClass) {
            console.warn(
              `[TableComponent] ⚠ Header '${columnKey}' incorrectly has sorted class`,
            );
          }
        }
      });

      if (!sortedHeaderFound) {
        console.error(
          `[TableComponent] ✗ Header for sorted column '${expectedColumn}' not found in DOM`,
        );
      }

      if (!correctIndicatorFound) {
        console.error(
          `[TableComponent] ✗ Correct UMIG sorting indicators not found for column '${expectedColumn}'`,
        );
      }

      return sortedHeaderFound && correctIndicatorFound;
    } catch (error) {
      console.error(
        "[TableComponent] Error verifying UMIG sorting state:",
        error,
      );
      return false;
    }
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
        const rowId = this.getRowId(row);
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

  /**
   * Handle page size change with comprehensive debugging
   * @param {number} size - New page size
   */
  handlePageSizeChange(size) {
    console.log(
      `[TableComponent] PAGINATION DEBUG: handlePageSizeChange called with size: ${size}`,
    );
    console.log(
      `[TableComponent] PAGINATION DEBUG: Current page size: ${this.config.pagination.pageSize}`,
    );
    console.log(
      `[TableComponent] PAGINATION DEBUG: Current page: ${this.config.pagination.currentPage}`,
    );
    console.log(
      `[TableComponent] PAGINATION DEBUG: Total data items: ${this.config.data.length}`,
    );

    try {
      // Validate the size parameter
      if (!size || isNaN(size) || size <= 0) {
        console.error(
          `[TableComponent] PAGINATION DEBUG: Invalid page size: ${size}`,
        );
        return;
      }

      console.log(
        `[TableComponent] PAGINATION DEBUG: Calling setPageSize(${size})`,
      );
      this.setPageSize(size);

      console.log(
        `[TableComponent] PAGINATION DEBUG: ✓ Page size change completed successfully`,
      );
      console.log(
        `[TableComponent] PAGINATION DEBUG: New page size: ${this.config.pagination.pageSize}`,
      );
      console.log(
        `[TableComponent] PAGINATION DEBUG: New page: ${this.config.pagination.currentPage}`,
      );
    } catch (error) {
      console.error(
        "[TableComponent] PAGINATION DEBUG: Error in handlePageSizeChange:",
        error,
      );
      throw error;
    }
  }

  handleRowAction(action, rowId) {
    console.log("[TableComponent] DEBUG: handleRowAction called", {
      action,
      rowId,
    });
    console.log(
      "[TableComponent] DEBUG: Primary key config:",
      this.config.primaryKey,
    );
    console.log(
      "[TableComponent] DEBUG: First few rows:",
      this.config.data.slice(0, 2),
    );

    const row = this.config.data.find((r) => this.getRowId(r) == rowId);

    console.log("[TableComponent] DEBUG: Found row:", row);
    console.log(
      "[TableComponent] DEBUG: getRowId for first row:",
      this.getRowId(this.config.data[0]),
    );

    // CRITICAL FIX: Emit through orchestrator for global events, fallback to local emit
    const eventData = {
      action,
      rowId,
      row,
      data: row, // Add data alias for BaseEntityManager compatibility
    };

    console.log(
      "[TableComponent] DEBUG: Emitting table:action event with data:",
      eventData,
    );

    if (this.orchestrator && typeof this.orchestrator.emit === "function") {
      console.log(
        "[TableComponent] DEBUG: Using orchestrator.emit() for global event",
      );
      this.orchestrator.emit("table:action", eventData);
    } else {
      console.warn(
        "[TableComponent] DEBUG: No orchestrator available, using local emit()",
      );
      console.warn("[TableComponent] DEBUG: Orchestrator:", this.orchestrator);
      console.warn(
        "[TableComponent] DEBUG: window.currentEntityManager:",
        window.currentEntityManager,
      );

      // Fallback: Try to emit through currentEntityManager if available
      if (
        window.currentEntityManager &&
        typeof window.currentEntityManager.emit === "function"
      ) {
        console.log(
          "[TableComponent] DEBUG: Using window.currentEntityManager.emit() as fallback",
        );
        window.currentEntityManager.emit("table:action", eventData);
      } else {
        console.error(
          "[TableComponent] DEBUG: No orchestrator or currentEntityManager available - event will not reach BaseEntityManager!",
        );
        // Still emit locally in case there are component-level listeners
        this.emit("table:action", eventData);
      }
    }
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

    // CRITICAL FIX: Only render if component is initialized
    // Prevents "Component not initialized" errors during early data updates
    if (this.initialized) {
      this.render();
    } else {
      // Queue render for after initialization
      this.logDebug("setData called before initialization, deferring render");
      this._deferredRender = true;
    }
  }

  /**
   * Update table data - alias for setData for component compatibility
   * @param {Array} data - New data array
   * @param {Object} metadata - Optional metadata including totalElements
   */
  updateData(data, metadata = {}) {
    return this.setData(data, metadata);
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

  /**
   * Set page size with comprehensive debugging and event emission
   * @param {number} size - New page size
   */
  setPageSize(size) {
    console.log(
      `[TableComponent] PAGINATION DEBUG: setPageSize called with: ${size}`,
    );
    console.log(
      `[TableComponent] PAGINATION DEBUG: Previous page size: ${this.config.pagination.pageSize}`,
    );
    console.log(
      `[TableComponent] PAGINATION DEBUG: Previous current page: ${this.config.pagination.currentPage}`,
    );

    // Validate size
    const validSize = parseInt(size);
    if (isNaN(validSize) || validSize <= 0 || validSize > 1000) {
      console.error(
        `[TableComponent] PAGINATION DEBUG: Invalid page size value: ${size} -> ${validSize}`,
      );
      return;
    }

    // Check if size actually changed
    if (this.config.pagination.pageSize === validSize) {
      console.log(
        `[TableComponent] PAGINATION DEBUG: Page size unchanged (${validSize}), skipping update`,
      );
      return;
    }

    const oldPageSize = this.config.pagination.pageSize;
    const oldPage = this.config.pagination.currentPage;

    // Update configuration
    this.config.pagination.pageSize = validSize;
    this.config.pagination.currentPage = 1; // Reset to first page

    console.log(`[TableComponent] PAGINATION DEBUG: Configuration updated:`);
    console.log(
      `[TableComponent] PAGINATION DEBUG:   pageSize: ${oldPageSize} -> ${this.config.pagination.pageSize}`,
    );
    console.log(
      `[TableComponent] PAGINATION DEBUG:   currentPage: ${oldPage} -> ${this.config.pagination.currentPage}`,
    );

    // Process data with new pagination
    console.log(
      `[TableComponent] PAGINATION DEBUG: Processing data with new page size`,
    );
    this.processData();

    console.log(
      `[TableComponent] PAGINATION DEBUG: Paginated data length: ${this.paginatedData.length}`,
    );
    console.log(
      `[TableComponent] PAGINATION DEBUG: Filtered data length: ${this.filteredData.length}`,
    );

    // Re-render table
    console.log(`[TableComponent] PAGINATION DEBUG: Re-rendering table`);
    this.render();

    // Emit events for external listeners
    console.log(
      `[TableComponent] PAGINATION DEBUG: Emitting pageSizeChange event`,
    );
    this.emit("pageSizeChange", {
      pageSize: validSize,
      previousPageSize: oldPageSize,
      currentPage: this.config.pagination.currentPage,
      previousPage: oldPage,
    });

    // Also emit a more generic pagination change event
    this.emit("paginationChange", {
      type: "pageSize",
      pageSize: validSize,
      previousPageSize: oldPageSize,
      currentPage: this.config.pagination.currentPage,
      previousPage: oldPage,
    });

    console.log(
      `[TableComponent] PAGINATION DEBUG: ✓ setPageSize completed successfully`,
    );
  }

  /**
   * Force re-render of the component (clears initialization and rendered state)
   * Used when container changes or component needs to be completely refreshed
   * BULLETPROOF VERSION: Properly handles event delegation cleanup
   */
  forceRerender() {
    console.log("[TableComponent] BULLETPROOF force re-render requested");

    // Clear sorting listeners to prevent duplicates (including delegate handler)
    this._clearSortingListeners();

    // Clear action listeners to prevent duplicates
    this._clearActionListeners();

    // Reset initialization state
    this.initialized = false;

    // Clear any pending timers
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }

    // Clear delegate handler references
    this._sortingDelegateHandler = null;
    this._sortingCaptureHandler = null;
    this._actionDelegateHandler = null;

    // Clear legacy listener storage
    if (this._sortingListeners) {
      this._sortingListeners.clear();
    }

    console.log(
      "[TableComponent] ✓ Component state reset for bulletproof re-render",
    );
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
        const rowId = this.getRowId(row);
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

  exportAsExcel(_data) {
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
      const rowId = this.getRowId(row);
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
   * Component cleanup - BULLETPROOF VERSION
   */
  onDestroy() {
    console.log("[TableComponent] BULLETPROOF cleanup starting");

    // Clean up sorting listeners (including delegate handler)
    this._clearSortingListeners();

    // Clean up action listeners (including delegate handler)
    this._clearActionListeners();

    // Clean up any timers or intervals
    if (this._retryTimer) {
      clearTimeout(this._retryTimer);
      this._retryTimer = null;
    }

    // Clear references to prevent memory leaks
    this._sortingDelegateHandler = null;
    this._actionDelegateHandler = null;
    if (this._sortingListeners) {
      this._sortingListeners.clear();
      this._sortingListeners = null;
    }

    // Clear any cached DOM references
    this.processedData = [];
    this.filteredData = [];
    this.paginatedData = [];

    console.log(
      "[TableComponent] ✓ BULLETPROOF component destroyed and cleaned up",
    );
  }

  /**
   * Responsive handling
   */
  onBreakpointChange(breakpoint) {
    // CRITICAL FIX: Only process if component is initialized
    // Prevents "Component not initialized" errors during responsive events
    if (!this.initialized) {
      this.logDebug(
        "onBreakpointChange called before initialization, ignoring",
      );
      return;
    }

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
