#!/usr/bin/env node

/**
 * UMIG Health Check Runner
 * JavaScript equivalent of immediate-health-check.sh
 * Quick system health validation
 * Created: 2025-08-27 (converted from shell script)
 */

import { execSync } from "child_process";

// Configuration
const CONFIG = {
  confluenceUrl: "http://localhost:8090",
  postgresPort: 5432,
  mailhogWebUrl: "http://localhost:8025",
  timeout: 10000,
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
  console.log("\n" + "=".repeat(50));
  console.log(`  ${message}`);
  console.log("=".repeat(50));
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

// Test individual service
async function testService(name, testFunction) {
  try {
    printInfo(`Testing ${name}...`);
    const result = await testFunction();
    if (result.success) {
      printSuccess(`${name}: ${result.message}`);
      return true;
    } else {
      printWarning(`${name}: ${result.message}`);
      return false;
    }
  } catch (error) {
    printError(`${name}: ${error.message}`);
    return false;
  }
}

// Health check functions
const healthChecks = {
  confluence: async () => {
    try {
      execSync(`curl -s --max-time 5 ${CONFIG.confluenceUrl} > /dev/null`, {
        timeout: 5000,
      });
      return { success: true, message: "Responding on port 8090" };
    } catch (error) {
      return {
        success: false,
        message: "Not responding - check if started with npm start",
      };
    }
  },

  database: async () => {
    try {
      // Try to connect to PostgreSQL
      execSync("npm run db:ping", { stdio: "pipe", timeout: CONFIG.timeout });
      return { success: true, message: "PostgreSQL connection successful" };
    } catch (error) {
      return {
        success: false,
        message: "PostgreSQL connection failed - check container status",
      };
    }
  },

  mailhog: async () => {
    try {
      execSync(`curl -s --max-time 3 ${CONFIG.mailhogWebUrl} > /dev/null`, {
        timeout: 3000,
      });
      return {
        success: true,
        message: "MailHog web UI responding on port 8025",
      };
    } catch (error) {
      return {
        success: false,
        message: "MailHog not responding - check if started with npm start",
      };
    }
  },

  nodeModules: async () => {
    try {
      const fs = await import("fs");
      if (fs.existsSync("node_modules") && fs.existsSync("package.json")) {
        return { success: true, message: "Node.js dependencies installed" };
      } else {
        return {
          success: false,
          message: "Node.js dependencies missing - run npm install",
        };
      }
    } catch (error) {
      return {
        success: false,
        message: "Could not verify Node.js dependencies",
      };
    }
  },

  apiEndpoints: async () => {
    try {
      const testEndpoint = `${CONFIG.confluenceUrl}/rest/scriptrunner/latest/custom/api/v2/users`;
      const result = execSync(
        `curl -s -w "%{http_code}" --max-time 5 "${testEndpoint}"`,
        {
          encoding: "utf8",
          timeout: 5000,
        },
      );

      const httpCode = result.trim().split("\n").pop();
      if (httpCode === "200" || httpCode === "401") {
        return { success: true, message: "API endpoints are accessible" };
      } else {
        return {
          success: false,
          message: `API endpoints returning HTTP ${httpCode}`,
        };
      }
    } catch (error) {
      return { success: false, message: "API endpoints not accessible" };
    }
  },
};

// System resource checks
async function checkSystemResources() {
  printInfo("Checking system resources...");

  try {
    // Check available disk space (works on Unix-like systems)
    const df = execSync("df -h .", { encoding: "utf8" });
    const lines = df.trim().split("\n");
    if (lines.length > 1) {
      const diskInfo = lines[1].split(/\s+/);
      const used = diskInfo[4] || "unknown";
      printSuccess(`Disk space: ${used} used`);
    }
  } catch (error) {
    printWarning("Could not check disk space");
  }

  try {
    // Check memory (works on Unix-like systems)
    const free = execSync("free -h 2>/dev/null || vm_stat", {
      encoding: "utf8",
    });
    printSuccess("Memory information available");
  } catch (error) {
    printWarning("Could not check memory information");
  }
}

// Main health check execution
async function runHealthCheck() {
  printHeader("UMIG SYSTEM HEALTH CHECK");

  console.log("Quick validation of development environment");
  console.log(`Timestamp: ${new Date().toISOString()}`);
  console.log("");

  const results = {};

  // Run all health checks
  for (const [serviceName, checkFunction] of Object.entries(healthChecks)) {
    results[serviceName] = await testService(serviceName, checkFunction);
  }

  // System resource check
  console.log("");
  await checkSystemResources();

  // Summary
  printHeader("HEALTH CHECK SUMMARY");

  const successful = Object.values(results).filter((r) => r === true).length;
  const total = Object.keys(results).length;

  console.log(`Services checked: ${total}`);
  console.log(`Services healthy: ${successful}`);
  console.log(`Health score: ${Math.round((successful / total) * 100)}%`);

  if (successful === total) {
    printSuccess("\n🎉 All systems are healthy and ready!");
    console.log("\nNext steps:");
    console.log("- Run comprehensive tests: npm run test:all");
    console.log("- Start development: Your environment is ready");
    process.exit(0);
  } else {
    const failed = total - successful;
    printError(`\n⚠️  ${failed} service(s) need attention`);
    console.log("\nRecommended actions:");
    console.log("- Check service status and logs");
    console.log("- Restart services with: npm restart");
    console.log("- Verify container health: podman ps");
    process.exit(1);
  }
}

// Main execution
async function main() {
  try {
    await runHealthCheck();
  } catch (error) {
    printError(`Health check failed: ${error.message}`);
    process.exit(1);
  }
}

// Execute if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
