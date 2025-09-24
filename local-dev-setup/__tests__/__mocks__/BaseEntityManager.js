/**
 * Enhanced Mock BaseEntityManager for Unit Testing - US-082-C Enhanced Mock
 *
 * Provides comprehensive mock implementation with configurable responses,
 * error simulation, performance tracking, and enterprise-grade testing support.
 *
 * Features:
 * - Configurable API response scenarios
 * - Error simulation and circuit breaker testing
 * - Performance measurement simulation
 * - Concurrent operation support
 * - Enhanced ComponentOrchestrator mocking
 * - Security validation simulation
 *
 * @version 2.0.0 Enhanced
 * @created 2025-01-16 (US-082-C Enhanced Testing Infrastructure)
 */

export class BaseEntityManager {
  /**
   * Enhanced mock constructor for BaseEntityManager
   * @param {Object} config - Configuration object
   */
  constructor(config = {}) {
    // Basic configuration setup
    this.entityType = config.entityType || "mock-entity";
    // Convert entityType to camelCase for API endpoint (e.g., "iteration-types" -> "iterationTypes")
    const apiEndpointName =
      config.apiEndpointName ||
      this._convertToApiEndpointName(config.entityType || "mockEntity");
    this.apiEndpoint =
      config.apiEndpoint ||
      `/rest/scriptrunner/latest/custom/${apiEndpointName}`;
    this.config = {
      ...this._getDefaultConfig(),
      ...config,
    };

    // Mock component references
    this.orchestrator = null;
    this.tableComponent = null;
    this.modalComponent = null;
    this.filterComponent = null;
    this.paginationComponent = null;

    // Mock state management
    this.currentData = [];
    this.currentFilters = {};
    this.currentSort = null;
    this.currentPage = 1;
    this.totalRecords = 0;

    // Mock security and performance tracking with enhanced capabilities
    this.securityContext = null;
    this.auditLogger = null;
    this.performanceTracker = {
      track: jest.fn((operation, duration) => {
        // Simulate realistic performance tracking
        console.log(`[MockPerformanceTracker] ${operation}: ${duration}ms`);
      }),
      getMetrics: jest.fn().mockReturnValue({
        load: { avg: 125.5, count: 10 },
        create: { avg: 87.3, count: 5 },
        update: { avg: 95.1, count: 3 },
        delete: { avg: 42.8, count: 2 },
      }),
      reset: jest.fn(),
    };
    this.migrationMode = null;

    // Enhanced mock configuration for testing scenarios
    this.mockConfig = {
      enableErrorSimulation: config.enableErrorSimulation || false,
      errorScenarios: config.errorScenarios || {},
      performanceLatency: config.performanceLatency || 50,
      concurrentOperationSupport: config.concurrentOperationSupport !== false,
      apiResponseMode: config.apiResponseMode || "success", // success, error, mixed
      circuitBreakerSimulation: config.circuitBreakerSimulation || false,
    };

    // Mock error tracking and circuit breaker
    this.errorBoundary = new Map();
    this.circuitBreaker = new Map();
    this.requestCount = 0;
    this.errorCount = 0;

    // Mock methods that would be called by constructor
    this._initializeSecurityContext();
  }

  /**
   * Convert kebab-case entityType to camelCase for API endpoints
   * @param {string} entityType - The entity type in kebab-case (e.g., "iteration-types")
   * @returns {string} The API endpoint name in camelCase (e.g., "iterationTypes")
   */
  _convertToApiEndpointName(entityType) {
    return entityType.replace(/-([a-z])/g, (match, letter) =>
      letter.toUpperCase(),
    );
  }

  /**
   * Enhanced mock initialize method with comprehensive ComponentOrchestrator simulation
   * @param {HTMLElement|Object} container - DOM container or mock
   * @param {Object} options - Initialization options
   * @returns {Promise<void>}
   */
  async initialize(container, options = {}) {
    if (!container) {
      throw new Error("Container is required for initialization");
    }

    // Enhanced orchestrator mock with lifecycle management
    this.orchestrator = {
      initialize: jest.fn().mockResolvedValue(true),
      registerComponent: jest
        .fn()
        .mockImplementation((componentType, instance) => {
          console.log(
            `[MockOrchestrator] Registering ${componentType} component`,
          );
          return Promise.resolve(true);
        }),
      showNotification: jest
        .fn()
        .mockImplementation((type, message, options = {}) => {
          console.log(`[MockOrchestrator] Notification: ${type} - ${message}`);
          return Promise.resolve();
        }),
      destroy: jest.fn().mockImplementation(() => {
        console.log(`[MockOrchestrator] Destroying orchestrator`);
      }),
      getComponent: jest.fn().mockImplementation((componentType) => {
        return {
          render: jest.fn().mockImplementation(() => {
            console.log(`[MockComponent] Rendering ${componentType}`);
            return Promise.resolve();
          }),
          update: jest.fn().mockImplementation((data) => {
            console.log(
              `[MockComponent] Updating ${componentType} with data:`,
              data,
            );
            return Promise.resolve();
          }),
          destroy: jest.fn().mockImplementation(() => {
            console.log(`[MockComponent] Destroying ${componentType}`);
          }),
          mount: jest.fn().mockResolvedValue(true),
          unmount: jest.fn().mockResolvedValue(true),
          refresh: jest.fn().mockResolvedValue(true),
        };
      }),
      // Enhanced orchestrator methods for comprehensive testing
      isInitialized: jest.fn().mockReturnValue(true),
      getRegisteredComponents: jest.fn().mockReturnValue([]),
      clearNotifications: jest.fn(),
      setTheme: jest.fn(),
      getPerformanceMetrics: jest.fn().mockReturnValue({}),
    };

    // Store container reference
    this.container = container;

    // Mock component initialization with error handling
    try {
      await this._initializeComponents();
      this._setupEventListeners();
      this._initializeSecurityMonitoring();

      console.log(
        `[MockBaseEntityManager] Successfully initialized ${this.entityType}`,
      );
    } catch (error) {
      console.error(
        `[MockBaseEntityManager] Initialization failed for ${this.entityType}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Enhanced mock data loading method with realistic API simulation
   * @param {Object} filters - Filter parameters
   * @param {Object} sort - Sort parameters
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Promise<Object>} Mock data response
   */
  async loadData(filters = {}, sort = null, page = 1, pageSize = 20) {
    const startTime = performance.now();

    try {
      // Simulate API latency
      await this._simulateLatency();

      // Check for error simulation
      if (
        this.mockConfig.enableErrorSimulation &&
        this.mockConfig.apiResponseMode === "error"
      ) {
        throw new Error("Simulated API error");
      }

      // Track performance for testing with realistic duration
      const duration = performance.now() - startTime;
      if (this.performanceTracker) {
        this.performanceTracker.track("load", duration);
      }

      // Build query parameters URL string for testing verification
      const queryParams = new URLSearchParams();
      queryParams.set("page", page.toString());
      queryParams.set("size", pageSize.toString());

      if (filters.includeInactive) {
        queryParams.set("includeInactive", "true");
      }

      if (sort) {
        queryParams.set("sort", sort.field);
        queryParams.set("direction", sort.direction);
      }

      // Simulate call to global.fetch if available for URL verification
      if (global.fetch && typeof global.fetch === "function") {
        const testUrl = `${this.apiEndpoint || "/api/test"}?${queryParams.toString()}`;
        return await global
          .fetch(testUrl, { method: "GET" })
          .then((response) => response.json())
          .catch(() => this._getFallbackData(page, pageSize));
      }

      // Return mock data structure with realistic data
      return this._getFallbackData(page, pageSize);
    } catch (error) {
      // Track error
      this._trackError("loadData", error);

      // For testing, still return a valid structure
      return {
        data: [],
        total: 0,
        page: page,
        pageSize: pageSize,
        totalPages: 0,
      };
    }
  }

  /**
   * Get fallback mock data for testing
   * @param {number} page - Page number
   * @param {number} pageSize - Page size
   * @returns {Object} Fallback data structure
   * @private
   */
  _getFallbackData(page, pageSize) {
    // Return consistent mock data for testing
    const mockData =
      this.currentData.length > 0
        ? this.currentData
        : [
            {
              itt_id: 1,
              itt_code: "RUN",
              itt_name: "Production Run",
              itt_description: "Standard production execution",
              itt_color: "#28A745",
              itt_icon: "play-circle",
              itt_display_order: 1,
              itt_active: true,
              created_by: "system",
              created_at: "2024-01-15T10:30:00Z",
            },
          ];

    return {
      data: mockData,
      total: mockData.length,
      page: page,
      pageSize: pageSize,
      totalPages: Math.ceil(mockData.length / pageSize),
    };
  }

  /**
   * Simulate API latency for realistic testing
   * @returns {Promise<void>}
   * @private
   */
  async _simulateLatency() {
    const latency = this.mockConfig.performanceLatency;
    if (latency > 0) {
      await new Promise((resolve) => setTimeout(resolve, latency));
    }
  }

  /**
   * Mock create method
   * @param {Object} data - Entity data to create
   * @returns {Promise<Object>} Created entity
   */
  async create(data) {
    // Basic validation simulation
    if (!data) {
      throw new Error("Invalid data provided");
    }

    // Track performance for testing
    if (this.performanceTracker) {
      this.performanceTracker.track("create", Math.random() * 150);
    }

    // Return mock created entity
    return {
      id: Math.floor(Math.random() * 1000),
      ...data,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Mock update method
   * @param {string|number} id - Entity identifier
   * @param {Object} data - Update data
   * @returns {Promise<Object>} Updated entity
   */
  async update(id, data) {
    // Basic validation simulation
    if (!id || !data) {
      throw new Error("Invalid parameters provided");
    }

    // Track performance for testing
    if (this.performanceTracker) {
      this.performanceTracker.track("update", Math.random() * 120);
    }

    // Return mock updated entity
    return {
      id: id,
      ...data,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * Mock delete method
   * @param {string|number} id - Entity identifier
   * @returns {Promise<boolean>} Success indicator
   */
  async delete(id) {
    // Basic validation simulation
    if (!id) {
      throw new Error("Invalid identifier provided");
    }

    // Track performance for testing
    if (this.performanceTracker) {
      this.performanceTracker.track("delete", Math.random() * 80);
    }

    return true;
  }

  /**
   * Mock render method
   * @returns {void}
   */
  render() {
    // Mock rendering implementation
    console.log(`[MockBaseEntityManager] Rendering ${this.entityType}`);
  }

  /**
   * Mock destroy method
   * @returns {void}
   */
  destroy() {
    // Mock cleanup
    if (this.orchestrator) {
      this.orchestrator.destroy();
    }
    console.log(`[MockBaseEntityManager] Destroyed ${this.entityType}`);
  }

  // Protected mock methods that would be called internally

  /**
   * Get default configuration for mock
   * @returns {Object} Default config
   */
  _getDefaultConfig() {
    return {
      performanceTracking: true,
      securityLevel: "standard",
      auditMode: false,
      cacheEnabled: false,
    };
  }

  /**
   * Mock security context initialization
   */
  _initializeSecurityContext() {
    this.securityContext = {
      userId: "test-user",
      permissions: ["read", "write", "delete"],
      sessionId: "mock-session",
    };
  }

  /**
   * Mock performance tracking initialization
   * @returns {Promise<void>}
   */
  async _initializePerformanceTracking() {
    // Mock implementation - already set in constructor
  }

  /**
   * Mock migration mode check
   * @returns {Promise<void>}
   */
  async _checkMigrationMode() {
    this.migrationMode = "new"; // Default for testing
  }

  /**
   * Mock component initialization
   * @returns {Promise<void>}
   */
  async _initializeComponents() {
    // Mock component setup
    this.tableComponent = { render: jest.fn(), update: jest.fn() };
    this.modalComponent = {
      render: jest.fn(),
      show: jest.fn(),
      hide: jest.fn(),
    };
    this.filterComponent = { render: jest.fn(), getFilters: jest.fn() };
    this.paginationComponent = { render: jest.fn(), update: jest.fn() };
  }

  /**
   * Mock event listener setup
   */
  _setupEventListeners() {
    // Mock event handling
    console.log(
      `[MockBaseEntityManager] Event listeners set up for ${this.entityType}`,
    );
  }

  /**
   * Mock security monitoring initialization
   */
  _initializeSecurityMonitoring() {
    // Mock security setup
    console.log(
      `[MockBaseEntityManager] Security monitoring initialized for ${this.entityType}`,
    );
  }

  /**
   * Enhanced error tracking with circuit breaker support
   * @param {string} operation - Operation name
   * @param {Error} error - Error object
   */
  _trackError(operation, error) {
    const currentCount = this.errorBoundary.get(operation) || 0;
    this.errorBoundary.set(operation, currentCount + 1);
    console.error(`[MockBaseEntityManager] Error in ${operation}:`, error);
  }

  /**
   * Mock performance tracking
   * @param {string} operation - Operation name
   * @param {number} duration - Duration in ms
   */
  _trackPerformance(operation, duration) {
    if (this.performanceTracker) {
      this.performanceTracker.track(operation, duration);
    }
  }

  /**
   * Enhanced API request method with comprehensive error simulation and circuit breaker
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise<Object>} Enhanced mock response
   */
  async _makeApiRequest(method, url, options = {}) {
    const operationKey = `${method}_${url}`;
    this.requestCount++;

    try {
      // Circuit breaker simulation
      if (
        this.mockConfig.circuitBreakerSimulation &&
        this.circuitBreaker.has(operationKey)
      ) {
        const breaker = this.circuitBreaker.get(operationKey);
        if (
          breaker.state === "OPEN" &&
          Date.now() - breaker.lastFailure < 60000
        ) {
          throw new Error(`Circuit breaker OPEN for ${operationKey}`);
        }
      }

      // Error simulation based on configuration
      if (this.mockConfig.enableErrorSimulation) {
        const shouldError = this._shouldSimulateError(method, url);
        if (shouldError) {
          this.errorCount++;
          this._trackError(operationKey, new Error("Simulated network error"));
          throw new Error("Simulated network error");
        }
      }

      // Simulate latency
      await this._simulateLatency();

      // Use global fetch if available, otherwise provide sophisticated mock
      if (global.fetch && typeof global.fetch === "function") {
        const response = await global.fetch(url, {
          method,
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            ...options.headers,
          },
          ...options,
        });

        // Reset circuit breaker on success
        if (this.circuitBreaker.has(operationKey)) {
          this.circuitBreaker.delete(operationKey);
        }

        return response;
      }

      // Sophisticated fallback mock response
      return this._createMockResponse(method, url, options);
    } catch (error) {
      // Track error and update circuit breaker
      this._trackError(operationKey, error);

      const errorCount = this.errorBoundary.get(operationKey) || 0;
      if (errorCount >= 3 && this.mockConfig.circuitBreakerSimulation) {
        this.circuitBreaker.set(operationKey, {
          state: "OPEN",
          lastFailure: Date.now(),
        });
      }

      throw error;
    }
  }

  /**
   * Determine if we should simulate an error for testing
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @returns {boolean} Should simulate error
   * @private
   */
  _shouldSimulateError(method, url) {
    // Error rate simulation (10% error rate for testing)
    if (this.mockConfig.apiResponseMode === "error") {
      return true;
    }

    if (this.mockConfig.apiResponseMode === "mixed") {
      return Math.random() < 0.1; // 10% error rate
    }

    // Check specific error scenarios
    const scenarios = this.mockConfig.errorScenarios;
    if (scenarios[method] && scenarios[method].includes(url)) {
      return true;
    }

    return false;
  }

  /**
   * Create sophisticated mock response
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Object} Mock response
   * @private
   */
  _createMockResponse(method, url, options) {
    const response = {
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve(this._getMockResponseData(method, url, options)),
    };

    // Simulate different HTTP status codes based on scenarios
    if (this.mockConfig.apiResponseMode === "error") {
      response.ok = false;
      response.status = 500;
      response.json = () => Promise.resolve({ error: "Internal server error" });
    }

    return response;
  }

  /**
   * Get mock response data based on method and URL
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Object} Mock data
   * @private
   */
  _getMockResponseData(method, url, options) {
    switch (method) {
      case "GET":
        if (url.includes("stats=true")) {
          return [
            {
              itt_code: "RUN",
              itt_name: "Production Run",
              iteration_count: 25,
              step_count: 150,
            },
          ];
        }
        return this._getFallbackData(1, 20);

      case "POST":
        const postBody = options.body ? JSON.parse(options.body) : {};
        return {
          itt_id: Math.floor(Math.random() * 1000) + 100,
          ...postBody,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

      case "PUT":
        const putBody = options.body ? JSON.parse(options.body) : {};
        return {
          itt_id: 1,
          itt_code: url.split("/").pop(),
          ...putBody,
          updated_at: new Date().toISOString(),
        };

      case "DELETE":
        return { success: true };

      default:
        return { success: true, data: [] };
    }
  }
}

// Export as default for CommonJS compatibility
export default BaseEntityManager;
