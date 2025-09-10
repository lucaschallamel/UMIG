/**
 * BaseComponent Unit Tests
 * US-082-B Component Architecture Development
 *
 * Tests the foundation component functionality:
 * - Lifecycle management (initialize, render, destroy)
 * - Event handling and delegation
 * - State management
 * - Error boundaries
 * - Performance monitoring
 * - Accessibility support
 * - Responsive handling
 */

const BaseComponent = require("../../../../src/groovy/umig/web/js/components/BaseComponent");

describe("BaseComponent", () => {
  let container;
  let component;

  beforeEach(() => {
    // Create container element
    container = document.createElement("div");
    container.id = "test-base-component";
    document.body.appendChild(container);

    // Mock performance API
    global.performance = {
      mark: jest.fn(),
      measure: jest.fn(),
      now: jest.fn(() => Date.now()),
    };

    // Mock ResizeObserver
    global.ResizeObserver = jest.fn().mockImplementation(() => ({
      observe: jest.fn(),
      unobserve: jest.fn(),
      disconnect: jest.fn(),
    }));
  });

  afterEach(() => {
    // Clean up
    if (component) {
      component.destroy();
      component = null;
    }
    document.body.removeChild(container);
    jest.clearAllMocks();
  });

  describe("Initialization", () => {
    test("should initialize with default configuration", () => {
      component = new BaseComponent("test-base-component");
      component.initialize();

      expect(component.initialized).toBe(true);
      expect(component.destroyed).toBe(false);
      expect(component.config.debug).toBe(false);
      expect(component.config.accessibility).toBe(true);
      expect(component.config.responsive).toBe(true);
      expect(component.config.performanceMonitoring).toBe(true);
      expect(component.config.errorBoundary).toBe(true);
    });

    test("should initialize with custom configuration", () => {
      component = new BaseComponent("test-base-component", {
        debug: true,
        accessibility: false,
        responsive: false,
        customOption: "test",
      });
      component.initialize();

      expect(component.config.debug).toBe(true);
      expect(component.config.accessibility).toBe(false);
      expect(component.config.responsive).toBe(false);
      expect(component.config.customOption).toBe("test");
    });

    test("should find container element", () => {
      component = new BaseComponent("test-base-component");
      component.initialize();

      expect(component.container).toBe(container);
      expect(component.containerId).toBe("test-base-component");
    });

    test("should throw error if container not found", () => {
      component = new BaseComponent("non-existent-container");

      expect(() => component.initialize()).toThrow(
        "Container element not found: non-existent-container",
      );
    });

    test("should not initialize twice", () => {
      component = new BaseComponent("test-base-component");
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      component.initialize();
      component.initialize(); // Second initialization

      expect(consoleSpy).toHaveBeenCalledWith(
        "[BaseComponent]",
        "Component already initialized",
      );
      consoleSpy.mockRestore();
    });

    test("should set up error boundary when enabled", () => {
      component = new BaseComponent("test-base-component", {
        errorBoundary: true,
      });
      const addEventListenerSpy = jest.spyOn(window, "addEventListener");

      component.initialize();

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "error",
        expect.any(Function),
      );
      addEventListenerSpy.mockRestore();
    });

    test("should set up responsive handling when enabled", () => {
      component = new BaseComponent("test-base-component", {
        responsive: true,
      });
      component.initialize();

      expect(ResizeObserver).toHaveBeenCalled();
      expect(component.resizeObserver).toBeDefined();
    });

    test("should set up accessibility features when enabled", () => {
      component = new BaseComponent("test-base-component", {
        accessibility: true,
      });
      component.initialize();

      expect(container.getAttribute("tabindex")).toBe("-1");
      expect(container.getAttribute("role")).toBe("region");
      expect(component.liveRegion).toBeDefined();
    });

    test("should record initialization time", () => {
      component = new BaseComponent("test-base-component");
      component.initialize();

      expect(component.metrics.initTime).toBeDefined();
      expect(typeof component.metrics.initTime).toBe("number");
    });
  });

  describe("Rendering", () => {
    beforeEach(() => {
      component = new BaseComponent("test-base-component");
      component.initialize();
    });

    test("should not render if not initialized", () => {
      const uninitializedComponent = new BaseComponent("test-base-component");
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      uninitializedComponent.render();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[BaseComponent]",
        "Component not initialized",
      );
      consoleSpy.mockRestore();
    });

    test("should not render if destroyed", () => {
      component.destroyed = true;
      const consoleSpy = jest.spyOn(console, "warn").mockImplementation();

      component.render();

      expect(consoleSpy).toHaveBeenCalledWith(
        "[BaseComponent]",
        "Component is destroyed",
      );
      consoleSpy.mockRestore();
    });

    test("should clear container before rendering", () => {
      container.innerHTML = "<div>existing content</div>";

      component.render();

      expect(container.innerHTML).toBe("");
    });

    test("should track render metrics", () => {
      component.render();
      component.render();
      component.render();

      expect(component.metrics.renderCount).toBe(3);
      expect(component.metrics.lastRenderTime).toBeGreaterThan(0);
      expect(component.metrics.totalRenderTime).toBeGreaterThan(0);
    });

    test("should call onRender hook", () => {
      component.onRender = jest.fn();

      component.render();

      expect(component.onRender).toHaveBeenCalled();
    });

    test("should render error state when error exists", () => {
      component.errorState = {
        error: new Error("Test error"),
        context: "test",
        timestamp: Date.now(),
      };

      component.render();

      expect(container.querySelector(".component-error")).toBeTruthy();
      expect(container.querySelector(".component-error h3").textContent).toBe(
        "Component Error",
      );
    });

    test("should handle rendering errors", () => {
      component.onRender = jest.fn(() => {
        throw new Error("Render error");
      });

      expect(() => component.render()).not.toThrow();
      expect(component.errorState).toBeTruthy();
      expect(component.errorState.error.message).toBe("Render error");
    });

    test("should call setupDOMListeners after render", () => {
      component.setupDOMListeners = jest.fn();

      component.render();

      expect(component.setupDOMListeners).toHaveBeenCalled();
    });
  });

  describe("State Management", () => {
    beforeEach(() => {
      component = new BaseComponent("test-base-component");
      component.initialize();
    });

    test("should initialize with empty state", () => {
      expect(component.state).toEqual({});
      expect(component.previousState).toEqual({});
    });

    test("should update state and trigger re-render", () => {
      component.shouldUpdate = jest.fn(() => true);
      component.render = jest.fn();

      component.setState({ key: "value" });

      expect(component.state.key).toBe("value");
      expect(component.previousState).toEqual({});
      expect(component.render).toHaveBeenCalled();
    });

    test("should not trigger re-render if shouldUpdate returns false", () => {
      component.shouldUpdate = jest.fn(() => false);
      component.render = jest.fn();

      component.setState({ key: "value" });

      expect(component.render).not.toHaveBeenCalled();
    });

    test("should emit stateChange event", () => {
      const stateChangeHandler = jest.fn();
      component.on("stateChange", stateChangeHandler);

      component.setState({ key: "value" });

      expect(stateChangeHandler).toHaveBeenCalledWith({
        previousState: {},
        currentState: { key: "value" },
      });
    });

    test("should merge state updates", () => {
      component.setState({ key1: "value1" });
      component.setState({ key2: "value2" });

      expect(component.state).toEqual({
        key1: "value1",
        key2: "value2",
      });
    });

    test("should return copy of state", () => {
      component.state = { nested: { value: "test" } };

      const stateCopy = component.getState();
      stateCopy.nested.value = "modified";

      expect(component.state.nested.value).toBe("test");
    });

    test("should use default shouldUpdate logic", () => {
      const result1 = component.shouldUpdate({}, { key: "value" });
      const result2 = component.shouldUpdate(
        { key: "value" },
        { key: "value" },
      );

      expect(result1).toBe(true);
      expect(result2).toBe(false);
    });
  });

  describe("Event Handling", () => {
    beforeEach(() => {
      component = new BaseComponent("test-base-component");
      component.initialize();
    });

    test("should register event listeners", () => {
      const handler = jest.fn();

      component.on("test", handler);

      expect(component.listeners.has("test")).toBe(true);
      expect(component.listeners.get("test").has(handler)).toBe(true);
    });

    test("should emit events to registered listeners", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      component.on("test", handler1);
      component.on("test", handler2);

      component.emit("test", { data: "value" });

      expect(handler1).toHaveBeenCalledWith({ data: "value" });
      expect(handler2).toHaveBeenCalledWith({ data: "value" });
    });

    test("should remove event listeners", () => {
      const handler = jest.fn();

      component.on("test", handler);
      component.off("test", handler);

      component.emit("test");

      expect(handler).not.toHaveBeenCalled();
    });

    test("should return unsubscribe function from on()", () => {
      const handler = jest.fn();

      const unsubscribe = component.on("test", handler);
      unsubscribe();

      component.emit("test");

      expect(handler).not.toHaveBeenCalled();
    });

    test("should handle event handler errors", () => {
      const errorHandler = jest.fn(() => {
        throw new Error("Handler error");
      });

      component.on("test", errorHandler);

      expect(() => component.emit("test")).not.toThrow();
      expect(component.errorState).toBeTruthy();
    });

    test("should remove all listeners", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      component.on("test1", handler1);
      component.on("test2", handler2);

      component.removeAllListeners();

      component.emit("test1");
      component.emit("test2");

      expect(handler1).not.toHaveBeenCalled();
      expect(handler2).not.toHaveBeenCalled();
    });
  });

  describe("DOM Event Handling", () => {
    beforeEach(() => {
      component = new BaseComponent("test-base-component");
      component.initialize();
    });

    test("should add DOM event listeners", () => {
      const handler = jest.fn();
      const button = document.createElement("button");
      button.id = "test-button";

      component.addDOMListener(button, "click", handler);

      expect(component.domListeners.has("test-button-click")).toBe(true);
    });

    test("should remove existing listener when adding new one", () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();
      const button = document.createElement("button");
      button.id = "test-button";
      const removeEventListenerSpy = jest.spyOn(button, "removeEventListener");

      component.addDOMListener(button, "click", handler1);
      component.addDOMListener(button, "click", handler2);

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "click",
        handler1,
        undefined,
      );
      removeEventListenerSpy.mockRestore();
    });

    test("should clear all DOM listeners", () => {
      const button1 = document.createElement("button");
      const button2 = document.createElement("button");
      button1.id = "button1";
      button2.id = "button2";

      const removeEventListenerSpy1 = jest.spyOn(
        button1,
        "removeEventListener",
      );
      const removeEventListenerSpy2 = jest.spyOn(
        button2,
        "removeEventListener",
      );

      component.addDOMListener(button1, "click", () => {});
      component.addDOMListener(button2, "mouseenter", () => {});

      component.clearDOMListeners();

      expect(removeEventListenerSpy1).toHaveBeenCalled();
      expect(removeEventListenerSpy2).toHaveBeenCalled();
      expect(component.domListeners.size).toBe(0);

      removeEventListenerSpy1.mockRestore();
      removeEventListenerSpy2.mockRestore();
    });
  });

  describe("Error Handling", () => {
    beforeEach(() => {
      component = new BaseComponent("test-base-component");
      component.initialize();
    });

    test("should handle errors and set error state", () => {
      const error = new Error("Test error");

      component.handleError(error, "test");

      expect(component.errorState).toBeTruthy();
      expect(component.errorState.error).toBe(error);
      expect(component.errorState.context).toBe("test");
      expect(component.errorState.timestamp).toBeDefined();
    });

    test("should emit error event", () => {
      const errorHandler = jest.fn();
      const error = new Error("Test error");

      component.on("error", errorHandler);
      component.handleError(error, "test");

      expect(errorHandler).toHaveBeenCalledWith(component.errorState);
    });

    test("should render error state", () => {
      component.errorState = {
        error: new Error("Test error"),
        context: "test",
        timestamp: Date.now(),
      };

      component.renderError();

      const errorDiv = container.querySelector(".component-error");
      expect(errorDiv).toBeTruthy();
      expect(errorDiv.getAttribute("role")).toBe("alert");
      expect(errorDiv.querySelector("h3").textContent).toBe("Component Error");
      expect(errorDiv.querySelector("details")).toBeTruthy();
    });

    test("should clear error state", () => {
      component.errorState = { error: new Error(), context: "test" };
      component.render = jest.fn();

      component.clearError();

      expect(component.errorState).toBe(null);
      expect(component.render).toHaveBeenCalled();
    });

    test("should handle error boundary events", () => {
      const errorEvent = {
        error: new Error("Runtime error"),
        target: container.querySelector("div") || container,
      };

      component.errorBoundaryHandler(errorEvent);

      expect(component.errorState).toBeTruthy();
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      component = new BaseComponent("test-base-component", {
        accessibility: true,
      });
      component.initialize();
    });

    test("should create live region for announcements", () => {
      expect(component.liveRegion).toBeTruthy();
      expect(component.liveRegion.getAttribute("aria-live")).toBe("polite");
      expect(component.liveRegion.getAttribute("aria-atomic")).toBe("true");
      expect(component.liveRegion.className).toBe("sr-only");
    });

    test("should announce messages", () => {
      component.announce("Test announcement");

      expect(component.liveRegion.textContent).toBe("Test announcement");

      // Test that message is cleared after timeout
      setTimeout(() => {
        expect(component.liveRegion.textContent).toBe("");
      }, 1100);
    });

    test("should set accessibility attributes on container", () => {
      expect(container.getAttribute("tabindex")).toBe("-1");
      expect(container.getAttribute("role")).toBe("region");
    });

    test("should not override existing accessibility attributes", () => {
      const containerWithRole = document.createElement("div");
      containerWithRole.id = "container-with-role";
      containerWithRole.setAttribute("role", "main");
      containerWithRole.setAttribute("tabindex", "0");
      document.body.appendChild(containerWithRole);

      const componentWithRole = new BaseComponent("container-with-role", {
        accessibility: true,
      });
      componentWithRole.initialize();

      expect(containerWithRole.getAttribute("role")).toBe("main");
      expect(containerWithRole.getAttribute("tabindex")).toBe("0");

      document.body.removeChild(containerWithRole);
      componentWithRole.destroy();
    });
  });

  describe("Responsive Handling", () => {
    beforeEach(() => {
      component = new BaseComponent("test-base-component", {
        responsive: true,
      });
      component.initialize();
    });

    test("should setup ResizeObserver", () => {
      expect(ResizeObserver).toHaveBeenCalled();
      expect(component.resizeObserver.observe).toHaveBeenCalledWith(container);
    });

    test("should detect breakpoints correctly", () => {
      expect(component.getBreakpoint(600)).toBe("mobile");
      expect(component.getBreakpoint(900)).toBe("tablet");
      expect(component.getBreakpoint(1200)).toBe("desktop");
    });

    test("should handle resize events", () => {
      component.onBreakpointChange = jest.fn();
      component.currentBreakpoint = "desktop";

      component.handleResize(600);

      expect(component.currentBreakpoint).toBe("mobile");
      expect(component.onBreakpointChange).toHaveBeenCalledWith("mobile");
    });

    test("should emit breakpointChange event", () => {
      const breakpointHandler = jest.fn();
      component.on("breakpointChange", breakpointHandler);
      component.currentBreakpoint = "desktop";

      component.handleResize(600);

      expect(breakpointHandler).toHaveBeenCalledWith("mobile");
    });

    test("should not emit event if breakpoint unchanged", () => {
      const breakpointHandler = jest.fn();
      component.on("breakpointChange", breakpointHandler);
      component.currentBreakpoint = "mobile";

      component.handleResize(600);

      expect(breakpointHandler).not.toHaveBeenCalled();
    });
  });

  describe("Performance Monitoring", () => {
    beforeEach(() => {
      component = new BaseComponent("test-base-component", {
        performanceMonitoring: true,
      });
      component.initialize();
    });

    test("should start performance measure", () => {
      const measure = component.startPerformanceMeasure("test");

      expect(performance.mark).toHaveBeenCalledWith("BaseComponent-test-start");
      expect(measure).toEqual({
        operation: "test",
        markName: "BaseComponent-test-start",
      });
    });

    test("should end performance measure", () => {
      const measure = {
        operation: "test",
        markName: "BaseComponent-test-start",
      };

      component.endPerformanceMeasure(measure);

      expect(performance.mark).toHaveBeenCalledWith("BaseComponent-test-end");
      expect(performance.measure).toHaveBeenCalledWith(
        "BaseComponent-test",
        "BaseComponent-test-start",
        "BaseComponent-test-end",
      );
    });

    test("should return null measure when monitoring disabled", () => {
      component.config.performanceMonitoring = false;

      const measure = component.startPerformanceMeasure("test");

      expect(measure).toBe(null);
      expect(performance.mark).not.toHaveBeenCalled();
    });

    test("should calculate performance metrics", () => {
      component.metrics.renderCount = 3;
      component.metrics.totalRenderTime = 150;

      const metrics = component.getPerformanceMetrics();

      expect(metrics.renderCount).toBe(3);
      expect(metrics.totalRenderTime).toBe(150);
      expect(metrics.averageRenderTime).toBe(50);
    });

    test("should handle zero render count", () => {
      const metrics = component.getPerformanceMetrics();

      expect(metrics.averageRenderTime).toBe(0);
    });
  });

  describe("Destruction", () => {
    beforeEach(() => {
      component = new BaseComponent("test-base-component");
      component.initialize();
    });

    test("should clean up on destroy", () => {
      component.onDestroy = jest.fn();
      component.removeAllListeners = jest.fn();
      component.clearDOMListeners = jest.fn();

      component.destroy();

      expect(component.onDestroy).toHaveBeenCalled();
      expect(component.removeAllListeners).toHaveBeenCalled();
      expect(component.clearDOMListeners).toHaveBeenCalled();
      expect(component.destroyed).toBe(true);
      expect(component.initialized).toBe(false);
      expect(container.innerHTML).toBe("");
    });

    test("should disconnect ResizeObserver", () => {
      component.resizeObserver = {
        disconnect: jest.fn(),
      };

      component.destroy();

      expect(component.resizeObserver.disconnect).toHaveBeenCalled();
    });

    test("should clear state", () => {
      component.state = { key: "value" };
      component.previousState = { previousKey: "previousValue" };

      component.destroy();

      expect(component.state).toEqual({});
      expect(component.previousState).toEqual({});
    });

    test("should not error on multiple destroy calls", () => {
      component.destroy();

      expect(() => component.destroy()).not.toThrow();
    });

    test("should handle destroy errors gracefully", () => {
      const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
      component.onDestroy = jest.fn(() => {
        throw new Error("Destroy error");
      });

      expect(() => component.destroy()).not.toThrow();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error destroying component:",
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe("Utility Methods", () => {
    beforeEach(() => {
      component = new BaseComponent("test-base-component");
      component.initialize();
    });

    test("should clear container safely", () => {
      container.innerHTML = "<div>child1</div><div>child2</div>";

      component.clearContainer();

      expect(container.innerHTML).toBe("");
    });

    test("should handle null container in clearContainer", () => {
      component.container = null;

      expect(() => component.clearContainer()).not.toThrow();
    });

    test("should log debug messages when debug enabled", () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      component.config.debug = true;

      component.logDebug("test message", { data: "value" });

      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[BaseComponent]",
        "test message",
        { data: "value" },
      );
      consoleLogSpy.mockRestore();
    });

    test("should not log debug messages when debug disabled", () => {
      const consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
      component.config.debug = false;

      component.logDebug("test message");

      expect(consoleLogSpy).not.toHaveBeenCalled();
      consoleLogSpy.mockRestore();
    });

    test("should log warnings", () => {
      const consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();

      component.logWarning("warning message", { data: "value" });

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[BaseComponent]",
        "warning message",
        { data: "value" },
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe("Lifecycle Hooks", () => {
    beforeEach(() => {
      component = new BaseComponent("test-base-component");
    });

    test("should call lifecycle hooks at appropriate times", () => {
      component.onInitialize = jest.fn();
      component.onRender = jest.fn();
      component.onDestroy = jest.fn();
      component.onBreakpointChange = jest.fn();
      component.setupDOMListeners = jest.fn();

      component.initialize();
      expect(component.onInitialize).toHaveBeenCalled();

      component.render();
      expect(component.onRender).toHaveBeenCalled();
      expect(component.setupDOMListeners).toHaveBeenCalled();

      component.handleResize(600);
      expect(component.onBreakpointChange).toHaveBeenCalledWith("mobile");

      component.destroy();
      expect(component.onDestroy).toHaveBeenCalled();
    });

    test("should handle missing lifecycle hooks gracefully", () => {
      // Don't override any hooks - they should be no-ops
      expect(() => {
        component.initialize();
        component.render();
        component.handleResize(600);
        component.destroy();
      }).not.toThrow();
    });
  });

  describe("Module Exports", () => {
    test("should be available as CommonJS module", () => {
      expect(BaseComponent).toBeDefined();
      expect(typeof BaseComponent).toBe("function");
    });

    test("should create instances properly", () => {
      const instance = new BaseComponent("test");
      expect(instance).toBeInstanceOf(BaseComponent);
      expect(instance.containerId).toBe("test");
    });
  });
});
