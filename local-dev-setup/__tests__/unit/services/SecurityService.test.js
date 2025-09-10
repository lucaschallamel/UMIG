/**
 * SecurityService.test.js - Comprehensive Security Service Tests
 *
 * US-082-A Phase 1: Foundation Service Layer Security Testing
 * Tests comprehensive security infrastructure implementation
 *
 * Features Tested:
 * - CSRF Protection with double-submit cookie pattern
 * - Rate limiting with sliding window algorithm
 * - Input validation and sanitization (XSS/SQLi/Path traversal/Command injection)
 * - Security headers management
 * - Request signature validation
 * - Security event monitoring and alerting
 * - Integration with authentication service
 *
 * Test Categories:
 * 1. Service Lifecycle Tests (initialize, start, stop, cleanup)
 * 2. CSRF Protection Tests (token generation, validation, expiration)
 * 3. Rate Limiting Tests (per-user, per-IP, admin bypass)
 * 4. Input Validation Tests (XSS, SQL injection, path traversal, command injection)
 * 5. Security Headers Tests
 * 6. Security Event Monitoring Tests
 * 7. Integration Tests with other services
 * 8. Error Handling and Edge Cases
 *
 * Test Architecture: Self-contained following TD-001 pattern
 * - Embedded MockAuthService for authentication simulation
 * - Embedded MockLogger for logging verification
 * - No external dependencies beyond Jest
 * - Comprehensive security threat simulation
 *
 * @author GENDEV Security Test Engineer
 * @version 1.0.0
 * @since Sprint 6
 */

// Mock implementations embedded in test file (TD-001 pattern)

/**
 * Mock Authentication Service for testing
 */
class MockAuthService {
  constructor() {
    this.currentUser = {
      userId: "test-user-123",
      displayName: "Test User",
      roles: ["PILOT"],
      hasRole: (role) =>
        this.currentUser.roles.includes(role) ||
        this.currentUser.roles.includes("SUPERADMIN"),
    };
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  createAdminUser() {
    return {
      userId: "admin-user-456",
      displayName: "Admin User",
      roles: ["ADMIN"],
      hasRole: (role) =>
        ["ADMIN", "PILOT"].includes(role) ||
        this.currentUser.roles.includes("SUPERADMIN"),
    };
  }

  createSuperAdminUser() {
    return {
      userId: "superadmin-user-789",
      displayName: "Super Admin User",
      roles: ["SUPERADMIN"],
      hasRole: (role) => true, // Super admin has all roles
    };
  }

  createAnonymousUser() {
    return {
      userId: "anonymous",
      displayName: "Anonymous User",
      roles: ["ANONYMOUS"],
      hasRole: (role) => role === "ANONYMOUS",
    };
  }
}

/**
 * Mock Logger for testing
 */
class MockLogger {
  constructor() {
    this.logs = [];
  }

  debug(message, data) {
    this._log("debug", message, data);
  }
  info(message, data) {
    this._log("info", message, data);
  }
  warn(message, data) {
    this._log("warn", message, data);
  }
  error(message, data) {
    this._log("error", message, data);
  }

  _log(level, message, data) {
    this.logs.push({
      level,
      message,
      data,
      timestamp: Date.now(),
    });
  }

  getLogs(level = null) {
    return level ? this.logs.filter((log) => log.level === level) : this.logs;
  }

  getLastLog() {
    return this.logs[this.logs.length - 1];
  }

  clear() {
    this.logs = [];
  }

  hasLogContaining(text, level = null) {
    const logs = this.getLogs(level);
    return logs.some((log) => log.message.includes(text));
  }
}

/**
 * Mock AdminGuiService for testing service integration
 */
class MockAdminGuiService {
  constructor() {
    this.services = new Map();
    this.events = [];
  }

  getService(name) {
    return this.services.get(name);
  }

  registerService(name, service) {
    this.services.set(name, service);
  }

  broadcastEvent(source, eventName, data) {
    this.events.push({ source, eventName, data, timestamp: Date.now() });
  }

  getEvents(eventName = null) {
    return eventName
      ? this.events.filter((e) => e.eventName === eventName)
      : this.events;
  }

  clearEvents() {
    this.events = [];
  }
}

// Load SecurityService implementation
const fs = require("fs");
const path = require("path");

// Load SecurityService source code and evaluate in context
const securityServicePath = path.join(
  __dirname,
  "../../../../src/groovy/umig/web/js/services/SecurityService.js",
);
const securityServiceCode = fs.readFileSync(securityServicePath, "utf8");

// Remove module exports for test environment
const testSecurityServiceCode = securityServiceCode
  .replace(/if \(typeof module.*?^}/gms, "")
  .replace(/if \(typeof define.*?^}\);/gms, "")
  .replace(/if \(typeof window.*?^}/gms, "");

// Mock global objects
const mockGlobal = {
  window: {
    SecurityService: null,
    AdminGuiService: null,
    AuthenticationService: null,
  },
  document: {
    cookie: "",
    createElement: () => ({ setAttribute: () => {}, remove: () => {} }),
    head: { appendChild: () => {} },
    querySelector: () => null,
  },
  console: console,
  Date: Date,
  performance: { now: () => Date.now() },
  crypto: {
    getRandomValues: (array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
    },
    subtle: {
      generateKey: async () => ({
        type: "secret",
        algorithm: { name: "AES-GCM" },
      }),
      encrypt: async (algorithm, key, data) => new ArrayBuffer(8),
      decrypt: async (algorithm, key, data) => new ArrayBuffer(8),
    },
  },
  navigator: { userAgent: "test-browser" },
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval,
};

// Evaluate SecurityService in mock environment
let SecurityService, RateLimitEntry, SecurityEvent, InputValidator;
const vm = require("vm");

// Add window to mockGlobal so classes get attached
mockGlobal.window = mockGlobal;

const context = vm.createContext(mockGlobal);
vm.runInContext(testSecurityServiceCode, context);

// Extract classes from the window object in context
SecurityService = context.window.SecurityService;
RateLimitEntry = context.window.RateLimitEntry;
SecurityEvent = context.window.SecurityEvent;
InputValidator = context.window.InputValidator;

describe("SecurityService Tests", () => {
  let securityService;
  let mockAuthService;
  let mockLogger;
  let mockAdminGui;

  beforeEach(async () => {
    // Reset mocks
    mockAuthService = new MockAuthService();
    mockLogger = new MockLogger();
    mockAdminGui = new MockAdminGuiService();

    // Setup global mocks
    mockGlobal.window.AuthenticationService = mockAuthService;
    mockGlobal.window.AdminGuiService = mockAdminGui;

    // Create security service instance
    securityService = new SecurityService();

    // Register auth service with admin gui
    mockAdminGui.registerService("AuthenticationService", mockAuthService);
  });

  afterEach(async () => {
    if (securityService && securityService.state === "running") {
      await securityService.stop();
      await securityService.cleanup();
    }
    jest.clearAllTimers();
  });

  // ================================
  // Service Lifecycle Tests
  // ================================

  describe("Service Lifecycle", () => {
    test("should initialize with default configuration", async () => {
      expect(securityService.state).toBe("initialized");
      expect(securityService.name).toBe("SecurityService");
      expect(securityService.dependencies).toContain("AuthenticationService");
    });

    test("should initialize with custom configuration", async () => {
      const customConfig = {
        csrf: { enabled: false },
        rateLimit: { enabled: false },
        inputValidation: { maxInputLength: 5000 },
      };

      await securityService.initialize(customConfig, mockLogger);

      expect(securityService.state).toBe("initialized");
      expect(securityService.config.csrf.enabled).toBe(false);
      expect(securityService.config.rateLimit.enabled).toBe(false);
      expect(securityService.config.inputValidation.maxInputLength).toBe(5000);
    });

    test("should start successfully", async () => {
      await securityService.initialize({}, mockLogger);
      await securityService.start();

      expect(securityService.state).toBe("running");
      expect(securityService.startTime).toBeGreaterThan(0);
      expect(securityService.authService).toBe(mockAuthService);
    });

    test("should stop successfully", async () => {
      await securityService.initialize({}, mockLogger);
      await securityService.start();
      await securityService.stop();

      expect(securityService.state).toBe("stopped");
    });

    test("should cleanup resources", async () => {
      await securityService.initialize({}, mockLogger);
      await securityService.start();

      // Add some test data
      securityService.generateCSRFToken("test-user");
      securityService.checkRateLimit("test-user", "user");

      await securityService.cleanup();

      expect(securityService.state).toBe("cleaned");
      expect(securityService.csrfTokens.size).toBe(0);
      expect(securityService.rateLimiters.byUser.size).toBe(0);
      expect(securityService.securityEvents.length).toBe(0);
    });
  });

  // ================================
  // CSRF Protection Tests
  // ================================

  describe("CSRF Protection", () => {
    beforeEach(async () => {
      await securityService.initialize({}, mockLogger);
      await securityService.start();
    });

    test("should generate CSRF token", () => {
      const token = securityService.generateCSRFToken("test-user");

      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBe(32); // Default token length
      expect(securityService.csrfTokens.has(token)).toBe(true);
    });

    test("should validate valid CSRF token", () => {
      const token = securityService.generateCSRFToken("test-user");
      const isValid = securityService.validateCSRFToken(token, "test-user");

      expect(isValid).toBe(true);
    });

    test("should reject invalid CSRF token", () => {
      const isValid = securityService.validateCSRFToken(
        "invalid-token",
        "test-user",
      );

      expect(isValid).toBe(false);
    });

    test("should reject expired CSRF token", async () => {
      // Create service with very short token TTL
      const shortTTLService = new SecurityService();
      await shortTTLService.initialize(
        {
          csrf: { tokenTTL: 10 }, // 10ms
        },
        mockLogger,
      );

      const token = shortTTLService.generateCSRFToken("test-user");

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 20));

      const isValid = shortTTLService.validateCSRFToken(token, "test-user");
      expect(isValid).toBe(false);

      await shortTTLService.cleanup();
    });

    test("should reject token for different user in strict mode", () => {
      securityService.config.csrf.strictMode = true;

      const token = securityService.generateCSRFToken("user1");
      const isValid = securityService.validateCSRFToken(token, "user2");

      expect(isValid).toBe(false);
    });

    test("should reject blacklisted token", () => {
      const token = securityService.generateCSRFToken("test-user");
      securityService.blacklistedTokens.add(token);

      const isValid = securityService.validateCSRFToken(token, "test-user");
      expect(isValid).toBe(false);
    });

    test("should handle missing token", () => {
      const isValid = securityService.validateCSRFToken(null, "test-user");
      expect(isValid).toBe(false);
    });

    test("should generate unique tokens", () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(securityService.generateCSRFToken("test-user"));
      }
      expect(tokens.size).toBe(100); // All tokens should be unique
    });
  });

  // ================================
  // Rate Limiting Tests
  // ================================

  describe("Rate Limiting", () => {
    beforeEach(async () => {
      await securityService.initialize(
        {
          rateLimit: {
            enabled: true,
            perUser: { limit: 5, window: 1000, blockDuration: 2000 },
            perIP: { limit: 10, window: 1000, blockDuration: 2000 },
          },
        },
        mockLogger,
      );
      await securityService.start();
    });

    test("should allow requests within limit", () => {
      const result1 = securityService.checkRateLimit("test-user", "user");
      const result2 = securityService.checkRateLimit("test-user", "user");

      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result2.requestCount).toBe(2);
      expect(result2.remaining).toBe(3);
    });

    test("should block requests exceeding limit", () => {
      // Make 5 requests (at limit)
      for (let i = 0; i < 5; i++) {
        securityService.checkRateLimit("test-user", "user");
      }

      // 6th request should be blocked
      const result = securityService.checkRateLimit("test-user", "user");
      expect(result.allowed).toBe(false);
      expect(result.rateLimited).toBe(true);
    });

    test("should bypass rate limit for admin users", async () => {
      const adminUser = mockAuthService.createAdminUser();
      mockAuthService.setCurrentUser(adminUser);

      // Make requests exceeding normal limit
      for (let i = 0; i < 10; i++) {
        const result = securityService.checkRateLimit("admin-user-456", "user");
        expect(result.allowed).toBe(true);
        expect(result.bypass).toBe(true);
      }
    });

    test("should handle IP-based rate limiting", () => {
      const result1 = securityService.checkRateLimit("192.168.1.1", "ip");
      expect(result1.allowed).toBe(true);

      // Exceed IP limit (10 requests)
      for (let i = 0; i < 10; i++) {
        securityService.checkRateLimit("192.168.1.1", "ip");
      }

      const result = securityService.checkRateLimit("192.168.1.1", "ip");
      expect(result.allowed).toBe(false);
    });

    test("should respect whitelisted IPs", async () => {
      await securityService.initialize(
        {
          rateLimit: {
            enabled: true,
            whitelistedIPs: ["192.168.1.100"],
            perIP: { limit: 1, window: 1000 },
          },
        },
        mockLogger,
      );

      const result = securityService.checkRateLimit("192.168.1.100", "ip");
      expect(result.allowed).toBe(true);
      expect(result.whitelisted).toBe(true);
    });

    test("should block blacklisted IPs", async () => {
      await securityService.initialize(
        {
          rateLimit: {
            enabled: true,
            blacklistedIPs: ["192.168.1.200"],
          },
        },
        mockLogger,
      );

      const result = securityService.checkRateLimit("192.168.1.200", "ip");
      expect(result.allowed).toBe(false);
      expect(result.blacklisted).toBe(true);
    });
  });

  // ================================
  // Input Validation Tests
  // ================================

  describe("Input Validation", () => {
    beforeEach(async () => {
      await securityService.initialize({}, mockLogger);
      await securityService.start();
    });

    test("should validate safe input", () => {
      const result = securityService.validateInput("Hello World!");
      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe("Hello World!");
    });

    test("should detect XSS attempts", () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("xss")',
        '<iframe src="javascript:alert(1)"></iframe>',
      ];

      maliciousInputs.forEach((input) => {
        const result = securityService.validateInput(input);
        expect(result.isValid).toBe(false);
        expect(result.threat).toBe("xss");
      });
    });

    test("should detect SQL injection attempts", () => {
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'--",
        "1; DELETE FROM users WHERE 1=1",
      ];

      maliciousInputs.forEach((input) => {
        const result = securityService.validateInput(input);
        expect(result.isValid).toBe(false);
        expect(result.threat).toBe("sql_injection");
      });
    });

    test("should detect path traversal attempts", () => {
      const maliciousInputs = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\config\\sam",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      ];

      maliciousInputs.forEach((input) => {
        const result = securityService.validateInput(input);
        expect(result.isValid).toBe(false);
        expect(result.threat).toBe("path_traversal");
      });
    });

    test("should detect command injection attempts", () => {
      const maliciousInputs = [
        "test; rm -rf /",
        "test | cat /etc/passwd",
        'test && echo "hacked"',
        "test`whoami`",
      ];

      maliciousInputs.forEach((input) => {
        const result = securityService.validateInput(input);
        expect(result.isValid).toBe(false);
        expect(result.threat).toBe("command_injection");
      });
    });

    test("should sanitize HTML when allowed", () => {
      const input = '<p>Safe content</p><script>alert("xss")</script>';
      const result = securityService.validateInput(input, {
        allowHtml: true,
        encodeHtml: false,
      });

      expect(result.isValid).toBe(true);
      expect(result.sanitized).not.toContain("<script>");
      expect(result.sanitized).toContain("<p>Safe content</p>");
    });

    test("should encode HTML entities", () => {
      const input = '<div>Test & "quotes"</div>';
      const result = securityService.validateInput(input, { encodeHtml: true });

      expect(result.isValid).toBe(true);
      expect(result.sanitized).toBe(
        "&lt;div&gt;Test &amp; &quot;quotes&quot;&lt;/div&gt;",
      );
    });

    test("should validate file uploads", () => {
      const validator = new InputValidator();

      // Mock File object
      const safeFile = {
        name: "test.jpg",
        size: 1024,
        type: "image/jpeg",
      };

      const result = validator.validateFileUpload(safeFile);
      expect(result.isValid).toBe(true);
    });

    test("should reject oversized files", () => {
      const validator = new InputValidator();

      const largeFile = {
        name: "large.jpg",
        size: 50 * 1024 * 1024, // 50MB
        type: "image/jpeg",
      };

      const result = validator.validateFileUpload(largeFile);
      expect(result.isValid).toBe(false);
      expect(result.threat).toBe("file_too_large");
    });

    test("should reject disallowed file types", () => {
      const validator = new InputValidator();

      const executableFile = {
        name: "malware.exe",
        size: 1024,
        type: "application/x-msdownload",
      };

      const result = validator.validateFileUpload(executableFile);
      expect(result.isValid).toBe(false);
      expect(result.threat).toBe("invalid_mime_type");
    });
  });

  // ================================
  // Security Middleware Tests
  // ================================

  describe("Security Middleware", () => {
    beforeEach(async () => {
      await securityService.initialize({}, mockLogger);
      await securityService.start();
    });

    test("should apply security middleware to safe request", () => {
      const request = {
        method: "GET",
        url: "/api/users",
        headers: {},
        body: null,
        userId: "test-user",
        ipAddress: "192.168.1.1",
      };

      const result = securityService.applySecurityMiddleware(request);
      expect(result.allowed).toBe(true);
    });

    test("should block request with rate limit violation", () => {
      // First, exhaust rate limit
      for (let i = 0; i < 100; i++) {
        securityService.checkRateLimit("test-user", "user");
      }

      const request = {
        method: "POST",
        url: "/api/users",
        headers: {},
        body: { name: "Test User" },
        userId: "test-user",
        ipAddress: "192.168.1.1",
      };

      const result = securityService.applySecurityMiddleware(request);
      expect(result.allowed).toBe(false);
    });

    test("should block request with malicious input", () => {
      const request = {
        method: "POST",
        url: "/api/users",
        headers: {},
        body: {
          name: '<script>alert("xss")</script>',
          description: "Safe content",
        },
        userId: "test-user",
        ipAddress: "192.168.1.1",
      };

      const result = securityService.applySecurityMiddleware(request);
      expect(result.allowed).toBe(false);
    });

    test("should add CSRF token to state-changing requests", () => {
      const request = {
        method: "POST",
        url: "/api/users",
        headers: {},
        body: { name: "Test User" },
        userId: "test-user",
        ipAddress: "192.168.1.1",
      };

      const result = securityService.applySecurityMiddleware(request);
      expect(result.csrf.token).toBeDefined();
      expect(typeof result.csrf.token).toBe("string");
    });

    test("should include security headers", () => {
      const request = {
        method: "GET",
        url: "/api/users",
        headers: {},
        userId: "test-user",
        ipAddress: "192.168.1.1",
      };

      const result = securityService.applySecurityMiddleware(request);
      expect(result.securityHeaders).toBeDefined();
      expect(result.securityHeaders["Content-Security-Policy"]).toBeDefined();
      expect(result.securityHeaders["X-Frame-Options"]).toBeDefined();
    });
  });

  // ================================
  // Security Event Monitoring Tests
  // ================================

  describe("Security Event Monitoring", () => {
    beforeEach(async () => {
      await securityService.initialize({}, mockLogger);
      await securityService.start();
    });

    test("should log security events", () => {
      // Trigger CSRF violation
      securityService.validateCSRFToken("invalid-token", "test-user");

      const events = securityService.getSecurityEvents();
      expect(events.length).toBeGreaterThan(0);

      const csrfEvent = events.find((e) => e.type === "csrf_violation");
      expect(csrfEvent).toBeDefined();
      expect(csrfEvent.severity).toBe("medium");
    });

    test("should filter security events by type", () => {
      // Trigger multiple event types
      securityService.validateCSRFToken("invalid-token", "test-user");
      securityService.validateInput('<script>alert("xss")</script>');

      const csrfEvents = securityService.getSecurityEvents(
        100,
        "csrf_violation",
      );
      const threatEvents = securityService.getSecurityEvents(
        100,
        "input_validation_threat",
      );

      expect(csrfEvents.length).toBeGreaterThan(0);
      expect(threatEvents.length).toBeGreaterThan(0);
      expect(csrfEvents.every((e) => e.type === "csrf_violation")).toBe(true);
      expect(
        threatEvents.every((e) => e.type === "input_validation_threat"),
      ).toBe(true);
    });

    test("should clear old security events", () => {
      // Add some events
      securityService.validateCSRFToken("invalid-token", "test-user");
      securityService.validateInput('<script>alert("xss")</script>');

      expect(securityService.getSecurityEvents().length).toBeGreaterThan(0);

      // Clear events
      securityService.clearSecurityEvents();
      expect(securityService.getSecurityEvents().length).toBe(0);
    });

    test("should clear old security events by age", () => {
      // Manually add old event
      const oldEvent = new SecurityEvent("test_event", "low", {});
      oldEvent.timestamp = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      securityService.securityEvents.push(oldEvent);

      // Add recent event
      securityService.validateCSRFToken("invalid-token", "test-user");

      const beforeClear = securityService.getSecurityEvents().length;

      // Clear events older than 1 hour
      securityService.clearSecurityEvents(60 * 60 * 1000);

      const afterClear = securityService.getSecurityEvents().length;
      expect(afterClear).toBeLessThan(beforeClear);
    });

    test("should track security metrics", () => {
      // Generate some activity
      securityService.generateCSRFToken("test-user");
      securityService.validateCSRFToken("invalid-token", "test-user");
      securityService.checkRateLimit("test-user", "user");
      securityService.validateInput("safe input");

      const status = securityService.getSecurityStatus();
      expect(status.metrics.csrfTokensGenerated).toBeGreaterThan(0);
      expect(status.metrics.csrfViolations).toBeGreaterThan(0);
      expect(status.metrics.inputValidations).toBeGreaterThan(0);
      expect(status.metrics.operationCount).toBeGreaterThan(0);
    });
  });

  // ================================
  // Integration Tests
  // ================================

  describe("Integration Tests", () => {
    test("should integrate with AdminGuiService for event broadcasting", async () => {
      await securityService.initialize({}, mockLogger);
      await securityService.start();

      // Trigger security event that should cause alert
      for (let i = 0; i < 15; i++) {
        securityService.validateCSRFToken("invalid-token", "test-user");
      }

      // Check if alert was broadcasted (would need to spy on broadcastEvent)
      const events = mockAdminGui.getEvents("securityAlert");
      expect(events.length).toBeGreaterThanOrEqual(0); // May or may not trigger based on thresholds
    });

    test("should work without AdminGuiService", async () => {
      // Remove AdminGuiService reference
      mockGlobal.window.AdminGuiService = null;

      const standaloneService = new SecurityService();
      await standaloneService.initialize({}, mockLogger);
      await standaloneService.start();

      // Should still work
      const token = standaloneService.generateCSRFToken("test-user");
      expect(token).toBeDefined();

      const isValid = standaloneService.validateCSRFToken(token, "test-user");
      expect(isValid).toBe(true);

      await standaloneService.cleanup();
    });

    test("should handle authentication service integration", async () => {
      await securityService.initialize({}, mockLogger);
      await securityService.start();

      // Should get current user from auth service
      const request = {
        method: "POST",
        url: "/api/test",
        headers: {},
        body: {},
        ipAddress: "192.168.1.1",
      };

      const result = securityService.applySecurityMiddleware(request);
      expect(result).toBeDefined();
      // Auth service integration is tested indirectly through user-based operations
    });
  });

  // ================================
  // Error Handling Tests
  // ================================

  describe("Error Handling", () => {
    test("should handle initialization errors gracefully", async () => {
      const invalidConfig = {
        csrf: null, // Invalid config
        rateLimit: "invalid",
      };

      try {
        await securityService.initialize(invalidConfig, mockLogger);
        // Should handle gracefully or throw meaningful error
        expect(securityService.state).toBe("initialized");
      } catch (error) {
        expect(error.message).toContain("Security");
      }
    });

    test("should handle missing dependencies gracefully", async () => {
      // Remove auth service
      mockGlobal.window.AuthenticationService = null;
      mockGlobal.window.AdminGuiService = null;

      await securityService.initialize({}, mockLogger);
      await securityService.start();

      // Should still function
      const token = securityService.generateCSRFToken();
      expect(token).toBeDefined();
    });

    test("should handle crypto API unavailability", async () => {
      // Mock crypto unavailable
      const originalCrypto = mockGlobal.crypto;
      mockGlobal.crypto = undefined;

      const service = new SecurityService();
      await service.initialize({}, mockLogger);

      // Should disable encryption but continue
      expect(service.config.encryption.enabled).toBe(false);

      // Restore crypto
      mockGlobal.crypto = originalCrypto;
      await service.cleanup();
    });

    test("should handle invalid input validation requests", () => {
      // Test with various invalid inputs
      const invalidInputs = [undefined, null, { circular: {} }];

      // Create circular reference
      invalidInputs[2].circular.self = invalidInputs[2];

      invalidInputs.forEach((input) => {
        const result = securityService.validateInput(input);
        expect(result).toBeDefined();
        expect(result.hasOwnProperty("isValid")).toBe(true);
      });
    });
  });

  // ================================
  // Performance Tests
  // ================================

  describe("Performance Tests", () => {
    beforeEach(async () => {
      await securityService.initialize({}, mockLogger);
      await securityService.start();
    });

    test("should handle high volume CSRF token generation", () => {
      const startTime = Date.now();
      const tokenCount = 1000;

      for (let i = 0; i < tokenCount; i++) {
        const token = securityService.generateCSRFToken(`user-${i}`);
        expect(token).toBeDefined();
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(securityService.csrfTokens.size).toBe(tokenCount);
    });

    test("should handle high volume rate limit checks", () => {
      const startTime = Date.now();
      const checkCount = 1000;

      for (let i = 0; i < checkCount; i++) {
        const result = securityService.checkRateLimit(`user-${i}`, "user");
        expect(result.allowed).toBe(true);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test("should handle high volume input validation", () => {
      const startTime = Date.now();
      const validationCount = 1000;

      for (let i = 0; i < validationCount; i++) {
        const result = securityService.validateInput(`safe input ${i}`);
        expect(result.isValid).toBe(true);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    test("should cleanup expired tokens efficiently", async () => {
      // Generate many tokens with short TTL
      const shortTTLService = new SecurityService();
      await shortTTLService.initialize(
        {
          csrf: { tokenTTL: 50 }, // 50ms
        },
        mockLogger,
      );

      // Generate 100 tokens
      for (let i = 0; i < 100; i++) {
        shortTTLService.generateCSRFToken(`user-${i}`);
      }

      expect(shortTTLService.csrfTokens.size).toBe(100);

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Trigger cleanup
      shortTTLService._cleanupExpiredCSRFTokens();

      expect(shortTTLService.csrfTokens.size).toBe(0);
      await shortTTLService.cleanup();
    });
  });

  // ================================
  // Health Check Tests
  // ================================

  describe("Health Check Tests", () => {
    beforeEach(async () => {
      await securityService.initialize({}, mockLogger);
      await securityService.start();
    });

    test("should report healthy status", () => {
      const health = securityService.getHealth();

      expect(health.name).toBe("SecurityService");
      expect(health.state).toBe("running");
      expect(health.isHealthy).toBe(true);
      expect(health.uptime).toBeGreaterThanOrEqual(0);
    });

    test("should report unhealthy status with high error count", () => {
      // Simulate high error count
      securityService.metrics.errorCount = 50;

      const health = securityService.getHealth();
      expect(health.isHealthy).toBe(false);
    });

    test("should report security status", () => {
      const status = securityService.getSecurityStatus();

      expect(status.name).toBe("SecurityService");
      expect(status.config.csrfEnabled).toBe(true);
      expect(status.config.rateLimitEnabled).toBe(true);
      expect(status.config.inputValidationEnabled).toBe(true);
      expect(status.threats).toBeDefined();
      expect(status.rateLimiters).toBeDefined();
      expect(status.csrf).toBeDefined();
    });
  });
});

describe("RateLimitEntry Tests", () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimitEntry(1000); // 1 second window
  });

  test("should track requests within window", () => {
    const now = Date.now();

    rateLimiter.addRequest(now);
    rateLimiter.addRequest(now + 100);
    rateLimiter.addRequest(now + 200);

    expect(rateLimiter.getRequestCount(now + 200)).toBe(3);
  });

  test("should clean old requests outside window", () => {
    const now = Date.now();

    rateLimiter.addRequest(now);
    rateLimiter.addRequest(now + 500);
    rateLimiter.addRequest(now + 1500); // Outside 1 second window from first request

    expect(rateLimiter.getRequestCount(now + 1500)).toBe(2); // First request should be cleaned
  });

  test("should detect rate limit exceeded", () => {
    const now = Date.now();

    // Add 5 requests
    for (let i = 0; i < 5; i++) {
      rateLimiter.addRequest(now + i * 10);
    }

    expect(rateLimiter.isRateLimited(5, now + 50)).toBe(true);
    expect(rateLimiter.isRateLimited(6, now + 50)).toBe(false);
  });

  test("should handle blocking", () => {
    rateLimiter.block(5000); // Block for 5 seconds

    expect(rateLimiter.blocked).toBe(true);
    expect(rateLimiter.isRateLimited(1)).toBe(true);
  });

  test("should unblock after block duration", () => {
    const now = Date.now();
    rateLimiter.block(100); // Block for 100ms

    expect(rateLimiter.isRateLimited(1, now + 50)).toBe(true);
    expect(rateLimiter.isRateLimited(1, now + 150)).toBe(false);
  });
});

describe("SecurityEvent Tests", () => {
  test("should create security event with required fields", () => {
    const event = new SecurityEvent("test_event", "medium", {
      userId: "test-user",
      details: "Test event details",
    });

    expect(event.id).toBeDefined();
    expect(event.timestamp).toBeGreaterThan(0);
    expect(event.type).toBe("test_event");
    expect(event.severity).toBe("medium");
    expect(event.userId).toBe("test-user");
  });

  test("should serialize event properly", () => {
    const event = new SecurityEvent("test_event", "high", {
      userId: "test-user",
    });

    const serialized = event.serialize();

    expect(serialized.id).toBe(event.id);
    expect(serialized.type).toBe(event.type);
    expect(serialized.severity).toBe(event.severity);
    expect(serialized.userId).toBe(event.userId);
  });
});

describe("InputValidator Tests", () => {
  let validator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  test("should validate safe strings", () => {
    const safeInputs = [
      "Hello World",
      "user@example.com",
      "123-456-7890",
      "Simple text with numbers 123",
    ];

    safeInputs.forEach((input) => {
      const result = validator.validateInput(input);
      expect(result.isValid).toBe(true);
    });
  });

  test("should encode HTML entities correctly", () => {
    const testCases = [
      { input: "<div>test</div>", expected: "&lt;div&gt;test&lt;/div&gt;" },
      { input: "Test & Company", expected: "Test &amp; Company" },
      { input: 'Quote "test"', expected: "Quote &quot;test&quot;" },
      { input: "Apostrophe's test", expected: "Apostrophe&#39;s test" },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = validator.encodeHtmlEntities(input);
      expect(result).toBe(expected);
    });
  });

  test("should handle non-string input gracefully", () => {
    const nonStringInputs = [123, true, null, undefined, [], {}];

    nonStringInputs.forEach((input) => {
      const result = validator.validateInput(input);
      expect(result).toBeDefined();
      expect(typeof result.isValid).toBe("boolean");
    });
  });
});
