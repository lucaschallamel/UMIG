#!/usr/bin/env node

/**
 * UMIG Browser Session Capture for API Testing
 * Node.js cross-platform replacement for browser-session-capture.sh
 *
 * This utility helps capture browser session for CURL/POSTMAN testing
 *
 * ✅ WORKING SOLUTION ✅
 * This is the recommended method for session-based API testing.
 * Programmatic authentication fails due to security policies.
 *
 * Author: UMIG Development Team
 * Date: September 21, 2025
 */

import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { createInterface } from "readline";
import chalk from "chalk";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const BASE_URL = "http://localhost:8090";
const API_BASE = `${BASE_URL}/rest/scriptrunner/latest/custom`;
const TEMP_DIR = join(tmpdir(), "umig_session_capture");
const SESSION_FILE = join(TEMP_DIR, "umig_session.txt");

class BrowserSessionCapture {
  constructor() {
    this.jsessionId = null;
    this.setupTempDir();

    // Create readline interface for user input
    this.rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  setupTempDir() {
    if (!existsSync(TEMP_DIR)) {
      mkdirSync(TEMP_DIR, { recursive: true });
    }
  }

  async promptUser(question) {
    return new Promise((resolve) => {
      this.rl.question(question, resolve);
    });
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

  log(message) {
    console.log(chalk.blue("🔍"), message);
  }

  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, {
        method: options.method || "GET",
        headers: {
          "User-Agent": "UMIG-Browser-Session-Capture/1.0",
          ...options.headers,
        },
        body: options.body,
      });

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

  showInstructions() {
    console.log(chalk.blue("🔐 UMIG Browser Session Capture Tool"));
    console.log("========================================");
    console.log("");

    console.log(chalk.yellow("📋 Instructions to capture browser session:"));
    console.log("");
    console.log(
      "1. Open your browser and navigate to:",
      chalk.cyan("http://localhost:8090"),
    );
    console.log("2. Log in with your admin credentials (admin:123456)");
    console.log("3. Once logged in, open Developer Tools (F12)");
    console.log(
      "4. Go to: Application > Storage > Cookies > http://localhost:8090",
    );
    console.log("   (In Firefox: Storage > Cookies > http://localhost:8090)");
    console.log("   (In Safari: Storage > Cookies > http://localhost:8090)");
    console.log("5. Find the 'JSESSIONID' cookie and copy its Value");
    console.log("");

    // Additional helpful instructions
    console.log(chalk.blue("💡 Browser-specific instructions:"));
    console.log("");
    console.log(chalk.cyan("Chrome/Edge:"));
    console.log("  • F12 → Application tab → Storage section → Cookies");
    console.log("");
    console.log(chalk.cyan("Firefox:"));
    console.log("  • F12 → Storage tab → Cookies");
    console.log("");
    console.log(chalk.cyan("Safari:"));
    console.log(
      "  • Develop menu → Show Web Inspector → Storage tab → Cookies",
    );
    console.log(
      "  (Enable Develop menu: Safari > Preferences > Advanced > Show Develop menu)",
    );
    console.log("");
  }

  async testSession(jsessionId) {
    this.log("Testing session with UMIG API...");

    try {
      const response = await this.makeRequest(`${API_BASE}/teams`, {
        headers: {
          Cookie: `JSESSIONID=${jsessionId}`,
          "X-Requested-With": "XMLHttpRequest",
          Accept: "application/json",
        },
      });

      console.log(`Response code: ${response.status}`);

      if (response.status === 200) {
        this.success("Success! Session is working");
        console.log("");
        console.log("Response preview:");
        console.log(response.body.substring(0, 300) + "...");
        console.log("");
        return true;
      } else if (response.status === 403) {
        this.error("Session invalid or expired");
        console.log(
          "The session might be expired or the cookie value is incorrect.",
        );
        console.log("Please try capturing a fresh session from your browser.");
        return false;
      } else if (response.status === 401) {
        this.error("Authentication required");
        console.log(
          "The session is not authenticated. Make sure you're logged in as admin.",
        );
        return false;
      } else {
        this.warning(`Unexpected response: ${response.status}`);
        console.log("Response:");
        console.log(response.body);
        return false;
      }
    } catch (error) {
      this.error(`Session test failed: ${error.message}`);
      return false;
    }
  }

  generateCurlTemplate(jsessionId) {
    console.log(chalk.blue("📝 CURL Template:"));
    console.log("");
    console.log(chalk.gray("# Basic GET request"));
    console.log(`curl -H "Cookie: JSESSIONID=${jsessionId}" \\`);
    console.log(`     -H "X-Requested-With: XMLHttpRequest" \\`);
    console.log(`     -H "Accept: application/json" \\`);
    console.log(`     "${API_BASE}/teams"`);
    console.log("");

    console.log(chalk.gray("# POST request example"));
    console.log(`curl -X POST \\`);
    console.log(`     -H "Cookie: JSESSIONID=${jsessionId}" \\`);
    console.log(`     -H "X-Requested-With: XMLHttpRequest" \\`);
    console.log(`     -H "Content-Type: application/json" \\`);
    console.log(`     -H "Accept: application/json" \\`);
    console.log(
      `     -d '{"name":"Test Team","description":"Created via API"}' \\`,
    );
    console.log(`     "${API_BASE}/teams"`);
    console.log("");
  }

  generatePostmanInstructions(jsessionId) {
    console.log(chalk.blue("📮 POSTMAN Setup:"));
    console.log("");
    console.log("1. In POSTMAN, create a new request");
    console.log("2. Set the URL to:", chalk.cyan(`${API_BASE}/teams`));
    console.log("3. Go to the Headers tab and add these headers:");
    console.log(`   • Cookie: ${chalk.yellow(`JSESSIONID=${jsessionId}`)}`);
    console.log(`   • X-Requested-With: ${chalk.yellow("XMLHttpRequest")}`);
    console.log(`   • Accept: ${chalk.yellow("application/json")}`);
    console.log("4. For POST/PUT requests, also add:");
    console.log(`   • Content-Type: ${chalk.yellow("application/json")}`);
    console.log("");

    console.log(chalk.blue("🔧 Environment Variable Setup (Recommended):"));
    console.log("");
    console.log("1. In POSTMAN, create a new Environment");
    console.log("2. Add these variables:");
    console.log(`   • api_base: ${chalk.yellow(API_BASE)}`);
    console.log(`   • jsessionid: ${chalk.yellow(jsessionId)}`);
    console.log("3. Use in requests as:");
    console.log(`   • URL: ${chalk.yellow("{{api_base}}/teams")}`);
    console.log(
      `   • Cookie Header: ${chalk.yellow("JSESSIONID={{jsessionid}}")}`,
    );
    console.log("");
  }

  generateJavaScriptFetch(jsessionId) {
    console.log(chalk.blue("💻 JavaScript Fetch Example:"));
    console.log("");
    console.log(chalk.gray("// GET request"));
    console.log(`const response = await fetch('${API_BASE}/teams', {`);
    console.log(`  method: 'GET',`);
    console.log(`  headers: {`);
    console.log(`    'Cookie': 'JSESSIONID=${jsessionId}',`);
    console.log(`    'X-Requested-With': 'XMLHttpRequest',`);
    console.log(`    'Accept': 'application/json'`);
    console.log(`  }`);
    console.log(`});`);
    console.log("");
    console.log(`const data = await response.json();`);
    console.log(`console.log(data);`);
    console.log("");
  }

  saveSession(jsessionId) {
    try {
      const sessionData = {
        jsessionId: jsessionId,
        timestamp: new Date().toISOString(),
        baseUrl: BASE_URL,
        apiBase: API_BASE,
        expiryNote: "Browser sessions typically last 30 minutes",
      };

      writeFileSync(SESSION_FILE, JSON.stringify(sessionData, null, 2));
      this.success(`Session saved to ${SESSION_FILE}`);

      // Also save simple format for shell scripts
      const simpleSessionFile = join(TEMP_DIR, "jsessionid.txt");
      writeFileSync(simpleSessionFile, jsessionId);
      console.log(
        chalk.blue("💾"),
        `Session ID also saved to ${simpleSessionFile}`,
      );
    } catch (error) {
      this.warning(`Could not save session file: ${error.message}`);
    }
  }

  showTips() {
    console.log(chalk.blue("💡 Tips:"));
    console.log("• Browser sessions typically last 30 minutes");
    console.log("• You may need to refresh the session periodically");
    console.log("• Keep the browser tab open to maintain the session");
    console.log(
      "• If session expires, just run this tool again with a new JSESSIONID",
    );
    console.log(
      "• For automated testing, consider using environment variables",
    );
    console.log("");

    console.log(chalk.blue("🔄 Session Renewal:"));
    console.log("If your session expires during testing:");
    console.log("1. Refresh the Confluence page in your browser");
    console.log("2. Extract the new JSESSIONID cookie");
    console.log("3. Run this tool again with the new session ID");
    console.log("");
  }

  async run() {
    this.showInstructions();

    try {
      const jsessionId = await this.promptUser(
        "Enter your JSESSIONID cookie value: ",
      );

      if (!jsessionId || jsessionId.trim() === "") {
        this.error("No session ID provided");
        this.rl.close();
        process.exit(1);
      }

      const cleanSessionId = jsessionId.trim();
      this.jsessionId = cleanSessionId;

      console.log("");

      // Test the session
      const sessionValid = await this.testSession(cleanSessionId);

      if (sessionValid) {
        // Generate helpful examples and templates
        this.generateCurlTemplate(cleanSessionId);
        this.generatePostmanInstructions(cleanSessionId);
        this.generateJavaScriptFetch(cleanSessionId);

        // Save session for reuse
        this.saveSession(cleanSessionId);

        console.log("");
        this.showTips();
      } else {
        console.log("");
        this.error("Session validation failed");
        console.log("Please check that:");
        console.log("• You are logged into Confluence in your browser");
        console.log("• The JSESSIONID value was copied correctly");
        console.log("• The session has not expired");
        console.log("• Confluence is running on http://localhost:8090");
      }
    } catch (error) {
      this.error(`Unexpected error: ${error.message}`);
      console.error(error.stack);
    } finally {
      this.rl.close();
    }
  }

  static showHelp() {
    console.log("UMIG Browser Session Capture Utility");
    console.log("");
    console.log("Usage: node browser-session-capture.js [options]");
    console.log("");
    console.log("Options:");
    console.log("  -h, --help     Show this help message");
    console.log("");
    console.log("This utility helps you extract and validate browser sessions");
    console.log("for use with CURL, POSTMAN, or other HTTP clients.");
    console.log("");
    console.log("Interactive utility - will prompt for JSESSIONID input");
    console.log("");
    console.log("Prerequisites:");
    console.log("  - Confluence running on http://localhost:8090");
    console.log("  - Browser logged in as admin");
    console.log("  - Developer tools open to extract cookies");
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.includes("-h") || args.includes("--help")) {
  BrowserSessionCapture.showHelp();
  process.exit(0);
}

// Run the utility if script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const capture = new BrowserSessionCapture();
  capture.run().catch((error) => {
    console.error(chalk.red("Fatal error:"), error.message);
    process.exit(1);
  });
}

export default BrowserSessionCapture;
