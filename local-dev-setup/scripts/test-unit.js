#!/usr/bin/env node

/**
 * Unit Test Runner Script
 * Replaces: run-unit-tests.sh
 *
 * Usage:
 *   npm run test:unit                  # Run all unit tests
 *   npm run test:unit -- --pattern api # Run tests matching pattern
 *   npm run test:unit -- --category service # Run specific category
 */

import { UnitTestRunner } from "./test-runners/UnitTestRunner.js";
import { program } from "commander";

// Parse command line arguments
program
  .name("test-unit")
  .description("Run UMIG unit tests with various options")
  .option("-p, --pattern <pattern>", "Run tests matching pattern")
  .option("-c, --category <category>", "Run specific test category")
  .option("-v, --verbose", "Verbose output")
  .option("--timeout <ms>", "Timeout in milliseconds", "60000")
  .option("--sequential", "Run tests sequentially instead of parallel")
  .parse();

const options = program.opts();

async function main() {
  const runner = new UnitTestRunner({
    verbose: options.verbose,
    timeout: parseInt(options.timeout),
  });

  try {
    // Check prerequisites first
    await runner.checkPrerequisites();

    let results;

    if (options.pattern) {
      results = await runner.runPattern(options.pattern);
    } else if (options.category) {
      results = await runner.runCategory(options.category);
    } else {
      results = await runner.runAll();
    }

    process.exit(runner.getExitCode());
  } catch (error) {
    console.error("❌ Unit test execution failed:", error.message);
    process.exit(1);
  }
}

main();
