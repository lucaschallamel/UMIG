#!/usr/bin/env node

/**
 * Master Quality Check Runner
 * JavaScript equivalent of master-quality-check.sh
 * Executes comprehensive validation and quality checks
 * Created: 2025-08-27 (converted from shell script)
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Configuration
const CONFIG = {
  resultsDir: `./test-results/master-quality-check-${new Date().toISOString().replace(/[:.]/g, "-")}`,
  timeout: 300000, // 5 minutes per phase
  phases: [
    "API Smoke Tests",
    "Immediate Health Check",
    "Phase B Test Execution",
    "Integration Tests",
    "Unit Tests",
  ],
};

// Color utilities
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  purple: "\x1b[35m",
  reset: "\x1b[0m",
};

function printHeader(message) {
  console.log("\n" + "=".repeat(60));
  console.log(`  ${message}`);
  console.log("=".repeat(60));
}

function printPhase(phase, step) {
  console.log(`\n${colors.purple}📋 PHASE ${step}: ${phase}${colors.reset}`);
  console.log("-".repeat(40));
}

function printSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function printError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function printWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function printInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

// Initialize results directory
function initializeResultsDirectory() {
  try {
    if (!fs.existsSync("test-results")) {
      fs.mkdirSync("test-results", { recursive: true });
    }
    fs.mkdirSync(CONFIG.resultsDir, { recursive: true });
    printSuccess(`Results directory created: ${CONFIG.resultsDir}`);
  } catch (error) {
    printError(`Failed to create results directory: ${error.message}`);
    process.exit(1);
  }
}

// Environment verification
function verifyEnvironment() {
  printPhase("Environment Verification", 0);

  // Check if in correct directory
  if (!fs.existsSync("package.json") || !fs.existsSync("scripts")) {
    printError("Must be run from local-dev-setup/ directory");
    printError(`Current directory: ${process.cwd()}`);
    process.exit(1);
  }

  printSuccess("Running from correct directory (local-dev-setup)");

  // Check Confluence server
  try {
    execSync("curl -s --max-time 5 http://localhost:8090 > /dev/null", {
      timeout: 5000,
    });
    printSuccess("Confluence server is responding on port 8090");
  } catch (error) {
    printError("Confluence server is not responding - start with npm start");
    process.exit(1);
  }

  // Check database connection
  try {
    execSync("npm run db:ping", { stdio: "pipe", timeout: 10000 });
    printSuccess("Database connection verified");
  } catch (error) {
    printWarning("Database connection could not be verified automatically");
  }
}

// Execute a test phase
async function executePhase(phaseName, command, phaseNumber) {
  printPhase(phaseName, phaseNumber);

  const startTime = Date.now();
  const logFile = path.join(
    CONFIG.resultsDir,
    `phase-${phaseNumber}-${phaseName.replace(/\s+/g, "-").toLowerCase()}.log`,
  );

  try {
    printInfo(`Executing: ${command}`);
    printInfo(`Logging to: ${logFile}`);

    const result = execSync(command, {
      encoding: "utf8",
      timeout: CONFIG.timeout,
      stdio: "pipe",
    });

    // Write results to log file
    fs.writeFileSync(
      logFile,
      `PHASE: ${phaseName}\nCOMMAND: ${command}\nSTARTED: ${new Date(startTime).toISOString()}\nDURATION: ${Date.now() - startTime}ms\n\nOUTPUT:\n${result}`,
    );

    const duration = Date.now() - startTime;
    printSuccess(`${phaseName} completed successfully (${duration}ms)`);

    return { success: true, duration, output: result };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorLog = `PHASE: ${phaseName}\nCOMMAND: ${command}\nSTARTED: ${new Date(startTime).toISOString()}\nDURATION: ${duration}ms\nERROR: ${error.message}\n\nOUTPUT:\n${error.stdout || "No stdout"}\n\nERROR OUTPUT:\n${error.stderr || "No stderr"}`;

    fs.writeFileSync(logFile, errorLog);

    printError(`${phaseName} failed (${duration}ms): ${error.message}`);
    return { success: false, duration, error: error.message };
  }
}

// Main quality check execution
async function runMasterQualityCheck() {
  printHeader("UMIG COMPREHENSIVE QUALITY CHECK");

  console.log("Systematic validation of development environment");
  console.log(`Environment: Development (localhost:8090)`);
  console.log(`Started: ${new Date().toISOString()}`);
  console.log("");

  const results = [];
  const overallStartTime = Date.now();

  // Phase 0: Environment Setup
  verifyEnvironment();
  initializeResultsDirectory();

  // Phase 1: API Smoke Tests
  results.push(
    await executePhase(
      "API Smoke Tests",
      "node scripts/test-runners/ApiSmokeTestRunner.js",
      1,
    ),
  );

  // Phase 2: Unit Tests
  results.push(await executePhase("Unit Tests", "npm run test:unit", 2));

  // Phase 3: Integration Tests
  results.push(
    await executePhase("Integration Tests", "npm run test:integration", 3),
  );

  // Phase 4: UAT Validation (if available)
  if (fs.existsSync("scripts/test-runners/UATTestRunner.js")) {
    results.push(
      await executePhase(
        "UAT Validation",
        "node scripts/test-runners/UATTestRunner.js",
        4,
      ),
    );
  }

  // Generate final report
  const overallDuration = Date.now() - overallStartTime;
  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  printHeader("QUALITY CHECK SUMMARY");

  console.log(`Total phases executed: ${results.length}`);
  console.log(`Overall duration: ${Math.round(overallDuration / 1000)}s`);
  console.log("");

  printSuccess(`Successful phases: ${successful.length}`);
  if (failed.length > 0) {
    printError(`Failed phases: ${failed.length}`);
  }

  console.log("\nPhase Details:");
  results.forEach((result, index) => {
    const phaseName = CONFIG.phases[index] || `Phase ${index + 1}`;
    const duration = Math.round(result.duration / 1000);

    if (result.success) {
      printSuccess(`  ${phaseName}: PASSED (${duration}s)`);
    } else {
      printError(`  ${phaseName}: FAILED (${duration}s) - ${result.error}`);
    }
  });

  // Write summary report
  const summaryReport = {
    timestamp: new Date().toISOString(),
    overallDuration,
    totalPhases: results.length,
    successful: successful.length,
    failed: failed.length,
    phases: results.map((result, index) => ({
      name: CONFIG.phases[index] || `Phase ${index + 1}`,
      success: result.success,
      duration: result.duration,
      error: result.error || null,
    })),
  };

  const summaryFile = path.join(CONFIG.resultsDir, "summary.json");
  fs.writeFileSync(summaryFile, JSON.stringify(summaryReport, null, 2));

  console.log(`\nDetailed results saved to: ${CONFIG.resultsDir}`);
  console.log(`Summary report: ${summaryFile}`);

  if (successful.length === results.length) {
    printSuccess(
      "\n🎉 All quality checks passed - system is ready for deployment!",
    );
    process.exit(0);
  } else {
    printError(
      `\n💥 ${failed.length} quality check(s) failed - address issues before proceeding`,
    );
    process.exit(1);
  }
}

// Main execution
async function main() {
  try {
    await runMasterQualityCheck();
  } catch (error) {
    printError(`Master quality check failed: ${error.message}`);
    process.exit(1);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
