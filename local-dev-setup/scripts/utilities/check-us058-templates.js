#!/usr/bin/env node

/**
 * Quick validation script for US-058 Phase 2A email templates
 * Checks if BULK_STEP_STATUS_CHANGED and ITERATION_EVENT templates exist
 */

import { Client } from "pg";
import process from "process";

async function checkEmailTemplates() {
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

    console.log("📋 Checking US-058 Phase 2A email templates...");

    const query = `
            SELECT
                emt_type as template_type,
                emt_name as template_name,
                emt_is_active as is_active,
                created_at as created_date,
                LENGTH(emt_body_html) as content_length
            FROM email_templates_emt
            WHERE emt_type IN ('BULK_STEP_STATUS_CHANGED', 'ITERATION_EVENT')
            ORDER BY emt_type;
        `;

    const result = await client.query(query);

    console.log(`\n📊 Found ${result.rows.length} US-058 templates:\n`);

    if (result.rows.length === 0) {
      console.log("❌ No US-058 templates found!");
      console.log(
        "💡 These templates should have been created during Phase 2A implementation.",
      );
      return false;
    }

    let allActive = true;

    result.rows.forEach((row, index) => {
      const status = row.is_active ? "✅" : "❌";
      const activeText = row.is_active ? "ACTIVE" : "INACTIVE";

      console.log(`${index + 1}. ${status} ${row.template_type}`);
      console.log(`   Name: ${row.template_name}`);
      console.log(`   Status: ${activeText}`);
      console.log(`   Content Length: ${row.content_length} characters`);
      console.log(`   Created: ${row.created_date}`);
      console.log("");

      if (!row.is_active) {
        allActive = false;
      }
    });

    // Check for expected templates
    const expectedTemplates = ["BULK_STEP_STATUS_CHANGED", "ITERATION_EVENT"];
    const foundTemplates = result.rows.map((row) => row.template_type);
    const missingTemplates = expectedTemplates.filter(
      (t) => !foundTemplates.includes(t),
    );

    if (missingTemplates.length > 0) {
      console.log("⚠️  Missing templates:");
      missingTemplates.forEach((template) => {
        console.log(`   - ${template}`);
      });
      allActive = false;
    }

    console.log("===============================================");
    if (allActive && missingTemplates.length === 0) {
      console.log(
        "🎉 US-058 Phase 2A email templates are properly configured!",
      );
      return true;
    } else {
      console.log(
        "❌ US-058 Phase 2A email template configuration incomplete.",
      );
      return false;
    }
  } catch (error) {
    console.error("❌ Error checking email templates:", error.message);
    return false;
  } finally {
    await client.end();
  }
}

// Run the check
checkEmailTemplates()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("💥 Unexpected error:", error);
    process.exit(1);
  });
