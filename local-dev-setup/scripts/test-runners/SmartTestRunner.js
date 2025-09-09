#!/usr/bin/env node

/**
 * Smart Test Runner
 *
 * Automatically detects available infrastructure and runs appropriate tests.
 * Provides clear feedback about what's running and what's being skipped.
 */

import { spawn } from "child_process";
import chalk from "chalk";

class SmartTestRunner {
  async checkInfrastructure() {
    console.log(chalk.blue("🔍 Checking infrastructure availability..."));

    const checks = {
      database: await this.checkDatabase(),
      confluence: await this.checkConfluence(),
      mailhog: await this.checkMailHog(),
    };

    console.log("Infrastructure Status:");
    console.log(
      `  Database: ${checks.database ? chalk.green("✅") : chalk.red("❌")}`,
    );
    console.log(
      `  Confluence: ${checks.confluence ? chalk.green("✅") : chalk.red("❌")}`,
    );
    console.log(
      `  MailHog: ${checks.mailhog ? chalk.green("✅") : chalk.red("❌")}`,
    );
    console.log("");

    return checks;
  }

  async checkDatabase() {
    try {
      const { testConnection } = await import("./utilities/database-utils.js");
      return await testConnection();
    } catch (e) {
      return false;
    }
  }

  async checkConfluence() {
    try {
      const response = await fetch("http://localhost:8090/status");
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  async checkMailHog() {
    try {
      const response = await fetch("http://localhost:8025/api/v2/messages");
      return response.ok;
    } catch (e) {
      return false;
    }
  }

  async runTests(infrastructure) {
    const testSuites = [];

    // Always run unit and DOM tests
    testSuites.push({
      name: "Unit Tests",
      command: "npm run test:unit",
      canRun: true,
      reason: "No infrastructure required",
    });

    testSuites.push({
      name: "DOM Tests",
      command: "npm run test:dom",
      canRun: true,
      reason: "JSDOM environment only",
    });

    // Conditional test suites
    testSuites.push({
      name: "Integration Tests",
      command: "npm run test:integration",
      canRun: infrastructure.database && infrastructure.confluence,
      reason:
        infrastructure.database && infrastructure.confluence
          ? "Database and Confluence available"
          : 'Requires database and Confluence (run "npm start")',
    });

    testSuites.push({
      name: "Email Tests",
      command: "npm run test:email",
      canRun: infrastructure.mailhog,
      reason: infrastructure.mailhog
        ? "MailHog available"
        : 'Requires MailHog (included in "npm start")',
    });

    testSuites.push({
      name: "E2E Tests",
      command: "npm run test:e2e",
      canRun: infrastructure.database && infrastructure.confluence,
      reason:
        infrastructure.database && infrastructure.confluence
          ? "Full infrastructure available"
          : 'Requires full infrastructure (run "npm start")',
    });

    console.log(chalk.blue("📋 Test Suite Execution Plan:"));
    console.log("");

    for (const suite of testSuites) {
      if (suite.canRun) {
        console.log(
          chalk.green(`✅ ${suite.name}`) + chalk.gray(` - ${suite.reason}`),
        );
      } else {
        console.log(
          chalk.red(`⏭️  ${suite.name}`) + chalk.gray(` - ${suite.reason}`),
        );
      }
    }
    console.log("");

    // Execute available test suites
    for (const suite of testSuites) {
      if (suite.canRun) {
        console.log(chalk.blue(`🧪 Running ${suite.name}...`));
        await this.runCommand(suite.command);
        console.log("");
      }
    }

    // Summary
    const totalSuites = testSuites.length;
    const runningSuites = testSuites.filter((s) => s.canRun).length;
    const skippedSuites = totalSuites - runningSuites;

    console.log(chalk.blue("📊 Test Execution Summary:"));
    console.log(`  Total test suites: ${totalSuites}`);
    console.log(`  Executed: ${chalk.green(runningSuites)}`);
    console.log(`  Skipped: ${chalk.yellow(skippedSuites)}`);

    if (skippedSuites > 0) {
      console.log("");
      console.log(chalk.yellow("💡 To run all tests:"));
      console.log("   npm start    # Start infrastructure");
      console.log("   npm test     # Run all tests");
    }
  }

  runCommand(command) {
    return new Promise((resolve, reject) => {
      const [cmd, ...args] = command.split(" ");
      const child = spawn(cmd, args, {
        stdio: "inherit",
        shell: true,
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Command failed with code ${code}`));
        }
      });

      child.on("error", reject);
    });
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new SmartTestRunner();

  runner
    .checkInfrastructure()
    .then((infrastructure) => runner.runTests(infrastructure))
    .catch((error) => {
      console.error(chalk.red("❌ Test runner failed:"), error.message);
      process.exit(1);
    });
}

export default SmartTestRunner;
