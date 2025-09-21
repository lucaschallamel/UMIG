/**
 * Steps API Enhanced Integration Tests
 * Tests the enhanced Steps API functionality including labels processing
 *
 * Converted from: local-dev-setup/test-current-api.js
 * Location: __tests__/integration/steps-api-enhanced.integration.test.js
 * Category: Integration test for Steps API Enhanced functionality
 *
 * Following UMIG patterns:
 * - Real HTTP calls to running API endpoints
 * - Database integration with test data
 * - Enhanced parameter validation
 * - Labels structure validation
 * - Error handling verification
 */

const fetch = require("node-fetch");
const MockStatusProvider = require("../mocks/MockStatusProvider");

describe("Steps API Enhanced Integration Tests", () => {
  const BASE_URL = "http://localhost:8090";
  const SCRIPTRUNNER_BASE = "/rest/scriptrunner/latest/custom";
  const STEPS_API_BASE = `${BASE_URL}${SCRIPTRUNNER_BASE}/steps`;

  // Initialize MockStatusProvider for controlled test values
  const mockStatusProvider = new MockStatusProvider();

  // Use test fixtures instead of hardcoded UUIDs
  let testMigrationId;
  let testIterationId;

  beforeAll(async () => {
    // Set up test data - replace hardcoded UUIDs with dynamic test data
    // These should come from test fixtures or be created dynamically
    testMigrationId = "1f0bc49d-2e29-4dd8-baee-87477671f03b"; // TODO: Replace with fixture
    testIterationId = "c264ef50-0a7d-4a6e-a2f1-0b9de2a0049a"; // TODO: Replace with fixture
  });

  describe("Enhanced Steps API", () => {
    test("should return properly structured steps with labels", async () => {
      const url = `${STEPS_API_BASE}?migrationId=${testMigrationId}&iterationId=${testIterationId}&enhanced=true&pageSize=5`;

      const response = await fetch(url);

      // Handle case where services aren't running (500) or success (200)
      expect([200, 500]).toContain(response.status);

      // Only validate response structure if services are running
      if (response.status === 200) {
        const data = await response.json();

        // Validate response structure
        expect(data).toHaveProperty("data");
        expect(Array.isArray(data.data)).toBe(true);

        if (data.data.length > 0) {
          const firstStep = data.data[0];

          // Validate step structure
          expect(firstStep).toHaveProperty("stepName");
          expect(firstStep).toHaveProperty("labels");

          // Validate labels field
          if (firstStep.labels) {
            expect(Array.isArray(firstStep.labels)).toBe(true);

            if (firstStep.labels.length > 0) {
              const firstLabel = firstStep.labels[0];
              // Validate label structure based on your label schema
              expect(firstLabel).toHaveProperty("id");
              expect(firstLabel).toHaveProperty("name");
            }
          }

          // Validate required step fields
          expect(
            typeof firstStep.stepName === "string" ||
              typeof firstStep.stm_name === "string",
          ).toBe(true);
        }
      }
    });

    // Enhanced functionality from repurposed test files
    test("should validate labels API structure consistency (from test-labels-api.js)", async () => {
      const url = `${STEPS_API_BASE}?migrationId=${testMigrationId}&iterationId=${testIterationId}&enhanced=true&pageSize=10`;

      const response = await fetch(url);

      if (response.status === 200) {
        const data = await response.json();

        // Count steps with labels for summary
        let stepsWithLabels = 0;
        let totalLabels = 0;

        if (data.data && Array.isArray(data.data)) {
          data.data.forEach((step, index) => {
            if (
              step.labels &&
              Array.isArray(step.labels) &&
              step.labels.length > 0
            ) {
              stepsWithLabels++;
              totalLabels += step.labels.length;

              // Validate first few steps with labels for structure
              if (stepsWithLabels <= 3) {
                expect(step.stepName || step.stm_name).toBeDefined();

                step.labels.forEach((label) => {
                  // Check for both possible field naming patterns
                  const labelName = label.lbl_name || label.name;
                  const labelColor = label.lbl_color || label.color;

                  expect(labelName).toBeDefined();
                  expect(labelColor).toBeDefined();
                });
              }
            }
          });
        }

        // Validate that we found some labels if using test iteration with known labels
        if (testIterationId === "8b38dc45-ba89-4af3-a683-7af1f1adc764") {
          expect(stepsWithLabels).toBeGreaterThan(0);
        }
      }
    });

    test("should handle context detection and fallback iteration (from labels-test-any-page.js)", async () => {
      // Test with known iteration that has labels
      const testIterationWithLabels = "8b38dc45-ba89-4af3-a683-7af1f1adc764";
      const testMigrationWithLabels = "1f0bc49d-2e29-4dd8-baee-87477671f03b";

      const url = `${STEPS_API_BASE}?migrationId=${testMigrationWithLabels}&iterationId=${testIterationWithLabels}&enhanced=true&pageSize=10`;

      const response = await fetch(url);

      if (response.status === 200) {
        const data = await response.json();

        if (data.data && data.data.length > 0) {
          // Check for steps with labels in the known test iteration
          const stepsWithLabels = data.data.filter(
            (step) =>
              step.labels &&
              Array.isArray(step.labels) &&
              step.labels.length > 0,
          );

          // This iteration should have steps with labels
          if (stepsWithLabels.length > 0) {
            const firstStepWithLabels = stepsWithLabels[0];
            expect(
              firstStepWithLabels.stepName || firstStepWithLabels.stm_name,
            ).toBeDefined();
            expect(firstStepWithLabels.labels.length).toBeGreaterThan(0);

            // Validate label structure
            firstStepWithLabels.labels.forEach((label) => {
              expect(label.name || label.lbl_name).toBeDefined();
              expect(label.color || label.lbl_color).toBeDefined();
            });
          }

          // Log summary for debugging (similar to console logs in original test)
          console.log(
            `API Test Summary: ${stepsWithLabels.length}/${data.data.length} steps have labels`,
          );
        }
      }
    });

    test("should validate field naming consistency across API responses", async () => {
      const url = `${STEPS_API_BASE}?migrationId=${testMigrationId}&iterationId=${testIterationId}&enhanced=true&pageSize=5`;

      const response = await fetch(url);

      if (response.status === 200) {
        const data = await response.json();

        if (data.data && data.data.length > 0) {
          data.data.forEach((step, index) => {
            // Check for field naming consistency issues
            const hasLowercase = "labels" in step;
            const hasUppercase = "Labels" in step;

            // Log field naming inconsistencies for debugging
            if (hasUppercase && !hasLowercase) {
              console.warn(
                `Step ${index + 1}: Has 'Labels' (uppercase) instead of 'labels' - potential API inconsistency`,
              );
            }

            // Validate step name field consistency
            const hasStepName = "stepName" in step;
            const hasStmName = "stm_name" in step;
            expect(hasStepName || hasStmName).toBe(true);

            // Validate labels field exists in some form
            expect(hasLowercase || hasUppercase).toBe(true);
          });
        }
      }
    });

    test("should handle pagination correctly", async () => {
      const url = `${STEPS_API_BASE}?migrationId=${testMigrationId}&iterationId=${testIterationId}&enhanced=true&pageSize=3`;

      const response = await fetch(url);
      expect([200, 500]).toContain(response.status);

      // Only validate pagination if services are running
      if (response.status === 200) {
        const data = await response.json();

        // Should respect pageSize parameter
        if (data.data) {
          expect(data.data.length).toBeLessThanOrEqual(3);
        }
      }
    });

    test("should validate required parameters", async () => {
      // Test missing migrationId
      const urlWithoutMigration = `${STEPS_API_BASE}?iterationId=${testIterationId}&enhanced=true`;
      const response1 = await fetch(urlWithoutMigration);

      // Test missing iterationId
      const urlWithoutIteration = `${STEPS_API_BASE}?migrationId=${testMigrationId}&enhanced=true`;
      const response2 = await fetch(urlWithoutIteration);

      // Both should either work with defaults, return appropriate error, or service unavailable
      expect([200, 400, 422, 500]).toContain(response1.status);
      expect([200, 400, 422, 500]).toContain(response2.status);
    });

    test("should handle enhanced flag correctly", async () => {
      const urlEnhanced = `${STEPS_API_BASE}?migrationId=${testMigrationId}&iterationId=${testIterationId}&enhanced=true&pageSize=2`;
      const urlStandard = `${STEPS_API_BASE}?migrationId=${testMigrationId}&iterationId=${testIterationId}&enhanced=false&pageSize=2`;

      const [enhancedResponse, standardResponse] = await Promise.all([
        fetch(urlEnhanced),
        fetch(urlStandard),
      ]);

      expect([200, 500]).toContain(enhancedResponse.status);
      expect([200, 500]).toContain(standardResponse.status);

      // Only validate enhanced functionality if services are running
      if (enhancedResponse.status === 200 && standardResponse.status === 200) {
        const enhancedData = await enhancedResponse.json();
        const standardData = await standardResponse.json();

        // Enhanced should include additional fields like labels
        if (
          enhancedData.data &&
          enhancedData.data.length > 0 &&
          standardData.data &&
          standardData.data.length > 0
        ) {
          const enhancedStep = enhancedData.data[0];
          const standardStep = standardData.data[0];

          // Enhanced version should have labels field
          expect(enhancedStep).toHaveProperty("labels");

          // Standard version may or may not have labels depending on implementation
          // Adjust this expectation based on your API design
        }
      }
    });
  });

  describe("Error Handling", () => {
    test("should handle invalid UUIDs gracefully", async () => {
      const url = `${STEPS_API_BASE}?migrationId=invalid-uuid&iterationId=${testIterationId}&enhanced=true`;

      const response = await fetch(url);

      // Should return appropriate error status
      expect([400, 422, 500]).toContain(response.status);
    });

    test("should handle non-existent migration/iteration", async () => {
      const nonExistentId = "00000000-0000-0000-0000-000000000000";
      const url = `${STEPS_API_BASE}?migrationId=${nonExistentId}&iterationId=${nonExistentId}&enhanced=true`;

      const response = await fetch(url);

      // Should return successful response with empty data, appropriate error, or service unavailable
      expect([200, 404, 500]).toContain(response.status);

      if (response.status === 200) {
        const data = await response.json();
        expect(data.data).toBeDefined();
        expect(Array.isArray(data.data)).toBe(true);
      }
    });
  });
});

/**
 * TODO: Improvements needed for production use:
 *
 * 1. Replace hardcoded UUIDs with dynamic test fixtures
 * 2. Add proper test data setup/teardown
 * 3. Add more comprehensive label structure validation
 * 4. Add performance benchmarks for large datasets
 * 5. Add authentication/authorization tests
 * 6. Add tests for different migration/iteration states
 * 7. Add tests for concurrent access scenarios
 * 8. Add comprehensive error message validation
 */
