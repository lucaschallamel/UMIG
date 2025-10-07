/**
 * UMIG Admin GUI JavaScript Controller
 *
 * Main controller for the UMIG Administration interface.
 * Handles authentication, navigation, data management, and UI interactions.
 *
 * Features:
 * - Confluence user integration
 * - Role-based access control
 * - Dynamic content loading
 * - CRUD operations for all entities
 * - Real-time data refresh
 * - Search and filtering
 * - Pagination
 * - Modal forms
 */

"use strict";

// Security Utils availability checker
function isSecurityUtilsAvailable(methodName = null) {
  if (!window.SecurityUtils) {
    console.warn("[AdminGUI] SecurityUtils not available on window object");
    return false;
  }
  if (methodName && typeof window.SecurityUtils[methodName] !== "function") {
    console.warn(`[AdminGUI] SecurityUtils.${methodName} is not a function`);
    return false;
  }
  return true;
}

// Global Admin GUI namespace
window.adminGui = {
  // Application state
  state: {
    isAuthenticated: false,
    currentUser: null,
    currentSection: "welcome",
    currentEntity: "welcome",
    currentPage: 1,
    pageSize: 50,
    searchTerm: "",
    sortField: null,
    sortDirection: "asc",
    selectedRows: new Set(),
    data: {},
    pagination: null,
    loading: false,
    teamFilter: null,
  },

  // Track active timeouts for proper cleanup and MutationObserver conflict avoidance
  activeTimeouts: new Set(),

  // Configuration from Groovy macro
  config: window.UMIG_CONFIG || {},

  // Component Migration Integration (US-087)
  componentManagers: {},
  featureToggle: null,
  performanceMonitor: null,

  // API endpoints with dynamic base URL resolution (US-098 Configuration Management)
  api: {
    // Dynamic baseUrl getter implementing US-098 configuration patterns
    // Fallback chain: window.UMIG_CONFIG → constructed from window.location → hard-coded default
    get baseUrl() {
      // Tier 1: Check injected configuration from macro (preferred - environment-aware)
      if (
        window.UMIG_CONFIG &&
        window.UMIG_CONFIG.api &&
        window.UMIG_CONFIG.api.baseUrl
      ) {
        console.debug(
          "[AdminGUI] Using baseUrl from UMIG_CONFIG:",
          window.UMIG_CONFIG.api.baseUrl,
        );
        return window.UMIG_CONFIG.api.baseUrl;
      }

      // Tier 2: Construct from window.location (works in all environments)
      if (window.location && window.location.origin) {
        const constructedUrl = `${window.location.origin}/rest/scriptrunner/latest/custom`;
        console.debug(
          "[AdminGUI] Constructed baseUrl from window.location:",
          constructedUrl,
        );
        return constructedUrl;
      }

      // Tier 3: Hard-coded fallback for development (last resort)
      console.warn(
        "[AdminGUI] Using hard-coded baseUrl fallback - configuration injection may have failed",
      );
      return "/rest/scriptrunner/latest/custom";
    },
    endpoints: {
      users: "/users",
      teams: "/teams",
      environments: "/environments",
      applications: "/applications",
      iterations: "/iterationsList",
      labels: "/labels",
      iterationTypes: "/iterationTypes",
      migrationTypes: "/migrationTypes",
      migrations: "/migrations",
      stepView: "/stepViewApi",
      plansmaster: "/plans/masters",
      plansinstance: "/plans",
      sequencesmaster: "/sequences/master",
      sequencesinstance: "/sequences",
      phasesmaster: "/phases/master",
      phasesinstance: "/phasesinstance",
    },
  },

  // Entity configurations (delegated to EntityConfig.js)
  // Get entities from the centralized EntityConfig module with fallback
  get entities() {
    if (
      window.EntityConfig &&
      typeof window.EntityConfig.getAllEntities === "function"
    ) {
      return window.EntityConfig.getAllEntities();
    }

    // Fallback warning if EntityConfig is not available
    console.warn("EntityConfig not available, using empty configuration");
    return {};
  },

  // Helper method to get a specific entity configuration
  getEntity: function (entityName) {
    // FIXED: Special handling for specialized components that are not traditional entities
    const specializedComponents = [
      "databaseVersionManager",
      "componentVersionTracker",
    ];

    if (specializedComponents.includes(entityName)) {
      // These are component-based entities, not EntityConfig entities
      // Return null without warning since they're handled by specialized component logic
      return null;
    }

    if (
      window.EntityConfig &&
      typeof window.EntityConfig.getEntity === "function"
    ) {
      const entity = window.EntityConfig.getEntity(entityName);
      if (!entity) {
        console.warn(`Entity '${entityName}' not found in EntityConfig`);
      }
      return entity;
    }

    // Fallback to direct access if EntityConfig API is not available
    console.warn("EntityConfig API not available, attempting fallback");
    const entities = this.entities;
    return entities[entityName] || null;
  },

  // Cleanup function for active timeouts (MutationObserver safety)
  cleanup: function () {
    // Clear all active timeouts to prevent memory leaks
    this.activeTimeouts.forEach((timeoutId) => {
      clearTimeout(timeoutId);
    });
    this.activeTimeouts.clear();
    console.log("[UMIG] Admin GUI cleanup completed");
  },

  // Centralized API utility to eliminate fetch code duplication
  makeApiCall: async function (options) {
    const {
      endpoint,
      method = "GET",
      data = null,
      params = null,
      headers = {},
      timeout = 30000, // 30 second timeout
      retries = 1,
      onSuccess = null,
      onError = null,
      context = "API call",
    } = options;

    try {
      // Build URL with parameters
      let url = `${this.api.baseUrl}${endpoint}`;
      if (params) {
        const urlParams = new URLSearchParams(params);
        url += `?${urlParams.toString()}`;
      }

      // Default headers with security enhancements
      const defaultHeaders = {
        Accept: "application/json",
        "Content-Type": "application/json",
        "X-Atlassian-Token": "no-check",
        ...headers,
      };

      // Add CSRF token if available
      if (isSecurityUtilsAvailable("getCSRFToken")) {
        const csrfToken = window.SecurityUtils.getCSRFToken();
        if (csrfToken) {
          defaultHeaders["X-CSRF-Token"] = csrfToken;
        }
      }

      console.log(`[UMIG API] ${method} ${url} - ${context}`);

      // Log security event for API calls
      if (isSecurityUtilsAvailable("logSecurityEvent")) {
        window.SecurityUtils.logSecurityEvent("api_call_initiated", {
          method: method,
          endpoint: endpoint,
          context: context,
          hasData: !!data,
        });
      }

      // Create fetch configuration
      const fetchConfig = {
        method: method,
        credentials: "same-origin",
        headers: defaultHeaders,
      };

      // Add body for non-GET requests
      if (data && method !== "GET") {
        fetchConfig.body = JSON.stringify(data);
      }

      // Create timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error(`Request timeout after ${timeout}ms`)),
          timeout,
        );
      });

      // Attempt API call with retries
      let lastError = null;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          if (attempt > 0) {
            console.log(`[UMIG API] Retry attempt ${attempt} for ${context}`);
            // Wait before retry (exponential backoff)
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, attempt) * 1000),
            );
          }

          // Make the fetch call with timeout
          const response = await Promise.race([
            fetch(url, fetchConfig),
            timeoutPromise,
          ]);

          console.log(
            `[UMIG API] Response status: ${response.status} for ${context}`,
          );

          // Handle non-OK responses
          if (!response.ok) {
            const errorMessage = `HTTP ${response.status}: ${response.statusText}`;

            // Try to get error details from response body
            let errorDetails = errorMessage;
            try {
              const errorBody = await response.text();
              if (errorBody) {
                try {
                  const errorJson = JSON.parse(errorBody);
                  errorDetails =
                    errorJson.message || errorJson.error || errorMessage;
                } catch (parseError) {
                  errorDetails = errorBody.substring(0, 200); // Limit error message length
                }
              }
            } catch (bodyError) {
              console.warn(
                `[UMIG API] Could not read error response body:`,
                bodyError,
              );
            }

            throw new Error(errorDetails);
          }

          // Parse response
          const responseData = await response.json();

          // Log successful API call
          if (window.SecurityUtils) {
            window.SecurityUtils.logSecurityEvent("api_call_completed", {
              method: method,
              endpoint: endpoint,
              context: context,
              responseSize: JSON.stringify(responseData).length,
              attempt: attempt + 1,
            });
          }

          console.log(`[UMIG API] Success: ${context}`);

          // Call success callback if provided
          if (onSuccess) {
            onSuccess(responseData);
          }

          return responseData;
        } catch (error) {
          lastError = error;
          console.error(
            `[UMIG API] Attempt ${attempt + 1} failed for ${context}:`,
            error.message,
          );

          // Don't retry on certain error types
          if (
            error.message.includes("400") ||
            error.message.includes("401") ||
            error.message.includes("403") ||
            error.message.includes("404")
          ) {
            break; // Don't retry client errors
          }

          // If this was the last attempt, break out of retry loop
          if (attempt === retries) {
            break;
          }
        }
      }

      // If we get here, all attempts failed
      throw lastError;
    } catch (error) {
      console.error(`[UMIG API] Final error for ${context}:`, error);

      // Log security event for API failure
      if (window.SecurityUtils) {
        window.SecurityUtils.logSecurityEvent("api_call_failed", {
          method: method,
          endpoint: endpoint,
          context: context,
          errorMessage: error.message || "Unknown error",
          errorType: error.name || "Unknown",
        });
      }

      // Call error callback if provided
      if (onError) {
        onError(error);
      } else {
        // Default error handling - show user-friendly message
        this.showError(`${context} failed: ${this.getApiErrorMessage(error)}`);
      }

      throw error; // Re-throw for caller to handle if needed
    }
  },

  // Get user-friendly API error messages
  getApiErrorMessage: function (error) {
    const message = error.message || "Unknown error";

    if (message.includes("400")) {
      return "Invalid request. Please check your input.";
    } else if (message.includes("401")) {
      return "Authentication required. Please log in again.";
    } else if (message.includes("403")) {
      return "You do not have permission to perform this action.";
    } else if (message.includes("404")) {
      return "The requested resource was not found.";
    } else if (message.includes("500")) {
      return "Server error. Please try again later.";
    } else if (message.includes("timeout")) {
      return "Request timed out. Please check your connection and try again.";
    } else {
      return message.length > 100 ? message.substring(0, 100) + "..." : message;
    }
  },

  // Centralized UI utility to eliminate DOM manipulation duplication
  uiUtils: {
    // Ensure DOM element has required methods for batch.js compatibility
    ensureDOMCompatibility: function (element) {
      if (
        element &&
        !element.getElementsByClassName &&
        element.nodeType === Node.ELEMENT_NODE
      ) {
        element.getElementsByClassName = function (className) {
          return this.querySelectorAll("." + className);
        };
      }
      return element;
    },

    // Safely get element by ID with error handling
    getElement: function (id, required = false) {
      try {
        const element = document.getElementById(id);
        if (required && !element) {
          console.error(`[UMIG UI] Required element not found: ${id}`);
          throw new Error(`Required UI element not found: ${id}`);
        }
        return element;
      } catch (error) {
        console.error(`[UMIG UI] Error getting element ${id}:`, error);
        if (required) throw error;
        return null;
      }
    },

    // Safely set content with security validation
    setContent: function (elementId, content, isHTML = false) {
      try {
        const element = this.getElement(elementId);
        if (!element) return false;

        if (isHTML) {
          // Use SecurityUtils for safe HTML setting
          if (window.SecurityUtils) {
            window.SecurityUtils.safeSetInnerHTML(element, content);
          } else {
            element.innerHTML = content;
          }
        } else {
          // Use textContent for text
          element.textContent = content;
        }
        return true;
      } catch (error) {
        console.error(
          `[UMIG UI] Error setting content for ${elementId}:`,
          error,
        );
        return false;
      }
    },

    // Show/hide elements with animation support
    setVisibility: function (elementId, visible, animated = false) {
      try {
        const element = this.getElement(elementId);
        if (!element) return false;

        if (animated) {
          if (visible) {
            element.style.display = "block";
            element.style.opacity = "0";
            setTimeout(() => {
              element.style.transition = "opacity 0.3s ease";
              element.style.opacity = "1";
            }, 10);
          } else {
            element.style.transition = "opacity 0.3s ease";
            element.style.opacity = "0";
            setTimeout(() => {
              element.style.display = "none";
            }, 300);
          }
        } else {
          element.style.display = visible ? "block" : "none";
        }
        return true;
      } catch (error) {
        console.error(
          `[UMIG UI] Error setting visibility for ${elementId}:`,
          error,
        );
        return false;
      }
    },

    // Create modal with standard structure and security
    createModal: function (id, title, content, options = {}) {
      try {
        const {
          closable = true,
          size = "medium",
          className = "",
          onClose = null,
        } = options;

        // Remove existing modal if it exists
        this.removeElement(id);

        const sizeClass =
          {
            small: "modal-small",
            medium: "modal-medium",
            large: "modal-large",
            xlarge: "modal-xlarge",
          }[size] || "modal-medium";

        const modalHTML = `
            <div id="${id}" class="aui-dialog2 aui-dialog2-${size} ${className}"
                 style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(0,0,0,0.5); z-index: 3000;">
              <div class="aui-dialog2-content ${sizeClass}"
                   style="margin: 5% auto; background: white; border-radius: 4px;
                          max-height: 90vh; overflow-y: auto;">
                <header class="aui-dialog2-header">
                  <h2 class="aui-dialog2-header-main">${title}</h2>
                  ${
                    closable
                      ? `<a class="aui-dialog2-header-close" data-modal-id="${id}">
                    <span class="aui-icon aui-icon-small aui-iconfont-close-dialog">Close</span>
                  </a>`
                      : ""
                  }
                </header>
                <div class="aui-dialog2-content-body">
                  ${content}
                </div>
              </div>
            </div>`;

        // Create modal element with batch.js compatibility
        const modalElement = document.createElement("div");
        modalElement.innerHTML = modalHTML;
        const modalNode = modalElement.firstElementChild;

        // Ensure DOM compatibility for batch.js MutationObserver
        if (modalNode && !modalNode.getElementsByClassName) {
          modalNode.getElementsByClassName = function (className) {
            return this.querySelectorAll("." + className);
          };
        }

        document.body.appendChild(modalNode);

        // Add close event listeners if closable
        if (closable) {
          const closeBtn = document.querySelector(`[data-modal-id="${id}"]`);
          const modal = this.getElement(id);

          const closeHandler = () => {
            this.setVisibility(id, false, true);
            setTimeout(() => this.removeElement(id), 300);
            if (onClose) onClose();
          };

          if (closeBtn) {
            closeBtn.addEventListener("click", closeHandler);
          }

          if (modal) {
            modal.addEventListener("click", (e) => {
              if (e.target === modal) closeHandler();
            });

            // ESC key handler
            const escHandler = (e) => {
              if (e.key === "Escape") {
                closeHandler();
                document.removeEventListener("keydown", escHandler);
              }
            };
            document.addEventListener("keydown", escHandler);
          }
        }

        return this.getElement(id);
      } catch (error) {
        console.error(`[UMIG UI] Error creating modal ${id}:`, error);
        return null;
      }
    },

    // Remove element safely
    removeElement: function (elementId) {
      try {
        const element = this.getElement(elementId);
        if (element && element.parentNode) {
          element.parentNode.removeChild(element);
          return true;
        }
        return false;
      } catch (error) {
        console.error(`[UMIG UI] Error removing element ${elementId}:`, error);
        return false;
      }
    },

    // Show notification messages
    showNotification: function (message, type = "info", duration = 5000) {
      try {
        const types = {
          success: "aui-message-success",
          error: "aui-message-error",
          warning: "aui-message-warning",
          info: "aui-message-info",
        };

        const className = types[type] || types.info;
        const notificationId = `notification-${Date.now()}`;

        const notificationHTML = `
            <div id="${notificationId}" class="aui-message ${className}"
                 style="position: fixed; top: 20px; right: 20px; z-index: 4000;
                        max-width: 400px; margin-bottom: 10px;">
              <p>${message}</p>
              <span class="aui-icon icon-close" onclick="document.getElementById('${notificationId}').remove()"></span>
            </div>`;

        const notificationElement = document.createElement("div");
        notificationElement.innerHTML = notificationHTML;
        const notificationNode = notificationElement.firstElementChild;

        // Ensure DOM compatibility for batch.js MutationObserver
        if (notificationNode && !notificationNode.getElementsByClassName) {
          notificationNode.getElementsByClassName = function (className) {
            return this.querySelectorAll("." + className);
          };
        }

        document.body.appendChild(notificationNode);

        // Auto-remove after duration
        if (duration > 0) {
          setTimeout(() => {
            this.removeElement(notificationId);
          }, duration);
        }

        return notificationId;
      } catch (error) {
        console.error(`[UMIG UI] Error showing notification:`, error);
        return null;
      }
    },

    // Create loading spinner
    showLoadingSpinner: function (containerId = null, message = "Loading...") {
      try {
        const spinnerId = containerId
          ? `${containerId}-spinner`
          : "global-spinner";
        const container = containerId
          ? this.getElement(containerId)
          : document.body;

        if (!container) return null;

        const spinnerHTML = `
            <div id="${spinnerId}" class="loading-spinner"
                 style="position: ${containerId ? "absolute" : "fixed"};
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: rgba(255,255,255,0.8);
                        display: flex; align-items: center; justify-content: center;
                        z-index: 1000;">
              <div style="text-align: center;">
                <div class="aui-icon aui-icon-wait" style="margin-bottom: 10px;"></div>
                <div>${message}</div>
              </div>
            </div>`;

        if (containerId) {
          container.style.position = "relative";
          container.insertAdjacentHTML("beforeend", spinnerHTML);
        } else {
          const spinnerElement = document.createElement("div");
          spinnerElement.innerHTML = spinnerHTML;
          const spinnerNode = spinnerElement.firstElementChild;

          // Ensure DOM compatibility for batch.js MutationObserver
          if (spinnerNode && !spinnerNode.getElementsByClassName) {
            spinnerNode.getElementsByClassName = function (className) {
              return this.querySelectorAll("." + className);
            };
          }

          container.appendChild(spinnerNode);
        }

        return this.getElement(spinnerId);
      } catch (error) {
        console.error(`[UMIG UI] Error showing loading spinner:`, error);
        return null;
      }
    },

    // Hide loading spinner
    hideLoadingSpinner: function (containerId = null) {
      try {
        const spinnerId = containerId
          ? `${containerId}-spinner`
          : "global-spinner";
        return this.removeElement(spinnerId);
      } catch (error) {
        console.error(`[UMIG UI] Error hiding loading spinner:`, error);
        return false;
      }
    },
  },

  // Initialize the application
  init: function () {
    try {
      console.log("UMIG Admin GUI initializing...");

      // Log security event for audit trail
      if (isSecurityUtilsAvailable("logSecurityEvent")) {
        window.SecurityUtils.logSecurityEvent("admin_gui_init_started");
      }

      // Defensive checks for required modules
      const requiredModules = {
        EntityConfig: window.EntityConfig,
        UiUtils: window.UiUtils,
        AdminGuiState: window.AdminGuiState,
      };

      // Check for SecurityUtils availability
      const securityUtilsAvailable = isSecurityUtilsAvailable();
      if (!securityUtilsAvailable) {
        console.warn(
          "[AdminGUI] SecurityUtils not fully available - some security features may be limited",
        );
      }

      const missingModules = [];
      for (const [name, module] of Object.entries(requiredModules)) {
        if (!module) {
          missingModules.push(name);
        }
      }

      if (missingModules.length > 0) {
        console.warn(
          "[UMIG] Missing required modules:",
          missingModules.join(", "),
        );
        console.warn("[UMIG] Retrying initialization in 500ms...");

        // Log security event for missing modules
        if (window.SecurityUtils) {
          window.SecurityUtils.logSecurityEvent("admin_gui_missing_modules", {
            missingModules: missingModules,
            retryScheduled: true,
          });
        }

        setTimeout(() => {
          try {
            this.init();
          } catch (retryError) {
            console.error(
              "[UMIG] Critical initialization failure on retry:",
              retryError,
            );
            this.handleInitializationFailure(retryError, "retry_failed");
          }
        }, 500);
        return;
      }

      console.log("[UMIG] All required modules loaded successfully");

      // Create main UI structure early in initialization
      this.createMainUIStructure();

      // Parse URL parameters for direct entity navigation
      this.parseUrlParameters();

      // Initialize Component Migration Features (US-087)
      this.initializeComponentMigration();

      // Initialize core functionality with error boundaries
      try {
        this.bindEvents();
      } catch (eventError) {
        console.error("[UMIG] Event binding failed:", eventError);
        this.handleInitializationFailure(eventError, "event_binding_failed");
      }

      try {
        this.initializeLogin();
      } catch (loginError) {
        console.error("[UMIG] Login initialization failed:", loginError);
        this.handleInitializationFailure(loginError, "login_init_failed");
      }

      // Log successful initialization
      if (window.SecurityUtils) {
        window.SecurityUtils.logSecurityEvent("admin_gui_init_completed");
      }
      console.log("[UMIG] Admin GUI initialization completed successfully");
    } catch (error) {
      console.error("[UMIG] Critical initialization failure:", error);
      this.handleInitializationFailure(error, "critical_init_failure");
    }
  },

  // Handle initialization failures with recovery strategies
  handleInitializationFailure: function (error, failureType) {
    try {
      // Log security event for critical failure
      if (window.SecurityUtils) {
        window.SecurityUtils.logSecurityEvent("admin_gui_init_failure", {
          failureType: failureType,
          errorMessage: error.message || "Unknown error",
          errorStack: error.stack || "No stack trace available",
          timestamp: new Date().toISOString(),
        });
      }

      // Display user-friendly error message
      const errorMessage = this.getInitializationErrorMessage(failureType);

      // Try to show error in UI if possible
      const contentArea = document.getElementById("content-area");
      if (contentArea) {
        const errorHtml = `
            <div class="aui-message aui-message-error">
              <p class="title">
                <strong>System Initialization Error</strong>
              </p>
              <p>${errorMessage}</p>
              <p>Please refresh the page to try again or contact your system administrator if the problem persists.</p>
            </div>`;

        if (window.SecurityUtils) {
          window.SecurityUtils.safeSetInnerHTML(contentArea, errorHtml);
        } else {
          contentArea.innerHTML = errorHtml;
        }
      } else {
        // Fallback: show alert if no content area available
        alert(
          "System initialization failed: " +
            errorMessage +
            "\n\nPlease refresh the page to try again.",
        );
      }

      // Attempt graceful degradation for non-critical failures
      if (
        failureType === "event_binding_failed" ||
        failureType === "login_init_failed"
      ) {
        console.log("[UMIG] Attempting graceful degradation...");
        this.enableBasicMode();
      }
    } catch (handlerError) {
      console.error("[UMIG] Error handler itself failed:", handlerError);
      // Ultimate fallback
      alert(
        "Critical system error. Please refresh the page and contact support if the issue persists.",
      );
    }
  },

  // Get user-friendly error messages for different failure types
  getInitializationErrorMessage: function (failureType) {
    const messages = {
      critical_init_failure: "The application failed to initialize properly.",
      retry_failed:
        "Required system components could not be loaded after multiple attempts.",
      event_binding_failed: "User interface controls could not be initialized.",
      login_init_failed: "Authentication system could not be initialized.",
    };

    return messages[failureType] || "An unknown initialization error occurred.";
  },

  // Enable basic mode with limited functionality
  enableBasicMode: function () {
    try {
      console.log("[UMIG] Enabling basic mode with limited functionality...");

      // Set basic mode flag
      this.isBasicMode = true;

      // Show basic mode notice
      const contentArea = document.getElementById("content-area");
      if (contentArea) {
        const noticeHtml = `
            <div class="aui-message aui-message-warning">
              <p class="title">
                <strong>Limited Functionality Mode</strong>
              </p>
              <p>The system is running in basic mode due to initialization issues. Some features may not be available.</p>
            </div>`;

        if (window.SecurityUtils) {
          window.SecurityUtils.safeSetInnerHTML(contentArea, noticeHtml);
        } else {
          contentArea.innerHTML = noticeHtml;
        }
      }

      // Log basic mode activation
      if (window.SecurityUtils) {
        window.SecurityUtils.logSecurityEvent("admin_gui_basic_mode_enabled");
      }
    } catch (basicModeError) {
      console.error("[UMIG] Failed to enable basic mode:", basicModeError);
    }
  },

  // Initialize missing modules with fallbacks to prevent loading errors
  initializeMissingModules: function () {
    try {
      // Create fallback for UiUtils if missing
      if (typeof window.UiUtils === "undefined") {
        console.warn("[AdminGUI] UiUtils not loaded, creating fallback");
        window.UiUtils = {
          showNotification: function (message, type) {
            console.log(`[UiUtils Fallback] ${type}: ${message}`);
            // Basic fallback notification
            if (typeof alert !== "undefined") {
              alert(`${type.toUpperCase()}: ${message}`);
            }
          },
          formatDate: function (date) {
            return date ? new Date(date).toLocaleDateString() : "";
          },
          debounce: function (func, wait) {
            let timeout;
            return function executedFunction(...args) {
              const later = () => {
                clearTimeout(timeout);
                func(...args);
              };
              clearTimeout(timeout);
              timeout = setTimeout(later, wait);
            };
          },
        };
      }

      // Create fallback for AdminGuiState if missing
      if (typeof window.AdminGuiState === "undefined") {
        console.warn("[AdminGUI] AdminGuiState not loaded, creating fallback");
        window.AdminGuiState = {
          state: {},
          setState: function (key, value) {
            this.state[key] = value;
            console.log(`[AdminGuiState Fallback] Set ${key}:`, value);
          },
          getState: function (key) {
            return this.state[key];
          },
          clearState: function () {
            this.state = {};
          },
        };
      }

      // Create fallback for FeatureToggle if missing
      if (typeof window.FeatureToggle === "undefined") {
        console.warn("[AdminGUI] FeatureToggle not loaded, creating fallback");
        window.FeatureToggle = {
          _flags: {},
          _overrides: {},
          isEnabled: function (feature) {
            console.log(
              `[FeatureToggle Fallback] Checking feature: ${feature} (returning true)`,
            );
            return this._overrides[feature] !== undefined
              ? this._overrides[feature]
              : this._flags[feature] || true;
          },
          enable: function (feature) {
            console.log(
              `[FeatureToggle Fallback] Enabling feature: ${feature}`,
            );
            this._flags[feature] = true;
          },
          disable: function (feature) {
            console.log(
              `[FeatureToggle Fallback] Disabling feature: ${feature}`,
            );
            this._flags[feature] = false;
          },
          loadOverrides: function () {
            console.log(
              "[FeatureToggle Fallback] loadOverrides() called - no persistent storage",
            );
            try {
              const saved = localStorage.getItem("featureToggleOverrides");
              if (saved) {
                this._overrides = JSON.parse(saved);
                console.log(
                  "[FeatureToggle Fallback] Loaded overrides:",
                  this._overrides,
                );
              }
            } catch (e) {
              console.warn(
                "[FeatureToggle Fallback] Failed to load overrides:",
                e,
              );
              this._overrides = {};
            }
          },
          getAllFlags: function () {
            console.log("[FeatureToggle Fallback] getAllFlags() called");
            return Object.assign({}, this._flags, this._overrides);
          },
          saveOverrides: function () {
            console.log("[FeatureToggle Fallback] saveOverrides() called");
            try {
              localStorage.setItem(
                "featureToggleOverrides",
                JSON.stringify(this._overrides),
              );
            } catch (e) {
              console.warn(
                "[FeatureToggle Fallback] Failed to save overrides:",
                e,
              );
            }
          },
        };
      }

      // Create fallback for PerformanceMonitor if missing
      if (typeof window.PerformanceMonitor === "undefined") {
        console.warn(
          "[AdminGUI] PerformanceMonitor not loaded, creating fallback",
        );
        window.PerformanceMonitor = {
          _baselines: {},
          _metrics: {},
          startTimer: function (name) {
            console.log(
              `[PerformanceMonitor Fallback] Starting timer: ${name}`,
            );
            return { name: name, start: Date.now() };
          },
          endTimer: function (timer) {
            const duration = Date.now() - timer.start;
            console.log(
              `[PerformanceMonitor Fallback] Timer ${timer.name}: ${duration}ms`,
            );
            return duration;
          },
          recordMetric: function (name, value) {
            console.log(
              `[PerformanceMonitor Fallback] Metric ${name}: ${value}`,
            );
            this._metrics[name] = value;
          },
          loadBaselines: function () {
            console.log("[PerformanceMonitor Fallback] loadBaselines() called");
            try {
              const saved = localStorage.getItem("performanceBaselines");
              if (saved) {
                this._baselines = JSON.parse(saved);
                console.log(
                  "[PerformanceMonitor Fallback] Loaded baselines:",
                  this._baselines,
                );
              } else {
                console.log(
                  "[PerformanceMonitor Fallback] No saved baselines found",
                );
              }
            } catch (e) {
              console.warn(
                "[PerformanceMonitor Fallback] Failed to load baselines:",
                e,
              );
              this._baselines = {};
            }
          },
          setBaseline: function (name, value) {
            console.log(
              `[PerformanceMonitor Fallback] Setting baseline ${name}: ${value}`,
            );
            this._baselines[name] = value;
            this.saveBaselines();
          },
          getBaseline: function (name) {
            return this._baselines[name];
          },
          saveBaselines: function () {
            console.log("[PerformanceMonitor Fallback] saveBaselines() called");
            try {
              localStorage.setItem(
                "performanceBaselines",
                JSON.stringify(this._baselines),
              );
            } catch (e) {
              console.warn(
                "[PerformanceMonitor Fallback] Failed to save baselines:",
                e,
              );
            }
          },
          getMetrics: function () {
            return Object.assign({}, this._metrics);
          },
          clearMetrics: function () {
            console.log("[PerformanceMonitor Fallback] clearMetrics() called");
            this._metrics = {};
          },
        };
      }

      console.log("[AdminGUI] Missing module fallbacks initialized");
    } catch (error) {
      console.error("[AdminGUI] Error initializing missing modules:", error);
    }
  },

  // Parse URL parameters for direct entity navigation (US-087 Resilience Feature)
  parseUrlParameters: function () {
    try {
      console.log("[US-087] Checking for URL parameters...");

      // Get URL parameters
      const urlParams = new URLSearchParams(window.location.search);
      const entityParam = urlParams.get("e") || urlParams.get("entity");

      if (entityParam) {
        console.log(
          `[US-087] Direct entity navigation requested: ${entityParam}`,
        );

        // Store the requested entity for navigation after initialization
        this.requestedEntity = entityParam.toLowerCase();

        // Schedule navigation after UI is ready
        setTimeout(() => {
          try {
            console.log(
              `[US-087] Attempting to navigate to entity: ${this.requestedEntity}`,
            );

            // Try to navigate to the entity
            if (this.loadCurrentSection) {
              // Set the current entity
              this.currentEntity = this.requestedEntity;

              // Attempt to load the section
              this.loadCurrentSection();

              console.log(
                `[US-087] Successfully initiated navigation to ${this.requestedEntity}`,
              );

              // Update the menu to show selection if menu is available
              try {
                const menuItems =
                  document.querySelectorAll(".entity-menu-item");
                if (menuItems && menuItems.length > 0) {
                  menuItems.forEach((item) => {
                    // Add null checking for item and its properties
                    if (item && item.dataset && item.classList) {
                      if (item.dataset.entity === this.requestedEntity) {
                        item.classList.add("active");
                      } else {
                        item.classList.remove("active");
                      }
                    }
                  });
                } else {
                  console.debug(
                    "[US-087] No menu items found for selection update",
                  );
                }
              } catch (menuError) {
                console.warn(
                  "[US-087] Could not update menu selection:",
                  menuError,
                );
              }
            } else {
              console.warn(
                "[US-087] loadCurrentSection not available, trying direct navigation...",
              );

              // Fallback: Try to directly show the entity dashboard
              if (this.showDashboard) {
                this.currentEntity = this.requestedEntity;
                this.showDashboard();
              }
            }

            // Show notification if UI utilities are available
            if (window.UiUtils && window.UiUtils.showNotification) {
              window.UiUtils.showNotification(
                `Navigated to ${this.requestedEntity}`,
                "success",
                3000,
              );
            }
          } catch (navError) {
            console.error(
              `[US-087] Failed to navigate to ${this.requestedEntity}:`,
              navError,
            );

            // Show error notification if possible
            if (window.UiUtils && window.UiUtils.showNotification) {
              window.UiUtils.showNotification(
                `Failed to navigate to ${this.requestedEntity}: ${navError.message}`,
                "error",
              );
            }
          }
        }, 1500); // Give time for UI and components to initialize
      } else {
        console.log("[US-087] No entity parameter found in URL");
      }
    } catch (error) {
      console.error("[US-087] Error parsing URL parameters:", error);
    }
  },

  // Initialize Component Migration Features (US-087 Phase 1)
  initializeComponentMigration: function () {
    try {
      console.log("[US-087] Initializing component migration features...");

      // Initialize missing modules with fallbacks
      this.initializeMissingModules();

      // Initialize Feature Toggle with error boundary
      try {
        if (window.FeatureToggle) {
          this.featureToggle = window.FeatureToggle;
          console.log("[US-087] Feature toggle initialized");

          // Load saved feature flags state with error handling
          try {
            this.featureToggle.loadOverrides();
            console.log(
              "[US-087] Feature flags loaded:",
              this.featureToggle.getAllFlags(),
            );
          } catch (flagLoadError) {
            console.error(
              "[US-087] Failed to load feature flags:",
              flagLoadError,
            );
            // Continue with default flags
            console.log("[US-087] Using default feature flags");
          }
        } else {
          console.warn(
            "[US-087] FeatureToggle not available - operating in legacy mode",
          );
        }
      } catch (featureToggleError) {
        console.error(
          "[US-087] Feature toggle initialization failed:",
          featureToggleError,
        );
        this.featureToggle = null; // Fallback to null
      }

      // Initialize Performance Monitor with error boundary
      try {
        if (window.PerformanceMonitor) {
          this.performanceMonitor = window.PerformanceMonitor;
          console.log("[US-087] Performance monitor initialized");

          // Load baselines if they exist with error handling
          try {
            this.performanceMonitor.loadBaselines();
          } catch (baselineLoadError) {
            console.error(
              "[US-087] Failed to load performance baselines:",
              baselineLoadError,
            );
            // Continue without baselines
            console.log(
              "[US-087] Performance monitor running without baselines",
            );
          }
        } else {
          console.warn(
            "[US-087] PerformanceMonitor not available - performance tracking disabled",
          );
        }
      } catch (performanceMonitorError) {
        console.error(
          "[US-087] Performance monitor initialization failed:",
          performanceMonitorError,
        );
        this.performanceMonitor = null; // Fallback to null
      }

      // Conditionally load EntityManagers based on feature flags with error boundary
      try {
        this.loadEntityManagers();
      } catch (entityManagerError) {
        console.error(
          "[US-087] EntityManager loading failed:",
          entityManagerError,
        );
        // Continue with legacy mode
        console.log(
          "[US-087] Falling back to legacy mode due to EntityManager errors",
        );
      }

      console.log(
        "[US-087] Component migration feature initialization completed",
      );
    } catch (error) {
      console.error(
        "[US-087] Critical component migration initialization failure:",
        error,
      );

      // Log security event for component migration failure
      if (window.SecurityUtils) {
        window.SecurityUtils.logSecurityEvent(
          "component_migration_init_failure",
          {
            errorMessage: error.message || "Unknown error",
            errorStack: error.stack || "No stack trace available",
            fallbackMode: "legacy",
          },
        );
      }

      // Ensure fallback state is set
      this.featureToggle = null;
      this.performanceMonitor = null;
      console.log(
        "[US-087] Component migration disabled - running in legacy mode",
      );
    }
  },

  // Load EntityManagers based on feature flags (US-087)
  loadEntityManagers: function () {
    try {
      // Teams EntityManager (Always enabled - independent of feature flags)
      try {
        this.loadTeamsEntityManager();
        console.log("[US-087] Teams EntityManager loaded (always enabled)");
      } catch (teamsError) {
        console.error(
          "[US-087] Failed to load TeamsEntityManager:",
          teamsError,
        );

        // Log security event for EntityManager failure
        if (window.SecurityUtils) {
          window.SecurityUtils.logSecurityEvent(
            "teams_entity_manager_load_failure",
            {
              errorMessage: teamsError.message || "Unknown error",
              errorStack: teamsError.stack || "No stack trace available",
            },
          );
        }

        // Continue with other EntityManagers
        console.log("[US-087] Continuing with other EntityManagers...");
      }

      // Other EntityManagers (US-087 Phase 2 - Enable all base entities)
      // These are now enabled by default to complete the migration
      console.log("[US-087] Loading all base entity EntityManagers...");

      // Ensure SecurityUtils methods are available before loading EntityManagers
      if (window.SecurityUtils) {
        const requiredMethods = [
          "sanitizeInput",
          "sanitizeHtml",
          "addCSRFProtection",
        ];
        const missingMethods = requiredMethods.filter(
          (method) => typeof window.SecurityUtils[method] !== "function",
        );

        if (missingMethods.length > 0) {
          console.error(
            "[US-087] SecurityUtils missing required methods:",
            missingMethods,
          );
          console.log("[US-087] Attempting to restore missing methods...");

          // Try to restore methods from the class
          if (typeof SecurityUtils !== "undefined") {
            missingMethods.forEach((method) => {
              if (typeof SecurityUtils[method] === "function") {
                window.SecurityUtils[method] = SecurityUtils[method];
                console.log(`[US-087] Restored SecurityUtils.${method}`);
              }
            });
          }
        }
      }

      // Load Users EntityManager
      try {
        this.loadUsersEntityManager();
        console.log("[US-087] Users EntityManager loaded");
      } catch (error) {
        console.error("[US-087] Failed to load UsersEntityManager:", error);
      }

      // Load Environments EntityManager
      try {
        this.loadEnvironmentsEntityManager();
        console.log("[US-087] Environments EntityManager loaded");
      } catch (error) {
        console.error(
          "[US-087] Failed to load EnvironmentsEntityManager:",
          error,
        );
      }

      // Load Applications EntityManager
      try {
        this.loadApplicationsEntityManager();
        console.log("[US-087] Applications EntityManager loaded");
      } catch (error) {
        console.error(
          "[US-087] Failed to load ApplicationsEntityManager:",
          error,
        );
      }

      // Load Labels EntityManager
      try {
        this.loadLabelsEntityManager();
        console.log("[US-087] Labels EntityManager loaded");
      } catch (error) {
        console.error("[US-087] Failed to load LabelsEntityManager:", error);
      }

      // Load MigrationTypes EntityManager
      try {
        this.loadMigrationTypesEntityManager();
        console.log("[US-087] MigrationTypes EntityManager loaded");
      } catch (error) {
        console.error(
          "[US-087] Failed to load MigrationTypesEntityManager:",
          error,
        );
      }

      // Load IterationTypes EntityManager
      try {
        this.loadIterationTypesEntityManager();
        console.log("[US-087] IterationTypes EntityManager loaded");
      } catch (error) {
        console.error(
          "[US-087] Failed to load IterationTypesEntityManager:",
          error,
        );
      }

      // Load US-088 Phase 2 Components
      // DatabaseVersionManager
      try {
        this.loadDatabaseVersionManagerEntityManager();
        console.log("[US-088] DatabaseVersionManager loaded");
      } catch (error) {
        console.error("[US-088] Failed to load DatabaseVersionManager:", error);
      }

      // ComponentVersionTracker
      try {
        this.loadComponentVersionTrackerEntityManager();
        console.log("[US-088] ComponentVersionTracker loaded");
      } catch (error) {
        console.error(
          "[US-088] Failed to load ComponentVersionTracker:",
          error,
        );
      }

      console.log("[US-087] EntityManager loading completed");
    } catch (error) {
      console.error("[US-087] Critical EntityManager loading failure:", error);

      // Log security event for critical EntityManager failure
      if (window.SecurityUtils) {
        window.SecurityUtils.logSecurityEvent("entity_managers_load_failure", {
          errorMessage: error.message || "Unknown error",
          errorStack: error.stack || "No stack trace available",
        });
      }

      // Continue with legacy mode
      console.log(
        "[US-087] EntityManager loading failed - continuing in legacy mode",
      );
    }
  },

  // Load TeamsEntityManager (US-087 Phase 1)
  loadTeamsEntityManager: function () {
    console.log("[US-087] Checking for TeamsEntityManager class...", {
      hasClass: Boolean(window.TeamsEntityManager),
      hasBaseEntityManager: Boolean(window.BaseEntityManager),
      componentManagers: this.componentManagers,
    });

    if (!window.TeamsEntityManager) {
      console.warn("[US-087] TeamsEntityManager not available");
      return;
    }

    console.log("[US-087] Loading TeamsEntityManager...");

    try {
      // Create instance with performance tracking
      const startTime = performance.now();

      console.log("[US-087] Creating TeamsEntityManager instance...");
      this.componentManagers.teams = new window.TeamsEntityManager({
        // Don't set container here - it will be set during initialize()
        apiBase: this.api.baseUrl,
        endpoints: {
          teams: this.api.endpoints.teams,
          teamMembers: "/teamMembers",
        },
        orchestrator: window.ComponentOrchestrator,
        performanceMonitor: this.performanceMonitor,
      });

      console.log("[US-087] TeamsEntityManager instance created:", {
        instance: this.componentManagers.teams,
        hasInitialize:
          typeof this.componentManagers.teams?.initialize === "function",
        hasMount: typeof this.componentManagers.teams?.mount === "function",
        hasRender: typeof this.componentManagers.teams?.render === "function",
      });

      const loadTime = performance.now() - startTime;
      console.log(
        `[US-087] TeamsEntityManager loaded in ${loadTime.toFixed(2)}ms`,
      );

      // Record performance metric
      if (this.performanceMonitor) {
        this.performanceMonitor.setBaseline("teamsComponentLoad", loadTime);
      }
    } catch (error) {
      console.error("[US-087] Failed to load TeamsEntityManager:", error);
      // Note: TeamsEntityManager failure is now a critical error since it's always expected to load
      throw error; // Re-throw to ensure caller handles the error appropriately
    }
  },

  // Load UsersEntityManager (US-087 Phase 2)
  loadUsersEntityManager: function () {
    console.log("[US-087] Loading UsersEntityManager...");

    // Enhanced debugging for module loading issues
    console.log("[US-087] Pre-load state check:", {
      hasUsersEntityManager: Boolean(window.UsersEntityManager),
      hasBaseEntityManager: Boolean(window.BaseEntityManager),
      hasSecurityUtils: Boolean(window.SecurityUtils),
      hasSecurityUtilsMethods: {
        sanitizeInput: Boolean(
          window.SecurityUtils &&
            typeof window.SecurityUtils.sanitizeInput === "function",
        ),
        sanitizeHtml: Boolean(
          window.SecurityUtils &&
            typeof window.SecurityUtils.sanitizeHtml === "function",
        ),
        addCSRFProtection: Boolean(
          window.SecurityUtils &&
            typeof window.SecurityUtils.addCSRFProtection === "function",
        ),
      },
    });

    if (!window.UsersEntityManager) {
      console.error(
        "[US-087] UsersEntityManager class not available - module loading failed",
      );
      return;
    }

    if (!window.BaseEntityManager) {
      console.error("[US-087] BaseEntityManager dependency not available");
      return;
    }

    if (!window.SecurityUtils) {
      console.error("[US-087] SecurityUtils dependency not available");
      return;
    }

    try {
      const startTime = performance.now();

      this.componentManagers.users = new window.UsersEntityManager({
        apiBase: this.api.baseUrl,
        endpoints: {
          users: this.api.endpoints.users,
        },
        orchestrator: window.ComponentOrchestrator,
        performanceMonitor: this.performanceMonitor,
      });

      // Verify the manager was created successfully
      if (!this.componentManagers.users) {
        throw new Error("UsersEntityManager instance creation failed");
      }

      console.log("[US-087] UsersEntityManager instance verification:", {
        instance: Boolean(this.componentManagers.users),
        hasInitialize:
          typeof this.componentManagers.users?.initialize === "function",
        hasMount: typeof this.componentManagers.users?.mount === "function",
        hasRender: typeof this.componentManagers.users?.render === "function",
        entityType: this.componentManagers.users?.entityType,
      });

      const loadTime = performance.now() - startTime;
      console.log(
        `[US-087] UsersEntityManager loaded successfully in ${loadTime.toFixed(2)}ms`,
      );
    } catch (error) {
      console.error("[US-087] Failed to load UsersEntityManager:", error);
      console.error("[US-087] Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name,
      });
      // Don't rethrow - continue with other managers
    }
  },

  // Load EnvironmentsEntityManager (US-087 Phase 2)
  loadEnvironmentsEntityManager: function () {
    console.log("[US-087] Loading EnvironmentsEntityManager...");

    if (!window.EnvironmentsEntityManager) {
      console.warn("[US-087] EnvironmentsEntityManager not available");
      return;
    }

    try {
      const startTime = performance.now();

      this.componentManagers.environments =
        new window.EnvironmentsEntityManager({
          apiBase: this.api.baseUrl,
          endpoints: {
            environments: this.api.endpoints.environments,
          },
          orchestrator: window.ComponentOrchestrator,
          performanceMonitor: this.performanceMonitor,
        });

      const loadTime = performance.now() - startTime;
      console.log(
        `[US-087] EnvironmentsEntityManager loaded in ${loadTime.toFixed(2)}ms`,
      );
    } catch (error) {
      console.error(
        "[US-087] Failed to load EnvironmentsEntityManager:",
        error,
      );
      throw error;
    }
  },

  // Load ApplicationsEntityManager (US-087 Phase 2)
  loadApplicationsEntityManager: function () {
    console.log("[US-087] Loading ApplicationsEntityManager...");

    if (!window.ApplicationsEntityManager) {
      console.warn("[US-087] ApplicationsEntityManager not available");
      return;
    }

    try {
      const startTime = performance.now();

      this.componentManagers.applications =
        new window.ApplicationsEntityManager({
          apiBase: this.api.baseUrl,
          endpoints: {
            applications: this.api.endpoints.applications,
          },
          orchestrator: window.ComponentOrchestrator,
          performanceMonitor: this.performanceMonitor,
        });

      const loadTime = performance.now() - startTime;
      console.log(
        `[US-087] ApplicationsEntityManager loaded in ${loadTime.toFixed(2)}ms`,
      );
    } catch (error) {
      console.error(
        "[US-087] Failed to load ApplicationsEntityManager:",
        error,
      );
      throw error;
    }
  },

  // Load LabelsEntityManager (US-087 Phase 2)
  loadLabelsEntityManager: function () {
    console.log("[US-087] Loading LabelsEntityManager...");

    if (!window.LabelsEntityManager) {
      console.warn("[US-087] LabelsEntityManager not available");
      return;
    }

    try {
      const startTime = performance.now();

      this.componentManagers.labels = new window.LabelsEntityManager({
        apiBase: this.api.baseUrl,
        endpoints: {
          labels: this.api.endpoints.labels,
        },
        orchestrator: window.ComponentOrchestrator,
        performanceMonitor: this.performanceMonitor,
      });

      const loadTime = performance.now() - startTime;
      console.log(
        `[US-087] LabelsEntityManager loaded in ${loadTime.toFixed(2)}ms`,
      );
    } catch (error) {
      console.error("[US-087] Failed to load LabelsEntityManager:", error);
      throw error;
    }
  },

  // Load MigrationTypesEntityManager (US-087 Phase 2)
  loadMigrationTypesEntityManager: function () {
    console.log("[US-087] Loading MigrationTypesEntityManager...");

    if (!window.MigrationTypesEntityManager) {
      console.warn("[US-087] MigrationTypesEntityManager not available");
      return;
    }

    try {
      const startTime = performance.now();

      this.componentManagers.migrationTypes =
        new window.MigrationTypesEntityManager({
          apiBase: this.api.baseUrl,
          endpoints: {
            migrationTypes: this.api.endpoints.migrationTypes,
          },
          orchestrator: window.ComponentOrchestrator,
          performanceMonitor: this.performanceMonitor,
        });

      const loadTime = performance.now() - startTime;
      console.log(
        `[US-087] MigrationTypesEntityManager loaded in ${loadTime.toFixed(2)}ms`,
      );
    } catch (error) {
      console.error(
        "[US-087] Failed to load MigrationTypesEntityManager:",
        error,
      );
      throw error;
    }
  },

  // Load IterationTypesEntityManager (US-087 Phase 2)
  loadIterationTypesEntityManager: function () {
    console.log("[US-087] Loading IterationTypesEntityManager...");

    if (!window.IterationTypesEntityManager) {
      console.warn("[US-087] IterationTypesEntityManager not available");
      return;
    }

    try {
      const startTime = performance.now();

      this.componentManagers.iterationTypes =
        new window.IterationTypesEntityManager({
          apiBase: this.api.baseUrl,
          endpoints: {
            iterationTypes: this.api.endpoints.iterationTypes,
          },
          orchestrator: window.ComponentOrchestrator,
          performanceMonitor: this.performanceMonitor,
        });

      const loadTime = performance.now() - startTime;
      console.log(
        `[US-087] IterationTypesEntityManager loaded in ${loadTime.toFixed(2)}ms`,
      );
    } catch (error) {
      console.error(
        "[US-087] Failed to load IterationTypesEntityManager:",
        error,
      );
      throw error;
    }
  },

  // Load DatabaseVersionManager (US-088 Phase 2)
  loadDatabaseVersionManagerEntityManager: function () {
    console.log("[US-088] Loading DatabaseVersionManager...");

    if (!window.DatabaseVersionManager) {
      console.warn("[US-088] DatabaseVersionManager not available");
      return;
    }

    try {
      const startTime = performance.now();

      this.componentManagers.databaseVersionManager =
        new window.DatabaseVersionManager("mainContent", {
          apiBase: this.api.baseUrl,
          orchestrator: window.ComponentOrchestrator,
          performanceMonitor: this.performanceMonitor,
        });

      const loadTime = performance.now() - startTime;
      console.log(
        `[US-088] DatabaseVersionManager loaded in ${loadTime.toFixed(2)}ms`,
      );
    } catch (error) {
      console.error("[US-088] Failed to load DatabaseVersionManager:", error);
      throw error;
    }
  },

  // Load ComponentVersionTracker (US-088 Phase 2)
  loadComponentVersionTrackerEntityManager: function () {
    console.log("[US-088] Loading ComponentVersionTracker...");

    if (!window.ComponentVersionTracker) {
      console.warn("[US-088] ComponentVersionTracker not available");
      return;
    }

    try {
      const startTime = performance.now();

      this.componentManagers.componentVersionTracker =
        new window.ComponentVersionTracker("mainContent", {
          apiBase: this.api.baseUrl,
          orchestrator: window.ComponentOrchestrator,
          performanceMonitor: this.performanceMonitor,
        });

      const loadTime = performance.now() - startTime;
      console.log(
        `[US-088] ComponentVersionTracker loaded in ${loadTime.toFixed(2)}ms`,
      );
    } catch (error) {
      console.error("[US-088] Failed to load ComponentVersionTracker:", error);
      throw error;
    }
  },

  // Wrapper method for dual-mode operation (US-087)
  // NOTE: Teams entity is handled directly in loadCurrentSection - this method is for other entities only
  shouldUseComponentManager: function (entity) {
    // Teams always use component manager - handled separately
    if (entity === "teams") {
      return false; // This method shouldn't be called for teams anymore
    }

    if (!this.featureToggle) return false;

    // Security: Feature flag permission checks with audit logging
    const migrationEnabled = this.featureToggle.isEnabled(
      "admin-gui-migration",
    );
    if (!migrationEnabled) return false;

    const flagName = `${entity}-component`;
    const componentEnabled = this.featureToggle.isEnabled(flagName);
    const hasManager = Boolean(this.componentManagers[entity]);

    const accessGranted = componentEnabled && hasManager;

    // Security: Audit trail for component access decisions
    if (accessGranted) {
      console.log(
        `[US-087 Security] Component access granted for entity: ${entity}`,
      );
    }

    return accessGranted;
  },

  // Show notification message
  showNotification: function (message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 15px 20px;
                background: ${type === "success" ? "#00875A" : type === "error" ? "#DE350B" : "#0052CC"};
                color: white;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 10000;
                animation: slideIn 0.3s ease-out;
            `;

    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-out";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  },

  // Bind all event listeners
  bindEvents: function () {
    // Logout button (for session management only)
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", this.handleLogout.bind(this));
    }

    // Navigation menu
    document.addEventListener("click", (e) => {
      const navItem = e.target.closest(".nav-item");
      if (navItem) {
        e.preventDefault();
        this.handleNavigation(navItem);
      }
    });

    // Search functionality
    const searchInput = document.getElementById("globalSearch");
    if (searchInput) {
      let searchTimeout;
      searchInput.addEventListener("input", (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
          this.handleSearch(e.target.value);
        }, 300);
      });
    }

    // Page size selector
    const pageSizeSelect = document.getElementById("pageSize");
    if (pageSizeSelect) {
      pageSizeSelect.addEventListener("change", (e) => {
        this.state.pageSize = parseInt(e.target.value);
        this.state.currentPage = 1;
        this.loadCurrentSection();
      });
    }

    // Pagination buttons
    document.addEventListener("click", (e) => {
      if (e.target.matches(".pagination-btn")) {
        this.handlePagination(e.target);
      }
    });

    // Add new button - delegate to modern entity managers for supported entities
    const addNewBtn = document.getElementById("addNewBtn");
    if (addNewBtn) {
      addNewBtn.addEventListener("click", () => {
        const currentSection = this.state?.currentSection || "unknown";

        // For Users entity, delegate to UsersEntityManager (US-087 Phase 2)
        if (currentSection === "users") {
          const usersManager = this.componentManagers?.users;

          if (usersManager && typeof usersManager.handleAdd === "function") {
            console.log(
              "[AdminGUI] Delegating Add New User to UsersEntityManager",
            );
            usersManager.handleAdd();
            return;
          } else {
            console.warn(
              "[AdminGUI] UsersEntityManager not available, falling back to legacy modal",
            );
          }
        }

        // For Teams entity, delegate to TeamsEntityManager (US-087 Phase 1)
        if (currentSection === "teams") {
          const teamsManager = this.componentManagers?.teams;

          if (teamsManager && typeof teamsManager.handleAdd === "function") {
            console.log(
              "[AdminGUI] Delegating Add New Team to TeamsEntityManager",
            );
            teamsManager.handleAdd();
            return;
          } else {
            console.warn(
              "[AdminGUI] TeamsEntityManager not available, falling back to legacy modal",
            );
          }
        }

        // Fallback to legacy modal for non-migrated entities
        this.showEditModal(null);
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById("refreshBtn");
    if (refreshBtn) {
      refreshBtn.addEventListener("click", () => {
        this.refreshCurrentSection();
      });
    }

    // Modal events
    this.bindModalEvents();

    // Table events
    this.bindTableEvents();
  },

  // Initialize loading screen and automatic RBAC-based authentication (TD-007)
  initializeLogin: function () {
    // Show loading screen immediately
    this.showLoadingScreen();

    // UAT DEBUGGING: Add explicit diagnostic API call
    this.runDiagnosticCheck();

    // Attempt automatic authentication
    this.automaticAuthentication()
      .then((user) => {
        if (user) {
          // Successfully authenticated
          this.state.isAuthenticated = true;
          this.state.currentUser = user;
          this.state.authTimestamp = new Date().toISOString();

          // Log successful authentication
          window.SecurityUtils?.logSecurityEvent("automatic_auth_success", {
            username: user.username,
            role: user.role,
            isAdmin: user.isAdmin,
          });

          console.log("[UMIG] Automatic authentication successful:", {
            username: user.username,
            role: user.role,
            permissions: user.permissions,
          });

          // Hide loading screen and show dashboard
          this.hideLoadingScreen();
          this.showDashboard();
          this.loadCurrentSection();
        } else {
          // Authentication failed - hide loading and show error
          this.hideLoadingScreen();
          this.handleAuthenticationFailure();
        }
      })
      .catch((error) => {
        console.error("[UMIG] Automatic authentication failed:", error);
        this.hideLoadingScreen();
        this.handleAuthenticationFailure(error);
      });
  },

  // UAT DEBUGGING: Explicit diagnostic check
  runDiagnosticCheck: function () {
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );
    console.log("🔍 UMIG UAT AUTHENTICATION DIAGNOSTICS");
    console.log(
      "═══════════════════════════════════════════════════════════════",
    );

    // Check 1: Confluence context from macro
    console.log("1️⃣ Confluence Context (from macro):");
    console.log(
      "   Username:",
      window.UMIG_CONFIG?.confluence?.username || "❌ NOT AVAILABLE",
    );
    console.log(
      "   Full Name:",
      window.UMIG_CONFIG?.confluence?.fullName || "❌ NOT AVAILABLE",
    );
    console.log(
      "   Email:",
      window.UMIG_CONFIG?.confluence?.email || "❌ NOT AVAILABLE",
    );

    // Check 2: API base URL
    console.log("\n2️⃣ API Configuration:");
    console.log("   Base URL:", this.api.baseUrl);
    console.log("   Full endpoint:", `${this.api.baseUrl}/users/current`);

    // Check 3: Make diagnostic API call
    console.log("\n3️⃣ Testing API call to /users/current...");
    fetch(`${this.api.baseUrl}/users/current`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
    })
      .then((response) => {
        console.log(
          "   API Response Status:",
          response.status,
          response.statusText,
        );
        if (!response.ok) {
          console.error("   ❌ API call failed");
          return response.text().then((text) => {
            console.error("   Error body:", text);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          });
        }
        return response.json();
      })
      .then((data) => {
        console.log("   ✅ API call succeeded");
        console.log("   Response data:", data);
        console.log("\n4️⃣ Database User Data:");
        console.log("   usr_code (username):", data.username || "❌ NOT FOUND");
        console.log(
          "   usr_confluence_user_id:",
          data.confluenceUserId || "❌ NOT FOUND",
        );
        console.log(
          "   Confluence Context Username:",
          data.confluenceContextUsername || "❌ NOT FOUND",
        );
        console.log("   role:", data.role || "❌ NOT FOUND");
        console.log("   isAdmin:", data.isAdmin || false);

        console.log("\n5️⃣ Identity Matching Analysis:");
        const confluenceCtxFromMacro =
          window.UMIG_CONFIG?.confluence?.username || "";
        const dbUsrCode = data.username || "";
        const dbConfluenceId = data.confluenceUserId || "";
        const confluenceCtxFromApi = data.confluenceContextUsername || "";

        console.log(
          "   Confluence Context (from macro):          ",
          confluenceCtxFromMacro,
        );
        console.log("   DB usr_code:                              ", dbUsrCode);
        console.log(
          "   DB usr_confluence_user_id:                ",
          dbConfluenceId,
        );
        console.log(
          "   Confluence Context Username (from API):   ",
          confluenceCtxFromApi,
        );

        const allMatch =
          confluenceCtxFromMacro.toLowerCase() === dbUsrCode.toLowerCase() &&
          confluenceCtxFromMacro.toLowerCase() ===
            dbConfluenceId.toLowerCase() &&
          confluenceCtxFromMacro.toLowerCase() ===
            confluenceCtxFromApi.toLowerCase();

        if (allMatch) {
          console.log("   ✅ ALL IDENTIFIERS MATCH");
        } else {
          console.error("   ❌ MISMATCH DETECTED:");
          if (
            confluenceCtxFromMacro.toLowerCase() !== dbUsrCode.toLowerCase()
          ) {
            console.error("      - Confluence Context (macro) ≠ DB usr_code");
            console.error(
              `        '${confluenceCtxFromMacro}' !== '${dbUsrCode}'`,
            );
          }
          if (
            confluenceCtxFromMacro.toLowerCase() !==
            dbConfluenceId.toLowerCase()
          ) {
            console.error(
              "      - Confluence Context (macro) ≠ DB usr_confluence_user_id",
            );
            console.error(
              `        '${confluenceCtxFromMacro}' !== '${dbConfluenceId}'`,
            );
          }
          if (
            confluenceCtxFromMacro.toLowerCase() !==
            confluenceCtxFromApi.toLowerCase()
          ) {
            console.error(
              "      - Confluence Context (macro) ≠ Confluence Context (API)",
            );
            console.error(
              `        '${confluenceCtxFromMacro}' !== '${confluenceCtxFromApi}'`,
            );
          }
          if (dbUsrCode.toLowerCase() !== dbConfluenceId.toLowerCase()) {
            console.error("      - DB usr_code ≠ DB usr_confluence_user_id");
            console.error(`        '${dbUsrCode}' !== '${dbConfluenceId}'`);
          }
        }
        console.log(
          "═══════════════════════════════════════════════════════════════\n",
        );
      })
      .catch((error) => {
        console.error("   ❌ Diagnostic API call failed:", error);
        console.log(
          "═══════════════════════════════════════════════════════════════\n",
        );
      });
  },

  // Automatic authentication using /users/current API (TD-007)
  // REFACTORED: Added fallback strategy for debugging when primary endpoint fails
  automaticAuthentication: function () {
    return new Promise((resolve, reject) => {
      // SECURITY: Use session-based authentication ONLY
      // Query parameter fallback removed to prevent authentication bypass vulnerability
      const url = `${this.api.baseUrl}/users/current`;

      console.log("[UMIG] Authenticating via session (no query parameters)");

      fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include", // Include session cookies for authentication
      })
        .then((response) => {
          if (!response.ok) {
            // Parse error response body for structured error information
            return response
              .json()
              .then((errorBody) => {
                console.error("[UMIG] API call failed");
                console.error(
                  "   Status:",
                  response.status,
                  response.statusText,
                );
                console.error("   Error body:", errorBody);

                let errorMessage = "";

                // Handle different error scenarios based on status code AND errorCode
                if (response.status === 401) {
                  // SCENARIO 2: Authentication failed (no valid session)
                  errorMessage = `Authentication Failed: ${errorBody.message || "Session invalid"}`;
                  if (
                    errorBody.troubleshooting &&
                    errorBody.troubleshooting.length > 0
                  ) {
                    errorMessage += `\n\nTroubleshooting:\n${errorBody.troubleshooting.join("\n")}`;
                  }
                } else if (response.status === 403) {
                  // SCENARIO 1, 3, 4: Access denied (not registered, deactivated, or insufficient privileges)
                  if (errorBody.errorCode === "USER_NOT_REGISTERED") {
                    errorMessage = `User Not Registered: ${errorBody.message}`;
                    errorMessage += `\n\nRequired Action: ${errorBody.details?.requiredAction}`;
                    if (
                      errorBody.troubleshooting &&
                      errorBody.troubleshooting.length > 0
                    ) {
                      errorMessage += `\n\nTroubleshooting:\n${errorBody.troubleshooting.slice(0, 2).join("\n")}`;
                    }
                  } else if (errorBody.errorCode === "USER_DEACTIVATED") {
                    errorMessage = `Account Deactivated: ${errorBody.message}`;
                    errorMessage += `\n\nRequired Action: ${errorBody.details?.requiredAction}`;
                  } else if (
                    errorBody.errorCode === "INSUFFICIENT_PRIVILEGES_CROSS_USER"
                  ) {
                    errorMessage = `Insufficient Privileges: ${errorBody.message}`;
                  } else {
                    errorMessage = `Access Denied: ${errorBody.message}`;
                  }
                } else if (response.status === 404) {
                  // True 404 - endpoint not found
                  errorMessage =
                    "Endpoint not found. Check ScriptRunner endpoint registration.";
                } else {
                  // Other errors
                  errorMessage =
                    errorBody.message ||
                    `HTTP ${response.status}: ${response.statusText}`;
                }

                // UAT DEBUGGING: Try fallback authentication for debugging purposes
                console.warn(
                  "[UMIG] Primary authentication failed, attempting fallback for debugging...",
                );
                return this.fallbackAuthenticationDebug(errorMessage)
                  .then(() => {
                    // Fallback succeeded for debugging, but still reject primary auth
                    throw new Error(errorMessage);
                  })
                  .catch(() => {
                    // Fallback also failed, update debugging panel and throw original error
                    this.updateDebuggingInfo(null, errorMessage);
                    throw new Error(errorMessage);
                  });
              })
              .catch((jsonError) => {
                // Failed to parse JSON error body - use basic error message
                let errorMsg = `HTTP ${response.status}: ${response.statusText}`;
                if (response.status === 401) {
                  errorMsg +=
                    " - Session authentication required. Please ensure you are logged into Confluence.";
                } else if (response.status === 403) {
                  errorMsg += " - Access denied. Contact your administrator.";
                } else if (response.status === 404) {
                  errorMsg +=
                    " - Endpoint not found. Check ScriptRunner endpoint registration.";
                }

                console.warn(
                  "[UMIG] Primary authentication failed, attempting fallback for debugging...",
                );
                return this.fallbackAuthenticationDebug(errorMsg)
                  .then(() => {
                    throw new Error(errorMsg);
                  })
                  .catch(() => {
                    this.updateDebuggingInfo(null, errorMsg);
                    throw new Error(errorMsg);
                  });
              });
          }
          return response.json();
        })
        .then((userData) => {
          // UAT DEBUGGING: Populate debugging panel with all user codes
          this.updateDebuggingInfo(userData, null);

          // Transform API response to internal user format
          const user = this.transformUserData(userData);
          console.log(
            "[UMIG] Authentication successful for user:",
            user.username,
          );
          resolve(user);
        })
        .catch((error) => {
          console.error(
            "[UMIG] Automatic authentication API call failed:",
            error,
          );
          reject(error);
        });
    });
  },

  // UAT DEBUGGING: Fallback authentication for debugging panel population
  // Attempts to fetch user data using alternative endpoint when /users/current fails
  fallbackAuthenticationDebug: function (primaryError) {
    return new Promise((resolve, reject) => {
      // Get Confluence username from macro config
      const confluenceUsername = window.UMIG_CONFIG?.confluence?.username;

      if (!confluenceUsername) {
        console.warn(
          "[UMIG] Fallback failed: No Confluence username available from macro",
        );
        reject(new Error("No Confluence username available"));
        return;
      }

      // Try to fetch user by userCode using /users endpoint
      const fallbackUrl = `${this.api.baseUrl}/users?userCode=${encodeURIComponent(confluenceUsername)}`;

      console.log(`[UMIG] Attempting fallback API call: GET ${fallbackUrl}`);

      fetch(fallbackUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Fallback API failed: HTTP ${response.status}`);
          }
          return response.json();
        })
        .then((usersArray) => {
          // Extract first user from array response
          if (usersArray && usersArray.length > 0) {
            const userData = usersArray[0];
            console.log(
              "[UMIG] Fallback API succeeded, updating debugging panel only",
            );

            // Update debugging panel with fallback data
            this.updateDebuggingInfo(
              userData,
              `${primaryError} (showing fallback data)`,
            );

            resolve(userData);
          } else {
            throw new Error("No user found in fallback API response");
          }
        })
        .catch((error) => {
          console.warn("[UMIG] Fallback authentication debug failed:", error);

          // Still update debugging panel with Confluence context from macro
          this.updateDebuggingInfo(null, primaryError);

          reject(error);
        });
    });
  },

  // Get current Confluence username from AJS context (UAT resilience)
  getConfluenceUsername: function () {
    try {
      let username = null;

      // Method 1: AJS.params.remoteUser (most reliable)
      if (typeof AJS !== "undefined" && AJS.params && AJS.params.remoteUser) {
        username = AJS.params.remoteUser;
      }

      // Method 2: AJS.Meta.get('remote-user') (alternative)
      if (!username && typeof AJS !== "undefined" && AJS.Meta && AJS.Meta.get) {
        const remoteUser = AJS.Meta.get("remote-user");
        if (remoteUser) {
          username = remoteUser;
        }
      }

      // Method 3: Parse from Confluence's user menu (last resort)
      if (!username) {
        const userMenu = document.querySelector(
          "#user-menu-link, .aui-dropdown2-trigger.aui-dropdown2-trigger-arrowless",
        );
        if (userMenu) {
          const menuUsername = userMenu.getAttribute("data-username");
          if (menuUsername) {
            username = menuUsername;
          }
        }
      }

      // SECURITY: Validate extracted username before returning
      if (username && typeof username === "string") {
        username = username.trim();

        // Validate username length (reasonable bounds)
        if (username.length > 0 && username.length <= 255) {
          // Additional validation: Check for suspicious characters
          // Allow alphanumeric, dot, hyphen, underscore (common username patterns)
          // This is defense-in-depth - server-side validation is primary
          const validUsernamePattern = /^[a-zA-Z0-9._@-]+$/;
          if (validUsernamePattern.test(username)) {
            return username;
          } else {
            console.warn(
              "[UMIG] Username contains invalid characters:",
              username,
            );
          }
        } else {
          console.warn("[UMIG] Invalid username length:", username.length);
        }
      }
    } catch (e) {
      console.warn("[UMIG] Could not extract Confluence username:", e);
    }

    return null;
  },

  // Transform user data from API to internal format (TD-007)
  transformUserData: function (userData) {
    // CRITICAL: RBAC Validation - Only PILOT, ADMIN, or SUPERADMIN allowed
    const allowedRoles = ["ADMIN", "PILOT", "SUPERADMIN"];
    const userRole = userData.role;
    const isAdmin = userData.isAdmin;

    // Check if user has sufficient privileges
    if (!allowedRoles.includes(userRole) && !isAdmin) {
      console.warn(
        `[UMIG] Access denied - insufficient privileges. User role: ${userRole}, isAdmin: ${isAdmin}`,
      );

      // Log security event for unauthorized access attempt
      if (window.SecurityUtils) {
        window.SecurityUtils.logSecurityEvent("unauthorized_access_attempt", {
          username: userData.username,
          role: userRole,
          isAdmin: isAdmin,
          reason: "insufficient_privileges",
        });
      }

      // Throw error to trigger authentication failure
      throw new Error(
        `Access denied: Insufficient privileges. Required roles: ${allowedRoles.join(", ")}. Your role: ${userRole}`,
      );
    }

    // Map roles to permissions based on existing logic
    let permissions = [];
    let role;

    if (userData.role === "ADMIN" || userData.isAdmin) {
      // Admin/superadmin gets all permissions
      role = "superadmin";
      permissions = [
        "users",
        "teams",
        "environments",
        "applications",
        "labels",
        "migrations",
        "plans",
        "iterations",
      ];
    } else if (userData.role === "PILOT") {
      // Pilot gets limited permissions
      role = "pilot";
      permissions = ["iterations", "sequences", "phases", "steps"];
    } else {
      // This should never happen due to validation above, but defensive programming
      role = "user";
      permissions = [];
    }

    return {
      trigram: userData.username,
      username: userData.username,
      name: `${userData.firstName} ${userData.lastName}`,
      firstName: userData.firstName,
      lastName: userData.lastName,
      email: userData.email,
      role: role,
      isAdmin: userData.isAdmin,
      roleId: userData.roleId,
      permissions: permissions,
      source: "automatic_auth",
    };
  },

  // UAT DEBUGGING: Update debugging panel with user identity information
  // REFACTORED: Graceful degradation with fallback data sources
  updateDebuggingInfo: function (userData, errorMsg) {
    try {
      // DEBUG: Log what we received
      console.log("[UMIG] updateDebuggingInfo called with:", {
        userData: userData,
        errorMsg: errorMsg,
        hasUsername: !!(userData && userData.username),
        hasConfluenceUserId: !!(userData && userData.confluenceUserId),
      });

      // Update database user code (from users_usr.usr_code via API response field: username)
      const dbUserCodeEl = document.getElementById("debugDbUserCode");
      if (dbUserCodeEl) {
        if (userData && userData.username) {
          dbUserCodeEl.textContent = userData.username;
          dbUserCodeEl.style.color = "#006644"; // Green for success
        } else if (errorMsg) {
          dbUserCodeEl.textContent = `API FAILED: ${errorMsg}`;
          dbUserCodeEl.style.color = "#de350b"; // Red for error
          dbUserCodeEl.title =
            "Check ScriptRunner endpoint registration for /users/current";
        } else {
          dbUserCodeEl.textContent = "NOT FOUND";
          dbUserCodeEl.style.color = "#ff8b00"; // Orange for warning
        }
      }

      // Update database Confluence user ID (from users_usr.usr_confluence_user_id via API response field: confluenceUserId)
      const dbConfluenceUserIdEl = document.getElementById(
        "debugDbConfluenceUserId",
      );
      if (dbConfluenceUserIdEl) {
        if (userData && userData.confluenceUserId) {
          dbConfluenceUserIdEl.textContent = userData.confluenceUserId;
          dbConfluenceUserIdEl.style.color = "#006644"; // Green for success
        } else if (errorMsg) {
          dbConfluenceUserIdEl.textContent = `API FAILED: ${errorMsg}`;
          dbConfluenceUserIdEl.style.color = "#de350b"; // Red for error
          dbConfluenceUserIdEl.title =
            "Check ScriptRunner endpoint registration for /users/current";
        } else {
          dbConfluenceUserIdEl.textContent = "NOT FOUND";
          dbConfluenceUserIdEl.style.color = "#ff8b00"; // Orange for warning
        }
      }

      // Log debugging information to console for additional diagnostics
      console.log("[UMIG] Debugging Info Updated:", {
        dbUserCode: userData?.username || "N/A",
        dbConfluenceUserId: userData?.confluenceUserId || "N/A",
        hasError: !!errorMsg,
        error: errorMsg || null,
      });
    } catch (e) {
      console.error("[UMIG] Failed to update debugging info:", e);
    }
  },

  // Handle authentication failure fallback (TD-007)
  handleAuthenticationFailure: function (error = null) {
    let errorMessage;

    // Check if this is a user not registered error (HTTP 403 from API)
    if (
      error &&
      error.message &&
      (error.message.includes("User Not Registered") ||
        error.message.includes("HTTP 403") ||
        error.message.includes("Access denied"))
    ) {
      // First check if it's the insufficient privileges error (more specific)
      if (error.message.includes("Insufficient privileges")) {
        errorMessage = `
          <div style="text-align: center; padding: 50px; max-width: 600px; margin: 0 auto;">
            <div style="background: #ffebe6; border: 1px solid #de350b; border-radius: 8px; padding: 30px; margin-top: 20px;">
              <h2 style="color: #de350b; margin-top: 0;">🚫 Access Denied</h2>
              <p style="font-size: 16px; margin-bottom: 20px;">
                <strong>Insufficient Privileges</strong>
              </p>
              <p style="margin-bottom: 20px;">
                This UMIG Administration Console is restricted to authorized personnel only.
              </p>
              <p style="margin-bottom: 20px;">
                <strong>Required Roles:</strong> PILOT, ADMIN, or SUPERADMIN
              </p>
              <p style="margin-bottom: 30px;">
                If you believe you should have access, please contact your system administrator.
              </p>
              <button onclick="location.reload()" style="background: #0052cc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                Retry Authentication
              </button>
            </div>
          </div>
        `;
      } else {
        // User authenticated in Confluence but not registered in UMIG database (HTTP 403 but not insufficient privileges)
        errorMessage = `
          <div style="text-align: center; padding: 50px; max-width: 600px; margin: 0 auto;">
            <div style="background: #ffebe6; border: 1px solid #de350b; border-radius: 8px; padding: 30px; margin-top: 20px;">
              <h2 style="color: #de350b; margin-top: 0;">🚫 Access Denied</h2>
              <p style="margin-bottom: 20px;">
                Unable to authenticate automatically. Please ensure you are logged into Confluence.
              </p>
              <p style="margin-bottom: 20px;">
                If you are logged in, then your username appears as <strong>NOT declared in the UMIG application</strong>.
              </p>
              <p style="margin-bottom: 20px;">
                This UMIG Administration Console is restricted to authorized personnel only.
              </p>
              <p style="margin-bottom: 20px;">
                <strong>Required Roles:</strong> PILOT, ADMIN, or SUPERADMIN
              </p>
              <p style="margin-bottom: 30px;">
                If you believe you should have access, please contact the system administrator.
              </p>
              <button onclick="location.reload()" style="background: #0052cc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                Retry Authentication
              </button>
            </div>
          </div>
        `;
      }
    } else {
      // General authentication failure
      errorMessage = `
          <div style="text-align: center; padding: 50px; max-width: 600px; margin: 0 auto;">
            <div style="background: #f4f5f7; border: 1px solid #dfe1e6; border-radius: 8px; padding: 30px; margin-top: 20px;">
              <h2 style="color: #42526e; margin-top: 0;">🔐 Authentication Required</h2>
              <p style="margin-bottom: 20px;">
                Unable to authenticate automatically. Please ensure you are logged into Confluence.
              </p>
              <p style="margin-bottom: 30px;">
                If you continue to experience issues, please contact your system administrator.
              </p>
              <button onclick="location.reload()" style="background: #0052cc; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
                Retry Authentication
              </button>
            </div>
          </div>
        `;
    }

    document.getElementById("dashboardPage").innerHTML = errorMessage;
    document.getElementById("dashboardPage").style.display = "flex";

    // Hide any login page elements that might exist (defensive)
    const loginPage = document.getElementById("loginPage");
    if (loginPage) {
      loginPage.style.display = "none";
    }

    // Log security event with proper classification
    const eventType =
      error && error.message && error.message.includes("Access denied")
        ? "access_denied_insufficient_privileges"
        : "automatic_auth_failed";

    window.SecurityUtils?.logSecurityEvent(eventType, {
      timestamp: new Date().toISOString(),
      fallback: "error_display",
      errorMessage: error ? error.message : "Authentication failed",
    });
  },

  // Legacy handleLogin method - NO LONGER USED
  // Login functionality has been replaced with automatic authentication via Confluence context
  // This method is preserved for compatibility but should not be called
  handleLogin: function (e) {
    e.preventDefault();
    console.warn(
      "[UMIG] handleLogin called but login form is deprecated. Authentication is now automatic.",
    );

    // Log deprecation warning
    window.SecurityUtils?.logSecurityEvent("deprecated_login_attempt", {
      message:
        "Manual login attempted but automatic authentication is now enforced",
      timestamp: new Date().toISOString(),
    });

    // Redirect to automatic authentication flow
    this.initializeLogin();
    return;

    // *** DEPRECATED CODE BELOW - KEPT FOR REFERENCE ***
    // Get elements using direct selectors to avoid MutationObserver conflicts
    const userCodeInput = document.getElementById("userCode");
    const loginBtn = document.querySelector("button.login-btn");
    const btnText = loginBtn ? loginBtn.querySelector(".btn-text") : null;
    const btnLoading = loginBtn ? loginBtn.querySelector(".btn-loading") : null;
    const errorDiv = document.getElementById("loginError");

    if (!userCodeInput || !loginBtn || !btnText || !btnLoading) {
      console.error("[UMIG] Login form elements not found");
      window.SecurityUtils?.logSecurityEvent("login_elements_missing");
      return;
    }

    const userCode = userCodeInput.value.trim().toUpperCase();

    // Enhanced validation
    if (!userCode) {
      this.showLoginError("Please enter your user code");
      return;
    }

    if (userCode.length !== 3) {
      this.showLoginError("User code must be exactly 3 characters");
      return;
    }

    // Security validation
    if (isSecurityUtilsAvailable("validateInput")) {
      const validation = window.SecurityUtils.validateInput(
        userCode,
        "userCode",
      );
      if (!validation.isValid) {
        this.showLoginError("User code can only contain letters and numbers");
        if (isSecurityUtilsAvailable("logSecurityEvent")) {
          window.SecurityUtils.logSecurityEvent("login_invalid_format", {
            userCode,
          });
        }
        return;
      }
    }

    // Use setTimeout to avoid conflicts with Confluence's MutationObserver
    const timeoutId = setTimeout(() => {
      try {
        // Show loading state
        loginBtn.disabled = true;
        btnText.style.display = "none";
        btnLoading.style.display = "inline";
        if (errorDiv) {
          errorDiv.style.display = "none";
        }

        // Log authentication attempt
        window.SecurityUtils?.logSecurityEvent("login_attempt", {
          userCode: userCode,
          timestamp: new Date().toISOString(),
        });

        // Enhanced authentication with proper error handling
        this.authenticateUser(userCode)
          .then((user) => {
            console.log("[UMIG] User authenticated:", {
              trigram: user.trigram,
              role: user.role,
              permissions: user.permissions.length,
            });

            // Validate user is active
            if (user.active === false) {
              throw new Error(
                "User account is inactive. Please contact your administrator.",
              );
            }

            // Set authentication state with enhanced user context
            this.state.currentUser = {
              ...user,
              username: user.username || user.name || user.userId || "unknown", // Ensure username is available for TeamsEntityManager
            };
            this.state.isAuthenticated = true;
            this.state.authTimestamp = new Date().toISOString();

            // Clear form
            userCodeInput.value = "";

            // Show main interface
            this.showDashboard();

            // Log successful authentication
            window.SecurityUtils?.logSecurityEvent("login_success", {
              userCode: user.trigram,
              role: user.role,
            });
          })
          .catch((error) => {
            console.error("[UMIG] Authentication failed:", error);

            // Show user-friendly error message
            let errorMessage = "Authentication failed";
            if (
              error.message.includes("rate limit") ||
              error.message.includes("too many")
            ) {
              errorMessage =
                "Too many login attempts. Please wait before trying again.";
            } else if (
              error.message.includes("Security token") ||
              error.message.includes("CSRF")
            ) {
              errorMessage =
                "Security token expired. Please refresh the page and try again.";
            } else if (
              error.message.includes("service unavailable") ||
              error.message.includes("API")
            ) {
              errorMessage =
                "Authentication service is currently unavailable. Please try again later.";
            } else if (error.message.includes("inactive")) {
              errorMessage = error.message; // Use the specific inactive message
            } else {
              errorMessage =
                "Invalid user code. Please check your credentials.";
            }

            this.showLoginError(errorMessage);

            // Log authentication failure
            window.SecurityUtils?.logSecurityEvent("login_failed", {
              userCode: userCode,
              error: error.message,
            });
          })
          .finally(() => {
            // Use another timeout to avoid MutationObserver conflicts
            setTimeout(() => {
              loginBtn.disabled = false;
              btnText.style.display = "inline";
              btnLoading.style.display = "none";
            }, 50);
          });
      } catch (error) {
        console.error("[UMIG] Login handling error:", error);
        this.showLoginError("Login system error. Please try again.");
        window.SecurityUtils?.logSecurityEvent("login_error", {
          error: error.message,
        });
      }
    }, 10); // Small delay to avoid MutationObserver conflicts

    this.activeTimeouts.add(timeoutId);
  },

  // Authenticate user (mock implementation)
  authenticateUser: function (userCode) {
    return new Promise((resolve, _reject) => {
      // Mock user authentication - accepts any 3-character trigram
      // In real implementation, this would call the Users API

      // Determine role based on trigram pattern (for demo purposes)
      let role, name, permissions;

      if (userCode.startsWith("A") || userCode === "ADM") {
        // Admin-like trigrams get superadmin role
        role = "superadmin";
        name = `${userCode} (Super Admin)`;
        permissions = [
          "users",
          "teams",
          "environments",
          "applications",
          "labels",
          "migrations",
          "plans",
          "iterations",
          "databaseVersionManager",
          "componentVersionTracker",
        ];
      } else if (userCode.startsWith("M") || userCode === "MGR") {
        // Manager-like trigrams get admin role
        role = "admin";
        name = `${userCode} (Admin)`;
        permissions = ["migrations", "plans", "iterations", "sequences"];
      } else {
        // All other trigrams get pilot role
        role = "pilot";
        name = `${userCode} (Pilot)`;
        permissions = ["iterations", "sequences", "phases", "steps"];
      }

      const user = {
        trigram: userCode,
        role: role,
        name: name,
        permissions: permissions,
      };

      // Always resolve with a user (mock accepts any 3-char trigram)
      resolve(user);
    });
  },

  // Show login error
  // Legacy showLoginError method - NO LONGER USED
  // Login error display has been replaced with automatic authentication
  showLoginError: function (message) {
    console.warn(
      "[UMIG] showLoginError called but login forms are deprecated:",
      message,
    );

    // Log deprecation warning instead of showing login error
    window.SecurityUtils?.logSecurityEvent("deprecated_login_error", {
      message: message,
      timestamp: new Date().toISOString(),
    });

    // For any critical errors, show as a general toast notification instead
    this.showMessage("Authentication Error: " + message, "error");
  },

  // Show main dashboard
  showDashboard: function () {
    // Use setTimeout to avoid conflicts with Confluence's MutationObserver
    const timeoutId = setTimeout(() => {
      const loginPage = document.getElementById("loginPage");
      const dashboardPage = document.getElementById("dashboardPage");

      if (loginPage) {
        loginPage.style.display = "none";
      }
      if (dashboardPage) {
        dashboardPage.style.display = "flex";
      }

      // ALWAYS setup UI and menu, even if components fail
      try {
        this.setupUserInterface();
      } catch (error) {
        console.error("[US-087] Failed to setup user interface:", error);
        // Continue anyway - menu is more important than user info
      }

      try {
        this.setupMenuVisibility();
      } catch (error) {
        console.error("[US-087] Failed to setup menu visibility:", error);
        // Continue anyway - at least try to show something
      }

      // Set appropriate default section based on user role and URL parameters
      try {
        this.setDefaultSection();
      } catch (error) {
        console.error("[US-087] Failed to set default section:", error);
        // Continue with existing currentSection
      }

      // Load content section - this may fail but menu should already be visible
      try {
        this.loadCurrentSection();
      } catch (error) {
        console.error("[US-087] Failed to load current section:", error);
        // Show error in content area but keep menu visible
        const contentArea = document.getElementById("content");
        if (contentArea) {
          contentArea.innerHTML =
            '<div class="aui-message aui-message-error">Failed to load content. Please select an item from the menu.</div>';
        }
      }
    }, 10);

    this.activeTimeouts.add(timeoutId);
  },

  // Load Welcome Component for welcome section
  loadWelcomeComponent: function () {
    console.log("[UMIG] Loading WelcomeComponent...");

    try {
      // Clean up any existing welcome component before creating a new one
      if (this.currentWelcomeComponent) {
        console.log("[UMIG] Destroying existing WelcomeComponent");
        if (typeof this.currentWelcomeComponent.destroy === "function") {
          this.currentWelcomeComponent.destroy();
        }
        this.currentWelcomeComponent = null;
      }

      // Update the header for Welcome section - no buttons needed
      const contentTitle = document.getElementById("contentTitle");
      const contentDescription = document.getElementById("contentDescription");
      const refreshBtn = document.getElementById("refreshBtn");
      const addNewBtn = document.getElementById("addNewBtn");

      if (contentTitle) {
        contentTitle.textContent = "Welcome";
      }
      if (contentDescription) {
        contentDescription.textContent = "UMIG Administration Dashboard";
      }
      // Hide the action buttons for welcome section
      if (refreshBtn) {
        refreshBtn.style.display = "none";
      }
      if (addNewBtn) {
        addNewBtn.style.display = "none";
      }

      // Get the main content container
      const contentArea =
        document.getElementById("mainContent") ||
        document.getElementById("content");
      if (!contentArea) {
        console.error("[UMIG] Content area not found for WelcomeComponent");
        return;
      }

      // Clear existing content
      contentArea.innerHTML =
        '<div id="welcomeContainer" class="umig-welcome-container-root"></div>';

      // Check if WelcomeComponent is available
      if (typeof window.UmigWelcomeComponent === "undefined") {
        console.error("[UMIG] UmigWelcomeComponent not available");
        contentArea.innerHTML = `
          <div class="aui-message aui-message-error">
            <p>Welcome component not loaded. Please refresh the page.</p>
            <p><button class="aui-button" onclick="location.reload()">Refresh Page</button></p>
          </div>
        `;
        return;
      }

      // Create and initialize WelcomeComponent
      this.currentWelcomeComponent = new window.UmigWelcomeComponent(
        "welcomeContainer",
        {
          debug: true,
          showSystemOverview: true,
          showQuickActions: true,
          showNavigationGuide: true,
        },
      );

      // Initialize and render the component following BaseComponent lifecycle
      try {
        this.currentWelcomeComponent.initialize();
        this.currentWelcomeComponent.render();
        console.log("[UMIG] WelcomeComponent loaded successfully");
      } catch (error) {
        console.error("[UMIG] WelcomeComponent error:", error);
        contentArea.innerHTML = `
          <div class="aui-message aui-message-error">
            <p>Error loading welcome component: ${error.message}</p>
            <p><button class="aui-button" onclick="AdminGUI.loadWelcomeComponent()">Try Again</button></p>
          </div>
        `;
      }
    } catch (error) {
      console.error("[UMIG] Failed to load WelcomeComponent:", error);
      const contentArea =
        document.getElementById("mainContent") ||
        document.getElementById("content");
      if (contentArea) {
        contentArea.innerHTML = `
          <div class="aui-message aui-message-error">
            <p>Failed to load welcome interface: ${error.message}</p>
            <p><button class="aui-button" onclick="location.reload()">Refresh Page</button></p>
          </div>
        `;
      }
    }
  },

  // Add required CSS styles
  addRequiredCSS: function () {
    if (document.getElementById("adminGuiStyles")) {
      return; // Already added
    }

    const css = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }

        /* Responsive Modal Styling - Modern UMIG Implementation */
        .umig-modal-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }

        .umig-modal-content {
          background: white;
          border-radius: 3px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          /* Responsive width with maximum constraint */
          width: 90%;
          max-width: 800px;
          max-height: 90vh;
          margin: 20px;
        }

        /* Legacy Modal Overlay Support - Updated for Responsive Design */
        .modal-overlay {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          align-items: center;
          justify-content: center;
        }

        /* Modal Size Classes with Responsive Constraints */
        .modal {
          background: white;
          border-radius: 3px;
          overflow: hidden;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          margin: 20px;
          max-height: 90vh;
          overflow-y: auto;
        }

        .modal-small {
          width: 90%;
          max-width: 400px;
        }

        .modal-medium,
        .modal:not(.modal-small):not(.modal-large) {
          width: 90%;
          max-width: 600px;
        }

        .modal-large {
          width: 90%;
          max-width: 800px;
        }

        /* Responsive breakpoints for all modal types */
        @media (min-width: 768px) {
          .umig-modal-content {
            width: 80%;
            margin: 40px;
          }
          .modal-small {
            width: 60%;
            max-width: 400px;
          }
          .modal-medium,
          .modal:not(.modal-small):not(.modal-large) {
            width: 70%;
            max-width: 600px;
          }
          .modal-large {
            width: 80%;
            max-width: 800px;
          }
        }

        @media (min-width: 1024px) {
          .umig-modal-content {
            width: 70%;
            max-width: 800px;
          }
          .modal-small {
            width: 40%;
            max-width: 400px;
          }
          .modal-medium,
          .modal:not(.modal-small):not(.modal-large) {
            width: 60%;
            max-width: 600px;
          }
          .modal-large {
            width: 70%;
            max-width: 800px;
          }
        }

        @media (min-width: 1200px) {
          .umig-modal-content {
            width: 60%;
            max-width: 800px;
          }
          .modal-small {
            width: 30%;
            max-width: 400px;
          }
          .modal-medium,
          .modal:not(.modal-small):not(.modal-large) {
            width: 50%;
            max-width: 600px;
          }
          .modal-large {
            width: 60%;
            max-width: 800px;
          }
        }

        /* Mobile specific adjustments for all modals */
        @media (max-width: 480px) {
          .umig-modal-content,
          .modal-small,
          .modal-medium,
          .modal-large,
          .modal {
            width: 95%;
            margin: 10px;
            max-height: 95vh;
          }
        }

        /* Modal content styling improvements */
        .modal-header {
          padding: 15px 20px;
          border-bottom: 1px solid #ddd;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-title {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-footer {
          padding: 15px 20px;
          border-top: 1px solid #ddd;
          display: flex;
          justify-content: flex-end;
          gap: 10px;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 0;
          width: 24px;
          height: 24px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .modal-close:hover {
          background-color: #f5f5f5;
          border-radius: 3px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 1px solid #ccc;
        }
        .table-container {
          margin-top: 20px;
        }
        .aui-nav {
          list-style: none;
          padding: 0;
        }
        .aui-nav li {
          margin-bottom: 5px;
        }
        .aui-nav a {
          display: block;
          padding: 8px 12px;
          text-decoration: none;
          color: #333;
          border-radius: 3px;
        }
        .aui-nav a:hover {
          background-color: #e8e8e8;
        }
      `;

    const style = document.createElement("style");
    style.id = "adminGuiStyles";
    style.textContent = css;
    document.head.appendChild(style);
  },

  // Create the main UI structure if it doesn't exist
  createMainUIStructure: function () {
    try {
      console.log("[AdminGUI] Creating main UI structure...");

      // Check if structure already exists
      if (document.getElementById("dashboardPage")) {
        console.log("[AdminGUI] Main UI structure already exists");
        return;
      }

      // Create the main HTML structure
      const mainHTML = `
          <div id="loginPage" style="display: none;">
            <div class="aui-message aui-message-info">
              <p>Authenticating...</p>
            </div>
          </div>

          <div id="dashboardPage" style="display: none;">
            <div class="aui-header" style="padding: 10px; border-bottom: 1px solid #ccc;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <h1>UMIG Admin Interface</h1>
                <div>
                  <span id="userName">Welcome, User</span> |
                  <span id="userRole">USER</span>
                </div>
              </div>
            </div>

            <div style="display: flex; height: calc(100vh - 60px);">
              <div id="sidebar" style="width: 250px; background: #f5f5f5; border-right: 1px solid #ccc; padding: 20px;">
                <div id="superadminSection" style="display: none;">
                  <h3>Super Admin</h3>
                  <ul class="aui-nav">
                    <li class="nav-item" data-section="users"><a href="#" onclick="adminGui.navigateToSection('users')">Users</a></li>
                    <li class="nav-item" data-section="teams"><a href="#" onclick="adminGui.navigateToSection('teams')">Teams</a></li>
                    <li class="nav-item" data-section="databaseVersionManager"><a href="#" onclick="adminGui.navigateToSection('databaseVersionManager')">Database Version Manager</a></li>
                    <li class="nav-item" data-section="componentVersionTracker"><a href="#" onclick="adminGui.navigateToSection('componentVersionTracker')">Component Version Tracker</a></li>
                  </ul>
                </div>

                <div id="adminSection" style="display: none;">
                  <h3>Admin</h3>
                  <ul class="aui-nav">
                    <li class="nav-item" data-section="environments"><a href="#" onclick="adminGui.navigateToSection('environments')">Environments</a></li>
                    <li class="nav-item" data-section="applications"><a href="#" onclick="adminGui.navigateToSection('applications')">Applications</a></li>
                    <li class="nav-item" data-section="labels"><a href="#" onclick="adminGui.navigateToSection('labels')">Labels</a></li>
                    <li class="nav-item" data-section="migrationTypes"><a href="#" onclick="adminGui.navigateToSection('migrationTypes')">Migration Types</a></li>
                    <li class="nav-item" data-section="iterationTypes"><a href="#" onclick="adminGui.navigateToSection('iterationTypes')">Iteration Types</a></li>
                  </ul>
                </div>

                <div id="pilotSection" style="display: none;">
                  <h3>Pilot</h3>
                  <ul class="aui-nav">
                    <li class="nav-item" data-section="migrations"><a href="#" onclick="adminGui.navigateToSection('migrations')">Migrations</a></li>
                  </ul>
                </div>
              </div>

              <div id="mainContent" style="flex: 1; padding: 20px; overflow: auto;">
                <div class="aui-message aui-message-info">
                  <p>Select an item from the menu to get started.</p>
                </div>
              </div>
            </div>
          </div>
        `;

      // Add CSS for animations
      this.addRequiredCSS();

      // Create and append the main structure
      const mainContainer = document.createElement("div");
      mainContainer.innerHTML = mainHTML;

      // Ensure DOM compatibility for batch.js MutationObserver
      if (mainContainer && !mainContainer.getElementsByClassName) {
        mainContainer.getElementsByClassName = function (className) {
          return this.querySelectorAll("." + className);
        };
      }

      document.body.appendChild(mainContainer);

      // Create the edit modal structure
      this.createEditModalStructure();

      console.log("[AdminGUI] Main UI structure created successfully");
    } catch (error) {
      console.error("[AdminGUI] Failed to create main UI structure:", error);
      throw error;
    }
  },

  // Create the edit modal structure
  createEditModalStructure: function () {
    try {
      console.log("[AdminGUI] Creating edit modal structure...");

      // Check if modal already exists and is properly structured
      const existingModal = document.getElementById("editModal");
      const existingFormFields = document.getElementById("formFields");

      if (existingModal && existingFormFields) {
        console.log("[AdminGUI] Edit modal already exists with formFields");
        return true;
      }

      // Remove incomplete modal if it exists
      if (existingModal && !existingFormFields) {
        console.warn("[AdminGUI] Removing incomplete modal structure");
        existingModal.remove();
      }

      const modalHTML = `
          <div id="editModal" class="umig-modal-overlay">
            <div class="umig-modal-content aui-dialog2-content">
              <div class="aui-dialog2-header">
                <h2 id="modalTitle" class="aui-dialog2-header-main">Edit Record</h2>
                <a class="aui-dialog2-header-close" onclick="adminGui.hideEditModal()">
                  <span class="aui-icon aui-icon-small aui-iconfont-cross-small">Close</span>
                </a>
              </div>

              <div class="aui-dialog2-content-body" style="max-height: 400px; overflow-y: auto; padding: 20px;">
                <form id="editForm" class="aui">
                  <div id="formFields">
                    <!-- Form fields will be dynamically generated here -->
                  </div>
                </form>
              </div>

              <div class="aui-dialog2-footer">
                <div class="aui-dialog2-footer-actions">
                  <button id="saveBtn" class="aui-button aui-button-primary" onclick="adminGui.saveRecord()">Save</button>
                  <button id="deleteBtn" class="aui-button" onclick="adminGui.deleteRecord()" style="display: none;">Delete</button>
                  <button class="aui-button aui-button-link" onclick="adminGui.hideEditModal()">Cancel</button>
                </div>
              </div>
            </div>
          </div>
        `;

      // Create and append the modal
      const modalContainer = document.createElement("div");
      modalContainer.innerHTML = modalHTML;
      const modalElement = modalContainer.firstElementChild;

      // Ensure DOM compatibility for batch.js MutationObserver
      if (modalElement && !modalElement.getElementsByClassName) {
        modalElement.getElementsByClassName = function (className) {
          return this.querySelectorAll("." + className);
        };
      }

      document.body.appendChild(modalElement);

      // Force DOM processing with immediate verification
      const verifyModal = document.getElementById("editModal");
      const verifyFormFields = document.getElementById("formFields");

      if (!verifyModal || !verifyFormFields) {
        console.error(
          "[AdminGUI] Failed to create modal structure - elements not found after creation",
        );
        // Clean up failed attempt
        if (verifyModal) verifyModal.remove();
        return false;
      }

      console.log(
        "[AdminGUI] Edit modal structure created and verified successfully",
      );
      return true;
    } catch (error) {
      console.error("[AdminGUI] Failed to create edit modal structure:", error);
      throw error;
    }
  },

  // Setup user interface with current user info
  setupUserInterface: function () {
    try {
      // Ensure UI structure exists first
      this.createMainUIStructure();

      const user = this.state.currentUser || { name: "User", role: "user" };

      const userNameEl = document.getElementById("userName");
      if (userNameEl) {
        userNameEl.textContent = `Welcome, ${user.name}`;
      }

      const userRoleEl = document.getElementById("userRole");
      if (userRoleEl) {
        userRoleEl.textContent = user.role.toUpperCase();
      }
    } catch (error) {
      console.warn("[US-087] Could not setup user interface:", error);
      // Non-critical - continue
    }
  },

  // Navigation function for menu links
  navigateToSection: function (sectionName) {
    try {
      console.log(`[AdminGUI] Navigating to section: ${sectionName}`);
      this.state.currentSection = sectionName;
      this.state.currentEntity = sectionName;
      this.state.currentPage = 1; // Reset pagination
      this.state.searchTerm = ""; // Reset search
      this.loadCurrentSection();
    } catch (error) {
      console.error(
        `[AdminGUI] Failed to navigate to section ${sectionName}:`,
        error,
      );
      this.showError(`Failed to load ${sectionName}: ${error.message}`);
    }
  },

  // Setup menu visibility based on user role
  setupMenuVisibility: function () {
    const role = this.state.currentUser.role;

    const superadminSection = document.getElementById("superadminSection");
    const adminSection = document.getElementById("adminSection");
    const pilotSection = document.getElementById("pilotSection");

    // Defensive programming: check if elements exist before accessing style
    if (!superadminSection || !adminSection || !pilotSection) {
      console.warn(
        "[setupMenuVisibility] Some menu sections not found in DOM:",
        {
          superadminSection: !!superadminSection,
          adminSection: !!adminSection,
          pilotSection: !!pilotSection,
        },
      );
      return; // Exit early if critical elements are missing
    }

    // Hide all sections first
    superadminSection.style.display = "none";
    adminSection.style.display = "none";
    pilotSection.style.display = "none";

    // Show sections based on role
    if (role === "superadmin") {
      superadminSection.style.display = "block";
      adminSection.style.display = "block";
      pilotSection.style.display = "block";
    } else if (role === "admin") {
      adminSection.style.display = "block";
      pilotSection.style.display = "block";
    } else if (role === "pilot") {
      pilotSection.style.display = "block";
    }
  },

  // Set appropriate default section based on user role and URL parameters
  setDefaultSection: function () {
    const urlParams = new URLSearchParams(window.location.search);
    const entityParam = urlParams.get("e"); // ?e=section parameter

    let defaultSection;
    let defaultEntity;

    // Check if URL parameter overrides default
    if (entityParam) {
      console.log(`[UMIG] URL parameter override: ?e=${entityParam}`);
      defaultSection = entityParam;
      defaultEntity = entityParam;
    } else {
      // Always default to welcome section for all users
      defaultSection = "welcome";
      defaultEntity = "welcome";
      const role = this.state.currentUser?.role || "user";
      console.log(`[UMIG] Default: Welcome dashboard for ${role} user`);
    }

    // Update state
    this.state.currentSection = defaultSection;
    this.state.currentEntity = defaultEntity;

    // Update active menu item
    this.updateActiveMenuItems(defaultSection);

    console.log(
      `[UMIG] Default section set: ${defaultSection} (entity: ${defaultEntity})`,
    );
  },

  // Update active menu items based on current section
  updateActiveMenuItems: function (activeSection) {
    try {
      // Remove active class from all nav items
      const allNavItems = document.querySelectorAll(".nav-item");
      allNavItems.forEach((item) => item.classList.remove("active"));

      // Add active class to current section
      const activeNavItem = document.querySelector(
        `[data-section="${activeSection}"]`,
      );
      if (activeNavItem) {
        activeNavItem.classList.add("active");
        console.log(`[UMIG] Active menu item set: ${activeSection}`);
      } else {
        // Only warn for non-welcome sections (welcome is the default landing page without nav item)
        if (activeSection !== "welcome") {
          console.warn(
            `[UMIG] No nav item found for section: ${activeSection}`,
          );
        }
      }
    } catch (error) {
      console.error("[UMIG] Failed to update active menu items:", error);
    }
  },

  // Handle navigation menu clicks
  handleNavigation: function (navItem) {
    // Use setTimeout to avoid conflicts with Confluence's MutationObserver
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      try {
        // Get section and entity from data attributes first (before DOM manipulation)
        const section = navItem ? navItem.getAttribute("data-section") : null;
        const entity = navItem
          ? navItem.getAttribute("data-entity") || section
          : null;

        if (!section) {
          console.error(
            "[UMIG] Navigation item missing data-section attribute",
          );
          return;
        }

        // Remove active class from all nav items with null checks
        const navItems = document.querySelectorAll(".nav-item");
        if (navItems) {
          navItems.forEach((item) => {
            if (item && item.classList && item.nodeType === Node.ELEMENT_NODE) {
              item.classList.remove("active");
            }
          });
        }

        // Add active class to clicked item with null checks
        if (navItem && navItem.classList) {
          navItem.classList.add("active");
        }

        // Update state
        this.state.currentSection = section;
        this.state.currentEntity = entity;
        this.state.currentPage = 1;
        this.state.selectedRows.clear();

        // Reset filters when switching sections
        this.state.teamFilter = null;

        // Update UI components
        this.updateContentHeader();
        this.loadCurrentSection();
      } catch (error) {
        console.error("[UMIG] Navigation handling error:", error);
      }
    }, 10);

    this.activeTimeouts.add(timeoutId);
  },

  // Update content header based on current section
  updateContentHeader: function () {
    // Use setTimeout to avoid conflicts with Confluence's MutationObserver
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      try {
        const entity = this.getEntity(this.state.currentEntity);
        if (entity) {
          const contentTitle = document.getElementById("contentTitle");
          const contentDescription =
            document.getElementById("contentDescription");
          const addNewBtn = document.getElementById("addNewBtn");
          const refreshBtn = document.getElementById("refreshBtn");

          if (contentTitle) {
            contentTitle.textContent = `${entity.name} Management`;
          }

          if (contentDescription) {
            contentDescription.textContent = entity.description;
          }

          // US-087: Component-based entities manage their own toolbars
          // Hide top-level refresh button for entities that have toolbar refresh buttons
          const componentBasedEntities = [
            "teams",
            "users",
            "environments",
            "applications",
            "labels",
            "migrationTypes",
            "iterationTypes",
            "databaseVersionManager",
            "componentVersionTracker",
          ];

          if (refreshBtn) {
            if (componentBasedEntities.includes(this.state.currentEntity)) {
              // Hide top refresh for component-based entities (they have their own toolbar refresh)
              refreshBtn.style.display = "none";
            } else {
              // Show for legacy entities that don't have their own toolbar
              refreshBtn.style.display = "inline-block";
            }
          }

          if (addNewBtn) {
            if (componentBasedEntities.includes(this.state.currentEntity)) {
              // Hide legacy button for component-based entities to prevent conflicts
              addNewBtn.style.display = "none";
              console.log(
                `[US-087] Hidden legacy addNewBtn for component-based entity: ${this.state.currentEntity}`,
              );
            } else {
              // Show legacy button for non-migrated entities
              addNewBtn.style.display = "inline-block";

              // Secure alternative to innerHTML - use safe HTML setting
              if (
                window.SecurityUtils &&
                typeof window.SecurityUtils.safeSetInnerHTML === "function"
              ) {
                const entityName = entity.name.slice(0, -1);
                const safeHTML = `<span class="btn-icon">➕</span> Add New ${entityName}`;
                window.SecurityUtils.safeSetInnerHTML(addNewBtn, safeHTML, {
                  allowedTags: ["span"],
                  allowedAttributes: { span: ["class"] },
                });
              } else {
                // Fallback to textContent for safety
                addNewBtn.textContent = `➕ Add New ${entity.name.slice(0, -1)}`;
              }
            }
          }
        }
      } catch (error) {
        console.error("[UMIG] Update content header error:", error);
      }
    }, 10);

    this.activeTimeouts.add(timeoutId);
  },

  // Load data for current section
  async loadCurrentSection() {
    const entity = this.state.currentEntity || this.state.currentSection;
    console.log(
      `[UMIG DEBUG] ====== STARTING loadCurrentSection for entity: ${entity} ======`,
    );

    // Prevent rapid duplicate calls (debouncing)
    if (this.loadingSectionEntity === entity && this.isLoadingSection) {
      console.log(
        `[UMIG DEBUG] Already loading ${entity}, skipping duplicate call`,
      );
      return;
    }

    // Mark as loading
    this.loadingSectionEntity = entity;
    this.isLoadingSection = true;

    // Clean up WelcomeComponent if we're switching away from welcome
    if (this.currentWelcomeComponent && entity !== "welcome") {
      console.log(
        "[UMIG] Cleaning up WelcomeComponent before switching sections",
      );
      if (typeof this.currentWelcomeComponent.destroy === "function") {
        this.currentWelcomeComponent.destroy();
      }
      this.currentWelcomeComponent = null;
    }

    if (!entity || entity === "dashboard") {
      console.log(`[UMIG DEBUG] Showing dashboard for entity: ${entity}`);
      this.showDashboard();
      this.isLoadingSection = false; // Reset loading flag
      return;
    }

    // Handle welcome section with WelcomeComponent
    if (entity === "welcome") {
      console.log(
        `[UMIG DEBUG] Loading Welcome component for entity: ${entity}`,
      );
      this.loadWelcomeComponent();
      this.isLoadingSection = false; // Reset loading flag
      return;
    }

    // US-088 Phase 2: Special handling for build process components
    // These are specialized components, not entity managers
    const specializedComponents = [
      "databaseVersionManager",
      "componentVersionTracker",
    ];

    if (specializedComponents.includes(entity)) {
      console.log(`[US-088] Loading specialized component: ${entity}`);
      await this.loadSpecializedComponent(entity);
      this.isLoadingSection = false; // Reset loading flag
      return;
    }

    // US-087 Phase 2: Direct component architecture for all base entities
    // These entities now always use EntityManagers for component-based rendering
    const componentBasedEntities = [
      "teams",
      "users",
      "environments",
      "applications",
      "labels",
      "migrationTypes",
      "iterationTypes",
    ];

    if (componentBasedEntities.includes(entity)) {
      console.log(`[US-087] Using ${entity} EntityManager (Phase 2 migration)`);

      // Check if the EntityManager was loaded
      if (!this.componentManagers[entity]) {
        console.warn(
          `[US-087] ${entity} EntityManager not loaded, attempting to load...`,
        );

        // Try to load the EntityManager dynamically
        const loadMethodName = `load${entity.charAt(0).toUpperCase() + entity.slice(1)}EntityManager`;
        if (typeof this[loadMethodName] === "function") {
          try {
            this[loadMethodName]();
          } catch (error) {
            console.error(
              `[US-087] Failed to dynamically load ${entity} EntityManager:`,
              error,
            );
            const result = await this.loadCurrentSectionLegacy();
            this.isLoadingSection = false; // Reset loading flag
            return result;
          }
        }
      }

      const result = await this.loadWithEntityManager(entity);
      this.isLoadingSection = false; // Reset loading flag after component load
      return result;
    }

    // US-087: Legacy fallback for entities not yet migrated
    // This will be removed once all entities are migrated

    // Defensive access to entities with comprehensive error handling
    let config = null;
    let availableEntities = [];

    try {
      const entities = this.entities;
      if (!entities || typeof entities !== "object") {
        console.error(`[UMIG DEBUG] Entities object is invalid:`, entities);
        this.showError(
          `Configuration Error: Unable to load entity configurations. Please refresh the page.`,
        );
        return;
      }

      // Enhanced debugging for iterationTypes vs migrationTypes
      if (entity === "iterationTypes" || entity === "migrationTypes") {
        console.log(
          `[UMIG DEBUG] 🔍 ENHANCED DEBUGGING FOR ${entity.toUpperCase()}`,
        );
        console.log(`[UMIG DEBUG] entities object type:`, typeof entities);
        console.log(
          `[UMIG DEBUG] entities object keys:`,
          Object.keys(entities),
        );
        console.log(
          `[UMIG DEBUG] Direct access to ${entity}:`,
          entities[entity],
        );
        console.log(`[UMIG DEBUG] Does ${entity} exist?:`, entity in entities);
        console.log(
          `[UMIG DEBUG] EntityConfig proxy working?:`,
          typeof this.entities,
        );

        // Check both entities for comparison
        if (entity === "iterationTypes") {
          console.log(
            `[UMIG DEBUG] 📊 COMPARISON - migrationTypes config:`,
            entities["migrationTypes"],
          );
          console.log(
            `[UMIG DEBUG] 📊 COMPARISON - iterationTypes config:`,
            entities["iterationTypes"],
          );
        }
      }

      config = entities[entity];
      availableEntities = Object.keys(entities);

      if (!config) {
        console.error(`[UMIG DEBUG] ❌ No config found for entity: ${entity}`);
        console.log(
          `[UMIG DEBUG] Available entity configs:`,
          availableEntities,
        );

        // Special iteration types debugging
        if (entity === "iterationTypes") {
          console.error(
            `[UMIG DEBUG] 🚨 CRITICAL: ITERATION TYPES CONFIG MISSING!`,
          );
          console.error(`[UMIG DEBUG] EntityConfig status:`, {
            windowEntityConfig: typeof window.EntityConfig,
            getAllEntitiesMethod: typeof window.EntityConfig?.getAllEntities,
            proxyAccess: typeof this.entities,
            directIteration:
              window.EntityConfig?.getAllEntities()?.iterationTypes,
          });
        }

        this.showError(
          `Unknown entity: ${entity}. Available: ${availableEntities.join(", ")}`,
        );
        return;
      }
    } catch (error) {
      console.error(
        `[UMIG DEBUG] Critical error accessing entity config:`,
        error,
      );
      this.showError(
        `Critical Configuration Error: ${error.message}. Please refresh the page.`,
      );
      return;
    }

    console.log(`[UMIG DEBUG] Found config for ${entity}:`, {
      name: config.name,
      endpoint: config.endpoint,
      hasFields: !!config.fields,
      fieldsCount: config.fields ? config.fields.length : 0,
      hasTableColumns: !!config.tableColumns,
      tableColumnsCount: config.tableColumns ? config.tableColumns.length : 0,
      permissions: config.permissions,
    });

    this.showLoadingSpinner();

    try {
      // Get endpoint from config or use entity name as fallback
      const endpoint =
        this.api.endpoints[entity] || config.endpoint || `/${entity}`;
      console.log(`[UMIG DEBUG] Using endpoint: ${endpoint}`);

      // Build API URL with pagination and search
      const params = new URLSearchParams({
        page: this.state.currentPage,
        size: this.state.pageSize,
      });

      if (this.state.searchTerm) {
        params.append("search", this.state.searchTerm);
      }

      if (this.state.sortField) {
        params.append("sort", this.state.sortField);
        params.append("direction", this.state.sortDirection);
      }
      if (this.state.teamFilter) {
        params.append("teamId", this.state.teamFilter);
      }

      const url = `${this.api.baseUrl}${endpoint}?${params.toString()}`;
      console.log(`[UMIG DEBUG] Making API call to: ${url}`);

      fetch(url, {
        method: "GET",
        credentials: "same-origin",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      })
        .then((response) => {
          console.log(`[UMIG DEBUG] Raw response status: ${response.status}`);
          console.log(`[UMIG DEBUG] Raw response ok: ${response.ok}`);
          console.log(
            `[UMIG DEBUG] Raw response headers:`,
            Array.from(response.headers.entries()),
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then((data) => {
          // Debug logging to understand response structure
          console.log(
            `[UMIG DEBUG] ====== API RESPONSE ANALYSIS for ${entity} ======`,
          );
          console.log(`[UMIG DEBUG] Full API Response:`, data);
          console.log(`[UMIG DEBUG] Response type:`, typeof data);
          console.log(`[UMIG DEBUG] Is array:`, Array.isArray(data));
          console.log(
            `[UMIG DEBUG] Response keys:`,
            data && typeof data === "object" ? Object.keys(data) : "N/A",
          );

          if (data && data.content) {
            console.log(`[UMIG DEBUG] Has content property:`, !!data.content);
            console.log(`[UMIG DEBUG] Content type:`, typeof data.content);
            console.log(
              `[UMIG DEBUG] Content is array:`,
              Array.isArray(data.content),
            );
            if (Array.isArray(data.content)) {
              console.log(`[UMIG DEBUG] Content length:`, data.content.length);
              if (data.content.length > 0) {
                console.log(`[UMIG DEBUG] First item:`, data.content[0]);
                console.log(
                  `[UMIG DEBUG] First item keys:`,
                  Object.keys(data.content[0]),
                );
              }
            }
          }

          // Handle both paginated response formats
          if (data.content && Array.isArray(data.content)) {
            // Format 1: Paginated response with direct properties
            console.log(
              `[UMIG DEBUG] Processing Format 1 paginated response with ${data.content.length} items`,
            );
            this.state.data[entity] = data.content;
            this.state.pagination = {
              totalElements: data.totalElements || 0,
              totalPages: data.totalPages || 1,
              pageNumber: data.pageNumber || 1,
              pageSize: data.pageSize || 50,
              hasNext: data.hasNext || false,
              hasPrevious: data.hasPrevious || false,
            };
            console.log(
              `[UMIG DEBUG] Set pagination state:`,
              this.state.pagination,
            );

            // Update sort state from server response
            if (data.sortField) {
              this.state.sortField = data.sortField;
              this.state.sortDirection = data.sortDirection || "asc";
              console.log(
                `[UMIG DEBUG] Updated sort state - field: ${this.state.sortField}, direction: ${this.state.sortDirection}`,
              );
            }
          } else if (data.data && Array.isArray(data.data) && data.pagination) {
            // Format 2: Paginated response with nested structure
            console.log(
              `[UMIG DEBUG] Processing Format 2 paginated response with ${data.data.length} items`,
            );
            this.state.data[entity] = data.data;
            this.state.pagination = {
              totalElements: data.pagination.totalElements || 0,
              totalPages: data.pagination.totalPages || 1,
              pageNumber: data.pagination.pageNumber || 1,
              pageSize: data.pagination.pageSize || 50,
              hasNext: data.pagination.hasNext || false,
              hasPrevious: data.pagination.hasPrevious || false,
            };
            console.log(
              `[UMIG DEBUG] Set pagination state:`,
              this.state.pagination,
            );

            // Update sort state from server response
            if (data.pagination.sortField) {
              this.state.sortField = data.pagination.sortField;
              this.state.sortDirection = data.pagination.sortDirection || "asc";
              console.log(
                `[UMIG DEBUG] Updated sort state - field: ${this.state.sortField}, direction: ${this.state.sortDirection}`,
              );
            }
          } else if (Array.isArray(data)) {
            // Non-paginated response (fallback)
            console.log(
              `[UMIG DEBUG] Processing array response with ${data.length} items`,
            );
            if (data.length > 0) {
              console.log(`[UMIG DEBUG] First array item:`, data[0]);
              console.log(
                `[UMIG DEBUG] First array item keys:`,
                Object.keys(data[0]),
              );
            }
            this.state.data[entity] = data;
            this.state.pagination = {
              totalElements: data.length,
              totalPages: 1,
              pageNumber: 1,
              pageSize: data.length,
              hasNext: false,
              hasPrevious: false,
            };
          } else if (data && typeof data === "string") {
            // Handle string responses (fallback)
            console.log(
              `[UMIG DEBUG] Processing string response, attempting JSON parse`,
            );
            try {
              const parsed = JSON.parse(data);
              if (Array.isArray(parsed)) {
                this.state.data[entity] = parsed;
                console.log(
                  `[UMIG DEBUG] Successfully parsed string to array with ${parsed.length} items`,
                );
              } else {
                console.error(
                  `[UMIG DEBUG] Parsed data is not an array:`,
                  parsed,
                );
                this.state.data[entity] = [];
              }
            } catch (parseError) {
              console.error(
                `[UMIG DEBUG] Failed to parse string response:`,
                parseError,
              );
              this.state.data[entity] = [];
            }
          } else {
            // Unexpected response format
            console.warn(
              `[UMIG DEBUG] Unexpected response format for ${entity}:`,
              typeof data,
              data,
            );
            this.state.data[entity] = [];
          }

          console.log(
            `[UMIG DEBUG] Final data set for ${entity}:`,
            this.state.data[entity],
          );
          console.log(
            `[UMIG DEBUG] Final data length:`,
            this.state.data[entity]
              ? this.state.data[entity].length
              : "undefined",
          );

          // Render the table
          console.log(`[UMIG DEBUG] About to call renderTable for ${entity}`);
          this.renderTable();
          this.hideLoadingSpinner();
          console.log(
            `[UMIG DEBUG] ====== COMPLETED loadCurrentSection for ${entity} ======`,
          );
        })
        .catch((error) => {
          console.error(
            `[UMIG DEBUG] ====== ERROR in loadCurrentSection for ${entity} ======`,
          );
          console.error(`[UMIG DEBUG] Error details:`, error);
          console.error(`[UMIG DEBUG] Error message:`, error.message);
          console.error(`[UMIG DEBUG] Error stack:`, error.stack);
          this.hideLoadingSpinner();
          this.showError(`Failed to load ${entity}: ${error.message}`);
        });
    } catch (error) {
      console.error(
        `[UMIG DEBUG] ====== OUTER ERROR in loadCurrentSection for ${entity} ======`,
      );
      console.error(`[UMIG DEBUG] Outer error:`, error);
      this.hideLoadingSpinner();
      this.showError(`Error loading ${entity}: ${error.message}`);
    }
  },

  // Load section using EntityManager (US-087)
  async loadWithEntityManager(entity) {
    console.log(`[US-087] Looking for EntityManager for ${entity}`, {
      componentManagers: this.componentManagers,
      hasTeams: Boolean(this.componentManagers.teams),
      teamsManager: this.componentManagers.teams,
    });

    const manager = this.componentManagers[entity];
    if (!manager) {
      console.error(
        `[US-087] EntityManager for ${entity} not found, falling back to legacy`,
      );
      return this.loadCurrentSectionLegacy();
    }

    // CRITICAL FIX: Set the current entity manager for component access
    window.currentEntityManager = manager;
    console.log(
      `[US-087] Set window.currentEntityManager for ${entity}:`,
      manager,
    );

    console.log(`[US-087] Loading ${entity} with EntityManager`);

    // Track performance
    const timerId = this.performanceMonitor?.startTimer(`${entity}Load`);

    try {
      // Show loading state
      this.showLoadingSpinner();

      // Get the content container
      const contentArea = document.getElementById("mainContent");
      if (!contentArea) {
        throw new Error("Main content area not found");
      }

      // Clear existing content
      // Secure alternative to innerHTML
      if (
        window.SecurityUtils &&
        typeof window.SecurityUtils.safeSetInnerHTML === "function"
      ) {
        window.SecurityUtils.safeSetInnerHTML(
          contentArea,
          '<div id="entityManagerContainer"></div>',
          { allowedTags: ["div"], allowedAttributes: { div: ["id"] } },
        );
      } else {
        contentArea.innerHTML = '<div id="entityManagerContainer"></div>'; // Safe static HTML
      }
      const container = document.getElementById("entityManagerContainer");

      // Safety check: Ensure container exists in DOM
      if (!container) {
        console.error(
          "[AdminGUI] Failed to create entityManagerContainer in DOM",
        );
        throw new Error(
          "Failed to create container element for entity manager",
        );
      }

      // Initialize the manager if not already done
      if (!manager.isInitialized) {
        console.log(
          `[US-087] Initializing ${entity} EntityManager for first time`,
        );
        await manager.initialize(container);
      } else {
        // Update manager's container if already initialized
        console.log(
          `[US-087] ${entity} EntityManager already initialized, updating container`,
        );
        manager.setContainer(container);
      }

      // Mount the manager to the container (CRITICAL: Required before render())
      if (!manager.mounted) {
        console.log(`[US-087] Mounting ${entity} EntityManager`);
        await manager.mount(container);
      } else {
        console.log(
          `[US-087] ${entity} EntityManager already mounted, skipping mount`,
        );
      }

      // Load data with current state
      await manager.loadData({
        page: this.state.currentPage,
        size: this.state.pageSize,
        search: this.state.searchTerm,
        sort: this.state.sortField,
        direction: this.state.sortDirection,
      });

      // Render the component (now safe since manager is mounted)
      await manager.render();

      // Hide loading state
      this.hideLoadingSpinner();

      // End performance tracking
      if (timerId) {
        const metrics = this.performanceMonitor.endTimer(timerId);
        console.log(
          `[US-087] ${entity} loaded in ${metrics.duration.toFixed(2)}ms`,
        );

        // Compare to baseline
        if (this.performanceMonitor.baselines[`${entity}Load`]) {
          this.performanceMonitor.compareToBaseline(
            `${entity}Load`,
            metrics.duration,
          );
        }
      }

      // Listen for EntityManager events
      this.setupEntityManagerEventListeners(entity, manager);

      // Reset loading flag on successful completion
      this.isLoadingSection = false;
    } catch (error) {
      console.error(
        `[US-087] Failed to load ${entity} with EntityManager:`,
        error,
      );

      // End timer if it exists
      if (timerId) {
        this.performanceMonitor.endTimer(timerId);
      }

      // Hide loading state
      this.hideLoadingSpinner();

      // Show error with detailed information for debugging
      this.showError(
        `Failed to load ${entity}: ${error.message}. ` +
          `Please check the browser console for detailed error information.`,
      );

      // Log detailed error information for debugging
      console.error(`[US-087] Detailed error information:`, {
        entity,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
      });

      // Reset loading flag on error
      this.isLoadingSection = false;
    }
  },

  // Load specialized components (US-088 Phase 2)
  async loadSpecializedComponent(componentName) {
    console.log(`[US-088] Loading specialized component: ${componentName}`);

    try {
      // Show loading state
      this.showLoadingSpinner();

      // Get the content container
      const contentArea = document.getElementById("mainContent");
      if (!contentArea) {
        throw new Error("Main content area not found");
      }

      // Clear existing content and create container
      if (
        window.SecurityUtils &&
        typeof window.SecurityUtils.safeSetInnerHTML === "function"
      ) {
        window.SecurityUtils.safeSetInnerHTML(
          contentArea,
          `<div id="${componentName}Container" class="umig-specialized-component-container"></div>`,
          { allowedTags: ["div"], allowedAttributes: { div: ["id", "class"] } },
        );
      } else {
        contentArea.innerHTML = `<div id="${componentName}Container" class="umig-specialized-component-container"></div>`;
      }

      const container = document.getElementById(`${componentName}Container`);
      if (!container) {
        throw new Error(`Failed to create container for ${componentName}`);
      }

      // Map component names to classes
      const componentClassMap = {
        databaseVersionManager: "DatabaseVersionManager",
        componentVersionTracker: "ComponentVersionTracker",
      };

      const className = componentClassMap[componentName];
      if (!className || !window[className]) {
        throw new Error(`Component class ${className} not found`);
      }

      // Check if component is already instantiated
      if (!this.componentManagers[componentName]) {
        console.log(`[US-088] Creating new instance of ${className}`);

        // Create the component instance
        this.componentManagers[componentName] = new window[className](
          container.id,
          {
            apiBase: this.api.baseUrl,
            debug: true,
            performanceMonitoring: true,
            errorBoundary: true,
            accessibility: true,
          },
        );
      }

      const component = this.componentManagers[componentName];

      // Initialize if needed
      if (!component.isInitialized) {
        console.log(`[US-088] Initializing ${componentName}`);
        await component.initialize();
        component.isInitialized = true;
      }

      // Mount the component
      if (!component.isMounted) {
        console.log(`[US-088] Mounting ${componentName}`);
        await component.mount();
        component.isMounted = true;
      }

      // Render the component
      console.log(`[US-088] Rendering ${componentName}`);
      await component.render();

      // Add header with title and description
      const header = document.createElement("div");
      header.className = "umig-component-header";

      // Ensure DOM compatibility for batch.js MutationObserver
      if (header && !header.getElementsByClassName) {
        header.getElementsByClassName = function (className) {
          return this.querySelectorAll("." + className);
        };
      }

      const titles = {
        databaseVersionManager: "Database Version Manager",
        componentVersionTracker: "Component Version Tracker",
      };

      const descriptions = {
        databaseVersionManager:
          "Manage database versions, analyze Liquibase changesets, and generate deployment packages",
        componentVersionTracker:
          "Track component versions across API, UI, Backend, and Database layers",
      };

      if (
        window.SecurityUtils &&
        typeof window.SecurityUtils.safeSetInnerHTML === "function"
      ) {
        window.SecurityUtils.safeSetInnerHTML(
          header,
          `
          <h2>${titles[componentName] || componentName}</h2>
          <p class="umig-component-description">${descriptions[componentName] || ""}</p>
          `,
          {
            allowedTags: ["h2", "p"],
            allowedAttributes: { p: ["class"] },
          },
        );
      } else {
        header.innerHTML = `
          <h2>${titles[componentName] || componentName}</h2>
          <p class="umig-component-description">${descriptions[componentName] || ""}</p>
        `;
      }

      // Insert header before the component content
      container.insertBefore(header, container.firstChild);

      // Hide loading state
      this.hideLoadingSpinner();

      console.log(`[US-088] Successfully loaded ${componentName}`);
    } catch (error) {
      console.error(`[US-088] Failed to load ${componentName}:`, error);

      // Hide loading state
      this.hideLoadingSpinner();

      // Show error message
      this.showError(
        `Failed to load ${componentName}: ${error.message}. Please check the browser console for details.`,
      );
    }
  },

  // Setup event listeners for EntityManager (US-087)
  setupEntityManagerEventListeners(entity, manager) {
    // TD-005 Phase 2: Support both direct event methods and orchestrator-based events
    const eventTarget = manager.on ? manager : manager.orchestrator;

    if (!eventTarget || typeof eventTarget.on !== "function") {
      console.warn(
        `[AdminGUI] Manager for ${entity} does not have event handling capability yet`,
      );
      return;
    }

    console.log(
      `[AdminGUI] Setting up event listeners for ${entity} entity manager using ${manager.on ? "direct" : "orchestrator"} event handling`,
    );

    // Listen for pagination changes
    eventTarget.on("pagination:change", (event) => {
      console.log(
        `[AdminGUI] Pagination change event received for ${entity}:`,
        event,
      );

      // Update state without triggering full reload
      this.state.currentPage = event.page || event.currentPage || 1;
      if (event.pageSize) {
        this.state.pageSize = event.pageSize;
      }

      // Only reload data through the EntityManager, don't rebuild components
      const manager = this.componentManagers[entity];
      if (manager && typeof manager.loadData === "function") {
        console.log(
          `[AdminGUI] Reloading data only for ${entity} pagination change`,
        );
        manager.loadData(
          manager.currentFilters,
          manager.currentSort,
          this.state.currentPage,
        );
      } else {
        console.warn(
          `[AdminGUI] EntityManager loadData not available for ${entity}, falling back to full reload`,
        );
        this.loadWithEntityManager(entity);
      }
    });

    // Listen for table sort changes
    eventTarget.on("table:sort", (event) => {
      console.log(`[AdminGUI] Table sort event received for ${entity}:`, event);
      if (event.sort) {
        this.state.sortField = event.sort.field;
        this.state.sortDirection = event.sort.direction;
      }
      this.loadWithEntityManager(entity);
    });

    // Listen for filter changes (search is typically handled as a filter)
    eventTarget.on("filter:change", (event) => {
      console.log(
        `[AdminGUI] Filter change event received for ${entity}:`,
        event,
      );
      if (event.filters) {
        // Extract search term if it exists in filters
        this.state.searchTerm =
          event.filters.search || event.filters.searchTerm || "";
        this.state.currentPage = 1; // Reset to first page on filter change
      }
      this.loadWithEntityManager(entity);
    });

    // Listen for selection changes (table selections)
    eventTarget.on("table:selection", (event) => {
      console.log(
        `[AdminGUI] Table selection event received for ${entity}:`,
        event,
      );
      this.state.selectedRows = new Set(
        event.selectedIds || event.selection || [],
      );
    });
  },

  // Legacy loadCurrentSection method (renamed for clarity)
  loadCurrentSectionLegacy() {
    console.log(
      "[US-087] Using legacy load method for entity:",
      this.state.currentEntity,
    );

    try {
      // Show loading state
      this.showLoadingSpinner();

      // Get entity configuration
      const entity = this.getEntity(this.state.currentEntity);
      if (!entity) {
        throw new Error(
          `Entity configuration not found for ${this.state.currentEntity}`,
        );
      }

      // Get content area
      const contentArea = document.getElementById("mainContent");
      if (!contentArea) {
        throw new Error("Main content area not found");
      }

      // Build URL for API call
      const endpoint = `${this.api.baseUrl}${entity.endpoint || this.api.endpoints[this.state.currentEntity]}`;
      if (!endpoint) {
        throw new Error(
          `No API endpoint configured for ${this.state.currentEntity}`,
        );
      }

      // Fetch data from API
      console.log(`[Legacy] Fetching data from: ${endpoint}`);
      fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          return response.json();
        })
        .then((data) => {
          console.log(
            `[Legacy] Received data for ${this.state.currentEntity}:`,
            data,
          );

          // Store data in state
          this.state.data[this.state.currentEntity] = Array.isArray(data)
            ? data
            : [data];

          // Create simple table HTML
          const tableHTML = this.createSimpleTable(
            entity,
            this.state.data[this.state.currentEntity],
          );

          // Update content area
          contentArea.innerHTML = `
            <div class="section-header">
              <h2>${entity.name}</h2>
              <button class="aui-button aui-button-primary" onclick="adminGui.showEditModal(null)">
                Add New ${entity.name.replace(/s$/, "")}
              </button>
            </div>
            <div class="table-container">
              ${tableHTML}
            </div>
          `;

          // Hide loading state
          this.hideLoadingSpinner();
        })
        .catch((error) => {
          console.error(
            `[Legacy] Failed to load ${this.state.currentEntity}:`,
            error,
          );
          this.hideLoadingSpinner();
          this.showError(
            `Failed to load ${this.state.currentEntity}: ${error.message}`,
          );
        });
    } catch (error) {
      console.error("[Legacy] loadCurrentSectionLegacy error:", error);
      this.hideLoadingSpinner();
      this.showError(`Error loading section: ${error.message}`);
    }
  },

  // Create simple table HTML for legacy mode
  createSimpleTable: function (entity, data) {
    if (!entity || !entity.tableColumns) {
      return '<div class="aui-message aui-message-error">No table configuration found</div>';
    }

    if (!data || data.length === 0) {
      return '<div class="aui-message aui-message-info">No data found</div>';
    }

    // Create table header
    let tableHTML = `
        <table class="aui aui-table-sortable">
          <thead>
            <tr>
              ${entity.tableColumns.map((col) => `<th>${col}</th>`).join("")}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
      `;

    // Create table rows
    data.forEach((record) => {
      tableHTML += "<tr>";
      entity.tableColumns.forEach((column) => {
        const field = entity.fields?.find((f) => f.label === column);
        const value = field ? record[field.key] : record[column.toLowerCase()];
        tableHTML += `<td>${this.formatCellValue(value)}</td>`;
      });

      // Add actions column
      const id = this.getRecordId(entity, record);
      tableHTML += `
          <td>
            <button class="aui-button aui-button-compact" onclick="adminGui.showEditModal('${id}')">Edit</button>
            <button class="aui-button aui-button-compact" onclick="adminGui.deleteRecord('${id}')">Delete</button>
          </td>
        `;
      tableHTML += "</tr>";
    });

    tableHTML += "</tbody></table>";
    return tableHTML;
  },

  // Format cell value for display
  formatCellValue: function (value) {
    if (value === null || value === undefined) {
      return "";
    }
    if (typeof value === "boolean") {
      return value ? "Yes" : "No";
    }
    if (value instanceof Date) {
      return value.toLocaleDateString();
    }
    return String(value);
  },

  // Get record ID from entity record
  getRecordId: function (entity, record) {
    if (entity.fields && entity.fields[0]) {
      return record[entity.fields[0].key];
    }
    return record.id || record.uuid || Object.values(record)[0];
  },

  // Hide edit modal
  hideEditModal: function () {
    const modal = document.getElementById("editModal");
    if (modal) {
      modal.style.display = "none";
    }
  },

  // Save record (placeholder implementation)
  saveRecord: function () {
    console.log(
      "[AdminGUI] Save record called - implement based on entity type",
    );
    this.showNotification("Save functionality not yet implemented", "warning");
    this.hideEditModal();
  },

  // Delete record (placeholder implementation)
  deleteRecord: function (id) {
    if (confirm("Are you sure you want to delete this record?")) {
      console.log("[AdminGUI] Delete record called for ID:", id);
      this.showNotification(
        "Delete functionality not yet implemented",
        "warning",
      );
      this.hideEditModal();
    }
  },

  // Show error message
  showError: function (message) {
    const contentArea = document.getElementById("mainContent");
    if (contentArea) {
      contentArea.innerHTML = `
          <div class="aui-message aui-message-error">
            <p>${message}</p>
          </div>
        `;
    } else {
      console.error("[AdminGUI] Error:", message);
      alert("Error: " + message);
    }
  },

  // Show success notification
  showNotification: function (message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `aui-message aui-message-${type}`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        max-width: 400px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        animation: slideIn 0.3s ease-out;
      `;
    notification.innerHTML = `<p>${message}</p>`;
    document.body.appendChild(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-out";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  },

  // Render data table
  renderTable: function () {
    const entity = this.getEntity(this.state.currentEntity);
    const data = this.state.data[this.state.currentEntity] || [];

    console.log(
      `[UMIG DEBUG] ====== STARTING renderTable for ${this.state.currentEntity} ======`,
    );
    console.log(`[UMIG DEBUG] Data length: ${data.length}`);
    console.log(`[UMIG DEBUG] Data contents:`, data);
    console.log(`[UMIG DEBUG] Entity config found:`, !!entity);

    if (entity) {
      console.log(`[UMIG DEBUG] Entity config details:`, {
        name: entity.name,
        hasTableColumns: !!entity.tableColumns,
        tableColumns: entity.tableColumns,
        hasFields: !!entity.fields,
        fieldsCount: entity.fields ? entity.fields.length : 0,
      });
    }

    if (!entity) {
      console.error(
        `[UMIG DEBUG] Entity configuration not found for: ${this.state.currentEntity}`,
      );
      console.error(
        `[UMIG DEBUG] Available entities:`,
        Object.keys(this.entities),
      );
      this.showError(
        `Configuration error: Unable to load ${this.state.currentEntity}`,
      );
      return;
    }

    // Ensure DOM elements exist before rendering
    console.log(`[UMIG DEBUG] About to ensure table elements exist`);
    this.ensureTableElementsExist(() => {
      console.log(
        `[UMIG DEBUG] Table elements exist, proceeding with rendering`,
      );

      // Render table headers
      console.log(`[UMIG DEBUG] Calling renderTableHeaders`);
      this.renderTableHeaders(entity);

      // Render table body
      console.log(
        `[UMIG DEBUG] Calling renderTableBody with ${data.length} items`,
      );
      this.renderTableBody(entity, data);

      // Update pagination
      console.log(`[UMIG DEBUG] Calling updatePagination`);
      this.updatePagination(data.length);

      console.log(
        `[UMIG DEBUG] ====== COMPLETED renderTable for ${this.state.currentEntity} ======`,
      );
    });
  },

  // Ensure table DOM elements exist before rendering
  ensureTableElementsExist: function (callback) {
    const maxAttempts = 20; // Increased to 1 second total wait
    let attempts = 0;

    const checkElements = () => {
      const headerRow = document.getElementById("tableHeader");
      const tbody = document.getElementById("tableBody");
      const mainContent = document.getElementById("mainContent");

      // Check that elements exist and main content is visible
      if (
        headerRow &&
        tbody &&
        mainContent &&
        mainContent.style.display !== "none"
      ) {
        // Elements found and visible, proceed with rendering
        console.log(
          `[UMIG] Table DOM elements found and visible after ${attempts} attempts`,
        );
        callback();
        return;
      }

      attempts++;
      if (attempts >= maxAttempts) {
        console.error(
          "Table elements not found after maximum attempts. DOM structure may be invalid.",
        );
        console.error("Expected elements: #tableHeader, #tableBody");
        console.error(
          "Available table elements:",
          document.querySelectorAll("[id*='table']"),
        );
        this.showError("Unable to initialize table. Please refresh the page.");
        return;
      }

      // Log progress for debugging
      if (attempts % 5 === 0) {
        console.log(
          `[UMIG] Waiting for table DOM elements... (attempt ${attempts}/${maxAttempts})`,
        );
      }

      // Wait 50ms and try again
      setTimeout(checkElements, 50);
    };

    checkElements();
  },

  // Render table headers
  renderTableHeaders: function (entity) {
    const headerRow = document.getElementById("tableHeader");

    if (!headerRow) {
      console.error("Table header element not found in DOM");
      return;
    }

    if (!entity || !entity.tableColumns) {
      console.error(
        "Invalid entity configuration provided to renderTableHeaders",
      );
      return;
    }

    // Clear content safely
    headerRow.textContent = "";
    // Remove all child elements
    while (headerRow.firstChild) {
      headerRow.removeChild(headerRow.firstChild);
    }

    // Add checkbox column for row selection
    const checkboxTh = document.createElement("th");

    // Ensure DOM compatibility for batch.js MutationObserver
    if (checkboxTh && !checkboxTh.getElementsByClassName) {
      checkboxTh.getElementsByClassName = function (className) {
        return this.querySelectorAll("." + className);
      };
    }
    // Secure alternative to innerHTML for checkbox
    if (
      window.SecurityUtils &&
      typeof window.SecurityUtils.safeSetInnerHTML === "function"
    ) {
      window.SecurityUtils.safeSetInnerHTML(
        checkboxTh,
        '<input type="checkbox" id="selectAll">',
        {
          allowedTags: ["input"],
          allowedAttributes: { input: ["type", "id"] },
        },
      );
    } else {
      // Fallback: create element safely
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = "selectAll";
      checkboxTh.appendChild(checkbox);
    }
    checkboxTh.style.width = "40px";
    headerRow.appendChild(checkboxTh);

    // Add data columns
    entity.tableColumns.forEach((columnKey) => {
      const field = entity.fields.find((f) => f.key === columnKey) || {
        key: columnKey,
        label: columnKey,
      };
      const th = document.createElement("th");

      // Ensure DOM compatibility for batch.js MutationObserver
      if (th && !th.getElementsByClassName) {
        th.getElementsByClassName = function (className) {
          return this.querySelectorAll("." + className);
        };
      }

      th.textContent = field.label;
      th.setAttribute("data-field", columnKey);

      // Only make sortable columns clickable
      if (entity.sortMapping && entity.sortMapping[columnKey]) {
        th.style.cursor = "pointer";
        th.title = "Click to sort";

        // Add sort indicator - check if current database field matches this column's mapped field
        const dbField = entity.sortMapping[columnKey];
        if (this.state.sortField === dbField) {
          const indicator = this.state.sortDirection === "asc" ? " ▲" : " ▼";
          th.textContent += indicator;
        }
      } else {
        th.style.cursor = "default";
        th.title = "Not sortable";
      }

      headerRow.appendChild(th);
    });

    // Add actions column
    const actionsTh = document.createElement("th");

    // Ensure DOM compatibility for batch.js MutationObserver
    if (actionsTh && !actionsTh.getElementsByClassName) {
      actionsTh.getElementsByClassName = function (className) {
        return this.querySelectorAll("." + className);
      };
    }

    actionsTh.textContent = "Actions";
    actionsTh.style.width = "120px";
    headerRow.appendChild(actionsTh);

    // Bind select all checkbox
    const selectAllCheckbox = document.getElementById("selectAll");
    selectAllCheckbox.addEventListener("change", (e) => {
      this.handleSelectAll(e.target.checked);
    });
  },

  // Render table body
  renderTableBody: function (entity, data) {
    console.log(`[UMIG DEBUG] ====== STARTING renderTableBody ======`);
    console.log(`[UMIG DEBUG] Entity:`, entity?.name || "undefined");
    console.log(`[UMIG DEBUG] Data length:`, data?.length || 0);
    console.log(`[UMIG DEBUG] Table columns:`, entity?.tableColumns);

    const tbody = document.getElementById("tableBody");

    if (!tbody) {
      console.error("Table body element not found in DOM");
      return;
    }

    // Clear tbody content safely
    tbody.textContent = "";
    // Remove all child elements
    while (tbody.firstChild) {
      tbody.removeChild(tbody.firstChild);
    }

    if (data.length === 0) {
      const tr = document.createElement("tr");
      const td = document.createElement("td");
      td.colSpan = entity.tableColumns.length + 2;
      td.textContent = "No data found";
      td.style.textAlign = "center";
      td.style.padding = "40px";
      td.style.color = "#718096";
      tr.appendChild(td);
      tbody.appendChild(tr);
      return;
    }

    data.forEach((record) => {
      const tr = document.createElement("tr");
      tr.setAttribute("data-id", record[entity.fields[0].key]);

      // Checkbox column
      const checkboxTd = document.createElement("td");
      // Secure checkbox creation
      if (window.SecurityUtils) {
        const recordId = window.SecurityUtils.validateInput(
          String(record[entity.fields[0].key]),
          "alphanumeric",
        );
        if (recordId.isValid) {
          const safeHTML = `<input type="checkbox" class="row-select" value="${recordId.sanitizedData}">`;
          window.SecurityUtils.safeSetInnerHTML(checkboxTd, safeHTML, {
            allowedTags: ["input"],
            allowedAttributes: { input: ["type", "class", "value"] },
          });
        } else {
          console.warn(
            "[Security] Invalid record ID for checkbox:",
            record[entity.fields[0].key],
          );
          checkboxTd.textContent = "Invalid ID";
        }
      } else {
        // Fallback: create element safely
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "row-select";
        checkbox.value = String(record[entity.fields[0].key]);
        checkboxTd.appendChild(checkbox);
      }
      tr.appendChild(checkboxTd);

      // Data columns
      entity.tableColumns.forEach((columnKey) => {
        const td = document.createElement("td");
        const value = this.formatCellValue(record, columnKey, entity);

        // Handle HTML content (like email links)
        if (typeof value === "string" && value.includes("<")) {
          // Value contains HTML
          if (window.SecurityUtils) {
            // Use SecurityUtils if available for safe HTML rendering
            window.SecurityUtils.safeSetInnerHTML(td, value);
          } else {
            // For email columns, we trust the HTML from formatCellValue
            // since it's generated internally, not from user input
            if (columnKey.includes("email")) {
              td.innerHTML = value;
            } else {
              // For other HTML content, escape it for safety
              td.textContent = value;
            }
          }
        } else {
          // Plain text content
          td.textContent = value;
        }
        tr.appendChild(td);
      });

      // Actions column
      const actionsTd = document.createElement("td");
      actionsTd.className = "action-buttons";

      // Add action buttons based on entity type
      let actionsHtml = "";

      // VIEW button - now available for ALL entities
      // Secure action button creation with validation
      const recordId = record[entity.fields[0].key];
      if (window.SecurityUtils) {
        const validatedId = window.SecurityUtils.validateInput(
          String(recordId),
          "alphanumeric",
        );
        if (validatedId.isValid) {
          actionsHtml += `<button class="btn-table-action btn-view" data-action="view" data-id="${validatedId.sanitizedData}" title="View Details">👁️</button>`;
        } else {
          console.warn(
            "[Security] Invalid record ID for action button:",
            recordId,
          );
          actionsHtml += `<span class="btn-disabled" title="Invalid ID">❌</span>`;
        }
      } else {
        actionsHtml += `<button class="btn-table-action btn-view" data-action="view" data-id="${recordId}" title="View Details">👁️</button>`;
      }

      // Entity-specific action buttons
      if (this.state.currentEntity === "phasesinstance") {
        actionsHtml += `
                        <button class="btn-table-action btn-controls" data-action="controls" data-id="${record[entity.fields[0].key]}" title="Manage Control Points">🎛️</button>
                        <button class="btn-table-action btn-progress" data-action="progress" data-id="${record[entity.fields[0].key]}" title="Update Progress">📊</button>
                    `;
      } else if (this.state.currentEntity === "phasesmaster") {
        actionsHtml += `
                        <button class="btn-table-action btn-move" data-action="move" data-id="${record[entity.fields[0].key]}" title="Reorder Phase">↕️</button>
                    `;
      }

      actionsHtml += `
                    <button class="btn-table-action btn-edit" data-action="edit" data-id="${record[entity.fields[0].key]}" title="Edit">✏️</button>
                    <button class="btn-table-action btn-delete" data-action="delete" data-id="${record[entity.fields[0].key]}" title="Delete">🗑️</button>
                `;

      // Secure actions HTML setting
      if (window.SecurityUtils && actionsHtml) {
        window.SecurityUtils.safeSetInnerHTML(actionsTd, actionsHtml, {
          allowedTags: ["button", "span"],
          allowedAttributes: {
            button: ["class", "data-action", "data-id", "title"],
            span: ["class", "title"],
          },
        });
      } else if (actionsHtml) {
        actionsTd.innerHTML = actionsHtml; // Fallback for constructed HTML
      }
      tr.appendChild(actionsTd);

      tbody.appendChild(tr);
    });

    // Bind row selection checkboxes
    tbody.querySelectorAll(".row-select").forEach((checkbox) => {
      checkbox.addEventListener("change", (e) => {
        this.handleRowSelection(e.target);
      });
    });
  },

  // Format cell value for display
  formatCellValue: function (record, columnKey, _entity) {
    // Defensive programming: ensure columnKey is a string
    if (typeof columnKey !== "string") {
      console.warn(
        "[UMIG] formatCellValue: columnKey is not a string:",
        typeof columnKey,
        columnKey,
      );
      columnKey = String(columnKey);
    }

    let value = record[columnKey];

    // Handle special display columns
    if (columnKey === "role_display") {
      const roleId = record.rls_id;
      const isAdmin = record.usr_is_admin;

      if (isAdmin) {
        return '<span class="status-badge status-superadmin">Super Admin</span>';
      } else if (roleId === 1) {
        return '<span class="status-badge status-admin">Admin</span>';
      } else if (roleId === 2) {
        return '<span class="status-badge status-user">User</span>';
      } else if (roleId === 3) {
        return '<span class="status-badge status-pilot">Pilot</span>';
      } else {
        return '<span class="status-badge">No Role</span>';
      }
    }

    if (columnKey === "status_display") {
      const isActive = record.usr_active !== false; // Check usr_active field
      return isActive
        ? '<span class="status-badge status-active">Active</span>'
        : '<span class="status-badge status-inactive">Inactive</span>';
    }

    if (columnKey === "member_count") {
      return record.member_count || "0";
    }
    if (columnKey === "app_count") {
      return record.app_count || "0";
    }

    // Handle all computed count fields for flickering entities
    if (columnKey === "application_count") {
      return record.application_count || "0";
    }
    if (columnKey === "iteration_count") {
      return record.iteration_count || "0";
    }
    if (columnKey === "environment_count") {
      return record.environment_count || "0";
    }
    if (columnKey === "team_count") {
      return record.team_count || "0";
    }
    if (columnKey === "label_count") {
      return record.label_count || "0";
    }
    if (columnKey === "step_count") {
      return record.step_count || "0";
    }

    // Handle computed name fields
    if (columnKey === "mig_name") {
      return record.mig_name || '<span style="color: #a0aec0;">—</span>';
    }
    if (columnKey === "created_by_name") {
      return record.created_by_name || '<span style="color: #a0aec0;">—</span>';
    }

    // Handle phases-specific display columns
    if (columnKey === "sequence_name") {
      return (
        record.sequence_name ||
        record.sqm_name ||
        record.sqi_name ||
        '<span style="color: #a0aec0;">—</span>'
      );
    }

    if (columnKey === "predecessor_name") {
      return (
        record.predecessor_name ||
        record.predecessor_phm_name ||
        record.predecessor_phi_name ||
        '<span style="color: #a0aec0;">None</span>'
      );
    }

    if (columnKey === "progress_display") {
      const progress = record.phi_progress_percentage;
      if (progress === null || progress === undefined) {
        return '<span style="color: #a0aec0;">—</span>';
      }
      const progressClass =
        progress >= 100
          ? "success"
          : progress >= 75
            ? "warning"
            : progress >= 50
              ? "info"
              : "secondary";
      return `<div class="progress-bar">
                    <div class="progress-fill progress-${progressClass}" style="width: ${progress}%"></div>
                    <span class="progress-text">${progress}%</span>
                </div>`;
    }

    // Handle phase status display
    if (
      columnKey === "phi_status" ||
      (columnKey === "status_display" &&
        (this.state.currentEntity === "phasesmaster" ||
          this.state.currentEntity === "phasesinstance"))
    ) {
      const status = value || record.phi_status || "pending";
      const statusClasses = {
        pending: "status-pending",
        in_progress: "status-in-progress",
        completed: "status-completed",
        blocked: "status-blocked",
        failed: "status-failed",
      };
      const statusLabels = {
        pending: "Pending",
        in_progress: "In Progress",
        completed: "Completed",
        blocked: "Blocked",
        failed: "Failed",
      };
      const className = statusClasses[status] || "status-unknown";
      const label = statusLabels[status] || status;
      return `<span class="status-badge ${className}">${label}</span>`;
    }

    // Handle null/undefined values
    if (value === null || value === undefined) {
      return '<span style="color: #a0aec0;">—</span>';
    }

    // Handle boolean values
    if (typeof value === "boolean") {
      return value
        ? '<span class="status-badge status-active">Yes</span>'
        : '<span class="status-badge">No</span>';
    }

    // Handle dates and timestamps (with type safety)
    if (
      typeof columnKey === "string" &&
      (columnKey.includes("date") || columnKey.includes("_at")) &&
      value
    ) {
      const date = new Date(value);
      // Format as YYYY-MM-DD HH:MM:SS
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hours = String(date.getHours()).padStart(2, "0");
      const minutes = String(date.getMinutes()).padStart(2, "0");
      const seconds = String(date.getSeconds()).padStart(2, "0");
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    }

    // Handle email (with type safety)
    if (typeof columnKey === "string" && columnKey.includes("email") && value) {
      return `<a href="mailto:${value}">${value}</a>`;
    }

    return String(value);
  },

  // Handle row selection
  handleRowSelection: function (checkbox) {
    const id = checkbox.value;

    if (checkbox.checked) {
      this.state.selectedRows.add(id);
    } else {
      this.state.selectedRows.delete(id);
    }

    this.updateBulkActionsButton();
    this.updateSelectAllCheckbox();
  },

  // Handle select all checkbox
  handleSelectAll: function (checked) {
    // Use setTimeout to avoid conflicts with Confluence's MutationObserver
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      try {
        const checkboxes = document.querySelectorAll(".row-select");

        if (checkboxes) {
          checkboxes.forEach((checkbox) => {
            if (checkbox) {
              checkbox.checked = checked;
              this.handleRowSelection(checkbox);
            }
          });
        }
      } catch (error) {
        console.error("[UMIG] Handle select all error:", error);
      }
    }, 10);

    this.activeTimeouts.add(timeoutId);
  },

  // Update bulk actions button state
  updateBulkActionsButton: function () {
    const bulkBtn = document.getElementById("bulkActionsBtn");
    if (bulkBtn) {
      bulkBtn.disabled = this.state.selectedRows.size === 0;
      bulkBtn.textContent = `Bulk Actions (${this.state.selectedRows.size})`;
    }
  },

  // Update select all checkbox state
  updateSelectAllCheckbox: function () {
    const selectAllCheckbox = document.getElementById("selectAll");
    const rowCheckboxes = document.querySelectorAll(".row-select");

    if (rowCheckboxes.length === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
      return;
    }

    const checkedCount = this.state.selectedRows.size;

    if (checkedCount === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === rowCheckboxes.length) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  },

  // Update pagination controls
  updatePagination: function (totalItems) {
    const paginationInfo = document.getElementById("paginationInfo");

    // Use pagination data if available, otherwise fall back to totalItems
    const pagination = this.state.pagination || {};
    const totalElements = pagination.totalElements || totalItems;
    const currentPage = pagination.pageNumber || this.state.currentPage;
    const pageSize = pagination.pageSize || this.state.pageSize;

    const startItem = totalElements > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    const endItem = Math.min(startItem + pageSize - 1, totalElements);

    paginationInfo.textContent = `Showing ${startItem}-${endItem} of ${totalElements} items`;

    // Update pagination buttons
    const prevBtn = document.getElementById("prevPageBtn");
    const nextBtn = document.getElementById("nextPageBtn");

    if (prevBtn) prevBtn.disabled = !pagination.hasPrevious;
    if (nextBtn) nextBtn.disabled = !pagination.hasNext;
  },

  // Handle search
  handleSearch: function (searchTerm) {
    this.state.searchTerm = searchTerm;
    this.state.currentPage = 1;
    this.loadCurrentSection();
  },

  // Handle pagination
  handlePagination: function (button) {
    const action = button.getAttribute("data-action") || button.id;

    switch (action) {
      case "firstPageBtn":
        this.state.currentPage = 1;
        break;
      case "prevPageBtn":
        if (this.state.currentPage > 1) {
          this.state.currentPage--;
        }
        break;
      case "nextPageBtn":
        this.state.currentPage++;
        break;
      case "lastPageBtn":
        // Calculate last page (simplified)
        this.state.currentPage = Math.max(1, this.state.currentPage + 1);
        break;
    }

    this.loadCurrentSection();
  },

  // Bind modal events
  bindModalEvents: function () {
    // Close modal events
    const closeModal = document.getElementById("closeModal");
    if (closeModal) {
      closeModal.addEventListener("click", this.hideEditModal.bind(this));
    }

    const cancelBtn = document.getElementById("cancelBtn");
    if (cancelBtn) {
      cancelBtn.addEventListener("click", this.hideEditModal.bind(this));
    }

    // Save button
    const saveBtn = document.getElementById("saveBtn");
    if (saveBtn) {
      saveBtn.addEventListener("click", this.handleSave.bind(this));
    }

    // Delete button
    const deleteBtn = document.getElementById("deleteBtn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", this.handleDelete.bind(this));
    }

    // Close modal when clicking outside
    const editModal = document.getElementById("editModal");
    if (editModal) {
      editModal.addEventListener("click", (e) => {
        if (e.target === editModal) {
          this.hideEditModal();
        }
      });
    }

    // Escape key to close modal
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        this.hideEditModal();
        this.hideConfirmModal();
      }

      // US-087: Keyboard shortcuts for feature toggle management
      // Ctrl+Shift+M: Toggle migration master switch
      if (e.ctrlKey && e.shiftKey && e.key === "M") {
        e.preventDefault();
        if (this.featureToggle) {
          this.featureToggle.toggle("admin-gui-migration");
          const status = this.featureToggle.isEnabled("admin-gui-migration")
            ? "enabled"
            : "disabled";
          this.showNotification(`Admin GUI migration ${status}`, "info");
          console.log(`[US-087] Admin GUI migration ${status}`);
        }
      }

      // Ctrl+Shift+T: Teams component is now always enabled (no toggle needed)

      // Ctrl+Shift+P: Show performance report
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        e.preventDefault();
        if (this.performanceMonitor) {
          const report = this.performanceMonitor.generateReport();
          console.log("[US-087] Performance Report:", report);
          this.showNotification("Performance report logged to console", "info");
        }
      }

      // Ctrl+Shift+R: Emergency rollback
      if (e.ctrlKey && e.shiftKey && e.key === "R") {
        e.preventDefault();
        if (
          this.featureToggle &&
          confirm("Emergency rollback all component migrations?")
        ) {
          this.featureToggle.emergencyRollback();
          this.showNotification(
            "Emergency rollback executed - reloading...",
            "warning",
          );
        }
      }
    });
  },

  // Bind table events
  bindTableEvents: function () {
    // Table action buttons - use closest() to handle clicks on button content (like emoji)
    document.addEventListener("click", (e) => {
      const viewBtn = e.target.closest('[data-action="view"]');
      if (viewBtn) {
        const id = viewBtn.getAttribute("data-id");
        if (this.state.currentEntity === "environments") {
          this.showEnvironmentDetails(id);
        } else if (this.state.currentEntity === "phasesinstance") {
          this.showPhaseInstanceDetails(id);
        } else {
          // Generic view modal for all other entities
          this.showGenericEntityView(id);
        }
      }

      const editBtn = e.target.closest('[data-action="edit"]');
      if (editBtn) {
        const id = editBtn.getAttribute("data-id");
        this.showEditModal(id);
      }

      const deleteBtn = e.target.closest('[data-action="delete"]');
      if (deleteBtn) {
        const id = deleteBtn.getAttribute("data-id");
        this.confirmDelete(id);
      }

      const controlsBtn = e.target.closest('[data-action="controls"]');
      if (controlsBtn) {
        const id = controlsBtn.getAttribute("data-id");
        this.showControlPointsModal(id);
      }

      const progressBtn = e.target.closest('[data-action="progress"]');
      if (progressBtn) {
        const id = progressBtn.getAttribute("data-id");
        this.showProgressModal(id);
      }

      const moveBtn = e.target.closest('[data-action="move"]');
      if (moveBtn) {
        const id = moveBtn.getAttribute("data-id");
        this.showMovePhaseModal(id);
      }
    });

    // Column sorting
    document.addEventListener("click", (e) => {
      if (e.target.matches("th[data-field]")) {
        const field = e.target.getAttribute("data-field");
        this.handleSort(field);
      }
    });

    // Row double-click to edit
    document.addEventListener("dblclick", (e) => {
      const row = e.target.closest("tr[data-id]");
      if (row) {
        const id = row.getAttribute("data-id");
        this.showEditModal(id);
      }
    });
  },

  // Handle column sorting
  handleSort: function (field) {
    const entity = this.getEntity(this.state.currentEntity);

    // Check if the field is sortable
    if (!entity || !entity.sortMapping || !entity.sortMapping[field]) {
      console.log(`Field ${field} is not sortable`);
      return;
    }

    // Get the database column name for this display field
    const dbField = entity.sortMapping[field];

    if (this.state.sortField === dbField) {
      this.state.sortDirection =
        this.state.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.state.sortField = dbField;
      this.state.sortDirection = "asc";
    }

    this.state.currentPage = 1; // Reset to first page when sorting
    this.loadCurrentSection();
  },

  // Show edit modal
  showEditModal: function (id) {
    // Use setTimeout to avoid conflicts with Confluence's MutationObserver
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      try {
        // Ensure modal structure exists and verify creation
        const modalCreated = this.createEditModalStructure();

        if (!modalCreated) {
          console.error("[UMIG] Failed to create modal structure");
          return;
        }

        const modal = document.getElementById("editModal");
        const modalTitle = document.getElementById("modalTitle");
        const deleteBtn = document.getElementById("deleteBtn");

        if (!modal) {
          console.error(
            "[UMIG] Edit modal element not found even after creating structure",
          );
          return;
        }

        const isEdit = id !== null;

        if (modalTitle) {
          modalTitle.textContent = isEdit ? "Edit Record" : "Add New Record";
        }

        if (deleteBtn) {
          deleteBtn.style.display = isEdit ? "inline-block" : "none";
        }

        // Render form with additional verification
        const formRendered = this.renderEditForm(id);
        if (formRendered !== false) {
          modal.style.display = "flex";
        } else {
          console.error("[UMIG] Failed to render edit form");
          // Show user-friendly error message
          this.showError(
            "Unable to open the form. Please try again or refresh the page.",
          );
        }
      } catch (error) {
        console.error("[UMIG] Show edit modal error:", error);
      }
    }, 10);

    this.activeTimeouts.add(timeoutId);

    // Focus first input with extended delay to ensure form is rendered
    setTimeout(() => {
      const modal = document.getElementById("editModal");
      if (modal && modal.style.display === "flex") {
        const firstInput = modal.querySelector(
          "input:not([readonly]), textarea, select",
        );
        if (firstInput) firstInput.focus();
      }
    }, 150);
  },

  // Render edit form
  renderEditForm: function (id) {
    const entity = this.getEntity(this.state.currentEntity);
    if (!entity) {
      console.error(
        `Entity configuration not found for: ${this.state.currentEntity}`,
      );
      return false;
    }

    // Ensure modal structure exists with verification
    const modalCreated = this.createEditModalStructure();
    if (!modalCreated) {
      console.error("Failed to create modal structure");
      return false;
    }

    // Wait briefly and retry if formFields not immediately available
    let formFields = document.getElementById("formFields");
    if (!formFields) {
      // Give DOM a moment to process
      const retryDelay = 50;
      const maxRetries = 3;
      let retryCount = 0;

      const waitForFormFields = () => {
        formFields = document.getElementById("formFields");
        if (formFields) {
          console.log("[AdminGUI] formFields found after retry");
          const renderResult = this._continueRenderEditForm(
            id,
            entity,
            formFields,
          );
          return renderResult;
        }

        retryCount++;
        if (retryCount < maxRetries) {
          console.warn(
            `[AdminGUI] formFields not found, retrying (${retryCount}/${maxRetries})`,
          );
          setTimeout(waitForFormFields, retryDelay);
          return false;
        } else {
          console.error(
            "formFields element not found after multiple retries - modal structure may not be properly created",
          );
          return false;
        }
      };

      return waitForFormFields();
    }

    // formFields is available, continue with rendering
    return this._continueRenderEditForm(id, entity, formFields);
  },

  // Continue rendering the edit form (extracted for reuse)
  _continueRenderEditForm: function (id, entity, formFields) {
    try {
      const data = this.state.data[this.state.currentEntity] || [];
      const record = id ? data.find((r) => r[entity.fields[0].key] === id) : {};

      // Clear form fields safely
      formFields.textContent = "";
      // Remove all child elements
      while (formFields.firstChild) {
        formFields.removeChild(formFields.firstChild);
      }

      // Add association management for environments (only when editing)
      if (this.state.currentEntity === "environments" && id) {
        const associationDiv = document.createElement("div");
        associationDiv.className = "form-group association-management";
        // Secure association div creation
        if (window.SecurityUtils) {
          const validatedId = window.SecurityUtils.validateInput(
            String(id),
            "alphanumeric",
          );
          if (validatedId.isValid) {
            const safeHTML = `
                        <label>Manage Associations</label>
                        <div class="association-buttons">
                            <button type="button" class="btn-primary" onclick="adminGui.showAssociateApplicationModal(${validatedId.sanitizedData})">Associate Application</button>
                            <button type="button" class="btn-primary" onclick="adminGui.showAssociateIterationModal(${validatedId.sanitizedData})">Associate Iteration</button>
                        </div>
                    `;
            window.SecurityUtils.safeSetInnerHTML(associationDiv, safeHTML, {
              allowedTags: ["label", "div", "button"],
              allowedAttributes: {
                div: ["class"],
                button: ["type", "class", "onclick"],
              },
            });
          } else {
            console.warn("[Security] Invalid ID for association buttons:", id);
            associationDiv.textContent =
              "Invalid environment ID - associations disabled";
          }
        } else {
          // Fallback - create elements safely
          const label = document.createElement("label");
          label.textContent = "Manage Associations";
          associationDiv.appendChild(label);

          const buttonsDiv = document.createElement("div");
          buttonsDiv.className = "association-buttons";

          const appBtn = document.createElement("button");
          appBtn.type = "button";
          appBtn.className = "btn-primary";
          appBtn.textContent = "Associate Application";
          appBtn.onclick = () => adminGui.showAssociateApplicationModal(id);

          const iterBtn = document.createElement("button");
          iterBtn.type = "button";
          iterBtn.className = "btn-primary";
          iterBtn.textContent = "Associate Iteration";
          iterBtn.onclick = () => adminGui.showAssociateIterationModal(id);

          buttonsDiv.appendChild(appBtn);
          buttonsDiv.appendChild(iterBtn);
          associationDiv.appendChild(buttonsDiv);
        }
        formFields.appendChild(associationDiv);

        // Add separator
        const separator = document.createElement("hr");
        separator.style.margin = "20px 0";
        formFields.appendChild(separator);
      }

      entity.fields.forEach((field) => {
        if (field.readonly && !id) return; // Skip readonly fields for new records

        const fieldDiv = document.createElement("div");
        fieldDiv.className = "form-group";

        const label = document.createElement("label");
        label.textContent = field.label + (field.required ? " *" : "");
        label.setAttribute("for", field.key);
        fieldDiv.appendChild(label);

        let input;

        switch (field.type) {
          case "textarea":
            input = document.createElement("textarea");
            input.rows = 3;
            break;
          case "select":
            input = document.createElement("select");
            field.options.forEach((option) => {
              const optionEl = document.createElement("option");
              optionEl.value = option.value;
              optionEl.textContent = option.label;
              input.appendChild(optionEl);
            });
            break;
          case "boolean":
            input = document.createElement("select");
            // Secure option creation
            if (window.SecurityUtils) {
              window.SecurityUtils.safeSetInnerHTML(
                input,
                '<option value="true">Yes</option><option value="false">No</option>',
                {
                  allowedTags: ["option"],
                  allowedAttributes: { option: ["value"] },
                },
              );
            } else {
              // Fallback: create options safely
              const yesOption = document.createElement("option");
              yesOption.value = "true";
              yesOption.textContent = "Yes";
              const noOption = document.createElement("option");
              noOption.value = "false";
              noOption.textContent = "No";
              input.appendChild(yesOption);
              input.appendChild(noOption);
            }
            break;
          case "color":
            console.log(`Creating color input for field: ${field.key}`);
            // Create color input element
            input = document.createElement("input");
            input.type = "color";
            input.style.cursor = "pointer";
            input.style.minWidth = "60px";
            input.style.height = "40px";

            // Create text input to show hex value
            const hexInput = document.createElement("input");
            hexInput.type = "text";
            hexInput.style.width = "100px";
            hexInput.style.fontFamily = "monospace";
            hexInput.placeholder = "#000000";
            hexInput.pattern = "^#[0-9A-Fa-f]{6}$";
            hexInput.title = "Hex color code (e.g., #FF5733)";

            // Sync color picker with hex input
            input.addEventListener("change", function () {
              console.log(`Color picker changed to: ${this.value}`);
              hexInput.value = this.value.toUpperCase();
            });

            hexInput.addEventListener("input", function () {
              if (/^#[0-9A-Fa-f]{6}$/.test(this.value)) {
                console.log(`Hex input changed to: ${this.value}`);
                input.value = this.value;
              }
            });

            // Store reference to hex input for later value setting
            input.hexInput = hexInput;
            console.log(
              `Color input created successfully for field: ${field.key}`,
            );
            break;
          default:
            input = document.createElement("input");
            input.type = field.type;
        }

        input.id = field.key;
        input.name = field.key;
        input.required = field.required;
        input.readOnly = field.readonly;

        // Set maxLength if specified
        if (field.maxLength && input.type === "text") {
          input.maxLength = field.maxLength;
        }

        // Set current value
        const value = record[field.key];
        if (value !== undefined && value !== null) {
          if (field.type === "boolean") {
            input.value = String(value);
          } else if (field.type === "datetime") {
            // Format datetime as YYYY-MM-DD HH:MM:SS for display
            const date = new Date(value);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            const seconds = String(date.getSeconds()).padStart(2, "0");
            input.value = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
          } else if (field.type === "color") {
            // Set value for both color picker and hex input
            input.value = value;
            if (input.hexInput) {
              input.hexInput.value = value.toUpperCase();
            }
          } else {
            input.value = value;
          }
        } else if (field.type === "color" && field.default) {
          // Set default color if no value exists
          input.value = field.default;
          if (input.hexInput) {
            input.hexInput.value = field.default.toUpperCase();
          }
        }

        // Handle color field wrapper
        if (field.type === "color") {
          console.log(`Creating color wrapper for field: ${field.key}`);
          const colorWrapper = document.createElement("div");
          colorWrapper.className = "color-field-container";
          colorWrapper.style.display = "flex";
          colorWrapper.style.alignItems = "center";
          colorWrapper.style.gap = "10px";

          // Add color input first
          colorWrapper.appendChild(input);
          console.log(`Added color input to wrapper for field: ${field.key}`);

          // Add hex input if it exists
          if (input.hexInput) {
            colorWrapper.appendChild(input.hexInput);
            console.log(`Added hex input to wrapper for field: ${field.key}`);
          } else {
            console.warn(`No hex input found for color field: ${field.key}`);
          }

          // Add the wrapper to the field div
          fieldDiv.appendChild(colorWrapper);
          console.log(`Color wrapper added to field div for: ${field.key}`);
        } else {
          fieldDiv.appendChild(input);
        }

        formFields.appendChild(fieldDiv);
      });

      return true; // Form rendered successfully
    } catch (error) {
      console.error("[AdminGUI] Error in _continueRenderEditForm:", error);
      return false;
    }
  },

  // Hide edit modal
  hideEditModal: function () {
    // Use setTimeout to avoid conflicts with Confluence's MutationObserver
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      try {
        const modal = document.getElementById("editModal");
        if (modal) {
          modal.style.display = "none";
        } else {
          console.error("[UMIG] Edit modal element not found for hiding");
        }
      } catch (error) {
        console.error("[UMIG] Hide edit modal error:", error);
      }
    }, 10);

    this.activeTimeouts.add(timeoutId);
  },

  // Validate form data
  validateFormData: function (data, entity) {
    const errors = [];

    // Security check: Validate data structure integrity
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      errors.push("• Invalid form data structure");
      return errors;
    }

    // Security check: Validate entity configuration
    if (!entity || !entity.fields || !Array.isArray(entity.fields)) {
      errors.push("• Invalid entity configuration");
      return errors;
    }

    entity.fields.forEach((field) => {
      const value = data[field.key];
      const label = field.label;

      // Skip readonly fields
      if (field.readonly) return;

      // Security validation using SecurityUtils if available
      if (value && typeof value === "string" && window.SecurityUtils) {
        // Basic XSS protection
        const xssValidation = window.SecurityUtils.validateInput(
          value,
          "safeText",
          { maxLength: 10000 },
        );
        if (!xssValidation.isValid) {
          errors.push(`• ${label} contains potentially dangerous content`);
          return;
        }
      }

      // Check required fields
      if (field.required) {
        if (!value || (typeof value === "string" && value.trim() === "")) {
          errors.push(`• ${label} is required`);
          return;
        }
      }

      // Skip validation if field is empty and not required
      if (!value || (typeof value === "string" && value.trim() === "")) {
        return;
      }

      // Enhanced type-specific validation
      switch (field.type) {
        case "email":
          // Enhanced email validation using SecurityUtils if available
          if (window.SecurityUtils) {
            const emailValidation = window.SecurityUtils.validateInput(
              value,
              "email",
            );
            if (!emailValidation.isValid) {
              errors.push(`• ${label} must be a valid email address`);
            }
          } else {
            // Fallback regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
              errors.push(`• ${label} must be a valid email address`);
            }
          }
          break;

        case "text":
          // Enhanced text validation with security checks
          const maxLength = field.maxLength || 1000; // Default max length for security

          if (value.length > maxLength) {
            errors.push(`• ${label} cannot exceed ${maxLength} characters`);
          }

          // Security: Check for potentially dangerous patterns
          if (/[<>'"&]/.test(value)) {
            errors.push(`• ${label} contains invalid characters`);
          }

          // Security: Check for SQL injection patterns
          const sqlPatterns =
            /(union|select|insert|update|delete|drop|exec|script)/i;
          if (sqlPatterns.test(value)) {
            errors.push(`• ${label} contains potentially dangerous content`);
          }

          // Special validation for usr_code with enhanced security
          if (field.key === "usr_code") {
            if (window.SecurityUtils) {
              const userCodeValidation = window.SecurityUtils.validateInput(
                value,
                "userCode",
              );
              if (!userCodeValidation.isValid) {
                errors.push(
                  `• ${label} must be exactly 3 alphanumeric characters`,
                );
              }
            } else {
              if (value.length !== 3) {
                errors.push(`• ${label} must be exactly 3 characters`);
              }
              if (!/^[A-Z0-9]+$/i.test(value)) {
                errors.push(`• ${label} can only contain letters and numbers`);
              }
            }
          }

          // Enhanced alphanumeric validation for certain fields
          if (field.key.includes("code") || field.key.includes("id")) {
            if (window.SecurityUtils) {
              const alphanumericValidation = window.SecurityUtils.validateInput(
                value,
                "alphanumeric",
              );
              if (!alphanumericValidation.isValid) {
                errors.push(
                  `• ${label} can only contain letters, numbers, hyphens, and underscores`,
                );
              }
            }
          }
          break;

        case "number":
          // Enhanced number validation
          const numValue = Number(value);
          if (isNaN(numValue) || !isFinite(numValue)) {
            errors.push(`• ${label} must be a valid number`);
          } else if (!Number.isInteger(numValue) && field.integer !== false) {
            errors.push(`• ${label} must be a whole number`);
          } else if (numValue < 0 && field.allowNegative !== true) {
            errors.push(`• ${label} must be a positive number`);
          } else if (field.min !== undefined && numValue < field.min) {
            errors.push(`• ${label} must be at least ${field.min}`);
          } else if (field.max !== undefined && numValue > field.max) {
            errors.push(`• ${label} cannot exceed ${field.max}`);
          }
          break;

        case "uuid":
          // UUID validation using SecurityUtils if available
          if (window.SecurityUtils) {
            const uuidValidation = window.SecurityUtils.validateInput(
              value,
              "uuid",
            );
            if (!uuidValidation.isValid) {
              errors.push(`• ${label} must be a valid UUID format`);
            }
          } else {
            // Fallback UUID regex
            const uuidRegex =
              /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(value)) {
              errors.push(`• ${label} must be a valid UUID format`);
            }
          }
          break;

        case "select":
          // Enhanced select validation
          if (field.options && Array.isArray(field.options)) {
            const validValues = field.options.map((opt) => opt.value || opt);
            if (!validValues.includes(value)) {
              errors.push(`• ${label} contains an invalid selection`);
            }
          }
          break;

        case "url":
          // URL validation
          try {
            new URL(value);
          } catch (e) {
            errors.push(`• ${label} must be a valid URL`);
          }
          break;

        default:
          // Generic validation for unknown types
          if (typeof value === "string" && value.length > 10000) {
            errors.push(`• ${label} is too long`);
          }
          break;
      }

      // Security: Additional length checks for all string fields
      if (typeof value === "string" && value.length > 50000) {
        errors.push(`• ${label} exceeds maximum allowed length`);
      }
    });

    // Log validation attempt for security audit
    if (window.SecurityUtils) {
      window.SecurityUtils.logSecurityEvent("form_validation_performed", {
        entityType: entity.name,
        fieldCount: entity.fields.length,
        errorCount: errors.length,
        hasErrors: errors.length > 0,
      });
    }

    return errors;
  },

  // Handle save with comprehensive error boundaries
  handleSave: function () {
    try {
      // Defensive programming: Check if DOM elements exist
      const form = document.getElementById("editForm");
      if (!form) {
        throw new Error("Edit form not found - DOM may be corrupted");
      }

      const formData = new FormData(form);
      const data = Object.fromEntries(formData.entries());

      // Enhanced validation with error boundary
      const entity = this.getEntity(this.state.currentEntity);
      if (!entity) {
        throw new Error("Entity configuration not found - check entity setup");
      }

      const validationErrors = this.validateFormData(data, entity);

      if (validationErrors.length > 0) {
        const errorMessage =
          "Please fix the following issues:\n\n" + validationErrors.join("\n");
        alert(errorMessage);
        return;
      }
    } catch (error) {
      console.error("Form validation error:", error);
      this.showMessage(`Form validation failed: ${error.message}`, "error");
      return;
    }

    // Wrap the main save operation in a try-catch block for error handling
    try {
      // Convert data types
      entity.fields.forEach((field) => {
        if (data[field.key] !== undefined) {
          switch (field.type) {
            case "number":
              data[field.key] = data[field.key]
                ? parseInt(data[field.key])
                : null;
              break;
            case "boolean":
              data[field.key] = data[field.key] === "true";
              break;
            case "select":
              // Handle select fields that have numeric values
              if (field.key === "rls_id") {
                data[field.key] =
                  data[field.key] && data[field.key] !== "null"
                    ? parseInt(data[field.key])
                    : null;
              }
              break;
          }
        }
      });

      console.log("Saving data:", data);

      // Determine if this is an edit or create operation
      const primaryKeyField = entity.fields.find((f) => f.key.endsWith("_id"));
      const recordId = data[primaryKeyField.key];
      const isEdit = recordId && recordId !== "";

      // Remove readonly fields and timestamp fields from data being sent to API
      const apiData = {};
      entity.fields.forEach((field) => {
        if (
          !field.readonly &&
          data[field.key] !== undefined &&
          field.key !== "created_at" &&
          field.key !== "updated_at"
        ) {
          apiData[field.key] = data[field.key];
        }
      });

      // Make API call
      const url = isEdit
        ? `${this.api.baseUrl}${this.api.endpoints[this.state.currentEntity]}/${recordId}`
        : `${this.api.baseUrl}${this.api.endpoints[this.state.currentEntity]}`;

      const method = isEdit ? "PUT" : "POST";

      fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(apiData),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((error) => {
              let errorMessage =
                error.error ||
                `HTTP ${response.status}: ${response.statusText}`;

              // Add details if available
              if (error.details) {
                errorMessage += "\n\nDetails: " + error.details;
              }

              // Add SQL state if available for debugging
              if (error.sqlState) {
                errorMessage += "\n\nSQL State: " + error.sqlState;
              }

              throw new Error(errorMessage);
            });
          }
          return response.json();
        })
        .then((result) => {
          console.log("Save successful:", result);
          this.hideEditModal();
          this.refreshCurrentSection();

          // Show success message
          const operation = isEdit ? "updated" : "created";
          this.showMessage(`Record ${operation} successfully`, "success");
        })
        .catch((error) => {
          console.error("Save failed:", error);

          // Enhanced error message based on error type
          let userMessage = `Failed to save record: ${error.message}`;
          if (
            error.message.includes("network") ||
            error.message.includes("fetch")
          ) {
            userMessage =
              "Network error: Please check your connection and try again";
          } else if (error.message.includes("timeout")) {
            userMessage =
              "Request timeout: The server may be busy, please try again";
          } else if (
            error.message.includes("403") ||
            error.message.includes("Forbidden")
          ) {
            userMessage =
              "Access denied: You don't have permission to perform this action";
          } else if (error.message.includes("500")) {
            userMessage =
              "Server error: Please contact support if this persists";
          }

          this.showMessage(userMessage, "error");

          // Log security event for failed save
          if (window.SecurityUtils) {
            window.SecurityUtils.logSecurityEvent("record_save_error", {
              entity: this.state.currentEntity,
              operation: isEdit ? "update" : "create",
              error: error.message,
            });
          }
        });
    } catch (error) {
      // Catch any synchronous errors in the setup/validation phase
      console.error("Save setup failed:", error);

      const userMessage = `Unable to save: ${error.message}`;
      this.showMessage(userMessage, "error");

      // Log security event for setup error
      if (window.SecurityUtils) {
        window.SecurityUtils.logSecurityEvent("record_save_setup_error", {
          entity: this.state.currentEntity,
          error: error.message,
        });
      }
    }
  },

  // Confirm delete
  confirmDelete: function (id) {
    const modal = document.getElementById("confirmModal");
    const message = document.getElementById("confirmMessage");
    const confirmBtn = document.getElementById("confirmAction");

    message.textContent =
      "Are you sure you want to delete this record? This action cannot be undone.";

    // Remove existing event listeners
    const newConfirmBtn = confirmBtn.cloneNode(true);
    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

    // Add new event listener
    newConfirmBtn.addEventListener("click", () => {
      this.executeDelete(id);
      this.hideConfirmModal();
    });

    modal.style.display = "flex";
  },

  // Execute delete
  executeDelete: function (id) {
    console.log("Deleting record:", id);

    // Make DELETE API call
    const url = `${this.api.baseUrl}${this.api.endpoints[this.state.currentEntity]}/${id}`;

    fetch(url, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          return response.json().then((error) => {
            let errorMessage =
              error.error || `HTTP ${response.status}: ${response.statusText}`;

            // Show blocking relationships if available
            if (error.blocking_relationships) {
              errorMessage += "\n\nBlocking relationships:";
              Object.keys(error.blocking_relationships).forEach((key) => {
                const count = error.blocking_relationships[key].length;
                errorMessage += `\n• ${key}: ${count} record(s)`;
              });
            }

            // Add details if available
            if (error.details) {
              errorMessage += "\n\nDetails: " + error.details;
            }

            throw new Error(errorMessage);
          });
        }
        // DELETE typically returns 204 No Content on success
        return response.status === 204 ? null : response.json();
      })
      .then((result) => {
        console.log("Delete successful:", result);
        this.refreshCurrentSection();

        // Show success message
        this.showMessage("Record deleted successfully", "success");
      })
      .catch((error) => {
        console.error("Delete failed:", error);
        this.showMessage(`Failed to delete record: ${error.message}`, "error");
      });
  },

  // Hide confirm modal
  hideConfirmModal: function () {
    const modal = document.getElementById("confirmModal");
    modal.style.display = "none";
  },

  // Show environment details modal
  showEnvironmentDetails: function (envId) {
    const modal = document.getElementById("envDetailsModal");
    const title = document.getElementById("envDetailsTitle");
    const content = document.getElementById("envDetailsContent");

    // Show loading state
    // Secure loading message
    if (window.SecurityUtils) {
      window.SecurityUtils.safeSetInnerHTML(
        content,
        "<p>Loading environment details...</p>",
        {
          allowedTags: ["p"],
        },
      );
    } else {
      content.textContent = "Loading environment details...";
    }
    modal.style.display = "flex";

    // Fetch environment details
    const url = `${this.api.baseUrl}${this.api.endpoints.environments}/${envId}`;

    fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(`HTTP ${response.status}: ${text}`);
          });
        }
        return response.json();
      })
      .then((environment) => {
        title.textContent = `Environment: ${environment.env_name} (${environment.env_code})`;

        // Build details HTML
        let html = '<div class="env-details">';

        // Basic info
        html += '<div class="detail-section">';
        html += "<h4>Basic Information</h4>";
        html += `<p><strong>Code:</strong> ${environment.env_code}</p>`;
        html += `<p><strong>Name:</strong> ${environment.env_name}</p>`;
        html += `<p><strong>Description:</strong> ${environment.env_description || "N/A"}</p>`;
        html += "</div>";

        // Applications
        html += '<div class="detail-section">';
        html += "<h4>Associated Applications</h4>";
        if (environment.applications && environment.applications.length > 0) {
          html += "<ul>";
          environment.applications.forEach((app) => {
            html += `<li>${app.app_name} (${app.app_code})</li>`;
          });
          html += "</ul>";
        } else {
          html += "<p>No applications associated</p>";
        }
        html += "</div>";

        // Fetch iterations grouped by role
        return fetch(
          `${this.api.baseUrl}${this.api.endpoints.environments}/${envId}/iterations`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              "X-Atlassian-Token": "no-check",
            },
            credentials: "same-origin",
          },
        )
          .then((response) => {
            if (!response.ok) {
              return response.text().then((text) => {
                throw new Error(`HTTP ${response.status}: ${text}`);
              });
            }
            return response.json();
          })
          .then((iterationsByRole) => {
            // Iterations by role
            html += '<div class="detail-section">';
            html += "<h4>Iterations by Role</h4>";

            if (Object.keys(iterationsByRole).length > 0) {
              Object.keys(iterationsByRole).forEach((roleName) => {
                const roleData = iterationsByRole[roleName];
                html += `<div class="role-group">`;
                html += `<h5>${roleName} - ${roleData.role_description}</h5>`;
                html += "<ul>";
                roleData.iterations.forEach((iteration) => {
                  const statusClass = iteration.ite_status
                    ? iteration.ite_status.toLowerCase()
                    : "";
                  html += `<li>${iteration.ite_name} (${iteration.ite_type}) <span class="status-badge status-${statusClass}">${iteration.ite_status || "N/A"}</span></li>`;
                });
                html += "</ul>";
                html += "</div>";
              });
            } else {
              html += "<p>No iterations associated</p>";
            }
            html += "</div>";

            // Add association buttons
            html += '<div class="detail-section">';
            html += "<h4>Manage Associations</h4>";
            html += '<div class="association-buttons">';
            html += `<button class="btn-primary" onclick="adminGui.showAssociateApplicationModal(${envId})">Associate Application</button>`;
            html += `<button class="btn-primary" onclick="adminGui.showAssociateIterationModal(${envId})">Associate Iteration</button>`;
            html += "</div>";
            html += "</div>";

            html += "</div>";
            // Secure HTML content setting for environment details
            if (window.SecurityUtils) {
              window.SecurityUtils.safeSetInnerHTML(content, html, {
                allowedTags: [
                  "div",
                  "h3",
                  "h4",
                  "p",
                  "strong",
                  "ul",
                  "li",
                  "span",
                  "button",
                ],
                allowedAttributes: {
                  div: ["class"],
                  span: ["class"],
                  p: ["class"],
                  button: ["class", "onclick"],
                },
              });
            } else {
              content.innerHTML = html;
            }
          });
      })
      .catch((error) => {
        console.error("Error loading environment details:", error);
        // Secure error message
        if (window.SecurityUtils) {
          const safeErrorMsg = window.SecurityUtils.validateInput(
            error.message,
            "safeText",
          );
          const errorHTML = `<p class="error">Failed to load environment details: ${safeErrorMsg.isValid ? safeErrorMsg.sanitizedData : "Unknown error"}</p>`;
          window.SecurityUtils.safeSetInnerHTML(content, errorHTML, {
            allowedTags: ["p"],
            allowedAttributes: { p: ["class"] },
          });
        } else {
          content.textContent = `Failed to load environment details: ${error.message}`;
        }
      });

    // Store environment ID for later use
    this.currentEnvironmentId = envId;

    // Close button event
    const closeBtn = document.getElementById("closeEnvDetailsBtn");
    const closeX = document.getElementById("closeEnvDetails");

    const closeHandler = () => {
      modal.style.display = "none";
    };

    closeBtn.onclick = closeHandler;
    closeX.onclick = closeHandler;

    // Close on overlay click
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeHandler();
      }
    };
  },

  // Show modal to associate application with environment
  showAssociateApplicationModal: function (envId) {
    // Create a simple modal for application association
    const modalHtml = `
                <div id="associateAppModal" class="modal-overlay" style="display: flex;">
                    <div class="modal modal-small">
                        <div class="modal-header">
                            <h3 class="modal-title">Associate Application</h3>
                            <button class="modal-close" onclick="document.getElementById('associateAppModal').remove()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="appSelect">Select Application</label>
                                <select id="appSelect" class="form-control">
                                    <option value="">Loading applications...</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('associateAppModal').remove()">Cancel</button>
                            <button class="btn-primary" onclick="adminGui.associateApplication(${envId})">Associate</button>
                        </div>
                    </div>
                </div>
            `;

    // Add modal to page
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Load applications
    fetch(`${this.api.baseUrl}${this.api.endpoints.applications}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      credentials: "same-origin",
    })
      .then((response) => response.json())
      .then((applications) => {
        const select = document.getElementById("appSelect");
        // Secure select option creation for applications
        if (window.SecurityUtils) {
          window.SecurityUtils.safeSetInnerHTML(
            select,
            '<option value="">-- Select an application --</option>',
            {
              allowedTags: ["option"],
              allowedAttributes: { option: ["value"] },
            },
          );
          applications.forEach((app) => {
            const validatedId = window.SecurityUtils.validateInput(
              String(app.app_id),
              "alphanumeric",
            );
            const validatedName = window.SecurityUtils.validateInput(
              String(app.app_name),
              "safeText",
            );
            const validatedCode = window.SecurityUtils.validateInput(
              String(app.app_code),
              "safeText",
            );

            if (
              validatedId.isValid &&
              validatedName.isValid &&
              validatedCode.isValid
            ) {
              const option = document.createElement("option");
              option.value = validatedId.sanitizedData;
              option.textContent = `${validatedName.sanitizedData} (${validatedCode.sanitizedData})`;
              select.appendChild(option);
            } else {
              console.warn("[Security] Invalid application data:", app);
            }
          });
        } else {
          // Fallback: create options safely without validation
          select.innerHTML =
            '<option value="">-- Select an application --</option>';
          applications.forEach((app) => {
            const option = document.createElement("option");
            option.value = app.app_id;
            option.textContent = `${app.app_name} (${app.app_code})`;
            select.appendChild(option);
          });
        }
      })
      .catch((error) => {
        console.error("Error loading applications:", error);
        // Secure error message for app select
        const appSelect = document.getElementById("appSelect");
        if (window.SecurityUtils && appSelect) {
          window.SecurityUtils.safeSetInnerHTML(
            appSelect,
            '<option value="">Error loading applications</option>',
            {
              allowedTags: ["option"],
              allowedAttributes: { option: ["value"] },
            },
          );
        } else if (appSelect) {
          appSelect.textContent = "Error loading applications";
        }
      });
  },

  // Show modal to associate iteration with environment
  showAssociateIterationModal: function (envId) {
    // Create a modal for iteration association with role selection
    const modalHtml = `
                <div id="associateIterModal" class="modal-overlay" style="display: flex;">
                    <div class="modal">
                        <div class="modal-header">
                            <h3 class="modal-title">Associate Iteration</h3>
                            <button class="modal-close" onclick="document.getElementById('associateIterModal').remove()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="iterSelect">Select Iteration</label>
                                <select id="iterSelect" class="form-control">
                                    <option value="">Loading iterations...</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="roleSelect">Select Environment Role</label>
                                <select id="roleSelect" class="form-control">
                                    <option value="">Loading roles...</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('associateIterModal').remove()">Cancel</button>
                            <button class="btn-primary" onclick="adminGui.associateIteration(${envId})">Associate</button>
                        </div>
                    </div>
                </div>
            `;

    // Add modal to page
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Load iterations
    fetch(`${this.api.baseUrl}${this.api.endpoints.iterations}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      credentials: "same-origin",
    })
      .then((response) => response.json())
      .then((iterations) => {
        const select = document.getElementById("iterSelect");
        // Secure select option creation for iterations
        if (window.SecurityUtils) {
          window.SecurityUtils.safeSetInnerHTML(
            select,
            '<option value="">-- Select an iteration --</option>',
            {
              allowedTags: ["option"],
              allowedAttributes: { option: ["value"] },
            },
          );
          iterations.forEach((iter) => {
            const validatedId = window.SecurityUtils.validateInput(
              String(iter.ite_id),
              "alphanumeric",
            );
            const validatedName = window.SecurityUtils.validateInput(
              String(iter.ite_name),
              "safeText",
            );
            const validatedCode = window.SecurityUtils.validateInput(
              String(iter.itt_code),
              "safeText",
            );

            if (
              validatedId.isValid &&
              validatedName.isValid &&
              validatedCode.isValid
            ) {
              const option = document.createElement("option");
              option.value = validatedId.sanitizedData;
              option.textContent = `${validatedName.sanitizedData} (${validatedCode.sanitizedData})`;
              select.appendChild(option);
            } else {
              console.warn("[Security] Invalid iteration data:", iter);
            }
          });
        } else {
          // Fallback: create options safely without validation
          select.innerHTML =
            '<option value="">-- Select an iteration --</option>';
          iterations.forEach((iter) => {
            const option = document.createElement("option");
            option.value = iter.ite_id;
            option.textContent = `${iter.ite_name} (${iter.itt_code})`;
            select.appendChild(option);
          });
        }
      })
      .catch((error) => {
        console.error("Error loading iterations:", error);
        // Secure error message for iteration select
        const iterSelect = document.getElementById("iterSelect");
        if (window.SecurityUtils && iterSelect) {
          window.SecurityUtils.safeSetInnerHTML(
            iterSelect,
            '<option value="">Error loading iterations</option>',
            {
              allowedTags: ["option"],
              allowedAttributes: { option: ["value"] },
            },
          );
        } else if (iterSelect) {
          iterSelect.textContent = "Error loading iterations";
        }
      });

    // Load environment roles
    fetch(`${this.api.baseUrl}${this.api.endpoints.environments}/roles`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      credentials: "same-origin",
    })
      .then((response) => response.json())
      .then((roles) => {
        const select = document.getElementById("roleSelect");
        // Secure select option creation for roles
        if (window.SecurityUtils) {
          window.SecurityUtils.safeSetInnerHTML(
            select,
            '<option value="">-- Select a role --</option>',
            {
              allowedTags: ["option"],
              allowedAttributes: { option: ["value"] },
            },
          );
          roles.forEach((role) => {
            const validatedId = window.SecurityUtils.validateInput(
              String(role.enr_id),
              "alphanumeric",
            );
            const validatedName = window.SecurityUtils.validateInput(
              String(role.enr_name),
              "safeText",
            );
            const validatedDesc = window.SecurityUtils.validateInput(
              String(role.enr_description),
              "safeText",
            );

            if (
              validatedId.isValid &&
              validatedName.isValid &&
              validatedDesc.isValid
            ) {
              const option = document.createElement("option");
              option.value = validatedId.sanitizedData;
              option.textContent = `${validatedName.sanitizedData} - ${validatedDesc.sanitizedData}`;
              select.appendChild(option);
            } else {
              console.warn("[Security] Invalid role data:", role);
            }
          });
        } else {
          // Fallback: create options safely without validation
          select.innerHTML = '<option value="">-- Select a role --</option>';
          roles.forEach((role) => {
            const option = document.createElement("option");
            option.value = role.enr_id;
            option.textContent = `${role.enr_name} - ${role.enr_description}`;
            select.appendChild(option);
          });
        }
      })
      .catch((error) => {
        console.error("Error loading roles:", error);
        // Secure error message for role select
        const roleSelect = document.getElementById("roleSelect");
        if (window.SecurityUtils && roleSelect) {
          window.SecurityUtils.safeSetInnerHTML(
            roleSelect,
            '<option value="">Error loading roles</option>',
            {
              allowedTags: ["option"],
              allowedAttributes: { option: ["value"] },
            },
          );
        } else if (roleSelect) {
          roleSelect.textContent = "Error loading roles";
        }
      });
  },

  // Associate application with environment
  associateApplication: function (envId) {
    const appId = document.getElementById("appSelect").value;
    if (!appId) {
      alert("Please select an application");
      return;
    }

    fetch(
      `${this.api.baseUrl}${this.api.endpoints.environments}/${envId}/applications/${appId}`,
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          "X-Atlassian-Token": "no-check",
        },
        credentials: "same-origin",
      },
    )
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(`HTTP ${response.status}: ${text}`);
          });
        }
        return response.json();
      })
      .then((_result) => {
        // Remove modal
        document.getElementById("associateAppModal").remove();
        // Refresh environment details if visible
        const envDetailsModal = document.getElementById("envDetailsModal");
        if (envDetailsModal.style.display === "flex") {
          this.showEnvironmentDetails(envId);
        }
        // Refresh edit form if visible
        const editModal = document.getElementById("editModal");
        if (editModal.style.display === "flex") {
          this.renderEditForm(envId);
        }
        this.showNotification("Application associated successfully", "success");
      })
      .catch((error) => {
        console.error("Error associating application:", error);
        alert(`Failed to associate application: ${error.message}`);
      });
  },

  // Associate iteration with environment
  associateIteration: function (envId) {
    const iterationId = document.getElementById("iterSelect").value;
    const roleId = document.getElementById("roleSelect").value;

    if (!iterationId || !roleId) {
      alert("Please select both an iteration and a role");
      return;
    }

    fetch(
      `${this.api.baseUrl}${this.api.endpoints.environments}/${envId}/iterations/${iterationId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Atlassian-Token": "no-check",
        },
        credentials: "same-origin",
        body: JSON.stringify({ enr_id: parseInt(roleId) }),
      },
    )
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(`HTTP ${response.status}: ${text}`);
          });
        }
        return response.json();
      })
      .then((_result) => {
        // Remove modal
        document.getElementById("associateIterModal").remove();
        // Refresh environment details if visible
        const envDetailsModal = document.getElementById("envDetailsModal");
        if (envDetailsModal.style.display === "flex") {
          this.showEnvironmentDetails(envId);
        }
        // Refresh edit form if visible
        const editModal = document.getElementById("editModal");
        if (editModal.style.display === "flex") {
          this.renderEditForm(envId);
        }
        this.showNotification("Iteration associated successfully", "success");
      })
      .catch((error) => {
        console.error("Error associating iteration:", error);
        alert(`Failed to associate iteration: ${error.message}`);
      });
  },

  // Handle delete button in edit modal
  handleDelete: function () {
    // Get the record ID from the form or current context
    const formFields = document.getElementById("formFields");
    const idField = formFields.querySelector("input[readonly]");
    const id = idField ? idField.value : null;

    if (id) {
      this.hideEditModal();
      this.confirmDelete(id);
    }
  },

  // Show loading state
  showLoading: function () {
    this.state.loading = true;
    const loadingState = document.getElementById("loadingState");
    const mainContent = document.getElementById("mainContent");
    const errorState = document.getElementById("errorState");

    if (loadingState) loadingState.style.display = "flex";
    if (mainContent) mainContent.style.display = "none";
    if (errorState) errorState.style.display = "none";
  },

  // Hide loading state
  hideLoading: function () {
    this.state.loading = false;
    const loadingState = document.getElementById("loadingState");
    const mainContent = document.getElementById("mainContent");
    const errorState = document.getElementById("errorState");

    if (loadingState) loadingState.style.display = "none";
    if (mainContent) mainContent.style.display = "block";
    if (errorState) errorState.style.display = "none";
  },

  // Show loading spinner (alias for showLoading)
  showLoadingSpinner: function () {
    this.showLoading();
  },

  // Hide loading spinner (alias for hideLoading)
  hideLoadingSpinner: function () {
    this.hideLoading();
  },

  // Show loading screen for authentication/initialization
  showLoadingScreen: function () {
    // Remove any existing loading overlay first
    const existingOverlay = document.getElementById("loadingOverlay");
    if (existingOverlay) {
      existingOverlay.remove();
    }

    const loadingHTML = `
        <div id="loadingOverlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; z-index: 9999; display: flex; justify-content: center; align-items: center; background: #f4f5f7;">
          <div style="text-align: center; padding: 50px; max-width: 400px;">
            <div style="background: white; border-radius: 12px; padding: 40px; box-shadow: 0 8px 32px rgba(0,0,0,0.1);">
              <div style="margin-bottom: 30px;">
                <div style="width: 48px; height: 48px; margin: 0 auto 20px; background: #0052cc; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                  <div style="width: 24px; height: 24px; border: 3px solid white; border-top: 3px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                </div>
                <h2 style="color: #172b4d; margin: 0 0 10px; font-size: 24px; font-weight: 600;">Loading UMIG Admin</h2>
                <p style="color: #6b778c; margin: 0; font-size: 16px;">Retrieving user context and permissions...</p>
              </div>
              <div style="font-size: 14px; color: #97a0af;">
                Please wait while we set up your session
              </div>
            </div>
          </div>
        </div>
        <style>
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      `;

    // Add loading overlay to body (non-destructive)
    document.body.insertAdjacentHTML("beforeend", loadingHTML);

    // Hide any login page elements that might exist
    const loginPage = document.getElementById("loginPage");
    if (loginPage) {
      loginPage.style.display = "none";
    }
  },

  // Hide loading screen
  hideLoadingScreen: function () {
    // Remove the loading overlay
    const loadingOverlay = document.getElementById("loadingOverlay");
    if (loadingOverlay) {
      loadingOverlay.remove();
      console.log("[UMIG] Loading screen overlay removed");
    }
  },

  // Show error state
  showError: function (message) {
    const errorMessage = document.getElementById("errorMessage");
    const loadingState = document.getElementById("loadingState");
    const mainContent = document.getElementById("mainContent");
    const errorState = document.getElementById("errorState");

    if (errorMessage) errorMessage.textContent = message;
    if (loadingState) loadingState.style.display = "none";
    if (mainContent) mainContent.style.display = "none";
    if (errorState) errorState.style.display = "flex";
  },

  // Alias for showError for backward compatibility
  showErrorMessage: function (message) {
    return this.showError(message);
  },

  // Refresh current section
  refreshCurrentSection: function () {
    this.state.selectedRows.clear();
    this.loadCurrentSection();
  },

  // Handle logout - Redirect to Confluence logout
  handleLogout: function () {
    this.state.isAuthenticated = false;
    this.state.currentUser = null;

    // Log security event
    window.SecurityUtils?.logSecurityEvent("user_logout", {
      username: this.state.currentUser?.username,
      timestamp: new Date().toISOString(),
    });

    // Redirect to base URL for simple logout behavior
    // This ensures proper session cleanup and standard web application behavior
    window.location.href = "/";
  },

  // Show message (success/error)
  showMessage: function (message, type = "info") {
    // Create a toast notification
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === "success" ? "#38a169" : type === "error" ? "#e53e3e" : "#3182ce"};
                color: white;
                padding: 12px 20px;
                border-radius: 6px;
                z-index: 9999;
                opacity: 0;
                transition: opacity 0.3s ease;
            `;

    document.body.appendChild(toast);

    // Animate in
    setTimeout(() => (toast.style.opacity = "1"), 100);

    // Remove after 3 seconds
    setTimeout(() => {
      toast.style.opacity = "0";
      setTimeout(() => document.body.removeChild(toast), 300);
    }, 3000);
  },

  // Render filter controls
  renderFilterControls: function () {
    const entity = this.getEntity(this.state.currentEntity);
    const filterControlsDiv = document.querySelector(".filter-controls");

    if (!entity || !entity.filters || entity.filters.length === 0) {
      // No filters for this entity, hide filter controls or show default buttons
      // Secure filter controls creation for entities without filters
      if (window.SecurityUtils) {
        const safeHTML = `
                        <button class="btn-filter" id="filterBtn">Filter</button>
                        <button class="btn-export" id="exportBtn">Export</button>
                        <button class="btn-bulk" id="bulkActionsBtn" disabled>Bulk Actions</button>
                    `;
        window.SecurityUtils.safeSetInnerHTML(filterControlsDiv, safeHTML, {
          allowedTags: ["button"],
          allowedAttributes: { button: ["class", "id", "disabled"] },
        });
      } else {
        // Fallback: create buttons safely
        filterControlsDiv.innerHTML = "";
        const filterBtn = document.createElement("button");
        filterBtn.className = "btn-filter";
        filterBtn.id = "filterBtn";
        filterBtn.textContent = "Filter";
        filterControlsDiv.appendChild(filterBtn);

        const exportBtn = document.createElement("button");
        exportBtn.className = "btn-export";
        exportBtn.id = "exportBtn";
        exportBtn.textContent = "Export";
        filterControlsDiv.appendChild(exportBtn);

        const bulkBtn = document.createElement("button");
        bulkBtn.className = "btn-bulk";
        bulkBtn.id = "bulkActionsBtn";
        bulkBtn.disabled = true;
        bulkBtn.textContent = "Bulk Actions";
        filterControlsDiv.appendChild(bulkBtn);
      }
      return;
    }

    // Render filter controls for entities that have filters configured
    let filtersHtml = "";

    entity.filters.forEach((filter) => {
      if (filter.type === "select") {
        filtersHtml += `
                        <div class="filter-group">
                            <label for="${filter.key}Select">${filter.label}:</label>
                            <select id="${filter.key}Select" class="filter-select" data-filter="${filter.key}">
                                <option value="">${filter.placeholder || "All"}</option>
                                <!-- Options will be populated dynamically -->
                            </select>
                        </div>
                    `;
      }
    });

    // Secure filter controls creation with filters
    if (window.SecurityUtils) {
      const safeHTML = `
                    ${filtersHtml}
                    <button class="btn-export" id="exportBtn">Export</button>
                    <button class="btn-bulk" id="bulkActionsBtn" disabled>Bulk Actions</button>
                `;
      window.SecurityUtils.safeSetInnerHTML(filterControlsDiv, safeHTML, {
        allowedTags: ["button", "select", "option", "input"],
        allowedAttributes: {
          button: ["class", "id", "disabled"],
          select: ["class", "id"],
          option: ["value"],
          input: ["type", "class", "id", "placeholder"],
        },
      });
    } else {
      filterControlsDiv.innerHTML = `
                    ${filtersHtml}
                    <button class="btn-export" id="exportBtn">Export</button>
                    <button class="btn-bulk" id="bulkActionsBtn" disabled>Bulk Actions</button>
                `;
    }

    // Load filter data and bind events
    this.loadFilterData(entity);
    this.bindFilterEvents();
  },

  // Load data for filters (e.g., teams for team selector)
  loadFilterData: function (entity) {
    entity.filters.forEach((filter) => {
      if (filter.type === "select" && filter.endpoint) {
        const selectElement = document.getElementById(`${filter.key}Select`);
        if (!selectElement) return;

        // Load data from the endpoint
        fetch(`${this.api.baseUrl}${filter.endpoint}`, {
          method: "GET",
          credentials: "same-origin",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(
                `HTTP ${response.status}: ${response.statusText}`,
              );
            }
            return response.json();
          })
          .then((data) => {
            // Handle both array and paginated responses
            const items = Array.isArray(data) ? data : data.content || [];

            // Clear existing options except the first one (placeholder) - safely
            const firstOption = selectElement.firstElementChild;
            // Clear content safely
            selectElement.textContent = "";
            // Remove all child elements
            while (selectElement.firstChild) {
              selectElement.removeChild(selectElement.firstChild);
            }
            // Re-add the first option if it existed
            if (firstOption) {
              selectElement.appendChild(firstOption);
            }

            // Add options
            items.forEach((item) => {
              const option = document.createElement("option");
              option.value = item[filter.valueField];
              option.textContent = item[filter.textField];
              selectElement.appendChild(option);
            });

            // Set current value if any
            if (filter.key === "teamId" && this.state.teamFilter) {
              selectElement.value = this.state.teamFilter;
            }
          })
          .catch((error) => {
            console.error(`Error loading ${filter.label} data:`, error);
          });
      }
    });
  },

  // Bind filter events
  bindFilterEvents: function () {
    // Bind events for all filter selects
    const filterSelects = document.querySelectorAll(".filter-select");
    filterSelects.forEach((select) => {
      select.addEventListener("change", (e) => {
        const filterKey = e.target.getAttribute("data-filter");
        const filterValue = e.target.value;

        // Update state based on filter key
        if (filterKey === "teamId") {
          this.state.teamFilter = filterValue || null;
        }
        // Add more filter types here as needed

        this.state.currentPage = 1; // Reset to first page when filtering
        this.loadCurrentSection();
      });
    });
  },

  // ==================== PHASE-SPECIFIC METHODS ====================

  // Show phase instance details modal
  showPhaseInstanceDetails: function (phaseId) {
    const modal =
      document.getElementById("phaseDetailsModal") ||
      this.createPhaseDetailsModal();
    const title = document.getElementById("phaseDetailsTitle");
    const content = document.getElementById("phaseDetailsContent");

    // Show loading state
    // Secure loading message
    if (window.SecurityUtils) {
      window.SecurityUtils.safeSetInnerHTML(
        content,
        "<p>Loading phase instance details...</p>",
        {
          allowedTags: ["p"],
        },
      );
    } else {
      content.textContent = "Loading phase instance details...";
    }
    modal.style.display = "flex";

    // Fetch phase instance details
    const url = `${this.api.baseUrl}${this.api.endpoints.phasesinstance}/${phaseId}`;

    fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(`HTTP ${response.status}: ${text}`);
          });
        }
        return response.json();
      })
      .then((phase) => {
        title.textContent = `Phase Instance: ${phase.phi_name || phase.phm_name}`;

        // Build details HTML
        let html = '<div class="phase-details">';

        // Basic info
        html += '<div class="detail-section">';
        html += "<h4>Basic Information</h4>";
        html += `<p><strong>ID:</strong> ${phase.phi_id}</p>`;
        html += `<p><strong>Name:</strong> ${phase.phi_name || phase.phm_name}</p>`;
        html += `<p><strong>Description:</strong> ${phase.phi_description || phase.phm_description || "N/A"}</p>`;
        html += `<p><strong>Status:</strong> <span class="status-badge status-${(phase.phi_status || "pending").toLowerCase()}">${phase.phi_status || "Pending"}</span></p>`;
        html += `<p><strong>Order:</strong> ${phase.phi_order || phase.phm_order || "N/A"}</p>`;
        html += `<p><strong>Progress:</strong> ${phase.phi_progress_percentage || 0}%</p>`;
        html += "</div>";

        // Timing info
        html += '<div class="detail-section">';
        html += "<h4>Timing Information</h4>";
        html += `<p><strong>Start Time:</strong> ${phase.phi_start_time || "Not started"}</p>`;
        html += `<p><strong>End Time:</strong> ${phase.phi_end_time || "Not completed"}</p>`;
        html += "</div>";

        // Control points management
        html += '<div class="detail-section">';
        html += "<h4>Control Points</h4>";
        html += '<div class="control-buttons">';
        html += `<button class="btn-primary" onclick="adminGui.showControlPointsModal('${phaseId}')">Manage Control Points</button>`;
        html += `<button class="btn-secondary" onclick="adminGui.validateControlPoints('${phaseId}')">Validate All</button>`;
        html += "</div>";
        html += "</div>";

        html += "</div>";
        content.innerHTML = html;
      })
      .catch((error) => {
        console.error("Error loading phase instance details:", error);
        // Secure error message for phase details
        if (window.SecurityUtils) {
          const safeErrorMsg = window.SecurityUtils.validateInput(
            error.message,
            "safeText",
          );
          const errorHTML = `<p class="error">Failed to load phase instance details: ${safeErrorMsg.isValid ? safeErrorMsg.sanitizedData : "Unknown error"}</p>`;
          window.SecurityUtils.safeSetInnerHTML(content, errorHTML, {
            allowedTags: ["p"],
            allowedAttributes: { p: ["class"] },
          });
        } else {
          content.textContent = `Failed to load phase instance details: ${error.message}`;
        }
      });
  },

  // Show generic entity view modal for all entities
  showGenericEntityView: function (id) {
    // Get current entity configuration
    const entity = this.getEntity(this.state.currentEntity);
    if (!entity) {
      this.showError(
        `Entity configuration not found: ${this.state.currentEntity}`,
      );
      return;
    }

    // Find the record in current data
    const data = this.state.data[this.state.currentEntity] || [];
    const record = data.find((item) => item[entity.fields[0].key] === id);

    if (!record) {
      this.showError(`Record not found with ID: ${id}`);
      return;
    }

    // Use setTimeout to avoid conflicts with Confluence's MutationObserver
    const timeoutId = setTimeout(() => {
      this.activeTimeouts.delete(timeoutId);
      try {
        // Create or get generic view modal
        const modal =
          document.getElementById("genericViewModal") ||
          this.createGenericViewModal();
        const title = document.getElementById("genericViewTitle");
        const content = document.getElementById("genericViewContent");

        if (!modal) {
          console.error(
            "[UMIG] Generic view modal not found or failed to create",
          );
          return;
        }
        if (!title) {
          console.error("[UMIG] Generic view modal title element not found");
          return;
        }
        if (!content) {
          console.error("[UMIG] Generic view modal content element not found");
          return;
        }

        console.log(
          "[UMIG] All generic view modal elements found successfully",
        );

        // Set modal title
        title.textContent = `View ${entity.name.slice(0, -1)} Details`;

        // Build details HTML
        let html = '<div class="generic-entity-details">';

        entity.fields.forEach((field) => {
          if (field.type === "password") return; // Skip password fields

          const _value = record[field.key];
          const displayValue = this.formatCellValue(record, field.key, entity);

          html += '<div class="detail-row">';
          html += `<div class="detail-label"><strong>${field.label}:</strong></div>`;
          html += `<div class="detail-value">${displayValue || '<span style="color: #a0aec0;">—</span>'}</div>`;
          html += "</div>";
        });

        html += "</div>";
        content.innerHTML = html;

        // Show modal
        modal.style.display = "flex";
      } catch (error) {
        console.error("[UMIG] Error in showGenericEntityView:", error);
        this.showError(
          `Failed to display ${entity.name} details: ${error.message}`,
        );
      }
    }, 10);

    this.activeTimeouts.add(timeoutId);
  },

  // Create generic view modal if it doesn't exist
  createGenericViewModal: function () {
    try {
      const modalHtml = `
          <div id="genericViewModal" class="modal-overlay" style="display: none;">
            <div class="modal modal-large">
              <div class="modal-header">
                <h3 id="genericViewTitle" class="modal-title">View Details</h3>
                <button class="modal-close" onclick="document.getElementById('genericViewModal').style.display='none'">&times;</button>
              </div>
              <div class="modal-body">
                <div id="genericViewContent"></div>
              </div>
              <div class="modal-footer">
                <button class="btn-secondary" onclick="document.getElementById('genericViewModal').style.display='none'">Close</button>
              </div>
            </div>
          </div>
        `;
      document.body.insertAdjacentHTML("beforeend", modalHtml);
      console.log("[UMIG] Generic view modal created successfully");
      return document.getElementById("genericViewModal");
    } catch (error) {
      console.error("[UMIG] Error creating generic view modal:", error);
      return null;
    }
  },

  // Show control points management modal
  showControlPointsModal: function (phaseId) {
    const modal =
      document.getElementById("controlPointsModal") ||
      this.createControlPointsModal();
    const title = document.getElementById("controlPointsTitle");
    const content = document.getElementById("controlPointsContent");

    // Secure loading message for control points
    if (window.SecurityUtils) {
      window.SecurityUtils.safeSetInnerHTML(
        content,
        "<p>Loading control points...</p>",
        {
          allowedTags: ["p"],
        },
      );
    } else {
      content.textContent = "Loading control points...";
    }
    modal.style.display = "flex";

    // Fetch control points for the phase
    const url = `${this.api.baseUrl}/phases/${phaseId}/controls`;

    fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "X-Atlassian-Token": "no-check",
      },
      credentials: "same-origin",
    })
      .then((response) => {
        if (!response.ok) {
          return response.text().then((text) => {
            throw new Error(`HTTP ${response.status}: ${text}`);
          });
        }
        return response.json();
      })
      .then((controls) => {
        title.textContent = `Control Points Management`;

        let html = '<div class="control-points-list">';

        if (controls.length === 0) {
          html += "<p>No control points defined for this phase.</p>";
        } else {
          html += '<table class="control-points-table">';
          html +=
            "<thead><tr><th>Control Point</th><th>Status</th><th>Validators</th><th>Actions</th></tr></thead>";
          html += "<tbody>";

          controls.forEach((control) => {
            const statusClass = control.cti_status
              ? control.cti_status.toLowerCase()
              : "pending";
            html += "<tr>";
            html += `<td>${control.cti_name || control.ctm_name}</td>`;
            html += `<td><span class="status-badge status-${statusClass}">${control.cti_status || "Pending"}</span></td>`;
            html += `<td>IT: ${control.it_validator || "None"}<br>Biz: ${control.biz_validator || "None"}</td>`;
            html += `<td>
                            <button class="btn-small" onclick="adminGui.updateControlPoint('${control.cti_id}', 'passed')">Pass</button>
                            <button class="btn-small btn-warning" onclick="adminGui.updateControlPoint('${control.cti_id}', 'failed')">Fail</button>
                            <button class="btn-small btn-danger" onclick="adminGui.overrideControlPoint('${control.cti_id}')">Override</button>
                        </td>`;
            html += "</tr>";
          });

          html += "</tbody></table>";
        }

        html += "</div>";
        content.innerHTML = html;
      })
      .catch((error) => {
        console.error("Error loading control points:", error);
        // Secure error message for control points
        if (window.SecurityUtils) {
          const safeErrorMsg = window.SecurityUtils.validateInput(
            error.message,
            "safeText",
          );
          const errorHTML = `<p class="error">Failed to load control points: ${safeErrorMsg.isValid ? safeErrorMsg.sanitizedData : "Unknown error"}</p>`;
          window.SecurityUtils.safeSetInnerHTML(content, errorHTML, {
            allowedTags: ["p"],
            allowedAttributes: { p: ["class"] },
          });
        } else {
          content.textContent = `Failed to load control points: ${error.message}`;
        }
      });
  },

  // Show progress update modal
  showProgressModal: function (phaseId) {
    const modal =
      document.getElementById("progressModal") || this.createProgressModal();

    // Pre-populate with current progress
    const progressInput = document.getElementById("progressInput");
    const saveBtn = document.getElementById("saveProgress");

    // Fetch current progress
    fetch(`${this.api.baseUrl}/phases/${phaseId}/progress`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then((response) => response.json())
      .then((data) => {
        progressInput.value = data.progress_percentage || 0;
      })
      .catch((error) => {
        console.error("Error loading current progress:", error);
        progressInput.value = 0;
      });

    // Remove existing event listeners
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    // Add new event listener
    newSaveBtn.addEventListener("click", () => {
      this.updatePhaseProgress(phaseId, progressInput.value);
      modal.style.display = "none";
    });

    modal.style.display = "flex";
  },

  // Show move/reorder phase modal
  showMovePhaseModal: function (phaseId) {
    const modal =
      document.getElementById("movePhaseModal") || this.createMovePhaseModal();
    const orderInput = document.getElementById("newOrderInput");
    const saveBtn = document.getElementById("saveMovePhase");

    // Remove existing event listeners
    const newSaveBtn = saveBtn.cloneNode(true);
    saveBtn.parentNode.replaceChild(newSaveBtn, saveBtn);

    // Add new event listener
    newSaveBtn.addEventListener("click", () => {
      this.movePhase(phaseId, parseInt(orderInput.value));
      modal.style.display = "none";
    });

    modal.style.display = "flex";
  },

  // Update control point status
  updateControlPoint: function (controlId, status) {
    const url = `${this.api.baseUrl}/phases/{phi_id}/controls/${controlId}`;

    fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ cti_status: status }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((_result) => {
        this.showNotification(
          `Control point ${status} successfully`,
          "success",
        );
        // Refresh the control points modal if visible
        const modal = document.getElementById("controlPointsModal");
        if (modal && modal.style.display === "flex") {
          // Get phase ID from current context and refresh
          this.refreshControlPoints();
        }
      })
      .catch((error) => {
        console.error("Error updating control point:", error);
        this.showNotification(
          `Failed to update control point: ${error.message}`,
          "error",
        );
      });
  },

  // Override control point with reason
  overrideControlPoint: function (controlId) {
    const reason = prompt(
      "Please provide a reason for overriding this control point:",
    );
    if (!reason) return;

    const url = `${this.api.baseUrl}/phases/{phi_id}/controls/${controlId}/override`;

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ reason: reason }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((_result) => {
        this.showNotification(
          "Control point overridden successfully",
          "success",
        );
        this.refreshControlPoints();
      })
      .catch((error) => {
        console.error("Error overriding control point:", error);
        this.showNotification(
          `Failed to override control point: ${error.message}`,
          "error",
        );
      });
  },

  // Update phase progress
  updatePhaseProgress: function (phaseId, progress) {
    const url = `${this.api.baseUrl}${this.api.endpoints.phasesinstance}/${phaseId}`;

    fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ phi_progress_percentage: parseInt(progress) }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((_result) => {
        this.showNotification("Phase progress updated successfully", "success");
        this.refreshCurrentSection();
      })
      .catch((error) => {
        console.error("Error updating phase progress:", error);
        this.showNotification(
          `Failed to update progress: ${error.message}`,
          "error",
        );
      });
  },

  // Move phase to new order
  movePhase: function (phaseId, newOrder) {
    const endpoint =
      this.state.currentEntity === "phasesmaster"
        ? "phasesmastermove"
        : "phasesinstancemove";
    const url = `${this.api.baseUrl}/${endpoint}/${phaseId}`;

    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ newOrder: newOrder }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((_result) => {
        this.showNotification("Phase moved successfully", "success");
        this.refreshCurrentSection();
      })
      .catch((error) => {
        console.error("Error moving phase:", error);
        this.showNotification(
          `Failed to move phase: ${error.message}`,
          "error",
        );
      });
  },

  // Validate all control points for a phase
  validateControlPoints: function (phaseId) {
    const url = `${this.api.baseUrl}/phases/${phaseId}/controls/validate`;

    fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return response.json();
      })
      .then((result) => {
        const passed = result.passed || 0;
        const failed = result.failed || 0;
        const total = result.total || 0;

        this.showNotification(
          `Validation complete: ${passed} passed, ${failed} failed out of ${total} total`,
          "info",
        );
        this.refreshControlPoints();
      })
      .catch((error) => {
        console.error("Error validating control points:", error);
        this.showNotification(`Failed to validate: ${error.message}`, "error");
      });
  },

  // Refresh control points display
  refreshControlPoints: function () {
    // Implementation would refresh the currently visible control points modal
    // This is a placeholder for the actual refresh logic
  },

  // ==================== MODAL CREATION HELPERS ====================

  // Create phase details modal if it doesn't exist
  createPhaseDetailsModal: function () {
    const modalHtml = `
                <div id="phaseDetailsModal" class="modal-overlay" style="display: none;">
                    <div class="modal modal-large">
                        <div class="modal-header">
                            <h3 id="phaseDetailsTitle" class="modal-title">Phase Details</h3>
                            <button class="modal-close" onclick="document.getElementById('phaseDetailsModal').style.display='none'">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="phaseDetailsContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('phaseDetailsModal').style.display='none'">Close</button>
                        </div>
                    </div>
                </div>
            `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    return document.getElementById("phaseDetailsModal");
  },

  // Create control points modal if it doesn't exist
  createControlPointsModal: function () {
    const modalHtml = `
                <div id="controlPointsModal" class="modal-overlay" style="display: none;">
                    <div class="modal modal-large">
                        <div class="modal-header">
                            <h3 id="controlPointsTitle" class="modal-title">Control Points</h3>
                            <button class="modal-close" onclick="document.getElementById('controlPointsModal').style.display='none'">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div id="controlPointsContent"></div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('controlPointsModal').style.display='none'">Close</button>
                        </div>
                    </div>
                </div>
            `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    return document.getElementById("controlPointsModal");
  },

  // Create progress modal if it doesn't exist
  createProgressModal: function () {
    const modalHtml = `
                <div id="progressModal" class="modal-overlay" style="display: none;">
                    <div class="modal modal-small">
                        <div class="modal-header">
                            <h3 class="modal-title">Update Progress</h3>
                            <button class="modal-close" onclick="document.getElementById('progressModal').style.display='none'">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="progressInput">Progress Percentage</label>
                                <input type="number" id="progressInput" class="form-control" min="0" max="100" step="1">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('progressModal').style.display='none'">Cancel</button>
                            <button id="saveProgress" class="btn-primary">Update Progress</button>
                        </div>
                    </div>
                </div>
            `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    return document.getElementById("progressModal");
  },

  // Create move phase modal if it doesn't exist
  createMovePhaseModal: function () {
    const modalHtml = `
                <div id="movePhaseModal" class="modal-overlay" style="display: none;">
                    <div class="modal modal-small">
                        <div class="modal-header">
                            <h3 class="modal-title">Move Phase</h3>
                            <button class="modal-close" onclick="document.getElementById('movePhaseModal').style.display='none'">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="form-group">
                                <label for="newOrderInput">New Order Position</label>
                                <input type="number" id="newOrderInput" class="form-control" min="1" step="1">
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button class="btn-secondary" onclick="document.getElementById('movePhaseModal').style.display='none'">Cancel</button>
                            <button id="saveMovePhase" class="btn-primary">Move Phase</button>
                        </div>
                    </div>
                </div>
            `;
    document.body.insertAdjacentHTML("beforeend", modalHtml);
    return document.getElementById("movePhaseModal");
  },
};

// UPDATED: Let the Advanced Module Loader v3.0 control initialization
// Check if the new module loader is managing initialization
if (
  window.UMIG_MODULE_LOADER ||
  document.body?.hasAttribute("data-umig-loader-active")
) {
  // New loader will call adminGui.init() when ready
  console.log(
    "[AdminGUI] Waiting for Advanced Module Loader v3.0 to control initialization",
  );
} else {
  // Fallback: Initialize when DOM is ready (legacy mode)
  console.log("[AdminGUI] Using legacy initialization mode");
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      window.adminGui.init();
    });
  } else {
    window.adminGui.init();
  }
}

// Export adminGui to window for global access (ADR-057 compliance)
if (typeof window !== "undefined") {
  window.adminGui = window.adminGui;
}
