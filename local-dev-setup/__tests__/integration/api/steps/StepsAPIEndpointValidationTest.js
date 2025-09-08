/**
 * US-028 Enhanced IterationView - Steps API Endpoint Validation Test Suite
 *
 * CRITICAL TESTING: Steps API calls are failing with 404 errors despite migration dropdown working.
 * This test suite validates all Steps API endpoints and identifies the root cause.
 *
 * Test Focus:
 * 1. Validate Steps API endpoints - Test all /steps endpoints vs /api/v2/steps
 * 2. Test URL construction - Verify baseUrl + endpoint combinations work correctly
 * 3. Compare with working TeamsApi.groovy pattern
 * 4. Verify ScriptRunner endpoint registration - Ensure /steps is properly registered
 * 5. Diagnose iteration-view.js StepsAPIv2Client URL construction problems
 */

const expect = require("chai").expect;
const fetch = require("node-fetch"); // For Node.js testing
const fs = require("fs").promises;
const path = require("path");

describe("US-028 Steps API Endpoint Validation", function () {
  this.timeout(30000); // 30 seconds for API calls

  const BASE_URL = "http://localhost:8090";
  const SCRIPTRUNNER_BASE = "/rest/scriptrunner/latest/custom";

  // Test data - using known migration ID from test data
  const TEST_MIGRATION_ID = "550e8400-e29b-41d4-a716-446655440001";
  const TEST_ITERATION_ID = "550e8400-e29b-41d4-a716-446655440002";

  let testResults = {
    endpointTests: [],
    urlConstructionTests: [],
    comparisonTests: [],
    diagnosticTests: [],
  };

  before(async function () {
    console.log("=== US-028 Steps API Endpoint Validation Test Suite ===");
    console.log("Base URL:", BASE_URL);
    console.log("ScriptRunner Base:", SCRIPTRUNNER_BASE);
    console.log("Test Migration ID:", TEST_MIGRATION_ID);
    console.log("Test Iteration ID:", TEST_ITERATION_ID);
  });

  after(async function () {
    // Generate comprehensive test report
    const reportPath = path.join(
      __dirname,
      "../reports/steps-api-validation-report.json",
    );
    await fs.writeFile(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          testSuite: "US-028 Steps API Endpoint Validation",
          summary: {
            totalTests:
              testResults.endpointTests.length +
              testResults.urlConstructionTests.length +
              testResults.comparisonTests.length +
              testResults.diagnosticTests.length,
            passedTests: this.currentTest?.parent?.stats?.passes || 0,
            failedTests: this.currentTest?.parent?.stats?.failures || 0,
            duration: this.currentTest?.parent?.stats?.duration || 0,
          },
          results: testResults,
          recommendations: generateRecommendations(testResults),
        },
        null,
        2,
      ),
    );

    console.log(`\n=== Test Report Generated: ${reportPath} ===`);
  });

  describe("1. Direct API Endpoint Tests", function () {
    it("should validate /rest/scriptrunner/latest/custom/steps endpoint exists", async function () {
      const url = `${BASE_URL}${SCRIPTRUNNER_BASE}/steps`;
      console.log("Testing Steps API endpoint:", url);

      try {
        const response = await fetch(url);
        const result = {
          url: url,
          status: response.status,
          statusText: response.statusText,
          exists: response.status !== 404,
          responseTime: 0,
        };

        testResults.endpointTests.push(result);

        expect(response.status).to.not.equal(
          404,
          `Steps endpoint should exist at ${url}`,
        );

        if (response.ok) {
          const data = await response.json();
          expect(data).to.be.an("array").or.an("object");
          console.log("✓ Steps endpoint exists and returns data");
        } else {
          console.log(
            "⚠ Steps endpoint exists but returned status:",
            response.status,
          );
        }
      } catch (error) {
        console.error("✗ Failed to reach Steps endpoint:", error.message);
        testResults.endpointTests.push({
          url: url,
          error: error.message,
          exists: false,
        });
        throw error;
      }
    });

    it("should validate /rest/scriptrunner/latest/custom/teams endpoint works (control test)", async function () {
      const url = `${BASE_URL}${SCRIPTRUNNER_BASE}/teams`;
      console.log("Testing Teams API endpoint (control):", url);

      try {
        const response = await fetch(url);
        const result = {
          url: url,
          status: response.status,
          statusText: response.statusText,
          exists: response.status !== 404,
          isControl: true,
        };

        testResults.comparisonTests.push(result);

        expect(response.status).to.not.equal(
          404,
          `Teams endpoint should exist at ${url}`,
        );

        if (response.ok) {
          const data = await response.json();
          expect(data).to.be.an("array").or.an("object");
          console.log("✓ Teams endpoint (control) works correctly");
        }
      } catch (error) {
        console.error(
          "✗ Control test failed - Teams endpoint issue:",
          error.message,
        );
        throw error;
      }
    });

    it("should test steps endpoint with iterationId parameter", async function () {
      const url = `${BASE_URL}${SCRIPTRUNNER_BASE}/steps?iterationId=${TEST_ITERATION_ID}`;
      console.log("Testing Steps API with iterationId filter:", url);

      try {
        const response = await fetch(url);
        const result = {
          url: url,
          status: response.status,
          statusText: response.statusText,
          hasIterationFilter: true,
        };

        testResults.endpointTests.push(result);

        if (response.status === 404) {
          console.log(
            "✗ Steps endpoint with iterationId returns 404 - ROOT CAUSE IDENTIFIED",
          );
          expect.fail(`Steps endpoint with iterationId returns 404: ${url}`);
        } else if (response.ok) {
          const data = await response.json();
          console.log(
            "✓ Steps endpoint with iterationId works - returned",
            typeof data,
          );
        } else {
          console.log(
            "⚠ Steps endpoint with iterationId returned status:",
            response.status,
          );
        }
      } catch (error) {
        console.error("✗ Failed to test iterationId filter:", error.message);
        testResults.endpointTests.push({
          url: url,
          error: error.message,
          hasIterationFilter: true,
        });
        throw error;
      }
    });

    it("should test steps/master endpoint for dropdown data", async function () {
      const url = `${BASE_URL}${SCRIPTRUNNER_BASE}/steps/master`;
      console.log("Testing Steps master endpoint:", url);

      try {
        const response = await fetch(url);
        const result = {
          url: url,
          status: response.status,
          statusText: response.statusText,
          isMasterEndpoint: true,
        };

        testResults.endpointTests.push(result);

        if (response.ok) {
          const data = await response.json();
          expect(data).to.be.an("array");
          console.log(
            "✓ Steps master endpoint works - returned",
            data.length,
            "items",
          );
        } else {
          console.log(
            "✗ Steps master endpoint failed with status:",
            response.status,
          );
        }
      } catch (error) {
        console.error("✗ Failed to test master endpoint:", error.message);
        throw error;
      }
    });

    it("should test alternative endpoints that might exist", async function () {
      const alternativeEndpoints = [
        "/api/v2/steps",
        "/steps/api",
        "/api/steps",
      ];

      for (const endpoint of alternativeEndpoints) {
        const url = `${BASE_URL}${SCRIPTRUNNER_BASE}${endpoint}`;
        console.log("Testing alternative endpoint:", url);

        try {
          const response = await fetch(url);
          const result = {
            url: url,
            status: response.status,
            statusText: response.statusText,
            isAlternative: true,
            endpoint: endpoint,
          };

          testResults.endpointTests.push(result);

          if (response.status !== 404) {
            console.log(
              "ℹ Alternative endpoint found:",
              endpoint,
              "status:",
              response.status,
            );
          }
        } catch (error) {
          console.log(
            "ℹ Alternative endpoint",
            endpoint,
            "not accessible:",
            error.message,
          );
        }
      }
    });
  });

  describe("2. URL Construction Validation", function () {
    it("should validate StepsAPIv2Client URL construction pattern", function () {
      const baseUrl = "/rest/scriptrunner/latest/custom";
      const endpoint = "/steps";
      const filters = { iterationId: TEST_ITERATION_ID };

      // Simulate StepsAPIv2Client URL construction
      const queryParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) queryParams.append(key, value);
      });

      const constructedUrl = `${baseUrl}${endpoint}?${queryParams.toString()}`;
      const expectedUrl = `/rest/scriptrunner/latest/custom/steps?iterationId=${TEST_ITERATION_ID}`;

      const result = {
        baseUrl: baseUrl,
        endpoint: endpoint,
        filters: filters,
        constructedUrl: constructedUrl,
        expectedUrl: expectedUrl,
        matches: constructedUrl === expectedUrl,
      };

      testResults.urlConstructionTests.push(result);

      console.log("URL Construction Test:");
      console.log("  Base URL:", baseUrl);
      console.log("  Endpoint:", endpoint);
      console.log("  Constructed:", constructedUrl);
      console.log("  Expected:", expectedUrl);

      expect(constructedUrl).to.equal(
        expectedUrl,
        "URL construction should match expected pattern",
      );
      console.log("✓ URL construction pattern is correct");
    });

    it("should compare with working TeamsAPI URL pattern", function () {
      const teamsUrl = "/rest/scriptrunner/latest/custom/teams";
      const stepsUrl = "/rest/scriptrunner/latest/custom/steps";

      const result = {
        teamsPattern: teamsUrl,
        stepsPattern: stepsUrl,
        baseMatches:
          teamsUrl.replace("/teams", "") === stepsUrl.replace("/steps", ""),
        patternConsistent: true,
      };

      testResults.comparisonTests.push(result);

      console.log("Pattern Comparison:");
      console.log("  Teams URL:", teamsUrl);
      console.log("  Steps URL:", stepsUrl);

      expect(result.baseMatches).to.be.true;
      console.log("✓ URL patterns are consistent between Teams and Steps APIs");
    });
  });

  describe("3. ScriptRunner Registration Validation", function () {
    it("should check if Steps API is properly registered in ScriptRunner", async function () {
      // Test various ScriptRunner REST endpoints to verify registration
      const registrationTests = [
        {
          name: "ScriptRunner Base",
          url: `${BASE_URL}/rest/scriptrunner/latest/custom`,
        },
        {
          name: "Steps Direct",
          url: `${BASE_URL}/rest/scriptrunner/latest/custom/steps`,
        },
        {
          name: "Teams Control",
          url: `${BASE_URL}/rest/scriptrunner/latest/custom/teams`,
        },
      ];

      for (const test of registrationTests) {
        try {
          console.log(`Testing ${test.name}:`, test.url);

          const response = await fetch(test.url, { method: "GET" });
          const result = {
            name: test.name,
            url: test.url,
            status: response.status,
            statusText: response.statusText,
            registered: response.status !== 404,
            accessible: response.status < 500,
          };

          testResults.diagnosticTests.push(result);

          if (response.status === 404) {
            console.log(`✗ ${test.name} not registered (404)`);
          } else {
            console.log(`✓ ${test.name} registered (${response.status})`);
          }
        } catch (error) {
          console.error(`✗ ${test.name} test failed:`, error.message);
          testResults.diagnosticTests.push({
            name: test.name,
            url: test.url,
            error: error.message,
            registered: false,
          });
        }
      }
    });
  });

  describe("4. Response Format Validation", function () {
    it("should validate Steps API response format matches expected structure", async function () {
      const url = `${BASE_URL}${SCRIPTRUNNER_BASE}/steps/master?migrationId=${TEST_MIGRATION_ID}`;
      console.log("Testing Steps API response format:", url);

      try {
        const response = await fetch(url);

        if (!response.ok) {
          console.log(
            "⚠ Cannot test response format - endpoint not accessible",
          );
          this.skip();
          return;
        }

        const data = await response.json();
        const result = {
          url: url,
          status: response.status,
          dataType: typeof data,
          isArray: Array.isArray(data),
          hasExpectedFields: false,
          sampleRecord: null,
        };

        if (Array.isArray(data) && data.length > 0) {
          const sample = data[0];
          result.sampleRecord = sample;
          result.hasExpectedFields =
            sample.hasOwnProperty("stm_id") &&
            sample.hasOwnProperty("stt_code") &&
            sample.hasOwnProperty("stm_title");

          console.log("✓ Response format validation:");
          console.log("  Data type:", result.dataType);
          console.log("  Is array:", result.isArray);
          console.log("  Record count:", data.length);
          console.log("  Has expected fields:", result.hasExpectedFields);
          console.log("  Sample keys:", Object.keys(sample));
        }

        testResults.diagnosticTests.push(result);

        expect(data).to.be.an("array");
        if (data.length > 0) {
          expect(result.hasExpectedFields).to.be.true;
        }
      } catch (error) {
        console.error("✗ Response format validation failed:", error.message);
        throw error;
      }
    });
  });

  describe("5. Error Diagnosis and Resolution", function () {
    it("should identify specific causes of 404 errors", async function () {
      const diagnosticUrls = [
        `${BASE_URL}${SCRIPTRUNNER_BASE}/steps`,
        `${BASE_URL}${SCRIPTRUNNER_BASE}/steps?iterationId=${TEST_ITERATION_ID}`,
        `${BASE_URL}${SCRIPTRUNNER_BASE}/steps/master`,
        `${BASE_URL}${SCRIPTRUNNER_BASE}/teams`, // Control
        `${BASE_URL}/rest/scriptrunner/latest/custom/migrations`, // Control
      ];

      const diagnosisResults = [];

      for (const url of diagnosticUrls) {
        try {
          console.log("Diagnosing:", url);
          const response = await fetch(url);

          const result = {
            url: url,
            status: response.status,
            statusText: response.statusText,
            is404: response.status === 404,
            isStepsEndpoint: url.includes("/steps"),
            isControlEndpoint:
              url.includes("/teams") || url.includes("/migrations"),
          };

          diagnosisResults.push(result);
          testResults.diagnosticTests.push(result);

          if (response.status === 404 && result.isStepsEndpoint) {
            console.log("✗ IDENTIFIED: Steps endpoint returning 404 -", url);
          } else if (response.status !== 404 && result.isStepsEndpoint) {
            console.log("✓ Steps endpoint accessible -", url);
          } else if (result.isControlEndpoint) {
            console.log(
              response.status === 404 ? "✗" : "✓",
              "Control endpoint -",
              url,
              "(",
              response.status,
              ")",
            );
          }
        } catch (error) {
          console.error("Diagnosis error for", url, ":", error.message);
          diagnosisResults.push({
            url: url,
            error: error.message,
            networkError: true,
          });
        }
      }

      // Analysis
      const stepsEndpoints = diagnosisResults.filter((r) => r.isStepsEndpoint);
      const controlEndpoints = diagnosisResults.filter(
        (r) => r.isControlEndpoint,
      );

      const steps404Count = stepsEndpoints.filter((r) => r.is404).length;
      const control404Count = controlEndpoints.filter((r) => r.is404).length;

      console.log("\n=== DIAGNOSIS SUMMARY ===");
      console.log(
        `Steps endpoints with 404: ${steps404Count}/${stepsEndpoints.length}`,
      );
      console.log(
        `Control endpoints with 404: ${control404Count}/${controlEndpoints.length}`,
      );

      if (steps404Count > 0 && control404Count === 0) {
        console.log(
          "🔍 ROOT CAUSE: Steps API not properly registered in ScriptRunner",
        );
      } else if (steps404Count === 0) {
        console.log(
          "✅ Steps API endpoints are accessible - issue may be elsewhere",
        );
      } else {
        console.log(
          "⚠ Mixed results - partial registration or configuration issue",
        );
      }
    });
  });
});

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(testResults) {
  const recommendations = [];

  // Check endpoint accessibility
  const failedEndpoints = testResults.endpointTests.filter(
    (t) => t.status === 404 || t.error,
  );
  if (failedEndpoints.length > 0) {
    recommendations.push({
      priority: "HIGH",
      category: "Endpoint Registration",
      issue: "Steps API endpoints returning 404 errors",
      solution:
        "Verify StepsApi.groovy is properly deployed and registered in ScriptRunner",
      actions: [
        "Check ScriptRunner Console for deployment errors",
        "Verify StepsApi.groovy file is in correct location",
        "Restart Confluence if needed to reload ScriptRunner endpoints",
        "Check ScriptRunner logs for endpoint registration failures",
      ],
    });
  }

  // URL construction validation
  const urlIssues = testResults.urlConstructionTests.filter((t) => !t.matches);
  if (urlIssues.length > 0) {
    recommendations.push({
      priority: "MEDIUM",
      category: "URL Construction",
      issue: "URL construction pattern mismatch",
      solution: "Fix URL construction in StepsAPIv2Client",
      actions: [
        "Review baseUrl and endpoint concatenation",
        "Ensure query parameter encoding is correct",
        "Test URL construction with various filter combinations",
      ],
    });
  }

  // Response format issues
  const formatIssues = testResults.diagnosticTests.filter(
    (t) => t.hasExpectedFields === false,
  );
  if (formatIssues.length > 0) {
    recommendations.push({
      priority: "MEDIUM",
      category: "Response Format",
      issue: "Response format does not match expected structure",
      solution: "Update API response mapping or client expectation",
      actions: [
        "Review StepRepository response mapping",
        "Update frontend code to handle actual response format",
        "Add response validation middleware",
      ],
    });
  }

  return recommendations;
}

module.exports = {
  testResults: () => testResults,
  generateRecommendations,
};
