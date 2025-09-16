/**
 * Security Enhancements Test Suite - Fixed Version
 * Tests the high and medium priority security and performance improvements
 *
 * Tests cover:
 * - CSP Manager functionality
 * - SecurityUtils enhanced CSRF protection
 * - BaseComponent shouldUpdate optimization
 * - Session timeout management
 * - Memory-efficient WeakMap usage
 */

// Import the components to test
const ComponentOrchestrator = require("../../src/groovy/umig/web/js/components/ComponentOrchestrator.js");
const SecurityUtils = require("../../src/groovy/umig/web/js/components/SecurityUtils.js");
const BaseComponent = require("../../src/groovy/umig/web/js/components/BaseComponent.js");
const CSPManager = require("../../src/groovy/umig/web/js/security/CSPManager.js");

describe("Security Enhancements Test Suite", () => {
  beforeEach(() => {
    // Clear any existing DOM elements
    document.body.innerHTML = "";

    // Reset security state
    if (SecurityUtils.getInstance) {
      SecurityUtils.getInstance().csrfTokens.clear();
      SecurityUtils.getInstance().rateLimitMap.clear();
    }
  });

  describe("CSPManager", () => {
    test("should initialize with default configuration", () => {
      const cspManager = new CSPManager();

      expect(cspManager.config.environment).toBe("development");
      expect(cspManager.config.enableNonce).toBe(true);
      expect(cspManager.config.reportUri).toBe("/api/csp-report");
    });

    test("should generate secure nonces", () => {
      const cspManager = new CSPManager();

      const nonce1 = cspManager.generateNonce();
      const nonce2 = cspManager.generateNonce();

      expect(nonce1).toBeTruthy();
      expect(nonce2).toBeTruthy();
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1.length).toBeGreaterThan(10);
    });

    test("should generate CSP policies", () => {
      const cspManager = new CSPManager();
      const policies = cspManager.getCSPPolicies();

      expect(policies).toHaveProperty("default-src");
      expect(policies).toHaveProperty("script-src");
      expect(policies).toHaveProperty("style-src");
      expect(policies).toHaveProperty("img-src");
    });

    test("should include nonce in script sources", () => {
      const cspManager = new CSPManager();
      const nonce = cspManager.generateNonce();
      const policies = cspManager.getCSPPolicies();

      expect(policies["script-src"]).toContain(`'nonce-${nonce}'`);
    });

    test("should generate valid CSP header", () => {
      const cspManager = new CSPManager();
      const headerValue = cspManager.getCSPHeaderValue();

      expect(headerValue).toBeTruthy();
      expect(headerValue).toContain("default-src");
      expect(headerValue).toContain("script-src");
    });

    test("should return status information", () => {
      const cspManager = new CSPManager();
      const status = cspManager.getStatus();

      expect(status).toHaveProperty("enabled");
      expect(status).toHaveProperty("environment");
      expect(status).toHaveProperty("currentNonce");
      expect(status).toHaveProperty("policiesCount");
    });
  });

  describe("SecurityUtils Enhanced CSRF", () => {
    test("should sanitize XSS attacks", () => {
      const maliciousInput = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = SecurityUtils.sanitizeXSS(maliciousInput);

      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("javascript:");
      expect(sanitized).toContain("Safe content");
      expect(sanitized).toContain("&lt;script&gt;"); // Should be escaped
    });

    test("should generate CSRF tokens", () => {
      const token1 = SecurityUtils.generateCSRFToken();
      const token2 = SecurityUtils.generateCSRFToken();

      expect(token1).toBeTruthy();
      expect(token2).toBeTruthy();
      expect(token1).not.toBe(token2);
      expect(token1.length).toBeGreaterThan(20);
    });

    test("should validate CSRF tokens", () => {
      const token = SecurityUtils.generateCSRFToken();

      expect(SecurityUtils.validateCSRFToken(token)).toBe(true);
      expect(SecurityUtils.validateCSRFToken("invalid-token")).toBe(false);
      expect(SecurityUtils.validateCSRFToken("")).toBe(false);
    });

    test("should implement rate limiting", () => {
      const identifier = "test-user-123";

      // First request should be allowed
      expect(SecurityUtils.checkRateLimit(identifier)).toBe(true);

      // Multiple rapid requests should eventually be blocked
      for (let i = 0; i < 100; i++) {
        SecurityUtils.checkRateLimit(identifier);
      }

      // Should now be rate limited
      expect(SecurityUtils.checkRateLimit(identifier)).toBe(false);
    });

    test("should validate inputs", () => {
      // Valid inputs
      expect(SecurityUtils.validateInput("test@example.com", "email")).toBe(
        true,
      );
      expect(SecurityUtils.validateInput("ValidName123", "username")).toBe(
        true,
      );
      expect(SecurityUtils.validateInput("http://example.com", "url")).toBe(
        true,
      );

      // Invalid inputs
      expect(SecurityUtils.validateInput("invalid-email", "email")).toBe(false);
      expect(SecurityUtils.validateInput("<script>", "username")).toBe(false);
      expect(SecurityUtils.validateInput("javascript:alert(1)", "url")).toBe(
        false,
      );
    });
  });

  describe("BaseComponent shouldUpdate Optimization", () => {
    test("should detect no changes for identical states", () => {
      const component = new BaseComponent("test-container");
      const state = { name: "test", count: 1, active: true };

      expect(component.hasStateChanges(state, state)).toBe(false);
      expect(
        component.hasStateChanges(
          { name: "test", count: 1 },
          { name: "test", count: 1 },
        ),
      ).toBe(false);
    });

    test("should detect changes in primitive values", () => {
      const component = new BaseComponent("test-container");

      expect(
        component.hasStateChanges(
          { name: "test", count: 1 },
          { name: "test", count: 2 },
        ),
      ).toBe(true);

      expect(
        component.hasStateChanges({ active: true }, { active: false }),
      ).toBe(true);
    });

    test("should detect changes in object structure", () => {
      const component = new BaseComponent("test-container");

      expect(
        component.hasStateChanges(
          { user: { name: "John", age: 30 } },
          { user: { name: "John", age: 31 } },
        ),
      ).toBe(true);

      expect(
        component.hasStateChanges(
          { items: ["a", "b"] },
          { items: ["a", "b", "c"] },
        ),
      ).toBe(true);
    });

    test("should handle null/undefined states", () => {
      const component = new BaseComponent("test-container");

      expect(component.hasStateChanges(null, null)).toBe(false);
      expect(component.hasStateChanges(undefined, undefined)).toBe(false);
      expect(component.hasStateChanges(null, { name: "test" })).toBe(true);
      expect(component.hasStateChanges({ name: "test" }, null)).toBe(true);
    });

    test("should detect added/removed keys", () => {
      const component = new BaseComponent("test-container");

      expect(
        component.hasStateChanges({ name: "test" }, { name: "test", age: 30 }),
      ).toBe(true);

      expect(
        component.hasStateChanges({ name: "test", age: 30 }, { name: "test" }),
      ).toBe(true);
    });

    test("should handle Date objects correctly", () => {
      const component = new BaseComponent("test-container");
      const date1 = new Date("2024-01-01");
      const date2 = new Date("2024-01-01");
      const date3 = new Date("2024-01-02");

      expect(component.compareValues(date1, date2)).toBe(0);
      expect(component.compareValues(date1, date3)).toBe(1);
    });
  });

  describe("Session Timeout Management", () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test("should initialize with session timeout enabled by default", () => {
      const orchestrator = new ComponentOrchestrator("test-container-session");

      expect(orchestrator.sessionTimeout.enabled).toBe(true);
      expect(orchestrator.sessionTimeout.timeoutDuration).toBe(30 * 60 * 1000); // 30 minutes
      expect(orchestrator.sessionTimeout.warningDuration).toBe(5 * 60 * 1000); // 5 minutes
    });

    test("should record user activity", () => {
      const orchestrator = new ComponentOrchestrator("test-container-activity");
      const initialTime = orchestrator.sessionTimeout.lastActivityTime;

      // Wait a bit to ensure time difference
      jest.advanceTimersByTime(1000);
      orchestrator.recordUserActivity();

      expect(orchestrator.sessionTimeout.lastActivityTime).toBeGreaterThan(
        initialTime,
      );
    });

    test("should return session timeout status", () => {
      const orchestrator = new ComponentOrchestrator("test-container-status");

      const status = orchestrator.getSessionStatus();
      expect(status).toHaveProperty("enabled");
      expect(status).toHaveProperty("timeUntilWarning");
      expect(status).toHaveProperty("timeUntilTimeout");
      expect(status).toHaveProperty("lastActivityTime");
    });

    test("should extend session", () => {
      const orchestrator = new ComponentOrchestrator("test-container-extend");
      const initialTime = orchestrator.sessionTimeout.lastActivityTime;

      jest.advanceTimersByTime(1000);
      const extended = orchestrator.extendSession();

      expect(extended).toBe(true);
      expect(orchestrator.sessionTimeout.lastActivityTime).toBeGreaterThan(
        initialTime,
      );
    });

    test("should handle disabled session timeout", () => {
      const orchestrator = new ComponentOrchestrator(
        "test-container-disabled",
        {
          sessionTimeout: false,
        },
      );

      expect(orchestrator.sessionTimeout.enabled).toBe(false);
      expect(orchestrator.recordUserActivity()).toBe(false);
      expect(orchestrator.extendSession()).toBe(false);
    });
  });

  describe("Memory-Efficient WeakMap Usage", () => {
    test("should demonstrate WeakMap garbage collection", () => {
      const orchestrator = new ComponentOrchestrator("test-container-weakmap");

      // Create an object and add to WeakMap
      let testObject = { id: "test-123", data: "test-data" };
      orchestrator.setComponentMetadata(testObject, { suspended: true });

      // Verify it exists
      expect(orchestrator.getComponentMetadata(testObject)).toEqual({
        suspended: true,
      });

      // Remove reference - WeakMap will allow GC
      testObject = null;

      // Create new reference - should not find old data
      const newObject = { id: "test-123", data: "test-data" };
      expect(orchestrator.getComponentMetadata(newObject)).toBeUndefined();
    });

    test("should demonstrate Map vs WeakMap memory patterns", () => {
      const orchestrator = new ComponentOrchestrator("test-container-memory");

      // WeakMap allows garbage collection of keys
      const weakMapData = new WeakMap();
      let obj1 = { id: 1 };
      weakMapData.set(obj1, "data1");

      // Regular Map prevents garbage collection of keys
      const mapData = new Map();
      let obj2 = { id: 2 };
      mapData.set(obj2, "data2");

      expect(weakMapData.has(obj1)).toBe(true);
      expect(mapData.has(obj2)).toBe(true);

      // After removing references, WeakMap allows GC but Map doesn't
      obj1 = null;
      obj2 = null;

      // WeakMap doesn't provide size() method because entries can be GC'd
      expect(typeof weakMapData.size).toBe("undefined");

      // Map still holds reference and has size
      expect(mapData.size).toBe(1);
    });
  });
});
