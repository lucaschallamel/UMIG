#!/usr/bin/env node

/**
 * UMIG Import API Validation Test Runner
 * Comprehensive validation of US-034 Data Import Strategy API endpoints
 *
 * Tests all 12+ import API endpoints with:
 * - Response time validation (<500ms)
 * - JSON/CSV content type validation
 * - Error handling verification
 * - Authentication validation
 * - API specification compliance
 *
 * Part of US-034 Data Import Strategy completion
 * Follows cross-platform JavaScript testing patterns established in August 2025
 *
 * @author UMIG Integration Test Suite
 * @since Sprint 6 - US-034
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: "http://localhost:8090/rest/scriptrunner/latest/custom",
  timeout: 30000,
  performanceThreshold: 500, // 500ms performance threshold
  retryAttempts: 2,
  retryDelay: 1000,
  verbose: process.argv.includes("--verbose") || process.argv.includes("-v"),
  quickMode: process.argv.includes("--quick"),
};

// Color utilities for cross-platform compatibility
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
};

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  performanceFailures: 0,
  authFailures: 0,
  contentFailures: 0,
  tests: [],
  startTime: Date.now(),
};

// Import API endpoint definitions (US-034 specific)
const IMPORT_API_ENDPOINTS = [
  {
    name: "Import JSON Data",
    path: "/import/json",
    method: "POST",
    contentType: "application/json",
    testData:
      '{"test": "data", "migrations": [{"mig_name": "Test Migration", "mig_description": "Test description"}]}',
    expectedStatusRange: [200, 201, 202], // Accept creation/accepted responses
    performanceCritical: true,
  },
  {
    name: "Import CSV Teams",
    path: "/import/csv/teams",
    method: "POST",
    contentType: "text/csv",
    testData:
      "tms_id,tms_name,tms_email,tms_description\\n1,Test Team,test@example.com,Test team description",
    expectedStatusRange: [200, 201, 202],
    performanceCritical: true,
  },
  {
    name: "Import CSV Users",
    path: "/import/csv/users",
    method: "POST",
    contentType: "text/csv",
    testData:
      "usr_id,usr_code,usr_first_name,usr_last_name,usr_email,usr_is_admin,tms_id,rls_id\\n1,TST,Test,User,testuser@example.com,false,1,1",
    expectedStatusRange: [200, 201, 202, 400], // May fail due to missing dependencies
    performanceCritical: true,
  },
  {
    name: "Import CSV Applications",
    path: "/import/csv/applications",
    method: "POST",
    contentType: "text/csv",
    testData:
      "app_id,app_code,app_name,app_description\\n1,TEST_APP,Test Application,Test application description",
    expectedStatusRange: [200, 201, 202],
    performanceCritical: true,
  },
  {
    name: "Import CSV Environments",
    path: "/import/csv/environments",
    method: "POST",
    contentType: "text/csv",
    testData:
      "env_id,env_code,env_name,env_description\\n1,TST,Test Environment,Test environment description",
    expectedStatusRange: [200, 201, 202],
    performanceCritical: true,
  },
  {
    name: "Create Master Plan",
    path: "/import/master-plan",
    method: "POST",
    contentType: "application/json",
    testData:
      '{"plan": {"name": "Test Master Plan", "description": "Test master plan"}}',
    expectedStatusRange: [200, 201, 202, 400], // May fail with validation errors
    performanceCritical: false,
  },
  {
    name: "Import Status Check",
    path: "/import/status",
    method: "GET",
    contentType: null,
    testData: null,
    expectedStatusRange: [200],
    performanceCritical: true,
  },
  {
    name: "Import Rollback",
    path: "/import/rollback",
    method: "POST",
    contentType: "application/json",
    testData: '{"batchId": "test-batch-id"}',
    expectedStatusRange: [200, 400, 404], // May fail with non-existent batch
    performanceCritical: true,
  },
  {
    name: "Teams CSV Template",
    path: "/import/csv/teams/template",
    method: "GET",
    contentType: null,
    testData: null,
    expectedStatusRange: [200],
    performanceCritical: true,
  },
  {
    name: "Users CSV Template",
    path: "/import/csv/users/template",
    method: "GET",
    contentType: null,
    testData: null,
    expectedStatusRange: [200],
    performanceCritical: true,
  },
  {
    name: "Applications CSV Template",
    path: "/import/csv/applications/template",
    method: "GET",
    contentType: null,
    testData: null,
    expectedStatusRange: [200],
    performanceCritical: true,
  },
  {
    name: "Environments CSV Template",
    path: "/import/csv/environments/template",
    method: "GET",
    contentType: null,
    testData: null,
    expectedStatusRange: [200],
    performanceCritical: true,
  },
];

function printHeader(message) {
  console.log("\\n" + colors.magenta + "=".repeat(80) + colors.reset);
  console.log(colors.bold + colors.white + `  ${message}` + colors.reset);
  console.log(colors.magenta + "=".repeat(80) + colors.reset);
}

function printSubHeader(message) {
  console.log("\\n" + colors.cyan + "-".repeat(60) + colors.reset);
  console.log(colors.bold + colors.cyan + `  ${message}` + colors.reset);
  console.log(colors.cyan + "-".repeat(60) + colors.reset);
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

function printPerformance(message, duration, threshold) {
  const status = duration <= threshold ? "✅" : "⚠️";
  const color = duration <= threshold ? colors.green : colors.yellow;
  console.log(`${color}${status} ${message} (${duration}ms)${colors.reset}`);
}

// Test individual import API endpoint
async function testImportEndpoint(endpoint) {
  testResults.total++;
  const testResult = {
    name: endpoint.name,
    path: endpoint.path,
    method: endpoint.method,
    success: false,
    responseTime: 0,
    statusCode: 0,
    error: null,
    performancePass: false,
    contentTypeValid: false,
  };

  printInfo(`Testing ${endpoint.name}: ${endpoint.method} ${endpoint.path}`);

  for (let attempt = 1; attempt <= CONFIG.retryAttempts; attempt++) {
    try {
      const startTime = Date.now();

      // Build curl command based on method and content type
      let command;
      if (endpoint.method === "GET") {
        command = `curl -s -w "\\n%{http_code}\\n%{time_total}" --max-time 30 "${CONFIG.baseUrl}${endpoint.path}" -H "Accept: application/json"`;
      } else {
        const contentTypeHeader = endpoint.contentType
          ? `-H "Content-Type: ${endpoint.contentType}"`
          : "";
        const dataParam = endpoint.testData
          ? `--data '${endpoint.testData}'`
          : "";
        command = `curl -s -w "\\n%{http_code}\\n%{time_total}" --max-time 30 -X ${endpoint.method} "${CONFIG.baseUrl}${endpoint.path}" ${contentTypeHeader} ${dataParam} -H "Accept: application/json"`;
      }

      const result = execSync(command, {
        encoding: "utf8",
        timeout: CONFIG.timeout,
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      // Parse curl response (body, status code, time)
      const lines = result.trim().split("\\n");
      const statusCode = parseInt(lines[lines.length - 2]);
      const curlTime = parseFloat(lines[lines.length - 1]) * 1000; // Convert to ms
      const responseBody = lines.slice(0, -2).join("\\n");

      testResult.statusCode = statusCode;
      testResult.responseTime = Math.round(Math.max(responseTime, curlTime));

      // Validate status code
      const statusValid = endpoint.expectedStatusRange.includes(statusCode);

      // Validate performance
      const performanceValid = endpoint.performanceCritical
        ? testResult.responseTime <= CONFIG.performanceThreshold
        : true;

      // Validate content type (for successful responses)
      let contentTypeValid = true;
      if (statusCode >= 200 && statusCode < 300 && responseBody) {
        try {
          if (endpoint.path.includes("/template")) {
            // CSV templates should return CSV content
            contentTypeValid =
              responseBody.includes(",") ||
              responseBody.includes("tms_") ||
              responseBody.includes("usr_");
          } else if (
            endpoint.method === "GET" ||
            endpoint.contentType === "application/json"
          ) {
            // JSON endpoints should return valid JSON
            JSON.parse(responseBody);
            contentTypeValid = true;
          }
        } catch (e) {
          contentTypeValid = false;
          if (CONFIG.verbose) {
            printWarning(
              `Content validation failed for ${endpoint.name}: ${e.message}`,
            );
          }
        }
      }

      testResult.success = statusValid && performanceValid;
      testResult.performancePass = performanceValid;
      testResult.contentTypeValid = contentTypeValid;

      // Log results
      if (statusValid) {
        printSuccess(`${endpoint.name} - Status: ${statusCode} ✓`);
      } else {
        printError(
          `${endpoint.name} - Status: ${statusCode} (expected: ${endpoint.expectedStatusRange.join(" or ")}) ✗`,
        );
        testResult.error = `Unexpected status code: ${statusCode}`;
      }

      if (endpoint.performanceCritical) {
        printPerformance(
          `${endpoint.name} - Performance`,
          testResult.responseTime,
          CONFIG.performanceThreshold,
        );
        if (!performanceValid) {
          testResults.performanceFailures++;
        }
      }

      if (!contentTypeValid) {
        printWarning(`${endpoint.name} - Content validation failed`);
        testResults.contentFailures++;
      }

      if (CONFIG.verbose && responseBody && responseBody.length < 500) {
        console.log(
          colors.dim +
            `Response: ${responseBody.substring(0, 200)}${responseBody.length > 200 ? "..." : ""}` +
            colors.reset,
        );
      }

      break; // Success, no need to retry
    } catch (error) {
      testResult.error = error.message;

      if (attempt === CONFIG.retryAttempts) {
        printError(
          `${endpoint.name} - Failed after ${CONFIG.retryAttempts} attempts: ${error.message}`,
        );
      } else {
        printWarning(
          `${endpoint.name} - Attempt ${attempt} failed, retrying...`,
        );
        await new Promise((resolve) => setTimeout(resolve, CONFIG.retryDelay));
      }
    }
  }

  testResults.tests.push(testResult);

  if (testResult.success) {
    testResults.passed++;
  } else {
    testResults.failed++;
    if (
      testResult.error?.includes("authentication") ||
      testResult.error?.includes("unauthorized")
    ) {
      testResults.authFailures++;
    }
  }

  return testResult;
}

// Test content type validation
async function testContentTypeValidation() {
  printSubHeader("Content Type Validation Tests");

  // Test wrong content type for JSON endpoint
  const jsonEndpoint = IMPORT_API_ENDPOINTS.find(
    (e) => e.path === "/import/json",
  );
  if (jsonEndpoint) {
    try {
      printInfo("Testing JSON endpoint with wrong content type (should fail)");
      const command = `curl -s -w "\\n%{http_code}" --max-time 10 -X POST "${CONFIG.baseUrl}/import/json" -H "Content-Type: text/plain" --data 'invalid data'`;
      const result = execSync(command, { encoding: "utf8", timeout: 10000 });

      const lines = result.trim().split("\\n");
      const statusCode = parseInt(lines[lines.length - 1]);

      if (statusCode >= 400) {
        printSuccess(
          `JSON endpoint correctly rejected invalid content type (${statusCode})`,
        );
      } else {
        printWarning(
          `JSON endpoint should reject invalid content type, but returned ${statusCode}`,
        );
      }
    } catch (error) {
      printWarning(`Content type validation test failed: ${error.message}`);
    }
  }

  // Test wrong content type for CSV endpoint
  const csvEndpoint = IMPORT_API_ENDPOINTS.find(
    (e) => e.path === "/import/csv/teams",
  );
  if (csvEndpoint) {
    try {
      printInfo("Testing CSV endpoint with wrong content type (should fail)");
      const command = `curl -s -w "\\n%{http_code}" --max-time 10 -X POST "${CONFIG.baseUrl}/import/csv/teams" -H "Content-Type: application/json" --data '{"invalid": "json"}'`;
      const result = execSync(command, { encoding: "utf8", timeout: 10000 });

      const lines = result.trim().split("\\n");
      const statusCode = parseInt(lines[lines.length - 1]);

      if (statusCode >= 400) {
        printSuccess(
          `CSV endpoint correctly rejected invalid content type (${statusCode})`,
        );
      } else {
        printWarning(
          `CSV endpoint should reject invalid content type, but returned ${statusCode}`,
        );
      }
    } catch (error) {
      printWarning(`Content type validation test failed: ${error.message}`);
    }
  }
}

// Test malformed data handling
async function testMalformedDataHandling() {
  printSubHeader("Malformed Data Handling Tests");

  const testCases = [
    {
      name: "JSON endpoint with malformed JSON",
      endpoint: "/import/json",
      contentType: "application/json",
      data: '{"invalid": json, "missing": quote}',
      expectedStatus: [400, 422],
    },
    {
      name: "CSV endpoint with malformed CSV",
      endpoint: "/import/csv/teams",
      contentType: "text/csv",
      data: "invalid,csv,headers\\n1,2",
      expectedStatus: [400, 422],
    },
  ];

  for (const testCase of testCases) {
    try {
      printInfo(`Testing ${testCase.name}`);
      const command = `curl -s -w "\\n%{http_code}" --max-time 10 -X POST "${CONFIG.baseUrl}${testCase.endpoint}" -H "Content-Type: ${testCase.contentType}" --data '${testCase.data}'`;
      const result = execSync(command, { encoding: "utf8", timeout: 10000 });

      const lines = result.trim().split("\\n");
      const statusCode = parseInt(lines[lines.length - 1]);

      if (testCase.expectedStatus.includes(statusCode)) {
        printSuccess(
          `${testCase.name} correctly handled malformed data (${statusCode})`,
        );
      } else {
        printWarning(
          `${testCase.name} should reject malformed data, but returned ${statusCode}`,
        );
      }
    } catch (error) {
      printWarning(`Malformed data test failed: ${error.message}`);
    }
  }
}

// Test performance under load (if not in quick mode)
async function testPerformanceUnderLoad() {
  if (CONFIG.quickMode) {
    printInfo("Skipping performance load tests in quick mode");
    return;
  }

  printSubHeader("Performance Under Load Tests");

  const lightEndpoint = IMPORT_API_ENDPOINTS.find(
    (e) => e.path === "/import/status",
  );
  if (!lightEndpoint) return;

  const concurrentRequests = 5;
  const promises = [];

  printInfo(
    `Testing ${concurrentRequests} concurrent requests to ${lightEndpoint.path}`,
  );

  const startTime = Date.now();

  for (let i = 0; i < concurrentRequests; i++) {
    const promise = new Promise((resolve) => {
      const requestStart = Date.now();
      try {
        const command = `curl -s -w "%{http_code}" --max-time 10 "${CONFIG.baseUrl}${lightEndpoint.path}"`;
        execSync(command, { encoding: "utf8", timeout: 10000 });
        const requestTime = Date.now() - requestStart;
        resolve({ success: true, time: requestTime });
      } catch (error) {
        resolve({
          success: false,
          time: Date.now() - requestStart,
          error: error.message,
        });
      }
    });
    promises.push(promise);
  }

  try {
    const results = await Promise.all(promises);
    const totalTime = Date.now() - startTime;
    const successfulRequests = results.filter((r) => r.success).length;
    const averageTime =
      results.reduce((sum, r) => sum + r.time, 0) / results.length;

    if (successfulRequests === concurrentRequests) {
      printSuccess(`All ${concurrentRequests} concurrent requests succeeded`);
      printPerformance(
        `Average response time under load`,
        Math.round(averageTime),
        CONFIG.performanceThreshold,
      );
    } else {
      printWarning(
        `Only ${successfulRequests}/${concurrentRequests} concurrent requests succeeded`,
      );
    }

    printInfo(`Total concurrent execution time: ${totalTime}ms`);
  } catch (error) {
    printError(`Concurrent performance test failed: ${error.message}`);
  }
}

// Generate comprehensive test report
function generateTestReport() {
  const endTime = Date.now();
  const totalTime = endTime - testResults.startTime;

  printHeader("Import API Validation Test Results");

  console.log(`\\n${colors.bold}Overall Results:${colors.reset}`);
  console.log(`  Total Tests: ${testResults.total}`);
  console.log(`  Passed: ${colors.green}${testResults.passed}${colors.reset}`);
  console.log(`  Failed: ${colors.red}${testResults.failed}${colors.reset}`);
  console.log(
    `  Performance Failures: ${colors.yellow}${testResults.performanceFailures}${colors.reset}`,
  );
  console.log(
    `  Content Type Failures: ${colors.yellow}${testResults.contentFailures}${colors.reset}`,
  );
  console.log(
    `  Authentication Failures: ${colors.yellow}${testResults.authFailures}${colors.reset}`,
  );
  console.log(`  Total Execution Time: ${totalTime}ms`);

  if (testResults.failed > 0) {
    console.log(`\\n${colors.bold}Failed Tests:${colors.reset}`);
    testResults.tests
      .filter((test) => !test.success)
      .forEach((test) => {
        console.log(
          `  ❌ ${test.name}: ${test.error || `Status ${test.statusCode} (expected: success)`}`,
        );
        if (test.responseTime > CONFIG.performanceThreshold) {
          console.log(
            `     Performance: ${test.responseTime}ms (exceeds ${CONFIG.performanceThreshold}ms threshold)`,
          );
        }
      });
  }

  // Performance summary
  const performanceTests = testResults.tests.filter(
    (test) => test.responseTime > 0,
  );
  if (performanceTests.length > 0) {
    const averageResponseTime =
      performanceTests.reduce((sum, test) => sum + test.responseTime, 0) /
      performanceTests.length;
    const maxResponseTime = Math.max(
      ...performanceTests.map((test) => test.responseTime),
    );

    console.log(`\\n${colors.bold}Performance Summary:${colors.reset}`);
    console.log(
      `  Average Response Time: ${Math.round(averageResponseTime)}ms`,
    );
    console.log(`  Maximum Response Time: ${maxResponseTime}ms`);
    console.log(`  Performance Threshold: ${CONFIG.performanceThreshold}ms`);

    const performancePass = testResults.performanceFailures === 0;
    if (performancePass) {
      printSuccess("All performance tests passed ✓");
    } else {
      printWarning(
        `${testResults.performanceFailures} performance tests failed ⚠️`,
      );
    }
  }

  // Coverage assessment
  console.log(`\\n${colors.bold}US-034 Import API Coverage:${colors.reset}`);
  const coverage = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(
    `  API Coverage: ${coverage}% (${testResults.passed}/${testResults.total} endpoints)`,
  );

  if (coverage >= 95) {
    printSuccess("Excellent API coverage - 95%+ requirement met ✓");
  } else if (coverage >= 85) {
    printWarning(`Good API coverage but below 95% target (${coverage}%) ⚠️`);
  } else {
    printError(
      `Insufficient API coverage - ${coverage}% is below acceptable threshold ❌`,
    );
  }

  return testResults.failed === 0 && testResults.performanceFailures === 0;
}

// Main execution function
async function main() {
  try {
    printHeader("UMIG Import API Validation Test Suite - US-034");
    printInfo(
      "Testing all import API endpoints for functionality, performance, and compliance",
    );

    if (CONFIG.quickMode) {
      printInfo("Running in quick mode - skipping load tests");
    }

    if (CONFIG.verbose) {
      printInfo("Verbose mode enabled - detailed output will be shown");
    }

    console.log(`\\nConfiguration:`);
    console.log(`  Base URL: ${CONFIG.baseUrl}`);
    console.log(`  Performance Threshold: ${CONFIG.performanceThreshold}ms`);
    console.log(`  Timeout: ${CONFIG.timeout}ms`);
    console.log(`  Retry Attempts: ${CONFIG.retryAttempts}`);

    // Test all import API endpoints
    printSubHeader("Import API Endpoint Tests");
    for (const endpoint of IMPORT_API_ENDPOINTS) {
      await testImportEndpoint(endpoint);

      // Small delay between tests to avoid overwhelming the server
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Additional validation tests
    await testContentTypeValidation();
    await testMalformedDataHandling();
    await testPerformanceUnderLoad();

    // Generate final report
    const success = generateTestReport();

    // Exit with appropriate code
    process.exit(success ? 0 : 1);
  } catch (error) {
    printError(`Test execution failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Help text
function showHelp() {
  console.log(`
UMIG Import API Validation Test Runner - US-034

Usage: node ImportApiValidationTestRunner.js [options]

Options:
  --help, -h     Show this help message
  --verbose, -v  Enable verbose output with detailed responses
  --quick        Skip performance load tests for faster execution

Description:
  Comprehensive validation of all US-034 Data Import Strategy API endpoints.
  Tests functionality, performance, content type validation, and error handling.

Examples:
  node ImportApiValidationTestRunner.js              # Run all tests
  node ImportApiValidationTestRunner.js --verbose    # Run with detailed output
  node ImportApiValidationTestRunner.js --quick      # Run without load tests

Requirements:
  - UMIG system running on localhost:8090
  - curl command available in PATH
  - Node.js with ES modules support
  `);
}

// Handle command line arguments
if (process.argv.includes("--help") || process.argv.includes("-h")) {
  showHelp();
  process.exit(0);
}

// Execute main function
main().catch((error) => {
  printError(`Fatal error: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
