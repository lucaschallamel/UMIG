/**
 * StepView RBAC (Role-Based Access Control) System
 *
 * Production-ready security system for step-view with:
 * - Backend integration for user context
 * - Team-based permission resolution
 * - Security audit logging
 * - Zero-trust validation
 *
 * Security Design:
 * - All permissions fetched from secure backend API
 * - No URL parameter overrides allowed
 * - Fallback to minimal permissions on failure
 * - Complete security event logging
 */

class StepViewRBAC {
  constructor(stepView) {
    this.stepView = stepView;
    this.userContext = null;
    this.permissions = null;
    this.stepTeams = null;
    this.initialized = false;

    // Security audit log
    this.securityLog = [];
  }

  /**
   * Initialize RBAC system with backend user context
   * @param {string} stepCode - Step code (e.g., "DEC-001")
   * @returns {boolean} - True if initialization successful
   */
  async initialize(stepCode) {
    try {
      console.log(
        "🔐 StepView RBAC: Initializing security system for step:",
        stepCode,
      );

      // Fetch user context from secure backend API
      const response = await fetch(
        `${this.stepView.config.api.baseUrl}/stepViewApi/userContext?stepCode=${stepCode}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "same-origin",
        },
      );

      if (!response.ok) {
        throw new Error(
          `User context API failed: ${response.status} - ${response.statusText}`,
        );
      }

      this.userContext = await response.json();
      this.permissions = this.userContext.permissions;
      this.stepTeams = this.userContext.stepContext;
      this.initialized = true;

      // Security audit log
      this.logSecurityEvent("rbac_initialized", {
        userId: this.userContext.userId,
        role: this.userContext.role,
        stepCode: stepCode,
        permissionCount: Object.keys(this.permissions).length,
        teamMembershipCount: this.userContext.teamMemberships?.length || 0,
      });

      console.log(
        "🔐 StepView RBAC: Security system initialized successfully",
        {
          userId: this.userContext.userId,
          username: this.userContext.username,
          role: this.userContext.role,
          teams: this.userContext.teamMemberships?.map((t) => t.teamName) || [],
          allowedActions: Object.keys(this.permissions).filter(
            (p) => this.permissions[p],
          ),
        },
      );

      return true;
    } catch (error) {
      console.error(
        "🚨 StepView RBAC: Security system initialization failed:",
        error,
      );

      // Security audit log
      this.logSecurityEvent("rbac_initialization_failed", {
        error: error.message,
        stepCode: stepCode,
      });

      // Secure fallback - minimal permissions for safety
      this.userContext = {
        userId: null,
        username: "anonymous",
        role: null,
        isAdmin: false,
        teamMemberships: [],
        stepContext: {},
        permissions: this.getMinimalPermissions(),
        source: "secure_fallback",
      };
      this.permissions = this.userContext.permissions;
      this.initialized = false;

      console.warn(
        "🔐 StepView RBAC: Applied secure fallback permissions (read-only)",
      );
      return false;
    }
  }

  /**
   * Check if current user has permission for specific feature
   * @param {string} feature - Feature permission key
   * @returns {boolean} - True if user has permission
   */
  hasPermission(feature) {
    // Defensive security check
    if (!this.permissions || typeof this.permissions !== "object") {
      console.error(
        "🚨 RBAC: Permissions object invalid, denying access to:",
        feature,
      );
      this.logSecurityEvent("invalid_permissions_object", { feature });
      return false;
    }

    const hasAccess = this.permissions[feature] === true;

    // Security audit for denied permissions
    if (!hasAccess) {
      console.log(`🔒 RBAC: Permission denied for feature '${feature}'`, {
        user: this.userContext?.username || "anonymous",
        role: this.userContext?.role || "unknown",
        feature: feature,
      });

      this.logSecurityEvent("permission_denied", {
        feature: feature,
        userId: this.userContext?.userId,
        role: this.userContext?.role,
        reason: "insufficient_privileges",
      });
    }

    return hasAccess;
  }

  /**
   * Validate permission and show user feedback if denied
   * @param {string} feature - Feature permission key
   * @param {string} action - Human-readable action description
   * @returns {boolean} - True if permission granted
   */
  validatePermission(feature, action = "perform this action") {
    if (this.hasPermission(feature)) {
      return true;
    }

    this.showPermissionDeniedMessage(action);
    return false;
  }

  /**
   * Show user-friendly permission denied message
   * @param {string} action - Action that was denied
   */
  showPermissionDeniedMessage(action) {
    const roleMessages = {
      null: "This action requires authentication. Please contact your administrator for access.",
      USER: "This action requires elevated permissions. Contact your administrator for PILOT or ADMIN access.",
      PILOT:
        "This action requires ADMIN permissions. Contact your administrator.",
      ADMIN: "Permission denied for security reasons.",
    };

    const message =
      roleMessages[this.userContext?.role] || "Permission denied.";

    // Show user notification
    if (this.stepView.showNotification) {
      this.stepView.showNotification(message, "error");
    } else {
      alert(message);
    }

    console.warn(`🔒 RBAC: User attempted to ${action} without permission:`, {
      user: this.userContext?.username,
      role: this.userContext?.role,
      message: message,
    });
  }

  /**
   * Get minimal security permissions (read-only fallback)
   * @returns {object} - Minimal permissions object
   */
  getMinimalPermissions() {
    return {
      view_step_details: true, // Always allow viewing
      add_comments: false, // Disable for security
      update_step_status: false,
      complete_instructions: false,
      edit_comments: false,
      bulk_operations: false,
      email_step_details: false,
      advanced_controls: false,
      extended_shortcuts: false,
      debug_panel: false,
      force_refresh_cache: false,
      security_logging: false,
    };
  }

  /**
   * Log security events for audit trail
   * @param {string} event - Security event type
   * @param {object} details - Event details
   */
  logSecurityEvent(event, details = {}) {
    const securityEvent = {
      timestamp: new Date().toISOString(),
      event: event,
      userId: this.userContext?.userId || null,
      username: this.userContext?.username || "anonymous",
      role: this.userContext?.role || "unknown",
      sessionId: this.getSessionId(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      details: details,
    };

    // Store in local audit log
    this.securityLog.push(securityEvent);

    // Keep only last 100 events for memory management
    if (this.securityLog.length > 100) {
      this.securityLog.shift();
    }

    // Log to console for immediate visibility
    console.log("🔍 RBAC Security Event:", securityEvent);

    // In production, this could also send to backend audit system
    // this.sendToAuditSystem(securityEvent);
  }

  /**
   * Get user display information for UI
   * @returns {object} - User display info
   */
  getUserDisplayInfo() {
    return {
      role: this.userContext?.role || "UNKNOWN",
      username: this.userContext?.username || "anonymous",
      isAdmin: this.userContext?.isAdmin || false,
      assignedTeams:
        this.userContext?.teamMemberships?.map((t) => t.teamName) || [],
      effectivePermissions: Object.keys(this.permissions || {}).filter(
        (p) => this.permissions[p],
      ),
      initialized: this.initialized,
    };
  }

  /**
   * Get team context for current step
   * @returns {object} - Step team information
   */
  getStepTeamContext() {
    return this.stepTeams || {};
  }

  /**
   * Check if user is member of step's assigned team
   * @returns {boolean} - True if user is assigned team member
   */
  isAssignedTeamMember() {
    if (!this.userContext?.teamMemberships || !this.stepTeams?.assignedTeamId) {
      return false;
    }

    const userTeamIds = this.userContext.teamMemberships.map((t) => t.teamId);
    return userTeamIds.includes(this.stepTeams.assignedTeamId);
  }

  /**
   * Get security audit log (ADMIN only)
   * @returns {array} - Security events log
   */
  getSecurityLog() {
    if (!this.hasPermission("security_logging")) {
      this.logSecurityEvent("unauthorized_security_log_access", {
        reason: "insufficient_privileges",
      });
      return [];
    }

    return this.securityLog;
  }

  /**
   * Validate production security measures
   * @returns {boolean} - True if all security checks pass
   */
  validateProductionSecurity() {
    let isSecure = true;
    const violations = [];

    // Check for development hacks in URL
    const urlParams = new URLSearchParams(window.location.search);
    const bannedParams = ["role", "admin", "debug", "override", "bypass"];

    bannedParams.forEach((param) => {
      if (urlParams.has(param)) {
        violations.push(`Banned URL parameter: ${param}`);
        isSecure = false;
      }
    });

    // Validate RBAC system integrity
    if (!this.permissions) {
      violations.push("RBAC permissions not initialized");
      isSecure = false;
    }

    // Log security violations
    if (violations.length > 0) {
      this.logSecurityEvent("security_violations_detected", {
        violations: violations,
        url: window.location.href,
      });

      console.error("🚨 SECURITY VIOLATIONS DETECTED:", violations);
    }

    return isSecure;
  }

  /**
   * Get session ID for audit trail
   * @returns {string} - Session identifier
   */
  getSessionId() {
    // Simple session ID based on timestamp and random component
    if (!this._sessionId) {
      this._sessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    return this._sessionId;
  }

  /**
   * Clean up RBAC system
   */
  destroy() {
    this.userContext = null;
    this.permissions = null;
    this.stepTeams = null;
    this.initialized = false;

    this.logSecurityEvent("rbac_destroyed", {
      reason: "cleanup",
    });
  }
}

// Export for use in step-view.js
window.StepViewRBAC = StepViewRBAC;
