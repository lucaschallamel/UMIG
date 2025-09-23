#!/usr/bin/env node

/**
 * Check what email infrastructure exists in the database
 */

import { Client } from "pg";
import process from "process";

async function checkEmailInfrastructure() {
  const client = new Client({
    host: "localhost",
    port: 5432,
    database: "umig_app_db",
    user: "umig_app_user",
    password: "123456",
  });

  try {
    console.log("🔍 Connecting to database...");
    await client.connect();

    console.log("📋 Checking email infrastructure...\n");

    // Check for email-related tables
    const tableQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name LIKE '%email%'
            ORDER BY table_name;
        `;

    const tables = await client.query(tableQuery);

    console.log(`📊 Email-related tables (${tables.rows.length}):`);
    if (tables.rows.length === 0) {
      console.log("   ❌ No email-related tables found");
    } else {
      tables.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ✅ ${row.table_name}`);
      });
    }

    // Check for any configuration or template storage
    console.log("\n🔧 Checking for other template/config storage...");

    const configQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND (table_name LIKE '%template%' OR table_name LIKE '%config%')
            ORDER BY table_name;
        `;

    const configTables = await client.query(configQuery);

    if (configTables.rows.length === 0) {
      console.log("   ❌ No template/config tables found");
    } else {
      configTables.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ✅ ${row.table_name}`);
      });
    }

    // List all tables to understand the schema
    console.log("\n📋 All available tables:");
    const allTablesQuery = `
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name;
        `;

    const allTables = await client.query(allTablesQuery);
    allTables.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.table_name}`);
    });

    console.log("\n===============================================");
    console.log("🎯 US-058 Phase 2A Analysis:");

    if (tables.rows.length === 0) {
      console.log("❌ Email template infrastructure not found!");
      console.log(
        "💡 This suggests US-058 Phase 2A may need database migration scripts.",
      );
      console.log(
        "💡 Email templates might be stored as static files or need to be created.",
      );
    } else {
      console.log("✅ Email infrastructure exists");
    }
  } catch (error) {
    console.error("❌ Error checking email infrastructure:", error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Run the check
checkEmailInfrastructure().catch((error) => {
  console.error("💥 Unexpected error:", error);
  process.exit(1);
});
