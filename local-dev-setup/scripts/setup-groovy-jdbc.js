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

    // Create Groovy classpath script
    const groovyClasspathScript = `#!/bin/bash
# Groovy Integration Test JDBC Classpath Setup
# Usage: source this script before running Groovy integration tests

export GROOVY_CLASSPATH="${POSTGRESQL_JAR}:\$GROOVY_CLASSPATH"
export CLASSPATH="${POSTGRESQL_JAR}:\$CLASSPATH"

echo "🔗 PostgreSQL JDBC driver added to classpath"
echo "Driver: ${POSTGRESQL_JAR}"
`;

    const classpathScriptPath = path.join(JDBC_DIR, "setup-classpath.sh");
    fs.writeFileSync(classpathScriptPath, groovyClasspathScript);
    fs.chmodSync(classpathScriptPath, "755");
    console.log(`📝 Created classpath setup script: ${classpathScriptPath}`);

    // Create wrapper script for running Groovy with JDBC
    const groovyWrapperScript = `#!/bin/bash
# Groovy Integration Test Wrapper
# Automatically includes PostgreSQL JDBC driver in classpath

SCRIPT_DIR="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
POSTGRESQL_JAR="\$SCRIPT_DIR/postgresql-${POSTGRESQL_JDBC_VERSION}.jar"

if [ ! -f "\$POSTGRESQL_JAR" ]; then
    echo "❌ PostgreSQL JDBC driver not found: \$POSTGRESQL_JAR"
    echo "Run: npm run setup:groovy-jdbc"
    exit 1
fi

# Add PostgreSQL JDBC to classpath and run Groovy
groovy -cp "\$POSTGRESQL_JAR" "\$@"
`;

    const wrapperScriptPath = path.join(JDBC_DIR, "groovy-with-jdbc");
    fs.writeFileSync(wrapperScriptPath, groovyWrapperScript);
    fs.chmodSync(wrapperScriptPath, "755");
    console.log(`🚀 Created Groovy wrapper script: ${wrapperScriptPath}`);

    console.log("");
    console.log("🎉 JDBC setup complete!");
    console.log("");
    console.log("Usage options:");
    console.log(`1. Source classpath: source ${classpathScriptPath}`);
    console.log(`2. Use wrapper: ${wrapperScriptPath} your-test.groovy`);
    console.log(
      '3. Manual: groovy -cp "' + POSTGRESQL_JAR + '" your-test.groovy',
    );
  } catch (error) {
    console.error("❌ JDBC setup failed:", error.message);
    process.exit(1);
  }
}

// Run setup
setupJdbcDrivers();
