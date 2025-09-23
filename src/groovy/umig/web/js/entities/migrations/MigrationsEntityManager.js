/**
 * MigrationsEntityManager - Migrations Entity Implementation for US-087 Phase 2
 *
 * Implements Migrations entity management using the new component architecture
 * from US-082-B with BaseEntityManager pattern. This is Phase 2 of the admin GUI
 * migration, establishing the top-level entity in the hierarchy.
 *
 * Hierarchical Structure:
 * Migrations (this entity) → Iterations → Plans → Sequences → Phases → Steps → Instructions
 *
 * Features:
 * - Migrations CRUD operations with component integration
 * - Hierarchical navigation to iterations
 * - Dashboard integration for analytics
 * - Enterprise security controls (8.5/10 target)
 * - Performance optimized for large datasets
 *
 * @version 1.0.0
 * @created 2025-01-19 (US-087 Phase 2)
 * @security Enterprise-grade via ComponentOrchestrator
 * @performance Target: <3s load, <1s filter response
 */

// Direct class declaration without IIFE wrapper per ADR-057
class MigrationsEntityManager extends (window.BaseEntityManager || class {}) {
  /**
   * Initialize MigrationsEntityManager with Migrations-specific configuration
   * @param {Object} options - Configuration options from admin-gui.js
   */
  constructor(options = {}) {
    super({
      entityType: "migrations",
      ...options,
      tableConfig: {
        columns: [
          {
            key: "mig_name",
            label: "Migration Name",
            sortable: true,
            searchable: true,
            required: true,
            maxLength: 200,
          },
          {
            key: "mig_description",
            label: "Description",
            sortable: false,
            searchable: true,
            truncate: 100,
          },
          {
            key: "mig_status",
            label: "Status",
            sortable: true,
            type: "status",
            badges: true,
            options: [
              { value: "planning", label: "Planning", color: "blue" },
              { value: "active", label: "Active", color: "green" },
              { value: "on_hold", label: "On Hold", color: "yellow" },
              { value: "completed", label: "Completed", color: "gray" },
              { value: "cancelled", label: "Cancelled", color: "red" },
            ],
          },
          {
            key: "mig_type",
            label: "Migration Type",
            sortable: true,
            searchable: true,
          },
          {
            key: "mig_start_date",
            label: "Start Date",
            sortable: true,
            type: "date",
            format: "yyyy-MM-dd",
          },
          {
            key: "mig_end_date",
            label: "End Date",
            sortable: true,
            type: "date",
            format: "yyyy-MM-dd",
          },
          {
            key: "usr_id_owner",
            label: "Owner",
            sortable: true,
            searchable: true,
            renderer: (value, row) => {
              if (!value) return "Unassigned";
              // Will be enhanced to show user name when user data is available
              return window.SecurityUtils.escapeHtml(value);
            },
          },
          {
            key: "iteration_count",
            label: "Iterations",
            sortable: true,
            type: "number",
            align: "right",
            defaultValue: 0,
          },
          {
            key: "progress",
            label: "Progress",
            sortable: true,
            type: "progress",
            renderer: (value, row) => {
              const percent = value || 0;
              return `<div class="progress-bar" style="width: ${percent}%">${percent}%</div>`;
            },
          },
          {
            key: "created_at",
            label: "Created",
            sortable: true,
            type: "date",
            format: "yyyy-MM-dd HH:mm",
          },
        ],
        actions: {
          view: true,
          edit: true,
          delete: true,
          iterations: true, // Migration-specific action for hierarchical navigation
          dashboard: true, // Migration-specific dashboard view
        },
        bulkActions: {
          delete: true,
          export: true,
          setStatus: true,
        },
        defaultSort: { column: "mig_start_date", direction: "desc" },
      },
      modalConfig: {
        fields: [
          {
            name: "mig_name",
            type: "text",
            required: true,
            label: "Migration Name",
            placeholder: "Enter migration name",
            validation: {
              minLength: 3,
              maxLength: 200,
              pattern: /^[a-zA-Z0-9\s\-_\.]+$/,
              message:
                "Migration name must contain only letters, numbers, spaces, hyphens, underscores, and periods",
            },
          },
          {
            name: "mig_description",
            type: "textarea",
            required: false,
            label: "Description",
            placeholder: "Enter migration description (optional)",
            rows: 4,
            validation: {
              maxLength: 1000,
            },
          },
          {
            name: "mig_type",
            type: "select",
            required: true,
            label: "Migration Type",
            options: [], // Will be populated from migration types API
            defaultValue: "",
            loadOptions: async () => {
              // Load migration types dynamically
              try {
                const response = await fetch(
                  "/rest/scriptrunner/latest/custom/migration-types",
                  {
                    method: "GET",
                    headers: window.SecurityUtils.addCSRFProtection({
                      "Content-Type": "application/json",
                    }),
                  },
                );
                if (response.ok) {
                  const types = await response.json();
                  return types.map((type) => ({
                    value: type.id,
                    label: type.name,
                  }));
                }
              } catch (error) {
                console.error(
                  "[MigrationsEntityManager] Failed to load migration types:",
                  error,
                );
              }
              return [
                { value: "datacenter", label: "Data Center" },
                { value: "cloud", label: "Cloud Migration" },
                { value: "application", label: "Application" },
                { value: "infrastructure", label: "Infrastructure" },
              ];
            },
          },
          {
            name: "mig_status",
            type: "select",
            required: true,
            label: "Status",
            options: [
              { value: "planning", label: "Planning" },
              { value: "active", label: "Active" },
              { value: "on_hold", label: "On Hold" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ],
            defaultValue: "planning",
          },
          {
            name: "mig_start_date",
            type: "date",
            required: true,
            label: "Start Date",
            validation: {
              minDate: "today",
              message: "Start date cannot be in the past",
            },
          },
          {
            name: "mig_end_date",
            type: "date",
            required: false,
            label: "End Date",
            validation: {
              afterField: "mig_start_date",
              message: "End date must be after start date",
            },
          },
          {
            name: "usr_id_owner",
            type: "select",
            required: false,
            label: "Owner",
            placeholder: "Select owner",
            loadOptions: async () => {
              // Load users dynamically
              try {
                const response = await fetch(
                  "/rest/scriptrunner/latest/custom/users",
                  {
                    method: "GET",
                    headers: window.SecurityUtils.addCSRFProtection({
                      "Content-Type": "application/json",
                    }),
                  },
                );
                if (response.ok) {
                  const users = await response.json();
                  return users.map((user) => ({
                    value: user.id,
                    label: `${user.firstName} ${user.lastName}`,
                  }));
                }
              } catch (error) {
                console.error(
                  "[MigrationsEntityManager] Failed to load users:",
                  error,
                );
              }
              return [];
            },
          },
        ],
        title: {
          create: "Create New Migration",
          edit: "Edit Migration",
          view: "Migration Details",
        },
        size: "large",
        validation: true,
        confirmOnClose: true,
        enableTabs: false, // Will enable for Phase 2+ with iterations tab
      },
      filterConfig: {
        enabled: true,
        persistent: true,
        filters: [
          {
            name: "mig_status",
            type: "select",
            label: "Status",
            options: [
              { value: "", label: "All Status" },
              { value: "planning", label: "Planning" },
              { value: "active", label: "Active" },
              { value: "on_hold", label: "On Hold" },
              { value: "completed", label: "Completed" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
          {
            name: "mig_type",
            type: "select",
            label: "Migration Type",
            options: [], // Will be populated dynamically
          },
          {
            name: "dateRange",
            type: "dateRange",
            label: "Date Range",
            fields: ["mig_start_date", "mig_end_date"],
          },
          {
            name: "usr_id_owner",
            type: "select",
            label: "Owner",
            options: [], // Will be populated dynamically
          },
          {
            name: "search",
            type: "text",
            label: "Search",
            placeholder: "Search migrations...",
          },
        ],
      },
      paginationConfig: {
        pageSize: 20,
        showPageSizer: true,
        pageSizeOptions: [10, 20, 50, 100],
      },
    });

    // Migrations-specific properties
    this.apiBaseUrl = "/rest/scriptrunner/latest/custom/migrations";
    this.iterationsApiUrl = "/rest/scriptrunner/latest/custom/iterations";
    this.dashboardApiUrl =
      "/rest/scriptrunner/latest/custom/migrations/dashboard";

    // Performance tracking
    this.performanceTargets = {
      load: 3000, // Target: <3s for migration list
      create: 500, // Target: <500ms for creation
      update: 500, // Target: <500ms for updates
      delete: 300, // Target: <300ms for deletion
      filter: 1000, // Target: <1s for filter response
      dashboard: 2000, // Target: <2s for dashboard load
    };

    // Dashboard configuration
    this.dashboardConfig = {
      enabled: true,
      refreshInterval: 30000, // 30 seconds
      metrics: ["summary", "progress", "trends"],
    };

    console.log(
      "[MigrationsEntityManager] Initialized with component architecture",
    );
  }

  /**
   * Initialize the Migrations entity manager
   * @param {HTMLElement} container - DOM container
   * @param {Object} options - Initialize options
   * @returns {Promise<void>}
   */
  async initialize(container, options = {}) {
    try {
      console.log("[MigrationsEntityManager] Starting initialization...");

      // Validate container
      if (!container) {
        throw new Error(
          "Container is required for MigrationsEntityManager initialization",
        );
      }

      // Initialize base entity manager
      await super.initialize(container, options);

      // Setup Migrations-specific features
      await this._setupMigrationsSpecificFeatures();

      // Load initial data if not in dashboard mode
      if (!options.dashboardMode) {
        await this.loadData();
      }

      console.log("[MigrationsEntityManager] Initialization complete");
    } catch (error) {
      console.error("[MigrationsEntityManager] Failed to initialize:", error);

      // Try to clean up any partial initialization
      try {
        if (this.isInitialized) {
          await this.destroy();
        }
      } catch (cleanupError) {
        console.error(
          "[MigrationsEntityManager] Error during cleanup:",
          cleanupError,
        );
      }

      throw error;
    }
  }

  /**
   * Load iterations for a specific migration (hierarchical navigation)
   * @param {string} migrationId - Migration ID
   * @returns {Promise<Array>} Iterations
   */
  async loadIterations(migrationId) {
    const startTime = performance.now();

    try {
      console.log(
        `[MigrationsEntityManager] Loading iterations for migration ${migrationId}`,
      );

      // Security validation
      window.SecurityUtils.validateInput({ migrationId });

      // CSRF PROTECTION: Add CSRF token to request headers
      const response = await fetch(
        `${this.apiBaseUrl}/${encodeURIComponent(migrationId)}/iterations`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load iterations: ${response.status}`);
      }

      const iterations = await response.json();

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("loadIterations", operationTime);

      console.log(
        `[MigrationsEntityManager] Loaded ${iterations.length} iterations in ${operationTime.toFixed(2)}ms`,
      );

      return iterations;
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Failed to load iterations:",
        error,
      );
      this._trackError("loadIterations", error);
      throw error;
    }
  }

  /**
   * Navigate to iterations view for a migration
   * @param {string} migrationId - Migration ID
   * @param {Object} migrationData - Migration data for context
   * @returns {Promise<void>}
   */
  async navigateToIterations(migrationId, migrationData) {
    try {
      console.log(
        `[MigrationsEntityManager] Navigating to iterations for migration ${migrationId}`,
      );

      // Store navigation context for breadcrumb
      this.navigationContext = {
        parent: "migrations",
        migrationId: migrationId,
        migrationName: migrationData.mig_name,
      };

      // Emit navigation event for orchestrator
      if (this.orchestrator) {
        this.orchestrator.emit("navigate:iterations", {
          migrationId,
          migrationData,
          parentContext: this.navigationContext,
        });
      }

      // Update URL for deep linking
      if (window.history && window.history.pushState) {
        const url = new URL(window.location);
        url.pathname = `/admin-gui/iterations`;
        url.searchParams.set("migrationId", migrationId);
        window.history.pushState(
          { migrationId, entity: "iterations" },
          `Iterations - ${migrationData.mig_name}`,
          url.toString(),
        );
      }

      console.log(
        "[MigrationsEntityManager] Navigation to iterations initiated",
      );
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Failed to navigate to iterations:",
        error,
      );
      this._trackError("navigateToIterations", error);
      throw error;
    }
  }

  /**
   * Load dashboard summary data
   * @returns {Promise<Object>} Dashboard summary
   */
  async loadDashboardSummary() {
    const startTime = performance.now();

    try {
      console.log("[MigrationsEntityManager] Loading dashboard summary");

      const response = await fetch(`${this.dashboardApiUrl}/summary`, {
        method: "GET",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load dashboard summary: ${response.status}`);
      }

      const data = await response.json();
      const summary = data.data || data;

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("loadDashboardSummary", operationTime);

      console.log(
        `[MigrationsEntityManager] Dashboard summary loaded in ${operationTime.toFixed(2)}ms`,
      );

      return summary;
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Failed to load dashboard summary:",
        error,
      );
      this._trackError("loadDashboardSummary", error);
      throw error;
    }
  }

  /**
   * Load progress aggregation data
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Progress data
   */
  async loadProgressData(filters = {}) {
    const startTime = performance.now();

    try {
      console.log("[MigrationsEntityManager] Loading progress data", filters);

      const params = new URLSearchParams();
      if (filters.migrationId)
        params.append("migrationId", filters.migrationId);
      if (filters.dateFrom) params.append("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.append("dateTo", filters.dateTo);

      const response = await fetch(
        `${this.dashboardApiUrl}/progress?${params.toString()}`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load progress data: ${response.status}`);
      }

      const data = await response.json();
      const progress = data.data || data;

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("loadProgressData", operationTime);

      console.log(
        `[MigrationsEntityManager] Progress data loaded in ${operationTime.toFixed(2)}ms`,
      );

      return progress;
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Failed to load progress data:",
        error,
      );
      this._trackError("loadProgressData", error);
      throw error;
    }
  }

  /**
   * Bulk update migration status
   * @param {Array} migrationIds - Migration IDs
   * @param {string} status - New status
   * @returns {Promise<Object>} Update result
   */
  async bulkUpdateStatus(migrationIds, status) {
    const startTime = performance.now();

    try {
      console.log(
        `[MigrationsEntityManager] Bulk updating ${migrationIds.length} migrations to status: ${status}`,
      );

      // Security validation
      window.SecurityUtils.validateInput({ migrationIds, status });

      const requestBody = window.SecurityUtils.preventXSS({
        migrationIds,
        status,
        updatedBy: window.adminGui?.state?.currentUser?.userId,
      });

      const response = await fetch(`${this.apiBaseUrl}/bulk/status`, {
        method: "PUT",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Bulk status update failed: ${response.status}`);
      }

      const result = await response.json();

      // Refresh data to reflect changes
      await this.loadData(
        this.currentFilters,
        this.currentSort,
        this.currentPage,
      );

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("bulkUpdateStatus", operationTime);

      console.log(
        `[MigrationsEntityManager] Bulk status update completed in ${operationTime.toFixed(2)}ms`,
      );

      return result;
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Bulk status update failed:",
        error,
      );
      this._trackError("bulkUpdateStatus", error);
      throw error;
    }
  }

  // Protected Methods (BaseEntityManager implementations)

  /**
   * Fetch migrations data from API
   * @param {Object} filters - Filter parameters
   * @param {Object} sort - Sort parameters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise<Object>} API response
   * @protected
   */
  async _fetchEntityData(filters = {}, sort = null, page = 1, pageSize = 20) {
    try {
      console.log("[MigrationsEntityManager] Fetching migrations data", {
        filters,
        sort,
        page,
        pageSize,
      });

      const params = new URLSearchParams();

      // Add pagination
      params.append("page", page.toString());
      params.append("size", pageSize.toString());

      // Add sorting
      if (sort && sort.field) {
        params.append("sort", sort.field);
        params.append("direction", sort.direction || "asc");
      }

      // Add filters
      Object.keys(filters).forEach((key) => {
        if (
          filters[key] !== null &&
          filters[key] !== undefined &&
          filters[key] !== ""
        ) {
          params.append(key, filters[key]);
        }
      });

      // Make API call with CSRF protection
      const response = await fetch(`${this.apiBaseUrl}?${params.toString()}`, {
        method: "GET",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Failed to fetch migrations: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log("[MigrationsEntityManager] Migrations data fetched:", data);

      // Transform the response to expected format
      return {
        data: Array.isArray(data)
          ? data
          : data.content || data.data || data.migrations || [],
        total:
          data.totalElements ||
          data.total ||
          (Array.isArray(data) ? data.length : 0),
        page: data.page || page,
        pageSize: data.pageSize || pageSize,
      };
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Failed to fetch migrations data:",
        error,
      );
      throw error;
    }
  }

  /**
   * Create new migration via API
   * @param {Object} data - Migration data
   * @returns {Promise<Object>} Created migration
   * @protected
   */
  async _createEntityData(data) {
    try {
      console.log("[MigrationsEntityManager] Creating new migration:", data);

      // Security validation
      window.SecurityUtils.validateInput(data);

      const response = await fetch(this.apiBaseUrl, {
        method: "POST",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Failed to create migration: ${response.status} - ${error}`,
        );
      }

      const createdMigration = await response.json();
      console.log(
        "[MigrationsEntityManager] Migration created:",
        createdMigration,
      );

      return createdMigration;
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Failed to create migration:",
        error,
      );
      throw error;
    }
  }

  /**
   * Update migration via API
   * @param {string} id - Migration ID
   * @param {Object} data - Updated migration data
   * @returns {Promise<Object>} Updated migration
   * @protected
   */
  async _updateEntityData(id, data) {
    try {
      console.log("[MigrationsEntityManager] Updating migration:", id, data);

      // Security validation
      window.SecurityUtils.validateInput({ id, ...data });

      const response = await fetch(
        `${this.apiBaseUrl}/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(data),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Failed to update migration: ${response.status} - ${error}`,
        );
      }

      const updatedMigration = await response.json();
      console.log(
        "[MigrationsEntityManager] Migration updated:",
        updatedMigration,
      );

      return updatedMigration;
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Failed to update migration:",
        error,
      );
      throw error;
    }
  }

  /**
   * Delete migration via API
   * @param {string} id - Migration ID
   * @returns {Promise<void>}
   * @protected
   */
  async _deleteEntityData(id) {
    try {
      console.log("[MigrationsEntityManager] Deleting migration:", id);

      // Security validation
      window.SecurityUtils.validateInput({ id });

      const response = await fetch(
        `${this.apiBaseUrl}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Failed to delete migration: ${response.status} - ${error}`,
        );
      }

      console.log("[MigrationsEntityManager] Migration deleted successfully");
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Failed to delete migration:",
        error,
      );
      throw error;
    }
  }

  /**
   * Enhanced validation for Migrations entity
   * @param {Object} data - Migration data
   * @param {string} operation - Operation type
   * @protected
   */
  _validateEntityData(data, operation) {
    super._validateEntityData(data, operation);

    // Migrations-specific validation
    if (operation === "create" || operation === "update") {
      if (
        !data.mig_name ||
        typeof data.mig_name !== "string" ||
        data.mig_name.trim().length < 3
      ) {
        throw new Error(
          "Migration name is required and must be at least 3 characters",
        );
      }

      if (data.mig_name.length > 200) {
        throw new Error("Migration name cannot exceed 200 characters");
      }

      if (data.mig_description && data.mig_description.length > 1000) {
        throw new Error("Migration description cannot exceed 1000 characters");
      }

      // Date validation
      if (data.mig_start_date && data.mig_end_date) {
        const startDate = new Date(data.mig_start_date);
        const endDate = new Date(data.mig_end_date);
        if (endDate < startDate) {
          throw new Error("End date must be after start date");
        }
      }

      // XSS prevention
      const sanitized = window.SecurityUtils.sanitizeInput(data.mig_name);
      if (sanitized !== data.mig_name) {
        throw new Error("Migration name contains invalid characters");
      }
    }
  }

  // Private Methods

  /**
   * Setup Migrations-specific features
   * @private
   */
  async _setupMigrationsSpecificFeatures() {
    try {
      console.log(
        "[MigrationsEntityManager] Setting up Migrations-specific features",
      );

      // Setup event handlers
      this._setupMigrationsEventHandlers();

      // Setup dashboard integration if enabled
      if (this.dashboardConfig.enabled) {
        await this._initializeDashboard();
      }

      console.log(
        "[MigrationsEntityManager] Migrations-specific features setup completed",
      );
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Error in _setupMigrationsSpecificFeatures:",
        error,
      );
      throw error;
    }
  }

  /**
   * Setup Migrations-specific event handlers
   * @private
   */
  _setupMigrationsEventHandlers() {
    if (this.orchestrator) {
      // Handle iterations navigation
      this.orchestrator.on("table:iterations", async (event) => {
        await this.navigateToIterations(event.data.id, event.data);
      });

      // Handle dashboard view
      this.orchestrator.on("table:dashboard", async (event) => {
        await this._showDashboard(event.data);
      });

      // Handle bulk status updates
      this.orchestrator.on("table:bulkStatus", async (event) => {
        await this.bulkUpdateStatus(event.selectedIds, event.status);
      });
    }
  }

  /**
   * Initialize dashboard functionality
   * @private
   */
  async _initializeDashboard() {
    try {
      console.log("[MigrationsEntityManager] Initializing dashboard");

      // Create dashboard container
      this.dashboardContainer = document.createElement("div");
      this.dashboardContainer.className = "migrations-dashboard";
      this.dashboardContainer.style.display = "none";

      // Add to main container
      if (this.container) {
        this.container.appendChild(this.dashboardContainer);
      }

      // Setup refresh interval
      if (this.dashboardConfig.refreshInterval) {
        this.dashboardRefreshTimer = setInterval(() => {
          if (this.dashboardContainer.style.display !== "none") {
            this._refreshDashboard();
          }
        }, this.dashboardConfig.refreshInterval);
      }

      console.log("[MigrationsEntityManager] Dashboard initialized");
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Failed to initialize dashboard:",
        error,
      );
      // Non-critical error, continue without dashboard
    }
  }

  /**
   * Show dashboard view
   * @param {Object} migrationData - Optional migration data for filtered view
   * @private
   */
  async _showDashboard(migrationData = null) {
    try {
      console.log("[MigrationsEntityManager] Showing dashboard");

      // Load dashboard data
      const summary = await this.loadDashboardSummary();
      const progress = await this.loadProgressData(
        migrationData ? { migrationId: migrationData.id } : {},
      );

      // Render dashboard
      this._renderDashboard(summary, progress);

      // Show dashboard, hide table
      if (this.tableComponent) {
        this.tableComponent.hide();
      }
      this.dashboardContainer.style.display = "block";

      console.log("[MigrationsEntityManager] Dashboard displayed");
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Failed to show dashboard:",
        error,
      );
      alert("Failed to load dashboard: " + error.message);
    }
  }

  /**
   * Render dashboard content
   * @param {Object} summary - Summary data
   * @param {Object} progress - Progress data
   * @private
   */
  _renderDashboard(summary, progress) {
    // Clear existing content
    this.dashboardContainer.innerHTML = "";

    // Create dashboard layout
    const dashboard = document.createElement("div");
    dashboard.className = "dashboard-content";

    // Summary section
    const summarySection = document.createElement("div");
    summarySection.className = "dashboard-summary";
    summarySection.innerHTML = `
      <h3>Migration Summary</h3>
      <div class="summary-cards">
        <div class="summary-card">
          <span class="card-label">Total Migrations</span>
          <span class="card-value">${summary.totalMigrations || 0}</span>
        </div>
        <div class="summary-card">
          <span class="card-label">Active</span>
          <span class="card-value">${summary.activeMigrations || 0}</span>
        </div>
        <div class="summary-card">
          <span class="card-label">Completed</span>
          <span class="card-value">${summary.completedMigrations || 0}</span>
        </div>
        <div class="summary-card">
          <span class="card-label">On Hold</span>
          <span class="card-value">${summary.onHoldMigrations || 0}</span>
        </div>
      </div>
    `;

    // Progress section
    const progressSection = document.createElement("div");
    progressSection.className = "dashboard-progress";
    progressSection.innerHTML = `
      <h3>Progress Overview</h3>
      <div class="progress-content">
        ${this._renderProgressChart(progress)}
      </div>
    `;

    // Back to table button
    const backButton = document.createElement("button");
    backButton.className = "aui-button";
    backButton.textContent = "Back to Table";
    backButton.onclick = () => this._hideDashboard();

    dashboard.appendChild(backButton);
    dashboard.appendChild(summarySection);
    dashboard.appendChild(progressSection);

    this.dashboardContainer.appendChild(dashboard);
  }

  /**
   * Render progress chart
   * @param {Object} progress - Progress data
   * @returns {string} HTML string
   * @private
   */
  _renderProgressChart(progress) {
    // Simplified progress visualization
    // In production, integrate with a proper charting library
    return `
      <div class="progress-chart">
        <p>Average Completion: ${progress.averageCompletion || 0}%</p>
        <div class="progress-bar-container">
          <div class="progress-bar" style="width: ${progress.averageCompletion || 0}%"></div>
        </div>
      </div>
    `;
  }

  /**
   * Hide dashboard and return to table view
   * @private
   */
  _hideDashboard() {
    this.dashboardContainer.style.display = "none";
    if (this.tableComponent) {
      this.tableComponent.show();
    }
  }

  /**
   * Refresh dashboard data
   * @private
   */
  async _refreshDashboard() {
    try {
      const summary = await this.loadDashboardSummary();
      const progress = await this.loadProgressData();
      this._renderDashboard(summary, progress);
    } catch (error) {
      console.error(
        "[MigrationsEntityManager] Failed to refresh dashboard:",
        error,
      );
    }
  }

  /**
   * Track performance metrics
   * @param {string} operation - Operation type
   * @param {number} duration - Duration in milliseconds
   * @private
   */
  _trackPerformance(operation, duration) {
    try {
      if (!this.performanceMetrics) {
        this.performanceMetrics = {};
      }

      if (!this.performanceMetrics[operation]) {
        this.performanceMetrics[operation] = [];
      }

      this.performanceMetrics[operation].push({
        duration,
        timestamp: Date.now(),
      });

      // Keep only last 100 entries per operation type
      if (this.performanceMetrics[operation].length > 100) {
        this.performanceMetrics[operation].shift();
      }

      // Log if operation is slower than threshold
      const threshold = this.performanceTargets[operation] || 1000;
      if (duration > threshold) {
        console.warn(
          `[MigrationsEntityManager] Performance warning: ${operation} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`,
        );
      }
    } catch (error) {
      console.error(
        `[MigrationsEntityManager] Failed to track performance:`,
        error,
      );
    }
  }

  /**
   * Track errors for debugging
   * @param {string} operation - Operation type
   * @param {Error} error - Error object
   * @private
   */
  _trackError(operation, error) {
    try {
      if (!this.errorLog) {
        this.errorLog = [];
      }

      this.errorLog.push({
        operation,
        error: error.message || error,
        stack: error.stack,
        timestamp: Date.now(),
      });

      // Keep only last 100 errors
      if (this.errorLog.length > 100) {
        this.errorLog.shift();
      }

      console.error(`[MigrationsEntityManager] Error in ${operation}:`, error);
    } catch (trackingError) {
      console.error(
        `[MigrationsEntityManager] Failed to track error:`,
        trackingError,
      );
    }
  }

  /**
   * Clean up resources
   * @returns {Promise<void>}
   */
  async destroy() {
    try {
      console.log("[MigrationsEntityManager] Destroying instance");

      // Clear dashboard refresh timer
      if (this.dashboardRefreshTimer) {
        clearInterval(this.dashboardRefreshTimer);
        this.dashboardRefreshTimer = null;
      }

      // Remove dashboard container
      if (this.dashboardContainer && this.dashboardContainer.parentNode) {
        this.dashboardContainer.parentNode.removeChild(this.dashboardContainer);
        this.dashboardContainer = null;
      }

      // Call parent destroy
      await super.destroy();

      console.log("[MigrationsEntityManager] Instance destroyed");
    } catch (error) {
      console.error("[MigrationsEntityManager] Error during destroy:", error);
      throw error;
    }
  }
}

// Make available globally for browser compatibility
window.MigrationsEntityManager = MigrationsEntityManager;
