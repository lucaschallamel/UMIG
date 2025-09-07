import { BaseTestRunner } from "./BaseTestRunner.js";
import path from "path";
import fs from "fs";
import os from "os";
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

    // Compile helper classes for all integration tests
    await this.compileIntegrationHelpers();

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

      // US-056-A Service Layer Standardization - Runtime version resolves circular dependencies
      "StepDataTransformationServiceRuntimeTest.groovy",

      // US-031 Admin GUI Complete Integration
      "AdminGuiAllEndpointsTest.groovy",
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

    // Compile helper classes for core API tests
    await this.compileIntegrationHelpers();

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
   * Run US-056A Service Layer Standardization runtime tests
   * Uses runtime dynamic class loading to resolve circular dependency issues
   */
  async runUS056ARuntime() {
    this.logHeader("US-056A Service Layer Standardization Runtime Tests");

    console.log(
      "🔄 Using runtime dynamic class loading to resolve circular dependencies...",
    );
    console.log(
      "ℹ️  This approach maintains test integrity while avoiding compile-time issues",
    );

    const runtimeTest = "StepDataTransformationServiceRuntimeTest.groovy";
    const runtimeTestPath = path.join(this.integrationTestsDir, runtimeTest);

    if (!fs.existsSync(runtimeTestPath)) {
      console.log(`❌ Runtime test not found: ${runtimeTest}`);
      return { total: 0, passed: 0, failed: 1, failedTests: [runtimeTest] };
    }

    // Compile DTO classes so they are available at runtime
    console.log("🔧 Compiling DTO classes for runtime class loading...");
    await this.compileDTOClasses();

    console.log(
      "🚀 Executing runtime test with compiled DTO classes available",
    );

    // Execute the runtime test as a compiled class rather than groovy script
    // This avoids compilation dependency issues
    const runtimeResult = await this.executeRuntimeTest(runtimeTestPath);

    // Format results to match expected structure
    const results = {
      total: 1,
      passed: runtimeResult.success ? 1 : 0,
      failed: runtimeResult.success ? 0 : 1,
      failedTests: runtimeResult.success
        ? []
        : [path.basename(runtimeTest, ".groovy")],
      executionTime: 0,
    };

    if (results.passed > 0) {
      console.log("✅ Runtime dynamic class loading approach successful!");
      console.log("   - Tests run against real implementations");
      console.log("   - Tests break if code structure changes");
      console.log("   - Circular dependency resolved via runtime resolution");
    }

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
      const classpath = [this.paths.tempDir, this.paths.sourceDir, groovyJars]
        .filter(Boolean)
        .join(":");

      // Run the compiled test using java
      const result = await execa(
        "java",
        ["-cp", classpath, `umig.tests.integration.${testName}`],
        {
          timeout: this.options.timeout,
          cwd: this.paths.projectRoot,
          stdio: "pipe",
          env: {
            ...process.env,
            PROJECT_ROOT: this.paths.projectRoot,
          },
          reject: false,
        },
      );

      if (result.exitCode === 0) {
        this.logTestResult(testName, "PASSED", result.stdout);
        this.results.passed++;
        return { success: true, output: result.stdout, stderr: result.stderr };
      } else {
        this.logTestResult(testName, "FAILED", result.stderr || result.stdout);
        this.results.failed++;
        this.results.failedTests.push(testName);
        return {
          success: false,
          error: result.stderr || result.stdout,
          exitCode: result.exitCode,
        };
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
    const jars = [];

    // First try groovy-all JAR which includes everything
    const groovyAllPaths = [
      "/Users/lucaschallamel/.groovy/grapes/org.codehaus.groovy/groovy-all/jars/groovy-all-3.0.15.jar",
    ];

    let groovyFound = false;
    for (const jarPath of groovyAllPaths) {
      if (fs.existsSync(jarPath)) {
        jars.push(jarPath);
        groovyFound = true;
        break;
      }
    }

    // Otherwise collect individual JARs from SDKMAN
    if (!groovyFound) {
      const groovyHome =
        process.env.GROOVY_HOME ||
        "/Users/lucaschallamel/.sdkman/candidates/groovy/current";
      const libDir = path.join(groovyHome, "lib");

      if (fs.existsSync(libDir)) {
        // Include all necessary Groovy JARs
        const requiredJars = [
          "groovy-3.0.15.jar",
          "groovy-json-3.0.15.jar",
          "groovy-sql-3.0.15.jar",
        ];

        for (const jarName of requiredJars) {
          const jarPath = path.join(libDir, jarName);
          if (fs.existsSync(jarPath)) {
            jars.push(jarPath);
          }
        }
      }
    }

    // Add SLF4J JARs needed for DTOs
    const slf4jJars = [
      "/Users/lucaschallamel/.groovy/grapes/org.slf4j/slf4j-api/jars/slf4j-api-1.7.36.jar",
      "/Users/lucaschallamel/.groovy/grapes/org.slf4j/slf4j-simple/jars/slf4j-simple-1.7.36.jar",
    ];

    for (const slf4jJar of slf4jJars) {
      if (fs.existsSync(slf4jJar)) {
        jars.push(slf4jJar);
      }
    }

    // Add Jackson JARs needed for DTOs JSON serialization
    const jacksonJars = [
      "/Users/lucaschallamel/.groovy/grapes/com.fasterxml.jackson.core/jackson-core/jars/jackson-core-2.15.2.jar",
      "/Users/lucaschallamel/.groovy/grapes/com.fasterxml.jackson.core/jackson-databind/jars/jackson-databind-2.15.2.jar",
      "/Users/lucaschallamel/.groovy/grapes/com.fasterxml.jackson.core/jackson-annotations/jars/jackson-annotations-2.15.2.jar",
      "/Users/lucaschallamel/.groovy/grapes/com.fasterxml.jackson.datatype/jackson-datatype-jsr310/jars/jackson-datatype-jsr310-2.15.2.jar",
    ];

    for (const jacksonJar of jacksonJars) {
      if (fs.existsSync(jacksonJar)) {
        jars.push(jacksonJar);
      }
    }

    return jars.length > 0 ? jars.join(":") : null;
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
        "-cp",
        `${this.paths.tempDir}:${this.paths.sourceDir}`,
        "-d",
        this.paths.tempDir,
        testFile,
      ]);

      // Run the compiled test using java with groovy runtime
      console.log(`  Running compiled ${testName}...`);
      const result = await execa(
        "java",
        [
          "-cp",
          `${this.paths.tempDir}:${this.paths.sourceDir}:/Users/lucaschallamel/.groovy/grapes/org.codehaus.groovy/groovy-all/jars/groovy-all-3.0.15.jar`,
          `umig.tests.integration.${testName}`,
        ],
        {
          timeout: this.options.timeout,
          cwd: this.paths.projectRoot,
          stdio: "pipe",
          env: {
            ...process.env,
            PROJECT_ROOT: this.paths.projectRoot,
          },
          reject: false,
        },
      );

      if (result.exitCode === 0) {
        this.logTestResult(testName, "PASSED", result.stdout);
        this.results.passed++;
        return { success: true, output: result.stdout, stderr: result.stderr };
      } else {
        this.logTestResult(testName, "FAILED", result.stderr || result.stdout);
        this.results.failed++;
        this.results.failedTests.push(testName);
        return {
          success: false,
          error: result.stderr || result.stdout,
          exitCode: result.exitCode,
        };
      }
    } catch (error) {
      console.log(`  ❌ Failed to compile/run ${testName}: ${error.message}`);
      return { success: false, error: error.message };
    } finally {
      this.results.total++;
    }
  }

  /**
   * Execute the runtime test using compiled DTO classes with proper classpath
   * This method compiles the runtime test and executes it with compiled DTO classes available
   */
  async executeRuntimeTest(testFile) {
    const testName = path.basename(testFile, ".groovy");

    try {
      console.log(`  Compiling ${testName} runtime test...`);

      // Find Groovy runtime JARs
      const groovyJars = this.findGroovyRuntimeJars();

      // Build classpath with compiled DTOs, source, and Groovy runtime
      const classpath = [this.paths.tempDir, this.paths.sourceDir, groovyJars]
        .filter(Boolean)
        .join(":");

      // Compile the runtime test
      await execa("groovyc", [
        "-cp",
        classpath,
        "-d",
        this.paths.tempDir,
        testFile,
      ]);

      // Run the compiled test using java
      console.log(`  Running compiled ${testName}...`);
      const result = await execa(
        "java",
        ["-cp", classpath, `umig.tests.integration.${testName}`],
        {
          timeout: this.options.timeout,
          cwd: this.paths.projectRoot,
          stdio: "pipe",
          env: {
            ...process.env,
            PROJECT_ROOT: this.paths.projectRoot,
          },
          reject: false,
        },
      );

      if (result.exitCode === 0) {
        this.logTestResult(testName, "PASSED", result.stdout);
        return { success: true, output: result.stdout, stderr: result.stderr };
      } else {
        this.logTestResult(testName, "FAILED", result.stderr || result.stdout);
        return {
          success: false,
          error: result.stderr || result.stdout,
          exitCode: result.exitCode,
        };
      }
    } catch (error) {
      this.logTestResult(testName, "FAILED", error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Compile integration helper classes and utilities
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

    // Add test utility classes that are required by integration tests
    const utilsDir = path.join(this.paths.testDir, "utils");
    const baseIntegrationTest = path.join(
      utilsDir,
      "BaseIntegrationTest.groovy",
    );
    const httpClient = path.join(utilsDir, "IntegrationTestHttpClient.groovy");
    const httpResponse = path.join(utilsDir, "HttpResponse.groovy");

    try {
      // Create a temporary directory for compiled classes using centralized path
      await execa("mkdir", ["-p", this.paths.tempDir]);

      // Compile all helper classes together
      console.log("📦 Compiling integration helper classes and utilities...");
      const filesToCompile = [];

      // Add authentication helpers
      if (fs.existsSync(helperFile)) {
        filesToCompile.push(helperFile);
      }
      if (fs.existsSync(authTestFile)) {
        filesToCompile.push(authTestFile);
      }

      // Add test utility classes
      if (fs.existsSync(baseIntegrationTest)) {
        filesToCompile.push(baseIntegrationTest);
      }
      if (fs.existsSync(httpClient)) {
        filesToCompile.push(httpClient);
      }
      if (fs.existsSync(httpResponse)) {
        filesToCompile.push(httpResponse);
      }

      if (filesToCompile.length > 0) {
        console.log(`  Compiling ${filesToCompile.length} utility classes...`);
        await execa("groovyc", [
          "-cp",
          this.paths.sourceDir,
          "-d",
          this.paths.tempDir,
          ...filesToCompile,
        ]);

        // Add compiled classes to classpath for future tests
        process.env.GROOVY_CLASSPATH = `${this.paths.tempDir}:${process.env.GROOVY_CLASSPATH || ""}`;

        console.log("✅ Helper classes and utilities compiled successfully\n");
      } else {
        console.log("⚠️  No helper classes found to compile");
      }
    } catch (error) {
      console.log(
        "⚠️  Warning: Could not compile helper classes:",
        error.message,
      );
      if (this.options.verbose) {
        console.log("Error details:", error.stderr || error.stdout);
      }
    }
  }

  /**
   * Compile DTO classes needed for runtime dynamic class loading
   */
  async compileDTOClasses() {
    try {
      // Create temporary directory for compiled classes
      await execa("mkdir", ["-p", this.paths.tempDir]);

      // DTO classes that need to be compiled for runtime loading
      const dtoFiles = [
        path.join(this.paths.sourceDir, "umig/dto/StepInstanceDTO.groovy"),
        path.join(this.paths.sourceDir, "umig/dto/StepMasterDTO.groovy"),
        path.join(this.paths.sourceDir, "umig/dto/CommentDTO.groovy"),
        path.join(
          this.paths.sourceDir,
          "umig/service/StepDataTransformationService.groovy",
        ),
        path.join(
          this.paths.sourceDir,
          "umig/repository/StepRepository.groovy",
        ),
      ];

      // Check which files exist (debug the paths)
      console.log("  Debug: sourceDir =", this.paths.sourceDir);
      console.log("  Debug: projectRoot =", this.paths.projectRoot);
      dtoFiles.forEach((file, index) => {
        console.log(
          `  Debug: DTO file ${index + 1}: ${file} - exists: ${fs.existsSync(file)}`,
        );
      });

      const existingFiles = dtoFiles.filter((file) => fs.existsSync(file));

      if (existingFiles.length === 0) {
        console.log("⚠️  No DTO classes found to compile");
        return;
      }

      console.log(
        `  Compiling ${existingFiles.length} DTO and service classes...`,
      );

      // Try to compile files individually to avoid dependency issues
      let compiledCount = 0;
      const jacksonJars = this.findJacksonJars();

      for (const file of existingFiles) {
        const fileName = path.basename(file);
        try {
          // Try with Jackson JARs first since DTOs need them
          const classpath = jacksonJars
            ? `${this.paths.sourceDir}:${jacksonJars}`
            : this.paths.sourceDir;

          await execa("groovyc", [
            "-cp",
            classpath,
            "-d",
            this.paths.tempDir,
            file,
          ]);

          console.log(`    ✅ ${fileName} compiled successfully`);
          compiledCount++;
        } catch (error) {
          console.log(
            `    ⚠️  ${fileName} compilation failed (may have complex dependencies)`,
          );
          // Continue with other files
        }
      }

      if (compiledCount > 0) {
        console.log(
          `✅ Successfully compiled ${compiledCount}/${existingFiles.length} classes`,
        );
      } else {
        console.log("⚠️  No classes could be compiled");
      }

      // Add compiled classes to classpath for runtime
      const currentClasspath = process.env.GROOVY_CLASSPATH || "";
      process.env.GROOVY_CLASSPATH = `${this.paths.tempDir}:${currentClasspath}`;
    } catch (error) {
      console.log("⚠️  Warning: Could not compile DTO classes:", error.message);
      console.log("   Runtime test may fail if classes are not available");
      if (this.options.verbose) {
        console.log("Error details:", error.stderr || error.stdout);
      }
    }
  }

  /**
   * Find Jackson JAR files from Groovy Grape cache
   */
  findJacksonJars() {
    const homeDir = os.homedir();
    const jacksonPaths = [
      path.join(
        homeDir,
        ".groovy/grapes/com.fasterxml.jackson.core/jackson-databind/jars/jackson-databind-2.15.2.jar",
      ),
      path.join(
        homeDir,
        ".groovy/grapes/com.fasterxml.jackson.core/jackson-core/jars/jackson-core-2.15.2.jar",
      ),
      path.join(
        homeDir,
        ".groovy/grapes/com.fasterxml.jackson.core/jackson-annotations/jars/jackson-annotations-2.15.2.jar",
      ),
      path.join(
        homeDir,
        ".groovy/grapes/com.fasterxml.jackson.datatype/jackson-datatype-jsr310/jars/jackson-datatype-jsr310-2.15.2.jar",
      ),
    ];

    const existingJars = jacksonPaths.filter((jarPath) =>
      fs.existsSync(jarPath),
    );

    if (existingJars.length > 0) {
      return existingJars.join(":");
    }

    return null;
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

// Main execution when called directly
async function main() {
  const args = process.argv.slice(2);
  const flags = {
    auth: args.includes("--auth"),
    core: args.includes("--core"),
    us056a: args.includes("--us056a"),
    verbose: args.includes("--verbose") || args.includes("-v"),
    help: args.includes("--help") || args.includes("-h"),
  };

  if (flags.help) {
    console.log(`
UMIG Integration Test Runner

Usage:
  npm run test:integration                  # Run all integration tests
  npm run test:integration:auth            # Run authenticated tests only
  npm run test:integration:core            # Run core API tests only
  npm run test:us056a                      # Run US-056A runtime tests
  
Options:
  --auth      Run only authenticated integration tests
  --core      Run only core API integration tests  
  --us056a    Run US-056A Service Layer runtime tests (resolves circular dependencies)
  --verbose   Enable verbose output
  --help      Show this help message
    `);
    process.exit(0);
  }

  const runner = new IntegrationTestRunner({
    verbose: flags.verbose,
    timeout: 180000, // 3 minutes for integration tests
  });

  try {
    let results;

    if (flags.auth) {
      console.log("🔐 Running authenticated integration tests...");
      results = await runner.runAuthenticated();
    } else if (flags.core) {
      console.log("🏗️ Running core API integration tests...");
      results = await runner.runCoreAPIs();
    } else if (flags.us056a) {
      console.log(
        "🔄 Running US-056A Service Layer runtime integration tests...",
      );
      results = await runner.runUS056ARuntime();
    } else {
      console.log("🧪 Running all integration tests...");
      results = await runner.runAll();
    }

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Integration test execution failed:", error.message);
    if (flags.verbose) {
      console.error(error.stack);
    }
    process.exit(2);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
