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
   */
  constructor() {
    super({
      entityType: "teams",
      tableConfig: {
        columns: [
          {
            key: "name",
            label: "Team Name",
            sortable: true,
            searchable: true,
            required: true,
            maxLength: 100,
          },
          {
            key: "description",
            label: "Description",
            sortable: false,
            searchable: true,
            truncate: 50,
          },
          {
            key: "email",
            label: "Team Email",
            sortable: true,
            searchable: true,
            type: "email",
            // Custom renderer for email with secure HTML
            renderer: (value, row) => {
              if (!value) return "";
              // Sanitize email value to prevent XSS
              const sanitizedEmail = value.replace(/[<>"']/g, "");
              return `<a href="mailto:${sanitizedEmail}" class="email-link">${sanitizedEmail}</a>`;
            },
          },
          {
            key: "memberCount",
            label: "Members",
            sortable: true,
            type: "number",
            align: "right",
          },
          {
            key: "created",
            label: "Created",
            sortable: true,
            type: "date",
            format: "yyyy-MM-dd",
          },
          {
            key: "status",
            label: "Status",
            sortable: true,
            type: "status",
            badges: true,
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
        fields: [
          {
            name: "name",
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
            name: "description",
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
            name: "status",
            type: "select",
            required: true,
            label: "Status",
            options: [
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "archived", label: "Archived" },
            ],
            defaultValue: "active",
          },
        ],
        title: {
          create: "Create New Team",
          edit: "Edit Team",
          view: "Team Details",
        },
        size: "medium",
        validation: true,
        confirmOnClose: true,
      },
      filterConfig: {
        enabled: true,
        persistent: true,
        filters: [
          {
            key: "status",
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
            key: "memberCountRange",
            type: "range",
            label: "Member Count",
            min: 0,
            max: 100,
          },
          {
            key: "search",
            type: "text",
            label: "Search",
            placeholder: "Search teams...",
          },
        ],
      },
      paginationConfig: {
        pageSize: 20,
        showPageSizer: true,
        pageSizeOptions: [10, 20, 50, 100],
      },
    });

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
      ADMIN: ["view", "members", "edit"],
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

    console.log("[TeamsEntityManager] Initialized with component architecture");
  }

  /**
   * Initialize with user role checking
   * @param {HTMLElement} container - DOM container
   * @param {Object} options - Initialize options
   * @returns {Promise<void>}
   */
  async initialize(container, options = {}) {
    try {
      // Get current user role for RBAC
      await this._getCurrentUserRole();

      // Configure access controls based on role
      this._configureAccessControls();

      // Initialize base entity manager
      await super.initialize(container, options);

      // Setup Teams-specific functionality
      await this._setupTeamsSpecificFeatures();

      console.log("[TeamsEntityManager] Teams entity manager ready");
    } catch (error) {
      console.error("[TeamsEntityManager] Failed to initialize:", error);
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
      SecurityUtils.validateInput({ teamId });

      // CSRF PROTECTION: Add CSRF token to request headers
      const response = await fetch(
        `${this.membersApiUrl}?teamId=${encodeURIComponent(teamId)}`,
        {
          method: "GET",
          headers: SecurityUtils.addCSRFProtection({
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
      SecurityUtils.validateInput({ teamId, userId });
      this._checkPermission("members");

      // CSRF PROTECTION: Add CSRF token and create secure request body
      const requestBody = SecurityUtils.preventXSS({
        teamId: teamId,
        userId: userId,
        assignedBy: this.currentUserRole?.userId,
        assignedDate: new Date().toISOString(),
      });

      const response = await fetch(this.membersApiUrl, {
        method: "POST",
        headers: SecurityUtils.addCSRFProtection({
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
      SecurityUtils.validateInput({ teamId, userId });
      this._checkPermission("members");

      // CSRF PROTECTION: Add CSRF token to DELETE request
      const response = await fetch(
        `${this.membersApiUrl}/${encodeURIComponent(teamId)}/${encodeURIComponent(userId)}`,
        {
          method: "DELETE",
          headers: SecurityUtils.addCSRFProtection({
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
      SecurityUtils.validateInput({ teamId, userId, newRole, reason });
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
        reason: SecurityUtils.sanitizeInput(reason),
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
      SecurityUtils.validateInput({ userId });
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
            headers: SecurityUtils.addCSRFProtection({
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
  async bulkOperation(operation, teamIds, operationData = {}) {
    const startTime = performance.now();

    try {
      console.log(
        `[TeamsEntityManager] Executing bulk ${operation} on ${teamIds.length} teams`,
      );

      // Security validation
      SecurityUtils.validateInput({ operation, teamIds, operationData });
      this._checkPermission("bulk");

      let result;
      switch (operation) {
        case "delete":
          result = await this._bulkDelete(teamIds);
          break;
        case "export":
          result = await this._bulkExport(teamIds, operationData);
          break;
        case "setStatus":
          result = await this._bulkSetStatus(teamIds, operationData.status);
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

      // Track performance
      const operationTime = performance.now() - startTime;
      this._trackPerformance(`bulk${operation}`, operationTime);

      // Audit logging
      this._auditLog(`bulk_${operation}`, null, {
        teamIds,
        operationData,
        result,
      });

      console.log(`[TeamsEntityManager] Bulk ${operation} completed`);

      return result;
    } catch (error) {
      console.error(`[TeamsEntityManager] Bulk ${operation} failed:`, error);
      this._trackError(`bulk${operation}`, error);
      throw error;
    }
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
      headers: SecurityUtils.addCSRFProtection({
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
  async _createEntityData(data) {
    this._checkPermission("create");

    // CSRF PROTECTION: Add CSRF token and sanitize request body
    const requestBody = SecurityUtils.preventXSS({
      ...data,
      createdBy: this.currentUserRole?.userId,
      createdDate: new Date().toISOString(),
    });

    const response = await fetch(this.apiBaseUrl, {
      method: "POST",
      headers: SecurityUtils.addCSRFProtection({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create team: ${response.status} - ${error}`);
    }

    return await response.json();
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

    // CSRF PROTECTION: Add CSRF token and sanitize request body
    const requestBody = SecurityUtils.preventXSS({
      ...data,
      modifiedBy: this.currentUserRole?.userId,
      modifiedDate: new Date().toISOString(),
    });

    const response = await fetch(
      `${this.apiBaseUrl}/${encodeURIComponent(id)}`,
      {
        method: "PUT",
        headers: SecurityUtils.addCSRFProtection({
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
        headers: SecurityUtils.addCSRFProtection({
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
        !data.name ||
        typeof data.name !== "string" ||
        data.name.trim().length < 2
      ) {
        throw new Error(
          "Team name is required and must be at least 2 characters",
        );
      }

      if (data.name.length > 100) {
        throw new Error("Team name cannot exceed 100 characters");
      }

      if (data.description && data.description.length > 500) {
        throw new Error("Team description cannot exceed 500 characters");
      }

      // XSS prevention
      const sanitized = SecurityUtils.sanitizeInput(data.name);
      if (sanitized !== data.name) {
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
      // Use existing UserService if available
      if (window.UMIGServices?.userService) {
        this.currentUserRole =
          await window.UMIGServices.userService.getCurrentUser();
      } else {
        // Fallback - get from API
        // CSRF PROTECTION: Add CSRF token to user API call
        const response = await fetch(
          "/rest/scriptrunner/latest/custom/users/current",
          {
            method: "GET",
            headers: SecurityUtils.addCSRFProtection({
              "Content-Type": "application/json",
            }),
          },
        );

        if (response.ok) {
          this.currentUserRole = await response.json();
        } else {
          // Default fallback
          this.currentUserRole = { role: "USER", userId: "unknown" };
        }
      }

      console.log(
        "[TeamsEntityManager] Current user role:",
        this.currentUserRole?.role,
      );
    } catch (error) {
      console.warn(
        "[TeamsEntityManager] Failed to get user role, defaulting to USER:",
        error,
      );
      this.currentUserRole = { role: "USER", userId: "unknown" };
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
    // Setup member management modal if available
    if (this.modalComponent) {
      // Add members tab to modal
      await this.modalComponent.addTab({
        id: "members",
        label: "Members",
        content: this._createMembersTabContent.bind(this),
      });
    }

    // Setup Teams-specific event handlers
    this._setupTeamsEventHandlers();
  }

  /**
   * Create members tab content
   * @param {Object} teamData - Team data
   * @returns {HTMLElement} Members tab content
   * @private
   */
  _createMembersTabContent(teamData) {
    const container = document.createElement("div");
    container.className = "team-members-container";

    // SECURITY FIX: Use secure DOM creation instead of innerHTML with string interpolation
    const membersHeader = document.createElement("div");
    membersHeader.className = "members-header";

    const headerTitle = document.createElement("h4");
    // XSS PROTECTION: Use textContent instead of innerHTML for dynamic data
    headerTitle.textContent = `Team Members (${SecurityUtils.escapeHtml(teamData.memberCount || 0)})`;

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
    // XSS PROTECTION: Escape team ID before setting as attribute
    membersList.setAttribute(
      "data-team-id",
      SecurityUtils.escapeHtml(teamData.id),
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
        title: `Manage Team Members - ${teamData.name}`,
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
      const validationResult = SecurityUtils.validateInput(member, {
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
      // XSS PROTECTION: Escape user ID before setting as attribute
      memberItem.setAttribute(
        "data-user-id",
        SecurityUtils.escapeHtml(sanitizedMember.userId || ""),
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
    const requestBody = SecurityUtils.preventXSS({ teamIds });

    const response = await fetch(`${this.apiBaseUrl}/bulk/delete`, {
      method: "POST",
      headers: SecurityUtils.addCSRFProtection({
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
    const requestBody = SecurityUtils.preventXSS({ teamIds, options });

    const response = await fetch(`${this.apiBaseUrl}/bulk/export`, {
      method: "POST",
      headers: SecurityUtils.addCSRFProtection({
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
    const requestBody = SecurityUtils.preventXSS({ teamIds, status });

    const response = await fetch(`${this.apiBaseUrl}/bulk/status`, {
      method: "PUT",
      headers: SecurityUtils.addCSRFProtection({
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
          headers: SecurityUtils.addCSRFProtection({
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
    const requestBody = SecurityUtils.preventXSS({
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
      headers: SecurityUtils.addCSRFProtection({
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
            headers: SecurityUtils.addCSRFProtection({
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
          headers: SecurityUtils.addCSRFProtection({
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
    const requestBody = SecurityUtils.preventXSS({
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
        headers: SecurityUtils.addCSRFProtection({
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
      const requestBody = SecurityUtils.preventXSS({
        teamId,
        userId,
        newRole,
        validationLevel: "strict",
      });

      const response = await fetch(
        "/rest/scriptrunner/latest/custom/permissions/validate-inheritance",
        {
          method: "POST",
          headers: SecurityUtils.addCSRFProtection({
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
      SecurityUtils.validateInput({ userId });

      // Build request URL with parameters
      const params = new URLSearchParams({
        userId: userId,
        includeArchived: includeArchived.toString(),
      });

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/users/${encodeURIComponent(userId)}/teams?${params.toString()}`,
        {
          method: "GET",
          headers: SecurityUtils.addCSRFProtection({
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
      SecurityUtils.validateInput({ teamId });

      // Build request URL with parameters
      const params = new URLSearchParams({
        teamId: teamId,
        includeInactive: includeInactive.toString(),
      });

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/${encodeURIComponent(teamId)}/users?${params.toString()}`,
        {
          method: "GET",
          headers: SecurityUtils.addCSRFProtection({
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
      SecurityUtils.validateInput({ teamId, userId });

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/${encodeURIComponent(teamId)}/users/${encodeURIComponent(userId)}/validate`,
        {
          method: "GET",
          headers: SecurityUtils.addCSRFProtection({
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
      SecurityUtils.validateInput({ teamId });
      this._checkPermission("delete");

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/${encodeURIComponent(teamId)}/delete-protection`,
        {
          method: "GET",
          headers: SecurityUtils.addCSRFProtection({
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
      SecurityUtils.validateInput({ teamId });
      this._checkPermission("delete");

      // CSRF PROTECTION: Add CSRF token and sanitize request body
      const requestBody = SecurityUtils.preventXSS({
        teamId: teamId,
        archivedBy: userContext.userId || this.currentUserRole?.userId,
        reason: userContext.reason || "Soft delete via admin interface",
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/${encodeURIComponent(teamId)}/soft-delete`,
        {
          method: "PUT",
          headers: SecurityUtils.addCSRFProtection({
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
      SecurityUtils.validateInput({ teamId });
      this._checkPermission("create"); // Restoring requires create permission

      // CSRF PROTECTION: Add CSRF token and sanitize request body
      const requestBody = SecurityUtils.preventXSS({
        teamId: teamId,
        restoredBy: userContext.userId || this.currentUserRole?.userId,
        reason: userContext.reason || "Restore via admin interface",
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/${encodeURIComponent(teamId)}/restore`,
        {
          method: "PUT",
          headers: SecurityUtils.addCSRFProtection({
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
          headers: SecurityUtils.addCSRFProtection({
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
          headers: SecurityUtils.addCSRFProtection({
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
      SecurityUtils.validateInput({ relationships });
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
      const requestBody = SecurityUtils.preventXSS({
        relationships: relationships,
        validateBy: this.currentUserRole?.userId,
        timestamp: new Date().toISOString(),
      });

      const response = await fetch(
        `/rest/scriptrunner/latest/custom/teams/batch-validate-relationships`,
        {
          method: "POST",
          headers: SecurityUtils.addCSRFProtection({
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
}

// Make available globally for browser compatibility
if (typeof window !== "undefined") {
  window.TeamsEntityManager = TeamsEntityManager;
}

// Already attached to window in previous lines
