#!/usr/bin/env node

import pg from "pg";
import chalk from "chalk";

const { Client } = pg;

async function checkEmailTables() {
  console.log(chalk.blue("🔍 Checking Email Tables Status..."));

  const client = new Client({
    user: "umig_app_user",
    host: "localhost",
    database: "umig",
    password: "app_password",
    port: 5432,
  });

  try {
    await client.connect();
    console.log(chalk.green("✅ Database connection established"));

    // Check if email tables exist
    const tableCheck = await client.query(`
            SELECT table_name, column_name, data_type 
            FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name IN ('email_templates_emt', 'notification_log_nol')
            ORDER BY table_name, ordinal_position;
        `);

    if (tableCheck.rows.length === 0) {
      console.log(chalk.red("❌ Email tables NOT found"));
      return false;
    }

    console.log(chalk.green("✅ Email tables found:"));
    const tablesByName = {};
    tableCheck.rows.forEach((row) => {
      if (!tablesByName[row.table_name]) {
        tablesByName[row.table_name] = [];
      }
      tablesByName[row.table_name].push(
        `${row.column_name} (${row.data_type})`,
      );
    });

    Object.keys(tablesByName).forEach((tableName) => {
      console.log(chalk.cyan(`  📋 ${tableName}:`));
      tablesByName[tableName].forEach((col) => {
        console.log(chalk.gray(`    • ${col}`));
      });
    });

    // Check if we have template data
    const templateCount = await client.query(
      "SELECT COUNT(*) FROM email_templates_emt;",
    );
    console.log(
      chalk.yellow(`📊 Email templates count: ${templateCount.rows[0].count}`),
    );

    if (templateCount.rows[0].count > 0) {
      const templates = await client.query(`
                SELECT emt_template_name, emt_subject_line, emt_created_date 
                FROM email_templates_emt 
                ORDER BY emt_created_date DESC LIMIT 5;
            `);
      console.log(chalk.cyan("📝 Recent templates:"));
      templates.rows.forEach((t) => {
        console.log(
          chalk.gray(`  • ${t.emt_template_name}: ${t.emt_subject_line}`),
        );
      });
    }

    console.log(chalk.green("🎉 Email system database validation PASSED"));
    return true;
  } catch (error) {
    console.log(chalk.red("❌ Database check failed:"), error.message);
    return false;
  } finally {
    await client.end();
  }
}

checkEmailTables().then((success) => {
  process.exit(success ? 0 : 1);
});
