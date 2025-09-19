#!/usr/bin/env node

/**
 * Test Infrastructure Validator
 * Comprehensive validation of test infrastructure setup to diagnose and fix
 * the critical issues reported in the remediation project
 *
 * Validates:
 * 1. Labels security test stack overflow issues
 * 2. PostgreSQL driver configuration for Groovy tests
 * 3. Applications security test authentication failures
 * 4. Jest configuration and dependency setup
 */

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

class TestInfrastructureValidator {
  constructor() {
    this.issues = [];
    this.fixes = [];
    this.projectRoot = path.resolve(process.cwd(), "..");
    this.localDevSetup = process.cwd();
  }

  log(level, message) {
    const prefix =
      {
        INFO: "🔍",
        SUCCESS: "✅",
        WARNING: "⚠️",
        ERROR: "❌",
        FIX: "🔧",
      }[level] || "📝";

    console.log(`${prefix} ${message}`);
  }

  addIssue(category, issue, severity = "MEDIUM") {
    this.issues.push({ category, issue, severity });
    this.log("ERROR", `${category}: ${issue}`);
  }

  addFix(category, fix) {
    this.fixes.push({ category, fix });
    this.log("FIX", `${category}: ${fix}`);
  }

  /**
   * Validate Labels security test stack overflow issue
   */
  validateLabelsSecurityTests() {
    this.log("INFO", "Validating Labels security test configuration...");

    // Check if Jest security configuration exists and is properly set up
    const jestSecurityConfig = path.join(
      this.localDevSetup,
      "jest.config.security.js",
    );
    if (!fs.existsSync(jestSecurityConfig)) {
      this.addIssue(
        "LABELS_SECURITY",
        "Jest security configuration missing",
        "HIGH",
      );
      return false;
    }

    // Check if mock file exists to prevent tough-cookie stack overflow
    const jestMockFile = path.join(
      this.localDevSetup,
      "jest.mocks.security.js",
    );
    if (!fs.existsSync(jestMockFile)) {
      this.addIssue(
        "LABELS_SECURITY",
        "Security mock file missing - causes tough-cookie stack overflow",
        "HIGH",
      );
      return false;
    }

    // Check if security setup file exists
    const securitySetup = path.join(
      this.localDevSetup,
      "jest.setup.security.js",
    );
    if (!fs.existsSync(securitySetup)) {
      this.addIssue(
        "LABELS_SECURITY",
        "Security test setup file missing",
        "MEDIUM",
      );
    }

    // Validate Jest configuration content
    try {
      const configContent = fs.readFileSync(jestSecurityConfig, "utf8");

      if (!configContent.includes('testEnvironment: "node"')) {
        this.addIssue(
          "LABELS_SECURITY",
          "Jest security config should use node environment to avoid jsdom conflicts",
          "HIGH",
        );
      }

      if (!configContent.includes("jest.mocks.security.js")) {
        this.addIssue(
          "LABELS_SECURITY",
          "Jest security config missing module mapping for tough-cookie",
          "HIGH",
        );
      }

      this.log("SUCCESS", "Labels security test configuration validated");
      return true;
    } catch (error) {
      this.addIssue(
        "LABELS_SECURITY",
        `Failed to read Jest security config: ${error.message}`,
        "HIGH",
      );
      return false;
    }
  }

  /**
   * Validate PostgreSQL driver configuration for Groovy tests
   */
  validateGroovyPostgreSQLSetup() {
    this.log("INFO", "Validating Groovy PostgreSQL driver configuration...");

    // Check JDBC directory and files
    const jdbcDir = path.join(this.localDevSetup, "jdbc-drivers");
    if (!fs.existsSync(jdbcDir)) {
      this.addIssue(
        "GROOVY_POSTGRESQL",
        "JDBC drivers directory missing",
        "HIGH",
      );
      this.addFix("GROOVY_POSTGRESQL", "Run: npm run setup:groovy-jdbc");
      return false;
    }

    const postgresqlJar = path.join(jdbcDir, "postgresql-42.7.3.jar");
    if (!fs.existsSync(postgresqlJar)) {
      this.addIssue(
        "GROOVY_POSTGRESQL",
        "PostgreSQL JDBC driver JAR missing",
        "HIGH",
      );
      this.addFix("GROOVY_POSTGRESQL", "Run: npm run setup:groovy-jdbc");
    }

    const groovyWrapper = path.join(jdbcDir, "groovy-with-jdbc");
    if (!fs.existsSync(groovyWrapper)) {
      this.addIssue(
        "GROOVY_POSTGRESQL",
        "Groovy JDBC wrapper script missing",
        "HIGH",
      );
      this.addFix("GROOVY_POSTGRESQL", "Run: npm run setup:groovy-jdbc");
    } else {
      // Check wrapper script is executable
      try {
        const stats = fs.statSync(groovyWrapper);
        if (!(stats.mode & parseInt("111", 8))) {
          this.addIssue(
            "GROOVY_POSTGRESQL",
            "Groovy wrapper script not executable",
            "MEDIUM",
          );
          this.addFix("GROOVY_POSTGRESQL", `chmod +x ${groovyWrapper}`);
        }
      } catch (error) {
        this.addIssue(
          "GROOVY_POSTGRESQL",
          `Failed to check wrapper permissions: ${error.message}`,
          "LOW",
        );
      }
    }

    // Check if enhanced test runner exists
    const testRunner = path.join(
      this.localDevSetup,
      "scripts/run-groovy-test.js",
    );
    if (!fs.existsSync(testRunner)) {
      this.addIssue(
        "GROOVY_POSTGRESQL",
        "Enhanced Groovy test runner missing",
        "MEDIUM",
      );
    }

    // Check if test configuration exists
    const testConfig = path.join(
      this.projectRoot,
      "src/groovy/umig/tests/config/TestConfiguration.groovy",
    );
    if (!fs.existsSync(testConfig)) {
      this.addIssue(
        "GROOVY_POSTGRESQL",
        "Groovy test configuration missing",
        "MEDIUM",
      );
    }

    this.log("SUCCESS", "Groovy PostgreSQL setup validated");
    return true;
  }

  /**
   * Validate Applications security test authentication setup
   */
  validateApplicationsSecurityTests() {
    this.log("INFO", "Validating Applications security test configuration...");

    const appsSecurityTest = path.join(
      this.localDevSetup,
      "__tests__/entities/applications/ApplicationsEntityManager.security.test.js",
    );

    if (!fs.existsSync(appsSecurityTest)) {
      this.addIssue(
        "APPS_SECURITY",
        "Applications security test file missing",
        "HIGH",
      );
      return false;
    }

    try {
      const testContent = fs.readFileSync(appsSecurityTest, "utf8");

      // Check for proper authentication fallback methods
      if (!testContent.includes("getCurrentUser()")) {
        this.addIssue(
          "APPS_SECURITY",
          "Authentication method getCurrentUser missing",
          "HIGH",
        );
      }

      if (!testContent.includes("extractUserFromCookie()")) {
        this.addIssue(
          "APPS_SECURITY",
          "Cookie authentication fallback missing",
          "MEDIUM",
        );
      }

      if (!testContent.includes("global.btoa")) {
        this.addIssue(
          "APPS_SECURITY",
          "btoa mock missing - causes authentication test failures",
          "MEDIUM",
        );
      }

      // Check for retry logic implementation
      if (!testContent.includes("retryOperation")) {
        this.addIssue(
          "APPS_SECURITY",
          "Retry operation method missing",
          "MEDIUM",
        );
      }

      this.log("SUCCESS", "Applications security test configuration validated");
      return true;
    } catch (error) {
      this.addIssue(
        "APPS_SECURITY",
        `Failed to read Applications security test: ${error.message}`,
        "HIGH",
      );
      return false;
    }
  }

  /**
   * Validate Jest configurations and dependencies
   */
  validateJestConfiguration() {
    this.log("INFO", "Validating Jest configuration and dependencies...");

    const packageJson = path.join(this.localDevSetup, "package.json");
    if (!fs.existsSync(packageJson)) {
      this.addIssue("JEST_CONFIG", "package.json missing", "HIGH");
      return false;
    }

    try {
      const packageData = JSON.parse(fs.readFileSync(packageJson, "utf8"));

      // Check required dependencies
      const requiredDeps = [
        "jest",
        "jest-environment-jsdom",
        "babel-jest",
        "@babel/preset-env",
      ];

      const missingDeps = requiredDeps.filter(
        (dep) =>
          !packageData.dependencies?.[dep] &&
          !packageData.devDependencies?.[dep],
      );

      if (missingDeps.length > 0) {
        this.addIssue(
          "JEST_CONFIG",
          `Missing dependencies: ${missingDeps.join(", ")}`,
          "HIGH",
        );
        this.addFix("JEST_CONFIG", `npm install ${missingDeps.join(" ")}`);
      }

      // Check test scripts
      const requiredScripts = [
        "test:js:security:labels",
        "test:js:security:applications",
        "test:groovy:unit",
        "test:groovy:integration",
      ];

      const missingScripts = requiredScripts.filter(
        (script) => !packageData.scripts?.[script],
      );

      if (missingScripts.length > 0) {
        this.addIssue(
          "JEST_CONFIG",
          `Missing test scripts: ${missingScripts.join(", ")}`,
          "MEDIUM",
        );
      }

      this.log("SUCCESS", "Jest configuration validated");
      return true;
    } catch (error) {
      this.addIssue(
        "JEST_CONFIG",
        `Failed to read package.json: ${error.message}`,
        "HIGH",
      );
      return false;
    }
  }

  /**
   * Test actual execution to detect runtime issues
   */
  async testExecution() {
    this.log("INFO", "Running test execution validation...");

    // Test Labels security with timeout
    try {
      this.log("INFO", "Testing Labels security test execution...");
      execSync("timeout 30s npm run test:js:security:labels", {
        stdio: "pipe",
        cwd: this.localDevSetup,
      });
      this.log(
        "SUCCESS",
        "Labels security tests execute without stack overflow",
      );
    } catch (error) {
      if (
        error.message.includes("stack overflow") ||
        error.message.includes("Maximum call stack")
      ) {
        this.addIssue(
          "EXECUTION",
          "Labels security tests still have stack overflow issue",
          "HIGH",
        );
        this.addFix(
          "EXECUTION",
          "Check jest.mocks.security.js and jest.config.security.js configuration",
        );
      } else {
        this.log(
          "WARNING",
          `Labels security tests failed but not due to stack overflow: ${error.message.substring(0, 100)}`,
        );
      }
    }

    // Test Groovy execution
    try {
      this.log("INFO", "Testing Groovy test execution...");
      execSync("timeout 30s npm run test:groovy:unit", {
        stdio: "pipe",
        cwd: this.localDevSetup,
      });
      this.log("SUCCESS", "Groovy tests execute without JDBC issues");
    } catch (error) {
      if (
        error.message.includes("postgresql") ||
        error.message.includes("JDBC")
      ) {
        this.addIssue(
          "EXECUTION",
          "Groovy tests still have PostgreSQL JDBC issues",
          "HIGH",
        );
        this.addFix(
          "EXECUTION",
          "Run: npm run setup:groovy-jdbc and check database connectivity",
        );
      } else {
        this.log(
          "WARNING",
          `Groovy tests failed but not due to JDBC: ${error.message.substring(0, 100)}`,
        );
      }
    }
  }

  /**
   * Generate remediation report
   */
  generateReport() {
    console.log("\n" + "=".repeat(80));
    console.log("🔍 TEST INFRASTRUCTURE VALIDATION REPORT");
    console.log("=".repeat(80));

    if (this.issues.length === 0) {
      this.log("SUCCESS", "All test infrastructure validations passed!");
    } else {
      console.log(`\n❌ Found ${this.issues.length} issues:`);

      // Group issues by severity
      const groupedIssues = this.issues.reduce((acc, issue) => {
        if (!acc[issue.severity]) acc[issue.severity] = [];
        acc[issue.severity].push(issue);
        return acc;
      }, {});

      ["HIGH", "MEDIUM", "LOW"].forEach((severity) => {
        if (groupedIssues[severity]) {
          console.log(
            `\n🚨 ${severity} PRIORITY (${groupedIssues[severity].length} issues):`,
          );
          groupedIssues[severity].forEach((issue, index) => {
            console.log(`   ${index + 1}. [${issue.category}] ${issue.issue}`);
          });
        }
      });
    }

    if (this.fixes.length > 0) {
      console.log(`\n🔧 RECOMMENDED FIXES (${this.fixes.length} actions):`);
      this.fixes.forEach((fix, index) => {
        console.log(`   ${index + 1}. [${fix.category}] ${fix.fix}`);
      });
    }

    console.log("\n📊 VALIDATION SUMMARY:");
    console.log(`   Issues Found: ${this.issues.length}`);
    console.log(`   Fixes Available: ${this.fixes.length}`);
    console.log(
      `   Validation Status: ${this.issues.length === 0 ? "PASS" : "FAIL"}`,
    );

    return this.issues.length === 0;
  }

  /**
   * Run all validations
   */
  async runValidation() {
    console.log("🚀 Starting Test Infrastructure Validation");
    console.log("==========================================");

    this.validateLabelsSecurityTests();
    this.validateGroovyPostgreSQLSetup();
    this.validateApplicationsSecurityTests();
    this.validateJestConfiguration();

    // Only run execution tests if basic setup is OK
    const criticalIssues = this.issues.filter(
      (issue) => issue.severity === "HIGH",
    );
    if (criticalIssues.length === 0) {
      await this.testExecution();
    } else {
      this.log(
        "WARNING",
        "Skipping execution tests due to critical configuration issues",
      );
    }

    return this.generateReport();
  }
}

// Execute validation
if (import.meta.url === `file://${process.argv[1]}`) {
  const validator = new TestInfrastructureValidator();
  validator
    .runValidation()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error("❌ Validation failed:", error.message);
      process.exit(1);
    });
}
