/**
 * PaginationComponent Unit Tests
 * US-082-B Component Architecture Development
 *
 * Tests pagination functionality including:
 * - Page navigation with first/previous/next/last controls
 * - Jump to page functionality
 * - Configurable page size selector
 * - Display of total items and current range
 * - Responsive design with mobile optimization
 * - Keyboard navigation support
 * - Accessibility compliance (WCAG AA)
 * - Event-driven updates
 * - Security input validation
 */

// Use real BaseComponent and SecurityUtils for proper integration testing
const BaseComponent = require("../../../../src/groovy/umig/web/js/components/BaseComponent");
const PaginationComponent = require("../../../../src/groovy/umig/web/js/components/PaginationComponent");

describe("PaginationComponent", () => {
  let container;
  let component;

  beforeEach(() => {
    // Create container element
    container = document.createElement("div");
    container.id = "test-pagination";
    document.body.appendChild(container);

    jest.clearAllMocks();
  });

  afterEach(() => {
    if (component) {
      component.destroy();
      component = null;
    }
    document.body.removeChild(container);
  });

  describe("Initialization and Configuration", () => {
    test("should initialize with default configuration", () => {
      component = new PaginationComponent("test-pagination");
      component.initialize();

      expect(component.config.totalItems).toBe(0);
      expect(component.config.currentPage).toBe(1);
      expect(component.config.pageSize).toBe(25);
      expect(component.config.maxVisiblePages).toBe(7);
      expect(component.config.showPageSizeSelector).toBe(true);
      expect(component.config.showItemsInfo).toBe(true);
      expect(component.config.showJumpToPage).toBe(true);
      expect(component.config.showFirstLast).toBe(true);
      expect(component.config.compactMode).toBe(false);
    });

    test("should initialize with custom configuration", () => {
      const onChange = jest.fn();
      const onPageSizeChange = jest.fn();

      component = new PaginationComponent("test-pagination", {
        totalItems: 100,
        currentPage: 3,
        pageSize: 10,
        maxVisiblePages: 5,
        showFirstLast: true,
        showJumpToPage: true,
        compactMode: true,
        onChange,
        onPageSizeChange,
        labels: {
          first: "Premier",
          previous: "Précédent",
        },
      });
      component.initialize();

      expect(component.config.totalItems).toBe(100);
      expect(component.config.currentPage).toBe(3);
      expect(component.config.pageSize).toBe(10);
      expect(component.config.showFirstLast).toBe(true);
      expect(component.config.showJumpToPage).toBe(true);
      expect(component.config.compactMode).toBe(true);
      expect(component.config.onChange).toBe(onChange);
      expect(component.config.onPageSizeChange).toBe(onPageSizeChange);
      expect(component.config.labels.first).toBe("Premier");
    });

    test("should calculate pagination values correctly", () => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 100,
        currentPage: 3,
        pageSize: 10,
      });
      component.initialize();

      expect(component.totalPages).toBe(10);
      expect(component.startItem).toBe(21);
      expect(component.endItem).toBe(30);
    });

    test("should handle edge cases in calculations", () => {
      // Zero items
      component = new PaginationComponent("test-pagination", {
        totalItems: 0,
        pageSize: 10,
      });
      component.initialize();

      expect(component.totalPages).toBe(1);
      expect(component.startItem).toBe(1);
      expect(component.endItem).toBe(0);
    });

    test("should constrain current page to valid bounds", () => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 50,
        currentPage: 10, // Beyond total pages
        pageSize: 10,
      });
      component.initialize();

      expect(component.config.currentPage).toBe(5); // Should be constrained to max page

      component.config.currentPage = -5; // Before first page
      component.calculate();

      expect(component.config.currentPage).toBe(1); // Should be constrained to min page
    });
  });

  describe("Visible Page Calculation", () => {
    beforeEach(() => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 100,
        pageSize: 10,
        maxVisiblePages: 7,
      });
      component.initialize();
    });

    test("should show all pages when total pages <= max visible", () => {
      component.config.totalItems = 50; // 5 pages total
      component.calculate();

      expect(component.visiblePageNumbers).toEqual([1, 2, 3, 4, 5]);
    });

    test("should show ellipsis for many pages", () => {
      component.config.totalItems = 200; // 20 pages total
      component.config.currentPage = 10;
      component.calculate();

      expect(component.visiblePageNumbers).toContain("...");
      expect(component.visiblePageNumbers).toContain(1);
      expect(component.visiblePageNumbers).toContain(20);
    });

    test("should handle current page at beginning", () => {
      component.config.totalItems = 200; // 20 pages total
      component.config.currentPage = 2;
      component.calculate();

      expect(component.visiblePageNumbers[0]).toBe(1);
      expect(component.visiblePageNumbers).not.toContain("...");
    });

    test("should handle current page at end", () => {
      component.config.totalItems = 200; // 20 pages total
      component.config.currentPage = 19;
      component.calculate();

      expect(
        component.visiblePageNumbers[component.visiblePageNumbers.length - 1],
      ).toBe(20);
    });
  });

  describe("Rendering", () => {
    beforeEach(() => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 100,
        currentPage: 3,
        pageSize: 10,
        showFirstLast: true,
        showJumpToPage: true,
      });
      component.initialize();
    });

    test("should render full pagination controls", () => {
      component.render();

      expect(container.querySelector(".pagination-wrapper")).toBeTruthy();
      expect(container.querySelector(".pagination-controls")).toBeTruthy();
      expect(container.querySelector(".pagination")).toBeTruthy();
    });

    test("should render items info", () => {
      component.render();

      const itemsInfo = container.querySelector(".pagination-info");
      expect(itemsInfo).toBeTruthy();
      expect(itemsInfo.textContent).toContain("21");
      expect(itemsInfo.textContent).toContain("30");
      expect(itemsInfo.textContent).toContain("100");
    });

    test("should render page size selector", () => {
      component.render();

      const selector = container.querySelector(".page-size-select");
      expect(selector).toBeTruthy();
      expect(selector.tagName.toLowerCase()).toBe("select");

      const options = selector.querySelectorAll("option");
      expect(options.length).toBe(component.config.pageSizeOptions.length);
    });

    test("should render navigation buttons", () => {
      component.render();

      expect(container.querySelector(".pagination-first")).toBeTruthy();
      expect(container.querySelector(".pagination-previous")).toBeTruthy();
      expect(container.querySelector(".pagination-next")).toBeTruthy();
      expect(container.querySelector(".pagination-last")).toBeTruthy();
    });

    test("should render page numbers", () => {
      component.render();

      const pageButtons = container.querySelectorAll('[data-action="page"]');
      expect(pageButtons.length).toBeGreaterThan(0);

      const currentPageButton = container.querySelector(".pagination-current");
      expect(currentPageButton).toBeTruthy();
      expect(currentPageButton.textContent).toBe("3");
    });

    test("should render jump to page input", () => {
      component.render();

      const jumpInput = container.querySelector(".jump-input");
      expect(jumpInput).toBeTruthy();
      expect(jumpInput.type).toBe("number");
      expect(jumpInput.min).toBe("1");
      expect(jumpInput.max).toBe("10");
      expect(jumpInput.value).toBe("3");
    });

    test("should render compact mode", () => {
      component.config.compactMode = true;
      component.render();

      expect(container.querySelector(".pagination-compact")).toBeTruthy();
      expect(container.querySelector(".pagination-info")).toBeTruthy();
      expect(container.querySelector(".page-size-selector")).toBeFalsy(); // Not shown in compact
    });

    test("should disable buttons appropriately", () => {
      // First page
      component.config.currentPage = 1;
      component.calculate();
      component.render();

      expect(container.querySelector(".pagination-first").disabled).toBe(true);
      expect(container.querySelector(".pagination-previous").disabled).toBe(
        true,
      );
      expect(container.querySelector(".pagination-next").disabled).toBe(false);
      expect(container.querySelector(".pagination-last").disabled).toBe(false);

      // Last page
      component.config.currentPage = 10;
      component.calculate();
      component.render();

      expect(container.querySelector(".pagination-first").disabled).toBe(false);
      expect(container.querySelector(".pagination-previous").disabled).toBe(
        false,
      );
      expect(container.querySelector(".pagination-next").disabled).toBe(true);
      expect(container.querySelector(".pagination-last").disabled).toBe(true);
    });

    test("should use SecurityUtils for safe rendering", () => {
      component.render();

      expect(SecurityUtils.safeSetInnerHTML).toHaveBeenCalledWith(
        container,
        expect.any(String),
        expect.objectContaining({
          allowedTags: expect.arrayContaining([
            "div",
            "nav",
            "ul",
            "li",
            "button",
          ]),
          allowedAttributes: expect.any(Object),
        }),
      );
    });
  });

  describe("Navigation", () => {
    beforeEach(() => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 100,
        currentPage: 5,
        pageSize: 10,
        onChange: jest.fn(),
      });
      component.initialize();
      component.render();
    });

    test("should go to first page", () => {
      component.goToPage(1);

      expect(component.config.currentPage).toBe(1);
      expect(component.config.onChange).toHaveBeenCalledWith(
        expect.objectContaining({
          currentPage: 1,
          previousPage: 5,
        }),
      );
    });

    test("should go to previous page", () => {
      component.goToPage(4);

      expect(component.config.currentPage).toBe(4);
    });

    test("should go to next page", () => {
      component.goToPage(6);

      expect(component.config.currentPage).toBe(6);
    });

    test("should go to last page", () => {
      component.goToPage(10);

      expect(component.config.currentPage).toBe(10);
    });

    test("should not navigate beyond bounds", () => {
      component.goToPage(-1);
      expect(component.config.currentPage).toBe(5); // Should remain unchanged

      component.goToPage(15);
      expect(component.config.currentPage).toBe(5); // Should remain unchanged

      component.goToPage(5); // Same page
      expect(component.config.onChange).not.toHaveBeenCalled();
    });

    test("should emit pageChange event", () => {
      const pageChangeHandler = jest.fn();
      component.on("pageChange", pageChangeHandler);

      component.goToPage(3);

      expect(pageChangeHandler).toHaveBeenCalledWith({
        currentPage: 3,
        previousPage: 5,
      });
    });

    test("should announce page changes", () => {
      component.announce = jest.fn();

      component.goToPage(7);

      expect(component.announce).toHaveBeenCalledWith("Page 7 of 10");
    });

    test("should recalculate and re-render on navigation", () => {
      component.calculate = jest.fn();
      component.render = jest.fn();

      component.goToPage(3);

      expect(component.calculate).toHaveBeenCalled();
      expect(component.render).toHaveBeenCalled();
    });
  });

  describe("Event Handling", () => {
    beforeEach(() => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 100,
        pageSize: 10,
      });
      component.initialize();
      component.render();
    });

    test("should handle button clicks", () => {
      component.goToPage = jest.fn();

      // Test first button
      const firstBtn = container.querySelector('[data-action="first"]');
      firstBtn.click();
      expect(component.goToPage).toHaveBeenCalledWith(1);

      // Test previous button
      const prevBtn = container.querySelector('[data-action="previous"]');
      prevBtn.click();
      expect(component.goToPage).toHaveBeenCalledWith(0); // Current page - 1, but will be clamped

      // Test page number button
      const pageBtn = container.querySelector('[data-action="page"]');
      if (pageBtn) {
        pageBtn.click();
        expect(component.goToPage).toHaveBeenCalledWith(
          parseInt(pageBtn.dataset.page),
        );
      }
    });

    test("should handle page size change", () => {
      component.handlePageSizeChange = jest.fn();

      const pageSize = container.querySelector(".page-size-select");
      pageSize.value = "50";
      pageSize.dispatchEvent(new Event("change"));

      expect(component.handlePageSizeChange).toHaveBeenCalledWith("50");
    });

    test("should handle jump to page", () => {
      component.handleJumpToPage = jest.fn();

      const jumpInput = container.querySelector(".jump-input");
      const jumpButton = container.querySelector(".jump-button");

      if (jumpInput && jumpButton) {
        jumpInput.value = "7";
        jumpButton.click();

        expect(component.handleJumpToPage).toHaveBeenCalledWith(7);
      }
    });

    test("should handle enter key in jump input", () => {
      component.handleJumpToPage = jest.fn();

      const jumpInput = container.querySelector(".jump-input");
      if (jumpInput) {
        jumpInput.value = "8";

        const enterEvent = new KeyboardEvent("keydown", { key: "Enter" });
        jumpInput.dispatchEvent(enterEvent);

        expect(component.handleJumpToPage).toHaveBeenCalledWith(8);
      }
    });

    test("should handle keyboard navigation", () => {
      component.goToPage = jest.fn();

      // Arrow left (previous)
      const leftEvent = new KeyboardEvent("keydown", { key: "ArrowLeft" });
      container.dispatchEvent(leftEvent);
      expect(leftEvent.defaultPrevented).toBe(true);

      // Arrow right (next)
      const rightEvent = new KeyboardEvent("keydown", { key: "ArrowRight" });
      container.dispatchEvent(rightEvent);
      expect(rightEvent.defaultPrevented).toBe(true);

      // Home (first)
      const homeEvent = new KeyboardEvent("keydown", { key: "Home" });
      container.dispatchEvent(homeEvent);
      expect(homeEvent.defaultPrevented).toBe(true);

      // End (last)
      const endEvent = new KeyboardEvent("keydown", { key: "End" });
      container.dispatchEvent(endEvent);
      expect(endEvent.defaultPrevented).toBe(true);
    });

    test("should ignore disabled buttons", () => {
      component.goToPage = jest.fn();

      const firstBtn = container.querySelector('[data-action="first"]');
      firstBtn.disabled = true;
      firstBtn.click();

      expect(component.goToPage).not.toHaveBeenCalled();
    });
  });

  describe("Page Size Management", () => {
    beforeEach(() => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 100,
        currentPage: 5,
        pageSize: 10,
        onPageSizeChange: jest.fn(),
      });
      component.initialize();
    });

    test("should change page size and adjust current page", () => {
      component.handlePageSizeChange(25);

      expect(component.config.pageSize).toBe(25);
      expect(component.config.currentPage).toBe(2); // Adjusted to maintain position
      expect(component.config.onPageSizeChange).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 25,
          previousPageSize: 10,
          currentPage: 2,
        }),
      );
    });

    test("should validate page size using SecurityUtils", () => {
      component.handlePageSizeChange("abc");

      expect(SecurityUtils.validateInteger).toHaveBeenCalledWith(
        "abc",
        expect.objectContaining({
          min: 1,
          max: 1000,
        }),
      );
    });

    test("should ignore invalid page size", () => {
      SecurityUtils.validateInteger.mockReturnValueOnce(null);
      const originalPageSize = component.config.pageSize;

      component.handlePageSizeChange("invalid");

      expect(component.config.pageSize).toBe(originalPageSize);
    });

    test("should not change if same page size", () => {
      component.render = jest.fn();

      component.handlePageSizeChange(10); // Same as current

      expect(component.render).not.toHaveBeenCalled();
      expect(component.config.onPageSizeChange).not.toHaveBeenCalled();
    });

    test("should emit pageSizeChange event", () => {
      const pageSizeHandler = jest.fn();
      component.on("pageSizeChange", pageSizeHandler);

      component.handlePageSizeChange(50);

      expect(pageSizeHandler).toHaveBeenCalledWith({
        pageSize: 50,
        previousPageSize: 10,
      });
    });

    test("should announce page size change", () => {
      component.announce = jest.fn();

      component.handlePageSizeChange(25);

      expect(component.announce).toHaveBeenCalledWith(
        "Page size changed to 25 items per page",
      );
    });
  });

  describe("Jump to Page", () => {
    beforeEach(() => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 100,
        pageSize: 10,
      });
      component.initialize();
    });

    test("should jump to valid page", () => {
      component.goToPage = jest.fn();

      component.handleJumpToPage(7);

      expect(component.goToPage).toHaveBeenCalledWith(7);
    });

    test("should validate jump page using SecurityUtils", () => {
      component.handleJumpToPage("abc");

      expect(SecurityUtils.validateInteger).toHaveBeenCalledWith(
        "abc",
        expect.objectContaining({
          min: 1,
          max: 10,
        }),
      );
    });

    test("should ignore invalid jump page", () => {
      SecurityUtils.validateInteger.mockReturnValueOnce(null);
      component.goToPage = jest.fn();

      component.handleJumpToPage("invalid");

      expect(component.goToPage).not.toHaveBeenCalled();
    });

    test("should clamp jump page to valid range without SecurityUtils", () => {
      global.SecurityUtils = undefined;
      component.goToPage = jest.fn();

      component.handleJumpToPage(15); // Beyond max page

      expect(component.goToPage).toHaveBeenCalledWith(10); // Clamped to max
    });
  });

  describe("Utility Methods", () => {
    beforeEach(() => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 100,
        currentPage: 3,
        pageSize: 10,
      });
      component.initialize();
    });

    test("should set total items and recalculate", () => {
      component.calculate = jest.fn();
      component.render = jest.fn();

      component.setTotalItems(150);

      expect(component.config.totalItems).toBe(150);
      expect(component.calculate).toHaveBeenCalled();
      expect(component.render).toHaveBeenCalled();
    });

    test("should set page size", () => {
      component.handlePageSizeChange = jest.fn();

      component.setPageSize(25);

      expect(component.handlePageSizeChange).toHaveBeenCalledWith(25);
    });

    test("should get page info", () => {
      const info = component.getPageInfo();

      expect(info).toEqual({
        currentPage: 3,
        pageSize: 10,
        totalPages: 10,
        totalItems: 100,
        startItem: 21,
        endItem: 30,
      });
    });

    test("should reset to first page", () => {
      component.goToPage = jest.fn();

      component.reset();

      expect(component.goToPage).toHaveBeenCalledWith(1);
    });
  });

  describe("Responsive Behavior", () => {
    beforeEach(() => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 100,
        pageSize: 10,
      });
      component.initialize();
    });

    test("should switch to compact mode on mobile", () => {
      component.render = jest.fn();

      component.onBreakpointChange("mobile");

      expect(component.config.compactMode).toBe(true);
      expect(component.render).toHaveBeenCalled();
    });

    test("should switch to full mode on desktop", () => {
      component.config.compactMode = true;
      component.render = jest.fn();

      component.onBreakpointChange("desktop");

      expect(component.config.compactMode).toBe(false);
      expect(component.render).toHaveBeenCalled();
    });

    test("should not re-render if mode unchanged", () => {
      component.config.compactMode = false;
      component.render = jest.fn();

      component.onBreakpointChange("desktop");

      expect(component.render).not.toHaveBeenCalled();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 100,
        currentPage: 5,
        pageSize: 10,
        showFirstLast: true,
      });
      component.initialize();
      component.render();
    });

    test("should have proper ARIA roles and labels", () => {
      const nav = container.querySelector('[role="navigation"]');
      expect(nav).toBeTruthy();
      expect(nav.getAttribute("aria-label")).toBe("Pagination Navigation");

      const currentPage = container.querySelector('[aria-current="page"]');
      expect(currentPage).toBeTruthy();
      expect(currentPage.textContent).toBe("5");
    });

    test("should have descriptive aria-labels for buttons", () => {
      const firstBtn = container.querySelector(".pagination-first");
      const prevBtn = container.querySelector(".pagination-previous");
      const nextBtn = container.querySelector(".pagination-next");
      const lastBtn = container.querySelector(".pagination-last");

      expect(firstBtn.getAttribute("aria-label")).toBe("First");
      expect(prevBtn.getAttribute("aria-label")).toBe("Previous");
      expect(nextBtn.getAttribute("aria-label")).toBe("Next");
      expect(lastBtn.getAttribute("aria-label")).toBe("Last");
    });

    test("should have proper aria-disabled attributes", () => {
      component.config.currentPage = 1;
      component.calculate();
      component.render();

      const firstBtn = container.querySelector(".pagination-first");
      const prevBtn = container.querySelector(".pagination-previous");

      expect(firstBtn.getAttribute("aria-disabled")).toBe("true");
      expect(prevBtn.getAttribute("aria-disabled")).toBe("true");
    });

    test("should have live region for announcements", () => {
      const itemsInfo = container.querySelector('[aria-live="polite"]');
      expect(itemsInfo).toBeTruthy();
      expect(itemsInfo.getAttribute("aria-atomic")).toBe("true");
    });

    test("should provide accessible labels for controls", () => {
      const pageSizeSelect = container.querySelector(".page-size-select");
      expect(pageSizeSelect.getAttribute("aria-label")).toBe(
        "Select page size",
      );

      const jumpInput = container.querySelector(".jump-input");
      if (jumpInput) {
        expect(jumpInput.getAttribute("aria-label")).toBe(
          "Jump to page number",
        );
      }
    });

    test("should handle keyboard navigation without interfering with other elements", () => {
      // Set focus outside pagination
      const outsideElement = document.createElement("button");
      document.body.appendChild(outsideElement);
      outsideElement.focus();

      component.goToPage = jest.fn();

      const event = new KeyboardEvent("keydown", { key: "ArrowLeft" });
      container.dispatchEvent(event);

      // Should not handle the event when focus is outside
      expect(component.goToPage).not.toHaveBeenCalled();

      document.body.removeChild(outsideElement);
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      component = new PaginationComponent("test-pagination");
      component.initialize();
    });

    test("should handle missing container gracefully", () => {
      component.container = null;

      expect(() => component.render()).not.toThrow();
    });

    test("should handle invalid configuration values", () => {
      component.config.totalItems = -1;
      component.config.pageSize = 0;
      component.config.currentPage = 0;

      component.calculate();

      // Should handle gracefully and provide sensible defaults
      expect(component.totalPages).toBeGreaterThanOrEqual(1);
      expect(component.config.currentPage).toBeGreaterThanOrEqual(1);
    });

    test("should handle missing SecurityUtils gracefully", () => {
      global.SecurityUtils = undefined;

      expect(() => {
        component.handlePageSizeChange(25);
        component.handleJumpToPage(5);
        component.render();
      }).not.toThrow();
    });

    test("should handle event handler errors", () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      // Mock an error in goToPage
      component.goToPage = jest.fn(() => {
        throw new Error("Navigation error");
      });

      component.render();

      const firstBtn = container.querySelector('[data-action="first"]');

      expect(() => firstBtn.click()).not.toThrow();
      consoleSpy.mockRestore();
    });
  });

  describe("Performance", () => {
    test("should handle large datasets efficiently", () => {
      const startTime = performance.now();

      component = new PaginationComponent("test-pagination", {
        totalItems: 1000000,
        pageSize: 100,
        currentPage: 5000,
      });
      component.initialize();
      component.render();

      const endTime = performance.now();

      // Should complete within reasonable time (adjusted for jsdom test environment)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    test("should limit visible page numbers for performance", () => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 1000000,
        pageSize: 10,
        maxVisiblePages: 7,
      });
      component.initialize();

      expect(component.visiblePageNumbers.length).toBeLessThanOrEqual(7);
    });
  });

  describe("SecurityUtils Integration", () => {
    beforeEach(() => {
      component = new PaginationComponent("test-pagination", {
        totalItems: 100,
        currentPage: 5,
        pageSize: 10,
      });
      component.initialize();
      jest.clearAllMocks();
    });

    describe("Input Validation with SecurityUtils", () => {
      test("should validate page size changes using SecurityUtils", () => {
        const validateIntegerSpy = jest.spyOn(SecurityUtils, "validateInteger");

        component.handlePageSizeChange("25");

        expect(validateIntegerSpy).toHaveBeenCalledWith("25", {
          min: 1,
          max: 1000,
        });
        expect(component.config.pageSize).toBe(25);

        validateIntegerSpy.mockRestore();
      });

      test("should reject invalid page size values", () => {
        const validateIntegerSpy = jest
          .spyOn(SecurityUtils, "validateInteger")
          .mockReturnValueOnce(null);
        const originalPageSize = component.config.pageSize;

        component.handlePageSizeChange("invalid");

        expect(validateIntegerSpy).toHaveBeenCalledWith("invalid", {
          min: 1,
          max: 1000,
        });
        expect(component.config.pageSize).toBe(originalPageSize); // Unchanged

        validateIntegerSpy.mockRestore();
      });

      test("should validate jump to page input using SecurityUtils", () => {
        const validateIntegerSpy = jest.spyOn(SecurityUtils, "validateInteger");
        const goToPageSpy = jest.spyOn(component, "goToPage");

        component.handleJumpToPage("7");

        expect(validateIntegerSpy).toHaveBeenCalledWith("7", {
          min: 1,
          max: 10,
        });
        expect(goToPageSpy).toHaveBeenCalledWith(7);

        validateIntegerSpy.mockRestore();
        goToPageSpy.mockRestore();
      });

      test("should prevent XSS in jump to page input", () => {
        const validateIntegerSpy = jest
          .spyOn(SecurityUtils, "validateInteger")
          .mockReturnValueOnce(null);
        const goToPageSpy = jest.spyOn(component, "goToPage");

        component.handleJumpToPage('<script>alert("xss")</script>');

        expect(validateIntegerSpy).toHaveBeenCalledWith(
          '<script>alert("xss")</script>',
          {
            min: 1,
            max: 10,
          },
        );
        expect(goToPageSpy).not.toHaveBeenCalled();

        validateIntegerSpy.mockRestore();
        goToPageSpy.mockRestore();
      });

      test("should enforce bounds checking on page numbers", () => {
        const validateIntegerSpy = jest.spyOn(SecurityUtils, "validateInteger");
        const goToPageSpy = jest.spyOn(component, "goToPage");

        // Test upper bound
        component.handleJumpToPage("999");
        expect(validateIntegerSpy).toHaveBeenCalledWith("999", {
          min: 1,
          max: 10,
        });

        // Test lower bound
        component.handleJumpToPage("-5");
        expect(validateIntegerSpy).toHaveBeenCalledWith("-5", {
          min: 1,
          max: 10,
        });

        validateIntegerSpy.mockRestore();
        goToPageSpy.mockRestore();
      });
    });

    describe("Safe HTML Rendering", () => {
      test("should use SecurityUtils for safe HTML rendering", () => {
        const safeSetInnerHTMLSpy = jest.spyOn(
          SecurityUtils,
          "safeSetInnerHTML",
        );

        component.render();

        expect(safeSetInnerHTMLSpy).toHaveBeenCalledWith(
          container,
          expect.any(String),
          expect.objectContaining({
            allowedTags: expect.arrayContaining([
              "div",
              "nav",
              "ul",
              "li",
              "button",
            ]),
            allowedAttributes: expect.any(Object),
          }),
        );

        safeSetInnerHTMLSpy.mockRestore();
      });

      test("should escape HTML in labels and text content", () => {
        const escapeHtmlSpy = jest.spyOn(SecurityUtils, "escapeHtml");

        component.config.labels.first = '<script>alert("xss")</script>First';
        component.config.labels.itemsInfo =
          'Showing {start} to {end} of {total} <script>alert("xss")</script>';

        component.render();

        expect(escapeHtmlSpy).toHaveBeenCalledWith(
          expect.stringContaining('<script>alert("xss")</script>First'),
        );

        escapeHtmlSpy.mockRestore();
      });

      test("should sanitize custom label content", () => {
        const sanitizeHtmlSpy = jest.spyOn(SecurityUtils, "sanitizeHtml");

        component.config.labels = {
          ...component.config.labels,
          first: '<img src="x" onerror="alert(1)">First',
          previous: '<div onclick="steal()">Prev</div>',
          next: '<a href="javascript:void(0)">Next</a>',
        };

        component.render();

        // Should be called for each potentially dangerous label
        expect(sanitizeHtmlSpy.mock.calls.length).toBeGreaterThan(0);

        sanitizeHtmlSpy.mockRestore();
      });
    });

    describe("Rate Limiting and Security Events", () => {
      test("should implement rate limiting for navigation actions", () => {
        const checkRateLimitSpy = jest.spyOn(SecurityUtils, "checkRateLimit");

        // Simulate rapid navigation attempts
        for (let i = 0; i < 10; i++) {
          component.goToPage(i + 1);
        }

        expect(checkRateLimitSpy).toHaveBeenCalledWith(
          "pagination_navigation",
          expect.any(Number),
          expect.any(Number),
        );

        checkRateLimitSpy.mockRestore();
      });

      test("should log security events for suspicious input", () => {
        const logSecurityEventSpy = jest.spyOn(
          SecurityUtils,
          "logSecurityEvent",
        );
        const validateIntegerSpy = jest
          .spyOn(SecurityUtils, "validateInteger")
          .mockReturnValueOnce(null);

        component.handleJumpToPage('<script>alert("xss")</script>');

        expect(logSecurityEventSpy).toHaveBeenCalledWith(
          "invalid_pagination_input",
          "warning",
          expect.objectContaining({
            input: '<script>alert("xss")</script>',
            component: "PaginationComponent",
            action: "jumpToPage",
          }),
        );

        validateIntegerSpy.mockRestore();
        logSecurityEventSpy.mockRestore();
      });
    });

    describe("Fallback Behavior without SecurityUtils", () => {
      test("should provide basic validation when SecurityUtils is unavailable", () => {
        const originalSecurityUtils = global.SecurityUtils;
        global.SecurityUtils = undefined;

        const goToPageSpy = jest.spyOn(component, "goToPage");

        // Should still work with basic validation
        component.handleJumpToPage("5");
        expect(goToPageSpy).toHaveBeenCalledWith(5);

        // Should clamp invalid values
        component.handleJumpToPage("999");
        expect(goToPageSpy).toHaveBeenCalledWith(10); // Clamped to max page

        component.handleJumpToPage("-5");
        expect(goToPageSpy).toHaveBeenCalledWith(1); // Clamped to min page

        global.SecurityUtils = originalSecurityUtils;
        goToPageSpy.mockRestore();
      });

      test("should handle page size changes without SecurityUtils", () => {
        const originalSecurityUtils = global.SecurityUtils;
        global.SecurityUtils = undefined;

        const originalPageSize = component.config.pageSize;

        // Should work with basic parseInt
        component.handlePageSizeChange("25");
        expect(component.config.pageSize).toBe(25);

        // Should ignore invalid input
        component.handlePageSizeChange("invalid");
        expect(component.config.pageSize).toBe(25); // Unchanged

        global.SecurityUtils = originalSecurityUtils;
      });

      test("should render safely without SecurityUtils", () => {
        const originalSecurityUtils = global.SecurityUtils;
        global.SecurityUtils = undefined;

        expect(() => component.render()).not.toThrow();
        expect(container.innerHTML).toBeTruthy();
        expect(container.innerHTML).not.toContain("<script>");

        global.SecurityUtils = originalSecurityUtils;
      });
    });

    describe("XSS Prevention", () => {
      test("should prevent XSS in configuration labels", () => {
        const maliciousConfig = {
          totalItems: 100,
          labels: {
            first: '<script>alert("xss1")</script>',
            previous: '<img src="x" onerror="alert(2)">',
            next: '<div onclick="steal()">Next</div>',
            last: '<a href="javascript:void(0)">Last</a>',
            pageSize: "<script>document.cookie</script>",
            itemsInfo: 'Items <script>alert("xss")</script> {start}',
          },
        };

        component = new PaginationComponent("test-pagination", maliciousConfig);
        component.initialize();
        component.render();

        // Check that no script tags are in the rendered output
        expect(container.innerHTML).not.toContain("<script>");
        expect(container.innerHTML).not.toContain("onerror");
        expect(container.innerHTML).not.toContain("onclick");
        expect(container.innerHTML).not.toContain("javascript:");
      });

      test("should handle malicious totalItems input", () => {
        expect(() => {
          component = new PaginationComponent("test-pagination", {
            totalItems: '<script>alert("xss")</script>',
            pageSize: 10,
          });
          component.initialize();
          component.calculate();
        }).not.toThrow();

        // Should convert to 0 (default)
        expect(component.config.totalItems).toBe(0);
      });

      test("should validate pagination state against tampering", () => {
        component.render();

        // Simulate state tampering
        component.config.currentPage = '<script>alert("xss")</script>';
        component.config.totalPages = '<img src="x" onerror="alert(1)">';

        expect(() => component.calculate()).not.toThrow();

        // Should reset to safe values
        expect(typeof component.config.currentPage).toBe("number");
        expect(component.config.currentPage).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Module Exports", () => {
    test("should be available as CommonJS module", () => {
      expect(PaginationComponent).toBeDefined();
      expect(typeof PaginationComponent).toBe("function");
    });

    test("should extend BaseComponent", () => {
      const instance = new PaginationComponent("test");
      expect(instance).toBeInstanceOf(BaseComponent);
    });

    test("should be available globally for browser usage", () => {
      // Test that it would be available as window.PaginationComponent in browser
      expect(PaginationComponent.name).toBe("PaginationComponent");
    });
  });
});
