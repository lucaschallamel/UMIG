/**
 * ComponentOrchestrator Unit Tests
 * US-082-B Component Architecture Development
 */

describe("ComponentOrchestrator", () => {
  let orchestrator;
  let mockComponent;
  let consoleLogSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = "";

    // Create ComponentOrchestrator constructor in global scope
    global.ComponentOrchestrator = require("../../../../src/groovy/umig/web/js/components/ComponentOrchestrator.js");

    // Create mock component
    mockComponent = {
      initialize: jest.fn(),
      destroy: jest.fn(),
      render: jest.fn(),
      onMessage: jest.fn(),
    };

    // Spy on console methods
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Create orchestrator instance
    orchestrator = new ComponentOrchestrator();
  });

  afterEach(() => {
    // Clean up
    if (orchestrator) {
      orchestrator.reset();
    }

    // Restore console methods
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Clear global
    delete global.ComponentOrchestrator;
    delete window.UMIG_ORCHESTRATOR;
  });

  describe("Initialization", () => {
    test("should initialize with default configuration", () => {
      expect(orchestrator.initialized).toBe(true);
      expect(orchestrator.config.debug).toBe(false);
      expect(orchestrator.config.maxQueueSize).toBe(100);
      expect(orchestrator.config.enableReplay).toBe(true);
      expect(orchestrator.config.stateHistory).toBe(10);
    });

    test("should initialize with custom configuration", () => {
      const customOrchestrator = new ComponentOrchestrator({
        debug: true,
        maxQueueSize: 50,
        enableReplay: false,
        stateHistory: 5,
      });

      expect(customOrchestrator.config.debug).toBe(true);
      expect(customOrchestrator.config.maxQueueSize).toBe(50);
      expect(customOrchestrator.config.enableReplay).toBe(false);
      expect(customOrchestrator.config.stateHistory).toBe(5);
      expect(window.UMIG_ORCHESTRATOR).toBe(customOrchestrator);

      customOrchestrator.reset();
    });

    test("should not reinitialize if already initialized", () => {
      const emitSpy = jest.spyOn(orchestrator, "emit");
      orchestrator.initialize();
      expect(emitSpy).not.toHaveBeenCalledWith(
        "orchestrator:initialized",
        expect.any(Object),
      );
    });

    test("should setup error handling when enabled", () => {
      const addEventListenerSpy = jest.spyOn(window, "addEventListener");
      const errorOrchestrator = new ComponentOrchestrator({
        errorIsolation: true,
      });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "error",
        expect.any(Function),
      );
      errorOrchestrator.reset();
    });
  });

  describe("Component Registration", () => {
    test("should register a valid component", () => {
      const result = orchestrator.registerComponent(
        "testComponent",
        mockComponent,
        ["dep1", "dep2"],
      );

      expect(result).toBe(true);
      expect(orchestrator.components.has("testComponent")).toBe(true);
      expect(orchestrator.componentDependencies.get("testComponent")).toEqual([
        "dep1",
        "dep2",
      ]);
      expect(orchestrator.metrics.componentCount).toBe(1);
    });

    test("should wire component to orchestrator", () => {
      orchestrator.registerComponent("testComponent", mockComponent);

      expect(mockComponent.orchestrator).toBe(orchestrator);
      expect(typeof mockComponent.emit).toBe("function");
      expect(mockComponent._originalEmit).toBeDefined();
    });

    test("should reject invalid component interface", () => {
      const invalidComponent = { initialize: "not a function" };

      expect(() => {
        orchestrator.registerComponent("invalid", invalidComponent);
      }).toThrow("Invalid component interface: invalid");
    });

    test("should not register duplicate components", () => {
      orchestrator.registerComponent("testComponent", mockComponent);
      const result = orchestrator.registerComponent(
        "testComponent",
        mockComponent,
      );

      expect(result).toBe(false);
      expect(orchestrator.metrics.componentCount).toBe(1);
    });

    test("should emit component:registered event", () => {
      const eventCallback = jest.fn();
      orchestrator.on("component:registered", eventCallback);

      orchestrator.registerComponent("testComponent", mockComponent, ["dep1"]);

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          componentId: "testComponent",
          dependencies: ["dep1"],
        }),
        expect.any(Object),
      );
    });
  });

  describe("Component Unregistration", () => {
    beforeEach(() => {
      orchestrator.registerComponent("component1", mockComponent);
      orchestrator.registerComponent("component2", { ...mockComponent }, [
        "component1",
      ]);
    });

    test("should unregister a component", () => {
      const result = orchestrator.unregisterComponent("component2");

      expect(result).toBe(true);
      expect(orchestrator.components.has("component2")).toBe(false);
      expect(orchestrator.componentDependencies.has("component2")).toBe(false);
      expect(orchestrator.metrics.componentCount).toBe(1);
    });

    test("should unwire component from orchestrator", () => {
      const component = { ...mockComponent };
      orchestrator.registerComponent("testComp", component);

      expect(component.orchestrator).toBe(orchestrator);

      orchestrator.unregisterComponent("testComp");

      expect(component.orchestrator).toBeUndefined();
      expect(component._originalEmit).toBeUndefined();
    });

    test("should prevent unregistering components with dependents", () => {
      expect(() => {
        orchestrator.unregisterComponent("component1");
      }).toThrow("Cannot unregister component1: required by component2");
    });

    test("should return false for non-existent component", () => {
      const result = orchestrator.unregisterComponent("nonExistent");
      expect(result).toBe(false);
    });

    test("should emit component:unregistered event", () => {
      const eventCallback = jest.fn();
      orchestrator.on("component:unregistered", eventCallback);

      orchestrator.unregisterComponent("component2");

      expect(eventCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          componentId: "component2",
        }),
        expect.any(Object),
      );
    });
  });

  describe("Event Bus", () => {
    test("should subscribe to events", () => {
      const callback = jest.fn();
      const subscriptionId = orchestrator.on("test:event", callback);

      expect(subscriptionId).toBeDefined();
      expect(orchestrator.eventSubscriptions.has("test:event")).toBe(true);
    });

    test("should emit and dispatch events", () => {
      const callback = jest.fn();
      orchestrator.on("test:event", callback);

      const eventId = orchestrator.emit("test:event", { data: "test" });

      expect(eventId).toBeDefined();
      expect(callback).toHaveBeenCalledWith(
        { data: "test" },
        expect.objectContaining({
          name: "test:event",
          data: { data: "test" },
        }),
      );
      expect(orchestrator.metrics.eventsDispatched).toBe(2); // Including initialization event
    });

    test("should support wildcard event subscriptions", () => {
      const callback = jest.fn();
      orchestrator.on("*", callback);

      orchestrator.emit("any:event", { data: "test" });

      expect(callback).toHaveBeenCalled();
    });

    test("should unsubscribe from events", () => {
      const callback = jest.fn();
      const subscriptionId = orchestrator.on("test:event", callback);

      const result = orchestrator.off("test:event", subscriptionId);
      expect(result).toBe(true);

      orchestrator.emit("test:event", { data: "test" });
      expect(callback).not.toHaveBeenCalled();
    });

    test("should queue events when requested", () => {
      orchestrator.emit("test:event", { data: "test" }, { queued: true });

      expect(orchestrator.eventQueue.length).toBe(1);
      expect(orchestrator.metrics.eventsQueued).toBe(1);
    });

    test("should process event queue", () => {
      const callback = jest.fn();
      orchestrator.on("test:event", callback);

      orchestrator.emit("test:event", { data: "1" }, { queued: true });
      orchestrator.emit("test:event", { data: "2" }, { queued: true });

      const processed = orchestrator.processEventQueue();

      expect(processed).toBe(2);
      expect(callback).toHaveBeenCalledTimes(2);
      expect(orchestrator.eventQueue.length).toBe(0);
    });

    test("should respect max queue size", () => {
      const smallOrchestrator = new ComponentOrchestrator({ maxQueueSize: 2 });

      smallOrchestrator.emit("event1", {}, { queued: true });
      smallOrchestrator.emit("event2", {}, { queued: true });
      smallOrchestrator.emit("event3", {}, { queued: true });

      expect(smallOrchestrator.eventQueue.length).toBe(2);
      expect(smallOrchestrator.eventQueue[0].name).toBe("event2");

      smallOrchestrator.reset();
    });

    test("should add events to history when replay is enabled", () => {
      orchestrator.emit("test:event", { data: "test" });

      expect(orchestrator.eventHistory.length).toBeGreaterThan(0);
      expect(
        orchestrator.eventHistory[orchestrator.eventHistory.length - 1].name,
      ).toBe("test:event");
    });

    test("should handle subscription errors gracefully", () => {
      const errorCallback = jest.fn(() => {
        throw new Error("Subscription error");
      });

      orchestrator.on("test:event", errorCallback);
      orchestrator.emit("test:event", { data: "test" });

      expect(orchestrator.errorLog.length).toBe(1);
      expect(orchestrator.errorLog[0].type).toBe("subscription");
    });
  });

  describe("State Management", () => {
    test("should set and get state", () => {
      orchestrator.setState("app.user.name", "John Doe");

      expect(orchestrator.getState("app.user.name")).toBe("John Doe");
      expect(orchestrator.getState("app.user")).toEqual({ name: "John Doe" });
      expect(orchestrator.metrics.stateUpdates).toBe(1);
    });

    test("should return full state when no path provided", () => {
      orchestrator.setState("app.user", { name: "John" });
      orchestrator.setState("app.settings", { theme: "dark" });

      const fullState = orchestrator.getState();
      expect(fullState).toEqual({
        app: {
          user: { name: "John" },
          settings: { theme: "dark" },
        },
      });
    });

    test("should maintain state history", () => {
      orchestrator.setState("counter", 1);
      orchestrator.setState("counter", 2);
      orchestrator.setState("counter", 3);

      expect(orchestrator.stateHistory.length).toBe(3);
      expect(orchestrator.stateHistory[0].oldValue).toBeUndefined();
      expect(orchestrator.stateHistory[1].oldValue).toBe(1);
      expect(orchestrator.stateHistory[2].oldValue).toBe(2);
    });

    test("should limit state history size", () => {
      const smallOrchestrator = new ComponentOrchestrator({ stateHistory: 2 });

      smallOrchestrator.setState("counter", 1);
      smallOrchestrator.setState("counter", 2);
      smallOrchestrator.setState("counter", 3);

      expect(smallOrchestrator.stateHistory.length).toBe(2);
      expect(smallOrchestrator.stateHistory[0].newValue).toBe(2);

      smallOrchestrator.reset();
    });

    test("should notify state subscribers", () => {
      const callback = jest.fn();
      orchestrator.onStateChange("app.theme", callback);

      orchestrator.setState("app.theme", "dark");

      expect(callback).toHaveBeenCalledWith("dark", undefined, "app.theme");
    });

    test("should notify wildcard state subscribers", () => {
      const callback = jest.fn();
      orchestrator.onStateChange(null, callback);

      orchestrator.setState("app.theme", "dark");

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ app: { theme: "dark" } }),
        expect.any(Object),
        "app.theme",
      );
    });

    test("should emit state:changed event", () => {
      const callback = jest.fn();
      orchestrator.on("state:changed", callback);

      orchestrator.setState("app.theme", "dark", { source: "user" });

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          path: "app.theme",
          value: "dark",
          source: "user",
        }),
        expect.any(Object),
      );
    });

    test("should deep clone state to prevent mutations", () => {
      orchestrator.setState("app.data", { items: [1, 2, 3] });

      const state = orchestrator.getState("app.data");
      state.items.push(4);

      expect(orchestrator.getState("app.data.items")).toEqual([1, 2, 3]);
    });
  });

  describe("Component Communication", () => {
    let component1, component2;

    beforeEach(() => {
      component1 = {
        initialize: jest.fn(),
        destroy: jest.fn(),
        onMessage: jest.fn(),
      };

      component2 = {
        initialize: jest.fn(),
        destroy: jest.fn(),
        onMessage: jest.fn(),
      };

      orchestrator.registerComponent("comp1", component1);
      orchestrator.registerComponent("comp2", component2);
    });

    test("should broadcast messages to specific components", () => {
      const results = orchestrator.broadcast(["comp1", "comp2"], "update", {
        value: 42,
      });

      expect(results).toHaveLength(2);
      expect(results[0]).toEqual({ componentId: "comp1", success: true });
      expect(results[1]).toEqual({ componentId: "comp2", success: true });
      expect(component1.onMessage).toHaveBeenCalledWith("update", {
        value: 42,
      });
      expect(component2.onMessage).toHaveBeenCalledWith("update", {
        value: 42,
      });
    });

    test("should handle broadcast to non-existent component", () => {
      const results = orchestrator.broadcast(
        ["comp1", "nonExistent"],
        "update",
        {},
      );

      expect(results[1]).toEqual({
        componentId: "nonExistent",
        success: false,
        error: "Component not found",
      });
    });

    test("should handle broadcast errors", () => {
      component1.onMessage.mockImplementation(() => {
        throw new Error("Message handling error");
      });

      const results = orchestrator.broadcast(["comp1"], "update", {});

      expect(results[0]).toEqual({
        componentId: "comp1",
        success: false,
        error: "Message handling error",
      });
      expect(orchestrator.failedComponents.has("comp1")).toBe(true);
    });

    test("should allow components to emit events through orchestrator", () => {
      const callback = jest.fn();
      orchestrator.on("comp1:custom", callback);

      component1.emit("custom", { data: "test" });

      expect(callback).toHaveBeenCalledWith(
        { data: "test" },
        expect.objectContaining({
          name: "comp1:custom",
          source: "comp1",
        }),
      );
    });
  });

  describe("Component Lifecycle", () => {
    let comp1, comp2, comp3;

    beforeEach(() => {
      comp1 = {
        initialize: jest.fn(),
        destroy: jest.fn(),
      };

      comp2 = {
        initialize: jest.fn(),
        destroy: jest.fn(),
      };

      comp3 = {
        initialize: jest.fn(),
        destroy: jest.fn(),
      };

      orchestrator.registerComponent("comp1", comp1);
      orchestrator.registerComponent("comp2", comp2, ["comp1"]);
      orchestrator.registerComponent("comp3", comp3, ["comp2"]);
    });

    test("should execute lifecycle method on component", () => {
      orchestrator.executeLifecycle("comp1", "initialize");

      expect(comp1.initialize).toHaveBeenCalled();
      expect(orchestrator.components.get("comp1").status).toBe("initialized");
    });

    test("should throw error for non-existent component", () => {
      expect(() => {
        orchestrator.executeLifecycle("nonExistent", "initialize");
      }).toThrow("Component not found: nonExistent");
    });

    test("should throw error for non-existent method", () => {
      expect(() => {
        orchestrator.executeLifecycle("comp1", "nonExistentMethod");
      }).toThrow("Method not found: comp1.nonExistentMethod");
    });

    test("should initialize components in dependency order", () => {
      const results = orchestrator.initializeComponents();

      expect(results).toHaveLength(3);
      expect(comp1.initialize).toHaveBeenCalledBefore(comp2.initialize);
      expect(comp2.initialize).toHaveBeenCalledBefore(comp3.initialize);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    test("should destroy components in reverse dependency order", () => {
      orchestrator.initializeComponents();
      const results = orchestrator.destroyComponents();

      expect(results).toHaveLength(3);
      expect(comp3.destroy).toHaveBeenCalledBefore(comp2.destroy);
      expect(comp2.destroy).toHaveBeenCalledBefore(comp1.destroy);

      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    test("should handle lifecycle errors gracefully", () => {
      comp2.initialize.mockImplementation(() => {
        throw new Error("Initialization failed");
      });

      const results = orchestrator.initializeComponents();

      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(false);
      expect(results[1].error).toBe("Initialization failed");
      expect(results[2].success).toBe(true); // comp3 still initializes
      expect(orchestrator.failedComponents.has("comp2")).toBe(true);
    });

    test("should detect circular dependencies", () => {
      const comp4 = { initialize: jest.fn(), destroy: jest.fn() };
      const comp5 = { initialize: jest.fn(), destroy: jest.fn() };

      orchestrator.registerComponent("comp4", comp4, ["comp5"]);
      orchestrator.registerComponent("comp5", comp5, ["comp4"]);

      expect(() => {
        orchestrator.sortComponentsByDependencies();
      }).toThrow("Circular dependency detected");
    });
  });

  describe("Component Status", () => {
    beforeEach(() => {
      orchestrator.registerComponent("comp1", mockComponent);
      orchestrator.registerComponent("comp2", { ...mockComponent }, ["comp1"]);
    });

    test("should get component status", () => {
      const status = orchestrator.getComponentStatus("comp1");

      expect(status).toEqual({
        id: "comp1",
        status: "registered",
        registeredAt: expect.any(Number),
        hasErrors: false,
        dependencies: [],
        dependents: ["comp2"],
      });
    });

    test("should return null for non-existent component", () => {
      const status = orchestrator.getComponentStatus("nonExistent");
      expect(status).toBeNull();
    });

    test("should track failed components", () => {
      orchestrator.handleComponentError("comp1", new Error("Test error"));

      const status = orchestrator.getComponentStatus("comp1");
      expect(status.hasErrors).toBe(true);
    });
  });

  describe("Event Replay", () => {
    beforeEach(() => {
      orchestrator.emit("event1", { value: 1 });
      orchestrator.emit("event2", { value: 2 });
      orchestrator.emit("event3", { value: 3 });
    });

    test("should replay events from history", () => {
      const callback = jest.fn();
      orchestrator.on("*", callback);

      const replayed = orchestrator.replayEvents();

      expect(replayed).toBeGreaterThan(0);
      expect(callback).toHaveBeenCalled();
    });

    test("should replay filtered events", () => {
      const callback = jest.fn();
      orchestrator.on("event2", callback);

      const filter = (event) => event.name === "event2";
      orchestrator.replayEvents(filter);

      expect(callback).toHaveBeenCalledWith(
        { value: 2 },
        expect.objectContaining({ name: "event2" }),
      );
    });

    test("should limit number of replayed events", () => {
      const callback = jest.fn();
      orchestrator.on("*", callback);

      const replayed = orchestrator.replayEvents(null, 2);

      expect(replayed).toBe(2);
    });
  });

  describe("Metrics", () => {
    test("should track metrics", () => {
      orchestrator.registerComponent("comp1", mockComponent);
      orchestrator.emit("test:event", {});
      orchestrator.setState("app.value", 42);
      orchestrator.emit("queued:event", {}, { queued: true });

      const metrics = orchestrator.getMetrics();

      expect(metrics.componentCount).toBe(1);
      expect(metrics.eventsDispatched).toBeGreaterThan(0);
      expect(metrics.stateUpdates).toBe(1);
      expect(metrics.eventsQueued).toBe(1);
      expect(metrics.eventQueueSize).toBe(1);
    });

    test("should calculate average dispatch time", () => {
      const callback = jest.fn();
      orchestrator.on("test:event", callback);

      orchestrator.emit("test:event", {});
      orchestrator.emit("test:event", {});

      const metrics = orchestrator.getMetrics();
      expect(metrics.averageDispatchTime).toBeGreaterThanOrEqual(0);
    });

    test("should count active subscriptions", () => {
      orchestrator.on("event1", jest.fn());
      orchestrator.on("event2", jest.fn());
      orchestrator.onStateChange("path1", jest.fn());

      const metrics = orchestrator.getMetrics();
      expect(metrics.activeSubscriptions).toBe(3);
    });
  });

  describe("Reset", () => {
    test("should reset orchestrator completely", () => {
      // Setup state
      orchestrator.registerComponent("comp1", mockComponent);
      orchestrator.on("test:event", jest.fn());
      orchestrator.setState("app.value", 42);
      orchestrator.emit("test:event", {});
      orchestrator.emit("queued:event", {}, { queued: true });

      // Reset
      orchestrator.reset();

      // Verify reset
      expect(orchestrator.components.size).toBe(0);
      expect(orchestrator.eventSubscriptions.size).toBe(0);
      expect(orchestrator.stateSubscribers.size).toBe(0);
      expect(orchestrator.eventQueue.length).toBe(0);
      expect(orchestrator.eventHistory.length).toBe(0);
      expect(orchestrator.stateHistory.length).toBe(0);
      expect(orchestrator.globalState).toEqual({});
      expect(orchestrator.metrics.componentCount).toBe(0);
      expect(orchestrator.errorLog.length).toBe(0);
      expect(orchestrator.failedComponents.size).toBe(0);
    });

    test("should emit reset event", () => {
      const callback = jest.fn();
      orchestrator.on("orchestrator:reset", callback);

      orchestrator.reset();

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({ timestamp: expect.any(Number) }),
        expect.any(Object),
      );
    });
  });

  describe("Error Handling", () => {
    test("should log component errors", () => {
      orchestrator.handleComponentError("comp1", new Error("Test error"));

      expect(orchestrator.errorLog.length).toBe(1);
      expect(orchestrator.errorLog[0]).toEqual({
        timestamp: expect.any(Number),
        type: "component",
        error: "Test error",
        componentId: "comp1",
      });
    });

    test("should emit component:error event", () => {
      const callback = jest.fn();
      orchestrator.on("component:error", callback);

      orchestrator.handleComponentError("comp1", new Error("Test error"));

      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          componentId: "comp1",
          error: "Test error",
        }),
        expect.any(Object),
      );
    });

    test("should handle global errors when error isolation is enabled", () => {
      const errorOrchestrator = new ComponentOrchestrator({
        errorIsolation: true,
      });

      const errorEvent = new ErrorEvent("error", {
        message: "Global error",
        filename: "test.js",
        lineno: 10,
        colno: 5,
      });

      window.dispatchEvent(errorEvent);

      expect(errorOrchestrator.errorLog.length).toBe(1);
      expect(errorOrchestrator.errorLog[0].type).toBe("global");

      errorOrchestrator.reset();
    });
  });

  describe("Debug Mode", () => {
    test("should expose orchestrator globally in debug mode", () => {
      const debugOrchestrator = new ComponentOrchestrator({ debug: true });

      expect(window.UMIG_ORCHESTRATOR).toBe(debugOrchestrator);

      debugOrchestrator.reset();
    });

    test("should log debug messages when enabled", () => {
      const debugOrchestrator = new ComponentOrchestrator({ debug: true });

      debugOrchestrator.logDebug("Test debug message");
      expect(consoleLogSpy).toHaveBeenCalledWith(
        "[Orchestrator] Test debug message",
      );

      debugOrchestrator.reset();
    });

    test("should log warnings when enabled", () => {
      const debugOrchestrator = new ComponentOrchestrator({ debug: true });

      debugOrchestrator.logWarning("Test warning");
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[Orchestrator] Test warning",
      );

      debugOrchestrator.reset();
    });

    test("should not log when debug is disabled", () => {
      orchestrator.logDebug("Test message");
      orchestrator.logWarning("Test warning");

      expect(consoleLogSpy).not.toHaveBeenCalled();
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });
  });

  describe("Performance Monitoring", () => {
    test("should setup performance monitoring when enabled", () => {
      // Mock PerformanceObserver
      const mockObserver = {
        observe: jest.fn(),
      };

      global.PerformanceObserver = jest.fn(() => mockObserver);

      const perfOrchestrator = new ComponentOrchestrator({
        performanceMonitoring: true,
      });

      expect(global.PerformanceObserver).toHaveBeenCalled();
      expect(mockObserver.observe).toHaveBeenCalledWith({
        entryTypes: ["longtask"],
      });

      perfOrchestrator.reset();
      delete global.PerformanceObserver;
    });

    test("should handle missing PerformanceObserver gracefully", () => {
      delete global.PerformanceObserver;

      expect(() => {
        new ComponentOrchestrator({ performanceMonitoring: true });
      }).not.toThrow();
    });
  });

  describe("Helper Methods", () => {
    test("should generate unique subscription IDs", () => {
      const id1 = orchestrator.generateSubscriptionId();
      const id2 = orchestrator.generateSubscriptionId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^sub_\d+_[a-z0-9]+$/);
    });

    test("should generate unique event IDs", () => {
      const id1 = orchestrator.generateEventId();
      const id2 = orchestrator.generateEventId();

      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^evt_\d+_[a-z0-9]+$/);
    });

    test("should deep clone objects correctly", () => {
      const original = {
        a: 1,
        b: { c: 2 },
        d: [3, 4],
        e: new Date("2024-01-01"),
        f: null,
      };

      const cloned = orchestrator.deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
      expect(cloned.d).not.toBe(original.d);
      expect(cloned.e).not.toBe(original.e);
      expect(cloned.e.getTime()).toBe(original.e.getTime());
    });

    test("should set nested values correctly", () => {
      const obj = {};
      orchestrator.setNestedValue(obj, "a.b.c", 42);

      expect(obj).toEqual({ a: { b: { c: 42 } } });
    });

    test("should get nested values correctly", () => {
      const obj = { a: { b: { c: 42 } } };

      expect(orchestrator.getNestedValue(obj, "a.b.c")).toBe(42);
      expect(orchestrator.getNestedValue(obj, "a.b")).toEqual({ c: 42 });
      expect(orchestrator.getNestedValue(obj, "a.b.d")).toBeUndefined();
      expect(orchestrator.getNestedValue(obj, "x.y.z")).toBeUndefined();
    });
  });
});
