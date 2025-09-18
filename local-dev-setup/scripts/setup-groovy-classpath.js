#!/usr/bin/env node

/**
 * Groovy Integration Test JDBC Classpath Setup (Node.js)
 * Cross-platform replacement for setup-classpath.sh
 *
 * This script provides utilities for setting up GROOVY_CLASSPATH and CLASSPATH
 * environment variables with PostgreSQL JDBC driver for Groovy integration tests.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class GroovyClasspathSetup {
  constructor() {
    this.jdbcDir = path.join(__dirname, "../jdbc-drivers");
    this.postgresqlJar = path.join(this.jdbcDir, "postgresql-42.7.3.jar");
  }

  /**
   * Check if PostgreSQL JDBC driver exists
   */
  checkJdbcDriver() {
    return fs.existsSync(this.postgresqlJar);
  }

  /**
   * Get the PostgreSQL JDBC JAR path
   */
  getPostgresqlJarPath() {
    if (!this.checkJdbcDriver()) {
      throw new Error(
        `PostgreSQL JDBC driver not found: ${this.postgresqlJar}`,
      );
    }
    return this.postgresqlJar;
  }

  /**
   * Setup environment variables for current process
   * This modifies the current Node.js process environment
   */
  setupCurrentProcessEnv() {
    if (!this.checkJdbcDriver()) {
      console.error(
        `❌ PostgreSQL JDBC driver not found: ${this.postgresqlJar}`,
      );
      console.error("Run: npm run setup:groovy-jdbc");
      return false;
    }

    // Add to GROOVY_CLASSPATH
    const currentGroovyClasspath = process.env.GROOVY_CLASSPATH || "";
    const newGroovyClasspath = currentGroovyClasspath
      ? `${this.postgresqlJar}:${currentGroovyClasspath}`
      : this.postgresqlJar;
    process.env.GROOVY_CLASSPATH = newGroovyClasspath;

    // Add to CLASSPATH
    const currentClasspath = process.env.CLASSPATH || "";
    const newClasspath = currentClasspath
      ? `${this.postgresqlJar}:${currentClasspath}`
      : this.postgresqlJar;
    process.env.CLASSPATH = newClasspath;

    console.log("🔗 PostgreSQL JDBC driver added to classpath");
    console.log(`Driver: ${this.postgresqlJar}`);
    console.log(`GROOVY_CLASSPATH: ${process.env.GROOVY_CLASSPATH}`);
    console.log(`CLASSPATH: ${process.env.CLASSPATH}`);

    return true;
  }

  /**
   * Get environment object with JDBC classpath configured
   * Returns an object that can be used with child_process spawn/exec
   */
  getEnvWithJdbcClasspath() {
    if (!this.checkJdbcDriver()) {
      throw new Error(
        `PostgreSQL JDBC driver not found: ${this.postgresqlJar}`,
      );
    }

    const env = { ...process.env };

    // Add to GROOVY_CLASSPATH
    const currentGroovyClasspath = env.GROOVY_CLASSPATH || "";
    env.GROOVY_CLASSPATH = currentGroovyClasspath
      ? `${this.postgresqlJar}:${currentGroovyClasspath}`
      : this.postgresqlJar;

    // Add to CLASSPATH
    const currentClasspath = env.CLASSPATH || "";
    env.CLASSPATH = currentClasspath
      ? `${this.postgresqlJar}:${currentClasspath}`
      : this.postgresqlJar;

    return env;
  }

  /**
   * Generate shell export statements for external use
   * Cross-platform: generates appropriate syntax for Windows/Unix
   */
  generateShellExports() {
    if (!this.checkJdbcDriver()) {
      throw new Error(
        `PostgreSQL JDBC driver not found: ${this.postgresqlJar}`,
      );
    }

    const isWindows = process.platform === "win32";

    if (isWindows) {
      // Windows CMD/PowerShell syntax
      return [
        `set "GROOVY_CLASSPATH=${this.postgresqlJar};%GROOVY_CLASSPATH%"`,
        `set "CLASSPATH=${this.postgresqlJar};%CLASSPATH%"`,
        `echo PostgreSQL JDBC driver added to classpath`,
        `echo Driver: ${this.postgresqlJar}`,
      ].join("\n");
    } else {
      // Unix/Linux/macOS bash/zsh syntax
      return [
        `export GROOVY_CLASSPATH="${this.postgresqlJar}:$GROOVY_CLASSPATH"`,
        `export CLASSPATH="${this.postgresqlJar}:$CLASSPATH"`,
        `echo "🔗 PostgreSQL JDBC driver added to classpath"`,
        `echo "Driver: ${this.postgresqlJar}"`,
      ].join("\n");
    }
  }

  /**
   * Display current classpath status
   */
  displayStatus() {
    console.log("📊 Groovy JDBC Classpath Status");
    console.log("================================");

    if (this.checkJdbcDriver()) {
      console.log(`✅ PostgreSQL JDBC driver found: ${this.postgresqlJar}`);
    } else {
      console.log(`❌ PostgreSQL JDBC driver missing: ${this.postgresqlJar}`);
      console.log("   Run: npm run setup:groovy-jdbc");
      return;
    }

    console.log(
      `🔗 GROOVY_CLASSPATH: ${process.env.GROOVY_CLASSPATH || "(not set)"}`,
    );
    console.log(`🔗 CLASSPATH: ${process.env.CLASSPATH || "(not set)"}`);

    // Check if JDBC driver is in current classpath
    const groovyClasspath = process.env.GROOVY_CLASSPATH || "";
    const classpath = process.env.CLASSPATH || "";

    if (
      groovyClasspath.includes(this.postgresqlJar) ||
      classpath.includes(this.postgresqlJar)
    ) {
      console.log("✅ PostgreSQL JDBC driver is in current classpath");
    } else {
      console.log("⚠️ PostgreSQL JDBC driver is NOT in current classpath");
      console.log("   Run: node scripts/setup-groovy-classpath.js --setup");
    }
  }

  /**
   * Main command line interface
   */
  async run() {
    const args = process.argv.slice(2);
    const command = args[0];

    try {
      switch (command) {
        case "--setup":
        case "setup":
          this.setupCurrentProcessEnv();
          break;

        case "--status":
        case "status":
          this.displayStatus();
          break;

        case "--shell":
        case "shell":
          console.log(this.generateShellExports());
          break;

        case "--path":
        case "path":
          console.log(this.getPostgresqlJarPath());
          break;

        case "--help":
        case "help":
        default:
          console.log("Groovy JDBC Classpath Setup");
          console.log("Usage: node setup-groovy-classpath.js [command]");
          console.log("");
          console.log("Commands:");
          console.log("  setup   Setup classpath in current process");
          console.log("  status  Display current classpath status");
          console.log("  shell   Generate shell export statements");
          console.log("  path    Display PostgreSQL JDBC JAR path");
          console.log("  help    Show this help message");
          console.log("");
          console.log("Examples:");
          console.log("  node setup-groovy-classpath.js setup");
          console.log("  node setup-groovy-classpath.js status");
          console.log(
            "  eval $(node setup-groovy-classpath.js shell)  # Unix/Linux",
          );
          break;
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      process.exit(1);
    }
  }
}

// Command line execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const setup = new GroovyClasspathSetup();
  setup.run();
}

export default GroovyClasspathSetup;
