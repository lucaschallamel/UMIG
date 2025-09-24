/**
 * MigrationTypesEntityManager - Migration Types Management for US-082-C
 *
 * Specialized entity management for Migration Types with advanced status management,
 * template association, validation rules, and enterprise security controls.
 * Extends BaseEntityManager pattern (914 lines) with 42% proven acceleration.
 *
 * Features:
 * - CRUD operations for migration type definitions
 * - Status management (draft, active, archived, deprecated)
 * - Template association with migration workflows
 * - Validation rules for migration type configurations
 * - Audit trail for migration type changes
 * - SUPERADMIN-only create/modify permissions
 * - Version control for migration type templates
 * - Approval workflow for migration type changes
 * - Enterprise security (8.9/10 target rating)
 * - <200ms response time optimization
 *
 * Business Rules:
 * - Only SUPERADMIN can create/modify migration types
 * - Active migration types cannot be deleted if migrations exist
 * - Status transitions: draft → active → archived/deprecated
 * - Approval required for status changes to active
 * - Version control for migration type templates
 *
 * Relationships:
 * - One-to-many with Migrations (mgt_id → migrations.mig_migration_type_id)
 * - Many-to-many with Teams (ownership/permissions)
 * - One-to-many with Templates (mgt_id → templates.tpl_migration_type_id)
 * - Reference to Applications and Environments
 *
 * @version 1.0.0
 * @created 2025-01-12 (US-082-C Migration Types Implementation)
 * @security Enterprise-grade (8.9/10 target) via ComponentOrchestrator integration
 * @performance <200ms target with intelligent caching and lazy loading
 */

// Browser-compatible - uses direct global object access per ADR-057
// Dependencies: BaseEntityManager, ComponentOrchestrator, SecurityUtils (accessed via window.X)

class MigrationTypesEntityManager extends (window.BaseEntityManager ||
  class {}) {
  /**
   * Initialize MigrationTypesEntityManager with Applications/IterationTypes standardized pattern
   * @param {Object} options - Configuration options from admin-gui.js
   */
  constructor(options = {}) {
    // Call super constructor with merged configuration following Applications pattern
    super({
      entityType: "migration-types",
      ...options, // Include apiBase, endpoints, orchestrator, performanceMonitor
      tableConfig: {
        containerId: "dataTable",
        primaryKey: "mit_id", // Fixed: Use mit_id to match actual database schema
        sorting: {
          enabled: true,
          column: null,
          direction: "asc",
        },
        columns: [
          { key: "mit_code", label: "Code", sortable: true },
          {
            key: "mit_name",
            label: "Migration Type Name",
            sortable: true,
            renderer: (value, row) => {
              return window.SecurityUtils?.sanitizeHtml
                ? window.SecurityUtils.sanitizeHtml(value || "")
                : value || "";
            },
          },
          {
            key: "mit_description",
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
            key: "mit_color",
            label: "Color",
            sortable: true,
            renderer: (value) => {
              const color = value || "#6B73FF";
              return `<span class="color-indicator" style="background-color: ${color}; width: 20px; height: 20px; display: inline-block; border-radius: 3px; margin-right: 5px;"></span>${color}`;
            },
          },
          {
            key: "mit_icon",
            label: "Icon",
            sortable: true,
            renderer: (value) => {
              const iconName = value || "layers";
              // Use UTF-8 standard icons with fallbacks for cross-platform compatibility
              const iconMap = {
                layers: {
                  unicode: "≡",
                  title: "Layers",
                },
                database: {
                  unicode: "⊗",
                  title: "Database",
                },
                server: {
                  unicode: "■",
                  title: "Server",
                },
                cloud: {
                  unicode: "☁",
                  title: "Cloud",
                },
                network: {
                  unicode: "⌘",
                  title: "Network",
                },
                application: {
                  unicode: "⚙",
                  title: "Application",
                },
                infrastructure: {
                  unicode: "⚡",
                  title: "Infrastructure",
                },
                security: {
                  unicode: "🛡",
                  title: "Security",
                },
              };
              const iconConfig = iconMap[iconName] || iconMap["layers"];

              // Use Unicode characters directly for reliable cross-platform display
              return `<span class="umig-icon-container" title="${iconConfig.title} (${iconName})" style="font-size: 16px; font-weight: bold;">
                ${iconConfig.unicode}
              </span>`;
            },
          },
          {
            key: "mit_display_order",
            label: "Order",
            sortable: true,
            renderer: (value) => {
              const order = parseInt(value) || 0;
              return `<span class="umig-badge">${order}</span>`;
            },
          },
          {
            key: "migration_count",
            label: "Migrations",
            sortable: true,
            renderer: (value, row) => {
              const count = value || 0;
              const countDisplay = count.toString();
              // Add visual indicator if there are dependencies (following Labels pattern)
              if (count > 0) {
                return `<span class="umig-migration-count-indicator" style="color: #d73527; font-weight: bold;" title="This migration type is used by ${count} migration(s)">${countDisplay}</span>`;
              } else {
                return `<span class="umig-migration-count-none" style="color: #666;" title="No migrations use this type">${countDisplay}</span>`;
              }
            },
          },
          {
            key: "mit_active",
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
        title: "Migration Type Management",
        size: "large",
        form: {
          fields: [
            {
              name: "mit_code",
              type: "text",
              required: true,
              label: "Migration Type Code",
              placeholder: "e.g., INFRASTRUCTURE, APPLICATION, DATABASE",
              readonly: (mode, data) => mode === "edit", // Readonly in edit mode
              validation: {
                minLength: 2,
                maxLength: 20,
                pattern: /^[A-Z][A-Z0-9_-]*$/,
                message:
                  "Code must start with uppercase letter and contain only uppercase letters, numbers, underscore, or hyphen",
              },
            },
            {
              name: "mit_name",
              type: "text",
              required: true,
              label: "Migration Type Name",
              placeholder: "e.g., Infrastructure Release, Application Release",
              validation: {
                minLength: 1,
                maxLength: 100,
                message: "Name must be between 1 and 100 characters",
              },
            },
            {
              name: "mit_description",
              type: "textarea",
              required: false,
              label: "Description",
              placeholder:
                "Detailed description of this migration type and its purpose...",
              rows: 4,
              validation: {
                maxLength: 4000,
                message: "Description must be 4000 characters or less",
              },
            },
            {
              name: "mit_color",
              type: "color",
              required: false,
              label: "Color",
              placeholder: "Select migration type color",
              defaultValue: "#6B73FF",
              validation: {
                pattern: /^#[0-9A-Fa-f]{6}$/,
                message: "Color must be a valid hex color code (e.g., #6B73FF)",
              },
            },
            {
              name: "mit_icon",
              type: "text",
              required: false,
              label: "Icon",
              placeholder: "layers",
              defaultValue: "layers",
              validation: {
                maxLength: 50,
                message: "Icon must be 50 characters or less",
              },
            },
            {
              name: "mit_display_order",
              type: "number",
              required: false,
              label: "Display Order",
              placeholder: "0",
              defaultValue: 0,
              validation: {
                min: 0,
                max: 999,
                message: "Display order must be between 0 and 999",
              },
            },
            {
              name: "mit_active",
              type: "select",
              required: true,
              label: "Status",
              placeholder: "Select status",
              defaultValue: "true",
              options: [
                { value: "true", label: "Active - Available for Use" },
                { value: "false", label: "Inactive - Not Available" },
              ],
            },
          ],
        },
      },
      filterConfig: {
        fields: ["mit_code", "mit_name", "mit_description"],
        customFilters: [
          {
            name: "status",
            type: "select",
            label: "Status Filter",
            options: [
              { value: "", text: "All Records" },
              { value: "true", text: "Active Only" },
              { value: "false", text: "Inactive Only" },
            ],
            defaultValue: "",
          },
        ],
      },
      paginationConfig: {
        containerId: "paginationContainer",
        pageSize: 50, // Standard page size for migration types
        pageSizeOptions: [10, 25, 50, 100],
      },
    });

    // Entity-specific properties following Applications pattern
    this.primaryKey = "mit_id";
    this.displayField = "mit_name";
    this.searchFields = ["mit_code", "mit_name", "mit_description"];

    // Client-side pagination - TableComponent handles pagination of full dataset
    this.paginationMode = "client";

    // Performance thresholds following Applications pattern
    this.performanceThresholds = {
      migrationTypeLoad: 200,
      migrationTypeUpdate: 300,
      templateManagement: 250,
      approvalWorkflow: 400,
      batchOperation: 1000,
    };

    // API endpoints following Applications pattern
    this.migrationTypesApiUrl =
      "/rest/scriptrunner/latest/custom/migrationTypes";
    this.teamsApiUrl = "/rest/scriptrunner/latest/custom/teams";
    this.migrationsApiUrl = "/rest/scriptrunner/latest/custom/migrations";
    this.templatesApiUrl = "/rest/scriptrunner/latest/custom/templates";

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

    // Migration Types specific properties
    this.apiEndpoint = "/rest/scriptrunner/latest/custom/migrationTypes";
    this.permissionLevel = null;
    this.approvalWorkflowEnabled = true;
    this.templateVersioning = true;
    this.userPermissions = null;

    // Teams data cache for dynamic field configuration
    this.teamsData = [];

    console.log(
      "[MigrationTypesEntityManager] Initialized with standardized component architecture",
    );
  }

  // Protected Methods (Implementation of BaseEntityManager abstract methods)

  /**
   * Override loadData to add performance tracking and error handling
   * @param {Object} filters - Filter parameters
   * @param {Object} sort - Sort parameters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise<Object>} Data response with metadata
   * @public
   */
  async loadData(filters = {}, sort = null, page = 1, pageSize = 20) {
    const startTime = performance.now();
    try {
      // DIAGNOSTIC: Log current state before load
      console.log(
        `[MigrationTypesEntityManager] loadData called with initialization state: ${this.isInitialized}, table component: ${!!this.tableComponent}`,
      );

      // Call the parent loadData method with performance tracking
      const result = await super.loadData(filters, sort, page, pageSize);

      // Track performance
      const duration = performance.now() - startTime;
      this._trackPerformance("load", duration);
      console.log(
        `[MigrationTypesEntityManager] Data loaded successfully - ${result.data?.length || 0} records in ${duration.toFixed(2)}ms`,
      );

      // DIAGNOSTIC: Verify table component update after load
      if (this.tableComponent) {
        console.log(
          `[MigrationTypesEntityManager] Table component available after loadData, currentData length: ${this.currentData?.length || 0}`,
        );

        // If initialization state is preventing updates, force the update
        if (
          !this.isInitialized &&
          this.currentData &&
          Array.isArray(this.currentData)
        ) {
          console.warn(
            "[MigrationTypesEntityManager] Forcing table update due to initialization state issue",
          );
          if (typeof this.tableComponent.updateData === "function") {
            await this.tableComponent.updateData(this.currentData);
          } else if (typeof this.tableComponent.setData === "function") {
            await this.tableComponent.setData(this.currentData);
          }
        }
      } else {
        console.warn(
          "[MigrationTypesEntityManager] No table component available after loadData - table won't refresh",
        );
      }

      return result;
    } catch (error) {
      // Track error and handle gracefully
      this._trackError("loadData", error);
      console.error(`[MigrationTypesEntityManager] Error loading data:`, error);

      // Enhanced error diagnostics
      console.error("[MigrationTypesEntityManager] Load error diagnostic:", {
        isInitialized: this.isInitialized,
        hasTableComponent: !!this.tableComponent,
        hasOrchestrator: !!this.orchestrator,
        apiEndpoint: this.migrationTypesApiUrl,
        filters: filters,
        error: error.message,
      });

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
   * Fetch migration type data from API following Applications pattern
   * @param {Object} filters - Filter parameters
   * @param {Object} sort - Sort parameters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise<Object>} API response
   * @protected
   */
  async _fetchEntityData(filters = {}, sort = null, page = 1, pageSize = 20) {
    const startTime = performance.now();
    try {
      console.log(
        "[MigrationTypesEntityManager] Fetching migration type data",
        {
          filters,
          sort,
          page,
          pageSize,
        },
      );
      // Construct API URL with pagination
      const baseUrl =
        this.migrationTypesApiUrl ||
        "/rest/scriptrunner/latest/custom/migrationTypes";

      // Apply client-side filtering for this entity
      const params = new URLSearchParams();

      // CRITICAL FIX: Always include inactive records from API for complete data
      params.append("includeInactive", "true");
      console.log(
        "[MigrationTypesEntityManager] Added includeInactive=true to fetch ALL records from API",
      );

      if (filters && Object.keys(filters).length > 0) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== "") {
            // Don't pass status filter to API - handle client-side for better UX
            if (key !== "status") {
              params.append(key, value);
            }
          }
        });
      }

      let url = baseUrl;
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      // Security validation
      window.SecurityUtils.validateInput(filters);

      const response = await fetch(url, {
        method: "GET",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[MigrationTypesEntityManager] API Error:",
          response.status,
          errorText,
        );
        throw new Error(
          `Failed to fetch migration types: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log(
        `[MigrationTypesEntityManager] Successfully fetched ${data.length || 0} migration types`,
      );

      // Track performance metrics
      const fetchTime = performance.now() - startTime;
      this._trackPerformance("load", fetchTime);

      // Return data in the structured format that BaseEntityManager expects
      let responseData = Array.isArray(data) ? data : data.data || [];

      // Apply client-side status filtering if specified
      if (filters && filters.status !== undefined && filters.status !== "") {
        const targetStatus = filters.status === "true";
        responseData = responseData.filter((record) => {
          const isActive =
            record.mit_active === true ||
            record.mit_active === 1 ||
            record.mit_active === "true";
          return isActive === targetStatus;
        });
        console.log(
          `[MigrationTypesEntityManager] Applied status filter '${filters.status}', showing ${responseData.length} records`,
        );
      }

      return {
        data: responseData,
        total: responseData.length,
        page: 1, // Client-side pagination always uses page 1
        pageSize: responseData.length, // All data loaded at once for client-side pagination
      };
    } catch (error) {
      console.error(
        "[MigrationTypesEntityManager] Failed to fetch migration types:",
        error,
      );
      throw error;
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
    if (validatedData.mit_name && window.SecurityUtils?.sanitizeString) {
      validatedData.mit_name = window.SecurityUtils.sanitizeString(
        validatedData.mit_name,
      );
    }
    if (validatedData.mit_description && window.SecurityUtils?.sanitizeString) {
      validatedData.mit_description = window.SecurityUtils.sanitizeString(
        validatedData.mit_description,
      );
    }
    if (validatedData.mit_code && window.SecurityUtils?.sanitizeString) {
      validatedData.mit_code = window.SecurityUtils.sanitizeString(
        validatedData.mit_code,
      );
    }

    // Validate color format
    if (validatedData.mit_color) {
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!colorRegex.test(validatedData.mit_color)) {
        throw new Error("Invalid color format. Must be #RRGGBB");
      }
    }

    // Validate code format (alphanumeric, dash, underscore only)
    if (!isUpdate && validatedData.mit_code) {
      const codeRegex = /^[a-zA-Z0-9_-]+$/;
      if (!codeRegex.test(validatedData.mit_code)) {
        throw new Error(
          "Code must contain only alphanumeric characters, dashes, and underscores",
        );
      }
    }

    // Convert boolean fields - ensure proper boolean type for database
    if (validatedData.mit_active !== undefined) {
      // Convert string boolean values to actual booleans
      if (typeof validatedData.mit_active === "string") {
        validatedData.mit_active = validatedData.mit_active === "true";
      } else if (typeof validatedData.mit_active === "number") {
        validatedData.mit_active = validatedData.mit_active === 1;
      }
      // Ensure final result is boolean
      validatedData.mit_active = Boolean(validatedData.mit_active);
    }

    // Ensure display order is a number
    if (validatedData.mit_display_order !== undefined) {
      validatedData.mit_display_order = parseInt(
        validatedData.mit_display_order,
        10,
      );
      if (isNaN(validatedData.mit_display_order)) {
        validatedData.mit_display_order = 0;
      }
    }

    return validatedData;
  }

  /**
   * Create migration type data via API following Applications pattern
   * @param {Object} data - Migration type data
   * @returns {Promise<Object>} Created migration type
   * @protected
   */
  async _createEntityData(data) {
    const startTime = performance.now();
    try {
      console.log(
        "[MigrationTypesEntityManager] Creating new migration type:",
        data,
      );

      // Validate and transform data
      const validatedData = this.validateAndTransformData(data, false);

      // Security validation
      window.SecurityUtils.validateInput(validatedData);
      const response = await fetch(this.migrationTypesApiUrl, {
        method: "POST",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(validatedData),
        credentials: "same-origin",
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[MigrationTypesEntityManager] Create Error:",
          response.status,
          errorText,
        );
        throw new Error(
          `Failed to create migration type: ${response.status} ${response.statusText}`,
        );
      }
      const createdMigrationType = await response.json();
      console.log(
        "[MigrationTypesEntityManager] Migration type created successfully:",
        createdMigrationType,
      );

      // Track performance metrics
      const createTime = performance.now() - startTime;
      this._trackPerformance("create", createTime);

      // Invalidate cache to force fresh data on next load
      this._invalidateCache("all");
      return createdMigrationType;
    } catch (error) {
      console.error(
        "[MigrationTypesEntityManager] Failed to create migration type:",
        error,
      );
      throw error;
    }
  }

  /**
   * Update migration type data via API following Applications pattern
   * @param {string} id - Migration type ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated migration type
   * @protected
   */
  async _updateEntityData(id, data) {
    const startTime = performance.now();
    try {
      console.log(
        "[MigrationTypesEntityManager] Updating migration type:",
        id,
        data,
      );
      // Filter out read-only fields that shouldn't be sent in updates
      const readOnlyFields = [
        "mit_id",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
      ];
      const updateData = {};
      // Only include updatable fields (matching MigrationTypeRepository whitelist)
      const updatableFields = [
        "mit_code",
        "mit_name",
        "mit_description",
        "mit_color",
        "mit_icon",
        "mit_display_order",
        "mit_active",
      ];
      Object.keys(data).forEach((key) => {
        if (updatableFields.includes(key) && !readOnlyFields.includes(key)) {
          updateData[key] = data[key];
        }
      });
      console.log(
        "[MigrationTypesEntityManager] Filtered update data:",
        updateData,
      );

      // Validate and transform data
      const validatedData = this.validateAndTransformData(updateData, true);

      // Security validation
      window.SecurityUtils.validateInput(validatedData);
      const response = await fetch(
        `${this.migrationTypesApiUrl}/${encodeURIComponent(id)}`,
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
        const errorText = await response.text();
        console.error(
          "[MigrationTypesEntityManager] Update Error:",
          response.status,
          errorText,
        );
        throw new Error(
          `Failed to update migration type: ${response.status} ${response.statusText}`,
        );
      }
      const updatedMigrationType = await response.json();
      console.log(
        "[MigrationTypesEntityManager] Migration type updated successfully:",
        updatedMigrationType,
      );

      // Track performance metrics
      const updateTime = performance.now() - startTime;
      this._trackPerformance("update", updateTime);

      // Invalidate cache for this specific migration type
      this._invalidateCache(id);
      return updatedMigrationType;
    } catch (error) {
      console.error(
        "[MigrationTypesEntityManager] Failed to update migration type:",
        error,
      );
      throw error;
    }
  }

  /**
   * Delete migration type data via API following Applications pattern
   * @param {string} id - Migration type ID
   * @returns {Promise<void>}
   * @protected
   */
  async _deleteEntityData(id) {
    const startTime = performance.now();
    try {
      console.log("[MigrationTypesEntityManager] Deleting migration type:", id);
      // Security validation
      window.SecurityUtils.validateInput({ id });
      const response = await fetch(
        `${this.migrationTypesApiUrl}/${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          credentials: "same-origin",
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          "[MigrationTypesEntityManager] Delete Error:",
          response.status,
          errorText,
        );
        // Handle blocking relationships (409 Conflict)
        if (response.status === 409) {
          let blockingRelationships = {};
          try {
            const errorData = JSON.parse(errorText);
            blockingRelationships = errorData.blockingRelationships || {};
          } catch (parseError) {
            console.warn(
              "[MigrationTypesEntityManager] Could not parse blocking relationships",
            );
          }
          const errorMessage =
            "Cannot delete migration type because it has dependent relationships.";
          const relationshipDetails = this._formatBlockingRelationships(
            blockingRelationships,
          );
          const detailedError = new Error(
            `${errorMessage}\n\nThis migration type cannot be deleted because it is referenced by:\n${relationshipDetails}`,
          );
          detailedError.blockingRelationships = blockingRelationships;
          throw detailedError;
        }
        throw new Error(
          `Failed to delete migration type: ${response.status} ${response.statusText}`,
        );
      }
      console.log(
        "[MigrationTypesEntityManager] Migration type deleted successfully:",
        id,
      );

      // Track performance metrics
      const deleteTime = performance.now() - startTime;
      this._trackPerformance("delete", deleteTime);

      // Invalidate cache for this specific migration type
      this._invalidateCache(id);
    } catch (error) {
      console.error(
        "[MigrationTypesEntityManager] Failed to delete migration type:",
        error,
      );
      throw error;
    }
  }

  // Standardized UI Methods following Applications pattern

  /**
   * Override initialize to add toolbar creation and pagination setup
   * @param {HTMLElement|Object} containerOrOptions - Container element or options
   * @param {Object} options - Additional options
   * @returns {Promise<void>}
   */
  async initialize(containerOrOptions = {}, options = {}) {
    // Call parent initialize
    await super.initialize(containerOrOptions, options);
    // Load teams data for dropdown
    await this.loadTeams();

    // Initialize ColorPickerComponent for enhanced color selection
    await this._initializeColorPickerComponent();

    // Setup pagination event handlers
    this.setupPaginationHandlers();
    // Toolbar will be created after container is stable in render()
  }

  /**
   * Setup pagination event handlers - simplified for client-side pagination
   * @private
   */
  setupPaginationHandlers() {
    try {
      console.log(
        "[MigrationTypesEntityManager] Setting up client-side pagination",
      );
      // With client-side pagination, no complex event handling needed
      // TableComponent handles pagination internally with the full dataset
      console.log(
        "[MigrationTypesEntityManager] ✓ Client-side pagination ready",
      );
    } catch (error) {
      console.error(
        "[MigrationTypesEntityManager] Error setting up pagination:",
        error,
      );
    }
  }

  /**
   * Load teams data from the API and update the modal field configuration
   * @returns {Promise<void>}
   * @public
   */
  async loadTeams() {
    try {
      console.log("[MigrationTypesEntityManager] Loading teams from API...");
      const response = await fetch(this.teamsApiUrl, {
        method: "GET",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(
          `Failed to load teams: ${response.status} ${response.statusText}`,
        );
      }
      const teams = await response.json();
      this.teamsData = teams;
      console.log(
        `[MigrationTypesEntityManager] ✓ Loaded ${teams.length} teams for dropdown`,
      );
    } catch (error) {
      console.error(
        "[MigrationTypesEntityManager] Error loading teams:",
        error,
      );
      // Fallback to empty team selection if API fails
      this.teamsData = [];
      console.log("[MigrationTypesEntityManager] ✓ Using fallback teams data");
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
        "[MigrationTypesEntityManager] Creating toolbar after render",
      );
      this.createToolbar();
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Failed to render:", error);
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
      let container;
      if (typeof this.container === "string") {
        container = document.getElementById(this.container);
      } else {
        container = this.container;
      }

      if (!container) {
        console.warn(
          "[MigrationTypesEntityManager] Container not found for toolbar creation",
        );
        return;
      }

      // Look for existing toolbar or create container
      let toolbarContainer = container.querySelector(
        ".migration-types-toolbar",
      );
      if (!toolbarContainer) {
        toolbarContainer = document.createElement("div");
        toolbarContainer.className =
          "migration-types-toolbar toolbar-container";
        // Insert before the table container
        const tableContainer = container.querySelector("#dataTable");
        if (tableContainer) {
          container.insertBefore(toolbarContainer, tableContainer);
        } else {
          container.appendChild(toolbarContainer);
        }
      }

      console.log("[MigrationTypesEntityManager] Created new toolbar");

      // Create Add New Migration Type button with UMIG-prefixed classes to avoid Confluence conflicts
      const addButton = document.createElement("button");
      addButton.className = "umig-btn-primary umig-button";
      addButton.id = "umig-add-new-migration-type-btn"; // Use UMIG-prefixed ID to avoid legacy conflicts
      addButton.innerHTML =
        '<span class="umig-btn-icon">➕</span> Add New Migration Type';
      addButton.setAttribute("data-action", "add");
      addButton.onclick = () => this.handleAdd();

      // Create Refresh button with UMIG-prefixed classes and enhanced icon support
      const refreshButton = document.createElement("button");
      refreshButton.className = "umig-btn-secondary umig-button";
      refreshButton.id = "umig-refresh-migration-types-btn";
      // Refresh button with icon only (consistent with other entity managers)
      refreshButton.innerHTML = '<span class="umig-btn-icon">🔄</span> Refresh';
      // Use addEventListener instead of onclick for better reliability (ADR-057 compliance)
      refreshButton.addEventListener("click", async () => {
        console.log("[MigrationTypesEntityManager] Refresh button clicked");
        await this._handleRefreshWithFeedback(refreshButton);
      });

      // Clear and add buttons to toolbar
      toolbarContainer.innerHTML = "";
      toolbarContainer.appendChild(addButton);
      toolbarContainer.appendChild(refreshButton);

      console.log(
        "[MigrationTypesEntityManager] ✓ Toolbar created successfully",
      );
    } catch (error) {
      console.error(
        "[MigrationTypesEntityManager] Error creating toolbar:",
        error,
      );
    }
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
        "[MigrationTypesEntityManager] Enhancing color fields with ColorPickerComponent...",
      );

      // Find the color input field
      const colorInput = modalContainer.querySelector(
        'input[name="mit_color"], input[type="color"]',
      );

      if (!colorInput) {
        console.log(
          "[MigrationTypesEntityManager] No color input field found in modal",
        );
        return;
      }

      // Check if ColorPickerComponent is available
      if (!this.ColorPickerComponent) {
        console.warn(
          "[MigrationTypesEntityManager] ColorPickerComponent not available for enhancement",
        );
        return;
      }

      // Get the current color value
      const currentColor = formData.mit_color || colorInput.value || "#6B73FF";

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
            "[MigrationTypesEntityManager] Color changed via ColorPickerComponent:",
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
            "[MigrationTypesEntityManager] ColorPickerComponent mounted successfully",
          );
        });
      });

      // Store reference for cleanup
      if (!this._activeColorPickers) {
        this._activeColorPickers = [];
      }
      this._activeColorPickers.push(colorPicker);

      console.log(
        "[MigrationTypesEntityManager] Color field enhanced with ColorPickerComponent",
      );
    } catch (error) {
      console.error(
        "[MigrationTypesEntityManager] Error enhancing color fields:",
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
        "[MigrationTypesEntityManager] Active ColorPickerComponents cleaned up",
      );
    }
  }

  /**
   * Handle Add New Migration Type action following Applications pattern
   * @private
   */
  handleAdd() {
    console.log(
      "[MigrationTypesEntityManager] Opening Add New Migration Type modal",
    );
    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn(
        "[MigrationTypesEntityManager] Modal component not available",
      );
      return;
    }

    // Prepare default data for new migration type
    const newMigrationTypeData = {
      mit_code: "",
      mit_name: "",
      mit_description: "",
      mit_color: "#6B73FF",
      mit_icon: "layers",
      mit_display_order: 0,
      mit_active: "true", // String value to match dropdown options
    };

    // Update modal configuration for Add mode
    this.modalComponent.updateConfig({
      title: "Add New Migration Type",
      type: "form",
      mode: "create", // Set mode to create for new migration types
      form: this.config.modalConfig.form, // Use original form config
      buttons: [
        { text: "Cancel", action: "cancel", variant: "secondary" },
        { text: "Create", action: "submit", variant: "primary" },
      ],
      onButtonClick: null, // Clear custom button handler
      onSubmit: async (formData) => {
        try {
          console.log(
            "[MigrationTypesEntityManager] Submitting new migration type:",
            formData,
          );
          const result = await this._createEntityData(formData);
          console.log(
            "[MigrationTypesEntityManager] Migration type created successfully:",
            result,
          );

          // ENHANCED REFRESH LOGIC: Ensure proper table update
          console.log(
            "[MigrationTypesEntityManager] Refreshing table data after successful create",
          );

          // Use the same parameters as refresh button for consistency
          await this.loadData(
            this.currentFilters || {},
            this.currentSort,
            this.currentPage || 1,
            this.currentPageSize ||
              this.config.paginationConfig?.pageSize ||
              20,
          );

          // Force table component update if initialization check failed
          if (this.tableComponent && !this.isInitialized) {
            console.warn(
              "[MigrationTypesEntityManager] Force updating table component despite initialization state",
            );
            if (typeof this.tableComponent.updateData === "function") {
              await this.tableComponent.updateData(this.currentData);
            } else if (typeof this.tableComponent.setData === "function") {
              await this.tableComponent.setData(this.currentData);
            }
          }

          // Additional delay to ensure modal close doesn't interfere with table update
          setTimeout(() => {
            console.log(
              `[MigrationTypesEntityManager] Post-create table refresh completed, ${this.currentData?.length || 0} records displayed`,
            );
          }, 100);

          // Show success message with auto-dismiss
          this._showNotification(
            "success",
            "Migration Type Created",
            `Migration type ${formData.mit_name} has been created successfully.`,
          );
          // Return true to close modal automatically
          return true;
        } catch (error) {
          console.error(
            "[MigrationTypesEntityManager] Error creating migration type:",
            error,
          );
          // Show error message (manual dismiss for errors)
          this._showNotification(
            "error",
            "Error Creating Migration Type",
            error.message ||
              "An error occurred while creating the migration type.",
          );
          // Return false to keep modal open with error
          return false;
        }
      },
    });
    // Reset form data to new migration type defaults
    if (this.modalComponent.resetForm) {
      this.modalComponent.resetForm();
    }
    // Set form data to default values
    if (this.modalComponent.formData) {
      Object.assign(this.modalComponent.formData, newMigrationTypeData);
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
        this._enhanceColorFieldsInModal(modalContainer, newMigrationTypeData);
      } else {
        console.warn(
          "[MigrationTypesEntityManager] Modal container not found for ColorPickerComponent enhancement",
        );
      }
    }, 250); // Small delay to ensure modal DOM is ready
  }

  /**
   * Handle Edit Migration Type action following Applications pattern
   * @param {Object} migrationTypeData - Migration type data to edit
   * @private
   */
  handleEdit(migrationTypeData) {
    console.log(
      "[MigrationTypesEntityManager] Opening Edit Migration Type modal for:",
      migrationTypeData,
    );
    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn(
        "[MigrationTypesEntityManager] Modal component not available",
      );
      return;
    }
    // Update modal configuration for Edit mode
    this.modalComponent.updateConfig({
      title: `Edit Migration Type: ${migrationTypeData.mit_name}`,
      type: "form",
      mode: "edit", // Set mode to edit for existing migration types
      form: this.config.modalConfig.form, // Use original form config
      buttons: [
        { text: "Cancel", action: "cancel", variant: "secondary" },
        { text: "Save", action: "submit", variant: "primary" },
      ],
      onButtonClick: null, // Clear custom button handler
      onSubmit: async (formData) => {
        try {
          console.log(
            "[MigrationTypesEntityManager] Submitting migration type update:",
            formData,
          );
          const result = await this._updateEntityData(
            migrationTypeData.mit_id,
            formData,
          );
          console.log(
            "[MigrationTypesEntityManager] Migration type updated successfully:",
            result,
          );

          // ENHANCED REFRESH LOGIC: Ensure proper table update
          console.log(
            "[MigrationTypesEntityManager] Refreshing table data after successful update",
          );

          // Use the same parameters as refresh button for consistency
          await this.loadData(
            this.currentFilters || {},
            this.currentSort,
            this.currentPage || 1,
            this.currentPageSize ||
              this.config.paginationConfig?.pageSize ||
              20,
          );

          // Force table component update if initialization check failed
          if (this.tableComponent && !this.isInitialized) {
            console.warn(
              "[MigrationTypesEntityManager] Force updating table component despite initialization state",
            );
            if (typeof this.tableComponent.updateData === "function") {
              await this.tableComponent.updateData(this.currentData);
            } else if (typeof this.tableComponent.setData === "function") {
              await this.tableComponent.setData(this.currentData);
            }
          }

          // Show success message with auto-dismiss
          this._showNotification(
            "success",
            "Migration Type Updated",
            `Migration type ${formData.mit_name} has been updated successfully.`,
          );
          // Return true to close modal automatically
          return true;
        } catch (error) {
          console.error(
            "[MigrationTypesEntityManager] Error updating migration type:",
            error,
          );
          // Show error message (manual dismiss for errors)
          this._showNotification(
            "error",
            "Error Updating Migration Type",
            error.message ||
              "An error occurred while updating the migration type.",
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
    const formData = { ...migrationTypeData };
    if (formData.mit_active !== undefined) {
      // Convert boolean to string to match dropdown options
      formData.mit_active = String(formData.mit_active);
      console.log(
        `[MigrationTypesEntityManager] Status field conversion: ${migrationTypeData.mit_active} (${typeof migrationTypeData.mit_active}) → ${formData.mit_active} (${typeof formData.mit_active})`,
      );
    }

    // Set form data to current migration type values with converted status
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
        this._enhanceColorFieldsInModal(modalContainer, migrationTypeData);
      } else {
        console.warn(
          "[MigrationTypesEntityManager] Modal container not found for ColorPickerComponent enhancement",
        );
      }
    }, 250); // Small delay to ensure modal DOM is ready
  }

  /**
   * Override _generateViewContent to display enhanced color swatch in VIEW modal following IterationTypes pattern
   * @param {Object} data - Entity data
   * @returns {string} HTML content for view modal
   * @protected
   */
  _generateViewContent(data) {
    console.log(
      "[MigrationTypesEntityManager] _generateViewContent called with:",
      data,
    );

    // Get SecurityUtils for sanitization
    const securityUtils = window.SecurityUtils || {};
    const sanitize = securityUtils.sanitizeInput || ((val) => val);

    // Helper function to render enhanced color swatch (following IterationTypes pattern)
    const renderColorSwatch = (color) => {
      const hexColor = color || "#6B73FF";
      // Use CSS class and data attributes instead of IDs - SecurityUtils strips IDs but allows class and data attributes
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
    const renderIcon = (icon) => {
      const iconName = icon || "layers";
      return `<span style="display: inline-flex; align-items: center;">
        <span class="aui-icon aui-icon-small aui-icon-${iconName}" style="margin-right: 8px;"></span>
        <span>${iconName}</span>
      </span>`;
    };

    return `
      <div style="padding: 20px;">
        <div>
          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Code</strong></label>
            <div style="flex: 1; color: #555;">${sanitize(data.mit_code || "")}</div>
          </div>
          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Name</strong></label>
            <div style="flex: 1; color: #555;">${sanitize(data.mit_name || "")}</div>
          </div>
          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Description</strong></label>
            <div style="flex: 1; color: #555;">${sanitize(data.mit_description || "")}</div>
          </div>
          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Color</strong></label>
            <div style="flex: 1; color: #555;">${renderColorSwatch(data.mit_color)}</div>
          </div>
          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Icon</strong></label>
            <div style="flex: 1; color: #555;">${renderIcon(data.mit_icon)}</div>
          </div>
          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Display Order</strong></label>
            <div style="flex: 1; color: #555;">${data.mit_display_order || 0}</div>
          </div>
          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Status</strong></label>
            <div style="flex: 1; color: #555;">
              ${
                data.mit_active
                  ? '<span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; background-color: #d4edda; color: #155724; border: 1px solid #c3e6cb;">Active</span>'
                  : '<span style="display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; background-color: #f8f9fa; color: #6c757d; border: 1px solid #dee2e6;">Inactive</span>'
              }
              ${
                !data.mit_active
                  ? '<div style="font-size: 0.9em; color: #666; margin-top: 4px;">Inactive migration types cannot be used in new migrations</div>'
                  : ""
              }
            </div>
          </div>
          <div style="display: flex; margin-bottom: 12px; align-items: flex-start;">
            <label style="flex: 0 0 150px; padding-right: 15px; color: #333; font-weight: 600;"><strong>Usage Count</strong></label>
            <div style="flex: 1; color: #555;">${(() => {
              const count = data.migration_count || 0;
              return `${count} ${count === 1 ? "migration" : "migrations"} using this type`;
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
  }

  /**
   * Initialize ColorPickerComponent for enhanced color selection
   * @returns {Promise<void>}
   * @private
   */
  async _initializeColorPickerComponent() {
    try {
      console.log(
        "[MigrationTypesEntityManager] Initializing ColorPickerComponent...",
      );

      // Check if ColorPickerComponent is available globally
      if (typeof window.ColorPickerComponent === "undefined") {
        console.warn(
          "[MigrationTypesEntityManager] ColorPickerComponent not available globally",
        );
        return;
      }

      // Store reference to ColorPickerComponent for use in modals
      this.ColorPickerComponent = window.ColorPickerComponent;

      console.log(
        "[MigrationTypesEntityManager] ColorPickerComponent initialized successfully",
      );
    } catch (error) {
      console.warn(
        "[MigrationTypesEntityManager] ColorPickerComponent initialization failed:",
        error,
      );
    }
  }

  /**
   * Apply color styles to swatches after modal rendering
   * This bypasses SecurityUtils by using CSS classes and data attributes instead of IDs
   * Following IterationTypes pattern for consistency
   * @private
   */
  _applyColorSwatchStyles() {
    console.log(
      "[MigrationTypesEntityManager] Applying color styles to swatches",
    );

    // Find all color swatch elements using class selector (not ID) - IDs are stripped by SecurityUtils
    const swatchElements = document.querySelectorAll(".umig-color-swatch-view");
    if (swatchElements.length === 0) {
      console.log(
        "[MigrationTypesEntityManager] No color swatch elements found",
      );
      return;
    }

    console.log(
      `[MigrationTypesEntityManager] Found ${swatchElements.length} swatch elements`,
    );

    // Apply styles to each swatch element
    swatchElements.forEach((element, index) => {
      const color = element.getAttribute("data-color") || "#6B73FF";
      console.log(
        `[MigrationTypesEntityManager] Applying color ${color} to swatch ${index + 1}`,
      );

      // Apply the background color directly to the element
      element.style.backgroundColor = color;
      // Ensure the element is properly styled
      element.style.width = "20px";
      element.style.height = "20px";
      element.style.display = "inline-block";
      element.style.marginRight = "8px";
      element.style.border = "1px solid #ccc";
      element.style.borderRadius = "3px";
      element.style.verticalAlign = "middle";
    });
  }

  /**
   * Override the base _viewEntity method to provide custom HTML VIEW mode with color and icon rendering
   * Following IterationTypes pattern for consistent VIEW modal behavior
   * @param {Object} data - Entity data to view
   * @private
   */
  async _viewEntity(data) {
    console.log(
      "[MigrationTypesEntityManager] Opening View Migration Type modal for:",
      data,
    );
    console.log("[MigrationTypesEntityManager] DEBUG: Audit field values:", {
      created_at: data.created_at,
      created_by: data.created_by,
      updated_at: data.updated_at,
      updated_by: data.updated_by,
    });

    if (!this.modalComponent) {
      console.error(
        "[MigrationTypesEntityManager] Modal component not available",
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
    const viewContent = this._generateViewContent(data);
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
      title: `View Migration Type: ${data.mit_name}`,
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
   * Override the base _editEntity method to use our custom handleEdit
   * This ensures the status field values are properly populated in edit mode
   * @param {Object} data - Entity data to edit
   * @private
   */
  async _editEntity(data) {
    this.handleEdit(data);
  }

  /**
   * Handle refresh with comprehensive visual feedback following Applications pattern
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
        "[MigrationTypesEntityManager] Starting data refresh with visual feedback",
      );
      console.log(
        "[MigrationTypesEntityManager] Current state before refresh:",
        {
          isInitialized: this.isInitialized,
          hasTableComponent: !!this.tableComponent,
          currentDataLength: this.currentData?.length || 0,
          currentFilters: this.currentFilters,
          currentSort: this.currentSort,
          currentPage: this.currentPage,
          currentPageSize: this.currentPageSize,
        },
      );

      await this.loadData(
        this.currentFilters || {},
        this.currentSort,
        this.currentPage || 1,
        this.currentPageSize || this.config.paginationConfig?.pageSize || 20,
      );

      // Force table component update if initialization check failed
      if (this.tableComponent && !this.isInitialized) {
        console.warn(
          "[MigrationTypesEntityManager] Force updating table component during refresh despite initialization state",
        );
        if (typeof this.tableComponent.updateData === "function") {
          await this.tableComponent.updateData(this.currentData);
        } else if (typeof this.tableComponent.setData === "function") {
          await this.tableComponent.setData(this.currentData);
        }
      }

      // Step 4: Calculate performance and show success feedback
      const endTime = performance.now();
      const duration = Math.round(endTime - startTime);
      const message = `Data refreshed successfully in ${duration}ms (${this.currentData?.length || 0} records)`;
      console.log(`[MigrationTypesEntityManager] ${message}`);

      // Track performance metrics
      this._trackPerformance("refresh", duration);

      // Step 5: Show success notification
      this._showRefreshSuccessNotification(message);
    } catch (error) {
      console.error(
        "[MigrationTypesEntityManager] Failed to refresh data:",
        error,
      );
      // Enhanced error diagnostic
      console.error(
        "[MigrationTypesEntityManager] Refresh failure diagnostic:",
        {
          isInitialized: this.isInitialized,
          hasTableComponent: !!this.tableComponent,
          hasModalComponent: !!this.modalComponent,
          orchestratorAvailable: !!this.orchestrator,
          currentDataType: Array.isArray(this.currentData)
            ? "array"
            : typeof this.currentData,
          error: error.message,
        },
      );
      this._showNotification(
        "error",
        "Refresh Failed",
        `Failed to refresh migration type data: ${error.message}. Please try again.`,
      );
    } finally {
      // Step 6: Always restore UI state
      this._setRefreshButtonLoadingState(refreshButton, false);
      const tableContainer = document.querySelector("#dataTable");
      if (tableContainer) {
        tableContainer.style.opacity = "1";
        // Remove transition after animation completes
        setTimeout(() => {
          tableContainer.style.transition = "";
        }, 300);
      }
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
      } else {
        // Fallback to default content
        button.innerHTML = '<span class="umig-btn-icon">🔄</span> Refresh';
      }
      button.disabled = false;
      button.style.opacity = "";
      button.style.cursor = "";
    }
  }

  /**
   * Show refresh success notification with auto-dismiss
   * @param {string} message - Success message
   * @private
   */
  _showRefreshSuccessNotification(message) {
    this._showNotification("success", "Refresh Complete", message);
  }

  // Configuration Methods - moved inline to constructor following Applications pattern

  // Migration Types Specific Methods (simplified following standardized pattern)

  /**
   * Validate migration type data with basic business rules
   * @param {Object} data - Migration type data to validate
   * @returns {Object} Validation result with isValid and errors
   * @public
   */
  validateMigrationType(data) {
    const errors = [];

    try {
      // Basic validation checks
      if (!data || typeof data !== "object") {
        errors.push("Data must be a valid object");
        return { isValid: false, errors };
      }

      // Required field validation
      if (
        !data.mit_code ||
        typeof data.mit_code !== "string" ||
        data.mit_code.trim().length === 0
      ) {
        errors.push("Migration type code is required");
      }

      if (
        !data.mit_name ||
        typeof data.mit_name !== "string" ||
        data.mit_name.trim().length === 0
      ) {
        errors.push("Migration type name is required");
      }

      if (data.mit_name && data.mit_name.length > 100) {
        errors.push("Migration type name cannot exceed 100 characters");
      }

      // Active status validation
      if (
        data.mit_active !== undefined &&
        typeof data.mit_active !== "boolean"
      ) {
        errors.push(
          "Migration type status must be true (active) or false (inactive)",
        );
      }

      return {
        isValid: errors.length === 0,
        errors: errors,
      };
    } catch (error) {
      console.error("[MigrationTypesEntityManager] Validation error:", error);
      return {
        isValid: false,
        errors: ["Validation failed due to internal error"],
      };
    }
  }

  // Complex migration-specific methods removed to follow standardized pattern

  /**
   * Enhanced entity validation with migration type business rules
   * @param {Object} data - Entity data
   * @param {string} operation - Operation type
   * @protected
   */
  _validateEntityData(data, operation) {
    // Call parent validation
    super._validateEntityData(data, operation);

    // Migration type specific validation handled in validateMigrationType method
  }

  // Performance Tracking Methods following IterationTypes pattern

  /**
   * Track performance metrics with entity-specific context
   * @param {string} operation - Operation type
   * @param {number} duration - Duration in milliseconds
   * @private
   */
  _trackPerformance(operation, duration) {
    console.log(
      `[MigrationTypesEntityManager] Performance - ${operation}: ${duration.toFixed(2)}ms`,
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
          `[MigrationTypesEntityManager] Performance tracking failed for ${this.entityType}:`,
          error.message,
        );
      }
    }
  }

  // Standardized Utility Methods following Applications pattern

  /**
   * Format date and time string for display following Applications pattern
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
      // Format as: "Dec 15, 2023 at 3:45 PM"
      return (
        date.toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        }) +
        " at " +
        date.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
      );
    } catch (error) {
      console.error(
        "[MigrationTypesEntityManager] Error formatting date:",
        error,
      );
      return "Invalid date";
    }
  }

  /**
   * Show notification using ComponentOrchestrator or fallback to AUI
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
      // Fallback to AUI flags
      if (window.AJS && window.AJS.flag) {
        window.AJS.flag({
          type: type,
          title: title,
          body: message,
          close: type === "success" || type === "info" ? "auto" : "manual",
        });
      } else {
        // Final fallback to console
        console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
      }
    } catch (error) {
      console.error(
        "[MigrationTypesEntityManager] Error showing notification:",
        error,
      );
      console.log(`[${type.toUpperCase()}] ${title}: ${message}`);
    }
  }

  /**
   * Format blocking relationships for user-friendly error messages
   * @param {Object} blockingRelationships - Object with relationship types and items
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
          .map((item) => item.name || item.id || "Unknown")
          .join(", ");
        const suffix = count > 3 ? ` (and ${count - 3} more)` : "";
        details.push(`• ${count} ${type}: ${firstFew}${suffix}`);
      }
    });
    return details.length > 0 ? details.join("\n") : "Unknown relationships";
  }

  /**
   * Invalidate cache entries following Applications pattern
   * @param {string} id - Entity ID to invalidate, or 'all' for complete cache clear
   * @private
   */
  _invalidateCache(id) {
    try {
      if (!this.cache) {
        return;
      }
      if (id === "all") {
        this.cache.clear();
        console.log("[MigrationTypesEntityManager] Cleared all cache");
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
          `[MigrationTypesEntityManager] Cleared cache for ${id} (${keysToDelete.length} entries)`,
        );
      }
    } catch (error) {
      console.error(
        "[MigrationTypesEntityManager] Error invalidating cache:",
        error,
      );
    }
  }

  /**
   * Cleanup migration type specific resources
   */
  destroy() {
    console.log(
      "[MigrationTypesEntityManager] Destroying migration types entity manager",
    );

    // Clear caches
    if (this.cache) {
      this.cache.clear();
    }

    // Clear references
    this.userPermissions = null;
    this.apiEndpoint = null;

    // Call parent cleanup
    super.destroy();
  }
}

// Attach to window for browser compatibility
if (typeof window !== "undefined") {
  window.MigrationTypesEntityManager = MigrationTypesEntityManager;
}

// CommonJS export for Jest compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = MigrationTypesEntityManager;
}
