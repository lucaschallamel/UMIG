/**
 * NotificationService.test.js - Fixed Test Suite (Simplified Jest Pattern)
 *
 * US-082-A Phase 1: Foundation Service Layer Notification Testing
 * Following TD-002 simplified Jest pattern - NO self-contained architecture
 * - Standard Jest module loading
 * - Proper CommonJS imports
 * - 95%+ coverage target
 */

// Store original timer functions for cleanup
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;
const originalClearTimeout = global.clearTimeout;
const originalClearInterval = global.clearInterval;

// Mock timing functions to prevent service loops
global.setTimeout = jest.fn(() => 123);
global.setInterval = jest.fn(() => 456);
global.clearTimeout = jest.fn();
global.clearInterval = jest.fn();

// Setup globals BEFORE requiring modules
global.window = global.window || {};
global.performance = global.performance || { now: () => Date.now() };

// Mock BaseService class for NotificationService to extend
class MockBaseService {
  constructor(name) {
    this.name = name;
    this.state = "initialized";
    this.config = {};
    this.metrics = {};
    this.eventHandlers = new Map();
  }

  log(message, ...args) {
    console.log(`[${this.name}] ${message}`, ...args);
  }

  warn(message, ...args) {
    console.warn(`[${this.name}] ${message}`, ...args);
  }

  error(message, ...args) {
    console.error(`[${this.name}] ${message}`, ...args);
  }

  async initialize() {
    this.state = "initialized";
  }

  async start() {
    this.state = "running";
  }

  async stop() {
    this.state = "stopped";
  }

  async cleanup() {
    this.state = "cleaned";
  }
}

global.window.BaseService = MockBaseService;

global.document = global.document || {
  createElement: jest.fn((tag) => ({
    tag,
    id: "",
    className: "",
    style: {
      cssText: "",
    },
    innerHTML: "",
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
    },
    setAttribute: jest.fn(),
    appendChild: jest.fn(),
    removeChild: jest.fn(),
    querySelector: jest.fn(),
    parentNode: null,
  })),
  body: {
    appendChild: jest.fn(),
  },
};

// Mock localStorage
global.localStorage = global.localStorage || {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

// Mock browser APIs
global.Notification = class MockNotification {
  static instances = [];
  static permission = "granted";

  constructor(title, options) {
    this.title = title;
    this.body = options?.body;
    this.icon = options?.icon;
    this.onclick = null;
    MockNotification.instances.push(this);
  }

  static requestPermission() {
    return Promise.resolve("granted");
  }

  close() {
    const index = MockNotification.instances.indexOf(this);
    if (index > -1) {
      MockNotification.instances.splice(index, 1);
    }
  }
};

// Mock AJS (Atlassian JavaScript library)
global.AJS = {
  flag: jest.fn(),
  messages: {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
  toInit: jest.fn(),
};

// Standard CommonJS require - NO vm.runInContext
const {
  NotificationService,
  NotificationEntry,
  UserPreferences,
} = require("../../../../src/groovy/umig/web/js/services/NotificationService.js");

describe("NotificationService - Foundation Tests", () => {
  let notificationService;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset mock notifications
    global.Notification.instances = [];
    global.AJS.flag.mockClear();

    // Create fresh notification service instance
    notificationService = new NotificationService();

    // Override processing methods to prevent timer loops in tests
    notificationService.startProcessing = jest.fn(() => {
      notificationService.isProcessing = true;
      notificationService.log(
        "Mocked startProcessing - timers disabled for tests",
      );
    });

    notificationService.stopProcessing = jest.fn(() => {
      notificationService.isProcessing = false;
      notificationService.log(
        "Mocked stopProcessing - timers disabled for tests",
      );
    });

    notificationService.processQueue = jest.fn();
    notificationService.processEmailBatch = jest.fn();
    notificationService.cleanupHistory = jest.fn();

    // Mock service dependencies for testing
    global.window.AdminGuiService = {
      getService: jest.fn((serviceName) => {
        switch (serviceName) {
          case "ApiService":
            return {
              get: jest.fn(),
              post: jest.fn(),
              put: jest.fn(),
            };
          case "AuthenticationService":
            return {
              getCurrentUser: jest.fn().mockResolvedValue({
                userId: "test-user-123",
                displayName: "Test User",
              }),
            };
          case "ConfigurationService":
            return {};
          default:
            return null;
        }
      }),
    };
  });

  afterEach(async () => {
    if (notificationService) {
      try {
        // Force state changes without calling problematic methods
        notificationService.state = "stopped";
        notificationService.isProcessing = false;

        // Clear data structures safely
        if (notificationService.queue) {
          notificationService.queue.clear();
        }
        if (notificationService.history) {
          notificationService.history.clear();
        }
        if (notificationService.userPreferences) {
          notificationService.userPreferences.clear();
        }
        if (notificationService.templates) {
          notificationService.templates.clear();
        }

        notificationService.retryQueue = [];
        notificationService.emailBatch = [];
      } catch (error) {
        console.warn("Test cleanup warning:", error.message);
      }
    }

    // Clean up global mocks
    delete global.window.AdminGuiService;
  });

  describe("Basic Service Tests", () => {
    test("should create NotificationService instance", () => {
      expect(notificationService).toBeDefined();
      expect(notificationService.name).toBe("NotificationService");
      expect(notificationService.state).toBe("initialized");
    });

    test("should initialize successfully", async () => {
      await notificationService.initialize();
      expect(notificationService.state).toBe("initialized");
      expect(notificationService.templates.size).toBeGreaterThan(0); // Default templates loaded
    });

    test("should start successfully", async () => {
      await notificationService.initialize();
      await notificationService.start();

      expect(notificationService.state).toBe("running");
      expect(notificationService.startProcessing).toHaveBeenCalled();
    });

    test("should stop successfully", async () => {
      await notificationService.initialize();
      await notificationService.start();
      await notificationService.stop();

      expect(notificationService.state).toBe("stopped");
      expect(notificationService.stopProcessing).toHaveBeenCalled();
    });
  });

  describe("NotificationEntry Class Tests", () => {
    test("should create NotificationEntry with default values", () => {
      const entry = new NotificationEntry({
        message: "Test notification",
        type: "info",
      });

      expect(entry.id).toBeDefined();
      expect(entry.message).toBe("Test notification");
      expect(entry.type).toBe("info");
      expect(entry.priority).toBe("normal");
      expect(entry.channels).toEqual(["ui"]);
      expect(entry.status).toBe("pending");
      expect(entry.auditEvents).toEqual([]);
    });

    test("should generate unique IDs", () => {
      const entry1 = new NotificationEntry({ message: "Test 1" });
      const entry2 = new NotificationEntry({ message: "Test 2" });

      expect(entry1.id).not.toBe(entry2.id);
      expect(entry1.id).toMatch(/^notif_/);
      expect(entry2.id).toMatch(/^notif_/);
    });

    test("should add audit events", () => {
      const entry = new NotificationEntry({ message: "Test" });

      entry.addAuditEvent("test_event", { detail: "value" });

      expect(entry.auditEvents).toHaveLength(1);
      expect(entry.auditEvents[0].event).toBe("test_event");
      expect(entry.auditEvents[0].details).toEqual({ detail: "value" });
    });

    test("should mark channel delivery", () => {
      const entry = new NotificationEntry({
        message: "Test",
        channels: ["ui", "email"],
      });

      entry.markDelivered("ui", { success: true });

      expect(entry.deliveryResults.ui).toHaveLength(1);
      expect(entry.deliveryResults.ui[0].success).toBe(true);
      expect(entry.status).toBe("pending"); // Not all channels delivered yet

      entry.markDelivered("email", { success: true });
      expect(entry.status).toBe("delivered"); // All channels delivered
      expect(entry.deliveredAt).toBeDefined();
    });
  });

  describe("Core Notification Tests", () => {
    test("should send basic notification", async () => {
      await notificationService.initialize();

      const notificationId = await notificationService.notify({
        message: "Test notification",
        type: "info",
      });

      expect(notificationId).toBeDefined();
      expect(notificationId).toMatch(/^notif_/);
      expect(notificationService.queue.has(notificationId)).toBe(true);
    });

    test("should send notification with multiple channels", async () => {
      await notificationService.initialize();

      const notificationId = await notificationService.notify({
        message: "Test notification",
        type: "success",
        channels: ["ui", "toast"],
      });

      expect(notificationId).toBeDefined();
      const entry = notificationService.queue.get(notificationId);
      expect(entry.channels).toEqual(["ui", "toast"]);
    });
  });

  describe("Template Tests", () => {
    test("should register custom template", () => {
      const templateId = "test-template";
      const template = {
        render: (data) => ({
          title: `Hello ${data.name}`,
          message: `Welcome ${data.name}!`,
          type: "info",
        }),
        metadata: { version: "1.0" },
      };

      notificationService.registerTemplate(templateId, template);

      expect(notificationService.templates.has(templateId)).toBe(true);
      const registered = notificationService.templates.get(templateId);
      expect(registered.id).toBe(templateId);
      expect(typeof registered.render).toBe("function");
    });

    test("should validate template registration", () => {
      expect(() => {
        notificationService.registerTemplate(null, null);
      }).toThrow("Template ID and template are required");

      expect(() => {
        notificationService.registerTemplate("test", { metadata: {} });
      }).toThrow("Template must have a render function");
    });
  });

  describe("User Preferences Tests", () => {
    test("should create default user preferences", () => {
      const userId = "test-user";
      const preferences = new UserPreferences(userId);

      expect(preferences.userId).toBe(userId);
      expect(preferences.channels.ui).toBe(true);
      expect(preferences.channels.email).toBe(true);
    });

    test("should update user preferences", async () => {
      const userId = "test-user";
      const preferences = {
        channels: { ui: true, email: false },
        types: { info: true, error: true },
      };

      const updatedPrefs = await notificationService.updateUserPreferences(
        userId,
        preferences,
      );

      expect(updatedPrefs).toBeDefined();
      expect(updatedPrefs.userId).toBe(userId);
      expect(notificationService.userPreferences.has(userId)).toBe(true);
    });
  });
});

console.log(
  "🧪 NotificationService Fixed Test Suite - Simplified Jest Pattern",
);
console.log("✅ Standard CommonJS module loading implemented");
console.log("✅ Foundation service testing with timer mocking");
