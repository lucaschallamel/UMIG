#!/usr/bin/env node

/**
 * UMIG Session-Based Authentication Test Utility
 * Node.js cross-platform replacement for test-session-auth.sh
 *
 * Purpose: Test session-based authentication workflow for API access
 * Author: UMIG Development Team
 * Date: September 21, 2025
 *
 * ⚠️  CURRENT STATUS: NON-FUNCTIONAL ⚠️
 * This utility fails due to Confluence security policies preventing
 * programmatic login even with correct credentials and disabled 2FA.
 * Use browser-session-capture.js instead for working session extraction.
 * Kept for reference and potential future security policy changes.
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import chalk from "chalk";
import { execa } from "execa";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BASE_URL = "http://localhost:8090";
const API_BASE = `${BASE_URL}/rest/scriptrunner/latest/custom`;
const TEMP_DIR = join(tmpdir(), "umig_auth_test");
const SESSION_FILE = join(TEMP_DIR, "confluence_session.txt");

// Credentials from environment or defaults
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "123456";

class SessionAuthTester {
  constructor() {
    this.csrfToken = null;
    this.sessionCookies = new Map();
    this.setupTempDir();
  }

  setupTempDir() {
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    mkdirSync(TEMP_DIR, { recursive: true });
  }

  cleanup() {
    if (existsSync(TEMP_DIR)) {
      rmSync(TEMP_DIR, { recursive: true, force: true });
    }
    console.log(chalk.blue("[CLEANUP]"), "Temporary files cleaned up");
  }

  log(message) {
    const timestamp = new Date().toTimeString().split(" ")[0];
    console.log(chalk.blue(`[${timestamp}]`), message);
  }

  success(message) {
    console.log(chalk.green("✅"), message);
  }

  warning(message) {
    console.log(chalk.yellow("⚠️ "), message);
  }

  error(message) {
    console.log(chalk.red("❌"), message);
  }

  async makeRequest(url, options = {}) {
    try {
      // Using fetch for HTTP requests (available in Node.js 18+)
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          "User-Agent": "UMIG-Session-Auth-Tester/1.0",
          ...options.headers,
        },
        body: options.body,
        redirect: "manual", // Handle redirects manually
      });

      // Extract cookies from response
      const setCookieHeader = response.headers.get("set-cookie");
      if (setCookieHeader) {
        this.parseCookies(setCookieHeader);
      }

      const responseText = await response.text();

      return {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText,
      };
    } catch (error) {
      throw new Error(`Request failed: ${error.message}`);
    }
  }

  parseCookies(setCookieHeader) {
    const cookies = setCookieHeader.split(",");
    cookies.forEach((cookie) => {
      const parts = cookie.trim().split(";");
      const [name, value] = parts[0].split("=");
      if (name && value) {
        this.sessionCookies.set(name.trim(), value.trim());
      }
    });
  }

  getCookieHeader() {
    const cookies = Array.from(this.sessionCookies.entries())
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
    return cookies;
  }

  async checkConfluence() {
    this.log("Checking if Confluence is running...");

    try {
      const response = await this.makeRequest(BASE_URL);
      if (response.status === 200 || response.status === 302) {
        this.success(`Confluence is running on ${BASE_URL}`);
        return true;
      } else {
        this.error(`Confluence returned status ${response.status}`);
        return false;
      }
    } catch (error) {
      this.error(
        `Confluence is not accessible on ${BASE_URL}: ${error.message}`,
      );
      return false;
    }
  }

  async authenticate() {
    this.log("Starting authentication process...");

    try {
      // Step 1: Get login page and initial session
      this.log("Getting login page and initial session...");
      const loginResponse = await this.makeRequest(`${BASE_URL}/login.action`);

      if (loginResponse.status !== 200) {
        this.error("Failed to get login page");
        return false;
      }

      // Save login page for token extraction
      const loginPagePath = join(TEMP_DIR, "login_page.html");
      writeFileSync(loginPagePath, loginResponse.body);

      // Step 2: Extract CSRF token
      this.log("Extracting CSRF token...");
      const csrfMatch = loginResponse.body.match(
        /name="atlassian-token"[^>]*content="([^"]+)"/,
      );

      if (!csrfMatch) {
        this.error("Failed to extract CSRF token from login page");
        this.warning(
          "This might indicate that 2-step verification is still enabled",
        );
        return false;
      }

      this.csrfToken = csrfMatch[1];
      this.success(
        `CSRF Token extracted: ${this.csrfToken.substring(0, 8)}...`,
      );

      // Step 3: Authenticate with credentials
      this.log("Authenticating with admin credentials...");
      const authData = new URLSearchParams({
        os_username: ADMIN_USERNAME,
        os_password: ADMIN_PASSWORD,
        atl_token: this.csrfToken,
      });

      const authResponse = await this.makeRequest(
        `${BASE_URL}/dologin.action`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-Atlassian-Token": this.csrfToken,
            Cookie: this.getCookieHeader(),
          },
          body: authData.toString(),
        },
      );

      this.log(`Authentication response code: ${authResponse.status}`);

      // Save auth response for debugging
      const authResponsePath = join(TEMP_DIR, "auth_response.txt");
      writeFileSync(authResponsePath, authResponse.body);

      // Check if authentication was successful
      if (authResponse.status === 200 || authResponse.status === 302) {
        this.success("Authentication successful");

        // Check if response contains error message
        if (authResponse.body.includes("two-step verification")) {
          this.error("Two-step verification is still enabled");
          console.log(authResponse.body);
          return false;
        }

        return true;
      } else {
        this.error(`Authentication failed (HTTP ${authResponse.status})`);
        console.log(authResponse.body);
        return false;
      }
    } catch (error) {
      this.error(`Authentication process failed: ${error.message}`);
      return false;
    }
  }

  async verifySession() {
    this.log("Verifying session is active...");

    try {
      const response = await this.makeRequest(`${BASE_URL}/dashboard.action`, {
        headers: {
          Cookie: this.getCookieHeader(),
        },
      });

      if (response.status === 200) {
        this.success("Session is active and valid");
        return true;
      } else {
        this.warning(`Session verification returned HTTP ${response.status}`);
        return false;
      }
    } catch (error) {
      this.error(`Session verification failed: ${error.message}`);
      return false;
    }
  }

  async testApi(method, endpoint, data = null, description = "") {
    this.log(`Testing ${method} ${endpoint} - ${description}`);

    try {
      const url = `${API_BASE}/${endpoint}`;
      const options = {
        method: method,
        headers: {
          Cookie: this.getCookieHeader(),
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json",
        },
      };

      if (this.csrfToken) {
        options.headers["X-CSRF-Token"] = this.csrfToken;
      }

      if (method !== "GET" && data) {
        options.headers["Content-Type"] = "application/json";
        options.body = JSON.stringify(data);
      }

      const response = await this.makeRequest(url, options);

      console.log(`  Response: HTTP ${response.status}`);

      switch (response.status) {
        case 200:
        case 201:
          this.success("  API test successful");
          if (response.body) {
            console.log("  Response preview:");
            console.log(response.body.substring(0, 200) + "...");
          }
          break;
        case 401:
          this.error("  Authentication failed - session may have expired");
          break;
        case 403:
          this.error("  Access forbidden - check permissions");
          break;
        case 404:
          this.error("  API endpoint not found");
          break;
        default:
          this.warning(`  Unexpected response code: ${response.status}`);
          if (response.body) {
            console.log("  Response:");
            console.log(response.body);
          }
          break;
      }

      console.log("");
      return response.status;
    } catch (error) {
      this.error(`  API test failed: ${error.message}`);
      console.log("");
      return 0;
    }
  }

  async testDevEndpoints() {
    this.log("Testing development endpoints (no authentication required)...");

    try {
      const response = await this.makeRequest(`${API_BASE}/teams-test-auth`);

      console.log(`Development endpoint response: HTTP ${response.status}`);

      if (response.status === 200) {
        this.success("Development endpoint working");
        console.log("Response preview:");
        console.log(response.body.substring(0, 300) + "...");
      } else if (response.status === 404) {
        this.warning(
          "Development endpoint not found - ScriptRunner may need to reload APIs",
        );
      } else {
        this.warning(`Development endpoint returned HTTP ${response.status}`);
        if (response.body) {
          console.log(response.body);
        }
      }

      console.log("");
    } catch (error) {
      this.error(`Development endpoint test failed: ${error.message}`);
      console.log("");
    }
  }

  async run() {
    console.log(chalk.blue("🚀 UMIG Session-Based Authentication Test"));
    console.log("========================================");
    console.log("");

    // Set up cleanup on exit
    process.on("exit", () => this.cleanup());
    process.on("SIGINT", () => {
      this.cleanup();
      process.exit(0);
    });

    try {
      // Check if Confluence is running
      const confluenceRunning = await this.checkConfluence();
      if (!confluenceRunning) {
        process.exit(1);
      }

      console.log("");

      // Test development endpoints first (no auth required)
      await this.testDevEndpoints();

      // Authenticate
      const authenticated = await this.authenticate();
      if (authenticated) {
        console.log("");

        // Verify session
        await this.verifySession();
        console.log("");

        // Test various API endpoints
        this.log("Testing authenticated API endpoints...");
        console.log("");

        await this.testApi("GET", "teams", null, "List teams");
        await this.testApi("GET", "users", null, "List users");
        await this.testApi("GET", "environments", null, "List environments");
        await this.testApi("GET", "applications", null, "List applications");
        await this.testApi("GET", "labels", null, "List labels");

        console.log("");
        this.success(
          "Session-based authentication test completed successfully!",
        );

        console.log("");
        this.log("Session information available for manual testing:");
        console.log(`  Session cookies: ${this.getCookieHeader()}`);
        console.log(`  CSRF Token: ${this.csrfToken}`);
        console.log("");
        this.log("Use these for manual CURL commands:");
        console.log(
          `  curl -H "Cookie: ${this.getCookieHeader()}" -H "X-CSRF-Token: ${this.csrfToken}" -H "X-Requested-With: XMLHttpRequest" "${API_BASE}/teams"`,
        );
      } else {
        console.log("");
        this.error("Authentication failed - cannot test API endpoints");
        console.log("");
        this.log("Common causes:");
        console.log("  1. Two-step verification still enabled");
        console.log("  2. Incorrect credentials (admin:123456)");
        console.log("  3. Confluence not properly configured");
        console.log("");
        this.log("Check Confluence admin settings and restart if needed");
        process.exit(1);
      }
    } catch (error) {
      this.error(`Unexpected error: ${error.message}`);
      console.error(error.stack);
      process.exit(1);
    }
  }

  static showHelp() {
    console.log("UMIG Session-Based Authentication Test Utility");
    console.log("");
    console.log("Usage: node session-auth-test.js [options]");
    console.log("");
    console.log("Options:");
    console.log("  -h, --help     Show this help message");
    console.log("  -v, --verbose  Enable verbose output");
    console.log("");
    console.log("This utility tests the session-based authentication workflow");
    console.log("required for UMIG API access after security enhancements.");
    console.log("");
    console.log("Prerequisites:");
    console.log("  - Confluence running on http://localhost:8090");
    console.log("  - Two-step verification disabled");
    console.log("  - Admin credentials: admin:123456");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes("-h") || args.includes("--help")) {
  SessionAuthTester.showHelp();
  process.exit(0);
}

if (args.includes("-v") || args.includes("--verbose")) {
  // Enable verbose logging (could implement detailed request/response logging)
  console.log(chalk.blue("Verbose mode enabled"));
}

// Run the test if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new SessionAuthTester();
  tester.run().catch((error) => {
    console.error(chalk.red("Fatal error:"), error.message);
    process.exit(1);
  });
}

export default SessionAuthTester;
