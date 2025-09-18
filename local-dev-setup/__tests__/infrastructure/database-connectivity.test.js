/**
 * Database Connectivity Infrastructure Test
 *
 * Jest-based database connectivity validation for UMIG infrastructure.
 * Tests email system database tables and validates schema integrity.
 *
 * Converted from: local-dev-setup/quick-db-check.js
 * Run with: npm run test:js:infrastructure -- --testPathPattern='database-connectivity'
 */

import pg from "pg";

const { Client } = pg;

describe("Database Connectivity Infrastructure Test", () => {
  let client;

  beforeAll(async () => {
    client = new Client({
      user: "umig_app_user",
      host: "localhost",
      database: "umig",
      password: "app_password",
      port: 5432,
    });
  });

  afterAll(async () => {
    if (client) {
      await client.end();
    }
  });

  describe("Database Connection", () => {
    test("should establish connection to UMIG database", async () => {
      await expect(client.connect()).resolves.not.toThrow();
    });
  });

  describe("Email System Tables", () => {
    test("should verify email tables exist with correct schema", async () => {
      const tableCheck = await client.query(`
        SELECT table_name, column_name, data_type
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name IN ('email_templates_emt', 'notification_log_nol')
        ORDER BY table_name, ordinal_position;
      `);

      expect(tableCheck.rows.length).toBeGreaterThan(0);

      // Verify required tables exist
      const tableNames = [
        ...new Set(tableCheck.rows.map((row) => row.table_name)),
      ];
      expect(tableNames).toContain("email_templates_emt");
      expect(tableNames).toContain("notification_log_nol");

      // Log table structure for validation
      const tablesByName = {};
      tableCheck.rows.forEach((row) => {
        if (!tablesByName[row.table_name]) {
          tablesByName[row.table_name] = [];
        }
        tablesByName[row.table_name].push(
          `${row.column_name} (${row.data_type})`,
        );
      });

      console.log("📋 Email system tables found:");
      Object.keys(tablesByName).forEach((tableName) => {
        console.log(`  • ${tableName}:`);
        tablesByName[tableName].forEach((col) => {
          console.log(`    - ${col}`);
        });
      });
    });

    test("should validate email_templates_emt table accessibility", async () => {
      const templateCount = await client.query(
        "SELECT COUNT(*) FROM email_templates_emt;",
      );

      expect(templateCount.rows).toHaveLength(1);
      expect(templateCount.rows[0].count).toBeDefined();

      console.log(`📊 Email templates count: ${templateCount.rows[0].count}`);

      // If templates exist, validate structure
      if (parseInt(templateCount.rows[0].count) > 0) {
        const templates = await client.query(`
          SELECT emt_template_name, emt_subject_line, emt_created_date
          FROM email_templates_emt
          ORDER BY emt_created_date DESC LIMIT 5;
        `);

        expect(templates.rows.length).toBeGreaterThan(0);

        // Validate required columns exist
        templates.rows.forEach((template) => {
          expect(template).toHaveProperty("emt_template_name");
          expect(template).toHaveProperty("emt_subject_line");
          expect(template).toHaveProperty("emt_created_date");
        });

        console.log("📝 Recent email templates validated:");
        templates.rows.forEach((t) => {
          console.log(`  • ${t.emt_template_name}: ${t.emt_subject_line}`);
        });
      }
    });

    test("should validate notification_log_nol table accessibility", async () => {
      // Basic table access test
      const logCheck = await client.query(
        "SELECT COUNT(*) FROM notification_log_nol;",
      );

      expect(logCheck.rows).toHaveLength(1);
      expect(logCheck.rows[0].count).toBeDefined();

      console.log(`📊 Notification log entries: ${logCheck.rows[0].count}`);
    });
  });

  describe("Database Infrastructure Health", () => {
    test("should validate database version and basic health", async () => {
      const versionQuery = await client.query("SELECT version();");

      expect(versionQuery.rows).toHaveLength(1);
      expect(versionQuery.rows[0].version).toContain("PostgreSQL");

      console.log(
        `🗄️ Database version: ${versionQuery.rows[0].version.split(",")[0]}`,
      );
    });

    test("should verify connection pool limits", async () => {
      const connectionQuery = await client.query(`
        SELECT setting FROM pg_settings WHERE name = 'max_connections';
      `);

      expect(connectionQuery.rows).toHaveLength(1);
      expect(parseInt(connectionQuery.rows[0].setting)).toBeGreaterThan(0);

      console.log(`🔗 Max connections: ${connectionQuery.rows[0].setting}`);
    });

    test("should validate database encoding and locale", async () => {
      const encodingQuery = await client.query(`
        SELECT pg_encoding_to_char(encoding) as encoding,
               datcollate, datctype
        FROM pg_database
        WHERE datname = current_database();
      `);

      expect(encodingQuery.rows).toHaveLength(1);
      expect(encodingQuery.rows[0].encoding).toBeDefined();

      console.log(`🌐 Database encoding: ${encodingQuery.rows[0].encoding}`);
      console.log(`🌐 Collation: ${encodingQuery.rows[0].datcollate}`);
    });
  });
});

// Export for CI/CD integration
module.exports = {
  /**
   * Standalone connectivity test for CI/CD pipelines
   */
  runConnectivityTest: async () => {
    const testClient = new Client({
      user: "umig_app_user",
      host: "localhost",
      database: "umig",
      password: "app_password",
      port: 5432,
    });

    try {
      await testClient.connect();

      const emailTablesCheck = await testClient.query(`
        SELECT COUNT(*) as table_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name IN ('email_templates_emt', 'notification_log_nol');
      `);

      return {
        success: emailTablesCheck.rows[0].table_count === "2",
        timestamp: new Date().toISOString(),
        tables_found: emailTablesCheck.rows[0].table_count,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    } finally {
      await testClient.end();
    }
  },
};
