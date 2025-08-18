#!/usr/bin/env node

/**
 * Integration Test Runner Script
 * Replaces: run-integration-tests.sh, run-authenticated-tests.sh, run-all-integration-tests.sh
 *
 * Usage:
 *   npm run test:integration           # Run all integration tests
 *   npm run test:integration:auth      # Run authenticated tests only
 *   npm run test:integration:core      # Run core API tests only
 */

import { IntegrationTestRunner } from "./test-runners/IntegrationTestRunner.js";
import { program } from "commander";

// Parse command line arguments
program
  .name("test-integration")
  .description("Run UMIG integration tests with various options")
  .option("-a, --auth", "Run only authenticated tests (US-022)")
  .option("-c, --core", "Run only core API tests")
  .option("-v, --verbose", "Verbose output")
  .option("--timeout <ms>", "Timeout in milliseconds", "180000")
  .parse();

const options = program.opts();

async function main() {
  const runner = new IntegrationTestRunner({
    verbose: options.verbose,
    timeout: parseInt(options.timeout),
  });

  try {
    let results;

    if (options.auth) {
      results = await runner.runAuthenticated();
    } else if (options.core) {
      results = await runner.runCoreAPIs();
    } else {
      results = await runner.runAll();
    }

    process.exit(runner.getExitCode());
  } catch (error) {
    console.error("❌ Integration test execution failed:", error.message);
    process.exit(1);
  }
}

main();
