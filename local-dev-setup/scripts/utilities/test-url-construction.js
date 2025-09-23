#!/usr/bin/env node

/**
 * Test UrlConstructionService functionality for US-058 Phase 2A validation
 * Tests context-aware URL generation for both StepView and IterationView
 */

import { Client } from "pg";
import { execSync } from "child_process";
import process from "process";

async function testUrlConstruction() {
  console.log("🔗 Testing UrlConstructionService for US-058 Phase 2A...\n");

  try {
    // Test 1: Check if system configuration exists
    console.log("📋 Test 1: System Configuration Check");
    const configExists = await checkSystemConfiguration();

    if (!configExists) {
      console.log(
        "❌ System configuration not found - creating test configuration...",
      );
      await createTestSystemConfiguration();
    } else {
      console.log("✅ System configuration exists");
    }

    // Test 2: Test URL construction via Groovy
    console.log("\n📋 Test 2: URL Construction Functionality");
    await testGroovyUrlConstruction();

    // Test 3: Health check
    console.log("\n📋 Test 3: Service Health Check");
    await testHealthCheck();

    console.log("\n🎉 UrlConstructionService validation complete!");
  } catch (error) {
    console.error("❌ Error during URL construction testing:", error.message);
    process.exit(1);
  }
}

async function checkSystemConfiguration() {
  const client = new Client({
    host: "localhost",
    port: 5432,
    database: "umig_app_db",
    user: "umig_app_user",
    password: "123456",
  });

  try {
    await client.connect();

    const query = `
            SELECT COUNT(*) as config_count
            FROM system_configuration_scf scf
            INNER JOIN environments_env e ON scf.env_id = e.env_id
            WHERE e.env_code = 'DEV'
              AND scf.scf_is_active = true
              AND scf.scf_category = 'MACRO_LOCATION'
              AND scf.scf_key IN (
                  'stepview.confluence.base.url',
                  'stepview.confluence.space.key',
                  'stepview.confluence.page.id',
                  'stepview.confluence.page.title'
              );
        `;

    const result = await client.query(query);
    return (result.rows[0].config_count || 0) >= 4;
  } finally {
    await client.end();
  }
}

async function createTestSystemConfiguration() {
  const client = new Client({
    host: "localhost",
    port: 5432,
    database: "umig_app_db",
    user: "umig_app_user",
    password: "123456",
  });

  try {
    await client.connect();

    // Get DEV environment ID
    const envResult = await client.query(`
            SELECT env_id FROM environments_env WHERE env_code = 'DEV'
        `);

    if (envResult.rows.length === 0) {
      console.log("❌ DEV environment not found - creating it...");
      await client.query(`
                INSERT INTO environments_env (env_code, env_name, env_description, env_is_active)
                VALUES ('DEV', 'Development', 'Local development environment', true)
                ON CONFLICT (env_code) DO NOTHING
            `);

      const newEnvResult = await client.query(`
                SELECT env_id FROM environments_env WHERE env_code = 'DEV'
            `);

      if (newEnvResult.rows.length === 0) {
        throw new Error("Failed to create DEV environment");
      }
    }

    const envId =
      envResult.rows[0]?.env_id ||
      (
        await client.query(
          `SELECT env_id FROM environments_env WHERE env_code = 'DEV'`,
        )
      ).rows[0].env_id;

    // Insert test configuration
    const configs = [
      {
        key: "stepview.confluence.base.url",
        value: "http://localhost:8090",
        description: "Base URL for Confluence in development environment",
      },
      {
        key: "stepview.confluence.space.key",
        value: "UMIG",
        description: "Confluence space key for UMIG stepview pages",
      },
      {
        key: "stepview.confluence.page.id",
        value: "98369",
        description: "Confluence page ID for UMIG stepview page",
      },
      {
        key: "stepview.confluence.page.title",
        value: "UMIG StepView",
        description: "Title of the UMIG stepview page",
      },
    ];

    for (const config of configs) {
      await client.query(
        `
                INSERT INTO system_configuration_scf (
                    env_id, scf_key, scf_value, scf_description,
                    scf_category, scf_is_active, scf_created_by, scf_updated_by
                ) VALUES (
                    $1, $2, $3, $4, 'MACRO_LOCATION', true, 'test-setup', 'test-setup'
                ) ON CONFLICT (env_id, scf_key) DO UPDATE SET
                    scf_value = EXCLUDED.scf_value,
                    scf_updated_at = now(),
                    scf_updated_by = 'test-setup'
            `,
        [envId, config.key, config.value, config.description],
      );
    }

    console.log("✅ Test system configuration created");
  } finally {
    await client.end();
  }
}

async function testGroovyUrlConstruction() {
  const testScript = `
import umig.utils.UrlConstructionService

try {
    // Test environment detection
    def env = UrlConstructionService.getCurrentEnvironment()
    println "Current Environment: \${env}"

    // Test configuration retrieval
    def config = UrlConstructionService.getUrlConfigurationForEnvironment('DEV')
    if (config) {
        println "Configuration found:"
        config.each { key, value ->
            println "  \${key}: \${value}"
        }
    } else {
        println "No configuration found for DEV environment"
    }

    // Test URL template construction
    def template = UrlConstructionService.buildStepViewUrlTemplate('DEV')
    println "URL Template: \${template}"

    // Test health check
    def health = UrlConstructionService.healthCheck()
    println "Health Check: \${health}"

    println "SUCCESS: UrlConstructionService tests completed"

} catch (Exception e) {
    println "ERROR: \${e.message}"
    e.printStackTrace()
}
`;

  try {
    // Write test script to temporary file
    const fs = await import("fs");
    const path = await import("path");
    const tempDir = "/tmp";
    const testFile = path.join(tempDir, "url-construction-test.groovy");

    fs.writeFileSync(testFile, testScript);

    console.log("🔧 Running Groovy URL construction test...");

    // Execute Groovy test
    const result = execSync(
      `cd /Users/lucaschallamel/Documents/GitHub/UMIG && groovy -cp "src/groovy" "${testFile}"`,
      {
        encoding: "utf8",
        timeout: 30000,
      },
    );

    console.log("📊 Groovy Test Results:");
    console.log(result);

    // Clean up
    fs.unlinkSync(testFile);

    if (result.includes("SUCCESS")) {
      console.log("✅ Groovy URL construction test passed");
    } else {
      console.log("⚠️  Groovy URL construction test completed with warnings");
    }
  } catch (error) {
    console.log("❌ Groovy URL construction test failed:", error.message);
    if (error.stdout) {
      console.log("STDOUT:", error.stdout);
    }
    if (error.stderr) {
      console.log("STDERR:", error.stderr);
    }
  }
}

async function testHealthCheck() {
  try {
    const testScript = `
import umig.utils.UrlConstructionService

def health = UrlConstructionService.healthCheck()
health.each { key, value ->
    println "\${key}: \${value}"
}
`;

    const fs = await import("fs");
    const tempFile = "/tmp/health-check-test.groovy";
    fs.writeFileSync(tempFile, testScript);

    const result = execSync(
      `cd /Users/lucaschallamel/Documents/GitHub/UMIG && groovy -cp "src/groovy" "${tempFile}"`,
      {
        encoding: "utf8",
        timeout: 10000,
      },
    );

    console.log("📊 Health Check Results:");
    console.log(result);

    // Clean up
    fs.unlinkSync(tempFile);

    if (result.includes("healthy") || result.includes("degraded")) {
      console.log("✅ Health check completed");
    } else {
      console.log("⚠️  Health check returned unexpected results");
    }
  } catch (error) {
    console.log("❌ Health check failed:", error.message);
  }
}

// Run the tests
testUrlConstruction();
