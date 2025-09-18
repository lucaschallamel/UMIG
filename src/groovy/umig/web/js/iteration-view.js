/**
 * ============================================================================
 * UMIG Enhanced Iteration View v2.0 - US-028 Phase 1 Implementation
 * StepsAPI v2 Integration with Performance Optimization & Real-time Updates
 *
 * TD-003 Phase 2H: StatusProvider Integration
 * - Migrated hardcoded status values to dynamic StatusProvider
 * - Enhanced status validation and fallback patterns
 * - Integrated centralized status management for UI components
 * ============================================================================
 */

/**
 * StepsAPI v2 Client - High-performance API integration with caching
 */
class StepsAPIv2Client {
  constructor() {
    this.baseUrl = "/rest/scriptrunner/latest/custom";
    this.endpoint = "/steps";
    this.cache = new Map();
    this.maxCacheSize = 100; // Maximum cache entries for memory management
    this.cacheTimeout = 30000; // 30 seconds
    this.requestQueue = new Map();
    this.activeTimeouts = new Set(); // Track active timeouts for cleanup
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 5000,
    };
  }

  /**
   * Fetch steps with intelligent caching and performance optimization
   */
  async fetchSteps(filters = {}, options = {}) {
    // Validate input parameters
    await this._validateFilters(filters);
    this._validateOptions(options);

    const cacheKey = this._generateCacheKey("steps", filters, options);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log("StepsAPIv2: Cache hit for", cacheKey);
        return cached.data;
      }
    }

    // Deduplicate concurrent requests
    if (this.requestQueue.has(cacheKey)) {
      return this.requestQueue.get(cacheKey);
    }

    const requestPromise = this._executeStepsRequest(
      filters,
      options,
      cacheKey,
    );
    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  async _executeStepsRequest(filters, options, cacheKey) {
    const queryParams = new URLSearchParams();

    // Add filters to query parameters
    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    // Add pagination and sorting
    if (options.page) queryParams.append("page", options.page);
    if (options.size) queryParams.append("size", options.size);
    if (options.sort) queryParams.append("sort", options.sort);

    const url = `${this.baseUrl}${this.endpoint}?${queryParams.toString()}`;
    console.log("StepsAPIv2: Fetching", url);

    const data = await this._retryRequest(url);

    // Cache the result
    this.cache.set(cacheKey, {
      data: data,
      timestamp: Date.now(),
    });

    // Evict old cache entries if we exceed max size
    this._evictOldestCache();

    return data;
  }

  /**
   * Update step status with optimistic updates
   */
  async updateStepStatus(stepId, statusId, userRole = "NORMAL") {
    const url = `${this.baseUrl}${this.endpoint}/${stepId}/status`;

    // Debug logging
    console.log("StepsAPIv2: updateStepStatus called with:", {
      stepId,
      statusId,
      statusIdType: typeof statusId,
      parsedStatusId: parseInt(statusId),
      url,
      userRole,
    });

    try {
      const requestBody = {
        statusId: parseInt(statusId), // REFACTORED: Send statusId as integer, not status name
      };

      console.log(
        "StepsAPIv2: Sending request body:",
        JSON.stringify(requestBody),
      );

      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "X-Atlassian-Token": "no-check", // Required for Confluence XSRF protection
        },
        credentials: "same-origin", // Include cookies for authentication
        body: JSON.stringify(requestBody),
      });

      console.log("StepsAPIv2: Response status:", response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("StepsAPIv2: Error response body:", errorText);
        throw new Error(
          `Failed to update status: ${response.status} - ${errorText}`,
        );
      }

      // Invalidate relevant caches
      this._invalidateStepCaches(stepId);

      return await response.json();
    } catch (error) {
      console.error("StepsAPIv2: Status update failed:", error);
      throw error;
    }
  }

  /**
   * Bulk update multiple steps
   */
  async bulkUpdateSteps(stepIds, updates) {
    const url = `${this.baseUrl}${this.endpoint}/bulk`;

    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "X-Atlassian-Token": "no-check", // Required for Confluence XSRF protection
      },
      credentials: "same-origin", // Include cookies for authentication
      body: JSON.stringify({
        stepIds: stepIds,
        updates: updates,
        timestamp: new Date().toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Bulk update failed: ${response.status}`);
    }

    // Invalidate caches for all affected steps
    stepIds.forEach((stepId) => this._invalidateStepCaches(stepId));

    return await response.json();
  }

  /**
   * Get step updates since last sync (for real-time updates)
   */
  async fetchStepUpdates(lastSyncTimestamp, filters = {}) {
    const queryParams = new URLSearchParams();
    queryParams.append("since", lastSyncTimestamp);

    Object.entries(filters).forEach(([key, value]) => {
      if (value) queryParams.append(key, value);
    });

    const url = `${this.baseUrl}${this.endpoint}/updates?${queryParams.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch updates: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("StepsAPIv2: Failed to fetch updates:", error);
      return { hasChanges: false, updates: [] };
    }
  }

  /**
   * Retry mechanism for failed requests
   */
  async _retryRequest(url, attempt = 1) {
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt <= this.retryConfig.maxRetries) {
        const delay = Math.min(
          this.retryConfig.baseDelay * Math.pow(2, attempt - 1),
          this.retryConfig.maxDelay,
        );

        console.log(`StepsAPIv2: Retry attempt ${attempt} after ${delay}ms`);
        await new Promise((resolve) => {
          const timeoutId = setTimeout(() => {
            this.activeTimeouts.delete(timeoutId);
            resolve();
          }, delay);
          this.activeTimeouts.add(timeoutId);
        });
        return this._retryRequest(url, attempt + 1);
      }

      throw error;
    }
  }

  _generateCacheKey(operation, filters, options) {
    return `${operation}_${JSON.stringify({ filters, options })}`;
  }

  _invalidateStepCaches(stepId) {
    const keysToDelete = Array.from(this.cache.keys()).filter(
      (key) => key.includes(stepId) || key.includes("steps_"),
    );
    keysToDelete.forEach((key) => this.cache.delete(key));
  }

  clearCache() {
    this.cache.clear();
    console.log("StepsAPIv2: Cache cleared");
  }

  /**
   * Evict oldest cache entries when max size is exceeded (LRU implementation)
   */
  _evictOldestCache() {
    if (this.cache.size > this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      console.log("StepsAPIv2: Evicted oldest cache entry:", firstKey);
    }
  }

  /**
   * Validate filters parameter
   */
  async _validateFilters(filters) {
    if (!filters || typeof filters !== "object") {
      throw new Error("Filters must be an object");
    }

    const validFilters = [
      "migrationId",
      "iterationId",
      "teamId",
      "status",
      "phaseId",
      "sequenceId",
      "planId",
      "labelId",
    ];
    for (const key of Object.keys(filters)) {
      if (!validFilters.includes(key)) {
        throw new Error(
          `Invalid filter: ${key}. Valid filters: ${validFilters.join(", ")}`,
        );
      }
    }

    // Validate UUID formats for ID fields
    if (filters.migrationId && !this._isValidUUID(filters.migrationId)) {
      throw new Error("Invalid migrationId format - must be a valid UUID");
    }
    if (filters.iterationId && !this._isValidUUID(filters.iterationId)) {
      throw new Error("Invalid iterationId format - must be a valid UUID");
    }
    if (filters.phaseId && !this._isValidUUID(filters.phaseId)) {
      throw new Error("Invalid phaseId format - must be a valid UUID");
    }
    if (filters.sequenceId && !this._isValidUUID(filters.sequenceId)) {
      throw new Error("Invalid sequenceId format - must be a valid UUID");
    }
    if (filters.planId && !this._isValidUUID(filters.planId)) {
      throw new Error("Invalid planId format - must be a valid UUID");
    }
    // Validate labelId is an integer (labels use integer IDs, not UUIDs)
    if (filters.labelId && !Number.isInteger(Number(filters.labelId))) {
      throw new Error("labelId must be a valid integer");
    }

    // Validate teamId is a number
    if (filters.teamId && !Number.isInteger(Number(filters.teamId))) {
      throw new Error("teamId must be a valid integer");
    }

    // Validate status values (TD-003 Phase 2H: StatusProvider integration with fallback)
    if (filters.status) {
      const validStatuses = await this.getValidStatusNames();
      if (!validStatuses.includes(filters.status)) {
        throw new Error(
          `Invalid status value. Must be one of: ${validStatuses.join(", ")}`,
        );
      }
    }
  }

  /**
   * Validate options parameter
   */
  _validateOptions(options) {
    if (!options || typeof options !== "object") {
      throw new Error("Options must be an object");
    }

    // Validate pagination options
    if (
      options.page &&
      (!Number.isInteger(Number(options.page)) || Number(options.page) < 1)
    ) {
      throw new Error("page must be a positive integer");
    }
    if (
      options.size &&
      (!Number.isInteger(Number(options.size)) ||
        Number(options.size) < 1 ||
        Number(options.size) > 1000)
    ) {
      throw new Error("size must be a positive integer between 1 and 1000");
    }

    // Validate sort options
    if (options.sort) {
      const validSortFields = [
        "stepOrder",
        "name",
        "status",
        "estimatedDuration",
        "createdDate",
        "lastModified",
        "sequence_number",
        "phase_number",
        "step_number",
      ];
      const sortParts = options.sort.split(",");
      for (const sortPart of sortParts) {
        const [field, direction] = sortPart.trim().split(":");
        if (!validSortFields.includes(field)) {
          throw new Error(
            `Invalid sort field: ${field}. Valid fields: ${validSortFields.join(", ")}`,
          );
        }
        if (direction && !["asc", "desc"].includes(direction.toLowerCase())) {
          throw new Error(
            `Invalid sort direction: ${direction}. Must be 'asc' or 'desc'`,
          );
        }
      }
    }
  }

  /**
   * Validate UUID format
   */
  _isValidUUID(uuid) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Cleanup method to clear all active timeouts and caches
   */
  cleanup() {
    // Clear all active timeouts
    this.activeTimeouts.forEach((id) => clearTimeout(id));
    this.activeTimeouts.clear();

    // Clear request queue and cache
    this.requestQueue.clear();
    this.cache.clear();

    console.log(
      "StepsAPIv2: Cleanup completed - cleared timeouts, request queue, and cache",
    );
  }

  /**
   * Get valid status names from StatusProvider with fallback (TD-003 Phase 2H)
   * @returns {Promise<Array<string>>} Array of valid status names
   */
  async getValidStatusNames() {
    try {
      if (window.StatusProvider) {
        const statuses = await window.StatusProvider.getStatuses("Step");
        return statuses.map((status) => status.name);
      }
    } catch (error) {
      console.warn(
        "StepsAPIv2: StatusProvider failed, using fallback statuses:",
        error,
      );
    }

    // Fallback to hardcoded status names if StatusProvider not available
    return ["PENDING", "IN_PROGRESS", "COMPLETED", "SKIPPED", "FAILED"];
  }

  /**
   * Get default status name from StatusProvider with fallback (TD-003 Phase 2H)
   * @returns {Promise<string>} Default status name
   */
  async getDefaultStatusName() {
    try {
      if (window.StatusProvider) {
        const statuses = await window.StatusProvider.getStatuses("Step");
        if (statuses.length > 0) {
          // Return the first status as default, or look for PENDING specifically
          const pendingStatus = statuses.find(
            (status) => status.name === "PENDING",
          );
          if (pendingStatus) {
            return pendingStatus.name;
          }
          return statuses[0].name;
        }
      }
    } catch (error) {
      console.warn(
        "IterationView: StatusProvider failed for default status, using fallback:",
        error,
      );
    }

    // Fallback to hardcoded default status if StatusProvider not available
    return "PENDING";
  }

  /**
   * Get specific status name from StatusProvider with fallback (TD-003 Phase 2H)
   * @param {string} statusName - The status name to look for
   * @param {string} fallbackName - Fallback status name if not found
   * @returns {Promise<string>} Status name
   */
  async getStatusName(statusName, fallbackName = statusName) {
    try {
      if (window.StatusProvider) {
        const statuses = await window.StatusProvider.getStatuses("Step");
        const foundStatus = statuses.find(
          (status) => status.name === statusName,
        );
        if (foundStatus) {
          return foundStatus.name;
        }
      }
    } catch (error) {
      console.warn(
        `IterationView: StatusProvider failed for ${statusName} status, using fallback:`,
        error,
      );
    }

    // Fallback to provided fallback name if StatusProvider not available
    return fallbackName;
  }
}

/**
 * Real-time Synchronization Engine for live updates
 */
class RealTimeSync {
  constructor(apiClient, iterationView) {
    this.apiClient = apiClient;
    this.iterationView = iterationView;
    this.pollInterval = 60000; // 60 seconds
    this.isPolling = false;
    this.lastSyncTimestamp = new Date().toISOString();
    this.retryCount = 0;
    this.maxRetries = 5;
  }

  startPolling() {
    if (this.isPolling) return;

    this.isPolling = true;
    console.log("RealTimeSync: Starting real-time polling");
    this._scheduleNextPoll();
  }

  stopPolling() {
    this.isPolling = false;
    if (this.pollTimeoutId) {
      clearTimeout(this.pollTimeoutId);
    }
    console.log("RealTimeSync: Stopped real-time polling");
  }

  async _scheduleNextPoll() {
    if (!this.isPolling) return;

    this.pollTimeoutId = setTimeout(async () => {
      try {
        await this._checkForUpdates();
        this.retryCount = 0; // Reset on success
      } catch (error) {
        console.error("RealTimeSync: Polling error:", error);
        this.retryCount++;

        if (this.retryCount >= this.maxRetries) {
          console.warn("RealTimeSync: Max retries reached, stopping polling");
          this.stopPolling();
          this.iterationView.showNotification(
            "Lost connection to server. Please refresh to continue.",
            "error",
          );
          return;
        }
      }

      this._scheduleNextPoll();
    }, this.pollInterval);
  }

  async _checkForUpdates() {
    // 🔧 FIX: Disable API polling to non-existent /steps/updates endpoint
    // The endpoint doesn't exist and was causing continuous 404 errors every 2 seconds
    // TODO: Implement proper /steps/updates endpoint in StepsApi.groovy if real-time sync is needed
    console.log(
      "RealTimeSync: Polling disabled - no /steps/updates endpoint available",
    );
    return; // Skip API call to prevent 404 errors

    const filters = this.iterationView.getCurrentFilters();
    const updates = await this.apiClient.fetchStepUpdates(
      this.lastSyncTimestamp,
      filters,
    );

    if (updates.hasChanges) {
      console.log(
        "RealTimeSync: Received updates:",
        updates.updates.length,
        "changes",
      );
      this._applyUpdates(updates.updates);
      this.lastSyncTimestamp = new Date().toISOString();

      // Show notification for critical changes
      const criticalUpdates = updates.updates.filter(
        (u) =>
          u.type === "status_change" &&
          ["FAILED", "BLOCKED"].includes(u.newStatus),
      );

      if (criticalUpdates.length > 0) {
        this.iterationView.showNotification(
          `${criticalUpdates.length} critical step(s) updated`,
          "warning",
        );
      }
    }
  }

  _applyUpdates(updates) {
    updates.forEach((update) => {
      switch (update.type) {
        case "status_change":
          this._updateStepStatus(update.stepId, update.newStatus);
          break;
        case "assignment_change":
          this._updateStepAssignment(update.stepId, update.newTeam);
          break;
        case "comment_added":
          this._highlightStepWithComment(update.stepId);
          break;
        default:
          console.log("RealTimeSync: Unknown update type:", update.type);
      }
    });

    // Update step counts
    this.iterationView.recalculateStepCounts();
  }

  _updateStepStatus(stepId, newStatus) {
    const stepRow = document.querySelector(`[data-step="${stepId}"]`);
    if (stepRow) {
      const statusCell = stepRow.querySelector(".col-status");
      if (statusCell) {
        statusCell.innerHTML = this.iterationView.getStatusDisplay(newStatus);

        // 🔧 FIX: Clear any existing timeout for this specific step to prevent conflicts
        if (!this.iterationView.stepTimeouts) {
          this.iterationView.stepTimeouts = new Map(); // Initialize step-specific timeout tracking
        }

        // Clear existing timeout for this step if it exists
        const existingTimeoutId = this.iterationView.stepTimeouts.get(stepId);
        if (existingTimeoutId) {
          clearTimeout(existingTimeoutId);
          this.iterationView.activeTimeouts.delete(existingTimeoutId);
          this.iterationView.stepTimeouts.delete(stepId);
        }

        // Add visual indicator for recent change
        stepRow.classList.add("recently-updated");

        // Create new timeout for this specific step
        const timeoutId = setTimeout(() => {
          this.iterationView.activeTimeouts.delete(timeoutId);
          this.iterationView.stepTimeouts.delete(stepId);
          stepRow.classList.remove("recently-updated");
        }, 5000);

        // Track timeout for cleanup (both global and step-specific)
        this.iterationView.activeTimeouts.add(timeoutId);
        this.iterationView.stepTimeouts.set(stepId, timeoutId);
      }
    }
  }

  _updateStepAssignment(stepId, newTeam) {
    const stepRow = document.querySelector(`[data-step="${stepId}"]`);
    if (stepRow) {
      const teamCell = stepRow.querySelector(".col-team");
      if (teamCell) {
        teamCell.textContent = newTeam;

        // 🔧 FIX: Clear any existing timeout for this specific step to prevent conflicts
        if (!this.iterationView.stepTimeouts) {
          this.iterationView.stepTimeouts = new Map(); // Initialize step-specific timeout tracking
        }

        // Clear existing timeout for this step if it exists
        const existingTimeoutId = this.iterationView.stepTimeouts.get(stepId);
        if (existingTimeoutId) {
          clearTimeout(existingTimeoutId);
          this.iterationView.activeTimeouts.delete(existingTimeoutId);
          this.iterationView.stepTimeouts.delete(stepId);
        }

        // Add visual indicator
        stepRow.classList.add("recently-updated");

        // Create new timeout for this specific step
        const timeoutId = setTimeout(() => {
          this.iterationView.activeTimeouts.delete(timeoutId);
          this.iterationView.stepTimeouts.delete(stepId);
          stepRow.classList.remove("recently-updated");
        }, 5000);

        // Track timeout for cleanup (both global and step-specific)
        this.iterationView.activeTimeouts.add(timeoutId);
        this.iterationView.stepTimeouts.set(stepId, timeoutId);
      }
    }
  }

  _highlightStepWithComment(stepId) {
    const stepRow = document.querySelector(`[data-step="${stepId}"]`);
    if (stepRow) {
      stepRow.classList.add("has-new-comment");
    }
  }
}

// Legacy function maintained for backward compatibility
const populateFilter = (selector, url, defaultOptionText) => {
  console.warn(
    "populateFilter: Using legacy function. Consider upgrading to StepsAPIv2Client",
  );

  const select = document.querySelector(selector);
  if (!select) {
    console.error(`populateFilter: Selector "${selector}" not found in DOM`);
    return;
  }

  console.log(`populateFilter: Loading ${url} for ${selector}`);
  select.innerHTML = `<option value="">Loading...</option>`;

  fetch(url)
    .then((response) => {
      console.log(
        `populateFilter: Response for ${url}: ${response.status} ${response.statusText}`,
      );
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} for ${url}`,
        );
      }
      return response.json();
    })
    .then((items) => {
      console.log(
        `populateFilter: Received ${Array.isArray(items) ? items.length : "non-array"} items for ${selector}`,
        items,
      );
      select.innerHTML = `<option value="">${defaultOptionText}</option>`;

      if (Array.isArray(items)) {
        items.forEach((item) => {
          const option = document.createElement("option");
          option.value = item.id;
          option.textContent = item.name || "(Unnamed)";
          select.appendChild(option);
        });
        console.log(
          `populateFilter: Successfully populated ${items.length} options for ${selector}`,
        );
      } else {
        console.warn(
          `populateFilter: Items is not an array for ${selector}:`,
          items,
        );
      }
    })
    .catch((error) => {
      console.error(
        `populateFilter: Error loading ${url} for ${selector}:`,
        error,
      );
      select.innerHTML = `<option value="">Failed to load: ${error.message}</option>`;
    });
};

// Specialized function for populating iterations with code-based values
const populateIterations = (selector, url, defaultOptionText) => {
  console.log(`populateIterations: Loading ${url} for ${selector}`);

  const select = document.querySelector(selector);
  if (!select) {
    console.error(
      `populateIterations: Selector "${selector}" not found in DOM`,
    );
    return;
  }

  select.innerHTML = `<option value="">Loading...</option>`;

  fetch(url)
    .then((response) => {
      console.log(
        `populateIterations: Response for ${url}: ${response.status} ${response.statusText}`,
      );
      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${response.statusText} for ${url}`,
        );
      }
      return response.json();
    })
    .then((items) => {
      console.log(
        `populateIterations: Received ${Array.isArray(items) ? items.length : "non-array"} items for ${selector}`,
        items,
      );
      select.innerHTML = `<option value="">${defaultOptionText}</option>`;

      if (Array.isArray(items)) {
        items.forEach((item) => {
          const option = document.createElement("option");
          // CRITICAL: Always use UUID (item.id) for API calls, store name and code as data attributes
          option.value = item.id; // Must be UUID for API validation
          option.textContent = item.name || "(Unnamed)";
          // Store the iteration name and code as data attributes for URL construction
          option.dataset.iteName = item.name || "";
          option.dataset.iteCode = item.code || "";
          select.appendChild(option);
        });
        console.log(
          `populateIterations: Successfully populated ${items.length} options for ${selector}`,
        );
      } else {
        console.warn(
          `populateIterations: Items is not an array for ${selector}:`,
          items,
        );
      }
    })
    .catch((error) => {
      console.error(
        `populateIterations: Error loading ${url} for ${selector}:`,
        error,
      );
      select.innerHTML = `<option value="">Failed to load: ${error.message}</option>`;
    });
};

// UMIG Iteration View - Canonical JavaScript Logic
// Ported from mock/script.js with full fidelity

class IterationView {
  constructor() {
    this.selectedStep = null;
    this.selectedStepCode = null;
    this.filters = {
      migration: "",
      iteration: "",
      plan: "",
      sequence: "",
      phase: "",
      team: "",
      label: "",
      myTeamsOnly: false,
    };

    this.userRole = null;
    this.isAdmin = false;
    this.userContext = null;
    this.activeTimeouts = new Set(); // Track active timeouts for cleanup
    this.config = window.UMIG_ITERATION_CONFIG || {
      api: { baseUrl: "/rest/scriptrunner/latest/custom" },
    };

    // Initialize enhanced API client and real-time sync
    this.apiClient = new StepsAPIv2Client();
    this.realTimeSync = new RealTimeSync(this.apiClient, this);

    // Performance tracking
    this.performanceMetrics = {
      loadStartTime: null,
      loadEndTime: null,
      cacheHits: 0,
      cacheMisses: 0,
      apiRequests: 0,
    };

    // Advanced filtering state
    this.filterPresets = new Map();
    this.quickFilters = {
      myTeamSteps: false,
      myAssignedSteps: false,
      criticalSteps: false,
      blockedSteps: false,
    };

    // Don't start async initialization in constructor
    // This will be called after the object is assigned to window.iterationView
    this.initialized = false;
    this.initUserContext();
  }

  async initUserContext() {
    try {
      // Get user context from configuration
      if (
        !this.config ||
        !this.config.confluence ||
        !this.config.confluence.username
      ) {
        console.warn("No user context available");
        return;
      }

      // User context endpoint not yet implemented - using username-based detection
      // TODO: Implement /user/context endpoint in future sprint
      const username = this.config.confluence.username;

      // Direct admin detection based on username
      if (username === "admin" || username === "guq") {
        console.log("Admin user detected (username-based detection)");
        this.userRole = "ADMIN";
        this.isAdmin = true;
        this.applyRoleBasedControls();
      } else {
        // For non-admin users, check if we need user context from backend
        // Currently using default NORMAL role
        this.userRole = "NORMAL";
        this.isAdmin = false;
        console.log("Standard user detected:", username);

        // Apply role-based UI controls once DOM is ready
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () =>
            this.applyRoleBasedControls(),
          );
        } else {
          this.applyRoleBasedControls();
        }
      }

      // ORIGINAL CODE COMMENTED OUT - endpoint doesn't exist yet
      /*
      const response = await fetch(
        `${this.config.api.baseUrl}/user/context?username=${encodeURIComponent(this.config.confluence.username)}`,
      );
      if (response.ok) {
        this.userContext = await response.json();
        this.userRole = this.userContext.role || "NORMAL";
        this.isAdmin = this.userContext.isAdmin || false;
        console.log("User context loaded:", this.userContext);

        // Apply role-based UI controls once DOM is ready
        if (document.readyState === "loading") {
          document.addEventListener("DOMContentLoaded", () =>
            this.applyRoleBasedControls(),
          );
        } else {
          this.applyRoleBasedControls();
        }
      */
    } catch (error) {
      console.error("Error in user context initialization:", error);
      // Fallback to NORMAL role
      this.userRole = "NORMAL";
      this.isAdmin = false;
    }
  }

  applyRoleBasedControls() {
    // Role-based UI control logic
    const role = this.userRole;
    const isAdmin = this.isAdmin;

    console.log(
      `Applying role-based controls for role: ${role}, isAdmin: ${isAdmin}`,
    );

    // Control visibility and interaction based on role
    if (role === "NORMAL") {
      // NORMAL users have read-only access
      this.hideElementsWithClass("admin-only");
      this.disableElementsWithClass("pilot-only");

      // Add read-only indicators
      this.addReadOnlyIndicators();
    } else if (role === "PILOT") {
      // PILOT users have operational access
      this.hideElementsWithClass("admin-only");
      this.showAndEnableElementsWithClass("pilot-only");
    } else if (role === "ADMIN" || isAdmin) {
      // ADMIN users have full access
      this.showAndEnableElementsWithClass("admin-only");
      this.showAndEnableElementsWithClass("pilot-only");
    }
  }

  hideElementsWithClass(className) {
    const elements = document.querySelectorAll(`.${className}`);
    elements.forEach((element) => {
      element.style.display = "none";
    });
  }

  showElementsWithClass(className) {
    const elements = document.querySelectorAll(`.${className}`);
    elements.forEach((element) => {
      element.style.display = "";
    });
  }

  disableElementsWithClass(className) {
    const elements = document.querySelectorAll(`.${className}`);
    elements.forEach((element) => {
      // Disable input elements
      if (
        element.tagName === "INPUT" ||
        element.tagName === "BUTTON" ||
        element.tagName === "SELECT" ||
        element.tagName === "TEXTAREA"
      ) {
        element.disabled = true;
        element.title = "This action requires PILOT or ADMIN role";
      }
      // Add visual indicator for disabled state
      element.classList.add("role-disabled");
    });
  }

  showAndEnableElementsWithClass(className) {
    const elements = document.querySelectorAll(`.${className}`);
    elements.forEach((element) => {
      element.style.display = "";
      // Enable input elements
      if (
        element.tagName === "INPUT" ||
        element.tagName === "BUTTON" ||
        element.tagName === "SELECT" ||
        element.tagName === "TEXTAREA"
      ) {
        element.disabled = false;
        element.title = "";
      }
      // Remove disabled indicator
      element.classList.remove("role-disabled");
    });
  }

  addReadOnlyIndicators() {
    // Add a read-only banner for NORMAL users
    const stepDetailsPanel = document.querySelector(".step-details-panel");
    if (
      stepDetailsPanel &&
      !stepDetailsPanel.querySelector(".read-only-banner")
    ) {
      const banner = document.createElement("div");
      banner.className = "read-only-banner";
      banner.innerHTML = `
                <div class="banner-content">
                    <span class="banner-icon">👁️</span>
                    <span class="banner-text">Read-Only Mode - Contact admin for edit access</span>
                </div>
            `;
      stepDetailsPanel.insertBefore(banner, stepDetailsPanel.firstChild);
    }
  }

  async init() {
    await this.initializeSelectors();
    this.bindEvents();

    // Load status colors asynchronously with retry logic to handle authentication timing
    this.loadStatusColorsWithRetry();

    this.loadSteps();
    this.updateFilters();
  }

  async initializeSelectors() {
    // Initialize migration selector
    await this.loadMigrations();

    // Initialize all other selectors with default states
    this.resetSelector("#iteration-select", "SELECT AN ITERATION");
    this.resetSelector("#plan-filter", "All Plans");
    this.resetSelector("#sequence-filter", "All Sequences");
    this.resetSelector("#phase-filter", "All Phases");
    this.resetSelector("#team-filter", "All Teams");
    this.resetSelector("#label-filter", "All Labels");
  }

  resetSelector(selector, defaultText) {
    const select = document.querySelector(selector);
    if (select) {
      select.innerHTML = `<option value="">${defaultText}</option>`;
    }
  }

  bindEvents() {
    // Migration and Iteration selectors
    const migrationSelect = document.getElementById("migration-select");
    const iterationSelect = document.getElementById("iteration-select");

    if (migrationSelect) {
      migrationSelect.addEventListener("change", (e) => {
        this.filters.migration = e.target.value;
        this.onMigrationChange();
      });
    }

    if (iterationSelect) {
      iterationSelect.addEventListener("change", (e) => {
        this.filters.iteration = e.target.value;
        this.onIterationChange();
      });
    }

    // Filter controls
    const planFilter = document.getElementById("plan-filter");
    const sequenceFilter = document.getElementById("sequence-filter");
    const phaseFilter = document.getElementById("phase-filter");
    const teamFilter = document.getElementById("team-filter");
    const labelFilter = document.getElementById("label-filter");
    const myTeamsOnly = document.getElementById("my-teams-only");

    if (planFilter) {
      planFilter.addEventListener("change", (e) => {
        this.filters.plan = e.target.value;
        this.onPlanChange();
      });
    }

    if (sequenceFilter) {
      sequenceFilter.addEventListener("change", (e) => {
        this.filters.sequence = e.target.value;
        this.onSequenceChange();
      });
    }

    if (phaseFilter) {
      phaseFilter.addEventListener("change", (e) => {
        this.filters.phase = e.target.value;
        this.onPhaseChange();
      });
    }

    if (teamFilter) {
      teamFilter.addEventListener("change", (e) => {
        this.filters.team = e.target.value;
        this.applyFilters();
      });
    }

    if (labelFilter) {
      labelFilter.addEventListener("change", (e) => {
        this.filters.label = e.target.value;
        this.applyFilters();
      });
    }

    if (myTeamsOnly) {
      myTeamsOnly.addEventListener("change", (e) => {
        this.filters.myTeamsOnly = e.target.checked;
        this.applyFilters();
      });
    }

    // Step action buttons
    this.bindStepActions();
  }

  bindStepActions() {
    const startBtn = document.getElementById("start-step");
    const completeBtn = document.getElementById("complete-step");
    const blockBtn = document.getElementById("block-step");
    const commentBtn = document.getElementById("add-comment");

    if (startBtn) {
      startBtn.addEventListener("click", () => this.startStep());
    }

    if (completeBtn) {
      completeBtn.addEventListener("click", () => this.completeStep());
    }

    if (blockBtn) {
      blockBtn.addEventListener("click", () => this.blockStep());
    }

    if (commentBtn) {
      commentBtn.addEventListener("click", () => this.addComment());
    }
  }
  async loadMigrations() {
    const select = document.getElementById("migration-select");
    select.innerHTML = "<option>Loading migrations...</option>";
    try {
      const response = await fetch(
        "/rest/scriptrunner/latest/custom/migrations",
      );
      if (!response.ok) throw new Error("Failed to fetch");
      const responseData = await response.json();

      // Handle API response format with data property
      const migrations = responseData.data || responseData;

      if (!Array.isArray(migrations) || migrations.length === 0) {
        select.innerHTML = "<option>No migrations found</option>";
      } else {
        select.innerHTML =
          '<option value="">SELECT A MIGRATION</option>' +
          migrations
            .map(
              (m) =>
                `<option value="${m.mig_id || m.id}" data-mig-name="${m.mig_name || m.name}">${m.mig_name || m.name}</option>`,
            )
            .join("");
      }
    } catch (e) {
      console.error("Error loading migrations:", e);
      select.innerHTML = "<option>Error loading migrations</option>";
    }
  }

  onMigrationChange() {
    const migId = this.filters.migration;
    console.log("onMigrationChange: Selected migration ID:", migId);

    // Reset ALL dependent filters (everything below migration in hierarchy)
    this.filters.iteration = "";
    this.filters.plan = "";
    this.filters.sequence = "";
    this.filters.phase = "";
    this.filters.team = "";
    this.filters.label = "";

    // Reset all dependent selectors to default state
    this.resetSelector("#iteration-select", "SELECT AN ITERATION");
    this.resetSelector("#plan-filter", "All Plans");
    this.resetSelector("#sequence-filter", "All Sequences");
    this.resetSelector("#phase-filter", "All Phases");
    this.resetSelector("#team-filter", "All Teams");
    this.resetSelector("#label-filter", "All Labels");

    if (migId) {
      console.log(
        "onMigrationChange: Loading iterations for migration:",
        migId,
      );
      const url = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations`;
      populateIterations("#iteration-select", url, "SELECT AN ITERATION");
    }

    // Show blank runsheet state since no iteration is selected
    this.showBlankRunsheetState();
  }

  onIterationChange() {
    const migId = this.filters.migration;
    const iteId = this.filters.iteration;
    console.log("onIterationChange: Selected iteration ID:", iteId);

    // Reset dependent filters (everything below iteration in hierarchy)
    this.filters.plan = "";
    this.filters.sequence = "";
    this.filters.phase = "";
    this.filters.team = "";
    this.filters.label = "";

    // Reset dependent selectors to default state
    this.resetSelector("#plan-filter", "All Plans");
    this.resetSelector("#sequence-filter", "All Sequences");
    this.resetSelector("#phase-filter", "All Phases");
    this.resetSelector("#team-filter", "All Teams");
    this.resetSelector("#label-filter", "All Labels");

    if (!iteId) {
      this.showBlankRunsheetState();
      return;
    }

    // Populate filters for this iteration
    const planUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/plan-instances`;
    const sequenceUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/sequences`;
    const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/phases`;
    const teamsUrl = `/rest/scriptrunner/latest/custom/teams?iterationId=${iteId}`;
    const labelsUrl = `/rest/scriptrunner/latest/custom/labels?iterationId=${iteId}`;

    populateFilter("#plan-filter", planUrl, "All Plans");
    populateFilter("#sequence-filter", sequenceUrl, "All Sequences");
    populateFilter("#phase-filter", phaseUrl, "All Phases");
    populateFilter("#team-filter", teamsUrl, "All Teams");
    populateFilter("#label-filter", labelsUrl, "All Labels");

    this.showNotification("Loading data for selected iteration...", "info");
    // Load steps and auto-select first step
    this.loadStepsAndSelectFirst();
  }

  onPlanChange() {
    const { migration: migId, iteration: iteId, plan: planId } = this.filters;
    console.log("onPlanChange: Selected plan ID:", planId);

    // Reset dependent filters (everything below plan in hierarchy)
    this.filters.sequence = "";
    this.filters.phase = "";
    this.filters.team = "";
    this.filters.label = "";

    // Reset dependent selectors to default state
    this.resetSelector("#sequence-filter", "All Sequences");
    this.resetSelector("#phase-filter", "All Phases");
    this.resetSelector("#team-filter", "All Teams");
    this.resetSelector("#label-filter", "All Labels");

    if (!migId || !iteId) {
      this.showBlankRunsheetState();
      return;
    }

    if (!planId) {
      // 'All Plans' selected - show all sequences and phases for iteration
      const sequenceUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/sequences`;
      const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/phases`;
      const teamsUrl = `/rest/scriptrunner/latest/custom/teams?iterationId=${iteId}`;
      const labelsUrl = `/rest/scriptrunner/latest/custom/labels?iterationId=${iteId}`;
      populateFilter("#sequence-filter", sequenceUrl, "All Sequences");
      populateFilter("#phase-filter", phaseUrl, "All Phases");
      populateFilter("#team-filter", teamsUrl, "All Teams");
      populateFilter("#label-filter", labelsUrl, "All Labels");
    } else {
      // Specific plan selected - use nested URL pattern (migrationApi supports this)
      const sequenceUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/plan-instances/${planId}/sequences`;
      const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/plan-instances/${planId}/phases`;
      const teamsUrl = `/rest/scriptrunner/latest/custom/teams?planId=${planId}`;
      const labelsUrl = `/rest/scriptrunner/latest/custom/labels?planId=${planId}`;
      populateFilter("#sequence-filter", sequenceUrl, "All Sequences");
      populateFilter("#phase-filter", phaseUrl, "All Phases");
      populateFilter("#team-filter", teamsUrl, "All Teams");
      populateFilter("#label-filter", labelsUrl, "All Labels");
    }

    // Apply filters to reload steps
    this.applyFilters();
  }

  onSequenceChange() {
    const {
      migration: migId,
      iteration: iteId,
      plan: planId,
      sequence: seqId,
    } = this.filters;
    console.log("onSequenceChange: Selected sequence ID:", seqId);

    // Reset dependent filters (everything below sequence in hierarchy)
    this.filters.phase = "";
    this.filters.team = "";
    this.filters.label = "";

    // Reset dependent selectors to default state
    this.resetSelector("#phase-filter", "All Phases");
    this.resetSelector("#team-filter", "All Teams");
    this.resetSelector("#label-filter", "All Labels");

    if (!migId || !iteId) {
      this.showBlankRunsheetState();
      return;
    }

    if (!seqId) {
      // 'All Sequences' selected - show all phases for current plan or iteration
      if (planId) {
        const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/plan-instances/${planId}/phases`;
        const teamsUrl = `/rest/scriptrunner/latest/custom/teams?planId=${planId}`;
        const labelsUrl = `/rest/scriptrunner/latest/custom/labels?planId=${planId}`;
        populateFilter("#phase-filter", phaseUrl, "All Phases");
        populateFilter("#team-filter", teamsUrl, "All Teams");
        populateFilter("#label-filter", labelsUrl, "All Labels");
      } else {
        const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/phases`;
        const teamsUrl = `/rest/scriptrunner/latest/custom/teams?iterationId=${iteId}`;
        const labelsUrl = `/rest/scriptrunner/latest/custom/labels?iterationId=${iteId}`;
        populateFilter("#phase-filter", phaseUrl, "All Phases");
        populateFilter("#team-filter", teamsUrl, "All Teams");
        populateFilter("#label-filter", labelsUrl, "All Labels");
      }
    } else {
      // Specific sequence selected - use nested URL pattern (migrationApi supports this)
      const phaseUrl = `/rest/scriptrunner/latest/custom/migrations/${migId}/iterations/${iteId}/sequences/${seqId}/phases`;
      const teamsUrl = `/rest/scriptrunner/latest/custom/teams?sequenceId=${seqId}`;
      const labelsUrl = `/rest/scriptrunner/latest/custom/labels?sequenceId=${seqId}`;
      populateFilter("#phase-filter", phaseUrl, "All Phases");
      populateFilter("#team-filter", teamsUrl, "All Teams");
      populateFilter("#label-filter", labelsUrl, "All Labels");
    }

    // Apply filters to reload steps
    this.applyFilters();
  }

  onPhaseChange() {
    const {
      migration: migId,
      iteration: iteId,
      plan: planId,
      sequence: seqId,
      phase: phaseId,
    } = this.filters;
    console.log("onPhaseChange: Selected phase ID:", phaseId);

    // Reset dependent filters (teams and labels - no hierarchy below phase)
    this.filters.team = "";
    this.filters.label = "";

    // Reset dependent selectors to default state
    this.resetSelector("#team-filter", "All Teams");
    this.resetSelector("#label-filter", "All Labels");

    if (!migId || !iteId) {
      this.showBlankRunsheetState();
      return;
    }

    if (!phaseId) {
      // 'All Phases' selected - refresh teams and labels for current sequence or higher level
      if (seqId) {
        const teamsUrl = `/rest/scriptrunner/latest/custom/teams?sequenceId=${seqId}`;
        const labelsUrl = `/rest/scriptrunner/latest/custom/labels?sequenceId=${seqId}`;
        populateFilter("#team-filter", teamsUrl, "All Teams");
        populateFilter("#label-filter", labelsUrl, "All Labels");
      } else if (planId) {
        const teamsUrl = `/rest/scriptrunner/latest/custom/teams?planId=${planId}`;
        const labelsUrl = `/rest/scriptrunner/latest/custom/labels?planId=${planId}`;
        populateFilter("#team-filter", teamsUrl, "All Teams");
        populateFilter("#label-filter", labelsUrl, "All Labels");
      } else {
        const teamsUrl = `/rest/scriptrunner/latest/custom/teams?iterationId=${iteId}`;
        const labelsUrl = `/rest/scriptrunner/latest/custom/labels?iterationId=${iteId}`;
        populateFilter("#team-filter", teamsUrl, "All Teams");
        populateFilter("#label-filter", labelsUrl, "All Labels");
      }
    } else {
      // Specific phase selected - show only teams and labels for this phase
      const teamsUrl = `/rest/scriptrunner/latest/custom/teams?phaseId=${phaseId}`;
      const labelsUrl = `/rest/scriptrunner/latest/custom/labels?phaseId=${phaseId}`;
      populateFilter("#team-filter", teamsUrl, "All Teams");
      populateFilter("#label-filter", labelsUrl, "All Labels");
    }

    // Apply filters to reload steps
    this.applyFilters();
  }

  selectStep(stepId, stepCode) {
    // Update selected step
    document.querySelectorAll(".step-row").forEach((row) => {
      row.classList.remove("selected");
    });

    const selectedRow = document.querySelector(`[data-step="${stepId}"]`);
    if (selectedRow) {
      selectedRow.classList.add("selected");
    }

    this.selectedStep = stepId;
    this.selectedStepCode = stepCode;
    // Pass the step instance UUID (stepId) to the API, not the step code
    this.loadStepDetails(stepId);
  }

  async loadStepDetails(stepCode) {
    if (!stepCode) return;

    const stepDetailsContent = document.querySelector(".step-details-content");
    if (!stepDetailsContent) return;

    // Show loading state
    stepDetailsContent.innerHTML =
      '<div class="loading-message"><p>🔄 Loading step details...</p></div>';

    try {
      // Use the new instance endpoint instead of the master data endpoint
      const response = await fetch(
        `/rest/scriptrunner/latest/custom/steps/instance/${encodeURIComponent(stepCode)}`,
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const stepData = await response.json();

      if (stepData.error) {
        throw new Error(stepData.error);
      }

      this.renderStepDetails(stepData);
    } catch (error) {
      // Use setTimeout to avoid conflicts with Confluence's MutationObserver
      const timeoutId = setTimeout(() => {
        this.activeTimeouts.delete(timeoutId);
        try {
          stepDetailsContent.innerHTML = `
                        <div class="error-message">
                            <p>❌ Error loading step details: ${error.message}</p>
                            <p>Please try again or contact support.</p>
                        </div>
                    `;
        } catch (domError) {
          console.warn("Failed to render step details error:", domError);
        }
      }, 10);
      this.activeTimeouts.add(timeoutId);
    }
  }

  /**
   * Fetch status options from the API
   */
  async fetchStepStatuses() {
    try {
      const response = await fetch(
        "/rest/scriptrunner/latest/custom/status?entityType=Step",
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch statuses: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("Error fetching step statuses:", error);
      return [];
    }
  }

  /**
   * Fetch status options with retry logic for authentication timing issues
   */
  async fetchStepStatusesWithRetry(maxRetries = 2, delayMs = 500) {
    let retryCount = 0;

    while (retryCount <= maxRetries) {
      try {
        // TD-003 Phase 2H: Use StatusProvider with fallback to direct API call
        let statuses;
        if (window.StatusProvider) {
          console.debug(
            "fetchStepStatusesWithRetry: Using StatusProvider for status data",
          );
          statuses = await window.StatusProvider.getStatuses("Step");
        } else {
          console.debug(
            "fetchStepStatusesWithRetry: StatusProvider not available, using direct API call",
          );
          const response = await fetch(
            "/rest/scriptrunner/latest/custom/status?entityType=Step",
          );
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          const data = await response.json();

          // Handle the API response structure correctly
          if (data && data.statuses && Array.isArray(data.statuses)) {
            // New API format: { statuses: [...], entityType: "Step", count: N }
            statuses = data.statuses;
          } else if (Array.isArray(data)) {
            // Legacy format: direct array
            statuses = data;
          } else {
            throw new Error("Invalid API response format");
          }
        }

        if (statuses && statuses.length > 0) {
          const source = window.StatusProvider
            ? "StatusProvider"
            : "direct API";
          console.log(
            `fetchStepStatusesWithRetry: Successfully loaded ${statuses.length} statuses via ${source} on attempt ${retryCount + 1}`,
          );
          return statuses;
        } else {
          throw new Error("Empty or invalid statuses response");
        }
      } catch (error) {
        console.warn(
          `fetchStepStatusesWithRetry: Attempt ${retryCount + 1}/${maxRetries + 1} failed:`,
          error.message,
        );

        if (retryCount < maxRetries) {
          retryCount++;
          console.log(
            `fetchStepStatusesWithRetry: Retrying in ${delayMs}ms...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          console.error(
            "fetchStepStatusesWithRetry: All attempts failed, returning empty array",
          );
          return [];
        }
      }
    }
  }

  /**
   * Load status colors from the API and store them for dynamic styling
   */
  async loadStatusColors() {
    try {
      this.statusColors = new Map();
      const statuses = await this.fetchStepStatuses();

      statuses.forEach((status) => {
        this.statusColors.set(status.name.toUpperCase(), status.color);
      });

      console.log(
        "loadStatusColors: Loaded",
        this.statusColors.size,
        "status colors",
      );

      // Apply the colors to CSS custom properties
      this.applyStatusColors();

      // Apply the colors to step count badges
      this.applyCounterColors();
    } catch (error) {
      console.error("Error loading status colors:", error);
      // Initialize with empty map so other methods don't fail
      this.statusColors = new Map();
    }
  }

  /**
   * Load status colors with retry logic to handle authentication timing issues
   */
  async loadStatusColorsWithRetry() {
    // Start the async operation - don't block initialization
    const loadAsync = async () => {
      try {
        this.statusColors = new Map();
        const statuses = await this.fetchStepStatusesWithRetry();

        // If we successfully got statuses, process them
        if (statuses && statuses.length > 0) {
          statuses.forEach((status) => {
            this.statusColors.set(status.name.toUpperCase(), status.color);
          });

          console.log(
            "loadStatusColorsWithRetry: Successfully loaded",
            this.statusColors.size,
            "status colors",
          );

          // Apply the colors to CSS custom properties
          this.applyStatusColors();

          // Apply the colors to step count badges
          this.applyCounterColors();

          return true; // Success
        } else {
          console.warn(
            "loadStatusColorsWithRetry: No statuses returned, initializing with empty colors",
          );
          this.statusColors = new Map();
          return false;
        }
      } catch (error) {
        console.error(
          "loadStatusColorsWithRetry: Failed to load status colors:",
          error,
        );
        // Initialize with empty map so other methods don't fail
        this.statusColors = new Map();
        return false;
      }
    };

    // Start the process asynchronously
    loadAsync().catch((error) => {
      console.error("loadStatusColorsWithRetry: Async loading failed:", error);
    });
  }

  /**
   * Apply status colors to CSS custom properties
   */
  applyStatusColors() {
    if (!this.statusColors) return;

    const root = document.documentElement;

    // Apply colors to CSS custom properties
    this.statusColors.forEach((color, status) => {
      const cssVar = `--status-${status.toLowerCase().replace("_", "-")}-color`;
      root.style.setProperty(cssVar, color);
    });
  }

  /**
   * Populate status dropdown with options and set current status
   */
  async populateStatusDropdown(currentStatus) {
    const dropdown = document.getElementById("step-status-dropdown");
    if (!dropdown) return;

    // Debug log to check what status is being passed
    console.log(
      "PopulateStatusDropdown - Current Status (raw):",
      currentStatus,
      "Type:",
      typeof currentStatus,
    );

    // Fetch available statuses first to get the mapping (use retry method for robustness)
    const statuses = await this.fetchStepStatusesWithRetry();

    // Handle status ID to name conversion
    let currentStatusName = null;

    if (currentStatus !== null && currentStatus !== undefined) {
      if (typeof currentStatus === "number") {
        // Current status is an ID, need to convert to name
        // Find the status object that matches this ID
        const statusObj = statuses.find(
          (status) => status.id === currentStatus,
        );
        if (statusObj) {
          currentStatusName = statusObj.name;
          console.log(
            `PopulateStatusDropdown - Converted status ID ${currentStatus} to name: ${currentStatusName}`,
          );
        } else {
          console.warn(
            `PopulateStatusDropdown - Could not find status name for ID: ${currentStatus}. Available statuses:`,
            statuses.map((s) => `${s.id}:${s.name}`).join(", "),
          );
          // Fallback: use the ID as display name if name lookup fails
          currentStatusName = `Status ${currentStatus}`;
        }
      } else if (typeof currentStatus === "string") {
        // Current status is already a name
        currentStatusName = currentStatus;
        console.log(
          `PopulateStatusDropdown - Using status name directly: ${currentStatusName}`,
        );
      } else {
        console.warn(
          "PopulateStatusDropdown - Unexpected status type:",
          typeof currentStatus,
          currentStatus,
        );
      }
    }

    // Fallback to default status if we still don't have a valid status name (TD-003 Phase 2H)
    if (!currentStatusName) {
      currentStatusName = await this.getDefaultStatusName();
      console.log(
        `PopulateStatusDropdown - Falling back to default status: ${currentStatusName}`,
      );
    }

    // Store the current status as attributes (both name and ID for compatibility)
    dropdown.setAttribute("data-old-status", currentStatusName);

    // Find and store the current status ID
    let currentStatusIdForStorage = null;
    if (typeof currentStatus === "number") {
      currentStatusIdForStorage = currentStatus;
    } else if (currentStatusName) {
      const matchingStatus = statuses.find(
        (s) =>
          (s.name || "").trim().toUpperCase() ===
          (currentStatusName || "").trim().toUpperCase(),
      );
      if (matchingStatus) {
        currentStatusIdForStorage = matchingStatus.id;
      }
    }

    if (currentStatusIdForStorage !== null) {
      dropdown.setAttribute("data-old-status-id", currentStatusIdForStorage);
    }

    // Clear existing options
    dropdown.innerHTML = "";

    let optionSelected = false;

    // Add status options using status IDs as values
    statuses.forEach((status) => {
      const option = document.createElement("option");
      option.value = status.id; // REFACTORED: Use status ID as value instead of name
      option.textContent = status.name.replace(/_/g, " ");
      option.setAttribute("data-color", status.color);
      option.setAttribute("data-status-name", status.name); // Store name for backward compatibility

      // Convert current status to ID for comparison if needed
      let currentStatusId = null;
      if (typeof currentStatus === "number") {
        currentStatusId = currentStatus;
      } else if (typeof currentStatus === "string" || currentStatusName) {
        // Find status ID by name for backward compatibility
        const matchingStatus = statuses.find(
          (s) =>
            (s.name || "").trim().toUpperCase() ===
            (currentStatusName || "").trim().toUpperCase(),
        );
        if (matchingStatus) {
          currentStatusId = matchingStatus.id;
        }
      }

      if (currentStatusId !== null && status.id === currentStatusId) {
        option.selected = true;
        optionSelected = true;
        console.log(
          `PopulateStatusDropdown - Selected status: ${status.name} (ID: ${status.id})`,
        );
      }

      dropdown.appendChild(option);
    });

    // Log if no option was selected
    if (!optionSelected) {
      console.warn(
        `PopulateStatusDropdown - No matching status found for: ${currentStatusName}. Available statuses:`,
        statuses.map((s) => s.name),
      );
    }

    // Set dropdown background color based on selected status
    this.updateDropdownColor(dropdown);

    // Add change event listener (avoid duplicate listeners)
    dropdown.removeEventListener("change", this.handleStatusChange);
    dropdown.addEventListener("change", (e) => this.handleStatusChange(e));
  }

  /**
   * Update dropdown background color based on selected option
   */
  updateDropdownColor(dropdown) {
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    if (selectedOption) {
      const color = selectedOption.getAttribute("data-color");
      if (color) {
        dropdown.style.backgroundColor = color;
        // Set text color based on background brightness
        const rgb = this.hexToRgb(color);
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        dropdown.style.color = brightness > 128 ? "#000" : "#fff";
      }
    }
  }

  /**
   * Convert hex color to RGB
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  /**
   * Handle status change event with enhanced API v2 and optimistic updates
   */
  async handleStatusChange(event) {
    const dropdown = event.target;
    const newStatusId = dropdown.value; // REFACTORED: Now receives status ID
    const stepId = dropdown.getAttribute("data-step-id");
    const oldStatusId = dropdown.getAttribute("data-old-status-id") || null;

    // Convert status ID to status name for API compatibility
    const selectedOption = dropdown.options[dropdown.selectedIndex];
    const newStatus = selectedOption
      ? selectedOption.getAttribute("data-status-name")
      : null;
    const oldStatus =
      dropdown.getAttribute("data-old-status") ||
      (await this.getDefaultStatusName());

    if (!newStatus) {
      console.error(
        "HandleStatusChange - Could not determine status name from ID:",
        newStatusId,
      );
      return;
    }

    // Update dropdown color immediately (optimistic update)
    this.updateDropdownColor(dropdown);

    // Check role permissions
    if (this.userRole !== "PILOT" && this.userRole !== "ADMIN") {
      this.showNotification(
        "Only PILOT or ADMIN users can change status",
        "error",
      );
      // Reset to old status ID if available, otherwise find by name
      if (oldStatusId) {
        dropdown.value = oldStatusId;
      } else {
        // Find old status ID by name for backward compatibility
        const oldOption = Array.from(dropdown.options).find(
          (opt) => opt.getAttribute("data-status-name") === oldStatus,
        );
        if (oldOption) {
          dropdown.value = oldOption.value;
        }
      }
      this.updateDropdownColor(dropdown);
      return;
    }

    // Don't do anything if status hasn't actually changed (compare by ID for robustness)
    if (
      newStatusId === oldStatusId ||
      (oldStatusId === null && newStatus === oldStatus)
    ) {
      return;
    }

    // Optimistically update the UI immediately
    this.updateStepStatus(stepId, newStatus);

    try {
      // Use enhanced API client for status update with status ID
      const result = await this.apiClient.updateStepStatus(
        stepId,
        newStatusId, // REFACTORED: Pass status ID instead of status name
        this.userRole,
      );

      // Update the old status attributes for next change (store both ID and name)
      dropdown.setAttribute("data-old-status", newStatus);
      dropdown.setAttribute("data-old-status-id", newStatusId);

      // Show success notification with enhanced details
      const message = result.emailsSent
        ? `Status updated to ${newStatus}. ${result.emailsSent} notifications sent.`
        : `Status updated to ${newStatus}`;

      this.showNotification(message, "success");

      // 🆕 NEW: Synchronize runsheet pane with DOM re-rendering delay
      this.syncRunsheetStatusWithRetry(stepId, newStatus, newStatusId);

      // Log performance metrics
      if (result.responseTime) {
        console.log(`Status update completed in ${result.responseTime}ms`);
      }
    } catch (error) {
      console.error("Enhanced status update error:", error);

      // Revert optimistic update
      this.updateStepStatus(stepId, oldStatus);
      dropdown.value = oldStatus;
      this.updateDropdownColor(dropdown);

      // Show detailed error message
      const errorMessage = error.message.includes("network")
        ? "Network error. Please check your connection and try again."
        : `Failed to update status: ${error.message}`;

      this.showNotification(errorMessage, "error");

      // Offer retry option for network errors
      if (
        error.message.includes("network") ||
        error.message.includes("timeout")
      ) {
        this.showRetryOption("Retry status update?", () => {
          dropdown.value = newStatus;
          this.handleStatusChange(event);
        });
      }
    }
  }

  /**
   * Synchronize runsheet status with retry mechanism for DOM re-rendering
   * Waits for DOM elements to be recreated after IterationView reload
   *
   * @param {string} stepId - UUID of the step
   * @param {string} newStatus - New status text (e.g., 'COMPLETED', 'FAILED')
   * @param {string} newStatusId - New status ID for data attributes
   */
  syncRunsheetStatusWithRetry(stepId, newStatus, newStatusId) {
    console.log(
      `🔄 syncRunsheetStatusWithRetry called: stepId=${stepId}, newStatus=${newStatus}, newStatusId=${newStatusId}`,
    );

    const maxRetries = 10;
    const retryInterval = 200; // 200ms intervals
    let retryCount = 0;

    const attemptSync = () => {
      retryCount++;
      console.log(
        `🔄 Attempt ${retryCount}/${maxRetries}: Looking for DOM elements...`,
      );

      // Check if DOM elements exist
      const stepRow = document.querySelector(`[data-step="${stepId}"]`);
      const allSteps = document.querySelectorAll("[data-step]");

      console.log(
        `🔍 DOM state: stepRow=${stepRow ? "found" : "null"}, totalSteps=${allSteps.length}`,
      );

      if (stepRow) {
        // DOM elements exist, proceed with sync
        console.log(
          `✅ DOM elements found on attempt ${retryCount}, proceeding with sync`,
        );
        this.syncRunsheetStatus(stepId, newStatus, newStatusId);
      } else if (retryCount < maxRetries) {
        // DOM elements not ready yet, retry
        console.log(
          `⏳ DOM not ready, retrying in ${retryInterval}ms... (attempt ${retryCount}/${maxRetries})`,
        );
        setTimeout(attemptSync, retryInterval);
      } else {
        // Max retries reached
        console.warn(
          `⚠️ Failed to find DOM elements for step ${stepId} after ${maxRetries} attempts`,
        );
        console.warn(
          `🔍 Final DOM state: totalSteps=${allSteps.length}, available steps:`,
          Array.from(allSteps).map((s) => s.getAttribute("data-step")),
        );
      }
    };

    // Start the retry process
    attemptSync();
  }

  /**
   * Synchronize status update in runsheet pane
   * Updates the runsheet table to reflect status changes made in the main panel
   */
  syncRunsheetStatus(stepId, newStatus, newStatusId) {
    // Find the step row using the same selector pattern as working _updateStepStatus method
    const stepRow = document.querySelector(`[data-step="${stepId}"]`);

    if (stepRow) {
      const statusCell = stepRow.querySelector(".col-status");

      if (statusCell) {
        // Update status display with existing color coding
        const newStatusHTML = this.getStatusDisplay(newStatus);
        statusCell.innerHTML = newStatusHTML;
        statusCell.setAttribute("data-status-id", newStatusId);

        // Clear any existing timeout for this specific step to prevent conflicts
        if (!this.stepTimeouts) {
          this.stepTimeouts = new Map();
        }

        // Clear existing timeout for this step if it exists
        const existingTimeoutId = this.stepTimeouts.get(stepId);
        if (existingTimeoutId) {
          clearTimeout(existingTimeoutId);
          this.activeTimeouts.delete(existingTimeoutId);
          this.stepTimeouts.delete(stepId);
        }

        // Visual feedback for recent change
        stepRow.classList.add("recently-updated");

        // Create new timeout for this specific step
        const timeoutId = setTimeout(() => {
          this.activeTimeouts.delete(timeoutId);
          this.stepTimeouts.delete(stepId);
          stepRow.classList.remove("recently-updated");
        }, 3000);

        // Track timeout for cleanup (both global and step-specific)
        this.activeTimeouts.add(timeoutId);
        this.stepTimeouts.set(stepId, timeoutId);

        console.log(
          `✅ Runsheet synchronized: Step ${stepId} status updated to ${newStatus}`,
        );
      } else {
        console.warn(
          `⚠️ Runsheet sync: Status cell not found for step ${stepId}`,
        );
      }
    } else {
      console.warn(`⚠️ Runsheet sync: Row not found for step ${stepId}`);
    }
  }

  /**
   * Show retry option for failed operations
   */
  showRetryOption(message, retryCallback) {
    const retryNotification = document.createElement("div");
    retryNotification.className = "retry-notification";
    retryNotification.innerHTML = `
      <span>${message}</span>
      <button class="btn-retry">Retry</button>
      <button class="btn-cancel">Cancel</button>
    `;
    retryNotification.style.cssText = `
      position: fixed;
      top: 70px;
      right: 20px;
      padding: 12px 16px;
      background: #ffab00;
      color: white;
      border-radius: 4px;
      z-index: 1001;
      display: flex;
      gap: 10px;
      align-items: center;
    `;

    document.body.appendChild(retryNotification);

    // Bind events
    retryNotification
      .querySelector(".btn-retry")
      .addEventListener("click", () => {
        retryNotification.remove();
        retryCallback();
      });

    retryNotification
      .querySelector(".btn-cancel")
      .addEventListener("click", () => {
        retryNotification.remove();
      });

    // Auto-remove after 10 seconds
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      if (retryNotification.parentNode) {
        retryNotification.remove();
      }
    }, 10000);
    this.activeTimeouts.add(timeoutId);
  }

  /**
   * Attach event listeners to instruction checkboxes
   */
  attachInstructionListeners() {
    const checkboxes = document.querySelectorAll(".instruction-checkbox");
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("change", (e) =>
        this.handleInstructionToggle(e),
      );
    });
  }

  /**
   * Attach event listeners to action buttons
   */
  attachActionButtonListeners() {
    // Action buttons removed per user request
  }

  /**
   * Handle instruction checkbox toggle
   */
  async handleInstructionToggle(event) {
    const checkbox = event.target;
    const instructionId = checkbox.getAttribute("data-instruction-id");
    const stepId = checkbox.getAttribute("data-step-id");
    const isChecked = checkbox.checked;

    if (!instructionId) {
      console.error("No instruction ID found for checkbox");
      return;
    }

    // Disable checkbox during update
    checkbox.disabled = true;

    try {
      if (isChecked) {
        // Call API to mark instruction as complete
        await this.completeInstruction(stepId, instructionId);

        // Add completed styling to the row
        const row = checkbox.closest(".instruction-row");
        if (row) {
          row.classList.add("completed");
        }

        this.showNotification("Instruction marked as complete", "success");
      } else {
        // Call API to mark instruction as incomplete
        await this.uncompleteInstruction(stepId, instructionId);

        // Remove completed styling from the row
        const row = checkbox.closest(".instruction-row");
        if (row) {
          row.classList.remove("completed");
        }

        this.showNotification("Instruction marked as incomplete", "success");
      }
    } catch (error) {
      // Revert checkbox state on error
      checkbox.checked = !isChecked;
      this.showNotification("Failed to update instruction status", "error");
      console.error("Error updating instruction:", error);
    } finally {
      // Re-enable checkbox
      checkbox.disabled = false;
    }
  }

  /**
   * Complete an instruction via API
   */
  async completeInstruction(stepId, instructionId) {
    const response = await fetch(
      `${this.config.api.baseUrl}/steps/${stepId}/instructions/${instructionId}/complete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Atlassian-Token": "no-check", // Required for Confluence XSRF protection
        },
        credentials: "same-origin", // Include cookies for authentication
        body: JSON.stringify({
          userId: this.userContext?.userId || null,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to complete instruction");
    }

    const result = await response.json();

    // Log email notification info
    if (result.emailsSent) {
      console.log(`Email notifications sent: ${result.emailsSent}`);
    }

    return result;
  }

  /**
   * Mark an instruction as incomplete via API
   */
  async uncompleteInstruction(stepId, instructionId) {
    const response = await fetch(
      `${this.config.api.baseUrl}/steps/${stepId}/instructions/${instructionId}/incomplete`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Atlassian-Token": "no-check", // Required for Confluence XSRF protection
        },
        credentials: "same-origin", // Include cookies for authentication
        body: JSON.stringify({
          userId: this.userContext?.userId || null,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Failed to mark instruction as incomplete",
      );
    }

    const result = await response.json();

    // Log email notification info
    if (result.emailsSent) {
      console.log(`Email notifications sent: ${result.emailsSent}`);
    }

    return result;
  }

  renderStepDetails(stepData) {
    const stepDetailsContent = document.querySelector(".step-details-content");
    if (!stepDetailsContent) return;

    // Use setTimeout to avoid conflicts with Confluence's MutationObserver
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      try {
        this.doRenderStepDetails(stepData, stepDetailsContent);
      } catch (error) {
        console.warn("Failed to render step details:", error);
      }
    }, 10);
    this.activeTimeouts.add(timeoutId);
  }

  doRenderStepDetails(stepData, stepDetailsContent) {
    const summary = stepData.stepSummary || {};
    const instructions = stepData.instructions || [];
    const impactedTeams = stepData.impactedTeams || [];

    // Debug log to check if labels are being returned
    console.log("Step Summary:", summary);
    console.log("Labels:", summary.Labels);

    // Helper function to get status display - use the main getStatusDisplay method
    const getStatusDisplay = (status) => {
      return this.getStatusDisplay(status);
    };

    let html = `
            <div class="step-info" data-sti-id="${summary.ID || ""}">
                <div class="step-title">
                    <h3>📋 ${summary.StepCode || "Unknown"} - ${summary.Name || "Unknown Step"}</h3>
                    <!-- StepView Button - Positioned at top right -->
                    <button type="button" class="btn btn-secondary" id="open-stepview-btn">
                        🔗 StepView
                    </button>
                </div>
                
                <div class="step-breadcrumb">
                    <span class="breadcrumb-item">${summary.MigrationName || "Migration"}</span>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-item">${summary.PlanName || "Plan"}</span>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-item">${summary.IterationName || "Iteration"}</span>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-item">${summary.SequenceName || "Sequence"}</span>
                    <span class="breadcrumb-separator">›</span>
                    <span class="breadcrumb-item">${summary.PhaseName || "Phase"}</span>
                </div>
                
                <div class="step-key-info">
                    <div class="metadata-item">
                        <span class="label">📊 Status:</span>
                        <span class="value">
                            <select id="step-status-dropdown" class="status-dropdown pilot-only" data-step-id="${summary.ID || stepData.stepCode}" style="padding: 2px 8px; border-radius: 3px;">
                                <option value="">Loading...</option>
                            </select>
                        </span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">⬅️ Predecessor:</span>
                        <span class="value">${summary.PredecessorCode ? `${summary.PredecessorCode}${summary.PredecessorName ? ` - ${summary.PredecessorName}` : ""}` : "-"}</span>
                    </div>
                </div>
                
                <div class="step-metadata">
                    <div class="metadata-item">
                        <span class="label">🎯 Target Environment:</span>
                        <span class="value">${summary.TargetEnvironment || "Not specified"}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">🔄 Scope:</span>
                        <span class="value">
                            ${
                              summary.IterationTypes &&
                              summary.IterationTypes.length > 0
                                ? summary.IterationTypes.map(
                                    (type) =>
                                      `<span class="scope-tag">${type}</span>`,
                                  ).join(" ")
                                : '<span style="color: var(--color-text-tertiary); font-style: italic;">None specified</span>'
                            }
                        </span>
                    </div>
                    <div class="metadata-item teams-container">
                        <div class="team-section">
                            <span class="label">👤 Primary Team:</span>
                            <span class="value">${summary.AssignedTeam || "Not assigned"}</span>
                        </div>
                        <div class="team-section">
                            <span class="label">👥 Impacted Teams:</span>
                            <span class="value">${impactedTeams.length > 0 ? impactedTeams.join(", ") : "None"}</span>
                        </div>
                    </div>
                    <div class="metadata-item">
                        <span class="label">📂 Location:</span>
                        <span class="value">${summary.SequenceName ? `Sequence: ${summary.SequenceName}` : "Unknown sequence"}${summary.PhaseName ? ` | Phase: ${summary.PhaseName}` : ""}</span>
                    </div>
                    <div class="metadata-item">
                        <span class="label">⏱️ Duration:</span>
                        <span class="value">${summary.Duration ? `${summary.Duration} min.` : summary.EstimatedDuration ? `${summary.EstimatedDuration} min.` : "45 min."}</span>
                    </div>
                    ${
                      summary.Labels && summary.Labels.length > 0
                        ? `
                    <div class="metadata-item">
                        <span class="label">🏷️ Labels:</span>
                        <span class="value">
                            ${summary.Labels.map((label) => `<span class="label-tag" style="background-color: ${label.color}; color: ${this.getContrastColor(label.color)};">${label.name}</span>`).join(" ")}
                        </span>
                    </div>
                    `
                        : ""
                    }
                </div>
                
                <div class="step-description">
                    <h4>📝 Description:</h4>
                    <p>${summary.Description || "No description available"}</p>
                </div>
            </div>
        `;

    if (instructions.length > 0) {
      html += `
                <div class="instructions-section">
                    <h4>📋 INSTRUCTIONS</h4>
                    <div class="instructions-table">
                        <div class="instructions-header">
                            <div class="col-num">#</div>
                            <div class="col-instruction">Instruction</div>
                            <div class="col-team">Team</div>
                            <div class="col-control">Control</div>
                            <div class="col-duration">Duration</div>
                            <div class="col-complete">✓</div>
                        </div>
            `;

      instructions.forEach((instruction, index) => {
        html += `
                    <div class="instruction-row ${instruction.IsCompleted ? "completed" : ""}">
                        <div class="col-num">${instruction.Order || index + 1}</div>
                        <div class="col-instruction">${instruction.Description || instruction.Instruction || "No description"}</div>
                        <div class="col-team">${instruction.Team || summary.AssignedTeam || "TBD"}</div>
                        <div class="col-control">${instruction.Control || instruction.ControlCode || `CTRL-${String(index + 1).padStart(2, "0")}`}</div>
                        <div class="col-duration">${instruction.Duration ? `${instruction.Duration} min.` : instruction.EstimatedDuration ? `${instruction.EstimatedDuration} min.` : "5 min."}</div>
                        <div class="col-complete">
                            <input type="checkbox" 
                                class="instruction-checkbox pilot-only" 
                                data-instruction-id="${instruction.ID || instruction.ini_id || instruction.Order || index + 1}"
                                data-step-id="${summary.ID || stepData.stepCode || ""}"
                                data-instruction-index="${index}"
                                ${instruction.IsCompleted ? "checked" : ""}>
                        </div>
                    </div>
                `;
      });

      html += `
                    </div>
                </div>
            `;
    }

    // Store the step instance ID for comment operations
    if (summary.ID) {
      this.currentStepInstanceId = summary.ID;
    }

    // Add comment section with real data
    const comments = stepData.comments || [];
    html += `
            <div class="comments-section">
                <h4>💬 COMMENTS (${comments.length})</h4>
                <div class="comments-list" id="comments-list">
        `;

    if (comments.length === 0) {
      html +=
        '<p class="no-comments">No comments yet. Be the first to comment!</p>';
    } else {
      comments.forEach((comment) => {
        const timeAgo = this.formatTimeAgo(comment.createdAt);
        const teamName = comment.author.team ? ` (${comment.author.team})` : "";
        html += `
                    <div class="comment" data-comment-id="${comment.id}">
                        <div class="comment-header">
                            <span class="comment-author">${comment.author.name}${teamName}</span>
                            <span class="comment-time">${timeAgo}</span>
                            <div class="comment-actions">
                                <button class="btn-edit-comment pilot-only" data-comment-id="${comment.id}" title="Edit">✏️</button>
                                <button class="btn-delete-comment admin-only" data-comment-id="${comment.id}" title="Delete">🗑️</button>
                            </div>
                        </div>
                        <div class="comment-body" id="comment-body-${comment.id}">${this.escapeHtml(comment.body)}</div>
                    </div>
                `;
      });
    }

    html += `
                </div>
                
                <div class="comment-form pilot-only">
                    <textarea id="new-comment-text" placeholder="Add a comment..." rows="3"></textarea>
                    <button type="button" class="btn btn-primary" id="add-comment-btn">Add Comment</button>
                </div>
            </div>
        `;

    stepDetailsContent.innerHTML = html;

    // Apply role-based controls to the newly rendered content
    this.applyRoleBasedControls();

    // Populate the status dropdown with available options
    this.populateStatusDropdown(summary.StatusID);

    // Add event listeners for instruction checkboxes
    this.attachInstructionListeners();

    // Add event listeners for action buttons
    this.attachActionButtonListeners();

    // Add event listeners for comment functionality
    this.attachCommentListeners();
    // Add event listener for StepView button
    this.attachStepViewButtonListener();
  }

  applyFilters() {
    this.loadSteps();
    this.showNotification("Filters applied", "info");
  }

  /**
   * Load steps using enhanced StepsAPI v2 with caching and performance optimization
   */
  async loadSteps() {
    const runsheetContent = document.getElementById("runsheet-content");
    if (!runsheetContent) return;

    // Track performance
    this.performanceMetrics.loadStartTime = performance.now();
    this.performanceMetrics.apiRequests++;

    // Show loading state
    runsheetContent.innerHTML =
      '<div class="loading-message"><p>🔄 Loading steps...</p></div>';

    // Don't load steps if no migration or iteration is selected
    if (!this.filters.migration || !this.filters.iteration) {
      runsheetContent.innerHTML = `
                <div class="loading-message">
                    <p>📋 Select a migration and iteration to view steps</p>
                </div>
            `;
      this.updateStepCounts(0, 0, 0, 0, 0);
      return;
    }

    try {
      // Build filters for StepsAPI v2
      const filters = {};

      if (this.filters.migration) filters.migrationId = this.filters.migration;
      if (this.filters.iteration) filters.iterationId = this.filters.iteration;
      if (this.filters.plan) filters.planId = this.filters.plan;
      if (this.filters.sequence) filters.sequenceId = this.filters.sequence;
      if (this.filters.phase) filters.phaseId = this.filters.phase;
      if (this.filters.team) filters.teamId = this.filters.team;
      if (this.filters.label) filters.labelId = this.filters.label;

      // Apply quick filters
      if (this.quickFilters.myTeamSteps) filters.myTeamOnly = true;
      if (this.quickFilters.myAssignedSteps) filters.assignedToMe = true;
      if (this.quickFilters.criticalSteps) filters.priority = "HIGH";
      if (this.quickFilters.blockedSteps)
        filters.status = await this.getStatusName("BLOCKED");

      // Options for performance optimization
      const options = {
        sort: "sequence_number,phase_number,step_number",
        includeInstructions: false, // Load instructions lazily
        includeComments: false, // Load comments on demand
      };

      console.log("IterationView: Loading steps with enhanced API v2", {
        filters,
        options,
      });

      // Use enhanced API client with caching
      const sequences = await this.apiClient.fetchSteps(filters, options);

      // Track performance
      this.performanceMetrics.loadEndTime = performance.now();
      const loadTime =
        this.performanceMetrics.loadEndTime -
        this.performanceMetrics.loadStartTime;
      console.log(`IterationView: Steps loaded in ${loadTime.toFixed(2)}ms`);

      if (!Array.isArray(sequences) || sequences.length === 0) {
        runsheetContent.innerHTML = `
                    <div class="loading-message">
                        <p>📋 No steps found for current filters</p>
                    </div>
                `;
        this.updateStepCounts(0, 0, 0, 0, 0);
        return;
      }

      // Update team filter based on actual steps data
      this.updateTeamFilterFromSteps(sequences);

      // Render with performance optimizations
      await this.renderRunsheetOptimized(sequences);
      this.calculateAndUpdateStepCounts(sequences);

      // Start real-time updates if not already running
      if (!this.realTimeSync.isPolling) {
        this.realTimeSync.startPolling();
      }

      // Show performance notification if load time exceeds target
      if (loadTime > 3000) {
        this.showNotification(
          `Load time: ${(loadTime / 1000).toFixed(1)}s (target: <3s)`,
          "warning",
        );
      } else if (loadTime < 1000) {
        console.log(
          "IterationView: Excellent performance - under 1 second load time",
        );
      }
    } catch (error) {
      console.error("IterationView: Enhanced loadSteps error:", error);

      runsheetContent.innerHTML = `
                <div class="error-message">
                    <p>❌ Error loading steps: ${error.message}</p>
                    <p>Please try again or contact support.</p>
                    <button onclick="window.safeCallIterationView('retryLoadSteps')" class="btn btn-primary">Retry</button>
                </div>
            `;
      this.updateStepCounts(0, 0, 0, 0, 0);

      // Stop real-time sync on error
      this.realTimeSync.stopPolling();
    }
  }

  /**
   * Retry loading steps with cache clear
   */
  async retryLoadSteps() {
    this.apiClient.clearCache();
    await this.loadSteps();
  }

  /**
   * Optimized renderRunsheet method for enhanced performance
   */
  async renderRunsheetOptimized(sequences) {
    const runsheetContent = document.getElementById("runsheet-content");
    if (!runsheetContent) return;

    // Use DocumentFragment for efficient DOM manipulation
    const fragment = document.createDocumentFragment();

    console.log(
      `IterationView: Rendering ${sequences.length} sequences with optimized method`,
    );

    sequences.forEach((sequence) => {
      const sequenceElement = this._createSequenceElement(sequence);
      fragment.appendChild(sequenceElement);
    });

    // Single DOM update for better performance
    runsheetContent.innerHTML = "";
    runsheetContent.appendChild(fragment);

    // Bind events efficiently after DOM update
    this._bindEventListenersOptimized();
  }

  /**
   * Create sequence element with performance optimizations
   */
  _createSequenceElement(sequence) {
    const sequenceDiv = document.createElement("div");
    sequenceDiv.className = "sequence-section";

    // Create sequence header
    const headerDiv = document.createElement("div");
    headerDiv.className = "sequence-header";
    headerDiv.innerHTML = `
      <span class="expand-icon">▼</span>
      <h3>SEQUENCE ${sequence.number}: ${sequence.name}</h3>
    `;
    sequenceDiv.appendChild(headerDiv);

    // Create phases
    sequence.phases.forEach((phase) => {
      const phaseElement = this._createPhaseElement(phase);
      sequenceDiv.appendChild(phaseElement);
    });

    return sequenceDiv;
  }

  /**
   * Create phase element with efficient step rendering
   */
  _createPhaseElement(phase) {
    const phaseDiv = document.createElement("div");
    phaseDiv.className = "phase-section";

    // Phase header
    const phaseHeader = document.createElement("div");
    phaseHeader.className = "phase-header";
    phaseHeader.innerHTML = `
      <span class="expand-icon">▼</span>
      <h4>PHASE ${phase.number}: ${phase.name}</h4>
    `;
    phaseDiv.appendChild(phaseHeader);

    // Create table structure
    const table = document.createElement("table");
    table.className = "runsheet-table";

    // Table header
    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th class="col-code">Code</th>
        <th class="col-title">Title</th>
        <th class="col-team">Team</th>
        <th class="col-labels">Labels</th>
        <th class="col-status">Status</th>
        <th class="col-duration">Duration</th>
      </tr>
    `;
    table.appendChild(thead);

    // Table body with steps
    const tbody = document.createElement("tbody");
    phase.steps.forEach((step) => {
      const stepRow = this._createStepRow(step);
      tbody.appendChild(stepRow);
    });
    table.appendChild(tbody);
    phaseDiv.appendChild(table);

    return phaseDiv;
  }

  /**
   * Create individual step row with optimized rendering
   */
  _createStepRow(step) {
    const row = document.createElement("tr");
    row.className = `step-row ${step.id === this.selectedStep ? "selected" : ""}`;
    row.setAttribute("data-step", step.id);
    row.setAttribute("data-step-code", step.code);

    // Create cells efficiently
    const cells = [
      { className: "col-code", content: step.code },
      { className: "col-title", content: step.name },
      { className: "col-team", content: step.ownerTeamName },
      {
        className: "col-labels",
        content: this.renderLabels(step.labels || []),
      },
      { className: "col-status", content: this.getStatusDisplay(step.status) },
      {
        className: "col-duration",
        content: step.durationMinutes ? step.durationMinutes + " min" : "-",
      },
    ];

    cells.forEach((cellData) => {
      const td = document.createElement("td");
      td.className = cellData.className;
      td.innerHTML = cellData.content;
      row.appendChild(td);
    });

    return row;
  }

  /**
   * Efficiently bind event listeners using event delegation
   */
  _bindEventListenersOptimized() {
    const runsheetContent = document.getElementById("runsheet-content");
    if (!runsheetContent) return;

    // Use event delegation for better performance
    runsheetContent.addEventListener("click", (event) => {
      const target = event.target.closest(".step-row");
      if (target) {
        const stepId = target.getAttribute("data-step");
        const stepCode = target.getAttribute("data-step-code");
        if (stepId) {
          this.selectStep(stepId, stepCode);
        }
      }
    });

    // Bind folding events
    runsheetContent.addEventListener("click", (event) => {
      if (event.target.closest(".sequence-header")) {
        this.toggleSequence(event.target.closest(".sequence-header"));
      } else if (event.target.closest(".phase-header")) {
        this.togglePhase(event.target.closest(".phase-header"));
      }
    });
  }

  /**
   * Get current filters for real-time sync
   */
  getCurrentFilters() {
    return { ...this.filters };
  }

  /**
   * Recalculate step counts (used by real-time sync)
   */
  recalculateStepCounts() {
    // Get current sequences from DOM and recalculate
    const sequences = this._extractSequencesFromDOM();
    this.calculateAndUpdateStepCounts(sequences);
  }

  /**
   * Extract sequence data from current DOM for counting
   */
  _extractSequencesFromDOM() {
    const sequences = [];
    document.querySelectorAll(".sequence-section").forEach((sequenceEl) => {
      const sequence = { phases: [] };
      sequenceEl.querySelectorAll(".phase-section").forEach((phaseEl) => {
        const phase = { steps: [] };
        phaseEl.querySelectorAll(".step-row").forEach((stepEl) => {
          const statusEl = stepEl.querySelector(".col-status .status-display");
          const status = statusEl?.textContent?.trim() || "PENDING"; // TD-003 Phase 2H: Fallback for DOM parsing
          phase.steps.push({ status });
        });
        sequence.phases.push(phase);
      });
      sequences.push(sequence);
    });
    return sequences;
  }

  /**
   * Legacy renderRunsheet method for backward compatibility
   */
  renderRunsheet(sequences) {
    const runsheetContent = document.getElementById("runsheet-content");
    if (!runsheetContent) return;

    let html = "";

    sequences.forEach((sequence) => {
      html += `
                <div class="sequence-section">
                    <div class="sequence-header">
                        <span class="expand-icon">▼</span>
                        <h3>SEQUENCE ${sequence.number}: ${sequence.name}</h3>
                    </div>
            `;

      sequence.phases.forEach((phase) => {
        html += `
                    <div class="phase-section">
                        <div class="phase-header">
                            <span class="expand-icon">▼</span>
                            <h4>PHASE ${phase.number}: ${phase.name}</h4>
                        </div>
                        
                        <table class="runsheet-table">
                            <thead>
                                <tr>
                                    <th class="col-code">Code</th>
                                    <th class="col-title">Title</th>
                                    <th class="col-team">Team</th>
                                    <th class="col-labels">Labels</th>
                                    <th class="col-status">Status</th>
                                    <th class="col-duration">Duration</th>
                                </tr>
                            </thead>
                            <tbody>
                `;

        phase.steps.forEach((step) => {
          const statusClass = this.getStatusClass(step.status);
          const labelsHtml = this.renderLabels(step.labels || []);
          html += `
                        <tr class="step-row ${step.id === this.selectedStep ? "selected" : ""}" 
                            data-step="${step.id}" 
                            data-step-code="${step.code}">
                            <td class="col-code">${step.code}</td>
                            <td class="col-title">${step.name}</td>
                            <td class="col-team">${step.ownerTeamName}</td>
                            <td class="col-labels">${labelsHtml}</td>
                            <td class="col-status">${this.getStatusDisplay(step.status)}</td>
                            <td class="col-duration">${step.durationMinutes ? step.durationMinutes + " min" : "-"}</td>
                        </tr>
                    `;
        });

        html += `
                            </tbody>
                        </table>
                    </div>
                `;
      });

      html += `</div>`;
    });

    // Use setTimeout to avoid conflicts with Confluence's MutationObserver
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      try {
        runsheetContent.innerHTML = html;

        // Bind click events to step rows
        this.bindStepRowEvents();

        // Bind fold/unfold events to sequence and phase headers
        this.bindFoldingEvents();
      } catch (error) {
        console.warn("Failed to render runsheet:", error);
      }
    }, 10);
    this.activeTimeouts.add(timeoutId);
  }

  /**
   * Bind click events to step rows
   */
  bindStepRowEvents() {
    const stepRows = document.querySelectorAll(".step-row");
    stepRows.forEach((row) => {
      row.addEventListener("click", () => {
        const stepId = row.getAttribute("data-step");
        const stepCode = row.getAttribute("data-step-code");
        if (stepId) {
          this.selectStep(stepId, stepCode);
        }
      });
    });
  }

  /**
   * Bind fold/unfold events to sequence and phase headers
   */
  bindFoldingEvents() {
    // Sequence headers
    document.querySelectorAll(".sequence-header").forEach((header) => {
      header.addEventListener("click", (e) => {
        this.toggleSequence(e.currentTarget);
      });
    });

    // Phase headers
    document.querySelectorAll(".phase-header").forEach((header) => {
      header.addEventListener("click", (e) => {
        this.togglePhase(e.currentTarget);
      });
    });
  }

  /**
   * Toggle sequence visibility (fold/unfold)
   */
  toggleSequence(sequenceHeader) {
    const icon = sequenceHeader.querySelector(".expand-icon");
    const sequenceSection = sequenceHeader.closest(".sequence-section");
    const phaseSections = sequenceSection.querySelectorAll(".phase-section");

    if (icon.classList.contains("collapsed")) {
      icon.classList.remove("collapsed");
      phaseSections.forEach((phase) => (phase.style.display = "block"));
    } else {
      icon.classList.add("collapsed");
      phaseSections.forEach((phase) => (phase.style.display = "none"));
    }
  }

  /**
   * Toggle phase visibility (fold/unfold)
   */
  togglePhase(phaseHeader) {
    const icon = phaseHeader.querySelector(".expand-icon");
    const phaseSection = phaseHeader.closest(".phase-section");
    const stepsTable = phaseSection.querySelector("table.runsheet-table");

    if (icon.classList.contains("collapsed")) {
      icon.classList.remove("collapsed");
      if (stepsTable) {
        stepsTable.style.display = "table";
      }
    } else {
      icon.classList.add("collapsed");
      if (stepsTable) {
        stepsTable.style.display = "none";
      }
    }
  }

  /**
   * Get CSS class for step status
   */
  getStatusClass(status) {
    if (!status) return "status-pending";

    // Handle exact status matches from status_sts table
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return "status-completed";
      case "IN_PROGRESS":
        return "status-progress";
      case "FAILED":
        return "status-failed";
      case "BLOCKED":
        return "status-blocked";
      case "CANCELLED":
        return "status-cancelled";
      case "TODO":
        return "status-todo";
      case "PENDING":
        return "status-pending";
      default:
        // Fallback to old logic for backward compatibility
        const statusLower = status.toLowerCase();
        if (statusLower.includes("completed")) return "status-completed";
        if (statusLower.includes("progress")) return "status-progress";
        if (statusLower.includes("failed") || statusLower.includes("error"))
          return "status-failed";
        if (statusLower.includes("blocked")) return "status-blocked";
        if (statusLower.includes("cancelled")) return "status-cancelled";
        if (statusLower.includes("todo") || statusLower.includes("not_started"))
          return "status-todo";
        return "status-pending";
    }
  }

  /**
   * Get contrasting text color for a background color
   */
  getContrastColor(hexColor) {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);

    // Calculate relative luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black or white based on luminance
    return luminance > 0.5 ? "#000000" : "#ffffff";
  }

  /**
   * Get status display with dynamic color from database
   */
  getStatusDisplay(status) {
    if (!status) return this.createStatusSpan("PENDING", "PENDING"); // TD-003 Phase 2H: Sync fallback for rendering

    const statusUpper = status.toUpperCase();
    const displayText = statusUpper.replace(/_/g, " ");

    return this.createStatusSpan(statusUpper, displayText);
  }

  /**
   * Create a status span with dynamic color
   */
  createStatusSpan(statusKey, displayText) {
    const color = this.statusColors?.get(statusKey) || "#DDDDDD";
    const textColor = this.getTextColorForBackground(color);

    return `<span class="status-display" style="background-color: ${color}; color: ${textColor}; padding: 2px 6px; border-radius: 3px; font-weight: 600; font-size: 10px; letter-spacing: 0.5px;">${displayText}</span>`;
  }

  /**
   * Get appropriate text color (black or white) based on background color
   */
  getTextColorForBackground(bgColor) {
    // Convert hex to RGB
    const hex = bgColor.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? "#000000" : "#FFFFFF";
  }

  /**
   * Render labels as colored tags
   */
  renderLabels(labels) {
    if (!labels || labels.length === 0) {
      return '<span class="no-labels">-</span>';
    }

    return labels
      .map((label) => {
        const color = label.color || "#6B778C";
        return `<span class="label-tag" style="background-color: ${color}; color: white;" title="${label.description || label.name}">${label.name}</span>`;
      })
      .join(" ");
  }

  /**
   * Calculate and update step counts from sequences data
   */
  calculateAndUpdateStepCounts(sequences) {
    let total = 0;
    let pending = 0;
    let todo = 0;
    let progress = 0;
    let completed = 0;
    let failed = 0;
    let blocked = 0;
    let cancelled = 0;

    sequences.forEach((sequence) => {
      sequence.phases.forEach((phase) => {
        phase.steps.forEach((step) => {
          total++;

          // Use exact status matching from status_sts table
          if (!step.status) {
            pending++;
            return;
          }

          switch (step.status.toUpperCase()) {
            case "COMPLETED":
              completed++;
              break;
            case "IN_PROGRESS":
              progress++;
              break;
            case "FAILED":
              failed++;
              break;
            case "BLOCKED":
              blocked++;
              break;
            case "CANCELLED":
              cancelled++;
              break;
            case "TODO":
              todo++;
              break;
            case "PENDING":
              pending++;
              break;
            default:
              // Fallback to old logic for backward compatibility
              const statusClass = this.getStatusClass(step.status);
              switch (statusClass) {
                case "status-completed":
                  completed++;
                  break;
                case "status-progress":
                  progress++;
                  break;
                case "status-failed":
                  failed++;
                  break;
                case "status-blocked":
                  blocked++;
                  break;
                case "status-cancelled":
                  cancelled++;
                  break;
                case "status-todo":
                  todo++;
                  break;
                default:
                  pending++;
              }
          }
        });
      });
    });

    this.updateStepCounts(
      total,
      pending,
      todo,
      progress,
      completed,
      failed,
      blocked,
      cancelled,
    );
  }

  /**
   * Update step count display
   */
  updateStepCounts(
    total,
    pending,
    todo,
    progress,
    completed,
    failed,
    blocked,
    cancelled,
  ) {
    const elements = {
      "total-steps": total,
      "pending-steps": pending,
      "todo-steps": todo,
      "progress-steps": progress,
      "completed-steps": completed,
      "failed-steps": failed,
      "blocked-steps": blocked,
      "cancelled-steps": cancelled,
    };

    // Use setTimeout to avoid conflicts with Confluence's MutationObserver
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      Object.entries(elements).forEach(([id, count]) => {
        try {
          const element = document.getElementById(id);
          if (element) {
            element.textContent = count;
          }
        } catch (error) {
          console.warn(`Failed to update step count for ${id}:`, error);
        }
      });
    }, 10);
    this.activeTimeouts.add(timeoutId);
  }

  /**
   * Update team filter dropdown based on actual teams that own steps
   * @param {Array} sequences - Array of sequences with phases and steps
   */
  updateTeamFilterFromSteps(sequences) {
    const teamFilter = document.getElementById("team-filter");
    if (!teamFilter) return;

    // Extract unique teams from steps
    const teamsMap = new Map();

    sequences.forEach((sequence) => {
      sequence.phases.forEach((phase) => {
        phase.steps.forEach((step) => {
          if (step.ownerTeamId && step.ownerTeamName) {
            teamsMap.set(step.ownerTeamId, step.ownerTeamName);
          }
        });
      });
    });

    // Convert to array and sort
    const teams = Array.from(teamsMap.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Store current selection
    const currentSelection = teamFilter.value;

    // Clear and populate dropdown
    teamFilter.innerHTML = '<option value="">All Teams</option>';

    teams.forEach((team) => {
      const option = document.createElement("option");
      option.value = team.id;
      option.textContent = team.name;
      teamFilter.appendChild(option);
    });

    // Restore selection if it still exists
    if (currentSelection && teams.find((t) => t.id == currentSelection)) {
      teamFilter.value = currentSelection;
    } else if (currentSelection) {
      // If the previously selected team is no longer available, reset the filter
      teamFilter.value = "";
      this.filters.team = "";
    }

    console.log(
      `updateTeamFilterFromSteps: Updated team filter with ${teams.length} teams`,
    );
  }

  /**
   * Apply dynamic colors to step count elements
   */
  applyCounterColors() {
    if (!this.statusColors) return;

    // TD-003 Phase 2H: Fixed UI element to status mappings (intentionally hardcoded)
    const counterMappings = [
      { elementId: "pending-steps", statusKey: "PENDING" },
      { elementId: "todo-steps", statusKey: "TODO" },
      { elementId: "progress-steps", statusKey: "IN_PROGRESS" },
      { elementId: "completed-steps", statusKey: "COMPLETED" },
      { elementId: "failed-steps", statusKey: "FAILED" },
      { elementId: "blocked-steps", statusKey: "BLOCKED" },
      { elementId: "cancelled-steps", statusKey: "CANCELLED" },
    ];

    counterMappings.forEach(({ elementId, statusKey }) => {
      const element = document.getElementById(elementId);
      if (element) {
        const color = this.statusColors.get(statusKey) || "#DDDDDD";
        const textColor = this.getTextColorForBackground(color);

        element.style.backgroundColor = color;
        element.style.color = textColor;
        element.style.border = `1px solid ${color}`;
      }
    });
  }

  startStep() {
    if (this.selectedStep) {
      // TODO: Implement step status update API call
      this.showNotification(
        "Step status update functionality coming soon",
        "info",
      );
    }
  }

  completeStep() {
    if (this.selectedStep) {
      // TODO: Implement step status update API call
      this.showNotification(
        "Step status update functionality coming soon",
        "info",
      );
    }
  }

  blockStep() {
    if (this.selectedStep) {
      // TODO: Implement step status update API call
      this.showNotification(
        "Step status update functionality coming soon",
        "info",
      );
    }
  }

  addComment() {
    const commentInput = document.querySelector(".comment-form textarea");
    if (commentInput && commentInput.value.trim()) {
      // TODO: Implement comment API call
      commentInput.value = "";
      this.showNotification("Comment functionality coming soon", "info");
    }
  }

  updateStepStatus(stepId, status) {
    // Update the table row
    const row = document.querySelector(`[data-step="${stepId}"]`);
    if (row) {
      const statusCell = row.querySelector(".col-status");
      if (statusCell) {
        statusCell.textContent = status;
        statusCell.className = `col-status ${this.getStatusClass(status)}`;
      }
    }

    // Reload steps to update counts
    this.loadSteps();
  }

  /**
   * Format time ago from timestamp
   */
  formatTimeAgo(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
      const interval = Math.floor(seconds / secondsInUnit);
      if (interval >= 1) {
        return interval === 1 ? `1 ${unit} ago` : `${interval} ${unit}s ago`;
      }
    }

    return "just now";
  }

  /**
   * Escape HTML to prevent XSS
   */
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Attach event listeners for comment functionality
   */
  attachCommentListeners() {
    // Add comment button
    const addCommentBtn = document.getElementById("add-comment-btn");
    if (addCommentBtn) {
      addCommentBtn.addEventListener("click", () => this.handleAddComment());
    }

    // Edit comment buttons
    const editButtons = document.querySelectorAll(".btn-edit-comment");
    editButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleEditComment(e));
    });

    // Delete comment buttons
    const deleteButtons = document.querySelectorAll(".btn-delete-comment");
    deleteButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => this.handleDeleteComment(e));
    });
  }

  /**
   * Attach event listener for StepView button
   */
  attachStepViewButtonListener() {
    const stepViewBtn = document.getElementById("open-stepview-btn");
    if (stepViewBtn) {
      stepViewBtn.addEventListener("click", () => this.openStepView());
    }
  }

  /**
   * Build the StepView URL with current context parameters using server-provided configuration
   * Uses UrlConstructionService via server-side macro configuration for consistency
   */
  buildStepViewURL() {
    const migrationSelect = document.getElementById("migration-select");
    const iterationSelect = document.getElementById("iteration-select");

    // Get the migration name from data attribute (since we don't have migration codes)
    const selectedMigOption = migrationSelect
      ? migrationSelect.selectedOptions[0]
      : null;
    const migrationName = selectedMigOption
      ? selectedMigOption.dataset.migName
      : "";

    // Get iteration name from data attribute (user wants name, not code, in the URL)
    const selectedIteOption = iterationSelect
      ? iterationSelect.selectedOptions[0]
      : null;
    const iterationName = selectedIteOption
      ? selectedIteOption.dataset.iteName
      : "";
    const stepCode = this.selectedStepCode || "";

    if (!migrationName || !iterationName || !stepCode) {
      console.warn("buildStepViewURL: Missing required parameters", {
        migration: migrationName,
        iteration: iterationName,
        stepCode: stepCode,
      });
      return null;
    }

    // Use server-provided configuration from UrlConstructionService
    const stepViewConfig = window.UMIG_ITERATION_CONFIG?.stepView;
    if (!stepViewConfig?.baseUrl || stepViewConfig.baseUrl.trim() === "") {
      console.error("buildStepViewURL: Server configuration not available", {
        available: !!window.UMIG_ITERATION_CONFIG,
        stepViewConfig: stepViewConfig,
        baseUrl: stepViewConfig?.baseUrl,
        message:
          "Configuration must be loaded from server before building step URLs",
      });

      // Show user-friendly error message
      this.showNotification(
        "Step view configuration is not available. Please contact your administrator.",
        "error",
      );

      // Return null to indicate failure - no hardcoded fallback
      return null;
    }

    // Build URL using server-provided base URL template
    // Server provides format like: http://localhost:8090/pages/viewpage.action?pageId=1114120
    // We need to append our parameters to this
    const params = new URLSearchParams();
    // Don't sanitize - let URLSearchParams handle proper URL encoding
    params.set("mig", migrationName);
    params.set("ite", iterationName); // Use iteration name, not code
    params.set("stepid", stepCode);

    // Check if baseUrl already has query parameters
    const separator = stepViewConfig.baseUrl.includes("?") ? "&" : "?";
    const constructedUrl = `${stepViewConfig.baseUrl}${separator}${params.toString()}`;

    console.log(
      "buildStepViewURL: Constructed URL using server configuration",
      {
        baseUrl: stepViewConfig.baseUrl,
        parameters: Object.fromEntries(params),
        finalUrl: constructedUrl,
      },
    );

    return constructedUrl;
  }

  /**
   * Sanitize URL parameters following UrlConstructionService patterns
   * Basic client-side validation to match server-side sanitization
   */
  _sanitizeParameter(param) {
    if (!param || typeof param !== "string") return "";

    // Allow alphanumeric, dots, underscores, hyphens, and spaces (for iteration names)
    // Spaces will be URL-encoded by URLSearchParams
    const sanitized = param.trim().replace(/[^a-zA-Z0-9._\- ]/g, "");
    return sanitized;
  }

  /**
   * Open StepView in new tab/window
   */
  openStepView() {
    const stepViewURL = this.buildStepViewURL();

    if (stepViewURL) {
      console.log("Opening StepView:", stepViewURL);
      window.open(stepViewURL, "_blank", "noopener,noreferrer");
    } else {
      this.showNotification(
        "Unable to open StepView - missing context information",
        "warning",
      );
    }
  }

  /**
   * Handle adding a new comment
   */
  async handleAddComment() {
    const textarea = document.getElementById("new-comment-text");
    const addBtn = document.getElementById("add-comment-btn");

    if (!textarea || !addBtn) return;

    const commentText = textarea.value.trim();
    if (!commentText) {
      this.showNotification("Please enter a comment", "warning");
      return;
    }

    // Get the current step instance ID
    const stepSummary = document.querySelector(".step-info");
    const stiId = stepSummary?.dataset?.stiId || this.currentStepInstanceId;

    if (!stiId) {
      this.showNotification("Unable to determine step instance", "error");
      return;
    }

    try {
      // Disable the button during submission
      addBtn.disabled = true;
      textarea.disabled = true;

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/comments/${stiId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Atlassian-Token": "no-check", // Required for Confluence XSRF protection
          },
          credentials: "same-origin", // Include cookies for authentication
          body: JSON.stringify({
            body: commentText,
            userId: this.userContext?.userId || null, // Use actual user context with fallback
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to add comment: ${response.status}`);
      }

      const result = await response.json();

      // Clear the textarea
      textarea.value = "";

      // Refresh the step details to show the new comment
      if (this.selectedStep) {
        this.loadStepDetails(this.selectedStep);
      }

      this.showNotification("Comment added successfully", "success");
    } catch (error) {
      console.error("Error adding comment:", error);
      this.showNotification("Failed to add comment", "error");
    } finally {
      // Re-enable controls
      addBtn.disabled = false;
      textarea.disabled = false;
    }
  }

  /**
   * Handle editing a comment
   */
  async handleEditComment(event) {
    const commentId = event.target.dataset.commentId;
    const commentDiv = document.querySelector(
      `[data-comment-id="${commentId}"]`,
    );
    const bodyDiv = document.getElementById(`comment-body-${commentId}`);

    if (!bodyDiv) return;

    // Check if already in edit mode
    if (bodyDiv.querySelector("textarea")) {
      return;
    }

    // Store the original text
    const currentText = bodyDiv.textContent;
    bodyDiv.dataset.originalText = currentText;

    // Replace body with textarea
    const editContainer = document.createElement("div");
    editContainer.innerHTML = `
            <textarea id="edit-comment-${commentId}" rows="3" style="width: 100%;">${this.escapeHtml(currentText)}</textarea>
            <div style="margin-top: 8px;">
                <button class="btn btn-primary btn-sm save-comment-btn" data-comment-id="${commentId}">Save</button>
                <button class="btn btn-secondary btn-sm cancel-comment-btn" data-comment-id="${commentId}">Cancel</button>
            </div>
        `;

    bodyDiv.innerHTML = "";
    bodyDiv.appendChild(editContainer);

    // Attach event listeners to the new buttons
    const saveBtn = bodyDiv.querySelector(".save-comment-btn");
    const cancelBtn = bodyDiv.querySelector(".cancel-comment-btn");

    saveBtn.addEventListener("click", () => this.saveCommentEdit(commentId));
    cancelBtn.addEventListener("click", () =>
      this.cancelCommentEdit(commentId),
    );

    // Focus the textarea
    const textarea = document.getElementById(`edit-comment-${commentId}`);
    if (textarea) {
      textarea.focus();
      textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    }
  }

  /**
   * Save comment edit
   */
  async saveCommentEdit(commentId) {
    const textarea = document.getElementById(`edit-comment-${commentId}`);
    if (!textarea) return;

    const newText = textarea.value.trim();
    if (!newText) {
      this.showNotification("Comment cannot be empty", "warning");
      return;
    }

    try {
      const response = await fetch(
        `/rest/scriptrunner/latest/custom/comments/${commentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "X-Atlassian-Token": "no-check", // Required for Confluence XSRF protection
          },
          credentials: "same-origin", // Include cookies for authentication
          body: JSON.stringify({
            body: newText,
            userId: this.userContext?.userId || null, // Use actual user context with fallback
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to update comment: ${response.status}`);
      }

      // Refresh the step details
      if (this.selectedStep) {
        this.loadStepDetails(this.selectedStep);
      }

      this.showNotification("Comment updated successfully", "success");
    } catch (error) {
      console.error("Error updating comment:", error);
      this.showNotification("Failed to update comment", "error");
    }
  }

  /**
   * Cancel comment edit
   */
  cancelCommentEdit(commentId) {
    const bodyDiv = document.getElementById(`comment-body-${commentId}`);
    if (bodyDiv) {
      const originalText = bodyDiv.dataset.originalText || "";
      bodyDiv.innerHTML = this.escapeHtml(originalText);
    }
  }

  /**
   * Handle deleting a comment
   */
  async handleDeleteComment(event) {
    const commentId = event.target.dataset.commentId;

    // Use custom confirm dialog to avoid flickering issue
    this.showDeleteConfirmDialog(
      "Delete Comment",
      "Are you sure you want to delete this comment?",
      async () => {
        try {
          const response = await fetch(
            `/rest/scriptrunner/latest/custom/comments/${commentId}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
                "X-Atlassian-Token": "no-check", // Required for Confluence XSRF protection
              },
              credentials: "same-origin", // Include cookies for authentication
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to delete comment: ${response.status}`);
          }

          // Remove the comment from DOM
          const commentDiv = document.querySelector(
            `[data-comment-id="${commentId}"]`,
          );
          if (commentDiv) {
            commentDiv.remove();
          }

          // Update the comment count
          const commentsHeader = document.querySelector(".comments-section h4");
          if (commentsHeader) {
            const currentCount =
              parseInt(commentsHeader.textContent.match(/\d+/)[0]) || 0;
            commentsHeader.textContent = `💬 COMMENTS (${Math.max(0, currentCount - 1)})`;
          }

          this.showNotification("Comment deleted successfully", "success");
        } catch (error) {
          console.error("Error deleting comment:", error);
          this.showNotification("Failed to delete comment", "error");
        }
      },
    );
  }

  /**
   * Show custom confirmation dialog to avoid Confluence modal flickering
   */
  showDeleteConfirmDialog(title, message, onConfirm) {
    // Create overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(0, 0, 0, 0.5);
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
        `;

    // Create dialog
    const dialog = document.createElement("div");
    dialog.style.cssText = `
            background: white;
            border-radius: 3px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.16);
            padding: 20px;
            width: 400px;
            max-width: 90%;
        `;

    dialog.innerHTML = `
            <h3 style="margin: 0 0 10px 0; color: #172B4D;">${this.escapeHtml(title)}</h3>
            <p style="margin: 0 0 20px 0; color: #5E6C84;">${this.escapeHtml(message)}</p>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
                <button class="aui-button" id="cancel-delete-btn">Cancel</button>
                <button class="aui-button aui-button-primary" id="confirm-delete-btn">Delete</button>
            </div>
        `;

    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Handle button clicks
    const cancelBtn = dialog.querySelector("#cancel-delete-btn");
    const confirmBtn = dialog.querySelector("#confirm-delete-btn");

    const cleanup = () => {
      overlay.remove();
    };

    cancelBtn.addEventListener("click", cleanup);
    confirmBtn.addEventListener("click", () => {
      cleanup();
      onConfirm();
    });

    // Close on overlay click
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        cleanup();
      }
    });

    // Focus confirm button
    confirmBtn.focus();
  }

  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 4px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;

    // Set background color based on type
    const colors = {
      info: "#0065FF",
      success: "#00875A",
      warning: "#FF8B00",
      error: "#DE350B",
    };
    notification.style.backgroundColor = colors[type] || colors.info;

    // Add CSS animation
    const style = document.createElement("style");
    style.textContent = `
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
    document.head.appendChild(style);

    // Add to DOM
    document.body.appendChild(notification);

    // Remove after 3 seconds
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      notification.remove();
      style.remove();
    }, 3000);
    this.activeTimeouts.add(timeoutId);
  }

  updateFilters() {
    // Initialize filter state
    this.applyFilters();
  }

  /**
   * Show blank runsheet state when no migration/iteration is selected
   */
  showBlankRunsheetState() {
    const runsheetContent = document.getElementById("runsheet-content");
    if (runsheetContent) {
      runsheetContent.innerHTML = `
                <div class="loading-message">
                    <p>📋 Select a migration and iteration to view steps</p>
                </div>
            `;
    }

    // Clear step details
    const stepDetailsContent = document.querySelector(".step-details-content");
    if (stepDetailsContent) {
      stepDetailsContent.innerHTML = `
                <div class="loading-message">
                    <p>👋 Select a step from the runsheet to view details</p>
                </div>
            `;
    }

    // Reset counts
    this.updateStepCounts(0, 0, 0, 0, 0);
  }

  /**
   * Load steps and auto-select first step of first phase in first sequence
   */
  async loadStepsAndSelectFirst() {
    try {
      // Load the steps first
      await this.loadSteps();

      // Auto-select first step if none is selected
      if (!this.selectedStep) {
        const firstStepRow = document.querySelector(".step-row");
        if (firstStepRow) {
          const stepId = firstStepRow.getAttribute("data-step");
          const stepCode = firstStepRow.getAttribute("data-step-code");
          if (stepId) {
            this.selectStep(stepId, stepCode);
          }
        }
      }
    } catch (error) {
      console.error("loadStepsAndSelectFirst: Error:", error);
      this.showBlankRunsheetState();
    }
  }

  /**
   * Cleanup method to clear all active timeouts and prevent memory leaks
   */
  cleanup() {
    // Clear all active timeouts
    this.activeTimeouts.forEach((id) => clearTimeout(id));
    this.activeTimeouts.clear();

    // 🔧 FIX: Clear step-specific timeouts if they exist
    if (this.stepTimeouts) {
      this.stepTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      this.stepTimeouts.clear();
    }

    // Clean up real-time sync if it exists
    if (this.realTimeSync) {
      this.realTimeSync.stopPolling();
    }

    // Clean up API client if it exists
    if (this.stepsApi && typeof this.stepsApi.cleanup === "function") {
      this.stepsApi.cleanup();
    }

    console.log(
      "IterationView: Cleanup completed - cleared all timeouts and references",
    );
  }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  console.log("IterationView: DOM Content Loaded - Starting initialization");

  // Verify the IterationView class is available
  if (typeof IterationView === "undefined") {
    console.error(
      "IterationView: Class not found! JavaScript parsing may have failed.",
    );
    const runsheetContent = document.getElementById("runsheet-content");
    if (runsheetContent) {
      runsheetContent.innerHTML = `
        <div class="error-message">
          <p>❌ JavaScript Error: IterationView class not found</p>
          <p>Please check the browser console for details and contact support.</p>
        </div>
      `;
    }
    return;
  }

  try {
    console.log("IterationView: Creating new instance...");
    const iterationView = new IterationView();

    // Make iterationView globally accessible for inline event handlers
    window.iterationView = iterationView;
    console.log(
      "IterationView: Instance created successfully and assigned to window.iterationView",
    );

    // Verify the global assignment worked
    if (window.iterationView) {
      console.log("IterationView: Global window.iterationView is available");

      // Now start async initialization
      if (!iterationView.initialized) {
        console.log("IterationView: Starting async initialization...");
        iterationView
          .init()
          .then(() => {
            iterationView.initialized = true;
            console.log("IterationView: Async initialization completed");
          })
          .catch((error) => {
            console.error("IterationView: Async initialization failed:", error);
          });
      }
    } else {
      console.error("IterationView: Failed to assign to window.iterationView");
    }

    // Add expand/collapse all functionality
    const expandAllBtn = document.getElementById("expand-all-btn");
    const collapseAllBtn = document.getElementById("collapse-all-btn");

    if (expandAllBtn) {
      expandAllBtn.addEventListener("click", () => {
        console.log("IterationView: Expand all clicked");
        // Expand all sequences and phases
        document
          .querySelectorAll(".sequence-header .expand-icon")
          .forEach((icon) => {
            icon.classList.remove("collapsed");
          });
        document
          .querySelectorAll(".phase-header .expand-icon")
          .forEach((icon) => {
            icon.classList.remove("collapsed");
          });
        document.querySelectorAll(".phase-section").forEach((phase) => {
          phase.style.display = "block";
        });
        document.querySelectorAll(".runsheet-table").forEach((table) => {
          table.style.display = "table";
        });
      });
      console.log("IterationView: Expand all button listener attached");
    } else {
      console.warn("IterationView: Expand all button not found");
    }

    if (collapseAllBtn) {
      collapseAllBtn.addEventListener("click", () => {
        console.log("IterationView: Collapse all clicked");
        // Collapse all sequences and phases
        document
          .querySelectorAll(".sequence-header .expand-icon")
          .forEach((icon) => {
            icon.classList.add("collapsed");
          });
        document
          .querySelectorAll(".phase-header .expand-icon")
          .forEach((icon) => {
            icon.classList.add("collapsed");
          });
        document.querySelectorAll(".phase-section").forEach((phase) => {
          phase.style.display = "none";
        });
        document.querySelectorAll(".runsheet-table").forEach((table) => {
          table.style.display = "none";
        });
      });
      console.log("IterationView: Collapse all button listener attached");
    } else {
      console.warn("IterationView: Collapse all button not found");
    }

    console.log("IterationView: Initialization completed successfully");
  } catch (error) {
    console.error("IterationView: Failed to initialize:", error);
    console.error("IterationView: Stack trace:", error.stack);

    // Show user-friendly error message
    const runsheetContent = document.getElementById("runsheet-content");
    if (runsheetContent) {
      runsheetContent.innerHTML = `
        <div class="error-message">
          <p>❌ Failed to initialize Iteration View</p>
          <p><strong>Error:</strong> ${error.message}</p>
          <p>Please check the browser console for details and refresh the page.</p>
          <button onclick="location.reload()" class="btn btn-primary" style="margin-top: 10px;">Refresh Page</button>
        </div>
      `;
    }
  }
});

// Global safety functions for inline onclick handlers
window.safeCallIterationView = function (methodName, ...args) {
  if (
    window.iterationView &&
    typeof window.iterationView[methodName] === "function"
  ) {
    console.log(`IterationView: Calling ${methodName}`, args);
    return window.iterationView[methodName](...args);
  } else {
    console.warn(
      `IterationView: ${methodName} not available yet, window.iterationView:`,
      window.iterationView,
    );
    // Show user-friendly message
    alert("Please wait for the page to fully load before trying this action.");
    return null;
  }
};

// Export for potential module use
if (typeof module !== "undefined" && module.exports) {
  module.exports = IterationView;
}
