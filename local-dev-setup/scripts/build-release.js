#!/usr/bin/env node

/**
 * UMIG Build Release Script - Phase 1 Implementation
 *
 * US-088: Build Process and Deployment Packaging for UAT/Production
 * Phase 1: Core build infrastructure with BuildOrchestrator and SourcePackager
 *
 * Features:
 * - Phase-based build workflow (4 phases planned)
 * - Source code packaging with exclusion logic
 * - Comprehensive versioning (ADR-066 integration)
 * - NPM command integration
 *
 * @version 1.0.0 - Phase 1
 * @author UMIG Development Team
 */

import BuildOrchestrator from "./build/BuildOrchestrator.js";
import SourcePackager from "./build/SourcePackager.js";
import chalk from "chalk";
import { Command } from "commander";

const program = new Command();

// CLI Configuration
program
  .version("1.0.0")
  .description("UMIG Build Process and Deployment Packaging")
  .option("--env <environment>", "Target environment (dev|uat|prod)", "dev")
  .option("--include-tests", "Include test files (dev environment only)", false)
  .option("--verbose", "Enable verbose logging", false)
  .option("--dry-run", "Validate configuration without building", false)
  .parse(process.argv);

const options = program.opts();

async function main() {
  console.log(chalk.blue("🚀 UMIG Build Process - Phase 1"));
  console.log(chalk.gray(`Environment: ${options.env}`));
  console.log(chalk.gray(`Version: 1.0.0 (Phase 1 - Core Infrastructure)`));
  console.log("");

  // Global timeout to prevent infinite hangs (5 minutes for complete build)
  const globalTimeout = setTimeout(() => {
    console.error(chalk.red("❌ Build process timed out after 5 minutes"));
    console.error(chalk.red("This suggests a hang in database operations or file system access"));
    console.error(chalk.yellow("💡 Try running with --verbose to identify the hang point"));
    process.exit(1);
  }, 300000); // 5 minutes

  try {
    // Initialize BuildOrchestrator
    const orchestrator = new BuildOrchestrator({
      environment: options.env,
      includeTests: options.includeTests,
      verbose: options.verbose,
      dryRun: options.dryRun,
    });

    if (options.dryRun) {
      console.log(
        chalk.yellow("🔍 Dry run mode - validating configuration..."),
      );
      await orchestrator.validateConfiguration();
      console.log(chalk.green("✅ Configuration validation complete"));
      clearTimeout(globalTimeout);
      return;
    }

    // Execute Phase 1 build process
    console.log(chalk.blue("📦 Starting Phase 1 build process..."));
    console.log(chalk.gray("⏱️  Global timeout: 5 minutes to prevent infinite hangs"));
    await orchestrator.executeBuild();

    clearTimeout(globalTimeout);
    console.log(chalk.green("✅ Build process completed successfully"));
  } catch (error) {
    clearTimeout(globalTimeout);
    console.error(chalk.red("❌ Build process failed:"));
    console.error(chalk.red(error.message));

    if (options.verbose) {
      console.error(chalk.gray("\nStack trace:"));
      console.error(chalk.gray(error.stack));
    }

    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error(chalk.red("❌ Unhandled Promise Rejection:"), reason);
  process.exit(1);
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error(chalk.red("❌ Uncaught Exception:"), error.message);
  process.exit(1);
});

// Execute main function
main();
