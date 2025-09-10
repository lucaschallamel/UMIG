/**
 * FeatureFlagService.test.js - Comprehensive Test Suite (Simplified Jest Pattern)
 *
 * US-082-A Phase 1: Foundation Service Layer Feature Flag Testing
 * Following TD-002 simplified Jest pattern - NO self-contained architecture
 * - Standard Jest module loading
 * - Proper CommonJS imports
 * - 95%+ coverage target
 *
 * Features Tested:
 * - Boolean, percentage, and experiment-based feature flags
 * - User context evaluation and targeting
 * - Flag dependencies and constraints
 * - Analytics tracking and event capture
 * - Remote sync and configuration management
 * - Performance testing and caching
 * - Error handling and edge cases
 * - Integration with other services
 *
 * @version 2.0.0 - Simplified Jest Pattern
 * @author GENDEV Test Suite Generator
 * @since Sprint 6
 */

// Setup globals BEFORE requiring modules
global.window = global.window || {};
global.performance = global.performance || { now: () => Date.now() };
global.localStorage = global.localStorage || {
  store: {},
  getItem: function(key) {
    return this.store[key] || null;
  },
  setItem: function(key, value) {
    this.store[key] = String(value);
  },
  removeItem: function(key) {
    delete this.store[key];
  },
  clear: function() {
    this.store = {};
  }
};

// Standard CommonJS require - NO vm.runInContext
const { FeatureFlagService, FeatureFlag, UserContext } = require("../../../../src/groovy/umig/web/js/services/FeatureFlagService.js");

// Mock Logger for testing
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

// Mock AuthService for user context
class MockAuthService {
  constructor() {
    this.currentUser = {
      userId: "testuser123",
      email: "test@example.com",
      displayName: "Test User",
      groups: ["pilot", "beta-testers"],
      attributes: {
        department: "engineering",
        location: "us-west",
        tier: "premium"
      }
    };
  }

  getCurrentUser() {
    return this.currentUser;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  getUserGroups(userId) {
    return this.currentUser.groups || [];
  }
}

// Mock Analytics Service
class MockAnalyticsService {
  constructor() {
    this.events = [];
    this.batchEvents = [];
  }

  track(event, properties) {
    this.events.push({ event, properties, timestamp: Date.now() });
  }

  trackBatch(events) {
    this.batchEvents.push(...events);
  }

  getEvents() {
    return this.events;
  }

  getBatchEvents() {
    return this.batchEvents;
  }

  clear() {
    this.events = [];
    this.batchEvents = [];
  }
}

// Mock Remote API for flag sync
class MockRemoteApi {
  constructor() {
    this.flags = new Map();
    this.shouldError = false;
  }

  async fetchFlags() {
    if (this.shouldError) {
      throw new Error("Remote API error");
    }

    return Array.from(this.flags.values());
  }

  setFlags(flags) {
    this.flags.clear();
    flags.forEach(flag => this.flags.set(flag.key, flag));
  }

  setShouldError(shouldError) {
    this.shouldError = shouldError;
  }
}

describe("FeatureFlagService - Comprehensive Foundation Tests", () => {
  let featureFlagService;
  let mockLogger;
  let mockAuthService;
  let mockAnalyticsService;
  let mockRemoteApi;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockAuthService = new MockAuthService();
    mockAnalyticsService = new MockAnalyticsService();
    mockRemoteApi = new MockRemoteApi();

    // Clear localStorage
    global.localStorage.clear();

    // Create fresh feature flag service instance
    featureFlagService = new FeatureFlagService({
      logger: mockLogger,
      authService: mockAuthService,
      analyticsService: mockAnalyticsService,
      remoteApi: mockRemoteApi,
      cacheTimeout: 1000, // 1 second for tests
      enableAnalytics: true,
      enableRemoteSync: true,
    });
  });

  afterEach(async () => {
    if (featureFlagService && featureFlagService.running) {
      await featureFlagService.stop();
    }
    if (featureFlagService && featureFlagService.initialized) {
      await featureFlagService.cleanup();
    }
  });

  describe("FeatureFlag Class Tests", () => {
    test("should create FeatureFlag with default values", () => {
      const flag = new FeatureFlag({
        key: "test-flag",
        name: "Test Flag",
        description: "A test feature flag",
        type: "boolean",
      });

      expect(flag.key).toBe("test-flag");
      expect(flag.name).toBe("Test Flag");
      expect(flag.description).toBe("A test feature flag");
      expect(flag.type).toBe("boolean");
      expect(flag.enabled).toBe(false);
      expect(flag.targeting).toEqual({});
      expect(flag.variants).toEqual([]);
      expect(flag.dependencies).toEqual([]);
      expect(flag.createdAt).toBeInstanceOf(Date);
    });

    test("should create different flag types", () => {
      const booleanFlag = new FeatureFlag({ key: "bool", type: "boolean", enabled: true });
      const percentageFlag = new FeatureFlag({ key: "pct", type: "percentage", percentage: 50 });
      const experimentFlag = new FeatureFlag({ 
        key: "exp", 
        type: "experiment", 
        variants: [
          { key: "control", weight: 50 },
          { key: "treatment", weight: 50 }
        ]
      });

      expect(booleanFlag.type).toBe("boolean");
      expect(booleanFlag.enabled).toBe(true);

      expect(percentageFlag.type).toBe("percentage");
      expect(percentageFlag.percentage).toBe(50);

      expect(experimentFlag.type).toBe("experiment");
      expect(experimentFlag.variants).toHaveLength(2);
      expect(experimentFlag.variants[0].key).toBe("control");
      expect(experimentFlag.variants[1].key).toBe("treatment");
    });

    test("should validate flag configuration", () => {
      expect(() => new FeatureFlag({})).toThrow("Flag key is required");
      expect(() => new FeatureFlag({ key: "" })).toThrow("Flag key is required");
      expect(() => new FeatureFlag({ key: "test", type: "invalid" })).toThrow("Invalid flag type");

      expect(() => new FeatureFlag({
        key: "test",
        type: "percentage",
        percentage: 150
      })).toThrow("Percentage must be between 0 and 100");
    });

    test("should convert to JSON", () => {
      const flag = new FeatureFlag({
        key: "test-flag",
        name: "Test Flag",
        type: "boolean",
        enabled: true,
      });

      const json = flag.toJSON();

      expect(json.key).toBe("test-flag");
      expect(json.name).toBe("Test Flag");
      expect(json.type).toBe("boolean");
      expect(json.enabled).toBe(true);
      expect(json.createdAt).toBeDefined();
    });

    test("should create from JSON", () => {
      const json = {
        key: "test-flag",
        name: "Test Flag",
        type: "percentage",
        percentage: 25,
        targeting: {
          groups: ["beta-testers"],
          attributes: { department: "engineering" }
        }
      };

      const flag = FeatureFlag.fromJSON(json);

      expect(flag.key).toBe("test-flag");
      expect(flag.name).toBe("Test Flag");
      expect(flag.type).toBe("percentage");
      expect(flag.percentage).toBe(25);
      expect(flag.targeting.groups).toEqual(["beta-testers"]);
      expect(flag.targeting.attributes.department).toBe("engineering");
    });

    test("should support flag dependencies", () => {
      const parentFlag = new FeatureFlag({ key: "parent", type: "boolean", enabled: true });
      const childFlag = new FeatureFlag({
        key: "child",
        type: "boolean",
        enabled: true,
        dependencies: ["parent"]
      });

      expect(childFlag.dependencies).toEqual(["parent"]);
      expect(childFlag.hasDependencies()).toBe(true);
      expect(parentFlag.hasDependencies()).toBe(false);
    });
  });

  describe("UserContext Class Tests", () => {
    test("should create UserContext from user data", () => {
      const userData = {
        userId: "user123",
        groups: ["admin", "beta"],
        attributes: {
          department: "engineering",
          location: "us-west"
        }
      };

      const context = new UserContext(userData);

      expect(context.userId).toBe("user123");
      expect(context.groups).toEqual(["admin", "beta"]);
      expect(context.attributes.department).toBe("engineering");
      expect(context.attributes.location).toBe("us-west");
    });

    test("should handle missing user data gracefully", () => {
      const context = new UserContext(null);

      expect(context.userId).toBe("anonymous");
      expect(context.groups).toEqual([]);
      expect(context.attributes).toEqual({});
    });

    test("should check if user is in groups", () => {
      const context = new UserContext({
        userId: "user123",
        groups: ["admin", "beta", "qa"]
      });

      expect(context.isInGroup("admin")).toBe(true);
      expect(context.isInGroup("beta")).toBe(true);
      expect(context.isInGroup("nonexistent")).toBe(false);
      expect(context.isInAnyGroup(["admin", "nonexistent"])).toBe(true);
      expect(context.isInAnyGroup(["nonexistent", "also-missing"])).toBe(false);
    });

    test("should get user attributes", () => {
      const context = new UserContext({
        userId: "user123",
        attributes: {
          department: "engineering",
          tier: "premium"
        }
      });

      expect(context.getAttribute("department")).toBe("engineering");
      expect(context.getAttribute("tier")).toBe("premium");
      expect(context.getAttribute("nonexistent")).toBeUndefined();
    });

    test("should convert to JSON", () => {
      const context = new UserContext({
        userId: "user123",
        groups: ["admin"],
        attributes: { department: "engineering" }
      });

      const json = context.toJSON();

      expect(json.userId).toBe("user123");
      expect(json.groups).toEqual(["admin"]);
      expect(json.attributes.department).toBe("engineering");
      expect(json.timestamp).toBeDefined();
    });
  });

  describe("FeatureFlagService Core Tests", () => {
    beforeEach(async () => {
      await featureFlagService.initialize();
    });

    test("should create FeatureFlagService with initial state", () => {
      expect(featureFlagService).toBeDefined();
      expect(featureFlagService.name).toBe("FeatureFlagService");
      expect(featureFlagService.initialized).toBe(false);
      expect(featureFlagService.running).toBe(false);
      expect(featureFlagService.flags).toBeInstanceOf(Map);
    });

    test("should initialize with configuration", async () => {
      expect(featureFlagService.initialized).toBe(true);
      expect(featureFlagService.config).toBeDefined();
      expect(featureFlagService.config.cacheTimeout).toBe(1000);
      expect(featureFlagService.config.enableAnalytics).toBe(true);
      expect(featureFlagService.config.enableRemoteSync).toBe(true);
    });

    test("should register and retrieve flags", () => {
      const flag = new FeatureFlag({
        key: "test-flag",
        type: "boolean",
        enabled: true
      });

      featureFlagService.registerFlag(flag);

      expect(featureFlagService.flags.has("test-flag")).toBe(true);
      expect(featureFlagService.getFlag("test-flag")).toBe(flag);
    });

    test("should not allow duplicate flag registration", () => {
      const flag1 = new FeatureFlag({ key: "duplicate", type: "boolean" });
      const flag2 = new FeatureFlag({ key: "duplicate", type: "boolean" });

      featureFlagService.registerFlag(flag1);
      
      expect(() => featureFlagService.registerFlag(flag2)).toThrow("Flag duplicate is already registered");
    });

    test("should evaluate boolean flags", () => {
      const enabledFlag = new FeatureFlag({ key: "enabled", type: "boolean", enabled: true });
      const disabledFlag = new FeatureFlag({ key: "disabled", type: "boolean", enabled: false });

      featureFlagService.registerFlag(enabledFlag);
      featureFlagService.registerFlag(disabledFlag);

      const userContext = new UserContext(mockAuthService.getCurrentUser());

      expect(featureFlagService.isEnabled("enabled", userContext)).toBe(true);
      expect(featureFlagService.isEnabled("disabled", userContext)).toBe(false);
    });

    test("should evaluate percentage flags", () => {
      const flag = new FeatureFlag({
        key: "percentage-flag",
        type: "percentage",
        percentage: 50 // 50% rollout
      });

      featureFlagService.registerFlag(flag);

      // Test multiple users to verify percentage distribution
      let enabledCount = 0;
      for (let i = 0; i < 100; i++) {
        const userContext = new UserContext({ userId: `user${i}` });
        if (featureFlagService.isEnabled("percentage-flag", userContext)) {
          enabledCount++;
        }
      }

      // Should be approximately 50% (allow some variance)
      expect(enabledCount).toBeGreaterThan(30);
      expect(enabledCount).toBeLessThan(70);
    });

    test("should evaluate user segment targeting", () => {
      const flag = new FeatureFlag({
        key: "group-flag",
        type: "boolean",
        enabled: false, // Disabled by default
        targeting: {
          groups: ["beta-testers", "qa"],
          enabled: true // Enabled for specific groups
        }
      });

      featureFlagService.registerFlag(flag);

      const betaUser = new UserContext({ userId: "beta-user", groups: ["beta-testers"] });
      const qaUser = new UserContext({ userId: "qa-user", groups: ["qa"] });
      const regularUser = new UserContext({ userId: "regular-user", groups: ["users"] });

      expect(featureFlagService.isEnabled("group-flag", betaUser)).toBe(true);
      expect(featureFlagService.isEnabled("group-flag", qaUser)).toBe(true);
      expect(featureFlagService.isEnabled("group-flag", regularUser)).toBe(false);
    });

    test("should evaluate attribute-based targeting", () => {
      const flag = new FeatureFlag({
        key: "attribute-flag",
        type: "boolean",
        enabled: false,
        targeting: {
          attributes: {
            department: "engineering",
            tier: "premium"
          },
          enabled: true
        }
      });

      featureFlagService.registerFlag(flag);

      const engineerUser = new UserContext({
        userId: "engineer",
        attributes: { department: "engineering", tier: "premium" }
      });

      const salesUser = new UserContext({
        userId: "sales",
        attributes: { department: "sales", tier: "basic" }
      });

      const partialMatchUser = new UserContext({
        userId: "partial",
        attributes: { department: "engineering", tier: "basic" }
      });

      expect(featureFlagService.isEnabled("attribute-flag", engineerUser)).toBe(true);
      expect(featureFlagService.isEnabled("attribute-flag", salesUser)).toBe(false);
      expect(featureFlagService.isEnabled("attribute-flag", partialMatchUser)).toBe(false);
    });

    test("should handle flag dependencies", () => {
      const parentFlag = new FeatureFlag({ key: "parent", type: "boolean", enabled: true });
      const childFlag = new FeatureFlag({
        key: "child",
        type: "boolean",
        enabled: true,
        dependencies: ["parent"]
      });

      featureFlagService.registerFlag(parentFlag);
      featureFlagService.registerFlag(childFlag);

      const userContext = new UserContext(mockAuthService.getCurrentUser());

      // Child should be enabled when parent is enabled
      expect(featureFlagService.isEnabled("child", userContext)).toBe(true);

      // Disable parent
      parentFlag.enabled = false;

      // Child should now be disabled due to dependency
      expect(featureFlagService.isEnabled("child", userContext)).toBe(false);
    });

    test("should handle experiment variants", () => {
      const experimentFlag = new FeatureFlag({
        key: "ab-test",
        type: "experiment",
        variants: [
          { key: "control", weight: 50, config: { buttonColor: "blue" } },
          { key: "treatment", weight: 50, config: { buttonColor: "red" } }
        ]
      });

      featureFlagService.registerFlag(experimentFlag);

      const userContext = new UserContext({ userId: "test-user" });
      const variant = featureFlagService.getVariant("ab-test", userContext);

      expect(variant).toBeDefined();
      expect(["control", "treatment"]).toContain(variant.key);
      expect(variant.config).toBeDefined();
    });

    test("should cache flag evaluations", () => {
      const flag = new FeatureFlag({ key: "cached-flag", type: "boolean", enabled: true });
      featureFlagService.registerFlag(flag);

      const userContext = new UserContext({ userId: "cache-user" });

      // First evaluation
      const result1 = featureFlagService.isEnabled("cached-flag", userContext);
      
      // Second evaluation should use cache
      const result2 = featureFlagService.isEnabled("cached-flag", userContext);

      expect(result1).toBe(result2);
      expect(result1).toBe(true);

      // Verify cache was used (check internal cache state)
      expect(featureFlagService.evaluationCache.size).toBeGreaterThan(0);
    });

    test("should expire cached values", (done) => {
      const flag = new FeatureFlag({ key: "expiring-flag", type: "boolean", enabled: true });
      featureFlagService.registerFlag(flag);

      const userContext = new UserContext({ userId: "expire-user" });

      // First evaluation
      featureFlagService.isEnabled("expiring-flag", userContext);
      expect(featureFlagService.evaluationCache.size).toBeGreaterThan(0);

      // Wait for cache to expire
      setTimeout(() => {
        expect(featureFlagService.evaluationCache.size).toBe(0);
        done();
      }, 1100); // Wait longer than cache timeout (1000ms)
    });

    test("should track analytics events", async () => {
      const flag = new FeatureFlag({ key: "analytics-flag", type: "boolean", enabled: true });
      featureFlagService.registerFlag(flag);

      const userContext = new UserContext({ userId: "analytics-user" });

      // Enable analytics tracking
      await featureFlagService.start();

      featureFlagService.isEnabled("analytics-flag", userContext);

      const events = mockAnalyticsService.getEvents();
      const flagEvent = events.find(e => e.event === "feature_flag_evaluated");

      expect(flagEvent).toBeDefined();
      expect(flagEvent.properties.flagKey).toBe("analytics-flag");
      expect(flagEvent.properties.userId).toBe("analytics-user");
      expect(flagEvent.properties.result).toBe(true);
    });

    test("should sync flags from remote source", async () => {
      const remoteFlags = [
        { key: "remote-flag-1", type: "boolean", enabled: true },
        { key: "remote-flag-2", type: "percentage", percentage: 25 }
      ];

      mockRemoteApi.setFlags(remoteFlags);

      await featureFlagService.syncFromRemote();

      expect(featureFlagService.flags.has("remote-flag-1")).toBe(true);
      expect(featureFlagService.flags.has("remote-flag-2")).toBe(true);

      const flag1 = featureFlagService.getFlag("remote-flag-1");
      const flag2 = featureFlagService.getFlag("remote-flag-2");

      expect(flag1.enabled).toBe(true);
      expect(flag2.percentage).toBe(25);
    });

    test("should handle sync errors gracefully", async () => {
      mockRemoteApi.setShouldError(true);

      // Should not throw
      await expect(featureFlagService.syncFromRemote()).resolves.not.toThrow();

      // Should log error
      expect(mockLogger.logs.some(log => log[0] === "ERROR")).toBe(true);
    });

    test("should provide comprehensive health status", async () => {
      await featureFlagService.start();

      // Add some flags
      featureFlagService.registerFlag(new FeatureFlag({ key: "health-flag-1", type: "boolean" }));
      featureFlagService.registerFlag(new FeatureFlag({ key: "health-flag-2", type: "percentage" }));

      const health = featureFlagService.getHealth();

      expect(health.status).toBe("healthy");
      expect(health.initialized).toBe(true);
      expect(health.running).toBe(true);
      expect(health.metrics).toBeDefined();
      expect(health.metrics.totalFlags).toBe(2);
      expect(health.metrics.evaluationCount).toBeGreaterThanOrEqual(0);
      expect(health.cacheSize).toBeDefined();
    });

    test("should cleanup resources properly", async () => {
      await featureFlagService.start();

      // Add some data
      featureFlagService.registerFlag(new FeatureFlag({ key: "cleanup-flag", type: "boolean" }));

      await featureFlagService.cleanup();

      expect(featureFlagService.initialized).toBe(false);
      expect(featureFlagService.running).toBe(false);
      expect(featureFlagService.flags.size).toBe(0);
      expect(featureFlagService.evaluationCache.size).toBe(0);
    });
  });

  describe("Advanced Feature Tests", () => {
    beforeEach(async () => {
      await featureFlagService.initialize();
      await featureFlagService.start();
    });

    test("should handle gradual rollouts", (done) => {
      const flag = new FeatureFlag({
        key: "gradual-rollout",
        type: "percentage",
        percentage: 10, // Start at 10%
        rollout: {
          enabled: true,
          targetPercentage: 50,
          incrementPercentage: 10,
          incrementInterval: 100, // 100ms for testing
        }
      });

      featureFlagService.registerFlag(flag);

      // Check initial percentage
      expect(flag.percentage).toBe(10);

      // Wait for rollout to progress
      setTimeout(() => {
        expect(flag.percentage).toBeGreaterThan(10);
        expect(flag.percentage).toBeLessThanOrEqual(50);
        done();
      }, 250); // Wait for a few increments
    });

    test("should override flags for specific users", () => {
      const flag = new FeatureFlag({ key: "override-flag", type: "boolean", enabled: false });
      featureFlagService.registerFlag(flag);

      const regularUser = new UserContext({ userId: "regular-user" });
      const overrideUser = new UserContext({ userId: "override-user" });

      // Set user-specific override
      featureFlagService.setUserOverride("override-user", "override-flag", true);

      expect(featureFlagService.isEnabled("override-flag", regularUser)).toBe(false);
      expect(featureFlagService.isEnabled("override-flag", overrideUser)).toBe(true);

      // Remove override
      featureFlagService.removeUserOverride("override-user", "override-flag");
      expect(featureFlagService.isEnabled("override-flag", overrideUser)).toBe(false);
    });

    test("should support environment-specific flags", () => {
      process.env.NODE_ENV = "development";

      const flag = new FeatureFlag({
        key: "env-flag",
        type: "boolean",
        enabled: false,
        environments: {
          development: { enabled: true },
          production: { enabled: false }
        }
      });

      featureFlagService.registerFlag(flag);
      const userContext = new UserContext({ userId: "env-user" });

      expect(featureFlagService.isEnabled("env-flag", userContext)).toBe(true);

      // Change environment
      process.env.NODE_ENV = "production";
      expect(featureFlagService.isEnabled("env-flag", userContext)).toBe(false);

      // Restore
      delete process.env.NODE_ENV;
    });

    test("should batch analytics events", async () => {
      // Configure for batching
      featureFlagService.config.analyticsBatchSize = 3;
      featureFlagService.config.analyticsBatchInterval = 100;

      const flag = new FeatureFlag({ key: "batch-flag", type: "boolean", enabled: true });
      featureFlagService.registerFlag(flag);

      const userContext = new UserContext({ userId: "batch-user" });

      // Generate multiple evaluations
      for (let i = 0; i < 5; i++) {
        featureFlagService.isEnabled("batch-flag", userContext);
      }

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 150));

      const batchEvents = mockAnalyticsService.getBatchEvents();
      expect(batchEvents.length).toBeGreaterThan(0);
    });

    test("should validate flag update constraints", () => {
      const flag = new FeatureFlag({
        key: "constrained-flag",
        type: "percentage",
        percentage: 50,
        constraints: {
          maxPercentage: 75,
          allowDecrease: false
        }
      });

      featureFlagService.registerFlag(flag);

      // Valid update
      expect(() => {
        featureFlagService.updateFlag("constrained-flag", { percentage: 60 });
      }).not.toThrow();

      // Invalid - exceeds max
      expect(() => {
        featureFlagService.updateFlag("constrained-flag", { percentage: 80 });
      }).toThrow("Percentage exceeds maximum allowed");

      // Invalid - decrease not allowed
      expect(() => {
        featureFlagService.updateFlag("constrained-flag", { percentage: 40 });
      }).toThrow("Decreasing percentage is not allowed");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    beforeEach(async () => {
      await featureFlagService.initialize();
    });

    test("should handle missing flags gracefully", () => {
      const userContext = new UserContext({ userId: "test-user" });

      expect(featureFlagService.isEnabled("nonexistent-flag", userContext)).toBe(false);
      expect(featureFlagService.getVariant("nonexistent-flag", userContext)).toBeNull();
    });

    test("should handle malformed flag definitions", () => {
      expect(() => {
        featureFlagService.registerFlag(null);
      }).toThrow();

      expect(() => {
        featureFlagService.registerFlag({});
      }).toThrow();
    });

    test("should handle circular dependencies", () => {
      const flag1 = new FeatureFlag({
        key: "flag1",
        type: "boolean",
        dependencies: ["flag2"]
      });

      const flag2 = new FeatureFlag({
        key: "flag2",
        type: "boolean",
        dependencies: ["flag1"]
      });

      featureFlagService.registerFlag(flag1);

      expect(() => {
        featureFlagService.registerFlag(flag2);
      }).toThrow("Circular dependency detected");
    });

    test("should handle invalid user context", () => {
      const flag = new FeatureFlag({ key: "context-flag", type: "boolean", enabled: true });
      featureFlagService.registerFlag(flag);

      // Should handle null context
      expect(featureFlagService.isEnabled("context-flag", null)).toBe(true);

      // Should handle undefined context
      expect(featureFlagService.isEnabled("context-flag", undefined)).toBe(true);

      // Should create anonymous context
      const result = featureFlagService.isEnabled("context-flag");
      expect(result).toBe(true);
    });

    test("should handle storage errors gracefully", () => {
      // Mock localStorage to throw error
      const originalSetItem = global.localStorage.setItem;
      global.localStorage.setItem = jest.fn(() => {
        throw new Error("Storage error");
      });

      const flag = new FeatureFlag({ key: "storage-flag", type: "boolean", enabled: true });

      // Should not throw despite storage error
      expect(() => {
        featureFlagService.registerFlag(flag);
      }).not.toThrow();

      // Restore
      global.localStorage.setItem = originalSetItem;
    });

    test("should handle concurrent evaluations safely", async () => {
      const flag = new FeatureFlag({ key: "concurrent-flag", type: "boolean", enabled: true });
      featureFlagService.registerFlag(flag);

      const promises = [];
      const userContext = new UserContext({ userId: "concurrent-user" });

      // Create multiple concurrent evaluations
      for (let i = 0; i < 50; i++) {
        promises.push(
          Promise.resolve().then(() => {
            return featureFlagService.isEnabled("concurrent-flag", userContext);
          })
        );
      }

      const results = await Promise.all(promises);

      // All should return the same result
      expect(results.every(result => result === true)).toBe(true);
      expect(results).toHaveLength(50);
    });
  });

  describe("Performance and Integration Tests", () => {
    beforeEach(async () => {
      await featureFlagService.initialize();
      await featureFlagService.start();
    });

    test("should evaluate flags efficiently", () => {
      // Register many flags
      for (let i = 0; i < 100; i++) {
        featureFlagService.registerFlag(new FeatureFlag({
          key: `perf-flag-${i}`,
          type: "boolean",
          enabled: i % 2 === 0 // Every other flag enabled
        }));
      }

      const userContext = new UserContext({ userId: "perf-user" });
      const startTime = performance.now();

      // Evaluate all flags
      for (let i = 0; i < 100; i++) {
        featureFlagService.isEnabled(`perf-flag-${i}`, userContext);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 100ms for 100 evaluations)
      expect(duration).toBeLessThan(100);
    });

    test("should integrate with authentication service", () => {
      const flag = new FeatureFlag({
        key: "auth-integration",
        type: "boolean",
        enabled: false,
        targeting: {
          groups: ["qa", "testers"],
          enabled: true
        }
      });

      featureFlagService.registerFlag(flag);

      // Should automatically use auth service for user context
      const result = featureFlagService.isEnabled("auth-integration");

      // Current mock user is in "pilot" and "beta-testers" groups
      // Flag targets "qa" and "testers", so should be false
      expect(result).toBe(false);

      // Update mock user to be in target group
      mockAuthService.setCurrentUser({
        ...mockAuthService.getCurrentUser(),
        groups: ["qa", "testers"]
      });

      const result2 = featureFlagService.isEnabled("auth-integration");
      expect(result2).toBe(true);
    });

    test("should persist flag state to storage", () => {
      const flag = new FeatureFlag({ key: "persistent-flag", type: "boolean", enabled: true });
      featureFlagService.registerFlag(flag);

      // Should persist to localStorage
      const stored = global.localStorage.getItem("featureflags:flags");
      expect(stored).toBeDefined();

      const parsedFlags = JSON.parse(stored);
      expect(parsedFlags).toHaveProperty("persistent-flag");
      expect(parsedFlags["persistent-flag"].enabled).toBe(true);
    });
  });
});

console.log("🧪 FeatureFlagService Test Suite - Simplified Jest Pattern (TD-002)");
console.log("✅ Standard CommonJS module loading implemented");
console.log("✅ Comprehensive feature flag management testing with 95%+ coverage target");