/**
 * AdminGuiService.test.js - Comprehensive Test Suite
 *
 * US-082-A Phase 1: Foundation Service Layer Testing
 * Following TD-001/TD-002 revolutionary testing patterns
 * - Self-contained architecture (TD-001)
 * - Technology-prefixed commands (TD-002)
 * - 95%+ coverage target
 *
 * @version 1.0.0
 * @author GENDEV Test Suite Generator
 * @since Sprint 6
 */

// Self-contained test architecture (TD-001 pattern)
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

// Load AdminGuiService source code and evaluate in context
const adminGuiServicePath = path.join(
  __dirname,
  "../../../../src/groovy/umig/web/js/services/AdminGuiService.js",
);
const adminGuiServiceCode = fs.readFileSync(adminGuiServicePath, "utf8");

// Self-contained mock implementations (TD-001 pattern)
class MockPerformance {
  now() {
    return Date.now();
  }
}

class MockConsole {
  constructor() {
    this.logs = [];
    this.errors = [];
    this.warnings = [];
    this.infos = [];
  }

  log(...args) {
    this.logs.push(args);
  }

  error(...args) {
    this.errors.push(args);
  }

  warn(...args) {
    this.warnings.push(args);
  }

  info(...args) {
    this.infos.push(args);
  }

  debug(...args) {
    this.logs.push(["DEBUG", ...args]);
  }

  clear() {
    this.logs = [];
    this.errors = [];
    this.warnings = [];
    this.infos = [];
  }
}

class MockLogger {
  constructor() {
    this.logs = [];
  }

  info(...args) {
    this.logs.push(["INFO", ...args]);
  }

  error(...args) {
    this.logs.push(["ERROR", ...args]);
  }

  warn(...args) {
    this.logs.push(["WARN", ...args]);
  }

  debug(...args) {
    this.logs.push(["DEBUG", ...args]);
  }

  clear() {
    this.logs = [];
  }
}

// Mock global environment (TD-001 self-contained)
class TestEnvironment {
  constructor() {
    this.console = new MockConsole();
    this.performance = new MockPerformance();
    this.logger = new MockLogger();
    this.services = {};
    this.features = new Map();
    this.events = new Map();
    this.timers = [];
    this.intervals = [];
  }

  createContext() {
    return {
      console: this.console,
      performance: this.performance,
      setTimeout: (fn, delay) => {
        const timer = setTimeout(fn, delay);
        this.timers.push(timer);
        return timer;
      },
      setInterval: (fn, delay) => {
        const interval = setInterval(fn, delay);
        this.intervals.push(interval);
        return interval;
      },
      clearTimeout: (timer) => {
        clearTimeout(timer);
        const index = this.timers.indexOf(timer);
        if (index > -1) this.timers.splice(index, 1);
      },
      clearInterval: (interval) => {
        clearInterval(interval);
        const index = this.intervals.indexOf(interval);
        if (index > -1) this.intervals.splice(index, 1);
      },
      Date: Date,
      Map: Map,
      Set: Set,
      Promise: Promise,
      Error: Error,
      Object: Object,
      Array: Array,
    };
  }

  cleanup() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.intervals.forEach((interval) => clearInterval(interval));
    this.timers = [];
    this.intervals = [];
    this.console.clear();
    this.logger.clear();
    this.services = {};
    this.features.clear();
    this.events.clear();
  }
}

// Create test environment and evaluate AdminGuiService code
const testEnv = new TestEnvironment();

// Execute AdminGuiService code in controlled context
function createAdminGuiService() {
  const context = testEnv.createContext();
  const modifiedCode = adminGuiServiceCode
    .replace(/if \(typeof module.*?^}/gms, "") // Remove Node.js module exports
    .replace(/if \(typeof define.*?^\}.*?^}/gms, "") // Remove AMD define
    .replace(/if \(typeof window.*?^}/gms, ""); // Remove browser global

  // Add window to context
  context.window = context;

  // Execute in context and extract classes/functions
  const func = new Function(
    ...Object.keys(context),
    modifiedCode +
      `
        return {
            BaseService: BaseService,
            AdminGuiService: AdminGuiService,
            initializeAdminGuiServices: initializeAdminGuiServices
        };
    `,
  );

  return func(...Object.values(context));
}

describe("AdminGuiService - Foundation Service Layer Tests", () => {
  let testEnvironment;
  let AdminGuiService;
  let BaseService;
  let initializeAdminGuiServices;
  let adminGuiService;

  beforeEach(() => {
    testEnvironment = new TestEnvironment();
    const serviceClasses = createAdminGuiService();
    AdminGuiService = serviceClasses.AdminGuiService;
    BaseService = serviceClasses.BaseService;
    initializeAdminGuiServices = serviceClasses.initializeAdminGuiServices;
  });

  afterEach(() => {
    if (adminGuiService && typeof adminGuiService.cleanup === "function") {
      adminGuiService.cleanup();
    }
    testEnvironment.cleanup();
  });

  describe("BaseService Foundation Tests", () => {
    let baseService;

    beforeEach(() => {
      baseService = new BaseService("TestService", [
        "dependency1",
        "dependency2",
      ]);
    });

    test("should create BaseService with correct initial state", () => {
      expect(baseService.name).toBe("TestService");
      expect(baseService.dependencies).toEqual(["dependency1", "dependency2"]);
      expect(baseService.state).toBe("initialized");
      expect(baseService.startTime).toBeNull();
      expect(baseService.metrics).toEqual({
        initTime: 0,
        startTime: 0,
        errorCount: 0,
        operationCount: 0,
      });
      expect(baseService.eventHandlers).toBeInstanceOf(Map);
      expect(baseService.config).toEqual({});
      expect(baseService.logger).toBeNull();
    });

    test("should initialize service with configuration", async () => {
      const config = { setting1: "value1", setting2: "value2" };
      const logger = testEnvironment.logger;

      await baseService.initialize(config, logger);

      expect(baseService.state).toBe("initialized");
      expect(baseService.config).toEqual(config);
      expect(baseService.logger).toBe(logger);
      expect(baseService.metrics.initTime).toBeGreaterThan(0);
    });

    test("should handle initialization errors", async () => {
      // Mock doInitialize to throw error
      baseService._doInitialize = jest
        .fn()
        .mockRejectedValue(new Error("Init failed"));

      await expect(baseService.initialize()).rejects.toThrow("Init failed");
      expect(baseService.state).toBe("error");
      expect(baseService.metrics.errorCount).toBe(1);
    });

    test("should start service after initialization", async () => {
      await baseService.initialize();

      // Mock doStart
      baseService._doStart = jest.fn().mockResolvedValue();

      await baseService.start();

      expect(baseService.state).toBe("running");
      expect(baseService.startTime).not.toBeNull();
      expect(baseService.metrics.startTime).toBeGreaterThan(0);
    });

    test("should reject start if not initialized", async () => {
      baseService.state = "error";

      await expect(baseService.start()).rejects.toThrow(
        "Cannot start TestService in state: error",
      );
    });

    test("should handle start errors", async () => {
      await baseService.initialize();
      baseService._doStart = jest
        .fn()
        .mockRejectedValue(new Error("Start failed"));

      await expect(baseService.start()).rejects.toThrow("Start failed");
      expect(baseService.state).toBe("error");
      expect(baseService.metrics.errorCount).toBe(1);
    });

    test("should stop service when running", async () => {
      await baseService.initialize();
      baseService._doStart = jest.fn().mockResolvedValue();
      baseService._doStop = jest.fn().mockResolvedValue();

      await baseService.start();
      await baseService.stop();

      expect(baseService.state).toBe("stopped");
    });

    test("should cleanup service resources", async () => {
      baseService._doCleanup = jest.fn().mockResolvedValue();

      await baseService.cleanup();

      expect(baseService.state).toBe("cleaned");
      expect(baseService._doCleanup).toHaveBeenCalled();
    });

    test("should handle event registration and emission", () => {
      const handler = jest.fn();

      baseService.on("test-event", handler);
      baseService.emit("test-event", { data: "test" });

      expect(handler).toHaveBeenCalledWith({ data: "test" });
    });

    test("should remove event handlers", () => {
      const handler = jest.fn();

      baseService.on("test-event", handler);
      baseService.off("test-event", handler);
      baseService.emit("test-event", { data: "test" });

      expect(handler).not.toHaveBeenCalled();
    });

    test("should get service health information", () => {
      const health = baseService.getHealth();

      expect(health).toEqual({
        name: "TestService",
        state: "initialized",
        uptime: expect.any(Number),
        metrics: baseService.metrics,
        memoryUsage: expect.any(Object),
      });
    });

    test("should log with different levels", () => {
      baseService.logger = testEnvironment.logger;

      baseService._log("info", "Test info message");
      baseService._log("error", "Test error message");
      baseService._log("warn", "Test warning message");

      expect(testEnvironment.logger.logs).toEqual([
        ["INFO", "Test info message"],
        ["ERROR", "Test error message"],
        ["WARN", "Test warning message"],
      ]);
    });
  });

  describe("AdminGuiService Core Tests", () => {
    beforeEach(() => {
      adminGuiService = new AdminGuiService();
    });

    test("should create AdminGuiService with correct initial state", () => {
      expect(adminGuiService.name).toBe("AdminGuiService");
      expect(adminGuiService.state).toBe("initialized");
      expect(adminGuiService.services).toBeInstanceOf(Map);
      expect(adminGuiService.eventBus).toBeInstanceOf(Map);
      expect(adminGuiService.dependencyGraph).toBeInstanceOf(Map);
      expect(adminGuiService.featureFlags).toBeInstanceOf(Map);
    });

    test("should register services correctly", () => {
      const mockService = {
        name: "TestService",
        dependencies: ["dep1"],
        initialize: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        cleanup: jest.fn(),
      };

      adminGuiService.registerService("TestService", mockService);

      expect(adminGuiService.services.has("TestService")).toBe(true);
      expect(adminGuiService.services.get("TestService")).toBe(mockService);
    });

    test("should reject duplicate service registration", () => {
      const mockService = { name: "TestService" };

      adminGuiService.registerService("TestService", mockService);

      expect(() => {
        adminGuiService.registerService("TestService", mockService);
      }).toThrow("Service TestService is already registered");
    });

    test("should unregister services correctly", () => {
      const mockService = {
        name: "TestService",
        cleanup: jest.fn().mockResolvedValue(),
      };

      adminGuiService.registerService("TestService", mockService);
      expect(adminGuiService.services.has("TestService")).toBe(true);

      adminGuiService.unregisterService("TestService");
      expect(adminGuiService.services.has("TestService")).toBe(false);
    });

    test("should get registered service", () => {
      const mockService = { name: "TestService" };
      adminGuiService.registerService("TestService", mockService);

      const retrieved = adminGuiService.getService("TestService");
      expect(retrieved).toBe(mockService);
    });

    test("should return null for non-existent service", () => {
      const retrieved = adminGuiService.getService("NonExistentService");
      expect(retrieved).toBeNull();
    });

    test("should handle feature flag operations", () => {
      adminGuiService.setFeatureFlag("newFeature", true);
      expect(adminGuiService.isFeatureEnabled("newFeature")).toBe(true);

      adminGuiService.setFeatureFlag("newFeature", false);
      expect(adminGuiService.isFeatureEnabled("newFeature")).toBe(false);

      expect(adminGuiService.isFeatureEnabled("nonExistent")).toBe(false);
    });

    test("should get all feature flags", () => {
      adminGuiService.setFeatureFlag("feature1", true);
      adminGuiService.setFeatureFlag("feature2", false);

      const flags = adminGuiService.getFeatureFlags();
      expect(flags).toEqual({
        feature1: true,
        feature2: false,
      });
    });

    test("should resolve dependency order correctly", () => {
      // Create services with dependencies
      const serviceA = { name: "ServiceA", dependencies: [] };
      const serviceB = { name: "ServiceB", dependencies: ["ServiceA"] };
      const serviceC = {
        name: "ServiceC",
        dependencies: ["ServiceA", "ServiceB"],
      };

      adminGuiService.registerService("ServiceC", serviceC);
      adminGuiService.registerService("ServiceA", serviceA);
      adminGuiService.registerService("ServiceB", serviceB);

      const order = adminGuiService._resolveDependencyOrder();

      expect(order.indexOf("ServiceA")).toBeLessThan(order.indexOf("ServiceB"));
      expect(order.indexOf("ServiceB")).toBeLessThan(order.indexOf("ServiceC"));
    });

    test("should detect circular dependencies", () => {
      const serviceA = { name: "ServiceA", dependencies: ["ServiceB"] };
      const serviceB = { name: "ServiceB", dependencies: ["ServiceA"] };

      adminGuiService.registerService("ServiceA", serviceA);
      adminGuiService.registerService("ServiceB", serviceB);

      expect(() => {
        adminGuiService._resolveDependencyOrder();
      }).toThrow("Circular dependency detected");
    });

    test("should initialize all services in dependency order", async () => {
      const initOrder = [];

      const serviceA = {
        name: "ServiceA",
        dependencies: [],
        initialize: jest.fn().mockImplementation(() => {
          initOrder.push("ServiceA");
          return Promise.resolve();
        }),
      };

      const serviceB = {
        name: "ServiceB",
        dependencies: ["ServiceA"],
        initialize: jest.fn().mockImplementation(() => {
          initOrder.push("ServiceB");
          return Promise.resolve();
        }),
      };

      adminGuiService.registerService("ServiceB", serviceB);
      adminGuiService.registerService("ServiceA", serviceA);

      await adminGuiService.initialize();

      expect(initOrder).toEqual(["ServiceA", "ServiceB"]);
    });

    test("should start all services in dependency order", async () => {
      const startOrder = [];

      const serviceA = {
        name: "ServiceA",
        dependencies: [],
        initialize: jest.fn().mockResolvedValue(),
        start: jest.fn().mockImplementation(() => {
          startOrder.push("ServiceA");
          return Promise.resolve();
        }),
      };

      const serviceB = {
        name: "ServiceB",
        dependencies: ["ServiceA"],
        initialize: jest.fn().mockResolvedValue(),
        start: jest.fn().mockImplementation(() => {
          startOrder.push("ServiceB");
          return Promise.resolve();
        }),
      };

      adminGuiService.registerService("ServiceB", serviceB);
      adminGuiService.registerService("ServiceA", serviceA);

      await adminGuiService.initialize();
      await adminGuiService.start();

      expect(startOrder).toEqual(["ServiceA", "ServiceB"]);
    });

    test("should handle service initialization errors", async () => {
      const serviceA = {
        name: "ServiceA",
        dependencies: [],
        initialize: jest.fn().mockRejectedValue(new Error("Init failed")),
      };

      adminGuiService.registerService("ServiceA", serviceA);

      await expect(adminGuiService.initialize()).rejects.toThrow();
    });

    test("should emit events through event bus", () => {
      const handler = jest.fn();
      adminGuiService.on("test-event", handler);

      adminGuiService.emit("test-event", { data: "test" });

      expect(handler).toHaveBeenCalledWith({ data: "test" });
    });

    test("should get comprehensive health status", async () => {
      const mockService = {
        name: "TestService",
        getHealth: jest.fn().mockReturnValue({
          name: "TestService",
          state: "running",
          uptime: 1000,
          metrics: { errorCount: 0 },
        }),
      };

      adminGuiService.registerService("TestService", mockService);
      const health = await adminGuiService.getHealth();

      expect(health.name).toBe("AdminGuiService");
      expect(health.services).toHaveProperty("TestService");
      expect(health.featureFlags).toEqual({});
    });
  });

  describe("Global Function Tests", () => {
    test("should initialize AdminGui services globally", async () => {
      const config = {
        features: {
          newArchitecture: true,
        },
        services: {
          api: { baseUrl: "/api/v1" },
        },
      };

      const result = await initializeAdminGuiServices(config);

      expect(result).toHaveProperty("adminGuiService");
      expect(result.adminGuiService).toBeInstanceOf(AdminGuiService);
    });

    test("should handle initialization with default config", async () => {
      const result = await initializeAdminGuiServices();

      expect(result).toHaveProperty("adminGuiService");
      expect(result.adminGuiService).toBeInstanceOf(AdminGuiService);
    });
  });

  describe("Performance and Monitoring Tests", () => {
    test("should track service metrics", async () => {
      const service = new BaseService("MetricsTest");

      await service.initialize();

      expect(service.metrics.initTime).toBeGreaterThan(0);
      expect(service.metrics.errorCount).toBe(0);
      expect(service.metrics.operationCount).toBe(0);
    });

    test("should measure operation performance", async () => {
      adminGuiService = new AdminGuiService();

      await adminGuiService.initialize();

      const health = await adminGuiService.getHealth();
      expect(health.uptime).toBeGreaterThanOrEqual(0);
      expect(health.metrics).toBeDefined();
    });

    test("should handle memory usage reporting", () => {
      const service = new BaseService("MemoryTest");
      const health = service.getHealth();

      expect(health.memoryUsage).toBeDefined();
      expect(typeof health.memoryUsage).toBe("object");
    });
  });

  describe("Error Handling and Recovery Tests", () => {
    test("should handle service registration errors gracefully", () => {
      expect(() => {
        adminGuiService.registerService("", null);
      }).toThrow();

      expect(() => {
        adminGuiService.registerService("Valid", null);
      }).toThrow();
    });

    test("should handle missing dependencies gracefully", () => {
      const serviceWithMissingDep = {
        name: "ServiceWithMissingDep",
        dependencies: ["NonExistentService"],
      };

      adminGuiService.registerService(
        "ServiceWithMissingDep",
        serviceWithMissingDep,
      );

      expect(() => {
        adminGuiService._resolveDependencyOrder();
      }).toThrow("Missing dependency: NonExistentService");
    });

    test("should cleanup resources on stop", async () => {
      const mockService = {
        name: "CleanupTest",
        dependencies: [],
        initialize: jest.fn().mockResolvedValue(),
        start: jest.fn().mockResolvedValue(),
        stop: jest.fn().mockResolvedValue(),
        cleanup: jest.fn().mockResolvedValue(),
      };

      adminGuiService.registerService("CleanupTest", mockService);

      await adminGuiService.initialize();
      await adminGuiService.start();
      await adminGuiService.stop();

      expect(mockService.stop).toHaveBeenCalled();
    });

    test("should handle cleanup errors gracefully", async () => {
      const mockService = {
        name: "CleanupErrorTest",
        cleanup: jest.fn().mockRejectedValue(new Error("Cleanup failed")),
      };

      adminGuiService.registerService("CleanupErrorTest", mockService);

      // Should not throw despite service cleanup failure
      await expect(adminGuiService.cleanup()).resolves.not.toThrow();
    });
  });

  // Test cleanup to prevent memory leaks
  afterAll(() => {
    testEnvironment?.cleanup();
  });
});

// Technology-prefixed commands verification (TD-002)
console.log(
  "🧪 AdminGuiService Test Suite - Technology-Prefixed Commands (TD-002)",
);
console.log("✅ Self-contained architecture pattern (TD-001) implemented");
console.log("✅ Comprehensive service layer testing with 95%+ coverage target");
