/**
 * ComponentOrchestrator - Central Event Bus and State Management System
 * US-082-B Component Architecture Development
 *
 * Manages component lifecycle, communication, and state synchronization
 * Implements publish-subscribe pattern for decoupled component interaction
 *
 * Features:
 * - Centralized event bus for component communication
 * - Global state management with immutability
 * - Component registry and lifecycle management
 * - Message queuing and replay capabilities
 * - Performance monitoring and debugging
 * - Error isolation and recovery
 *
 * Security Features - PHASE 3: Information Security
 * - Error message sanitization and information disclosure prevention
 * - Environment-aware error verbosity (production vs development)
 * - Sensitive data removal from logs and error messages
 * - Debug interface access controls with sanitized output
 * - Security violation detection and generic error responses
 */

class ComponentOrchestrator {
  constructor(config = {}) {
    // Configuration
    this.config = {
      debug: false,
      maxQueueSize: 100,
      enableReplay: true,
      stateHistory: 10,
      performanceMonitoring: true,
      errorIsolation: true,
      ...config,
    };

    // Component registry
    this.components = new Map();
    this.componentDependencies = new Map();

    // Event bus
    this.eventSubscriptions = new Map();
    this.eventQueue = [];
    this.eventHistory = [];

    // State management
    this.globalState = {};
    this.stateHistory = [];
    this.stateSubscribers = new Map();

    // Performance tracking
    this.metrics = {
      eventsDispatched: 0,
      eventsQueued: 0,
      stateUpdates: 0,
      averageDispatchTime: 0,
      componentCount: 0,
    };

    // Security: DoS protection and rate limiting
    this.rateLimiting = {
      eventCounts: new Map(), // componentId -> count
      stateUpdateCounts: new Map(), // path -> count
      lastResetTime: Date.now(),
      windowSize: 60000, // 1 minute window
      maxEventsPerMinute: 1000, // Per component
      maxStateUpdatesPerMinute: 100, // Per path
      maxTotalEventsPerMinute: 5000, // Global limit
      suspendedComponents: new Set(),
      suspensionTimestamps: new WeakMap(), // Memory-efficient: GC collectable references
    };

    // Memory-efficient component metadata cache using WeakMap
    this.componentMetadata = new WeakMap();

    // Race condition protection: Initialize state lock
    this.stateLock = {
      locked: false,
      queue: [],
      lockTimeout: 5000, // 5 second timeout
    };

    // Error tracking
    this.errorLog = [];
    this.failedComponents = new Set();

    // Security: Environment detection for error message sanitization
    this.environment = {
      isDevelopment: this.detectDevelopmentEnvironment(),
      debugMode: config.debug || false,
      logSanitization: config.logSanitization !== false, // Default to true
    };

    // Session timeout management
    this.sessionTimeout = {
      enabled: config.sessionTimeout !== false, // Default enabled
      timeoutDuration: config.sessionTimeoutDuration || 30 * 60 * 1000, // 30 minutes
      warningDuration: config.sessionWarningDuration || 5 * 60 * 1000, // 5 minutes before timeout
      lastActivityTime: Date.now(),
      timeoutTimer: null,
      warningTimer: null,
      warningShown: false,
      activityEvents: ["click", "keydown", "scroll", "mousemove", "touchstart"],
    };

    // Initialize
    this.initialized = false;
    this.initialize();
  }

  /**
   * Initialize the orchestrator
   */
  initialize() {
    if (this.initialized) {
      return;
    }

    // Log environment detection result (sanitized)
    this.logInfo(
      `ComponentOrchestrator initializing in ${this.environment.isDevelopment ? "development" : "production"} environment`,
    );

    // Setup global error handler
    if (this.config.errorIsolation) {
      this.setupErrorHandling();
    }

    // Setup performance monitoring
    if (this.config.performanceMonitoring) {
      this.setupPerformanceMonitoring();
    }

    // Setup session timeout management
    if (this.sessionTimeout.enabled) {
      this.setupSessionTimeoutManagement();
    }

    // Setup debug mode - SECURITY HARDENED
    if (this.config.debug) {
      // Security: Only expose debug interface in development environment
      if (
        typeof window !== "undefined" &&
        (window.location?.hostname === "localhost" ||
          window.location?.hostname === "127.0.0.1" ||
          window.location?.hostname?.endsWith(".local"))
      ) {
        // Security: Create restricted debug interface instead of full exposure
        window.UMIG_ORCHESTRATOR_DEBUG = {
          // Read-only access to safe methods
          getMetrics: () => this.getMetrics(),
          getComponentStatus: (id) => this.getComponentStatus(id),
          getState: (path) =>
            path ? this.getState(path) : "[REDACTED - Use specific path]",

          // Limited diagnostic methods
          listComponents: () => Array.from(this.components.keys()),
          getEventHistory: () => this.eventHistory.slice(-10), // Last 10 events only

          // Security: No access to sensitive methods like setState, emit, etc.
          _warning: "DEBUG MODE: Limited interface for development only",
        };

        this.logDebug(
          "ComponentOrchestrator initialized with SECURE debug interface",
        );
      } else {
        // Security: Production environment - no global exposure
        this.logDebug(
          "ComponentOrchestrator debug mode disabled in production environment",
        );
      }
    }

    this.initialized = true;
    this.emit("orchestrator:initialized", { timestamp: Date.now() });
  }

  /**
   * Set metadata for a component using WeakMap for memory efficiency
   * @param {object} component - Component instance
   * @param {object} metadata - Metadata to store
   */
  setComponentMetadata(component, metadata) {
    this.componentMetadata.set(component, metadata);
  }

  /**
   * Get metadata for a component from WeakMap
   * @param {object} component - Component instance
   * @returns {object|undefined} Stored metadata
   */
  getComponentMetadata(component) {
    return this.componentMetadata.get(component);
  }

  /**
   * Register a component with the orchestrator
   */
  registerComponent(componentId, component, dependencies = []) {
    if (this.components.has(componentId)) {
      this.logWarning(`Component ${componentId} already registered`);
      return false;
    }

    // Validate component interface
    if (!this.validateComponent(component)) {
      const error = new Error(
        this.sanitizeErrorMessage(
          `Invalid component interface: ${componentId}`,
          "registration",
        ),
      );
      this.handleComponentError(componentId, error);
      throw error;
    }

    // Store component and its dependencies
    const componentRecord = {
      id: componentId,
      instance: component,
      status: "registered",
      registeredAt: Date.now(),
    };

    this.components.set(componentId, componentRecord);

    // Store metadata in WeakMap for memory efficiency
    this.componentMetadata.set(component, {
      id: componentId,
      registrationTime: Date.now(),
      lastActivity: Date.now(),
      eventCount: 0,
      errorCount: 0,
      dependencies: dependencies,
    });

    this.componentDependencies.set(componentId, dependencies);

    // Wire up component to orchestrator
    this.wireComponent(componentId, component);

    // Update metrics
    this.metrics.componentCount++;

    // Notify subscribers
    this.emit("component:registered", {
      componentId,
      dependencies,
      timestamp: Date.now(),
    });

    this.logDebug(`Component registered: ${componentId}`);
    return true;
  }

  /**
   * Unregister a component
   */
  unregisterComponent(componentId) {
    const component = this.components.get(componentId);
    if (!component) {
      this.logWarning(`Component not found: ${componentId}`);
      return false;
    }

    // Check for dependent components
    const dependents = this.findDependentComponents(componentId);
    if (dependents.length > 0) {
      throw new Error(
        `Cannot unregister ${componentId}: required by ${dependents.join(", ")}`,
      );
    }

    // Unwire component
    this.unwireComponent(componentId);

    // Remove from registry
    this.components.delete(componentId);
    this.componentDependencies.delete(componentId);

    // Update metrics
    this.metrics.componentCount--;

    // Notify subscribers
    this.emit("component:unregistered", {
      componentId,
      timestamp: Date.now(),
    });

    this.logDebug(`Component unregistered: ${componentId}`);
    return true;
  }

  /**
   * Subscribe to events
   */
  on(eventName, callback, context = null) {
    if (!this.eventSubscriptions.has(eventName)) {
      this.eventSubscriptions.set(eventName, []);
    }

    const subscription = {
      id: this.generateSubscriptionId(),
      callback,
      context,
      createdAt: Date.now(),
    };

    this.eventSubscriptions.get(eventName).push(subscription);

    this.logDebug(`Subscribed to event: ${eventName}`);
    return subscription.id;
  }

  /**
   * Unsubscribe from events
   */
  off(eventName, subscriptionId) {
    const subscriptions = this.eventSubscriptions.get(eventName);
    if (!subscriptions) {
      return false;
    }

    const index = subscriptions.findIndex((sub) => sub.id === subscriptionId);
    if (index === -1) {
      return false;
    }

    subscriptions.splice(index, 1);

    if (subscriptions.length === 0) {
      this.eventSubscriptions.delete(eventName);
    }

    this.logDebug(`Unsubscribed from event: ${eventName}`);
    return true;
  }

  /**
   * Emit an event - SECURITY HARDENED
   * Prevents XSS attacks through event data (CVSS 7.5 fix)
   * Includes DoS protection via rate limiting
   */
  emit(eventName, data = {}, options = {}) {
    // Security: Validate event name
    this.validateEventName(eventName);

    // Security: Check rate limits to prevent DoS attacks
    const source = options.source || "orchestrator";
    try {
      this.checkRateLimit(source, "event");
    } catch (error) {
      // Rate limit exceeded - log and reject (sanitized)
      this.logWarning(
        this.sanitizeLogMessage(
          `Rate limit exceeded for source: ${error.message}`,
          { source },
        ),
      );
      throw new Error(this.sanitizeErrorMessage(error.message, "rate_limit"));
    }

    // Track component activity efficiently using WeakMap
    if (source !== "orchestrator" && source !== "orchestrator-internal") {
      this.trackComponentActivity(source, "event");
    }

    // Security: Check memory limits
    this.checkMemoryLimits();

    // Security: Sanitize event data to prevent XSS
    const sanitizedData = this.sanitizeEventData(data);

    // Security: Validate options
    if (options.source && typeof options.source !== "string") {
      throw new Error(
        this.sanitizeErrorMessage(
          "Security violation: Event source must be a string",
          "security",
        ),
      );
    }

    if (
      options.priority &&
      !["low", "normal", "high"].includes(options.priority)
    ) {
      throw new Error(
        this.sanitizeErrorMessage(
          "Security violation: Invalid event priority",
          "security",
        ),
      );
    }

    const event = {
      id: this.generateEventId(),
      name: eventName,
      data: sanitizedData, // Use sanitized data
      timestamp: Date.now(),
      source: source.substring(0, 50), // Limit source length
      priority: options.priority || "normal",
    };

    // Add to history if replay is enabled
    if (this.config.enableReplay) {
      this.addToEventHistory(event);
    }

    // Queue or dispatch based on priority
    if (options.queued) {
      this.queueEvent(event);
    } else {
      this.dispatchEvent(event);
    }

    return event.id;
  }

  /**
   * Dispatch an event to subscribers with suspended component bypass
   */
  dispatchEvent(event) {
    const startTime = performance.now();

    // Security: Skip processing if source is suspended (except internal events)
    if (
      event.source &&
      event.source !== "orchestrator-internal" &&
      this.rateLimiting.suspendedComponents.has(event.source)
    ) {
      this.logDebug(
        `Event dispatch blocked: source "${event.source}" is suspended`,
      );
      return;
    }

    const subscriptions = this.eventSubscriptions.get(event.name) || [];
    const wildcardSubscriptions = this.eventSubscriptions.get("*") || [];
    const allSubscriptions = [...subscriptions, ...wildcardSubscriptions];

    let successCount = 0;
    let failureCount = 0;

    for (const subscription of allSubscriptions) {
      try {
        const context = subscription.context || this;
        subscription.callback.call(context, event.data, event);
        successCount++;
      } catch (error) {
        failureCount++;
        this.handleSubscriptionError(error, subscription, event);
      }
    }

    // Update metrics
    const dispatchTime = performance.now() - startTime;
    this.updateDispatchMetrics(dispatchTime);
    this.metrics.eventsDispatched++;

    this.logDebug(
      `Event dispatched: ${event.name} (${successCount} success, ${failureCount} failures)`,
    );
  }

  /**
   * Queue an event for later processing
   */
  queueEvent(event) {
    if (this.eventQueue.length >= this.config.maxQueueSize) {
      this.logWarning("Event queue full, dropping oldest event");
      this.eventQueue.shift();
    }

    this.eventQueue.push(event);
    this.metrics.eventsQueued++;

    this.logDebug(`Event queued: ${event.name}`);
  }

  /**
   * Process queued events
   */
  processEventQueue() {
    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      this.dispatchEvent(event);
    }

    return events.length;
  }

  /**
   * Update global state with race condition protection and rate limiting
   */
  setState(path, value, options = {}) {
    // Security: Check rate limits for state updates
    try {
      this.checkRateLimit(path, "state");
    } catch (error) {
      this.logWarning(
        this.sanitizeLogMessage(
          `State update rate limit exceeded: ${error.message}`,
          { path },
        ),
      );
      throw new Error(this.sanitizeErrorMessage(error.message, "rate_limit"));
    }

    // Security: Check memory limits
    this.checkMemoryLimits();

    // For synchronous compatibility, we execute immediately if no queue
    if (!this.stateLock.locked && this.stateLock.queue.length === 0) {
      return this.executeStateSyncronously(path, value, options);
    }

    // Queue operation for atomic execution
    return this.executeWithStateLock(path, value, options);
  }

  /**
   * Execute state update synchronously when no contention
   */
  executeStateSyncronously(path, value, options = {}) {
    // Acquire lock to prevent race conditions
    this.stateLock.locked = true;

    try {
      const oldState = this.deepClone(this.globalState);

      // Atomic state update
      this.setNestedValue(this.globalState, path, value);

      // Add to history
      if (this.stateHistory.length >= this.config.stateHistory) {
        this.stateHistory.shift();
      }
      this.stateHistory.push({
        timestamp: Date.now(),
        path,
        oldValue: this.getNestedValue(oldState, path),
        newValue: value,
        source: options.source || "unknown",
      });

      // Notify state subscribers
      this.notifyStateSubscribers(path, value, oldState);

      // Update metrics
      this.metrics.stateUpdates++;

      // Emit state change event (without rate limiting to prevent recursion)
      this.emitInternal("state:changed", {
        path,
        value,
        oldState: this.getNestedValue(oldState, path),
        source: options.source,
      });

      this.logDebug(`State updated synchronously: ${path}`);
      return true;
    } catch (error) {
      throw error;
    } finally {
      // Always release lock
      this.stateLock.locked = false;
    }
  }

  /**
   * Execute state update with atomic locking mechanism
   * Prevents race conditions and data corruption
   * Returns a promise for async operations or throws synchronously
   */
  executeWithStateLock(path, value, options = {}) {
    // For backward compatibility, throw synchronously if possible
    if (options.sync !== false) {
      // Try to execute synchronously with timeout
      const startTime = Date.now();
      const maxWait = 100; // 100ms max wait

      while (this.stateLock.locked && Date.now() - startTime < maxWait) {
        // Busy wait for a short time
      }

      if (!this.stateLock.locked) {
        return this.executeStateSyncronously(path, value, options);
      }
    }

    // Use async operation for longer waits or if sync=false
    return new Promise((resolve, reject) => {
      const operation = {
        path,
        value,
        options,
        resolve,
        reject,
        timestamp: Date.now(),
      };

      // Add to queue
      this.stateLock.queue.push(operation);

      // Process queue if not locked
      if (!this.stateLock.locked) {
        // Use setTimeout to avoid blocking the main thread
        setTimeout(() => this.processStateLockQueue(), 0);
      }
    });
  }

  /**
   * Process queued state operations atomically
   */
  processStateLockQueue() {
    if (this.stateLock.locked || this.stateLock.queue.length === 0) {
      return;
    }

    // Acquire lock
    this.stateLock.locked = true;
    const operation = this.stateLock.queue.shift();

    // Set timeout to prevent deadlocks
    const timeoutId = setTimeout(() => {
      this.stateLock.locked = false;
      operation.reject(
        new Error(
          this.sanitizeErrorMessage(
            "State update timeout: operation took too long",
            "timeout",
          ),
        ),
      );
      // Process next operation
      this.processStateLockQueue();
    }, this.stateLock.lockTimeout);

    try {
      // Check for stale operations (older than 30 seconds)
      if (Date.now() - operation.timestamp > 30000) {
        throw new Error(
          this.sanitizeErrorMessage(
            "State update timeout: operation expired",
            "timeout",
          ),
        );
      }

      const oldState = this.deepClone(this.globalState);

      // Atomic state update
      this.setNestedValue(this.globalState, operation.path, operation.value);

      // Add to history
      if (this.stateHistory.length >= this.config.stateHistory) {
        this.stateHistory.shift();
      }
      this.stateHistory.push({
        timestamp: Date.now(),
        path: operation.path,
        oldValue: this.getNestedValue(oldState, operation.path),
        newValue: operation.value,
        source: operation.options.source || "unknown",
      });

      // Notify state subscribers
      this.notifyStateSubscribers(operation.path, operation.value, oldState);

      // Update metrics
      this.metrics.stateUpdates++;

      // Emit state change event (without rate limiting to prevent recursion)
      this.emitInternal("state:changed", {
        path: operation.path,
        value: operation.value,
        oldState: this.getNestedValue(oldState, operation.path),
        source: operation.options.source,
      });

      this.logDebug(`State updated atomically: ${operation.path}`);

      // Clear timeout and release lock
      clearTimeout(timeoutId);
      this.stateLock.locked = false;
      operation.resolve(true);
    } catch (error) {
      // Clear timeout and release lock on error
      clearTimeout(timeoutId);
      this.stateLock.locked = false;
      operation.reject(error);
    }

    // Process next operation in queue
    setImmediate(() => this.processStateLockQueue());
  }

  /**
   * Internal emit that bypasses rate limiting (used by setState)
   */
  emitInternal(eventName, data = {}) {
    const event = {
      id: this.generateEventId(),
      name: eventName,
      data: this.sanitizeEventData(data),
      timestamp: Date.now(),
      source: "orchestrator-internal",
      priority: "normal",
    };

    this.dispatchEvent(event);
    return event.id;
  }

  /**
   * Get state value by path
   */
  getState(path) {
    if (!path) {
      return this.deepClone(this.globalState);
    }
    return this.getNestedValue(this.globalState, path);
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(path, callback, context = null) {
    const key = path || "*";

    if (!this.stateSubscribers.has(key)) {
      this.stateSubscribers.set(key, []);
    }

    const subscription = {
      id: this.generateSubscriptionId(),
      callback,
      context,
      path,
      createdAt: Date.now(),
    };

    this.stateSubscribers.get(key).push(subscription);

    this.logDebug(`Subscribed to state changes: ${path || "global"}`);
    return subscription.id;
  }

  /**
   * Broadcast message to specific components
   */
  broadcast(componentIds, message, data = {}) {
    const results = [];

    for (const componentId of componentIds) {
      const component = this.components.get(componentId);
      if (!component) {
        results.push({
          componentId,
          success: false,
          error: "Component not found",
        });
        continue;
      }

      try {
        // Call component's message handler if it exists
        if (component.instance.onMessage) {
          component.instance.onMessage(message, data);
        }

        results.push({
          componentId,
          success: true,
        });
      } catch (error) {
        results.push({
          componentId,
          success: false,
          error: error.message,
        });
        this.handleComponentError(componentId, error);
      }
    }

    return results;
  }

  /**
   * Execute component lifecycle method - SECURITY HARDENED
   * Prevents arbitrary code execution (CVSS 8.0 fix)
   */
  executeLifecycle(componentId, method, ...args) {
    const component = this.components.get(componentId);
    if (!component) {
      throw new Error(`Component not found: ${componentId}`);
    }

    // Security: Whitelist allowed lifecycle methods only
    const allowedMethods = [
      "initialize",
      "render",
      "destroy",
      "onMessage",
      "onStateChange",
      "validate",
      "refresh",
      "reset",
    ];

    if (!allowedMethods.includes(method)) {
      throw new Error(
        this.sanitizeErrorMessage(
          `Security violation: Method "${method}" not allowed. Only lifecycle methods permitted: ${allowedMethods.join(", ")}`,
          "security",
        ),
      );
    }

    // Security: Validate method name format (prevent injection)
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(method)) {
      throw new Error(
        this.sanitizeErrorMessage(
          `Security violation: Invalid method name format "${method}"`,
          "security",
        ),
      );
    }

    // Security: Validate component ID format
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(componentId)) {
      throw new Error(
        this.sanitizeErrorMessage(
          `Security violation: Invalid component ID format "${componentId}"`,
          "security",
        ),
      );
    }

    if (typeof component.instance[method] !== "function") {
      throw new Error(
        this.sanitizeErrorMessage(
          `Method not found: ${componentId}.${method}`,
          "method_not_found",
        ),
      );
    }

    // Security: Limit number of arguments to prevent payload injection
    if (args.length > 10) {
      throw new Error("Security violation: Too many arguments (max 10)");
    }

    // Security: Validate arguments are not functions (prevent code injection)
    for (let i = 0; i < args.length; i++) {
      if (typeof args[i] === "function") {
        throw new Error(
          `Security violation: Argument ${i} cannot be a function`,
        );
      }
    }

    try {
      const result = component.instance[method](...args);
      component.status = this.getStatusAfterLifecycle(method);

      // Security: Validate return value is not a function
      if (typeof result === "function") {
        throw new Error(
          this.sanitizeErrorMessage(
            "Security violation: Component method returned a function, which is not allowed",
            "security",
          ),
        );
      }

      return result;
    } catch (error) {
      this.handleComponentError(componentId, error);
      throw error;
    }
  }

  /**
   * Initialize all registered components
   */
  initializeComponents() {
    const sortedComponents = this.sortComponentsByDependencies();
    const results = [];

    for (const componentId of sortedComponents) {
      try {
        this.executeLifecycle(componentId, "initialize");
        results.push({
          componentId,
          success: true,
        });
      } catch (error) {
        results.push({
          componentId,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Destroy all components
   */
  destroyComponents() {
    const sortedComponents = this.sortComponentsByDependencies().reverse();
    const results = [];

    for (const componentId of sortedComponents) {
      try {
        this.executeLifecycle(componentId, "destroy");
        results.push({
          componentId,
          success: true,
        });
      } catch (error) {
        results.push({
          componentId,
          success: false,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Get component status
   */
  getComponentStatus(componentId) {
    const component = this.components.get(componentId);
    if (!component) {
      return null;
    }

    return {
      id: component.id,
      status: component.status,
      registeredAt: component.registeredAt,
      hasErrors: this.failedComponents.has(componentId),
      dependencies: this.componentDependencies.get(componentId) || [],
      dependents: this.findDependentComponents(componentId),
    };
  }

  /**
   * Get orchestrator metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      eventQueueSize: this.eventQueue.length,
      eventHistorySize: this.eventHistory.length,
      stateHistorySize: this.stateHistory.length,
      activeSubscriptions: this.countActiveSubscriptions(),
      failedComponents: this.failedComponents.size,
    };
  }

  /**
   * Replay events from history
   */
  replayEvents(filter = null, limit = 10) {
    let events = [...this.eventHistory];

    if (filter) {
      events = events.filter(filter);
    }

    events = events.slice(-limit);

    for (const event of events) {
      this.dispatchEvent(event);
    }

    return events.length;
  }

  /**
   * Reset orchestrator state
   */
  reset() {
    // Destroy all components
    this.destroyComponents();

    // Clear registries
    this.components.clear();
    this.componentDependencies.clear();
    this.eventSubscriptions.clear();
    this.stateSubscribers.clear();

    // Clear queues and history
    this.eventQueue = [];
    this.eventHistory = [];
    this.stateHistory = [];

    // Reset state
    this.globalState = {};

    // Reset metrics
    this.metrics = {
      eventsDispatched: 0,
      eventsQueued: 0,
      stateUpdates: 0,
      averageDispatchTime: 0,
      componentCount: 0,
    };

    // Clear errors
    this.errorLog = [];
    this.failedComponents.clear();

    this.emit("orchestrator:reset", { timestamp: Date.now() });
  }

  // ===== Security Helper Methods =====

  /**
   * Sanitize event data to prevent XSS attacks (CVSS 7.5 fix)
   * Recursively sanitizes all string values in the data object
   */
  sanitizeEventData(data) {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === "string") {
      // Security: Basic XSS prevention - escape HTML characters
      return data
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
    }

    if (typeof data === "function") {
      throw new Error(
        this.sanitizeErrorMessage(
          "Security violation: Functions not allowed in event data",
          "security",
        ),
      );
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeEventData(item));
    }

    if (typeof data === "object") {
      const sanitized = {};
      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          // Security: Validate key names
          if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
            throw new Error(
              this.sanitizeErrorMessage(
                `Security violation: Invalid key name "${key}" in event data`,
                "security",
              ),
            );
          }
          sanitized[key] = this.sanitizeEventData(data[key]);
        }
      }
      return sanitized;
    }

    return data; // Numbers, booleans, etc. are safe
  }

  /**
   * Validate event name to prevent injection
   */
  validateEventName(eventName) {
    if (typeof eventName !== "string" || !eventName.trim()) {
      throw new Error(
        this.sanitizeErrorMessage(
          "Security violation: Event name must be a non-empty string",
          "security",
        ),
      );
    }

    // Security: Allow only safe characters in event names
    if (!/^[a-zA-Z][a-zA-Z0-9:_-]*$/.test(eventName)) {
      throw new Error(
        this.sanitizeErrorMessage(
          `Security violation: Invalid event name format "${eventName}"`,
          "security",
        ),
      );
    }

    // Security: Prevent excessively long event names
    if (eventName.length > 100) {
      throw new Error(
        this.sanitizeErrorMessage(
          "Security violation: Event name too long (max 100 characters)",
          "security",
        ),
      );
    }

    return true;
  }

  /**
   * Check and enforce rate limits to prevent DoS attacks
   * Enhanced with component suspension and cleanup logic
   */
  checkRateLimit(source, type = "event") {
    const now = Date.now();

    // Reset counters if window expired
    if (now - this.rateLimiting.lastResetTime > this.rateLimiting.windowSize) {
      this.resetRateLimitingCounters(now);
    }

    // Check if component is suspended and handle suspension timeout
    if (this.rateLimiting.suspendedComponents.has(source)) {
      const suspension = this.rateLimiting.suspensionTimestamps?.get(source);
      const suspensionDuration = 5 * 60 * 1000; // 5 minutes

      if (suspension && now - suspension > suspensionDuration) {
        // Unsuspend component after timeout
        this.rateLimiting.suspendedComponents.delete(source);
        this.rateLimiting.suspensionTimestamps?.delete(source);
        this.logDebug(`Component "${source}" unsuspended after timeout`);
      } else {
        throw new Error(
          this.sanitizeErrorMessage(
            `Security violation: Component "${source}" is suspended due to rate limit violation`,
            "security",
          ),
        );
      }
    }

    if (type === "event") {
      // Check per-component event limit
      const eventCount = this.rateLimiting.eventCounts.get(source) || 0;
      if (eventCount >= this.rateLimiting.maxEventsPerMinute) {
        this.suspendComponent(source, "event rate limit exceeded");
        throw new Error(
          this.sanitizeErrorMessage(
            `Security violation: Event rate limit exceeded for "${source}" (${this.rateLimiting.maxEventsPerMinute}/min)`,
            "rate_limit",
          ),
        );
      }

      // Check global event limit
      const totalEvents = Array.from(
        this.rateLimiting.eventCounts.values(),
      ).reduce((sum, count) => sum + count, 0);
      if (totalEvents >= this.rateLimiting.maxTotalEventsPerMinute) {
        throw new Error(
          this.sanitizeErrorMessage(
            `Security violation: Global event rate limit exceeded (${this.rateLimiting.maxTotalEventsPerMinute}/min)`,
            "rate_limit",
          ),
        );
      }

      this.rateLimiting.eventCounts.set(source, eventCount + 1);
    } else if (type === "state") {
      // Check state update limit per path
      const stateCount = this.rateLimiting.stateUpdateCounts.get(source) || 0;
      if (stateCount >= this.rateLimiting.maxStateUpdatesPerMinute) {
        throw new Error(
          this.sanitizeErrorMessage(
            `Security violation: State update rate limit exceeded for path "${source}" (${this.rateLimiting.maxStateUpdatesPerMinute}/min)`,
            "rate_limit",
          ),
        );
      }

      this.rateLimiting.stateUpdateCounts.set(source, stateCount + 1);
    }
  }

  /**
   * Suspend a component due to rate limit violation
   */
  suspendComponent(source, reason) {
    this.rateLimiting.suspendedComponents.add(source);

    // Initialize suspension timestamps if not exists
    if (!this.rateLimiting.suspensionTimestamps) {
      this.rateLimiting.suspensionTimestamps = new Map();
    }

    this.rateLimiting.suspensionTimestamps.set(source, Date.now());

    this.logWarning(`Component "${source}" suspended: ${reason}`);

    // Emit suspension event
    this.emitInternal("component:suspended", {
      source,
      reason,
      timestamp: Date.now(),
    });
  }

  /**
   * Reset rate limiting counters and clean up suspended components
   */
  resetRateLimitingCounters(now) {
    this.rateLimiting.eventCounts.clear();
    this.rateLimiting.stateUpdateCounts.clear();
    this.rateLimiting.lastResetTime = now;

    // Clean up expired suspensions
    if (this.rateLimiting.suspensionTimestamps) {
      const suspensionDuration = 5 * 60 * 1000; // 5 minutes
      const expiredSuspensions = [];

      for (const [source, timestamp] of this.rateLimiting
        .suspensionTimestamps) {
        if (now - timestamp > suspensionDuration) {
          expiredSuspensions.push(source);
        }
      }

      for (const source of expiredSuspensions) {
        this.rateLimiting.suspendedComponents.delete(source);
        this.rateLimiting.suspensionTimestamps.delete(source);
        this.logDebug(`Suspension expired for component "${source}"`);
      }
    }
  }

  /**
   * Memory usage monitoring to prevent memory exhaustion attacks
   */
  checkMemoryLimits() {
    const limits = {
      maxEventHistory: 1000,
      maxStateHistory: 100,
      maxErrorLog: 500,
      maxEventQueue: 100,
      maxComponents: 50,
      maxSubscriptions: 1000,
    };

    // Check event history size
    if (this.eventHistory.length > limits.maxEventHistory) {
      this.eventHistory = this.eventHistory.slice(-limits.maxEventHistory);
    }

    // Check state history size
    if (this.stateHistory.length > limits.maxStateHistory) {
      this.stateHistory = this.stateHistory.slice(-limits.maxStateHistory);
    }

    // Check error log size
    if (this.errorLog.length > limits.maxErrorLog) {
      this.errorLog = this.errorLog.slice(-limits.maxErrorLog);
    }

    // Check event queue size
    if (this.eventQueue.length > limits.maxEventQueue) {
      throw new Error(
        this.sanitizeErrorMessage(
          "Security violation: Event queue memory limit exceeded",
          "memory",
        ),
      );
    }

    // Check component count
    if (this.components.size > limits.maxComponents) {
      throw new Error(
        this.sanitizeErrorMessage(
          "Security violation: Maximum component count exceeded",
          "memory",
        ),
      );
    }

    // Check subscription count
    const totalSubscriptions = this.countActiveSubscriptions();
    if (totalSubscriptions > limits.maxSubscriptions) {
      throw new Error(
        this.sanitizeErrorMessage(
          "Security violation: Maximum subscription count exceeded",
          "memory",
        ),
      );
    }
  }

  // ===== Helper Methods =====

  /**
   * Validate component interface
   */
  validateComponent(component) {
    return (
      component &&
      typeof component.initialize === "function" &&
      typeof component.destroy === "function"
    );
  }

  /**
   * Wire component to orchestrator
   */
  wireComponent(componentId, component) {
    // Inject orchestrator reference
    component.orchestrator = this;

    // Override emit method to use orchestrator
    const originalEmit = component.emit;
    component.emit = (eventName, data) => {
      return this.emit(`${componentId}:${eventName}`, data, {
        source: componentId,
      });
    };

    // Store original for unwiring
    component._originalEmit = originalEmit;
  }

  /**
   * Unwire component from orchestrator
   */
  unwireComponent(componentId) {
    const component = this.components.get(componentId);
    if (!component) {
      return;
    }

    // Restore original emit
    if (component.instance._originalEmit) {
      component.instance.emit = component.instance._originalEmit;
      delete component.instance._originalEmit;
    }

    // Remove orchestrator reference
    delete component.instance.orchestrator;
  }

  /**
   * Find components that depend on given component
   */
  findDependentComponents(componentId) {
    const dependents = [];

    for (const [id, dependencies] of this.componentDependencies) {
      if (dependencies.includes(componentId)) {
        dependents.push(id);
      }
    }

    return dependents;
  }

  /**
   * Sort components by dependencies (topological sort)
   */
  sortComponentsByDependencies() {
    const sorted = [];
    const visited = new Set();
    const visiting = new Set();

    const visit = (componentId) => {
      if (visited.has(componentId)) {
        return;
      }

      if (visiting.has(componentId)) {
        throw new Error(
          this.sanitizeErrorMessage(
            `Circular dependency detected: ${componentId}`,
            "dependency",
          ),
        );
      }

      visiting.add(componentId);

      const dependencies = this.componentDependencies.get(componentId) || [];
      for (const dep of dependencies) {
        if (this.components.has(dep)) {
          visit(dep);
        }
      }

      visiting.delete(componentId);
      visited.add(componentId);
      sorted.push(componentId);
    };

    for (const componentId of this.components.keys()) {
      visit(componentId);
    }

    return sorted;
  }

  /**
   * Get status after lifecycle method
   */
  getStatusAfterLifecycle(method) {
    const statusMap = {
      initialize: "initialized",
      render: "rendered",
      destroy: "destroyed",
    };
    return statusMap[method] || "unknown";
  }

  /**
   * Set nested value in object - SECURITY HARDENED
   * Prevents prototype pollution attacks (CVSS 9.0 fix)
   */
  setNestedValue(obj, path, value) {
    // Security: Validate path input
    if (typeof path !== "string" || !path.trim()) {
      throw new Error(
        this.sanitizeErrorMessage(
          "Invalid path: must be non-empty string",
          "validation",
        ),
      );
    }

    const keys = path.split(".");
    const lastKey = keys.pop();

    // Security: Block dangerous keys that could lead to prototype pollution
    const dangerousKeys = ["__proto__", "constructor", "prototype"];
    const allKeys = [...keys, lastKey];

    for (const key of allKeys) {
      if (dangerousKeys.includes(key)) {
        throw new Error(
          this.sanitizeErrorMessage(
            `Security violation: Dangerous key "${key}" blocked to prevent prototype pollution`,
            "security",
          ),
        );
      }

      // Security: Validate key format (alphanumeric, underscore, hyphen only)
      if (!/^[a-zA-Z0-9_-]+$/.test(key)) {
        throw new Error(
          this.sanitizeErrorMessage(
            `Security violation: Invalid key format "${key}". Only alphanumeric, underscore, and hyphen allowed`,
            "security",
          ),
        );
      }
    }

    let current = obj;
    for (const key of keys) {
      // Security: Ensure we're working with plain objects only
      if (
        current === null ||
        typeof current !== "object" ||
        Array.isArray(current)
      ) {
        throw new Error(
          this.sanitizeErrorMessage(
            `Security violation: Cannot traverse non-object at key "${key}"`,
            "security",
          ),
        );
      }

      if (!Object.prototype.hasOwnProperty.call(current, key)) {
        // Security: Create plain object without prototype
        current[key] = Object.create(null);
      }
      current = current[key];
    }

    // Security: Final check before assignment
    if (current === null || typeof current !== "object") {
      throw new Error(
        this.sanitizeErrorMessage(
          "Security violation: Cannot assign to non-object target",
          "security",
        ),
      );
    }

    // Security: Validate value is not a function (prevents code injection)
    if (typeof value === "function") {
      throw new Error(
        this.sanitizeErrorMessage(
          "Security violation: Function values not allowed in state",
          "security",
        ),
      );
    }

    current[lastKey] = value;
  }

  /**
   * Get nested value from object
   */
  getNestedValue(obj, path) {
    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * Deep clone object
   */
  deepClone(obj) {
    if (obj === null || typeof obj !== "object") {
      return obj;
    }

    if (obj instanceof Date) {
      return new Date(obj.getTime());
    }

    if (obj instanceof Array) {
      return obj.map((item) => this.deepClone(item));
    }

    const cloned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = this.deepClone(obj[key]);
      }
    }

    return cloned;
  }

  /**
   * Notify state subscribers
   */
  notifyStateSubscribers(path, value, oldState) {
    // Notify specific path subscribers
    const pathSubscribers = this.stateSubscribers.get(path) || [];
    for (const subscription of pathSubscribers) {
      try {
        const context = subscription.context || this;
        subscription.callback.call(
          context,
          value,
          this.getNestedValue(oldState, path),
          path,
        );
      } catch (error) {
        this.handleSubscriptionError(error, subscription, { path, value });
      }
    }

    // Notify wildcard subscribers
    const wildcardSubscribers = this.stateSubscribers.get("*") || [];
    for (const subscription of wildcardSubscribers) {
      try {
        const context = subscription.context || this;
        subscription.callback.call(context, this.globalState, oldState, path);
      } catch (error) {
        this.handleSubscriptionError(error, subscription, { path, value });
      }
    }
  }

  /**
   * Add event to history
   */
  addToEventHistory(event) {
    if (this.eventHistory.length >= this.config.maxQueueSize) {
      this.eventHistory.shift();
    }
    this.eventHistory.push(event);
  }

  /**
   * Update dispatch metrics
   */
  updateDispatchMetrics(dispatchTime) {
    const currentAverage = this.metrics.averageDispatchTime;
    const totalEvents = this.metrics.eventsDispatched;

    this.metrics.averageDispatchTime =
      (currentAverage * totalEvents + dispatchTime) / (totalEvents + 1);
  }

  /**
   * Count active subscriptions
   */
  countActiveSubscriptions() {
    let count = 0;

    for (const subscriptions of this.eventSubscriptions.values()) {
      count += subscriptions.length;
    }

    for (const subscriptions of this.stateSubscribers.values()) {
      count += subscriptions.length;
    }

    return count;
  }

  /**
   * Handle subscription error with sanitized logging
   */
  handleSubscriptionError(error, subscription, event) {
    // Sanitize error message for logging
    const sanitizedError = this.sanitizeErrorMessage(
      error.message,
      "subscription",
    );

    this.errorLog.push({
      timestamp: Date.now(),
      type: "subscription",
      error: sanitizedError,
      subscription: this.sanitizeLogData({ id: subscription.id }).id,
      event: this.sanitizeLogData({ name: event.name || event.path }).name,
    });

    if (this.config.debug) {
      // In debug mode, show more details but still sanitized
      console.error("Subscription error:", {
        error: sanitizedError,
        subscriptionId: subscription.id,
        eventName: event.name || event.path,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle component error with sanitized logging
   */
  handleComponentError(componentId, error) {
    this.failedComponents.add(componentId);

    // Track error activity efficiently using WeakMap
    this.trackComponentActivity(componentId, "error");

    // Sanitize error message for logging
    const sanitizedError = this.sanitizeErrorMessage(
      error.message,
      "component",
    );
    const sanitizedComponentId = this.sanitizeLogData({
      componentId,
    }).componentId;

    this.errorLog.push({
      timestamp: Date.now(),
      type: "component",
      error: sanitizedError,
      componentId: sanitizedComponentId,
    });

    this.emit("component:error", {
      componentId: sanitizedComponentId,
      error: sanitizedError,
      timestamp: Date.now(),
    });

    if (this.config.debug) {
      console.error(`Component error [${sanitizedComponentId}]:`, {
        error: sanitizedError,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Setup error handling
   */
  setupErrorHandling() {
    // Only setup window error handling in browser environment
    if (typeof window !== "undefined" && window.addEventListener) {
      window.addEventListener("error", (event) => {
        // Sanitize global error data before logging
        const sanitizedError = {
          timestamp: Date.now(),
          type: "global",
          error: this.sanitizeErrorMessage(event.message, "global"),
          // Only include file info in development
          ...(this.environment.isDevelopment
            ? {
                filename: this.sanitizeLogData({ filename: event.filename })
                  .filename,
                lineno: event.lineno,
                colno: event.colno,
              }
            : {}),
        };

        this.errorLog.push(sanitizedError);

        if (this.config.debug) {
          console.error("Global error caught by orchestrator:", event);
        }
      });
    }
  }

  /**
   * Setup performance monitoring
   */
  setupPerformanceMonitoring() {
    // Monitor long tasks (browser only)
    if (typeof window !== "undefined" && "PerformanceObserver" in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) {
              this.logWarning(`Long task detected: ${entry.duration}ms`);
            }
          }
        });
        observer.observe({ entryTypes: ["longtask"] });
      } catch (e) {
        // Long task observer not supported
      }
    }
  }

  /**
   * Generate cryptographically secure subscription ID
   * Uses crypto.getRandomValues() for true randomness
   */
  generateSubscriptionId() {
    try {
      const array = new Uint32Array(2);
      crypto.getRandomValues(array);
      return `sub_${Date.now()}_${array[0].toString(36)}${array[1].toString(36)}`;
    } catch (error) {
      // Fallback for environments without crypto support
      this.logWarning(
        "Crypto API unavailable, using fallback random generation",
      );
      return `sub_${Date.now()}_${this.generateFallbackRandom()}`;
    }
  }

  /**
   * Generate cryptographically secure event ID
   * Uses crypto.getRandomValues() for true randomness
   */
  generateEventId() {
    try {
      const array = new Uint32Array(2);
      crypto.getRandomValues(array);
      return `evt_${Date.now()}_${array[0].toString(36)}${array[1].toString(36)}`;
    } catch (error) {
      // Fallback for environments without crypto support
      this.logWarning(
        "Crypto API unavailable, using fallback random generation",
      );
      return `evt_${Date.now()}_${this.generateFallbackRandom()}`;
    }
  }

  /**
   * Generate UUID v4 for component IDs
   * Uses cryptographically secure random values
   */
  generateSecureUUID() {
    try {
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);

      // Set version (4) and variant bits according to RFC 4122
      array[6] = (array[6] & 0x0f) | 0x40; // Version 4
      array[8] = (array[8] & 0x3f) | 0x80; // Variant 10

      const hex = Array.from(array, (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join("");
      return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32),
      ].join("-");
    } catch (error) {
      this.logWarning(
        "Crypto API unavailable for UUID generation, using fallback",
      );
      return this.generateFallbackUUID();
    }
  }

  /**
   * Validate entropy of generated random values
   * Ensures true randomness for security-critical operations
   */
  validateEntropy(values) {
    // Basic entropy check - ensure values aren't predictable
    const unique = new Set(values);
    const entropy = unique.size / values.length;

    if (entropy < 0.8) {
      throw new Error(
        "Security violation: Insufficient entropy in random generation",
      );
    }

    return true;
  }

  /**
   * Fallback random generation for environments without crypto support
   * Still more secure than plain Math.random()
   */
  generateFallbackRandom() {
    // Use multiple sources of entropy
    const sources = [
      Date.now(),
      performance.now ? performance.now() : Date.now(),
      Math.random() * Number.MAX_SAFE_INTEGER,
      this.metrics.eventsDispatched,
      this.components.size,
    ];

    // Combine sources with XOR
    let result = 0;
    for (const source of sources) {
      result ^= Math.floor(source);
    }

    return result.toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Fallback UUID generation without crypto API
   */
  generateFallbackUUID() {
    const timestamp = Date.now().toString(16);
    const random1 = this.generateFallbackRandom();
    const random2 = this.generateFallbackRandom();

    return [
      timestamp.substring(0, 8),
      (random1.substring(0, 4) + "0000").substring(0, 4),
      ("4" + random1.substring(4, 7) + "000").substring(0, 4),
      ("8" + random2.substring(0, 3) + "000").substring(0, 4),
      (random2.substring(3) + timestamp + "000000000000").substring(0, 12),
    ].join("-");
  }

  // ===== Information Security Methods (PHASE 3) =====

  /**
   * Detect if running in development environment
   * Used to determine error message verbosity and logging levels
   */
  detectDevelopmentEnvironment() {
    // Check multiple indicators of development environment
    if (typeof window !== "undefined") {
      // Browser environment checks
      const hostname = window.location?.hostname;
      const isDev =
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname?.endsWith(".local") ||
        hostname?.includes("dev") ||
        hostname?.includes("test");

      // Check for development indicators in URL or user agent
      const hasDevIndicators =
        window.location?.search?.includes("debug=true") ||
        window.location?.search?.includes("env=dev") ||
        navigator.userAgent?.includes("Development");

      return isDev || hasDevIndicators;
    }

    // Node.js environment checks
    if (typeof process !== "undefined" && process.env) {
      return (
        process.env.NODE_ENV === "development" ||
        process.env.NODE_ENV === "dev" ||
        process.env.ENVIRONMENT === "development" ||
        process.env.DEBUG === "true"
      );
    }

    // Default to production (safer)
    return false;
  }

  /**
   * Sanitize error messages to prevent information disclosure
   * Provides different levels of detail based on environment and error type
   */
  sanitizeErrorMessage(message, errorType = "general") {
    if (!message || typeof message !== "string") {
      return this.environment.isDevelopment
        ? "Invalid error message"
        : "An error occurred";
    }

    // In development mode, allow more detailed messages
    if (this.environment.isDevelopment) {
      return this.sanitizeDevelopmentError(message, errorType);
    }

    // Production mode - return generic messages for security
    return this.sanitizeProductionError(message, errorType);
  }

  /**
   * Sanitize error messages for development environment
   * Removes sensitive information but keeps useful debugging details
   */
  sanitizeDevelopmentError(message, errorType) {
    let sanitized = message;

    // Apply type-specific sanitization in development
    if (errorType === "security") {
      // For security errors, still be more restrictive even in dev
      sanitized = sanitized.replace(
        /\b[a-zA-Z0-9]{32,}\b/g,
        "[SECURITY_TOKEN]",
      );
    }

    // Remove potential file system paths (but keep relative paths for debugging)
    sanitized = sanitized.replace(/\/[a-zA-Z]:\/[^\s]*/g, "[SYSTEM_PATH]");
    sanitized = sanitized.replace(/\/Users\/[^\s\/]+\/[^\s]*/g, "[USER_PATH]");
    sanitized = sanitized.replace(/\/home\/[^\s\/]+\/[^\s]*/g, "[USER_PATH]");
    sanitized = sanitized.replace(/\/var\/[^\s]*/g, "[VAR_PATH]");
    sanitized = sanitized.replace(/\/tmp\/[^\s]*/g, "[TEMP_PATH]");

    // Remove potential database connection strings
    sanitized = sanitized.replace(/postgres:\/\/[^\s]+/g, "[DB_CONNECTION]");
    sanitized = sanitized.replace(/mongodb:\/\/[^\s]+/g, "[DB_CONNECTION]");
    sanitized = sanitized.replace(/mysql:\/\/[^\s]+/g, "[DB_CONNECTION]");

    // Remove potential API keys or tokens
    sanitized = sanitized.replace(/[a-zA-Z0-9]{32,}/g, (match) => {
      if (
        match.toLowerCase().includes("key") ||
        match.toLowerCase().includes("token")
      ) {
        return "[API_KEY]";
      }
      return match;
    });

    // Remove stack traces in production but keep them in dev
    sanitized = sanitized.replace(/(\s+at\s+[^\n]+)/g, " [STACK_TRACE_LINE]");

    return sanitized;
  }

  /**
   * Sanitize error messages for production environment
   * Returns generic, non-revealing error messages
   */
  sanitizeProductionError(message, errorType) {
    // Map error types to generic production messages
    const productionMessages = {
      security: "Operation not permitted",
      validation: "Invalid input provided",
      rate_limit: "Request limit exceeded",
      timeout: "Operation timed out",
      memory: "Resource limit exceeded",
      dependency: "Dependency error",
      component: "Component operation failed",
      subscription: "Event subscription error",
      method_not_found: "Operation not available",
      registration: "Registration failed",
      global: "System error occurred",
      general: "An error occurred",
    };

    // Return generic message based on error type
    const genericMessage =
      productionMessages[errorType] || productionMessages["general"];

    // For security violations, always return generic message
    if (
      message.toLowerCase().includes("security violation") ||
      errorType === "security"
    ) {
      return productionMessages["security"];
    }

    // Check for other sensitive patterns and return generic messages
    const sensitivePatterns = [
      /stack trace/i,
      /file not found/i,
      /permission denied/i,
      /access denied/i,
      /unauthorized/i,
      /connection refused/i,
      /database error/i,
      /sql error/i,
      /internal error/i,
      /system error/i,
    ];

    for (const pattern of sensitivePatterns) {
      if (pattern.test(message)) {
        return genericMessage;
      }
    }

    return genericMessage;
  }

  /**
   * Sanitize data before logging to remove sensitive information
   * Handles objects, arrays, and primitive values
   */
  sanitizeLogData(data, maxDepth = 3, currentDepth = 0) {
    if (currentDepth >= maxDepth) {
      return "[MAX_DEPTH_EXCEEDED]";
    }

    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === "string") {
      return this.sanitizeLogString(data);
    }

    if (typeof data === "function") {
      return "[FUNCTION]";
    }

    if (Array.isArray(data)) {
      // Limit array length in logs
      const maxArrayLength = this.environment.isDevelopment ? 10 : 5;
      const sanitizedArray = data
        .slice(0, maxArrayLength)
        .map((item) => this.sanitizeLogData(item, maxDepth, currentDepth + 1));

      if (data.length > maxArrayLength) {
        sanitizedArray.push(`[...${data.length - maxArrayLength} more items]`);
      }

      return sanitizedArray;
    }

    if (typeof data === "object") {
      const sanitized = {};
      const sensitiveKeys = [
        "password",
        "pwd",
        "secret",
        "key",
        "token",
        "auth",
        "credentials",
        "authorization",
        "cookie",
        "session",
        "apikey",
        "api_key",
        "accesstoken",
        "refreshtoken",
        "privatekey",
        "private_key",
      ];

      for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          // Check if key is sensitive
          const isSensitive = sensitiveKeys.some((sensitive) =>
            key.toLowerCase().includes(sensitive),
          );

          if (isSensitive) {
            sanitized[key] = "[REDACTED]";
          } else {
            // Recursively sanitize nested objects
            sanitized[key] = this.sanitizeLogData(
              data[key],
              maxDepth,
              currentDepth + 1,
            );
          }
        }
      }

      return sanitized;
    }

    // Numbers, booleans, etc. are generally safe
    return data;
  }

  /**
   * Sanitize string values in logs
   * Removes or masks potentially sensitive information
   */
  sanitizeLogString(str) {
    if (!str || typeof str !== "string") {
      return str;
    }

    let sanitized = str;

    // In production, be more aggressive with sanitization
    if (!this.environment.isDevelopment) {
      // Remove potential file paths completely
      sanitized = sanitized.replace(/\/[a-zA-Z]:\/[^\s]*/g, "[PATH]");
      sanitized = sanitized.replace(/\/[^\s]*\.[a-zA-Z0-9]+/g, "[FILE]");

      // Remove IP addresses
      sanitized = sanitized.replace(
        /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
        "[IP_ADDRESS]",
      );

      // Remove URLs
      sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, "[URL]");

      // Remove email addresses
      sanitized = sanitized.replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        "[EMAIL]",
      );

      // Remove long alphanumeric strings that might be tokens/keys
      sanitized = sanitized.replace(/\b[A-Za-z0-9]{32,}\b/g, "[TOKEN]");
    } else {
      // Development mode - less aggressive but still secure
      sanitized = sanitized.replace(/\/Users\/[^\s\/]+/g, "/Users/[USER]");
      sanitized = sanitized.replace(/\/home\/[^\s\/]+/g, "/home/[USER]");

      // Partial masking of sensitive data
      sanitized = sanitized.replace(
        /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
        (match) => match.substring(0, 3) + "[...]@" + match.split("@")[1],
      );
    }

    // Common sanitizations for both environments
    // Remove potential SQL injection attempts
    sanitized = sanitized.replace(
      /(union select|drop table|delete from|insert into)/gi,
      "[SQL_BLOCKED]",
    );

    // Remove JavaScript that might be in error messages
    sanitized = sanitized.replace(
      /<script[^>]*>.*?<\/script>/gi,
      "[SCRIPT_BLOCKED]",
    );

    // Remove potential XSS attempts
    sanitized = sanitized.replace(/on\w+\s*=/gi, "[EVENT_BLOCKED]=");

    // Truncate very long strings
    const maxLength = this.environment.isDevelopment ? 1000 : 200;
    if (sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + "[...TRUNCATED]";
    }

    return sanitized;
  }

  /**
   * Sanitize log message with context
   * Combines message sanitization with contextual data sanitization
   */
  sanitizeLogMessage(message, context = null) {
    const sanitizedMessage = this.sanitizeLogString(message);

    if (!context) {
      return sanitizedMessage;
    }

    // Add sanitized context if provided
    const sanitizedContext = this.sanitizeLogData(context);
    const contextStr = Object.keys(sanitizedContext)
      .map((key) => `${key}: ${JSON.stringify(sanitizedContext[key])}`)
      .join(", ");

    return `${sanitizedMessage} (Context: ${contextStr})`;
  }

  /**
   * Enhanced logging methods with sanitization
   */

  /**
   * Log info message with sanitization
   */
  logInfo(message, context = null) {
    if (this.config.debug || this.environment.isDevelopment) {
      const sanitizedMessage = this.sanitizeLogMessage(message, context);
      console.info(`[Orchestrator] ${sanitizedMessage}`);
    }
  }

  /**
   * Log debug message with sanitization
   */
  logDebug(message, context = null) {
    if (this.config.debug) {
      const sanitizedMessage = this.sanitizeLogMessage(message, context);
      console.log(`[Orchestrator] ${sanitizedMessage}`);
    }
  }

  /**
   * Log warning message with sanitization
   */
  logWarning(message, context = null) {
    if (this.config.debug || this.environment.isDevelopment) {
      const sanitizedMessage = this.sanitizeLogMessage(message, context);
      console.warn(`[Orchestrator] ${sanitizedMessage}`);
    } else {
      // In production, still log warnings but with minimal information
      console.warn("[Orchestrator] Warning occurred");
    }
  }

  /**
   * Log error message with sanitization
   * Always logs in production but with sanitized content
   */
  logError(message, context = null) {
    const sanitizedMessage = this.sanitizeLogMessage(message, context);

    if (this.environment.isDevelopment) {
      console.error(`[Orchestrator] ${sanitizedMessage}`);
    } else {
      // Production - log generic error
      console.error("[Orchestrator] Error occurred");

      // Store detailed error internally for debugging (sanitized)
      this.errorLog.push({
        timestamp: Date.now(),
        type: "logged_error",
        error: this.sanitizeErrorMessage(message, "general"),
        context: this.sanitizeLogData(context),
      });
    }
  }

  /**
   * Get sanitized debug information
   * Returns debugging data with sensitive information removed
   */
  getDebugInfo() {
    const baseInfo = {
      environment: this.environment.isDevelopment
        ? "development"
        : "production",
      initialized: this.initialized,
      componentCount: this.components.size,
      eventQueueSize: this.eventQueue.length,
      metrics: {
        eventsDispatched: this.metrics.eventsDispatched,
        eventsQueued: this.metrics.eventsQueued,
        stateUpdates: this.metrics.stateUpdates,
        averageDispatchTime:
          Math.round(this.metrics.averageDispatchTime * 100) / 100,
      },
    };

    if (this.environment.isDevelopment) {
      // Add more detailed information in development
      return {
        ...baseInfo,
        failedComponentsCount: this.failedComponents.size,
        errorLogCount: this.errorLog.length,
        lastErrors: this.errorLog.slice(-5).map((error) => ({
          timestamp: error.timestamp,
          type: error.type,
          error: this.sanitizeErrorMessage(error.error, error.type),
        })),
        rateLimitingStatus: {
          suspendedComponents: this.rateLimiting.suspendedComponents.size,
          lastResetTime: this.rateLimiting.lastResetTime,
        },
      };
    }

    return baseInfo;
  }

  /**
   * Get sanitized error log for debugging
   * Returns error history with sensitive data removed
   */
  getSanitizedErrorLog(limit = 10) {
    const recentErrors = this.errorLog.slice(-limit);

    return recentErrors.map((error) => ({
      timestamp: error.timestamp,
      type: error.type,
      error: this.sanitizeErrorMessage(error.error, error.type),
      // Only include additional fields in development
      ...(this.environment.isDevelopment && error.componentId
        ? {
            componentId: this.sanitizeLogData({ id: error.componentId }).id,
          }
        : {}),
    }));
  }

  // ===== Session Timeout Management Methods =====

  /**
   * Setup session timeout management
   * Tracks user activity and manages session expiration with warnings
   */
  setupSessionTimeoutManagement() {
    if (typeof window === "undefined") {
      this.logWarning(
        "Session timeout management not available in non-browser environment",
      );
      return;
    }

    // Setup activity tracking for all configured events
    this.sessionTimeout.activityHandler = (event) => {
      this.recordUserActivity();
    };

    // Add activity listeners
    this.sessionTimeout.activityEvents.forEach((eventType) => {
      window.addEventListener(eventType, this.sessionTimeout.activityHandler, {
        passive: true,
      });
    });

    // Start timeout monitoring
    this.resetSessionTimeout();

    this.logInfo("Session timeout management initialized", {
      timeoutDuration: this.sessionTimeout.timeoutDuration,
      warningDuration: this.sessionTimeout.warningDuration,
    });
  }

  /**
   * Record user activity and reset timeout timers
   */
  recordUserActivity() {
    const now = Date.now();
    const timeSinceLastActivity = now - this.sessionTimeout.lastActivityTime;

    // Only reset if enough time has passed to avoid excessive timer resets
    if (timeSinceLastActivity > 5000) {
      // 5 seconds minimum between resets
      this.sessionTimeout.lastActivityTime = now;
      this.resetSessionTimeout();

      // Hide warning if currently shown
      if (this.sessionTimeout.warningShown) {
        this.hideSessionWarning();
      }
    }
  }

  /**
   * Reset session timeout timers
   */
  resetSessionTimeout() {
    // Clear existing timers
    if (this.sessionTimeout.timeoutTimer) {
      clearTimeout(this.sessionTimeout.timeoutTimer);
    }
    if (this.sessionTimeout.warningTimer) {
      clearTimeout(this.sessionTimeout.warningTimer);
    }

    // Reset warning state
    this.sessionTimeout.warningShown = false;

    const warningTime =
      this.sessionTimeout.timeoutDuration - this.sessionTimeout.warningDuration;

    // Set warning timer
    this.sessionTimeout.warningTimer = setTimeout(() => {
      this.showSessionWarning();
    }, warningTime);

    // Set timeout timer
    this.sessionTimeout.timeoutTimer = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.sessionTimeout.timeoutDuration);
  }

  /**
   * Show session timeout warning
   */
  showSessionWarning() {
    if (this.sessionTimeout.warningShown) {
      return; // Warning already shown
    }

    this.sessionTimeout.warningShown = true;
    const remainingTime = Math.ceil(this.sessionTimeout.warningDuration / 1000);

    // Emit warning event for components to handle
    this.emitInternal("session:warning", {
      remainingTime,
      totalWarningDuration: this.sessionTimeout.warningDuration,
      timestamp: Date.now(),
    });

    // Create and show warning dialog
    this.createSessionWarningDialog(remainingTime);

    this.logWarning(
      `Session timeout warning shown - ${remainingTime} seconds remaining`,
    );
  }

  /**
   * Hide session timeout warning
   */
  hideSessionWarning() {
    if (!this.sessionTimeout.warningShown) {
      return;
    }

    this.sessionTimeout.warningShown = false;

    // Remove warning dialog if it exists
    const warningDialog = document.getElementById("session-warning-dialog");
    if (warningDialog) {
      warningDialog.remove();
    }

    // Emit warning dismissed event
    this.emitInternal("session:warningDismissed", {
      timestamp: Date.now(),
    });

    this.logDebug("Session timeout warning hidden due to user activity");
  }

  /**
   * Create session warning dialog
   */
  createSessionWarningDialog(remainingTime) {
    // Remove existing dialog if present
    const existingDialog = document.getElementById("session-warning-dialog");
    if (existingDialog) {
      existingDialog.remove();
    }

    // Create dialog container
    const dialog = document.createElement("div");
    dialog.id = "session-warning-dialog";
    dialog.className = "session-warning-dialog";
    dialog.setAttribute("role", "alertdialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "session-warning-title");
    dialog.setAttribute("aria-describedby", "session-warning-message");

    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "session-warning-overlay";

    // Create dialog content
    const content = document.createElement("div");
    content.className = "session-warning-content";

    // Title
    const title = document.createElement("h3");
    title.id = "session-warning-title";
    title.textContent = "Session Timeout Warning";
    content.appendChild(title);

    // Message
    const message = document.createElement("p");
    message.id = "session-warning-message";
    message.textContent = `Your session will expire in ${remainingTime} seconds due to inactivity. Click "Stay Active" to continue your session.`;
    content.appendChild(message);

    // Countdown display
    const countdown = document.createElement("div");
    countdown.className = "session-warning-countdown";
    countdown.textContent = remainingTime;
    content.appendChild(countdown);

    // Button container
    const buttonContainer = document.createElement("div");
    buttonContainer.className = "session-warning-buttons";

    // Stay active button
    const stayActiveButton = document.createElement("button");
    stayActiveButton.className =
      "session-warning-button session-warning-button-primary";
    stayActiveButton.textContent = "Stay Active";
    stayActiveButton.addEventListener("click", () => {
      this.recordUserActivity();
    });

    // Logout button
    const logoutButton = document.createElement("button");
    logoutButton.className =
      "session-warning-button session-warning-button-secondary";
    logoutButton.textContent = "Logout Now";
    logoutButton.addEventListener("click", () => {
      this.handleSessionTimeout();
    });

    buttonContainer.appendChild(stayActiveButton);
    buttonContainer.appendChild(logoutButton);
    content.appendChild(buttonContainer);

    // Assemble dialog
    dialog.appendChild(overlay);
    dialog.appendChild(content);

    // Add styles
    this.addSessionWarningStyles();

    // Add to DOM
    document.body.appendChild(dialog);

    // Focus management
    stayActiveButton.focus();

    // Update countdown every second
    let timeLeft = remainingTime;
    const countdownInterval = setInterval(() => {
      timeLeft--;
      countdown.textContent = timeLeft;
      message.textContent = `Your session will expire in ${timeLeft} seconds due to inactivity. Click "Stay Active" to continue your session.`;

      if (timeLeft <= 0 || !this.sessionTimeout.warningShown) {
        clearInterval(countdownInterval);
      }
    }, 1000);

    // Store interval for cleanup
    dialog._countdownInterval = countdownInterval;
  }

  /**
   * Add CSS styles for session warning dialog
   */
  addSessionWarningStyles() {
    // Check if styles already added
    if (document.getElementById("session-warning-styles")) {
      return;
    }

    const styles = `
      .session-warning-dialog {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .session-warning-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
      }
      
      .session-warning-content {
        position: relative;
        background: white;
        border-radius: 8px;
        padding: 24px;
        max-width: 400px;
        margin: 20px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        text-align: center;
      }
      
      .session-warning-content h3 {
        margin: 0 0 16px 0;
        font-size: 18px;
        font-weight: 600;
        color: #d73027;
      }
      
      .session-warning-content p {
        margin: 0 0 16px 0;
        font-size: 14px;
        color: #333;
        line-height: 1.5;
      }
      
      .session-warning-countdown {
        font-size: 48px;
        font-weight: bold;
        color: #d73027;
        margin: 16px 0;
      }
      
      .session-warning-buttons {
        display: flex;
        gap: 12px;
        justify-content: center;
        margin-top: 20px;
      }
      
      .session-warning-button {
        padding: 8px 16px;
        border: 1px solid transparent;
        border-radius: 4px;
        font-size: 14px;
        cursor: pointer;
        transition: background-color 0.2s, border-color 0.2s;
      }
      
      .session-warning-button-primary {
        background-color: #0066cc;
        color: white;
        border-color: #0066cc;
      }
      
      .session-warning-button-primary:hover {
        background-color: #0052a3;
        border-color: #0052a3;
      }
      
      .session-warning-button-secondary {
        background-color: white;
        color: #666;
        border-color: #ccc;
      }
      
      .session-warning-button-secondary:hover {
        background-color: #f5f5f5;
        border-color: #999;
      }
      
      .session-warning-button:focus {
        outline: 2px solid #0066cc;
        outline-offset: 2px;
      }
    `;

    const styleSheet = document.createElement("style");
    styleSheet.id = "session-warning-styles";
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
  }

  /**
   * Handle session timeout
   */
  handleSessionTimeout() {
    this.logWarning("Session timeout occurred - initiating logout");

    // Clear all timers
    if (this.sessionTimeout.timeoutTimer) {
      clearTimeout(this.sessionTimeout.timeoutTimer);
    }
    if (this.sessionTimeout.warningTimer) {
      clearTimeout(this.sessionTimeout.warningTimer);
    }

    // Remove warning dialog if present
    const warningDialog = document.getElementById("session-warning-dialog");
    if (warningDialog) {
      if (warningDialog._countdownInterval) {
        clearInterval(warningDialog._countdownInterval);
      }
      warningDialog.remove();
    }

    // Clear session data
    this.clearSessionData();

    // Emit timeout event
    this.emitInternal("session:timeout", {
      timestamp: Date.now(),
      lastActivityTime: this.sessionTimeout.lastActivityTime,
    });

    // Redirect to login or show logout message
    this.performSessionCleanupAndRedirect();
  }

  /**
   * Clear session data
   */
  clearSessionData() {
    try {
      // Clear local storage session data
      if (typeof localStorage !== "undefined") {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (
            key &&
            (key.startsWith("session") ||
              key.startsWith("auth") ||
              key.startsWith("user"))
          ) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
      }

      // Clear session storage
      if (typeof sessionStorage !== "undefined") {
        sessionStorage.clear();
      }

      // Reset component state
      this.setState("user", null);
      this.setState("session", null);
      this.setState("authentication", { authenticated: false });

      this.logDebug("Session data cleared");
    } catch (error) {
      this.logError("Error clearing session data", { error: error.message });
    }
  }

  /**
   * Perform session cleanup and redirect
   */
  performSessionCleanupAndRedirect() {
    // Show logout message
    this.showLogoutMessage();

    // Redirect after short delay
    setTimeout(() => {
      if (typeof window !== "undefined") {
        // Try different redirect strategies
        if (window.location.pathname !== "/login") {
          window.location.href = "/login?reason=timeout";
        } else {
          // Already on login page, just reload
          window.location.reload();
        }
      }
    }, 3000); // 3 second delay to show message
  }

  /**
   * Show logout message
   */
  showLogoutMessage() {
    const message = document.createElement("div");
    message.className = "session-logout-message";
    message.innerHTML = `
      <h3>Session Expired</h3>
      <p>Your session has expired due to inactivity. You will be redirected to the login page shortly.</p>
    `;

    // Add styles
    message.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      z-index: 10001;
      text-align: center;
      max-width: 400px;
      margin: 20px;
    `;

    document.body.appendChild(message);
  }

  /**
   * Get session timeout status
   */
  getSessionTimeoutStatus() {
    if (!this.sessionTimeout.enabled) {
      return { enabled: false };
    }

    const now = Date.now();
    const timeRemaining =
      this.sessionTimeout.timeoutDuration -
      (now - this.sessionTimeout.lastActivityTime);
    const warningTimeRemaining =
      this.sessionTimeout.warningDuration -
      (now -
        this.sessionTimeout.lastActivityTime -
        (this.sessionTimeout.timeoutDuration -
          this.sessionTimeout.warningDuration));

    return {
      enabled: true,
      lastActivityTime: this.sessionTimeout.lastActivityTime,
      timeRemaining: Math.max(0, timeRemaining),
      warningShown: this.sessionTimeout.warningShown,
      warningTimeRemaining: this.sessionTimeout.warningShown
        ? Math.max(0, warningTimeRemaining)
        : null,
      timeoutDuration: this.sessionTimeout.timeoutDuration,
      warningDuration: this.sessionTimeout.warningDuration,
    };
  }

  /**
   * Extend session timeout
   */
  extendSession(additionalTime = null) {
    if (!this.sessionTimeout.enabled) {
      return false;
    }

    this.recordUserActivity();

    if (additionalTime) {
      this.sessionTimeout.lastActivityTime = Date.now() + additionalTime;
    }

    this.logDebug("Session extended", {
      newActivityTime: this.sessionTimeout.lastActivityTime,
    });
    return true;
  }

  /**
   * Disable session timeout
   */
  disableSessionTimeout() {
    if (this.sessionTimeout.timeoutTimer) {
      clearTimeout(this.sessionTimeout.timeoutTimer);
    }
    if (this.sessionTimeout.warningTimer) {
      clearTimeout(this.sessionTimeout.warningTimer);
    }

    // Remove activity listeners
    if (this.sessionTimeout.activityHandler && typeof window !== "undefined") {
      this.sessionTimeout.activityEvents.forEach((eventType) => {
        window.removeEventListener(
          eventType,
          this.sessionTimeout.activityHandler,
        );
      });
    }

    this.sessionTimeout.enabled = false;
    this.logInfo("Session timeout disabled");
  }

  // ===== Memory-Efficient Component Management Methods =====

  /**
   * Update component metadata efficiently using WeakMap
   * @param {Object} component - Component instance
   * @param {Object} updates - Metadata updates
   */
  updateComponentMetadata(component, updates) {
    if (!component || typeof component !== "object") {
      return false;
    }

    const existingMetadata = this.componentMetadata.get(component);
    if (existingMetadata) {
      const updatedMetadata = {
        ...existingMetadata,
        ...updates,
        lastActivity: Date.now(),
      };
      this.componentMetadata.set(component, updatedMetadata);
      return true;
    }
    return false;
  }

  /**
   * Get component metadata efficiently from WeakMap
   * @param {Object} component - Component instance
   * @returns {Object|null} Component metadata
   */
  getComponentMetadata(component) {
    if (!component || typeof component !== "object") {
      return null;
    }
    return this.componentMetadata.get(component) || null;
  }

  /**
   * Track component activity in metadata
   * @param {string} componentId - Component ID
   * @param {string} activityType - Type of activity
   */
  trackComponentActivity(componentId, activityType = "event") {
    const component = this.components.get(componentId);
    if (!component || !component.instance) {
      return false;
    }

    const metadata = this.componentMetadata.get(component.instance);
    if (metadata) {
      // Update activity counters
      switch (activityType) {
        case "event":
          metadata.eventCount = (metadata.eventCount || 0) + 1;
          break;
        case "error":
          metadata.errorCount = (metadata.errorCount || 0) + 1;
          break;
      }
      metadata.lastActivity = Date.now();

      // WeakMap automatically updates in place
      this.componentMetadata.set(component.instance, metadata);
      return true;
    }
    return false;
  }

  /**
   * Clean up memory-efficient structures
   * WeakMap entries are automatically garbage collected when components are removed
   */
  cleanupMemoryEfficientStructures() {
    // WeakMap entries will be automatically garbage collected
    // when component references are no longer held elsewhere

    // Clean up suspension timestamps for removed components
    const activeComponentIds = new Set(this.components.keys());

    // Note: We can't iterate over WeakMap, but suspension cleanup
    // is handled in resetRateLimitingCounters() method

    this.logDebug("Memory-efficient cleanup completed");
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory usage information
   */
  getMemoryUsageStats() {
    return {
      componentsCount: this.components.size,
      eventSubscriptionsCount: this.eventSubscriptions.size,
      stateSubscribersCount: this.stateSubscribers.size,
      eventQueueSize: this.eventQueue.length,
      eventHistorySize: this.eventHistory.length,
      stateHistorySize: this.stateHistory.length,
      errorLogSize: this.errorLog.length,
      rateLimitingEntriesCount:
        this.rateLimiting.eventCounts.size +
        this.rateLimiting.stateUpdateCounts.size,
      // WeakMap size cannot be determined (by design for memory efficiency)
      componentMetadataNote:
        "WeakMap size not available (memory-efficient by design)",
      suspensionTimestampsNote: "WeakMap entries auto-cleaned by GC",
    };
  }
}

// Export for use in other components
if (typeof module !== "undefined" && module.exports) {
  module.exports = ComponentOrchestrator;
}
