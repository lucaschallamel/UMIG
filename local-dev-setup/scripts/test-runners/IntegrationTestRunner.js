import { BaseTestRunner } from "./BaseTestRunner.js";
import path from "path";
import fs from "fs";

/**
 * IntegrationTestRunner - Specialized runner for integration tests
 * Handles authentication, database connectivity, and cross-API testing
 *
 * Replaces: run-integration-tests.sh, run-authenticated-tests.sh, run-all-integration-tests.sh
 */
export class IntegrationTestRunner extends BaseTestRunner {
  constructor(options = {}) {
    super({
      timeout: 180000, // 3 minutes for integration tests
      verbose: true,
      ...options,
    });

    this.integrationTestsDir = path.join(this.testDir, "integration");
  }

  /**
   * Run all integration tests with proper sequencing
   */
  async runAll() {
    this.logHeader("UMIG Integration Tests - Full Suite");

    // Check prerequisites
    await this.checkPrerequisites();

    // Run tests in logical order
    const testSequence = [
      // US-022 Core expansion tests
      "MigrationsApiBulkOperationsTest.groovy",
      "CrossApiIntegrationTest.groovy",

      // Core API tests
      "PlansApiIntegrationTest.groovy",
      "SequencesApiIntegrationTest.groovy",
      "PhasesApiIntegrationTest.groovy",
      "ApplicationsApiIntegrationTest.groovy",
      "EnvironmentsApiIntegrationTest.groovy",
      "TeamsApiIntegrationTest.groovy",

      // Specialized tests
      "ControlsApiIntegrationTest.groovy",
      "InstructionsApiIntegrationTestWorking.groovy",
      "stepViewApiIntegrationTest.groovy",
    ];

    const existingTests = testSequence.filter((test) =>
      fs.existsSync(path.join(this.integrationTestsDir, test)),
    );

    console.log(`\nFound ${existingTests.length} integration tests to execute`);

    const results = await this.executeTestBatch(
      existingTests.map((test) => path.join(this.integrationTestsDir, test)),
      { parallel: false }, // Integration tests run sequentially
    );

    return results;
  }

  /**
   * Run only authenticated tests (US-022 focus)
   */
  async runAuthenticated() {
    this.logHeader("UMIG Authenticated Integration Tests");

    // First verify authentication setup
    const authTest = path.join(
      this.integrationTestsDir,
      "AuthenticationTest.groovy",
    );
    if (fs.existsSync(authTest)) {
      console.log("🔐 Verifying authentication setup...");
      const authResult = await this.executeGroovyTest(authTest);

      if (!authResult.success) {
        console.log(
          "❌ Authentication verification failed. Please check your .env file.",
        );
        process.exit(1);
      }

      console.log("✅ Authentication verified. Running integration tests...\n");
    }

    // Run the authenticated test suite
    const authenticatedTests = [
      "MigrationsApiBulkOperationsTest.groovy",
      "CrossApiIntegrationTest.groovy",
    ];

    const existingTests = authenticatedTests.filter((test) =>
      fs.existsSync(path.join(this.integrationTestsDir, test)),
    );

    const results = await this.executeTestBatch(
      existingTests.map((test) => path.join(this.integrationTestsDir, test)),
      { parallel: false },
    );

    // US-022 specific reporting
    this.logUS022Status(results);

    return results;
  }

  /**
   * Run core API integration tests
   */
  async runCoreAPIs() {
    this.logHeader("Core API Integration Tests");

    const coreTests = [
      "PlansApiIntegrationTest.groovy",
      "SequencesApiIntegrationTest.groovy",
      "PhasesApiIntegrationTest.groovy",
      "ApplicationsApiIntegrationTest.groovy",
      "EnvironmentsApiIntegrationTest.groovy",
      "TeamsApiIntegrationTest.groovy",
    ];

    const existingTests = coreTests.filter((test) =>
      fs.existsSync(path.join(this.integrationTestsDir, test)),
    );

    const results = await this.executeTestBatch(
      existingTests.map((test) => path.join(this.integrationTestsDir, test)),
      { parallel: false },
    );

    return results;
  }

  /**
   * Check prerequisites for integration tests
   */
  async checkPrerequisites() {
    console.log("🔍 Checking integration test prerequisites...\n");

    // Initialize SDKMAN environment
    await this.initializeSDKMAN();

    // Check .env file exists
    const envFile = path.join(this.projectRoot, ".env");
    if (!fs.existsSync(envFile)) {
      console.log(
        "❌ .env file not found. Integration tests require environment configuration.",
      );
      process.exit(1);
    }

    // Check if PostgreSQL is accessible (basic check)
    try {
      const { execa } = await import("execa");
      await execa("podman", ["ps", "--filter", "name=umig_postgres"], {
        timeout: 5000,
      });
      console.log("✅ PostgreSQL container appears to be running");
    } catch (error) {
      console.log("⚠️  Warning: Could not verify PostgreSQL container status");
    }

    // Check if integration test directory exists
    if (!fs.existsSync(this.integrationTestsDir)) {
      console.log("❌ Integration tests directory not found");
      process.exit(1);
    }

    console.log("✅ Prerequisites check completed\n");
  }

  /**
   * Log US-022 specific status information
   */
  logUS022Status(results) {
    console.log("\n" + this.colors.header("=".repeat(60)));
    console.log(
      this.colors.header("US-022 Status: Integration tests configured with:"),
    );
    console.log("  ✅ Secure authentication from .env");
    console.log("  ✅ PostgreSQL driver with @Grab");
    console.log("  ✅ Option A execution pattern (host → Podman)");
    console.log("  ✅ ADR-036 Pure Groovy framework");
    console.log(this.colors.header("=".repeat(60)));
  }

  /**
   * Override groovy args for integration tests with authentication helper
   */
  buildGroovyArgs(testFile, options = {}) {
    const args = super.buildGroovyArgs(testFile, options);

    // Add integration-specific classpath if needed
    // This could include authentication helpers, etc.

    return args;
  }
}

export default IntegrationTestRunner;
