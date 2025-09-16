#!/usr/bin/env node

/**
 * Enhanced Groovy Test Runner
 * Automatically configures JDBC classpath and runs Groovy integration tests
 *
 * Addresses PostgreSQL driver issues by:
 * 1. Auto-downloading JDBC driver if missing
 * 2. Setting proper classpath before test execution
 * 3. Providing clear error messages and troubleshooting
 */

import { execSync, spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GroovyTestRunner {
  constructor() {
    this.projectRoot = path.resolve(__dirname, "../../");
    this.jdbcDir = path.join(__dirname, "../jdbc-drivers");
    this.postgresqlJar = path.join(this.jdbcDir, "postgresql-42.7.3.jar");
  }

  /**
   * Check if JDBC setup is complete
   */
  checkJdbcSetup() {
    console.log("🔍 Checking JDBC setup...");

    if (!fs.existsSync(this.jdbcDir)) {
      console.log("❌ JDBC directory not found");
      return false;
    }

    if (!fs.existsSync(this.postgresqlJar)) {
      console.log("❌ PostgreSQL JDBC driver not found");
      return false;
    }

    console.log("✅ JDBC setup verified");
    return true;
  }

  /**
   * Setup JDBC if missing
   */
  async setupJdbc() {
    console.log("🔧 Setting up JDBC drivers...");

    try {
      execSync("npm run setup:groovy-jdbc", {
        cwd: path.join(__dirname, ".."),
        stdio: "inherit",
      });
      console.log("✅ JDBC setup completed");
    } catch (error) {
      throw new Error(`JDBC setup failed: ${error.message}`);
    }
  }

  /**
   * Verify database connectivity
   */
  verifyDatabaseConnectivity() {
    console.log("🔍 Verifying database connectivity...");

    try {
      // Simple connection test using psql if available
      execSync("which psql", { stdio: "ignore" });

      const testCommand =
        'psql -h localhost -p 5432 -U umig_app -d umig_app_db -c "SELECT 1;" -t';
      execSync(testCommand, {
        stdio: "ignore",
        env: { ...process.env, PGPASSWORD: "umig_app_password" },
      });

      console.log("✅ Database connectivity verified");
      return true;
    } catch (error) {
      console.log("❌ Database connectivity check failed");
      console.log("💡 Troubleshooting:");
      console.log("   1. Start the development environment: npm start");
      console.log("   2. Wait for PostgreSQL to be ready");
      console.log("   3. Check container status: podman ps");
      return false;
    }
  }

  /**
   * Run a single Groovy test file
   */
  async runGroovyTest(testFile) {
    const absoluteTestPath = path.resolve(testFile);

    if (!fs.existsSync(absoluteTestPath)) {
      throw new Error(`Test file not found: ${absoluteTestPath}`);
    }

    console.log(`🧪 Running Groovy test: ${path.basename(testFile)}`);

    return new Promise((resolve, reject) => {
      // Run groovy directly with classpath instead of using shell wrapper
      const child = spawn("groovy", ["-cp", this.postgresqlJar, absoluteTestPath], {
        stdio: "inherit",
        cwd: this.projectRoot,
      });

      child.on("close", (code) => {
        if (code === 0) {
          console.log(`✅ Test passed: ${path.basename(testFile)}`);
          resolve(code);
        } else {
          console.log(
            `❌ Test failed: ${path.basename(testFile)} (exit code: ${code})`,
          );
          reject(new Error(`Test failed with exit code: ${code}`));
        }
      });

      child.on("error", (error) => {
        console.log(`❌ Test execution error: ${error.message}`);
        reject(error);
      });
    });
  }

  /**
   * Run all Groovy tests in a directory
   */
  async runGroovyTestsInDirectory(directory) {
    const testDir = path.resolve(directory);

    if (!fs.existsSync(testDir)) {
      throw new Error(`Test directory not found: ${testDir}`);
    }

    console.log(`🧪 Running all Groovy tests in: ${directory}`);

    const testFiles = fs
      .readdirSync(testDir)
      .filter((file) => file.endsWith(".groovy") && file.includes("Test"))
      .map((file) => path.join(testDir, file));

    if (testFiles.length === 0) {
      console.log("⚠️ No Groovy test files found");
      return;
    }

    console.log(`Found ${testFiles.length} test files`);

    let passedTests = 0;
    let failedTests = 0;

    for (const testFile of testFiles) {
      try {
        await this.runGroovyTest(testFile);
        passedTests++;
      } catch (error) {
        failedTests++;
        console.error(
          `Test failed: ${path.basename(testFile)} - ${error.message}`,
        );
      }
    }

    console.log(`\n📊 Test Results:`);
    console.log(`   ✅ Passed: ${passedTests}`);
    console.log(`   ❌ Failed: ${failedTests}`);
    console.log(
      `   📈 Success Rate: ${Math.round((passedTests / (passedTests + failedTests)) * 100)}%`,
    );

    if (failedTests > 0) {
      throw new Error(`${failedTests} tests failed`);
    }
  }

  /**
   * Main execution method
   */
  async run(args) {
    try {
      console.log("🚀 Enhanced Groovy Test Runner");
      console.log("=====================================");

      // Check and setup JDBC if needed
      if (!this.checkJdbcSetup()) {
        await this.setupJdbc();

        if (!this.checkJdbcSetup()) {
          throw new Error("JDBC setup failed");
        }
      }

      // Verify database connectivity
      if (!this.verifyDatabaseConnectivity()) {
        console.log("⚠️ Database connectivity issues detected");
        console.log("   Tests may fail if database is not available");
        console.log("   Continuing with test execution...");
      }

      // Parse command line arguments
      if (args.length === 0) {
        // Run all unit tests by default
        await this.runGroovyTestsInDirectory(
          path.join(this.projectRoot, "src/groovy/umig/tests/unit"),
        );
      } else {
        // Run specific test file or directory
        const target = args[0];
        const targetPath = path.resolve(target);

        if (fs.statSync(targetPath).isDirectory()) {
          await this.runGroovyTestsInDirectory(targetPath);
        } else {
          await this.runGroovyTest(targetPath);
        }
      }

      console.log("\n✅ All Groovy tests completed successfully!");
    } catch (error) {
      console.error(`\n❌ Groovy test execution failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Command line execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new GroovyTestRunner();
  const args = process.argv.slice(2);
  runner.run(args);
}
