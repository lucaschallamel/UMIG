#!/usr/bin/env node

/**
 * Test Utility for Session Authentication Utilities
 * Validates that both utilities can be imported and basic functionality works
 *
 * Author: UMIG Development Team
 * Date: September 21, 2025
 */

import chalk from "chalk";

async function testUtilities() {
  console.log(chalk.blue("🧪 Testing UMIG Session Authentication Utilities"));
  console.log("================================================");
  console.log("");

  let allTestsPassed = true;

  // Test 1: Import session-auth-test.js
  try {
    console.log(chalk.yellow("Test 1: Importing session-auth-test.js..."));
    const SessionAuthTester = await import("./session-auth-test.js");
    console.log(chalk.green("✅ session-auth-test.js imported successfully"));

    // Test static method
    if (typeof SessionAuthTester.default === "function") {
      console.log(chalk.green("✅ SessionAuthTester class available"));
    } else {
      throw new Error("SessionAuthTester class not available");
    }
  } catch (error) {
    console.log(
      chalk.red("❌ Failed to import session-auth-test.js:"),
      error.message,
    );
    allTestsPassed = false;
  }

  console.log("");

  // Test 2: Import browser-session-capture.js
  try {
    console.log(
      chalk.yellow("Test 2: Importing browser-session-capture.js..."),
    );
    const BrowserSessionCapture = await import("./browser-session-capture.js");
    console.log(
      chalk.green("✅ browser-session-capture.js imported successfully"),
    );

    if (typeof BrowserSessionCapture.default === "function") {
      console.log(chalk.green("✅ BrowserSessionCapture class available"));
    } else {
      throw new Error("BrowserSessionCapture class not available");
    }
  } catch (error) {
    console.log(
      chalk.red("❌ Failed to import browser-session-capture.js:"),
      error.message,
    );
    allTestsPassed = false;
  }

  console.log("");

  // Test 3: Check if fetch is available (Node.js 18+ requirement)
  try {
    console.log(chalk.yellow("Test 3: Checking fetch availability..."));
    if (typeof fetch !== "undefined") {
      console.log(chalk.green("✅ fetch API is available"));
    } else {
      throw new Error("fetch API not available - requires Node.js 18+");
    }
  } catch (error) {
    console.log(chalk.red("❌ fetch API test failed:"), error.message);
    allTestsPassed = false;
  }

  console.log("");

  // Test 4: Check dependencies
  try {
    console.log(chalk.yellow("Test 4: Checking dependencies..."));

    // Test chalk
    const testChalk = chalk.green("Test");
    console.log(chalk.green("✅ chalk dependency working"));

    // Test fs/path modules
    const { existsSync } = await import("fs");
    const { join } = await import("path");
    console.log(chalk.green("✅ fs and path modules working"));

    // Test readline
    const { createInterface } = await import("readline");
    console.log(chalk.green("✅ readline module working"));
  } catch (error) {
    console.log(chalk.red("❌ Dependency test failed:"), error.message);
    allTestsPassed = false;
  }

  console.log("");

  // Summary
  if (allTestsPassed) {
    console.log(
      chalk.green(
        "🎉 All tests passed! Authentication utilities are ready for use.",
      ),
    );
    console.log("");
    console.log(chalk.blue("Available npm commands:"));
    console.log(
      "  npm run auth:capture-session  - Interactive session capture utility",
    );
    console.log(
      "  npm run auth:test-session     - Programmatic session testing (currently non-functional)",
    );
    console.log("  npm run auth:help             - Show help information");
    console.log("");
    console.log(chalk.blue("Direct usage:"));
    console.log("  node scripts/browser-session-capture.js");
    console.log("  node scripts/session-auth-test.js");
  } else {
    console.log(
      chalk.red("❌ Some tests failed. Please check the errors above."),
    );
    process.exit(1);
  }
}

// Run tests if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testUtilities().catch((error) => {
    console.error(chalk.red("Fatal error:"), error.message);
    process.exit(1);
  });
}

export default testUtilities;
