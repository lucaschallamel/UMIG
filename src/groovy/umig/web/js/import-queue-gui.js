/**
 * UMIG Import Queue Management GUI - US-034 Enhancement
 *
 * Provides user interface for:
 * - Import queue monitoring
 * - Schedule management
 * - Resource utilization tracking
 * - Import request management
 *
 * Integrates with the new US-034 database tables:
 * - stg_import_queue_management_iqm
 * - stg_import_resource_locks_irl
 * - stg_scheduled_import_schedules_sis
 * - stg_schedule_execution_history_seh
 *
 * @author UMIG Development Team
 * @since Sprint 6 - US-034 Phase 2 Integration
 *
 * Security: XSS prevention through HTML escaping
 * Performance: Differential DOM updates with scroll position preservation
 * Error handling: User-visible notifications with proper cleanup
 */

(function () {
  "use strict";

  // Import Queue Management namespace
  window.importQueueGui = {
    // State management
    state: {
      currentView: "queue",
      refreshInterval: 5000, // 5 seconds
      refreshTimer: null,
      selectedRequest: null,
      selectedSchedule: null,
      queueData: null,
      scheduleData: null,
      resourceData: null,
      scrollPositions: new Map(), // Track scroll positions per view
      notifications: new Set(), // Track active notifications for cleanup
    },

    // Security utilities for XSS prevention
    security: {
      /**
       * Escape HTML characters to prevent XSS
       * @param {string} str - The string to escape
       * @returns {string} Escaped string safe for HTML insertion
       */
      escapeHtml(str) {
        if (typeof str !== "string") return str;
        const div = document.createElement("div");
        div.textContent = str;
        return div.innerHTML;
      },

      /**
       * Validate and sanitize UUID format
       * @param {string} uuid - UUID to validate
       * @returns {string|null} Valid UUID or null if invalid
       */
      validateUuid(uuid) {
        const uuidRegex =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid) ? uuid : null;
      },

      /**
       * Validate and sanitize text input
       * @param {string} text - Text to validate
       * @param {number} maxLength - Maximum allowed length
       * @returns {string|null} Valid text or null if invalid
       */
      validateText(text, maxLength = 1000) {
        if (typeof text !== "string" || text.length > maxLength) {
          return null;
        }
        return text.trim();
      },
    },

    // API endpoints
    api: {
      baseUrl: "/rest/scriptrunner/latest/custom",
      endpoints: {
        queue: "/import-queue",
        request: "/import-request",
        schedules: "/import-schedules",
        resources: "/import-resources",
      },
    },

    // Performance utilities
    performance: {
      /**
       * Save current scroll position for a view
       * @param {string} viewName - Name of the view
       */
      saveScrollPosition(viewName) {
        const $view = $(`#${viewName}-view`);
        if ($view.length) {
          const scrollTop = $view.scrollTop() || 0;
          window.importQueueGui.state.scrollPositions.set(viewName, scrollTop);
        }
      },

      /**
       * Restore scroll position for a view
       * @param {string} viewName - Name of the view
       */
      restoreScrollPosition(viewName) {
        const scrollTop =
          window.importQueueGui.state.scrollPositions.get(viewName);
        if (typeof scrollTop === "number") {
          const $view = $(`#${viewName}-view`);
          if ($view.length) {
            $view.scrollTop(scrollTop);
          }
        }
      },

      /**
       * Compare two objects to determine if DOM update is needed
       * @param {Object} oldData - Previous data
       * @param {Object} newData - New data
       * @returns {boolean} True if update is needed
       */
      needsUpdate(oldData, newData) {
        return JSON.stringify(oldData) !== JSON.stringify(newData);
      },

      /**
       * Debounce function calls to prevent excessive API calls
       * @param {Function} func - Function to debounce
       * @param {number} delay - Delay in milliseconds
       * @returns {Function} Debounced function
       */
      debounce(func, delay) {
        let timeoutId;
        return function (...args) {
          clearTimeout(timeoutId);
          timeoutId = setTimeout(() => func.apply(this, args), delay);
        };
      },
    },

    // Notification system for user feedback
    notifications: {
      /**
       * Show success notification using AUI flags
       * @param {string} message - Success message to display
       */
      showSuccess(message) {
        const flag = {
          type: "success",
          title: "Success",
          body: window.importQueueGui.security.escapeHtml(message),
          close: "auto",
        };
        const flagId = AJS.flag(flag);
        window.importQueueGui.state.notifications.add(flagId);

        // Auto-cleanup after 5 seconds
        setTimeout(() => {
          window.importQueueGui.state.notifications.delete(flagId);
        }, 5000);
      },

      /**
       * Show error notification using AUI flags
       * @param {string} title - Error title
       * @param {string} message - Error message to display
       */
      showError(title, message) {
        const flag = {
          type: "error",
          title: window.importQueueGui.security.escapeHtml(title),
          body: window.importQueueGui.security.escapeHtml(message),
          close: "manual",
        };
        const flagId = AJS.flag(flag);
        window.importQueueGui.state.notifications.add(flagId);

        // Log error to console for debugging
        console.error(`${title}:`, message);
      },

      /**
       * Show warning notification using AUI flags
       * @param {string} title - Warning title
       * @param {string} message - Warning message to display
       */
      showWarning(title, message) {
        const flag = {
          type: "warning",
          title: window.importQueueGui.security.escapeHtml(title),
          body: window.importQueueGui.security.escapeHtml(message),
          close: "auto",
        };
        const flagId = AJS.flag(flag);
        window.importQueueGui.state.notifications.add(flagId);

        setTimeout(() => {
          window.importQueueGui.state.notifications.delete(flagId);
        }, 5000);
      },

      /**
       * Clear all active notifications
       */
      clearAll() {
        this.state.notifications.forEach((flagId) => {
          AJS.flag.close(flagId);
        });
        this.state.notifications.clear();
      },
    },

    /**
     * Initialize Import Queue GUI with proper cleanup
     */
    init() {
      console.log("Initializing Import Queue Management GUI");

      // Clean up any existing resources
      this.cleanup();

      this.setupEventHandlers();
      this.initializeViews();
      this.startAutoRefresh();
      this.loadQueueStatus();

      // Setup cleanup on page unload
      $(window).on("beforeunload", () => {
        this.cleanup();
      });
    },

    /**
     * Cleanup resources and timers to prevent memory leaks
     */
    cleanup() {
      this.stopAutoRefresh();
      this.notifications.clearAll();
      this.state.scrollPositions.clear();
    },

    /**
     * Setup event handlers for queue management
     */
    setupEventHandlers() {
      // View switching
      $(document).on("click", "[data-queue-view]", (e) => {
        e.preventDefault();
        const view = $(e.target).data("queue-view");
        this.switchView(view);
      });

      // Queue management actions
      $(document).on("click", "[data-queue-action]", (e) => {
        e.preventDefault();
        const action = $(e.target).data("queue-action");
        const requestId = $(e.target).data("request-id");
        this.handleQueueAction(action, requestId);
      });

      // Schedule management actions
      $(document).on("click", "[data-schedule-action]", (e) => {
        e.preventDefault();
        const action = $(e.target).data("schedule-action");
        const scheduleId = $(e.target).data("schedule-id");
        this.handleScheduleAction(action, scheduleId);
      });

      // Refresh controls
      $(document).on("click", "[data-refresh]", (e) => {
        e.preventDefault();
        this.refreshCurrentView();
      });

      // Auto-refresh toggle
      $(document).on("change", "#auto-refresh-toggle", (e) => {
        if (e.target.checked) {
          this.startAutoRefresh();
        } else {
          this.stopAutoRefresh();
        }
      });
    },

    /**
     * Initialize view containers
     */
    initializeViews() {
      const $container = $("#import-queue-container");
      if ($container.length === 0) {
        console.warn("Import queue container not found");
        return;
      }

      // Create view navigation
      const navHtml = `
        <div class="import-queue-nav">
          <ul class="nav nav-tabs">
            <li class="active">
              <a href="#" data-queue-view="queue">
                <i class="fa fa-list"></i> Queue Status
              </a>
            </li>
            <li>
              <a href="#" data-queue-view="schedules">
                <i class="fa fa-calendar"></i> Schedules
              </a>
            </li>
            <li>
              <a href="#" data-queue-view="resources">
                <i class="fa fa-tachometer"></i> Resources
              </a>
            </li>
          </ul>
          <div class="nav-controls">
            <label class="checkbox">
              <input type="checkbox" id="auto-refresh-toggle" checked>
              Auto Refresh (5s)
            </label>
            <button class="aui-button aui-button-compact" data-refresh>
              <i class="fa fa-refresh"></i> Refresh
            </button>
          </div>
        </div>
      `;

      // Create view content areas
      const contentHtml = `
        <div class="import-queue-content">
          <div id="queue-view" class="queue-view active">
            <div class="loading-indicator">
              <i class="fa fa-spinner fa-spin"></i> Loading queue status...
            </div>
          </div>
          <div id="schedules-view" class="queue-view">
            <div class="loading-indicator">
              <i class="fa fa-spinner fa-spin"></i> Loading schedules...
            </div>
          </div>
          <div id="resources-view" class="queue-view">
            <div class="loading-indicator">
              <i class="fa fa-spinner fa-spin"></i> Loading resource status...
            </div>
          </div>
        </div>
      `;

      $container.html(navHtml + contentHtml);
    },

    /**
     * Switch between different views
     */
    switchView(viewName) {
      // Update navigation
      $(".import-queue-nav .nav li").removeClass("active");
      $(`[data-queue-view="${viewName}"]`).closest("li").addClass("active");

      // Update content
      $(".queue-view").removeClass("active");
      $(`#${viewName}-view`).addClass("active");

      // Update state and load data
      this.state.currentView = viewName;
      this.loadViewData(viewName);
    },

    /**
     * Load data for specific view with performance optimization
     */
    async loadViewData(viewName) {
      try {
        // Save current scroll position before data load
        this.performance.saveScrollPosition(viewName);

        switch (viewName) {
          case "queue":
            await this.loadQueueStatus();
            break;
          case "schedules":
            await this.loadSchedules();
            break;
          case "resources":
            await this.loadResources();
            break;
        }

        // Restore scroll position after rendering
        setTimeout(() => {
          this.performance.restoreScrollPosition(viewName);
        }, 100);
      } catch (error) {
        console.error(`Failed to load ${viewName} data:`, error);
        this.notifications.showError(
          `Failed to load ${viewName} data`,
          error.message || "An unexpected error occurred",
        );
      }
    },

    /**
     * Load queue status and active imports with differential updates
     */
    async loadQueueStatus() {
      try {
        const response = await $.get(
          `${this.api.baseUrl}${this.api.endpoints.queue}`,
        );

        // Only update if data has changed to prevent unnecessary DOM manipulation
        if (this.performance.needsUpdate(this.state.queueData, response)) {
          this.state.queueData = response;
          this.renderQueueView(response);
        }
      } catch (error) {
        console.error("Failed to load queue status:", error);
        this.notifications.showError(
          "Failed to load queue status",
          error.responseText || "Unable to retrieve queue status from server",
        );
      }
    },

    /**
     * Render queue status view
     */
    renderQueueView(data) {
      const $view = $("#queue-view");

      // System overview
      const systemHtml = `
        <div class="queue-overview">
          <div class="overview-cards">
            <div class="overview-card">
              <h3>Active Imports</h3>
              <div class="metric-value">${data.queue?.activeRequests?.length || 0}</div>
            </div>
            <div class="overview-card">
              <h3>Queued Requests</h3>
              <div class="metric-value">${data.queue?.queuedRequests?.length || 0}</div>
            </div>
            <div class="overview-card">
              <h3>Available Slots</h3>
              <div class="metric-value">${data.system?.availableSlots || 0}</div>
            </div>
            <div class="overview-card">
              <h3>System Load</h3>
              <div class="metric-value">${this.formatPercentage(data.resources?.systemLoad || 0)}</div>
            </div>
          </div>
        </div>
      `;

      // Active imports table
      const activeImportsHtml = this.renderActiveImportsTable(
        data.queue?.activeRequests || [],
      );

      // Queued requests table
      const queuedRequestsHtml = this.renderQueuedRequestsTable(
        data.queue?.queuedRequests || [],
      );

      // System recommendations with XSS protection
      const recommendationsHtml = `
        <div class="system-recommendations">
          <h3><i class="fa fa-lightbulb-o"></i> System Recommendations</h3>
          <ul>
            ${(data.recommendations || []).map((rec) => `<li>${this.security.escapeHtml(rec)}</li>`).join("")}
          </ul>
        </div>
      `;

      const html =
        systemHtml +
        activeImportsHtml +
        queuedRequestsHtml +
        recommendationsHtml;
      $view.html(html);
    },

    /**
     * Render active imports table with XSS protection
     */
    renderActiveImportsTable(activeImports) {
      if (activeImports.length === 0) {
        return '<div class="no-data"><i class="fa fa-info-circle"></i> No active imports</div>';
      }

      const tableRows = activeImports
        .map((request) => {
          // Validate and escape all user-controlled data
          const requestId = this.security.validateUuid(request.requestId);
          if (!requestId) {
            console.warn("Invalid request ID found:", request.requestId);
            return ""; // Skip invalid entries
          }

          const importType = this.security.escapeHtml(
            request.importType || "N/A",
          );
          const userId = this.security.escapeHtml(request.userId || "Unknown");
          const progress = Math.max(
            0,
            Math.min(100, parseInt(request.progress) || 0),
          );
          const escapedRequestId = this.security.escapeHtml(requestId);
          const requestIdShort = this.security.escapeHtml(
            requestId.substring(0, 8),
          );

          return `
          <tr>
            <td>
              <span class="request-id" title="${escapedRequestId}">
                ${requestIdShort}...
              </span>
            </td>
            <td>${importType}</td>
            <td>${userId}</td>
            <td>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progress}%"></div>
              </div>
              <span class="progress-text">${progress}%</span>
            </td>
            <td>${this.formatTimestamp(request.startedAt)}</td>
            <td>${this.formatDuration(request.estimatedCompletion)}</td>
            <td>
              <button class="aui-button aui-button-compact" 
                      data-queue-action="cancel" 
                      data-request-id="${escapedRequestId}"
                      title="Cancel Import">
                <i class="fa fa-stop"></i>
              </button>
            </td>
          </tr>
        `;
        })
        .filter((row) => row !== "")
        .join("");

      const tableHtml = `
        <div class="active-imports">
          <h3><i class="fa fa-cog fa-spin"></i> Active Imports</h3>
          <table class="aui active-imports-table">
            <thead>
              <tr>
                <th>Request ID</th>
                <th>Type</th>
                <th>User</th>
                <th>Progress</th>
                <th>Started</th>
                <th>ETA</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;

      return tableHtml;
    },

    /**
     * Render queued requests table with XSS protection
     */
    renderQueuedRequestsTable(queuedRequests) {
      if (queuedRequests.length === 0) {
        return '<div class="no-data"><i class="fa fa-info-circle"></i> No queued requests</div>';
      }

      const tableRows = queuedRequests
        .map((request, index) => {
          // Validate and escape all user-controlled data
          const requestId = this.security.validateUuid(request.requestId);
          if (!requestId) {
            console.warn("Invalid request ID found:", request.requestId);
            return ""; // Skip invalid entries
          }

          const importType = this.security.escapeHtml(
            request.importType || "N/A",
          );
          const userId = this.security.escapeHtml(request.userId || "Unknown");
          const priority = Math.max(
            1,
            Math.min(20, parseInt(request.priority) || 5),
          );
          const priorityClass =
            priority > 10 ? "high" : priority > 5 ? "medium" : "low";
          const escapedRequestId = this.security.escapeHtml(requestId);
          const requestIdShort = this.security.escapeHtml(
            requestId.substring(0, 8),
          );

          return `
          <tr>
            <td><span class="queue-position">#${index + 1}</span></td>
            <td>
              <span class="request-id" title="${escapedRequestId}">
                ${requestIdShort}...
              </span>
            </td>
            <td>${importType}</td>
            <td>${userId}</td>
            <td>
              <span class="priority priority-${priorityClass}">
                ${priority}
              </span>
            </td>
            <td>${this.formatTimestamp(request.queuedAt)}</td>
            <td>${this.formatDuration(request.estimatedWaitTime)}</td>
            <td>
              <button class="aui-button aui-button-compact" 
                      data-queue-action="cancel" 
                      data-request-id="${escapedRequestId}"
                      title="Cancel Request">
                <i class="fa fa-trash"></i>
              </button>
            </td>
          </tr>
        `;
        })
        .filter((row) => row !== "")
        .join("");

      const tableHtml = `
        <div class="queued-requests">
          <h3><i class="fa fa-hourglass-half"></i> Queued Requests</h3>
          <table class="aui queued-requests-table">
            <thead>
              <tr>
                <th>Position</th>
                <th>Request ID</th>
                <th>Type</th>
                <th>User</th>
                <th>Priority</th>
                <th>Queued</th>
                <th>Est. Wait</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;

      return tableHtml;
    },

    /**
     * Load import schedules with differential updates
     */
    async loadSchedules() {
      try {
        const response = await $.get(
          `${this.api.baseUrl}${this.api.endpoints.schedules}`,
        );

        // Only update if data has changed
        if (this.performance.needsUpdate(this.state.scheduleData, response)) {
          this.state.scheduleData = response;
          this.renderSchedulesView(response);
        }
      } catch (error) {
        console.error("Failed to load schedules:", error);
        this.notifications.showError(
          "Failed to load schedules",
          error.responseText || "Unable to retrieve schedules from server",
        );
      }
    },

    /**
     * Render schedules view
     */
    renderSchedulesView(data) {
      const $view = $("#schedules-view");

      // Schedule overview
      const overviewHtml = `
        <div class="schedule-overview">
          <div class="overview-cards">
            <div class="overview-card">
              <h3>Active Schedules</h3>
              <div class="metric-value">${data.statistics?.activeSchedules || 0}</div>
            </div>
            <div class="overview-card">
              <h3>Executing</h3>
              <div class="metric-value">${data.statistics?.executingSchedules || 0}</div>
            </div>
            <div class="overview-card">
              <h3>Recurring</h3>
              <div class="metric-value">${data.statistics?.recurringSchedules || 0}</div>
            </div>
            <div class="overview-card">
              <h3>Success Rate</h3>
              <div class="metric-value">${this.calculateSuccessRate(data.statistics)}</div>
            </div>
          </div>
          <div class="schedule-actions">
            <button class="aui-button aui-button-primary" data-schedule-action="create">
              <i class="fa fa-plus"></i> Create Schedule
            </button>
          </div>
        </div>
      `;

      // Schedules table
      const schedulesHtml = this.renderSchedulesTable(data.schedules || []);

      const html = overviewHtml + schedulesHtml;
      $view.html(html);
    },

    /**
     * Render schedules table with XSS protection
     */
    renderSchedulesTable(schedules) {
      if (schedules.length === 0) {
        return '<div class="no-data"><i class="fa fa-info-circle"></i> No schedules configured</div>';
      }

      const tableRows = schedules
        .map((schedule) => {
          // Validate and escape all user-controlled data
          const scheduleId = this.security.validateUuid(schedule.scheduleId);
          if (!scheduleId) {
            console.warn("Invalid schedule ID found:", schedule.scheduleId);
            return ""; // Skip invalid entries
          }

          const scheduleName = this.security.escapeHtml(
            schedule.scheduleName || "Unnamed",
          );
          const scheduleDescription = this.security.escapeHtml(
            schedule.scheduleDescription || "",
          );
          const importType = this.security.escapeHtml(
            schedule.importType || "Standard",
          );
          const status = this.security.escapeHtml(schedule.status || "Active");
          const statusClass = (schedule.status || "active")
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, "");
          const priority = Math.max(
            1,
            Math.min(20, parseInt(schedule.priority) || 5),
          );
          const priorityClass =
            priority > 10 ? "high" : priority > 5 ? "medium" : "low";
          const recurring = Boolean(schedule.recurring);
          const escapedScheduleId = this.security.escapeHtml(scheduleId);

          return `
          <tr>
            <td>
              <strong>${scheduleName}</strong>
              <div class="schedule-description">${scheduleDescription}</div>
            </td>
            <td>${importType}</td>
            <td>${this.formatTimestamp(schedule.nextExecution)}</td>
            <td>
              <span class="recurring-badge ${recurring ? "recurring-yes" : "recurring-no"}">
                ${recurring ? "Yes" : "No"}
              </span>
            </td>
            <td>
              <span class="priority priority-${priorityClass}">
                ${priority}
              </span>
            </td>
            <td>
              <span class="status status-${statusClass}">
                ${status}
              </span>
            </td>
            <td>${this.formatPercentage(schedule.successRate || 0)}</td>
            <td>
              <div class="action-buttons">
                <button class="aui-button aui-button-compact" 
                        data-schedule-action="edit" 
                        data-schedule-id="${escapedScheduleId}"
                        title="Edit Schedule">
                  <i class="fa fa-edit"></i>
                </button>
                <button class="aui-button aui-button-compact" 
                        data-schedule-action="run" 
                        data-schedule-id="${escapedScheduleId}"
                        title="Run Now">
                  <i class="fa fa-play"></i>
                </button>
                <button class="aui-button aui-button-compact" 
                        data-schedule-action="delete" 
                        data-schedule-id="${escapedScheduleId}"
                        title="Delete Schedule">
                  <i class="fa fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
        })
        .filter((row) => row !== "")
        .join("");

      const tableHtml = `
        <div class="schedules-list">
          <h3><i class="fa fa-calendar"></i> Import Schedules</h3>
          <table class="aui schedules-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Next Execution</th>
                <th>Recurring</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Success Rate</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </div>
      `;

      return tableHtml;
    },

    /**
     * Load resource utilization data with differential updates
     */
    async loadResources() {
      try {
        const response = await $.get(
          `${this.api.baseUrl}${this.api.endpoints.resources}`,
        );

        // Only update if data has changed
        if (this.performance.needsUpdate(this.state.resourceData, response)) {
          this.state.resourceData = response;
          this.renderResourcesView(response);
        }
      } catch (error) {
        console.error("Failed to load resources:", error);
        this.notifications.showError(
          "Failed to load resources",
          error.responseText || "Unable to retrieve resource data from server",
        );
      }
    },

    /**
     * Render resources view
     */
    renderResourcesView(data) {
      const $view = $("#resources-view");

      // Resource overview
      const overviewHtml = `
        <div class="resource-overview">
          <div class="overview-cards">
            <div class="overview-card">
              <h3>Memory Usage</h3>
              <div class="metric-value">${this.formatPercentage(data.systemStatus?.memoryUtilizationPercent || 0)}</div>
              <div class="metric-bar">
                <div class="metric-fill" style="width: ${data.systemStatus?.memoryUtilizationPercent || 0}%"></div>
              </div>
            </div>
            <div class="overview-card">
              <h3>Active Locks</h3>
              <div class="metric-value">${data.resourceLocks?.length || 0}</div>
            </div>
            <div class="overview-card">
              <h3>DB Connections</h3>
              <div class="metric-value">${data.systemStatus?.dbConnectionsUsed || 0} / ${data.systemStatus?.dbConnectionsTotal || 0}</div>
            </div>
            <div class="overview-card">
              <h3>Disk Space</h3>
              <div class="metric-value">${this.formatPercentage(data.systemStatus?.diskUtilizationPercent || 0)}</div>
              <div class="metric-bar">
                <div class="metric-fill" style="width: ${data.systemStatus?.diskUtilizationPercent || 0}%"></div>
              </div>
            </div>
          </div>
        </div>
      `;

      // Resource locks table
      const locksHtml = this.renderResourceLocksTable(data.resourceLocks || []);

      // Resource recommendations with XSS protection
      const recommendationsHtml = `
        <div class="resource-recommendations">
          <h3><i class="fa fa-lightbulb-o"></i> Resource Recommendations</h3>
          <ul>
            ${(data.recommendations || []).map((rec) => `<li>${this.security.escapeHtml(rec)}</li>`).join("")}
          </ul>
        </div>
      `;

      const html = overviewHtml + locksHtml + recommendationsHtml;
      $view.html(html);
    },

    /**
     * Render resource locks table
     */
    renderResourceLocksTable(locks) {
      if (locks.length === 0) {
        return '<div class="no-data"><i class="fa fa-info-circle"></i> No active resource locks</div>';
      }

      const tableHtml = `
        <div class="resource-locks">
          <h3><i class="fa fa-lock"></i> Active Resource Locks</h3>
          <table class="aui resource-locks-table">
            <thead>
              <tr>
                <th>Resource Type</th>
                <th>Resource ID</th>
                <th>Lock Type</th>
                <th>Locked By</th>
                <th>Locked At</th>
                <th>Duration</th>
                <th>Expires</th>
              </tr>
            </thead>
            <tbody>
              ${locks
                .map(
                  (lock) => `
                <tr>
                  <td>${lock.resourceType}</td>
                  <td>${lock.resourceId}</td>
                  <td>
                    <span class="lock-type lock-${lock.lockType.toLowerCase()}">
                      ${lock.lockType}
                    </span>
                  </td>
                  <td>${lock.lockedByRequest || "Unknown"}</td>
                  <td>${this.formatTimestamp(lock.lockedAt)}</td>
                  <td>${this.formatDuration(Date.now() - new Date(lock.lockedAt).getTime())}</td>
                  <td>${this.formatTimestamp(lock.expiresAt)}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;

      return tableHtml;
    },

    /**
     * Handle queue actions
     */
    async handleQueueAction(action, requestId) {
      try {
        switch (action) {
          case "cancel":
            await this.cancelRequest(requestId);
            break;
        }
      } catch (error) {
        console.error(`Failed to handle queue action ${action}:`, error);
        this.notifications.showError(
          `Failed to ${action} request`,
          error.message || "An unexpected error occurred",
        );
      }
    },

    /**
     * Handle schedule actions
     */
    async handleScheduleAction(action, scheduleId) {
      try {
        switch (action) {
          case "create":
            this.showCreateScheduleModal();
            break;
          case "edit":
            this.showEditScheduleModal(scheduleId);
            break;
          case "run":
            await this.runScheduleNow(scheduleId);
            break;
          case "delete":
            await this.deleteSchedule(scheduleId);
            break;
        }
      } catch (error) {
        console.error(`Failed to handle schedule action ${action}:`, error);
        this.notifications.showError(
          `Failed to ${action} schedule`,
          error.message || "An unexpected error occurred",
        );
      }
    },

    /**
     * Cancel import request with proper input validation
     */
    async cancelRequest(requestId) {
      // Validate request ID before making API call
      const validatedRequestId = this.security.validateUuid(requestId);
      if (!validatedRequestId) {
        this.notifications.showError(
          "Invalid Request",
          "The request ID is not valid",
        );
        return;
      }

      // Get and validate cancellation reason
      const reasonInput =
        prompt("Enter cancellation reason (optional):") ||
        "User requested cancellation";
      const validatedReason = this.security.validateText(reasonInput, 500);

      if (validatedReason === null) {
        this.notifications.showError(
          "Invalid Input",
          "The cancellation reason contains invalid characters or is too long",
        );
        return;
      }

      try {
        const response = await $.ajax({
          url: `${this.api.baseUrl}${this.api.endpoints.request}/${encodeURIComponent(validatedRequestId)}`,
          type: "DELETE",
          data: JSON.stringify({ reason: validatedReason }),
          contentType: "application/json",
        });

        if (response.success) {
          this.notifications.showSuccess("Request cancelled successfully");
          this.refreshCurrentView();
        } else {
          throw new Error(response.error || "Failed to cancel request");
        }
      } catch (error) {
        this.notifications.showError(
          "Cancellation Failed",
          error.responseText ||
            error.message ||
            "Unable to cancel the import request",
        );
      }
    },

    /**
     * Auto-refresh functionality with proper memory management
     */
    startAutoRefresh() {
      this.stopAutoRefresh(); // Clear any existing timer

      // Use debounced refresh to prevent rapid successive calls
      const debouncedRefresh = this.performance.debounce(() => {
        this.refreshCurrentView();
      }, 200);

      this.state.refreshTimer = setInterval(() => {
        // Only refresh if the tab is visible to save resources
        if (!document.hidden) {
          debouncedRefresh();
        }
      }, this.state.refreshInterval);
    },

    stopAutoRefresh() {
      if (this.state.refreshTimer) {
        clearInterval(this.state.refreshTimer);
        this.state.refreshTimer = null;
      }
    },

    refreshCurrentView() {
      // Save scroll position before refresh
      this.performance.saveScrollPosition(this.state.currentView);
      this.loadViewData(this.state.currentView);
    },

    /**
     * Utility methods
     */
    formatTimestamp(timestamp) {
      if (!timestamp) return "N/A";
      return new Date(timestamp).toLocaleString();
    },

    formatDuration(milliseconds) {
      if (!milliseconds || milliseconds < 0) return "N/A";
      const seconds = Math.floor(milliseconds / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      if (hours > 0) {
        return `${hours}h ${minutes % 60}m`;
      } else if (minutes > 0) {
        return `${minutes}m ${seconds % 60}s`;
      } else {
        return `${seconds}s`;
      }
    },

    formatPercentage(value) {
      return `${Math.round(value || 0)}%`;
    },

    calculateSuccessRate(statistics) {
      const total = statistics?.totalExecutions || 0;
      const successful = statistics?.successfulExecutions || 0;
      if (total === 0) return "N/A";
      return this.formatPercentage((successful / total) * 100);
    },

    // Legacy method aliases for backward compatibility
    showSuccess(message) {
      this.notifications.showSuccess(message);
    },

    showError(title, message) {
      this.notifications.showError(title, message);
    },
  };

  // Auto-initialize when DOM is ready
  $(document).ready(() => {
    if ($("#import-queue-container").length > 0) {
      window.importQueueGui.init();
    }
  });
})();
