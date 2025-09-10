/**
 * AuthenticationService.js - Enhanced Authentication and Authorization Service
 *
 * US-082-A Phase 1: Foundation Service Layer Implementation
 * Implements 4-level authentication fallback hierarchy per ADR-042
 *
 * Features:
 * - 4-level authentication fallback hierarchy
 * - Role-based access control (RBAC) with 3 user roles
 * - Session management with intelligent caching
 * - Audit logging for security events
 * - Integration with Atlassian Confluence authentication
 * - Graceful session timeout handling
 * - Permission-based authorization system
 *
 * Authentication Hierarchy (ADR-042):
 * 1. ThreadLocal user context (ScriptRunner)
 * 2. Atlassian user session
 * 3. Frontend-provided userId
 * 4. Anonymous fallback with limited access
 *
 * User Roles: SUPERADMIN, ADMIN, PILOT
 *
 * @author GENDEV Security Architect
 * @version 1.0.0
 * @since Sprint 6
 */

/**
 * @typedef {Object} AuthServiceConfig
 * @property {number} sessionTimeout - Session timeout in milliseconds
 * @property {number} cacheTimeout - Cache timeout in milliseconds
 * @property {number} maxCacheEntries - Maximum cache entries
 * @property {boolean} enableAuditLogging - Enable audit logging
 * @property {number} maxAuditEntries - Maximum audit entries
 * @property {string[]} fallbackHierarchy - Authentication fallback hierarchy
 * @property {Object} roleHierarchy - Role hierarchy with numeric levels
 * @property {Object} permissions - Role-based permissions mapping
 * @property {EndpointConfig} endpoints - API endpoint configuration
 */

/**
 * @typedef {Object} EndpointConfig
 * @property {string} getCurrentUser - Get current user endpoint
 * @property {string} getUserById - Get user by ID endpoint
 * @property {string} validateSession - Validate session endpoint
 * @property {string} refreshSession - Refresh session endpoint
 */

/**
 * @typedef {Object} UserData
 * @property {string} userId - User identifier
 * @property {string} [userKey] - User key
 * @property {string} displayName - Display name
 * @property {string} [emailAddress] - Email address
 * @property {string[]} [roles] - User roles
 * @property {string[]} [permissions] - User permissions
 * @property {string} [sessionId] - Session identifier
 * @property {string} [source] - Authentication source
 * @property {boolean} [isAnonymous] - Is anonymous user
 * @property {string[]} [groups] - User groups
 * @property {Object} [properties] - User properties
 */

/**
 * @typedef {Object} AuthenticationContext
 * @property {string} method - Authentication method
 * @property {string} source - Authentication source
 * @property {Object} [details] - Additional details
 */

/**
 * User context class for authentication state
 */
class UserContext {
  /**
   * @param {UserData} data - User data
   */
  constructor(data = {}) {
    this.userId = data.userId || null;
    this.userKey = data.userKey || null;
    this.displayName = data.displayName || "Unknown User";
    this.emailAddress = data.emailAddress || null;
    this.roles = data.roles || [];
    this.permissions = data.permissions || [];
    this.sessionId = data.sessionId || null;
    this.authenticatedAt = data.authenticatedAt || Date.now();
    this.lastActivity = data.lastActivity || Date.now();
    this.source = data.source || "unknown"; // threadlocal, session, frontend, anonymous
    this.isAnonymous = data.isAnonymous || false;
    this.groups = data.groups || [];
    this.properties = data.properties || {};
  }

  /**
   * Check if user has specific role
   * @param {string} role - Role name to check
   * @returns {boolean} Has role
   */
  hasRole(role) {
    return this.roles.includes(role) || this.roles.includes("SUPERADMIN");
  }

  /**
   * Check if user has specific permission
   * @param {string} permission - Permission to check
   * @returns {boolean} Has permission
   */
  hasPermission(permission) {
    return (
      this.permissions.includes(permission) ||
      this.roles.includes("SUPERADMIN") ||
      (this.roles.includes("ADMIN") && !permission.startsWith("system."))
    );
  }

  /**
   * Check if session is still valid
   * @param {number} timeoutMs - Session timeout in milliseconds
   * @returns {boolean} Session is valid
   */
  isSessionValid(timeoutMs = 3600000) {
    // Default 1 hour
    return Date.now() - this.lastActivity < timeoutMs;
  }

  /**
   * Update last activity timestamp
   */
  updateActivity() {
    this.lastActivity = Date.now();
  }

  /**
   * Get user info for display
   * @returns {Object} Display user info
   */
  getDisplayInfo() {
    return {
      userId: this.userId,
      displayName: this.displayName,
      emailAddress: this.emailAddress,
      roles: [...this.roles],
      isAnonymous: this.isAnonymous,
      source: this.source,
      sessionValid: this.isSessionValid(),
    };
  }

  /**
   * Serialize user context for storage
   * @returns {Object} Serialized context
   */
  serialize() {
    return {
      userId: this.userId,
      userKey: this.userKey,
      displayName: this.displayName,
      emailAddress: this.emailAddress,
      roles: [...this.roles],
      permissions: [...this.permissions],
      sessionId: this.sessionId,
      authenticatedAt: this.authenticatedAt,
      lastActivity: this.lastActivity,
      source: this.source,
      isAnonymous: this.isAnonymous,
      groups: [...this.groups],
      properties: { ...this.properties },
    };
  }
}

/**
 * Audit event class for security logging
 */
class AuditEvent {
  constructor(type, userId, details = {}) {
    this.id = this._generateId();
    this.timestamp = Date.now();
    this.type = type; // login, logout, permission_check, role_change, etc.
    this.userId = userId;
    this.details = details;
    this.source = details.source || "unknown";
    this.ipAddress = details.ipAddress || "unknown";
    this.userAgent = details.userAgent || "unknown";
    this.sessionId = details.sessionId || null;
    this.success = details.success !== false; // Default to true
    this.errorMessage = details.errorMessage || null;
  }

  _generateId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  serialize() {
    return {
      id: this.id,
      timestamp: this.timestamp,
      type: this.type,
      userId: this.userId,
      details: { ...this.details },
      source: this.source,
      ipAddress: this.ipAddress,
      userAgent: this.userAgent,
      sessionId: this.sessionId,
      success: this.success,
      errorMessage: this.errorMessage,
    };
  }
}

/**
 * AuthenticationService - Enhanced authentication with 4-level fallback
 * Extends BaseService for service layer integration
 */
class AuthenticationService {
  constructor() {
    // Service properties
    this.name = "AuthenticationService";
    this.dependencies = ["ApiService"]; // Depends on API service for user data
    this.state = "initialized";
    this.metrics = {
      initTime: 0,
      startTime: 0,
      errorCount: 0,
      operationCount: 0,
      authenticationAttempts: 0,
      successfulAuthentications: 0,
      failedAuthentications: 0,
      permissionChecks: 0,
      roleValidations: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };

    /** @type {AuthServiceConfig} */
    this.config = {
      sessionTimeout: 3600000, // 1 hour in milliseconds
      cacheTimeout: 3600000, // 1 hour cache TTL
      maxCacheEntries: 1000,
      enableAuditLogging: true,
      maxAuditEntries: 10000,
      // Performance optimization settings
      fastCacheSize: 500, // Fast cache entries
      tokenCacheTimeout: 1800000, // 30 minutes
      permissionCacheTimeout: 7200000, // 2 hours
      authTimeoutWarningThreshold: 100, // ms
      enablePerformanceOptimization: true,
      adaptiveCaching: true,
      preComputePermissions: true,
      fallbackHierarchy: ["threadlocal", "session", "frontend", "anonymous"],
      roleHierarchy: {
        SUPERADMIN: 3,
        ADMIN: 2,
        PILOT: 1,
        ANONYMOUS: 0,
      },
      permissions: {
        SUPERADMIN: ["*"], // All permissions
        ADMIN: [
          "users.view",
          "users.create",
          "users.edit",
          "users.delete",
          "teams.view",
          "teams.create",
          "teams.edit",
          "teams.delete",
          "projects.view",
          "projects.create",
          "projects.edit",
          "projects.delete",
          "migrations.view",
          "migrations.create",
          "migrations.edit",
          "migrations.delete",
          "system.view",
          "system.config.view",
        ],
        PILOT: [
          "users.view",
          "teams.view",
          "projects.view",
          "migrations.view",
          "migrations.edit",
          "steps.view",
          "steps.edit",
        ],
        ANONYMOUS: ["system.view"],
      },
      endpoints: {
        getCurrentUser: "/users/current",
        getUserById: "/users/{userId}",
        validateSession: "/auth/validate",
        refreshSession: "/auth/refresh",
      },
    };

    // Current user context
    this.currentUser = null;

    // Enhanced cache storage with performance optimizations
    this.userCache = new Map();
    this.roleCache = new Map();
    this.permissionCache = new Map();
    this.sessionCache = new Map();

    // Performance optimization: Fast authentication cache
    this.fastAuthCache = new Map(); // userId -> quick auth result
    this.authTokenCache = new Map(); // token -> user mapping
    this.rolePermissionCache = new Map(); // role -> permissions (pre-computed)

    // Cache management
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      memoryUsage: 0,
    };

    // Audit logging
    this.auditLog = [];
    this.auditStats = {
      totalEvents: 0,
      loginEvents: 0,
      permissionDenials: 0,
      sessionTimeouts: 0,
    };

    // Enhanced performance tracking
    this.authenticationTimes = [];
    this.lastAuthenticationCheck = 0;
    this.performanceMetrics = {
      averageAuthTime: 0,
      fastCacheHits: 0,
      tokenCacheHits: 0,
      permissionCacheHits: 0,
      slowAuthWarnings: 0,
    };

    // Logger (will be injected)
    this.logger = null;

    // API service reference (will be injected)
    this.apiService = null;

    this._log("info", "AuthenticationService initialized");
  }

  /**
   * Initialize service with configuration
   * @param {AuthServiceConfig} config - Service configuration
   * @param {Object} logger - Logger instance
   * @returns {Promise<void>}
   */
  async initialize(config = {}, logger = null) {
    const startTime = performance.now();

    try {
      this._setInitialState(logger);
      this._configureService(config);
      this._setupSubsystems();
      this._completeInitialization(startTime);
    } catch (error) {
      this._handleInitializationError(error);
      throw error;
    }
  }

  /**
   * Set initial service state
   * @param {Object} logger - Logger instance
   * @private
   */
  _setInitialState(logger) {
    this.state = "initializing";
    this.logger = logger;
  }

  /**
   * Configure service with provided settings
   * @param {AuthServiceConfig} config - Service configuration
   * @private
   */
  _configureService(config) {
    this.config = this._mergeConfig(this.config, config);
  }

  /**
   * Setup service subsystems
   * @private
   */
  _setupSubsystems() {
    this._setupCacheCleanup();
    this._setupSessionMonitoring();
    this._initializeAnonymousUser();
  }

  /**
   * Complete initialization process
   * @param {number} startTime - Start time
   * @private
   */
  _completeInitialization(startTime) {
    this.state = "initialized";
    this.metrics.initTime = performance.now() - startTime;
    this._log(
      "info",
      `AuthenticationService initialized in ${this.metrics.initTime.toFixed(2)}ms`,
    );
  }

  /**
   * Handle initialization error
   * @param {Error} error - Initialization error
   * @private
   */
  _handleInitializationError(error) {
    this.state = "error";
    this.metrics.errorCount++;
    this._log("error", "AuthenticationService initialization failed:", error);
  }

  /**
   * Start service operations
   * @returns {Promise<void>}
   */
  async start() {
    const startTime = performance.now();

    try {
      if (this.state !== "initialized") {
        throw new Error(
          `Cannot start AuthenticationService in state: ${this.state}`,
        );
      }

      this.state = "starting";
      this.startTime = Date.now();

      // Get API service reference
      if (window.AdminGuiService) {
        this.apiService = window.AdminGuiService.getService("ApiService");
      } else if (window.ApiService) {
        this.apiService = window.ApiService;
      }

      // Perform initial authentication
      await this._performInitialAuthentication();

      // Start cache monitoring
      this._startCacheMonitoring();

      this.state = "running";
      this.metrics.startTime = performance.now() - startTime;

      this._log(
        "info",
        `AuthenticationService started in ${this.metrics.startTime.toFixed(2)}ms`,
      );
    } catch (error) {
      this.state = "error";
      this.metrics.errorCount++;
      this._log("error", "AuthenticationService start failed:", error);
      throw error;
    }
  }

  /**
   * Stop service operations
   * @returns {Promise<void>}
   */
  async stop() {
    try {
      if (this.state !== "running") {
        this._log(
          "warn",
          `Attempting to stop AuthenticationService in state: ${this.state}`,
        );
        return;
      }

      this.state = "stopping";

      // Stop monitoring intervals
      if (this.cacheCleanupInterval) {
        clearInterval(this.cacheCleanupInterval);
        this.cacheCleanupInterval = null;
      }

      if (this.sessionMonitorInterval) {
        clearInterval(this.sessionMonitorInterval);
        this.sessionMonitorInterval = null;
      }

      if (this.cacheMonitorInterval) {
        clearInterval(this.cacheMonitorInterval);
        this.cacheMonitorInterval = null;
      }

      this.state = "stopped";
      this._log("info", "AuthenticationService stopped successfully");
    } catch (error) {
      this.state = "error";
      this.metrics.errorCount++;
      this._log("error", "AuthenticationService stop failed:", error);
      throw error;
    }
  }

  /**
   * Cleanup service resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      // Clear caches
      this.userCache.clear();
      this.roleCache.clear();
      this.permissionCache.clear();
      this.sessionCache.clear();

      // Clear audit log
      this.auditLog = [];

      // Clear performance tracking
      this.authenticationTimes = [];

      // Clear intervals
      if (this.cacheCleanupInterval) clearInterval(this.cacheCleanupInterval);
      if (this.sessionMonitorInterval)
        clearInterval(this.sessionMonitorInterval);
      if (this.cacheMonitorInterval) clearInterval(this.cacheMonitorInterval);

      this.state = "cleaned";
      this._log("info", "AuthenticationService cleanup completed");
    } catch (error) {
      this.metrics.errorCount++;
      this._log("error", "AuthenticationService cleanup failed:", error);
      throw error;
    }
  }

  /**
   * Get current user using 4-level fallback hierarchy (ADR-042)
   * @param {boolean} refresh - Force refresh from source
   * @returns {Promise<UserContext>} Current user context
   */
  async getCurrentUser(refresh = false) {
    const startTime = performance.now();
    this._updateAuthAttemptMetrics();

    try {
      // Performance optimization: Fast cache check first
      if (this.config.enablePerformanceOptimization && !refresh) {
        const fastCachedUser = this._checkFastAuthCache();
        if (fastCachedUser) {
          this._updatePerformanceMetrics(startTime, "fast_cache");
          return fastCachedUser;
        }
      }

      // Check for cached user
      if (this._canUseCachedUser(refresh)) {
        const cachedUser = this._useCachedUser();
        this._updatePerformanceMetrics(startTime, "standard_cache");
        return cachedUser;
      }

      // Perform authentication through hierarchy with optimization
      const authResult = await this._performOptimizedAuthentication();
      const user = await this._processAuthenticationResult(authResult);

      // Cache optimization: Add to fast cache if frequently accessed
      if (
        this.config.enablePerformanceOptimization &&
        this._shouldCacheInFastAuth(user)
      ) {
        this._addToFastAuthCache(user);
      }

      // Finalize authentication
      this._finalizeAuthentication(user, authResult.source, startTime);

      return user;
    } catch (error) {
      this._updatePerformanceMetrics(startTime, "error");
      return this._handleAuthenticationFailure(error);
    }
  }

  /**
   * Update authentication attempt metrics
   * @private
   */
  _updateAuthAttemptMetrics() {
    this.metrics.authenticationAttempts++;
    this.metrics.operationCount++;
  }

  /**
   * Check if cached user can be used
   * @param {boolean} refresh - Force refresh
   * @returns {boolean} Can use cached user
   * @private
   */
  _canUseCachedUser(refresh) {
    return (
      !refresh &&
      this.currentUser &&
      this.currentUser.isSessionValid(this.config.sessionTimeout)
    );
  }

  /**
   * Use cached user and update metrics
   * @returns {UserContext} Cached user context
   * @private
   */
  _useCachedUser() {
    this.currentUser.updateActivity();
    this.metrics.cacheHits++;
    return this.currentUser;
  }

  /**
   * Perform authentication through fallback hierarchy
   * @returns {Promise<{user: UserContext|null, source: string}>} Authentication result
   * @private
   */
  async _performAuthentication() {
    this.metrics.cacheMisses++;

    for (const source of this.config.fallbackHierarchy) {
      try {
        const user = await this._tryAuthenticationSource(source);
        if (user) {
          this._logSuccessfulAuth(source, user);
          return { user, source };
        }
      } catch (error) {
        this._logFailedAuth(source, error);
        continue;
      }
    }

    // No authentication succeeded, use anonymous
    return {
      user: this._getAnonymousUser(),
      source: "fallback_anonymous",
    };
  }

  /**
   * Try authentication with specific source
   * @param {string} source - Authentication source
   * @returns {Promise<UserContext|null>} User context or null
   * @private
   */
  async _tryAuthenticationSource(source) {
    switch (source) {
      case "threadlocal":
        return await this._getThreadLocalUser();
      case "session":
        return await this._getAtlassianSessionUser();
      case "frontend":
        return await this._getFrontendProvidedUser();
      case "anonymous":
        return this._getAnonymousUser();
      default:
        return null;
    }
  }

  /**
   * Log successful authentication
   * @param {string} source - Authentication source
   * @param {UserContext} user - User context
   * @private
   */
  _logSuccessfulAuth(source, user) {
    this._log("debug", `Authentication successful via ${source}`, {
      userId: user.userId,
      displayName: user.displayName,
    });
  }

  /**
   * Log failed authentication
   * @param {string} source - Authentication source
   * @param {Error} error - Authentication error
   * @private
   */
  _logFailedAuth(source, error) {
    this._log("debug", `Authentication failed for ${source}:`, error.message);
  }

  /**
   * Process authentication result
   * @param {{user: UserContext, source: string}} authResult - Authentication result
   * @returns {Promise<UserContext>} Enhanced user context
   * @private
   */
  async _processAuthenticationResult(authResult) {
    const { user, source } = authResult;

    if (!user) {
      return this._getAnonymousUser();
    }

    // Enhance user with roles and permissions
    const enhancedUser = await this._enhanceUserWithRoles(user);
    enhancedUser.source = source;

    return enhancedUser;
  }

  /**
   * Finalize authentication process
   * @param {UserContext} user - User context
   * @param {string} source - Authentication source
   * @param {number} startTime - Start time
   * @private
   */
  _finalizeAuthentication(user, source, startTime) {
    // Cache the user
    this.currentUser = user;
    this._cacheUser(user);

    // Log authentication event
    this._logAuditEvent("authentication", user.userId, {
      source,
      success: true,
      roles: user.roles,
    });

    // Update metrics
    this.metrics.successfulAuthentications++;
    const authTime = performance.now() - startTime;
    this._updateAuthenticationTimeMetrics(authTime);
  }

  /**
   * Handle authentication failure
   * @param {Error} error - Authentication error
   * @returns {UserContext} Anonymous user context
   * @private
   */
  _handleAuthenticationFailure(error) {
    this.metrics.failedAuthentications++;
    this.metrics.errorCount++;

    this._log("error", "Authentication failed completely:", error);

    // Log failed authentication
    this._logAuditEvent("authentication_failed", null, {
      error: error.message,
      success: false,
    });

    // Return anonymous user as last resort
    const anonymousUser = this._getAnonymousUser();
    this.currentUser = anonymousUser;
    return anonymousUser;
  }

  /**
   * Check if user has specific role with caching
   * @param {string} userId - User ID (optional, uses current user if not provided)
   * @param {string} requiredRole - Required role
   * @returns {Promise<boolean>} Has role
   */
  async hasRole(userId, requiredRole) {
    this.metrics.roleValidations++;
    this.metrics.operationCount++;

    try {
      // Use current user if no userId provided
      if (!userId) {
        const currentUser = await this.getCurrentUser();
        userId = currentUser.userId;

        // Quick check for current user
        return currentUser.hasRole(requiredRole);
      }

      // Check cache first
      const cacheKey = `role:${userId}:${requiredRole}`;
      const cached = this._getCached(this.roleCache, cacheKey);
      if (cached !== null) {
        this.metrics.cacheHits++;
        return cached;
      }

      this.metrics.cacheMisses++;

      // Get user and check role
      const user = await this._getUserById(userId);
      const hasRole = user ? user.hasRole(requiredRole) : false;

      // Cache result
      this._setCached(
        this.roleCache,
        cacheKey,
        hasRole,
        this.config.cacheTimeout,
      );

      // Log permission check
      this._logAuditEvent("role_check", userId, {
        requiredRole,
        hasRole,
        success: true,
      });

      return hasRole;
    } catch (error) {
      this.metrics.errorCount++;
      this._log("error", "Role validation failed:", error);

      this._logAuditEvent("role_check_failed", userId, {
        requiredRole,
        error: error.message,
        success: false,
      });

      return false;
    }
  }

  /**
   * Check if user has specific permission
   * @param {string} userId - User ID (optional)
   * @param {string} entityType - Entity type (e.g., 'users', 'teams')
   * @param {string} operation - Operation (e.g., 'view', 'create', 'edit', 'delete')
   * @returns {Promise<boolean>} Has permission
   */
  async hasPermission(userId, entityType, operation) {
    this.metrics.permissionChecks++;
    this.metrics.operationCount++;

    try {
      const permission = `${entityType}.${operation}`;

      // Use current user if no userId provided
      if (!userId) {
        const currentUser = await this.getCurrentUser();
        userId = currentUser.userId;
        return currentUser.hasPermission(permission);
      }

      // Check cache
      const cacheKey = `perm:${userId}:${permission}`;
      const cached = this._getCached(this.permissionCache, cacheKey);
      if (cached !== null) {
        this.metrics.cacheHits++;
        return cached;
      }

      this.metrics.cacheMisses++;

      // Get user and check permission
      const user = await this._getUserById(userId);
      const hasPermission = user ? user.hasPermission(permission) : false;

      // Cache result
      this._setCached(
        this.permissionCache,
        cacheKey,
        hasPermission,
        this.config.cacheTimeout,
      );

      // Log permission check
      this._logAuditEvent("permission_check", userId, {
        permission,
        hasPermission,
        success: true,
      });

      if (!hasPermission) {
        this.auditStats.permissionDenials++;
      }

      return hasPermission;
    } catch (error) {
      this.metrics.errorCount++;
      this._log("error", "Permission check failed:", error);

      this._logAuditEvent("permission_check_failed", userId, {
        entityType,
        operation,
        error: error.message,
        success: false,
      });

      return false;
    }
  }

  /**
   * Validate current session
   * @returns {Promise<boolean>} Session is valid
   */
  async validateSession() {
    try {
      const currentUser = await this.getCurrentUser(false);

      if (!currentUser || currentUser.isAnonymous) {
        return false;
      }

      // Check session timeout
      if (!currentUser.isSessionValid(this.config.sessionTimeout)) {
        this._handleSessionTimeout(currentUser);
        return false;
      }

      // Validate with server if API service available
      if (this.apiService && this.config.endpoints.validateSession) {
        try {
          const response = await this.apiService.post(
            this.config.endpoints.validateSession,
            {
              userId: currentUser.userId,
              sessionId: currentUser.sessionId,
            },
          );

          if (!response.valid) {
            this._handleSessionInvalidation(
              currentUser,
              "server_validation_failed",
            );
            return false;
          }
        } catch (error) {
          this._log("warn", "Server session validation failed:", error);
          // Don't fail completely on server validation error
        }
      }

      // Update activity
      currentUser.updateActivity();

      return true;
    } catch (error) {
      this.metrics.errorCount++;
      this._log("error", "Session validation failed:", error);
      return false;
    }
  }

  /**
   * Refresh current session
   * @returns {Promise<UserContext>} Refreshed user context
   */
  async refreshSession() {
    try {
      this._log("info", "Refreshing user session");

      // Force refresh from source
      const refreshedUser = await this.getCurrentUser(true);

      // Log session refresh
      this._logAuditEvent("session_refresh", refreshedUser.userId, {
        source: refreshedUser.source,
        success: true,
      });

      return refreshedUser;
    } catch (error) {
      this.metrics.errorCount++;
      this._log("error", "Session refresh failed:", error);

      this._logAuditEvent("session_refresh_failed", null, {
        error: error.message,
        success: false,
      });

      throw error;
    }
  }

  /**
   * Check if entity access is allowed for user role
   * @param {string} userRole - User role
   * @param {string} entityType - Entity type
   * @returns {boolean} Access allowed
   */
  canAccessEntity(userRole, entityType) {
    // Role hierarchy check
    const roleLevel = this.config.roleHierarchy[userRole] || 0;

    // Define entity access requirements
    const entityRequirements = {
      users: 2, // ADMIN or higher
      teams: 2, // ADMIN or higher
      projects: 1, // PILOT or higher
      migrations: 1, // PILOT or higher
      steps: 1, // PILOT or higher
      system: 3, // SUPERADMIN only
      audit: 3, // SUPERADMIN only
    };

    const requiredLevel = entityRequirements[entityType] || 1;
    return roleLevel >= requiredLevel;
  }

  /**
   * Get authentication statistics
   * @returns {Object} Authentication statistics
   */
  getAuthenticationStats() {
    return {
      metrics: { ...this.metrics },
      auditStats: { ...this.auditStats },
      cacheStats: {
        userCacheSize: this.userCache.size,
        roleCacheSize: this.roleCache.size,
        permissionCacheSize: this.permissionCache.size,
        sessionCacheSize: this.sessionCache.size,
      },
      currentUser: this.currentUser ? this.currentUser.getDisplayInfo() : null,
      authenticationTimeAverage: this._calculateAverageAuthTime(),
      sessionTimeoutRate:
        this.auditStats.sessionTimeouts > 0
          ? (this.auditStats.sessionTimeouts / this.auditStats.totalEvents) *
            100
          : 0,
    };
  }

  /**
   * Get audit log entries
   * @param {number} limit - Maximum number of entries
   * @param {string} type - Filter by event type
   * @returns {Array} Audit log entries
   */
  getAuditLog(limit = 100, type = null) {
    let entries = [...this.auditLog];

    if (type) {
      entries = entries.filter((entry) => entry.type === type);
    }

    // Sort by timestamp (most recent first)
    entries.sort((a, b) => b.timestamp - a.timestamp);

    return entries.slice(0, limit).map((entry) => entry.serialize());
  }

  /**
   * Clear audit log
   * @param {number} olderThanMs - Clear entries older than this (optional)
   */
  clearAuditLog(olderThanMs = null) {
    if (olderThanMs) {
      const cutoff = Date.now() - olderThanMs;
      const originalLength = this.auditLog.length;
      this.auditLog = this.auditLog.filter((entry) => entry.timestamp > cutoff);
      const cleared = originalLength - this.auditLog.length;
      this._log(
        "info",
        `Cleared ${cleared} audit log entries older than ${olderThanMs}ms`,
      );
    } else {
      this.auditLog = [];
      this._log("info", "Audit log cleared completely");
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status information
   */
  getHealth() {
    const uptime = this.startTime ? Date.now() - this.startTime : 0;
    const authSuccessRate =
      this.metrics.authenticationAttempts > 0
        ? (this.metrics.successfulAuthentications /
            this.metrics.authenticationAttempts) *
          100
        : 100;

    return {
      name: this.name,
      state: this.state,
      uptime,
      metrics: { ...this.metrics },
      authStats: this.getAuthenticationStats(),
      performance: {
        authSuccessRate,
        averageAuthTime: this._calculateAverageAuthTime(),
        cacheHitRate:
          this.metrics.cacheHits > 0
            ? (this.metrics.cacheHits /
                (this.metrics.cacheHits + this.metrics.cacheMisses)) *
              100
            : 0,
      },
      isHealthy:
        this.state === "running" &&
        authSuccessRate > 90 &&
        this.metrics.errorCount < 50,
    };
  }

  // Private methods

  /**
   * Perform initial authentication on service start
   * @returns {Promise<void>}
   * @private
   */
  async _performInitialAuthentication() {
    try {
      this._log("info", "Performing initial authentication");
      await this.getCurrentUser(false);
    } catch (error) {
      this._log("error", "Initial authentication failed:", error);
      // Don't throw - service should still start with anonymous user
    }
  }

  /**
   * Get user from ThreadLocal context (ScriptRunner)
   * @returns {Promise<UserContext|null>} User context
   * @private
   */
  async _getThreadLocalUser() {
    // In ScriptRunner environment, user context is available via specific APIs
    // This is a simplified implementation - actual implementation would use ScriptRunner APIs
    if (typeof AJS !== "undefined" && AJS.Meta && AJS.Meta.get) {
      const userId = AJS.Meta.get("remote-user");
      if (userId) {
        return new UserContext({
          userId,
          displayName: userId, // Would be enhanced with actual user data
          source: "threadlocal",
          authenticatedAt: Date.now(),
        });
      }
    }

    return null;
  }

  /**
   * Get user from Atlassian session
   * @returns {Promise<UserContext|null>} User context
   * @private
   */
  async _getAtlassianSessionUser() {
    // Use Atlassian JavaScript API to get current user
    if (typeof AJS !== "undefined" && AJS.params) {
      const userId = AJS.params.remoteUser;
      if (userId) {
        // Get additional user details if API service available
        if (this.apiService) {
          try {
            const userDetails = await this.apiService.get(
              this.config.endpoints.getCurrentUser,
            );

            return new UserContext({
              userId: userDetails.key || userId,
              userKey: userDetails.key,
              displayName: userDetails.displayName,
              emailAddress: userDetails.emailAddress,
              source: "session",
              authenticatedAt: Date.now(),
              groups: userDetails.groups || [],
              properties: userDetails.properties || {},
            });
          } catch (error) {
            this._log("warn", "Failed to get user details from API:", error);
          }
        }

        return new UserContext({
          userId,
          displayName: userId,
          source: "session",
          authenticatedAt: Date.now(),
        });
      }
    }

    return null;
  }

  /**
   * Get user provided by frontend
   * @returns {Promise<UserContext|null>} User context
   * @private
   */
  async _getFrontendProvidedUser() {
    // Check for user ID provided by frontend JavaScript
    if (
      window.AdminGuiState &&
      typeof window.AdminGuiState.getCurrentUser === "function"
    ) {
      try {
        const frontendUser = window.AdminGuiState.getCurrentUser();
        if (frontendUser && frontendUser.userId) {
          return new UserContext({
            userId: frontendUser.userId,
            displayName: frontendUser.displayName || frontendUser.userId,
            emailAddress: frontendUser.emailAddress,
            source: "frontend",
            authenticatedAt: Date.now(),
          });
        }
      } catch (error) {
        this._log("debug", "Frontend user retrieval failed:", error);
      }
    }

    // Check for user in localStorage/sessionStorage
    try {
      const storedUser = localStorage.getItem("umig_current_user");
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        return new UserContext({
          ...userData,
          source: "frontend",
          authenticatedAt: userData.authenticatedAt || Date.now(),
        });
      }
    } catch (error) {
      this._log("debug", "Stored user retrieval failed:", error);
    }

    return null;
  }

  /**
   * Get anonymous user fallback
   * @returns {UserContext} Anonymous user context
   * @private
   */
  _getAnonymousUser() {
    return new UserContext({
      userId: "anonymous",
      displayName: "Anonymous User",
      roles: ["ANONYMOUS"],
      isAnonymous: true,
      source: "anonymous",
      authenticatedAt: Date.now(),
    });
  }

  /**
   * Initialize anonymous user on service init
   * @private
   */
  _initializeAnonymousUser() {
    if (!this.currentUser) {
      this.currentUser = this._getAnonymousUser();
    }
  }

  /**
   * Enhance user with roles and permissions
   * @param {UserContext} user - User context to enhance
   * @returns {Promise<UserContext>} Enhanced user context
   * @private
   */
  async _enhanceUserWithRoles(user) {
    if (!user || user.isAnonymous) {
      return user;
    }

    try {
      // Get user roles (this would typically come from API or user service)
      const userRoles = await this._getUserRoles(user.userId);
      user.roles = userRoles;

      // Calculate permissions based on roles
      const permissions = new Set();

      userRoles.forEach((role) => {
        const rolePermissions = this.config.permissions[role] || [];
        rolePermissions.forEach((permission) => {
          if (permission === "*") {
            // SUPERADMIN gets all permissions
            Object.values(this.config.permissions)
              .flat()
              .forEach((p) => {
                if (p !== "*") permissions.add(p);
              });
          } else {
            permissions.add(permission);
          }
        });
      });

      user.permissions = Array.from(permissions);

      return user;
    } catch (error) {
      this._log("warn", "Failed to enhance user with roles:", error);

      // Fallback to basic role
      user.roles = ["PILOT"];
      user.permissions = this.config.permissions["PILOT"] || [];

      return user;
    }
  }

  /**
   * Get user roles from API or cache
   * @param {string} userId - User ID
   * @returns {Promise<Array>} User roles
   * @private
   */
  async _getUserRoles(userId) {
    // Check cache first
    const cacheKey = `user_roles:${userId}`;
    const cached = this._getCached(this.userCache, cacheKey);
    if (cached !== null) {
      this.metrics.cacheHits++;
      return cached;
    }

    this.metrics.cacheMisses++;

    try {
      // Get from API service if available
      if (this.apiService && this.config.endpoints.getUserById) {
        const endpoint = this.config.endpoints.getUserById.replace(
          "{userId}",
          userId,
        );
        const userData = await this.apiService.get(endpoint);

        const roles = userData.roles || ["PILOT"]; // Default role

        // Cache the result
        this._setCached(
          this.userCache,
          cacheKey,
          roles,
          this.config.cacheTimeout,
        );

        return roles;
      }
    } catch (error) {
      this._log("warn", `Failed to get roles for user ${userId}:`, error);
    }

    // Fallback to default role
    return ["PILOT"];
  }

  /**
   * Get user by ID
   * @param {string} userId - User ID
   * @returns {Promise<UserContext|null>} User context
   * @private
   */
  async _getUserById(userId) {
    // Return current user if matching
    if (this.currentUser && this.currentUser.userId === userId) {
      return this.currentUser;
    }

    // Check cache
    const cacheKey = `user:${userId}`;
    const cached = this._getCached(this.userCache, cacheKey);
    if (cached !== null) {
      this.metrics.cacheHits++;
      return cached;
    }

    this.metrics.cacheMisses++;

    try {
      if (this.apiService && this.config.endpoints.getUserById) {
        const endpoint = this.config.endpoints.getUserById.replace(
          "{userId}",
          userId,
        );
        const userData = await this.apiService.get(endpoint);

        const user = new UserContext({
          userId: userData.userId || userData.key,
          userKey: userData.key,
          displayName: userData.displayName,
          emailAddress: userData.emailAddress,
          roles: userData.roles || ["PILOT"],
          authenticatedAt: Date.now(),
          source: "api",
        });

        // Enhance with permissions
        const enhancedUser = await this._enhanceUserWithRoles(user);

        // Cache the result
        this._setCached(
          this.userCache,
          cacheKey,
          enhancedUser,
          this.config.cacheTimeout,
        );

        return enhancedUser;
      }
    } catch (error) {
      this._log("warn", `Failed to get user ${userId}:`, error);
    }

    return null;
  }

  /**
   * Handle session timeout
   * @param {UserContext} user - User context
   * @private
   */
  _handleSessionTimeout(user) {
    this._log("info", `Session timeout for user: ${user.userId}`);

    // Log audit event
    this._logAuditEvent("session_timeout", user.userId, {
      lastActivity: user.lastActivity,
      timeout: this.config.sessionTimeout,
    });

    // Update stats
    this.auditStats.sessionTimeouts++;

    // Clear current user (will fallback to anonymous)
    this.currentUser = this._getAnonymousUser();

    // Clear related caches
    this._clearUserRelatedCache(user.userId);

    // Notify user (if notification service available)
    if (window.AdminGuiService) {
      const notificationService = window.AdminGuiService.getService(
        "NotificationService",
      );
      if (notificationService) {
        notificationService.showWarning(
          "Your session has expired. Please refresh the page to continue.",
          { persistent: true },
        );
      }
    }
  }

  /**
   * Handle session invalidation
   * @param {UserContext} user - User context
   * @param {string} reason - Invalidation reason
   * @private
   */
  _handleSessionInvalidation(user, reason) {
    this._log("warn", `Session invalidated for user ${user.userId}: ${reason}`);

    // Log audit event
    this._logAuditEvent("session_invalidated", user.userId, {
      reason,
      lastActivity: user.lastActivity,
    });

    // Clear current user
    this.currentUser = this._getAnonymousUser();

    // Clear related caches
    this._clearUserRelatedCache(user.userId);
  }

  /**
   * Clear user-related cache entries
   * @param {string} userId - User ID
   * @private
   */
  _clearUserRelatedCache(userId) {
    const keysToDelete = [];

    // Check all caches for user-related entries
    [
      this.userCache,
      this.roleCache,
      this.permissionCache,
      this.sessionCache,
    ].forEach((cache) => {
      for (const key of cache.keys()) {
        if (key.includes(userId)) {
          keysToDelete.push({ cache, key });
        }
      }
    });

    // Delete the entries
    keysToDelete.forEach(({ cache, key }) => {
      cache.delete(key);
    });

    this._log(
      "debug",
      `Cleared ${keysToDelete.length} cache entries for user ${userId}`,
    );
  }

  /**
   * Cache a value with TTL
   * @param {Map} cache - Cache map
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   * @private
   */
  _setCached(cache, key, value, ttl) {
    // Check cache size limit
    if (cache.size >= this.config.maxCacheEntries) {
      // Remove oldest entry
      const firstKey = cache.keys().next().value;
      if (firstKey) {
        cache.delete(firstKey);
      }
    }

    const entry = {
      value,
      timestamp: Date.now(),
      ttl,
    };

    cache.set(key, entry);
  }

  /**
   * Get cached value
   * @param {Map} cache - Cache map
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   * @private
   */
  _getCached(cache, key) {
    const entry = cache.get(key);
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Cache user context
   * @param {UserContext} user - User context to cache
   * @private
   */
  _cacheUser(user) {
    const cacheKey = `user:${user.userId}`;
    this._setCached(this.userCache, cacheKey, user, this.config.cacheTimeout);

    // Also cache roles and permissions
    const roleKey = `user_roles:${user.userId}`;
    this._setCached(
      this.userCache,
      roleKey,
      user.roles,
      this.config.cacheTimeout,
    );
  }

  /**
   * Log audit event
   * @param {string} type - Event type
   * @param {string} userId - User ID
   * @param {Object} details - Event details
   * @private
   */
  _logAuditEvent(type, userId, details = {}) {
    if (!this.config.enableAuditLogging) {
      return;
    }

    const event = new AuditEvent(type, userId, {
      ...details,
      userAgent: navigator.userAgent,
      sessionId: this.currentUser ? this.currentUser.sessionId : null,
    });

    this.auditLog.push(event);

    // Keep audit log bounded
    if (this.auditLog.length > this.config.maxAuditEntries) {
      this.auditLog.shift();
    }

    // Update audit statistics
    this.auditStats.totalEvents++;
    if (type.includes("login")) {
      this.auditStats.loginEvents++;
    }

    this._log("debug", `Audit event: ${type}`, event.serialize());
  }

  /**
   * Update authentication time metrics
   * @param {number} authTime - Authentication time in milliseconds
   * @private
   */
  _updateAuthenticationTimeMetrics(authTime) {
    this.authenticationTimes.push({
      timestamp: Date.now(),
      duration: authTime,
    });

    // Keep only last 100 entries
    if (this.authenticationTimes.length > 100) {
      this.authenticationTimes.shift();
    }
  }

  /**
   * Calculate average authentication time
   * @returns {number} Average time in milliseconds
   * @private
   */
  _calculateAverageAuthTime() {
    if (this.authenticationTimes.length === 0) {
      return 0;
    }

    const sum = this.authenticationTimes.reduce(
      (acc, entry) => acc + entry.duration,
      0,
    );
    return sum / this.authenticationTimes.length;
  }

  /**
   * Setup cache cleanup interval
   * @private
   */
  _setupCacheCleanup() {
    this.cacheCleanupInterval = setInterval(() => {
      this._cleanupExpiredCache();
    }, 300000); // Every 5 minutes
  }

  /**
   * Setup session monitoring
   * @private
   */
  _setupSessionMonitoring() {
    this.sessionMonitorInterval = setInterval(() => {
      this._checkSessionValidity();
    }, 60000); // Every minute
  }

  /**
   * Start cache monitoring
   * @private
   */
  _startCacheMonitoring() {
    if (this.cacheMonitorInterval) {
      clearInterval(this.cacheMonitorInterval);
    }

    this.cacheMonitorInterval = setInterval(() => {
      this._monitorCacheHealth();
    }, 300000); // Every 5 minutes
  }

  /**
   * Cleanup expired cache entries
   * @private
   */
  _cleanupExpiredCache() {
    const caches = [
      { name: "user", cache: this.userCache },
      { name: "role", cache: this.roleCache },
      { name: "permission", cache: this.permissionCache },
      { name: "session", cache: this.sessionCache },
    ];

    let totalCleaned = 0;

    caches.forEach(({ name, cache }) => {
      const keysToDelete = [];
      const now = Date.now();

      for (const [key, entry] of cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => cache.delete(key));
      totalCleaned += keysToDelete.length;

      if (keysToDelete.length > 0) {
        this._log(
          "debug",
          `Cleaned ${keysToDelete.length} expired entries from ${name} cache`,
        );
      }
    });

    if (totalCleaned > 0) {
      this._log("info", `Cleaned ${totalCleaned} expired cache entries total`);
    }
  }

  /**
   * Check session validity periodically
   * @private
   */
  async _checkSessionValidity() {
    if (this.currentUser && !this.currentUser.isAnonymous) {
      try {
        const isValid = await this.validateSession();
        if (!isValid) {
          this._log("info", "Session validation failed during periodic check");
        }
      } catch (error) {
        this._log("warn", "Periodic session validation failed:", error);
      }
    }
  }

  /**
   * Monitor cache health
   * @private
   */
  _monitorCacheHealth() {
    const caches = [
      { name: "user", cache: this.userCache },
      { name: "role", cache: this.roleCache },
      { name: "permission", cache: this.permissionCache },
      { name: "session", cache: this.sessionCache },
    ];

    caches.forEach(({ name, cache }) => {
      const size = cache.size;
      const limit = this.config.maxCacheEntries;

      if (size > limit * 0.8) {
        this._log(
          "warn",
          `${name} cache size approaching limit: ${size}/${limit}`,
        );
      }
    });

    // Log cache statistics
    const stats = this.getAuthenticationStats();
    this._log("debug", "Cache health check:", stats.cacheStats);
  }

  /**
   * Deep merge configuration objects
   * @param {Object} target - Target configuration
   * @param {Object} source - Source configuration
   * @returns {Object} Merged configuration
   * @private
   */
  _mergeConfig(target, source) {
    const result = { ...target };

    Object.keys(source).forEach((key) => {
      if (
        source[key] &&
        typeof source[key] === "object" &&
        !Array.isArray(source[key])
      ) {
        result[key] = this._mergeConfig(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    });

    return result;
  }

  /**
   * Log message using injected logger or console
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} data - Additional data
   * @private
   */
  _log(level, message, data = null) {
    if (this.logger && typeof this.logger[level] === "function") {
      this.logger[level](`[AuthenticationService] ${message}`, data);
    } else {
      // Fallback to console
      console[level](`[AuthenticationService] ${message}`, data || "");
    }
  }

  // Performance Optimization Helper Methods

  /**
   * Check fast authentication cache for quick user retrieval
   * @returns {UserContext|null} Cached user or null
   * @private
   */
  _checkFastAuthCache() {
    if (!this.fastAuthCache.size) return null;

    // Simple check for current user in fast cache
    const currentUserId = this._getCurrentUserIdHint();
    if (currentUserId) {
      const cached = this.fastAuthCache.get(currentUserId);
      if (cached && this._isFastCacheValid(cached)) {
        this.performanceMetrics.fastCacheHits++;
        this.cacheStats.hits++;
        return cached.user;
      }
    }

    return null;
  }

  /**
   * Get current user ID hint from various sources
   * @returns {string|null} User ID hint
   * @private
   */
  _getCurrentUserIdHint() {
    // Try to get user ID from various fast sources
    if (this.currentUser && !this.currentUser.isAnonymous) {
      return this.currentUser.userId;
    }

    // Try DOM storage
    if (typeof sessionStorage !== "undefined") {
      return sessionStorage.getItem("umig_user_id");
    }

    return null;
  }

  /**
   * Check if fast cache entry is still valid
   * @param {Object} cacheEntry - Cache entry to validate
   * @returns {boolean} Is valid
   * @private
   */
  _isFastCacheValid(cacheEntry) {
    const now = Date.now();
    return now - cacheEntry.timestamp < this.config.tokenCacheTimeout;
  }

  /**
   * Perform optimized authentication with caching improvements
   * @returns {Promise<{user: UserContext|null, source: string}>} Authentication result
   * @private
   */
  async _performOptimizedAuthentication() {
    this.metrics.cacheMisses++;

    for (const source of this.config.fallbackHierarchy) {
      try {
        // Check if we have a cached auth token for this source
        const cachedToken = this._getCachedAuthToken(source);
        if (cachedToken) {
          const user = await this._validateCachedToken(cachedToken, source);
          if (user) {
            this.performanceMetrics.tokenCacheHits++;
            this._logSuccessfulAuth(source, user);
            return { user, source };
          }
        }

        // Standard authentication attempt
        const user = await this._tryAuthenticationSource(source);
        if (user) {
          // Cache the authentication token if available
          this._cacheAuthToken(source, user);
          this._logSuccessfulAuth(source, user);
          return { user, source };
        }
      } catch (error) {
        this._logFailedAuth(source, error);
        continue;
      }
    }

    // No authentication succeeded, use anonymous
    return {
      user: this._getAnonymousUser(),
      source: "anonymous",
    };
  }

  /**
   * Get cached authentication token for source
   * @param {string} source - Authentication source
   * @returns {string|null} Cached token
   * @private
   */
  _getCachedAuthToken(source) {
    const tokenKey = `auth_token_${source}`;
    const cached = this.authTokenCache.get(tokenKey);

    if (cached && this._isFastCacheValid(cached)) {
      return cached.token;
    }

    return null;
  }

  /**
   * Validate cached authentication token
   * @param {string} token - Token to validate
   * @param {string} source - Authentication source
   * @returns {Promise<UserContext|null>} User if valid
   * @private
   */
  async _validateCachedToken(token, source) {
    try {
      // This would typically make a lightweight API call to validate the token
      // For now, we'll assume the token is valid if it exists in cache
      const tokenKey = `auth_token_${source}`;
      const cached = this.authTokenCache.get(tokenKey);

      if (cached && cached.user) {
        return cached.user;
      }
    } catch (error) {
      this._log("warn", `Token validation failed for ${source}:`, error);
    }

    return null;
  }

  /**
   * Cache authentication token for future use
   * @param {string} source - Authentication source
   * @param {UserContext} user - Authenticated user
   * @private
   */
  _cacheAuthToken(source, user) {
    if (!this.config.enablePerformanceOptimization) return;

    const tokenKey = `auth_token_${source}`;
    const cacheEntry = {
      token: user.sessionId || `${source}_${user.userId}`,
      user: user,
      timestamp: Date.now(),
      source: source,
    };

    // Manage cache size
    if (this.authTokenCache.size >= this.config.maxCacheEntries) {
      this._evictOldestTokenCacheEntry();
    }

    this.authTokenCache.set(tokenKey, cacheEntry);
  }

  /**
   * Check if user should be cached in fast authentication cache
   * @param {UserContext} user - User to check
   * @returns {boolean} Should cache
   * @private
   */
  _shouldCacheInFastAuth(user) {
    return (
      !user.isAnonymous &&
      this.fastAuthCache.size < this.config.fastCacheSize &&
      user.userId
    );
  }

  /**
   * Add user to fast authentication cache
   * @param {UserContext} user - User to cache
   * @private
   */
  _addToFastAuthCache(user) {
    if (this.fastAuthCache.size >= this.config.fastCacheSize) {
      this._evictOldestFastCacheEntry();
    }

    this.fastAuthCache.set(user.userId, {
      user: user,
      timestamp: Date.now(),
      accessCount: 1,
    });

    // Store user ID hint for quick access
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("umig_user_id", user.userId);
    }
  }

  /**
   * Evict oldest entry from fast authentication cache
   * @private
   */
  _evictOldestFastCacheEntry() {
    if (this.fastAuthCache.size === 0) return;

    const oldestKey = this.fastAuthCache.keys().next().value;
    this.fastAuthCache.delete(oldestKey);
    this.cacheStats.evictions++;
  }

  /**
   * Evict oldest entry from auth token cache
   * @private
   */
  _evictOldestTokenCacheEntry() {
    if (this.authTokenCache.size === 0) return;

    const oldestKey = this.authTokenCache.keys().next().value;
    this.authTokenCache.delete(oldestKey);
    this.cacheStats.evictions++;
  }

  /**
   * Update performance metrics with timing and operation type
   * @param {number} startTime - Operation start time
   * @param {string} operationType - Type of operation
   * @private
   */
  _updatePerformanceMetrics(startTime, operationType) {
    const authTime = performance.now() - startTime;

    // Track authentication times
    this.authenticationTimes.push(authTime);
    if (this.authenticationTimes.length > 100) {
      this.authenticationTimes.shift(); // Keep sliding window
    }

    // Calculate running average
    const sum = this.authenticationTimes.reduce((a, b) => a + b, 0);
    this.performanceMetrics.averageAuthTime =
      sum / this.authenticationTimes.length;

    // Track slow authentication warnings
    if (authTime > this.config.authTimeoutWarningThreshold) {
      this.performanceMetrics.slowAuthWarnings++;
      this._log(
        "warn",
        `Slow authentication detected: ${authTime.toFixed(2)}ms for ${operationType}`,
      );
    }

    // Update operation-specific metrics
    switch (operationType) {
      case "fast_cache":
        this.performanceMetrics.fastCacheHits++;
        break;
      case "token_cache":
        this.performanceMetrics.tokenCacheHits++;
        break;
      case "permission_cache":
        this.performanceMetrics.permissionCacheHits++;
        break;
    }
  }

  /**
   * Get comprehensive performance statistics
   * @returns {Object} Performance statistics
   */
  getPerformanceStats() {
    return {
      authentication: {
        totalAttempts: this.metrics.authenticationAttempts,
        successfulAuth: this.metrics.successfulAuthentications,
        failedAuth: this.metrics.failedAuthentications,
        averageTime: this.performanceMetrics.averageAuthTime,
        slowWarnings: this.performanceMetrics.slowAuthWarnings,
      },
      caching: {
        standardCacheHits: this.metrics.cacheHits,
        standardCacheMisses: this.metrics.cacheMisses,
        fastCacheHits: this.performanceMetrics.fastCacheHits,
        tokenCacheHits: this.performanceMetrics.tokenCacheHits,
        permissionCacheHits: this.performanceMetrics.permissionCacheHits,
        evictions: this.cacheStats.evictions,
        hitRatio: this._calculateCacheHitRatio(),
      },
      memory: {
        userCacheSize: this.userCache.size,
        fastCacheSize: this.fastAuthCache.size,
        tokenCacheSize: this.authTokenCache.size,
        estimatedMemoryUsage: this._estimateMemoryUsage(),
      },
    };
  }

  /**
   * Calculate overall cache hit ratio
   * @returns {number} Hit ratio as percentage
   * @private
   */
  _calculateCacheHitRatio() {
    const totalHits =
      this.metrics.cacheHits +
      this.performanceMetrics.fastCacheHits +
      this.performanceMetrics.tokenCacheHits;
    const totalAttempts = totalHits + this.metrics.cacheMisses;

    return totalAttempts > 0 ? (totalHits / totalAttempts) * 100 : 0;
  }

  /**
   * Estimate memory usage of caches
   * @returns {number} Estimated memory usage in bytes
   * @private
   */
  _estimateMemoryUsage() {
    const userCacheSize = this.userCache.size * 500; // rough estimate per user
    const fastCacheSize = this.fastAuthCache.size * 400;
    const tokenCacheSize = this.authTokenCache.size * 200;
    const permissionCacheSize = this.rolePermissionCache.size * 150;

    return userCacheSize + fastCacheSize + tokenCacheSize + permissionCacheSize;
  }

  /**
   * Perform adaptive cache cleanup based on memory pressure
   * @private
   */
  _performAdaptiveCacheCleanup() {
    if (!this.config.adaptiveCaching) return;

    const memoryUsage = this._estimateMemoryUsage();
    const memoryThreshold = this.config.maxCacheEntries * 300; // bytes

    if (memoryUsage > memoryThreshold) {
      this._cleanupExpiredCaches();
      this._log(
        "info",
        `Adaptive cache cleanup completed. Freed memory: ${memoryUsage - this._estimateMemoryUsage()} bytes`,
      );
    }
  }

  /**
   * Clean up expired cache entries
   * @private
   */
  _cleanupExpiredCaches() {
    const now = Date.now();
    let cleanedCount = 0;

    // Clean fast auth cache
    for (const [key, entry] of this.fastAuthCache.entries()) {
      if (now - entry.timestamp > this.config.tokenCacheTimeout) {
        this.fastAuthCache.delete(key);
        cleanedCount++;
      }
    }

    // Clean auth token cache
    for (const [key, entry] of this.authTokenCache.entries()) {
      if (now - entry.timestamp > this.config.tokenCacheTimeout) {
        this.authTokenCache.delete(key);
        cleanedCount++;
      }
    }

    this.cacheStats.evictions += cleanedCount;
    this._log("debug", `Cleaned ${cleanedCount} expired cache entries`);
  }
}

// Global service instance and initialization
window.AuthenticationService = null;

/**
 * Initialize AuthenticationService
 * @param {AuthServiceConfig} config - Configuration options
 * @returns {Promise<AuthenticationService>} Initialized AuthenticationService instance
 */
async function initializeAuthenticationService(config = {}) {
  try {
    if (window.AuthenticationService) {
      console.warn("AuthenticationService already initialized");
      return window.AuthenticationService;
    }

    const service = new AuthenticationService();
    await service.initialize(config);
    await service.start();

    window.AuthenticationService = service;

    console.log("🔐 AuthenticationService initialized successfully");
    console.log("👤 Current user:", service.currentUser?.getDisplayInfo());
    console.log(
      "🛡️ 4-level fallback hierarchy enabled:",
      service.config.fallbackHierarchy,
    );
    console.log(
      "📊 User roles supported:",
      Object.keys(service.config.roleHierarchy),
    );

    return service;
  } catch (error) {
    console.error("❌ Failed to initialize AuthenticationService:", error);
    throw error;
  }
}

// Export for different module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    AuthenticationService,
    UserContext,
    AuditEvent,
    initializeAuthenticationService,
  };
}

if (typeof define === "function" && define.amd) {
  define([], function () {
    return {
      AuthenticationService,
      UserContext,
      AuditEvent,
      initializeAuthenticationService,
    };
  });
}

if (typeof window !== "undefined") {
  window.AuthenticationService = AuthenticationService;
  window.UserContext = UserContext;
  window.AuditEvent = AuditEvent;
  window.initializeAuthenticationService = initializeAuthenticationService;
}

// Node.js/CommonJS export for Jest testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    AuthenticationService,
    UserContext,
    AuditEvent,
    initializeAuthenticationService,
  };
}
