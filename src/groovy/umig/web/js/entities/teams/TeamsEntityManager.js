/**
 * TeamsEntityManager - Teams Entity Implementation for US-082-C Phase 1
 *
 * Implements Teams entity management using the new component architecture
 * from US-082-B with BaseEntityManager pattern. This is the first entity
 * to be migrated as part of the pilot implementation.
 *
 * Features:
 * - Teams CRUD operations with component integration
 * - Team member management workflows
 * - Role-based access control (SUPERADMIN/ADMIN)
 * - 25% performance improvement target over legacy
 * - A/B testing support for architecture validation
 *
 * @version 1.0.0
 * @created 2025-01-12 (US-082-C Phase 1 - Day 1)
 * @security Enterprise-grade (8.5/10) via ComponentOrchestrator
 * @performance Target: 450ms → 340ms (25% improvement)
 * @rollout A/B testing enabled with 50/50 traffic split
 */

// Browser-compatible version - uses global objects instead of ES6 imports
// Assumes BaseEntityManager and SecurityUtils are already loaded as globals

class TeamsEntityManager extends (window.BaseEntityManager || class {}) {
  /**
   * Initialize TeamsEntityManager with Teams-specific configuration
   * @param {Object} options - Configuration options from admin-gui.js
   */
  constructor(options = {}) {
    super({
      entityType: "teams",
      ...options, // Pass through all options including orchestrator
      tableConfig: {
        containerId: "dataTable",
        primaryKey: "tms_id", // Teams primary key for proper row identification
        columns: [
          {
            key: "tms_name", // Updated to match API response field name
            label: "Team Name",
            sortable: true,
            searchable: true,
            required: true,
            maxLength: 100,
          },
          {
            key: "tms_description", // Updated to match API response field name
            label: "Description",
            sortable: true,
            searchable: true,
            truncate: 50,
          },
          {
            key: "tms_email", // Updated to match API response field name
            label: "Team Email",
            sortable: true,
            searchable: true,
            type: "email",
            // Custom renderer for email with secure HTML using EmailUtils
            renderer: (value) => {
              if (!value) return "";
              // Use EmailUtils if available for consistent email link rendering
              if (window.EmailUtils) {
                return window.EmailUtils.formatSingleEmail(value, {
                  linkClass: "umig-table-email-link",
                  addTitle: true,
                });
              }
              // Fallback to sanitized email without link
              const sanitizedEmail = value.replace(/[<>"']/g, "");
              return sanitizedEmail;
            },
          },
          {
            key: "member_count", // Updated to match API response field name
            label: "Members",
            sortable: true,
            type: "number",
            align: "right",
          },
          {
            key: "app_count", // Added new field from API response
            label: "Applications",
            sortable: true,
            type: "number",
            align: "right",
          },
        ],
        actions: {
          view: true,
          edit: true,
          delete: true,
          members: true, // Teams-specific action
        },
        bulkActions: {
          delete: true,
          export: true,
          setStatus: true,
        },
        defaultSort: { column: "name", direction: "asc" },
      },
      modalConfig: {
        containerId: "editModal", // Use shared modal container that exists in admin-gui.js DOM
        title: "Team Management",
        size: "large",
        form: {
          fields: [
          {
            name: "tms_name", // Fixed: Use database field name
            type: "text",
            required: true,
            label: "Team Name",
            placeholder: "Enter team name",
            validation: {
              minLength: 2,
              maxLength: 100,
              pattern: /^[a-zA-Z0-9\s\-_]+$/,
              message:
                "Team name must contain only letters, numbers, spaces, hyphens, and underscores",
            },
          },
          {
            name: "tms_description", // Fixed: Use database field name
            type: "textarea",
            required: false,
            label: "Description",
            placeholder: "Enter team description (optional)",
            rows: 4,
            validation: {
              maxLength: 500,
            },
          },
          {
            name: "tms_email", // Fixed: Use database field name
            type: "email",
            required: true,
            label: "Team Email",
            placeholder: "Enter team email (required)",
            validation: {
              maxLength: 255,
              pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Please enter a valid email address",
            },
          },
        ]
        },
        title: {
          create: "Create New Team",
          edit: "Edit Team",
          view: "Team Details",
        },
        validation: true,
        confirmOnClose: true,
        enableTabs: true, // US-087 Teams enhancement - enable tabbed modal support
      },
      filterConfig: {
        enabled: true,
        persistent: true,
        filters: [
          {
            name: "status", // Changed from 'key' to 'name' for FilterComponent compatibility
            type: "select",
            label: "Status",
            options: [
              { value: "", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "archived", label: "Archived" },
            ],
          },
          {
            name: "memberCountRange", // Changed from 'key' to 'name' for FilterComponent compatibility
            type: "range",
            label: "Member Count",
            min: 0,
            max: 100,
          },
          {
            name: "search", // Changed from 'key' to 'name' for FilterComponent compatibility
            type: "text",
            label: "Search",
            placeholder: "Search teams...",
          },
        ],
      },
      paginationConfig: {
        pageSize: 10,
        showPageSizer: true,
        pageSizeOptions: [10, 20, 50, 100],
      },
    });

    // PHASE 2: Add modal mode support (following Users pattern)
    this.mode = options.mode || 'create';

    // Teams-specific properties
    this.apiBaseUrl = "/rest/scriptrunner/latest/custom/teams";
    this.membersApiUrl = "/rest/scriptrunner/latest/custom/team-members";

    // Performance tracking specifics
    this.performanceTargets = {
      load: 340, // Target: 450ms → 340ms (25% improvement)
      create: 200, // Target: sub-200ms operations
      update: 200,
      delete: 150,
      memberOps: 300, // Team member operations
    };

    // Role-based access control with transition management
    this.currentUserRole = null;
    this.accessControls = {
      SUPERADMIN: [
        "create",
        "edit",
        "delete",
        "members",
        "bulk",
        "role_management",
      ],
      ADMIN: ["view", "members", "edit", "delete"],
      USER: ["view"],
    };

    // Role hierarchy for transition validation
    this.roleHierarchy = {
      SUPERADMIN: 3,
      ADMIN: 2,
      USER: 1,
    };

    // Role transition rules
    this.validTransitions = {
      USER: ["ADMIN"], // USER can only become ADMIN
      ADMIN: ["USER", "SUPERADMIN"], // ADMIN can go up or down
      SUPERADMIN: ["ADMIN", "USER"], // SUPERADMIN can step down
    };

    // Audit retention policy (90 days)
    this.auditRetentionDays = 90;

    // PHASE 1: Add missing interface properties for BaseEntityManager compliance
    // These properties align with Users entity pattern for consistent interface
    this.cacheHitCount = 0;
    this.cacheMissCount = 0;
    this.rolesData = [];

    // Performance thresholds (matching Users pattern)
    this.performanceThresholds = {
      teamLoad: 340, // Target: 450ms → 340ms (25% improvement)
      teamUpdate: 200,
      teamCreate: 200,
      teamDelete: 150,
      memberOps: 300,
      bulkOperations: 1000,
    };

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

    // Client-side pagination - TableComponent handles pagination of full dataset
    this.paginationMode = "client";

    console.log("[TeamsEntityManager] Initialized with component architecture and interface compliance");
  }

  /**
   * Initialize with user role checking
   * @param {HTMLElement} container - DOM container
   * @param {Object} options - Initialize options
   * @returns {Promise<void>}
   */
  async initialize(container, options = {}) {
    try {
      console.log("[TeamsEntityManager] Starting initialization...");

      // Validate container
      if (!container) {
        throw new Error(
          "Container is required for TeamsEntityManager initialization",
        );
      }

      // Get current user role for RBAC with fallback
      try {
        await this._getCurrentUserRole();
        console.log("[TeamsEntityManager] User role determined successfully");
      } catch (roleError) {
        console.warn(
          "[TeamsEntityManager] Failed to get user role, using default:",
          roleError,
        );
        this.currentUserRole = {
          role: "USER",
          userId: "unknown",
          username: "unknown",
        };
      }

      // Configure access controls based on role
      try {
        this._configureAccessControls();
        console.log("[TeamsEntityManager] Access controls configured");
      } catch (accessError) {
        console.warn(
          "[TeamsEntityManager] Failed to configure access controls:",
          accessError,
        );
        // Continue with default access controls
      }

      // Initialize base entity manager
      try {
        await super.initialize(container, options);
        console.log("[TeamsEntityManager] Base entity manager initialized");
      } catch (baseError) {
        console.error(
          "[TeamsEntityManager] Base initialization failed:",
          baseError,
        );
        throw baseError; // Re-throw since this is critical
      }

      // Setup Teams-specific functionality with fallback
      try {
        await this._setupTeamsSpecificFeatures();
        console.log("[TeamsEntityManager] Teams-specific features set up");
      } catch (featuresError) {
        console.warn(
          "[TeamsEntityManager] Failed to setup Teams-specific features:",
          featuresError,
        );
        // Continue without Teams-specific features if they fail
      }

      // PHASE 1: Toolbar will be created after container is stable in render()

      console.log("[TeamsEntityManager] Teams entity manager ready");
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to initialize:", error);

      // Log detailed error information for debugging
      console.error("[TeamsEntityManager] Error details:", {
        message: error.message,
        stack: error.stack,
        container: container
          ? { id: container.id, tagName: container.tagName }
          : null,
        currentUserRole: this.currentUserRole,
        isBaseInitialized: this.isInitialized || false,
      });

      // Try to clean up any partial initialization
      try {
        if (this.isInitialized) {
          await this.destroy();
        }
      } catch (cleanupError) {
        console.error(
          "[TeamsEntityManager] Error during cleanup:",
          cleanupError,
        );
      }

      throw error;
    }
  }

  /**
   * Load team member data for a specific team
   * @param {string} teamId - Team ID
   * @returns {Promise<Array>} Team members
   */
  async loadMembers(teamId) {
    const startTime = performance.now();

    try {
      console.log(`[TeamsEntityManager] Loading members for team ${teamId}`);

      // Security validation
      window.SecurityUtils.validateInput({ teamId });

      // CSRF PROTECTION: Add CSRF token to request headers
      const response = await fetch(
        `${this.membersApiUrl}?teamId=${encodeURIComponent(teamId)}`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load team members: ${response.status}`);
      }

      const members = await response.json();

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("memberLoad", operationTime);

      console.log(
        `[TeamsEntityManager] Loaded ${members.length} members in ${operationTime.toFixed(2)}ms`,
      );

      return members;
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to load members:", error);
      this._trackError("memberLoad", error);
      throw error;
    }
  }

  /**
   * Assign user to team
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID to assign
   * @returns {Promise<Object>} Assignment result
   */
  async assignMember(teamId, userId) {
    const startTime = performance.now();

    try {
      console.log(
        `[TeamsEntityManager] Assigning user ${userId} to team ${teamId}`,
      );

      // Security validation
      window.SecurityUtils.validateInput({ teamId, userId });
      this._checkPermission("members");

      // CSRF PROTECTION: Add CSRF token and create secure request body
      const requestBody = window.SecurityUtils.preventXSS({
        teamId: teamId,
        userId: userId,
        assignedBy: this.currentUserRole?.userId,
        assignedDate: new Date().toISOString(),
      });

      const response = await fetch(this.membersApiUrl, {
        method: "POST",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Failed to assign member: ${response.status}`);
      }

      const result = await response.json();

      // Refresh team data to update member count
      await this.loadData(
        this.currentFilters,
        this.currentSort,
        this.currentPage,
      );

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("memberAssign", operationTime);

      // Audit logging
      this._auditLog("assign_member", teamId, { userId, result });

      console.log(`[TeamsEntityManager] Member assigned successfully`);

      return result;
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to assign member:", error);
      this._trackError("memberAssign", error);
      throw error;
    }
  }

  /**
   * Remove user from team
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID to remove
   * @returns {Promise<boolean>} Removal success
   */
  async removeMember(teamId, userId) {
    const startTime = performance.now();

    try {
      console.log(
        `[TeamsEntityManager] Removing user ${userId} from team ${teamId}`,
      );

      // Security validation
      window.SecurityUtils.validateInput({ teamId, userId });
      this._checkPermission("members");

      // CSRF PROTECTION: Add CSRF token to DELETE request
      const response = await fetch(
        `${this.membersApiUrl}/${encodeURIComponent(teamId)}/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to remove member: ${response.status}`);
      }

      // Refresh team data to update member count
      await this.loadData(
        this.currentFilters,
        this.currentSort,
        this.currentPage,
      );

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("memberRemove", operationTime);

      // Audit logging
      this._auditLog("remove_member", teamId, { userId });

      console.log(`[TeamsEntityManager] Member removed successfully`);

      return true;
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to remove member:", error);
      this._trackError("memberRemove", error);
      throw error;
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
      console.log("[TeamsEntityManager] Creating toolbar after render");
      this.createToolbar();
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to render:", error);
      throw error;
    }
  }

  /**
   * PHASE 1: Create toolbar with Teams-specific actions (matching Users pattern)
   * Creates Add New Team and Refresh buttons above the table
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
        console.warn(`[TeamsEntityManager] Container not found for toolbar:`, {
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
        console.log("[TeamsEntityManager] Removed existing toolbar");
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

      console.log("[TeamsEntityManager] Created new toolbar");

      // Create Add New Team button with UMIG-prefixed classes to avoid Confluence conflicts
      const addButton = document.createElement("button");
      addButton.className = "umig-btn-primary umig-button";
      addButton.id = "umig-add-new-team-btn"; // Use UMIG-prefixed ID to avoid legacy conflicts
      addButton.innerHTML = '<span class="umig-btn-icon">➕</span> Add New Team';
      addButton.setAttribute("data-action", "add");
      addButton.onclick = () => {
        console.log("[TeamsEntityManager] Add New Team button clicked");
        this.handleAdd();
      };

      // Create Refresh button (matching TeamsEntityManager pattern)
      const refreshButton = document.createElement("button");
      refreshButton.className = "umig-btn-secondary umig-button";
      refreshButton.id = "umig-refresh-teams-btn";
      refreshButton.innerHTML = '<span class="umig-btn-icon">🔄</span> Refresh';
      // Use addEventListener instead of onclick for better reliability (ADR-057 compliance)
      refreshButton.addEventListener("click", async () => {
        console.log("[TeamsEntityManager] Refresh button clicked");
        await this._handleRefreshWithFeedback(refreshButton);
      });

      // Clear and add buttons to toolbar
      toolbar.innerHTML = "";

      // Add buttons to toolbar
      toolbar.appendChild(addButton);
      toolbar.appendChild(refreshButton);

      console.log("[TeamsEntityManager] Toolbar buttons created and attached");
    } catch (error) {
      console.error("[TeamsEntityManager] Error creating toolbar:", error);
    }
  }

  /**
   * Validate role transition according to hierarchy and rules
   * @param {string} currentRole - Current user role
   * @param {string} newRole - Requested new role
   * @param {Object} userContext - User context for validation
   * @returns {Object} Validation result with reasons
   */
  validateRoleTransition(currentRole, newRole, userContext = {}) {
    try {
      console.log(
        `[TeamsEntityManager] Validating role transition: ${currentRole} → ${newRole}`,
      );

      // Input validation
      const validRoles = Object.keys(this.roleHierarchy);
      if (!validRoles.includes(currentRole) || !validRoles.includes(newRole)) {
        return {
          valid: false,
          reason: "Invalid role specified",
          code: "INVALID_ROLE",
        };
      }

      // No change validation
      if (currentRole === newRole) {
        return {
          valid: false,
          reason: "Role is already assigned",
          code: "NO_CHANGE_REQUIRED",
        };
      }

      // Check if transition is allowed by rules
      const allowedTransitions = this.validTransitions[currentRole] || [];
      if (!allowedTransitions.includes(newRole)) {
        return {
          valid: false,
          reason: `Role transition from ${currentRole} to ${newRole} is not allowed`,
          code: "TRANSITION_NOT_ALLOWED",
          allowedTransitions: allowedTransitions,
        };
      }

      // Hierarchy validation - prevent users from elevating others above themselves
      const requestingUserRole = userContext.role || this.currentUserRole?.role;
      const requestingUserLevel = this.roleHierarchy[requestingUserRole] || 0;
      const newRoleLevel = this.roleHierarchy[newRole];

      if (
        newRoleLevel >= requestingUserLevel &&
        requestingUserRole !== "SUPERADMIN"
      ) {
        return {
          valid: false,
          reason: "Cannot assign a role equal to or higher than your own",
          code: "HIERARCHY_VIOLATION",
        };
      }

      // Check if requesting user has permission to make this change
      if (!this._canManageRole(requestingUserRole, newRole)) {
        return {
          valid: false,
          reason: "Insufficient permissions to assign this role",
          code: "INSUFFICIENT_PERMISSIONS",
        };
      }

      return {
        valid: true,
        reason: "Role transition is valid",
        code: "VALID_TRANSITION",
      };
    } catch (error) {
      console.error(
        "[TeamsEntityManager] Role transition validation error:",
        error,
      );
      return {
        valid: false,
        reason: "Validation error occurred",
        code: "VALIDATION_ERROR",
        error: error.message,
      };
    }
  }

  /**
   * Change user role with comprehensive validation and audit logging
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID whose role is changing
   * @param {string} newRole - New role to assign
   * @param {Object} userContext - Context of user making the change
   * @param {string} reason - Reason for role change
   * @returns {Promise<Object>} Role change result
   */
  async changeUserRole(teamId, userId, newRole, userContext = {}, reason = "") {
    const startTime = performance.now();

    try {
      console.log(
        `[TeamsEntityManager] Changing role for user ${userId} to ${newRole}`,
      );

      // Security validation
      window.SecurityUtils.validateInput({ teamId, userId, newRole, reason });
      this._checkPermission("role_management");

      // Get current user role
      const currentMemberData = await this._getCurrentMemberRole(
        teamId,
        userId,
      );
      const currentRole = currentMemberData?.role || "USER";

      // Validate the role transition
      const validationResult = this.validateRoleTransition(
        currentRole,
        newRole,
        userContext,
      );
      if (!validationResult.valid) {
        throw new Error(
          `Role transition validation failed: ${validationResult.reason}`,
        );
      }

      // Create audit entry before change
      const auditData = {
        teamId,
        userId,
        previousRole: currentRole,
        newRole,
        changedBy: userContext.userId || this.currentUserRole?.userId,
        reason: window.SecurityUtils.sanitizeInput(reason),
        timestamp: new Date().toISOString(),
        validationResult,
      };

      // Execute role change with transaction support
      let result;
      try {
        result = await this._executeRoleChange(
          teamId,
          userId,
          newRole,
          auditData,
        );
      } catch (error) {
        // Log failed attempt
        this._auditLog("role_change_failed", userId, {
          ...auditData,
          error: error.message,
        });
        throw error;
      }

      // Cascade permissions if role change was successful
      if (result.success) {
        try {
          await this.cascadePermissions(teamId, userId, newRole);
        } catch (cascadeError) {
          console.warn(
            "[TeamsEntityManager] Permission cascade failed:",
            cascadeError,
          );
          // Don't fail the entire operation for cascade issues
          result.cascadeWarning = cascadeError.message;
        }
      }

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("roleChange", operationTime);

      // Comprehensive audit logging
      this._auditLog("role_change_success", userId, {
        ...auditData,
        result,
        operationTime,
      });

      // Add to role history
      await this._addToRoleHistory(userId, auditData);

      console.log(
        `[TeamsEntityManager] Role change completed successfully for user ${userId}`,
      );

      return {
        success: true,
        previousRole: currentRole,
        newRole,
        userId,
        teamId,
        result,
        operationTime: Math.round(operationTime),
      };
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to change user role:", error);
      this._trackError("roleChange", error);

      // Ensure error is audited
      this._auditLog("role_change_error", userId, {
        teamId,
        newRole,
        error: error.message,
        stackTrace: error.stack,
      });

      throw error;
    }
  }

  /**
   * Cascade permissions when role changes
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @param {string} newRole - New role assigned
   * @returns {Promise<Object>} Cascade result
   */
  async cascadePermissions(teamId, userId, newRole) {
    try {
      console.log(
        `[TeamsEntityManager] Cascading permissions for ${userId} with role ${newRole}`,
      );

      // Get user's related entities that need permission updates
      const relatedEntities = await this._getUserRelatedEntities(
        teamId,
        userId,
      );

      const cascadeResults = [];
      const allowedActions = this.accessControls[newRole] || ["view"];

      // Update permissions for each related entity
      for (const entity of relatedEntities) {
        try {
          const updateResult = await this._updateEntityPermissions(
            entity,
            userId,
            allowedActions,
          );
          cascadeResults.push({
            entityType: entity.type,
            entityId: entity.id,
            success: true,
            permissions: allowedActions,
            updateResult,
          });
        } catch (entityError) {
          cascadeResults.push({
            entityType: entity.type,
            entityId: entity.id,
            success: false,
            error: entityError.message,
          });
        }
      }

      // Validate child entity inheritance
      await this._validateChildEntityPermissions(teamId, userId, newRole);

      const cascadeResult = {
        success: true,
        updatedEntities: cascadeResults.filter((r) => r.success).length,
        failedEntities: cascadeResults.filter((r) => !r.success).length,
        details: cascadeResults,
      };

      // Audit cascade operation
      this._auditLog("permission_cascade", userId, {
        teamId,
        newRole,
        cascadeResult,
      });

      return cascadeResult;
    } catch (error) {
      console.error("[TeamsEntityManager] Permission cascade failed:", error);
      this._auditLog("permission_cascade_failed", userId, {
        teamId,
        newRole,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Get role history for a user
   * @param {string} userId - User ID
   * @param {number} limit - Maximum number of history entries (default: 50)
   * @returns {Promise<Array>} Role history entries
   */
  async getRoleHistory(userId, limit = 50) {
    try {
      console.log(
        `[TeamsEntityManager] Fetching role history for user ${userId}`,
      );

      // Security validation
      window.SecurityUtils.validateInput({ userId });
      this._checkPermission("role_management");

      // Fetch from audit service or local storage
      let historyEntries = [];

      // Try audit service first
      if (window.UMIGServices?.auditService) {
        historyEntries =
          await window.UMIGServices.auditService.getUserRoleHistory(
            userId,
            limit,
          );
      } else {
        // Fallback to API call
        const response = await fetch(
          `/rest/scriptrunner/latest/custom/users/${encodeURIComponent(userId)}/role-history?limit=${limit}`,
          {
            method: "GET",
            headers: window.SecurityUtils.addCSRFProtection({
              "Content-Type": "application/json",
            }),
          },
        );

        if (response.ok) {
          const data = await response.json();
          historyEntries = data.history || [];
        }
      }

      // Clean up old entries according to retention policy
      const retentionCutoff = new Date();
      retentionCutoff.setDate(
        retentionCutoff.getDate() - this.auditRetentionDays,
      );

      const filteredEntries = historyEntries.filter(
        (entry) => new Date(entry.timestamp) >= retentionCutoff,
      );

      // Sort by timestamp descending (most recent first)
      filteredEntries.sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
      );

      console.log(
        `[TeamsEntityManager] Retrieved ${filteredEntries.length} role history entries for user ${userId}`,
      );

      return filteredEntries;
    } catch (error) {
      console.error(
        "[TeamsEntityManager] Failed to fetch role history:",
        error,
      );
      this._trackError("getRoleHistory", error);
      throw error;
    }
  }

  /**
   * Handle bulk team operations
   * @param {string} operation - Bulk operation type
   * @param {Array} teamIds - Array of team IDs
   * @param {Object} operationData - Operation-specific data
   * @returns {Promise<Object>} Bulk operation result
   */
  async bulkOperation(operation, teamIds, operationData = {}, userContext = {}) {
    const startTime = performance.now();

    try {
      console.log(
        `[TeamsEntityManager] Executing bulk ${operation} on ${teamIds.length} teams`,
      );

      // Comprehensive input validation
      await this._validateInputs(
        { operation, teamIds, operationData },
        {
          operation: {
            type: "string",
            required: true,
            pattern: /^(delete|export|setStatus)$/,
          },
          teamIds: {
            type: "object",
            required: true,
            validator: (value) => {
              if (!Array.isArray(value)) return "teamIds must be an array";
              if (value.length === 0) return "teamIds cannot be empty";
              if (value.length > 50) return "Cannot process more than 50 teams at once";
              return true;
            },
          },
          operationData: {
            type: "object",
            required: false,
          },
        },
      );

      // Rate limiting for bulk operations - critical security measure
      this._checkRateLimit("bulkOperation", userContext.performedBy || "system");

      this._checkPermission("bulk");

      // Progress tracking initialization
      const progressTracker = {
        total: teamIds.length,
        completed: 0,
        failed: 0,
        errors: [],
        startTime: startTime,
      };

      let result;
      switch (operation) {
        case "delete":
          result = await this._bulkDeleteWithProgress(teamIds, progressTracker, userContext);
          break;
        case "export":
          result = await this._bulkExportWithProgress(teamIds, operationData, progressTracker, userContext);
          break;
        case "setStatus":
          result = await this._bulkSetStatusWithProgress(teamIds, operationData.status, progressTracker, userContext);
          break;
        default:
          throw new Error(`Unsupported bulk operation: ${operation}`);
      }

      // Refresh data
      await this.loadData(
        this.currentFilters,
        this.currentSort,
        this.currentPage,
      );

      // Track performance with enhanced metrics
      const operationTime = performance.now() - startTime;
      this._trackPerformance("bulkOperation", operationTime);

      // Enhanced result with progress information
      const enhancedResult = {
        ...result,
        progressSummary: {
          total: progressTracker.total,
          completed: progressTracker.completed,
          failed: progressTracker.failed,
          successRate: ((progressTracker.completed / progressTracker.total) * 100).toFixed(2) + '%',
          duration: operationTime,
          errors: progressTracker.errors,
        },
      };

      // Comprehensive audit logging
      this._auditLog(`bulk_${operation}`, null, {
        teamIds,
        operationData,
        result: enhancedResult,
        userContext,
        performance: {
          duration: operationTime,
          itemsPerSecond: (teamIds.length / (operationTime / 1000)).toFixed(2),
        },
        teamIds,
        operationData,
        result,
      });

      console.log(`[TeamsEntityManager] Bulk ${operation} completed`);

      return enhancedResult;
    } catch (error) {
      console.error(`[TeamsEntityManager] Bulk ${operation} failed:`, error);
      this._trackError(`bulkOperation`, error);
      throw error;
    }
  }

  /**
   * Enhanced bulk delete with progress tracking
   * @param {Array} teamIds - Team IDs to delete
   * @param {Object} progressTracker - Progress tracking object
   * @param {Object} userContext - User context for audit
   * @returns {Promise<Object>} Bulk delete result
   * @private
   */
  async _bulkDeleteWithProgress(teamIds, progressTracker, userContext = {}) {
    console.log(`[TeamsEntityManager] Starting bulk delete of ${teamIds.length} teams`);

    const results = {
      deleted: [],
      failed: [],
      errors: [],
    };

    // Process in batches to avoid overwhelming the server
    const batchSize = 5;
    for (let i = 0; i < teamIds.length; i += batchSize) {
      const batch = teamIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (teamId) => {
        try {
          await this._deleteEntityData(teamId, userContext);
          progressTracker.completed++;
          results.deleted.push(teamId);

          // Progress notification
          if (this.orchestrator) {
            this.orchestrator.emit('bulk:progress', {
              operation: 'delete',
              completed: progressTracker.completed,
              total: progressTracker.total,
              currentItem: teamId,
            });
          }
        } catch (error) {
          progressTracker.failed++;
          results.failed.push(teamId);
          results.errors.push({ teamId, error: error.message });
          progressTracker.errors.push({ teamId, error: error.message });
          console.error(`[TeamsEntityManager] Failed to delete team ${teamId}:`, error);
        }
      });

      // Wait for current batch to complete before processing next batch
      await Promise.all(batchPromises);

      // Small delay between batches to prevent server overload
      if (i + batchSize < teamIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  /**
   * Enhanced bulk export with progress tracking
   * @param {Array} teamIds - Team IDs to export
   * @param {Object} operationData - Export options
   * @param {Object} progressTracker - Progress tracking object
   * @param {Object} userContext - User context for audit
   * @returns {Promise<Object>} Bulk export result
   * @private
   */
  async _bulkExportWithProgress(teamIds, operationData, progressTracker, userContext = {}) {
    console.log(`[TeamsEntityManager] Starting bulk export of ${teamIds.length} teams`);

    const exportData = [];
    const results = {
      exported: [],
      failed: [],
      errors: [],
      downloadUrl: null,
    };

    // Fetch detailed data for each team
    for (let i = 0; i < teamIds.length; i++) {
      const teamId = teamIds[i];
      try {
        // Fetch team details from API
        const response = await fetch(`${this.apiBaseUrl}/${encodeURIComponent(teamId)}`, {
          method: 'GET',
          headers: window.SecurityUtils.addCSRFProtection({
            'Content-Type': 'application/json',
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch team ${teamId}: ${response.status}`);
        }

        const teamData = await response.json();
        exportData.push(teamData);
        progressTracker.completed++;
        results.exported.push(teamId);

        // Progress notification
        if (this.orchestrator) {
          this.orchestrator.emit('bulk:progress', {
            operation: 'export',
            completed: progressTracker.completed,
            total: progressTracker.total,
            currentItem: teamId,
          });
        }
      } catch (error) {
        progressTracker.failed++;
        results.failed.push(teamId);
        results.errors.push({ teamId, error: error.message });
        progressTracker.errors.push({ teamId, error: error.message });
        console.error(`[TeamsEntityManager] Failed to export team ${teamId}:`, error);
      }
    }

    // Generate export file
    if (exportData.length > 0) {
      try {
        const format = operationData.format || 'csv';
        let content, mimeType, fileName;

        if (format === 'json') {
          content = JSON.stringify(exportData, null, 2);
          mimeType = 'application/json';
          fileName = `teams_export_${new Date().toISOString().slice(0, 10)}.json`;
        } else {
          // CSV format
          const headers = Object.keys(exportData[0]).join(',');
          const rows = exportData.map(team =>
            Object.values(team).map(value =>
              typeof value === 'string' && value.includes(',') ? `"${value}"` : value
            ).join(',')
          );
          content = [headers, ...rows].join('\n');
          mimeType = 'text/csv';
          fileName = `teams_export_${new Date().toISOString().slice(0, 10)}.csv`;
        }

        // Create download blob
        const blob = new Blob([content], { type: mimeType });
        results.downloadUrl = URL.createObjectURL(blob);
        results.fileName = fileName;
      } catch (error) {
        console.error('[TeamsEntityManager] Failed to generate export file:', error);
        results.errors.push({ error: 'Failed to generate export file' });
      }
    }

    return results;
  }

  /**
   * Enhanced bulk status update with progress tracking
   * @param {Array} teamIds - Team IDs to update
   * @param {string} newStatus - New status value
   * @param {Object} progressTracker - Progress tracking object
   * @param {Object} userContext - User context for audit
   * @returns {Promise<Object>} Bulk status update result
   * @private
   */
  async _bulkSetStatusWithProgress(teamIds, newStatus, progressTracker, userContext = {}) {
    console.log(`[TeamsEntityManager] Starting bulk status update of ${teamIds.length} teams to ${newStatus}`);

    // Validate status value
    if (!['active', 'inactive', 'archived'].includes(newStatus)) {
      throw new Error(`Invalid status: ${newStatus}`);
    }

    const results = {
      updated: [],
      failed: [],
      errors: [],
    };

    // Process in batches
    const batchSize = 5;
    for (let i = 0; i < teamIds.length; i += batchSize) {
      const batch = teamIds.slice(i, i + batchSize);

      const batchPromises = batch.map(async (teamId) => {
        try {
          await this._updateEntityData(teamId, { status: newStatus }, userContext);
          progressTracker.completed++;
          results.updated.push(teamId);

          // Progress notification
          if (this.orchestrator) {
            this.orchestrator.emit('bulk:progress', {
              operation: 'setStatus',
              completed: progressTracker.completed,
              total: progressTracker.total,
              currentItem: teamId,
              newStatus,
            });
          }
        } catch (error) {
          progressTracker.failed++;
          results.failed.push(teamId);
          results.errors.push({ teamId, error: error.message });
          progressTracker.errors.push({ teamId, error: error.message });
          console.error(`[TeamsEntityManager] Failed to update status for team ${teamId}:`, error);
        }
      });

      // Wait for current batch to complete
      await Promise.all(batchPromises);

      // Small delay between batches
      if (i + batchSize < teamIds.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return results;
  }

  // Protected Methods (BaseEntityManager implementations)

  /**
   * Fetch teams data from API
   * @param {Object} filters - Filter parameters
   * @param {Object} sort - Sort parameters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise<Object>} API response
   * @protected
   */
  async _fetchEntityData(filters = {}, sort = null, page = 1, pageSize = 20) {
    const params = new URLSearchParams();

    // Add filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        params.append(key, value);
      }
    });

    // Add pagination
    params.append("page", page);
    params.append("pageSize", pageSize);

    // Add sorting
    if (sort) {
      params.append("sortBy", sort.column);
      params.append("sortDir", sort.direction);
    }

    const url = `${this.apiBaseUrl}?${params.toString()}`;
    console.log("[TeamsEntityManager] Fetching teams from:", url);

    // CSRF PROTECTION: Add CSRF token to GET request
    const response = await fetch(url, {
      method: "GET",
      headers: window.SecurityUtils.addCSRFProtection({
        "Content-Type": "application/json",
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch teams: ${response.status} ${response.statusText}`,
      );
    }

    const result = await response.json();

    return {
      data: result.teams || [],
      total: result.total || 0,
      page: result.page || page,
      pageSize: result.pageSize || pageSize,
    };
  }

  /**
   * Create team via API
   * @param {Object} data - Team data
   * @returns {Promise<Object>} Created team
   * @protected
   */
  async _createEntityData(data, userContext = {}) {
    this._checkPermission("create");

    // Comprehensive input validation
    await this._validateInputs(data, {
      name: {
        type: "string",
        required: true,
        minLength: 2,
        maxLength: 100,
        pattern: /^[a-zA-Z0-9\s\-_]+$/,
      },
      team_code: {
        type: "string",
        required: false,
        maxLength: 50,
        pattern: /^[A-Z0-9_]+$/,
      },
      description: {
        type: "string",
        required: false,
        maxLength: 500,
      },
      email: {
        type: "email",
        required: true,
        maxLength: 255,
      },
      status: {
        type: "string",
        required: false,
        pattern: /^(active|inactive|archived)$/,
      },
    });

    // Rate limiting for team creation
    this._checkRateLimit("teamCreate", userContext.performedBy || "system");

    const startTime = performance.now();

    try {
      // CSRF PROTECTION: Add CSRF token and sanitize request body
      const requestBody = window.SecurityUtils.preventXSS({
        ...data,
        createdBy: this.currentUserRole?.userId,
        createdDate: new Date().toISOString(),
      });

      const response = await fetch(this.apiBaseUrl, {
        method: "POST",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to create team: ${response.status} - ${error}`);
      }

      const result = await response.json();

      const operationTime = performance.now() - startTime;
      this._trackPerformance("teamCreate", operationTime);

      // Audit log
      this._auditLog("team_creation", result.tms_id || result.id, {
        teamData: data,
        result,
        userContext,
      });

      console.log(
        `[TeamsEntityManager] Created team in ${operationTime.toFixed(2)}ms`,
      );

      return result;
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to create team:", error);
      this._trackError("createEntityData", error);
      throw error;
    }
  }

  /**
   * Update team via API
   * @param {string} id - Team ID
   * @param {Object} data - Updated data
   * @returns {Promise<Object>} Updated team
   * @protected
   */
  async _updateEntityData(id, data) {
    this._checkPermission("edit");

    // PHASE 1: Filter out read-only fields that shouldn't be sent in updates (matching Users pattern)
    const readOnlyFields = ['tms_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'member_count', 'app_count'];

    // CRITICAL FIX: Map frontend field names to database field names
    const fieldMapping = {
      'name': 'tms_name',
      'description': 'tms_description',
      'email': 'tms_email',
      'status': 'tms_status'
    };

    const updateData = {};

    // Only include updatable fields (matching TeamRepository expectations - using database field names)
    const updatableFields = ['tms_name', 'tms_description', 'tms_email', 'tms_status'];

    Object.keys(data).forEach(key => {
      // Map frontend field name to database field name
      const dbFieldName = fieldMapping[key] || key;

      if (updatableFields.includes(dbFieldName) && !readOnlyFields.includes(key)) {
        updateData[dbFieldName] = data[key];
      }
    });

    console.log("[TeamsEntityManager] Filtered update data:", updateData);

    // CSRF PROTECTION: Add CSRF token and sanitize request body
    const requestBody = window.SecurityUtils.preventXSS({
      ...updateData,
      modifiedBy: this.currentUserRole?.userId,
      modifiedDate: new Date().toISOString(),
    });

    const response = await fetch(
      `${this.apiBaseUrl}/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to update team: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Delete team via API
   * @param {string} id - Team ID
   * @returns {Promise<void>}
   * @protected
   */
  async _deleteEntityData(id) {
    this._checkPermission("delete");

    // CSRF PROTECTION: Add CSRF token to DELETE request
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
      throw new Error(`Failed to delete team: ${response.status} - ${error}`);
    }
  }

  /**
   * Enhanced validation for Teams entity
   * @param {Object} data - Team data
   * @param {string} operation - Operation type
   * @protected
   */
  _validateEntityData(data, operation) {
    super._validateEntityData(data, operation);

    // Teams-specific validation
    if (operation === "create" || operation === "update") {
      if (
        !data.tms_name ||
        typeof data.tms_name !== "string" ||
        data.tms_name.trim().length < 2
      ) {
        throw new Error(
          "Team name is required and must be at least 2 characters",
        );
      }

      if (data.tms_name.length > 100) {
        throw new Error("Team name cannot exceed 100 characters");
      }

      if (data.tms_description && data.tms_description.length > 500) {
        throw new Error("Team description cannot exceed 500 characters");
      }

      // XSS prevention
      const sanitized = window.SecurityUtils.sanitizeInput(data.tms_name);
      if (sanitized !== data.tms_name) {
        throw new Error("Team name contains invalid characters");
      }
    }
  }

  // Private Methods

  /**
   * Get current user role
   * @private
   */
  async _getCurrentUserRole() {
    try {
      // Use existing UserService if available (primary method)
      if (window.UMIGServices?.userService) {
        this.currentUserRole =
          await window.UMIGServices.userService.getCurrentUser();
        console.log(
          "[TeamsEntityManager] Got user role from UserService:",
          this.currentUserRole?.role,
        );
        return;
      }

      // Fallback chain per ADR-042 authentication context
      let username = null;

      // Try multiple sources for username
      if (window.adminGui?.state?.currentUser?.userCode) {
        username = window.adminGui.state.currentUser.userCode;
      } else if (window.adminGui?.state?.currentUser?.username) {
        username = window.adminGui.state.currentUser.username;
      }

      if (username) {
        try {
          // Use the correct Users API endpoint with proper fallback
          // This endpoint exists and handles authentication properly
          const url = new URL(
            "/rest/scriptrunner/latest/custom/users/current",
            window.location.origin,
          );
          url.searchParams.append("username", username);

          console.log(
            `[TeamsEntityManager] Fetching current user from API with username: ${username}`,
          );

          const response = await fetch(url.toString(), {
            method: "GET",
            headers: window.SecurityUtils.addCSRFProtection({
              "Content-Type": "application/json",
            }),
          });

          if (response.ok) {
            const userData = await response.json();

            // Map API response to expected format
            this.currentUserRole = {
              role: userData.role || "USER",
              userId: userData.userId,
              username: userData.username,
              firstName: userData.firstName,
              lastName: userData.lastName,
              email: userData.email,
              isAdmin: userData.isAdmin || false,
              roleId: userData.roleId,
              isActive: userData.isActive,
              source: "users_api",
            };

            console.log(
              `[TeamsEntityManager] Successfully fetched user from API:`,
              {
                role: this.currentUserRole.role,
                username: this.currentUserRole.username,
                userId: this.currentUserRole.userId,
              },
            );
            return;
          } else {
            const errorText = await response
              .text()
              .catch(() => "Unknown error");
            console.warn(
              `[TeamsEntityManager] Users API call failed (${response.status}): ${response.statusText}`,
              {
                url: url.toString(),
                error: errorText,
              },
            );

            // Continue to admin-gui fallback below
          }
        } catch (apiError) {
          console.warn(
            "[TeamsEntityManager] Error calling Users API:",
            apiError,
          );
          // Continue to admin-gui fallback below
        }

        // Admin-gui fallback when API fails
        console.log(
          "[TeamsEntityManager] Using admin-gui fallback for user role",
        );
        this.currentUserRole = {
          role: window.adminGui?.state?.currentUser?.role || "USER",
          userId: window.adminGui?.state?.currentUser?.userId || "unknown",
          username: username,
          source: "admin_gui_fallback",
        };
      } else {
        console.warn(
          "[TeamsEntityManager] No username available from admin-gui state",
        );
        // Final fallback
        this.currentUserRole = {
          role: "USER",
          userId: "unknown",
          username: "unknown",
          source: "default_fallback",
        };
      }

      console.log(
        "[TeamsEntityManager] Current user role:",
        this.currentUserRole?.role,
        "for user:",
        this.currentUserRole?.username || this.currentUserRole?.userId,
        "source:",
        this.currentUserRole?.source,
      );
    } catch (error) {
      console.warn(
        "[TeamsEntityManager] Failed to get user role, defaulting to USER:",
        error,
      );
      this.currentUserRole = {
        role: "USER",
        userId: "unknown",
        username: "unknown",
        source: "error_fallback",
      };
    }
  }

  /**
   * Configure access controls based on user role
   * @private
   */
  _configureAccessControls() {
    const userRole = this.currentUserRole?.role || "USER";
    const allowedActions = this.accessControls[userRole] || ["view"];

    // Update table actions based on permissions
    if (this.config.tableConfig.actions) {
      this.config.tableConfig.actions.edit = allowedActions.includes("edit");
      this.config.tableConfig.actions.delete =
        allowedActions.includes("delete");
      this.config.tableConfig.actions.members =
        allowedActions.includes("members");
    }

    // Update bulk actions
    if (this.config.tableConfig.bulkActions) {
      this.config.tableConfig.bulkActions.delete =
        allowedActions.includes("bulk");
      this.config.tableConfig.bulkActions.export =
        allowedActions.includes("bulk");
      this.config.tableConfig.bulkActions.setStatus =
        allowedActions.includes("bulk");
    }

    console.log(
      "[TeamsEntityManager] Access controls configured for role:",
      userRole,
    );
  }

  /**
   * Comprehensive input validation using SecurityUtils
   * @param {Object} params - Parameters to validate
   * @param {Object} rules - Validation rules
   * @returns {Promise<void>}
   * @throws {Error} If validation fails
   */
  async _validateInputs(params, rules) {
    // Wait for SecurityUtils to be available (race condition fix)
    const maxWaitTime = 5000; // 5 seconds max wait
    const pollInterval = 100; // Check every 100ms
    let waited = 0;

    while (!window.SecurityUtils && waited < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));
      waited += pollInterval;
    }

    if (!window.SecurityUtils) {
      throw new Error('SecurityUtils not available for input validation');
    }

    // Validate each parameter against its rules
    for (const [paramName, paramValue] of Object.entries(params)) {
      const rule = rules[paramName];
      if (!rule) continue;

      // Check required fields
      if (rule.required && (paramValue === null || paramValue === undefined || paramValue === '')) {
        throw new Error(`${paramName} is required`);
      }

      // Skip further validation for empty optional fields
      if (!rule.required && (paramValue === null || paramValue === undefined || paramValue === '')) {
        continue;
      }

      // Type validation
      if (rule.type) {
        switch (rule.type) {
          case 'string':
            if (typeof paramValue !== 'string') {
              throw new Error(`${paramName} must be a string`);
            }
            break;
          case 'number':
          case 'integer':
            if (typeof paramValue !== 'number' || (rule.type === 'integer' && !Number.isInteger(paramValue))) {
              throw new Error(`${paramName} must be a ${rule.type}`);
            }
            break;
          case 'boolean':
            if (typeof paramValue !== 'boolean') {
              throw new Error(`${paramName} must be a boolean`);
            }
            break;
          case 'email':
            if (typeof paramValue !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(paramValue)) {
              throw new Error(`${paramName} must be a valid email address`);
            }
            break;
        }
      }

      // Length validation for strings
      if (typeof paramValue === 'string') {
        if (rule.minLength && paramValue.length < rule.minLength) {
          throw new Error(`${paramName} must be at least ${rule.minLength} characters`);
        }
        if (rule.maxLength && paramValue.length > rule.maxLength) {
          throw new Error(`${paramName} must not exceed ${rule.maxLength} characters`);
        }
      }

      // Numeric range validation
      if (typeof paramValue === 'number') {
        if (rule.min !== undefined && paramValue < rule.min) {
          throw new Error(`${paramName} must be at least ${rule.min}`);
        }
        if (rule.max !== undefined && paramValue > rule.max) {
          throw new Error(`${paramName} must not exceed ${rule.max}`);
        }
      }

      // Pattern validation
      if (rule.pattern && typeof paramValue === 'string') {
        if (!rule.pattern.test(paramValue)) {
          throw new Error(`${paramName} format is invalid${rule.message ? ': ' + rule.message : ''}`);
        }
      }

      // Custom validation function
      if (rule.validator && typeof rule.validator === 'function') {
        const validationResult = rule.validator(paramValue);
        if (validationResult !== true) {
          throw new Error(validationResult || `${paramName} validation failed`);
        }
      }

      // XSS protection
      if (typeof paramValue === 'string') {
        const sanitizedValue = window.SecurityUtils.sanitizeInput(paramValue);
        if (sanitizedValue !== paramValue) {
          throw new Error(`${paramName} contains potentially unsafe content`);
        }
      }
    }
  }

  /**
   * Rate limiting protection for sensitive operations
   * @param {string} operation - Operation type
   * @param {string} identifier - Unique identifier for rate limiting
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
      entry = {
        count: 0,
        windowStart: now,
      };
      this.rateLimitTracker.set(key, entry);
    }

    // Check if we need to reset the window
    if (now - entry.windowStart >= config.windowMs) {
      entry.count = 0;
      entry.windowStart = now;
    }

    // Check rate limit
    if (entry.count >= config.limit) {
      const resetTime = entry.windowStart + config.windowMs;
      const secondsToReset = Math.ceil((resetTime - now) / 1000);
      throw new Error(
        `Rate limit exceeded for ${operation}. Try again in ${secondsToReset} seconds.`
      );
    }

    // Increment counter
    entry.count++;

    // Clean up old entries periodically
    this._cleanupRateLimitTracker();
  }

  /**
   * Clean up expired rate limit entries
   * @private
   */
  _cleanupRateLimitTracker() {
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
   * Log audit events for security and compliance
   * @param {string} action - Action performed
   * @param {string} entityId - Entity ID affected
   * @param {Object} details - Additional details
   * @private
   */
  _auditLog(action, entityId, details = {}) {
    try {
      const auditEntry = {
        timestamp: new Date().toISOString(),
        action,
        entityType: 'team',
        entityId,
        userId: details.userContext?.performedBy || 'system',
        details: {
          ...details,
          userAgent: navigator.userAgent,
          sessionId: details.userContext?.sessionId,
        },
      };

      this.auditCache.push(auditEntry);

      // Keep only last 1000 entries and rotate old ones
      if (this.auditCache.length > 1000) {
        this.auditCache.splice(0, 100); // Remove oldest 100 entries
      }

      console.log(`[TeamsEntityManager] Audit: ${action} on ${entityId}`, auditEntry);
    } catch (error) {
      console.error('[TeamsEntityManager] Failed to log audit entry:', error);
    }
  }

  /**
   * Track errors for debugging and monitoring
   * @param {string} operation - Operation that failed
   * @param {Error} error - Error object
   * @private
   */
  _trackError(operation, error) {
    try {
      const errorEntry = {
        timestamp: new Date().toISOString(),
        operation,
        error: {
          message: error.message,
          stack: error.stack,
          name: error.name,
        },
        context: {
          userAgent: navigator.userAgent,
          url: window.location.href,
        },
      };

      this.errorLog.push(errorEntry);

      // Keep only last 500 entries
      if (this.errorLog.length > 500) {
        this.errorLog.splice(0, 50); // Remove oldest 50 entries
      }

      console.error(`[TeamsEntityManager] Error in ${operation}:`, errorEntry);
    } catch (logError) {
      console.error('[TeamsEntityManager] Failed to track error:', logError);
    }
  }

  /**
   * Invalidate cache entries
   * @param {string} key - Specific cache key to invalidate (optional)
   * @private
   */
  _invalidateCache(key = null) {
    if (key) {
      this.cache.delete(key);
      this.cache.delete(`team_${key}`);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Check user permission
   * @param {string} action - Action to check
   * @private
   */
  _checkPermission(action) {
    const userRole = this.currentUserRole?.role || "USER";
    const allowedActions = this.accessControls[userRole] || ["view"];

    if (!allowedActions.includes(action)) {
      throw new Error(
        `Access denied: ${action} not allowed for role ${userRole}`,
      );
    }
  }

  /**
   * Setup Teams-specific features
   * @private
   */
  async _setupTeamsSpecificFeatures() {
    try {
      console.log("[TeamsEntityManager] Setting up Teams-specific features");

      // TEMPORARILY DISABLED: Don't add Members tab during initialization
      // The tab interferes with form display in create/edit operations
      // TODO: Add tab dynamically only when needed for member management
      /*
      if (
        this.modalComponent &&
        typeof this.modalComponent.addTab === "function"
      ) {
        try {
          // Add members tab to modal (explicitly not active by default)
          await this.modalComponent.addTab({
            id: "members",
            label: "Members",
            content: this._createMembersTabContent.bind(this),
            active: false, // Ensure Members tab is not active by default
          });
          console.log("[TeamsEntityManager] Members tab added to modal");
        } catch (tabError) {
          console.warn(
            "[TeamsEntityManager] Failed to add members tab:",
            tabError,
          );
          // Continue without members tab
        }
      } else {
        console.log(
          "[TeamsEntityManager] Modal component not available or missing addTab method",
        );
      }
      */

      // Setup Teams-specific event handlers
      try {
        this._setupTeamsEventHandlers();
        console.log("[TeamsEntityManager] Event handlers set up");
      } catch (eventError) {
        console.warn(
          "[TeamsEntityManager] Failed to setup event handlers:",
          eventError,
        );
        // Continue without event handlers
      }

      console.log(
        "[TeamsEntityManager] Teams-specific features setup completed",
      );
    } catch (error) {
      console.error(
        "[TeamsEntityManager] Error in _setupTeamsSpecificFeatures:",
        error,
      );
      throw error;
    }
  }

  /**
   * Create members tab content
   * @param {Object} teamData - Team data (optional, will fallback to modal data)
   * @returns {HTMLElement} Members tab content
   * @private
   */
  _createMembersTabContent(teamData) {
    // If no teamData provided, try to get it from the modal component
    if (!teamData && this.modalComponent && this.modalComponent.formData) {
      teamData = this.modalComponent.formData;
    }

    // Fallback to empty object if still no data
    if (!teamData) {
      teamData = {};
    }

    const container = document.createElement("div");
    container.className = "team-members-container";

    // SECURITY FIX: Use secure DOM creation instead of innerHTML with string interpolation
    const membersHeader = document.createElement("div");
    membersHeader.className = "members-header";

    const headerTitle = document.createElement("h4");
    // XSS PROTECTION: Use textContent instead of innerHTML for dynamic data
    // Handle case where teamData is undefined or missing member_count (e.g., for new teams)
    const memberCount = (teamData && typeof teamData.member_count === 'number') ? teamData.member_count : 0;
    // textContent already provides XSS protection, no need to escape a number
    headerTitle.textContent = `Team Members (${memberCount})`;

    const addButton = document.createElement("button");
    addButton.type = "button";
    addButton.className = "aui-button aui-button-primary";
    addButton.setAttribute("data-action", "add-member");

    const buttonIcon = document.createElement("span");
    buttonIcon.className = "aui-icon aui-icon-small aui-icon-plus";

    const buttonText = document.createTextNode("Add Member");
    addButton.appendChild(buttonIcon);
    addButton.appendChild(document.createTextNode(" "));
    addButton.appendChild(buttonText);

    membersHeader.appendChild(headerTitle);
    membersHeader.appendChild(addButton);

    const membersList = document.createElement("div");
    membersList.className = "members-list";
    // XSS PROTECTION: Sanitize team ID before setting as attribute
    // Handle case where teamData is undefined or missing id (e.g., for new teams)
    const teamId = (teamData && teamData.id) ? teamData.id : '';
    membersList.setAttribute(
      "data-team-id",
      window.SecurityUtils.sanitizeForAttribute(teamId),
    );

    const loadingDiv = document.createElement("div");
    loadingDiv.className = "loading";
    loadingDiv.textContent = "Loading members...";
    membersList.appendChild(loadingDiv);

    container.appendChild(membersHeader);
    container.appendChild(membersList);

    return container;
  }

  /**
   * Setup Teams-specific event handlers
   * @private
   */
  _setupTeamsEventHandlers() {
    if (this.orchestrator) {
      // Handle members action
      this.orchestrator.on("table:members", async (event) => {
        await this._showMembersModal(event.data);
      });

      // Handle bulk operations
      this.orchestrator.on("table:bulk", async (event) => {
        await this.bulkOperation(
          event.operation,
          event.selectedIds,
          event.operationData,
        );
      });
    }
  }

  /**
   * Show members management modal
   * @param {Object} teamData - Team data
   * @private
   */
  async _showMembersModal(teamData) {
    if (this.modalComponent) {
      await this.modalComponent.show({
        mode: "members",
        data: teamData,
        title: `Manage Team Members - ${teamData.tms_name}`,
        size: "large",
        tabs: ["details", "members"],
      });

      // Load members data
      try {
        const members = await this.loadMembers(teamData.id);
        const membersContainer = this.modalComponent
          .getTabContent("members")
          .querySelector(".members-list");
        this._renderMembersList(membersContainer, members);
      } catch (error) {
        console.error(
          "[TeamsEntityManager] Failed to load members for modal:",
          error,
        );
      }
    }
  }

  /**
   * Render members list
   * @param {HTMLElement} container - Container element
   * @param {Array} members - Members array
   * @private
   */
  _renderMembersList(container, members) {
    // Clear container safely
    container.innerHTML = "";

    if (members.length === 0) {
      // SECURITY FIX: Use secure DOM creation instead of innerHTML
      const noMembersDiv = document.createElement("div");
      noMembersDiv.className = "no-members";
      noMembersDiv.textContent = "No members in this team";
      container.appendChild(noMembersDiv);
      return;
    }

    // SECURITY FIX: Create member elements securely using DOM methods
    members.forEach((member) => {
      // Input validation and sanitization
      const validationResult = window.SecurityUtils.validateInput(member, {
        preventXSS: true,
        preventSQLInjection: true,
        sanitizeStrings: true,
      });

      if (!validationResult.isValid) {
        console.warn(
          "[TeamsEntityManager] Invalid member data detected:",
          validationResult.errors,
        );
        return; // Skip this member if validation fails
      }

      const sanitizedMember = validationResult.sanitizedData;

      const memberItem = document.createElement("div");
      memberItem.className = "member-item";
      // XSS PROTECTION: Sanitize user ID before setting as attribute
      memberItem.setAttribute(
        "data-user-id",
        window.SecurityUtils.sanitizeForAttribute(sanitizedMember.userId || ""),
      );

      const memberInfo = document.createElement("div");
      memberInfo.className = "member-info";

      const usernameElement = document.createElement("strong");
      // XSS PROTECTION: Use textContent for dynamic user data
      usernameElement.textContent = sanitizedMember.username || "Unknown User";

      const emailElement = document.createElement("span");
      emailElement.className = "member-email";
      // XSS PROTECTION: Use textContent for email data
      emailElement.textContent = sanitizedMember.email || "";

      memberInfo.appendChild(usernameElement);
      memberInfo.appendChild(document.createTextNode(" "));
      memberInfo.appendChild(emailElement);

      const memberActions = document.createElement("div");
      memberActions.className = "member-actions";

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "aui-button aui-button-subtle";
      removeButton.setAttribute("data-action", "remove-member");
      removeButton.textContent = "Remove";

      memberActions.appendChild(removeButton);

      memberItem.appendChild(memberInfo);
      memberItem.appendChild(memberActions);
      container.appendChild(memberItem);
    });

    // Add event listeners for member actions
    container.addEventListener("click", (e) => {
      if (e.target.dataset.action === "remove-member") {
        const memberItem = e.target.closest(".member-item");
        const userId = memberItem.dataset.userId;
        const teamId = container.dataset.teamId;
        this._confirmRemoveMember(teamId, userId, memberItem);
      }
    });
  }

  /**
   * Confirm member removal
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @param {HTMLElement} memberElement - Member element
   * @private
   */
  async _confirmRemoveMember(teamId, userId, memberElement) {
    if (confirm("Are you sure you want to remove this member from the team?")) {
      try {
        await this.removeMember(teamId, userId);
        memberElement.remove();

        // Update member count in modal
        const membersHeader = memberElement
          .closest(".team-members-container")
          .querySelector(".members-header h4");
        const currentCount =
          parseInt(membersHeader.textContent.match(/\d+/)[0]) - 1;
        membersHeader.textContent = `Team Members (${currentCount})`;
      } catch (error) {
        alert("Failed to remove member: " + error.message);
      }
    }
  }

  /**
   * Bulk delete teams
   * @param {Array} teamIds - Team IDs to delete
   * @returns {Promise<Object>} Delete result
   * @private
   */
  async _bulkDelete(teamIds) {
    // CSRF PROTECTION: Add CSRF token and sanitize bulk delete request
    const requestBody = window.SecurityUtils.preventXSS({ teamIds });

    const response = await fetch(`${this.apiBaseUrl}/bulk/delete`, {
      method: "POST",
      headers: window.SecurityUtils.addCSRFProtection({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Bulk delete failed: ${response.status}`);
    }

    return await response.json();
  }

  /**
   * Bulk export teams
   * @param {Array} teamIds - Team IDs to export
   * @param {Object} options - Export options
   * @returns {Promise<Object>} Export result
   * @private
   */
  async _bulkExport(teamIds, options) {
    // CSRF PROTECTION: Add CSRF token and sanitize bulk export request
    const requestBody = window.SecurityUtils.preventXSS({ teamIds, options });

    const response = await fetch(`${this.apiBaseUrl}/bulk/export`, {
      method: "POST",
      headers: window.SecurityUtils.addCSRFProtection({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Bulk export failed: ${response.status}`);
    }

    // Handle file download
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = options.filename || `teams_export_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    return { success: true, filename: a.download };
  }

  /**
   * Bulk set status for teams
   * @param {Array} teamIds - Team IDs
   * @param {string} status - New status
   * @returns {Promise<Object>} Update result
   * @private
   */
  async _bulkSetStatus(teamIds, status) {
    // CSRF PROTECTION: Add CSRF token and sanitize bulk status request
    const requestBody = window.SecurityUtils.preventXSS({ teamIds, status });

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

    return await response.json();
  }

  // Private Helper Methods for Role Transition Management

  /**
   * Check if user can manage a specific role
   * @param {string} userRole - User's current role
   * @param {string} targetRole - Role being managed
   * @returns {boolean} Whether user can manage the role
   * @private
   */
  _canManageRole(userRole, targetRole) {
    const userLevel = this.roleHierarchy[userRole] || 0;
    const targetLevel = this.roleHierarchy[targetRole] || 0;

    // SUPERADMIN can manage all roles
    if (userRole === "SUPERADMIN") {
      return true;
    }

    // Users can only manage roles below their level
    return userLevel > targetLevel;
  }

  /**
   * Get current member role in team
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Member data with role
   * @private
   */
  async _getCurrentMemberRole(teamId, userId) {
    try {
      const response = await fetch(
        `${this.membersApiUrl}/${encodeURIComponent(teamId)}/${encodeURIComponent(userId)}`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        if (response.status === 404) {
          return { role: "USER" }; // Default role if not found
        }
        throw new Error(`Failed to get member role: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.warn(
        "[TeamsEntityManager] Failed to get current member role:",
        error,
      );
      return { role: "USER" }; // Safe default
    }
  }

  /**
   * Execute role change with database transaction
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @param {string} newRole - New role
   * @param {Object} auditData - Audit data for logging
   * @returns {Promise<Object>} Change result
   * @private
   */
  async _executeRoleChange(teamId, userId, newRole, auditData) {
    const requestBody = window.SecurityUtils.preventXSS({
      teamId,
      userId,
      newRole,
      auditData: {
        changedBy: auditData.changedBy,
        reason: auditData.reason,
        timestamp: auditData.timestamp,
      },
    });

    const response = await fetch(`${this.membersApiUrl}/role`, {
      method: "PUT",
      headers: window.SecurityUtils.addCSRFProtection({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Role change failed: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Add entry to role history
   * @param {string} userId - User ID
   * @param {Object} auditData - Audit data
   * @returns {Promise<void>}
   * @private
   */
  async _addToRoleHistory(userId, auditData) {
    try {
      // Enhanced audit entry for role history
      const historyEntry = {
        ...auditData,
        entryType: "role_change",
        retentionUntil: new Date(
          Date.now() + this.auditRetentionDays * 24 * 60 * 60 * 1000,
        ).toISOString(),
      };

      // Store in audit service if available
      if (window.UMIGServices?.auditService) {
        await window.UMIGServices.auditService.addRoleHistoryEntry(
          userId,
          historyEntry,
        );
      } else {
        // Fallback to API storage
        await fetch(
          `/rest/scriptrunner/latest/custom/users/${encodeURIComponent(userId)}/role-history`,
          {
            method: "POST",
            headers: window.SecurityUtils.addCSRFProtection({
              "Content-Type": "application/json",
            }),
            body: JSON.stringify(historyEntry),
          },
        );
      }
    } catch (error) {
      console.warn(
        "[TeamsEntityManager] Failed to add role history entry:",
        error,
      );
      // Don't fail the main operation for history logging issues
    }
  }

  /**
   * Get user's related entities for permission cascade
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Related entities
   * @private
   */
  async _getUserRelatedEntities(teamId, userId) {
    try {
      const response = await fetch(
        `/rest/scriptrunner/latest/custom/users/${encodeURIComponent(userId)}/related-entities?teamId=${encodeURIComponent(teamId)}`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        console.warn(`Failed to get related entities: ${response.status}`);
        return [];
      }

      const data = await response.json();
      return data.entities || [];
    } catch (error) {
      console.warn(
        "[TeamsEntityManager] Failed to get related entities:",
        error,
      );
      return [];
    }
  }

  /**
   * Update entity permissions for user
   * @param {Object} entity - Entity object
   * @param {string} userId - User ID
   * @param {Array} permissions - Allowed permissions
   * @returns {Promise<Object>} Update result
   * @private
   */
  async _updateEntityPermissions(entity, userId, permissions) {
    const requestBody = window.SecurityUtils.preventXSS({
      entityType: entity.type,
      entityId: entity.id,
      userId,
      permissions,
      updatedBy: this.currentUserRole?.userId,
      timestamp: new Date().toISOString(),
    });

    const response = await fetch(
      `/rest/scriptrunner/latest/custom/permissions/update`,
      {
        method: "PUT",
        headers: window.SecurityUtils.addCSRFProtection({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      throw new Error(
        `Permission update failed for ${entity.type}:${entity.id}`,
      );
    }

    return await response.json();
  }

  /**
   * Validate child entity permissions inherit properly
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @param {string} newRole - New role
   * @returns {Promise<void>}
   * @private
   */
  async _validateChildEntityPermissions(teamId, userId, newRole) {
    try {
      const requestBody = window.SecurityUtils.preventXSS({
        teamId,
        userId,
        newRole,
        validationLevel: "strict",
      });

      const response = await fetch(
        "/rest/scriptrunner/latest/custom/permissions/validate-inheritance",
        {
          method: "POST",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Permission inheritance validation failed: ${error}`);
      }

      const validationResult = await response.json();
      if (!validationResult.valid) {
        throw new Error(
          `Permission inheritance issues detected: ${validationResult.issues?.join(", ")}`,
        );
      }
    } catch (error) {
      console.warn(
        "[TeamsEntityManager] Child entity permission validation failed:",
        error,
      );
      // Log but don't fail the main operation
      this._auditLog("permission_validation_warning", userId, {
        teamId,
        newRole,
        error: error.message,
      });
    }
  }

  // BIDIRECTIONAL RELATIONSHIP MANAGEMENT METHODS

  /**
   * Get all teams for a specific user with membership details
   * @param {string} userId - User ID
   * @param {boolean} includeArchived - Whether to include archived teams
   * @returns {Promise<Array>} List of teams with membership details
   */
  async getTeamsForUser(userId, includeArchived = false) {
    const startTime = performance.now();

    try {
      console.log(`[TeamsEntityManager] Loading teams for user ${userId}`);

      // Security validation
      window.SecurityUtils.validateInput({ userId });

      // Build request URL with parameters
      const params = new URLSearchParams({
        userId: userId,
        includeArchived: includeArchived.toString(),
      });

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/users/${encodeURIComponent(userId)}/teams?${params.toString()}`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load teams for user: ${response.status}`);
      }

      const teams = await response.json();

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("getTeamsForUser", operationTime);

      console.log(
        `[TeamsEntityManager] Loaded ${teams.length} teams for user ${userId} in ${operationTime.toFixed(2)}ms`,
      );

      return teams;
    } catch (error) {
      console.error(
        "[TeamsEntityManager] Failed to load teams for user:",
        error,
      );
      this._trackError("getTeamsForUser", error);
      throw error;
    }
  }

  /**
   * Get all users for a specific team with roles and status
   * @param {string} teamId - Team ID
   * @param {boolean} includeInactive - Whether to include inactive users
   * @returns {Promise<Array>} List of users with their roles and membership details
   */
  async getUsersForTeam(teamId, includeInactive = false) {
    const startTime = performance.now();

    try {
      console.log(`[TeamsEntityManager] Loading users for team ${teamId}`);

      // Security validation
      window.SecurityUtils.validateInput({ teamId });

      // Build request URL with parameters
      const params = new URLSearchParams({
        teamId: teamId,
        includeInactive: includeInactive.toString(),
      });

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/${encodeURIComponent(teamId)}/users?${params.toString()}`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to load users for team: ${response.status}`);
      }

      const users = await response.json();

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("getUsersForTeam", operationTime);

      console.log(
        `[TeamsEntityManager] Loaded ${users.length} users for team ${teamId} in ${operationTime.toFixed(2)}ms`,
      );

      return users;
    } catch (error) {
      console.error(
        "[TeamsEntityManager] Failed to load users for team:",
        error,
      );
      this._trackError("getUsersForTeam", error);
      throw error;
    }
  }

  /**
   * Validate bidirectional relationship integrity between team and user
   * @param {string} teamId - Team ID
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Validation results with details
   */
  async validateRelationshipIntegrity(teamId, userId) {
    const startTime = performance.now();

    try {
      console.log(
        `[TeamsEntityManager] Validating relationship integrity for team ${teamId} and user ${userId}`,
      );

      // Security validation
      window.SecurityUtils.validateInput({ teamId, userId });

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/${encodeURIComponent(teamId)}/users/${encodeURIComponent(userId)}/validate`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to validate relationship integrity: ${response.status}`,
        );
      }

      const validationResult = await response.json();

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("validateRelationshipIntegrity", operationTime);

      // Audit logging for validation results
      this._auditLog("relationship_validation", teamId, {
        userId,
        validationResult,
        operationTime: Math.round(operationTime),
      });

      console.log(
        `[TeamsEntityManager] Relationship validation completed for team ${teamId} and user ${userId}: ${validationResult.isValid ? "Valid" : "Invalid"}`,
      );

      return validationResult;
    } catch (error) {
      console.error(
        "[TeamsEntityManager] Failed to validate relationship integrity:",
        error,
      );
      this._trackError("validateRelationshipIntegrity", error);
      throw error;
    }
  }

  /**
   * Protect against cascade delete by checking for active relationships
   * @param {string} teamId - Team ID to check
   * @returns {Promise<Object>} Protection status and blocking relationships
   */
  async protectCascadeDelete(teamId) {
    const startTime = performance.now();

    try {
      console.log(
        `[TeamsEntityManager] Checking cascade delete protection for team ${teamId}`,
      );

      // Security validation
      window.SecurityUtils.validateInput({ teamId });
      this._checkPermission("delete");

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/${encodeURIComponent(teamId)}/delete-protection`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to check cascade delete protection: ${response.status}`,
        );
      }

      const protectionResult = await response.json();

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("protectCascadeDelete", operationTime);

      // Audit logging for protection check
      this._auditLog("cascade_delete_protection_check", teamId, {
        protectionResult,
        operationTime: Math.round(operationTime),
      });

      console.log(
        `[TeamsEntityManager] Cascade delete protection check completed for team ${teamId}: ${protectionResult.canDelete ? "Can Delete" : "Protected"} (${protectionResult.totalBlockingItems} blocking items)`,
      );

      return protectionResult;
    } catch (error) {
      console.error(
        "[TeamsEntityManager] Failed to check cascade delete protection:",
        error,
      );
      this._trackError("protectCascadeDelete", error);
      throw error;
    }
  }

  /**
   * Soft delete a team by archiving it instead of hard deletion
   * @param {string} teamId - Team ID to soft delete
   * @param {Object} userContext - User context for audit
   * @returns {Promise<Object>} Soft delete results
   */
  async softDeleteTeam(teamId, userContext = {}) {
    const startTime = performance.now();

    try {
      console.log(`[TeamsEntityManager] Soft deleting team ${teamId}`);

      // Security validation
      window.SecurityUtils.validateInput({ teamId });
      this._checkPermission("delete");

      // CSRF PROTECTION: Add CSRF token and sanitize request body
      const requestBody = window.SecurityUtils.preventXSS({
        teamId: teamId,
        archivedBy: userContext.userId || this.currentUserRole?.userId,
        reason: userContext.reason || "Soft delete via admin interface",
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/${encodeURIComponent(teamId)}/soft-delete`,
        {
          method: "PUT",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Failed to soft delete team: ${response.status} - ${error}`,
        );
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
      this._trackPerformance("softDeleteTeam", operationTime);

      // Comprehensive audit logging
      this._auditLog("team_soft_delete", teamId, {
        result,
        userContext,
        operationTime: Math.round(operationTime),
      });

      console.log(
        `[TeamsEntityManager] Team ${teamId} soft deleted successfully`,
      );

      return {
        success: true,
        teamId,
        result,
        operationTime: Math.round(operationTime),
      };
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to soft delete team:", error);
      this._trackError("softDeleteTeam", error);
      throw error;
    }
  }

  /**
   * Restore an archived team
   * @param {string} teamId - Team ID to restore
   * @param {Object} userContext - User context for audit
   * @returns {Promise<Object>} Restore results
   */
  async restoreTeam(teamId, userContext = {}) {
    const startTime = performance.now();

    try {
      console.log(`[TeamsEntityManager] Restoring team ${teamId}`);

      // Security validation
      window.SecurityUtils.validateInput({ teamId });
      this._checkPermission("create"); // Restoring requires create permission

      // CSRF PROTECTION: Add CSRF token and sanitize request body
      const requestBody = window.SecurityUtils.preventXSS({
        teamId: teamId,
        restoredBy: userContext.userId || this.currentUserRole?.userId,
        reason: userContext.reason || "Restore via admin interface",
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/${encodeURIComponent(teamId)}/restore`,
        {
          method: "PUT",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Failed to restore team: ${response.status} - ${error}`,
        );
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
      this._trackPerformance("restoreTeam", operationTime);

      // Comprehensive audit logging
      this._auditLog("team_restore", teamId, {
        result,
        userContext,
        operationTime: Math.round(operationTime),
      });

      console.log(`[TeamsEntityManager] Team ${teamId} restored successfully`);

      return {
        success: true,
        teamId,
        result,
        operationTime: Math.round(operationTime),
      };
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to restore team:", error);
      this._trackError("restoreTeam", error);
      throw error;
    }
  }

  /**
   * Clean up orphaned member relationships
   * @returns {Promise<Object>} Cleanup results and statistics
   */
  async cleanupOrphanedMembers() {
    const startTime = performance.now();

    try {
      console.log(
        `[TeamsEntityManager] Starting cleanup of orphaned member relationships`,
      );

      // Security validation - this is an admin-only operation
      this._checkPermission("bulk"); // Requires bulk operations permission

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/cleanup-orphaned-members`,
        {
          method: "POST",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify({
            initiatedBy: this.currentUserRole?.userId,
            timestamp: new Date().toISOString(),
          }),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Failed to cleanup orphaned members: ${response.status} - ${error}`,
        );
      }

      const cleanupResult = await response.json();

      // Refresh data to reflect changes
      await this.loadData(
        this.currentFilters,
        this.currentSort,
        this.currentPage,
      );

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("cleanupOrphanedMembers", operationTime);

      // Comprehensive audit logging
      this._auditLog("orphaned_members_cleanup", null, {
        cleanupResult,
        operationTime: Math.round(operationTime),
      });

      console.log(
        `[TeamsEntityManager] Orphaned member cleanup completed: ${cleanupResult.totalCleaned} relationships cleaned in ${operationTime.toFixed(2)}ms`,
      );

      return {
        success: true,
        cleanupResult,
        operationTime: Math.round(operationTime),
      };
    } catch (error) {
      console.error(
        "[TeamsEntityManager] Failed to cleanup orphaned members:",
        error,
      );
      this._trackError("cleanupOrphanedMembers", error);
      throw error;
    }
  }

  /**
   * Get comprehensive team relationship statistics
   * @returns {Promise<Object>} Team statistics and relationship health metrics
   */
  async getTeamRelationshipStatistics() {
    const startTime = performance.now();

    try {
      console.log(`[TeamsEntityManager] Loading team relationship statistics`);

      // Security validation
      this._checkPermission("view"); // Basic view permission required

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/relationship-statistics`,
        {
          method: "GET",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
        },
      );

      if (!response.ok) {
        throw new Error(
          `Failed to load team relationship statistics: ${response.status}`,
        );
      }

      const statistics = await response.json();

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("getTeamRelationshipStatistics", operationTime);

      console.log(
        `[TeamsEntityManager] Team relationship statistics loaded in ${operationTime.toFixed(2)}ms`,
      );

      return {
        success: true,
        statistics,
        operationTime: Math.round(operationTime),
      };
    } catch (error) {
      console.error(
        "[TeamsEntityManager] Failed to load team relationship statistics:",
        error,
      );
      this._trackError("getTeamRelationshipStatistics", error);
      throw error;
    }
  }

  /**
   * Batch validate multiple team-user relationships
   * @param {Array} relationships - Array of {teamId, userId} objects
   * @returns {Promise<Object>} Batch validation results
   */
  async batchValidateRelationships(relationships) {
    const startTime = performance.now();

    try {
      console.log(
        `[TeamsEntityManager] Batch validating ${relationships.length} relationships`,
      );

      // Security validation
      window.SecurityUtils.validateInput({ relationships });
      this._checkPermission("view");

      // Validate input structure
      if (!Array.isArray(relationships) || relationships.length === 0) {
        throw new Error("Relationships must be a non-empty array");
      }

      relationships.forEach((rel, index) => {
        if (!rel.teamId || !rel.userId) {
          throw new Error(
            `Invalid relationship at index ${index}: missing teamId or userId`,
          );
        }
      });

      // CSRF PROTECTION: Add CSRF token and sanitize request body
      const requestBody = window.SecurityUtils.preventXSS({
        relationships: relationships,
        validateBy: this.currentUserRole?.userId,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/batch-validate-relationships`,
        {
          method: "POST",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(
          `Failed to batch validate relationships: ${response.status} - ${error}`,
        );
      }

      const validationResults = await response.json();

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance("batchValidateRelationships", operationTime);

      // Audit logging for batch validation
      this._auditLog("batch_relationship_validation", null, {
        relationshipCount: relationships.length,
        validationResults,
        operationTime: Math.round(operationTime),
      });

      console.log(
        `[TeamsEntityManager] Batch validation completed for ${relationships.length} relationships in ${operationTime.toFixed(2)}ms`,
      );

      return {
        success: true,
        validationResults,
        operationTime: Math.round(operationTime),
      };
    } catch (error) {
      console.error(
        "[TeamsEntityManager] Failed to batch validate relationships:",
        error,
      );
      this._trackError("batchValidateRelationships", error);
      throw error;
    }
  }

  /**
   * Track performance metrics for operations
   * @private
   */
  _trackPerformance(operationType, duration) {
    try {
      if (!this.performanceMetrics) {
        this.performanceMetrics = {};
      }

      if (!this.performanceMetrics[operationType]) {
        this.performanceMetrics[operationType] = [];
      }

      this.performanceMetrics[operationType].push({
        duration,
        timestamp: Date.now(),
      });

      // Keep only last 100 entries per operation type
      if (this.performanceMetrics[operationType].length > 100) {
        this.performanceMetrics[operationType].shift();
      }

      // Log if operation is slower than threshold
      const threshold = this.performanceThresholds?.[operationType] || 1000;
      if (duration > threshold) {
        console.warn(
          `[TeamsEntityManager] Performance warning: ${operationType} took ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`,
        );
      }
    } catch (error) {
      console.error(`[TeamsEntityManager] Failed to track performance:`, error);
    }
  }

  /**
   * Log audit events for tracking and compliance
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
        sessionId: this.sessionId,
      };

      // Try to use the audit service if available
      if (window.UMIGServices?.auditService?.log) {
        window.UMIGServices.auditService.log(eventType, entityId, data);
      }

      // Store locally in audit cache
      if (!this.auditCache) {
        this.auditCache = [];
      }

      this.auditCache.push(auditEntry);

      // Keep only last 1000 entries
      if (this.auditCache.length > 1000) {
        this.auditCache.shift();
      }

      // Log to console in development
      if (this.debug) {
        console.log(`[TeamsEntityManager] Audit log: ${eventType}`, auditEntry);
      }
    } catch (error) {
      console.error(`[TeamsEntityManager] Failed to log audit event:`, error);
    }
  }

  /**
   * Track errors for debugging and monitoring
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

      console.error(`[TeamsEntityManager] Error in ${operation}:`, error);
    } catch (trackingError) {
      console.error(
        `[TeamsEntityManager] Failed to track error:`,
        trackingError,
      );
    }
  }

  // ============================================
  // Required BaseEntityManager Override Methods
  // ============================================

  /**
   * Fetch Teams data from API
   * @param {Object} filters - Filter parameters
   * @param {Object} sort - Sort configuration
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise<Object>} API response with teams data
   * @protected
   */
  async _fetchEntityData(filters = {}, sort = null, page = 1, pageSize = 20) {
    try {
      console.log("[TeamsEntityManager] Fetching teams data", {
        filters,
        sort,
        page,
        pageSize,
      });

      // Construct API URL with pagination
      const baseUrl =
        this.teamsApiUrl || "/rest/scriptrunner/latest/custom/teams";
      const params = new URLSearchParams();

      // Force ALL teams for client-side pagination (API defaults to pageSize=50)
      params.append("page", 1);
      params.append("size", 1000); // Large number to ensure we get all teams
      console.log(
        "[TeamsEntityManager] Using client-side pagination - fetching ALL teams (page=1, size=1000)",
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
      console.log("[TeamsEntityManager] API URL:", url);

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
          `Failed to fetch teams: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      console.log(
        `[TeamsEntityManager] Fetched ${data.content ? data.content.length : 0} teams`,
      );

      // Transform response to expected format for CLIENT-SIDE pagination
      const teams = data.content || data || [];
      const totalTeams = data.totalElements || teams.length;

      console.log(
        `[TeamsEntityManager] Client-side pagination: ${totalTeams} total teams loaded`,
      );

      return {
        data: teams,
        total: totalTeams,
        page: 1, // Always page 1 for client-side pagination
        pageSize: totalTeams, // PageSize = total for client-side pagination
      };
    } catch (error) {
      console.error("[TeamsEntityManager] Error fetching teams data:", error);
      throw error;
    }
  }

  /**
   * Create new team via API
   * @param {Object} data - Team data
   * @returns {Promise<Object>} Created team
   * @protected
   */
  async _createEntityData(data) {
    try {
      console.log("[TeamsEntityManager] Creating new team:", data);

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
        throw new Error(`Failed to create team: ${response.status}`);
      }

      const createdTeam = await response.json();
      console.log("[TeamsEntityManager] Team created:", createdTeam);

      // Clear relevant caches
      this._invalidateCache("all");

      return createdTeam;
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to create team:", error);
      throw error;
    }
  }

  /**
   * Update team via API
   * @param {string} id - Team ID
   * @param {Object} data - Updated team data
   * @returns {Promise<Object>} Updated team
   * @protected
   */
  async _updateEntityData(id, data) {
    try {
      console.log("[TeamsEntityManager] Updating team:", id, data);

      // PHASE 1: Filter out read-only fields that shouldn't be sent in updates (matching Users pattern)
      const readOnlyFields = ['tms_id', 'created_at', 'updated_at', 'created_by', 'updated_by', 'member_count', 'app_count'];

      // CRITICAL FIX: Map frontend field names to database field names
      const fieldMapping = {
        'name': 'tms_name',
        'description': 'tms_description',
        'email': 'tms_email',
        'status': 'tms_status'
      };

      const updateData = {};

      // Only include updatable fields (matching TeamRepository expectations - using database field names)
      const updatableFields = ['tms_name', 'tms_description', 'tms_email', 'tms_status'];

      Object.keys(data).forEach(key => {
        // Map frontend field name to database field name
        const dbFieldName = fieldMapping[key] || key;

        if (updatableFields.includes(dbFieldName) && !readOnlyFields.includes(key)) {
          updateData[dbFieldName] = data[key];
        }
      });

      console.log("[TeamsEntityManager] Filtered update data:", updateData);

      // Security validation
      window.SecurityUtils.validateInput({ id, ...updateData });

      const response = await fetch(
        `${this.apiBaseUrl}/${encodeURIComponent(id)}`,
        {
          method: "PUT",
          headers: window.SecurityUtils.addCSRFProtection({
            "Content-Type": "application/json",
          }),
          body: JSON.stringify(updateData),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to update team: ${response.status}`);
      }

      const updatedTeam = await response.json();
      console.log("[TeamsEntityManager] Team updated:", updatedTeam);

      // Clear relevant caches
      this._invalidateCache(id);

      return updatedTeam;
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to update team:", error);
      throw error;
    }
  }

  /**
   * Delete team via API
   * @param {string} id - Team ID
   * @returns {Promise<void>}
   * @protected
   */
  async _deleteEntityData(id) {
    try {
      console.log("[TeamsEntityManager] Deleting team:", id);

      // Security validation
      window.SecurityUtils.validateInput({ id });

      const response = await fetch(
        `${this.apiBaseUrl}/${encodeURIComponent(id)}`,
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
        let errorMessage = `Failed to delete team (${response.status})`;
        let blockingRelationships = null;

        try {
          const errorData = await response.json();
          console.log("[TeamsEntityManager] Delete error response:", errorData);

          if (errorData.error) {
            errorMessage = errorData.error;
          }

          // Extract blocking relationships for user-friendly display
          if (errorData.blocking_relationships) {
            blockingRelationships = errorData.blocking_relationships;
          }
        } catch (parseError) {
          console.warn(
            "[TeamsEntityManager] Could not parse error response:",
            parseError,
          );
          // Use default error message if JSON parsing fails
        }

        // Create a user-friendly error message
        if (response.status === 409 && blockingRelationships) {
          // HTTP 409 Conflict - Team has relationships that prevent deletion
          const relationshipDetails = this._formatBlockingRelationships(
            blockingRelationships,
          );
          const detailedError = new Error(
            `${errorMessage}\n\nThis team cannot be deleted because they are referenced by:\n${relationshipDetails}`,
          );
          detailedError.isConstraintError = true;
          detailedError.blockingRelationships = blockingRelationships;
          throw detailedError;
        } else if (response.status === 404) {
          // HTTP 404 Not Found
          throw new Error("Team not found. It may have already been deleted.");
        } else {
          // Other errors
          throw new Error(errorMessage);
        }
      }

      console.log("[TeamsEntityManager] Team deleted successfully");

      // Clear relevant caches
      this._invalidateCache(id);
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to delete team:", error);
      throw error;
    }
  }

  // ============================================
  // PHASE 2: Modal Form Enhancements - Following Users Pattern
  // ============================================

  /**
   * Handle Add New Team action
   * @public
   */
  handleAdd() {
    console.log("[TeamsEntityManager] Opening Add Team modal");

    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn("[TeamsEntityManager] Modal component not available");
      return;
    }

    // Prevent duplicate modal creation - check if modal is already open
    if (this.modalComponent.isOpen) {
      console.log("[TeamsEntityManager] Modal is already open - ignoring duplicate request");
      return;
    }

    // Clean up any existing legacy modal conflicts
    const legacyModal = document.getElementById("editModal");
    if (legacyModal && legacyModal.style.display !== "none") {
      console.log("[TeamsEntityManager] Hiding conflicting legacy modal");
      legacyModal.style.display = "none";
    }

    // Prepare empty data for new team (matching database schema)
    const newTeamData = {
      tms_name: "",
      tms_description: "",
      tms_email: "",
    };

    // Clear any existing tabs to ensure form mode for Add operation
    if (this.modalComponent.clearTabs) {
      this.modalComponent.clearTabs();
    }

    // Update modal configuration for Add mode
    this.modalComponent.updateConfig({
      title: "Add New Team",
      type: "form",
      mode: "create", // Set mode to create for new teams
      onSubmit: async (formData) => {
        try {
          console.log("[TeamsEntityManager] Submitting new team:", formData);
          const result = await this._createEntityData(formData);
          console.log(
            "[TeamsEntityManager] Team created successfully:",
            result,
          );

          // Refresh the table data
          await this.loadData();

          // Show success message with auto-dismiss
          this._showNotification(
            "success",
            "Team Created",
            `Team ${formData.tms_name} has been created successfully.`
          );

          // Return true to close modal automatically
          return true;
        } catch (error) {
          console.error("[TeamsEntityManager] Error creating team:", error);

          // Show error message (manual dismiss for errors)
          this._showNotification(
            "error",
            "Error Creating Team",
            error.message || "An error occurred while creating the team."
          );

          // Return false to keep modal open with error
          return false;
        }
      },
    });

    // Set form data to default values (like Users does)
    if (this.modalComponent.formData) {
      Object.assign(this.modalComponent.formData, newTeamData);
    }

    // Open the modal
    this.modalComponent.open();
  }

  /**
   * Handle Edit Team action
   * @param {Object} teamData - Team data to edit
   * @public
   */
  handleEdit(teamData) {
    console.log("[TeamsEntityManager] Opening Edit Team modal for:", teamData);

    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn("[TeamsEntityManager] Modal component not available");
      return;
    }

    // Clear any existing tabs to ensure form mode for Edit operation
    if (this.modalComponent.clearTabs) {
      this.modalComponent.clearTabs();
    }

    // Update modal configuration for Edit mode - restore original form without audit fields
    this.modalComponent.updateConfig({
      title: `Edit Team: ${teamData.tms_name}`,
      type: "form",
      mode: "edit", // Set mode to edit for existing teams
      form: this.config.modalConfig.form, // Restore original form config
      buttons: [
        { text: "Cancel", action: "cancel", variant: "secondary" },
        { text: "Save", action: "submit", variant: "primary" },
      ],
      onButtonClick: null, // Clear custom button handler
      onSubmit: async (formData) => {
        try {
          console.log("[TeamsEntityManager] Submitting team update:", formData);
          const result = await this._updateEntityData(
            teamData.tms_id,
            formData,
          );
          console.log(
            "[TeamsEntityManager] Team updated successfully:",
            result,
          );

          // Refresh the table data
          await this.loadData();

          // Show success message with auto-dismiss
          this._showNotification(
            "success",
            "Team Updated",
            `Team ${formData.tms_name} has been updated successfully.`
          );

          // Return true to close modal automatically
          return true;
        } catch (error) {
          console.error("[TeamsEntityManager] Error updating team:", error);

          // Show error message (manual dismiss for errors)
          this._showNotification(
            "error",
            "Error Updating Team",
            error.message || "An error occurred while updating the team."
          );

          // Return false to keep modal open with error
          return false;
        }
      },
    });

    // Clear viewMode flag for edit mode
    this.modalComponent.viewMode = false;

    // Set form data to current team values (like Users does)
    if (this.modalComponent.formData) {
      Object.assign(this.modalComponent.formData, teamData);
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
    console.log("[TeamsEntityManager] Opening View Team modal for:", data);

    // Check if modal component is available
    if (!this.modalComponent) {
      console.warn("[TeamsEntityManager] Modal component not available");
      return;
    }

    // Create enhanced modal configuration for View mode with audit fields
    const viewFormConfig = {
      fields: [
        ...this.config.modalConfig.form.fields, // Original form fields
        // Add team member count information
        {
          name: "team_member_count",
          type: "text",
          label: "Member Count",
          value: data.member_count || "0",
          readonly: true,
        },
        // Add team applications count information
        {
          name: "team_app_count",
          type: "text",
          label: "Applications Count",
          value: data.app_count || "0",
          readonly: true,
        },
        // Add audit information section
        {
          name: "audit_separator",
          type: "separator",
          label: "Audit Information",
          isAuditField: true,
        },
        {
          name: "team_created_at",
          type: "text",
          label: "Created At",
          value: this._formatDateTime(data.created_at || data.created),
          isAuditField: true,
        },
        {
          name: "team_created_by",
          type: "text",
          label: "Created By",
          value: data.created_by || "System",
          isAuditField: true,
        },
        {
          name: "team_updated_at",
          type: "text",
          label: "Last Updated",
          value: this._formatDateTime(data.updated_at || data.updated),
          isAuditField: true,
        },
        {
          name: "team_updated_by",
          type: "text",
          label: "Last Updated By",
          value: data.updated_by || "System",
          isAuditField: true,
        },
      ],
    };

    // Clear any existing tabs to ensure form mode for View operation
    if (this.modalComponent.clearTabs) {
      this.modalComponent.clearTabs();
    }

    // Update modal configuration for View mode
    this.modalComponent.updateConfig({
      title: `View Team: ${data.tms_name}`,
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

    // Set form data to current team values with readonly mode
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
   * Show notification with auto-dismiss for success messages
   * @param {string} type - Notification type (success, error, warning, info)
   * @param {string} title - Notification title
   * @param {string} message - Notification message
   * @param {Object} options - Additional options
   * @private
   */
  _showNotification(type, title, message, options = {}) {
    try {
      console.log(`[TeamsEntityManager] Showing ${type} notification:`, title, message);

      // Try to use ComponentOrchestrator notification system if available
      if (this.orchestrator && typeof this.orchestrator.showNotification === 'function') {
        // Auto-dismiss success notifications after 3 seconds, manual dismiss for errors
        const autoDismiss = type === 'success' ? 3000 : 0;

        this.orchestrator.showNotification({
          type: type,
          title: title,
          message: message,
          autoDismiss: autoDismiss,
        });
        return;
      }

      // Use AUI flag system like BaseEntityManager (consistent with Users)
      if (window.AJS && window.AJS.flag) {
        const flagOptions = {
          type: type,
          title: title,
          body: message
        };

        // Auto-dismiss success notifications after 3 seconds
        // Keep error notifications manual for user attention
        if (type === "success") {
          flagOptions.close = "auto";
          // Create flag and set up auto-dismiss timer
          const flagId = window.AJS.flag(flagOptions);
          // Auto-dismiss after 3000ms (3 seconds) for success notifications
          if (flagId && typeof flagId === 'string') {
            setTimeout(() => {
              try {
                if (window.AJS && window.AJS.flag && window.AJS.flag.close) {
                  window.AJS.flag.close(flagId);
                }
              } catch (closeError) {
                // Silently handle if flag was already closed
                console.debug(`[TeamsEntityManager] Flag already closed or error closing:`, closeError);
              }
            }, 3000);
          }
        } else {
          // Error, warning, info notifications require manual dismissal
          flagOptions.close = "manual";
          window.AJS.flag(flagOptions);
        }
        return;
      }

      // Final fallback to console logging
      console.log(`[TeamsEntityManager] Notification (${type}): ${title} - ${message}`);

      // Show browser alert for critical errors
      if (type === 'error') {
        alert(`${title}: ${message}`);
      }
    } catch (error) {
      console.error('[TeamsEntityManager] Error showing notification:', error);
      // Fallback to console for notification errors
      console.log(`[TeamsEntityManager] Notification (${type}): ${title} - ${message}`);
    }
  }

  /**
   * Format date/time for display in audit fields
   * @param {string|Date} dateValue - Date value to format
   * @returns {string} Formatted date string
   * @private
   */
  _formatDateTime(dateValue) {
    if (!dateValue) {
      return "Not available";
    }

    try {
      const date = new Date(dateValue);
      if (isNaN(date.getTime())) {
        return "Invalid date";
      }

      // Format as: "YYYY-MM-DD HH:MM:SS"
      return date.toLocaleString('en-AU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      });
    } catch (error) {
      console.warn('[TeamsEntityManager] Error formatting date:', error);
      return "Format error";
    }
  }

  /**
   * Invalidate cache for specific team
   * @param {string|string[]} teamId - Team ID(s) to invalidate, or "all" for all cache
   * @private
   */
  _invalidateCache(teamId) {
    if (teamId === "all") {
      // Clear all cache entries
      this.cache.clear();
      console.log("[TeamsEntityManager] All cache entries cleared");
    } else {
      // Remove team-specific cache entries
      const teamIds = Array.isArray(teamId) ? teamId : [teamId];
      for (const [key] of this.cache) {
        for (const id of teamIds) {
          if (key.includes(id)) {
            this.cache.delete(key);
            console.log(`[TeamsEntityManager] Cache entry removed: ${key}`);
          }
        }
      }
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
      team_members: "Team memberships",
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

    return details.length > 0
      ? details.join("\n")
      : "Unknown blocking relationships";
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
      console.log("[TeamsEntityManager] Starting data refresh with visual feedback");
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

      console.log(`[TeamsEntityManager] Data refreshed successfully in ${operationTime.toFixed(2)}ms`);

    } catch (error) {
      console.error("[TeamsEntityManager] Error refreshing data:", error);

      // Restore table opacity on error
      const tableContainer = document.querySelector('#dataTable');
      if (tableContainer) {
        tableContainer.style.opacity = '1';
      }

      // Show error message
      this._showNotification(
        "error",
        "Refresh Failed",
        "Failed to refresh team data. Please try again."
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

      // Update to loading state - use AUI refresh icon with animation
      button.innerHTML = `
        <span class="aui-icon aui-icon-small aui-icon-refresh" style="animation: spin 1s linear infinite;"></span>
        <span>Refreshing...</span>
      `;
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

    const teamCount = this.currentData ? this.currentData.length : 0;
    successIndicator.innerHTML = `
      <strong>✓ Refreshed</strong><br>
      ${teamCount} teams loaded in ${operationTime.toFixed(0)}ms
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
}

// Make available globally for browser compatibility
if (typeof window !== "undefined") {
  window.TeamsEntityManager = TeamsEntityManager;
}

// Already attached to window in previous lines
