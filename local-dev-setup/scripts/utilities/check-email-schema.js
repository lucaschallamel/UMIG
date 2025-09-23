#!/usr/bin/env node

/**
 * Check the actual schema of email templates table
 */

import { Client } from "pg";

async function checkEmailSchema() {
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

    console.log("📋 Checking email_templates_emt table schema...\n");

    const schemaQuery = `
            SELECT column_name, data_type, is_nullable, column_default
            FROM information_schema.columns
            WHERE table_name = 'email_templates_emt'
            ORDER BY ordinal_position;
        `;

    const result = await client.query(schemaQuery);

    if (result.rows.length === 0) {
      console.log("❌ Table email_templates_emt not found");
      return;
    }

    console.log("📊 Table schema:");
    result.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.column_name} (${row.data_type})`);
      if (row.column_default) {
        console.log(`      Default: ${row.column_default}`);
      }
    });

    // Check current data
    console.log("\n📋 Current template data:");
    const dataQuery = `SELECT * FROM email_templates_emt LIMIT 5;`;
    const data = await client.query(dataQuery);

    if (data.rows.length === 0) {
      console.log("   ❌ No templates found");
    } else {
      console.log(`   ✅ Found ${data.rows.length} templates:`);
      data.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${JSON.stringify(row, null, 2)}`);
      });
    }
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await client.end();
  }
}

checkEmailSchema();
