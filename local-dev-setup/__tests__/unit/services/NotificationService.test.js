/**
 * NotificationService.test.js - Comprehensive Test Suite (Simplified Jest Pattern)
 *
 * US-082-A Phase 1: Foundation Service Layer Notification Testing
 * Following TD-002 simplified Jest pattern - NO self-contained architecture
 * - Standard Jest module loading
 * - Proper CommonJS imports
 * - 95%+ coverage target
 *
 * Features Tested:
 * - Notification queue management
 * - Multi-channel delivery (UI, Browser, Toast)
 * - User preference management
 * - Template rendering and localization
 * - Priority-based processing
 * - Error handling and retry logic
 * - Integration with external services
 * - Performance under high load
 *
 * @version 2.0.0 - Simplified Jest Pattern
 * @author GENDEV Test Suite Generator
 * @since Sprint 6
 */

// Setup globals BEFORE requiring modules
global.window = global.window || {};
global.performance = global.performance || { now: () => Date.now() };
global.document = global.document || {
  createElement: (tag) => ({
    tag,
    style: {},
    classList: {
      add: jest.fn(),
      remove: jest.fn(),
    },
    setAttribute: jest.fn(),
    appendChild: jest.fn(),
  }),
  body: {
    appendChild: jest.fn(),
  },
};

// Mock browser APIs
global.Notification = class MockNotification {
  static instances = [];
  static permission = 'granted';
  
  constructor(title, options) {
    this.title = title;
    this.body = options?.body;
    this.icon = options?.icon;
    MockNotification.instances.push(this);
  }
  
  static requestPermission() {
    return Promise.resolve('granted');
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
  messages: {
    info: jest.fn(),
    warning: jest.fn(),
    error: jest.fn(),
    success: jest.fn(),
  },
  toInit: jest.fn(),
};

// Standard CommonJS require - NO vm.runInContext
const { NotificationService, NotificationEntry, UserPreferences } = require("../../../../src/groovy/umig/web/js/services/NotificationService.js");

// Mock Logger for testing
class MockLogger {
  constructor() {
    this.logs = [];
  }

  info(...args) {
    this.logs.push(["INFO", ...args]);
  }

  error(...args) {
    this.logs.push(["ERROR", ...args]);
  }

  warn(...args) {
    this.logs.push(["WARN", ...args]);
  }

  debug(...args) {
    this.logs.push(["DEBUG", ...args]);
  }

  clear() {
    this.logs = [];
  }
}

// Mock AuthService for user context
class MockAuthService {
  constructor() {
    this.currentUser = {
      userId: "test-user-123",
      displayName: "Test User",
      email: "test@example.com",
      locale: "en-US",
    };
  }

  getCurrentUser() {
    return this.currentUser;
  }

  setCurrentUser(user) {
    this.currentUser = user;
  }
}

// Mock AdminGuiService for integration testing
class MockAdminGuiService {
  constructor() {
    this.events = [];
    this.services = new Map();
  }

  emit(eventName, data) {
    this.events.push({ eventName, data, timestamp: Date.now() });
  }

  registerService(service) {
    this.services.set(service.name, service);
  }

  getService(name) {
    return this.services.get(name) || null;
  }

  getEvents() {
    return this.events;
  }
}

describe("NotificationService - Comprehensive Foundation Tests", () => {
  let notificationService;
  let mockLogger;
  let mockAuthService;
  let mockAdminGuiService;

  beforeEach(() => {
    mockLogger = new MockLogger();
    mockAuthService = new MockAuthService();
    mockAdminGuiService = new MockAdminGuiService();

    // Reset mock notifications
    global.Notification.instances = [];
    global.AJS.messages.info.mockClear();
    global.AJS.messages.warning.mockClear();
    global.AJS.messages.error.mockClear();
    global.AJS.messages.success.mockClear();

    // Create fresh notification service instance
    notificationService = new NotificationService({
      logger: mockLogger,
      authService: mockAuthService,
      adminGuiService: mockAdminGuiService,
      maxQueueSize: 1000,
      processingInterval: 100, // Fast processing for tests
      enableBrowserNotifications: true,
      enableToastNotifications: true,
    });
  });

  afterEach(async () => {
    if (notificationService && notificationService.running) {
      await notificationService.stop();
    }
    if (notificationService && notificationService.initialized) {
      await notificationService.cleanup();
    }
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
      expect(entry.priority).toBe("medium");
      expect(entry.channels).toEqual(["ui"]);
      expect(entry.createdAt).toBeInstanceOf(Date);
      expect(entry.status).toBe("pending");
      expect(entry.deliveryStatus).toEqual({});
      expect(entry.retryCount).toBe(0);
      expect(entry.auditTrail).toEqual([]);
    });

    test("should generate unique IDs", () => {
      const entry1 = new NotificationEntry({ message: "test1" });
      const entry2 = new NotificationEntry({ message: "test2" });
      
      expect(entry1.id).not.toBe(entry2.id);
      expect(entry1.id).toMatch(/^[a-f0-9-]+$/);
      expect(entry2.id).toMatch(/^[a-f0-9-]+$/);
    });

    test("should add audit events", () => {
      const entry = new NotificationEntry({ message: "test" });
      
      entry.addAuditEvent("queued", "Added to processing queue");
      entry.addAuditEvent("delivered", "Delivered via UI channel");
      
      expect(entry.auditTrail).toHaveLength(2);
      expect(entry.auditTrail[0].action).toBe("queued");
      expect(entry.auditTrail[0].details).toBe("Added to processing queue");
      expect(entry.auditTrail[1].action).toBe("delivered");
      expect(entry.auditTrail[1].details).toBe("Delivered via UI channel");
    });

    test("should mark channel as delivered", () => {
      const entry = new NotificationEntry({
        message: "test",
        channels: ["ui", "browser"],
      });

      entry.markChannelDelivered("ui", { messageId: "ui-123" });
      
      expect(entry.deliveryStatus.ui.delivered).toBe(true);
      expect(entry.deliveryStatus.ui.deliveredAt).toBeInstanceOf(Date);
      expect(entry.deliveryStatus.ui.metadata.messageId).toBe("ui-123");
      expect(entry.status).toBe("partial");
    });

    test("should mark as fully delivered when all channels complete", () => {
      const entry = new NotificationEntry({
        message: "test",
        channels: ["ui", "browser"],
      });

      entry.markChannelDelivered("ui", {});
      entry.markChannelDelivered("browser", {});
      
      expect(entry.status).toBe("delivered");
      expect(entry.deliveredAt).toBeInstanceOf(Date);
    });

    test("should mark as failed with error details", () => {
      const entry = new NotificationEntry({ message: "test" });
      const error = new Error("Delivery failed");
      
      entry.markAsFailed(error);
      
      expect(entry.status).toBe("failed");
      expect(entry.error).toBe(error);
      expect(entry.failedAt).toBeInstanceOf(Date);
    });

    test("should determine retry eligibility", () => {
      const entry = new NotificationEntry({ message: "test", maxRetries: 2 });
      
      expect(entry.shouldRetry()).toBe(true);
      
      entry.retryCount = 1;
      expect(entry.shouldRetry()).toBe(true);
      
      entry.retryCount = 2;
      expect(entry.shouldRetry()).toBe(false);
      
      entry.status = "delivered";
      entry.retryCount = 0;
      expect(entry.shouldRetry()).toBe(false);
    });
  });

  describe("UserPreferences Class Tests", () => {
    test("should create UserPreferences with defaults", () => {
      const prefs = new UserPreferences("test-user");
      
      expect(prefs.userId).toBe("test-user");
      expect(prefs.channels.ui.enabled).toBe(true);
      expect(prefs.channels.browser.enabled).toBe(true);
      expect(prefs.channels.toast.enabled).toBe(true);
      expect(prefs.quietHours.enabled).toBe(false);
      expect(prefs.notificationTypes.info.enabled).toBe(true);
      expect(prefs.notificationTypes.warning.enabled).toBe(true);
      expect(prefs.notificationTypes.error.enabled).toBe(true);
      expect(prefs.notificationTypes.success.enabled).toBe(true);
    });

    test("should enable/disable channels", () => {
      const prefs = new UserPreferences("test-user");
      
      prefs.setChannelEnabled("browser", false);
      expect(prefs.channels.browser.enabled).toBe(false);
      
      prefs.setChannelEnabled("browser", true);
      expect(prefs.channels.browser.enabled).toBe(true);
    });

    test("should check channel status", () => {
      const prefs = new UserPreferences("test-user");
      
      expect(prefs.isChannelEnabled("ui")).toBe(true);
      expect(prefs.isChannelEnabled("browser")).toBe(true);
      
      prefs.setChannelEnabled("browser", false);
      expect(prefs.isChannelEnabled("browser")).toBe(false);
    });

    test("should set notification type preferences", () => {
      const prefs = new UserPreferences("test-user");
      
      prefs.setNotificationTypeEnabled("info", false);
      expect(prefs.notificationTypes.info.enabled).toBe(false);
      
      prefs.setNotificationTypeEnabled("info", true);
      expect(prefs.notificationTypes.info.enabled).toBe(true);
    });

    test("should serialize to JSON", () => {
      const prefs = new UserPreferences("test-user");
      prefs.setChannelEnabled("browser", false);
      prefs.setNotificationTypeEnabled("info", false);
      
      const json = prefs.toJSON();
      
      expect(json.userId).toBe("test-user");
      expect(json.channels.browser.enabled).toBe(false);
      expect(json.notificationTypes.info.enabled).toBe(false);
    });

    test("should load from JSON", () => {
      const data = {
        userId: "test-user",
        channels: {
          ui: { enabled: true },
          browser: { enabled: false },
          toast: { enabled: true },
        },
        notificationTypes: {
          info: { enabled: false },
          warning: { enabled: true },
          error: { enabled: true },
          success: { enabled: true },
        },
      };
      
      const prefs = UserPreferences.fromJSON(data);
      
      expect(prefs.userId).toBe("test-user");
      expect(prefs.channels.browser.enabled).toBe(false);
      expect(prefs.notificationTypes.info.enabled).toBe(false);
    });
  });

  describe("NotificationService Core Tests", () => {
    test("should create NotificationService with initial state", () => {
      expect(notificationService).toBeDefined();
      expect(notificationService.name).toBe("NotificationService");
      expect(notificationService.initialized).toBe(false);
      expect(notificationService.running).toBe(false);
      expect(notificationService.queue).toEqual([]);
      expect(notificationService.userPreferences).toBeInstanceOf(Map);
    });

    test("should initialize with configuration", async () => {
      await notificationService.initialize();
      
      expect(notificationService.initialized).toBe(true);
      expect(notificationService.config).toBeDefined();
      expect(notificationService.config.maxQueueSize).toBe(1000);
      expect(notificationService.config.processingInterval).toBe(100);
      expect(notificationService.templates).toBeDefined();
    });

    test("should start processing queue", async () => {
      await notificationService.initialize();
      await notificationService.start();
      
      expect(notificationService.running).toBe(true);
      expect(notificationService.processingTimer).toBeDefined();
    });

    test("should stop processing", async () => {
      await notificationService.initialize();
      await notificationService.start();
      await notificationService.stop();
      
      expect(notificationService.running).toBe(false);
      expect(notificationService.processingTimer).toBeNull();
    });

    test("should add notification to queue", () => {
      const notification = {
        message: "Test notification",
        type: "info",
      };

      const entry = notificationService.notify(notification);
      
      expect(entry).toBeInstanceOf(NotificationEntry);
      expect(notificationService.queue).toHaveLength(1);
      expect(notificationService.queue[0]).toBe(entry);
    });

    test("should respect max queue size", () => {
      // Set small queue size for testing
      notificationService.config = { ...notificationService.config, maxQueueSize: 3 };

      // Add notifications beyond limit
      for (let i = 0; i < 5; i++) {
        notificationService.notify({ message: `Test ${i}`, type: "info" });
      }

      expect(notificationService.queue).toHaveLength(3);
      expect(notificationService.metrics.queueDropped).toBe(2);
    });

    test("should process high priority notifications first", () => {
      // Add notifications with different priorities
      const low = notificationService.notify({ message: "Low", priority: "low" });
      const high = notificationService.notify({ message: "High", priority: "high" });
      const medium = notificationService.notify({ message: "Medium", priority: "medium" });

      // Queue should be reordered by priority
      expect(notificationService.queue[0]).toBe(high);
      expect(notificationService.queue[1]).toBe(medium);
      expect(notificationService.queue[2]).toBe(low);
    });

    test("should deliver UI notifications via AJS", async () => {
      await notificationService.initialize();
      await notificationService.start();

      const notification = {
        message: "UI Test notification",
        type: "info",
        channels: ["ui"],
      };

      notificationService.notify(notification);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(global.AJS.messages.info).toHaveBeenCalledWith({
        title: "Notification",
        body: "UI Test notification",
      });
    });

    test("should deliver browser notifications", async () => {
      await notificationService.initialize();
      await notificationService.start();

      const notification = {
        message: "This is a test",
        type: "info",
        channels: ["browser"],
      };

      notificationService.notify(notification);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(global.Notification.instances).toHaveLength(1);
      expect(global.Notification.instances[0].title).toBe("Notification");
      expect(global.Notification.instances[0].body).toBe("This is a test");
    });

    test("should handle browser notification permission denial", async () => {
      // Mock permission denial
      global.Notification.permission = 'denied';
      global.Notification.requestPermission = jest.fn().mockResolvedValue('denied');

      await notificationService.initialize();
      await notificationService.start();

      const notification = {
        message: "Test",
        type: "info",
        channels: ["browser"],
      };

      const entry = notificationService.notify(notification);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(entry.deliveryStatus.browser?.delivered).toBe(false);
      expect(entry.deliveryStatus.browser?.error).toBeDefined();

      // Restore permission for other tests
      global.Notification.permission = 'granted';
    });

    test("should create and manage toast notifications", async () => {
      await notificationService.initialize();
      await notificationService.start();

      const notification = {
        message: "Toast test",
        type: "success",
        channels: ["toast"],
        duration: 3000,
      };

      notificationService.notify(notification);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(notificationService.activeToasts).toHaveLength(1);
      const toast = notificationService.activeToasts[0];
      expect(toast.message).toBe("Toast test");
      expect(toast.type).toBe("success");
    });

    test("should manage user preferences", () => {
      const prefs = new UserPreferences("test-user");
      prefs.setChannelEnabled("browser", false);

      notificationService.setUserPreferences("test-user", prefs);

      const retrieved = notificationService.getUserPreferences("test-user");
      expect(retrieved.channels.browser.enabled).toBe(false);
    });

    test("should filter notifications by user preferences", () => {
      const prefs = new UserPreferences("test-user");
      prefs.setNotificationTypeEnabled("info", false);
      prefs.setChannelEnabled("browser", false);

      notificationService.setUserPreferences("test-user", prefs);
      mockAuthService.setCurrentUser({ userId: "test-user", displayName: "Test User" });

      const notification = {
        message: "Info test",
        type: "info",
        channels: ["ui", "browser"],
      };

      const entry = notificationService.notify(notification);

      // Should be filtered out due to user preferences
      expect(entry).toBeNull();
      expect(notificationService.queue).toHaveLength(0);
    });

    test("should apply template rendering", () => {
      const template = "Hello {{username}}, you have {{count}} new messages";
      const data = { username: "John", count: 5 };

      const rendered = notificationService.renderTemplate(template, data);

      expect(rendered).toBe("Hello John, you have 5 new messages");
    });

    test("should handle template rendering errors", () => {
      const template = "Hello {{invalidSyntax}";
      const data = { username: "John" };

      const rendered = notificationService.renderTemplate(template, data);

      // Should return original template on error
      expect(rendered).toBe(template);
      expect(mockLogger.logs.some(log => log[0] === "ERROR")).toBe(true);
    });

    test("should maintain notification history", async () => {
      await notificationService.initialize();
      await notificationService.start();

      // Add several notifications
      for (let i = 0; i < 5; i++) {
        notificationService.notify({
          message: `Test ${i}`,
          type: "info",
          channels: ["ui"],
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 250));

      const history = notificationService.getNotificationHistory("test-user-123", { limit: 10 });
      expect(history).toHaveLength(5);
      expect(history.every(entry => entry.status === "delivered")).toBe(true);
    });

    test("should provide comprehensive health status", async () => {
      await notificationService.initialize();
      await notificationService.start();

      // Add some test data
      notificationService.notify({ message: "test1" });
      notificationService.notify({ message: "test2" });

      const health = notificationService.getHealth();

      expect(health.status).toBe("healthy");
      expect(health.initialized).toBe(true);
      expect(health.running).toBe(true);
      expect(health.metrics).toBeDefined();
      expect(health.metrics.totalNotifications).toBeGreaterThanOrEqual(2);
      expect(health.queueSize).toBeDefined();
      expect(health.processingRate).toBeDefined();
    });

    test("should cleanup resources properly", async () => {
      await notificationService.initialize();
      await notificationService.start();

      // Add some data
      notificationService.notify({ message: "test" });

      await notificationService.cleanup();

      expect(notificationService.initialized).toBe(false);
      expect(notificationService.running).toBe(false);
      expect(notificationService.queue).toHaveLength(0);
      expect(notificationService.activeToasts).toHaveLength(0);
    });
  });

  describe("Error Handling and Edge Cases", () => {
    beforeEach(async () => {
      await notificationService.initialize();
      await notificationService.start();
    });

    test("should handle invalid notification objects", () => {
      const invalidNotifications = [null, undefined, "", {}, { type: "info" }];

      invalidNotifications.forEach(notification => {
        const result = notificationService.notify(notification);
        expect(result).toBeNull();
      });

      expect(notificationService.queue).toHaveLength(0);
    });

    test("should handle delivery failures gracefully", async () => {
      // Mock AJS to throw error
      global.AJS.messages.info = jest.fn(() => {
        throw new Error("AJS delivery failed");
      });

      const notification = {
        message: "test",
        type: "info",
        channels: ["ui"],
      };

      const entry = notificationService.notify(notification);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 150));

      expect(entry.status).toBe("failed");
      expect(entry.error).toBeDefined();
    });

    test("should respect quiet hours", () => {
      const prefs = new UserPreferences("test-user");
      prefs.quietHours = {
        enabled: true,
        start: "22:00",
        end: "08:00",
      };

      notificationService.setUserPreferences("test-user", prefs);
      mockAuthService.setCurrentUser({ userId: "test-user", displayName: "Test User" });

      // Mock current time to be during quiet hours (e.g., 1:00 AM)
      const mockDate = new Date();
      mockDate.setHours(1, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate);

      const notification = {
        message: "Quiet hours test",
        type: "info",
        priority: "low", // Only high priority should bypass quiet hours
      };

      const entry = notificationService.notify(notification);

      // Should be filtered out due to quiet hours
      expect(entry).toBeNull();

      // Restore Date
      global.Date.mockRestore();
    });

    test("should handle concurrent operations safely", async () => {
      const promises = [];

      // Simulate concurrent notification creation
      for (let i = 0; i < 50; i++) {
        promises.push(
          Promise.resolve().then(() => {
            notificationService.notify({
              message: `Concurrent test ${i}`,
              type: "info",
            });
          })
        );
      }

      await Promise.all(promises);

      expect(notificationService.queue.length).toBeLessThanOrEqual(50);
      expect(notificationService.metrics.totalNotifications).toBe(50);
    });
  });

  describe("Integration and Performance Tests", () => {
    test("should integrate with other services", async () => {
      await notificationService.initialize();
      await notificationService.start();

      // Test AdminGuiService integration
      const notification = {
        message: "Integration test",
        type: "info",
        channels: ["ui"],
      };

      notificationService.notify(notification);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 150));

      const events = mockAdminGuiService.getEvents();
      const notificationEvent = events.find(e => e.eventName === "notification-processed");
      expect(notificationEvent).toBeDefined();
    });

    test("should handle high volume notifications", async () => {
      await notificationService.initialize();
      await notificationService.start();

      const startTime = performance.now();

      // Create 100 notifications
      for (let i = 0; i < 100; i++) {
        notificationService.notify({
          message: `High volume test ${i}`,
          type: "info",
          channels: ["ui"],
        });
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const endTime = performance.now();
      const processingTime = endTime - startTime;

      expect(processingTime).toBeLessThan(2000); // Should complete within 2 seconds
      expect(notificationService.metrics.totalNotifications).toBe(100);
      expect(notificationService.queue.length).toBeLessThanOrEqual(10); // Most should be processed
    });
  });
});

console.log("🧪 NotificationService Test Suite - Simplified Jest Pattern (TD-002)");
console.log("✅ Standard CommonJS module loading implemented");
console.log("✅ Comprehensive notification management testing with 95%+ coverage target");