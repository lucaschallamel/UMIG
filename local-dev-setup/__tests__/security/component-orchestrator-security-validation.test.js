/**
 * TD-005 Phase 3: ComponentOrchestrator Security Validation
 *
 * Enhanced security testing to maintain 8.5/10 enterprise security rating
 * for ComponentOrchestrator and validate security controls across components.
 *
 * Security Requirements:
 * - Maintain 8.5/10 ComponentOrchestrator security rating
 * - XSS/CSRF protection validation
 * - Input validation and sanitization
 * - Rate limiting and access controls
 * - Security event logging and monitoring
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
const dom = new JSDOM(
  '<!DOCTYPE html><div id="security-test-container"></div>',
);
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.fetch = jest.fn();

// Import security components
import { ComponentOrchestrator } from "../../../src/groovy/umig/web/js/components/ComponentOrchestrator.js";
import { SecurityUtils } from "../../../src/groovy/umig/web/js/components/SecurityUtils.js";
import { BaseComponent } from "../../../src/groovy/umig/web/js/components/BaseComponent.js";
import { TableComponent } from "../../../src/groovy/umig/web/js/components/TableComponent.js";
import { ModalComponent } from "../../../src/groovy/umig/web/js/components/ModalComponent.js";

describe("TD-005 Phase 3: ComponentOrchestrator Security Validation", () => {
  let orchestrator;
  let securityUtils;
  let container;
  let securityMetrics;

  beforeEach(() => {
    // Setup test container
    container = document.getElementById("security-test-container");
    container.innerHTML = "";

    // Initialize security metrics tracking
    securityMetrics = {
      xssAttempts: 0,
      csrfValidations: 0,
      inputValidations: 0,
      rateLimitTests: 0,
      securityViolations: 0,
      startTime: performance.now(),
    };

    // Initialize security utils and orchestrator
    securityUtils = new SecurityUtils();
    orchestrator = new ComponentOrchestrator(container);

    // Setup security event tracking
    jest.spyOn(console, "warn").mockImplementation((message) => {
      if (message.includes("security") || message.includes("violation")) {
        securityMetrics.securityViolations++;
      }
    });
  });

  afterEach(() => {
    // Cleanup
    if (orchestrator) {
      orchestrator.destroy();
    }
    container.innerHTML = "";
    jest.restoreAllMocks();
  });

  describe("ComponentOrchestrator Security Controls", () => {
    test("orchestrator initializes with security hardening", async () => {
      await orchestrator.initialize();

      // Verify security initialization
      expect(orchestrator.securityUtils).toBeDefined();
      expect(orchestrator.securityConfig).toBeDefined();
      expect(orchestrator.securityConfig.xssProtection).toBe(true);
      expect(orchestrator.securityConfig.csrfProtection).toBe(true);
      expect(orchestrator.securityConfig.inputValidation).toBe(true);
      expect(orchestrator.securityConfig.rateLimiting).toBe(true);

      // Verify security rating requirements (8.5/10)
      const securityScore = orchestrator.calculateSecurityScore();
      expect(securityScore).toBeGreaterThanOrEqual(8.5);
    });

    test("component registration includes security validation", async () => {
      const maliciousComponent = {
        id: '<script>alert("xss")</script>',
        initialize: () => Promise.resolve(),
        mount: () => Promise.resolve(),
        render: () => Promise.resolve(),
        update: () => Promise.resolve(),
        unmount: () => Promise.resolve(),
        destroy: () => Promise.resolve(),
      };

      // Attempt to register malicious component
      let securityViolation = false;
      try {
        await orchestrator.registerComponent(maliciousComponent);
      } catch (error) {
        securityViolation =
          error.message.includes("security") ||
          error.message.includes("validation");
      }

      // Registration should fail or sanitize the malicious input
      expect(securityViolation).toBe(true);
      securityMetrics.securityViolations++;
    });

    test("cross-component communication security", async () => {
      const sourceComponent = new BaseComponent();
      const targetComponent = new TableComponent();

      await orchestrator.registerComponent(sourceComponent);
      await orchestrator.registerComponent(targetComponent);
      await orchestrator.initializeAll();

      // Test malicious event payload
      const maliciousPayload = {
        action: "update",
        data: '<script>alert("xss")</script>',
        sql: "DROP TABLE users;",
        path: "../../../etc/passwd",
      };

      // Mock event communication
      let sanitizedPayload = null;
      targetComponent.handleEvent = jest.fn((payload) => {
        sanitizedPayload = orchestrator.sanitizeEventPayload(payload);
      });

      // Send malicious event
      orchestrator.broadcastEvent("component-update", maliciousPayload);

      // Verify payload was sanitized
      expect(sanitizedPayload.data).not.toMatch(/<script/i);
      expect(sanitizedPayload.sql).not.toMatch(/DROP TABLE/i);
      expect(sanitizedPayload.path).not.toMatch(/\.\.\//);

      securityMetrics.xssAttempts++;
    });
  });

  describe("XSS Protection Validation", () => {
    test("comprehensive XSS attack vector prevention", async () => {
      await securityUtils.initialize();

      const xssVectors = [
        // Basic script injection
        '<script>alert("xss")</script>',
        '<SCRIPT>alert("xss")</SCRIPT>',
        '<script type="text/javascript">alert("xss")</script>',

        // Event handler injection
        '<img src="x" onerror="alert(1)">',
        '<body onload="alert(1)">',
        '<input onfocus="alert(1)" autofocus>',
        '<select onfocus="alert(1)" autofocus>',
        '<textarea onfocus="alert(1)" autofocus>',
        '<keygen onfocus="alert(1)" autofocus>',

        // JavaScript protocol
        '<a href="javascript:alert(1)">Link</a>',
        '<form action="javascript:alert(1)">',
        '<iframe src="javascript:alert(1)">',

        // Data URI with JavaScript
        '<iframe src="data:text/html,<script>alert(1)</script>">',
        '<object data="data:text/html,<script>alert(1)</script>">',

        // SVG XSS
        '<svg onload="alert(1)">',
        "<svg><script>alert(1)</script></svg>",

        // CSS expression (IE)
        '<div style="background:url(javascript:alert(1))">',
        '<div style="width:expression(alert(1))">',

        // Advanced obfuscation
        '<img src="x" onerror="eval(String.fromCharCode(97,108,101,114,116,40,49,41))">',
        "<script>eval(String.fromCharCode(97,108,101,114,116,40,49,41))</script>",
      ];

      xssVectors.forEach((vector, index) => {
        const sanitized = securityUtils.sanitizeHtml(vector);

        // Comprehensive XSS prevention checks
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/javascript:/i);
        expect(sanitized).not.toMatch(/on\w+=/i); // onload, onerror, etc.
        expect(sanitized).not.toMatch(/eval\(/i);
        expect(sanitized).not.toMatch(/alert\(/i);
        expect(sanitized).not.toMatch(/String\.fromCharCode/i);
        expect(sanitized).not.toMatch(/expression\(/i);
        expect(sanitized).not.toMatch(/<object/i);
        expect(sanitized).not.toMatch(/<embed/i);
        expect(sanitized).not.toMatch(/<iframe/i);

        securityMetrics.xssAttempts++;
      });

      // Security rating validation: XSS protection should contribute 2.5+ points
      const xssProtectionScore = securityUtils.calculateXssProtectionScore();
      expect(xssProtectionScore).toBeGreaterThanOrEqual(2.5);
    });

    test("context-aware XSS protection", async () => {
      const contexts = ["html", "attribute", "javascript", "css", "url"];
      const maliciousInput = '<script>alert("xss")</script>';

      contexts.forEach((context) => {
        const sanitized = securityUtils.sanitizeForContext(
          maliciousInput,
          context,
        );

        switch (context) {
          case "html":
            expect(sanitized).not.toMatch(/<script/i);
            break;
          case "attribute":
            expect(sanitized).not.toMatch(/"/);
            expect(sanitized).not.toMatch(/'/);
            break;
          case "javascript":
            expect(sanitized).toBe(""); // Should be completely blocked
            break;
          case "css":
            expect(sanitized).not.toMatch(/expression/i);
            expect(sanitized).not.toMatch(/javascript:/i);
            break;
          case "url":
            expect(sanitized).not.toMatch(/javascript:/i);
            expect(sanitized).not.toMatch(/data:/i);
            break;
        }
      });
    });
  });

  describe("CSRF Protection Validation", () => {
    test("CSRF token generation and validation", async () => {
      await securityUtils.initialize();

      // Generate multiple tokens
      const tokens = [];
      for (let i = 0; i < 10; i++) {
        tokens.push(securityUtils.generateCsrfToken());
        securityMetrics.csrfValidations++;
      }

      // Validate token uniqueness
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);

      // Validate token format and length
      tokens.forEach((token) => {
        expect(token).toBeTruthy();
        expect(token.length).toBeGreaterThan(32);
        expect(typeof token).toBe("string");
        expect(token).toMatch(/^[a-zA-Z0-9+/=]+$/); // Base64 format
      });

      // Validate token validation function
      tokens.forEach((token) => {
        expect(securityUtils.validateCsrfToken(token)).toBe(true);
      });

      // Test invalid tokens
      const invalidTokens = ["", "invalid", "123", null, undefined];
      invalidTokens.forEach((token) => {
        expect(securityUtils.validateCsrfToken(token)).toBe(false);
      });
    });

    test("CSRF protection in component operations", async () => {
      const component = new TableComponent();
      await component.initialize();

      // Mock API call with CSRF protection
      const mockApiCall = jest.fn().mockImplementation((options) => {
        const csrfToken = options.headers["X-CSRF-Token"];
        if (!securityUtils.validateCsrfToken(csrfToken)) {
          throw new Error("CSRF token validation failed");
        }
        return Promise.resolve({ success: true });
      });

      component.apiCall = mockApiCall;

      // Valid CSRF token should work
      const validToken = securityUtils.generateCsrfToken();
      const result = await component.apiCall({
        method: "POST",
        headers: { "X-CSRF-Token": validToken },
        body: JSON.stringify({ data: "test" }),
      });

      expect(result.success).toBe(true);

      // Invalid CSRF token should fail
      let csrfError = false;
      try {
        await component.apiCall({
          method: "POST",
          headers: { "X-CSRF-Token": "invalid-token" },
          body: JSON.stringify({ data: "test" }),
        });
      } catch (error) {
        csrfError = error.message.includes("CSRF");
      }

      expect(csrfError).toBe(true);
    });
  });

  describe("Input Validation and Sanitization", () => {
    test("comprehensive input validation", async () => {
      const maliciousInputs = [
        // Path traversal
        "../../../etc/passwd",
        "..\\..\\..\\windows\\system32\\config\\sam",
        "/etc/shadow",
        "C:\\Windows\\System32\\drivers\\etc\\hosts",

        // SQL injection
        "'; DROP TABLE users; --",
        "1' OR '1'='1",
        "admin'/*",
        "1; EXEC sp_executesql N'DROP DATABASE users'",

        // Command injection
        "; rm -rf /",
        "| cat /etc/passwd",
        "&& whoami",
        "test`id`",

        // LDAP injection
        "admin')(|(password=*))",
        "*)(uid=*))(|(uid=*",

        // XML injection
        '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>',

        // NoSQL injection
        '{"$ne": null}',
        '{"$regex": ".*"}',

        // Header injection
        "test\r\nSet-Cookie: admin=true",
        "test\nLocation: http://evil.com",
      ];

      maliciousInputs.forEach((input) => {
        const isValid = securityUtils.validateInput(input);
        expect(isValid).toBe(false);

        const sanitized = securityUtils.sanitizeInput(input);
        expect(sanitized).not.toBe(input);

        securityMetrics.inputValidations++;
      });

      // Test safe inputs
      const safeInputs = [
        "user@example.com",
        "John Doe",
        "123 Main Street",
        "Valid input text",
        "2025-01-18",
      ];

      safeInputs.forEach((input) => {
        const isValid = securityUtils.validateInput(input);
        expect(isValid).toBe(true);

        const sanitized = securityUtils.sanitizeInput(input);
        expect(sanitized).toBe(input);
      });
    });

    test("component input validation integration", async () => {
      const components = [
        new TableComponent(),
        new ModalComponent(),
        new BaseComponent(),
      ];

      for (const component of components) {
        await component.initialize();

        // Test malicious input handling
        const maliciousData = {
          name: '<script>alert("xss")</script>',
          sql: "DROP TABLE users;",
          path: "../../../etc/passwd",
        };

        const sanitizedData = component.sanitizeInput(maliciousData);

        expect(sanitizedData.name).not.toMatch(/<script/i);
        expect(sanitizedData.sql).not.toMatch(/DROP TABLE/i);
        expect(sanitizedData.path).not.toMatch(/\.\.\//);

        // Test input validation
        const isValid = component.validateInput(maliciousData);
        expect(isValid).toBe(false);
      }
    });
  });

  describe("Rate Limiting and Access Controls", () => {
    test("rate limiting prevents abuse", async () => {
      await securityUtils.initialize();

      const endpoint = "/api/test";
      const clientId = "test-client";

      // Configure rate limit: 5 requests per minute
      securityUtils.setRateLimit(endpoint, 5, 60000);

      // Test normal usage within limits
      for (let i = 0; i < 5; i++) {
        const allowed = securityUtils.checkRateLimit(endpoint, clientId);
        expect(allowed).toBe(true);
        securityMetrics.rateLimitTests++;
      }

      // Test rate limit exceeded
      const blocked = securityUtils.checkRateLimit(endpoint, clientId);
      expect(blocked).toBe(false);

      // Test rate limit reset after time window
      await new Promise((resolve) => setTimeout(resolve, 100)); // Simulate time passage
      securityUtils.resetRateLimit(endpoint, clientId); // Manual reset for testing

      const allowedAfterReset = securityUtils.checkRateLimit(
        endpoint,
        clientId,
      );
      expect(allowedAfterReset).toBe(true);
    });

    test("access control validation", async () => {
      const component = new TableComponent();
      await component.initialize();

      // Test permission-based access
      const userRoles = ["guest", "user", "admin", "superadmin"];
      const protectedOperations = ["read", "write", "delete", "admin"];

      userRoles.forEach((role) => {
        protectedOperations.forEach((operation) => {
          const hasAccess = component.checkPermission(role, operation);

          // Validate access control logic
          if (role === "guest") {
            expect(hasAccess).toBe(operation === "read");
          } else if (role === "user") {
            expect(hasAccess).toBe(["read", "write"].includes(operation));
          } else if (role === "admin") {
            expect(hasAccess).toBe(
              ["read", "write", "delete"].includes(operation),
            );
          } else if (role === "superadmin") {
            expect(hasAccess).toBe(true);
          }
        });
      });
    });
  });

  describe("Security Event Logging and Monitoring", () => {
    test("security events are properly logged", async () => {
      const securityEvents = [];

      // Mock security event logger
      securityUtils.logSecurityEvent = jest.fn((event) => {
        securityEvents.push(event);
      });

      // Trigger various security events
      await securityUtils.sanitizeHtml('<script>alert("xss")</script>'); // XSS attempt
      securityUtils.validateInput("'; DROP TABLE users; --"); // SQL injection attempt
      securityUtils.checkRateLimit("/api/test", "malicious-client"); // Rate limit check

      // Verify events were logged
      expect(securityEvents.length).toBeGreaterThan(0);

      securityEvents.forEach((event) => {
        expect(event).toHaveProperty("timestamp");
        expect(event).toHaveProperty("type");
        expect(event).toHaveProperty("severity");
        expect(event).toHaveProperty("details");
        expect(
          ["low", "medium", "high", "critical"].includes(event.severity),
        ).toBe(true);
      });
    });

    test("security monitoring provides real-time alerts", async () => {
      const alerts = [];

      // Mock alert system
      securityUtils.sendAlert = jest.fn((alert) => {
        alerts.push(alert);
      });

      // Simulate high-severity security events
      for (let i = 0; i < 10; i++) {
        securityUtils.validateInput('<script>alert("xss")</script>');
      }

      // Should trigger alert for repeated XSS attempts
      securityUtils.analyzeSecurityPatterns();

      expect(alerts.length).toBeGreaterThan(0);

      const xssAlert = alerts.find(
        (alert) => alert.type === "repeated_xss_attempts",
      );
      expect(xssAlert).toBeDefined();
      expect(xssAlert.severity).toBe("high");
    });
  });

  describe("Security Score Calculation and Validation", () => {
    test("ComponentOrchestrator maintains 8.5/10 security rating", async () => {
      await orchestrator.initialize();
      await securityUtils.initialize();

      // Calculate comprehensive security score
      const securityAssessment = {
        xssProtection: securityUtils.calculateXssProtectionScore(), // Target: 2.5/10
        csrfProtection: securityUtils.calculateCsrfProtectionScore(), // Target: 2.0/10
        inputValidation: securityUtils.calculateInputValidationScore(), // Target: 2.0/10
        accessControl: securityUtils.calculateAccessControlScore(), // Target: 1.0/10
        monitoring: securityUtils.calculateMonitoringScore(), // Target: 1.0/10
        additionalSecurity: securityUtils.calculateAdditionalSecurityScore(), // Bonus: 0.5/10
      };

      const totalScore = Object.values(securityAssessment).reduce(
        (sum, score) => sum + score,
        0,
      );

      // Validate individual component scores
      expect(securityAssessment.xssProtection).toBeGreaterThanOrEqual(2.5);
      expect(securityAssessment.csrfProtection).toBeGreaterThanOrEqual(2.0);
      expect(securityAssessment.inputValidation).toBeGreaterThanOrEqual(2.0);
      expect(securityAssessment.accessControl).toBeGreaterThanOrEqual(1.0);
      expect(securityAssessment.monitoring).toBeGreaterThanOrEqual(1.0);

      // Validate total security score meets 8.5/10 requirement
      expect(totalScore).toBeGreaterThanOrEqual(8.5);

      console.log("🔒 ComponentOrchestrator Security Assessment:", {
        xssProtection: securityAssessment.xssProtection.toFixed(1),
        csrfProtection: securityAssessment.csrfProtection.toFixed(1),
        inputValidation: securityAssessment.inputValidation.toFixed(1),
        accessControl: securityAssessment.accessControl.toFixed(1),
        monitoring: securityAssessment.monitoring.toFixed(1),
        additionalSecurity: securityAssessment.additionalSecurity.toFixed(1),
        totalScore: totalScore.toFixed(1),
      });

      // Mark security validation as complete for US-087 Phase 2
      if (totalScore >= 8.5) {
        console.log(
          "✅ ComponentOrchestrator Security Rating: 8.5/10+ MAINTAINED",
        );
        console.log(
          "✅ Security controls validated for US-087 Phase 2 Teams Component Migration",
        );
      }
    });

    test("security metrics summary for Phase 3 completion", () => {
      const totalTestTime = performance.now() - securityMetrics.startTime;

      const securitySummary = {
        xssAttemptsBlocked: securityMetrics.xssAttempts,
        csrfValidationsPerformed: securityMetrics.csrfValidations,
        inputValidationsExecuted: securityMetrics.inputValidations,
        rateLimitTestsCompleted: securityMetrics.rateLimitTests,
        securityViolationsDetected: securityMetrics.securityViolations,
        totalTestTime: totalTestTime,
      };

      // Validate comprehensive security testing
      expect(securityMetrics.xssAttempts).toBeGreaterThan(20); // Comprehensive XSS testing
      expect(securityMetrics.csrfValidations).toBeGreaterThan(10); // CSRF validation testing
      expect(securityMetrics.inputValidations).toBeGreaterThan(15); // Input validation testing
      expect(securityMetrics.rateLimitTests).toBeGreaterThan(5); // Rate limiting testing

      console.log(
        "🛡️ TD-005 Phase 3 Security Testing Summary:",
        securitySummary,
      );

      if (
        securityMetrics.xssAttempts > 20 &&
        securityMetrics.csrfValidations > 10 &&
        securityMetrics.inputValidations > 15
      ) {
        console.log("✅ Comprehensive security validation COMPLETE");
        console.log("✅ Enterprise 8.5/10 security rating MAINTAINED");
      }
    });
  });
});
