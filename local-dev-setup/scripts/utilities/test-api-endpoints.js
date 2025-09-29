#!/usr/bin/env node

/**
 * API Endpoint Testing Utility
 * JavaScript replacement for shell-based API testing scripts
 *
 * Features:
 * - Authentication via .env credentials
 * - Comprehensive endpoint testing with enhanced output
 * - JSON response parsing and validation
 * - Error categorization and debugging guidance
 * - Support for parameterized testing
 *
 * Usage:
 *   node test-api-endpoints.js --endpoint=databaseVersions
 *   node test-api-endpoints.js --endpoint=all --verbose
 *   npm run api:test:database-versions
 *
 * @author UMIG Development Team
 * @version 1.0
 */

// Using Node.js 18+ built-in fetch API
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BASE_URL = "http://localhost:8090";
const API_BASE = "/rest/scriptrunner/latest/custom";

// Load environment variables
let credentials = { username: "admin", password: "admin" };
try {
  const envPath = path.resolve(__dirname, "../../.env");
  const envContent = readFileSync(envPath, "utf8");
  const envVars = {};
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      envVars[key.trim()] = value.trim();
    }
  });

  if (envVars.CONFLUENCE_USERNAME && envVars.CONFLUENCE_PASSWORD) {
    credentials = {
      username: envVars.CONFLUENCE_USERNAME,
      password: envVars.CONFLUENCE_PASSWORD,
    };
  } else if (
    envVars.CONFLUENCE_ADMIN_USER &&
    envVars.CONFLUENCE_ADMIN_PASSWORD
  ) {
    credentials = {
      username: envVars.CONFLUENCE_ADMIN_USER,
      password: envVars.CONFLUENCE_ADMIN_PASSWORD,
    };
  }
} catch (error) {
  console.log("⚠️  Warning: .env file not found, using default credentials");
}

/**
 * Test a single API endpoint
 */
async function testEndpoint(endpoint, description, params = null) {
  const url = `${BASE_URL}${endpoint}${params ? "?" + new URLSearchParams(params) : ""}`;
  const auth = Buffer.from(
    `${credentials.username}:${credentials.password}`,
  ).toString("base64");

  console.log(`📡 Testing: ${description}`);
  console.log(`   URL: ${url}`);

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Basic ${auth}`,
        Accept: "application/json",
        "User-Agent": "UMIG-API-Tester/1.0",
      },
      timeout: 30000,
    });

    const status = response.status;
    const responseText = await response.text();

    // Status code handling
    switch (status) {
      case 200:
        console.log(`   ✅ Status: ${status} OK`);

        // Try to parse as JSON
        try {
          const jsonData = JSON.parse(responseText);
          if (Array.isArray(jsonData)) {
            console.log(`   📊 Response: Array with ${jsonData.length} items`);
            if (jsonData.length > 0 && typeof jsonData[0] === "object") {
              const keys = Object.keys(jsonData[0]);
              console.log(
                `   📋 Sample keys: ${keys.slice(0, 5).join(", ")}${keys.length > 5 ? "..." : ""}`,
              );
            }
          } else if (typeof jsonData === "object" && jsonData !== null) {
            const keys = Object.keys(jsonData);
            console.log(
              `   📋 Response keys: ${keys.slice(0, 5).join(", ")}${keys.length > 5 ? "..." : ""}`,
            );
          } else {
            console.log(`   📝 Response type: ${typeof jsonData}`);
          }
        } catch (jsonError) {
          console.log(
            `   📝 Response length: ${responseText.length} characters (non-JSON)`,
          );
          if (responseText.length <= 200) {
            console.log(
              `   📝 Content preview: ${responseText.substring(0, 100)}...`,
            );
          }
        }
        break;

      case 404:
        console.log(
          `   ❌ Status: ${status} NOT FOUND - Endpoint not registered`,
        );
        console.log(`   💡 Check: ScriptRunner REST Endpoints configuration`);
        break;

      case 401:
        console.log(`   🔐 Status: ${status} UNAUTHORIZED - Check credentials`);
        console.log(`   💡 Verify: Username/password in .env file`);
        break;

      case 403:
        console.log(
          `   🚫 Status: ${status} FORBIDDEN - Check user permissions`,
        );
        console.log(`   💡 Verify: User has 'confluence-users' group access`);
        break;

      case 500:
        console.log(
          `   ⚠️  Status: ${status} SERVER ERROR - Check backend logs`,
        );
        try {
          const errorData = JSON.parse(responseText);
          console.log(
            `   📝 Error: ${errorData.message || errorData.error || "Unknown server error"}`,
          );
        } catch {
          console.log(
            `   📝 Error details: ${responseText.substring(0, 200)}...`,
          );
        }
        console.log(`   💡 Check: Confluence logs for stack traces`);
        break;

      default:
        console.log(`   ❓ Status: ${status} - Unexpected response`);
        console.log(`   📝 Response: ${responseText.substring(0, 100)}...`);
    }

    return { endpoint, status, success: status === 200 };
  } catch (error) {
    console.log(`   💥 Request failed: ${error.message}`);
    console.log(`   💡 Check: Network connectivity and service availability`);
    return { endpoint, status: 0, success: false, error: error.message };
  }

  console.log("");
}

/**
 * Test Database Version Manager endpoints
 */
async function testDatabaseVersionsEndpoints() {
  console.log("🔍 DATABASEVERSIONMANAGER API ENDPOINT VERIFICATION");
  console.log("==================================================");
  console.log("");

  const results = [];

  // Test main endpoints
  results.push(
    await testEndpoint(
      `${API_BASE}/databaseVersions`,
      "Main databaseVersions endpoint",
    ),
  );

  results.push(
    await testEndpoint(
      `${API_BASE}/databaseVersions/statistics`,
      "Migration statistics",
    ),
  );

  results.push(
    await testEndpoint(
      `${API_BASE}/databaseVersions/health`,
      "Health check endpoint",
    ),
  );

  // Test package generation endpoints (US-088-B fixes)
  results.push(
    await testEndpoint(
      `${API_BASE}/databaseVersionsPackageSQL`,
      "SQL Package Generation (CORRECTED)",
    ),
  );

  results.push(
    await testEndpoint(
      `${API_BASE}/databaseVersionsPackageLiquibase`,
      "Liquibase Package Generation (CORRECTED)",
    ),
  );

  // Test with parameters
  console.log("🧪 Testing with parameters...");
  console.log("--------------------------");
  console.log("");

  results.push(
    await testEndpoint(
      `${API_BASE}/databaseVersionsPackageSQL`,
      "SQL package with parameters",
      { selection: "all", format: "postgresql" },
    ),
  );

  results.push(
    await testEndpoint(
      `${API_BASE}/databaseVersionsPackageLiquibase`,
      "Liquibase package with parameters",
      { selection: "all" },
    ),
  );

  // Test deprecated endpoints (should return 404)
  console.log("🔍 Testing deprecated URLs (should return 404):");
  console.log("");

  results.push(
    await testEndpoint(
      `${API_BASE}/databaseVersions/packages/sql`,
      "Old SQL URL (should be 404)",
    ),
  );

  results.push(
    await testEndpoint(
      `${API_BASE}/databaseVersions/packages/liquibase`,
      "Old Liquibase URL (should be 404)",
    ),
  );

  return results;
}

/**
 * Test all common API endpoints
 */
async function testAllEndpoints() {
  console.log("🧪 COMPREHENSIVE API ENDPOINT TESTING");
  console.log("====================================");
  console.log("");

  const commonEndpoints = [
    { path: "/teams", name: "Teams API" },
    { path: "/users", name: "Users API" },
    { path: "/environments", name: "Environments API" },
    { path: "/applications", name: "Applications API" },
    { path: "/migrations", name: "Migrations API" },
    { path: "/labels", name: "Labels API" },
    { path: "/systemConfiguration", name: "System Configuration API" },
  ];

  const results = [];

  for (const endpoint of commonEndpoints) {
    results.push(
      await testEndpoint(`${API_BASE}${endpoint.path}`, endpoint.name),
    );
  }

  // Also test database versions
  const dbResults = await testDatabaseVersionsEndpoints();
  results.push(...dbResults);

  return results;
}

/**
 * Generate test summary
 */
function generateSummary(results) {
  console.log("📋 TEST SUMMARY");
  console.log("===============");

  const successful = results.filter((r) => r.success).length;
  const total = results.length;

  console.log(`✅ Successful: ${successful}/${total}`);
  console.log(`❌ Failed: ${total - successful}/${total}`);
  console.log("");

  const failedTests = results.filter((r) => !r.success);
  if (failedTests.length > 0) {
    console.log("❌ Failed endpoints:");
    failedTests.forEach((test) => {
      console.log(`   • ${test.endpoint} (Status: ${test.status})`);
    });
    console.log("");
  }

  console.log("💡 TROUBLESHOOTING GUIDE:");
  console.log("• 404 errors → Check ScriptRunner REST Endpoints registration");
  console.log("• 401/403 errors → Verify credentials and user permissions");
  console.log("• 500 errors → Check Confluence application logs");
  console.log(
    "• Network errors → Verify services are running (npm run health:check)",
  );
  console.log("");

  return successful === total;
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const endpoint = args
    .find((arg) => arg.startsWith("--endpoint="))
    ?.split("=")[1];
  const verbose = args.includes("--verbose");

  let results = [];

  if (endpoint === "databaseVersions" || endpoint === "database-versions") {
    results = await testDatabaseVersionsEndpoints();
  } else if (endpoint === "all" || !endpoint) {
    results = await testAllEndpoints();
  } else {
    // Test single specific endpoint
    results = [
      await testEndpoint(
        `${API_BASE}/${endpoint}`,
        `Custom endpoint: ${endpoint}`,
      ),
    ];
  }

  const allPassed = generateSummary(results);
  process.exit(allPassed ? 0 : 1);
}

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  console.error("💥 Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  });
}

export { testEndpoint, testDatabaseVersionsEndpoints, testAllEndpoints };
