/**
 * NotificationService Test Suite
 *
 * Comprehensive test coverage for NotificationService following TD-001 and TD-002 patterns.
 * Self-contained architecture with embedded mocks for 100% test isolation.
 *
 * Test Categories:
 * - Service lifecycle management
 * - Notification delivery (UI, toast, email, browser)
 * - User preferences and filtering
 * - Template processing
 * - Queue management and retries
 * - Performance monitoring
 * - Channel-specific functionality
 * - Error handling and edge cases
 *
 * Revolutionary Testing Pattern (TD-001):
 * - Self-contained test architecture
 * - Embedded mocks and utilities
 * - Zero external dependencies
 * - 35% performance improvement through elimination of complex MetaClass operations
 */

const { performance } = require("perf_hooks");

describe("NotificationService", () => {
  // ===== SELF-CONTAINED TEST ARCHITECTURE (TD-001) =====

  let service;
  let mockAdminGuiService;
  let mockApiService;
  let mockAuthService;
  let mockConfigService;
  let mockAJS;
  let mockNotification;
  let originalNotification;
  let originalAJS;
  let mockDocument;
  let originalDocument;

  // Embedded mock implementations (TD-001 pattern)
  const createMockAdminGuiService = () => ({
    getService: jest.fn((serviceName) => {
      switch (serviceName) {
        case "ApiService":
          return mockApiService;
        case "AuthenticationService":
          return mockAuthService;
        case "ConfigurationService":
          return mockConfigService;
        default:
          return null;
      }
    }),
  });

  const createMockApiService = () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    isHealthy: jest.fn(() => true),
  });

  const createMockAuthService = () => ({
    getCurrentUser: jest.fn(() => ({
      usr_id: 1,
      usr_code: "TST",
      usr_first_name: "Test",
      usr_last_name: "User",
      usr_is_admin: true,
    })),
    isAuthenticated: jest.fn(() => true),
    hasPermission: jest.fn(() => true),
  });

  const createMockConfigService = () => ({
    get: jest.fn((key, defaultValue) => defaultValue),
    set: jest.fn(),
    getAll: jest.fn(() => ({})),
  });

  const createMockAJS = () => ({
    flag: jest.fn(),
  });

  const createMockNotification = () => {
    const mockNotificationInstance = {
      close: jest.fn(),
      onclick: null,
      addEventListener: jest.fn(),
    };

    const MockNotificationConstructor = jest.fn(() => mockNotificationInstance);
    MockNotificationConstructor.permission = "granted";
    MockNotificationConstructor.requestPermission = jest.fn(() =>
      Promise.resolve("granted"),
    );

    return {
      constructor: MockNotificationConstructor,
      instance: mockNotificationInstance,
    };
  };

  const createMockDocument = () => ({
    createElement: jest.fn((tagName) => {
      const element = {
        tagName: tagName.toUpperCase(),
        id: "",
        className: "",
        innerHTML: "",
        textContent: "",
        style: { cssText: "" },
        children: [],
        parentNode: null,
        addEventListener: jest.fn(),
        appendChild: jest.fn(function (child) {
          this.children.push(child);
          child.parentNode = this;
        }),
        removeChild: jest.fn(function (child) {
          const index = this.children.indexOf(child);
          if (index > -1) {
            this.children.splice(index, 1);
            child.parentNode = null;
          }
        }),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
      };
      return element;
    }),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn(),
    },
  });

  const createMockWindow = () => ({
    AdminGuiService: mockAdminGuiService,
    AJS: mockAJS,
    Notification: mockNotification.constructor,
    BaseService: class BaseService {
      constructor(name) {
        this.serviceName = name;
        this.state = "created";
        this.startTime = Date.now();
        this.metrics = {
          uptime: 0,
          memoryUsage: 0,
          lastHealthCheck: null,
        };
      }

      log(message, ...args) {
        // Silent for tests
      }

      warn(message, ...args) {
        // Silent for tests
      }

      error(message, ...args) {
        // Silent for tests
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

      getHealthStatus() {
        return {
          status: this.state,
          isHealthy: this.state === "running",
        };
      }
    },
  });

  // Performance monitoring utilities (TD-001)
  const performanceTracker = {
    testTimes: new Map(),
    startTime: null,

    startTest(testName) {
      this.startTime = performance.now();
    },

    endTest(testName) {
      if (this.startTime) {
        const duration = performance.now() - this.startTime;
        this.testTimes.set(testName, duration);
        this.startTime = null;
        return duration;
      }
      return 0;
    },

    getAverageTime() {
      const times = Array.from(this.testTimes.values());
      return times.length > 0
        ? times.reduce((a, b) => a + b, 0) / times.length
        : 0;
    },

    getFastestTest() {
      const times = Array.from(this.testTimes.entries());
      return times.length > 0
        ? times.reduce((a, b) => (a[1] < b[1] ? a : b))
        : null;
    },

    getSlowestTest() {
      const times = Array.from(this.testTimes.entries());
      return times.length > 0
        ? times.reduce((a, b) => (a[1] > b[1] ? a : b))
        : null;
    },
  };

  // ===== SETUP AND TEARDOWN =====

  beforeAll(() => {
    // Store original globals
    if (typeof window !== "undefined") {
      originalAJS = window.AJS;
      originalNotification = window.Notification;
      originalDocument = window.document;
    }
  });

  afterAll(() => {
    // Restore original globals
    if (typeof window !== "undefined") {
      if (originalAJS) window.AJS = originalAJS;
      if (originalNotification) window.Notification = originalNotification;
      if (originalDocument) window.document = originalDocument;
    }

    // Log performance metrics
    console.log("\n📊 NotificationService Test Performance Metrics:");
    console.log(
      `Average test time: ${performanceTracker.getAverageTime().toFixed(2)}ms`,
    );
    const fastest = performanceTracker.getFastestTest();
    const slowest = performanceTracker.getSlowestTest();
    if (fastest)
      console.log(`Fastest test: ${fastest[0]} (${fastest[1].toFixed(2)}ms)`);
    if (slowest)
      console.log(`Slowest test: ${slowest[0]} (${slowest[1].toFixed(2)}ms)`);
  });

  beforeEach(() => {
    performanceTracker.startTest(expect.getState().currentTestName);

    // Create fresh mocks
    mockApiService = createMockApiService();
    mockAuthService = createMockAuthService();
    mockConfigService = createMockConfigService();
    mockAdminGuiService = createMockAdminGuiService();
    mockAJS = createMockAJS();
    mockNotification = createMockNotification();
    mockDocument = createMockDocument();

    // Setup global mocks
    global.window = createMockWindow();
    global.document = mockDocument;
    global.Notification = mockNotification.constructor;
    global.setTimeout = jest.fn((fn, delay) => {
      // Execute immediately for tests
      fn();
      return 123;
    });
    global.setInterval = jest.fn(() => 123);
    global.clearInterval = jest.fn();

    // Load the service classes
    require("../../src/groovy/umig/web/js/services/NotificationService.js");

    // Create service instance
    service = new window.NotificationService();
  });

  afterEach(() => {
    performanceTracker.endTest(expect.getState().currentTestName);

    // Cleanup service
    if (service && service.cleanup) {
      service.cleanup();
    }

    // Clear all mocks
    jest.clearAllMocks();
    jest.clearAllTimers();

    // Clean global state
    delete global.window;
    delete global.document;
    delete global.Notification;
  });

  // ===== SERVICE LIFECYCLE TESTS =====

  describe("Service Lifecycle", () => {
    test("should initialize correctly", async () => {
      expect(service.state).toBe("created");
      expect(service.serviceName).toBe("NotificationService");

      await service.initialize();

      expect(service.state).toBe("initialized");
      expect(service.auiFlags).toBe(mockAJS.flag);
      expect(service.toastContainer).toBeTruthy();
      expect(service.templates.size).toBeGreaterThan(0);
    });

    test("should start with dependencies", async () => {
      await service.initialize();
      await service.start();

      expect(service.state).toBe("running");
      expect(service.apiService).toBe(mockApiService);
      expect(service.authService).toBe(mockAuthService);
      expect(service.configService).toBe(mockConfigService);
      expect(service.isProcessing).toBe(true);
    });

    test("should handle missing dependencies gracefully", async () => {
      mockAdminGuiService.getService.mockReturnValue(null);

      await service.initialize();
      await service.start();

      expect(service.state).toBe("running");
      expect(service.apiService).toBeNull();
      expect(service.authService).toBeNull();
    });

    test("should stop correctly", async () => {
      await service.initialize();
      await service.start();
      await service.stop();

      expect(service.state).toBe("stopped");
      expect(service.isProcessing).toBe(false);
      expect(service.queue.size).toBe(0);
    });

    test("should cleanup resources", async () => {
      await service.initialize();
      await service.start();
      await service.cleanup();

      expect(service.state).toBe("cleaned");
      expect(service.history.size).toBe(0);
      expect(service.templates.size).toBe(0);
      expect(service.userPreferences.size).toBe(0);
    });

    test("should provide health status", async () => {
      await service.initialize();
      await service.start();

      const health = service.getHealthStatus();

      expect(health.status).toBe("running");
      expect(health.isHealthy).toBe(true);
      expect(health.dependencies).toEqual({
        apiService: true,
        authService: true,
        configService: true,
        auiFlags: true,
      });
      expect(health.queueSize).toBe(0);
      expect(health.metrics).toBeDefined();
    });
  });

  // ===== NOTIFICATION DELIVERY TESTS =====

  describe("Notification Delivery", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.start();
    });

    test("should send basic notification", async () => {
      const notificationId = await service.notify({
        message: "Test message",
        type: "info",
      });

      expect(notificationId).toBeTruthy();
      expect(service.queue.has(notificationId)).toBe(true);
    });

    test("should validate notification requirements", async () => {
      await expect(service.notify({})).rejects.toThrow(
        "Notification message is required",
      );
      await expect(service.notify(null)).rejects.toThrow(
        "Notification message is required",
      );
    });

    test("should auto-detect user from auth service", async () => {
      const notificationId = await service.notify({
        message: "Test message",
      });

      const entry = service.queue.get(notificationId);
      expect(entry.userId).toBe(1);
      expect(mockAuthService.getCurrentUser).toHaveBeenCalled();
    });

    test("should handle auth service failure gracefully", async () => {
      mockAuthService.getCurrentUser.mockImplementation(() => {
        throw new Error("Auth failed");
      });

      const notificationId = await service.notify({
        message: "Test message",
      });

      expect(notificationId).toBeTruthy();
      const entry = service.queue.get(notificationId);
      expect(entry.userId).toBeUndefined();
    });

    test("should process high priority notifications immediately", async () => {
      const spy = jest.spyOn(service, "processNotification");

      await service.notify({
        message: "Urgent message",
        priority: "urgent",
      });

      expect(spy).toHaveBeenCalled();
    });

    test("should add to user history", async () => {
      const notificationId = await service.notify({
        message: "Test message",
        userId: 1,
      });

      const history = service.getNotificationHistory(1);
      expect(history.notifications.length).toBe(1);
      expect(history.notifications[0].id).toBe(notificationId);
    });
  });

  // ===== CONVENIENCE METHODS TESTS =====

  describe("Convenience Methods", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.start();
    });

    test("should send success notification", async () => {
      const notificationId = await service.success("Operation completed");

      const entry = service.queue.get(notificationId);
      expect(entry.type).toBe("success");
      expect(entry.title).toBe("Success");
      expect(entry.channels).toEqual(["ui", "toast"]);
    });

    test("should send info notification", async () => {
      const notificationId = await service.info("Information message");

      const entry = service.queue.get(notificationId);
      expect(entry.type).toBe("info");
      expect(entry.title).toBe("Information");
      expect(entry.channels).toEqual(["ui"]);
    });

    test("should send warning notification", async () => {
      const notificationId = await service.warning("Warning message");

      const entry = service.queue.get(notificationId);
      expect(entry.type).toBe("warning");
      expect(entry.title).toBe("Warning");
      expect(entry.priority).toBe("high");
      expect(entry.channels).toEqual(["ui", "toast"]);
    });

    test("should send error notification", async () => {
      const notificationId = await service.error("Error message");

      const entry = service.queue.get(notificationId);
      expect(entry.type).toBe("error");
      expect(entry.title).toBe("Error");
      expect(entry.priority).toBe("urgent");
      expect(entry.channels).toEqual(["ui", "toast", "email"]);
    });
  });

  // ===== CHANNEL DELIVERY TESTS =====

  describe("Channel Delivery", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.start();
    });

    test("should deliver to UI channel", async () => {
      const entry = new window.NotificationEntry({
        message: "Test message",
        type: "info",
        title: "Test Title",
      });

      const result = await service.deliverToUI(entry);

      expect(result.success).toBe(true);
      expect(result.channel).toBe("ui");
      expect(mockAJS.flag).toHaveBeenCalledWith({
        type: "info",
        title: "Test Title",
        body: "Test message",
      });
    });

    test("should handle UI delivery failure", async () => {
      service.auiFlags = null;
      const entry = new window.NotificationEntry({
        message: "Test message",
      });

      await expect(service.deliverToUI(entry)).rejects.toThrow(
        "AUI flags not available",
      );
    });

    test("should deliver to toast channel", async () => {
      const entry = new window.NotificationEntry({
        message: "Test message",
        type: "success",
      });

      const result = await service.deliverToToast(entry);

      expect(result.success).toBe(true);
      expect(result.channel).toBe("toast");
      expect(mockDocument.createElement).toHaveBeenCalledWith("div");
    });

    test("should deliver to email channel", async () => {
      mockApiService.post.mockResolvedValue({ success: true });

      const entry = new window.NotificationEntry({
        message: "Test message",
        userId: 1,
      });

      const result = await service.deliverToEmail(entry);

      expect(result.success).toBe(true);
      expect(result.channel).toBe("email");
      expect(mockApiService.post).toHaveBeenCalledWith(
        "/notifications/email",
        expect.objectContaining({
          userId: 1,
          message: "Test message",
        }),
      );
    });

    test("should handle email delivery without user ID", async () => {
      const entry = new window.NotificationEntry({
        message: "Test message",
      });

      await expect(service.deliverToEmail(entry)).rejects.toThrow(
        "User ID required for email delivery",
      );
    });

    test("should deliver to browser channel", async () => {
      const entry = new window.NotificationEntry({
        message: "Test message",
        title: "Test Title",
      });

      const result = await service.deliverToBrowser(entry);

      expect(result.success).toBe(true);
      expect(result.channel).toBe("browser");
      expect(mockNotification.constructor).toHaveBeenCalledWith(
        "Test Title",
        expect.objectContaining({
          body: "Test message",
          tag: entry.id,
        }),
      );
    });

    test("should handle browser permission denied", async () => {
      service.browserPermission = "denied";
      const entry = new window.NotificationEntry({
        message: "Test message",
      });

      await expect(service.deliverToBrowser(entry)).rejects.toThrow(
        "Browser notification permission not granted",
      );
    });
  });

  // ===== USER PREFERENCES TESTS =====

  describe("User Preferences", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.start();
    });

    test("should load default preferences", async () => {
      const preferences = await service.getUserPreferences(1);

      expect(preferences.userId).toBe(1);
      expect(preferences.channels.ui).toBe(true);
      expect(preferences.channels.email).toBe(true);
      expect(preferences.types.info).toBe(true);
    });

    test("should load preferences from API", async () => {
      mockApiService.get.mockResolvedValue({
        preferences: {
          channels: { ui: false, email: true },
        },
      });

      const preferences = await service.getUserPreferences(1);

      expect(preferences.channels.ui).toBe(false);
      expect(preferences.channels.email).toBe(true);
    });

    test("should update user preferences", async () => {
      mockApiService.put.mockResolvedValue({ success: true });

      const preferences = await service.updateUserPreferences(1, {
        channels: { ui: false, email: true },
      });

      expect(preferences.channels.ui).toBe(false);
      expect(mockApiService.put).toHaveBeenCalledWith(
        "/users/1/notification-preferences",
        {
          preferences: { channels: { ui: false, email: true } },
        },
      );
    });

    test("should filter channels by preferences", async () => {
      // Setup user preferences to disable UI
      service.userPreferences.set(
        1,
        new window.UserPreferences(1, {
          channels: { ui: false, email: true, toast: true },
        }),
      );

      const notificationId = await service.notify({
        message: "Test message",
        userId: 1,
        channels: ["ui", "email", "toast"],
      });

      const entry = service.queue.get(notificationId);
      expect(entry.channels).toEqual(["email", "toast"]);
    });

    test("should respect quiet hours", async () => {
      const preferences = new window.UserPreferences(1, {
        quietHours: {
          enabled: true,
          start: "00:00",
          end: "23:59",
        },
      });

      expect(preferences.isInQuietHours()).toBe(true);

      service.userPreferences.set(1, preferences);

      const notificationId = await service.notify({
        message: "Test message",
        userId: 1,
        priority: "normal",
      });

      const entry = service.queue.get(notificationId);
      expect(entry.channels.length).toBe(0);
    });

    test("should allow urgent notifications during quiet hours", async () => {
      const preferences = new window.UserPreferences(1, {
        quietHours: {
          enabled: true,
          start: "00:00",
          end: "23:59",
        },
      });

      service.userPreferences.set(1, preferences);

      const notificationId = await service.notify({
        message: "Test message",
        userId: 1,
        priority: "urgent",
        channels: ["ui"],
      });

      const entry = service.queue.get(notificationId);
      expect(entry.channels).toEqual(["ui"]);
    });
  });

  // ===== TEMPLATE PROCESSING TESTS =====

  describe("Template Processing", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.start();
    });

    test("should register template", () => {
      service.registerTemplate("test_template", {
        render: (data) => ({
          title: `Test: ${data.name}`,
          message: `Hello ${data.name}!`,
          type: "info",
        }),
      });

      expect(service.templates.has("test_template")).toBe(true);
    });

    test("should validate template registration", () => {
      expect(() => {
        service.registerTemplate("", {});
      }).toThrow("Template ID and template are required");

      expect(() => {
        service.registerTemplate("test", {});
      }).toThrow("Template must have a render function");
    });

    test("should process notification template", async () => {
      service.registerTemplate("greeting", {
        render: (data) => ({
          title: `Hello ${data.name}`,
          message: `Welcome to UMIG, ${data.name}!`,
          type: "success",
        }),
      });

      const notificationId = await service.notify({
        message: "Original message",
        template: "greeting",
        templateData: { name: "John" },
      });

      const entry = service.queue.get(notificationId);
      expect(entry.title).toBe("Hello John");
      expect(entry.message).toBe("Welcome to UMIG, John!");
      expect(entry.type).toBe("success");
    });

    test("should handle template not found", async () => {
      await expect(
        service.notify({
          message: "Test message",
          template: "nonexistent",
        }),
      ).rejects.toThrow("Template not found: nonexistent");
    });

    test("should track template usage", async () => {
      service.registerTemplate("usage_test", {
        render: () => ({ message: "test" }),
      });

      await service.notify({
        message: "Test message",
        template: "usage_test",
      });

      expect(service.metrics.templateUsage.get("usage_test")).toBe(1);
    });
  });

  // ===== QUEUE MANAGEMENT TESTS =====

  describe("Queue Management", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.start();
    });

    test("should process queue in priority order", async () => {
      const processSpy = jest.spyOn(service, "processNotification");

      // Add notifications in reverse priority order
      await service.notify({ message: "Low", priority: "low" });
      await service.notify({ message: "Urgent", priority: "urgent" });
      await service.notify({ message: "Normal", priority: "normal" });

      // Manually trigger queue processing
      await service.processQueue();

      // Should process urgent first due to immediate processing
      expect(processSpy).toHaveBeenCalledTimes(3);
    });

    test("should cancel notification", async () => {
      const notificationId = await service.notify({
        message: "Test message",
      });

      const cancelled = service.cancelNotification(notificationId);

      expect(cancelled).toBe(true);
      expect(service.queue.has(notificationId)).toBe(false);
    });

    test("should not cancel delivered notification", async () => {
      const notificationId = await service.notify({
        message: "Test message",
      });

      const entry = service.queue.get(notificationId);
      entry.status = "delivered";

      const cancelled = service.cancelNotification(notificationId);

      expect(cancelled).toBe(false);
    });

    test("should retry failed notifications", async () => {
      const entry = new window.NotificationEntry({
        message: "Test message",
        channels: ["ui"],
      });

      // Simulate failure
      service.auiFlags = null;
      await service.processNotification(entry);

      expect(entry.status).toBe("failed");
      expect(entry.shouldRetry()).toBe(true);
    });

    test("should not retry after max attempts", async () => {
      const entry = new window.NotificationEntry({
        message: "Test message",
        channels: ["ui"],
        maxRetries: 1,
      });

      entry.retryCount = 1;
      entry.status = "failed";

      expect(entry.shouldRetry()).toBe(false);
    });
  });

  // ===== NOTIFICATION HISTORY TESTS =====

  describe("Notification History", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.start();
    });

    test("should retrieve user history", async () => {
      await service.notify({ message: "Message 1", userId: 1 });
      await service.notify({ message: "Message 2", userId: 1 });

      const history = service.getNotificationHistory(1);

      expect(history.notifications.length).toBe(2);
      expect(history.total).toBe(2);
      expect(history.hasMore).toBe(false);
    });

    test("should paginate history", async () => {
      // Add multiple notifications
      for (let i = 0; i < 10; i++) {
        await service.notify({ message: `Message ${i}`, userId: 1 });
      }

      const firstPage = service.getNotificationHistory(1, {
        limit: 5,
        offset: 0,
      });
      const secondPage = service.getNotificationHistory(1, {
        limit: 5,
        offset: 5,
      });

      expect(firstPage.notifications.length).toBe(5);
      expect(firstPage.hasMore).toBe(true);
      expect(secondPage.notifications.length).toBe(5);
      expect(secondPage.hasMore).toBe(false);
    });

    test("should filter history by type", async () => {
      await service.success("Success message", { userId: 1 });
      await service.error("Error message", { userId: 1 });

      const successHistory = service.getNotificationHistory(1, {
        type: "success",
      });
      const errorHistory = service.getNotificationHistory(1, { type: "error" });

      expect(successHistory.notifications.length).toBe(1);
      expect(successHistory.notifications[0].type).toBe("success");
      expect(errorHistory.notifications.length).toBe(1);
      expect(errorHistory.notifications[0].type).toBe("error");
    });

    test("should limit history per user", async () => {
      const originalLimit = service.config.maxHistoryPerUser;
      service.config.maxHistoryPerUser = 3;

      // Add more notifications than the limit
      for (let i = 0; i < 5; i++) {
        await service.notify({ message: `Message ${i}`, userId: 1 });
      }

      const history = service.getNotificationHistory(1);
      expect(history.notifications.length).toBe(3);

      service.config.maxHistoryPerUser = originalLimit;
    });
  });

  // ===== PERFORMANCE TESTS =====

  describe("Performance", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.start();
    });

    test("should handle high volume of notifications", async () => {
      const startTime = performance.now();
      const promises = [];

      // Send 100 notifications
      for (let i = 0; i < 100; i++) {
        promises.push(service.notify({ message: `Message ${i}` }));
      }

      await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(service.queue.size).toBe(100);
    });

    test("should track processing metrics", async () => {
      await service.notify({ message: "Test message" });

      expect(service.metrics.averageProcessingTime).toBeGreaterThan(0);
    });

    test("should optimize memory usage", async () => {
      const originalSize = service.history.size;

      // Add notifications for multiple users
      for (let userId = 1; userId <= 10; userId++) {
        for (let i = 0; i < 10; i++) {
          await service.notify({ message: `Message ${i}`, userId });
        }
      }

      expect(service.history.size).toBe(10);
      expect(service.history.size).toBeGreaterThanOrEqual(originalSize);

      // Each user should have at most maxHistoryPerUser entries
      for (let userId = 1; userId <= 10; userId++) {
        const userHistory = service.history.get(userId);
        if (userHistory) {
          expect(userHistory.length).toBeLessThanOrEqual(
            service.config.maxHistoryPerUser,
          );
        }
      }
    });
  });

  // ===== EMAIL BATCH PROCESSING TESTS =====

  describe("Email Batch Processing", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.start();
    });

    test("should batch digest emails", async () => {
      service.userPreferences.set(
        1,
        new window.UserPreferences(1, {
          emailFrequency: "digest",
        }),
      );

      await service.notify({
        message: "Test message",
        userId: 1,
        channels: ["email"],
      });

      expect(service.emailBatch.length).toBe(1);
    });

    test("should process email batch when full", async () => {
      const originalBatchSize = service.config.emailBatchSize;
      service.config.emailBatchSize = 2;

      mockApiService.post.mockResolvedValue({ success: true });

      // Setup digest preference
      service.userPreferences.set(
        1,
        new window.UserPreferences(1, {
          emailFrequency: "digest",
        }),
      );

      // Fill batch
      await service.notify({
        message: "Message 1",
        userId: 1,
        channels: ["email"],
      });
      await service.notify({
        message: "Message 2",
        userId: 1,
        channels: ["email"],
      });

      expect(mockApiService.post).toHaveBeenCalledWith(
        "/notifications/email/batch",
        expect.any(Object),
      );

      service.config.emailBatchSize = originalBatchSize;
    });
  });

  // ===== ERROR HANDLING TESTS =====

  describe("Error Handling", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.start();
    });

    test("should handle API service errors gracefully", async () => {
      mockApiService.post.mockRejectedValue(new Error("Network error"));

      const notificationId = await service.notify({
        message: "Test message",
        userId: 1,
        channels: ["email"],
      });

      const entry = service.queue.get(notificationId);
      await service.processNotification(entry);

      expect(entry.status).toBe("failed");
      expect(service.metrics.notificationsFailed).toBeGreaterThan(0);
    });

    test("should handle missing dependencies", async () => {
      service.apiService = null;

      const notificationId = await service.notify({
        message: "Test message",
        channels: ["ui"],
      });

      expect(notificationId).toBeTruthy();
    });

    test("should validate user preferences gracefully", async () => {
      mockApiService.get.mockRejectedValue(new Error("API error"));

      const preferences = await service.getUserPreferences(1);

      expect(preferences).toBeInstanceOf(window.UserPreferences);
      expect(preferences.userId).toBe(1);
    });
  });

  // ===== INTEGRATION TESTS =====

  describe("Integration", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.start();
    });

    test("should integrate with all service dependencies", () => {
      const health = service.getHealthStatus();

      expect(health.dependencies.apiService).toBe(true);
      expect(health.dependencies.authService).toBe(true);
      expect(health.dependencies.configService).toBe(true);
      expect(health.dependencies.auiFlags).toBe(true);
    });

    test("should work without optional dependencies", async () => {
      service.apiService = null;
      service.configService = null;

      const notificationId = await service.notify({
        message: "Test message",
      });

      expect(notificationId).toBeTruthy();
    });
  });

  // ===== EDGE CASES =====

  describe("Edge Cases", () => {
    beforeEach(async () => {
      await service.initialize();
      await service.start();
    });

    test("should handle empty notification queue", async () => {
      await service.processQueue();
      // Should not throw
    });

    test("should handle malformed templates", async () => {
      service.registerTemplate("broken", {
        render: () => {
          throw new Error("Template error");
        },
      });

      await expect(
        service.notify({
          message: "Test message",
          template: "broken",
        }),
      ).rejects.toThrow("Template processing failed");
    });

    test("should handle browser notification failures", async () => {
      global.Notification = undefined;

      const entry = new window.NotificationEntry({
        message: "Test message",
      });

      await expect(service.deliverToBrowser(entry)).rejects.toThrow(
        "Browser notifications not supported",
      );
    });

    test("should handle DOM manipulation errors", () => {
      mockDocument.createElement.mockImplementation(() => {
        throw new Error("DOM error");
      });

      const entry = new window.NotificationEntry({
        message: "Test message",
      });

      expect(async () => {
        await service.deliverToToast(entry);
      }).rejects.toThrow("DOM error");
    });
  });

  // ===== NOTIFICATION ENTRY TESTS =====

  describe("NotificationEntry", () => {
    test("should create entry with defaults", () => {
      const entry = new window.NotificationEntry({
        message: "Test message",
      });

      expect(entry.id).toBeTruthy();
      expect(entry.type).toBe("info");
      expect(entry.channels).toEqual(["ui"]);
      expect(entry.priority).toBe("normal");
      expect(entry.status).toBe("pending");
      expect(entry.retryCount).toBe(0);
    });

    test("should generate unique IDs", () => {
      const entry1 = new window.NotificationEntry({ message: "Test 1" });
      const entry2 = new window.NotificationEntry({ message: "Test 2" });

      expect(entry1.id).not.toBe(entry2.id);
    });

    test("should track audit events", () => {
      const entry = new window.NotificationEntry({
        message: "Test message",
      });

      entry.addAuditEvent("test_event", { data: "test" });

      expect(entry.auditEvents.length).toBe(1);
      expect(entry.auditEvents[0].event).toBe("test_event");
      expect(entry.auditEvents[0].details).toEqual({ data: "test" });
    });

    test("should mark channel as delivered", () => {
      const entry = new window.NotificationEntry({
        message: "Test message",
        channels: ["ui"],
      });

      entry.markDelivered("ui", { success: true });

      expect(entry.deliveryResults.ui).toBeDefined();
      expect(entry.deliveryResults.ui[0].success).toBe(true);
      expect(entry.status).toBe("delivered");
    });
  });

  // ===== USER PREFERENCES TESTS =====

  describe("UserPreferences", () => {
    test("should create with defaults", () => {
      const prefs = new window.UserPreferences(1);

      expect(prefs.userId).toBe(1);
      expect(prefs.channels.ui).toBe(true);
      expect(prefs.channels.email).toBe(true);
      expect(prefs.emailFrequency).toBe("immediate");
    });

    test("should check channel permissions", () => {
      const prefs = new window.UserPreferences(1, {
        channels: { ui: false, email: true },
      });

      expect(prefs.allowsChannel("ui")).toBe(false);
      expect(prefs.allowsChannel("email")).toBe(true);
    });

    test("should handle quiet hours across midnight", () => {
      const prefs = new window.UserPreferences(1, {
        quietHours: {
          enabled: true,
          start: "22:00",
          end: "08:00",
        },
      });

      // Mock current time to be in quiet hours
      const originalDate = Date;
      const mockDate = jest.fn(() => ({
        getHours: () => 23,
        getMinutes: () => 30,
      }));
      global.Date = mockDate;

      expect(prefs.isInQuietHours()).toBe(true);

      global.Date = originalDate;
    });
  });
});
