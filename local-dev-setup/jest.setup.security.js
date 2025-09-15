/**
 * Security Test Environment Setup
 * Minimal setup for security tests to avoid jsdom/tough-cookie conflicts
 */

console.log("🔒 Setting up Security Test environment (Node.js)...");

// Minimal DOM polyfills for security tests
global.window = {
  currentUser: "security-test-user",
  sessionId: "secure-session-456",
  addEventListener: jest.fn(),
  location: {
    origin: "https://test.atlassian.net",
    protocol: "https:",
    href: "https://test.atlassian.net/test",
  },
  UMIGServices: {
    userService: {
      getCurrentUser: jest.fn(() => "service-user"),
      validateUser: jest.fn(() => true),
    },
    securityService: {
      validateCSRF: jest.fn(() => true),
      checkRateLimit: jest.fn(() => ({ allowed: true, remaining: 100 })),
    },
  },
};

global.document = {
  createElement: jest.fn(() => ({
    className: "",
    innerHTML: "",
    appendChild: jest.fn(),
    remove: jest.fn(),
    querySelector: jest.fn(() => null),
    querySelectorAll: jest.fn(() => []),
    addEventListener: jest.fn(),
    style: {},
    value: "#3498db",
    textContent: "#3498db",
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
    },
    dataset: {},
  })),
  cookie:
    "JSESSIONID=secure-session; Secure; HttpOnly; SameSite=Strict; path=/",
  addEventListener: jest.fn(),
  hidden: false,
  body: { appendChild: jest.fn() },
  head: { appendChild: jest.fn() },
  getElementById: jest.fn(() => null),
};

global.fetch = jest.fn();
global.performance = { now: jest.fn(() => Date.now()) };
global.btoa = jest.fn((str) => Buffer.from(str).toString("base64"));
global.navigator = {
  userAgent: "jest/security-test-environment",
};

// Mock crypto for Node.js environment
global.crypto = {
  randomUUID: jest.fn(
    () => "test-uuid-" + Math.random().toString(36).substring(2, 15),
  ),
};

// Initialize security audit log
global.securityAuditLog = [];

// Enhanced error handling for security tests
const originalConsoleError = console.error;
console.error = (...args) => {
  // Filter out expected security test errors
  const message = args.join(" ");
  if (!message.includes("tough-cookie") && !message.includes("jsdom")) {
    originalConsoleError.apply(console, args);
  }
};

// Setup test isolation
beforeEach(() => {
  global.securityAuditLog = [];
  jest.clearAllMocks();
});

afterEach(() => {
  // Cleanup security test resources
  if (global.securityAuditLog) {
    global.securityAuditLog.length = 0;
  }
});

console.log(
  "✅ Security test environment ready (Node.js - no tough-cookie conflicts)",
);
