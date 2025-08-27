#!/usr/bin/env node

/**
 * UMIG API Smoke Test Suite
 * JavaScript equivalent of api-smoke-test.sh
 * Provides comprehensive API endpoint testing
 * Created: 2025-08-27 (converted from shell script)
 */

import { execSync } from "child_process";

// Configuration
const CONFIG = {
  baseUrl: "http://localhost:8090/rest/scriptrunner/latest/custom",
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 2000,
};

// Color utilities
const colors = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  reset: "\x1b[0m",
};

function printHeader(message) {
  console.log("\n" + "=".repeat(80));
  console.log(`  ${message}`);
  console.log("=".repeat(80));
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

// API endpoint definitions
const API_ENDPOINTS = [
  { name: "Users API", path: "/api/v2/users" },
  { name: "Teams API", path: "/api/v2/teams" },
  { name: "Environments API", path: "/api/v2/environments" },
  { name: "Applications API", path: "/api/v2/applications" },
  { name: "Labels API", path: "/api/v2/labels" },
  { name: "Migrations API", path: "/api/v2/migrations" },
  { name: "Plans API", path: "/api/v2/plans" },
  { name: "Sequences API", path: "/api/v2/sequences" },
  { name: "Phases API", path: "/api/v2/phases" },
  { name: "Steps API", path: "/api/v2/steps" },
  { name: "Instructions API", path: "/api/v2/instructions" },
  { name: "Iterations API", path: "/api/v2/iterations" },
  { name: "Status API", path: "/api/v2/status" },
];

// Test individual API endpoint
async function testEndpoint(endpoint) {
  const url = `${CONFIG.baseUrl}${endpoint.path}`;

  printInfo(`Testing ${endpoint.name}: ${endpoint.path}`);

  for (let attempt = 1; attempt <= CONFIG.retryAttempts; attempt++) {
    try {
      const command = `curl -s -w "\\n%{http_code}" --max-time 30 "${url}" -H "Accept: application/json"`;
      const result = execSync(command, {
        encoding: "utf8",
        timeout: CONFIG.timeout,
      });

      const lines = result.trim().split("\n");
      const httpCode = lines[lines.length - 1];
      const responseBody = lines.slice(0, -1).join("\n");

      if (httpCode === "200") {
        printSuccess(`${endpoint.name} - HTTP 200 OK`);

        // Validate JSON response if not empty
        if (responseBody && responseBody.length > 0) {
          try {
            JSON.parse(responseBody);
            printInfo(`  JSON response valid (${responseBody.length} chars)`);
          } catch (parseError) {
            printWarning(`  Response not valid JSON, but HTTP 200 received`);
          }
        } else {
          printInfo(`  Empty response body (valid for some endpoints)`);
        }

        return { success: true, httpCode, endpoint: endpoint.name };
      } else {
        throw new Error(`HTTP ${httpCode}`);
      }
    } catch (error) {
      if (attempt === CONFIG.retryAttempts) {
        printError(
          `${endpoint.name} - Failed after ${CONFIG.retryAttempts} attempts: ${error.message}`,
        );
        return {
          success: false,
          error: error.message,
          endpoint: endpoint.name,
        };
      } else {
        printWarning(
          `${endpoint.name} - Attempt ${attempt} failed, retrying...`,
        );
        await new Promise((resolve) => setTimeout(resolve, CONFIG.retryDelay));
      }
    }
  }
}

// Test all endpoints
async function runSmokeTests() {
  printHeader("UMIG API Smoke Test Suite");

  console.log(`Base URL: ${CONFIG.baseUrl}`);
  console.log(`Timeout: ${CONFIG.timeout}ms per request`);
  console.log(`Retry attempts: ${CONFIG.retryAttempts}`);
  console.log(`Testing ${API_ENDPOINTS.length} endpoints...`);
  console.log("");

  const results = [];

  for (const endpoint of API_ENDPOINTS) {
    const result = await testEndpoint(endpoint);
    results.push(result);
    console.log(""); // Add spacing between tests
  }

  // Summary
  printHeader("Test Results Summary");

  const successful = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  console.log(`Total endpoints tested: ${results.length}`);
  printSuccess(`Successful: ${successful.length}`);

  if (failed.length > 0) {
    printError(`Failed: ${failed.length}`);
    console.log("\nFailed endpoints:");
    failed.forEach((result) => {
      printError(`  ${result.endpoint}: ${result.error}`);
    });
  }

  console.log(
    `\nSuccess rate: ${Math.round((successful.length / results.length) * 100)}%`,
  );

  if (successful.length === results.length) {
    printSuccess("\n🎉 All API endpoints are responding correctly!");
    process.exit(0);
  } else {
    printError("\n💥 Some API endpoints are failing - check the errors above");
    process.exit(1);
  }
}

// Health check before starting tests
async function healthCheck() {
  printInfo("Performing health check...");

  try {
    execSync("curl -s --max-time 5 http://localhost:8090 > /dev/null", {
      timeout: 5000,
    });
    printSuccess("Confluence server is responding");
  } catch (error) {
    printError(
      "Confluence server is not responding - ensure it is running on port 8090",
    );
    process.exit(1);
  }
}

// Main execution
async function main() {
  try {
    await healthCheck();
    await runSmokeTests();
  } catch (error) {
    printError(`Smoke test failed: ${error.message}`);
    process.exit(1);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
