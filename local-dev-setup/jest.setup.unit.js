// Unit Test Setup - No external dependencies
console.log("🧪 Setting up Unit Test environment...");

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

// SecurityUtils global availability for all component tests
const SecurityUtils = require("../src/groovy/umig/web/js/components/SecurityUtils");
global.SecurityUtils = SecurityUtils;

// Also ensure it's available on window object for DOM-based tests
if (typeof window !== "undefined") {
  window.SecurityUtils = SecurityUtils;
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
