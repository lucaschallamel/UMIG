#!/usr/bin/env node

/**
 * UAT Validation Runner Script
 * Replaces: run-uat-validation.sh
 *
 * Usage:
 *   npm run test:uat                   # Run full UAT validation suite
 *   npm run test:uat -- --quick        # Run quick validation only
 */

import { UATValidationRunner } from "./UATValidationRunner.js";
import { program } from "commander";

// Parse command line arguments
program
  .name("test-uat")
  .description(
    "Run UMIG UAT validation suite for US-028 Enhanced IterationView",
  )
  .option("-q, --quick", "Run quick validation only (skip browser tests)")
  .option("-v, --verbose", "Verbose output")
  .option("--timeout <ms>", "Timeout in milliseconds", "300000")
  .option("--confluence-url <url>", "Confluence URL", "http://localhost:8090")
  .parse();

const options = program.opts();

async function main() {
  const runner = new UATValidationRunner({
    verbose: options.verbose,
    timeout: parseInt(options.timeout),
    confluenceUrl: options.confluenceUrl,
  });

  try {
    console.log(
      "🎯 Starting US-028 Enhanced IterationView UAT Validation Suite...",
    );
    console.log(
      "   Critical Gap Analysis: Migration Loading DOM Timing & End-to-End Workflow Testing",
    );

    const results = await runner.runFullValidation();

    // Exit with appropriate code based on UAT results
    process.exit(results.exitCode);
  } catch (error) {
    console.error("❌ UAT validation execution failed:", error.message);
    process.exit(2);
  }
}

main();
