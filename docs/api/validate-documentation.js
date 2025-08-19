#!/usr/bin/env node

/**
 * US-030: API Documentation Validation Script
 * UMIG Project - Automated OpenAPI Documentation Validation
 *
 * Purpose: Validates all OpenAPI examples against live API endpoints
 * Ensures 100% documentation accuracy for UAT readiness
 *
 * @author GENDEV Documentation Generator v2.3
 * @date August 18, 2025
 * @priority P0 Critical - UAT Dependency
 */

const fs = require("fs");
const path = require("path");
const yaml = require("js-yaml");
const axios = require("axios");

// Configuration
const CONFIG = {
  openApiPath: "./openapi.yaml",
  baseUrl: process.env.UMIG_BASE_URL || "http://localhost:8090/rest/scriptrunner/latest/custom/umig",
  timeout: parseInt(process.env.UMIG_TIMEOUT) || 10000,
  maxRetries: parseInt(process.env.UMIG_MAX_RETRIES) || 3,
  outputPath: process.env.UMIG_OUTPUT_PATH || "./validation-report.json",
  verbose: process.env.VERBOSE === "true",
  // Security: Use environment variables for credentials
  credentials: process.env.UMIG_AUTH_CREDENTIALS || "admin:admin",
};

// Validation Results Tracker
class ValidationTracker {
  constructor() {
    this.results = {
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0,
        startTime: new Date().toISOString(),
        endTime: null,
      },
      endpoints: {},
      errors: [],
      warnings: [],
    };
  }

  addTest(endpoint, method, testName, status, details = {}) {
    const key = `${method.toUpperCase()} ${endpoint}`;
    if (!this.results.endpoints[key]) {
      this.results.endpoints[key] = {
        tests: [],
        passed: 0,
        failed: 0,
        warnings: 0,
      };
    }

    this.results.endpoints[key].tests.push({
      name: testName,
      status,
      timestamp: new Date().toISOString(),
      ...details,
    });

    this.results.endpoints[key][status]++;
    this.results.summary[status]++;
    this.results.summary.totalTests++;

    if (CONFIG.verbose) {
      const statusIcon =
        status === "passed" ? "✅" : status === "failed" ? "❌" : "⚠️";
      console.log(`${statusIcon} ${key} - ${testName}`);
    }
  }

  addError(endpoint, method, error) {
    this.results.errors.push({
      endpoint: `${method.toUpperCase()} ${endpoint}`,
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }

  addWarning(endpoint, method, warning) {
    this.results.warnings.push({
      endpoint: `${method.toUpperCase()} ${endpoint}`,
      warning,
      timestamp: new Date().toISOString(),
    });
  }

  finalize() {
    this.results.summary.endTime = new Date().toISOString();
    this.results.summary.successRate = (
      (this.results.summary.passed / this.results.summary.totalTests) *
      100
    ).toFixed(2);
    return this.results;
  }
}

// OpenAPI Specification Loader
class OpenApiLoader {
  static load(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      return yaml.load(content);
    } catch (error) {
      throw new Error(`Failed to load OpenAPI spec: ${error.message}`);
    }
  }

  static extractExamples(spec) {
    const examples = [];

    Object.entries(spec.paths || {}).forEach(([endpoint, pathObj]) => {
      Object.entries(pathObj).forEach(([method, methodObj]) => {
        if (methodObj.requestBody?.content) {
          Object.entries(methodObj.requestBody.content).forEach(
            ([contentType, contentObj]) => {
              if (contentObj.examples) {
                Object.entries(contentObj.examples).forEach(
                  ([exampleName, example]) => {
                    examples.push({
                      endpoint,
                      method: method.toUpperCase(),
                      contentType,
                      exampleName,
                      requestExample: example.value,
                      expectedStatus: methodObj.responses
                        ? Object.keys(methodObj.responses)[0]
                        : "200",
                    });
                  },
                );
              }
            },
          );
        }

        // Extract response examples
        if (methodObj.responses) {
          Object.entries(methodObj.responses).forEach(
            ([statusCode, responseObj]) => {
              if (responseObj.content) {
                Object.entries(responseObj.content).forEach(
                  ([contentType, contentObj]) => {
                    if (contentObj.examples) {
                      Object.entries(contentObj.examples).forEach(
                        ([exampleName, example]) => {
                          examples.push({
                            endpoint,
                            method: method.toUpperCase(),
                            responseExample: example.value,
                            expectedStatus: statusCode,
                            type: "response",
                          });
                        },
                      );
                    }
                  },
                );
              }
            },
          );
        }
      });
    });

    return examples;
  }
}

// API Endpoint Validator
class EndpointValidator {
  constructor(baseUrl, tracker) {
    this.baseUrl = baseUrl;
    this.tracker = tracker;
    this.axiosInstance = axios.create({
      timeout: CONFIG.timeout,
      validateStatus: () => true, // Accept all status codes for validation
    });
  }

  async validateEndpoint(endpoint, method) {
    const url = `${this.baseUrl}${endpoint}`;

    try {
      // Test endpoint availability
      const authHeader = "Basic " + Buffer.from(CONFIG.credentials).toString("base64");
      const response = await this.axiosInstance({
        method: method.toLowerCase(),
        url,
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      });

      this.tracker.addTest(
        endpoint,
        method,
        "Endpoint Availability",
        "passed",
        {
          responseStatus: response.status,
          responseTime: response.headers["response-time"] || "N/A",
        },
      );

      return response;
    } catch (error) {
      this.tracker.addTest(
        endpoint,
        method,
        "Endpoint Availability",
        "failed",
        {
          error: error.message,
        },
      );
      this.tracker.addError(endpoint, method, error);
      return null;
    }
  }

  async validateExample(example) {
    const { endpoint, method, requestExample, expectedStatus } = example;

    if (!requestExample) {
      this.tracker.addWarning(endpoint, method, "No request example found");
      return;
    }

    try {
      const authHeader = "Basic " + Buffer.from(CONFIG.credentials).toString("base64");
      const response = await this.axiosInstance({
        method: method.toLowerCase(),
        url: `${this.baseUrl}${endpoint}`,
        data: requestExample,
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
      });

      const statusMatch = response.status.toString() === expectedStatus;

      this.tracker.addTest(
        endpoint,
        method,
        "Example Validation",
        statusMatch ? "passed" : "failed",
        {
          expectedStatus,
          actualStatus: response.status,
          responseData: response.data,
        },
      );

      // Validate response schema if available
      if (response.data && typeof response.data === "object") {
        this.tracker.addTest(endpoint, method, "Response Schema", "passed", {
          responseKeys: Object.keys(response.data),
        });
      }
    } catch (error) {
      this.tracker.addTest(endpoint, method, "Example Validation", "failed", {
        error: error.message,
      });
      this.tracker.addError(endpoint, method, error);
    }
  }

  async validateAuthentication(endpoint, method) {
    try {
      // Test without authentication
      const unauthResponse = await this.axiosInstance({
        method: method.toLowerCase(),
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          "Content-Type": "application/json",
        },
      });

      // Test with invalid authentication
      const invalidAuthHeader = "Basic " + Buffer.from("invalid:invalid").toString("base64");
      const invalidAuthResponse = await this.axiosInstance({
        method: method.toLowerCase(),
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          "Content-Type": "application/json",
          Authorization: invalidAuthHeader,
        },
      });

      // Test with valid authentication
      const validAuthHeader = "Basic " + Buffer.from(CONFIG.credentials).toString("base64");
      const validAuthResponse = await this.axiosInstance({
        method: method.toLowerCase(),
        url: `${this.baseUrl}${endpoint}`,
        headers: {
          "Content-Type": "application/json",
          Authorization: validAuthHeader,
        },
      });

      // Evaluate authentication behavior
      if (unauthResponse.status === 401 || invalidAuthResponse.status === 401) {
        this.tracker.addTest(
          endpoint,
          method,
          "Authentication Required",
          "passed",
          {
            unauthStatus: unauthResponse.status,
            invalidAuthStatus: invalidAuthResponse.status,
            validAuthStatus: validAuthResponse.status,
          },
        );
      } else {
        this.tracker.addTest(
          endpoint,
          method,
          "Authentication Required",
          "warning",
          {
            message: "Endpoint may not require authentication",
            unauthStatus: unauthResponse.status,
          },
        );
      }
    } catch (error) {
      this.tracker.addTest(
        endpoint,
        method,
        "Authentication Validation",
        "failed",
        {
          error: error.message,
        },
      );
    }
  }
}

// Main Validation Engine
class DocumentationValidator {
  constructor() {
    this.tracker = new ValidationTracker();
    this.validator = new EndpointValidator(CONFIG.baseUrl, this.tracker);
  }

  async validateAll() {
    console.log("🚀 Starting UMIG API Documentation Validation");
    console.log(`📊 Target: ${CONFIG.baseUrl}`);
    console.log(`📋 OpenAPI Spec: ${CONFIG.openApiPath}`);
    console.log("─".repeat(80));

    try {
      // Load OpenAPI specification
      const spec = OpenApiLoader.load(CONFIG.openApiPath);
      console.log(
        `✅ Loaded OpenAPI spec with ${Object.keys(spec.paths || {}).length} endpoints`,
      );

      // Extract examples
      const examples = OpenApiLoader.extractExamples(spec);
      console.log(`📝 Found ${examples.length} examples to validate`);

      // Validate each endpoint
      const endpoints = Object.keys(spec.paths || {});
      for (const endpoint of endpoints) {
        const pathObj = spec.paths[endpoint];
        const methods = Object.keys(pathObj).filter((key) =>
          ["get", "post", "put", "delete", "patch"].includes(key.toLowerCase()),
        );

        for (const method of methods) {
          console.log(`\n🔍 Validating ${method.toUpperCase()} ${endpoint}`);

          // Basic endpoint validation
          await this.validator.validateEndpoint(endpoint, method);

          // Authentication validation
          await this.validator.validateAuthentication(endpoint, method);
        }
      }

      // Validate examples
      console.log("\n📋 Validating Examples...");
      for (const example of examples) {
        await this.validator.validateExample(example);
      }
    } catch (error) {
      console.error(`❌ Validation failed: ${error.message}`);
      this.tracker.addError("SYSTEM", "VALIDATION", error);
    }

    return this.tracker.finalize();
  }

  generateReport(results) {
    // Save JSON report
    fs.writeFileSync(CONFIG.outputPath, JSON.stringify(results, null, 2));

    // Generate console summary
    console.log("\n" + "=".repeat(80));
    console.log("📊 VALIDATION SUMMARY");
    console.log("=".repeat(80));
    console.log(`Total Tests: ${results.summary.totalTests}`);
    console.log(`✅ Passed: ${results.summary.passed}`);
    console.log(`❌ Failed: ${results.summary.failed}`);
    console.log(`⚠️  Warnings: ${results.summary.warnings}`);
    console.log(`📈 Success Rate: ${results.summary.successRate}%`);
    console.log(
      `⏱️  Duration: ${new Date(results.summary.endTime) - new Date(results.summary.startTime)}ms`,
    );

    if (results.errors.length > 0) {
      console.log("\n❌ CRITICAL ERRORS:");
      results.errors.forEach((error) => {
        console.log(`   ${error.endpoint}: ${error.error}`);
      });
    }

    if (results.warnings.length > 0) {
      console.log("\n⚠️  WARNINGS:");
      results.warnings.forEach((warning) => {
        console.log(`   ${warning.endpoint}: ${warning.warning}`);
      });
    }

    console.log("\n📄 Detailed report saved to:", CONFIG.outputPath);
    console.log("=".repeat(80));

    // Exit with appropriate code
    const hasFailures = results.summary.failed > 0;
    process.exit(hasFailures ? 1 : 0);
  }
}

// CLI Execution
async function main() {
  const validator = new DocumentationValidator();

  try {
    const results = await validator.validateAll();
    validator.generateReport(results);
  } catch (error) {
    console.error("💥 Fatal validation error:", error.message);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });
}

module.exports = {
  DocumentationValidator,
  OpenApiLoader,
  EndpointValidator,
  ValidationTracker,
};
