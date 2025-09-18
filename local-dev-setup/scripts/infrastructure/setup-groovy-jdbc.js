#!/usr/bin/env node

/**
 * Setup script for Groovy JDBC drivers
 * Downloads PostgreSQL JDBC driver for Groovy integration tests
 */

import fs from "fs";
import path from "path";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";

const POSTGRESQL_JDBC_VERSION = "42.7.3";
const POSTGRESQL_JDBC_URL = `https://jdbc.postgresql.org/download/postgresql-${POSTGRESQL_JDBC_VERSION}.jar`;
const JDBC_DIR = path.join(process.cwd(), "jdbc-drivers");
const POSTGRESQL_JAR = path.join(
  JDBC_DIR,
  `postgresql-${POSTGRESQL_JDBC_VERSION}.jar`,
);

async function downloadFile(url, filepath) {
  console.log(`📥 Downloading ${url}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.statusText}`);
  }

  await pipeline(response.body, createWriteStream(filepath));
  console.log(`✅ Downloaded to ${filepath}`);
}

async function setupJdbcDrivers() {
  try {
    console.log("🔧 Setting up JDBC drivers for Groovy integration tests...");

    // Create JDBC directory
    if (!fs.existsSync(JDBC_DIR)) {
      fs.mkdirSync(JDBC_DIR, { recursive: true });
      console.log(`📁 Created directory: ${JDBC_DIR}`);
    }

    // Download PostgreSQL JDBC driver if not exists
    if (!fs.existsSync(POSTGRESQL_JAR)) {
      await downloadFile(POSTGRESQL_JDBC_URL, POSTGRESQL_JAR);
    } else {
      console.log(
        `✅ PostgreSQL JDBC driver already exists: ${POSTGRESQL_JAR}`,
      );
    }

    console.log("");
    console.log("🎉 JDBC setup complete!");
    console.log("");
    console.log("Usage options:");
    console.log(
      "1. Use Node.js wrapper: node scripts/utilities/groovy-with-jdbc.js your-test.groovy",
    );
    console.log(
      "2. Setup classpath: node scripts/utilities/setup-groovy-classpath.js setup",
    );
    console.log(
      '3. Manual: groovy -cp "' + POSTGRESQL_JAR + '" your-test.groovy',
    );
    console.log("");
    console.log("Integration with existing test infrastructure:");
    console.log(
      "- Groovy tests automatically use JDBC classpath via run-groovy-test.js",
    );
    console.log("- No shell scripts required - all Node.js based");
  } catch (error) {
    console.error("❌ JDBC setup failed:", error.message);
    process.exit(1);
  }
}

// Run setup
setupJdbcDrivers();
