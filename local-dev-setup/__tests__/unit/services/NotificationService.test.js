/**
 * NotificationService.test.js - Comprehensive Test Suite
 *
 * US-082-A Phase 1: Foundation Service Layer Testing
 * Following TD-001/TD-002 revolutionary testing patterns
 * - Self-contained architecture (TD-001)
 * - Technology-prefixed commands (TD-002)
 * - 95%+ coverage target
 *
 * @version 1.0.0
 * @author GENDEV Test Suite Generator
 * @since Sprint 6
 */

// Self-contained test architecture (TD-001 pattern)
const fs = require("fs");
const path = require("path");
const { performance } = require("perf_hooks");

// Load NotificationService source code
const notificationServicePath = path.join(
  __dirname,
  "../../../../src/groovy/umig/web/js/services/NotificationService.js",
);
const notificationServiceCode = fs.readFileSync(
  notificationServicePath,
  "utf8",
);

// Self-contained mock implementations (TD-001 pattern)
class MockDOM {
  constructor() {
    this.elements = new Map();
    this.eventListeners = new Map();
  }

  createElement(tagName) {
    const element = {
      tagName: tagName.toUpperCase(),
      className: "",
      innerHTML: "",
      textContent: "",
      style: {},
      children: [],
      parentNode: null,
      attributes: new Map(),
      eventListeners: new Map(),

      appendChild(child) {
        this.children.push(child);
        child.parentNode = this;
        return child;
      },

      removeChild(child) {
        const index = this.children.indexOf(child);
        if (index > -1) {
          this.children.splice(index, 1);
          child.parentNode = null;
        }
        return child;
      },

      setAttribute(name, value) {
        this.attributes.set(name, value);
      },

      getAttribute(name) {
        return this.attributes.get(name);
      },

      addEventListener(event, handler) {
        if (!this.eventListeners.has(event)) {
          this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(handler);
      },

      removeEventListener(event, handler) {
        if (this.eventListeners.has(event)) {
          const handlers = this.eventListeners.get(event);
          const index = handlers.indexOf(handler);
          if (index > -1) handlers.splice(index, 1);
        }
      },

      dispatchEvent(eventObj) {
        if (this.eventListeners.has(eventObj.type)) {
          this.eventListeners.get(eventObj.type).forEach((handler) => {
            handler.call(this, eventObj);
          });
        }
      },

      querySelector(selector) {
        // Simple mock implementation
        return this.children.find(
          (child) =>
            selector.includes(child.className) || selector.includes(child.id),
        );
      },

      querySelectorAll(selector) {
        return this.children.filter(
          (child) =>
            selector.includes(child.className) || selector.includes(child.id),
        );
      },

      getBoundingClientRect() {
        return { top: 0, left: 0, width: 100, height: 50 };
      },
    };

    return element;
  }

  getElementById(id) {
    return this.elements.get(id) || null;
  }

  querySelector(selector) {
    for (const element of this.elements.values()) {
      if (
        selector.includes(element.className) ||
        selector.includes(element.id)
      ) {
        return element;
      }
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    for (const element of this.elements.values()) {
      if (
        selector.includes(element.className) ||
        selector.includes(element.id)
      ) {
        results.push(element);
      }
    }
    return results;
  }

  createElement(tagName) {
    return this.createElement(tagName);
  }
}

class MockWindow {
  constructor() {
    this.document = new MockDOM();
    this.localStorage = new MockStorage();
    this.sessionStorage = new MockStorage();
    this.location = { href: "http://localhost:8090" };
    this.Notification = MockNotification;
    this.navigator = { permissions: new MockPermissions() };
    this.console = new MockConsole();
    this.BaseService = MockBaseService;
    this.AJS = new MockAJS();
    this.timers = [];
    this.intervals = [];
  }

  setTimeout(fn, delay) {
    const timer = setTimeout(fn, delay);
    this.timers.push(timer);
    return timer;
  }

  setInterval(fn, delay) {
    const interval = setInterval(fn, delay);
    this.intervals.push(interval);
    return interval;
  }

  clearTimeout(timer) {
    clearTimeout(timer);
    const index = this.timers.indexOf(timer);
    if (index > -1) this.timers.splice(index, 1);
  }

  clearInterval(interval) {
    clearInterval(interval);
    const index = this.intervals.indexOf(interval);
    if (index > -1) this.intervals.splice(index, 1);
  }

  cleanup() {
    this.timers.forEach((timer) => clearTimeout(timer));
    this.intervals.forEach((interval) => clearInterval(interval));
    this.timers = [];
    this.intervals = [];
  }
}

class MockStorage {
  constructor() {
    this.data = new Map();
  }

  getItem(key) {
    return this.data.get(key) || null;
  }

  setItem(key, value) {
    this.data.set(key, String(value));
  }

  removeItem(key) {
    this.data.delete(key);
  }

  clear() {
    this.data.clear();
  }
}

class MockConsole {
  constructor() {
    this.logs = [];
  }

  log(...args) {
    this.logs.push(["log", ...args]);
  }
  error(...args) {
    this.logs.push(["error", ...args]);
  }
  warn(...args) {
    this.logs.push(["warn", ...args]);
  }
  info(...args) {
    this.logs.push(["info", ...args]);
  }
  debug(...args) {
    this.logs.push(["debug", ...args]);
  }

  clear() {
    this.logs = [];
  }
}

class MockBaseService {
  constructor(name) {
    this.name = name;
    this.state = "initialized";
    this.eventHandlers = new Map();
    this.metrics = { errorCount: 0, operationCount: 0 };
    this.config = {};
  }

  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach((handler) => handler(data));
    }
  }

  async initialize(config = {}) {
    this.config = config;
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

  getHealth() {
    return {
      name: this.name,
      state: this.state,
      metrics: this.metrics,
    };
  }

  _log(level, ...args) {
    console[level](...args);
  }
}

class MockAJS {
  constructor() {
    this.messages = [];
    this.flags = new Map();
  }

  messages = {
    success: (options) => {
      this.messages.push({ type: "success", ...options });
      return { close: () => {} };
    },
    info: (options) => {
      this.messages.push({ type: "info", ...options });
      return { close: () => {} };
    },
    warning: (options) => {
      this.messages.push({ type: "warning", ...options });
      return { close: () => {} };
    },
    error: (options) => {
      this.messages.push({ type: "error", ...options });
      return { close: () => {} };
    },
  };

  flag = (options) => {
    const flag = {
      type: options.type || "info",
      title: options.title,
      body: options.body,
      close: options.close || "auto",
      actions: options.actions || [],
      id: "flag_" + Date.now(),
    };
    this.flags.set(flag.id, flag);
    return flag;
  };
}

class MockNotification {
  constructor(title, options = {}) {
    this.title = title;
    this.body = options.body;
    this.icon = options.icon;
    this.tag = options.tag;
    this.data = options.data;
    this.onclick = null;
    this.onclose = null;
    MockNotification.instances.push(this);
  }

  static instances = [];
  static permission = "default";

  static requestPermission() {
    return Promise.resolve("granted");
  }

  close() {
    if (this.onclose) this.onclose();
  }

  static reset() {
    MockNotification.instances = [];
    MockNotification.permission = "default";
  }
}

class MockPermissions {
  query(options) {
    return Promise.resolve({ state: "granted" });
  }
}

// Create test environment and evaluate NotificationService code
function createNotificationService() {
  const mockWindow = new MockWindow();

  // Prepare global context
  const context = {
    window: mockWindow,
    document: mockWindow.document,
    localStorage: mockWindow.localStorage,
    sessionStorage: mockWindow.sessionStorage,
    console: mockWindow.console,
    performance: performance,
    setTimeout: (fn, delay) => mockWindow.setTimeout(fn, delay),
    setInterval: (fn, delay) => mockWindow.setInterval(fn, delay),
    clearTimeout: (timer) => mockWindow.clearTimeout(timer),
    clearInterval: (interval) => mockWindow.clearInterval(interval),
    Date: Date,
    Map: Map,
    Set: Set,
    Promise: Promise,
    Error: Error,
    Object: Object,
    Array: Array,
  };

  // Add window to context pointing to mockWindow
  context.window = mockWindow;

  // Execute NotificationService code in controlled context
  const func = new Function(
    ...Object.keys(context),
    notificationServiceCode +
      `
        return {
            NotificationService: window.NotificationService || NotificationService,
            NotificationEntry: window.NotificationEntry || NotificationEntry,
            UserPreferences: window.UserPreferences || UserPreferences
        };`,
  );

  const result = func(...Object.values(context));
  result.mockWindow = mockWindow;

  return result;
}

describe("NotificationService - Comprehensive Foundation Tests", () => {
  let NotificationService;
  let NotificationEntry;
  let UserPreferences;
  let mockWindow;
  let notificationService;

  beforeEach(() => {
    const serviceClasses = createNotificationService();
    NotificationService = serviceClasses.NotificationService;
    NotificationEntry = serviceClasses.NotificationEntry;
    UserPreferences = serviceClasses.UserPreferences;
    mockWindow = serviceClasses.mockWindow;

    // Reset mock states
    MockNotification.reset();
  });

  afterEach(() => {
    if (
      notificationService &&
      typeof notificationService.cleanup === "function"
    ) {
      notificationService.cleanup();
    }
    if (mockWindow && typeof mockWindow.cleanup === "function") {
      mockWindow.cleanup();
    }
  });

  describe("NotificationEntry Class Tests", () => {
    test("should create NotificationEntry with default values", () => {
      const entry = new NotificationEntry({
        title: "Test Title",
        message: "Test message",
      });

      expect(entry.title).toBe("Test Title");
      expect(entry.message).toBe("Test message");
      expect(entry.type).toBe("info");
      expect(entry.channels).toEqual(["ui"]);
      expect(entry.priority).toBe("normal");
      expect(entry.status).toBe("pending");
      expect(entry.retryCount).toBe(0);
      expect(entry.maxRetries).toBe(3);
      expect(entry.id).toMatch(/^notif_/);
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.auditEvents).toEqual([]);
    });

    test("should generate unique IDs", () => {
      const entry1 = new NotificationEntry({ message: "test1" });
      const entry2 = new NotificationEntry({ message: "test2" });

      expect(entry1.id).not.toBe(entry2.id);
      expect(entry1.id).toMatch(/^notif_\d+_[a-z0-9]+$/);
    });

    test("should add audit events", () => {
      const entry = new NotificationEntry({ message: "test" });

      entry.addAuditEvent("created", { userId: "user123" });
      entry.addAuditEvent("queued");

      expect(entry.auditEvents).toHaveLength(2);
      expect(entry.auditEvents[0].event).toBe("created");
      expect(entry.auditEvents[0].details).toEqual({ userId: "user123" });
      expect(entry.auditEvents[1].event).toBe("queued");
    });

    test("should mark channel as delivered", () => {
      const entry = new NotificationEntry({
        message: "test",
        channels: ["ui", "email"],
      });

      entry.markDelivered("ui", { success: true, messageId: "msg123" });

      expect(entry.deliveryResults.ui).toHaveLength(1);
      expect(entry.deliveryResults.ui[0].success).toBe(true);
      expect(entry.deliveryResults.ui[0].details).toEqual({
        messageId: "msg123",
      });
      expect(entry.status).toBe("pending"); // Still pending email delivery
    });

    test("should mark as fully delivered when all channels complete", () => {
      const entry = new NotificationEntry({
        message: "test",
        channels: ["ui", "email"],
      });

      entry.markDelivered("ui", { success: true });
      expect(entry.status).toBe("pending");

      entry.markDelivered("email", { success: true });
      expect(entry.status).toBe("delivered");
      expect(entry.deliveredAt).toBeInstanceOf(Date);
    });

    test("should mark as failed with error details", () => {
      const entry = new NotificationEntry({ message: "test" });
      const error = new Error("Delivery failed");

      entry.markFailed(error, "email");

      expect(entry.status).toBe("failed");
      expect(entry.auditEvents).toHaveLength(1);
      expect(entry.auditEvents[0].event).toBe("delivery_failed");
      expect(entry.auditEvents[0].details.error).toBe("Delivery failed");
      expect(entry.auditEvents[0].details.channel).toBe("email");
    });

    test("should determine retry eligibility", () => {
      const entry = new NotificationEntry({ message: "test", maxRetries: 2 });

      expect(entry.shouldRetry()).toBe(false); // Not failed yet

      entry.markFailed(new Error("Test error"));
      expect(entry.shouldRetry()).toBe(true); // Failed with retries available

      entry.retryCount = 2;
      expect(entry.shouldRetry()).toBe(false); // Max retries reached
    });
  });

  describe("UserPreferences Class Tests", () => {
    test("should create UserPreferences with defaults", () => {
      const prefs = new UserPreferences("user123");

      expect(prefs.userId).toBe("user123");
      expect(prefs.channels).toEqual({
        ui: true,
        email: true,
        browser: false,
        toast: true,
      });
      expect(prefs.types).toEqual({
        info: true,
        success: true,
        warning: true,
        error: true,
      });
    });

    test("should enable/disable channels", () => {
      const prefs = new UserPreferences("user123");

      prefs.enableChannel("browser");
      expect(prefs.channels.browser).toBe(true);

      prefs.disableChannel("email");
      expect(prefs.channels.email).toBe(false);
    });

    test("should check channel status", () => {
      const prefs = new UserPreferences("user123");

      expect(prefs.isChannelEnabled("ui")).toBe(true);
      expect(prefs.isChannelEnabled("browser")).toBe(false);
    });

    test("should set notification type preferences", () => {
      const prefs = new UserPreferences("user123");

      prefs.setTypeEnabled("info", false);
      expect(prefs.types.info).toBe(false);

      prefs.setTypeEnabled("error", true);
      expect(prefs.types.error).toBe(true);
    });

    test("should serialize to JSON", () => {
      const prefs = new UserPreferences("user123");
      prefs.setQuietHours("22:00", "07:00");

      const json = prefs.toJSON();

      expect(json.userId).toBe("user123");
      expect(json.channels).toBeDefined();
      expect(json.types).toBeDefined();
      expect(json.quietHours).toBeDefined();
    });

    test("should load from JSON", () => {
      const data = {
        userId: "user456",
        channels: { ui: false, email: true },
        types: { info: false, error: true },
        quietHours: { start: "23:00", end: "08:00" },
      };

      const prefs = UserPreferences.fromJSON(data);

      expect(prefs.userId).toBe("user456");
      expect(prefs.channels.ui).toBe(false);
      expect(prefs.types.info).toBe(false);
      expect(prefs.quietHours.start).toBe("23:00");
    });
  });

  describe("NotificationService Core Tests", () => {
    beforeEach(() => {
      notificationService = new NotificationService();
    });

    test("should create NotificationService with initial state", () => {
      expect(notificationService.name).toBe("NotificationService");
      expect(notificationService.state).toBe("initialized");
      expect(notificationService.queue).toBeInstanceOf(Array);
      expect(notificationService.history).toBeInstanceOf(Array);
      expect(notificationService.userPreferences).toBeInstanceOf(Map);
      expect(notificationService.templates).toBeInstanceOf(Map);
    });

    test("should initialize with configuration", async () => {
      const config = {
        maxQueueSize: 500,
        maxHistorySize: 2000,
        processingInterval: 2000,
        retryDelay: 5000,
        templates: {
          welcome: { subject: "Welcome!", body: "Hello {{name}}" },
        },
      };

      await notificationService.initialize(config);

      expect(notificationService.maxQueueSize).toBe(500);
      expect(notificationService.maxHistorySize).toBe(2000);
      expect(notificationService.templates.has("welcome")).toBe(true);
    });

    test("should start processing queue", async () => {
      await notificationService.initialize();
      await notificationService.start();

      expect(notificationService.state).toBe("running");
      expect(notificationService.processingInterval).toBeDefined();
    });

    test("should stop processing", async () => {
      await notificationService.initialize();
      await notificationService.start();
      await notificationService.stop();

      expect(notificationService.state).toBe("stopped");
    });

    test("should add notification to queue", () => {
      const notification = {
        type: "info",
        title: "Test",
        message: "Test message",
        channels: ["ui"],
      };

      const entry = notificationService.notify(notification);

      expect(entry).toBeInstanceOf(NotificationEntry);
      expect(notificationService.queue).toHaveLength(1);
      expect(notificationService.queue[0]).toBe(entry);
    });

    test("should respect max queue size", () => {
      notificationService.maxQueueSize = 2;

      notificationService.notify({ message: "msg1" });
      notificationService.notify({ message: "msg2" });
      notificationService.notify({ message: "msg3" }); // Should be dropped

      expect(notificationService.queue).toHaveLength(2);
      expect(notificationService.droppedCount).toBe(1);
    });

    test("should process high priority notifications first", () => {
      const lowPriorityEntry = notificationService.notify({
        message: "low",
        priority: "low",
      });
      const highPriorityEntry = notificationService.notify({
        message: "high",
        priority: "high",
      });

      const sortedQueue = notificationService._sortQueueByPriority();

      expect(sortedQueue[0]).toBe(highPriorityEntry);
      expect(sortedQueue[1]).toBe(lowPriorityEntry);
    });

    test("should deliver UI notifications via AJS", async () => {
      await notificationService.initialize();

      const entry = new NotificationEntry({
        type: "success",
        title: "Success!",
        message: "Operation completed",
        channels: ["ui"],
      });

      await notificationService._deliverToUI(entry);

      expect(mockWindow.AJS.messages).toHaveLength(1);
      expect(mockWindow.AJS.messages[0].type).toBe("success");
      expect(mockWindow.AJS.messages[0].title).toBe("Success!");
    });

    test("should deliver browser notifications", async () => {
      await notificationService.initialize();
      MockNotification.permission = "granted";

      const entry = new NotificationEntry({
        type: "info",
        title: "Browser Notification",
        message: "This is a test",
        channels: ["browser"],
      });

      await notificationService._deliverToBrowser(entry);

      expect(MockNotification.instances).toHaveLength(1);
      expect(MockNotification.instances[0].title).toBe("Browser Notification");
      expect(MockNotification.instances[0].body).toBe("This is a test");
    });

    test("should handle browser notification permission denial", async () => {
      await notificationService.initialize();
      MockNotification.permission = "denied";

      const entry = new NotificationEntry({
        title: "Test",
        message: "Test message",
        channels: ["browser"],
      });

      await notificationService._deliverToBrowser(entry);

      expect(MockNotification.instances).toHaveLength(0);
      expect(entry.deliveryResults.browser[0].success).toBe(false);
    });

    test("should create and manage toast notifications", async () => {
      await notificationService.initialize();

      const entry = new NotificationEntry({
        type: "warning",
        title: "Warning",
        message: "This is a warning",
        channels: ["toast"],
      });

      await notificationService._deliverToast(entry);

      const toast = mockWindow.document.querySelector(".umig-toast");
      expect(toast).toBeDefined();
      expect(toast.className).toContain("toast-warning");
    });

    test("should manage user preferences", () => {
      const userId = "user123";
      const prefs = new UserPreferences(userId);
      prefs.disableChannel("email");

      notificationService.setUserPreferences(userId, prefs);

      const retrieved = notificationService.getUserPreferences(userId);
      expect(retrieved.userId).toBe(userId);
      expect(retrieved.channels.email).toBe(false);
    });

    test("should filter notifications by user preferences", () => {
      const userId = "user123";
      const prefs = new UserPreferences(userId);
      prefs.setTypeEnabled("info", false);
      prefs.disableChannel("email");

      notificationService.setUserPreferences(userId, prefs);

      const entry1 = new NotificationEntry({
        type: "info",
        message: "Info message",
        userId: userId,
        channels: ["ui", "email"],
      });

      const entry2 = new NotificationEntry({
        type: "error",
        message: "Error message",
        userId: userId,
        channels: ["ui", "email"],
      });

      expect(notificationService._shouldDeliverToUser(entry1)).toBe(false);
      expect(notificationService._shouldDeliverToUser(entry2)).toBe(true);

      const filteredChannels = notificationService._filterChannelsByPreferences(
        entry2.channels,
        userId,
      );
      expect(filteredChannels).toEqual(["ui"]);
    });

    test("should apply template rendering", () => {
      const template = {
        subject: "Hello {{name}}",
        body: "Welcome {{name}}, you have {{count}} messages",
      };

      const data = { name: "John", count: 5 };
      const rendered = notificationService._renderTemplate(template, data);

      expect(rendered.subject).toBe("Hello John");
      expect(rendered.body).toBe("Welcome John, you have 5 messages");
    });

    test("should handle template rendering errors", () => {
      const template = {
        subject: "Hello {{name}}",
        render: () => {
          throw new Error("Template error");
        },
      };

      const data = { name: "John" };
      const rendered = notificationService._renderTemplate(template, data);

      expect(rendered.subject).toBe("Hello {{name}}"); // Fallback to original
      expect(rendered.error).toBe("Template rendering failed");
    });

    test("should maintain notification history", async () => {
      await notificationService.initialize();
      notificationService.maxHistorySize = 2;

      const entry1 = notificationService.notify({ message: "msg1" });
      const entry2 = notificationService.notify({ message: "msg2" });
      const entry3 = notificationService.notify({ message: "msg3" });

      // Mark as delivered to move to history
      entry1.status = "delivered";
      entry2.status = "delivered";
      entry3.status = "delivered";

      notificationService._moveToHistory(entry1);
      notificationService._moveToHistory(entry2);
      notificationService._moveToHistory(entry3);

      expect(notificationService.history).toHaveLength(2);
      expect(notificationService.history[0]).toBe(entry2); // Oldest removed
      expect(notificationService.history[1]).toBe(entry3);
    });

    test("should provide comprehensive health status", async () => {
      await notificationService.initialize();

      notificationService.notify({ message: "test1" });
      notificationService.notify({ message: "test2" });

      const health = await notificationService.getHealth();

      expect(health.name).toBe("NotificationService");
      expect(health.state).toBe("initialized");
      expect(health.statistics.queueLength).toBe(2);
      expect(health.statistics.historyLength).toBe(0);
      expect(health.statistics.droppedCount).toBe(0);
      expect(health.statistics.totalDelivered).toBeDefined();
      expect(health.configuration).toBeDefined();
    });

    test("should cleanup resources properly", async () => {
      await notificationService.initialize();
      await notificationService.start();

      expect(notificationService.processingInterval).toBeDefined();

      await notificationService.cleanup();

      expect(notificationService.state).toBe("cleaned");
      expect(notificationService.queue).toHaveLength(0);
      expect(notificationService.history).toHaveLength(0);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    beforeEach(() => {
      notificationService = new NotificationService();
    });

    test("should handle invalid notification objects", () => {
      expect(() => {
        notificationService.notify(null);
      }).toThrow();

      expect(() => {
        notificationService.notify({});
      }).toThrow();
    });

    test("should handle delivery failures gracefully", async () => {
      await notificationService.initialize();

      // Mock API service to fail
      notificationService.apiService = {
        sendEmail: jest.fn().mockRejectedValue(new Error("Email failed")),
      };

      const entry = new NotificationEntry({
        message: "test",
        channels: ["email"],
      });

      await notificationService._deliverToEmail(entry);

      expect(entry.status).toBe("failed");
      expect(
        entry.auditEvents.some((event) => event.event === "delivery_failed"),
      ).toBe(true);
    });

    test("should respect quiet hours", () => {
      const userId = "user123";
      const prefs = new UserPreferences(userId);
      prefs.setQuietHours("22:00", "07:00");

      notificationService.setUserPreferences(userId, prefs);

      // Mock current time to be in quiet hours
      const originalDate = Date;
      global.Date = jest.fn(() => ({
        getHours: () => 23,
        getMinutes: () => 30,
      }));

      const entry = new NotificationEntry({
        userId: userId,
        type: "info",
        message: "Test during quiet hours",
      });

      const shouldDeliver = notificationService._shouldDeliverToUser(entry);
      expect(shouldDeliver).toBe(false);

      global.Date = originalDate;
    });

    test("should handle concurrent operations safely", async () => {
      await notificationService.initialize();

      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(notificationService.notify({ message: `Message ${i}` }));
      }

      await Promise.all(promises);
      expect(notificationService.queue).toHaveLength(10);
    });
  });

  describe("Integration and Performance Tests", () => {
    test("should integrate with other services", async () => {
      const mockApiService = {
        sendEmail: jest.fn().mockResolvedValue({ messageId: "email123" }),
      };

      const mockAuthService = {
        getCurrentUser: jest.fn().mockReturnValue({ userId: "user123" }),
      };

      notificationService.apiService = mockApiService;
      notificationService.authenticationService = mockAuthService;

      await notificationService.initialize();

      const entry = new NotificationEntry({
        message: "Integration test",
        channels: ["email"],
      });

      await notificationService._deliverToEmail(entry);

      expect(mockApiService.sendEmail).toHaveBeenCalled();
      expect(entry.deliveryResults.email[0].success).toBe(true);
    });

    test("should handle high volume notifications", async () => {
      await notificationService.initialize();
      notificationService.maxQueueSize = 1000;

      const startTime = performance.now();

      for (let i = 0; i < 100; i++) {
        notificationService.notify({
          message: `High volume test ${i}`,
          channels: ["ui"],
        });
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(notificationService.queue).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  // Test cleanup to prevent memory leaks
  afterAll(() => {
    if (mockWindow && typeof mockWindow.cleanup === "function") {
      mockWindow.cleanup();
    }
  });
});

// Technology-prefixed commands verification (TD-002)
console.log(
  "🧪 NotificationService Test Suite - Technology-Prefixed Commands (TD-002)",
);
console.log("✅ Self-contained architecture pattern (TD-001) implemented");
console.log(
  "✅ Comprehensive notification management testing with 95%+ coverage target",
);
