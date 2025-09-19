/**
 * Integration Test Suite for Steps API Instance Endpoints (US-056-C Phase 2)
 *
 * Tests the new DTO-based instance endpoints:
 * - POST /steps/instance - Create step instance with DTO pattern
 * - PUT /steps/instance/{id} - Update step instance with DTO pattern
 *
 * These tests validate the Phase 2 API Layer Integration against a running system:
 * - Real HTTP calls to the API endpoints
 * - Database integration and transaction handling
 * - DTO transformation and validation
 * - Error handling and response formats
 * - Performance benchmarks (<51ms response time)
 *
 * Following UMIG patterns:
 * - BaseIntegrationTest framework compatibility
 * - Real database integration with test data
 * - Comprehensive error scenario validation
 * - Performance target validation (<51ms)
 *
 * Created: US-056-C Phase 2 API Layer Integration
 * Coverage Target: End-to-end validation of new instance endpoints
 */

const fetch = require("node-fetch");
const fs = require("fs").promises;
const path = require("path");
const MockStatusProvider = require("../../../mocks/MockStatusProvider");

describe("US-056-C Steps API Instance Endpoints Integration", function () {
  this.timeout(30000); // 30 seconds for API calls

  const BASE_URL = "http://localhost:8090";
  const SCRIPTRUNNER_BASE = "/rest/scriptrunner/latest/custom";
  const STEPS_API_BASE = `${BASE_URL}${SCRIPTRUNNER_BASE}/steps`;

  // Initialize MockStatusProvider for controlled test values (TD-003)
  const mockStatusProvider = new MockStatusProvider();

  // Test data - using known IDs from test database
  const TEST_TEAM_ID = "c550e8400-e29b-41d4-a716-446655440101";
  const TEST_PHASE_ID = "550e8400-e29b-41d4-a716-446655440103";
  const TEST_MIGRATION_ID = "550e8400-e29b-41d4-a716-446655440001";
  const TEST_ITERATION_ID = "550e8400-e29b-41d4-a716-446655440002";

  let testResults = {
    postEndpointTests: [],
    putEndpointTests: [],
    performanceTests: [],
    errorHandlingTests: [],
    dtoValidationTests: [],
  };

  let createdStepInstances = []; // Track created instances for cleanup

  before(async function () {
    console.log(
      "=== US-056-C Steps API Instance Endpoints Integration Tests ===",
    );
    console.log("Base URL:", BASE_URL);
    console.log("Steps API Base:", STEPS_API_BASE);
    console.log("Test Team ID:", TEST_TEAM_ID);
    console.log("Test Phase ID:", TEST_PHASE_ID);
    console.log("Performance Target: <51ms response time");
  });

  after(async function () {
    // Cleanup created test instances
    for (const instanceId of createdStepInstances) {
      try {
        await fetch(`${STEPS_API_BASE}/instance/${instanceId}`, {
          method: "DELETE",
        });
      } catch (error) {
        console.warn(
          `Failed to cleanup test instance ${instanceId}:`,
          error.message,
        );
      }
    }

    // Generate comprehensive test report
    const reportPath = path.join(
      __dirname,
      "../../../reports/steps-api-instance-integration-report.json",
    );
    await fs.writeFile(
      reportPath,
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          testSuite: "US-056-C Steps API Instance Endpoints Integration",
          phase: "Phase 2 API Layer Integration",
          summary: {
            totalTests: Object.values(testResults).reduce(
              (sum, tests) => sum + tests.length,
              0,
            ),
            passedTests: this.currentTest?.parent?.stats?.passes || 0,
            failedTests: this.currentTest?.parent?.stats?.failures || 0,
            duration: this.currentTest?.parent?.stats?.duration || 0,
          },
          performance: {
            target: "< 51ms response time",
            achieved: testResults.performanceTests.map((t) => t.responseTime),
          },
          results: testResults,
          recommendations: generateRecommendations(testResults),
        },
        null,
        2,
      ),
    );

    console.log(`\\n=== Integration Test Report Generated: ${reportPath} ===`);
  });

  describe("1. POST /steps/instance Endpoint Tests", function () {
    it("should create a new step instance successfully", async function () {
      const stepData = {
        stepName: "Integration Test Step",
        stepDescription: "A step created during integration testing",
        stepType: "CUTOVER",
        assignedTeamId: TEST_TEAM_ID,
        phaseId: TEST_PHASE_ID,
        priority: 5,
        estimatedDuration: 60,
        isActive: true,
      };

      const startTime = Date.now();

      try {
        const response = await fetch(`${STEPS_API_BASE}/instance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(stepData),
        });

        const responseTime = Date.now() - startTime;
        const responseText = await response.text();

        const result = {
          url: `${STEPS_API_BASE}/instance`,
          method: "POST",
          status: response.status,
          statusText: response.statusText,
          responseTime: responseTime,
          success: response.ok,
          payloadSize: JSON.stringify(stepData).length,
        };

        testResults.postEndpointTests.push(result);
        testResults.performanceTests.push(result);

        expect(response.status).toBe(201);
        expect(responseTime).toBeLessThan(51);

        const responseData = JSON.parse(responseText);

        // Validate DTO structure
        expect(responseData).toHaveProperty("stepId");
        expect(responseData).toHaveProperty("stepInstanceId");
        expect(responseData.stepName).toBe("Integration Test Step");
        expect(responseData.stepType).toBe("CUTOVER");
        expect(responseData.assignedTeamId).toBe(TEST_TEAM_ID);
        expect(responseData.phaseId).toBe(TEST_PHASE_ID);
        expect(responseData.priority).toBe(5);
        expect(responseData.estimatedDuration).toBe(60);
        expect(responseData.isActive).toBe(true);

        // Store for cleanup and further tests
        createdStepInstances.push(responseData.stepInstanceId);

        console.log(
          `  ✓ Step instance created successfully in ${responseTime}ms`,
        );
        console.log(`  ✓ Instance ID: ${responseData.stepInstanceId}`);
      } catch (error) {
        const result = {
          url: `${STEPS_API_BASE}/instance`,
          method: "POST",
          error: error.message,
          responseTime: Date.now() - startTime,
          success: false,
        };
        testResults.postEndpointTests.push(result);
        throw error;
      }
    });

    it("should create step instance with minimal required data", async function () {
      const minimalStepData = {
        stepName: "Minimal Integration Test Step",
        stepDescription: "Minimal step data test",
        stepType: "VALIDATION",
        assignedTeamId: TEST_TEAM_ID,
        phaseId: TEST_PHASE_ID,
      };

      const startTime = Date.now();

      const response = await fetch(`${STEPS_API_BASE}/instance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(minimalStepData),
      });

      const responseTime = Date.now() - startTime;
      const responseText = await response.text();

      const result = {
        url: `${STEPS_API_BASE}/instance`,
        method: "POST",
        testCase: "minimal_data",
        status: response.status,
        responseTime: responseTime,
        success: response.ok,
      };

      testResults.postEndpointTests.push(result);

      expect(response.status).toBe(201);
      expect(responseTime).toBeLessThan(51);

      const responseData = JSON.parse(responseText);

      // Validate defaults were applied (TD-003: Using MockStatusProvider)
      const defaultStatus = mockStatusProvider.getDefaultStatus("Step");
      expect(responseData.stepStatus).toBe(defaultStatus); // Default from MockStatusProvider
      expect(responseData.priority).toBe(5); // Default
      expect(responseData.isActive).toBe(true); // Default

      createdStepInstances.push(responseData.stepInstanceId);

      console.log(
        `  ✓ Minimal step instance created with defaults in ${responseTime}ms`,
      );
    });

    it("should handle missing required fields with proper error", async function () {
      const invalidStepData = {
        stepDescription: "Missing required fields",
        priority: 3,
      };

      const startTime = Date.now();

      const response = await fetch(`${STEPS_API_BASE}/instance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidStepData),
      });

      const responseTime = Date.now() - startTime;
      const responseText = await response.text();

      const result = {
        url: `${STEPS_API_BASE}/instance`,
        method: "POST",
        testCase: "missing_required_fields",
        status: response.status,
        responseTime: responseTime,
        success: response.status === 400,
      };

      testResults.errorHandlingTests.push(result);

      expect(response.status).toBe(400);

      const errorData = JSON.parse(responseText);
      expect(errorData).toHaveProperty("error");
      expect(errorData.error).toContain("required"); // Should mention missing required fields

      console.log(
        `  ✓ Proper error handling for missing fields in ${responseTime}ms`,
      );
    });

    it("should handle invalid UUID format with proper error", async function () {
      const invalidUuidStepData = {
        stepName: "Invalid UUID Test",
        stepDescription: "Testing invalid UUID handling",
        stepType: "CUTOVER",
        assignedTeamId: "not-a-valid-uuid",
        phaseId: "also-not-a-uuid",
      };

      const response = await fetch(`${STEPS_API_BASE}/instance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidUuidStepData),
      });

      const responseText = await response.text();

      const result = {
        url: `${STEPS_API_BASE}/instance`,
        method: "POST",
        testCase: "invalid_uuid",
        status: response.status,
        success: response.status === 400,
      };

      testResults.errorHandlingTests.push(result);

      expect(response.status).toBe(400);

      const errorData = JSON.parse(responseText);
      expect(errorData).toHaveProperty("error");
      expect(errorData.error.toLowerCase()).toContain("uuid"); // Should mention UUID format issue

      console.log("  ✓ Proper error handling for invalid UUID format");
    });
  });

  describe("2. PUT /steps/instance/{id} Endpoint Tests", function () {
    let testStepInstanceId;

    before(async function () {
      // Create a test step instance for update tests
      const stepData = {
        stepName: "Update Test Step",
        stepDescription: "Step to be updated during testing",
        stepType: "TECH",
        assignedTeamId: TEST_TEAM_ID,
        phaseId: TEST_PHASE_ID,
        priority: 7,
        estimatedDuration: 45,
      };

      const response = await fetch(`${STEPS_API_BASE}/instance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stepData),
      });

      const responseData = await response.json();
      testStepInstanceId = responseData.stepInstanceId;
      createdStepInstances.push(testStepInstanceId);

      console.log(
        `Setup: Created test step instance ${testStepInstanceId} for update tests`,
      );
    });

    it("should update existing step instance successfully", async function () {
      // TD-003: Using MockStatusProvider for status values
      const inProgressStatus = mockStatusProvider.getStatusNameById(2);
      const updateData = {
        stepName: "Updated Test Step Name",
        stepDescription: "Updated description for integration testing",
        stepStatus: inProgressStatus,
        priority: 2,
        estimatedDuration: 90,
      };

      const startTime = Date.now();

      const response = await fetch(
        `${STEPS_API_BASE}/instance/${testStepInstanceId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        },
      );

      const responseTime = Date.now() - startTime;
      const responseText = await response.text();

      const result = {
        url: `${STEPS_API_BASE}/instance/${testStepInstanceId}`,
        method: "PUT",
        status: response.status,
        responseTime: responseTime,
        success: response.ok,
      };

      testResults.putEndpointTests.push(result);
      testResults.performanceTests.push(result);

      expect(response.status).toBe(200);
      expect(responseTime).toBeLessThan(51);

      const responseData = JSON.parse(responseText);

      // Validate update was successful
      expect(responseData.stepInstanceId).toBe(testStepInstanceId);
      expect(responseData.stepName).toBe("Updated Test Step Name");
      expect(responseData.stepDescription).toBe(
        "Updated description for integration testing",
      );
      expect(responseData.stepStatus).toBe(inProgressStatus);
      expect(responseData.priority).toBe(2);
      expect(responseData.estimatedDuration).toBe(90);

      console.log(
        `  ✓ Step instance updated successfully in ${responseTime}ms`,
      );
    });

    it("should handle partial updates correctly", async function () {
      // TD-003: Using MockStatusProvider for status values
      const completedStatus = mockStatusProvider.getStatusNameById(3);
      const partialUpdateData = {
        stepStatus: completedStatus,
        priority: 1,
      };

      const startTime = Date.now();

      const response = await fetch(
        `${STEPS_API_BASE}/instance/${testStepInstanceId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(partialUpdateData),
        },
      );

      const responseTime = Date.now() - startTime;
      const responseData = await response.json();

      const result = {
        url: `${STEPS_API_BASE}/instance/${testStepInstanceId}`,
        method: "PUT",
        testCase: "partial_update",
        status: response.status,
        responseTime: responseTime,
        success: response.ok,
      };

      testResults.putEndpointTests.push(result);

      expect(response.status).toBe(200);

      // Validate partial update - only changed fields should be updated
      expect(responseData.stepStatus).toBe(completedStatus);
      expect(responseData.priority).toBe(1);
      // Other fields should remain unchanged from previous test
      expect(responseData.stepName).toBe("Updated Test Step Name");

      console.log(`  ✓ Partial update handled correctly in ${responseTime}ms`);
    });

    it("should handle non-existent step instance with 404", async function () {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const updateData = {
        stepName: "Should Not Update",
      };

      const response = await fetch(
        `${STEPS_API_BASE}/instance/${nonExistentId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updateData),
        },
      );

      const result = {
        url: `${STEPS_API_BASE}/instance/${nonExistentId}`,
        method: "PUT",
        testCase: "not_found",
        status: response.status,
        success: response.status === 404,
      };

      testResults.errorHandlingTests.push(result);

      expect(response.status).toBe(404);

      const errorData = await response.json();
      expect(errorData).toHaveProperty("error");
      expect(errorData.error.toLowerCase()).toContain("not found");

      console.log("  ✓ Proper 404 handling for non-existent step instance");
    });

    it("should handle invalid step instance ID format", async function () {
      const invalidId = "not-a-valid-uuid";
      const updateData = {
        stepName: "Invalid ID Test",
      };

      const response = await fetch(`${STEPS_API_BASE}/instance/${invalidId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const result = {
        url: `${STEPS_API_BASE}/instance/${invalidId}`,
        method: "PUT",
        testCase: "invalid_id_format",
        status: response.status,
        success: response.status === 400,
      };

      testResults.errorHandlingTests.push(result);

      expect(response.status).toBe(400);

      const errorData = await response.json();
      expect(errorData).toHaveProperty("error");
      expect(errorData.error.toLowerCase()).toContain("uuid");

      console.log("  ✓ Proper error handling for invalid UUID format");
    });

    it("should handle empty request body", async function () {
      const response = await fetch(
        `${STEPS_API_BASE}/instance/${testStepInstanceId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({}),
        },
      );

      const result = {
        url: `${STEPS_API_BASE}/instance/${testStepInstanceId}`,
        method: "PUT",
        testCase: "empty_body",
        status: response.status,
        success: response.status === 400,
      };

      testResults.errorHandlingTests.push(result);

      expect(response.status).toBe(400);

      console.log("  ✓ Proper error handling for empty request body");
    });
  });

  describe("3. DTO Validation and Structure Tests", function () {
    it("should return properly structured DTO response", async function () {
      const stepData = {
        stepName: "DTO Validation Test",
        stepDescription: "Testing DTO structure",
        stepType: "VALIDATION",
        assignedTeamId: TEST_TEAM_ID,
        phaseId: TEST_PHASE_ID,
        priority: 4,
      };

      const response = await fetch(`${STEPS_API_BASE}/instance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stepData),
      });

      const responseData = await response.json();
      createdStepInstances.push(responseData.stepInstanceId);

      const result = {
        testCase: "dto_structure_validation",
        dtoFields: Object.keys(responseData),
        success: true,
      };

      testResults.dtoValidationTests.push(result);

      // Validate all expected DTO fields are present
      const expectedFields = [
        "stepId",
        "stepInstanceId",
        "stepName",
        "stepDescription",
        "stepStatus",
        "stepType",
        "assignedTeamId",
        "phaseId",
        "priority",
        "isActive",
      ];

      for (const field of expectedFields) {
        expect(responseData).toHaveProperty(field);
      }

      // Validate field types
      expect(typeof responseData.stepInstanceId).toBe("string");
      expect(typeof responseData.stepName).toBe("string");
      expect(typeof responseData.priority).toBe("number");
      expect(typeof responseData.isActive).toBe("boolean");

      console.log("  ✓ DTO structure validation passed");
      console.log(
        `  ✓ DTO contains ${Object.keys(responseData).length} fields`,
      );
    });

    it("should handle type casting validation (ADR-031)", async function () {
      const stepDataWithStringNumbers = {
        stepName: "Type Casting Test",
        stepDescription: "Testing type casting",
        stepType: "TECH",
        assignedTeamId: TEST_TEAM_ID,
        phaseId: TEST_PHASE_ID,
        priority: "6", // String that should be cast to number
        estimatedDuration: "120", // String that should be cast to number
        isActive: "true", // String that should be cast to boolean
      };

      const response = await fetch(`${STEPS_API_BASE}/instance`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(stepDataWithStringNumbers),
      });

      const responseData = await response.json();
      createdStepInstances.push(responseData.stepInstanceId);

      const result = {
        testCase: "type_casting_adr031",
        inputTypes: {
          priority: typeof stepDataWithStringNumbers.priority,
          estimatedDuration: typeof stepDataWithStringNumbers.estimatedDuration,
          isActive: typeof stepDataWithStringNumbers.isActive,
        },
        outputTypes: {
          priority: typeof responseData.priority,
          estimatedDuration: typeof responseData.estimatedDuration,
          isActive: typeof responseData.isActive,
        },
        success: true,
      };

      testResults.dtoValidationTests.push(result);

      expect(response.status).toBe(201);

      // Validate proper type casting occurred
      expect(typeof responseData.priority).toBe("number");
      expect(responseData.priority).toBe(6);
      expect(typeof responseData.estimatedDuration).toBe("number");
      expect(responseData.estimatedDuration).toBe(120);
      expect(typeof responseData.isActive).toBe("boolean");
      expect(responseData.isActive).toBe(true);

      console.log("  ✓ Type casting validation (ADR-031) passed");
      console.log(
        "  ✓ String numbers and booleans properly cast to correct types",
      );
    });
  });

  describe("4. Performance Benchmarks", function () {
    it("should meet performance targets (<51ms)", async function () {
      const stepData = {
        stepName: "Performance Test Step",
        stepDescription: "Testing response time",
        stepType: "PERFORMANCE",
        assignedTeamId: TEST_TEAM_ID,
        phaseId: TEST_PHASE_ID,
      };

      // Test multiple requests to get average performance
      const performanceResults = [];
      const testIterations = 5;

      for (let i = 0; i < testIterations; i++) {
        const startTime = Date.now();

        const response = await fetch(`${STEPS_API_BASE}/instance`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...stepData,
            stepName: `Performance Test Step ${i + 1}`,
          }),
        });

        const responseTime = Date.now() - startTime;
        const responseData = await response.json();

        if (response.ok) {
          createdStepInstances.push(responseData.stepInstanceId);
        }

        performanceResults.push({
          iteration: i + 1,
          responseTime: responseTime,
          status: response.status,
          success: response.ok,
        });
      }

      const averageResponseTime =
        performanceResults.reduce((sum, r) => sum + r.responseTime, 0) /
        testIterations;
      const maxResponseTime = Math.max(
        ...performanceResults.map((r) => r.responseTime),
      );
      const minResponseTime = Math.min(
        ...performanceResults.map((r) => r.responseTime),
      );

      const result = {
        testCase: "performance_benchmark",
        iterations: testIterations,
        averageResponseTime: averageResponseTime,
        maxResponseTime: maxResponseTime,
        minResponseTime: minResponseTime,
        target: 51,
        success: averageResponseTime < 51,
        allResults: performanceResults,
      };

      testResults.performanceTests.push(result);

      expect(averageResponseTime).toBeLessThan(51);
      expect(maxResponseTime).toBeLessThan(100);

      console.log(`  ✓ Performance benchmark passed:`);
      console.log(`    Average: ${averageResponseTime.toFixed(2)}ms`);
      console.log(`    Min: ${minResponseTime}ms, Max: ${maxResponseTime}ms`);
      console.log(
        `    Target: < 51ms (${averageResponseTime < 51 ? mockStatusProvider.getStatusNameById(3) : mockStatusProvider.getStatusNameById(4)})`,
      );
    });
  });
});

/**
 * Generate recommendations based on test results
 */
function generateRecommendations(testResults) {
  const recommendations = [];

  // Performance recommendations
  const performanceTests = testResults.performanceTests || [];
  const slowTests = performanceTests.filter((t) => t.responseTime > 51);
  if (slowTests.length > 0) {
    recommendations.push({
      type: "performance",
      priority: "high",
      message: `${slowTests.length} API calls exceeded 51ms response time target`,
      details: slowTests.map(
        (t) => `${t.method} ${t.url}: ${t.responseTime}ms`,
      ),
    });
  }

  // Error handling recommendations
  const errorTests = testResults.errorHandlingTests || [];
  const failedErrorTests = errorTests.filter((t) => !t.success);
  if (failedErrorTests.length > 0) {
    recommendations.push({
      type: "error_handling",
      priority: "high",
      message: `${failedErrorTests.length} error handling tests failed`,
      details: failedErrorTests.map((t) => `${t.testCase}: Status ${t.status}`),
    });
  }

  // Success recommendations
  if (recommendations.length === 0) {
    recommendations.push({
      type: "success",
      priority: "info",
      message: "All integration tests passed successfully",
      details: [
        "API endpoints are functioning correctly",
        "Performance targets met",
        "Error handling working as expected",
      ],
    });
  }

  return recommendations;
}
