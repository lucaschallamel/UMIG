import { BaseTestRunner } from "./BaseTestRunner.js";
import path from "path";
import fs from "fs";

/**
 * UnitTestRunner - Specialized runner for unit tests
 * Handles fast, isolated unit tests with parallel execution support
 *
 * Replaces: run-unit-tests.sh
 */
export class UnitTestRunner extends BaseTestRunner {
  constructor(options = {}) {
    super({
      timeout: 60000, // 1 minute for unit tests
      verbose: false, // Unit tests run quietly by default
      ...options,
    });

    this.unitTestsDir = path.join(this.testDir, "unit");
  }

  /**
   * Run all unit tests with parallel execution
   */
  async runAll() {
    this.logHeader("UMIG Unit Tests - Full Suite");

    // Find all unit test files
    const testFiles = this.findUnitTestFiles();

    if (testFiles.length === 0) {
      console.log("⚠️  No unit test files found in unit/ directory");
      return { total: 0, passed: 0, failed: 0, executionTime: 0 };
    }

    console.log(`\nFound ${testFiles.length} unit tests to execute`);

    // Unit tests can run in parallel for speed
    const results = await this.executeTestBatch(testFiles, {
      parallel: true,
      maxConcurrency: 4,
    });

    this.logUnitTestSummary(results);
    return results;
  }

  /**
   * Run specific unit test categories
   */
  async runCategory(category) {
    this.logHeader(`UMIG Unit Tests - ${category} Category`);

    const testFiles = this.findUnitTestFiles().filter((file) =>
      file.toLowerCase().includes(category.toLowerCase()),
    );

    if (testFiles.length === 0) {
      console.log(`⚠️  No unit test files found for category: ${category}`);
      return { total: 0, passed: 0, failed: 0, executionTime: 0 };
    }

    const results = await this.executeTestBatch(testFiles, {
      parallel: true,
      maxConcurrency: 4,
    });

    return results;
  }

  /**
   * Find all unit test files in the unit directory
   */
  findUnitTestFiles() {
    if (!fs.existsSync(this.unitTestsDir)) {
      return [];
    }

    const files = [];

    // Recursively find all .groovy files in unit directory
    const findGroovyFiles = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          findGroovyFiles(fullPath);
        } else if (entry.isFile() && entry.name.endsWith(".groovy")) {
          files.push(fullPath);
        }
      }
    };

    findGroovyFiles(this.unitTestsDir);
    return files;
  }

  /**
   * Run tests by pattern matching
   */
  async runPattern(pattern) {
    this.logHeader(`UMIG Unit Tests - Pattern: ${pattern}`);

    const allFiles = this.findUnitTestFiles();
    const testFiles = allFiles.filter((file) => {
      const basename = path.basename(file, ".groovy");
      return basename.includes(pattern);
    });

    if (testFiles.length === 0) {
      console.log(`⚠️  No unit test files match pattern: ${pattern}`);
      return { total: 0, passed: 0, failed: 0, executionTime: 0 };
    }

    console.log(
      `Found ${testFiles.length} tests matching pattern "${pattern}"`,
    );

    const results = await this.executeTestBatch(testFiles, {
      parallel: true,
      maxConcurrency: 4,
    });

    return results;
  }

  /**
   * Check unit test prerequisites (minimal requirements)
   */
  async checkPrerequisites() {
    console.log("🔍 Checking unit test prerequisites...\n");

    // Check if unit test directory exists
    if (!fs.existsSync(this.unitTestsDir)) {
      console.log("ℹ️  Unit tests directory not found - creating structure...");
      fs.mkdirSync(this.unitTestsDir, { recursive: true });

      // Create a sample unit test file
      const sampleTest = `// Sample Unit Test
// ADR-036 Pure Groovy framework compatible

@Grab('org.postgresql:postgresql:42.7.3')

class SampleUnitTest {
    static void main(String[] args) {
        println "✅ Sample unit test executed successfully"
        println "This is a placeholder unit test."
        println "Replace with actual unit tests for your code."
        
        // Example assertion pattern
        assert 1 + 1 == 2 : "Basic math should work"
        
        println "✅ All assertions passed"
    }
}`;

      fs.writeFileSync(
        path.join(this.unitTestsDir, "SampleUnitTest.groovy"),
        sampleTest,
      );

      console.log("✅ Created sample unit test structure");
    }

    console.log("✅ Prerequisites check completed\n");
  }

  /**
   * Log unit test specific summary
   */
  logUnitTestSummary(results) {
    console.log("\n" + this.colors.header("=".repeat(50)));
    console.log(this.colors.header("Unit Test Execution Summary"));
    console.log(this.colors.header("=".repeat(50)));

    console.log(`Execution Mode: Parallel (max 4 concurrent)`);
    console.log(`Framework: ADR-036 Pure Groovy`);
    console.log(
      `Test Directory: ${path.relative(this.projectRoot, this.unitTestsDir)}`,
    );

    if (results.total === 0) {
      console.log(
        "\n" + this.colors.warning("⚠️  No unit tests found to execute"),
      );
      console.log("Consider adding unit tests to improve code coverage");
    } else {
      const coverage =
        results.total > 0
          ? Math.round((results.passed / results.total) * 100)
          : 0;

      if (coverage >= 90) {
        console.log(
          "\n" +
            this.colors.success("🎉 EXCELLENT: Unit test coverage is strong"),
        );
      } else if (coverage >= 70) {
        console.log(
          "\n" +
            this.colors.warning(
              "⚠️  GOOD: Unit test coverage could be improved",
            ),
        );
      } else {
        console.log(
          "\n" +
            this.colors.error("❌ LOW: Unit test coverage needs attention"),
        );
      }
    }
  }

  /**
   * Override to ensure unit tests run quickly
   */
  buildGroovyArgs(testFile, options = {}) {
    const args = super.buildGroovyArgs(testFile, options);

    // Add unit test specific optimizations if needed
    // For example, disable verbose Groovy output for faster execution

    return args;
  }
}

export default UnitTestRunner;

// Main execution when called directly
async function main() {
  const args = process.argv.slice(2);
  const flags = {
    pattern: args.find((arg) => arg.startsWith("--pattern=")),
    category: args.find((arg) => arg.startsWith("--category=")),
    verbose: args.includes("--verbose") || args.includes("-v"),
    help: args.includes("--help") || args.includes("-h"),
  };

  if (flags.help) {
    console.log(`
UMIG Unit Test Runner

Usage:
  npm run test:unit                        # Run all unit tests
  npm run test:unit:pattern               # Run unit tests matching pattern
  npm run test:unit:category              # Run unit tests by category
  
Options:
  --pattern=<pattern>  Run tests matching pattern
  --category=<cat>     Run tests by category
  --verbose            Enable verbose output
  --help               Show this help message
    `);
    process.exit(0);
  }

  const runner = new UnitTestRunner({
    verbose: flags.verbose,
    timeout: 60000, // 1 minute for unit tests
  });

  try {
    let results;

    if (flags.pattern) {
      const pattern = flags.pattern.split("=")[1];
      console.log(`🧪 Running unit tests matching pattern: ${pattern}`);
      results = await runner.runPattern(pattern);
    } else if (flags.category) {
      const category = flags.category.split("=")[1];
      console.log(`🧪 Running unit tests for category: ${category}`);
      results = await runner.runCategory(category);
    } else {
      console.log("🧪 Running all unit tests...");
      results = await runner.runAll();
    }

    // Exit with appropriate code
    process.exit(results.failed > 0 ? 1 : 0);
  } catch (error) {
    console.error("❌ Unit test execution failed:", error.message);
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
