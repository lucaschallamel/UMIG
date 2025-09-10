/**
 * AdminGuiService.test.js - Comprehensive Test Suite (Simplified Jest Pattern)
 *
 * US-082-A Phase 1: Foundation Service Layer Testing
 * Following TD-002 simplified Jest pattern - NO self-contained architecture
 * - Standard Jest module loading
 * - Proper CommonJS imports
 * - 95%+ coverage target
 *
 * @version 2.0.0 - Simplified Jest Pattern
 * @author GENDEV Test Suite Generator
 * @since Sprint 6
 */

// Setup globals BEFORE requiring modules
global.window = global.window || {};
global.performance = global.performance || { now: () => Date.now() };

// Standard CommonJS require - NO vm.runInContext
const { AdminGuiService, BaseService, initializeAdminGuiServices } = require("../../../../src/groovy/umig/web/js/services/AdminGuiService.js");

// Mock implementations for testing
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

class MockService extends BaseService {
  constructor(name = "MockService", config = {}) {
    super(name, config);
    this.dependencies = config.dependencies || [];
  }

  async doInitialize() {
    if (this.config.initError) {
      throw new Error("Mock initialization error");
    }
    this.initTime = Date.now();
    return true;
  }

  async doStart() {
    if (this.config.startError) {
      throw new Error("Mock start error");
    }
    this.startTime = Date.now();
    return true;
  }

  async doStop() {
    if (this.config.stopError) {
      throw new Error("Mock stop error");
    }
    this.stopTime = Date.now();
    return true;
  }

  async doCleanup() {
    if (this.config.cleanupError) {
      throw new Error("Mock cleanup error");
    }
    this.cleanupTime = Date.now();
    return true;
  }

  getHealth() {
    return {
      status: "healthy",
      initialized: this.initialized,
      running: this.running,
      uptime: this.running ? Date.now() - this.startTime : 0,
    };
  }
}

describe("AdminGuiService - Foundation Service Layer Tests", () => {
  let adminGuiService;
  let baseService;
  let mockLogger;

  beforeEach(() => {
    mockLogger = new MockLogger();
    
    // Create fresh instances for each test
    adminGuiService = new AdminGuiService({
      logger: mockLogger,
      enableMetrics: true
    });

    baseService = new BaseService("TestService", {
      logger: mockLogger,
      enableMetrics: true
    });

    // Clear any existing state
    adminGuiService.services.clear();
    adminGuiService.featureFlags.clear();
  });

  afterEach(async () => {
    // Cleanup after each test
    if (adminGuiService && adminGuiService.running) {
      await adminGuiService.stop();
    }
    if (adminGuiService && adminGuiService.initialized) {
      await adminGuiService.cleanup();
    }
    
    if (baseService && baseService.running) {
      await baseService.stop();
    }
    if (baseService && baseService.initialized) {
      await baseService.cleanup();
    }
  });

  describe("BaseService Foundation Tests", () => {
    test("should create BaseService with correct initial state", () => {
      expect(baseService).toBeDefined();
      expect(baseService.name).toBe("TestService");
      expect(baseService.initialized).toBe(false);
      expect(baseService.running).toBe(false);
      expect(baseService.config).toBeDefined();
      expect(baseService.metrics).toBeDefined();
      expect(baseService.eventHandlers).toBeDefined();
      expect(baseService.createdAt).toBeInstanceOf(Date);
    });

    test("should initialize service with configuration", async () => {
      const config = { testParam: "testValue" };
      baseService = new BaseService("TestService", config);
      
      await baseService.initialize();
      
      expect(baseService.initialized).toBe(true);
      expect(baseService.config.testParam).toBe("testValue");
      expect(baseService.initializedAt).toBeInstanceOf(Date);
    });

    test("should handle initialization errors", async () => {
      const errorService = new MockService("ErrorService", { initError: true });
      
      await expect(errorService.initialize()).rejects.toThrow("Mock initialization error");
      expect(errorService.initialized).toBe(false);
    });

    test("should start service after initialization", async () => {
      await baseService.initialize();
      await baseService.start();
      
      expect(baseService.running).toBe(true);
      expect(baseService.startedAt).toBeInstanceOf(Date);
    });

    test("should reject start if not initialized", async () => {
      await expect(baseService.start()).rejects.toThrow("Service must be initialized before starting");
      expect(baseService.running).toBe(false);
    });

    test("should handle start errors", async () => {
      const errorService = new MockService("ErrorService", { startError: true });
      await errorService.initialize();
      
      await expect(errorService.start()).rejects.toThrow("Mock start error");
      expect(errorService.running).toBe(false);
    });

    test("should stop service when running", async () => {
      await baseService.initialize();
      await baseService.start();
      await baseService.stop();
      
      expect(baseService.running).toBe(false);
      expect(baseService.stoppedAt).toBeInstanceOf(Date);
    });

    test("should cleanup service resources", async () => {
      await baseService.initialize();
      await baseService.cleanup();
      
      expect(baseService.initialized).toBe(false);
    });

    test("should handle event registration and emission", () => {
      let eventData = null;
      baseService.on("test-event", (data) => { eventData = data; });
      
      baseService.emit("test-event", { data: "test" });
      
      expect(eventData).toEqual({ data: "test" });
    });

    test("should remove event handlers", () => {
      let eventCount = 0;
      const handler = () => { eventCount++; };
      
      baseService.on("test-event", handler);
      baseService.emit("test-event", { data: "test" });
      expect(eventCount).toBe(1);
      
      baseService.off("test-event", handler);
      baseService.emit("test-event", { data: "test" });
      expect(eventCount).toBe(1); // Should not increment
    });

    test("should get service health information", () => {
      const health = baseService.getHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.initialized).toBe(false);
      expect(health.running).toBe(false);
      expect(health.uptime).toBeDefined();
      expect(health.createdAt).toBeInstanceOf(Date);
    });

    test("should log with different levels", () => {
      baseService.log("info", "Info message");
      baseService.log("error", "Error message");
      baseService.log("warn", "Warning message");
      baseService.log("debug", "Debug message");
      
      expect(mockLogger.logs.length).toBeGreaterThan(0);
      expect(mockLogger.logs.some(log => log.includes("Info message"))).toBe(true);
      expect(mockLogger.logs.some(log => log.includes("Error message"))).toBe(true);
      expect(mockLogger.logs.some(log => log.includes("Warning message"))).toBe(true);
      expect(mockLogger.logs.some(log => log.includes("Debug message"))).toBe(true);
    });
  });

  describe("AdminGuiService Core Tests", () => {
    test("should create AdminGuiService with correct initial state", () => {
      expect(adminGuiService).toBeDefined();
      expect(adminGuiService.name).toBe("AdminGuiService");
      expect(adminGuiService.services).toBeDefined();
      expect(adminGuiService.featureFlags).toBeDefined();
      expect(adminGuiService.initialized).toBe(false);
      expect(adminGuiService.running).toBe(false);
    });

    test("should register services correctly", () => {
      const mockService = new MockService("TestService");
      
      adminGuiService.registerService(mockService);
      
      expect(adminGuiService.services.has("TestService")).toBe(true);
      expect(adminGuiService.services.get("TestService")).toBe(mockService);
    });

    test("should reject duplicate service registration", () => {
      const mockService1 = new MockService("TestService");
      const mockService2 = new MockService("TestService");
      
      adminGuiService.registerService(mockService1);
      
      expect(() => {
        adminGuiService.registerService(mockService2);
      }).toThrow("Service TestService is already registered");
    });

    test("should unregister services correctly", () => {
      const mockService = new MockService("TestService");
      adminGuiService.registerService(mockService);
      
      expect(adminGuiService.services.has("TestService")).toBe(true);
      
      adminGuiService.unregisterService("TestService");
      
      expect(adminGuiService.services.has("TestService")).toBe(false);
    });

    test("should get registered service", () => {
      const mockService = new MockService("TestService");
      adminGuiService.registerService(mockService);
      
      const retrieved = adminGuiService.getService("TestService");
      
      expect(retrieved).toBe(mockService);
    });

    test("should return null for non-existent service", () => {
      const retrieved = adminGuiService.getService("NonExistentService");
      expect(retrieved).toBeNull();
    });

    test("should handle feature flag operations", () => {
      adminGuiService.setFeatureFlag("testFlag", true);
      expect(adminGuiService.getFeatureFlag("testFlag")).toBe(true);
      
      adminGuiService.setFeatureFlag("testFlag", false);
      expect(adminGuiService.getFeatureFlag("testFlag")).toBe(false);
      
      expect(adminGuiService.getFeatureFlag("nonExistentFlag")).toBe(false);
    });

    test("should get all feature flags", () => {
      adminGuiService.setFeatureFlag("flag1", true);
      adminGuiService.setFeatureFlag("flag2", false);
      adminGuiService.setFeatureFlag("flag3", true);
      
      const flags = adminGuiService.getAllFeatureFlags();
      
      expect(flags).toEqual({
        flag1: true,
        flag2: false,
        flag3: true
      });
    });

    test("should resolve dependency order correctly", () => {
      const serviceA = new MockService("ServiceA", { dependencies: [] });
      const serviceB = new MockService("ServiceB", { dependencies: ["ServiceA"] });
      const serviceC = new MockService("ServiceC", { dependencies: ["ServiceB"] });
      
      adminGuiService.registerService(serviceC);
      adminGuiService.registerService(serviceA);
      adminGuiService.registerService(serviceB);
      
      const order = adminGuiService.resolveDependencyOrder();
      
      expect(order.indexOf("ServiceA")).toBeLessThan(order.indexOf("ServiceB"));
      expect(order.indexOf("ServiceB")).toBeLessThan(order.indexOf("ServiceC"));
    });

    test("should detect circular dependencies", () => {
      const serviceA = new MockService("ServiceA", { dependencies: ["ServiceB"] });
      const serviceB = new MockService("ServiceB", { dependencies: ["ServiceA"] });
      
      adminGuiService.registerService(serviceA);
      adminGuiService.registerService(serviceB);
      
      expect(() => {
        adminGuiService.resolveDependencyOrder();
      }).toThrow("Circular dependency detected");
    });

    test("should initialize all services in dependency order", async () => {
      const serviceA = new MockService("ServiceA", { dependencies: [] });
      const serviceB = new MockService("ServiceB", { dependencies: ["ServiceA"] });
      const serviceC = new MockService("ServiceC", { dependencies: ["ServiceB"] });
      
      adminGuiService.registerService(serviceC);
      adminGuiService.registerService(serviceA);
      adminGuiService.registerService(serviceB);
      
      await adminGuiService.initialize();
      
      expect(serviceA.initialized).toBe(true);
      expect(serviceB.initialized).toBe(true);
      expect(serviceC.initialized).toBe(true);
      expect(adminGuiService.initialized).toBe(true);
      
      // Check initialization order
      expect(serviceA.initTime).toBeLessThanOrEqual(serviceB.initTime);
      expect(serviceB.initTime).toBeLessThanOrEqual(serviceC.initTime);
    });

    test("should start all services in dependency order", async () => {
      const serviceA = new MockService("ServiceA", { dependencies: [] });
      const serviceB = new MockService("ServiceB", { dependencies: ["ServiceA"] });
      
      adminGuiService.registerService(serviceA);
      adminGuiService.registerService(serviceB);
      
      await adminGuiService.initialize();
      await adminGuiService.start();
      
      expect(serviceA.running).toBe(true);
      expect(serviceB.running).toBe(true);
      expect(adminGuiService.running).toBe(true);
      
      // Check start order
      expect(serviceA.startTime).toBeLessThanOrEqual(serviceB.startTime);
    });

    test("should handle service initialization errors", async () => {
      const errorService = new MockService("ErrorService", { initError: true });
      adminGuiService.registerService(errorService);
      
      await expect(adminGuiService.initialize()).rejects.toThrow("Mock initialization error");
      expect(adminGuiService.initialized).toBe(false);
    });

    test("should emit events through event bus", () => {
      let eventData = null;
      adminGuiService.on("test-event", (data) => { eventData = data; });
      
      adminGuiService.emit("test-event", { data: "test" });
      
      expect(eventData).toEqual({ data: "test" });
    });

    test("should get comprehensive health status", async () => {
      const serviceA = new MockService("ServiceA");
      adminGuiService.registerService(serviceA);
      
      await adminGuiService.initialize();
      await adminGuiService.start();
      
      const health = await adminGuiService.getHealth();
      
      expect(health).toBeDefined();
      expect(health.status).toBeDefined();
      expect(health.services).toBeDefined();
      expect(health.services.ServiceA).toBeDefined();
      expect(health.overallHealth).toBeDefined();
    });
  });

  describe("Global Function Tests", () => {
    test("should initialize AdminGui services globally", async () => {
      const result = await initializeAdminGuiServices({
        enableMetrics: true,
        featureFlags: {
          testFlag: true
        }
      });
      
      expect(result).toBeDefined();
      expect(result.adminGuiService).toBeInstanceOf(AdminGuiService);
      expect(result.adminGuiService.getFeatureFlag("testFlag")).toBe(true);
    });

    test("should handle initialization with default config", async () => {
      const result = await initializeAdminGuiServices();
      
      expect(result).toBeDefined();
      expect(result.adminGuiService).toBeInstanceOf(AdminGuiService);
    });
  });

  describe("Performance and Monitoring Tests", () => {
    test("should track service metrics", async () => {
      await adminGuiService.initialize();
      
      expect(adminGuiService.metrics).toBeDefined();
      expect(adminGuiService.metrics.initialized).toBe(true);
      expect(adminGuiService.metrics.initializationTime).toBeGreaterThan(0);
    });

    test("should measure operation performance", async () => {
      const startTime = performance.now();
      await adminGuiService.initialize();
      const endTime = performance.now();
      
      expect(adminGuiService.metrics.initializationTime).toBeGreaterThan(0);
      expect(adminGuiService.metrics.initializationTime).toBeLessThanOrEqual(endTime - startTime);
    });

    test("should handle memory usage reporting", () => {
      const health = adminGuiService.getHealth();
      
      expect(health.memory).toBeDefined();
      expect(typeof health.memory.used).toBe("number");
      expect(typeof health.memory.total).toBe("number");
    });
  });

  describe("Error Handling and Recovery Tests", () => {
    test("should handle service registration errors gracefully", () => {
      const invalidService = null;
      
      expect(() => {
        adminGuiService.registerService(invalidService);
      }).toThrow();
    });

    test("should handle missing dependencies gracefully", async () => {
      const serviceWithMissingDep = new MockService("ServiceWithMissingDep", { 
        dependencies: ["NonExistentService"] 
      });
      
      adminGuiService.registerService(serviceWithMissingDep);
      
      await expect(adminGuiService.initialize()).rejects.toThrow();
    });

    test("should cleanup resources on stop", async () => {
      const serviceA = new MockService("ServiceA");
      adminGuiService.registerService(serviceA);
      
      await adminGuiService.initialize();
      await adminGuiService.start();
      await adminGuiService.stop();
      
      expect(serviceA.running).toBe(false);
      expect(adminGuiService.running).toBe(false);
    });

    test("should handle cleanup errors gracefully", async () => {
      const errorService = new MockService("ErrorService", { cleanupError: true });
      adminGuiService.registerService(errorService);
      
      await adminGuiService.initialize();
      
      // Should not throw despite service cleanup failure
      await expect(adminGuiService.cleanup()).resolves.not.toThrow();
    });
  });
});

console.log("🧪 AdminGuiService Test Suite - Simplified Jest Pattern (TD-002)");
console.log("✅ Standard CommonJS module loading implemented");
console.log("✅ Comprehensive service layer testing with 95%+ coverage target");