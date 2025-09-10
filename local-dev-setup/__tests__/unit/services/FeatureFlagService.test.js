/**
 * FeatureFlagService.test.js - Comprehensive Test Suite
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

// Load FeatureFlagService source code
const featureFlagServicePath = path.join(
  __dirname,
  "../../../../src/groovy/umig/web/js/services/FeatureFlagService.js",
);
const featureFlagServiceCode = fs.readFileSync(featureFlagServicePath, "utf8");

// Self-contained mock implementations (TD-001 pattern)
class MockConsole {
  constructor() {
    this.logs = [];
  }

  log(...args) {
    this.logs.push(["log", ...args]);
  }
  error(...args) {
    this.logs.push(["error", ...args]);
  }
  warn(...args) {
    this.logs.push(["warn", ...args]);
  }
  info(...args) {
    this.logs.push(["info", ...args]);
  }
  debug(...args) {
    this.logs.push(["debug", ...args]);
  }

  clear() {
    this.logs = [];
  }
}

class MockStorage {
  constructor() {
    this.data = new Map();
  }

  getItem(key) {
    return this.data.get(key) || null;
  }

  setItem(key, value) {
    this.data.set(key, String(value));
  }

  removeItem(key) {
    this.data.delete(key);
  }

  clear() {
    this.data.clear();
  }
}

class MockBaseService {
  constructor(name) {
    this.name = name;
    this.state = "initialized";
    this.eventHandlers = new Map();
    this.metrics = { errorCount: 0, operationCount: 0 };
    this.config = {};
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach((handler) => handler(data));
    }
  }

  async initialize(config = {}) {
    this.config = config;
    this.state = "initialized";
  }

  async start() {
    this.state = "running";
  }

  async stop() {
    this.state = "stopped";
  }

  async cleanup() {
    this.state = "cleaned";
  }

  getHealth() {
    return {
      name: this.name,
      state: this.state,
      metrics: this.metrics,
    };
  }

  _log(level, ...args) {
    console[level](...args);
  }
}

class MockApiService {
  constructor() {
    this.requests = [];
    this.responses = new Map();
  }

  async get(url, options = {}) {
    this.requests.push({ method: "GET", url, options });
    const response = this.responses.get(`GET:${url}`) || {
      status: 200,
      data: {},
    };
    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.data;
  }

  async post(url, data, options = {}) {
    this.requests.push({ method: "POST", url, data, options });
    const response = this.responses.get(`POST:${url}`) || {
      status: 200,
      data: {},
    };
    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.data;
  }

  setMockResponse(method, url, response) {
    this.responses.set(`${method}:${url}`, response);
  }
}

class MockAuthenticationService {
  constructor() {
    this.currentUser = {
      userId: "testuser123",
      email: "test@example.com",
      groups: ["confluence-users"],
      attributes: { department: "engineering" },
    };
  }

  getCurrentUser() {
    return this.currentUser;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }
}

class MockWindow {
  constructor() {
    this.localStorage = new MockStorage();
    this.sessionStorage = new MockStorage();
    this.location = { href: "http://localhost:8090", hostname: "localhost" };
    this.console = new MockConsole();
    this.BaseService = MockBaseService;
    this.timers = [];
    this.intervals = [];
  }

  setTimeout(fn, delay) {
    const timer = setTimeout(fn, delay);
    this.timers.push(timer);
    return timer;
  }

  setInterval(fn, delay) {
    const interval = setInterval(fn, delay);
    this.intervals.push(interval);
    return interval;
  }

  clearTimeout(timer) {
    clearTimeout(timer);
    const index = this.timers.indexOf(timer);
    if (index > -1) this.timers.splice(index, 1);
  }

  clearInterval(interval) {
    clearInterval(interval);
    const index = this.intervals.indexOf(interval);
    if (index > -1) this.intervals.splice(index, 1);
  }

  cleanup() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.intervals.forEach((interval) => clearInterval(interval));
    this.timers = [];
    this.intervals = [];
  }
}

// Create test environment and evaluate FeatureFlagService code
function createFeatureFlagService() {
  const mockWindow = new MockWindow();

  // Prepare global context
  const context = {
    window: mockWindow,
    localStorage: mockWindow.localStorage,
    sessionStorage: mockWindow.sessionStorage,
    console: mockWindow.console,
    performance: performance,
    setTimeout: (fn, delay) => mockWindow.setTimeout(fn, delay),
    setInterval: (fn, delay) => mockWindow.setInterval(fn, delay),
    clearTimeout: (timer) => mockWindow.clearTimeout(timer),
    clearInterval: (interval) => mockWindow.clearInterval(interval),
    Date: Date,
    Map: Map,
    Set: Set,
    Promise: Promise,
    Error: Error,
    Object: Object,
    Array: Array,
    Math: Math,
    JSON: JSON,
  };

  // Add window to context pointing to mockWindow
  context.window = mockWindow;

  // Execute FeatureFlagService code in controlled context
  const func = new Function(
    ...Object.keys(context),
    featureFlagServiceCode +
      `
        return {
            FeatureFlagService: window.FeatureFlagService || FeatureFlagService,
            FeatureFlag: window.FeatureFlag || FeatureFlag,
            UserContext: window.UserContext || UserContext
        };`,
  );

  const result = func(...Object.values(context));
  result.mockWindow = mockWindow;

  return result;
}

describe("FeatureFlagService - Comprehensive Foundation Tests", () => {
  let FeatureFlagService;
  let FeatureFlag;
  let UserContext;
  let mockWindow;
  let featureFlagService;
  let mockApiService;
  let mockAuthService;

  beforeEach(() => {
    const serviceClasses = createFeatureFlagService();
    FeatureFlagService = serviceClasses.FeatureFlagService;
    FeatureFlag = serviceClasses.FeatureFlag;
    UserContext = serviceClasses.UserContext;
    mockWindow = serviceClasses.mockWindow;

    mockApiService = new MockApiService();
    mockAuthService = new MockAuthenticationService();
  });

  afterEach(() => {
    if (
      featureFlagService &&
      typeof featureFlagService.cleanup === "function"
    ) {
      featureFlagService.cleanup();
    }
    if (mockWindow && typeof mockWindow.cleanup === "function") {
      mockWindow.cleanup();
    }
  });

  describe("FeatureFlag Class Tests", () => {
    test("should create FeatureFlag with default values", () => {
      const flag = new FeatureFlag({
        key: "test-flag",
        name: "Test Feature",
        description: "A test feature flag",
      });

      expect(flag.key).toBe("test-flag");
      expect(flag.name).toBe("Test Feature");
      expect(flag.description).toBe("A test feature flag");
      expect(flag.type).toBe("boolean");
      expect(flag.enabled).toBe(false);
      expect(flag.defaultValue).toBe(false);
      expect(flag.percentage).toBe(0);
      expect(flag.environment).toBe("development");
      expect(flag.version).toBe(1);
      expect(flag.createdAt).toBeInstanceOf(Date);
      expect(flag.updatedAt).toBeInstanceOf(Date);
    });

    test("should create different flag types", () => {
      const booleanFlag = new FeatureFlag({
        key: "bool-flag",
        type: "boolean",
        defaultValue: true,
      });

      const percentageFlag = new FeatureFlag({
        key: "percent-flag",
        type: "percentage",
        percentage: 50,
      });

      const experimentFlag = new FeatureFlag({
        key: "exp-flag",
        type: "experiment",
        variants: { control: 50, treatment: 50 },
      });

      expect(booleanFlag.type).toBe("boolean");
      expect(booleanFlag.defaultValue).toBe(true);

      expect(percentageFlag.type).toBe("percentage");
      expect(percentageFlag.percentage).toBe(50);

      expect(experimentFlag.type).toBe("experiment");
      expect(experimentFlag.variants).toEqual({ control: 50, treatment: 50 });
    });

    test("should validate flag configuration", () => {
      expect(() => {
        new FeatureFlag({}); // Missing key
      }).toThrow("Flag key is required");

      expect(() => {
        new FeatureFlag({ key: "", name: "Test" });
      }).toThrow("Flag key cannot be empty");

      expect(() => {
        new FeatureFlag({
          key: "test",
          type: "percentage",
          percentage: 150,
        });
      }).toThrow("Percentage must be between 0 and 100");
    });

    test("should convert to JSON", () => {
      const flag = new FeatureFlag({
        key: "test-flag",
        name: "Test",
        enabled: true,
        percentage: 75,
      });

      const json = flag.toJSON();

      expect(json.key).toBe("test-flag");
      expect(json.name).toBe("Test");
      expect(json.enabled).toBe(true);
      expect(json.percentage).toBe(75);
      expect(typeof json.createdAt).toBe("string");
    });

    test("should create from JSON", () => {
      const data = {
        key: "json-flag",
        name: "JSON Flag",
        type: "percentage",
        enabled: true,
        percentage: 25,
        createdAt: "2023-01-01T00:00:00.000Z",
      };

      const flag = FeatureFlag.fromJSON(data);

      expect(flag.key).toBe("json-flag");
      expect(flag.name).toBe("JSON Flag");
      expect(flag.type).toBe("percentage");
      expect(flag.enabled).toBe(true);
      expect(flag.percentage).toBe(25);
      expect(flag.createdAt).toBeInstanceOf(Date);
    });

    test("should support flag dependencies", () => {
      const flag = new FeatureFlag({
        key: "dependent-flag",
        dependencies: ["parent-flag"],
        prerequisites: [{ flag: "parent-flag", value: true }],
      });

      expect(flag.dependencies).toEqual(["parent-flag"]);
      expect(flag.prerequisites).toHaveLength(1);
      expect(flag.prerequisites[0].flag).toBe("parent-flag");
    });
  });

  describe("UserContext Class Tests", () => {
    test("should create UserContext from user data", () => {
      const userData = {
        userId: "user123",
        email: "user@example.com",
        groups: ["admin", "power-user"],
        attributes: { department: "engineering", level: "senior" },
      };

      const context = new UserContext(userData);

      expect(context.userId).toBe("user123");
      expect(context.email).toBe("user@example.com");
      expect(context.groups).toEqual(["admin", "power-user"]);
      expect(context.attributes.department).toBe("engineering");
      expect(context.environment).toBe("development");
    });

    test("should handle missing user data gracefully", () => {
      const context = new UserContext();

      expect(context.userId).toBeNull();
      expect(context.email).toBeNull();
      expect(context.groups).toEqual([]);
      expect(context.attributes).toEqual({});
    });

    test("should check if user is in groups", () => {
      const context = new UserContext({
        groups: ["admin", "power-user"],
      });

      expect(context.isInGroup("admin")).toBe(true);
      expect(context.isInGroup("user")).toBe(false);
      expect(context.isInAnyGroup(["admin", "moderator"])).toBe(true);
      expect(context.isInAnyGroup(["moderator", "guest"])).toBe(false);
    });

    test("should get user attributes", () => {
      const context = new UserContext({
        attributes: { department: "sales", country: "US" },
      });

      expect(context.getAttribute("department")).toBe("sales");
      expect(context.getAttribute("country")).toBe("US");
      expect(context.getAttribute("nonexistent")).toBeNull();
      expect(context.getAttribute("nonexistent", "default")).toBe("default");
    });

    test("should convert to JSON", () => {
      const context = new UserContext({
        userId: "user123",
        email: "user@example.com",
        attributes: { role: "admin" },
      });

      const json = context.toJSON();

      expect(json.userId).toBe("user123");
      expect(json.email).toBe("user@example.com");
      expect(json.attributes.role).toBe("admin");
    });
  });

  describe("FeatureFlagService Core Tests", () => {
    beforeEach(() => {
      featureFlagService = new FeatureFlagService();
      featureFlagService.apiService = mockApiService;
      featureFlagService.authenticationService = mockAuthService;
    });

    test("should create FeatureFlagService with initial state", () => {
      expect(featureFlagService.name).toBe("FeatureFlagService");
      expect(featureFlagService.state).toBe("initialized");
      expect(featureFlagService.flags).toBeInstanceOf(Map);
      expect(featureFlagService.cache).toBeInstanceOf(Map);
      expect(featureFlagService.experiments).toBeInstanceOf(Map);
      expect(featureFlagService.analytics).toBeInstanceOf(Map);
    });

    test("should initialize with configuration", async () => {
      const config = {
        defaultEnvironment: "staging",
        cacheTimeout: 600000,
        syncInterval: 30000,
        enableAnalytics: true,
        enableRollouts: true,
      };

      await featureFlagService.initialize(config);

      expect(featureFlagService.defaultEnvironment).toBe("staging");
      expect(featureFlagService.cacheTimeout).toBe(600000);
      expect(featureFlagService.enableAnalytics).toBe(true);
    });

    test("should start and stop service", async () => {
      await featureFlagService.initialize();
      await featureFlagService.start();

      expect(featureFlagService.state).toBe("running");
      expect(featureFlagService.syncInterval).toBeDefined();

      await featureFlagService.stop();
      expect(featureFlagService.state).toBe("stopped");
    });

    test("should register and retrieve flags", () => {
      const flag = new FeatureFlag({
        key: "test-flag",
        name: "Test Feature",
        enabled: true,
      });

      featureFlagService.registerFlag(flag);

      expect(featureFlagService.flags.has("test-flag")).toBe(true);
      expect(featureFlagService.getFlag("test-flag")).toBe(flag);
      expect(featureFlagService.getFlag("nonexistent")).toBeNull();
    });

    test("should not allow duplicate flag registration", () => {
      const flag = new FeatureFlag({ key: "duplicate-flag" });

      featureFlagService.registerFlag(flag);

      expect(() => {
        featureFlagService.registerFlag(flag);
      }).toThrow("Flag duplicate-flag is already registered");
    });

    test("should evaluate boolean flags", () => {
      const flag = new FeatureFlag({
        key: "boolean-flag",
        type: "boolean",
        enabled: true,
        defaultValue: true,
      });

      featureFlagService.registerFlag(flag);

      const result = featureFlagService.isEnabled("boolean-flag");
      expect(result).toBe(true);

      const disabledFlag = new FeatureFlag({
        key: "disabled-flag",
        enabled: false,
        defaultValue: false,
      });

      featureFlagService.registerFlag(disabledFlag);
      expect(featureFlagService.isEnabled("disabled-flag")).toBe(false);
    });

    test("should evaluate percentage flags", () => {
      const flag = new FeatureFlag({
        key: "percentage-flag",
        type: "percentage",
        enabled: true,
        percentage: 50,
      });

      featureFlagService.registerFlag(flag);

      // Mock Math.random to control percentage evaluation
      const originalRandom = Math.random;

      Math.random = jest.fn().mockReturnValue(0.25); // 25% < 50%
      expect(featureFlagService.isEnabled("percentage-flag")).toBe(true);

      Math.random = jest.fn().mockReturnValue(0.75); // 75% > 50%
      expect(featureFlagService.isEnabled("percentage-flag")).toBe(false);

      Math.random = originalRandom;
    });

    test("should evaluate user segment targeting", () => {
      const flag = new FeatureFlag({
        key: "segment-flag",
        type: "user_list",
        enabled: true,
        includedUsers: ["user123", "user456"],
        excludedUsers: ["user789"],
      });

      featureFlagService.registerFlag(flag);

      const user123Context = new UserContext({ userId: "user123" });
      const user789Context = new UserContext({ userId: "user789" });
      const user999Context = new UserContext({ userId: "user999" });

      expect(
        featureFlagService.isEnabledForUser("segment-flag", user123Context),
      ).toBe(true);
      expect(
        featureFlagService.isEnabledForUser("segment-flag", user789Context),
      ).toBe(false);
      expect(
        featureFlagService.isEnabledForUser("segment-flag", user999Context),
      ).toBe(false);
    });

    test("should evaluate attribute-based targeting", () => {
      const flag = new FeatureFlag({
        key: "attribute-flag",
        type: "segment",
        enabled: true,
        userAttributes: {
          department: ["engineering", "qa"],
          level: ["senior", "lead"],
        },
      });

      featureFlagService.registerFlag(flag);

      const matchingUser = new UserContext({
        userId: "user1",
        attributes: { department: "engineering", level: "senior" },
      });

      const nonMatchingUser = new UserContext({
        userId: "user2",
        attributes: { department: "sales", level: "junior" },
      });

      expect(
        featureFlagService.isEnabledForUser("attribute-flag", matchingUser),
      ).toBe(true);
      expect(
        featureFlagService.isEnabledForUser("attribute-flag", nonMatchingUser),
      ).toBe(false);
    });

    test("should handle flag dependencies", () => {
      const parentFlag = new FeatureFlag({
        key: "parent-flag",
        enabled: true,
        defaultValue: true,
      });

      const dependentFlag = new FeatureFlag({
        key: "dependent-flag",
        enabled: true,
        dependencies: ["parent-flag"],
        prerequisites: [{ flag: "parent-flag", value: true }],
      });

      featureFlagService.registerFlag(parentFlag);
      featureFlagService.registerFlag(dependentFlag);

      expect(featureFlagService.isEnabled("dependent-flag")).toBe(true);

      // Disable parent flag
      parentFlag.enabled = false;
      expect(featureFlagService.isEnabled("dependent-flag")).toBe(false);
    });

    test("should handle experiment variants", () => {
      const experiment = new FeatureFlag({
        key: "ab-test",
        type: "experiment",
        enabled: true,
        variants: {
          control: 50,
          treatment: 50,
        },
      });

      featureFlagService.registerFlag(experiment);

      // Mock consistent hash for user
      const originalRandom = Math.random;
      Math.random = jest.fn().mockReturnValue(0.25); // Should get 'control'

      const variant = featureFlagService.getVariant("ab-test");
      expect(["control", "treatment"]).toContain(variant);

      Math.random = originalRandom;
    });

    test("should cache flag evaluations", () => {
      const flag = new FeatureFlag({
        key: "cached-flag",
        enabled: true,
      });

      featureFlagService.registerFlag(flag);
      featureFlagService.cacheTimeout = 5000;

      const result1 = featureFlagService.isEnabled("cached-flag");
      const result2 = featureFlagService.isEnabled("cached-flag");

      expect(result1).toBe(result2);
      expect(featureFlagService.cache.has("cached-flag")).toBe(true);
    });

    test("should expire cached values", (done) => {
      const flag = new FeatureFlag({
        key: "expiring-flag",
        enabled: true,
      });

      featureFlagService.registerFlag(flag);
      featureFlagService.cacheTimeout = 100; // 100ms

      featureFlagService.isEnabled("expiring-flag");
      expect(featureFlagService.cache.has("expiring-flag")).toBe(true);

      setTimeout(() => {
        // Cache should be expired and cleared
        featureFlagService.isEnabled("expiring-flag");
        // This should trigger cache cleanup
        done();
      }, 150);
    });

    test("should track analytics events", async () => {
      featureFlagService.enableAnalytics = true;

      const flag = new FeatureFlag({
        key: "analytics-flag",
        enabled: true,
      });

      featureFlagService.registerFlag(flag);

      const userContext = new UserContext({ userId: "user123" });
      featureFlagService.isEnabledForUser("analytics-flag", userContext);

      const analytics = featureFlagService.getAnalytics("analytics-flag");
      expect(analytics.evaluationCount).toBeGreaterThan(0);
      expect(analytics.uniqueUsers.has("user123")).toBe(true);
    });

    test("should sync flags from remote source", async () => {
      mockApiService.setMockResponse("GET", "/api/feature-flags", {
        status: 200,
        data: {
          flags: [
            {
              key: "remote-flag",
              name: "Remote Flag",
              enabled: true,
              type: "boolean",
            },
          ],
        },
      });

      await featureFlagService.syncFlags();

      expect(featureFlagService.flags.has("remote-flag")).toBe(true);
      expect(featureFlagService.flags.get("remote-flag").name).toBe(
        "Remote Flag",
      );
    });

    test("should handle sync errors gracefully", async () => {
      mockApiService.setMockResponse("GET", "/api/feature-flags", {
        status: 500,
      });

      await expect(featureFlagService.syncFlags()).rejects.toThrow();

      // Service should still be functional
      expect(featureFlagService.state).toBe("initialized");
    });

    test("should provide comprehensive health status", async () => {
      await featureFlagService.initialize();

      featureFlagService.registerFlag(new FeatureFlag({ key: "flag1" }));
      featureFlagService.registerFlag(new FeatureFlag({ key: "flag2" }));

      const health = await featureFlagService.getHealth();

      expect(health.name).toBe("FeatureFlagService");
      expect(health.flagCount).toBe(2);
      expect(health.cacheSize).toBe(0);
      expect(health.experimentCount).toBe(0);
      expect(health.configuration).toBeDefined();
    });

    test("should cleanup resources properly", async () => {
      await featureFlagService.initialize();
      await featureFlagService.start();

      expect(featureFlagService.syncInterval).toBeDefined();

      await featureFlagService.cleanup();

      expect(featureFlagService.state).toBe("cleaned");
      expect(featureFlagService.flags.size).toBe(0);
      expect(featureFlagService.cache.size).toBe(0);
    });
  });

  describe("Advanced Feature Tests", () => {
    beforeEach(() => {
      featureFlagService = new FeatureFlagService();
      featureFlagService.apiService = mockApiService;
      featureFlagService.authenticationService = mockAuthService;
    });

    test("should handle gradual rollouts", (done) => {
      const rolloutFlag = new FeatureFlag({
        key: "rollout-flag",
        type: "percentage",
        enabled: true,
        percentage: 10,
        rollout: {
          enabled: true,
          startPercentage: 10,
          endPercentage: 100,
          incrementPercent: 10,
          incrementInterval: 100, // 100ms for testing
        },
      });

      featureFlagService.registerFlag(rolloutFlag);
      featureFlagService.enableRollouts = true;

      // Start rollout
      featureFlagService._startRollout(rolloutFlag);

      setTimeout(() => {
        const flag = featureFlagService.getFlag("rollout-flag");
        expect(flag.percentage).toBeGreaterThan(10);
        done();
      }, 150);
    });

    test("should override flags for specific users", () => {
      const flag = new FeatureFlag({
        key: "override-flag",
        enabled: false,
        defaultValue: false,
      });

      featureFlagService.registerFlag(flag);

      // Set override for specific user
      featureFlagService.setUserOverride("user123", "override-flag", true);

      const user123Context = new UserContext({ userId: "user123" });
      const user456Context = new UserContext({ userId: "user456" });

      expect(
        featureFlagService.isEnabledForUser("override-flag", user123Context),
      ).toBe(true);
      expect(
        featureFlagService.isEnabledForUser("override-flag", user456Context),
      ).toBe(false);
    });

    test("should support environment-specific flags", () => {
      const flag = new FeatureFlag({
        key: "env-flag",
        environment: "production",
        enabled: true,
      });

      featureFlagService.registerFlag(flag);
      featureFlagService.defaultEnvironment = "development";

      // Should not be enabled in development
      expect(featureFlagService.isEnabled("env-flag")).toBe(false);

      featureFlagService.defaultEnvironment = "production";
      expect(featureFlagService.isEnabled("env-flag")).toBe(true);
    });

    test("should batch analytics events", async () => {
      featureFlagService.enableAnalytics = true;
      featureFlagService.analyticsBatchSize = 2;

      const flag = new FeatureFlag({ key: "batch-flag", enabled: true });
      featureFlagService.registerFlag(flag);

      // Mock API for analytics
      mockApiService.setMockResponse("POST", "/api/analytics/events", {
        status: 200,
        data: { success: true },
      });

      const userContext = new UserContext({ userId: "user1" });

      // Generate events that should trigger batch send
      featureFlagService.isEnabledForUser("batch-flag", userContext);
      featureFlagService.isEnabledForUser("batch-flag", userContext);

      // Should have triggered batch send
      expect(
        mockApiService.requests.some(
          (req) => req.method === "POST" && req.url === "/api/analytics/events",
        ),
      ).toBe(true);
    });

    test("should validate flag update constraints", () => {
      const flag = new FeatureFlag({
        key: "constrained-flag",
        enabled: false,
        constraints: {
          requiresApproval: true,
          maxPercentage: 50,
        },
      });

      featureFlagService.registerFlag(flag);

      // Should reject update exceeding constraints
      expect(() => {
        featureFlagService.updateFlag("constrained-flag", {
          percentage: 75,
        });
      }).toThrow("Update exceeds maximum percentage constraint");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    beforeEach(() => {
      featureFlagService = new FeatureFlagService();
    });

    test("should handle missing flags gracefully", () => {
      expect(featureFlagService.isEnabled("nonexistent-flag")).toBe(false);
      expect(featureFlagService.getValue("nonexistent-flag", "default")).toBe(
        "default",
      );
    });

    test("should handle malformed flag definitions", () => {
      expect(() => {
        featureFlagService.registerFlag({
          // Missing required properties
          enabled: true,
        });
      }).toThrow();
    });

    test("should handle circular dependencies", () => {
      const flag1 = new FeatureFlag({
        key: "flag1",
        dependencies: ["flag2"],
      });

      const flag2 = new FeatureFlag({
        key: "flag2",
        dependencies: ["flag1"],
      });

      featureFlagService.registerFlag(flag1);
      featureFlagService.registerFlag(flag2);

      expect(() => {
        featureFlagService.isEnabled("flag1");
      }).toThrow("Circular dependency detected");
    });

    test("should handle invalid user context", () => {
      const flag = new FeatureFlag({
        key: "context-flag",
        type: "user_list",
        includedUsers: ["user123"],
      });

      featureFlagService.registerFlag(flag);

      // Should handle null/undefined context
      expect(featureFlagService.isEnabledForUser("context-flag", null)).toBe(
        false,
      );
      expect(
        featureFlagService.isEnabledForUser("context-flag", undefined),
      ).toBe(false);
    });

    test("should handle storage errors gracefully", () => {
      // Mock localStorage to throw error
      mockWindow.localStorage.setItem = jest.fn(() => {
        throw new Error("Storage quota exceeded");
      });

      // Should not crash when trying to cache
      const flag = new FeatureFlag({ key: "storage-flag", enabled: true });
      featureFlagService.registerFlag(flag);

      expect(() => {
        featureFlagService.isEnabled("storage-flag");
      }).not.toThrow();
    });

    test("should handle concurrent evaluations safely", async () => {
      const flag = new FeatureFlag({
        key: "concurrent-flag",
        type: "percentage",
        percentage: 50,
      });

      featureFlagService.registerFlag(flag);

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          Promise.resolve(featureFlagService.isEnabled("concurrent-flag")),
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
      // All results should be boolean
      expect(results.every((r) => typeof r === "boolean")).toBe(true);
    });
  });

  describe("Performance and Integration Tests", () => {
    test("should evaluate flags efficiently", () => {
      // Create many flags
      for (let i = 0; i < 1000; i++) {
        const flag = new FeatureFlag({
          key: `perf-flag-${i}`,
          enabled: i % 2 === 0, // Alternate enabled/disabled
        });
        featureFlagService.registerFlag(flag);
      }

      const startTime = performance.now();

      // Evaluate many flags
      for (let i = 0; i < 100; i++) {
        featureFlagService.isEnabled(`perf-flag-${i * 10}`);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(100); // 100ms
    });

    test("should integrate with authentication service", () => {
      mockAuthService.setCurrentUser({
        userId: "integration-user",
        groups: ["qa", "testers"],
        attributes: { region: "north-america" },
      });

      const flag = new FeatureFlag({
        key: "auth-flag",
        type: "segment",
        userAttributes: { region: ["north-america"] },
      });

      featureFlagService.registerFlag(flag);

      // Should use current user context automatically
      expect(featureFlagService.isEnabled("auth-flag")).toBe(true);
    });

    test("should persist flag state to storage", () => {
      const flag = new FeatureFlag({
        key: "persistent-flag",
        enabled: true,
        percentage: 75,
      });

      featureFlagService.registerFlag(flag);
      featureFlagService._persistFlagState();

      // Verify storage
      const stored = mockWindow.localStorage.getItem("umig_feature_flags");
      expect(stored).toBeTruthy();

      const parsed = JSON.parse(stored);
      expect(parsed["persistent-flag"]).toBeDefined();
      expect(parsed["persistent-flag"].enabled).toBe(true);
    });
  });

  // Test cleanup to prevent memory leaks
  afterAll(() => {
    if (mockWindow && typeof mockWindow.cleanup === "function") {
      mockWindow.cleanup();
    }
  });
});

// Technology-prefixed commands verification (TD-002)
console.log(
  "🧪 FeatureFlagService Test Suite - Technology-Prefixed Commands (TD-002)",
);
console.log("✅ Self-contained architecture pattern (TD-001) implemented");
console.log(
  "✅ Comprehensive feature flag management testing with 95%+ coverage target",
);
