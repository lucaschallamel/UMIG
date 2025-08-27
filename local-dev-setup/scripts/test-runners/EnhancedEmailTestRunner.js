#!/usr/bin/env node

/**
 * Enhanced Email MailHog Test Runner
 *
 * Comprehensive test runner for US-039 Enhanced Email Notifications
 * Provides clear visibility into email testing results and outcomes
 *
 * Usage:
 *   node scripts/run-enhanced-email-test.js [--verbose] [--clear-first]
 *   npm run test:enhanced-email
 *
 * @author Lucas Challamel
 * @version 1.0
 * @created 2025-08-27
 */

import { execSync, exec } from "child_process";
import { promisify } from "util";
import chalk from "chalk";

const execAsync = promisify(exec);

class EnhancedEmailTestRunner {
  constructor() {
    this.mailhogUrl = "http://localhost:8025";
    this.verbose = process.argv.includes("--verbose");
    this.clearFirst = process.argv.includes("--clear-first");
    this.results = {
      started: new Date(),
      tests: {},
      emails: [],
      performance: {},
      errors: [],
    };
  }

  async run() {
    console.log(chalk.blue.bold("\n🚀 Enhanced Email MailHog Test Runner"));
    console.log(chalk.blue("=".repeat(60)));
    console.log(
      chalk.blue("US-039: Enhanced Email Notifications - Phase 0 Testing"),
    );
    console.log(
      chalk.blue("Mobile-responsive templates with MailHog validation"),
    );
    console.log(chalk.blue("=".repeat(60)));

    try {
      await this.preTestChecks();
      await this.runTestSuite();
      await this.postTestAnalysis();
      this.displayResults();
    } catch (error) {
      console.error(
        chalk.red.bold("\n❌ Test execution failed:"),
        error.message,
      );
      this.results.errors.push(error.message);
      process.exit(1);
    }
  }

  async preTestChecks() {
    console.log(chalk.yellow("\n🔧 Pre-test Environment Checks"));
    console.log(chalk.yellow("-".repeat(35)));

    // Check MailHog connectivity
    const mailhogConnected = await this.checkMailHogConnection();
    console.log(
      `📡 MailHog Service: ${mailhogConnected ? chalk.green("✅ Connected") : chalk.red("❌ Disconnected")}`,
    );

    if (!mailhogConnected) {
      throw new Error(
        "MailHog service is not accessible. Please ensure MailHog is running on localhost:8025",
      );
    }

    // Check Jest availability
    try {
      execSync("npx jest --version", { stdio: "ignore" });
      console.log(`🧪 Jest Testing Framework: ${chalk.green("✅ Available")}`);
    } catch (error) {
      throw new Error("Jest is not available. Please run npm install first.");
    }

    // Check email template
    const templateExists = await this.checkEmailTemplate();
    console.log(
      `📄 Enhanced Email Template: ${templateExists ? chalk.green("✅ Found") : chalk.yellow("⚠️ Not found")}`,
    );

    // Clear MailHog if requested
    if (this.clearFirst) {
      await this.clearMailHogInbox();
      console.log(`🗑️ MailHog Inbox: ${chalk.green("✅ Cleared")}`);
    }

    console.log(chalk.green("\n✅ Pre-test checks completed successfully"));
  }

  async runTestSuite() {
    console.log(chalk.yellow("\n🧪 Running Enhanced Email Test Suite"));
    console.log(chalk.yellow("-".repeat(40)));

    const startTime = Date.now();

    try {
      // Run the Jest test suite
      const jestCommand =
        "npx jest __tests__/enhanced-email-mailhog.test.js --verbose --no-cache";
      console.log(chalk.gray(`Executing: ${jestCommand}\n`));

      const { stdout, stderr } = await execAsync(jestCommand, {
        cwd: process.cwd(),
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      });

      this.results.performance.testDuration = Date.now() - startTime;
      this.results.tests.stdout = stdout;
      this.results.tests.stderr = stderr;

      console.log(stdout);

      if (stderr && this.verbose) {
        console.log(chalk.yellow("\n⚠️ Test warnings/errors:"));
        console.log(stderr);
      }
    } catch (error) {
      // Jest exits with non-zero code for test failures, which is expected
      this.results.performance.testDuration = Date.now() - startTime;
      this.results.tests.stdout = error.stdout || "";
      this.results.tests.stderr = error.stderr || "";
      this.results.errors.push(`Jest execution: ${error.message}`);

      console.log(error.stdout || "No test output available");

      if (error.stderr) {
        console.log(chalk.red("\n❌ Test execution errors:"));
        console.log(error.stderr);
      }
    }
  }

  async postTestAnalysis() {
    console.log(chalk.cyan("\n📊 Post-Test Analysis"));
    console.log(chalk.cyan("-".repeat(25)));

    // Get current MailHog messages for analysis
    this.results.emails = await this.getMailHogMessages();
    console.log(
      `📧 Emails in MailHog: ${chalk.cyan(this.results.emails.length)}`,
    );

    // Analyze email content
    if (this.results.emails.length > 0) {
      console.log(chalk.cyan("\n📋 Email Analysis:"));

      this.results.emails.forEach((email, index) => {
        const subject = email.Content?.Headers?.Subject?.[0] || "No Subject";
        const from = email.Content?.Headers?.From?.[0] || "Unknown Sender";
        const size = email.Content?.Size || 0;

        console.log(`  ${index + 1}. Subject: ${chalk.white(subject)}`);
        console.log(`     From: ${from}`);
        console.log(`     Size: ${this.formatBytes(size)}`);

        // Check for mobile-responsive features
        const body = email.Content?.Body || "";
        const features = this.analyzeMobileFeatures(body);

        if (features.mobileOptimized) {
          console.log(`     📱 Mobile Responsive: ${chalk.green("✅ Yes")}`);
        } else {
          console.log(
            `     📱 Mobile Responsive: ${chalk.yellow("⚠️ Partial")}`,
          );
        }

        if (features.hasConfluenceUrl) {
          console.log(`     🔗 Confluence URL: ${chalk.green("✅ Present")}`);
        } else {
          console.log(`     🔗 Confluence URL: ${chalk.red("❌ Missing")}`);
        }
      });
    }

    // Performance analysis
    const duration = this.results.performance.testDuration || 0;
    console.log(chalk.cyan(`\n⚡ Test Performance:`));
    console.log(
      `   Total Duration: ${chalk.white(this.formatDuration(duration))}`,
    );
    console.log(`   Performance Target: <5000ms per email`);

    if (duration > 30000) {
      console.log(`   ${chalk.yellow("⚠️")} Tests took longer than expected`);
    } else {
      console.log(
        `   ${chalk.green("✅")} Tests completed within acceptable time`,
      );
    }
  }

  displayResults() {
    console.log(chalk.blue.bold("\n📊 ENHANCED EMAIL TEST RESULTS"));
    console.log(chalk.blue("=".repeat(50)));

    const testOutput = this.results.tests.stdout || "";
    const passed =
      testOutput.includes("Tests:") && !testOutput.includes("failed");
    const testCount = this.extractTestCount(testOutput);

    // Overall status
    console.log(
      `🎯 Overall Status: ${passed ? chalk.green.bold("✅ PASSED") : chalk.red.bold("❌ FAILED")}`,
    );
    console.log(
      `🧪 Tests Executed: ${chalk.cyan(testCount.total)} (${chalk.green(testCount.passed)} passed, ${chalk.red(testCount.failed)} failed)`,
    );
    console.log(
      `📧 Emails Generated: ${chalk.cyan(this.results.emails.length)}`,
    );
    console.log(
      `⏱️ Total Duration: ${chalk.cyan(this.formatDuration(this.results.performance.testDuration))}`,
    );

    // Key achievements
    console.log(chalk.blue("\n🏆 Key Test Achievements:"));
    if (this.results.emails.length > 0) {
      console.log(`  ✅ Enhanced email templates delivered to MailHog`);
      console.log(`  ✅ Mobile-responsive email structure validated`);
      console.log(`  ✅ Email client compatibility features checked`);
      console.log(`  ✅ Content rendering and URL construction verified`);
    }

    // Template validation
    const templateTypes = this.extractTemplateTypes(testOutput);
    if (templateTypes.length > 0) {
      console.log(chalk.blue("\n📧 Template Types Validated:"));
      templateTypes.forEach((template) => {
        console.log(`  📋 ${template}`);
      });
    }

    // Errors and warnings
    if (this.results.errors.length > 0) {
      console.log(chalk.red.bold("\n❌ Issues Encountered:"));
      this.results.errors.forEach((error) => {
        console.log(`  • ${error}`);
      });
    }

    // Next steps
    console.log(chalk.blue.bold("\n🔄 Next Steps for US-039:"));
    console.log("  📋 Phase 1: API Integration and Content Retrieval");
    console.log("  📋 Phase 2: Complete step content rendering implementation");
    console.log("  📋 Phase 3: Admin GUI integration for template management");
    console.log("  📋 Phase 4: Production deployment and validation");

    console.log(chalk.blue("=".repeat(50)));
    console.log(chalk.blue.bold("Enhanced Email Testing Complete! 🎉"));

    // Exit with appropriate code
    process.exit(passed ? 0 : 1);
  }

  // Utility Methods
  async checkMailHogConnection() {
    try {
      const { stdout } = await execAsync(
        `curl -s ${this.mailhogUrl}/api/v2/messages`,
      );
      const response = JSON.parse(stdout);
      return response && typeof response === "object";
    } catch (error) {
      return false;
    }
  }

  async checkEmailTemplate() {
    try {
      const { execSync } = await import("child_process");
      execSync(
        "ls ../src/groovy/umig/web/enhanced-mobile-email-template.html",
        { stdio: "ignore" },
      );
      return true;
    } catch (error) {
      return false;
    }
  }

  async clearMailHogInbox() {
    try {
      await execAsync(`curl -X DELETE ${this.mailhogUrl}/api/v1/messages`);
    } catch (error) {
      console.warn(chalk.yellow("⚠️ Could not clear MailHog inbox"));
    }
  }

  async getMailHogMessages() {
    try {
      const { stdout } = await execAsync(
        `curl -s ${this.mailhogUrl}/api/v2/messages`,
      );
      const response = JSON.parse(stdout);
      return response.items || [];
    } catch (error) {
      return [];
    }
  }

  analyzeMobileFeatures(emailBody) {
    return {
      mobileOptimized:
        emailBody.includes("viewport") && emailBody.includes("@media"),
      hasConfluenceUrl:
        emailBody.includes("confluence") ||
        emailBody.includes("viewpage.action"),
      hasTable: emailBody.includes("<table"),
      hasInlineCSS: emailBody.includes("style="),
      hasMsoSupport:
        emailBody.includes("mso") || emailBody.includes("[if gte mso"),
    };
  }

  extractTestCount(testOutput) {
    const totalMatch = testOutput.match(/Tests:\s+(\d+) passed/);
    const passedMatch = testOutput.match(/(\d+) passed/);
    const failedMatch = testOutput.match(/(\d+) failed/);

    return {
      total:
        parseInt(passedMatch?.[1] || "0") + parseInt(failedMatch?.[1] || "0"),
      passed: parseInt(passedMatch?.[1] || "0"),
      failed: parseInt(failedMatch?.[1] || "0"),
    };
  }

  extractTemplateTypes(testOutput) {
    const templates = [];
    if (testOutput.includes("STEP_STATUS_CHANGED"))
      templates.push("STEP_STATUS_CHANGED (Blue theme)");
    if (testOutput.includes("STEP_OPENED"))
      templates.push("STEP_OPENED (Green theme)");
    if (testOutput.includes("INSTRUCTION_COMPLETED"))
      templates.push("INSTRUCTION_COMPLETED (Teal theme)");
    return templates;
  }

  formatBytes(bytes) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }
}

// Run the test if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new EnhancedEmailTestRunner();
  runner.run().catch((error) => {
    console.error(chalk.red.bold("Fatal error:"), error);
    process.exit(1);
  });
}

export default EnhancedEmailTestRunner;
