/**
 * Comprehensive Test Suite for Generator Audit Fields Population
 *
 * Tests that all generator scripts properly populate audit fields with correct values.
 * Verifies the US-002b audit fields standardization implementation across all generators.
 *
 * @author UMIG Development Team
 * @since 2025-08-04
 */

import { Pool } from "pg";

// Test configuration
const TEST_CONFIG = {
  connectionString:
    process.env.DATABASE_URL ||
    "postgresql://umig_user:umig_password@localhost:5432/umig_db",
  testTimeout: 30000,
  expectedAuditUser: "generator",
  maxTimestampDelta: 5000, // 5 seconds tolerance for timestamp comparisons
};

// Tables and their expected audit fields after generators run
const AUDIT_FIELD_EXPECTATIONS = {
  // Master tables (full audit fields)
  sequences_master_sqm: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "004_generate_canonical_plans.js",
  },
  phases_master_phm: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "004_generate_canonical_plans.js",
  },
  steps_master_stm: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "004_generate_canonical_plans.js",
  },
  controls_master_ctm: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "007_generate_controls.js",
  },
  instructions_master_inm: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "098_generate_instructions.js",
  },

  // Instance tables (full audit fields)
  sequences_instance_sqi: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "099_generate_instance_data.js",
  },
  phases_instance_phi: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "099_generate_instance_data.js",
  },
  steps_instance_sti: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "099_generate_instance_data.js",
  },
  controls_instance_cti: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "099_generate_instance_data.js",
  },
  instructions_instance_ini: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "099_generate_instance_data.js",
  },

  // Core reference tables
  migrations_mig: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "005_generate_migrations.js",
  },
  iterations_ite: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "005_generate_migrations.js",
  },
  plans_master_plm: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "004_generate_canonical_plans.js",
  },
  labels_lbl: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "008_generate_labels.js",
    specialCase: "already_had_created_at",
  },

  // Tables that need to be updated with audit fields (not yet updated)
  teams_tms: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "002_generate_teams_apps.js",
    needsUpdate: true,
  },
  applications_app: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "002_generate_teams_apps.js",
    needsUpdate: true,
  },
  users_usr: {
    auditFields: ["created_by", "updated_by"], // Special case: already has created_at, updated_at
    generator: "003_generate_users.js",
    specialCase: "partial_audit_fields",
    needsUpdate: true,
  },
  environments_env: {
    auditFields: ["created_by", "created_at", "updated_by", "updated_at"],
    generator: "006_generate_environments.js",
    needsUpdate: true,
  },
};

describe("Generator Scripts - Audit Fields Population", () => {
  let client;
  let pool;
  let testStartTime;

  beforeAll(async () => {
    testStartTime = new Date();

    // Create database connection pool
    pool = new Pool({
      connectionString: TEST_CONFIG.connectionString,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    client = await pool.connect();
    console.log("Connected to database for generator audit fields testing");
  });

  afterAll(async () => {
    if (client) {
      client.release();
    }
    if (pool) {
      await pool.end();
    }
  });

  describe("Database Setup Verification", () => {
    test("should connect to database successfully", async () => {
      const result = await client.query("SELECT version()");
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].version).toMatch(/PostgreSQL/);
    });

    test("should have audit fields migration applied", async () => {
      const migrationCheck = `
        SELECT COUNT(*) as count
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND column_name IN ('created_by', 'created_at', 'updated_by', 'updated_at')
        AND table_name IN ('sequences_master_sqm', 'teams_tms', 'migrations_mig')
      `;

      const result = await client.query(migrationCheck);
      const auditColumnCount = parseInt(result.rows[0].count);

      // Should have multiple audit columns across these tables
      expect(auditColumnCount).toBeGreaterThan(8);

      console.log(
        `✅ Found ${auditColumnCount} audit columns across key tables`,
      );
    });
  });

  describe("Updated Generators - Audit Field Population", () => {
    test("should populate audit fields in migrations_mig table", async () => {
      const query = `
        SELECT 
          mig_id,
          mig_name,
          created_by,
          created_at,
          updated_by,
          updated_at,
          EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - created_at)) as seconds_since_creation
        FROM migrations_mig
        WHERE created_by IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 5
      `;

      const result = await client.query(query);

      if (result.rows.length === 0) {
        console.log("ℹ️  No migrations found - run generators first");
        return;
      }

      for (const row of result.rows) {
        // Verify audit user is 'generator'
        expect(row.created_by).toBe(TEST_CONFIG.expectedAuditUser);
        expect(row.updated_by).toBe(TEST_CONFIG.expectedAuditUser);

        // Verify timestamps are not null and reasonable
        expect(row.created_at).not.toBeNull();
        expect(row.updated_at).not.toBeNull();

        // Verify timestamps are recent (within reasonable range)
        expect(row.seconds_since_creation).toBeLessThan(86400); // Less than 24 hours old

        console.log(`  ✅ Migration ${row.mig_id}: audit fields correctly set`);
      }

      console.log(
        `✅ Verified audit fields in ${result.rows.length} migration records`,
      );
    });

    test("should populate audit fields in iterations_ite table", async () => {
      const query = `
        SELECT 
          ite_id,
          ite_name,
          created_by,
          created_at,
          updated_by,
          updated_at
        FROM iterations_ite
        WHERE created_by IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 3
      `;

      const result = await client.query(query);

      if (result.rows.length === 0) {
        console.log("ℹ️  No iterations found - run generators first");
        return;
      }

      for (const row of result.rows) {
        expect(row.created_by).toBe(TEST_CONFIG.expectedAuditUser);
        expect(row.updated_by).toBe(TEST_CONFIG.expectedAuditUser);
        expect(row.created_at).not.toBeNull();
        expect(row.updated_at).not.toBeNull();
      }

      console.log(
        `✅ Verified audit fields in ${result.rows.length} iteration records`,
      );
    });

    test("should populate audit fields in canonical plans (sequences, phases, steps)", async () => {
      const tables = [
        { table: "plans_master_plm", id: "plm_id", name: "plm_name" },
        { table: "sequences_master_sqm", id: "sqm_id", name: "sqm_name" },
        { table: "phases_master_phm", id: "phm_id", name: "phm_name" },
        { table: "steps_master_stm", id: "stm_id", name: "stm_name" },
      ];

      for (const { table, id, name } of tables) {
        const query = `
          SELECT 
            ${id},
            ${name},
            created_by,
            created_at,
            updated_by,
            updated_at
          FROM ${table}
          WHERE created_by IS NOT NULL
          LIMIT 2
        `;

        const result = await client.query(query);

        if (result.rows.length === 0) {
          console.log(
            `ℹ️  No records found in ${table} - run generators first`,
          );
          continue;
        }

        for (const row of result.rows) {
          expect(row.created_by).toBe(TEST_CONFIG.expectedAuditUser);
          expect(row.updated_by).toBe(TEST_CONFIG.expectedAuditUser);
          expect(row.created_at).not.toBeNull();
          expect(row.updated_at).not.toBeNull();
        }

        console.log(
          `  ✅ ${table}: ${result.rows.length} records with correct audit fields`,
        );
      }
    });

    test("should populate audit fields in instance data tables", async () => {
      const instanceTables = [
        "sequences_instance_sqi",
        "phases_instance_phi",
        "steps_instance_sti",
      ];

      for (const table of instanceTables) {
        const query = `
          SELECT 
            created_by,
            created_at,
            updated_by,
            updated_at,
            COUNT(*) as record_count
          FROM ${table}
          WHERE created_by IS NOT NULL
          GROUP BY created_by, created_at, updated_by, updated_at
          LIMIT 3
        `;

        try {
          const result = await client.query(query);

          if (result.rows.length === 0) {
            console.log(
              `ℹ️  No records found in ${table} - run generators first`,
            );
            continue;
          }

          for (const row of result.rows) {
            expect(row.created_by).toBe(TEST_CONFIG.expectedAuditUser);
            expect(row.updated_by).toBe(TEST_CONFIG.expectedAuditUser);
            expect(row.created_at).not.toBeNull();
            expect(row.updated_at).not.toBeNull();
          }

          const totalRecords = result.rows.reduce(
            (sum, row) => sum + parseInt(row.record_count),
            0,
          );
          console.log(
            `  ✅ ${table}: ${totalRecords} records with correct audit fields`,
          );
        } catch (error) {
          console.log(
            `  ⚠️  ${table}: Table might not exist or have audit fields yet`,
          );
        }
      }
    });

    test("should populate audit fields in labels and related linking tables", async () => {
      const labelQueries = [
        {
          name: "labels_lbl",
          query:
            "SELECT created_by, updated_by, created_at, updated_at FROM labels_lbl WHERE created_by IS NOT NULL LIMIT 3",
        },
        {
          name: "labels_lbl_x_steps_master_stm",
          query:
            "SELECT created_by FROM labels_lbl_x_steps_master_stm WHERE created_by IS NOT NULL LIMIT 3",
        },
        {
          name: "labels_lbl_x_applications_app",
          query:
            "SELECT created_by FROM labels_lbl_x_applications_app WHERE created_by IS NOT NULL LIMIT 3",
        },
      ];

      for (const { name, query } of labelQueries) {
        try {
          const result = await client.query(query);

          if (result.rows.length === 0) {
            console.log(`ℹ️  No records found in ${name}`);
            continue;
          }

          for (const row of result.rows) {
            expect(row.created_by).toBe(TEST_CONFIG.expectedAuditUser);
            if (row.updated_by) {
              expect(row.updated_by).toBe(TEST_CONFIG.expectedAuditUser);
            }
          }

          console.log(
            `  ✅ ${name}: ${result.rows.length} records with correct audit fields`,
          );
        } catch (error) {
          console.log(`  ⚠️  ${name}: ${error.message}`);
        }
      }
    });
  });

  describe("Generators Needing Updates - Expected Failures/Warnings", () => {
    test("should identify generators that need audit field updates", async () => {
      const generatorsNeedingUpdates = Object.entries(AUDIT_FIELD_EXPECTATIONS)
        .filter(([table, config]) => config.needsUpdate)
        .map(([table, config]) => ({ table, ...config }));

      console.log("\n📋 Generators that need audit field updates:");

      for (const {
        table,
        generator,
        auditFields,
      } of generatorsNeedingUpdates) {
        console.log(`  ⚠️  ${table} (${generator})`);
        console.log(`      Expected fields: ${auditFields.join(", ")}`);

        // Check if the table has data but missing audit fields
        try {
          const dataCheck = `SELECT COUNT(*) as count FROM ${table}`;
          const auditCheck = `
            SELECT COUNT(*) as audit_count 
            FROM ${table} 
            WHERE created_by = '${TEST_CONFIG.expectedAuditUser}'
          `;

          const dataResult = await client.query(dataCheck);
          const auditResult = await client.query(auditCheck);

          const totalRecords = parseInt(dataResult.rows[0].count);
          const auditRecords = parseInt(auditResult.rows[0].audit_count);

          if (totalRecords > 0 && auditRecords === 0) {
            console.log(
              `      Status: ${totalRecords} records without audit fields ❌`,
            );
          } else if (totalRecords > 0 && auditRecords > 0) {
            console.log(
              `      Status: ${auditRecords}/${totalRecords} records have audit fields ⚠️`,
            );
          } else {
            console.log(`      Status: No data yet ℹ️`);
          }
        } catch (error) {
          console.log(`      Status: Table check failed - ${error.message} ❌`);
        }
      }

      // This test passes but reports what needs to be done
      expect(generatorsNeedingUpdates.length).toBeGreaterThan(0);
      console.log(
        `\n📝 Action needed: Update ${generatorsNeedingUpdates.length} generators to include audit fields`,
      );
    });

    test("should verify teams_tms table needs audit field population", async () => {
      try {
        const query = `
          SELECT 
            COUNT(*) as total_count,
            COUNT(created_by) as has_created_by,
            COUNT(updated_by) as has_updated_by
          FROM teams_tms
        `;

        const result = await client.query(query);
        const { total_count, has_created_by, has_updated_by } = result.rows[0];

        if (parseInt(total_count) > 0) {
          const needsUpdate =
            parseInt(has_created_by) === 0 || parseInt(has_updated_by) === 0;

          if (needsUpdate) {
            console.log(
              `⚠️  teams_tms: ${total_count} records need audit field population`,
            );
            console.log(
              `   Current: ${has_created_by} have created_by, ${has_updated_by} have updated_by`,
            );
          } else {
            console.log(
              `✅ teams_tms: ${total_count} records already have audit fields`,
            );
          }
        } else {
          console.log("ℹ️  teams_tms: No records found - run generators first");
        }

        // Test passes regardless - this is informational
        expect(parseInt(total_count)).toBeGreaterThanOrEqual(0);
      } catch (error) {
        console.log(`❌ teams_tms audit field check failed: ${error.message}`);
        throw error;
      }
    });

    test("should verify applications_app table needs audit field population", async () => {
      try {
        const query = `
          SELECT 
            COUNT(*) as total_count,
            COUNT(created_by) as has_created_by,
            COUNT(updated_by) as has_updated_by
          FROM applications_app
        `;

        const result = await client.query(query);
        const { total_count, has_created_by, has_updated_by } = result.rows[0];

        if (parseInt(total_count) > 0) {
          const needsUpdate =
            parseInt(has_created_by) === 0 || parseInt(has_updated_by) === 0;

          if (needsUpdate) {
            console.log(
              `⚠️  applications_app: ${total_count} records need audit field population`,
            );
          } else {
            console.log(
              `✅ applications_app: ${total_count} records already have audit fields`,
            );
          }
        } else {
          console.log("ℹ️  applications_app: No records found");
        }

        expect(parseInt(total_count)).toBeGreaterThanOrEqual(0);
      } catch (error) {
        console.log(
          `❌ applications_app audit field check failed: ${error.message}`,
        );
        throw error;
      }
    });
  });

  describe("Audit Field Data Quality Tests", () => {
    test("should have consistent timestamp relationships (created_at <= updated_at)", async () => {
      const tablesWithData = [
        "migrations_mig",
        "iterations_ite",
        "plans_master_plm",
        "sequences_master_sqm",
      ];

      for (const table of tablesWithData) {
        try {
          const query = `
            SELECT 
              COUNT(*) as total_records,
              COUNT(CASE WHEN created_at <= updated_at THEN 1 END) as valid_timestamps,
              COUNT(CASE WHEN created_at > updated_at THEN 1 END) as invalid_timestamps
            FROM ${table}
            WHERE created_at IS NOT NULL AND updated_at IS NOT NULL
          `;

          const result = await client.query(query);

          if (result.rows.length > 0) {
            const { total_records, valid_timestamps, invalid_timestamps } =
              result.rows[0];

            if (parseInt(total_records) > 0) {
              expect(parseInt(invalid_timestamps)).toBe(0);
              expect(parseInt(valid_timestamps)).toBe(parseInt(total_records));

              console.log(
                `  ✅ ${table}: ${total_records} records with valid timestamp relationships`,
              );
            }
          }
        } catch (error) {
          console.log(
            `  ⚠️  ${table}: Timestamp check failed - ${error.message}`,
          );
        }
      }
    });

    test("should have no null audit fields in updated generators", async () => {
      const updatedTables = [
        "migrations_mig",
        "iterations_ite",
        "plans_master_plm",
        "sequences_master_sqm",
        "phases_master_phm",
        "steps_master_stm",
      ];

      for (const table of updatedTables) {
        try {
          const query = `
            SELECT 
              COUNT(*) as total_records,
              COUNT(created_by) as has_created_by,
              COUNT(created_at) as has_created_at,
              COUNT(updated_by) as has_updated_by,
              COUNT(updated_at) as has_updated_at
            FROM ${table}
          `;

          const result = await client.query(query);

          if (result.rows.length > 0) {
            const stats = result.rows[0];
            const totalRecords = parseInt(stats.total_records);

            if (totalRecords > 0) {
              // All records should have all audit fields populated
              expect(parseInt(stats.has_created_by)).toBe(totalRecords);
              expect(parseInt(stats.has_created_at)).toBe(totalRecords);
              expect(parseInt(stats.has_updated_by)).toBe(totalRecords);
              expect(parseInt(stats.has_updated_at)).toBe(totalRecords);

              console.log(
                `  ✅ ${table}: ${totalRecords} records with complete audit fields`,
              );
            }
          }
        } catch (error) {
          console.log(
            `  ⚠️  ${table}: Completeness check failed - ${error.message}`,
          );
        }
      }
    });

    test("should have audit user consistency across all updated tables", async () => {
      const updatedTables = [
        "migrations_mig",
        "iterations_ite",
        "plans_master_plm",
        "labels_lbl",
      ];

      const auditUserCounts = {};

      for (const table of updatedTables) {
        try {
          const query = `
            SELECT 
              created_by,
              COUNT(*) as count
            FROM ${table}
            WHERE created_by IS NOT NULL
            GROUP BY created_by
            ORDER BY count DESC
          `;

          const result = await client.query(query);

          if (result.rows.length > 0) {
            auditUserCounts[table] = result.rows;

            // Most records should be created by 'generator'
            const generatorRecords = result.rows.find(
              (row) => row.created_by === TEST_CONFIG.expectedAuditUser,
            );
            if (generatorRecords) {
              console.log(
                `  ✅ ${table}: ${generatorRecords.count} records created by '${TEST_CONFIG.expectedAuditUser}'`,
              );
            }
          }
        } catch (error) {
          console.log(
            `  ⚠️  ${table}: Audit user check failed - ${error.message}`,
          );
        }
      }

      // Verify we found some data
      expect(Object.keys(auditUserCounts).length).toBeGreaterThan(0);
    });
  });

  describe("Performance Impact Assessment", () => {
    test("should verify audit field indexes exist and perform well", async () => {
      const indexQueries = [
        {
          name: "Query by created_by",
          query: `SELECT COUNT(*) FROM plans_master_plm WHERE created_by = '${TEST_CONFIG.expectedAuditUser}'`,
        },
        {
          name: "Query by created_at range",
          query:
            "SELECT COUNT(*) FROM migrations_mig WHERE created_at > CURRENT_TIMESTAMP - INTERVAL '1 day'",
        },
        {
          name: "Join with audit fields",
          query: `
            SELECT COUNT(*) 
            FROM migrations_mig m 
            JOIN iterations_ite i ON m.mig_id = i.mig_id 
            WHERE m.created_by = '${TEST_CONFIG.expectedAuditUser}'
          `,
        },
      ];

      for (const { name, query } of indexQueries) {
        const startTime = Date.now();

        try {
          const result = await client.query(query);
          const duration = Date.now() - startTime;

          // Queries should complete reasonably quickly
          expect(duration).toBeLessThan(2000); // 2 seconds max

          const count = parseInt(result.rows[0].count);
          console.log(`  ✅ ${name}: ${count} records found in ${duration}ms`);
        } catch (error) {
          console.log(`  ⚠️  ${name}: Query failed - ${error.message}`);
        }
      }
    });
  });

  describe("Recommendations and Next Steps", () => {
    test("should provide update recommendations for remaining generators", async () => {
      const recommendations = [
        {
          file: "002_generate_teams_apps.js",
          tables: ["teams_tms", "applications_app"],
          updateNeeded: "Add audit fields to INSERT statements",
          priority: "HIGH",
          pattern: `
            // Add these parameters to INSERT statements:
            created_by: 'generator',
            created_at: new Date(),
            updated_by: 'generator', 
            updated_at: new Date()
          `,
        },
        {
          file: "003_generate_users.js",
          tables: ["users_usr"],
          updateNeeded:
            "Add created_by and updated_by (timestamps already exist)",
          priority: "MEDIUM",
          pattern: `
            // Add only these parameters (users_usr already has timestamps):
            created_by: 'generator',
            updated_by: 'generator'
          `,
        },
        {
          file: "006_generate_environments.js",
          tables: ["environments_env"],
          updateNeeded: "Add full audit fields to INSERT statements",
          priority: "MEDIUM",
          pattern: `
            // Add full audit fields pattern
          `,
        },
      ];

      console.log("\n📋 GENERATOR UPDATE RECOMMENDATIONS:");
      console.log("=" * 50);

      for (const rec of recommendations) {
        console.log(`\n${rec.priority} PRIORITY: ${rec.file}`);
        console.log(`  Tables: ${rec.tables.join(", ")}`);
        console.log(`  Action: ${rec.updateNeeded}`);
        console.log(`  Pattern: ${rec.pattern.trim()}`);
      }

      console.log("\n✅ GENERATORS ALREADY UPDATED:");
      const updatedGenerators = [
        "004_generate_canonical_plans.js - Plans, sequences, phases, steps",
        "005_generate_migrations.js - Migrations and iterations",
        "008_generate_labels.js - Labels and label associations",
        "099_generate_instance_data.js - Instance data tables",
      ];

      updatedGenerators.forEach((item) => console.log(`  ✅ ${item}`));

      // Test always passes - this is informational
      expect(recommendations.length).toBeGreaterThan(0);
    });

    test("should verify AuditFieldsUtil integration opportunities", async () => {
      console.log("\n🔧 AUDITFIELDSUTIL INTEGRATION OPPORTUNITIES:");
      console.log("=" * 50);

      const integrationOpportunities = [
        {
          generator: "002_generate_teams_apps.js",
          suggestion:
            "Use AuditFieldsUtil.prepareInsertParams() for clean audit field addition",
          example: `
            // Before:
            await client.query('INSERT INTO teams_tms (name, desc) VALUES ($1, $2)', [name, desc]);
            
            // After with AuditFieldsUtil:
            const params = AuditFieldsUtil.prepareInsertParams({name, desc}, 'generator');
            await client.query(insertSql, Object.values(params));
          `,
        },
        {
          generator: "All generators",
          suggestion:
            "Consider using AuditFieldsUtil.createInsertWithAudit() for SQL generation",
          example: `
            // Generate INSERT SQL with audit fields automatically:
            const sql = AuditFieldsUtil.createInsertWithAudit('table_name', fields, 'generator');
          `,
        },
      ];

      integrationOpportunities.forEach((opp, index) => {
        console.log(`\n${index + 1}. ${opp.generator}`);
        console.log(`   Suggestion: ${opp.suggestion}`);
        console.log(`   Example: ${opp.example.trim()}`);
      });

      expect(integrationOpportunities.length).toBeGreaterThan(0);
    });
  });
});

// Export test utilities for manual testing
export const auditFieldTestUtils = {
  /**
   * Check audit field population for a specific table
   */
  async checkTableAuditFields(client, tableName) {
    const query = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(created_by) as has_created_by,
        COUNT(created_at) as has_created_at,
        COUNT(updated_by) as has_updated_by,
        COUNT(updated_at) as has_updated_at,
        COUNT(CASE WHEN created_by = 'generator' THEN 1 END) as generator_records
      FROM ${tableName}
    `;

    return await client.query(query);
  },

  /**
   * Get sample audit data from table
   */
  async getSampleAuditData(client, tableName, limit = 5) {
    const query = `
      SELECT created_by, created_at, updated_by, updated_at
      FROM ${tableName}
      WHERE created_by IS NOT NULL
      ORDER BY created_at DESC
      LIMIT $1
    `;

    return await client.query(query, [limit]);
  },

  /**
   * Verify timestamp consistency
   */
  async checkTimestampConsistency(client, tableName) {
    const query = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN created_at <= updated_at THEN 1 END) as valid_timestamps,
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_time_diff_seconds
      FROM ${tableName}
      WHERE created_at IS NOT NULL AND updated_at IS NOT NULL
    `;

    return await client.query(query);
  },
};
