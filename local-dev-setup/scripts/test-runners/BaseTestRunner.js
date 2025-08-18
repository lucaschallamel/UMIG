import { execa } from "execa";
import chalk from "chalk";
import path from "path";
import fs from "fs";
import os from "os";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * BaseTestRunner - Foundation for all UMIG test execution
 * Provides common test execution patterns, logging, and result tracking
 *
 * Part of US-022 Integration Test Framework modernization
 * Replaces shell scripts with structured JavaScript runners
 */
export class BaseTestRunner {
  constructor(options = {}) {
    this.options = {
      verbose: false,
      timeout: 120000, // 2 minutes default
      sdkmanInit: true,
      logTimestamps: true,
      colorOutput: true,
      ...options,
    };

    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      failedTests: [],
      executionTime: 0,
    };

    this.projectRoot = this.findProjectRoot();
    
    // Centralized path configuration (PR #41 feedback - addressing hard-coded paths)
    this.paths = {
      projectRoot: this.projectRoot,
      testDir: process.env.TEST_DIR || path.join(this.projectRoot, "src/groovy/umig/tests"),
      envFile: process.env.ENV_FILE_PATH || path.join(this.projectRoot, "local-dev-setup", ".env"),
      sourceDir: path.join(this.projectRoot, "src/groovy"),
      umigDir: path.join(this.projectRoot, "src"),
      tempDir: process.env.TEMP_DIR || "/tmp/umig-integration-classes",
      jdbcDriver: null, // Set dynamically in findJDBCDriverPath()
    };
    
    // Backward compatibility
    this.testDir = this.paths.testDir;
    this.startTime = null;

    // Color setup
    this.colors = {
      success: chalk.green,
      error: chalk.red,
      warning: chalk.yellow,
      info: chalk.blue,
      header: chalk.magenta,
      dim: chalk.dim,
    };
  }

  /**
   * Find the project root directory by looking for key files
   */
  findProjectRoot() {
    let currentDir = __dirname;

    // Walk up directory tree looking for package.json in parent directories
    while (currentDir !== path.dirname(currentDir)) {
      const parentDir = path.dirname(currentDir);

      // Check for UMIG project markers
      const packageJsonPath = path.join(parentDir, "package.json");
      const srcGroovyPath = path.join(parentDir, "src/groovy/umig");

      try {
        if (fs.existsSync(packageJsonPath) && fs.existsSync(srcGroovyPath)) {
          return parentDir;
        }
      } catch (error) {
        // Continue searching
      }

      currentDir = parentDir;
    }

    // Fallback: assume we're in local-dev-setup and project root is parent
    return path.resolve(__dirname, "../../../");
  }

  /**
   * Execute a Groovy test file with proper error handling and logging
   */
  async executeGroovyTest(testFile, options = {}) {
    const testName = path.basename(testFile, ".groovy");
    const fullPath = path.isAbsolute(testFile)
      ? testFile
      : path.join(this.testDir, testFile);

    this.logTestStart(testName);

    const groovyArgs = this.buildGroovyArgs(fullPath, options);

    try {
      // Execute from project root so relative paths work correctly
      // This ensures the .env file can be found in local-dev-setup/
      const result = await execa("groovy", groovyArgs, {
        timeout: this.options.timeout,
        cwd: this.projectRoot,
        stdio: "pipe", // Always pipe to capture output
        env: {
          ...process.env,
          // Ensure the working directory is passed for .env file discovery
          PROJECT_ROOT: this.projectRoot,
        },
        reject: false, // Don't throw on non-zero exit codes, handle them manually
      });

      // Check exit code to determine success
      if (result.exitCode === 0) {
        this.logTestResult(testName, "PASSED", result.stdout);
        this.results.passed++;
        return { success: true, output: result.stdout, stderr: result.stderr };
      } else {
        // Test failed with non-zero exit code
        this.logTestResult(testName, "FAILED", result.stderr || result.stdout);
        this.results.failed++;
        this.results.failedTests.push(testName);
        return { success: false, error: result.stderr || result.stdout, exitCode: result.exitCode };
      }
    } catch (error) {
      this.logTestResult(testName, "FAILED", error.message);
      this.results.failed++;
      this.results.failedTests.push(testName);
      return { success: false, error: error.message, stderr: error.stderr };
    } finally {
      this.results.total++;
    }
  }

  /**
   * Build Groovy command arguments with proper classpath and options
   */
  buildGroovyArgs(testFile, options = {}) {
    const args = [];

    // Add XML Parser options to prevent classpath conflicts (ADR-036)
    const xmlParserOpts =
      "-Djavax.xml.parsers.SAXParserFactory=com.sun.org.apache.xerces.internal.jaxp.SAXParserFactoryImpl";
    args.push(xmlParserOpts);

    // Build classpath with JDBC driver and source
    const jdbcDriverPath = this.findJDBCDriverPath();
    const sourcePath = path.join(this.projectRoot, "src/groovy");
    
    // For integration tests, also add the umig directory structure to classpath
    // This allows Groovy to find compiled classes like AuthenticationHelper
    const umigPath = path.join(this.projectRoot, "src");

    // IMPORTANT: Use both src and src/groovy as classpath so package resolution works
    // This allows Groovy to find classes like umig.tests.integration.AuthenticationHelper
    let classpath = `${sourcePath}:${umigPath}`;
    
    // Add any pre-compiled classes from GROOVY_CLASSPATH
    if (process.env.GROOVY_CLASSPATH) {
      classpath = `${process.env.GROOVY_CLASSPATH}:${classpath}`;
    }
    
    if (jdbcDriverPath) {
      classpath = `${classpath}:${jdbcDriverPath}`;
    } else if (this.options.verbose) {
      console.log(
        this.colors.warning(
          "⚠️  PostgreSQL JDBC driver not found, using @Grab fallback",
        ),
      );
    }
    
    args.push("-cp", classpath);

    // Add the test file
    args.push(testFile);

    // Add any additional arguments
    if (options.args) {
      args.push(...options.args);
    }

    return args;
  }

  /**
   * Find PostgreSQL JDBC driver path from Groovy Grape cache
   */
  findJDBCDriverPath() {
    // Common locations for Groovy Grape PostgreSQL driver
    const possiblePaths = [
      path.join(
        os.homedir(),
        ".groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.3.jar",
      ),
      path.join(
        os.homedir(),
        ".groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.7.4.jar",
      ),
      path.join(
        os.homedir(),
        ".groovy/grapes/org.postgresql/postgresql/jars/postgresql-42.6.0.jar",
      ),
    ];

    for (const jdbcPath of possiblePaths) {
      if (fs.existsSync(jdbcPath)) {
        if (this.options.verbose) {
          console.log(this.colors.info(`✅ Found JDBC driver: ${jdbcPath}`));
        }
        return jdbcPath;
      }
    }

    return null;
  }

  /**
   * Initialize SDKMAN environment if available
   */
  async initializeSDKMAN() {
    const sdkmanInit = path.join(os.homedir(), ".sdkman/bin/sdkman-init.sh");

    if (fs.existsSync(sdkmanInit)) {
      if (this.options.verbose) {
        console.log(
          this.colors.info(
            "✅ SDKMAN found, Groovy environment should be consistent",
          ),
        );
      }

      // Note: SDKMAN initialization happens in shell environment
      // JavaScript process inherits the environment from parent shell
      return true;
    } else {
      if (this.options.verbose) {
        console.log(
          this.colors.warning("⚠️  SDKMAN not found, using system Groovy"),
        );
      }
      return false;
    }
  }

  /**
   * Execute multiple tests with batching and parallel execution options
   */
  async executeTestBatch(testFiles, options = {}) {
    const { parallel = false, maxConcurrency = 4 } = options;

    this.startTime = Date.now();
    this.logHeader(
      `Executing ${testFiles.length} tests ${parallel ? "in parallel" : "sequentially"}`,
    );

    if (parallel) {
      await this.executeTestsParallel(testFiles, maxConcurrency);
    } else {
      await this.executeTestsSequential(testFiles);
    }

    this.results.executionTime = Date.now() - this.startTime;
    this.logSummary();

    return this.results;
  }

  /**
   * Execute tests sequentially (default for integration tests)
   */
  async executeTestsSequential(testFiles) {
    for (const testFile of testFiles) {
      await this.executeGroovyTest(testFile);
    }
  }

  /**
   * Execute tests in parallel (for unit tests)
   */
  async executeTestsParallel(testFiles, maxConcurrency = 4) {
    const batches = this.createBatches(testFiles, maxConcurrency);

    for (const batch of batches) {
      const promises = batch.map((testFile) =>
        this.executeGroovyTest(testFile),
      );
      await Promise.allSettled(promises);
    }
  }

  /**
   * Create batches for parallel execution
   */
  createBatches(items, batchSize) {
    const batches = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  /**
   * Logging methods with consistent formatting
   */
  logHeader(message) {
    if (!this.options.colorOutput) {
      console.log(`\n=== ${message} ===`);
      return;
    }

    console.log("\n" + this.colors.header("=".repeat(60)));
    console.log(this.colors.header(`  ${message}`));
    console.log(this.colors.header("=".repeat(60)));
  }

  logTestStart(testName) {
    const timestamp = this.options.logTimestamps ? this.getTimestamp() : "";
    const message = `${timestamp}Running: ${testName}...`;

    if (this.options.colorOutput) {
      console.log(this.colors.info(message));
    } else {
      console.log(message);
    }
  }

  logTestResult(testName, status, details) {
    const timestamp = this.options.logTimestamps ? this.getTimestamp() : "";
    const statusIcon = status === "PASSED" ? "✅" : "❌";
    const message = `${timestamp}${statusIcon} ${status}: ${testName}`;

    if (this.options.colorOutput) {
      const colorFn =
        status === "PASSED" ? this.colors.success : this.colors.error;
      console.log(colorFn(message));

      if (status === "FAILED" && details && this.options.verbose) {
        console.log(this.colors.dim(`  Error: ${details}`));
      }
    } else {
      console.log(message);
      if (status === "FAILED" && details) {
        console.log(`  Error: ${details}`);
      }
    }
  }

  logSummary() {
    const duration = this.formatDuration(this.results.executionTime);
    const passRate =
      this.results.total > 0
        ? Math.round((this.results.passed / this.results.total) * 100)
        : 0;

    console.log("\n" + this.colors.header("=".repeat(40)));
    console.log(this.colors.header("  Test Results Summary"));
    console.log(this.colors.header("=".repeat(40)));

    console.log(`Total Tests: ${this.results.total}`);
    console.log(this.colors.success(`Passed: ${this.results.passed}`));
    console.log(this.colors.error(`Failed: ${this.results.failed}`));
    console.log(`Pass Rate: ${passRate}%`);
    console.log(`Execution Time: ${duration}`);

    if (this.results.failedTests.length > 0) {
      console.log("\n" + this.colors.error("Failed Tests:"));
      this.results.failedTests.forEach((test) => {
        console.log(this.colors.error(`  - ${test}`));
      });
    }

    // US-022 specific completion status
    if (passRate >= 80) {
      console.log(
        "\n" +
          this.colors.success("✅ US-022 Integration Test Expansion: COMPLETE"),
      );
    } else {
      console.log(
        "\n" +
          this.colors.warning(
            "⚠️  US-022 Integration Test Expansion: In Progress",
          ),
      );
    }
  }

  /**
   * Utility methods
   */
  getTimestamp() {
    return `[${new Date().toLocaleTimeString()}] `;
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  }

  /**
   * Get exit code based on test results
   */
  getExitCode() {
    return this.results.failed > 0 ? 1 : 0;
  }

  /**
   * Reset results for multiple test runs
   */
  reset() {
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      failedTests: [],
      executionTime: 0,
    };
    this.startTime = null;
  }
}

export default BaseTestRunner;
