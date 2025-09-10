/**
 * ApiService.js - Enhanced API Communication Service
 *
 * US-082-A Phase 1: Foundation Service Layer Implementation
 * Enhances existing ApiClient.js with advanced caching, error handling, and batch operations
 *
 * Features:
 * - Intelligent caching with configurable TTL
 * - Batch API operations for bulk processing
 * - Enhanced error handling with retry logic
 * - Request/response interceptors and logging
 * - Performance monitoring and metrics
 * - Network connectivity handling
 * - Request deduplication and queuing
 *
 * Performance Targets:
 * - <51ms average API response time
 * - 30% reduction in redundant API calls via caching
 * - >70% cache hit rate for repeated requests
 * - Automatic retry with exponential backoff
 *
 * @author GENDEV API Architect
 * @version 1.0.0
 * @since Sprint 6
 */

// Import BaseService from AdminGuiService
// In production, this would be: import { BaseService } from './AdminGuiService.js';
// For ScriptRunner compatibility, we use global reference or embedded class

/**
 * Cache Entry class for intelligent caching
 */
class CacheEntry {
  constructor(data, ttl = 300000) {
    // Default 5-minute TTL
    this.data = data;
    this.timestamp = Date.now();
    this.ttl = ttl;
    this.accessCount = 1;
    this.lastAccessed = Date.now();
  }

  isExpired() {
    return Date.now() - this.timestamp > this.ttl;
  }

  isValid() {
    return !this.isExpired() && this.data !== null;
  }

  access() {
    this.accessCount++;
    this.lastAccessed = Date.now();
    return this.data;
  }

  getAge() {
    return Date.now() - this.timestamp;
  }
}

/**
 * Circuit Breaker states and functionality
 */
class CircuitBreaker {
  constructor(config = {}) {
    this.failureThreshold = config.failureThreshold || 5; // Number of failures before opening
    this.timeout = config.timeout || 30000; // Time to wait before half-open (30s)
    this.successThreshold = config.successThreshold || 2; // Successes needed to close from half-open

    this.state = "CLOSED"; // CLOSED, OPEN, HALF_OPEN
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = 0;
    this.lastFailureTime = 0;

    // Performance tracking
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      stateChanges: 0,
      averageResponseTime: 0,
      lastStateChange: Date.now(),
    };
  }

  async execute(requestFunction) {
    this.metrics.totalRequests++;

    if (this.state === "OPEN") {
      if (Date.now() < this.nextAttempt) {
        this.metrics.rejectedRequests++;
        throw new Error(
          `Circuit breaker is OPEN. Next attempt at ${new Date(this.nextAttempt).toISOString()}`,
        );
      } else {
        this._transitionToHalfOpen();
      }
    }

    const startTime = performance.now();
    try {
      const result = await requestFunction();
      const responseTime = performance.now() - startTime;
      this._onSuccess(responseTime);
      return result;
    } catch (error) {
      this._onFailure(error);
      throw error;
    }
  }

  _onSuccess(responseTime) {
    this.metrics.successfulRequests++;
    this._updateAverageResponseTime(responseTime);

    this.failureCount = 0;
    this.lastFailureTime = 0;

    if (this.state === "HALF_OPEN") {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this._transitionToClosed();
      }
    }
  }

  _onFailure(error) {
    this.metrics.failedRequests++;
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === "HALF_OPEN") {
      this._transitionToOpen();
    } else if (
      this.state === "CLOSED" &&
      this.failureCount >= this.failureThreshold
    ) {
      this._transitionToOpen();
    }
  }

  _transitionToOpen() {
    this.state = "OPEN";
    this.nextAttempt = Date.now() + this.timeout;
    this.successCount = 0;
    this.metrics.stateChanges++;
    this.metrics.lastStateChange = Date.now();
  }

  _transitionToHalfOpen() {
    this.state = "HALF_OPEN";
    this.successCount = 0;
    this.metrics.stateChanges++;
    this.metrics.lastStateChange = Date.now();
  }

  _transitionToClosed() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.metrics.stateChanges++;
    this.metrics.lastStateChange = Date.now();
  }

  _updateAverageResponseTime(responseTime) {
    const totalSuccessful = this.metrics.successfulRequests;
    if (totalSuccessful === 1) {
      this.metrics.averageResponseTime = responseTime;
    } else {
      this.metrics.averageResponseTime =
        (this.metrics.averageResponseTime * (totalSuccessful - 1) +
          responseTime) /
        totalSuccessful;
    }
  }

  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      nextAttempt: this.nextAttempt,
      metrics: { ...this.metrics },
    };
  }

  reset() {
    this.state = "CLOSED";
    this.failureCount = 0;
    this.successCount = 0;
    this.nextAttempt = 0;
    this.lastFailureTime = 0;
  }

  isHealthy() {
    const errorRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100
        : 0;
    return this.state === "CLOSED" && errorRate < 10;
  }
}

/**
 * Request Queue Entry with priority support
 */
class RequestEntry {
  constructor(method, endpoint, options, resolve, reject) {
    this.id = this._generateId();
    this.method = method.toUpperCase();
    this.endpoint = endpoint;
    this.options = options || {};
    this.resolve = resolve;
    this.reject = reject;
    this.timestamp = Date.now();
    this.retryCount = 0;
    this.maxRetries = 3;
    this.priority = this._determinePriority(method, endpoint, options);
    this.estimatedSize = this._estimateRequestSize(options);
  }

  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  _determinePriority(method, endpoint, options) {
    // Emergency requests (system health checks, critical alerts)
    if (
      options.priority === "emergency" ||
      endpoint.includes("/health") ||
      endpoint.includes("/emergency")
    ) {
      return 1; // Highest priority
    }

    // Admin requests
    if (
      options.priority === "admin" ||
      endpoint.includes("/admin") ||
      options.adminRequest
    ) {
      return 2;
    }

    // Critical user actions (create, update, delete)
    if (
      ["POST", "PUT", "DELETE"].includes(method) ||
      options.priority === "critical"
    ) {
      return 3;
    }

    // Normal user requests (GET operations)
    if (method === "GET" && !options.priority) {
      return 4;
    }

    // Background/sync requests
    if (options.priority === "background" || options.background) {
      return 5; // Lowest priority
    }

    return 4; // Default normal priority
  }

  _estimateRequestSize(options) {
    let size = 1000; // Base overhead

    if (options.body) {
      if (typeof options.body === "string") {
        size += options.body.length * 2; // UTF-16
      } else if (options.body instanceof FormData) {
        size += 10000; // Estimate for form data
      } else {
        size += JSON.stringify(options.body).length * 2;
      }
    }

    if (options.params) {
      size += JSON.stringify(options.params).length * 2;
    }

    return size;
  }

  getKey() {
    // Generate unique key for deduplication
    const params = this.options.params
      ? JSON.stringify(this.options.params)
      : "";
    const body = this.options.body ? JSON.stringify(this.options.body) : "";
    return `${this.method}:${this.endpoint}:${params}:${body}`;
  }

  canRetry() {
    return this.retryCount < this.maxRetries;
  }

  incrementRetry() {
    this.retryCount++;
  }

  getAge() {
    return Date.now() - this.timestamp;
  }

  isExpired(maxAge = 30000) {
    // 30 seconds default
    return this.getAge() > maxAge;
  }
}

/**
 * @typedef {Object} ApiServiceConfig
 * @property {string} baseUrl - Base URL for API requests
 * @property {number} timeout - Request timeout in milliseconds
 * @property {number} retryAttempts - Number of retry attempts
 * @property {number} retryDelay - Base delay for exponential backoff in milliseconds
 * @property {Object} defaultHeaders - Default HTTP headers
 * @property {CacheConfig} cache - Cache configuration
 * @property {BatchConfig} batch - Batch processing configuration
 * @property {LoggingConfig} logging - Logging configuration
 * @property {PerformanceConfig} performance - Performance monitoring configuration
 */

/**
 * @typedef {Object} CacheConfig
 * @property {boolean} enabled - Enable caching
 * @property {number} defaultTtl - Default time-to-live in milliseconds
 * @property {number} maxEntries - Maximum cache entries
 * @property {boolean} enableMetrics - Enable cache metrics
 */

/**
 * @typedef {Object} BatchConfig
 * @property {boolean} enabled - Enable batch processing
 * @property {number} maxBatchSize - Maximum batch size
 * @property {number} batchDelay - Delay between batches in milliseconds
 * @property {boolean} enableDeduplication - Enable request deduplication
 */

/**
 * @typedef {Object} CircuitBreakerConfig
 * @property {boolean} enabled - Enable circuit breaker
 * @property {number} failureThreshold - Number of failures before opening
 * @property {number} timeout - Time to wait before half-open in milliseconds
 * @property {number} successThreshold - Successes needed to close from half-open
 */

/**
 * @typedef {Object} ConnectionPoolConfig
 * @property {boolean} enabled - Enable connection pooling
 * @property {number} maxConcurrent - Maximum concurrent connections per domain
 * @property {number} maxQueue - Maximum queued requests per domain
 * @property {number} connectionTimeout - Connection timeout in milliseconds
 * @property {number} idleTimeout - Idle connection timeout in milliseconds
 */

/**
 * @typedef {Object} MemoryConfig
 * @property {boolean} enabled - Enable memory management
 * @property {number} maxMemoryMB - Maximum memory usage in MB
 * @property {number} gcThresholdMB - Garbage collection threshold in MB
 * @property {number} monitorInterval - Memory monitoring interval in milliseconds
 */

/**
 * @typedef {Object} LoggingConfig
 * @property {boolean} enabled - Enable logging
 * @property {boolean} logRequests - Log requests
 * @property {boolean} logResponses - Log responses
 * @property {boolean} logErrors - Log errors
 */

/**
 * @typedef {Object} PerformanceConfig
 * @property {boolean} trackTiming - Track request timing
 * @property {number} slowRequestThreshold - Threshold for slow requests in milliseconds
 */

/**
 * @typedef {Object} RequestOptions
 * @property {Object} [params] - Query parameters
 * @property {Object} [headers] - Custom headers
 * @property {*} [body] - Request body
 * @property {boolean} [bypassCache] - Bypass cache
 * @property {number} [cacheTtl] - Custom cache TTL
 * @property {boolean} [noDedupe] - Disable deduplication
 */

/**
 * ApiService - Enhanced API communication with caching and batch operations
 * Extends BaseService for service layer integration
 */
class ApiService {
  constructor() {
    // Service properties
    this.name = "ApiService";
    this.dependencies = ["SecurityService"]; // Depends on security service for CSRF/rate limiting
    this.state = "initialized";
    this.metrics = {
      initTime: 0,
      startTime: 0,
      errorCount: 0,
      operationCount: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      batchOperations: 0,
      deduplicatedRequests: 0,
    };

    /** @type {ApiServiceConfig} */
    this.config = {
      baseUrl: "/rest/scriptrunner/latest/custom",
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000, // Base delay for exponential backoff
      defaultHeaders: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: {
        enabled: true,
        defaultTtl: 300000, // 5 minutes
        maxEntries: 1000,
        enableMetrics: true,
      },
      batch: {
        enabled: true,
        maxBatchSize: 10,
        batchDelay: 100, // ms to wait for batching
        enableDeduplication: true,
      },
      logging: {
        enabled: true,
        logRequests: true,
        logResponses: false, // Set to true for debugging
        logErrors: true,
      },
      performance: {
        trackTiming: true,
        slowRequestThreshold: 1000, // ms
      },
      circuitBreaker: {
        enabled: true,
        failureThreshold: 5,
        timeout: 30000, // 30 seconds
        successThreshold: 2,
      },
      connectionPool: {
        enabled: true,
        maxConcurrent: 10, // per domain
        maxQueue: 50,
        connectionTimeout: 15000,
        idleTimeout: 30000,
      },
      memory: {
        enabled: true,
        maxMemoryMB: 50,
        gcThresholdMB: 40,
        monitorInterval: 30000, // 30 seconds
      },
      adaptiveCache: {
        enabled: true,
        memoryPressureThreshold: 0.8,
        adaptiveCleanupMin: 15000, // 15 seconds
        adaptiveCleanupMax: 300000, // 5 minutes
        lfuEnabled: true,
      },
    };

    // Cache storage with adaptive management
    this.cache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      memoryUsage: 0,
      adaptiveCleanupInterval: 60000, // Start with 1 minute
      lastCleanup: Date.now(),
    };

    // Priority-based request queues
    this.requestQueues = {
      emergency: [], // Priority 1 - Emergency requests
      admin: [], // Priority 2 - Admin requests
      critical: [], // Priority 3 - Critical user actions
      normal: [], // Priority 4 - Normal requests
      background: [], // Priority 5 - Background sync
    };
    this.pendingRequests = new Map(); // For deduplication
    this.processingBatch = false;

    // Circuit breaker for resilience
    this.circuitBreaker = null;

    // Connection pooling
    this.connectionPools = new Map(); // domain -> pool info
    this.connectionStats = {
      totalConnections: 0,
      activeConnections: 0,
      queuedRequests: 0,
      connectionTimeouts: 0,
      poolHits: 0,
    };

    // Memory management
    this.memoryStats = {
      currentUsageMB: 0,
      maxUsageMB: 0,
      gcTriggers: 0,
      lastGC: 0,
      objectCounts: {
        cacheEntries: 0,
        requestEntries: 0,
        responseHistory: 0,
      },
    };

    // Performance tracking
    this.responseTimeHistory = [];
    this.errorHistory = [];

    // Network status tracking
    this.networkStatus = {
      isOnline: navigator.onlineStatus !== false,
      lastConnectivity: Date.now(),
    };

    // Logger (will be injected by service orchestrator)
    this.logger = null;

    // Security service reference
    this.securityService = null;

    // Interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];

    // Initialize event handlers
    this._setupNetworkHandlers();
    this._setupCacheCleanup();
    this._setupMemoryMonitoring();

    // Initialize performance optimizations
    this._initializeCircuitBreaker();
    this._initializeConnectionPools();

    this._log("info", "ApiService initialized");
  }

  /**
   * Initialize service with configuration
   * @param {ApiServiceConfig} config - Service configuration
   * @param {Object} logger - Logger instance
   * @returns {Promise<void>}
   */
  async initialize(config = {}, logger = null) {
    const startTime = performance.now();

    try {
      this._setInitialState(logger);
      this._mergeConfiguration(config);
      await this._initializeSubsystems();
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
   * Merge provided configuration with defaults
   * @param {ApiServiceConfig} config - Service configuration
   * @private
   */
  _mergeConfiguration(config) {
    this.config = this._mergeConfig(this.config, config);
  }

  /**
   * Initialize all subsystems
   * @returns {Promise<void>}
   * @private
   */
  async _initializeSubsystems() {
    if (this.config.cache.enabled) {
      this._setupCacheSystem();
    }

    if (this.config.batch.enabled) {
      this._setupBatchProcessing();
    }

    if (this.config.circuitBreaker.enabled) {
      this._setupCircuitBreaker();
    }

    if (this.config.connectionPool.enabled) {
      this._setupConnectionPools();
    }

    if (this.config.memory.enabled) {
      this._setupMemoryManagement();
    }

    this._setupLegacyCompatibility();
  }

  /**
   * Complete initialization process
   * @param {number} startTime - Initialization start time
   * @private
   */
  _completeInitialization(startTime) {
    this.state = "initialized";
    this.metrics.initTime = performance.now() - startTime;
    this._log(
      "info",
      `ApiService initialized in ${this.metrics.initTime.toFixed(2)}ms`,
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
    this._log("error", "ApiService initialization failed:", error);
  }

  /**
   * Start service operations
   * @returns {Promise<void>}
   */
  async start() {
    const startTime = performance.now();

    try {
      if (this.state !== "initialized") {
        throw new Error(`Cannot start ApiService in state: ${this.state}`);
      }

      this.state = "starting";
      this.startTime = Date.now();

      // Get security service reference
      if (window.AdminGuiService) {
        this.securityService =
          window.AdminGuiService.getService("SecurityService");
      } else if (window.SecurityService) {
        this.securityService = window.SecurityService;
      }

      // Start batch processor
      if (this.config.batch.enabled) {
        this._startBatchProcessor();
      }

      // Start cache monitoring
      if (this.config.cache.enabled && this.config.cache.enableMetrics) {
        this._startCacheMonitoring();
      }

      this.state = "running";
      this.metrics.startTime = performance.now() - startTime;

      this._log(
        "info",
        `ApiService started in ${this.metrics.startTime.toFixed(2)}ms`,
      );
    } catch (error) {
      this.state = "error";
      this.metrics.errorCount++;
      this._log("error", "ApiService start failed:", error);
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
          `Attempting to stop ApiService in state: ${this.state}`,
        );
        return;
      }

      this.state = "stopping";

      // Process remaining requests
      await this._drainRequestQueue();

      // Stop batch processor
      if (this.batchProcessorInterval) {
        clearInterval(this.batchProcessorInterval);
        this.batchProcessorInterval = null;
      }

      // Stop cache monitoring
      if (this.cacheMonitorInterval) {
        clearInterval(this.cacheMonitorInterval);
        this.cacheMonitorInterval = null;
      }

      this.state = "stopped";
      this._log("info", "ApiService stopped successfully");
    } catch (error) {
      this.state = "error";
      this.metrics.errorCount++;
      this._log("error", "ApiService stop failed:", error);
      throw error;
    }
  }

  /**
   * Cleanup service resources
   * @returns {Promise<void>}
   */
  async cleanup() {
    try {
      // Clear cache
      this.cache.clear();

      // Clear request queues and pending requests
      Object.keys(this.requestQueues).forEach((priority) => {
        this.requestQueues[priority] = [];
      });
      this.pendingRequests.clear();

      // Clear connection pools
      this.connectionPools.clear();

      // Clear history
      this.responseTimeHistory = [];
      this.errorHistory = [];

      // Clear intervals
      if (this.batchProcessorInterval) {
        clearInterval(this.batchProcessorInterval);
      }
      if (this.cacheMonitorInterval) {
        clearInterval(this.cacheMonitorInterval);
      }
      if (this.cacheCleanupInterval) {
        clearInterval(this.cacheCleanupInterval);
      }
      if (this.circuitBreakerMonitorInterval) {
        clearInterval(this.circuitBreakerMonitorInterval);
      }
      if (this.connectionCleanupInterval) {
        clearInterval(this.connectionCleanupInterval);
      }
      if (this.memoryMonitorInterval) {
        clearInterval(this.memoryMonitorInterval);
      }

      // Reset circuit breaker
      if (this.circuitBreaker) {
        this.circuitBreaker.reset();
      }

      // Reset metrics
      this.metrics.deduplicatedRequests = 0;
      this.memoryStats.gcTriggers = 0;
      this.connectionStats = {
        totalConnections: 0,
        activeConnections: 0,
        queuedRequests: 0,
        connectionTimeouts: 0,
        poolHits: 0,
      };

      this.state = "cleaned";
      this._log("info", "ApiService cleanup completed");
    } catch (error) {
      this.metrics.errorCount++;
      this._log("error", "ApiService cleanup failed:", error);
      throw error;
    }
  }

  /**
   * GET request with caching
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @param {Object} options - Request options
   * @returns {Promise} API response
   */
  async get(endpoint, params = {}, options = {}) {
    const cacheKey = this._generateCacheKey("GET", endpoint, params);

    // Check cache first
    if (this.config.cache.enabled && !options.bypassCache) {
      const cachedResult = this._getCached(cacheKey);
      if (cachedResult !== null) {
        this.metrics.cacheHits++;
        this.cacheStats.hits++;
        this._log("debug", `Cache HIT for GET ${endpoint}`);
        return cachedResult;
      }
      this.metrics.cacheMisses++;
      this.cacheStats.misses++;
    }

    const requestOptions = {
      ...options,
      params,
      method: "GET",
    };

    const result = await this._executeRequest("GET", endpoint, requestOptions);

    // Cache successful GET requests
    if (this.config.cache.enabled && !options.bypassCache) {
      const ttl = options.cacheTtl || this.config.cache.defaultTtl;
      this._setCached(cacheKey, result, ttl);
    }

    return result;
  }

  /**
   * POST request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @param {Object} options - Request options
   * @returns {Promise} API response
   */
  async post(endpoint, data = {}, options = {}) {
    const requestOptions = {
      ...options,
      body: data,
      method: "POST",
    };

    const result = await this._executeRequest("POST", endpoint, requestOptions);

    // Invalidate related cache entries
    if (this.config.cache.enabled) {
      this._invalidateRelatedCache(endpoint, "POST");
    }

    return result;
  }

  /**
   * PUT request
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body data
   * @param {Object} options - Request options
   * @returns {Promise} API response
   */
  async put(endpoint, data = {}, options = {}) {
    const requestOptions = {
      ...options,
      body: data,
      method: "PUT",
    };

    const result = await this._executeRequest("PUT", endpoint, requestOptions);

    // Invalidate related cache entries
    if (this.config.cache.enabled) {
      this._invalidateRelatedCache(endpoint, "PUT");
    }

    return result;
  }

  /**
   * DELETE request
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {Promise} API response
   */
  async delete(endpoint, options = {}) {
    const requestOptions = {
      ...options,
      method: "DELETE",
    };

    const result = await this._executeRequest(
      "DELETE",
      endpoint,
      requestOptions,
    );

    // Invalidate related cache entries
    if (this.config.cache.enabled) {
      this._invalidateRelatedCache(endpoint, "DELETE");
    }

    return result;
  }

  /**
   * Batch GET requests
   * @param {Array} requests - Array of request objects {endpoint, params, options}
   * @returns {Promise<Array>} Array of responses
   */
  async batchGet(requests) {
    if (!this.config.batch.enabled) {
      // Execute requests individually
      return Promise.all(
        requests.map((req) => this.get(req.endpoint, req.params, req.options)),
      );
    }

    this.metrics.batchOperations++;

    const results = [];
    const pendingRequests = [];

    // Check cache for each request
    for (const request of requests) {
      const cacheKey = this._generateCacheKey(
        "GET",
        request.endpoint,
        request.params,
      );
      const cached = this._getCached(cacheKey);

      if (cached !== null && !request.options?.bypassCache) {
        results.push({ index: results.length, data: cached, fromCache: true });
        this.metrics.cacheHits++;
      } else {
        pendingRequests.push({
          ...request,
          originalIndex: results.length,
          cacheKey,
        });
        results.push(null); // Placeholder
        this.metrics.cacheMisses++;
      }
    }

    // Execute pending requests in batches
    if (pendingRequests.length > 0) {
      const batchSize = Math.min(
        this.config.batch.maxBatchSize,
        pendingRequests.length,
      );
      const batches = this._chunkArray(pendingRequests, batchSize);

      for (const batch of batches) {
        const batchPromises = batch.map((request) =>
          this._executeRequest("GET", request.endpoint, {
            ...request.options,
            params: request.params,
          }).then((result) => ({ request, result })),
        );

        const batchResults = await Promise.allSettled(batchPromises);

        // Process batch results
        batchResults.forEach(({ status, value, reason }) => {
          if (status === "fulfilled") {
            const { request, result } = value;
            results[request.originalIndex] = result;

            // Cache the result
            if (this.config.cache.enabled && !request.options?.bypassCache) {
              const ttl =
                request.options?.cacheTtl || this.config.cache.defaultTtl;
              this._setCached(request.cacheKey, result, ttl);
            }
          } else {
            results[request.originalIndex] = { error: reason };
          }
        });
      }
    }

    this._log(
      "debug",
      `Batch GET completed: ${requests.length} requests, ${results.filter((r) => r && r.fromCache).length} from cache`,
    );
    return results;
  }

  /**
   * Batch POST requests
   * @param {Array} requests - Array of request objects {endpoint, data, options}
   * @returns {Promise<Array>} Array of responses
   */
  async batchPost(requests) {
    if (!this.config.batch.enabled) {
      return Promise.all(
        requests.map((req) => this.post(req.endpoint, req.data, req.options)),
      );
    }

    this.metrics.batchOperations++;

    const batchSize = Math.min(this.config.batch.maxBatchSize, requests.length);
    const batches = this._chunkArray(requests, batchSize);
    const results = [];

    for (const batch of batches) {
      const batchPromises = batch.map((request) =>
        this._executeRequest("POST", request.endpoint, {
          ...request.options,
          body: request.data,
        }),
      );

      const batchResults = await Promise.allSettled(batchPromises);
      results.push(...batchResults);
    }

    // Invalidate cache for all endpoints
    if (this.config.cache.enabled) {
      requests.forEach((request) => {
        this._invalidateRelatedCache(request.endpoint, "POST");
      });
    }

    return results;
  }

  /**
   * Add request interceptor
   * @param {Function} interceptor - Request interceptor function
   */
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  /**
   * Add response interceptor
   * @param {Function} interceptor - Response interceptor function
   */
  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  /**
   * Get cache statistics
   * @returns {Object} Cache statistics
   */
  getCacheStats() {
    return {
      ...this.cacheStats,
      size: this.cache.size,
      hitRate:
        this.cacheStats.hits > 0
          ? (this.cacheStats.hits /
              (this.cacheStats.hits + this.cacheStats.misses)) *
            100
          : 0,
    };
  }

  /**
   * Clear cache
   * @param {string} pattern - Optional pattern to match cache keys
   */
  clearCache(pattern = null) {
    if (!pattern) {
      this.cache.clear();
      this.cacheStats.evictions += this.cache.size;
      this._log("info", "Cache cleared completely");
    } else {
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach((key) => this.cache.delete(key));
      this.cacheStats.evictions += keysToDelete.length;
      this._log(
        "info",
        `Cache cleared for pattern: ${pattern}, ${keysToDelete.length} entries removed`,
      );
    }
  }

  /**
   * Get comprehensive service health status
   * @returns {Object} Health status information
   */
  getHealth() {
    const uptime = this.startTime ? Date.now() - this.startTime : 0;
    const errorRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100
        : 0;
    const deduplicationStats = this.getDeduplicationStats();
    const memoryPressure = this._getMemoryPressure();

    const circuitBreakerState = this.circuitBreaker
      ? this.circuitBreaker.getState()
      : null;

    return {
      name: this.name,
      state: this.state,
      uptime,
      metrics: { ...this.metrics },
      cacheStats: {
        ...this.getCacheStats(),
        memoryUsage: this.cacheStats.memoryUsage,
        adaptiveInterval: this.cacheStats.adaptiveCleanupInterval,
      },
      deduplicationStats,
      networkStatus: { ...this.networkStatus },
      performance: {
        averageResponseTime: this.metrics.averageResponseTime,
        errorRate,
        cacheHitRate: this.getCacheStats().hitRate,
        deduplicationRate: deduplicationStats.deduplicationRate,
        memoryPressure: memoryPressure * 100,
        connectionPoolStats: { ...this.connectionStats },
      },
      circuitBreaker: circuitBreakerState,
      memory: { ...this.memoryStats },
      connectionPools: {
        totalPools: this.connectionPools.size,
        stats: { ...this.connectionStats },
      },
      isHealthy:
        this.state === "running" &&
        errorRate < 10 &&
        this.metrics.averageResponseTime <
          this.config.performance.slowRequestThreshold &&
        memoryPressure < 0.9 &&
        (!circuitBreakerState || circuitBreakerState.state === "CLOSED"),
    };
  }

  // Private methods

  /**
   * Execute HTTP request with circuit breaker, connection pooling, and optimizations
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {RequestOptions} options - Request options
   * @returns {Promise} Request result
   * @private
   */
  async _executeRequest(method, endpoint, options = {}) {
    const requestId = this._generateRequestId();
    const startTime = performance.now();

    this._updateRequestMetrics();

    try {
      this._validateNetworkStatus();

      // Circuit breaker protection
      if (this.circuitBreaker && this.config.circuitBreaker.enabled) {
        return await this.circuitBreaker.execute(async () => {
          return await this._executeWithOptimizations(
            method,
            endpoint,
            options,
            requestId,
            startTime,
          );
        });
      } else {
        return await this._executeWithOptimizations(
          method,
          endpoint,
          options,
          requestId,
          startTime,
        );
      }
    } catch (error) {
      this._handleRequestError(error, { method, endpoint, requestId });
      throw this._handleApiError(error, { method, endpoint, requestId });
    }
  }

  /**
   * Execute request with connection pooling and deduplication
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {RequestOptions} options - Request options
   * @param {string} requestId - Request ID
   * @param {number} startTime - Start time
   * @returns {Promise} Request result
   * @private
   */
  async _executeWithOptimizations(
    method,
    endpoint,
    options,
    requestId,
    startTime,
  ) {
    // Connection pooling
    if (this.config.connectionPool.enabled) {
      return await this._executeWithConnectionPool(
        method,
        endpoint,
        options,
        requestId,
        startTime,
      );
    }

    // Standard deduplication path
    if (this._shouldUseDeduplication(method, options)) {
      return await this._executeWithDeduplication(
        method,
        endpoint,
        options,
        requestId,
        startTime,
      );
    } else {
      return await this._executeUniqueRequest(
        method,
        endpoint,
        options,
        requestId,
        startTime,
      );
    }
  }

  /**
   * Execute request with connection pooling
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {RequestOptions} options - Request options
   * @param {string} requestId - Request ID
   * @param {number} startTime - Start time
   * @returns {Promise} Request result
   * @private
   */
  async _executeWithConnectionPool(
    method,
    endpoint,
    options,
    requestId,
    startTime,
  ) {
    const domain = this._extractDomain(endpoint);
    const pool = this._getConnectionPool(domain);

    // Check connection limits
    if (pool.activeConnections >= this.config.connectionPool.maxConcurrent) {
      if (pool.queue.length >= this.config.connectionPool.maxQueue) {
        throw new Error(`Connection pool full for domain: ${domain}`);
      }

      // Queue the request
      return new Promise((resolve, reject) => {
        const queueEntry = {
          method,
          endpoint,
          options,
          requestId,
          startTime,
          resolve,
          reject,
          timestamp: Date.now(),
          priority: options.priority || "normal",
        };

        // Insert based on priority
        this._insertIntoQueue(pool.queue, queueEntry);
        this.connectionStats.queuedRequests++;
      });
    }

    // Execute immediately
    pool.activeConnections++;
    this.connectionStats.activeConnections++;
    this.connectionStats.poolHits++;

    try {
      // Standard execution path
      if (this._shouldUseDeduplication(method, options)) {
        return await this._executeWithDeduplication(
          method,
          endpoint,
          options,
          requestId,
          startTime,
        );
      } else {
        return await this._executeUniqueRequest(
          method,
          endpoint,
          options,
          requestId,
          startTime,
        );
      }
    } finally {
      pool.activeConnections--;
      this.connectionStats.activeConnections--;
      pool.lastUsed = Date.now();

      // Process next queued request
      if (pool.queue.length > 0) {
        const nextRequest = pool.queue.shift();
        this.connectionStats.queuedRequests--;

        // Execute queued request asynchronously
        setImmediate(() => {
          this._executeWithConnectionPool(
            nextRequest.method,
            nextRequest.endpoint,
            nextRequest.options,
            nextRequest.requestId,
            nextRequest.startTime,
          )
            .then(nextRequest.resolve)
            .catch(nextRequest.reject);
        });
      }
    }
  }

  /**
   * Update request metrics with memory tracking
   * @private
   */
  _updateRequestMetrics() {
    this.metrics.totalRequests++;
    this.metrics.operationCount++;

    // Update memory statistics
    this._updateMemoryStats();

    // Check for memory pressure
    if (this.config.memory.enabled) {
      this._checkMemoryPressure();
    }
  }

  /**
   * Validate network status
   * @private
   */
  _validateNetworkStatus() {
    if (!this.networkStatus.isOnline) {
      throw new Error("Network is offline");
    }
  }

  /**
   * Check if request should use deduplication
   * @param {string} method - HTTP method
   * @param {RequestOptions} options - Request options
   * @returns {boolean} Should use deduplication
   * @private
   */
  _shouldUseDeduplication(method, options) {
    return (
      this.config.batch.enableDeduplication &&
      this._isDeduplicatable(method, options)
    );
  }

  /**
   * Execute request with deduplication logic
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {RequestOptions} options - Request options
   * @param {string} requestId - Request ID
   * @param {number} startTime - Start time
   * @returns {Promise} Request result
   * @private
   */
  async _executeWithDeduplication(
    method,
    endpoint,
    options,
    requestId,
    startTime,
  ) {
    const deduplicationKey = this._generateDeduplicationKey(
      method,
      endpoint,
      options,
    );

    // Check if identical request is already in progress
    if (this.pendingRequests.has(deduplicationKey)) {
      this.metrics.deduplicatedRequests =
        (this.metrics.deduplicatedRequests || 0) + 1;
      this._log("debug", `Request deduplicated: ${method} ${endpoint}`, {
        deduplicationKey,
      });
      return await this.pendingRequests.get(deduplicationKey);
    }

    // Create and store promise for deduplication
    const requestPromise = this._executeUniqueRequest(
      method,
      endpoint,
      options,
      requestId,
      startTime,
    );
    this.pendingRequests.set(deduplicationKey, requestPromise);

    try {
      const result = await requestPromise;
      this.pendingRequests.delete(deduplicationKey);
      return result;
    } catch (error) {
      this.pendingRequests.delete(deduplicationKey);
      throw error;
    }
  }

  /**
   * Handle request error tracking
   * @param {Error} error - Request error
   * @param {Object} context - Request context
   * @private
   */
  _handleRequestError(error, context) {
    this.metrics.failedRequests++;
    this.metrics.errorCount++;

    // Track error
    this.errorHistory.push({
      timestamp: Date.now(),
      method: context.method,
      endpoint: context.endpoint,
      error: error.message,
      requestId: context.requestId,
    });

    // Log error
    if (this.config.logging.logErrors) {
      this._log("error", `API ${context.method} ${context.endpoint} failed`, {
        requestId: context.requestId,
        error: error.message,
        stack: error.stack,
      });
    }
  }

  /**
   * Execute unique HTTP request (actual implementation without deduplication)
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {RequestOptions} options - Request options
   * @param {string} requestId - Request ID
   * @param {number} startTime - Start time
   * @returns {Promise} Request result
   * @private
   */
  async _executeUniqueRequest(method, endpoint, options, requestId, startTime) {
    // Security and configuration setup
    const securityResult = await this._validateRequestSecurity(
      method,
      endpoint,
      options,
      requestId,
    );
    const requestConfig = await this._prepareRequestConfig(
      method,
      endpoint,
      options,
      requestId,
      securityResult,
    );

    this._logRequestIfEnabled(method, endpoint, requestId, options);

    // Execute with retry logic
    return await this._executeWithRetries(requestConfig, startTime, requestId);
  }

  /**
   * Validate request security
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {RequestOptions} options - Request options
   * @param {string} requestId - Request ID
   * @returns {Promise<Object>} Security result
   * @private
   */
  async _validateRequestSecurity(method, endpoint, options, requestId) {
    const securityResult = await this._applySecurityChecks({
      method,
      endpoint,
      options,
      requestId,
    });

    if (!securityResult.allowed) {
      throw new Error(
        `Request blocked by security: ${JSON.stringify(securityResult)}`,
      );
    }

    return securityResult;
  }

  /**
   * Prepare request configuration
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {RequestOptions} options - Request options
   * @param {string} requestId - Request ID
   * @param {Object} securityResult - Security validation result
   * @returns {Promise<Object>} Request configuration
   * @private
   */
  async _prepareRequestConfig(
    method,
    endpoint,
    options,
    requestId,
    securityResult,
  ) {
    const requestConfig = await this._applyRequestInterceptors({
      method,
      endpoint,
      options,
      requestId,
      security: securityResult,
    });

    return {
      ...requestConfig,
      config: this._buildRequestConfig(
        requestConfig.method,
        requestConfig.options,
        securityResult,
      ),
      url: this._buildUrl(requestConfig.endpoint, requestConfig.options.params),
    };
  }

  /**
   * Log request if enabled
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {string} requestId - Request ID
   * @param {RequestOptions} options - Request options
   * @private
   */
  _logRequestIfEnabled(method, endpoint, requestId, options) {
    if (this.config.logging.logRequests) {
      this._log("debug", `API ${method} ${endpoint}`, {
        requestId,
        params: options.params,
        body: options.body,
      });
    }
  }

  /**
   * Execute request with retry logic
   * @param {Object} requestConfig - Complete request configuration
   * @param {number} startTime - Start time
   * @param {string} requestId - Request ID
   * @returns {Promise} Request result
   * @private
   */
  async _executeWithRetries(requestConfig, startTime, requestId) {
    let lastError;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        return await this._executeSingleAttempt(
          requestConfig,
          startTime,
          requestId,
        );
      } catch (error) {
        lastError = error;

        if (await this._shouldRetryAttempt(error, attempt, requestConfig)) {
          await this._handleRetryDelay(error, attempt, requestConfig);
        } else {
          break;
        }
      }
    }

    throw lastError;
  }

  /**
   * Execute single request attempt
   * @param {Object} requestConfig - Request configuration
   * @param {number} startTime - Start time
   * @param {string} requestId - Request ID
   * @returns {Promise} Request result
   * @private
   */
  async _executeSingleAttempt(requestConfig, startTime, requestId) {
    const response = await this._fetchWithTimeout(
      requestConfig.url,
      requestConfig.config,
    );
    const result = await this._handleResponse(response);

    // Apply response interceptors
    const interceptedResult = await this._applyResponseInterceptors({
      result,
      request: requestConfig,
      response,
      requestId,
    });

    // Update metrics and log
    const responseTime = performance.now() - startTime;
    this._updateResponseTimeMetrics(responseTime);
    this._logResponseIfEnabled(
      requestConfig,
      requestId,
      response,
      responseTime,
    );

    return interceptedResult;
  }

  /**
   * Check if attempt should be retried
   * @param {Error} error - Request error
   * @param {number} attempt - Current attempt number
   * @param {Object} requestConfig - Request configuration
   * @returns {Promise<boolean>} Should retry
   * @private
   */
  async _shouldRetryAttempt(error, attempt, requestConfig) {
    return attempt < this.config.retryAttempts && this._shouldRetry(error);
  }

  /**
   * Handle retry delay
   * @param {Error} error - Request error
   * @param {number} attempt - Current attempt number
   * @param {Object} requestConfig - Request configuration
   * @returns {Promise<void>}
   * @private
   */
  async _handleRetryDelay(error, attempt, requestConfig) {
    const delay = this._calculateRetryDelay(attempt);
    this._log(
      "warn",
      `API ${requestConfig.method} ${requestConfig.endpoint} attempt ${attempt + 1} failed, retrying in ${delay}ms`,
      error,
    );
    await this._sleep(delay);
  }

  /**
   * Log response if enabled
   * @param {Object} requestConfig - Request configuration
   * @param {string} requestId - Request ID
   * @param {Response} response - HTTP response
   * @param {number} responseTime - Response time in ms
   * @private
   */
  _logResponseIfEnabled(requestConfig, requestId, response, responseTime) {
    if (this.config.logging.logResponses) {
      this._log(
        "debug",
        `API ${requestConfig.method} ${requestConfig.endpoint} response`,
        {
          requestId,
          responseTime: responseTime.toFixed(2) + "ms",
          status: response.status,
        },
      );
    }
  }

  /**
   * Check if request is deduplicatable
   * @param {string} method - HTTP method
   * @param {Object} options - Request options
   * @returns {boolean} Whether request can be deduplicated
   * @private
   */
  _isDeduplicatable(method, options) {
    // Only GET requests are deduplicatable by default (safe, idempotent)
    // Don't deduplicate requests that explicitly bypass cache or have special headers
    return (
      method.toUpperCase() === "GET" &&
      !options.bypassCache &&
      !options.noDedupe &&
      !options.headers?.["X-No-Dedup"]
    );
  }

  /**
   * Generate deduplication key for request
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} options - Request options
   * @returns {string} Deduplication key
   * @private
   */
  _generateDeduplicationKey(method, endpoint, options) {
    // Create comprehensive key including method, endpoint, params, and relevant headers
    const keyComponents = {
      method: method.toUpperCase(),
      endpoint: endpoint,
      params: options.params
        ? JSON.stringify(
            options.params,
            Object.keys(options.params || {}).sort(),
          )
        : "",
      headers: this._getRelevantHeaders(options.headers),
    };

    // Generate deterministic key
    return `dedup:${JSON.stringify(keyComponents)}`;
  }

  /**
   * Extract relevant headers for deduplication key
   * @param {Object} headers - Request headers
   * @returns {Object} Filtered headers
   * @private
   */
  _getRelevantHeaders(headers = {}) {
    // Only include headers that affect response content
    const relevantHeaders = {};
    const importantHeaders = [
      "accept",
      "accept-language",
      "authorization",
      "x-requested-with",
      "x-api-version",
    ];

    Object.entries(headers).forEach(([key, value]) => {
      if (importantHeaders.includes(key.toLowerCase())) {
        relevantHeaders[key.toLowerCase()] = value;
      }
    });

    return relevantHeaders;
  }

  /**
   * Get deduplication statistics
   * @returns {Object} Deduplication statistics
   */
  getDeduplicationStats() {
    return {
      pendingRequests: this.pendingRequests.size,
      deduplicatedRequests: this.metrics.deduplicatedRequests || 0,
      totalRequests: this.metrics.totalRequests,
      deduplicationRate:
        this.metrics.totalRequests > 0
          ? ((this.metrics.deduplicatedRequests || 0) /
              this.metrics.totalRequests) *
            100
          : 0,
    };
  }

  /**
   * Clear pending requests (for testing or cleanup)
   */
  clearPendingRequests() {
    this.pendingRequests.clear();
    this._log("debug", "Pending requests cleared");
  }

  /**
   * Build full URL from endpoint and parameters
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {string} Full URL
   * @private
   */
  _buildUrl(endpoint, params = {}) {
    let url = endpoint.startsWith("http")
      ? endpoint
      : `${this.config.baseUrl}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

    // Add query parameters
    if (params && Object.keys(params).length > 0) {
      const urlObj = new URL(url, window.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          urlObj.searchParams.append(key, value);
        }
      });
      url = urlObj.toString();
    }

    return url;
  }

  /**
   * Build request configuration for fetch
   * @param {string} method - HTTP method
   * @param {Object} options - Request options
   * @param {Object} securityResult - Security check result
   * @returns {Object} Fetch configuration
   * @private
   */
  _buildRequestConfig(method, options, securityResult = {}) {
    const config = {
      method: method.toUpperCase(),
      headers: { ...this.config.defaultHeaders },
      credentials: "same-origin",
    };

    // Add security headers
    if (securityResult.securityHeaders) {
      Object.assign(config.headers, securityResult.securityHeaders);
    }

    // Add CSRF token for state-changing requests
    if (securityResult.csrf && securityResult.csrf.token) {
      config.headers["X-CSRF-Token"] = securityResult.csrf.token;
    }

    // Add custom headers
    if (options.headers) {
      Object.assign(config.headers, options.headers);
    }

    // Add body for POST/PUT/PATCH requests
    if (options.body && ["POST", "PUT", "PATCH"].includes(config.method)) {
      if (
        typeof options.body === "object" &&
        !(options.body instanceof FormData)
      ) {
        config.body = JSON.stringify(options.body);
      } else {
        config.body = options.body;
        // Remove Content-Type header for FormData to let browser set it
        if (options.body instanceof FormData) {
          delete config.headers["Content-Type"];
        }
      }
    }

    return config;
  }

  /**
   * Fetch with timeout support
   * @param {string} url - Request URL
   * @param {Object} config - Fetch configuration
   * @returns {Promise<Response>} Fetch response
   * @private
   */
  async _fetchWithTimeout(url, config) {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error("Request timeout")),
        this.config.timeout,
      );
    });

    const requestPromise = fetch(url, config);

    return Promise.race([requestPromise, timeoutPromise]);
  }

  /**
   * Handle API response
   * @param {Response} response - Fetch response
   * @returns {Promise} Parsed response data
   * @private
   */
  async _handleResponse(response) {
    if (!response.ok) {
      const error = new Error(
        `HTTP ${response.status}: ${response.statusText}`,
      );
      error.status = response.status;
      error.statusText = response.statusText;

      // Try to get error details from response body
      try {
        const errorData = await response.json();
        error.details = errorData;
      } catch (e) {
        // Response body is not JSON, use text
        try {
          error.details = await response.text();
        } catch (textError) {
          // Can't read response body
        }
      }

      throw error;
    }

    // Parse response based on content type
    const contentType = response.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      return await response.json();
    } else if (contentType && contentType.includes("text/")) {
      return await response.text();
    } else {
      return await response.blob();
    }
  }

  /**
   * Handle API errors and create user-friendly error messages
   * @param {Error} error - Original error
   * @param {Object} context - Request context
   * @returns {Error} Enhanced error
   * @private
   */
  _handleApiError(error, context) {
    const enhancedError = new Error();
    enhancedError.originalError = error;
    enhancedError.context = context;

    // Map common HTTP status codes to user-friendly messages
    if (error.status) {
      switch (error.status) {
        case 400:
          enhancedError.message =
            "Invalid request. Please check your input and try again.";
          enhancedError.userMessage = "The request contains invalid data.";
          break;
        case 401:
          enhancedError.message =
            "Authentication required. Please log in and try again.";
          enhancedError.userMessage =
            "You need to log in to perform this action.";
          break;
        case 403:
          enhancedError.message =
            "Access denied. You do not have permission to perform this action.";
          enhancedError.userMessage =
            "You do not have permission for this action.";
          break;
        case 404:
          enhancedError.message = "The requested resource was not found.";
          enhancedError.userMessage = "The requested item could not be found.";
          break;
        case 429:
          enhancedError.message =
            "Too many requests. Please wait a moment and try again.";
          enhancedError.userMessage =
            "Please wait a moment before trying again.";
          break;
        case 500:
          enhancedError.message =
            "Internal server error. Please try again later.";
          enhancedError.userMessage =
            "A server error occurred. Please try again later.";
          break;
        default:
          enhancedError.message = `Request failed with status ${error.status}: ${error.statusText}`;
          enhancedError.userMessage = "An unexpected error occurred.";
      }
    } else if (error.message.includes("timeout")) {
      enhancedError.message =
        "Request timeout. Please check your network connection.";
      enhancedError.userMessage =
        "The request took too long. Please try again.";
    } else if (error.message.includes("Network")) {
      enhancedError.message =
        "Network error. Please check your internet connection.";
      enhancedError.userMessage = "Please check your internet connection.";
    } else {
      enhancedError.message = error.message || "Unknown error occurred";
      enhancedError.userMessage = "An unexpected error occurred.";
    }

    enhancedError.status = error.status;
    enhancedError.details = error.details;

    return enhancedError;
  }

  /**
   * Apply request interceptors
   * @param {Object} requestConfig - Request configuration
   * @returns {Promise<Object>} Modified request configuration
   * @private
   */
  async _applyRequestInterceptors(requestConfig) {
    let config = requestConfig;

    for (const interceptor of this.requestInterceptors) {
      try {
        config = await interceptor(config);
      } catch (error) {
        this._log("warn", "Request interceptor failed:", error);
      }
    }

    return config;
  }

  /**
   * Apply response interceptors
   * @param {Object} responseData - Response data
   * @returns {Promise<*>} Modified response data
   * @private
   */
  async _applyResponseInterceptors(responseData) {
    let data = responseData.result;

    for (const interceptor of this.responseInterceptors) {
      try {
        data = await interceptor({
          ...responseData,
          result: data,
        });
      } catch (error) {
        this._log("warn", "Response interceptor failed:", error);
      }
    }

    return data;
  }

  /**
   * Generate cache key
   * @param {string} method - HTTP method
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Parameters
   * @returns {string} Cache key
   * @private
   */
  _generateCacheKey(method, endpoint, params = {}) {
    const paramString =
      Object.keys(params).length > 0
        ? JSON.stringify(params, Object.keys(params).sort())
        : "";
    return `${method}:${endpoint}:${paramString}`;
  }

  /**
   * Get cached value
   * @param {string} key - Cache key
   * @returns {*} Cached value or null
   * @private
   */
  _getCached(key) {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (entry.isExpired()) {
      this.cache.delete(key);
      this.cacheStats.evictions++;
      return null;
    }

    return entry.access();
  }

  /**
   * Set cached value
   * @param {string} key - Cache key
   * @param {*} value - Value to cache
   * @param {number} ttl - Time to live in milliseconds
   * @private
   */
  _setCached(key, value, ttl) {
    // Check cache size limit
    if (this.cache.size >= this.config.cache.maxEntries) {
      this._evictLeastRecentlyUsed();
    }

    const entry = new CacheEntry(value, ttl);
    this.cache.set(key, entry);
    this.cacheStats.size = this.cache.size;
  }

  /**
   * Invalidate cache entries related to endpoint
   * @param {string} endpoint - API endpoint
   * @param {string} method - HTTP method that triggered invalidation
   * @private
   */
  _invalidateRelatedCache(endpoint, method) {
    const keysToDelete = [];

    for (const key of this.cache.keys()) {
      // Invalidate cache entries for the same endpoint (different methods/params)
      if (key.includes(endpoint)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.cacheStats.evictions++;
    });

    if (keysToDelete.length > 0) {
      this._log(
        "debug",
        `Invalidated ${keysToDelete.length} cache entries for ${endpoint} (${method})`,
      );
    }
  }

  /**
   * Evict cache entries using adaptive LRU/LFU strategy
   * @private
   */
  _evictLeastRecentlyUsed() {
    const evictionCount = Math.max(1, Math.floor(this.cache.size * 0.1)); // Evict 10%
    const candidates = [];

    for (const [key, entry] of this.cache.entries()) {
      candidates.push({
        key,
        entry,
        score: this._calculateEvictionScore(entry),
      });
    }

    // Sort by eviction score (higher score = more likely to evict)
    candidates.sort((a, b) => b.score - a.score);

    // Evict the worst candidates
    for (let i = 0; i < Math.min(evictionCount, candidates.length); i++) {
      this.cache.delete(candidates[i].key);
      this.cacheStats.evictions++;
    }
  }

  /**
   * Calculate eviction score combining LRU and LFU factors
   * @param {CacheEntry} entry - Cache entry
   * @returns {number} Eviction score (higher = more likely to evict)
   * @private
   */
  _calculateEvictionScore(entry) {
    const now = Date.now();
    const age = now - entry.timestamp;
    const timeSinceAccess = now - entry.lastAccessed;
    const frequency = entry.accessCount;
    const size = this._estimateEntrySize(entry);

    // Weighted scoring:
    // - Recent access reduces score (LRU component)
    // - High frequency reduces score (LFU component)
    // - Large size increases score
    // - Very old entries increase score
    let score = 0;

    // LRU component (0-50)
    score += Math.min(50, timeSinceAccess / 1000); // Points per second since access

    // LFU component (-25 to 25)
    score += Math.max(-25, 25 - frequency); // Penalty for frequent access

    // Size component (0-25)
    score += Math.min(25, size / 1000); // Points per KB

    // Age component (0-10)
    score += Math.min(10, age / (60 * 60 * 1000)); // Points per hour old

    return score;
  }

  /**
   * Estimate cache entry memory size
   * @param {CacheEntry} entry - Cache entry
   * @returns {number} Estimated size in bytes
   * @private
   */
  _estimateEntrySize(entry) {
    try {
      return JSON.stringify(entry.data).length * 2; // UTF-16 approximation
    } catch (error) {
      return 1000; // Default size for non-serializable data
    }
  }

  /**
   * Setup adaptive cache system
   * @private
   */
  _setupCacheSystem() {
    this._log(
      "info",
      "Adaptive cache system enabled with TTL:",
      this.config.cache.defaultTtl,
    );

    // Start with adaptive cleanup interval
    this.cacheCleanupInterval = setInterval(() => {
      this._cleanupExpiredCache();
    }, this.cacheStats.adaptiveCleanupInterval);

    // Cache warming for critical endpoints
    if (this.config.cache.warmupEndpoints) {
      this._warmupCriticalEndpoints();
    }
  }

  /**
   * Adaptive cache cleanup with memory pressure awareness
   * @private
   */
  _cleanupExpiredCache() {
    const now = Date.now();
    const keysToDelete = [];
    const memoryPressure = this._getMemoryPressure();

    // More aggressive cleanup under memory pressure
    const aggressiveCleanup =
      memoryPressure > this.config.adaptiveCache.memoryPressureThreshold;

    for (const [key, entry] of this.cache.entries()) {
      let shouldDelete = entry.isExpired();

      if (aggressiveCleanup && !shouldDelete) {
        // Under memory pressure, also remove old entries with low access
        const age = now - entry.lastAccessed;
        const lowFrequency = entry.accessCount < 2;
        const oldEntry = age > entry.ttl / 2; // Older than half TTL

        shouldDelete = lowFrequency && oldEntry;
      }

      if (shouldDelete) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.cacheStats.evictions++;
    });

    // Update adaptive cleanup interval based on results
    this._updateAdaptiveCleanupInterval(keysToDelete.length, memoryPressure);

    if (keysToDelete.length > 0) {
      this._log(
        "debug",
        `Cleaned up ${keysToDelete.length} cache entries (memory pressure: ${(memoryPressure * 100).toFixed(1)}%)`,
      );
    }

    this.cacheStats.lastCleanup = now;
  }

  /**
   * Update adaptive cleanup interval based on performance
   * @param {number} cleanedCount - Number of entries cleaned
   * @param {number} memoryPressure - Current memory pressure (0-1)
   * @private
   */
  _updateAdaptiveCleanupInterval(cleanedCount, memoryPressure) {
    const currentInterval = this.cacheStats.adaptiveCleanupInterval;
    const min = this.config.adaptiveCache.adaptiveCleanupMin;
    const max = this.config.adaptiveCache.adaptiveCleanupMax;

    let newInterval = currentInterval;

    if (memoryPressure > 0.8) {
      // High memory pressure: cleanup more frequently
      newInterval = Math.max(min, currentInterval * 0.8);
    } else if (memoryPressure < 0.3 && cleanedCount === 0) {
      // Low pressure and nothing to clean: reduce frequency
      newInterval = Math.min(max, currentInterval * 1.2);
    }

    this.cacheStats.adaptiveCleanupInterval = newInterval;

    // Update the cleanup interval
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = setInterval(() => {
        this._cleanupExpiredCache();
      }, newInterval);
    }
  }

  /**
   * Setup batch processing
   * @private
   */
  _setupBatchProcessing() {
    this._log(
      "info",
      "Batch processing enabled with max batch size:",
      this.config.batch.maxBatchSize,
    );
  }

  /**
   * Start priority-aware batch processor
   * @private
   */
  _startBatchProcessor() {
    if (this.batchProcessorInterval) {
      clearInterval(this.batchProcessorInterval);
    }

    this.batchProcessorInterval = setInterval(() => {
      if (this._hasQueuedRequests() && !this.processingBatch) {
        this._processPriorityBatches();
      }
    }, this.config.batch.batchDelay);
  }

  /**
   * Check if there are queued requests
   * @returns {boolean} Has queued requests
   * @private
   */
  _hasQueuedRequests() {
    return Object.values(this.requestQueues).some((queue) => queue.length > 0);
  }

  /**
   * Process batches by priority
   * @private
   */
  async _processPriorityBatches() {
    this.processingBatch = true;

    try {
      // Process queues by priority (emergency -> admin -> critical -> normal -> background)
      const priorityOrder = [
        "emergency",
        "admin",
        "critical",
        "normal",
        "background",
      ];

      for (const priority of priorityOrder) {
        const queue = this.requestQueues[priority];
        if (queue.length > 0) {
          await this._processPriorityQueue(priority);
          // Only process one priority level per batch cycle to maintain fairness
          break;
        }
      }
    } finally {
      this.processingBatch = false;
    }
  }

  /**
   * Process specific priority queue
   * @param {string} priority - Priority level
   * @private
   */
  async _processPriorityQueue(priority) {
    const queue = this.requestQueues[priority];
    const batchSize = Math.min(this.config.batch.maxBatchSize, queue.length);
    const batch = queue.splice(0, batchSize);

    const promises = batch.map((request) =>
      this._executeRequest(request.method, request.endpoint, request.options)
        .then((result) => request.resolve(result))
        .catch((error) => request.reject(error)),
    );

    await Promise.allSettled(promises);
  }

  // Removed: _processBatch method replaced with priority-aware processing

  /**
   * Drain request queue
   * @private
   */
  async _drainRequestQueue() {
    while (this.requestQueue.length > 0) {
      await this._processBatch();
    }
  }

  /**
   * Start cache monitoring
   * @private
   */
  _startCacheMonitoring() {
    this.cacheMonitorInterval = setInterval(() => {
      const stats = this.getCacheStats();
      if (stats.size > this.config.cache.maxEntries * 0.8) {
        this._log(
          "warn",
          `Cache size approaching limit: ${stats.size}/${this.config.cache.maxEntries}`,
        );
      }
    }, 300000); // Every 5 minutes
  }

  /**
   * Setup network status handlers
   * @private
   */
  _setupNetworkHandlers() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => {
        this.networkStatus.isOnline = true;
        this.networkStatus.lastConnectivity = Date.now();
        this._log("info", "Network connectivity restored");
      });

      window.addEventListener("offline", () => {
        this.networkStatus.isOnline = false;
        this._log("warn", "Network connectivity lost");
      });
    }
  }

  /**
   * Setup legacy ApiClient compatibility
   * @private
   */
  _setupLegacyCompatibility() {
    // Expose methods for legacy compatibility
    if (typeof window !== "undefined") {
      window.ApiService = this;

      // Create legacy ApiClient interface if it doesn't exist
      if (!window.ApiClient) {
        window.ApiClient = {
          get: (endpoint, options) =>
            this.get(endpoint, options?.params || {}, options),
          post: (endpoint, data, options) => this.post(endpoint, data, options),
          put: (endpoint, data, options) => this.put(endpoint, data, options),
          delete: (endpoint, options) => this.delete(endpoint, options),
          request: (method, endpoint, options) =>
            this._executeRequest(method, endpoint, options),
        };
      }
    }
  }

  /**
   * Update response time metrics
   * @param {number} responseTime - Response time in milliseconds
   * @private
   */
  _updateResponseTimeMetrics(responseTime) {
    this.responseTimeHistory.push({
      timestamp: Date.now(),
      responseTime,
    });

    // Keep only last 1000 entries
    if (this.responseTimeHistory.length > 1000) {
      this.responseTimeHistory.shift();
    }

    // Calculate average response time
    const sum = this.responseTimeHistory.reduce(
      (acc, entry) => acc + entry.responseTime,
      0,
    );
    this.metrics.averageResponseTime = sum / this.responseTimeHistory.length;
  }

  /**
   * Check if request should be retried
   * @param {Error} error - Request error
   * @returns {boolean} Should retry
   * @private
   */
  _shouldRetry(error) {
    // Retry on network errors and server errors (500-599)
    if (
      error.message.includes("timeout") ||
      error.message.includes("Network") ||
      (error.status >= 500 && error.status < 600)
    ) {
      return true;
    }

    return false;
  }

  /**
   * Calculate retry delay with exponential backoff
   * @param {number} attempt - Attempt number (0-based)
   * @returns {number} Delay in milliseconds
   * @private
   */
  _calculateRetryDelay(attempt) {
    return this.config.retryDelay * Math.pow(2, attempt) + Math.random() * 1000;
  }

  /**
   * Sleep for specified milliseconds
   * @param {number} ms - Milliseconds to sleep
   * @returns {Promise} Sleep promise
   * @private
   */
  _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Generate unique request ID
   * @returns {string} Request ID
   * @private
   */
  _generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Chunk array into smaller arrays
   * @param {Array} array - Array to chunk
   * @param {number} size - Chunk size
   * @returns {Array<Array>} Chunked arrays
   * @private
   */
  _chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
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
   * Setup cache cleanup interval
   * @private
   */
  _setupCacheCleanup() {
    // Cleanup will be setup when cache system is enabled
  }

  /**
   * Apply security checks to request
   * @param {Object} requestData - Request data
   * @returns {Promise<Object>} Security check result
   * @private
   */
  async _applySecurityChecks(requestData) {
    if (!this.securityService) {
      // No security service available, allow request but log warning
      this._log(
        "warn",
        "No security service available for request security checks",
      );
      return {
        allowed: true,
        warning: "Security checks bypassed - SecurityService not available",
      };
    }

    try {
      // Prepare request object for security middleware
      const request = {
        method: requestData.method,
        url: requestData.endpoint,
        headers: requestData.options.headers || {},
        body: requestData.options.body,
        userId: this._getCurrentUserId(),
        ipAddress: this._getClientIP(),
        requestId: requestData.requestId,
      };

      // Apply security middleware
      const securityResult = this.securityService.applySecurityMiddleware(
        request,
        {
          inputValidation: {
            maxLength: 50000, // Allow larger payloads for API calls
            allowHtml: false,
            encodeHtml: true,
          },
        },
      );

      // Generate CSRF token for state-changing requests if not present and needed
      if (
        this._isStateChangingRequest(requestData.method) &&
        securityResult.allowed &&
        !securityResult.csrf.token
      ) {
        const csrfToken = this.securityService.generateCSRFToken();
        if (csrfToken) {
          securityResult.csrf.token = csrfToken;
        }
      }

      return securityResult;
    } catch (error) {
      this._log("error", "Security check failed:", error);

      // In case of security service failure, allow request but log the issue
      // This prevents security service issues from breaking API functionality
      return {
        allowed: true,
        error: error.message,
        warning: "Security check failed but request allowed for availability",
      };
    }
  }

  /**
   * Get current user ID
   * @returns {string} Current user ID
   * @private
   */
  _getCurrentUserId() {
    if (window.AdminGuiService) {
      const authService = window.AdminGuiService.getService(
        "AuthenticationService",
      );
      if (authService && authService.currentUser) {
        return authService.currentUser.userId;
      }
    }

    if (
      window.AuthenticationService &&
      window.AuthenticationService.currentUser
    ) {
      return window.AuthenticationService.currentUser.userId;
    }

    return "anonymous";
  }

  /**
   * Get client IP address (placeholder - would come from server in real implementation)
   * @returns {string} Client IP address
   * @private
   */
  _getClientIP() {
    // In a real implementation, this would be provided by the server
    // For now, return a placeholder
    return "client-ip-unknown";
  }

  /**
   * Check if request method is state-changing
   * @param {string} method - HTTP method
   * @returns {boolean} Is state changing
   * @private
   */
  _isStateChangingRequest(method) {
    return ["POST", "PUT", "PATCH", "DELETE"].includes(method?.toUpperCase());
  }

  /**
   * Initialize circuit breaker
   * @private
   */
  _initializeCircuitBreaker() {
    if (this.config.circuitBreaker.enabled) {
      this.circuitBreaker = new CircuitBreaker(this.config.circuitBreaker);
      this._log(
        "info",
        "Circuit breaker initialized",
        this.config.circuitBreaker,
      );
    }
  }

  /**
   * Setup circuit breaker
   * @private
   */
  _setupCircuitBreaker() {
    // Circuit breaker is initialized in constructor, this is for additional setup
    if (this.circuitBreaker) {
      // Setup monitoring
      this.circuitBreakerMonitorInterval = setInterval(() => {
        const state = this.circuitBreaker.getState();
        if (state.state !== "CLOSED") {
          this._log("warn", "Circuit breaker state:", state);
        }
      }, 60000); // Check every minute
    }
  }

  /**
   * Initialize connection pools
   * @private
   */
  _initializeConnectionPools() {
    if (this.config.connectionPool.enabled) {
      this._log(
        "info",
        "Connection pooling initialized",
        this.config.connectionPool,
      );
    }
  }

  /**
   * Setup connection pools
   * @private
   */
  _setupConnectionPools() {
    if (this.config.connectionPool.enabled) {
      // Setup idle connection cleanup
      this.connectionCleanupInterval = setInterval(() => {
        this._cleanupIdleConnections();
      }, 30000); // Every 30 seconds
    }
  }

  /**
   * Setup memory management
   * @private
   */
  _setupMemoryManagement() {
    if (this.config.memory.enabled) {
      this._log("info", "Memory management enabled", this.config.memory);
    }
  }

  /**
   * Setup memory monitoring
   * @private
   */
  _setupMemoryMonitoring() {
    if (this.config.memory.enabled) {
      this.memoryMonitorInterval = setInterval(() => {
        this._monitorMemoryUsage();
      }, this.config.memory.monitorInterval);
    }
  }

  /**
   * Extract domain from endpoint
   * @param {string} endpoint - API endpoint
   * @returns {string} Domain
   * @private
   */
  _extractDomain(endpoint) {
    try {
      if (endpoint.startsWith("http")) {
        return new URL(endpoint).hostname;
      }
      return "localhost"; // For relative URLs
    } catch (error) {
      return "localhost";
    }
  }

  /**
   * Get connection pool for domain
   * @param {string} domain - Domain
   * @returns {Object} Connection pool
   * @private
   */
  _getConnectionPool(domain) {
    if (!this.connectionPools.has(domain)) {
      this.connectionPools.set(domain, {
        activeConnections: 0,
        queue: [],
        lastUsed: Date.now(),
        created: Date.now(),
      });
    }
    return this.connectionPools.get(domain);
  }

  /**
   * Insert request into priority queue
   * @param {Array} queue - Queue array
   * @param {Object} entry - Queue entry
   * @private
   */
  _insertIntoQueue(queue, entry) {
    // Insert based on priority (lower number = higher priority)
    let insertIndex = queue.length;
    for (let i = 0; i < queue.length; i++) {
      if (entry.priority < queue[i].priority) {
        insertIndex = i;
        break;
      }
    }
    queue.splice(insertIndex, 0, entry);
  }

  /**
   * Cleanup idle connections
   * @private
   */
  _cleanupIdleConnections() {
    const now = Date.now();
    const idleTimeout = this.config.connectionPool.idleTimeout;

    for (const [domain, pool] of this.connectionPools.entries()) {
      if (now - pool.lastUsed > idleTimeout && pool.activeConnections === 0) {
        this.connectionPools.delete(domain);
        this._log(
          "debug",
          `Cleaned up idle connection pool for domain: ${domain}`,
        );
      }
    }
  }

  /**
   * Update memory statistics
   * @private
   */
  _updateMemoryStats() {
    // Estimate current memory usage
    const cacheSize = this._estimateCacheSize();
    const queueSize = this._estimateQueueSize();
    const historySize = this._estimateHistorySize();

    this.memoryStats.currentUsageMB =
      (cacheSize + queueSize + historySize) / (1024 * 1024);
    this.memoryStats.maxUsageMB = Math.max(
      this.memoryStats.maxUsageMB,
      this.memoryStats.currentUsageMB,
    );

    this.memoryStats.objectCounts = {
      cacheEntries: this.cache.size,
      requestEntries: this._getTotalQueueSize(),
      responseHistory: this.responseTimeHistory.length,
    };
  }

  /**
   * Check memory pressure and trigger cleanup if needed
   * @private
   */
  _checkMemoryPressure() {
    const pressure = this._getMemoryPressure();

    if (pressure > 0.9) {
      this._triggerEmergencyCleanup();
    } else if (
      pressure >
      this.config.memory.gcThresholdMB / this.config.memory.maxMemoryMB
    ) {
      this._triggerGentleCleanup();
    }
  }

  /**
   * Get memory pressure (0-1)
   * @returns {number} Memory pressure
   * @private
   */
  _getMemoryPressure() {
    return this.memoryStats.currentUsageMB / this.config.memory.maxMemoryMB;
  }

  /**
   * Monitor memory usage
   * @private
   */
  _monitorMemoryUsage() {
    this._updateMemoryStats();

    const pressure = this._getMemoryPressure();
    if (pressure > 0.8) {
      this._log(
        "warn",
        `High memory usage: ${this.memoryStats.currentUsageMB.toFixed(1)}MB (${(pressure * 100).toFixed(1)}%)`,
      );
    }
  }

  /**
   * Trigger emergency cleanup
   * @private
   */
  _triggerEmergencyCleanup() {
    this._log("warn", "Triggering emergency memory cleanup");

    // Aggressive cache cleanup
    const cacheSize = this.cache.size;
    const toEvict = Math.floor(cacheSize * 0.5); // Remove 50%

    for (let i = 0; i < toEvict; i++) {
      this._evictLeastRecentlyUsed();
    }

    // Trim history
    this.responseTimeHistory.splice(
      0,
      Math.floor(this.responseTimeHistory.length * 0.5),
    );
    this.errorHistory.splice(0, Math.floor(this.errorHistory.length * 0.5));

    // Clear old pending requests
    this._clearExpiredPendingRequests();

    this.memoryStats.gcTriggers++;
    this.memoryStats.lastGC = Date.now();

    this._updateMemoryStats();
    this._log(
      "info",
      `Emergency cleanup completed. New usage: ${this.memoryStats.currentUsageMB.toFixed(1)}MB`,
    );
  }

  /**
   * Trigger gentle cleanup
   * @private
   */
  _triggerGentleCleanup() {
    // Less aggressive cleanup
    this._cleanupExpiredCache();

    // Trim history to reasonable size
    if (this.responseTimeHistory.length > 500) {
      this.responseTimeHistory.splice(0, 100);
    }
    if (this.errorHistory.length > 100) {
      this.errorHistory.splice(0, 20);
    }

    this.memoryStats.gcTriggers++;
    this.memoryStats.lastGC = Date.now();
  }

  /**
   * Estimate cache size in bytes
   * @returns {number} Size in bytes
   * @private
   */
  _estimateCacheSize() {
    let totalSize = 0;
    for (const [key, entry] of this.cache.entries()) {
      totalSize += key.length * 2; // Key size
      totalSize += this._estimateEntrySize(entry); // Entry size
      totalSize += 200; // Overhead
    }
    return totalSize;
  }

  /**
   * Estimate queue size in bytes
   * @returns {number} Size in bytes
   * @private
   */
  _estimateQueueSize() {
    let totalSize = 0;

    // Request queues
    for (const queue of Object.values(this.requestQueues)) {
      totalSize += queue.length * 1000; // Rough estimate per request
    }

    // Pending requests
    totalSize += this.pendingRequests.size * 500;

    return totalSize;
  }

  /**
   * Estimate history size in bytes
   * @returns {number} Size in bytes
   * @private
   */
  _estimateHistorySize() {
    return (
      this.responseTimeHistory.length * 50 + this.errorHistory.length * 200
    );
  }

  /**
   * Get total queue size
   * @returns {number} Total queued requests
   * @private
   */
  _getTotalQueueSize() {
    return Object.values(this.requestQueues).reduce(
      (sum, queue) => sum + queue.length,
      0,
    );
  }

  /**
   * Clear expired pending requests
   * @private
   */
  _clearExpiredPendingRequests() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute

    for (const [key, promise] of this.pendingRequests.entries()) {
      if (now - promise.timestamp > maxAge) {
        this.pendingRequests.delete(key);
      }
    }
  }

  /**
   * Warmup critical cache endpoints
   * @private
   */
  _warmupCriticalEndpoints() {
    const criticalEndpoints = this.config.cache.warmupEndpoints || [];

    criticalEndpoints.forEach(async (endpoint) => {
      try {
        await this.get(
          endpoint,
          {},
          { priority: "background", bypassCache: false },
        );
        this._log("debug", `Warmed up cache for endpoint: ${endpoint}`);
      } catch (error) {
        this._log(
          "warn",
          `Failed to warm up endpoint ${endpoint}:`,
          error.message,
        );
      }
    });
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
      this.logger[level](`[ApiService] ${message}`, data);
    } else {
      // Fallback to console
      console[level](`[ApiService] ${message}`, data || "");
    }
  }
}

// Global service instance and initialization
window.ApiService = null;

/**
 * Initialize ApiService
 * @param {ApiServiceConfig} config - Configuration options
 * @returns {Promise<ApiService>} Initialized ApiService instance
 */
async function initializeApiService(config = {}) {
  try {
    if (window.ApiService) {
      console.warn("ApiService already initialized");
      return window.ApiService;
    }

    const service = new ApiService();
    await service.initialize(config);
    await service.start();

    window.ApiService = service;

    console.log("🚀 ApiService initialized successfully");
    console.log("📊 Configuration:", service.config);
    console.log("💾 Cache enabled:", service.config.cache.enabled);
    console.log("📦 Batch processing enabled:", service.config.batch.enabled);

    return service;
  } catch (error) {
    console.error("❌ Failed to initialize ApiService:", error);
    throw error;
  }
}

// Export for different module systems
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    ApiService,
    initializeApiService,
    CacheEntry,
    RequestEntry,
  };
}

if (typeof define === "function" && define.amd) {
  define([], function () {
    return { ApiService, initializeApiService, CacheEntry, RequestEntry };
  });
}

if (typeof window !== "undefined") {
  window.ApiService = ApiService;
  window.initializeApiService = initializeApiService;
  window.CacheEntry = CacheEntry;
  window.RequestEntry = RequestEntry;
}
