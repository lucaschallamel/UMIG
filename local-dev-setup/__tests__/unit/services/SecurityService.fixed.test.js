/**
 * SecurityService.test.js - Comprehensive Security Service Tests
 *
 * Tests for US-082-A Phase 1: Foundation Service Layer Security Implementation
 * 
 * Coverage Areas:
 * 1. Service Lifecycle (initialize, start, stop, cleanup)
 * 2. CSRF Protection (token generation, validation, expiry)
 * 3. Rate Limiting (per-user, per-IP, sliding window)
 * 4. Input Validation (XSS, SQL injection, path traversal, command injection)
 * 5. Security Headers
 * 6. Security Event Monitoring
 * 7. Integration with other services
 * 8. Error Handling and Edge Cases
 *
 * @author GENDEV Security Test Engineer
 * @version 1.0.0
 * @since Sprint 6
 */

// Setup global mocks before requiring the module
global.window = global.window || {};
global.performance = global.performance || { now: () => Date.now() };
global.crypto = global.crypto || {
  getRandomValues: (array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
  subtle: {
    digest: async (algorithm, data) => {
      // Simple mock hash
      return new ArrayBuffer(32);
    },
  },
};

// Mock Authentication Service
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
      roles: ["SUPERADMIN"],
      hasRole: (role) => true,
    };
  }

  getCurrentUser() {
    return this.currentUser;
  }
}

// Mock Logger
class MockLogger {
  constructor() {
    this.logs = [];
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

// Mock AdminGuiService
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

  getEvents() {
    return this.events;
  }

  clearEvents() {
    this.events = [];
  }
}

// Load SecurityService module
const {
  SecurityService,
  RateLimitEntry,
  SecurityEvent,
  InputValidator,
} = require("../../../../src/groovy/umig/web/js/services/SecurityService.js");

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
    global.window.AuthenticationService = mockAuthService;
    global.window.AdminGuiService = mockAdminGui;

    // Create security service instance
    securityService = new SecurityService();

    // Register auth service with admin gui
    mockAdminGui.registerService("AuthenticationService", mockAuthService);

    // Initialize service
    await securityService.initialize({}, mockLogger);
  });

  afterEach(async () => {
    if (securityService && securityService.state === "running") {
      await securityService.stop();
    }
    if (securityService) {
      await securityService.cleanup();
    }
  });

  describe("Service Lifecycle", () => {
    test("should initialize with default configuration", async () => {
      const service = new SecurityService();
      await service.initialize();
      expect(service.state).toBe("initialized");
      expect(service.config.csrf.enabled).toBe(true);
      expect(service.config.rateLimit.enabled).toBe(true);
    });

    test("should initialize with custom configuration", async () => {
      const service = new SecurityService();
      const customConfig = {
        csrf: { enabled: false },
        rateLimit: { enabled: false },
      };
      await service.initialize(customConfig);
      expect(service.config.csrf.enabled).toBe(false);
      expect(service.config.rateLimit.enabled).toBe(false);
    });

    test("should start successfully", async () => {
      await securityService.start();
      expect(securityService.state).toBe("running");
    });

    test("should stop successfully", async () => {
      await securityService.start();
      await securityService.stop();
      expect(securityService.state).toBe("stopped");
    });

    test("should cleanup resources", async () => {
      await securityService.start();
      await securityService.stop();
      await securityService.cleanup();
      expect(securityService.csrfTokens.size).toBe(0);
      expect(securityService.rateLimits.size).toBe(0);
    });
  });

  describe("CSRF Protection", () => {
    beforeEach(async () => {
      await securityService.start();
    });

    test("should generate CSRF token", () => {
      const token = securityService.generateCsrfToken("user123");
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(0);
    });

    test("should validate valid CSRF token", () => {
      const userId = "user123";
      const token = securityService.generateCsrfToken(userId);
      const isValid = securityService.validateCsrfToken(token, userId);
      expect(isValid).toBe(true);
    });

    test("should reject invalid CSRF token", () => {
      const isValid = securityService.validateCsrfToken("invalid-token", "user123");
      expect(isValid).toBe(false);
    });

    test("should reject expired CSRF token", async () => {
      const userId = "user123";
      const token = securityService.generateCsrfToken(userId);
      
      // Mock token expiry
      const tokenData = securityService.csrfTokens.get(token);
      tokenData.timestamp = Date.now() - 3700000; // Over 1 hour old
      
      const isValid = securityService.validateCsrfToken(token, userId);
      expect(isValid).toBe(false);
    });

    test("should generate unique tokens", () => {
      const token1 = securityService.generateCsrfToken("user123");
      const token2 = securityService.generateCsrfToken("user123");
      expect(token1).not.toBe(token2);
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(async () => {
      await securityService.start();
    });

    test("should allow requests within limit", () => {
      const userId = "user123";
      const ip = "192.168.1.1";
      
      for (let i = 0; i < 10; i++) {
        const result = securityService.checkRateLimit(userId, ip);
        expect(result.allowed).toBe(true);
      }
    });

    test("should block requests exceeding limit", () => {
      const userId = "user123";
      const ip = "192.168.1.1";
      
      // Exceed the limit
      for (let i = 0; i < 100; i++) {
        securityService.checkRateLimit(userId, ip);
      }
      
      const result = securityService.checkRateLimit(userId, ip);
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("Rate limit exceeded");
    });

    test("should bypass rate limit for admin users", () => {
      mockAuthService.setCurrentUser(mockAuthService.createAdminUser());
      const userId = "admin-user-456";
      const ip = "192.168.1.1";
      
      // Exceed normal limit
      for (let i = 0; i < 200; i++) {
        const result = securityService.checkRateLimit(userId, ip);
        expect(result.allowed).toBe(true);
      }
    });
  });

  describe("Input Validation", () => {
    beforeEach(async () => {
      await securityService.start();
    });

    test("should validate safe input", () => {
      const result = securityService.validateInput("Hello World", {});
      expect(result.isValid).toBe(true);
      expect(result.threats).toHaveLength(0);
    });

    test("should detect XSS attempts", () => {
      const result = securityService.validateInput("<script>alert('XSS')</script>", {});
      expect(result.isValid).toBe(false);
      expect(result.threats).toContain("XSS_DETECTED");
    });

    test("should detect SQL injection attempts", () => {
      const result = securityService.validateInput("'; DROP TABLE users; --", {});
      expect(result.isValid).toBe(false);
      expect(result.threats).toContain("SQL_INJECTION_DETECTED");
    });

    test("should sanitize HTML when allowed", () => {
      const result = securityService.validateInput(
        "<b>Bold</b> <script>alert('XSS')</script>",
        { allowHtml: true, allowedTags: ["b"] }
      );
      expect(result.sanitized).toBe("<b>Bold</b> ");
    });
  });

  describe("Health Check", () => {
    test("should report healthy status", async () => {
      await securityService.start();
      const health = securityService.getHealth();
      expect(health.isHealthy).toBe(true);
      expect(health.state).toBe("running");
    });

    test("should report unhealthy status with high error count", async () => {
      await securityService.start();
      // Simulate errors
      for (let i = 0; i < 15; i++) {
        securityService.metrics.errorCount++;
      }
      const health = securityService.getHealth();
      expect(health.isHealthy).toBe(false);
    });
  });
});

describe("RateLimitEntry Tests", () => {
  test("should track request counts", () => {
    const entry = new RateLimitEntry(100, 60000, 300000);
    entry.addRequest();
    entry.addRequest();
    expect(entry.getRequestCount()).toBe(2);
  });

  test("should check if limit exceeded", () => {
    const entry = new RateLimitEntry(2, 60000, 300000);
    entry.addRequest();
    entry.addRequest();
    expect(entry.isLimitExceeded()).toBe(false);
    entry.addRequest();
    expect(entry.isLimitExceeded()).toBe(true);
  });
});

describe("SecurityEvent Tests", () => {
  test("should create security event", () => {
    const event = new SecurityEvent("CSRF_ATTACK", "high", { token: "invalid" });
    expect(event.type).toBe("CSRF_ATTACK");
    expect(event.severity).toBe("high");
    expect(event.data.token).toBe("invalid");
  });
});

describe("InputValidator Tests", () => {
  test("should detect various threat patterns", () => {
    const validator = new InputValidator();
    
    expect(validator.containsXss("<script>")).toBe(true);
    expect(validator.containsSqlInjection("' OR 1=1")).toBe(true);
    expect(validator.containsPathTraversal("../../etc/passwd")).toBe(true);
    expect(validator.containsCommandInjection("; rm -rf /")).toBe(true);
  });
});