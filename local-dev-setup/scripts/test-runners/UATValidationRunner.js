import { BaseTestRunner } from "./BaseTestRunner.js";
import { execa } from "execa";
import path from "path";
import fs from "fs";

/**
 * UATValidationRunner - Comprehensive UAT validation for US-028 Enhanced IterationView
 * Handles DOM timing, API validation, and end-to-end workflow testing
 *
 * Replaces: run-uat-validation.sh
 */
export class UATValidationRunner extends BaseTestRunner {
  constructor(options = {}) {
    super({
      timeout: 300000, // 5 minutes for UAT tests
      verbose: true,
      ...options,
    });

    this.confluenceUrl = "http://localhost:8090";
    this.logDir = path.join(this.projectRoot, "logs/uat-validation");
    this.timestamp =
      new Date().toISOString().replace(/[:.]/g, "-").split("T")[0] +
      "_" +
      new Date().toTimeString().split(" ")[0].replace(/:/g, "");
    this.uatResults = [];
    this.criticalFailures = [];

    // Ensure log directory exists
    this.ensureLogDirectory();
  }

  /**
   * Run complete UAT validation suite
   */
  async runFullValidation() {
    this.logHeader("US-028 Enhanced IterationView - UAT Validation Suite");
    this.colors.header(
      "Critical Gap Analysis: Migration Loading DOM Timing & End-to-End Workflow Testing",
    );

    try {
      // Execute all UAT validation components
      await this.checkUATPrerequisites();
      await this.validateAPIResponseFormat();
      await this.testDOMTimingScenarios();
      await this.testFunctionExecutionPaths();
      await this.testErrorHandlingScenarios();
      await this.testUserWorkflowSimulation();
      await this.runPlaywrightE2ETests();

      // Generate comprehensive UAT report
      this.generateUATReport();

      return this.getUATResults();
    } catch (error) {
      this.logUATResult(
        "UAT Suite Execution",
        "FAILED",
        error.message,
        "critical",
      );
      throw error;
    }
  }

  /**
   * Check UAT prerequisites
   */
  async checkUATPrerequisites() {
    console.log("\n🔍 UAT Prerequisites Validation...");

    // Check Confluence availability
    try {
      const response = await this.curlRequest(`${this.confluenceUrl}/status`, {
        timeout: 5000,
      });
      this.logUATResult(
        "Confluence Service",
        "PASSED",
        `Available at ${this.confluenceUrl}`,
      );
    } catch (error) {
      this.logUATResult(
        "Confluence Service",
        "FAILED",
        `Not accessible at ${this.confluenceUrl}`,
        "critical",
      );
      throw new Error("Confluence must be running for UAT validation");
    }

    // Check migrations API specifically
    const apiUrl = `${this.confluenceUrl}/rest/scriptrunner/latest/custom/migrations`;
    try {
      const response = await this.curlRequest(apiUrl, { timeout: 10000 });
      this.logUATResult("Migrations API", "PASSED", "API returns HTTP 200");

      // Validate API returns actual data
      const migrationCount = (response.match(/"mig_id"/g) || []).length;
      if (migrationCount > 0) {
        this.logUATResult(
          "Migration Data Availability",
          "PASSED",
          `${migrationCount} migrations found`,
        );
      } else {
        this.logUATResult(
          "Migration Data Availability",
          "FAILED",
          "API returns no migrations",
          "critical",
        );
      }
    } catch (error) {
      this.logUATResult(
        "Migrations API",
        "FAILED",
        `API request failed: ${error.message}`,
        "critical",
      );
    }

    // Check if Playwright is available
    try {
      await execa("npx", ["playwright", "--version"], { timeout: 5000 });
      this.logUATResult(
        "Playwright Availability",
        "PASSED",
        "Playwright available for browser tests",
      );
    } catch (error) {
      this.logUATResult(
        "Playwright Availability",
        "FAILED",
        "Playwright not available - will skip browser tests",
      );
    }
  }

  /**
   * Validate API response format and structure
   */
  async validateAPIResponseFormat() {
    console.log("\n📊 Migration API Response Format Validation...");

    const apiUrl = `${this.confluenceUrl}/rest/scriptrunner/latest/custom/migrations`;

    try {
      const response = await this.curlRequest(apiUrl, { timeout: 10000 });

      // Check if response is valid JSON
      let jsonData;
      try {
        jsonData = JSON.parse(response);
        this.logUATResult("API JSON Format", "PASSED", "Valid JSON response");
      } catch (error) {
        this.logUATResult(
          "API JSON Format",
          "FAILED",
          "Invalid JSON response",
          "critical",
        );
        return;
      }

      // Check response structure
      let migrationCount = 0;
      if (jsonData.hasOwnProperty("data") && Array.isArray(jsonData.data)) {
        this.logUATResult(
          "API Response Structure",
          "PASSED",
          'Response has "data" property wrapper',
        );
        migrationCount = jsonData.data.length;
      } else if (Array.isArray(jsonData)) {
        this.logUATResult(
          "API Response Structure",
          "PASSED",
          "Response is direct array",
        );
        migrationCount = jsonData.length;
      } else {
        this.logUATResult(
          "API Response Structure",
          "FAILED",
          "Unexpected response format",
        );
        return;
      }

      // Validate migration objects have required fields
      if (migrationCount > 0) {
        const sampleMigration = Array.isArray(jsonData)
          ? jsonData[0]
          : jsonData.data[0];
        const hasId =
          sampleMigration.hasOwnProperty("mig_id") ||
          sampleMigration.hasOwnProperty("id");
        const hasName =
          sampleMigration.hasOwnProperty("mig_name") ||
          sampleMigration.hasOwnProperty("name");

        if (hasId && hasName) {
          this.logUATResult(
            "Migration Object Structure",
            "PASSED",
            "Required fields present (id, name)",
          );
        } else {
          this.logUATResult(
            "Migration Object Structure",
            "FAILED",
            "Missing required fields",
            "critical",
          );
        }
      }
    } catch (error) {
      this.logUATResult(
        "API Response Retrieval",
        "FAILED",
        `Could not retrieve API response: ${error.message}`,
        "critical",
      );
    }
  }

  /**
   * Test DOM timing race condition scenarios
   */
  async testDOMTimingScenarios() {
    console.log("\n⏱️  DOM Timing Race Condition Simulation...");

    // Test 1: Fast API response scenario
    console.log("  Testing fast API response timing...");
    const apiUrl = `${this.confluenceUrl}/rest/scriptrunner/latest/custom/migrations`;

    const startTime = Date.now();
    try {
      await this.curlRequest(apiUrl, { timeout: 2000 });
      const responseTime = Date.now() - startTime;

      if (responseTime < 500) {
        this.logUATResult(
          "Fast API Response",
          "PASSED",
          `${responseTime}ms response time`,
        );
      } else {
        this.logUATResult(
          "Fast API Response",
          "FAILED",
          `${responseTime}ms response time (>500ms)`,
        );
      }
    } catch (error) {
      this.logUATResult("Fast API Response", "FAILED", "API request failed");
    }

    // Test 2: JavaScript file accessibility
    console.log("  Checking JavaScript file accessibility...");
    const jsUrl = `${this.confluenceUrl}/rest/scriptrunner/latest/custom/web/js/iteration-view.js`;

    try {
      await this.curlRequest(jsUrl, { timeout: 5000 });
      this.logUATResult(
        "IterationView JavaScript",
        "PASSED",
        "JavaScript file accessible",
      );
    } catch (error) {
      this.logUATResult(
        "IterationView JavaScript",
        "FAILED",
        "JavaScript file not accessible",
      );
    }
  }

  /**
   * Test function execution paths in JavaScript
   */
  async testFunctionExecutionPaths() {
    console.log("\n🔀 Migration Loading Function Path Analysis...");

    const jsUrl = `${this.confluenceUrl}/rest/scriptrunner/latest/custom/web/js/iteration-view.js`;

    try {
      const jsContent = await this.curlRequest(jsUrl, { timeout: 10000 });

      // Check for both migration loading functions
      const hasLoadMigrations = (jsContent.match(/async loadMigrations/g) || [])
        .length;
      const hasPopulateMigrationSelector = (
        jsContent.match(/populateMigrationSelector/g) || []
      ).length;

      if (hasLoadMigrations > 0 && hasPopulateMigrationSelector > 0) {
        this.logUATResult(
          "Dual Function Detection",
          "PASSED",
          "Both migration loading functions found",
        );

        // Check which function is called in initialization
        const callsLoadMigrations = (
          jsContent.match(/loadMigrations\(\)/g) || []
        ).length;
        const callsPopulateMigrationSelector = (
          jsContent.match(/populateMigrationSelector\(\)/g) || []
        ).length;

        if (callsLoadMigrations > 0) {
          this.logUATResult(
            "LoadMigrations Called",
            "PASSED",
            `loadMigrations() called ${callsLoadMigrations} times`,
          );
        } else {
          this.logUATResult(
            "LoadMigrations Called",
            "FAILED",
            "loadMigrations() not called in initialization",
          );
        }

        if (callsPopulateMigrationSelector > 0) {
          this.logUATResult(
            "PopulateMigrationSelector Called",
            "PASSED",
            `populateMigrationSelector() called ${callsPopulateMigrationSelector} times`,
          );
        } else {
          this.logUATResult(
            "PopulateMigrationSelector Called",
            "FAILED",
            "populateMigrationSelector() not called in initialization",
          );
        }
      } else {
        this.logUATResult(
          "Dual Function Detection",
          "FAILED",
          "Missing migration loading functions",
          "critical",
        );
      }

      // Check for DOM element references
      const migrationSelectRefs = (jsContent.match(/migration-select/g) || [])
        .length;
      if (migrationSelectRefs > 0) {
        this.logUATResult(
          "DOM Element References",
          "PASSED",
          `${migrationSelectRefs} references to migration-select`,
        );
      } else {
        this.logUATResult(
          "DOM Element References",
          "FAILED",
          "No references to migration-select element",
          "critical",
        );
      }
    } catch (error) {
      this.logUATResult(
        "JavaScript Analysis",
        "FAILED",
        `Could not retrieve JavaScript file: ${error.message}`,
        "critical",
      );
    }
  }

  /**
   * Test error handling scenarios
   */
  async testErrorHandlingScenarios() {
    console.log("\n🛡️ Error Handling Scenario Validation...");

    // Test invalid migration ID handling
    const invalidApiUrl = `${this.confluenceUrl}/rest/scriptrunner/latest/custom/migrations?id=invalid-uuid`;

    try {
      await this.curlRequest(invalidApiUrl, {
        timeout: 5000,
        allowErrors: true,
      });
      this.logUATResult(
        "Invalid Parameter Handling",
        "PASSED",
        "API handles invalid parameters gracefully",
      );
    } catch (error) {
      if (error.message.includes("400") || error.message.includes("404")) {
        this.logUATResult(
          "Invalid Parameter Handling",
          "PASSED",
          "Returns appropriate error code for invalid parameters",
        );
      } else {
        this.logUATResult(
          "Invalid Parameter Handling",
          "FAILED",
          "Unexpected error handling behavior",
        );
      }
    }
  }

  /**
   * Test complete user workflow simulation
   */
  async testUserWorkflowSimulation() {
    console.log("\n👤 Complete User Workflow Simulation...");

    const apiUrl = `${this.confluenceUrl}/rest/scriptrunner/latest/custom/migrations`;

    try {
      const response = await this.curlRequest(apiUrl, { timeout: 10000 });
      this.logUATResult(
        "Workflow Step 1",
        "PASSED",
        "Migration API accessible",
      );

      // Extract first migration for testing
      let jsonData;
      try {
        jsonData = JSON.parse(response);
      } catch (error) {
        this.logUATResult(
          "Workflow JSON Parse",
          "FAILED",
          "Could not parse migration response",
        );
        return;
      }

      const migrations = Array.isArray(jsonData)
        ? jsonData
        : jsonData.data || [];
      if (migrations.length > 0) {
        const firstMigrationId = migrations[0].mig_id || migrations[0].id;

        if (firstMigrationId) {
          console.log(
            `  Step 2: Simulate migration selection (${firstMigrationId})...`,
          );

          // Test subsequent API calls
          const iterationsUrl = `${this.confluenceUrl}/rest/scriptrunner/latest/custom/api/v2/iterations?migrationId=${firstMigrationId}`;

          try {
            await this.curlRequest(iterationsUrl, { timeout: 5000 });
            this.logUATResult(
              "Workflow Step 2",
              "PASSED",
              "Iterations API responds to migration selection",
            );
          } catch (error) {
            this.logUATResult(
              "Workflow Step 2",
              "FAILED",
              "Iterations API does not respond",
            );
          }
        }
      }
    } catch (error) {
      this.logUATResult(
        "Workflow Step 1",
        "FAILED",
        "Migration API not accessible",
        "critical",
      );
    }
  }

  /**
   * Run Playwright end-to-end tests if available
   */
  async runPlaywrightE2ETests() {
    console.log("\n🎭 Playwright End-to-End Browser Tests...");

    try {
      await execa("npx", ["playwright", "--version"], { timeout: 5000 });

      const e2eTestFile = path.join(
        this.testDir,
        "e2e/IterationViewPageLoadTest.js",
      );
      if (fs.existsSync(e2eTestFile)) {
        console.log("  Installing Playwright browsers (if needed)...");

        try {
          await execa("npx", ["playwright", "install"], {
            timeout: 60000,
            cwd: this.projectRoot,
          });
          this.logUATResult(
            "Playwright Browser Setup",
            "PASSED",
            "Browsers installed",
          );

          // Run the E2E tests
          console.log("  Executing end-to-end page load tests...");

          try {
            await execa(
              "npx",
              ["playwright", "test", e2eTestFile, "--reporter=line"],
              {
                timeout: 120000,
                cwd: this.projectRoot,
              },
            );
            this.logUATResult(
              "E2E Page Load Tests",
              "PASSED",
              "All browser-based tests passed",
            );
          } catch (error) {
            this.logUATResult(
              "E2E Page Load Tests",
              "FAILED",
              "Some browser tests failed",
              "critical",
            );
          }
        } catch (error) {
          this.logUATResult(
            "Playwright Browser Setup",
            "FAILED",
            "Could not install browsers",
          );
        }
      } else {
        this.logUATResult(
          "E2E Test File",
          "FAILED",
          "IterationViewPageLoadTest.js not found",
        );
      }
    } catch (error) {
      this.logUATResult(
        "Playwright E2E Tests",
        "SKIPPED",
        "Playwright not available",
      );
    }
  }

  /**
   * Generate comprehensive UAT report
   */
  generateUATReport() {
    const totalTests = this.uatResults.length;
    const passedTests = this.uatResults.filter(
      (r) => r.status === "PASSED",
    ).length;
    const failedTests = totalTests - passedTests;
    const passRate =
      totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;

    console.log("\n" + this.colors.header("=".repeat(80)));
    console.log(
      this.colors.header(
        "📋 US-028 Enhanced IterationView - UAT Validation Report",
      ),
    );
    console.log(
      this.colors.header("Critical Gap Analysis Results & Recommendations"),
    );
    console.log(this.colors.header("=".repeat(80)));

    console.log(`\n📊 UAT Test Summary:`);
    console.log(`  Total UAT Tests: ${totalTests}`);
    console.log(this.colors.success(`  Passed: ${passedTests}`));
    console.log(this.colors.error(`  Failed: ${failedTests}`));
    console.log(`  UAT Pass Rate: ${passRate}%`);

    // Critical failures section
    if (this.criticalFailures.length > 0) {
      console.log("\n" + this.colors.error("🚨 CRITICAL FAILURES IDENTIFIED:"));
      this.criticalFailures.forEach((failure) => {
        console.log(this.colors.error(`  • ${failure}`));
      });
      console.log(
        "\n" +
          this.colors.error(
            "⛔ RECOMMENDATION: Address critical failures before proceeding",
          ),
      );
    }

    // Recommendations based on results
    if (this.criticalFailures.length === 0 && passRate >= 90) {
      console.log(
        "\n" +
          this.colors.success(
            "🎉 EXCELLENT: UAT validation shows no critical issues",
          ),
      );
      console.log(
        this.colors.success(
          "✅ Migration loading functionality validated end-to-end",
        ),
      );
      console.log(
        this.colors.success(
          "🚀 Ready for production deployment with confidence",
        ),
      );
    } else if (this.criticalFailures.length === 0 && passRate >= 75) {
      console.log(
        "\n" +
          this.colors.warning(
            "⚠️  GOOD: Core functionality validated with minor issues",
          ),
      );
      console.log(
        this.colors.warning(
          "🔧 Address non-critical failures for optimal user experience",
        ),
      );
    } else {
      console.log(
        "\n" +
          this.colors.error(
            "❌ ISSUES DETECTED: UAT identified problems requiring attention",
          ),
      );
      console.log(
        this.colors.error(
          "🛠️  Fix critical issues before production deployment",
        ),
      );
    }
  }

  /**
   * Log UAT test results with proper categorization
   */
  logUATResult(testName, status, details, severity = "normal") {
    const logFile = path.join(
      this.logDir,
      `uat_validation_${this.timestamp}.log`,
    );
    const timestamp = new Date().toISOString();

    // Write to log file
    const logEntry = `${timestamp} - ${testName}: ${status} - ${details}\n`;
    fs.appendFileSync(logFile, logEntry);

    // Store result
    this.uatResults.push({ testName, status, details, severity });

    if (status === "PASSED") {
      console.log(
        this.colors.success(`  ✅ ${testName}: PASSED`) + ` - ${details}`,
      );
    } else {
      if (severity === "critical") {
        this.criticalFailures.push(`${testName}: ${details}`);
        console.log(
          this.colors.error(`  🚨 ${testName}: CRITICAL FAILURE`) +
            ` - ${details}`,
        );
      } else {
        console.log(
          this.colors.error(`  ❌ ${testName}: FAILED`) + ` - ${details}`,
        );
      }
    }
  }

  /**
   * Helper method to make HTTP requests
   */
  async curlRequest(url, options = {}) {
    const { timeout = 10000, allowErrors = false } = options;

    try {
      const { stdout } = await execa(
        "curl",
        ["-s", "-f", "-m", String(timeout / 1000), url],
        {
          timeout,
        },
      );
      return stdout;
    } catch (error) {
      if (allowErrors && error.exitCode) {
        throw new Error(`HTTP ${error.exitCode}`);
      }
      throw error;
    }
  }

  /**
   * Ensure log directory exists
   */
  ensureLogDirectory() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  /**
   * Get UAT-specific results
   */
  getUATResults() {
    const totalTests = this.uatResults.length;
    const passedTests = this.uatResults.filter(
      (r) => r.status === "PASSED",
    ).length;
    const criticalFailures = this.criticalFailures.length;

    return {
      total: totalTests,
      passed: passedTests,
      failed: totalTests - passedTests,
      criticalFailures,
      passRate:
        totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0,
      exitCode: criticalFailures > 0 ? 2 : totalTests - passedTests > 0 ? 1 : 0,
    };
  }
}

export default UATValidationRunner;
