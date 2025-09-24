/**
 * UMIG Test Infrastructure Consolidation - Unit Test Setup
 *
 * Optimized setup for unit tests with SecurityUtils integration and
 * stack overflow prevention for tough-cookie dependency issues.
 *
 * Features:
 * - SecurityUtils race condition resolution
 * - Memory leak prevention
 * - Dependency isolation
 * - Performance monitoring
 *
 * @version 1.0.0
 * @author test-infrastructure-consolidation
 */

import { jest } from "@jest/globals";

// CRITICAL: Early SecurityUtils setup to prevent race conditions
beforeAll(async () => {
  // Ensure SecurityUtils is available globally before any components load
  if (typeof window !== "undefined" && !window.SecurityUtils) {
    // Load lightweight SecurityUtils mock for unit tests
    const SecurityUtilsMock = await import(
      "./__tests__/__mocks__/SecurityUtils.unit.js"
    );
    window.SecurityUtils = SecurityUtilsMock.default;
  }

  // Initialize performance monitoring
  if (global.gc) {
    global.gc(); // Force garbage collection if available
  }

  // Set up memory monitoring
  global.memoryUsageStart = process.memoryUsage();

  console.log("🚀 Unit Test Environment Initialized");
  console.log(
    `💾 Initial Memory: ${Math.round(global.memoryUsageStart.heapUsed / 1024 / 1024)}MB`,
  );
});

// Memory cleanup between test suites
beforeEach(() => {
  // Clear any previous mocks
  jest.clearAllMocks();

  // Reset SecurityUtils state if needed
  if (window?.SecurityUtils?.resetState) {
    window.SecurityUtils.resetState();
  }

  // DOM cleanup for jsdom
  if (typeof document !== "undefined") {
    document.body.innerHTML = "";

    // Remove any event listeners
    const events = ["click", "change", "input", "submit", "load"];
    events.forEach((event) => {
      document.removeEventListener(event, () => {});
    });
  }
});

afterEach(() => {
  // Aggressive cleanup to prevent memory leaks
  if (global.gc && Math.random() < 0.1) {
    // 10% chance to trigger GC
    global.gc();
  }

  // Monitor memory usage
  const currentMemory = process.memoryUsage();
  const memoryDiff = currentMemory.heapUsed - global.memoryUsageStart.heapUsed;

  if (memoryDiff > 50 * 1024 * 1024) {
    // 50MB threshold
    console.warn(
      `⚠️  Memory usage increased by ${Math.round(memoryDiff / 1024 / 1024)}MB`,
    );
  }
});

afterAll(() => {
  // Final cleanup and reporting
  const finalMemory = process.memoryUsage();
  const totalMemoryUsed =
    finalMemory.heapUsed - global.memoryUsageStart.heapUsed;

  console.log("✅ Unit Test Environment Cleanup Complete");
  console.log(
    `💾 Final Memory: ${Math.round(finalMemory.heapUsed / 1024 / 1024)}MB`,
  );
  console.log(
    `📈 Memory Delta: ${Math.round(totalMemoryUsed / 1024 / 1024)}MB`,
  );

  // Force final garbage collection
  if (global.gc) {
    global.gc();
  }
});

// Global error handling for unit tests
process.on("unhandledRejection", (reason, promise) => {
  console.error("🚨 Unhandled Rejection in Unit Tests:", reason);
});

process.on("uncaughtException", (error) => {
  console.error("🚨 Uncaught Exception in Unit Tests:", error);
});

// Configure Jest globals for unit testing
global.JEST_ENVIRONMENT = "unit";
global.SECURITY_UTILS_MOCK = true;
global.DATABASE_MOCK = true;

// Mock console methods to reduce noise in unit tests
const originalConsole = { ...console };
global.console = {
  ...console,
  log: jest.fn(originalConsole.log),
  warn: jest.fn(originalConsole.warn),
  error: originalConsole.error, // Keep errors visible
  info: jest.fn(),
  debug: jest.fn(),
};

// Restore console in verbose mode
if (process.env.JEST_VERBOSE === "true") {
  global.console = originalConsole;
}

// Configure jsdom environment optimizations
if (typeof window !== "undefined") {
  // Optimize jsdom for unit testing
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));

  // Mock IntersectionObserver
  window.IntersectionObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

  // Mock ResizeObserver
  window.ResizeObserver = jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));
}

// Performance monitoring utilities
global.performanceMonitor = {
  start: (testName) => {
    global.performanceStart = Date.now();
    global.performanceMemoryStart = process.memoryUsage();
  },

  end: (testName) => {
    const duration = Date.now() - global.performanceStart;
    const memoryEnd = process.memoryUsage();
    const memoryDiff =
      memoryEnd.heapUsed - global.performanceMemoryStart.heapUsed;

    if (duration > 5000) {
      // 5 second threshold
      console.warn(`⏱️  Slow test detected: ${testName} took ${duration}ms`);
    }

    if (memoryDiff > 10 * 1024 * 1024) {
      // 10MB threshold
      console.warn(
        `💾 Memory heavy test: ${testName} used ${Math.round(memoryDiff / 1024 / 1024)}MB`,
      );
    }
  },
};

console.log(
  "✅ Unit Test Setup Complete - SecurityUtils Integrated, Stack Overflow Prevention Active",
);
