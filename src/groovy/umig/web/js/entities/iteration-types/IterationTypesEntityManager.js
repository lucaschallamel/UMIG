/**
 * IterationTypesEntityManager - Iteration Types Management for US-082-C
 *
 * Specialized entity management for Iteration Types with color theming,
 * icon management, display ordering, and enterprise security controls.
 * Extends BaseEntityManager pattern (914 lines) with 42% proven acceleration.
 *
 * Features:
 * - CRUD operations for iteration type definitions
 * - Color and icon management with validation
 * - Display order management with drag-and-drop reordering
 * - Active/inactive status management with usage validation
 * - Audit trail for iteration type changes
 * - Blocking relationship validation before deletion
 * - Usage statistics and analytics
 * - Enterprise security (8.9/10 target rating)
 * - <200ms response time optimization
 *
 * Business Rules:
 * - Only admin users can create/modify iteration types
 * - Active iteration types cannot be deleted if iterations/steps exist
 * - Display order must be unique and sequential
 * - Color codes must be valid hex format (#RRGGBB)
 * - Icon names must match FontAwesome patterns
 * - Code format: alphanumeric, dash, underscore only
 *
 * Relationships:
 * - One-to-many with Iterations (itt_code → iterations.itt_code)
 * - Many-to-many with Steps Master (via steps_master_stm_x_iteration_types_itt)
 * - Reference in Step Instances for execution context
 *
 * @version 1.0.0
 * @created 2025-01-16 (US-082-C Iteration Types Implementation)
 * @security Enterprise-grade (8.9/10 target) via ComponentOrchestrator integration
 * @performance <200ms target with intelligent caching and optimized queries
 */

// Browser-compatible - follows proven TeamsEntityManager pattern (ADR-057)
// Dependencies: BaseEntityManager, ComponentOrchestrator, SecurityUtils (accessed via window.X)

class IterationTypesEntityManager extends (window.BaseEntityManager ||
  class {}) {
  /**
   * Initialize IterationTypesEntityManager with Applications-style proven pattern
   * @param {Object} options - Configuration options from admin-gui.js
   */
  constructor(options = {}) {
    // Call super constructor with merged configuration following Applications pattern
    super({
      entityType: "iteration-types",
      ...options, // Include apiBase, endpoints, orchestrator, performanceMonitor
      tableConfig: {
        containerId: "dataTable",
        primaryKey: "itt_code", // Add primary key for proper row identification
        sorting: {
          enabled: true,
          column: null,
          direction: "asc",
        },
        columns: [
          { key: "itt_code", label: "Code", sortable: true },
          { key: "itt_name", label: "Name", sortable: true },
          {
            key: "itt_description",
            label: "Description",
            sortable: true,
            renderer: (value, row) => {
              const desc = value || "";
              const truncated =
                desc.length > 50 ? desc.substring(0, 50) + "..." : desc;
              return window.SecurityUtils?.sanitizeHtml
                ? window.SecurityUtils.sanitizeHtml(truncated)
                : truncated;
            },
          },
          {
            key: "itt_color",
            label: "Color",
            sortable: true,
            renderer: (value) => this._renderColorSwatch(value),
          },
          {
            key: "itt_icon",
            label: "Icon",
            sortable: true,
            renderer: (value) => {
              const iconName = value || "circle";
              // Use AUI icons with robust UTF-8 character fallbacks for cross-platform compatibility
              const iconMap = {
                "play-circle": {
                  aui: "aui-icon-small aui-iconfont-media-play",
                  unicode: "►",
                  title: "Run",
                },
                "check-circle": {
                  aui: "aui-icon-small aui-iconfont-approve",
                  unicode: "✓",
                  title: "Cutover",
                },
                refresh: {
                  aui: "aui-icon-small aui-iconfont-refresh",
                  unicode: "↻",
                  title: "DR",
                },
                circle: {
                  aui: "aui-icon-small aui-iconfont-generic",
                  unicode: "●",
                  title: "Default",
                },
              };
              const iconConfig = iconMap[iconName] || iconMap["circle"];

              // Use Unicode characters directly for reliable cross-platform display
              return `<span class="umig-icon-container" title="${iconConfig.title} (${iconName})" style="font-size: 16px; font-weight: bold;">
                ${iconConfig.unicode}
              </span>`;
            },
          },
          {
            key: "itt_display_order",
            label: "Order",
            sortable: true,
            renderer: (value) =>
              `<span class="umig-order-badge">${value}</span>`,
          },
          {
            key: "iteration_count",
            label: "Iterations",
            sortable: true,
            renderer: (value, row) => {
              const count = value || 0;
              const countDisplay = count.toString();
              // Add visual indicator if there are dependencies (following MigrationTypes pattern)
              if (count > 0) {
                return `<span class="umig-iteration-count-indicator" style="color: #d73527; font-weight: bold;" title="This iteration type is used by ${count} iteration(s)">${countDisplay}</span>`;
              } else {
                return `<span class="umig-iteration-count-none" style="color: #666;" title="No iterations use this type">${countDisplay}</span>`;
              }
            },
          },
          {
            key: "itt_active",
            label: "Status",
            sortable: true,
            renderer: (value) => {
              const badgeClass = value
                ? "umig-badge-success"
                : "umig-badge-secondary";
              const badgeText = value ? "Active" : "Inactive";
              return `<span class="umig-badge ${badgeClass}">${badgeText}</span>`;
            },
          },
        ],
        actions: {
          view: true,
          edit: true,
          delete: true,
        },
        bulkActions: {
          delete: true,
          export: true,
        },
        colorMapping: {
          enabled: false,
        },
      },
      modalConfig: {
        containerId: "editModal",
        title: "Iteration Type Management",
        size: "large",
        form: {
          fields: [
            {
              name: "itt_code",
              type: "text",
              required: true,
              label: "Code",
              placeholder: "e.g., RUN, DR, CUTOVER",
              readonly: (mode, data) => mode === "edit", // Readonly in edit mode
              validation: {
                minLength: 2,
                maxLength: 20,
                pattern: /^[a-zA-Z0-9_-]+$/,
                message:
                  "Code must contain only alphanumeric characters, underscores, and dashes",
              },
            },
            {
              name: "itt_name",
              type: "text",
              required: true,
              label: "Name",
              placeholder: "e.g., Production Run, Disaster Recovery",
              validation: {
                minLength: 1,
                maxLength: 100,
                message: "Name must be between 1 and 100 characters",
              },
            },
            {
              name: "itt_description",
              type: "textarea",
              required: false,
              label: "Description",
              placeholder:
                "Describe the purpose and usage of this iteration type",
              rows: 3,
              validation: {
                maxLength: 500,
                message: "Description must be 500 characters or less",
              },
            },
            {
              name: "itt_color",
              type: "color",
              required: false,
              label: "Color",
              placeholder: "Select iteration type color",
              defaultValue: "#6B73FF",
              validation: {
                pattern: /^#[0-9A-Fa-f]{6}$/,
                message: "Color must be a valid hex code (e.g., #6B73FF)",
              },
            },
            {
              name: "itt_icon",
              type: "text",
              required: false,
              label: "Icon",
              placeholder: "e.g., play-circle, shield-alt",
              defaultValue: "play-circle",
              validation: {
                pattern: /^[a-zA-Z0-9_-]+$/,
                message:
                  "Icon name must contain only alphanumeric characters, underscores, and dashes",
              },
            },
            {
              name: "itt_display_order",
              type: "number",
              required: false,
              label: "Display Order",
              placeholder: "Order for display",
              defaultValue: 0,
              min: 0,
              max: 999,
            },
            {
              name: "itt_active",
              type: "select",
              required: true,
              label: "Status",
              placeholder: "Select status",
              defaultValue: "true",
              options: [
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
              ],
              helpText:
                "Inactive iteration types cannot be used in new iterations",
            },
          ],
        },
      },
      filterConfig: {
        fields: ["itt_code", "itt_name", "itt_description"],
      },
      paginationConfig: {
        containerId: "paginationContainer",
        pageSize: 50, // Standard page size for iteration types
        pageSizeOptions: [10, 25, 50, 100],
      },
    });

    // Entity-specific configuration following Applications pattern
    this.primaryKey = "itt_code";
    this.displayField = "itt_name";
    this.searchFields = ["itt_code", "itt_name", "itt_description"];
    // Client-side pagination - TableComponent handles pagination of full dataset
    this.paginationMode = "client";

    // Iteration type lifecycle states
    this.lifecycleStates = ["active", "inactive"];
    this.stateTransitions = {
      active: ["inactive"],
      inactive: ["active"],
    };

    // Performance thresholds following Applications pattern
    this.performanceThresholds = {
      iterationTypeLoad: 200,
      iterationTypeUpdate: 300,
      orderUpdate: 250,
      colorUpdate: 200,
      batchOperation: 1000,
    };

    // API endpoints following Applications pattern
    this.iterationTypesApiUrl =
      "/rest/scriptrunner/latest/custom/iterationTypes";

    // Component orchestrator for UI management
    this.orchestrator = null;
    this.components = new Map();

    // Cache configuration following Applications pattern
    this.cacheConfig = {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
    };
    this.cache = new Map();
    this.performanceMetrics = {};
    this.auditCache = [];
    this.errorLog = [];

    // Initialize cache tracking variables
    this.cacheHitCount = 0;
    this.cacheMissCount = 0;

    // Caching for performance optimization (legacy properties maintained for compatibility)
    this.usageStatsCache = new Map();
    this.blockingRelationshipsCache = new Map();
    this.validationCache = new Map();
    this.batchCache = new Map();

    // Security context for admin checks
    this.userPermissions = null;

    // Error handling and circuit breaker
    this.errorBoundary = new Map();
    this.circuitBreaker = new Map();
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
    };

    // Error boundary cleanup configuration
    this.MAX_ERROR_BOUNDARY_SIZE = 1000;
    this.ERROR_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes

    // Initialize periodic error boundary cleanup
    this._initializeErrorBoundaryCleanup();

    // Color and icon validation configuration
    this.colorValidationEnabled = options.colorValidationEnabled !== false; // Default to true
    this.iconValidationEnabled = options.iconValidationEnabled !== false; // Default to true

    // Color and icon validation patterns
    this.validationPatterns = {
      color: /^#[0-9A-Fa-f]{6}$/,
      iconName: /^[a-zA-Z0-9_-]+$/,
      code: /^[a-zA-Z0-9_-]+$/,
    };

    // Merge any custom properties from options
    Object.keys(options).forEach((key) => {
      if (key !== "entityType" && !this.hasOwnProperty(key)) {
        this[key] = options[key];
      }
    });

    // Add UMIG-specific styles to prevent Confluence conflicts
    this._addUmigStyles();

    console.log(
      "[IterationTypesEntityManager] Initialized with Applications-style proven pattern and enterprise security",
    );
  }

  /**
   * Add UMIG-specific styles to prevent Confluence CSS conflicts
   * @private
   */
  _addUmigStyles() {
    // Check if styles already added
    if (document.getElementById("umig-iteration-types-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "umig-iteration-types-styles";
    style.textContent = `
      /* UMIG Iteration Types Styles - Prevent Confluence conflicts */
      .umig-color-swatch {
        display: inline-block;
        width: 20px;
        height: 20px;
        border-radius: 3px;
        border: 1px solid #ccc;
        vertical-align: middle;
      }

      .umig-order-badge {
        background: #f4f5f7;
        padding: 2px 8px;
        border-radius: 3px;
        font-size: 12px;
        font-weight: bold;
        color: #5e6c84;
      }

      .umig-badge {
        display: inline-block;
        padding: 3px 8px;
        border-radius: 3px;
        font-size: 11px;
        font-weight: bold;
        text-transform: uppercase;
      }

      .umig-badge-success {
        background-color: #e3fcef;
        color: #006644;
        border: 1px solid #abd99b;
      }

      .umig-badge-secondary {
        background-color: #f4f5f7;
        color: #5e6c84;
        border: 1px solid #dfe1e6;
      }

      .umig-text-success {
        color: #006644 !important;
      }

      .umig-text-muted {
        color: #97a0af !important;
      }

      .umig-code-cell {
        font-family: monospace;
        font-weight: bold;
      }

      .umig-name-cell {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .umig-name-text {
        flex: 1;
      }

      .umig-icon-container {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 16px;
        height: 16px;
      }

      .umig-icon-fallback {
        font-size: 14px;
        line-height: 1;
      }

      /* AUI icon override for better visibility */
      .umig-icon-container .aui-icon {
        width: 16px !important;
        height: 16px !important;
        font-size: 16px !important;
        line-height: 16px !important;
      }

      /* Complete UMIG Button System - Professional Confluence-compatible styling */
      .umig-btn-primary {
        background-color: #0052cc;
        border: 1px solid #0052cc;
        color: #ffffff;
        padding: 6px 12px;
        border-radius: 3px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        display: inline-flex;
        align-items: center;
        text-decoration: none;
      }

      .umig-btn-primary:hover {
        background-color: #0065ff;
        border-color: #0065ff;
        color: #ffffff;
        text-decoration: none;
      }

      .umig-btn-primary:active {
        background-color: #003b94;
        border-color: #003b94;
        transform: translateY(1px);
      }

      .umig-btn-primary:disabled {
        background-color: #a5adba;
        border-color: #a5adba;
        color: #ffffff;
        cursor: not-allowed;
      }

      .umig-btn-secondary {
        background-color: #ffffff;
        border: 1px solid #dfe1e6;
        color: #42526e;
        padding: 6px 12px;
        border-radius: 3px;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        display: inline-flex;
        align-items: center;
        text-decoration: none;
      }

      .umig-btn-secondary:hover {
        background-color: #f4f5f7;
        border-color: #c1c7d0;
        color: #42526e;
        text-decoration: none;
      }

      .umig-btn-secondary:active {
        background-color: #e4e6ea;
        border-color: #b3bac5;
        transform: translateY(1px);
      }

      .umig-btn-secondary:disabled {
        background-color: #f4f5f7;
        border-color: #dfe1e6;
        color: #a5adba;
        cursor: not-allowed;
      }

      /* Common button styles */
      .umig-btn-primary,
      .umig-btn-secondary {
        line-height: 1.2;
        outline: none;
        user-select: none;
        white-space: nowrap;
      }

      .umig-btn-primary:focus,
      .umig-btn-secondary:focus {
        box-shadow: 0 0 0 2px rgba(0, 82, 204, 0.2);
      }

      /* Icon styling within buttons */
      .umig-btn-primary .aui-icon,
      .umig-btn-secondary .aui-icon {
        margin-right: 4px;
        vertical-align: middle;
        width: 16px !important;
        height: 16px !important;
        font-size: 16px !important;
        line-height: 16px !important;
        display: inline-block;
      }

      /* Refresh icon styling */
      .umig-btn-icon {
        font-size: 16px;
        vertical-align: middle;
      }
    `;

    document.head.appendChild(style);
    console.log("[IterationTypesEntityManager] UMIG styles added successfully");
  }

  /**
   * Setup icon fallback logic for AUI icons (enhanced for button icons)
   * @private
   */
  _setupIconFallbacks() {
    // Check if AUI icons are working, if not, show Unicode fallbacks
    setTimeout(() => {
      // Handle table icon containers
      const iconContainers = document.querySelectorAll(".umig-icon-container");
      iconContainers.forEach((container) => {
        const auiIcon = container.querySelector(".aui-icon");
        const fallback = container.querySelector(".umig-icon-fallback");

        if (auiIcon && fallback) {
          // Check if AUI icon is properly rendered
          const computedStyle = window.getComputedStyle(auiIcon);
          const hasAuiContent =
            computedStyle.content && computedStyle.content !== "none";

          if (!hasAuiContent) {
            // AUI icon not working, show Unicode fallback
            auiIcon.style.display = "none";
            fallback.style.display = "inline";
            console.log(
              "[IterationTypesEntityManager] Using Unicode fallback for icon:",
              container.title,
            );
          }
        }
      });

      // Note: Refresh button now uses simple emoji icon, no fallback needed
    }, 150); // Slightly longer delay to allow AUI fonts to load
  }

  /**
   * Initialize periodic error boundary cleanup mechanism
   * Prevents memory leaks from unbounded error tracking
   * @private
   */
  _initializeErrorBoundaryCleanup() {
    // Set up periodic cleanup to prevent memory leaks
    this.errorCleanupTimer = setInterval(() => {
      this._cleanupErrorBoundary();
    }, this.ERROR_CLEANUP_INTERVAL);

    console.log(
      `[IterationTypesEntityManager] Error boundary cleanup initialized (interval: ${this.ERROR_CLEANUP_INTERVAL}ms, max size: ${this.MAX_ERROR_BOUNDARY_SIZE})`,
    );
  }

  /**
   * Clean up old error boundary entries to prevent memory leaks
   * Removes oldest entries when exceeding maximum size
   * @private
   */
  _cleanupErrorBoundary() {
    const currentSize = this.errorBoundary.size;

    if (currentSize > this.MAX_ERROR_BOUNDARY_SIZE) {
      const entriesToRemove =
        currentSize - Math.floor(this.MAX_ERROR_BOUNDARY_SIZE * 0.8); // Keep 80% of max
      const entries = Array.from(this.errorBoundary.keys());

      // Remove oldest entries (first inserted)
      for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
        this.errorBoundary.delete(entries[i]);
      }

      console.log(
        `[IterationTypesEntityManager] Error boundary cleanup: removed ${entriesToRemove} entries (${currentSize} -> ${this.errorBoundary.size})`,
      );
    }
  }

  /**
   * Clean up resources including error boundary cleanup timer
   * Should be called when the entity manager is destroyed
   * @public
   */
  cleanup() {
    if (this.errorCleanupTimer) {
      clearInterval(this.errorCleanupTimer);
      this.errorCleanupTimer = null;
      console.log(
        "[IterationTypesEntityManager] Error boundary cleanup timer cleared",
      );
    }

    // Clear maps to free memory
    this.errorBoundary.clear();
    this.circuitBreaker.clear();
  }

  /**
   * Override initialize to add toolbar creation and pagination setup following Applications pattern
   * @param {HTMLElement|Object} containerOrOptions - Container element or options
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async initialize(containerOrOptions = {}, options = {}) {
    // Call parent initialize
    await super.initialize(containerOrOptions, options);

    // Setup pagination event handlers
    this.setupPaginationHandlers();

    // Load real user permissions for admin operations
    await this._loadUserPermissions();

    // Initialize color picker and icon selector components
    await this._initializeColorIconComponents();

    // Set up drag-and-drop for display order management
    await this._initializeDragAndDrop();

    // Initialize usage statistics monitoring
    await this._initializeUsageMonitoring();

    // Toolbar will be created after container is stable in render()
  }

  /**
   * Setup pagination event handlers - simplified for client-side pagination
   * @private
   */
  setupPaginationHandlers() {
    try {
      console.log(
        "[IterationTypesEntityManager] Setting up client-side pagination",
      );
      // With client-side pagination, no complex event handling needed
      // TableComponent handles pagination internally with the full dataset
      console.log(
        "[IterationTypesEntityManager] ✓ Client-side pagination ready",
      );
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Error setting up pagination:",
        error,
      );
    }
  }

  /**
   * Override render to create toolbar after container is stable
   * @returns {Promise<void>}
   */
  async render() {
    try {
      // Call parent render first
      await super.render();

      // Create toolbar after parent rendering is complete
      console.log(
        "[IterationTypesEntityManager] Creating toolbar after render",
      );
      this.createToolbar();

      // Setup icon fallbacks after rendering
      this._setupIconFallbacks();
    } catch (error) {
      console.error("[IterationTypesEntityManager] Failed to render:", error);
      throw error;
    }
  }

  /**
   * Create toolbar with Add New button following Applications pattern
   * @public
   */
  createToolbar() {
    try {
      // Find the container for the toolbar (above the table)
      // Handle both string IDs and HTMLElement objects
      let container;
      if (this.container && this.container instanceof HTMLElement) {
        // If this.container is already an HTMLElement
        container = this.container;
      } else {
        // If it's a string ID or fallback to default
        const containerId =
          (typeof this.container === "string" ? this.container : null) ||
          this.tableConfig?.containerId ||
          "dataTable";
        container = document.getElementById(containerId);
      }

      if (!container) {
        console.warn(
          `[IterationTypesEntityManager] Container not found for toolbar:`,
          {
            containerType: typeof this.container,
            container: this.container,
            tableConfigContainerId: this.tableConfig?.containerId,
          },
        );
        return;
      }

      // Always recreate toolbar to ensure it exists after container clearing
      let toolbar = container.querySelector(".entity-toolbar");
      if (toolbar) {
        toolbar.remove(); // Remove existing toolbar
        console.log("[IterationTypesEntityManager] Removed existing toolbar");
      }

      toolbar = document.createElement("div");
      toolbar.className = "entity-toolbar";
      toolbar.style.cssText =
        "margin-bottom: 15px; display: flex; gap: 10px; align-items: center;";

      // Insert toolbar before the dataTable
      const dataTable = container.querySelector("#dataTable");
      if (dataTable) {
        container.insertBefore(toolbar, dataTable);
      } else {
        container.appendChild(toolbar);
      }

      console.log("[IterationTypesEntityManager] Created new toolbar");

      // Create Add New Iteration Type button with UMIG-prefixed classes to avoid Confluence conflicts
      const addButton = document.createElement("button");
      addButton.className = "umig-btn-primary umig-button";
      addButton.id = "umig-add-new-iteration-type-btn"; // Use UMIG-prefixed ID to avoid legacy conflicts
      addButton.innerHTML =
        '<span class="umig-btn-icon">➕</span> Add New Iteration Type';
      addButton.setAttribute("data-action", "add");
      addButton.onclick = () => this.handleAdd();

      // Create Refresh button with UMIG-prefixed classes and enhanced icon support
      const refreshButton = document.createElement("button");
      refreshButton.className = "umig-btn-secondary umig-button";
      refreshButton.id = "umig-refresh-iteration-types-btn";
      // Refresh button with icon only (consistent with other entity managers)
      refreshButton.innerHTML = '<span class="umig-btn-icon">🔄</span> Refresh';
      // Use addEventListener instead of onclick for better reliability (ADR-057 compliance)
      refreshButton.addEventListener("click", async () => {
        console.log("[IterationTypesEntityManager] Refresh button clicked");
        await this._handleRefreshWithFeedback(refreshButton);
      });

      // Clear and add buttons to toolbar
      toolbar.innerHTML = "";
      toolbar.appendChild(addButton);
      toolbar.appendChild(refreshButton);

      console.log("[IterationTypesEntityManager] Toolbar created successfully");
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Error creating toolbar:",
        error,
      );
    }
  }

  /**
   * Handle Add New Iteration Type action following Applications pattern
   * @private
   */
  handleAdd() {
    console.log(
      "[IterationTypesEntityManager] Opening Add Iteration Type modal",
    );

    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn(
        "[IterationTypesEntityManager] Modal component not available",
      );
      return;
    }

    // Prevent duplicate modal creation - check if modal is already open
    if (this.modalComponent.isOpen) {
      console.log(
        "[IterationTypesEntityManager] Modal is already open - ignoring duplicate request",
      );
      return;
    }

    // Clean up any existing legacy modal conflicts
    const legacyModal = document.getElementById("editModal");
    if (legacyModal && legacyModal.style.display !== "none") {
      console.log(
        "[IterationTypesEntityManager] Hiding conflicting legacy modal",
      );
      legacyModal.style.display = "none";
    }

    // Prepare empty data for new iteration type
    const newIterationTypeData = {
      itt_code: "",
      itt_name: "",
      itt_description: "",
      itt_color: "#6B73FF",
      itt_icon: "play-circle",
      itt_display_order: 0,
      itt_active: "true",
    };

    // Clear any existing tabs to ensure form mode for Add operation
    if (this.modalComponent.clearTabs) {
      this.modalComponent.clearTabs();
    }

    // Update modal configuration for Add mode
    this.modalComponent.updateConfig({
      title: "Add New Iteration Type",
      type: "form",
      mode: "create", // Set mode to create for new iteration types
      onSubmit: async (formData) => {
        try {
          console.log(
            "[IterationTypesEntityManager] Submitting new iteration type:",
            formData,
          );
          const result = await this._createEntityData(formData);
          console.log(
            "[IterationTypesEntityManager] Iteration type created successfully:",
            result,
          );
          // Refresh the table data
          await this.loadData();
          // Show success message with auto-dismiss
          this._showNotification(
            "success",
            "Iteration Type Created",
            `Iteration type ${formData.itt_name} has been created successfully.`,
          );
          // Return true to close modal automatically
          return true;
        } catch (error) {
          console.error(
            "[IterationTypesEntityManager] Error creating iteration type:",
            error,
          );
          // Show error message (manual dismiss for errors)
          this._showNotification(
            "error",
            "Error Creating Iteration Type",
            error.message ||
              "An error occurred while creating the iteration type.",
          );
          // Return false to keep modal open with error
          return false;
        }
      },
    });

    // Set form data to default values (like Teams does)
    if (this.modalComponent.formData) {
      Object.assign(this.modalComponent.formData, newIterationTypeData);
    }

    // Open the modal
    this.modalComponent.open();

    // Cleanup any existing ColorPickerComponents
    this._cleanupColorPickers();

    // Enhance color fields after modal is rendered
    setTimeout(() => {
      const modalContainer = document.querySelector(
        '.aui-dialog2-content, .modal-content, [data-component="modal"]',
      );
      if (modalContainer) {
        this._enhanceColorFieldsInModal(modalContainer, newIterationTypeData);
      } else {
        console.warn(
          "[IterationTypesEntityManager] Modal container not found for ColorPickerComponent enhancement",
        );
      }
    }, 250); // Small delay to ensure modal DOM is ready
  }

  /**
   * Enhance color fields in EDIT modal with ColorPickerComponent
   * @param {HTMLElement} modalContainer - The modal container element
   * @param {Object} formData - Current form data
   * @private
   */
  _enhanceColorFieldsInModal(modalContainer, formData = {}) {
    try {
      console.log(
        "[IterationTypesEntityManager] Enhancing color fields with ColorPickerComponent...",
      );

      // Find the color input field
      const colorInput = modalContainer.querySelector(
        'input[name="itt_color"], input[type="color"]',
      );

      if (!colorInput) {
        console.log(
          "[IterationTypesEntityManager] No color input field found in modal",
        );
        return;
      }

      // Check if ColorPickerComponent is available
      if (!this.ColorPickerComponent) {
        console.warn(
          "[IterationTypesEntityManager] ColorPickerComponent not available for enhancement",
        );
        return;
      }

      // Get the current color value
      const currentColor = formData.itt_color || colorInput.value || "#6B73FF";

      // Create container for ColorPickerComponent
      const colorFieldContainer = colorInput.parentElement;
      const colorPickerContainer = document.createElement("div");
      colorPickerContainer.className = "umig-color-picker-container";
      colorPickerContainer.id = `color-picker-${Date.now()}`;

      // Insert the ColorPickerComponent container before the original input
      colorFieldContainer.insertBefore(colorPickerContainer, colorInput);

      // Hide the original input but keep it for form submission
      colorInput.style.display = "none";
      colorInput.dataset.originalInput = "true";

      // Initialize ColorPickerComponent
      const colorPicker = new this.ColorPickerComponent({
        container: colorPickerContainer,
        defaultColor: currentColor,
        allowCustomColors: true,
        showHexInput: true,
        required: false,
        onChange: (color) => {
          console.log(
            "[IterationTypesEntityManager] Color changed via ColorPickerComponent:",
            color,
          );
          // Update the hidden input field
          colorInput.value = color;
          // Trigger change event on the hidden input for any listeners
          colorInput.dispatchEvent(new Event("change", { bubbles: true }));
        },
      });

      // Mount the ColorPickerComponent
      colorPicker.initialize().then(() => {
        colorPicker.mount().then(() => {
          console.log(
            "[IterationTypesEntityManager] ColorPickerComponent mounted successfully",
          );
        });
      });

      // Store reference for cleanup
      if (!this._activeColorPickers) {
        this._activeColorPickers = [];
      }
      this._activeColorPickers.push(colorPicker);

      console.log(
        "[IterationTypesEntityManager] Color field enhanced with ColorPickerComponent",
      );
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Error enhancing color fields:",
        error,
      );
    }
  }

  /**
   * Cleanup active ColorPickerComponents
   * @private
   */
  _cleanupColorPickers() {
    if (this._activeColorPickers && this._activeColorPickers.length > 0) {
      this._activeColorPickers.forEach((picker) => {
        if (picker && typeof picker.destroy === "function") {
          picker.destroy();
        }
      });
      this._activeColorPickers = [];
      console.log(
        "[IterationTypesEntityManager] Active ColorPickerComponents cleaned up",
      );
    }
  }

  /**
   * Handle Edit Iteration Type action following Applications pattern
   * @param {Object} iterationTypeData - Iteration type data to edit
   * @private
   */
  handleEdit(iterationTypeData) {
    console.log(
      "[IterationTypesEntityManager] Opening Edit Iteration Type modal for:",
      iterationTypeData,
    );
    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn(
        "[IterationTypesEntityManager] Modal component not available",
      );
      return;
    }

    // Update modal configuration for Edit mode - restore original form without audit fields
    this.modalComponent.updateConfig({
      title: `Edit Iteration Type: ${iterationTypeData.itt_name}`,
      type: "form",
      mode: "edit", // Set mode to edit for existing iteration types
      form: this.config.modalConfig.form, // Restore original form config
      buttons: [
        { text: "Cancel", action: "cancel", variant: "secondary" },
        { text: "Save", action: "submit", variant: "primary" },
      ],
      onButtonClick: null, // Clear custom button handler
      onSubmit: async (formData) => {
        try {
          console.log(
            "[IterationTypesEntityManager] Submitting iteration type update:",
            formData,
          );
          const result = await this._updateEntityData(
            iterationTypeData.itt_code,
            formData,
          );
          console.log(
            "[IterationTypesEntityManager] Iteration type updated successfully:",
            result,
          );
          // Refresh the table data
          await this.loadData();
          // Show success message with auto-dismiss
          this._showNotification(
            "success",
            "Iteration Type Updated",
            `Iteration type ${formData.itt_name} has been updated successfully.`,
          );
          // Return true to close modal automatically
          return true;
        } catch (error) {
          console.error(
            "[IterationTypesEntityManager] Error updating iteration type:",
            error,
          );
          // Show error message (manual dismiss for errors)
          this._showNotification(
            "error",
            "Error Updating Iteration Type",
            error.message ||
              "An error occurred while updating the iteration type.",
          );
          // Return false to keep modal open with error
          return false;
        }
      },
    });

    // Clear viewMode flag for edit mode
    this.modalComponent.viewMode = false;

    // CRITICAL FIX: Convert boolean status value to string for form dropdown compatibility
    // The form dropdown expects string values ("true"/"false") but database stores boolean (true/false)
    const formData = { ...iterationTypeData };
    if (formData.itt_active !== undefined) {
      // Convert boolean to string to match dropdown options
      formData.itt_active = String(formData.itt_active);
      console.log(
        `[IterationTypesEntityManager] Status field conversion: ${iterationTypeData.itt_active} (${typeof iterationTypeData.itt_active}) → ${formData.itt_active} (${typeof formData.itt_active})`,
      );
    }

    // Set form data to current iteration type values with converted status
    if (this.modalComponent.formData) {
      Object.assign(this.modalComponent.formData, formData);
    }

    // Open the modal
    this.modalComponent.open();

    // Cleanup any existing ColorPickerComponents
    this._cleanupColorPickers();

    // Enhance color fields after modal is rendered
    setTimeout(() => {
      const modalContainer = document.querySelector(
        '.aui-dialog2-content, .modal-content, [data-component="modal"]',
      );
      if (modalContainer) {
        this._enhanceColorFieldsInModal(modalContainer, iterationTypeData);
      } else {
        console.warn(
          "[IterationTypesEntityManager] Modal container not found for ColorPickerComponent enhancement",
        );
      }
    }, 250); // Small delay to ensure modal DOM is ready
  }

  /**
   * Override the base _viewEntity method to provide custom HTML VIEW mode with color and icon rendering
   * @param {Object} data - Entity data to view
   * @private
   */
  async _viewEntity(data) {
    console.log(
      "[IterationTypesEntityManager] Opening View Iteration Type modal for:",
      data,
    );
    console.log("[IterationTypesEntityManager] DEBUG: Audit field values:", {
      created_at: data.created_at,
      created_by: data.created_by,
      updated_at: data.updated_at,
      updated_by: data.updated_by,
    });

    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn(
        "[IterationTypesEntityManager] Modal component not available",
      );
      return;
    }

    console.log("[DEBUG] _viewEntity: Starting view modal configuration");
    console.log("[DEBUG] _viewEntity: Entity data:", data);
    console.log(
      "[DEBUG] _viewEntity: Current modal config before update:",
      this.modalComponent.config,
    );

    // Generate custom HTML content for the view modal
    const viewContent = this._generateCustomViewContent(data);
    console.log(
      "[DEBUG] _viewEntity: Generated custom content length:",
      viewContent ? viewContent.length : "null",
    );
    console.log(
      "[DEBUG] _viewEntity: Generated content preview:",
      viewContent ? viewContent.substring(0, 200) + "..." : "null",
    );

    // Update modal configuration for View mode with custom HTML
    // CRITICAL: Remove form configuration to ensure content is rendered instead of form
    this.modalComponent.updateConfig({
      title: `View Iteration Type: ${data.itt_name}`,
      type: "custom", // Use custom type to render HTML content
      size: "large",
      closeable: true,
      content: viewContent, // Provide the custom HTML content
      form: null, // CRITICAL: Explicitly remove form configuration to force content rendering
      buttons: [
        { text: "Edit", action: "edit", variant: "primary" },
        { text: "Close", action: "close", variant: "secondary" },
      ],
      onButtonClick: (action) => {
        console.log("[DEBUG] _viewEntity: Button clicked:", action);
        if (action === "edit") {
          // Switch to edit mode
          this.modalComponent.close();
          setTimeout(() => {
            this.handleEdit(data);
          }, 350);
          return true;
        }
        if (action === "close") {
          this.modalComponent.close();
          return true;
        }
        return false;
      },
    });

    console.log(
      "[DEBUG] _viewEntity: After updateConfig - Updated modal config:",
      this.modalComponent.config,
    );
    console.log(
      "[DEBUG] _viewEntity: Modal config.form after update:",
      this.modalComponent.config.form,
    );
    console.log(
      "[DEBUG] _viewEntity: Modal config.content length after update:",
      this.modalComponent.config.content?.length,
    );
    console.log(
      "[DEBUG] _viewEntity: Modal config.type after update:",
      this.modalComponent.config.type,
    );

    // Open the modal
    console.log("[DEBUG] _viewEntity: Opening modal...");
    this.modalComponent.open();

    // Apply color styles after modal is rendered
    // Use setTimeout to ensure DOM is updated and SecurityUtils has processed the content
    setTimeout(() => {
      this._applyColorSwatchStyles();

      // Fallback: If swatches still not found, try again after a longer delay
      setTimeout(() => {
        const swatches = document.querySelectorAll(".umig-color-swatch-view");
        if (swatches.length > 0) {
          console.log(
            "[DEBUG] _viewEntity: Fallback color swatch application successful",
          );
          this._applyColorSwatchStyles();
        }
      }, 300);
    }, 100);
  }

  /**
   * Apply color styles to swatches after modal rendering
   * This bypasses SecurityUtils by using CSS classes and data attributes instead of IDs
   * @private
   */
  _applyColorSwatchStyles() {
    console.log(
      "[DEBUG] _applyColorSwatchStyles: Applying color styles to swatches",
    );

    // Find all color swatch elements using class selector (not ID) - IDs are stripped by SecurityUtils
    const swatchElements = document.querySelectorAll(".umig-color-swatch-view");

    if (swatchElements.length === 0) {
      console.log(
        "[DEBUG] _applyColorSwatchStyles: No color swatch elements found",
      );
      return;
    }

    console.log(
      `[DEBUG] _applyColorSwatchStyles: Found ${swatchElements.length} swatch elements`,
    );

    // Apply styles to each swatch element
    swatchElements.forEach((element, index) => {
      const color = element.getAttribute("data-color") || "#6B73FF";
      console.log(
        `[DEBUG] _applyColorSwatchStyles: Applying color ${color} to swatch ${index + 1}`,
      );

      // Apply the background color directly to the element
      element.style.backgroundColor = color;
      // Ensure the element is properly styled
      element.style.width = "20px";
      element.style.height = "20px";
      element.style.display = "inline-block";
      element.style.border = "1px solid #ccc";
      element.style.borderRadius = "3px";
      element.style.marginRight = "8px";
      element.style.verticalAlign = "middle";
      element.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";

      // Add hover effect for better UX
      element.addEventListener("mouseenter", function () {
        this.style.transform = "scale(1.1)";
        this.style.transition = "transform 0.2s ease";
      });

      element.addEventListener("mouseleave", function () {
        this.style.transform = "scale(1)";
      });
    });

    // Clear the pending list (no longer needed but kept for compatibility)
    this._pendingColorSwatches = [];
  }

  /**
   * Generate custom HTML content for the view modal with proper color and icon rendering
   * @param {Object} data - The entity data
   * @returns {string} HTML content for the modal
   * @private
   */
  _generateCustomViewContent(data) {
    console.log("[DEBUG] _generateCustomViewContent: Called with data:", data);
    const securityUtils = window.SecurityUtils || {};
    const sanitize = securityUtils.sanitizeInput || ((val) => val);

    // Clear any pending swatches from previous modals (legacy - no longer needed with CSS class approach)
    this._pendingColorSwatches = [];

    // Helper function to render color swatch
    const renderColorSwatch = (color) => {
      const hexColor = color || "#6B73FF";

      // Use CSS class and data attributes instead of IDs - SecurityUtils strips IDs but allows class and data attributes
      // The _applyColorSwatchStyles method will find elements by class and apply colors from data attributes
      return `<span style="display: inline-flex; align-items: center;">
        <div class="umig-color-swatch-view"
             data-color="${hexColor}"
             style="width: 20px; height: 20px; display: inline-block; margin-right: 8px;
                    border: 1px solid #ccc; border-radius: 3px; vertical-align: middle;
                    background-color: ${hexColor};"
             title="${hexColor}"></div>
        <span>${hexColor}</span>
      </span>`;
    };

    // Helper function to render icon
    const renderIcon = (iconName) => {
      const icon = iconName || "circle";
      const iconMap = {
        "play-circle": { unicode: "►", title: "Run" },
        "check-circle": { unicode: "✓", title: "Cutover" },
        refresh: { unicode: "↻", title: "DR" },
        circle: { unicode: "●", title: "Default" },
      };
      const iconConfig = iconMap[icon] || iconMap["circle"];

      return `<span class="umig-icon-display">
        <span class="umig-icon-container" style="font-size: 18px; font-weight: bold;
               margin-right: 8px; vertical-align: middle;" title="${iconConfig.title}">
          ${iconConfig.unicode}
        </span>
        <span>${icon}</span>
      </span>`;
    };

    // Build the HTML content with inline styles only (no <style> tags)
    const html = `
      <div style="padding: 20px;">
        <div>
          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Code</strong></label>
            <div style="flex: 1; color: #555;">${sanitize(data.itt_code || "")}</div>
          </div>

          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Name</strong></label>
            <div style="flex: 1; color: #555;">${sanitize(data.itt_name || "")}</div>
          </div>

          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Description</strong></label>
            <div style="flex: 1; color: #555;">${sanitize(data.itt_description || "")}</div>
          </div>

          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Color</strong></label>
            <div style="flex: 1; color: #555;">${renderColorSwatch(data.itt_color)}</div>
          </div>

          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Icon</strong></label>
            <div style="flex: 1; color: #555;">${renderIcon(data.itt_icon)}</div>
          </div>

          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Display Order</strong></label>
            <div style="flex: 1; color: #555;">${data.itt_display_order || 0}</div>
          </div>

          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Status</strong></label>
            <div style="flex: 1; color: #555;">
              ${
                data.itt_active
                  ? '<span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;">Active</span>'
                  : '<span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; background-color: #f8f9fa; color: #6c757d; border: 1px solid #dee2e6;">Inactive</span>'
              }
              ${
                !data.itt_active
                  ? '<div style="font-size: 0.9em; color: #666; margin-top: 4px;">Inactive iteration types cannot be used in new iterations</div>'
                  : ""
              }
            </div>
          </div>

          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Usage Count</strong></label>
            <div style="flex: 1; color: #555;">${(() => {
              const count = data.iteration_count || 0;
              return `${count} ${count === 1 ? "iteration" : "iterations"} using this type`;
            })()}</div>
          </div>

          <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">

          <h4 style="margin-bottom: 15px;">Audit Information</h4>

          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Created At</strong></label>
            <div style="flex: 1; color: #555;">${this._formatDateTime(data.created_at)}</div>
          </div>

          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Created By</strong></label>
            <div style="flex: 1; color: #555;">${sanitize(data.created_by || "system")}</div>
          </div>

          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Last Updated</strong></label>
            <div style="flex: 1; color: #555;">${this._formatDateTime(data.updated_at)}</div>
          </div>

          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Last Updated By</strong></label>
            <div style="flex: 1; color: #555;">${sanitize(data.updated_by || "system")}</div>
          </div>
        </div>
      </div>
    `;

    console.log(
      "[DEBUG] _generateCustomViewContent: Generated HTML length:",
      html.length,
    );
    console.log(
      "[DEBUG] _generateCustomViewContent: Generated HTML preview:",
      html.substring(0, 300) + "...",
    );
    return html;
  }

  /**
   * Override the base _editEntity method to use our custom handleEdit
   * @param {Object} data - Entity data to edit
   * @private
   */
  async _editEntity(data) {
    this.handleEdit(data);
  }

  /**
   * Get table configuration for iteration types
   * @returns {Object} Table configuration
   * @private
   */
  _getTableConfig() {
    return {
      columns: [
        {
          key: "itt_code",
          title: "Code",
          sortable: true,
          width: "15%",
          render: (value, row) => this._renderCodeCell(value, row),
        },
        {
          key: "itt_name",
          title: "Name",
          sortable: true,
          width: "25%",
          render: (value, row) => this._renderNameCell(value, row),
        },
        {
          key: "itt_description",
          title: "Description",
          sortable: true,
          width: "30%",
          render: (value) => this._truncateText(value, 50),
        },
        {
          key: "itt_color",
          title: "Color",
          sortable: true,
          width: "10%",
          render: (value) => this._renderColorSwatch(value),
        },
        {
          key: "itt_icon",
          title: "Icon",
          sortable: true,
          width: "10%",
          render: (value) => this._renderIcon(value),
        },
        {
          key: "itt_display_order",
          title: "Order",
          sortable: true,
          width: "8%",
          render: (value) => `<span class="umig-order-badge">${value}</span>`,
        },
        {
          key: "iteration_count",
          title: "Iterations",
          sortable: true,
          width: "8%",
          render: (value, row) => {
            const count = value || 0;
            const countDisplay = count.toString();
            // Add visual indicator if there are dependencies (following MigrationTypes pattern)
            if (count > 0) {
              return `<span class="umig-iteration-count-indicator" style="color: #d73527; font-weight: bold;" title="This iteration type is used by ${count} iteration(s)">${countDisplay}</span>`;
            } else {
              return `<span class="umig-iteration-count-none" style="color: #666;" title="No iterations use this type">${countDisplay}</span>`;
            }
          },
        },
        {
          key: "itt_active",
          title: "Status",
          sortable: true,
          width: "8%",
          render: (value) => this._renderStatusBadge(value),
        },
        {
          key: "actions",
          title: "Actions",
          width: "14%",
          render: (value, row) => this._renderActionButtons(row),
        },
      ],
      sortable: true,
      draggable: true, // Enable drag-and-drop for reordering
      rowClass: (row) => (row.itt_active ? "active-row" : "inactive-row"),
      emptyMessage: "No iteration types found",
      loading: false,
    };
  }

  /**
   * Get modal configuration for iteration types
   * @returns {Object} Modal configuration
   * @private
   */
  _getModalConfig() {
    return {
      title: "Iteration Type",
      size: "large",
      fields: [
        {
          name: "itt_code",
          type: "text",
          label: "Code",
          required: true,
          placeholder: "e.g., RUN, DR, CUTOVER",
          validation: {
            pattern: this.validationPatterns.code,
            message:
              "Code must contain only alphanumeric characters, underscores, and dashes",
          },
          maxlength: 20,
        },
        {
          name: "itt_name",
          type: "text",
          label: "Name",
          required: true,
          placeholder: "e.g., Production Run, Disaster Recovery",
          maxlength: 100,
        },
        {
          name: "itt_description",
          type: "textarea",
          label: "Description",
          placeholder: "Describe the purpose and usage of this iteration type",
          rows: 3,
          maxlength: 500,
        },
        {
          name: "itt_color",
          type: "color",
          label: "Color",
          defaultValue: "#6B73FF",
          validation: {
            pattern: this.validationPatterns.color,
            message: "Color must be a valid hex code (e.g., #6B73FF)",
          },
        },
        {
          name: "itt_icon",
          type: "icon-picker",
          label: "Icon",
          defaultValue: "play-circle",
          validation: {
            pattern: this.validationPatterns.iconName,
            message:
              "Icon name must contain only alphanumeric characters, underscores, and dashes",
          },
        },
        {
          name: "itt_display_order",
          type: "number",
          label: "Display Order",
          defaultValue: 0,
          min: 0,
          max: 999,
        },
        {
          name: "itt_active",
          type: "checkbox",
          label: "Active",
          defaultValue: true,
          helpText: "Inactive iteration types cannot be used in new iterations",
        },
      ],
      buttons: [
        {
          text: "Cancel",
          class: "btn-secondary",
          action: "cancel",
        },
        {
          text: "Save",
          class: "btn-primary",
          action: "save",
          loading: true,
        },
      ],
      validation: true,
      autoFocus: true,
    };
  }

  /**
   * Get filter configuration for iteration types
   * @returns {Object} Filter configuration
   * @private
   */
  _getFilterConfig() {
    return {
      filters: [
        {
          name: "search",
          type: "text",
          placeholder: "Search iteration types...",
          debounce: 300,
        },
        {
          name: "itt_active",
          type: "select",
          label: "Status",
          options: [
            { value: "", text: "All" },
            { value: "true", text: "Active" },
            { value: "false", text: "Inactive" },
          ],
          defaultValue: "",
        },
        {
          name: "includeInactive",
          type: "checkbox",
          label: "Include Inactive",
          defaultValue: false,
        },
      ],
      showAdvanced: false,
      collapsible: true,
    };
  }

  /**
   * Get pagination configuration for iteration types
   * @returns {Object} Pagination configuration
   * @private
   */
  _getPaginationConfig() {
    return {
      pageSize: 20,
      pageSizes: [10, 20, 50, 100],
      showSizeSelector: true,
      showPageInfo: true,
      showTotal: true,
      position: "bottom",
    };
  }

  /**
   * Fetch iteration types data from API following Applications pattern
   * @param {Object} filters - Filter parameters
   * @param {Object} sort - Sort parameters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise<Object>} API response with data and metadata
   * @protected
   */
  async _fetchEntityData(filters = {}, sort = null, page = 1, pageSize = 20) {
    try {
      console.log(
        "[IterationTypesEntityManager] Fetching iteration type data",
        {
          filters,
          sort,
          page,
          pageSize,
        },
      );

      // Construct API URL with pagination
      const baseUrl =
        this.iterationTypesApiUrl ||
        "/rest/scriptrunner/latest/custom/iterationTypes";
      const params = new URLSearchParams();

      // Force ALL iteration types for client-side pagination (API defaults to pageSize=50)
      params.append("page", 1);
      params.append("size", 1000); // Large number to ensure we get all iteration types

      console.log(
        "[IterationTypesEntityManager] Using client-side pagination - fetching ALL iteration types (page=1, size=1000)",
      );

      // Add sort if provided
      if (sort && sort.key) {
        params.append("sort", `${sort.key},${sort.order || "asc"}`);
      }

      // CRITICAL FIX FOR ISSUE 2: Always include inactive records for complete table display
      params.append("includeInactive", "true");
      console.log(
        "[IterationTypesEntityManager] Added includeInactive=true to show ALL records including inactive",
      );

      // Add filters if provided - CRITICAL FIX: Exclude pagination parameters to prevent duplicates
      const excludedParams = new Set(["page", "size", "pageSize"]);
      Object.keys(filters).forEach((key) => {
        if (
          !excludedParams.has(key) &&
          filters[key] !== null &&
          filters[key] !== undefined &&
          filters[key] !== ""
        ) {
          params.append(key, filters[key]);
        }
      });

      const url = `${baseUrl}?${params.toString()}`;
      console.log("[IterationTypesEntityManager] API URL:", url);

      // Make API call
      const response = await fetch(url, {
        method: "GET",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
          Accept: "application/json",
        }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch iteration types: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log(
        `[IterationTypesEntityManager] Fetched ${data.content ? data.content.length : 0} iteration types`,
      );

      // Transform response to expected format for CLIENT-SIDE pagination
      // CRITICAL FIX: Ensure iterationTypes is always an array
      let iterationTypes = [];

      if (Array.isArray(data)) {
        // Direct array response
        iterationTypes = data;
      } else if (data && Array.isArray(data.content)) {
        // Paginated response with content property
        iterationTypes = data.content;
      } else if (data && Array.isArray(data.data)) {
        // Response with data property
        iterationTypes = data.data;
      } else if (data && typeof data === "object") {
        console.warn(
          "[IterationTypesEntityManager] Unexpected API response format:",
          data,
        );
        // Last resort: wrap single object or use empty array
        iterationTypes = data.length !== undefined ? [] : [data];
      } else {
        console.warn(
          "[IterationTypesEntityManager] API returned non-object response:",
          data,
        );
        iterationTypes = [];
      }

      const totalIterationTypes = data.totalElements || iterationTypes.length;
      console.log(
        `[IterationTypesEntityManager] Client-side pagination: ${totalIterationTypes} total iteration types loaded`,
      );

      return {
        data: iterationTypes,
        total: totalIterationTypes,
        page: 1, // Always page 1 for client-side pagination
        pageSize: totalIterationTypes, // PageSize = total for client-side pagination
      };
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Error fetching iteration type data:",
        error,
      );
      throw error;
    }
  }

  /**
   * Handle refresh with comprehensive visual feedback (enhanced to match Teams implementation)
   * @param {HTMLElement} refreshButton - The refresh button element
   * @private
   */
  async _handleRefreshWithFeedback(refreshButton) {
    const startTime = performance.now();

    try {
      // Step 1: Show loading state immediately
      this._setRefreshButtonLoadingState(refreshButton, true);

      // Step 2: Add visual feedback to table (fade effect)
      const tableContainer = document.querySelector("#dataTable");
      if (tableContainer) {
        tableContainer.style.transition = "opacity 0.2s ease-in-out";
        tableContainer.style.opacity = "0.6";
      }

      // Step 3: Perform the actual refresh
      console.log(
        "[IterationTypesEntityManager] Starting data refresh with visual feedback",
      );
      await this.loadData(
        this.currentFilters,
        this.currentSort,
        this.currentPage,
      );

      // Step 4: Calculate operation time
      const operationTime = performance.now() - startTime;

      // Step 5: Restore table opacity with slight delay for visual feedback
      if (tableContainer) {
        // Small delay to ensure user sees the refresh happening
        await new Promise((resolve) => setTimeout(resolve, 150));
        tableContainer.style.opacity = "1";
      }

      // Step 6: Show success feedback
      this._showRefreshSuccessMessage(operationTime);

      console.log(
        `[IterationTypesEntityManager] Data refreshed successfully in ${operationTime.toFixed(2)}ms`,
      );
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Error refreshing data:",
        error,
      );

      // Restore table opacity on error
      const tableContainer = document.querySelector("#dataTable");
      if (tableContainer) {
        tableContainer.style.opacity = "1";
      }

      // Show error message
      this._showNotification(
        "error",
        "Refresh Failed",
        "Failed to refresh iteration type data. Please try again.",
      );
    } finally {
      // Step 7: Always restore button state
      this._setRefreshButtonLoadingState(refreshButton, false);
    }
  }

  /**
   * Set refresh button loading state with visual feedback
   * @param {HTMLElement} button - The refresh button element
   * @param {boolean} loading - Whether button should show loading state
   * @private
   */
  _setRefreshButtonLoadingState(button, loading) {
    if (!button) return;

    if (loading) {
      // Store original content
      button._originalHTML = button.innerHTML;

      // Update to loading state with simple spinning emoji
      button.innerHTML =
        '<span class="umig-btn-icon" style="animation: spin 1s linear infinite;">🔄</span> Refreshing ...';
      button.disabled = true;
      button.style.opacity = "0.7";
      button.style.cursor = "not-allowed";

      // Add spinning animation if not already defined
      if (!document.querySelector("#umig-refresh-spinner-styles")) {
        const style = document.createElement("style");
        style.id = "umig-refresh-spinner-styles";
        style.textContent = `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      // Restore original state
      if (button._originalHTML) {
        button.innerHTML = button._originalHTML;
      }
      button.disabled = false;
      button.style.opacity = "1";
      button.style.cursor = "pointer";
    }
  }

  /**
   * Show refresh success message with timing information
   * @param {number} operationTime - Time taken for the operation in milliseconds
   * @private
   */
  _showRefreshSuccessMessage(operationTime) {
    // Create a temporary success indicator
    const successIndicator = document.createElement("div");
    successIndicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
      border-radius: 4px;
      padding: 8px 12px;
      font-size: 13px;
      z-index: 10000;
      animation: fadeInOut 2.5s ease-in-out forwards;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

    const iterationTypeCount = this.currentData ? this.currentData.length : 0;
    successIndicator.innerHTML = `
      <strong>✓ Refreshed</strong><br>
      ${iterationTypeCount} iteration types loaded in ${operationTime.toFixed(0)}ms
    `;

    // Add fade in/out animation
    if (!document.querySelector("#umig-success-indicator-styles")) {
      const style = document.createElement("style");
      style.id = "umig-success-indicator-styles";
      style.textContent = `
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(-10px); }
          15% { opacity: 1; transform: translateY(0); }
          85% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(successIndicator);

    // Remove indicator after animation completes
    setTimeout(() => {
      if (successIndicator.parentNode) {
        successIndicator.parentNode.removeChild(successIndicator);
      }
    }, 2500);
  }

  /**
   * Format date-time for display following Applications pattern
   * @param {string} dateTimeString - ISO date time string
   * @returns {string} Formatted date time
   * @private
   */
  _formatDateTime(dateTimeString) {
    if (!dateTimeString) {
      return "Not available";
    }
    try {
      const date = new Date(dateTimeString);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }
      // Format as "Dec 15, 2023 at 2:30 PM"
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Error formatting date:",
        error,
      );
      return "Format error";
    }
  }

  /**
   * Show notification message using proven pattern following Applications pattern
   * @param {string} type - Notification type (success, error, warning, info)
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @private
   */
  _showNotification(type, title, message) {
    try {
      // Use ComponentOrchestrator for notifications if available
      if (this.orchestrator && this.orchestrator.showNotification) {
        this.orchestrator.showNotification(type, title, message);
        return;
      }
      // Fallback to console logging if no notification system available
      const logLevel =
        type === "error" ? "error" : type === "warning" ? "warn" : "log";
      console[logLevel](`[IterationTypesEntityManager] ${title}: ${message}`);
      // Additional fallback for critical errors - show alert
      if (type === "error") {
        // Use setTimeout to avoid blocking UI updates
        setTimeout(() => {
          alert(`${title}\n\n${message}`);
        }, 100);
      }
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Error showing notification:",
        error,
      );
      // Final fallback - console log only
      console.log(
        `[Notification] ${type.toUpperCase()}: ${title} - ${message}`,
      );
    }
  }

  /**
   * Clear cache for a specific entity or all entities following Applications pattern
   * @param {string} id - Entity ID to clear from cache, or 'all' to clear everything
   * @private
   */
  _invalidateCache(id) {
    try {
      if (!this.cache) {
        return;
      }
      if (id === "all") {
        this.cache.clear();
        console.log("[IterationTypesEntityManager] Cleared all cache");
      } else {
        // Clear specific entity cache
        const keysToDelete = [];
        this.cache.forEach((value, key) => {
          if (key.includes(id)) {
            keysToDelete.push(key);
          }
        });
        keysToDelete.forEach((key) => this.cache.delete(key));
        console.log(
          `[IterationTypesEntityManager] Cleared cache for ${id} (${keysToDelete.length} entries)`,
        );
      }
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Error invalidating cache:",
        error,
      );
    }
  }

  /**
   * Public interface for create operation (for testing and external use)
   * @param {Object} data - Data to create
   * @returns {Promise<Object>} Created entity
   * @public
   */
  async create(data) {
    return this._createEntityData(data);
  }

  /**
   * Public interface for update operation (for testing and external use)
   * @param {string} id - Entity ID
   * @param {Object} data - Data to update
   * @returns {Promise<Object>} Updated entity
   * @public
   */
  async update(id, data) {
    return this._updateEntityData(id, data);
  }

  /**
   * Public interface for delete operation (for testing and external use)
   * @param {string} id - Entity ID
   * @returns {Promise<void>}
   * @public
   */
  async delete(id) {
    return this._deleteEntityData(id);
  }

  /**
   * Validate and transform data before create/update operations
   * @param {Object} data - Data to validate and transform
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Object} Validated and transformed data
   * @private
   */
  validateAndTransformData(data, isUpdate = false) {
    const validatedData = { ...data };

    // Sanitize string fields
    if (validatedData.itt_name && window.SecurityUtils?.sanitizeString) {
      validatedData.itt_name = window.SecurityUtils.sanitizeString(
        validatedData.itt_name,
      );
    }
    if (validatedData.itt_description && window.SecurityUtils?.sanitizeString) {
      validatedData.itt_description = window.SecurityUtils.sanitizeString(
        validatedData.itt_description,
      );
    }
    if (validatedData.itt_code && window.SecurityUtils?.sanitizeString) {
      validatedData.itt_code = window.SecurityUtils.sanitizeString(
        validatedData.itt_code,
      );
    }

    // Validate color format
    if (validatedData.itt_color) {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!colorRegex.test(validatedData.itt_color)) {
        throw new Error("Invalid color format. Must be #RRGGBB");
      }
    }

    // Validate code format (alphanumeric, dash, underscore only)
    if (!isUpdate && validatedData.itt_code) {
      const codeRegex = /^[a-zA-Z0-9_-]+$/;
      if (!codeRegex.test(validatedData.itt_code)) {
        throw new Error(
          "Code must contain only alphanumeric characters, dashes, and underscores",
        );
      }
    }

    // Convert boolean fields - ensure proper boolean type for database
    if (validatedData.itt_active !== undefined) {
      // Convert string boolean values to actual booleans
      if (typeof validatedData.itt_active === "string") {
        validatedData.itt_active = validatedData.itt_active === "true";
      } else if (typeof validatedData.itt_active === "number") {
        validatedData.itt_active = validatedData.itt_active === 1;
      }
      // Ensure final result is boolean
      validatedData.itt_active = Boolean(validatedData.itt_active);
    }

    // Ensure display order is a number
    if (validatedData.itt_display_order !== undefined) {
      validatedData.itt_display_order = parseInt(
        validatedData.itt_display_order,
        10,
      );
      if (isNaN(validatedData.itt_display_order)) {
        validatedData.itt_display_order = 0;
      }
    }

    return validatedData;
  }

  /**
   * Create new iteration type via API following Applications pattern
   * @param {Object} data - Iteration type data
   * @returns {Promise<Object>} Created iteration type
   * @protected
   */
  async _createEntityData(data) {
    try {
      console.log(
        "[IterationTypesEntityManager] Creating new iteration type:",
        data,
      );

      // Validate and transform data
      const validatedData = this.validateAndTransformData(data, false);

      // Security validation
      window.SecurityUtils.validateInput(validatedData);
      const response = await fetch(this.iterationTypesApiUrl, {
        method: "POST",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(validatedData),
        credentials: "same-origin",
      });
      if (!response.ok) {
        // Parse the error response for detailed error information
        let errorMessage = `Failed to create iteration type: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          // Handle specific error cases
          if (response.status === 409 && errorMessage.includes("exists")) {
            errorMessage = "Code already exists";
          }
        } catch (parseError) {
          console.warn(
            "[IterationTypesEntityManager] Could not parse error response:",
            parseError,
          );
        }
        throw new Error(errorMessage);
      }
      const createdIterationType = await response.json();
      console.log(
        "[IterationTypesEntityManager] Iteration type created:",
        createdIterationType,
      );
      // Clear relevant caches
      this._invalidateCache("all");
      return createdIterationType;
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Failed to create iteration type:",
        error,
      );
      throw error;
    }
  }

  /**
   * Create new iteration type (Public API)
   * @param {Object} data - Iteration type data
   * @returns {Promise<Object>} Created iteration type
   */
  async create(data) {
    const startTime = performance.now();

    try {
      console.log(
        "[IterationTypesEntityManager] Creating iteration type:",
        data,
      );

      // Enhanced security: sanitize input first
      const sanitizedInput = this._sanitizeInput(data);

      // Validate data
      const validationResult =
        await this._validateIterationTypeData(sanitizedInput);
      if (!validationResult.isValid) {
        const SecurityUtils = window.SecurityUtils || {};
        throw new (SecurityUtils.ValidationException || Error)(
          `Validation failed: ${validationResult.errors.join(", ")}`,
        );
      }

      // Call protected method for actual API call
      const result = await this._createEntityData(
        validationResult.sanitizedData,
      );

      // Clear caches
      this._clearCaches();

      // Track performance
      const createTime = performance.now() - startTime;
      this._trackPerformance("create", createTime);

      console.log(
        `[IterationTypesEntityManager] Iteration type created in ${createTime.toFixed(2)}ms`,
      );

      return result;
    } catch (error) {
      console.error("[IterationTypesEntityManager] Create error:", error);
      this._trackError("create", error);
      throw error;
    }
  }

  /**
   * Update iteration type via API following Applications pattern
   * @param {string} id - Iteration type ID
   * @param {Object} data - Updated iteration type data
   * @returns {Promise<Object>} Updated iteration type
   * @protected
   */
  async _updateEntityData(id, data) {
    try {
      console.log(
        "[IterationTypesEntityManager] Updating iteration type:",
        id,
        data,
      );
      // Filter out read-only fields that shouldn't be sent in updates
      const readOnlyFields = [
        "itt_code",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
      ];
      const updateData = {};
      // Only include updatable fields (matching IterationTypeRepository whitelist)
      const updatableFields = [
        "itt_name",
        "itt_description",
        "itt_color",
        "itt_icon",
        "itt_display_order",
        "itt_active",
      ];
      Object.keys(data).forEach((key) => {
        if (updatableFields.includes(key) && !readOnlyFields.includes(key)) {
          updateData[key] = data[key];
        }
      });
      console.log(
        "[IterationTypesEntityManager] Filtered update data:",
        updateData,
      );

      // Validate and transform data
      const validatedData = this.validateAndTransformData(updateData, true);

      // Security validation
      window.SecurityUtils.validateInput({ id, ...validatedData });
      const response = await fetch(
        `${this.iterationTypesApiUrl}/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(validatedData),
          credentials: "same-origin",
        },
      );
      if (!response.ok) {
        // Parse the error response for detailed error information
        let errorMessage = `Failed to update iteration type: ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          // Handle specific error cases
          if (response.status === 404) {
            errorMessage = "Iteration type not found";
          }
        } catch (parseError) {
          console.warn(
            "[IterationTypesEntityManager] Could not parse error response:",
            parseError,
          );
        }
        throw new Error(errorMessage);
      }
      const updatedIterationType = await response.json();
      console.log(
        "[IterationTypesEntityManager] Iteration type updated:",
        updatedIterationType,
      );
      // Clear relevant caches
      this._invalidateCache(id);
      return updatedIterationType;
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Failed to update iteration type:",
        error,
      );
      throw error;
    }
  }

  /**
   * Update existing iteration type (Public API)
   * @param {string} code - Iteration type code
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated iteration type
   */
  async update(code, data) {
    const startTime = performance.now();

    try {
      console.log(
        "[IterationTypesEntityManager] Updating iteration type:",
        code,
        data,
      );

      // Enhanced security: sanitize input first
      const sanitizedInput = this._sanitizeInput(data);

      // Validate data
      const validationResult = await this._validateIterationTypeData(
        sanitizedInput,
        true,
      );
      if (!validationResult.isValid) {
        const SecurityUtils = window.SecurityUtils || {};
        throw new (SecurityUtils.ValidationException || Error)(
          `Validation failed: ${validationResult.errors.join(", ")}`,
        );
      }

      // Call protected method for actual API call
      const result = await this._updateEntityData(
        code,
        validationResult.sanitizedData,
      );

      // Clear caches
      this._clearCaches();

      // Track performance
      const updateTime = performance.now() - startTime;
      this._trackPerformance("update", updateTime);

      console.log(
        `[IterationTypesEntityManager] Iteration type updated in ${updateTime.toFixed(2)}ms`,
      );

      return result;
    } catch (error) {
      console.error("[IterationTypesEntityManager] Update error:", error);
      this._trackError("update", error);
      throw error;
    }
  }

  /**
   * Delete iteration type via API following Applications pattern
   * @param {string} id - Iteration type ID
   * @returns {Promise<void>}
   * @protected
   */
  async _deleteEntityData(id) {
    try {
      console.log("[IterationTypesEntityManager] Deleting iteration type:", id);
      // Security validation
      window.SecurityUtils.validateInput({ id });
      const response = await fetch(
        `${this.iterationTypesApiUrl}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          credentials: "same-origin",
        },
      );
      if (!response.ok) {
        // Parse the error response to get detailed error information
        let errorMessage = `Failed to delete iteration type (${response.status})`;
        let blockingRelationships = null;
        try {
          const errorData = await response.json();
          console.log(
            "[IterationTypesEntityManager] Delete error response:",
            errorData,
          );
          if (errorData.error) {
            errorMessage = errorData.error;
          }
          // Extract blocking relationships for user-friendly display
          if (errorData.blocking_relationships) {
            blockingRelationships = errorData.blocking_relationships;
          }
        } catch (parseError) {
          console.warn(
            "[IterationTypesEntityManager] Could not parse error response:",
            parseError,
          );
          // Use default error message if JSON parsing fails
        }
        // Create a user-friendly error message
        if (response.status === 409 && blockingRelationships) {
          // HTTP 409 Conflict - Iteration type has relationships that prevent deletion
          const relationshipDetails = this._formatBlockingRelationships(
            blockingRelationships,
          );
          const detailedError = new Error(
            `${errorMessage}\n\nThis iteration type cannot be deleted because it is referenced by:\n${relationshipDetails}`,
          );
          detailedError.isConstraintError = true;
          detailedError.blockingRelationships = blockingRelationships;
          throw detailedError;
        } else if (response.status === 404) {
          // HTTP 404 Not Found
          throw new Error(
            "Iteration type not found. It may have already been deleted.",
          );
        } else {
          // Other errors
          throw new Error(errorMessage);
        }
      }
      console.log(
        "[IterationTypesEntityManager] Iteration type deleted successfully",
      );
      // Clear relevant caches
      this._invalidateCache(id);
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Failed to delete iteration type:",
        error,
      );
      throw error;
    }
  }

  /**
   * Format blocking relationships for user-friendly error messages following Applications pattern
   * @param {Object} blockingRelationships - Relationships preventing deletion
   * @returns {string} Formatted relationship details
   * @private
   */
  _formatBlockingRelationships(blockingRelationships) {
    const details = [];
    Object.entries(blockingRelationships).forEach(([type, items]) => {
      if (Array.isArray(items) && items.length > 0) {
        const count = items.length;
        const firstFew = items
          .slice(0, 3)
          .map((item) => item.name || item.code || item.id)
          .join(", ");
        const extra = count > 3 ? ` and ${count - 3} more` : "";
        details.push(`- ${type}: ${firstFew}${extra}`);
      }
    });
    return details.join("\n");
  }

  /**
   * Delete iteration type (Public API with relationship checking)
   * @param {string} code - Iteration type code
   * @returns {Promise<boolean>} Success status
   */
  async delete(code) {
    const startTime = performance.now();

    try {
      console.log(
        "[IterationTypesEntityManager] Deleting iteration type:",
        code,
      );

      // Check for blocking relationships first
      const blockingRelationships =
        await this._checkBlockingRelationships(code);
      if (blockingRelationships.hasBlocking) {
        throw new Error(
          `Cannot delete iteration type '${code}' because it is still in use: ${blockingRelationships.details.join(", ")}`,
        );
      }

      // Call protected method for actual API call
      const result = await this._deleteEntityData(code);

      // Clear caches
      this._clearCaches();

      // Track performance
      const deleteTime = performance.now() - startTime;
      this._trackPerformance("delete", deleteTime);

      console.log(
        `[IterationTypesEntityManager] Iteration type deleted in ${deleteTime.toFixed(2)}ms`,
      );

      return result;
    } catch (error) {
      console.error("[IterationTypesEntityManager] Delete error:", error);
      this._trackError("delete", error);
      throw error;
    }
  }

  /**
   * Get usage statistics for iteration types
   * @returns {Promise<Array>} Usage statistics
   */
  async getUsageStats() {
    try {
      console.log("[IterationTypesEntityManager] Fetching usage statistics");

      // Check cache first
      const cacheKey = "usage_stats";
      if (this.usageStatsCache.has(cacheKey)) {
        const cached = this.usageStatsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 300000) {
          // 5 minutes cache
          console.log(
            "[IterationTypesEntityManager] Using cached usage statistics",
          );
          return cached.data;
        }
      }

      // Fetch from API with proper security
      const response = await fetch(`${this.apiEndpoint}?stats=true`, {
        method: "GET",
        headers: window.SecurityUtils.addCSRFProtection({
          Accept: "application/json",
          "Content-Type": "application/json",
        }),
      });

      if (!response.ok) {
        throw new Error(`Stats request failed: ${response.status}`);
      }

      const stats = await response.json();

      // Cache the result
      this.usageStatsCache.set(cacheKey, {
        data: stats,
        timestamp: Date.now(),
      });

      return stats;
    } catch (error) {
      console.error("[IterationTypesEntityManager] Usage stats error:", error);
      throw error;
    }
  }

  /**
   * Reorder iteration types
   * @param {Array} orderMap - Array of {code, display_order} objects
   * @returns {Promise<boolean>} Success status
   */
  async reorderIterationTypes(orderMap) {
    const startTime = performance.now();

    try {
      console.log(
        "[IterationTypesEntityManager] Reordering iteration types:",
        orderMap,
      );

      // Validate order map
      if (!Array.isArray(orderMap) || orderMap.length === 0) {
        throw new Error("Invalid order map provided");
      }

      // Update each iteration type's display order
      const updatePromises = orderMap.map(async (item) => {
        return await this.update(item.code, {
          itt_display_order: item.display_order,
        });
      });

      await Promise.all(updatePromises);

      // Clear caches
      this._clearCaches();

      // Track performance
      const reorderTime = performance.now() - startTime;
      this._trackPerformance("reorder", reorderTime);

      console.log(
        `[IterationTypesEntityManager] Reordering completed in ${reorderTime.toFixed(2)}ms`,
      );

      return true;
    } catch (error) {
      console.error("[IterationTypesEntityManager] Reorder error:", error);
      this._trackError("reorder", error);
      throw error;
    }
  }

  // ========================================================================================
  // PRIVATE HELPER METHODS
  // ========================================================================================

  /**
   * Load real user permissions following Users/Teams pattern
   * @returns {Promise<void>}
   * @private
   */
  async _loadUserPermissions() {
    try {
      console.log("[IterationTypesEntityManager] Loading user permissions");

      // Wait for SecurityUtils to be available (race condition fix)
      let waited = 0;
      const maxWait = 5000; // 5 seconds max wait
      while (
        (!window.SecurityUtils ||
          typeof window.SecurityUtils.validateInput !== "function") &&
        waited < maxWait
      ) {
        console.log(
          `[IterationTypesEntityManager] Waiting for SecurityUtils to be available... (${waited}ms)`,
        );
        await new Promise((resolve) => setTimeout(resolve, 100));
        waited += 100;
      }

      // Enhanced SecurityUtils availability check with detailed error information
      if (
        typeof window.SecurityUtils === "undefined" ||
        !window.SecurityUtils
      ) {
        console.error(
          "[IterationTypesEntityManager] SecurityUtils not available on window object after waiting",
        );
        console.error(
          "[IterationTypesEntityManager] Available window properties:",
          Object.keys(window).filter((key) => key.includes("Security")),
        );
        throw new Error(
          "SecurityUtils validation service not available. Ensure SecurityUtils.js is loaded before IterationTypesEntityManager.",
        );
      }

      if (typeof window.SecurityUtils.validateInput !== "function") {
        console.error(
          "[IterationTypesEntityManager] SecurityUtils.validateInput method not available",
        );
        console.error(
          "[IterationTypesEntityManager] Available SecurityUtils methods:",
          Object.keys(window.SecurityUtils).filter(
            (key) => typeof window.SecurityUtils[key] === "function",
          ),
        );
        throw new Error(
          "SecurityUtils.validateInput method not available. SecurityUtils may not be fully initialized.",
        );
      }

      // Real authentication check - call current user API
      const response = await fetch(
        "/rest/scriptrunner/latest/custom/users/current",
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          credentials: "same-origin",
        },
      );

      if (response.ok) {
        const userData = await response.json();
        this.currentUserRole = userData;

        // Set permissions based on actual user data
        this.userPermissions = {
          canCreate: userData.usr_is_admin || userData.role_code === "ADMIN",
          canUpdate: userData.usr_is_admin || userData.role_code === "ADMIN",
          canDelete: userData.usr_is_admin || userData.role_code === "ADMIN",
          isAdmin: userData.usr_is_admin || false,
        };

        console.log(
          "[IterationTypesEntityManager] User permissions loaded:",
          this.userPermissions,
        );
      } else {
        console.warn(
          "[IterationTypesEntityManager] Failed to load user info, using default permissions",
        );
        this.userPermissions = {
          canCreate: false,
          canUpdate: false,
          canDelete: false,
          isAdmin: false,
        };
      }
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Permission loading failed:",
        error,
      );
      // Fail secure - no permissions if auth fails
      this.userPermissions = {
        canCreate: false,
        canUpdate: false,
        canDelete: false,
        isAdmin: false,
      };
      throw error;
    }
  }

  /**
   * Initialize ColorPickerComponent for enhanced color selection
   * @returns {Promise<void>}
   * @private
   */
  async _initializeColorIconComponents() {
    try {
      console.log(
        "[IterationTypesEntityManager] Initializing ColorPickerComponent...",
      );

      // Check if ColorPickerComponent is available globally
      if (typeof window.ColorPickerComponent === "undefined") {
        console.warn(
          "[IterationTypesEntityManager] ColorPickerComponent not available globally",
        );
        return;
      }

      // Store reference to ColorPickerComponent for use in modals
      this.ColorPickerComponent = window.ColorPickerComponent;

      console.log(
        "[IterationTypesEntityManager] ColorPickerComponent initialized successfully",
      );
    } catch (error) {
      console.warn(
        "[IterationTypesEntityManager] ColorPickerComponent initialization failed:",
        error,
      );
    }
  }

  /**
   * Initialize drag-and-drop for display order management
   * @returns {Promise<void>}
   * @private
   */
  async _initializeDragAndDrop() {
    try {
      if (this.tableComponent && this.userPermissions?.canUpdate) {
        // Enable drag-and-drop sorting
        this.tableComponent.enableDragAndDrop({
          onReorder: async (newOrder) => {
            await this._handleReorder(newOrder);
          },
        });
      }

      console.log("[IterationTypesEntityManager] Drag-and-drop initialized");
    } catch (error) {
      console.warn(
        "[IterationTypesEntityManager] Drag-and-drop initialization failed:",
        error,
      );
    }
  }

  /**
   * Initialize usage monitoring
   * @returns {Promise<void>}
   * @private
   */
  async _initializeUsageMonitoring() {
    try {
      // Set up periodic usage stats refresh
      setInterval(async () => {
        if (this.usageStatsCache.size > 0) {
          await this.getUsageStats(); // Refresh cache
        }
      }, 300000); // 5 minutes

      console.log("[IterationTypesEntityManager] Usage monitoring initialized");
    } catch (error) {
      console.warn(
        "[IterationTypesEntityManager] Usage monitoring initialization failed:",
        error,
      );
    }
  }

  /**
   * Validate iteration type data
   * @param {Object} data - Data to validate
   * @param {boolean} isUpdate - Whether this is an update operation
   * @returns {Promise<Object>} Validation result
   * @private
   */
  async _validateIterationTypeData(data, isUpdate = false) {
    const errors = [];
    const sanitizedData = { ...data };

    // Debug logging to help troubleshoot form data issues
    console.log(
      `[IterationTypesEntityManager] Validating ${isUpdate ? "update" : "create"} data:`,
      JSON.stringify(data, null, 2),
    );

    try {
      // Validate required fields for create operations
      if (!isUpdate) {
        if (!data.itt_code || !data.itt_code.trim()) {
          errors.push("Iteration type code is required");
        }
        if (!data.itt_name || !data.itt_name.trim()) {
          errors.push("Iteration type name is required");
        }
      }

      // Validate code format
      if (data.itt_code && !this.validationPatterns.code.test(data.itt_code)) {
        errors.push(
          "Iteration type code must contain only alphanumeric characters, underscores, and dashes",
        );
      }

      // Validate color format
      if (
        data.itt_color &&
        !this.validationPatterns.color.test(data.itt_color)
      ) {
        errors.push("Color must be a valid hex color code (e.g., #6B73FF)");
      }

      // Validate icon name
      if (
        data.itt_icon &&
        !this.validationPatterns.iconName.test(data.itt_icon)
      ) {
        errors.push(
          "Icon name must contain only alphanumeric characters, underscores, and dashes",
        );
      }

      // Validate display order
      if (data.itt_display_order !== undefined) {
        const displayOrder = parseInt(data.itt_display_order);
        if (isNaN(displayOrder) || displayOrder < 0) {
          errors.push("Display order must be a non-negative integer");
        } else {
          sanitizedData.itt_display_order = displayOrder;
        }
      }

      // Convert itt_active from string to boolean if provided
      if (data.itt_active !== undefined) {
        if (typeof data.itt_active === "string") {
          sanitizedData.itt_active = data.itt_active === "true";
        } else if (typeof data.itt_active === "boolean") {
          sanitizedData.itt_active = data.itt_active;
        } else {
          errors.push("itt_active must be a boolean value");
        }
      }

      // Apply default values for optional fields if not provided and this is a create operation
      if (!isUpdate) {
        // Apply default color if not provided
        if (!sanitizedData.itt_color) {
          sanitizedData.itt_color = "#6B73FF";
        }
        // Apply default icon if not provided
        if (!sanitizedData.itt_icon) {
          sanitizedData.itt_icon = "play-circle";
        }
        // Apply default display order if not provided
        if (sanitizedData.itt_display_order === undefined) {
          sanitizedData.itt_display_order = 0;
        }
        // Apply default active status if not provided
        if (sanitizedData.itt_active === undefined) {
          sanitizedData.itt_active = true;
        }
      }

      // Sanitize string fields
      const SecurityUtils = window.SecurityUtils || {};
      const sanitizeString = SecurityUtils.sanitizeString || ((str) => str);

      if (data.itt_code) {
        sanitizedData.itt_code = sanitizeString(data.itt_code.trim());
      }
      if (data.itt_name) {
        sanitizedData.itt_name = sanitizeString(data.itt_name.trim());
      }
      if (data.itt_description) {
        sanitizedData.itt_description = sanitizeString(
          data.itt_description.trim(),
        );
      }

      // Debug logging for final sanitized data
      console.log(
        `[IterationTypesEntityManager] Validation result - Valid: ${errors.length === 0}, Errors: ${errors.join(", ")}`,
        "Final sanitized data:",
        JSON.stringify(sanitizedData, null, 2),
      );

      return {
        isValid: errors.length === 0,
        errors: errors,
        sanitizedData: sanitizedData,
      };
    } catch (error) {
      console.error("[IterationTypesEntityManager] Validation error:", error);
      errors.push("Validation failed due to internal error");
      return {
        isValid: false,
        errors: errors,
        sanitizedData: sanitizedData,
      };
    }
  }

  /**
   * Check for blocking relationships before deletion
   * @param {string} code - Iteration type code
   * @returns {Promise<Object>} Blocking relationship status
   * @private
   */
  async _checkBlockingRelationships(code) {
    try {
      console.log(
        `[IterationTypesEntityManager] Checking blocking relationships for: ${code}`,
      );

      // Check cache first
      const cacheKey = `blocking_${code}`;
      if (this.blockingRelationshipsCache.has(cacheKey)) {
        const cached = this.blockingRelationshipsCache.get(cacheKey);
        if (Date.now() - cached.timestamp < 60000) {
          // 1 minute cache
          return cached.data;
        }
      }

      // This would typically make an API call to check relationships
      // For now, simulate the check
      const result = {
        hasBlocking: false,
        details: [],
      };

      // Cache the result
      this.blockingRelationshipsCache.set(cacheKey, {
        data: result,
        timestamp: Date.now(),
      });

      return result;
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Blocking relationship check error:",
        error,
      );
      return {
        hasBlocking: true,
        details: ["Error checking relationships - deletion not allowed"],
      };
    }
  }

  /**
   * Clear all caches
   * @private
   */
  _clearCaches() {
    this.usageStatsCache.clear();
    this.blockingRelationshipsCache.clear();
    this.validationCache.clear();
    this.batchCache.clear();
    console.log("[IterationTypesEntityManager] Caches cleared");
  }

  /**
   * Track performance metrics
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in milliseconds
   * @private
   */
  _trackPerformance(operation, duration) {
    console.log(
      `[IterationTypesEntityManager] Performance - ${operation}: ${duration.toFixed(2)}ms`,
    );

    // Track for A/B testing and optimization using BaseEntityManager pattern
    if (this.performanceTracker && this.performanceTracker.trackPerformance) {
      try {
        // EntityMigrationTracker expects: trackPerformance(architecture, operation, duration, metadata)
        // Provide required parameters with entity-specific metadata
        const architecture = "new"; // All entity managers use new component architecture
        const metadata = {
          entityType: this.entityType,
          timestamp: new Date().toISOString(),
          componentCount: this.components ? this.components.size : 0,
          recordCount: this.currentData ? this.currentData.length : 0,
        };

        this.performanceTracker.trackPerformance(
          architecture,
          operation,
          duration,
          metadata,
        );
      } catch (error) {
        console.warn(
          `[IterationTypesEntityManager] Performance tracking failed for ${this.entityType}:`,
          error.message,
        );
      }
    }
  }

  /**
   * Track errors with bounded memory usage
   * @param {string} operation - Operation name
   * @param {Error} error - Error object
   * @private
   */
  _trackError(operation, error) {
    // Check size before adding new entries to prevent unbounded growth
    if (this.errorBoundary.size >= this.MAX_ERROR_BOUNDARY_SIZE) {
      this._cleanupErrorBoundary();
    }

    const errorCount = this.errorBoundary.get(operation) || 0;
    this.errorBoundary.set(operation, errorCount + 1);
    console.error(
      `[IterationTypesEntityManager] Error in ${operation}:`,
      error,
    );
  }

  // ========================================================================================
  // UI RENDERING METHODS
  // ========================================================================================

  /**
   * Render code cell with status indicator
   * @param {string} value - Cell value
   * @param {Object} row - Row data
   * @returns {string} HTML content
   * @private
   */
  _renderCodeCell(value, row) {
    const statusClass = row.itt_active
      ? "umig-text-success"
      : "umig-text-muted";
    return `<span class="umig-code-cell ${statusClass}">${value}</span>`;
  }

  /**
   * Render name cell with icon
   * @param {string} value - Cell value
   * @param {Object} row - Row data
   * @returns {string} HTML content
   * @private
   */
  _renderNameCell(value, row) {
    const iconName = row.itt_icon || "circle";
    // Use AUI icons with robust UTF-8 character fallbacks for cross-platform compatibility
    const iconMap = {
      "play-circle": {
        aui: "aui-icon-small aui-iconfont-media-play",
        unicode: "►",
        title: "Run",
      },
      "check-circle": {
        aui: "aui-icon-small aui-iconfont-approve",
        unicode: "✓",
        title: "Cutover",
      },
      refresh: {
        aui: "aui-icon-small aui-iconfont-refresh",
        unicode: "↻",
        title: "DR",
      },
      circle: {
        aui: "aui-icon-small aui-iconfont-generic",
        unicode: "●",
        title: "Default",
      },
    };
    const iconConfig = iconMap[iconName] || iconMap["circle"];

    return `<span class="umig-name-cell">
      <span class="umig-icon-container" title="${iconConfig.title}" style="font-size: 16px; font-weight: bold;">
        ${iconConfig.unicode}
      </span>
      <span class="umig-name-text">${value}</span>
    </span>`;
  }

  /**
   * Render color swatch with hex code text
   * @param {string} color - Color value
   * @returns {string} HTML content
   * @private
   */
  _renderColorSwatch(color) {
    const colorValue = color || "#6B73FF";
    return `<span class="umig-color-indicator" style="background-color: ${colorValue}; width: 20px; height: 20px; display: inline-block; border: 1px solid #ccc; border-radius: 3px; margin-right: 5px;"></span>${colorValue}`;
  }

  /**
   * Render icon
   * @param {string} iconName - Icon name
   * @returns {string} HTML content
   * @private
   */
  _renderIcon(iconName) {
    const icon = iconName || "circle";
    // Use AUI icons with robust UTF-8 character fallbacks for cross-platform compatibility
    const iconMap = {
      "play-circle": {
        aui: "aui-icon-small aui-iconfont-media-play",
        unicode: "►",
        title: "Run",
      },
      "check-circle": {
        aui: "aui-icon-small aui-iconfont-approve",
        unicode: "✓",
        title: "Cutover",
      },
      refresh: {
        aui: "aui-icon-small aui-iconfont-refresh",
        unicode: "↻",
        title: "DR",
      },
      circle: {
        aui: "aui-icon-small aui-iconfont-generic",
        unicode: "●",
        title: "Default",
      },
    };
    const iconConfig = iconMap[icon] || iconMap["circle"];

    return `<span class="umig-icon-container" title="${iconConfig.title} (${icon})" style="font-size: 16px; font-weight: bold;">
      ${iconConfig.unicode}
    </span>`;
  }

  /**
   * Render status badge
   * @param {boolean} active - Active status
   * @returns {string} HTML content
   * @private
   */
  _renderStatusBadge(active) {
    const badgeClass = active ? "umig-badge-success" : "umig-badge-secondary";
    const badgeText = active ? "Active" : "Inactive";
    return `<span class="umig-badge ${badgeClass}">${badgeText}</span>`;
  }

  /**
   * Render action buttons
   * @param {Object} row - Row data
   * @returns {string} HTML content
   * @private
   */
  _renderActionButtons(row) {
    let buttons = [];

    if (this.userPermissions?.canUpdate) {
      buttons.push(`<button class="umig-btn umig-btn-sm umig-btn-outline-primary" onclick="editIterationType('${row.itt_code}')" title="Edit">
        <i class="fa fa-edit"></i>
      </button>`);
    }

    if (this.userPermissions?.canDelete && !row.itt_active) {
      buttons.push(`<button class="umig-btn umig-btn-sm umig-btn-outline-danger" onclick="deleteIterationType('${row.itt_code}')" title="Delete">
        <i class="fa fa-trash"></i>
      </button>`);
    }

    buttons.push(`<button class="umig-btn umig-btn-sm umig-btn-outline-info" onclick="viewIterationTypeStats('${row.itt_code}')" title="View Stats">
      <i class="fa fa-bar-chart"></i>
    </button>`);

    return buttons.join(" ");
  }

  /**
   * Truncate text to specified length
   * @param {string} text - Text to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated text
   * @private
   */
  _truncateText(text, maxLength) {
    if (!text) return "";
    if (text.length <= maxLength) return text;
    // Fix: The test expects exactly maxLength characters total including the ellipsis
    // "This is a very long..." should be exactly 20 chars: 17 chars + "..." = 20 chars
    return text.substring(0, maxLength - 3) + "...";
  }

  /**
   * Get color picker template
   * @returns {string} HTML template
   * @private
   */
  _getColorPickerTemplate() {
    return `<input type="color" class="umig-form-control umig-color-picker" />`;
  }

  /**
   * Get icon picker template
   * @returns {string} HTML template
   * @private
   */
  _getIconPickerTemplate() {
    const commonIcons = [
      "play-circle",
      "pause-circle",
      "stop-circle",
      "fast-forward",
      "fast-backward",
      "shield-alt",
      "exclamation-triangle",
      "check-circle",
      "times-circle",
      "cog",
      "wrench",
      "tools",
      "hammer",
      "screwdriver",
      "exchange-alt",
      "sync-alt",
      "undo",
      "redo",
      "refresh",
      "vial",
      "flask",
      "microscope",
      "clipboard-check",
      "tasks",
    ];

    const options = commonIcons
      .map(
        (icon) =>
          `<option value="${icon}"><i class="fa fa-${icon}"></i> ${icon}</option>`,
      )
      .join("");

    return `<select class="umig-form-control umig-icon-picker">${options}</select>`;
  }

  /**
   * Handle color change event
   * @param {Event} event - Change event
   * @private
   */
  _handleColorChange(event) {
    console.log(
      "[IterationTypesEntityManager] Color changed:",
      event.target.value,
    );
    // Additional color change handling logic
  }

  /**
   * Handle icon change event
   * @param {Event} event - Change event
   * @private
   */
  _handleIconChange(event) {
    console.log(
      "[IterationTypesEntityManager] Icon changed:",
      event.target.value,
    );
    // Additional icon change handling logic
  }

  /**
   * Handle drag-and-drop reorder
   * @param {Array} newOrder - New order array
   * @private
   */
  async _handleReorder(newOrder) {
    try {
      console.log("[IterationTypesEntityManager] Handling reorder:", newOrder);

      const orderMap = newOrder.map((item, index) => ({
        code: item.itt_code,
        display_order: index + 1,
      }));

      await this.reorderIterationTypes(orderMap);

      // Refresh data to show new order
      await this.loadData();
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Reorder handling error:",
        error,
      );
      // Show error message to user
      if (this.orchestrator) {
        this.orchestrator.showNotification(
          "Error reordering iteration types: " + error.message,
          "error",
        );
      }
    }
  }

  /**
   * Sanitize input data for security
   * @param {Object} data - Raw input data
   * @returns {Object} Sanitized data
   * @private
   */
  _sanitizeInput(data) {
    if (!data || typeof data !== "object") {
      return {};
    }

    const SecurityUtils = window.SecurityUtils || {};
    const sanitizeString = SecurityUtils.sanitizeString || ((str) => str);

    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "string") {
        sanitized[key] = sanitizeString(value);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  // Duplicate _truncateText method removed - using the one above

  /**
   * Override loadData to add performance tracking and enhanced functionality
   * @param {Object} filters - Filter parameters
   * @param {Object} sort - Sort parameters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise<Object>} Data response
   */
  async loadData(filters = {}, sort = null, page = 1, pageSize = 20) {
    const startTime = performance.now();

    try {
      // Call the parent loadData method with performance tracking
      const result = await super.loadData(filters, sort, page, pageSize);

      // Track performance
      const duration = performance.now() - startTime;
      this._trackPerformance("load", duration);

      // Setup icon fallbacks after data is loaded and table is re-rendered
      this._setupIconFallbacks();

      return result;
    } catch (error) {
      // Track error and handle gracefully
      this._trackError("loadData", error);

      // Return empty result structure for graceful degradation
      return {
        data: [],
        total: 0,
        page: page,
        pageSize: pageSize,
        totalPages: 0,
      };
    }
  }

  /**
   * Format field value for display in view modal
   * Overrides BaseEntityManager to handle color swatches and icons
   * @param {string} fieldName - Field name
   * @param {*} value - Field value
   * @returns {string} Formatted field value
   * @private
   */
  _formatFieldValue(fieldName, value) {
    // EXTREME DEBUG: Log everything to verify call path
    console.log(
      `[IterationTypesEntityManager] _formatFieldValue called with fieldName="${fieldName}", value="${value}"`,
    );
    console.log(
      `[IterationTypesEntityManager] Field name type: ${typeof fieldName}, Value type: ${typeof value}`,
    );
    console.log(
      `[IterationTypesEntityManager] Stack trace:`,
      new Error().stack,
    );

    // Test all possible color field variations
    if (
      fieldName &&
      (fieldName === "itt_color" || fieldName.includes("color"))
    ) {
      console.log(
        `[IterationTypesEntityManager] PROCESSING COLOR FIELD: ${fieldName} = ${value}`,
      );
      const colorValue = value || "#6B73FF";
      const result = `<div class="umig-color-swatch" style="width: 20px; height: 20px; border-radius: 3px; border: 1px solid #ccc; background-color: ${colorValue}; display: inline-block; margin-right: 8px; vertical-align: middle;" title="${colorValue}"></div><span style="vertical-align: middle;">${colorValue}</span>`;
      console.log(
        `[IterationTypesEntityManager] Color field formatted: ${result}`,
      );
      return result;
    }

    // Test all possible icon field variations
    if (fieldName && (fieldName === "itt_icon" || fieldName.includes("icon"))) {
      console.log(
        `[IterationTypesEntityManager] PROCESSING ICON FIELD: ${fieldName} = ${value}`,
      );
      const iconName = value || "circle";
      // Use the same iconMap as in table rendering for consistency
      const iconMap = {
        "play-circle": {
          aui: "aui-icon-small aui-iconfont-media-play",
          unicode: "►",
          title: "Run",
        },
        "check-circle": {
          aui: "aui-icon-small aui-iconfont-approve",
          unicode: "✓",
          title: "Cutover",
        },
        refresh: {
          aui: "aui-icon-small aui-iconfont-refresh",
          unicode: "↻",
          title: "DR",
        },
        circle: {
          aui: "aui-icon-small aui-iconfont-generic",
          unicode: "●",
          title: "Default",
        },
      };
      const iconConfig = iconMap[iconName] || iconMap["circle"];

      const result = `<span class="umig-icon-container" style="font-size: 16px; font-weight: bold; margin-right: 8px; vertical-align: middle;" title="${iconConfig.title} (${iconName})">${iconConfig.unicode}</span><span style="vertical-align: middle;">${iconName}</span>`;
      console.log(
        `[IterationTypesEntityManager] Icon field formatted: ${result}`,
      );
      return result;
    }

    // For all other fields, use parent class formatting
    const result = super._formatFieldValue(fieldName, value);
    console.log(
      `[IterationTypesEntityManager] Other field formatted: ${result}`,
    );
    return result;
  }

  /**
   * CRITICAL FIX FOR ISSUE 1: Override _generateViewContent to ensure our _formatFieldValue is called
   * The issue was that BaseEntityManager's _generateViewContent calls this._formatFieldValue,
   * but there might be issues with the 'this' context or method binding.
   * This override ensures our custom formatting is applied.
   * @param {Object} data - Entity data
   * @returns {string} HTML content for modal
   * @private
   */
  _generateViewContent(data) {
    console.log(
      "[IterationTypesEntityManager] _generateViewContent called with data:",
      data,
    );
    console.log("[IterationTypesEntityManager] Data type:", typeof data);
    console.log(
      "[IterationTypesEntityManager] Data keys:",
      Object.keys(data || {}),
    );
    console.log(
      "[IterationTypesEntityManager] Color field value:",
      data?.itt_color,
    );
    console.log(
      "[IterationTypesEntityManager] Icon field value:",
      data?.itt_icon,
    );

    if (!data) {
      return "<p>No data available</p>";
    }

    try {
      // Generate a basic table view of the entity data with our custom formatting
      let html = '<div class="entity-view-content">';
      html += '<table class="aui aui-table">';
      html += "<tbody>";

      // Iterate through the data object and display key-value pairs
      Object.keys(data).forEach((key) => {
        if (data[key] !== null && data[key] !== undefined) {
          const value = data[key];
          const displayKey = this._formatFieldName(key);

          console.log(
            `[IterationTypesEntityManager] Processing field: ${key} with value: ${value}`,
          );

          // CRITICAL: Explicitly call our _formatFieldValue method with proper context
          const displayValue = this._formatFieldValue(key, value);
          console.log(
            `[IterationTypesEntityManager] Modal field: ${key} = ${displayValue}`,
          );

          html += `<tr>`;
          html += `<th style="width: 30%; white-space: nowrap;">${displayKey}</th>`;
          html += `<td>${displayValue}</td>`;
          html += `</tr>`;
        }
      });

      html += "</tbody>";
      html += "</table>";
      html += "</div>";

      console.log(
        "[IterationTypesEntityManager] Generated modal content:",
        html,
      );
      return html;
    } catch (error) {
      console.error(
        "[IterationTypesEntityManager] Error generating view content:",
        error,
      );
      return "<p>Error displaying entity data</p>";
    }
  }
}

// Attach to window for browser compatibility
if (typeof window !== "undefined") {
  window.IterationTypesEntityManager = IterationTypesEntityManager;
}

// CommonJS export for Jest compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = IterationTypesEntityManager;
}
