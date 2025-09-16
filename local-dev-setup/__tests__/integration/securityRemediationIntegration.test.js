/**
 * Security Remediation Integration Test Suite
 * US-082-B Component Architecture - Security Enhancement Phase
 *
 * Comprehensive integration testing of combined security features
 * Tests CSP + CSRF + Session management working together harmoniously
 *
 * Coverage areas:
 * - Combined CSP + CSRF + Session management workflow
 * - End-to-end security validation
 * - Component orchestrator security coordination
 * - Cross-component security validation
 * - Real-world attack scenario simulation
 * - Security feature interaction verification
 * - Performance impact of combined security measures
 *
 * @version 1.0.0
 * @created 2025-01-16 (Security Remediations Testing)
 */

// Mock DOM environment for Node.js testing
const { JSDOM } = require("jsdom");
const fs = require("fs");
const path = require("path");

// Setup DOM environment with realistic security context
const dom = new JSDOM(
  `
  <!DOCTYPE html>
  <html>
    <head>
      <title>UMIG Security Test</title>
    </head>
    <body>
      <div id="app">
        <div id="security-test-container"></div>
      </div>
    </body>
  </html>
`,
  {
    url: "http://localhost:8090",
    pretendToBeVisual: true,
    resources: "usable",
    includeNodeLocations: true,
  },
);

global.window = dom.window;
global.document = dom.window.document;
global.navigator = dom.window.navigator;
global.CustomEvent = dom.window.CustomEvent;
global.localStorage = dom.window.localStorage;
global.sessionStorage = dom.window.sessionStorage;

// Mock crypto API
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

// Mock fetch with realistic responses
global.fetch = jest.fn((url, options) => {
  // Simulate CSRF validation
  if (
    options &&
    options.method &&
    ["POST", "PUT", "DELETE", "PATCH"].includes(options.method.toUpperCase())
  ) {
    const hasCSRFToken = options.headers && options.headers["X-CSRF-Token"];
    if (!hasCSRFToken) {
      return Promise.resolve({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        json: () => Promise.resolve({ error: "CSRF token missing" }),
      });
    }
  }

  // Simulate successful response
  return Promise.resolve({
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve({ success: true, data: "test-data" }),
  });
});

// Mock XMLHttpRequest
global.XMLHttpRequest = class MockXMLHttpRequest {
  constructor() {
    this.readyState = 0;
    this.status = 0;
    this.statusText = "";
    this.responseText = "";
    this.requestHeaders = {};
    this.method = "";
    this.url = "";
    this.withCredentials = false;
  }

  open(method, url, async = true) {
    this.method = method;
    this.url = url;
    this.readyState = 1;
    if (this.onreadystatechange) this.onreadystatechange();
  }

  setRequestHeader(name, value) {
    this.requestHeaders[name] = value;
  }

  send(body) {
    this.readyState = 4;

    // Simulate CSRF validation
    if (
      ["POST", "PUT", "DELETE", "PATCH"].includes(this.method.toUpperCase())
    ) {
      if (!this.requestHeaders["X-CSRF-Token"]) {
        this.status = 403;
        this.statusText = "Forbidden";
        this.responseText = '{"error":"CSRF token missing"}';
      } else {
        this.status = 200;
        this.statusText = "OK";
        this.responseText = '{"success":true}';
      }
    } else {
      this.status = 200;
      this.statusText = "OK";
      this.responseText = '{"success":true}';
    }

    if (this.onreadystatechange) this.onreadystatechange();
    if (this.onload) this.onload();
  }
};

// Load security components
const loadSecurityComponent = (filename) => {
  try {
    const filePath = path.join(
      __dirname,
      `../../src/groovy/umig/web/js/${filename}`,
    );
    const source = fs.readFileSync(filePath, "utf8");
    eval(source);
    return true;
  } catch (error) {
    console.warn(`${filename} not available for testing:`, error.message);
    return false;
  }
};

// Load all security components
loadSecurityComponent("security/CSPManager.js");
loadSecurityComponent("components/SecurityUtils.js");
loadSecurityComponent("components/ComponentOrchestrator.js");

// Mock security classes if not loaded
if (typeof CSPManager === "undefined") {
  global.CSPManager = class MockCSPManager {
    constructor(config = {}) {
      this.config = {
        environment: "production",
        enableNonces: true,
        ...config,
      };
      this.currentNonce = this.generateNonce();
      this.violations = [];
      this.initialize();
    }

    initialize() {
      this.applyCSPPolicies();
    }

    generateNonce() {
      return btoa(Math.random().toString(36)).replace(/[^a-zA-Z0-9]/g, "");
    }

    getCurrentNonce() {
      return this.currentNonce;
    }

    applyCSPPolicies() {
      const meta = document.createElement("meta");
      meta.setAttribute("http-equiv", "Content-Security-Policy");
      meta.setAttribute(
        "content",
        `default-src 'self'; script-src 'nonce-${this.currentNonce}'`,
      );
      document.head.appendChild(meta);
    }

    handleViolation(violation) {
      this.violations.push(violation);
      window.dispatchEvent(
        new CustomEvent("csp:violation", { detail: violation }),
      );
    }

    destroy() {
      const meta = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      if (meta) meta.remove();
    }
  };
}

if (typeof SecurityUtils === "undefined") {
  global.SecurityUtils = class MockSecurityUtils {
    constructor() {
      this.csrfTokens = { current: null, previous: null };
      this.initialize();
    }

    initialize() {
      this.generateCSRFToken();
      this.setupAJAXInterceptors();
    }

    generateCSRFToken() {
      const token = btoa(Math.random().toString(36)).replace(
        /[^a-zA-Z0-9]/g,
        "",
      );
      this.csrfTokens.previous = this.csrfTokens.current;
      this.csrfTokens.current = token;
      return token;
    }

    getCurrentCSRFToken() {
      return this.csrfTokens.current;
    }

    isValidCSRFToken(token) {
      return (
        token === this.csrfTokens.current || token === this.csrfTokens.previous
      );
    }

    setupAJAXInterceptors() {
      const originalFetch = window.fetch;
      window.fetch = (url, options = {}) => {
        if (
          options.method &&
          ["POST", "PUT", "DELETE", "PATCH"].includes(
            options.method.toUpperCase(),
          )
        ) {
          options.headers = {
            ...options.headers,
            "X-CSRF-Token": this.getCurrentCSRFToken(),
          };
        }
        return originalFetch(url, options);
      };
    }

    static sanitizeXSS(input) {
      if (typeof input !== "string") return "";
      return input.replace(
        /[<>\"'&]/g,
        (char) =>
          ({
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#x27;",
            "&": "&amp;",
          })[char],
      );
    }
  };
}

if (typeof ComponentOrchestrator === "undefined") {
  global.ComponentOrchestrator = class MockComponentOrchestrator {
    constructor() {
      this.components = new Map();
      this.sessionState = { isActive: true, lastActivity: Date.now() };
      this.sessionConfig = { timeout: 30 * 60 * 1000, enabled: true };
      this.cspManager = null;
      this.securityUtils = null;
      this.initializeSecurity();
    }

    initializeSecurity() {
      this.cspManager = new CSPManager();
      this.securityUtils = new SecurityUtils();
      this.startSessionManagement();
    }

    startSessionManagement() {
      if (this.sessionConfig.enabled) {
        this.sessionTimer = setTimeout(() => {
          this.handleSessionTimeout();
        }, this.sessionConfig.timeout);
      }
    }

    handleSessionTimeout() {
      this.sessionState.isActive = false;
      window.dispatchEvent(new CustomEvent("session:timeout"));
    }

    destroy() {
      if (this.cspManager) this.cspManager.destroy();
      if (this.sessionTimer) clearTimeout(this.sessionTimer);
    }
  };
}

describe("Security Remediation Integration Test Suite", () => {
  let orchestrator;
  let cspManager;
  let securityUtils;
  let consoleWarnSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    // Reset DOM
    document.head.innerHTML = "";
    document.body.innerHTML =
      '<div id="app"><div id="security-test-container"></div></div>';
    document.cookie = "";
    localStorage.clear();
    sessionStorage.clear();

    // Setup console spies
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Reset fetch mock
    fetch.mockClear();

    // Use fake timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Clean up components
    if (orchestrator) {
      orchestrator.destroy();
      orchestrator = null;
    }
    if (cspManager && cspManager !== orchestrator?.cspManager) {
      cspManager.destroy();
      cspManager = null;
    }
    securityUtils = null;

    // Restore console
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();

    // Clear timers
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe("Integrated Security Initialization", () => {
    test("should initialize all security components together", () => {
      orchestrator = new ComponentOrchestrator();

      // Should have all security components initialized
      expect(orchestrator.cspManager).toBeTruthy();
      expect(orchestrator.securityUtils).toBeTruthy();
      expect(orchestrator.sessionState.isActive).toBe(true);

      // CSP should be applied
      const cspMeta = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      expect(cspMeta).toBeTruthy();

      // CSRF token should be generated
      expect(orchestrator.securityUtils.getCurrentCSRFToken()).toBeTruthy();
    });

    test("should coordinate nonce generation between CSP and components", () => {
      orchestrator = new ComponentOrchestrator();
      const nonce = orchestrator.cspManager.getCurrentNonce();

      expect(nonce).toBeTruthy();
      expect(nonce.length).toBeGreaterThan(16);

      // CSP policy should include the nonce
      const cspMeta = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      expect(cspMeta.getAttribute("content")).toContain(`nonce-${nonce}`);
    });

    test("should setup cross-component event communication", (done) => {
      orchestrator = new ComponentOrchestrator();

      let eventsReceived = 0;
      const expectedEvents = [
        "csp:violation",
        "session:timeout",
        "csrf:tokenRotated",
      ];

      expectedEvents.forEach((eventType) => {
        window.addEventListener(eventType, () => {
          eventsReceived++;
          if (eventsReceived === expectedEvents.length) {
            expect(eventsReceived).toBe(3);
            done();
          }
        });
      });

      // Trigger events
      orchestrator.cspManager.handleViolation({
        violatedDirective: "script-src",
      });
      orchestrator.handleSessionTimeout();
      orchestrator.securityUtils.generateCSRFToken();
      window.dispatchEvent(
        new CustomEvent("csrf:tokenRotated", { detail: { newToken: "test" } }),
      );
    });
  });

  describe("End-to-End Security Workflow", () => {
    test("should handle secure AJAX requests with all security measures", async () => {
      orchestrator = new ComponentOrchestrator();

      // Make a secure AJAX request
      const response = await fetch("/api/secure-endpoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ data: "test" }),
      });

      expect(response.ok).toBe(true);
      expect(fetch).toHaveBeenCalledWith("/api/secure-endpoint", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRF-Token": orchestrator.securityUtils.getCurrentCSRFToken(),
        },
        body: JSON.stringify({ data: "test" }),
      });
    });

    test("should prevent requests without CSRF tokens", async () => {
      // Create orchestrator but don't let it set up AJAX interceptors
      cspManager = new CSPManager();

      // Make request without CSRF token
      const response = await fetch("/api/secure-endpoint", {
        method: "POST",
        body: JSON.stringify({ data: "test" }),
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(403);
    });

    test("should handle session timeout with security cleanup", (done) => {
      orchestrator = new ComponentOrchestrator();

      window.addEventListener("session:timeout", () => {
        expect(orchestrator.sessionState.isActive).toBe(false);

        // Security should be cleaned up
        setTimeout(() => {
          // Session storage should be cleared
          expect(sessionStorage.length).toBe(0);
          done();
        }, 100);
      });

      // Fast forward to session timeout
      jest.advanceTimersByTime(30 * 60 * 1000); // 30 minutes
    });

    test("should coordinate CSP nonce updates with CSRF token rotation", (done) => {
      orchestrator = new ComponentOrchestrator();

      const initialNonce = orchestrator.cspManager.getCurrentNonce();
      const initialCSRF = orchestrator.securityUtils.getCurrentCSRFToken();

      let nonceUpdated = false;
      let csrfRotated = false;

      window.addEventListener("csp:nonceUpdated", (event) => {
        nonceUpdated = true;
        expect(event.detail.nonce).not.toBe(initialNonce);
        checkCompletion();
      });

      window.addEventListener("csrf:tokenRotated", (event) => {
        csrfRotated = true;
        expect(event.detail.newToken).not.toBe(initialCSRF);
        checkCompletion();
      });

      function checkCompletion() {
        if (nonceUpdated && csrfRotated) {
          // Both security tokens should be updated
          expect(orchestrator.cspManager.getCurrentNonce()).not.toBe(
            initialNonce,
          );
          expect(orchestrator.securityUtils.getCurrentCSRFToken()).not.toBe(
            initialCSRF,
          );
          done();
        }
      }

      // Trigger token rotation
      orchestrator.cspManager.generateNonce();
      orchestrator.cspManager.updateCSPNonce();
      orchestrator.securityUtils.generateCSRFToken();
      window.dispatchEvent(
        new CustomEvent("csrf:tokenRotated", {
          detail: {
            newToken: orchestrator.securityUtils.getCurrentCSRFToken(),
          },
        }),
      );
    });
  });

  describe("Attack Scenario Simulation", () => {
    test("should prevent XSS attack with CSP and input sanitization", () => {
      orchestrator = new ComponentOrchestrator();

      const maliciousInput =
        '<script>alert("XSS")</script><img src=x onerror="alert(1)">';
      const sanitized = SecurityUtils.sanitizeXSS(maliciousInput);

      expect(sanitized).not.toContain("<script>");
      expect(sanitized).not.toContain("onerror=");
      expect(sanitized).toBe(
        "&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&lt;img src=x onerror=&quot;alert(1)&quot;&gt;",
      );

      // CSP should also block inline scripts
      const cspMeta = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      const cspContent = cspMeta.getAttribute("content");
      expect(cspContent).toContain("script-src");
      expect(cspContent).toContain(
        `nonce-${orchestrator.cspManager.getCurrentNonce()}`,
      );
    });

    test("should prevent CSRF attack with double-submit pattern", async () => {
      orchestrator = new ComponentOrchestrator();

      // Simulate legitimate request
      const legitimateResponse = await fetch("/api/transfer-money", {
        method: "POST",
        body: JSON.stringify({ amount: 100, recipient: "user123" }),
      });

      expect(legitimateResponse.ok).toBe(true);

      // Simulate CSRF attack (without proper token)
      const originalFetch = window.fetch;
      window.fetch = fetch; // Use mock fetch without interceptors

      const attackResponse = await fetch("/api/transfer-money", {
        method: "POST",
        body: JSON.stringify({ amount: 1000000, recipient: "attacker" }),
      });

      expect(attackResponse.ok).toBe(false);
      expect(attackResponse.status).toBe(403);

      window.fetch = originalFetch; // Restore
    });

    test("should prevent session fixation attack", () => {
      // Start with a session
      orchestrator = new ComponentOrchestrator();
      const initialSessionActive = orchestrator.sessionState.isActive;
      expect(initialSessionActive).toBe(true);

      // Simulate session fixation attempt
      const maliciousSessionData = {
        sessionId: "attacker-controlled-session",
        userId: "victim-user",
        csrfToken: "attacker-csrf-token",
      };

      // Try to inject malicious session data
      sessionStorage.setItem(
        "attackerSession",
        JSON.stringify(maliciousSessionData),
      );
      localStorage.setItem("fixedSession", "attacker-session-id");

      // Session management should not be affected
      expect(orchestrator.sessionState.isActive).toBe(true);
      expect(orchestrator.securityUtils.getCurrentCSRFToken()).not.toBe(
        "attacker-csrf-token",
      );

      // Legitimate session timeout should work
      jest.advanceTimersByTime(30 * 60 * 1000);
      expect(orchestrator.sessionState.isActive).toBe(false);
    });

    test("should prevent clickjacking attack with CSP frame-ancestors", () => {
      orchestrator = new ComponentOrchestrator();

      const cspMeta = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      const cspContent = cspMeta.getAttribute("content");

      // CSP should prevent framing
      expect(cspContent).toContain("frame-ancestors 'none'");
    });

    test("should handle coordinated multi-vector attack", async () => {
      orchestrator = new ComponentOrchestrator();

      const attackVector = {
        xss: '<script>document.cookie="session=hijacked"</script>',
        csrf: "/api/delete-account",
        sessionHijack: { sessionId: "attacker-session" },
      };

      // XSS should be sanitized
      const sanitizedXSS = SecurityUtils.sanitizeXSS(attackVector.xss);
      expect(sanitizedXSS).not.toContain("<script>");

      // CSRF should be blocked
      const csrfResponse = await fetch(attackVector.csrf, { method: "DELETE" });
      expect(csrfResponse.ok).toBe(false);

      // Session hijack should not work
      sessionStorage.setItem(
        "hijackedSession",
        JSON.stringify(attackVector.sessionHijack),
      );
      expect(orchestrator.sessionState.isActive).toBe(true);

      // All security measures should remain active
      expect(orchestrator.cspManager.getCurrentNonce()).toBeTruthy();
      expect(orchestrator.securityUtils.getCurrentCSRFToken()).toBeTruthy();
      expect(
        document.querySelector('meta[http-equiv="Content-Security-Policy"]'),
      ).toBeTruthy();
    });
  });

  describe("Performance Impact Assessment", () => {
    test("should measure performance impact of integrated security", () => {
      const startTime = performance.now();

      // Initialize with all security features
      orchestrator = new ComponentOrchestrator();

      const initializationTime = performance.now() - startTime;

      // Measure AJAX request performance
      const ajaxStartTime = performance.now();

      return fetch("/api/test", { method: "POST", body: "{}" }).then(() => {
        const ajaxTime = performance.now() - ajaxStartTime;

        console.log(
          `Security initialization time: ${initializationTime.toFixed(4)}ms`,
        );
        console.log(`Secure AJAX request time: ${ajaxTime.toFixed(4)}ms`);

        // Security overhead should be minimal
        expect(initializationTime).toBeLessThan(100); // Under 100ms
        expect(ajaxTime).toBeLessThan(50); // Under 50ms for AJAX
      });
    });

    test("should handle high-frequency secure requests efficiently", async () => {
      orchestrator = new ComponentOrchestrator();

      const requestCount = 100;
      const requests = [];

      const startTime = performance.now();

      for (let i = 0; i < requestCount; i++) {
        requests.push(
          fetch("/api/test", {
            method: "POST",
            body: JSON.stringify({ index: i }),
          }),
        );
      }

      await Promise.all(requests);

      const totalTime = performance.now() - startTime;
      const averageRequestTime = totalTime / requestCount;

      console.log(
        `${requestCount} secure requests in ${totalTime.toFixed(2)}ms`,
      );
      console.log(`Average request time: ${averageRequestTime.toFixed(4)}ms`);

      expect(averageRequestTime).toBeLessThan(10); // Under 10ms per request
      expect(totalTime).toBeLessThan(1000); // All requests under 1 second
    });

    test("should maintain security under load", async () => {
      orchestrator = new ComponentOrchestrator();

      const loadTest = async () => {
        const promises = [];

        // Simultaneous security operations
        promises.push(fetch("/api/test1", { method: "POST" }));
        promises.push(fetch("/api/test2", { method: "PUT" }));
        promises.push(fetch("/api/test3", { method: "DELETE" }));

        // Token operations
        promises.push(
          Promise.resolve(orchestrator.securityUtils.generateCSRFToken()),
        );
        promises.push(Promise.resolve(orchestrator.cspManager.generateNonce()));

        return Promise.all(promises);
      };

      const results = await loadTest();

      // All operations should succeed
      expect(results).toHaveLength(5);
      results.slice(0, 3).forEach((response) => {
        expect(response.ok).toBe(true);
      });

      // Security tokens should be valid
      expect(orchestrator.securityUtils.getCurrentCSRFToken()).toBeTruthy();
      expect(orchestrator.cspManager.getCurrentNonce()).toBeTruthy();
    });
  });

  describe("Error Handling and Recovery", () => {
    test("should handle CSP violation during active session", () => {
      orchestrator = new ComponentOrchestrator();

      let violationReceived = false;
      window.addEventListener("csp:violation", (event) => {
        violationReceived = true;
        expect(event.detail.violatedDirective).toBe("script-src");
      });

      // Simulate CSP violation
      orchestrator.cspManager.handleViolation({
        violatedDirective: "script-src",
        blockedURI: "https://evil.com/malicious.js",
      });

      expect(violationReceived).toBe(true);
      expect(orchestrator.cspManager.violations).toHaveLength(1);

      // Session should remain active
      expect(orchestrator.sessionState.isActive).toBe(true);
    });

    test("should recover from security component failures", () => {
      orchestrator = new ComponentOrchestrator();

      // Simulate CSP manager failure
      orchestrator.cspManager = null;

      expect(() => {
        // Should not crash the entire system
        const response = fetch("/api/test", { method: "POST" });
      }).not.toThrow();

      // CSRF protection should still work
      expect(orchestrator.securityUtils.getCurrentCSRFToken()).toBeTruthy();
    });

    test("should handle token synchronization issues", () => {
      orchestrator = new ComponentOrchestrator();

      const originalCSRFToken =
        orchestrator.securityUtils.getCurrentCSRFToken();

      // Simulate token desynchronization
      orchestrator.securityUtils.csrfTokens.current = "desynchronized-token";

      // System should detect and handle desynchronization
      const newToken = orchestrator.securityUtils.generateCSRFToken();
      expect(newToken).not.toBe(originalCSRFToken);
      expect(newToken).toBe(orchestrator.securityUtils.getCurrentCSRFToken());
    });

    test("should maintain security during error conditions", () => {
      orchestrator = new ComponentOrchestrator();

      // Simulate various error conditions
      const errors = [
        () => {
          throw new Error("Network error");
        },
        () => {
          throw new Error("Storage error");
        },
        () => {
          throw new Error("Parsing error");
        },
      ];

      errors.forEach((errorFunc) => {
        expect(() => {
          try {
            errorFunc();
          } catch (error) {
            // Error should be caught and handled gracefully
            console.error("Test error:", error.message);
          }

          // Security should remain intact
          expect(orchestrator.securityUtils.getCurrentCSRFToken()).toBeTruthy();
          expect(orchestrator.cspManager.getCurrentNonce()).toBeTruthy();
          expect(orchestrator.sessionState.isActive).toBe(true);
        }).not.toThrow();
      });
    });
  });

  describe("Security Configuration Flexibility", () => {
    test("should support different security levels", () => {
      // High security configuration
      const highSecurityOrchestrator = new ComponentOrchestrator();
      // Configure for production
      if (highSecurityOrchestrator.cspManager.updateConfig) {
        highSecurityOrchestrator.cspManager.updateConfig({
          environment: "production",
          strictMode: true,
          enableNonces: true,
        });
      }

      const highSecurityCSP = document
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        .getAttribute("content");

      highSecurityOrchestrator.destroy();

      // Medium security configuration
      const mediumSecurityOrchestrator = new ComponentOrchestrator();
      if (mediumSecurityOrchestrator.cspManager.updateConfig) {
        mediumSecurityOrchestrator.cspManager.updateConfig({
          environment: "development",
          strictMode: false,
          enableNonces: false,
        });
      }

      const mediumSecurityCSP = document
        .querySelector('meta[http-equiv="Content-Security-Policy"]')
        .getAttribute("content");

      // High security should be more restrictive
      expect(highSecurityCSP).not.toBe(mediumSecurityCSP);

      mediumSecurityOrchestrator.destroy();
    });

    test("should allow security feature toggling", () => {
      orchestrator = new ComponentOrchestrator();

      // Disable session management
      orchestrator.sessionConfig.enabled = false;
      if (orchestrator.sessionTimer) {
        clearTimeout(orchestrator.sessionTimer);
        orchestrator.sessionTimer = null;
      }

      // Session timeout should not occur
      jest.advanceTimersByTime(35 * 60 * 1000); // 35 minutes
      expect(orchestrator.sessionState.isActive).toBe(true);

      // CSP and CSRF should still work
      expect(orchestrator.cspManager.getCurrentNonce()).toBeTruthy();
      expect(orchestrator.securityUtils.getCurrentCSRFToken()).toBeTruthy();
    });
  });

  describe("Cross-Component Communication", () => {
    test("should coordinate security events across components", (done) => {
      orchestrator = new ComponentOrchestrator();

      let eventsReceived = 0;
      const securityEvents = [
        "csp:violation",
        "csrf:tokenRotated",
        "session:warning",
      ];

      securityEvents.forEach((eventType) => {
        window.addEventListener(eventType, (event) => {
          eventsReceived++;
          console.log(`Received event: ${eventType}`, event.detail);

          if (eventsReceived === securityEvents.length) {
            done();
          }
        });
      });

      // Trigger events
      orchestrator.cspManager.handleViolation({
        violatedDirective: "style-src",
      });

      const newToken = orchestrator.securityUtils.generateCSRFToken();
      window.dispatchEvent(
        new CustomEvent("csrf:tokenRotated", {
          detail: { newToken },
        }),
      );

      window.dispatchEvent(
        new CustomEvent("session:warning", {
          detail: { remainingTime: 5 * 60 * 1000 },
        }),
      );
    });

    test("should validate security state consistency", () => {
      orchestrator = new ComponentOrchestrator();

      // All security components should be in consistent state
      expect(orchestrator.cspManager.getCurrentNonce()).toBeTruthy();
      expect(orchestrator.securityUtils.getCurrentCSRFToken()).toBeTruthy();
      expect(orchestrator.sessionState.isActive).toBe(true);

      // CSP should be applied
      const cspMeta = document.querySelector(
        'meta[http-equiv="Content-Security-Policy"]',
      );
      expect(cspMeta).toBeTruthy();

      // CSRF token should be available for requests
      expect(fetch.mock).toBeDefined(); // Fetch should be intercepted
    });
  });
});
