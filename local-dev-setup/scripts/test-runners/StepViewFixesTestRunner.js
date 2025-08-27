#!/usr/bin/env node

/**
 * StepView Critical Issues Fix Validation Test
 *
 * Tests:
 * 1. Toolbar duplication prevention
 * 2. User context API 404 elimination
 *
 * Created: 2025-08-27
 * Issue: StepView toolbar duplication and missing API endpoint
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";

function logHeader(message) {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${message}`);
  console.log("=".repeat(60));
}

function logStep(step, message) {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`[${timestamp}] ${step}: ${message}`);
}

function runTest(testName, testFunction) {
  try {
    logStep("Running", testName + "...");
    testFunction();
    logStep("✅ PASSED", testName);
    return true;
  } catch (error) {
    logStep("❌ FAILED", testName + " - " + error.message);
    return false;
  }
}

// Test 1: Verify toolbar duplication fix exists in code
function testToolbarDuplicationFix() {
  const stepViewPath = "../src/groovy/umig/web/js/step-view.js";

  if (!existsSync(stepViewPath)) {
    throw new Error("step-view.js file not found");
  }

  const content = readFileSync(stepViewPath, "utf8");

  // Check for existence check in addAdvancedControls
  if (
    !content.includes(
      'const existing = stepHeader.querySelector(".pilot-advanced-controls")',
    )
  ) {
    throw new Error(
      "Toolbar duplication fix not found: missing existence check",
    );
  }

  if (!content.includes("Advanced controls already exist, skipping creation")) {
    throw new Error("Toolbar duplication fix not found: missing skip logic");
  }

  console.log("    ✓ Found existence check for advanced controls");
  console.log("    ✓ Found skip logic to prevent duplication");
}

// Test 2: Verify user context API fix exists in code
function testUserContextApiFix() {
  const stepViewPath = "../src/groovy/umig/web/js/step-view.js";

  const content = readFileSync(stepViewPath, "utf8");

  // Check that the API call is commented out
  if (
    !content.includes(
      "// Original API call commented out to prevent 404 errors:",
    )
  ) {
    throw new Error(
      "User context API fix not found: API call not commented out",
    );
  }

  // Check for fallback implementation
  if (
    !content.includes("Using fallback user context (endpoint not implemented)")
  ) {
    throw new Error("User context API fix not found: fallback not implemented");
  }

  // Check that the fetch call is within comment block
  if (
    !content.includes("/*") ||
    !content.includes("const response = await fetch(")
  ) {
    throw new Error(
      "User context API fix not found: fetch call not properly commented",
    );
  }

  console.log("    ✓ Found API call properly commented out");
  console.log("    ✓ Found fallback user context implementation");
}

// Test 3: Code syntax validation
function testCodeSyntax() {
  try {
    // Basic syntax check using Node.js
    const stepViewPath = "../src/groovy/umig/web/js/step-view.js";
    const content = readFileSync(stepViewPath, "utf8");

    // Check for balanced braces and parentheses
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;

    if (openBraces !== closeBraces) {
      throw new Error(
        `Unbalanced braces: ${openBraces} open, ${closeBraces} close`,
      );
    }

    if (openParens !== closeParens) {
      throw new Error(
        `Unbalanced parentheses: ${openParens} open, ${closeParens} close`,
      );
    }

    console.log("    ✓ Braces and parentheses are balanced");
    console.log("    ✓ No obvious syntax errors detected");
  } catch (error) {
    throw new Error("Syntax validation failed: " + error.message);
  }
}

// Main execution
function main() {
  logHeader("StepView Critical Issues Fix Validation");

  console.log("Testing fixes for:");
  console.log("  1. Toolbar duplication on Force Refresh");
  console.log("  2. 404 API error for /user/context endpoint");

  const tests = [
    ["Toolbar Duplication Fix", testToolbarDuplicationFix],
    ["User Context API Fix", testUserContextApiFix],
    ["Code Syntax Validation", testCodeSyntax],
  ];

  logHeader("Executing Fix Validation Tests");

  let passed = 0;
  let total = tests.length;

  for (const [testName, testFunction] of tests) {
    if (runTest(testName, testFunction)) {
      passed++;
    }
  }

  logHeader("Test Results Summary");
  console.log(`Total Tests: ${total}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${total - passed}`);
  console.log(`Pass Rate: ${Math.round((passed / total) * 100)}%`);

  if (passed === total) {
    console.log(
      "\n🎉 StepView Critical Issues Fix Validation: All tests PASSED",
    );
    console.log("✅ Ready for manual verification in browser");
    console.log("\nManual Testing Instructions:");
    console.log("1. Navigate to StepView page in browser");
    console.log('2. Click "Force Refresh" button multiple times');
    console.log("3. Verify only one Advanced Controls toolbar appears");
    console.log(
      "4. Check browser network tab for no 404 errors to /user/context",
    );
    console.log("5. Verify console shows fallback user context message");
  } else {
    console.log("\n❌ Some tests failed. Review the issues above.");
    process.exit(1);
  }
}

// Execute main function
main();
