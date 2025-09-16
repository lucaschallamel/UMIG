/**
 * CSP Manager Security Test Suite
 * US-082-B Component Architecture - Security Enhancement Phase
 *
 * Comprehensive testing of the Content Security Policy Manager
 * Tests CSP policy generation, nonce management, violation reporting, and XSS prevention
 *
 * Coverage areas:
 * - CSP policy generation for different environments (development/production)
 * - Nonce generation and validation
 * - CSP violation reporting and monitoring
 * - Policy injection methods (meta tags)
 * - Security header validation
 * - XSS prevention verification
 * - Dynamic policy updates
 * - Script and style element creation with nonces
 *
 * @version 1.0.0
 * @created 2025-01-16 (Security Remediations Testing)
 */

// Required modules
const fs = require("fs");
const path = require("path");

// Setup DOM environment (jest with jsdom provides window, document, etc.)
// Ensure crypto API is available

// Mock crypto API for Node.js environment
Object.defineProperty(global, "crypto", {
  value: {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  },
});

// Mock fetch for violation reporting
global.fetch = jest.fn();

// Load CSPManager class
const CSPManagerPath = path.join(
  __dirname,
  "../../../src/groovy/umig/web/js/security/CSPManager.js",
);
const CSPManagerSource = fs.readFileSync(CSPManagerPath, "utf8");
eval(CSPManagerSource);

describe("CSP Manager Security Test Suite", () => {
  let cspManager;
  let consoleInfoSpy;
  let consoleWarnSpy;
  let consoleErrorSpy;
  let consoleDebugSpy;

  beforeEach(() => {
    // Reset DOM
    document.head.innerHTML = "";
    document.body.innerHTML = "";

    // Setup console spies
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation();

    // Reset fetch mock
    fetch.mockClear();

    // Clear any existing timers
    jest.clearAllTimers();
  });

  afterEach(() => {
    // Clean up CSP manager
    if (cspManager) {
      cspManager.destroy();
      cspManager = null;
    }

    // Restore console
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    consoleDebugSpy.mockRestore();

    // Clear timers
    jest.clearAllTimers();
  });

  describe("CSP Manager Initialization", () => {
    test("should initialize with default production configuration", () => {
      cspManager = new CSPManager();

      expect(cspManager.config.environment).toBe("production");
      expect(cspManager.config.enableNonces).toBe(true);
      expect(cspManager.config.enableReporting).toBe(true);
      expect(cspManager.config.strictMode).toBe(true);
      expect(cspManager.currentNonce).toBeTruthy();
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        "[CSPManager] Initialized with environment:",
        "production",
      );
    });

    test("should initialize with custom configuration", () => {
      const customConfig = {
        environment: "development",
        enableNonces: false,
        strictMode: false,
        reportingEndpoint: "/custom-report",
      };

      cspManager = new CSPManager(customConfig);

      expect(cspManager.config.environment).toBe("development");
      expect(cspManager.config.enableNonces).toBe(false);
      expect(cspManager.config.strictMode).toBe(false);
      expect(cspManager.config.reportingEndpoint).toBe("/custom-report");
    });

    test("should apply initial CSP policies on initialization", () => {
      cspManager = new CSPManager();

      const cspMeta = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      expect(cspMeta).toBeTruthy();
      expect(cspMeta.getAttribute("content")).toContain("default-src 'self'");
    });
  });

  describe("Nonce Generation and Management", () => {
    test("should generate cryptographically secure nonces", () => {
      cspManager = new CSPManager();

      const nonce1 = cspManager.generateNonce();
      const nonce2 = cspManager.generateNonce();

      expect(nonce1).toBeTruthy();
      expect(nonce2).toBeTruthy();
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1.length).toBeGreaterThan(16);
      expect(nonce1).toMatch(/^[A-Za-z0-9_-]+$/); // Base64URL format
    });

    test("should fallback to timestamp-based nonce on crypto failure", () => {
      // Mock crypto failure
      const originalCrypto = global.crypto;
      global.crypto = {
        getRandomValues: () => {
          throw new Error("Crypto not available");
        },
      };

      cspManager = new CSPManager();
      const nonce = cspManager.getCurrentNonce();

      expect(nonce).toBeTruthy();
      expect(nonce).toContain("fallback-");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[CSPManager] Failed to generate secure nonce:",
        expect.any(Error),
      );

      // Restore crypto
      global.crypto = originalCrypto;
    });

    test("should start and stop automatic nonce refresh", () => {
      jest.useFakeTimers();
      cspManager = new CSPManager();

      const initialNonce = cspManager.getCurrentNonce();

      // Fast forward 5 minutes (refresh interval)
      jest.advanceTimersByTime(5 * 60 * 1000);

      const refreshedNonce = cspManager.getCurrentNonce();
      expect(refreshedNonce).not.toBe(initialNonce);

      // Test stop refresh
      cspManager.stopNonceRefresh();
      const beforeStop = cspManager.getCurrentNonce();

      jest.advanceTimersByTime(5 * 60 * 1000);

      const afterStop = cspManager.getCurrentNonce();
      expect(afterStop).toBe(beforeStop);

      jest.useRealTimers();
    });

    test("should emit nonce update events", (done) => {
      jest.useFakeTimers();
      cspManager = new CSPManager();

      window.addEventListener("csp:nonceUpdated", (event) => {
        expect(event.detail.nonce).toBe(cspManager.getCurrentNonce());
        done();
      });

      // Trigger nonce update
      jest.advanceTimersByTime(5 * 60 * 1000);

      jest.useRealTimers();
    });
  });

  describe("CSP Policy Generation", () => {
    test("should generate strict production policies", () => {
      cspManager = new CSPManager({
        environment: "production",
        strictMode: true,
      });
      const policies = cspManager.getCSPPolicies();

      expect(policies["default-src"]).toEqual(["'self'"]);
      expect(policies["object-src"]).toEqual(["'none'"]);
      expect(policies["base-uri"]).toEqual(["'self'"]);
      expect(policies["frame-ancestors"]).toEqual(["'none'"]);

      // Should not contain unsafe directives in strict mode
      const scriptSrc = policies["script-src"];
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain("'unsafe-eval'");
    });

    test("should generate permissive development policies", () => {
      cspManager = new CSPManager({ environment: "development" });
      const policies = cspManager.getCSPPolicies();

      const scriptSrc = policies["script-src"];
      expect(scriptSrc).toContain("'unsafe-inline'");
      expect(scriptSrc).toContain("'unsafe-eval'");
      expect(scriptSrc).toContain("localhost:*");
      expect(scriptSrc).toContain("127.0.0.1:*");
    });

    test("should include nonces in script and style sources when enabled", () => {
      cspManager = new CSPManager({ enableNonces: true });
      const policies = cspManager.getCSPPolicies();

      const scriptSrc = policies["script-src"];
      const styleSrc = policies["style-src"];

      expect(scriptSrc.some((src) => src.startsWith("'nonce-"))).toBe(true);
      expect(styleSrc.some((src) => src.startsWith("'nonce-"))).toBe(true);
    });

    test("should include reporting directives when enabled", () => {
      cspManager = new CSPManager({
        enableReporting: true,
        reportingEndpoint: "/test-report",
      });
      const policies = cspManager.getCSPPolicies();

      expect(policies["report-uri"]).toEqual(["/test-report"]);
      expect(policies["report-to"]).toEqual(["csp-endpoint"]);
    });

    test("should generate valid CSP header string", () => {
      cspManager = new CSPManager();
      const header = cspManager.generateCSPHeader();

      expect(header).toContain("default-src 'self'");
      expect(header).toContain("object-src 'none'");
      expect(header).toContain("upgrade-insecure-requests");
      expect(header.split(";")).toHaveLength(12); // Expected number of directives
    });
  });

  describe("CSP Policy Application", () => {
    test("should apply CSP via meta tag", () => {
      cspManager = new CSPManager();

      const metaTags = document.querySelectorAll(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      expect(metaTags).toHaveLength(1);

      const cspContent = metaTags[0].getAttribute("content");
      expect(cspContent).toContain("default-src 'self'");
      expect(cspContent).toContain("object-src 'none'");
    });

    test("should replace existing CSP meta tag", () => {
      // Add existing CSP meta tag
      const existingMeta = document.createElement("meta");
      existingMeta.setAttribute("http-equiv", "Content-Security-Policy");
      existingMeta.setAttribute("content", "default-src none");
      document.head.appendChild(existingMeta);

      cspManager = new CSPManager();

      const metaTags = document.querySelectorAll(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      expect(metaTags).toHaveLength(1);
      expect(metaTags[0].getAttribute("content")).not.toBe("default-src none");
    });

    test("should handle missing head element gracefully", () => {
      document.head.remove();

      expect(() => {
        cspManager = new CSPManager();
      }).not.toThrow();

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[CSPManager] Cannot apply CSP in non-browser environment",
      );
    });
  });

  describe("CSP Violation Handling", () => {
    test("should setup violation event listener", () => {
      const addEventListenerSpy = jest.spyOn(document, "addEventListener");
      cspManager = new CSPManager({ enableReporting: true });

      expect(addEventListenerSpy).toHaveBeenCalledWith(
        "securitypolicyviolation",
        expect.any(Function),
      );

      addEventListenerSpy.mockRestore();
    });

    test("should handle and log CSP violations", () => {
      cspManager = new CSPManager({ enableReporting: true });

      const mockViolation = {
        blockedURI: "https://evil.com/script.js",
        violatedDirective: "script-src",
        originalPolicy: "script-src 'self'",
        documentURI: "http://localhost:8090",
        effectiveDirective: "script-src",
        lineNumber: 42,
        columnNumber: 10,
        sourceFile: "http://localhost:8090/page.html",
      };

      // Simulate CSP violation
      cspManager.handleViolation(mockViolation);

      expect(cspManager.violations).toHaveLength(1);
      expect(cspManager.violations[0].blockedURI).toBe(
        "https://evil.com/script.js",
      );
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        "[CSPManager] CSP Violation detected:",
        expect.any(Object),
      );
    });

    test("should report violations to endpoint", async () => {
      fetch.mockResolvedValue({ ok: true });
      cspManager = new CSPManager({
        enableReporting: true,
        reportingEndpoint: "/csp-violations",
      });

      const mockViolation = {
        blockedURI: "https://malicious.com/script.js",
        violatedDirective: "script-src",
      };

      await cspManager.reportViolation(mockViolation);

      expect(fetch).toHaveBeenCalledWith("/csp-violations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "csp-report": mockViolation,
        }),
      });
    });

    test("should emit violation events", (done) => {
      cspManager = new CSPManager({ enableReporting: true });

      const mockViolation = {
        blockedURI: "https://evil.com/script.js",
        violatedDirective: "script-src",
      };

      window.addEventListener("csp:violation", (event) => {
        expect(event.detail.blockedURI).toBe("https://evil.com/script.js");
        done();
      });

      cspManager.handleViolation(mockViolation);
    });

    test("should maintain maximum violations limit", () => {
      cspManager = new CSPManager({ enableReporting: true });
      cspManager.maxViolations = 3;

      // Add violations beyond limit
      for (let i = 0; i < 5; i++) {
        cspManager.handleViolation({
          blockedURI: `https://evil${i}.com/script.js`,
          violatedDirective: "script-src",
        });
      }

      expect(cspManager.violations).toHaveLength(3);
      expect(cspManager.violations[0].blockedURI).toBe(
        "https://evil2.com/script.js",
      ); // First two removed
    });
  });

  describe("Nonced Element Creation", () => {
    test("should create script elements with nonces", () => {
      cspManager = new CSPManager({ enableNonces: true });
      const script = cspManager.createNoncedScript('console.log("test");');

      expect(script.tagName).toBe("SCRIPT");
      expect(script.nonce).toBe(cspManager.getCurrentNonce());
      expect(script.textContent).toBe('console.log("test");');
      expect(script.type).toBe("text/javascript");
    });

    test("should create style elements with nonces", () => {
      cspManager = new CSPManager({ enableNonces: true });
      const style = cspManager.createNoncedStyle("body { color: red; }");

      expect(style.tagName).toBe("STYLE");
      expect(style.nonce).toBe(cspManager.getCurrentNonce());
      expect(style.textContent).toBe("body { color: red; }");
    });

    test("should execute scripts with nonces", (done) => {
      cspManager = new CSPManager({ enableNonces: true });

      const scriptContent = 'window.testResult = "executed";';

      cspManager.executeNoncedScript(scriptContent, () => {
        expect(window.testResult).toBe("executed");
        done();
      });
    });

    test("should handle script execution errors", (done) => {
      cspManager = new CSPManager({ enableNonces: true });

      const invalidScript = "invalid javascript syntax!!!";

      cspManager.executeNoncedScript(invalidScript, (error) => {
        expect(error).toBeDefined();
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          "[CSPManager] Script execution error:",
          expect.any(Error),
        );
        done();
      });
    });

    test("should throw error when creating elements in non-browser environment", () => {
      // Temporarily remove document
      const originalDocument = global.document;
      global.document = undefined;

      cspManager = new CSPManager({ enableNonces: true });

      expect(() => {
        cspManager.createNoncedScript("test");
      }).toThrow("Cannot create script element in non-browser environment");

      expect(() => {
        cspManager.createNoncedStyle("test");
      }).toThrow("Cannot create style element in non-browser environment");

      // Restore document
      global.document = originalDocument;
    });
  });

  describe("XSS Prevention Integration", () => {
    test("should prevent inline script execution without nonce in strict mode", () => {
      cspManager = new CSPManager({
        environment: "production",
        strictMode: true,
        enableNonces: true,
      });

      const header = cspManager.generateCSPHeader();

      // Should not allow unsafe-inline
      expect(header).not.toContain("'unsafe-inline'");

      // Should only allow nonce-based scripts
      expect(header).toContain(`'nonce-${cspManager.getCurrentNonce()}'`);
    });

    test("should block scripts from untrusted domains", () => {
      cspManager = new CSPManager({ environment: "production" });
      const policies = cspManager.getCSPPolicies();
      const scriptSrc = policies["script-src"];

      // Should not allow scripts from arbitrary domains
      expect(scriptSrc).not.toContain("*");
      expect(scriptSrc).not.toContain("data:");

      // Should only allow trusted sources
      expect(scriptSrc).toContain("'self'");
      expect(scriptSrc).toContain("https://cdn.jsdelivr.net");
      expect(scriptSrc).toContain("https://cdnjs.cloudflare.com");
    });

    test("should prevent object and embed attacks", () => {
      cspManager = new CSPManager();
      const policies = cspManager.getCSPPolicies();

      expect(policies["object-src"]).toEqual(["'none'"]);
    });

    test("should prevent clickjacking attacks", () => {
      cspManager = new CSPManager();
      const policies = cspManager.getCSPPolicies();

      expect(policies["frame-ancestors"]).toEqual(["'none'"]);
    });
  });

  describe("Configuration Updates", () => {
    test("should update configuration and reapply policies", () => {
      cspManager = new CSPManager({ environment: "development" });

      const originalHeader = cspManager.generateCSPHeader();
      expect(originalHeader).toContain("'unsafe-inline'");

      cspManager.updateConfig({ environment: "production", strictMode: true });

      const newHeader = cspManager.generateCSPHeader();
      expect(newHeader).not.toContain("'unsafe-inline'");
      expect(consoleInfoSpy).toHaveBeenCalledWith(
        "[CSPManager] Configuration updated:",
        expect.any(Object),
      );
    });

    test("should handle nonce configuration changes", () => {
      jest.useFakeTimers();
      cspManager = new CSPManager({ enableNonces: false });

      expect(cspManager.nonceTimer).toBeNull();

      cspManager.updateConfig({ enableNonces: true });

      expect(cspManager.nonceTimer).toBeTruthy();
      expect(cspManager.getCurrentNonce()).toBeTruthy();

      jest.useRealTimers();
    });
  });

  describe("Status and Monitoring", () => {
    test("should provide comprehensive status information", () => {
      cspManager = new CSPManager({
        environment: "production",
        enableNonces: true,
        enableReporting: true,
        strictMode: true,
      });

      const status = cspManager.getStatus();

      expect(status.environment).toBe("production");
      expect(status.enableNonces).toBe(true);
      expect(status.currentNonce).toBeTruthy();
      expect(status.enableReporting).toBe(true);
      expect(status.strictMode).toBe(true);
      expect(status.violationCount).toBe(0);
      expect(status.lastViolation).toBeNull();
    });

    test("should retrieve and clear violations", () => {
      cspManager = new CSPManager({ enableReporting: true });

      // Add some violations
      cspManager.handleViolation({
        blockedURI: "test1",
        violatedDirective: "script-src",
      });
      cspManager.handleViolation({
        blockedURI: "test2",
        violatedDirective: "style-src",
      });

      let violations = cspManager.getViolations();
      expect(violations).toHaveLength(2);

      cspManager.clearViolations();
      violations = cspManager.getViolations();
      expect(violations).toHaveLength(0);
    });

    test("should limit returned violations", () => {
      cspManager = new CSPManager({ enableReporting: true });

      // Add many violations
      for (let i = 0; i < 15; i++) {
        cspManager.handleViolation({
          blockedURI: `test${i}`,
          violatedDirective: "script-src",
        });
      }

      const recent = cspManager.getViolations(5);
      expect(recent).toHaveLength(5);
      expect(recent[4].blockedURI).toBe("test14"); // Most recent
    });
  });

  describe("Cleanup and Destruction", () => {
    test("should properly destroy CSP manager", () => {
      cspManager = new CSPManager({ enableNonces: true });

      // Add a meta tag
      expect(
        document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
      ).toBeTruthy();

      cspManager.destroy();

      expect(
        document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
      ).toBeFalsy();
      expect(cspManager.violations).toEqual([]);
      expect(consoleInfoSpy).toHaveBeenCalledWith("[CSPManager] Destroyed");
    });

    test("should stop nonce refresh on destroy", () => {
      jest.useFakeTimers();
      cspManager = new CSPManager({ enableNonces: true });

      expect(cspManager.nonceTimer).toBeTruthy();

      cspManager.destroy();

      expect(cspManager.nonceTimer).toBeNull();

      jest.useRealTimers();
    });
  });

  describe("Performance and Security Edge Cases", () => {
    test("should handle rapid nonce generation without collisions", () => {
      cspManager = new CSPManager();
      const nonces = new Set();

      // Generate many nonces rapidly
      for (let i = 0; i < 1000; i++) {
        const nonce = cspManager.generateNonce();
        expect(nonces.has(nonce)).toBe(false);
        nonces.add(nonce);
      }

      expect(nonces.size).toBe(1000);
    });

    test("should handle violation reporting failures gracefully", async () => {
      fetch.mockRejectedValue(new Error("Network error"));
      cspManager = new CSPManager({ enableReporting: true });

      await cspManager.reportViolation({ blockedURI: "test" });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "[CSPManager] Failed to report CSP violation:",
        expect.any(Error),
      );
    });

    test("should maintain security with disabled nonces", () => {
      cspManager = new CSPManager({ enableNonces: false, strictMode: true });
      const policies = cspManager.getCSPPolicies();

      const scriptSrc = policies["script-src"];
      expect(scriptSrc).not.toContain("'nonce-");
      expect(scriptSrc).not.toContain("'unsafe-inline'");
      expect(scriptSrc).not.toContain("'unsafe-eval'");
    });

    test("should handle multiple configuration updates efficiently", () => {
      cspManager = new CSPManager();

      // Rapidly update configuration
      for (let i = 0; i < 10; i++) {
        cspManager.updateConfig({
          environment: i % 2 === 0 ? "development" : "production",
        });
      }

      expect(() => cspManager.generateCSPHeader()).not.toThrow();
      expect(cspManager.config.environment).toBe("production");
    });
  });
});
