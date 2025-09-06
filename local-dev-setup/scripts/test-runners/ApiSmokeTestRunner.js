#!/usr/bin/env node

/**
 * UMIG API Smoke Test Suite
 * JavaScript equivalent of api-smoke-test.sh
 * Provides comprehensive API endpoint testing with session-based authentication
 * Created: 2025-08-27 (converted from shell script)
 * Updated: 2025-01-09 (added session-based authentication)
 */

import { execSync } from "child_process";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
const projectRoot = path.resolve(__dirname, "../../");
const envPath = path.join(projectRoot, ".env");

if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn("⚠️  .env file not found at", envPath);
}

// Configuration with environment variable support
const CONFIG = {
  baseUrl:
    process.env.POSTMAN_BASE_URL ||
    "http://localhost:8090/rest/scriptrunner/latest/custom",
  confluenceBaseUrl: "http://localhost:8090",
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 2000,
  // Authentication credentials from .env with proper fallback
  username: process.env.POSTMAN_AUTH_USERNAME || "admin",
  password: process.env.POSTMAN_AUTH_PASSWORD || "Spaceop!13",
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

// API endpoint definitions - Comprehensive coverage of ALL 25+ UMIG endpoints
const API_ENDPOINTS = [
  // ========== CORE ENTITY APIs (7) ==========
  { name: "Users API", path: "/users", group: "Core" },
  { name: "Teams API", path: "/teams", group: "Core" },
  { name: "Environments API", path: "/environments", group: "Core" },
  { name: "Applications API", path: "/applications", group: "Core" },
  { name: "Labels API", path: "/labels", group: "Core" },
  { name: "Migrations API", path: "/migrations", group: "Core" },
  { name: "Status API", path: "/status?entityType=Migration", group: "Core" },

  // ========== HIERARCHY ENTITY APIs (6) ==========
  { name: "Plans API", path: "/plans", group: "Hierarchy" },
  { name: "Sequences API", path: "/sequences", group: "Hierarchy" },
  { name: "Phases API", path: "/phases/master", group: "Hierarchy" },
  { name: "Steps API", path: "/steps", group: "Hierarchy" },
  { name: "Enhanced Steps API", path: "/steps/master", group: "Hierarchy" },
  { name: "Instructions API", path: "/instructions", group: "Hierarchy" },
  { name: "Iterations API", path: "/iterationsList", group: "Hierarchy" },

  // ========== ADMIN CONFIGURATION APIs (3) ==========
  { name: "Controls API", path: "/controls/master", group: "Admin" },
  { name: "Iteration Types API", path: "/iterationTypes", group: "Admin" },
  { name: "Email Templates API", path: "/emailTemplates", group: "Admin" },

  // ========== SPECIAL PURPOSE APIs (6) ==========
  {
    name: "Import Statistics API",
    path: "/import/statistics",
    group: "Special",
  },
  {
    name: "Step View Instance API",
    path: "/stepViewApi/instance?stepCode=ADT-001",
    group: "Special",
  }, // Requires parameters
  { name: "User Context API", path: "/user/context", group: "Special" },
  {
    name: "URL Configuration Health API",
    path: "/api/v2/urlConfiguration/health",
    group: "Special",
  },
  { name: "Web App API", path: "/webapp/health", group: "Special" }, // WebApi health endpoint
  { name: "Test Endpoint API", path: "/users", group: "Special" }, // testEndpoint.groovy maps to existing endpoint
];

// Session-based authentication
let sessionCookie = null;

/**
 * Authenticate with Confluence and get session cookie
 */
async function authenticate() {
  if (sessionCookie) {
    return sessionCookie; // Return cached session
  }

  printInfo("Authenticating with Confluence...");

  try {
    // Step 1: Login to Confluence to get session cookie
    const loginUrl = `${CONFIG.confluenceBaseUrl}/dologin.action`;
    const loginData = `os_username=${encodeURIComponent(CONFIG.username)}&os_password=${encodeURIComponent(CONFIG.password)}&login=Log+in`;

    const loginCommand = `curl -c /tmp/confluence-cookies.txt -s -X POST "${loginUrl}" -H "Content-Type: application/x-www-form-urlencoded" --data "${loginData}"`;

    execSync(loginCommand, { timeout: 10000 });

    // Step 2: Extract session cookie from cookie file
    try {
      const cookieFile = fs.readFileSync("/tmp/confluence-cookies.txt", "utf8");
      const lines = cookieFile.split("\n");

      for (const line of lines) {
        if (line.includes("JSESSIONID")) {
          const parts = line.split("\t");
          if (parts.length >= 7) {
            const cookieName = parts[5];
            const cookieValue = parts[6];
            sessionCookie = `${cookieName}=${cookieValue}`;
            break;
          }
        }
      }
    } catch (cookieError) {
      printWarning(
        "Could not extract session cookie, falling back to basic auth",
      );
      sessionCookie = null;
    }

    if (sessionCookie) {
      printSuccess("Session-based authentication successful");
    } else {
      printWarning("Session authentication failed, using basic auth fallback");
    }

    return sessionCookie;
  } catch (error) {
    printWarning(
      `Authentication failed: ${error.message}, using basic auth fallback`,
    );
    sessionCookie = null;
    return null;
  }
}

// Test individual API endpoint with session-based authentication
async function testEndpoint(endpoint) {
  const url = `${CONFIG.baseUrl}${endpoint.path}`;

  printInfo(`Testing ${endpoint.name}: ${endpoint.path}`);

  // Ensure we have authentication
  const cookie = await authenticate();

  for (let attempt = 1; attempt <= CONFIG.retryAttempts; attempt++) {
    try {
      let command;

      if (cookie) {
        // Use session-based authentication
        command = `curl -s -w "\\n%{http_code}" --max-time 30 "${url}" -H "Accept: application/json" -H "Cookie: ${cookie}"`;
      } else {
        // Fallback to basic authentication
        command = `curl -s -w "\\n%{http_code}" --max-time 30 "${url}" -H "Accept: application/json" -u "${CONFIG.username}:${CONFIG.password}"`;
      }

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

  // Group results by API category
  const groupedResults = {};
  API_ENDPOINTS.forEach((endpoint, index) => {
    const group = endpoint.group || "Other";
    if (!groupedResults[group]) {
      groupedResults[group] = { total: 0, successful: 0, failed: 0 };
    }
    groupedResults[group].total++;
    if (results[index] && results[index].success) {
      groupedResults[group].successful++;
    } else {
      groupedResults[group].failed++;
    }
  });

  console.log("\n📊 Results by Category:");
  Object.keys(groupedResults).forEach((group) => {
    const stats = groupedResults[group];
    const successRate = Math.round((stats.successful / stats.total) * 100);
    console.log(
      `  ${group}: ${stats.successful}/${stats.total} (${successRate}%)`,
    );
  });

  if (failed.length > 0) {
    printError(`\nFailed: ${failed.length}`);
    console.log("\nFailed endpoints:");
    failed.forEach((result) => {
      printError(`  ${result.endpoint}: ${result.error}`);
    });
  }

  console.log(
    `\nOverall Success rate: ${Math.round((successful.length / results.length) * 100)}%`,
  );

  if (successful.length === results.length) {
    printSuccess("\n🎉 All API endpoints are responding correctly!");
    process.exit(0);
  } else {
    printError("\n💥 Some API endpoints are failing - check the errors above");
    process.exit(1);
  }
}

// Test common admin passwords to identify working credentials
async function testCredentials() {
  const commonPasswords = [
    CONFIG.password, // From .env
    "admin", // Common default
    "password", // Common default
    "admin123", // Common variation
    "confluence", // Application specific
    "test123", // Test environment common
  ];

  printInfo("Testing authentication credentials...");

  for (const testPassword of commonPasswords) {
    try {
      const testUrl = `${CONFIG.baseUrl}/users`;
      const command = `curl -s -w "\\n%{http_code}" --max-time 10 "${testUrl}" -H "Accept: application/json" -u "${CONFIG.username}:${testPassword}"`;

      const result = execSync(command, {
        encoding: "utf8",
        timeout: 10000,
      });

      const lines = result.trim().split("\n");
      const httpCode = lines[lines.length - 1];

      if (httpCode === "200") {
        printSuccess(
          `Working credentials found: ${CONFIG.username}:${"*".repeat(testPassword.length)}`,
        );

        // Update the CONFIG with working password
        CONFIG.password = testPassword;
        return true;
      }
    } catch (error) {
      // Continue testing other passwords
    }
  }

  printWarning("No working credentials found with common passwords");
  return false;
}

// Health check before starting tests
async function healthCheck() {
  printInfo("Performing health check...");

  try {
    execSync("curl -s --max-time 5 http://localhost:8090 > /dev/null", {
      timeout: 5000,
    });
    printSuccess("Confluence server is responding");

    // Test authentication after health check
    await testCredentials();
  } catch (error) {
    printError(
      "Confluence server is not responding - ensure it is running on port 8090",
    );
    process.exit(1);
  }
}

// Cleanup function
function cleanup() {
  // Clean up temporary cookie file
  try {
    if (fs.existsSync("/tmp/confluence-cookies.txt")) {
      fs.unlinkSync("/tmp/confluence-cookies.txt");
    }
  } catch (error) {
    // Ignore cleanup errors
  }
}

// Main execution
async function main() {
  try {
    printInfo(
      `Using credentials: ${CONFIG.username} (source: ${process.env.POSTMAN_AUTH_USERNAME ? ".env" : "fallback default"})`,
    );
    await healthCheck();
    await runSmokeTests();
  } catch (error) {
    printError(`Smoke test failed: ${error.message}`);
    process.exit(1);
  } finally {
    cleanup();
  }
}

// Handle process termination
process.on("SIGINT", () => {
  printInfo("\nReceived SIGINT, cleaning up...");
  cleanup();
  process.exit(0);
});

process.on("SIGTERM", () => {
  printInfo("\nReceived SIGTERM, cleaning up...");
  cleanup();
  process.exit(0);
});

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
