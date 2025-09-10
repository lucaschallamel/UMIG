/**
 * AdminGuiService.js - Central Orchestrator for UMIG Admin GUI Service Layer
 *
 * US-082-A Phase 1: Foundation Service Layer Implementation
 * Revolutionary service-based architecture replacing monolithic admin-gui.js
 *
 * Features:
 * - Service registry and dependency injection
 * - Event-driven inter-service communication
 * - Lifecycle management (initialize, start, stop, cleanup)
 * - Feature flag integration for controlled rollout
 * - Performance monitoring and error handling
 * - Dual-mode operation support (old vs new architecture)
 *
 * @author GENDEV System Architect
 * @version 1.0.0
 * @since Sprint 6
 */

/**
 * Base Service Class - Foundation for all service implementations
 * Provides common functionality and lifecycle management
 */
class BaseService {
  constructor(name, dependencies = []) {
    this.name = name;
    this.dependencies = dependencies;
    this.state = "initialized";
    this.startTime = null;
    this.metrics = {
      initTime: 0,
      startTime: 0,
      errorCount: 0,
      operationCount: 0,
    };
    this.eventHandlers = new Map();
    this.config = {};
    this.logger = null; // Will be injected by AdminGuiService
  }

  /**
   * Initialize service with configuration
   * @param {Object} config - Service configuration
   * @param {Object} logger - Logger instance
   * @returns {Promise<void>}
   */
  async initialize(config = {}, logger = null) {
    const startTime = performance.now();
    try {
      this.config = { ...this.config, ...config };
      this.logger = logger;
      this.state = "initializing";

      await this._doInitialize();

      this.state = "initialized";
      this.metrics.initTime = performance.now() - startTime;
      this._log(
        "info",
        `${this.name} initialized in ${this.metrics.initTime.toFixed(2)}ms`,
      );
    } catch (error) {
      this.state = "error";
      this.metrics.errorCount++;
      this._log("error", `${this.name} initialization failed:`, error);
      throw error;
    }
  }

  /**
   * Start service operations
   * @returns {Promise<void>}
   */
  async start() {
    const startTime = performance.now();
    try {
      if (this.state !== "initialized") {
        throw new Error(`Cannot start ${this.name} in state: ${this.state}`);
      }

      this.state = "starting";
      this.startTime = Date.now();

      await this._doStart();

      this.state = "running";
      this.metrics.startTime = performance.now() - startTime;
      this._log(
        "info",
        `${this.name} started in ${this.metrics.startTime.toFixed(2)}ms`,
      );
    } catch (error) {
      this.state = "error";
      this.metrics.errorCount++;
      this._log("error", `${this.name} start failed:`, error);
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
          `Attempting to stop ${this.name} in state: ${this.state}`,
        );
        return;
      }

      this.state = "stopping";
      await this._doStop();
      this.state = "stopped";
      this._log("info", `${this.name} stopped successfully`);
    } catch (error) {
      this.state = "error";
      this.metrics.errorCount++;
      this._log("error", `${this.name} stop failed:`, error);
      throw error;
    }
  }

  /**
   * Cleanup service resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      await this._doCleanup();
      this.eventHandlers.clear();
      this.state = "cleaned";
      this._log("info", `${this.name} cleanup completed`);
    } catch (error) {
      this.metrics.errorCount++;
      this._log("error", `${this.name} cleanup failed:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to events from other services
   * @param {string} eventName - Event name to listen for
   * @param {Function} handler - Event handler function
   */
  subscribe(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      this.eventHandlers.set(eventName, []);
    }
    this.eventHandlers.get(eventName).push(handler);
  }

  /**
   * Emit events to other services
   * @param {string} eventName - Event name to emit
   * @param {*} data - Event data
   */
  emit(eventName, data) {
    if (window.AdminGuiService) {
      window.AdminGuiService.broadcastEvent(this.name, eventName, data);
    }
  }

  /**
   * Compatibility method for on() - delegates to subscribe()
   * @param {string} eventName - Event name to listen for
   * @param {Function} handler - Event handler function
   */
  on(eventName, handler) {
    return this.subscribe(eventName, handler);
  }

  /**
   * Compatibility method for off() - unsubscribes from events
   * @param {string} eventName - Event name to unsubscribe from
   * @param {Function} handler - Event handler to remove (optional)
   */
  off(eventName, handler) {
    if (!this.eventHandlers.has(eventName)) {
      return;
    }
    
    if (handler) {
      const handlers = this.eventHandlers.get(eventName);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
      if (handlers.length === 0) {
        this.eventHandlers.delete(eventName);
      }
    } else {
      // Remove all handlers for this event
      this.eventHandlers.delete(eventName);
    }
  }

  /**
   * Handle incoming events
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   * @param {string} source - Source service name
   */
  handleEvent(eventName, data, source) {
    if (this.eventHandlers.has(eventName)) {
      this.eventHandlers.get(eventName).forEach((handler) => {
        try {
          handler(data, source);
        } catch (error) {
          this._log("error", `Error handling event ${eventName}:`, error);
        }
      });
    }
  }

  /**
   * Get service health status
   * @returns {Object} Health status information
   */
  getHealth() {
    return {
      name: this.name,
      state: this.state,
      uptime: this.startTime ? Date.now() - this.startTime : 0,
      metrics: { ...this.metrics },
      dependencies: this.dependencies,
      isHealthy: this.state === "running" && this.metrics.errorCount < 10,
    };
  }

  // Protected methods for subclasses to override
  async _doInitialize() {
    // Override in subclasses
  }

  async _doStart() {
    // Override in subclasses
  }

  async _doStop() {
    // Override in subclasses
  }

  async _doCleanup() {
    // Override in subclasses
  }

  /**
   * Internal logging method
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} data - Additional data
   * @private
   */
  _log(level, message, data = null) {
    if (this.logger && typeof this.logger[level] === "function") {
      this.logger[level](`[${this.name}] ${message}`, data);
    } else {
      // Fallback to console
      console[level](`[${this.name}] ${message}`, data || "");
    }
  }
}

/**
 * AdminGuiService - Central orchestrator for all admin GUI services
 * Manages service lifecycle, dependency injection, and inter-service communication
 */
class AdminGuiService extends BaseService {
  constructor() {
    super("AdminGuiService");

    // Service registry
    this.services = new Map();
    this.serviceInstances = new Map();
    this.dependencyGraph = new Map();

    // Event system
    this.eventBus = new Map();
    this.globalEventHandlers = new Map();

    // Configuration
    this.config = {
      performanceTargets: {
        initTime: 50, // ms
        maxMemory: 5 * 1024 * 1024, // 5MB
        maxServices: 20,
      },
      featureFlags: new Map(),
      dualMode: {
        enabled: false,
        fallbackToLegacy: true,
        enabledEntities: new Set(),
      },
      logging: {
        level: "info",
        maxLogEntries: 1000,
        enablePerformanceLogging: true,
      },
    };

    // Performance monitoring
    this.performanceMetrics = {
      totalInitTime: 0,
      totalStartTime: 0,
      memoryUsage: 0,
      serviceCount: 0,
      eventCount: 0,
      errorCount: 0,
    };

    // Logger
    this.logEntries = [];
    this.logger = {
      debug: (msg, data) => this._logEntry("debug", msg, data),
      info: (msg, data) => this._logEntry("info", msg, data),
      warn: (msg, data) => this._logEntry("warn", msg, data),
      error: (msg, data) => this._logEntry("error", msg, data),
    };

    // Error handling
    this.errorBoundary = {
      enabled: true,
      maxErrors: 50,
      errorHistory: [],
    };

    // Global error handler
    this._setupGlobalErrorHandling();

    this._log("info", "AdminGuiService initialized");
  }

  /**
   * Initialize the service orchestrator
   * @param {Object} config - Configuration options
   * @returns {Promise<void>}
   */
  async initialize(config = {}) {
    const startTime = performance.now();

    try {
      this.config = this._mergeConfig(this.config, config);

      // Initialize feature flags
      await this._initializeFeatureFlags();

      // Setup performance monitoring
      this._setupPerformanceMonitoring();

      await super.initialize(this.config, this.logger);

      this.performanceMetrics.totalInitTime = performance.now() - startTime;
      this._log(
        "info",
        `AdminGuiService fully initialized in ${this.performanceMetrics.totalInitTime.toFixed(2)}ms`,
      );
    } catch (error) {
      this._handleError("initialization", error);
      throw error;
    }
  }

  /**
   * Register a service with the orchestrator
   * @param {string} name - Service name
   * @param {Function} ServiceClass - Service constructor
   * @param {Array} dependencies - Service dependencies
   * @param {Object} config - Service-specific configuration
   */
  registerService(name, ServiceClass, dependencies = [], config = {}) {
    if (this.services.has(name)) {
      throw new Error(`Service ${name} is already registered`);
    }

    this.services.set(name, {
      name,
      ServiceClass,
      dependencies,
      config,
      instance: null,
      state: "registered",
    });

    this.dependencyGraph.set(name, dependencies);

    this._log(
      "info",
      `Service ${name} registered with dependencies: [${dependencies.join(", ")}]`,
    );
  }

  /**
   * Initialize all registered services in dependency order
   * @returns {Promise<void>}
   */
  async initializeAllServices() {
    const startTime = performance.now();

    try {
      const initOrder = this._resolveInitializationOrder();
      this._log(
        "info",
        `Initializing services in order: [${initOrder.join(", ")}]`,
      );

      for (const serviceName of initOrder) {
        await this._initializeService(serviceName);
      }

      this.performanceMetrics.serviceCount = this.serviceInstances.size;
      const totalTime = performance.now() - startTime;

      this._log(
        "info",
        `All ${this.serviceInstances.size} services initialized in ${totalTime.toFixed(2)}ms`,
      );
    } catch (error) {
      this._handleError("service-initialization", error);
      throw error;
    }
  }

  /**
   * Start all services
   * @returns {Promise<void>}
   */
  async startAllServices() {
    const startTime = performance.now();

    try {
      const startOrder = this._resolveInitializationOrder();

      for (const serviceName of startOrder) {
        const instance = this.serviceInstances.get(serviceName);
        if (instance && instance.state === "initialized") {
          await instance.start();
        }
      }

      this.performanceMetrics.totalStartTime = performance.now() - startTime;
      this._log(
        "info",
        `All services started in ${this.performanceMetrics.totalStartTime.toFixed(2)}ms`,
      );
    } catch (error) {
      this._handleError("service-start", error);
      throw error;
    }
  }

  /**
   * Stop all services
   * @returns {Promise<void>}
   */
  async stopAllServices() {
    try {
      const stopOrder = this._resolveInitializationOrder().reverse();

      for (const serviceName of stopOrder) {
        const instance = this.serviceInstances.get(serviceName);
        if (instance && instance.state === "running") {
          await instance.stop();
        }
      }

      this._log("info", "All services stopped successfully");
    } catch (error) {
      this._handleError("service-stop", error);
      throw error;
    }
  }

  /**
   * Get service instance by name
   * @param {string} name - Service name
   * @returns {BaseService|null} Service instance
   */
  getService(name) {
    return this.serviceInstances.get(name) || null;
  }

  /**
   * Check if feature flag is enabled
   * @param {string} flagName - Feature flag name
   * @param {Object} context - Context for flag evaluation
   * @returns {boolean} Flag status
   */
  isFeatureEnabled(flagName, context = {}) {
    const flag = this.config.featureFlags.get(flagName);
    if (!flag) {
      return false;
    }

    // Simple flag evaluation (can be enhanced with complex rules)
    if (typeof flag === "boolean") {
      return flag;
    }

    if (typeof flag === "object") {
      // Entity-specific flags
      if (flag.entities && context.entityType) {
        return flag.entities.has(context.entityType);
      }

      // User role-based flags
      if (flag.roles && context.userRole) {
        return flag.roles.includes(context.userRole);
      }

      // Percentage rollout
      if (flag.percentage && context.userId) {
        const hash = this._hashString(context.userId + flagName);
        return hash % 100 < flag.percentage;
      }
    }

    return false;
  }

  /**
   * Set feature flag value
   * @param {string} flagName - Feature flag name
   * @param {boolean|Object} value - Flag value or configuration
   */
  setFeatureFlag(flagName, value) {
    this.config.featureFlags.set(flagName, value);
    this.broadcastEvent("AdminGuiService", "featureFlagChanged", {
      flagName,
      value,
      timestamp: Date.now(),
    });
    this._log("info", `Feature flag ${flagName} set to:`, value);
  }

  /**
   * Broadcast event to all interested services
   * @param {string} source - Source service name
   * @param {string} eventName - Event name
   * @param {*} data - Event data
   */
  broadcastEvent(source, eventName, data) {
    this.performanceMetrics.eventCount++;

    const eventKey = `${source}:${eventName}`;

    // Global event handlers
    if (this.globalEventHandlers.has(eventName)) {
      this.globalEventHandlers.get(eventName).forEach((handler) => {
        try {
          handler(data, source);
        } catch (error) {
          this._handleError("event-handling", error, { eventName, source });
        }
      });
    }

    // Service-specific event handlers
    this.serviceInstances.forEach((service, serviceName) => {
      if (serviceName !== source) {
        service.handleEvent(eventName, data, source);
      }
    });

    this._log("debug", `Event broadcasted: ${eventKey}`, data);
  }

  /**
   * Subscribe to global events
   * @param {string} eventName - Event name
   * @param {Function} handler - Event handler
   */
  subscribeGlobal(eventName, handler) {
    if (!this.globalEventHandlers.has(eventName)) {
      this.globalEventHandlers.set(eventName, []);
    }
    this.globalEventHandlers.get(eventName).push(handler);
  }

  /**
   * Get comprehensive system health status
   * @returns {Object} System health information
   */
  getSystemHealth() {
    const services = {};
    this.serviceInstances.forEach((service, name) => {
      services[name] = service.getHealth();
    });

    return {
      orchestrator: this.getHealth(),
      services,
      performance: { ...this.performanceMetrics },
      featureFlags: Object.fromEntries(this.config.featureFlags),
      dualMode: { ...this.config.dualMode },
      memoryUsage: this._estimateMemoryUsage(),
      isHealthy: this._calculateOverallHealth(),
    };
  }

  /**
   * Enable dual-mode operation for specific entities
   * @param {Array} entityTypes - Entity types to enable new architecture for
   */
  enableDualMode(entityTypes = []) {
    this.config.dualMode.enabled = true;
    entityTypes.forEach((entityType) => {
      this.config.dualMode.enabledEntities.add(entityType);
    });

    this.broadcastEvent("AdminGuiService", "dualModeChanged", {
      enabled: true,
      enabledEntities: Array.from(this.config.dualMode.enabledEntities),
    });

    this._log(
      "info",
      `Dual-mode enabled for entities: [${entityTypes.join(", ")}]`,
    );
  }

  /**
   * Check if dual-mode is enabled for entity type
   * @param {string} entityType - Entity type to check
   * @returns {boolean} Dual-mode status for entity
   */
  isDualModeEnabled(entityType) {
    return (
      this.config.dualMode.enabled &&
      this.config.dualMode.enabledEntities.has(entityType)
    );
  }

  // Private methods

  /**
   * Initialize a specific service
   * @param {string} serviceName - Service name
   * @returns {Promise<void>}
   * @private
   */
  async _initializeService(serviceName) {
    const serviceDefinition = this.services.get(serviceName);
    if (!serviceDefinition) {
      throw new Error(`Service ${serviceName} not found in registry`);
    }

    if (serviceDefinition.instance) {
      return; // Already initialized
    }

    // Check dependencies are ready
    for (const dependency of serviceDefinition.dependencies) {
      const depInstance = this.serviceInstances.get(dependency);
      if (!depInstance || depInstance.state !== "initialized") {
        throw new Error(
          `Dependency ${dependency} not ready for ${serviceName}`,
        );
      }
    }

    // Create and initialize service instance
    const instance = new serviceDefinition.ServiceClass();
    await instance.initialize(serviceDefinition.config, this.logger);

    serviceDefinition.instance = instance;
    this.serviceInstances.set(serviceName, instance);

    this._log("info", `Service ${serviceName} initialized successfully`);
  }

  /**
   * Resolve service initialization order based on dependencies
   * @returns {Array} Ordered list of service names
   * @private
   */
  _resolveInitializationOrder() {
    const visited = new Set();
    const visiting = new Set();
    const order = [];

    const visit = (serviceName) => {
      if (visited.has(serviceName)) return;
      if (visiting.has(serviceName)) {
        throw new Error(
          `Circular dependency detected involving ${serviceName}`,
        );
      }

      visiting.add(serviceName);

      const dependencies = this.dependencyGraph.get(serviceName) || [];
      for (const dependency of dependencies) {
        visit(dependency);
      }

      visiting.delete(serviceName);
      visited.add(serviceName);
      order.push(serviceName);
    };

    Array.from(this.services.keys()).forEach(visit);
    return order;
  }

  /**
   * Initialize feature flags from configuration
   * @returns {Promise<void>}
   * @private
   */
  async _initializeFeatureFlags() {
    // Default feature flags for US-082-A
    const defaultFlags = {
      "service-layer-enabled": false,
      "api-service-caching": true,
      "enhanced-notifications": false,
      "dual-mode-operation": false,
      "performance-monitoring": true,
      "security-service-enabled": true,
      "csrf-protection": true,
      "rate-limiting": true,
      "input-validation": true,
      "security-headers": true,
    };

    Object.entries(defaultFlags).forEach(([name, value]) => {
      if (!this.config.featureFlags.has(name)) {
        this.config.featureFlags.set(name, value);
      }
    });

    this._log(
      "info",
      `Feature flags initialized: ${this.config.featureFlags.size} flags`,
    );
  }

  /**
   * Setup performance monitoring
   * @private
   */
  _setupPerformanceMonitoring() {
    if (!this.config.logging.enablePerformanceLogging) {
      return;
    }

    // Monitor memory usage periodically
    setInterval(() => {
      this.performanceMetrics.memoryUsage = this._estimateMemoryUsage();
    }, 30000); // Every 30 seconds

    this._log("info", "Performance monitoring enabled");
  }

  /**
   * Setup global error handling
   * @private
   */
  _setupGlobalErrorHandling() {
    if (!this.errorBoundary.enabled) {
      return;
    }

    // Global error handler
    const originalHandler = window.onerror;
    window.onerror = (message, source, lineno, colno, error) => {
      this._handleError("global", {
        message,
        source,
        line: lineno,
        column: colno,
        error: error,
      });

      if (originalHandler) {
        return originalHandler(message, source, lineno, colno, error);
      }
      return false;
    };

    // Promise rejection handler
    window.addEventListener("unhandledrejection", (event) => {
      this._handleError("unhandled-promise", event.reason);
    });
  }

  /**
   * Handle errors with error boundary
   * @param {string} context - Error context
   * @param {Error} error - Error object
   * @param {Object} metadata - Additional metadata
   * @private
   */
  _handleError(context, error, metadata = {}) {
    this.performanceMetrics.errorCount++;

    const errorEntry = {
      timestamp: Date.now(),
      context,
      error: error.message || error,
      stack: error.stack || "",
      metadata,
    };

    this.errorBoundary.errorHistory.push(errorEntry);

    // Keep error history bounded
    if (this.errorBoundary.errorHistory.length > this.errorBoundary.maxErrors) {
      this.errorBoundary.errorHistory.shift();
    }

    this._log("error", `Error in ${context}:`, errorEntry);

    // Broadcast error event for monitoring services
    this.broadcastEvent("AdminGuiService", "systemError", errorEntry);
  }

  /**
   * Estimate memory usage
   * @returns {number} Estimated memory usage in bytes
   * @private
   */
  _estimateMemoryUsage() {
    if (performance.memory) {
      return performance.memory.usedJSHeapSize;
    }

    // Fallback estimation
    let estimate = 0;
    estimate += this.logEntries.length * 200; // ~200 bytes per log entry
    estimate += this.serviceInstances.size * 10000; // ~10KB per service
    estimate += this.errorBoundary.errorHistory.length * 500; // ~500 bytes per error

    return estimate;
  }

  /**
   * Calculate overall system health
   * @returns {boolean} Overall health status
   * @private
   */
  _calculateOverallHealth() {
    // Check orchestrator health
    if (this.state !== "running") {
      return false;
    }

    // Check service health
    let healthyServices = 0;
    this.serviceInstances.forEach((service) => {
      if (service.getHealth().isHealthy) {
        healthyServices++;
      }
    });

    const healthPercentage =
      this.serviceInstances.size > 0
        ? healthyServices / this.serviceInstances.size
        : 1;

    // Require 90% service health for overall health
    return healthPercentage >= 0.9 && this.performanceMetrics.errorCount < 20;
  }

  /**
   * Merge configuration objects deeply
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
   * Simple string hash function
   * @param {string} str - String to hash
   * @returns {number} Hash value
   * @private
   */
  _hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    return Math.abs(hash);
  }

  /**
   * Log entry creation
   * @param {string} level - Log level
   * @param {string} message - Log message
   * @param {*} data - Log data
   * @private
   */
  _logEntry(level, message, data) {
    const entry = {
      timestamp: Date.now(),
      level,
      message,
      data: data || null,
      service: "AdminGuiService",
    };

    this.logEntries.push(entry);

    // Keep log entries bounded
    if (this.logEntries.length > this.config.logging.maxLogEntries) {
      this.logEntries.shift();
    }

    // Output to console based on level
    if (this._shouldLog(level)) {
      const logMethod = console[level] || console.log;
      logMethod(
        `[${new Date(entry.timestamp).toISOString()}] ${message}`,
        data || "",
      );
    }
  }

  /**
   * Check if should log at level
   * @param {string} level - Log level
   * @returns {boolean} Should log
   * @private
   */
  _shouldLog(level) {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logging.level] || 1;
    const messageLevel = levels[level] || 1;

    return messageLevel >= configLevel;
  }
}

// Global service instance
window.AdminGuiService = null;

/**
 * Initialize the Admin GUI Service Layer
 * Entry point for service-based architecture
 *
 * @param {Object} config - Configuration options
 * @returns {Promise<AdminGuiService>} Initialized service orchestrator
 */
async function initializeAdminGuiServices(config = {}) {
  try {
    if (window.AdminGuiService) {
      console.warn("AdminGuiService already initialized");
      return window.AdminGuiService;
    }

    const service = new AdminGuiService();
    await service.initialize(config);

    window.AdminGuiService = service;

    console.log("🚀 AdminGuiService initialized successfully");
    console.log("📊 Performance:", service.performanceMetrics);

    return service;
  } catch (error) {
    console.error("❌ Failed to initialize AdminGuiService:", error);
    throw error;
  }
}

// Export for both CommonJS and ES6 modules
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    AdminGuiService,
    BaseService,
    initializeAdminGuiServices,
  };
}

// AMD support
if (typeof define === "function" && define.amd) {
  define([], function () {
    return {
      AdminGuiService,
      BaseService,
      initializeAdminGuiServices,
    };
  });
}

// Global browser support
if (typeof window !== "undefined") {
  window.AdminGuiService = AdminGuiService;
  window.BaseService = BaseService;
  window.initializeAdminGuiServices = initializeAdminGuiServices;
}

// Node.js/CommonJS export for Jest testing
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    AdminGuiService,
    BaseService,
    initializeAdminGuiServices,
  };
}
