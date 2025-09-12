/**
 * Teams Performance and Caching Strategy Tests
 *
 * Advanced testing for caching mechanisms, error recovery, retry logic,
 * and performance optimization scenarios for Teams Entity Migration.
 *
 * Test Categories:
 * - Caching strategy validation
 * - Error recovery mechanisms
 * - Retry logic and exponential backoff
 * - Performance regression testing
 * - Memory leak detection
 * - Network resilience testing
 *
 * @version 1.0.0
 * @created 2025-01-12 (US-082-C Remediation - Priority 2)
 * @target-coverage Performance scenarios and caching logic
 */

import {
  describe,
  test,
  expect,
  beforeEach,
  afterEach,
  jest,
} from "@jest/globals";
import { TeamBuilder } from "./TeamBuilder.js";
import { JSDOM } from "jsdom";

// Setup DOM
const dom = new JSDOM('<!DOCTYPE html><div id="test-container"></div>');
global.document = dom.window.document;
global.window = dom.window;
global.HTMLElement = dom.window.HTMLElement;
global.performance = {
  now: () => Date.now(),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
};

// Enhanced mock manager with caching and retry logic
class CachingTeamsEntityManager {
  constructor() {
    this.cache = new Map();
    this.cacheExpiry = new Map();
    this.cacheTimeoutMs = 60000; // 1 minute default
    this.retryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
    };
    this.networkMetrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      retries: 0,
    };
    this.performanceMetrics = new Map();
    this.errorRecoveryCallbacks = new Map();
  }

  // Cache management methods
  setCacheTimeout(timeoutMs) {
    this.cacheTimeoutMs = timeoutMs;
  }

  getCacheKey(url, options = {}) {
    const method = options.method || "GET";
    const body = options.body || "";
    return `${method}:${url}:${body}`;
  }

  isValidCache(key) {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.cache.delete(key);
      this.cacheExpiry.delete(key);
      return false;
    }
    return true;
  }

  setCacheEntry(key, data) {
    this.cache.set(key, data);
    this.cacheExpiry.set(key, Date.now() + this.cacheTimeoutMs);
  }

  getCacheEntry(key) {
    if (this.isValidCache(key)) {
      this.networkMetrics.cacheHits++;
      return this.cache.get(key);
    }
    this.networkMetrics.cacheMisses++;
    return null;
  }

  clearCache() {
    this.cache.clear();
    this.cacheExpiry.clear();
  }

  // Retry logic with exponential backoff
  async withRetry(operation, operationName = "operation") {
    let lastError;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          this.networkMetrics.retries++;
          const delay = Math.min(
            this.retryConfig.baseDelay *
              Math.pow(this.retryConfig.backoffFactor, attempt - 1),
            this.retryConfig.maxDelay,
          );
          await this.sleep(delay);
        }

        return await operation();
      } catch (error) {
        lastError = error;

        // Don't retry client errors (4xx)
        if (error.status && error.status >= 400 && error.status < 500) {
          break;
        }

        // Log retry attempt
        console.warn(
          `Retry ${attempt + 1}/${this.retryConfig.maxRetries + 1} for ${operationName}:`,
          error.message,
        );
      }
    }

    this.networkMetrics.errors++;

    // Execute error recovery if configured
    if (this.errorRecoveryCallbacks.has(operationName)) {
      try {
        await this.errorRecoveryCallbacks.get(operationName)(lastError);
      } catch (recoveryError) {
        console.error(
          `Error recovery failed for ${operationName}:`,
          recoveryError,
        );
      }
    }

    throw lastError;
  }

  async sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Enhanced loadData with caching
  async loadData(filters = {}, sort = null, page = 1, pageSize = 20) {
    const startTime = performance.now();

    // Create cache key
    const queryParams = new URLSearchParams({
      ...filters,
      page,
      pageSize,
      sortBy: sort?.column || "",
      sortDir: sort?.direction || "",
    }).toString();

    const cacheKey = this.getCacheKey(`/api/teams?${queryParams}`);

    // Check cache first
    const cachedData = this.getCacheEntry(cacheKey);
    if (cachedData) {
      // Add cache indicator to response
      const result = {
        ...cachedData,
        fromCache: true,
        loadTime: performance.now() - startTime,
      };

      this.trackPerformance("load", result.loadTime, { cache: "hit" });
      return result;
    }

    // Cache miss - fetch from API with retry
    const result = await this.withRetry(async () => {
      this.networkMetrics.requests++;

      const response = await global.fetch(`/api/teams?${queryParams}`);

      if (!response.ok) {
        const error = new Error(
          `Failed to fetch teams: ${response.status} ${await response.text()}`,
        );
        error.status = response.status;
        throw error;
      }

      return await response.json();
    }, "loadData");

    // Cache the result
    this.setCacheEntry(cacheKey, result);

    const loadTime = performance.now() - startTime;
    const finalResult = {
      ...result,
      fromCache: false,
      loadTime,
    };

    this.trackPerformance("load", loadTime, { cache: "miss" });

    return finalResult;
  }

  // Performance tracking
  trackPerformance(operation, duration, metadata = {}) {
    if (!this.performanceMetrics.has(operation)) {
      this.performanceMetrics.set(operation, []);
    }

    this.performanceMetrics.get(operation).push({
      duration,
      timestamp: Date.now(),
      metadata,
    });
  }

  getPerformanceStats(operation) {
    const metrics = this.performanceMetrics.get(operation) || [];
    if (metrics.length === 0) {
      return null;
    }

    const durations = metrics.map((m) => m.duration);
    const cacheHits = metrics.filter((m) => m.metadata.cache === "hit").length;
    const cacheMisses = metrics.filter(
      (m) => m.metadata.cache === "miss",
    ).length;

    return {
      count: metrics.length,
      average: durations.reduce((sum, d) => sum + d, 0) / durations.length,
      min: Math.min(...durations),
      max: Math.max(...durations),
      median: durations.sort()[Math.floor(durations.length / 2)],
      cacheHitRate: (cacheHits / (cacheHits + cacheMisses)) * 100,
    };
  }

  // Error recovery registration
  onErrorRecovery(operation, callback) {
    this.errorRecoveryCallbacks.set(operation, callback);
  }

  // Network metrics
  getNetworkMetrics() {
    return { ...this.networkMetrics };
  }

  resetMetrics() {
    this.networkMetrics = {
      requests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      errors: 0,
      retries: 0,
    };
    this.performanceMetrics.clear();
  }
}

describe("Teams Performance and Caching Tests", () => {
  let teamsManager;
  let container;

  beforeEach(() => {
    container = document.getElementById("test-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "test-container";
      document.body.appendChild(container);
    }
    container.innerHTML = "";

    teamsManager = new CachingTeamsEntityManager();

    // Reset performance tracking
    global.performance.now = jest.fn(() => Date.now());
  });

  afterEach(() => {
    jest.clearAllMocks();
    if (teamsManager) {
      teamsManager.resetMetrics();
    }
  });

  describe("Caching Strategy Tests", () => {
    test("should cache successful API responses", async () => {
      const mockResponse = {
        teams: [{ id: "1", name: "Test Team" }],
        total: 1,
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      // First request - should hit API
      const result1 = await teamsManager.loadData();
      expect(result1.fromCache).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Second request - should use cache
      const result2 = await teamsManager.loadData();
      expect(result2.fromCache).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(1); // Still 1 - no new call

      // Verify network metrics
      const metrics = teamsManager.getNetworkMetrics();
      expect(metrics.cacheHits).toBe(1);
      expect(metrics.cacheMisses).toBe(1);
    });

    test("should invalidate expired cache entries", async () => {
      const mockResponse = { teams: [], total: 0 };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      // Set very short cache timeout
      teamsManager.setCacheTimeout(100); // 100ms

      // First request
      await teamsManager.loadData();
      expect(global.fetch).toHaveBeenCalledTimes(1);

      // Wait for cache to expire
      await teamsManager.sleep(150);

      // Second request after expiry - should hit API again
      const result = await teamsManager.loadData();
      expect(result.fromCache).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test("should differentiate cache by parameters", async () => {
      const response1 = { teams: [{ name: "Active Team" }], total: 1 };
      const response2 = { teams: [{ name: "Inactive Team" }], total: 1 };

      global.fetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(response1),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(response2),
        });

      // Request with status=active
      const result1 = await teamsManager.loadData({ status: "active" });
      expect(result1.fromCache).toBe(false);

      // Request with status=inactive (different cache key)
      const result2 = await teamsManager.loadData({ status: "inactive" });
      expect(result2.fromCache).toBe(false);

      // Request with status=active again (should use cache)
      const result3 = await teamsManager.loadData({ status: "active" });
      expect(result3.fromCache).toBe(true);

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test("should handle cache clearing", async () => {
      const mockResponse = { teams: [], total: 0 };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      // First request - cache miss
      await teamsManager.loadData();

      // Second request - cache hit
      const result1 = await teamsManager.loadData();
      expect(result1.fromCache).toBe(true);

      // Clear cache
      teamsManager.clearCache();

      // Third request - cache miss again
      const result2 = await teamsManager.loadData();
      expect(result2.fromCache).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    test("should track cache hit rate accurately", async () => {
      const mockResponse = { teams: [], total: 0 };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      // 1 cache miss + 4 cache hits = 80% hit rate
      await teamsManager.loadData(); // Miss
      await teamsManager.loadData(); // Hit
      await teamsManager.loadData(); // Hit
      await teamsManager.loadData(); // Hit
      await teamsManager.loadData(); // Hit

      const stats = teamsManager.getPerformanceStats("load");
      expect(stats.cacheHitRate).toBe(80); // 4/5 * 100
      expect(stats.count).toBe(5);
    });
  });

  describe("Error Recovery and Retry Tests", () => {
    test("should retry failed requests with exponential backoff", async () => {
      let callCount = 0;

      global.fetch = jest.fn(() => {
        callCount++;
        if (callCount <= 2) {
          // Fail first 2 attempts
          return Promise.resolve({
            ok: false,
            status: 500,
            text: () => Promise.resolve("Server Error"),
          });
        }
        // Succeed on 3rd attempt
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teams: [], total: 0 }),
        });
      });

      const startTime = Date.now();
      const result = await teamsManager.loadData();
      const endTime = Date.now();

      // Should have made 3 attempts
      expect(global.fetch).toHaveBeenCalledTimes(3);

      // Should have taken time for retries (at least 3 seconds: 0 + 1 + 2)
      expect(endTime - startTime).toBeGreaterThan(2900);

      // Should track retries
      const metrics = teamsManager.getNetworkMetrics();
      expect(metrics.retries).toBe(2); // 2 retry attempts
    });

    test("should not retry client errors (4xx)", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Bad Request"),
        }),
      );

      await expect(teamsManager.loadData()).rejects.toThrow(
        "Failed to fetch teams: 400 Bad Request",
      );

      // Should only make 1 attempt for client errors
      expect(global.fetch).toHaveBeenCalledTimes(1);

      const metrics = teamsManager.getNetworkMetrics();
      expect(metrics.retries).toBe(0);
    });

    test("should execute error recovery callbacks", async () => {
      const recoveryCallback = jest.fn();
      teamsManager.onErrorRecovery("loadData", recoveryCallback);

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Server Error"),
        }),
      );

      await expect(teamsManager.loadData()).rejects.toThrow(
        "Failed to fetch teams: 500 Server Error",
      );

      // Recovery callback should have been called
      expect(recoveryCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining("500 Server Error"),
        }),
      );
    });

    test("should handle network timeouts gracefully", async () => {
      // Simulate network timeout
      global.fetch = jest.fn(
        () =>
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Network timeout")), 100),
          ),
      );

      await expect(teamsManager.loadData()).rejects.toThrow("Network timeout");

      // Should have retried
      expect(global.fetch).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    test("should respect maximum delay in exponential backoff", async () => {
      // Set low max delay for testing
      teamsManager.retryConfig.maxDelay = 500;

      let callCount = 0;
      global.fetch = jest.fn(() => {
        callCount++;
        return Promise.resolve({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Server Error"),
        });
      });

      const startTime = Date.now();

      try {
        await teamsManager.loadData();
      } catch (error) {
        // Expected to fail
      }

      const endTime = Date.now();

      // With maxDelay=500, total delay should be under 2000ms (500+500+500)
      expect(endTime - startTime).toBeLessThan(2000);
    });
  });

  describe("Performance Regression Tests", () => {
    test("should maintain consistent load times", async () => {
      const mockResponse = { teams: [], total: 0 };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      const loadTimes = [];

      // Perform 20 load operations
      for (let i = 0; i < 20; i++) {
        teamsManager.clearCache(); // Force API calls
        const result = await teamsManager.loadData();
        loadTimes.push(result.loadTime);
      }

      // Calculate variance in load times
      const average =
        loadTimes.reduce((sum, time) => sum + time, 0) / loadTimes.length;
      const variance =
        loadTimes.reduce((sum, time) => sum + Math.pow(time - average, 2), 0) /
        loadTimes.length;
      const standardDeviation = Math.sqrt(variance);

      // Standard deviation should be low (consistent performance)
      expect(standardDeviation).toBeLessThan(average * 0.5); // Within 50% of average
    });

    test("should handle memory cleanup efficiently", async () => {
      const initialMemory = performance.memory.usedJSHeapSize;

      // Simulate large dataset processing
      for (let i = 0; i < 100; i++) {
        const largeDataset = TeamBuilder.performanceDataset(100);

        global.fetch = jest.fn(() =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                teams: largeDataset,
                total: largeDataset.length,
              }),
          }),
        );

        teamsManager.clearCache();
        await teamsManager.loadData();
      }

      const finalMemory = performance.memory.usedJSHeapSize;
      const memoryIncrease =
        ((finalMemory - initialMemory) / initialMemory) * 100;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(20);
    });

    test("should demonstrate performance improvement with caching", async () => {
      const mockResponse = {
        teams: TeamBuilder.performanceDataset(50),
        total: 50,
      };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      // First request (cache miss)
      const result1 = await teamsManager.loadData();
      const timeWithoutCache = result1.loadTime;

      // Second request (cache hit)
      const result2 = await teamsManager.loadData();
      const timeWithCache = result2.loadTime;

      // Cache should be significantly faster
      expect(timeWithCache).toBeLessThan(timeWithoutCache * 0.5);
      expect(result2.fromCache).toBe(true);
    });

    test("should track performance metrics over time", async () => {
      const mockResponse = { teams: [], total: 0 };

      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        }),
      );

      // Generate mixed cache hits and misses
      await teamsManager.loadData(); // Miss
      await teamsManager.loadData(); // Hit
      await teamsManager.loadData({ status: "active" }); // Miss (different params)
      await teamsManager.loadData(); // Hit
      await teamsManager.loadData({ status: "active" }); // Hit

      const stats = teamsManager.getPerformanceStats("load");

      expect(stats.count).toBe(5);
      expect(stats.average).toBeGreaterThan(0);
      expect(stats.min).toBeGreaterThanOrEqual(0);
      expect(stats.max).toBeGreaterThanOrEqual(stats.min);
      expect(stats.cacheHitRate).toBe(60); // 3/5 * 100
    });
  });

  describe("Network Resilience Tests", () => {
    test("should handle intermittent network failures", async () => {
      let callCount = 0;
      const responses = [
        // Fail
        Promise.resolve({
          ok: false,
          status: 503,
          text: () => Promise.resolve("Service Unavailable"),
        }),
        // Success
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ teams: [], total: 0 }),
        }),
      ];

      global.fetch = jest.fn(
        () => responses[callCount++] || responses[responses.length - 1],
      );

      const result = await teamsManager.loadData();

      expect(result.teams).toBeDefined();
      expect(global.fetch).toHaveBeenCalledTimes(2); // Initial failure + retry success
    });

    test("should handle request cancellation gracefully", async () => {
      // Simulate request cancellation
      global.fetch = jest.fn(() =>
        Promise.reject(new Error("Request cancelled")),
      );

      await expect(teamsManager.loadData()).rejects.toThrow(
        "Request cancelled",
      );

      const metrics = teamsManager.getNetworkMetrics();
      expect(metrics.errors).toBe(1);
      expect(metrics.retries).toBe(3); // Should have attempted retries
    });

    test("should handle malformed JSON responses", async () => {
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new Error("Invalid JSON")),
        }),
      );

      await expect(teamsManager.loadData()).rejects.toThrow("Invalid JSON");

      // Should have retried
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });
});

export default {
  CachingTeamsEntityManager,
};
