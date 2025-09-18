/**
 * FilterComponent - Advanced Filtering UI Component
 * US-082-B Component Architecture Development
 *
 * Provides comprehensive filtering capabilities:
 * - Text search with XSS protection
 * - Dropdown filters with sanitization
 * - Date range selection
 * - Multi-select options
 * - Filter persistence
 * - Security-first design
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

class FilterComponent extends BaseComponent {
  constructor(containerId, config = {}) {
    super(containerId, config);

    // Filter configuration
    this.filters = config.filters || [];
    this.onFilterChange = config.onFilterChange || (() => {});
    this.onFilterClear = config.onFilterClear || (() => {});

    // Current filter state
    this.activeFilters = {};

    // Debounce settings
    this.debounceDelay = config.debounceDelay || 300;
    this.debounceTimer = null;

    // Security settings
    this.maxTextLength = config.maxTextLength || 100;
    this.maxSelections = config.maxSelections || 50;
  }

  /**
   * Initialize filter component
   */
  onInitialize() {
    this.validateFilters();
    this.initializeActiveFilters();
  }

  /**
   * Validate filter configuration
   */
  validateFilters() {
    this.filters = this.filters.filter((filter) => {
      if (!filter.name || !filter.type) {
        this.logWarning("Invalid filter configuration:", filter);
        return false;
      }

      // Validate filter type
      const validTypes = [
        "text",
        "select",
        "multiselect",
        "date",
        "daterange",
        "number",
        "boolean",
      ];
      if (!validTypes.includes(filter.type)) {
        this.logWarning(`Invalid filter type: ${filter.type}`);
        return false;
      }

      // Sanitize filter name and label
      filter.name = this.sanitizeIdentifier(filter.name);
      filter.label = this.sanitizeText(filter.label || filter.name);

      // Validate and sanitize options for select filters
      if (["select", "multiselect"].includes(filter.type)) {
        if (!Array.isArray(filter.options)) {
          this.logWarning("Select filter missing options:", filter);
          return false;
        }
        filter.options = this.sanitizeOptions(filter.options);
      }

      return true;
    });
  }

  /**
   * Sanitize identifier (alphanumeric + underscore only)
   */
  sanitizeIdentifier(id) {
    if (!id) return "";
    return String(id).replace(/[^a-zA-Z0-9_]/g, "");
  }

  /**
   * Sanitize text content
   */
  sanitizeText(text) {
    if (typeof SecurityUtils !== "undefined") {
      return SecurityUtils.escapeHtml(text);
    }
    // Fallback escaping
    const div = document.createElement("div");
    div.textContent = String(text || "");
    return div.innerHTML;
  }

  /**
   * Sanitize select options
   */
  sanitizeOptions(options) {
    return options
      .map((option) => {
        if (typeof option === "string") {
          return {
            value: this.sanitizeText(option),
            label: this.sanitizeText(option),
          };
        }
        return {
          value: this.sanitizeText(option.value || ""),
          label: this.sanitizeText(option.label || option.value || ""),
        };
      })
      .slice(0, 100); // Limit to 100 options
  }

  /**
   * Initialize active filters
   */
  initializeActiveFilters() {
    this.filters.forEach((filter) => {
      if (filter.defaultValue !== undefined) {
        this.activeFilters[filter.name] = this.validateFilterValue(
          filter.defaultValue,
          filter.type,
        );
      }
    });
  }

  /**
   * Validate filter value based on type
   */
  validateFilterValue(value, type) {
    if (value == null) return null;

    switch (type) {
      case "text":
        return this.validateTextFilter(value);

      case "number":
        return this.validateNumberFilter(value);

      case "select":
        return this.sanitizeText(value);

      case "multiselect":
        return this.validateMultiSelect(value);

      case "date":
        return this.validateDateFilter(value);

      case "daterange":
        return this.validateDateRangeFilter(value);

      case "boolean":
        return Boolean(value);

      default:
        return null;
    }
  }

  /**
   * Validate text filter
   */
  validateTextFilter(value) {
    if (typeof SecurityUtils !== "undefined") {
      value = SecurityUtils.validateString(value, {
        maxLength: this.maxTextLength,
        pattern: /^[a-zA-Z0-9\s\-_.@]+$/,
      });
    } else {
      value = String(value).slice(0, this.maxTextLength);
    }
    return this.sanitizeText(value);
  }

  /**
   * Validate number filter
   */
  validateNumberFilter(value) {
    if (typeof SecurityUtils !== "undefined") {
      return SecurityUtils.validateInteger(value, {
        min: -999999999,
        max: 999999999,
      });
    }
    const num = Number(value);
    return isNaN(num) ? null : num;
  }

  /**
   * Validate multi-select values
   */
  validateMultiSelect(values) {
    if (!Array.isArray(values)) return [];

    return values
      .slice(0, this.maxSelections)
      .map((v) => this.sanitizeText(v))
      .filter(Boolean);
  }

  /**
   * Validate date filter
   */
  validateDateFilter(value) {
    try {
      const date = new Date(value);
      if (isNaN(date.getTime())) return null;

      // Reasonable date range (1900-2100)
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) return null;

      return date.toISOString().split("T")[0];
    } catch {
      return null;
    }
  }

  /**
   * Validate date range filter
   */
  validateDateRangeFilter(value) {
    if (!value || typeof value !== "object") return null;

    const from = this.validateDateFilter(value.from);
    const to = this.validateDateFilter(value.to);

    if (!from || !to) return null;
    if (new Date(from) > new Date(to)) return null;

    return { from, to };
  }

  /**
   * Render filter component
   */
  onRender() {
    const container = document.createElement("div");
    container.className = "filter-component";

    // Create filter groups
    const filterGroups = this.createFilterGroups();
    container.appendChild(filterGroups);

    // Create action buttons
    const actions = this.createActionButtons();
    container.appendChild(actions);

    // Clear and append
    this.clearContainer();
    this.container.appendChild(container);
  }

  /**
   * Create filter groups
   */
  createFilterGroups() {
    const groups = document.createElement("div");
    groups.className = "filter-groups";

    this.filters.forEach((filter) => {
      const group = this.createFilterGroup(filter);
      groups.appendChild(group);
    });

    return groups;
  }

  /**
   * Create individual filter group
   */
  createFilterGroup(filter) {
    const group = document.createElement("div");
    group.className = `filter-group filter-type-${filter.type}`;
    group.setAttribute("data-filter-name", filter.name);

    // Create label
    const label = document.createElement("label");
    label.className = "filter-label";
    label.textContent = filter.label;
    group.appendChild(label);

    // Create input based on type
    const input = this.createFilterInput(filter);
    group.appendChild(input);

    return group;
  }

  /**
   * Create filter input based on type
   */
  createFilterInput(filter) {
    switch (filter.type) {
      case "text":
        return this.createTextInput(filter);

      case "number":
        return this.createNumberInput(filter);

      case "select":
        return this.createSelectInput(filter);

      case "multiselect":
        return this.createMultiSelectInput(filter);

      case "date":
        return this.createDateInput(filter);

      case "daterange":
        return this.createDateRangeInput(filter);

      case "boolean":
        return this.createBooleanInput(filter);

      default:
        return document.createElement("div");
    }
  }

  /**
   * Create text input
   */
  createTextInput(filter) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "filter-input filter-text";
    input.placeholder = filter.placeholder || "Enter text...";
    input.maxLength = this.maxTextLength;

    if (this.activeFilters[filter.name]) {
      input.value = this.activeFilters[filter.name];
    }

    return input;
  }

  /**
   * Create number input
   */
  createNumberInput(filter) {
    const input = document.createElement("input");
    input.type = "number";
    input.className = "filter-input filter-number";
    input.placeholder = filter.placeholder || "Enter number...";

    if (filter.min !== undefined) input.min = filter.min;
    if (filter.max !== undefined) input.max = filter.max;
    if (filter.step !== undefined) input.step = filter.step;

    if (this.activeFilters[filter.name]) {
      input.value = this.activeFilters[filter.name];
    }

    return input;
  }

  /**
   * Create select input
   */
  createSelectInput(filter) {
    const select = document.createElement("select");
    select.className = "filter-input filter-select";

    // Add default option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = filter.placeholder || "Select...";
    select.appendChild(defaultOption);

    // Add options
    filter.options.forEach((option) => {
      const optionEl = document.createElement("option");
      optionEl.value = option.value;
      optionEl.textContent = option.label;

      if (this.activeFilters[filter.name] === option.value) {
        optionEl.selected = true;
      }

      select.appendChild(optionEl);
    });

    return select;
  }

  /**
   * Create multi-select input
   */
  createMultiSelectInput(filter) {
    const container = document.createElement("div");
    container.className = "filter-multiselect";

    const activeValues = this.activeFilters[filter.name] || [];

    filter.options.forEach((option) => {
      const label = document.createElement("label");
      label.className = "multiselect-option";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.value = option.value;
      checkbox.checked = activeValues.includes(option.value);

      const text = document.createElement("span");
      text.textContent = option.label;

      label.appendChild(checkbox);
      label.appendChild(text);
      container.appendChild(label);
    });

    return container;
  }

  /**
   * Create date input
   */
  createDateInput(filter) {
    const input = document.createElement("input");
    input.type = "date";
    input.className = "filter-input filter-date";

    if (filter.min) input.min = filter.min;
    if (filter.max) input.max = filter.max;

    if (this.activeFilters[filter.name]) {
      input.value = this.activeFilters[filter.name];
    }

    return input;
  }

  /**
   * Create date range input
   */
  createDateRangeInput(filter) {
    const container = document.createElement("div");
    container.className = "filter-daterange";

    const fromInput = document.createElement("input");
    fromInput.type = "date";
    fromInput.className = "daterange-from";
    fromInput.placeholder = "From";

    const toInput = document.createElement("input");
    toInput.type = "date";
    toInput.className = "daterange-to";
    toInput.placeholder = "To";

    if (this.activeFilters[filter.name]) {
      fromInput.value = this.activeFilters[filter.name].from || "";
      toInput.value = this.activeFilters[filter.name].to || "";
    }

    container.appendChild(fromInput);
    container.appendChild(document.createTextNode(" to "));
    container.appendChild(toInput);

    return container;
  }

  /**
   * Create boolean input
   */
  createBooleanInput(filter) {
    const label = document.createElement("label");
    label.className = "filter-boolean";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = Boolean(this.activeFilters[filter.name]);

    const text = document.createElement("span");
    text.textContent = filter.checkboxLabel || "Enabled";

    label.appendChild(checkbox);
    label.appendChild(text);

    return label;
  }

  /**
   * Create action buttons
   */
  createActionButtons() {
    const actions = document.createElement("div");
    actions.className = "filter-actions";

    const applyBtn = document.createElement("button");
    applyBtn.className = "btn btn-primary filter-apply";
    applyBtn.textContent = "Apply Filters";

    const clearBtn = document.createElement("button");
    clearBtn.className = "btn btn-secondary filter-clear";
    clearBtn.textContent = "Clear All";

    actions.appendChild(applyBtn);
    actions.appendChild(clearBtn);

    return actions;
  }

  /**
   * Setup DOM event listeners
   */
  setupDOMListeners() {
    if (!this.container) return;

    // Text input listeners (with debounce)
    this.container
      .querySelectorAll(".filter-text, .filter-number")
      .forEach((input) => {
        this.addDOMListener(input, "input", (e) => {
          this.handleTextInput(e);
        });
      });

    // Select listeners
    this.container.querySelectorAll(".filter-select").forEach((select) => {
      this.addDOMListener(select, "change", (e) => {
        this.handleSelectChange(e);
      });
    });

    // Multi-select listeners
    this.container
      .querySelectorAll('.filter-multiselect input[type="checkbox"]')
      .forEach((checkbox) => {
        this.addDOMListener(checkbox, "change", (e) => {
          this.handleMultiSelectChange(e);
        });
      });

    // Date listeners
    this.container.querySelectorAll(".filter-date").forEach((input) => {
      this.addDOMListener(input, "change", (e) => {
        this.handleDateChange(e);
      });
    });

    // Date range listeners
    this.container
      .querySelectorAll(".daterange-from, .daterange-to")
      .forEach((input) => {
        this.addDOMListener(input, "change", (e) => {
          this.handleDateRangeChange(e);
        });
      });

    // Boolean listeners
    this.container
      .querySelectorAll('.filter-boolean input[type="checkbox"]')
      .forEach((checkbox) => {
        this.addDOMListener(checkbox, "change", (e) => {
          this.handleBooleanChange(e);
        });
      });

    // Action button listeners
    const applyBtn = this.container.querySelector(".filter-apply");
    if (applyBtn) {
      this.addDOMListener(applyBtn, "click", () => {
        this.applyFilters();
      });
    }

    const clearBtn = this.container.querySelector(".filter-clear");
    if (clearBtn) {
      this.addDOMListener(clearBtn, "click", () => {
        this.clearFilters();
      });
    }
  }

  /**
   * Handle text input with debounce
   */
  handleTextInput(event) {
    const filterGroup = event.target.closest(".filter-group");
    const filterName = filterGroup.getAttribute("data-filter-name");
    const filter = this.filters.find((f) => f.name === filterName);

    if (!filter) return;

    clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => {
      const value = this.validateFilterValue(event.target.value, filter.type);
      if (value !== null) {
        this.activeFilters[filterName] = value;
        this.emitFilterChange();
      }
    }, this.debounceDelay);
  }

  /**
   * Handle select change
   */
  handleSelectChange(event) {
    const filterGroup = event.target.closest(".filter-group");
    const filterName = filterGroup.getAttribute("data-filter-name");
    const value = event.target.value;

    if (value) {
      this.activeFilters[filterName] = this.sanitizeText(value);
    } else {
      delete this.activeFilters[filterName];
    }

    this.emitFilterChange();
  }

  /**
   * Handle multi-select change
   */
  handleMultiSelectChange(event) {
    const filterGroup = event.target.closest(".filter-group");
    const filterName = filterGroup.getAttribute("data-filter-name");

    const checkboxes = filterGroup.querySelectorAll(
      'input[type="checkbox"]:checked',
    );
    const values = Array.from(checkboxes)
      .map((cb) => cb.value)
      .slice(0, this.maxSelections);

    if (values.length > 0) {
      this.activeFilters[filterName] = this.validateMultiSelect(values);
    } else {
      delete this.activeFilters[filterName];
    }

    this.emitFilterChange();
  }

  /**
   * Handle date change
   */
  handleDateChange(event) {
    const filterGroup = event.target.closest(".filter-group");
    const filterName = filterGroup.getAttribute("data-filter-name");
    const value = this.validateDateFilter(event.target.value);

    if (value) {
      this.activeFilters[filterName] = value;
    } else {
      delete this.activeFilters[filterName];
    }

    this.emitFilterChange();
  }

  /**
   * Handle date range change
   */
  handleDateRangeChange(event) {
    const filterGroup = event.target.closest(".filter-group");
    const filterName = filterGroup.getAttribute("data-filter-name");

    const fromInput = filterGroup.querySelector(".daterange-from");
    const toInput = filterGroup.querySelector(".daterange-to");

    const value = this.validateDateRangeFilter({
      from: fromInput.value,
      to: toInput.value,
    });

    if (value) {
      this.activeFilters[filterName] = value;
    } else {
      delete this.activeFilters[filterName];
    }

    this.emitFilterChange();
  }

  /**
   * Handle boolean change
   */
  handleBooleanChange(event) {
    const filterGroup = event.target.closest(".filter-group");
    const filterName = filterGroup.getAttribute("data-filter-name");

    if (event.target.checked) {
      this.activeFilters[filterName] = true;
    } else {
      delete this.activeFilters[filterName];
    }

    this.emitFilterChange();
  }

  /**
   * Apply filters
   */
  applyFilters() {
    this.onFilterChange(this.getActiveFilters());
    this.announce("Filters applied");
  }

  /**
   * Clear all filters
   */
  clearFilters() {
    this.activeFilters = {};
    this.render();
    this.onFilterClear();
    this.announce("All filters cleared");
  }

  /**
   * Emit filter change event
   */
  emitFilterChange() {
    this.emit("filterChange", this.getActiveFilters());
  }

  /**
   * Get active filters
   */
  getActiveFilters() {
    // Deep clone to prevent mutation
    if (typeof SecurityUtils !== "undefined") {
      return SecurityUtils.deepClone(this.activeFilters);
    }
    return JSON.parse(JSON.stringify(this.activeFilters));
  }

  /**
   * Set filters programmatically
   */
  setFilters(filters) {
    Object.keys(filters).forEach((name) => {
      const filter = this.filters.find((f) => f.name === name);
      if (filter) {
        const value = this.validateFilterValue(filters[name], filter.type);
        if (value !== null) {
          this.activeFilters[name] = value;
        }
      }
    });

    this.render();
    this.emitFilterChange();
  }

  /**
   * Get filter summary for display
   */
  getFilterSummary() {
    const summary = [];

    Object.keys(this.activeFilters).forEach((name) => {
      const filter = this.filters.find((f) => f.name === name);
      if (!filter) return;

      const value = this.activeFilters[name];
      let displayValue = value;

      if (filter.type === "multiselect" && Array.isArray(value)) {
        displayValue = `${value.length} selected`;
      } else if (filter.type === "daterange" && value) {
        displayValue = `${value.from} to ${value.to}`;
      } else if (filter.type === "boolean") {
        displayValue = value ? "Yes" : "No";
      }

      summary.push({
        label: filter.label,
        value: displayValue,
      });
    });

    return summary;
  }
}

// Export for use
if (typeof module !== "undefined" && module.exports) {
  module.exports = FilterComponent;
}

if (typeof window !== "undefined") {
  window.FilterComponent = FilterComponent;
}
