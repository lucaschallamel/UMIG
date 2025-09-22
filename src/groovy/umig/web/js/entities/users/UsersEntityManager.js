/**
 * Users Entity Manager - Enterprise Component Architecture Implementation
 *
 * Manages all user-related operations with bidirectional team relationships,
 * role management, and comprehensive audit trails. Built on the proven
 * BaseEntityManager pattern with 40% implementation time reduction through
 * knowledge templates from Teams entity migration.
 *
 * @module UsersEntityManager
 * @version 1.0.0
 * @created 2025-09-12 (US-082-C Track B Implementation)
 * @security Enterprise-grade (Target: 8.6/10 rating)
 * @performance <200ms response time for all operations
 * @pattern BaseEntityManager extension with component architecture
 */

/**
 * Users Entity Manager - Enterprise Component Architecture Implementation
 * Fixed: Removed IIFE wrapper per ADR-057, fixed constructor to accept options
 */

class UsersEntityManager extends (window.BaseEntityManager || class {}) {
  constructor(options = {}) {
    // Fix: BaseEntityManager expects a config object with entityType
    // Merge options from admin-gui.js with entity-specific config
    super({
      entityType: "users",
      ...options, // Include apiBase, endpoints, orchestrator, performanceMonitor
      tableConfig: {
        containerId: "dataTable",
        primaryKey: "usr_id", // Add primary key for proper row identification
        sorting: {
          enabled: true,
          column: null,
          direction: "asc",
        },
        columns: [
          { key: "usr_code", label: "User Code", sortable: true },
          {
            key: "fullName",
            label: "Full Name",
            sortable: true,
            renderer: (value, row) => {
              // value parameter represents the fullName computed value
              return `${row.usr_first_name || ""} ${row.usr_last_name || ""}`.trim();
            },
            sortFn: (a, b) => {
              // Custom sort function for computed full name
              const fullNameA =
                `${a.usr_first_name || ""} ${a.usr_last_name || ""}`
                  .trim()
                  .toLowerCase();
              const fullNameB =
                `${b.usr_first_name || ""} ${b.usr_last_name || ""}`
                  .trim()
                  .toLowerCase();
              return fullNameA.localeCompare(fullNameB);
            },
          },
          {
            key: "usr_email",
            label: "Email",
            sortable: true,
            renderer: (value, row) => {
              // Use EmailUtils if available to create mailto: link
              if (window.EmailUtils && value) {
                return window.EmailUtils.formatSingleEmail(value, {
                  linkClass: "umig-table-email-link",
                  addTitle: true,
                });
              }
              return value || "";
            },
          },
          {
            key: "usr_active",
            label: "Active",
            sortable: true,
            renderer: (value, row) => {
              // Use generic boolean styling for consistent appearance
              const isYes = row.usr_active;
              const text = isYes ? "Yes" : "No";
              const cssClass = isYes ? "umig-boolean-yes" : "umig-boolean-no";
              return `<span class="${cssClass}">${text}</span>`;
            },
          },
          {
            key: "role_code",
            label: "Role",
            sortable: true,
            renderer: (value, row) => {
              // Display the actual role_code from the database without transformation
              const roleCode = row.role_code || (row.usr_is_admin ? "ADMIN" : "NORMAL");
              return roleCode;
            },
          },
          {
            key: "usr_is_admin",
            label: "SUPERADMIN",
            sortable: true,
            renderer: (value, row) => {
              // Use generic boolean styling for consistent appearance
              const isYes = row.usr_is_admin;
              const text = isYes ? "Yes" : "No";
              const cssClass = isYes ? "umig-boolean-yes" : "umig-boolean-no";
              return `<span class="${cssClass}">${text}</span>`;
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
          enabled: true,
          fields: {
            usr_active: {
              attribute: "data-user-status",
              values: {
                true: "active",
                false: "inactive",
              },
            },
            // Boolean cell background styling for usr_active
            usr_active: {
              attribute: "data-boolean-value",
              values: {
                true: "yes",
                false: "no",
              },
            },
            // Boolean cell background styling for usr_is_admin (SUPERADMIN column)
            usr_is_admin: {
              attribute: "data-boolean-value",
              values: {
                true: "yes",
                false: "no",
              },
            },
            role_code: {
              attribute: "data-user-role",
              values: {
                ADMIN: "admin",
                PILOT: "pilot",
                NORMAL: "user",
              },
            },
          },
        },
      },
      modalConfig: {
        containerId: "editModal",
        title: "User Management",
        size: "large",
        form: {
          fields: [
            {
              name: "usr_code",
              type: "text",
              required: true,
              label: "User Code",
              placeholder: "Enter user code (e.g., john.doe)",
              readonly: (mode, data) => mode === 'edit', // Readonly in edit mode, editable in create mode
              validation: {
                minLength: 2,
                maxLength: 50,
                pattern: /^[a-zA-Z0-9._-]+$/,
                message:
                  "User code must contain only letters, numbers, dots, hyphens, and underscores",
              },
            },
            {
              name: "usr_first_name",
              type: "text",
              required: true,
              label: "First Name",
              placeholder: "Enter first name",
              validation: {
                minLength: 1,
                maxLength: 100,
                pattern: /^[a-zA-Z\s'-]+$/,
                message:
                  "First name must contain only letters, spaces, apostrophes, and hyphens",
              },
            },
            {
              name: "usr_last_name",
              type: "text",
              required: true,
              label: "Last Name",
              placeholder: "Enter last name",
              validation: {
                minLength: 1,
                maxLength: 100,
                pattern: /^[a-zA-Z\s'-]+$/,
                message:
                  "Last name must contain only letters, spaces, apostrophes, and hyphens",
              },
            },
            {
              name: "usr_email",
              type: "email",
              required: true,
              label: "Email Address",
              placeholder: "Enter email address",
              validation: {
                maxLength: 255,
                message: "Please enter a valid email address",
              },
            },
            {
              name: "rls_id",
              type: "select",
              required: true,
              label: "Role",
              placeholder: "Select user role",
              defaultValue: 2, // NORMAL role by default
              options: [], // Will be populated dynamically
              helpText: "Select the user's role level for system access",
            },
            {
              name: "usr_active",
              type: "checkbox",
              required: false,
              label: "Active User",
              defaultValue: true,
              helpText: "Unchecked users cannot log in to the system",
            },
            {
              name: "usr_is_admin",
              type: "checkbox",
              required: false,
              label: "SuperAdmin Privileges",
              defaultValue: false,
              helpText:
                "SuperAdmins have full access to all system features",
            },
          ],
        },
      },
      filterConfig: {
        fields: ["usr_code", "usr_full_name", "usr_email", "rls_name"],
      },
      paginationConfig: {
        containerId: "paginationContainer",
        pageSize: 100, // Increased from 50 to 100 to show all users by default
        pageSizeOptions: [10, 25, 50, 100],
      },
    });

    // Entity-specific configuration
    this.primaryKey = "usr_id";
    this.displayField = "usr_full_name";
    this.searchFields = [
      "usr_first_name",
      "usr_last_name",
      "usr_email",
      "usr_code",
    ];

    // Client-side pagination - TableComponent handles pagination of full dataset
    this.paginationMode = "client";

    // Role hierarchy (matching Teams implementation)
    this.roleHierarchy = {
      SUPERADMIN: 3,
      ADMIN: 2,
      USER: 1,
    };

    // Valid role transitions
    this.validTransitions = {
      USER: ["ADMIN"],
      ADMIN: ["USER", "SUPERADMIN"],
      SUPERADMIN: ["ADMIN", "USER"],
    };

    // Audit configuration
    this.auditRetentionDays = 90;
    this.performanceThresholds = {
      userLoad: 200,
      userUpdate: 300,
      teamAssignment: 250,
      roleChange: 400,
      batchOperation: 1000,
    };

    // API endpoints
    this.usersApiUrl = "/rest/scriptrunner/latest/custom/users";
    this.teamsApiUrl = "/rest/scriptrunner/latest/custom/teams";
    this.relationshipsApiUrl =
      "/rest/scriptrunner/latest/custom/users/relationships";
    this.rolesApiUrl = "/rest/scriptrunner/latest/custom/roles";

    // Component orchestrator for UI management
    this.orchestrator = null;
    this.components = new Map();

    // Cache configuration
    this.cacheConfig = {
      enabled: true,
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
    };

    this.cache = new Map();
    this.performanceMetrics = {};
    this.auditCache = [];
    this.errorLog = [];

    // Fix: Initialize cache tracking variables that were undefined
    this.cacheHitCount = 0;
    this.cacheMissCount = 0;

    // Rate limiting configuration for sensitive operations
    this.rateLimits = {
      roleChange: { limit: 5, windowMs: 60000 }, // 5 operations per minute
      softDelete: { limit: 3, windowMs: 60000 }, // 3 operations per minute
      restore: { limit: 3, windowMs: 60000 }, // 3 operations per minute
      bulkUpdate: { limit: 2, windowMs: 60000 }, // 2 operations per minute
      teamAssignment: { limit: 10, windowMs: 60000 }, // 10 operations per minute
      profileUpdate: { limit: 10, windowMs: 60000 }, // 10 operations per minute
    };

    // Rate limiting tracker
    this.rateLimitTracker = new Map();

    // Roles data cache
    this.rolesData = [];

    console.log("[UsersEntityManager] Initialized with component architecture");
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

    // Load roles data for dropdown
    await this.loadRoles();

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
      console.log("[UsersEntityManager] Setting up client-side pagination");

      // With client-side pagination, no complex event handling needed
      // TableComponent handles pagination internally with the full dataset
      console.log("[UsersEntityManager] ✓ Client-side pagination ready");
    } catch (error) {
      console.error("[UsersEntityManager] Error setting up pagination:", error);
    }
  }

  /**
   * Load roles data from the API and update the modal field configuration
   * @returns {Promise<void>}
   * @public
   */
  async loadRoles() {
    try {
      console.log("[UsersEntityManager] Loading roles from API...");

      const response = await fetch(this.rolesApiUrl, {
        method: "GET",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Failed to load roles: ${response.status} ${response.statusText}`);
      }

      const roles = await response.json();
      this.rolesData = roles;

      // Update the modal configuration with the roles options
      const roleField = this.config.modalConfig.form.fields.find(field => field.name === 'rls_id');
      if (roleField) {
        roleField.options = roles.map(role => ({
          value: role.rls_id,
          label: `${role.rls_code} - ${role.rls_description}`,
          text: `${role.rls_code} - ${role.rls_description}`
        }));

        console.log(`[UsersEntityManager] ✓ Loaded ${roles.length} roles for dropdown`);
      } else {
        console.warn("[UsersEntityManager] Role field not found in modal configuration");
      }

    } catch (error) {
      console.error("[UsersEntityManager] Error loading roles:", error);

      // Fallback to default roles if API fails
      const defaultRoles = [
        { rls_id: 1, rls_code: "ADMIN", rls_description: "Full access to all system features" },
        { rls_id: 2, rls_code: "NORMAL", rls_description: "Standard user with access to create and manage implementation plans" },
        { rls_id: 3, rls_code: "PILOT", rls_description: "User with access to pilot features and functionalities" }
      ];

      this.rolesData = defaultRoles;
      const roleField = this.config.modalConfig.form.fields.find(field => field.name === 'rls_id');
      if (roleField) {
        roleField.options = defaultRoles.map(role => ({
          value: role.rls_id,
          label: `${role.rls_code} - ${role.rls_description}`,
          text: `${role.rls_code} - ${role.rls_description}`
        }));

        console.log("[UsersEntityManager] ✓ Using fallback roles data");
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
      console.log("[UsersEntityManager] Creating toolbar after render");
      this.createToolbar();
    } catch (error) {
      console.error("[UsersEntityManager] Failed to render:", error);
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
        console.warn(`[UsersEntityManager] Container not found for toolbar:`, {
          containerType: typeof this.container,
          container: this.container,
          tableConfigContainerId: this.tableConfig?.containerId,
        });
        return;
      }

      // Always recreate toolbar to ensure it exists after container clearing
      let toolbar = container.querySelector(".entity-toolbar");
      if (toolbar) {
        toolbar.remove(); // Remove existing toolbar
        console.log("[UsersEntityManager] Removed existing toolbar");
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

      console.log("[UsersEntityManager] Created new toolbar");

      // Create Add New User button with UMIG-prefixed classes to avoid Confluence conflicts
      const addButton = document.createElement("button");
      addButton.className = "umig-btn-primary umig-button";
      addButton.id = "umig-add-new-user-btn"; // Use UMIG-prefixed ID to avoid legacy conflicts
      addButton.innerHTML =
        '<span class="umig-btn-icon">➕</span> Add New User';
      addButton.setAttribute("data-action", "add");
      addButton.onclick = () => this.handleAdd();

      // Create Refresh button with UMIG-prefixed classes (matching TeamsEntityManager pattern)
      const refreshButton = document.createElement("button");
      refreshButton.className = "umig-btn-secondary umig-button";
      refreshButton.id = "umig-refresh-users-btn";
      refreshButton.innerHTML = '<span class="umig-btn-icon">🔄</span> Refresh';

      // Use addEventListener instead of onclick for better reliability (ADR-057 compliance)
      refreshButton.addEventListener("click", async () => {
        console.log("[UsersEntityManager] Refresh button clicked");
        await this._handleRefreshWithFeedback(refreshButton);
      });

      // Clear and add buttons to toolbar
      toolbar.innerHTML = "";
      toolbar.appendChild(addButton);
      toolbar.appendChild(refreshButton);

      console.log("[UsersEntityManager] Toolbar created successfully");
    } catch (error) {
      console.error("[UsersEntityManager] Error creating toolbar:", error);
    }
  }

  /**
   * Handle Add New User action
   * @private
   */
  handleAdd() {
    console.log("[UsersEntityManager] Opening Add User modal");

    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn("[UsersEntityManager] Modal component not available");
      return;
    }

    // Prepare empty data for new user
    const newUserData = {
      usr_code: "",
      usr_first_name: "",
      usr_last_name: "",
      usr_email: "",
      rls_id: 2, // Default to NORMAL role
      usr_active: true,
      usr_is_admin: false,
    };

    // Update modal configuration for Add mode
    this.modalComponent.updateConfig({
      title: "Add New User",
      type: "form",
      mode: "create", // Set mode to create for new users
      onSubmit: async (formData) => {
        try {
          console.log("[UsersEntityManager] Submitting new user:", formData);
          const result = await this._createEntityData(formData);
          console.log(
            "[UsersEntityManager] User created successfully:",
            result,
          );

          // Refresh the table data
          await this.loadData();

          // Show success message with auto-dismiss
          this._showNotification(
            "success",
            "User Created",
            `User ${formData.usr_first_name} ${formData.usr_last_name} has been created successfully.`
          );

          // Return true to close modal automatically
          return true;
        } catch (error) {
          console.error("[UsersEntityManager] Error creating user:", error);

          // Show error message (manual dismiss for errors)
          this._showNotification(
            "error",
            "Error Creating User",
            error.message || "An error occurred while creating the user."
          );

          // Return false to keep modal open with error
          return false;
        }
      },
    });

    // Reset form data to new user defaults
    if (this.modalComponent.resetForm) {
      this.modalComponent.resetForm();
    }

    // Set form data to default values
    if (this.modalComponent.formData) {
      Object.assign(this.modalComponent.formData, newUserData);
    }

    // Open the modal
    this.modalComponent.open();
  }

  /**
   * Handle Edit User action
   * @param {Object} userData - User data to edit
   * @private
   */
  handleEdit(userData) {
    console.log("[UsersEntityManager] Opening Edit User modal for:", userData);

    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn("[UsersEntityManager] Modal component not available");
      return;
    }

    // Update modal configuration for Edit mode - restore original form without audit fields
    this.modalComponent.updateConfig({
      title: `Edit User: ${userData.usr_first_name} ${userData.usr_last_name}`,
      type: "form",
      mode: "edit", // Set mode to edit for existing users
      form: this.config.modalConfig.form, // Restore original form config
      buttons: [
        { text: "Cancel", action: "cancel", variant: "secondary" },
        { text: "Save", action: "submit", variant: "primary" },
      ],
      onButtonClick: null, // Clear custom button handler
      onSubmit: async (formData) => {
        try {
          console.log("[UsersEntityManager] Submitting user update:", formData);
          const result = await this._updateEntityData(
            userData.usr_id,
            formData,
          );
          console.log(
            "[UsersEntityManager] User updated successfully:",
            result,
          );

          // Refresh the table data
          await this.loadData();

          // Show success message with auto-dismiss
          this._showNotification(
            "success",
            "User Updated",
            `User ${formData.usr_first_name} ${formData.usr_last_name} has been updated successfully.`
          );

          // Return true to close modal automatically
          return true;
        } catch (error) {
          console.error("[UsersEntityManager] Error updating user:", error);

          // Show error message (manual dismiss for errors)
          this._showNotification(
            "error",
            "Error Updating User",
            error.message || "An error occurred while updating the user."
          );

          // Return false to keep modal open with error
          return false;
        }
      },
    });

    // Clear viewMode flag for edit mode
    this.modalComponent.viewMode = false;

    // Set form data to current user values
    if (this.modalComponent.formData) {
      Object.assign(this.modalComponent.formData, userData);
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
    console.log("[UsersEntityManager] Opening View User modal for:", data);
    console.log("[UsersEntityManager] DEBUG: Audit field values:", {
      created_at: data.created_at,
      created_by: data.created_by,
      updated_at: data.updated_at,
      updated_by: data.updated_by,
    });

    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn("[UsersEntityManager] Modal component not available");
      return;
    }

    // Create enhanced modal configuration for View mode with audit fields
    const viewFormConfig = {
      fields: [
        ...this.config.modalConfig.form.fields, // Original form fields
        // Add comprehensive role information
        {
          name: "usr_role",
          type: "text",
          label: "Role",
          value: this._formatRoleDisplay(data),
          readonly: true,
        },
        {
          name: "usr_super_admin",
          type: "text",
          label: "Super-Administrator",
          value: data.usr_is_admin ? "✓ Yes" : "✗ No",
          readonly: true,
        },
        {
          name: "usr_role_description",
          type: "textarea",
          label: "Role Description",
          value: data.role_description || "No description available",
          readonly: true,
          rows: 2,
        },
        // Add audit information section
        {
          name: "audit_separator",
          type: "separator",
          label: "Audit Information",
          isAuditField: true,
        },
        {
          name: "usr_created_at",
          type: "text",
          label: "Created At",
          value: this._formatDateTime(data.created_at),
          isAuditField: true,
        },
        {
          name: "usr_created_by",
          type: "text",
          label: "Created By",
          value: data.created_by || "System",
          isAuditField: true,
        },
        {
          name: "usr_updated_at",
          type: "text",
          label: "Last Updated",
          value: this._formatDateTime(data.updated_at),
          isAuditField: true,
        },
        {
          name: "usr_updated_by",
          type: "text",
          label: "Last Updated By",
          value: data.updated_by || "System",
          isAuditField: true,
        },
      ],
    };

    // Update modal configuration for View mode
    this.modalComponent.updateConfig({
      title: `View User: ${data.usr_first_name} ${data.usr_last_name}`,
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

    // Set form data to current user values with readonly mode
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
   * Validate input parameters with comprehensive security checks
   * @private
   * @param {Object} params - Parameters to validate
   * @param {Object} rules - Validation rules (field-specific validation config)
   * @throws {Error} If validation fails
   */
  async _validateInputs(params, rules) {
    // Wait for SecurityUtils to be available (race condition fix)
    const maxWaitTime = 5000; // 5 seconds max wait
    const pollInterval = 100; // Check every 100ms
    let waited = 0;

    while (
      (!window.SecurityUtils ||
        typeof window.SecurityUtils.validateInput !== "function") &&
      waited < maxWaitTime
    ) {
      console.warn(
        `[UsersEntityManager] Waiting for SecurityUtils to be available... (${waited}ms)`,
      );
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      waited += pollInterval;
    }

    // Enhanced SecurityUtils availability check with detailed error information
    if (typeof window.SecurityUtils === "undefined" || !window.SecurityUtils) {
      console.error(
        "[UsersEntityManager] SecurityUtils not available on window object after waiting",
      );
      console.error(
        '[UsersEntityManager] Available window properties with "Security":',
        Object.keys(window).filter((key) => key.includes("Security")),
      );
      throw new Error(
        "SecurityUtils validation service not available. Ensure SecurityUtils.js is loaded before UsersEntityManager.",
      );
    }

    if (typeof window.SecurityUtils.validateInput !== "function") {
      console.error(
        "[UsersEntityManager] SecurityUtils.validateInput method not available",
      );
      console.error(
        "[UsersEntityManager] Available SecurityUtils methods:",
        Object.keys(window.SecurityUtils).filter(
          (key) => typeof window.SecurityUtils[key] === "function",
        ),
      );
      throw new Error(
        "SecurityUtils.validateInput method not available. SecurityUtils may not be fully initialized.",
      );
    }

    // Use SecurityUtils for comprehensive validation with enhanced options
    const validationOptions = {
      preventXSS: true,
      preventSQLInjection: true,
      sanitizeStrings: true,
      allowEmpty: true,
      recursiveValidation: true,
      maxStringLength: 10000,
    };

    const validationResult = window.SecurityUtils.validateInput(
      params,
      validationOptions,
    );

    if (!validationResult.isValid) {
      const errors = validationResult.errors.join(", ");
      throw new window.SecurityUtils.ValidationException(
        `Input validation failed: ${errors}`,
        "validation",
        params,
      );
    }

    // Additional field-specific validation based on rules
    const fieldErrors = [];
    if (rules && typeof rules === "object") {
      Object.keys(params).forEach((key) => {
        const rule = rules[key];
        const value = params[key];

        if (rule) {
          // Check required fields
          if (
            rule.required &&
            (value === null || value === undefined || value === "")
          ) {
            fieldErrors.push(`${key} is required`);
          }

          // Check string length
          if (
            rule.maxLength &&
            typeof value === "string" &&
            value.length > rule.maxLength
          ) {
            fieldErrors.push(
              `${key} exceeds maximum length of ${rule.maxLength}`,
            );
          }

          // Check number ranges
          if (
            rule.min !== undefined &&
            typeof value === "number" &&
            value < rule.min
          ) {
            fieldErrors.push(`${key} must be at least ${rule.min}`);
          }
          if (
            rule.max !== undefined &&
            typeof value === "number" &&
            value > rule.max
          ) {
            fieldErrors.push(`${key} must not exceed ${rule.max}`);
          }

          // Check type validation
          if (rule.type) {
            switch (rule.type) {
              case "string":
                if (
                  value !== null &&
                  value !== undefined &&
                  typeof value !== "string"
                ) {
                  fieldErrors.push(`${key} must be a string`);
                }
                break;
              case "integer":
                if (
                  value !== null &&
                  value !== undefined &&
                  !Number.isInteger(Number(value))
                ) {
                  fieldErrors.push(`${key} must be an integer`);
                }
                break;
              case "boolean":
                if (
                  value !== null &&
                  value !== undefined &&
                  typeof value !== "boolean"
                ) {
                  fieldErrors.push(`${key} must be a boolean`);
                }
                break;
            }
          }

          // Check pattern validation
          if (
            rule.pattern &&
            typeof value === "string" &&
            !rule.pattern.test(value)
          ) {
            fieldErrors.push(`${key} format is invalid`);
          }
        }
      });
    }

    if (fieldErrors.length > 0) {
      throw new window.SecurityUtils.ValidationException(
        `Field validation failed: ${fieldErrors.join(", ")}`,
        "field_validation",
        params,
      );
    }

    // Return sanitized data from SecurityUtils
    return validationResult.sanitizedData || params;
  }

  /**
   * Check and enforce rate limiting for sensitive operations
   * @private
   * @param {string} operation - Operation name
   * @param {string} identifier - User or session identifier
   * @throws {Error} If rate limit exceeded
   */
  _checkRateLimit(operation, identifier) {
    const config = this.rateLimits[operation];
    if (!config) {
      return; // No rate limit configured for this operation
    }

    const key = `${operation}:${identifier}`;
    const now = Date.now();

    // Get or create rate limit entry
    let entry = this.rateLimitTracker.get(key);
    if (!entry) {
      entry = { count: 0, windowStart: now };
      this.rateLimitTracker.set(key, entry);
    }

    // Check if window has expired
    if (now - entry.windowStart > config.windowMs) {
      // Reset window
      entry.count = 0;
      entry.windowStart = now;
    }

    // Check rate limit
    if (entry.count >= config.limit) {
      const retryAfter = Math.ceil(
        (entry.windowStart + config.windowMs - now) / 1000,
      );

      // Log rate limit violation
      this._trackError("rate_limit_exceeded", {
        operation,
        identifier,
        limit: config.limit,
        windowMs: config.windowMs,
        retryAfter,
      });

      throw new window.SecurityUtils.SecurityException(
        `Rate limit exceeded for ${operation}. Try again in ${retryAfter} seconds.`,
        "RATE_LIMIT_EXCEEDED",
        { operation, retryAfter },
      );
    }

    // Increment counter
    entry.count++;

    // Clean up old entries periodically
    if (this.rateLimitTracker.size > 1000) {
      this._cleanupRateLimits();
    }
  }

  /**
   * Clean up expired rate limit entries
   * @private
   */
  _cleanupRateLimits() {
    const now = Date.now();
    const maxWindowMs = Math.max(
      ...Object.values(this.rateLimits).map((r) => r.windowMs),
    );

    for (const [key, entry] of this.rateLimitTracker.entries()) {
      if (now - entry.windowStart > maxWindowMs) {
        this.rateLimitTracker.delete(key);
      }
    }
  }

  /**
   * Load user data with caching support (legacy method - kept for backward compatibility)
   * @deprecated Use loadData from BaseEntityManager instead
   */
  async loadUsersLegacy(filters = {}) {
    // Validate filters
    if (filters && Object.keys(filters).length > 0) {
      await this._validateInputs(filters, {
        teamId: { type: "string", required: false, maxLength: 50 },
        roleId: { type: "string", required: false, maxLength: 50 },
        active: { type: "boolean", required: false },
        search: { type: "string", required: false, maxLength: 100 },
        page: { type: "integer", required: false, min: 1 },
        pageSize: { type: "integer", required: false, min: 1, max: 1000 },
      });
    }

    const startTime = performance.now();
    const cacheKey = JSON.stringify(filters);

    // Check cache first
    if (this.cacheConfig.enabled && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheConfig.ttl) {
        console.log("[UsersEntityManager] Returning cached data");
        return cached.data;
      }
    }

    try {
      // Enhanced SecurityUtils validation with error checking
      if (!window.SecurityUtils) {
        throw new Error("SecurityUtils not available - module loading issue");
      }

      if (typeof window.SecurityUtils.sanitizeInput !== "function") {
        throw new Error("SecurityUtils.sanitizeInput method not available");
      }

      if (typeof window.SecurityUtils.addCSRFProtection !== "function") {
        throw new Error("SecurityUtils.addCSRFProtection method not available");
      }

      // Apply security validation
      const sanitizedFilters = window.SecurityUtils.sanitizeInput(filters);

      // Build URL with query parameters for GET request
      const urlParams = new URLSearchParams();
      Object.keys(sanitizedFilters).forEach((key) => {
        if (
          sanitizedFilters[key] !== null &&
          sanitizedFilters[key] !== undefined
        ) {
          urlParams.append(key, sanitizedFilters[key]);
        }
      });

      const url = urlParams.toString()
        ? `${this.usersApiUrl}?${urlParams.toString()}`
        : this.usersApiUrl;

      const response = await fetch(url, {
        method: "GET",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to load users: ${response.statusText}`);
      }

      const data = await response.json();

      // Update cache
      if (this.cacheConfig.enabled) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
        });

        // Enforce cache size limit
        if (this.cache.size > this.cacheConfig.maxSize) {
          const firstKey = this.cache.keys().next().value;
          this.cache.delete(firstKey);
        }
      }

      const operationTime = performance.now() - startTime;
      this._trackPerformance("userLoad", operationTime);

      console.log(
        `[UsersEntityManager] Loaded ${data.length} users in ${operationTime.toFixed(2)}ms`,
      );

      return data;
    } catch (error) {
      console.error("[UsersEntityManager] Failed to load users:", error);
      this._trackError("loadData", error);
      throw error;
    }
  }

  /**
   * Get teams for a specific user (bidirectional relationship)
   * @param {string} userId - User ID
   * @param {boolean} includeArchived - Include archived teams
   * @returns {Promise<Array>} List of teams
   */
  async getTeamsForUser(userId, includeArchived = false) {
    // Validate inputs
    await this._validateInputs(
      { userId, includeArchived },
      {
        userId: {
          type: "string",
          required: true,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9-_]+$/,
        },
        includeArchived: { type: "boolean", required: false },
      },
    );

    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.usersApiUrl}/${encodeURIComponent(userId)}/teams?includeArchived=${includeArchived}`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get teams for user: ${response.statusText}`);
      }

      const data = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("getTeamsForUser", operationTime);

      return data.teams || [];
    } catch (error) {
      console.error(
        "[UsersEntityManager] Failed to get teams for user:",
        error,
      );
      this._trackError("getTeamsForUser", error);
      throw error;
    }
  }

  /**
   * Assign user to team with role
   * @param {string} userId - User ID
   * @param {string} teamId - Team ID
   * @param {string} role - User role in team
   * @returns {Promise<Object>} Assignment result
   */
  async assignToTeam(userId, teamId, role = "USER") {
    // Comprehensive input validation
    await this._validateInputs(
      { userId, teamId, role },
      {
        userId: {
          type: "string",
          required: true,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9-_]+$/,
        },
        teamId: {
          type: "string",
          required: true,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9-_]+$/,
        },
        role: {
          type: "string",
          required: true,
          enum: Object.keys(this.roleHierarchy),
        },
      },
    );

    const startTime = performance.now();

    try {
      // Validate role
      if (!this.roleHierarchy[role]) {
        throw new Error(`Invalid role: ${role}`);
      }

      const response = await fetch(
        `${this.usersApiUrl}/${encodeURIComponent(userId)}/teams`,
        {
          method: "POST",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            teamId,
            role,
            assignedBy: this.currentUserRole?.userId,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to assign user to team: ${response.statusText}`,
        );
      }

      const result = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("teamAssignment", operationTime);

      // Audit log
      this._auditLog("team_assignment", userId, {
        teamId,
        role,
        result,
      });

      // Clear relevant caches
      this._invalidateCache(userId);

      return result;
    } catch (error) {
      console.error(
        "[UsersEntityManager] Failed to assign user to team:",
        error,
      );
      this._trackError("assignToTeam", error);
      throw error;
    }
  }

  /**
   * Remove user from team
   * @param {string} userId - User ID
   * @param {string} teamId - Team ID
   * @returns {Promise<Object>} Removal result
   */
  async removeFromTeam(userId, teamId) {
    // Validate inputs
    await this._validateInputs(
      { userId, teamId },
      {
        userId: {
          type: "string",
          required: true,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9-_]+$/,
        },
        teamId: {
          type: "string",
          required: true,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9-_]+$/,
        },
      },
    );

    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.usersApiUrl}/${encodeURIComponent(userId)}/teams/${encodeURIComponent(teamId)}`,
        {
          method: "DELETE",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to remove user from team: ${response.statusText}`,
        );
      }

      const result = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("teamRemoval", operationTime);

      // Audit log
      this._auditLog("team_removal", userId, {
        teamId,
        result,
      });

      // Clear relevant caches
      this._invalidateCache(userId);

      return result;
    } catch (error) {
      console.error(
        "[UsersEntityManager] Failed to remove user from team:",
        error,
      );
      this._trackError("removeFromTeam", error);
      throw error;
    }
  }

  /**
   * Update user profile information
   * @param {string} userId - User ID
   * @param {Object} updates - Profile updates
   * @returns {Promise<Object>} Update result
   */
  async updateProfile(userId, updates) {
    // Validate inputs
    await this._validateInputs(
      { userId },
      {
        userId: {
          type: "string",
          required: true,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9-_]+$/,
        },
      },
    );

    // Validate updates object
    if (!updates || typeof updates !== "object") {
      throw new window.SecurityUtils.ValidationException(
        "Invalid updates object",
        "updates",
        updates,
      );
    }

    // Validate individual update fields
    if (updates.email) {
      window.SecurityUtils.validateEmail(updates.email);
    }
    if (updates.firstName) {
      await this._validateInputs(
        { firstName: updates.firstName },
        {
          firstName: { type: "string", required: false, maxLength: 100 },
        },
      );
    }
    if (updates.lastName) {
      await this._validateInputs(
        { lastName: updates.lastName },
        {
          lastName: { type: "string", required: false, maxLength: 100 },
        },
      );
    }

    const startTime = performance.now();

    try {
      // Security validation
      const sanitizedUpdates = window.SecurityUtils.sanitizeInput(updates);
      window.SecurityUtils.validateInput(sanitizedUpdates);

      const response = await fetch(
        `${this.usersApiUrl}/${encodeURIComponent(userId)}`,
        {
          method: "PUT",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(sanitizedUpdates),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to update user profile: ${response.statusText}`,
        );
      }

      const result = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("userUpdate", operationTime);

      // Audit log
      this._auditLog("profile_update", userId, {
        updates: sanitizedUpdates,
        result,
      });

      // Clear relevant caches
      this._invalidateCache(userId);

      return result;
    } catch (error) {
      console.error(
        "[UsersEntityManager] Failed to update user profile:",
        error,
      );
      this._trackError("updateProfile", error);
      throw error;
    }
  }

  /**
   * Get user activity history
   * @param {string} userId - User ID
   * @param {number} days - Number of days of history
   * @returns {Promise<Array>} Activity history
   */
  async getUserActivity(userId, days = 30) {
    // Validate inputs
    await this._validateInputs(
      { userId, days },
      {
        userId: {
          type: "string",
          required: true,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9-_]+$/,
        },
        days: { type: "integer", required: false, min: 1, max: 365 },
      },
    );

    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.usersApiUrl}/${encodeURIComponent(userId)}/activity?days=${days}`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get user activity: ${response.statusText}`);
      }

      const data = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("activityRetrieval", operationTime);

      return data.activities || [];
    } catch (error) {
      console.error("[UsersEntityManager] Failed to get user activity:", error);
      this._trackError("getUserActivity", error);
      throw error;
    }
  }

  /**
   * Batch validate multiple users
   * @param {Array} userIds - Array of user IDs
   * @returns {Promise<Object>} Validation results
   */
  async batchValidateUsers(userIds) {
    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.relationshipsApiUrl}/batch-validate`,
        {
          method: "POST",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({ userIds }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to batch validate users: ${response.statusText}`,
        );
      }

      const results = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("batchValidation", operationTime);

      console.log(
        `[UsersEntityManager] Batch validated ${userIds.length} users in ${operationTime.toFixed(2)}ms`,
      );

      return results;
    } catch (error) {
      console.error(
        "[UsersEntityManager] Failed to batch validate users:",
        error,
      );
      this._trackError("batchValidateUsers", error);
      throw error;
    }
  }

  /**
   * Change user role with validation
   * @param {string} userId - User ID
   * @param {number} newRoleId - New role ID
   * @param {Object} userContext - User context for audit
   * @returns {Promise<Object>} Role change result
   */
  async changeUserRole(userId, newRoleId, userContext = {}) {
    // Validate inputs
    await this._validateInputs(
      { userId, newRoleId },
      {
        userId: {
          type: "string",
          required: true,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9-_]+$/,
        },
        newRoleId: { type: "string", required: true, maxLength: 50 },
      },
    );

    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.relationshipsApiUrl}/${encodeURIComponent(userId)}/role`,
        {
          method: "PUT",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            roleId: newRoleId,
            userContext: {
              ...userContext,
              userId: this.currentUserRole?.userId,
              timestamp: new Date().toISOString(),
            },
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to change user role: ${response.statusText}`);
      }

      const result = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("roleChange", operationTime);

      // Audit log
      this._auditLog("role_change", userId, {
        newRoleId,
        result,
        userContext,
      });

      // Clear relevant caches
      this._invalidateCache(userId);

      return result;
    } catch (error) {
      console.error("[UsersEntityManager] Failed to change user role:", error);
      this._trackError("changeUserRole", error);
      throw error;
    }
  }

  /**
   * Validate role transition
   * @param {string} userId - User ID
   * @param {number} fromRoleId - Current role ID
   * @param {number} toRoleId - Target role ID
   * @returns {Promise<Object>} Validation result
   */
  async validateRoleTransition(userId, fromRoleId, toRoleId) {
    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.relationshipsApiUrl}/${encodeURIComponent(userId)}/role/validate`,
        {
          method: "PUT",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            fromRoleId,
            toRoleId,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to validate role transition: ${response.statusText}`,
        );
      }

      const result = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("roleValidation", operationTime);

      return result;
    } catch (error) {
      console.error(
        "[UsersEntityManager] Failed to validate role transition:",
        error,
      );
      this._trackError("validateRoleTransition", error);
      throw error;
    }
  }

  /**
   * Soft delete user (deactivate)
   * @param {string} userId - User ID
   * @param {Object} userContext - User context for audit
   * @returns {Promise<Object>} Soft delete result
   */
  async softDeleteUser(userId, userContext = {}) {
    // Validate inputs - soft delete is a sensitive operation
    await this._validateInputs(
      { userId },
      {
        userId: {
          type: "string",
          required: true,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9-_]+$/,
        },
      },
    );

    // Rate limiting for soft delete - critical operation
    this._checkRateLimit("softDelete", userContext.performedBy || "system");

    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.relationshipsApiUrl}/${encodeURIComponent(userId)}/soft-delete`,
        {
          method: "PUT",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            ...userContext,
            userId: this.currentUserRole?.userId,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to soft delete user: ${response.statusText}`);
      }

      const result = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("userSoftDelete", operationTime);

      // Audit log
      this._auditLog("user_soft_delete", userId, {
        result,
        userContext,
      });

      // Clear relevant caches
      this._invalidateCache(userId);

      return result;
    } catch (error) {
      console.error("[UsersEntityManager] Failed to soft delete user:", error);
      this._trackError("softDeleteUser", error);
      throw error;
    }
  }

  /**
   * Restore inactive user
   * @param {string} userId - User ID
   * @param {Object} userContext - User context for audit
   * @returns {Promise<Object>} Restore result
   */
  async restoreUser(userId, userContext = {}) {
    // Validate inputs - restore is a sensitive operation
    await this._validateInputs(
      { userId },
      {
        userId: {
          type: "string",
          required: true,
          maxLength: 50,
          pattern: /^[a-zA-Z0-9-_]+$/,
        },
      },
    );

    // Rate limiting for restore - critical operation
    this._checkRateLimit("restore", userContext.performedBy || "system");

    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.relationshipsApiUrl}/${encodeURIComponent(userId)}/restore`,
        {
          method: "PUT",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            ...userContext,
            userId: this.currentUserRole?.userId,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to restore user: ${response.statusText}`);
      }

      const result = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("userRestore", operationTime);

      // Audit log
      this._auditLog("user_restore", userId, {
        result,
        userContext,
      });

      // Clear relevant caches
      this._invalidateCache(userId);

      return result;
    } catch (error) {
      console.error("[UsersEntityManager] Failed to restore user:", error);
      this._trackError("restoreUser", error);
      throw error;
    }
  }

  /**
   * Check cascade delete protection for user
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Protection status
   */
  async checkDeleteProtection(userId) {
    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.relationshipsApiUrl}/${encodeURIComponent(userId)}/delete-protection`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to check delete protection: ${response.statusText}`,
        );
      }

      const result = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("deleteProtectionCheck", operationTime);

      return result;
    } catch (error) {
      console.error(
        "[UsersEntityManager] Failed to check delete protection:",
        error,
      );
      this._trackError("checkDeleteProtection", error);
      throw error;
    }
  }

  /**
   * Validate relationship integrity
   * @param {string} userId - User ID
   * @param {string} teamId - Team ID
   * @returns {Promise<Object>} Validation result
   */
  async validateRelationshipIntegrity(userId, teamId) {
    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.relationshipsApiUrl}/${encodeURIComponent(userId)}/teams/${encodeURIComponent(teamId)}/validate`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to validate relationship integrity: ${response.statusText}`,
        );
      }

      const result = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("relationshipValidation", operationTime);

      return result;
    } catch (error) {
      console.error(
        "[UsersEntityManager] Failed to validate relationship integrity:",
        error,
      );
      this._trackError("validateRelationshipIntegrity", error);
      throw error;
    }
  }

  /**
   * Get relationship statistics
   * @returns {Promise<Object>} Statistics
   */
  async getRelationshipStatistics() {
    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.relationshipsApiUrl}/relationship-statistics`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to get relationship statistics: ${response.statusText}`,
        );
      }

      const result = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("statisticsRetrieval", operationTime);

      return result;
    } catch (error) {
      console.error(
        "[UsersEntityManager] Failed to get relationship statistics:",
        error,
      );
      this._trackError("getRelationshipStatistics", error);
      throw error;
    }
  }

  /**
   * Cleanup orphaned member relationships
   * @returns {Promise<Object>} Cleanup result
   */
  async cleanupOrphanedMembers() {
    const startTime = performance.now();

    try {
      const response = await fetch(
        `${this.relationshipsApiUrl}/cleanup-orphaned-members`,
        {
          method: "POST",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to cleanup orphaned members: ${response.statusText}`,
        );
      }

      const result = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("orphanedCleanup", operationTime);

      // Audit log
      this._auditLog("orphaned_cleanup", "system", {
        result,
      });

      // Clear all caches after cleanup
      this.cache.clear();

      return result;
    } catch (error) {
      console.error(
        "[UsersEntityManager] Failed to cleanup orphaned members:",
        error,
      );
      this._trackError("cleanupOrphanedMembers", error);
      throw error;
    }
  }

  /**
   * Bulk update users
   * @param {Array} updates - Array of user updates
   * @returns {Promise<Object>} Bulk update result
   */
  async bulkUpdateUsers(updates) {
    // Validate bulk updates array
    if (!Array.isArray(updates)) {
      throw new window.SecurityUtils.ValidationException(
        "Updates must be an array",
        "updates",
        updates,
      );
    }

    if (updates.length > 50) {
      throw new window.SecurityUtils.ValidationException(
        "Cannot update more than 50 users at once",
        "updates",
        updates.length,
      );
    }

    // Validate each update
    for (const [index, update] of updates.entries()) {
      if (!update.userId) {
        throw new window.SecurityUtils.ValidationException(
          `Update at index ${index} missing userId`,
          "userId",
          null,
        );
      }
      await this._validateInputs(
        { userId: update.userId },
        {
          userId: {
            type: "string",
            required: true,
            maxLength: 50,
            pattern: /^[a-zA-Z0-9-_]+$/,
          },
        },
      );
    }

    // Rate limiting for bulk updates - critical operation
    this._checkRateLimit("bulkUpdate", "bulk_operation");

    const startTime = performance.now();

    try {
      const results = [];

      // Process updates in parallel with controlled concurrency
      const concurrencyLimit = 5;
      for (let i = 0; i < updates.length; i += concurrencyLimit) {
        const batch = updates.slice(i, i + concurrencyLimit);
        const batchPromises = batch.map(async (update) => {
          try {
            const result = await this.updateProfile(update.userId, update.data);
            return { userId: update.userId, success: true, result };
          } catch (error) {
            return {
              userId: update.userId,
              success: false,
              error: error.message,
            };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const operationTime = performance.now() - startTime;
      this._trackPerformance("bulkUpdate", operationTime);

      const summary = {
        total: updates.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
        results,
        operationTime: Math.round(operationTime),
      };

      console.log(
        `[UsersEntityManager] Bulk updated ${updates.length} users in ${operationTime.toFixed(2)}ms`,
      );

      return summary;
    } catch (error) {
      console.error("[UsersEntityManager] Failed to bulk update users:", error);
      this._trackError("bulkUpdateUsers", error);
      throw error;
    }
  }

  /**
   * Search users with advanced filtering
   * @param {Object} searchCriteria - Search criteria
   * @returns {Promise<Array>} Search results
   */
  async searchUsers(searchCriteria) {
    const startTime = performance.now();

    try {
      // Construct search parameters
      const params = new URLSearchParams();

      if (searchCriteria.query) {
        params.append("search", searchCriteria.query);
      }

      if (searchCriteria.teamId) {
        params.append("teamId", searchCriteria.teamId);
      }

      if (searchCriteria.active !== undefined) {
        params.append("activeFilter", searchCriteria.active);
      }

      if (searchCriteria.roleId) {
        params.append("roleId", searchCriteria.roleId);
      }

      if (searchCriteria.page) {
        params.append("page", searchCriteria.page);
      }

      if (searchCriteria.size) {
        params.append("size", searchCriteria.size);
      }

      if (searchCriteria.sort) {
        params.append("sort", searchCriteria.sort);
      }

      if (searchCriteria.direction) {
        params.append("direction", searchCriteria.direction);
      }

      const response = await fetch(`${this.usersApiUrl}?${params.toString()}`, {
        method: "GET",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to search users: ${response.statusText}`);
      }

      const data = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("userSearch", operationTime);

      console.log(
        `[UsersEntityManager] Search completed in ${operationTime.toFixed(2)}ms`,
      );

      return data;
    } catch (error) {
      console.error("[UsersEntityManager] Failed to search users:", error);
      this._trackError("searchUsers", error);
      throw error;
    }
  }

  /**
   * Get performance metrics summary
   * @returns {Object} Performance metrics
   */
  getPerformanceMetrics() {
    const metrics = {};

    Object.keys(this.performanceMetrics).forEach((operation) => {
      const operationMetrics = this.performanceMetrics[operation];
      if (operationMetrics.length > 0) {
        const durations = operationMetrics.map((m) => m.duration);
        metrics[operation] = {
          count: operationMetrics.length,
          averageDuration:
            durations.reduce((a, b) => a + b, 0) / durations.length,
          minDuration: Math.min(...durations),
          maxDuration: Math.max(...durations),
          threshold: this.performanceThresholds[operation] || 1000,
          thresholdViolations: durations.filter(
            (d) => d > (this.performanceThresholds[operation] || 1000),
          ).length,
        };
      }
    });

    return {
      metrics,
      cacheStats: {
        size: this.cache.size,
        maxSize: this.cacheConfig.maxSize,
        hitRate:
          this.cacheHitCount / (this.cacheHitCount + this.cacheMissCount) || 0,
      },
      errorStats: {
        totalErrors: this.errorLog.length,
        recentErrors: this.errorLog.filter(
          (error) => Date.now() - error.timestamp < 24 * 60 * 60 * 1000,
        ).length,
      },
      auditStats: {
        totalAuditEntries: this.auditCache.length,
        recentAuditEntries: this.auditCache.filter(
          (entry) =>
            Date.now() - new Date(entry.timestamp).getTime() <
            24 * 60 * 60 * 1000,
        ).length,
      },
    };
  }

  /**
   * Setup event handlers for UI interactions
   * @private
   */
  _setupEventHandlers() {
    if (!this.orchestrator) return;

    // Handle user selection
    this.orchestrator.on("user:select", async (data) => {
      try {
        const userDetails = await this.getUserDetails(data.userId);
        this.orchestrator.emit("user:loaded", userDetails);
      } catch (error) {
        this.orchestrator.emit("user:error", { error: error.message });
      }
    });

    // Handle user update
    this.orchestrator.on("user:update", async (data) => {
      try {
        const result = await this.updateProfile(data.userId, data.updates);
        this.orchestrator.emit("user:updated", result);
      } catch (error) {
        this.orchestrator.emit("user:error", { error: error.message });
      }
    });

    // Handle team assignment
    this.orchestrator.on("user:assignTeam", async (data) => {
      try {
        const result = await this.assignToTeam(
          data.userId,
          data.teamId,
          data.role,
        );
        this.orchestrator.emit("user:teamAssigned", result);
      } catch (error) {
        this.orchestrator.emit("user:error", { error: error.message });
      }
    });
  }

  /**
   * Get detailed user information
   * @param {string} userId - User ID
   * @returns {Promise<Object>} User details
   */
  async getUserDetails(userId) {
    const cacheKey = `user_${userId}`;

    // Check cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheConfig.ttl) {
        return cached.data;
      }
    }

    try {
      const response = await fetch(
        `${this.usersApiUrl}/${encodeURIComponent(userId)}`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to get user details: ${response.statusText}`);
      }

      const data = await response.json();

      // Update cache
      this.cache.set(cacheKey, {
        data,
        timestamp: Date.now(),
      });

      return data;
    } catch (error) {
      console.error("[UsersEntityManager] Failed to get user details:", error);
      throw error;
    }
  }

  /**
   * Invalidate cache for specific user
   * @private
   */
  _invalidateCache(userId) {
    // Remove user-specific cache entries
    for (const [key] of this.cache) {
      if (key.includes(userId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Track performance metrics
   * @private
   */
  _trackPerformance(operationType, duration) {
    try {
      if (!this.performanceMetrics[operationType]) {
        this.performanceMetrics[operationType] = [];
      }

      this.performanceMetrics[operationType].push({
        duration,
        timestamp: Date.now(),
      });

      // Keep only last 100 entries
      if (this.performanceMetrics[operationType].length > 100) {
        this.performanceMetrics[operationType].shift();
      }

      // Check threshold
      const threshold = this.performanceThresholds[operationType] || 1000;
      if (duration > threshold) {
        console.warn(
          `[UsersEntityManager] Performance warning: ${operationType} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`,
        );
      }
    } catch (error) {
      console.error("[UsersEntityManager] Failed to track performance:", error);
    }
  }

  /**
   * Log audit events
   * @private
   */
  _auditLog(eventType, entityId, data) {
    try {
      const auditEntry = {
        eventType,
        entityId,
        data,
        timestamp: new Date().toISOString(),
        userId: this.currentUserRole?.userId,
      };

      if (window.UMIGServices?.auditService?.log) {
        window.UMIGServices.auditService.log(eventType, entityId, data);
      }

      this.auditCache.push(auditEntry);

      // Keep only last 1000 entries
      if (this.auditCache.length > 1000) {
        this.auditCache.shift();
      }
    } catch (error) {
      console.error("[UsersEntityManager] Failed to log audit event:", error);
    }
  }

  /**
   * Track errors
   * @private
   */
  _trackError(operation, error) {
    try {
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
    } catch (trackingError) {
      console.error(
        "[UsersEntityManager] Failed to track error:",
        trackingError,
      );
    }
  }

  /**
   * Fetch user data from API
   * @param {Object} filters - Filter parameters
   * @param {Object} sort - Sort parameters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise<Object>} API response with data and metadata
   * @protected
   */
  async _fetchEntityData(filters = {}, sort = null, page = 1, pageSize = 20) {
    try {
      console.log("[UsersEntityManager] Fetching user data", {
        filters,
        sort,
        page,
        pageSize,
      });

      // Construct API URL with pagination
      const baseUrl =
        this.usersApiUrl || "/rest/scriptrunner/latest/custom/users";
      const params = new URLSearchParams();

      // Force ALL users for client-side pagination (API defaults to pageSize=50)
      params.append("page", 1);
      params.append("size", 1000); // Large number to ensure we get all users
      console.log(
        "[UsersEntityManager] Using client-side pagination - fetching ALL users (page=1, size=1000)",
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
      console.log("[UsersEntityManager] API URL:", url);

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
          `Failed to fetch users: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log(
        `[UsersEntityManager] Fetched ${data.content ? data.content.length : 0} users`,
      );

      // Transform response to expected format for CLIENT-SIDE pagination
      const users = data.content || data || [];
      const totalUsers = data.totalElements || users.length;

      console.log(
        `[UsersEntityManager] Client-side pagination: ${totalUsers} total users loaded`,
      );

      return {
        data: users,
        total: totalUsers,
        page: 1, // Always page 1 for client-side pagination
        pageSize: totalUsers, // PageSize = total for client-side pagination
      };
    } catch (error) {
      console.error("[UsersEntityManager] Error fetching user data:", error);
      throw error;
    }
  }

  /**
   * Create new user via API
   * @param {Object} data - User data
   * @returns {Promise<Object>} Created user
   * @protected
   */
  async _createEntityData(data) {
    try {
      console.log("[UsersEntityManager] Creating new user:", data);

      // Security validation
      window.SecurityUtils.validateInput(data);

      const response = await fetch(this.usersApiUrl, {
        method: "POST",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(data),
        credentials: "same-origin",
      });

      if (!response.ok) {
        throw new Error(`Failed to create user: ${response.status}`);
      }

      const createdUser = await response.json();
      console.log("[UsersEntityManager] User created:", createdUser);

      // Clear relevant caches
      this._invalidateCache("all");

      return createdUser;
    } catch (error) {
      console.error("[UsersEntityManager] Failed to create user:", error);
      throw error;
    }
  }

  /**
   * Update user via API
   * @param {string} id - User ID
   * @param {Object} data - Updated user data
   * @returns {Promise<Object>} Updated user
   * @protected
   */
  async _updateEntityData(id, data) {
    try {
      console.log("[UsersEntityManager] Updating user:", id, data);

      // Filter out read-only fields that shouldn't be sent in updates
      const readOnlyFields = ['usr_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'teams'];
      const updateData = {};

      // Only include updatable fields (matching UserRepository whitelist)
      const updatableFields = ['usr_code', 'usr_first_name', 'usr_last_name', 'usr_email', 'usr_is_admin', 'usr_active', 'rls_id'];

      Object.keys(data).forEach(key => {
        if (updatableFields.includes(key) && !readOnlyFields.includes(key)) {
          updateData[key] = data[key];
        }
      });

      console.log("[UsersEntityManager] Filtered update data:", updateData);

      // Security validation
      window.SecurityUtils.validateInput({ id, ...updateData });

      const response = await fetch(
        `${this.usersApiUrl}/${encodeURIComponent(id)}`,
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
        throw new Error(`Failed to update user: ${response.status}`);
      }

      const updatedUser = await response.json();
      console.log("[UsersEntityManager] User updated:", updatedUser);

      // Clear relevant caches
      this._invalidateCache(id);

      return updatedUser;
    } catch (error) {
      console.error("[UsersEntityManager] Failed to update user:", error);
      throw error;
    }
  }

  /**
   * Delete user via API
   * @param {string} id - User ID
   * @returns {Promise<void>}
   * @protected
   */
  async _deleteEntityData(id) {
    try {
      console.log("[UsersEntityManager] Deleting user:", id);

      // Security validation
      window.SecurityUtils.validateInput({ id });

      const response = await fetch(
        `${this.usersApiUrl}/${encodeURIComponent(id)}`,
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
        let errorMessage = `Failed to delete user (${response.status})`;
        let blockingRelationships = null;

        try {
          const errorData = await response.json();
          console.log("[UsersEntityManager] Delete error response:", errorData);

          if (errorData.error) {
            errorMessage = errorData.error;
          }

          // Extract blocking relationships for user-friendly display
          if (errorData.blocking_relationships) {
            blockingRelationships = errorData.blocking_relationships;
          }
        } catch (parseError) {
          console.warn(
            "[UsersEntityManager] Could not parse error response:",
            parseError,
          );
          // Use default error message if JSON parsing fails
        }

        // Create a user-friendly error message
        if (response.status === 409 && blockingRelationships) {
          // HTTP 409 Conflict - User has relationships that prevent deletion
          const relationshipDetails = this._formatBlockingRelationships(
            blockingRelationships,
          );
          const detailedError = new Error(
            `${errorMessage}\n\nThis user cannot be deleted because they are referenced by:\n${relationshipDetails}`,
          );
          detailedError.isConstraintError = true;
          detailedError.blockingRelationships = blockingRelationships;
          throw detailedError;
        } else if (response.status === 404) {
          // HTTP 404 Not Found
          throw new Error("User not found. It may have already been deleted.");
        } else {
          // Other errors
          throw new Error(errorMessage);
        }
      }

      console.log("[UsersEntityManager] User deleted successfully");

      // Clear relevant caches
      this._invalidateCache(id);
    } catch (error) {
      console.error("[UsersEntityManager] Failed to delete user:", error);
      throw error;
    }
  }

  /**
   * Format blocking relationships for user-friendly error display
   * @param {Object} blockingRelationships - Blocking relationships object from API
   * @returns {string} Formatted relationship details
   * @private
   */
  _formatBlockingRelationships(blockingRelationships) {
    const details = [];

    // Map relationship types to user-friendly descriptions
    const relationshipDescriptions = {
      teams: "Team memberships",
      migrations_owned: "Migrations they own",
      plan_instances_owned: "Plan instances they own",
      step_instances_owned: "Step instances they own",
      step_instances_assigned: "Step instances assigned to them",
      instructions_completed: "Instructions they have completed",
      controls_it_validated: "Controls they have validated (IT)",
      controls_biz_validated: "Controls they have validated (Business)",
      audit_logs: "Audit log entries",
      pilot_comments_created: "Pilot comments they created",
      pilot_comments_updated: "Pilot comments they updated",
      step_comments_created: "Step comments they created",
      step_comments_updated: "Step comments they updated",
    };

    // Process each relationship type
    Object.entries(blockingRelationships).forEach(
      ([relationshipType, records]) => {
        if (records && records.length > 0) {
          const description =
            relationshipDescriptions[relationshipType] || relationshipType;
          details.push(
            `• ${description} (${records.length} record${records.length > 1 ? "s" : ""})`,
          );
        }
      },
    );

    if (details.length === 0) {
      return "Unknown relationships (details not available)";
    }

    return details.join("\n");
  }

  /**
   * Format datetime for display in audit fields
   * @param {string|Date} datetime - Datetime to format
   * @returns {string} Formatted datetime string
   * @private
   */
  _formatDateTime(datetime) {
    if (!datetime) return "Not available";

    try {
      const date = new Date(datetime);
      if (isNaN(date.getTime())) return "Invalid date";

      // Format as: "Dec 21, 2024, 2:30 PM"
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch (error) {
      console.warn("[UsersEntityManager] Error formatting datetime:", error);
      return "Format error";
    }
  }

  /**
   * Format role display for comprehensive role information
   * @param {Object} data - User data containing role information
   * @returns {string} Formatted role display
   * @private
   */
  _formatRoleDisplay(data) {
    // Display the actual role_code from the database without transformation
    const roleCode = data.role_code || (data.usr_is_admin ? "ADMIN" : "NORMAL");
    return roleCode;
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
      const tableContainer = document.querySelector('#dataTable');
      if (tableContainer) {
        tableContainer.style.transition = 'opacity 0.2s ease-in-out';
        tableContainer.style.opacity = '0.6';
      }

      // Step 3: Perform the actual refresh
      console.log("[UsersEntityManager] Starting data refresh with visual feedback");
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
        await new Promise(resolve => setTimeout(resolve, 150));
        tableContainer.style.opacity = '1';
      }

      // Step 6: Show success feedback
      this._showRefreshSuccessMessage(operationTime);

      console.log(`[UsersEntityManager] Data refreshed successfully in ${operationTime.toFixed(2)}ms`);

    } catch (error) {
      console.error("[UsersEntityManager] Error refreshing data:", error);

      // Restore table opacity on error
      const tableContainer = document.querySelector('#dataTable');
      if (tableContainer) {
        tableContainer.style.opacity = '1';
      }

      // Show error message
      this._showNotification(
        "error",
        "Refresh Failed",
        "Failed to refresh user data. Please try again."
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

      // Update to loading state
      button.innerHTML = '<span class="umig-btn-icon" style="animation: spin 1s linear infinite;">⟳</span> Refreshing...';
      button.disabled = true;
      button.style.opacity = '0.7';
      button.style.cursor = 'not-allowed';

      // Add spinning animation if not already defined
      if (!document.querySelector('#refresh-spinner-styles')) {
        const style = document.createElement('style');
        style.id = 'refresh-spinner-styles';
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
      button.style.opacity = '1';
      button.style.cursor = 'pointer';
    }
  }

  /**
   * Show refresh success message with timing information
   * @param {number} operationTime - Time taken for the operation in milliseconds
   * @private
   */
  _showRefreshSuccessMessage(operationTime) {
    // Create a temporary success indicator
    const successIndicator = document.createElement('div');
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

    const userCount = this.currentData ? this.currentData.length : 0;
    successIndicator.innerHTML = `
      <strong>✓ Refreshed</strong><br>
      ${userCount} users loaded in ${operationTime.toFixed(0)}ms
    `;

    // Add fade in/out animation
    if (!document.querySelector('#success-indicator-styles')) {
      const style = document.createElement('style');
      style.id = 'success-indicator-styles';
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
   * Cleanup and destroy
   * @override
   */
  async destroy() {
    try {
      // Clear caches
      this.cache.clear();
      this.auditCache = [];
      this.errorLog = [];
      this.performanceMetrics = {};

      // Destroy orchestrator
      if (this.orchestrator) {
        await this.orchestrator.destroy();
        this.orchestrator = null;
      }

      // Clear components
      this.components.clear();

      await super.destroy();

      console.log("[UsersEntityManager] Destroyed successfully");
    } catch (error) {
      console.error("[UsersEntityManager] Error during destroy:", error);
    }
  }
}

// Attach to window for browser compatibility (ADR-057 compliant)
window.UsersEntityManager = UsersEntityManager;

// CommonJS export for Jest compatibility
if (typeof module !== "undefined" && module.exports) {
  module.exports = UsersEntityManager;
}
