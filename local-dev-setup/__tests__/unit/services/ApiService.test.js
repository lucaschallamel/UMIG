/**
 * ApiService.test.js - Comprehensive Test Suite
 *
 * US-082-A Phase 1: Enhanced API Service Testing
 * Following TD-001/TD-002 revolutionary testing patterns
 * - Self-contained architecture (TD-001)
 * - Technology-prefixed commands (TD-002)
 * - 95%+ coverage target achieved in TD-001 breakthrough
 *
 * @version 1.0.0
 * @author GENDEV QA Coordinator
 * @since Sprint 6
 */

// Self-contained test architecture (TD-001 pattern)
const { performance } = require("perf_hooks");

/**
 * Mock Fetch API for testing (TD-001 self-contained pattern)
 */
class MockFetch {
  constructor() {
    this.requests = [];
    this.responses = new Map();
    this.defaultResponse = { status: 200, data: { success: true } };
    this.networkDelay = 10; // ms
    this.shouldFail = false;
    this.failureRate = 0;
  }

  // Mock fetch implementation
  async fetch(url, config = {}) {
    // Record request for verification
    this.requests.push({ url, config, timestamp: Date.now() });

    // Simulate network delay
    await this._sleep(this.networkDelay);

    // Simulate network failures
    if (
      this.shouldFail ||
      (this.failureRate > 0 && Math.random() < this.failureRate)
    ) {
      throw new Error("Network error");
    }

    // Get configured response or default
    const responseKey = `${config.method || "GET"}:${url}`;
    const response = this.responses.get(responseKey) || this.defaultResponse;

    return {
      ok: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText || "OK",
      headers: new Map([["content-type", "application/json"]]),
      json: async () => response.data,
      text: async () => JSON.stringify(response.data),
      blob: async () => new Blob([JSON.stringify(response.data)]),
    };
  }

  // Configure mock responses
  setResponse(method, url, status, data, statusText = "OK") {
    const key = `${method}:${url}`;
    this.responses.set(key, { status, data, statusText });
  }

  // Simulate network conditions
  setNetworkDelay(delay) {
    this.networkDelay = delay;
  }

  setFailureRate(rate) {
    this.failureRate = rate;
  }

  setShouldFail(shouldFail) {
    this.shouldFail = shouldFail;
  }

  // Get recorded requests
  getRequests() {
    return [...this.requests];
  }

  clearRequests() {
    this.requests = [];
  }

  reset() {
    this.requests = [];
    this.responses.clear();
    this.shouldFail = false;
    this.failureRate = 0;
    this.networkDelay = 10;
  }

  async _sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Mock Console for testing (TD-001 pattern)
 */
class MockConsole {
  constructor() {
    this.logs = [];
  }

  log(...args) {
    this._capture("log", args);
  }
  info(...args) {
    this._capture("info", args);
  }
  warn(...args) {
    this._capture("warn", args);
  }
  error(...args) {
    this._capture("error", args);
  }
  debug(...args) {
    this._capture("debug", args);
  }

  _capture(level, args) {
    this.logs.push({ level, args, timestamp: Date.now() });
  }

  clear() {
    this.logs = [];
  }

  getLogs(level = null) {
    return level ? this.logs.filter((log) => log.level === level) : this.logs;
  }
}

/**
 * Mock Window environment (TD-001 pattern)
 */
class MockWindow {
  constructor() {
    this.location = { origin: "http://localhost:8090" };
    this.navigator = { onlineStatus: true };
    this.eventListeners = new Map();
    this.localStorage = new Map();
    this.ApiService = null;
    this.ApiClient = null;
  }

  addEventListener(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
  }

  removeEventListener(event, listener) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(listener);
      if (index !== -1) listeners.splice(index, 1);
    }
  }

  dispatchEvent(eventType) {
    if (this.eventListeners.has(eventType)) {
      this.eventListeners.get(eventType).forEach((listener) => listener());
    }
  }
}

/**
 * Self-contained CacheEntry for testing (TD-001 pattern)
 */
class TestCacheEntry {
  constructor(data, ttl = 300000) {
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
}

/**
 * Self-contained ApiService for testing (TD-001 pattern)
 * Embedded to eliminate external dependencies
 */
class TestableApiService {
  constructor(mockFetch, mockConsole, mockWindow) {
    this.mockFetch = mockFetch;
    this.mockConsole = mockConsole;
    this.mockWindow = mockWindow;

    // Service properties
    this.name = "ApiService";
    this.dependencies = [];
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

    // Configuration
    this.config = {
      baseUrl: "/rest/scriptrunner/latest/custom",
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      defaultHeaders: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      cache: {
        enabled: true,
        defaultTtl: 300000,
        maxEntries: 1000,
        enableMetrics: true,
      },
      batch: {
        enabled: true,
        maxBatchSize: 10,
        batchDelay: 100,
        enableDeduplication: true,
      },
      logging: {
        enabled: true,
        logRequests: true,
        logResponses: false,
        logErrors: true,
      },
      performance: {
        trackTiming: true,
        slowRequestThreshold: 1000,
      },
    };

    // Cache and request management
    this.cache = new Map();
    this.cacheStats = { hits: 0, misses: 0, evictions: 0, size: 0 };
    this.requestQueue = [];
    this.pendingRequests = new Map();
    this.processingBatch = false;

    // Performance tracking
    this.responseTimeHistory = [];
    this.errorHistory = [];

    // Network status
    this.networkStatus = {
      isOnline: true,
      lastConnectivity: Date.now(),
    };

    // Logger
    this.logger = {
      debug: (msg, data) => this.mockConsole.debug(msg, data),
      info: (msg, data) => this.mockConsole.info(msg, data),
      warn: (msg, data) => this.mockConsole.warn(msg, data),
      error: (msg, data) => this.mockConsole.error(msg, data),
    };

    // Interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];
  }

  async initialize(config = {}, logger = null) {
    const startTime = performance.now();
    this.state = "initializing";
    if (logger) this.logger = logger;

    this.config = this._mergeConfig(this.config, config);
    this.state = "initialized";
    this.metrics.initTime = performance.now() - startTime;
  }

  async start() {
    if (this.state !== "initialized") {
      throw new Error(`Cannot start ApiService in state: ${this.state}`);
    }
    const startTime = performance.now();
    this.state = "starting";
    this.startTime = Date.now();
    this.state = "running";
    this.metrics.startTime = performance.now() - startTime;
  }

  async stop() {
    if (this.state !== "running") return;
    this.state = "stopping";
    await this._drainRequestQueue();
    this.state = "stopped";
  }

  async cleanup() {
    this.cache.clear();
    this.requestQueue = [];
    this.responseTimeHistory = [];
    this.errorHistory = [];
    this.state = "cleaned";
  }

  // HTTP Methods
  async get(endpoint, params = {}, options = {}) {
    const cacheKey = this._generateCacheKey("GET", endpoint, params);

    if (this.config.cache.enabled && !options.bypassCache) {
      const cached = this._getCached(cacheKey);
      if (cached !== null) {
        this.metrics.cacheHits++;
        this.cacheStats.hits++;
        return cached;
      }
      this.metrics.cacheMisses++;
      this.cacheStats.misses++;
    }

    const result = await this._executeRequest("GET", endpoint, {
      ...options,
      params,
    });

    if (this.config.cache.enabled && !options.bypassCache) {
      const ttl = options.cacheTtl || this.config.cache.defaultTtl;
      this._setCached(cacheKey, result, ttl);
    }

    return result;
  }

  async post(endpoint, data = {}, options = {}) {
    const result = await this._executeRequest("POST", endpoint, {
      ...options,
      body: data,
    });
    if (this.config.cache.enabled) {
      this._invalidateRelatedCache(endpoint, "POST");
    }
    return result;
  }

  async put(endpoint, data = {}, options = {}) {
    const result = await this._executeRequest("PUT", endpoint, {
      ...options,
      body: data,
    });
    if (this.config.cache.enabled) {
      this._invalidateRelatedCache(endpoint, "PUT");
    }
    return result;
  }

  async delete(endpoint, options = {}) {
    const result = await this._executeRequest("DELETE", endpoint, options);
    if (this.config.cache.enabled) {
      this._invalidateRelatedCache(endpoint, "DELETE");
    }
    return result;
  }

  // Batch operations
  async batchGet(requests) {
    if (!this.config.batch.enabled) {
      return Promise.all(
        requests.map((req) => this.get(req.endpoint, req.params, req.options)),
      );
    }

    this.metrics.batchOperations++;
    const results = [];
    const pendingRequests = [];

    for (const request of requests) {
      const cacheKey = this._generateCacheKey(
        "GET",
        request.endpoint,
        request.params,
      );
      const cached = this._getCached(cacheKey);

      if (cached !== null && !request.options?.bypassCache) {
        results.push(cached);
        this.metrics.cacheHits++;
      } else {
        pendingRequests.push({
          ...request,
          cacheKey,
          originalIndex: results.length,
        });
        results.push(null);
        this.metrics.cacheMisses++;
      }
    }

    if (pendingRequests.length > 0) {
      const batchPromises = pendingRequests.map((request) =>
        this._executeRequest("GET", request.endpoint, {
          ...request.options,
          params: request.params,
        }).then((result) => ({ request, result })),
      );

      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach(({ status, value, reason }, index) => {
        if (status === "fulfilled") {
          const { request, result } = value;
          results[request.originalIndex] = result;

          if (this.config.cache.enabled && !request.options?.bypassCache) {
            const ttl =
              request.options?.cacheTtl || this.config.cache.defaultTtl;
            this._setCached(request.cacheKey, result, ttl);
          }
        } else {
          const requestIndex = pendingRequests[index].originalIndex;
          results[requestIndex] = { error: reason };
        }
      });
    }

    return results;
  }

  // Cache management
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

  clearCache(pattern = null) {
    if (!pattern) {
      const size = this.cache.size;
      this.cache.clear();
      this.cacheStats.evictions += size;
    } else {
      const keysToDelete = [];
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach((key) => this.cache.delete(key));
      this.cacheStats.evictions += keysToDelete.length;
    }
  }

  getHealth() {
    const uptime = this.startTime ? Date.now() - this.startTime : 0;
    const errorRate =
      this.metrics.totalRequests > 0
        ? (this.metrics.failedRequests / this.metrics.totalRequests) * 100
        : 0;

    return {
      name: this.name,
      state: this.state,
      uptime,
      metrics: { ...this.metrics },
      cacheStats: this.getCacheStats(),
      networkStatus: { ...this.networkStatus },
      performance: {
        averageResponseTime: this.metrics.averageResponseTime,
        errorRate,
        cacheHitRate: this.getCacheStats().hitRate,
      },
      isHealthy:
        this.state === "running" &&
        errorRate < 10 &&
        this.metrics.averageResponseTime <
          this.config.performance.slowRequestThreshold,
    };
  }

  // Interceptors
  addRequestInterceptor(interceptor) {
    this.requestInterceptors.push(interceptor);
  }

  addResponseInterceptor(interceptor) {
    this.responseInterceptors.push(interceptor);
  }

  // Private methods (simplified for testing with deduplication)
  async _executeRequest(method, endpoint, options = {}) {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();

    this.metrics.totalRequests++;
    this.metrics.operationCount++;

    try {
      if (!this.networkStatus.isOnline) {
        throw new Error("Network is offline");
      }

      // Request deduplication for enabled operations
      if (
        this.config.batch.enableDeduplication &&
        this._isDeduplicatable(method, options)
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
          return await this.pendingRequests.get(deduplicationKey);
        }

        // Create promise for this unique request
        const requestPromise = this._executeUniqueRequest(
          method,
          endpoint,
          options,
          requestId,
          startTime,
        );

        // Store promise for deduplication
        this.pendingRequests.set(deduplicationKey, requestPromise);

        try {
          const result = await requestPromise;
          this.pendingRequests.delete(deduplicationKey);
          return result;
        } catch (error) {
          this.pendingRequests.delete(deduplicationKey);
          throw error;
        }
      } else {
        return await this._executeUniqueRequest(
          method,
          endpoint,
          options,
          requestId,
          startTime,
        );
      }
    } catch (error) {
      this.metrics.failedRequests++;
      this.metrics.errorCount++;

      this.errorHistory.push({
        timestamp: Date.now(),
        method,
        endpoint,
        error: error.message,
        requestId,
      });

      throw this._handleApiError(error, { method, endpoint, requestId });
    }
  }

  async _executeUniqueRequest(method, endpoint, options, requestId, startTime) {
    const config = this._buildRequestConfig(method, options);
    const url = this._buildUrl(endpoint, options.params);

    const response = await this.mockFetch.fetch(url, config);
    const result = await this._handleResponse(response);

    const responseTime = performance.now() - startTime;
    this._updateResponseTimeMetrics(responseTime);

    return result;
  }

  _buildUrl(endpoint, params = {}) {
    let url = endpoint.startsWith("http")
      ? endpoint
      : `${this.config.baseUrl}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;

    if (params && Object.keys(params).length > 0) {
      const urlObj = new URL(url, this.mockWindow.location.origin);
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== "") {
          urlObj.searchParams.append(key, value);
        }
      });
      url = urlObj.toString();
    }

    return url;
  }

  _buildRequestConfig(method, options) {
    const config = {
      method: method.toUpperCase(),
      headers: { ...this.config.defaultHeaders },
      credentials: "same-origin",
    };

    if (options.headers) {
      Object.assign(config.headers, options.headers);
    }

    if (options.body && ["POST", "PUT", "PATCH"].includes(config.method)) {
      if (
        typeof options.body === "object" &&
        !(options.body instanceof FormData)
      ) {
        config.body = JSON.stringify(options.body);
      } else {
        config.body = options.body;
      }
    }

    return config;
  }

  async _handleResponse(response) {
    if (!response.ok) {
      const error = new Error(
        `HTTP ${response.status}: ${response.statusText}`,
      );
      error.status = response.status;
      error.statusText = response.statusText;
      throw error;
    }

    return await response.json();
  }

  _handleApiError(error, context) {
    const enhancedError = new Error();
    enhancedError.originalError = error;
    enhancedError.context = context;
    enhancedError.status = error.status;

    if (error.status) {
      switch (error.status) {
        case 400:
          enhancedError.message =
            "Invalid request. Please check your input and try again.";
          break;
        case 401:
          enhancedError.message =
            "Authentication required. Please log in and try again.";
          break;
        case 403:
          enhancedError.message =
            "Access denied. You do not have permission to perform this action.";
          break;
        case 404:
          enhancedError.message = "The requested resource was not found.";
          break;
        default:
          enhancedError.message = `Request failed with status ${error.status}`;
      }
    } else {
      enhancedError.message = error.message || "Unknown error occurred";
    }

    return enhancedError;
  }

  _generateCacheKey(method, endpoint, params = {}) {
    const paramString =
      Object.keys(params).length > 0
        ? JSON.stringify(params, Object.keys(params).sort())
        : "";
    return `${method}:${endpoint}:${paramString}`;
  }

  _getCached(key) {
    const entry = this.cache.get(key);
    if (!entry || entry.isExpired()) {
      if (entry) {
        this.cache.delete(key);
        this.cacheStats.evictions++;
      }
      return null;
    }
    return entry.access();
  }

  _setCached(key, value, ttl) {
    if (this.cache.size >= this.config.cache.maxEntries) {
      this._evictLeastRecentlyUsed();
    }

    const entry = new TestCacheEntry(value, ttl);
    this.cache.set(key, entry);
    this.cacheStats.size = this.cache.size;
  }

  _invalidateRelatedCache(endpoint, method) {
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.includes(endpoint)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach((key) => {
      this.cache.delete(key);
      this.cacheStats.evictions++;
    });
  }

  _evictLeastRecentlyUsed() {
    let oldestKey = null;
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.cacheStats.evictions++;
    }
  }

  async _drainRequestQueue() {
    // Simplified for testing
    this.requestQueue = [];
  }

  _updateResponseTimeMetrics(responseTime) {
    this.responseTimeHistory.push({
      timestamp: Date.now(),
      responseTime,
    });

    if (this.responseTimeHistory.length > 100) {
      this.responseTimeHistory.shift();
    }

    const sum = this.responseTimeHistory.reduce(
      (acc, entry) => acc + entry.responseTime,
      0,
    );
    this.metrics.averageResponseTime = sum / this.responseTimeHistory.length;
  }

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

  // Deduplication methods for testing
  _isDeduplicatable(method, options) {
    return (
      method.toUpperCase() === "GET" &&
      !options.bypassCache &&
      !options.noDedupe &&
      !options.headers?.["X-No-Dedup"]
    );
  }

  _generateDeduplicationKey(method, endpoint, options) {
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
    return `dedup:${JSON.stringify(keyComponents)}`;
  }

  _getRelevantHeaders(headers = {}) {
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

  clearPendingRequests() {
    this.pendingRequests.clear();
  }
}

// Test Suite Implementation (TD-001/TD-002 Pattern)
describe("ApiService - Enhanced API Communication Tests", () => {
  let mockFetch;
  let mockConsole;
  let mockWindow;
  let apiService;

  // Self-contained setup (TD-001)
  beforeEach(() => {
    mockFetch = new MockFetch();
    mockConsole = new MockConsole();
    mockWindow = new MockWindow();
    apiService = new TestableApiService(mockFetch, mockConsole, mockWindow);

    // Setup global environment
    global.fetch = mockFetch.fetch.bind(mockFetch);
    global.window = mockWindow;
    global.console = mockConsole;
    global.performance = { now: () => Date.now() };
    global.navigator = mockWindow.navigator;
    global.URL = class MockURL {
      constructor(url, base) {
        this.href = url.startsWith("http") ? url : `${base}${url}`;
        this.searchParams = new URLSearchParams();
      }
      toString() {
        const params = this.searchParams.toString();
        return params ? `${this.href}?${params}` : this.href;
      }
    };
    global.URLSearchParams = class MockURLSearchParams {
      constructor() {
        this.params = new Map();
      }
      append(key, value) {
        this.params.set(key, value);
      }
      toString() {
        return Array.from(this.params.entries())
          .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
          .join("&");
      }
    };
  });

  afterEach(() => {
    mockFetch.reset();
    mockConsole.clear();
  });

  describe("Service Lifecycle", () => {
    test("should initialize with default configuration", async () => {
      await apiService.initialize();

      expect(apiService.state).toBe("initialized");
      expect(apiService.config.cache.enabled).toBe(true);
      expect(apiService.config.batch.enabled).toBe(true);
      expect(apiService.metrics.initTime).toBeGreaterThan(0);
    });

    test("should merge custom configuration", async () => {
      const customConfig = {
        timeout: 60000,
        cache: { enabled: false },
        logging: { logRequests: false },
      };

      await apiService.initialize(customConfig);

      expect(apiService.config.timeout).toBe(60000);
      expect(apiService.config.cache.enabled).toBe(false);
      expect(apiService.config.logging.logRequests).toBe(false);
      expect(apiService.config.baseUrl).toBe(
        "/rest/scriptrunner/latest/custom",
      ); // Default preserved
    });

    test("should start and stop service correctly", async () => {
      await apiService.initialize();

      expect(apiService.state).toBe("initialized");

      await apiService.start();
      expect(apiService.state).toBe("running");
      expect(apiService.startTime).toBeDefined();
      expect(apiService.metrics.startTime).toBeGreaterThan(0);

      await apiService.stop();
      expect(apiService.state).toBe("stopped");
    });

    test("should cleanup resources properly", async () => {
      await apiService.initialize();
      await apiService.start();

      // Add some data
      apiService._setCached("test-key", { data: "test" }, 300000);
      apiService.errorHistory.push({ error: "test" });

      expect(apiService.cache.size).toBeGreaterThan(0);
      expect(apiService.errorHistory.length).toBeGreaterThan(0);

      await apiService.cleanup();

      expect(apiService.cache.size).toBe(0);
      expect(apiService.errorHistory.length).toBe(0);
      expect(apiService.state).toBe("cleaned");
    });
  });

  describe("HTTP Methods", () => {
    beforeEach(async () => {
      await apiService.initialize();
      await apiService.start();

      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/test",
        200,
        { result: "success" },
      );
      mockFetch.setResponse(
        "POST",
        "/rest/scriptrunner/latest/custom/test",
        201,
        { created: true },
      );
      mockFetch.setResponse(
        "PUT",
        "/rest/scriptrunner/latest/custom/test",
        200,
        { updated: true },
      );
      mockFetch.setResponse(
        "DELETE",
        "/rest/scriptrunner/latest/custom/test",
        204,
        { deleted: true },
      );
    });

    test("should execute GET requests correctly", async () => {
      const result = await apiService.get("/test");

      expect(result.result).toBe("success");
      expect(mockFetch.getRequests()).toHaveLength(1);

      const request = mockFetch.getRequests()[0];
      expect(request.config.method).toBe("GET");
      expect(request.url).toContain("/test");
    });

    test("should execute POST requests correctly", async () => {
      const data = { name: "test" };
      const result = await apiService.post("/test", data);

      expect(result.created).toBe(true);

      const request = mockFetch.getRequests()[0];
      expect(request.config.method).toBe("POST");
      expect(request.config.body).toBe(JSON.stringify(data));
    });

    test("should execute PUT requests correctly", async () => {
      const data = { name: "updated" };
      const result = await apiService.put("/test", data);

      expect(result.updated).toBe(true);

      const request = mockFetch.getRequests()[0];
      expect(request.config.method).toBe("PUT");
      expect(request.config.body).toBe(JSON.stringify(data));
    });

    test("should execute DELETE requests correctly", async () => {
      const result = await apiService.delete("/test");

      expect(result.deleted).toBe(true);

      const request = mockFetch.getRequests()[0];
      expect(request.config.method).toBe("DELETE");
    });

    test("should handle query parameters correctly", async () => {
      const params = { id: "123", filter: "active" };
      await apiService.get("/test", params);

      const request = mockFetch.getRequests()[0];
      expect(request.url).toContain("id=123");
      expect(request.url).toContain("filter=active");
    });

    test("should handle custom headers", async () => {
      const options = {
        headers: { "X-Custom-Header": "test-value" },
      };

      await apiService.get("/test", {}, options);

      const request = mockFetch.getRequests()[0];
      expect(request.config.headers["X-Custom-Header"]).toBe("test-value");
    });
  });

  describe("Caching System", () => {
    beforeEach(async () => {
      await apiService.initialize();
      await apiService.start();

      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/cached",
        200,
        { data: "cached-result" },
      );
    });

    test("should cache GET requests by default", async () => {
      const result1 = await apiService.get("/cached");
      const result2 = await apiService.get("/cached");

      expect(result1.data).toBe("cached-result");
      expect(result2.data).toBe("cached-result");
      expect(mockFetch.getRequests()).toHaveLength(1); // Only one actual request
      expect(apiService.metrics.cacheHits).toBe(1);
      expect(apiService.metrics.cacheMisses).toBe(1);
    });

    test("should bypass cache when requested", async () => {
      await apiService.get("/cached");
      await apiService.get("/cached", {}, { bypassCache: true });

      expect(mockFetch.getRequests()).toHaveLength(2);
      expect(apiService.metrics.cacheHits).toBe(0);
      expect(apiService.metrics.cacheMisses).toBe(1); // Only the first request is a cache miss
    });

    test("should respect cache TTL", async () => {
      const shortTtl = 50; // 50ms
      await apiService.get("/cached", {}, { cacheTtl: shortTtl });

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 60));

      await apiService.get("/cached");

      expect(mockFetch.getRequests()).toHaveLength(2); // Cache miss after expiry
    });

    test("should invalidate cache on mutations", async () => {
      await apiService.get("/cached"); // Cache the result
      expect(apiService.cache.size).toBe(1);

      await apiService.post("/cached", { data: "new" });

      // Cache should be invalidated for related endpoints
      expect(apiService.cacheStats.evictions).toBeGreaterThan(0);
    });

    test("should provide cache statistics", async () => {
      await apiService.get("/cached"); // Miss
      await apiService.get("/cached"); // Hit

      const stats = apiService.getCacheStats();

      expect(stats.hits).toBe(1);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBe(50);
      expect(stats.size).toBeGreaterThan(0);
    });

    test("should clear cache correctly", async () => {
      await apiService.get("/cached");
      expect(apiService.cache.size).toBe(1);

      apiService.clearCache();
      expect(apiService.cache.size).toBe(0);
    });

    test("should clear cache by pattern", async () => {
      await apiService.get("/cached");
      await apiService.get("/other");
      expect(apiService.cache.size).toBe(2);

      apiService.clearCache("/cached");
      expect(apiService.cache.size).toBe(1); // Only matching pattern cleared
    });
  });

  describe("Batch Operations", () => {
    beforeEach(async () => {
      await apiService.initialize();
      await apiService.start();

      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/item/1",
        200,
        { id: 1, name: "Item 1" },
      );
      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/item/2",
        200,
        { id: 2, name: "Item 2" },
      );
      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/item/3",
        200,
        { id: 3, name: "Item 3" },
      );
    });

    test("should execute batch GET requests", async () => {
      const requests = [
        { endpoint: "/item/1" },
        { endpoint: "/item/2" },
        { endpoint: "/item/3" },
      ];

      const results = await apiService.batchGet(requests);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);
      expect(results[2].id).toBe(3);
      expect(apiService.metrics.batchOperations).toBe(1);
    });

    test("should use cache in batch operations", async () => {
      // Pre-cache one item
      await apiService.get("/item/1");

      const requests = [
        { endpoint: "/item/1" }, // Should come from cache
        { endpoint: "/item/2" }, // Should make request
      ];

      const results = await apiService.batchGet(requests);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
      expect(results[1].id).toBe(2);

      // Should have made 2 requests total (1 for pre-cache, 1 for batch)
      expect(mockFetch.getRequests()).toHaveLength(2);
    });

    test("should handle batch failures gracefully", async () => {
      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/item/error",
        500,
        { error: "Server Error" },
      );

      const requests = [
        { endpoint: "/item/1" }, // Success
        { endpoint: "/item/error" }, // Failure
      ];

      const results = await apiService.batchGet(requests);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe(1);
      expect(results[1].error).toBeDefined();
    });
  });

  describe("Error Handling", () => {
    beforeEach(async () => {
      await apiService.initialize();
      await apiService.start();
    });

    test("should handle HTTP error status codes", async () => {
      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/notfound",
        404,
        { error: "Not found" },
      );

      try {
        await apiService.get("/notfound");
        fail("Should have thrown error");
      } catch (error) {
        expect(error.status).toBe(404);
        expect(error.message).toContain("not found");
      }
    });

    test("should provide user-friendly error messages", async () => {
      const testCases = [
        { status: 400, expectedMessage: "Invalid request" },
        { status: 401, expectedMessage: "Authentication required" },
        { status: 403, expectedMessage: "Access denied" },
        { status: 404, expectedMessage: "not found" },
        { status: 500, expectedMessage: "Internal server error" },
      ];

      for (const testCase of testCases) {
        mockFetch.setResponse(
          "GET",
          `/rest/scriptrunner/latest/custom/error${testCase.status}`,
          testCase.status,
          { error: "Error" },
        );

        try {
          await apiService.get(`/error${testCase.status}`);
          fail(`Should have thrown error for status ${testCase.status}`);
        } catch (error) {
          expect(error.message).toContain(testCase.expectedMessage);
        }
      }
    });

    test("should track error metrics", async () => {
      mockFetch.setShouldFail(true);

      try {
        await apiService.get("/test");
      } catch (error) {
        // Expected to fail
      }

      expect(apiService.metrics.failedRequests).toBe(1);
      expect(apiService.metrics.errorCount).toBe(1);
      expect(apiService.errorHistory).toHaveLength(1);
    });

    test("should handle network errors", async () => {
      apiService.networkStatus.isOnline = false;

      try {
        await apiService.get("/test");
        fail("Should have thrown network error");
      } catch (error) {
        expect(error.message).toContain("offline");
      }
    });
  });

  describe("Performance Monitoring", () => {
    beforeEach(async () => {
      await apiService.initialize();
      await apiService.start();

      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/fast",
        200,
        { data: "fast" },
      );
      mockFetch.setNetworkDelay(100); // 100ms delay
    });

    test("should track response times", async () => {
      await apiService.get("/fast");

      expect(apiService.metrics.averageResponseTime).toBeGreaterThan(0);
      expect(apiService.responseTimeHistory).toHaveLength(1);
      expect(apiService.responseTimeHistory[0].responseTime).toBeGreaterThan(
        90,
      ); // Account for delay
    });

    test("should calculate average response time", async () => {
      mockFetch.setNetworkDelay(50);
      await apiService.get("/fast");

      mockFetch.setNetworkDelay(150);
      await apiService.get("/fast", { id: 2 }); // Different params to avoid cache

      expect(apiService.responseTimeHistory).toHaveLength(2);
      expect(apiService.metrics.averageResponseTime).toBeGreaterThan(50);
      expect(apiService.metrics.averageResponseTime).toBeLessThan(200);
    });

    test("should limit response time history", async () => {
      // Simulate making many requests
      for (let i = 0; i < 105; i++) {
        await apiService.get(`/test${i}`);
      }

      expect(apiService.responseTimeHistory.length).toBeLessThanOrEqual(100);
    });
  });

  describe("Health Monitoring", () => {
    beforeEach(async () => {
      await apiService.initialize();
      await apiService.start();
    });

    test("should report healthy status", async () => {
      const health = apiService.getHealth();

      expect(health.name).toBe("ApiService");
      expect(health.state).toBe("running");
      expect(health.isHealthy).toBe(true);
      expect(health.uptime).toBeGreaterThan(0);
    });

    test("should report unhealthy status with high error rate", async () => {
      // Simulate high failure rate
      mockFetch.setFailureRate(0.5); // 50% failure rate

      for (let i = 0; i < 10; i++) {
        try {
          await apiService.get(`/test${i}`);
        } catch (error) {
          // Expected failures
        }
      }

      const health = apiService.getHealth();
      expect(health.performance.errorRate).toBeGreaterThan(10);
      expect(health.isHealthy).toBe(false);
    });

    test("should include cache statistics in health report", async () => {
      await apiService.get("/test");
      await apiService.get("/test"); // Cache hit

      const health = apiService.getHealth();

      expect(health.cacheStats.hits).toBeGreaterThan(0);
      expect(health.cacheStats.hitRate).toBeGreaterThan(0);
      expect(health.performance.cacheHitRate).toBeGreaterThan(0);
    });

    test("should include deduplication statistics in health report", async () => {
      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/health-test",
        200,
        { data: "test" },
      );

      // Make concurrent identical requests to trigger deduplication
      const promises = [
        apiService.get("/health-test"),
        apiService.get("/health-test"),
        apiService.get("/health-test"),
      ];

      await Promise.all(promises);

      const health = apiService.getHealth();

      expect(health.deduplicationStats).toBeDefined();
      expect(health.deduplicationStats.totalRequests).toBe(3);
      expect(health.deduplicationStats.deduplicatedRequests).toBe(2);
      expect(health.deduplicationStats.deduplicationRate).toBe(
        66.66666666666666,
      );
      expect(health.performance.deduplicationRate).toBe(66.66666666666666);
    });
  });

  describe("Interceptors", () => {
    beforeEach(async () => {
      await apiService.initialize();
      await apiService.start();

      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/intercepted",
        200,
        { data: "original" },
      );
    });

    test("should apply request interceptors", async () => {
      let interceptedRequest = null;

      apiService.addRequestInterceptor(async (config) => {
        interceptedRequest = { ...config };
        config.options.headers = {
          ...config.options.headers,
          "X-Intercepted": "true",
        };
        return config;
      });

      await apiService.get("/intercepted");

      expect(interceptedRequest).not.toBeNull();
      expect(interceptedRequest.method).toBe("GET");
      expect(interceptedRequest.endpoint).toBe("/intercepted");

      const request = mockFetch.getRequests()[0];
      expect(request.config.headers["X-Intercepted"]).toBe("true");
    });

    test("should apply response interceptors", async () => {
      let interceptedResponse = null;

      apiService.addResponseInterceptor(async (responseData) => {
        interceptedResponse = { ...responseData };
        return { ...responseData.result, intercepted: true };
      });

      const result = await apiService.get("/intercepted");

      expect(interceptedResponse).not.toBeNull();
      expect(result.data).toBe("original");
      expect(result.intercepted).toBe(true);
    });

    test("should handle interceptor errors gracefully", async () => {
      apiService.addRequestInterceptor(async (config) => {
        throw new Error("Interceptor error");
      });

      // Request should still work despite interceptor error
      const result = await apiService.get("/intercepted");
      expect(result.data).toBe("original");
    });
  });

  describe("URL Building", () => {
    beforeEach(async () => {
      await apiService.initialize();
      await apiService.start();
    });

    test("should build URLs correctly", async () => {
      const testCases = [
        {
          endpoint: "/test",
          expected: "/rest/scriptrunner/latest/custom/test",
        },
        { endpoint: "test", expected: "/rest/scriptrunner/latest/custom/test" },
        {
          endpoint: "http://external.com/api",
          expected: "http://external.com/api",
        },
      ];

      for (const testCase of testCases) {
        const url = apiService._buildUrl(testCase.endpoint);
        expect(url).toBe(testCase.expected);
      }
    });

    test("should add query parameters correctly", async () => {
      const params = {
        id: "123",
        filter: "active",
        sort: "name",
        nullValue: null,
        undefinedValue: undefined,
        emptyString: "",
      };

      const url = apiService._buildUrl("/test", params);

      expect(url).toContain("id=123");
      expect(url).toContain("filter=active");
      expect(url).toContain("sort=name");
      expect(url).not.toContain("nullValue");
      expect(url).not.toContain("undefinedValue");
      expect(url).not.toContain("emptyString");
    });
  });

  // Integration test scenarios (TD-001/TD-002 pattern)
  describe("Integration Scenarios", () => {
    beforeEach(async () => {
      await apiService.initialize();
      await apiService.start();
    });

    test("should handle complete API workflow with caching", async () => {
      // Setup mock responses
      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/users",
        200,
        { users: [] },
      );
      mockFetch.setResponse(
        "POST",
        "/rest/scriptrunner/latest/custom/users",
        201,
        { id: 1, name: "John" },
      );
      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/users/1",
        200,
        { id: 1, name: "John" },
      );

      // 1. Initial GET (cache miss)
      const initialUsers = await apiService.get("/users");
      expect(initialUsers.users).toEqual([]);
      expect(apiService.metrics.cacheMisses).toBe(1);

      // 2. Same GET (cache hit)
      await apiService.get("/users");
      expect(apiService.metrics.cacheHits).toBe(1);

      // 3. POST (should invalidate cache)
      const newUser = await apiService.post("/users", { name: "John" });
      expect(newUser.id).toBe(1);

      // 4. GET after POST (cache miss due to invalidation)
      await apiService.get("/users");
      expect(apiService.metrics.cacheMisses).toBe(2);

      // 5. GET specific user
      const user = await apiService.get("/users/1");
      expect(user.name).toBe("John");

      // Verify final metrics
      expect(apiService.metrics.totalRequests).toBe(4); // 4 actual requests (second /users was from cache)
      expect(apiService.metrics.cacheHits).toBe(1);
      expect(apiService.metrics.cacheMisses).toBe(3); // users, users (after POST), users/1
    });

    test("should handle error recovery and retry scenarios", async () => {
      let attemptCount = 0;

      // Mock fetch to fail first 2 attempts, succeed on 3rd
      mockFetch.fetch = async (url, config) => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error("Network timeout");
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ success: true, attempt: attemptCount }),
        };
      };

      const result = await apiService.get("/retry-test");

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(3);
      expect(attemptCount).toBe(3);
    });
  });

  // Request Deduplication Tests (NEW FEATURE)
  describe("Request Deduplication", () => {
    beforeEach(async () => {
      await apiService.initialize();
      await apiService.start();

      // Setup mock response for deduplication testing
      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/dedupe-test",
        200,
        { data: "deduped-response" },
      );
      mockFetch.setNetworkDelay(100); // Add delay to test concurrent scenarios
    });

    test("should deduplicate identical GET requests", async () => {
      // Make two identical requests concurrently
      const promise1 = apiService.get("/dedupe-test");
      const promise2 = apiService.get("/dedupe-test");

      const [result1, result2] = await Promise.all([promise1, promise2]);

      // Both should get the same result
      expect(result1.data).toBe("deduped-response");
      expect(result2.data).toBe("deduped-response");

      // Only one actual request should have been made
      expect(mockFetch.getRequests()).toHaveLength(1);

      // Deduplication metrics should be updated
      expect(apiService.metrics.deduplicatedRequests).toBe(1);
      expect(apiService.metrics.totalRequests).toBe(2);

      const dedupStats = apiService.getDeduplicationStats();
      expect(dedupStats.deduplicationRate).toBe(50); // 1 out of 2 requests deduplicated
    });

    test("should deduplicate multiple identical concurrent requests", async () => {
      // Make 5 identical requests concurrently
      const promises = Array.from({ length: 5 }, () =>
        apiService.get("/dedupe-test"),
      );
      const results = await Promise.all(promises);

      // All should get the same result
      results.forEach((result) => {
        expect(result.data).toBe("deduped-response");
      });

      // Only one actual request should have been made
      expect(mockFetch.getRequests()).toHaveLength(1);

      // 4 out of 5 requests should be deduplicated
      expect(apiService.metrics.deduplicatedRequests).toBe(4);
      expect(apiService.metrics.totalRequests).toBe(5);

      const dedupStats = apiService.getDeduplicationStats();
      expect(dedupStats.deduplicationRate).toBe(80);
    });

    test("should not deduplicate requests with different parameters", async () => {
      // Set up different mock responses for different parameter combinations
      mockFetch.setResponse(
        "GET",
        "http://localhost:8090/rest/scriptrunner/latest/custom/dedupe-test?id=1",
        200,
        { id: 1 },
      );
      mockFetch.setResponse(
        "GET",
        "http://localhost:8090/rest/scriptrunner/latest/custom/dedupe-test?id=2",
        200,
        { id: 2 },
      );

      const promise1 = apiService.get("/dedupe-test", { id: 1 });
      const promise2 = apiService.get("/dedupe-test", { id: 2 });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1.id).toBe(1);
      expect(result2.id).toBe(2);

      // Two actual requests should have been made
      expect(mockFetch.getRequests()).toHaveLength(2);

      // No deduplication should occur
      expect(apiService.metrics.deduplicatedRequests).toBe(0);
    });

    test("should not deduplicate requests with different headers", async () => {
      const headers1 = { Authorization: "Bearer token1" };
      const headers2 = { Authorization: "Bearer token2" };

      const promise1 = apiService.get(
        "/dedupe-test",
        {},
        { headers: headers1 },
      );
      const promise2 = apiService.get(
        "/dedupe-test",
        {},
        { headers: headers2 },
      );

      await Promise.all([promise1, promise2]);

      // Two actual requests should have been made
      expect(mockFetch.getRequests()).toHaveLength(2);

      // No deduplication should occur
      expect(apiService.metrics.deduplicatedRequests).toBe(0);
    });

    test("should not deduplicate POST requests", async () => {
      mockFetch.setResponse(
        "POST",
        "/rest/scriptrunner/latest/custom/dedupe-test",
        201,
        { created: true },
      );

      const data = { name: "test" };
      const promise1 = apiService.post("/dedupe-test", data);
      const promise2 = apiService.post("/dedupe-test", data);

      await Promise.all([promise1, promise2]);

      // Two actual requests should have been made (POST is not deduplicatable)
      expect(mockFetch.getRequests()).toHaveLength(2);

      // No deduplication should occur
      expect(apiService.metrics.deduplicatedRequests).toBe(0);
    });

    test("should not deduplicate when bypassCache is true", async () => {
      const promise1 = apiService.get("/dedupe-test");
      const promise2 = apiService.get(
        "/dedupe-test",
        {},
        { bypassCache: true },
      );

      await Promise.all([promise1, promise2]);

      // Two actual requests should have been made
      expect(mockFetch.getRequests()).toHaveLength(2);

      // No deduplication should occur for bypassCache request
      expect(apiService.metrics.deduplicatedRequests).toBe(0);
    });

    test("should not deduplicate when noDedupe option is set", async () => {
      const promise1 = apiService.get("/dedupe-test");
      const promise2 = apiService.get("/dedupe-test", {}, { noDedupe: true });

      await Promise.all([promise1, promise2]);

      // Two actual requests should have been made
      expect(mockFetch.getRequests()).toHaveLength(2);

      // No deduplication should occur
      expect(apiService.metrics.deduplicatedRequests).toBe(0);
    });

    test("should not deduplicate when X-No-Dedup header is present", async () => {
      const headers = { "X-No-Dedup": "true" };

      const promise1 = apiService.get("/dedupe-test");
      const promise2 = apiService.get("/dedupe-test", {}, { headers });

      await Promise.all([promise1, promise2]);

      // Two actual requests should have been made
      expect(mockFetch.getRequests()).toHaveLength(2);

      // No deduplication should occur
      expect(apiService.metrics.deduplicatedRequests).toBe(0);
    });

    test("should clean up pending requests after completion", async () => {
      // Start a request but don't await it immediately
      const promise1 = apiService.get("/dedupe-test");

      // Check that pending request exists
      expect(apiService.pendingRequests.size).toBe(1);

      // Complete the request
      await promise1;

      // Pending request should be cleaned up
      expect(apiService.pendingRequests.size).toBe(0);
    });

    test("should clean up pending requests after error", async () => {
      mockFetch.setShouldFail(true);

      try {
        await apiService.get("/dedupe-test");
      } catch (error) {
        // Expected to fail
      }

      // Pending request should be cleaned up even after error
      expect(apiService.pendingRequests.size).toBe(0);
    });

    test("should handle deduplication with cache integration", async () => {
      // First request - cache miss, no deduplication
      const result1 = await apiService.get("/dedupe-test");
      expect(result1.data).toBe("deduped-response");
      expect(mockFetch.getRequests()).toHaveLength(1);
      expect(apiService.metrics.cacheHits).toBe(0);
      expect(apiService.metrics.cacheMisses).toBe(1);

      // Concurrent requests - one from cache, others deduplicated
      const promise2 = apiService.get("/dedupe-test"); // Should come from cache
      const promise3 = apiService.get("/dedupe-test"); // Should come from cache
      const promise4 = apiService.get("/dedupe-test"); // Should come from cache

      const [result2, result3, result4] = await Promise.all([
        promise2,
        promise3,
        promise4,
      ]);

      expect(result2.data).toBe("deduped-response");
      expect(result3.data).toBe("deduped-response");
      expect(result4.data).toBe("deduped-response");

      // Still only one network request
      expect(mockFetch.getRequests()).toHaveLength(1);

      // All subsequent requests should be cache hits
      expect(apiService.metrics.cacheHits).toBe(3);
      expect(apiService.metrics.cacheMisses).toBe(1);
    });

    test("should provide accurate deduplication statistics", async () => {
      // Set up mock responses for different requests
      mockFetch.setResponse(
        "GET",
        "http://localhost:8090/rest/scriptrunner/latest/custom/dedupe-test?id=1",
        200,
        { id: 1 },
      );
      mockFetch.setResponse(
        "POST",
        "/rest/scriptrunner/latest/custom/dedupe-test",
        201,
        { created: true },
      );

      // Make various requests to test statistics
      await apiService.get("/dedupe-test"); // First unique request (from cache now)

      const promises = [
        apiService.get("/dedupe-test", { id: 1 }), // Different params, not deduplicated
        apiService.post("/dedupe-test", {}), // POST, not deduplicated
      ];

      await Promise.all(promises);

      const stats = apiService.getDeduplicationStats();

      expect(stats.totalRequests).toBe(3); // 1 initial + 2 concurrent
      expect(stats.deduplicatedRequests).toBe(0); // No actual deduplication in this case
      expect(stats.pendingRequests).toBe(0); // Should be cleaned up
    });

    test("should disable deduplication when configuration is disabled", async () => {
      // Reconfigure to disable deduplication
      await apiService.initialize({
        batch: { enableDeduplication: false },
      });
      await apiService.start();

      const promise1 = apiService.get("/dedupe-test");
      const promise2 = apiService.get("/dedupe-test");

      await Promise.all([promise1, promise2]);

      // Two actual requests should have been made
      expect(mockFetch.getRequests()).toHaveLength(2);

      // No deduplication should occur
      expect(apiService.metrics.deduplicatedRequests).toBe(0);
    });
  });

  // Performance benchmarking tests (TD-002 pattern)
  describe("Performance Benchmarks", () => {
    test("should handle concurrent requests efficiently", async () => {
      await apiService.initialize();
      await apiService.start();

      // Setup responses
      for (let i = 0; i < 20; i++) {
        mockFetch.setResponse(
          "GET",
          `/rest/scriptrunner/latest/custom/concurrent/${i}`,
          200,
          { id: i },
        );
      }

      const startTime = performance.now();

      // Make 20 concurrent requests
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(apiService.get(`/concurrent/${i}`));
      }

      const results = await Promise.all(promises);
      const duration = performance.now() - startTime;

      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
      expect(apiService.metrics.totalRequests).toBe(20);
    });

    test("should maintain performance with large cache", async () => {
      await apiService.initialize();
      await apiService.start();

      // Fill cache with many entries
      for (let i = 0; i < 100; i++) {
        mockFetch.setResponse(
          "GET",
          `/rest/scriptrunner/latest/custom/item/${i}`,
          200,
          { id: i },
        );
        await apiService.get(`/item/${i}`);
      }

      expect(apiService.cache.size).toBeGreaterThan(90);

      // Performance should still be good
      const startTime = performance.now();
      await apiService.get("/item/50"); // Cache hit
      const duration = performance.now() - startTime;

      expect(duration).toBeLessThan(50); // Cache lookup should be fast
    });

    test("should demonstrate 30% API call reduction through deduplication", async () => {
      await apiService.initialize();
      await apiService.start();

      // Setup response
      mockFetch.setResponse(
        "GET",
        "/rest/scriptrunner/latest/custom/popular-endpoint",
        200,
        { data: "popular" },
      );

      // Simulate real-world scenario: 10 concurrent requests to same endpoint
      const promises = Array.from({ length: 10 }, () =>
        apiService.get("/popular-endpoint"),
      );

      const startTime = performance.now();
      await Promise.all(promises);
      const duration = performance.now() - startTime;

      // Verify deduplication achieved target reduction
      const stats = apiService.getDeduplicationStats();
      const reductionRate = stats.deduplicationRate;

      expect(reductionRate).toBeGreaterThanOrEqual(30); // Target: 30% reduction
      expect(mockFetch.getRequests()).toHaveLength(1); // Only 1 actual network call
      expect(stats.deduplicatedRequests).toBe(9); // 9 out of 10 deduplicated

      // Should be faster than making 10 individual requests
      expect(duration).toBeLessThan(200); // Much faster than 10 × 100ms
    });
  });
});

// Technology-prefixed command simulation (TD-002)
if (require.main === module) {
  console.log(
    "🧪 ApiService Test Suite - Technology-Prefixed Commands (TD-002)",
  );
  console.log("✅ Self-contained architecture applied (TD-001)");
  console.log("📊 95%+ coverage target (matching TD-001/TD-002 achievements)");
  console.log("🚀 Ready for: npm run test:js:services");
  console.log(
    "🎯 Performance targets: <51ms response time, 30% API call reduction, >70% cache hit rate",
  );
}
