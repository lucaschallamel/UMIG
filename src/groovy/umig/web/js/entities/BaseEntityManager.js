/**
 * BaseEntityManager - Core Entity Management Pattern for US-082-C
 *
 * Provides standardized entity management functionality leveraging the
 * component architecture from US-082-B with enterprise security controls.
 *
 * Features:
 * - Standardized CRUD operations with component integration
 * - Performance monitoring and A/B testing support
 * - Enterprise security (8.5/10 rating) via ComponentOrchestrator
 * - Feature flag integration for controlled rollouts
 * - Comprehensive error handling and audit logging
 *
 * @version 1.0.0
 * @created 2025-01-12 (US-082-C Phase 1 Implementation)
 * @security Enterprise-grade (8.5/10) via ComponentOrchestrator integration
 * @performance 25-30% improvement target over legacy monolithic patterns
 */

// Browser-compatible version - uses global objects instead of ES6 imports
// Assumes ComponentOrchestrator and SecurityUtils are already loaded as globals

// Prevent duplicate declarations in case script loads multiple times
if (typeof BaseEntityManager === "undefined") {
  class BaseEntityManager {
    /**
     * Initialize BaseEntityManager with entity configuration
     * @param {Object} config - Entity configuration object
     * @param {string} config.entityType - Entity type identifier (e.g., 'teams', 'users')
     * @param {Object} config.tableConfig - Table component configuration
     * @param {Object} config.modalConfig - Modal component configuration
     * @param {Object} config.filterConfig - Filter component configuration (optional)
     * @param {Object} config.paginationConfig - Pagination component configuration (optional)
     */
    constructor(config = {}) {
      // Validate required configuration
      if (!config.entityType) {
        throw new Error(
          "BaseEntityManager requires entityType in configuration",
        );
      }

      // Core configuration
      this.entityType = config.entityType;
      this.config = {
        ...this._getDefaultConfig(),
        ...config,
      };

      // Store orchestrator class or instance if provided
      this.orchestratorClass = config.orchestrator;

      // Performance tracking for A/B testing
      this.performanceTracker = null;
      this.migrationMode = null; // 'legacy', 'new', or 'ab-test'

      // Component references
      this.container = null;
      this.orchestrator = null;
      this.tableComponent = null;
      this.modalComponent = null;
      this.filterComponent = null;
      this.paginationComponent = null;

      // State management
      this.isInitialized = false;
      this.currentData = [];
      this.currentFilters = {};
      this.currentSort = null;
      this.currentPage = 1;
      this.totalRecords = 0;

      // Security and audit
      this.securityContext = null;
      this.auditLogger = null;

      // Initialize security context
      this._initializeSecurityContext();

      console.log(
        `[BaseEntityManager] Initialized for entity: ${this.entityType}`,
      );
    }

    /**
     * Initialize the entity manager with DOM container and orchestrator
     * @param {HTMLElement} container - DOM container element
     * @param {Object} options - Initialization options
     * @returns {Promise<void>}
     */
    async initialize(container, options = {}) {
      try {
        console.log(
          `[BaseEntityManager] Initializing ${this.entityType} entity manager`,
        );

        // Store container reference
        this.container = container;

        // Initialize ComponentOrchestrator with enterprise security
        if (this.orchestratorClass) {
          // Use provided orchestrator class or instance
          if (typeof this.orchestratorClass === "function") {
            // If it's a class, instantiate it
            this.orchestrator = new this.orchestratorClass({
              container: container,
              securityLevel: "enterprise",
              auditMode: true,
              performanceMonitoring: true,
            });
          } else {
            // If it's already an instance, use it directly
            this.orchestrator = this.orchestratorClass;
          }
        } else {
          // Fallback to creating a new instance if ComponentOrchestrator is available
          if (typeof window.ComponentOrchestrator !== "undefined") {
            this.orchestrator = new window.ComponentOrchestrator({
              container: container,
              securityLevel: "enterprise",
              auditMode: true,
              performanceMonitoring: true,
            });
          } else {
            throw new Error(
              "ComponentOrchestrator is not available and no orchestrator was provided",
            );
          }
        }

        // Initialize performance tracker for A/B testing
        await this._initializePerformanceTracking();

        // Check feature flag for migration mode
        await this._checkMigrationMode();

        // Initialize components based on configuration
        await this._initializeComponents();

        // Set up event listeners
        this._setupEventListeners();

        // Initialize security monitoring
        this._initializeSecurityMonitoring();

        // Mark as initialized
        this.isInitialized = true;

        console.log(
          `[BaseEntityManager] ${this.entityType} initialization complete`,
        );
      } catch (error) {
        console.error(
          `[BaseEntityManager] Failed to initialize ${this.entityType}:`,
          error,
        );
        throw error;
      }
    }

    /**
     * Set the container for the entity manager
     * @param {HTMLElement} container - DOM container element
     */
    setContainer(container) {
      if (!container || !(container instanceof HTMLElement)) {
        throw new Error(
          `[BaseEntityManager] setContainer requires a valid HTMLElement, got: ${typeof container}`,
        );
      }

      this.container = container;

      // If orchestrator exists, update its container
      if (this.orchestrator) {
        this.orchestrator.setContainer(container);
      }

      console.log(
        `[BaseEntityManager] Container set for ${this.entityType} entity manager`,
      );
    }

    /**
     * Load entity data with performance tracking
     * @param {Object} filters - Filter parameters
     * @param {Object} sort - Sort parameters
     * @param {number} page - Page number
     * @param {number} pageSize - Page size
     * @returns {Promise<Object>} Data response with metadata
     */
    async loadData(filters = {}, sort = null, page = 1, pageSize = 20) {
      const startTime = performance.now();

      try {
        console.log(`[BaseEntityManager] Loading ${this.entityType} data`, {
          filters,
          sort,
          page,
          pageSize,
        });

        // COMPREHENSIVE SECURITY VALIDATION
        // Defensive check for SecurityUtils availability (check window.SecurityUtils specifically)
        if (
          typeof window.SecurityUtils === "undefined" ||
          !window.SecurityUtils.validateInput
        ) {
          console.error(
            "[BaseEntityManager] SecurityUtils not available or validateInput method missing",
          );
          console.error(
            "[BaseEntityManager] window.SecurityUtils:",
            typeof window.SecurityUtils,
          );
          console.error(
            "[BaseEntityManager] Available window properties:",
            Object.keys(window).filter((key) => key.includes("Security")),
          );
          throw new Error(
            "SecurityUtils validation service not available. Ensure SecurityUtils.js is loaded before BaseEntityManager.",
          );
        }

        const validationResult = window.SecurityUtils.validateInput(filters, {
          preventXSS: true,
          preventSQLInjection: true,
          sanitizeStrings: true,
        });

        if (!validationResult.isValid) {
          this._trackError(
            "load",
            new window.SecurityUtils.ValidationException(
              `Filter validation failed: ${validationResult.errors.join(", ")}`,
            ),
          );
          throw new window.SecurityUtils.ValidationException(
            "Invalid filter parameters",
            "filters",
            filters,
          );
        }

        // Use sanitized filters
        filters = validationResult.sanitizedData;

        // Store current state
        this.currentFilters = { ...filters };
        this.currentSort = sort;
        this.currentPage = page;

        // Load data via API
        const response = await this._fetchEntityData(
          filters,
          sort,
          page,
          pageSize,
        );

        // Update state
        this.currentData = response.data || [];
        this.totalRecords = response.total || 0;

        // Update components
        await this._updateComponents();

        // Track performance
        const loadTime = performance.now() - startTime;
        this._trackPerformance("load", loadTime);

        console.log(
          `[BaseEntityManager] ${this.entityType} data loaded in ${loadTime.toFixed(2)}ms`,
        );

        return {
          data: this.currentData,
          total: this.totalRecords,
          page: page,
          pageSize: pageSize,
          loadTime: loadTime,
        };
      } catch (error) {
        console.error(
          `[BaseEntityManager] Failed to load ${this.entityType} data:`,
          error,
        );
        this._trackError("load", error);
        throw error;
      }
    }

    /**
     * Render the entity manager components to the container
     * @returns {Promise<void>}
     */
    async render() {
      try {
        console.log(
          `[BaseEntityManager] Rendering ${this.entityType} components`,
        );

        if (!this.container) {
          throw new Error("Container must be set before rendering");
        }

        if (!this.orchestrator) {
          throw new Error("Manager must be initialized before rendering");
        }

        // TD-004 FIX: Components self-render via orchestrator event bus
        // Orchestrator is an event bus, not a rendering manager - components handle their own rendering
        // await this.orchestrator.render(); // REMOVED: Interface mismatch resolved

        console.log(
          `[BaseEntityManager] ${this.entityType} rendering complete`,
        );
      } catch (error) {
        console.error(
          `[BaseEntityManager] Failed to render ${this.entityType}:`,
          error,
        );
        this._trackError("render", error);
        throw error;
      }
    }

    /**
     * Create new entity record
     * @param {Object} data - Entity data
     * @returns {Promise<Object>} Created entity
     */
    async createEntity(data) {
      const startTime = performance.now();

      try {
        console.log(
          `[BaseEntityManager] Creating ${this.entityType} entity`,
          data,
        );

        // COMPREHENSIVE SECURITY VALIDATION AND SANITIZATION
        // Defensive check for SecurityUtils availability (check window.SecurityUtils specifically)
        if (
          typeof window.SecurityUtils === "undefined" ||
          !window.SecurityUtils.validateInput
        ) {
          console.error(
            "[BaseEntityManager] SecurityUtils not available or validateInput method missing",
          );
          console.error(
            "[BaseEntityManager] window.SecurityUtils:",
            typeof window.SecurityUtils,
          );
          throw new Error(
            "SecurityUtils validation service not available. Ensure SecurityUtils.js is loaded before BaseEntityManager.",
          );
        }

        const validationResult = window.SecurityUtils.validateInput(data, {
          preventXSS: true,
          preventSQLInjection: true,
          sanitizeStrings: true,
          validateLength: true,
        });

        if (!validationResult.isValid) {
          this._trackError(
            "create",
            new window.SecurityUtils.ValidationException(
              `Create validation failed: ${validationResult.errors.join(", ")}`,
            ),
          );
          throw new window.SecurityUtils.ValidationException(
            "Invalid entity data for creation",
            "data",
            data,
          );
        }

        // Additional XSS prevention layer
        const sanitizedData = window.SecurityUtils.preventXSS(
          validationResult.sanitizedData,
        );

        // Rate limiting check
        if (
          !window.SecurityUtils.checkRateLimit(
            `${this.entityType}_create`,
            10,
            60000,
          )
        ) {
          window.SecurityUtils.logSecurityEvent(
            "rate_limit_exceeded_create",
            "warning",
            {
              entityType: this.entityType,
              sessionId: this.securityContext?.sessionId,
            },
          );
          throw new window.SecurityUtils.SecurityException(
            "Rate limit exceeded for entity creation",
          );
        }

        // Validate required fields with sanitized data
        this._validateEntityData(sanitizedData, "create");

        // Create via API with sanitized data
        const response = await this._createEntityData(sanitizedData);

        // Refresh data
        await this.loadData(
          this.currentFilters,
          this.currentSort,
          this.currentPage,
        );

        // Track performance
        const operationTime = performance.now() - startTime;
        this._trackPerformance("create", operationTime);

        // Audit logging
        this._auditLog("create", response.id, data);

        console.log(
          `[BaseEntityManager] ${this.entityType} entity created successfully`,
        );

        return response;
      } catch (error) {
        console.error(
          `[BaseEntityManager] Failed to create ${this.entityType} entity:`,
          error,
        );
        this._trackError("create", error);
        throw error;
      }
    }

    /**
     * Update existing entity record
     * @param {string} id - Entity ID
     * @param {Object} data - Updated entity data
     * @returns {Promise<Object>} Updated entity
     */
    async updateEntity(id, data) {
      const startTime = performance.now();

      try {
        console.log(
          `[BaseEntityManager] Updating ${this.entityType} entity ${id}`,
          data,
        );

        // COMPREHENSIVE SECURITY VALIDATION FOR UPDATE
        // Defensive check for SecurityUtils availability (check window.SecurityUtils specifically)
        if (
          typeof window.SecurityUtils === "undefined" ||
          !window.SecurityUtils.validateInput
        ) {
          console.error(
            "[BaseEntityManager] SecurityUtils not available or validateInput method missing",
          );
          console.error(
            "[BaseEntityManager] window.SecurityUtils:",
            typeof window.SecurityUtils,
          );
          throw new Error(
            "SecurityUtils validation service not available. Ensure SecurityUtils.js is loaded before BaseEntityManager.",
          );
        }

        const validationResult = window.SecurityUtils.validateInput(
          { id, ...data },
          {
            preventXSS: true,
            preventSQLInjection: true,
            sanitizeStrings: true,
            validateLength: true,
          },
        );

        if (!validationResult.isValid) {
          this._trackError(
            "update",
            new window.SecurityUtils.ValidationException(
              `Update validation failed: ${validationResult.errors.join(", ")}`,
            ),
          );
          throw new window.SecurityUtils.ValidationException(
            "Invalid entity data for update",
            "data",
            { id, ...data },
          );
        }

        // Extract sanitized ID and data
        const { id: sanitizedId, ...sanitizedData } =
          validationResult.sanitizedData;

        // Additional XSS prevention layer
        const finalSanitizedData =
          window.SecurityUtils.preventXSS(sanitizedData);

        // Rate limiting check
        if (
          !window.SecurityUtils.checkRateLimit(
            `${this.entityType}_update`,
            20,
            60000,
          )
        ) {
          window.SecurityUtils.logSecurityEvent(
            "rate_limit_exceeded_update",
            "warning",
            {
              entityType: this.entityType,
              entityId: sanitizedId,
              sessionId: this.securityContext?.sessionId,
            },
          );
          throw new window.SecurityUtils.SecurityException(
            "Rate limit exceeded for entity updates",
          );
        }

        // Validate required fields with sanitized data
        this._validateEntityData(finalSanitizedData, "update");

        // Update via API with sanitized data
        const response = await this._updateEntityData(
          sanitizedId,
          finalSanitizedData,
        );

        // Refresh data
        await this.loadData(
          this.currentFilters,
          this.currentSort,
          this.currentPage,
        );

        // Track performance
        const operationTime = performance.now() - startTime;
        this._trackPerformance("update", operationTime);

        // Audit logging
        this._auditLog("update", id, data);

        console.log(
          `[BaseEntityManager] ${this.entityType} entity updated successfully`,
        );

        return response;
      } catch (error) {
        console.error(
          `[BaseEntityManager] Failed to update ${this.entityType} entity:`,
          error,
        );
        this._trackError("update", error);
        throw error;
      }
    }

    /**
     * Delete entity record
     * @param {string} id - Entity ID
     * @returns {Promise<boolean>} Success indicator
     */
    async deleteEntity(id) {
      const startTime = performance.now();

      try {
        console.log(
          `[BaseEntityManager] Deleting ${this.entityType} entity ${id}`,
        );

        // COMPREHENSIVE SECURITY VALIDATION FOR DELETE
        // Defensive check for SecurityUtils availability (check window.SecurityUtils specifically)
        if (
          typeof window.SecurityUtils === "undefined" ||
          !window.SecurityUtils.validateInput
        ) {
          console.error(
            "[BaseEntityManager] SecurityUtils not available or validateInput method missing",
          );
          console.error(
            "[BaseEntityManager] window.SecurityUtils:",
            typeof window.SecurityUtils,
          );
          throw new Error(
            "SecurityUtils validation service not available. Ensure SecurityUtils.js is loaded before BaseEntityManager.",
          );
        }

        const validationResult = window.SecurityUtils.validateInput(
          { id },
          {
            preventXSS: true,
            preventSQLInjection: true,
            sanitizeStrings: true,
          },
        );

        if (!validationResult.isValid) {
          this._trackError(
            "delete",
            new window.SecurityUtils.ValidationException(
              `Delete validation failed: ${validationResult.errors.join(", ")}`,
            ),
          );
          throw new window.SecurityUtils.ValidationException(
            "Invalid entity ID for deletion",
            "id",
            id,
          );
        }

        const sanitizedId = validationResult.sanitizedData.id;

        // Rate limiting check for delete operations
        if (
          !window.SecurityUtils.checkRateLimit(
            `${this.entityType}_delete`,
            5,
            60000,
          )
        ) {
          window.SecurityUtils.logSecurityEvent(
            "rate_limit_exceeded_delete",
            "warning",
            {
              entityType: this.entityType,
              entityId: sanitizedId,
              sessionId: this.securityContext?.sessionId,
            },
          );
          throw new window.SecurityUtils.SecurityException(
            "Rate limit exceeded for entity deletion",
          );
        }

        // Delete via API with sanitized ID
        await this._deleteEntityData(sanitizedId);

        // Refresh data
        await this.loadData(
          this.currentFilters,
          this.currentSort,
          this.currentPage,
        );

        // Track performance
        const operationTime = performance.now() - startTime;
        this._trackPerformance("delete", operationTime);

        // Audit logging
        this._auditLog("delete", id);

        console.log(
          `[BaseEntityManager] ${this.entityType} entity deleted successfully`,
        );

        return true;
      } catch (error) {
        console.error(
          `[BaseEntityManager] Failed to delete ${this.entityType} entity:`,
          error,
        );
        this._trackError("delete", error);
        throw error;
      }
    }

    // Protected Methods (to be implemented by subclasses)

    /**
     * Fetch entity data from API - to be implemented by subclasses
     * @param {Object} filters - Filter parameters
     * @param {Object} sort - Sort parameters
     * @param {number} page - Page number
     * @param {number} pageSize - Page size
     * @returns {Promise<Object>} API response
     * @protected
     */
    async _fetchEntityData(filters, sort, page, pageSize) {
      throw new Error("_fetchEntityData must be implemented by subclass");
    }

    /**
     * Create entity data via API - to be implemented by subclasses
     * @param {Object} data - Entity data
     * @returns {Promise<Object>} Created entity
     * @protected
     */
    async _createEntityData(data) {
      throw new Error("_createEntityData must be implemented by subclass");
    }

    /**
     * Update entity data via API - to be implemented by subclasses
     * @param {string} id - Entity ID
     * @param {Object} data - Updated data
     * @returns {Promise<Object>} Updated entity
     * @protected
     */
    async _updateEntityData(id, data) {
      throw new Error("_updateEntityData must be implemented by subclass");
    }

    /**
     * Delete entity data via API - to be implemented by subclasses
     * @param {string} id - Entity ID
     * @returns {Promise<void>}
     * @protected
     */
    async _deleteEntityData(id) {
      throw new Error("_deleteEntityData must be implemented by subclass");
    }

    // Private Methods

    /**
     * Get default configuration
     * @returns {Object} Default configuration
     * @private
     */
    _getDefaultConfig() {
      return {
        tableConfig: {
          columns: [],
          actions: { view: true, edit: true, delete: false },
          sortable: true,
          searchable: true,
        },
        modalConfig: {
          fields: [],
          validation: true,
          size: "medium",
        },
        filterConfig: {
          enabled: true,
          persistent: true,
        },
        paginationConfig: {
          pageSize: 20,
          showPageSizer: true,
        },
      };
    }

    /**
     * Initialize security context
     * @private
     */
    _initializeSecurityContext() {
      this.securityContext = {
        entityType: this.entityType,
        timestamp: new Date().toISOString(),
        sessionId: this._generateSessionId(),
      };
    }

    /**
     * Initialize performance tracking
     * @private
     */
    async _initializePerformanceTracking() {
      // Import EntityMigrationTracker if available
      try {
        const { EntityMigrationTracker } = await import(
          "../utils/EntityMigrationTracker.js"
        );
        this.performanceTracker = new EntityMigrationTracker(this.entityType);
      } catch (error) {
        console.warn(
          `[BaseEntityManager] Performance tracker not available: ${error.message}`,
        );
        // Create simple fallback tracker
        this.performanceTracker = {
          trackPerformance: (operation, duration) => {
            console.log(
              `[Performance] ${this.entityType}.${operation}: ${duration.toFixed(2)}ms`,
            );
          },
          trackError: (operation, error) => {
            console.error(
              `[Performance] ${this.entityType}.${operation} error:`,
              error,
            );
          },
        };
      }
    }

    /**
     * Check migration mode via feature flags
     * @private
     */
    async _checkMigrationMode() {
      try {
        // Check feature flag service if available
        const featureFlagKey = `FEATURE_FLAG_${this.entityType.toUpperCase()}_MIGRATION`;

        // Default to new architecture for now
        this.migrationMode = "new";

        console.log(
          `[BaseEntityManager] Migration mode for ${this.entityType}: ${this.migrationMode}`,
        );
      } catch (error) {
        console.warn(
          `[BaseEntityManager] Feature flag check failed, defaulting to new architecture:`,
          error,
        );
        this.migrationMode = "new";
      }
    }

    /**
     * Initialize components
     * @private
     */
    async _initializeComponents() {
      console.log(
        `[BaseEntityManager] Initializing components for ${this.entityType}`,
      );

      // Validate orchestrator before component creation
      if (!this.orchestrator) {
        const error = new Error(
          "ComponentOrchestrator is not available for component initialization",
        );
        console.error(`[BaseEntityManager] ${error.message}`, {
          entityType: this.entityType,
          orchestrator: this.orchestrator,
        });
        this._trackError("_initializeComponents", error);
        throw error;
      }

      // Validate orchestrator has createComponent method
      if (typeof this.orchestrator.createComponent !== "function") {
        const error = new Error(
          "ComponentOrchestrator missing createComponent method",
        );
        console.error(`[BaseEntityManager] ${error.message}`, {
          entityType: this.entityType,
          orchestrator: this.orchestrator,
          availableMethods: Object.getOwnPropertyNames(
            this.orchestrator,
          ).filter((name) => typeof this.orchestrator[name] === "function"),
        });
        this._trackError("_initializeComponents", error);
        throw error;
      }

      let initializationErrors = [];

      // Initialize TableComponent with comprehensive error handling
      if (this.config.tableConfig) {
        try {
          console.log(
            `[BaseEntityManager] Creating table component for ${this.entityType}`,
          );
          this.tableComponent = await this.orchestrator.createComponent(
            "table",
            {
              ...this.config.tableConfig,
              entityType: this.entityType,
            },
          );

          // Validate created component
          if (!this.tableComponent) {
            const error = new Error(
              "TableComponent creation returned null/undefined",
            );
            console.error(`[BaseEntityManager] ${error.message}`, {
              entityType: this.entityType,
              config: this.config.tableConfig,
            });
            initializationErrors.push(`TableComponent: ${error.message}`);
          } else if (
            typeof this.tableComponent.updateData !== "function" &&
            typeof this.tableComponent.setData !== "function"
          ) {
            const error = new Error(
              "TableComponent missing required data update methods",
            );
            console.error(`[BaseEntityManager] ${error.message}`, {
              entityType: this.entityType,
              tableComponent: this.tableComponent,
              availableMethods: Object.getOwnPropertyNames(
                this.tableComponent,
              ).filter(
                (name) => typeof this.tableComponent[name] === "function",
              ),
            });
            initializationErrors.push(`TableComponent: ${error.message}`);
          } else {
            console.log(
              `[BaseEntityManager] TableComponent initialized successfully for ${this.entityType}`,
            );
          }
        } catch (error) {
          console.error(
            `[BaseEntityManager] Failed to create TableComponent for ${this.entityType}:`,
            error,
          );
          initializationErrors.push(`TableComponent: ${error.message}`);
          this._trackError("_initializeComponents", error);
          this.tableComponent = null; // Ensure clean state
        }
      } else {
        console.log(
          `[BaseEntityManager] TableComponent configuration not provided for ${this.entityType}`,
        );
      }

      // Initialize ModalComponent with error handling
      if (this.config.modalConfig) {
        try {
          console.log(
            `[BaseEntityManager] Creating modal component for ${this.entityType}`,
          );
          this.modalComponent = await this.orchestrator.createComponent(
            "modal",
            {
              ...this.config.modalConfig,
              entityType: this.entityType,
            },
          );

          if (!this.modalComponent) {
            const error = new Error(
              "ModalComponent creation returned null/undefined",
            );
            console.error(`[BaseEntityManager] ${error.message}`, {
              entityType: this.entityType,
              config: this.config.modalConfig,
            });
            initializationErrors.push(`ModalComponent: ${error.message}`);
          } else {
            console.log(
              `[BaseEntityManager] ModalComponent initialized successfully for ${this.entityType}`,
            );
          }
        } catch (error) {
          console.error(
            `[BaseEntityManager] Failed to create ModalComponent for ${this.entityType}:`,
            error,
          );
          initializationErrors.push(`ModalComponent: ${error.message}`);
          this._trackError("_initializeComponents", error);
          this.modalComponent = null; // Ensure clean state
        }
      }

      // Initialize FilterComponent if enabled
      if (this.config.filterConfig?.enabled) {
        try {
          console.log(
            `[BaseEntityManager] Creating filter component for ${this.entityType}`,
          );
          this.filterComponent = await this.orchestrator.createComponent(
            "filter",
            {
              ...this.config.filterConfig,
              entityType: this.entityType,
            },
          );

          if (!this.filterComponent) {
            const error = new Error(
              "FilterComponent creation returned null/undefined",
            );
            console.error(`[BaseEntityManager] ${error.message}`, {
              entityType: this.entityType,
              config: this.config.filterConfig,
            });
            initializationErrors.push(`FilterComponent: ${error.message}`);
          } else {
            console.log(
              `[BaseEntityManager] FilterComponent initialized successfully for ${this.entityType}`,
            );
          }
        } catch (error) {
          console.error(
            `[BaseEntityManager] Failed to create FilterComponent for ${this.entityType}:`,
            error,
          );
          initializationErrors.push(`FilterComponent: ${error.message}`);
          this._trackError("_initializeComponents", error);
          this.filterComponent = null; // Ensure clean state
        }
      }

      // Initialize PaginationComponent with error handling
      if (this.config.paginationConfig) {
        try {
          console.log(
            `[BaseEntityManager] Creating pagination component for ${this.entityType}`,
          );
          this.paginationComponent = await this.orchestrator.createComponent(
            "pagination",
            {
              ...this.config.paginationConfig,
              entityType: this.entityType,
            },
          );

          // Validate created component
          if (!this.paginationComponent) {
            const error = new Error(
              "PaginationComponent creation returned null/undefined",
            );
            console.error(`[BaseEntityManager] ${error.message}`, {
              entityType: this.entityType,
              config: this.config.paginationConfig,
            });
            initializationErrors.push(`PaginationComponent: ${error.message}`);
          // TD-004 FIX: PaginationComponent uses setState pattern - validation removed
          // Components communicate via orchestrator event bus, no direct method validation needed
          } else {
            console.log(
              `[BaseEntityManager] PaginationComponent initialized successfully for ${this.entityType}`,
            );
          }
        } catch (error) {
          console.error(
            `[BaseEntityManager] Failed to create PaginationComponent for ${this.entityType}:`,
            error,
          );
          initializationErrors.push(`PaginationComponent: ${error.message}`);
          this._trackError("_initializeComponents", error);
          this.paginationComponent = null; // Ensure clean state
        }
      }

      // Report component initialization status
      const totalComponents = [
        this.config.tableConfig ? "table" : null,
        this.config.modalConfig ? "modal" : null,
        this.config.filterConfig?.enabled ? "filter" : null,
        this.config.paginationConfig ? "pagination" : null,
      ].filter(Boolean);

      const successfulComponents = [
        this.tableComponent ? "table" : null,
        this.modalComponent ? "modal" : null,
        this.filterComponent ? "filter" : null,
        this.paginationComponent ? "pagination" : null,
      ].filter(Boolean);

      console.log(
        `[BaseEntityManager] Component initialization summary for ${this.entityType}:`,
        {
          requested: totalComponents,
          successful: successfulComponents,
          errors: initializationErrors,
        },
      );

      // If there are initialization errors but at least one component succeeded, continue with warnings
      if (initializationErrors.length > 0) {
        if (successfulComponents.length === 0) {
          // If no components were successfully created, this is a critical failure
          const criticalError = new Error(
            `Critical failure: No components could be initialized for ${this.entityType}. Errors: ${initializationErrors.join(", ")}`,
          );
          console.error(`[BaseEntityManager] ${criticalError.message}`);
          this._trackError("_initializeComponents", criticalError);
          throw criticalError;
        } else {
          // Some components failed but others succeeded - log warnings but continue
          console.warn(
            `[BaseEntityManager] Partial component initialization for ${this.entityType}. Some components failed:`,
            initializationErrors,
          );
        }
      }

      console.log(
        `[BaseEntityManager] Component initialization completed for ${this.entityType}`,
      );
    }

    /**
     * Setup event listeners
     * @private
     */
    _setupEventListeners() {
      if (this.orchestrator) {
        // Table events
        this.orchestrator.on("table:sort", (event) => {
          this.loadData(this.currentFilters, event.sort, this.currentPage);
        });

        this.orchestrator.on("table:action", (event) => {
          this._handleTableAction(event.action, event.data);
        });

        // Filter events
        this.orchestrator.on("filter:change", (event) => {
          this.loadData(event.filters, this.currentSort, 1); // Reset to page 1
        });

        // Pagination events
        this.orchestrator.on("pagination:change", (event) => {
          this.loadData(this.currentFilters, this.currentSort, event.page);
        });

        // Modal events
        this.orchestrator.on("modal:save", (event) => {
          if (event.id) {
            this.updateEntity(event.id, event.data);
          } else {
            this.createEntity(event.data);
          }
        });
      }
    }

    /**
     * Handle table actions
     * @param {string} action - Action type
     * @param {Object} data - Action data
     * @private
     */
    async _handleTableAction(action, data) {
      switch (action) {
        case "view":
          await this._viewEntity(data);
          break;
        case "edit":
          await this._editEntity(data);
          break;
        case "delete":
          await this._confirmDeleteEntity(data);
          break;
        default:
          console.warn(`[BaseEntityManager] Unhandled action: ${action}`);
      }
    }

    /**
     * View entity details
     * @param {Object} data - Entity data
     * @private
     */
    async _viewEntity(data) {
      if (this.modalComponent) {
        await this.modalComponent.show({
          mode: "view",
          data: data,
          title: `View ${this.entityType.slice(0, -1)}`,
        });
      }
    }

    /**
     * Edit entity
     * @param {Object} data - Entity data
     * @private
     */
    async _editEntity(data) {
      if (this.modalComponent) {
        await this.modalComponent.show({
          mode: "edit",
          data: data,
          title: `Edit ${this.entityType.slice(0, -1)}`,
        });
      }
    }

    /**
     * Confirm entity deletion
     * @param {Object} data - Entity data
     * @private
     */
    async _confirmDeleteEntity(data) {
      if (
        confirm(
          `Are you sure you want to delete this ${this.entityType.slice(0, -1)}?`,
        )
      ) {
        await this.deleteEntity(data.id);
      }
    }

    /**
     * Update components with current data
     * ENHANCED DEFENSIVE PROGRAMMING v2.0 - Comprehensive error handling and validation
     * @private
     */
    async _updateComponents() {
      try {
        console.log(
          `[BaseEntityManager] Updating components for ${this.entityType} with ${this.currentData?.length || 0} records`,
        );

        // Pre-update validation: Check if we're in a valid state for component updates
        if (!this.isInitialized) {
          console.warn(
            `[BaseEntityManager] Attempting to update components before initialization is complete for ${this.entityType}`,
          );
          return; // Early exit - graceful degradation
        }

        if (!this.orchestrator) {
          console.warn(
            `[BaseEntityManager] No orchestrator available for component updates for ${this.entityType}`,
          );
          return; // Early exit - graceful degradation
        }

        // Track component update attempts and successes for debugging
        const updateAttempts = {
          table: {
            attempted: false,
            successful: false,
            method: null,
            error: null,
          },
          pagination: {
            attempted: false,
            successful: false,
            method: null,
            error: null,
          },
          filter: {
            attempted: false,
            successful: false,
            method: null,
            error: null,
          },
        };

        // ENHANCED DEFENSIVE PROGRAMMING: TableComponent validation and update
        if (this.tableComponent) {
          updateAttempts.table.attempted = true;

          try {
            // Multi-level validation for table component
            if (
              typeof this.tableComponent === "object" &&
              this.tableComponent !== null
            ) {
              // Primary method: updateData (preferred alias)
              if (typeof this.tableComponent.updateData === "function") {
                updateAttempts.table.method = "updateData";
                console.log(
                  `[BaseEntityManager] Updating table via updateData() with ${this.currentData?.length || 0} records`,
                );
                await this.tableComponent.updateData(this.currentData);
                updateAttempts.table.successful = true;

                // Fallback method: setData (original method)
              } else if (typeof this.tableComponent.setData === "function") {
                updateAttempts.table.method = "setData";
                console.log(
                  `[BaseEntityManager] Falling back to setData() method for table component`,
                );
                await this.tableComponent.setData(this.currentData);
                updateAttempts.table.successful = true;

                // Component exists but lacks required methods
              } else {
                const availableMethods = this._getAvailableMethods(
                  this.tableComponent,
                );
                const errorMsg = `TableComponent missing both updateData and setData methods. Available methods: ${availableMethods.join(", ")}`;
                updateAttempts.table.error = errorMsg;

                console.error(`[BaseEntityManager] ${errorMsg}`, {
                  tableComponent: this.tableComponent,
                  constructor: this.tableComponent.constructor?.name,
                  prototype: Object.getPrototypeOf(this.tableComponent)
                    .constructor?.name,
                  entityType: this.entityType,
                  availableMethods: availableMethods,
                });

                this._trackError(
                  "_updateComponents_table",
                  new Error(errorMsg),
                );
              }
            } else {
              const errorMsg = `TableComponent is not a valid object (type: ${typeof this.tableComponent})`;
              updateAttempts.table.error = errorMsg;

              console.error(`[BaseEntityManager] ${errorMsg}`, {
                tableComponent: this.tableComponent,
                type: typeof this.tableComponent,
                entityType: this.entityType,
                isNull: this.tableComponent === null,
                isUndefined: this.tableComponent === undefined,
              });

              this._trackError("_updateComponents_table", new Error(errorMsg));
            }
          } catch (tableError) {
            updateAttempts.table.error = tableError.message;
            console.error(
              `[BaseEntityManager] Exception during table component update for ${this.entityType}:`,
              tableError,
            );
            this._trackError("_updateComponents_table", tableError);
          }
        } else {
          console.log(
            `[BaseEntityManager] TableComponent not initialized for ${this.entityType} - data update skipped`,
          );
        }

        // ENHANCED DEFENSIVE PROGRAMMING: PaginationComponent validation and update
        if (this.paginationComponent) {
          updateAttempts.pagination.attempted = true;

          try {
            // Multi-level validation for pagination component
            if (
              typeof this.paginationComponent === "object" &&
              this.paginationComponent !== null
            ) {
              // TD-004 FIX: Use setState pattern for pagination component updates
              // Components use setState pattern for state management, not direct method calls
              if (typeof this.paginationComponent.setState === "function") {
                updateAttempts.pagination.method = "setState";
                const paginationState = {
                  currentPage: this.currentPage,
                  totalItems: this.totalRecords,
                  pageSize: this.config.paginationConfig?.pageSize || 20,
                };

                console.log(
                  `[BaseEntityManager] Updating pagination via setState - page ${this.currentPage}, total ${this.totalRecords}`,
                );
                await this.paginationComponent.setState(paginationState);
                updateAttempts.pagination.successful = true;
              } else {
                const availableMethods = this._getAvailableMethods(
                  this.paginationComponent,
                );
                const errorMsg = `PaginationComponent missing setState method. Available methods: ${availableMethods.join(", ")}`;
                updateAttempts.pagination.error = errorMsg;

                console.error(`[BaseEntityManager] ${errorMsg}`, {
                  paginationComponent: this.paginationComponent,
                  constructor: this.paginationComponent.constructor?.name,
                  prototype: Object.getPrototypeOf(this.paginationComponent)
                    .constructor?.name,
                  entityType: this.entityType,
                  availableMethods: availableMethods,
                });

                this._trackError(
                  "_updateComponents_pagination",
                  new Error(errorMsg),
                );
              }
            } else {
              const errorMsg = `PaginationComponent is not a valid object (type: ${typeof this.paginationComponent})`;
              updateAttempts.pagination.error = errorMsg;

              console.error(`[BaseEntityManager] ${errorMsg}`, {
                paginationComponent: this.paginationComponent,
                type: typeof this.paginationComponent,
                entityType: this.entityType,
                isNull: this.paginationComponent === null,
                isUndefined: this.paginationComponent === undefined,
              });

              this._trackError(
                "_updateComponents_pagination",
                new Error(errorMsg),
              );
            }
          } catch (paginationError) {
            updateAttempts.pagination.error = paginationError.message;
            console.error(
              `[BaseEntityManager] Exception during pagination component update for ${this.entityType}:`,
              paginationError,
            );
            this._trackError("_updateComponents_pagination", paginationError);
          }
        } else {
          console.log(
            `[BaseEntityManager] PaginationComponent not initialized for ${this.entityType} - pagination update skipped`,
          );
        }

        // ENHANCED DEFENSIVE PROGRAMMING: FilterComponent update (if available)
        if (this.filterComponent) {
          updateAttempts.filter.attempted = true;

          try {
            if (
              typeof this.filterComponent === "object" &&
              this.filterComponent !== null
            ) {
              // Check for common filter update methods
              if (typeof this.filterComponent.updateFilters === "function") {
                updateAttempts.filter.method = "updateFilters";
                console.log(
                  `[BaseEntityManager] Updating filter component with current filters`,
                );
                await this.filterComponent.updateFilters(this.currentFilters);
                updateAttempts.filter.successful = true;
              } else if (
                typeof this.filterComponent.setFilters === "function"
              ) {
                updateAttempts.filter.method = "setFilters";
                console.log(
                  `[BaseEntityManager] Updating filter component via setFilters`,
                );
                await this.filterComponent.setFilters(this.currentFilters);
                updateAttempts.filter.successful = true;
              } else {
                console.log(
                  `[BaseEntityManager] FilterComponent does not require updates or lacks update methods`,
                );
              }
            } else {
              const errorMsg = `FilterComponent is not a valid object (type: ${typeof this.filterComponent})`;
              updateAttempts.filter.error = errorMsg;
              console.warn(`[BaseEntityManager] ${errorMsg}`);
            }
          } catch (filterError) {
            updateAttempts.filter.error = filterError.message;
            console.error(
              `[BaseEntityManager] Exception during filter component update for ${this.entityType}:`,
              filterError,
            );
            this._trackError("_updateComponents_filter", filterError);
          }
        }

        // Summary reporting for debugging and monitoring
        const successfulUpdates = Object.values(updateAttempts).filter(
          (attempt) => attempt.successful,
        ).length;
        const attemptedUpdates = Object.values(updateAttempts).filter(
          (attempt) => attempt.attempted,
        ).length;
        const failedUpdates = Object.values(updateAttempts).filter(
          (attempt) => attempt.attempted && !attempt.successful,
        ).length;

        console.log(
          `[BaseEntityManager] Component update summary for ${this.entityType}:`,
          {
            attempted: attemptedUpdates,
            successful: successfulUpdates,
            failed: failedUpdates,
            details: updateAttempts,
          },
        );

        // If all attempted updates failed, log as warning but don't throw
        if (attemptedUpdates > 0 && successfulUpdates === 0) {
          console.warn(
            `[BaseEntityManager] All component updates failed for ${this.entityType}. Application will continue but UI may not reflect latest data.`,
          );
        }

        console.log(
          `[BaseEntityManager] Component update process completed for ${this.entityType}`,
        );
      } catch (error) {
        console.error(
          `[BaseEntityManager] Critical error in component update process for ${this.entityType}:`,
          error,
        );
        this._trackError("_updateComponents_critical", error);

        // Don't rethrow - ensure graceful degradation
        // The application should continue functioning even if component updates fail completely
      }
    }

    /**
     * Validate entity data
     * @param {Object} data - Entity data
     * @param {string} operation - Operation type
     * @private
     */
    _validateEntityData(data, operation) {
      // Basic validation - to be extended by subclasses
      if (!data || typeof data !== "object") {
        throw new Error("Invalid entity data");
      }
    }

    /**
     * Track performance metrics
     * @param {string} operation - Operation type
     * @param {number} duration - Duration in milliseconds
     * @private
     */
    _trackPerformance(operation, duration) {
      if (this.performanceTracker) {
        this.performanceTracker.trackPerformance(operation, duration);
      }
    }

    /**
     * Track error metrics
     * @param {string} operation - Operation type
     * @param {Error} error - Error object
     * @private
     */
    _trackError(operation, error) {
      if (this.performanceTracker) {
        this.performanceTracker.trackError(operation, error);
      }
    }

    /**
     * Audit logging
     * @param {string} operation - Operation type
     * @param {string} entityId - Entity ID
     * @param {Object} data - Operation data
     * @private
     */
    _auditLog(operation, entityId, data = null) {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        entityType: this.entityType,
        operation: operation,
        entityId: entityId,
        sessionId: this.securityContext?.sessionId,
        data: data,
      };

      console.log("[Audit]", auditEntry);

      // Send to audit service if available
      if (window.UMIGServices?.auditService) {
        window.UMIGServices.auditService.log(auditEntry);
      }
    }

    /**
     * Initialize security monitoring
     * @private
     */
    _initializeSecurityMonitoring() {
      // Monitor for suspicious activity
      this.orchestrator?.on("security:violation", (event) => {
        console.error("[Security] Violation detected:", event);
        this._auditLog("security_violation", null, event);
      });
    }

    /**
     * Generate session ID
     * @returns {string} Session ID
     * @private
     */
    _generateSessionId() {
      return `${this.entityType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Get available methods from a component for debugging
     * @param {Object} component - Component to inspect
     * @returns {Array<string>} Array of method names
     * @private
     */
    _getAvailableMethods(component) {
      if (!component || typeof component !== "object") {
        return ["<invalid_component>"];
      }

      try {
        // Get all enumerable and non-enumerable properties
        const allProperties = new Set();

        // Get properties from the object itself
        Object.getOwnPropertyNames(component).forEach((name) => {
          if (typeof component[name] === "function") {
            allProperties.add(name);
          }
        });

        // Get properties from the prototype chain
        let current = component;
        while (current && current !== Object.prototype) {
          Object.getOwnPropertyNames(current).forEach((name) => {
            if (typeof current[name] === "function" && name !== "constructor") {
              allProperties.add(name);
            }
          });
          current = Object.getPrototypeOf(current);
        }

        return Array.from(allProperties).sort();
      } catch (error) {
        console.warn(
          "[BaseEntityManager] Error getting available methods:",
          error,
        );
        return ["<error_getting_methods>"];
      }
    }

    /**
     * Validate component state and availability
     * @returns {Object} Component validation report
     * @private
     */
    _validateComponentState() {
      const report = {
        isInitialized: this.isInitialized,
        orchestratorAvailable: !!this.orchestrator,
        components: {
          table: {
            available: !!this.tableComponent,
            hasUpdateData:
              this.tableComponent &&
              typeof this.tableComponent.updateData === "function",
            hasSetData:
              this.tableComponent &&
              typeof this.tableComponent.setData === "function",
            isValid:
              this.tableComponent &&
              (typeof this.tableComponent.updateData === "function" ||
                typeof this.tableComponent.setData === "function"),
          },
          modal: {
            available: !!this.modalComponent,
            isValid: !!this.modalComponent,
          },
          filter: {
            available: !!this.filterComponent,
            isValid: !!this.filterComponent,
          },
          pagination: {
            available: !!this.paginationComponent,
            hasSetState:
              this.paginationComponent &&
              typeof this.paginationComponent.setState === "function",
            isValid:
              this.paginationComponent &&
              typeof this.paginationComponent.setState === "function",
          },
        },
        healthScore: 0,
      };

      // Calculate health score
      let totalComponents = 0;
      let validComponents = 0;

      Object.values(report.components).forEach((component) => {
        if (component.available) {
          totalComponents++;
          if (component.isValid) {
            validComponents++;
          }
        }
      });

      report.healthScore =
        totalComponents > 0 ? (validComponents / totalComponents) * 100 : 0;

      return report;
    }

    /**
     * Get component diagnostics for debugging
     * ENHANCED v2.0 - Comprehensive debugging information for component failures
     * @returns {Object} Detailed component diagnostics with actionable debugging data
     */
    getComponentDiagnostics() {
      const validation = this._validateComponentState();

      const diagnostics = {
        entityType: this.entityType,
        timestamp: new Date().toISOString(),
        validation: validation,
        status: this._getComponentStatusSummary(),
        configuration: {
          tableConfig: !!this.config.tableConfig,
          modalConfig: !!this.config.modalConfig,
          filterConfig: !!this.config.filterConfig?.enabled,
          paginationConfig: !!this.config.paginationConfig,
          // Detailed config validation
          tableConfigValid:
            this.config.tableConfig &&
            Array.isArray(this.config.tableConfig.columns),
          modalConfigValid:
            this.config.modalConfig &&
            typeof this.config.modalConfig === "object",
          filterConfigValid:
            this.config.filterConfig &&
            this.config.filterConfig.enabled === true,
          paginationConfigValid:
            this.config.paginationConfig &&
            typeof this.config.paginationConfig.pageSize === "number",
        },
        state: {
          isInitialized: this.isInitialized,
          currentDataLength: this.currentData?.length || 0,
          currentPage: this.currentPage,
          totalRecords: this.totalRecords,
          hasFilters: Object.keys(this.currentFilters || {}).length > 0,
          hasCurrentSort: !!this.currentSort,
          dataType: Array.isArray(this.currentData)
            ? "array"
            : typeof this.currentData,
        },
        orchestrator: {
          available: !!this.orchestrator,
          type: this.orchestrator ? typeof this.orchestrator : "undefined",
          hasCreateComponent:
            this.orchestrator &&
            typeof this.orchestrator.createComponent === "function",
          hasRender:
            this.orchestrator && typeof this.orchestrator.render === "function",
          hasDestroy:
            this.orchestrator &&
            typeof this.orchestrator.destroy === "function",
          hasOn:
            this.orchestrator && typeof this.orchestrator.on === "function",
          hasSetContainer:
            this.orchestrator &&
            typeof this.orchestrator.setContainer === "function",
          constructor: this.orchestrator?.constructor?.name || "unknown",
        },
        components: {
          table: this._getComponentDiagnostics(this.tableComponent, [
            "updateData",
            "setData",
            "render",
            "destroy",
          ]),
          modal: this._getComponentDiagnostics(this.modalComponent, [
            "show",
            "hide",
            "render",
            "destroy",
          ]),
          filter: this._getComponentDiagnostics(this.filterComponent, [
            "updateFilters",
            "setFilters",
            "render",
            "destroy",
          ]),
          pagination: this._getComponentDiagnostics(this.paginationComponent, [
            "setState",
            "render",
            "destroy",
          ]),
        },
        dependencies: {
          SecurityUtils: {
            available: typeof window.SecurityUtils !== "undefined",
            hasValidateInput:
              typeof window.SecurityUtils?.validateInput === "function",
            hasPreventXSS:
              typeof window.SecurityUtils?.preventXSS === "function",
            hasCheckRateLimit:
              typeof window.SecurityUtils?.checkRateLimit === "function",
          },
          BaseEntityManager: {
            available: typeof window.BaseEntityManager !== "undefined",
            isInstance: this instanceof window.BaseEntityManager,
          },
          ComponentOrchestrator: {
            available: typeof window.ComponentOrchestrator !== "undefined",
            hasInstance: !!this.orchestrator,
          },
        },
        recommendations: this._getRecommendations(validation),
      };

      return diagnostics;
    }

    /**
     * Get detailed diagnostics for a specific component
     * @param {Object} component - Component to diagnose
     * @param {Array<string>} expectedMethods - Expected methods for this component type
     * @returns {Object} Component-specific diagnostics
     * @private
     */
    _getComponentDiagnostics(component, expectedMethods = []) {
      if (!component) {
        return {
          available: false,
          status: "not_initialized",
          type: "undefined",
          expectedMethods: expectedMethods,
          availableMethods: [],
          missingMethods: expectedMethods,
          error: "Component not initialized",
        };
      }

      const availableMethods = this._getAvailableMethods(component);
      const missingMethods = expectedMethods.filter(
        (method) => !availableMethods.includes(method),
      );
      const hasRequiredMethods = missingMethods.length === 0;

      return {
        available: true,
        status: hasRequiredMethods ? "healthy" : "missing_methods",
        type: typeof component,
        constructor: component.constructor?.name || "unknown",
        prototype:
          Object.getPrototypeOf(component).constructor?.name || "unknown",
        expectedMethods: expectedMethods,
        availableMethods: availableMethods,
        missingMethods: missingMethods,
        hasRequiredMethods: hasRequiredMethods,
        error:
          missingMethods.length > 0
            ? `Missing required methods: ${missingMethods.join(", ")}`
            : null,
      };
    }

    /**
     * Get component status summary
     * @returns {Object} Status summary
     * @private
     */
    _getComponentStatusSummary() {
      const componentStatuses = {
        table: this.tableComponent ? "available" : "missing",
        modal: this.modalComponent ? "available" : "missing",
        filter: this.filterComponent ? "available" : "missing",
        pagination: this.paginationComponent ? "available" : "missing",
      };

      const availableCount = Object.values(componentStatuses).filter(
        (status) => status === "available",
      ).length;
      const totalRequestedCount = [
        this.config.tableConfig ? 1 : 0,
        this.config.modalConfig ? 1 : 0,
        this.config.filterConfig?.enabled ? 1 : 0,
        this.config.paginationConfig ? 1 : 0,
      ].reduce((sum, count) => sum + count, 0);

      return {
        overall:
          availableCount === totalRequestedCount
            ? "healthy"
            : availableCount > 0
              ? "partial"
              : "failed",
        availableComponents: availableCount,
        requestedComponents: totalRequestedCount,
        initializationRate:
          totalRequestedCount > 0
            ? ((availableCount / totalRequestedCount) * 100).toFixed(1) + "%"
            : "0%",
        components: componentStatuses,
      };
    }

    /**
     * Get recommendations based on validation results
     * @param {Object} validation - Validation results
     * @returns {Array<string>} Recommendations for fixing issues
     * @private
     */
    _getRecommendations(validation) {
      const recommendations = [];

      if (!validation.isInitialized) {
        recommendations.push(
          "Call initialize() method before using the entity manager",
        );
      }

      if (!validation.orchestratorAvailable) {
        recommendations.push(
          "Ensure ComponentOrchestrator is loaded and available",
        );
      }

      if (!validation.components.table.isValid && this.config.tableConfig) {
        recommendations.push(
          'Check TableComponent initialization - verify ComponentOrchestrator.createComponent("table", ...) succeeds',
        );
      }

      if (
        !validation.components.pagination.isValid &&
        this.config.paginationConfig
      ) {
        recommendations.push(
          'Check PaginationComponent initialization - verify ComponentOrchestrator.createComponent("pagination", ...) succeeds',
        );
      }

      if (validation.healthScore < 50) {
        recommendations.push(
          "Multiple component failures detected - check browser console for initialization errors",
        );
        recommendations.push(
          "Verify all component dependencies (BaseComponent, SecurityUtils) are loaded",
        );
      }

      if (validation.healthScore === 0 && validation.orchestratorAvailable) {
        recommendations.push(
          "Critical: All components failed to initialize despite orchestrator being available - check component factory methods",
        );
      }

      return recommendations;
    }

    /**
     * Debug component state and provide troubleshooting guidance
     * Use this method when encountering component-related errors
     * @param {boolean} detailed - Whether to include detailed component analysis
     * @returns {Object} Debug report with recommendations
     */
    debugComponents(detailed = false) {
      console.group(`[BaseEntityManager] Debug Report for ${this.entityType}`);

      const diagnostics = this.getComponentDiagnostics();

      console.log("=== COMPONENT STATUS SUMMARY ===");
      console.log(
        `Overall Status: ${diagnostics.status.overall.toUpperCase()}`,
      );
      console.log(
        `Initialization Rate: ${diagnostics.status.initializationRate}`,
      );
      console.log(
        `Available Components: ${diagnostics.status.availableComponents}/${diagnostics.status.requestedComponents}`,
      );

      console.log("\n=== COMPONENT AVAILABILITY ===");
      Object.entries(diagnostics.components).forEach(([name, component]) => {
        const status = component.available
          ? component.hasRequiredMethods
            ? "✅ HEALTHY"
            : "⚠️  MISSING METHODS"
          : "❌ NOT INITIALIZED";
        console.log(`${name.toUpperCase()}: ${status}`);

        if (component.available && !component.hasRequiredMethods) {
          console.log(`  Missing: ${component.missingMethods.join(", ")}`);
        }
      });

      console.log("\n=== ORCHESTRATOR STATUS ===");
      console.log(
        `Available: ${diagnostics.orchestrator.available ? "✅" : "❌"}`,
      );
      console.log(`Type: ${diagnostics.orchestrator.constructor}`);
      console.log(
        `Has createComponent: ${diagnostics.orchestrator.hasCreateComponent ? "✅" : "❌"}`,
      );

      if (diagnostics.recommendations.length > 0) {
        console.log("\n=== RECOMMENDATIONS ===");
        diagnostics.recommendations.forEach((rec, index) => {
          console.log(`${index + 1}. ${rec}`);
        });
      }

      if (detailed) {
        console.log("\n=== DETAILED DIAGNOSTICS ===");
        console.log(diagnostics);
      }

      console.groupEnd();

      return diagnostics;
    }

    /**
     * Test component functionality with safe error handling
     * Use this to verify component methods work as expected
     * @returns {Object} Test results
     */
    async testComponents() {
      console.log(
        `[BaseEntityManager] Testing component functionality for ${this.entityType}`,
      );

      const testResults = {
        timestamp: new Date().toISOString(),
        entityType: this.entityType,
        tests: {},
        overall: "unknown",
      };

      // Test TableComponent
      if (this.tableComponent) {
        testResults.tests.table = await this._testTableComponent();
      }

      // Test PaginationComponent
      if (this.paginationComponent) {
        testResults.tests.pagination = await this._testPaginationComponent();
      }

      // Test ModalComponent
      if (this.modalComponent) {
        testResults.tests.modal = await this._testModalComponent();
      }

      // Calculate overall test status
      const testValues = Object.values(testResults.tests);
      const passedTests = testValues.filter(
        (test) => test.status === "passed",
      ).length;
      const failedTests = testValues.filter(
        (test) => test.status === "failed",
      ).length;

      testResults.overall =
        failedTests === 0 ? "passed" : passedTests > 0 ? "partial" : "failed";
      testResults.summary = {
        total: testValues.length,
        passed: passedTests,
        failed: failedTests,
      };

      console.log(
        `[BaseEntityManager] Component tests completed for ${this.entityType}:`,
        testResults.summary,
      );

      return testResults;
    }

    /**
     * Test table component functionality
     * @returns {Object} Test result
     * @private
     */
    async _testTableComponent() {
      try {
        const testData = [{ id: "test", name: "Test Item" }];

        if (typeof this.tableComponent.updateData === "function") {
          await this.tableComponent.updateData(testData);
          return { status: "passed", method: "updateData", error: null };
        } else if (typeof this.tableComponent.setData === "function") {
          await this.tableComponent.setData(testData);
          return { status: "passed", method: "setData", error: null };
        } else {
          return {
            status: "failed",
            method: "none",
            error: "No data update method available",
          };
        }
      } catch (error) {
        return {
          status: "failed",
          method: "updateData/setData",
          error: error.message,
        };
      }
    }

    /**
     * Test pagination component functionality
     * @returns {Object} Test result
     * @private
     */
    async _testPaginationComponent() {
      try {
        if (typeof this.paginationComponent.setState === "function") {
          await this.paginationComponent.setState({
            currentPage: 1,
            totalItems: 10,
            pageSize: 5,
          });
          return { status: "passed", method: "setState", error: null };
        } else {
          return {
            status: "failed",
            method: "none",
            error: "No setState method available",
          };
        }
      } catch (error) {
        return {
          status: "failed",
          method: "setState",
          error: error.message,
        };
      }
    }

    /**
     * Test modal component functionality
     * @returns {Object} Test result
     * @private
     */
    async _testModalComponent() {
      try {
        // Just test that the component has expected methods, don't actually show modal
        const hasShow = typeof this.modalComponent.show === "function";
        const hasHide = typeof this.modalComponent.hide === "function";

        if (hasShow && hasHide) {
          return { status: "passed", method: "show/hide", error: null };
        } else {
          return {
            status: "failed",
            method: "show/hide",
            error: `Missing methods: show=${hasShow}, hide=${hasHide}`,
          };
        }
      } catch (error) {
        return {
          status: "failed",
          method: "show/hide",
          error: error.message,
        };
      }
    }

    /**
     * Cleanup resources
     */
    destroy() {
      console.log(
        `[BaseEntityManager] Destroying ${this.entityType} entity manager`,
      );

      if (this.orchestrator) {
        this.orchestrator.destroy();
        this.orchestrator = null;
      }

      // Clear references
      this.tableComponent = null;
      this.modalComponent = null;
      this.filterComponent = null;
      this.paginationComponent = null;
      this.performanceTracker = null;
      this.securityContext = null;
    }
  }

  // Make available globally for browser compatibility
  if (typeof window !== "undefined") {
    window.BaseEntityManager = BaseEntityManager;
  }

  // Already attached to window in previous lines

  // CommonJS export for Jest compatibility
  if (typeof module !== "undefined" && module.exports) {
    module.exports = BaseEntityManager;
  }
} // End of BaseEntityManager undefined check
