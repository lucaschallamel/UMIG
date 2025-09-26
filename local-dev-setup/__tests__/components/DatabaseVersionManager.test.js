/**
 * DatabaseVersionManager Component Tests
 * US-088 Phase 2: Database Version Management Component
 *
 * Tests for the initialization error fix and basic functionality
 */

// Setup test environment
const { JSDOM } = require("jsdom");

const dom = new JSDOM(
  `
  <!DOCTYPE html>
  <html>
    <head>
      <title>DatabaseVersionManager Test</title>
    </head>
    <body>
      <div id="mainContent"></div>
    </body>
  </html>
`,
  {
    url: "http://localhost:8090",
    pretendToBeVisual: true,
    resources: "usable",
  },
);

global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.performance = dom.window.performance;

// Mock SecurityUtils
global.window.SecurityUtils = {
  sanitizeText: jest.fn((text) => text),
  setSecureHTML: jest.fn((element, html) => {
    element.innerHTML = html;
  }),
};

// Mock ComponentOrchestrator
global.window.ComponentOrchestrator = class MockComponentOrchestrator {
  constructor(config) {
    this.config = config;
  }

  setContainer(container) {
    this.config.container = container;
    return true;
  }
};

// Mock BaseEntityManager
global.window.BaseEntityManager = class BaseEntityManager {
  constructor(config = {}) {
    this.config = {
      ...this._getDefaultConfig(),
      ...config,
    };
    this.entityType = config.entityType || "test";
    this.id = `entity-manager-${this.entityType}-${Date.now()}`;
    this.state = {
      current: "uninitialized",
      previous: null,
      data: {},
    };
    this.mounted = false;
    this.initialized = false;
    this.container = null;
    this.options = config;

    this._initializeSecurityContext();
  }

  _getDefaultConfig() {
    return {
      entityType: "test",
      security: {
        requireAuth: true,
        csrfProtection: true,
        xssProtection: true,
        rateLimiting: true,
        inputValidation: true,
        contentSecurityPolicy: true,
      },
    };
  }

  _initializeSecurityContext() {
    // Mock security context initialization
  }

  async destroy() {
    // Mock cleanup
  }
};

// Load DatabaseVersionManager
require("../../../src/groovy/umig/web/js/components/DatabaseVersionManager.js");

describe("DatabaseVersionManager Initialization Fix", () => {
  let container;

  beforeEach(() => {
    container = document.getElementById("mainContent");
    jest.clearAllMocks();

    // Clear any existing timeouts
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    if (container) {
      container.innerHTML = "";
    }
  });

  test("should create DatabaseVersionManager without config initialization error", () => {
    expect(() => {
      const manager = new window.DatabaseVersionManager("mainContent", {
        apiBase: "/rest/api",
        orchestrator: window.ComponentOrchestrator,
      });

      // Verify the manager was created successfully
      expect(manager).toBeDefined();
      expect(manager.config).toBeDefined();
      expect(manager.securityState).toBeDefined();
    }).not.toThrow();
  });

  test("should have config properly initialized after constructor", () => {
    const manager = new window.DatabaseVersionManager("mainContent", {
      apiBase: "/rest/api",
      orchestrator: window.ComponentOrchestrator,
    });

    // Config should be available immediately after constructor
    expect(manager.config).toBeDefined();
    expect(manager.config.security).toBeDefined();
    expect(manager.config.security.csrfProtection).toBe(true);
  });

  test("should defer async initialization to prevent config race condition", () => {
    const manager = new window.DatabaseVersionManager("mainContent", {
      apiBase: "/rest/api",
      orchestrator: window.ComponentOrchestrator,
    });

    // Spy on initializeAsync method
    const initializeAsyncSpy = jest.spyOn(manager, "initializeAsync");

    // Fast-forward past the setTimeout(0) delay
    jest.runAllTimers();

    // initializeAsync should have been called after the timeout
    expect(initializeAsyncSpy).toHaveBeenCalled();
  });

  test("should handle legacy BaseComponent instantiation pattern", () => {
    expect(() => {
      const manager = new window.DatabaseVersionManager("mainContent", {
        apiBase: "/rest/api",
      });

      expect(manager.config.containerId).toBe("mainContent");
      expect(manager.config.tableConfig.containerId).toBe("mainContent");
    }).not.toThrow();
  });

  test("should handle new BaseEntityManager instantiation pattern", () => {
    expect(() => {
      const manager = new window.DatabaseVersionManager({
        containerId: "testContainer",
        apiBase: "/rest/api",
        orchestrator: window.ComponentOrchestrator,
      });

      expect(manager.config).toBeDefined();
      expect(manager.config.containerId).toBe("testContainer");
    }).not.toThrow();
  });

  test("should have security state properly initialized", () => {
    const manager = new window.DatabaseVersionManager("mainContent", {
      apiBase: "/rest/api",
    });

    expect(manager.securityState).toBeDefined();
    expect(manager.securityState.initialized).toBe(false);
    expect(manager.securityState.capabilities).toBeDefined();
    expect(manager.securityState.initializationErrors).toEqual([]);
  });

  test("should have error boundary configured", () => {
    const manager = new window.DatabaseVersionManager("mainContent", {
      apiBase: "/rest/api",
    });

    expect(manager.errorBoundary).toBeDefined();
    expect(manager.errorBoundary.enabled).toBe(true);
    expect(manager.errorBoundary.maxRetries).toBe(3);
    expect(manager.errorBoundary.gracefulDegradation).toBe(true);
  });

  test("should have rate limiter configured", () => {
    const manager = new window.DatabaseVersionManager("mainContent", {
      apiBase: "/rest/api",
    });

    expect(manager.rateLimiter).toBeDefined();
    expect(manager.rateLimiter.maxCallsPerMinute).toBe(30);
    expect(manager.rateLimiter.trustedOperations).toContain("initialize");
  });
});
