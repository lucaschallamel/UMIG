import { BaseTestRunner } from "./BaseTestRunner.js";
import path from "path";
import fs from "fs";
import { execa } from "execa";

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
      verbose: false, // Capture output for proper error handling
      ...options,
    });

    // Use centralized path configuration from BaseTestRunner
    this.integrationTestsDir = path.join(this.paths.testDir, "integration");
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

    // First compile helper classes AND the authentication test for integration tests
    await this.compileIntegrationHelpers();

    // First verify authentication setup using compiled classes
    const authTest = path.join(
      this.integrationTestsDir,
      "AuthenticationTest.groovy",
    );
    if (fs.existsSync(authTest)) {
      console.log("🔐 Verifying authentication setup...");
      // Run the compiled test class
      const authResult = await this.executeCompiledAuthTest();

      if (!authResult.success) {
        console.log(
          "❌ Authentication verification failed. Please check your .env file.",
        );
        if (authResult.error) {
          console.log("Error details:", authResult.error);
        }
        if (authResult.exitCode) {
          console.log("Exit code:", authResult.exitCode);
        }
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
   * Execute the compiled AuthenticationTest
   */
  async executeCompiledAuthTest() {
    const testName = "AuthenticationTest";
    this.logTestStart(testName);
    
    try {
      // Find Groovy runtime JARs
      const groovyJars = this.findGroovyRuntimeJars();
      
      // Build complete classpath using centralized paths
      const classpath = [
        this.paths.tempDir,
        this.paths.sourceDir,
        groovyJars,
      ].filter(Boolean).join(":");
      
      // Run the compiled test using java
      const result = await execa("java", [
        "-cp", classpath,
        `umig.tests.integration.${testName}`,
      ], {
        timeout: this.options.timeout,
        cwd: this.paths.projectRoot,
        stdio: "pipe",
        env: {
          ...process.env,
          PROJECT_ROOT: this.paths.projectRoot,
        },
        reject: false,
      });
      
      if (result.exitCode === 0) {
        this.logTestResult(testName, "PASSED", result.stdout);
        this.results.passed++;
        return { success: true, output: result.stdout, stderr: result.stderr };
      } else {
        this.logTestResult(testName, "FAILED", result.stderr || result.stdout);
        this.results.failed++;
        this.results.failedTests.push(testName);
        return { success: false, error: result.stderr || result.stdout, exitCode: result.exitCode };
      }
    } catch (error) {
      this.logTestResult(testName, "FAILED", error.message);
      this.results.failed++;
      this.results.failedTests.push(testName);
      return { success: false, error: error.message };
    } finally {
      this.results.total++;
    }
  }
  
  /**
   * Find Groovy runtime JARs
   */
  findGroovyRuntimeJars() {
    // First try groovy-all JAR which includes everything
    const groovyAllPaths = [
      "/Users/lucaschallamel/.groovy/grapes/org.codehaus.groovy/groovy-all/jars/groovy-all-3.0.15.jar",
    ];
    
    for (const jarPath of groovyAllPaths) {
      if (fs.existsSync(jarPath)) {
        return jarPath;
      }
    }
    
    // Otherwise collect individual JARs from SDKMAN
    const groovyHome = process.env.GROOVY_HOME || "/Users/lucaschallamel/.sdkman/candidates/groovy/current";
    const libDir = path.join(groovyHome, "lib");
    
    if (fs.existsSync(libDir)) {
      // Include all necessary Groovy JARs
      const requiredJars = [
        "groovy-3.0.15.jar",
        "groovy-json-3.0.15.jar",
        "groovy-sql-3.0.15.jar",
      ];
      
      const jars = [];
      for (const jarName of requiredJars) {
        const jarPath = path.join(libDir, jarName);
        if (fs.existsSync(jarPath)) {
          jars.push(jarPath);
        }
      }
      
      if (jars.length > 0) {
        return jars.join(":");
      }
    }
    
    return null;
  }

  /**
   * Execute a test that needs compilation with helper classes
   */
  async executeCompiledTest(testFile) {
    const testName = path.basename(testFile, ".groovy");
    
    try {
      // Compile the test along with its dependencies using centralized paths
      console.log(`  Compiling ${testName}...`);
      await execa("groovyc", [
        "-cp", `${this.paths.tempDir}:${this.paths.sourceDir}`,
        "-d", this.paths.tempDir,
        testFile,
      ]);
      
      // Run the compiled test using java with groovy runtime
      console.log(`  Running compiled ${testName}...`);
      const result = await execa("java", [
        "-cp", `${this.paths.tempDir}:${this.paths.sourceDir}:/Users/lucaschallamel/.groovy/grapes/org.codehaus.groovy/groovy-all/jars/groovy-all-3.0.15.jar`,
        `umig.tests.integration.${testName}`,
      ], {
        timeout: this.options.timeout,
        cwd: this.paths.projectRoot,
        stdio: "pipe",
        env: {
          ...process.env,
          PROJECT_ROOT: this.paths.projectRoot,
        },
        reject: false,
      });
      
      if (result.exitCode === 0) {
        this.logTestResult(testName, "PASSED", result.stdout);
        this.results.passed++;
        return { success: true, output: result.stdout, stderr: result.stderr };
      } else {
        this.logTestResult(testName, "FAILED", result.stderr || result.stdout);
        this.results.failed++;
        this.results.failedTests.push(testName);
        return { success: false, error: result.stderr || result.stdout, exitCode: result.exitCode };
      }
    } catch (error) {
      console.log(`  ❌ Failed to compile/run ${testName}: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      this.results.total++;
    }
  }

  /**
   * Compile integration helper classes
   */
  async compileIntegrationHelpers() {
    const helperFile = path.join(
      this.integrationTestsDir,
      "AuthenticationHelper.groovy",
    );
    const authTestFile = path.join(
      this.integrationTestsDir,
      "AuthenticationTest.groovy",
    );
    
    try {
      // Create a temporary directory for compiled classes using centralized path
      await execa("mkdir", ["-p", this.paths.tempDir]);
      
      // Compile both AuthenticationHelper and AuthenticationTest together
      console.log("📦 Compiling integration helper classes...");
      const filesToCompile = [];
      if (fs.existsSync(helperFile)) {
        filesToCompile.push(helperFile);
      }
      if (fs.existsSync(authTestFile)) {
        filesToCompile.push(authTestFile);
      }
      
      if (filesToCompile.length > 0) {
        await execa("groovyc", [
          "-cp", this.paths.sourceDir,
          "-d", this.paths.tempDir,
          ...filesToCompile,
        ]);
        
        // Add compiled classes to classpath for future tests
        process.env.GROOVY_CLASSPATH = `${this.paths.tempDir}:${process.env.GROOVY_CLASSPATH || ''}`;
        
        console.log("✅ Helper classes compiled successfully\n");
      }
    } catch (error) {
      console.log("⚠️  Warning: Could not compile helper classes:", error.message);
    }
  }

  /**
   * Check prerequisites for integration tests
   */
  async checkPrerequisites() {
    console.log("🔍 Checking integration test prerequisites...\n");

    // Initialize SDKMAN environment
    await this.initializeSDKMAN();

    // Check .env file exists using centralized path
    if (!fs.existsSync(this.paths.envFile)) {
      console.log(
        "❌ .env file not found. Integration tests require environment configuration.",
      );
      console.log(`  Looking for: ${this.paths.envFile}`);
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
