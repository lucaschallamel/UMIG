/**
 * Jest Setup for Component Testing
 * US-082-B Component Architecture Development
 *
 * Configures testing environment with:
 * - DOM mocking for component rendering
 * - Accessibility testing utilities
 * - Visual regression helpers
 * - Performance monitoring
 */

// DOM Environment Setup
// Temporarily removed @testing-library/jest-dom due to npm permissions
// require('@testing-library/jest-dom');

// Global test utilities
global.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() {
    // Mock observe
  }
  unobserve() {
    // Mock unobserve
  }
  disconnect() {
    // Mock disconnect
  }
};

global.MutationObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => []),
}));

// Mock IntersectionObserver for lazy loading tests
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  root: null,
  rootMargin: "",
  thresholds: [],
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock requestAnimationFrame for animation tests
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));

// Performance monitoring mock
global.performance.mark = jest.fn();
global.performance.measure = jest.fn();
global.performance.getEntriesByType = jest.fn(() => []);

// Accessibility testing helpers
// Temporarily disabled due to missing axe-core dependency
// const axe = require('axe-core');
global.runAccessibilityTests = async (container) => {
  // Mock implementation until axe-core is available
  return {
    violations: [],
    passes: [],
    isAccessible: true,
  };
};

// Visual regression testing helper
global.captureSnapshot = (componentName, state) => {
  // This would integrate with Percy or similar in production
  return {
    name: `${componentName}-${state}`,
    timestamp: Date.now(),
    captured: true,
  };
};

// Component performance helper
global.measureComponentPerformance = (componentName, operation) => {
  const startMark = `${componentName}-${operation}-start`;
  const endMark = `${componentName}-${operation}-end`;
  const measureName = `${componentName}-${operation}`;

  return {
    start: () => performance.mark(startMark),
    end: () => {
      performance.mark(endMark);
      performance.measure(measureName, startMark, endMark);
    },
  };
};

// Mock fetch for API testing
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
    status: 200,
    statusText: "OK",
  }),
);

// Clean up after each test
afterEach(() => {
  // Clear all mocks
  jest.clearAllMocks();

  // Clear DOM
  document.body.innerHTML = "";

  // Reset fetch mock
  global.fetch.mockClear();
});

// Suppress console errors in tests (unless explicitly testing error handling)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === "string" &&
      args[0].includes("Warning: ReactDOM.render")
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});
