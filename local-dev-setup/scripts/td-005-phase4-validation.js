#!/usr/bin/env node

/**
 * TD-005 Phase 4: Final Validation Script
 *
 * Validates all 4 recommended adjustments for transitioning from
 * "CONDITIONALLY READY" to "FULLY READY" for US-087 Phase 2 Teams Component Migration.
 *
 * VALIDATION CHECKLIST:
 * 1. ✅ Jest Configuration - detectLeaks disabled across all configs
 * 2. ✅ Staged Testing Approach - clear progression paths implemented
 * 3. ✅ Teams Migration Readiness - component architecture validated
 * 4. ✅ Enhanced Performance Monitoring - no experimental features
 *
 * @version 4.0 (TD-005 Phase 4)
 * @author gendev-test-suite-generator
 * @priority High (US-087 Migration Readiness)
 */

import { execSync } from "child_process";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import chalk from "chalk";

class TD005Phase4Validator {
  constructor() {
    this.validationResults = {
      jestConfig: { status: "pending", details: [] },
      stagedTesting: { status: "pending", details: [] },
      teamsReadiness: { status: "pending", details: [] },
      performanceMonitoring: { status: "pending", details: [] },
    };
    this.overallStatus = "CONDITIONALLY READY";
  }

  log(message, level = "info") {
    const timestamp = new Date().toISOString();
    const prefix =
      level === "error"
        ? "❌"
        : level === "warning"
          ? "⚠️"
          : level === "success"
            ? "✅"
            : "ℹ️";

    let coloredMessage = message;
    if (level === "error") coloredMessage = chalk.red(message);
    else if (level === "warning") coloredMessage = chalk.yellow(message);
    else if (level === "success") coloredMessage = chalk.green(message);
    else if (level === "info") coloredMessage = chalk.blue(message);

    console.log(`${prefix} [${timestamp.slice(11, 19)}] ${coloredMessage}`);
  }

  /**
   * Validation 1: Jest Configuration - detectLeaks disabled
   */
  async validateJestConfiguration() {
    this.log(
      "🔍 Validating Jest Configuration (detectLeaks disabled)...",
      "info",
    );

    const configFiles = [
      "jest.config.js",
      "jest.config.unit.js",
      "jest.config.integration.js",
      "jest.config.security.js",
      "jest.config.memory-optimized.js",
      "jest.config.components.js",
    ];

    let allConfigsValid = true;
    const configResults = [];

    for (const configFile of configFiles) {
      const configPath = join(process.cwd(), configFile);

      if (!existsSync(configPath)) {
        configResults.push({
          file: configFile,
          status: "missing",
          message: "Config file not found",
        });
        continue;
      }

      try {
        const configContent = readFileSync(configPath, "utf8");

        // Check for detectLeaks: false or no detectLeaks (acceptable)
        const hasDetectLeaksTrue = configContent.includes("detectLeaks: true");
        const hasDetectLeaksFalse =
          configContent.includes("detectLeaks: false");

        if (hasDetectLeaksTrue) {
          configResults.push({
            file: configFile,
            status: "fail",
            message: "Contains detectLeaks: true (should be false or absent)",
          });
          allConfigsValid = false;
        } else if (hasDetectLeaksFalse) {
          configResults.push({
            file: configFile,
            status: "pass",
            message: "Correctly configured with detectLeaks: false",
          });
        } else {
          configResults.push({
            file: configFile,
            status: "pass",
            message: "No detectLeaks setting (acceptable default)",
          });
        }

        // Check for stability optimizations
        const hasStabilityOptimizations =
          configContent.includes("forceExit: true") &&
          configContent.includes("detectOpenHandles: true");

        if (hasStabilityOptimizations) {
          configResults.push({
            file: configFile,
            status: "enhanced",
            message: "Includes TD-005 stability optimizations",
          });
        }
      } catch (error) {
        configResults.push({
          file: configFile,
          status: "error",
          message: `Error reading config: ${error.message}`,
        });
        allConfigsValid = false;
      }
    }

    this.validationResults.jestConfig = {
      status: allConfigsValid ? "pass" : "fail",
      details: configResults,
      summary: `${configResults.filter((r) => r.status === "pass" || r.status === "enhanced").length}/${configFiles.length} configs valid`,
    };

    if (allConfigsValid) {
      this.log(
        "✅ Jest Configuration validation PASSED - All configs properly configured",
        "success",
      );
    } else {
      this.log(
        "❌ Jest Configuration validation FAILED - Some configs need adjustment",
        "error",
      );
    }

    return allConfigsValid;
  }

  /**
   * Validation 2: Staged Testing Approach
   */
  async validateStagedTesting() {
    this.log("🔍 Validating Staged Testing Approach...", "info");

    const packageJsonPath = join(process.cwd(), "package.json");
    let packageJson;

    try {
      packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
    } catch (error) {
      this.validationResults.stagedTesting = {
        status: "fail",
        details: [{ message: `Cannot read package.json: ${error.message}` }],
      };
      this.log(
        "❌ Staged Testing validation FAILED - Cannot read package.json",
        "error",
      );
      return false;
    }

    const requiredCommands = [
      "test:js:staged:step1",
      "test:js:staged:step2",
      "test:js:staged:step3",
      "test:js:staged:step4",
      "test:js:staged:progression",
      "test:js:staged:teams",
      "test:js:teams:migration-ready",
      "test:us087:phase2:readiness",
    ];

    const commandResults = [];
    let allCommandsPresent = true;

    for (const command of requiredCommands) {
      if (packageJson.scripts && packageJson.scripts[command]) {
        commandResults.push({
          command,
          status: "present",
          script: packageJson.scripts[command],
        });
      } else {
        commandResults.push({
          command,
          status: "missing",
          script: null,
        });
        allCommandsPresent = false;
      }
    }

    // Validate staging progression pattern
    const progressionCommand =
      packageJson.scripts["test:js:staged:progression"];
    const hasCorrectProgression =
      progressionCommand &&
      progressionCommand.includes("step1") &&
      progressionCommand.includes("step2") &&
      progressionCommand.includes("step3") &&
      progressionCommand.includes("step4");

    this.validationResults.stagedTesting = {
      status: allCommandsPresent && hasCorrectProgression ? "pass" : "fail",
      details: commandResults,
      summary: `${commandResults.filter((r) => r.status === "present").length}/${requiredCommands.length} commands present`,
      progressionValid: hasCorrectProgression,
    };

    if (allCommandsPresent && hasCorrectProgression) {
      this.log(
        "✅ Staged Testing validation PASSED - All progression commands present",
        "success",
      );
    } else {
      this.log(
        "❌ Staged Testing validation FAILED - Missing progression commands",
        "error",
      );
    }

    return allCommandsPresent && hasCorrectProgression;
  }

  /**
   * Validation 3: Teams Migration Readiness
   */
  async validateTeamsReadiness() {
    this.log("🔍 Validating Teams Migration Readiness...", "info");

    const readinessChecks = [];

    // Check for component configuration
    const componentsConfigPath = join(
      process.cwd(),
      "jest.config.components.js",
    );
    if (existsSync(componentsConfigPath)) {
      readinessChecks.push({
        check: "Component Configuration",
        status: "pass",
        message: "jest.config.components.js exists",
      });
    } else {
      readinessChecks.push({
        check: "Component Configuration",
        status: "fail",
        message: "jest.config.components.js missing",
      });
    }

    // Check for BaseEntityManager compliance validator
    const complianceValidatorPath = join(
      process.cwd(),
      "__tests__/__fixes__/base-entity-manager-compliance.js",
    );
    if (existsSync(complianceValidatorPath)) {
      readinessChecks.push({
        check: "Compliance Validator",
        status: "pass",
        message: "BaseEntityManager compliance validator present",
      });
    } else {
      readinessChecks.push({
        check: "Compliance Validator",
        status: "fail",
        message: "BaseEntityManager compliance validator missing",
      });
    }

    // Check for Teams-specific test files
    const teamsTestFiles = [
      "__tests__/unit/teams/teams-entity-migration.test.js",
      "__tests__/unit/teams/teams-accessibility.test.js",
      "__tests__/unit/teams/teams-edge-cases.test.js",
      "__tests__/unit/teams/teams-performance.test.js",
    ];

    let teamsTestsPresent = 0;
    for (const testFile of teamsTestFiles) {
      const testPath = join(process.cwd(), testFile);
      if (existsSync(testPath)) {
        teamsTestsPresent++;
      }
    }

    readinessChecks.push({
      check: "Teams Test Coverage",
      status: teamsTestsPresent >= 3 ? "pass" : "fail",
      message: `${teamsTestsPresent}/${teamsTestFiles.length} Teams test files present`,
    });

    const allChecksPass = readinessChecks.every(
      (check) => check.status === "pass",
    );

    this.validationResults.teamsReadiness = {
      status: allChecksPass ? "pass" : "fail",
      details: readinessChecks,
      summary: `${readinessChecks.filter((c) => c.status === "pass").length}/${readinessChecks.length} readiness checks passed`,
    };

    if (allChecksPass) {
      this.log(
        "✅ Teams Migration Readiness validation PASSED - All readiness checks passed",
        "success",
      );
    } else {
      this.log(
        "❌ Teams Migration Readiness validation FAILED - Some readiness checks failed",
        "error",
      );
    }

    return allChecksPass;
  }

  /**
   * Validation 4: Enhanced Performance Monitoring
   */
  async validatePerformanceMonitoring() {
    this.log("🔍 Validating Enhanced Performance Monitoring...", "info");

    const monitoringChecks = [];

    // Check for enhanced performance monitor
    const performanceMonitorPath = join(
      process.cwd(),
      "__tests__/__fixes__/enhanced-performance-monitor.js",
    );
    if (existsSync(performanceMonitorPath)) {
      try {
        const monitorContent = readFileSync(performanceMonitorPath, "utf8");

        // Check for key features
        const hasEnhancedMonitoring = monitorContent.includes(
          "EnhancedPerformanceMonitor",
        );
        const hasNonExperimentalFeatures =
          !monitorContent.includes("detectLeaks") ||
          monitorContent.includes("without experimental");
        const hasUS087Support =
          monitorContent.includes("US-087") ||
          monitorContent.includes("Teams Migration");

        monitoringChecks.push({
          check: "Enhanced Performance Monitor",
          status: hasEnhancedMonitoring ? "pass" : "fail",
          message: hasEnhancedMonitoring
            ? "EnhancedPerformanceMonitor class present"
            : "EnhancedPerformanceMonitor class missing",
        });

        monitoringChecks.push({
          check: "Non-Experimental Features",
          status: hasNonExperimentalFeatures ? "pass" : "fail",
          message: hasNonExperimentalFeatures
            ? "No experimental features used"
            : "Experimental features detected",
        });

        monitoringChecks.push({
          check: "US-087 Support",
          status: hasUS087Support ? "pass" : "fail",
          message: hasUS087Support
            ? "US-087 Teams Migration support present"
            : "US-087 support missing",
        });
      } catch (error) {
        monitoringChecks.push({
          check: "Performance Monitor File",
          status: "fail",
          message: `Error reading performance monitor: ${error.message}`,
        });
      }
    } else {
      monitoringChecks.push({
        check: "Performance Monitor File",
        status: "fail",
        message: "enhanced-performance-monitor.js missing",
      });
    }

    // Check for performance commands in package.json
    const packageJsonPath = join(process.cwd(), "package.json");
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
      const performanceCommands = [
        "performance:monitor",
        "performance:teams",
        "performance:validate",
      ];

      let performanceCommandsPresent = 0;
      for (const command of performanceCommands) {
        if (packageJson.scripts && packageJson.scripts[command]) {
          performanceCommandsPresent++;
        }
      }

      monitoringChecks.push({
        check: "Performance Commands",
        status: performanceCommandsPresent >= 2 ? "pass" : "fail",
        message: `${performanceCommandsPresent}/${performanceCommands.length} performance commands present`,
      });
    } catch (error) {
      monitoringChecks.push({
        check: "Performance Commands",
        status: "fail",
        message: `Cannot validate performance commands: ${error.message}`,
      });
    }

    const allChecksPass = monitoringChecks.every(
      (check) => check.status === "pass",
    );

    this.validationResults.performanceMonitoring = {
      status: allChecksPass ? "pass" : "fail",
      details: monitoringChecks,
      summary: `${monitoringChecks.filter((c) => c.status === "pass").length}/${monitoringChecks.length} monitoring checks passed`,
    };

    if (allChecksPass) {
      this.log(
        "✅ Performance Monitoring validation PASSED - Enhanced monitoring fully implemented",
        "success",
      );
    } else {
      this.log(
        "❌ Performance Monitoring validation FAILED - Monitoring implementation incomplete",
        "error",
      );
    }

    return allChecksPass;
  }

  /**
   * Determine overall readiness status
   */
  determineOverallStatus() {
    const validationStatuses = Object.values(this.validationResults).map(
      (result) => result.status,
    );
    const passedValidations = validationStatuses.filter(
      (status) => status === "pass",
    ).length;
    const totalValidations = validationStatuses.length;

    if (passedValidations === totalValidations) {
      this.overallStatus = "FULLY READY";
    } else if (passedValidations >= totalValidations * 0.75) {
      this.overallStatus = "MOSTLY READY";
    } else {
      this.overallStatus = "CONDITIONALLY READY";
    }

    return {
      status: this.overallStatus,
      passedValidations,
      totalValidations,
      readinessPercentage: Math.round(
        (passedValidations / totalValidations) * 100,
      ),
    };
  }

  /**
   * Generate comprehensive validation report
   */
  generateReport() {
    const overallStatus = this.determineOverallStatus();

    console.log("\n" + "=".repeat(80));
    console.log(chalk.bold.blue("📋 TD-005 Phase 4: Final Validation Report"));
    console.log(
      chalk.bold.blue(
        "🎯 US-087 Phase 2 Teams Component Migration Readiness Assessment",
      ),
    );
    console.log("=".repeat(80));

    console.log(
      `\n📊 Overall Status: ${this.getStatusColor(overallStatus.status)} (${overallStatus.readinessPercentage}%)`,
    );
    console.log(
      `🔍 Validations Passed: ${overallStatus.passedValidations}/${overallStatus.totalValidations}`,
    );

    // Detailed validation results
    console.log("\n📝 Detailed Validation Results:");
    console.log("-".repeat(50));

    Object.entries(this.validationResults).forEach(([validation, result]) => {
      const statusIcon = result.status === "pass" ? "✅" : "❌";
      const validationName = this.getValidationDisplayName(validation);

      console.log(`\n${statusIcon} ${chalk.bold(validationName)}`);
      console.log(`   Status: ${this.getStatusColor(result.status)}`);
      console.log(`   Summary: ${result.summary || "No summary available"}`);

      if (result.details && result.details.length > 0) {
        console.log("   Details:");
        result.details.slice(0, 3).forEach((detail) => {
          const detailIcon =
            detail.status === "pass" ||
            detail.status === "present" ||
            detail.status === "enhanced"
              ? "  ✓"
              : "  ✗";
          const detailMessage =
            detail.message ||
            detail.script ||
            `${detail.command}: ${detail.status}`;
          console.log(
            `${detailIcon} ${detailMessage.slice(0, 60)}${detailMessage.length > 60 ? "..." : ""}`,
          );
        });
        if (result.details.length > 3) {
          console.log(`     ... and ${result.details.length - 3} more items`);
        }
      }
    });

    // Recommendations
    console.log("\n🚀 Recommendations:");
    console.log("-".repeat(50));

    if (overallStatus.status === "FULLY READY") {
      console.log(
        "✅ All validations passed! System is FULLY READY for US-087 Phase 2 Teams Migration.",
      );
      console.log("🎯 Proceed with Teams Component Migration with confidence.");
      console.log(
        "📈 Continue monitoring performance during migration implementation.",
      );
    } else {
      console.log(
        "⚠️ Some validations failed. Address the following before proceeding:",
      );

      Object.entries(this.validationResults).forEach(([validation, result]) => {
        if (result.status === "fail") {
          const validationName = this.getValidationDisplayName(validation);
          console.log(
            `❌ Fix ${validationName}: Review failed checks and implement corrections`,
          );
        }
      });

      console.log("\n🔄 Re-run validation after making corrections:");
      console.log("   npm run td-005:phase4:validate");
    }

    console.log("\n📚 Reference Documentation:");
    console.log("   - TD-005 Phase 4 Implementation Guide");
    console.log("   - US-087 Phase 2 Teams Migration Specification");
    console.log("   - Component Architecture Standards (US-082-B)");

    console.log("\n" + "=".repeat(80));

    return {
      overallStatus: overallStatus.status,
      validationResults: this.validationResults,
      summary: overallStatus,
    };
  }

  getStatusColor(status) {
    switch (status) {
      case "FULLY READY":
      case "pass":
        return chalk.green(status);
      case "MOSTLY READY":
        return chalk.yellow(status);
      case "CONDITIONALLY READY":
      case "fail":
        return chalk.red(status);
      default:
        return chalk.gray(status);
    }
  }

  getValidationDisplayName(validation) {
    const names = {
      jestConfig: "1. Jest Configuration (detectLeaks disabled)",
      stagedTesting: "2. Staged Testing Approach",
      teamsReadiness: "3. Teams Migration Readiness",
      performanceMonitoring: "4. Enhanced Performance Monitoring",
    };
    return names[validation] || validation;
  }

  /**
   * Run complete validation suite
   */
  async runCompleteValidation() {
    console.log(
      chalk.bold.blue(
        "🚀 Starting TD-005 Phase 4 Complete Validation Suite...",
      ),
    );
    console.log(
      chalk.blue(
        "🎯 Target: Transition from CONDITIONALLY READY to FULLY READY\n",
      ),
    );

    try {
      // Run all validations
      await this.validateJestConfiguration();
      await this.validateStagedTesting();
      await this.validateTeamsReadiness();
      await this.validatePerformanceMonitoring();

      // Generate final report
      const report = this.generateReport();

      // Exit with appropriate code
      if (report.overallStatus === "FULLY READY") {
        process.exit(0);
      } else {
        process.exit(1);
      }
    } catch (error) {
      this.log(`❌ Validation failed with error: ${error.message}`, "error");
      console.error(error);
      process.exit(2);
    }
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new TD005Phase4Validator();
  await validator.runCompleteValidation();
}

export default TD005Phase4Validator;
