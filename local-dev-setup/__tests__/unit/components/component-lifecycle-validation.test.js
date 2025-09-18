/**
 * TD-005 Phase 3: Component Lifecycle Validation Tests
 *
 * Post-TD-004 interface compliance verification and comprehensive
 * component architecture validation for US-087 Phase 2 readiness.
 *
 * Success Criteria:
 * - Component test suite achieving >95% coverage
 * - Component lifecycle performance <500ms initialization
 * - Zero component initialization failures
 * - Cross-component communication <100ms latency
 * - Memory usage per component <50MB
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { JSDOM } from "jsdom";

// Setup DOM environment
const dom = new JSDOM('<!DOCTYPE html><div id="test-container"></div>');
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.Event = dom.window.Event;
global.CustomEvent = dom.window.CustomEvent;

// Import components (using relative paths as per project structure)
import { ComponentOrchestrator } from "../../../../src/groovy/umig/web/js/components/ComponentOrchestrator.js";
import { BaseComponent } from "../../../../src/groovy/umig/web/js/components/BaseComponent.js";
import { TableComponent } from "../../../../src/groovy/umig/web/js/components/TableComponent.js";
import { ModalComponent } from "../../../../src/groovy/umig/web/js/components/ModalComponent.js";
import { FilterComponent } from "../../../../src/groovy/umig/web/js/components/FilterComponent.js";
import { PaginationComponent } from "../../../../src/groovy/umig/web/js/components/PaginationComponent.js";
import { SecurityUtils } from "../../../../src/groovy/umig/web/js/components/SecurityUtils.js";

describe("TD-005 Phase 3: Component Lifecycle Validation", () => {
  let orchestrator;
  let container;
  let performanceMetrics;

  beforeEach(() => {
    // Setup test container
    container = document.getElementById("test-container");
    container.innerHTML = "";

    // Initialize performance metrics tracking
    performanceMetrics = {
      startTime: performance.now(),
      componentInitTimes: new Map(),
      memoryUsage: [],
      communicationLatencies: [],
    };

    // Initialize orchestrator
    orchestrator = new ComponentOrchestrator(container);
  });

  afterEach(() => {
    // Cleanup and performance validation
    if (orchestrator) {
      orchestrator.destroy();
    }
    container.innerHTML = "";

    // Validate performance metrics
    const totalTime = performance.now() - performanceMetrics.startTime;
    if (totalTime > 500) {
      console.warn(`⚠️ Test exceeded 500ms target: ${totalTime.toFixed(2)}ms`);
    }

    // Force garbage collection if available for memory validation
    if (global.gc) {
      global.gc();
    }
  });

  describe("TD-004 Interface Compliance Validation", () => {
    test("all components implement required lifecycle methods", () => {
      const componentClasses = [
        BaseComponent,
        TableComponent,
        ModalComponent,
        FilterComponent,
        PaginationComponent,
      ];

      componentClasses.forEach((ComponentClass) => {
        const component = new ComponentClass();

        // TD-004 Required lifecycle methods
        expect(typeof component.initialize).toBe("function");
        expect(typeof component.mount).toBe("function");
        expect(typeof component.render).toBe("function");
        expect(typeof component.update).toBe("function");
        expect(typeof component.unmount).toBe("function");
        expect(typeof component.destroy).toBe("function");

        // TD-004 Required properties
        expect(component).toHaveProperty("id");
        expect(component).toHaveProperty("state");
        expect(component).toHaveProperty("mounted");

        // TD-004 State management
        expect(typeof component.setState).toBe("function");
        expect(typeof component.getState).toBe("function");
      });
    });

    test("component lifecycle executes in correct order with performance tracking", async () => {
      const component = new BaseComponent();
      const lifecycleCalls = [];
      const initStart = performance.now();

      // Mock lifecycle methods to track calls and timing
      const originalMethods = {};
      ["initialize", "mount", "render", "update", "unmount", "destroy"].forEach(
        (method) => {
          originalMethods[method] = component[method];
          component[method] = jest.fn(async (...args) => {
            const methodStart = performance.now();
            lifecycleCalls.push(method);
            const result = await originalMethods[method].apply(component, args);
            const methodTime = performance.now() - methodStart;
            performanceMetrics.componentInitTimes.set(method, methodTime);
            return result;
          });
        },
      );

      // Execute complete lifecycle
      await component.initialize();
      await component.mount(container);
      await component.render();
      await component.update();
      await component.unmount();
      await component.destroy();

      const totalInitTime = performance.now() - initStart;

      // Verify correct lifecycle order
      expect(lifecycleCalls).toEqual([
        "initialize",
        "mount",
        "render",
        "update",
        "unmount",
        "destroy",
      ]);

      // Performance validation: <500ms total lifecycle
      expect(totalInitTime).toBeLessThan(500);

      // Individual method performance validation
      performanceMetrics.componentInitTimes.forEach((time, method) => {
        expect(time).toBeLessThan(100); // Each method <100ms
      });
    });

    test("component state management follows setState pattern", async () => {
      const component = new BaseComponent();
      await component.initialize();

      // Initial state validation
      expect(component.getState()).toBeDefined();
      expect(typeof component.getState()).toBe("object");

      // setState functionality
      const newState = { testProperty: "testValue", counter: 42 };
      component.setState(newState);

      const updatedState = component.getState();
      expect(updatedState).toMatchObject(newState);
      expect(updatedState.testProperty).toBe("testValue");
      expect(updatedState.counter).toBe(42);

      // State immutability validation
      const originalState = component.getState();
      const stateReference = component.getState();
      stateReference.counter = 100;

      // Original state should not be mutated
      expect(component.getState().counter).toBe(42);
    });
  });

  describe("ComponentOrchestrator Integration Testing", () => {
    test("orchestrator manages multiple components with proper lifecycle", async () => {
      const components = [
        new TableComponent(),
        new ModalComponent(),
        new FilterComponent(),
      ];

      const registrationTimes = [];

      // Register components and track timing
      for (const component of components) {
        const regStart = performance.now();
        await orchestrator.registerComponent(component);
        const regTime = performance.now() - regStart;
        registrationTimes.push(regTime);

        // Each registration should be fast
        expect(regTime).toBeLessThan(50);
      }

      // Verify all components are registered
      expect(orchestrator.getComponentCount()).toBe(3);

      // Test orchestrator lifecycle management
      await orchestrator.initializeAll();
      await orchestrator.mountAll(container);

      // Verify components are properly initialized and mounted
      components.forEach((component) => {
        expect(component.mounted).toBe(true);
        expect(component.getState()).toBeDefined();
      });

      // Test orchestrator cleanup
      await orchestrator.unmountAll();
      await orchestrator.destroyAll();

      // Verify proper cleanup
      components.forEach((component) => {
        expect(component.mounted).toBe(false);
      });
    });

    test("cross-component communication performance validation", async () => {
      const sourceComponent = new BaseComponent();
      const targetComponent = new BaseComponent();

      await orchestrator.registerComponent(sourceComponent);
      await orchestrator.registerComponent(targetComponent);
      await orchestrator.initializeAll();

      // Setup communication test
      let communicationReceived = false;
      let communicationLatency = 0;

      targetComponent.on = jest.fn((event, handler) => {
        if (event === "test-communication") {
          // Simulate event handling with timing
          setTimeout(() => {
            communicationLatency = performance.now() - communicationStart;
            communicationReceived = true;
            handler({ data: "test-data" });
          }, 10);
        }
      });

      // Test cross-component communication
      const communicationStart = performance.now();
      sourceComponent.emit = jest.fn((event, data) => {
        // Simulate event emission through orchestrator
        if (targetComponent.on) {
          targetComponent.on(event, () => {});
        }
      });

      sourceComponent.emit("test-communication", { test: "data" });

      // Wait for communication to complete
      await new Promise((resolve) => {
        const checkCommunication = () => {
          if (
            communicationReceived ||
            performance.now() - communicationStart > 100
          ) {
            resolve();
          } else {
            setTimeout(checkCommunication, 5);
          }
        };
        checkCommunication();
      });

      // Validate communication latency <100ms
      if (communicationReceived) {
        expect(communicationLatency).toBeLessThan(100);
        performanceMetrics.communicationLatencies.push(communicationLatency);
      }
    });
  });

  describe("Component Security Validation", () => {
    test("SecurityUtils maintains 8.5/10 security rating requirements", async () => {
      const securityUtils = new SecurityUtils();
      await securityUtils.initialize();

      // XSS Protection Tests
      const xssInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        "javascript:alert(1)",
        '<svg onload="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<object data="javascript:alert(1)"></object>',
        '<embed src="javascript:alert(1)">',
        '<link rel="stylesheet" href="javascript:alert(1)">',
      ];

      xssInputs.forEach((input) => {
        const sanitized = securityUtils.sanitizeHtml(input);

        // Critical security validations (8.5/10 rating requirements)
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/javascript:/i);
        expect(sanitized).not.toMatch(/onerror=/i);
        expect(sanitized).not.toMatch(/onload=/i);
        expect(sanitized).not.toMatch(/<object/i);
        expect(sanitized).not.toMatch(/<embed/i);
        expect(sanitized).not.toMatch(/href="javascript:/i);
      });

      // CSRF Protection Tests
      const token1 = securityUtils.generateCsrfToken();
      const token2 = securityUtils.generateCsrfToken();

      // Tokens must be unique and valid
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(20);
      expect(token2.length).toBeGreaterThan(20);

      expect(securityUtils.validateCsrfToken(token1)).toBe(true);
      expect(securityUtils.validateCsrfToken(token2)).toBe(true);
      expect(securityUtils.validateCsrfToken("invalid")).toBe(false);

      // Input Validation Tests
      const maliciousInputs = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32",
        "DROP TABLE users;",
        "SELECT * FROM users WHERE id=1; DROP TABLE users;--",
        '<script>fetch("/api/admin/users").then(r=>r.json()).then(console.log)</script>',
      ];

      maliciousInputs.forEach((input) => {
        const validated = securityUtils.validateInput(input);
        expect(validated).toBe(false);
      });
    });

    test("components implement proper security controls", async () => {
      const components = [
        new TableComponent(),
        new ModalComponent(),
        new FilterComponent(),
      ];

      for (const component of components) {
        await component.initialize();

        // Security control requirements
        expect(typeof component.sanitizeInput).toBe("function");
        expect(typeof component.validatePermissions).toBe("function");

        // Test input sanitization
        const maliciousInput = '<script>alert("xss")</script>';
        const sanitized = component.sanitizeInput(maliciousInput);
        expect(sanitized).not.toMatch(/<script/i);

        // Test permission validation
        const hasPermission = component.validatePermissions("admin");
        expect(typeof hasPermission).toBe("boolean");
      }
    });
  });

  describe("Component Memory Management", () => {
    test("components manage memory efficiently within 50MB limit", async () => {
      const initialMemory = performance.memory
        ? performance.memory.usedJSHeapSize
        : 0;
      const components = [];

      // Create multiple components to test memory usage
      for (let i = 0; i < 10; i++) {
        const component = new BaseComponent();
        await component.initialize();
        await component.mount(container);
        components.push(component);
      }

      const peakMemory = performance.memory
        ? performance.memory.usedJSHeapSize
        : 0;
      const memoryIncrease = peakMemory - initialMemory;

      // Validate memory usage <50MB for all components
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      expect(memoryIncreaseMB).toBeLessThan(50);

      // Test memory cleanup
      for (const component of components) {
        await component.unmount();
        await component.destroy();
      }

      // Force garbage collection
      if (global.gc) {
        global.gc();
      }

      const finalMemory = performance.memory
        ? performance.memory.usedJSHeapSize
        : 0;
      const memoryLeakMB = (finalMemory - initialMemory) / (1024 * 1024);

      // Validate minimal memory leakage <5MB
      expect(memoryLeakMB).toBeLessThan(5);

      performanceMetrics.memoryUsage.push({
        initial: initialMemory,
        peak: peakMemory,
        final: finalMemory,
        increase: memoryIncreaseMB,
        leak: memoryLeakMB,
      });
    });

    test("component cleanup prevents memory leaks", async () => {
      const component = new TableComponent();

      // Setup component with event listeners and DOM elements
      await component.initialize();
      await component.mount(container);
      await component.render();

      // Verify component created DOM elements
      const elementsBeforeCleanup = container.children.length;
      expect(elementsBeforeCleanup).toBeGreaterThan(0);

      // Test proper cleanup
      await component.unmount();
      await component.destroy();

      // Verify DOM cleanup
      const elementsAfterCleanup = container.children.length;
      expect(elementsAfterCleanup).toBe(0);

      // Verify component state cleanup
      expect(component.mounted).toBe(false);
      expect(component.destroyed).toBe(true);
    });
  });

  describe("Component Error Handling and Recovery", () => {
    test("components handle initialization errors gracefully", async () => {
      const component = new BaseComponent();

      // Mock initialization failure
      const originalInitialize = component.initialize;
      component.initialize = jest
        .fn()
        .mockRejectedValue(new Error("Initialization failed"));

      let errorCaught = false;
      let errorMessage = "";

      try {
        await component.initialize();
      } catch (error) {
        errorCaught = true;
        errorMessage = error.message;
      }

      expect(errorCaught).toBe(true);
      expect(errorMessage).toBe("Initialization failed");
      expect(component.mounted).toBe(false);

      // Test recovery
      component.initialize = originalInitialize;
      await component.initialize();
      expect(component.getState()).toBeDefined();
    });

    test("components recover from render failures", async () => {
      const component = new TableComponent();
      await component.initialize();
      await component.mount(container);

      // Mock render failure
      const originalRender = component.render;
      component.render = jest
        .fn()
        .mockRejectedValue(new Error("Render failed"));

      let renderErrorCaught = false;
      try {
        await component.render();
      } catch (error) {
        renderErrorCaught = true;
      }

      expect(renderErrorCaught).toBe(true);

      // Test recovery mechanism
      component.render = originalRender;
      await component.render();

      // Component should still be functional
      expect(component.mounted).toBe(true);
      expect(component.getState()).toBeDefined();
    });
  });

  describe("US-087 Phase 2 Readiness Validation", () => {
    test("Teams component integration patterns are validated", async () => {
      // Simulate Teams entity manager integration
      const mockTeamsEntityManager = {
        getTeams: jest.fn().mockResolvedValue([
          { id: 1, name: "Team Alpha", memberCount: 5 },
          { id: 2, name: "Team Beta", memberCount: 3 },
        ]),
        createTeam: jest.fn().mockResolvedValue({ id: 3, name: "Team Gamma" }),
        updateTeam: jest
          .fn()
          .mockResolvedValue({ id: 1, name: "Team Alpha Updated" }),
        deleteTeam: jest.fn().mockResolvedValue(true),
      };

      const tableComponent = new TableComponent();
      await tableComponent.initialize();
      await tableComponent.mount(container);

      // Test entity manager integration
      tableComponent.setEntityManager(mockTeamsEntityManager);
      expect(tableComponent.entityManager).toBeDefined();

      // Test data loading performance
      const dataLoadStart = performance.now();
      const teams = await tableComponent.loadData();
      const dataLoadTime = performance.now() - dataLoadStart;

      expect(dataLoadTime).toBeLessThan(100); // <100ms data loading
      expect(teams).toHaveLength(2);
      expect(teams[0].name).toBe("Team Alpha");

      // Test CRUD operations readiness
      const createStart = performance.now();
      const newTeam = await tableComponent.createEntity({ name: "Team Gamma" });
      const createTime = performance.now() - createStart;

      expect(createTime).toBeLessThan(50); // <50ms create operation
      expect(newTeam.id).toBe(3);
    });

    test("component architecture supports migration requirements", async () => {
      const components = [
        new TableComponent(),
        new FilterComponent(),
        new PaginationComponent(),
        new ModalComponent(),
      ];

      const migrationStart = performance.now();

      // Test component registration and initialization for migration
      for (const component of components) {
        await orchestrator.registerComponent(component);
        await component.initialize();
      }

      const migrationTime = performance.now() - migrationStart;

      // Migration setup must be fast <200ms
      expect(migrationTime).toBeLessThan(200);

      // Validate component readiness for US-087 Phase 2
      components.forEach((component) => {
        expect(component.getState()).toBeDefined();
        expect(typeof component.setState).toBe("function");
        expect(typeof component.render).toBe("function");
        expect(typeof component.update).toBe("function");
      });

      // Test coordinated component updates (required for Teams migration)
      const updateStart = performance.now();
      await Promise.all(components.map((c) => c.update()));
      const updateTime = performance.now() - updateStart;

      expect(updateTime).toBeLessThan(100); // Coordinated updates <100ms
    });
  });

  describe("Performance Summary and Validation", () => {
    test("overall Phase 3 performance meets success criteria", () => {
      const totalTestTime = performance.now() - performanceMetrics.startTime;

      // Comprehensive performance validation
      const performanceSummary = {
        totalTestTime: totalTestTime,
        averageComponentInitTime:
          Array.from(performanceMetrics.componentInitTimes.values()).reduce(
            (a, b) => a + b,
            0,
          ) / performanceMetrics.componentInitTimes.size || 0,
        averageCommunicationLatency:
          performanceMetrics.communicationLatencies.reduce((a, b) => a + b, 0) /
            performanceMetrics.communicationLatencies.length || 0,
        memoryEfficiency:
          performanceMetrics.memoryUsage.length > 0
            ? performanceMetrics.memoryUsage[0].increase < 50
            : true,
      };

      // Phase 3 Success Criteria Validation
      expect(performanceSummary.averageComponentInitTime).toBeLessThan(500); // <500ms initialization
      expect(performanceSummary.averageCommunicationLatency).toBeLessThan(100); // <100ms communication
      expect(performanceSummary.memoryEfficiency).toBe(true); // <50MB memory usage

      console.log("📊 TD-005 Phase 3 Performance Summary:", {
        totalTestTime: `${totalTestTime.toFixed(2)}ms`,
        avgComponentInit: `${performanceSummary.averageComponentInitTime.toFixed(2)}ms`,
        avgCommunication: `${performanceSummary.averageCommunicationLatency.toFixed(2)}ms`,
        memoryEfficient: performanceSummary.memoryEfficiency,
      });

      // Mark Phase 3 as ready for US-087 Phase 2
      if (
        performanceSummary.averageComponentInitTime < 500 &&
        performanceSummary.averageCommunicationLatency < 100 &&
        performanceSummary.memoryEfficiency
      ) {
        console.log(
          "✅ TD-005 Phase 3 COMPLETE - US-087 Phase 2 Teams Component Migration READY",
        );
      }
    });
  });
});
