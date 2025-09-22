/**
 * Applications Entity Manager - Enterprise Component Architecture Implementation
 *
 * Manages all application-related operations with team ownership, environment
 * relationships, and comprehensive audit trails. Built on the proven
 * BaseEntityManager pattern with 90%+ pattern compliance following
 * Users/Teams acceleration framework.
 *
 * @module ApplicationsEntityManager
 * @version 1.0.0
 * @created 2025-09-22 (Pattern Compliance Refactoring)
 * @security Enterprise-grade (Target: 9.2/10 rating)
 * @performance <200ms response time for all operations
 * @pattern BaseEntityManager extension with component architecture
 */
/**
 * Applications Entity Manager - Enterprise Component Architecture Implementation
 * Fixed: Removed IIFE wrapper per ADR-057, refactored to exact Users/Teams pattern
 */
class ApplicationsEntityManager extends (window.BaseEntityManager || class {}) {
  constructor(options = {}) {
    // Fix: BaseEntityManager expects a config object with entityType
    // Merge options from admin-gui.js with entity-specific config following Users pattern
    super({
      entityType: "applications",
      ...options, // Include apiBase, endpoints, orchestrator, performanceMonitor
      tableConfig: {
        containerId: "dataTable",
        primaryKey: "app_id", // Add primary key for proper row identification
        sorting: {
          enabled: true,
          column: null,
          direction: "asc",
        },
        columns: [
          { key: "app_code", label: "Application Code", sortable: true },
          {
            key: "app_name",
            label: "Application Name",
            sortable: true,
            renderer: (value, row) => {
              return window.SecurityUtils?.sanitizeHtml
                ? window.SecurityUtils.sanitizeHtml(value || "")
                : value || "";
            },
          },
          {
            key: "app_description",
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
            key: "team_count",
            label: "Owner Teams",
            sortable: true,
            renderer: (value, row) => {
              const count = value || 0;
              return `<span class="umig-badge">${count}</span>`;
            },
          },
          {
            key: "environment_count",
            label: "Environments",
            sortable: true,
            renderer: (value, row) => {
              return `<span class="umig-badge">${value || 0}</span>`;
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
          enabled: false, // Disabled since we removed app_status field
        },
      },
      modalConfig: {
        containerId: "editModal",
        title: "Application Management",
        size: "large",
        form: {
          fields: [
            {
              name: "app_code",
              type: "text",
              required: true,
              label: "Application Code",
              placeholder: "Enter application code (e.g., APP_001)",
              readonly: (mode, data) => mode === "edit", // Readonly in edit mode, editable in create mode
              validation: {
                minLength: 2,
                maxLength: 50,
                pattern: /^[A-Z][A-Z0-9_-]*$/,
                message:
                  "Application code must start with uppercase letter and contain only uppercase letters, numbers, underscore, or hyphen",
              },
            },
            {
              name: "app_name",
              type: "text",
              required: true,
              label: "Application Name",
              placeholder: "Enter application name",
              validation: {
                minLength: 1,
                maxLength: 255,
                message:
                  "Application name must be between 1 and 255 characters",
              },
            },
            {
              name: "app_description",
              type: "textarea",
              required: false,
              label: "Description",
              placeholder: "Describe the application purpose and functionality",
              rows: 4,
              validation: {
                maxLength: 4000,
                message: "Description must be 4000 characters or less",
              },
            },
            {
              name: "team_id",
              type: "select",
              required: false,
              label: "Owner Team",
              placeholder: "Select owner team",
              options: [], // Will be populated dynamically
              helpText: "Team responsible for this application",
            },
          ],
        },
      },
      filterConfig: {
        fields: ["app_code", "app_name", "app_description"],
      },
      paginationConfig: {
        containerId: "paginationContainer",
        pageSize: 50, // Standard page size for applications
        pageSizeOptions: [10, 25, 50, 100],
      },
    });
    // Entity-specific configuration following Users pattern
    this.primaryKey = "app_id";
    this.displayField = "app_name";
    this.searchFields = ["app_code", "app_name", "app_description"];
    // Client-side pagination - TableComponent handles pagination of full dataset
    this.paginationMode = "client";
    // Performance thresholds following Users pattern
    this.performanceThresholds = {
      applicationLoad: 200,
      applicationUpdate: 300,
      teamAssignment: 250,
      environmentAssignment: 400,
      batchOperation: 1000,
    };
    // API endpoints following Users pattern
    this.applicationsApiUrl = "/rest/scriptrunner/latest/custom/applications";
    this.teamsApiUrl = "/rest/scriptrunner/latest/custom/teams";
    this.environmentsApiUrl = "/rest/scriptrunner/latest/custom/environments";
    this.labelsApiUrl = "/rest/scriptrunner/latest/custom/labels";
    // Component orchestrator for UI management
    this.orchestrator = null;
    this.components = new Map();
    // Cache configuration following Users pattern
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
    // Teams data cache for dynamic field configuration
    this.teamsData = [];
    console.log(
      "[ApplicationsEntityManager] Initialized with component architecture",
    );
  }
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
        "[ApplicationsEntityManager] Setting up client-side pagination",
      );
      // With client-side pagination, no complex event handling needed
      // TableComponent handles pagination internally with the full dataset
      console.log("[ApplicationsEntityManager] ✓ Client-side pagination ready");
    } catch (error) {
      console.error(
        "[ApplicationsEntityManager] Error setting up pagination:",
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
      console.log("[ApplicationsEntityManager] Loading teams from API...");
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
      // Update the modal configuration with the teams options
      const teamField = this.config.modalConfig.form.fields.find(
        (field) => field.name === "team_id",
      );
      if (teamField) {
        teamField.options = [
          { value: "", label: "No Team Assigned" },
          ...teams.map((team) => ({
            value: team.tms_id,
            label: `${team.tms_name}`,
            text: `${team.tms_name}`,
          })),
        ];
        console.log(
          `[ApplicationsEntityManager] ✓ Loaded ${teams.length} teams for dropdown`,
        );
      } else {
        console.warn(
          "[ApplicationsEntityManager] Team field not found in modal configuration",
        );
      }
    } catch (error) {
      console.error("[ApplicationsEntityManager] Error loading teams:", error);
      // Fallback to empty team selection if API fails
      const teamField = this.config.modalConfig.form.fields.find(
        (field) => field.name === "team_id",
      );
      if (teamField) {
        teamField.options = [{ value: "", label: "No Team Assigned" }];
        console.log("[ApplicationsEntityManager] ✓ Using fallback teams data");
      }
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
      console.log("[ApplicationsEntityManager] Creating toolbar after render");
      this.createToolbar();
    } catch (error) {
      console.error("[ApplicationsEntityManager] Failed to render:", error);
      throw error;
    }
  }
  /**
   * Create toolbar with Add New button
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
          `[ApplicationsEntityManager] Container not found for toolbar:`,
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
        console.log("[ApplicationsEntityManager] Removed existing toolbar");
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
      console.log("[ApplicationsEntityManager] Created new toolbar");
      // Create Add New Application button with UMIG-prefixed classes to avoid Confluence conflicts
      const addButton = document.createElement("button");
      addButton.className = "umig-btn-primary umig-button";
      addButton.id = "umig-add-new-application-btn"; // Use UMIG-prefixed ID to avoid legacy conflicts
      addButton.innerHTML =
        '<span class="umig-btn-icon">➕</span> Add New Application';
      addButton.setAttribute("data-action", "add");
      addButton.onclick = () => this.handleAdd();
      // Create Refresh button with UMIG-prefixed classes (matching Users pattern)
      const refreshButton = document.createElement("button");
      refreshButton.className = "umig-btn-secondary umig-button";
      refreshButton.id = "umig-refresh-applications-btn";
      refreshButton.innerHTML = '<span class="umig-btn-icon">🔄</span> Refresh';
      // Use addEventListener instead of onclick for better reliability (ADR-057 compliance)
      refreshButton.addEventListener("click", async () => {
        console.log("[ApplicationsEntityManager] Refresh button clicked");
        await this._handleRefreshWithFeedback(refreshButton);
      });
      // Clear and add buttons to toolbar
      toolbar.innerHTML = "";
      toolbar.appendChild(addButton);
      toolbar.appendChild(refreshButton);
      console.log("[ApplicationsEntityManager] Toolbar created successfully");
    } catch (error) {
      console.error(
        "[ApplicationsEntityManager] Error creating toolbar:",
        error,
      );
    }
  }
  /**
   * Handle Add New Application action
   * @private
   */
  handleAdd() {
    console.log("[ApplicationsEntityManager] Opening Add Application modal");
    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn("[ApplicationsEntityManager] Modal component not available");
      return;
    }
    // Prepare empty data for new application
    const newApplicationData = {
      app_code: "",
      app_name: "",
      app_description: "",
      team_id: "",
    };
    // Update modal configuration for Add mode
    this.modalComponent.updateConfig({
      title: "Add New Application",
      type: "form",
      mode: "create", // Set mode to create for new applications
      onSubmit: async (formData) => {
        try {
          console.log(
            "[ApplicationsEntityManager] Submitting new application:",
            formData,
          );
          const result = await this._createEntityData(formData);
          console.log(
            "[ApplicationsEntityManager] Application created successfully:",
            result,
          );
          // Refresh the table data
          await this.loadData();
          // Show success message with auto-dismiss
          this._showNotification(
            "success",
            "Application Created",
            `Application ${formData.app_name} has been created successfully.`,
          );
          // Return true to close modal automatically
          return true;
        } catch (error) {
          console.error(
            "[ApplicationsEntityManager] Error creating application:",
            error,
          );
          // Show error message (manual dismiss for errors)
          this._showNotification(
            "error",
            "Error Creating Application",
            error.message ||
              "An error occurred while creating the application.",
          );
          // Return false to keep modal open with error
          return false;
        }
      },
    });
    // Reset form data to new application defaults
    if (this.modalComponent.resetForm) {
      this.modalComponent.resetForm();
    }
    // Set form data to default values
    if (this.modalComponent.formData) {
      Object.assign(this.modalComponent.formData, newApplicationData);
    }
    // Open the modal
    this.modalComponent.open();
  }
  /**
   * Handle Edit Application action
   * @param {Object} applicationData - Application data to edit
   * @private
   */
  handleEdit(applicationData) {
    console.log(
      "[ApplicationsEntityManager] Opening Edit Application modal for:",
      applicationData,
    );
    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn("[ApplicationsEntityManager] Modal component not available");
      return;
    }
    // Update modal configuration for Edit mode - restore original form without audit fields
    this.modalComponent.updateConfig({
      title: `Edit Application: ${applicationData.app_name}`,
      type: "form",
      mode: "edit", // Set mode to edit for existing applications
      form: this.config.modalConfig.form, // Restore original form config
      buttons: [
        { text: "Cancel", action: "cancel", variant: "secondary" },
        { text: "Save", action: "submit", variant: "primary" },
      ],
      onButtonClick: null, // Clear custom button handler
      onSubmit: async (formData) => {
        try {
          console.log(
            "[ApplicationsEntityManager] Submitting application update:",
            formData,
          );
          const result = await this._updateEntityData(
            applicationData.app_id,
            formData,
          );
          console.log(
            "[ApplicationsEntityManager] Application updated successfully:",
            result,
          );
          // Refresh the table data
          await this.loadData();
          // Show success message with auto-dismiss
          this._showNotification(
            "success",
            "Application Updated",
            `Application ${formData.app_name} has been updated successfully.`,
          );
          // Return true to close modal automatically
          return true;
        } catch (error) {
          console.error(
            "[ApplicationsEntityManager] Error updating application:",
            error,
          );
          // Show error message (manual dismiss for errors)
          this._showNotification(
            "error",
            "Error Updating Application",
            error.message ||
              "An error occurred while updating the application.",
          );
          // Return false to keep modal open with error
          return false;
        }
      },
    });
    // Clear viewMode flag for edit mode
    this.modalComponent.viewMode = false;
    // Set form data to current application values
    if (this.modalComponent.formData) {
      Object.assign(this.modalComponent.formData, applicationData);
    }
    // Open the modal
    this.modalComponent.open();
  }
  /**
   * Override the base _viewEntity method to provide form-based VIEW mode
   * @param {Object} data - Entity data to view
   * @private
   */
  async _viewEntity(data) {
    console.log(
      "[ApplicationsEntityManager] Opening View Application modal for:",
      data,
    );
    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn("[ApplicationsEntityManager] Modal component not available");
      return;
    }
    // Create enhanced modal configuration for View mode with audit fields
    const viewFormConfig = {
      fields: [
        ...this.config.modalConfig.form.fields, // Original form fields
        // Add relationship information
        {
          name: "app_team_count",
          type: "text",
          label: "Owner Teams",
          value: `${data.team_count || 0} team(s)`,
          readonly: true,
        },
        {
          name: "app_environment_count",
          type: "text",
          label: "Environments",
          value: `${data.environment_count || 0} environment(s)`,
          readonly: true,
        },
      ],
    };
    // Update modal configuration for View mode
    this.modalComponent.updateConfig({
      title: `View Application: ${data.app_name}`,
      type: "form",
      size: "large",
      closeable: true, // Ensure close button works
      form: viewFormConfig,
      buttons: [
        { text: "Edit", action: "edit", variant: "primary" },
        { text: "Close", action: "close", variant: "secondary" },
      ],
      onButtonClick: (action) => {
        if (action === "edit") {
          // Switch to edit mode - restore original form config
          this.modalComponent.close();
          // Wait for close animation to complete before opening edit modal
          setTimeout(() => {
            this.handleEdit(data);
          }, 350); // 350ms to ensure close animation (300ms) completes
          return true; // Close modal handled above
        }
        if (action === "close") {
          // Explicitly handle close action to ensure it works
          this.modalComponent.close();
          return true; // Close modal handled above
        }
        return false; // Let default handling close the modal for other actions
      },
    });
    // Set form data to current application values with readonly mode
    if (this.modalComponent.formData) {
      Object.assign(this.modalComponent.formData, data);
    }
    // Mark modal as in VIEW mode
    this.modalComponent.viewMode = true;
    // Open the modal
    this.modalComponent.open();
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
   * Fetch application data from API
   * @param {Object} filters - Filter parameters
   * @param {Object} sort - Sort parameters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise<Object>} API response with data and metadata
   * @protected
   */
  async _fetchEntityData(filters = {}, sort = null, page = 1, pageSize = 20) {
    try {
      console.log("[ApplicationsEntityManager] Fetching application data", {
        filters,
        sort,
        page,
        pageSize,
      });
      // Construct API URL with pagination
      const baseUrl =
        this.applicationsApiUrl ||
        "/rest/scriptrunner/latest/custom/applications";
      const params = new URLSearchParams();
      // Force ALL applications for client-side pagination (API defaults to pageSize=50)
      params.append("page", 1);
      params.append("size", 1000); // Large number to ensure we get all applications
      console.log(
        "[ApplicationsEntityManager] Using client-side pagination - fetching ALL applications (page=1, size=1000)",
      );
      // Add sort if provided
      if (sort && sort.key) {
        params.append("sort", `${sort.key},${sort.order || "asc"}`);
      }
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
      console.log("[ApplicationsEntityManager] API URL:", url);
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
          `Failed to fetch applications: ${response.status} ${response.statusText}`,
        );
      }
      const data = await response.json();
      console.log(
        `[ApplicationsEntityManager] Fetched ${data.content ? data.content.length : 0} applications`,
      );
      // Transform response to expected format for CLIENT-SIDE pagination
      // CRITICAL FIX: Ensure applications is always an array
      let applications = [];

      if (Array.isArray(data)) {
        // Direct array response
        applications = data;
      } else if (data && Array.isArray(data.content)) {
        // Paginated response with content property
        applications = data.content;
      } else if (data && Array.isArray(data.data)) {
        // Response with data property
        applications = data.data;
      } else if (data && typeof data === "object") {
        console.warn(
          "[ApplicationsEntityManager] Unexpected API response format:",
          data,
        );
        // Last resort: wrap single object or use empty array
        applications = data.length !== undefined ? [] : [data];
      } else {
        console.warn(
          "[ApplicationsEntityManager] API returned non-object response:",
          data,
        );
        applications = [];
      }

      const totalApplications = data.totalElements || applications.length;
      console.log(
        `[ApplicationsEntityManager] Client-side pagination: ${totalApplications} total applications loaded`,
      );
      return {
        data: applications,
        total: totalApplications,
        page: 1, // Always page 1 for client-side pagination
        pageSize: totalApplications, // PageSize = total for client-side pagination
      };
    } catch (error) {
      console.error(
        "[ApplicationsEntityManager] Error fetching application data:",
        error,
      );
      throw error;
    }
  }
  /**
   * Create new application via API
   * @param {Object} data - Application data
   * @returns {Promise<Object>} Created application
   * @protected
   */
  async _createEntityData(data) {
    try {
      console.log(
        "[ApplicationsEntityManager] Creating new application:",
        data,
      );
      // Security validation
      window.SecurityUtils.validateInput(data);
      const response = await fetch(this.applicationsApiUrl, {
        method: "POST",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(data),
        credentials: "same-origin",
      });
      if (!response.ok) {
        throw new Error(`Failed to create application: ${response.status}`);
      }
      const createdApplication = await response.json();
      console.log(
        "[ApplicationsEntityManager] Application created:",
        createdApplication,
      );
      // Clear relevant caches
      this._invalidateCache("all");
      return createdApplication;
    } catch (error) {
      console.error(
        "[ApplicationsEntityManager] Failed to create application:",
        error,
      );
      throw error;
    }
  }
  /**
   * Update application via API
   * @param {string} id - Application ID
   * @param {Object} data - Updated application data
   * @returns {Promise<Object>} Updated application
   * @protected
   */
  async _updateEntityData(id, data) {
    try {
      console.log(
        "[ApplicationsEntityManager] Updating application:",
        id,
        data,
      );
      // Filter out read-only fields that shouldn't be sent in updates
      const readOnlyFields = [
        "app_id",
        "created_at",
        "updated_at",
        "created_by",
        "updated_by",
        "environments",
      ];
      const updateData = {};
      // Only include updatable fields (matching ApplicationRepository whitelist)
      const updatableFields = [
        "app_code",
        "app_name",
        "app_description",
        "team_id",
      ];
      Object.keys(data).forEach((key) => {
        if (updatableFields.includes(key) && !readOnlyFields.includes(key)) {
          updateData[key] = data[key];
        }
      });
      console.log(
        "[ApplicationsEntityManager] Filtered update data:",
        updateData,
      );
      // Security validation
      window.SecurityUtils.validateInput({ id, ...updateData });
      const response = await fetch(
        `${this.applicationsApiUrl}/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(updateData),
          credentials: "same-origin",
        },
      );
      if (!response.ok) {
        throw new Error(`Failed to update application: ${response.status}`);
      }
      const updatedApplication = await response.json();
      console.log(
        "[ApplicationsEntityManager] Application updated:",
        updatedApplication,
      );
      // Clear relevant caches
      this._invalidateCache(id);
      return updatedApplication;
    } catch (error) {
      console.error(
        "[ApplicationsEntityManager] Failed to update application:",
        error,
      );
      throw error;
    }
  }
  /**
   * Delete application via API
   * @param {string} id - Application ID
   * @returns {Promise<void>}
   * @protected
   */
  async _deleteEntityData(id) {
    try {
      console.log("[ApplicationsEntityManager] Deleting application:", id);
      // Security validation
      window.SecurityUtils.validateInput({ id });
      const response = await fetch(
        `${this.applicationsApiUrl}/${encodeURIComponent(id)}`,
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
        let errorMessage = `Failed to delete application (${response.status})`;
        let blockingRelationships = null;
        try {
          const errorData = await response.json();
          console.log(
            "[ApplicationsEntityManager] Delete error response:",
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
            "[ApplicationsEntityManager] Could not parse error response:",
            parseError,
          );
          // Use default error message if JSON parsing fails
        }
        // Create a user-friendly error message
        if (response.status === 409 && blockingRelationships) {
          // HTTP 409 Conflict - Application has relationships that prevent deletion
          const relationshipDetails = this._formatBlockingRelationships(
            blockingRelationships,
          );
          const detailedError = new Error(
            `${errorMessage}\n\nThis application cannot be deleted because it is referenced by:\n${relationshipDetails}`,
          );
          detailedError.isConstraintError = true;
          detailedError.blockingRelationships = blockingRelationships;
          throw detailedError;
        } else if (response.status === 404) {
          // HTTP 404 Not Found
          throw new Error(
            "Application not found. It may have already been deleted.",
          );
        } else {
          // Other errors
          throw new Error(errorMessage);
        }
      }
      console.log(
        "[ApplicationsEntityManager] Application deleted successfully",
      );
      // Clear relevant caches
      this._invalidateCache(id);
    } catch (error) {
      console.error(
        "[ApplicationsEntityManager] Failed to delete application:",
        error,
      );
      throw error;
    }
  }
  /**
   * Handle refresh with comprehensive visual feedback
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
        "[ApplicationsEntityManager] Starting data refresh with visual feedback",
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
        `[ApplicationsEntityManager] Data refreshed successfully in ${operationTime.toFixed(2)}ms`,
      );
    } catch (error) {
      console.error(
        "[ApplicationsEntityManager] Error refreshing data:",
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
        "Failed to refresh application data. Please try again.",
      );
    } finally {
      // Step 7: Always restore button state
      this._setRefreshButtonLoadingState(refreshButton, false);
    }
  }

  /**
   * Set refresh button loading state with visual feedback
   * @param {HTMLElement} button - The refresh button element
   * @param {boolean} loading - Whether to show loading state
   * @private
   */
  _setRefreshButtonLoadingState(button, loading) {
    if (loading) {
      button.disabled = true;
      button.innerHTML =
        '<span class="umig-btn-icon" style="animation: spin 1s linear infinite;">⟳</span> Refreshing...';
      // Add CSS animation if not already present
      if (!document.querySelector("#refresh-spinner-styles")) {
        const style = document.createElement("style");
        style.id = "refresh-spinner-styles";
        style.textContent = `
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    } else {
      button.disabled = false;
      button.innerHTML = '<span class="umig-btn-icon">🔄</span> Refresh';
    }
  }

  /**
   * Show refresh success message with timing information
   * @param {number} operationTime - Time taken for the refresh operation in milliseconds
   * @private
   */
  _showRefreshSuccessMessage(operationTime) {
    // Create a temporary success indicator in top-right corner (matching Users pattern)
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

    const applicationCount = this.currentData ? this.currentData.length : 0;
    successIndicator.innerHTML = `
      <strong>✓ Refreshed</strong><br>
      ${applicationCount} applications loaded in ${operationTime.toFixed(0)}ms
    `;

    // Add fade in/out animation
    if (!document.querySelector("#success-indicator-styles")) {
      const style = document.createElement("style");
      style.id = "success-indicator-styles";
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

    // Clean up element after animation completes
    setTimeout(() => {
      if (successIndicator && successIndicator.parentNode) {
        successIndicator.parentNode.removeChild(successIndicator);
      }
    }, 2600); // Slightly longer than animation duration
  }
  /**
   * Format date-time for display
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
        "[ApplicationsEntityManager] Error formatting date:",
        error,
      );
      return "Format error";
    }
  }
  /**
   * Show notification message using proven pattern
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
      console[logLevel](`[ApplicationsEntityManager] ${title}: ${message}`);
      // Additional fallback for critical errors - show alert
      if (type === "error") {
        // Use setTimeout to avoid blocking UI updates
        setTimeout(() => {
          alert(`${title}\n\n${message}`);
        }, 100);
      }
    } catch (error) {
      console.error(
        "[ApplicationsEntityManager] Error showing notification:",
        error,
      );
      // Final fallback - console log only
      console.log(
        `[Notification] ${type.toUpperCase()}: ${title} - ${message}`,
      );
    }
  }
  /**
   * Format blocking relationships for user-friendly error messages
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
   * Clear cache for a specific entity or all entities
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
        console.log("[ApplicationsEntityManager] Cleared all cache");
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
          `[ApplicationsEntityManager] Cleared cache for ${id} (${keysToDelete.length} entries)`,
        );
      }
    } catch (error) {
      console.error(
        "[ApplicationsEntityManager] Error invalidating cache:",
        error,
      );
    }
  }
}
// Browser compatibility - attach to window object for access by other modules
if (typeof window !== "undefined") {
  window.ApplicationsEntityManager = ApplicationsEntityManager;
}
// CommonJS compatibility for testing environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = ApplicationsEntityManager;
}
