#!/usr/bin/env node

/**
 * Admin GUI Test Runner Script
 * Specifically runs the AdminGuiAllEndpointsTest for US-031
 */

import { IntegrationTestRunner } from "./test-runners/IntegrationTestRunner.js";
import path from "path";

async function main() {
  const runner = new IntegrationTestRunner({
    verbose: true,
    timeout: 30000, // 30 seconds per test
  });

  try {
    console.log("\n============================================================");
    console.log("  US-031: Admin GUI Complete Integration Test");
    console.log("============================================================\n");

    // Check prerequisites
    await runner.checkPrerequisites();

    // Run just the AdminGuiAllEndpointsTest
    const testFile = path.join(
      runner.integrationTestsDir,
      "AdminGuiAllEndpointsTest.groovy"
    );

    console.log("🧪 Running AdminGuiAllEndpointsTest...\n");
    
    const results = await runner.executeTestBatch(
      [testFile],
      { parallel: false }
    );

    // Print results
    console.log("\n============================================================");
    console.log("  TEST RESULTS");
    console.log("============================================================");
    console.log(`Tests Passed: ${runner.results.passed}`);
    console.log(`Tests Failed: ${runner.results.failed}`);
    
    if (runner.results.failed > 0) {
      console.log("\nFailed Tests:");
      runner.results.failedTests.forEach(test => {
        console.log(`  - ${test}`);
      });
    }

    process.exit(runner.getExitCode());
  } catch (error) {
    console.error("❌ Admin GUI test execution failed:", error.message);
    process.exit(1);
  }
}

main();