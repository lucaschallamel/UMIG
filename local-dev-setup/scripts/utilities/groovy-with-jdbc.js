#!/usr/bin/env node

/**
 * Groovy Integration Test Wrapper (Node.js)
 * Automatically includes PostgreSQL JDBC driver in classpath
 * Cross-platform replacement for groovy-with-jdbc shell script
 */

import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GroovyWithJdbcRunner {
  constructor() {
    this.scriptDir = path.join(__dirname, "../../jdbc-drivers");
    this.postgresqlJar = path.join(this.scriptDir, "postgresql-42.7.3.jar");
  }

  /**
   * Check if PostgreSQL JDBC driver exists
   */
  checkJdbcDriver() {
    if (!fs.existsSync(this.postgresqlJar)) {
      console.error(
        `❌ PostgreSQL JDBC driver not found: ${this.postgresqlJar}`,
      );
      console.error("Run: npm run setup:groovy-jdbc");
      process.exit(1);
    }
  }

  /**
   * Execute Groovy with JDBC classpath
   */
  async executeGroovy(args) {
    this.checkJdbcDriver();

    console.log(`🔗 Using PostgreSQL JDBC driver: ${this.postgresqlJar}`);
    console.log(
      `🚀 Executing: groovy -cp "${this.postgresqlJar}" ${args.join(" ")}`,
    );

    return new Promise((resolve, reject) => {
      // Build the command arguments
      const groovyArgs = ["-cp", this.postgresqlJar, ...args];

      // Spawn the Groovy process
      const child = spawn("groovy", groovyArgs, {
        stdio: "inherit",
        cwd: process.cwd(),
        env: process.env,
      });

      child.on("close", (code) => {
        if (code === 0) {
          resolve(code);
        } else {
          reject(new Error(`Groovy process exited with code: ${code}`));
        }
      });

      child.on("error", (error) => {
        if (error.code === "ENOENT") {
          console.error(
            "❌ Groovy not found. Please ensure Groovy is installed and in PATH",
          );
          console.error(
            "   Installation: https://groovy-lang.org/install.html",
          );
        } else {
          console.error(`❌ Failed to execute Groovy: ${error.message}`);
        }
        reject(error);
      });

      // Handle process termination gracefully
      process.on("SIGINT", () => {
        console.log("\n🛑 Received SIGINT, terminating Groovy process...");
        child.kill("SIGINT");
      });

      process.on("SIGTERM", () => {
        console.log("\n🛑 Received SIGTERM, terminating Groovy process...");
        child.kill("SIGTERM");
      });
    });
  }

  /**
   * Main execution method
   */
  async run() {
    try {
      const args = process.argv.slice(2);

      if (args.length === 0) {
        console.error(
          "Usage: node groovy-with-jdbc.js <groovy-file> [args...]",
        );
        console.error("Example: node groovy-with-jdbc.js mytest.groovy");
        process.exit(1);
      }

      await this.executeGroovy(args);
    } catch (error) {
      console.error(`❌ Execution failed: ${error.message}`);
      process.exit(1);
    }
  }
}

// Command line execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const runner = new GroovyWithJdbcRunner();
  runner.run();
}

export default GroovyWithJdbcRunner;
