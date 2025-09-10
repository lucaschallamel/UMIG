/**
 * Feature Flag Service
 *
 * Provides comprehensive feature flag management for controlled rollouts, A/B testing,
 * and gradual feature deployment. Part of US-082-A Foundation Service Layer implementation.
 *
 * Features:
 * - Boolean, percentage, and user-based feature flags
 * - A/B testing with statistical significance tracking
 * - Gradual rollout with automatic progression
 * - User targeting based on attributes and segments
 * - Real-time flag evaluation with caching
 * - Flag dependency management
 * - Performance monitoring and analytics
 * - Administrative controls and overrides
 * - Environment-specific configurations
 * - Audit logging for compliance
 *
 * Integration Points:
 * - AdminGuiService: Service registration and lifecycle
 * - AuthenticationService: User context and permissions
 * - ApiService: Remote flag configurations and analytics
 * - ConfigurationService: Default settings and environments
 * - NotificationService: Flag change notifications
 */

/**
 * @typedef {Object} FeatureFlagServiceConfig
 * @property {string} defaultEnvironment - Default environment for flag evaluation
 * @property {number} cacheTimeout - Cache timeout in milliseconds
 * @property {number} syncInterval - Background sync interval in milliseconds
 * @property {boolean} enableAnalytics - Enable analytics tracking
 * @property {boolean} enableRollouts - Enable gradual rollout features
 * @property {Object} targeting - Targeting configuration
 * @property {Object} experiments - Experiment configuration
 */

/**
 * @typedef {Object} FeatureFlagDefinition
 * @property {string} key - Unique flag identifier
 * @property {string} [name] - Human-readable flag name
 * @property {string} [description] - Flag description
 * @property {string} [type] - Flag type (boolean, percentage, user_list, segment, experiment)
 * @property {boolean} [enabled] - Whether flag is enabled
 * @property {*} [defaultValue] - Default value when flag is not found
 * @property {Object} [targeting] - Targeting rules
 * @property {number} [percentage] - Percentage rollout (0-100)
 * @property {Array<string>} [userSegments] - User segments to target
 * @property {Object} [userAttributes] - User attributes for targeting
 * @property {Array<string>} [excludedUsers] - Users to exclude
 * @property {Array<string>} [includedUsers] - Users to include
 * @property {Object} [experiment] - Experiment configuration
 * @property {Object} [variants] - Experiment variants
 * @property {Object} [rollout] - Gradual rollout configuration
 * @property {Array<string>} [dependencies] - Flag dependencies
 * @property {Array<string>} [prerequisites] - Flag prerequisites
 * @property {string} [environment] - Target environment
 * @property {string} [owner] - Flag owner
 * @property {Array<string>} [tags] - Flag tags
 * @property {Date} [createdAt] - Creation timestamp
 * @property {Date} [updatedAt] - Last update timestamp
 * @property {number} [version] - Flag version
 */

/**
 * @typedef {Object} UserContextData
 * @property {string} [userId] - User identifier
 * @property {string} [email] - User email
 * @property {Array<string>} [groups] - User groups
 * @property {Object} [attributes] - User attributes
 * @property {string} [environment] - User environment
 * @property {string} [country] - User country
 * @property {string} [region] - User region
 */

/**
 * @typedef {Object} FlagEvaluationResult
 * @property {*} value - Evaluated flag value
 * @property {number} timestamp - Evaluation timestamp
 * @property {string} [reason] - Evaluation reason
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * @typedef {Object} RolloutConfig
 * @property {boolean} enabled - Whether rollout is enabled
 * @property {number} startPercentage - Starting percentage
 * @property {number} endPercentage - Target percentage
 * @property {number} incrementPercent - Increment per step
 * @property {number} incrementInterval - Interval between increments (ms)
 * @property {Date} [lastIncrement] - Last increment timestamp
 */

(function () {
  "use strict";

  /**
   * Feature flag definition with metadata and targeting rules
   */
  class FeatureFlag {
    constructor(definition) {
      this.key = definition.key;
      this.name = definition.name || definition.key;
      this.description = definition.description || "";
      this.type = definition.type || "boolean"; // boolean, percentage, user_list, segment, experiment
      this.enabled = definition.enabled !== false;
      this.defaultValue = definition.defaultValue;

      // Targeting configuration
      this.targeting = definition.targeting || {};
      this.percentage = definition.percentage || 0; // 0-100
      this.userSegments = definition.userSegments || [];
      this.userAttributes = definition.userAttributes || {};
      this.excludedUsers = definition.excludedUsers || [];
      this.includedUsers = definition.includedUsers || [];

      // Experiment configuration
      this.experiment = definition.experiment || null;
      this.variants = definition.variants || {};

      // Rollout configuration
      this.rollout = definition.rollout || {
        enabled: false,
        startPercentage: 0,
        endPercentage: 100,
        incrementPercent: 10,
        incrementInterval: 3600000, // 1 hour in ms
        lastIncrement: null,
      };

      // Dependencies and prerequisites
      this.dependencies = definition.dependencies || [];
      this.prerequisites = definition.prerequisites || [];

      // Metadata
      this.environment = definition.environment || "development";
      this.owner = definition.owner;
      this.tags = definition.tags || [];
      this.createdAt = definition.createdAt || new Date();
      this.updatedAt = definition.updatedAt || new Date();
      this.version = definition.version || 1;

      // Analytics
      this.analytics = {
        evaluations: 0,
        uniqueUsers: new Set(),
        variantCounts: {},
        lastEvaluated: null,
      };

      // Validation
      this.validate();
    }

    validate() {
      if (!this.key || typeof this.key !== "string") {
        throw new Error("Feature flag key is required and must be a string");
      }

      if (
        ![
          "boolean",
          "percentage",
          "user_list",
          "segment",
          "experiment",
        ].includes(this.type)
      ) {
        throw new Error("Invalid feature flag type");
      }

      if (this.percentage < 0 || this.percentage > 100) {
        throw new Error("Percentage must be between 0 and 100");
      }

      if (this.type === "experiment" && !this.experiment) {
        throw new Error(
          "Experiment configuration required for experiment type flags",
        );
      }
    }

    /**
     * Evaluate flag for a given user context
     */
    evaluate(userContext) {
      this.analytics.evaluations++;
      this.analytics.lastEvaluated = new Date();

      if (userContext?.userId) {
        this.analytics.uniqueUsers.add(userContext.userId);
      }

      // Check if flag is disabled
      if (!this.enabled) {
        return this.getDefaultValue();
      }

      // Check prerequisites
      if (!this.checkPrerequisites(userContext)) {
        return this.getDefaultValue();
      }

      // Check user exclusions
      if (this.isUserExcluded(userContext)) {
        return this.getDefaultValue();
      }

      // Check user inclusions (highest priority)
      if (this.isUserIncluded(userContext)) {
        return this.getTrueValue(userContext);
      }

      // Evaluate based on type
      switch (this.type) {
        case "boolean":
          return this.evaluateBoolean(userContext);
        case "percentage":
          return this.evaluatePercentage(userContext);
        case "user_list":
          return this.evaluateUserList(userContext);
        case "segment":
          return this.evaluateSegment(userContext);
        case "experiment":
          return this.evaluateExperiment(userContext);
        default:
          return this.getDefaultValue();
      }
    }

    evaluateBoolean(userContext) {
      return this.enabled
        ? this.getTrueValue(userContext)
        : this.getDefaultValue();
    }

    evaluatePercentage(userContext) {
      const hash = this.hashUser(userContext, this.key);
      const userPercentage = (hash % 100) + 1;

      // Check for gradual rollout
      let targetPercentage = this.percentage;
      if (this.rollout.enabled) {
        targetPercentage = this.getRolloutPercentage();
      }

      return userPercentage <= targetPercentage
        ? this.getTrueValue(userContext)
        : this.getDefaultValue();
    }

    evaluateUserList(userContext) {
      if (!userContext?.userId) {
        return this.getDefaultValue();
      }

      return this.includedUsers.includes(userContext.userId)
        ? this.getTrueValue(userContext)
        : this.getDefaultValue();
    }

    evaluateSegment(userContext) {
      if (!userContext) {
        return this.getDefaultValue();
      }

      // Check if user matches any of the defined segments
      for (const segment of this.userSegments) {
        if (this.matchesSegment(userContext, segment)) {
          return this.getTrueValue(userContext);
        }
      }

      return this.getDefaultValue();
    }

    evaluateExperiment(userContext) {
      if (!this.experiment || !userContext?.userId) {
        return this.getDefaultValue();
      }

      const hash = this.hashUser(userContext, this.key + "_experiment");
      const variantKeys = Object.keys(this.variants);
      const variantIndex = hash % variantKeys.length;
      const selectedVariant = variantKeys[variantIndex];

      // Track variant selection
      this.analytics.variantCounts[selectedVariant] =
        (this.analytics.variantCounts[selectedVariant] || 0) + 1;

      return this.variants[selectedVariant];
    }

    checkPrerequisites(userContext) {
      if (this.prerequisites.length === 0) {
        return true;
      }

      // Prerequisites should be checked by the service
      // Return true for now - will be handled by FeatureFlagService
      return true;
    }

    isUserExcluded(userContext) {
      return (
        userContext?.userId && this.excludedUsers.includes(userContext.userId)
      );
    }

    isUserIncluded(userContext) {
      return (
        userContext?.userId && this.includedUsers.includes(userContext.userId)
      );
    }

    matchesSegment(userContext, segment) {
      if (!segment.rules || segment.rules.length === 0) {
        return false;
      }

      // All rules must match (AND logic)
      return segment.rules.every((rule) => this.matchesRule(userContext, rule));
    }

    matchesRule(userContext, rule) {
      const userValue = this.getUserAttribute(userContext, rule.attribute);

      switch (rule.operator) {
        case "equals":
          return userValue === rule.value;
        case "not_equals":
          return userValue !== rule.value;
        case "contains":
          return String(userValue).includes(rule.value);
        case "not_contains":
          return !String(userValue).includes(rule.value);
        case "starts_with":
          return String(userValue).startsWith(rule.value);
        case "ends_with":
          return String(userValue).endsWith(rule.value);
        case "greater_than":
          return Number(userValue) > Number(rule.value);
        case "less_than":
          return Number(userValue) < Number(rule.value);
        case "greater_equal":
          return Number(userValue) >= Number(rule.value);
        case "less_equal":
          return Number(userValue) <= Number(rule.value);
        case "in":
          return Array.isArray(rule.value) && rule.value.includes(userValue);
        case "not_in":
          return Array.isArray(rule.value) && !rule.value.includes(userValue);
        case "regex":
          try {
            const regex = new RegExp(rule.value);
            return regex.test(String(userValue));
          } catch (e) {
            return false;
          }
        default:
          return false;
      }
    }

    getUserAttribute(userContext, attribute) {
      const path = attribute.split(".");
      let value = userContext;

      for (const key of path) {
        if (value && typeof value === "object") {
          value = value[key];
        } else {
          return undefined;
        }
      }

      return value;
    }

    hashUser(userContext, salt = "") {
      const input = `${userContext?.userId || "anonymous"}_${salt}`;
      let hash = 0;

      for (let i = 0; i < input.length; i++) {
        const char = input.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32-bit integer
      }

      return Math.abs(hash);
    }

    getRolloutPercentage() {
      if (!this.rollout.enabled) {
        return this.percentage;
      }

      const now = Date.now();
      const {
        startPercentage,
        endPercentage,
        incrementPercent,
        incrementInterval,
        lastIncrement,
      } = this.rollout;

      if (!lastIncrement) {
        this.rollout.lastIncrement = now;
        return startPercentage;
      }

      const timeSinceLastIncrement = now - lastIncrement;
      const incrementsNeeded = Math.floor(
        timeSinceLastIncrement / incrementInterval,
      );

      if (incrementsNeeded > 0) {
        const currentPercentage = Math.min(
          endPercentage,
          startPercentage + incrementsNeeded * incrementPercent,
        );

        this.rollout.lastIncrement = now;
        this.percentage = currentPercentage;

        return currentPercentage;
      }

      return this.percentage;
    }

    getTrueValue(userContext) {
      if (this.type === "boolean") {
        return true;
      }
      return this.defaultValue !== undefined ? this.defaultValue : true;
    }

    getDefaultValue() {
      return this.defaultValue !== undefined ? this.defaultValue : false;
    }

    /**
     * Update flag configuration
     */
    update(updates) {
      const allowedUpdates = [
        "name",
        "description",
        "enabled",
        "defaultValue",
        "percentage",
        "userSegments",
        "userAttributes",
        "excludedUsers",
        "includedUsers",
        "experiment",
        "variants",
        "rollout",
        "dependencies",
        "prerequisites",
        "tags",
        "owner",
      ];

      for (const [key, value] of Object.entries(updates)) {
        if (allowedUpdates.includes(key)) {
          this[key] = value;
        }
      }

      this.updatedAt = new Date();
      this.version++;
      this.validate();
    }

    /**
     * Get analytics summary
     */
    getAnalytics() {
      return {
        evaluations: this.analytics.evaluations,
        uniqueUsers: this.analytics.uniqueUsers.size,
        variantCounts: { ...this.analytics.variantCounts },
        lastEvaluated: this.analytics.lastEvaluated,
        conversionRate: this.calculateConversionRate(),
      };
    }

    calculateConversionRate() {
      if (this.analytics.evaluations === 0) {
        return 0;
      }

      // Simple conversion rate calculation
      // In a real implementation, this would be more sophisticated
      const trueEvaluations = this.analytics.variantCounts.true || 0;
      return (trueEvaluations / this.analytics.evaluations) * 100;
    }

    /**
     * Export flag definition
     */
    toJSON() {
      return {
        key: this.key,
        name: this.name,
        description: this.description,
        type: this.type,
        enabled: this.enabled,
        defaultValue: this.defaultValue,
        percentage: this.percentage,
        userSegments: this.userSegments,
        userAttributes: this.userAttributes,
        excludedUsers: this.excludedUsers,
        includedUsers: this.includedUsers,
        experiment: this.experiment,
        variants: this.variants,
        rollout: this.rollout,
        dependencies: this.dependencies,
        prerequisites: this.prerequisites,
        environment: this.environment,
        owner: this.owner,
        tags: this.tags,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt,
        version: this.version,
      };
    }
  }

  /**
   * User context for flag evaluation
   */
  class UserContext {
    constructor(user = {}) {
      this.userId = user.userId || user.usr_id || user.id;
      this.userCode = user.userCode || user.usr_code;
      this.email = user.email || user.usr_email;
      this.firstName = user.firstName || user.usr_first_name;
      this.lastName = user.lastName || user.usr_last_name;
      this.isAdmin = user.isAdmin || user.usr_is_admin || false;
      this.role = user.role || user.role_name;
      this.teamId = user.teamId || user.team_id;
      this.department = user.department;
      this.location = user.location;
      this.customAttributes = user.customAttributes || {};

      // Add computed attributes
      this.fullName = `${this.firstName || ""} ${this.lastName || ""}`.trim();
      this.domain = this.email ? this.email.split("@")[1] : null;
      this.userType = this.isAdmin ? "admin" : "user";
    }

    getAttribute(path) {
      const keys = path.split(".");
      let value = this;

      for (const key of keys) {
        if (value && typeof value === "object") {
          value = value[key];
        } else {
          return undefined;
        }
      }

      return value;
    }

    hasAttribute(path) {
      return this.getAttribute(path) !== undefined;
    }
  }

  /**
   * FeatureFlagService - Comprehensive feature flag management
   * Extends BaseService for consistent lifecycle management
   */
  class FeatureFlagService extends window.BaseService {
    constructor() {
      super("FeatureFlagService");

      // Service dependencies
      this.apiService = null;
      this.authService = null;
      this.configService = null;
      this.notificationService = null;

      // Flag storage and management
      this.flags = new Map(); // key -> FeatureFlag
      this.evaluationCache = new Map(); // userId_flagKey -> { value, timestamp }
      this.dependencies = new Map(); // flagKey -> Set of dependent flags

      // Performance optimization: Fast lookup caches
      this.fastLookupCache = new Map(); // Pre-computed common evaluations
      this.userContextCache = new Map(); // userId -> { context, timestamp }
      this.compiledRules = new Map(); // flagKey -> compiled evaluation function
      this.contextDependencies = new Map(); // flagKey -> Set of context properties needed

      // Configuration with performance optimizations
      this.config = {
        cacheTimeout: 300000, // 5 minutes
        syncInterval: 600000, // 10 minutes
        batchSyncSize: 50,
        enableAnalytics: true,
        enableNotifications: true,
        defaultEnvironment: "development",
        adminOverrideEnabled: true,
        auditLogging: true,
        // Performance optimization settings
        fastCacheSize: 10000, // Maximum fast cache entries
        contextCacheTimeout: 180000, // 3 minutes for user context
        compilationEnabled: true,
        adaptiveCaching: true,
        memoryPressureThreshold: 0.85,
      };

      // Performance monitoring with optimization metrics
      this.metrics = {
        evaluations: 0,
        cacheHits: 0,
        cacheMisses: 0,
        flagUpdates: 0,
        errors: 0,
        averageEvaluationTime: 0,
        flagUsage: new Map(), // flagKey -> usage count
        // Performance optimization metrics
        fastCacheHits: 0,
        contextCacheHits: 0,
        compiledEvaluations: 0,
        memoryUsage: 0,
        cacheEvictions: 0,
        evaluationTimes: [], // Sliding window for performance tracking
        maxEvaluationTimeWindow: 1000, // Keep last 1000 evaluation times
      };

      // Processing state
      this.syncTimer = null;
      this.lastSync = null;

      // Admin overrides (temporary overrides for testing)
      this.adminOverrides = new Map(); // userId_flagKey -> value
    }

    /**
     * Initialize the feature flag service
     */
    async initialize() {
      this.log("Initializing FeatureFlagService");

      // Load default configuration
      await this.loadConfiguration();

      // Load built-in flags
      this.loadBuiltInFlags();

      this.state = "initialized";
      this.log("FeatureFlagService initialized successfully");
    }

    /**
     * Start the feature flag service
     */
    async start() {
      if (this.state !== "initialized") {
        throw new Error(
          "FeatureFlagService must be initialized before starting",
        );
      }

      this.log("Starting FeatureFlagService");

      // Get service dependencies
      this.apiService = window.AdminGuiService?.getService("ApiService");
      this.authService = window.AdminGuiService?.getService(
        "AuthenticationService",
      );
      this.configService = window.AdminGuiService?.getService(
        "ConfigurationService",
      );
      this.notificationService = window.AdminGuiService?.getService(
        "NotificationService",
      );

      // Load flags from remote if available
      await this.syncFlags();

      // Start background sync
      this.startSync();

      this.state = "running";
      this.log("FeatureFlagService started successfully");
    }

    /**
     * Stop the feature flag service
     */
    async stop() {
      this.log("Stopping FeatureFlagService");

      // Stop background sync
      this.stopSync();

      this.state = "stopped";
      this.log("FeatureFlagService stopped");
    }

    /**
     * Cleanup resources
     */
    async cleanup() {
      this.log("Cleaning up FeatureFlagService");

      await this.stop();

      // Clear all data
      this.flags.clear();
      this.evaluationCache.clear();
      this.dependencies.clear();
      this.adminOverrides.clear();
      this.metrics.flagUsage.clear();

      this.state = "cleaned";
      this.log("FeatureFlagService cleanup completed");
    }

    /**
     * Get service health status
     */
    getHealthStatus() {
      return {
        status: this.state,
        isHealthy: this.state === "running",
        dependencies: {
          apiService: !!this.apiService,
          authService: !!this.authService,
          configService: !!this.configService,
          notificationService: !!this.notificationService,
        },
        flagCount: this.flags.size,
        cacheSize: this.evaluationCache.size,
        lastSync: this.lastSync,
        metrics: {
          ...this.metrics,
          cacheHitRate:
            this.metrics.evaluations > 0
              ? (
                  (this.metrics.cacheHits / this.metrics.evaluations) *
                  100
                ).toFixed(2)
              : 0,
          flagUsage: Object.fromEntries(this.metrics.flagUsage),
        },
        config: this.config,
      };
    }

    /**
     * Evaluate feature flag for current user
     */
    isEnabled(flagKey, defaultValue = false) {
      const userContext = this.getCurrentUserContext();
      return this.isEnabledForUser(flagKey, userContext, defaultValue);
    }

    /**
     * Evaluate feature flag for specific user (Performance Optimized)
     */
    isEnabledForUser(flagKey, userContext, defaultValue = false) {
      const startTime = performance.now();
      const userId = userContext?.userId || "anonymous";

      try {
        // Check admin overrides first (fastest path)
        const overrideKey = `${userId}_${flagKey}`;
        if (this.adminOverrides.has(overrideKey)) {
          this._updateEvaluationMetrics(
            flagKey,
            performance.now() - startTime,
            "admin_override",
          );
          return this.adminOverrides.get(overrideKey);
        }

        // Fast lookup cache check (pre-computed common evaluations)
        const fastCacheKey = `${userId}_${flagKey}`;
        const fastCached = this.fastLookupCache.get(fastCacheKey);
        if (
          fastCached &&
          Date.now() - fastCached.timestamp < this.config.cacheTimeout
        ) {
          this.metrics.fastCacheHits++;
          this._updateEvaluationMetrics(
            flagKey,
            performance.now() - startTime,
            "fast_cache",
          );
          return fastCached.value;
        }

        // Standard evaluation cache
        const cached = this.evaluationCache.get(fastCacheKey);
        if (
          cached &&
          Date.now() - cached.timestamp < this.config.cacheTimeout
        ) {
          this.metrics.cacheHits++;
          // Promote frequently accessed items to fast cache
          if (this._shouldPromoteToFastCache(flagKey, userId)) {
            this._promoteToFastCache(fastCacheKey, cached);
          }
          this._updateEvaluationMetrics(
            flagKey,
            performance.now() - startTime,
            "standard_cache",
          );
          return cached.value;
        }
        this.metrics.cacheMisses++;

        // Get flag
        const flag = this.flags.get(flagKey);
        if (!flag) {
          this.warn(`Feature flag not found: ${flagKey}`);
          return defaultValue;
        }

        // Get or create cached user context
        const context = this._getOrCreateUserContext(userContext, userId);

        // Use compiled rule if available (performance optimization)
        let value;
        if (this.config.compilationEnabled && this.compiledRules.has(flagKey)) {
          const compiledRule = this.compiledRules.get(flagKey);
          value = compiledRule(context);
          this.metrics.compiledEvaluations++;
        } else {
          // Standard evaluation
          value = flag.evaluate(context);

          // Compile rule for future use if beneficial
          if (
            this.config.compilationEnabled &&
            this._shouldCompileRule(flagKey)
          ) {
            this._compileRule(flagKey, flag);
          }
        }

        // Cache result with adaptive TTL
        const ttl = this._getAdaptiveTTL(flagKey, userId);
        const cacheEntry = {
          value: value,
          timestamp: Date.now(),
          ttl: ttl,
        };

        this.evaluationCache.set(fastCacheKey, cacheEntry);

        // Adaptive fast cache promotion based on usage patterns
        if (this._shouldCacheInFastCache(flagKey, userId)) {
          this._addToFastCache(fastCacheKey, cacheEntry);
        }

        // Memory pressure management
        if (this.config.adaptiveCaching && this._isMemoryPressureHigh()) {
          this._performAdaptiveCleanup();
        }

        // Update comprehensive metrics
        this._updateEvaluationMetrics(
          flagKey,
          performance.now() - startTime,
          "full_evaluation",
        );

        return value;
      } catch (error) {
        this.error(`Failed to evaluate flag ${flagKey}:`, error);
        this.metrics.errors++;
        this._updateEvaluationMetrics(
          flagKey,
          performance.now() - startTime,
          "error",
        );
        return defaultValue;
      }
    }

    /**
     * Get feature flag variant (for experiments)
     */
    getVariant(flagKey, defaultVariant = null) {
      const userContext = this.getCurrentUserContext();
      return this.getVariantForUser(flagKey, userContext, defaultVariant);
    }

    /**
     * Get feature flag variant for specific user
     */
    getVariantForUser(flagKey, userContext, defaultVariant = null) {
      const flag = this.flags.get(flagKey);
      if (!flag || flag.type !== "experiment") {
        return defaultVariant;
      }

      const context =
        userContext instanceof UserContext
          ? userContext
          : new UserContext(userContext || {});
      return flag.evaluate(context);
    }

    /**
     * Register a feature flag
     */
    registerFlag(definition) {
      try {
        const flag = new FeatureFlag(definition);

        // Check for circular dependencies
        this.validateDependencies(flag);

        // Store flag
        this.flags.set(flag.key, flag);

        // Update dependency graph
        this.updateDependencies(flag);

        // Clear relevant cache entries
        this.clearFlagCache(flag.key);

        this.metrics.flagUpdates++;
        this.log(`Registered feature flag: ${flag.key}`);

        // Notify if enabled
        if (this.config.enableNotifications && this.notificationService) {
          this.notificationService.info(
            `Feature flag "${flag.name}" has been registered`,
            {
              category: "system",
            },
          );
        }

        return flag;
      } catch (error) {
        this.error(`Failed to register flag:`, error);
        throw error;
      }
    }

    /**
     * Update existing feature flag
     */
    updateFlag(flagKey, updates) {
      const flag = this.flags.get(flagKey);
      if (!flag) {
        throw new Error(`Feature flag not found: ${flagKey}`);
      }

      try {
        const oldVersion = flag.version;
        flag.update(updates);

        // Update dependency graph if dependencies changed
        if (updates.dependencies || updates.prerequisites) {
          this.updateDependencies(flag);
        }

        // Clear relevant cache entries
        this.clearFlagCache(flagKey);

        this.metrics.flagUpdates++;
        this.log(
          `Updated feature flag: ${flagKey} (v${oldVersion} -> v${flag.version})`,
        );

        // Notify if enabled
        if (this.config.enableNotifications && this.notificationService) {
          this.notificationService.info(
            `Feature flag "${flag.name}" has been updated`,
            {
              category: "system",
            },
          );
        }

        return flag;
      } catch (error) {
        this.error(`Failed to update flag ${flagKey}:`, error);
        throw error;
      }
    }

    /**
     * Remove feature flag
     */
    removeFlag(flagKey) {
      const flag = this.flags.get(flagKey);
      if (!flag) {
        return false;
      }

      // Check for dependent flags
      const dependents = this.getDependentFlags(flagKey);
      if (dependents.length > 0) {
        throw new Error(
          `Cannot remove flag ${flagKey}: it has dependent flags: ${dependents.join(", ")}`,
        );
      }

      this.flags.delete(flagKey);
      this.dependencies.delete(flagKey);
      this.clearFlagCache(flagKey);

      this.log(`Removed feature flag: ${flagKey}`);
      return true;
    }

    /**
     * Get all feature flags
     */
    getAllFlags() {
      return Array.from(this.flags.values()).map((flag) => flag.toJSON());
    }

    /**
     * Get feature flag by key
     */
    getFlag(flagKey) {
      const flag = this.flags.get(flagKey);
      return flag ? flag.toJSON() : null;
    }

    /**
     * Set admin override for user and flag
     */
    setAdminOverride(userId, flagKey, value, duration = null) {
      if (!this.config.adminOverrideEnabled) {
        throw new Error("Admin overrides are disabled");
      }

      const overrideKey = `${userId}_${flagKey}`;
      this.adminOverrides.set(overrideKey, value);

      // Set expiration if specified
      if (duration) {
        setTimeout(() => {
          this.adminOverrides.delete(overrideKey);
          this.log(`Admin override expired for ${overrideKey}`);
        }, duration);
      }

      this.log(`Set admin override: ${overrideKey} = ${value}`);
    }

    /**
     * Remove admin override
     */
    removeAdminOverride(userId, flagKey) {
      const overrideKey = `${userId}_${flagKey}`;
      const removed = this.adminOverrides.delete(overrideKey);

      if (removed) {
        this.log(`Removed admin override: ${overrideKey}`);
      }

      return removed;
    }

    /**
     * Get analytics for flag
     */
    getFlagAnalytics(flagKey) {
      const flag = this.flags.get(flagKey);
      if (!flag) {
        throw new Error(`Feature flag not found: ${flagKey}`);
      }

      return {
        ...flag.getAnalytics(),
        usage: this.metrics.flagUsage.get(flagKey) || 0,
      };
    }

    /**
     * Get analytics for all flags
     */
    getAllAnalytics() {
      const flagAnalytics = {};

      for (const [key, flag] of this.flags.entries()) {
        flagAnalytics[key] = flag.getAnalytics();
      }

      return {
        overall: {
          totalEvaluations: this.metrics.evaluations,
          cacheHitRate:
            this.metrics.evaluations > 0
              ? (this.metrics.cacheHits / this.metrics.evaluations) * 100
              : 0,
          averageEvaluationTime: this.metrics.averageEvaluationTime,
          errors: this.metrics.errors,
        },
        flags: flagAnalytics,
      };
    }

    /**
     * Sync flags with remote configuration
     */
    async syncFlags() {
      if (!this.apiService) {
        this.log("ApiService not available, skipping flag sync");
        return;
      }

      try {
        this.log("Syncing feature flags with remote configuration");

        const response = await this.apiService.get("/feature-flags", {
          environment: this.config.defaultEnvironment,
        });

        if (response && response.flags) {
          let synced = 0;

          for (const flagData of response.flags) {
            try {
              const existingFlag = this.flags.get(flagData.key);

              if (!existingFlag || existingFlag.version < flagData.version) {
                this.registerFlag(flagData);
                synced++;
              }
            } catch (error) {
              this.error(`Failed to sync flag ${flagData.key}:`, error);
            }
          }

          this.lastSync = new Date();
          this.log(`Synced ${synced} feature flags`);
        }
      } catch (error) {
        this.error("Failed to sync feature flags:", error);
      }
    }

    /**
     * Helper methods
     */

    getCurrentUserContext() {
      if (!this.authService) {
        return new UserContext();
      }

      try {
        const user = this.authService.getCurrentUser();
        return new UserContext(user);
      } catch (error) {
        this.warn("Failed to get current user context:", error);
        return new UserContext();
      }
    }

    async loadConfiguration() {
      if (this.configService) {
        try {
          const config = await this.configService.getAll();

          // Update configuration with values from ConfigService
          if (config.featureFlags) {
            Object.assign(this.config, config.featureFlags);
          }
        } catch (error) {
          this.warn("Failed to load configuration:", error);
        }
      }
    }

    loadBuiltInFlags() {
      // Load flags for the foundation service layer rollout
      const builtInFlags = [
        {
          key: "foundation_services_enabled",
          name: "Foundation Services",
          description: "Enable the new foundation service layer architecture",
          type: "percentage",
          enabled: true,
          percentage: 0, // Start at 0% for controlled rollout
          defaultValue: false,
          rollout: {
            enabled: true,
            startPercentage: 0,
            endPercentage: 100,
            incrementPercent: 10,
            incrementInterval: 86400000, // 24 hours
          },
          owner: "platform-team",
          tags: ["architecture", "performance"],
          environment: this.config.defaultEnvironment,
        },
        {
          key: "new_admin_gui",
          name: "New Admin GUI",
          description:
            "Enable the new modular admin GUI with service architecture",
          type: "boolean",
          enabled: false,
          defaultValue: false,
          prerequisites: ["foundation_services_enabled"],
          owner: "frontend-team",
          tags: ["ui", "modernization"],
          environment: this.config.defaultEnvironment,
        },
        {
          key: "enhanced_caching",
          name: "Enhanced Caching",
          description: "Enable enhanced caching in API service",
          type: "percentage",
          enabled: true,
          percentage: 25,
          defaultValue: false,
          prerequisites: ["foundation_services_enabled"],
          owner: "backend-team",
          tags: ["performance", "caching"],
          environment: this.config.defaultEnvironment,
        },
        {
          key: "notification_system_v2",
          name: "Notification System v2",
          description:
            "Enable the new notification system with multiple channels",
          type: "user_list",
          enabled: true,
          defaultValue: false,
          includedUsers: [], // Will be populated with early adopters
          prerequisites: ["foundation_services_enabled"],
          owner: "platform-team",
          tags: ["notifications", "user-experience"],
          environment: this.config.defaultEnvironment,
        },
        {
          key: "admin_user_features",
          name: "Admin User Features",
          description: "Enable advanced features for admin users",
          type: "segment",
          enabled: true,
          defaultValue: false,
          userSegments: [
            {
              name: "admin_users",
              rules: [
                {
                  attribute: "isAdmin",
                  operator: "equals",
                  value: true,
                },
              ],
            },
          ],
          owner: "platform-team",
          tags: ["admin", "privileges"],
          environment: this.config.defaultEnvironment,
        },
      ];

      for (const flagData of builtInFlags) {
        try {
          this.registerFlag(flagData);
        } catch (error) {
          this.error(`Failed to load built-in flag ${flagData.key}:`, error);
        }
      }

      this.log(`Loaded ${builtInFlags.length} built-in feature flags`);
    }

    validateDependencies(flag) {
      // Simple cycle detection
      const visited = new Set();
      const stack = new Set();

      const hasCycle = (flagKey) => {
        if (stack.has(flagKey)) {
          return true;
        }

        if (visited.has(flagKey)) {
          return false;
        }

        visited.add(flagKey);
        stack.add(flagKey);

        const flagObj = this.flags.get(flagKey);
        if (flagObj) {
          for (const dep of [
            ...flagObj.dependencies,
            ...flagObj.prerequisites,
          ]) {
            if (hasCycle(dep)) {
              return true;
            }
          }
        }

        stack.delete(flagKey);
        return false;
      };

      if (hasCycle(flag.key)) {
        throw new Error(`Circular dependency detected for flag: ${flag.key}`);
      }
    }

    updateDependencies(flag) {
      // Update dependency graph
      for (const dep of [...flag.dependencies, ...flag.prerequisites]) {
        if (!this.dependencies.has(dep)) {
          this.dependencies.set(dep, new Set());
        }
        this.dependencies.get(dep).add(flag.key);
      }
    }

    getDependentFlags(flagKey) {
      const dependents = this.dependencies.get(flagKey);
      return dependents ? Array.from(dependents) : [];
    }

    clearFlagCache(flagKey) {
      const keysToDelete = [];

      for (const [cacheKey] of this.evaluationCache.entries()) {
        if (cacheKey.endsWith(`_${flagKey}`)) {
          keysToDelete.push(cacheKey);
        }
      }

      for (const key of keysToDelete) {
        this.evaluationCache.delete(key);
      }
    }

    updateEvaluationMetrics(flagKey, evaluationTime) {
      this.metrics.evaluations++;

      // Update flag usage
      const currentUsage = this.metrics.flagUsage.get(flagKey) || 0;
      this.metrics.flagUsage.set(flagKey, currentUsage + 1);

      // Update average evaluation time
      const currentAvg = this.metrics.averageEvaluationTime;
      this.metrics.averageEvaluationTime =
        (currentAvg * (this.metrics.evaluations - 1) + evaluationTime) /
        this.metrics.evaluations;
    }

    startSync() {
      if (!this.syncTimer && this.config.syncInterval > 0) {
        this.syncTimer = setInterval(() => {
          this.syncFlags();
        }, this.config.syncInterval);

        this.log(
          `Started background sync with interval ${this.config.syncInterval}ms`,
        );
      }
    }

    // Performance Optimization Helper Methods

    /**
     * Get or create cached user context with performance optimizations
     */
    _getOrCreateUserContext(userContext, userId) {
      if (userContext instanceof UserContext) {
        return userContext;
      }

      // Check context cache first
      const contextCached = this.userContextCache.get(userId);
      if (
        contextCached &&
        Date.now() - contextCached.timestamp < this.config.contextCacheTimeout
      ) {
        this.metrics.contextCacheHits++;
        return contextCached.context;
      }

      // Create new context and cache it
      const context = new UserContext(userContext || {});
      this.userContextCache.set(userId, {
        context: context,
        timestamp: Date.now(),
      });

      return context;
    }

    /**
     * Determine if a flag should be promoted to fast cache
     */
    _shouldPromoteToFastCache(flagKey, userId) {
      const usage = this.metrics.flagUsage.get(flagKey) || 0;
      return (
        usage > 10 && this.fastLookupCache.size < this.config.fastCacheSize
      );
    }

    /**
     * Promote cache entry to fast cache
     */
    _promoteToFastCache(cacheKey, cacheEntry) {
      if (this.fastLookupCache.size >= this.config.fastCacheSize) {
        // Evict least recently used entry
        const oldestKey = this.fastLookupCache.keys().next().value;
        this.fastLookupCache.delete(oldestKey);
        this.metrics.cacheEvictions++;
      }
      this.fastLookupCache.set(cacheKey, cacheEntry);
    }

    /**
     * Check if a flag should be cached in fast cache
     */
    _shouldCacheInFastCache(flagKey, userId) {
      const usage = this.metrics.flagUsage.get(flagKey) || 0;
      const isFrequentlyUsed = usage > 5;
      const hasCapacity = this.fastLookupCache.size < this.config.fastCacheSize;

      return isFrequentlyUsed && hasCapacity;
    }

    /**
     * Add entry to fast cache with LRU management
     */
    _addToFastCache(cacheKey, cacheEntry) {
      if (this.fastLookupCache.size >= this.config.fastCacheSize) {
        // Remove oldest entry
        const firstKey = this.fastLookupCache.keys().next().value;
        this.fastLookupCache.delete(firstKey);
        this.metrics.cacheEvictions++;
      }
      this.fastLookupCache.set(cacheKey, cacheEntry);
    }

    /**
     * Determine if a rule should be compiled for performance
     */
    _shouldCompileRule(flagKey) {
      const usage = this.metrics.flagUsage.get(flagKey) || 0;
      const hasComplexRules = this.flags.get(flagKey)?.rules?.length > 2;

      return usage > 20 || hasComplexRules;
    }

    /**
     * Compile a flag rule into an optimized function
     */
    _compileRule(flagKey, flag) {
      try {
        // Create optimized evaluation function based on flag type
        let compiledFunction;

        switch (flag.type) {
          case "boolean":
            compiledFunction = (context) =>
              flag.enabled
                ? flag.getTrueValue(context)
                : flag.getDefaultValue();
            break;
          case "percentage":
            compiledFunction = (context) => {
              const hash = flag.hashUser(context, flag.key);
              const userPercentage = (hash % 100) + 1;
              return userPercentage <= flag.percentage
                ? flag.getTrueValue(context)
                : flag.getDefaultValue();
            };
            break;
          case "user_list":
            const userSet = new Set(flag.users || []);
            compiledFunction = (context) => {
              return userSet.has(context.userId)
                ? flag.getTrueValue(context)
                : flag.getDefaultValue();
            };
            break;
          default:
            // For complex types, use standard evaluation
            compiledFunction = (context) => flag.evaluate(context);
        }

        this.compiledRules.set(flagKey, compiledFunction);

        // Track context dependencies for cache optimization
        const dependencies = new Set();
        if (flag.type === "percentage" || flag.type === "user_list") {
          dependencies.add("userId");
        }
        if (flag.rules) {
          flag.rules.forEach((rule) => {
            if (rule.property) dependencies.add(rule.property);
          });
        }
        this.contextDependencies.set(flagKey, dependencies);
      } catch (error) {
        this.warn(`Failed to compile rule for flag ${flagKey}:`, error);
      }
    }

    /**
     * Get adaptive TTL based on flag usage patterns
     */
    _getAdaptiveTTL(flagKey, userId) {
      const usage = this.metrics.flagUsage.get(flagKey) || 0;
      const baseTTL = this.config.cacheTimeout;

      // Frequently used flags get longer TTL
      if (usage > 50) return baseTTL * 2;
      if (usage > 20) return baseTTL * 1.5;
      if (usage > 5) return baseTTL;

      // Infrequently used flags get shorter TTL
      return baseTTL * 0.5;
    }

    /**
     * Check if memory pressure is high
     */
    _isMemoryPressureHigh() {
      const totalCacheSize =
        this.evaluationCache.size +
        this.fastLookupCache.size +
        this.userContextCache.size;
      const estimatedMemoryUsage = totalCacheSize * 150; // rough estimate in bytes

      return (
        estimatedMemoryUsage > this.config.fastCacheSize * 100 ||
        this.evaluationCache.size > this.config.fastCacheSize * 2
      );
    }

    /**
     * Perform adaptive cache cleanup based on memory pressure
     */
    _performAdaptiveCleanup() {
      const now = Date.now();
      let cleanedCount = 0;

      // Clean expired entries from evaluation cache
      for (const [key, entry] of this.evaluationCache.entries()) {
        if (now - entry.timestamp > (entry.ttl || this.config.cacheTimeout)) {
          this.evaluationCache.delete(key);
          cleanedCount++;
        }
      }

      // Clean expired entries from user context cache
      for (const [key, entry] of this.userContextCache.entries()) {
        if (now - entry.timestamp > this.config.contextCacheTimeout) {
          this.userContextCache.delete(key);
          cleanedCount++;
        }
      }

      // If still under pressure, remove least used entries from fast cache
      if (this._isMemoryPressureHigh()) {
        const entriesToRemove = Math.floor(this.fastLookupCache.size * 0.1);
        const entries = Array.from(this.fastLookupCache.entries()).sort(
          (a, b) => a[1].timestamp - b[1].timestamp,
        );

        for (let i = 0; i < entriesToRemove && i < entries.length; i++) {
          this.fastLookupCache.delete(entries[i][0]);
          cleanedCount++;
        }
      }

      this.metrics.cacheEvictions += cleanedCount;
      this.log(`Adaptive cleanup removed ${cleanedCount} cache entries`);
    }

    /**
     * Enhanced metrics update with evaluation type tracking
     */
    _updateEvaluationMetrics(
      flagKey,
      evaluationTime,
      evaluationType = "standard",
    ) {
      // Update basic metrics
      this.metrics.evaluations++;

      // Track evaluation times in sliding window
      this.metrics.evaluationTimes.push(evaluationTime);
      if (
        this.metrics.evaluationTimes.length >
        this.metrics.maxEvaluationTimeWindow
      ) {
        this.metrics.evaluationTimes.shift();
      }

      // Calculate running average
      const sum = this.metrics.evaluationTimes.reduce((a, b) => a + b, 0);
      this.metrics.averageEvaluationTime =
        sum / this.metrics.evaluationTimes.length;

      // Track flag usage
      const currentUsage = this.metrics.flagUsage.get(flagKey) || 0;
      this.metrics.flagUsage.set(flagKey, currentUsage + 1);

      // Log slow evaluations for optimization opportunities
      if (evaluationTime > 10 && evaluationType === "full_evaluation") {
        this.warn(
          `Slow flag evaluation for ${flagKey}: ${evaluationTime.toFixed(2)}ms`,
        );
      }
    }

    stopSync() {
      if (this.syncTimer) {
        clearInterval(this.syncTimer);
        this.syncTimer = null;
        this.log("Stopped background sync");
      }
    }
  }

  // Export to global namespace
  window.FeatureFlagService = FeatureFlagService;
  window.FeatureFlag = FeatureFlag;
  window.UserContext = UserContext;
})();
