/**
 * Notification Service
 *
 * Provides comprehensive notification management with AUI integration, multiple delivery
 * channels, and advanced features including templating, queuing, and user preferences.
 * Part of US-082-A Foundation Service Layer implementation.
 *
 * Features:
 * - AUI-based in-app notifications (success, info, warning, error)
 * - Email notifications with template support
 * - Browser notifications with permission management
 * - Toast notifications with auto-dismiss
 * - Notification history and user preferences
 * - Queue management with retry logic
 * - Priority-based delivery
 * - Template engine for dynamic content
 * - Audit logging for compliance
 *
 * Integration Points:
 * - AdminGuiService: Service registration and lifecycle
 * - AuthenticationService: User context and permissions
 * - ApiService: Email delivery endpoints
 * - ConfigurationService: Settings and templates
 */

(function () {
  "use strict";

  /**
   * Notification entry for queue management and history
   */
  class NotificationEntry {
    constructor(notification) {
      this.id = notification.id || this.generateId();
      this.type = notification.type || "info";
      this.title = notification.title || "";
      this.message = notification.message || "";
      this.channels = notification.channels || ["ui"];
      this.priority = notification.priority || "normal";
      this.userId = notification.userId;
      this.metadata = notification.metadata || {};
      this.template = notification.template;
      this.templateData = notification.templateData || {};
      this.retryCount = 0;
      this.maxRetries = notification.maxRetries || 3;
      this.createdAt = new Date();
      this.scheduledAt = notification.scheduledAt;
      this.deliveredAt = null;
      this.status = "pending"; // pending, delivered, failed, cancelled
      this.deliveryResults = {}; // channel -> result
      this.auditEvents = [];
    }

    generateId() {
      return (
        "notif_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9)
      );
    }

    addAuditEvent(event, details = {}) {
      this.auditEvents.push({
        timestamp: new Date(),
        event: event,
        details: details,
      });
    }

    markDelivered(channel, result = {}) {
      if (!this.deliveryResults[channel]) {
        this.deliveryResults[channel] = [];
      }
      this.deliveryResults[channel].push({
        timestamp: new Date(),
        success: result.success !== false,
        details: result.details || {},
      });

      // Update overall status
      const allChannels = this.channels;
      const deliveredChannels = Object.keys(this.deliveryResults);
      if (deliveredChannels.length >= allChannels.length) {
        this.status = "delivered";
        this.deliveredAt = new Date();
      }

      this.addAuditEvent("channel_delivered", { channel, result });
    }

    markFailed(error, channel = null) {
      this.status = "failed";
      this.addAuditEvent("delivery_failed", { error: error.message, channel });
    }

    shouldRetry() {
      return this.status === "failed" && this.retryCount < this.maxRetries;
    }
  }

  /**
   * User notification preferences
   */
  class UserPreferences {
    constructor(userId, preferences = {}) {
      this.userId = userId;
      this.channels = preferences.channels || {
        ui: true,
        email: true,
        browser: false,
        toast: true,
      };
      this.types = preferences.types || {
        success: true,
        info: true,
        warning: true,
        error: true,
      };
      this.emailFrequency = preferences.emailFrequency || "immediate"; // immediate, digest, disabled
      this.quietHours = preferences.quietHours || {
        enabled: false,
        start: "22:00",
        end: "08:00",
      };
      this.categories = preferences.categories || {
        system: true,
        migration: true,
        team: true,
        personal: true,
      };
    }

    allowsChannel(channel) {
      return this.channels[channel] === true;
    }

    allowsType(type) {
      return this.types[type] === true;
    }

    allowsCategory(category) {
      return this.categories[category] !== false; // default to true
    }

    isInQuietHours() {
      if (!this.quietHours.enabled) return false;

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startHour, startMin] = this.quietHours.start
        .split(":")
        .map(Number);
      const [endHour, endMin] = this.quietHours.end.split(":").map(Number);
      const startTime = startHour * 60 + startMin;
      const endTime = endHour * 60 + endMin;

      if (startTime <= endTime) {
        return currentTime >= startTime && currentTime <= endTime;
      } else {
        // Crosses midnight
        return currentTime >= startTime || currentTime <= endTime;
      }
    }
  }

  /**
   * NotificationService - Comprehensive notification management with AUI integration
   * Extends BaseService for consistent lifecycle management
   */
  class NotificationService extends window.BaseService {
    constructor() {
      super("NotificationService");

      // Service dependencies
      this.apiService = null;
      this.authService = null;
      this.configService = null;

      // Optimized notification state with priority queues
      this.queue = new Map(); // Legacy compatibility - id -> NotificationEntry
      this.priorityQueues = {
        critical: [], // System alerts, errors
        high: [], // User actions, confirmations
        normal: [], // General notifications
        low: [], // Background notifications
      };
      this.history = new Map(); // userId -> NotificationEntry[]
      this.userPreferences = new Map(); // userId -> UserPreferences
      this.templates = new Map(); // templateId -> template
      this.retryQueue = [];

      // Performance tracking
      this.performanceStats = {
        totalProcessed: 0,
        priorityBreakdown: { critical: 0, high: 0, normal: 0, low: 0 },
        averageProcessingTime: 0,
        memoryUsage: 0,
        lastCleanup: Date.now(),
        adaptiveCleanupInterval: 120000,
      };

      // UI state
      this.auiFlags = null;
      this.toastContainer = null;
      this.browserPermission = "default"; // default, granted, denied

      // Optimized Configuration
      this.config = {
        maxHistoryPerUser: 500, // Reduced for better memory management
        retryDelays: [500, 2000, 8000], // Faster initial retries
        toastDuration: 4000, // Slightly faster dismissal
        queueProcessingInterval: 500, // More responsive processing
        cleanupInterval: 120000, // 2 minutes - more frequent cleanup
        emailBatchSize: 75, // Increased for better throughput
        emailBatchInterval: 20000, // 20 seconds - faster email delivery
        priorityProcessing: true,
        adaptiveProcessing: true,
        memoryPressureThreshold: 0.8,
        maxTotalNotifications: 2000, // Overall limit
      };

      // Performance monitoring
      this.metrics = {
        notificationsSent: 0,
        notificationsFailed: 0,
        channelStats: {},
        averageProcessingTime: 0,
        templateUsage: new Map(),
      };

      // Processing state
      this.isProcessing = false;
      this.processingTimer = null;
      this.cleanupTimer = null;
      this.emailBatchTimer = null;
      this.memoryMonitorTimer = null;
      this.emailBatch = [];
      this.lastEmailBatchTime = Date.now();
    }

    /**
     * Initialize the notification service
     */
    async initialize() {
      this.log("Initializing NotificationService");

      // Initialize AUI flags if available
      if (window.AJS && window.AJS.flag) {
        this.auiFlags = window.AJS.flag;
        this.log("AUI flags integration enabled");
      }

      // Create toast container
      this.createToastContainer();

      // Load default templates
      this.loadDefaultTemplates();

      // Request browser notification permission if supported
      await this.requestBrowserPermission();

      this.state = "initialized";
      this.log("NotificationService initialized successfully");
    }

    /**
     * Start the notification service
     */
    async start() {
      if (this.state !== "initialized") {
        throw new Error(
          "NotificationService must be initialized before starting",
        );
      }

      this.log("Starting NotificationService");

      // Get service dependencies
      this.apiService = window.AdminGuiService?.getService("ApiService");
      this.authService = window.AdminGuiService?.getService(
        "AuthenticationService",
      );
      this.configService = window.AdminGuiService?.getService(
        "ConfigurationService",
      );

      if (!this.apiService) {
        this.warn(
          "ApiService not available - email notifications will be disabled",
        );
      }

      if (!this.authService) {
        this.warn(
          "AuthenticationService not available - user context will be limited",
        );
      }

      // Start processing queues
      this.startProcessing();

      this.state = "running";
      this.log("NotificationService started successfully");
    }

    /**
     * Stop the notification service
     */
    async stop() {
      this.log("Stopping NotificationService");

      // Stop processing
      this.stopProcessing();

      // Clear pending notifications
      this.queue.clear();
      this.retryQueue = [];
      this.emailBatch = [];

      this.state = "stopped";
      this.log("NotificationService stopped");
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
      this.log("Cleaning up NotificationService");

      await this.stop();

      // Clear all data
      this.history.clear();
      this.userPreferences.clear();
      this.templates.clear();
      this.metrics = {
        notificationsSent: 0,
        notificationsFailed: 0,
        channelStats: {},
        averageProcessingTime: 0,
        templateUsage: new Map(),
      };

      // Remove toast container
      if (this.toastContainer && this.toastContainer.parentNode) {
        this.toastContainer.parentNode.removeChild(this.toastContainer);
        this.toastContainer = null;
      }

      this.state = "cleaned";
      this.log("NotificationService cleanup completed");
    }

    /**
     * Get service health status
     */
    getHealthStatus() {
      return {
        status: this.state,
        isHealthy: this.state === "running",
        dependencies: {
          apiService: !!this.apiService,
          authService: !!this.authService,
          configService: !!this.configService,
          auiFlags: !!this.auiFlags,
        },
        queueSize: this.queue.size,
        retryQueueSize: this.retryQueue.length,
        emailBatchSize: this.emailBatch.length,
        browserPermission: this.browserPermission,
        metrics: {
          ...this.metrics,
          templateUsage: Object.fromEntries(this.metrics.templateUsage),
        },
        config: this.config,
      };
    }

    /**
     * Send notification through specified channels
     * @param {NotificationOptions} notification - Notification options
     * @returns {Promise<string>} Notification ID
     */
    async notify(notification) {
      const startTime = Date.now();

      try {
        const entry = await this._prepareNotification(notification);

        if (this._shouldSkipNotification(entry)) {
          return entry.id;
        }

        await this._processNotificationEntry(entry);
        this._updateNotificationMetrics(startTime);

        this.log(`Notification ${entry.id} queued successfully`);
        return entry.id;
      } catch (error) {
        this._handleNotificationError(error);
        throw error;
      }
    }

    /**
     * Prepare notification entry
     * @param {NotificationOptions} notification - Notification options
     * @returns {Promise<NotificationEntry>} Prepared notification entry
     * @private
     */
    async _prepareNotification(notification) {
      this._validateNotification(notification);

      const entry = new NotificationEntry(notification);
      await this._enrichWithUserContext(entry);
      await this._applyUserPreferences(entry);
      await this._processNotificationTemplate(entry);

      return entry;
    }

    /**
     * Validate notification input
     * @param {NotificationOptions} notification - Notification to validate
     * @private
     */
    _validateNotification(notification) {
      if (!notification || !notification.message) {
        throw new Error("Notification message is required");
      }
    }

    /**
     * Enrich notification with user context
     * @param {NotificationEntry} entry - Notification entry
     * @returns {Promise<void>}
     * @private
     */
    async _enrichWithUserContext(entry) {
      if (!entry.userId && this.authService) {
        try {
          const currentUser = await this.authService.getCurrentUser();
          entry.userId = currentUser?.usr_id || currentUser?.id;
        } catch (error) {
          this.warn("Failed to get current user for notification", error);
        }
      }
    }

    /**
     * Apply user preferences to notification
     * @param {NotificationEntry} entry - Notification entry
     * @returns {Promise<void>}
     * @private
     */
    async _applyUserPreferences(entry) {
      if (entry.userId) {
        const preferences = await this.getUserPreferences(entry.userId);
        entry.channels = this.filterChannelsByPreferences(
          entry.channels,
          preferences,
          entry,
        );
      }
    }

    /**
     * Process notification template
     * @param {NotificationEntry} entry - Notification entry
     * @returns {Promise<void>}
     * @private
     */
    async _processNotificationTemplate(entry) {
      if (entry.template) {
        await this.processTemplate(entry);
      }
    }

    /**
     * Check if notification should be skipped
     * @param {NotificationEntry} entry - Notification entry
     * @returns {boolean} Should skip
     * @private
     */
    _shouldSkipNotification(entry) {
      if (entry.channels.length === 0) {
        this.log(`Notification ${entry.id} filtered out by user preferences`);
        return true;
      }
      return false;
    }

    /**
     * Process notification entry
     * @param {NotificationEntry} entry - Notification entry
     * @returns {Promise<void>}
     * @private
     */
    async _processNotificationEntry(entry) {
      this._addToQueue(entry);
      this._addToUserHistory(entry);
      await this._handleHighPriorityProcessing(entry);
    }

    /**
     * Add notification to queue
     * @param {NotificationEntry} entry - Notification entry
     * @private
     */
    _addToQueue(entry) {
      this.queue.set(entry.id, entry);
      entry.addAuditEvent("queued");
    }

    /**
     * Add notification to user history
     * @param {NotificationEntry} entry - Notification entry
     * @private
     */
    _addToUserHistory(entry) {
      if (entry.userId) {
        this.addToHistory(entry.userId, entry);
      }
    }

    /**
     * Handle high priority processing
     * @param {NotificationEntry} entry - Notification entry
     * @returns {Promise<void>}
     * @private
     */
    async _handleHighPriorityProcessing(entry) {
      if (entry.priority === "high" || entry.priority === "urgent") {
        await this.processNotification(entry);
      }
    }

    /**
     * Update notification metrics
     * @param {number} startTime - Start time
     * @private
     */
    _updateNotificationMetrics(startTime) {
      const processingTime = Date.now() - startTime;
      this.updateProcessingMetrics(processingTime);
    }

    /**
     * Handle notification error
     * @param {Error} error - Notification error
     * @private
     */
    _handleNotificationError(error) {
      this.error("Failed to send notification", error);
      this.metrics.notificationsFailed++;
    }

    /**
     * Send success notification (convenience method)
     */
    success(message, options = {}) {
      return this.notify({
        type: "success",
        title: options.title || "Success",
        message: message,
        channels: options.channels || ["ui", "toast"],
        ...options,
      });
    }

    /**
     * Send info notification (convenience method)
     */
    info(message, options = {}) {
      return this.notify({
        type: "info",
        title: options.title || "Information",
        message: message,
        channels: options.channels || ["ui"],
        ...options,
      });
    }

    /**
     * Send warning notification (convenience method)
     */
    warning(message, options = {}) {
      return this.notify({
        type: "warning",
        title: options.title || "Warning",
        message: message,
        channels: options.channels || ["ui", "toast"],
        priority: "high",
        ...options,
      });
    }

    /**
     * Send error notification (convenience method)
     */
    error(message, options = {}) {
      return this.notify({
        type: "error",
        title: options.title || "Error",
        message: message,
        channels: options.channels || ["ui", "toast", "email"],
        priority: "urgent",
        ...options,
      });
    }

    /**
     * Get user notification preferences
     */
    async getUserPreferences(userId) {
      if (this.userPreferences.has(userId)) {
        return this.userPreferences.get(userId);
      }

      // Try to load from API
      if (this.apiService) {
        try {
          const response = await this.apiService.get(
            `/users/${userId}/notification-preferences`,
          );
          if (response && response.preferences) {
            const preferences = new UserPreferences(
              userId,
              response.preferences,
            );
            this.userPreferences.set(userId, preferences);
            return preferences;
          }
        } catch (error) {
          this.log(
            `Failed to load user preferences for ${userId}, using defaults:`,
            error,
          );
        }
      }

      // Return defaults
      const preferences = new UserPreferences(userId);
      this.userPreferences.set(userId, preferences);
      return preferences;
    }

    /**
     * Update user notification preferences
     */
    async updateUserPreferences(userId, preferences) {
      const userPrefs = new UserPreferences(userId, preferences);
      this.userPreferences.set(userId, userPrefs);

      // Save to API if available
      if (this.apiService) {
        try {
          await this.apiService.put(
            `/users/${userId}/notification-preferences`,
            {
              preferences: preferences,
            },
          );
          this.log(`Updated notification preferences for user ${userId}`);
        } catch (error) {
          this.error(
            `Failed to save notification preferences for user ${userId}:`,
            error,
          );
        }
      }

      return userPrefs;
    }

    /**
     * Get notification history for user
     */
    getNotificationHistory(userId, options = {}) {
      const history = this.history.get(userId) || [];
      const limit = options.limit || 50;
      const offset = options.offset || 0;
      const type = options.type;
      const status = options.status;

      let filtered = history;

      // Filter by type
      if (type) {
        filtered = filtered.filter((entry) => entry.type === type);
      }

      // Filter by status
      if (status) {
        filtered = filtered.filter((entry) => entry.status === status);
      }

      // Sort by creation date (newest first)
      filtered.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply pagination
      const paginated = filtered.slice(offset, offset + limit);

      return {
        notifications: paginated,
        total: filtered.length,
        hasMore: offset + limit < filtered.length,
      };
    }

    /**
     * Cancel pending notification
     */
    cancelNotification(notificationId) {
      const entry = this.queue.get(notificationId);
      if (entry && entry.status === "pending") {
        entry.status = "cancelled";
        entry.addAuditEvent("cancelled");
        this.queue.delete(notificationId);
        this.log(`Notification ${notificationId} cancelled`);
        return true;
      }
      return false;
    }

    /**
     * Register notification template
     */
    registerTemplate(templateId, template) {
      if (!templateId || !template) {
        throw new Error("Template ID and template are required");
      }

      if (typeof template.render !== "function") {
        throw new Error("Template must have a render function");
      }

      this.templates.set(templateId, {
        id: templateId,
        render: template.render,
        metadata: template.metadata || {},
        registeredAt: new Date(),
      });

      this.log(`Registered notification template: ${templateId}`);
    }

    /**
     * Process notification through all channels
     */
    async processNotification(entry) {
      try {
        entry.addAuditEvent("processing_started");

        const promises = entry.channels.map((channel) =>
          this.deliverToChannel(entry, channel),
        );

        await Promise.allSettled(promises);

        // Check if all deliveries succeeded
        const failedChannels = entry.channels.filter((channel) => {
          const results = entry.deliveryResults[channel];
          return !results || !results.some((r) => r.success);
        });

        if (failedChannels.length === 0) {
          entry.status = "delivered";
          entry.deliveredAt = new Date();
          entry.addAuditEvent("fully_delivered");
          this.metrics.notificationsSent++;
        } else if (entry.shouldRetry()) {
          entry.retryCount++;
          entry.addAuditEvent("scheduled_retry", { attempt: entry.retryCount });
          this.scheduleRetry(entry);
        } else {
          entry.markFailed(
            new Error(
              `Failed to deliver to channels: ${failedChannels.join(", ")}`,
            ),
          );
          this.metrics.notificationsFailed++;
        }

        // Remove from queue if completed
        if (entry.status !== "pending") {
          this.queue.delete(entry.id);
        }
      } catch (error) {
        this.error(`Failed to process notification ${entry.id}:`, error);
        entry.markFailed(error);
        this.metrics.notificationsFailed++;
        this.queue.delete(entry.id);
      }
    }

    /**
     * Deliver notification to specific channel
     */
    async deliverToChannel(entry, channel) {
      try {
        let result;

        switch (channel) {
          case "ui":
            result = await this.deliverToUI(entry);
            break;
          case "toast":
            result = await this.deliverToToast(entry);
            break;
          case "email":
            result = await this.deliverToEmail(entry);
            break;
          case "browser":
            result = await this.deliverToBrowser(entry);
            break;
          default:
            throw new Error(`Unknown delivery channel: ${channel}`);
        }

        entry.markDelivered(channel, result);

        // Update channel metrics
        if (!this.metrics.channelStats[channel]) {
          this.metrics.channelStats[channel] = { sent: 0, failed: 0 };
        }
        this.metrics.channelStats[channel].sent++;
      } catch (error) {
        this.error(`Failed to deliver to ${channel}:`, error);
        entry.markDelivered(channel, { success: false, error: error.message });

        // Update channel metrics
        if (!this.metrics.channelStats[channel]) {
          this.metrics.channelStats[channel] = { sent: 0, failed: 0 };
        }
        this.metrics.channelStats[channel].failed++;
      }
    }

    /**
     * Deliver notification to UI (AUI flags)
     */
    async deliverToUI(entry) {
      if (!this.auiFlags) {
        throw new Error("AUI flags not available");
      }

      const flagType = this.mapTypeToAUIFlag(entry.type);
      const options = {
        type: flagType,
        title: entry.title,
        body: entry.message,
      };

      // Add custom styling or actions if specified
      if (entry.metadata.persistent) {
        options.close = "manual";
      }

      if (entry.metadata.actions) {
        options.actions = entry.metadata.actions;
      }

      this.auiFlags(options);

      return { success: true, channel: "ui", timestamp: new Date() };
    }

    /**
     * Deliver notification as toast
     */
    async deliverToToast(entry) {
      if (!this.toastContainer) {
        throw new Error("Toast container not available");
      }

      const toast = this.createToastElement(entry);
      this.toastContainer.appendChild(toast);

      // Auto-dismiss after configured duration
      const duration = entry.metadata.duration || this.config.toastDuration;
      if (duration > 0) {
        setTimeout(() => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        }, duration);
      }

      // Handle dismiss button
      const dismissBtn = toast.querySelector(".toast-dismiss");
      if (dismissBtn) {
        dismissBtn.addEventListener("click", () => {
          if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
          }
        });
      }

      return { success: true, channel: "toast", timestamp: new Date() };
    }

    /**
     * Deliver notification via email
     */
    async deliverToEmail(entry) {
      if (!this.apiService) {
        throw new Error("ApiService not available for email delivery");
      }

      if (!entry.userId) {
        throw new Error("User ID required for email delivery");
      }

      // Check user preferences for email frequency
      const preferences = await this.getUserPreferences(entry.userId);
      if (!preferences.allowsChannel("email")) {
        throw new Error("User has disabled email notifications");
      }

      if (preferences.emailFrequency === "disabled") {
        throw new Error("User has disabled email notifications");
      }

      // Handle batching for digest emails
      if (preferences.emailFrequency === "digest") {
        this.addToEmailBatch(entry);
        return {
          success: true,
          channel: "email",
          batched: true,
          timestamp: new Date(),
        };
      }

      // Send immediate email
      try {
        const emailData = {
          userId: entry.userId,
          subject:
            entry.title || `${entry.type.toUpperCase()}: UMIG Notification`,
          message: entry.message,
          priority: entry.priority,
          metadata: entry.metadata,
        };

        await this.apiService.post("/notifications/email", emailData);
        return { success: true, channel: "email", timestamp: new Date() };
      } catch (error) {
        throw new Error(`Email delivery failed: ${error.message}`);
      }
    }

    /**
     * Deliver browser notification
     */
    async deliverToBrowser(entry) {
      if (this.browserPermission !== "granted") {
        throw new Error("Browser notification permission not granted");
      }

      if (!("Notification" in window)) {
        throw new Error("Browser notifications not supported");
      }

      const options = {
        body: entry.message,
        icon: this.getBrowserNotificationIcon(entry.type),
        tag: entry.id,
        requireInteraction: entry.priority === "urgent",
      };

      if (entry.metadata.url) {
        options.data = { url: entry.metadata.url };
      }

      const notification = new Notification(
        entry.title || "UMIG Notification",
        options,
      );

      // Handle click events
      notification.onclick = () => {
        if (options.data && options.data.url) {
          window.open(options.data.url, "_blank");
        }
        window.focus();
        notification.close();
      };

      return { success: true, channel: "browser", timestamp: new Date() };
    }

    /**
     * Start processing queues
     */
    startProcessing() {
      if (this.isProcessing) return;

      this.isProcessing = true;

      // Main processing loop
      this.processingTimer = setInterval(() => {
        this.processQueue();
      }, this.config.queueProcessingInterval);

      // Cleanup timer
      this.cleanupTimer = setInterval(() => {
        this.cleanupHistory();
      }, this.config.cleanupInterval);

      // Email batch timer
      this.emailBatchTimer = setInterval(() => {
        this.processEmailBatch();
      }, this.config.emailBatchInterval);

      this.log("Started notification processing");
    }

    /**
     * Stop processing queues
     */
    stopProcessing() {
      if (!this.isProcessing) return;

      this.isProcessing = false;

      if (this.processingTimer) {
        clearInterval(this.processingTimer);
        this.processingTimer = null;
      }

      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
        this.cleanupTimer = null;
      }

      if (this.emailBatchTimer) {
        clearInterval(this.emailBatchTimer);
        this.emailBatchTimer = null;
      }

      this.log("Stopped notification processing");
    }

    /**
     * Process notification queue
     */
    async processQueue() {
      if (this.queue.size === 0 && this.retryQueue.length === 0) {
        return;
      }

      // Process retry queue first
      const now = Date.now();
      const retryReady = [];
      this.retryQueue = this.retryQueue.filter((item) => {
        if (item.retryAt <= now) {
          retryReady.push(item.entry);
          return false;
        }
        return true;
      });

      // Process retry notifications
      for (const entry of retryReady) {
        await this.processNotification(entry);
      }

      // Process regular queue (priority order)
      const entries = Array.from(this.queue.values())
        .filter((entry) => entry.status === "pending")
        .sort(
          (a, b) =>
            this.getPriorityValue(b.priority) -
            this.getPriorityValue(a.priority),
        );

      // Process a batch
      const batchSize = 10;
      for (let i = 0; i < Math.min(batchSize, entries.length); i++) {
        await this.processNotification(entries[i]);
      }
    }

    /**
     * Helper methods
     */

    mapTypeToAUIFlag(type) {
      const mapping = {
        success: "success",
        info: "info",
        warning: "warning",
        error: "error",
      };
      return mapping[type] || "info";
    }

    createToastContainer() {
      this.toastContainer = document.createElement("div");
      this.toastContainer.id = "umig-toast-container";
      this.toastContainer.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
            `;
      document.body.appendChild(this.toastContainer);
    }

    createToastElement(entry) {
      const toast = document.createElement("div");
      toast.className = `umig-toast toast-${entry.type}`;
      toast.style.cssText = `
                background: ${this.getToastBackground(entry.type)};
                color: white;
                padding: 12px 16px;
                margin-bottom: 8px;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                position: relative;
                animation: slideIn 0.3s ease-out;
            `;

      toast.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div>
                        ${entry.title ? `<div style="font-weight: bold; margin-bottom: 4px;">${this.escapeHtml(entry.title)}</div>` : ""}
                        <div>${this.escapeHtml(entry.message)}</div>
                    </div>
                    <button class="toast-dismiss" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0; margin-left: 12px;">&times;</button>
                </div>
            `;

      return toast;
    }

    getToastBackground(type) {
      const colors = {
        success: "#5cb85c",
        info: "#5bc0de",
        warning: "#f0ad4e",
        error: "#d9534f",
      };
      return colors[type] || colors.info;
    }

    getBrowserNotificationIcon(type) {
      // Return appropriate icon URL based on type
      return "/images/notification-icon.png"; // Placeholder
    }

    async requestBrowserPermission() {
      if (!("Notification" in window)) {
        this.browserPermission = "unsupported";
        return;
      }

      if (Notification.permission === "granted") {
        this.browserPermission = "granted";
      } else if (Notification.permission === "denied") {
        this.browserPermission = "denied";
      } else {
        try {
          const permission = await Notification.requestPermission();
          this.browserPermission = permission;
        } catch (error) {
          this.warn(
            "Failed to request browser notification permission:",
            error,
          );
          this.browserPermission = "denied";
        }
      }

      this.log(`Browser notification permission: ${this.browserPermission}`);
    }

    loadDefaultTemplates() {
      // Migration notification template
      this.registerTemplate("migration_status", {
        render: (data) => ({
          title: `Migration ${data.migrationName} ${data.status}`,
          message: `Migration "${data.migrationName}" is now ${data.status.toLowerCase()}. ${data.details || ""}`,
          type:
            data.status === "COMPLETED"
              ? "success"
              : data.status === "FAILED"
                ? "error"
                : "info",
        }),
      });

      // System notification template
      this.registerTemplate("system_alert", {
        render: (data) => ({
          title: data.title || "System Alert",
          message: data.message,
          type:
            data.severity === "HIGH"
              ? "error"
              : data.severity === "MEDIUM"
                ? "warning"
                : "info",
        }),
      });

      this.log("Default notification templates loaded");
    }

    async processTemplate(entry) {
      const template = this.templates.get(entry.template);
      if (!template) {
        throw new Error(`Template not found: ${entry.template}`);
      }

      try {
        const rendered = template.render(entry.templateData);

        // Update entry with rendered content
        if (rendered.title) entry.title = rendered.title;
        if (rendered.message) entry.message = rendered.message;
        if (rendered.type) entry.type = rendered.type;
        if (rendered.channels) entry.channels = rendered.channels;
        if (rendered.priority) entry.priority = rendered.priority;

        // Track template usage
        const usage = this.metrics.templateUsage.get(entry.template) || 0;
        this.metrics.templateUsage.set(entry.template, usage + 1);

        entry.addAuditEvent("template_processed", { template: entry.template });
      } catch (error) {
        throw new Error(`Template processing failed: ${error.message}`);
      }
    }

    filterChannelsByPreferences(channels, preferences, entry) {
      return channels.filter((channel) => {
        if (!preferences.allowsChannel(channel)) return false;
        if (!preferences.allowsType(entry.type)) return false;
        if (
          entry.metadata.category &&
          !preferences.allowsCategory(entry.metadata.category)
        )
          return false;
        if (preferences.isInQuietHours() && entry.priority !== "urgent")
          return false;
        return true;
      });
    }

    addToHistory(userId, entry) {
      if (!this.history.has(userId)) {
        this.history.set(userId, []);
      }

      const userHistory = this.history.get(userId);
      userHistory.unshift(entry); // Add to beginning

      // Limit history size
      if (userHistory.length > this.config.maxHistoryPerUser) {
        userHistory.splice(this.config.maxHistoryPerUser);
      }
    }

    addToEmailBatch(entry) {
      this.emailBatch.push(entry);

      // Process batch if it reaches the limit
      if (this.emailBatch.length >= this.config.emailBatchSize) {
        this.processEmailBatch();
      }
    }

    async processEmailBatch() {
      if (this.emailBatch.length === 0) return;

      const batch = this.emailBatch.splice(0, this.config.emailBatchSize);

      try {
        if (this.apiService) {
          await this.apiService.post("/notifications/email/batch", {
            notifications: batch.map((entry) => ({
              userId: entry.userId,
              subject:
                entry.title || `${entry.type.toUpperCase()}: UMIG Notification`,
              message: entry.message,
              priority: entry.priority,
              metadata: entry.metadata,
            })),
          });

          // Mark all as delivered
          batch.forEach((entry) => {
            entry.markDelivered("email", { success: true, batched: true });
          });

          this.log(`Processed email batch of ${batch.length} notifications`);
        }
      } catch (error) {
        this.error("Failed to process email batch:", error);

        // Mark all as failed
        batch.forEach((entry) => {
          entry.markDelivered("email", {
            success: false,
            error: error.message,
          });
        });
      }
    }

    scheduleRetry(entry) {
      const delay =
        this.config.retryDelays[
          Math.min(entry.retryCount - 1, this.config.retryDelays.length - 1)
        ];
      const retryAt = Date.now() + delay;

      this.retryQueue.push({
        entry: entry,
        retryAt: retryAt,
      });

      this.log(`Scheduled retry for notification ${entry.id} in ${delay}ms`);
    }

    cleanupHistory() {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago

      for (const [userId, history] of this.history.entries()) {
        const filtered = history.filter(
          (entry) => entry.createdAt.getTime() > cutoff,
        );
        if (filtered.length !== history.length) {
          this.history.set(userId, filtered);
        }
      }
    }

    getPriorityValue(priority) {
      const values = { urgent: 4, high: 3, normal: 2, low: 1 };
      return values[priority] || 2;
    }

    updateProcessingMetrics(processingTime) {
      const currentAvg = this.metrics.averageProcessingTime;
      const totalSent = this.metrics.notificationsSent + 1;
      this.metrics.averageProcessingTime =
        (currentAvg * (totalSent - 1) + processingTime) / totalSent;
    }

    escapeHtml(text) {
      const div = document.createElement("div");
      div.textContent = text;
      return div.innerHTML;
    }
  }

  // Export to global namespace
  window.NotificationService = NotificationService;
  window.NotificationEntry = NotificationEntry;
  window.UserPreferences = UserPreferences;
})();
