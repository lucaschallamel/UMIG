// Unit Test Setup - No external dependencies
console.log("🧪 Setting up Unit Test environment...");

// TD-012 Critical Fix: Early SecurityUtils initialization
// Ensures SecurityUtils is available before any component tests run
// This prevents race conditions and module loading conflicts
try {
  const SecurityUtils = require("./__tests__/__mocks__/SecurityUtils.wrapper.js");
  global.SecurityUtils = SecurityUtils;

  // Also set on window if jsdom is available
  if (typeof window !== "undefined") {
    window.SecurityUtils = SecurityUtils;
  }

  console.log("✅ SecurityUtils wrapper initialized early for unit tests");
} catch (error) {
  console.warn(
    "⚠️ SecurityUtils wrapper initialization failed:",
    error.message,
  );
}

// TextEncoder/TextDecoder polyfills for Node.js environment
const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Also set on window object if it exists (jsdom environment)
if (typeof window !== "undefined") {
  window.TextEncoder = TextEncoder;
  window.TextDecoder = TextDecoder;
}

// Performance API polyfill for components using performance.mark() and performance.measure()
const mockPerformance = {
  mark: jest.fn(),
  measure: jest.fn(),
  now: jest.fn(() => Date.now()),
  getEntriesByName: jest.fn(() => []),
  getEntriesByType: jest.fn(() => []),
  clearMarks: jest.fn(),
  clearMeasures: jest.fn(),
  timing: {},
  navigation: {},
};

// Set both global and window performance for maximum compatibility
global.performance = mockPerformance;
Object.defineProperty(global, "performance", {
  value: mockPerformance,
  writable: true,
  configurable: true,
});

// Also set on window object if it exists (jsdom environment)
if (typeof window !== "undefined") {
  window.performance = mockPerformance;
}

// Complete ResizeObserver mock with callback functionality
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
    this.observations = [];
  }

  observe(target) {
    this.observations.push(target);
    // Simulate initial callback with realistic dimensions
    if (this.callback) {
      setTimeout(() => {
        this.callback(
          [
            {
              target,
              contentRect: {
                width: 1024,
                height: 768,
                top: 0,
                left: 0,
                right: 1024,
                bottom: 768,
              },
              borderBoxSize: [
                {
                  blockSize: 768,
                  inlineSize: 1024,
                },
              ],
              contentBoxSize: [
                {
                  blockSize: 768,
                  inlineSize: 1024,
                },
              ],
            },
          ],
          this,
        );
      }, 0);
    }
  }

  unobserve(target) {
    this.observations = this.observations.filter((obs) => obs !== target);
  }

  disconnect() {
    this.observations = [];
  }
};

// Complete IntersectionObserver mock with callback functionality
global.IntersectionObserver = class IntersectionObserver {
  constructor(callback, options = {}) {
    this.callback = callback;
    this.options = options;
    this.observations = [];
  }

  observe(target) {
    this.observations.push(target);
    // Simulate initial intersection event
    if (this.callback) {
      setTimeout(() => {
        this.callback(
          [
            {
              target,
              isIntersecting: true,
              intersectionRatio: 1.0,
              boundingClientRect: {
                width: 1024,
                height: 768,
                top: 0,
                left: 0,
                right: 1024,
                bottom: 768,
              },
              intersectionRect: {
                width: 1024,
                height: 768,
                top: 0,
                left: 0,
                right: 1024,
                bottom: 768,
              },
              rootBounds: {
                width: 1024,
                height: 768,
                top: 0,
                left: 0,
                right: 1024,
                bottom: 768,
              },
            },
          ],
          this,
        );
      }, 0);
    }
  }

  unobserve(target) {
    this.observations = this.observations.filter((obs) => obs !== target);
  }

  disconnect() {
    this.observations = [];
  }
};

// SecurityUtils mock - Direct inline definition to avoid require issues
const SecurityUtilsMock = {
  sanitizeInput(input) {
    if (typeof input !== "string") return input;
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  },

  sanitizeHTML(html) {
    if (typeof html !== "string") return html;
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/javascript:/gi, "")
      .replace(/on\w+\s*=/gi, "");
  },

  validateInput(input, type = "text", options = {}) {
    if (!input && !options.required) {
      return {
        isValid: true,
        valid: true,
        sanitized: input,
        value: input,
        errors: [],
      };
    }

    const sanitized = this.sanitizeInput(input);
    const isValid = sanitized === input;

    return {
      isValid: isValid,
      valid: isValid,
      sanitized: sanitized,
      value: isValid ? sanitized : input,
      originalLength: input ? input.length : 0,
      sanitizedLength: sanitized ? sanitized.length : 0,
      type: type,
      errors: isValid ? [] : ["Input contains potentially unsafe content"],
    };
  },

  validateInteger(value, options = {}) {
    const config = {
      min: null,
      max: null,
      required: true,
      ...options,
    };

    // If value is null/undefined and not required, return valid
    if ((value === null || value === undefined) && !config.required) {
      return {
        isValid: true,
        value: null,
        errors: [],
      };
    }

    // Convert to integer
    const intValue = parseInt(value, 10);
    const errors = [];

    // Check if it's a valid integer
    if (isNaN(intValue) || intValue.toString() !== value.toString()) {
      errors.push("Must be a valid integer");
      // Return null for invalid values (expected by some tests)
      return null;
    }

    // Check min/max constraints
    if (config.min !== null && intValue < config.min) {
      errors.push(`Must be at least ${config.min}`);
    }
    if (config.max !== null && intValue > config.max) {
      errors.push(`Must be at most ${config.max}`);
    }

    // If validation fails due to constraints, return null
    if (errors.length > 0) {
      return null;
    }

    return {
      isValid: true,
      value: intValue,
      errors: [],
    };
  },

  safeSetInnerHTML(element, html, options = {}) {
    if (!element) {
      console.warn(
        "[SecurityUtils Mock] Invalid element provided to safeSetInnerHTML",
      );
      return false;
    }

    const sanitizedHTML = this.sanitizeHTML(html);
    try {
      element.innerHTML = sanitizedHTML;
      return true;
    } catch (error) {
      console.error("[SecurityUtils Mock] Error in safeSetInnerHTML:", error);
      return false;
    }
  },

  setTextContent(element, text) {
    if (!element) return false;
    try {
      element.textContent = this.sanitizeInput(text);
      return true;
    } catch (error) {
      console.error("[SecurityUtils Mock] Error in setTextContent:", error);
      return false;
    }
  },

  // Additional methods expected by tests
  escapeHtml(input) {
    if (input == null) return "";
    if (typeof input !== "string") return String(input);
    return this.sanitizeInput(input);
  },

  sanitizeHtml(html, options = {}) {
    if (!html) return "";
    return this.sanitizeHTML(html);
  },

  validateEmail(email) {
    if (!email) return false;
    return this.isValidEmail(email);
  },

  validateUrl(url) {
    if (!url) return false;
    return this.isValidUrl(url);
  },

  validateString(str, options = {}) {
    if (str == null) return options.required === false ? null : null;
    const stringVal = String(str);

    if (options.minLength && stringVal.length < options.minLength) return null;
    if (options.maxLength && stringVal.length > options.maxLength) return null;
    if (options.pattern && !options.pattern.test(stringVal)) return null;

    return stringVal;
  },

  escapeRegex(str) {
    if (!str) return "";
    return String(str).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  },

  createElement(tag, text = "", attributes = {}) {
    const element = document.createElement(tag);
    if (text) element.textContent = text;

    Object.keys(attributes).forEach((key) => {
      if (!key.startsWith("on")) {
        // Skip event handlers
        element.setAttribute(key, attributes[key]);
      }
    });

    return element;
  },

  createTextNode(text) {
    return document.createTextNode(text || "");
  },

  highlightSearchTerm(text, term, className = "highlight") {
    if (!text || !term) return text || "";
    const escapedTerm = this.escapeRegex(term);
    const regex = new RegExp(`(${escapedTerm})`, "gi");
    return this.escapeHtml(text).replace(
      regex,
      `<span class="${className}">$1</span>`,
    );
  },

  deepClone(obj) {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Set)
      return new Set([...obj].map((item) => this.deepClone(item)));
    if (obj instanceof Map) {
      const cloned = new Map();
      obj.forEach((value, key) =>
        cloned.set(this.deepClone(key), this.deepClone(value)),
      );
      return cloned;
    }
    if (Array.isArray(obj)) return obj.map((item) => this.deepClone(item));

    const cloned = {};
    Object.keys(obj).forEach((key) => {
      cloned[key] = this.deepClone(obj[key]);
    });
    return cloned;
  },

  isSafePrimitive(value) {
    const type = typeof value;
    return (
      type === "string" ||
      type === "number" ||
      type === "boolean" ||
      value === null ||
      value === undefined
    );
  },

  checkRateLimit(action, limit = 5, windowMs = 60000) {
    // Simple mock - always return true for tests
    return true;
  },

  logSecurityEvent(eventType, severity = "medium", details = {}) {
    // Mock logging - just console.log in tests
    if (typeof console !== "undefined" && console.log) {
      console.log(`[SECURITY] ${eventType} (${severity}):`, details);
    }
  },

  generateCSRFToken() {
    return "mock-csrf-token";
  },
  validateCSRFToken(token) {
    return token === "mock-csrf-token";
  },
  getCSRFToken() {
    return "mock-csrf-token";
  },
  auditLog() {
    /* no-op */
  },
  generateNonce() {
    return `nonce-mock-${Date.now()}`;
  },
  getCSPHeader() {
    return "default-src 'self'";
  },
  validateSession(sessionId) {
    return {
      valid: !!sessionId,
      sessionId,
      userId: sessionId ? "mock-user" : null,
    };
  },
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },
  isValidUUID(uuid) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      uuid,
    );
  },
  isValidUrl(url) {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },
  updateConfig() {
    return {};
  },
  getConfig() {
    return { xssProtectionEnabled: true, csrfProtectionEnabled: true };
  },
  resetState() {
    /* no-op */
  },
  getPerformanceMetrics() {
    return { sanitizationCalls: 0, validationCalls: 0 };
  },
  simulateXSSAttack(payload) {
    return this.sanitizeInput(payload);
  },
  simulateCSRFAttack() {
    return false;
  },
  simulateError(type) {
    throw new Error(`Mock ${type} error`);
  },
  __isMock: true,
  __mockType: "SecurityUtils-unit-test",
  __version: "2.1.0",
};

global.SecurityUtils = SecurityUtilsMock;

// Also ensure it's available on window object for DOM-based tests
if (typeof window !== "undefined") {
  window.SecurityUtils = SecurityUtilsMock;

  // Ensure all methods are properly exposed on window
  Object.keys(SecurityUtilsMock).forEach((key) => {
    if (typeof SecurityUtilsMock[key] === "function") {
      window.SecurityUtils[key] =
        SecurityUtilsMock[key].bind(SecurityUtilsMock);
    }
  });
}

// Mock fetch for API calls
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
  }),
);

// Additional polyfills for browser APIs
global.URL.createObjectURL = jest.fn(() => "mock-url");
global.URL.revokeObjectURL = jest.fn();

// Mock MutationObserver
global.MutationObserver = class MutationObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    // Mock implementation
  }
  disconnect() {
    // Mock implementation
  }
  takeRecords() {
    return [];
  }
};

// Global test utilities for unit tests
global.testUtils = {
  createMockResponse: (data, status = 200) => ({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }),

  createMockRequest: (params = {}, body = {}) => ({
    params,
    body,
    headers: {},
    query: params,
  }),

  createMockDatabaseRow: (overrides = {}) => ({
    id: "test-uuid-123",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }),

  mockConsole: () => {
    const originalConsole = global.console;
    global.console = {
      ...console,
      log: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    return () => {
      global.console = originalConsole;
    };
  },
};

// Mock process.env for consistent testing
process.env = {
  ...process.env,
  NODE_ENV: "test",
  DB_HOST: "localhost",
  DB_PORT: "5432",
  DB_NAME: "umig_test",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
};

// Minimal window.location setup - let individual tests handle specific mocking
if (typeof window !== "undefined" && !window.location) {
  // Only add if completely missing
  window.location = {
    protocol: "https:",
    host: "localhost:8090",
    hostname: "localhost",
    port: "8090",
    pathname: "/",
    search: "",
    hash: "",
    href: "https://localhost:8090/",
    origin: "https://localhost:8090",
  };
}

// Setup error handling for unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

// Cleanup after each test
afterEach(() => {
  jest.clearAllMocks();

  // Reset Performance API mocks
  if (global.performance && global.performance.mark) {
    global.performance.mark.mockClear();
    global.performance.measure.mockClear();
    global.performance.now.mockClear();
  }

  // Reset observer instances (observers are class-based, not jest mocks)
  // They will be cleaned up automatically on each test
});

console.log("✅ Unit test environment ready");
