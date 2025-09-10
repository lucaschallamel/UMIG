/**
 * FilterComponent Unit Tests
 * US-082-B Component Architecture Development
 *
 * Tests advanced filtering functionality including:
 * - Text search with XSS protection
 * - Dropdown filters with sanitization
 * - Date range selection
 * - Multi-select options
 * - Filter persistence
 * - Security-first design
 * - Input validation
 * - Debouncing behavior
 */

// Import components
const BaseComponent = require("../../../../src/groovy/umig/web/js/components/BaseComponent");
const FilterComponent = require("../../../../src/groovy/umig/web/js/components/FilterComponent");

// Make BaseComponent available globally for FilterComponent
global.BaseComponent = BaseComponent;

// Mock SecurityUtils globally
global.SecurityUtils = {
  escapeHtml: jest.fn((text) =>
    String(text).replace(
      /[<>&"']/g,
      (match) =>
        ({
          "<": "&lt;",
          ">": "&gt;",
          "&": "&amp;",
          '"': "&quot;",
          "'": "&#x27;",
        })[match],
    ),
  ),
  validateString: jest.fn((value, constraints = {}) => {
    const str = String(value || "");
    if (constraints.maxLength && str.length > constraints.maxLength) {
      return str.substring(0, constraints.maxLength);
    }
    if (constraints.pattern && !constraints.pattern.test(str)) {
      return null;
    }
    return str;
  }),
  validateInteger: jest.fn((value, constraints = {}) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return null;
    if (constraints.min !== undefined && num < constraints.min) return null;
    if (constraints.max !== undefined && num > constraints.max) return null;
    return num;
  }),
  deepClone: jest.fn((obj) => JSON.parse(JSON.stringify(obj))),
};

describe("FilterComponent", () => {
  let container;
  let component;
  let mockFilters;

  beforeEach(() => {
    // Create container element
    container = document.createElement("div");
    container.id = "test-filter";
    document.body.appendChild(container);

    // Mock filters configuration
    mockFilters = [
      {
        name: "search",
        type: "text",
        label: "Search",
        placeholder: "Enter search term...",
      },
      {
        name: "status",
        type: "select",
        label: "Status",
        options: [
          { value: "active", label: "Active" },
          { value: "inactive", label: "Inactive" },
          { value: "pending", label: "Pending" },
        ],
      },
      {
        name: "tags",
        type: "multiselect",
        label: "Tags",
        options: [
          { value: "urgent", label: "Urgent" },
          { value: "important", label: "Important" },
          { value: "low", label: "Low Priority" },
        ],
      },
      {
        name: "created",
        type: "daterange",
        label: "Created Date",
      },
      {
        name: "enabled",
        type: "boolean",
        label: "Enabled",
        checkboxLabel: "Is Enabled",
      },
    ];

    jest.clearAllMocks();
  });

  afterEach(() => {
    if (component) {
      component.destroy();
      component = null;
    }
    document.body.removeChild(container);
    jest.clearAllTimers();
  });

  describe("Initialization", () => {
    test("should initialize with default configuration", () => {
      component = new FilterComponent("test-filter");
      component.initialize();

      expect(component.initialized).toBe(true);
      expect(component.filters).toEqual([]);
      expect(component.activeFilters).toEqual({});
      expect(component.debounceDelay).toBe(300);
      expect(component.maxTextLength).toBe(100);
      expect(component.maxSelections).toBe(50);
    });

    test("should initialize with custom configuration", () => {
      const onFilterChange = jest.fn();
      const onFilterClear = jest.fn();

      component = new FilterComponent("test-filter", {
        filters: mockFilters,
        onFilterChange,
        onFilterClear,
        debounceDelay: 500,
        maxTextLength: 200,
      });
      component.initialize();

      expect(component.filters.length).toBe(5);
      expect(component.onFilterChange).toBe(onFilterChange);
      expect(component.onFilterClear).toBe(onFilterClear);
      expect(component.debounceDelay).toBe(500);
      expect(component.maxTextLength).toBe(200);
    });

    test("should validate and sanitize filter configuration", () => {
      const invalidFilters = [
        { name: "valid", type: "text", label: "Valid Filter" },
        { name: "", type: "text", label: "Invalid - No Name" }, // Should be removed
        { name: "no-type", label: "Invalid - No Type" }, // Should be removed
        { name: "invalid-type", type: "invalid", label: "Invalid Type" }, // Should be removed
        { name: "select-no-options", type: "select", label: "Invalid Select" }, // Should be removed
      ];

      component = new FilterComponent("test-filter", {
        filters: invalidFilters,
      });
      component.initialize();

      expect(component.filters.length).toBe(1);
      expect(component.filters[0].name).toBe("valid");
    });

    test("should sanitize filter names and labels", () => {
      const unsafeFilters = [
        {
          name: 'test<script>alert("xss")</script>',
          type: "text",
          label: 'Test<script>alert("xss")</script>',
        },
      ];

      component = new FilterComponent("test-filter", {
        filters: unsafeFilters,
      });
      component.initialize();

      expect(SecurityUtils.escapeHtml).toHaveBeenCalled();
      expect(component.filters[0].name).not.toContain("<script>");
    });

    test("should sanitize select options", () => {
      const unsafeOptions = [
        { value: '<script>alert("xss")</script>', label: "XSS Attempt" },
        "string option",
        { value: "safe", label: "Safe Option" },
      ];

      const filtersWithUnsafeOptions = [
        {
          name: "test",
          type: "select",
          label: "Test",
          options: unsafeOptions,
        },
      ];

      component = new FilterComponent("test-filter", {
        filters: filtersWithUnsafeOptions,
      });
      component.initialize();

      expect(SecurityUtils.escapeHtml).toHaveBeenCalledTimes(6); // name, label, and each option value/label
      expect(component.filters[0].options).toHaveLength(3);
    });

    test("should initialize active filters from default values", () => {
      const filtersWithDefaults = [
        { name: "search", type: "text", defaultValue: "test search" },
        {
          name: "status",
          type: "select",
          options: [{ value: "active", label: "Active" }],
          defaultValue: "active",
        },
      ];

      component = new FilterComponent("test-filter", {
        filters: filtersWithDefaults,
      });
      component.initialize();

      expect(component.activeFilters.search).toBeDefined();
      expect(component.activeFilters.status).toBe("active");
    });
  });

  describe("Filter Validation", () => {
    beforeEach(() => {
      component = new FilterComponent("test-filter", {
        filters: mockFilters,
      });
      component.initialize();
    });

    test("should validate text filter values", () => {
      const result = component.validateTextFilter("test search");
      expect(result).toBeDefined();
      expect(SecurityUtils.validateString).toHaveBeenCalled();
    });

    test("should validate number filter values", () => {
      const result = component.validateNumberFilter("123");
      expect(result).toBe(123);
      expect(SecurityUtils.validateInteger).toHaveBeenCalled();
    });

    test("should validate multi-select values", () => {
      const values = ["option1", "option2", "option3"];
      const result = component.validateMultiSelect(values);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
    });

    test("should limit multi-select values", () => {
      const manyValues = Array.from({ length: 100 }, (_, i) => `option${i}`);
      const result = component.validateMultiSelect(manyValues);

      expect(result.length).toBe(component.maxSelections);
    });

    test("should validate date filter values", () => {
      const validDate = "2023-12-25";
      const invalidDate = "invalid-date";
      const futureDate = "2150-01-01";
      const pastDate = "1800-01-01";

      expect(component.validateDateFilter(validDate)).toBe(validDate);
      expect(component.validateDateFilter(invalidDate)).toBe(null);
      expect(component.validateDateFilter(futureDate)).toBe(null);
      expect(component.validateDateFilter(pastDate)).toBe(null);
    });

    test("should validate date range filter values", () => {
      const validRange = { from: "2023-01-01", to: "2023-12-31" };
      const invalidRange = { from: "2023-12-31", to: "2023-01-01" }; // from > to
      const incompleteRange = { from: "2023-01-01" };

      expect(component.validateDateRangeFilter(validRange)).toEqual(validRange);
      expect(component.validateDateRangeFilter(invalidRange)).toBe(null);
      expect(component.validateDateRangeFilter(incompleteRange)).toBe(null);
    });
  });

  describe("Rendering", () => {
    beforeEach(() => {
      component = new FilterComponent("test-filter", {
        filters: mockFilters,
      });
      component.initialize();
    });

    test("should render filter groups", () => {
      component.render();

      const filterGroups = container.querySelectorAll(".filter-group");
      expect(filterGroups.length).toBe(mockFilters.length);
    });

    test("should render text input", () => {
      component.render();

      const textInput = container.querySelector(".filter-text");
      expect(textInput).toBeTruthy();
      expect(textInput.type).toBe("text");
      expect(textInput.maxLength).toBe(component.maxTextLength);
    });

    test("should render select input", () => {
      component.render();

      const selectInput = container.querySelector(".filter-select");
      expect(selectInput).toBeTruthy();
      expect(selectInput.tagName.toLowerCase()).toBe("select");

      const options = selectInput.querySelectorAll("option");
      expect(options.length).toBe(4); // 3 options + default
    });

    test("should render multi-select input", () => {
      component.render();

      const multiSelect = container.querySelector(".filter-multiselect");
      expect(multiSelect).toBeTruthy();

      const checkboxes = multiSelect.querySelectorAll('input[type="checkbox"]');
      expect(checkboxes.length).toBe(3);
    });

    test("should render date range input", () => {
      component.render();

      const dateRange = container.querySelector(".filter-daterange");
      expect(dateRange).toBeTruthy();

      const dateInputs = dateRange.querySelectorAll('input[type="date"]');
      expect(dateInputs.length).toBe(2);
    });

    test("should render boolean input", () => {
      component.render();

      const booleanInput = container.querySelector(
        '.filter-boolean input[type="checkbox"]',
      );
      expect(booleanInput).toBeTruthy();
    });

    test("should render action buttons", () => {
      component.render();

      const applyBtn = container.querySelector(".filter-apply");
      const clearBtn = container.querySelector(".filter-clear");

      expect(applyBtn).toBeTruthy();
      expect(clearBtn).toBeTruthy();
      expect(applyBtn.textContent).toBe("Apply Filters");
      expect(clearBtn.textContent).toBe("Clear All");
    });

    test("should populate inputs with active filter values", () => {
      component.activeFilters = {
        search: "test value",
        status: "active",
        enabled: true,
      };

      component.render();

      const textInput = container.querySelector(".filter-text");
      const selectInput = container.querySelector(".filter-select");
      const booleanInput = container.querySelector(
        '.filter-boolean input[type="checkbox"]',
      );

      expect(textInput.value).toBe("test value");
      expect(selectInput.value).toBe("active");
      expect(booleanInput.checked).toBe(true);
    });
  });

  describe("Event Handling", () => {
    beforeEach(() => {
      component = new FilterComponent("test-filter", {
        filters: mockFilters,
      });
      component.initialize();
      component.render();

      jest.useFakeTimers();
    });

    test("should handle text input with debounce", () => {
      const textInput = container.querySelector(".filter-text");
      component.emitFilterChange = jest.fn();

      textInput.value = "test search";
      textInput.dispatchEvent(new Event("input"));

      // Should not trigger immediately
      expect(component.emitFilterChange).not.toHaveBeenCalled();

      // Should trigger after debounce delay
      jest.advanceTimersByTime(300);
      expect(component.emitFilterChange).toHaveBeenCalled();
    });

    test("should handle select change", () => {
      const selectInput = container.querySelector(".filter-select");
      component.emitFilterChange = jest.fn();

      selectInput.value = "active";
      selectInput.dispatchEvent(new Event("change"));

      expect(component.activeFilters.status).toBe("active");
      expect(component.emitFilterChange).toHaveBeenCalled();
    });

    test("should handle multi-select change", () => {
      const checkboxes = container.querySelectorAll(
        '.filter-multiselect input[type="checkbox"]',
      );
      component.emitFilterChange = jest.fn();

      checkboxes[0].checked = true;
      checkboxes[1].checked = true;
      checkboxes[0].dispatchEvent(new Event("change"));

      expect(component.activeFilters.tags).toEqual(
        expect.arrayContaining(["urgent", "important"]),
      );
      expect(component.emitFilterChange).toHaveBeenCalled();
    });

    test("should handle date range change", () => {
      const dateInputs = container.querySelectorAll(
        '.filter-daterange input[type="date"]',
      );
      component.emitFilterChange = jest.fn();

      dateInputs[0].value = "2023-01-01"; // from
      dateInputs[1].value = "2023-12-31"; // to
      dateInputs[0].dispatchEvent(new Event("change"));

      expect(component.activeFilters.created).toEqual({
        from: "2023-01-01",
        to: "2023-12-31",
      });
      expect(component.emitFilterChange).toHaveBeenCalled();
    });

    test("should handle boolean change", () => {
      const booleanInput = container.querySelector(
        '.filter-boolean input[type="checkbox"]',
      );
      component.emitFilterChange = jest.fn();

      booleanInput.checked = true;
      booleanInput.dispatchEvent(new Event("change"));

      expect(component.activeFilters.enabled).toBe(true);
      expect(component.emitFilterChange).toHaveBeenCalled();
    });

    test("should handle apply button click", () => {
      const applyBtn = container.querySelector(".filter-apply");
      component.onFilterChange = jest.fn();
      component.announce = jest.fn();

      applyBtn.click();

      expect(component.onFilterChange).toHaveBeenCalledWith(
        component.activeFilters,
      );
      expect(component.announce).toHaveBeenCalledWith("Filters applied");
    });

    test("should handle clear button click", () => {
      component.activeFilters = { search: "test" };
      const clearBtn = container.querySelector(".filter-clear");
      component.onFilterClear = jest.fn();
      component.announce = jest.fn();
      component.render = jest.fn();

      clearBtn.click();

      expect(component.activeFilters).toEqual({});
      expect(component.onFilterClear).toHaveBeenCalled();
      expect(component.render).toHaveBeenCalled();
      expect(component.announce).toHaveBeenCalledWith("All filters cleared");
    });
  });

  describe("Filter Management", () => {
    beforeEach(() => {
      component = new FilterComponent("test-filter", {
        filters: mockFilters,
      });
      component.initialize();
    });

    test("should get active filters safely", () => {
      component.activeFilters = { search: "test", tags: ["urgent"] };

      const filters = component.getActiveFilters();

      expect(SecurityUtils.deepClone).toHaveBeenCalledWith(
        component.activeFilters,
      );
      expect(filters).toEqual({ search: "test", tags: ["urgent"] });
    });

    test("should set filters programmatically", () => {
      component.render = jest.fn();
      component.emitFilterChange = jest.fn();

      component.setFilters({
        search: "new search",
        status: "active",
        invalid: "should be ignored",
      });

      expect(component.activeFilters.search).toBeDefined();
      expect(component.activeFilters.status).toBe("active");
      expect(component.activeFilters.invalid).toBeUndefined();
      expect(component.render).toHaveBeenCalled();
      expect(component.emitFilterChange).toHaveBeenCalled();
    });

    test("should generate filter summary", () => {
      component.activeFilters = {
        search: "test search",
        status: "active",
        tags: ["urgent", "important"],
        created: { from: "2023-01-01", to: "2023-12-31" },
        enabled: true,
      };

      const summary = component.getFilterSummary();

      expect(summary).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ label: "Search", value: "test search" }),
          expect.objectContaining({ label: "Status", value: "active" }),
          expect.objectContaining({ label: "Tags", value: "2 selected" }),
          expect.objectContaining({
            label: "Created Date",
            value: "2023-01-01 to 2023-12-31",
          }),
          expect.objectContaining({ label: "Enabled", value: "Yes" }),
        ]),
      );
    });
  });

  describe("Security Features", () => {
    beforeEach(() => {
      component = new FilterComponent("test-filter");
      component.initialize();
    });

    test("should sanitize text input values", () => {
      const maliciousInput = '<script>alert("xss")</script>';

      const result = component.validateTextFilter(maliciousInput);

      expect(SecurityUtils.validateString).toHaveBeenCalledWith(
        maliciousInput,
        expect.objectContaining({
          maxLength: component.maxTextLength,
          pattern: expect.any(RegExp),
        }),
      );
    });

    test("should sanitize identifiers", () => {
      const unsafeId = 'test<script>alert("xss")</script>';

      const result = component.sanitizeIdentifier(unsafeId);

      expect(result).not.toContain("<");
      expect(result).not.toContain(">");
    });

    test("should validate integer inputs securely", () => {
      const invalidNumber = "not-a-number";
      const outOfRangeNumber = "999999999999";

      component.validateNumberFilter(invalidNumber);
      component.validateNumberFilter(outOfRangeNumber);

      expect(SecurityUtils.validateInteger).toHaveBeenCalledWith(
        invalidNumber,
        expect.objectContaining({
          min: -999999999,
          max: 999999999,
        }),
      );
    });

    test("should limit option counts to prevent DoS", () => {
      const manyOptions = Array.from({ length: 200 }, (_, i) => ({
        value: `opt${i}`,
        label: `Option ${i}`,
      }));

      const result = component.sanitizeOptions(manyOptions);

      expect(result.length).toBeLessThanOrEqual(100);
    });

    test("should handle null and undefined values safely", () => {
      expect(component.validateTextFilter(null)).toBeDefined();
      expect(component.validateTextFilter(undefined)).toBeDefined();
      expect(component.sanitizeText(null)).toBe("");
      expect(component.sanitizeText(undefined)).toBe("");
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      component = new FilterComponent("test-filter", {
        filters: mockFilters,
      });
      component.initialize();
    });

    test("should handle invalid filter configurations gracefully", () => {
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      component.filters = [
        null,
        undefined,
        { name: "valid", type: "text", label: "Valid" },
        { type: "text" }, // missing name
        { name: "invalid-type", type: "unknown" },
      ];

      component.validateFilters();

      expect(component.filters.length).toBe(1);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    test("should handle missing SecurityUtils gracefully", () => {
      global.SecurityUtils = undefined;

      expect(() => {
        component.sanitizeText("test");
        component.validateTextFilter("test");
      }).not.toThrow();
    });

    test("should handle DOM manipulation errors", () => {
      // Mock a scenario where container is removed
      component.container = null;

      expect(() => component.render()).not.toThrow();
    });

    test("should handle event handler errors", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();
      component.render();

      // Mock an error in validation
      component.validateFilterValue = jest.fn(() => {
        throw new Error("Validation error");
      });

      const textInput = container.querySelector(".filter-text");
      textInput.value = "test";

      expect(() => textInput.dispatchEvent(new Event("input"))).not.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      component = new FilterComponent("test-filter", {
        filters: mockFilters,
      });
      component.initialize();
      component.render();
    });

    test("should have proper labels for inputs", () => {
      const labels = container.querySelectorAll(".filter-label");
      const inputs = container.querySelectorAll(".filter-input");

      expect(labels.length).toBeGreaterThan(0);
      expect(inputs.length).toBeGreaterThan(0);

      labels.forEach((label) => {
        expect(label.textContent.trim()).not.toBe("");
      });
    });

    test("should provide helpful placeholder text", () => {
      const textInput = container.querySelector(".filter-text");

      expect(textInput.placeholder).toBe("Enter text...");
    });

    test("should announce filter changes", () => {
      component.announce = jest.fn();

      const applyBtn = container.querySelector(".filter-apply");
      applyBtn.click();

      expect(component.announce).toHaveBeenCalledWith("Filters applied");
    });
  });

  describe("Performance", () => {
    beforeEach(() => {
      component = new FilterComponent("test-filter", {
        filters: mockFilters,
        debounceDelay: 100,
      });
      component.initialize();
      component.render();

      jest.useFakeTimers();
    });

    test("should debounce text input to prevent excessive filtering", () => {
      const textInput = container.querySelector(".filter-text");
      component.emitFilterChange = jest.fn();

      // Rapid typing
      textInput.value = "t";
      textInput.dispatchEvent(new Event("input"));
      textInput.value = "te";
      textInput.dispatchEvent(new Event("input"));
      textInput.value = "tes";
      textInput.dispatchEvent(new Event("input"));
      textInput.value = "test";
      textInput.dispatchEvent(new Event("input"));

      // Should not trigger during rapid typing
      expect(component.emitFilterChange).not.toHaveBeenCalled();

      // Should trigger once after debounce delay
      jest.advanceTimersByTime(100);
      expect(component.emitFilterChange).toHaveBeenCalledTimes(1);
    });

    test("should handle large number of options efficiently", () => {
      const manyOptions = Array.from({ length: 1000 }, (_, i) => ({
        value: `option${i}`,
        label: `Option ${i}`,
      }));

      const startTime = performance.now();
      component.sanitizeOptions(manyOptions);
      const endTime = performance.now();

      // Should complete within reasonable time and be limited (adjusted for jsdom test environment)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe("Module Exports", () => {
    test("should be available as CommonJS module", () => {
      expect(FilterComponent).toBeDefined();
      expect(typeof FilterComponent).toBe("function");
    });

    test("should extend BaseComponent", () => {
      const instance = new FilterComponent("test");
      expect(instance).toBeInstanceOf(BaseComponent);
    });
  });
});
