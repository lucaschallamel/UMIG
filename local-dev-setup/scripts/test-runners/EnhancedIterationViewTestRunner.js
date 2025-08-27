#!/usr/bin/env node

/**
 * Enhanced IterationView Test Runner Script
 * Replaces: run-enhanced-iterationview-tests.sh
 *
 * Usage:
 *   npm run test:iterationview         # Run enhanced IterationView tests
 */

import { BaseTestRunner } from "./test-runners/BaseTestRunner.js";
import { program } from "commander";
import path from "path";
import fs from "fs";

// Parse command line arguments
program
  .name("test-enhanced-iterationview")
  .description("Run Enhanced IterationView tests for US-028")
  .option("-v, --verbose", "Verbose output")
  .option("--timeout <ms>", "Timeout in milliseconds", "120000")
  .parse();

const options = program.opts();

/**
 * Specialized runner for Enhanced IterationView tests
 */
class EnhancedIterationViewRunner extends BaseTestRunner {
  constructor(runnerOptions = {}) {
    super({
      timeout: 120000, // 2 minutes
      verbose: true,
      ...runnerOptions,
    });
  }

  async runEnhancedIterationViewTests() {
    this.logHeader("US-028 Enhanced IterationView Tests");

    // Define test files specific to Enhanced IterationView
    const testFiles = [
      "integration/stepViewApiIntegrationTest.groovy",
      // Add other Enhanced IterationView specific tests here
    ];

    // Check which tests exist
    const existingTests = testFiles.filter((testFile) => {
      const fullPath = path.join(this.testDir, testFile);
      return fs.existsSync(fullPath);
    });

    if (existingTests.length === 0) {
      console.log("⚠️  No Enhanced IterationView test files found");
      console.log("Expected test files:");
      testFiles.forEach((file) => console.log(`  - ${file}`));
      return { total: 0, passed: 0, failed: 0 };
    }

    console.log(
      `\nFound ${existingTests.length} Enhanced IterationView tests to execute`,
    );

    // Execute tests sequentially for integration testing
    const results = await this.executeTestBatch(
      existingTests.map((test) => path.join(this.testDir, test)),
      { parallel: false },
    );

    this.logEnhancedIterationViewSummary(results);
    return results;
  }

  logEnhancedIterationViewSummary(results) {
    console.log("\n" + this.colors.header("=".repeat(60)));
    console.log(
      this.colors.header("US-028 Enhanced IterationView Test Summary"),
    );
    console.log(this.colors.header("=".repeat(60)));

    console.log("Feature: Enhanced IterationView with real-time updates");
    console.log("Epic: US-028 Phase 1 Implementation");
    console.log("Framework: ADR-036 Pure Groovy + JavaScript integration");

    if (results.passed === results.total && results.total > 0) {
      console.log(
        "\n" +
          this.colors.success(
            "🎉 US-028 Enhanced IterationView: All tests PASSED",
          ),
      );
      console.log(this.colors.success("✅ Ready for UAT validation"));
    } else if (results.total === 0) {
      console.log(
        "\n" + this.colors.warning("⚠️  No Enhanced IterationView tests found"),
      );
      console.log("Consider adding specific tests for US-028 features");
    } else {
      console.log(
        "\n" +
          this.colors.error(
            "❌ US-028 Enhanced IterationView: Issues detected",
          ),
      );
      console.log(this.colors.error("🔧 Address test failures before UAT"));
    }
  }
}

async function main() {
  const runner = new EnhancedIterationViewRunner({
    verbose: options.verbose,
    timeout: parseInt(options.timeout),
  });

  try {
    const results = await runner.runEnhancedIterationViewTests();
    process.exit(runner.getExitCode());
  } catch (error) {
    console.error(
      "❌ Enhanced IterationView test execution failed:",
      error.message,
    );
    process.exit(1);
  }
}

main();
