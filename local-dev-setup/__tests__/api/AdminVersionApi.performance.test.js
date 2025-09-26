/**
 * AdminVersionApi Performance Tests - US-088 Phase 2 Day 3
 *
 * Tests for <500ms performance requirements across all 4 health endpoints:
 * - /admin/version: System version information aggregation
 * - /admin/components: Component status and versions matrix
 * - /admin/compatibility: Cross-component compatibility matrix
 * - /admin/build-info: Build metadata and deployment information
 *
 * Performance Requirements:
 * - /admin/version: <200ms target
 * - /admin/components: <300ms target
 * - /admin/compatibility: <400ms target
 * - /admin/build-info: <250ms target
 * - All endpoints: <500ms maximum
 */

const axios = require("axios");
const { performance } = require("perf_hooks");

describe("AdminVersionApi Performance Tests", () => {
  const baseURL = "http://localhost:8090/rest/scriptrunner/latest/custom";
  const credentials = {
    username: process.env.CONFLUENCE_USERNAME || "admin",
    password: process.env.CONFLUENCE_PASSWORD || "admin",
  };

  // Performance test configuration
  const PERFORMANCE_THRESHOLDS = {
    "/admin/version": 200, // Target: <200ms
    "/admin/components": 300, // Target: <300ms
    "/admin/compatibility": 400, // Target: <400ms
    "/admin/build-info": 250, // Target: <250ms
  };

  const MAX_RESPONSE_TIME = 500; // Absolute maximum: <500ms

  let axiosClient;

  beforeAll(() => {
    // Configure axios client with authentication
    axiosClient = axios.create({
      baseURL,
      auth: credentials,
      timeout: 10000, // 10 second timeout for test framework
      validateStatus: function (status) {
        return status >= 200 && status < 600; // Accept all status codes for testing
      },
    });
  });

  /**
   * Test /admin/version endpoint performance
   * Target: <200ms response time
   */
  describe("/admin/version Performance", () => {
    test("should respond within 200ms target time", async () => {
      const startTime = performance.now();

      const response = await axiosClient.get("/adminVersion");

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      console.log(`/admin/version response time: ${responseTime.toFixed(2)}ms`);

      // Verify response is successful
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("metadata");
      expect(response.data).toHaveProperty("system");
      expect(response.data).toHaveProperty("database");
      expect(response.data).toHaveProperty("health");

      // Performance assertions
      expect(responseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS["/admin/version"],
      );
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

      // Verify response includes performance metrics
      expect(response.data.metadata).toHaveProperty("responseTime");
      expect(typeof response.data.metadata.responseTime).toBe("number");
    });

    test("should respond within target with includeDetails=true", async () => {
      const startTime = performance.now();

      const response = await axiosClient.get(
        "/adminVersion?includeDetails=true",
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      console.log(
        `/admin/version (with details) response time: ${responseTime.toFixed(2)}ms`,
      );

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS["/admin/version"] + 50,
      ); // Allow 50ms extra for details
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

      // Verify details are included
      expect(response.data).toHaveProperty("compatibility");
    });

    test("should handle multiple concurrent requests efficiently", async () => {
      const concurrentRequests = 5;
      const promises = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const startTime = performance.now();
        const promise = axiosClient.get("/adminVersion").then((response) => ({
          response,
          responseTime: performance.now() - startTime,
        }));
        promises.push(promise);
      }

      const results = await Promise.all(promises);

      // Verify all requests succeeded and met performance requirements
      results.forEach((result, index) => {
        console.log(
          `Concurrent request ${index + 1} response time: ${result.responseTime.toFixed(2)}ms`,
        );

        expect(result.response.status).toBe(200);
        expect(result.responseTime).toBeLessThan(MAX_RESPONSE_TIME);
      });

      // Verify average response time is within target
      const averageResponseTime =
        results.reduce((sum, result) => sum + result.responseTime, 0) /
        results.length;
      console.log(
        `Average concurrent response time: ${averageResponseTime.toFixed(2)}ms`,
      );

      expect(averageResponseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS["/admin/version"] + 100,
      ); // Allow some overhead for concurrency
    });
  });

  /**
   * Test /admin/components endpoint performance
   * Target: <300ms response time
   */
  describe("/admin/components Performance", () => {
    test("should respond within 300ms target time", async () => {
      const startTime = performance.now();

      const response = await axiosClient.get("/adminComponents");

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      console.log(
        `/admin/components response time: ${responseTime.toFixed(2)}ms`,
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("metadata");
      expect(response.data).toHaveProperty("versionMatrix");
      expect(response.data).toHaveProperty("components");
      expect(response.data).toHaveProperty("health");

      // Performance assertions
      expect(responseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS["/admin/components"],
      );
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);
    });

    test("should respond efficiently with specific component type filter", async () => {
      const componentTypes = ["api", "ui", "backend", "database"];

      for (const componentType of componentTypes) {
        const startTime = performance.now();

        const response = await axiosClient.get(
          `/adminComponents?type=${componentType}`,
        );

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        console.log(
          `/admin/components (${componentType}) response time: ${responseTime.toFixed(2)}ms`,
        );

        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(
          PERFORMANCE_THRESHOLDS["/admin/components"],
        );
        expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

        // Verify filtered response
        expect(response.data.components).toHaveProperty(componentType);
      }
    });

    test("should include performance metrics efficiently", async () => {
      const startTime = performance.now();

      const response = await axiosClient.get(
        "/adminComponents?includeMetrics=true&includeHealth=true",
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      console.log(
        `/admin/components (with metrics) response time: ${responseTime.toFixed(2)}ms`,
      );

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS["/admin/components"] + 50,
      ); // Allow extra time for metrics
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

      // Verify metrics are included
      expect(response.data).toHaveProperty("performance");
      expect(response.data.performance).toHaveProperty("api");
      expect(response.data.performance).toHaveProperty("ui");
      expect(response.data.performance).toHaveProperty("backend");
      expect(response.data.performance).toHaveProperty("database");
    });
  });

  /**
   * Test /admin/compatibility endpoint performance
   * Target: <400ms response time (most complex analysis)
   */
  describe("/admin/compatibility Performance", () => {
    test("should respond within 400ms target time for full matrix", async () => {
      const startTime = performance.now();

      const response = await axiosClient.get("/adminCompatibility");

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      console.log(
        `/admin/compatibility (full matrix) response time: ${responseTime.toFixed(2)}ms`,
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("metadata");
      expect(response.data).toHaveProperty("matrix");
      expect(response.data).toHaveProperty("overallCompatibility");

      // Performance assertions
      expect(responseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS["/admin/compatibility"],
      );
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);
    });

    test("should respond efficiently for specific component compatibility", async () => {
      const componentPairs = [
        { source: "api", target: "ui" },
        { source: "ui", target: "backend" },
        { source: "backend", target: "database" },
        { source: "database", target: "api" },
      ];

      for (const { source, target } of componentPairs) {
        const startTime = performance.now();

        const response = await axiosClient.get(
          `/adminCompatibility?source=${source}&target=${target}`,
        );

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        console.log(
          `/admin/compatibility (${source}->${target}) response time: ${responseTime.toFixed(2)}ms`,
        );

        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(
          PERFORMANCE_THRESHOLDS["/admin/compatibility"] - 100,
        ); // Should be faster for specific pairs
        expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

        // Verify targeted response structure
        expect(response.data.metadata.analysisScope).toContain(source);
        expect(response.data.metadata.analysisScope).toContain(target);
      }
    });

    test("should handle complex analysis options within time limits", async () => {
      const startTime = performance.now();

      const response = await axiosClient.get(
        "/adminCompatibility?includeUpgradePaths=true&includeBreakingChanges=true",
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      console.log(
        `/admin/compatibility (full analysis) response time: ${responseTime.toFixed(2)}ms`,
      );

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS["/admin/compatibility"],
      );
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

      // Verify comprehensive analysis is included
      expect(response.data).toHaveProperty("breakingChanges");
      expect(response.data).toHaveProperty("upgradePaths");
      expect(response.data).toHaveProperty("risks");
      expect(response.data).toHaveProperty("recommendations");
    });
  });

  /**
   * Test /admin/build-info endpoint performance
   * Target: <250ms response time
   */
  describe("/admin/build-info Performance", () => {
    test("should respond within 250ms target time", async () => {
      const startTime = performance.now();

      const response = await axiosClient.get("/adminBuildInfo");

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      console.log(
        `/admin/build-info response time: ${responseTime.toFixed(2)}ms`,
      );

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty("metadata");
      expect(response.data).toHaveProperty("build");
      expect(response.data).toHaveProperty("deployment");

      // Performance assertions
      expect(responseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS["/admin/build-info"],
      );
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);
    });

    test("should respond efficiently with all information included", async () => {
      const startTime = performance.now();

      const response = await axiosClient.get(
        "/adminBuildInfo?includePackages=true&includeEnvironment=true&includeResources=true",
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      console.log(
        `/admin/build-info (comprehensive) response time: ${responseTime.toFixed(2)}ms`,
      );

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS["/admin/build-info"] + 50,
      ); // Allow extra time for comprehensive data
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

      // Verify comprehensive data is included
      expect(response.data).toHaveProperty("packages");
      expect(response.data).toHaveProperty("environment");
      expect(response.data).toHaveProperty("resources");
      expect(response.data).toHaveProperty("recommendations");
    });

    test("should provide deployment readiness assessment efficiently", async () => {
      const startTime = performance.now();

      const response = await axiosClient.get(
        "/adminBuildInfo?includePackages=true",
      );

      const endTime = performance.now();
      const responseTime = endTime - startTime;

      console.log(
        `/admin/build-info (deployment focus) response time: ${responseTime.toFixed(2)}ms`,
      );

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS["/admin/build-info"],
      );
      expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

      // Verify deployment assessment
      expect(response.data.deployment).toHaveProperty("ready");
      expect(response.data.deployment).toHaveProperty("status");
      expect(response.data.deployment).toHaveProperty("checks");
      expect(response.data.deployment).toHaveProperty("confidence");
    });
  });

  /**
   * Cross-endpoint performance comparison and load testing
   */
  describe("Cross-Endpoint Performance Analysis", () => {
    test("all endpoints should meet their individual performance targets", async () => {
      const endpoints = [
        {
          path: "/adminVersion",
          threshold: PERFORMANCE_THRESHOLDS["/admin/version"],
        },
        {
          path: "/adminComponents",
          threshold: PERFORMANCE_THRESHOLDS["/admin/components"],
        },
        {
          path: "/adminCompatibility",
          threshold: PERFORMANCE_THRESHOLDS["/admin/compatibility"],
        },
        {
          path: "/adminBuildInfo",
          threshold: PERFORMANCE_THRESHOLDS["/admin/build-info"],
        },
      ];

      const results = [];

      for (const { path, threshold } of endpoints) {
        const startTime = performance.now();

        const response = await axiosClient.get(path);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        console.log(
          `${path} performance: ${responseTime.toFixed(2)}ms (target: <${threshold}ms)`,
        );

        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(threshold);
        expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

        results.push({ path, responseTime, threshold });
      }

      // Verify overall performance characteristics
      const totalTime = results.reduce(
        (sum, result) => sum + result.responseTime,
        0,
      );
      const averageTime = totalTime / results.length;

      console.log(
        `Average endpoint response time: ${averageTime.toFixed(2)}ms`,
      );
      console.log(`Total sequential time: ${totalTime.toFixed(2)}ms`);

      // All endpoints combined should be reasonable for dashboard loading
      expect(totalTime).toBeLessThan(1500); // 1.5 seconds for all endpoints sequentially
      expect(averageTime).toBeLessThan(350); // Average should be reasonable
    });

    test("endpoints should handle concurrent access efficiently", async () => {
      const endpoints = [
        "/adminVersion",
        "/adminComponents",
        "/adminCompatibility",
        "/adminBuildInfo",
      ];
      const promises = [];

      // Create concurrent requests to all endpoints
      for (const endpoint of endpoints) {
        const startTime = performance.now();
        const promise = axiosClient.get(endpoint).then((response) => ({
          endpoint,
          response,
          responseTime: performance.now() - startTime,
        }));
        promises.push(promise);
      }

      const results = await Promise.all(promises);

      // Verify all concurrent requests succeeded and met performance requirements
      results.forEach(({ endpoint, response, responseTime }) => {
        console.log(
          `Concurrent ${endpoint} response time: ${responseTime.toFixed(2)}ms`,
        );

        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

        // Individual endpoint should still meet its threshold with reasonable overhead
        const threshold =
          PERFORMANCE_THRESHOLDS[endpoint.replace("admin", "/admin/")];
        expect(responseTime).toBeLessThan(threshold + 100); // Allow 100ms overhead for concurrency
      });

      // Verify concurrent execution was actually faster than sequential
      const totalConcurrentTime = Math.max(
        ...results.map((r) => r.responseTime),
      );
      console.log(
        `Total concurrent execution time: ${totalConcurrentTime.toFixed(2)}ms`,
      );

      expect(totalConcurrentTime).toBeLessThan(MAX_RESPONSE_TIME * 1.5); // Should be much faster than sequential
    });

    test("should maintain performance under repeated load", async () => {
      const iterations = 10;
      const endpoint = "/adminVersion"; // Test the most frequently used endpoint
      const results = [];

      for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();

        const response = await axiosClient.get(endpoint);

        const endTime = performance.now();
        const responseTime = endTime - startTime;

        expect(response.status).toBe(200);
        expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

        results.push(responseTime);
      }

      // Calculate performance statistics
      const averageTime =
        results.reduce((sum, time) => sum + time, 0) / results.length;
      const minTime = Math.min(...results);
      const maxTime = Math.max(...results);
      const medianTime = results.sort((a, b) => a - b)[
        Math.floor(results.length / 2)
      ];

      console.log(`Load test results (${iterations} iterations):`);
      console.log(`  Average: ${averageTime.toFixed(2)}ms`);
      console.log(`  Median: ${medianTime.toFixed(2)}ms`);
      console.log(`  Min: ${minTime.toFixed(2)}ms`);
      console.log(`  Max: ${maxTime.toFixed(2)}ms`);

      // Performance should remain consistent under load
      expect(averageTime).toBeLessThan(
        PERFORMANCE_THRESHOLDS["/admin/version"] + 50,
      );
      expect(maxTime).toBeLessThan(MAX_RESPONSE_TIME);
      expect(maxTime - minTime).toBeLessThan(200); // Variation should be reasonable
    });
  });

  /**
   * Error handling performance tests
   */
  describe("Error Handling Performance", () => {
    test("should handle timeout gracefully and quickly", async () => {
      // Test with a request that might timeout (simulate by requesting non-existent parameters)
      const startTime = performance.now();

      try {
        const response = await axiosClient.get(
          "/adminCompatibility?source=invalid&target=invalid",
        );
        const responseTime = performance.now() - startTime;

        // Should still respond quickly even with invalid parameters
        expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

        // May return error or empty results, but should not crash
        expect(response.status).toBeGreaterThanOrEqual(200);
      } catch (error) {
        const responseTime = performance.now() - startTime;

        // Even errors should respond quickly
        expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);

        // Should be a reasonable HTTP error, not a timeout
        if (error.response) {
          expect(error.response.status).toBeGreaterThanOrEqual(400);
          expect(error.response.status).toBeLessThan(600);
        }
      }
    });

    test("should provide meaningful error responses quickly", async () => {
      // Test endpoints with malformed requests
      const malformedRequests = [
        "/adminVersion?includeDetails=invalid_boolean",
        "/adminComponents?type=nonexistent_component",
        "/adminCompatibility?includeUpgradePaths=invalid_param",
      ];

      for (const malformedRequest of malformedRequests) {
        const startTime = performance.now();

        try {
          const response = await axiosClient.get(malformedRequest);
          const responseTime = performance.now() - startTime;

          console.log(
            `${malformedRequest} response time: ${responseTime.toFixed(2)}ms`,
          );

          // Should respond quickly regardless of parameter validity
          expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);
          expect(response.status).toBeGreaterThanOrEqual(200);
        } catch (error) {
          const responseTime = performance.now() - startTime;
          console.log(
            `${malformedRequest} error response time: ${responseTime.toFixed(2)}ms`,
          );

          // Errors should also be fast
          expect(responseTime).toBeLessThan(MAX_RESPONSE_TIME);
        }
      }
    });
  });
});
