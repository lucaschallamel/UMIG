/**
 * Jest Setup for Component Architecture Testing
 * Sets up the testing environment for component-specific tests
 */

// Mock crypto for testing environments
if (typeof crypto === "undefined" || !crypto.getRandomValues) {
  global.crypto = {
    getRandomValues: (arr) => {
      for (let i = 0; i < arr.length; i++) {
        arr[i] = Math.floor(Math.random() * 256);
      }
      return arr;
    },
  };
}

// Mock performance for testing environments
if (typeof performance === "undefined") {
  global.performance = {
    now: () => Date.now(),
    mark: jest.fn(),
    measure: jest.fn(),
  };
}

// Mock ResizeObserver for testing environments
if (typeof ResizeObserver === "undefined") {
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) {
      this.callback = callback;
    }

    observe() {
      // Mock implementation
    }

    unobserve() {
      // Mock implementation
    }

    disconnect() {
      // Mock implementation
    }
  };
}

// Mock fetch for testing environments
if (typeof fetch === "undefined") {
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({}),
    }),
  );
}

// Mock CustomEvent for testing environments
if (typeof CustomEvent === "undefined") {
  global.CustomEvent = class CustomEvent {
    constructor(eventName, options) {
      this.type = eventName;
      this.detail = options?.detail;
    }
  };
}

// Mock localStorage for testing environments
if (typeof localStorage === "undefined") {
  const storage = {};
  global.localStorage = {
    getItem: jest.fn((key) => storage[key] || null),
    setItem: jest.fn((key, value) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    }),
    key: jest.fn((index) => Object.keys(storage)[index] || null),
    get length() {
      return Object.keys(storage).length;
    },
  };
}

// Mock sessionStorage for testing environments
if (typeof sessionStorage === "undefined") {
  const storage = {};
  global.sessionStorage = {
    getItem: jest.fn((key) => storage[key] || null),
    setItem: jest.fn((key, value) => {
      storage[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete storage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    }),
    key: jest.fn((index) => Object.keys(storage)[index] || null),
    get length() {
      return Object.keys(storage).length;
    },
  };
}

// Setup component testing helpers
beforeEach(() => {
  // Clear all timers
  jest.clearAllTimers();

  // Clear DOM
  document.body.innerHTML = "";

  // Clear localStorage/sessionStorage
  localStorage.clear();
  sessionStorage.clear();

  // Reset fetch mock
  if (global.fetch && global.fetch.mockClear) {
    global.fetch.mockClear();
  }

  // Clear console warnings for cleaner test output
  jest.spyOn(console, "warn").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  // Clean up timers
  jest.clearAllTimers();

  // Restore console methods
  if (console.warn.mockRestore) console.warn.mockRestore();
  if (console.error.mockRestore) console.error.mockRestore();
});

// Component testing utilities
global.ComponentTestUtils = {
  /**
   * Create a test container for component testing
   */
  createTestContainer: (id = "test-container") => {
    const container = document.createElement("div");
    container.id = id;
    document.body.appendChild(container);
    return container;
  },

  /**
   * Wait for component lifecycle to complete
   */
  waitForLifecycle: (ms = 100) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
  },

  /**
   * Trigger DOM events for testing
   */
  triggerEvent: (element, eventType, eventInit = {}) => {
    const event = new Event(eventType, {
      bubbles: true,
      cancelable: true,
      ...eventInit,
    });
    element.dispatchEvent(event);
    return event;
  },

  /**
   * Mock component dependencies
   */
  mockComponent: (id, methods = {}) => {
    return {
      id,
      initialize: jest.fn(),
      render: jest.fn(),
      destroy: jest.fn(),
      emit: jest.fn(),
      onMessage: jest.fn(),
      ...methods,
    };
  },

  /**
   * Assert component state
   */
  assertComponentState: (component, expectedState) => {
    expect(component.getState()).toEqual(
      expect.objectContaining(expectedState),
    );
  },
};

// Load SecurityUtils mock for component testing
try {
  const SecurityUtilsMock = require("./__tests__/__mocks__/SecurityUtils.unit.js");
  global.SecurityUtils = SecurityUtilsMock;

  // Ensure window.SecurityUtils is available in browser-like environment
  if (typeof window !== "undefined") {
    window.SecurityUtils = SecurityUtilsMock;
  }

  console.log("[Jest Setup] SecurityUtils mock loaded for component testing");
} catch (error) {
  console.warn(
    "[Jest Setup] Failed to load SecurityUtils mock:",
    error.message,
  );
}

console.log("[Jest Setup] Component testing environment initialized");
