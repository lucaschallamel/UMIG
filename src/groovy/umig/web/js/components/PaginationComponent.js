/**
 * PaginationComponent - Reusable Pagination Control Component
 * US-082-B Component Architecture Development
 *
 * Features:
 * - Page navigation with first/previous/next/last controls
 * - Jump to page functionality
 * - Configurable page size selector
 * - Display of total items and current range
 * - Responsive design with mobile optimization
 * - Keyboard navigation support
 * - Accessibility compliant (WCAG AA)
 * - Event-driven updates
 */

// Import BaseComponent for Node.js/testing environment
if (typeof BaseComponent === "undefined" && typeof require !== "undefined") {
  var BaseComponent = require("./BaseComponent");
}

// Use global SecurityUtils that's loaded by the module system
// SecurityUtils is guaranteed to be available on window.SecurityUtils by the module loader

// Define the class only if BaseComponent is available
// In browser, the module loader ensures BaseComponent is loaded first
class PaginationComponent extends BaseComponent {
  constructor(containerId, config = {}) {
    super(containerId, {
      ...config,
      totalItems: config.totalItems || 0,
      currentPage: config.currentPage || 1,
      pageSize: config.pageSize || 25,
      pageSizeOptions: config.pageSizeOptions || [10, 25, 50, 100],
      maxVisiblePages: config.maxVisiblePages || 7,
      showPageSizeSelector: config.showPageSizeSelector !== false,
      showItemsInfo: config.showItemsInfo !== false,
      showJumpToPage: config.showJumpToPage !== false,
      showFirstLast: config.showFirstLast !== false,
      compactMode: config.compactMode || false,
      onChange: config.onChange || null,
      onPageSizeChange: config.onPageSizeChange || null,
      labels: {
        first: "First",
        previous: "Previous",
        next: "Next",
        last: "Last",
        pageSize: "Items per page:",
        jumpTo: "Go to page:",
        itemsInfo: "Showing {start} to {end} of {total} items",
        page: "Page",
        of: "of",
        ...config.labels,
      },
    });

    // Calculate derived values
    this.totalPages = 0;
    this.startItem = 0;
    this.endItem = 0;
    this.visiblePageNumbers = [];

    this.calculate();
  }

  /**
   * Calculate pagination values
   */
  calculate() {
    this.totalPages =
      Math.ceil(this.config.totalItems / this.config.pageSize) || 1;

    // Ensure current page is within bounds
    if (this.config.currentPage < 1) {
      this.config.currentPage = 1;
    } else if (this.config.currentPage > this.totalPages) {
      this.config.currentPage = this.totalPages;
    }

    // Calculate item range
    this.startItem = (this.config.currentPage - 1) * this.config.pageSize + 1;
    this.endItem = Math.min(
      this.config.currentPage * this.config.pageSize,
      this.config.totalItems,
    );

    // Calculate visible page numbers
    this.calculateVisiblePages();
  }

  /**
   * Calculate which page numbers should be visible
   */
  calculateVisiblePages() {
    const pages = [];
    const maxVisible = this.config.maxVisiblePages;
    const current = this.config.currentPage;
    const total = this.totalPages;

    if (total <= maxVisible) {
      // Show all pages
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Calculate range with ellipsis
      const halfVisible = Math.floor(maxVisible / 2);
      let start = Math.max(1, current - halfVisible);
      let end = Math.min(total, current + halfVisible);

      // Adjust if at boundaries
      if (current <= halfVisible) {
        end = maxVisible - 2;
      } else if (current > total - halfVisible) {
        start = total - maxVisible + 3;
      }

      // Always include first page
      pages.push(1);

      // Add ellipsis if needed
      if (start > 2) {
        pages.push("...");
      }

      // Add middle pages
      for (let i = Math.max(2, start); i <= Math.min(total - 1, end); i++) {
        pages.push(i);
      }

      // Add ellipsis if needed
      if (end < total - 1) {
        pages.push("...");
      }

      // Always include last page
      if (total > 1) {
        pages.push(total);
      }
    }

    this.visiblePageNumbers = pages;
  }

  /**
   * Render pagination controls
   */
  onRender() {
    if (this.config.compactMode) {
      this.renderCompact();
    } else {
      this.renderFull();
    }
  }

  /**
   * Render full pagination controls
   */
  renderFull() {
    let html = '<div class="pagination-wrapper">';

    // Items info
    if (this.config.showItemsInfo && this.config.totalItems > 0) {
      html += this.renderItemsInfo();
    }

    // Main pagination controls
    html += '<div class="pagination-controls">';

    // Page size selector
    if (this.config.showPageSizeSelector) {
      html += this.renderPageSizeSelector();
    }

    // Navigation buttons
    html +=
      '<nav class="pagination" role="navigation" aria-label="Pagination Navigation">';
    html += '<ul class="pagination-list">';

    // First button
    if (this.config.showFirstLast) {
      html += this.renderFirstButton();
    }

    // Previous button
    html += this.renderPreviousButton();

    // Page numbers
    html += this.renderPageNumbers();

    // Next button
    html += this.renderNextButton();

    // Last button
    if (this.config.showFirstLast) {
      html += this.renderLastButton();
    }

    html += "</ul>";
    html += "</nav>";

    // Jump to page
    if (this.config.showJumpToPage && this.totalPages > 10) {
      html += this.renderJumpToPage();
    }

    html += "</div>"; // pagination-controls
    html += "</div>"; // pagination-wrapper

    // Use SecurityUtils for safe HTML rendering if available
    if (typeof window.SecurityUtils !== "undefined") {
      window.SecurityUtils.safeSetInnerHTML(this.container, html, {
        allowedTags: [
          "div",
          "nav",
          "ul",
          "li",
          "button",
          "span",
          "label",
          "select",
          "option",
          "input",
        ],
        allowedAttributes: {
          div: ["class", "aria-live", "aria-atomic"],
          nav: ["class", "role", "aria-label"],
          ul: ["class"],
          li: ["class"],
          button: [
            "class",
            "data-action",
            "data-page",
            "disabled",
            "aria-label",
            "aria-disabled",
            "aria-current",
          ],
          span: ["class", "aria-hidden"],
          label: ["for", "class"],
          select: ["id", "class", "aria-label"],
          option: ["value", "selected"],
          input: ["type", "id", "class", "min", "max", "value", "aria-label"],
        },
      });
    } else {
      this.container.innerHTML = html;
    }
  }

  /**
   * Render compact pagination controls
   */
  renderCompact() {
    const html = `
      <div class="pagination-wrapper pagination-compact">
        <div class="pagination-controls">
          <button class="btn btn-icon" 
                  data-action="previous" 
                  ${this.config.currentPage === 1 ? "disabled" : ""}
                  aria-label="${this.config.labels.previous}">
            <span aria-hidden="true">‹</span>
          </button>
          <span class="pagination-info">
            ${this.config.labels.page} ${this.config.currentPage} ${this.config.labels.of} ${this.totalPages}
          </span>
          <button class="btn btn-icon" 
                  data-action="next" 
                  ${this.config.currentPage === this.totalPages ? "disabled" : ""}
                  aria-label="${this.config.labels.next}">
            <span aria-hidden="true">›</span>
          </button>
        </div>
      </div>
    `;

    // Use SecurityUtils for safe HTML rendering if available
    if (typeof window.SecurityUtils !== "undefined") {
      window.SecurityUtils.safeSetInnerHTML(this.container, html, {
        allowedTags: [
          "div",
          "nav",
          "ul",
          "li",
          "button",
          "span",
          "label",
          "select",
          "option",
          "input",
        ],
        allowedAttributes: {
          div: ["class", "aria-live", "aria-atomic"],
          nav: ["class", "role", "aria-label"],
          ul: ["class"],
          li: ["class"],
          button: [
            "class",
            "data-action",
            "data-page",
            "disabled",
            "aria-label",
            "aria-disabled",
            "aria-current",
          ],
          span: ["class", "aria-hidden"],
          label: ["for", "class"],
          select: ["id", "class", "aria-label"],
          option: ["value", "selected"],
          input: ["type", "id", "class", "min", "max", "value", "aria-label"],
        },
      });
    } else {
      this.container.innerHTML = html;
    }
  }

  /**
   * Render items info
   */
  renderItemsInfo() {
    const info = this.config.labels.itemsInfo
      .replace("{start}", this.startItem)
      .replace("{end}", this.endItem)
      .replace("{total}", this.config.totalItems);

    return `
      <div class="pagination-info" aria-live="polite" aria-atomic="true">
        ${info}
      </div>
    `;
  }

  /**
   * Render page size selector
   */
  renderPageSizeSelector() {
    return `
      <div class="page-size-selector">
        <label for="page-size-${this.containerId}" class="page-size-label">
          ${this.config.labels.pageSize}
        </label>
        <select id="page-size-${this.containerId}" 
                class="page-size-select"
                aria-label="Select page size">
          ${this.config.pageSizeOptions
            .map(
              (size) => `
            <option value="${size}" ${size === this.config.pageSize ? "selected" : ""}>
              ${size}
            </option>
          `,
            )
            .join("")}
        </select>
      </div>
    `;
  }

  /**
   * Render first button
   */
  renderFirstButton() {
    const disabled = this.config.currentPage === 1;
    return `
      <li class="pagination-item">
        <button class="pagination-link pagination-first" 
                data-action="first"
                ${disabled ? "disabled" : ""}
                aria-label="${this.config.labels.first}"
                aria-disabled="${disabled}">
          <span aria-hidden="true">««</span>
          <span class="sr-only">${this.config.labels.first}</span>
        </button>
      </li>
    `;
  }

  /**
   * Render previous button
   */
  renderPreviousButton() {
    const disabled = this.config.currentPage === 1;
    return `
      <li class="pagination-item">
        <button class="pagination-link pagination-previous" 
                data-action="previous"
                ${disabled ? "disabled" : ""}
                aria-label="${this.config.labels.previous}"
                aria-disabled="${disabled}">
          <span aria-hidden="true">‹</span>
          <span class="sr-only">${this.config.labels.previous}</span>
        </button>
      </li>
    `;
  }

  /**
   * Render page numbers
   */
  renderPageNumbers() {
    return this.visiblePageNumbers
      .map((page) => {
        if (page === "...") {
          return `
          <li class="pagination-item">
            <span class="pagination-ellipsis" aria-hidden="true">...</span>
          </li>
        `;
        }

        const isCurrent = page === this.config.currentPage;
        return `
        <li class="pagination-item">
          <button class="pagination-link ${isCurrent ? "pagination-current" : ""}" 
                  data-action="page"
                  data-page="${page}"
                  ${isCurrent ? 'aria-current="page"' : ""}
                  aria-label="${this.config.labels.page} ${page}">
            ${page}
          </button>
        </li>
      `;
      })
      .join("");
  }

  /**
   * Render next button
   */
  renderNextButton() {
    const disabled = this.config.currentPage === this.totalPages;
    return `
      <li class="pagination-item">
        <button class="pagination-link pagination-next" 
                data-action="next"
                ${disabled ? "disabled" : ""}
                aria-label="${this.config.labels.next}"
                aria-disabled="${disabled}">
          <span aria-hidden="true">›</span>
          <span class="sr-only">${this.config.labels.next}</span>
        </button>
      </li>
    `;
  }

  /**
   * Render last button
   */
  renderLastButton() {
    const disabled = this.config.currentPage === this.totalPages;
    return `
      <li class="pagination-item">
        <button class="pagination-link pagination-last" 
                data-action="last"
                ${disabled ? "disabled" : ""}
                aria-label="${this.config.labels.last}"
                aria-disabled="${disabled}">
          <span aria-hidden="true">»»</span>
          <span class="sr-only">${this.config.labels.last}</span>
        </button>
      </li>
    `;
  }

  /**
   * Render jump to page control
   */
  renderJumpToPage() {
    return `
      <div class="jump-to-page">
        <label for="jump-page-${this.containerId}" class="jump-label">
          ${this.config.labels.jumpTo}
        </label>
        <input type="number" 
               id="jump-page-${this.containerId}"
               class="jump-input"
               min="1" 
               max="${this.totalPages}"
               value="${this.config.currentPage}"
               aria-label="Jump to page number">
        <button class="btn btn-sm jump-button" data-action="jump">
          Go
        </button>
      </div>
    `;
  }

  /**
   * Setup DOM event listeners
   */
  setupDOMListeners() {
    // Navigation button clicks
    this.container.addEventListener("click", (e) => {
      const button = e.target.closest("[data-action]");
      if (button && !button.disabled) {
        const action = button.dataset.action;
        const page = button.dataset.page;
        this.handleAction(action, page);
      }
    });

    // Page size change
    const pageSizeSelect = this.container.querySelector(".page-size-select");
    if (pageSizeSelect) {
      this.addDOMListener(pageSizeSelect, "change", (e) => {
        this.handlePageSizeChange(e.target.value); // handlePageSizeChange now does validation
      });
    }

    // Jump to page
    const jumpInput = this.container.querySelector(".jump-input");
    const jumpButton = this.container.querySelector(".jump-button");

    if (jumpInput) {
      // Enter key in jump input
      this.addDOMListener(jumpInput, "keydown", (e) => {
        if (e.key === "Enter") {
          this.handleJumpToPage(parseInt(jumpInput.value));
        }
      });
    }

    if (jumpButton) {
      this.addDOMListener(jumpButton, "click", () => {
        const jumpInput = this.container.querySelector(".jump-input");
        if (jumpInput) {
          this.handleJumpToPage(parseInt(jumpInput.value));
        }
      });
    }

    // Keyboard navigation
    this.addDOMListener(this.container, "keydown", (e) => {
      this.handleKeyboardNavigation(e);
    });
  }

  /**
   * Handle navigation action
   */
  handleAction(action, page) {
    let newPage = this.config.currentPage;

    switch (action) {
      case "first":
        newPage = 1;
        break;
      case "previous":
        newPage = Math.max(1, this.config.currentPage - 1);
        break;
      case "next":
        newPage = Math.min(this.totalPages, this.config.currentPage + 1);
        break;
      case "last":
        newPage = this.totalPages;
        break;
      case "page":
        newPage = parseInt(page);
        break;
      case "jump":
        // Handled separately
        return;
    }

    if (newPage !== this.config.currentPage) {
      this.goToPage(newPage);
    }
  }

  /**
   * Handle keyboard navigation
   */
  handleKeyboardNavigation(e) {
    // Only handle if focus is within pagination
    if (!this.container.contains(document.activeElement)) {
      return;
    }

    switch (e.key) {
      case "ArrowLeft":
        e.preventDefault();
        this.goToPage(Math.max(1, this.config.currentPage - 1));
        break;
      case "ArrowRight":
        e.preventDefault();
        this.goToPage(Math.min(this.totalPages, this.config.currentPage + 1));
        break;
      case "Home":
        e.preventDefault();
        this.goToPage(1);
        break;
      case "End":
        e.preventDefault();
        this.goToPage(this.totalPages);
        break;
    }
  }

  /**
   * Go to specific page
   */
  goToPage(page) {
    // Validate page number
    if (
      page < 1 ||
      page > this.totalPages ||
      page === this.config.currentPage
    ) {
      return;
    }

    const oldPage = this.config.currentPage;
    this.config.currentPage = page;

    // Recalculate
    this.calculate();

    // Re-render
    this.render();

    // Call change callback
    if (this.config.onChange) {
      this.config.onChange({
        currentPage: this.config.currentPage,
        previousPage: oldPage,
        pageSize: this.config.pageSize,
        totalPages: this.totalPages,
        startItem: this.startItem,
        endItem: this.endItem,
      });
    }

    // Emit change event
    this.emit("pageChange", {
      currentPage: this.config.currentPage,
      previousPage: oldPage,
    });

    // Announce change
    this.announce(`Page ${this.config.currentPage} of ${this.totalPages}`);
  }

  /**
   * Handle page size change
   */
  handlePageSizeChange(newSize) {
    // Validate input using SecurityUtils if available
    if (typeof window.SecurityUtils !== "undefined") {
      newSize = window.SecurityUtils.validateInteger(newSize, {
        min: 1,
        max: 1000,
      });
      if (newSize === null) {
        return;
      }
    } else {
      // Fallback validation
      newSize = parseInt(newSize, 10);
      if (isNaN(newSize) || newSize < 1 || newSize > 1000) {
        return;
      }
    }

    if (newSize === this.config.pageSize) {
      return;
    }

    const oldSize = this.config.pageSize;
    this.config.pageSize = newSize;

    // Adjust current page to maintain position
    const firstItem = (this.config.currentPage - 1) * oldSize + 1;
    this.config.currentPage = Math.ceil(firstItem / newSize);

    // Recalculate
    this.calculate();

    // Re-render
    this.render();

    // Call page size change callback
    if (this.config.onPageSizeChange) {
      this.config.onPageSizeChange({
        pageSize: this.config.pageSize,
        previousPageSize: oldSize,
        currentPage: this.config.currentPage,
        totalPages: this.totalPages,
      });
    }

    // Emit event
    this.emit("pageSizeChange", {
      pageSize: this.config.pageSize,
      previousPageSize: oldSize,
    });

    // Announce change
    this.announce(
      `Page size changed to ${this.config.pageSize} items per page`,
    );
  }

  /**
   * Handle jump to page
   */
  handleJumpToPage(page) {
    // Validate input using SecurityUtils if available
    if (typeof window.SecurityUtils !== "undefined") {
      page = window.SecurityUtils.validateInteger(page, {
        min: 1,
        max: this.totalPages,
      });
      if (page === null) {
        return;
      }
    } else {
      // Fallback validation
      page = parseInt(page, 10);
      if (isNaN(page)) {
        return;
      }
      // Clamp to valid range
      page = Math.max(1, Math.min(this.totalPages, page));
    }

    this.goToPage(page);
  }

  /**
   * Update total items
   */
  setTotalItems(total) {
    this.config.totalItems = total;
    this.calculate();
    this.render();
  }

  /**
   * Update page size
   */
  setPageSize(size) {
    this.handlePageSizeChange(size);
  }

  /**
   * Get current page info
   */
  getPageInfo() {
    return {
      currentPage: this.config.currentPage,
      pageSize: this.config.pageSize,
      totalPages: this.totalPages,
      totalItems: this.config.totalItems,
      startItem: this.startItem,
      endItem: this.endItem,
    };
  }

  /**
   * Reset to first page
   */
  reset() {
    this.goToPage(1);
  }

  /**
   * Handle responsive breakpoint change
   */
  onBreakpointChange(breakpoint) {
    // Switch to compact mode on mobile
    const wasCompact = this.config.compactMode;
    this.config.compactMode = breakpoint === "mobile";

    if (wasCompact !== this.config.compactMode) {
      this.render();
    }
  }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = PaginationComponent;
}

if (typeof window !== "undefined") {
  window.PaginationComponent = PaginationComponent;
}
